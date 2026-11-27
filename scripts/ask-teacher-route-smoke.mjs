// Real Next /learn/ask and /teachers/<slug> pages and the /api/learn/ask route
// against an entirely synthetic loopback Auth/REST API. This is not evidence
// about hosted Supabase, RLS, or what `ai_support_ask()` does: the stand-in
// answers whatever it is asked, no lesson was searched and no request for
// help was opened.
//
// What it does show (written 2026-11-27, when the two pages were put into
// the reader's language): each page in English and in Arabic, and in English
// in a marked frame for a language held for review; that a teacher's name
// and a lesson's title keep their own direction; that the database's English
// sentence is not printed under an answer; that a refusal travels by name;
// and that an answer nobody could read is not called a refusal. The expected
// sentences are typed here rather than imported, so this fails if a
// catalogue changes without anybody looking at the page.
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

const TEACHER = '7d1f3c55-52a4-4f0e-9a63-1f0a6c0f2b11';
const LONG = 'Synthetic0123456789012345678901234567890123456789012345';
const profile = {
  id: 'p1', user_id: TEACHER, slug: 'synthetic-teacher', display_name: 'Ustadh Synthetic', headline: 'Teaches tajwid to beginners',
  biography: `Twenty years of teaching.\n${LONG}`, website_url: 'https://example.invalid/', instagram_url: 'https://instagram.example.invalid/x',
  youtube_url: null, tiktok_url: null, facebook_url: null, status: 'published', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};
const VERSIONS = [
  { id: 'v1', version_number: 2, language: 'ar', courses: { id: 'c1', slug: 'tajwid-basics', title: 'أساسيات التجويد', description: 'مخارج الحروف وصفاتها.' } },
  { id: 'v2', version_number: 1, language: 'en', courses: { id: 'c2', slug: 'reading-fluently', title: `Reading fluently ${LONG}`, description: null } },
];
const boundary = { retrievalOnly: true, model: null, generatedText: false, rules: 'A citation to a lesson you can open, or no answer. Ruling-shaped questions go to a teacher.' };
const ANSWERS = {
  answered: { questionId: 'q1', status: 'answered', message: 'This is what your courses cover on that. It is a pointer to a lesson, not an answer written for you.', matchedPhrases: [], supportCaseId: null, supportCaseNumber: null, boundary,
    citations: [{ lessonId: 'l1', lessonTitle: 'مخرج الحاء', sectionTitle: 'Makharij', courseId: 'c1', courseSlug: 'tajwid-basics', courseTitle: 'Tajwid basics', snippet: `Where the <mark>letter</mark> ha is produced ${LONG}`, matchedIn: 'description', href: '/courses/tajwid-basics' }] },
  ruling: { questionId: 'q2', status: 'refused_ruling', message: 'That is a question for a teacher, and this assistant does not answer those. We have opened case SC-000012 so a person can answer it.', citations: [], matchedPhrases: ['is it permissible'], supportCaseId: 's1', supportCaseNumber: 'SC-000012', boundary },
  rulingNoCase: { questionId: 'q3', status: 'refused_ruling', message: 'That is a question for a teacher, and this assistant does not answer those. The help desk is not taking cases yet, so ask your teacher in the lesson.', citations: [], matchedPhrases: ['is it permissible'], supportCaseId: null, supportCaseNumber: null, boundary },
  nothing: { questionId: 'q4', status: 'no_match', message: 'Nothing in your courses covers this yet. A teacher can answer it — ask in the lesson, or open a support case.', citations: [], matchedPhrases: [], supportCaseId: null, supportCaseNumber: null, boundary },
  closed: { questionId: null, status: 'closed', message: 'The study assistant is not switched on. Ask your teacher in the lesson, or open a support case.', citations: [], matchedPhrases: [], supportCaseId: null, supportCaseNumber: null, boundary },
  // An answer that claims a model wrote it: never rendered.
  generated: { questionId: 'q5', status: 'answered', message: 'SYNTHETIC generated text', citations: [], matchedPhrases: [], supportCaseId: null, supportCaseNumber: null, boundary: { ...boundary, model: 'synthetic', generatedText: true } },
};
// None of these may reach a reader whose page is not in English.
const DATABASE_WORDS = ['It is a pointer to a lesson', 'We have opened case', 'The help desk is not taking cases', 'open a support case', 'A citation to a lesson', 'SYNTHETIC', 'ai_support:'];

