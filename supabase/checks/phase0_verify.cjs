// Phase 0 data-layer verification (run AFTER migration 009).
//
// Exercises the exact Supabase calls the web Care page and mobile Ministry
// screen make, as real signed-in users under RLS, against temporary test
// accounts. Real pastors' data is only READ (for the 16/4/1 count check).
// All test accounts and their rows are deleted at the end, even on failure.
//
//   node supabase/checks/phase0_verify.cjs
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..', '..');
const { createClient } = require(path.join(root, 'node_modules/@supabase/supabase-js'));

const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const must = (res, what) => { if (res.error) throw new Error(`${what}: ${res.error.message}`); return res.data; };

const createdUsers = [];

async function makeUser(tag) {
  const email = `tsd-phase0-${tag}-${Date.now()}@example.com`;
  const password = 'T' + Math.random().toString(36).slice(2) + '!9x';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Phase0 Test ${tag}` } });
  if (error) throw new Error('createUser: ' + error.message);
  createdUsers.push(data.user.id);
  // Ensure a profile row exists (normally created by the signup trigger).
  const prof = await admin.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
  if (!prof.data) {
    const anyProfile = must(await admin.from('profiles').select('church_id, role').not('church_id', 'is', null).limit(1).single(), 'sample profile');
    must(await admin.from('profiles').insert({ id: data.user.id, email, full_name: `Phase0 Test ${tag}`, church_id: anyProfile.church_id, role: anyProfile.role }), 'insert profile');
  }
  const client = createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  must(await client.auth.signInWithPassword({ email, password }), 'sign in');
  return { id: data.user.id, client };
}

const visiblePeople = (people, { showArchived = false, filter = 'everyone' } = {}) =>
  people.filter(p => (showArchived || !p.archived_at) && (filter !== 'members' || p.is_member));

async function main() {
  // ── 0. Migration result on real data (read-only) ──────────────────────────
  const all = must(await admin.from('members').select('is_member, archived_at, status, phone, phone_e164, source'), 'read members');
  const starred = all.filter(m => m.is_member && !m.archived_at).length;
  const contacts = all.filter(m => !m.is_member && !m.archived_at).length;
  const archived = all.filter(m => m.archived_at).length;
  check('Migration counts: 16 ⭐ / 4 contacts / 1 archived', starred === 16 && contacts === 4 && archived === 1, `got ${starred} / ${contacts} / ${archived}`);
  check('Legacy status derived consistently', all.every(m => m.status === (m.archived_at ? 'inactive' : m.is_member ? 'active' : 'visitor')));
  check('Existing rows marked source=legacy', all.every(m => m.source === 'legacy'));
  const unparsed = all.filter(m => m.phone && !m.phone_e164).length;
  check('Phones normalized to E.164', unparsed === 0, unparsed ? `${unparsed} phone(s) could not be parsed (informational)` : '');

  // ── 1. Test accounts ──────────────────────────────────────────────────────
  const A = await makeUser('a');
  const B = await makeUser('b');
  const db = A.client;

  // ── 2. People load / Add (mobile fix #1: members table) ───────────────────
  const loadEmpty = await db.from('members').select('*').eq('profile_id', A.id).order('full_name');
  check('People load from members table', !loadEmpty.error && Array.isArray(loadEmpty.data), loadEmpty.error?.message);

  const jane = must(await db.from('members').insert([{ full_name: 'Jane Testperson', phone: '(555) 201-0001', email: 'jane@example.com', address: '1 Test St', notes: 'private note', is_member: false, do_not_text: false, profile_id: A.id, source: 'manual' }]).select().single(), 'add jane');
  check('Add person (unstarred contact)', jane && jane.is_member === false && !jane.archived_at, `status=${jane.status}`);
  check('Add derives legacy status + phone_e164', jane.status === 'visitor' && jane.phone_e164 === '+15552010001', `${jane.status} ${jane.phone_e164}`);

  const legacy = must(await db.from('members').insert([{ full_name: 'Legacy Client Add', status: 'active', profile_id: A.id }]).select().single(), 'legacy add');
  check('Old app versions sending status=active still get ⭐', legacy.is_member === true && legacy.status === 'active');

  // ── 3. Edit ───────────────────────────────────────────────────────────────
  const edited = must(await db.from('members').update({ full_name: 'Jane Doe', phone: '555-201-0002', email: 'jane@example.com', address: '1 Test St', notes: 'private note', is_member: false, do_not_text: false }).eq('id', jane.id).select().single(), 'edit');
  check('Edit person (name/phone) + updated_at', edited.full_name === 'Jane Doe' && edited.phone_e164 === '+15552010002' && edited.updated_at !== jane.updated_at);

  // ── 4. ⭐ toggle / Undo ─────────────────────────────────────────────────────
  const starredJ = must(await db.from('members').update({ is_member: true }).eq('id', jane.id).select().single(), 'star');
  check('⭐ toggle on', starredJ.is_member && starredJ.status === 'active' && !!starredJ.member_status_changed_at);
  const undoStar = must(await db.from('members').update({ is_member: false }).eq('id', jane.id).select().single(), 'unstar');
  check('⭐ Undo restores contact', undoStar.is_member === false && undoStar.status === 'visitor');
  must(await db.from('members').update({ is_member: true }).eq('id', jane.id), 're-star');

  // ── 5. Linked ministry records (prayer linking, care task, calendar) ─────
  const prayer = must(await db.from('prayer_requests').insert([{ profile_id: A.id, member_id: jane.id, person_name: 'Jane Doe', request: 'Healing', category: 'health', priority: 'normal', status: 'active' }]).select().single(), 'prayer link');
  check('Prayer request linked to person', prayer.member_id === jane.id);

  const task = must(await db.from('care_tasks').insert([{ profile_id: A.id, member_id: jane.id, task_type: 'call', description: 'Check in', status: 'pending', priority: 'normal', prayer_request_id: prayer.id }]).select().single(), 'task');
  const event = must(await db.from('calendar_events').insert([{ profile_id: A.id, title: 'Call Jane Doe', event_type: 'visit', start_time: new Date().toISOString(), all_day: false, care_task_id: task.id }]).select().single(), 'event');
  must(await db.from('care_tasks').update({ calendar_event_id: event.id }).eq('id', task.id), 'link event');

  // Mobile fix #2: Mark Done writes completed_date
  const now = new Date().toISOString();
  const done = await db.from('care_tasks').update({ status: 'completed', completed_date: now }).eq('id', task.id).select().single();
  check('Mark Done (completed_date) works', !done.error && done.data.status === 'completed' && !!done.data.completed_date, done.error?.message);
  const oldCol = await db.from('care_tasks').update({ completed_at: now }).eq('id', task.id);
  check('Old completed_at column really is invalid (confirms the bug)', !!oldCol.error);

  // ── 6. Archive / Restore / pickers ────────────────────────────────────────
  const arch = must(await db.from('members').update({ archived_at: new Date().toISOString() }).eq('id', jane.id).select().single(), 'archive');
  check('Archive keeps ⭐ and sets archived_by', arch.archived_at && arch.is_member === true && arch.archived_by === A.id && arch.status === 'inactive');
  const stillLinked = must(await db.from('care_tasks').select('id').eq('member_id', jane.id), 'links after archive');
  check('Archive keeps linked history attached', stillLinked.length === 1);

  const people = must(await db.from('members').select('*').eq('profile_id', A.id), 'reload');
  check('Pickers hide archived by default', !visiblePeople(people).some(p => p.id === jane.id));
  check('Pickers show archived with Show archived', visiblePeople(people, { showArchived: true }).some(p => p.id === jane.id));
  check('⭐ Members filter respects archive', !visiblePeople(people, { filter: 'members' }).some(p => p.id === jane.id) && visiblePeople(people, { filter: 'members', showArchived: true }).some(p => p.id === jane.id));

  const restored = must(await db.from('members').update({ archived_at: null }).eq('id', jane.id).select().single(), 'restore');
  check('Restore clears archive', !restored.archived_at && !restored.archived_by && restored.status === 'active');

  // ── 7. Do Not Text ─────────────────────────────────────────────────────────
  const dnt = must(await db.from('members').update({ do_not_text: true }).eq('id', jane.id).select().single(), 'dnt');
  check('Do Not Text saved with timestamp', dnt.do_not_text === true && !!dnt.do_not_text_updated_at);
  const canText = p => !!p && !!p.phone && !p.do_not_text;
  check('Do Not Text blocks texting (canText=false)', canText(dnt) === false);

  // ── 8. No cascading deletes ───────────────────────────────────────────────
  const direct = await db.from('members').delete().eq('id', jane.id);
  const janeStill = must(await db.from('members').select('id').eq('id', jane.id), 'jane exists');
  check('Direct DELETE of a person with history is refused', !!direct.error && janeStill.length === 1, direct.error?.message || 'delete was NOT refused');

  // ── 9. Link summary + isolation ───────────────────────────────────────────
  const summary = must(await db.rpc('person_link_summary', { p_member_id: jane.id }), 'summary');
  check('Link summary counts', summary.care_tasks === 1 && summary.prayer_requests === 1 && summary.calendar_events === 1, JSON.stringify(summary));
  const bSummary = await B.client.rpc('person_link_summary', { p_member_id: jane.id });
  const bDelete = await B.client.rpc('delete_person', { p_member_id: jane.id, p_history_mode: 'delete_all' });
  check("Another pastor cannot see or delete this person", !!bSummary.error && !!bDelete.error);
  const badMode = await db.rpc('delete_person', { p_member_id: jane.id, p_history_mode: 'cascade' });
  check('Invalid delete mode rejected', !!badMode.error);

  // ── 10. Delete — Keep linked history ──────────────────────────────────────
  const keepRes = must(await db.rpc('delete_person', { p_member_id: jane.id, p_history_mode: 'keep' }), 'delete keep');
  const tAfter = must(await db.from('care_tasks').select('*').eq('id', task.id), 'task after');
  const pAfter = must(await db.from('prayer_requests').select('*').eq('id', prayer.id), 'prayer after');
  const eAfter = must(await db.from('calendar_events').select('*').eq('id', event.id), 'event after');
  const mAfter = must(await db.from('members').select('id').eq('id', jane.id), 'member after');
  check('Keep: person record removed', mAfter.length === 0);
  check('Keep: care task NOT removed, snapshot = name', tAfter.length === 1 && tAfter[0].member_id === null && tAfter[0].member_name_snapshot === 'Jane Doe', JSON.stringify(keepRes));
  check('Keep: prayer request NOT removed, name kept', pAfter.length === 1 && pAfter[0].member_id === null && pAfter[0].person_name === 'Jane Doe');
  check('Keep: calendar event NOT removed', eAfter.length === 1);
  check('Keep: task↔prayer and task↔event links intact', tAfter[0]?.prayer_request_id === prayer.id && tAfter[0]?.calendar_event_id === event.id);
  const snapshotStr = JSON.stringify(tAfter[0] || {}) + JSON.stringify(pAfter[0] || {});
  check('Keep: no phone/email/address/notes copied into history', !/555|jane@example|1 Test St|private note/.test(snapshotStr));

  // ── 11. Delete — Delete everything ────────────────────────────────────────
  const bob = must(await db.from('members').insert([{ full_name: 'Bob Testperson', phone: '5552010003', profile_id: A.id, source: 'manual' }]).select().single(), 'bob');
  const bPrayer = must(await db.from('prayer_requests').insert([{ profile_id: A.id, member_id: bob.id, person_name: 'Bob Testperson', request: 'Job', category: 'other', priority: 'normal', status: 'active' }]).select().single(), 'bob prayer');
  const bTask = must(await db.from('care_tasks').insert([{ profile_id: A.id, member_id: bob.id, task_type: 'visit', description: 'Visit', status: 'pending', priority: 'normal' }]).select().single(), 'bob task');
  const bEvent = must(await db.from('calendar_events').insert([{ profile_id: A.id, title: 'Visit Bob', event_type: 'visit', start_time: new Date().toISOString(), all_day: false, care_task_id: bTask.id }]).select().single(), 'bob event');
  must(await db.from('care_tasks').update({ calendar_event_id: bEvent.id }).eq('id', bTask.id), 'bob link');
  // An unrelated task (no person) that references Bob's prayer must survive.
  const otherTask = must(await db.from('care_tasks').insert([{ profile_id: A.id, member_id: null, task_type: 'other', description: 'Unrelated follow-up', status: 'pending', priority: 'normal', prayer_request_id: bPrayer.id }]).select().single(), 'other task');

  const allRes = must(await db.rpc('delete_person', { p_member_id: bob.id, p_history_mode: 'delete_all' }), 'delete all');
  const gone = async (t, id) => must(await db.from(t).select('id').eq('id', id), t).length === 0;
  check('Delete everything: person, task, event, prayer removed',
    (await gone('members', bob.id)) && (await gone('care_tasks', bTask.id)) && (await gone('calendar_events', bEvent.id)) && (await gone('prayer_requests', bPrayer.id)),
    JSON.stringify(allRes));
  const other = must(await db.from('care_tasks').select('*').eq('id', otherTask.id), 'other after');
  check("Delete everything: unrelated records survive (link cleared only)", other.length === 1 && other[0].prayer_request_id === null);
  const janeTask = must(await db.from('care_tasks').select('id').eq('id', task.id), 'jane task still');
  check("Delete everything: other people's kept history untouched", janeTask.length === 1);
}

async function cleanup() {
  for (const uid of createdUsers) {
    const prof = await admin.from('profiles').select('church_id').eq('id', uid).maybeSingle();
    const churchId = prof.data?.church_id;
    // Only remove the church if no other profile uses it (signup trigger creates one per user).
    const sharers = churchId ? (await admin.from('profiles').select('id').eq('church_id', churchId)).data || [] : [];
    // Remove test rows explicitly (order respects FKs), then the account.
    await admin.from('calendar_events').update({ care_task_id: null }).eq('profile_id', uid);
    await admin.from('care_tasks').delete().eq('profile_id', uid);
    await admin.from('calendar_events').delete().eq('profile_id', uid);
    await admin.from('prayer_requests').delete().eq('profile_id', uid);
    await admin.from('members').delete().eq('profile_id', uid);
    await admin.from('profiles').delete().eq('id', uid);
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (churchId && sharers.length <= 1) {
      const c = await admin.from('churches').delete().eq('id', churchId);
      if (c.error) console.log(`cleanup WARNING church ${churchId}: ${c.error.message}`);
    }
    console.log(error ? `cleanup WARNING for ${uid}: ${error.message}` : `cleaned up test account ${uid}`);
  }
}

main()
  .catch(e => check('Script error', false, e.message))
  .finally(async () => {
    await cleanup();
    const failed = results.filter(r => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    fs.writeFileSync(path.join(__dirname, 'phase0_verify_results.json'), JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
    process.exit(failed.length ? 1 : 0);
  });
