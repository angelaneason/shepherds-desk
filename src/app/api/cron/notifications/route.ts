import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/server-auth'
import { notifyUsers } from '@/lib/push'

export const maxDuration = 60

/**
 * Scheduled notification runner. Call every 15 minutes.
 * Protected by CRON_SECRET (Authorization: Bearer <secret> or ?secret=<secret>).
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const url = new URL(request.url)
    const auth = request.headers.get('authorization') || ''
    const provided = auth.replace('Bearer ', '').trim() || url.searchParams.get('secret') || ''
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = getServiceClient()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const results: Record<string, number> = {}

  // Only users with a registered phone get scheduled pushes
  const { data: tokenRows } = await admin.from('push_tokens').select('profile_id') as any
  const userIds: string[] = Array.from(new Set((tokenRows || []).map((r: any) => r.profile_id)))

  // ── 1. Referral sign-ups (also sent instantly from the sign-up flow) ──
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const { data: newSignups } = await admin
    .from('referrals')
    .select('id, referrer_id, invite_name, signup_email, referred_email')
    .in('status', ['signed_up', 'subscribed'])
    .gte('converted_at', twoDaysAgo) as any
  results.referral = 0
  for (const r of newSignups || []) {
    const who = r.invite_name || r.signup_email || 'A pastor you invited'
    const res = await notifyUsers(
      [r.referrer_id],
      {
        type: 'referral',
        title: '🎉 Your referral signed up!',
        body: `${who} just joined The Shepherd's Desk. Thank you for sharing!`,
        link: 'Referrals',
      },
      { dedupeKey: `referral:${r.id}` }
    )
    results.referral += res.notified
  }

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, results, users: 0 })
  }

  // ── 2. Calendar reminders: events starting within the next hour ──
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  const { data: events } = await admin
    .from('calendar_events')
    .select('id, profile_id, title, start_time, all_day')
    .in('profile_id', userIds)
    .eq('all_day', false)
    .gte('start_time', now.toISOString())
    .lte('start_time', inOneHour) as any
  results.calendar = 0
  for (const ev of events || []) {
    const mins = Math.max(1, Math.round((new Date(ev.start_time).getTime() - now.getTime()) / 60000))
    const res = await notifyUsers(
      [ev.profile_id],
      {
        type: 'calendar',
        title: '📅 Coming up soon',
        body: `${ev.title} starts in ${mins} minute${mins === 1 ? '' : 's'}.`,
        link: 'Calendar',
      },
      { dedupeKey: `calendar:${ev.id}:${ev.start_time}` }
    )
    results.calendar += res.notified
  }

  // Daily reminders only go out after 8am US Central (13:00 UTC) so nobody is woken up
  const utcHour = now.getUTCHours()
  const daytime = utcHour >= 13 && utcHour <= 23

  if (daytime) {
    // ── 3. Sermon deadlines: preaching within 3 days and not ready ──
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: sermons } = await admin
      .from('sermons')
      .select('id, author_id, title, status, preach_date')
      .in('author_id', userIds)
      .in('status', ['draft', 'review'])
      .gte('preach_date', todayStr)
      .lte('preach_date', threeDays) as any
    results.sermon = 0
    for (const s of sermons || []) {
      const days = Math.max(
        0,
        Math.round((new Date(s.preach_date + 'T12:00:00Z').getTime() - new Date(todayStr + 'T12:00:00Z').getTime()) / 86400000)
      )
      const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
      const res = await notifyUsers(
        [s.author_id],
        {
          type: 'sermon',
          title: '📖 Sermon deadline',
          body: `"${s.title}" is preaching ${when} and is still a ${s.status}.`,
          link: 'Sermons',
        },
        { dedupeKey: `sermon:${s.id}:${todayStr}` }
      )
      results.sermon += res.notified
    }

    // ── 4. Overdue care follow-ups (once per day) ──
    const { data: overdue } = await admin
      .from('care_tasks')
      .select('profile_id')
      .in('profile_id', userIds)
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', todayStr) as any
    const overdueCounts = new Map<string, number>()
    for (const t of overdue || []) overdueCounts.set(t.profile_id, (overdueCounts.get(t.profile_id) || 0) + 1)
    results.care = 0
    for (const [profileId, count] of overdueCounts) {
      const res = await notifyUsers(
        [profileId],
        {
          type: 'care',
          title: '🙏 Care follow-ups',
          body: `You have ${count} care task${count === 1 ? '' : 's'} past due.`,
          link: 'Care',
        },
        { dedupeKey: `care:${todayStr}` }
      )
      results.care += res.notified
    }

    // ── 5. Today's announcements ──
    const { data: announcements } = await admin
      .from('announcements')
      .select('id, profile_id, title')
      .in('profile_id', userIds)
      .eq('is_active', true)
      .eq('display_date', todayStr) as any
    results.announcement = 0
    for (const a of announcements || []) {
      const res = await notifyUsers(
        [a.profile_id],
        {
          type: 'announcement',
          title: '📢 Announcement for today',
          body: a.title,
          link: 'Announcements',
        },
        { dedupeKey: `announcement:${a.id}:${todayStr}` }
      )
      results.announcement += res.notified
    }

    // ── 6. Weekly study goal (Wednesday or later, once per week) ──
    const dow = now.getUTCDay()
    if (dow >= 3) {
      const startOfWeek = new Date(now)
      startOfWeek.setUTCDate(now.getUTCDate() - dow)
      startOfWeek.setUTCHours(0, 0, 0, 0)
      const weekKey = startOfWeek.toISOString().slice(0, 10)

      const [{ data: profiles }, { data: studyEvents }] = await Promise.all([
        admin.from('profiles').select('id, weekly_study_goal_hours').in('id', userIds) as any,
        admin
          .from('calendar_events')
          .select('profile_id, start_time, end_time')
          .in('profile_id', userIds)
          .eq('event_type', 'sermon_study')
          .gte('start_time', startOfWeek.toISOString()) as any,
      ])

      const minutes = new Map<string, number>()
      for (const ev of studyEvents || []) {
        const m = Math.max(0, (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 60000)
        minutes.set(ev.profile_id, (minutes.get(ev.profile_id) || 0) + m)
      }

      results.study = 0
      for (const p of profiles || []) {
        const goal = p.weekly_study_goal_hours || 10
        const hours = (minutes.get(p.id) || 0) / 60
        if (hours >= goal * 0.5) continue
        const res = await notifyUsers(
          [p.id],
          {
            type: 'study',
            title: '📚 Study goal check-in',
            body: `You're at ${hours.toFixed(1)} of ${goal} study hours this week. Keep going!`,
            link: 'Study',
          },
          { dedupeKey: `study:${weekKey}` }
        )
        results.study += res.notified
      }
    }
  }

  return NextResponse.json({ ok: true, results, users: userIds.length })
}

export async function GET(request: Request) {
  try {
    return await run(request)
  } catch (error: any) {
    console.error('Cron notifications error:', error?.message || error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
