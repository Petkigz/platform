/**
 * An adult learning inside a family account.
 *
 * A family used to hold children and nothing else. The adult who ran it had a
 * learner profile of their own, outside the family, invisible on /family — and
 * the family plan's adult seat had no learner it could ever be given to.
 *
 * This module is the decision the page makes before it draws anything: what
 * state is this person in, and what is the one thing they can do about it. It is
 * pure so the states can be asserted without a browser or a database, because
 * the interesting part is not the button but which of four situations the
 * reader is in — and three of them must not offer a button that cannot work.
 */

/** The signed-in adult's own learner profile, as the page sees it. */
export type OwnLearner = {
  id: string;
  displayName: string;
  familyId: string | null;
} | null;

export type AdultFamilyState =
  /** They learn inside this family already. */
  | 'in-family'
  /** They learn, but on their own, outside any family. */
  | 'alone'
  /** They learn inside a different family. */
  | 'other-family'
  /** They have no learner profile at all. */
  | 'no-profile';

export function adultFamilyState(own: OwnLearner, familyId: string): AdultFamilyState {
  if (!own) return 'no-profile';
  if (own.familyId === familyId) return 'in-family';
  if (own.familyId === null) return 'alone';
  return 'other-family';
}

/** Whether the page should offer the button that puts them in this family. */
export function canJoinFamily(state: AdultFamilyState): boolean {
  return state === 'no-profile' || state === 'alone';
}

/**
 * The heading over the signed-in adult's own card.
 *
 * "Your learning" rather than their name: the profile name is on the card
 * underneath, and the heading is about the *relationship* — this is where you
 * learn, in this family, not a child's card with an adult's name on it.
 */
export function adultCardHeading(state: AdultFamilyState): string {
  switch (state) {
    case 'in-family':
      return 'You learn here too';
    case 'alone':
      return 'Your learning is separate from this family';
    case 'other-family':
      return 'Your learning is in another family';
    default:
      return 'You are not a learner yet';
  }
}

/**
 * One sentence of explanation, and it always says what happens to what exists
 * already. That is the question an adult with progress has: does joining cost
 * me the courses I am part way through?
 */
export function adultCardExplanation(state: AdultFamilyState, familyName: string): string {
  switch (state) {
    case 'in-family':
      return `Your courses, progress and certificates sit beside the children's, so one plan can cover everybody.`;
    case 'alone':
      return `Joining ${familyName} moves your existing learning into it — the same profile, the same courses, the same progress. Nothing is copied and nothing is lost.`;
    case 'other-family':
      return `A learner profile belongs to one family at a time. To learn here, take your learning out of the other family first; it keeps its progress either way.`;
    default:
      return `Adding yourself makes this account a learner inside ${familyName}. You keep your own progress, and other adults in the family will be able to see it.`;
  }
}

export function joinButtonLabel(state: AdultFamilyState): string {
  return state === 'alone' ? 'Move my learning into this family' : 'Learn here as myself';
}

/**
 * What leaving does, said plainly.
 *
 * The button is offered whenever somebody learns here, but it is not always
 * going to work: a learner holding a seat on the family plan is refused by the
 * database until the seat is released. The screen says so before the click
 * rather than after it — a refusal a person could have been told about is not a
 * safeguard, it is a surprise.
 */
export const LEAVE_NOTE =
  'Leaving keeps every course and all of your progress; it only takes your learning out of this family. If you hold a seat on the family plan, whoever manages the plan has to release that seat first.';

/**
 * The result line after an attempt, in the words of somebody who did it rather
 * than of the API that answered.
 *
 * `joined` is true when an existing profile was moved in, which is worth saying
 * because the alternative — a second profile — is what people fear.
 */
export function joinOutcomeMessage(result: {
  created: boolean;
  joined: boolean;
  displayName?: string | null;
}): string {
  if (result.joined) return 'Your learning moved into this family. Everything you had came with it.';
  if (result.created) return 'This account is now a learner in this family.';
  return 'This account already learns in this family.';
}
