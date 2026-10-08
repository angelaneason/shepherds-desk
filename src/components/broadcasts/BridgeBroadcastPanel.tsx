'use client'

// Live status of a Phone Bridge broadcast (Phase 6).
// Opens after "Send from my phone" on the broadcast screen (or from
// Broadcast History). Reads the broadcast and its recipients straight from
// Supabase (owner RLS allows SELECT) every 4 seconds until it is finished:
//   Waiting for you to approve on your phone -> Sending 3 of 25 -> Done: 24 sent, 1 failed
// Paused / Cancelled / Expired are shown in plain words. The browser may stop
// an unfinished broadcast; everything else is driven by the phone.

import { useEffect, useRef, useState } from 'react'
import { Smartphone, Check, AlertCircle, RefreshCw, Pause, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  type Broadcast, type BroadcastRecipient,
  errorText, fetchBroadcast, fetchRecipients, cancelBridgeBroadcast, isBridgeActive,
  recipientDisplayName, skippedSummary, RECIPIENT_STATUS_LABEL, SKIP_REASON_LABEL,
} from '@/lib/broadcasts'

export type BridgeBroadcastStart = {
  broadcast_id: string
  total: number
  sendable: number
  skipped: Record<string, number>
  warn: boolean
  device?: { id: string; display_name: string }
  fcm?: { sent: boolean } | null
}

const POLL_MS = 4000

