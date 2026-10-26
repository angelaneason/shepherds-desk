import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/server-auth'
import { notifyUsers } from '@/lib/push'
import { sendTrialEndingEmail } from '@/lib/email'

export const maxDuration = 60

/**
 * Scheduled notification runner. Call every 15 minutes.
 * Protected by CRON_SECRET (Authorization: Bearer <secret> or ?secret=<secret>).
 * Covers:
 * 1. Referral sign-ups
 * 2. Trial & account lifecycle notifications (7 days, 3 days, 1 day, expired)
 * 3. Calendar reminders (starting in next 60 mins)
 * 4. Sermon deadlines (preaching within 3 days)
 * 5. Overdue pastoral care follow-ups
 * 6. Today's church announcements
 * 7. Weekly study goal check-ins
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

  // 1. Fetch all registered profiles so in-app notifications and trial emails reach everyone
  const { data: allProfiles } = await admin
    .from('profiles')
    .select('id, full_name, email, stripe_customer_id, trial_ends_at, created_at, subscription_status, subscription_tier, notifications_enabled, notification_preferences') as any

  const userIds: string[] = Array.from(new Set((allProfiles || []).map((p: any) => p.id)))

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
    // ── 3. Trial & Subscription Lifecycle Reminders (In-App + Mobile Push + Email) ──
    results.trial = 0
    results.trialEmails = 0
    for (const p of allProfiles || []) {
      const hasSub = !!p.stripe_customer_id || p.subscription_status === 'active'
      if (hasSub) continue

      let daysRemaining = 30
      if (p.trial_ends_at) {
        const ends = new Date(p.trial_ends_at).getTime()
        daysRemaining = Math.ceil((ends - now.getTime()) / (1000 * 60 * 60 * 24))
      } else if (p.created_at) {
        const trialEnd = new Date(new Date(p.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).getTime()
        daysRemaining = Math.ceil((trialEnd - now.getTime()) / (1000 * 60 * 60 * 24))
      }

      let trialMsg: { title: string; body: string; dedupeKey: string; days: number } | null = null

      if (daysRemaining === 7) {
        trialMsg = {
          title: '⏳ 7 Days Left on Your Free Trial',
          body: 'You have 7 days remaining on your Shepherd\'s Desk trial. Keep all your sermon manuscripts and pastoral care tools active at theshepherdsdesk.app.',
          dedupeKey: `trial:7d:${p.id}`,
          days: 7,
        }
      } else if (daysRemaining === 3) {
        trialMsg = {
          title: '⏳ 3 Days Remaining on Your Trial',
          body: 'Your 30-day trial concludes in 3 days. Visit the web portal at theshepherdsdesk.app to ensure uninterrupted access.',
          dedupeKey: `trial:3d:${p.id}`,
          days: 3,
        }
      } else if (daysRemaining === 1) {
        trialMsg = {
          title: '⚠️ Trial Ends Tomorrow',
          body: 'Your free trial ends tomorrow. Choose your plan on the web portal to keep your pulpit teleprompter and notes active.',
          dedupeKey: `trial:1d:${p.id}`,
          days: 1,
        }
      } else if (daysRemaining <= 0) {
        trialMsg = {
          title: 'Free Trial Concluded',
          body: 'Your 30-day trial has completed. All your sermons and records are safe. Reactivate anytime at theshepherdsdesk.app.',
          dedupeKey: `trial:expired:${p.id}`,
          days: 0,
        }
      }

      if (trialMsg) {
        const res = await notifyUsers(
          [p.id],
          {
            type: 'system',
            title: trialMsg.title,
            body: trialMsg.body,
            link: 'Settings',
          },
          { dedupeKey: trialMsg.dedupeKey }
        )
        if (res.notified > 0) {
          results.trial++
          if (p.email) {
            try {
              await sendTrialEndingEmail({
                to: p.email,
                pastorName: p.full_name,
                daysRemaining: trialMsg.days,
              })
              results.trialEmails++
            } catch (err) {
              console.error('Failed to send trial ending email:', err)
            }
          }
        }
      }
    }

    // ── 4. Sermon deadlines: preaching within 3 days and not ready ──
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

    // ── 5. Due-today & overdue care follow-ups / reminders (once per day) ──
    const { data: dueTasks } = await admin
      .from('care_tasks')
      .select('id, profile_id, title, due_date')
      .in('profile_id', userIds)
      .in('status', ['pending', 'in_progress'])
      .lte('due_date', todayStr) as any

    const userCareBuckets = new Map<string, { todayTitles: string[]; overdueCount: number }>()
    for (const t of dueTasks || []) {
      const bucket = userCareBuckets.get(t.profile_id) || { todayTitles: [], overdueCount: 0 }
      if (String(t.due_date || '').slice(0, 10) === todayStr) {
        bucket.todayTitles.push(t.title || 'Follow-up reminder')
      } else {
        bucket.overdueCount += 1
      }
      userCareBuckets.set(t.profile_id, bucket)
    }

    results.care = 0
    for (const [profileId, bucket] of userCareBuckets) {
      const todayCount = bucket.todayTitles.length
      const overdueCount = bucket.overdueCount
      let bodyText = ''
      if (todayCount === 1 && overdueCount === 0) {
        bodyText = `Due today: ${bucket.todayTitles[0]}`
      } else if (todayCount > 1 && overdueCount === 0) {
        bodyText = `You have ${todayCount} care reminders due today (${bucket.todayTitles[0]} and more).`
      } else if (todayCount > 0 && overdueCount > 0) {
        bodyText = `You have ${todayCount} reminder${todayCount === 1 ? '' : 's'} due today and ${overdueCount} past due.`
      } else {
        bodyText = `You have ${overdueCount} care follow-up${overdueCount === 1 ? '' : 's'} past due.`
      }

      const res = await notifyUsers(
        [profileId],
        {
          type: 'care',
          title: todayCount > 0 ? '🔔 Today\'s Care & Follow-Up Reminder' : '🙏 Care follow-ups',
          body: bodyText,
          link: 'Care',
        },
        { dedupeKey: `care:${todayStr}` }
      )
      results.care += res.notified
    }

    // ── 6. Today's announcements ──
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

    // ── 7. Weekly study goal (Wednesday or later, once per week) ──
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
