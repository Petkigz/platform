// The real Next /review page and its /api/review/profile route against an
// entirely synthetic loopback Auth/REST API. This is not evidence about
// hosted Supabase, RLS, or what `register_as_reviewer()`,
// `record_reviewer_qualification()` and `declare_reviewer_conflict()` do: the
// stand-in answers whatever it is asked, nobody was put on a register and no
// assignment was barred.
//
// What it does show (written 2026-11-27, when the page was put into the
// reader's language): the page in English and in Arabic, and in English in a
// marked frame for a language held for review; that a course's title, a
// qualification's title and what a person wrote about a conflict keep their
// own direction; that a queue or a register which could not be read is said
// to be unread rather than thrown or shown as empty; that the route names
// each refusal, checks what was typed before asking the database, and calls
// an answer nobody could read "unsure" rather than a refusal; and, with a
// browser, that each of those is said in the reader's language, that what
// was typed survives a refusal, and that something recorded shows on the
// page. The expected sentences are typed here rather than imported, so this
// fails if a catalogue changes without anybody looking at the page.
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

const LONG = 'Synthetic0123456789012345678901234567890123456789012345';
const PROFILE = '2b5a0c1e-52a1-4d0a-9e0d-0c7a6c0f1a11';
const STAFF = '7d0e2f7c-13c4-4b7e-8a52-5f0b9a1c2d33';
const TAJWID = '11111111-1111-4111-8111-111111111111';
const FIQH = '22222222-2222-4222-8222-222222222222';
const SUBJECTS = [{ id: FIQH, code: 'fiqh', name: 'الفقه' }, { id: TAJWID, code: 'tajwid', name: 'Tajwid' }];
const fresh = () => ({
  profile: { id: PROFILE, user_id: user.id, reviewer_status: 'pending_verification', public_bio: 'Synthetic bio', verified_at: null, verified_by: null, created_at: '2026-11-01T09:00:00Z', user_profiles: { display_name: 'Synthetic scholar' } },
  qualifications: [
    { id: 'q1', reviewer_profile_id: PROFILE, qualification_type: 'ijazah', qualification_title: 'إجازة في رواية حفص', issuing_institution: `Institute ${LONG}`, subject_area_id: TAJWID, verification_status: 'verified', verified_at: '2026-11-05T09:00:00Z', verified_by: STAFF, valid_until: null },
    // A kind this page has no word for, with no title.
    { id: 'q2', reviewer_profile_id: PROFILE, qualification_type: 'synthetic_kind', qualification_title: null, issuing_institution: null, subject_area_id: null, verification_status: 'pending', verified_at: null, verified_by: null, valid_until: null },
  ],
  conflicts: [
    { id: 'c1', reviewer_profile_id: PROFILE, course_version_id: null, conflict_type: 'family', description: 'المؤلف أخي.', status: 'disqualifying', assessed_by: STAFF, assessed_at: '2026-11-06T09:00:00Z', resolution_notes: 'Synthetic note: stands aside.' },
  ],
  assignments: [
    { id: 'a1', course_version_id: 'v1', review_scope: 'scholarly', assignment_status: 'offered', assigned_at: '2026-11-20T08:00:00Z', due_at: '2026-12-01T21:00:00Z', course_versions: { course_id: 'k1', courses: { title: 'أحكام الطهارة', slug: 'tahara' } }, content_review_decisions: [] },
    { id: 'a2', course_version_id: 'v2', review_scope: 'technical', assignment_status: 'completed', assigned_at: '2026-11-02T08:00:00Z', due_at: null, course_versions: { course_id: 'k2', courses: { title: `Reading fluently ${LONG}`, slug: 'reading' } }, content_review_decisions: [{ id: 'd1', decision: 'revision_requested', rationale: null, decided_at: '2026-11-04T08:00:00Z' }] },
    // A course that could not be read: the library's English "Untitled course" must not be printed.
    { id: 'a3', course_version_id: 'v3', review_scope: 'scholarly', assignment_status: 'in_progress', assigned_at: '2026-11-21T08:00:00Z', due_at: null, course_versions: null, content_review_decisions: [] },
  ],
});
// The database's own words. None of these may reach a reader.
const DATABASE_WORDS = ['SYNTHETIC', 'synthetic_kind', 'Untitled course', 'not registered as a reviewer', 'characters or fewer', 'permission denied', 'no subject area'];
const REFUSALS = {
  signedOut: [403, { code: '42501', message: 'sign in to offer yourself as a reviewer' }],
  closed: [400, { code: '55000', message: 'your reviewer registration was closed; ask platform staff to reopen it' }],
  long: [400, { code: '23514', message: 'a biography must be 2000 characters or fewer' }],
  notRegistered: [400, { code: '55000', message: 'you are not registered as a reviewer, so there is no review to stand aside from' }],
  notYours: [403, { code: '42501', message: 'you may only record qualifications for your own reviewer profile' }],
  subjectGone: [404, { code: 'P0002', message: `no subject area ${TAJWID}` }],
  denied: [403, { code: '42501', message: 'SYNTHETIC permission denied for function' }],
  odd: [400, { code: '23514', message: 'SYNTHETIC rule nobody wrote a sentence for' }],
};

