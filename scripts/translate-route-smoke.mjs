// Real Next: the /api/translate route, the Translate button on a discussion
// thread, the staff page for teachers in three languages, and the page where
// a child chooses their own password, against an entirely synthetic loopback
// Auth/REST API and a synthetic stand-in for the translation service.
//
// Nothing here reaches Google. The server is started with a key that is not
// a key and with TRANSLATE_TEST_ENDPOINT pointing at this script, which
// answers every request by putting the target language in front of the text.
// So this is not evidence that Google accepts the request, the key, or any
// of the language names; that a translation is good; or about hosted
// Supabase, JWT validation, RLS, or the rules inside spend_translation()
// (the limits, the staff exemption, the month). Those rules are held by
// supabase/tests/translate_button.test.mjs against the real migration. A
// server with no key is not started here either. Every post, name and
// application in it is invented.
//
// What it does show: what leaves the platform when the button is pressed
// (the text and a language, and nothing about who asked); that the language
// comes from the reader's own choice and never from the request; that the
// database is asked first and Google is not asked when it says no; the name
// and status of each refusal; that neither the key, Google's words nor the
// database's words reach the reader; that no button is drawn while the
// switch is off; that the staff page for teachers is written in the reader's
// language while what applicants wrote stays as written; and, in a browser,
// that the button shows a translation under the original and hides it again.
// The expected sentences are typed here rather than imported, so this fails
// if a catalogue changes without anybody looking at the page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '3d5a1c07-6e42-4b1f-9a38-52c7e0b9d114', aud: 'authenticated', role: 'authenticated', email: 'probe@synthetic.example', app_metadata: {}, user_metadata: {} };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;

const KEY = 'SYNTHETIC-KEY-that-is-not-a-key';
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE permission denied for table translation_spend';
const GOOGLE_SENTENCE = 'SYNTHETIC-GOOGLE API key not valid';
const THREAD = '9a2e7b10-4c3d-4e5f-8a6b-7c8d9e0f1a01';
const REPLY = '9a2e7b10-4c3d-4e5f-8a6b-7c8d9e0f1a02';
const GONE_REPLY = '9a2e7b10-4c3d-4e5f-8a6b-7c8d9e0f1a03';
const APPLICATION = '9a2e7b10-4c3d-4e5f-8a6b-7c8d9e0f1a04';
const DECIDED = '9a2e7b10-4c3d-4e5f-8a6b-7c8d9e0f1a05';
const TEACHER = '9a2e7b10-4c3d-4e5f-8a6b-7c8d9e0f1a06';
const AT = '2026-11-20T09:14:00+00:00';
const LONG = `synthetic-word-with-no-place-to-break-${'x'.repeat(120)}`;
const TITLE = 'Synthetic title, written in Swahili';
const BODY = `Synthetic swali: nifanye <b>mazoezi</b> kwa muda gani?\n\n${LONG}`;
const ANSWER = 'Synthetic jibu: dakika kumi kila siku.';
const QUALIFICATIONS = `Synthetic ijazah in Hafs, ten years of teaching children & adults.\n${LONG}`;

const fresh = () => ({
  // The owner's switches that are on.
  flags: new Set(['platform.translate']),
  staff: false,
  // What spend_translation() answers instead of counting: a name, or 'broken'.
  refuse: null,
  // What the stand-in for Google does: 'ok', 'down', 'unsupported', 'nonsense'.
  google: 'ok',
  // The language the stand-in says the text was in.
  detected: 'sw',
  queueBroken: false,
  waiting: [{ id: APPLICATION, name: 'Synthetic Person Who Asked', email: 'applicant@synthetic.example', headline: 'Synthetic tajwid for beginners', qualifications: QUALIFICATIONS, sampleUrl: 'https://video.synthetic.example/sample', note: 'Synthetic note: I teach in Swahili.', submittedAt: AT }],
  decided: [{ id: DECIDED, name: 'Synthetic Earlier', headline: 'Synthetic fiqh', status: 'declined', reason: 'Synthetic reason given before', decidedAt: AT }],
  // What my_child_login() answers.
  child: { isChild: false, username: null, ownPassword: null },
});
let state = fresh();

