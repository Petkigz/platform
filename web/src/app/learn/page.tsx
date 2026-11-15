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
import { loadLearnerDashboardExtras } from '@/lib/learner-dashboard-work';

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

  // Authentication precedes every read. Independent requests use this same
  // request-scoped client, preserving RLS and avoiding shared user caches.
  const [
    profileResult, enrolmentResult, learnerResult, savedResult,
    liveOn, streaksOn, progressOn, hifzOn, counterOn, hijriOn, prayerTimesOn,
  ] = await Promise.all([
    supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
    supabase.from('course_enrolments')
      .select(
        'id, status, enrolled_at, learner_profile_id, course_version_id, ' +
          'learner_profiles ( display_name, learner_type ), ' +
          'courses ( title, slug ), course_versions ( version_number, language )',
      )
      .eq('deleted_at', null)
      .order('enrolled_at', { ascending: false }),
    supabase.from('learner_profiles').select('id').eq('linked_user_id', user.id)
      .is('deleted_at', null).maybeSingle(),
    supabase.from('course_wishlist').select('id', { count: 'exact', head: true }),
    isFlagEnabled(supabase, 'delivery.live_classes').catch(() => false),
    isFlagEnabled(supabase, 'learning.streaks').catch(() => false),
    isFlagEnabled(supabase, 'learning.progress').catch(() => false),
    isFlagEnabled(supabase, 'learning.hifz').catch(() => false),
    isFlagEnabled(supabase, 'companion.dhikr_counter').catch(() => false),
    isFlagEnabled(supabase, 'companion.hijri_date').catch(() => false),
    isFlagEnabled(supabase, 'companion.calculated_prayer_times').catch(() => false),
  ]);

  const { data: profiles, error: profileError } = profileResult;
  const { data: enrolments, error } = enrolmentResult;
  // The string-built select cannot be inferred precisely by PostgREST types.
  const rows = (enrolments ?? []) as unknown as Enrolment[];
  const myProfileId = ((learnerResult.data as unknown as { id: string } | null)?.id) ?? null;
  const savedCount = savedResult.count ?? 0;
  const distinctLearners = new Set(rows.map((r) => learnerName(r, myProfileId)));
  const showLearner = distinctLearners.size > 1;

  // Summaries, gated extras and carry-on are independent once the initial reads
  // are complete. Failed summaries retain their existing fallback; optional
  // features are never queried when their flag or prerequisite is absent.
  const { summaries, liveSessions, engagement, lead } = await loadLearnerDashboardExtras({
    rows, myProfileId, liveOn, streaksOn, progressOn,
    summary: (row) => fetchSummary(supabase, row.id),
    summaryFallback: () => ({ lessonsTotal: 0, lessonsDone: 0, percentComplete: 0 }),
    live: async () => (((await supabase.rpc('my_live_sessions', { p_course_id: null })).data ?? []) as unknown as LiveSession[]),
    engagement: (id) => fetchEngagement(supabase, id),
    lead: (enrolments) => fetchCarryOn(supabase, enrolments),
  });

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
        <Link href="/downloads">On this device</Link>
        {' · '}
        {/* Unconditional, like the saved list: a question asked while the assistant
            was on leaves a record, and the page that explains it should not vanish
            when the flag is turned off. */}
        <Link href="/learn/ask">Ask about a lesson</Link>
        {' · '}
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
          {/* The strip is the summary; the record is where a learner goes to see
              the calendar, the badges they have not earned yet, and when each
              one was. Only offered when the feature is on, which is exactly when
              `engagement` exists. */}
          <p style={{ margin: '0.75rem 0 0' }}>
            <Link href="/progress">Your whole record</Link>
          </p>
        </section>
      )}

      {hifzOn && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Memorisation</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            The passages you are learning by heart, and the date each one comes back to you. It
            is a list of dates, not an assessment.
          </p>
          <p style={{ margin: 0 }}>
            <Link href="/hifz">Open your memorisation list</Link>
          </p>
        </section>
      )}

      {prayerTimesOn && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Calculated prayer times</h2>
          <p className="muted">Estimate times on your device and check them with your local community.</p>
          <Link href="/companion/prayer-times">Open prayer times</Link>
        </section>
      )}

      {hijriOn && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Calculated Hijri date</h2>
          <p className="muted">See a labelled Umm al-Qura civil date; local announcements may differ.</p>
          <Link href="/companion/hijri">Open the date display</Link>
        </section>
      )}

      {counterOn && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Private counter</h2>
          <p className="muted">Keep a count on this page without saving it to your account.</p>
          <Link href="/companion/counter">Open the counter</Link>
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
