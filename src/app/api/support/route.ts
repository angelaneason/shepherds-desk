import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendSupportTicketEmail } from '@/lib/email'

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const FALLBACK_PREFIX = '[SUPPORT_TICKET] '

async function verifyAdmin(request?: Request) {
  const adminEmails = ['angelaneason@gmail.com', 'tinyneason@gmail.com']

  if (request) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      const serviceClient = getServiceClient()
      const { data: { user }, error } = await serviceClient.auth.getUser(token)
      if (!error && user) {
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single() as any
        const userEmail = (user.email || '').toLowerCase()
        if (profile?.role === 'admin' || adminEmails.includes(userEmail)) {
          return { user, profile }
        }
      }
    }
  }

  try {
    const supabaseServer = await createClient()
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser()
    if (!userError && user) {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as any
      const userEmail = (user.email || '').toLowerCase()
      if (profile?.role === 'admin' || adminEmails.includes(userEmail)) {
        return { user, profile }
      }
    }
  } catch {}

  return null
}

// POST /api/support - Submit a Help & Support question, bug report, or enhancement request
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const category = (body.category || 'question') as 'question' | 'bug' | 'enhancement'
    const message = (body.message || '').trim()
    const pageUrl = (body.pageUrl || '').trim()

    if (!message) {
      return NextResponse.json({ error: 'Please enter a message.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const serviceClient = getServiceClient()
    let userName = 'Pastor'
    let userEmail = user?.email || ''
    let churchId: string | null = null

    if (user) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('full_name, church_id')
        .eq('id', user.id)
        .maybeSingle() as any

      if (profile?.full_name) {
        userName = profile.full_name
      } else if (user.user_metadata?.full_name) {
        userName = user.user_metadata.full_name
      }
      churchId = profile?.church_id || null
    }

    // 1. Save to support_tickets table (with automatic fallback to notifications if migration 013 hasn't run yet)
    let savedTicketId: string | null = null
    const { data: inserted, error: insertError } = await serviceClient
      .from('support_tickets')
      .insert({
        user_id: user?.id || null,
        church_id: churchId,
        user_name: userName,
        user_email: userEmail,
        category,
        message,
        page_url: pageUrl || null,
        status: 'open',
      })
      .select('id')
      .single()

    if (!insertError && inserted) {
      savedTicketId = inserted.id
    } else if (user?.id) {
      // Fallback storage in notifications so Admin Dashboard always has it even before SQL migration
      const meta = JSON.stringify({
        category,
        userName,
        userEmail,
        pageUrl,
        status: 'open',
      })
      const { data: fallbackRow } = await serviceClient
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'system',
          title: `${FALLBACK_PREFIX}${meta}`,
          body: message,
          link: '/admin?tab=support',
          is_read: true,
        })
        .select('id')
        .single()
      savedTicketId = fallbackRow?.id || null
    }

    // 2. Send email to support@theshepherdsdesk.app
    const emailResult = await sendSupportTicketEmail({
      category,
      message,
      userName,
      userEmail,
      pageUrl,
    })

    return NextResponse.json({
      success: true,
      id: savedTicketId,
      emailSent: emailResult.success,
    })
  } catch (err: any) {
    console.error('Error submitting support ticket:', err)
    return NextResponse.json({ error: err.message || 'Failed to submit support message' }, { status: 500 })
  }
}

// GET /api/support - List all support tickets for Admin Dashboard
export async function GET(request: Request) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceClient = getServiceClient()
    const tickets: any[] = []

    // 1. Query support_tickets table
    const { data: dbTickets, error: dbErr } = await serviceClient
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (!dbErr && dbTickets) {
      tickets.push(...dbTickets)
    }

    // 2. Also check fallback notifications in case any tickets were created before migration
    const { data: fallbackRows } = await serviceClient
      .from('notifications')
      .select('*')
      .like('title', `${FALLBACK_PREFIX}%`)
      .order('created_at', { ascending: false })

    if (fallbackRows && fallbackRows.length > 0) {
      for (const row of fallbackRows) {
        try {
          const rawJson = String(row.title || '').slice(FALLBACK_PREFIX.length)
          const meta = JSON.parse(rawJson)
          tickets.push({
            id: `fallback_${row.id}`,
            user_id: row.user_id,
            user_name: meta.userName || 'Pastor',
            user_email: meta.userEmail || '',
            category: meta.category || 'question',
            message: row.body || '',
            page_url: meta.pageUrl || null,
            status: meta.status || 'open',
            created_at: row.created_at,
          })
        } catch {}
      }
    }

    tickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ tickets })
  } catch (err: any) {
    console.error('Error fetching support tickets:', err)
    return NextResponse.json({ error: err.message || 'Failed to load support tickets' }, { status: 500 })
  }
}

// PATCH /api/support - Update ticket status ('open' | 'resolved') or delete
export async function PATCH(request: Request) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, status, action } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
    }

    const serviceClient = getServiceClient()

    if (String(id).startsWith('fallback_')) {
      const realId = String(id).replace('fallback_', '')
      if (action === 'delete') {
        await serviceClient.from('notifications').delete().eq('id', realId)
        return NextResponse.json({ success: true })
      }
      const { data: row } = await serviceClient
        .from('notifications')
        .select('title')
        .eq('id', realId)
        .single()
      if (row?.title?.startsWith(FALLBACK_PREFIX)) {
        const meta = JSON.parse(row.title.slice(FALLBACK_PREFIX.length))
        meta.status = status
        await serviceClient
          .from('notifications')
          .update({ title: `${FALLBACK_PREFIX}${JSON.stringify(meta)}` })
          .eq('id', realId)
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      await serviceClient.from('support_tickets').delete().eq('id', id)
      return NextResponse.json({ success: true })
    }

    const { error } = await serviceClient
      .from('support_tickets')
      .update({ status })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update ticket' }, { status: 500 })
  }
}
