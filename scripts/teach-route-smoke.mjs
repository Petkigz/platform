// Real Next /teach page and the `create_course` action of the /api/teach
// route against an entirely synthetic loopback Auth/REST API. This is not
// evidence about hosted Supabase, JWT validation, RLS, the `courses` table's
// own constraints, or the rules inside has_role(), my_screening_status(),
// my_takedown_notices() or my_teacher_terms(): the stand-in answers whatever
// it is asked, and refuses only when this script tells it to. No real teacher
// is in it; every course, check and notice here is invented.
//
// What it does show: the page somebody who is not a teacher is sent and the
// page a teacher is sent, in English, in Arabic, in Persian digits and dates,
// and in English for a language held for review; that the four cards the
// page does not yet say in the reader's language are in one block marked as
// English and nothing else on a translated page is English; each state of
// the screening record, with what it stops said only when the answer says
// whether the platform is asking; a course's title and state as the database
// has them; and what the route answers when a course is made, when its title
// is in letters an address cannot carry, when the name is taken, when the
// database refuses, and when nobody can say what happened.
// The expected sentences are typed here rather than imported, so this fails
// if a catalogue changes without anybody looking at the page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@synthetic.example', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;

// A sentence only the database would write.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE new row violates row-level security policy for table "courses"';
const NEW_COURSE = '7c1d9f52-2a0b-4f36-8f4e-1c9a52a0d001';
const NEW_VERSION = '7c1d9f52-2a0b-4f36-8f4e-1c9a52a0d002';
const LONG_TITLE = `Synthetic ${'courseTitleWithNoPlaceToBreak'.repeat(3)}`;
const COURSES = [
  { id: 'a0000000-0000-4000-8000-000000000001', slug: 'synthetic-tajweed', title: 'Synthetic Tajweed for beginners', status: 'active' },
  { id: 'a0000000-0000-4000-8000-000000000002', slug: 'course-3f9a2c1b0d', title: 'مقدمة اصطناعية في التجويد', status: 'draft' },
  { id: 'a0000000-0000-4000-8000-000000000003', slug: 'synthetic-old', title: LONG_TITLE, status: 'retired' },
  // A state this page has no word for.
  { id: 'a0000000-0000-4000-8000-000000000004', slug: 'synthetic-odd', title: 'Synthetic odd one', status: 'SYNTHETIC_STATE' },
];
const NOTICE = {
  id: 'b0000000-0000-4000-8000-000000000001', reference: 'TD-SYNTHETIC-0001', courseTitle: 'Synthetic Tajweed for beginners', versionNumber: 1,
  status: 'held', claimant: 'Synthetic claimant', claimantRole: 'owner', work: 'Synthetic work', material: 'Synthetic material',
  noticeText: 'Synthetic notice text.', receivedAt: '2026-11-20T09:14:00+00:00', reviewBy: '2026-12-04', answered: false, response: null, outcome: null, reason: null,
};

const fresh = () => ({
  // The roles has_role() says yes to.
  roles: new Set(['instructor']),
  // What setting_bool() answers, by key.
  flags: {},
  courses: [],
  published: [],
  screening: { recorded: false, required: false },
  takedown: { notices: [], held: 0 },
  terms: { slug: 'teaching', title: 'Teacher terms', documentFound: true, enforced: false, versionNumber: 2, accepted: true, acceptedAt: '2026-11-01T10:00:00+00:00', canUpload: true },
  // What inserting a course and its first version answer: 'ok', 'gateway', or [status, body].
  course: 'ok',
  version: 'ok',
  delay: 0,
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
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, query: url.search, signedIn });
  const send = (value) => res.end(JSON.stringify(value));
  const answer = async (what, made) => {
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
    if (what === 'ok') { res.writeHead(201); return send(made); }
    if (what === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); return res.end('<html>SYNTHETIC-DATABASE gateway</html>'); }
    res.writeHead(what[0]); return send(what[1]);
  };
  if (path === '/rest/v1/rpc/setting_bool') return send(state.flags[payload?.p_key] === true);
  if (!signedIn) { res.writeHead(401); res.end('{}'); return; }
  if (path === '/rest/v1/rpc/has_role') return send(state.roles.has(payload?.p_role_code));
  if (path === '/rest/v1/rpc/my_screening_status') return send(state.screening);
  if (path === '/rest/v1/rpc/my_takedown_notices') return send(state.takedown);
  if (path === '/rest/v1/rpc/my_teacher_terms') return send(state.terms);
  if (path === '/rest/v1/rpc/my_ijazah_authorisations') return send([]);
  if (path === '/rest/v1/rpc/notification_badge') return send(0);
  if (path === '/rest/v1/policy_versions') return send([{ version_number: 4, policy_documents: { slug: 'safeguarding' } }]);
  if (path === '/rest/v1/courses' && req.method === 'GET') return send(state.courses);
  if (path === '/rest/v1/course_versions' && req.method === 'GET') return send(state.published.map((id) => ({ course_id: id })));
  if (path === '/rest/v1/courses' && req.method === 'POST') {
    if (state.course === 'ok') state.courses = [{ id: NEW_COURSE, slug: payload.slug, title: payload.title, status: 'draft' }, ...state.courses];
    return answer(state.course, { id: NEW_COURSE });
  }
  if (path === '/rest/v1/course_versions' && req.method === 'POST') return answer(state.version, { id: NEW_VERSION });
  if (path.startsWith('/rest/v1/rpc/')) return send({});
  res.writeHead(404); res.end('{}');
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = resolve(import.meta.dirname, '..');
const refusal = (status, code, message) => [status, { code, message, details: null, hint: null }];
const inserts = (table) => calls.filter((c) => c.method === 'POST' && c.path === `/rest/v1/${table}`);

const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const seen = { logs: '' };
const origin = `http://localhost:${port}`;

