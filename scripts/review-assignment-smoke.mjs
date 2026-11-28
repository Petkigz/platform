// The real Next /review/[assignmentId] page and its /api/review route against
// an entirely synthetic loopback Auth/REST API. This is not evidence about
// hosted Supabase, RLS, the triggers of migration 371 or
// `set_course_version_status()`: the stand-in answers whatever it is asked,
// no review was accepted, no decision was recorded and no course moved.
//
// What it does show (written 2026-11-28, when the page was put into the
// reader's language): the page in English and in Arabic, and in English in a
// marked frame for a language held for review; that a course's, a lesson's
// and a file's name keep their own direction; that the two panels shared
// with the staff's pages are marked as English; that the decision form is
// offered only on a review that can take a decision; that an assignment, an
// outline or a part of the page which could not be read is said to be unread
// rather than "not found", "no sections" or an error page; that the route
// names each refusal and calls an answer nobody could read "unsure"; that a
// decision recorded on a course which did not move is answered as recorded;
// and, with a browser, that each of those is said in the reader's language.
// The expected sentences are typed here rather than imported, so this fails
// if a catalogue changes without anybody looking at the page.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
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
const ASSIGNMENT = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const VERSION = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const COURSE = '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a';
const ASSET = '77777777-7777-4777-8777-777777777777';
const ENCODED = '88888888-8888-4888-8888-888888888888';
const SECTIONS = [
  { id: 's1', title: 'أحكام المياه', position: 1 },
  { id: 's2', title: `Second part ${LONG}`, position: 2 },
  { id: 's3', title: 'Third part', position: 3 },
];
const LESSONS = [
  { id: 'l1', section_id: 's1', title: 'الماء الطهور', position: 1, is_preview: true, description: null, duration_seconds: null },
  { id: 'l2', section_id: 's1', title: `Empty lesson ${LONG}`, position: 2, is_preview: false, description: null, duration_seconds: null },
  { id: 'l3', section_id: 's2', title: 'Not encoded', position: 1, is_preview: false, description: null, duration_seconds: null },
  { id: 'l4', section_id: 's2', title: 'Encoded', position: 2, is_preview: false, description: 'Synthetic description of the lesson.', duration_seconds: null },
];
const RESOURCES = [
  { id: 'r1', lesson_id: 'l1', display_name: 'Reading', resource_type: 'link', external_url: 'https://example.invalid/reading', media_asset_id: null, access_classification: 'enrolled', position: 1 },
  { id: 'r3', lesson_id: 'l3', display_name: 'درس ٣.mp4', resource_type: 'video', external_url: null, media_asset_id: ASSET, access_classification: 'enrolled', position: 1 },
  { id: 'r4', lesson_id: 'l4', display_name: 'Lesson four.mp4', resource_type: 'video', external_url: null, media_asset_id: ENCODED, access_classification: 'enrolled', position: 1 },
];
const RENDITIONS = [{ id: 'rn1', asset_id: ENCODED, profile: '480p', mime_type: 'video/mp4', bucket: 'delivery', object_key: 'synthetic/480.mp4', byte_size: 1000, width: 854, height: 480, duration_seconds: 60 }];
const DECISION = { id: 'd1', decision: 'revision_requested', rationale: 'الدرس الثاني فارغ.', decided_at: '2026-11-22T10:00:00Z' };
// The database's own words. None of these may reach a reader.
const DATABASE_WORDS = ['SYNTHETIC', 'Untitled course', 'is still open; this one is', 'unresolved conflict declaration', 'assigned reviewer', 'permission denied', 'row-level security'];
const REFUSALS = {
  notOpen: [400, { code: '23514', message: 'a decision is recorded on a review that was accepted and is still open; this one is cancelled' }],
  notMade: [403, { code: '42501', message: 'a review that is declined is not made accepted by its reviewer' }],
  conflict: [403, { code: '42501', message: `reviewer ${user.id} has an unresolved conflict declaration against course version ${VERSION}; no decision is recorded until it is heard` }],
  notYours: [403, { code: '42501', message: `decisions must be recorded by the assigned reviewer, not by ${user.id}` }],
  policy: [403, { code: '42501', message: 'new row violates row-level security policy for table "content_review_decisions"' }],
  odd: [400, { code: '23514', message: 'SYNTHETIC rule nobody wrote a sentence for' }],
  author: [403, { code: '42501', message: 'SYNTHETIC the author of a version may not approve it' }],
};

