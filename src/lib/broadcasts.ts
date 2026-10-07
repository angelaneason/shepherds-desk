// Saved broadcasts (Phase 1)
//
// TSD never creates a group text. A broadcast is saved with one row per
// person, then handed off ONE PERSON AT A TIME: each text opens in the
// pastor's own messaging app with a single number, so nobody sees anyone
// else's number. Do Not Text, missing/invalid numbers and duplicate numbers
// are skipped by the server (create_broadcast) and recorded with a reason.
//
// Statuses are honest: TSD can see that a text was OPENED in the messaging
// app, not that the pastor tapped Send.

import type { SupabaseClient } from '@supabase/supabase-js'

/** Readable message from an Error or a Supabase/PostgREST error object. */
export const errorText = (e: unknown, fallback: string) => {
  const m = (e as { message?: unknown } | null)?.message
  return typeof m === 'string' && m.trim() ? m : fallback
}

export type BroadcastStatus =
  | 'draft' | 'awaiting_phone_approval' | 'sending' | 'paused'
  | 'completed' | 'completed_with_issues' | 'cancelled' | 'expired'

export type Broadcast = {
  id: string
  profile_id: string
  body: string
  channel: 'sms_handoff' | 'bridge'
  device_label_snapshot: string | null
  status: BroadcastStatus
  started_at: string | null
  completed_at: string | null
  total: number
  pending: number
  opened: number
  sent: number
  delivered: number
  failed: number
  skipped: number
  created_at: string
}

export type RecipientStatus =
  | 'not_opened' | 'opened' | 'skipped'
  | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled'

export type SkipReason = 'do_not_text' | 'no_phone' | 'invalid_phone' | 'duplicate_number' | 'user_skipped'

export type BroadcastRecipient = {
  id: string
  broadcast_id: string
  member_id: string | null
  name_snapshot: string
  was_archived: boolean
  position: number
  status: RecipientStatus
  skip_reason: SkipReason | null
  opened_at: string | null
  /** Current person record (null once the person has been deleted). */
  members?: { id: string; full_name: string; phone: string | null; phone_e164: string | null; do_not_text: boolean; archived_at: string | null } | null
}

export const SKIP_REASON_LABEL: Record<SkipReason, string> = {
  do_not_text: 'Do not text',
  no_phone: 'No phone number',
  invalid_phone: 'Phone number not valid',
  duplicate_number: 'Same number as someone above',
  user_skipped: 'Skipped by you',
}

export const RECIPIENT_STATUS_LABEL: Record<RecipientStatus, string> = {
  not_opened: 'Not opened',
  opened: 'Opened',
  skipped: 'Skipped',
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export const BROADCAST_STATUS_LABEL: Record<BroadcastStatus, string> = {
  draft: 'Draft',
  awaiting_phone_approval: 'Waiting for phone',
  sending: 'In progress',
  paused: 'Paused',
  completed: 'Completed',
  completed_with_issues: 'Completed with issues',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

/** Name to show in history: live name, "Jane Doe (deleted)", or "Deleted contact". */
export const recipientDisplayName = (r: Pick<BroadcastRecipient, 'member_id' | 'name_snapshot' | 'members'>) => {
  if (r.member_id && r.members) return r.members.full_name
  if (r.name_snapshot === 'Deleted contact') return 'Deleted contact'
  return `${r.name_snapshot} (deleted)`
}

export const firstNameOf = (fullName: string) => (fullName || '').trim().split(/\s+/)[0] || ''

/** Fills the optional {first_name} merge field. */
export const personalize = (body: string, fullName: string) =>
  body.replace(/\{\s*first_name\s*\}/gi, firstNameOf(fullName) || 'friend')

/** sms: link for exactly ONE number. Never pass more than one number. */
export const singleSmsHref = (phone: string, body: string) => {
  const clean = phone.replace(/[^0-9+]/g, '')
  const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  return `sms:${clean}${isApple ? '&' : '?'}body=${encodeURIComponent(body)}`
}

const RECIPIENT_SELECT =
  'id, broadcast_id, member_id, name_snapshot, was_archived, position, status, skip_reason, opened_at, ' +
  'members(id, full_name, phone, phone_e164, do_not_text, archived_at)'

export async function createBroadcast(supabase: SupabaseClient, body: string, memberIds: string[]) {
  const { data, error } = await supabase.rpc('create_broadcast', { p_body: body, p_member_ids: memberIds })
  if (error) throw error
  return data as string
}

export async function fetchBroadcasts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []) as Broadcast[]
}

export async function fetchBroadcast(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('broadcasts').select('*').eq('id', id).single()
  if (error) throw error
  return data as Broadcast
}

export async function fetchRecipients(supabase: SupabaseClient, broadcastId: string) {
  const { data, error } = await supabase
    .from('broadcast_recipients')
    .select(RECIPIENT_SELECT)
    .eq('broadcast_id', broadcastId)
    .order('position')
  if (error) throw error
  return (data || []) as unknown as BroadcastRecipient[]
}

export async function markRecipient(
  supabase: SupabaseClient,
  recipientId: string,
  status: 'opened' | 'skipped',
  skipReason?: SkipReason,
) {
  const { error } = await supabase
    .from('broadcast_recipients')
    .update({ status, skip_reason: status === 'skipped' ? (skipReason || 'user_skipped') : null })
    .eq('id', recipientId)
  if (error) throw error
}

export async function setBroadcastStatus(supabase: SupabaseClient, id: string, status: 'sending' | 'paused' | 'cancelled') {
  const { error } = await supabase
    .from('broadcasts')
    .update({ status, ...(status === 'cancelled' ? { completed_at: new Date().toISOString() } : {}) })
    .eq('id', id)
    .in('status', ['sending', 'paused'])
  if (error) throw error
}

export async function deleteBroadcast(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('broadcasts').delete().eq('id', id)
  if (error) throw error
}

/** Rough SMS segment count (GSM 160/153, Unicode 70/67). */
export const smsSegments = (text: string) => {
  if (!text) return 0
  // eslint-disable-next-line no-control-regex
  const unicode = /[^\x00-\x7F]/.test(text)
  const single = unicode ? 70 : 160
  const multi = unicode ? 67 : 153
  return text.length <= single ? 1 : Math.ceil(text.length / multi)
}
