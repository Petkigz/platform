// The three companion tools in a real Chromium, against the real Next routes
// and a synthetic Supabase HTTP server.
//
// What this proves: the prayer tool calculates in the browser (not only in
// Node or a simulated DOM), reads the device's zone and location the way a
// browser hands them over, puts nothing about the location on the network or
// in the browser's storage, clears a result when the day changes, and lays out
// without sideways scrolling from a 320px phone to a 2560px desk in four
// languages, one of them right-to-left.
//
// What it does not prove: real Auth, PostgREST or RLS; a real location
// provider (the coordinates are the ones this script hands the browser); any
// browser but Chromium; the production build (this is `next dev`); the
// religious correctness of a method; or the quality of a translation.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.RESPONSIVE_PLAYWRIGHT || !process.env.RESPONSIVE_CHROME) {
  console.error('companion-browser-smoke needs RESPONSIVE_PLAYWRIGHT and RESPONSIVE_CHROME; it has no browserless mode.');
  process.exit(2);
}
const shots = process.env.RESPONSIVE_SCREENSHOTS || '';
if (shots) mkdirSync(shots, { recursive: true });

const encode = (x) => Buffer.from(JSON.stringify(x)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
// The three companion switches, and the correction sheet, which is where a
// held translation goes to be read.
const COMPANION_FLAGS = new Set(['companion.calculated_prayer_times', 'companion.hijri_date', 'companion.dhikr_counter', 'platform.translation_reviews']);

// Everything the synthetic backend is asked, so a coordinate that reached the
// server by any route — including one the page made server-side — is seen.
const backendSeen = [];
const fake = createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    backendSeen.push(`${req.method} ${req.url} ${body}`);
    if (req.url === '/auth/v1/user') {
      if (req.headers.authorization !== `Bearer ${token}`) { res.statusCode = 401; res.end('{"message":"not authenticated"}'); return; }
      res.end(JSON.stringify(user)); return;
    }
    if (req.url === '/rest/v1/rpc/setting_bool' && req.method === 'POST') {
      try { res.end(JSON.stringify(COMPANION_FLAGS.has(JSON.parse(body).p_key))); }
      catch { res.statusCode = 400; res.end('{}'); }
      return;
    }
    res.statusCode = 404; res.end('{}');
  });
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
const origin = `http://localhost:${port}`;
// Noon in Kampala on a fixed day, so the expected times below are constants.
const FIXED_NOW = new Date('2026-10-15T09:00:00Z');
const clean = (s) => s.replace(/[\u202f\u00a0]/g, ' ').trim();
// `companion.prayerTitle` in `web/src/lib/i18n/messages/en.ts`: what a reader is
// shown when their language has no companion text, or has it held for review.
const ENGLISH_TITLE = 'Calculated prayer times';

