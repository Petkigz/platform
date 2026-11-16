// Actual Next catalogue route against synthetic loopback Auth/REST responses.
// No hosted services, real JWT validation, PostgREST filtering or RLS are tested.
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
const version = (status) => [{ id: 'version', version_number: 1, language: 'en', version_status: status, course_version_subjects: [] }];
const courses = [
  { id: 'published', slug: 'synthetic-course', title: 'Synthetic published course', description: 'Synthetic description', audience: 'adult', age_bands: [], difficulty: 'beginner', language_code: 'en', course_versions: version('published') },
  { id: 'draft', slug: 'synthetic-draft', title: 'Synthetic unpublished course', description: null, audience: 'adult', age_bands: [], difficulty: 'beginner', language_code: 'en', course_versions: version('draft') },
];
let flag = 'off'; let active = 0; let maximum = 0; const calls = []; const activePaths = new Set(); const overlaps = [];
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
  const payload = body ? JSON.parse(body) : null;
  calls.push({ path, payload });
  for (const other of activePaths) overlaps.push([path, other]);
  activePaths.add(path);
  // A fixed delay exposes concurrency, not real network or hosted latency.
  await new Promise((r) => setTimeout(r, 40));
  if (path === '/rest/v1/rpc/setting_bool') {
    if (payload.p_key === 'learning.lesson_search' && flag === 'outage') { res.writeHead(503); res.end('{"message":"simulated outage"}'); }
    else res.end(JSON.stringify(payload.p_key === 'learning.lesson_search' && flag === 'on'));
  } else if (path === '/rest/v1/subject_areas') res.end(JSON.stringify([{ id: 'subject', code: 'quran', name: 'Synthetic subject', parent_subject_id: null }]));
  else if (path === '/rest/v1/rpc/course_languages') res.end('[]');
  else if (path === '/rest/v1/rpc/catalogue_page') res.end(JSON.stringify({ total: 2, offset: 0, limit: 24, ordered: [{ courseId: 'published', score: 1 }, { courseId: 'draft', score: 0 }] }));
  else if (path === '/rest/v1/courses') res.end(JSON.stringify(courses));
  else if (path === '/rest/v1/rpc/catalogue_cards') res.end(JSON.stringify([{ courseId: 'published', sections: 1, lessons: 3, minutes: 20, timedLessons: 3, offering: { hasLivePrice: true, resolved: true, priceId: 'synthetic-price', amountMinor: '25000', currencyCode: 'UGX', country: 'UG', countrySource: 'request' } }]));
  else if (path === '/rest/v1/rpc/search_lessons') res.end(JSON.stringify([{ lesson_id: 'lesson', lesson_title: 'Synthetic matched lesson', section_title: null, course_id: 'published', course_slug: 'synthetic-course', course_title: 'Synthetic published course', is_preview: true, snippet: '<mark>match</mark> & <script>not executable</script>', matched_in: 'title', rank: 1 }]));
  else if (path === '/rest/v1/rpc/record_analytics_event') res.end('{"recorded":true}');
  else { res.writeHead(404); res.end('{}'); }
  activePaths.delete(path); active--;
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
  for (const state of ['off', 'on', 'outage', 'no-query']) {
    flag = state; calls.length = 0; overlaps.length = 0; maximum = 0;
    const query = state === 'no-query' ? '' : 'q=match&subject=quran&audience=adult&lang=en';
    const response = await fetch(`http://localhost:${port}/catalogue?${query}`, { headers: { cookie, 'cf-ipcountry': 'UG' }, signal: AbortSignal.timeout(30000) });
    const html = await response.text();
    assert.equal(response.status, 200, state); assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.match(html, /Synthetic published course/); assert.doesNotMatch(html, /Synthetic unpublished course/);
    assert.match(html, /UGX 25000/);
    assert.equal(html.includes('Synthetic matched lesson'), state === 'on');
    if (state === 'on') { assert.match(html, /<mark>match<\/mark>/); assert.doesNotMatch(html, /<script>not executable<\/script>/); }
    const catalogue = calls.find((c) => c.path === '/rest/v1/rpc/catalogue_page');
    assert.equal(catalogue.payload.p_query, state === 'no-query' ? null : 'match');
    assert.equal(catalogue.payload.p_subject, state === 'no-query' ? null : 'quran');
    assert.equal(catalogue.payload.p_audience, state === 'no-query' ? null : 'adult');
    assert.equal(catalogue.payload.p_language, state === 'no-query' ? null : 'en');
    const prices = calls.find((c) => c.path === '/rest/v1/rpc/catalogue_cards');
    assert.deepEqual(prices.payload.p_course_ids, ['published']); assert.equal(prices.payload.p_country, 'UG');
    assert.equal(calls.some((c) => c.path === '/rest/v1/rpc/search_lessons'), state === 'on');
    assert.equal(calls.some((c) => c.path === '/rest/v1/rpc/record_analytics_event'), state !== 'no-query');
    assert.equal(calls.some((c) => c.path === '/rest/v1/rpc/setting_bool' && c.payload.p_key === 'learning.lesson_search'), state !== 'no-query');
    assert.ok(maximum >= 2, `independent requests did not overlap in ${state}`);
    const overlapped = (a, b) => overlaps.some((pair) => pair.includes(`/rest/v1/rpc/${a}`) && pair.includes(`/rest/v1/rpc/${b}`));
    if (state !== 'no-query') assert.ok(overlapped('catalogue_cards', 'record_analytics_event'), `card and analytics reads did not overlap in ${state}`);
    if (state === 'on') assert.ok(overlapped('catalogue_cards', 'search_lessons'), 'card and permitted lesson reads did not overlap');
  }
  console.log('Catalogue route smoke passed: filters, country/price, published-only cards, gated lessons, search analytics, no-store and overlapping synthetic calls. Not hosted Auth or RLS.');
  // Optional browser coverage uses the same synthetic data and route. The HTTP
  // smoke does not need a browser; CI opts in using its isolated driver.
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    flag = 'on';
    for (const width of [320, 390, 768, 1440, 1920, 2560]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', extraHTTPHeaders: { 'cf-ipcountry': 'UG' } });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: `http://localhost:${port}` }]);
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/catalogue`, { waitUntil: 'networkidle' });
      const measures = await page.evaluate(() => {
        const shelf = document.querySelector('.discovery-page');
        const grid = document.querySelector('.discovery-page .grid.cols-2');
        if (!shelf || !grid) throw new Error('Synthetic shelf not rendered');
        return { scrollWidth: document.documentElement.scrollWidth, shelfWidth: shelf.getBoundingClientRect().width,
          // How close the page's own blocks come to either edge of the screen.
          gutter: [...shelf.children].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(c).position !== 'fixed'; }).reduce((least, c) => { const r = c.getBoundingClientRect(); return Math.min(least, r.left, document.documentElement.clientWidth - r.right); }, Infinity),
          columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length };
      });
      assert.ok(measures.scrollWidth <= width + 1, `${width}: document overflowed: ${measures.scrollWidth}`);
      assert.ok(measures.shelfWidth >= width - 1, `${width}: shelf does not use viewport`);
      assert.ok(measures.gutter >= 16, `${width}: shelf content is ${measures.gutter}px from the edge of the screen`);
      assert.equal(measures.columns, width >= 1920 ? 4 : width >= 1280 ? 3 : width >= 736 ? 2 : 1, `${width}: grid columns`);
      assert.equal(await page.getByText('Synthetic published course').count(), 1);
      assert.equal(await page.getByText('Synthetic unpublished course').count(), 0);
      assert.equal(await page.getByText('UGX 25000').count(), 1);
      await page.locator('input[name="q"]').fill('match');
      await page.locator('select[name="audience"]').selectOption('adult');
      await Promise.all([page.waitForURL((url) => url.searchParams.get('q') === 'match'), page.locator('form.search button[type="submit"]').click()]);
      assert.equal(new URL(page.url()).searchParams.get('audience'), 'adult');
      await page.getByText('Synthetic matched lesson').waitFor({ state: 'visible' });
      assert.equal(await page.getByText('Synthetic matched lesson').count(), 1);
      console.log(`Synthetic catalogue ${width}: no overflow, ${measures.columns} columns, usable search`);
      await context.close();
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
