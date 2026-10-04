'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Megaphone } from 'lucide-react'

const LINK_OPTIONS = [
  { value: '', label: 'Just open the app' },
  { value: 'Dashboard', label: 'Dashboard' },
  { value: 'Sermons', label: 'Sermons' },
  { value: 'Calendar', label: 'Calendar' },
  { value: 'Care', label: 'Pastoral Care' },
  { value: 'Study', label: 'Study' },
  { value: 'Referrals', label: 'Refer a Pastor' },
  { value: 'Settings', label: 'Settings' },
]

export default function BroadcastCard() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [counts, setCounts] = useState<{ totalUsers: number; phoneUsers: number } | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/broadcast')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setCounts({ totalUsers: d.totalUsers || 0, phoneUsers: d.phoneUsers || 0 }))
      .catch(() => {})
  }, [])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please add a title and a message.')
      return
    }
    const total = counts?.totalUsers ?? 0
    if (!confirm(`Send this message to all ${total} users?\n\n"${title.trim()}"\n${message.trim()}`)) return

    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), link: link || undefined })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult(`✅ Sent! ${data.notified ?? total} users will see it in their bell, ${data.pushed ?? 0} phone notifications delivered.`)
        setTitle('')
        setMessage('')
        setLink('')
      } else {
        alert(data.error || 'Failed to send broadcast')
      }
    } catch {
      alert('Error sending broadcast')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="border-[#D0A348]/40">
      <CardHeader>
        <CardTitle className="text-[#022d5c] flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#D0A348]" />
          Send a Message to All Users
        </CardTitle>
        <CardDescription>
          Shows up as a phone notification and in everyone&apos;s notification bell.
          {counts && (
            <> Reaches <strong>{counts.totalUsers}</strong> users ({counts.phoneUsers} with phone notifications on).</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Title (e.g. New feature: Voice notes!)"
          maxLength={80}
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="Your message..."
          maxLength={500}
          className="min-h-[100px]"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <label className="text-sm text-gray-600 flex items-center gap-2">
            When tapped, open:
            <select
              className="border rounded-md px-2 py-1.5 text-sm bg-white"
              value={link}
              onChange={e => setLink(e.target.value)}
            >
              {LINK_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{message.length}/500</span>
            <Button onClick={handleSend} disabled={sending} className="bg-[#022d5c] hover:bg-[#033a75] text-white">
              {sending ? 'Sending...' : 'Send to Everyone'}
            </Button>
          </div>
        </div>
        {result && <p className="text-sm text-green-700">{result}</p>}
      </CardContent>
    </Card>
  )
}
