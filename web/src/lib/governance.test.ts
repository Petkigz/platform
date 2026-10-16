import assert from 'node:assert/strict';
import test from 'node:test';

import {
  reportContent,
  resolveReport,
  appealDecision,
  decideAppeal,
  fetchRejections,
  REPORT_CATEGORIES,
} from './governance.ts';

// ---------------------------------------------------------------------------
// The rules under test are the ones that are easy to get wrong silently:
//
//   * a category the form offers but the database would refuse must never reach
//     the RPC — it would come back as a generic 400 that tells the reader
//     nothing about what they did wrong
//   * closing a report needs a written note; acknowledging one does not
//   * overturning an appeal needs a written summary; upholding one does not
//   * a database refusal is translated into a status that means something,
//     especially the two that must not be flattened into a 400: "you are not
//     staff" and "you cannot decide your own appeal"
//
// A validation that is wrong here is invisible. The RPC still gets called, and
// the failure surfaces to a teacher as a generic error.
// ---------------------------------------------------------------------------

type RpcCall = { fn: string; args: Record<string, unknown> };

/** Indexing with noUncheckedIndexedAccess on: fail loudly, not with a cast. */
function one<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`expected at least one ${label}, got none`);
  return row;
}

/** A Supabase stub that records RPC calls. The arguments matter most here. */
function stubRpc(
  result: { data?: unknown; error?: { message: string } } = { data: 'row-1' },
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

/**
 * A stub for the chained queries fetchRejections makes, in order.
 *
 * fetchRejections reads versions, then decisions, then appeals. Each is a
 * separate chain, so the stub hands out a queue of them rather than one shared
 * chain — otherwise a missing query would be satisfied by the previous one's
 * rows and the test would pass against the wrong data.
 */
function stubChain(queries: { rows: unknown[]; error?: { message: string } | null }[]) {
  let i = 0;
  const seen: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    from: (table: string) => {
      const spec = queries[i++] ?? { rows: [] };
      seen.push(table);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      const end = () =>
        Promise.resolve({ data: spec.rows, error: spec.error ?? null });
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.in = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => end().then(resolve);
      return chain;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, tables: () => seen };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

test('every category the form offers is one the database accepts', () => {
  // The dropdown and the CHECK constraint are maintained in two places. If they
  // drift, the form offers an option that can only ever fail.
  const values = REPORT_CATEGORIES.map((c) => c.value);
  assert.deepEqual(
    values,
    [
      'doctrinal_error',
      'translation_error',
      'inappropriate_content',
      'misattribution',
      'copyright',
      'technical_fault',
      'other',
    ],
    'the category list no longer matches the constraint',
  );
});

test('a category that is not on the list never reaches the database', async () => {
  const { client, calls } = stubRpc();

  const res = await reportContent(client, {
    lessonId: 'lesson-1',
    category: 'made_up',
    description: 'Something is wrong.',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0, 'an invalid category must not reach the database');
  if (!res.ok) assert.match(res.error, /what kind of problem/i);
});

test('a blank description is refused rather than sent', async () => {
  const { client, calls } = stubRpc();

  const res = await reportContent(client, {
    lessonId: 'lesson-1',
    category: 'doctrinal_error',
    description: '   ',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test('a report with no post sends an explicit null, not undefined', async () => {
  const { client, calls } = stubRpc();

  const res = await reportContent(client, {
    lessonId: 'lesson-1',
    category: 'doctrinal_error',
    description: 'The translation is off.',
  });

  assert.equal(res.ok, true);
  const args = one(calls, 'rpc call').args;
  assert.equal(args.p_lesson_id, 'lesson-1');
  assert.equal(args.p_category, 'doctrinal_error');
  assert.equal(
    args.p_discussion_post_id,
    null,
    'undefined would be dropped from the JSON body and the RPC would read a missing argument',
  );
});

test('a report naming a post passes the post id through', async () => {
  const { client, calls } = stubRpc();

  await reportContent(client, {
    lessonId: 'lesson-1',
    category: 'doctrinal_error',
    description: 'This answer contradicts the lesson.',
    discussionPostId: 'post-1',
  });

  const args = one(calls, 'rpc call').args;
  assert.equal(args.p_discussion_post_id, 'post-1');
});

test('reporting content you cannot see is a 403, not a generic failure', async () => {
  const { client } = stubRpc({
    error: { message: 'you cannot report content you cannot see' },
  });

  const res = await reportContent(client, {
    lessonId: 'lesson-1',
    category: 'doctrinal_error',
    description: 'Probing an unpublished draft.',
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 403, 'a permission refusal must not look like a bad form');
    assert.match(res.error, /cannot report content you cannot see/i);
  }
});

test('a duplicate open report is a 409 that says it was not ignored', async () => {
  const { client } = stubRpc({
    error: { message: 'duplicate key value violates unique constraint' },
  });

  const res = await reportContent(client, {
    lessonId: 'lesson-1',
    category: 'doctrinal_error',
    description: 'Still wrong.',
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 409);
    assert.match(res.error, /not been ignored/i);
  }
});

// ---------------------------------------------------------------------------
// Resolving
// ---------------------------------------------------------------------------

test('closing a report without a note is refused before the RPC', async () => {
  const { client, calls } = stubRpc();

  const res = await resolveReport(client, {
    reportId: 'r-1',
    status: 'dismissed',
    notes: '  ',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
  if (!res.ok) assert.match(res.error, /written note/i);
});

test('resolving without a note is also refused', async () => {
  const { client, calls } = stubRpc();

  const res = await resolveReport(client, {
    reportId: 'r-1',
    status: 'resolved',
    notes: '',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test('acknowledging a report needs no note', async () => {
  const { client, calls } = stubRpc();

  const res = await resolveReport(client, {
    reportId: 'r-1',
    status: 'triaged',
    notes: '',
  });

  assert.equal(res.ok, true, 'triage is not a closure and should not demand a note');
  assert.equal(calls.length, 1);
  assert.equal(one(calls, 'rpc call').args.p_notes, null);
});

test('a status the database does not recognise is refused', async () => {
  const { client, calls } = stubRpc();

  const res = await resolveReport(client, {
    reportId: 'r-1',
    status: 'approved',
    notes: 'Whatever.',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test('a non-privileged actor gets a 403 back', async () => {
  const { client } = stubRpc({ error: { message: 'only staff may resolve a report' } });

  const res = await resolveReport(client, {
    reportId: 'r-1',
    status: 'dismissed',
    notes: 'Not staff.',
  });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 403);
});

// ---------------------------------------------------------------------------
// Appealing
// ---------------------------------------------------------------------------

test('an appeal with no reason is refused', async () => {
  const { client, calls } = stubRpc();

  const res = await appealDecision(client, { decisionId: 'd-1', reason: '  ' });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test('an appeal passes its reason through untouched', async () => {
  const { client, calls } = stubRpc({ data: 'appeal-1' });

  const res = await appealDecision(client, {
    decisionId: 'd-1',
    reason: 'The citation is in footnote two.',
  });

  assert.equal(res.ok, true);
  const args = one(calls, 'rpc call').args;
  assert.equal(args.p_decision_id, 'd-1');
  assert.equal(args.p_reason, 'The citation is in footnote two.');
});

test('appealing something that was not rejected is a 409', async () => {
  const { client } = stubRpc({ error: { message: 'that decision was an approval; there is nothing to appeal' } });

  const res = await appealDecision(client, { decisionId: 'd-1', reason: 'Please look again.' });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 409);
});

// ---------------------------------------------------------------------------
// Deciding an appeal
// ---------------------------------------------------------------------------

test('overturning without a summary is refused before the RPC', async () => {
  const { client, calls } = stubRpc();

  const res = await decideAppeal(client, {
    appealId: 'a-1',
    outcome: 'overturned',
    summary: '  ',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
  if (!res.ok) assert.match(res.error, /written summary/i);
});

test('upholding needs no summary', async () => {
  const { client, calls } = stubRpc();

  const res = await decideAppeal(client, {
    appealId: 'a-1',
    outcome: 'upheld',
    summary: '',
  });

  assert.equal(res.ok, true);
  assert.equal(calls.length, 1);
});

test('deciding your own appeal is a 403, not a bad form', async () => {
  const { client } = stubRpc({
    error: { message: 'you cannot decide an appeal against your own decision' },
  });

  const res = await decideAppeal(client, {
    appealId: 'a-1',
    outcome: 'upheld',
    summary: 'It stands.',
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(
      res.status,
      403,
      'the independence rule must not be flattened into a 400 — a teacher would read it as a mistake of their own',
    );
    assert.match(res.error, /your own decision/i);
  }
});

test('an outcome the database does not recognise is refused', async () => {
  const { client, calls } = stubRpc();

  const res = await decideAppeal(client, {
    appealId: 'a-1',
    outcome: 'reversed',
    summary: 'Something.',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

// ---------------------------------------------------------------------------
// What the author is shown
// ---------------------------------------------------------------------------

test('a rejected version with no appeal offers the button', async () => {
  const { client, tables } = stubChain([
    { rows: [{ id: 'v-1', version_number: 2 }] },
    {
      rows: [
        {
          id: 'd-1',
          course_version_id: 'v-1',
          review_scope: 'scholarly',
          rationale: 'Not up to standard.',
          decided_at: '2026-10-01T00:00:00Z',
          decided_by: 'rev-1',
        },
      ],
    },
    { rows: [] },
  ]);

  const rows = await fetchRejections(client, 'course-1');

  assert.equal(rows.length, 1);
  const row = one(rows, 'rejection');
  assert.equal(row.hasOpenAppeal, false, 'the appeal button should be offered');
  assert.equal(row.version_number, 2);
  assert.equal(row.rationale, 'Not up to standard.');
  assert.deepEqual(tables(), ['course_versions', 'content_review_decisions', 'governance_appeals']);
});

test('a decision that is already appealed does not offer a second button', async () => {
  const { client } = stubChain([
    { rows: [{ id: 'v-1', version_number: 2 }] },
    {
      rows: [
        {
          id: 'd-1',
          course_version_id: 'v-1',
          review_scope: 'scholarly',
          rationale: 'Not up to standard.',
          decided_at: '2026-10-01T00:00:00Z',
          decided_by: 'rev-1',
        },
      ],
    },
    { rows: [{ id: 'a-1', related_decision_id: 'd-1', status: 'under_review' }] },
  ]);

  const rows = await fetchRejections(client, 'course-1');

  assert.equal(one(rows, 'rejection').hasOpenAppeal, true);
});

test('a decided appeal does not block a fresh one', async () => {
  const { client } = stubChain([
    { rows: [{ id: 'v-1', version_number: 3 }] },
    {
      rows: [
        {
          id: 'd-1',
          course_version_id: 'v-1',
          review_scope: 'scholarly',
          rationale: 'Not up to standard.',
          decided_at: '2026-10-01T00:00:00Z',
          decided_by: 'rev-1',
        },
      ],
    },
    { rows: [{ id: 'a-1', related_decision_id: 'd-1', status: 'upheld' }] },
  ]);

  const rows = await fetchRejections(client, 'course-1');

  assert.equal(
    one(rows, 'rejection').hasOpenAppeal,
    false,
    'an upheld appeal is finished; treating it as open would hide the door permanently',
  );
});

test('a course with no rejected version makes no further queries', async () => {
  const { client, tables } = stubChain([{ rows: [] }]);

  const rows = await fetchRejections(client, 'course-1');

  assert.deepEqual(rows, []);
  assert.deepEqual(tables(), ['course_versions']);
});
