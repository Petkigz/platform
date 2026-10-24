import Link from 'next/link';
import type { TeacherAttribution } from '@/lib/course-teacher';

/**
 * The teacher behind a course, or the reason nobody is named.
 *
 * A course page that names nobody could have been written by a content farm,
 * and this platform's claim is *taught, not just hosted*. But naming a teacher
 * is a disclosure with a settled boundary: a public profile is visible only
 * while `teaching.public_profile` is on, the teacher holds the instructor role
 * and the profile is published. When any of those is untrue the row does not
 * come back, and this component says something true instead of leaving a blank
 * line where a name should be.
 *
 * The unnamed branch is not an apology. It says what is guaranteed — the course
 * was written by an appointed teacher and approved by a reviewer, and an author
 * cannot approve their own work — and it says why the name is missing, which is
 * a privacy choice rather than a lesser course.
 */
export function WhoTeaches({ attribution }: { attribution: TeacherAttribution }) {
  return (
    <section className="card" style={{ marginBottom: '1.75rem' }}>
      {attribution.kind === 'named' ? (
        <>
          <h3 style={{ marginTop: 0, fontSize: '1.15rem' }}>
            {attribution.href ? (
              <Link href={attribution.href}>{attribution.name}</Link>
            ) : (
              attribution.name
            )}
          </h3>
          {attribution.headline && (
            <p className="muted" style={{ marginTop: '-0.35rem' }}>{attribution.headline}</p>
          )}
          {attribution.href && (
            <p style={{ margin: 0, fontSize: '0.93rem' }}>
              {/* First name only: "Everything Amina teaches" reads like a
                  person wrote it, and the full name is already above. */}
              <Link href={attribution.href}>
                Everything {attribution.name.split(' ')[0]} teaches &rarr;
              </Link>
            </p>
          )}
        </>
      ) : (
        <>
          <h3 style={{ marginTop: 0, fontSize: '1.05rem' }}>Written and taught by a teacher</h3>
          <p className="muted" style={{ margin: 0 }}>{attribution.reason}</p>
        </>
      )}
    </section>
  );
}
