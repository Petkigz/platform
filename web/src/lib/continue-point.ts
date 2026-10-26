/**
 * Where a learner should carry on from.
 *
 * The course page showed a percentage and a list. It never answered the
 * question a learner actually arrives with — *where was I?* — so the answer was
 * "scroll the list and look for the one without a tick", on a phone, for a
 * course of forty lessons.
 *
 * The rule is deliberately not "the last lesson you touched". A learner who
 * watched the end of lesson three and marked it complete last night has
 * "touched" lesson three, and pointing them back at it is a button that does
 * nothing. Carrying on means *unfinished* work, and the order of preference is:
 *
 *   1. the lesson they were last inside that is **not finished** — that is a
 *      resume, whether they stopped two minutes in or two minutes from the end;
 *   2. otherwise the **first unfinished lesson in the course's reading order** —
 *      they finished what they were doing and the next thing is next;
 *   3. otherwise nothing: every lesson they can see is done, and a "carry on"
 *      button on a finished course is a lie.
 *
 * `skipped` counts as finished for this purpose. It was a decision, not a
 * place — the database already refuses to turn a skipped lesson into
 * `in_progress` behind the learner's back — so pointing someone at a lesson
 * they deliberately passed over would be the product arguing with them.
 *
 * The position is measured against the outline, so a lesson whose progress row
 * exists but which is no longer in this version's outline (a re-pinned course, a
 * stale row) is ignored rather than offered.
 */

export type ContinueCandidate = {
  id: string;
  title: string;
  sectionTitle: string;
};

export type ContinueRow = {
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  /** ISO timestamp; the last time anything was written about this lesson. */
  last_seen_at?: string | null;
};

export type ContinuePoint<T extends ContinueCandidate = ContinueCandidate> = {
  lesson: T;
  /** One-based, in the course's reading order. */
  index: number;
  total: number;
  reason: 'resume' | 'next';
} | null;

const FINISHED = new Set(['completed', 'skipped']);

/**
 * The lesson to carry on with, or null when there is nothing left to do.
 *
 * `rows` is in no particular order — the caller gets them from a `select` and
 * the database's row order is not a fact about anything — so the resume branch
 * sorts by `last_seen_at` itself, with the lesson id as a tie-break so two rows
 * written in the same millisecond still produce the same answer twice.
 */
export function continuePoint<T extends ContinueCandidate>(
  steps: readonly T[],
  rows: readonly ContinueRow[],
): ContinuePoint<T> {
  if (steps.length === 0) return null;

  const byLesson = new Map(rows.map((row) => [row.lesson_id, row]));
  const indexOf = new Map(steps.map((step, i) => [step.id, i]));

  // 1. Resume: the most recently touched lesson that is not finished.
  const unfinished = rows
    .filter((row) => !FINISHED.has(row.status) && indexOf.has(row.lesson_id))
    .sort((a, b) => {
      const at = a.last_seen_at ?? '';
      const bt = b.last_seen_at ?? '';
      if (at !== bt) return at < bt ? 1 : -1;
      return a.lesson_id < b.lesson_id ? -1 : 1;
    });

  const resumed = unfinished[0];
  if (resumed) {
    const at = indexOf.get(resumed.lesson_id);
    const lesson = steps[at!];
    if (lesson) {
      return { lesson, index: at! + 1, total: steps.length, reason: 'resume' };
    }
  }

  // 2. Next: the first lesson in reading order that is not finished.
  for (let i = 0; i < steps.length; i += 1) {
    const row = byLesson.get(steps[i]!.id);
    if (!row || !FINISHED.has(row.status)) {
      return { lesson: steps[i]!, index: i + 1, total: steps.length, reason: 'next' };
    }
  }

  // 3. Nothing left.
  return null;
}

/**
 * What to call the button, given where the learner is.
 *
 * Three states, and the words matter because they are the difference between
 * greeting a stranger and interrupting a regular. A learner who has never
 * opened the course is *starting*, not carrying on; a learner in the middle of
 * lesson three is carrying on; a learner who finished lesson three and has not
 * opened four is being offered what is next. All three point at a lesson and a
 * position, and none of them should read as if the product assumed the others.
 */
export function carryOnHeading(
  point: NonNullable<ContinuePoint>,
  hasProgress: boolean,
): { eyebrow: string; action: string } {
  if (point.reason === 'resume') {
    return { eyebrow: 'Carry on where you stopped', action: `Continue lesson ${point.index}` };
  }

  if (!hasProgress && point.index === 1) {
    return { eyebrow: 'Start the course', action: 'Open lesson 1' };
  }

  return { eyebrow: 'Next up', action: `Open lesson ${point.index}` };
}
