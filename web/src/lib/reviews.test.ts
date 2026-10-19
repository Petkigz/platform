import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canReviewCourse,
  fetchCourseReviews,
  fetchReviewQueue,
  fetchReviewSummary,
  mapReviewError,
  moderateReview,
  REVIEW_BODY_MAX,
  validateReviewInput,
  writeReview,
} from './reviews.ts';

// ---------------------------------------------------------------------------
// What is worth pinning here:
//
//   * a malformed rating must never reach the database — 3.5 stars and "great"
//     are both things a form can produce
//   * no writer may send an actor id; identity comes from the session
//   * whether a review is held is read back, not predicted, because the answer
//     decides what the learner is told
//   * the summary must agree with the list: held and withdrawn reviews are in
//     neither the average nor the distribution
// ---------------------------------------------------------------------------

type RpcCall = { fn: string; args: Record<string, unknown> };

function stubRpc(
  result: { data?: unknown; error?: { message: string; code?: string } } = { data: 'review-1' },
) {
  const calls: RpcCall[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

/** A thenable query-builder stub, with the select string and filters recorded. */
function stubQuery(rows: unknown[], error: { message: string } | null = null) {
  const state: { select: string; filters: Record<string, unknown>; order: string | null } = {
    select: '',
    filters: {},
    order: null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = (s: string) => { state.select = s; return chain; };
  chain.eq = (col: string, val: unknown) => { state.filters[col] = val; return chain; };
  chain.in = (col: string, val: unknown) => { state.filters[col] = val; return chain; };
  chain.is = (col: string, val: unknown) => { state.filters[col] = val; return chain; };
  chain.order = (col: string, opts?: { ascending?: boolean }) => {
    state.order = `${col}:${opts?.ascending === false ? 'desc' : 'asc'}`;
    return chain;
  };
  chain.limit = () => chain;
  chain.maybeSingle = async () => ({ data: rows[0] ?? null, error });
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: rows, error }).then(resolve);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = { from: () => chain } as any;
  return { client, state };
}

/** rpc() for the write, then a query for the visibility read-back. */
function stubWriteThenRead(visibility: string, rpcResult: { data?: unknown; error?: { message: string; code?: string } } = { data: 'review-1' }) {
  const calls: RpcCall[] = [];
  const read = stubQuery([{ visibility_state: visibility }]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return rpcResult;
    },
    from: () => read.client.from(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls, read };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('a whole star rating is accepted, including from a form string', () => {
  for (const rating of [1, 2, 3, 4, 5]) {
    assert.equal(validateReviewInput({ rating }).ok, true, `rating ${rating}`);
  }
  const fromForm = validateReviewInput({ rating: '4' });
  assert.equal(fromForm.ok, true);
  if (fromForm.ok) assert.equal(fromForm.rating, 4);
});

test('out-of-range, fractional and non-numeric ratings are refused', () => {
  for (const rating of [0, 6, -1, 3.5, 'great', '', null, undefined, NaN]) {
    assert.equal(validateReviewInput({ rating }).ok, false, `rating ${String(rating)}`);
  }
});

test('words are optional, trimmed, and refused when overlong', () => {
  const bare = validateReviewInput({ rating: 5, body: '   ' });
  assert.equal(bare.ok, true);
  if (bare.ok) assert.equal(bare.body, null, 'blank words became a review body');

  const trimmed = validateReviewInput({ rating: 5, body: '  Clear and patient.  ' });
  if (trimmed.ok) assert.equal(trimmed.body, 'Clear and patient.');

  assert.equal(validateReviewInput({ rating: 5, body: 'x'.repeat(REVIEW_BODY_MAX) }).ok, true);
  assert.equal(validateReviewInput({ rating: 5, body: 'x'.repeat(REVIEW_BODY_MAX + 1) }).ok, false);
});

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

test('writing a review sends no actor id', async () => {
  const { client, calls } = stubWriteThenRead('visible');
  const result = await writeReview(client, { courseId: 'c-1', rating: 5, body: 'Clear.' });

  assert.equal(result.ok, true);
  const call = calls[0];
  assert.equal(call?.fn, 'write_course_review');
  assert.deepEqual(Object.keys(call?.args ?? {}).sort(), ['p_body', 'p_course_id', 'p_rating']);
  assert.equal(call?.args.p_rating, 5);
});

test('an invalid rating never reaches the database', async () => {
  const { client, calls } = stubWriteThenRead('visible');
  const result = await writeReview(client, { courseId: 'c-1', rating: 7 });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test('whether a review is held is read back rather than predicted', async () => {
  const held = await writeReview(stubWriteThenRead('pending').client, {
    courseId: 'c-1', rating: 2, body: 'Too fast for me.',
  });
  assert.equal(held.ok, true);
  if (held.ok) assert.equal(held.value.held, true);

  const live = await writeReview(stubWriteThenRead('visible').client, {
    courseId: 'c-1', rating: 5,
  });
  if (live.ok) assert.equal(live.value.held, false);
});

test('a database refusal arrives as a status the caller can act on', async () => {
  const notEnrolled = await writeReview(
    stubWriteThenRead('visible', {
      error: { message: 'you can only review a course you are enrolled in', code: 'insufficient_privilege' },
    }).client,
    { courseId: 'c-1', rating: 5 },
  );
  assert.equal(notEnrolled.ok, false);
  if (!notEnrolled.ok) assert.equal(notEnrolled.status, 403);

  const flagOff = await writeReview(
    stubWriteThenRead('visible', {
      error: { message: 'course reviews are not open yet (learning.reviews is off)', code: 'check_violation' },
    }).client,
    { courseId: 'c-1', rating: 5 },
  );
  if (!flagOff.ok) assert.equal(flagOff.status, 409);

  const missing = mapReviewError({ message: 'course not found', code: 'P0002' });
  if (!missing.ok) assert.equal(missing.status, 404);
});

// ---------------------------------------------------------------------------
// The aggregate
// ---------------------------------------------------------------------------

test('the summary fills in stars nobody used', async () => {
  const { client } = stubRpc({
    data: [{ average_rating: '4.3', review_count: '7', rating_rows: { 5: 4, 4: 2, 3: 1 } }],
  });
  const summary = await fetchReviewSummary(client, 'c-1');
  assert.equal(summary.average, 4.3);
  assert.equal(summary.count, 7);
  assert.deepEqual(summary.distribution, { 1: 0, 2: 0, 3: 1, 4: 2, 5: 4 });
});

test('the summary survives the distribution arriving as JSON text', async () => {
  const { client } = stubRpc({
    data: { average_rating: 3, review_count: 2, rating_rows: '{"3":1,"5":1}' },
  });
  const summary = await fetchReviewSummary(client, 'c-1');
  assert.deepEqual(summary.distribution, { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 });
});

test('a course nobody has reviewed reports zero rather than nothing', async () => {
  const { client } = stubRpc({ data: [{ average_rating: '0', review_count: '0', rating_rows: {} }] });
  const summary = await fetchReviewSummary(client, 'c-1');
  assert.equal(summary.average, 0);
  assert.equal(summary.count, 0);
  assert.deepEqual(summary.distribution, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
});

test('a summary error propagates rather than becoming five stars', async () => {
  const { client } = stubRpc({ error: { message: 'function course_review_summary(uuid) does not exist' } });
  await assert.rejects(() => fetchReviewSummary(client, 'c-1'), /does not exist/);
});

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

test('reviews are mapped with whose they are and what state they are in', async () => {
  const { client, state } = stubQuery([
    {
      id: 'r1', course_id: 'c-1', course_version_id: 'v-1', rating: 5, body: 'Clear.',
      visibility_state: 'visible', written_by: 'me', withdrawn_reason: null,
      created_at: '2026-10-01T09:00:00Z', reviewer: [{ display_name: 'Amina' }],
    },
    {
      id: 'r2', course_id: 'c-1', course_version_id: 'v-1', rating: 2, body: 'Too fast.',
      visibility_state: 'pending', written_by: 'me', withdrawn_reason: null,
      created_at: '2026-10-02T09:00:00Z', reviewer: null,
    },
  ]);

  const reviews = await fetchCourseReviews(client, { courseId: 'c-1', myUserId: 'me' });
  assert.equal(reviews.length, 2);
  assert.equal(state.filters.course_id, 'c-1');
  assert.equal(state.order, 'created_at:desc');

  const first = reviews[0];
  assert.equal(first?.reviewerName, 'Amina');
  assert.equal(first?.isMine, true);
  // A review with no readable profile still renders, rather than disappearing.
  assert.equal(reviews[1]?.reviewerName, null);
  assert.equal(reviews[1]?.visibility, 'pending');
});

test('the moderation queue asks only for held reviews, oldest first', async () => {
  const { client, state } = stubQuery([
    {
      id: 'r1', course_id: 'c-1', course_version_id: 'v-1', rating: 1, body: 'Names someone.',
      visibility_state: 'pending', written_by: 'them', withdrawn_reason: null,
      created_at: '2026-10-01T09:00:00Z', reviewer: [{ display_name: 'Yusuf' }],
      courses: [{ title: 'Qur’an foundations', slug: 'quran-foundations' }],
    },
  ]);

  const queue = await fetchReviewQueue(client);
  assert.equal(state.filters.visibility_state, 'pending');
  assert.equal(state.order, 'created_at:asc');
  assert.equal(queue[0]?.courseTitle, 'Qur’an foundations');
  assert.equal(queue[0]?.courseSlug, 'quran-foundations');
  assert.equal(queue[0]?.isMine, false, 'a queue row must not claim to be the moderator’s own');
});

// ---------------------------------------------------------------------------
// Moderating
// ---------------------------------------------------------------------------

test('withdrawing without a reason never reaches the database', async () => {
  const { client, calls } = stubRpc({});
  const result = await moderateReview(client, { reviewId: 'r1', state: 'withdrawn', note: '   ' });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test('publishing sends no note and withdrawing trims its reason', async () => {
  const { client, calls } = stubRpc({});
  await moderateReview(client, { reviewId: 'r1', state: 'visible' });
  await moderateReview(client, { reviewId: 'r2', state: 'withdrawn', note: '  Advertises another service.  ' });

  assert.equal(calls[0]?.args.p_note, null);
  assert.equal(calls[1]?.args.p_note, 'Advertises another service.');
  assert.equal(calls[1]?.args.p_state, 'withdrawn');
});

test('an overlong moderation note is refused', async () => {
  const { client, calls } = stubRpc({});
  const result = await moderateReview(client, {
    reviewId: 'r1',
    state: 'withdrawn',
    note: 'x'.repeat(REVIEW_BODY_MAX + 1),
  });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

// ---------------------------------------------------------------------------
// Who may review
// ---------------------------------------------------------------------------

test('an account with no learner profile of its own cannot review', async () => {
  const { client, state } = stubQuery([{ id: 'e-1' }]);
  assert.equal(await canReviewCourse(client, { courseId: 'c-1', learnerProfileId: null }), false);
  // No query at all: a parent acting for a child has no voice here, and asking
  // the database would only invite a different answer later.
  assert.equal(state.select, '');
});

test('an enrolment is what qualifies a review, not entitlement', async () => {
  const enrolled = stubQuery([{ id: 'e-1' }]);
  assert.equal(
    await canReviewCourse(enrolled.client, { courseId: 'c-1', learnerProfileId: 'lp-1' }),
    true,
  );
  assert.deepEqual(enrolled.state.filters.status, ['active', 'completed']);
  assert.equal(enrolled.state.filters.course_id, 'c-1');
  assert.equal(enrolled.state.filters.learner_profile_id, 'lp-1');

  const notEnrolled = stubQuery([]);
  assert.equal(
    await canReviewCourse(notEnrolled.client, { courseId: 'c-1', learnerProfileId: 'lp-1' }),
    false,
  );
});
