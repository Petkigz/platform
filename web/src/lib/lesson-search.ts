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
  matchedIn: 'title' | 'description';
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

/** One piece of a snippet: text, or text that matched. */
export type SnippetPart = { text: string; mark: boolean };

/**
 * `<mark>…</mark>` split into parts.
 *
 * Only the two tags the function itself emits are recognised. Any other angle
 * bracket stays as text, which is the safe direction to be wrong in: a title
 * containing `<b>` renders the characters rather than bold.
 */
export function snippetParts(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  const pattern = /<mark>([\s\S]*?)<\/mark>/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(snippet)) !== null) {
    if (match.index > last) {
      parts.push({ text: snippet.slice(last, match.index), mark: false });
    }
    parts.push({ text: match[1] ?? '', mark: true });
    last = match.index + match[0].length;
  }

  if (last < snippet.length) parts.push({ text: snippet.slice(last), mark: false });

  // Empty pieces are noise in a keyed list and can only come from an empty tag.
  return parts.filter((part) => part.text !== '');
}

/**
 * Where the match was, said in the reader's terms.
 *
 * "In the title" is a fact they can verify by looking. "Matched" is not, and
 * "content" would be a category the platform does not have — a lesson has a
 * title and an introduction, not a body.
 */
export function matchLabel(matchedIn: 'title' | 'description'): string {
  return matchedIn === 'title' ? 'In the lesson title' : 'In the lesson introduction';
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
export function emptyShelfMessage(input: {
  page: number;
  query: string | null;
  lessonHits: number;
}): string {
  if (input.page > 1) {
    return 'There is nothing on this page. It may be past the end of the shelf.';
  }
  if (input.query && input.query.trim().length > 0) {
    if (input.lessonHits > 0) {
      return `No course matched “${input.query.trim()}”, but the lessons below did.`;
    }
    return `Nothing matched “${input.query.trim()}”. Try a subject, a teacher’s name, or a word from a lesson.`;
  }
  return 'No courses yet. Once a teacher publishes one it will appear here — nothing is shown until it has passed review.';
}

/** How many lesson results to ask for. One screenful, and the same every time. */
export const LESSON_RESULT_LIMIT = 12;
