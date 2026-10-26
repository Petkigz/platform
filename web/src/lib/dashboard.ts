/**
 * Which course the dashboard should lead with.
 *
 * `/learn` is described in the screen inventory as "led by continue where you
 * stopped", and it was not: it opened with the greeting, then live classes, then
 * every enrolment as an equal card, and left the reader to work out which one
 * was warm. A learner with six courses and one of them two lessons from the end
 * was shown six identical invitations.
 *
 * The ordering is the whole of this module, and it has to be decided somewhere
 * rather than in a template — because the obvious answer (`enrolled_at`, newest
 * first) is wrong. A learner who enrolled in a course last month and has done
 * nothing with it should not outrank the course they were inside yesterday.
 *
 * **The rule:** the course with the most recent *activity* first — the newest
 * `lesson_progress.last_seen_at` among its lessons — then, for courses that have
 * never been touched, the most recently enrolled. Activity is a fact about the
 * learner; enrolment date is a fact about a purchase.
 *
 * A tie falls back to the enrolment id, so two courses touched in the same
 * millisecond produce the same dashboard twice. Without that the answer depends
 * on the order the rows arrived in, which is the same defect the course page's
 * "carry on" had.
 */

export type RankableEnrolment = {
  id: string;
  /** ISO timestamp of when the enrolment was created. */
  enrolledAt: string;
};

export type ActivityRow = {
  course_enrolment_id: string;
  last_seen_at?: string | null;
};

/**
 * Enrolment ids, warmest first.
 *
 * Every enrolment appears exactly once: a course with twenty progress rows is
 * one course, listed at the position of its newest row.
 */
export function rankEnrolments(
  enrolments: readonly RankableEnrolment[],
  activity: readonly ActivityRow[],
): string[] {
  const newest = new Map<string, string>();

  for (const row of activity) {
    const at = row.last_seen_at;
    if (typeof at !== 'string' || at.length === 0) continue;
    const existing = newest.get(row.course_enrolment_id);
    if (!existing || at > existing) newest.set(row.course_enrolment_id, at);
  }

  return [...enrolments]
    .sort((a, b) => {
      const at = newest.get(a.id);
      const bt = newest.get(b.id);

      // Touched beats untouched, whatever the dates say.
      if (at && !bt) return -1;
      if (bt && !at) return 1;
      if (at && bt && at !== bt) return at < bt ? 1 : -1;

      // Both untouched, or touched at the same instant.
      if (a.enrolledAt !== b.enrolledAt) return a.enrolledAt < b.enrolledAt ? 1 : -1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .map((enrolment) => enrolment.id);
}

/**
 * How many enrolments are worth asking about.
 *
 * The dashboard shows one carry-on card, and the first enrolment is usually the
 * answer. The cap exists for the case where it is not — a learner who finished
 * their most recent course yesterday should be offered the one before it, not a
 * finished course with a "carry on" that leads nowhere — while keeping the page
 * to a fixed, small number of queries whatever the size of somebody's library.
 */
export const CANDIDATES = 3;
