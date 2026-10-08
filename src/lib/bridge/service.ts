// Phone Bridge: shared server operations used by several routes (server only).

import { getBridgeServiceClient } from './auth'
import type { BridgeDevice } from './deviceSig'

/** Device fields safe to show on the web (no key, no FCM token). */
export const publicDevice = (d: Partial<BridgeDevice> | null) =>
  d
    ? {
        id: d.id,
        display_name: d.display_name,
        model: d.model ?? null,
        status: d.status,
        sim_label: d.sim_label ?? null,
        approve_every_send: !!d.approve_every_send,
        last_seen_at: d.last_seen_at ?? null,
        created_at: d.created_at,
        revoked_at: d.revoked_at ?? null,
      }
    : null

export async function getActiveDevice(profileId: string): Promise<BridgeDevice | null> {
  const { data } = await getBridgeServiceClient()
    .from('bridge_devices')
    .select('*')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as BridgeDevice) || null
}

/**
 * Disconnects a device. The DB trigger cancels its unfinished 1:1 jobs (and
 * wipes their text). Bridge broadcasts still waiting for this phone are
 * cancelled too. Returns false if it was not active.
 */
export async function revokeDevice(profileId: string, deviceId: string) {
  const admin = getBridgeServiceClient()
  const { data, error } = await admin
    .from('bridge_devices')
    .update({ status: 'revoked' })
    .eq('id', deviceId)
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .select('id')
  if (error) throw error
  if (!data?.length) return false
  await admin
    .from('broadcasts')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .eq('device_id', deviceId)
    .eq('channel', 'bridge')
    .in('status', ['awaiting_phone_approval', 'sending', 'paused'])
  return true
}

/** IDs of work waiting for this phone (fallback if an FCM push was missed). */
export async function pendingWork(profileId: string, deviceId: string) {
  const admin = getBridgeServiceClient()
  const now = new Date().toISOString()
  const [jobs, broadcasts] = await Promise.all([
    admin.from('bridge_send_jobs').select('id')
      .eq('profile_id', profileId).eq('device_id', deviceId)
      .in('status', ['queued', 'awaiting_approval']).gt('expires_at', now)
      .order('created_at').limit(50),
    admin.from('broadcasts').select('id, status')
      .eq('profile_id', profileId).eq('device_id', deviceId).eq('channel', 'bridge')
      .in('status', ['awaiting_phone_approval', 'sending', 'paused'])
      .order('created_at').limit(20),
  ])
  return {
    pending_jobs: (jobs.data || []).map(j => j.id as string),
    pending_broadcasts: (broadcasts.data || []).map(b => ({ id: b.id as string, status: b.status as string })),
  }
}

/** Live Do Not Text numbers for the phone's local block list. */
export async function doNotTextNumbers(profileId: string) {
  const { data } = await getBridgeServiceClient()
    .from('members')
    .select('phone_e164')
    .eq('profile_id', profileId)
    .eq('do_not_text', true)
    .not('phone_e164', 'is', null)
  return Array.from(new Set((data || []).map(r => r.phone_e164 as string)))
}

export const firstName = (fullName: string | null | undefined) => (fullName || '').trim().split(/\s+/)[0] || ''
