/**
 * What asking for, withdrawing and answering a merge was answered with, as
 * names; and what the database says would stop one, as names.
 *
 * `/api/account/merge` used to answer every refusal 400 with the sentence the
 * database raised, and the screen printed the database's own list of what
 * stops a merge, in English, for every reader. It also believed any reply:
 * a withdrawal answered "not withdrawn, it had already been merged" was shown
 * as "Request withdrawn. Nothing moved."
 *
 * So each refusal has a name and one status, each thing that stops a merge
 * has a name, and a reply is read for what it says happened. The database's
 * sentences are told apart here by their words, and a test reads those words
 * out of the migrations so the two cannot drift.
 *
 * A merge cannot be undone. A reply that never arrived, or one this file
 * cannot read, is therefore not "nothing changed": it is unknown (`failed`),
 * and the screen says so and asks the reader to reload.
 *
 * Kept apart from `merge.ts` so the words can be tested on their own.
 */

import { MERGE_STATES, movesOf, leftBehind, parseSummary, type MergeMoved, type MergePreview } from './merge.ts';

// ---------------------------------------------------------------------------
// What stops a merge
// ---------------------------------------------------------------------------

export type MergeBlock =
  | 'same'
  | 'absorbed_closed'
  | 'target_closed'
  | 'payouts'
  | 'billing'
  | 'reviewers'
  | 'households'
  | 'same_course'
  | 'owner'
  | 'other';

export const MERGE_BLOCKS: readonly MergeBlock[] = [
  'same',
  'absorbed_closed',
  'target_closed',
  'payouts',
  'billing',
  'reviewers',
  'households',
  'same_course',
  'owner',
  'other',
];

export type MergeBlockReason = {
  why: MergeBlock;
  /** How many payouts or shared billing accounts. */
  count?: number;
  /** The course both accounts have started, as its teacher named it. */
  title?: string;
};

/** The most of a course's name that is repeated on the screen. */
export const MERGE_TITLE_LIMIT = 120;

/** A course's name with nothing in it that redraws a line. */
export function mergeQuoted(value: string): string {
  // Control characters and the marks that turn text around are dropped: the
  // name is set inside an isolate of the screen's own, and one of these in a
  // name would close it early.
  return value
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu, '')
    .trim()
    .slice(0, MERGE_TITLE_LIMIT);
}

const whole = (digits: string | undefined): number | undefined => {
  const value = Number(digits);
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
};

/**
 * One thing `merge_blocks()` says would stop a merge, as a name.
 *
 * A sentence nobody recognises is `other`, with one sentence of its own: the
 * reader is told that something stops it and not what, on purpose, because
 * the alternative is a sentence in English nobody chose to show them.
 */
export function mergeBlockOf(sentence: unknown): MergeBlockReason {
  if (typeof sentence !== 'string') return { why: 'other' };

  if (/that is the same account/iu.test(sentence)) return { why: 'same' };
  if (/the account being absorbed is closed/iu.test(sentence)) return { why: 'absorbed_closed' };
  if (/the account it would merge into is closed/iu.test(sentence)) return { why: 'target_closed' };

  const payouts = /has (\d+) payout\(s\) in flight/iu.exec(sentence);
  if (payouts) {
    const count = whole(payouts[1]);
    return count === undefined ? { why: 'other' } : { why: 'payouts', count };
  }

  const billing = /shares (\d+) billing account\(s\) with other people/iu.exec(sentence);
  if (billing) {
    const count = whole(billing[1]);
    return count === undefined ? { why: 'other' } : { why: 'billing', count };
  }

  if (/both accounts are on the reviewer register/iu.test(sentence)) return { why: 'reviewers' };
  if (/each account is a learner in a different household/iu.test(sentence)) return { why: 'households' };

  // The name is everything between the first quote and the last one before
  // the sentence goes on: a course may have a quote in its own name.
  const course = /both accounts have started "([\s\S]*)"; the platform cannot choose/iu.exec(sentence);
  if (course) {
    const title = mergeQuoted(course[1] ?? '');
    return title === '' ? { why: 'other' } : { why: 'same_course', title };
  }

  if (/has an owner appointment/iu.test(sentence)) return { why: 'owner' };

  return { why: 'other' };
}

/**
 * Everything that stops this merge, or nothing when it may run.
 *
 * A preview that does not say it is fine and gives no reason still stops the
 * merge: that is one `other`. So is no preview at all on a request that is
 * waiting, which the caller decides.
 */
