// Actual Next lesson route with fabricated loopback Auth/REST responses.
// Does not exercise hosted Auth, JWT validation, real PostgREST or RLS.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;
let entitled = false; let mismatch = false; const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{}'); return; }
  let body = ''; for await (const part of req) body += part;
  const path = new URL(req.url, 'http://localhost').pathname;
  calls.push(path);
  if (path === '/rest/v1/course_enrolments') res.end(JSON.stringify([{ id: 'enrolment', learner_profile_id: 'learner', status: 'active', source: 'free', course_version_id: 'version', courses: [{ id: 'course', title: 'Synthetic course' }] }]));
  else if (path === '/rest/v1/learner_profiles') res.end(JSON.stringify([{ id: 'learner' }]));
  else if (path === '/rest/v1/lessons') res.end(JSON.stringify({ id: 'lesson', section_id: 'section', title: 'Synthetic lesson', description: 'Synthetic reading text.', type: 'video', position: 1, duration_seconds: 120, is_preview: false, course_sections: [{ title: 'Synthetic section', course_version_id: mismatch ? 'other-version' : 'version' }] }));
  else if (path === '/rest/v1/lesson_resources') res.end(JSON.stringify([{ id: 'resource', lesson_id: 'lesson', resource_type: 'video', display_name: 'Synthetic video', position: 1, external_url: 'https://example.invalid/demo.mp4', media_asset_id: null, access_classification: 'public_preview' }]));
  else if (path === '/rest/v1/rpc/can_access_lesson') res.end(JSON.stringify(entitled));
  else if (path === '/rest/v1/lesson_transcripts') res.end(JSON.stringify([{ lesson_id: 'lesson', body: 'Synthetic private transcript.' }]));
  else if (path === '/rest/v1/course_sections') res.end(JSON.stringify([{ id: 'section', title: 'Synthetic section', position: 1, lessons: [{ id: 'lesson', title: 'Synthetic lesson', position: 1 }, { id: 'next', title: 'Synthetic next lesson', position: 2 }] }]));
  else if (path === '/rest/v1/rpc/record_analytics_event') res.end('{"recorded":true}');
  else if (path === '/rest/v1/lesson_progress') res.end('[]');
  else if (path === '/rest/v1/rpc/lesson_positions') res.end('{}');
  else if (path === '/rest/v1/rpc/setting_bool') res.end('false');
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
  const url = `http://localhost:${port}/learn/enrolment/lesson/lesson`;
  const request = (headers = {}) => fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const anonymous = await request(); assert.equal(anonymous.status, 307);
  const redirect = new URL(anonymous.headers.get('location'), url);
  assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), '/learn/enrolment/lesson/lesson');
  for (const state of ['denied', 'entitled', 'mismatch']) {
    entitled = state === 'entitled'; mismatch = state === 'mismatch'; calls.length = 0;
    const response = await request({ cookie }); const html = await response.text();
    if (mismatch) { assert.equal(response.status, 404); assert.ok(!calls.includes('/rest/v1/rpc/can_access_lesson')); continue; }
    assert.equal(response.status, 200); assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.match(html, /Synthetic lesson/); assert.match(html, /Synthetic video/);
    assert.equal(html.includes('Synthetic private transcript.'), entitled);
    assert.equal(calls.includes('/rest/v1/lesson_transcripts'), entitled);
    assert.equal(calls.includes('/rest/v1/course_sections'), entitled);
    assert.equal(calls.includes('/rest/v1/rpc/record_analytics_event'), entitled);
    assert.equal(html.includes('Synthetic next lesson'), entitled);
  }
  console.log('Lesson route HTTP smoke passed: anonymous redirect, entitlement-gated transcript and outline, version mismatch and no-store. Synthetic data only.');
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    entitled = true; mismatch = false;
    for (const width of [320, 390, 768, 1440, 1920, 2560]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: `http://localhost:${port}` }]);
      const page = await context.newPage();
      await page.route('https://example.invalid/**', (route) => route.abort());
      await page.goto(url, { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => {
        const lesson = document.querySelector('.lesson-page'); const video = document.querySelector('video');
        if (!lesson || !video) throw new Error('Synthetic lesson or video missing');
        return { scroll: document.documentElement.scrollWidth, page: lesson.getBoundingClientRect().width,
          video: video.getBoundingClientRect().width, videoRight: video.getBoundingClientRect().right };
      });
      assert.ok(metrics.scroll <= width + 1, `${width}: page overflow ${metrics.scroll}`);
      assert.ok(metrics.page >= width - 1, `${width}: lesson does not fill viewport`);
      assert.ok(metrics.video > 0 && metrics.videoRight <= width + 1, `${width}: video outside viewport`);
      assert.equal(await page.getByRole('navigation', { name: 'Breadcrumb' }).count(), 1);
      assert.equal(await page.getByText('Synthetic private transcript.').count(), 1);
      console.log(`Synthetic lesson ${width}: no overflow, full-width layout, video fits`);
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
