// Real Next /account/restore page and the /api/account/restore route against
// an entirely synthetic loopback Auth/REST API. This is not evidence about
// hosted Supabase, JWT validation, RLS, or what `restore_my_data()` writes:
// the stand-in writes nothing and hands back reports typed below. What the
// function does with a file is tested against a database in
// `supabase/tests/restore_my_data.test.mjs`.
//
// What it does show: the page a signed-in reader is sent, in English, in
// Arabic, in French by the reader's own choice, and in English for a language
// held for review; that opening the page asks the database nothing; the name
// and status the route gives each wrong file without asking the database, and
// each thing the database raises, with the database's sentence left behind;
// that the report the route sends names its reasons and carries none of the
// database's. In a browser: a wrong file is refused before anything is sent,
// a check is shown before the button that writes, a write that was not
// answered is said as unknown, and every line is in the reader's language.
// The expected sentences are typed here rather than imported, so this fails
// if a catalogue changes without anybody looking at the page.
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

// What `restore_my_data()` raises, word for word, with the state each is
// raised under. None of these sentences may reach a reader.
const RAISED = {
  signed_out: ['42501', 403, 'sign in to restore your data'],
  no_profile: ['42501', 403, 'there is no profile for this account to restore into'],
  not_object: ['22023', 400, 'that is not an export: the file should be one JSON object'],
  huge: ['22023', 400, 'that file is 9.1 MiB; an export is far smaller than 8'],
  no_version: ['22023', 400, 'that file has no formatVersion, so it is not an export from this platform'],
  bad_version: ['22023', 400, 'formatVersion 0 is not a version of this format'],
  newer: ['22023', 400, 'that export was written by a newer version of the platform (format 3) than this one reads; it is not a file this deployment can put back'],
  // The same two states with words nobody has seen before.
  strange_right: ['42501', 403, 'SYNTHETIC permission denied for table lesson_notes'],
  strange_value: ['22023', 400, 'SYNTHETIC value out of range'],
  // A state the function never raises.
  crash: ['XX000', 500, 'SYNTHETIC internal error'],
};
const DATABASE_WORDS = [
  'sign in to restore', 'no profile for this account', 'should be one JSON object', 'far smaller than', 'has no formatVersion',
  'is not a version of this format', 'written by a newer version', 'this deployment', 'SYNTHETIC', 'bad gateway',
  'cannot hold', 'set it again', 'is not a two-letter', 'any more', 'characters a note may hold', 'only the first', 'export again',
];

// What the function answers a file it read. Six entries stay in the file, each
// with the database's own English sentence; one names a lesson in Arabic.
const report = (applied) => ({
  applied,
  formatVersion: 2,
  account: {
    changed: ['displayName', 'timezone'],
    skipped: [
      { field: 'preferredLanguage', reason: 'the profile column cannot hold “xx-Probe”; set it again from /account' },
      { field: 'countryCode', reason: '“Uganda” is not a two-letter country code' },
    ],
  },
  notes: {
    restored: 1234,
    alreadyThere: 2,
    skipped: [
      { lesson: 'درس الوضوء', reason: 'you are not enrolled in a course with a lesson called “درس الوضوء” any more' },
      { lesson: 'Lesson two', reason: 'this note is longer than the 4000 characters a note may hold' },
      { lesson: '—', reason: 'this file holds 1500 notes and only the first 1000 are read — export again and restore the rest with a second file' },
      // What an insert trigger raised. Nobody has a name for it.
      { lesson: 'Lesson three', reason: 'SYNTHETIC trigger sentence' },
    ],
  },
  bookmarks: { restored: 3, alreadyThere: 1, skipped: [] },
  notRestored: [{ what: 'Enrolments', why: 'SYNTHETIC an enrolment is an entitlement' }],
});
const quiet = (applied, here) => ({
  applied, formatVersion: 2, account: { changed: [], skipped: [] },
  notes: { restored: 0, alreadyThere: here, skipped: [] }, bookmarks: { restored: 0, alreadyThere: 0, skipped: [] }, notRestored: [],
});

