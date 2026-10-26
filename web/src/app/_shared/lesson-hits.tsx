import Link from 'next/link';

import {
  lessonDestination,
  lessonResultsLede,
  matchLabel,
  snippetParts,
  type LessonHit,
} from '@/lib/lesson-search';

/**
 * Lessons that matched, under the courses that matched.
 *
 * The snippet comes from the database with `<mark>` around the match, and it is
 * rendered through `snippetParts()` as elements — never as HTML. A lesson title
 * is author-supplied text, and this is the one place on the catalogue where a
 * teacher's words are echoed back into the page as marked-up content.
 *
 * Each result links to the lesson's own place inside its course, not to a bare
 * lesson page: a lesson has no meaning outside the course it is part of, and the
 * course is what holds the entitlement.
 */
export function LessonHits({
  hits,
  courseCount,
}: {
  hits: LessonHit[];
  /** How many courses the shelf matched, which changes the sentence above. */
  courseCount: number;
}) {
  if (hits.length === 0) return null;

  return (
    <section className="section" aria-labelledby="lesson-hits">
      <h2 id="lesson-hits" style={{ marginBottom: '0.35rem' }}>Inside lessons</h2>
      <p className="muted" style={{ marginTop: 0 }}>{lessonResultsLede(hits.length, courseCount)}</p>

      <ul className="lesson-hits">
        {hits.map((hit) => (
          <li key={hit.lessonId}>
            <Link className="hit-title" href={lessonDestination(hit)}>
              {hit.lessonTitle}
            </Link>
            <p className="hit-why">
              {snippetParts(hit.snippet).map((part, i) =>
                part.mark ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>,
              )}
            </p>
            <p className="hit-where muted">
              {hit.isPreview ? 'Preview · ' : ''}
              {hit.courseTitle}
              {hit.sectionTitle ? ` · ${hit.sectionTitle}` : ''}
              {' · '}
              {matchLabel(hit.matchedIn)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
