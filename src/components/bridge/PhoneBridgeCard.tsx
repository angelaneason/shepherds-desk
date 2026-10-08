'use client'

// Settings > Phone Bridge (Phase 4/5 web side).
// Connect a phone with a QR code, see the connected phone, disconnect it.
// Anything that can make a phone send a text needs a fresh password check
// on this browser first ("bridge unlock", 8 hours).

import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Smartphone, Lock, CheckCircle2, RefreshCw, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Device = {
  id: string
  display_name: string
  model: string | null
  status: string
  last_seen_at: string | null
  created_at: string
}

type Pairing = { code: string; qr_payload: string; expires_at: string }

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string; message?: string } }> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, credentials: 'same-origin' })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

const timeAgo = (iso: string | null) => {
  if (!iso) return 'never'
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 90) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} hr ago`
  return new Date(iso).toLocaleDateString()
}

export function PhoneBridgeCard({ className = '' }: { className?: string }) {
  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<Device | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pairing, setPairing] = useState<Pairing | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const refresh = useCallback(async () => {
    const [d, u] = await Promise.all([
      api<{ device: Device | null }>('/api/bridge/device'),
      api<{ unlocked: boolean }>('/api/bridge/unlock'),
    ])
    if (d.ok) setDevice(d.data.device)
    if (u.ok) setUnlocked(!!u.data.unlocked)
    setLoading(false)
    return d.ok ? d.data.device : null
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // While a code is showing: count down and watch for the phone to connect.
  useEffect(() => {
    if (!pairing) return
    const startedWith = device?.id
    const tick = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((new Date(pairing.expires_at).getTime() - Date.now()) / 1000)))
    }, 1000)
    const poll = setInterval(async () => {
      const d = await refresh()
      if (d && d.id !== startedWith) setPairing(null)
    }, 3000)
    return () => { clearInterval(tick); clearInterval(poll) }
  }, [pairing, device?.id, refresh])

  const unlock = async () => {
    setBusy(true); setError('')
    const r = await api('/api/bridge/unlock', { method: 'POST', body: JSON.stringify({ password }) })
    setBusy(false)
    if (!r.ok) { setError(r.data.message || 'Could not unlock'); return }
    setPassword('')
    setUnlocked(true)
  }

  const startPairing = async () => {
    setBusy(true); setError('')
    const r = await api<Pairing>('/api/bridge/pair/code', { method: 'POST' })
    setBusy(false)
    if (r.status === 403) { setUnlocked(false); return }
    if (!r.ok) { setError(r.data.message || 'Could not create a code'); return }
    setPairing(r.data)
    setSecondsLeft(Math.round((new Date(r.data.expires_at).getTime() - Date.now()) / 1000))
  }

  const disconnect = async () => {
    if (!device) return
    if (!confirm(`Disconnect ${device.display_name}? Texts from the website will open on this computer instead until you connect a phone again.`)) return
    setBusy(true); setError('')
    const r = await api('/api/bridge/device/revoke', { method: 'POST', body: JSON.stringify({ device_id: device.id }) })
    setBusy(false)
    if (r.status === 403) { setUnlocked(false); return }
    if (!r.ok) { setError(r.data.message || 'Could not disconnect'); return }
    setDevice(null)
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> Phone Bridge</CardTitle>
        <CardDescription>
          Send texts from this website through your own Android phone and number. Your phone asks before texting someone new.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            {device ? (
              <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{device.display_name}</p>
                    <p className="text-xs text-gray-600">
                      Connected{device.model ? ` · ${device.model}` : ''} · last checked in {timeAgo(device.last_seen_at)}
                    </p>
                  </div>
                </div>
                {unlocked && (
                  <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>
                    <Unplug className="w-4 h-4 mr-1" /> Disconnect
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No phone connected yet.</p>
            )}

            {!unlocked ? (
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#D0A348]" />
                  For your safety, enter your password to {device ? 'manage your phone' : 'connect a phone'}.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Label htmlFor="bridge-password" className="sr-only">Password</Label>
                    <Input
                      id="bridge-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Your Shepherd's Desk password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && password) unlock() }}
                    />
                  </div>
                  <Button onClick={unlock} disabled={busy || !password} className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
                    Unlock
                  </Button>
                </div>
              </div>
            ) : pairing ? (
              <div className="p-4 rounded-xl border border-[#D0A348]/60 bg-[#F8F5EE] flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-white p-3 rounded-lg border border-gray-200 shrink-0">
                  <QRCodeSVG value={pairing.qr_payload} size={168} fgColor="#022d5c" />
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">Scan this with the Phone Bridge app</p>
                  <p>1. Open <strong>Shepherd&apos;s Desk Phone Bridge</strong> on your Android phone.</p>
                  <p>2. Tap <strong>Connect</strong> and scan this code.</p>
                  <p>Or type this code: <span className="font-mono font-bold tracking-widest text-[#022d5c]">{pairing.code.slice(0, 4)} {pairing.code.slice(4)}</span></p>
                  <p className="text-xs text-gray-500">
                    {secondsLeft > 0 ? `Code works for ${fmt(secondsLeft)}` : 'This code expired.'}
                  </p>
                  {secondsLeft === 0 && (
                    <Button size="sm" variant="outline" onClick={startPairing} disabled={busy}>
                      <RefreshCw className="w-4 h-4 mr-1" /> New code
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Button onClick={startPairing} disabled={busy} className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
                <Smartphone className="w-4 h-4 mr-2 text-[#D0A348]" />
                {device ? 'Connect a different phone' : 'Connect my phone'}
              </Button>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-gray-500">
              Only one phone can be connected at a time. iPhones cannot send texts this way, so on iPhone the website keeps opening your Messages app instead.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