// One list for both stand-ins, so the order of the two can be read.
const calls = [];
const asked = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  if (req.url === '/google') {
    const p = body ? JSON.parse(body) : {};
    asked.push({ headers: req.headers, raw: body, payload: p, after: calls.length });
    if (state.google === 'down') { res.writeHead(403); res.end(JSON.stringify({ error: { code: 403, message: GOOGLE_SENTENCE } })); return; }
    if (state.google === 'unsupported') { res.writeHead(400); res.end(JSON.stringify({ error: { code: 400, message: 'Invalid Value' } })); return; }
    if (state.google === 'nonsense') { res.end(JSON.stringify({ SYNTHETIC: 'not a translation' })); return; }
    res.end(JSON.stringify({ data: { translations: [{ translatedText: `[${p.target}] ${p.q[0]}`, detectedSourceLanguage: state.detected }] } }));
    return;
  }
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
  const fn = path.replace('/rest/v1/rpc/', '');
  if (fn === 'setting_bool') { send(state.flags.has(p.p_key)); return; }
  if (!signedIn) { res.writeHead(401); res.end('{}'); return; }
  if (fn === 'spend_translation') {
    if (state.refuse === 'broken') { res.writeHead(500); send({ code: 'XX000', message: DATABASE_SENTENCE }); return; }
    if (state.refuse) { res.writeHead(400); send({ code: 'P0001', message: `translate:${state.refuse}`, details: null, hint: null }); return; }
    if (!state.flags.has('platform.translate')) { res.writeHead(400); send({ code: 'P0001', message: 'translate:closed', details: null, hint: null }); return; }
    send({ characters: p.p_characters });
  }
  else if (fn === 'my_board') send({ board: p.p_board, open: true, kind: 'student', until: null, handle: 'synthetic_me', handleFixed: true, blocked: false, moderator: false });
  else if (fn === 'board_thread') send({
    thread: { id: THREAD, board: 'students', title: TITLE, body: BODY, handle: 'synthetic_other', kind: 'teacher', mine: false, state: 'visible', createdAt: AT },
    replies: [
      { id: REPLY, body: ANSWER, handle: 'synthetic_third', kind: 'student', mine: false, state: 'visible', createdAt: AT },
      { id: GONE_REPLY, mine: false, state: 'withdrawn', createdAt: AT },
    ],
  });
  else if (fn === 'has_role') send(state.staff);
  else if (fn === 'staff_directory') send({ kind: 'teachers', query: p.p_search, total: p.p_search ? 0 : 1, truncated: false, rows: p.p_search ? [] : [{ userId: TEACHER, name: 'Synthetic Teacher', email: 'teacher@synthetic.example', joinedAt: AT, slug: 'synthetic-teacher', profileStatus: 'published', headline: 'Synthetic headline', publishedCourses: 2, courses: 3, learners: 41 }] });
  else if (fn === 'teaching_application_queue') {
    if (state.queueBroken) { res.writeHead(500); send({ code: 'XX000', message: DATABASE_SENTENCE }); return; }
    send({ open: true, waiting: state.waiting, decided: state.decided, counts: { waiting: state.waiting.length, approved: 0, declined: state.decided.length } });
  }
  else if (fn === 'decide_teaching_application') { state.waiting = []; send({ status: p.p_approve ? 'approved' : 'declined' }); }
  else if (fn === 'my_child_login') send(state.child);
  else if (fn === 'notification_badge') send(0);
  else if (path.startsWith('/rest/v1/rpc/')) send({});
  else send([]);
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = resolve(import.meta.dirname, '..');
const rpcs = (name) => calls.filter((c) => c.path === `/rest/v1/rpc/${name}`);

// Start from an empty compiler cache. A dev server that was killed while it
// was writing its cache leaves one that makes every page in a browser reload
// for ever ("HMR hash mismatch"), in this run and every run after it, and
// the scripts that run before this one stop their servers hard. Found
// 2026-11-24, when this script failed that way on its first run in CI and
// again here after a server was killed. Not done while a dev server holds
// the directory: that server is somebody's, and Next refuses a second one.
{
  const lock = resolve(root, 'web/.next/dev/lock');
  let held = false;
  if (existsSync(lock)) {
    try { process.kill(JSON.parse(readFileSync(lock, 'utf8')).pid, 0); held = true; } catch { /* nobody holds it */ }
  }
  if (!held) rmSync(resolve(root, 'web/.next/dev/cache/turbopack'), { recursive: true, force: true });
}

