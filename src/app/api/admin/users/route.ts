import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseServer = await createClient()
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as any

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all auth users
    const { data: authData, error: authError } = await serviceClient.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Get all profiles to join with auth users
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select(`
        *,
        churches (
          name
        )
      `)

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // Since counts require multiple queries or rpc, we'll fetch them individually or in bulk
    // For simplicity, we'll fetch counts for each user if needed, or get bulk
    // Here we can just query all table counts and group by profile_id
    const [
      { data: sermons },
      { data: ideas },
      { data: careTasks }
    ] = await Promise.all([
      serviceClient.from('sermons').select('author_id'),
      serviceClient.from('ideas').select('profile_id'),
      serviceClient.from('care_tasks').select('profile_id')
    ])

    const sermonCounts = (sermons || []).reduce((acc: Record<string, number>, s) => {
      acc[s.author_id!] = (acc[s.author_id!] || 0) + 1
      return acc
    }, {})

    const ideaCounts = (ideas || []).reduce((acc: Record<string, number>, i) => {
      acc[i.profile_id!] = (acc[i.profile_id!] || 0) + 1
      return acc
    }, {})

    const careTaskCounts = (careTasks || []).reduce((acc: Record<string, number>, c) => {
      acc[c.profile_id!] = (acc[c.profile_id!] || 0) + 1
      return acc
    }, {})

    const users = authData.users.map(u => {
      const p = profiles?.find(p => p.id === u.id)
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at,
        full_name: p?.full_name || '',
        role: p?.role || 'pastor',
        church_name: p?.churches && !Array.isArray(p.churches) ? p.churches.name : '',
        sermon_count: sermonCounts[u.id] || 0,
        idea_count: ideaCounts[u.id] || 0,
        care_task_count: careTaskCounts[u.id] || 0,
        status: p?.role ? 'active' : 'inactive'
      }
    })

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Error in GET /api/admin/users:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
