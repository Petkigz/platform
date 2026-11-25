/**
 * The parts of a course page that sit behind switches — dated classes, save
 * for later, ratings — as the words they are handed and the names their
 * routes answer by.
 *
 * Until 2026-11-25 the three components carried their own English and
 * printed whatever sentence the route sent, which for a refusal was the
 * database's. They now carry no sentence. The page hands each its words in
 * the reader's language (`course-parts-words.ts`), and a refusal is said by
 * a name this file knows.
 *
 * The rule is the one in `enrol-outcome.ts`: **only a reply in the four
 * hundreds that names a reason this file knows is a refusal.** Anything else
 * — a lost reply, a five hundred, a reason with no name here — is
 * `unconfirmed`, and the sentence for that sends the reader to reload and
 * look, which is right whichever it was.
 *
 * The three routes are also called by pages that are still English (the
 * teacher's class manager, the saved-courses list). They keep reading the
 * sentence; the name travels beside it and they ignore it.
 *
 * Pure, with no query and no catalogue in it, so a browser may import it.
 */

// ── dated classes ──────────────────────────────────────────────────────────

export type ClassRefusal = 'full' | 'closed' | 'not_enrolled' | 'already';

const CLASS_NAMES: readonly ClassRefusal[] = ['full', 'closed', 'not_enrolled', 'already'];

/**
 * The name for what `join_cohort()` refused, from the sentence
 * `mapCohortError` settled on. Only joining and leaving are named: a
 * teacher's refusals ("already has 12 learners") are not a learner's.
 */
export function classCodeOf(message: string): ClassRefusal | null {
  if (/already in the cohort/i.test(message)) return 'already';
  if (/must be enrolled/i.test(message)) return 'not_enrolled';
  if (/stopped accepting joiners|not open to joiners|not accepting joiners|already ended/i.test(message)) {
    return 'closed';
  }
  if (/\bfull\b/i.test(message)) return 'full';
  return null;
}

export function classOutcomeOf(status: number, code: unknown): ClassRefusal | 'unconfirmed' {
  if (status < 400 || status > 499) return 'unconfirmed';
  return typeof code === 'string' && CLASS_NAMES.includes(code as ClassRefusal)
    ? (code as ClassRefusal)
    : 'unconfirmed';
}

/**
 * What the server wrote out for one class: every sentence with a number in
 * it, already said.
 *
 * A browser does not write a number or a date here. Chromium carries less
 * language data than the server does — for Uzbek, Kazakh, Azerbaijani, Tajik,
 * Kyrgyz, Turkmen and Nepali it writes "4.3" where the server wrote "4,3",
 * "12" where the server wrote "१२", and "2026 M11 20" for a day — so a
 * component that formatted for itself would disagree with the page it was
 * sent, and then show the reader the worse of the two.
 */
export type ClassLines = {
  /** "Version 3", or null when the version could not be read. */
  version: string | null;
  /** "3 of 12 places taken", "Place limit: 12" or "No place limit". */
  places: string;
  /** Why there is no button on a full class. */
  full: string;
  /** "You need to be enrolled in version 3 …", or the sentence that names no version. */
  needEnrolSelf: string;
  /** The same for somebody else: `{name}` is still to be filled. */
  needEnrolFor: string;
};

/** The numbers and days of the ratings panel, already written out by the server. */
export type ReviewLines = {
  /** "4.3" as the language writes it. */
  average: string;
  /** "12 ratings". */
  count: string;
  /** Star value → how many gave it, in the language's digits. */
  rows: Record<number, string>;
  /** Review id → the day it was written. */
  days: Record<string, string>;
};

