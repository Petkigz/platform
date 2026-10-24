import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  parseShelf,
  shelfAudience,
  shelfSummary,
  statusLabel,
  type Shelf,
  type ShelfRow,
} from '@/lib/course-shelf';
import { AudienceForm } from './audience-form';

export const metadata = { title: 'Courses' };
export const dynamic = 'force-dynamic';

function when(value: string | null): string {
  if (!value) return 'never';
  return new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC', dateStyle: 'medium' });
}

/**
 * Every course — the shelf the doors are decided from.
 *
 * U72 let a course say who it is for and gave the author a picker on their own
 * course page. The database also admits the platform admin and a governance
 * admin, which is the safety hatch for the case that matters: a course is
 * behind the wrong door, its author is unreachable, and there is no screen that
 * shows the problem.
 *
 * So this is that screen. It lists every course — retired ones included,
 * because a retired course still claiming the wrong audience is exactly what
 * nobody finds by browsing the catalogue — and it changes the audience inline.
 *
 * **What it counts, and what it refuses to.** Learners are a number: how many
 * live enrolments the course holds, so the reader can tell a course somebody is
 * studying from one nobody opened. It is never a list, and there is no money
 * here at all — earnings are per currency and live on their own screens.
 */
export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; audience?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/courses');

  const [{ data: platformRole }, { data: governanceRole }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platformRole !== true && governanceRole !== true) redirect('/admin');

  const { q, audience } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';
  const chosen = audience === 'child' || audience === 'adult' || audience === 'both'
    ? audience
    : null;

  const { data, error } = await supabase.rpc('course_shelf', {
    p_search: query.length > 0 ? query : null,
    p_audience: chosen,
    p_limit: 100,
  });
  if (error) throw new Error(error.message);

  const shelf: Shelf = parseShelf(data);

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Courses</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Who it is for</p>
        <h1>Every course</h1>
        <p className="muted">
          Which door each course stands behind, and how many learners it holds.
          Changing one here is recorded against your name with both sides of the
          change.
        </p>
      </div>

      <form method="get" className="row" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
        <label className="eyebrow" htmlFor="q" style={{ alignSelf: 'center' }}>
          Find
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="A title, an address, or a teacher"
          autoComplete="off"
          style={{ flex: '1 1 14rem' }}
        />
        <select name="audience" defaultValue={chosen ?? 'all'} aria-label="Audience">
          <option value="all">Every audience</option>
          <option value="child">Young learners</option>
          <option value="adult">Adults</option>
          <option value="both">Both</option>
        </select>
        <button type="submit" className="btn secondary">
          Search
        </button>
        {(query || chosen) && (
          <Link className="btn ghost" href="/admin/courses">
            Clear
          </Link>
        )}
      </form>

      <p className="muted">{shelfSummary(shelf)}</p>

      <div className="notice">
        A course with <strong>no band ticked</strong> suits every age its audience
        allows — that is what every course meant before this question was asked.
        Retired courses stay on this list, because one of them behind the wrong
        door is the case this page exists for.
      </div>

      {shelf.rows.length === 0 ? (
        <p className="empty">
          {query || chosen
            ? 'No course matches that filter.'
            : 'No course has been created yet.'}
        </p>
      ) : (
        <div className="stack">
          {shelf.rows.map((course: ShelfRow) => (
            <article className="card" key={course.courseId}>
              <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <Link href={`/courses/${course.slug}`}>
                    <strong>{course.title}</strong>
                  </Link>
                  <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.9rem' }}>
                    {course.author} · /{course.slug} · created {when(course.createdAt)}
                  </p>
                </div>
                <span className={`badge${course.status === 'active' ? '' : ' neutral'}`}>
                  {statusLabel(course.status)}
                </span>
              </div>

              <dl className="facts" style={{ marginTop: '0.6rem' }}>
                <div>
                  <dt>Who it is for</dt>
                  <dd>{shelfAudience(course)}</dd>
                </div>
                <div>
                  <dt>Published versions</dt>
                  <dd>
                    {course.publishedVersions === 0
                      ? 'none yet'
                      : `${course.publishedVersions} · last ${when(course.lastPublishedAt)}`}
                  </dd>
                </div>
                <div>
                  <dt>Learners</dt>
                  <dd>{course.learners}</dd>
                </div>
              </dl>

              <details style={{ marginTop: '0.6rem' }}>
                <summary className="muted" style={{ cursor: 'pointer' }}>
                  Change who this is for
                </summary>
                <div style={{ marginTop: '0.6rem' }}>
                  <AudienceForm
                    courseId={course.courseId}
                    audience={course.audience}
                    ageBands={course.ageBands}
                    label="audience"
                  />
                </div>
              </details>
            </article>
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        What a course contains is the author&rsquo;s work and lives on{' '}
        <Link href="/admin/reviews">review</Link>. Changing who teaches is on{' '}
        <Link href="/admin/roles">roles</Link>.
      </p>
    </div>
  );
}