// The page itself: what is inside <main>, without the scripts Next adds, the
// comments React puts between two pieces of text, or the entities it writes
// an apostrophe and a quotation mark as.
const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'').replaceAll('&quot;', '"');
const has = (html, sentences, what) => { for (const sentence of sentences) assert.ok(html.includes(sentence), `${what} lacks "${sentence}"\n${html.slice(0, 12000)}`); };
const hasNot = (html, sentences, what) => { for (const sentence of sentences) assert.ok(!html.includes(sentence), `${what} still says "${sentence}"`); };
// The block the page marks as English, and the page without it.
const BLOCK = '<div lang="en" dir="ltr" data-teach-english="true">';
const parts = (html, what) => {
  const start = html.indexOf(BLOCK); const end = html.indexOf('<p data-teach-link="/teach/promotions">');
  assert.ok(start > 0 && end > start, `${what}: the English block is not marked\n${html.slice(0, 6000)}`);
  return { english: html.slice(start, end), rest: html.slice(0, start) + html.slice(end) };
};
// English a translated page must not hold outside the block it marks. A
// course's title and the kind of check begin "Synthetic" here.
const ENGLISH_ONLY = ['Teaching', 'teaching area', 'by appointment', 'The owner', 'You may ask', 'Apply to teach', 'Go to my learning', 'My courses', 'You keep', 'A notice', 'One of your', 'Courses of yours', 'The claim', 'Promotions', 'run an offer', 'Screening', 'No check', 'Checked', 'Lapsed', 'Did not pass', 'A check', 'Your last check', 'The kind of check', 'Until a current', 'The platform is not', 'This record', 'You have not', 'Draft', 'Active', 'Retired', 'Published', 'Open curriculum', 'Learning paths', 'curate', 'Public teacher', 'introduce yourself', 'Media library', 'upload lesson', 'discussion', 'the board for', 'Earnings', 'what your courses', 'Getting paid', 'ask for the money', 'Create', 'New course', 'Course title', 'Introduction to', 'Back to my learning', 'Nothing here', 'agreement'];

const EN = {
  notYet: '<p class="eyebrow">Teaching</p><h1>This is the teaching area</h1><p class="notice warn"><strong>Teaching here is by appointment.</strong> The owner appoints a teacher. Until then your account is a learner’s, and a learner’s account cannot open a course.</p><p>You may ask: send your qualifications and a sample lesson, and the owner reads them. Applying is not being appointed. Nothing is granted until somebody decides, in writing.</p><p class="teach-actions"><a class="btn" href="/teach/apply">Apply to teach</a> <a class="btn secondary" href="/learn">Go to my learning</a></p>',
  head: '<p class="eyebrow">Teaching</p><h1>My courses</h1><p class="lede">You keep the copyright on everything here. Nothing you have already sold is taken back: learners who enrolled keep their access even if you retire the course later.</p>',
  links: [
    '<p data-teach-link="/teach/promotions"><a href="/teach/promotions">Promotions</a> — run an offer on your own courses, in the countries you choose, with a limit on how many times a family may use it</p>',
    '<div class="teach-links"><p data-teach-link="/teach/paths"><a href="/teach/paths">Learning paths</a> — curate a sequence of active courses</p><p data-teach-link="/teach/profile"><a href="/teach/profile">Public teacher profile</a> — introduce yourself and link your social channels</p><p data-teach-link="/teach/media"><a href="/teach/media">Media library</a> — upload lesson recordings and see which ones are ready to use</p><p data-teach-link="/teach/earnings"><a href="/teach/earnings">Earnings</a> — what your courses have earned, in each currency, and the sales behind it; nothing is paid out yet, so this is the record and not a balance</p><p data-teach-link="/teach/payouts"><a href="/teach/payouts">Getting paid</a> — ask for the money your courses have earned once it is out of its refund hold, and see what happened to every earlier request</p></div>',
  ],
  board: '<p data-teach-link="/discuss/teachers"><a href="/discuss/teachers">Teachers’ discussion</a> — the board for teachers only; you write there under a username, not your name</p>',
  empty: '<div class="empty" style="margin-bottom:1.5rem">You have not created a course yet.</div>',
  form: '<h3>Create</h3></div><form class="card" data-new-course="true"><h3 style="margin-top:0">New course</h3><label for="course-title">Course title</label><input id="course-title" placeholder="Introduction to Tajweed" required="" maxLength="120" value=""/><button type="submit" class="btn" style="margin-top:0.75rem">Create course</button></form>',
  back: '<a href="/learn">Back to my learning</a>',
};
const AR = {
  notYet: '<p class="eyebrow">التدريس</p><h1>هذه منطقة التدريس</h1><p class="notice warn"><strong>التدريس هنا بالتعيين.</strong> المالك هو من يعيّن المعلّم. وإلى أن يحدث ذلك يبقى حسابك حساب متعلّم، وحساب المتعلّم لا يستطيع فتح دورة.</p><p>لك أن تطلب: أرسل مؤهلاتك ودرسًا نموذجيًا، والمالك يقرؤهما. التقدّم بالطلب ليس تعيينًا. لا يُمنح شيء حتى يقرّر أحدٌ ذلك كتابةً.</p><p class="teach-actions"><a class="btn" href="/teach/apply">التقدّم للتدريس</a> <a class="btn secondary" href="/learn">اذهب إلى تعلّمي</a></p>',
  head: '<p class="eyebrow">التدريس</p><h1>دوراتي</h1><p class="lede">حقوق النشر في كل ما هنا تبقى لك. ما بعتَه من قبل لا يُسترجَع: المتعلّمون الذين سجّلوا يحتفظون بوصولهم حتى لو سحبتَ الدورة لاحقًا.</p>',
  links: [
    '<p data-teach-link="/teach/promotions"><a href="/teach/promotions">العروض الترويجية</a> — قدّم عرضًا على دوراتك أنت، في البلدان التي تختارها، مع حدّ لعدد المرات التي يجوز لعائلة أن تستخدمه فيها</p>',
    '<p data-teach-link="/teach/paths"><a href="/teach/paths">مسارات التعلّم</a> — رتّب سلسلة من الدورات النشطة</p>',
    '<p data-teach-link="/teach/profile"><a href="/teach/profile">الملف العام للمعلّم</a> — عرّف بنفسك واربط قنواتك على وسائل التواصل</p>',
    '<p data-teach-link="/teach/media"><a href="/teach/media">مكتبة الوسائط</a> — ارفع تسجيلات الدروس واعرف أيّها جاهز للاستخدام</p>',
    '<p data-teach-link="/teach/earnings"><a href="/teach/earnings">الأرباح</a> — ما كسبته دوراتك، بكل عملة، والمبيعات التي وراءه؛ لم يُدفع شيء بعد، فهذا سجلّ وليس رصيدًا</p>',
    '<p data-teach-link="/teach/payouts"><a href="/teach/payouts">استلام مستحقاتك</a> — اطلب المال الذي كسبته دوراتك بعد خروجه من مدة حجز الاسترداد، واعرف ما جرى لكل طلب سابق</p>',
  ],
  board: '<p data-teach-link="/discuss/teachers"><a href="/discuss/teachers">نقاش المعلمين</a> — منتدى خاص بالمعلمين؛ تكتب فيه باسم مستعار لا باسمك</p>',
  empty: '<div class="empty" style="margin-bottom:1.5rem">لم تنشئ أي دورة بعد.</div>',
  form: '<h3>إنشاء</h3></div><form class="card" data-new-course="true"><h3 style="margin-top:0">دورة جديدة</h3><label for="course-title">عنوان الدورة</label><input id="course-title" placeholder="مقدمة في التجويد" required="" maxLength="120" value=""/><button type="submit" class="btn" style="margin-top:0.75rem">أنشئ الدورة</button></form>',
  back: '<a href="/learn">العودة إلى تعلّمي</a>',
  // What the form says when a course is not made.
  eTitle: 'اكتب عنوانًا للدورة.',
  eDuplicate: 'توجد دورة بهذا الاسم من قبل. غيّر العنوان قليلًا وحاول من جديد.',
  eRefused: 'لم تُنشأ الدورة. وهذا ما قالته قاعدة البيانات:',
  eUnsure: 'لا أحد يستطيع أن يقول هل أُنشئت الدورة. أعد تحميل الصفحة وانظر إلى دوراتك قبل أن تنشئها من جديد.',
  eSignedOut: 'لقد سُجّل خروجك. سجّل الدخول من جديد ثم حاول مرة أخرى.',
  create: 'أنشئ الدورة',
  creating: 'جارٍ الإنشاء…',
};
// The screening card for one record: its state, the sentence, the kind, what it stops, when it goes.
const card = (words) => `<div class="card" style="margin-bottom:1.5rem" data-teach-screening="${words.status[0]}"><h2 style="margin-top:0">${words.title}</h2><p style="margin-bottom:0.35rem"><strong>${words.status[1]}</strong></p><p style="margin-bottom:0" data-teach-screening-sentence="${words.sentence[0]}">${words.sentence[1]}</p>${words.kind ?? ''}${words.note ? `<p class="muted" style="margin-bottom:0;font-size:0.9rem" data-teach-screening-note="${words.note[0]}">${words.note[1]}</p>` : ''}${words.kept ? `<p class="muted" style="margin-bottom:0;font-size:0.9rem" data-teach-screening-kept="true">${words.kept}</p>` : ''}</div>`;
const BLOCKS = { en: 'Until a current check is recorded, a course you write for children cannot be published.', ar: 'إلى أن يُسجَّل تحقق سارٍ، لا يمكن نشر دورة تكتبها للأطفال.' };
const NOT_ASKED = { en: 'The platform is not asking for a check today, so nothing here stops a course of yours being published. If that changes, this page says so first.', ar: 'المنصة لا تطلب تحققًا اليوم، فلا شيء هنا يمنع نشر دورة لك. وإن تغيّر ذلك فهذه الصفحة تقوله أولًا.' };

