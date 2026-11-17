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
let entitled = false; let mismatch = false; let multipleMedia = false; let uploads = null; let extras = false; const calls = [];
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
  // The real server compares a column with the *word* "null" when asked
  // `eq.null`, and on a date column that is an error, not an empty answer.
  // These stand-ins used to answer it like any other request, which is how
  // eight such reads went unnoticed.
  if ([...new URL(req.url, 'http://localhost').searchParams.values()].some((value) => /^(?:not\.)?(?:eq|neq)\.(?:null|undefined)$/.test(value))) {
    res.writeHead(400); res.end(JSON.stringify({ code: '22007', message: 'invalid input syntax for type timestamp with time zone: "null"' })); return;
  }
  if (['/rest/v1/lesson_transcripts', '/rest/v1/course_sections', '/rest/v1/lesson_progress', '/rest/v1/rpc/lesson_positions'].includes(path)) {
    for (const other of active) overlaps.push([path, other]);
    active.add(path);
    // Explicit delay makes overlap deterministic; it is not a latency benchmark.
    await new Promise((r) => setTimeout(r, 60));
    active.delete(path);
  }
  if (path === '/rest/v1/course_enrolments') res.end(JSON.stringify([{ id: 'enrolment', learner_profile_id: 'learner', status: 'active', source: 'free', course_version_id: 'version', courses: { id: 'course', title: 'Synthetic course' } }]));
  else if (path === '/rest/v1/learner_profiles') res.end(JSON.stringify([{ id: 'learner' }]));
  else if (path === '/rest/v1/lessons') res.end(JSON.stringify({ id: 'lesson', section_id: 'section', title: 'Synthetic lesson', description: 'Synthetic reading text.', type: 'video', position: 1, duration_seconds: 120, is_preview: false, course_sections: { title: 'Synthetic section', course_version_id: mismatch ? 'other-version' : 'version' } }));
  else if (path === '/rest/v1/lesson_resources') res.end(JSON.stringify([
    { id: 'resource', lesson_id: 'lesson', resource_type: 'video', display_name: 'Synthetic video', position: 1, external_url: 'https://example.invalid/demo.mp4', media_asset_id: null, access_classification: 'public_preview' },
    // Two uploaded files with no copy to play: one still on its way, one that
    // needs a person. `uploads` is what the database says of each.
    ...(uploads ? [
      { id: 'upload-waiting', lesson_id: 'lesson', resource_type: 'audio', display_name: 'Synthetic waiting upload', position: 3, external_url: null, media_asset_id: 'asset-waiting', access_classification: 'enrolled' },
      { id: 'upload-broken', lesson_id: 'lesson', resource_type: 'video', display_name: 'Synthetic broken upload', position: 4, external_url: null, media_asset_id: 'asset-broken', access_classification: 'enrolled' },
    ] : []),
    ...(multipleMedia ? [{ id: 'resource-two', lesson_id: 'lesson', resource_type: 'audio', display_name: 'Synthetic audio', position: 2, external_url: 'https://example.invalid/demo.mp3', media_asset_id: null, access_classification: 'public_preview' }] : []),
  ]));
  else if (path === '/rest/v1/rpc/can_access_lesson') res.end(JSON.stringify(entitled));
  else if (path === '/rest/v1/lesson_transcripts') res.end(JSON.stringify([{ lesson_id: 'lesson', body: 'Synthetic private transcript.' }]));
  else if (path === '/rest/v1/course_sections') res.end(JSON.stringify([{ id: 'section', title: 'Synthetic section', position: 1, lessons: [{ id: 'lesson', title: 'Synthetic lesson', position: 1 }, { id: 'next', title: 'Synthetic next lesson', position: 2 }] }]));
  else if (path === '/rest/v1/rpc/record_analytics_event') res.end('{"recorded":true}');
  else if (path === '/rest/v1/lesson_progress') res.end('[]');
  else if (path === '/rest/v1/rpc/lesson_positions') res.end('{}');
  else if (path === '/rest/v1/media_renditions') res.end('[]');
  else if (path === '/rest/v1/rpc/lesson_playback_standing') res.end(JSON.stringify(uploads ?? []));
  // `extras` switches on the two parts of a lesson that ship switched off and
  // gives each something to show: practice questions, and a note with no bookmark.
  else if (path === '/rest/v1/rpc/setting_bool') res.end(JSON.stringify(extras && ['learning.assessments', 'learning.notes_bookmarks'].includes(JSON.parse(body || '{}').p_key)));
  else if (extras && path === '/rest/v1/assessments') res.end(JSON.stringify([{ id: 'practice', title: 'Synthetic practice', instructions: 'Synthetic instructions.', type: 'practice', pass_threshold: null, attempt_limit: null, lesson_id: 'lesson' }]));
  else if (extras && path === '/rest/v1/assessment_questions') res.end(JSON.stringify([
    { id: 'q-choice', assessment_id: 'practice', type: 'single_choice', content: { prompt: 'Synthetic choice question', choices: [{ id: 'a', text: 'Synthetic first choice' }, { id: 'b', text: 'Synthetic second choice' }] }, points: 1, position: 1, explanation: null, grading_method: 'automatic' },
    { id: 'q-truth', assessment_id: 'practice', type: 'true_false', content: { prompt: 'Synthetic true or false question' }, points: 1, position: 2, explanation: null, grading_method: 'automatic' },
    { id: 'q-words', assessment_id: 'practice', type: 'short_answer', content: {}, points: 1, position: 3, explanation: null, grading_method: 'automatic' },
  ]));
  else if (extras && path === '/rest/v1/lesson_notes') res.end(JSON.stringify([{ body: 'Synthetic saved note.' }]));
  else if (extras && path === '/rest/v1/lesson_bookmarks') res.end('[]');
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
  // carries the 404 page as a boundary, which has its own language rule
  // (`redirect-route-smoke.mjs`) and is not this page's.
  const visible = (html) => html.slice(html.indexOf('lesson-page'), html.indexOf('<footer')).replace(/<script[\s\S]*?<\/script>/g, '');
  const wrapper = (html) => html.match(/<div class="page lesson-page"[^>]*>/)?.[0] ?? '';
  entitled = true; mismatch = false;
  {
    const html = await (await request({ cookie })).text(); const body = visible(html);
    assert.equal(wrapper(html), '<div class="page lesson-page">');
    for (const text of ['aria-label="Breadcrumb"', '>My learning<', 'Not started', '>Transcript<', '>Materials<', '>Video<', 'Mark complete', 'Back to course', 'aria-label="Lesson navigation"', 'Course contents', 'Lesson 1 of 2', '>Discussion<', 'Discussion is not open on this lesson.']) assert.ok(body.includes(text), `English: ${text}`);
    assert.equal(body.includes('lang="en"'), false, 'an English lesson marks part of itself as English');
    assert.match(body, /<section class="section"[^>]*>\s*<button type="button" class="linklike"[^>]*>Report a problem<\/button>/);
    assert.ok(body.includes('2 min'), 'the length of the lesson is missing');
  }
  {
    const html = await (await request({ cookie, 'accept-language': 'ar' })).text(); const body = visible(html);
    assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/); assert.equal(wrapper(html), '<div class="page lesson-page">');
    for (const text of ['aria-label="مسار التنقل"', '>تعلّمي<', 'لم يبدأ', '>النص المكتوب<', '>المواد<', '>فيديو<', 'تحديد كمكتمل', 'العودة إلى الدورة', 'aria-label="التنقل بين الدروس"', 'محتويات الدورة', 'الدرس 1 من 2', '>النقاش<', 'النقاش غير مفتوح في هذا الدرس.']) assert.ok(body.includes(text), `Arabic: ${text}`);
    for (const text of ['Breadcrumb', 'My learning', 'Not started', 'Transcript', 'Materials', '>Video<', 'Mark complete', 'Back to course', 'Lesson navigation', 'Course contents', 'Lesson 1 of', 'Discussion']) assert.equal(body.includes(text), false, `Arabic lesson still says "${text}"`);
    // The length of the lesson is said by the language's own locale data.
    assert.ok(body.includes('2 د'), 'the length of the lesson is not in Arabic'); assert.equal(body.includes('2 min'), false);
    // The player is English, and says so. The report form at the foot is the
    // reader's: its link is Arabic and nothing marks it as English.
    assert.match(body, /<span class="t"[^>]*lang="en" dir="ltr"[^>]*>/);
    assert.doesNotMatch(body, /<section class="section"[^>]*lang="en"/);
    assert.match(body, /<section class="section"[^>]*>\s*<button type="button" class="linklike"[^>]*>الإبلاغ عن مشكلة<\/button>/);
    assert.equal(body.includes('Report a problem'), false, 'Arabic lesson still says "Report a problem"');
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
    assert.ok(body.includes('>Signaler un problème<'), 'French: the report link');
    for (const text of ['Fil d’Ariane', 'Non commencée', '>Supports<', '>Vidéo<', 'Marquer comme terminée', 'Retour au cours', 'Leçon 1 sur 2', 'La discussion n’est pas ouverte pour cette leçon.']) assert.ok(body.includes(text) || body.includes(text.replace('’', '&#x27;')), `French: ${text}`);
  }
  for (const [code, dir] of [['ha', 'ltr'], ['ps', 'rtl']]) {
    const html = await (await request({ cookie, 'accept-language': code })).text(); const body = visible(html);
    assert.match(html, new RegExp(`<html[^>]*lang="${code}"[^>]*dir="${dir}"`));
    assert.equal(wrapper(html), '<div class="page lesson-page" lang="en" dir="ltr">');
    assert.ok(body.includes('2 min'), `${code}: an English lesson gives its length in another language`);
    for (const text of ['aria-label="Breadcrumb"', '>Materials<', 'Mark complete', 'Lesson 1 of 2', 'Discussion is not open on this lesson.', '>Report a problem<']) assert.ok(body.includes(text), `${code}: ${text}`);
  }
  // A recording that cannot be played is explained in the reader's language,
  // and the way to tell a person about it is too. It was English, marked as
  // English, in the middle of a translated page.
  uploads = [{ resource_id: 'upload-waiting', state: 'preparing' }, { resource_id: 'upload-broken', state: 'unavailable' }];
  {
    const body = visible(await (await request({ cookie })).text());
    for (const text of ['One recording cannot be played', 'Synthetic waiting upload', 'Not ready yet', 'still being prepared', 'Synthetic broken upload', 'Not available', 'waiting will not fix it']) assert.ok(body.includes(text), `English: ${text}`);
    assert.equal(body.split('>Tell us about this recording<').length - 1, 2, 'the way to tell a person is offered above the materials and beside the broken recording, and nowhere else');
    assert.equal(body.includes('lang="en"'), false);
    assert.equal(/not ready yet\./.test(body), false, 'the heading is still lower-cased into the sentence');
  }
  {
    const body = visible(await (await request({ cookie, 'accept-language': 'ar' })).text());
    for (const text of ['تسجيل واحد لا يمكن تشغيله', 'الانتظار لن يصلح هذا', 'ليس جاهزًا بعد', 'ما زال قيد الإعداد', 'غير متاح', 'لا يمكن تشغيل هذا التسجيل الآن']) assert.ok(body.includes(text), `Arabic: ${text}`);
    assert.equal(body.split('>أخبرنا عن هذا التسجيل<').length - 1, 2);
    for (const text of ['cannot be played', 'Not ready yet', 'Not available', 'Tell us about this recording', 'being prepared']) assert.equal(body.includes(text), false, `Arabic lesson still says "${text}"`);
    // The notice above the materials is not marked as English, and neither is
    // a row that holds a note; the row that holds a player still is.
    assert.doesNotMatch(body, /<div class="notice"[^>]*lang="en"/);
    assert.match(body, /<span class="t"><span class="muted"><strong><bdi>Synthetic broken upload<\/bdi><\/strong>/);
    assert.equal(body.split('<span class="t" lang="en" dir="ltr">').length - 1, 1);
    // Still being prepared: nobody is sent to a queue about it.
    const waiting = body.slice(body.indexOf('Synthetic waiting upload'), body.indexOf('Synthetic broken upload'));
    assert.equal(waiting.includes('أخبرنا عن هذا التسجيل'), false);
  }
  {
    // One still on its way and nothing broken: the quieter heading, and no way to report.
    uploads = [{ resource_id: 'upload-waiting', state: 'preparing' }, { resource_id: 'upload-broken', state: 'plays' }];
    const body = visible(await (await request({ cookie: `${cookie}; ayahspring_locale=fr`, 'accept-language': 'ar' })).text());
    assert.ok(body.includes('Une partie est encore en préparation') && body.includes('Pas encore prêt'), 'French: the preparing notes');
    assert.equal(body.includes('Nous signaler cet enregistrement'), false);
  }
  {
    // A held language reads the same notes in English inside its English lesson.
    uploads = [{ resource_id: 'upload-waiting', state: 'unavailable' }, { resource_id: 'upload-broken', state: 'unavailable' }];
    const body = visible(await (await request({ cookie, 'accept-language': 'ha' })).text());
    assert.ok(body.includes('Some recordings cannot be played'));
    assert.equal(body.split('>Tell us about this recording<').length - 1, 3);
  }
  uploads = null;
  // Practice questions and the learner's own note and bookmark. Both were
  // English, marked as English, for every reader. What is checked here is what
  // the server draws before anybody presses anything.
  extras = true;
  const counter = (code) => `${new Intl.NumberFormat(code).format(21)}<!-- -->/<!-- -->${new Intl.NumberFormat(code).format(4000)}`;
  const englishExtras = ['Check yourself', 'These are not marked', '>Check<', '>True<', '>False<', '>Your answer<', 'Untitled question', 'aria-label="Your private study tools"', 'Your study tools', '>Bookmark lesson<', '>Private lesson note<', 'placeholder="Save a thought or reminder for yourself…"', '>Save note<', '>Clear note<', 'Notes and bookmarks are private to your account.'];
  {
    const body = visible(await (await request({ cookie })).text());
    for (const text of [...englishExtras, 'Synthetic practice', 'Synthetic instructions.', '<bdi>Synthetic choice question</bdi>', '<span dir="auto">Synthetic first choice</span>', 'Synthetic saved note.', counter('en')]) assert.ok(body.includes(text), `English: ${text}`);
    assert.equal(body.includes('lang="en"'), false);
    assert.equal(body.split('>Check<').length - 1, 3, 'one Check button for each of three questions');
  }
  {
    const body = visible(await (await request({ cookie, 'accept-language': 'ar' })).text());
    for (const text of ['اختبر نفسك', 'هذه الأسئلة لا تُصحَّح', '>تحقّق<', '>صواب<', '>خطأ<', '>إجابتك<', 'سؤال بلا عنوان', 'أدوات دراستك', '>أضف الدرس إلى الإشارات المرجعية<', '>ملاحظة خاصة على الدرس<', 'placeholder="احفظ فكرة أو تذكيرًا لنفسك…"', '>حفظ الملاحظة<', '>مسح الملاحظة<', 'الملاحظات والإشارات المرجعية خاصة بحسابك.']) assert.ok(body.includes(text), `Arabic: ${text}`);
    for (const text of englishExtras) assert.equal(body.includes(text), false, `Arabic lesson still says "${text}"`);
    // What the teacher and the learner wrote is as they wrote it.
    for (const text of ['Synthetic practice', 'Synthetic instructions.', '<bdi>Synthetic choice question</bdi>', 'Synthetic saved note.']) assert.ok(body.includes(text), `Arabic: ${text}`);
    // The question numbers and the counter are written the reader's way.
    assert.ok(body.includes(counter('ar')), `Arabic: the counter is not ${counter('ar')}`);
    assert.ok(body.includes(`${new Intl.NumberFormat('ar').format(3)}<!-- -->. `), 'Arabic: the third question is not numbered the reader\u2019s way');
    // Neither part is marked as English any more: the player's row is the only one.
    assert.equal(body.split('lang="en" dir="ltr"').length - 1, 1);
  }
  {
    const body = visible(await (await request({ cookie: `${cookie}; ayahspring_locale=fr`, 'accept-language': 'ar' })).text());
    for (const text of ['Testez-vous', '>Vérifier<', '>Vrai<', '>Faux<', 'Vos outils d’étude', '>Ajouter la leçon aux favoris<', '>Enregistrer la note<', '>Effacer la note<']) assert.ok(body.includes(text) || body.includes(text.replace('’', '&#x27;')), `French: ${text}`);
  }
  {
    // A held language reads both in English, inside its English lesson.
    const body = visible(await (await request({ cookie, 'accept-language': 'ha' })).text());
    for (const text of englishExtras) assert.ok(body.includes(text), `ha: ${text}`);
    assert.ok(body.includes(counter('en')));
  }
  extras = false;
  {
    const html = await (await request({ cookie, 'accept-language': 'wo, fr' })).text();
    assert.match(html, /<html[^>]*lang="en"/); assert.ok(visible(html).includes('>Materials<')); assert.equal(visible(html).includes('Supports'), false);
  }
  console.log('Lesson languages passed: English, Arabic (frame, report link, the notes about a recording that cannot play, practice questions and study tools translated, player marked English), French by cookie, Hausa and Pashto frames with an English lesson, Wolof to English. No translation here has been read by a speaker.');
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
    // The translated frame in the other direction and with the longest words,
    // with practice questions and the study tools on the page.
    extras = true;
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
        assert.ok(m.english.length >= 1 && m.english.every((d) => d === 'ltr'), `${code} ${width}: an English part is laid out ${m.english}`);
        assert.deepEqual(m.clipped, [], `${code} ${width}: a label is cut off`);
        assert.equal(m.overlap, false, `${code} ${width}: the kind of a material runs into the material`);
        // Arrows are turned round right-to-left and left alone otherwise.
        assert.ok(m.arrows.length === 2 && m.arrows.every((a) => (dir === 'rtl') === a.startsWith('matrix(-1')), `${code} ${width}: arrows ${m.arrows}`);
        // The report form is the reader's: it opens in their language and
        // direction, with a name for each of the seven kinds, and fits.
        await page.locator('.lesson-page section.section button.linklike').click();
        await page.locator('.lesson-page section.section h3').waitFor();
        const form = await page.evaluate(() => {
          const section = document.querySelector('.lesson-page section.section');
          return { heading: section.querySelector('h3').textContent, dir: getComputedStyle(section).direction,
            kinds: [...section.querySelectorAll('select option')].map((o) => o.textContent),
            buttons: [...section.querySelectorAll('.btn')].map((b) => b.textContent),
            scroll: document.documentElement.scrollWidth,
            clipped: [...section.querySelectorAll('.btn, select')].filter((el) => el.scrollWidth > el.clientWidth + 1).length };
        });
        assert.equal(form.dir, dir, `${code} ${width}: report form direction`);
        assert.equal(form.kinds.length, 7, `${code} ${width}: report kinds ${form.kinds}`);
        for (const english of ['Report a problem', 'Doctrinal error', 'Something else', 'Send report', 'Cancel']) assert.equal([form.heading, ...form.kinds, ...form.buttons].includes(english), false, `${code} ${width}: the report form says "${english}"`);
        assert.ok(form.scroll <= width + 1, `${code} ${width}: the open report form overflows to ${form.scroll}`);
        assert.equal(form.clipped, 0, `${code} ${width}: a report control is cut off`);
        // A refusal is said in the reader's language, never in the server's
        // English; a reply that never came says something else again; and
        // Cancel after either brings the link back.
        const section = page.locator('.lesson-page section.section');
        const said = [];
        for (const reply of ['refused', 'lost']) {
          await page.route('**/api/reports', (route) => (reply === 'lost' ? route.abort() : route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'SERVER ENGLISH SENTENCE', code: 'duplicate' }) })));
          await section.locator('textarea').fill('Synthetic report.');
          const answered = reply === 'lost' ? page.waitForEvent('requestfailed', (request) => request.url().endsWith('/api/reports')) : page.waitForResponse('**/api/reports');
          await section.locator('.btn').first().click();
          await answered;
          await section.locator('.notice.error').waitFor();
          said.push((await section.locator('.notice.error').textContent()).trim());
          await page.unroute('**/api/reports');
        }
        assert.ok(said.every((text) => text.length > 0 && !/SERVER ENGLISH|already have an open report|could not confirm/u.test(text)), `${code} ${width}: a failed report is answered ${JSON.stringify(said)}`);
        assert.notEqual(said[0], said[1], `${code} ${width}: a refusal and a lost reply say the same thing`);
        assert.equal(await section.locator('textarea').getAttribute('dir'), 'auto');
        await section.locator('.btn.ghost').click();
        assert.equal(await section.locator('button.linklike').count(), 1, `${code} ${width}: Cancel after a refusal does not bring the link back`);
        // Practice questions: a wrong answer, a refusal and a reply that never
        // came are each answered in the reader's language, and the button is
        // not left busy.
        const practice = page.locator('.lesson-page section.card:has(input[name^="practice-"])');
        const checkButton = practice.locator('button.btn').first();
        const english = /SERVER ENGLISH|Not quite|Try again|could not be checked|Sign in|could not confirm|Note saved|bookmarked/u;
        await page.route('**/api/learn/check', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, correct: false, explanation: null }) }));
        await practice.locator('input[type="radio"]').nth(0).check();
        await checkButton.click();
        await practice.locator('.notice.warn').waitFor();
        const wrong = (await practice.locator('.notice.warn').textContent()).trim();
        assert.ok(wrong.length > 0 && !english.test(wrong), `${code} ${width}: a wrong practice answer is answered "${wrong}"`);
        await page.unroute('**/api/learn/check');
        const unchecked = [];
        for (const reply of ['refused', 'lost']) {
          await page.route('**/api/learn/check', (route) => (reply === 'lost' ? route.abort() : route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'SERVER ENGLISH SENTENCE' }) })));
          await practice.locator('input[type="radio"]').nth(reply === 'lost' ? 0 : 1).check();
          const answered = reply === 'lost' ? page.waitForEvent('requestfailed', (request) => request.url().endsWith('/api/learn/check')) : page.waitForResponse('**/api/learn/check');
          await checkButton.click();
          await answered;
          await practice.locator('.notice.error').waitFor();
          unchecked.push((await practice.locator('.notice.error').textContent()).trim());
          await page.unroute('**/api/learn/check');
        }
        assert.ok(unchecked.every((text) => text.length > 0 && !english.test(text)), `${code} ${width}: a check that failed is answered ${JSON.stringify(unchecked)}`);
        assert.equal(await checkButton.isEnabled(), true, `${code} ${width}: the Check button is left busy after a reply that never came`);
        // The study tools: a session that ended and any other refusal say
        // different things, neither of them the server's; a note that saves
        // says so; the counter is in the reader's digits.
        const tools = page.locator('.lesson-page section.card:has(#lesson-note)');
        const refusals = [];
        for (const status of [401, 409]) {
          await page.route('**/api/lesson-study-tools', (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error: 'SERVER ENGLISH SENTENCE' }) }));
          const answered = page.waitForResponse('**/api/lesson-study-tools');
          await tools.locator('button.btn.secondary').click();
          await answered;
          await tools.locator('p.danger').waitFor();
          refusals.push((await tools.locator('p.danger').textContent()).trim());
          await page.unroute('**/api/lesson-study-tools');
        }
        assert.ok(refusals.every((text) => text.length > 0 && !english.test(text)), `${code} ${width}: a study-tools refusal is answered ${JSON.stringify(refusals)}`);
        assert.notEqual(refusals[0], refusals[1], `${code} ${width}: a session that ended and another refusal say the same thing`);
        await page.route('**/api/lesson-study-tools', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
        await tools.locator('#lesson-note').fill('Synthetic note.');
        const digits = (value) => new Intl.NumberFormat(code).format(value);
        assert.ok((await tools.textContent()).includes(`${digits(15)}/${digits(4000)}`), `${code} ${width}: the counter is not ${digits(15)}/${digits(4000)}`);
        await tools.locator('button.btn:not(.secondary):not(.ghost)').click();
        await tools.locator('p.notice').waitFor();
        const kept = (await tools.locator('p.notice').textContent()).trim();
        assert.ok(kept.length > 0 && !english.test(kept), `${code} ${width}: a saved note is answered "${kept}"`);
        assert.equal(await tools.locator('#lesson-note').getAttribute('dir'), 'auto');
        await page.unroute('**/api/lesson-study-tools');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= width + 1, `${code} ${width}: the page overflows after the study tools answered`);
        if (process.env.RESPONSIVE_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.RESPONSIVE_SCREENSHOTS, `lesson-${code}-${width}.png`), fullPage: true });
        await context.close();
      }
      console.log(`Synthetic lesson ${code}: 320, 390 and 1440 wide, no overflow, no clipped label, English parts left to right, arrows ${dir === 'rtl' ? 'turned round' : 'as typed'}; practice questions and study tools answer a refusal and a lost reply in ${code}`);
    }
    extras = false;
  }
} catch (e) { console.error(logs); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
