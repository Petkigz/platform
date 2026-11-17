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
let available = true; let progressOn = true; let blocking = []; const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{}'); return; }
  const request = new URL(req.url, 'http://localhost'); const path = request.pathname;
  // The real server compares a column with the *word* "null" when asked
  // `eq.null`, and on a date column that is an error, not an empty answer.
  // These stand-ins used to answer it like any other request, which is how
  // eight such reads went unnoticed.
  if ([...new URL(req.url, 'http://localhost').searchParams.values()].some((value) => /^(?:not\.)?(?:eq|neq)\.(?:null|undefined)$/.test(value))) {
    res.writeHead(400); res.end(JSON.stringify({ code: '22007', message: 'invalid input syntax for type timestamp with time zone: "null"' })); return;
  }
  let body = ''; for await (const part of req) body += part;
  const payload = body ? JSON.parse(body) : null; calls.push({ path, params: request.searchParams, payload });
  if (path === '/rest/v1/course_enrolments') res.end(JSON.stringify(available ? [{ id: 'enrolment', status: 'active', course_id: 'course', course_version_id: 'version', learner_profile_id: 'learner', enrolled_at: '2026-01-01T00:00:00Z', courses: { title: 'Synthetic course', slug: 'synthetic-course' }, course_versions: { version_number: 2, language: 'en', course_sections: [{ id: 'section', title: 'Synthetic section', position: 1, lessons: [{ id: 'lesson', title: 'Synthetic lesson', position: 1, is_preview: false }] }] } }] : []));
  else if (path === '/rest/v1/rpc/setting_bool') res.end(JSON.stringify(payload.p_key === 'learning.progress' && progressOn));
  else if (path === '/rest/v1/lesson_progress') res.end('[]');
  else if (path === '/rest/v1/rpc/enrolment_progress_summary') res.end(JSON.stringify({ lessons_total: 1, lessons_done: 0, percent_complete: 0 }));
  else if (path === '/rest/v1/rpc/evaluate_completion') res.end(JSON.stringify({ is_complete: false, percent_complete: 0, requirements_met: 0, requirements_total: 1, blocking }));
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

  // The page's own words, in the reader's language where that language has
  // this screen and in English, marked as English, where it does not.
  const workspace = (html) => html.match(/<div class="container section course-workspace"[^>]*>/)?.[0] ?? '';
  // What the reader is shown of this page: from its wrapper to the footer. The
  // response also carries the 404 page as a boundary, which is still English
  // and is not this page's to answer for.
  const visible = (html) => html.slice(html.indexOf('course-workspace'), html.indexOf('<footer'));
  available = true; progressOn = true; blocking = ['Synthetic reason from the database'];
  {
    const html = await (await request({ cookie })).text();
    assert.equal(workspace(html), '<div class="container section course-workspace">');
    for (const text of ['My learning', 'Version 2 · EN', '0 of 1 lessons complete · 0%', 'Still to do:', 'Start the course', 'Open lesson 1', 'Lesson 1 of 1', 'Mark complete', 'Back to my learning']) assert.ok(html.includes(text), `English: ${text}`);
    // Nothing needs marking as English on an English page.
    assert.equal(visible(html).includes('lang="en" dir="ltr"'), false);
  }
  {
    const html = await (await request({ cookie, 'accept-language': 'ar' })).text();
    assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/); assert.equal(workspace(html), '<div class="container section course-workspace">');
    for (const text of ['aria-label="التقدّم في الدورة"', 'الإصدار 2 · EN', 'الدروس المكتملة: 0 من 1 · 0%', 'ما زال مطلوبًا:', 'تحديد كمكتمل', 'العودة إلى تعلّمي', 'الدرس 1 من 1']) assert.ok(html.includes(text), `Arabic: ${text}`);
    for (const text of ['Course progress', 'lessons complete', 'Still to do', 'Mark complete', 'Back to my learning', 'My learning', 'Start the course', 'Lesson 1 of 1']) assert.equal(visible(html).includes(text), false, `Arabic page still says "${text}"`);
    // The database's reason stays English, and says so.
    assert.match(html, /<ul[^>]*lang="en" dir="ltr"[^>]*><li>Synthetic reason from the database<\/li>/);
    // The assignment list is the reader's: its heading, "no deadline", the
    // status and the button. The titles are the teacher's, as written.
    assert.match(html, /<div><div class="outline-h"><h3>الواجبات<\/h3>/);
    for (const text of ['بلا موعد نهائي', 'لم يبدأ', 'بانتظار التصحيح', '>فتح<', '>عرض التسليم<']) assert.ok(visible(html).includes(text), `Arabic assignment list: ${text}`);
    for (const text of ['>Assignments<', 'No deadline', 'Not started', 'Waiting for marking', 'View submission', '>Open<']) assert.equal(visible(html).includes(text), false, `Arabic assignment list still says "${text}"`);
    progressOn = false;
    const off = await (await request({ cookie, 'accept-language': 'ar' })).text();
    assert.ok(off.includes('تتبّع التقدّم غير مفعّل بعد.')); assert.equal(off.includes('Progress tracking is not enabled yet.'), false);
    assert.equal(off.includes('تحديد كمكتمل'), false);
    progressOn = true;
  }
  {
    // The reader's own choice beats the device.
    const html = await (await request({ cookie: `${cookie}; ayahspring_locale=fr`, 'accept-language': 'ar' })).text();
    assert.match(html, /<html[^>]*lang="fr"/);
    for (const text of ['Progression du cours', '0 sur 1 leçons terminées · 0 %', 'Reste à faire :', 'Marquer comme terminée', 'Retour à mon apprentissage']) assert.ok(html.includes(text), `French: ${text}`);
  }
  for (const [code, dir] of [['ha', 'ltr'], ['ps', 'rtl']]) {
    // A language with a part held has no course page of its own: its frame,
    // then English that calls itself English.
    const html = await (await request({ cookie, 'accept-language': code })).text();
    assert.match(html, new RegExp(`<html[^>]*lang="${code}"[^>]*dir="${dir}"`));
    assert.equal(workspace(html), '<div class="container section course-workspace" lang="en" dir="ltr">');
    for (const text of ['aria-label="Course progress"', '0 of 1 lessons complete · 0%', 'Mark complete', 'Back to my learning']) assert.ok(html.includes(text), `${code}: ${text}`);
  }
  {
    // A withheld language is English in every case, frame included.
    const html = await (await request({ cookie, 'accept-language': 'wo, fr' })).text();
    assert.match(html, /<html[^>]*lang="en"/); assert.ok(html.includes('aria-label="Course progress"'));
    assert.equal(html.includes('Progression du cours'), false);
  }
  blocking = [];
  console.log('Synthetic course languages passed: English, Arabic (direction, marked English parts), French by cookie, Hausa and Pashto frames with an English page, Wolof to English. No translation here has been read by a speaker.');
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
          // The narrowest title in any list on the page.
          title: Math.min(...[...area.querySelectorAll('.lessons .t')].map((el) => el.getBoundingClientRect().width)),
          // How close the page's own blocks come to either edge of the screen.
          gutter: [...area.children].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(c).position !== 'fixed'; }).reduce((least, c) => { const r = c.getBoundingClientRect(); return Math.min(least, r.left, document.documentElement.clientWidth - r.right); }, Infinity) };
      });
      assert.ok(metrics.scroll <= width + 1, `${width}: page overflow ${metrics.scroll}`);
      assert.ok(metrics.area >= width - 1, `${width}: course workspace not full-width`);
      assert.ok(metrics.gutter >= 16, `${width}: course content is ${metrics.gutter}px from the edge of the screen`);
      // A title squeezed by its own badge and button read one letter per line.
      assert.ok(metrics.title >= 100, `${width}: a lesson or assignment title is ${metrics.title}px wide`);
      assert.equal(await page.getByRole('heading', { name: 'Synthetic course' }).count(), 1);
      assert.ok(await page.getByRole('link', { name: 'Synthetic lesson' }).count() >= 1);
      assert.equal(await page.getByText('Synthetic other child assignment').count(), 0);
      assert.equal(await page.getByText('Synthetic former assignment').count(), 1);
      console.log(`Synthetic course ${width}: no overflow, full-width workspace and scoped assignments`);
      await context.close();
    }
    // The translated page, where the longer sentences and the other direction
    // are: Arabic (right-to-left) and Tamil (the longest words here).
    blocking = ['Synthetic reason from the database'];
    for (const [code, dir, mark, tasks] of [['ar', 'rtl', 'تحديد كمكتمل', 'الواجبات'], ['ta', 'ltr', 'முடிந்ததாகக் குறி', 'ஒப்படைப்புகள்']]) {
      for (const width of [320, 390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
        await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: `http://localhost:${port}` }, { name: 'ayahspring_locale', value: code, url: `http://localhost:${port}` }]);
        const page = await context.newPage(); await page.goto(url, { waitUntil: 'networkidle' });
        const m = await page.evaluate(() => {
          const area = document.querySelector('.course-workspace');
          const reasons = area.querySelector('.notice.warn ul');
          const lists = [...area.querySelectorAll('div[lang="en"]')];
          return { scroll: document.documentElement.scrollWidth, pageDir: getComputedStyle(area).direction,
            title: Math.min(...[...area.querySelectorAll('.lessons .t')].map((el) => el.getBoundingClientRect().width)),
            reasonsDir: reasons ? getComputedStyle(reasons).direction : null, englishBlocks: lists.map((el) => getComputedStyle(el).direction),
            clipped: [...area.querySelectorAll('button, a.btn, .badge')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent) };
        });
        assert.ok(m.scroll <= width + 1, `${code} ${width}: page overflow ${m.scroll}`);
        assert.equal(m.pageDir, dir, `${code} ${width}: page direction`);
        assert.equal(m.reasonsDir, 'ltr', `${code} ${width}: the database's English reasons inherit the page direction`);
        // The assignment list was the English block here until it was
        // translated; any that remain are still laid out left to right.
        assert.ok(m.englishBlocks.every((d) => d === 'ltr'), `${code} ${width}: an English list is laid out ${m.englishBlocks}`);
        assert.equal(await page.getByRole('heading', { name: tasks, exact: true }).count(), 1, `${code} ${width}: the assignment list has no heading in ${code}`);
        assert.deepEqual(m.clipped, [], `${code} ${width}: a control's label is cut off`);
        assert.ok(m.title >= 100, `${code} ${width}: a lesson or assignment title is ${m.title}px wide`);
        assert.equal(await page.getByRole('button', { name: mark }).count(), 1);
        if (process.env.RESPONSIVE_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.RESPONSIVE_SCREENSHOTS, `course-${code}-${width}.png`), fullPage: true });
        await context.close();
      }
      console.log(`Synthetic course ${code}: 320, 390 and 1440 wide, no overflow, no clipped label, English parts laid out left to right`);
    }
    blocking = [];
  }
} catch (e) { console.error(logs); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