let browser;
try {
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${seen.logs}`)), 60000);
    const receive = (chunk) => { seen.logs += chunk.toString(); if (seen.logs.includes('Ready in')) { clearTimeout(timeout); resolveReady(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (e) => { clearTimeout(timeout); reject(e); });
    next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${seen.logs}`)); });
  });

  const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(120000) });
  const whole = async (code = 'en') => {
    const response = await request('/teach', { cookie, 'accept-language': code });
    assert.equal(response.status, 200, `/teach in ${code}\n${seen.logs.slice(-2000)}`);
    return response.text();
  };
  const page = async (code = 'en') => inner(await whole(code));
  const send = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/teach`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    return { status: response.status, json: await response.json() };
  };

  // ------------------------------------------------------ not a teacher
  // Signed out: sent to sign in, and nothing is asked of the database.
  calls.length = 0;
  const away = await request('/teach', { 'accept-language': 'en' });
  assert.equal(away.status, 307);
  assert.equal(away.headers.get('location'), '/sign-in?next=/teach');
  assert.equal(calls.filter((c) => c.path.includes('has_role')).length, 0);

  state = fresh(); state.roles = new Set();
  calls.length = 0;
  let html = await whole('en');
  assert.match(html, /<title>Teaching[^<]*<\/title>/);
  let en = inner(html);
  has(en, [`<div class="container section teach-page" data-teach="not-appointed">${EN.notYet}</div>`], 'not a teacher, English');
  // The courses, the record and the notices of somebody who is not a teacher are not asked for.
  for (const asked of ['my_screening_status', 'my_takedown_notices', 'my_teacher_terms', 'my_ijazah_authorisations']) assert.equal(calls.filter((c) => c.path.endsWith(asked)).length, 0, asked);
  assert.equal(calls.filter((c) => c.path === '/rest/v1/courses').length, 0);
  html = await whole('ar');
  assert.match(html, /<title>التدريس[^<]*<\/title>/);
  assert.match(html, /<html[^>]* lang="ar"[^>]* dir="rtl"|<html[^>]* dir="rtl"[^>]* lang="ar"/);
  let ar = inner(html);
  has(ar, [`<div class="container section teach-page" data-teach="not-appointed">${AR.notYet}</div>`], 'not a teacher, Arabic');
  hasNot(ar, ENGLISH_ONLY, 'not a teacher, Arabic');
  // A language held for review is sent the English page, and the page says it is English.
  const held = await page('ha');
  has(held, [`<div class="container section teach-page" lang="en" dir="ltr" data-teach="not-appointed">${EN.notYet}</div>`], 'not a teacher, a held language');
  // The owner is a teacher besides.
  state.roles = new Set(['platform_admin']);
  has(await page('en'), ['data-teach="dashboard"', EN.head], 'the owner');
  console.log('Teach page, not a teacher: signed out goes to sign-in with nothing asked; the notice whole in English and in Arabic, with the tab named in the reader’s language; English, marked as English, for a language held for review; nothing of a teacher’s asked for; the owner gets the dashboard.');

  // ------------------------------------------------------------ a teacher
  state = fresh();
  en = await page('en');
  // English is not marked on an English page: the four cards stand in a block with no mark.
  has(en, [`<div class="container section teach-page" data-teach="dashboard">${EN.head}<div data-teach-english="true">`, ...EN.links, EN.empty, EN.form, EN.back], 'a teacher, English');
  hasNot(en, ['lang="en"', '/discuss/teachers', 'data-teach-headline', 'autofocus'], 'a teacher, English');
  has(en, ['<h2 style="margin-top:0">The agreement about your work</h2>'], 'a teacher, English');
  has(en, [card({ title: 'Screening', status: ['teach.scStNone', 'No check on file'], sentence: ['teach.scNone', 'No check is on file for you yet. Whoever appoints teachers records one: the kind of check, the date, and whether it lapses.'], note: ['teach.scNotAsked', NOT_ASKED.en] })], 'nothing on file, not asked, English');

  ar = await page('ar');
  let cut = parts(ar, 'a teacher, Arabic');
  has(ar, [`<div class="container section teach-page" data-teach="dashboard">${AR.head}${BLOCK}`], 'a teacher, Arabic');
  has(cut.rest, [...AR.links, AR.empty, AR.form, AR.back], 'a teacher, Arabic');
  has(cut.rest, [card({ title: 'التحقق', status: ['teach.scStNone', 'لا يوجد تحقق محفوظ'], sentence: ['teach.scNone', 'لا يوجد تحقق محفوظ عنك بعد. من يعيّن المعلمين هو من يسجّله: نوع التحقق، وتاريخه، وهل تنتهي صلاحيته.'], note: ['teach.scNotAsked', NOT_ASKED.ar] })], 'nothing on file, not asked, Arabic');
  // Nothing outside the marked block is English, and nothing in it is lost.
  hasNot(cut.rest, ENGLISH_ONLY, 'a teacher, Arabic, outside the English block');
  hasNot(cut.rest, ['lang="en"'], 'a teacher, Arabic, outside the English block');
  has(cut.english, ['<h2 style="margin-top:0">The agreement about your work</h2>', 'You keep the copyright in everything you write.'], 'the English block');
  // French keeps its spaces: a no-break space before a colon and a semicolon.
  const fr = await page('fr');
  has(fr, ['<h1>Mes cours</h1>', 'Rien de ce que vous avez déjà vendu n’est repris\u00a0: les apprenants inscrits', 'Revenus</a> — ce que vos cours ont rapporté, dans chaque devise, et les ventes correspondantes\u00a0; rien n’est encore versé'], 'French');
  // A held language: the whole page English, and framed as English once.
  const heldDash = await page('ha');
  has(heldDash, [`<div class="container section teach-page" lang="en" dir="ltr" data-teach="dashboard">${EN.head}<div data-teach-english="true">`, EN.form], 'a teacher, a held language');
  assert.equal(heldDash.split('lang="en"').length - 1, 1, 'English is marked twice on an English page');

  // The teachers' board is linked only while it is switched on.
  state.flags = { 'community.teacher_board': true };
  has(await page('en'), [`upload lesson recordings and see which ones are ready to use</p>${EN.board}<p data-teach-link="/teach/earnings">`], 'the board, English');
  cut = parts(await page('ar'), 'the board, Arabic');
  has(cut.rest, [AR.board], 'the board, Arabic');
  hasNot(cut.rest, ENGLISH_ONLY, 'the board, Arabic');
  console.log('Teach page, a teacher with nothing yet: the dashboard whole in English and in Arabic; the four English cards in one block, marked as English on the Arabic page and unmarked on the English one, and no other English on the Arabic page; French spacing kept; a held language sent English, marked once; the teachers’ board linked only while it is on.');

  // ------------------------------------------------------------- courses
  state = fresh(); state.courses = COURSES; state.published = [COURSES[0].id];
  const course = (c, state_, published, open) => `<div class="card" data-teach-course="true"><h3 style="margin-top:0" dir="auto">${c.title}</h3><div class="badges">${state_}${published ? `<span class="badge">${published}</span>` : ''}</div><p class="meta" style="margin-top:0.75rem" dir="ltr">/${c.slug}</p><a class="btn secondary" href="/teach/${c.id}">${open}</a></div>`;
  const word = (status, text) => `<span class="badge neutral" data-teach-state="${status}">${text}</span>`;
  en = await page('en');
  has(en, [`<div class="grid cols-2">${course(COURSES[0], word('active', 'Active'), 'Published', 'Open curriculum')}${course(COURSES[1], word('draft', 'Draft'), null, 'Open curriculum')}${course(COURSES[2], word('retired', 'Retired'), null, 'Open curriculum')}${course(COURSES[3], '<span class="badge neutral">SYNTHETIC_STATE</span>', null, 'Open curriculum')}</div>`], 'courses, English');
  hasNot(en, ['You have not created a course yet.'], 'courses, English');
  cut = parts(await page('ar'), 'courses, Arabic');
  // A title is printed as written, with its direction taken from what it says;
  // a state the page has no word for stays the database's, marked as English.
  has(cut.rest, [`<div class="grid cols-2">${course(COURSES[0], word('active', 'نشطة'), 'منشورة', 'افتح المنهج')}${course(COURSES[1], word('draft', 'مسودة'), null, 'افتح المنهج')}${course(COURSES[2], word('retired', 'مسحوبة'), null, 'افتح المنهج')}${course(COURSES[3], '<span class="badge neutral" lang="en" dir="ltr">SYNTHETIC_STATE</span>', null, 'افتح المنهج')}</div>`], 'courses, Arabic');
  hasNot(cut.rest.replaceAll('Synthetic', ''), ENGLISH_ONLY, 'courses, Arabic');
  assert.equal(cut.rest.split('lang="en"').length - 1, 1, 'something besides the unknown state is marked English');
  // Whose courses: the list is asked for by who made them.
  assert.ok(calls.filter((c) => c.method === 'GET' && c.path === '/rest/v1/courses').every((c) => c.query.includes(`created_by=eq.${user.id}`)));
  console.log('Teach page, courses: each with its title as written and directed by what it says, its state and "Published" in the reader’s language, its address left to right; a state the page has no word for left in the database’s word and marked as English.');

  // ------------------------------------------------------ the screening record
  const KIND = { en: '<p style="margin-bottom:0">The kind of check, as it was written down: <span dir="auto" data-teach-screening-kind="true">Synthetic disclosure</span></p>', ar: '<p style="margin-bottom:0">نوع التحقق، كما كُتب: <span lang="en" dir="auto" data-teach-screening-kind="true">Synthetic disclosure</span></p>' };
  const records = [
    // [what the database answers, the English card, the Arabic card]
    [{ recorded: false, required: true },
      { status: ['teach.scStNone', 'No check on file'], sentence: ['teach.scNone', 'No check is on file for you yet. Whoever appoints teachers records one: the kind of check, the date, and whether it lapses.'], note: ['teach.scBlocks', BLOCKS.en] },
      { status: ['teach.scStNone', 'لا يوجد تحقق محفوظ'], sentence: ['teach.scNone', 'لا يوجد تحقق محفوظ عنك بعد. من يعيّن المعلمين هو من يسجّله: نوع التحقق، وتاريخه، وهل تنتهي صلاحيته.'], note: ['teach.scBlocks', BLOCKS.ar] }],
    // The answer does not say whether the platform is asking: nothing is said about what it stops.
    [{ recorded: false },
      { status: ['teach.scStNone', 'No check on file'], sentence: ['teach.scNone', 'No check is on file for you yet. Whoever appoints teachers records one: the kind of check, the date, and whether it lapses.'] },
      { status: ['teach.scStNone', 'لا يوجد تحقق محفوظ'], sentence: ['teach.scNone', 'لا يوجد تحقق محفوظ عنك بعد. من يعيّن المعلمين هو من يسجّله: نوع التحقق، وتاريخه، وهل تنتهي صلاحيته.'] }],
    [{ recorded: true, outcome: 'passed', type: 'Synthetic disclosure', checkedAt: '2026-10-27T09:00:00+00:00', validUntil: '2028-10-27', expired: false, retentionUntil: '2033-10-27', retentionBasis: 'check', required: true },
      { status: ['teach.scStChecked', 'Checked'], sentence: ['teach.scHoldsFrom', 'A check was recorded on Oct 27, 2026 and holds until Oct 27, 2028.'], kind: KIND.en, kept: 'This record is kept until Oct 27, 2033 and then deleted.' },
      { status: ['teach.scStChecked', 'تم التحقق'], sentence: ['teach.scHoldsFrom', 'سُجّل تحقق بتاريخ 27 أكتوبر 2026 وهو سارٍ حتى 27 أكتوبر 2028.'], kind: KIND.ar, kept: 'يُحفظ هذا السجل حتى 27 أكتوبر 2033 ثم يُحذف.' }],
    [{ recorded: true, outcome: 'passed', type: null, checkedAt: '2026-10-27T09:00:00+00:00', validUntil: null, expired: false, required: false },
      { status: ['teach.scStChecked', 'Checked'], sentence: ['teach.scNoExpiryFrom', 'A check was recorded on Oct 27, 2026, with no expiry stated.'] },
      { status: ['teach.scStChecked', 'تم التحقق'], sentence: ['teach.scNoExpiryFrom', 'سُجّل تحقق بتاريخ 27 أكتوبر 2026، ولم يُذكر له تاريخ انتهاء.'] }],
    [{ recorded: true, outcome: 'passed', type: 'Synthetic disclosure', checkedAt: '2024-10-27T09:00:00+00:00', validUntil: '2026-01-01', expired: true, required: true },
      { status: ['teach.scStLapsed', 'Lapsed'], sentence: ['teach.scLapsedOn', 'Your last check lapsed on Jan 1, 2026.'], kind: KIND.en, note: ['teach.scBlocks', BLOCKS.en] },
      { status: ['teach.scStLapsed', 'انتهت صلاحيته'], sentence: ['teach.scLapsedOn', 'انتهت صلاحية آخر تحقق لك بتاريخ 1 يناير 2026.'], kind: KIND.ar, note: ['teach.scBlocks', BLOCKS.ar] }],
    [{ recorded: true, outcome: 'failed', type: null, checkedAt: '2026-10-27T09:00:00+00:00', validUntil: null, expired: false, required: false },
      { status: ['teach.scStFailed', 'Did not pass'], sentence: ['teach.scFailedOn', 'A check recorded on Oct 27, 2026 did not pass. Whoever recorded it can tell you what happens next.'], note: ['teach.scNotAsked', NOT_ASKED.en] },
      { status: ['teach.scStFailed', 'لم يجتز'], sentence: ['teach.scFailedOn', 'تحقق سُجّل بتاريخ 27 أكتوبر 2026 لم يجتز. من سجّله يستطيع أن يخبرك بما يحدث بعد ذلك.'], note: ['teach.scNotAsked', NOT_ASKED.ar] }],
    // A date that is not a day: the sentence without one, never one with a hole.
    [{ recorded: true, outcome: 'failed', type: null, checkedAt: 'SYNTHETIC-not-a-day', validUntil: null, expired: false, required: true },
      { status: ['teach.scStFailed', 'Did not pass'], sentence: ['teach.scFailed', 'A check recorded against your account did not pass. Whoever recorded it can tell you what happens next.'], note: ['teach.scBlocks', BLOCKS.en] },
      { status: ['teach.scStFailed', 'لم يجتز'], sentence: ['teach.scFailed', 'تحقق سُجّل على حسابك لم يجتز. من سجّله يستطيع أن يخبرك بما يحدث بعد ذلك.'], note: ['teach.scBlocks', BLOCKS.ar] }],
  ];
  for (const [answer, english, arabic] of records) {
    state = fresh(); state.screening = answer;
    const what = JSON.stringify(answer);
    has(await page('en'), [card({ title: 'Screening', ...english })], `English: ${what}`);
    cut = parts(await page('ar'), what);
    has(cut.rest, [card({ title: 'التحقق', ...arabic })], `Arabic: ${what}`);
    // The names of the sentences are in the page's attributes, and are English words; what is read is not.
    hasNot(cut.rest.replaceAll('Synthetic disclosure', '').replace(/ data-teach-[a-z-]+="[^"]*"/g, ''), [...ENGLISH_ONLY, 'SYNTHETIC', '{', 'undefined', 'Invalid'], `Arabic: ${what}`);
  }
  // Persian writes the day in its own calendar and digits.
  state = fresh(); state.screening = records[2][0];
  has(await page('fa'), ['<h1>دوره‌های من</h1>', 'data-teach-screening-sentence="teach.scHoldsFrom">یک بررسی در تاریخ ۵ آبان ۱۴۰۵ ثبت شد و تا ۶ آبان ۱۴۰۷ معتبر است.</p>'], 'Persian');
  console.log(`Teach page, the screening record: ${records.length} answers of the database, each drawn whole in English and in Arabic with its state, its sentence, the kind as typed (marked as English on the Arabic page) and the day it is deleted; "cannot be published" said only while the platform is asking, "not asking today" only while it is not, and neither when the answer does not say; a date that is no day gets the sentence without one; Persian in its own calendar and digits.`);

  // ------------------------------------------------------------- a notice
  const headline = (key, strong, rest) => `<p class="notice warn" style="max-width:48rem" data-teach-headline="${key}"><strong>${strong}</strong> ${rest}</p>`;
  for (const [takedown, key, english, arabic, persian] of [
    [{ notices: [{ ...NOTICE, status: 'rejected' }], held: 0 }, 'teach.tdDecided', 'A notice about one of your versions was decided.', 'صدر قرار في إشعار يخصّ إحدى نسخك.', null],
    [{ notices: [NOTICE], held: 1 }, 'teach.tdHeldOne', 'One of your courses is held while a claim against it is looked at.', 'إحدى دوراتك محجوبة ريثما يُنظر في مطالبة ضدها.', null],
    [{ notices: [NOTICE], held: 3 }, 'teach.tdHeldMany', 'Courses of yours held while claims against them are looked at: 3.', 'دوراتك المحجوبة ريثما يُنظر في المطالبات ضدها: 3.', 'دوره‌های شما که تا بررسی ادعاهای علیه آن‌ها نگه داشته شده‌اند: ۳.'],
  ]) {
    state = fresh(); state.takedown = takedown;
    has(await page('en'), [`${EN.head}${headline(key, english, 'The claim is below, in the words it was sent, and you can answer it there.')}<div data-teach-english="true">`], key);
    ar = await page('ar');
    has(ar, [`${AR.head}${headline(key, arabic, 'المطالبة في الأسفل بالكلمات التي أُرسلت بها، ويمكنك الرد عليها هناك.')}${BLOCK}`], key);
    cut = parts(ar, key);
    // The notice itself is English, in the marked block, and nowhere else.
    has(cut.english, ['<h2 style="margin-top:0">Claims against your courses</h2>', '<strong>Synthetic claimant</strong>', 'Synthetic notice text.'], key);
    hasNot(cut.rest, [...ENGLISH_ONLY, 'Synthetic', 'SYNTHETIC'], key);
    if (persian) has(await page('fa'), [`<strong>${persian}</strong>`], `${key}, Persian`);
  }
  console.log('Teach page, a takedown notice: one decided, one held and three held, each headed in English and in Arabic, the count after a colon and in Persian digits on the Persian page; the notice itself inside the block marked as English.');

  // ------------------------------------------------- the route: a new course
  const created = { ok: true, value: { courseId: NEW_COURSE, versionId: NEW_VERSION } };
  state = fresh(); calls.length = 0;
  let answer = await send({ action: 'create_course', title: '  Synthetic Tajweed  ' });
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, created);
  assert.deepEqual(inserts('courses').map((c) => c.payload), [{ slug: 'synthetic-tajweed', title: 'Synthetic Tajweed', created_by: user.id }]);
  assert.deepEqual(inserts('course_versions').map((c) => c.payload), [{ course_id: NEW_COURSE, version_number: 1, created_by: user.id }]);
  // A title in letters an address cannot carry is made, with an address nobody chose.
  state = fresh(); calls.length = 0;
  answer = await send({ action: 'create_course', title: 'مقدمة في التجويد' });
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, created);
  assert.equal(inserts('courses')[0].payload.title, 'مقدمة في التجويد');
  assert.match(inserts('courses')[0].payload.slug, /^course-[0-9a-f]{10}$/);
  calls.length = 0;
  answer = await send({ action: 'create_course', title: 'Synthetic تجويد' });
  assert.equal(answer.status, 200);
  assert.match(inserts('courses')[0].payload.slug, /^synthetic-[0-9a-f]{10}$/);
  // No title, or one of punctuation: named at 400, and the database is not asked.
  for (const title of [undefined, '', '   ', '???', 7]) {
    calls.length = 0;
    answer = await send({ action: 'create_course', title });
    assert.equal(answer.status, 400, JSON.stringify(title)); assert.deepEqual(answer.json, { ok: false, code: 'title' });
    assert.equal(inserts('courses').length, 0);
  }
  // The name is taken.
  state.course = refusal(409, '23505', 'duplicate key value violates unique constraint "courses_slug_key"');
  answer = await send({ action: 'create_course', title: 'Synthetic Tajweed' });
  assert.equal(answer.status, 409); assert.deepEqual(answer.json, { ok: false, code: 'duplicate' });
  // The database refuses: its sentence is passed on as its own, under its own name.
  state.course = refusal(403, '42501', DATABASE_SENTENCE); calls.length = 0;
  answer = await send({ action: 'create_course', title: 'Synthetic Tajweed' });
  assert.equal(answer.status, 400); assert.deepEqual(answer.json, { ok: false, code: 'refused', said: DATABASE_SENTENCE });
  assert.equal(inserts('course_versions').length, 0, 'a version was asked for after the course was refused');
  // No answer of the database's own: nobody can say, and the route does not say "refused".
  state.course = 'gateway';
  answer = await send({ action: 'create_course', title: 'Synthetic Tajweed' });
  assert.equal(answer.status, 502); assert.deepEqual(answer.json, { ok: false, code: 'unsure' });
  state.course = refusal(503, '08006', 'SYNTHETIC-DATABASE connection failure');
  answer = await send({ action: 'create_course', title: 'Synthetic Tajweed' });
  assert.equal(answer.status, 502); assert.deepEqual(answer.json, { ok: false, code: 'unsure' });
  // The course is made and its first version is not: not "refused", since the course is there.
  state = fresh(); state.version = refusal(403, '42501', DATABASE_SENTENCE);
  answer = await send({ action: 'create_course', title: 'Synthetic Tajweed' });
  assert.equal(answer.status, 502); assert.deepEqual(answer.json, { ok: false, code: 'unsure' });
  // Signed out reaches no writer.
  state = fresh(); calls.length = 0;
  answer = await send({ action: 'create_course', title: 'Synthetic Tajweed' }, {});
  assert.equal(answer.status, 401); assert.equal(answer.json.ok, false);
  assert.equal(inserts('courses').length, 0);
  // The route's other actions answer as before.
  answer = await send({ action: 'SYNTHETIC-ACTION' });
  assert.equal(answer.status, 400); assert.deepEqual(answer.json, { ok: false, code: 'rejected', message: 'Unknown action.' });
  answer = await send({ action: 'create_version' });
  assert.equal(answer.status, 400); assert.deepEqual(answer.json, { ok: false, code: 'rejected', message: 'Choose a published version to copy.' });
  console.log('Teach route, a new course: made with the title trimmed and its first version; a title in Arabic made with an address nobody chose, and a half-Latin one with what the address can carry and a tail; five empty titles named at 400 without asking the database; a taken name 409; a refusal 400 with the database’s sentence under its own name and no version asked for; a gateway’s page, a lost connection and a course left without its version 502 "unsure"; signed out reaches no writer; other actions as before.');

  // ----------------------------------------------------------- in a browser
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const visit = async (code, width, a11y) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
        ...(a11y ? [{ name: 'ayahspring_a11y', value: a11y, url: origin }] : []),
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      // A refused request is said on the console, and this script refuses on purpose.
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      const sent = []; tab.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/teach')) sent.push(r.postDataJSON()); });
      // Nothing in the browser talks to the database itself.
      const direct = []; tab.on('request', (r) => { if (r.url().includes('/rest/v1/') || r.url().includes('/auth/v1/')) direct.push(r.url()); });
      await tab.goto(`${origin}/teach`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent, direct };
    };
    // For a person to look at, when asked: TEACH_SMOKE_SHOTS names a directory.
    const shots = process.env.TEACH_SMOKE_SHOTS;
    const shoot = async (tab, name) => { if (shots) await tab.screenshot({ path: join(shots, `${name}.png`), fullPage: true }); };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      // Name what sticks out, so the failure says where to look. A word too
      // long for its box sticks out of it without making the box any wider,
      // so the words are measured as well as the boxes.
      const words = scroll <= width + 1 ? [] : await tab.evaluate((limit) => {
        const found = []; const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT); const range = document.createRange();
        for (let node = walker.nextNode(); node && found.length < 6; node = walker.nextNode()) {
          if (!node.textContent.trim()) continue;
          range.selectNodeContents(node);
          if ([...range.getClientRects()].some((r) => r.right > limit + 1 || r.left < -1)) found.push(`${node.parentElement.tagName.toLowerCase()}.${node.parentElement.className} "${node.textContent.trim().slice(0, 40)}"`);
        }
        return found;
      }, width);
      const boxes = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 30)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: the page scrolls sideways (${scroll}): boxes ${boxes.join(' | ') || 'none'}; words ${words.join(' | ') || 'none'}`);
    };
    const direction = (tab, selector) => tab.evaluate((s) => getComputedStyle(document.querySelector(s)).direction, selector);
    // Everything the dashboard can show at once: courses with a long title, a
    // notice, a record with a kind, and the board's link.
    const full = () => {
      const s = fresh();
      s.courses = COURSES; s.published = [COURSES[0].id];
      s.takedown = { notices: [NOTICE], held: 3 };
      s.screening = { ...records[2][0], type: `Synthetic ${'disclosureWithNoPlaceToBreak'.repeat(3)}` };
      s.flags = { 'community.teacher_board': true, 'platform.safeguarding': true };
      return s;
    };

    for (const [code, title, notYet, dir] of [['en', 'My courses', 'This is the teaching area', 'ltr'], ['ar', 'دوراتي', 'هذه منطقة التدريس', 'rtl'], ['ta', 'என் பாடநெறிகள்', 'இது கற்பித்தல் பகுதி', 'ltr']]) {
      // The largest text in the dyslexia font is the widest the page is ever asked to be, whatever fonts the machine has.
      for (const [width, a11y] of [[320, null], [320, 'v1.larger.normal.system.dyslexic'], [390, null], [1440, null]]) {
        const label = `${code} ${width}${a11y ? ' largest text and the dyslexia font' : ''}`;
        // Not a teacher.
        state = fresh(); state.roles = new Set();
        let { context, tab, errors } = await visit(code, width, a11y);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code, label);
        assert.equal(await tab.getByRole('heading', { name: notYet, exact: true, level: 1 }).count(), 1, `${label}: heading, not a teacher`);
        assert.equal(await direction(tab, 'main h1'), dir, label);
        assert.equal(await tab.locator('main a.btn').count(), 2, label);
        await fits(tab, width, `${label}, not a teacher`);
        if (!a11y && width !== 1440) await shoot(tab, `teach-not-appointed-${code}-${width}`);
        assert.deepEqual(errors, [], label);
        await context.close();
        // A teacher, with everything on the page.
        state = full();
        ({ context, tab, errors } = await visit(code, width, a11y));
        assert.equal(await tab.getByRole('heading', { name: title, exact: true, level: 1 }).count(), 1, `${label}: heading`);
        assert.equal(await direction(tab, 'main h1'), dir, label);
        // The English block reads left to right on any page, and says it is English on a page that is not.
        assert.equal(await direction(tab, '[data-teach-english]'), code === 'en' ? dir : 'ltr', label);
        assert.equal(await tab.locator('[data-teach-english]').getAttribute('lang'), code === 'en' ? null : 'en', label);
        // An address is read left to right; an Arabic title right to left, on any page.
        assert.equal(await direction(tab, '[data-teach-course] .meta'), 'ltr', label);
        assert.deepEqual(await tab.locator('[data-teach-course] h3').evaluateAll((all) => all.map((el) => getComputedStyle(el).direction)), ['ltr', 'rtl', 'ltr', 'ltr'], label);
        assert.equal(await tab.locator('[data-teach-link]').count(), 7, `${label}: links`);
        // The box has a label of its own and does not take the keyboard when the page opens.
        assert.equal(await tab.locator('main label[for="course-title"]').count(), 1, label);
        assert.equal(await tab.evaluate(() => document.activeElement?.id ?? ''), '', `${label}: the page opened with the caret in the form`);
        assert.equal(await tab.evaluate(() => window.scrollY), 0, `${label}: the page opened scrolled down`);
        // Empty, the box stands as the page does, so its example reads the right way.
        assert.equal(await direction(tab, '#course-title'), dir, label);
        await fits(tab, width, `${label}, a teacher`);
        if (!a11y && width !== 1440) await shoot(tab, `teach-dashboard-${code}-${width}`);
        if (a11y) await shoot(tab, `teach-dashboard-${code}-${width}-largest`);
        assert.deepEqual(errors, [], label);
        await context.close();
      }
    }
    // Every language the page is written in, at its widest: a word longer than
    // a phone is found by drawing it, and by nothing else.
    const WRITTEN = ['ar', 'ur', 'fa', 'fa-af', 'tr', 'id', 'ms', 'bn', 'hi', 'fr', 'es', 'pt', 'sw', 'af', 'zh-hans', 'zh-hant', 'vi', 'th', 'fil', 'uz', 'kk', 'az', 'tg', 'ky', 'tk', 'ta', 'ne'];
    for (const code of WRITTEN) {
      for (const who of ['not a teacher', 'a teacher']) {
        state = who === 'a teacher' ? full() : fresh();
        if (who !== 'a teacher') state.roles = new Set();
        const { context, tab, errors } = await visit(code, 320, 'v1.larger.normal.system.dyslexic');
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code, code);
        assert.equal(await tab.locator('[data-teach]').getAttribute('data-teach'), who === 'a teacher' ? 'dashboard' : 'not-appointed', code);
        // The page is in this language and not English given in its place.
        assert.equal(await tab.locator('[data-teach]').getAttribute('lang'), null, `${code}: the page is framed as another language`);
        await fits(tab, 320, `${code} 320 largest text, ${who}`);
        assert.deepEqual(errors, [], `${code}, ${who}`);
        await context.close();
      }
    }
    console.log(`Teach page in a browser, every language: both renders in each of the ${WRITTEN.length} languages it is written in, at 320 with the largest text in the dyslexia font, none wider than the screen.`);
    console.log('Teach page in a browser: English, Arabic and Tamil at 320, 320 with the largest text in the dyslexia font, 390 and 1440; both renders; nothing wider than the screen with a title and a kind of check that have no place to break; the English block left to right and marked; an address left to right and an Arabic title right to left on every page; the page opens at its top with the caret nowhere.');

    // The form, in Arabic.
    {
      state = fresh();
      const { context, tab, errors, sent, direct } = await visit('ar', 390);
      const form = tab.locator('[data-new-course]');
      const box = tab.locator('#course-title');
      const press = form.getByRole('button', { name: AR.create, exact: true });
      const says = async (refusal, text) => {
        const alert = form.locator(`[role="alert"][data-new-course-refusal="${refusal}"]`);
        await alert.waitFor();
        const said = (await alert.textContent()).trim();
        assert.ok(said.startsWith(text), `${refusal}: "${said}"`);
        return alert;
      };
      // Spaces alone: said in Arabic, and nothing is sent.
      await box.fill('   ');
      await press.click();
      await says('title', AR.eTitle);
      assert.deepEqual(sent, [], 'something was sent with no title');
      // What is typed takes its own direction: Arabic right to left, English left to right.
      await box.fill('Synthetic Tajweed');
      assert.equal(await direction(tab, '#course-title'), 'ltr');
      await box.fill('مقدمة اصطناعية');
      assert.equal(await direction(tab, '#course-title'), 'rtl');
      // The name is taken.
      state.course = refusal(409, '23505', 'duplicate key value violates unique constraint "courses_slug_key"');
      await press.click();
      await says('duplicate', AR.eDuplicate);
      // The database refuses: the sentence in Arabic, then the database's own, marked as English and read left to right.
      state.course = refusal(403, '42501', DATABASE_SENTENCE);
      await press.click();
      const refused = await says('refused', AR.eRefused);
      assert.deepEqual(await refused.locator('[data-new-course-said]').evaluate((el) => [el.textContent, el.getAttribute('lang'), el.getAttribute('dir')]), [DATABASE_SENTENCE, 'en', 'ltr']);
      await fits(tab, 390, 'a refusal with the database’s sentence');
      await shoot(tab, 'teach-new-course-ar-390-refused');
      // Nobody can say: a gateway's page, an answer that is not the route's, and no connection.
      state.course = 'gateway';
      await press.click();
      await says('unsure', AR.eUnsure);
      await context.route('**/api/teach', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>SYNTHETIC not the route</html>' }), { times: 1 });
      await box.fill('مقدمة اصطناعية ٢');
      await press.click();
      await says('unsure', AR.eUnsure);
      await context.setOffline(true);
      await press.click();
      await says('unsure', AR.eUnsure);
      assert.equal(await press.isEnabled(), true, 'the button stays busy for good when the request cannot be made');
      await context.setOffline(false);
      assert.equal(await box.inputValue(), 'مقدمة اصطناعية ٢', 'what was typed was lost');
      // Signed out while the page was open.
      await context.route('**/api/teach', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, code: 'rejected', message: 'Sign in first.' }) }), { times: 1 });
      await press.click();
      await says('signedOut', AR.eSignedOut);
      // Nothing a refusal said was English, but for the database's own sentence, and that is gone by now.
      const text = await tab.locator('[data-new-course]').textContent();
      for (const sentence of ['SYNTHETIC', 'Sign in', 'Could not', 'course', 'title']) assert.equal(text.includes(sentence), false, `the form says "${sentence}"`);

      // Asked three times while the database works: one request, one course, and the teacher is taken to it.
      state = fresh(); state.delay = 700; sent.length = 0; calls.length = 0;
      // The course's own page is another unit's; here it is enough that the form goes there.
      await context.route(`**/teach/${NEW_COURSE}**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body><main>SYNTHETIC course page</main></body></html>' }));
      // Twice in one instant, before the page has had time to grey the button
      // out: what a second press, or Enter held down, does on a slow phone.
      await form.evaluate((f) => { f.requestSubmit(); f.requestSubmit(); });
      await form.getByRole('button', { name: AR.creating, exact: true }).waitFor();
      // And once more while it is busy, on the button itself.
      await form.locator('button[type="submit"]').click({ force: true });
      assert.equal(await form.locator('button[type="submit"]').isDisabled(), true);
      await tab.waitForURL(`${origin}/teach/${NEW_COURSE}`);
      assert.deepEqual(sent, [{ action: 'create_course', title: 'مقدمة اصطناعية ٢' }], 'asking twice sent two requests');
      assert.equal(inserts('courses').length, 1, 'two courses were made');
      assert.match(inserts('courses')[0].payload.slug, /^(course|2)-[0-9a-f]{10}$/);
      assert.deepEqual(direct, [], 'the browser talked to the database itself');
      assert.deepEqual(errors, []);
      await context.close();
    }
    // In English the database's sentence carries no mark, as the page is English.
    {
      state = fresh(); state.course = refusal(403, '42501', DATABASE_SENTENCE);
      const { context, tab, errors } = await visit('en', 390);
      await tab.locator('#course-title').fill('Synthetic Tajweed');
      await tab.getByRole('button', { name: 'Create course', exact: true }).click();
      const alert = tab.locator('[role="alert"][data-new-course-refusal="refused"]');
      await alert.waitFor();
      assert.equal((await alert.textContent()).trim(), `The course was not created. What the database said: ${DATABASE_SENTENCE}`);
      assert.deepEqual(await alert.locator('[data-new-course-said]').evaluate((el) => [el.getAttribute('lang'), el.getAttribute('dir')]), [null, null]);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Teach form in Arabic at 390: spaces alone refused in Arabic with nothing sent; the box turning with what is typed; a taken name, a refusal with the database’s sentence marked as English, three ways of nobody knowing (a gateway’s page, an answer not the route’s, no connection) and being signed out, each said in Arabic with what was typed kept; sent twice in one instant and pressed again while busy, one request and one course, then on to the course. In English the database’s sentence is unmarked.');
  }
  console.log('Teach HTTP smoke passed. Not real Auth, RLS, the table’s constraints or the database’s own rules; every teacher, course, check, notice and answer in it is invented, and no speaker of any language but English has read a sentence of it.');
} catch (e) { console.error(seen.logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
