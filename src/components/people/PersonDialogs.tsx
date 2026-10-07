'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Archive, ArchiveRestore, AlertTriangle, Ban, Star, Trash2, X } from 'lucide-react'
import {
  type Person, type PersonDraft, type PersonLinkSummary, type DeleteHistoryMode,
  emptyPersonDraft, personToDraft, draftToRow, fetchPersonLinkSummary, deletePerson,
} from '@/lib/people'

const errorMessage = (e: unknown, fallback: string): string => {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' && e.message) return e.message
  return fallback
}

// ─── ⭐ Member toggle ─────────────────────────────────────────────────────────

export function MemberStar({ isMember, onToggle, size = 'md', disabled }: {
  isMember: boolean
  onToggle?: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
}) {
  const px = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const label = isMember ? 'Church member (click to remove ⭐)' : 'Mark as church member'
  if (!onToggle) {
    return isMember ? <Star className={`${px} fill-[#D0A348] text-[#D0A348]`} aria-label="Church member" /> : null
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      title={label}
      aria-label={label}
      aria-pressed={isMember}
      className="p-1 rounded-full hover:bg-[#F8F5EE] transition-colors disabled:opacity-50"
    >
      <Star className={`${px} ${isMember ? 'fill-[#D0A348] text-[#D0A348]' : 'text-gray-300 hover:text-[#D0A348]'}`} />
    </button>
  )
}

export function ArchivedTag() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
      <Archive className="w-3 h-3" /> Archived
    </span>
  )
}

export function DoNotTextTag() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
      <Ban className="w-3 h-3" /> Do not text
    </span>
  )
}

// ─── Small undo toast ────────────────────────────────────────────────────────

export type ToastState = { message: string; onUndo?: () => void } | null

