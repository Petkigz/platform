// Real Next /account/merge page and the /api/account/merge route against an
// entirely synthetic loopback Auth/REST API. This is not evidence about hosted
// Supabase, JWT validation, RLS, or what a merge moves: the stand-in answers
// whatever it is told to and merges nothing. What the database does is proved
// by `supabase/tests/account_merge.test.mjs`.
//
// The screen is behind `platform.account_merge`, which is off. The stand-in
// answers `my_merge_requests` as if it were on; nothing here switches it on.
//
// What it does show: the screen a signed-in reader is sent, in English,
// Arabic, Persian, French by the reader's own choice, and English for a
// language held for review; that what stops a merge is said from the
// catalogue and never forwarded; that the asking side is not shown the other
// account's name; the name and status the route gives each thing the database
// raises or answers, with no sentence of the database in any answer; and,
// with a browser, that nothing is confirmed by an empty box, that a refusal
// is said in the reader's language, and that a merge nobody answered is said
// as unknown. The expected sentences are typed here rather than imported, so
// this fails if a catalogue changes without anybody looking at the page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;

const R1 = '11111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';
const R3 = '33333333-3333-4333-8333-333333333333';
const R4 = '44444444-4444-4444-8444-444444444444';
const O1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const O2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const O3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const O4 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// What the merge functions raise, word for word, with the state each is
// raised under and the status PostgREST gives that state.
const RAISED = {
  signed_out: ['42501', 403, 'sign in to answer a merge request'],
  off: ['0A000', 400, 'merging accounts is not enabled on this platform yet'],
  email: ['22023', 400, 'type the email address of the account you want to keep'],
  // A database that has not had `20261281146000` yet still says this; one that has, never does.
  no_account: ['P0002', 404, 'there is no account with that email address'],
  too_many: ['54000', 413, 'this account has asked for a merge too many times today; try again tomorrow'],
  same_account: ['22023', 400, 'that is this account; sign in to the other one to merge it'],
  no_request: ['P0002', 404, 'there is no such merge request'],
  not_asker: ['42501', 403, 'only the account asking to be merged can withdraw the request'],
  not_target: ['42501', 403, 'only the account that would survive can decide'],
  name: ['22023', 400, 'type your name exactly as it appears to confirm the merge'],
  blocked: ['23514', 409, 'this merge cannot run: this account has 2 payout(s) in flight; wait until they finish; both accounts have started "Tajwid"; the platform cannot choose which progress is real. Finish or drop one before merging'],
  owner: ['23514', 409, 'this account has an owner appointment; contact privacy@ayahspring.com for individual review before merging it'],
  // Words this screen has no name for, under a state it knows: refused.
  unknown_words: ['22023', 400, 'SYNTHETIC a sentence written after this page was'],
  // A state it does not know: nothing is known.
  timeout: ['57014', 500, 'canceling statement due to statement timeout'],
};
// Parts of the database's sentences that must reach no reader, in a page or an answer.
const DATABASE_WORDS = ['sign in to answer', 'not enabled on this platform yet', 'there is no account', 'too many times today', 'that is this account', 'no such merge request', 'only the account', 'exactly as it appears', 'this merge cannot run:', 'payout(s) in flight', 'Finish or drop one', 'owner appointment', 'privacy@', 'that is the same account', 'learner records become one', 'SYNTHETIC', 'canceling statement', 'SECRET-TARGET'];

const BOARD = {
  enabled: true,
  incoming: [
    { id: R1, status: 'pending', requestedAt: '2026-11-17T10:00:00Z', expiresAt: '2026-12-01T10:00:00Z', expired: false, otherName: 'Amina <b>Second</b>', otherUserId: 'x', preview: { ok: true, blocks: [], notes: ['the two learner records become one; anything the surviving record already has stays as it is', 'SYNTHETIC a note written after this page was'] } },
    { id: R2, status: 'pending', requestedAt: '2026-11-16T10:00:00Z', expiresAt: '2026-11-30T10:00:00Z', expired: false, otherName: null, otherUserId: 'y', preview: { ok: false, blocks: [
      'this account has 2 payout(s) in flight; wait until they finish',
      'both accounts have started "Tajwid "one"; \u202efor beginners"; the platform cannot choose which progress is real. Finish or drop one before merging',
      'the account being absorbed has an owner appointment; contact privacy@ayahspring.com for individual review',
      'SYNTHETIC a reason written after this page was',
      'SYNTHETIC another one',
    ], notes: [] } },
    { id: R3, status: 'completed', requestedAt: '2026-10-01T10:00:00Z', expiresAt: '2026-10-15T10:00:00Z', expired: false, otherName: 'Merged account', otherUserId: 'z', preview: { ok: false, blocks: ['the account being absorbed is closed'], notes: [] } },
    { id: R4, status: 'pending', requestedAt: '2026-09-01T10:00:00Z', expiresAt: '2026-09-15T10:00:00Z', expired: true, otherName: 'Late account', otherUserId: 'w', preview: { ok: true, blocks: [], notes: [] } },
  ],
  outgoing: [
    { id: O1, status: 'pending', requestedAt: '2026-11-17T10:00:00Z', expiresAt: '2026-12-01T10:00:00Z', expired: false, summary: null },
    { id: O2, status: 'completed', requestedAt: '2026-10-01T10:00:00Z', expiresAt: '2026-10-15T10:00:00Z', expired: false, otherName: 'SECRET-TARGET-NAME', otherUserId: 'q', summary: { learnerRelinked: 1, enrolments: 2, certificates: 1, notifications: 0, leftBehind: 3, somethingNew: 7 } },
    { id: O3, status: 'declined', requestedAt: '2026-09-01T10:00:00Z', expiresAt: '2026-09-15T10:00:00Z', expired: false, otherName: 'SECRET-TARGET-NAME', otherUserId: 'q', summary: null },
    { id: O4, status: 'completed', requestedAt: '2026-08-01T10:00:00Z', expiresAt: '2026-08-15T10:00:00Z', expired: false, otherName: null, otherUserId: 'q', summary: {} },
    // A state the table does not have: not drawn.
    { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status: 'approved', otherName: 'SECRET-TARGET-NAME' },
  ],
};

