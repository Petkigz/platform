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
let entitled = false; let mismatch = false; let multipleMedia = false; let uploads = null; let extras = false; let sourcesListed = true; const calls = [];
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
  // `extras` switches on three parts of a lesson that ship switched off and
  // gives each something to show: practice questions, a note with no bookmark,
  // and two sources, one with every field and a link and one with a title only.
  else if (path === '/rest/v1/rpc/setting_bool') res.end(JSON.stringify(extras && ['learning.assessments', 'learning.notes_bookmarks', 'learning.provenance'].includes(JSON.parse(body || '{}').p_key)));
  else if (extras && path === '/rest/v1/content_source_links') res.end(JSON.stringify(sourcesListed ? [
    { anchor: 'Synthetic paragraph two', content_sources: { id: 'source-full', source_type: 'fiqh_reference', title: 'Synthetic fiqh title', author_or_compiler: 'Synthetic compiler', edition_or_version: 'Synthetic edition', reference_locator: 'Synthetic page 12', url: 'https://example.invalid/source' } },
    { anchor: null, content_sources: { id: 'source-bare', source_type: 'quran', title: 'Synthetic bare title', author_or_compiler: null, edition_or_version: null, reference_locator: null, url: null } },
  ] : []));
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
    // The player is the reader's too, in the page as it is sent: what a
    // browser that cannot play says, the way round it, and the first thing
    // said about the saved place. Nothing in the lesson is marked English.
    for (const text of ['متصفحك لا يستطيع تشغيل هذا الفيديو.', '>افتح الفيديو مباشرة</a>', '<p class="meta" role="status">جارٍ التحقق من موضعك المحفوظ…</p>']) assert.ok(body.includes(text), `Arabic player: ${text}`);
    for (const text of ['Your browser cannot play', 'Open the video directly', 'Checking your saved place']) assert.equal(body.includes(text), false, `Arabic player still says "${text}"`);
    assert.equal(body.includes('lang="en"'), false, 'an Arabic lesson with a translated player marks part of itself as English');
    // The report form at the foot is the reader's: its link is Arabic.
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
    for (const text of ['Votre navigateur ne peut pas lire cette vidéo.', '>Ouvrir la vidéo directement</a>', 'Vérification de votre position enregistrée…']) assert.ok(body.includes(text), `French player: ${text}`);
    for (const text of ['Fil d’Ariane', 'Non commencée', '>Supports<', '>Vidéo<', 'Marquer comme terminée', 'Retour au cours', 'Leçon 1 sur 2', 'La discussion n’est pas ouverte pour cette leçon.']) assert.ok(body.includes(text) || body.includes(text.replace('’', '&#x27;')), `French: ${text}`);
  }
  for (const [code, dir] of [['ha', 'ltr'], ['ps', 'rtl']]) {
    const html = await (await request({ cookie, 'accept-language': code })).text(); const body = visible(html);
    assert.match(html, new RegExp(`<html[^>]*lang="${code}"[^>]*dir="${dir}"`));
    assert.equal(wrapper(html), '<div class="page lesson-page" lang="en" dir="ltr">');
    assert.ok(body.includes('2 min'), `${code}: an English lesson gives its length in another language`);
    for (const text of ['aria-label="Breadcrumb"', '>Materials<', 'Mark complete', 'Lesson 1 of 2', 'Discussion is not open on this lesson.', '>Report a problem<']) assert.ok(body.includes(text), `${code}: ${text}`);
    // The player inside an English lesson is English, as the lesson is.
    for (const text of ['Your browser cannot play this video.', '>Open the video directly</a>', 'Checking your saved place…']) assert.ok(body.includes(text), `${code} player: ${text}`);
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
    // a row that holds a note, and neither is the row that holds a player.
    assert.doesNotMatch(body, /<div class="notice"[^>]*lang="en"/);
    assert.match(body, /<span class="t"><span class="muted"><strong><bdi>Synthetic broken upload<\/bdi><\/strong>/);
    assert.equal(body.includes('lang="en"'), false);
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
    // The sources card: the kind of a source by its name, not the column's
    // word; the link on a line of its own, tied to its title.
    for (const text of ['<h2>Sources and references</h2>', '<strong id="source-source-full"><bdi>Synthetic fiqh title</bdi></strong>', '<bdi>Synthetic compiler</bdi>', '<bdi>Synthetic edition</bdi>', '<bdi>Synthetic page 12</bdi>', 'Used at: <bdi>Synthetic paragraph two</bdi>', '<a href="https://example.invalid/source" target="_blank" rel="noreferrer" aria-describedby="source-source-full">Open the source</a>', '<span class="badge neutral">Fiqh reference</span>', '<span class="badge neutral">Qur’an</span>', 'Synthetic bare title']) assert.ok(body.includes(text) || body.includes(text.replace('’', '&#x27;')), `English: ${text}`);
    for (const text of ['fiqh reference', 'fiqh_reference', '>quran<', '>Open source<']) assert.equal(body.includes(text), false, `English sources card says "${text}"`);
    assert.equal(body.split('Open the source').length - 1, 1, 'a source with no address is given a link');
    assert.equal(body.split('Used at:').length - 1, 1, 'a source with no place is given one');
    sourcesListed = false;
    const none = visible(await (await request({ cookie })).text());
    assert.ok(none.includes('<p class="muted">No references are listed for this lesson yet.</p>'));
    sourcesListed = true;
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
    for (const text of ['<h2>المصادر والمراجع</h2>', 'موضع استخدامه: <bdi>Synthetic paragraph two</bdi>', '>افتح المصدر</a>', '<span class="badge neutral">مرجع فقهي</span>', '<span class="badge neutral">القرآن</span>', '<bdi>Synthetic fiqh title</bdi>']) assert.ok(body.includes(text), `Arabic: ${text}`);
    for (const text of ['Sources and references', 'Used at', 'Open the source', 'Fiqh reference', 'Qur’an', 'Qur&#x27;an', 'fiqh reference', 'fiqh_reference', 'quran<']) assert.equal(body.includes(text), false, `Arabic sources card says "${text}"`);
    // None of these parts is marked as English any more, the player's row included.
    assert.equal(body.split('lang="en" dir="ltr"').length - 1, 0);
  }
  {
    const body = visible(await (await request({ cookie: `${cookie}; ayahspring_locale=fr`, 'accept-language': 'ar' })).text());
    assert.ok(body.includes('Passage concerné\u00a0: <bdi>Synthetic paragraph two</bdi>'), 'French: the place a source is used, with its no-break space');
    for (const text of ['<h2>Sources et références</h2>', '>Ouvrir la source</a>', '>Référence de fiqh<', '>Coran<']) assert.ok(body.includes(text), `French: ${text}`);
    for (const text of ['Testez-vous', '>Vérifier<', '>Vrai<', '>Faux<', 'Vos outils d’étude', '>Ajouter la leçon aux favoris<', '>Enregistrer la note<', '>Effacer la note<']) assert.ok(body.includes(text) || body.includes(text.replace('’', '&#x27;')), `French: ${text}`);
  }
  {
    // A held language reads both in English, inside its English lesson.
    const body = visible(await (await request({ cookie, 'accept-language': 'ha' })).text());
    for (const text of [...englishExtras, 'Sources and references', 'Used at: <bdi>Synthetic paragraph two</bdi>', '>Open the source</a>', '>Fiqh reference<']) assert.ok(body.includes(text), `ha: ${text}`);
    assert.ok(body.includes(counter('en')));
  }
  extras = false;
  {
    const html = await (await request({ cookie, 'accept-language': 'wo, fr' })).text();
    assert.match(html, /<html[^>]*lang="en"/); assert.ok(visible(html).includes('>Materials<')); assert.equal(visible(html).includes('Supports'), false);
  }
  console.log('Lesson languages passed: English, Arabic (frame, report link, the notes about a recording that cannot play, practice questions, study tools, the sources card and the player translated, nothing marked English), French by cookie with its player, Hausa and Pashto frames with an English lesson, Wolof to English. No translation here has been read by a speaker.');
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
    // What the player says in each, copied from the catalogue file.
    const PLAYER_SAYS = {
      ar: { open: 'افتح الفيديو مباشرة', keep: 'احتفظ بموضع استرداد مؤقت على هذا المتصفح' },
      ta: { open: 'காணொளியை நேரடியாகத் திறக்கவும்', keep: 'இந்த உலாவியில் தற்காலிக மீட்பு இடத்தை வைத்திரு' },
    };
    const seenPlayers = [];
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
            overlap: [...lesson.querySelectorAll('.lessons li')].filter((li) => li.querySelector('.n')).some((li) => { const n = li.querySelector('.n').getBoundingClientRect(); const t = li.querySelector('.t').getBoundingClientRect(); return n.width > 0 && t.width > 0 && n.left < t.right && t.left < n.right && n.top < t.bottom && t.top < n.bottom; }) };
        });
        assert.ok(m.scroll <= width + 1, `${code} ${width}: page overflow ${m.scroll}`);
        assert.equal(m.dir, dir, `${code} ${width}: lesson direction`);
        assert.deepEqual(m.english, [], `${code} ${width}: part of a translated lesson is still marked English`);
        // The player is the reader's once the browser has it: what it says
        // about the saved place after asking the server, its buttons, and the
        // choice about this browser, which is off until it is made.
        const player = await page.evaluate(() => {
          const row = document.querySelector('.lesson-page .lessons li:has(video) .t');
          const words = (row.innerText || '').replace('Synthetic video', '');
          const box = row.querySelector('input[type="checkbox"]');
          return { words, dir: getComputedStyle(row).direction, status: [...row.querySelectorAll('[role="status"], [role="alert"]')].map((el) => el.textContent.trim()).filter(Boolean),
            buttons: [...row.querySelectorAll('button')].map((b) => b.textContent.trim()), box: box ? { checked: box.checked, label: box.closest('label')?.textContent.trim() ?? '' } : null,
            clipped: [...row.querySelectorAll('button, label')].filter((el) => el.scrollWidth > el.clientWidth + 1).length,
            outside: [...row.querySelectorAll('button, label, p, video')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1); }).length };
        });
        assert.equal(player.dir, dir, `${code} ${width}: the player is laid out ${player.dir}`);
        assert.doesNotMatch(player.words, /[A-Za-z]{4,}\s[A-Za-z]{3,}\s[A-Za-z]{3,}/u, `${code} ${width}: the player says an English sentence: ${JSON.stringify(player.words)}`);
        assert.ok(player.words.includes(PLAYER_SAYS[code].open), `${code} ${width}: the player does not offer the video in ${code}`);
        assert.ok(player.status.length >= 1, `${code} ${width}: the player says nothing about the saved place`);
        assert.equal(player.buttons.filter((text) => /^[A-Za-z ]{4,}$/u.test(text)).length, 0, `${code} ${width}: a player button is English: ${JSON.stringify(player.buttons)}`);
        if (player.box) assert.deepEqual(player.box, { checked: false, label: PLAYER_SAYS[code].keep }, `${code} ${width}: the choice about this browser`);
        assert.equal(player.clipped, 0, `${code} ${width}: a player control is cut off`);
        assert.equal(player.outside, 0, `${code} ${width}: part of the player is outside the page`);
        if (process.env.RESPONSIVE_SCREENSHOTS) await page.locator('.lesson-page .lessons li:has(video)').screenshot({ path: resolve(process.env.RESPONSIVE_SCREENSHOTS, `lesson-player-${code}-${width}.png`) });
        seenPlayers.push(`${code} ${width}: ${player.status.join(' / ')}${player.box ? ' [choice shown, off]' : ' [choice not shown]'}`);
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
        // The sources card: the kind of a source does not run into what the
        // teacher wrote about it, the link has a line to itself, and the
        // teacher's Latin words read left to right inside a right-to-left row.
        const sourcesCard = await page.evaluate(() => {
          const row = document.getElementById('source-source-full').closest('li');
          const words = row.querySelector('.t').getBoundingClientRect(); const kind = row.querySelector('.badge').getBoundingClientRect();
          const link = row.querySelector('a').getBoundingClientRect(); const title = document.getElementById('source-source-full').getBoundingClientRect();
          const touching = words.left < kind.right && kind.left < words.right && words.top < kind.bottom && kind.top < words.bottom;
          return { touching, linkBelow: link.top >= title.bottom - 1, kind: row.querySelector('.badge').textContent, clipped: row.querySelector('.badge').scrollWidth > row.querySelector('.badge').clientWidth + 1,
            written: getComputedStyle(row.querySelector('bdi')).direction, right: Math.max(words.right, kind.right), left: Math.min(words.left, kind.left) };
        });
        assert.equal(sourcesCard.touching, false, `${code} ${width}: the kind of a source runs into the source`);
        assert.equal(sourcesCard.linkBelow, true, `${code} ${width}: the link to a source runs on from its title`);
        assert.ok(sourcesCard.kind.length > 0 && !/fiqh/iu.test(sourcesCard.kind) && !sourcesCard.clipped, `${code} ${width}: the kind of a source reads "${sourcesCard.kind}"`);
        assert.equal(sourcesCard.written, 'ltr', `${code} ${width}: the teacher's words are laid out ${sourcesCard.written}`);
        assert.ok(sourcesCard.left >= -1 && sourcesCard.right <= width + 1, `${code} ${width}: a source row is outside the page`);
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
        // Laid out as a heading with a button beside it and a row of actions:
        // it used a form row, which squeezed the heading and the save button
        // onto two lines each and stretched the bookmark button across the card.
        if (width >= 768) {
          const layout = await tools.evaluate((card) => {
            const lines = (el) => { const range = document.createRange(); range.selectNodeContents(el); return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size; };
            const save = card.querySelector('.study-actions .btn'); const mark = card.querySelector('.study-head .btn');
            return { heading: lines(card.querySelector('h2')), save: lines(save), mark: mark.getBoundingClientRect().width / card.getBoundingClientRect().width,
              check: Math.max(...[...document.querySelectorAll('.practice-check .btn')].map((b) => b.getBoundingClientRect().width)) / card.getBoundingClientRect().width };
          });
          assert.equal(layout.heading, 1, `${code} ${width}: the study tools heading is on ${layout.heading} lines`);
          assert.equal(layout.save, 1, `${code} ${width}: the save button is on ${layout.save} lines`);
          assert.ok(layout.mark < 0.5, `${code} ${width}: the bookmark button fills ${Math.round(layout.mark * 100)}% of the card`);
          assert.ok(layout.check < 0.5, `${code} ${width}: a Check button fills ${Math.round(layout.check * 100)}% of the card`);
        }
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
      console.log(`Synthetic lesson ${code}: 320, 390 and 1440 wide, no overflow, no clipped label, nothing marked English, arrows ${dir === 'rtl' ? 'turned round' : 'as typed'}; practice questions and study tools answer a refusal and a lost reply in ${code}; the sources card fits; the player says its sentences in ${code} and fits`);
      for (const line of seenPlayers.filter((seen) => seen.startsWith(`${code} `))) console.log(`  player ${line}`);
    }
    extras = false;
    // A page that breaks says so in the reader's language. The account page
    // throws when its first read fails, and this stand-in server has no such
    // table. Arabic has the sentences; Hausa and Pashto are held for review
    // and read the page in English as a whole, the borrowed button included,
    // laid out left to right inside Pashto's right-to-left frame.
    const brokenEnglish = ['Something broke', 'This page stopped working', 'Try this page again', 'Browse the catalogue', 'Ask for help', 'Check before you pay again.', 'Your orders'];
    for (const [code, frame, whole] of [['ar', 'rtl', false], ['ha', 'ltr', true], ['ps', 'rtl', true], ['en', 'ltr', true]]) {
      for (const width of [320, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
        await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: `http://localhost:${port}` }, { name: 'ayahspring_locale', value: code, url: `http://localhost:${port}` }]);
        const page = await context.newPage();
        await page.goto(`http://localhost:${port}/account`, { waitUntil: 'networkidle' });
        await page.locator('#main .container.section h1').waitFor();
        const read = () => page.evaluate(() => {
          const box = document.querySelector('#main .container.section');
          const text = (el) => el.textContent.trim();
          return { page: document.documentElement.lang, frame: getComputedStyle(document.body).direction, lang: box.getAttribute('lang'), dir: getComputedStyle(box).direction,
            said: [text(box.querySelector('.eyebrow')), text(box.querySelector('h1')), ...[...box.querySelectorAll('.btn')].map(text), text(box.querySelector('.notice strong')), text(box.querySelector('.notice a'))],
            orders: box.querySelector('.notice a').getAttribute('href'), reference: box.querySelector('code')?.getAttribute('dir') ?? null,
            scroll: document.documentElement.scrollWidth,
            rows: new Set([...box.querySelectorAll('.page-actions .btn')].map((el) => Math.round(el.getBoundingClientRect().top))).size,
            widest: Math.max(...[...box.querySelectorAll('.page-actions .btn')].map((el) => el.getBoundingClientRect().width)) / box.getBoundingClientRect().width,
            clipped: [...box.querySelectorAll('.btn')].filter((el) => el.scrollWidth > el.clientWidth + 1).map(text) };
        });
        const m = await read();
        assert.equal(m.page, code, `${code} ${width}: the broken page's frame is in ${m.page}`);
        assert.equal(m.frame, frame, `${code} ${width}: the frame is laid out ${m.frame}`);
        assert.equal(m.said.length, 7, `${code} ${width}: the broken page shows ${JSON.stringify(m.said)}`);
        if (whole) {
          assert.deepEqual(m.said, brokenEnglish, `${code} ${width}: a page read in English is not English as a whole`);
          assert.equal(m.dir, 'ltr', `${code} ${width}: English is laid out ${m.dir}`);
          assert.equal(m.lang, code === 'en' ? null : 'en', `${code} ${width}: the English page is marked ${m.lang}`);
        } else {
          for (const english of brokenEnglish) assert.equal(m.said.includes(english), false, `${code} ${width}: the broken page says "${english}"`);
          assert.ok(m.said.every((words) => words.length > 0), `${code} ${width}: a sentence of the broken page is empty`);
          assert.equal(m.dir, frame, `${code} ${width}: the broken page is laid out ${m.dir}`);
          assert.equal(m.lang, null, `${code} ${width}: a translated page is marked ${m.lang}`);
        }
        assert.equal(m.orders, '/orders');
        if (m.reference !== null) assert.equal(m.reference, 'ltr', `${code} ${width}: the reference is laid out ${m.reference}`);
        assert.ok(m.scroll <= width + 1, `${code} ${width}: the broken page overflows to ${m.scroll}`);
        assert.deepEqual(m.clipped, [], `${code} ${width}: a button of the broken page is cut off`);
        // The three ways out are stacked for a thumb and side by side on a
        // desk: they were three bars across the whole page at any width.
        if (width >= 640) {
          assert.equal(m.rows, 1, `${code} ${width}: the ways out of the broken page are on ${m.rows} rows`);
          assert.ok(m.widest < 0.4, `${code} ${width}: a way out fills ${Math.round(m.widest * 100)}% of the page`);
        } else assert.equal(m.rows, 3, `${code} ${width}: the ways out of the broken page are on ${m.rows} rows`);
        // Trying again asks for the page again, and a page that is still
        // broken says the same thing rather than nothing.
        await page.locator('#main .container.section button.btn').click();
        await page.locator('#main .container.section h1').waitFor();
        assert.deepEqual((await read()).said, m.said, `${code} ${width}: trying again changed what the page says`);
        if (process.env.RESPONSIVE_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.RESPONSIVE_SCREENSHOTS, `broke-${code}-${width}.png`), fullPage: true });
        // The page for a wrong address has the same three ways out.
        await page.goto(`http://localhost:${port}/no-such-address`, { waitUntil: 'networkidle' });
        const lost = await page.evaluate(() => {
          const buttons = [...document.querySelectorAll('#main .page-actions .btn')];
          return { count: buttons.length, rows: new Set(buttons.map((el) => Math.round(el.getBoundingClientRect().top))).size, scroll: document.documentElement.scrollWidth,
            clipped: buttons.filter((el) => el.scrollWidth > el.clientWidth + 1).length };
        });
        assert.equal(lost.count, 3, `${code} ${width}: the wrong-address page has ${lost.count} ways out`);
        assert.equal(lost.rows, width >= 640 ? 1 : 3, `${code} ${width}: the ways out of the wrong-address page are on ${lost.rows} rows`);
        assert.ok(lost.scroll <= width + 1 && lost.clipped === 0, `${code} ${width}: the wrong-address page overflows or cuts a button off`);
        if (process.env.RESPONSIVE_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.RESPONSIVE_SCREENSHOTS, `missing-${code}-${width}.png`), fullPage: true });
        await context.close();
      }
    }
    console.log('A page that broke: Arabic reads it in Arabic, right to left; Hausa and Pashto read it in English as a whole, marked English and left to right; no overflow at 320 or 1440; the ways out are stacked on a phone and side by side on a desk, there and on the page for a wrong address; trying again keeps the page');
  }
} catch (e) { console.error(logs); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