const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: {
    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon',
    GOOGLE_TRANSLATE_API_KEY: KEY, TRANSLATE_TEST_ENDPOINT: `http://127.0.0.1:${fake.address().port}/google`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const seen = { logs: '' };
const origin = `http://localhost:${port}`;

const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'').replaceAll('&quot;', '"');
const has = (html, sentences, what) => { for (const sentence of sentences) assert.ok(html.includes(sentence), `${what} lacks "${sentence}"\n${html.slice(0, 12000)}`); };
const hasNot = (html, sentences, what) => { for (const sentence of sentences) assert.ok(!html.includes(sentence), `${what} still says "${sentence}"`); };
// What no reader is sent: the key, the service's words, the database's words.
const NEVER = [KEY, 'SYNTHETIC-GOOGLE', 'SYNTHETIC-DATABASE', 'translate:'];
const count = (html, piece) => html.split(piece).length - 1;

const EN = {
  button: 'Translate', hide: 'Hide the translation', by: 'A machine translated this. It can be wrong.', same: 'This is already in your language.',
  offered: 'Posts are shown as they were written. Press the button under a post and a machine translates it for you.',
  tooMany: 'You have reached the most one person can translate in a day. Try again tomorrow.',
  kidTitle: 'Choose your own password',
  kidLede: 'Your parent or guardian set the password you signed in with. Choose a new one that only you know. If you forget it, they can set another for you.',
  tqLede: 'Everyone who may teach here, and what each of them has published. Teaching is by appointment. Nobody becomes a teacher by signing up.',
  tqUnread: 'The applications could not be read. Nothing was changed.',
  needReason: 'Write a reason first. The applicant reads it.',
};
const AR = {
  button: 'ترجمة', hide: 'إخفاء الترجمة', by: 'هذه ترجمة آلية، وقد تكون خاطئة.',
  offered: 'تُعرض المشاركات كما كُتبت. اضغط الزر تحت المشاركة لتترجمها لك الآلة.',
  tooMany: 'بلغت أقصى ما يترجمه شخص واحد في اليوم. حاول غدًا.',
  kidTitle: 'اختر كلمة مرور خاصة بك',
  tqTitle: 'المعلمون',
  tqLede: 'كل من يحق له التدريس هنا، وما نشره كل واحد منهم. التدريس بالتعيين. لا يصير أحد معلمًا بمجرد التسجيل.',
  tqUnread: 'تعذّرت قراءة الطلبات. لم يتغيّر شيء.',
  tqOpen: 'باب طلبات التدريس مفتوح.',
  needReason: 'اكتب السبب أولًا. المتقدّم يقرؤه.',
  approve: 'الموافقة عليه معلمًا',
  approved: 'تمت الموافقة. صار يحمل دور المعلم. كل دورة يكتبها تمرّ بالمراجعة.',
};
// English a translated staff page must not hold. Everything a person typed begins "Synthetic".
const TQ_ENGLISH_ONLY = ['Teachers', 'Directory', 'Everyone who may teach', 'Applications to teach', 'Waiting to be read', 'Approve', 'Decline', 'Your reason', 'Appointed', 'Decisions', 'Applicant', 'Watch the', 'Search', 'learners', 'Roles', 'Payouts', 'by appointment', 'Sent:'];

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
  const page = async (path, code = 'en') => {
    const response = await request(path, { cookie: `${cookie}; ayahspring_locale=${code}`, 'accept-language': code });
    assert.equal(response.status, 200, `${path}\n${seen.logs.slice(-2000)}`);
    const whole = await response.text();
    hasNot(whole, NEVER, `${path} in ${code}`);
    return inner(whole);
  };
  const send = async (body, { code = 'sw', signedIn = true, type = 'application/json' } = {}) => {
    calls.length = 0; asked.length = 0;
    const response = await fetch(`${origin}/api/translate`, {
      method: 'POST',
      headers: { 'content-type': type, 'accept-language': 'en', cookie: `${signedIn ? `${cookie}; ` : ''}ayahspring_locale=${code}` },
      body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000),
    });
    const text = await response.text();
    hasNot(text, NEVER, `the route's answer ${text.slice(0, 300)}`);
    assert.equal(response.headers.get('cache-control'), 'no-store', 'an answer that may be kept by a cache');
    return { status: response.status, json: JSON.parse(text) };
  };
  const expect = (answer, status, code, what) => {
    assert.equal(answer.status, status, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(answer.json.code, code, `${what}: ${JSON.stringify(answer)}`);
    assert.deepEqual(Object.keys(answer.json).sort(), ['code', 'message', 'ok'], what);
    assert.equal(answer.json.ok, false, what);
  };
  const nothingSpent = (what) => { assert.equal(rpcs('spend_translation').length, 0, `${what}: the database was asked to count it`); assert.equal(asked.length, 0, `${what}: the service was asked`); };

  // ---------------------------------------------------- refused before anything
  expect(await send({ text: BODY }, { signedIn: false }), 401, 'not_signed_in', 'signed out'); nothingSpent('signed out');
  expect(await send(`text=${encodeURIComponent(BODY)}`, { type: 'application/x-www-form-urlencoded' }), 400, 'refused', 'a form'); nothingSpent('a form');
  for (const empty of [{}, { text: '' }, { text: '   \n ' }, { text: 7 }, [BODY], 'not json']) { expect(await send(empty), 400, 'empty', `nothing to translate: ${JSON.stringify(empty)}`); nothingSpent('nothing to translate'); }
  expect(await send({ text: 'x'.repeat(5001) }), 413, 'too_long', 'one letter too many'); nothingSpent('too long');

  // ------------------------------------------------------------- what leaves
  let answer = await send({ text: BODY });
  assert.equal(answer.status, 200, JSON.stringify(answer));
  assert.deepEqual(answer.json, { ok: true, text: `[sw] ${BODY}`, from: 'sw', to: 'sw', same: true });
  assert.deepEqual(rpcs('spend_translation').map((c) => c.payload), [{ p_characters: [...BODY].length }], 'what the database was asked to count');
  assert.equal(asked.length, 1);
  // The database is asked first.
  assert.ok(calls.findIndex((c) => c.path === '/rest/v1/rpc/spend_translation') < asked[0].after, 'the service was asked before the database allowed it');
  // The text, the language and how to read it. Nothing about who asked.
  assert.deepEqual(asked[0].payload, { q: [BODY], target: 'sw', format: 'text' });
  assert.equal(asked[0].headers['x-goog-api-key'], KEY);
  assert.equal(asked[0].headers.cookie, undefined, 'the reader’s cookie went to the service');
  assert.equal(asked[0].headers.authorization, undefined, 'the reader’s session went to the service');
  for (const secret of [user.id, user.email, token, 'ayahspring_locale']) assert.ok(!JSON.stringify(asked[0].headers).includes(secret) && !asked[0].raw.includes(secret), `the service was sent ${secret.slice(0, 24)}`);

  // Five thousand characters as they are billed, not as UTF-16 halves.
  answer = await send({ text: '🌙'.repeat(5000) });
  assert.equal(answer.status, 200, 'five thousand characters were refused');
  assert.deepEqual(rpcs('spend_translation').map((c) => c.payload), [{ p_characters: 5000 }]);

  // The language is the reader's own choice. A request cannot name another.
  state = fresh(); state.detected = 'en';
  for (const [code, target] of [['ar', 'ar'], ['zh-hans', 'zh-CN'], ['zh-hant', 'zh-TW'], ['fa-af', 'fa-AF'], ['fil', 'tl'], ['ta', 'ta'], ['en', 'en']]) {
    answer = await send({ text: ANSWER, to: 'fr', target: 'fr', language: 'fr', locale: 'fr' }, { code });
    assert.equal(answer.status, 200, code);
    assert.equal(asked[0].payload.target, target, `${code} was asked for as ${asked[0].payload.target}`);
    assert.equal(answer.json.to, code);
    assert.equal(answer.json.same, code === 'en', `${code}: same`);
  }
  // Two kinds of Chinese are not one language.
  state.detected = 'zh-TW';
  assert.equal((await send({ text: ANSWER }, { code: 'zh-hans' })).json.same, false);

  // ---------------------------------------------------- the database says no
  for (const [name, status, code] of [['too_many', 429, 'too_many'], ['month_spent', 429, 'month_spent'], ['closed', 404, 'closed'], ['not_signed_in', 401, 'not_signed_in'], ['something_new', 400, 'refused'], ['broken', 400, 'refused']]) {
    state = fresh(); state.refuse = name;
    expect(await send({ text: ANSWER }), status, code, `database: ${name}`);
    assert.equal(rpcs('spend_translation').length, 1); assert.equal(asked.length, 0, `${name}: the service was asked after the database said no`);
  }
  // The owner's switch is off: the database refuses and nothing leaves.
  state = fresh(); state.flags.clear();
  expect(await send({ text: ANSWER }), 404, 'closed', 'switched off'); assert.equal(asked.length, 0, 'switched off, and the text still left');

  // ----------------------------------------------------- the service fails
  for (const [how, status, code] of [['down', 502, 'unavailable'], ['nonsense', 502, 'unavailable'], ['unsupported', 422, 'unsupported']]) {
    state = fresh(); state.google = how;
    expect(await send({ text: ANSWER }), status, code, `service: ${how}`);
    // It was counted: the service may have charged for it.
    assert.equal(rpcs('spend_translation').length, 1, how); assert.equal(asked.length, 1, how);
  }
  console.log('Translate route: signed out 401, a form 400, nothing to translate 400, too long 413, each with nothing counted and nothing sent; a good request counts the characters first and sends the service the text, the language and nothing about who asked; the language is the reader’s own in seven languages whatever the request names; each database refusal has its name and status and stops the request; a failing service is 502 or 422 and is still counted; no answer holds the key, the service’s words or the database’s.');

  // ------------------------------------------------------- the button on a page
  state = fresh();
  let html = await page(`/discuss/students/${THREAD}`);
  // Under the first post and the one reply that can be read. Not under the one taken back.
  assert.equal(count(html, 'class="translate-press"'), 2, `buttons on the thread\n${html.slice(0, 6000)}`);
  has(html, [`<button type="button" class="translate-press" aria-expanded="false">${EN.button}</button>`, `<p class="muted">${EN.offered}</p>`], 'the thread, on');
  hasNot(html, ['not translated', EN.by], 'the thread, on');
  html = await page(`/discuss/students/${THREAD}`, 'ar');
  assert.equal(count(html, `class="translate-press" aria-expanded="false">${AR.button}</button>`), 2);
  has(html, [`<p class="muted">${AR.offered}</p>`], 'the thread in Arabic, on');
  // Off: no button, and the page says posts are not translated.
  state = fresh(); state.flags.clear();
  html = await page(`/discuss/students/${THREAD}`);
  assert.equal(count(html, 'translate-press'), 0, 'a button while translation is off');
  has(html, ['<p class="muted">Posts are shown as they were written. They are not translated.</p>'], 'the thread, off');
  hasNot(html, [EN.offered], 'the thread, off');
  console.log('Translate button on a thread: one under the first post and one under the reply that can be read, none under a post taken back; in Arabic; none at all while the switch is off, when the page says posts are not translated.');

  // ------------------------------------------------- the staff page for teachers
  state = fresh();
  const away = await request('/admin/teachers', { cookie });
  assert.equal(away.status, 307); assert.equal(away.headers.get('location'), '/admin', 'somebody who is not staff');
  assert.equal(rpcs('teaching_application_queue').length, 0, 'the applications were read for somebody who is not staff');
  const signedOut = await request('/admin/teachers');
  assert.equal(signedOut.headers.get('location'), '/sign-in?next=/admin/teachers');

  state = fresh(); state.staff = true;
  html = await page('/admin/teachers');
  has(html, [
    '<h1>Teachers</h1>', `<p class="muted">${EN.tqLede}</p>`, '<strong>Applications to teach are open.</strong>',
    '<h2>Waiting to be read: 1</h2>', 'Sent: Nov 20, 2026', '<p class="muted" data-tq-summary="true">1 teacher.</p>', 'Appointed: Nov 20, 2026',
    'Approve as a teacher', 'Decline, with the reason', 'Your reason (the applicant reads this)',
    // What a person wrote: as written, in no known language, markup made text.
    '<h3 style="margin:0;overflow-wrap:anywhere" dir="auto" lang="">Synthetic tajwid for beginners</h3>',
    'dir="auto" lang="">Synthetic ijazah in Hafs, ten years of teaching children &amp; adults.',
    '<bdi dir="ltr">applicant@synthetic.example</bdi>',
    `class="translate-press" aria-expanded="false">${EN.button}</button>`,
    'Write in your own language. Whoever reads it can ask a machine to translate it.',
  ], '/admin/teachers');
  assert.equal(count(html, 'translate-press'), 1, 'one button for each application waiting');
  for (const [code, dir] of [['ar', 'rtl'], ['ta', 'ltr']]) {
    html = await page('/admin/teachers', code);
    hasNot(html, TQ_ENGLISH_ONLY, `/admin/teachers in ${code}`);
    has(html, ['Synthetic tajwid for beginners', 'Synthetic ijazah in Hafs', 'Synthetic note: I teach in Swahili.', 'Synthetic reason given before', 'Synthetic Teacher', 'Synthetic headline', '<code dir="ltr">teaching.applications</code>'], `/admin/teachers in ${code}: what people wrote`);
    assert.ok(dir);
  }
  html = await page('/admin/teachers', 'ar');
  has(html, [`<h1>${AR.tqTitle}</h1>`, `<p class="muted">${AR.tqLede}</p>`, `<strong>${AR.tqOpen}</strong>`, AR.approve, `بانتظار القراءة: ${new Intl.NumberFormat('ar').format(1)}`, `class="translate-press" aria-expanded="false">${AR.button}</button>`], '/admin/teachers in Arabic');
  // A search that finds nobody says what was looked for, as it was typed.
  html = await page('/admin/teachers?q=Synthetic%20%3Cb%3Enobody%3C%2Fb%3E', 'ar');
  has(html, ['<bdi dir="auto" lang="">Synthetic &lt;b&gt;nobody&lt;/b&gt;</bdi>'], 'a search that finds nobody');
  // The applications could not be read: said, in the reader's language, and the roster is still drawn.
  state = fresh(); state.staff = true; state.queueBroken = true;
  html = await page('/admin/teachers');
  has(html, [`<div class="notice error" role="alert" data-tq-state="unread">${EN.tqUnread}</div>`, 'Synthetic Teacher'], 'the applications unread');
  hasNot(html, ['Waiting to be read', 'translate-press'], 'the applications unread');
  has(await page('/admin/teachers', 'ar'), [AR.tqUnread], 'the applications unread, in Arabic');
  // Translation off: the page is the same without the button or the sentence about it.
  state = fresh(); state.staff = true; state.flags.clear();
  html = await page('/admin/teachers');
  hasNot(html, ['translate-press', 'Whoever reads it can ask a machine'], '/admin/teachers, translation off');
  console.log('Staff page for teachers: not staff is sent away and nothing is read; English, Arabic and Tamil with no English left but what people wrote, which stays as written; a search that finds nobody; applications that could not be read said in the reader’s language with the roster still drawn; a Translate button for each waiting application only while translation is on.');

  // --------------------------------------------- a child's first password
  state = fresh(); state.child = { isChild: true, username: 'synthetic.child', ownPassword: false };
  html = await page('/account/password');
  has(html, [`<h1>${EN.kidTitle}</h1>`, `<p class="lede">${EN.kidLede}</p>`, 'data-first-password="true"'], 'a child whose password a guardian set');
  has(await page('/account/password', 'ar'), [`<h1>${AR.kidTitle}</h1>`], 'the same in Arabic');
  for (const child of [{ isChild: true, username: 'synthetic.child', ownPassword: true }, { isChild: false, username: null, ownPassword: null }, { SYNTHETIC: 'nonsense' }]) {
    state = fresh(); state.child = child;
    hasNot(await page('/account/password'), [EN.kidTitle, 'data-first-password'], `not a first password: ${JSON.stringify(child)}`);
  }
  console.log('A child’s first password: a child still on a guardian’s password is asked, in their language, to choose their own; a child who has, an adult, and an unreadable answer are shown the ordinary page.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const visit = async (path, code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: code, url: origin }]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      const sent = []; tab.on('request', (r) => { if (r.method() === 'POST' && /\/api\/(translate|teaching\/apply)$/.test(new URL(r.url()).pathname)) sent.push({ path: new URL(r.url()).pathname, body: r.postDataJSON() }); });
      // Nothing in the browser talks to the database or to the translation service itself.
      const direct = []; tab.on('request', (r) => { if (r.url().includes('/rest/v1/') || r.url().includes('/auth/v1/') || r.url().includes('/google') || r.url().includes('googleapis')) direct.push(r.url()); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent, direct };
    };
    const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png`, fullPage: true, caret: 'initial' }); };
    const fits = (tab) => tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    // Which elements reach past the screen's edge, for the message when a page does not fit.
    const widest = (tab) => tab.evaluate(() => {
      // Inside something that scrolls or clips sideways, reaching past the edge is not the page being too wide.
      const clipped = (e) => { for (let up = e.parentElement; up && up !== document.body; up = up.parentElement) { if (getComputedStyle(up).overflowX !== 'visible') return true; } return false; };
      const past = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return (r.right > window.innerWidth + 0.01 || r.left < -0.01) && !clipped(e); });
      return `${past.slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${e.className} ${Math.round(e.getBoundingClientRect().left * 10) / 10}..${Math.round(e.getBoundingClientRect().right * 10) / 10} "${(e.textContent ?? '').slice(0, 40)}"`).join(' | ')} (page ${document.documentElement.scrollWidth}, screen ${window.innerWidth})`;
    });

    // The thread with a translation open, and the staff page, fit a phone in three scripts.
    for (const [code, dir] of [['en', 'ltr'], ['ar', 'rtl'], ['ta', 'ltr']]) {
      for (const width of [320, 390, 1440]) {
        state = fresh(); state.staff = true; state.detected = 'sw';
        {
          const { context, tab, errors, direct } = await visit(`/discuss/students/${THREAD}`, code, width);
          assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
          await tab.locator('.translate-press').first().click();
          await tab.locator('.translate-text').first().waitFor();
          assert.ok(await fits(tab), `${code} ${width}: the thread with a translation open is wider than the screen: ${await widest(tab)}`);
          if ([390, 1440].includes(width)) await shot(tab, `translate-thread-${code}-${width}`);
          assert.deepEqual(errors, [], `${code} ${width} thread`); assert.deepEqual(direct, [], `${code} ${width} thread`);
          await context.close();
        }
        {
          const { context, tab, errors, direct } = await visit('/admin/teachers', code, width);
          assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('[data-tq-page]')).direction), dir, `${code}: the staff page`);
          assert.ok(await fits(tab), `${code} ${width}: /admin/teachers is wider than the screen: ${await widest(tab)}`);
          assert.equal(await tab.locator(`label[for="reason-${APPLICATION}"]`).count(), 1, 'the reason box has no label');
          if ([390, 1440].includes(width)) await shot(tab, `translate-teachers-${code}-${width}`);
          assert.deepEqual(errors, [], `${code} ${width} teachers`); assert.deepEqual(direct, [], `${code} ${width} teachers`);
          await context.close();
        }
      }
    }

    // In Arabic at 390: translate a post, hide it, show it again without asking twice; then be refused in Arabic.
    {
      state = fresh();
      const { context, tab, errors, sent, direct } = await visit(`/discuss/students/${THREAD}`, 'ar', 390);
      const first = tab.locator('.translate').first();
      await first.getByRole('button', { name: AR.button, exact: true }).click();
      await first.locator('.translate-text').waitFor();
      // Under the original, which is still there, with a line that says a machine made it.
      assert.equal(await first.locator('.translate-note').innerText(), AR.by);
      assert.equal(await first.locator('.translate-text').innerText(), `[ar] ${TITLE}\n\n${BODY}`);
      assert.equal(await first.locator('.translate-text').getAttribute('lang'), 'ar');
      // The markup somebody typed is text in the translation too.
      assert.equal(await first.locator('.translate-text b').count(), 0, 'markup in a translation was drawn as markup');
      assert.ok((await tab.locator('.board-written').first().innerText()).includes('Synthetic swali'), 'the original went away');
      assert.deepEqual(sent, [{ path: '/api/translate', body: { text: `${TITLE}\n\n${BODY}` } }]);
      await first.getByRole('button', { name: AR.hide, exact: true }).click();
      assert.equal(await first.locator('.translate-text').count(), 0);
      await first.getByRole('button', { name: AR.button, exact: true }).click();
      await first.locator('.translate-text').waitFor();
      assert.equal(sent.length, 1, 'showing a translation again asked for it again');
      await shot(tab, 'translate-open-ar-390');
      // The day's limit, said in Arabic by the second button; the first stays as it was.
      state.refuse = 'too_many';
      const second = tab.locator('.translate').nth(1);
      await second.getByRole('button', { name: AR.button, exact: true }).click();
      await second.getByRole('alert').waitFor();
      assert.equal(await second.getByRole('alert').innerText(), AR.tooMany);
      assert.equal(await second.locator('.translate-text').count(), 0);
      assert.ok(await fits(tab));
      assert.deepEqual(errors, []); assert.deepEqual(direct, []);
      await context.close();
    }

    // Already in the reader's language: said, and no copy of the same text is drawn.
    {
      state = fresh(); state.detected = 'en';
      const { context, tab, errors } = await visit(`/discuss/students/${THREAD}`, 'en', 390);
      const first = tab.locator('.translate').first();
      await first.getByRole('button', { name: EN.button, exact: true }).click();
      await first.getByText(EN.same).waitFor();
      assert.equal(await first.locator('.translate-text').count(), 0);
      assert.deepEqual(errors, []);
      await context.close();
    }

    // Staff, in Arabic at 390: no reason is refused in Arabic with nothing sent; then translate the application and approve it.
    {
      state = fresh(); state.staff = true;
      const { context, tab, errors, sent, direct } = await visit('/admin/teachers', 'ar', 390);
      const card = tab.locator(`[data-tq-application="${APPLICATION}"]`);
      await card.getByRole('button', { name: AR.approve, exact: true }).click();
      assert.equal(await tab.locator('[data-tq-said="error"]').innerText(), AR.needReason);
      assert.deepEqual(sent, [], 'a decision with no reason was sent');
      await card.getByRole('button', { name: AR.button, exact: true }).click();
      await card.locator('.translate-text').waitFor();
      assert.ok((await card.locator('.translate-text').innerText()).startsWith('[ar] Synthetic tajwid for beginners\n\nSynthetic ijazah in Hafs'));
      await shot(tab, 'translate-teachers-open-ar-390');
      await card.locator('textarea').fill('Synthetic reason from a browser');
      await card.getByRole('button', { name: AR.approve, exact: true }).click();
      await tab.locator('[data-tq-said="done"]').waitFor();
      assert.equal(await tab.locator('[data-tq-said="done"]').innerText(), AR.approved);
      assert.deepEqual(sent.at(-1), { path: '/api/teaching/apply', body: { action: 'decide', applicationId: APPLICATION, approve: true, reason: 'Synthetic reason from a browser' } });
      assert.deepEqual(errors, []); assert.deepEqual(direct, []);
      await context.close();
    }
    console.log('Translate in a browser: a thread with a translation open and the staff page for teachers fit at 320, 390 and 1440 in English, Arabic and Tamil and ask neither the database nor the service anything from the browser; in Arabic at 390 a post was translated under its original with the line that a machine made it, hidden, and shown again with one request; the day’s limit was said in Arabic; text already in the reader’s language was said to be so; staff were refused a decision without a reason in Arabic, translated an application and approved it.');
  }
  console.log('Translate HTTP smoke passed. Not Google, not real Auth or RLS, not the limits inside spend_translation(); every post, name and application in it is invented.');
} catch (e) { console.error(seen.logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  // The process started here is not the one that compiles: that is its
  // child, and it may still be writing its cache when its parent has gone.
  // Wait for the whole group before stopping it hard, so that the script
  // after this one is not left the cache described at the top.
  for (let waited = 0; waited < 15000; waited += 200) {
    try { process.kill(-next.pid, 0); } catch { break; }
    await new Promise((r) => setTimeout(r, 200));
  }
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