export function mergeBlocksOf(preview: MergePreview | null): MergeBlockReason[] {
  if (!preview || preview.ok) return [];
  if (preview.blocks.length === 0) return [{ why: 'other' }];
  const reasons = preview.blocks.map(mergeBlockOf);
  // Two sentences nobody recognises are said once.
  return reasons.filter((reason, index) => reason.why !== 'other' || reasons.findIndex((r) => r.why === 'other') === index);
}

/** The two things `merge_blocks()` adds to a merge that may run. */
export type MergeNote = 'join' | 'moves';

export const MERGE_NOTES: readonly MergeNote[] = ['join', 'moves'];

/** A note as a name. One nobody recognises is not said. */
export function mergeNoteOf(sentence: unknown): MergeNote | null {
  if (typeof sentence !== 'string') return null;
  if (/the two learner records become one/iu.test(sentence)) return 'join';
  if (/the learning record moves across whole/iu.test(sentence)) return 'moves';
  return null;
}

// ---------------------------------------------------------------------------
// What the route answers
// ---------------------------------------------------------------------------

export type MergeCode =
  | 'signed_out'
  | 'off'
  | 'malformed'
  | 'email'
  | 'no_account'
  | 'same_account'
  | 'pending'
  | 'too_many'
  | 'no_request'
  | 'not_yours'
  | 'name'
  | 'blocked'
  | 'expired'
  | 'answered'
  | 'refused'
  | 'failed';

/**
 * The English the route sends beside each code, for a caller with no words of
 * its own. Its own sentences: none repeats the words the database raises, so
 * a check for the database's words in an answer cannot be fooled by these.
 */
export const MERGE_SENTENCE: Record<MergeCode, string> = {
  signed_out: 'You are signed out. Nothing was changed.',
  off: 'Accounts cannot be merged at the moment: the switch for it is off. Nothing was changed.',
  malformed: 'The request was not one this address understands.',
  email: 'The address of the account to keep is missing.',
  no_account: 'No account has that address. Nothing was changed.',
  same_account: 'That address belongs to the account asking. Nothing was changed.',
  pending: 'A request from this account is already waiting. Nothing was changed.',
  too_many: 'This account has asked too often for one day. Nothing was changed.',
  no_request: 'That request is no longer there. Nothing was changed.',
  not_yours: 'This account cannot answer that request. Nothing was changed.',
  name: 'The name typed is not the name of this account. Nothing was changed.',
  blocked: 'Something stops this merge. Nothing was moved.',
  expired: 'The request ran out before it was answered. Nothing was moved.',
  answered: 'The request had already been answered. Nothing was changed now.',
  refused: 'The platform did not accept this. Nothing was changed.',
  failed: 'What happened could not be confirmed.',
};

const isMergeCode = (value: unknown): value is MergeCode =>
  typeof value === 'string' && Object.hasOwn(MERGE_SENTENCE, value);

/** The status the route answers a code with. Only `failed` is not a refusal. */
export function mergeStatusOf(code: MergeCode): number {
  switch (code) {
    case 'signed_out':
      return 401;
    case 'not_yours':
      return 403;
    case 'no_account':
    case 'no_request':
      return 404;
    case 'too_many':
      return 429;
    case 'off':
    case 'pending':
    case 'blocked':
    case 'expired':
    case 'answered':
    case 'refused':
      return 409;
    case 'failed':
      return 502;
    default:
      return 400;
  }
}

export type MergeRefusal = { ok: false; code: MergeCode; message: string };

/** A refusal as the route sends it. */
export function mergeRefusal(code: MergeCode): MergeRefusal {
  return { ok: false, code, message: MERGE_SENTENCE[code] };
}

/**
 * What the screen believes about a reply that did not say `ok`.
 *
 * A refusal is believed only from a 4xx that names a reason this file knows.
 * Everything else, a 5xx, a proxy's page, a name from a newer server, is
 * `failed`: the screen does not know what happened.
 */