const state = {
  // The assignment row: 'ok', 'none' (not this reader's) or 'broken'.
  assignment: 'ok', status: 'accepted', decisions: [], course: true, scope: 'scholarly',
  // Each further read: 'ok' or 'broken'. `sections` may also be 'none'.
  version: 'ok', sections: 'ok', needs: 'ok', flag: 'ok', transcripts: 'ok', media: 'ok', delivery: 'ok',
  // Each write: 'ok', a key of REFUSALS, 'gateway', or (for the answer to an offer) 'nobody'.
  respond: 'ok', decide: 'ok', move: 'ok', versionStatus: 'in_review', declare: 'ok',
};
const reset = (over = {}) => Object.assign(state, { assignment: 'ok', status: 'accepted', decisions: [], course: true, scope: 'scholarly', version: 'ok', sections: 'ok', needs: 'ok', flag: 'ok', transcripts: 'ok', media: 'ok', delivery: 'ok', respond: 'ok', decide: 'ok', move: 'ok', versionStatus: 'in_review', declare: 'ok' }, over);
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
  calls.push({ method: req.method, path, payload, signedIn, query: url.search });
  const send = (value) => res.end(JSON.stringify(value));
  const broken = () => { res.writeHead(500); return send({ code: 'XX000', message: 'SYNTHETIC failure', details: null, hint: null }); };
  const refuse = (name) => { const [status, error] = REFUSALS[name]; res.writeHead(status); return send({ ...error, details: null, hint: null }); };
  const gateway = () => { res.writeHead(502, { 'content-type': 'text/html' }); return res.end('<html>SYNTHETIC gateway</html>'); };
  // One row, as `.maybeSingle()` asks for it in either of the two ways the client has asked.
  const one = (rows) => {
    if (!String(req.headers.accept ?? '').includes('vnd.pgrst.object')) return send(rows);
    if (rows.length === 1) return send(rows[0]);
    res.writeHead(406); return send({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows`, hint: null });
  };
  if (path === '/rest/v1/content_review_assignments') {
    if (req.method === 'PATCH') {
      if (state.respond === 'gateway') return gateway();
      if (state.respond === 'nobody') return send([]);
      if (state.respond !== 'ok') return refuse(state.respond);
      state.status = payload.assignment_status;
      return send([{ assignment_status: state.status }]);
    }
    if (state.assignment === 'broken') return broken();
    if (state.assignment === 'none' || !url.search.includes(ASSIGNMENT)) return one([]);
    return one([{
      id: ASSIGNMENT, course_version_id: VERSION, review_scope: state.scope, assignment_status: state.status, assigned_at: '2026-11-20T08:00:00Z', due_at: null,
      course_versions: state.course ? { course_id: COURSE, courses: { title: 'أحكام الطهارة', slug: 'ahkam' } } : null,
      content_review_decisions: state.decisions,
    }]);
  }
  if (path === '/rest/v1/content_review_decisions') {
    if (state.decide === 'gateway') return gateway();
    if (state.decide !== 'ok') return refuse(state.decide);
    state.decisions = [{ id: 'd-new', decision: payload.decision, rationale: payload.rationale, decided_at: '2026-11-28T09:00:00Z' }];
    state.status = 'completed';
    res.writeHead(201); return send([{ decision: payload.decision }]);
  }
  if (path === '/rest/v1/rpc/set_course_version_status') {
    if (state.move === 'gateway') return gateway();
    if (state.move !== 'ok') return refuse(state.move);
    state.versionStatus = payload.p_new_status;
    return send({ version_status: payload.p_new_status });
  }
  if (path === '/rest/v1/course_versions') {
    if (state.version === 'broken' && select.includes('version_number')) return broken();
    return one([{ id: VERSION, version_number: 2, version_status: state.versionStatus }]);
  }
  if (path === '/rest/v1/course_sections') return send(state.sections === 'none' ? [] : SECTIONS);
  if (path === '/rest/v1/lessons') return send(state.sections === 'none' ? [] : LESSONS);
  if (path === '/rest/v1/lesson_resources') return send(state.sections === 'none' ? [] : RESOURCES);
  if (path === '/rest/v1/rpc/version_delivery_state') return state.delivery === 'broken' ? broken() : send([{ asset_id: ENCODED, asset_status: 'available', available_copies: 1, pending_copies: 0, failed_copies: 0, video_ready: true, audio_ready: false, failure_reason: null }]);
  if (path === '/rest/v1/rpc/setting_bool') return state.flag === 'broken' ? broken() : send(true);
  if (path === '/rest/v1/lesson_transcripts') return state.transcripts === 'broken' ? broken() : send([{ lesson_id: 'l1', body: 'بسم الله. Synthetic transcript.' }]);
  if (path === '/rest/v1/media_renditions') return state.media === 'broken' ? broken() : send(RENDITIONS);
  if (path === '/rest/v1/rpc/refresh_review_requirements') return send({ requirements: [] });
  if (path === '/rest/v1/content_review_requirements') return state.needs === 'broken' ? broken() : send([]);
  if (path === '/rest/v1/technical_review_checks' || path === '/rest/v1/content_change_assessments') return send([]);
  if (path === '/rest/v1/rpc/declare_reviewer_conflict') {
    if (state.declare === 'gateway') return gateway();
    return send({ declarationId: 'c-new', declared: true, note: 'declared' });
  }
  if (path === '/rest/v1/user_profiles') {
    if (select.startsWith('user_id')) return send([]);
    return send(signedIn ? [{ display_name: 'Synthetic scholar', account_status: 'active', deleted_at: null, preferred_language: 'en', timezone: null }] : []);
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
  const has = (html, sentences, label) => { for (const s of sentences) if (!html.includes(s)) { if (process.env.SMOKE_DUMP) writeFileSync(process.env.SMOKE_DUMP, html); assert.fail(`${label} lacks "${s}"`); } };
  const lacks = (html, sentences, label) => { for (const s of sentences) assert.ok(!html.includes(s), `${label} says "${s}"`); };
  // A day and a deadline as this Node writes them; Persian's digits are pinned below.
  const dayIn = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
  const digitIn = (code, d) => new Intl.NumberFormat(code).format(Number(d));
  const asked = (name) => calls.filter((c) => c.path === `/rest/v1/${name}`);
  const PATH = `/review/${ASSIGNMENT}`;

  let response = await request(PATH, { 'accept-language': 'en' });
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), `/sign-in?next=/review/${ASSIGNMENT}`);
  // Text that is not an id names no assignment, and the database is not asked about it.
  for (const not of ['not-an-id', '------------------------------------']) {
    response = await request(`/review/${not}`, { cookie, 'accept-language': 'en' });
    assert.equal(response.status, 404, not);
  }
  assert.equal(asked('content_review_assignments').length, 0);

  // ------------------------------------------------- the page, in English
  let full = await page(PATH, { cookie, 'accept-language': 'en' });
  let en = inner(full);
  has(en, [
    '<div class="container section review-page assignment-page" data-assign-state="accepted" data-assign-seat="decide">',
    '<p class="eyebrow"><a href="/review">Review queue</a></p><h1 dir="auto">أحكام الطهارة</h1>',
    '<span class="badge neutral">Scholarly</span><span class="badge neutral">Accepted</span>',
    '<div class="n">3</div><div class="l">Sections</div>', '<div class="n">4</div><div class="l">Lessons</div>', '<div class="n">0</div><div class="l">Decisions</div>',
    '<h2>What a learner gets</h2><p>Lessons that give a learner something to open: 2 of 4</p><p>Lessons that give a learner nothing at all: 2</p>',
    `<div class="notice assignment-next" data-assign-next="2">Worth opening first: <em><bdi>Empty lesson ${LONG}</bdi></em>. It has nothing in it at all, so a learner gets a title and an empty page. <a href="/teach/${COURSE}/preview/l2">See it as a learner <span class="dir-flip" aria-hidden="true">→</span></a></div>`,
    'The decision is yours, and nothing here is a reason to accept or decline on its own',
    '<h3>Outline</h3>', '<h3 dir="auto">1. أحكام المياه</h3>',
    '<span class="t" dir="auto">1. الماء الطهور</span><span class="badge">Free preview</span><span class="badge neutral" data-assign-badge="noted">Worth a look</span><details class="assignment-wide"><summary>Transcript</summary><p class="assignment-transcript" dir="auto">بسم الله. Synthetic transcript.</p></details>',
    '<span class="badge neutral" data-assign-badge="empty">Nothing in it</span>',
    '<span class="badge neutral" data-assign-badge="silent">Nothing to play</span><span class="assignment-media"><span class="muted assignment-small" data-assign-copy="none"><bdi>درس ٣.mp4</bdi>: no delivery copy has been encoded yet, so there is nothing to watch, and a learner would get a sentence where the player should be.</span></span>',
    '<span class="t" dir="auto">2. Encoded</span><span class="badge neutral" data-assign-badge="ready">Ready</span>',
    '<h3 dir="auto">3. Third part</h3><p class="empty">No lessons.</p>',
    '<p class="muted assignment-small" data-assign-watchable="yes">You can watch the delivery copies of these lessons while this review is open.',
    '<h3>What this version needs, and what has been checked</h3></div><div lang="en" dir="ltr" data-assign-english="true">',
    '<h3>Your decision</h3></div><div class="assignment-actions" data-assign-actions="decide"><div class="card"><h3>Record your decision</h3><label for="rationale">Reason</label>',
    'placeholder="What did you check, and what did you find? This is the record a teacher would appeal against." dir="auto" required=""',
    '<button type="button" class="btn" disabled="">Approve</button><button type="button" class="btn secondary" disabled="">Request revisions</button><button type="button" class="btn secondary" disabled="">Reject</button>',
    '<h3>Cannot review this impartially?</h3>', '<summary class="assignment-open">Declare a conflict about this course</summary>',
    '<option value="authorship" selected="">I wrote it</option>', '<p class="review-foot"><a href="/review">Back to the queue</a></p>',
  ], 'English assignment page');
  lacks(en, ['data-assign-unread', 'data-assign-outline', 'data-assign-closed', 'The two panels below', ...DATABASE_WORDS], 'English assignment page');
  // The delivery copy that exists is a player, with nothing to save.
  assert.ok(!en.includes('<bdi>Lesson four.mp4</bdi>: no delivery copy'), 'an encoded file is called not encoded');
  assert.match(htmlRoot(full), /lang="en"/);
  assert.ok(full.includes('<title>Review queue'), 'the tab is not named');
  // The assignment was read once, and the outline once.
  assert.equal(asked('course_sections').length, 1);

  // -------------------------------------------------- the page, in Arabic
  calls.length = 0;
  full = await page(PATH, { cookie, 'accept-language': 'ar' });
  const ar = inner(full);
  assert.match(htmlRoot(full), /lang="ar"/); assert.match(htmlRoot(full), /dir="rtl"/);
  has(ar, [
    '<div class="container section review-page assignment-page" data-assign-state="accepted" data-assign-seat="decide">',
    '<a href="/review">قائمة المراجعات</a></p><h1 dir="auto">أحكام الطهارة</h1>',
    `<div class="n">${digitIn('ar', 3)}</div>`, `<div class="n">${digitIn('ar', 4)}</div>`, `<div class="n">${digitIn('ar', 0)}</div><div class="l">القرارات</div>`,
    `<h2>ما يحصل عليه المتعلّم</h2><p>الدروس التي تقدّم للمتعلّم شيئًا يفتحه: ${digitIn('ar', 2)} من ${digitIn('ar', 4)}</p><p>الدروس التي لا تقدّم للمتعلّم شيئًا على الإطلاق: ${digitIn('ar', 2)}</p>`,
    `data-assign-next="2">يحسن فتحه أولًا: <em><bdi>Empty lesson ${LONG}</bdi></em>. ليس فيه شيء على الإطلاق، فلا يجد المتعلّم إلا عنوانًا وصفحة فارغة. <a href="/teach/${COURSE}/preview/l2">شاهده كما يراه المتعلّم `,
    'القرار قرارك، وليس في شيء مما هنا سبب كافٍ وحده للقبول أو للاعتذار', '<h3>المخطط</h3>',
    `<h3 dir="auto">${digitIn('ar', 1)}. أحكام المياه</h3>`, `<span class="t" dir="auto">${digitIn('ar', 2)}. Encoded</span><span class="badge neutral" data-assign-badge="ready">جاهز</span>`,
    'data-assign-badge="noted">يستحق نظرة</span>', 'data-assign-badge="empty">لا شيء فيه</span>', 'data-assign-badge="silent">لا شيء يُشغَّل</span>',
    '<span class="muted assignment-small" data-assign-copy="none"><bdi>درس ٣.mp4</bdi>: لم تُرمَّز بعدُ نسخة للعرض، فلا يوجد ما يُشاهَد، وسيجد المتعلّم جملة في مكان المشغّل.</span>',
    // The player of the copy that exists speaks the reader's language too (it was English in every language).
    '<label class="muted" for="quality-rn1">الجودة</label>', 'روابط التشغيل قصيرة الأجل ومرتبطة بصلاحية وصولك إلى هذا الدرس.',
    '<p class="empty">لا دروس.</p>', 'data-assign-watchable="yes">يمكنك مشاهدة نسخ العرض لهذه الدروس ما دامت هذه المراجعة مفتوحة.',
    // The two shared panels are English, are said to be, and are marked as English inside a right-to-left page.
    '<h3>ما تحتاج إليه هذه النسخة، وما جرى التحقق منه</h3></div><p class="muted assignment-small">اللوحتان التاليتان بالإنجليزية في الوقت الحاضر.</p><div lang="en" dir="ltr" data-assign-english="true">',
    '<h3>قرارك</h3>', '<h3>سجّل قرارك</h3><label for="rationale">السبب</label>', 'placeholder="ما الذي تحققت منه، وماذا وجدت؟ هذا هو السجل الذي قد يتظلّم منه المعلّم."',
    '<button type="button" class="btn" disabled="">وافق</button><button type="button" class="btn secondary" disabled="">اطلب تعديلات</button><button type="button" class="btn secondary" disabled="">ارفض</button>',
    'الموافقة تنقل النسخة إلى حالة «تمت الموافقة»', '<h3>لا تستطيع مراجعتها بحياد؟</h3>', '<summary class="assignment-open">أفصح عن تعارض يخص هذه الدورة</summary>',
    '<a href="/review">العودة إلى القائمة</a>',
  ], 'Arabic assignment page');
  // Outside the two marked panels, no English sentence of this page is left.
  const outside = ar.slice(0, ar.indexOf('<div lang="en" dir="ltr" data-assign-english="true">')) + ar.slice(ar.indexOf('<div class="outline-h assignment-head"><h3>قرارك</h3>'));
  lacks(outside, ['Review queue', 'Scholarly', 'Accepted', 'Sections', 'Lessons', 'Decisions', 'learner', 'Outline', 'Free preview', 'Transcript', 'Worth', 'Nothing', 'Ready', 'delivery cop', 'Reason', 'Approve', 'Reject', 'Request revisions', 'Quality', 'Playback links', 'cannot play', 'Kind of conflict', 'the conflict', 'Declare', 'Back to', ...DATABASE_WORDS], 'Arabic assignment page');

  // Persian counts in Persian digits; a language held for review is given English, and the page says so in its markup.
  const fa = inner(await page(PATH, { cookie, 'accept-language': 'fa' }));
  has(fa, [`<div class="n">${digitIn('fa', 3)}</div>`, `<h3 dir="auto">${digitIn('fa', 1)}. أحكام المياه</h3>`], 'Persian assignment page');
  const held = inner(await page(PATH, { cookie, 'accept-language': 'ha' }));
  has(held, ['<div class="container section review-page assignment-page" data-assign-state="accepted" data-assign-seat="decide" lang="en" dir="ltr">', '<h3>Record your decision</h3>'], 'held language');
  lacks(held, ['The two panels below'], 'held language');
  console.log('Assignment page: signed out goes to sign-in and text that is not an id is a 404, with the database not asked; English and Arabic each whole, with every count in the reader’s digits, the course’s, the lessons’ and a file’s name in their own direction, and the two shared panels marked as English and said to be; a held language is given English in a marked frame.');

  // ------------------------------------------- which form the reader is given
  reset({ status: 'offered' });
  calls.length = 0;
  let html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
  has(html, ['data-assign-state="offered" data-assign-seat="offer"', '<span class="badge ">Offered</span>', '<h3>This review is offered to you</h3><p class="meta">Nothing is expected until you accept it.</p>', '<button type="button" class="btn">Accept this review</button><button type="button" class="btn secondary">Decline</button>',
    'data-assign-watchable="no">The lessons can be played from the moment a review is accepted until it is closed, so they cannot be played here now.', 'data-assign-conflict'], 'offered');
  lacks(html, ['Record your decision', 'data-assign-copy', 'Record a check'], 'offered');
  assert.equal(asked('media_renditions').length, 0, 'delivery copies are asked for on a review that cannot play them');

  reset({ status: 'completed', decisions: [DECISION] });
  html = inner(await page(PATH, { cookie, 'accept-language': 'ar' }));
  has(html, ['data-assign-state="completed" data-assign-seat="decided"', `<div class="n">${digitIn('ar', 1)}</div><div class="l">القرارات</div>`,
    `<div class="notice" data-assign-decided="true">لقد سجّلت قرارًا في هذه المراجعة من قبل.<ul><li><strong>طُلبت تعديلات</strong><span class="meta"> · ${dayIn('ar', DECISION.decided_at)}</span><div class="meta" dir="auto">الدرس الثاني فارغ.</div></li></ul></div>`], 'decided');
  lacks(html, ['سجّل قرارك', 'data-assign-conflict', 'data-assign-closed'], 'decided');

  // Until 2026-11-28 each of these was shown the form for recording a decision.
  for (const status of ['declined', 'cancelled', 'completed']) {
    reset({ status });
    html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
    has(html, [`data-assign-state="${status}" data-assign-seat="closed"`, '<div class="notice" data-assign-closed="true">This review is closed, so no decision can be recorded on it.</div>'], status);
    lacks(html, ['Record your decision', 'id="rationale"', 'data-assign-conflict', 'Accept this review'], status);
  }

  // A course this reader may not read: the library's English stand-in is not printed, and no link is built to nowhere.
  reset({ course: false });
  html = inner(await page(PATH, { cookie, 'accept-language': 'ar' }));
  has(html, ['<h1>بلا عنوان</h1>', 'data-assign-next="2"'], 'unreadable course');
  lacks(html, ['Untitled', 'href="/teach/'], 'unreadable course');
  console.log('Assignment seats: an offer has two buttons and nothing to play; a decision already made is shown with its day and its reason and no form; a declined, a cancelled and a completed review each say they are closed and offer no form (each was offered one before); a course that cannot be read is “untitled” in the reader’s language.');

  // ------------------------------------------------- reads that failed
  reset({ assignment: 'broken' });
  html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
  has(html, ['<div class="container section review-page assignment-page"><p class="eyebrow"><a href="/review">Review queue</a></p><div class="notice error" role="alert" data-assign-state="unread">This review could not be read just now. Try again in a moment.</div><p class="review-foot"><a href="/review">Back to the queue</a></p></div>'], 'unread assignment');
  html = inner(await page(PATH, { cookie, 'accept-language': 'ar' }));
  has(html, ['role="alert" data-assign-state="unread">تعذّرت قراءة هذه المراجعة الآن. حاول مرة أخرى بعد قليل.</div>'], 'unread assignment in Arabic');
  reset({ assignment: 'none' });
  response = await request(PATH, { cookie, 'accept-language': 'en' });
  assert.equal(response.status, 404, 'an assignment that is not this reader’s is not found');

  reset({ version: 'broken' });
  html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
  has(html, ['<div class="n">—</div><div class="l">Sections</div>', '<div class="n">—</div><div class="l">Lessons</div>',
    '<div class="notice error" role="alert" data-assign-outline="unread">The outline of this course could not be read just now, so it is not shown. Load the page again before you decide.</div>', 'data-assign-english'], 'unread outline');
  lacks(html, ['This version has no sections', 'data-assign-gist', 'data-assign-unread'], 'unread outline');
  reset({ sections: 'none' });
  html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
  has(html, ['<div class="n">0</div><div class="l">Sections</div>', '<div class="empty" data-assign-outline="none">This version has no sections. There is nothing to review, and it cannot be published.</div>'], 'no sections');
  lacks(html, ['data-assign-gist', 'role="alert"'], 'no sections');

  const PART = 'Some of this page could not be read just now, so it is incomplete. Load it again before you decide.';
  reset({ needs: 'broken' });
  html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
  has(html, [`<div class="notice error assignment-gap" role="alert" data-assign-unread="needs">${PART}</div>`, 'data-assign-gist', '<h3>Record your decision</h3>'], 'unread requirements');
  lacks(html, ['data-assign-english', 'Nothing is required of this version'], 'unread requirements');
  reset({ flag: 'broken' });
  html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
  has(html, [`data-assign-unread="switch">${PART}</div>`, '<span class="t" dir="auto">1. الماء الطهور</span><span class="badge">Free preview</span><details'], 'unread switch');
  // What a learner gets is not worked out on a guess.
  lacks(html, ['data-assign-gist', 'data-assign-badge'], 'unread switch');
  reset({ transcripts: 'broken' });
  html = inner(await page(PATH, { cookie, 'accept-language': 'ar' }));
  has(html, ['data-assign-unread="transcripts">تعذّرت الآن قراءة جزء من هذه الصفحة، فهي غير مكتملة. أعد تحميلها قبل أن تقرّر.</div>', 'data-assign-gist'], 'unread transcripts');
  lacks(html, ['<details class="assignment-wide">'], 'unread transcripts');
  reset({ media: 'broken' });
  html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
  has(html, [`data-assign-unread="media">${PART}</div>`, 'data-assign-badge="ready"'], 'unread delivery copies');
  // Copies that were not read are not each called "not encoded yet".
  lacks(html, ['data-assign-copy', 'no delivery copy has been encoded yet', 'assignment-media'], 'unread delivery copies');
  reset({ needs: 'broken', transcripts: 'broken', media: 'broken' });
  html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
  has(html, ['data-assign-unread="needs transcripts media"'], 'three unread parts');
  assert.equal(html.match(/role="alert"/g)?.length, 1, 'one notice for the parts that were not read');
  reset({ delivery: 'broken' });
  html = inner(await page(PATH, { cookie, 'accept-language': 'en' }));
  has(html, ['<p class="muted">The encoding state of uploaded files could not be read just now, so a file shown without a player may be one nobody asked about rather than one that failed.</p>'], 'unknown encoding state');
  lacks(html, ['data-assign-unread'], 'unknown encoding state');
  console.log('Assignment reads: an assignment that could not be read is said to be unread (it was “not found”), and one that is not the reader’s is a 404; an outline that could not be read is said so with dashes for its counts (it was “no sections, nothing to review”); requirements, the previews switch, transcripts and delivery copies each failing leave the page standing with one notice, with nothing guessed about what a learner gets and no file called “not encoded”.');

  // --------------------------------------------------------------- the route
  const post = async (payload, headers = { cookie }) => {
    const res = await fetch(`${origin}/api/review`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof payload === 'string' ? payload : JSON.stringify(payload), signal: AbortSignal.timeout(90000) });
    return { status: res.status, json: await res.json() };
  };
  const writes = () => calls.filter((c) => c.method !== 'GET' && (c.path === '/rest/v1/content_review_assignments' || c.path === '/rest/v1/content_review_decisions' || c.path === '/rest/v1/rpc/set_course_version_status')).length;
  const refusedAs = async (payload, status, code, label, headers) => {
    const got = await post(payload, headers);
    assert.equal(got.status, status, `${label}: ${JSON.stringify(got.json)}`);
    assert.equal(got.json.ok, false, label); assert.equal(got.json.code, code, label);
    return got.json;
  };
  reset(); calls.length = 0;
  const RESPOND = { action: 'respond', assignmentId: ASSIGNMENT, accept: true };
  const DECIDE = { action: 'decide', assignmentId: ASSIGNMENT, decision: 'approved', rationale: 'Synthetic reason.' };
  await refusedAs(RESPOND, 401, 'signedOut', 'signed out', {});
  await refusedAs('{', 400, 'refused', 'malformed');
  await refusedAs({ ...RESPOND, assignmentId: 'not-an-id' }, 400, 'refused', 'no id');
  await refusedAs({ ...RESPOND, assignmentId: '------------------------------------' }, 400, 'refused', 'dashes for an id');
  await refusedAs({ ...RESPOND, action: 'publish' }, 400, 'refused', 'unknown action');
  // Anything but true or false declines nothing.
  for (const accept of [undefined, null, 'false', 0]) await refusedAs({ ...RESPOND, accept }, 400, 'refused', `accept ${String(accept)}`);
  await refusedAs({ ...DECIDE, decision: 'published' }, 400, 'refused', 'unknown decision');
  for (const rationale of [undefined, '', '   \n', 7]) await refusedAs({ ...DECIDE, rationale }, 422, 'reason', `rationale ${JSON.stringify(rationale)}`);
  assert.equal(writes(), 0, 'something was written for a request refused before the database');
  assert.equal(asked('content_review_assignments').length, 0, 'the database was asked about a request refused by its shape');

  reset({ status: 'offered' });
  let got = await post(RESPOND);
  assert.deepEqual([got.status, got.json], [200, { ok: true, value: { status: 'accepted' } }]);
  assert.equal(calls.filter((c) => c.method === 'PATCH').at(-1).payload.assignment_status, 'accepted');
  reset({ status: 'offered' });
  got = await post({ ...RESPOND, accept: false });
  assert.deepEqual([got.status, got.json], [200, { ok: true, value: { status: 'declined' } }]);
  assert.deepEqual(calls.filter((c) => c.method === 'PATCH').at(-1).payload, { assignment_status: 'declined', accepted_at: null });
  // No row came back: the policy let nothing through.
  reset({ respond: 'nobody' }); await refusedAs(RESPOND, 403, 'notYours', 'no row answered');
  reset({ respond: 'notMade' }); await refusedAs(RESPOND, 409, 'notOpen', 'a declined review accepted');
  reset({ respond: 'odd' }); await refusedAs(RESPOND, 422, 'refused', 'a rule with no sentence');
  reset({ respond: 'gateway' });
  let failed = await refusedAs(RESPOND, 502, 'unsure', 'a gateway’s page');
  assert.equal(failed.message, 'The answer could not be read.');

  for (const [decide, status, code] of [['notOpen', 409, 'notOpen'], ['conflict', 409, 'conflict'], ['notYours', 403, 'notYours'], ['policy', 403, 'notYours'], ['odd', 422, 'refused'], ['author', 422, 'refused']]) {
    reset({ decide }); calls.length = 0;
    await refusedAs(DECIDE, status, code, `decide ${decide}`);
    assert.equal(asked('rpc/set_course_version_status').length, 0, `${decide}: the course was moved on a decision that was refused`);
  }
  reset({ decide: 'gateway' });
  failed = await refusedAs(DECIDE, 502, 'unsure', 'a gateway’s page for a decision');
  assert.ok(!JSON.stringify(failed).includes('SYNTHETIC'), 'a gateway’s page is passed on');
  reset({ assignment: 'none' }); calls.length = 0;
  await refusedAs(DECIDE, 403, 'notYours', 'somebody else’s assignment');
  reset({ assignment: 'broken' });
  // An assignment that could not be read is not "not yours", and nothing was written.
  await refusedAs(DECIDE, 502, 'refused', 'an assignment that could not be read');
  assert.equal(writes(), 0);

  reset(); calls.length = 0;
  got = await post(DECIDE);
  assert.deepEqual([got.status, got.json], [200, { ok: true, value: { decision: 'approved' }, moved: 'yes' }]);
  assert.deepEqual(asked('content_review_decisions').at(-1).payload, { review_assignment_id: ASSIGNMENT, course_version_id: VERSION, review_scope: 'scholarly', decision: 'approved', rationale: 'Synthetic reason.', decided_by: user.id });
  assert.deepEqual(asked('rpc/set_course_version_status').at(-1).payload, { p_version_id: VERSION, p_new_status: 'approved', p_actor_id: user.id, p_reason: 'Review decision: Approve' });
  reset(); got = await post({ ...DECIDE, decision: 'revision_requested' });
  assert.equal(got.json.moved, 'yes'); assert.equal(asked('rpc/set_course_version_status').at(-1).payload.p_new_status, 'rejected');
  // The decision is recorded and the course stays: until 2026-11-28 this was answered 409, as if nothing had been recorded.
  for (const move of ['author', 'gateway']) {
    reset({ move });
    got = await post(DECIDE);
    assert.deepEqual([got.status, got.json], [200, { ok: true, value: { decision: 'approved' }, moved: 'no' }], move);
  }
  // A second reviewer approving a version the first already moved.
  reset({ move: 'odd', versionStatus: 'approved' });
  got = await post(DECIDE);
  assert.deepEqual([got.status, got.json], [200, { ok: true, value: { decision: 'approved' }, moved: 'already' }]);
  console.log('Assignment route: thirteen requests refused by their shape with the database not asked; signed out is 401; accepting and declining each send one change; no row answered is “not yours”; six of the database’s refusals of a decision each come back by name with the course not touched; a gateway’s page is 502 “unsure” and is not passed on; an assignment that could not be read is refused rather than called somebody else’s; a decision whose course did not move is answered as recorded, with “no” or “already”.');

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
      const sent = []; tab.on('request', (r) => { if (/\/api\/review(\/profile)?$/.test(r.url()) && r.method() === 'POST') sent.push({ to: new URL(r.url()).pathname, ...r.postDataJSON() }); });
      await tab.goto(`${origin}${PATH}`, { waitUntil: 'networkidle' });
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
      // The three decisions are three whole buttons, none cut off.
      const cut = await tab.evaluate(() => [...document.querySelectorAll('main .assignment-buttons button')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent));
      assert.deepEqual(cut, [], `${label}: a button's word is cut off`);
    };
    const SIZES = [[320, null], [320, 'v1.larger.normal.system.dyslexic'], [390, null], [1440, null]];
    for (const [code, record, declare, declareIt] of [
      ['en', 'Record your decision', 'Declare a conflict about this course', 'Declare it'],
      ['ar', 'سجّل قرارك', 'أفصح عن تعارض يخص هذه الدورة', 'أفصح عنه'],
      ['fr', 'Consigner votre décision', 'Déclarer un conflit d’intérêts au sujet de ce cours', 'Le déclarer'],
      ['ta', 'உங்கள் முடிவைப் பதிவு செய்யுங்கள்', 'இந்தப் பாடநெறி குறித்து நலன் முரணை அறிவி', 'அறிவி'],
    ]) {
      for (const [width, a11y] of SIZES) {
        reset({ decide: 'conflict' });
        const label = `${code} ${width}${a11y ? ' largest text and the dyslexia font' : ''}`;
        const { context, tab, errors } = await open(code, width, a11y);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: record, exact: true, level: 3 }).count(), 1, `${label}: heading`);
        await fits(tab, width, `${label} assignment`);
        // The two panels left in English read left to right, whatever the page does.
        assert.deepEqual(await tab.evaluate(() => { const el = document.querySelector('[data-assign-english]'); return [el.lang, getComputedStyle(el).direction]; }), ['en', 'ltr'], label);
        // A refusal above the decision and the declaration open with a refusal under it must fit too.
        await tab.locator('#rationale').fill('السبب: الدرس الثاني فارغ. Synthetic reason that is long enough to wrap.');
        await tab.locator('.assignment-buttons button').first().click();
        await tab.locator('[data-assign-refusal="conflict"]').waitFor();
        await tab.locator('summary', { hasText: declare }).click();
        await tab.getByRole('button', { name: declareIt, exact: true }).click();
        await tab.locator('[data-assign-conflict] [role="alert"]').waitFor();
        await fits(tab, width, `${label} assignment with both refusals`);
        assert.deepEqual(errors, [], `${label}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && width !== 1440) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/assignment-${code}-${width}${a11y ? '-dys' : ''}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic assignment page in ${code}: fits at 320, 390 and 1440px, and at 320px with the largest text and the dyslexia font, with a refusal over the decision and the declaration open with a refusal under it.`);
    }

    // ----------------------------------------------- the forms, in Arabic
    {
      const UNSURE = 'لا أحد يستطيع أن يقول هل سُجّل ذلك. أعد تحميل الصفحة وانظر قبل أن ترسله من جديد.';
      const refusal = async (tab, code, sentence) => {
        const alert = tab.locator(`[data-assign-refusal="${code}"]`);
        await alert.waitFor();
        assert.equal((await alert.textContent()).trim(), sentence, code);
        assert.equal(await tab.locator('.assignment-actions [role="alert"]').count(), 1, 'one refusal at a time');
      };
      // An offer: a gateway's page is "nobody can say", then the buttons work again and the offer is accepted.
      reset({ status: 'offered', respond: 'gateway' });
      let { context, tab, errors, sent } = await open('ar', 390, null);
      await tab.getByRole('button', { name: 'اقبل هذه المراجعة', exact: true }).click();
      await refusal(tab, 'unsure', UNSURE);
      assert.equal(await tab.getByRole('button', { name: 'اعتذر عنها', exact: true }).isEnabled(), true, 'the buttons stay disabled after an answer nobody could read');
      state.respond = 'notMade';
      await tab.getByRole('button', { name: 'اقبل هذه المراجعة', exact: true }).click();
      await refusal(tab, 'notOpen', 'لم تعد هذه المراجعة مفتوحة لذلك. أعد تحميل الصفحة لترى أين وصلت.');
      state.respond = 'ok';
      await tab.getByRole('button', { name: 'اقبل هذه المراجعة', exact: true }).click();
      await tab.locator('[data-assign-actions="decide"]').waitFor();
      assert.equal(await tab.locator('.assignment-actions [role="alert"]').count(), 0, 'a refusal outlives the thing it refused');
      assert.deepEqual(sent.map((s) => [s.action, s.accept]), [['respond', true], ['respond', true], ['respond', true]]);

      // A decision: nothing can be sent without a reason; each refusal is said by name and what was typed is kept.
      const approve = tab.getByRole('button', { name: 'وافق', exact: true });
      assert.equal(await approve.isDisabled(), true);
      await tab.locator('#rationale').fill('   ');
      assert.equal(await approve.isDisabled(), true, 'spaces are taken for a reason');
      const REASON = 'راجعتُ الدروس الأربعة. الدرس الثاني فارغ.';
      await tab.locator('#rationale').fill(REASON);
      for (const [decide, code, sentence] of [
        ['conflict', 'conflict', 'تعارض أفصحت عنه يمنعك من البتّ في هذه المراجعة.'],
        ['notOpen', 'notOpen', 'لم تعد هذه المراجعة مفتوحة لذلك. أعد تحميل الصفحة لترى أين وصلت.'],
        ['notYours', 'notYours', 'هذه المراجعة ليست لك.'],
        ['odd', 'refused', 'لم يُسجَّل. أعد تحميل الصفحة لترى أين وصلت المراجعة.'],
        ['gateway', 'unsure', UNSURE],
      ]) {
        state.decide = decide;
        await approve.click();
        await refusal(tab, code, sentence);
        assert.equal(await tab.locator('#rationale').inputValue(), REASON, `${decide}: what was typed is lost`);
      }
      // A request that never arrives is not called a refusal, and does not leave the buttons disabled.
      await tab.route('**/api/review', (route) => route.abort());
      await tab.getByRole('button', { name: 'ارفض', exact: true }).click();
      await refusal(tab, 'unsure', UNSURE);
      assert.equal(await approve.isEnabled(), true);
      await tab.unroute('**/api/review');
      const main = await tab.locator('main').innerText();
      for (const word of DATABASE_WORDS) assert.ok(!main.includes(word), `the page shows “${word}”`);

      // Recorded, and the course did not move: said as recorded, with the decision shown and no form left.
      state.decide = 'ok'; state.move = 'author';
      await tab.getByRole('button', { name: 'اطلب تعديلات', exact: true }).click();
      await tab.locator('[data-assign-actions="decided"]').waitFor();
      assert.equal((await tab.locator('[data-assign-moved="no"]').textContent()).trim(), 'سُجّل قرارك. أما الدورة نفسها فتعذّر نقلها من هنا؛ فريق المنصة يرى قرارك ويستطيع نقلها. لا تحتاج إلى أن تقرّر مرة أخرى.');
      assert.equal(await tab.locator('.assignment-actions [role="alert"]').count(), 0, 'a recorded decision is shown as a failure');
      assert.match(await tab.locator('[data-assign-decided]').innerText(), /طُلبت تعديلات[\s\S]*راجعتُ الدروس الأربعة/u);
      assert.equal(await tab.locator('#rationale').count(), 0);
      assert.equal(await tab.locator('[data-assign-conflict]').count(), 0, 'a closed review still offers a declaration');
      assert.deepEqual(sent.at(-1), { to: '/api/review', assignmentId: ASSIGNMENT, action: 'decide', decision: 'revision_requested', rationale: REASON });
      assert.deepEqual(errors, []);
      await context.close();

      // Standing aside: an empty declaration is refused in the browser with nothing sent; one that is made is shown as made.
      reset();
      ({ context, tab, errors, sent } = await open('ar', 390, null));
      const before = asked('rpc/declare_reviewer_conflict').length;
      await tab.locator('summary', { hasText: 'أفصح عن تعارض يخص هذه الدورة' }).click();
      await tab.getByRole('button', { name: 'أفصح عنه', exact: true }).click();
      const under = tab.locator('[data-assign-conflict] [role="alert"]');
      await under.waitFor();
      assert.match(await under.textContent(), /[\u0600-\u06FF]/u); assert.doesNotMatch(await under.textContent(), /[A-Za-z]{4}/u);
      assert.equal(sent.length, 0); assert.equal(asked('rpc/declare_reviewer_conflict').length, before);
      await tab.locator('#assignment-conflict-text').fill('المؤلف أخي.');
      await tab.locator('#assignment-conflict-kind').selectOption('family');
      state.declare = 'gateway';
      await tab.getByRole('button', { name: 'أفصح عنه', exact: true }).click();
      await tab.waitForFunction((sentence) => document.querySelector('[data-assign-conflict] [role="alert"]')?.textContent === sentence, UNSURE);
      assert.equal(await tab.locator('#assignment-conflict-text').inputValue(), 'المؤلف أخي.');
      state.declare = 'ok';
      await tab.getByRole('button', { name: 'أفصح عنه', exact: true }).click();
      await tab.locator('[data-assign-conflict] .badge.warn', { hasText: 'أُفصح عنه' }).waitFor();
      assert.equal(await under.count(), 0);
      assert.equal(await tab.locator('#assignment-conflict-text').inputValue(), '');
      assert.deepEqual(asked('rpc/declare_reviewer_conflict').at(-1).payload, { p_conflict_type: 'family', p_description: 'المؤلف أخي.', p_course_version_id: VERSION });
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic assignment forms in Arabic: an offer answered by a gateway’s page is “nobody can say” and the buttons work again; no decision can be sent without a reason; a conflict, a closed review, somebody else’s review, a refusal with no sentence of its own, a gateway’s page and a request that never arrived are each said in Arabic by name with what was typed kept; a decision recorded on a course that did not move is said to be recorded, with the decision shown and no form or declaration left; an empty declaration is refused with nothing sent, and one that is made names this version and is shown as made.');
    }
  }
  console.log('Assignment HTTP smoke passed. Not real Auth, RLS, the triggers of migration 371 or `set_course_version_status()`; no review was accepted, no decision was recorded and no course moved, and no speaker has read the translations.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
