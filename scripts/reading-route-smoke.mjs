// Real Next /account/accessibility page (the reading settings) against an
// entirely synthetic loopback Auth/REST API. This is not evidence about hosted
// Supabase, and it is not evidence that a person who relies on a screen
// reader, a switch or a magnifier can use the platform: no such person has
// tested it, and the page says so.
//
// What it does show: the page is sent to a reader who is not signed in, in
// English, in Arabic, in Persian with the count of languages in its own
// digits, in French by the reader's own choice, and in English for a language
// held for review; the count of languages and the list of right-to-left ones
// come from the register. In a browser: the first press of Tab shows the link
// that skips to the content; each of the four settings changes the document
// the moment it is chosen and is still there on the next page (the fourth,
// the letters, brings its font from this site and asks it for no Arabic); "saved" is
// said only when the browser kept the cookie, and a browser that keeps
// nothing is told so; the outline is thicker with stronger outlines on,
// including on the links in the top bar; and every input on three public
// pages has a name a screen reader can announce. The expected sentences are
// typed here rather than imported, so this fails if a catalogue changes
// without anybody looking at the page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '5b0f6a3e-0d0b-4c55-9a0e-6f2f5a3c1d77', aud: 'authenticated', role: 'authenticated', email: 'probe@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;

const calls = [];
const fake = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const json = { 'content-type': 'application/json' };
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{"message":"not authenticated"}'); return; }
    res.writeHead(200, json); res.end(JSON.stringify(user)); return;
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  calls.push({ method: req.method, path, signedIn: req.headers.authorization === `Bearer ${token}` });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Synthetic learner', account_status: 'active', deleted_at: null, preferred_language: 'en', timezone: null }]);
  else if (path.startsWith('/rest/v1/rpc/')) send(null);
  else if (path.startsWith('/rest/v1/')) send([]);
  else send({}, 404);
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const root = resolve(import.meta.dirname, '..');
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon-key' },
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
  const PATH = '/account/accessibility';
  const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  // The page itself: what is inside <main>, without the scripts Next adds.
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('&#x27;', '’').replaceAll('<!-- -->', '');
  const footer = (html) => html.slice(html.indexOf('<footer'), html.indexOf('</footer>')).replaceAll('<!-- -->', '');
  const wrapper = (html) => inner(html).match(/<div class="page narrow"([^>]*)>/)?.[1];
  const page = async (headers) => { const response = await request(PATH, headers); assert.equal(response.status, 200, `${PATH}\n${logs.slice(-2000)}`); return response.text(); };
  const ENGLISH_ONLY = ['How this reads', 'Four settings', 'Text size', 'Stronger outlines', 'Follow my device', 'Always reduce', 'Back to the defaults', 'already true', 'The keyboard works', 'not here yet', 'Not tested with a screen reader', 'A font made for dyslexia', 'can be read aloud', 'Languages offered', 'These are the settings', 'Reading preferences'];

  // ------------------------------------------------- not signed in, English
  // The page used to send this reader to sign in: somebody who needed larger
  // text to read the sign-in form could not get it.
  const anonymous = await page({ 'accept-language': 'en' });
  for (const sentence of [
    'How this reads', 'You do not need to be signed in to use them.', 'These are the settings in this browser.',
    'Text size', 'Normal', 'Larger', 'Largest', 'Two steps up. Rows that sit side by side stack, so words are not squeezed.',
    'Contrast', 'Stronger outlines', 'Motion', 'Follow my device', 'Always reduce motion', 'Back to the defaults',
    'What is already true without setting anything', 'The keyboard works.', 'Text colours are measured.',
    'Languages offered besides English: 46.', 'are in English for everyone',
    'No translation has been read by a first-language speaker yet.',
    // 2026-11-27: the fourth setting, and reading aloud, which this page used to list as missing.
    'Four settings', 'Letters', 'As on your device', 'A font made for dyslexia',
    'It changes Latin and Cyrillic letters only', 'studies have not shown that it helps everyone',
    'A lesson can be read aloud.', 'The words are sent nowhere.', 'a verse is not for a machine’s voice',
    'What is not here yet', 'Not tested with a screen reader.', 'nobody who relies on one has tested it yet',
  ]) assert.ok(inner(anonymous).includes(sentence), `English reading page lost "${sentence}"`);
  assert.equal(wrapper(anonymous), '', 'an English page marks its own reading page as a different language');
  assert.equal(inner(anonymous).includes('{'), false, 'a gap in an English sentence was left unfilled');
  // What used to be on it and was never measured, or was false.
  for (const gone of ['Every input', 'Every button', 'no control is reachable', 'thirty-three', 'All of them are complete', 'fully translated']) {
    assert.equal(inner(anonymous).toLowerCase().includes(gone.toLowerCase()), false, `the reading page still says "${gone}"`);
  }
  // Nobody is signed in, so nothing points at an account.
  assert.equal(inner(anonymous).includes('href="/account"'), false, 'a signed-out reader is offered the way back to an account');
  assert.equal(inner(anonymous).includes('Back to my account'), false);
  assert.match(inner(anonymous), /<nav class="crumbs"><span>Reading<\/span><\/nav>/);
  // With no cookie the three defaults are the ones marked.
  // React writes an input's attributes in an order of its own.
  const inputs = (html) => [...inner(html).matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((m) => ({ name: m[0].match(/name="(\w+)"/)?.[1], value: m[0].match(/value="(\w+)"/)?.[1], on: /\bchecked=""/.test(m[0]) }));
  const radios = (html) => inputs(html).map((i) => `${i.name}=${i.value}`);
  const checked = (html) => inputs(html).filter((i) => i.on).map((i) => `${i.name}=${i.value}`);
  assert.deepEqual(radios(anonymous), ['text=normal', 'text=large', 'text=larger', 'contrast=normal', 'contrast=high', 'motion=system', 'motion=reduce', 'letters=normal', 'letters=dyslexic']);
  assert.deepEqual(checked(anonymous), ['text=normal', 'contrast=normal', 'motion=system', 'letters=normal']);
  assert.equal((inner(anonymous).match(/<fieldset class="card reading-choices"><legend>/g) ?? []).length, 4, 'each group of choices is a fieldset with a legend');
  // The five right-to-left languages a reader can choose, each in its own
  // script and marked as that language. Dhivehi is right-to-left and
  // withheld, so it is not promised.
  for (const [code, name] of [['ar', 'العربية'], ['ur', 'اردو'], ['fa', 'فارسی'], ['ps', 'پښتو'], ['fa-af', 'دری']]) {
    assert.ok(inner(anonymous).includes(`<bdi lang="${code}">${name}</bdi>`), `the right-to-left list lost ${code}`);
  }
  assert.equal(inner(anonymous).includes('ދިވެހި'), false, 'a withheld language is promised');
  assert.match(inner(anonymous), /<a href="\/language">Language<\/a>/);
  // The first thing in the body is the link that skips to the content, and the
  // way to this page is in the footer of the page nobody is signed in to.
  const body = anonymous.slice(anonymous.indexOf('<body'));
  assert.equal(body.match(/<(?:a|button|input|select|textarea)\b[^>]*>[^<]*(?:<\/a>)?/)?.[0], '<a href="#main" class="skip-link">Skip to content</a>', 'the skip link is not the first thing in the body a keyboard can reach');
  assert.match(footer(anonymous), /<a lang="en" dir="ltr" href="\/account\/accessibility">Reading preferences<\/a>/);
  assert.match(anonymous, /<title>How this reads/);
  const home = await request('/', { 'accept-language': 'en' });
  assert.equal(home.status, 200);
  assert.match(footer(await home.text()), /href="\/account\/accessibility">Reading preferences<\/a>/);

  // ------------------------------------------------------ the cookie is read
  const kept = await page({ 'accept-language': 'en', cookie: 'ayahspring_a11y=v1.larger.high.reduce' });
  assert.deepEqual(checked(kept), ['text=larger', 'contrast=high', 'motion=reduce', 'letters=normal']);
  assert.match(inner(kept), /<span class="muted">Text size<\/span> <strong>Largest<\/strong>/);
  assert.match(inner(kept), /<span class="muted">Contrast<\/span> <strong>Stronger outlines<\/strong>/);
  assert.match(inner(kept), /<span class="muted">Motion<\/span> <strong>Always reduce motion<\/strong>/);
  // A cookie nobody wrote is the defaults, not an error.
  // The fourth setting is a fifth part of the cookie, and an older cookie has none.
  const lettered = await page({ 'accept-language': 'en', cookie: 'ayahspring_a11y=v1.normal.normal.system.dyslexic' });
  assert.deepEqual(checked(lettered), ['text=normal', 'contrast=normal', 'motion=system', 'letters=dyslexic']);
  assert.match(inner(lettered), /<span class="muted">Letters<\/span> <strong>A font made for dyslexia<\/strong>/);
  // The font is asked for by the stylesheet, never by the page: nobody who did not choose it is sent it.
  for (const html of [anonymous, lettered]) assert.equal(/opendyslexic/i.test(html.replace(/A font made for dyslexia|OpenDyslexic: each letter/g, '')), false, 'the page itself names the font file');
  const nonsense = await page({ 'accept-language': 'en', cookie: 'ayahspring_a11y=v9.enormous.%E0%A4%A' });
  assert.deepEqual(checked(nonsense), ['text=normal', 'contrast=normal', 'motion=system', 'letters=normal']);

  // -------------------------------------------------------------- signed in
  const member = await page({ 'accept-language': 'en', cookie });
  assert.match(inner(member), /<nav class="crumbs"><a href="\/account">Account settings<\/a><span aria-hidden="true">›<\/span><span>Reading<\/span><\/nav>/);
  assert.match(inner(member), /<a class="btn secondary" href="\/account">Back to my account<\/a>/);
  assert.equal(inner(member).includes('You do not need to be signed in to use them.'), true);

  // ----------------------------------------------------------------- Arabic
  const arabic = await page({ 'accept-language': 'ar' });
  assert.match(htmlRoot(arabic), /lang="ar"/); assert.match(htmlRoot(arabic), /dir="rtl"/);
  assert.equal(wrapper(arabic), '', 'an Arabic reader’s page is marked as another language');
  for (const sentence of ['طريقة العرض', 'هذه هي الإعدادات في هذا المتصفّح.', 'حجم النص', 'الأكبر', 'حدود أوضح', 'قلّل الحركة دائمًا', 'العودة إلى الإعدادات الافتراضية', 'عدد اللغات المعروضة غير الإنجليزية: 46.', 'أربعة إعدادات', 'خط مصمَّم لعسر القراءة', 'يغيّر الحروف اللاتينية والسيريلية فقط', 'يمكن قراءة الدرس بصوت مسموع.', 'فالآية لا تُقرأ بصوت آلة.', 'لم تُختبر بقارئ شاشة.']) {
    assert.ok(inner(arabic).includes(sentence), `Arabic reading page lost "${sentence}"`);
  }
  for (const word of ENGLISH_ONLY) assert.equal(inner(arabic).includes(word), false, `Arabic reading page still says "${word}"`);
  assert.equal(inner(arabic).includes('{'), false, 'a gap in an Arabic sentence was left unfilled');
  assert.ok(inner(arabic).includes('<bdi lang="fa-af">دری</bdi>'));
  assert.match(inner(arabic), /<a href="\/language">اللغة<\/a>/);
  assert.match(arabic, /<a href="#main" class="skip-link">تخطَّ إلى المحتوى<\/a>/);
  assert.match(footer(arabic), /<a lang="ar" dir="rtl" href="\/account\/accessibility">تفضيلات القراءة<\/a>/);
  assert.match(arabic, /<title>طريقة العرض/);

  // ---------------------------------------------- Persian: its own digits
  const persian = await page({ 'accept-language': 'fa' });
  assert.ok(inner(persian).includes('شمار زبان‌های عرضه‌شده جز انگلیسی: ۴۶.'), 'the count of languages is not in Persian digits');
  assert.ok(inner(persian).includes('شیوهٔ نمایش'));
  assert.ok(inner(persian).includes('قلمی که برای خوانش‌پریشی ساخته شده') && inner(persian).includes('آیه برای صدای ماشین نیست.'), 'the Persian page lost the fourth setting or reading aloud');

  // ------------------------------------------------ French, by own choice
  const french = await page({ 'accept-language': 'ar', cookie: 'ayahspring_locale=fr' });
  assert.match(htmlRoot(french), /lang="fr"/);
  for (const sentence of ['Confort de lecture', 'Taille du texte', 'La plus grande', 'Contours renforcés', 'Toujours réduire le mouvement', 'Nombre de langues proposées en plus de l’anglais\u00a0: 46.', 'Quatre réglages', 'Une police conçue pour la dyslexie', 'Une leçon peut être lue à voix haute.', 'Non testée avec un lecteur d’écran.']) {
    assert.ok(inner(french).includes(sentence), `French reading page lost "${sentence}"`);
  }
  for (const word of ENGLISH_ONLY) assert.equal(inner(french).includes(word), false, `French reading page still says "${word}"`);
  assert.deepEqual(checked(french), ['text=normal', 'contrast=normal', 'motion=system', 'letters=normal']);

  // ------------------------------------- a language held for review: English
  for (const [code, dir, languageName] of [['ha', 'ltr', 'Harshe'], ['ps', 'rtl', 'ژبه']]) {
    const held = await page({ 'accept-language': code });
    assert.match(htmlRoot(held), new RegExp(`lang="${code}"`));
    assert.equal(wrapper(held), ' lang="en" dir="ltr"', `${code}: the English page is not marked as English`);
    assert.ok(inner(held).includes('How this reads') && inner(held).includes('Languages offered besides English: 46.'), `${code}: not the English page, whole`);
    // The way to the language page stays in the reader's language, marked.
    const link = inner(held).match(/<p[^>]*lang="([^"]+)"[^>]*dir="([^"]+)"[^>]*><a href="\/language">([^<]+)<\/a><\/p>/);
    assert.ok(link, `${code}: no link to the language page`);
    assert.equal(link[1], code); assert.equal(link[2], dir);
    if (code === 'ha') assert.equal(link[3], languageName);
    assert.match(footer(held), /<a lang="en" dir="ltr" href="\/account\/accessibility">Reading preferences<\/a>/);
  }
  // A language withheld whole is English throughout.
  const withheld = await page({ 'accept-language': 'wo' });
  assert.match(htmlRoot(withheld), /lang="en"/);
  assert.equal(wrapper(withheld), '');

  // Nothing on this page asked the database a question as nobody about
  // anybody: the settings are a cookie.
  assert.equal(calls.some((c) => c.path === '/rest/v1/user_profiles' && !c.signedIn), false);
  console.log('Reading page: open to a reader who is not signed in (200, no way back to an account offered); signed in adds the crumb and the way back; the cookie marks the four choices (the fourth, the letters, is a fifth part an older cookie does not have) and a cookie nobody wrote is the defaults; English, Arabic, Persian (46 languages in its own digits), French by choice; Hausa and Pashto readers get it in English, marked, with the language link in their own language; a withheld language is English throughout; five right-to-left languages named from the register, each marked as itself; the skip link is first in the body and the footer of every page leads here.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (path, code, width, { cookies = [], refuseCookies = false } = {}) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'ayahspring_locale', value: code, url: origin }, ...cookies.map((c) => ({ ...c, url: origin }))]);
      // A browser set to refuse cookies takes the assignment and keeps nothing.
      if (refuseCookies) await context.addInitScript(() => { Object.defineProperty(Document.prototype, 'cookie', { configurable: true, get: () => '', set: () => {} }); });
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 40)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card, main .notice')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
      assert.equal(spill, 0, `${label}: a card's contents are wider than the card`);
    };
    const attributes = (tab) => tab.evaluate(() => { const h = document.documentElement; return [h.getAttribute('data-text'), h.getAttribute('data-contrast'), h.getAttribute('data-motion')]; });
    const rootSize = (tab) => tab.evaluate(() => getComputedStyle(document.documentElement).fontSize);
    const stored = async (context) => (await context.cookies(origin)).find((c) => c.name === 'ayahspring_a11y')?.value ?? null;
    const unnamed = (tab) => tab.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]), select, textarea')]
      .filter((el) => !(el.labels && el.labels.length > 0) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
      .map((el) => `${el.tagName.toLowerCase()}[name=${el.getAttribute('name')}]`));

    // ---------------------------------------------- the first press of Tab
    {
      const { context, tab, errors } = await open(PATH, 'en', 1280);
      const skip = tab.locator('a.skip-link');
      const before = await skip.boundingBox();
      assert.ok(before && before.y + before.height <= 0, 'the skip link is on the page before anything is focused');
      await tab.keyboard.press('Tab');
      assert.equal(await tab.evaluate(() => document.activeElement?.className), 'skip-link', 'the first stop is not the skip link');
      // It moves into place over a moment; wait for that to end.
      await tab.waitForFunction(() => { const r = document.querySelector('a.skip-link').getBoundingClientRect(); return r.top >= 0 && r.height > 20 && r.width > 60; });
      const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
      assert.notEqual(outline, 'none', 'the skip link has no outline when the keyboard is on it');
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/reading-skip-link.png` });
      await tab.keyboard.press('Enter');
      assert.equal(new URL(tab.url()).hash, '#main');
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Skip link in a browser: off the page until the first Tab, then visible at the top with an outline, and Enter goes to the content.');
    }

    // ------------------------------------------------ the three settings
    {
      const { context, tab, errors } = await open(PATH, 'en', 1280);
      const main = tab.locator('main');
      assert.equal(await stored(context), null);
      assert.deepEqual(await attributes(tab), [null, null, null]);
      assert.equal(await rootSize(tab), '16px');
      assert.equal(await main.getByRole('status').filter({ hasText: 'These are the settings in this browser.' }).count(), 1);
      assert.equal(await main.getByRole('alert').count(), 0);
      // Four groups, each announced by its legend, and every choice by its name.
      for (const group of ['Text size', 'Contrast', 'Motion', 'Letters']) assert.equal(await main.getByRole('group', { name: group, exact: true }).count(), 1, group);
      assert.equal(await main.getByRole('radio').count(), 9);
      assert.deepEqual(await unnamed(tab), [], 'a control on the reading page has no name');

      // Largest: the document changes at once, with no button to press.
      await main.getByRole('radio', { name: /^Largest/ }).check();
      assert.deepEqual(await attributes(tab), ['larger', null, null]);
      assert.equal(await rootSize(tab), '20px');
      assert.equal(await stored(context), 'v1.larger.normal.system');
      assert.equal(await main.getByRole('status').filter({ hasText: 'Saved for this browser.' }).count(), 1);
      assert.equal(await main.getByRole('status').locator('li').nth(0).innerText(), 'Text size Largest');

      // Stronger outlines: white behind the page, and a thicker outline around
      // whatever the keyboard is on, the links in the top bar included.
      const background = () => tab.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const pale = await background();
      const thin = await tab.evaluate(() => { const el = document.querySelector('main input[type=radio]'); el.focus(); return getComputedStyle(el).outlineWidth; });
      await main.getByRole('radio', { name: /^Stronger outlines/ }).check();
      assert.deepEqual(await attributes(tab), ['larger', 'high', null]);
      assert.notEqual(pale, 'rgb(255, 255, 255)');
      assert.equal(await background(), 'rgb(255, 255, 255)');
      await tab.keyboard.press('Tab');
      const thick = await tab.evaluate(() => getComputedStyle(document.activeElement).outlineWidth);
      assert.ok(Number.parseFloat(thick) > Number.parseFloat(thin) || thin === '0px', `outline ${thin} did not get thicker (${thick})`);
      assert.equal(thick, '3px');
      // The top bar: Tab from the start of the page past the skip link.
      await tab.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await tab.locator('a.skip-link').focus();
      let bar = null;
      for (let i = 0; i < 12 && !bar; i += 1) {
        await tab.keyboard.press('Tab');
        bar = await tab.evaluate(() => { const el = document.activeElement; return el && el.matches('.masthead-inner .nav *, .masthead-inner .nav') ? getComputedStyle(el).outlineWidth : null; });
      }
      assert.equal(bar, '3px', 'a link in the top bar keeps the thin outline, or the keyboard never reached one');
      assert.equal(await stored(context), 'v1.larger.high.system');

      // Always reduce motion: nothing on the page moves over time.
      await main.getByRole('radio', { name: /^Always reduce motion/ }).check();
      assert.deepEqual(await attributes(tab), ['larger', 'high', 'reduce']);
      const moving = await tab.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); return s.transitionDuration.split(',').some((d) => Number.parseFloat(d) > 0) || s.animationName !== 'none' || s.scrollBehavior === 'smooth'; }).length);
      assert.equal(moving, 0, 'something still moves with motion reduced');
      assert.equal(await stored(context), 'v1.larger.high.reduce');
      await fits(tab, 1280, 'reading en 1280, everything on');
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/reading-en-all-on.png`, fullPage: true });

      // The next page starts that way, before anything is drawn by a script
      // of the page: the settings are for the whole platform.
      await tab.goto(`${origin}/language`, { waitUntil: 'networkidle' });
      assert.deepEqual(await attributes(tab), ['larger', 'high', 'reduce']);
      assert.equal(await rootSize(tab), '20px');
      assert.deepEqual(await unnamed(tab), [], 'a control on the language page has no name');
      await tab.goto(`${origin}/sign-in`, { waitUntil: 'networkidle' });
      assert.deepEqual(await attributes(tab), ['larger', 'high', 'reduce']);
      assert.deepEqual(await unnamed(tab), [], 'a control on the sign-in page has no name');
      await fits(tab, 1280, 'sign-in at the largest size');

      // Back on the page the three are still marked, and one press undoes them.
      await tab.goto(`${origin}${PATH}`, { waitUntil: 'networkidle' });
      assert.equal(await main.getByRole('radio', { name: /^Largest/ }).isChecked(), true);
      assert.equal(await main.getByRole('radio', { name: /^Stronger outlines/ }).isChecked(), true);
      assert.equal(await main.getByRole('radio', { name: /^Always reduce motion/ }).isChecked(), true);
      assert.equal(await main.getByRole('status').filter({ hasText: 'These are the settings in this browser.' }).count(), 1);
      await main.getByRole('button', { name: 'Back to the defaults', exact: true }).click();
      assert.deepEqual(await attributes(tab), [null, null, null]);
      assert.equal(await rootSize(tab), '16px');
      assert.equal(await stored(context), 'v1.normal.normal.system');
      assert.equal(await main.getByRole('radio', { name: /^Normal/ }).first().isChecked(), true);
      assert.equal(await main.getByRole('alert').count(), 0);

      // The fourth setting, 2026-11-27: the letters. Chosen, the document is
      // marked at once, the font arrives from this site, and the page is set
      // in it; the cookie gains its fifth part. Undone, all of that goes.
      const lettersOf = () => tab.evaluate(() => document.documentElement.getAttribute('data-letters'));
      const face = () => tab.evaluate(() => getComputedStyle(document.querySelector('main p')).fontFamily);
      assert.equal(await lettersOf(), null);
      assert.doesNotMatch(await face(), /OpenDyslexic/);
      await main.getByRole('radio', { name: /^A font made for dyslexia/ }).check();
      assert.equal(await lettersOf(), 'dyslexic');
      assert.match(await face(), /^"?OpenDyslexic/);
      assert.equal(await stored(context), 'v1.normal.normal.system.dyslexic');
      const arrived = await tab.evaluate(async () => {
        const faces = await document.fonts.load('16px OpenDyslexic', 'Reading');
        return faces.map((f) => `${f.family.replaceAll('"', '')} ${f.weight} ${f.status}`);
      });
      assert.deepEqual(arrived, ['OpenDyslexic 400 loaded'], 'the font did not arrive from this site');
      // Arabic keeps its own letters: the font has none, and is not asked for any.
      assert.equal(await tab.evaluate(async () => (await document.fonts.load('16px OpenDyslexic', 'العربية')).length), 0);
      await fits(tab, 1280, 'reading en 1280, the dyslexia font');
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/reading-en-letters.png`, fullPage: true });
      await tab.goto(`${origin}/language`, { waitUntil: 'networkidle' });
      assert.equal(await lettersOf(), 'dyslexic', 'the next page does not start in the chosen letters');
      await tab.goto(`${origin}${PATH}`, { waitUntil: 'networkidle' });
      assert.equal(await main.getByRole('radio', { name: /^A font made for dyslexia/ }).isChecked(), true);
      await main.getByRole('button', { name: 'Back to the defaults', exact: true }).click();
      assert.equal(await lettersOf(), null);
      assert.doesNotMatch(await face(), /OpenDyslexic/);
      assert.equal(await stored(context), 'v1.normal.normal.system');
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Reading settings in a browser: the letters change to the dyslexia font and back (the font arrives from this site, Arabic is not asked of it, the next page starts in it); each of the three changes the document the moment it is chosen (root text 16px to 20px, white behind the page, outline 3px on a control and on the top bar, nothing left with a transition, an animation or smooth scrolling), "Saved for this browser." only after the cookie reads back, the language and sign-in pages start the same way, and one button puts the defaults back. Every input on the reading, language and sign-in pages has a name.');
    }

    // ------------------------------------- a browser that keeps no cookie
    {
      const { context, tab, errors } = await open(PATH, 'ar', 390, { refuseCookies: true });
      const main = tab.locator('main');
      assert.equal(await main.getByRole('alert').count(), 0);
      await main.getByRole('radio', { name: /^الأكبر/ }).check();
      // The page still changes: the reader asked for it.
      assert.deepEqual(await attributes(tab), ['larger', null, null]);
      const alert = main.getByRole('alert');
      assert.equal(await alert.count(), 1);
      assert.equal((await alert.innerText()).trim(), 'لم يحتفظ هذا المتصفّح بالإعداد. إنه يسري على هذه الصفحة فقط وسيزول في الصفحة التالية.');
      assert.equal(await main.getByText('حُفظت لهذا المتصفّح.').count(), 0, '"saved" is said by a browser that kept nothing');
      assert.equal(await stored(context), null);
      await fits(tab, 390, 'reading ar 390, cookie refused, largest');
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/reading-ar-not-kept.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
      console.log('A browser that keeps no cookie, in Arabic: the text still grows, one alert says the setting will be gone on the next page, and "saved" is not said.');
    }

    // ------------------------------------------------------------- it fits
    for (const [code, heading, direction] of [['en', 'How this reads', 'ltr'], ['ar', 'طريقة العرض', 'rtl'], ['fr', 'Confort de lecture', 'ltr'], ['ur', 'یہ کیسا دکھتا ہے', 'rtl']]) {
      for (const width of [320, 390, 1440]) {
        // The hardest case is the one the page exists for: the largest text
        // on the narrowest phone.
        for (const size of width === 1440 ? ['normal'] : ['normal', 'larger']) {
          const { context, tab, errors } = await open(PATH, code, width, { cookies: [{ name: 'ayahspring_a11y', value: `v1.${size}.normal.system` }] });
          assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
          assert.equal(await tab.evaluate(() => document.documentElement.dir), direction);
          assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
          assert.equal(await rootSize(tab), size === 'larger' ? '20px' : '16px');
          await fits(tab, width, `reading ${code} ${width} ${size}`);
          // Each name sits above its note rather than beside it in a squeezed column.
          const rows = await tab.locator('main ul.lessons.stacked li').evaluateAll((els) => els.map((el) => { const name = el.querySelector('strong').getBoundingClientRect(); const note = el.querySelector('div').getBoundingClientRect(); return note.top >= name.bottom - 1; }));
          assert.equal(rows.length, 12, `${code} ${width}: six things true, four about language, two missing`);
          assert.ok(rows.every(Boolean), `${code} ${width}: a note sits beside its name`);
          // A choice is its circle and then its words, on one line of the card.
          const choices = await tab.locator('main label.radio').evaluateAll((els) => els.map((el) => { const box = el.querySelector('input').getBoundingClientRect(); const words = el.querySelector('span').getBoundingClientRect(); return box.width > 8 && box.width < 40 && words.width > 100; }));
          assert.equal(choices.length, 7);
          assert.ok(choices.every(Boolean), `${code} ${width} ${size}: a choice's circle is stretched or its words are squeezed`);
          assert.deepEqual(errors, [], `${code} ${width}: page errors`);
          if (process.env.RESPONSIVE_SCREENSHOTS && (width === 1440 || (width === 390 && size === 'larger'))) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/reading-${code}-${width}-${size}.png`, fullPage: true });
          await context.close();
        }
      }
      console.log(`Synthetic reading page in ${code}: fits at 320, 390 and 1440px, and at 320 and 390px with the largest text; twelve names, each above its note; seven choices, each a circle beside its words`);
    }
  }
  console.log('Reading HTTP smoke passed. Not real Auth, and not a test by anybody who relies on a screen reader or a magnifier.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
