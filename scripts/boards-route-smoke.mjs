// Real Next /discuss pages, the /api/boards route and the /admin/boards staff
// queue against an entirely synthetic loopback Auth/REST API. This is not
// evidence about hosted Supabase, JWT validation, RLS, or any rule inside the
// board functions (who is let in, the limits, the audit log): the stand-in
// keeps a small board in memory, lets in whoever this script says, and
// refuses only when told to. supabase/tests/discussion_boards.test.mjs holds
// the rules, against the real migration. Every username, post and reason
// here is invented.
//
// What it does show: the page somebody is sent when a board is open to them,
// when it is not, when it is switched off and when it could not be read, in
// English, in Arabic and in English for a language held for review; that the
// four sentences said before a first post are on the board's page; that what
// people wrote is drawn as written, in no known language, with markup made
// text; that no page a member is sent holds an account or a name; the name
// and status the route gives each refusal; that the database's own sentences
// reach nobody on a member's page; and, in a browser, that a username can be
// chosen, a thread started, answered, reported and taken back, and that the
// staff desk can see who wrote a post only with a reason.
// The expected sentences are typed here rather than imported, so this fails
// if a catalogue changes without anybody looking at the page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@synthetic.example', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;

// A sentence only the database would write. It must reach no member.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE permission denied for table board_threads';
// The account and the name behind somebody else's username. No member page may hold either.
const OTHER_ACCOUNT = '5b0e4c1a-93d7-4c55-a1f0-7d2c9e6b4a11';
const OTHER_NAME = 'Synthetic Person Behind The Name';
const THREAD = '7c1d9f52-2a0b-4f36-8f4e-1c9a52a0d001';
const REPLY = '7c1d9f52-2a0b-4f36-8f4e-1c9a52a0d002';
const GONE_REPLY = '7c1d9f52-2a0b-4f36-8f4e-1c9a52a0d003';
const HANDLE_ID = '7c1d9f52-2a0b-4f36-8f4e-1c9a52a0d004';
const AT = '2026-11-20T09:14:00+00:00';
const UNTIL = '2027-03-01T00:00:00+00:00';
const LONG = `synthetic-word-with-no-place-to-break-${'x'.repeat(120)}`;
// Markup that must stay text, and Arabic inside English.
const BODY = `Synthetic question: how long should I <b>practise</b> & when?\n\nسؤال عن التجويد ${LONG}`;
const BODY_HTML = `Synthetic question: how long should I &lt;b&gt;practise&lt;/b&gt; &amp; when?\n\nسؤال عن التجويد ${LONG}`;

const standing = (board, more = {}) => ({ board, open: true, kind: 'student', until: null, handle: null, handleFixed: false, blocked: false, moderator: false, ...more });
const fresh = () => ({
  // What my_board() answers for each board.
  students: standing('students', { handle: 'synthetic_me', handleFixed: true }),
  teachers: standing('teachers', { kind: null }),
  threads: [{ id: THREAD, title: 'Synthetic title <i>as typed</i>', body: BODY, handle: 'synthetic_other', kind: 'teacher', mine: false, state: 'visible', createdAt: AT, lastActivityAt: AT,
    replies: [
      { id: REPLY, body: 'Synthetic answer, ten minutes a day.', handle: 'synthetic_me', kind: 'student', mine: true, state: 'visible', createdAt: AT },
      { id: GONE_REPLY, mine: false, state: 'withdrawn', createdAt: AT },
    ] }],
  more: false,
  reports: [],
  staff: false,
  // Paths that answer with a database error, and ones that answer nonsense.
  broken: new Set(), nonsense: new Set(),
  // What a writer answers instead of doing it: [status, body].
  refuse: null,
});
let state = fresh();

