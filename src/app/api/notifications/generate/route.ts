import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { profileId } = await request.json()
    
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    let generatedCount = 0

    // Get today's start date for deduplication
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()

    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 3 = Wednesday

    // --- 1. Study reminder (type: 'study') ---
    if (dayOfWeek >= 3) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('weekly_study_goal_hours')
        .eq('id', profileId)
        .single() as any

      const goalHours = profile?.weekly_study_goal_hours || 10

      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - dayOfWeek)
      startOfWeek.setHours(0, 0, 0, 0)

      const { data: events } = await supabase
        .from('calendar_events')
        .select('duration_minutes')
        .eq('profile_id', profileId)
        .eq('event_type', 'sermon_study')
        .gte('start_time', startOfWeek.toISOString()) as any

      const totalMinutes = (events || []).reduce((sum: number, event: any) => sum + (event.duration_minutes || 0), 0)
      const totalHours = totalMinutes / 60

      if (totalHours < goalHours * 0.5) {
        const title = 'Study Reminder'
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('profile_id', profileId)
          .eq('type', 'study')
          .eq('title', title)
          .gte('created_at', todayIso) as any

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            profile_id: profileId,
            type: 'study',
            title,
            message: `You're at ${totalHours.toFixed(1)}h of ${goalHours}h this week. Keep going!`,
            link: '/study',
            is_read: false
          })
          generatedCount++
        }
      }
    }

    // --- 2. Care follow-ups (type: 'care') ---
    const { count: overdueCareTasks } = await supabase
      .from('care_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', todayIso) as any

    if (overdueCareTasks && overdueCareTasks > 0) {
      const title = 'Overdue Follow-ups'
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('profile_id', profileId)
        .eq('type', 'care')
        .eq('title', title)
        .gte('created_at', todayIso) as any

      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert({
          profile_id: profileId,
          type: 'care',
          title,
          message: `You have ${overdueCareTasks} care tasks that need attention.`,
          link: '/care',
          is_read: false
        })
        generatedCount++
      }
    }

    // --- 3. Sermon deadline (type: 'sermon') ---
    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(now.getDate() + 3)

    const { data: upcomingSermons } = await supabase
      .from('sermons')
      .select('id, title, status, preach_date')
      .eq('profile_id', profileId)
      .not('status', 'in', '("ready", "preached")')
      .gte('preach_date', todayIso)
      .lte('preach_date', threeDaysFromNow.toISOString()) as any

    if (upcomingSermons && upcomingSermons.length > 0) {
      for (const sermon of upcomingSermons) {
        const preachDate = new Date(sermon.preach_date)
        const diffTime = Math.abs(preachDate.getTime() - now.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        const title = 'Sermon Deadline'
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('profile_id', profileId)
          .eq('type', 'sermon')
          .eq('title', title)
          .gte('created_at', todayIso) as any

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            profile_id: profileId,
            type: 'sermon',
            title,
            message: `"${sermon.title}" is preaching in ${diffDays} days and is still in ${sermon.status}.`,
            link: `/sermons/${sermon.id}`,
            is_read: false
          })
          generatedCount++
          break // typically we just show one deadline notification at a time to prevent spam
        }
      }
    }

    return NextResponse.json({ generated: generatedCount })
  } catch (error: any) {
    console.error('Error generating notifications:', error)
    return NextResponse.json({ error: 'Failed to generate notifications' }, { status: 500 })
  }
}
