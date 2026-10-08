// Phone Bridge: configurable limits (plan §6) and usage counts (server only).
// Initial testing defaults, never promised to users as carrier-safe limits.

import { getBridgeServiceClient } from './auth'
import { stripDashes } from '@/lib/broadcasts'

export type BridgeConfig = {
  delay_min_secs: number
  delay_max_secs: number
  max_recipients: number
  warn_recipients: number
  max_texts_per_day: number
  max_broadcasts_per_day: number
  quiet_start: string
  quiet_end: string
  auto_pause_consecutive_failures: number
  segment_warning: number
  approval_timeout_min: number
  job_timeout_min: number
}

export const DEFAULT_BRIDGE_CONFIG: BridgeConfig = {
  delay_min_secs: 8,
  delay_max_secs: 15,
  max_recipients: 100,
  warn_recipients: 50,
  max_texts_per_day: 200,
  max_broadcasts_per_day: 3,
  quiet_start: '21:00',
  quiet_end: '08:00',
  auto_pause_consecutive_failures: 3,
  segment_warning: 3,
  approval_timeout_min: 30,
  job_timeout_min: 10,
}

const KEYS = Object.keys(DEFAULT_BRIDGE_CONFIG) as (keyof BridgeConfig)[]

/** Per-account override if an admin set one, else the global row, else built-in defaults. */
export async function getEffectiveConfig(profileId: string): Promise<BridgeConfig> {
  const { data, error } = await getBridgeServiceClient()
    .from('bridge_config')
    .select('*')
    .or(`profile_id.eq.${profileId},profile_id.is.null`)
  if (error || !data?.length) {
    if (error) console.error('[bridge] config load failed:', error.message)
    return { ...DEFAULT_BRIDGE_CONFIG }
  }
  const row = data.find(r => r.profile_id === profileId) || data.find(r => r.profile_id == null) || {}
  const out = { ...DEFAULT_BRIDGE_CONFIG } as Record<string, unknown>
  for (const k of KEYS) if (row[k] != null) out[k] = row[k]
  // Postgres `time` comes back as HH:MM:SS
  out.quiet_start = String(out.quiet_start).slice(0, 5)
  out.quiet_end = String(out.quiet_end).slice(0, 5)
  return out as BridgeConfig
}

/** Bridge texts in the last 24 h (1:1 + broadcast), same rule as the SQL helper. */
export async function textsLast24h(profileId: string): Promise<number> {
  const { data, error } = await getBridgeServiceClient().rpc('bridge_texts_last_24h', { p_profile_id: profileId })
  if (error) {
    console.error('[bridge] usage count failed:', error.message)
    return Number.MAX_SAFE_INTEGER   // fail closed
  }
  return Number(data) || 0
}

/** Outgoing member-facing text: no em/en dashes (project rule), trimmed. */
export const cleanOutgoingBody = (body: string) => stripDashes(String(body || '')).trim()
