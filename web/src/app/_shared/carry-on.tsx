import Link from 'next/link';

import type { ContinuePoint } from '@/lib/continue-point';

/**
 * "Carry on where you stopped", on the course page.
 *
 * The first thing a returning learner needs and the last thing this page used
 * to offer: it showed a percentage and a list, and left the reader to work out
 * which lesson had no tick. The rule that picks the lesson — unfinished work
 * first, then the next in reading order, then nothing — is `continue-point.ts`,
 * where it is tested; this renders the answer.
 *
 * The title is a link and so is the button, pointing at the same lesson. That
 * is deliberate rather than careless: a card whose only affordance is a button
 * makes the title feel like a label, and on a phone the title is the larger
 * target.
 */
export function CarryOn({
  enrolmentId,
  point,
  copy,
}: {
  enrolmentId: string;
  point: NonNullable<ContinuePoint>;
  copy: { eyebrow: string; action: string };
}) {
  const href = `/learn/${enrolmentId}/lesson/${point.lesson.id}`;

  return (
    <div className="card carry-on">
      <div className="carry-on-body">
        <p className="eyebrow">{copy.eyebrow}</p>
        <p className="carry-on-title">
          <Link href={href}>{point.lesson.title}</Link>
        </p>
        <p className="muted carry-on-meta">
          Lesson {point.index} of {point.total}
          {point.lesson.sectionTitle ? ` · ${point.lesson.sectionTitle}` : ''}
        </p>
      </div>
      <Link className="btn carry-on-action" href={href}>
        {copy.action}
      </Link>
    </div>
  );
}
