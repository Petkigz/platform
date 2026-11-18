/**
 * What closing an account was answered with, as names.
 *
 * `/api/account/erase` used to answer a refusal with whatever sentence
 * `erase_my_account()` raised, and the form printed it: English on a page in
 * the reader's language, written for the database's log rather than for a
 * person ("you sit on a scholarly board; ask the platform owner…"), and for an
 * error nobody anticipated, a constraint's own text.
 *
 * So the route names the reason and the form says it. Two decisions matter
 * more here than on any other form, because this one cannot be undone:
 *
 * 1. **Which database errors are an answer.** A refusal carries a
 *    five-character SQLSTATE and was rolled back with it: the account is
 *    still open. An error without one, or in class 08 (the connection), is
 *    not an answer: the account may be closed. That is `unconfirmed`.
 * 2. **Which replies the form may call a refusal.** Only one in the four
 *    hundreds that names a code in this file. Everything else, including a
 *    success that does not say `closed: true`, is `unconfirmed`, and that
 *    sentence never says the account is still open.
 *
 * Kept apart from `account.ts` so a browser can import it without the queries.
 */

/**
 * Where a reader is sent when closing needs a person to look at it.
 *
 * One place, because it is printed inside sentences in twenty-eight
 * languages. The owner does not control this domain yet (`DECISIONS.md`), so
 * this is the line to change when a working address exists.
 */
export const PRIVACY_CONTACT = 'privacy@ayahspring.com';

export type EraseCode =
  | 'signed_out'
  | 'no_account'
  | 'name_missing'
  | 'name_mismatch'
  | 'teaching'
  | 'board'
  | 'held'
  | 'appointment'
  | 'refused'
  | 'unconfirmed';

/** The English the route sends beside each code, for a caller with no words of its own. */
export const ERASE_SENTENCE: Record<EraseCode, string> = {
  signed_out: 'You are signed out. Sign in again to close this account.',
  no_account: 'There is no account here to close.',
  name_missing: 'Type your name to confirm.',
  name_mismatch: 'Type your name exactly as it appears above.',
  teaching:
    'You still have a course in review or published. Ask the platform owner to close the teaching account first.',
  board: 'You sit on a scholarly board. Ask the platform owner to remove you from it first.',
  held: `This account is linked to a separate child login, or to coursework that is being held, so closing it needs individual review. Contact ${PRIVACY_CONTACT}.`,
  appointment: `This account holds a safeguarding or refund-approval appointment, so closing it needs individual review. Contact ${PRIVACY_CONTACT}.`,
  refused: 'This account could not be closed.',
  unconfirmed: `We could not confirm whether your account closed. Check your account status or contact ${PRIVACY_CONTACT} before trying again.`,
};

/** The sentence for a reply nobody can read. Never says the account is still open. */
export const UNCERTAIN_CLOSURE = ERASE_SENTENCE.unconfirmed;

const isEraseCode = (value: unknown): value is EraseCode =>
  typeof value === 'string' && Object.hasOwn(ERASE_SENTENCE, value);

/** The status the route answers a code with. Only `unconfirmed` is not a refusal. */
export function eraseStatusOf(code: EraseCode): number {
  if (code === 'unconfirmed') return 502;
  if (code === 'signed_out') return 401;
  if (code === 'no_account') return 404;
  if (code === 'name_missing' || code === 'name_mismatch') return 400;
  return 409;
}

/** A refusal as the route sends it. */
export function eraseRefusal(code: EraseCode): { ok: false; code: EraseCode; message: string } {
  return { ok: false, code, message: ERASE_SENTENCE[code] };
}

/** What the form says about a reply that did not say the account closed. */
export function eraseOutcomeOf(status: number, code: unknown): EraseCode {
  if (status < 400 || status > 499 || !isEraseCode(code)) return 'unconfirmed';
  return code;
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * `erase_my_account()` and the guard in front of it.
 *
 * The sentences are the ones the migrations raise
 * (`20261281122000_support_case_held_erasure.sql` and
 * `20261281058000_named_owner_account_boundary.sql`). A reworded
 * `raise exception` there turns a named refusal into `refused` here without
 * failing a test, which is why `refused` has a sentence a person can act on.
 */
export function eraseCodeOf(error: DatabaseError): EraseCode {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unconfirmed';
  const message = error.message ?? '';
  if (/sign in to close/iu.test(message)) return 'signed_out';
  if (/no account to close/iu.test(message)) return 'no_account';
  if (/type your name exactly/iu.test(message)) return 'name_mismatch';
  if (/course in review or published/iu.test(message)) return 'teaching';
  if (/scholarly board/iu.test(message)) return 'board';
  if (/separate child login or held coursework/iu.test(message)) return 'held';
  if (/owner appointment/iu.test(message)) return 'appointment';
  return 'refused';
}
