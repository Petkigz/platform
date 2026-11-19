// Real Next /account/sharing and /share/invite/<token> pages and the
// /api/account/sharing route against an entirely synthetic loopback Auth/REST
// API. This is not evidence about hosted Supabase, JWT validation, RLS, or
// what a share lets anybody read: the stand-in answers whatever it is told to
// and shares nothing. What the database does is proved by its own suites.
//
// Inviting and accepting are behind `family.adult_shares`, which is off. The
// stand-in answers the switch as it is told to; nothing here switches it on.
//
// What it does show: the two screens a signed-in reader is sent, in English,
// Arabic, Persian, French by the reader's own choice, and English for a
// language held for review; that a state, a scope and a course's state are
// said from the catalogue and never printed as the database wrote them; that
// a list nobody could read is said as that, without the database's reason;
// that with the switch off a share can still be ended and nobody can be
// invited; the name and status the route gives each thing the database raises
// or answers, with no sentence of the database in any answer; and, with a
// browser, that a refusal is said in the reader's language and that an
// invitation nobody answered is said as unknown. The expected sentences are
// typed here rather than imported, so this fails if a catalogue changes
// without anybody looking at the page.
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

const LP = '99999999-9999-4999-8999-999999999999';
const S1 = '11111111-1111-4111-8111-111111111111';
const S2 = '22222222-2222-4222-8222-222222222222';
const S3 = '33333333-3333-4333-8333-333333333333';
const S4 = '44444444-4444-4444-8444-444444444444';
const L1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const L2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const L3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const L4 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const LINK = '5f0c7c0e-6a0d-4a57-9b0a-3a8f6f2f4e11';
const FAR = '2099-12-01T10:00:00Z';

// What the three functions raise, word for word, with the state each is
// raised under and the status PostgREST gives that state.
const RAISED = {
  signed_out: ['42501', 403, 'sign in first'],
  signed_out_accept: ['42501', 403, 'sign in to accept an invitation'],
  off: ['42501', 403, "sharing an adult's learning is not enabled on this platform"],
  email: ['23514', 400, 'that is not an email address'],
  scope: ['22023', 400, 'a share covers progress, achievements, or both'],
  days: ['22023', 400, 'an invitation lasts between 1 and 90 days'],
  no_profile: ['P0002', 404, 'there is no adult learner profile to share from'],
  own_address: ['23514', 400, 'that is your own address'],
  link: ['22023', 400, 'that invitation link is not complete'],
  no_invitation: ['P0002', 404, 'that invitation does not exist'],
  used: ['55000', 400, 'that invitation has already been accepted'],
  withdrawn: ['55000', 400, 'that invitation was withdrawn'],
  expired: ['55000', 400, 'that invitation has expired'],
  other_address: ['42501', 403, 'that invitation was sent to a different address'],
  have_it: ['23505', 409, 'you already have that share'],
  no_share: ['P0002', 404, `no share ${S1}`],
  not_yours: ['42501', 403, 'only the person who granted this share, or governance staff, may revoke it'],
  // Words these screens have no name for, under a state they know: refused.
  unknown_words: ['22023', 400, 'SYNTHETIC a sentence written after this page was'],
  // A state they do not know: nothing is known.
  timeout: ['57014', 500, 'canceling statement due to statement timeout'],
};
// Parts of the database's sentences that must reach no reader, in a page or an answer.
const DATABASE_WORDS = ['sign in first', 'sign in to accept', 'not enabled on this platform', 'that is not an email', 'a share covers', 'lasts between', 'adult learner profile', 'that is your own', 'link is not complete', 'that invitation', 'you already have that share', 'no share ', 'governance staff', 'SYNTHETIC', 'canceling statement', 'already revoked', 'has not shared their learning', 'family.adult_shares'];

const MINE = { shares: [
  { shareId: S1, granteeUserId: 'u1', granteeName: 'Yusuf <i>K</i>', scope: 'progress_and_achievements', status: 'active', grantedAt: '2026-11-01T10:00:00Z', expiresAt: FAR, revokedAt: null },
  { shareId: S2, granteeUserId: 'u2', granteeName: null, scope: 'progress', status: 'revoked', grantedAt: '2026-10-01T10:00:00Z', expiresAt: FAR, revokedAt: '2026-10-05T09:30:00Z' },
  { shareId: S3, granteeUserId: 'u3', granteeName: 'Maryam', scope: 'achievements', status: 'expired', grantedAt: '2026-08-01T10:00:00Z', expiresAt: '2026-09-01T10:00:00Z', revokedAt: null },
  { shareId: S4, granteeUserId: 'u4', granteeName: 'Bilal', scope: 'progress', status: 'active', grantedAt: '2026-11-10T10:00:00Z', expiresAt: null, revokedAt: null },
] };
const THEIRS = [
  { learner_profile_id: L1, scope: 'progress_and_achievements', granted_at: '2026-11-01T10:00:00Z', expires_at: FAR },
  { learner_profile_id: L2, scope: 'progress', granted_at: '2026-11-01T10:00:00Z', expires_at: null },
  // Ran out: not asked about at all.
  { learner_profile_id: L3, scope: 'progress', granted_at: '2026-01-01T10:00:00Z', expires_at: '2026-02-01T10:00:00Z' },
  // Ended between the list and the read: dropped, with nothing said.
  { learner_profile_id: L4, scope: 'progress', granted_at: '2026-11-01T10:00:00Z', expires_at: null },
];
const OVERVIEW = {
  [L1]: {
    learner: { id: L1, displayName: 'Khadija <b>A</b>' }, seesProgress: true, seesAchievements: true,
    shares: [{ scope: 'progress_and_achievements', grantedAt: '2026-11-01T10:00:00Z', expiresAt: FAR }],
    progress: { total: 5, rows: [
      { enrolmentId: 'e1', courseTitle: 'Tajwid <for> beginners', status: 'completed', lessonsCompleted: 12, lessonsTotal: 12, lastActivityAt: '2026-11-12T07:45:00Z' },
      { enrolmentId: 'e2', courseTitle: 'سيرة النبي', status: 'active', lessonsCompleted: 3, lessonsTotal: 10, lastActivityAt: null },
      // A state this screen has no word for: no badge, and the word is not printed.
      { enrolmentId: 'e3', courseTitle: 'Fiqh of prayer', status: 'SYNTHETIC-state', lessonsCompleted: 0, lessonsTotal: 4, lastActivityAt: null },
    ] },
    achievements: { total: 2, rows: [
      { certificateId: 'c1', certificateNumber: 'AS-2026-0007', courseTitle: 'Tajwid <for> beginners', status: 'issued', issuedAt: '2026-11-13T08:00:00Z', revokedAt: null },
      { certificateId: 'c2', certificateNumber: 'AS-2025-0002', courseTitle: 'Arabic one', status: 'revoked', issuedAt: '2025-05-01T08:00:00Z', revokedAt: '2025-06-01T08:00:00Z' },
    ] },
  },
  [L2]: {
    learner: { id: L2, displayName: null }, seesProgress: true, seesAchievements: false,
    shares: [{ scope: 'progress', grantedAt: '2026-11-01T10:00:00Z', expiresAt: null }, { scope: 'SYNTHETIC-scope', grantedAt: null, expiresAt: null }],
    progress: { total: 0, rows: [] }, achievements: { total: 0, rows: [] },
  },
};

