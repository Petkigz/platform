import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The three pages a recording touches.
 *
 * `live-recording.test.ts` pins the sentences; `supabase/tests/live_recording.test.mjs`
 * pins who may watch against a real Postgres. These read the source for the one
 * thing neither can see: that the address of a recording never appears in a page
 * the permission has not already admitted.
 *
 * Reading source is a blunt instrument — it can prove a call is written, not that
 * it runs first. It is used because the alternative for this particular property
 * is worse: a link that leaks once is a link that is out.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, '..', path), 'utf8');

/** The source without its comments, whose prose names things the code must not. */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ROUTE = 'app/api/live/[sessionId]/recording/route.ts';
const route = read(ROUTE);
const routeCode = code(route);

const watchPage = read('app/live/[sessionId]/page.tsx');
const teachLive = read('app/teach/[courseId]/live/page.tsx');
const form = read('app/teach/[courseId]/live/recording.tsx');
const prefs = read('lib/notification-prefs.ts');

test('the address comes from one function and is never selected', () => {
  assert.match(routeCode, /rpc\('live_recording_link', \{ p_session_id: sessionId \}\)/);
  // No table is read on this route, and no permission is restated: both answers
  // belong to the functions that already own them.
  assert.doesNotMatch(routeCode, /from\('live_session_recordings'\)/);
  assert.doesNotMatch(routeCode, /from\('live_sessions'\)/);
  assert.doesNotMatch(routeCode, /can_watch_live_recording/);
});

test('"no recording" and "not yours" leave as the same 404', () => {
  // The database raises rather than returning null precisely so a stranger
  // cannot tell the two apart; a route that distinguished them would undo it.
  assert.match(routeCode, /error\.code === '42501' \|\| error\.code === 'P0002'/);
  assert.match(routeCode, /That recording is not available to you\.'\, \{ status: 404 \}/);
});

test('the redirect carries no cache and no referrer', () => {
  assert.match(routeCode, /NextResponse\.redirect\(url, 302\)/);
  assert.match(routeCode, /'cache-control', 'private, no-store'/);
  assert.match(routeCode, /'referrer-policy', 'no-referrer'/);
  // Defence in depth: the table refuses a non-https address, and a redirect is
  // not the place to find out that it stopped.
  assert.match(routeCode, /\^https:\\\/\\\//i);
});

test('a signed-out visitor is sent to sign in, not shown an error', () => {
  assert.match(routeCode, /if \(!user\) \{/);
  assert.match(routeCode, /NextResponse\.redirect\(\s*new URL\(\s*`\/sign-in\?next=/);
});

test('the learner page asks whether it may be watched, and holds no address', () => {
  assert.match(watchPage, /rpc\('can_watch_live_recording', \{\s*p_session_id: session\.id,?\s*\}\)/);
  assert.match(watchPage, /href=\{`\/api\/live\/\$\{session\.id\}\/recording`\}/);
  // The page renders a link to the redirect, never a video URL, and never reads
  // the private table.
  const watchCode = code(watchPage);
  assert.doesNotMatch(watchCode, /live_session_recordings/);
  assert.doesNotMatch(watchCode, /live_recording_link/);
});

test('the teacher\'s page lists which classes have one, and offers the form for the rest', () => {
  assert.match(teachLive, /rpc\('teacher_live_recordings', \{\s*p_course_id: course\.id,?\s*\}\)/);
  assert.match(teachLive, /<RecordingForm/);
  // A cancelled class has nothing to attach, and the form is not offered for one.
  assert.match(teachLive, /session\.status !== 'cancelled' && \(/);
});

test('the form announces a checklist of two things a teacher can get wrong', () => {
  // Removing needs a reason, and the button stays disabled until there is one.
  assert.match(form, /reason\.trim\(\)\.length < 3/);
  // Announcing starts unticked: a link attached to a class from last term must
  // not message forty households because a checkbox defaulted to on.
  assert.match(form, /useState\(false\)/);
  assert.match(form, /Tell the class it is ready/);
});

test('the closed vocabulary learned the new kind, and only once', () => {
  const occurrences = prefs.split("kind: 'live_recording_ready'").length - 1;
  assert.equal(occurrences, 1, 'the new kind is declared more than once');
  assert.match(prefs, /\| 'live_recording_ready'/);
});
