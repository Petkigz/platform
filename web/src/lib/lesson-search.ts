/**
 * Searching inside a course, as the screen sees it.
 *
 * `search_lessons()` returns a snippet with `<mark>` tags already in it, produced
 * by `ts_headline`. That is text from a database, and a lesson title is
 * author-supplied, so the snippet is **parsed into parts and rendered as
 * elements** rather than injected as HTML: a teacher who calls a lesson
 * `<img onerror=…>` gets a lesson with that name, not a page that runs it.
 *
 * The rest of this module is the wording — what a result says about where the
 * match was found, and what the catalogue should say when no course matched but
 * a lesson did. Those are the sentences that decide whether a reader understands
 * that they are looking at a second kind of result.
 */

import { isLocaleCode, translator } from './i18n/index.ts';

export type LessonHit = {
  lessonId: string;
  lessonTitle: string;
  sectionTitle: string | null;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  /** A preview opens on its own address, for anybody. */
  isPreview: boolean;
  snippet: string;
  matchedIn: 'title' | 'description' | 'transcript';
  rank: number;
};

/**
 * Where a result goes when it is clicked.
 *
 * A preview lesson has its own page and opens for a visitor who is not enrolled;
 * anything else lives behind its course, so the course page — where the outline,
 * the price and the enrolment button are — is the right destination. Sending a
 * stranger straight at a lesson they cannot open would be a link that ends in a
 * refusal, and sending a visitor who *can* open a preview to the outline would
 * hide the thing they just searched for.
 */
export function lessonDestination(hit: Pick<LessonHit, 'courseSlug' | 'lessonId' | 'isPreview'>): string {
  return hit.isPreview
    ? `/courses/${hit.courseSlug}/preview/${hit.lessonId}`
    : `/courses/${hit.courseSlug}`;
}

// `snippetParts` lives in `snippet.ts`, which imports nothing, so the client
// components that draw a snippet do not bring the catalogues with them.
export { snippetParts, type SnippetPart } from './snippet.ts';

/**
 * Where the match was, said in the reader's terms.
 *
 * "In the title" is a fact they can verify by looking. "Matched" is not, and
 * A transcript is labeled separately from a title or introduction.
 */
export function matchLabel(matchedIn: 'title' | 'description' | 'transcript'): string {
  return matchedIn === 'title' ? 'In the lesson title' : matchedIn === 'transcript' ? 'In the lesson transcript' : 'In the lesson introduction';
}

/**
 * The line above the lesson results.
 *
 * It says two things the reader needs: these are lessons rather than courses,
 * and a lesson opens inside its course rather than on its own.
 */
export function lessonResultsLede(count: number, courseCount: number): string {
  const lessons = `${count} ${count === 1 ? 'lesson' : 'lessons'}`;
  if (courseCount === 0) {
    return `No course matched, but ${lessons} did. Each one opens inside its course.`;
  }
  return `Also ${lessons} inside ${courseCount === 1 ? 'a course' : 'courses'} on this shelf.`;
}

/**
 * What the catalogue says when the shelf is empty.
 *
 * Three different nothings, and they were already collapsed into one sentence
 * before lessons existed: past the end of the shelf, a search that matched
 * nothing anywhere, and a catalogue with nothing on it yet. A fourth is now
 * possible — no course matched, but lessons inside courses did — and saying
 * "nothing matched" beside a list of matches would be the page contradicting
 * itself.
 */
export function emptyShelfMessage(
  input: {
    page: number;
    query: string | null;
    lessonHits: number;
  },
  code: string = 'en',
): string {
  const locale = (isLocaleCode(code) ? code : 'en') as Parameters<typeof translator>[0];
  const t = translator(locale);

  if (input.page > 1) return t('catalogue.emptyPage');

  const query = input.query?.trim() ?? '';
  if (query.length > 0) {
    // The reader's own search words are quoted back exactly as typed — never
    // translated, never re-cased — because they are what the platform searched
    // for, and a "corrected" query is a query nobody can see.
    return input.lessonHits > 0
      ? t('catalogue.emptyQueryLessons', { query })
      : t('catalogue.emptyQuery', { query });
  }
  return t('catalogue.emptyShelf');
}

/** How many lesson results to ask for. One screenful, and the same every time. */
export const LESSON_RESULT_LIMIT = 12;
