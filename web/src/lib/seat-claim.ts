/**
 * Using a school's code: what the answer was, as names, and who it can be for.
 *
 * The form on `/institution/claim` printed the route's English sentence for
 * every reader. Now `/api/institution/claim` answers with a name and that
 * name's own status, and the page has a sentence for each name in the
 * reader's language. The English beside each name is for a caller with no
 * words of its own.
 *
 * Kept free of queries and of the catalogue, so the form in the browser can
 * import it.
 */

export const CLAIM_OUTCOMES = [
  'not_signed_in',
  'bad_code',
  'code_unknown',
  'code_used',
  'code_voided',
  'course_unavailable',
  'not_your_learner',
  'already_enrolled',
  'seats_closed',
  'refused',
  'unconfirmed',
] as const;
export type ClaimOutcome = (typeof CLAIM_OUTCOMES)[number];

export function claimStatusOf(reason: ClaimOutcome): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'bad_code': return 400;
    case 'not_your_learner': return 403;
    case 'code_unknown': return 404;
    case 'code_voided': return 410;
    case 'code_used':
    case 'course_unavailable':
    case 'already_enrolled': return 409;
    case 'seats_closed': return 503;
    case 'refused': return 500;
    case 'unconfirmed': return 502;
  }
}

/** What `claim_institution_seat()` raises, and the name for each. */
const RAISED: Readonly<Record<string, ClaimOutcome>> = {
  'institution:not_signed_in': 'not_signed_in',
  'institution:bad_code': 'bad_code',
  'institution:code_unknown': 'code_unknown',
  'institution:code_used': 'code_used',
  'institution:code_voided': 'code_voided',
  'institution:course_unavailable': 'course_unavailable',
  'institution:not_your_learner': 'not_your_learner',
  'institution:already_enrolled': 'already_enrolled',
  'institution:seats_closed': 'seats_closed',
};

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * The reason behind a database error from using a code.
 *
 * A five-character SQLSTATE outside class 08 is the database's answer, and
 * whatever was being written was rolled back with it: the code is unspent.
 * Anything else is not an answer, and the code may have been spent.
 */
export function claimReasonOf(error: DatabaseError): ClaimOutcome {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unconfirmed';
  const said = (error.message ?? '').trim();
  return Object.hasOwn(RAISED, said) ? RAISED[said]! : 'refused';
}

/**
 * What the form says about a reply that was not a success: a reason it
 * knows, arriving with that reason's own status, or `unconfirmed`.
 */
export function claimOutcomeOf(status: number, reason: unknown): ClaimOutcome {
  const known = typeof reason === 'string' && (CLAIM_OUTCOMES as readonly string[]).includes(reason);
  if (!known || claimStatusOf(reason as ClaimOutcome) !== status) return 'unconfirmed';
  return reason as ClaimOutcome;
}

/** The English the route sends beside each reason, for a caller with no words of its own. */
export const CLAIM_ENGLISH: Record<ClaimOutcome, string> = {
  not_signed_in: 'Sign in first.',
  bad_code: 'That is not the shape of a code. Check each letter and number against what the school gave you.',
  code_unknown: 'We have no code like that one. Check it against what the school gave you. Nothing was used.',
  code_used:
    'This code has already been used, and a code works once. If you used it yourself, the course is on the learning page. If you did not, ask the school for another code.',
  code_voided: 'The school has withdrawn this code. Ask the school for another.',
  course_unavailable:
    'The course this code is for cannot be joined at the moment. The code was not used, so you can try it again later.',
  not_your_learner: 'You cannot use a code for that learner. The code was not used.',
  already_enrolled:
    'That learner is already on the course this code is for. The code was not used, so it can be used for another learner.',
  seats_closed: 'Codes from schools cannot be used at the moment. The code was not used. Try again later.',
  refused: 'That could not be done. Nothing was changed.',
  unconfirmed: 'We could not confirm that the code was used. Look at the learning page before you try again.',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Who the form asked for.
 *
 * Nothing, null or an empty string is the account's own learner: the
 * database finds or makes that profile itself. Anything else has to be the
 * shape of a learner's id, or it is nobody this account could mean.
 */
export function claimLearnerOf(value: unknown): { ok: true; learner: string | null } | { ok: false } {
  if (value === undefined || value === null || value === '') return { ok: true, learner: null };
  if (typeof value === 'string' && UUID.test(value)) return { ok: true, learner: value.toLowerCase() };
  return { ok: false };
}

/** What the database said it added. The form is sent a title and nothing else of the school's. */
export function claimedCourseOf(data: unknown): { courseTitle: string | null } {
  const row = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const title = typeof row.courseTitle === 'string' ? row.courseTitle.trim() : '';
  return { courseTitle: title === '' ? null : title };
}

/** Somebody other than the account's own learner whom a code can be used for. */
export type ClaimLearner = { id: string; name: string; child: boolean };

/**
 * The other learners on this account, or null when the list is not one.
 *
 * The account's own learner is not in it: the form always offers "myself",
 * and the database finds or makes that profile. So a list that is empty is
 * an account with nobody else on it, and a list that could not be read is
 * null, which the page must not draw as "nobody else".
 */
export function claimLearnersOf(rows: unknown, userId: string): ClaimLearner[] | null {
  if (!Array.isArray(rows)) return null;
  const others: ClaimLearner[] = [];
  for (const entry of rows) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== 'string' || !UUID.test(row.id)) return null;
    if (typeof row.display_name !== 'string' || row.display_name.trim() === '') return null;
    if (row.learner_type !== 'adult' && row.learner_type !== 'child') return null;
    if (row.linked_user_id === userId) continue;
    others.push({ id: row.id, name: row.display_name.trim(), child: row.learner_type === 'child' });
  }
  return others;
}