const state = {
  // 'on' the register, 'off' it, or 'broken' (the profile cannot be read).
  register: 'on', rows: fresh(),
  // What each function does: 'ok', a key of REFUSALS, or 'gateway'.
  rpc: 'ok',
};
const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(401); res.end('{}'); return; }
  const signedIn = req.headers.authorization === `Bearer ${token}`;
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname; const select = url.searchParams.get('select') ?? '';
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, signedIn });
  const send = (value) => res.end(JSON.stringify(value));
  const on = state.register === 'on';
  if (path === '/rest/v1/reviewer_profiles') {
    if (state.register === 'broken') { res.writeHead(500); return send({ code: 'XX000', message: 'SYNTHETIC failure', details: null, hint: null }); }
    if (!on) return send([]);
    return send(select.includes('reviewer_status') ? [state.rows.profile] : [{ id: PROFILE }]);
  }
  if (path === '/rest/v1/content_review_assignments') return send(on ? state.rows.assignments : []);
  if (path === '/rest/v1/reviewer_qualifications') return send(state.rows.qualifications);
  if (path === '/rest/v1/reviewer_subject_authorizations') return send([]);
  if (path === '/rest/v1/reviewer_conflict_declarations') return send(state.rows.conflicts);
  if (path === '/rest/v1/subject_areas') return send(SUBJECTS);
  if (path === '/rest/v1/user_profiles') {
    if (select.startsWith('user_id')) return send([{ user_id: STAFF, display_name: 'Synthetic registrar' }]);
    return send(signedIn ? [{ display_name: 'Synthetic scholar', account_status: 'active', deleted_at: null, preferred_language: 'en', timezone: null }] : []);
  }
  if (['/rest/v1/rpc/register_as_reviewer', '/rest/v1/rpc/record_reviewer_qualification', '/rest/v1/rpc/declare_reviewer_conflict'].includes(path)) {
    if (state.rpc === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); return res.end('<html>SYNTHETIC gateway</html>'); }
    if (state.rpc !== 'ok') { const [status, error] = REFUSALS[state.rpc]; res.writeHead(status); return send({ ...error, details: null, hint: null }); }
    if (path.endsWith('register_as_reviewer')) { state.register = 'on'; state.rows.profile.reviewer_status = 'applicant'; state.rows.profile.public_bio = payload.p_public_bio; return send({ reviewerProfileId: PROFILE, status: 'applicant', registered: true }); }
    if (path.endsWith('record_reviewer_qualification')) {
      state.rows.qualifications.push({ id: `q${state.rows.qualifications.length + 1}`, reviewer_profile_id: PROFILE, qualification_type: payload.p_qualification_type, qualification_title: payload.p_title, issuing_institution: payload.p_issuing_institution, subject_area_id: payload.p_subject_area_id, verification_status: 'pending', verified_at: null, verified_by: null, valid_until: null });
      return send({ qualificationId: 'q-new' });
    }
    state.rows.conflicts.unshift({ id: `c${state.rows.conflicts.length + 1}`, reviewer_profile_id: PROFILE, course_version_id: null, conflict_type: payload.p_conflict_type, description: payload.p_description, status: 'declared', assessed_by: null, assessed_at: null, resolution_notes: null });
    return send({ declarationId: 'c-new', declared: true, note: 'declared; you cannot be assigned this work until platform staff assess it' });
  }
  if (path === '/rest/v1/rpc/notification_badge') return send(0);
  if (path.startsWith('/rest/v1/rpc/')) return send(false);
  return send([]);
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
  const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  // The page itself: what is inside <main>, without the scripts Next adds.
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('&#x27;', '’').replaceAll('<!-- -->', '');
  const page = async (path, headers) => { const response = await request(path, headers); assert.equal(response.status, 200, `${path}\n${logs.slice(-2000)}`); return response.text(); };
  const has = (html, sentences, label) => { for (const s of sentences) assert.ok(html.includes(s), `${label} lacks "${s}"\n${html.slice(0, 6000)}`); };
  const lacks = (html, sentences, label) => { for (const s of sentences) assert.ok(!html.includes(s), `${label} says "${s}"`); };
  // A day and a deadline as this Node writes them; Persian's digits are pinned below.
  const dayIn = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
  const momentIn = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: 'UTC' }).format(new Date(iso));
  const digitIn = (code, d) => new Intl.NumberFormat(code).format(Number(d));
  const asked = (name) => calls.filter((c) => c.path === `/rest/v1/${name}`);

  const ENGLISH = ['Review queue', 'Reviewing', 'Assignments come', 'your panel page', 'Awaiting you', 'Closed', 'Scholarly', 'Technical', 'Offered', 'Completed', 'In progress', 'Assigned:', 'Due:', 'Your decision', 'View offer', 'Open review', 'Your place', 'Waiting to be checked', 'Applied', 'Checked', 'Not yet', 'qualified for', 'Ijazah', 'Untitled', 'Record a qualification', 'stand aside', 'Family', 'Bars the assignment', 'Assessed by', 'Declare', 'could not be read', 'Put yourself forward', 'Apply to review', 'Nothing has been assigned'];

  // Signed out: to the sign-in page, and the database is not asked.
  let response = await request('/review', { 'accept-language': 'en' });
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), '/sign-in?next=/review');
  assert.equal(asked('reviewer_profiles').length, 0);

  // ----------------------------------------------- on the register, with work
  let full = await page('/review', { cookie, 'accept-language': 'en' });
  let en = inner(full);
  has(en, [
    '<div class="container section review-page">', '<p class="eyebrow">Reviewing</p>', '<h1>Review queue</h1>',
    '<p class="lede">Assignments come from platform staff. You cannot assign yourself, and you cannot approve a course you wrote.</p>',
    '<p class="muted">If you sit on a scholarly panel, the cases waiting for your vote are on <a href="/panel">your panel page</a>.</p>',
    '<h3>Your place on the register</h3><span class="badge neutral">Waiting to be checked</span>',
    `<dt>Applied</dt><dd>${dayIn('en', '2026-11-01T09:00:00Z')}</dd>`, '<dt>Checked</dt><dd>Not yet. You cannot be assigned anything until a governance admin checks you.</dd>',
    '<p class="meta">Until you are a verified reviewer, no course can be assigned to you, and no approval you give would let anything be published.</p>',
    '<h3>What you are qualified for</h3><span class="badge neutral">2</span>',
    `<span class="register-facts"><span>Ijazah</span><bdi>إجازة في رواية حفص</bdi><bdi>Institute ${LONG}</bdi><bdi>Tajwid</bdi></span><span class="badge ok">Checked</span>`,
    // A kind with no word here is given none; a qualification with no title says so.
    '<li><span class="register-facts"><bdi>Untitled</bdi></span><span class="badge warn">Waiting to be checked</span></li>',
    '<summary class="register-summary">Record a qualification</summary>', '<option value="ijazah">Ijazah</option>', `<option value="${FIQH}" selected="">الفقه</option>`,
    'placeholder="What it is called, for example: an ijazah in the recitation of Hafs" aria-label="Qualification title"', 'placeholder="Who granted it (optional)" aria-label="Issuing institution"',
    '<h3>What you must stand aside from</h3><span class="badge neutral">1</span>',
    '<span class="register-facts"><span>Family</span><bdi>المؤلف أخي.</bdi><span>Assessed by: <bdi>Synthetic registrar</bdi></span><bdi>Synthetic note: stands aside.</bdi></span><span class="badge warn">Bars the assignment</span>',
    '<summary class="register-summary">Declare a conflict</summary>', '<option value="teacher_student">I taught them, or they taught me</option>',
    'placeholder="What the conflict is, in your own words" aria-label="Describe the conflict"',
    '<div class="n">2</div><div class="l">Awaiting you</div>', '<div class="n">1</div><div class="l">Closed</div>',
    `<div class="card" data-review-assignment="offered"><div class="badges"><span class="badge neutral">Scholarly</span><span class="badge ">Offered</span></div><h3 dir="auto">أحكام الطهارة</h3><p class="meta">Assigned: ${dayIn('en', '2026-11-20T08:00:00Z')}</p><p class="meta">Due: ${momentIn('en', '2026-12-01T21:00:00Z')}</p><a class="btn secondary" href="/review/a1">View offer</a></div>`,
    `<span class="badge neutral">Technical</span><span class="badge neutral">Completed</span></div><h3 dir="auto">Reading fluently ${LONG}</h3>`, '<p class="meta">Your decision: Revisions requested</p><a class="btn secondary" href="/review/a2">Open review</a>',
    '<span class="badge neutral">In progress</span></div><h3>Untitled</h3>',
    '<a href="/learn">Back to my learning</a>',
  ], 'English review page');
  lacks(en, ['data-review-state', 'data-register="apply"', ...DATABASE_WORDS], 'English review page');
  assert.match(htmlRoot(full), /lang="en"/);
  assert.ok(full.includes('<title>Review queue'), 'the tab is not named');
  // The deadline carries its zone: a server does not know the reader's clock.
  assert.match(momentIn('en', '2026-12-01T21:00:00Z'), /UTC/);

  full = await page('/review', { cookie, 'accept-language': 'ar' });
  const ar = inner(full);
  assert.match(htmlRoot(full), /lang="ar"/); assert.match(htmlRoot(full), /dir="rtl"/);
  has(ar, [
    '<div class="container section review-page">', '<p class="eyebrow">المراجعة</p>', '<h1>قائمة المراجعات</h1>',
    'إن كنت عضوًا في هيئة علمية، فالقضايا التي تنتظر صوتك موجودة في <a href="/panel">صفحة هيئتك</a>.',
    '<h3>موضعك في السجل</h3><span class="badge neutral">بانتظار التحقق</span>', `<dt>تاريخ التقدّم</dt><dd>${dayIn('ar', '2026-11-01T09:00:00Z')}</dd>`,
    '<dt>تم التحقق</dt><dd>ليس بعد. لا يمكن تكليفك بشيء حتى يتحقق منك أحد مشرفي الحوكمة.</dd>',
    `<h3>ما أنت مؤهَّل له</h3><span class="badge neutral">${digitIn('ar', 2)}</span>`, '<span>إجازة</span><bdi>إجازة في رواية حفص</bdi>', '<span class="badge ok">تم التحقق</span>',
    '<bdi>بلا عنوان</bdi></span><span class="badge warn">بانتظار التحقق</span>', '<summary class="register-summary">سجّل مؤهلًا</summary>', '<option value="institutional_affiliation">انتساب إلى مؤسسة</option>',
    'placeholder="اسمه، مثلًا: إجازة في رواية حفص" aria-label="عنوان المؤهل"',
    '<h3>ما يجب أن تتنحّى عنه</h3>', '<span>قرابة</span><bdi>المؤلف أخي.</bdi><span>قيّمه: <bdi>Synthetic registrar</bdi></span>', '<span class="badge warn">يمنع التكليف</span>',
    '<summary class="register-summary">أفصح عن تعارض</summary>', '<option value="authorship" selected="">أنا كتبته</option><option value="financial">قد أربح منه</option>',
    `<div class="n">${digitIn('ar', 2)}</div><div class="l">بانتظارك</div>`, `<div class="n">${digitIn('ar', 1)}</div><div class="l">مغلقة</div>`,
    '<span class="badge neutral">علمية</span><span class="badge ">معروضة</span></div><h3 dir="auto">أحكام الطهارة</h3>', `<p class="meta">تاريخ التكليف: ${dayIn('ar', '2026-11-20T08:00:00Z')}</p>`, `<p class="meta">موعد التسليم: ${momentIn('ar', '2026-12-01T21:00:00Z')}</p>`,
    '<a class="btn secondary" href="/review/a1">اطّلع على العرض</a>', '<p class="meta">قرارك: طُلبت تعديلات</p><a class="btn secondary" href="/review/a2">افتح المراجعة</a>',
    '<span class="badge neutral">قيد التنفيذ</span></div><h3>بلا عنوان</h3>', '<a href="/learn">العودة إلى تعلّمي</a>',
  ], 'Arabic review page');
  lacks(ar, [...ENGLISH, ...DATABASE_WORDS], 'Arabic review page');
  assert.ok(full.includes('<title>قائمة المراجعات'), 'the tab is not named in Arabic');

  // Counts and days are in the reader's digits.
  const fa = inner(await page('/review', { cookie, 'accept-language': 'fa' }));
  has(fa, ['<h1>صف بازبینی</h1>', '<h3>صلاحیت‌های شما</h3><span class="badge neutral">۲</span>', '<div class="n">۲</div><div class="l">در انتظار شما</div>', '<div class="n">۱</div><div class="l">بسته</div>', '<p class="meta">تصمیم شما: اصلاحات خواسته شد</p>'], 'Persian review page');
  assert.match(fa, /<p class="meta">تاریخ واگذاری: [^<]*[۰-۹][^<]*<\/p>/u, 'the day an assignment was made is not in Persian digits');
  assert.doesNotMatch(fa.match(/<p class="meta">تاریخ واگذاری: [^<]*<\/p>/u)[0], /[0-9]/u);
  lacks(fa, ENGLISH, 'Persian review page');
  const uz = inner(await page('/review', { cookie, 'accept-language': 'uz' }));
  has(uz, ['<h1>Taqriz navbati</h1>', '<h3>Roʻyxatdagi oʻrningiz</h3>', 'ishlar <a href="/panel">kengashingiz sahifasida</a> turibdi.', '<option value="other">Boshqa narsa</option>'], 'Uzbek review page');

  has(inner(await page('/review', { cookie, 'accept-language': 'ha' })), ['<div class="container section review-page" lang="en" dir="ltr">', '<h1>Review queue</h1>'], 'held-language review page');

  // ------------------------------------------------- not on the register
  state.register = 'off';
  en = inner(await page('/review', { cookie, 'accept-language': 'en' }));
  has(en, [
    '<div class="card" data-register="apply"><div class="outline-h register-head"><h3>Put yourself forward as a reviewer</h3><span class="badge neutral">Not on the register</span></div>',
    '<p class="meta">You are not on the reviewer register, so nothing can be assigned to you. Applying does not make you a reviewer: a governance admin has to check who you are before a course can be put in front of you, and only they may say which subjects you can judge.</p>',
    '<label for="register-bio" class="meta">A short biography, shown to whoever checks your application</label>', '<button type="button" class="btn">Apply to review</button>',
    '<div class="empty" data-review-state="none">Nothing has been assigned to you. If you expected a review here, a platform admin needs to assign it.</div>',
  ], 'English page for somebody not on the register');
  lacks(en, ['Your place on the register', 'data-review-assignment', 'Awaiting you'], 'English page for somebody not on the register');
  const sw = inner(await page('/review', { cookie, 'accept-language': 'sw' }));
  has(sw, ['<h3>Jitokeze kuwa mkaguzi</h3><span class="badge neutral">Humo kwenye rejista</span>', '<button type="button" class="btn">Omba kuwa mkaguzi</button>', 'data-review-state="none">Hujapangiwa chochote.', '<a href="/learn">Rudi kwenye masomo yangu</a>'], 'Swahili page for somebody not on the register');
  lacks(sw, ENGLISH, 'Swahili page for somebody not on the register');

  // --------------------------- a queue and a register that could not be read
  state.register = 'broken';
  const fr = inner(await page('/review', { cookie, 'accept-language': 'fr' }));
  has(fr, ['<h1>File de relecture</h1>', '<div class="notice error" role="alert" data-review-state="unread">Vos relectures n’ont pas pu être lues pour l’instant. Réessayez dans un instant.</div>', '<a href="/learn">Retour à mon apprentissage</a>'], 'French review page, unread');
  // Not "nothing has been assigned" and not an invitation to apply: nobody knows either.
  lacks(fr, ['Rien ne vous a été attribué', 'data-review-state="none"', 'data-register', 'SYNTHETIC'], 'French review page, unread');
  state.register = 'on';
  console.log('Review page: signed out goes to sign-in with the database not asked; English and Arabic each whole, with dates as the reader writes them and the deadline carrying its zone; counts and days in Persian digits; a held language is given English in a marked frame; somebody not on the register is invited to apply in English and Swahili; a queue that could not be read is said to be unread in French, not "nothing has been assigned".');

  // ------------------------------------------------------------ the route
  const post = async (body, headers = { cookie }) => {
    const reply = await fetch(`${origin}/api/review/profile`, { method: 'POST', headers: { 'content-type': 'application/json', origin, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    return { status: reply.status, json: await reply.json() };
  };
  const rpcs = () => calls.filter((c) => c.path.startsWith('/rest/v1/rpc/') && /reviewer|conflict/.test(c.path)).length;
  const QUALIFICATION = { action: 'qualification', reviewerProfileId: PROFILE, qualificationType: 'ijazah', title: 'Hafs', institution: '', subjectAreaId: TAJWID };
  let before = rpcs();
  // What was typed is checked first: the database is not asked about something it would only refuse.
  for (const [body, status, code, max] of [
    [{ action: 'register', bio: 'x'.repeat(2001) }, 422, 'long', 2000],
    [{ ...QUALIFICATION, qualificationType: 'medal' }, 422, 'kind'],
    [{ ...QUALIFICATION, title: '  ' }, 422, 'title'],
    [{ ...QUALIFICATION, title: 'x'.repeat(201) }, 422, 'long', 200],
    [{ ...QUALIFICATION, subjectAreaId: '' }, 422, 'subject'],
    [{ ...QUALIFICATION, reviewerProfileId: 'me' }, 400, 'refused'],
    [{ action: 'conflict', conflictType: 'rivalry', description: 'x' }, 422, 'kind'],
    [{ action: 'conflict', conflictType: 'family', description: '' }, 422, 'describe'],
    [{ action: 'conflict', conflictType: 'family', description: 'x'.repeat(2001) }, 422, 'long', 2000],
    [{ action: 'promote' }, 400, 'refused'],
    ['not json', 400, 'refused'],
  ]) {
    const reply = await post(body);
    assert.equal(reply.status, status, JSON.stringify(reply)); assert.equal(reply.json.ok, false); assert.equal(reply.json.code, code, JSON.stringify(reply.json));
    assert.equal(reply.json.max, max, JSON.stringify(reply.json));
  }
  assert.equal(rpcs(), before, 'the database was asked about something the route should have refused itself');
  let reply = await post({ action: 'register', bio: 'x' }, {});
  assert.equal(reply.status, 401); assert.equal(reply.json.code, 'signedOut'); assert.equal(rpcs(), before);
  // Each refusal of the database's, by name.
  for (const [kind, body, status, code, max] of [
    ['signedOut', { action: 'register', bio: 'x' }, 401, 'signedOut'],
    ['closed', { action: 'register', bio: 'x' }, 422, 'closed'],
    ['long', { action: 'register', bio: 'x' }, 422, 'long', 2000],
    ['notRegistered', { action: 'conflict', conflictType: 'family', description: 'x' }, 422, 'notRegistered'],
    ['notYours', QUALIFICATION, 403, 'notYours'],
    ['subjectGone', QUALIFICATION, 422, 'subjectGone'],
    ['denied', QUALIFICATION, 403, 'notYours'],
    ['odd', QUALIFICATION, 422, 'refused'],
  ]) {
    state.rpc = kind;
    reply = await post(body);
    assert.equal(reply.status, status, `${kind} ${JSON.stringify(reply)}`); assert.equal(reply.json.code, code, kind); assert.equal(reply.json.max, max, kind);
  }
  // A gateway's page is not a refusal, and is not passed on.
  state.rpc = 'gateway';
  reply = await post(QUALIFICATION);
  assert.equal(reply.status, 502); assert.equal(reply.json.code, 'unsure'); assert.ok(!JSON.stringify(reply.json).includes('SYNTHETIC'), JSON.stringify(reply.json));
  state.rpc = 'ok';
  before = rpcs();
  reply = await post({ action: 'conflict', conflictType: 'financial', description: '  Synthetic: paid by the school.  ' });
  assert.equal(reply.status, 200); assert.equal(reply.json.ok, true);
  assert.deepEqual(calls.at(-1).payload.p_description, 'Synthetic: paid by the school.');
  assert.equal(rpcs(), before + 1);
  state.rows = fresh();
  console.log('Review register route: what was typed is refused by name before the database is asked (eleven cases, none reaching it); signed out is 401; eight of the database’s refusals each come back by name with their status; a gateway’s page is 502 "unsure" with none of its text passed on; a declaration that is accepted is sent trimmed.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (code, width, a11y) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
        ...(a11y ? [{ name: 'ayahspring_a11y', value: a11y, url: origin }] : []),
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      const sent = []; tab.on('request', (r) => { if (r.url().endsWith('/api/review/profile') && r.method() === 'POST') sent.push(r.postDataJSON()); });
      await tab.goto(`${origin}/review`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      // Name what sticks out, so the failure says where to look.
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 30)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: the page scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => (el.textContent ?? '').slice(0, 40)));
      assert.deepEqual(spill, [], `${label}: a card's contents are wider than the card`);
      // A badge keeps its words whole: no state is squeezed to a letter a line.
      const thin = await tab.evaluate(() => [...document.querySelectorAll('main .badge')].filter((el) => el.getBoundingClientRect().width < 20 && (el.textContent ?? '').length > 3).map((el) => el.textContent));
      assert.deepEqual(thin, [], `${label}: a badge is squeezed`);
    };
    const SIZES = [[320, null], [320, 'v1.larger.normal.system.dyslexic'], [390, null], [1440, null]];
    for (const [code, heading, record, declare, declareIt] of [
      ['en', 'Review queue', 'Record a qualification', 'Declare a conflict', 'Declare it'],
      ['ar', 'قائمة المراجعات', 'سجّل مؤهلًا', 'أفصح عن تعارض', 'أفصح عنه'],
      ['fr', 'File de relecture', 'Consigner une qualification', 'Déclarer un conflit d’intérêts', 'Le déclarer'],
      ['ta', 'மதிப்பாய்வு வரிசை', 'தகுதியைப் பதிவு செய்', 'நலன் முரணை அறிவி', 'அறிவி'],
    ]) {
      for (const [width, a11y] of SIZES) {
        const label = `${code} ${width}${a11y ? ' largest text and the dyslexia font' : ''}`;
        const { context, tab, errors } = await open(code, width, a11y);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${label}: heading`);
        await fits(tab, width, `${label} /review`);
        // Both forms open, and a refusal under them, must fit too.
        await tab.locator('summary', { hasText: record }).click();
        await tab.locator('summary', { hasText: declare }).click();
        await fits(tab, width, `${label} /review with both forms open`);
        await tab.getByRole('button', { name: declareIt, exact: true }).click();
        await tab.locator('main').getByRole('alert').waitFor();
        await fits(tab, width, `${label} /review with a refusal`);
        assert.deepEqual(errors, [], `${label}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && width !== 1440) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/review-${code}-${width}${a11y ? '-dys' : ''}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic review page in ${code}: fits at 320, 390 and 1440px, and at 320px with the largest text and the dyslexia font, with both forms open and a refusal shown too.`);
    }

    // ------------------------------------------- the register, in Arabic
    {
      const before = rpcs();
      const { context, tab, errors, sent } = await open('ar', 390, null);
      const main = tab.locator('main');
      const text = async () => main.innerText();
      const said = async (sentence, label) => {
        await main.getByRole('alert').filter({ hasText: sentence }).waitFor();
        assert.equal(await main.getByRole('alert').count(), 1, `${label}: two notices`);
        const seen = await text(); for (const words of DATABASE_WORDS) assert.ok(!seen.includes(words), `${label}: the page says "${words}"`);
      };
      // A declaration with nothing written is refused in the browser; nothing is sent.
      await tab.locator('summary', { hasText: 'أفصح عن تعارض' }).click();
      const declare = tab.getByRole('button', { name: 'أفصح عنه', exact: true });
      const describe = tab.getByLabel('صف التعارض', { exact: true });
      await declare.click();
      await said('صف التعارض، حتى لا يضطر من يقيّمه إلى التخمين.', 'an empty declaration');
      assert.equal(sent.length, 0); assert.equal(rpcs(), before);

      // Each refusal by its name; what was typed is still there afterwards.
      await describe.fill('  أتقاضى أجرًا من هذه المدرسة.  ');
      await tab.getByLabel('نوع التعارض', { exact: true }).selectOption('financial');
      for (const [kind, sentence] of [
        ['notRegistered', 'لست مدرجًا في سجلّ المراجعين، فلا يوجد ما يُسجَّل هذا عليه.'],
        ['signedOut', 'سجّل الدخول من جديد أولًا.'],
        ['denied', 'ليس لك أن تسجّل هذا.'],
        ['odd', 'لم يُسجَّل. أعد تحميل الصفحة لترى ما في السجل.'],
      ]) {
        state.rpc = kind;
        await declare.click();
        await said(sentence, kind);
        assert.deepEqual(sent.at(-1), { action: 'conflict', conflictType: 'financial', description: 'أتقاضى أجرًا من هذه المدرسة.' }, kind);
        assert.equal(await describe.inputValue(), '  أتقاضى أجرًا من هذه المدرسة.  ', `${kind}: what was typed went away after a refusal`);
        assert.equal(await declare.isEnabled(), true, `${kind}: the button stayed disabled`);
      }
      // Not refusals: nobody can say what happened, and the page does not say "not recorded".
      const UNSURE = 'لا أحد يستطيع أن يقول هل سُجّل ذلك. أعد تحميل الصفحة وانظر قبل أن ترسله من جديد.';
      state.rpc = 'gateway';
      await declare.click();
      await said(UNSURE, 'a gateway’s page');
      assert.ok(!(await text()).includes('لم يُسجَّل. أعد'), 'a gateway’s page was called a refusal');
      state.rpc = 'ok';
      await tab.route('**/api/review/profile', (route) => route.abort());
      await declare.click();
      await said(UNSURE, 'a lost connection');
      await tab.unroute('**/api/review/profile');
      assert.equal(await describe.inputValue(), '  أتقاضى أجرًا من هذه المدرسة.  ');
      assert.equal(await declare.isEnabled(), true, 'a lost connection left the button disabled');

      // Recorded: the page is read again, shows the declaration, and the box is emptied.
      await declare.click();
      await main.locator('[data-register="conflicts"] li').filter({ hasText: 'أتقاضى أجرًا من هذه المدرسة.' }).waitFor();
      const row = await main.locator('[data-register="conflicts"] li').filter({ hasText: 'أتقاضى أجرًا من هذه المدرسة.' }).innerText();
      assert.ok(row.includes('قد أربح منه') && row.includes('أُفصح عنه، بانتظار التقييم'), row);
      assert.equal(await describe.inputValue(), '');
      assert.equal(await main.getByRole('alert').count(), 0, 'a refusal is still shown after the declaration was recorded');

      // A qualification: a title is asked for in the browser; one too long names its limit in Arabic's digits.
      await tab.locator('summary', { hasText: 'سجّل مؤهلًا' }).click();
      const save = tab.getByRole('button', { name: 'سجّله معلّقًا', exact: true });
      const title = tab.getByLabel('عنوان المؤهل', { exact: true });
      const count = sent.length;
      await save.click();
      await said('أعطِ المؤهل عنوانًا.', 'a qualification with no title');
      assert.equal(sent.length, count);
      await title.fill('شهادة في علوم القرآن');
      state.rpc = 'long';
      await save.click();
      await said(`هذا طويل جدًا. أقصى عدد من الأحرف: ${digitIn('ar', 2000)}`, 'a length the database refused');
      assert.equal(await title.inputValue(), 'شهادة في علوم القرآن');
      state.rpc = 'ok';
      await save.click();
      await main.locator('[data-register="qualifications"] li').nth(2).waitFor();
      assert.deepEqual(sent.at(-1), { action: 'qualification', reviewerProfileId: PROFILE, qualificationType: 'certificate', title: 'شهادة في علوم القرآن', institution: null, subjectAreaId: FIQH });
      assert.equal(await title.inputValue(), '');
      assert.deepEqual(errors, []);
      await context.close();
      state.rows = fresh();
    }
    // ------------------------------------- applying, for somebody not on it
    {
      state.register = 'off';
      const { context, tab, errors, sent } = await open('ar', 390, null);
      const main = tab.locator('main');
      const apply = tab.getByRole('button', { name: 'تقدّم للمراجعة', exact: true });
      await tab.locator('#register-bio').fill('معلّم تجويد منذ عشر سنين.');
      state.rpc = 'closed';
      await apply.click();
      await main.getByRole('alert').filter({ hasText: 'أُغلق تسجيلك مراجعًا. اطلب من فريق المنصة أن يعيد فتحه.' }).waitFor();
      assert.equal(await tab.locator('#register-bio').inputValue(), 'معلّم تجويد منذ عشر سنين.');
      state.rpc = 'ok';
      await apply.click();
      await main.locator('[data-register="entry"]').waitFor();
      assert.deepEqual(sent.at(-1), { action: 'register', bio: 'معلّم تجويد منذ عشر سنين.' });
      assert.ok((await main.innerText()).includes('موضعك في السجل'));
      assert.equal(await main.locator('[data-register="apply"]').count(), 0);
      assert.deepEqual(errors, []);
      await context.close();
      state.rows = fresh(); state.register = 'on';
      console.log('Synthetic register in Arabic: an empty declaration and a qualification with no title are refused in the browser with nothing sent; not registered, signed out, not yours and a refusal with no sentence of its own are each said in Arabic by name, with none of the database’s words and with what was typed still there; a length names its limit in the reader’s digits; a gateway’s page and a lost connection are each said as "nobody can say", with the button usable again; a declaration, a qualification and an application that were recorded each show on the page.');
    }
  }
  console.log('Review HTTP smoke passed. Not real Auth, RLS, `register_as_reviewer()`, `record_reviewer_qualification()` or `declare_reviewer_conflict()`; nobody was put on a register and no assignment was barred, and no speaker has read the translations.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
