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
 * The sentences are named here and written in the catalogue.
 *
 * Each function below used to return English. The family page is written in
 * the reader's language now, so each returns the *name* of its sentence
 * (`family.…` in `lib/i18n/messages/en.ts`) and the page says it. The
 * decision of which sentence is still made here, where it can be asserted
 * without a browser, and the English is in one place only.
 */
export type FamilyAdultKey =
  | 'family.adultHeadIn'
  | 'family.adultHeadInNamed'
  | 'family.adultHeadAlone'
  | 'family.adultHeadOther'
  | 'family.adultHeadNone'
  | 'family.adultWhyIn'
  | 'family.adultWhyAlone'
  | 'family.adultWhyOther'
  | 'family.adultWhyNone'
  | 'family.joinMove'
  | 'family.joinNew'
  | 'family.leaveNote'
  | 'family.outMoved'
  | 'family.outCreated'
  | 'family.outAlready';

/**
 * The heading over the signed-in adult's own card.
 *
 * "Your learning" rather than their name: the heading is about the
 * *relationship* — this is where you learn, in this family, not a child's
 * card with an adult's name on it. Somebody who learns here and has a name on
 * their profile gets the sentence with a place for it (`{name}`).
 */
export function adultCardHeadingKey(state: AdultFamilyState, named = false): FamilyAdultKey {
  switch (state) {
    case 'in-family':
      return named ? 'family.adultHeadInNamed' : 'family.adultHeadIn';
    case 'alone':
      return 'family.adultHeadAlone';
    case 'other-family':
      return 'family.adultHeadOther';
    default:
      return 'family.adultHeadNone';
  }
}

/**
 * One sentence of explanation, and it always says what happens to what exists
 * already. That is the question an adult with progress has: does joining cost
 * me the courses I am part way through?
 *
 * The sentences say "this family" rather than the family's name. The name is
 * the heading directly above the card, and a name put inside a sentence has
 * to be declined in most of the languages this is written in.
 */
export function adultCardExplanationKey(state: AdultFamilyState): FamilyAdultKey {
  switch (state) {
    case 'in-family':
      return 'family.adultWhyIn';
    case 'alone':
      return 'family.adultWhyAlone';
    case 'other-family':
      return 'family.adultWhyOther';
    default:
      return 'family.adultWhyNone';
  }
}

export function joinButtonKey(state: AdultFamilyState): FamilyAdultKey {
  return state === 'alone' ? 'family.joinMove' : 'family.joinNew';
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
export const LEAVE_NOTE_KEY: FamilyAdultKey = 'family.leaveNote';

/**
 * The result line after an attempt, in the words of somebody who did it rather
 * than of the API that answered.
 *
 * `joined` is true when an existing profile was moved in, which is worth saying
 * because the alternative — a second profile — is what people fear.
 */
export type JoinOutcome = 'moved' | 'created' | 'already';

export function joinOutcomeOf(result: { created: boolean; joined: boolean }): JoinOutcome {
  if (result.joined) return 'moved';
  if (result.created) return 'created';
  return 'already';
}

export function joinOutcomeKey(result: { created: boolean; joined: boolean }): FamilyAdultKey {
  const outcome = joinOutcomeOf(result);
  return outcome === 'moved' ? 'family.outMoved'
    : outcome === 'created' ? 'family.outCreated'
    : 'family.outAlready';
}
