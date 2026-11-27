/**
 * The parts of the saved-courses list a browser needs.
 *
 * **This file imports nothing at run time, and has to stay that way.** The
 * save button and the saved-course card are client components. They used to
 * take these from `wishlist.ts`, which reads enrolments, which translates, which
 * imports every language's catalogue — so the public course page shipped
 * fifty-one catalogues (1.4 MB before compression) to get two numbers.
 * `client-bundle.test.ts` follows the imports and fails if that returns.
 */
import type { SavedCourse } from './wishlist.ts';

export const SAVED_NOTE_MAX = 500;
/** Mirrors the ceiling in `guard_course_wishlist()`. */
export const SAVED_MAX = 100;

/** What the learner can do about a saved course, in one short sentence. */
export function availabilityLabel(c: SavedCourse): string {
  if (c.enrolledAs) return c.enrolledAs === 'you' ? 'You are enrolled' : `Enrolled for ${c.enrolledAs}`;
  if (c.availability === 'retired') return 'No longer offered';
  if (c.availability === 'unpublished') return 'Not published yet';
  return 'Available now';
}

/** The names of what a saved course's badge can say; the page has a sentence for each. */
export type SavedState = 'enrolledYou' | 'enrolledFor' | 'enrolledFamily' | 'retired' | 'unpublished' | 'available';

/**
 * The same decision as `availabilityLabel`, as a name instead of an English
 * sentence, so the saved list can say it in the reader's language.
 */
export function savedStateOf(c: Pick<SavedCourse, 'enrolledWho' | 'availability'>): SavedState {
  if (c.enrolledWho === 'self') return 'enrolledYou';
  if (c.enrolledWho === 'named') return 'enrolledFor';
  if (c.enrolledWho === 'unnamed') return 'enrolledFamily';
  if (c.availability === 'retired') return 'retired';
  if (c.availability === 'unpublished') return 'unpublished';
  return 'available';
}

/** Every sentence one row of the saved list says, handed over by the page. */
export type SavedWords = {
  remove: string;
  noNote: string;
  noteEdit: string;
  noteAdd: string;
  noteLabel: string;
  notePlaceholder: string;
  noteSave: string;
  cancel: string;
  removedDone: string;
  noteSaved: string;
  unsure: string;
  notePaused: string;
  /** The ceiling is already in it. */
  limit: string;
  gone: string;
};

/**
 * What to say when the list's route refused: a four hundred that names a
 * reason this list knows is that reason, and anything else is "could not be
 * confirmed". The route's own English sentence is never printed.
 */
export function savedRefusalOf(status: number, code: unknown): 'limit' | 'gone' | 'notePaused' | 'unsure' {
  if (status < 400 || status > 499) return 'unsure';
  if (code === 'limit' || code === 'gone') return code;
  if (code === 'flag_disabled') return 'notePaused';
  return 'unsure';
}
