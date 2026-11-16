// Real enrolled-course route with synthetic loopback Auth and REST fixtures.
// It does not exercise real JWT validation, PostgREST filters or RLS.
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
const assignment = (id, title, cohort_id) => ({ id, title, cohort_id, course_id: 'course', course_version_id: 'version', instructions: '', due_after_days: null, due_at: null, accept_late: true, points_possible: null, status: 'open', revisions_allowed: false, revision_limit: null, created_at: '2026-01-01T00:00:00Z' });
const assignments = [assignment('general', 'Synthetic general assignment', null), assignment('member', 'Synthetic member assignment', 'cohort-member'), assignment('other', 'Synthetic other child assignment', 'cohort-other'), assignment('former', 'Synthetic former assignment', 'cohort-former')];
let available = true; let progressOn = true; const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{}'); return; }
  const request = new URL(req.url, 'http://localhost'); const path = request.pathname;
  let body = ''; for await (const part of req) body += part;
  const payload = body ? JSON.parse(body) : null; calls.push({ path, params: request.searchParams, payload });
  if (path === '/rest/v1/course_enrolments') res.end(JSON.stringify(available ? [{ id: 'enrolment', status: 'active', course_id: 'course', course_version_id: 'version', learner_profile_id: 'learner', enrolled_at: '2026-01-01T00:00:00Z', courses: [{ title: 'Synthetic course', slug: 'synthetic-course' }], course_versions: [{ version_number: 2, language: 'en', course_sections: [{ id: 'section', title: 'Synthetic section', position: 1, lessons: [{ id: 'lesson', title: 'Synthetic lesson', position: 1, is_preview: false }] }] }] }] : []));
  else if (path === '/rest/v1/rpc/setting_bool') res.end(JSON.stringify(payload.p_key === 'learning.progress' && progressOn));
  else if (path === '/rest/v1/lesson_progress') res.end('[]');
  else if (path === '/rest/v1/rpc/enrolment_progress_summary') res.end(JSON.stringify({ lessons_total: 1, lessons_done: 0, percent_complete: 0 }));
  else if (path === '/rest/v1/rpc/evaluate_completion') res.end(JSON.stringify({ is_complete: false, percent_complete: 0, requirements_met: 0, requirements_total: 1, blocking: [] }));
  else if (path === '/rest/v1/assessments') res.end('[]');
  else if (path === '/rest/v1/course_assignments') { res.setHeader('content-range', '0-3/4'); res.end(JSON.stringify(assignments)); }
  else if (path === '/rest/v1/assignment_submissions') {
    // Simulate server filtering by the learner explicitly requested by the app.
    if (request.searchParams.get('learner_profile_id') !== 'eq.learner') { res.writeHead(400); res.end('{"message":"missing learner scope"}'); return; }
    res.setHeader('content-range', '0-0/1'); res.end(JSON.stringify([{ id: 'submission', assignment_id: 'former', learner_profile_id: 'learner', course_enrolment_id: 'enrolment', body_text: '', status: 'submitted', submitted_at: '2026-01-01T00:00:00Z', is_late: false, score_earned: null, feedback: null, marked_at: null, revision_number: 1 }]));
  } else if (path === '/rest/v1/cohort_members') {
    if (request.searchParams.get('learner_profile_id') !== 'eq.learner') { res.writeHead(400); res.end('{"message":"missing learner scope"}'); return; }
    res.end(JSON.stringify([{ cohort_id: 'cohort-member' }]));
  } else if (path === '/rest/v1/cohorts') res.end('[]');
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
  const url = `http://localhost:${port}/learn/enrolment`;
  const request = (headers = {}) => fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const anonymous = await request(); assert.equal(anonymous.status, 307);
  const redirect = new URL(anonymous.headers.get('location'), url);
  assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), '/learn/enrolment');
  for (const mode of ['on', 'off', 'missing']) {
    available = mode !== 'missing'; progressOn = mode === 'on'; calls.length = 0;
    const response = await request({ cookie }); const html = await response.text();
    if (mode === 'missing') { assert.equal(response.status, 404); assert.equal(calls.some((c) => c.path === '/rest/v1/course_assignments'), false); continue; }
    assert.equal(response.status, 200); assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.match(html, /Synthetic course/); assert.match(html, /Synthetic lesson/);
    assert.match(html, /Synthetic general assignment/); assert.match(html, /Synthetic member assignment/); assert.match(html, /Synthetic former assignment/);
    assert.doesNotMatch(html, /Synthetic other child assignment/);
    assert.equal(html.includes('aria-label="Course progress"'), mode === 'on');
    assert.equal(html.includes('Progress tracking is not enabled yet.'), mode === 'off');
    for (const call of calls.filter((c) => ['/rest/v1/cohort_members', '/rest/v1/assignment_submissions'].includes(c.path))) assert.equal(call.params.get('learner_profile_id'), 'eq.learner');
  }
  console.log('Synthetic course route passed: sign-in, missing enrolment, flags, pinned outline, learner-scoped membership and assignment visibility. Not real Auth or RLS.');
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    available = true; progressOn = true;
    for (const width of [320, 390, 768, 1440, 1920, 2560]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: `http://localhost:${port}` }]);
      const page = await context.newPage(); await page.goto(url, { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => {
        const area = document.querySelector('.course-workspace'); if (!area) throw new Error('Synthetic course workspace missing');
        return { scroll: document.documentElement.scrollWidth, area: area.getBoundingClientRect().width,
          // How close the page's own blocks come to either edge of the screen.
          gutter: [...area.children].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(c).position !== 'fixed'; }).reduce((least, c) => { const r = c.getBoundingClientRect(); return Math.min(least, r.left, document.documentElement.clientWidth - r.right); }, Infinity) };
      });
      assert.ok(metrics.scroll <= width + 1, `${width}: page overflow ${metrics.scroll}`);
      assert.ok(metrics.area >= width - 1, `${width}: course workspace not full-width`);
      assert.ok(metrics.gutter >= 16, `${width}: course content is ${metrics.gutter}px from the edge of the screen`);
      assert.equal(await page.getByRole('heading', { name: 'Synthetic course' }).count(), 1);
      assert.ok(await page.getByRole('link', { name: 'Synthetic lesson' }).count() >= 1);
      assert.equal(await page.getByText('Synthetic other child assignment').count(), 0);
      assert.equal(await page.getByText('Synthetic former assignment').count(), 1);
      console.log(`Synthetic course ${width}: no overflow, full-width workspace and scoped assignments`);
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
