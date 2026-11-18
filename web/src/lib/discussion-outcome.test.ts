import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { postToDiscussion } from './discussion.ts';
import {
  DISCUSSION_BODY_MAX,
  DISCUSSION_SENTENCE,
  discussionCodeOfDatabaseError,
  discussionOutcomeOf,
  discussionStatusOf,
  type DiscussionCode,
} from './discussion-outcome.ts';

// ---------------------------------------------------------------------------
// A post to a lesson's discussion that does not go through.
//
// The thing that is easy to get wrong silently is telling a learner to send
// again when the first one arrived: nothing stops the same question being held
// for review twice. So a refusal has to be known to be a refusal, and
// everything else sends the learner to look first.
// ---------------------------------------------------------------------------

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const CODES = Object.keys(DISCUSSION_SENTENCE) as DiscussionCode[];

/** A client whose insert is answered with `answer`. */
function inserting(answer: { data: unknown; error: unknown }) {
  const sent: Record<string, unknown>[] = [];
  const client = {
    from: (table: string) => {
      assert.equal(table, 'discussion_posts');
      return {
        insert: (row: Record<string, unknown>) => {
          sent.push(row);
          return { select: () => ({ single: async () => answer }) };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, sent };
}

test('a refusal that names a known reason is a refusal, and nothing else is', () => {
  assert.equal(discussionOutcomeOf(401, 'signed_out'), 'sign_in');
  assert.equal(discussionOutcomeOf(409, 'flag_disabled'), 'closed');
  assert.equal(discussionOutcomeOf(409, 'empty'), 'empty');
  assert.equal(discussionOutcomeOf(400, 'too_long'), 'too_long');
  assert.equal(discussionOutcomeOf(409, 'reply_unavailable'), 'reply_unavailable');
  // Refusals the reader can do nothing about share one sentence.
  for (const code of ['malformed', 'no_lesson', 'not_allowed']) {
    assert.equal(discussionOutcomeOf(400, code), 'refused', code);
  }
  // Everything else may or may not have been saved.
  assert.equal(discussionOutcomeOf(502, 'unconfirmed'), 'uncertain');
  assert.equal(discussionOutcomeOf(409, 'unconfirmed'), 'uncertain');
  assert.equal(discussionOutcomeOf(500, 'empty'), 'uncertain');
  assert.equal(discussionOutcomeOf(503, undefined), 'uncertain');
  assert.equal(discussionOutcomeOf(409, undefined), 'uncertain');
  assert.equal(discussionOutcomeOf(409, 'never_heard_of_it'), 'uncertain');
  assert.equal(discussionOutcomeOf(200, 'empty'), 'uncertain');
  assert.equal(discussionOutcomeOf(409, 7), 'uncertain');
});

test('each code has one sentence and one status, and only the unconfirmed one is not a refusal', () => {
  for (const code of CODES) {
    assert.ok(DISCUSSION_SENTENCE[code].length > 0, code);
    const status = discussionStatusOf(code);
    assert.equal(status >= 400 && status <= 499, code !== 'unconfirmed', code);
    // What the route answers with is what the form reads back.
    if (code !== 'unconfirmed') assert.notEqual(discussionOutcomeOf(status, code), 'uncertain', code);
  }
  assert.equal(discussionStatusOf('unconfirmed'), 502);
  assert.ok(DISCUSSION_SENTENCE.too_long.includes(String(DISCUSSION_BODY_MAX)));
});

test('the four refusals that arrive as a check violation are told apart', () => {
  const of = (code: string, message: string) => discussionCodeOfDatabaseError({ code, message });
  // The sentences are the ones the migrations raise.
  assert.equal(of('23514', 'per-lesson discussion is not enabled (learning.discussion is off)'), 'flag_disabled');
  assert.equal(of('23514', 'discussion post is too long'), 'too_long');
  assert.equal(of('23514', 'reply target unavailable'), 'reply_unavailable');
  assert.equal(of('23514', 'a reply must be on the same lesson as the post it answers'), 'reply_unavailable');
  assert.equal(of('23503', 'reply target 7 does not exist'), 'reply_unavailable');
  assert.equal(
    of('23514', 'new row for relation "discussion_posts" violates check constraint "dp_body_not_blank"'),
    'empty',
  );
  assert.equal(of('23514', 'violates check constraint "dp_teacher_never_pending"'), 'not_allowed');
  assert.equal(of('42501', 'new row violates row-level security policy'), 'not_allowed');
  // Those sentences are still what the database says.
  const first = read('../../../supabase/migrations/20261029000400_discussion.sql');
  const second = read('../../../supabase/migrations/20261281131000_discussion_write_boundaries.sql');
  assert.ok(first.includes("'per-lesson discussion is not enabled (learning.discussion is off)'"));
  assert.ok(first.includes("'a reply must be on the same lesson as the post it answers'"));
  assert.ok(second.includes("'discussion post is too long'"));
  assert.ok(second.includes("'reply target unavailable'"));
});

test('an error that is not the database’s answer is not called a refusal', () => {
  for (const error of [
    { message: 'TypeError: fetch failed' },
    { code: '', message: 'FetchError: request timed out' },
    { code: null, message: null },
    { code: 'PGRST003', message: 'Timed out acquiring connection from connection pool.' },
    { code: '08006', message: 'connection failure' },
  ]) {
    assert.equal(discussionCodeOfDatabaseError(error), 'unconfirmed', JSON.stringify(error));
  }
});

test('posting answers with a code, never with the database’s own words', async () => {
  const blank = inserting({ data: null, error: null });
  assert.deepEqual(await postToDiscussion(blank.client, { lessonId: 'l', body: '  \n ' }), {
    ok: false, message: DISCUSSION_SENTENCE.empty, code: 'empty',
  });
  assert.equal(blank.sent.length, 0);

  const secret = 'relation "discussion_posts" column "moderation_note" of schema public';
  const refused = inserting({ data: null, error: { code: '23514', message: secret } });
  const refusal = await postToDiscussion(refused.client, { lessonId: 'l', body: 'A question' });
  assert.deepEqual(refusal, { ok: false, message: DISCUSSION_SENTENCE.not_allowed, code: 'not_allowed' });

  const dropped = inserting({ data: null, error: { message: 'TypeError: fetch failed' } });
  assert.deepEqual(await postToDiscussion(dropped.client, { lessonId: 'l', body: 'A question' }), {
    ok: false, message: DISCUSSION_SENTENCE.unconfirmed, code: 'unconfirmed',
  });
  // No error and no row says nothing either way.
  const silent = inserting({ data: null, error: null });
  assert.equal((await postToDiscussion(silent.client, { lessonId: 'l', body: 'A question' })).ok, false);
  assert.equal(((await postToDiscussion(silent.client, { lessonId: 'l', body: 'A question' })) as { code: string }).code, 'unconfirmed');
});

test('held is read back from the row, and the post is sent trimmed', async () => {
  const held = inserting({ data: { id: 'p1', visibility_state: 'pending' }, error: null });
  assert.deepEqual(await postToDiscussion(held.client, { lessonId: 'l', body: '  A question \n', parentId: 'root' }), {
    ok: true, id: 'p1', held: true,
  });
  assert.deepEqual(held.sent, [{ lesson_id: 'l', parent_id: 'root', body: 'A question' }]);
  const shown = inserting({ data: { id: 'p2', visibility_state: 'visible' }, error: null });
  assert.deepEqual(await postToDiscussion(shown.client, { lessonId: 'l', body: 'An answer' }), {
    ok: true, id: 'p2', held: false,
  });
});

test('the route sends a code with every refusal, and the status the code names', () => {
  const route = read('../app/api/discussion/route.ts');
  const refusals = route.match(/NextResponse\.json\(\s*\{ error:[^}]*\}/gu) ?? [];
  assert.equal(refusals.length, 7);
  // All but the answer of a site with no database behind it, which is a 503
  // and so reads as "could not confirm" in the form.
  const uncoded = refusals.filter((refusal) => !/code: /u.test(refusal));
  assert.deepEqual(uncoded, ["NextResponse.json({ error: 'Not configured.' }"]);
  assert.match(route, /\{ error: result\.message, code: result\.code \}, \{ status: discussionStatusOf\(result\.code\) \}/u);
  assert.match(route, /body\.length > DISCUSSION_BODY_MAX/u);
  // The database's sentence never leaves the server.
  assert.doesNotMatch(read('./discussion.ts').split('export async function postToDiscussion')[1]?.split('export type QueueItem')[0] ?? 'error.message', /error\.message/u);
});
