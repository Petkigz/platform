import Link from 'next/link';

import type { OutlineStep } from '@/lib/outline';

/**
 * The two buttons at the foot of a lesson.
 *
 * A learner who has just finished something should not have to go back to a
 * list to find the next one. This is the whole reason the component exists —
 * the ordering it depends on lives in `lib/outline.ts`, where the section and
 * lesson positions are combined and a tie is broken the same way every time.
 *
 * **It names the next lesson rather than saying "Next".** "Next: Wudu in
 * practice" tells a learner what is coming, which is the difference between
 * continuing a course and being pushed through it. The previous button names
 * its lesson too, because a learner who clicked Next by mistake needs to
 * recognise where they were.
 *
 * The counter in the middle is left out of the buttons and out of the reading
 * order of the links: it is context, not an action, so it is plain text with a
 * `tabular-nums` figure.
 */
export function LessonNav({
  enrolmentId,
  previous,
  next,
  index,
  total,
}: {
  enrolmentId: string;
  previous: OutlineStep | null;
  next: OutlineStep | null;
  index: number;
  total: number;
}) {
  const href = (lessonId: string) => `/learn/${enrolmentId}/lesson/${lessonId}`;

  return (
    <nav className="lesson-nav" aria-label="Lesson navigation">
      <div className="lesson-nav-side">
        {previous ? (
          <Link className="btn secondary" href={href(previous.id)}>
            <span className="lesson-nav-dir">&larr;</span>
            <span className="lesson-nav-label">{previous.title}</span>
          </Link>
        ) : (
          <Link className="btn ghost" href={`/learn/${enrolmentId}`}>
            <span className="lesson-nav-dir">&larr;</span>
            <span className="lesson-nav-label">Course contents</span>
          </Link>
        )}
      </div>

      <p className="lesson-nav-at">
        {index > 0 ? `Lesson ${index} of ${total}` : `${total} lessons`}
      </p>

      <div className="lesson-nav-side lesson-nav-right">
        {next ? (
          <Link className="btn" href={href(next.id)}>
            <span className="lesson-nav-label">{next.title}</span>
            <span className="lesson-nav-dir">&rarr;</span>
          </Link>
        ) : (
          <Link className="btn" href={`/learn/${enrolmentId}`}>
            <span className="lesson-nav-label">Back to course</span>
            <span className="lesson-nav-dir">&rarr;</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