// A copy as the export page downloads it.
const FILE = JSON.stringify({
  formatVersion: 2, generatedAt: '2026-11-18T09:30:00Z',
  profile: { display_name: 'مريم الاختبار', preferred_language: 'xx-Probe', timezone: 'Africa/Kampala', country_code: 'Uganda' },
  notes: [{ lesson: 'درس الوضوء', body: 'ملاحظة أولى' }, { lesson: 'Lesson two', body: 'A second note' }],
  bookmarks: [{ lesson: 'Lesson two' }],
});

const state = { answer: 'ok' };
const calls = [];
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
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Synthetic learner', account_status: 'active', deleted_at: null, preferred_language: 'en', timezone: null }]);
  else if (path === '/rest/v1/rpc/restore_my_data') {
    const apply = sent?.p_apply === true;
    if (state.answer === 'ok') send(report(apply));
    // Says it did not write, whatever it was asked.
    else if (state.answer === 'liar') send(report(false));
    else if (state.answer === 'all_here') send(quiet(apply, 7));
    else if (state.answer === 'nothing') send(quiet(apply, 0));
    // Two hundred, and no report.
    else if (state.answer === 'empty') send(null);
    else if (state.answer === 'word') send('SYNTHETIC not a report');
    // A report that does not say whether it wrote.
    else if (state.answer === 'silent') send({ formatVersion: 2, notes: { restored: 4 } });
    // An error with no state at all: a gateway's page, not the database.
    else if (state.answer === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); res.end('<html>bad gateway SYNTHETIC</html>'); }
    else { const [code, status, message] = RAISED[state.answer]; send({ code, message, details: null, hint: null }, status); }
  } else if (path === '/rest/v1/learner_profiles') send([]);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
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
  const asked = () => calls.filter((c) => c.path === '/rest/v1/rpc/restore_my_data');

  {
    const anonymous = await request('/account/restore');
    assert.equal(anonymous.status, 307);
    const redirect = new URL(anonymous.headers.get('location'), origin);
    assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), '/account/restore');
  }

  const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  // The page itself: what is inside <main>, without the scripts Next adds.
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('&#x27;', '’').replaceAll('<!-- -->', '');
  const wrapper = (html, cls) => inner(html).match(new RegExp(`<div class="${cls}"([^>]*)>`))?.[1];
  const page = async (path, headers) => { const response = await request(path, { cookie, ...headers }); assert.equal(response.status, 200, `${path}\n${logs.slice(-2000)}`); return response.text(); };
  const ENGLISH_ONLY = ['Put your data back', 'What can come back', 'What cannot', 'Enrolments', 'Certificates', 'Orders, refunds', 'Your profile', 'The JSON file', 'Its name starts', 'Check this file', 'Choose another', 'Nothing is written', 'audit trail', 'Get a copy', 'Verify a certificate', 'Account settings', 'Restore'];

  // ------------------------------------------------------------------ English
  const english = await page('/account/restore', { 'accept-language': 'en' });
  for (const sentence of [
    'Put your data back',
    'If you downloaded a copy of your data and want it back, on this account after a break or on a new account, this page reads that file and puts back the part of it that you wrote.',
    'The JSON file the export page downloaded',
    'What can come back', 'Your profile', 'Your notes and bookmarks',
    'What cannot, and why', 'Enrolments', 'Certificates', 'Orders, refunds and progress', 'What you published, and what you were marked on',
    'Children, roles and permissions', 'Your activity history', 'Your sign-in address and password',
    'Nothing is written until you have seen what would be written. Putting a file back is recorded in the audit trail, with what it put back.',
    'Get a copy of your data',
  ]) assert.ok(inner(english).includes(sentence), `English restore page lost "${sentence}"`);
  assert.equal(wrapper(english, 'page narrow'), '', 'an English page marks its own restore page as a different language');
  // The one gap on the page before a file is chosen is filled: how the file's name begins.
  assert.ok(inner(english).includes('<code><bdi dir="ltr">ayahspring-</bdi></code>'), 'the page does not say how the file’s name begins');
  assert.equal(inner(english).includes('{'), false, 'a gap in an English sentence was left unfilled');
  assert.equal(/everything|restore all|all of your data/i.test(inner(english)), false, 'the restore page promises everything');
  // Before a file is chosen there is one control, and no button that sends or writes.
  assert.equal((inner(english).match(/<input /g) ?? []).length, 1);
  assert.match(inner(english), /<input [^>]*type="file"[^>]*>/);
  assert.equal(inner(english).includes('<button'), false, 'a button is offered before any file was chosen');
  assert.match(htmlRoot(english), /lang="en"/);
  assert.match(english, /<title>Put your data back/);

  // ------------------------------------------------------------------- Arabic
  const arabic = await page('/account/restore', { 'accept-language': 'ar' });
  const ar = inner(arabic);
  assert.match(htmlRoot(arabic), /lang="ar"/); assert.match(htmlRoot(arabic), /dir="rtl"/);
  assert.equal(wrapper(arabic, 'page narrow'), '', 'the Arabic restore page is Arabic and needs no wrapper');
  for (const sentence of [
    'أعِد بياناتك',
    'إذا نزّلت نسخة من بياناتك وتريد إعادتها، إلى هذا الحساب بعد انقطاع أو إلى حساب جديد، فهذه الصفحة تقرأ ذلك الملف وتعيد منه الجزء الذي كتبته أنت.',
    'ملف JSON الذي نزّلته صفحة التصدير',
    'ما الذي يمكن أن يعود', 'ملفك الشخصي', 'ملاحظاتك وإشاراتك المرجعية',
    'ما الذي لا يمكن، ولماذا', 'التسجيلات في الدورات', 'الشهادات', 'الطلبات والمبالغ المستردة والتقدّم', 'ما نشرته وما قُيّمت عليه',
    'الأطفال والأدوار والصلاحيات', 'سجل نشاطك', 'عنوان تسجيل الدخول وكلمة المرور',
    'لا يُكتب شيء حتى ترى ما الذي سيُكتب. وإعادة ملف تُسجَّل في سجل التدقيق مع ما أعادته.',
    'إعدادات الحساب', 'الاستعادة', 'احصل على نسخة من بياناتك', 'التحقق من شهادة',
    '<code><bdi dir="ltr">ayahspring-</bdi></code>',
  ]) assert.ok(ar.includes(sentence), `Arabic restore page lacks "${sentence}"`);
  for (const sentence of [...ENGLISH_ONLY, '{']) assert.ok(!ar.includes(sentence), `Arabic restore page still says "${sentence}"`);
  assert.match(arabic, /<title>أعِد بياناتك/);

  // ------------------------------------------- French, by the reader's choice
  const french = await page('/account/restore', { 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` });
  assert.match(htmlRoot(french), /lang="fr"/);
  for (const sentence of ['Remettre vos données', 'Ce qui ne le peut pas, et pourquoi', 'Restauration']) {
    assert.ok(inner(french).includes(sentence), `French restore page lacks "${sentence}"`);
  }

  // ------------------------------------------------------- held for review
  // Hausa has no restore page of its own: Hausa frame, English page, marked.
  const hausa = await page('/account/restore', { 'accept-language': 'ha' });
  assert.match(htmlRoot(hausa), /lang="ha"/);
  assert.equal(wrapper(hausa, 'page narrow'), ' lang="en" dir="ltr"');
  for (const sentence of ['Put your data back', 'What cannot, and why', 'The JSON file the export page downloaded']) assert.ok(inner(hausa).includes(sentence), `Hausa reader's restore page lacks English "${sentence}"`);
  // Pashto is right-to-left with the same hold: the English must not inherit it.
  const pashto = await page('/account/restore', { 'accept-language': 'ps' });
  assert.match(htmlRoot(pashto), /dir="rtl"/);
  assert.equal(wrapper(pashto, 'page narrow'), ' lang="en" dir="ltr"');

  // Five readers have opened the page. The function was not asked once.
  assert.equal(asked().length, 0, 'opening the restore page asked the database something');
  console.log('Restore page: signed out is sent to sign in; English, Arabic, French by choice; Hausa and Pashto readers get it in English, marked; two things that come back and seven that never do; one file control and no button before a file is chosen; opening the page asked the database nothing.');

  // ================================================================= the route
  const post = async (body, { query = '', headers = { cookie } } = {}) => {
    const response = await fetch(`${origin}/api/account/restore${query}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body, redirect: 'manual', signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    for (const words of DATABASE_WORDS) assert.equal(text.includes(words), false, `the route forwarded "${words}"`);
    assert.equal(response.headers.get('cache-control'), 'no-store', `${response.status}: the answer may be kept by a cache`);
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: response.status, text, json };
  };
  const refusal = (answer, status, code) => {
    assert.equal(answer.status, status, code); assert.equal(answer.json.ok, false); assert.equal(answer.json.code, code);
    assert.equal(answer.json.report, undefined, `${code}: a refusal carries a report`);
  };

  // Nobody, and the wrong file: answered here, and the database is not asked.
  refusal(await post(FILE, { headers: {} }), 401, 'signed_out');
  refusal(await post(''), 400, 'not_json');
  refusal(await post('   \n'), 400, 'not_json');
  refusal(await post('name,body\nLesson one,A note'), 400, 'not_json');
  refusal(await post('{"formatVersion": 2,'), 400, 'not_json');
  refusal(await post('[1, 2]'), 400, 'not_export');
  refusal(await post('"a word"'), 400, 'not_export');
  refusal(await post('{"notes": []}'), 400, 'not_export');
  refusal(await post('{"formatVersion": "2"}'), 400, 'not_export');
  refusal(await post('{"formatVersion": 0}'), 400, 'not_export');
  refusal(await post('{"formatVersion": 3}'), 409, 'newer');
  // One byte over the ceiling the database applies.
  refusal(await post(`{"formatVersion": 2, "pad": "${'a'.repeat(8 * 1024 * 1024)}"}`), 413, 'too_large');
  assert.equal(asked().length, 0, 'the database was asked about a file the route had already refused');
  {
    const response = await request('/api/account/restore', { cookie });
    assert.equal(response.status, 405, 'the route answers a GET');
  }

  // What the database raises, each under the name and status it always has.
  for (const [answer, status, code] of [
    ['signed_out', 401, 'signed_out'], ['no_profile', 409, 'refused'], ['not_object', 400, 'not_export'], ['huge', 413, 'too_large'],
    ['no_version', 400, 'not_export'], ['bad_version', 400, 'not_export'], ['newer', 409, 'newer'],
    ['strange_right', 409, 'refused'], ['strange_value', 409, 'refused'],
    ['crash', 502, 'failed'], ['gateway', 502, 'failed'], ['empty', 502, 'failed'], ['word', 502, 'failed'], ['silent', 502, 'failed'],
  ]) {
    state.answer = answer;
    refusal(await post(FILE), status, code);
    refusal(await post(FILE, { query: '?apply=1' }), status, code);
  }

  // A report: a check unless the address says `apply=1`, and nothing else says it.
  state.answer = 'ok';
  {
    let before = asked().length;
    const check = await post(FILE);
    assert.equal(check.status, 200); assert.equal(check.json.ok, true);
    assert.equal(asked().length, before + 1);
    assert.equal(asked().at(-1).sent.p_apply, false, 'a request that did not ask to write was sent on as a write');
    assert.equal(asked().at(-1).sent.p_document.profile.display_name, 'مريم الاختبار', 'the database was not handed the file');
    for (const query of ['?apply=0', '?apply=true', '?apply=yes', '?apply=']) {
      assert.equal((await post(FILE, { query })).json.report.applied, false, query);
      assert.equal(asked().at(-1).sent.p_apply, false, `${query} was sent on as a write`);
    }
    // The file cannot ask for itself.
    const sly = await post(JSON.stringify({ ...JSON.parse(FILE), apply: true, p_apply: true }));
    assert.equal(sly.json.report.applied, false);
    assert.equal(asked().at(-1).sent.p_apply, false, 'a file turned its own check into a write');

    const r = check.json.report;
    assert.equal(r.applied, false); assert.equal(r.formatVersion, 2);
    assert.deepEqual(r.account.changed, ['displayName', 'timezone']);
    assert.deepEqual(r.account.skipped, [
      { why: 'language', value: 'xx-Probe', field: 'preferredLanguage' },
      { why: 'country', value: 'Uganda', field: 'countryCode' },
    ]);
    assert.equal(r.notes.restored, 1234); assert.equal(r.notes.alreadyThere, 2);
    assert.deepEqual(r.notes.skipped, [
      { why: 'not_enrolled', lesson: 'درس الوضوء' },
      { why: 'note_long', count: 4000, lesson: 'Lesson two' },
      { why: 'capped', held: 1500, read: 1000 },
      { why: 'other', lesson: 'Lesson three' },
    ]);
    assert.deepEqual(r.bookmarks, { restored: 3, alreadyThere: 1, skipped: [] });
    // The database's list of what it never puts back, and its reasons, stay behind.
    assert.equal(check.text.includes('notRestored'), false, 'the route sent the database’s English list of what is never restored');
    assert.equal(check.text.includes('"reason"'), false, 'the route sent a reason in the database’s words');

    before = asked().length;
    const applied = await post(FILE, { query: '?apply=1' });
    assert.equal(applied.status, 200);
    assert.equal(asked().length, before + 1);
    assert.equal(asked().at(-1).sent.p_apply, true);
    assert.equal(applied.json.report.applied, true);
  }
  console.log('Restore route: signed out 401; an empty file, a spreadsheet and a cut-off file 400 "not_json"; a list, a word and a file with no usable version 400 "not_export"; a newer version 409; one byte over 8 MiB 413; none of them asked the database. The seven things the database raises each under their own name; unknown words under the two known states 409 "refused"; any other state, a gateway page, an empty answer, a bare word and a report that does not say whether it wrote 502 "failed". A report names its reasons and carries none of the database’s sentences nor its list; only apply=1 in the address writes. Every answer no-store. The stand-in writes nothing.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (path, code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', acceptDownloads: true });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      // Name what sticks out, so the failure says where to look.
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 40)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
      assert.equal(spill, 0, `${label}: a card's contents are wider than the card`);
    };

    state.answer = 'ok';
    for (const [code, heading] of [['en', 'Put your data back'], ['ar', 'أعِد بياناتك'], ['ta', 'உங்கள் தரவை மீண்டும் வையுங்கள்']]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await open('/account/restore', code, width);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        await fits(tab, width, `restore ${code} ${width}`);
        // Each name sits above its note rather than beside it in a squeezed column.
        const rows = await tab.locator('ul.lessons.stacked li').evaluateAll((els) => els.map((el) => { const name = el.querySelector('strong').getBoundingClientRect(); const note = el.querySelector('span').getBoundingClientRect(); return note.top >= name.bottom - 1; }));
        assert.equal(rows.length, 9, `${code} ${width}: two things that come back and seven that do not`);
        assert.ok(rows.every(Boolean), `${code} ${width}: a note sits beside its name`);
        assert.equal(await tab.locator('main button').count(), 0, `${code} ${width}: a button before a file`);
        assert.deepEqual(errors, [], `${code} ${width}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && [390, 1440].includes(width)) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/restore-${code}-${width}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic restore page in ${code}: fits at 320, 390 and 1440px; nine names, each above its note; no button before a file`);
    }

    // The form, in Arabic.
    {
      const { context, tab, errors } = await open('/account/restore', 'ar', 390);
      const posts = []; tab.on('request', (r) => { if (r.url().includes('/api/account/restore')) posts.push(r.url()); });
      const main = tab.locator('main');
      const alerts = main.getByRole('alert');
      const file = tab.getByLabel('ملف JSON الذي نزّلته صفحة التصدير', { exact: true });
      const check = tab.getByRole('button', { name: 'افحص هذا الملف', exact: true });
      const another = tab.getByRole('button', { name: 'اختر ملفًا آخر', exact: true });
      const write = tab.getByRole('button', { name: 'أعِد ما يمكن إعادته', exact: true });
      const result = main.getByRole('status');
      const choose = (name, text, mimeType = 'application/json') => file.setInputFiles({ name, mimeType, buffer: Buffer.from(text, 'utf8') });
      const arabicOnly = async (label) => {
        const text = await main.textContent();
        for (const words of [...DATABASE_WORDS, ...ENGLISH_ONLY, 'could not be', 'Nothing was changed', '"ok"', '"code"', '{', 'not_enrolled', 'undefined']) assert.equal(text.includes(words), false, `${label}: said in English, in the database's words, or with a hole: ${words}`);
      };
      const said = async (sentence, label) => {
        await alerts.filter({ hasText: sentence }).waitFor();
        assert.equal(await alerts.count(), 1, `${label}: more than one thing is announced`);
        assert.equal((await alerts.textContent()).trim(), sentence, label);
        await arabicOnly(label);
      };
      assert.equal(await file.count(), 1, 'the file control has no label');

      // The wrong file: said at once, the file let go of, and nothing sent.
      const wrong = async (name, text, type, sentence) => {
        await choose(name, text, type);
        await said(sentence, name);
        assert.equal(await file.inputValue(), '', `${name}: the refused file is still chosen`);
        assert.equal(await main.locator('button').count(), 0, `${name}: a button is offered for a refused file`);
      };
      await wrong('ayahspring-my-data-2026-11-18.csv', 'name,body\nLesson one,A note', 'text/csv', 'هذا الملف فارغ أو ليس JSON. اختر ملف JSON الذي نزّلته صفحة التصدير؛ فجدول البيانات والنسخة القابلة للطباعة لا يمكن إعادتهما.');
      await wrong('empty.json', '', 'application/json', 'هذا الملف فارغ أو ليس JSON. اختر ملف JSON الذي نزّلته صفحة التصدير؛ فجدول البيانات والنسخة القابلة للطباعة لا يمكن إعادتهما.');
      await wrong('list.json', '[1, 2]', 'application/json', 'هذا الملف يحتوي على JSON، لكنه ليس نسخة من بياناتك أنشأتها هذه المنصة.');
      await wrong('later.json', '{"formatVersion": 9}', 'application/json', 'هذه النسخة أنشأها إصدار من المنصة أحدث مما يقرؤه هذا الإصدار، فلا يمكن إعادتها هنا.');
      assert.deepEqual(posts, [], 'a refused file was sent');
      await fits(tab, 390, 'restore ar 390 with a refused file');

      // A copy: the refusal goes, two buttons come, and still nothing is sent.
      const pick = async () => {
        await choose('ayahspring-my-data-2026-11-18.json', FILE);
        await check.waitFor();
        assert.equal(await alerts.count(), 0, 'a refusal is still shown beside a file that can be checked');
        assert.equal(await another.count(), 1);
        assert.equal(await write.count(), 0, 'the button that writes is offered before a check');
      };
      await pick();
      assert.deepEqual(posts, [], 'choosing a file sent it');

      // A check that got no answer: a failure, nothing changed, the file kept.
      let before = asked().length;
      state.answer = 'gateway'; await check.click();
      await said('تعذّر فحص الملف، ولم يتغيّر شيء. تحقّق من اتصالك وحاول مرة أخرى.', 'gateway');
      assert.equal(asked().at(-1).sent.p_apply, false);
      assert.equal(await check.count(), 1, 'the file was let go of after a check that only failed');
      state.answer = 'signed_out'; await check.click();
      await said('لقد سُجّل خروجك. سجّل الدخول من جديد ثم اختر الملف مرة أخرى. لم يتغيّر شيء.', 'signed_out');
      state.answer = 'no_profile'; await check.click();
      await said('رفضت المنصة هذا الملف. لم يتغيّر شيء.', 'no_profile');
      state.answer = 'strange_value'; await check.click();
      await said('رفضت المنصة هذا الملف. لم يتغيّر شيء.', 'strange_value');
      assert.equal(await check.count(), 1);
      // A refusal about the file itself, from the database this time: the file goes.
      state.answer = 'newer'; await check.click();
      await said('هذه النسخة أنشأها إصدار من المنصة أحدث مما يقرؤه هذا الإصدار، فلا يمكن إعادتها هنا.', 'newer');
      assert.equal(await main.locator('button').count(), 0);
      assert.equal(await file.inputValue(), '');
      assert.equal(asked().length, before + 5);
      assert.ok(posts.every((address) => address.endsWith('?apply=0')), 'a check was sent as a write');

      // The check: what would be written, what would not and why, and then the button.
      await pick();
      state.answer = 'ok'; await check.click();
      await result.getByRole('heading', { name: 'ما الذي سيعيده هذا الملف', exact: true, level: 2 }).waitFor();
      assert.equal(asked().at(-1).sent.p_apply, false);
      assert.equal(await alerts.count(), 0);
      const lines = async () => (await result.locator('li').allTextContents()).map((line) => line.replace(/[\u2068\u2069]/g, '').trim());
      assert.deepEqual(await lines(), [
        'الملاحظات: 1,234',
        'الإشارات المرجعية: 3',
        'تفاصيل الملف الشخصي: الاسم المعروض والمنطقة الزمنية',
        'موجود هنا من قبل وتُرك كما هو: 3',
      ]);
      const left = main.locator('section.card');
      assert.equal(await left.getByRole('heading', { name: 'ما تُرك في الملف، ولماذا', exact: true, level: 3 }).count(), 1);
      const skipped = await left.locator('ul.lessons.stacked').nth(1).locator('li').evaluateAll((els) => els.map((el) => [el.querySelector('strong').textContent.trim(), el.querySelector('span').textContent.trim()]));
      assert.deepEqual(skipped, [
        ['رمز اللغة المفضّلة', 'اللغة في الملف ليست مكتوبة بصيغة يستطيع الملف الشخصي حفظها. في الملف: xx-Probe'],
        ['البلد', 'البلد في الملف ليس رمز بلد من حرفين. في الملف: Uganda'],
        ['درس الوضوء', 'لست مسجّلًا الآن في دورة فيها درس بهذا الاسم.'],
        ['Lesson two', 'هذه الملاحظة طويلة جدًا. أقصى عدد من الأحرف يمكن أن يكون للملاحظة: 4,000'],
        ['مُدخل محفوظ', 'هذه القائمة أطول مما يُقرأ في المرة الواحدة، فلا يُقرأ إلا أولها. المُدخلات المقروءة: 1,000. المُدخلات في الملف: 1,500'],
        ['Lesson three', 'تعذّرت إعادة هذا المُدخل.'],
      ]);
      // What the file said is set apart from the sentence around it: three lesson names and two values.
      assert.equal(await left.locator('ul.lessons.stacked').nth(1).locator('bdi').count(), 5);
      assert.ok((await left.textContent()).includes('لم يُكتب شيء بعد. فحص الملف لا يغيّر شيئًا.'));
      assert.equal(await write.count(), 1, 'the button that writes is not offered after a check that found something');
      await arabicOnly('the check');
      await fits(tab, 390, 'restore ar 390 with a check');
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/restore-ar-check.png`, fullPage: true });

      // The write that was not answered: unknown, the result taken away, the file kept.
      const UNKNOWN = 'لم نتمكن من التأكد مما إذا كان الملف قد أُعيد. افحص الملف مرة أخرى: المُدخل الموجود هنا من قبل يُتخطّى، فلا يُكتب شيء مرتين.';
      state.answer = 'gateway'; await write.click();
      await said(UNKNOWN, 'a write with no answer');
      assert.equal(asked().at(-1).sent.p_apply, true);
      assert.equal(posts.at(-1).endsWith('?apply=1'), true);
      assert.equal(await result.count(), 0, 'a result is still shown after a write nobody answered');
      assert.equal(await check.count(), 1, 'the file cannot be checked again');
      assert.equal(await write.count(), 0);
      // The write answered by a report that says it did not write: not believed either way.
      state.answer = 'ok'; await check.click(); await write.waitFor();
      state.answer = 'liar'; await write.click();
      await said(UNKNOWN, 'a write answered as a check');
      // The connection goes in the middle.
      state.answer = 'ok'; await check.click(); await write.waitFor();
      await context.setOffline(true); await write.click();
      await said(UNKNOWN, 'a write with no connection');
      await check.click();
      await said('تعذّر فحص الملف، ولم يتغيّر شيء. تحقّق من اتصالك وحاول مرة أخرى.', 'a check with no connection');
      await context.setOffline(false);

      // The write.
      state.answer = 'ok'; await check.click(); await write.waitFor();
      before = asked().length;
      await write.click();
      await result.getByRole('heading', { name: 'ما الذي أعاده هذا الملف', exact: true, level: 2 }).waitFor();
      assert.equal(asked().length, before + 1, 'one press wrote more than once');
      assert.equal(asked().at(-1).sent.p_apply, true);
      assert.equal(asked().at(-1).sent.p_document.profile.display_name, 'مريم الاختبار');
      assert.equal((await lines()).length, 4);
      assert.equal(await write.count(), 0, 'the button that writes is offered again after it wrote');
      assert.equal(await alerts.count(), 0);
      assert.ok((await left.textContent()).includes('ملفك لم يتغيّر، فيمكن استخدامه مرة أخرى: المُدخل الموجود هنا من قبل يُتخطّى ولا يُكتب مرتين. وما لا يعيده أي ملف أبدًا مذكور في أسفل هذه الصفحة.'));
      await arabicOnly('the write');
      await fits(tab, 390, 'restore ar 390 after the write');
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/restore-ar-applied.png`, fullPage: true });
      // Start again: the page is as it was.
      await tab.getByRole('button', { name: 'أعِد ملفًا مختلفًا', exact: true }).click();
      assert.equal(await result.count(), 0); assert.equal(await main.locator('button').count(), 0); assert.equal(await file.inputValue(), '');

      // Nothing to do, said as one of two things, and no button that writes for either.
      await pick();
      state.answer = 'all_here'; await check.click();
      await result.getByRole('heading', { name: 'ما يستطيع هذا الملف إعادته موجود هنا من قبل.', exact: true, level: 2 }).waitFor();
      assert.equal(await write.count(), 0, 'a button that writes is offered when everything is already here');
      assert.equal(await result.locator('li').count(), 0);
      await another.click();
      await pick();
      state.answer = 'nothing'; await check.click();
      await result.getByRole('heading', { name: 'لا شيء في هذا الملف يمكن إعادته في الوضع الحالي.', exact: true, level: 2 }).waitFor();
      assert.equal(await write.count(), 0, 'a button that writes is offered when there is nothing to write');
      await arabicOnly('nothing to do');

      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic restore form in Arabic: a spreadsheet, an empty file, a list and a newer copy each refused in Arabic with nothing sent and the file let go of; a failed check, a signed-out answer and two refusals said with the file kept, and the database’s "newer" with the file let go of; a check shows four lines and six entries left in the file, each with its place and its reason in Arabic, before the button that writes; a write answered by a gateway page, by a report that says it did not write, and by no connection is each said as unknown with the result taken away; the write is one request; everything already here and nothing to put back offer no button that writes.');
    }

    // Persian writes the counts in its own digits; a wide screen holds the result.
    {
      state.answer = 'ok';
      const { context, tab, errors } = await open('/account/restore', 'fa', 1440);
      await tab.locator('#restore-file').setInputFiles({ name: 'ayahspring-my-data-2026-11-18.json', mimeType: 'application/json', buffer: Buffer.from(FILE, 'utf8') });
      await tab.locator('main .page-actions button').first().click();
      const result = tab.locator('main').getByRole('status');
      await result.locator('li').first().waitFor();
      const lines = (await result.locator('li').allTextContents()).map((line) => line.replace(/[\u2068\u2069]/g, '').trim());
      assert.equal(lines[0], 'یادداشت‌ها: ۱٬۲۳۴', 'the Persian result writes a count in Latin digits');
      const text = await tab.locator('main section.card').textContent();
      assert.ok(text.includes('۴٬۰۰۰') && text.includes('۱٬۵۰۰'), 'a limit in a Persian reason is in Latin digits');
      await fits(tab, 1440, 'restore fa 1440 with a check');
      assert.deepEqual(errors, []);
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/restore-fa-check-1440.png`, fullPage: true });
      await context.close();
      console.log('Synthetic restore check in Persian at 1440px: counts and limits in Persian digits');
    }
  }
  console.log('Restore HTTP smoke passed. Not real Auth, RLS or a real restore: the stand-in writes nothing.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