const state = { board: BOARD, name: 'Halima Probe', answer: 'ok' };
const calls = [];
const WRITES = ['/rest/v1/rpc/request_account_merge', '/rest/v1/rpc/cancel_account_merge', '/rest/v1/rpc/decide_account_merge'];
const fake = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const json = { 'content-type': 'application/json' };
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{"message":"not authenticated"}'); return; }
    res.writeHead(200, json); res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{}'); return; }
  const path = new URL(req.url, 'http://localhost').pathname;
  let sent = null; try { sent = JSON.parse(body); } catch { /* no body */ }
  calls.push({ method: req.method, path, sent });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  const write = WRITES.includes(path);
  const what = path.slice('/rest/v1/rpc/'.length);
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: state.name, preferred_language: 'en', timezone: 'Africa/Kampala', account_status: 'active' }]);
  else if (path === '/rest/v1/learner_profiles') send([]);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/rpc/my_policy_standing') send({ outstanding: 0, acceptanceRequired: [], history: [] });
  else if (path === '/rest/v1/rpc/my_merge_requests') {
    if (state.board === 'error') send({ code: 'XX000', message: 'SYNTHETIC the board broke', details: null, hint: null }, 500);
    else send(state.board);
  }
  else if (write && state.answer === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); res.end('<html>bad gateway SYNTHETIC</html>'); }
  else if (write && state.answer === 'no_reply') send(null);
  else if (write && state.answer === 'word') send('SYNTHETIC not a reply');
  // What the functions answer without raising.
  else if (write && state.answer === 'already') send({ requested: false, alreadyPending: true, requestId: O1 });
  else if (write && state.answer === 'late') send(what === 'cancel_account_merge' ? { cancelled: false, status: 'completed' } : { merged: false, status: 'cancelled' });
  else if (write && state.answer === 'ran_out') send({ merged: false, status: 'expired', reason: 'SYNTHETIC the request ran out' });
  else if (write && state.answer === 'was_declined') send({ merged: false, status: 'declined' });
  // Says the opposite of what was asked, or something that cannot be so.
  else if (write && state.answer === 'liar') send(what === 'decide_account_merge' ? (sent?.p_accept ? { merged: true, status: 'pending' } : { merged: true, status: 'completed', moved: {} }) : what === 'cancel_account_merge' ? { cancelled: false, status: 'pending' } : { requested: false, alreadyPending: false });
  else if (write && state.answer !== 'ok') { const [code, status, message] = RAISED[state.answer]; send({ code, message, details: null, hint: null }, status); }
  else if (what === 'request_account_merge') send({ requested: true, alreadyPending: false, requestId: O1, expiresAt: '2026-12-01T10:00:00Z' });
  else if (what === 'cancel_account_merge') send({ cancelled: true, status: 'cancelled' });
  else if (what === 'decide_account_merge') send(sent?.p_accept ? { merged: true, status: 'completed', moved: { learnerRelinked: 1, enrolments: 2, certificates: 1, notifications: 0, leftBehind: 3, sneaky: 'SYNTHETIC' } } : { merged: false, status: 'declined' });
  else send({}, 404);
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const root = resolve(import.meta.dirname, '..');
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = ''; let browser;
try {
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${logs}`)), 60000);
    const receive = (chunk) => { logs += chunk.toString(); if (logs.includes('Ready in')) { clearTimeout(timeout); resolveReady(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (e) => { clearTimeout(timeout); reject(e); });
    next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${logs}`)); });
  });
  const origin = `http://localhost:${port}`;
  const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  const page = async (headers) => { const response = await request('/account/merge', { cookie, ...headers }); assert.equal(response.status, 200, logs.slice(-2000)); return response.text(); };
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '');
  const writes = () => calls.filter((c) => WRITES.includes(c.path));
  const none = (text, words, label) => { for (const word of words) assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `${label} says "${word}"`); };
  const ENGLISH_ONLY = ['Merging accounts', 'Account settings', 'Another account is asking', 'What moves', 'What is deleted', 'Merge it into this account', 'Decline', 'Move this account', 'Ask to be merged', 'Requests made from this account', 'Withdraw', 'Waiting', 'Merged', 'Enrolments', 'Certificates', 'Closing an account', 'cannot be undone'];

  // ------------------------------------------------------------- signed out
  {
    const out = await request('/account/merge');
    assert.ok([302, 303, 307, 308].includes(out.status), `signed out: ${out.status}`);
    assert.match(out.headers.get('location') ?? '', /\/sign-in\?next=(?:%2F|\/)account(?:%2F|\/)merge/);
  }

  // ------------------------------------------------------- off, nothing made
  state.board = { enabled: false, incoming: BOARD.incoming, outgoing: [] };
  const off = inner(await page({ 'accept-language': 'en' }));
  assert.ok(off.includes('<div class="notice warn">Merging accounts is switched off on this platform. Nothing on this page can be done until the owner switches it on.</div>'));
  none(off, ['merge-target', 'Ask to be merged', 'Another account is asking', 'Merge it into this account', 'Amina', '<button'], 'the page with merging off');
  none(off, DATABASE_WORDS, 'the page with merging off');

  // ------------------------------ off, with a request made while it was on
  state.board = { enabled: false, incoming: BOARD.incoming, outgoing: BOARD.outgoing };
  const paused = inner(await page({ 'accept-language': 'en' }));
  assert.ok(paused.includes('Merging accounts is switched off on this platform.'));
  assert.ok(paused.includes('Requests made from this account'));
  assert.equal((paused.match(/<button/g) ?? []).length, 1, 'off: the one thing left is withdrawing a waiting request');
  assert.match(paused, /<button class="btn secondary" type="button">Withdraw<\/button>/);
  none(paused, ['merge-target', 'Ask to be merged', 'Another account is asking', 'Merge it into this account', 'Amina'], 'the page with merging off and a request waiting');

  // --------------------------------------------- a board nobody can read
  for (const [label, board] of [['an error', 'error'], ['a word', 'SYNTHETIC not a board'], ['no switch', { incoming: [], outgoing: [] }]]) {
    state.board = board;
    const unread = inner(await page({ 'accept-language': 'en' }));
    assert.ok(unread.includes('<div class="notice error" role="alert">The merge requests could not be read just now. Nothing was changed.</div>'), `${label}: not said as unread`);
    none(unread, ['merge-target', '<button', 'SYNTHETIC', 'switched off'], `the page after ${label}`);
  }

  // ---------------------------------------------------------------- English
  state.board = BOARD;
  const english = await page({ 'accept-language': 'en' });
  const en = inner(english);
  assert.match(english, /<title>Merging accounts[^<]*<\/title>/);
  for (const sentence of [
    '<a href="/account">Account settings</a>',
    '<h1>Merging accounts</h1>',
    'If you signed up twice, one account can be moved into the other, so that your courses and certificates are in one place. Both accounts have to agree, and the account that is moved is closed afterwards.',
    '<h2>Another account is asking to be merged into this one</h2>',
    'If this is you on a second account, agreeing moves that account’s learning, roles and details into this one and closes that account. It cannot be undone. If it is not you, decline. Nothing happens until you answer.',
    // A name is text, never markup, and is set apart from the line it is in.
    '<bdi>Amina &lt;b&gt;Second&lt;/b&gt;</bdi></h3>',
    'The two learning records become one. What the record on this account already has stays as it is.',
    'What moves: that account’s learning record with its progress and certificates, its roles, its notifications, its phone number and the courses it made. What stays: the record of what that account did, such as the orders it placed.',
    'What is deleted: where both accounts have a note or a bookmark on the same lesson, or the same notification, the one on this account is kept and the other is deleted. So is the other account’s phone number, if this account already has one.',
    '<bdi>Halima Probe</bdi>',
    'This cannot be undone. The other account is closed and its name and details are removed. Its sign-in stays with the sign-in service until it is deleted there.',
    // The second request: no name, and four things that stop it.
    '>An account with no name</h3>',
    'The account that would be moved has payouts on their way: 2. Wait until they are finished.',
    'Both accounts have started the same course: \u2068Tajwid &quot;one&quot;; for beginners\u2069. The platform cannot choose which progress is the real one. Finish the course on one account, or leave it, before merging.',
    'The account that would be moved holds an owner’s appointment on this platform. It has to be looked at individually before it can be merged.',
    'This merge cannot run now, and this page has no sentence for the reason. Ask the platform’s staff before trying again.',
    // The third and fourth.
    'Merged. The other account is closed.',
    'This request ran out before it was answered. Ask again from the other account.',
    '<h2>Move this account into another one</h2>',
    '<label for="merge-target">Email address of the account to keep</label>',
    'That account has to agree before anything moves. This account is closed afterwards, and closing it cannot be undone.',
    '<h2>Requests made from this account</h2>',
    'Into the account whose address you typed',
    'The learning record · Enrolments: 2 · Certificates: 1',
    'Nothing needed moving.',
    'Each merge is written into the platform’s record of changes, with what was moved.',
    '<a href="/account/delete">Closing an account</a>',
  ]) assert.ok(en.includes(sentence), `English merge page lost "${sentence}"`);
  none(en, DATABASE_WORDS, 'the English merge page');
  // A merged account's name is the database's English placeholder; it is not shown.
  none(en, ['Merged account'], 'the English merge page');
  none(en, ['lang="en"', '{name}', '{count}', '{title}', '{date}', '\u202e', 'Notifications: 0', 'Late account</bdi></h3><span class="badge neutral">Waiting'], 'the English merge page');
  assert.match(en, /Waiting until [^<]*2026[^<]*<\/span>/);
  // Two reasons nobody recognises are said once.
  assert.equal(en.split('this page has no sentence for the reason').length - 1, 1);
  // One request can be agreed to, and its button waits for the name; every waiting one can be declined.
  assert.equal((en.match(/<button class="btn" type="button" disabled="">Merge it into this account<\/button>/g) ?? []).length, 1);
  assert.equal((en.match(/>Decline<\/button>/g) ?? []).length, 2);
  assert.equal((en.match(/>Withdraw<\/button>/g) ?? []).length, 1);
  for (const [badge, count] of [['Waiting', 3], ['Merged', 3], ['Declined', 1], ['Ran out', 1]]) {
    assert.equal((en.match(new RegExp(`<span class="badge neutral">${badge}</span>`, 'g')) ?? []).length, count, `badges saying ${badge}`);
  }
  const field = en.match(/<input[^>]*id="merge-target"[^>]*>/)[0];
  for (const attribute of ['type="email"', 'dir="ltr"', 'autoComplete="email"', 'aria-describedby="merge-target-help"']) assert.ok(field.toLowerCase().includes(attribute.toLowerCase()), `the field lost ${attribute}`);

  // ------------------------------------------ an account with no name of its own
  state.name = null;
  const nameless = inner(await page({ 'accept-language': 'en' }));
  assert.ok(nameless.includes('<p class="notice warn">This account has no name yet. Add one in the account settings first: a merge is confirmed by typing it.</p>'));
  none(nameless, ['Merge it into this account', 'merge-confirm-'], 'the page of an account with no name');
  assert.equal((nameless.match(/>Decline<\/button>/g) ?? []).length, 2);
  state.name = 'Halima Probe';

  // ----------------------------------------------------------------- Arabic
  const arabic = await page({ 'accept-language': 'ar' });
  const ar = inner(arabic);
  assert.match(arabic.match(/<html[^>]*>/)[0], /dir="rtl"/);
  for (const sentence of ['<h1>دمج الحسابات</h1>', 'حساب آخر يطلب أن يُدمج في هذا الحساب', 'حساب بلا اسم', 'يصير سجلّا التعلّم سجلًا واحدًا. وما في سجل هذا الحساب من قبل يبقى كما هو.', 'للحساب الذي سيُنقل دفعات في طريقها: 2. انتظر حتى تنتهي.', 'بدأ الحسابان الدورة نفسها: \u2068Tajwid &quot;one&quot;; for beginners\u2069.', 'الحساب الذي سيُنقل يحمل تعيينًا من تعيينات المالك في هذه المنصة. يجب أن يُنظر فيه على حدة قبل دمجه.', 'لا يمكن تنفيذ هذا الدمج الآن، وليس في هذه الصفحة جملة تشرح السبب. اسأل موظفي المنصة قبل المحاولة مرة أخرى.', 'ادمجه في هذا الحساب', 'انقل هذا الحساب إلى حساب آخر', 'عنوان البريد الإلكتروني للحساب الذي سيبقى', 'اطلب الدمج', 'الطلبات المرسلة من هذا الحساب', 'إلى الحساب الذي كتبت عنوانه', 'ينتظر حتى ', 'سجل التعلّم · التسجيلات في الدورات: 2 · الشهادات: 1', 'لم يكن هناك ما يحتاج إلى نقل.', 'سحب الطلب']) {
    assert.ok(ar.includes(sentence), `Arabic merge page lacks "${sentence}"`);
  }
  none(ar, [...ENGLISH_ONLY, ...DATABASE_WORDS, 'lang="en"', '{'], 'the Arabic merge page');
  assert.match(ar, /اكتب اسم هذا الحساب للتأكيد: (?:<!-- -->)?<bdi>Halima Probe<\/bdi>/);

  // ---------------------------------------- Persian: counts in its own digits
  const fa = inner(await page({ 'accept-language': 'fa' }));
  for (const sentence of ['<h1>ادغام حساب‌ها</h1>', 'حسابی که قرار است منتقل شود پرداخت‌هایی در راه دارد: ۲. صبر کنید تا تمام شوند.', 'سابقهٔ یادگیری · ثبت‌نام‌ها در دوره‌ها: ۲ · گواهی‌نامه‌ها: ۱', 'درخواست ادغام']) assert.ok(fa.includes(sentence), `Persian merge page lacks "${sentence}"`);
  none(fa, [...ENGLISH_ONLY, ...DATABASE_WORDS], 'the Persian merge page');

  // --------------------------------------------- French, by the reader's choice
  const fr = inner(await page({ 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` }));
  for (const sentence of ['<h1>Fusion de comptes</h1>', 'Un autre compte demande à être fusionné avec celui-ci', 'Un compte sans nom', 'Le fusionner avec ce compte', 'Refuser']) assert.ok(fr.includes(sentence), `French merge page lacks "${sentence}"`);
  assert.match(fr, /Saisissez le nom de ce compte pour confirmer\u00a0: (?:<!-- -->)?<bdi>Halima Probe<\/bdi>/);
  none(fr, DATABASE_WORDS, 'the French merge page');

  // ------------------------------ Hausa: held for review, so English, marked
  const hausa = await page({ 'accept-language': 'ha' });
  assert.match(hausa.match(/<html[^>]*>/)[0], /lang="ha"/);
  assert.match(inner(hausa), /<div class="container section" lang="en" dir="ltr">/);
  for (const sentence of ['<h1>Merging accounts</h1>', 'Merge it into this account', 'Ask to be merged']) assert.ok(inner(hausa).includes(sentence), `the held-language merge page lacks "${sentence}"`);

  assert.equal(writes().length, 0, 'opening the merge page wrote something');
  console.log('Merge page: signed out is sent to sign in; off says so and offers nothing, or only the withdrawal of a request already waiting; a board that cannot be read is said as unread; English with a name as text, four reasons from the catalogue and an unknown one said once, the asking side never shown the other name; no button to agree for an account with no name; Arabic, Persian (its own digits) and French; English and marked for Hausa.');

  // -------------------------------------------------------------------- route
  const post = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/account/merge`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: response.status, text, json, cache: response.headers.get('cache-control') };
  };
  const clean = (answer, label) => {
    assert.equal(answer.cache, 'no-store', `${label}: an answer a cache may keep`);
    // The screen's own English asks for the address in words the database also uses; an answer never does.
    none(answer.text, [...DATABASE_WORDS, 'type the email address of'], `${label}: the answer`);
  };
  const ASK = { action: 'request', email: 'other@example.invalid' };
  const AGREE = { action: 'decide', requestId: R1, accept: true, confirm: 'Halima Probe' };
  const DECLINE = { action: 'decide', requestId: R1, accept: false, confirm: '' };
  const WITHDRAW = { action: 'cancel', requestId: O1 };
  {
    const before = writes().length;
    const signedOut = await post(AGREE, {});
    assert.equal(signedOut.status, 401); assert.equal(signedOut.json.code, 'signed_out'); clean(signedOut, 'signed out');
    for (const [label, body] of [
      ['not JSON', '{'], ['a list', '[]'], ['no action', {}], ['an action nobody has', { action: 'merge', requestId: R1 }],
      ['an address that is not text', { action: 'request', email: 7 }], ['an address too long to be one', { action: 'request', email: `${'a'.repeat(330)}@example.invalid` }],
      ['a request that is not an id', { action: 'cancel', requestId: 'all' }], ['no request', { action: 'decide', accept: true, confirm: 'x' }],
      ['an answer that is not yes or no', { action: 'decide', requestId: R1, accept: 'yes', confirm: 'x' }], ['a name too long to be one', { ...AGREE, confirm: 'x'.repeat(201) }],
    ]) {
      const answer = await post(body);
      assert.equal(answer.status, 400, label); assert.equal(answer.json.code, 'malformed', label); clean(answer, label);
    }
    // Two the route can name itself.
    const blank = await post({ action: 'request', email: '   ' });
    assert.equal(blank.status, 400); assert.equal(blank.json.code, 'email');
    // An empty box is never a name: the database would take it for an account that has none.
    for (const confirm of ['', '   ', undefined, 7]) {
      const empty = await post({ ...AGREE, confirm });
      assert.equal(empty.status, 400, String(confirm)); assert.equal(empty.json.code, 'name', String(confirm)); clean(empty, 'an empty box');
    }
    assert.equal(writes().length, before, 'a request the route refused itself reached the database');
    const get = await request('/api/account/merge', { cookie });
    assert.equal(get.status, 405);
  }
  const NAMED = [
    // [the stand-in's answer, what is sent, status, name]
    ['signed_out', AGREE, 401, 'signed_out'], ['off', AGREE, 409, 'off'], ['off', ASK, 409, 'off'],
    ['email', ASK, 400, 'email'], ['no_account', ASK, 404, 'no_account'], ['same_account', ASK, 400, 'same_account'], ['already', ASK, 409, 'pending'], ['too_many', ASK, 429, 'too_many'],
    ['no_request', WITHDRAW, 404, 'no_request'], ['no_request', AGREE, 404, 'no_request'], ['not_asker', WITHDRAW, 403, 'not_yours'], ['not_target', AGREE, 403, 'not_yours'],
    ['late', WITHDRAW, 409, 'answered'], ['late', AGREE, 409, 'answered'], ['late', DECLINE, 409, 'answered'],
    ['name', AGREE, 400, 'name'], ['blocked', AGREE, 409, 'blocked'], ['owner', AGREE, 409, 'blocked'],
    ['ran_out', AGREE, 409, 'expired'], ['ran_out', DECLINE, 409, 'expired'],
    // Agreeing to one that had been declined did not decline it now.
    ['was_declined', AGREE, 409, 'answered'],
    ['unknown_words', AGREE, 409, 'refused'], ['unknown_words', ASK, 409, 'refused'],
    ['timeout', AGREE, 502, 'failed'], ['gateway', AGREE, 502, 'failed'], ['no_reply', AGREE, 502, 'failed'], ['word', AGREE, 502, 'failed'],
    ['liar', AGREE, 502, 'failed'], ['liar', DECLINE, 502, 'failed'], ['liar', WITHDRAW, 502, 'failed'], ['liar', ASK, 502, 'failed'],
    ['gateway', ASK, 502, 'failed'], ['gateway', WITHDRAW, 502, 'failed'],
  ];
  for (const [answer, body, status, code] of NAMED) {
    state.answer = answer;
    const got = await post(body);
    const label = `${answer} to ${body.action}`;
    assert.equal(got.status, status, `${label}: ${got.text}`);
    assert.equal(got.json.ok, false); assert.equal(got.json.code, code, label);
    // The name and the route's own sentence, and nothing else.
    assert.deepEqual(Object.keys(got.json).sort(), ['code', 'message', 'ok'], label);
    clean(got, label);
  }
  {
    state.answer = 'ok';
    const asked = await post({ action: 'request', email: ' Other@Example.invalid ' });
    assert.equal(asked.status, 200); assert.equal(asked.cache, 'no-store');
    assert.deepEqual(asked.json, { ok: true, did: 'asked' });
    assert.deepEqual(writes().at(-1), { method: 'POST', path: '/rest/v1/rpc/request_account_merge', sent: { p_target_email: ' Other@Example.invalid ' } });
    const withdrawn = await post(WITHDRAW);
    assert.deepEqual(withdrawn.json, { ok: true, did: 'withdrawn' });
    assert.deepEqual(writes().at(-1).sent, { p_request: O1 });
    const merged = await post(AGREE);
    assert.equal(merged.status, 200); clean(merged, 'a merge');
    // What moved, by name and count, in the screen's order; what did not move is not a line.
    assert.deepEqual(merged.json, { ok: true, did: 'merged', moved: [{ kind: 'learnerRelinked', count: 1 }, { kind: 'enrolments', count: 2 }, { kind: 'certificates', count: 1 }], stayed: 3 });
    assert.deepEqual(writes().at(-1).sent, { p_request: R1, p_accept: true, p_confirm: 'Halima Probe' });
    const declined = await post(DECLINE);
    assert.deepEqual(declined.json, { ok: true, did: 'declined' });
    assert.deepEqual(writes().at(-1).sent, { p_request: R1, p_accept: false, p_confirm: '' });
    // Declining is said as declined when it had been declined already: that is what was asked for.
    state.answer = 'was_declined';
    assert.deepEqual((await post(DECLINE)).json, { ok: true, did: 'declined' });
    state.answer = 'ok';
  }
  console.log(`Merge route: signed out 401; ten requests it does not understand 400 "malformed", a blank address 400 "email" and four empty boxes 400 "name", none of which asked the database; GET 405. ${NAMED.length} answers of the database each under their own name with nothing beside it: a refusal 4xx, a reply that came too late 409 "answered", a reply that contradicts the request and every unknown state 502 "failed". No answer carries a sentence of the database and every answer is no-store. A merge answers with what moved by name and count.`);

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', deviceScaleFactor: process.env.RESPONSIVE_SCREENSHOTS ? 2 : 1 });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      tab.on('console', (m) => { if (m.type() === 'error' && /hydrat/i.test(m.text())) errors.push(m.text()); });
      await tab.goto(`${origin}/account/merge`, { waitUntil: 'networkidle' });
      return { context, tab, errors };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 40)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card, main .notice')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
      assert.equal(spill, 0, `${label}: a card's contents are wider than the card`);
    };
    const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.locator('main').screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png` }).catch(() => {}); };

    state.answer = 'ok'; state.board = BOARD;
    for (const [code, heading] of [['en', 'Merging accounts'], ['ar', 'دمج الحسابات'], ['ta', 'கணக்குகளை இணைத்தல்'], ['fil', 'Pagsasama ng mga account']]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await open(code, width);
        await tab.getByRole('heading', { level: 1, name: heading, exact: true }).waitFor();
        await fits(tab, width, `merge ${code} ${width}`);
        // The address is left to right whatever the page.
        assert.equal(await tab.locator('#merge-target').evaluate((el) => getComputedStyle(el).direction), 'ltr');
        assert.deepEqual(errors, [], `merge ${code} ${width}: ${errors.join(' | ')}`);
        if ([390, 1440].includes(width)) await shot(tab, `merge-${code}-${width}`);
        await context.close();
      }
      console.log(`Synthetic merge page in ${code}: fits at 320, 390 and 1440px; no hydration error`);
    }

    {
      // Arabic, a phone-sized screen.
      const { context, tab, errors } = await open('ar', 390);
      const posts = []; tab.on('request', (r) => { if (r.url().includes('/api/account/merge')) posts.push(r.postData()); });
      const alerts = tab.locator('main').getByRole('alert');
      const status = tab.locator('main').getByRole('status');
      const says = async (sentence, label) => {
        await tab.waitForFunction((want) => [...document.querySelectorAll('main [role="alert"]')].some((el) => el.textContent === want), sentence, { timeout: 15000 }).catch(async () => { throw new Error(`${label}: the page says "${await alerts.allInnerTexts()}"`); });
        assert.equal(await alerts.count(), 1, label);
        assert.equal(await status.count(), 0, `${label}: a refusal beside a confirmation`);
      };
      const UNKNOWN = 'لم يصل أي رد، ولذلك لا يُعرف هل تمّ هذا. أعد تحميل هذه الصفحة لترى الحال قبل أن تحاول مرة أخرى.';

      // Asking: an empty box is named before anything is sent.
      const ask = tab.getByRole('button', { name: 'اطلب الدمج', exact: true });
      await ask.click();
      await says('اكتب عنوان البريد الإلكتروني للحساب الذي تريد الاحتفاظ به.', 'an empty address');
      assert.equal(posts.length, 0, 'an empty address was sent');
      await tab.locator('#merge-target').fill('other@example.invalid');
      for (const [answer, sentence] of [
        ['no_account', 'لا يوجد حساب بهذا العنوان. لم يتغيّر شيء.'],
        ['same_account', 'هذا عنوان هذا الحساب نفسه. اكتب عنوان الحساب الآخر، الذي تريد الاحتفاظ به.'],
        ['already', 'هناك طلب من هذا الحساب ينتظر من قبل. اسحبه قبل أن تطلب من حساب آخر.'],
        ['too_many', 'طلب هذا الحساب الدمج مرات كثيرة جدًا في يوم واحد. حاول غدًا. لم يتغيّر شيء.'],
        ['off', 'دمج الحسابات موقوف في هذه المنصة. لا يمكن فعل شيء في هذه الصفحة حتى يشغّله المالك.'],
        ['signed_out', 'لقد خرجت من الحساب. سجّل الدخول مرة أخرى ثم حاول من جديد. لم يتغيّر شيء.'],
        ['unknown_words', 'لم تقبل المنصة هذا. لم يتغيّر شيء.'],
        // Nothing is known, so nothing is claimed: not "nothing changed".
        ['timeout', UNKNOWN], ['gateway', UNKNOWN], ['liar', UNKNOWN],
      ]) {
        state.answer = answer;
        await ask.click();
        await says(sentence, `asking, ${answer}`);
        assert.equal(await tab.locator('#merge-target').inputValue(), 'other@example.invalid', `${answer}: the address was thrown away`);
      }
      // The request never arrives at all.
      await tab.route('**/api/account/merge', (r) => r.abort());
      await ask.click();
      await says(UNKNOWN, 'a request that never arrived');
      assert.equal(await ask.isDisabled(), false, 'the button stayed busy after a request that never arrived');
      await tab.unroute('**/api/account/merge');
      state.answer = 'ok';
      await ask.click();
      await status.waitFor();
      // Said the same way whether or not the address has an account.
      assert.equal(await status.innerText(), 'سُجّل الطلب. إن كان ذلك العنوان لحساب، فالطلب ينتظر هناك: سجّل الدخول إلى ذلك الحساب لتوافق عليه. لا يُقال لك هل للعنوان حساب أم لا.');
      assert.equal(await alerts.count(), 0);
      assert.equal(await tab.locator('#merge-target').inputValue(), '');
      assert.deepEqual(JSON.parse(posts.at(-1)), { action: 'request', email: 'other@example.invalid' });

      // Agreeing: the button waits for the name, letter for letter.
      const agree = tab.getByRole('button', { name: 'ادمجه في هذا الحساب', exact: true });
      const box = tab.locator(`#merge-confirm-${R1}`);
      assert.equal(await agree.count(), 1);
      assert.equal(await agree.isDisabled(), true);
      for (const wrong of ['', '   ', 'halima probe', 'Halima', 'Halima  Probe']) { await box.fill(wrong); assert.equal(await agree.isDisabled(), true, `"${wrong}" confirms a merge`); }
      await box.fill('Halima Probe');
      assert.equal(await agree.isDisabled(), false);
      await fits(tab, 390, 'merge ar 390 with the name typed');
      const before = posts.length;
      for (const [answer, sentence] of [
        ['blocked', 'لا يمكن تنفيذ هذا الدمج الآن. لم يُنقل شيء. أعد تحميل هذه الصفحة لترى السبب بجانب الطلب.'],
        ['owner', 'لا يمكن تنفيذ هذا الدمج الآن. لم يُنقل شيء. أعد تحميل هذه الصفحة لترى السبب بجانب الطلب.'],
        ['name', 'الاسم المكتوب ليس اسم هذا الحساب حرفًا بحرف. لم يتغيّر شيء.'],
        ['ran_out', 'انتهت مهلة هذا الطلب قبل الرد عليه. لم يُنقل شيء. اطلب مرة أخرى من الحساب الآخر.'],
        ['late', 'سبق الرد على هذا الطلب. لم يتغيّر شيء الآن. أعد تحميل هذه الصفحة لترى ما حدث.'],
        ['was_declined', 'سبق الرد على هذا الطلب. لم يتغيّر شيء الآن. أعد تحميل هذه الصفحة لترى ما حدث.'],
        ['not_target', 'لا يستطيع هذا الحساب الرد على ذلك الطلب. لم يتغيّر شيء.'],
        ['no_request', 'لم يعد ذلك الطلب موجودًا. لم يتغيّر شيء.'],
        // A merge cannot be undone: one nobody answered is never "nothing changed".
        ['timeout', UNKNOWN], ['gateway', UNKNOWN], ['no_reply', UNKNOWN], ['liar', UNKNOWN],
      ]) {
        state.answer = answer;
        await agree.click();
        await says(sentence, `agreeing, ${answer}`);
      }
      assert.deepEqual(JSON.parse(posts.at(-1)), { action: 'decide', requestId: R1, accept: true, confirm: 'Halima Probe' });
      assert.equal(posts.length, before + 12);
      const shown = await tab.locator('main').innerText();
      none(shown, [...DATABASE_WORDS, 'Nothing was changed', 'Nothing was moved', 'could not be confirmed', 'Something stops'], 'the Arabic page after twelve refusals');
      await shot(tab, 'merge-ar-refused');

      // Merged: said as a status, with what moved and what stayed.
      state.answer = 'ok';
      await agree.click();
      await status.waitFor();
      assert.equal(await alerts.count(), 0);
      const done = (await status.innerText()).split('\n').map((line) => line.trim()).filter(Boolean);
      assert.deepEqual(done, ['دُمج الحسابان. الحساب الآخر مغلق.', 'ما نُقل', 'سجل التعلّم', 'التسجيلات في الدورات: 2', 'الشهادات: 1', 'سجلات بقيت مع الحساب المغلق لأن هذا الحساب كان لديه الشيء نفسه: 3.']);
      await fits(tab, 390, 'merge ar 390 after merging');
      await shot(tab, 'merge-ar-merged');

      // Declining the one that cannot run, then withdrawing.
      await tab.getByRole('button', { name: 'رفض', exact: true }).last().click();
      await tab.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent === 'رُفض الطلب. الحسابان كما كانا.');
      assert.deepEqual(JSON.parse(posts.at(-1)), { action: 'decide', requestId: R2, accept: false, confirm: '' });
      const withdraw = tab.getByRole('button', { name: 'سحب الطلب', exact: true });
      state.answer = 'late';
      await withdraw.click();
      await says('سبق الرد على هذا الطلب. لم يتغيّر شيء الآن. أعد تحميل هذه الصفحة لترى ما حدث.', 'withdrawing too late');
      state.answer = 'not_asker';
      await withdraw.click();
      await says('لا يستطيع هذا الحساب الرد على ذلك الطلب. لم يتغيّر شيء.', 'withdrawing another account’s request');
      state.answer = 'ok';
      await withdraw.click();
      await tab.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent === 'سُحب الطلب. لم يُنقل شيء.');
      assert.equal(await alerts.count(), 0);
      assert.deepEqual(JSON.parse(posts.at(-1)), { action: 'cancel', requestId: O1 });
      assert.deepEqual(errors, [], errors.join(' | '));
      await context.close();
      console.log('Synthetic merge page in Arabic at 390px: an empty address named before a request; ten answers to asking and twelve to agreeing each said in Arabic, an unknown one never as "nothing changed"; a request that never arrived said as unknown; the button to agree off until the name is typed letter for letter; merged said as a status with what moved and what stayed; declined and withdrawn said as a status');
    }

    {
      // Persian at a desk: a merge counted in Persian digits.
      state.answer = 'ok';
      const { context, tab, errors } = await open('fa', 1440);
      await tab.locator(`#merge-confirm-${R1}`).fill(' Halima Probe ');
      await tab.getByRole('button', { name: 'در این حساب ادغام شود', exact: true }).click();
      const status = tab.locator('main').getByRole('status');
      await status.waitFor();
      const done = (await status.innerText()).split('\n').map((line) => line.trim()).filter(Boolean);
      assert.deepEqual(done.slice(2), ['سابقهٔ یادگیری', 'ثبت‌نام‌ها در دوره‌ها: ۲', 'گواهی‌نامه‌ها: ۱', 'سابقه‌هایی که نزد حساب بسته‌شده ماندند، چون این حساب همان را از پیش داشت: ۳.']);
      await fits(tab, 1440, 'merge fa 1440');
      await shot(tab, 'merge-fa-1440');
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic merge page in Persian at 1440px: what moved and what stayed counted in Persian digits; a name typed with spaces around it confirms');
    }

    {
      // The switch off, a request waiting: the list and one button.
      state.board = { enabled: false, incoming: BOARD.incoming, outgoing: BOARD.outgoing };
      const { context, tab, errors } = await open('sw', 390);
      await tab.getByRole('heading', { level: 1, name: 'Kuunganisha akaunti', exact: true }).waitFor();
      const main = tab.locator('main');
      assert.equal(await main.locator('input').count(), 0);
      assert.equal(await main.locator('button').count(), 1);
      await fits(tab, 390, 'merge sw 390 off');
      await shot(tab, 'merge-sw-off');
      state.answer = 'gateway';
      await main.getByRole('button', { name: 'Ondoa ombi', exact: true }).click();
      await main.getByRole('alert').waitFor();
      assert.equal(await main.getByRole('alert').innerText(), 'Hakuna jibu lililorudi, kwa hiyo haijulikani kama hili lilifanyika. Pakia upya ukurasa huu ili uone hali ilivyo kabla ya kujaribu tena.');
      state.answer = 'ok';
      await main.getByRole('button', { name: 'Ondoa ombi', exact: true }).click();
      await main.getByRole('status').waitFor();
      assert.equal(await main.getByRole('status').innerText(), 'Ombi limeondolewa. Hakuna kilichohamishwa.');
      assert.equal(await main.getByRole('alert').count(), 0);
      assert.deepEqual(errors, []);
      await context.close();
      state.board = BOARD;
      console.log('Synthetic merge page in Swahili with the switch off and a request waiting: the list and one button; an unanswered withdrawal said as unknown; withdrawn said as a status');
    }
  }
  console.log('Merge HTTP smoke passed. Not real Auth, RLS or a real merge: the stand-in moves nothing, and the switch is off in the product.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
