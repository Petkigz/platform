/**
 * Where a lesson sits in its course, and what comes next.
 *
 * The lesson page could only offer "Back to course". A learner who finished
 * lesson three of forty had to return to the course page, find the list, and
 * click lesson four — on a phone, on a metered connection, which is the shape
 * of most of this product's use. The one thing a course player must do is
 * continue.
 *
 * The ordering is the whole of the difficulty, and it is why this is a module
 * rather than four lines in the page. A course is sections, and lessons inside
 * sections, each with its own `position`; "the next lesson" is the next lesson
 * in that flat reading order, which is not "the next lesson in this section"
 * and not "the next lesson by id". Two position columns have to be combined,
 * and a tie has to be broken the same way every time or the same course would
 * offer a different next lesson on different requests.
 */

export type OutlineLessonRow = {
  id: string;
  title: string | null;
  position: number;
};

export type OutlineSectionRow = {
  id: string;
  title: string | null;
  position: number;
  lessons?: OutlineLessonRow[] | null;
};

export type OutlineStep = {
  id: string;
  title: string;
  sectionTitle: string;
};

/**
 * The course as one ordered list.
 *
 * Sections by position, then the lessons inside each by position; ties are
 * broken by id so the order is a fact about the data rather than about the
 * order PostgREST happened to return rows in. An untitled lesson keeps its
 * place in the order — dropping it would make "next" skip a real lesson — and
 * is labelled rather than rendered blank.
 */
export function flattenOutline(
  sections: readonly OutlineSectionRow[] | null | undefined,
): OutlineStep[] {
  const ordered = [...(sections ?? [])].sort(
    (a, b) => a.position - b.position || compare(a.id, b.id),
  );

  const steps: OutlineStep[] = [];

  for (const section of ordered) {
    const lessons = [...(section.lessons ?? [])].sort(
      (a, b) => a.position - b.position || compare(a.id, b.id),
    );

    for (const lesson of lessons) {
      const title = (lesson.title ?? '').trim();
      steps.push({
        id: lesson.id,
        title: title.length > 0 ? title : 'Untitled lesson',
        sectionTitle: (section.title ?? '').trim(),
      });
    }
  }

  return steps;
}

/**
 * The step before and after this one.
 *
 * `index` is one-based and `0` when the lesson is not in the list — which can
 * only happen when the outline was read from somewhere other than the version
 * the lesson belongs to, and is reported as "no neighbours" rather than as a
 * neighbour picked from a list that does not contain this lesson.
 */
export function lessonNeighbours(
  steps: readonly OutlineStep[],
  currentId: string,
): { previous: OutlineStep | null; next: OutlineStep | null; index: number; total: number } {
  const at = steps.findIndex((step) => step.id === currentId);

  if (at === -1) {
    return { previous: null, next: null, index: 0, total: steps.length };
  }

  return {
    previous: at > 0 ? (steps[at - 1] ?? null) : null,
    next: at < steps.length - 1 ? (steps[at + 1] ?? null) : null,
    index: at + 1,
    total: steps.length,
  };
}

/** A deterministic, locale-independent comparison. */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
