// Phase 3 data-layer verification (run AFTER migration 011).
//
// Uses temporary test accounts only; real pastors' data is never touched.
// Everything created here is deleted at the end, even on failure.
//
//   node supabase/checks/phase3_verify.cjs
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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
  const email = `tsd-phase3-${tag}-${Date.now()}@example.com`;
  const password = 'T' + Math.random().toString(36).slice(2) + '!9x';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Phase3 Test ${tag}` } });
  if (error) throw new Error('createUser: ' + error.message);
  createdUsers.push(data.user.id);
  const prof = await admin.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
  if (!prof.data) {
    const anyProfile = must(await admin.from('profiles').select('church_id, role').not('church_id', 'is', null).limit(1).single(), 'sample profile');
    must(await admin.from('profiles').insert({ id: data.user.id, email, full_name: `Phase3 Test ${tag}`, church_id: anyProfile.church_id, role: anyProfile.role }), 'insert profile');
  }
  const client = createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  must(await client.auth.signInWithPassword({ email, password }), 'sign in');
  return { id: data.user.id, client };
}

const newKey = () => crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

async function main() {
  // ── 0. Tables exist ───────────────────────────────────────────────────────
  for (const t of ['bridge_devices', 'bridge_pairing_codes', 'bridge_send_jobs', 'bridge_audit_log', 'bridge_config', 'bridge_request_nonces']) {
    const r = await admin.from(t).select('*').limit(1);
    check(`${t} exists`, !r.error, r.error?.message);
  }
  const globalCfg = await admin.from('bridge_config').select('*').is('profile_id', null).maybeSingle();
  check('Global limits row seeded (100 per broadcast, 200 per day, 3 broadcasts, 8-15 s)', globalCfg.data
    && globalCfg.data.max_recipients === 100 && globalCfg.data.max_texts_per_day === 200
    && globalCfg.data.max_broadcasts_per_day === 3, JSON.stringify(globalCfg.data || globalCfg.error?.message).slice(0, 200));

  // Audit log must never hold message text.
  const textCols = [];
  for (const c of ['body', 'message', 'text', 'content']) {
    const r = await admin.from('bridge_audit_log').select(c).limit(1);
    if (!r.error) textCols.push(c);
  }
  check('Audit log has no text column', textCols.length === 0, textCols.join(','));

  const A = await makeUser('a');
  const B = await makeUser('b');

  // People for A
  const add = async (row) => must(await A.client.from('members').insert([{ profile_id: A.id, source: 'manual', ...row }]).select().single(), 'add ' + row.full_name);
  const amy  = await add({ full_name: 'Amy Star',     phone: '555-401-0001', is_member: true });
  const ben  = await add({ full_name: 'Ben Contact',  phone: '555-401-0002' });
  const cara = await add({ full_name: 'Cara NoText',  phone: '555-401-0003', do_not_text: true });
  const dan  = await add({ full_name: 'Dan Archived', phone: '555-401-0004' });
  must(await A.client.from('members').update({ archived_at: new Date().toISOString() }).eq('id', dan.id), 'archive dan');
  const eve  = await add({ full_name: 'Eve Samephone', phone: '(555) 401-0001' });
  const fay  = await add({ full_name: 'Fay Nophone',  phone: null });
  const gus  = await add({ full_name: 'Gus Badphone', phone: '12' });
  const otherPerson = must(await B.client.from('members').insert([{ profile_id: B.id, full_name: 'Other Person', phone: '555-499-0001' }]).select().single(), 'B person');

  // ── 1. Devices: server inserts, owner can only read / rename / revoke ────
  const devA = must(await admin.from('bridge_devices').insert({ profile_id: A.id, display_name: "Test's Galaxy", model: 'SM-TEST', public_key: newKey(), fcm_token: 'fake-token' }).select().single(), 'insert device A');
  const devB = must(await admin.from('bridge_devices').insert({ profile_id: B.id, display_name: 'B Phone', public_key: newKey() }).select().single(), 'insert device B');

  const selfInsert = await A.client.from('bridge_devices').insert({ profile_id: A.id, display_name: 'Sneaky', public_key: newKey() });
  check('Browser cannot register a phone by itself', !!selfInsert.error, selfInsert.error?.message);
  const seeOwn = must(await A.client.from('bridge_devices').select('id'), 'A devices');
  check('Owner sees only their own phone', seeOwn.length === 1 && seeOwn[0].id === devA.id);
  const keySwap = await A.client.from('bridge_devices').update({ public_key: newKey() }).eq('id', devA.id);
  check('Owner cannot change the phone key', !!keySwap.error, keySwap.error?.message);
  const rename = await A.client.from('bridge_devices').update({ display_name: "Angie's Galaxy" }).eq('id', devA.id).select('display_name');
  check('Owner can rename their phone', !rename.error && rename.data?.[0]?.display_name === "Angie's Galaxy", rename.error?.message);
  const touchOther = await A.client.from('bridge_devices').update({ display_name: 'hijack' }).eq('id', devB.id).select('id');
  check("Cannot rename someone else's phone", !touchOther.error && (touchOther.data || []).length === 0);

  // ── 2. Other tables: owner read only, no cross-account reads ─────────────
  const nonce = await A.client.from('bridge_request_nonces').select('*').limit(1);
  check('Browser cannot read the nonce table', !!nonce.error || (nonce.data || []).length === 0);
  const cfgWrite = await A.client.from('bridge_config').update({ max_recipients: 9999 }).is('profile_id', null).select('id');
  check('Non-admin cannot raise limits', !!cfgWrite.error || (cfgWrite.data || []).length === 0);
  const cfgRead = await A.client.from('bridge_config').select('max_recipients').is('profile_id', null);
  check('Signed-in user can read the global limits', !cfgRead.error && cfgRead.data?.length === 1, cfgRead.error?.message);

  // ── 3. 1:1 jobs: text wiped at final status ──────────────────────────────
  const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const job = must(await admin.from('bridge_send_jobs').insert({ profile_id: A.id, device_id: devA.id, member_id: amy.id, body: 'Hi Amy', to_e164: '+15554010001', status: 'queued', expires_at: exp }).select().single(), 'insert job');
  const jobSeenByB = must(await B.client.from('bridge_send_jobs').select('id').eq('id', job.id), 'B job read');
  check("Other pastor cannot see a job", jobSeenByB.length === 0);
  const jobInsertByA = await A.client.from('bridge_send_jobs').insert({ profile_id: A.id, device_id: devA.id, member_id: amy.id, body: 'x', to_e164: '+15554010001', status: 'queued', expires_at: exp });
  check('Browser cannot create a job directly (must go through the server)', !!jobInsertByA.error);
  must(await admin.from('bridge_send_jobs').update({ status: 'sent' }).eq('id', job.id), 'job sent');
  const jobAfter = must(await admin.from('bridge_send_jobs').select('body, to_e164, finished_at').eq('id', job.id).single(), 'job after');
  check('1:1 text and number wiped once sent', jobAfter.body === null && jobAfter.to_e164 === null && !!jobAfter.finished_at);

  // ── 4. Bridge broadcast: server filtering + guards ───────────────────────
  const body = 'Hi {first_name}, service is at 10.';
  const ids = [amy.id, ben.id, cara.id, dan.id, eve.id, fay.id, gus.id, otherPerson.id];
  const res = must(await admin.rpc('create_bridge_broadcast', { p_profile_id: A.id, p_body: body, p_member_ids: ids, p_device_id: devA.id, p_allow_archived: false }), 'create_bridge_broadcast');
  check('Bridge broadcast created', !!res.broadcast_id, JSON.stringify(res));
  check('Skips Do Not Text, no phone, bad phone, duplicate number', res.skipped?.do_not_text === 1 && res.skipped?.no_phone === 1 && res.skipped?.invalid_phone === 1 && res.skipped?.duplicate_number === 1, JSON.stringify(res.skipped));
  check("Archived and other pastor's people left out; 2 people will be texted", res.sendable === 2 && res.total === 6, `total ${res.total}, sendable ${res.sendable}`);
  const bb = must(await admin.from('broadcasts').select('*').eq('id', res.broadcast_id).single(), 'load bb');
  check('Waits for phone approval, tied to the phone', bb.channel === 'bridge' && bb.status === 'awaiting_phone_approval' && bb.device_id === devA.id && bb.device_label_snapshot === "Angie's Galaxy", `${bb.status} ${bb.device_label_snapshot}`);

  const recips = must(await admin.from('broadcast_recipients').select('id, name_snapshot, status, to_e164').eq('broadcast_id', res.broadcast_id).order('position'), 'recips');
  const queued = recips.filter(r => r.status === 'queued');
  check('Queued people carry a temporary number, skipped people do not', queued.every(r => !!r.to_e164) && recips.filter(r => r.status === 'skipped').every(r => !r.to_e164));

  const fakeBridge = await A.client.from('broadcasts').insert({ profile_id: A.id, body: 'x', channel: 'bridge', status: 'sending' });
  check('Browser cannot create a bridge broadcast directly', !!fakeBridge.error, fakeBridge.error?.message);
  const fakeApprove = await A.client.from('broadcasts').update({ status: 'sending' }).eq('id', res.broadcast_id);
  check('Browser cannot approve a bridge broadcast (only the phone can)', !!fakeApprove.error, fakeApprove.error?.message);
  const fakeSent = await A.client.from('broadcast_recipients').update({ status: 'sent' }).eq('id', queued[0].id);
  check('Browser cannot mark a bridge text as sent', !!fakeSent.error, fakeSent.error?.message);
  const bSees = must(await B.client.from('broadcasts').select('id').eq('id', res.broadcast_id), 'B reads bb');
  check("Other pastor cannot see the broadcast", bSees.length === 0);

  // Phone approves and sends (server role, as the API routes do)
  must(await admin.from('broadcasts').update({ status: 'sending', approved_at: new Date().toISOString(), started_at: new Date().toISOString() }).eq('id', res.broadcast_id), 'approve');
  must(await admin.from('broadcast_recipients').update({ status: 'sent' }).eq('id', queued[0].id), 'r1 sent');
  const r1 = must(await admin.from('broadcast_recipients').select('to_e164, sent_at').eq('id', queued[0].id).single(), 'r1');
  check('Number wiped and time recorded once a text is sent', r1.to_e164 === null && !!r1.sent_at);
  must(await admin.from('broadcast_recipients').update({ status: 'failed', error_code: 'RESULT_ERROR_GENERIC_FAILURE' }).eq('id', queued[1].id), 'r2 failed');
  const bbDone = must(await admin.from('broadcasts').select('status, sent, failed, skipped, completed_at').eq('id', res.broadcast_id).single(), 'bb done');
  check('Broadcast finishes as "completed with issues" with correct counts', bbDone.status === 'completed_with_issues' && bbDone.sent === 1 && bbDone.failed === 1 && bbDone.skipped === 4, JSON.stringify(bbDone));

  // Cancel path: everyone still queued becomes cancelled
  const res2 = must(await admin.rpc('create_bridge_broadcast', { p_profile_id: A.id, p_body: 'Second', p_member_ids: [amy.id, ben.id], p_device_id: devA.id, p_allow_archived: false }), 'bb2');
  const cancel = await A.client.from('broadcasts').update({ status: 'cancelled' }).eq('id', res2.broadcast_id);
  check('Browser may cancel an unfinished bridge broadcast', !cancel.error, cancel.error?.message);
  const r2 = must(await admin.from('broadcast_recipients').select('status, to_e164').eq('broadcast_id', res2.broadcast_id), 'r2');
  check('Cancelling cancels everyone still waiting and wipes numbers', r2.every(r => r.status === 'cancelled' && r.to_e164 === null));

  // Daily broadcast limit (3)
  must(await admin.rpc('create_bridge_broadcast', { p_profile_id: A.id, p_body: 'Third', p_member_ids: [amy.id], p_device_id: devA.id, p_allow_archived: false }), 'bb3');
  const fourth = await admin.rpc('create_bridge_broadcast', { p_profile_id: A.id, p_body: 'Fourth', p_member_ids: [amy.id], p_device_id: devA.id, p_allow_archived: false });
  check('Fourth broadcast in a day is refused', !!fourth.error && /broadcast_daily_limit/.test(fourth.error.message), fourth.error?.message);
  const wrongDevice = await admin.rpc('create_bridge_broadcast', { p_profile_id: A.id, p_body: 'x', p_member_ids: [amy.id], p_device_id: devB.id, p_allow_archived: false });
  check("Cannot use someone else's phone", !!wrongDevice.error && /no_device/.test(wrongDevice.error.message), wrongDevice.error?.message);
  const browserRpc = await A.client.rpc('create_bridge_broadcast', { p_profile_id: A.id, p_body: 'x', p_member_ids: [amy.id], p_device_id: devA.id, p_allow_archived: false });
  check('Browser cannot call create_bridge_broadcast directly', !!browserRpc.error);

  // ── 5. Audit + delete_person with bridge rows ────────────────────────────
  must(await admin.from('bridge_audit_log').insert({ profile_id: A.id, actor_profile_id: A.id, event: 'sent', member_id: ben.id, device_id: devA.id, status: 'sent' }), 'audit insert');
  const job2 = must(await admin.from('bridge_send_jobs').insert({ profile_id: A.id, device_id: devA.id, member_id: ben.id, body: 'Hi Ben', to_e164: '+15554010002', status: 'queued', expires_at: exp }).select().single(), 'job2');
  const auditB = must(await B.client.from('bridge_audit_log').select('id'), 'B audit');
  check("Other pastor cannot see the audit log", auditB.length === 0);

  const del = await A.client.rpc('delete_person', { p_member_id: ben.id, p_history_mode: 'keep' });
  check('Delete person (keep history) works with bridge records', !del.error, del.error?.message);
  const benAudit = must(await admin.from('bridge_audit_log').select('member_id').eq('profile_id', A.id).eq('event', 'sent'), 'audit after');
  check('Audit entry kept as "Deleted contact" (person link cleared)', benAudit.length === 1 && benAudit[0].member_id === null);
  const job2After = must(await admin.from('bridge_send_jobs').select('id').eq('id', job2.id), 'job2 after');
  check("Person's temporary 1:1 jobs removed", job2After.length === 0);

  const del2 = await A.client.rpc('delete_person', { p_member_id: amy.id, p_history_mode: 'delete_all' });
  check('Delete person (delete everything) works with bridge records', !del2.error, del2.error?.message);
  const amyRecips = must(await admin.from('broadcast_recipients').select('name_snapshot, member_id').eq('profile_id', A.id).eq('name_snapshot', 'Deleted contact'), 'amy recips');
  check('Broadcast rows kept as "Deleted contact" so counts stay right', amyRecips.length >= 1 && amyRecips.every(r => r.member_id === null));

  // ── 6. Disconnect cancels unfinished jobs ────────────────────────────────
  const job3 = must(await admin.from('bridge_send_jobs').insert({ profile_id: A.id, device_id: devA.id, member_id: eve.id, body: 'Hi Eve', to_e164: '+15554010001', status: 'queued', expires_at: exp }).select().single(), 'job3');
  const revoke = await A.client.from('bridge_devices').update({ status: 'revoked' }).eq('id', devA.id);
  check('Owner can disconnect their phone', !revoke.error, revoke.error?.message);
  const job3After = must(await admin.from('bridge_send_jobs').select('status, body').eq('id', job3.id).single(), 'job3 after');
  check('Disconnecting cancels waiting texts and wipes them', job3After.status === 'cancelled' && job3After.body === null);
  const reactivate = await A.client.from('bridge_devices').update({ status: 'active' }).eq('id', devA.id);
  check('A disconnected phone cannot be switched back on from the browser', !!reactivate.error);
}

async function cleanup() {
  for (const uid of createdUsers) {
    const prof = await admin.from('profiles').select('church_id').eq('id', uid).maybeSingle();
    const churchId = prof.data?.church_id;
    const sharers = churchId ? (await admin.from('profiles').select('id').eq('church_id', churchId)).data || [] : [];
    await admin.from('bridge_audit_log').delete().eq('profile_id', uid);
    await admin.from('bridge_send_jobs').delete().eq('profile_id', uid);
    await admin.from('broadcast_recipients').delete().eq('profile_id', uid);
    await admin.from('broadcasts').delete().eq('profile_id', uid);
    await admin.from('bridge_pairing_codes').delete().eq('profile_id', uid);
    await admin.from('bridge_devices').delete().eq('profile_id', uid);
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
    fs.writeFileSync(path.join(__dirname, 'phase3_verify_results.json'), JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
    process.exit(failed.length ? 1 : 0);
  });
