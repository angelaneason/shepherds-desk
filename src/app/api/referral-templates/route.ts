import { NextResponse } from 'next/server'
import { getRequestUser, getServiceClient, verifyAdminUser, ADMIN_EMAILS } from '@/lib/server-auth'

/**
 * GET - Saved referral messages available to the signed-in user.
 * Pastors get the "All pastors" messages; admins also get "Admins only" messages.
 */
export async function GET(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = !!(await verifyAdminUser(request))
  const admin = getServiceClient()
  let query = admin.from('referral_templates').select('*').order('created_at', { ascending: true })
  if (!isAdmin) query = query.eq('visibility', 'all')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const email = (user.email || '').toLowerCase()
  const templates = data || []
  // Pick the default: a template owned by this user first, then the global default
  const defaultTemplate =
    templates.find((t: any) => t.owner_email && t.owner_email.toLowerCase() === email) ||
    templates.find((t: any) => t.is_default) ||
    templates[0] ||
    null

  return NextResponse.json({ templates, defaultId: defaultTemplate?.id || null, isAdmin })
}

function clean(input: any) {
  const name = String(input.name || '').trim()
  const body = String(input.body || '').trim()
  const subject = input.subject ? String(input.subject).trim() : null
  const visibility = input.visibility === 'admin' ? 'admin' : 'all'
  const ownerEmail = input.owner_email ? String(input.owner_email).trim().toLowerCase() : null
  return { name, body, subject, visibility, is_default: !!input.is_default, owner_email: ownerEmail }
}

// POST - Create a template (admin)
export async function POST(request: Request) {
  const adminUser = await verifyAdminUser(request)
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload = clean(await request.json())
  if (!payload.name || !payload.body) {
    return NextResponse.json({ error: 'Name and message are required' }, { status: 400 })
  }
  if (payload.owner_email && !ADMIN_EMAILS.includes(payload.owner_email) && !payload.owner_email.includes('@')) {
    payload.owner_email = null
  }

  const admin = getServiceClient()
  if (payload.is_default) {
    await admin.from('referral_templates').update({ is_default: false } as any).eq('is_default', true)
  }

  const { data, error } = await admin
    .from('referral_templates')
    .insert({ ...payload, created_by: adminUser.id } as any)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

// PATCH - Update a template (admin)
export async function PATCH(request: Request) {
  const adminUser = await verifyAdminUser(request)
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const payload = clean(body)
  if (!payload.name || !payload.body) {
    return NextResponse.json({ error: 'Name and message are required' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (payload.is_default) {
    await admin.from('referral_templates').update({ is_default: false } as any).neq('id', body.id)
  }

  const { data, error } = await admin
    .from('referral_templates')
    .update({ ...payload, updated_at: new Date().toISOString() } as any)
    .eq('id', body.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

// DELETE - Remove a template (admin)
export async function DELETE(request: Request) {
  const adminUser = await verifyAdminUser(request)
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id') || (await request.json().catch(() => ({}))).id
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await getServiceClient().from('referral_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
