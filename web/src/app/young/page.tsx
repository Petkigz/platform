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
import { AGE_BANDS, bandFits, isAgeBand, type AgeBand } from '@/lib/audience';

export const metadata: Metadata = {
  title: 'Young learners',
  description: 'Courses written to be taught to children, on AyahSpring.',
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
 * The Young Learners door — screen 3.
 *
 * The catalogue has had an audience filter since it was built, which is a
 * *filter*: a parent who does not already know that the platform has two
 * audiences will not reach for it. This is the same shelf with the decision
 * already made, and it is a door rather than a filter because a five-year-old
 * and a forty-year-old should not be looking at the same page alongside one
 * another and working out which half is theirs.
 *
 * **It ships switched off.** `learning.audience_sections` is the switch, and
 * while it is off this route redirects to the catalogue — a page that suddenly
 * appeared for one audience and not the other would be worse than no page.
 *
 * **Children are not accounts.** Nothing here reads a learner, a child or a
 * family; it reads courses. A child does not browse this page with a login of
 * their own — a parent or a teacher does, and the guardian machinery is what
 * stands between an account and a child's learning.
 */
export default async function YoungLearnersPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const on = await isFlagEnabled(supabase, 'learning.audience_sections').catch(() => false);
  if (!on) redirect('/catalogue');

  const bandsOn = await isFlagEnabled(supabase, 'learning.age_bands').catch(() => false);

  const { band } = await searchParams;
  const chosen: AgeBand | null = bandsOn && isAgeBand(band) ? band : null;

  const courses = await fetchCatalogue(supabase, { audience: 'child' });
  const visible = courses.filter(
    (course) => course.audience !== 'adult' && bandFits(course.age_bands, chosen),
  );

  return (
    <div className="container section">
      <p className="eyebrow">Young learners</p>
      <h1>For the children first.</h1>
      <p className="lede">
        Courses written to be taught to children — recitation, the Arabic
        alphabet, the stories they should hear first. Every one of them has
        passed scholarly review before it appears here.
      </p>

      <div className="notice">
        A child does not sign up on their own. A parent or guardian holds the
        account, adds the child as a learner, and decides what opens; a teacher
        may enrol them on their own account. Nothing on this page is a child&rsquo;s
        account, and none of it is a child&rsquo;s data.
      </div>

      {bandsOn && (
        <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap', margin: '1.25rem 0' }}>
          <Link
            className={`badge${chosen === null ? '' : ' neutral'}`}
            href="/young"
            style={{ padding: '0.35rem 0.7rem' }}
          >
            Every age
          </Link>
          {AGE_BANDS.filter((b) => b !== '18+').map((b) => (
            <Link
              key={b}
              className={`badge${chosen === b ? '' : ' neutral'}`}
              href={`/young?band=${encodeURIComponent(b)}`}
              style={{ padding: '0.35rem 0.7rem' }}
            >
              {b}
            </Link>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="empty">
          {chosen
            ? `Nothing is listed for ages ${chosen} yet. Try another age, or the whole catalogue.`
            : 'No courses for young learners have been published yet. Everything here has to pass review first.'}
        </p>
      ) : (
        <div className="grid cols-2" style={{ marginTop: '1rem' }}>
          {visible.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: '2rem' }}>
        Looking for yourself? <Link href="/adults">The adults&rsquo; shelf</Link> is
        next door, and the <Link href="/catalogue">whole catalogue</Link> has both.
      </p>
    </div>
  );
}
