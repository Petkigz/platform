import Link from 'next/link';
import { ClaimLearner } from '@/components/claim-learner';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchSummary } from '@/lib/progress';
import { fetchCarryOn } from '@/lib/dashboard-query';
import { CarryOn } from '@/app/_shared/carry-on';
import { fetchEngagement } from '@/lib/engagement';
import { describeReason, describeWhen, type LiveSession } from '@/lib/live';
import { EngagementStrip } from '@/components/engagement-strip';
import { isFlagEnabled } from '@/lib/flags';

export const dynamic = 'force-dynamic';

// PostgREST returns a nested relation as an array even when it is a to-one
// join, so both are typed as arrays.
type Enrolment = {
  id: string;
  status: string;
  enrolled_at: string;
  learner_profile_id: string;
  /** The pinned version — what the carry-on card reads the outline from. */
  course_version_id: string;
  learner_profiles: { display_name: string; learner_type: string }[] | null;
  courses: { title: string; slug: string }[] | null;
  course_versions: { version_number: number; language: string }[] | null;
};

const courseTitle = (e: Enrolment): string =>
  e.courses?.[0]?.title ?? 'Untitled course';

/**
 * Whose enrolment this is.
 *
 * Now that a parent can enrol a child, this list legitimately contains more
 * than one person's courses, and showing them undifferentiated would let a
 * parent open a child's course believing it was their own progress. The label
 * is 'Me' for the signed-in person's own profile.
 */
const learnerName = (e: Enrolment, myProfileId: string | null): string => {
  if (!myProfileId || e.learner_profile_id === myProfileId) return 'Me';
  return e.learner_profiles?.[0]?.display_name ?? 'Someone else';
};
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
      'id, status, enrolled_at, learner_profile_id, course_version_id, ' +
        'learner_profiles ( display_name, learner_type ), ' +
        'courses ( title, slug ), course_versions ( version_number, language )',
    )
    .eq('deleted_at', null)
    .order('enrolled_at', { ascending: false });

  // Cast through unknown: a select built by string concatenation defeats
  // PostgREST's generated types, which then resolve to an error type rather
  // than to the columns actually requested.
  const rows = (enrolments ?? []) as unknown as Enrolment[];

  // Needed to label each row as mine or a child's. A parent's dashboard
  // legitimately holds both now, and mixing them would let a parent open a
  // child's course believing it was their own progress.
  const { data: myProfile } = await supabase
    .from('learner_profiles')
    .select('id')
    .eq('linked_user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  const myProfileId =
    ((myProfile as unknown as { id: string } | null)?.id) ?? null;

  const distinctLearners = new Set(
    rows.map((r) => learnerName(r, myProfileId)),
  );
  const showLearner = distinctLearners.size > 1;

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

  // A streak is a display over progress that already exists, so a failure to read it is
  // silence rather than an error: `fetchEngagement` returns null when the feature is
  // off, when the learner is not the caller's, and when the reply is unreadable.
  // Live classes, if the owner has switched them on. An rpc that fails is
  // silence rather than a broken dashboard: a class list is an addition to
  // learning, not a precondition for it.
  const liveOn = await isFlagEnabled(supabase, 'delivery.live_classes').catch(() => false);
  const liveSessions = liveOn
    ? (((await supabase.rpc('my_live_sessions', { p_course_id: null })).data ??
        []) as unknown as LiveSession[])
    : [];

  const streaksOn = await isFlagEnabled(supabase, 'learning.streaks').catch(() => false);
  const engagement = streaksOn && myProfileId
    ? await fetchEngagement(supabase, myProfileId)
    : null;

  const progressOn = await isFlagEnabled(supabase, 'learning.progress').catch(() => false);

  // What this page is supposed to lead with: where the learner left off.
  //
  // One query for the activity of every enrolment, then at most three outlines
  // for the courses worth offering. Three is `CANDIDATES`: the warmest course is
  // usually the answer, and the cap covers the case where it is not — somebody
  // who finished their newest course yesterday should be offered the one before
  // it rather than a finished course whose "carry on" leads nowhere — without
  // letting a large library turn one card into fifty queries.
  const lead = progressOn && rows.length > 0
    ? await fetchCarryOn(supabase, rows)
    : null;

  // Saved courses live here rather than in the masthead: the nav is already
  // eight links wide on a phone, and this is where someone looks for their own
  // things. The link appears whether or not the flag is on, because a list
  // somebody built while it was on must stay reachable after it is turned off.
  const savedCount = await supabase
    .from('course_wishlist')
    .select('id', { count: 'exact', head: true })
    .then((r) => r.count ?? 0);

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
        <Link href="/account">Account settings</Link>
        {' · '}
        <Link href="/saved">
          Saved courses{savedCount > 0 ? ` (${savedCount})` : ''}
        </Link>{' · '}
        <Link href="/downloads">On this device</Link>{' · '}
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

      {/* The screen is described as "led by continue where you stopped", and it
          was not: the greeting, then live classes, then every enrolment as an
          equal card. This is the card that makes the description true. */}
      {lead && (
        <div style={{ marginTop: '1.25rem' }}>
          <CarryOn enrolmentId={lead.enrolmentId} point={lead.point} copy={lead.copy} />
        </div>
      )}

      {liveSessions.length > 0 && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Live classes</h2>
          <ul className="lessons">
            {liveSessions.slice(0, 6).map((session) => (
              <li key={session.session_id}>
                <span className="t">
                  <Link href={`/live/${session.session_id}`}>{session.title}</Link>
                  <span className="muted">
                    {' · '}
                    {session.course_title}
                    {' · '}
                    {describeWhen(session.starts_at, session.scheduled_zone)}
                    {session.attended ? ' · you were there' : ''}
                  </span>
                  {session.status === 'cancelled' && (
                    <span className="muted"> · cancelled: {session.cancelled_reason}</span>
                  )}
                  {!session.joinable && session.status !== 'cancelled' && (
                    <span className="muted"> · {describeReason(session.reason)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {engagement && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <EngagementStrip engagement={engagement} />
        </section>
      )}

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
          {!myProfileId && (
            <>
              <p className="muted">
                Enrolling needs a learner profile, and this account does not have one yet.
              </p>
              <ClaimLearner note="A course is always for a named learner. This makes you one on this account." />
            </>
          )}
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

                {showLearner && (
                  <span className="badge neutral" style={{ marginBottom: '0.5rem' }}>
                    {learnerName(r, myProfileId)}
                  </span>
                )}

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
