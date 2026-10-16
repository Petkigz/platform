import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchSummary } from '@/lib/progress';
import { isFlagEnabled } from '@/lib/flags';

export const dynamic = 'force-dynamic';

// PostgREST returns a nested relation as an array even when it is a to-one
// join, so both are typed as arrays.
type Enrolment = {
  id: string;
  status: string;
  enrolled_at: string;
  courses: { title: string; slug: string }[] | null;
  course_versions: { version_number: number; language: string }[] | null;
};

const courseTitle = (e: Enrolment): string =>
  e.courses?.[0]?.title ?? 'Untitled course';
const versionNumber = (e: Enrolment): string =>
  e.course_versions?.[0] ? `v${e.course_versions[0].version_number}` : 'v?';
const language = (e: Enrolment): string => e.course_versions?.[0]?.language ?? '?';

const STATUS_LABEL: Record<string, string> = {
  active: 'In progress',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
  suspended: 'Suspended',
  expired: 'Expired',
};

/**
 * The learner dashboard.
 *
 * A Server Component using the request-scoped client, so the enrolment query
 * runs under the signed-in user's JWT. There is no `where learner = me` filter
 * and there must not be one: row level security decides what comes back. If
 * the policies were wrong, this page would leak other people's enrolments
 * rather than fail.
 *
 * `supabase/tests/app.test.mjs` pins that contract against a real engine.
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
    .select(
      'id, status, enrolled_at, courses ( title, slug ), course_versions ( version_number, language )',
    )
    .eq('deleted_at', null)
    .order('enrolled_at', { ascending: false });

  const rows = (enrolments ?? []) as Enrolment[];

  // Progress per enrolment. Fetched in parallel: each call is an independent
  // RPC and there is no reason to serialise them.
  const summaries = await Promise.all(
    rows.map(async (r) => {
      try {
        return await fetchSummary(supabase, r.id);
      } catch {
        return { lessonsTotal: 0, lessonsDone: 0, percentComplete: 0 };
      }
    }),
  );

  const progressOn = await isFlagEnabled(supabase, 'learning.progress').catch(() => false);

  return (
    <div className="container section">
      <p className="eyebrow">My learning</p>
      <h1>
        {profiles?.display_name
          ? `Assalamu alaikum, ${profiles.display_name}`
          : 'Your courses'}
      </h1>
      <p className="muted">
        Signed in as {user.email ?? user.phone ?? 'unknown'}.{' '}
        <form action="/sign-out" method="post" style={{ display: 'inline' }}>
          <button
            type="submit"
            className="btn ghost"
            style={{ width: 'auto', margin: 0, padding: '0 0.25rem', fontSize: 'inherit' }}
          >
            Sign out
          </button>
        </form>
      </p>

      {error && (
        <div className="notice error">
          <strong>Could not load enrolments.</strong> {error.message}
        </div>
      )}
      {profileError && (
        <div className="notice warn">
          <strong>Could not load your profile.</strong> {profileError.message}
        </div>
      )}

      {rows.length === 0 && !error ? (
        <div className="card">
          <p className="empty">No enrolments yet.</p>
          <Link href="/catalogue" className="btn">Browse the catalogue</Link>
        </div>
      ) : (
        <div className="grid cols-2">
          {rows.map((r, i) => {
            const s = summaries[i]!;
            return (
              <div className="card" key={r.id}>
                <Link href={`/learn/${r.id}`} className="course" style={{ display: 'block' }}>
                  <span className="title">{courseTitle(r)}</span>
                </Link>

                <div className="badges" style={{ margin: '0.5rem 0 0.75rem' }}>
                  <span className="badge">{STATUS_LABEL[r.status] ?? r.status}</span>
                  <span className="badge neutral">{versionNumber(r)}</span>
                  <span className="badge neutral">{language(r).toUpperCase()}</span>
                </div>

                {progressOn && (
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={Math.round(s.percentComplete)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${courseTitle(r)} progress`}
                >
                  <span style={{ width: `${Math.min(100, Math.max(0, s.percentComplete))}%` }} />
                </div>
                )}

                <div className="meta" style={{ marginTop: '0.5rem' }}>
                  {progressOn
                    ? `${s.lessonsDone} of ${s.lessonsTotal} lessons · ${Math.round(s.percentComplete)}%`
                    : `${s.lessonsTotal} lessons`}
                </div>

                <Link href={`/learn/${r.id}`} className="btn secondary" style={{ marginTop: '1rem' }}>
                  {s.lessonsDone === 0 ? 'Start course' : 'Continue'}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/catalogue">Browse the catalogue</Link>
      </p>
    </div>
  );
}