const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  const signedIn = req.headers.authorization === `Bearer ${token}`;
  if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(401); res.end('{}'); return; }
  const path = new URL(req.url, 'http://localhost').pathname;
  const p = body ? JSON.parse(body) : {};
  calls.push({ path, payload: p, signedIn });
  const send = (value) => res.end(JSON.stringify(value));
  const raise = (name, status = 400) => { res.writeHead(status); send({ code: 'P0001', message: `board:${name}`, details: null, hint: null }); };
  if (state.broken.has(path)) { res.writeHead(500); send({ code: 'XX000', message: DATABASE_SENTENCE }); return; }
  if (state.nonsense.has(path)) { send({ SYNTHETIC: 'not what was asked for' }); return; }
  if (path === '/rest/v1/rpc/setting_bool') { send(false); return; }
  if (!signedIn) { res.writeHead(401); res.end('{}'); return; }
  const fn = path.replace('/rest/v1/rpc/', '');
  const thread = state.threads.find((t) => t.id === p.p_thread);
  const writers = ['set_board_handle', 'post_board_thread', 'post_board_reply', 'withdraw_board_post', 'report_board_post', 'moderate_board_post', 'block_board_handle', 'board_author', 'board_kept_post'];
  if (writers.includes(fn) && state.refuse) { res.writeHead(state.refuse[0]); send(state.refuse[1]); return; }
  if (fn === 'my_board') send(state[p.p_board]);
  else if (fn === 'board_threads_page') send({ more: state.more, threads: state.threads.filter((t) => t.state === 'visible').map((t) => ({ id: t.id, title: t.title, handle: t.handle, kind: t.kind, mine: t.mine, replies: t.replies.filter((r) => r.state === 'visible').length, createdAt: t.createdAt, lastActivityAt: t.lastActivityAt })) });
  else if (fn === 'board_thread') {
    if (!thread) return raise('not_found');
    const { replies, lastActivityAt: _last, ...first } = thread;
    send({ thread: { ...first, board: 'students' }, replies });
  }
  else if (fn === 'set_board_handle') { state.students = { ...state.students, handle: p.p_handle }; send({ handle: p.p_handle }); }
  else if (fn === 'post_board_thread') {
    const id = randomUUID();
    state.threads.unshift({ id, title: p.p_title, body: p.p_body, handle: state.students.handle, kind: 'student', mine: true, state: 'visible', createdAt: AT, lastActivityAt: AT, replies: [] });
    state.students = { ...state.students, handleFixed: true };
    send({ threadId: id });
  }
  else if (fn === 'post_board_reply') {
    if (!thread) return raise('not_found');
    const id = randomUUID();
    thread.replies.push({ id, body: p.p_body, handle: state.students.handle, kind: 'student', mine: true, state: 'visible', createdAt: AT });
    send({ threadId: thread.id, replyId: id });
  }
  else if (fn === 'withdraw_board_post') {
    if (!thread) return raise('not_found');
    if (p.p_reply) { const r = thread.replies.find((x) => x.id === p.p_reply); r.state = 'withdrawn'; delete r.body; delete r.handle; delete r.kind; }
    else thread.state = 'withdrawn';
    send({ threadId: thread.id, replyId: p.p_reply ?? null, state: 'withdrawn' });
  }
  else if (fn === 'report_board_post') { state.reports.push({ thread: p.p_thread, reply: p.p_reply, reason: p.p_reason }); send({ reported: true }); }
  else if (fn === 'can_moderate_boards') send(state.staff);
  else if (fn === 'board_report_queue') {
    if (!state.staff) return raise('not_allowed', 403);
    send({ students: true, teachers: false, reports: state.reports.map((r) => { const t = state.threads.find((x) => x.id === r.thread); return { threadId: t.id, replyId: null, board: 'students', title: t.title, body: t.body, handleId: HANDLE_ID, handle: t.handle, kind: t.kind, blocked: false, postedAt: AT, reports: 1, firstReportedAt: AT, reasons: [r.reason] }; }) });
  }
  else if (fn === 'board_author') send({ handle: 'synthetic_other', userId: OTHER_ACCOUNT, name: OTHER_NAME });
  else if (fn === 'board_kept_post') {
    if (!state.staff) return raise('not_allowed', 403);
    if (!state.kept) { res.writeHead(400); send({ code: 'P0002', message: 'board:not_found', details: null, hint: null }); return; }
    send(state.kept);
  }
  else if (fn === 'moderate_board_post') { if (p.p_remove) thread.state = 'removed'; state.reports = state.reports.filter((r) => r.thread !== p.p_thread); send({ removed: p.p_remove, reportsClosed: 1 }); }
  else if (fn === 'block_board_handle') send({ blocked: p.p_block });
  else if (fn === 'notification_badge') send(0);
  else if (fn === 'has_role') send(state.staff);
  else if (path.startsWith('/rest/v1/rpc/')) send({});
  else { res.writeHead(404); res.end('{}'); }
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = resolve(import.meta.dirname, '..');
const rpcs = (name) => calls.filter((c) => c.path === `/rest/v1/rpc/${name}`);
const refusal = (name, status = 400) => [status, { code: 'P0001', message: `board:${name}`, details: null, hint: null }];

const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const seen = { logs: '' };
const origin = `http://localhost:${port}`;

const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'').replaceAll('&quot;', '"');
const has = (html, sentences, what) => { for (const sentence of sentences) assert.ok(html.includes(sentence), `${what} lacks "${sentence}"\n${html.slice(0, 9000)}`); };
const hasNot = (html, sentences, what) => { for (const sentence of sentences) assert.ok(!html.includes(sentence), `${what} still says "${sentence}"`); };
// What no member's page may hold: the database's words, an account, a name, a stored word shown as a sentence.
const NEVER = ['SYNTHETIC-DATABASE', 'board:', OTHER_ACCOUNT, OTHER_NAME, user.id, user.email, HANDLE_ID, '>withdrawn<', '>removed<', '>visible<'];
// English a translated page must not hold. Everything a person typed begins "Synthetic" or "synthetic_".
const ENGLISH_ONLY = ['Discussion', 'Students', 'Teachers', 'username', 'Before you write', 'Staff', 'Report', 'Take this back', 'Post it', 'Replies', 'could not be read', 'paid class', 'Older posts', 'not translated', 'Yours'];
const RULES = [
  'Other people see your username and whether you are a student, a teacher or staff. They do not see your name.',
  'Staff can find out who wrote a post when it has been reported or when somebody may be in danger. Every time they look, it is recorded.',
  'What you write can still show who you are. Do not put a name, a phone number or an address in a post, whether yours or anybody else’s.',
  'A post is shown as soon as you send it. Nobody reads it first. If a post should not be here, report it.',
];
const NOT_STUDENT = 'The students’ discussion is for students with a paid class. It opens when a class that was paid for is active on your account: one that was bought, one on a plan, a sponsored seat or a seat from a school. A free course does not open it. It closes again when that class or plan ends.';
const UNREAD = 'The discussion could not be read. This page sent nothing and changed nothing.';
const AR = {
  title: 'النقاش', students: 'نقاش الطلاب',
  ruleStaff: 'يستطيع فريق العمل معرفة من كتب منشورًا إذا بُلِّغ عنه أو إذا كان أحد في خطر. وفي كل مرة ينظرون يُسجَّل ذلك.',
  notStudent: 'نقاش الطلاب للطلاب الذين لهم صف مدفوع. يُفتح عندما يكون في حسابك صف مدفوع ساري: صف اشتُري، أو صف ضمن خطة، أو مقعد مكفول، أو مقعد من مدرسة. الدورة المجانية لا تفتحه. ويُغلق من جديد عندما ينتهي ذلك الصف أو تلك الخطة.',
  unread: 'تعذّرت قراءة النقاش. لم ترسل هذه الصفحة شيئًا ولم تغيّر شيئًا.',
  takenBack: 'سحب الكاتب هذا المنشور.',
  whyShape: 'الاسم المستعار من ثلاثة إلى أربعة وعشرين حرفًا أو رقمًا، بلا مسافات وبلا علامات غير الشرطة السفلية.',
  whyTaken: 'هذا الاسم المستعار مأخوذ أو لا يمكن استخدامه. اختر غيره.',
  reported: 'تم التبليغ. سينظر فيه فريق العمل.',
};