export function UndoToast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-[#022d5c] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
      <span>{toast.message}</span>
      {toast.onUndo && (
        <button
          type="button"
          className="font-semibold text-[#D0A348] hover:underline"
          onClick={() => { toast.onUndo?.(); onClose() }}
        >
          Undo
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={onClose} className="text-white/70 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Add / Edit person ───────────────────────────────────────────────────────

export function PersonFormDialog({
  open, onOpenChange, person, profileId, onSaved, onArchiveToggle, onDeleteRequest,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Omit to add a new person. */
  person?: Person | null
  profileId: string | null
  onSaved: (person: Person, isNew: boolean) => void
  onArchiveToggle?: (person: Person) => void
  onDeleteRequest?: (person: Person) => void
}) {
  const supabase = createClient()
  const isEdit = !!person
  const [draft, setDraft] = useState<PersonDraft>(emptyPersonDraft())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset the form whenever the dialog opens (or switches person) — done during
  // render rather than in an effect to avoid a cascading re-render.
  const openKey = open ? (person?.id ?? 'new') : null
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null)
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey)
    if (open) {
      setDraft(person ? personToDraft(person) : emptyPersonDraft())
      setError(null)
    }
  }

  const set = <K extends keyof PersonDraft>(k: K, v: PersonDraft[K]) => setDraft(d => ({ ...d, [k]: v }))

  const handleSave = async () => {
    if (!draft.full_name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const row = draftToRow(draft)
      if (isEdit && person) {
        const { data, error } = await supabase.from('members').update(row).eq('id', person.id).select().single()
        if (error) throw error
        onSaved(data as Person, false)
      } else {
        if (!profileId) throw new Error('Not signed in')
        const { data, error } = await supabase
          .from('members')
          .insert([{ ...row, profile_id: profileId, source: 'manual' }])
          .select()
          .single()
        if (error) throw error
        onSaved(data as Person, true)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      setError(errorMessage(err, 'Could not save. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Person' : 'Add Person'}</DialogTitle>
          {isEdit && person?.archived_at && (
            <DialogDescription className="flex items-center gap-2"><ArchivedTag /> Hidden from normal lists and pickers.</DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="person_name">Full Name *</Label>
            <Input id="person_name" value={draft.full_name} onChange={(e) => set('full_name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="person_phone">Phone</Label>
              <Input id="person_phone" type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="person_email">Email</Label>
              <Input id="person_email" type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="person_address">Address</Label>
            <Input id="person_address" value={draft.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="person_notes">Notes</Label>
            <Textarea id="person_notes" value={draft.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-[#D0A348]/40 bg-[#F8F5EE] cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#D0A348]"
              checked={draft.is_member}
              onChange={(e) => set('is_member', e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-semibold text-[#022d5c] flex items-center gap-1">
                <Star className="w-4 h-4 fill-[#D0A348] text-[#D0A348]" /> Church member
              </span>
              <span className="text-gray-600 text-xs">Leave unchecked for other people in your directory.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-red-600"
              checked={draft.do_not_text}
              onChange={(e) => set('do_not_text', e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-semibold text-gray-900">Do not text</span>
              <span className="block text-gray-600 text-xs">Shepherd&apos;s Desk will not start text messages to this person.</span>
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {isEdit && person && (onArchiveToggle || onDeleteRequest) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {onArchiveToggle && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { onOpenChange(false); onArchiveToggle(person) }}
              >
                {person.archived_at
                  ? <><ArchiveRestore className="w-4 h-4 mr-1" /> Restore</>
                  : <><Archive className="w-4 h-4 mr-1" /> Archive</>}
              </Button>
            )}
            {onDeleteRequest && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => { onOpenChange(false); onDeleteRequest(person) }}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete…
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!draft.full_name.trim() || saving} className="bg-[#022d5c] text-white">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Person'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete person (permanent) ───────────────────────────────────────────────

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function DeletePersonDialog({
  person, onClose, onArchiveInstead, onDeleted,
}: {
  person: Person | null
  onClose: () => void
  onArchiveInstead?: (person: Person) => void
  onDeleted: (personId: string, mode: DeleteHistoryMode) => void
}) {
  const supabase = createClient()
  const [summary, setSummary] = useState<PersonLinkSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<DeleteHistoryMode>('keep')
  const [step, setStep] = useState<'choose' | 'confirm_all'>('choose')
  const [understood, setUnderstood] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const personId = person?.id ?? null
  const [prevPersonId, setPrevPersonId] = useState<string | null>(null)
  if (personId !== prevPersonId) {
    setPrevPersonId(personId)
    setSummary(null); setLoadError(null); setMode('keep'); setStep('choose'); setUnderstood(false); setError(null)
  }

  useEffect(() => {
    if (!personId) return
    let cancelled = false
    fetchPersonLinkSummary(supabase, personId)
      .then((s) => { if (!cancelled) setSummary(s) })
      .catch((e: unknown) => { if (!cancelled) setLoadError(errorMessage(e, 'Could not load linked records.')) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId])

  if (!person) return null
  const firstName = person.full_name.split(' ')[0] || person.full_name
  const hasHistory = !!summary && (summary.care_tasks + summary.prayer_requests) > 0

  const runDelete = async () => {
    setBusy(true); setError(null)
    try {
      await deletePerson(supabase, person.id, mode)
      onDeleted(person.id, mode)
      onClose()
    } catch (e: unknown) {
      setError(errorMessage(e, 'Delete failed. Nothing was changed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!person} onOpenChange={(o) => { if (!o && !busy) onClose() }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        {step === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-700">Delete {person.full_name} permanently?</DialogTitle>
              <DialogDescription>
                Their profile, phone, email, address and notes will be removed. This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-gray-200 p-3 text-sm">
              <p className="font-semibold text-gray-900 mb-1">Linked history</p>
              {loadError ? (
                <p className="text-red-600">{loadError}</p>
              ) : !summary ? (
                <p className="text-gray-500">Checking linked records…</p>
              ) : (
                <ul className="text-gray-700 space-y-0.5">
                  <li>{plural(summary.care_tasks, 'care task')}{summary.care_tasks_open > 0 ? ` (${summary.care_tasks_open} open)` : ''}</li>
                  <li>{plural(summary.prayer_requests, 'prayer request')}</li>
                  {summary.calendar_events > 0 && <li>{plural(summary.calendar_events, 'calendar event')} created from their care tasks</li>}
                  <li>{summary.has_notes ? 'Profile notes (always removed with the person)' : 'No profile notes'}</li>
                </ul>
              )}
            </div>

            {hasHistory && (
              <div className="grid gap-2 text-sm">
                <label className="flex items-start gap-2 p-3 rounded-lg border border-[#022d5c]/30 bg-blue-50/40 cursor-pointer">
                  <input type="radio" name="delete_mode" className="mt-1" checked={mode === 'keep'} onChange={() => setMode('keep')} />
                  <span>
                    <span className="font-semibold text-gray-900">Keep linked history</span>
                    <span className="block text-gray-600 text-xs">
                      Care tasks and prayer requests stay, showing only the name &ldquo;{person.full_name} (deleted)&rdquo;. No phone, email, address or notes are kept.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 p-3 rounded-lg border border-red-200 cursor-pointer">
                  <input type="radio" name="delete_mode" className="mt-1" checked={mode === 'delete_all'} onChange={() => setMode('delete_all')} />
                  <span>
                    <span className="font-semibold text-red-700">Delete everything</span>
                    <span className="block text-gray-600 text-xs">
                      Also permanently delete {firstName}&apos;s care tasks, prayer requests and the calendar events created from those tasks.
                    </span>
                  </span>
                </label>
              </div>
            )}

            <p className="text-xs text-gray-500">Tip: Archive hides a person but keeps everything, and can be undone.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
              {onArchiveInstead && !person.archived_at && (
                <Button variant="outline" onClick={() => { onClose(); onArchiveInstead(person) }} disabled={busy}>
                  <Archive className="w-4 h-4 mr-1" /> Archive instead
                </Button>
              )}
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={busy || !summary}
                onClick={() => (mode === 'delete_all' ? setStep('confirm_all') : runDelete())}
              >
                {busy ? 'Deleting…' : mode === 'delete_all' ? 'Continue…' : 'Delete permanently'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> This will erase care and prayer records
              </DialogTitle>
              <DialogDescription>
                You are about to permanently delete {person.full_name} <strong>and</strong> all of their linked ministry history.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm text-red-900 space-y-1">
              <p className="font-semibold">The following will be permanently deleted:</p>
              <ul className="list-disc pl-5">
                <li>{plural(summary?.care_tasks || 0, 'care task')}</li>
                <li>{plural(summary?.prayer_requests || 0, 'prayer request')}</li>
                {(summary?.calendar_events || 0) > 0 && <li>{plural(summary!.calendar_events, 'calendar event')}</li>}
                <li>{firstName}&apos;s profile, phone, email, address and notes</li>
              </ul>
              <p className="pt-1">This cannot be undone and cannot be recovered.</p>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 accent-red-600" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
              <span>I understand this permanently erases {firstName}&apos;s care and prayer history.</span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('choose')} disabled={busy}>Back</Button>
              <Button className="bg-red-700 hover:bg-red-800 text-white" disabled={!understood || busy} onClick={runDelete}>
                {busy ? 'Deleting…' : 'Delete everything permanently'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
