// Real Next /account/export and /account/export/print pages and the
// /api/account/export route against an entirely synthetic loopback Auth/REST
// API. This is not evidence about hosted Supabase, JWT validation, RLS, the
// hourly limit or what `export_my_data()` puts in a copy: the stand-in hands
// back a document typed below and counts nothing.
//
// What it does show: the page a signed-in reader is sent, in English, in
// Arabic, in French by the reader's own choice, and in English for a language
// held for review; that opening the export page makes no copy; that the page
// that prints one says a refusal in place of the tables; and the name and
// status the route gives each thing the database raises, with the database's
// sentence left behind. In a browser: the eleventh press is answered under
// the button instead of replacing the page, a copy is saved as a file, and
// the print stylesheet hides everything but the record. The expected
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

// What `export_my_data()` and its wrapper raise, word for word, all under
// `insufficient_privilege`. None of these sentences may reach a reader.
const RAISED = {
  limit: 'ten exports in the last hour is the limit; wait a little and try again',
  signed_out: 'sign in to download your data',
  // A session with no profile row. It has no sentence of its own.
  no_profile: 'support:account_closed_or_missing',
};
const DATABASE_WORDS = ['ten exports', 'wait a little and try again', 'sign in to download', 'account_closed_or_missing', 'SYNTHETIC', 'bad gateway'];

