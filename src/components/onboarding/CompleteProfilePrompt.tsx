'use client'

import { useEffect, useState } from 'react'
import { UserCircle, Loader2 } from 'lucide-react'

// Asks pastors who signed up without a name or phone to finish their profile,
// so invites and VIP gifts can be connected to their account.
export function CompleteProfilePrompt() {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [churchName, setChurchName] = useState('')
  const [invitedBy, setInvitedBy] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    try { if (sessionStorage.getItem('sd_profile_later') === '1') return } catch {}
    fetch('/api/profile/complete')
      .then(r => r.json())
      .then(d => {
        if (d?.needsProfile) {
          setFullName(d.fullName || '')
          setPhone(d.phone || '')
          setChurchName(d.churchName || '')
          setOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  const save = async () => {
    setError('')
    if (!fullName.trim()) { setError('Please enter your name.'); return }
    if (phone.replace(/\D/g, '').length < 10) { setError('Please enter your 10-digit mobile number.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/profile/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, churchName, invitedBy }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      setDone(true)
      setTimeout(() => { setOpen(false); window.location.reload() }, 1500)
    } catch (e: any) {
      setError(e.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const later = () => {
    try { sessionStorage.setItem('sd_profile_later', '1') } catch {}
    setOpen(false)
  }

  if (!open) return null

  const input = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#D0A348] focus:ring-1 focus:ring-[#D0A348]'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#022d5c] text-white px-5 py-4 flex items-center gap-3">
          <UserCircle className="w-6 h-6 text-[#D0A348]" />
          <div>
            <p className="font-semibold">Finish setting up your account</p>
            <p className="text-xs text-white/70">So we can connect any invite, gift, or VIP membership to you</p>
          </div>
        </div>
        {done ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-[#022d5c]">Thank you! ✅</p>
            <p className="text-sm text-gray-500 mt-1">Your profile is saved.</p>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600">Your Name *</label>
              <input className={input} placeholder="Pastor John Smith" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Mobile Phone *</label>
              <input className={input} type="tel" placeholder="(214) 555-1234" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Church Name</label>
              <input className={input} placeholder="Grace Fellowship" value={churchName} onChange={e => setChurchName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Who invited you? <span className="font-normal text-gray-400">(optional)</span></label>
              <input className={input} placeholder="e.g. Pastor Tiny, Sister Angie" value={invitedBy} onChange={e => setInvitedBy(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={later} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Later
              </button>
              <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#022d5c] text-white text-sm font-medium hover:bg-[#022d5c]/90 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
