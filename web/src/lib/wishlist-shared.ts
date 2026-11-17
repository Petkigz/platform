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
