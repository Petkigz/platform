// Real Next /learn route against an entirely synthetic loopback Auth/REST API.
// This is not evidence about hosted Supabase, JWT validation or RLS.
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
const rows = [
  { id: 'own-enrolment', status: 'active', enrolled_at: '2026-01-01T00:00:00Z', learner_profile_id: 'own', course_version_id: 'v1', learner_profiles: [{ display_name: 'Adult', learner_type: 'adult' }], courses: [{ title: 'Synthetic adult course', slug: 'adult-course' }], course_versions: [{ version_number: 1, language: 'en' }] },
  { id: 'child-enrolment', status: 'active', enrolled_at: '2026-01-01T00:00:00Z', learner_profile_id: 'child', course_version_id: 'v2', learner_profiles: [{ display_name: 'Synthetic child', learner_type: 'child' }], courses: [{ title: 'Synthetic child course', slug: 'child-course' }], course_versions: [{ version_number: 2, language: 'en' }] },
];
let enabled = false; let flagOutage = false; let profileOutage = false; let newcomer = false;
// Off for the original three states, which pin that an empty outline makes no
// carry-on card; on for the language checks, which need the card to read.
let outline = false;
const sections = [{ course_version_id: 'v1', id: 's1', title: 'Synthetic section', position: 1, lessons: [
  { id: 'l1', title: 'Synthetic lesson one', position: 1 }, { id: 'l2', title: 'Synthetic lesson two', position: 2 }, { id: 'l3', title: 'Synthetic lesson three', position: 3 }] }];
const progress = [
  { course_enrolment_id: 'own-enrolment', lesson_id: 'l1', status: 'completed', last_seen_at: '2026-01-02T00:00:00Z' },
  { course_enrolment_id: 'own-enrolment', lesson_id: 'l2', status: 'in_progress', last_seen_at: '2026-01-03T00:00:00Z' }];
