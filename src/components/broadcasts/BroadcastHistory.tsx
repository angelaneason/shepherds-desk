'use client'

// Broadcast History (Phase 1): every saved broadcast, permanent until the
// pastor deletes it. Detail shows the exact text, time, and every included
// person with their final status. People deleted later show as
// "Jane Doe (deleted)" or "Deleted contact"; counts never change.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { History, Play, Copy, Trash, Archive, RefreshCw, MessageSquare, Smartphone, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Broadcast, type BroadcastRecipient,
  errorText, fetchBroadcasts, fetchRecipients, deleteBroadcast, recipientDisplayName,
  channelLabel, isBridgeActive,
  BROADCAST_STATUS_LABEL, RECIPIENT_STATUS_LABEL, SKIP_REASON_LABEL,
} from '@/lib/broadcasts'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const STATUS_CHIP: Record<string, string> = {
  opened: 'bg-green-100 text-green-800',
  sent: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  skipped: 'bg-amber-100 text-amber-800',
  not_opened: 'bg-gray-100 text-gray-600',
  queued: 'bg-gray-100 text-gray-600',
  sending: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

const canResume = (b: Broadcast) => b.channel === 'sms_handoff' && b.pending > 0 && (b.status === 'sending' || b.status === 'paused')

/** Summary counts. Handoff: opened/not opened. Phone Bridge: sent/delivered/failed. */
const countsLine = (b: Broadcast) => {
  const people = `${b.total} ${b.total === 1 ? 'person' : 'people'}`
  if (b.channel === 'bridge') {
    const parts = [`${b.sent} sent`]
    if (b.delivered > 0) parts.push(`${b.delivered} delivered`)
    if (b.failed > 0) parts.push(`${b.failed} failed`)
    parts.push(`${b.skipped} skipped`)
    if (b.pending > 0) parts.push(`${b.pending} waiting`)
    return `${people}: ${parts.join(' · ')}`
  }
  return `${people}: ${b.opened} opened · ${b.skipped} skipped${b.pending > 0 ? ` · ${b.pending} not opened` : ''}`
}

export default function BroadcastHistory({
  refreshKey, onResume, onReuse, onCountChange, onWatchBridge,
}: {
  refreshKey: number
  onResume: (broadcastId: string) => void
  onReuse: (body: string) => void
  onCountChange?: (n: number) => void
  /** Opens the live Phone Bridge status for an unfinished bridge broadcast. */
  onWatchBridge?: (broadcastId: string) => void
}) {
  const supabase = createClient()
  const [items, setItems] = useState<Broadcast[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Broadcast | null>(null)
  const [recipients, setRecipients] = useState<BroadcastRecipient[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setError(null)
    try {
      const rows = await fetchBroadcasts(supabase)
      setItems(rows)
      onCountChange?.(rows.length)
    } catch (e: unknown) {
      setError(errorText(e, 'Could not load broadcast history.'))
      setItems([])
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const openDetail = async (b: Broadcast) => {
    setOpen(b); setRecipients(null); setConfirmDelete(false)
    try {
      setRecipients(await fetchRecipients(supabase, b.id))
    } catch (e: unknown) {
      setError(errorText(e, 'Could not load recipients.'))
      setRecipients([])
    }
  }

  const handleDelete = async () => {
    if (!open) return
    setBusy(true)
    try {
      await deleteBroadcast(supabase, open.id)
      setOpen(null)
      await load()
    } catch (e: unknown) {
      setError(errorText(e, 'Delete failed.'))
    } finally {
      setBusy(false)
    }
  }

  if (items === null) return <div className="py-16 text-center text-[#022d5c]/50">Loading broadcast history...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#022d5c]/70">Every broadcast you send is saved here until you delete it.</p>
        <Button variant="ghost" size="sm" onClick={load} className="text-[#022d5c]/70">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white/50 border border-dashed border-[#022d5c]/20 rounded-xl p-8">
          <History className="w-12 h-12 text-[#022d5c]/30 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#022d5c]">No broadcasts yet</h3>
          <p className="text-sm text-[#022d5c]/60 max-w-sm mx-auto mt-1">
            When you send a text broadcast, it will be saved here with who received it.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(b => (
            <button
              key={b.id}
              onClick={() => openDetail(b)}
              className="w-full text-left bg-white rounded-xl border border-[#022d5c]/10 p-4 hover:border-[#D0A348] hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    {b.channel === 'bridge' && <Smartphone className="w-3 h-3 text-[#D0A348]" />}
                    {fmt(b.created_at)} · {channelLabel(b)}
                  </p>
                  <p className="text-sm text-[#022d5c] mt-1 line-clamp-2 whitespace-pre-wrap">{b.body}</p>
                </div>
                <span className={cn(
                  'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0',
                  b.status === 'completed' ? 'bg-green-100 text-green-800'
                    : canResume(b) || isBridgeActive(b) ? 'bg-amber-100 text-amber-800'
                    : b.status === 'completed_with_issues' ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-600',
                )}>
                  {BROADCAST_STATUS_LABEL[b.status]}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{countsLine(b)}</p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => { if (!o && !busy) setOpen(null) }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#022d5c] flex items-center gap-2">
                  {open.channel === 'bridge'
                    ? <Smartphone className="w-5 h-5 text-[#D0A348]" />
                    : <MessageSquare className="w-5 h-5 text-[#D0A348]" />} Broadcast
                </DialogTitle>
                <DialogDescription>
                  {fmt(open.created_at)} · {open.channel === 'bridge'
                    ? `Sent from my phone${open.device_label_snapshot ? ` (${open.device_label_snapshot})` : ''}`
                    : 'Sent individually from your messaging app'} · {BROADCAST_STATUS_LABEL[open.status]}
                </DialogDescription>
              </DialogHeader>

              <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-xs text-sm whitespace-pre-wrap leading-relaxed">
                {open.body}
              </div>

              <div className="text-xs text-gray-500">{countsLine(open)}</div>

              <div className="rounded-lg border border-gray-100 divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
                {recipients === null ? (
                  <p className="p-3 text-sm text-gray-500">Loading people…</p>
                ) : recipients.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-2.5">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className={cn('text-sm truncate', r.member_id ? 'text-[#022d5c] font-medium' : 'text-gray-500 italic')}>
                        {recipientDisplayName(r)}
                      </span>
                      {r.was_archived && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                          <Archive className="w-3 h-3" /> Archived
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', STATUS_CHIP[r.status] || 'bg-gray-100 text-gray-600')}>
                        {open.channel === 'bridge' && r.status === 'queued' ? 'Waiting' : RECIPIENT_STATUS_LABEL[r.status]}
                      </span>
                      {r.status === 'skipped' && r.skip_reason && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{SKIP_REASON_LABEL[r.skip_reason]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                {open.channel === 'bridge'
                  ? <>&quot;Sent&quot; means your phone sent the text. &quot;Delivered&quot; means the carrier confirmed it arrived.</>
                  : <>&quot;Opened&quot; means the text was opened in your messaging app. TSD can&apos;t see whether Send was tapped.</>}
              </p>

              {confirmDelete ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-2">
                  <p>Delete this saved broadcast and its list of recipients? This can&apos;t be undone. It does not affect anyone&apos;s profile.</p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancel</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={busy}>
                      {busy ? 'Deleting…' : 'Delete broadcast'}
                    </Button>
                  </div>
                </div>
              ) : (
                <DialogFooter className="gap-2 sm:justify-between">
                  {/* A Phone Bridge broadcast the phone is still working on can't be deleted; stop it first. */}
                  {isBridgeActive(open) ? <span /> : (
                    <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                      <Trash className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { onReuse(open.body); setOpen(null) }}>
                      <Copy className="w-4 h-4 mr-1" /> Use message again
                    </Button>
                    {canResume(open) && (
                      <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90" onClick={() => { const id = open.id; setOpen(null); onResume(id) }}>
                        <Play className="w-4 h-4 mr-1" /> Resume ({open.pending})
                      </Button>
                    )}
                    {isBridgeActive(open) && onWatchBridge && (
                      <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90" onClick={() => { const id = open.id; setOpen(null); onWatchBridge(id) }}>
                        <Eye className="w-4 h-4 mr-1" /> Show progress
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