let logs = ''; let browser;
try {
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${logs}`)), 60000);
    const receive = (chunk) => { logs += chunk.toString(); if (logs.includes('Ready in')) { clearTimeout(timeout); resolveReady(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (e) => { clearTimeout(timeout); reject(e); });
    next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${logs}`)); });
  });
  const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
  browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });

  /** A signed-in tab in one language, zone and (optionally) granted location. */
  async function open({ locale = 'en', zone, width = 1440, geolocation = null, fixClock = true, chosen = locale, acceptLanguage = null }) {
    // `chosen` is the language cookie (null for a browser that never chose);
    // `acceptLanguage` replaces the header the browser would send for `locale`.
    const context = await browser.newContext({
      viewport: { width, height: 900 }, locale, timezoneId: zone,
      ...(geolocation ? { geolocation, permissions: ['geolocation'] } : {}),
    });
    // Rewritten on the way out rather than set as an extra header: Chromium's
    // locale emulation writes its own Accept-Language over an extra one, which
    // is how the first version of the withheld-language check passed while
    // sending plain `fr-SN`. The control case below fails if this stops working.
    if (acceptLanguage) {
      await context.route('**/*', (route) => route.continue({ headers: { ...route.request().headers(), 'accept-language': acceptLanguage } }));
    }
    await context.addCookies([
      { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
      ...(chosen ? [{ name: 'ayahspring_locale', value: chosen, url: origin }] : []),
    ]);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    // Everything the tab sends anywhere: HTTP requests with their bodies, and
    // frames on any socket (the dev server keeps one open).
    const sent = [];
    page.on('request', (r) => sent.push(`${r.method()} ${r.url()} ${r.postData() ?? ''}`));
    page.on('websocket', (ws) => ws.on('framesent', (f) => sent.push(`WS ${ws.url()} ${typeof f.payload === 'string' ? f.payload : f.payload.toString('latin1')}`)));
    if (fixClock) await page.clock.install({ time: FIXED_NOW });
    return { context, page, sent, pageErrors };
  }
  const prayerUrl = `${origin}/companion/prayer-times`;
  async function fillChoices(page, { latitude, longitude, method = 'MuslimWorldLeague', asr = 'standard', night = 'middle' }) {
    if (latitude !== undefined) { await page.fill('#latitude', String(latitude)); await page.fill('#longitude', String(longitude)); }
    await page.selectOption('#method', method);
    await page.selectOption('#asr', asr);
    if (method !== 'MoonsightingCommittee') await page.selectOption('#night', night);
    await page.locator('.prayer-confirm input').check();
  }
  const calculateButton = (page) => page.locator('.prayer-actions button');
  const rowTimes = async (page) => (await page.locator('.prayer-timetable .prayer-time').allTextContents()).map(clean);

  // ---------------------------------------------------------------- 1. manual
  const KAMPALA = { latitude: 0.3476, longitude: 32.5825 };
  // Muslim World League, standard Asr, for 15 October 2026 at these coordinates
  // — the same six times `adhan` gives in Node, pinned in prayer-timetable.test.
  const KAMPALA_TIMES = ['5:23 AM', '6:32 AM', '12:36 PM', '3:49 PM', '6:39 PM', '7:44 PM'];
  const leakNeedles = ['0.3476', '32.5825', '0,3476', '32,5825', '0%2E3476', '32%2E5825'];
  const assertNothingLeft = async (tab, label) => {
    for (const needle of leakNeedles) {
      const hit = tab.sent.find((s) => s.includes(needle));
      assert.equal(hit, undefined, `${label}: the tab sent a coordinate: ${hit?.slice(0, 300)}`);
      const server = backendSeen.find((s) => s.includes(needle));
      assert.equal(server, undefined, `${label}: the backend received a coordinate: ${server?.slice(0, 300)}`);
    }
    const stored = await tab.page.evaluate(async () => JSON.stringify({
      cookie: document.cookie, local: { ...localStorage }, session: { ...sessionStorage },
      databases: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [],
      caches: 'caches' in window ? await caches.keys() : [],
    }));
    for (const needle of leakNeedles) assert.ok(!stored.includes(needle), `${label}: a coordinate was stored on the device: ${stored.slice(0, 400)}`);
    const cookies = JSON.stringify(await tab.context.cookies());
    for (const needle of leakNeedles) assert.ok(!cookies.includes(needle), `${label}: a coordinate was put in a cookie`);
    return JSON.parse(stored);
  };
  {
    const tab = await open({ zone: 'Africa/Kampala' });
    await tab.page.goto(prayerUrl, { waitUntil: 'networkidle' });
    assert.equal(await tab.page.locator('.prayer-result').count(), 0);
    // Nothing chosen: a sentence, not a timetable.
    await calculateButton(tab.page).click();
    await tab.page.locator('.prayer-actions [role=status]').waitFor();
    assert.match(await tab.page.locator('.prayer-actions [role=status]').textContent(), /Enter coordinates/);
    assert.equal(await tab.page.locator('.prayer-result').count(), 0);
    // Everything but the confirmation: still refused.
    await fillChoices(tab.page, KAMPALA);
    await tab.page.locator('.prayer-confirm input').uncheck();
    await calculateButton(tab.page).click();
    assert.match(await tab.page.locator('.prayer-actions [role=status]').textContent(), /confirm your device time zone/);
    assert.equal(await tab.page.locator('.prayer-result').count(), 0);
    tab.sent.length = 0; // from here on, the coordinates are in the page
    await tab.page.locator('.prayer-confirm input').check();
    await calculateButton(tab.page).click();
    await tab.page.locator('.prayer-result').waitFor();
    assert.deepEqual(await tab.page.locator('.prayer-timetable dt').allTextContents(), ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
    assert.deepEqual(await rowTimes(tab.page), KAMPALA_TIMES);
    assert.equal(await tab.page.locator('.prayer-qualifier').count(), 0, 'an ordinary day needs no per-row date or offset');
    const summary = clean(await tab.page.locator('.prayer-summary').textContent());
    assert.ok(summary.includes('Africa/Kampala (GMT+3)'), summary);
    assert.ok(summary.includes('Muslim World League'), summary);
    assert.match(await tab.page.locator('.prayer-result h3').textContent(), /Thursday, October 15, 2026/);
    // Hanafi Asr is later; every other row is unchanged.
    await tab.page.selectOption('#asr', 'hanafi');
    assert.equal(await tab.page.locator('.prayer-result').count(), 0, 'changing a setting withdraws the old timetable');
    await calculateButton(tab.page).click();
    await tab.page.locator('.prayer-result').waitFor();
    const hanafi = await rowTimes(tab.page);
    assert.deepEqual(hanafi.filter((_, i) => i !== 3), KAMPALA_TIMES.filter((_, i) => i !== 3));
    assert.notEqual(hanafi[3], KAMPALA_TIMES[3]);
    // Let anything deferred go out before looking at what was sent.
    await tab.page.waitForLoadState('networkidle');
    const stored = await assertNothingLeft(tab, 'manual entry');
    const sentAfterEntry = tab.sent.length;
    // The day changes while the tab is open: 13 hours on is 01:00 on the 16th.
    await tab.page.clock.fastForward('13:00:00');
    await tab.page.locator('.prayer-result').waitFor({ state: 'detached' });
    assert.match(await tab.page.locator('.prayer-actions [role=status]').textContent(), /The date changed/);
    assert.deepEqual(tab.pageErrors, []);
    console.log(`Manual entry: Kampala timetable ${KAMPALA_TIMES.join(', ')} in Chromium; refused without confirmation; Hanafi moves Asr only; ${sentAfterEntry} request(s) after entry, none carrying a coordinate; device storage holds only ${JSON.stringify({ local: Object.keys(stored.local), session: Object.keys(stored.session), databases: stored.databases, caches: stored.caches })}; result cleared when the date changed.`);
    await tab.context.close();
  }

  // ------------------------------------------------------- 2. device location
  {
    const tab = await open({ zone: 'Africa/Kampala', geolocation: { ...KAMPALA, accuracy: 25 } });
    await tab.page.goto(prayerUrl, { waitUntil: 'networkidle' });
    tab.sent.length = 0;
    await tab.page.locator('.prayer-group > button').first().click();
    await tab.page.waitForFunction(() => document.querySelector('#latitude')?.value === '0.3476');
    assert.equal(await tab.page.inputValue('#longitude'), '32.5825');
    assert.match(await tab.page.locator('.prayer-actions [role=status]').textContent(), /Estimated accuracy: 25 metres/);
    assert.equal(await tab.page.locator('.prayer-confirm input').isChecked(), false, 'a new location never arrives already confirmed');
    await fillChoices(tab.page, {});
    await calculateButton(tab.page).click();
    await tab.page.locator('.prayer-result').waitFor();
    assert.deepEqual(await rowTimes(tab.page), KAMPALA_TIMES);
    await tab.page.waitForLoadState('networkidle');
    await assertNothingLeft(tab, 'device location');
    assert.deepEqual(tab.pageErrors, []);
    console.log('Device location: granted coordinates fill the form unconfirmed, give the same timetable, and are not sent or stored.');
    await tab.context.close();
  }
  {
    // Permission not granted: the browser refuses, the tool says so, and
    // typing the coordinates still works.
    const tab = await open({ zone: 'Africa/Kampala' });
    await tab.page.goto(prayerUrl, { waitUntil: 'networkidle' });
    await tab.page.locator('.prayer-group > button').first().click();
    await tab.page.locator('.prayer-actions [role=status]').waitFor();
    assert.match(await tab.page.locator('.prayer-actions [role=status]').textContent(), /permission was denied/);
    assert.equal(await tab.page.inputValue('#latitude'), '');
    assert.equal(await tab.page.inputValue('#longitude'), '');
    await fillChoices(tab.page, KAMPALA);
    await calculateButton(tab.page).click();
    await tab.page.locator('.prayer-result').waitFor();
    assert.deepEqual(await rowTimes(tab.page), KAMPALA_TIMES);
    assert.deepEqual(tab.pageErrors, []);
    console.log('Device location refused: a sentence, empty fields, and manual entry still calculates.');
    await tab.context.close();
  }

  // ------------------------------------ 3. a row that needs more than a clock
  {
    // London at the June solstice: Isha by the middle-of-the-night rule falls
    // after midnight, so that row — and only that row — carries a date.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en', timezoneId: 'Europe/London' });
    await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: 'en', url: origin }]);
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-06-21T11:00:00Z') });
    await page.goto(prayerUrl, { waitUntil: 'networkidle' });
    await fillChoices(page, { latitude: 51.5074, longitude: -0.1278 });
    await calculateButton(page).click();
    await page.locator('.prayer-result').waitFor();
    const qualifiers = await page.locator('.prayer-timetable > div').evaluateAll((rows) => rows.map((r) => r.querySelector('.prayer-qualifier')?.textContent ?? ''));
    assert.deepEqual(qualifiers, ['', '', '', '', '', 'Jun 22']);
    assert.ok(clean(await page.locator('.prayer-summary').textContent()).includes('Europe/London (GMT+1)'));
    console.log(`After-midnight Isha in London on 21 June is marked "${qualifiers[5]}"; the other five rows are bare times.`);
    await context.close();
  }

  // --------------------------------------------------------------- 4. layout
  // One place per language, each in its own zone, so the method example (which
  // depends on the zone) and a southern latitude are both on screen somewhere.
  const places = [
    { locale: 'en', zone: 'Europe/London', latitude: 51.5074, longitude: -0.1278, method: 'MoonsightingCommittee' },
    { locale: 'ar', zone: 'Africa/Cairo', latitude: 30.0444, longitude: 31.2357, method: 'Egyptian' },
    // Tamil for its long words in a script that is neither Latin nor Arabic.
    // (Burmese held this place until its companion text was held for review.)
    { locale: 'ta', zone: 'Asia/Colombo', latitude: 6.9271, longitude: 79.8612, method: 'Karachi', asr: 'hanafi' },
    { locale: 'sw', zone: 'Africa/Nairobi', latitude: -1.2921, longitude: 36.8219, method: 'MuslimWorldLeague' },
  ];
  const widths = [320, 390, 768, 1440, 2560];
  /** Measured in the page: sideways scroll, anything poking out of the
   * viewport, clipped text, and controls too small for a thumb. */
  const measure = (page) => page.evaluate(() => {
    const scope = document.querySelector('.companion-page');
    if (!scope) throw new Error('companion page missing');
    const width = document.documentElement.clientWidth;
    const outside = []; const clipped = []; const small = [];
    for (const el of scope.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const label = `${el.tagName.toLowerCase()}.${String(el.className).split(' ').join('.')} "${(el.textContent || '').trim().slice(0, 40)}"`;
      if (r.right > width + 1 || r.left < -1) outside.push(`${label} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      if (['DT', 'DD', 'BUTTON', 'LABEL', 'H1', 'H2', 'H3', 'P', 'SPAN'].includes(el.tagName) && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline') clipped.push(`${label} ${el.scrollWidth}>${el.clientWidth}`);
      const control = el.matches('button, select, input:not([type=checkbox]), label.prayer-confirm');
      if (control && r.height < 44) small.push(`${label} ${Math.round(r.height)}px`);
    }
    const cols = (selector) => { const el = scope.querySelector(selector); return el ? getComputedStyle(el).gridTemplateColumns.split(' ').length : 0; };
    return { scroll: document.documentElement.scrollWidth, width, outside, clipped, small,
      dir: document.documentElement.dir, lang: document.documentElement.lang,
      scopeWidth: scope.getBoundingClientRect().width,
      // How close the page's own blocks come to either edge of the screen.
      gutter: [...scope.children].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(c).position !== 'fixed'; }).reduce((least, c) => { const r = c.getBoundingClientRect(); return Math.min(least, r.left, document.documentElement.clientWidth - r.right); }, Infinity),
      fields: cols('.prayer-fields'), timetable: cols('.prayer-timetable') };
  });
  const assertFits = (m, label) => {
    assert.ok(m.scroll <= m.width + 1, `${label}: page scrolls sideways (${m.scroll} > ${m.width})`);
    assert.deepEqual(m.outside, [], `${label}: outside the viewport`);
    assert.deepEqual(m.clipped, [], `${label}: clipped text`);
    assert.deepEqual(m.small, [], `${label}: control under 44px`);
    assert.ok(m.scopeWidth >= m.width - 1, `${label}: the page does not use the window's width`);
    assert.ok(m.gutter >= 16, `${label}: content is ${m.gutter}px from the edge of the screen`);
  };
  const shoot = async (page, name) => { if (shots) await page.screenshot({ path: resolve(shots, `${name}.png`), fullPage: true }); };
  const wantShot = (locale, width) => (locale === 'en' && [390, 1440, 2560].includes(width)) || (locale === 'ar' && [390, 1440].includes(width)) || (locale === 'ta' && width === 390) || (locale === 'sw' && width === 768);

  for (const place of places) {
    const tab = await open({ locale: place.locale, zone: place.zone, width: widths[0] });
    await tab.page.goto(prayerUrl, { waitUntil: 'networkidle' });
    const first = await measure(tab.page);
    assert.equal(first.lang, place.locale);
    assert.equal(first.dir, place.locale === 'ar' ? 'rtl' : 'ltr');
    // These four languages are served their own companion text, so the heading
    // is the English one in English and nowhere else.
    const heading = clean(await tab.page.locator('.companion-head h1').textContent());
    if (place.locale === 'en') assert.equal(heading, ENGLISH_TITLE);
    else assert.notEqual(heading, ENGLISH_TITLE, `${place.locale}: the prayer page fell back to English`);
    // The tab says what the heading says, in the same language.
    assert.equal(clean(await tab.page.title()), `${heading} · AyahSpring`, `${place.locale}: the tab title is not the heading`);
    assert.equal(await tab.page.locator('.prayer-example').count(), ['en', 'ar', 'sw'].includes(place.locale) ? 1 : 0, `${place.locale}: method example for ${place.zone}`);
    for (const width of widths) {
      await tab.page.setViewportSize({ width, height: 900 });
      const m = await measure(tab.page);
      assertFits(m, `prayer form ${place.locale} ${width}`);
      assert.equal(m.fields, width >= 992 ? 2 : 1, `prayer form ${place.locale} ${width}: columns`);
    }
    await tab.page.setViewportSize({ width: widths[0], height: 900 });
    await fillChoices(tab.page, place);
    await calculateButton(tab.page).click();
    await tab.page.locator('.prayer-result').waitFor();
    assert.equal(await tab.page.locator('.prayer-timetable > div').count(), 6);
    for (const width of widths) {
      await tab.page.setViewportSize({ width, height: 900 });
      const m = await measure(tab.page);
      assertFits(m, `prayer result ${place.locale} ${width}`);
      assert.equal(m.timetable, width >= 1152 ? 6 : width >= 640 ? 3 : 1, `prayer result ${place.locale} ${width}: timetable columns`);
      if (wantShot(place.locale, width)) await shoot(tab.page, `prayer-${place.locale}-${width}`);
    }
    const times = await rowTimes(tab.page);
    assert.deepEqual(tab.pageErrors, []);
    console.log(`Layout ${place.locale} (${place.zone}): form and timetable fit at ${widths.join('/')}px; ${times.join(' | ')}`);

    // The other two tools, same language, same widths.
    for (const [path, ready] of [['hijri', '.hijri-date strong'], ['counter', '.counter-count']]) {
      await tab.page.setViewportSize({ width: widths[0], height: 900 });
      await tab.page.goto(`${origin}/companion/${path}`, { waitUntil: 'networkidle' });
      await tab.page.locator(ready).waitFor();
      if (path === 'counter') {
        const tap = tab.page.locator('.counter-tap');
        await tap.click(); await tap.click(); await tap.click();
        assert.equal(clean(await tab.page.locator('.counter-count').textContent()), '3');
        // Ask to clear, so the confirmation is on screen for the measurements.
        await tab.page.locator('.counter-actions').first().locator('button').nth(2).click();
        await tab.page.locator('.notice.warn').waitFor();
      }
      for (const width of widths) {
        await tab.page.setViewportSize({ width, height: 900 });
        assertFits(await measure(tab.page), `${path} ${place.locale} ${width}`);
        if ((place.locale === 'en' && [390, 1440].includes(width)) || (place.locale === 'ar' && width === 390)) await shoot(tab.page, `${path}-${place.locale}-${width}`);
      }
      if (path === 'hijri') {
        const hijri = clean(await tab.page.locator('.hijri-date strong').textContent());
        assert.ok(hijri.length > 4, `hijri ${place.locale}: empty date`);
        if (place.locale === 'en') assert.equal(hijri, 'Jumada I 4, 1448 AH');
        if (place.locale === 'ar') assert.match(hijri, /جمادى الأولى/);
        console.log(`Hijri ${place.locale}: ${hijri}`);
      } else {
        // Confirm the clear, then prove a reload starts from nothing.
        await tab.page.locator('.notice.warn button').first().click();
        assert.equal(clean(await tab.page.locator('.counter-count').textContent()), '0');
        await tab.page.locator('.counter-tap').click();
        await tab.page.reload({ waitUntil: 'networkidle' });
        assert.equal(clean(await tab.page.locator('.counter-count').textContent()), '0', 'the counter survived a reload, so it was stored somewhere');
      }
      assert.deepEqual(tab.pageErrors, []);
    }
    console.log(`Hijri date and counter ${place.locale}: fit at ${widths.join('/')}px; counter counts, clears on confirmation and is gone after a reload.`);
    await tab.context.close();
  }
  // ------------------------------------------------------- 5. held for review
  // Burmese is one of the languages whose companion text is written but held
  // until a speaker has read it (`web/src/lib/i18n/messages/held.ts`). The
  // reader keeps their language everywhere else and gets these screens in
  // English: not a blank, not a key name, and not the builder's draft.
  {
    const tab = await open({ locale: 'my', zone: 'Asia/Yangon', width: 390 });
    await tab.page.goto(prayerUrl, { waitUntil: 'networkidle' });
    assert.equal(await tab.page.evaluate(() => document.documentElement.lang), 'my');
    assert.equal(clean(await tab.page.locator('.companion-head h1').textContent()), ENGLISH_TITLE);
    assert.equal(clean(await tab.page.title()), `${ENGLISH_TITLE} · AyahSpring`, 'held Burmese text reached the tab title');
    assert.equal(clean(await calculateButton(tab.page).textContent()), 'Calculate today');
    // The page says what it is, for a screen reader choosing a voice.
    assert.equal(await tab.page.locator('.companion-page').getAttribute('lang'), 'en');
    const body = await tab.page.locator('.companion-page').textContent();
    assert.ok(!/companion\.[a-zA-Z]/.test(body), 'a message key is printed where a sentence should be');
    assert.ok(!/[\u1000-\u109f]/u.test(body), 'held Burmese companion text reached the page');
    // The frame around it is still Burmese: the hold is on these screens only.
    const frame = await tab.page.locator('nav.nav').textContent();
    assert.ok(/[\u1000-\u109f]/u.test(frame), 'the navigation is not in Burmese');
    // And the tool still works in English: same form, six rows.
    await fillChoices(tab.page, { latitude: 16.8409, longitude: 96.1735, method: 'Karachi', asr: 'hanafi' });
    await calculateButton(tab.page).click();
    await tab.page.locator('.prayer-result').waitFor();
    assert.equal(await tab.page.locator('.prayer-timetable > div').count(), 6);
    assertFits(await measure(tab.page), 'held prayer page my 390');
    await shoot(tab.page, 'prayer-my-held-390');
    assert.deepEqual(tab.pageErrors, []);
    for (const path of ['hijri', 'counter']) {
      await tab.page.goto(`${origin}/companion/${path}`, { waitUntil: 'networkidle' });
      const text = await tab.page.locator('.companion-page').textContent();
      assert.ok(!/companion\.[a-zA-Z]/.test(text), `${path}: a message key is printed where a sentence should be`);
      // The Hijri date itself is formatted by the browser for the reader's
      // language and is not ours to hold; every sentence around it is.
      const sentences = await tab.page.locator('.companion-page').evaluate((scope) => {
        const copy = scope.cloneNode(true);
        for (const el of copy.querySelectorAll('.hijri-date strong, .hijri-date time')) el.remove();
        return copy.textContent ?? '';
      });
      assert.ok(!/[\u1000-\u109f]/u.test(sentences), `${path}: held Burmese companion text reached the page`);
      assert.deepEqual(tab.pageErrors, []);
    }
    console.log('Held for review (my): the prayer page, Hijri date and counter are served in English inside a Burmese frame; the prayer tool still calculates six rows.');
    await tab.context.close();
  }
  // Pashto is held too, and is written right to left. The document keeps its
  // direction; the English page inside it must not inherit it, or every full
  // stop lands on the wrong side of its sentence.
  {
    const tab = await open({ locale: 'ps', zone: 'Asia/Kabul', width: 390 });
    await tab.page.goto(prayerUrl, { waitUntil: 'networkidle' });
    const m = await tab.page.evaluate(() => {
      const scope = document.querySelector('.companion-page');
      const lede = scope.querySelector('.prayer-tool p, p');
      return {
        documentDir: document.documentElement.dir, documentLang: document.documentElement.lang,
        pageDir: scope.getAttribute('dir'), pageLang: scope.getAttribute('lang'),
        computed: getComputedStyle(scope.querySelector('h1')).direction,
        align: getComputedStyle(lede).textAlign,
        navDirection: getComputedStyle(document.querySelector('nav.nav')).direction,
      };
    });
    assert.deepEqual(
      { documentDir: m.documentDir, documentLang: m.documentLang, pageDir: m.pageDir, pageLang: m.pageLang, computed: m.computed, navDirection: m.navDirection },
      { documentDir: 'rtl', documentLang: 'ps', pageDir: 'ltr', pageLang: 'en', computed: 'ltr', navDirection: 'rtl' },
    );
    assert.equal(clean(await tab.page.locator('.companion-head h1').textContent()), ENGLISH_TITLE);
    assert.ok(['start', 'left'].includes(m.align), `held page in ps: text is aligned ${m.align}`);
    assertFits(await measure(tab.page), 'held prayer page ps 390');
    await shoot(tab.page, 'prayer-ps-held-390');
    assert.deepEqual(tab.pageErrors, []);
    console.log('Held for review (ps): the document is right-to-left Pashto; the English prayer page inside it is marked lang="en" and reads left to right.');
    await tab.context.close();
  }
  // The other side of a hold: the person who can lift it. The correction sheet
  // opens a held part with the builder's draft in each box, says readers cannot
  // see it, and says nothing of the kind about a part that is being served.
  {
    const tab = await open({ locale: 'en', zone: 'Africa/Kampala', width: 390 });
    const notice = tab.page.locator('form[action="/api/contribute"] .notice.warn');
    await tab.page.goto(`${origin}/contribute?locale=ha&section=companion`, { waitUntil: 'networkidle' });
    assert.equal(await notice.count(), 1, 'the sheet does not say this part is held');
    assert.ok(clean(await notice.textContent()).startsWith('Readers do not see this part in Hausa yet.'));
    const boxes = await tab.page.locator('textarea[name^="t__companion."]').count();
    const draft = await tab.page.locator('textarea[name="t__companion.prayerTitle"]').inputValue();
    assert.ok(boxes >= 80, `the sheet shows ${boxes} companion lines`);
    assert.notEqual(draft, ENGLISH_TITLE, 'the reviewer is handed English instead of the draft');
    assert.ok(draft.trim().length > 0);
    assert.ok((await tab.page.evaluate(() => document.documentElement.scrollWidth)) <= 391, 'the held sheet scrolls sideways at 390px');
    await tab.page.goto(`${origin}/contribute?locale=sw&section=companion`, { waitUntil: 'networkidle' });
    assert.equal(await notice.count(), 0, 'Swahili is served, and the sheet says it is held');
    await tab.page.goto(`${origin}/contribute?locale=ha&section=nav`, { waitUntil: 'networkidle' });
    assert.equal(await notice.count(), 0, 'the Hausa navigation is served, and the sheet says it is held');
    assert.deepEqual(tab.pageErrors, []);
    await tab.context.close();
    // And the language page tells a Hausa reader, in Hausa, how much they are shown.
    const reader = await open({ locale: 'ha', zone: 'Africa/Lagos', width: 390 });
    await reader.page.goto(`${origin}/language`, { waitUntil: 'networkidle' });
    assert.equal(await reader.page.evaluate(() => document.documentElement.lang), 'ha');
    const settings = await reader.page.locator('body').textContent();
    // 192 of 1736: the 80 companion lines are held, and the 1464 lines of
    // the learner's own screens (dashboard, course, lesson, assessment,
    // assignment, wrong-address, broken-page, player, account, family, buy,
    // closing, a copy of your data, reading, putting a copy back, phone,
    // merge, sharing, inviting a friend, sponsored seats, my orders, what you have paid, the receipt, notifications, plans, the plans an account has, the policy pages, the institution page and the page that asks to teach) were never
    // written for a held
    // language
    // (`UNWRITTEN_WHILE_HELD`).
    assert.ok(settings.includes('10%'), 'the language page does not show the lower number');
    assert.ok(!settings.includes('10% of these interface strings'), 'the coverage sentence is in English for a Hausa reader');
    assert.deepEqual(reader.pageErrors, []);
    await reader.context.close();
    console.log(`Held for review (ha): the correction sheet opens the ${boxes} companion lines with the draft ("${draft}") and a notice that readers cannot see it; served parts carry no notice; /language shows a Hausa reader 10% in Hausa.`);
  }

  // ------------------------------------------------------ 6. withheld whole
  // Wolof, Fulfulde, Bambara and Dhivehi are written and not offered at all:
  // every part is held, so there is nothing of them to show. Wolof stands for
  // the four here; `held-translations.test.ts` asks the same of each.
  {
    // A browser that chose Wolof before it was withheld, on a device that asks
    // for Wolof and nothing else: English, and a document that says English.
    const stale = await open({ locale: 'wo', zone: 'Africa/Dakar', width: 390 });
    await stale.page.goto(`${origin}/language`, { waitUntil: 'networkidle' });
    assert.equal(await stale.page.evaluate(() => document.documentElement.lang), 'en', 'a withheld language set <html lang>');
    assert.equal(await stale.page.evaluate(() => document.documentElement.dir), 'ltr');
    // Not in the picker...
    const choices = await stale.page.locator('button[name="locale"]').evaluateAll((buttons) => buttons.map((b) => b.value));
    assert.ok(choices.includes('sw') && choices.includes('ha'), 'the picker lost languages it should offer');
    for (const code of ['wo', 'ff', 'bm', 'dv']) assert.ok(!choices.includes(code), `${code} is withheld and still a button in the picker`);
    assert.equal(choices.length, 48, `the picker has ${choices.length} buttons, not the device option and 47 languages`);
    // ...and listed underneath at 0%, with a way to the sheet that can change that.
    const row = stale.page.locator('li', { has: stale.page.locator('a[href="/contribute?locale=wo"]') });
    assert.equal(await row.count(), 1, 'Wolof is not listed as waiting');
    assert.ok(clean(await row.textContent()).endsWith('0%'), `Wolof is listed as "${clean(await row.textContent())}"`);
    assert.ok((await stale.page.evaluate(() => document.documentElement.scrollWidth)) <= 391, 'the language page scrolls sideways at 390px');
    await shoot(stale.page, 'language-wo-withheld-390');
    // A hand-built request for it is refused; one for an offered language is not.
    const refused = await stale.page.request.post(`${origin}/api/locale`, { form: { locale: 'wo', next: '/language' }, maxRedirects: 0 });
    assert.equal(refused.status(), 400, 'the locale route stored a withheld language');
    const accepted = await stale.page.request.post(`${origin}/api/locale`, { form: { locale: 'sw', next: '/language' }, maxRedirects: 0 });
    assert.equal(accepted.status(), 303);
    assert.deepEqual(stale.pageErrors, []);
    await stale.context.close();

    // Control: the header this script sets is the header the server reads. A
    // French-emulating browser sending Swahili first must be given Swahili.
    const control = await open({ locale: 'fr-SN', zone: 'Africa/Dakar', width: 390, chosen: null, acceptLanguage: 'sw-KE,sw;q=0.9,fr;q=0.8' });
    await control.page.goto(`${origin}/language`, { waitUntil: 'networkidle' });
    assert.equal(await control.page.evaluate(() => document.documentElement.lang), 'sw', 'this script is not controlling Accept-Language, so the checks below prove nothing');
    await control.context.close();
    // A device that asks for Wolof first and French second, and never chose:
    // English, not French. The owner's decision — one of these four is
    // answered in English every time — and the page says why, in English.
    const device = await open({ locale: 'fr-SN', zone: 'Africa/Dakar', width: 390, chosen: null, acceptLanguage: 'wo-SN,wo;q=0.9,fr;q=0.8,en;q=0.5' });
    await device.page.goto(`${origin}/language`, { waitUntil: 'networkidle' });
    assert.equal(await device.page.evaluate(() => document.documentElement.lang), 'en', 'a Wolof-then-French device was not given English');
    assert.ok((await device.page.locator('body').textContent()).includes('Your device asked for a language this interface does not have yet, so it is in English.'), 'the language page does not say why it is in English');
    assert.deepEqual(device.pageErrors, []);
    await device.context.close();
    // The same device with French first reads French: the rule is about what
    // was asked for first.
    const french = await open({ locale: 'fr-SN', zone: 'Africa/Dakar', width: 390, chosen: null, acceptLanguage: 'fr-SN,fr;q=0.9,wo;q=0.8' });
    await french.page.goto(`${origin}/language`, { waitUntil: 'networkidle' });
    assert.equal(await french.page.evaluate(() => document.documentElement.lang), 'fr', 'a French-then-Wolof device was not given French');
    await french.context.close();
    // And a browser that had chosen Wolof, on a French device: still English.
    const both = await open({ locale: 'fr-SN', zone: 'Africa/Dakar', width: 390, chosen: 'wo', acceptLanguage: 'fr-SN,fr;q=0.9' });
    await both.page.goto(`${origin}/language`, { waitUntil: 'networkidle' });
    assert.equal(await both.page.evaluate(() => document.documentElement.lang), 'en', 'a stale Wolof choice on a French device was not given English');
    await both.context.close();

    // The sheet still has it, on every part, with the draft and the other notice.
    const sheet = await open({ locale: 'en', zone: 'Africa/Kampala', width: 390 });
    const notice = sheet.page.locator('form[action="/api/contribute"] .notice.warn');
    for (const part of ['nav', 'companion']) {
      await sheet.page.goto(`${origin}/contribute?locale=wo&section=${part}`, { waitUntil: 'networkidle' });
      assert.equal(await notice.count(), 1, `wo ${part}: the sheet does not say the language is withheld`);
      assert.ok(clean(await notice.textContent()).startsWith('Wolof is not offered to readers yet.'), `wo ${part}`);
    }
    const draft = await sheet.page.locator('textarea[name="t__companion.prayerTitle"]').inputValue();
    assert.notEqual(draft, ENGLISH_TITLE, 'the reviewer of a withheld language is handed English');
    const offeredOnSheet = await sheet.page.locator('select#locale option').evaluateAll((options) => options.map((o) => o.value));
    for (const code of ['wo', 'ff', 'bm', 'dv']) assert.ok(offeredOnSheet.includes(code), `${code} cannot be corrected: it is not on the sheet`);
    assert.deepEqual(sheet.pageErrors, []);
    await sheet.context.close();
    console.log(`Withheld (wo): a browser that had chosen Wolof gets English (lang="en"); the picker has ${choices.length - 1} languages and none of wo/ff/bm/dv; Wolof is listed at 0% with a link to its sheet; /api/locale refuses it (400); a wo-then-fr device gets English and a fr-then-wo device French; the sheet still opens it with the draft ("${draft}").`);
  }
  console.log('Companion browser smoke passed in Chromium against `next dev` with a synthetic backend. Not real Auth or RLS, not a real location provider, not Safari or Firefox, not a review of any translation.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
