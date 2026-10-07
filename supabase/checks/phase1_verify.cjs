// Phase 1 data-layer verification (run AFTER migration 010).
//
// Exercises the exact Supabase calls the Communication page makes (web and
// mobile) as real signed-in users under RLS, against temporary test accounts.
// Real pastors' data is never touched. Test accounts and rows are deleted at
// the end, even on failure.
//
//   node supabase/checks/phase1_verify.cjs
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
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`); };
const must = (res, what) => { if (res.error) throw new Error(`${what}: ${res.error.message}`); return res.data; };

const createdUsers = [];

async function makeUser(tag) {
  const email = `tsd-phase1-${tag}-${Date.now()}@example.com`;
  const password = 'T' + Math.random().toString(36).slice(2) + '!9x';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Phase1 Test ${tag}` } });
  if (error) throw new Error('createUser: ' + error.message);
  createdUsers.push(data.user.id);
  const prof = await admin.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
  if (!prof.data) {
    const anyProfile = must(await admin.from('profiles').select('church_id, role').not('church_id', 'is', null).limit(1).single(), 'sample profile');
    must(await admin.from('profiles').insert({ id: data.user.id, email, full_name: `Phase1 Test ${tag}`, church_id: anyProfile.church_id, role: anyProfile.role }), 'insert profile');
  }
  const client = createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  must(await client.auth.signInWithPassword({ email, password }), 'sign in');
  return { id: data.user.id, client };
}

const RECIP_SELECT = 'id, broadcast_id, member_id, name_snapshot, was_archived, position, status, skip_reason, opened_at, to_e164, members(id, full_name, phone, phone_e164, do_not_text, archived_at)';

