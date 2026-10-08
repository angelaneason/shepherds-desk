'use client'

// Inline "enter your password" step for Phone Bridge (shared by the 1:1
// Send from my phone button and the broadcast screen). Unlocks this browser
// for Phone Bridge (8 hours) through /api/bridge/unlock, then calls
// onUnlocked so the caller can retry what it was doing.

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** POST /api/bridge/unlock. Returns ok or a friendly message. */
export async function unlockBridge(password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const r = await fetch('/api/bridge/unlock', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, message: d.message || 'That password is not correct' }
    return { ok: true }
  } catch {
    return { ok: false, message: 'Could not reach the server. Check your connection.' }
  }
}

export function BridgeUnlockInline({
  onUnlocked,
  buttonLabel = 'Send',
  placeholder = 'Your password, to send from your phone',
  disabled = false,
  size = 'sm',
}: {
  onUnlocked: () => void | Promise<void>
  buttonLabel?: string
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!password || busy) return
    setBusy(true); setError('')
    const res = await unlockBridge(password)
    setBusy(false)
    if (!res.ok) { setError(res.message); return }
    setPassword('')
    await onUnlocked()
  }

  const small = size === 'sm'
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-[#D0A348] shrink-0" />
        <Input
          type="password" autoFocus placeholder={placeholder}
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && password) submit() }}
          className={small ? 'h-8 text-xs bg-white' : 'h-10 text-sm bg-white'}
        />
        <Button
          type="button" size="sm" onClick={submit} disabled={busy || disabled || !password}
          className={`bg-[#022d5c] text-white ${small ? 'text-xs' : 'text-sm h-10'}`}
        >
          {busy ? 'Checking...' : buttonLabel}
        </Button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
