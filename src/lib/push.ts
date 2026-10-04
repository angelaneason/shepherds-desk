import { getServiceClient } from '@/lib/server-auth'

export type PushType =
  | 'referral'
  | 'sermon'
  | 'care'
  | 'study'
  | 'calendar'
  | 'announcement'
  | 'broadcast'

export interface PushMessage {
  title: string
  body: string
  /** Screen name for the mobile app and/or a web path, e.g. "/care" */
  link?: string
  type: PushType
}

interface NotifyOptions {
  /** Also add an entry to the in-app notification bell (default true) */
  inApp?: boolean
  /** If set, the notification is only ever sent once per user for this key */
  dedupeKey?: string
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

function isEnabled(prefs: any, type: PushType) {
  if (!prefs || typeof prefs !== 'object') return true
  return prefs[type] !== false
}

/**
 * Send a notification to one or more users.
 * - Respects each user's per-type notification preferences
 * - Writes an in-app notification row (used for the bell + dedupe)
 * - Sends an Expo push to every registered phone
 * Returns the number of users notified.
 */
export async function notifyUsers(
  profileIds: string[],
  message: PushMessage,
  options: NotifyOptions = {}
): Promise<{ notified: number; pushed: number }> {
  const { inApp = true, dedupeKey } = options
  const ids = Array.from(new Set(profileIds.filter(Boolean)))
  if (ids.length === 0) return { notified: 0, pushed: 0 }

  const admin = getServiceClient()

  // 1. Load preferences and filter out anyone who turned this type off
  const recipients: string[] = []
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    const { data } = await admin
      .from('profiles')
      .select('id, notification_preferences, notifications_enabled')
      .in('id', chunk) as any
    for (const p of data || []) {
      if (p.notifications_enabled === false) continue
      if (isEnabled(p.notification_preferences, message.type)) recipients.push(p.id)
    }
  }
  if (recipients.length === 0) return { notified: 0, pushed: 0 }

  // 2. In-app notification rows (dedupe-safe)
  let finalRecipients = recipients
  if (inApp || dedupeKey) {
    const rows = recipients.map((id) => ({
      profile_id: id,
      type: message.type,
      title: message.title,
      message: message.body,
      link: message.link || null,
      is_read: false,
      dedupe_key: dedupeKey || null,
    }))

    if (dedupeKey) {
      const inserted: string[] = []
      for (let i = 0; i < rows.length; i += 500) {
        const { data, error } = await admin
          .from('notifications')
          .upsert(rows.slice(i, i + 500), {
            onConflict: 'profile_id,dedupe_key',
            ignoreDuplicates: true,
          })
          .select('profile_id') as any
        if (error) console.error('notifyUsers dedupe insert error:', error.message)
        for (const r of data || []) inserted.push(r.profile_id)
      }
      // Only push to users who did not already receive this notification
      finalRecipients = inserted
    } else {
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await admin.from('notifications').insert(rows.slice(i, i + 500))
        if (error) console.error('notifyUsers insert error:', error.message)
      }
    }
  }
  if (finalRecipients.length === 0) return { notified: 0, pushed: 0 }

  // 3. Push to registered phones
  const tokens: string[] = []
  for (let i = 0; i < finalRecipients.length; i += 500) {
    const { data } = await admin
      .from('push_tokens')
      .select('token')
      .in('profile_id', finalRecipients.slice(i, i + 500)) as any
    for (const t of data || []) tokens.push(t.token)
  }

  const pushed = await sendExpoPush(tokens, message)
  return { notified: finalRecipients.length, pushed }
}

async function sendExpoPush(tokens: string[], message: PushMessage): Promise<number> {
  const valid = tokens.filter((t) => t && t.startsWith('ExponentPushToken'))
  if (valid.length === 0) return 0

  const admin = getServiceClient()
  let sent = 0

  // Expo accepts up to 100 messages per request
  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100)
    const payload = batch.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      sound: 'default',
      data: { link: message.link || null, type: message.type },
    }))

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      const tickets: any[] = json?.data || []

      const deadTokens: string[] = []
      tickets.forEach((ticket, idx) => {
        if (ticket?.status === 'ok') sent++
        else if (ticket?.details?.error === 'DeviceNotRegistered') deadTokens.push(batch[idx])
      })

      // Clean up phones that uninstalled the app
      if (deadTokens.length > 0) {
        await admin.from('push_tokens').delete().in('token', deadTokens)
      }
    } catch (err: any) {
      console.error('Expo push error:', err?.message || err)
    }
  }

  return sent
}