async function main() {
  // ── 0. Tables exist ───────────────────────────────────────────────────────
  const probe = await admin.from('broadcasts').select('id').limit(1);
  check('broadcasts table exists (migration 010 applied)', !probe.error, probe.error?.message);
  if (probe.error) return;

  const A = await makeUser('a');
  const B = await makeUser('b');
  const db = A.client;

  // ── 1. People for the picker (members table, People model) ────────────────
  const add = async (row) => must(await db.from('members').insert([{ profile_id: A.id, source: 'manual', ...row }]).select().single(), 'add ' + row.full_name);
  const amy   = await add({ full_name: 'Amy Star',      phone: '555-301-0001', is_member: true });
  const ben   = await add({ full_name: 'Ben Contact',   phone: '555-301-0002', is_member: false });
  const cara  = await add({ full_name: 'Cara NoText',   phone: '555-301-0003', is_member: true, do_not_text: true });
  const dan   = await add({ full_name: 'Dan Archived',  phone: '555-301-0004', is_member: true });
  must(await db.from('members').update({ archived_at: new Date().toISOString() }).eq('id', dan.id), 'archive dan');
  const eve   = await add({ full_name: 'Eve Samephone', phone: '(555) 301-0001', is_member: true });   // same number as Amy
  const fay   = await add({ full_name: 'Fay Nophone',   phone: null, is_member: true });
  const gus   = await add({ full_name: 'Gus Badphone',  phone: '12', is_member: true });

  const picker = must(await db.from('members').select('id, full_name, phone, phone_e164, is_member, archived_at, do_not_text').eq('profile_id', A.id).order('full_name'), 'picker load');
  check('Picker loads from members (not church_members)', picker.length === 7);
  const legacy = await db.from('church_members').select('id').limit(1);
  check('church_members really does not exist (old screens were broken)', !!legacy.error);

  // Default selection rule used by the apps: ⭐, not archived, not Do Not Text, has phone
  const defaults = picker.filter(m => m.phone && m.is_member && !m.archived_at && !m.do_not_text).map(m => m.full_name).sort();
  check('Default selection = textable ⭐ members only', JSON.stringify(defaults) === JSON.stringify(['Amy Star', 'Eve Samephone', 'Gus Badphone']), defaults.join(', '));

  // ── 2. create_broadcast: server-side filtering ───────────────────────────
  // Send to everyone, including a Do Not Text person and someone else's person,
  // as a modified client could.
  const otherPerson = must(await B.client.from('members').insert([{ profile_id: B.id, full_name: 'Other Pastor Person', phone: '555-399-0001', is_member: true }]).select().single(), 'B person');
  const body = 'Hi {first_name}, service is at 10. See you Sunday!';
  const ids = [amy.id, ben.id, cara.id, dan.id, eve.id, fay.id, gus.id, otherPerson.id];
  const bid = must(await db.rpc('create_broadcast', { p_body: body, p_member_ids: ids }), 'create_broadcast');
  check('create_broadcast returns an id', typeof bid === 'string');

  let b = must(await db.from('broadcasts').select('*').eq('id', bid).single(), 'load broadcast');
  check('Broadcast saved as individual handoff, in progress', b.channel === 'sms_handoff' && b.status === 'sending' && !!b.started_at, `${b.channel}/${b.status}`);
  check('Broadcast body saved exactly', b.body === body);

  let recips = must(await db.from('broadcast_recipients').select(RECIP_SELECT).eq('broadcast_id', bid).order('position'), 'recipients');
  const byName = Object.fromEntries(recips.map(r => [r.name_snapshot, r]));
  check("Other pastor's person is ignored (RLS / ownership)", !byName['Other Pastor Person'] && recips.length === 7, `${recips.length} rows`);
  check('Do Not Text skipped by server', byName['Cara NoText']?.status === 'skipped' && byName['Cara NoText']?.skip_reason === 'do_not_text');
  check('No phone skipped', byName['Fay Nophone']?.skip_reason === 'no_phone');
  check('Invalid phone skipped', byName['Gus Badphone']?.skip_reason === 'invalid_phone');
  const dup = [byName['Amy Star'], byName['Eve Samephone']];
  check('Duplicate number: first kept, second skipped', dup[0]?.status === 'not_opened' && dup[1]?.skip_reason === 'duplicate_number');
  check('Archived person included on purpose is tagged was_archived', byName['Dan Archived']?.was_archived === true && byName['Dan Archived']?.status === 'not_opened');
  check('Contact (no star) included normally', byName['Ben Contact']?.status === 'not_opened');
  check('No phone number copied for handoff recipients', recips.every(r => r.to_e164 === null));
  check('Sendable people come first in position order', recips.slice(0, 3).every(r => r.status === 'not_opened'));
  check('Counts: total 7, pending 3, skipped 4', b.total === 7 && b.pending === 3 && b.skipped === 4, `${b.total}/${b.pending}/${b.skipped}`);

  // ── 3. Step-through: open / skip / pause / resume ────────────────────────
  const queue = recips.filter(r => r.status === 'not_opened');
  must(await db.from('broadcast_recipients').update({ status: 'opened', skip_reason: null }).eq('id', queue[0].id), 'open 1');
  b = must(await db.from('broadcasts').select('*').eq('id', bid).single(), 'reload');
  const r0 = must(await db.from('broadcast_recipients').select('opened_at').eq('id', queue[0].id).single(), 'r0');
  check('Open text marks Opened + timestamp, counts update', b.opened === 1 && b.pending === 2 && !!r0.opened_at);

  must(await db.from('broadcasts').update({ status: 'paused' }).eq('id', bid).in('status', ['sending', 'paused']), 'pause');
  b = must(await db.from('broadcasts').select('status').eq('id', bid).single(), 'paused?');
  check('Stop for now pauses the broadcast', b.status === 'paused');

  must(await db.from('broadcasts').update({ status: 'sending' }).eq('id', bid).in('status', ['sending', 'paused']), 'resume');
  must(await db.from('broadcast_recipients').update({ status: 'skipped', skip_reason: 'user_skipped' }).eq('id', queue[1].id), 'skip 2');
  b = must(await db.from('broadcasts').select('*').eq('id', bid).single(), 'reload2');
  check('Skip marks Skipped (user) and broadcast still in progress', b.skipped === 5 && b.pending === 1 && b.status === 'sending');

  must(await db.from('broadcast_recipients').update({ status: 'opened', skip_reason: null }).eq('id', queue[2].id), 'open 3');
  b = must(await db.from('broadcasts').select('*').eq('id', bid).single(), 'reload3');
  check('Last person handled: broadcast auto-completes', b.status === 'completed' && !!b.completed_at && b.pending === 0 && b.opened === 2, `${b.status}`);

  // ── 4. History list + RLS isolation ──────────────────────────────────────
  const hist = must(await db.from('broadcasts').select('*').order('created_at', { ascending: false }), 'history');
  check('History lists the broadcast', hist.some(h => h.id === bid));
  const bSees = must(await B.client.from('broadcasts').select('id').eq('id', bid), 'B history');
  const bSeesR = must(await B.client.from('broadcast_recipients').select('id').eq('broadcast_id', bid), 'B recips');
  check("Another pastor can't see this broadcast or its recipients", bSees.length === 0 && bSeesR.length === 0);
  const bTamper = await B.client.from('broadcast_recipients').update({ status: 'opened' }).eq('broadcast_id', bid).select();
  check("Another pastor can't change recipients", !bTamper.error && (bTamper.data || []).length === 0);
  const bInject = await B.client.from('broadcast_recipients').insert([{ broadcast_id: bid, profile_id: B.id, name_snapshot: 'Injected' }]);
  check("Another pastor can't add recipients to it", !!bInject.error);

  // ── 5. Do Not Text flagged mid-broadcast is respected at open time ──────
  const bid2 = must(await db.rpc('create_broadcast', { p_body: 'Prayer meeting tonight at 7.', p_member_ids: [amy.id, ben.id] }), 'bc2');
  must(await db.from('members').update({ do_not_text: true }).eq('id', ben.id), 'flag ben');
  const benRow = must(await db.from('broadcast_recipients').select(RECIP_SELECT).eq('broadcast_id', bid2).eq('member_id', ben.id).single(), 'ben row');
  check('Fresh person record shows Do Not Text at open time', benRow.members?.do_not_text === true);
  must(await db.from('members').update({ do_not_text: false }).eq('id', ben.id), 'unflag ben');

  // ── 6. Delete person: history is kept, counts never change ──────────────
  const sumAmy = must(await db.rpc('person_link_summary', { p_member_id: amy.id }), 'summary amy');
  check('person_link_summary counts broadcasts', sumAmy.broadcasts === 2, JSON.stringify(sumAmy));

  const keepRes = must(await db.rpc('delete_person', { p_member_id: amy.id, p_history_mode: 'keep' }), 'delete amy keep');
  const amyRows = must(await db.from('broadcast_recipients').select('member_id, name_snapshot, status').eq('name_snapshot', 'Amy Star'), 'amy rows');
  check('Keep history: recipient rows kept with name snapshot, unlinked', amyRows.length === 2 && amyRows.every(r => r.member_id === null), JSON.stringify(keepRes));
  const b1 = must(await db.from('broadcasts').select('total, opened').eq('id', bid).single(), 'counts after keep');
  check('Keep history: broadcast counts unchanged', b1.total === 7 && b1.opened === 2);

  must(await db.rpc('delete_person', { p_member_id: dan.id, p_history_mode: 'delete_all' }), 'delete dan all');
  const danRows = must(await db.from('broadcast_recipients').select('member_id, name_snapshot, was_archived').eq('broadcast_id', bid).is('member_id', null), 'dan rows');
  check('Delete everything: row kept as "Deleted contact", Archived tag kept', danRows.some(r => r.name_snapshot === 'Deleted contact' && r.was_archived === true));
  const b2 = must(await db.from('broadcasts').select('total').eq('id', bid).single(), 'counts after delete_all');
  check('Delete everything: broadcast counts unchanged', b2.total === 7);
  const directDel = await db.from('members').delete().eq('id', ben.id);
  check('Direct delete of a person in a broadcast is refused (NO ACTION)', !!directDel.error, directDel.error?.message);

  // ── 7. Delete a saved broadcast ─────────────────────────────────────────
  must(await db.from('broadcasts').delete().eq('id', bid2), 'delete bc2');
  const leftovers = must(await db.from('broadcast_recipients').select('id').eq('broadcast_id', bid2), 'bc2 recips');
  const benStill = must(await db.from('members').select('id').eq('id', ben.id), 'ben still');
  check('Deleting a broadcast removes its recipient list but no people', leftovers.length === 0 && benStill.length === 1);

  // ── 8. Validation ───────────────────────────────────────────────────────
  const empty = await db.rpc('create_broadcast', { p_body: '   ', p_member_ids: [ben.id] });
  const none = await db.rpc('create_broadcast', { p_body: 'Hello', p_member_ids: [] });
  const notMine = await db.rpc('create_broadcast', { p_body: 'Hello', p_member_ids: [otherPerson.id] });
  check('Rejects empty message, no recipients, and only-other-pastor people', !!empty.error && !!none.error && !!notMine.error);
}

async function cleanup() {
  for (const uid of createdUsers) {
    const prof = await admin.from('profiles').select('church_id').eq('id', uid).maybeSingle();
    const churchId = prof.data?.church_id;
    const sharers = churchId ? (await admin.from('profiles').select('id').eq('church_id', churchId)).data || [] : [];
    await admin.from('broadcasts').delete().eq('profile_id', uid);
    await admin.from('broadcast_recipients').delete().eq('profile_id', uid);
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
    fs.writeFileSync(path.join(__dirname, 'phase1_verify_results.json'), JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
    process.exit(failed.length ? 1 : 0);
  });