/** Every sentence the list of dated classes says. */
export type ClassWords = {
  title: string;
  body: string;
  paused: string;
  none: string;
  /** `{number}` */
  version: string;
  /** `{date}` */
  starts: string;
  /** `{date}` */
  ends: string;
  noEnd: string;
  /** `{taken}`, `{capacity}` */
  taken: string;
  /** `{count}` */
  limit: string;
  noLimit: string;
  regClosed: string;
  regAtStart: string;
  /** `{date}` */
  regCloses: string;
  badgeFull: string;
  badgeOpen: string;
  who: string;
  /** `{name}` — "Amina (me)" */
  me: string;
  needProfile: string;
  joinedSelf: string;
  /** `{name}` */
  joinedFor: string;
  /** `{count}` */
  full: string;
  joining: string;
  joinSelf: string;
  /** `{name}` */
  joinFor: string;
  stopped: string;
  stoppedRunning: string;
  /** `{number}` */
  needEnrolSelf: string;
  /** `{name}`, `{number}` */
  needEnrolFor: string;
  leave: string;
  leaving: string;
  joinedDone: string;
  leftDone: string;
  unconfirmed: string;
  foot: string;
  /** Already names "My learning" as the navigation does. */
  learning: string;
  refusals: Record<ClassRefusal, string>;
};

// ── save for later ─────────────────────────────────────────────────────────

export type SaveRefusal = 'limit' | 'gone';

const SAVE_NAMES: readonly SaveRefusal[] = ['limit', 'gone'];

/** The name for what the saved list refused, from `mapWishlistError`'s sentence. */
export function saveCodeOf(message: string): SaveRefusal | null {
  if (/remove one first/i.test(message)) return 'limit';
  if (/no longer offered/i.test(message)) return 'gone';
  return null;
}

export function saveOutcomeOf(status: number, code: unknown): SaveRefusal | 'unconfirmed' {
  if (status < 400 || status > 499) return 'unconfirmed';
  return typeof code === 'string' && SAVE_NAMES.includes(code as SaveRefusal)
    ? (code as SaveRefusal)
    : 'unconfirmed';
}

/** Every sentence the save button says. */
export type SaveWords = {
  signIn: string;
  save: string;
  saving: string;
  savedRemove: string;
  noteEdit: string;
  noteAdd: string;
  noteLabel: string;
  notePlaceholder: string;
  noteSave: string;
  cancel: string;
  /** `{note}` — what the reader wrote, as written. */
  yourNote: string;
  noNote: string;
  /** The ceiling is already in it. */
  max: string;
  /** Already names "Saved courses" and "My learning". */
  savedDone: string;
  removedDone: string;
  noteSaved: string;
  unconfirmed: string;
  refusals: Record<SaveRefusal, string>;
};

// ── ratings and reviews ────────────────────────────────────────────────────

export type ReviewRefusal = 'not_enrolled' | 'own_course' | 'too_long';

const REVIEW_NAMES: readonly ReviewRefusal[] = ['not_enrolled', 'own_course', 'too_long'];

/** The name for what `write_course_review()` refused. */
export function reviewCodeOf(message: string): ReviewRefusal | null {
  if (/only review a course you are enrolled in/i.test(message)) return 'not_enrolled';
  if (/cannot review a course you wrote/i.test(message)) return 'own_course';
  if (/keep a review under/i.test(message)) return 'too_long';
  return null;
}

export function reviewOutcomeOf(status: number, code: unknown): ReviewRefusal | 'unconfirmed' {
  if (status < 400 || status > 499) return 'unconfirmed';
  return typeof code === 'string' && REVIEW_NAMES.includes(code as ReviewRefusal)
    ? (code as ReviewRefusal)
    : 'unconfirmed';
}

/** Every sentence the ratings panel says. */
export type ReviewWords = {
  title: string;
  body: string;
  none: string;
  /** "out of 5", the five already in it. */
  outOf: string;
  /** `{count}` */
  countOne: string;
  /** `{count}` */
  countOther: string;
  /**
   * One entry for each star, lowest first: the number in the language's
   * digits, and what a screen reader says for the button ("4 — Good").
   */
  stars: readonly { value: number; digit: string; label: string }[];
  write: string;
  update: string;
  yourRating: string;
  sayMore: string;
  placeholder: string;
  submit: string;
  saving: string;
  remove: string;
  rule: string;
  needEnrol: string;
  signIn: string;
  anon: string;
  mine: string;
  held: string;
  withdrawn: string;
  /** `{reason}` — what a member of staff wrote, as written. */
  withdrawnWhy: string;
  choose: string;
  thanks: string;
  removed: string;
  unconfirmed: string;
  refusals: Record<ReviewRefusal, string>;
};