let browser;
try {
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${seen.logs}`)), 60000);
    const receive = (chunk) => { seen.logs += chunk.toString(); if (seen.logs.includes('Ready in')) { clearTimeout(timeout); resolveReady(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (e) => { clearTimeout(timeout); reject(e); });
    next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${seen.logs}`)); });
  });

  const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  const page = async (path, code = 'en', status = 200) => {
    const response = await request(path, { cookie, 'accept-language': code });
    assert.equal(response.status, status, `${path}\n${seen.logs.slice(-2000)}`);
    const whole = await response.text();
    const html = inner(whole);
    hasNot(whole, NEVER, `${path} in ${code}`);
    return html;
  };
  const send = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/boards`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    assert.equal(text.includes('SYNTHETIC-DATABASE'), false, `the route passed on a sentence that is not its own: ${text}`);
    // The headers are carried but not counted: an answer is compared whole by its status and its body.
    return Object.defineProperty({ status: response.status, json: JSON.parse(text) }, 'headers', { value: response.headers, enumerable: false });
  };
  const expect = (answer, status, code, what) => {
    assert.equal(answer.status, status, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(answer.json.code, code, `${what}: ${JSON.stringify(answer)}`);
    assert.deepEqual(Object.keys(answer.json).sort(), ['code', 'message', 'ok'], what);
    assert.equal(answer.json.ok, false, what);
  };

  // ------------------------------------------------------------ signed out
  calls.length = 0;
  for (const path of ['/discuss', '/discuss/students', `/discuss/students/${THREAD}`, '/admin/boards']) {
    const away = await request(path, { 'accept-language': 'en' });
    assert.equal(away.status, 307, path);
    assert.equal(away.headers.get('location'), `/sign-in?next=${path}`, path);
  }
  assert.equal(rpcs('my_board').length, 0);
  expect(await send({ action: 'thread', board: 'students', title: 'Synthetic title', body: 'Synthetic body' }, {}), 401, 'not_signed_in', 'signed out');

  // ------------------------------------------------- which board opens
  let en = await page('/discuss');
  has(en, [
    '<h1>Discussion</h1><p class="board-lede">A place to ask and to answer. Everybody here writes under a username, not under their own name.</p>',
    '<section class="card board-card" data-board="students" data-board-state="in"><h2>Students’ discussion</h2><p>For students with a paid class, and for teachers.</p><p class="board-go"><a class="btn" href="/discuss/students">Open the discussion</a></p></section>',
    '<section class="card board-card" data-board="teachers" data-board-state="out"><h2>Teachers’ discussion</h2><p>For teachers only. Students cannot open it.</p><div class="notice">The teachers’ discussion is for teachers appointed here.</div></section>',
  ], '/discuss');
  // Not let in: told what would open it. Switched off: told that, and not that a class is missing.
  state = fresh(); state.students = standing('students', { kind: null }); state.teachers = standing('teachers', { open: false, kind: 'teacher' });
  en = await page('/discuss');
  has(en, [`data-board="students" data-board-state="out"`, `<div class="notice">${NOT_STUDENT}</div>`, 'data-board="teachers" data-board-state="closed"', '<div class="notice">This discussion is not open yet.</div>'], '/discuss, out and closed');
  hasNot(en, ['href="/discuss/students"', 'href="/discuss/teachers"'], '/discuss, out and closed');
  // Unread is not "you have no class".
  for (const how of ['broken', 'nonsense']) {
    state = fresh(); state[how].add('/rest/v1/rpc/my_board');
    en = await page('/discuss');
    has(en, ['data-board="students" data-board-state="unread"', `<div class="notice error" role="alert">${UNREAD}</div>`], `/discuss, ${how}`);
    hasNot(en, [NOT_STUDENT, 'Open the discussion'], `/discuss, ${how}`);
    has(await page('/discuss/students'), [`<div class="notice error" role="alert" data-board-state="unread">${UNREAD}</div>`], `/discuss/students, ${how}`);
  }
  // Arabic, and a language held for review, which is shown English and says so to the page frame.
  state = fresh(); state.students = standing('students', { kind: null });
  const ar = await page('/discuss', 'ar');
  has(ar, [`<h1>${AR.title}</h1>`, `<h2>${AR.students}</h2>`, `<div class="notice">${AR.notStudent}</div>`], '/discuss in Arabic');
  hasNot(ar, ENGLISH_ONLY, '/discuss in Arabic');
  const held = await page('/discuss', 'ha');
  has(held, ['<div class="page board-page" lang="en" dir="ltr">', '<h1>Discussion</h1>'], '/discuss in a held language');

  // ------------------------------------------------------------ a board
  state = fresh(); state.students = standing('students', { until: UNTIL });
  calls.length = 0;
  en = await page('/discuss/students');
  assert.deepEqual(rpcs('board_threads_page')[0].payload, { p_board: 'students', p_before: null, p_limit: 30 });
  // The four sentences, in order, before anything can be written.
  has(en, [`<section class="card board-card" data-board-rules="true"><h2>Before you write</h2><ul class="board-rules">${RULES.map((s) => `<li>${s}</li>`).join('')}</ul></section>`], '/discuss/students');
  assert.ok(en.indexOf('data-board-rules') < en.indexOf('data-board-form="handle"'), 'the rules come after the first form');
  // No username yet: the name form, and no box to post in.
  has(en, ['data-board-handle="none"', 'data-board-form="handle"', 'Choose the name you will write under here. Do not use your real name.', 'data-board-until="true"', 'You can use this discussion until <bdi>', 'That is when your paid class ends.'], '/discuss/students, no username');
  hasNot(en, ['data-board-form="thread"', 'data-board-ask'], '/discuss/students, no username');
  // Nothing to agree to: no box asks for it.
  hasNot(en, ['data-board-agree', 'data-board-form="agree"'], '/discuss/students, nothing owed');
  // Not agreed yet (the owner, 2026-11-26): the two documents with their versions and a box to tick,
  // and neither a field for a username nor a box to ask in. Reading is as before.
  {
    const OWED = [{ slug: 'terms', title: 'Terms of use', versionNumber: 1 }, { slug: 'privacy', title: 'Privacy notice', versionNumber: 2 }];
    state = fresh(); state.students = standing('students', { agreements: OWED });
    const asked = await page('/discuss/students');
    has(asked, [
      '<section class="card board-card" data-board-agree="terms privacy"><h2>Agree before you write</h2>',
      'You can read here without agreeing to anything. To choose a username and to write, you first agree to these documents.',
      '<li><a lang="en" dir="ltr" href="/policies/terms">Terms of use</a> · Version: <bdi>1</bdi></li>',
      '<li><a lang="en" dir="ltr" href="/policies/privacy">Privacy notice</a> · Version: <bdi>2</bdi></li>',
      'data-board-form="agree"', '<input type="checkbox"', 'name="agree"/><span>I have read these documents and I agree to them.</span>', '<button type="submit" class="btn" aria-busy="false">Agree</button>',
      'data-board-handle-waits="true"', `data-board-thread="${THREAD}"`,
    ], '/discuss/students, not agreed');
    hasNot(asked, ['data-board-form="handle"', 'data-board-form="thread"', 'data-board-ask'], '/discuss/students, not agreed');
    assert.ok(asked.indexOf('data-board-rules') < asked.indexOf('data-board-agree'), 'the rules come before the box that asks for agreement');
    // With a username from before, and a new version since: still no box to ask in.
    state = fresh(); state.students = standing('students', { handle: 'synthetic_me', handleFixed: true, agreements: [OWED[1]] });
    const again = await page('/discuss/students');
    has(again, ['data-board-agree="privacy"', 'data-board-handle="chosen"'], '/discuss/students, a new version');
    hasNot(again, ['data-board-ask', 'data-board-form="thread"', 'href="/policies/terms"'], '/discuss/students, a new version');
    // And on a thread: no reply box, and the way to the box that asks.
    const thread = await page(`/discuss/students/${THREAD}`);
    has(thread, ['data-board-reply="agree"', '<a href="/discuss/students">Agree before you write</a>'], 'a thread, not agreed');
    hasNot(thread, ['data-board-form="reply"'], 'a thread, not agreed');
    // In a held language the box is said in it; the owner's titles stay as written.
    state = fresh(); state.students = standing('students', { agreements: OWED });
    const ar = await page('/discuss/students', 'ar');
    has(ar, ['وافق قبل أن تكتب', 'قرأتُ هذه الوثائق وأوافق عليها.', '<a lang="en" dir="ltr" href="/policies/terms">Terms of use</a>'], '/discuss/students in Arabic, not agreed');
    // A list that cannot be read is not an empty one: the page says it could not read the board.
    state = fresh(); state.students = standing('students', { agreements: [{ slug: 'terms' }] });
    const broken = await page('/discuss/students');
    hasNot(broken, ['data-board-form="handle"', 'data-board-form="agree"', 'data-board-ask'], '/discuss/students, an unreadable list');
    state = fresh(); state.students = standing('students', { until: UNTIL });
  }
  // A thread in the list: what was typed is text, in no known language, and the page says posts are not translated.
  has(en, [
    `<li data-board-thread="${THREAD}"><a class="board-thread-title" href="/discuss/students/${THREAD}"><bdi dir="auto" lang="">Synthetic title &lt;i&gt;as typed&lt;/i&gt;</bdi></a><p class="board-by"><bdi dir="auto" lang="">synthetic_other</bdi><span class="badge neutral">Teacher</span><span>Replies: <bdi>1</bdi></span>`,
    'Posts are shown as they were written. They are not translated.',
  ], '/discuss/students');
  hasNot(en, ['Older posts'], '/discuss/students');
  // With a username that has been written under: it is fixed, and the box to post in is there.
  state = fresh(); state.more = true;
  en = await page('/discuss/students');
  has(en, ['data-board-handle="chosen"', 'You write here as <strong><bdi dir="auto" lang="">synthetic_me</bdi></strong>.', 'A username cannot be changed once you have written under it.', 'data-board-form="thread"', `href="/discuss/students?before=${encodeURIComponent(AT)}"`], '/discuss/students, with a username');
  hasNot(en, ['data-board-form="handle"'], '/discuss/students, with a username');
  // A cursor that is not a moment is not passed on.
  calls.length = 0; await page('/discuss/students?before=not-a-date');
  assert.equal(rpcs('board_threads_page')[0].payload.p_before, null);
  calls.length = 0; await page(`/discuss/students?before=${encodeURIComponent(AT)}`);
  assert.equal(rpcs('board_threads_page')[0].payload.p_before, '2026-11-20T09:14:00.000Z');
  // Stopped from writing: said, and no box.
  state = fresh(); state.students = standing('students', { handle: 'synthetic_me', handleFixed: true, blocked: true });
  en = await page('/discuss/students');
  has(en, ['<div class="notice warn" data-board-blocked="true">Staff have stopped this username from writing. You can still read.</div>'], 'blocked');
  hasNot(en, ['data-board-form'], 'blocked');
  // Not let in, switched off, the list unread, and a board that does not exist.
  state = fresh(); state.students = standing('students', { kind: null }); calls.length = 0;
  has(await page('/discuss/students'), [`<div class="notice" data-board-state="out">${NOT_STUDENT}</div>`], 'not let in');
  assert.equal(rpcs('board_threads_page').length, 0, 'somebody not let in had the threads asked for');
  state = fresh(); state.broken.add('/rest/v1/rpc/board_threads_page');
  en = await page('/discuss/students');
  has(en, [`<div class="notice error" role="alert">${UNREAD}</div>`, 'data-board-rules'], 'list unread');
  hasNot(en, ['Nothing has been written here yet.'], 'list unread');
  state = fresh();
  await page('/discuss/parents', 'en', 404);
  // Arabic.
  const arBoard = await page('/discuss/students', 'ar');
  has(arBoard, [`<li>${AR.ruleStaff}</li>`, '<bdi dir="auto" lang="">Synthetic title &lt;i&gt;as typed&lt;/i&gt;</bdi>'], '/discuss/students in Arabic');
  hasNot(arBoard, ENGLISH_ONLY, '/discuss/students in Arabic');

  // ------------------------------------------------------------ a thread
  state = fresh();
  en = await page(`/discuss/students/${THREAD}`);
  has(en, [
    'data-board="students" data-board-thread-state="visible"',
    '<h1 class="board-post-title"><bdi dir="auto" lang="">Synthetic title &lt;i&gt;as typed&lt;/i&gt;</bdi></h1>',
    `<div class="board-written" dir="auto" lang="">${BODY_HTML}</div>`,
    // Somebody else's post can be reported, not taken back; one's own the other way round.
    'data-board-actions="thread"><button type="button" class="btn ghost" aria-expanded="false" data-board-button="report">Report this post</button>',
    `data-board-post="${REPLY}" data-board-post-state="visible"`,
    `data-board-actions="${REPLY}"><button type="button" class="btn ghost" aria-busy="false" data-board-button="withdraw">Take this back</button>`,
    // A reply that is gone keeps its place and says nothing else.
    `<li class="card board-post" data-board-post="${GONE_REPLY}" data-board-post-state="withdrawn"><p class="muted" data-board-gone="withdrawn">The writer took this back.</p></li>`,
    'data-board-form="reply"',
  ], 'a thread');
  // No username: reading, and a way to the name form instead of a reply box.
  state = fresh(); state.students = standing('students');
  en = await page(`/discuss/students/${THREAD}`);
  has(en, ['data-board-reply="no"', '<a href="/discuss/students">Your username</a>'], 'a thread, no username');
  hasNot(en, ['data-board-form="reply"'], 'a thread, no username');
  // Gone, somebody else's board, unread, and an address that is no thread.
  state = fresh();
  has(await page(`/discuss/students/${randomUUID()}`), ['<div class="notice" data-board-state="gone">That post is no longer here.</div>'], 'a thread that is gone');
  state = fresh(); state.broken.add('/rest/v1/rpc/board_thread');
  has(await page(`/discuss/students/${THREAD}`), [`<div class="notice error" role="alert" data-board-state="unread">${UNREAD}</div>`], 'a thread unread');
  state = fresh();
  await page('/discuss/students/not-a-thread', 'en', 404);
  const arThread = await page(`/discuss/students/${THREAD}`, 'ar');
  has(arThread, [`data-board-gone="withdrawn">${AR.takenBack}</p>`, `<div class="board-written" dir="auto" lang="">${BODY_HTML}</div>`], 'a thread in Arabic');
  hasNot(arThread, ENGLISH_ONLY, 'a thread in Arabic');

  // ------------------------------------------------------------ the route
  state = fresh(); calls.length = 0;
  // Checked before the database is asked.
  expect(await send('{'), 500, 'refused', 'not JSON');
  expect(await send({ action: 'handle', board: 'students', handle: 'ab' }), 400, 'handle_shape', 'short username');
  expect(await send({ action: 'handle', board: 'students', handle: 'two words' }), 400, 'handle_shape', 'a space');
  expect(await send({ action: 'handle', board: 'students', handle: 'admin' }), 400, 'handle_reserved', 'a reserved word');
  expect(await send({ action: 'handle', board: 'parents', handle: 'synthetic_x' }), 404, 'not_found', 'no such board');
  expect(await send({ action: 'thread', board: 'students', title: 'abc', body: 'Synthetic body' }), 400, 'title_length', 'short title');
  expect(await send({ action: 'thread', board: 'students', title: 'Synthetic title', body: '   ' }), 400, 'body_length', 'empty body');
  expect(await send({ action: 'reply', threadId: THREAD, body: '' }), 400, 'body_length', 'empty reply');
  expect(await send({ action: 'reply', threadId: 'x', body: 'Synthetic' }), 404, 'not_found', 'reply to no thread');
  expect(await send({ action: 'report', threadId: THREAD, reason: 'no' }), 400, 'reason_length', 'short reason');
  expect(await send({ action: 'withdraw', threadId: THREAD, replyId: 'x' }), 404, 'not_found', 'withdraw a reply that is no id');
  expect(await send({ action: 'author', threadId: THREAD, reason: 'too short' }), 400, 'reason_required', 'a look with a short reason');
  expect(await send({ action: 'moderate', threadId: THREAD, remove: 'yes', reason: 'Synthetic reason' }), 404, 'not_found', 'moderate with no decision');
  expect(await send({ action: 'something' }), 404, 'not_found', 'no such action');
  assert.equal(calls.filter((c) => c.path !== '/rest/v1/rpc/setting_bool').length, 0, `the database was asked before what was typed was checked: ${JSON.stringify(calls.map((c) => c.path))}`);
  // Done: what the database was handed, and what the route answers.
  let done = await send({ action: 'thread', board: 'students', title: '  Synthetic new title  ', body: ' Synthetic new body ' });
  assert.equal(done.status, 200); assert.deepEqual(Object.keys(done.json).sort(), ['ok', 'threadId']);
  assert.deepEqual(rpcs('post_board_thread')[0].payload, { p_board: 'students', p_title: 'Synthetic new title', p_body: 'Synthetic new body' });
  done = await send({ action: 'report', threadId: THREAD, reason: 'Synthetic reason' });
  assert.deepEqual(done, { status: 200, json: { ok: true } });
  assert.deepEqual(rpcs('report_board_post')[0].payload, { p_thread: THREAD, p_reply: null, p_reason: 'Synthetic reason' });
  done = await send({ action: 'withdraw', threadId: THREAD, replyId: REPLY });
  assert.deepEqual(done, { status: 200, json: { ok: true, state: 'withdrawn' } });
  // Each refusal the database names has its own status; anything else is not passed on.
  for (const [name, status] of [['closed', 403], ['not_allowed', 403], ['blocked', 403], ['not_found', 404], ['no_handle', 409], ['handle_taken', 409], ['handle_fixed', 409], ['own_post', 409], ['already_reported', 409], ['too_many', 429], ['title_length', 400]]) {
    state.refuse = refusal(name);
    expect(await send({ action: 'thread', board: 'students', title: 'Synthetic title', body: 'Synthetic body' }), status, name, name);
  }
  state.refuse = [400, { code: '42501', message: DATABASE_SENTENCE }];
  expect(await send({ action: 'reply', threadId: THREAD, body: 'Synthetic' }), 500, 'refused', 'a refusal with no name');
  state.refuse = refusal('made_up_name');
  expect(await send({ action: 'reply', threadId: THREAD, body: 'Synthetic' }), 500, 'refused', 'a name nobody knows');
  state.refuse = [503, { message: 'SYNTHETIC-DATABASE upstream connect error' }];
  expect(await send({ action: 'reply', threadId: THREAD, body: 'Synthetic' }), 502, 'unconfirmed', 'no answer from the database');
  state.refuse = [200, { SYNTHETIC: 'not what was asked for' }];
  expect(await send({ action: 'reply', threadId: THREAD, body: 'Synthetic' }), 502, 'unconfirmed', 'an answer that is not one');
  expect(await send({ action: 'handle', board: 'students', handle: 'synthetic_x' }), 502, 'unconfirmed', 'a username not confirmed');
  expect(await send({ action: 'author', threadId: THREAD, reason: 'Synthetic reason to look' }), 502, 'unconfirmed', 'an author that is not one');
  // The one answer that carries an account, and only that one.
  state = fresh();
  done = await send({ action: 'author', threadId: THREAD, reason: 'Synthetic reason to look' });
  assert.deepEqual(done.json, { ok: true, author: { handle: 'synthetic_other', userId: OTHER_ACCOUNT, name: OTHER_NAME } });
  assert.deepEqual(rpcs('board_author').at(-1).payload, { p_thread: THREAD, p_reply: null, p_reason: 'Synthetic reason to look' });

  // What a closed account had written: a reason, the staff, and words that are whole.
  const KEPT = { title: 'Synthetic kept title', body: 'Synthetic kept <i>words</i>', writtenAt: AT, keptAt: AT };
  state = fresh();
  expect(await send({ action: 'kept', threadId: THREAD, reason: 'too short' }), 400, 'reason_required', 'kept words with a short reason');
  expect(await send({ action: 'kept', threadId: 'not-an-id', reason: 'Synthetic reason to read' }), 404, 'not_found', 'kept words of no post');
  assert.equal(rpcs('board_kept_post').length, 0, 'a refused look reached the database');
  expect(await send({ action: 'kept', threadId: THREAD, reason: 'Synthetic reason to read' }), 403, 'not_allowed', 'kept words asked for by a member');
  state.staff = true;
  expect(await send({ action: 'kept', threadId: THREAD, reason: 'Synthetic reason to read' }), 404, 'not_found', 'a post with nothing kept');
  state.kept = { ...KEPT, body: '' };
  expect(await send({ action: 'kept', threadId: THREAD, reason: 'Synthetic reason to read' }), 502, 'unconfirmed', 'kept words that are not whole');
  state.kept = KEPT;
  done = await send({ action: 'kept', threadId: THREAD, replyId: null, reason: '  Synthetic reason to read  ' });
  assert.deepEqual(done.json, { ok: true, kept: KEPT });
  assert.equal(done.headers.get('cache-control'), 'no-store');
  assert.deepEqual(rpcs('board_kept_post').at(-1).payload, { p_thread: THREAD, p_reply: null, p_reason: 'Synthetic reason to read' });

  // ------------------------------------------------------------ the staff desk
  state = fresh();
  const notStaff = await request('/admin/boards', { cookie });
  assert.equal(notStaff.status, 307); assert.equal(notStaff.headers.get('location'), '/admin');
  state.staff = true; state.reports = [{ thread: THREAD, reply: null, reason: 'Synthetic reason <b>as typed</b>' }];
  const desk = inner(await (await request('/admin/boards', { cookie })).text());
  has(desk, ['<h1>Discussion reports</h1>', `data-board-report="${THREAD}"`, 'Synthetic reason &lt;b&gt;as typed&lt;/b&gt;', 'See who wrote it (recorded)', 'The students’ board is <strong>on</strong>', 'the teachers’ board is <strong>off</strong>'], '/admin/boards');
  // The queue itself names nobody.
  hasNot(desk, [OTHER_ACCOUNT, OTHER_NAME], '/admin/boards before anybody looked');
  state.reports = [];
  has(inner(await (await request('/admin/boards', { cookie })).text()), ['No post has an open report.'], '/admin/boards, empty');
  // The form for what a closed account wrote, filled in from the link on a thread and from nothing else.
  const named = inner(await (await request(`/admin/boards?thread=${THREAD}&reply=${OTHER_ACCOUNT}`, { cookie })).text());
  has(named, ['<h2 style="margin-top:0">What a closed account had written</h2>', 'Read what was written (recorded)', `value="${THREAD}"`, `value="${OTHER_ACCOUNT}"`], '/admin/boards with a post named');
  hasNot(inner(await (await request('/admin/boards?thread=%22%3E%3Cb%3E&reply=x', { cookie })).text()), ['<b>', 'value="x"'], '/admin/boards with a post that is not one');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const visit = async (path, code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: code, url: origin }]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      const sent = []; tab.on('request', (r) => { if (r.url().includes('/api/boards')) sent.push(r.postDataJSON()); });
      // Nothing in the browser talks to the database itself.
      const direct = []; tab.on('request', (r) => { if (r.url().includes('/rest/v1/') || r.url().includes('/auth/v1/')) direct.push(r.url()); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent, direct };
    };
    const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png`, fullPage: true, caret: 'initial' }); };
    const fits = (tab) => tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    const direction = (tab, selector) => tab.evaluate((s) => getComputedStyle(document.querySelector(s)).direction, selector);

    // Every page fits a phone, in three scripts, with a word that has no place to break.
    for (const [code, dir] of [['en', 'ltr'], ['ar', 'rtl'], ['ta', 'ltr']]) {
      for (const width of [320, 390, 1440]) {
        for (const [name, path] of [['boards', '/discuss'], ['board', '/discuss/students'], ['thread', `/discuss/students/${THREAD}`]]) {
          state = fresh();
          const { context, tab, errors, direct } = await visit(path, code, width);
          assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
          assert.equal(await direction(tab, 'main .board-page'), dir, `${code} ${name}`);
          assert.ok(await fits(tab), `${code} ${width}: ${path} is wider than the screen`);
          if (name === 'thread') {
            // English typed on an Arabic page reads from the left, where it was typed.
            assert.equal(await direction(tab, '.board-written'), 'ltr', `${code}: what was written`);
            assert.equal(await tab.locator('main textarea[name="body"]').isEditable(), true);
          }
          if (name === 'board') {
            for (const field of ['input[name="title"]', 'textarea[name="body"]']) assert.equal(await tab.locator(`main label.field ${field}`).count(), 1, `${code}: ${field} has no label`);
          }
          if ([390, 1440].includes(width)) await shot(tab, `boards-${name}-${code}-${width}`);
          assert.deepEqual(errors, [], `${code} ${width} ${path}`);
          assert.deepEqual(direct, [], `${code} ${width} ${path}`);
          await context.close();
        }
      }
    }

    // In Arabic at 390: choose a name, start a thread, answer it, take the answer back, report somebody else's.
    {
      state = fresh(); state.students = standing('students');
      const { context, tab, errors, sent, direct } = await visit('/discuss/students', 'ar', 390);
      const said = tab.locator('[data-board-said]');
      // A name with a space is refused in Arabic before anything is sent.
      await tab.locator('input[name="handle"]').fill('two words');
      await tab.locator('[data-board-form="handle"] button').click();
      await tab.getByText(AR.whyShape, { exact: true }).waitFor();
      assert.equal(await said.getAttribute('role'), 'alert');
      assert.equal(sent.length, 0, 'a name that cannot be one was sent');
      // A name somebody has: said in Arabic, what was typed is kept.
      state.refuse = refusal('handle_taken', 409);
      await tab.locator('input[name="handle"]').fill('synthetic_new');
      await tab.locator('[data-board-form="handle"] button').click();
      await tab.getByText(AR.whyTaken, { exact: true }).waitFor();
      assert.equal(await tab.locator('input[name="handle"]').inputValue(), 'synthetic_new');
      state.refuse = null;
      await tab.locator('[data-board-form="handle"] button').click();
      // The page is read again: the name is there, and so is the box to post in.
      await tab.locator('[data-board-handle="chosen"]').waitFor();
      assert.deepEqual(sent.at(-1), { action: 'handle', board: 'students', handle: 'synthetic_new' });
      await tab.locator('[data-board-form="thread"] input[name="title"]').fill('Synthetic thread from a browser');
      await tab.locator('[data-board-form="thread"] textarea[name="body"]').fill('Synthetic body from a browser');
      await shot(tab, 'boards-writing-ar-390');
      await tab.locator('[data-board-form="thread"] button').click();
      // Sent to the thread that was made.
      await tab.waitForURL(/\/discuss\/students\/[0-9a-f-]{36}$/);
      await tab.getByRole('heading', { name: 'Synthetic thread from a browser', level: 1 }).waitFor();
      // It is one's own: it can be taken back, not reported.
      assert.equal(await tab.locator('[data-board-actions="thread"] [data-board-button="withdraw"]').count(), 1);
      assert.equal(await tab.locator('[data-board-button="report"]').count(), 0);
      await tab.locator('[data-board-form="reply"] textarea').fill('Synthetic answer from a browser');
      await tab.locator('[data-board-form="reply"] button').click();
      await tab.locator('ol.board-replies li[data-board-post-state="visible"]').waitFor();
      assert.equal(await tab.locator('[data-board-form="reply"] textarea').inputValue(), '', 'the reply box kept what was sent');
      await tab.locator('ol.board-replies [data-board-button="withdraw"]').click();
      await tab.locator('ol.board-replies li[data-board-post-state="withdrawn"]').waitFor();
      assert.equal(await tab.locator('ol.board-replies li').count(), 1, 'a reply taken back lost its place');
      await tab.getByText(AR.takenBack, { exact: true }).waitFor();
      assert.deepEqual(sent.map((s) => s.action), ['handle', 'handle', 'thread', 'reply', 'withdraw']);
      // Somebody else's post: a reason is asked for before anything is sent.
      await tab.goto(`${origin}/discuss/students/${THREAD}`, { waitUntil: 'networkidle' });
      await tab.locator('[data-board-actions="thread"] [data-board-button="report"]').click();
      await tab.locator('[data-board-form="report"] button').click();
      assert.equal(sent.length, 5, 'a report with no reason was sent');
      await tab.locator('[data-board-form="report"] textarea').fill('Synthetic reason from a browser');
      await tab.locator('[data-board-form="report"] button').click();
      await tab.getByText(AR.reported, { exact: true }).waitFor();
      assert.deepEqual(sent.at(-1), { action: 'report', threadId: THREAD, replyId: null, reason: 'Synthetic reason from a browser' });
      await shot(tab, 'boards-reported-ar-390');
      assert.ok(await fits(tab));
      assert.deepEqual(errors, []); assert.deepEqual(direct, []);
      await context.close();
    }

    // The staff desk at 390: no look without a reason; with one, the account is shown, and only then.
    {
      state = fresh(); state.staff = true; state.reports = [{ thread: THREAD, reply: null, reason: 'Synthetic reason' }];
      const { context, tab, errors, sent } = await visit('/admin/boards', 'en', 390);
      const card = tab.locator(`[data-board-report="${THREAD}"]`);
      await card.getByRole('button', { name: 'See who wrote it (recorded)' }).click();
      await card.getByText('Write why you need to know who wrote this, in at least 10 characters. It is kept in the audit log.').waitFor();
      assert.equal(sent.length, 0, 'a look was sent with no reason');
      assert.equal(await tab.getByText(OTHER_NAME).count(), 0);
      await card.locator('textarea').fill('Synthetic reason to look at this');
      await card.getByRole('button', { name: 'See who wrote it (recorded)' }).click();
      await card.locator('[data-board-author]').waitFor();
      assert.match(await card.locator('[data-board-author]').innerText(), new RegExp(`${OTHER_NAME}, account ${OTHER_ACCOUNT}`));
      assert.deepEqual(sent.at(-1), { action: 'author', threadId: THREAD, replyId: null, reason: 'Synthetic reason to look at this' });
      assert.ok(await fits(tab), 'the staff desk is wider than a phone');
      await shot(tab, 'boards-desk-en-390');
      await card.getByRole('button', { name: 'Take it down' }).click();
      await tab.getByText('No post has an open report.').waitFor();
      assert.deepEqual(sent.at(-1), { action: 'moderate', threadId: THREAD, replyId: null, remove: true, reason: 'Synthetic reason to look at this' });
      assert.deepEqual(errors, []);
      await context.close();
    }

    // What a closed account wrote, at 390, reached by the link a thread carries: nothing
    // is asked without a reason, a post with nothing kept is said to have nothing, and
    // the words are shown as written, once, after a reason.
    {
      state = fresh(); state.staff = true; state.students = { ...state.students, moderator: true };
      state.threads[0].replies[0].body = '[erased]';
      const reading = await visit(`/discuss/students/${THREAD}`, 'en', 390);
      const link = reading.tab.locator(`[data-board-post="${REPLY}"] [data-board-kept-link] a`);
      assert.equal(await link.getAttribute('href'), `/admin/boards?thread=${THREAD}&reply=${REPLY}#kept`);
      // The first post still has its words, so it carries no such link.
      assert.equal(await reading.tab.locator('[data-board-post="thread"] [data-board-kept-link]').count(), 0);
      await reading.context.close();

      const { context, tab, errors, sent } = await visit(`/admin/boards?thread=${THREAD}&reply=${REPLY}`, 'en', 390);
      const form = tab.locator('[data-board-kept]');
      assert.equal(await form.locator('#kept-thread').inputValue(), THREAD);
      assert.equal(await form.locator('#kept-reply').inputValue(), REPLY);
      await form.getByRole('button', { name: 'Read what was written (recorded)' }).click();
      await form.getByText('Write why you need to read this, in at least 10 characters. It is kept in the audit log.').waitFor();
      assert.equal(sent.length, 0, 'kept words were asked for with no reason');
      await form.locator('#kept-reason').fill('Synthetic reason to read this');
      await form.getByRole('button', { name: 'Read what was written (recorded)' }).click();
      await form.getByText('Nothing is kept for that post.', { exact: false }).waitFor();
      assert.equal(await form.locator('[data-board-kept-words]').count(), 0);
      state.kept = { title: null, body: 'Synthetic kept <i>words</i>', writtenAt: AT, keptAt: AT };
      await form.getByRole('button', { name: 'Read what was written (recorded)' }).click();
      await form.locator('[data-board-kept-words]').waitFor();
      assert.match(await form.locator('[data-board-kept-words]').innerText(), /Synthetic kept <i>words<\/i>/u);
      assert.match(await form.locator('[data-board-kept-words]').innerText(), /This look is in the audit log, with your reason\./u);
      assert.deepEqual(sent.at(-1), { action: 'kept', threadId: THREAD, replyId: REPLY, reason: 'Synthetic reason to read this' });
      assert.ok(await fits(tab), 'the kept words are wider than a phone');
      await shot(tab, 'boards-kept-en-390');
      assert.deepEqual(errors.filter((e) => !e.includes('404')), []);
      await context.close();
    }
    console.log('Boards in a browser: three pages at three widths in English, Arabic and Tamil fit and ask the database nothing from the browser; in Arabic at 390 a username was refused twice in Arabic and then chosen, a thread started, answered, the answer taken back in place, and another post reported only once a reason was typed; the staff desk showed the account behind a post only after a reason, and what a closed account had written only after one too, from the link its thread carries.');
  }
  console.log('Boards HTTP smoke passed. Not real Auth, RLS or the board functions’ own rules; every username, post and reason in it is invented.');
} catch (e) { console.error(seen.logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
