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
let enabled = false; let flagOutage = false; let profileOutage = false;
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
  } else if (path === '/rest/v1/learner_profiles') res.end(JSON.stringify([{ id: 'own' }]));
  else if (path === '/rest/v1/course_enrolments') res.end(JSON.stringify(rows));
  else if (path === '/rest/v1/course_wishlist') { res.setHeader('content-range', '*/0'); res.end(); }
  else if (path === '/rest/v1/rpc/enrolment_progress_summary') {
    res.end(JSON.stringify({ lessons_total: 4, lessons_done: payload.p_enrolment_id === 'own-enrolment' ? 1 : 0, percent_complete: payload.p_enrolment_id === 'own-enrolment' ? 25 : 0 }));
  } else if (path === '/rest/v1/lesson_progress') res.end('[]');
  else if (path === '/rest/v1/course_sections') res.end('[]');
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
  }
  console.log('Learner dashboard HTTP smoke passed: anonymous redirect, own/child labels, flags off/on/outage, profile error, no-store, gated calls and overlapping synthetic reads. Not real Auth or RLS.');
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    enabled = true; flagOutage = false; profileOutage = false;
    for (const width of [320, 390, 768, 1440, 1920, 2560]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: `http://localhost:${port}` }]);
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/learn`, { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => {
        const area = document.querySelector('.learner-dashboard');
        const grid = document.querySelector('.learner-course-grid');
        if (!area || !grid) throw new Error('Synthetic learner dashboard missing');
        return { scroll: document.documentElement.scrollWidth, area: area.getBoundingClientRect().width,
          columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length };
      });
      assert.ok(metrics.scroll <= width + 1, `${width}: page overflow ${metrics.scroll}`);
      assert.ok(metrics.area >= width - 1, `${width}: learner area not full-width`);
      assert.equal(metrics.columns, width >= 1920 ? 4 : width >= 1280 ? 3 : width >= 736 ? 2 : 1);
      assert.equal(await page.getByRole('navigation', { name: 'Learning shortcuts' }).count(), 1);
      assert.equal(await page.locator('form[action="/sign-out"] button').count(), 1);
      assert.equal(await page.getByText('Synthetic adult course').count(), 1);
      assert.equal(await page.getByText('Synthetic child course').count(), 1);
      assert.equal(await page.getByText('Synthetic child', { exact: true }).count(), 1);
      assert.equal(await page.getByText('Me', { exact: true }).count(), 1);
      console.log(`Synthetic learner dashboard ${width}: no overflow, ${metrics.columns} columns, distinct learner labels`);
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
