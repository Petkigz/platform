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
const COMPANION_FLAGS = new Set(['companion.calculated_prayer_times', 'companion.hijri_date', 'companion.dhikr_counter']);

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
  async function open({ locale = 'en', zone, width = 1440, geolocation = null, fixClock = true }) {
    const context = await browser.newContext({
      viewport: { width, height: 900 }, locale, timezoneId: zone,
      ...(geolocation ? { geolocation, permissions: ['geolocation'] } : {}),
    });
    await context.addCookies([
      { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
      { name: 'ayahspring_locale', value: locale, url: origin },
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
    console.log(`Manual entry: Kampala timetable ${KAMPALA_TIMES.join(', ')} in Chromium; refused without confirmation; Hanafi moves Asr only; ${sentAfterEntry} request(s) after entry, none carrying a coordinate; storage ${JSON.stringify(stored)}; result cleared when the date changed.`);
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
    { locale: 'my', zone: 'Asia/Yangon', latitude: 16.8409, longitude: 96.1735, method: 'Karachi', asr: 'hanafi' },
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
      fields: cols('.prayer-fields'), timetable: cols('.prayer-timetable') };
  });
  const assertFits = (m, label) => {
    assert.ok(m.scroll <= m.width + 1, `${label}: page scrolls sideways (${m.scroll} > ${m.width})`);
    assert.deepEqual(m.outside, [], `${label}: outside the viewport`);
    assert.deepEqual(m.clipped, [], `${label}: clipped text`);
    assert.deepEqual(m.small, [], `${label}: control under 44px`);
    assert.ok(m.scopeWidth >= m.width - 1, `${label}: the page does not use the window's width`);
  };
  const shoot = async (page, name) => { if (shots) await page.screenshot({ path: resolve(shots, `${name}.png`), fullPage: true }); };
  const wantShot = (locale, width) => (locale === 'en' && [390, 1440, 2560].includes(width)) || (locale === 'ar' && [390, 1440].includes(width)) || (locale === 'my' && width === 390) || (locale === 'sw' && width === 768);

  for (const place of places) {
    const tab = await open({ locale: place.locale, zone: place.zone, width: widths[0] });
    await tab.page.goto(prayerUrl, { waitUntil: 'networkidle' });
    const first = await measure(tab.page);
    assert.equal(first.lang, place.locale);
    assert.equal(first.dir, place.locale === 'ar' ? 'rtl' : 'ltr');
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
  console.log('Companion browser smoke passed in Chromium against `next dev` with a synthetic backend. Not real Auth or RLS, not a real location provider, not Safari or Firefox, not a review of any translation.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