// The shape of a copy. One name is Arabic, so a cell has to read its own way.
const copy = (cut = []) => ({
  formatVersion: 2,
  generatedAt: '2026-11-18T09:30:00Z',
  meta: { rowLimit: 1000, counts: { learners: 1, notes: 2 }, truncated: cut, note: cut.length ? 'Shortened.' : 'Whole.' },
  profile: { display_name: 'مريم الاختبار', preferred_language: 'ar', account_status: 'active' },
  learners: [{ id: 'aaaa1111', display_name: 'Synthetic learner', created_at: '2026-01-02T00:00:00Z' }],
  notes: [
    { lesson: 'Lesson one', body: 'ملاحظة أولى', written_at: '2026-03-01T10:00:00Z' },
    { lesson: 'Lesson two', body: 'A second note', written_at: '2026-03-02T10:00:00Z' },
  ],
  orders: [],
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
  calls.push({ method: req.method, path });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Synthetic learner', account_status: 'active', deleted_at: null, preferred_language: 'en', timezone: null }]);
  else if (path === '/rest/v1/rpc/export_my_data') {
    if (state.answer === 'ok') send(copy());
    else if (state.answer === 'cut') send(copy(['notes', 'activity']));
    else if (state.answer === 'bare') send({ orders: [], notes: [] });
    // Two hundred, and no document.
    else if (state.answer === 'empty') send(null);
    else if (state.answer === 'word') send('SYNTHETIC not a document');
    // An error with no state at all: a gateway's page, not the database.
    else if (state.answer === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); res.end('<html>bad gateway SYNTHETIC</html>'); }
    else send({ code: '42501', message: RAISED[state.answer], details: null, hint: null }, 403);
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
  const copies = () => calls.filter((c) => c.path === '/rest/v1/rpc/export_my_data').length;

  for (const path of ['/account/export', '/account/export/print']) {
    const anonymous = await request(path);
    assert.equal(anonymous.status, 307, path);
    const redirect = new URL(anonymous.headers.get('location'), origin);
    assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), path);
  }
  assert.equal(copies(), 0, 'a copy was asked for on behalf of nobody');

  const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  // The page itself: what is inside <main>, without the scripts Next adds.
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('&#x27;', '’').replaceAll('<!-- -->', '');
  const wrapper = (html, cls) => inner(html).match(new RegExp(`<div class="${cls}"([^>]*)>`))?.[1];
  const page = async (path, headers) => { const response = await request(path, { cookie, ...headers }); assert.equal(response.status, 200, `${path}\n${logs.slice(-2000)}`); return response.text(); };
  const ENGLISH_ONLY = ['Get a copy', 'Download the copy', 'Read it here', 'What is in it', 'What is not in it', 'Credential tokens', 'Account settings', 'Ten copies', 'could not be made', 'To print', 'A copy of your data', 'Print this page', 'Made:', 'were cut', 'Back to the export', 'Download as', 'Opening this page', 'Put it back', 'Close this account', 'stored under'];

  // ============================================================ the export page
  // ------------------------------------------------------------------ English
  const english = await page('/account/export', { 'accept-language': 'en' });
  for (const sentence of [
    'Get a copy of your data', 'Download the copy (JSON)', 'Download the copy (spreadsheet)', 'Read it here, or save it as a PDF',
    'A list longer than 1,000 rows is cut at that number, and the copy names every list that was cut.',
    'You can make ten copies an hour',
    'What is in it', 'What is not in it, and why', 'Credential tokens',
    'Opening the page counts as one of your ten copies.',
    'Put it back', 'Close this account',
  ]) assert.ok(inner(english).includes(sentence), `English export page lost "${sentence}"`);
  assert.equal(wrapper(english, 'page narrow'), '', 'an English page marks its own export page as a different language');
  assert.equal(inner(english).includes('{'), false, 'a gap in an English sentence was left unfilled');
  assert.equal(/everything/i.test(inner(english)), false, 'the export page promises everything');
  // With no script the two downloads are still links to the file.
  assert.match(inner(english), /<a class="btn" href="\/api\/account\/export" download="">Download the copy \(JSON\)<\/a>/);
  assert.match(inner(english), /<a class="btn secondary" href="\/api\/account\/export\?format=csv" download="">Download the copy \(spreadsheet\)<\/a>/);
  assert.match(htmlRoot(english), /lang="en"/);
  assert.match(english, /<title>Get a copy of your data/);

  // ------------------------------------------------------------------- Arabic
  const arabic = await page('/account/export', { 'accept-language': 'ar' });
  const ar = inner(arabic);
  assert.match(htmlRoot(arabic), /lang="ar"/); assert.match(htmlRoot(arabic), /dir="rtl"/);
  assert.equal(wrapper(arabic, 'page narrow'), '', 'the Arabic export page is Arabic and needs no wrapper');
  for (const sentence of [
    'احصل على نسخة من بياناتك', 'تنزيل النسخة (JSON)', 'تنزيل النسخة (جدول بيانات)', 'اقرأها هنا أو احفظها بصيغة PDF',
    'القائمة التي يزيد طولها على 1,000 صف تُقطع عند هذا العدد، وتذكر النسخة كل قائمة قُطعت.',
    'ما الذي فيها', 'ما ليس فيها، ولماذا', 'رموز الاعتماد',
    'أسماء الأقسام والحقول داخل النسخة بالإنجليزية، لأنها الأسماء التي تُخزَّن بها السجلات.',
    'إعدادات الحساب', 'التصدير', 'أعِده', 'إغلاق هذا الحساب',
  ]) assert.ok(ar.includes(sentence), `Arabic export page lacks "${sentence}"`);
  for (const sentence of [...ENGLISH_ONLY, '{']) assert.ok(!ar.includes(sentence), `Arabic export page still says "${sentence}"`);
  assert.match(arabic, /<title>احصل على نسخة من بياناتك/);

  // Persian writes the limit in its own digits.
  const persian = inner(await page('/account/export', { 'accept-language': 'fa' }));
  assert.ok(persian.includes('فهرستی که از ۱٬۰۰۰ ردیف بلندتر باشد'), 'the Persian page writes the limit in Latin digits');

  // ------------------------------------------- French, by the reader's choice
  const french = await page('/account/export', { 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` });
  assert.match(htmlRoot(french), /lang="fr"/);
  for (const sentence of ['Obtenir une copie de vos données', 'Télécharger la copie (JSON)', 'Ce qu’elle ne contient pas, et pourquoi', 'Exportation']) {
    assert.ok(inner(french).includes(sentence), `French export page lacks "${sentence}"`);
  }

  // ------------------------------------------------------- held for review
  // Hausa has no export page of its own: Hausa frame, English page, marked.
  const hausa = await page('/account/export', { 'accept-language': 'ha' });
  assert.match(htmlRoot(hausa), /lang="ha"/);
  assert.equal(wrapper(hausa, 'page narrow'), ' lang="en" dir="ltr"');
  for (const sentence of ['Get a copy of your data', 'What is in it', 'Download the copy (JSON)']) assert.ok(inner(hausa).includes(sentence), `Hausa reader's export page lacks English "${sentence}"`);
  // Pashto is right-to-left with the same hold: the English must not inherit it.
  const pashto = await page('/account/export', { 'accept-language': 'ps' });
  assert.match(htmlRoot(pashto), /dir="rtl"/);
  assert.equal(wrapper(pashto, 'page narrow'), ' lang="en" dir="ltr"');

  // Six readers have opened the page that explains a copy. None was made.
  assert.equal(copies(), 0, 'opening the export page made a copy');
  console.log('Export page: signed out is sent to sign in; English, Arabic, Persian (limit in its own digits), French by choice; Hausa and Pashto readers get it in English, marked; both downloads are plain links without script; opening the page asked for no copy.');

  // ========================================================= the page to print
  const PRINT = 'page narrow export-print-page';
  state.answer = 'ok';
  let before = copies();
  const printed = await page('/account/export/print', { 'accept-language': 'en' });
  assert.equal(copies(), before + 1, 'the page that prints a copy did not ask for exactly one');
  {
    const en = inner(printed);
    for (const sentence of [
      'A copy of your data', 'Made: <bdi>Nov 18, 2026, 9:30 AM UTC</bdi>',
      'Opening this page made a copy: it counts as one of the ten an hour and is recorded like a download. Reloading the page makes another.',
      'Download as a spreadsheet', 'Download as JSON', 'Back to the export page',
      '<h2 style="margin-top:0"><bdi>profile</bdi></h2>', '<bdi>learners</bdi>', '<bdi>notes</bdi>',
      '<bdi>display_name</bdi>', '<bdi>مريم الاختبار</bdi>', '<bdi>ملاحظة أولى</bdi>', '<bdi>A second note</bdi>',
    ]) assert.ok(en.includes(sentence), `English print page lost "${sentence}"`);
    assert.equal(wrapper(printed, PRINT), '');
    // An English page has nothing to mark as English, and says nothing about it.
    assert.equal(en.includes('lang="en"'), false);
    assert.equal(en.includes('stored under'), false, 'an English page explains that the names are English');
    assert.equal(en.includes('were cut'), false, 'a whole copy is said to have been cut');
    // An empty list is not printed as an empty table.
    assert.equal(en.includes('<bdi>orders</bdi>'), false, 'an empty section is printed');
    // A cell may hold a brace of its own (a nested value is printed as it is
    // stored); a gap in a sentence may not be left unfilled.
    assert.equal(/\{(?:when|lists|count)\}/.test(en), false);
  }

  // Arabic, with two lists cut at the limit.
  state.answer = 'cut';
  {
    const html = await page('/account/export/print', { 'accept-language': 'ar' });
    const text = inner(html);
    assert.match(htmlRoot(html), /dir="rtl"/);
    assert.equal(wrapper(html, PRINT), '');
    for (const sentence of [
      'نسخة من بياناتك', 'أُعدّت في: <bdi>18 نوفمبر 2026، 9:30 ص UTC</bdi>',
      'هذه القوائم تجاوزت الحد فقُطعت: <bdi lang="en">notes, activity</bdi>',
      'أسماء الأقسام والحقول داخل النسخة بالإنجليزية، لأنها الأسماء التي تُخزَّن بها السجلات.',
      '<bdi lang="en">profile</bdi>', '<bdi lang="en">display_name</bdi>', '<bdi>مريم الاختبار</bdi>',
      'تنزيل كجدول بيانات', 'العودة إلى صفحة التصدير', 'للطباعة',
      'هذا هو السجل نفسه الذي يحتويه التنزيلان.',
    ]) assert.ok(text.includes(sentence), `Arabic print page lacks "${sentence}"`);
    for (const sentence of [...ENGLISH_ONLY, '{when}', '{lists}']) assert.ok(!text.includes(sentence), `Arabic print page still says "${sentence}"`);
    assert.match(html, /<title>نسخة من بياناتك/);
  }

  // A copy with nothing in it.
  state.answer = 'bare';
  {
    const text = inner(await page('/account/export/print', { 'accept-language': 'ar' }));
    assert.ok(text.includes('لا يوجد شيء مسجَّل على هذا الحساب بعد.'));
    assert.equal(text.includes('<table'), false);
    // Nothing English is printed, so nothing is said about English names.
    assert.equal(text.includes('بالإنجليزية'), false);
  }

  // A refusal is said in place of the tables, and the page is still a page.
  const refusedPage = async (answer, language) => {
    state.answer = answer;
    const response = await request('/account/export/print', { cookie, 'accept-language': language });
    assert.equal(response.status, 200, `${answer}: the print page fell over (${response.status})`);
    const text = inner(await response.text());
    for (const words of DATABASE_WORDS) assert.equal(text.includes(words), false, `${answer}: the print page says "${words}"`);
    assert.equal(text.includes('<table'), false, `${answer}: tables are drawn beside a refusal`);
    assert.equal((text.match(/role="alert"/g) ?? []).length, 1, `${answer}: one thing is announced`);
    return text;
  };
  {
    const text = await refusedPage('limit', 'ar');
    assert.ok(text.includes('<p class="notice error" role="alert">أُعدّت عشر نسخ خلال الساعة الأخيرة، وهذا هو الحد. انتظر قليلًا ثم اطلب من جديد.</p>'));
    // Nothing describes a record that is not there, and no button offers the eleventh again.
    for (const absent of ['هذا هو السجل نفسه', 'فتح هذه الصفحة أعدّ نسخة', 'اطبع هذه الصفحة', 'تنزيل كجدول بيانات', 'أُعدّت في:']) assert.equal(text.includes(absent), false, `limit: the page still says "${absent}"`);
    assert.ok(text.includes('العودة إلى صفحة التصدير'), 'a refused reader has no way back');
    for (const sentence of ENGLISH_ONLY) assert.equal(text.includes(sentence), false, `limit: the Arabic page says "${sentence}"`);
    const en = await refusedPage('limit', 'en');
    assert.ok(en.includes('<p class="notice error" role="alert">Ten copies have been made in the last hour, which is the limit. Wait a little, then ask again.</p>'));
  }
  for (const answer of ['gateway', 'empty', 'word', 'no_profile']) {
    const text = await refusedPage(answer, 'ar');
    assert.ok(text.includes('<p class="notice error" role="alert">تعذّر إعداد النسخة الآن. اطلب من جديد بعد قليل.</p>'), `${answer}: not said as a failure`);
  }
  // The database says nobody is signed in: sign in, and come back here.
  state.answer = 'signed_out';
  {
    const response = await request('/account/export/print', { cookie });
    assert.equal(response.status, 307);
    const redirect = new URL(response.headers.get('location'), origin);
    assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), '/account/export/print');
  }
  // Held for review: the whole page in English, marked, with nothing inside marked again.
  state.answer = 'ok';
  {
    const html = await page('/account/export/print', { 'accept-language': 'ha' });
    assert.equal(wrapper(html, PRINT), ' lang="en" dir="ltr"');
    assert.ok(inner(html).includes('<bdi>profile</bdi>'));
  }
  console.log('Print page: one copy asked for per view; English and Arabic with the stored names marked as English and each cell in its own direction; two cut lists named; an empty copy said so; the limit, a gateway page, an empty answer, a bare word and a missing profile each said in place of the tables, in the reader’s language, with none of the database’s words; "not signed in" from the database sent to sign in.');

  // ================================================================= the route
  const get = async (query = '', headers = { cookie }) => {
    const response = await request(`/api/account/export${query}`, headers);
    const text = await response.text();
    for (const words of DATABASE_WORDS) assert.equal(text.includes(words), false, `the route forwarded "${words}"`);
    assert.equal(response.headers.get('cache-control'), 'no-store', `${query} ${response.status}: the answer may be kept by a cache`);
    let json = null; try { json = JSON.parse(text); } catch { /* a file */ }
    return { status: response.status, text, json, type: response.headers.get('content-type'), disposition: response.headers.get('content-disposition') };
  };
  const refusal = (answer, status, code) => {
    assert.equal(answer.status, status, code); assert.equal(answer.json.ok, false); assert.equal(answer.json.code, code);
    assert.equal(answer.disposition, null, `${code}: a refusal is offered as a file`);
  };
  before = copies();
  refusal(await get('', {}), 401, 'signed_out');
  refusal(await get('?format=xml'), 400, 'format');
  refusal(await get('?format='), 400, 'format');
  assert.equal(copies(), before, 'the database was asked although the request could not be answered');
  state.answer = 'limit'; refusal(await get(), 429, 'limit');
  refusal(await get('?format=csv'), 429, 'limit');
  state.answer = 'signed_out'; refusal(await get(), 401, 'signed_out');
  for (const answer of ['no_profile', 'gateway', 'empty', 'word']) { state.answer = answer; refusal(await get(), 502, 'failed'); }
  state.answer = 'ok';
  {
    const file = await get();
    assert.equal(file.status, 200);
    assert.match(file.type, /^application\/json/);
    assert.match(file.disposition, /^attachment; filename="ayahspring-[a-z-]*\d{4}-\d{2}-\d{2}\.json"$/);
    assert.equal(file.json.profile.display_name, 'مريم الاختبار');
    assert.deepEqual(file.json.meta.truncated, []);
    const sheet = await get('?format=csv');
    assert.equal(sheet.status, 200);
    assert.match(sheet.type, /^text\/csv/);
    assert.match(sheet.disposition, /^attachment; filename="ayahspring-my-data-\d{4}-\d{2}-\d{2}\.csv"$/);
    // fetch() strips a byte-order mark from text(), so ask for the bytes.
    const bytes = new Uint8Array(await (await request('/api/account/export?format=csv', { cookie })).arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], 'the spreadsheet lost its byte-order mark');
    assert.ok(sheet.text.includes('مريم الاختبار'));
    assert.equal((await get('?format=json')).status, 200);
  }
  console.log('Export route: signed out 401; an unknown format 400 with the database not asked; the limit 429 for both formats; "not signed in" from the database 401; a missing profile, a gateway page, an empty answer and a bare word 502 "failed"; none with the database’s sentence and none offered as a file; a copy 200 as JSON and as a spreadsheet with its byte-order mark; every answer no-store. The stand-in counts nothing.');

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
    for (const [code, heading] of [['en', 'Get a copy of your data'], ['ar', 'احصل على نسخة من بياناتك'], ['ta', 'உங்கள் தரவின் நகலைப் பெறுங்கள்']]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await open('/account/export', code, width);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        await fits(tab, width, `export ${code} ${width}`);
        // Each name sits above its note rather than beside it in a squeezed column.
        const rows = await tab.locator('ul.lessons.stacked li').evaluateAll((els) => els.map((el) => { const name = el.querySelector('strong').getBoundingClientRect(); const note = el.querySelector('span').getBoundingClientRect(); return note.top >= name.bottom - 1; }));
        assert.equal(rows.length, 13, `${code} ${width}: eight things inside and five outside`);
        assert.ok(rows.every(Boolean), `${code} ${width}: a note sits beside its name`);
        assert.deepEqual(errors, [], `${code} ${width}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && [390, 1440].includes(width)) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/export-${code}-${width}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic export page in ${code}: fits at 320, 390 and 1440px; thirteen names, each above its note`);
    }

    // The buttons, in Arabic.
    {
      const viewed = copies();
      const { context, tab, errors } = await open('/account/export', 'ar', 390);
      assert.equal(copies(), viewed, 'opening the export page in a browser made a copy');
      const address = tab.url();
      const json = tab.getByRole('link', { name: 'تنزيل النسخة (JSON)', exact: true });
      const sheet = tab.getByRole('link', { name: 'تنزيل النسخة (جدول بيانات)', exact: true });
      const alerts = tab.locator('main').getByRole('alert');
      const said = async (button, answer, sentence) => {
        state.answer = answer;
        await button.click();
        await alerts.filter({ hasText: sentence }).waitFor();
        assert.equal(await alerts.count(), 1, `${answer}: more than one thing is announced`);
        assert.equal(tab.url(), address, `${answer}: the page was replaced`);
        const text = await tab.locator('main').textContent();
        for (const words of [...DATABASE_WORDS, 'Ten copies', 'could not be made', '"ok"', '"code"']) assert.equal(text.includes(words), false, `${answer}: said in English or in the database's words: ${words}`);
      };
      // The eleventh press: said under the button, and the page stays.
      await said(json, 'limit', 'أُعدّت عشر نسخ خلال الساعة الأخيرة، وهذا هو الحد. انتظر قليلًا ثم اطلب من جديد.');
      await said(json, 'gateway', 'تعذّر إعداد النسخة الآن. اطلب من جديد بعد قليل.');
      await said(json, 'signed_out', 'لقد سُجّل خروجك. سجّل الدخول من جديد للحصول على نسخة.');
      await fits(tab, 390, 'export ar 390 with a refusal');
      // The other button says its own answer under itself; the first one's
      // stays where it was said until that button is pressed again.
      state.answer = 'limit';
      await sheet.click();
      await alerts.nth(1).waitFor();
      assert.equal(await alerts.count(), 2);
      assert.equal((await alerts.nth(1).textContent()).trim(), 'أُعدّت عشر نسخ خلال الساعة الأخيرة، وهذا هو الحد. انتظر قليلًا ثم اطلب من جديد.');
      assert.equal(tab.url(), address);
      await fits(tab, 390, 'export ar 390 with two refusals');
      // A copy: the browser is handed a file, with the name the server gave it.
      state.answer = 'ok';
      const [download] = await Promise.all([tab.waitForEvent('download'), json.click()]);
      assert.match(download.suggestedFilename(), /^ayahspring-[a-z-]*\d{4}-\d{2}-\d{2}\.json$/);
      await tab.locator('main').getByRole('status').filter({ hasText: 'أُعدّت نسختك وسُلّمت إلى متصفحك ليحفظها.' }).waitFor();
      assert.equal(tab.url(), address);
      const [second] = await Promise.all([tab.waitForEvent('download'), sheet.click()]);
      assert.match(second.suggestedFilename(), /^ayahspring-my-data-\d{4}-\d{2}-\d{2}\.csv$/);
      assert.equal(await alerts.count(), 0, 'a refusal is still shown after the copy was made');
      // The connection goes.
      await context.setOffline(true);
      await json.click();
      await alerts.filter({ hasText: 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.' }).waitFor();
      await context.setOffline(false);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic export buttons in Arabic: the eleventh press, a gateway page and a signed-out answer each said under the button in Arabic with the page left where it was; a copy saved as a file under the server’s name, JSON and spreadsheet; a lost connection said so.');
    }

    // The page to print, on a screen and on paper.
    for (const [code, heading] of [['en', 'A copy of your data'], ['ar', 'نسخة من بياناتك']]) {
      state.answer = 'cut';
      for (const width of [320, 1440]) {
        const { context, tab, errors } = await open('/account/export/print', code, width);
        assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        await fits(tab, width, `print ${code} ${width}`);
        // The version, the moment, the counts, the profile, one learner, two notes.
        assert.equal(await tab.locator('main table').count(), 6);
        // A column heading starts where the page's text starts.
        const align = await tab.locator('main th').first().evaluate((el) => getComputedStyle(el).textAlign);
        assert.equal(align, 'start');
        if (width === 1440) {
          await tab.emulateMedia({ media: 'print' });
          const paper = await tab.evaluate(() => {
            const shown = (el) => el !== null && getComputedStyle(el).display !== 'none';
            return {
              masthead: shown(document.querySelector('.masthead')),
              footer: shown(document.querySelector('body > footer, footer')),
              crumbs: shown(document.querySelector('main .crumbs')),
              buttons: [...document.querySelectorAll('main .btn')].filter((el) => el.offsetParent !== null).length,
              tables: [...document.querySelectorAll('main table')].filter((el) => el.offsetParent !== null).length,
              heading: shown(document.querySelector('main h1')),
              clipped: [...document.querySelectorAll('main .scroll-x')].filter((el) => getComputedStyle(el).overflowX !== 'visible').length,
              cut: [...document.querySelectorAll('main .notice.warn')].filter((el) => el.offsetParent !== null).length,
            };
          });
          assert.deepEqual(paper, { masthead: false, footer: false, crumbs: false, buttons: 0, tables: 6, heading: true, clipped: 0, cut: 1 }, `${code}: what the print stylesheet leaves on the sheet`);
          if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/export-print-${code}-paper.png`, fullPage: true });
          await tab.emulateMedia({ media: 'screen' });
        }
        assert.deepEqual(errors, [], `${code} ${width}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/export-print-${code}-${width}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic print page in ${code}: fits at 320 and 1440px; on paper the masthead, footer, breadcrumbs and buttons are gone and the six tables, the heading and the note about cut lists remain, with no table clipped`);
    }
    // A refusal on the print page, in a browser.
    {
      state.answer = 'limit';
      const { context, tab, errors } = await open('/account/export/print', 'ar', 390);
      const alerts = tab.locator('main').getByRole('alert');
      assert.equal(await alerts.count(), 1);
      assert.equal((await alerts.textContent()).trim(), 'أُعدّت عشر نسخ خلال الساعة الأخيرة، وهذا هو الحد. انتظر قليلًا ثم اطلب من جديد.');
      await fits(tab, 390, 'print ar 390 refused');
      assert.deepEqual(errors, []);
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/export-print-ar-refused.png`, fullPage: true });
      await context.close();
    }
  }
  console.log('Export HTTP smoke passed. Not real Auth, RLS, the hourly limit or a real copy.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
