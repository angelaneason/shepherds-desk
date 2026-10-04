'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MessageSquareText, Plus, Pencil, Trash2, Star } from 'lucide-react'

export type ReferralTemplate = {
  id: string
  name: string
  subject: string | null
  body: string
  visibility: 'admin' | 'all'
  is_default: boolean
  owner_email: string | null
}

const EMPTY = {
  name: '',
  subject: '',
  body: '',
  visibility: 'all' as 'admin' | 'all',
  is_default: false,
  owner_email: '',
}

export default function ReferralTemplatesManager() {
  const [templates, setTemplates] = useState<ReferralTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/referral-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditingId(null)
    setForm(EMPTY)
    setOpen(true)
  }

  const openEdit = (t: ReferralTemplate) => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      subject: t.subject || '',
      body: t.body,
      visibility: t.visibility,
      is_default: t.is_default,
      owner_email: t.owner_email || '',
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.body.trim()) {
      alert('Please add a name and a message.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/referral-templates', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      })
      const data = await res.json()
      if (res.ok) {
        setOpen(false)
        load()
      } else {
        alert(data.error || 'Failed to save message')
      }
    } catch {
      alert('Error saving message')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: ReferralTemplate) => {
    if (!confirm(`Delete the saved message "${t.name}"?`)) return
    const res = await fetch(`/api/referral-templates?id=${t.id}`, { method: 'DELETE' })
    if (res.ok) setTemplates(prev => prev.filter(x => x.id !== t.id))
    else alert('Failed to delete message')
  }

  const preview = (text: string) =>
    text
      .replaceAll('{name}', 'Pastor John')
      .replaceAll('{link}', 'https://theshepherdsdesk.app/login?ref=ABC123')
      .replaceAll('{sender}', 'Bro. Tiny')

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-[#022d5c] flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-[#D0A348]" />
            Saved Referral Messages
          </CardTitle>
          <CardDescription className="mt-1">
            Ready-made invite messages pastors can pick on the &quot;Refer a Pastor&quot; screen.
            Use <code className="bg-gray-100 px-1 rounded">{'{name}'}</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">{'{link}'}</code> and{' '}
            <code className="bg-gray-100 px-1 rounded">{'{sender}'}</code> — they fill in automatically.
          </CardDescription>
        </div>
        <Button onClick={openNew} className="bg-[#022d5c] hover:bg-[#033a75] text-white shrink-0">
          <Plus className="w-4 h-4 mr-1" /> New Message
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed rounded-lg p-6 text-center">
            No saved messages yet. Click &quot;New Message&quot; to add one.
          </p>
        ) : (
          templates.map(t => (
            <div key={t.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{t.name}</span>
                    {t.is_default && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> Default
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.visibility === 'all' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {t.visibility === 'all' ? 'All pastors' : 'Admins only'}
                    </span>
                    {t.owner_email && (
                      <span className="text-xs text-gray-500">Default for {t.owner_email}</span>
                    )}
                  </div>
                  {t.subject && <p className="text-xs text-gray-500 mt-1">Subject: {t.subject}</p>}
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-4">{t.body}</p>
                </div>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(t)} title="Delete" className="text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#022d5c]">{editingId ? 'Edit Message' : 'New Referral Message'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">Name (only you see this)</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Short & friendly" />
            </div>
            <div>
              <label className="text-sm font-medium">Email subject (optional)</label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="You're invited to The Shepherd's Desk" />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                className="min-h-[160px]"
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder="Hi {name}! I've been using The Shepherd's Desk and thought of you: {link}"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm font-medium flex flex-col gap-1">
                Who can use it
                <select
                  className="border rounded-md px-2 py-2 text-sm bg-white font-normal"
                  value={form.visibility}
                  onChange={e => setForm({ ...form, visibility: e.target.value as 'admin' | 'all' })}
                >
                  <option value="all">All pastors</option>
                  <option value="admin">Admins only</option>
                </select>
              </label>
              <label className="text-sm font-medium flex flex-col gap-1">
                Default for one person (optional)
                <Input
                  value={form.owner_email}
                  onChange={e => setForm({ ...form, owner_email: e.target.value })}
                  placeholder="tinyneason@gmail.com"
                  className="font-normal"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} />
              Make this the default message for everyone
            </label>
            {form.body.trim() && (
              <div className="rounded-md bg-[#F8F5EE] border border-[#D0A348]/30 p-3">
                <p className="text-xs font-semibold text-[#8B6A27] mb-1">Preview</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{preview(form.body)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#022d5c] hover:bg-[#033a75] text-white">
              {saving ? 'Saving...' : 'Save Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