let active = 0; let maximum = 0; const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{}'); return; }
  active++; maximum = Math.max(maximum, active);
  let body = ''; for await (const chunk of req) body += chunk;
  const path = new URL(req.url, 'http://localhost').pathname;
  // The real server compares a column with the *word* "null" when asked
  // `eq.null`, and on a date column that is an error, not an empty answer.
  // These stand-ins used to answer it like any other request, which is how
  // eight such reads went unnoticed.
  if ([...new URL(req.url, 'http://localhost').searchParams.values()].some((value) => /^(?:not\.)?(?:eq|neq)\.(?:null|undefined)$/.test(value))) {
    res.writeHead(400); res.end(JSON.stringify({ code: '22007', message: 'invalid input syntax for type timestamp with time zone: "null"' })); return;
  }
  const payload = body ? JSON.parse(body) : null;
  calls.push({ path, payload });
  // Deterministic artificial delay makes overlapping requests observable, not
  // a benchmark or a simulation of hosted network performance.
  await new Promise((r) => setTimeout(r, 40));
  if (path === '/rest/v1/rpc/setting_bool') {
    if (flagOutage) { res.writeHead(503); res.end('{"message":"simulated outage"}'); }
    else res.end(JSON.stringify(enabled && ['learning.progress', 'companion.calculated_prayer_times'].includes(payload.p_key)));
  } else if (path === '/rest/v1/user_profiles') {
    if (profileOutage) { res.writeHead(503); res.end('{"message":"simulated profile failure"}'); }
    else res.end(JSON.stringify([{ display_name: 'Synthetic learner' }]));
  } else if (path === '/rest/v1/learner_profiles') res.end(JSON.stringify(newcomer ? [] : [{ id: 'own' }]));
  else if (path === '/rest/v1/course_enrolments') res.end(JSON.stringify(newcomer ? [] : rows));
  else if (path === '/rest/v1/course_wishlist') { res.setHeader('content-range', '*/0'); res.end(); }
  else if (path === '/rest/v1/rpc/enrolment_progress_summary') {
    res.end(JSON.stringify({ lessons_total: 4, lessons_done: payload.p_enrolment_id === 'own-enrolment' ? 1 : 0, percent_complete: payload.p_enrolment_id === 'own-enrolment' ? 25 : 0 }));
  } else if (path === '/rest/v1/lesson_progress') res.end(JSON.stringify(outline ? progress : []));
  else if (path === '/rest/v1/course_sections') res.end(JSON.stringify(outline ? sections : []));
  else { res.writeHead(404); res.end('{}'); }
  active--;
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
  const request = (headers = {}) => fetch(`http://localhost:${port}/learn`, { headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const anonymous = await request();
  assert.equal(anonymous.status, 307);
  const redirect = new URL(anonymous.headers.get('location'), `http://localhost:${port}`);
  assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), '/learn');
  for (const state of ['off', 'on', 'outage']) {
    enabled = state === 'on'; flagOutage = state === 'outage'; profileOutage = state === 'outage'; calls.length = 0; maximum = 0;
    const response = await request({ cookie }); const html = await response.text();
    assert.equal(response.status, 200, state);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.match(html, /Synthetic adult course/); assert.match(html, /Synthetic child course/);
    assert.match(html, /Synthetic child/); assert.match(html, /Me/);
    assert.equal(html.includes('aria-label="Synthetic adult course progress"'), state === 'on');
    assert.equal(html.includes('Open prayer times'), state === 'on');
    assert.equal(html.includes('Could not load your profile.'), state === 'outage');
    assert.equal(calls.filter((c) => c.path === '/rest/v1/rpc/enrolment_progress_summary').length, 2);
    assert.equal(calls.some((c) => c.path === '/rest/v1/rpc/my_live_sessions'), false);
    assert.equal(calls.some((c) => c.path === '/rest/v1/lesson_progress'), state === 'on');
    assert.ok(maximum >= 2, `independent synthetic REST calls did not overlap in ${state}`);
    assert.equal(html.includes('carry-on'), false, `${state}: a carry-on card with no outline to read`);
  }

  // ---------------------------------------------------------------- languages
  // The dashboard in the reader's language. Twenty-seven languages have it; a
  // language with a part held for review reads this screen in English, marked
  // as English; a withheld language is English throughout. The expected
  // sentences are typed here rather than imported, so this fails if a catalogue
  // changes without anybody looking at the page.
  enabled = true; flagOutage = false; profileOutage = false; outline = true;
  const digits = (code, value) => new Intl.NumberFormat(code).format(value);
  const wrapper = (html) => html.match(/<div class="container section learner-dashboard"([^>]*)>/)?.[1];
  const root = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  const page = async (headers) => { const response = await request({ cookie, ...headers }); assert.equal(response.status, 200); return response.text(); };

  const english = await page({ 'accept-language': 'en' });
  for (const sentence of ['Assalamu alaikum, Synthetic learner', 'Signed in as ', 'Learning shortcuts', 'Account settings', 'Saved courses', 'On this device', 'Ask about a lesson', 'Sign out', 'Your courses', 'In progress', '1 of 4 lessons · 25%', '0 of 4 lessons · 0%', 'Start course', 'Carry on where you stopped', 'Continue lesson 2', 'Lesson 2 of 3', 'Synthetic lesson two', 'Browse the catalogue']) {
    assert.ok(english.includes(sentence), `English dashboard lost "${sentence}"`);
  }
  assert.equal(wrapper(english), '', 'an English page marks its own dashboard as a different language');
  assert.match(english, /<bdi dir="ltr">probe@example\.invalid<\/bdi>/);

  const two = digits('ar', 2); const three = digits('ar', 3);
  const arabic = await page({ 'accept-language': 'ar' });
  assert.match(root(arabic), /lang="ar"/); assert.match(root(arabic), /dir="rtl"/);
  assert.equal(wrapper(arabic), '', 'the Arabic dashboard is Arabic and needs no wrapper');
  for (const sentence of ['السلام عليكم، Synthetic learner', 'تم تسجيل الدخول باسم ', 'aria-label="اختصارات التعلّم"', 'إعدادات الحساب', 'الدورات المحفوظة', 'على هذا الجهاز', 'السؤال عن درس', 'تسجيل الخروج', 'دوراتك', 'قيد التقدّم', `الدروس: ${digits('ar', 1)} من ${digits('ar', 4)} · ${digits('ar', 25)}%`, 'بدء الدورة', 'aria-label="التقدّم في Synthetic adult course"', 'المتابعة من حيث توقفت', `متابعة الدرس ${two}`, `الدرس ${two} من ${three}`, 'Synthetic lesson two', 'Synthetic section', 'أنا']) {
    assert.ok(arabic.includes(sentence), `Arabic dashboard lacks "${sentence}"`);
  }
  for (const sentence of ['Your courses', 'Signed in as', 'Learning shortcuts', 'Account settings', 'In progress', 'Start course', 'Continue lesson', 'Carry on where', 'Lesson 2 of 3', 'of 4 lessons', '{']) {
    assert.ok(!arabic.slice(arabic.indexOf('learner-dashboard'), arabic.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').includes(sentence), `Arabic dashboard still says "${sentence}"`);
  }
  // The address keeps its own direction inside the Arabic sentence.
  assert.match(arabic, /<bdi dir="ltr">probe@example\.invalid<\/bdi>/);

  // The reader's own choice from /language outranks the device.
  const french = await page({ 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` });
  assert.match(root(french), /lang="fr"/);
  for (const sentence of ['Assalamou alaykoum, Synthetic learner', 'Vos cours', 'Reprenez là où vous en étiez', 'Continuer la leçon 2', 'Leçon 2 sur 3', '1 sur 4 leçons · 25 %']) {
    assert.ok(french.includes(sentence), `French dashboard lacks "${sentence}"`);
  }

  // Hausa has its companion text held, so this screen was not written for it:
  // Hausa frame, English dashboard, and the dashboard says it is English.
  const hausa = await page({ 'accept-language': 'ha' });
  assert.match(root(hausa), /lang="ha"/);
  assert.equal(wrapper(hausa), ' lang="en" dir="ltr"');
  for (const sentence of ['Your courses', 'Carry on where you stopped', 'Lesson 2 of 3', '1 of 4 lessons · 25%', 'Open prayer times']) assert.ok(hausa.includes(sentence), `Hausa reader's dashboard lacks English "${sentence}"`);

  // Pashto is right-to-left with the same hold: the English must not inherit it.
  const pashto = await page({ 'accept-language': 'ps' });
  assert.match(root(pashto), /lang="ps"/); assert.match(root(pashto), /dir="rtl"/);
  assert.equal(wrapper(pashto), ' lang="en" dir="ltr"');

  // A new account: no learner profile and nothing enrolled. The prompt that
  // makes one is in the reader's language, button included, and in English for
  // a language that has no dashboard of its own.
  newcomer = true;
  {
    const inner = (html) => html.slice(html.indexOf('learner-empty'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '');
    const en = inner(await page({ 'accept-language': 'en' }));
    for (const sentence of ['Enrolling needs a learner profile, and this account does not have one yet.', 'Learn on this account', 'A course is always for a named learner. This makes you one on this account.']) assert.ok(en.includes(sentence), `English prompt lost "${sentence}"`);
    assert.equal(en.includes('lang="en"'), false);
    const ar = inner(await page({ 'accept-language': 'ar' }));
    for (const sentence of ['التسجيل في دورة يتطلب ملف متعلّم', 'التعلّم على هذا الحساب', 'كل دورة تكون لمتعلّم واحد باسمه.']) assert.ok(ar.includes(sentence), `Arabic prompt lacks "${sentence}"`);
    for (const sentence of ['Enrolling needs', 'Learn on this account', 'A course is always']) assert.equal(ar.includes(sentence), false, `Arabic prompt still says "${sentence}"`);
    assert.equal(ar.includes('lang="en"'), false, 'the Arabic prompt is still marked as English');
    const ha = await page({ 'accept-language': 'ha' });
    assert.equal(wrapper(ha), ' lang="en" dir="ltr"'); assert.ok(inner(ha).includes('Learn on this account'));
  }
  newcomer = false;

  // Wolof is withheld whole: English everywhere, so nothing to mark.
  const wolof = await page({ 'accept-language': 'wo, fr' });
  assert.match(root(wolof), /lang="en"/);
  assert.equal(wrapper(wolof), '');
  assert.ok(wolof.includes('Your courses') && !wolof.includes('Vos cours'));
  console.log(`Learner dashboard languages: English, Arabic (right-to-left, digits ${two}/${three}, address isolated), French by the reader's own choice over an Arabic device, carry-on card in each; Hausa and Pashto frames with an English dashboard marked lang="en" dir="ltr"; Wolof-then-French device in English. Synthetic backend; no translation here has been read by a speaker.`);
  outline = false;
  console.log('Learner dashboard HTTP smoke passed: anonymous redirect, own/child labels, flags off/on/outage, profile error, no-store, gated calls and overlapping synthetic reads. Not real Auth or RLS.');
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    enabled = true; flagOutage = false; profileOutage = false;
    for (const width of [320, 390, 768, 1440, 1920, 2560]) {
      outline = false;
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: `http://localhost:${port}` }]);
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/learn`, { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => {
        const area = document.querySelector('.learner-dashboard');
        const grid = document.querySelector('.learner-course-grid');
        if (!area || !grid) throw new Error('Synthetic learner dashboard missing');
        return { scroll: document.documentElement.scrollWidth, area: area.getBoundingClientRect().width,
          // How close the page's own blocks come to either edge of the screen.
          gutter: [...area.children].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(c).position !== 'fixed'; }).reduce((least, c) => { const r = c.getBoundingClientRect(); return Math.min(least, r.left, document.documentElement.clientWidth - r.right); }, Infinity),
          columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length };
      });
      assert.ok(metrics.scroll <= width + 1, `${width}: page overflow ${metrics.scroll}`);
      assert.ok(metrics.area >= width - 1, `${width}: learner area not full-width`);
      assert.ok(metrics.gutter >= 16, `${width}: dashboard content is ${metrics.gutter}px from the edge of the screen`);
      assert.equal(metrics.columns, width >= 1920 ? 4 : width >= 1280 ? 3 : width >= 736 ? 2 : 1);
      assert.equal(await page.getByRole('navigation', { name: 'Learning shortcuts' }).count(), 1);
      assert.equal(await page.locator('.learner-shortcuts form[action="/sign-out"] button').count(), 1);
      assert.equal(await page.getByText('Synthetic adult course').count(), 1);
      assert.equal(await page.getByText('Synthetic child course').count(), 1);
      assert.equal(await page.getByText('Synthetic child', { exact: true }).count(), 1);
      assert.equal(await page.getByText('Me', { exact: true }).count(), 1);
      if (process.env.RESPONSIVE_SCREENSHOTS && [390, 1440].includes(width)) await page.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/dashboard-en-${width}.png`, fullPage: true });
      console.log(`Synthetic learner dashboard ${width}: no overflow, ${metrics.columns} columns, distinct learner labels`);
      await context.close();
    }
    // The same screen in Arabic and in Tamil (long words), with the carry-on
    // card: nothing may push the page sideways, and the page must be mirrored.
    outline = true;
    for (const [code, heading, shortcuts] of [['ar', 'دوراتك', 'اختصارات التعلّم'], ['ta', 'உங்கள் பாடநெறிகள்', 'கற்றல் குறுக்குவழிகள்']]) {
      for (const width of [320, 390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
        await context.addCookies([
          { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: `http://localhost:${port}` },
          { name: 'ayahspring_locale', value: code, url: `http://localhost:${port}` },
        ]);
        const page = await context.newPage();
        const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(`http://localhost:${port}/learn`, { waitUntil: 'networkidle' });
        assert.equal(await page.evaluate(() => document.documentElement.lang), code);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth) <= width + 1, true, `${code} ${width}: the dashboard scrolls sideways`);
        assert.equal(await page.getByRole('heading', { name: heading, exact: true }).count(), 1, `${code} ${width}: heading`);
        assert.equal(await page.getByRole('navigation', { name: shortcuts }).count(), 1, `${code} ${width}: shortcuts`);
        assert.equal(await page.locator('.carry-on').count(), 1, `${code} ${width}: carry-on card`);
        const inside = await page.locator('.carry-on').evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 1 && el.scrollWidth <= el.clientWidth + 1; });
        assert.ok(inside, `${code} ${width}: the carry-on card does not fit`);
        if (code === 'ar') {
          // Mirrored: the heading starts at the right-hand edge of its column.
          const side = await page.locator('.learner-welcome h1').evaluate((el) => getComputedStyle(el).direction);
          assert.equal(side, 'rtl');
        }
        assert.deepEqual(errors, [], `${code} ${width}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && [390, 1440].includes(width)) await page.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/dashboard-${code}-${width}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic learner dashboard in ${code}: fits at 320, 390 and 1440px with the carry-on card, heading and shortcuts in that language`);
    }
  }
} catch (e) { console.error(logs); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
