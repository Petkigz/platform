import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { directorySummary, parseDirectory, DirectoryError } from '@/lib/directory';

export const metadata = { title: 'Teachers' };
export const dynamic = 'force-dynamic';

function when(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC', dateStyle: 'medium' });
}

/**
 * Teachers — screen 37, which has never had a page.
 *
 * Teaching is by appointment: `instructor` is granted by the owner or by staff,
 * never by signing up. This is the roster of those appointments, and until now
 * the only record of them was a row in `user_role_assignments` that nobody
 * outside the repository could read.
 *
 * It counts what a teacher has published and how many learners their courses
 * hold. It holds no money: earnings have their own screen, per currency, and a
 * roster with an amount column would invite two currencies into one figure.
 *
 * The learner count is a **number, never a list**. Who is enrolled is the
 * teacher's own cohort screen, behind its own flag; the owner asking "is this
 * course being taken" does not need the names.
 *
 * Owner or governance only — support finding an account is a different question
 * and lives on `/admin/users`.
 */
export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/teachers');

  const [{ data: platformRole }, { data: governanceRole }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platformRole !== true && governanceRole !== true) redirect('/admin');

  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';

  const { data, error } = await supabase.rpc('staff_directory', {
    p_kind: 'teachers',
    p_search: query.length > 0 ? query : null,
    p_limit: 100,
  });
  if (error) throw new Error(error.message);

  let teachers;
  try {
    const parsed = parseDirectory(data);
    if (parsed.kind !== 'teachers') throw new DirectoryError('the console loaded the wrong list');
    teachers = parsed;
  } catch (e) {
    if (e instanceof DirectoryError) throw new Error(e.message);
    throw e;
  }

  return (
    <main className="page">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Teachers</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Directory</p>
        <h1>Teachers</h1>
        <p className="muted">
          Everyone who may teach here, and what each of them has published.
          Teaching is by appointment — nobody becomes a teacher by signing up.
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
          placeholder="A name, or an email address"
          autoComplete="off"
          style={{ flex: '1 1 18rem' }}
        />
        <button type="submit" className="btn secondary">
          Search
        </button>
        {query && (
          <Link className="btn ghost" href="/admin/teachers">
            Clear
          </Link>
        )}
      </form>

      <p className="muted">{directorySummary(teachers, 'teacher')}</p>

      <div className="notice">
        A course counts as published once one of its versions is, and is counted
        once however many versions it has. Learners are distinct people across
        everything the teacher has written — a number, never a list.
      </div>

      {teachers.rows.length === 0 ? (
        <p className="empty">
          {query
            ? `No teacher matches “${query}”.`
            : 'Nobody holds the teacher role yet. Appoint one on Roles, with a written reason, and they will appear here.'}
        </p>
      ) : (
        <div className="stack">
          {teachers.rows.map((teacher) => (
            <article className="card" key={teacher.userId}>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <div>
                  <strong>{teacher.name}</strong>
                  <p className="meta">
                    {teacher.headline ?? 'no headline on their public page'}
                  </p>
                  <p className="meta">
                    {teacher.email ?? 'no email on file'} · appointed{' '}
                    {when(teacher.joinedAt)}
                  </p>
                </div>
                <span className="badge neutral">
                  {teacher.profileStatus === 'published'
                    ? 'public page live'
                    : teacher.profileStatus === 'draft'
                      ? 'public page draft'
                      : 'no public page'}
                </span>
              </div>

              <dl className="facts" style={{ marginTop: '0.6rem' }}>
                <div>
                  <dt>Published</dt>
                  <dd>
                    {teacher.publishedCourses} of {teacher.courses}
                  </dd>
                </div>
                <div>
                  <dt>Learners</dt>
                  <dd>{teacher.learners}</dd>
                </div>
              </dl>

              {teacher.slug && teacher.profileStatus === 'published' && (
                <p className="meta">
                  <Link href={`/teachers/${teacher.slug}`}>Their public page</Link>
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        Appointing or removing a teacher is on <Link href="/admin/roles">Roles</Link>,
        with a written reason. What they have earned is on{' '}
        <Link href="/admin/payouts">payouts</Link>, per currency — never here.
      </p>
    </main>
  );
}
