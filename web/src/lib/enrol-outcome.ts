/**
 * What `/api/enrol` answered, as a name, and the words the enrol button on a
 * course page is handed.
 *
 * The button is written in the reader's language since 2026-11-25 and
 * carries no sentence of its own. It used to print the English sentence the
 * route sent. The route has always named its reason (`code`); this turns
 * that name into the one the button has words for.
 *
 * The rule is the one in `guardian-outcome.ts` and `family-outcome.ts`:
 * **only a reply in the four hundreds that names a reason this file knows is
 * a refusal.** Anything else — a lost reply, a five hundred, a page from
 * something in front of the site — is `unconfirmed`, and the sentence for
 * that sends the reader to look at their learning before pressing again.
 *
 * Pure, with no query in it, so a browser may import it.
 */

export type EnrolCode =
  | 'not_signed_in'
  | 'no_learner_profile'
  | 'no_published_version'
  | 'payment_required'
  | 'not_sold_here'
  | 'guardian_verification_required'
  | 'not_available'
  | 'already_enrolled'
  | 'unconfirmed';

const NAMES: readonly EnrolCode[] = [
  'not_signed_in', 'no_learner_profile', 'no_published_version', 'payment_required',
  'not_sold_here', 'guardian_verification_required', 'not_available', 'already_enrolled',
];

/** What the route answered, as the name the button says it by. */
export function enrolOutcomeOf(status: number, code: unknown): EnrolCode {
  if (status < 400 || status > 499) return 'unconfirmed';
  return typeof code === 'string' && NAMES.includes(code as EnrolCode)
    ? (code as EnrolCode)
    : 'unconfirmed';
}

/** One person the account may enrol, as the button shows them. */
export type EnrolLearner = {
  id: string;
  name: string;
  isSelf: boolean;
  /** "Amina (me)" for the account's own profile, the name alone for a child. */
  label: string;
  /** Said when the course is written for other ages than this learner's, or null. */
  outside: string | null;
};

/** Every sentence the enrol button says, in the reader's language. */
export type EnrolWords = {
  createToEnrol: string;
  haveAccount: string;
  notSoldHere: string;
  contact: string;
  /** "Buy — UGX 20,000": the amount is the checkout's, already in it. */
  buy: string;
  goLearning: string;
  who: string;
  forChild: string;
  outsideNote: string;
  enrolling: string;
  continueEnrolment: string;
  enrolFree: string;
  openGuardian: string;
  refusals: Record<EnrolCode, string>;
};

/** What the card about the teacher says when it is not a name. */
export type TeacherWords = {
  /** "Everything Amina teaches", with the first name in it. */
  all: (firstName: string) => string;
  unnamed: string;
  unnamedWhy: string;
};
