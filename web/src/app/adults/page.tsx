import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  AUDIENCE_LABEL,
  DIFFICULTY_LABEL,
  displayVersion,
  fetchCatalogue,
  languagesFor,
  subjectNames,
  type CatalogueCourse,
} from '@/lib/catalogue';

export const metadata: Metadata = {
  title: 'Adults',
  description: 'Courses written for adults, on AyahSpring.',
};

export const dynamic = 'force-dynamic';

function CourseCard({ course }: { course: CatalogueCourse }) {
  const version = displayVersion(course);
  return (
    <article className="card">
      <Link href={`/courses/${course.slug}`} className="course" style={{ display: 'block' }}>
        <span className="title">{course.title}</span>
      </Link>
      {course.description && (
        <p className="muted" style={{ fontSize: '0.92rem', margin: '0.4rem 0 0' }}>
          {course.description.length > 180
            ? `${course.description.slice(0, 180).trimEnd()}…`
            : course.description}
        </p>
      )}
      <div className="badges" style={{ marginTop: '0.7rem' }}>
        <span className="badge">{AUDIENCE_LABEL[course.audience] ?? course.audience}</span>
        <span className="badge">{DIFFICULTY_LABEL[course.difficulty] ?? course.difficulty}</span>
        {languagesFor(course).map((l) => (
          <span key={l} className="badge neutral">{l.toUpperCase()}</span>
        ))}
        {subjectNames(version).slice(0, 3).map((s) => (
          <span key={s} className="badge neutral">{s}</span>
        ))}
      </div>
    </article>
  );
}

/**
 * The Adults door — screen 4.
 *
 * The pair the inventory called "Young Learners entry" and "Adult Learners
 * entry". They are two pages rather than one page with a switch, because the
 * two audiences arrive with different questions: a parent is choosing for
 * somebody else and has to be told what a child's account is, while an adult is
 * choosing for themselves and wants to see the depth of the shelf rather than a
 * children's catalogue with a filter on it.
 *
 * **No age chips here.** There is one adult band — 18+ — so a row of one chip
 * would be a control that cannot change anything. The young learners' door has
 * four, which is why it has the row and this one does not.
 *
 * **It ships switched off**, behind the same `learning.audience_sections`
 * switch as its sibling, and redirects to the catalogue while it is off. One
 * door without the other would be worse than no doors at all.
 */
export default async function AdultsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const on = await isFlagEnabled(supabase, 'learning.audience_sections').catch(() => false);
  if (!on) redirect('/catalogue');

  const courses = await fetchCatalogue(supabase, { audience: 'adult' });
  const visible = courses.filter((course) => course.audience !== 'child');

  return (
    <div className="container section">
      <p className="eyebrow">Adults</p>
      <h1>Study it properly.</h1>
      <p className="lede">
        Courses written for adults — Arabic grammar, fiqh, tafsir, tajweed at
        depth. Every one of them has passed scholarly review before it appears
        here, and each one you buy is your own: one purchase, one learner.
      </p>

      <div className="notice">
        This is your own account, not a child&rsquo;s. If a child also learns in
        your family, the learner switcher moves between you without mixing the
        two.
      </div>

      {visible.length === 0 ? (
        <p className="empty" style={{ marginTop: '1.5rem' }}>
          No courses for adults have been published yet. Everything here has to
          pass review first.
        </p>
      ) : (
        <div className="grid cols-2" style={{ marginTop: '1.5rem' }}>
          {visible.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: '2rem' }}>
        Choosing for a child? The <Link href="/young">young learners&rsquo; shelf</Link>{' '}
        is next door, and the <Link href="/catalogue">whole catalogue</Link> has both.
      </p>
    </div>
  );
}
