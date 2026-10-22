import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchMyCourses } from '@/lib/authoring';
import { NewCourse } from './new-course';

export const dynamic = 'force-dynamic';

/**
 * The teacher's dashboard: the courses you created.
 *
 * `courses_read` also admits courses you are enrolled in and published ones,
 * so this filters on `created_by` — otherwise "my courses" would quietly
 * include every course you had ever bought.
 */
export default async function TeachPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/teach');

  // Teaching is an appointment (decided 2026-10-22): the database refuses a
  // course insert without the role, and this page says why rather than showing a
  // form that will fail. The owner holds every control and is a teacher besides.
  const [{ data: instructor }, { data: owner }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'instructor' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (instructor !== true && owner !== true) {
    return (
      <div className="container section">
        <p className="eyebrow">Teaching</p>
        <h1>This is the teaching area</h1>
        <p className="notice warn">
          <strong>Teaching here is by appointment.</strong> The platform owner creates a
          teacher account; until then your account is a learner&apos;s, and a learner&apos;s
          account cannot open a course. If you would like to teach, ask the owner to add you.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/learn" className="btn">Go to my learning</Link>
        </p>
      </div>
    );
  }

  const courses = await fetchMyCourses(supabase, user.id);

  return (
    <div className="container section">
      <p className="eyebrow">Teaching</p>
      <h1>My courses</h1>
      <p className="lede">
        You keep the copyright on everything here. Publishing stops nothing
        you have already sold — learners who enrolled keep their access even
        if you retire the course later.
      </p>

      <p>
        <Link href="/teach/promotions">Promotions</Link> — run an offer on your
        own courses, in the countries you choose, with a limit on how many times
        a family may use it.
      </p>

      {courses.length === 0 ? (
        <div className="empty" style={{ marginBottom: '1.5rem' }}>
          You have not created a course yet.
        </div>
      ) : (
        <div className="grid cols-2">
          {courses.map((c) => (
            <div className="card" key={c.id}>
              <h3 style={{ marginTop: 0 }}>{c.title}</h3>
              <div className="badges">
                <span className="badge neutral">{c.status}</span>
                {c.hasPublishedVersion && <span className="badge">Published</span>}
              </div>
              <p className="meta" style={{ marginTop: '0.75rem' }}>
                /{c.slug}
              </p>
              <Link href={`/teach/${c.id}`} className="btn secondary">
                Open curriculum
              </Link>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/teach/paths">Learning paths</Link> — curate a sequence of active courses.
        {' · '}
        <Link href="/teach/profile">Public teacher profile</Link> — introduce yourself and link your social channels.
        {' · '}
        <Link href="/teach/media">Media library</Link> — upload lesson recordings and see which ones are ready to use.
      </p>

      <div style={{ marginTop: '1.75rem' }}>
        <div className="outline-h">
          <h3>Create</h3>
        </div>
        <NewCourse />
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
