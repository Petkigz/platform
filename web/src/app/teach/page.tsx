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
