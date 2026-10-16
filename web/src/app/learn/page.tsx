import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

// PostgREST returns a nested relation as an array even when it is a to-one
// join, so both are typed as arrays.
type Enrolment = {
  id: string;
  status: string;
  enrolled_at: string;
  courses: { title: string }[] | null;
  course_versions: { version_number: number; language: string }[] | null;
};

const courseTitle = (e: Enrolment): string =>
  e.courses?.[0]?.title ?? 'Untitled course';
const versionNumber = (e: Enrolment): string =>
  e.course_versions?.[0] ? `v${e.course_versions[0].version_number}` : 'v?';
const language = (e: Enrolment): string => e.course_versions?.[0]?.language ?? '?';

/**
 * The first authenticated screen, and the one that proves the point.
 *
 * This is a Server Component using the request-scoped Supabase client, so the
 * query below runs under the signed-in user's JWT. There is no
 * `where learner = me` filter and there must not be one: row level security
 * decides what comes back. If the policies were wrong, this page would leak
 * other people's enrolments rather than fail.
 */
export default async function LearnPage() {
  if (!isSupabaseConfigured()) {
    redirect('/');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/learn');

  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: enrolments, error } = await supabase
    .from('course_enrolments')
    .select('id, status, enrolled_at, courses ( title ), course_versions ( version_number, language )')
    .order('enrolled_at', { ascending: false });

  const rows = (enrolments ?? []) as Enrolment[];

  return (
    <div className="container section">
    <div className="card">
      <h1>My learning</h1>
      <p className="muted">
        Signed in as {profiles?.display_name ?? user.email ?? user.phone ?? 'unknown'}.
      </p>

      {error && (
        <div className="notice">
          <strong>Could not load enrolments.</strong> {error.message}
          <br />
          <span className="muted">
            A missing table or a denied policy shows up here rather than as a blank page.
          </span>
        </div>
      )}

      <div className="notice">
        This list is filtered by row level security, not by a query. There is no
        <code> where learner_profile_id = me </code> anywhere in this page — the
        database decides what you may see.
      </div>

      {rows.length === 0 && !error ? (
        <p className="empty">No enrolments yet.</p>
      ) : (
        rows.map((r) => (
          <div className="course" key={r.id}>
            <div>
              <strong>{courseTitle(r)}</strong>{' '}
              <span className="badge">{versionNumber(r)}</span>{' '}
              <span className="badge">{language(r)}</span>
            </div>
            <div className="meta">
              {r.status} · enrolled {new Date(r.enrolled_at).toLocaleDateString()}
            </div>
          </div>
        ))
      )}

      <form action="/sign-out" method="post">
        <button type="submit" className="secondary">Sign out</button>
      </form>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/catalogue">Browse the catalogue</Link>
      </p>
    </div>
    </div>
  );
}
