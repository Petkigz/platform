// Real Next /account page and /api/account route against an entirely synthetic
// loopback Auth/REST API. This is not evidence about hosted Supabase, JWT
// validation or RLS: the stand-in answers whatever it is asked.
//
// What it does show: the page a signed-in reader is sent, in English, in
// Arabic, in French by the reader's own choice, and in English for a language
// held for review; the sentence chosen for each way of signing in; and the
// name and status the route gives each refusal. The expected sentences are
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

// A sentence only the database would write. It must reach no reader.
const DATABASE_SENTENCE = 'new row violates row-level security policy for table "user_profiles"';
// The sentence the database writes beside the list of sign-in methods. It is
// English, so the page must not print it on any page.
const DATABASE_SUMMARY = 'SYNTHETIC-SUMMARY you sign in with a stand-in';

const state = {
  flags: new Set(),
  learner: { id: 'own', display_name: 'Synthetic learner', family_id: null },
  methods: { providers: ['email'], hasPassword: true, summary: DATABASE_SUMMARY },
  methodsOutage: false,
  unread: 0,
  merge: { enabled: false, incoming: [] },
  standing: { outstanding: 0, acceptanceRequired: [], history: [] },
  save: 'ok',
  status: 'active',
};
const profile = () => ({ display_name: 'Synthetic learner', preferred_language: 'en', timezone: 'Africa/Kampala', account_status: state.status });
const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{}'); return; }
  let body = ''; for await (const chunk of req) body += chunk;
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
  if (path === '/rest/v1/rpc/setting_bool') send(state.flags.has(payload.p_key));
  else if (path === '/rest/v1/user_profiles' && req.method === 'GET') send([profile()]);
  else if (path === '/rest/v1/user_profiles' && req.method === 'PATCH') {
    if (state.save === 'failed') { res.writeHead(403); send({ code: '42501', message: DATABASE_SENTENCE }); }
    else if (state.save === 'gone') send([]);
    else send([{ display_name: payload.display_name, preferred_language: payload.preferred_language, timezone: payload.timezone }]);
  } else if (path === '/rest/v1/learner_profiles') send(state.learner ? [state.learner] : []);
  else if (path === '/rest/v1/rpc/my_sign_in_methods') {
    if (state.methodsOutage) { res.writeHead(503); send({ message: 'simulated outage' }); } else send(state.methods);
  } else if (path === '/rest/v1/rpc/notification_badge') send(state.unread);
  else if (path === '/rest/v1/rpc/my_phone') send({ enabled: false });
  else if (path === '/rest/v1/rpc/my_merge_requests') send(state.merge);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/rpc/my_policy_standing') send(state.standing);
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
  const request = (headers = {}) => fetch(`${origin}/account`, { headers, redirect: 'manual', signal: AbortSignal.timeout(60000) });
  const anonymous = await request();
  assert.equal(anonymous.status, 307);
  const redirect = new URL(anonymous.headers.get('location'), origin);
  assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), '/account');

  const digits = (code, value) => new Intl.NumberFormat(code).format(value);
  const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  // The page itself: what is inside <main>, without the scripts Next adds.
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '');
  const wrapper = (html) => inner(html).match(/<div class="container section"([^>]*)>/)?.[1];
  const page = async (headers) => { const response = await request({ cookie, ...headers }); assert.equal(response.status, 200, logs.slice(-2000)); return response.text(); };
  const ENGLISH_ONLY = ['Account settings', 'Manage how your account', 'Signed in as', 'Account status', 'Learning as yourself', 'This account learns as', 'Display name', 'Save profile', 'How you sign in', 'You sign in with', 'Download my data', 'As a spreadsheet', 'Read or print it', 'Closing this account', 'Before you carry on', 'is waiting for your agreement', 'unread message', 'Learn on this account'];

  // ------------------------------------------------------------------ English
  const english = await page({ 'accept-language': 'en' });
  for (const sentence of ['Account settings', 'Manage how your account appears. Your sign-in address is shown for reference and is not changed here.', 'Signed in as ', 'Account status: active', 'Learning as yourself', 'Display name', 'Preferred language code', 'This is kept with your profile, and nothing reads it yet.', 'Save profile', 'How you sign in', 'You sign in with your email address and a password.', 'Nothing is waiting for your agreement.', 'Download my data', 'As a spreadsheet', 'Read or print it', 'Closing this account']) {
    assert.ok(inner(english).includes(sentence), `English account page lost "${sentence}"`);
  }
  assert.equal(wrapper(english), '', 'an English page marks its own account page as a different language');
  assert.match(english, /<strong><bdi dir="ltr">probe@example\.invalid<\/bdi><\/strong>/);
  assert.match(inner(english), /This account learns as <strong><bdi>Synthetic learner<\/bdi><\/strong>\. Courses you enrol in/);
  assert.equal(inner(english).includes('lang="en"'), false, 'an English page marks part of itself as English');
  assert.equal(english.includes('SYNTHETIC-SUMMARY'), false, 'the English page prints the database’s sentence about signing in');
  assert.ok(inner(english).includes('href="/forgot-password"'));

  // ------------------------------------------------------------------- Arabic
  // With a document waiting, three unread messages and a merge request.
  state.unread = 3;
  state.merge = { enabled: true, incoming: [{ id: 'm1' }, { id: 'm2' }] };
  state.standing = { outstanding: 1, history: [], acceptanceRequired: [
    { slug: 'terms', title: 'Synthetic terms of use', versionNumber: 4, acceptedAt: null },
    { slug: 'privacy', title: 'Synthetic privacy notice', versionNumber: 2, acceptedAt: '2026-01-01T00:00:00Z' }] };
  const arabic = await page({ 'accept-language': 'ar' });
  const ar = inner(arabic);
  assert.match(htmlRoot(arabic), /lang="ar"/); assert.match(htmlRoot(arabic), /dir="rtl"/);
  assert.equal(wrapper(arabic), '', 'the Arabic account page is Arabic and needs no wrapper');
  for (const sentence of ['إعدادات الحساب', 'تحكّم في طريقة ظهور حسابك.', 'تم تسجيل الدخول باسم ', 'حالة الحساب: نشط', 'التعلّم باسمك', 'يتعلّم هذا الحساب باسم ', 'الاسم المعروض', 'حفظ الملف الشخصي', 'كيف تسجّل الدخول', 'تسجّل الدخول بعنوان بريدك الإلكتروني وكلمة مرور.', 'قبل أن تتابع', `عدد المستندات التي تنتظر موافقتك: ${digits('ar', 1)}.`, `عدد الرسائل غير المقروءة: ${digits('ar', 3)}.`, `الإشعارات (غير مقروءة: ${digits('ar', 3)})`, `دمج الحسابات (بالانتظار: ${digits('ar', 2)})`, 'تنزيل بياناتي', 'كجدول بيانات', 'قراءتها أو طباعتها', 'إغلاق هذا الحساب']) {
    assert.ok(ar.includes(sentence), `Arabic account page lacks "${sentence}"`);
  }
  for (const sentence of [...ENGLISH_ONLY, 'Nothing is waiting', '{']) assert.ok(!ar.includes(sentence), `Arabic account page still says "${sentence}"`);
  // The address and the learner's name keep their own direction.
  assert.match(ar, /<strong><bdi dir="ltr">probe@example\.invalid<\/bdi><\/strong>/);
  assert.match(ar, /<strong><bdi>Synthetic learner<\/bdi><\/strong>/);
  // The owner's document title is English, and says so; only the one still
  // owed is listed, with its version in the reader's digits.
  assert.ok(ar.includes(`<bdi lang="en" dir="ltr">Synthetic terms of use</bdi> — الإصدار ${digits('ar', 4)}`), 'the document owed is not listed with an English-marked title');
  assert.equal(ar.includes('Synthetic privacy notice'), false, 'a document already agreed to is listed as owed');
  assert.equal((ar.match(/lang="en"/g) ?? []).length, 1, 'something besides the document title is marked as English');
  assert.equal(arabic.includes('SYNTHETIC-SUMMARY'), false, 'the Arabic page prints the database’s English sentence about signing in');

  // ------------------------------------------- French, by the reader's choice
  state.unread = 1; state.merge = { enabled: false, incoming: [] }; state.standing = { outstanding: 0, acceptanceRequired: [], history: [] };
  const french = await page({ 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` });
  assert.match(htmlRoot(french), /lang="fr"/);
  // French puts a no-break space before a colon; it is written out here so
  // nobody mistakes it for an ordinary one.
  for (const sentence of ['Paramètres du compte', 'État du compte\u00a0: actif', 'Apprendre en votre nom', 'Vous avez 1 message non lu.', 'Notifications (non lues\u00a0: 1)', 'Rien n’attend votre accord.', 'Télécharger mes données', 'Fermer ce compte']) {
    assert.ok(inner(french).replaceAll('&#x27;', '’').includes(sentence), `French account page lacks "${sentence}"`);
  }
  state.unread = 3;
  assert.ok(inner(await page({ cookie: `${cookie}; ayahspring_locale=fr` })).includes('Vous avez 3 messages non lus.'), 'French does not use its plural for three messages');
  state.unread = 0;

  // --------------------------------------------------- how the account signs in
  // Said from the list of methods, in the reader's language, in every case.
  const signIn = async (methods, outage = false) => {
    state.methods = { ...methods, summary: DATABASE_SUMMARY }; state.methodsOutage = outage;
    const html = inner(await page({ 'accept-language': 'ar' }));
    assert.equal(html.includes('SYNTHETIC-SUMMARY'), false);
    return html;
  };
  const google = await signIn({ providers: ['google'], hasPassword: false });
  assert.ok(google.includes('تسجّل الدخول عبر Google. لا توجد كلمة مرور لهذا الحساب.'));
  assert.ok(google.includes('لا توجد كلمة مرور لهذا الحساب، فلا شيء يُعاد تعيينه — واصل تسجيل الدخول عبر Google.'));
  assert.equal(google.includes('href="/forgot-password"'), false, 'a Google-only account is offered a password reset');
  const both = await signIn({ providers: ['email', 'google'], hasPassword: true });
  assert.ok(both.includes('يمكنك تسجيل الدخول بكلمة مرور أو عبر Google.')); assert.ok(both.includes('href="/forgot-password"'));
  const other = await signIn({ providers: ['apple'], hasPassword: false });
  assert.match(other, /<bdi dir="ltr">apple<\/bdi>/, 'an unnamed provider is not shown under its own name');
  assert.equal(other.includes('{methods}'), false);
  const unreadable = await signIn({ providers: ['email'], hasPassword: true }, true);
  assert.equal(unreadable.includes('تسجّل الدخول بعنوان بريدك الإلكتروني وكلمة مرور.'), false, 'a list that could not be read is reported as a password');
  assert.equal(unreadable.includes('href="/forgot-password"'), false);
  for (const sentence of ['You sign in', 'How you sign in', 'could not']) assert.equal(unreadable.includes(sentence), false, `unread sign-in methods are reported in English: ${sentence}`);
  state.methods = { providers: ['email'], hasPassword: true, summary: DATABASE_SUMMARY }; state.methodsOutage = false;

  // A status the page has no word for is shown as the database has it rather
  // than being called active.
  state.status = 'suspended';
  assert.ok(inner(await page({ 'accept-language': 'en' })).includes('Account status: suspended'));
  state.status = 'active';

  // ------------------------------------------------- no learner on the account
  state.learner = null;
  {
    const en = inner(await page({ 'accept-language': 'en' }));
    for (const sentence of ['You do not have a learner profile yet.', 'Learn on this account', 'This does not create a second account. It adds you as a learner to this one.']) assert.ok(en.includes(sentence), `English prompt lost "${sentence}"`);
    const prompt = inner(await page({ 'accept-language': 'ar' }));
    for (const sentence of ['ليس لديك ملف متعلّم بعد.', 'التعلّم على هذا الحساب', 'هذا لا ينشئ حسابًا ثانيًا، بل يضيفك متعلّمًا إلى هذا الحساب.']) assert.ok(prompt.includes(sentence), `Arabic prompt lacks "${sentence}"`);
    for (const sentence of ['You do not have', 'Learn on this account', 'This does not create']) assert.equal(prompt.includes(sentence), false, `Arabic prompt still says "${sentence}"`);
  }
  state.learner = { id: 'own', display_name: 'Synthetic learner', family_id: null };

  // ------------------------------------------------------- held for review
  // Hausa has no account page of its own: Hausa frame, English page, marked.
  const hausa = await page({ 'accept-language': 'ha' });
  assert.match(htmlRoot(hausa), /lang="ha"/);
  assert.equal(wrapper(hausa), ' lang="en" dir="ltr"');
  for (const sentence of ['Account settings', 'Account status: active', 'Save profile', 'Download my data']) assert.ok(inner(hausa).includes(sentence), `Hausa reader's account page lacks English "${sentence}"`);
  // Pashto is right-to-left with the same hold: the English must not inherit it.
  const pashto = await page({ 'accept-language': 'ps' });
  assert.match(htmlRoot(pashto), /lang="ps"/); assert.match(htmlRoot(pashto), /dir="rtl"/);
  assert.equal(wrapper(pashto), ' lang="en" dir="ltr"');
  // Wolof is withheld whole: English everywhere, so nothing to mark.
  const wolof = await page({ 'accept-language': 'wo, fr' });
  assert.match(htmlRoot(wolof), /lang="en"/);
  assert.equal(wrapper(wolof), '');
  assert.ok(inner(wolof).includes('Account settings') && !inner(wolof).includes('Paramètres du compte'));
  console.log(`Account page languages: English; Arabic (right-to-left, digits ${digits('ar', 3)}, address and name isolated, the owed document's English title marked); French by the reader's own choice over an Arabic device, singular and plural; five ways of signing in said from the list and never from the database's sentence; Hausa and Pashto frames with an English page marked lang="en" dir="ltr"; Wolof-then-French device in English. Synthetic backend.`);

  // ------------------------------------------------------------- the route
  // Each refusal has a name and a status, and the database's sentence stays
  // behind.
  const post = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/account`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    const text = await response.text();
    assert.equal(text.includes('row-level'), false, 'the route passed on the database’s own sentence');
    return { status: response.status, json: JSON.parse(text) };
  };
  const good = { displayName: '  Synthetic learner  ', preferredLanguage: 'en', timezone: '' };
  const writes = () => calls.filter((c) => c.method === 'PATCH').length;
  calls.length = 0;
  let answer = await post(good, {});
  assert.equal(answer.status, 401); assert.equal(answer.json.code, 'signed_out');
  answer = await post('{not json');
  assert.equal(answer.status, 400); assert.equal(answer.json.code, 'malformed');
  answer = await post({ displayName: 'x', preferredLanguage: 7, timezone: '' });
  assert.equal(answer.status, 400); assert.equal(answer.json.code, 'malformed');
  for (const [body, code] of [
    [{ ...good, displayName: '   ' }, 'name_missing'],
    [{ ...good, displayName: 'x'.repeat(81) }, 'name_long'],
    [{ ...good, preferredLanguage: 'English' }, 'language_code'],
    [{ ...good, timezone: 'x'.repeat(101) }, 'zone_long'],
    [{ ...good, timezone: 'Mars/Olympus' }, 'zone_invalid'],
  ]) {
    answer = await post(body);
    assert.equal(answer.status, 400, code); assert.equal(answer.json.code, code); assert.equal(answer.json.ok, false);
  }
  assert.equal(writes(), 0, 'a refused save still wrote');
  state.save = 'failed';
  answer = await post(good);
  assert.equal(answer.status, 502); assert.equal(answer.json.code, 'failed');
  state.save = 'gone';
  answer = await post(good);
  assert.equal(answer.status, 409); assert.equal(answer.json.code, 'not_found');
  state.save = 'ok'; calls.length = 0;
  answer = await post(good);
  assert.equal(answer.status, 200); assert.equal(answer.json.ok, true);
  const written = calls.find((c) => c.method === 'PATCH');
  assert.deepEqual(written.payload, { display_name: 'Synthetic learner', preferred_language: 'en', timezone: null }, 'the save is not trimmed, or an empty zone is not stored as none');
  assert.ok(written.query.includes(`user_id=eq.${user.id}`), 'the save is not limited to the signed-in account');
  console.log('Account route: signed out 401, malformed 400, five typing mistakes 400 with no write, a database refusal 502 without its sentence, a missing row 409, a good save 200 trimmed and limited to the signed-in account. The stand-in enforces nothing: not real Auth or RLS.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    state.unread = 3; state.merge = { enabled: true, incoming: [{ id: 'm1' }] };
    state.standing = { outstanding: 1, history: [], acceptanceRequired: [{ slug: 'terms', title: 'Synthetic terms of use', versionNumber: 4, acceptedAt: null }] };
    const open = async (code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      const saves = []; tab.on('request', (r) => { if (r.url().endsWith('/api/account') && r.method() === 'POST') saves.push(r.url()); });
      await tab.goto(`${origin}/account`, { waitUntil: 'networkidle' });
      return { context, tab, errors, saves };
    };
    for (const [code, heading] of [['en', 'Account settings'], ['ar', 'إعدادات الحساب'], ['ta', 'கணக்கு அமைப்புகள்']]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await open(code, width);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(scroll <= width + 1, `${code} ${width}: the account page scrolls sideways (${scroll})`);
        // Nothing inside a card may be wider than the card.
        const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card, main form.card')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
        assert.equal(spill, 0, `${code} ${width}: a card's contents are wider than the card`);
        // The three downloads: side by side on a desk, never three full bars.
        const buttons = await tab.locator('.page-actions .btn').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), width: r.width, parent: el.parentElement.getBoundingClientRect().width }; }));
        assert.equal(buttons.length, 3, `${code} ${width}: download buttons`);
        if (width === 1440) {
          assert.equal(new Set(buttons.map((b) => b.top)).size, 1, `${code} ${width}: the three downloads are not on one line`);
          for (const b of buttons) assert.ok(b.width < b.parent * 0.6, `${code} ${width}: a download button is a full-width bar`);
        }
        assert.deepEqual(errors, [], `${code} ${width}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && [390, 1440].includes(width)) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/account-${code}-${width}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic account page in ${code}: fits at 320, 390 and 1440px; three download buttons on one line at 1440px`);
    }
    // The form, in Arabic: a typing mistake is named without a request; a
    // save the database refuses is said in Arabic; a good save is confirmed.
    {
      const { context, tab, errors, saves } = await open('ar', 390);
      assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main h1')).direction), 'rtl');
      const name = tab.locator('#account-display-name');
      assert.equal(await tab.locator('#account-language').getAttribute('dir'), 'ltr');
      assert.equal(await tab.locator('#account-timezone').getAttribute('dir'), 'ltr');
      const save = tab.getByRole('button', { name: 'حفظ الملف الشخصي', exact: true });
      await name.fill('   ');
      await save.click();
      await tab.getByRole('alert').filter({ hasText: 'أضف الاسم الذي تريد أن يراه الناس.' }).waitFor();
      assert.equal(saves.length, 0, 'a mistake the form can see was still sent');
      await name.fill('Synthetic learner');
      await tab.locator('#account-timezone').fill('Mars/Olympus');
      await save.click();
      await tab.getByRole('alert').filter({ hasText: 'استخدم منطقة زمنية صحيحة من IANA، مثل Africa/Kampala.' }).waitFor();
      assert.equal(saves.length, 0);
      await tab.locator('#account-timezone').fill('Africa/Kampala');
      state.save = 'failed';
      await save.click();
      await tab.getByRole('alert').filter({ hasText: 'تعذّر حفظ ملفك الشخصي. حاول مرة أخرى.' }).waitFor();
      assert.equal(saves.length, 1);
      const refused = await tab.locator('main').textContent();
      for (const sentence of ['row-level', 'could not be saved', 'Your profile']) assert.equal(refused.includes(sentence), false, `a refused save is said in English or in the database's words: ${sentence}`);
      state.save = 'ok';
      await save.click();
      await tab.getByRole('status').filter({ hasText: 'تم تحديث ملفك الشخصي.' }).waitFor();
      assert.equal(await tab.getByRole('alert').filter({ hasText: 'تعذّر' }).count(), 0, 'the refusal is still shown beside the confirmation');
      // The connection goes: the form says it could not reach the server and
      // does not say the profile was refused.
      await context.setOffline(true);
      await save.click();
      await tab.getByRole('alert').filter({ hasText: 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.' }).waitFor();
      await context.setOffline(false);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic account form in Arabic: two typing mistakes named with no request, a database refusal said in Arabic without its sentence, a good save confirmed, a lost connection said as a lost connection.');
    }
  }
  console.log('Account HTTP smoke passed. Not real Auth or RLS.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
