import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  ANALYTICS_EVENTS,
  ANALYTICS_EVENT_LABELS,
  ANALYTICS_LEARNER_SCOPED,
  ANALYTICS_SUBJECT_TYPE,
  ENROL_REFUSALS,
  SAVE_REFUSALS,
  isAnalyticsEvent,
  isEnrolRefusal,
  isSaveRefusal,
  track,
} from './analytics.ts';

test('the closed vocabulary is the nine codes the database accepts', () => {
  const codes = Object.values(ANALYTICS_EVENTS);
  assert.equal(codes.length, 9);
  assert.deepEqual([...codes].sort(), [
    'checkout.started',
    'course.viewed',
    'download.saved',
    'enrol.refused',
    'lesson.opened',
    'lesson.save_refused',
    'live.joined',
    'plan.viewed',
    'search.performed',
  ]);
});

test('the two refusal events are not learner-scoped, on purpose', () => {
  // A refusal says a door shut, not who was turned away. Attaching a child's id to
  // "they were refused" would also make the write depend on the very consent gate
  // being counted, and a refusal that cannot be recorded when the gate refuses is
  // the one refusal most worth seeing.
  assert.ok(!ANALYTICS_LEARNER_SCOPED.includes('enrol.refused'));
  assert.ok(!ANALYTICS_LEARNER_SCOPED.includes('lesson.save_refused'));
  assert.equal(ANALYTICS_SUBJECT_TYPE['enrol.refused'], 'course');
  assert.equal(ANALYTICS_SUBJECT_TYPE['lesson.save_refused'], 'lesson');
});

test('the refusal vocabularies are closed, and exclude what is not a dead end', () => {
  // The codes `enrolInFreeCourse()` returns. Two of them are not refusals: one is
  // the success case and the other is a setup step, and either would dominate a
  // count without telling anybody anything they can act on.
  for (const reason of [
    'guardian_verification_required', 'not_sold_here', 'payment_required',
    'no_published_version', 'not_available',
  ]) {
    assert.equal(isEnrolRefusal(reason), true, `${reason} is not counted as a refusal`);
  }
  for (const reason of ['already_enrolled', 'no_learner_profile', '', 'whatever']) {
    assert.equal(isEnrolRefusal(reason), false, `${reason} is counted as a refusal`);
  }

  // The codes `lesson_download_standing()` returns, minus the two that cannot be
  // reached from a press (signed_out is not signed in; 'allowed' is not a refusal).
  for (const reason of ['not_entitled', 'needs_plus', 'no_media', 'not_encoded', 'feature_off']) {
    assert.equal(isSaveRefusal(reason), true, `${reason} is not counted as a save refusal`);
  }
  for (const reason of ['allowed', 'signed_out', 'no_lesson', '', null]) {
    assert.equal(isSaveRefusal(reason), false, `${reason} is counted as a save refusal`);
  }

  assert.deepEqual(Object.keys(ENROL_REFUSALS).sort(), [
    'guardian_verification_required', 'no_published_version', 'not_available',
    'not_sold_here', 'payment_required',
  ]);
  assert.deepEqual(Object.keys(SAVE_REFUSALS).sort(), [
    'feature_off', 'needs_plus', 'no_media', 'not_encoded', 'not_entitled',
  ]);
});

test('the screen that refuses is the screen that records it', () => {
  // Instrumentation that is not at the call site is instrumentation that will
  // silently stop when the call site is rewritten, so the two are checked together.
  const button = readFileSync(
    new URL('../app/courses/[slug]/enrol-button.tsx', import.meta.url), 'utf8');
  assert.match(button, /code: 'enrol\.refused'/,
    'the enrol button refuses without recording why');

  const download = readFileSync(
    new URL('../app/api/media/download/route.ts', import.meta.url), 'utf8');
  assert.match(download, /lesson\.save_refused/,
    'the download route refuses without recording why');
  assert.match(download, /lesson_download_standing/,
    'the download route guesses a reason instead of asking the function that has one');
});

test('every code is described, because the admin report shows the description', () => {
  for (const code of Object.values(ANALYTICS_EVENTS)) {
    assert.ok(ANALYTICS_EVENT_LABELS[code], `${code} has no label`);
  }
});

test('every code declares its subject type and says whether it names a learner', () => {
  for (const code of Object.values(ANALYTICS_EVENTS)) {
    assert.ok(ANALYTICS_SUBJECT_TYPE[code], `${code} has no subject type`);
  }
  // These four are the codes whose rows name a child; the database refuses them
  // without a learner profile the caller may reach.
  assert.deepEqual([...ANALYTICS_LEARNER_SCOPED].sort(), [
    'checkout.started',
    'download.saved',
    'lesson.opened',
    'live.joined',
  ]);
  assert.equal(ANALYTICS_SUBJECT_TYPE['search.performed'], 'none');
});

test('a code the database would refuse is recognisable before it is sent', () => {
  assert.equal(isAnalyticsEvent('lesson.opened'), true);
  assert.equal(isAnalyticsEvent('lesson.viewed'), false);
  assert.equal(isAnalyticsEvent(''), false);
  assert.equal(isAnalyticsEvent(null), false);
  assert.equal(isAnalyticsEvent(42), false);
});

test('tracking outside a browser does nothing at all', async () => {
  // Node has no window; the call must be a no-op rather than a crash in SSR.
  await track({ code: 'lesson.opened', subjectId: '00000000-0000-0000-0000-000000000000' });
});

test('tracking sends the code, the subject and the properties', async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const originalWindow = (globalThis as { window?: unknown }).window;
  const originalFetch = globalThis.fetch;
  (globalThis as { window?: unknown }).window = {};
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  try {
    await track({
      code: 'search.performed',
      properties: { query: 'zakat', results: 3 },
    });
    await track({ code: 'lesson.viewed' as never });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = originalWindow;
  }
  assert.equal(calls.length, 1, 'a refused code was still sent');
  const sent = calls[0];
  assert.ok(sent, 'nothing was sent');
  assert.equal(sent.url, '/api/analytics');
  assert.equal(sent.body.code, 'search.performed');
  assert.deepEqual(sent.body.properties, { query: 'zakat', results: 3 });
});

test('a network failure is swallowed, not thrown at the page', async () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  const originalFetch = globalThis.fetch;
  (globalThis as { window?: unknown }).window = {};
  globalThis.fetch = (async () => {
    throw new Error('offline');
  }) as typeof fetch;
  try {
    await track({ code: 'course.viewed', subjectId: 'abc' });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = originalWindow;
  }
});
