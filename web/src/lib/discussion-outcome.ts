/**
 * What a post to a lesson's discussion was answered with, and what the form
 * says about it.
 *
 * Kept apart from `discussion.ts` so the browser can import it without the
 * queries. The server names the reason with a code; the form turns the code
 * into a sentence in the reader's language. The server's own sentence is
 * English and is printed only on an English page.
 */

/** The longest post the route and the database accept. */
export const DISCUSSION_BODY_MAX = 4000;

/** The status the route answers a code with. Only `unconfirmed` is not a refusal. */
export function discussionStatusOf(code: DiscussionCode): number {
  if (code === 'unconfirmed') return 502;
  if (code === 'signed_out') return 401;
  if (code === 'malformed' || code === 'no_lesson' || code === 'too_long') return 400;
  return 409;
}

export type DiscussionCode =
  | 'signed_out'
  | 'flag_disabled'
  | 'malformed'
  | 'no_lesson'
  | 'empty'
  | 'too_long'
  | 'reply_unavailable'
  | 'not_allowed'
  | 'unconfirmed';

const DISCUSSION_CODES = new Set<string>([
  'signed_out', 'flag_disabled', 'malformed', 'no_lesson', 'empty', 'too_long', 'reply_unavailable', 'not_allowed', 'unconfirmed',
]);

/** The English the route sends with each code. */
export const DISCUSSION_SENTENCE: Record<DiscussionCode, string> = {
  signed_out: 'Sign in to join the discussion.',
  flag_disabled: 'Discussion is not open on this lesson right now.',
  malformed: 'Malformed request body.',
  no_lesson: 'lessonId is required.',
  empty: 'Write something first.',
  too_long: `That is too long. Keep it under ${DISCUSSION_BODY_MAX} characters.`,
  reply_unavailable: 'That question is no longer open for replies.',
  not_allowed: 'That could not be posted. Reload the page and try again.',
  unconfirmed: 'We could not confirm that this was posted. Reload the page to check before sending it again.',
};

/** What the form says when a post did not go through. */
export type DiscussionOutcome =
  | 'sign_in'
  | 'closed'
  | 'empty'
  | 'too_long'
  | 'reply_unavailable'
  | 'refused'
  | 'uncertain';

/**
 * The outcome of a reply that was not a success.
 *
 * A refusal is an answer in the four hundreds that names a reason this file
 * knows: nothing was saved. Anything else (a server error, a page from
 * something in front of the site, a reason nobody has heard of) is
 * `uncertain`: the post may or may not have been saved. **Sending again is
 * not safe here**, unlike a report: nothing stops the same question being
 * held twice. So the sentence for `uncertain` sends the learner to reload and
 * look, which works because a learner is shown their own held posts.
 */
export function discussionOutcomeOf(status: number, code: unknown): DiscussionOutcome {
  if (status < 400 || status > 499 || typeof code !== 'string' || !DISCUSSION_CODES.has(code)) return 'uncertain';
  if (code === 'unconfirmed') return 'uncertain';
  if (code === 'signed_out') return 'sign_in';
  if (code === 'flag_disabled') return 'closed';
  if (code === 'empty' || code === 'too_long' || code === 'reply_unavailable') return code;
  return 'refused';
}

/**
 * The reason the database refused an insert, from its error.
 *
 * Four different refusals arrive as a check violation: the switch is off, the
 * post is too long, the question being answered has been withdrawn or is not
 * on this lesson, and a constraint nobody expected. They used to be answered
 * with one sentence ("discussion is not open"), which was untrue for three of
 * them. Anything else the database itself refused is `not_allowed`, and the
 * database's own words are never sent to the reader.
 *
 * **An error that is not the database's answer is `unconfirmed`.** A refusal
 * carries a five-character SQLSTATE and the insert was rolled back with it. A
 * connection that dropped (class 08), a timeout between the site and the
 * database, or an error from the layer in between carries none, and the post
 * may be saved.
 */
export function discussionCodeOfDatabaseError(error: { code?: string | null; message?: string | null }): DiscussionCode {
  const message = error.message ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(error.code ?? '') || error.code?.startsWith('08')) return 'unconfirmed';
  if (error.code === '23503') return 'reply_unavailable';
  if (error.code === '23514') {
    if (/not enabled|learning\.discussion/u.test(message)) return 'flag_disabled';
    if (/too long/u.test(message)) return 'too_long';
    if (/reply target|a reply must be/u.test(message)) return 'reply_unavailable';
    if (/dp_body_not_blank/u.test(message)) return 'empty';
  }
  return 'not_allowed';
}
