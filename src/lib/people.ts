// People model helpers (Phase 0)
//
//   is_member   = ⭐ church member, or an ordinary contact (shown with no label)
//   archived_at = hidden from normal working lists/pickers (reversible)
//   do_not_text = TSD may not initiate texts to this person
//
// The legacy `status` column still exists in the database for backward
// compatibility, but it is derived by a trigger and must not be read or
// written by new UI.

import type { SupabaseClient } from '@supabase/supabase-js'

export type Person = {
  id: string
  profile_id: string
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_member: boolean
  archived_at: string | null
  do_not_text: boolean
  phone_e164?: string | null
  source?: string
  created_at: string
  updated_at?: string
}

export type PersonDraft = {
  full_name: string
  phone: string
  email: string
  address: string
  notes: string
  is_member: boolean
  do_not_text: boolean
}

export const emptyPersonDraft = (overrides: Partial<PersonDraft> = {}): PersonDraft => ({
  full_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  is_member: false,
  do_not_text: false,
  ...overrides,
})

export const personToDraft = (p: Person): PersonDraft => ({
  full_name: p.full_name || '',
  phone: p.phone || '',
  email: p.email || '',
  address: p.address || '',
  notes: p.notes || '',
  is_member: !!p.is_member,
  do_not_text: !!p.do_not_text,
})

/** Converts a form draft into a members row payload (empty strings → null). */
export const draftToRow = (d: PersonDraft) => ({
  full_name: d.full_name.trim(),
  phone: d.phone.trim() || null,
  email: d.email.trim() || null,
  address: d.address.trim() || null,
  notes: d.notes.trim() || null,
  is_member: d.is_member,
  do_not_text: d.do_not_text,
})

export const isArchived = (p: Pick<Person, 'archived_at'>) => !!p.archived_at

/** True when TSD is allowed to start a text to this person. */
export const canText = (p: Pick<Person, 'phone' | 'do_not_text'> | null | undefined) =>
  !!p && !!p.phone && !p.do_not_text

export type MemberFilter = 'everyone' | 'members'

/** People visible in normal lists and pickers. */
export const visiblePeople = <T extends Person>(people: T[], opts: { showArchived?: boolean; filter?: MemberFilter } = {}) =>
  people.filter(p => (opts.showArchived || !p.archived_at) && (opts.filter !== 'members' || p.is_member))

export const sortByName = <T extends { full_name: string }>(people: T[]) =>
  [...people].sort((a, b) => a.full_name.localeCompare(b.full_name))

export type PersonLinkSummary = {
  full_name: string
  care_tasks: number
  care_tasks_open: number
  calendar_events: number
  prayer_requests: number
  has_notes: boolean
  is_archived: boolean
}

export type DeleteHistoryMode = 'keep' | 'delete_all'

export async function fetchPersonLinkSummary(supabase: SupabaseClient, personId: string) {
  const { data, error } = await supabase.rpc('person_link_summary', { p_member_id: personId })
  if (error) throw error
  return data as PersonLinkSummary
}

export async function deletePerson(supabase: SupabaseClient, personId: string, mode: DeleteHistoryMode) {
  const { data, error } = await supabase.rpc('delete_person', { p_member_id: personId, p_history_mode: mode })
  if (error) throw error
  return data as { history_mode: DeleteHistoryMode; care_tasks: number; calendar_events: number; prayer_requests: number }
}

export async function setArchived(supabase: SupabaseClient, personId: string, archived: boolean) {
  const { data, error } = await supabase
    .from('members')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', personId)
    .select()
    .single()
  if (error) throw error
  return data as Person
}

export async function setMemberStar(supabase: SupabaseClient, personId: string, isMember: boolean) {
  const { data, error } = await supabase
    .from('members')
    .update({ is_member: isMember })
    .eq('id', personId)
    .select()
    .single()
  if (error) throw error
  return data as Person
}

/** Display name for a care task whose person may have been deleted. */
export const taskPersonName = (task: { members?: { full_name: string } | null; member_name_snapshot?: string | null }) =>
  task.members?.full_name || (task.member_name_snapshot ? `${task.member_name_snapshot} (deleted)` : null)