const CHIP: Record<string, string> = {
  sent: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  skipped: 'bg-amber-100 text-amber-800',
  queued: 'bg-gray-100 text-gray-600',
  sending: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

/** Plain-words headline for the current state. */
export function bridgeProgressText(b: Broadcast) {
  const sendable = Math.max(0, b.total - b.skipped)
  const done = b.sent + b.failed
  switch (b.status) {
    case 'awaiting_phone_approval': return 'Waiting for you to approve on your phone'
    case 'sending': return `Sending ${Math.min(done + 1, sendable)} of ${sendable}`
    case 'paused': return `Paused: ${done} of ${sendable} done`
    case 'completed':
    case 'completed_with_issues':
      return b.failed > 0 ? `Done: ${b.sent} sent, ${b.failed} failed` : `Done: ${b.sent} sent`
    case 'cancelled':
      return b.sent > 0 || b.failed > 0
        ? `Cancelled: ${b.sent} of ${sendable} sent before it stopped`
        : 'Cancelled: nothing was sent'
    case 'expired': return 'Not sent: it was not approved on your phone in time'
    default: return 'Getting ready...'
  }
}

export default function BridgeBroadcastPanel({
  broadcastId, start, onClose,
}: {
  broadcastId: string | null
  /** Result of POST /api/bridge/broadcast, when the panel opens right after starting. */
  start?: BridgeBroadcastStart | null
  onClose: () => void
}) {
  const [supabase] = useState(() => createClient())
  const [b, setB] = useState<Broadcast | null>(null)
  const [recipients, setRecipients] = useState<BroadcastRecipient[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmStop, setConfirmStop] = useState(false)
  const [stopping, setStopping] = useState(false)
  const activeRef = useRef(true)

  // State starts empty for each broadcast: the parent remounts this panel with key={broadcastId}.
  useEffect(() => {
    if (!broadcastId) return
    let stop = false
    activeRef.current = true
    const tick = async () => {
      try {
        const [row, people] = await Promise.all([fetchBroadcast(supabase, broadcastId), fetchRecipients(supabase, broadcastId)])
        if (stop) return
        setB(row); setRecipients(people); setError(null)
        activeRef.current = isBridgeActive(row)
      } catch (e: unknown) {
        if (!stop) setError(errorText(e, 'Could not load the latest status. Trying again...'))
      }
    }
    tick()
    const t = setInterval(() => { if (activeRef.current) tick() }, POLL_MS)
    return () => { stop = true; clearInterval(t) }
  }, [broadcastId, supabase])

  const stopSending = async () => {
    if (!b || stopping) return
    setStopping(true)
    try {
      await cancelBridgeBroadcast(supabase, b.id)
      const [row, people] = await Promise.all([fetchBroadcast(supabase, b.id), fetchRecipients(supabase, b.id)])
      setB(row); setRecipients(people)
      activeRef.current = isBridgeActive(row)
      setConfirmStop(false)
    } catch (e: unknown) {
      setError(errorText(e, 'Could not stop the broadcast.'))
    } finally {
      setStopping(false)
    }
  }

  const deviceName = b?.device_label_snapshot || start?.device?.display_name || 'your phone'
  const active = b ? isBridgeActive(b) : true
  const sendable = b ? Math.max(0, b.total - b.skipped) : start?.sendable || 0
  const done = b ? b.sent + b.failed : 0
  const pct = sendable > 0 ? Math.round((done / sendable) * 100) : 0
  const good = b && (b.status === 'completed' || (b.status === 'completed_with_issues' && b.sent > 0))
  const bad = b && (b.status === 'cancelled' || b.status === 'expired' || (b.status === 'completed_with_issues' && b.sent === 0))
  const skippedTotal = start ? Object.values(start.skipped || {}).reduce((a, n) => a + n, 0) : 0
  const showStartInfo = !!start && start.broadcast_id === broadcastId

  return (
    <Dialog open={!!broadcastId} onOpenChange={(o) => { if (!o && !stopping) onClose() }}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#022d5c] flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#D0A348]" /> Sending from {deviceName}
          </DialogTitle>
          <DialogDescription>
            Each person gets their own text from your phone number. Nobody sees anyone else&apos;s number.
          </DialogDescription>
        </DialogHeader>

        {showStartInfo && skippedTotal > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {skippedTotal} {skippedTotal === 1 ? 'person was' : 'people were'} left out: {skippedSummary(start!.skipped)}.
          </div>
        )}
        {showStartInfo && start!.warn && (
          <p className="text-xs text-gray-600">This is a big list, so it can take a while. You can close this window; it keeps going on your phone.</p>
        )}

        {/* Headline status */}
        <div className={cn(
          'rounded-xl border p-4 space-y-2',
          good ? 'bg-green-50 border-green-200' : bad ? 'bg-red-50 border-red-200' : 'bg-[#F8F5EE] border-[#D0A348]/50',
        )}>
          <div className={cn('flex items-center gap-2 font-semibold', good ? 'text-green-800' : bad ? 'text-red-800' : 'text-[#022d5c]')}>
            {!b ? <RefreshCw className="w-4 h-4 animate-spin" />
              : good ? <Check className="w-5 h-5" />
              : bad ? <AlertCircle className="w-5 h-5" />
              : b.status === 'paused' ? <Pause className="w-5 h-5" />
              : <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{b ? bridgeProgressText(b) : 'Getting ready...'}</span>
          </div>

          {b?.status === 'awaiting_phone_approval' && (
            <p className="text-xs text-[#022d5c]/80">
              Check {deviceName} and approve it there. Nothing is sent until you do.
              {showStartInfo && start!.fcm && !start!.fcm.sent && ' If you do not see it, open the Phone Bridge app on your phone.'}
            </p>
          )}
          {b?.status === 'paused' && (
            <p className="text-xs text-[#022d5c]/80">Resume it on your phone when you are ready.</p>
          )}
          {b?.status === 'completed_with_issues' && b.failed > 0 && (
            <p className="text-xs text-red-800/80">Your phone could not send to some people. You can text them one at a time.</p>
          )}

          {b && b.status !== 'awaiting_phone_approval' && sendable > 0 && (
            <div className="h-2 rounded-full bg-white/80 overflow-hidden border border-black/5">
              <div className={cn('h-full transition-all', bad ? 'bg-red-400' : 'bg-[#022d5c]')} style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        {/* Per-person status */}
        <div className="rounded-lg border border-gray-100 divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
          {recipients === null ? (
            <p className="p-3 text-sm text-gray-500">Loading people...</p>
          ) : recipients.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 p-2.5">
              <span className={cn('text-sm truncate', r.member_id ? 'text-[#022d5c] font-medium' : 'text-gray-500 italic')}>
                {recipientDisplayName(r)}
              </span>
              <div className="text-right shrink-0">
                <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', CHIP[r.status] || 'bg-gray-100 text-gray-600')}>
                  {r.status === 'queued' ? 'Waiting' : RECIPIENT_STATUS_LABEL[r.status]}
                </span>
                {r.status === 'skipped' && r.skip_reason && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{SKIP_REASON_LABEL[r.skip_reason]}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {confirmStop ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-2">
            <p>Stop this broadcast? Anyone not texted yet will not get it. Texts already sent stay sent.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmStop(false)} disabled={stopping}>Keep sending</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={stopSending} disabled={stopping}>
                {stopping ? 'Stopping...' : 'Stop sending'}
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="gap-2 sm:justify-between">
            {b && active ? (
              <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmStop(true)}>
                <Ban className="w-4 h-4 mr-1" /> Stop sending
              </Button>
            ) : <span />}
            <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90" onClick={onClose} disabled={stopping}>
              {active ? 'Close (keeps going on your phone)' : 'Close'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