export function mergeOutcomeOf(status: number, body: unknown): MergeCode {
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined;
  return status >= 400 && status <= 499 && isMergeCode(code) ? code : 'failed';
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * What the three functions raise (`20261281000800_account_merge.sql`, the
 * owner's guard in `20261281058000_named_owner_account_boundary.sql`, and
 * `20261281146000_merge_request_privacy.sql`), told apart by their words.
 *
 * Since the third of those, asking no longer says that an address has no
 * account: every address is answered the same way. `no_account` stays a
 * name here for a database that has not had that migration yet.
 *
 * Every one is raised before the merge writes or undoes all of it, so each
 * is a refusal. An error under a state none of them uses is not known to be
 * that, and is `failed`.
 *
 * `blocked` carries no reason. The database joins its reasons with "; ", and
 * two of them have a "; " of their own, so the list cannot be taken apart
 * again; the page reads the reasons separately, one by one, when it is drawn.
 */
export function mergeCodeOf(error: DatabaseError): MergeCode {
  const state = error.code ?? '';
  const message = error.message ?? '';

  if (state === '42501') {
    if (/sign in to (?:merge an account|cancel a merge|answer a merge request|see merge requests)/iu.test(message)) {
      return 'signed_out';
    }
    if (/only the account (?:asking to be merged can withdraw|that would survive can decide)/iu.test(message)) {
      return 'not_yours';
    }
    return 'refused';
  }
  if (state === '0A000') return /merging accounts is not enabled/iu.test(message) ? 'off' : 'refused';
  if (state === 'P0002') {
    if (/there is no account with that email address/iu.test(message)) return 'no_account';
    if (/there is no such merge request/iu.test(message)) return 'no_request';
    return 'refused';
  }
  if (state === '22023') {
    if (/type the email address of the account you want to keep/iu.test(message)) return 'email';
    if (/that is this account/iu.test(message)) return 'same_account';
    if (/type your name exactly as it appears/iu.test(message)) return 'name';
    return 'refused';
  }
  if (state === '23514') {
    return /this merge cannot run:|has an owner appointment/iu.test(message) ? 'blocked' : 'refused';
  }
  // Five asks in twenty-four hours (`20261281146000_merge_request_privacy.sql`).
  if (state === '54000') return /asked for a merge too many times/iu.test(message) ? 'too_many' : 'refused';
  return 'failed';
}

export type MergeAction = 'request' | 'cancel' | 'decide';

export type MergeDid = 'asked' | 'withdrawn' | 'merged' | 'declined';

export type MergeDone = {
  ok: true;
  did: MergeDid;
  /** What a merge moved, and how many records stayed. Only beside `merged`. */
  moved?: MergeMoved[];
  stayed?: number;
};

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const isState = (value: unknown): boolean =>
  typeof value === 'string' && (MERGE_STATES as readonly string[]).includes(value);

/**
 * What a reply that was not an error says happened.
 *
 * The three functions answer some things without raising: a second request
 * while one waits, a withdrawal or an answer that came too late, a request
 * that ran out. Each of those is a refusal with a name. A reply that says
 * the opposite of what was asked (a merge after a decline), or one that
 * cannot be read, is `failed`.
 */
export function mergeAnswerOf(action: MergeAction, accept: boolean, data: unknown): MergeDone | { ok: false; code: MergeCode } {
  const reply = record(data);
  const no = (code: MergeCode) => ({ ok: false as const, code });
  if (!reply) return no('failed');

  if (action === 'request') {
    if (reply.requested === true) return { ok: true, did: 'asked' };
    if (reply.requested === false && reply.alreadyPending === true) return no('pending');
    return no('failed');
  }

  if (action === 'cancel') {
    if (reply.cancelled === true) return { ok: true, did: 'withdrawn' };
    if (reply.cancelled === false && isState(reply.status) && reply.status !== 'pending') return no('answered');
    return no('failed');
  }

  if (reply.merged === true) {
    if (!accept || reply.status !== 'completed') return no('failed');
    const summary = parseSummary(reply.moved);
    const stayed = leftBehind(summary);
    return { ok: true, did: 'merged', moved: movesOf(summary), ...(stayed === null ? {} : { stayed }) };
  }
  if (reply.merged !== false || !isState(reply.status)) return no('failed');
  if (reply.status === 'expired') return no('expired');
  if (reply.status === 'declined') return accept ? no('answered') : { ok: true, did: 'declined' };
  if (reply.status === 'pending') return no('failed');
  return no('answered');
}

/** What the screen takes from a reply that said `ok`. Anything it cannot read is `failed`. */
export function mergeDoneOf(body: unknown): MergeDone | null {
  const reply = record(body);
  if (!reply || reply.ok !== true) return null;
  const did = reply.did;
  if (did !== 'asked' && did !== 'withdrawn' && did !== 'merged' && did !== 'declined') return null;
  if (did !== 'merged') return { ok: true, did };
  const summary: Record<string, number> = {};
  for (const entry of Array.isArray(reply.moved) ? reply.moved : []) {
    const line = record(entry);
    if (line && typeof line.kind === 'string' && typeof line.count === 'number') summary[line.kind] = line.count;
  }
  const stayed = leftBehind({ leftBehind: typeof reply.stayed === 'number' ? reply.stayed : undefined });
  return { ok: true, did, moved: movesOf(parseSummary(summary)), ...(stayed === null ? {} : { stayed }) };
}
