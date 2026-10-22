import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANALYTICS_EVENTS,
  ANALYTICS_EVENT_LABELS,
  ANALYTICS_LEARNER_SCOPED,
  ANALYTICS_SUBJECT_TYPE,
  isAnalyticsEvent,
  track,
} from './analytics.ts';

test('the closed vocabulary is the seven codes the database accepts', () => {
  const codes = Object.values(ANALYTICS_EVENTS);
  assert.equal(codes.length, 7);
  assert.deepEqual([...codes].sort(), [
    'checkout.started',
    'course.viewed',
    'download.saved',
    'lesson.opened',
    'live.joined',
    'plan.viewed',
    'search.performed',
  ]);
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