const state = {
  // What `setting_bool()` answers for each switch: true, false, or 'broken'.
  ask: true, profiles: true,
  teacher: profile, versions: VERSIONS, versionsBroken: false,
  // What `ai_support_ask()` does: a key of ANSWERS, 'too_long', 'denied' or 'gateway'.
  answer: 'answered',
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
  const path = url.pathname;
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, signedIn });
  const send = (value) => res.end(JSON.stringify(value));
  const broken = () => { res.writeHead(500); return send({ code: 'XX000', message: 'SYNTHETIC failure', details: null, hint: null }); };
  const one = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
  if (path === '/rest/v1/rpc/setting_bool') {
    const value = payload?.p_key === 'learning.ai_support' ? state.ask : payload?.p_key === 'teaching.public_profile' ? state.profiles : false;
    return value === 'broken' ? broken() : send(value);
  }
  // A teacher's page is public: these two are read with no session.
  if (path === '/rest/v1/instructor_public_profiles') {
    const slug = url.searchParams.get('slug')?.replace(/^eq\./, '');
    const rows = state.teacher && state.teacher.slug === slug ? [state.teacher] : [];
    if (one) { if (rows.length !== 1) { res.writeHead(406); return send({ code: 'PGRST116', message: 'no rows', details: null, hint: null }); } return send(rows[0]); }
    return send(rows);
  }
  if (path === '/rest/v1/course_versions') return state.versionsBroken ? broken() : send(state.versions);
  if (path === '/rest/v1/rpc/ai_support_ask') {
    if (!signedIn) { res.writeHead(403); return send({ code: '42501', message: 'ai_support:not_signed_in', details: null, hint: null }); }
    if (state.answer === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); return res.end('<html>SYNTHETIC gateway</html>'); }
    if (state.answer === 'too_long') { res.writeHead(400); return send({ code: '22023', message: 'ai_support:too_long', details: null, hint: null }); }
    if (state.answer === 'denied') { res.writeHead(403); return send({ code: '42501', message: 'SYNTHETIC permission denied', details: null, hint: null }); }
    return send(ANSWERS[state.answer]);
  }
  if (path === '/rest/v1/user_profiles') return send(signedIn ? [{ display_name: 'Synthetic learner', account_status: 'active', deleted_at: null, preferred_language: 'en', timezone: null }] : []);
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
  const has = (html, sentences, label) => { for (const s of sentences) assert.ok(html.includes(s), `${label} lacks "${s}"\n${html.slice(0, 3000)}`); };
  const lacks = (html, sentences, label) => { for (const s of sentences) assert.ok(!html.includes(s), `${label} says "${s}"`); };

  // ------------------------------------------------- a teacher's public page
  const T = '/teachers/synthetic-teacher';
  const TEACHER_ENGLISH = ['AyahSpring teacher', 'Courses by', 'View course', 'Website', 'No published courses', 'could not be read', 'This teacher elsewhere', 'Teacher links'];
  // Nobody is signed in: the page is public.
  let full = await page(T, { 'accept-language': 'en' });
  let en = inner(full);
  has(en, [
    '<p class="eyebrow">AyahSpring teacher</p>', 'Ustadh Synthetic', 'Teaches tajwid to beginners', LONG,
    '<nav aria-label="This teacher elsewhere"', '<a href="https://example.invalid/" target="_blank" rel="noreferrer" class="chip">Website</a>',
    '<a href="https://instagram.example.invalid/x" target="_blank" rel="noreferrer" class="chip">Instagram</a>',
    'Courses by <bdi>Ustadh Synthetic</bdi>', '<p class="eyebrow">Arabic</p>', '<p class="eyebrow">English</p>',
    '<h3 dir="auto"><a href="/courses/tajwid-basics">أساسيات التجويد</a></h3>', '<p class="muted" dir="auto">مخارج الحروف وصفاتها.</p>',
    '<a class="btn secondary" href="/courses/tajwid-basics">View course</a>',
  ], 'English teacher page');
  lacks(en, ['YouTube', 'TikTok', 'Facebook', 'data-teacher-courses'], 'English teacher page');
  assert.match(htmlRoot(full), /lang="en"/);

  full = await page(T, { 'accept-language': 'ar' });
  let ar = inner(full);
  assert.match(htmlRoot(full), /lang="ar"/); assert.match(htmlRoot(full), /dir="rtl"/);
  has(ar, [
    '<p class="eyebrow">معلّم في AyahSpring</p>', '<nav aria-label="هذا المعلّم في أماكن أخرى"', 'class="chip">الموقع الإلكتروني</a>', 'class="chip">Instagram</a>',
    'دورات <bdi>Ustadh Synthetic</bdi>', '<p class="eyebrow">العربية</p>', '<p class="eyebrow">الإنجليزية</p>',
    '<a class="btn secondary" href="/courses/tajwid-basics">عرض الدورة</a>', 'Teaches tajwid to beginners',
  ], 'Arabic teacher page');
  lacks(ar, TEACHER_ENGLISH, 'Arabic teacher page');

  // Where the name's ending would have to change, it follows a colon.
  const uz = inner(await page(T, { 'accept-language': 'uz' }));
  has(uz, ['Oʻqituvchining kurslari: <bdi>Ustadh Synthetic</bdi>', 'Kursni koʻrish', 'Veb-sayt'], 'Uzbek teacher page');
  lacks(uz, TEACHER_ENGLISH, 'Uzbek teacher page');

  // A language held for review is given English, and the page says it is English.
  const ha = inner(await page(T, { 'accept-language': 'ha' }));
  has(ha, ['<div class="container section" lang="en" dir="ltr"><p class="eyebrow">AyahSpring teacher</p>', 'Courses by <bdi>Ustadh Synthetic</bdi>'], 'held-language teacher page');

  state.versions = [];
  has(inner(await page(T, { 'accept-language': 'fr' })), ['<p class="empty">Aucun cours publié pour l’instant.</p>', 'Cours de <bdi>Ustadh Synthetic</bdi>'], 'French teacher page with no course');
  // Courses that could not be read: the teacher is still shown, and the list is said to be unread.
  state.versionsBroken = true;
  const unread = inner(await page(T, { 'accept-language': 'fr' }));
  has(unread, ['Ustadh Synthetic', '<div class="notice error" role="alert" data-teacher-courses="unread">Les cours de cet enseignant n’ont pas pu être lus pour l’instant. Réessayez dans un instant.</div>'], 'French teacher page, courses unread');
  lacks(unread, ['Aucun cours publié', 'SYNTHETIC'], 'French teacher page, courses unread');
  state.versionsBroken = false; state.versions = VERSIONS;
  // No such teacher, and the switch off: not found, both.
  assert.equal((await request('/teachers/nobody', { 'accept-language': 'en' })).status, 404);
  state.profiles = false;
  assert.equal((await request(T, { 'accept-language': 'en' })).status, 404);
  state.profiles = true;
  console.log('Teacher page: public; English, Arabic and Uzbek each whole, with the name, the headline and the course titles as written; a held language is given English in a marked frame; no course and unread courses each said in French; no such teacher and the switch off are 404.');

  // ------------------------------------------------------ asking about a lesson
  const anonymous = await request('/learn/ask');
  assert.equal(anonymous.status, 307);
  const redirect = new URL(anonymous.headers.get('location'), origin);
  assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), '/learn/ask');

  const ASK_ENGLISH = ['Ask about a lesson', 'Study help', 'It points', 'An answer here', 'What would you like', 'For example', 'Look it up', 'not switched on', 'Ask for help', 'Back to my learning', 'My learning'];
  full = await page('/learn/ask', { cookie, 'accept-language': 'en' });
  en = inner(full);
  has(en, [
    '<a href="/learn">My learning</a>', '<span>Ask</span>', '<p class="eyebrow">Study help</p>', '<h1>Ask about a lesson</h1>',
    '<div class="notice" data-ask-rule="true"><strong>It points, it does not rule.</strong> An answer here is a lesson from your courses: its title, where it sits, and a line of text you can already read. Nothing on this page writes an answer of its own. A question that asks for a religious ruling goes to a teacher.</div>',
    'data-ask-form="true"', '<label for="ask" class="eyebrow">What would you like to understand?</label>', 'placeholder="For example: how is the letter ha pronounced?"',
    '<button type="button" class="btn">Look it up</button>', '<a href="/support">Ask for help</a>', '<a href="/learn">Back to my learning</a>',
  ], 'English ask page');
  lacks(en, ['data-ask-state="off"'], 'English ask page');
  assert.ok(full.includes('<title>Ask about a lesson'), 'the tab is not named');

  full = await page('/learn/ask', { cookie, 'accept-language': 'ar' });
  ar = inner(full);
  has(ar, [
    '<a href="/learn">تعلّمي</a>', '<span>اسأل</span>', '<p class="eyebrow">مساعدة في الدراسة</p>', '<h1>اسأل عن درس</h1>',
    '<strong>يدلّ ولا يُفتي.</strong> الجواب هنا درسٌ من دوراتك', '>ما الذي تودّ أن تفهمه؟</label>', 'placeholder="مثلًا: كيف يُنطق حرف الحاء؟"',
    '<button type="button" class="btn">ابحث عنه</button>', '<a href="/support">اطلب المساعدة</a>', '<a href="/learn">العودة إلى تعلّمي</a>',
  ], 'Arabic ask page');
  lacks(ar, ASK_ENGLISH, 'Arabic ask page');
  assert.ok(full.includes('<title>اسأل عن درس'), 'the tab is not named in Arabic');

  has(inner(await page('/learn/ask', { cookie, 'accept-language': 'ha' })), ['<div class="page narrow" lang="en" dir="ltr">', '<h1>Ask about a lesson</h1>'], 'held-language ask page');

  // Off: said, and no box. Unread: the box, because the database has the last word.
  state.ask = false;
  const off = inner(await page('/learn/ask', { cookie, 'accept-language': 'fr' }));
  has(off, ['data-ask-state="off"><strong>L’assistant d’étude n’est pas encore activé.</strong> Demandez à votre enseignant dans la leçon, ou demandez de l’aide.</div>'], 'French ask page, off');
  lacks(off, ['data-ask-form', '<textarea'], 'French ask page, off');
  state.ask = 'broken';
  const unknown = inner(await page('/learn/ask', { cookie, 'accept-language': 'fr' }));
  has(unknown, ['data-ask-form="true"', '<textarea'], 'French ask page, switch unread');
  lacks(unknown, ['data-ask-state="off"', 'SYNTHETIC'], 'French ask page, switch unread');
  state.ask = true;
  console.log('Ask page: signed out goes to sign-in; English and Arabic each whole; a held language is given English in a marked frame; off says so in French with no box; an unread switch still offers the box.');

  // ----------------------------------------------------------------- the route
  const post = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/learn/ask`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    return { status: response.status, json: await response.json().catch(() => null) };
  };
  const asked = () => calls.filter((c) => c.path === '/rest/v1/rpc/ai_support_ask');
  let answer = await post({ question: 'How is ha pronounced?' }, {});
  assert.equal(answer.status, 401); assert.equal(answer.json.code, 'signed_out'); assert.equal(asked().length, 0);
  answer = await post({ question: 'ab' });
  assert.equal(answer.status, 422); assert.equal(answer.json.code, 'too_short'); assert.equal(asked().length, 0, 'a two-letter question reached the database');
  answer = await post({ question: 'x'.repeat(1001) });
  assert.equal(answer.status, 422); assert.equal(answer.json.code, 'too_long'); assert.equal(asked().length, 0);
  answer = await post({ question: '  How is ha pronounced?  ' });
  assert.equal(answer.status, 200); assert.equal(answer.json.ok, true); assert.equal(answer.json.answer.status, 'answered');
  assert.deepEqual(asked().at(-1).payload, { p_question: 'How is ha pronounced?', p_course_id: null });
  state.answer = 'too_long'; answer = await post({ question: 'How is ha pronounced?' });
  assert.equal(answer.status, 422); assert.equal(answer.json.code, 'too_long');
  state.answer = 'denied'; answer = await post({ question: 'How is ha pronounced?' });
  assert.equal(answer.status, 422); assert.equal(answer.json.code, 'not_sent');
  // Not refusals: nobody can say what happened, and the route does not call them one.
  state.answer = 'gateway'; answer = await post({ question: 'How is ha pronounced?' });
  assert.equal(answer.status, 502); assert.equal(answer.json.code, 'unsure');
  assert.equal(JSON.stringify(answer.json).includes('SYNTHETIC'), false, 'a gateway’s page is sent on to the browser');
  state.answer = 'generated'; answer = await post({ question: 'How is ha pronounced?' });
  assert.equal(answer.status, 502); assert.equal(answer.json.code, 'unsure');
  assert.equal(JSON.stringify(answer.json).includes('SYNTHETIC'), false, 'text that claims a model wrote it is sent to the browser');
  state.answer = 'answered';
  console.log('Ask route: signed out 401; too short and too long each 422 by name with the database not asked; a question sent trimmed; the database’s own refusals by name; a gateway’s page and an answer that claims a model wrote it are 502 "unsure", and neither is sent on.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (path, code, width, a11y) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
        ...(a11y ? [{ name: 'ayahspring_a11y', value: a11y, url: origin }] : []),
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      const sent = []; tab.on('request', (r) => { if (r.url().endsWith('/api/learn/ask') && r.method() === 'POST') sent.push(r.postDataJSON()); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      // Name what sticks out, so the failure says where to look.
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 30)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: the page scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => (el.textContent ?? '').slice(0, 40)));
      assert.deepEqual(spill, [], `${label}: a card's contents are wider than the card`);
    };
    const SIZES = [[320, null], [320, 'v1.larger.normal.system.dyslexic'], [390, null], [1440, null]];
    for (const [code, heading, look] of [['en', 'Ask about a lesson', 'Look it up'], ['ar', 'اسأل عن درس', 'ابحث عنه'], ['fr', 'Poser une question sur une leçon', 'Chercher']]) {
      for (const [width, a11y] of SIZES) {
        const label = `${code} ${width}${a11y ? ' largest text and the dyslexia font' : ''}`;
        let { context, tab, errors } = await open(T, code, width, a11y);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: 'Ustadh Synthetic', exact: true, level: 1 }).count(), 1, `${label}: the teacher's name`);
        await fits(tab, width, `${label} ${T}`);
        assert.deepEqual(errors, [], `${label}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && !a11y && width === 390) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/teacher-${code}-${width}.png`, fullPage: true });
        await context.close();

        ({ context, tab, errors } = await open('/learn/ask', code, width, a11y));
        assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${label}: heading`);
        await fits(tab, width, `${label} /learn/ask`);
        // With an answer under the box, a long line quoted from a lesson and all.
        await tab.locator('#ask').fill('How is ha pronounced?');
        await tab.getByRole('button', { name: look, exact: true }).click();
        await tab.locator('[data-ask-answer="answered"]').waitFor();
        await fits(tab, width, `${label} /learn/ask with an answer`);
        assert.deepEqual(errors, [], `${label}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && !a11y && width === 390) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/ask-${code}-${width}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic teacher page and ask page in ${code}: fit at 320, 390 and 1440px, and at 320px with the largest text and the dyslexia font, the ask page with an answer under the box too.`);
    }

    // ------------------------------------------------------ the box, in Arabic
    {
      const { context, tab, errors, sent } = await open('/learn/ask', 'ar', 390, null);
      const form = tab.locator('[data-ask-form]');
      const box = tab.locator('#ask');
      const look = form.getByRole('button', { name: 'ابحث عنه', exact: true });
      const said = async (sentence) => { await form.getByRole('alert').filter({ hasText: sentence }).waitFor(); };
      const text = async () => (await tab.locator('main').innerText());
      const noEnglish = async (label) => { const seen = await text(); for (const words of DATABASE_WORDS) assert.ok(!seen.includes(words), `${label}: the page says "${words}"`); };

      // Too short: named before anything is sent.
      await box.fill('ab'); await look.click();
      await said('اكتب أكثر قليلًا ليكون للسؤال معنى.');
      assert.equal(sent.length, 0, 'a two-letter question was sent');

      // Found: the status and its meaning in Arabic, the lesson as its author wrote it.
      state.answer = 'answered';
      await box.fill('كيف يُنطق حرف الحاء؟'); await look.click();
      let card = tab.locator('[data-ask-answer="answered"]'); await card.waitFor();
      assert.deepEqual(sent.at(-1), { question: 'كيف يُنطق حرف الحاء؟' });
      assert.equal(await card.locator('.eyebrow').innerText(), 'موجود في دوراتك');
      assert.ok((await card.innerText()).includes('هذا ما تتناوله دوراتك في ذلك. إنه يدلّ على درس، وليس جوابًا كُتب لك.'));
      assert.equal(await card.getByRole('link', { name: 'مخرج الحاء', exact: true }).getAttribute('href'), '/courses/tajwid-basics');
      assert.equal(await card.locator('mark').innerText(), 'letter');
      assert.equal(await card.locator('.ask-line').evaluate((el) => getComputedStyle(el).direction), 'ltr', 'an English line quoted on an Arabic page is set right to left');
      assert.ok((await card.innerText()).includes('درس تستطيع فتحه، أو لا جواب. الأسئلة التي تطلب حكمًا تُرفع إلى معلّم.'));
      assert.equal(await box.inputValue(), '', 'the box kept a question that was answered');
      await noEnglish('found');

      // A question for a teacher, with a request opened: a link to it, by its number.
      state.answer = 'ruling';
      await box.fill('هل يجوز ذلك؟'); await look.click();
      card = tab.locator('[data-ask-answer="refused_ruling"]'); await card.waitFor();
      assert.equal(await card.locator('.eyebrow').innerText(), 'سؤال لمعلّم');
      assert.ok((await card.innerText()).includes('فُتح طلب مساعدة ليجيب عنه إنسان.'));
      const link = card.getByRole('link');
      assert.equal(await link.getAttribute('href'), '/support/SC-000012');
      assert.ok((await link.innerText()).includes('افتح الطلب') && (await link.innerText()).includes('SC-000012'));
      await noEnglish('a ruling, request opened');
      // And with none opened: no link, and no claim that one was.
      state.answer = 'rulingNoCase';
      await box.fill('هل يجوز ذلك؟'); await look.click();
      await tab.locator('[data-ask-answer="refused_ruling"]').filter({ hasText: 'اسأل معلّمك في الدرس.' }).waitFor();
      assert.equal(await tab.locator('[data-ask-answer] a').count(), 0);
      assert.ok(!(await text()).includes('فُتح طلب مساعدة'));
      await noEnglish('a ruling, no request');

      state.answer = 'nothing';
      await box.fill('سؤال آخر'); await look.click();
      card = tab.locator('[data-ask-answer="no_match"]'); await card.waitFor();
      assert.equal(await card.locator('.eyebrow').innerText(), 'لا شيء في دوراتك بعد');
      await noEnglish('nothing found');
      // The database says it is off although the page drew the box.
      state.answer = 'closed';
      await box.fill('سؤال آخر'); await look.click();
      card = tab.locator('[data-ask-answer="closed"]'); await card.waitFor();
      assert.ok((await card.innerText()).includes('مساعد الدراسة غير مفعّل بعد. اسأل معلّمك في الدرس، أو اطلب المساعدة.'));
      await noEnglish('closed');

      // The database's own refusal, by name.
      state.answer = 'denied';
      await box.fill('سؤال آخر'); await look.click();
      await said('تعذّر إرسال السؤال. لم يُسجَّل شيء.');
      assert.equal(await tab.locator('[data-ask-answer]').count(), 0, 'the last answer stayed under a refusal');
      assert.equal(await box.inputValue(), 'سؤال آخر');
      // Not refusals. What was typed is kept, and nothing says "nothing was recorded".
      for (const kind of ['gateway', 'generated']) {
        state.answer = kind;
        await look.click();
        await said('تعذّرت قراءة الجواب. ربما سُجّل سؤالك؛ انظر إلى طلبات المساعدة قبل أن تطرحه من جديد.');
        assert.ok(!(await text()).includes('لم يُسجَّل شيء'), `${kind}: said nothing was recorded`);
        assert.equal(await box.inputValue(), 'سؤال آخر', `${kind}: what was typed is gone`);
        await noEnglish(kind);
      }
      await tab.route('**/api/learn/ask', (route) => route.abort());
      await look.click();
      await said('تعذّرت قراءة الجواب. ربما سُجّل سؤالك؛ انظر إلى طلبات المساعدة قبل أن تطرحه من جديد.');
      assert.equal(await box.inputValue(), 'سؤال آخر');
      await tab.unroute('**/api/learn/ask');
      state.answer = 'answered';
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic question box in Arabic: too short named before anything is sent; found, a question for a teacher with and without a request, nothing found and switched off each said in Arabic with none of the database’s English; a refusal by name; a gateway’s page, an answer that claims a model wrote it and a lost connection each said as "could not be read", with what was typed kept.');
    }
  }
  console.log('Ask and teacher HTTP smoke passed. Not real Auth, RLS or `ai_support_ask()`; no lesson was searched, and no speaker has read the translations.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
