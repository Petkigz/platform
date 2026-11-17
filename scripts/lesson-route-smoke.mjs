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
let entitled = false; let mismatch = false; let multipleMedia = false; const calls = [];
const active = new Set(); const overlaps = [];
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
  if (['/rest/v1/lesson_transcripts', '/rest/v1/course_sections', '/rest/v1/lesson_progress', '/rest/v1/rpc/lesson_positions'].includes(path)) {
    for (const other of active) overlaps.push([path, other]);
    active.add(path);
    // Explicit delay makes overlap deterministic; it is not a latency benchmark.
    await new Promise((r) => setTimeout(r, 60));
    active.delete(path);
  }
  if (path === '/rest/v1/course_enrolments') res.end(JSON.stringify([{ id: 'enrolment', learner_profile_id: 'learner', status: 'active', source: 'free', course_version_id: 'version', courses: [{ id: 'course', title: 'Synthetic course' }] }]));
  else if (path === '/rest/v1/learner_profiles') res.end(JSON.stringify([{ id: 'learner' }]));
  else if (path === '/rest/v1/lessons') res.end(JSON.stringify({ id: 'lesson', section_id: 'section', title: 'Synthetic lesson', description: 'Synthetic reading text.', type: 'video', position: 1, duration_seconds: 120, is_preview: false, course_sections: [{ title: 'Synthetic section', course_version_id: mismatch ? 'other-version' : 'version' }] }));
  else if (path === '/rest/v1/lesson_resources') res.end(JSON.stringify([
    { id: 'resource', lesson_id: 'lesson', resource_type: 'video', display_name: 'Synthetic video', position: 1, external_url: 'https://example.invalid/demo.mp4', media_asset_id: null, access_classification: 'public_preview' },
    ...(multipleMedia ? [{ id: 'resource-two', lesson_id: 'lesson', resource_type: 'audio', display_name: 'Synthetic audio', position: 2, external_url: 'https://example.invalid/demo.mp3', media_asset_id: null, access_classification: 'public_preview' }] : []),
  ]));
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
    entitled = state === 'entitled'; mismatch = state === 'mismatch'; calls.length = 0; overlaps.length = 0;
    const response = await request({ cookie }); const html = await response.text();
    if (mismatch) { assert.equal(response.status, 404); assert.ok(!calls.includes('/rest/v1/rpc/can_access_lesson')); continue; }
    assert.equal(response.status, 200); assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.match(html, /Synthetic lesson/); assert.match(html, /Synthetic video/);
    assert.ok(!html.includes('shared between recordings'), 'one recording should not show the shared-position warning');
    assert.equal(html.includes('Synthetic private transcript.'), entitled);
    assert.equal(calls.includes('/rest/v1/lesson_transcripts'), entitled);
    assert.equal(calls.includes('/rest/v1/course_sections'), entitled);
    assert.equal(calls.includes('/rest/v1/rpc/record_analytics_event'), entitled);
    assert.equal(html.includes('Synthetic next lesson'), entitled);
    const overlap = (a, b) => overlaps.some((pair) => pair.includes(a) && pair.includes(b));
    assert.ok(overlap('/rest/v1/lesson_progress', '/rest/v1/rpc/lesson_positions'), 'progress and positions should overlap');
    if (entitled) assert.ok(overlap('/rest/v1/lesson_transcripts', '/rest/v1/course_sections'), 'transcript and outline should overlap');
  }
  entitled = true; mismatch = false; multipleMedia = true;
  const multiResponse = await request({ cookie }); const multiHtml = await multiResponse.text();
  assert.equal(multiResponse.status, 200); assert.match(multiHtml, /Synthetic audio/);
  assert.ok(multiHtml.includes('resourceId') && multiHtml.includes('resource-two'), 'players must receive recording identities');
  assert.ok(multiHtml.includes('legacyActorId') && multiHtml.includes(user.id), 'players must bind old places to the rendered actor');
  assert.ok(!multiHtml.includes('shared between recordings'), 'recordings have separate saved places');
  multipleMedia = false;
  console.log('Lesson route HTTP smoke passed: anonymous redirect, entitlement-gated transcript and outline, version mismatch, separate recording players and no-store. Synthetic data only.');

  // The page's frame, in the reader's language where that language has it and
  // in English, marked as English, where it does not. What the reader is shown
  // of this page runs from its wrapper to the footer; the response also
  // carries the 404 page as a boundary, which is English and not this page's.
  const visible = (html) => html.slice(html.indexOf('lesson-page'), html.indexOf('<footer')).replace(/<script[\s\S]*?<\/script>/g, '');
  const wrapper = (html) => html.match(/<div class="page lesson-page"[^>]*>/)?.[0] ?? '';
  entitled = true; mismatch = false;
  {
    const html = await (await request({ cookie })).text(); const body = visible(html);
    assert.equal(wrapper(html), '<div class="page lesson-page">');
    for (const text of ['aria-label="Breadcrumb"', '>My learning<', 'Not started', '>Transcript<', '>Materials<', '>Video<', 'Mark complete', 'Back to course', 'aria-label="Lesson navigation"', 'Course contents', 'Lesson 1 of 2', '>Discussion<', 'Discussion is not open on this lesson.']) assert.ok(body.includes(text), `English: ${text}`);
    assert.equal(body.includes('lang="en"'), false, 'an English lesson marks part of itself as English');
    assert.ok(body.includes('2 min'), 'the length of the lesson is missing');
  }
  {
    const html = await (await request({ cookie, 'accept-language': 'ar' })).text(); const body = visible(html);
    assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/); assert.equal(wrapper(html), '<div class="page lesson-page">');
    for (const text of ['aria-label="مسار التنقل"', '>تعلّمي<', 'لم يبدأ', '>النص المكتوب<', '>المواد<', '>فيديو<', 'تحديد كمكتمل', 'العودة إلى الدورة', 'aria-label="التنقل بين الدروس"', 'محتويات الدورة', 'الدرس 1 من 2', '>النقاش<', 'النقاش غير مفتوح في هذا الدرس.']) assert.ok(body.includes(text), `Arabic: ${text}`);
    for (const text of ['Breadcrumb', 'My learning', 'Not started', 'Transcript', 'Materials', '>Video<', 'Mark complete', 'Back to course', 'Lesson navigation', 'Course contents', 'Lesson 1 of', 'Discussion']) assert.equal(body.includes(text), false, `Arabic lesson still says "${text}"`);
    // The length of the lesson is said by the language's own locale data.
    assert.ok(body.includes('2 د'), 'the length of the lesson is not in Arabic'); assert.equal(body.includes('2 min'), false);
    // The player and the report form are English, and say so.
    assert.match(body, /<span class="t"[^>]*lang="en" dir="ltr"[^>]*>/);
    assert.match(body, /<section class="section"[^>]*lang="en" dir="ltr"/);
    // What the teacher wrote is not marked as anything.
    assert.match(body, /<h1>[^<]*(?:<[^>]+>)?Synthetic lesson/);
    entitled = false;
    const denied = visible(await (await request({ cookie, 'accept-language': 'ar' })).text());
    assert.equal(denied.includes('تحديد كمكتمل'), false); assert.equal(denied.includes('التنقل بين الدروس'), false);
    entitled = true;
  }
  {
    const html = await (await request({ cookie: `${cookie}; ayahspring_locale=fr`, 'accept-language': 'ar' })).text(); const body = visible(html);
    assert.match(html, /<html[^>]*lang="fr"/);
    for (const text of ['Fil d’Ariane', 'Non commencée', '>Supports<', '>Vidéo<', 'Marquer comme terminée', 'Retour au cours', 'Leçon 1 sur 2', 'La discussion n’est pas ouverte pour cette leçon.']) assert.ok(body.includes(text) || body.includes(text.replace('’', '&#x27;')), `French: ${text}`);
  }
  for (const [code, dir] of [['ha', 'ltr'], ['ps', 'rtl']]) {
    const html = await (await request({ cookie, 'accept-language': code })).text(); const body = visible(html);
    assert.match(html, new RegExp(`<html[^>]*lang="${code}"[^>]*dir="${dir}"`));
    assert.equal(wrapper(html), '<div class="page lesson-page" lang="en" dir="ltr">');
    assert.ok(body.includes('2 min'), `${code}: an English lesson gives its length in another language`);
    for (const text of ['aria-label="Breadcrumb"', '>Materials<', 'Mark complete', 'Lesson 1 of 2', 'Discussion is not open on this lesson.']) assert.ok(body.includes(text), `${code}: ${text}`);
  }
  {
    const html = await (await request({ cookie, 'accept-language': 'wo, fr' })).text();
    assert.match(html, /<html[^>]*lang="en"/); assert.ok(visible(html).includes('>Materials<')); assert.equal(visible(html).includes('Supports'), false);
  }
  console.log('Lesson languages passed: English, Arabic (frame translated, player and report form marked English), French by cookie, Hausa and Pashto frames with an English lesson, Wolof to English. No translation here has been read by a speaker.');
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
      // The state badge is as wide as its word, the mark-complete label is on
      // one line, and the tick box sits beside its label rather than above it.
      const fit = await page.evaluate(() => {
        const badge = document.querySelector('.lesson-badges .badge'); const mark = document.querySelector('.lesson-actions button');
        const box = document.querySelector('.lesson-page input[type="checkbox"]');
        const range = document.createRange(); range.selectNodeContents(badge);
        return { badge: badge.getBoundingClientRect().width - range.getBoundingClientRect().width, lines: (() => { const words = document.createRange(); words.selectNodeContents(mark); return new Set([...words.getClientRects()].map((r) => Math.round(r.top))).size; })(), box: box ? box.getBoundingClientRect().width : null };
      });
      assert.ok(fit.badge < 24, `${width}: the state badge is ${fit.badge}px wider than its word`);
      assert.ok(fit.lines <= 1, `${width}: the mark-complete label is on ${fit.lines} lines`);
      assert.ok(fit.box === null || fit.box < 30, `${width}: a tick box is ${fit.box}px wide`);
      // "Video" used to be printed in a column sized for a lesson number.
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('.lesson-page .lessons .n')].filter((el) => el.scrollWidth > el.clientWidth + 1).length), 0, `${width}: the kind of a material spills out of its column`);
      assert.equal(await page.getByRole('navigation', { name: 'Breadcrumb' }).count(), 1);
      assert.equal(await page.getByText('Synthetic private transcript.').count(), 1);
      console.log(`Synthetic lesson ${width}: no overflow, full-width layout, video fits`);
      await context.close();
    }
    // The translated frame in the other direction and with the longest words.
    for (const [code, dir] of [['ar', 'rtl'], ['ta', 'ltr']]) {
      for (const width of [320, 390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
        await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: `http://localhost:${port}` }, { name: 'ayahspring_locale', value: code, url: `http://localhost:${port}` }]);
        const page = await context.newPage();
        await page.route('https://example.invalid/**', (route) => route.abort());
        await page.goto(url, { waitUntil: 'networkidle' });
        const m = await page.evaluate(() => {
          const lesson = document.querySelector('.lesson-page'); const nav = lesson.querySelector('.lesson-nav');
          const arrows = [...nav.querySelectorAll('.lesson-nav-dir')].map((el) => getComputedStyle(el).transform);
          const sides = [...nav.querySelectorAll('.lesson-nav-side')].map((el) => el.getBoundingClientRect().left);
          return { scroll: document.documentElement.scrollWidth, dir: getComputedStyle(lesson).direction, arrows, sides,
            english: [...lesson.querySelectorAll('[lang="en"]')].map((el) => getComputedStyle(el).direction),
            clipped: [...lesson.querySelectorAll('.badge, .lessons .n, .btn:not(.lesson-nav .btn)')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
            kind: Math.max(...[...lesson.querySelectorAll('.lessons .n')].map((el) => el.getBoundingClientRect().right - el.getBoundingClientRect().left)),
            overlap: [...lesson.querySelectorAll('.lessons li')].some((li) => { const n = li.querySelector('.n').getBoundingClientRect(); const t = li.querySelector('.t').getBoundingClientRect(); return n.width > 0 && t.width > 0 && n.left < t.right && t.left < n.right && n.top < t.bottom && t.top < n.bottom; }) };
        });
        assert.ok(m.scroll <= width + 1, `${code} ${width}: page overflow ${m.scroll}`);
        assert.equal(m.dir, dir, `${code} ${width}: lesson direction`);
        assert.ok(m.english.length >= 2 && m.english.every((d) => d === 'ltr'), `${code} ${width}: an English part is laid out ${m.english}`);
        assert.deepEqual(m.clipped, [], `${code} ${width}: a label is cut off`);
        assert.equal(m.overlap, false, `${code} ${width}: the kind of a material runs into the material`);
        // Arrows are turned round right-to-left and left alone otherwise.
        assert.ok(m.arrows.length === 2 && m.arrows.every((a) => (dir === 'rtl') === a.startsWith('matrix(-1')), `${code} ${width}: arrows ${m.arrows}`);
        if (process.env.RESPONSIVE_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.RESPONSIVE_SCREENSHOTS, `lesson-${code}-${width}.png`), fullPage: true });
        await context.close();
      }
      console.log(`Synthetic lesson ${code}: 320, 390 and 1440 wide, no overflow, no clipped label, English parts left to right, arrows ${dir === 'rtl' ? 'turned round' : 'as typed'}`);
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
