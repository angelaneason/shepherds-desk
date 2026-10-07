'use client'

// One-person-at-a-time text handoff for a saved broadcast (Phase 1).
// Each "Open text" opens the pastor's messaging app with exactly ONE number,
// so recipients never see each other's numbers. Before each person, their
// current record is re-read so a number change or a new Do Not Text flag
// is respected even in the middle of a broadcast.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MessageSquare, SkipForward, CheckCircle2, ArrowRight, Archive } from 'lucide-react'
import {
  type Broadcast, type BroadcastRecipient,
  errorText, fetchBroadcast, fetchRecipients, markRecipient, setBroadcastStatus, personalize, singleSmsHref,
} from '@/lib/broadcasts'

type Fresh = { phone: string | null; phone_e164: string | null; do_not_text: boolean } | null

export default function HandoffRunner({ broadcastId, onClose }: { broadcastId: string | null; onClose: () => void }) {
  const supabase = createClient()
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [queue, setQueue] = useState<BroadcastRecipient[]>([])
  const [index, setIndex] = useState(0)
  const [openedCurrent, setOpenedCurrent] = useState(false)
  const [fresh, setFresh] = useState<Fresh | 'loading'>('loading')
  const [notice, setNotice] = useState<string | null>(null)
  const [counts, setCounts] = useState({ opened: 0, skipped: 0 })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Load the broadcast and everyone still waiting to be opened
  useEffect(() => {
    if (!broadcastId) return
    let cancelled = false
    setBroadcast(null); setQueue([]); setIndex(0); setOpenedCurrent(false); setNotice(null); setError(null)
    setCounts({ opened: 0, skipped: 0 })
    ;(async () => {
      try {
        const [b, recips] = await Promise.all([fetchBroadcast(supabase, broadcastId), fetchRecipients(supabase, broadcastId)])
        if (cancelled) return
        setBroadcast(b)
        setQueue(recips.filter(r => r.status === 'not_opened'))
        if (b.status === 'paused') await setBroadcastStatus(supabase, broadcastId, 'sending')
      } catch (e: unknown) {
        if (!cancelled) setError(errorText(e, 'Could not load this broadcast.'))
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId])

  const current = queue[index] || null
  const finished = !!broadcast && index >= queue.length

  // Re-read the current person's record right before their text
  useEffect(() => {
    if (!current) return
    let cancelled = false
    setFresh('loading'); setOpenedCurrent(false)
    ;(async () => {
      if (!current.member_id) { if (!cancelled) setFresh(null); return }
      const { data } = await supabase
        .from('members')
        .select('phone, phone_e164, do_not_text')
        .eq('id', current.member_id)
        .maybeSingle()
      if (!cancelled) setFresh((data as Fresh) || null)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  // Who can't be texted any more (changed since the broadcast was saved)
  const blockedReason = useMemo(() => {
    if (fresh === 'loading') return null
    if (!fresh) return 'no_phone' as const
    if (fresh.do_not_text) return 'do_not_text' as const
    if (!fresh.phone_e164 && !fresh.phone) return 'no_phone' as const
    return null
  }, [fresh])

  const name = current ? (current.members?.full_name || current.name_snapshot) : ''
  const message = broadcast && current ? personalize(broadcast.body, name) : ''
  const number = fresh && fresh !== 'loading' ? (fresh.phone_e164 || fresh.phone || '') : ''
  const href = number ? singleSmsHref(number, message) : '#'

  const advance = () => { setIndex(i => i + 1); setOpenedCurrent(false) }

  const handleOpened = async () => {
    if (!current || openedCurrent) return
    setOpenedCurrent(true)
    setNotice(null)
    try {
      await markRecipient(supabase, current.id, 'opened')
      setCounts(c => ({ ...c, opened: c.opened + 1 }))
    } catch (e: unknown) {
      setError(errorText(e, 'Could not save progress.'))
    }
  }

  const handleSkip = async (reason: 'user_skipped' | 'do_not_text' | 'no_phone' = 'user_skipped') => {
    if (!current) return
    setBusy(true)
    try {
      await markRecipient(supabase, current.id, 'skipped', reason)
      setCounts(c => ({ ...c, skipped: c.skipped + 1 }))
      if (reason !== 'user_skipped') {
        setNotice(`${name} was skipped: ${reason === 'do_not_text' ? 'now marked Do not text' : 'no phone number on file'}.`)
      } else {
        setNotice(null)
      }
      advance()
    } catch (e: unknown) {
      setError(errorText(e, 'Could not save progress.'))
    } finally {
      setBusy(false)
    }
  }

  const close = async () => {
    if (broadcastId && broadcast && !finished && queue.length - index > (openedCurrent ? 1 : 0)) {
      try { await setBroadcastStatus(supabase, broadcastId, 'paused') } catch { /* history still shows remaining */ }
    }
    onClose()
  }

  return (
    <Dialog open={!!broadcastId} onOpenChange={(o) => { if (!o) close() }}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#022d5c] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#D0A348]" />
            {finished ? 'All done' : 'Send individually'}
          </DialogTitle>
          <DialogDescription>
            {finished
              ? 'Everyone in this broadcast has been handled. It is saved in Broadcast History.'
              : 'Each person gets their own text. Open it, tap Send in your messaging app, then come back here for the next person.'}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!broadcast && !error && <p className="text-sm text-gray-500">Loading…</p>}

        {broadcast && !finished && current && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>{index + 1} of {queue.length}</span>
              <span>{counts.opened} opened · {counts.skipped} skipped</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-[#D0A348] transition-all" style={{ width: `${(index / Math.max(queue.length, 1)) * 100}%` }} />
            </div>

            <div className="rounded-xl border border-[#022d5c]/10 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-[#022d5c]">{name}</p>
                {current.was_archived && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    <Archive className="w-3 h-3" /> Archived
                  </span>
                )}
              </div>
              <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-xs text-sm whitespace-pre-wrap leading-relaxed">
                {message}
              </div>
            </div>

            {notice && <p className="text-xs text-amber-700 bg-amber-50 rounded-md p-2">{notice}</p>}

            {fresh === 'loading' ? (
              <p className="text-sm text-gray-500">Checking {name.split(' ')[0]}&apos;s number…</p>
            ) : blockedReason ? (
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 space-y-2">
                <p>
                  {blockedReason === 'do_not_text'
                    ? `${name} is now marked Do not text, so TSD won't open a text to them.`
                    : `${name} no longer has a phone number on file.`}
                </p>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSkip(blockedReason)}>
                  Skip and continue
                </Button>
              </div>
            ) : !openedCurrent ? (
              <div className="flex gap-2">
                <a
                  href={href}
                  onClick={handleOpened}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#022d5c] hover:bg-[#022d5c]/90 text-white font-semibold text-sm"
                >
                  <MessageSquare className="w-4 h-4 text-[#D0A348]" /> Open text to {name.split(' ')[0]}
                </a>
                <Button variant="outline" className="h-11 rounded-xl" disabled={busy} onClick={() => handleSkip()}>
                  <SkipForward className="w-4 h-4 mr-1" /> Skip
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Opened in your messaging app. Tap Send there, then continue.
                </p>
                <div className="flex gap-2">
                  <Button className="flex-1 h-11 rounded-xl bg-[#D0A348] hover:bg-[#D0A348]/90 text-white font-semibold" onClick={advance}>
                    {index + 1 < queue.length ? <>Next person <ArrowRight className="w-4 h-4 ml-1" /></> : 'Finish'}
                  </Button>
                  <a href={href} className="inline-flex items-center px-3 text-xs text-[#022d5c] underline">Open again</a>
                </div>
              </div>
            )}
          </div>
        )}

        {broadcast && finished && (
          <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-900">
            <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Finished</p>
            <p className="mt-1">
              {queue.length === 0
                ? 'There was nobody left to text in this broadcast.'
                : `${counts.opened} opened, ${counts.skipped} skipped this session.`}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {finished ? 'Close' : 'Stop for now'}
          </Button>
        </DialogFooter>
        {!finished && broadcast && (
          <p className="text-[11px] text-gray-400 -mt-2">
            Stopping saves your place. Resume any time from Broadcast History.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
