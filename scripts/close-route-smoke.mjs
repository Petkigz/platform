// Real Next /account/delete page and /api/account/erase route against an
// entirely synthetic loopback Auth/REST API. This is not evidence about hosted
// Supabase, JWT validation, RLS or what `erase_my_account()` removes: the
// stand-in answers whatever it is asked and closes nothing.
//
// What it does show: the page a signed-in reader is sent, in English, in
// Arabic, in French by the reader's own choice, and in English for a language
// held for review; that an account already closed is told so; and the name and
// status the route gives each refusal the database raises, with the
// database's sentence left behind. The expected sentences are typed here
// rather than imported, so this fails if a catalogue changes without anybody
// looking at the page.
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

// What `erase_my_account()` and its wrapper raise, word for word, with the
// state each is raised under. None of these sentences may reach a reader.
const RAISED = {
  name_mismatch: { status: 400, code: '22023', message: 'type your name exactly as it appears to close this account' },
  teaching: { status: 400, code: '23514', message: 'you still have a course in review or published; ask the platform owner to close the teacher account first' },
  board: { status: 400, code: '23514', message: 'you are a voting member of the scholarly board; ask the platform owner to end that appointment first' },
  held: { status: 400, code: '23514', message: 'this account is linked to a separate child login or held coursework and needs individual review before closure' },
  appointment: { status: 400, code: '23514', message: 'this account is named in the platform owner appointment; ask for individual review before closing it' },
  no_account: { status: 403, code: '42501', message: 'there is no account to close' },
  // A refusal nobody named: a constraint's own text.
  refused: { status: 409, code: '23503', message: 'update or delete on table "user_profiles" violates foreign key constraint "SYNTHETIC_fkey"' },
};
const DATABASE_WORDS = ['type your name exactly', 'ask the platform owner to close the teacher account', 'voting member', 'needs individual review before closure', 'owner appointment', 'there is no account to close', 'SYNTHETIC_fkey', 'violates'];