const state = { on: true, email: true, profile: true, mine: MINE, theirs: THEIRS, answer: 'ok' };
const calls = [];
const WRITES = ['/rest/v1/rpc/invite_learning_share', '/rest/v1/rpc/accept_learning_share', '/rest/v1/rpc/revoke_adult_learning_share'];
const fake = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const json = { 'content-type': 'application/json' };
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{"message":"not authenticated"}'); return; }
    res.writeHead(200, json); res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  let sent = null; try { sent = JSON.parse(body); } catch { /* no body */ }
  calls.push({ method: req.method, path, sent });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  const broke = () => send({ code: 'XX000', message: 'SYNTHETIC the list broke', details: null, hint: null }, 500);
  const write = WRITES.includes(path);
  const what = path.slice('/rest/v1/rpc/'.length);
  if (path === '/rest/v1/rpc/setting_bool') send(sent?.p_key === 'family.adult_shares' ? state.on : sent?.p_key === 'delivery.notifications' ? state.email : false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Halima Probe', preferred_language: 'en', timezone: 'Africa/Kampala', account_status: 'active' }]);
  else if (path === '/rest/v1/learner_profiles') send(state.profile && url.searchParams.get('linked_user_id') === `eq.${user.id}` && url.searchParams.get('select') === 'id' ? [{ id: LP }] : []);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/rpc/my_policy_standing') send({ outstanding: 0, acceptanceRequired: [], history: [] });
  else if (path === '/rest/v1/rpc/my_learning_shares') { if (state.mine === 'error') broke(); else send(state.mine); }
  else if (path === '/rest/v1/adult_learning_shares') { if (state.theirs === 'error') broke(); else send(state.theirs); }
  else if (path === '/rest/v1/rpc/shared_learning_overview') {
    const overview = OVERVIEW[sent?.p_learner_profile_id];
    if (overview) send(overview); else send({ code: '42501', message: 'this person has not shared their learning with you', details: null, hint: null }, 403);
  }
  else if (write && state.answer === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); res.end('<html>bad gateway SYNTHETIC</html>'); }
  else if (write && state.answer === 'no_reply') send(null);
  else if (write && state.answer === 'word') send('SYNTHETIC not a reply');
  // Says something that cannot be so: an invitation with no id, a share with none, a share still active.
  else if (write && state.answer === 'liar') send(what === 'invite_learning_share' ? { expiresAt: FAR } : what === 'accept_learning_share' ? { scope: 'progress' } : { shareId: S1, status: 'active', changed: false });
  // Ending one that had been ended: what the function answers without raising.
  else if (write && state.answer === 'already_ended') send({ shareId: S1, status: 'revoked', changed: false, note: 'this share was already revoked' });
  else if (write && state.answer !== 'ok') { const [code, status, message] = RAISED[state.answer]; send({ code, message, details: null, hint: null }, status); }
  else if (what === 'invite_learning_share') send({ invitationId: 'SYNTHETIC-invitation-id', expiresAt: '2026-12-25T10:00:00Z' });
  else if (what === 'accept_learning_share') send({ shareId: 'SYNTHETIC-share-id', scope: 'progress' });
  else if (what === 'revoke_adult_learning_share') send({ shareId: sent?.p_share_id, status: 'revoked', changed: true, revokedAt: '2026-11-19T10:00:00Z' });
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
  const read = async (path, headers) => { const response = await request(path, { cookie, ...headers }); assert.equal(response.status, 200, `${path}: ${logs.slice(-2000)}`); return response.text(); };
  const page = (headers) => read('/account/sharing', headers);
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '');
  const writes = () => calls.filter((c) => WRITES.includes(c.path));
  const none = (text, words, label) => { for (const word of words) assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `${label} says "${word}"`); };
  const count = (text, piece) => text.split(piece).length - 1;
  const ENGLISH_ONLY = ['Sharing my learning', 'Account settings', 'Who can see my learning', 'Can see it', 'Ran out', 'End it', 'Invite somebody', 'Their email address', 'Send the invitation', 'Learning shared with me', 'Lessons completed', 'Certificates', 'Courses', 'Somebody with no name', 'Shared with you', 'In progress', 'Completed'];

  // ------------------------------------------------------------- signed out
  for (const path of ['/account/sharing', `/share/invite/${LINK}`]) {
    const out = await request(path);
    assert.ok([302, 303, 307, 308].includes(out.status), `signed out at ${path}: ${out.status}`);
    assert.ok(decodeURIComponent(decodeURIComponent(out.headers.get('location') ?? '')).includes(`/sign-in?next=${path}`), `${path}: sent to ${out.headers.get('location')}`);
  }

  // ---------------------------------------------------------------- English
  const english = await page({ 'accept-language': 'en' });
  const en = inner(english);
  assert.match(english, /<title>Sharing my learning[^<]*<\/title>/);
  for (const sentence of [
    '<a href="/account">Account settings</a>',
    '<h1>Sharing my learning</h1>',
    'Your learning is private, inside your family too. Nobody else sees any of it unless you invite them here, and anything you share can be ended here.',
    '<h2>Who can see my learning</h2>',
    'Can see it now: 2',
    // A name is text, never markup, and is set apart from the line it is in.
    '<bdi>Yusuf &lt;i&gt;K&lt;/i&gt;</bdi>',
    'Progress and certificates',
    'Somebody with no name',
    'No end date',
    '<h2>Invite somebody</h2>',
    'Type their email address and a link is sent to it. Nothing is shared until they open the link, sign in with that address and accept. Somebody who has no account yet can make one, and the same link works.',
    '<label for="share-email">Their email address</label>',
    'You are not told whether an address has an account here. Every address is answered the same way.',
    '<option value="progress" selected="">Progress</option><option value="achievements">Certificates</option><option value="progress_and_achievements">Progress and certificates</option>',
    '<option value="7" selected="">A week</option><option value="30">A month</option><option value="90">Three months</option>',
    'The link can be accepted until that day, and the share ends on that day too. To go on after it, invite them again.',
    '>Send the invitation</button>',
    '<h2>Learning shared with me</h2>',
    '<bdi>Khadija &lt;b&gt;A&lt;/b&gt;</bdi></h3>',
    'They can end this at any time, and you stop seeing it as soon as they do.',
    '<div class="n">5</div><div class="l">Courses</div>',
    '<div class="n">15</div><div class="l">Lessons completed</div>',
    '<span class="badge ok">Completed</span>',
    '<span class="badge neutral">In progress</span>',
    '<bdi>Tajwid &lt;for&gt; beginners</bdi>',
    'Lessons completed: 12 / 12',
    'Lessons completed: 3 / 10',
    'Shown here: 3 / 5',
    'Certificate \u2068AS-2026-0007\u2069',
    'Certificate \u2068AS-2025-0002\u2069 — revoked',
    // The second: no name, progress only, no end, and nothing yet.
    'Shared with you with no end date',
    'No courses yet.',
  ]) assert.ok(en.includes(sentence), `English sharing page lost "${sentence}"`);
  none(en, DATABASE_WORDS, 'the English sharing page');
  none(en, ['lang="en"', '{count}', '{date}', '{done}', '{total}', '{shown}', '{number}', '{email}', 'progress_and_achievements<', 'unknown', 'Email is switched off', 'switched off at the moment', '<code>', 'SYNTHETIC-invitation-id'], 'the English sharing page');
  // A state as the database wrote it, in its own lower case, is never the label.
  for (const raw of ['>revoked<', '>active<', '>expired<', '>completed<', '>issued<']) assert.ok(!en.includes(raw), `the English sharing page prints ${raw}`);
  // Every time carries its zone: the server does not know the reader's clock.
  for (const pattern of [/Shared on [^<]*2026[^<]*UTC/, /Until [^<]*2099[^<]*UTC/, /Ended on [^<]*2026[^<]*UTC/, /Shared with you until [^<]*2099[^<]*UTC/, /Last active on [^<]*2026[^<]*UTC/, /Issued on [^<]*2026[^<]*UTC/]) assert.match(en, pattern);
  for (const [badge, kind, n] of [['Can see it', 'warn', 2], ['Ended', 'neutral', 1], ['Ran out', 'neutral', 1]]) {
    assert.equal(count(en, `<span class="badge ${kind}">${badge}</span>`), n, `badges saying ${badge}`);
  }
  // Only a share somebody can still read through has a button; one ended or run out has none.
  assert.equal(count(en, '>End it</button>'), 2);
  // Two people share with this account; the one that ran out and the one that ended on the way are not drawn.
  assert.equal(count(en, '<div class="card"'), 2);
  const field = en.match(/<input[^>]*id="share-email"[^>]*>/)[0];
  for (const attribute of ['type="email"', 'dir="ltr"', 'autoComplete="off"', 'aria-describedby="share-email-help"']) assert.ok(field.toLowerCase().includes(attribute.toLowerCase()), `the field lost ${attribute}`);

  // --------------------------------------------- email off: said beside the form
  state.email = false;
  assert.ok(inner(await page({ 'accept-language': 'en' })).includes('Email is switched off at the moment. The invitation is kept and is sent once email is on.'));
  state.email = true;

  // --------------------------- the switch off: the list and its buttons, no form
  state.on = false;
  const off = inner(await page({ 'accept-language': 'en' }));
  assert.ok(off.includes('<div class="notice warn">Sharing your learning is switched off at the moment, so nobody can be invited. A share made earlier can still be ended here.</div>'));
  assert.equal(count(off, '>End it</button>'), 2, 'off: a share made earlier can still be ended');
  assert.equal(count(off, '<button'), 2);
  none(off, ['share-email', 'Invite somebody', 'Send the invitation', '<code>', 'family.adult_shares'], 'the page with sharing off');
  assert.ok(off.includes('<bdi>Khadija &lt;b&gt;A&lt;/b&gt;</bdi>'), 'off: what others share is still shown');
  state.on = true;

  // ------------------------------------------------ lists nobody could read
  state.mine = 'error';
  const unreadMine = inner(await page({ 'accept-language': 'en' }));
  assert.ok(unreadMine.includes('<div class="notice error" role="alert">The list of who can see your learning could not be read just now. Nothing was changed.</div>'));
  none(unreadMine, ['SYNTHETIC', 'Nobody can see your learning', 'End it'], 'the page with its own list unread');
  // Not being able to read the list does not stop an invitation.
  assert.ok(unreadMine.includes('>Send the invitation</button>'));
  state.mine = { shares: [{ shareId: S1, granteeUserId: 'u1', granteeName: 'x', scope: 'everything', status: 'active' }] };
  assert.ok(inner(await page({ 'accept-language': 'en' })).includes('The list of who can see your learning could not be read just now.'), 'a share with a scope nobody knows is drawn');
  state.mine = { shares: [] };
  assert.ok(inner(await page({ 'accept-language': 'en' })).includes('<p class="empty">Nobody can see your learning.</p>'));
  state.mine = MINE;
  state.theirs = 'error';
  const unreadTheirs = inner(await page({ 'accept-language': 'en' }));
  assert.ok(unreadTheirs.includes('<div class="notice error" role="alert">What others share with you could not be read just now. Nothing was changed.</div>'));
  none(unreadTheirs, ['SYNTHETIC', 'Nobody has shared'], 'the page with the other list unread');
  state.theirs = [];
  assert.ok(inner(await page({ 'accept-language': 'en' })).includes('<p class="empty">Nobody has shared their learning with you. It cannot be asked for: a person invites you from their own sharing page, and you see it once you accept.</p>'));
  state.theirs = THEIRS;

  // ------------------------------------------- an account with no learning record
  state.profile = false;
  const bare = inner(await page({ 'accept-language': 'en' }));
  assert.ok(bare.includes('<div class="notice">You have no learning record yet, so there is nothing of your own to share. One is made when you enrol in your first course. What others share with you is listed below.</div>'));
  none(bare, ['share-email', 'Invite somebody', 'Who can see my learning'], 'the page of an account with no learning record');
  assert.ok(bare.includes('<bdi>Khadija &lt;b&gt;A&lt;/b&gt;</bdi>'));
  state.profile = true;

  // ----------------------------------------------------------------- Arabic
  const arabic = await page({ 'accept-language': 'ar' });
  const ar = inner(arabic);
  assert.match(arabic.match(/<html[^>]*>/)[0], /dir="rtl"/);
  for (const sentence of ['<h1>مشاركة تعلّمي</h1>', 'تعلّمك خاص بك، حتى داخل أسرتك. لا يرى أحد غيرك شيئًا منه إلا إذا دعوته من هنا، وكل ما تشاركه يمكن إنهاؤه من هنا.', '<h2>من يستطيع رؤية تعلّمي</h2>', 'من يستطيع رؤيته الآن: 2', 'شخص بلا اسم', 'يستطيع رؤيته', 'انتهت مدتها', '>إنهاء المشاركة</button>', '<h2>دعوة شخص</h2>', 'لا تُخبَر هل للعنوان حساب هنا أم لا. كل عنوان يُجاب بالطريقة نفسها.', '>أسبوع</option>', '<h2>تعلّم يشاركه الآخرون معي</h2>', 'الدروس المكتملة: 12 / 12', 'المعروض هنا: 3 / 5', 'الشهادة \u2068AS-2026-0007\u2069', 'الشهادة \u2068AS-2025-0002\u2069 — أُلغيت', 'يُشارَك معك بلا تاريخ انتهاء', 'لا دورات بعد.', '<span class="badge ok">مكتملة</span>']) {
    assert.ok(ar.includes(sentence), `Arabic sharing page lacks "${sentence}"`);
  }
  none(ar, [...ENGLISH_ONLY, ...DATABASE_WORDS, 'lang="en"', '{'], 'the Arabic sharing page');

  // ---------------------------------------- Persian: counts in its own digits
  const fa = inner(await page({ 'accept-language': 'fa' }));
  for (const sentence of ['<h1>اشتراک‌گذاری یادگیری من</h1>', 'اکنون می‌توانند ببینند: ۲', 'درس‌های تکمیل‌شده: ۱۲ / ۱۲', 'نمایش‌داده‌شده در اینجا: ۳ / ۵', '<div class="n">۱۵</div>', '<h2>دعوت از کسی</h2>']) assert.ok(fa.includes(sentence), `Persian sharing page lacks "${sentence}"`);
  none(fa, [...ENGLISH_ONLY, ...DATABASE_WORDS], 'the Persian sharing page');

  // --------------------------------------------- French, by the reader's choice
  const fr = inner(await page({ 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` }));
  for (const sentence of ['<h1>Partager mon apprentissage</h1>', 'Peuvent le voir maintenant\u00a0: 2', 'Peut le voir', '>Arrêter</button>', '<h2>Inviter quelqu’un</h2>', '<h2>Apprentissages partagés avec moi</h2>', 'Affichés ici\u00a0: 3 / 5']) assert.ok(fr.includes(sentence), `French sharing page lacks "${sentence}"`);
  none(fr, DATABASE_WORDS, 'the French sharing page');

  // ------------------------------ Hausa: held for review, so English, marked
  const hausa = await page({ 'accept-language': 'ha' });
  assert.match(hausa.match(/<html[^>]*>/)[0], /lang="ha"/);
  assert.match(inner(hausa), /<div class="container section" lang="en" dir="ltr">/);
  for (const sentence of ['<h1>Sharing my learning</h1>', '<h2>Invite somebody</h2>', '<h2>Learning shared with me</h2>']) assert.ok(inner(hausa).includes(sentence), `the held-language sharing page lacks "${sentence}"`);

  assert.equal(writes().length, 0, 'opening the sharing page wrote something');
  console.log('Sharing page: signed out is sent to sign in; English with names and titles as text, every state, scope and course state said from the catalogue, every time with its zone, a button only on a share still read through; email off said beside the form; the switch off leaves the list and its buttons and no form; each list that cannot be read is said as unread with no reason; an account with no learning record is told so and still sees what others share; Arabic, Persian (its own digits) and French; English and marked for Hausa.');

  // ------------------------------------------------------- the invitation page
  {
    const invite = (headers, link = LINK) => read(`/share/invite/${link}`, headers);
    const open = await invite({ 'accept-language': 'en' });
    const shown = inner(open);
    assert.match(open, /<title>An invitation to see somebody’s learning[^<]*<\/title>/);
    assert.match(open, /<meta name="robots" content="noindex, nofollow"/);
    for (const sentence of [
      '<a href="/account/sharing">Sharing my learning</a>',
      '<h1>An invitation to see somebody’s learning</h1>',
      'If you accept, you will see the progress or the certificates this person chose to share, until the share runs out or they end it. Only they can end it.',
      'You are signed in with this address: <!-- --><strong><bdi dir="ltr">probe@example.invalid</bdi></strong>',
      'An invitation works only for the address it was sent to. If it was sent to another address, sign out and sign in with that one.',
      '<button type="button" class="btn">Accept the invitation</button>',
    ]) assert.ok(shown.replace('address: <strong>', 'address: <!-- --><strong>').includes(sentence), `English invitation page lost "${sentence}"`);
    none(shown, [...DATABASE_WORDS, '{address}', 'lang="en"'], 'the English invitation page');
    // Opening the link, however often, accepts nothing.
    assert.equal(writes().length, 0, 'opening an invitation accepted it');

    for (const link of ['not-a-token', '5f0c7c0e-6a0d-4a57-9b0a', 'not%20a%20token', `${LINK}0`]) {
      const bad = inner(await invite({ 'accept-language': 'en' }, link));
      assert.ok(bad.includes('<div class="notice error" role="alert">This invitation link is not complete. Ask the person who sent it for a new one.</div>'), `${link}: not said as incomplete`);
      none(bad, ['<button', 'fresh one', 'Accept the invitation'], `the page of the link ${link}`);
    }
    state.on = false;
    const paused = inner(await invite({ 'accept-language': 'en' }));
    assert.ok(paused.includes('<div class="notice warn">Sharing is switched off at the moment, so this invitation cannot be accepted yet. Nothing has been shared with you.</div>'));
    none(paused, ['<button', 'not enabled'], 'the invitation page with sharing off');
    state.on = true;

    const arab = inner(await invite({ 'accept-language': 'ar' }));
    for (const sentence of ['<h1>دعوة لرؤية تعلّم شخص</h1>', 'إذا قبلت فسترى التقدّم أو الشهادات التي اختار هذا الشخص مشاركتها، حتى تنتهي مدة المشاركة أو ينهيها هو. لا ينهيها إلا هو.', 'الدعوة لا تعمل إلا للعنوان الذي أُرسلت إليه. إذا أُرسلت إلى عنوان آخر فاخرج ثم سجّل الدخول بذلك العنوان.', '>قبول الدعوة</button>', '<bdi dir="ltr">probe@example.invalid</bdi>']) assert.ok(arab.includes(sentence), `Arabic invitation page lacks "${sentence}"`);
    none(arab, ['An invitation', 'Accept the invitation', 'You are signed in', ...DATABASE_WORDS, '{'], 'the Arabic invitation page');
    const held = inner(await invite({ 'accept-language': 'ha' }));
    assert.match(held, /<div class="container section" lang="en" dir="ltr">/);
    assert.ok(held.includes('>Accept the invitation</button>'));
    assert.equal(writes().length, 0);
    console.log('Invitation page: signed out is sent to sign in and back; never indexed; opening the link accepts nothing; a link that is not a token is said as incomplete with no button; the switch off says so with no button; the address signed in is set apart and left to right; Arabic; English and marked for Hausa.');
  }

  // -------------------------------------------------------------------- route
  const post = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/account/sharing`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: response.status, text, json, cache: response.headers.get('cache-control') };
  };
  const clean = (answer, label) => {
    assert.equal(answer.cache, 'no-store', `${label}: an answer a cache may keep`);
    none(answer.text, DATABASE_WORDS, `${label}: the answer`);
  };
  const INVITE = { action: 'invite', email: 'other@example.invalid', scope: 'progress', days: 7 };
  const ACCEPT = { action: 'accept', token: LINK };
  const END = { action: 'revoke', shareId: S1 };
  {
    const before = writes().length;
    const signedOut = await post(INVITE, {});
    assert.equal(signedOut.status, 401); assert.equal(signedOut.json.code, 'signed_out'); clean(signedOut, 'signed out');
    for (const [label, body] of [
      ['not JSON', '{'], ['a list', '[]'], ['no action', {}], ['an action nobody has', { action: 'grant', email: 'other@example.invalid' }],
      // The one that asked whether an address has an account is gone.
      ['looking an address up', { action: 'resolve', email: 'other@example.invalid' }], ['looking an address up, as it was', { action: 'lookup', email: 'other@example.invalid' }],
      ['an address that is not text', { ...INVITE, email: 7 }], ['an address too long to be one', { ...INVITE, email: `${'a'.repeat(400)}@example.invalid` }],
      ['a scope that is not offered', { ...INVITE, scope: 'everything' }], ['no scope', { action: 'invite', email: 'other@example.invalid', days: 7 }],
      ['a length that is not a number of days', { ...INVITE, days: 'forever' }], ['a length of no days', { ...INVITE, days: 0 }], ['a length past ninety days', { ...INVITE, days: 365 }], ['half a day', { ...INVITE, days: 1.5 }],
      ['a share that is not an id', { action: 'revoke', shareId: 'all' }], ['no share', { action: 'revoke' }], ['a share that is a number', { action: 'revoke', shareId: 7 }],
    ]) {
      const answer = await post(body);
      assert.equal(answer.status, 400, `${label}: ${answer.text}`); assert.equal(answer.json.code, 'malformed', label); clean(answer, label);
    }
    // Two the route can name itself.
    for (const email of ['   ', 'nobody', 'a@b', 'two words@example.invalid', `${'a'.repeat(330)}@example.invalid`]) {
      const answer = await post({ ...INVITE, email });
      assert.equal(answer.status, 400, email); assert.equal(answer.json.code, 'email', email); clean(answer, 'an address that is not one');
    }
    for (const bad of ['', 'not-a-token', 7, null, `${LINK}0`]) {
      const answer = await post({ action: 'accept', token: bad });
      assert.equal(answer.status, 400, String(bad)); assert.equal(answer.json.code, 'link', String(bad)); clean(answer, 'a link that is not a token');
    }
    assert.equal(writes().length, before, 'a request the route refused itself reached the database');
    assert.equal((await request('/api/account/sharing', { cookie })).status, 405);
  }
  {
    // The switch off: nobody is invited and nothing is accepted, and neither asks the database to.
    state.on = false;
    const before = writes().length;
    for (const body of [INVITE, ACCEPT]) {
      const answer = await post(body);
      assert.equal(answer.status, 409, body.action); assert.equal(answer.json.code, 'off', body.action); clean(answer, `${body.action} with the switch off`);
    }
    assert.equal(writes().length, before, 'the switch off still reached the database');
    // Ending is not stopped: a share made while it was on is still read through.
    const ended = await post(END);
    assert.equal(ended.status, 200, ended.text); assert.deepEqual(ended.json, { ok: true, did: 'ended' });
    assert.deepEqual(writes().at(-1), { method: 'POST', path: '/rest/v1/rpc/revoke_adult_learning_share', sent: { p_share_id: S1 } });
    state.on = true;
  }
  const NAMED = [
    // [the stand-in's answer, what is sent, status, name]
    ['signed_out', INVITE, 401, 'signed_out'], ['signed_out', END, 401, 'signed_out'], ['signed_out_accept', ACCEPT, 401, 'signed_out'],
    ['off', INVITE, 409, 'off'], ['off', ACCEPT, 409, 'off'],
    ['email', INVITE, 400, 'email'], ['scope', INVITE, 400, 'malformed'], ['days', INVITE, 400, 'malformed'],
    ['no_profile', INVITE, 409, 'no_profile'], ['own_address', INVITE, 400, 'own_address'],
    ['link', ACCEPT, 400, 'link'], ['no_invitation', ACCEPT, 404, 'no_invitation'], ['used', ACCEPT, 409, 'used'], ['withdrawn', ACCEPT, 409, 'withdrawn'],
    ['expired', ACCEPT, 409, 'expired'], ['other_address', ACCEPT, 403, 'other_address'], ['have_it', ACCEPT, 409, 'have_it'],
    ['no_share', END, 404, 'no_share'], ['not_yours', END, 403, 'not_yours'],
    ['unknown_words', INVITE, 409, 'refused'], ['unknown_words', ACCEPT, 409, 'refused'], ['unknown_words', END, 409, 'refused'],
    ['timeout', INVITE, 502, 'failed'], ['gateway', INVITE, 502, 'failed'], ['no_reply', INVITE, 502, 'failed'], ['word', INVITE, 502, 'failed'], ['liar', INVITE, 502, 'failed'],
    ['timeout', ACCEPT, 502, 'failed'], ['gateway', ACCEPT, 502, 'failed'], ['no_reply', ACCEPT, 502, 'failed'], ['liar', ACCEPT, 502, 'failed'],
    ['timeout', END, 502, 'failed'], ['gateway', END, 502, 'failed'], ['no_reply', END, 502, 'failed'], ['liar', END, 502, 'failed'],
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
    const invited = await post({ action: 'invite', email: ' Other@Example.invalid ', scope: 'achievements', days: '30' });
    assert.equal(invited.status, 200, invited.text); clean(invited, 'an invitation');
    // Until when, and nothing else: the invitation's id stays where it was made.
    assert.deepEqual(invited.json, { ok: true, did: 'invited', expiresAt: '2026-12-25T10:00:00Z' });
    assert.deepEqual(writes().at(-1), { method: 'POST', path: '/rest/v1/rpc/invite_learning_share', sent: { p_email: 'other@example.invalid', p_scope: 'achievements', p_days: 30 } });
    const accepted = await post({ action: 'accept', token: ` ${LINK.toUpperCase()} ` });
    assert.equal(accepted.status, 200); clean(accepted, 'an acceptance');
    assert.deepEqual(accepted.json, { ok: true, did: 'accepted' });
    assert.deepEqual(writes().at(-1).sent, { p_token: LINK });
    const ended = await post(END);
    assert.deepEqual(ended.json, { ok: true, did: 'ended' }); clean(ended, 'an ending');
    assert.deepEqual(writes().at(-1).sent, { p_share_id: S1 });
    // Ending one already ended is ended: that is what was asked for.
    state.answer = 'already_ended';
    const again = await post(END);
    assert.equal(again.status, 200); assert.deepEqual(again.json, { ok: true, did: 'ended' }); clean(again, 'ending twice');
    state.answer = 'ok';
    // Nobody sends who is asking.
    for (const call of writes()) assert.ok(!JSON.stringify(call.sent).includes(user.id), 'an actor was sent');
  }
  console.log(`Sharing route: signed out 401; seventeen requests it does not understand 400 "malformed" (two of them the old question of whether an address has an account), five addresses that are not one 400 "email" and five links that are not a token 400 "link", none of which asked the database; GET 405. The switch off refuses inviting and accepting 409 "off" without asking the database, and still ends a share. ${NAMED.length} answers of the database each under their own name with nothing beside it: a refusal 4xx, a reply that cannot be so and every unknown state 502 "failed". No answer carries a sentence of the database or an invitation's id, and every answer is no-store.`);

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (code, width, path = '/account/sharing') => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', deviceScaleFactor: process.env.RESPONSIVE_SCREENSHOTS ? 2 : 1 });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      tab.on('console', (m) => { if (m.type() === 'error' && /hydrat/i.test(m.text())) errors.push(m.text()); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
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

    state.answer = 'ok';
    for (const [code, heading] of [['en', 'Sharing my learning'], ['ar', 'مشاركة تعلّمي'], ['ta', null], ['fil', null]]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await open(code, width);
        if (heading) await tab.getByRole('heading', { level: 1, name: heading, exact: true }).waitFor();
        else await tab.locator('main h1').waitFor();
        await fits(tab, width, `sharing ${code} ${width}`);
        // The address is left to right whatever the page.
        assert.equal(await tab.locator('#share-email').evaluate((el) => getComputedStyle(el).direction), 'ltr');
        assert.deepEqual(errors, [], `sharing ${code} ${width}: ${errors.join(' | ')}`);
        if ([390, 1440].includes(width)) await shot(tab, `sharing-${code}-${width}`);
        await context.close();
      }
      console.log(`Synthetic sharing page in ${code}: fits at 320, 390 and 1440px; no hydration error`);
    }

    const UNKNOWN = 'لم يصل أي رد، ولذلك لا يُعرف هل تمّ هذا. أعد تحميل هذه الصفحة لترى الحال قبل أن تحاول مرة أخرى.';
    {
      // Arabic, a phone-sized screen.
      const { context, tab, errors } = await open('ar', 390);
      const posts = []; tab.on('request', (r) => { if (r.url().includes('/api/account/sharing')) posts.push(r.postData()); });
      const alerts = tab.locator('main').getByRole('alert');
      const status = tab.locator('main').getByRole('status');
      const says = async (sentence, label) => {
        await tab.waitForFunction((want) => [...document.querySelectorAll('main [role="alert"]')].some((el) => el.textContent === want), sentence, { timeout: 15000 }).catch(async () => { throw new Error(`${label}: the page says "${await alerts.allInnerTexts()}"`); });
        assert.equal(await alerts.count(), 1, label);
        assert.equal(await status.count(), 0, `${label}: a refusal beside a confirmation`);
      };

      // Inviting: something that is not an address is named before anything is sent.
      const invite = tab.getByRole('button', { name: 'إرسال الدعوة', exact: true });
      for (const wrong of ['', 'nobody']) {
        await tab.locator('#share-email').fill(wrong);
        await invite.click();
        await says('هذا ليس عنوان بريد إلكتروني. لم يُرسل شيء.', `"${wrong}" as an address`);
      }
      assert.equal(posts.length, 0, 'something that is not an address was sent');
      await tab.locator('#share-email').fill('Other@Example.invalid');
      await tab.locator('#share-scope').selectOption('progress_and_achievements');
      await tab.locator('#share-days').selectOption('90');
      for (const [answer, sentence] of [
        ['own_address', 'هذا عنوانك أنت. لم يُرسل شيء.'],
        ['no_profile', 'ليس لهذا الحساب سجل تعلّم خاص به ليشاركه. لم يُرسل شيء.'],
        ['email', 'هذا ليس عنوان بريد إلكتروني. لم يُرسل شيء.'],
        ['off', 'مشاركة التعلّم موقوفة حاليًا، فلا يمكن دعوة أحد. المشاركة التي أُنشئت من قبل يمكن إنهاؤها من هنا.'],
        ['signed_out', 'لقد خرجت من الحساب. سجّل الدخول مرة أخرى ثم حاول من جديد. لم يتغيّر شيء.'],
        ['unknown_words', 'لم تقبل المنصة هذا. لم يتغيّر شيء.'],
        // An invitation may have gone to somebody's mailbox: never "nothing was sent".
        ['timeout', UNKNOWN], ['gateway', UNKNOWN], ['no_reply', UNKNOWN], ['liar', UNKNOWN],
      ]) {
        state.answer = answer;
        await invite.click();
        await says(sentence, `inviting, ${answer}`);
        assert.equal(await tab.locator('#share-email').inputValue(), 'Other@Example.invalid', `${answer}: the address was thrown away`);
      }
      // The request never arrives at all.
      await tab.route('**/api/account/sharing', (r) => r.abort());
      await invite.click();
      await says(UNKNOWN, 'a request that never arrived');
      assert.equal(await invite.isDisabled(), false, 'the button stayed busy after a request that never arrived');
      await tab.unroute('**/api/account/sharing');
      state.answer = 'ok';
      await invite.click();
      await status.waitFor();
      // Said the same way whether or not the address has an account, with until when.
      const done = await status.innerText();
      assert.ok(done.startsWith('سُجّلت دعوة لهذا العنوان: other@example.invalid يمكن قبولها حتى '), done);
      assert.match(done, /2026/);
      none(done, ['{', 'SYNTHETIC', 'found', 'حساب'], 'what is said after inviting');
      assert.equal(await status.locator('bdi').evaluate((el) => getComputedStyle(el).direction), 'ltr');
      assert.equal(await alerts.count(), 0);
      assert.equal(await tab.locator('#share-email').inputValue(), '');
      assert.deepEqual(JSON.parse(posts.at(-1)), { action: 'invite', email: 'other@example.invalid', scope: 'progress_and_achievements', days: 90 });
      await fits(tab, 390, 'sharing ar 390 after inviting');
      await shot(tab, 'sharing-ar-invited');

      // Ending.
      const end = tab.getByRole('button', { name: 'إنهاء المشاركة', exact: true }).first();
      for (const [answer, sentence] of [
        ['no_share', 'تلك المشاركة لم تعد موجودة. لم يتغيّر شيء.'],
        ['not_yours', 'لا ينهي المشاركة إلا من أنشأها. لم يتغيّر شيء.'],
        ['unknown_words', 'لم تقبل المنصة هذا. لم يتغيّر شيء.'],
        ['timeout', UNKNOWN], ['gateway', UNKNOWN], ['liar', UNKNOWN],
      ]) {
        state.answer = answer;
        await end.click();
        await says(sentence, `ending, ${answer}`);
      }
      const shown = await tab.locator('main').innerText();
      none(shown, [...DATABASE_WORDS, 'Nothing was changed', 'Nothing was sent', 'could not be confirmed'], 'the Arabic page after its refusals');
      await shot(tab, 'sharing-ar-refused');
      for (const answer of ['already_ended', 'ok']) {
        state.answer = answer;
        await end.click();
        await tab.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent === 'أُنهيت تلك المشاركة. لم يعد يستطيع رؤيته.');
        assert.equal(await alerts.count(), 0);
      }
      assert.deepEqual(JSON.parse(posts.at(-1)), { action: 'revoke', shareId: S1 });
      assert.deepEqual(errors, [], errors.join(' | '));
      await context.close();
      console.log('Synthetic sharing page in Arabic at 390px: something that is not an address named before a request; ten answers to inviting and six to ending each said in Arabic, an unknown one never as "nothing was sent"; a request that never arrived said as unknown; invited said as a status with the address left to right and until when, the same for every address; ended said as a status, also when it had been ended already');
    }

    {
      // The switch off, in Swahili: the list and its buttons.
      state.on = false; state.answer = 'ok';
      const { context, tab, errors } = await open('sw', 390);
      await tab.getByRole('heading', { level: 1, name: 'Kushiriki masomo yangu', exact: true }).waitFor();
      const main = tab.locator('main');
      assert.equal(await main.locator('input, select').count(), 0);
      assert.equal(await main.locator('button').count(), 2);
      await fits(tab, 390, 'sharing sw 390 off');
      await shot(tab, 'sharing-sw-off');
      await main.getByRole('button', { name: 'Sitisha', exact: true }).first().click();
      await main.getByRole('status').waitFor();
      assert.equal(await main.getByRole('status').innerText(), 'Ushiriki huo umesitishwa. Hawezi kuona tena.');
      assert.equal(await main.getByRole('alert').count(), 0);
      assert.deepEqual(errors, []);
      await context.close();
      state.on = true;
      console.log('Synthetic sharing page in Swahili with the switch off: the list and two buttons, no form; a share ended and said as a status');
    }

    {
      // The invitation, in Arabic at a phone's width and French at a desk.
      const { context, tab, errors } = await open('ar', 390, `/share/invite/${LINK}`);
      const posts = []; tab.on('request', (r) => { if (r.url().includes('/api/account/sharing')) posts.push(r.postData()); });
      const alerts = tab.locator('main').getByRole('alert');
      const accept = tab.getByRole('button', { name: 'قبول الدعوة', exact: true });
      await accept.waitFor();
      await fits(tab, 390, 'invitation ar 390');
      for (const [answer, sentence] of [
        ['no_invitation', 'لا توجد دعوة كهذه. لم يُشارَك شيء.'],
        ['used', 'هذه الدعوة قُبلت من قبل.'],
        ['withdrawn', 'سُحبت هذه الدعوة. لم يُشارَك شيء.'],
        ['expired', 'انتهت مدة هذه الدعوة. اطلب دعوة جديدة ممن أرسلها.'],
        ['other_address', 'أُرسلت هذه الدعوة إلى عنوان آخر. لم يُشارَك شيء.'],
        ['have_it', 'هذا الشخص يشارك ذلك معك من قبل.'],
        ['off', 'المشاركة موقوفة حاليًا، فلا يمكن قبول هذه الدعوة بعد. لم يُشارَك معك شيء.'],
        ['link', 'رابط الدعوة هذا غير مكتمل. اطلب رابطًا جديدًا ممن أرسله.'],
        ['signed_out_accept', 'لقد خرجت من الحساب. سجّل الدخول مرة أخرى ثم حاول من جديد. لم يتغيّر شيء.'],
        ['unknown_words', 'لم تقبل المنصة هذا. لم يتغيّر شيء.'],
        // A share may have been made: never "nothing was shared".
        ['timeout', UNKNOWN], ['gateway', UNKNOWN], ['no_reply', UNKNOWN], ['liar', UNKNOWN],
      ]) {
        state.answer = answer;
        await accept.click();
        await tab.waitForFunction((want) => document.querySelector('main [role="alert"]')?.textContent === want, sentence, { timeout: 15000 }).catch(async () => { throw new Error(`accepting, ${answer}: the page says "${await alerts.allInnerTexts()}"`); });
        assert.equal(await accept.isDisabled(), false, `${answer}: the button stayed busy`);
        assert.equal(new URL(tab.url()).pathname, `/share/invite/${LINK}`, `${answer}: the reader was moved on`);
      }
      await tab.route('**/api/account/sharing', (r) => r.abort());
      await accept.click();
      await tab.waitForFunction((want) => document.querySelector('main [role="alert"]')?.textContent === want, UNKNOWN);
      await tab.unroute('**/api/account/sharing');
      none(await tab.locator('main').innerText(), [...DATABASE_WORDS, 'Nothing was'], 'the Arabic invitation page after its refusals');
      await shot(tab, 'invitation-ar-refused');
      state.answer = 'ok';
      await accept.click();
      await tab.waitForURL(`${origin}/account/sharing`);
      await tab.getByRole('heading', { level: 1, name: 'مشاركة تعلّمي', exact: true }).waitFor();
      assert.deepEqual(JSON.parse(posts.at(-1)), { action: 'accept', token: LINK });
      assert.deepEqual(errors, [], errors.join(' | '));
      await context.close();
      const desk = await open('fr', 1440, `/share/invite/${LINK}`);
      await desk.tab.getByRole('heading', { level: 1, name: 'Une invitation à voir l’apprentissage de quelqu’un', exact: true }).waitFor();
      await fits(desk.tab, 1440, 'invitation fr 1440');
      await shot(desk.tab, 'invitation-fr-1440');
      assert.deepEqual(desk.errors, []);
      await desk.context.close();
      console.log('Synthetic invitation page in Arabic at 390px: fourteen answers to accepting each said in Arabic with the reader left where they were, an unknown one never as "nothing was shared"; a request that never arrived said as unknown; accepted sends the reader to the sharing page. French fits at 1440px.');
    }
  }
  console.log('Sharing HTTP smoke passed. Not real Auth, RLS or a real share: the stand-in shares nothing, and the switch is off in the product.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
