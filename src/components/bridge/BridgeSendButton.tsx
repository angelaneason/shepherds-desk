'use client'

// "Send from my phone" for one person (Phase 5).
// Shows only when a Phone Bridge phone is connected. Sends through
// /api/bridge/send, asks for the password once per browser (8 hours) if
// needed, then shows live status until the phone reports the result.
// When no phone is connected, nothing renders and the normal sms: button is used.

import { useEffect, useRef, useState } from 'react'
import { Smartphone, Check, AlertCircle, Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

type Device = { id: string; display_name: string }
type JobStatus = 'queued' | 'awaiting_approval' | 'sending' | 'sent' | 'delivered' | 'failed' | 'expired' | 'rejected' | 'cancelled'

const STATUS_TEXT: Record<JobStatus, string> = {
  queued: 'Sent to your phone. Waiting for it to pick up...',
  awaiting_approval: 'Waiting for you to approve it on your phone.',
  sending: 'Your phone is sending it...',
  sent: 'Sent from your phone.',
  delivered: 'Delivered.',
  failed: 'Your phone could not send it.',
  expired: 'Not sent: it was not approved in time.',
  rejected: 'Not sent: you chose not to send it on your phone.',
  cancelled: 'Not sent: the phone was disconnected.',
}
const FINAL: JobStatus[] = ['delivered', 'failed', 'expired', 'rejected', 'cancelled']

export function useBridgeDevice(enabled: boolean) {
  const [device, setDevice] = useState<Device | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    fetch('/api/bridge/device', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive) setDevice(d?.device || null) })
      .catch(() => {})
    return () => { alive = false }
  }, [enabled])
  return device
}

export function BridgeSendButton({
  device, memberId, message, onSent,
}: {
  device: Device
  memberId: string
  message: string
  onSent?: () => void
}) {
  const supabase = useRef(createClient()).current
  const [busy, setBusy] = useState(false)
  const [needUnlock, setNeedUnlock] = useState(false)
  const [password, setPassword] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [error, setError] = useState('')
  const sendingRef = useRef(false)

  // Poll the job status (owner can read their own jobs) until final.
  useEffect(() => {
    if (!jobId) return
    let stop = false
    const tick = async () => {
      const { data } = await supabase.from('bridge_send_jobs').select('status').eq('id', jobId).maybeSingle()
      if (stop || !data) return
      const s = data.status as JobStatus
      setStatus(s)
      if (s === 'sent' || s === 'delivered') onSent?.()
    }
    tick()
    const t = setInterval(() => { if (!status || !FINAL.includes(status)) tick() }, 2500)
    return () => { stop = true; clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, status])

  const send = async () => {
    if (sendingRef.current) return
    sendingRef.current = true
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/bridge/send', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, body: message }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.status === 403 && d.error === 'bridge_locked') { setNeedUnlock(true); return }
      if (!r.ok) { setError(d.message || 'Could not send through your phone.'); return }
      setJobId(d.job_id)
      setStatus('queued')
    } finally {
      sendingRef.current = false
      setBusy(false)
    }
  }

  const unlockAndSend = async () => {
    setBusy(true); setError('')
    const r = await fetch('/api/bridge/unlock', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setError(d.message || 'That password is not correct'); return }
    setPassword(''); setNeedUnlock(false)
    await send()
  }

  if (status) {
    const good = status === 'sent' || status === 'delivered'
    const bad = ['failed', 'expired', 'rejected', 'cancelled'].includes(status)
    return (
      <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${good ? 'bg-green-50 border-green-200 text-green-800' : bad ? 'bg-red-50 border-red-200 text-red-800' : 'bg-[#F8F5EE] border-[#D0A348]/50 text-[#022d5c]'}`}>
        {good ? <Check className="w-4 h-4" /> : bad ? <AlertCircle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" />}
        <span>{STATUS_TEXT[status]}</span>
        {bad && (
          <button type="button" className="underline ml-1" onClick={() => { setStatus(null); setJobId(null) }}>Try again</button>
        )}
      </div>
    )
  }

  if (needUnlock) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#D0A348] shrink-0" />
          <Input
            type="password" autoFocus placeholder="Your password, to send from your phone"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && password) unlockAndSend() }}
            className="h-8 text-xs bg-white"
          />
          <Button type="button" size="sm" onClick={unlockAndSend} disabled={busy || !password} className="bg-[#022d5c] text-white text-xs">
            Send
          </Button>
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button" size="sm" onClick={send} disabled={busy || !message.trim()}
        className="bg-[#022d5c] hover:bg-[#022d5c]/90 text-white font-semibold text-xs shadow-sm"
        title="Your phone sends this text from your number"
      >
        <Smartphone className="w-3.5 h-3.5 mr-1.5 text-[#D0A348]" />
        {busy ? 'Sending...' : `Send from ${device.display_name}`}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