const state = {
  name: 'Synthetic learner',
  status: 'active',
  deletedAt: null,
  // What the stand-in database does when asked to close the account.
  erase: 'ok',
};
const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (req.url?.startsWith('/auth/v1/logout')) { calls.push({ method: req.method, path: '/auth/v1/logout' }); res.writeHead(204); res.end(); return; }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  // The real server compares a column with the *word* "null" when asked
  // `eq.null`; on a date column that is an error, not an empty answer.
  if ([...url.searchParams.values()].some((value) => /^(?:not\.)?(?:eq|neq)\.(?:null|undefined)$/.test(value))) {
    res.writeHead(400); res.end(JSON.stringify({ code: '22007', message: 'invalid input syntax for type timestamp with time zone: "null"' })); return;
  }
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, query: url.search });
  const send = (value) => res.end(JSON.stringify(value));
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/user_profiles' && req.method === 'GET') {
    send(state.name === undefined ? [] : [{ display_name: state.name, account_status: state.status, deleted_at: state.deletedAt, preferred_language: 'en', timezone: null }]);
  } else if (path === '/rest/v1/rpc/erase_my_account') {
    if (state.erase === 'ok') send({ closed: true, alreadyClosed: false, learnersErased: 1, removed: {}, deidentified: {}, retained: {} });
    // Two hundred, and nothing that says the account closed.
    else if (state.erase === 'empty') send(null);
    else if (state.erase === 'half') send({ closed: false });
    // An error with no state at all: a gateway's page, not the database.
    else if (state.erase === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); res.end('<html>bad gateway SYNTHETIC</html>'); }
    else { const raised = RAISED[state.erase]; res.writeHead(raised.status); send({ code: raised.code, message: raised.message, details: null, hint: null }); }
  } else if (path === '/rest/v1/learner_profiles') send([]);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else { res.writeHead(404); res.end('{}'); }
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
  const request = (headers = {}) => fetch(`${origin}/account/delete`, { headers, redirect: 'manual', signal: AbortSignal.timeout(60000) });
  const anonymous = await request();
  assert.equal(anonymous.status, 307);
  const redirect = new URL(anonymous.headers.get('location'), origin);
  assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), '/account/delete');

  const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  // The page itself: what is inside <main>, without the scripts Next adds.
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('&#x27;', '’').replaceAll('<!-- -->', '');
  const wrapper = (html) => inner(html).match(/<div class="container section"[^>]*?style="[^"]*"([^>]*)>/)?.[1];
  const page = async (headers) => { const response = await request({ cookie, ...headers }); assert.equal(response.status, 200, logs.slice(-2000)); return response.text(); };
  const ENGLISH_ONLY = ['Close this account', 'You are signed in as', 'Removed or changed', 'Records that remain', 'This cannot be undone', 'to confirm', 'Close my account for good', 'Keep my account', 'Account settings', 'can remain', 'is not proof', 'already closed'];
  const ADDRESS = '<bdi dir="ltr">privacy@ayahspring.com</bdi>';

  // ------------------------------------------------------------------ English
  const english = await page({ 'accept-language': 'en' });
  for (const sentence of [
    'Close this account',
    'You are signed in as <strong><bdi dir="ltr">probe@example.invalid</bdi></strong>. This closes the account, changes your profile and removes some personal information. Some records and stored files remain, as explained below.',
    'Removed or changed when the account closes', 'Records that remain', 'This cannot be undone',
    'Earlier revision snapshots and attached files can remain under separate retention rules.',
    'On a certificate, the holder’s name is replaced with <bdi lang="en" dir="ltr">“Deleted learner”</bdi>; its number',
    'Type <strong><bdi>Synthetic learner</bdi></strong> to confirm',
    'Close my account for good', 'Keep my account',
  ]) assert.ok(inner(english).includes(sentence), `English closing page lost "${sentence}"`);
  assert.equal(wrapper(english), '', 'an English page marks its own closing page as a different language');
  assert.ok(inner(english).includes(ADDRESS), 'the address to write to is not kept left to right');
  assert.equal(inner(english).includes('{'), false, 'a gap in an English sentence was left unfilled');
  assert.match(inner(english), /<button type="button" class="btn danger" disabled="">Close my account for good<\/button>/, 'the button can be pressed before the name is typed');

  // ------------------------------------------------------------------- Arabic
  const arabic = await page({ 'accept-language': 'ar' });
  const ar = inner(arabic);
  assert.match(htmlRoot(arabic), /lang="ar"/); assert.match(htmlRoot(arabic), /dir="rtl"/);
  assert.equal(wrapper(arabic), '', 'the Arabic closing page is Arabic and needs no wrapper');
  for (const sentence of [
    'إغلاق هذا الحساب',
    'أنت مسجّل الدخول بالحساب: <strong><bdi dir="ltr">probe@example.invalid</bdi></strong>. هذا الإجراء يغلق الحساب',
    'ما يُزال أو يُغيَّر عند إغلاق الحساب', 'السجلات التي تبقى', 'لا يمكن التراجع عن هذا',
    'قد تبقى اللقطات المحفوظة من الصيغ السابقة والملفات المرفقة وفق قواعد احتفاظ منفصلة.',
    'في الشهادة يُستبدل باسم حاملها النص التالي: <bdi lang="en" dir="ltr">“Deleted learner”</bdi>؛',
    'للتأكيد اكتب: <strong><bdi>Synthetic learner</bdi></strong>',
    'أغلق حسابي نهائيًا', 'أبقِ حسابي',
  ]) assert.ok(ar.includes(sentence), `Arabic closing page lacks "${sentence}"`);
  for (const sentence of [...ENGLISH_ONLY, '{']) assert.ok(!ar.includes(sentence), `Arabic closing page still says "${sentence}"`);
  // The one English string on the page is the one the database writes on a
  // certificate, and it says so.
  assert.equal((ar.match(/lang="en"/g) ?? []).length, 1, 'something besides the certificate label is marked as English');
  assert.ok(ar.includes(ADDRESS));

  // ------------------------------------------- French, by the reader's choice
  const french = await page({ 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` });
  assert.match(htmlRoot(french), /lang="fr"/);
  // French puts a no-break space before a colon; it is written out here so
  // nobody mistakes it for an ordinary one.
  for (const sentence of ['Fermer ce compte', 'Vous êtes connecté avec le compte\u00a0: <strong>', 'Cette action est irréversible', 'Pour confirmer, saisissez\u00a0: <strong><bdi>Synthetic learner</bdi></strong>', 'Fermer mon compte définitivement', 'Conserver mon compte']) {
    assert.ok(inner(french).includes(sentence), `French closing page lacks "${sentence}"`);
  }

  // ------------------------------------------------ an account with no name
  // No typing can match a name that is not there, so no button is offered.
  state.name = '';
  {
    const en = inner(await page({ 'accept-language': 'en' }));
    assert.ok(en.includes('This account has no name to type. Add one in account settings first.'));
    assert.equal(en.includes('Close my account for good'), false, 'a nameless account is shown a button that cannot be enabled');
    const nameless = inner(await page({ 'accept-language': 'ar' }));
    assert.ok(nameless.includes('ليس لهذا الحساب اسم يُكتب. أضف اسمًا في إعدادات الحساب أولًا.'));
    assert.equal(nameless.includes('أغلق حسابي نهائيًا'), false);
  }
  state.name = 'Synthetic learner';

  // --------------------------------------------------- already closed
  state.status = 'closed'; state.deletedAt = '2026-02-02T00:00:00Z';
  {
    const en = inner(await page({ 'accept-language': 'en' }));
    assert.ok(en.includes('This account is already closed.'));
    assert.ok(en.includes('Being on the list for removal is not proof that it has been removed.'));
    assert.equal(en.includes('Close my account for good'), false, 'a closed account is offered the button again');
    const done = inner(await page({ 'accept-language': 'ar' }));
    assert.ok(done.includes('هذا الحساب مغلق بالفعل.'));
    assert.ok(done.includes('وإدراجها في قائمة الإزالة ليس دليلًا على أنها أُزيلت.'));
    for (const sentence of ENGLISH_ONLY) assert.equal(done.includes(sentence), false, `the Arabic page for a closed account says "${sentence}"`);
  }
  state.status = 'active'; state.deletedAt = null;

  // ------------------------------------------------------- held for review
  // Hausa has no closing page of its own: Hausa frame, English page, marked.
  const hausa = await page({ 'accept-language': 'ha' });
  assert.match(htmlRoot(hausa), /lang="ha"/);
  assert.equal(wrapper(hausa), ' lang="en" dir="ltr"');
  for (const sentence of ['Close this account', 'Records that remain', 'Close my account for good']) assert.ok(inner(hausa).includes(sentence), `Hausa reader's closing page lacks English "${sentence}"`);
  // Pashto is right-to-left with the same hold: the English must not inherit it.
  const pashto = await page({ 'accept-language': 'ps' });
  assert.match(htmlRoot(pashto), /lang="ps"/); assert.match(htmlRoot(pashto), /dir="rtl"/);
  assert.equal(wrapper(pashto), ' lang="en" dir="ltr"');
  // Wolof is withheld whole: English everywhere, so nothing to mark.
  const wolof = await page({ 'accept-language': 'wo, fr' });
  assert.match(htmlRoot(wolof), /lang="en"/);
  assert.equal(wrapper(wolof), '');
  assert.ok(inner(wolof).includes('Close this account') && !inner(wolof).includes('Fermer ce compte'));
  console.log('Closing page languages: English; Arabic (right-to-left, the address signed in with, the name to type and the address to write to isolated, the certificate label the one string marked English); French by the reader\'s own choice over an Arabic device; an account with no name told so with no button; an account already closed told so in English and Arabic; Hausa and Pashto read it in English, marked; Wolof reads English unmarked.');

  // ------------------------------------------------------------- the route
  const post = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/account/erase`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    const text = await response.text();
    for (const words of DATABASE_WORDS) assert.equal(text.includes(words), false, `the route passed on the database's own sentence: ${words}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return { status: response.status, json: JSON.parse(text), cookies: response.headers.getSetCookie() };
  };
  const asked = () => calls.filter((c) => c.path === '/rest/v1/rpc/erase_my_account').length;
  const signedOutCalls = () => calls.filter((c) => c.path === '/auth/v1/logout').length;
  calls.length = 0;
  let answer = await post({ confirm: 'Synthetic learner' }, {});
  assert.equal(answer.status, 401); assert.equal(answer.json.code, 'signed_out'); assert.equal(answer.json.ok, false);
  for (const body of ['{not json', { confirm: '   ' }, { confirm: 7 }, {}]) {
    answer = await post(body);
    assert.equal(answer.status, 400); assert.equal(answer.json.code, 'name_missing');
  }
  assert.equal(asked(), 0, 'the database was asked to close an account with no confirmation');
  for (const [raised, status] of [['name_mismatch', 400], ['teaching', 409], ['board', 409], ['held', 409], ['appointment', 409], ['no_account', 404], ['refused', 409]]) {
    state.erase = raised;
    answer = await post({ confirm: 'Synthetic learner' });
    assert.equal(answer.status, status, raised); assert.equal(answer.json.code, raised); assert.equal(answer.json.ok, false);
  }
  // An answer that does not say the account closed is not called a refusal,
  // and is not called a closure either.
  for (const kind of ['empty', 'half', 'gateway']) {
    state.erase = kind;
    answer = await post({ confirm: 'Synthetic learner' });
    assert.equal(answer.status, 502, kind); assert.equal(answer.json.code, 'unconfirmed', kind); assert.equal(answer.json.ok, false);
  }
  assert.equal(signedOutCalls(), 0, 'the session was ended although the account was not closed');
  state.erase = 'ok'; calls.length = 0;
  answer = await post({ confirm: 'Synthetic learner' });
  assert.equal(answer.status, 200); assert.equal(answer.json.ok, true);
  assert.deepEqual(calls.find((c) => c.path === '/rest/v1/rpc/erase_my_account').payload, { p_confirm: 'Synthetic learner' });
  assert.ok(answer.cookies.some((value) => /^sb-127-auth-token[^=]*=;/.test(value)), 'a closed account keeps its session cookie');
  console.log('Erase route: signed out 401; no confirmation 400 four ways with the database not asked; the six refusals the migrations raise each by name (name 400, teaching, board, held coursework and owner appointment 409, no account 404) and an unnamed one 409, none with the database\'s sentence; three answers that do not say the account closed 502 "unconfirmed" with the session left alone; a closure 200 that clears the session cookie. The stand-in closes nothing.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      const sent = []; tab.on('request', (r) => { if (r.url().endsWith('/api/account/erase') && r.method() === 'POST') sent.push(r.url()); });
      await tab.goto(`${origin}/account/delete`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent };
    };
    const luminance = (rgb) => { const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => { const c = Number(v) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    for (const [code, heading, button] of [['en', 'Close this account', 'Close my account for good'], ['ar', 'إغلاق هذا الحساب', 'أغلق حسابي نهائيًا'], ['ta', 'இந்தக் கணக்கை மூடு', 'என் கணக்கை நிரந்தரமாக மூடு']]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await open(code, width);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
        // Name what sticks out, so the failure says where to look.
        const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 40)}"`).slice(0, 6), width);
        assert.ok(scroll <= width + 1, `${code} ${width}: the closing page scrolls sideways (${scroll}): ${wide.join(' | ')}`);
        const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
        assert.equal(spill, 0, `${code} ${width}: a card's contents are wider than the card`);
        // The button that cannot be taken back does not look like "save".
        const close = tab.getByRole('button', { name: button, exact: true });
        await tab.locator('#confirm-name').fill('Synthetic learner');
        const colours = await close.evaluate((el) => { const s = getComputedStyle(el); return { background: s.backgroundColor, text: s.color, disabled: el.disabled }; });
        assert.equal(colours.disabled, false, `${code} ${width}: typing the name does not enable the button`);
        assert.equal(colours.background, 'rgb(178, 60, 60)', `${code} ${width}: the closing button is not the danger colour`);
        const [light, dark] = [luminance(colours.text), luminance(colours.background)].sort((a, b) => b - a);
        assert.ok((light + 0.05) / (dark + 0.05) >= 4.5, `${code} ${width}: the closing button's words are under 4.5:1`);
        if (width === 1440) {
          const bars = await tab.locator('.page-actions .btn').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), width: r.width, parent: el.parentElement.getBoundingClientRect().width }; }));
          assert.equal(bars.length, 2);
          assert.equal(new Set(bars.map((b) => b.top)).size, 1, `${code} ${width}: close and keep are not on one line`);
          for (const b of bars) assert.ok(b.width < b.parent * 0.6, `${code} ${width}: a button is a full-width bar`);
        }
        assert.deepEqual(errors, [], `${code} ${width}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && [390, 1440].includes(width)) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/close-${code}-${width}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic closing page in ${code}: fits at 320, 390 and 1440px; the closing button is the danger colour with words above 4.5:1; close and keep on one line at 1440px`);
    }
    // The form, in Arabic.
    {
      const { context, tab, errors, sent } = await open('ar', 390);
      const box = tab.locator('#confirm-name');
      const close = tab.getByRole('button', { name: 'أغلق حسابي نهائيًا', exact: true });
      assert.equal(await close.isDisabled(), true, 'the button can be pressed before anything is typed');
      await box.fill('Synthetic');
      assert.equal(await close.isDisabled(), true, 'half the name enables the button');
      await box.fill('  Synthetic learner ');
      assert.equal(await close.isDisabled(), false);
      const alerts = tab.locator('main').getByRole('alert');
      const said = async (kind, sentence) => {
        state.erase = kind;
        await close.click();
        await alerts.filter({ hasText: sentence }).waitFor();
        assert.equal(await alerts.count(), 1, `${kind}: more than one thing is announced`);
        const text = await tab.locator('main').textContent();
        for (const words of [...DATABASE_WORDS, 'Nothing was changed', 'could not confirm', 'could not be closed', '{contact}']) assert.equal(text.includes(words), false, `${kind}: said in English or in the database's words: ${words}`);
        assert.equal(await close.isDisabled(), false, `${kind}: the button stays disabled after an answer`);
      };
      await said('teaching', 'ما زالت لك دورة قيد المراجعة أو منشورة. اطلب من مالك المنصة إغلاق حساب التدريس أولًا. لم يتغيّر شيء.');
      await said('held', 'هذا الحساب مرتبط بتسجيل دخول مستقل لطفل، أو بواجبات محتجزة، ولذلك يحتاج إغلاقه إلى مراجعة فردية. لم يتغيّر شيء. للتواصل: privacy@ayahspring.com.');
      assert.equal(await alerts.locator('bdi[dir="ltr"]').textContent(), 'privacy@ayahspring.com');
      await said('refused', 'تعذّر إغلاق هذا الحساب، ولم يتغيّر شيء. إذا تكرّر ذلك فللتواصل: privacy@ayahspring.com.');
      // An answer nobody can read: "we could not confirm", and never "nothing
      // was changed".
      await said('gateway', 'لم نتمكّن من التأكد هل أُغلق حسابك أم لا. قبل المحاولة من جديد أعد تحميل هذه الصفحة لترى، أو تواصل عبر: privacy@ayahspring.com.');
      assert.equal((await alerts.textContent()).includes('لم يتغيّر شيء'), false, 'an unreadable answer is reported as "nothing was changed"');
      // The connection goes: the same sentence, because the request may have left.
      const before = sent.length;
      await context.setOffline(true);
      await close.click();
      await alerts.filter({ hasText: 'لم نتمكّن من التأكد هل أُغلق حسابك أم لا.' }).waitFor();
      await context.setOffline(false);
      assert.equal(sent.length, before + 1);
      // A closure: the browser leaves for the front page.
      state.erase = 'ok';
      await close.click();
      await tab.waitForURL(`${origin}/`);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic closing form in Arabic: disabled until the whole name is typed; a teaching refusal, a held-coursework refusal and an unnamed refusal each said in Arabic with "nothing was changed"; an unreadable answer and a lost connection said as "could not confirm" without it; a closure leaves for the front page.');
    }
  }
  console.log('Closing-account HTTP smoke passed. Not real Auth, RLS or erasure.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
