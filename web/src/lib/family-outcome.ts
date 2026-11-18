/**
 * What the three family writers were answered with, as names.
 *
 * `/api/family/create`, `/api/family/children` and `/api/family/learner` each
 * used to answer a refusal with a sentence, and the forms printed it. Two
 * things were wrong with that. The sentence was English on a page written in
 * the reader's language, and where no pattern matched it was the database's
 * own (`error.message`), which is not written for a reader at all.
 *
 * So the routes name the reason and the forms say it. This file is the list
 * of names, the status each is answered with, and the two decisions that are
 * easy to get wrong:
 *
 * 1. **Which database errors are an answer.** A refusal carries a
 *    five-character SQLSTATE and was rolled back with it. An error without
 *    one, or in class 08 (the connection), is not the database's answer: the
 *    family may have been created, the child may have been added. That is
 *    `unconfirmed`, and it is not a refusal.
 * 2. **Which replies a form may call a refusal.** Only one in the four
 *    hundreds that names a code in this file. A page from something in front
 *    of the site, a five hundred, a code nobody has heard of: `unconfirmed`.
 *
 * Kept apart from `family.ts` so a browser can import it without the queries.
 */

/** The longest family name the route and the database accept. */
export const FAMILY_NAME_MAX = 120;
/** The longest child's name the form accepts. */
export const CHILD_NAME_MAX = 60;
/** The age the declaration is about. Printed in the reader's digits. */
export const DECLARATION_AGE = 18;

export type FamilyCode =
  | 'signed_out'
  | 'malformed'
  | 'name_long'
  | 'name_missing'
  | 'band_invalid'
  | 'no_family'
  | 'not_owner'
  | 'declaration_required'
  | 'not_member'
  | 'other_family'
  | 'seat_held'
  | 'not_here'
  | 'refused'
  | 'unconfirmed';

/** The English the routes send beside each code, for a caller with no words of its own. */
export const FAMILY_SENTENCE: Record<FamilyCode, string> = {
  signed_out: 'You are signed out. Sign in again, then try once more.',
  malformed: 'That request could not be read.',
  name_long: `Keep the family name to ${FAMILY_NAME_MAX} characters or fewer.`,
  name_missing: 'Add the child’s name.',
  band_invalid: 'Choose an age band.',
  no_family: 'That family does not exist.',
  not_owner: 'Only the family owner can add a child.',
  declaration_required: `Declare that you are ${DECLARATION_AGE} or older before adding a child.`,
  not_member: 'You are not a member of that family.',
  other_family: 'Your learning is in another family.',
  seat_held:
    'This learning holds a seat on the family plan. Whoever manages the plan has to release that seat first.',
  not_here: 'This account does not learn inside that family.',
  refused: 'That did not work. Nothing was changed.',
  unconfirmed: 'We could not confirm that. Reload the page to check before trying again.',
};

const isFamilyCode = (value: unknown): value is FamilyCode =>
  typeof value === 'string' && Object.hasOwn(FAMILY_SENTENCE, value);

/** The status a route answers a code with. Only `unconfirmed` is not a refusal. */
export function familyStatusOf(code: FamilyCode): number {
  if (code === 'unconfirmed') return 502;
  if (code === 'signed_out') return 401;
  if (code === 'not_owner' || code === 'not_member') return 403;
  if (code === 'no_family') return 404;
  if (code === 'malformed' || code === 'name_long' || code === 'name_missing' || code === 'band_invalid') {
    return 400;
  }
  return 409;
}

/** A refusal as the routes send it. */
export function familyRefusal(code: FamilyCode): { ok: false; code: FamilyCode; message: string } {
  return { ok: false, code, message: FAMILY_SENTENCE[code] };
}

/**
 * What a form says about a reply that was not a success.
 *
 * `unconfirmed` is the answer for everything that is not plainly a refusal,
 * and each form's sentence for it sends the reader to reload and look rather
 * than to press again: a second family and a second child with the same name
 * are both things the database would accept.
 */
export function familyOutcomeOf(status: number, code: unknown): FamilyCode {
  if (status < 400 || status > 499 || !isFamilyCode(code)) return 'unconfirmed';
  return code;
}

type DatabaseError = { code?: string | null; message?: string | null };

/** Whether this error is the database's own answer, and so a rollback. */
function answered(error: DatabaseError): boolean {
  const state = error.code ?? '';
  return /^[0-9A-Z]{5}$/u.test(state) && !state.startsWith('08');
}

/** `create_family()` refuses one thing by name: nobody is signed in. */
export function createFamilyCodeOf(error: DatabaseError): FamilyCode {
  if (!answered(error)) return 'unconfirmed';
  if (/sign in/iu.test(error.message ?? '')) return 'signed_out';
  return 'refused';
}

/**
 * `add_child_to_family()`.
 *
 * "Sign in to add a child" used to be reported as `not_owner`, which told a
 * person whose session had ended that they were not the owner of their own
 * family. It has its own name now.
 */
export function addChildCodeOf(error: DatabaseError): FamilyCode {
  if (!answered(error)) return 'unconfirmed';
  const message = error.message ?? '';
  if (/sign in/iu.test(message)) return 'signed_out';
  if (/only the owner/iu.test(message)) return 'not_owner';
  if (/family .* not found/iu.test(message)) return 'no_family';
  if (/age:declare_before_adding_a_child/iu.test(message)) return 'declaration_required';
  if (/a child needs a name/iu.test(message)) return 'name_missing';
  if (/unsupported age band/iu.test(message)) return 'band_invalid';
  return 'refused';
}

/** `claim_family_adult_learner()`. */
export function joinFamilyCodeOf(error: DatabaseError): FamilyCode {
  if (!answered(error)) return 'unconfirmed';
  const message = error.message ?? '';
  if (/sign in/iu.test(message)) return 'signed_out';
  if (/not a member of this family|a family you are a member of/iu.test(message)) return 'not_member';
  if (/family .* not found/iu.test(message)) return 'no_family';
  if (/already belongs to another family/iu.test(message)) return 'other_family';
  return 'refused';
}

/** `release_family_adult_learner()`, and the guard underneath it. */
export function leaveFamilyCodeOf(error: DatabaseError): FamilyCode {
  if (!answered(error)) return 'unconfirmed';
  const message = error.message ?? '';
  if (/sign in/iu.test(message)) return 'signed_out';
  if (/seat on (?:the|a) family plan/iu.test(message)) return 'seat_held';
  if (/does not learn inside that family/iu.test(message)) return 'not_here';
  return 'refused';
}
