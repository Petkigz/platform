import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { ClaimLearner } from '@/components/claim-learner';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchSummary } from '@/lib/progress';
import { fetchCarryOn } from '@/lib/dashboard-query';
import { CarryOn } from '@/app/_shared/carry-on';
import { fetchEngagement } from '@/lib/engagement';
import type { LiveSession } from '@/lib/live';
import { liveWords } from '@/lib/live-words';
import { EngagementStrip } from '@/components/engagement-strip';
import { isFlagEnabled } from '@/lib/flags';
import {
  LOCALE_COOKIE,
  chooseLocale,
  countLabel,
  formatNumber,
  languageShownFor,
  translator,
  type Translate,
} from '@/lib/i18n';
import { loadLearnerDashboardExtras } from '@/lib/learner-dashboard-work';
import { one, type Embedded } from '@/lib/embed';

export const dynamic = 'force-dynamic';

// An enrolment has one learner, one course and one version, and PostgREST
// sends each as an object. The client library types them as arrays; one()
// reads either. (Until 2026-11-17 this page indexed [0] into the object and
// every course here would have been "untitled" on a real database.)
type Enrolment = {
  id: string;
  status: string;
  enrolled_at: string;
  learner_profile_id: string;
  /** The pinned version — what the carry-on card reads the outline from. */
  course_version_id: string;
  learner_profiles: Embedded<{ display_name: string; learner_type: string }>;
  courses: Embedded<{ title: string; slug: string }>;
  course_versions: Embedded<{ version_number: number; language: string }>;
};

const courseTitle = (e: Enrolment, t: Translate): string =>
  one(e.courses)?.title ?? t('learn.untitled');

/**
 * Whose enrolment this is.
 *
 * Now that a parent can enrol a child, this list legitimately contains more
 * than one person's courses, and showing them undifferentiated would let a
 * parent open a child's course believing it was their own progress. The label
 * is 'Me' for the signed-in person's own profile.
 */
const learnerName = (e: Enrolment, myProfileId: string | null, t: Translate): string => {
  if (!myProfileId || e.learner_profile_id === myProfileId) return t('learn.me');
  return one(e.learner_profiles)?.display_name ?? t('learn.someoneElse');
};
const versionNumber = (e: Enrolment): string => {
  const version = one(e.course_versions);
  return version ? `v${version.version_number}` : 'v?';
};
const language = (e: Enrolment): string => one(e.course_versions)?.language ?? '?';

// A status this list does not know is printed as the database wrote it: a new
// status with no label is a bug somebody should see, not a blank badge.
const STATUS_LABEL = {
  active: 'learn.statusActive',
  completed: 'learn.statusCompleted',
  withdrawn: 'learn.statusWithdrawn',
  suspended: 'learn.statusSuspended',
  expired: 'learn.statusExpired',
} as const;

const statusLabel = (status: string, t: Translate): string =>
  Object.hasOwn(STATUS_LABEL, status)
    ? t(STATUS_LABEL[status as keyof typeof STATUS_LABEL])
    : status;

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

  // The dashboard is written in the reader's language, like the frame around
  // it. The cookie is the reader's own choice from `/language`; the header is
  // what the device asked for before they met us.
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  // Twenty-seven languages have this screen; the rest read it in English
  // (`learn.ts`). For those the whole dashboard is English, the few labels it
  // shares with the navigation included — one language under one `lang`, not a
  // screen that changes language from line to line — and its numbers are
  // written the way its sentences are.
  const shown = languageShownFor(locale, 'learn');
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  const mismatch = shown.code !== locale;
  // The one part below that is not translated yet: memorisation, behind a
  // switch. Marked as English so a right-to-left page lays it out, and a
  // screen reader says it, as English.
  const english = shown.code === 'en' ? {} : ({ lang: 'en', dir: 'ltr' } as const);
  // Live classes, in the reader's language since 2026-11-25. "cancelled:
  // {reason}" is cut at the blank so the teacher's words can be set apart.
  const live = liveWords(shown.code);
  const [cancelledBefore = '', cancelledAfter = ''] = t('live.cancelledWhy', { reason: '\u0000' }).split('\u0000');

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
      .is('deleted_at', null)
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
  const distinctLearners = new Set(rows.map((r) => learnerName(r, myProfileId, t)));
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
    lead: (enrolments) => fetchCarryOn(supabase, enrolments, { t, number: num }),
  });

  // The identity line with the address isolated: the sentence is split around
  // its `{identity}` placeholder rather than the address being pasted into it,
  // so an email inside an Arabic sentence keeps its own direction.
  const identity = user.email ?? user.phone ?? null;
  const [before = '', after = ''] = t('learn.signedInAs').split('{identity}');

  return (
    <div
      className="container section learner-dashboard"
      {...(mismatch ? { lang: shown.code, dir: shown.dir } : {})}
    >
      <div className="learner-welcome">
        <p className="eyebrow">{t('nav.learn')}</p>
        <h1>
          {profiles?.display_name
            ? t('learn.greeting', { name: profiles.display_name })
            : t('learn.yourCourses')}
        </h1>
        {/* An address or a number is left-to-right whatever surrounds it. */}
        {identity ? (
          <p className="muted learner-identity">
            {before}
            <bdi dir="ltr">{identity}</bdi>
            {after}
          </p>
        ) : null}
        <nav className="learner-shortcuts" aria-label={t('learn.shortcuts')}>
          <Link href="/account">{t('learn.account')}</Link>
          <Link href="/saved">
            {savedCount > 0 ? t('learn.savedCount', { count: num(savedCount) }) : t('learn.saved')}
          </Link>
          <Link href="/downloads">{t('learn.onDevice')}</Link>
          {/* Remains reachable when the assistant flag is off, like saved courses. */}
          <Link href="/learn/ask">{t('learn.ask')}</Link>
          <form action="/sign-out" method="post">
            <button type="submit" className="btn ghost">{t('action.signOut')}</button>
          </form>
        </nav>
      </div>

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
          <h2 style={{ marginTop: 0 }}>{t('live.heading')}</h2>
          <ul className="lessons">
            {liveSessions.slice(0, 6).map((session) => (
              <li key={session.session_id}>
                <span className="t">
                  <Link href={`/live/${session.session_id}`}>
                    <bdi>{session.title}</bdi>
                  </Link>
                  <span className="muted">
                    {' · '}
                    <bdi>{session.course_title}</bdi>
                    {' · '}
                    {live.when(session.starts_at, session.scheduled_zone)}
                    {session.attended ? ` · ${t('live.attended')}` : ''}
                  </span>
                  {session.status === 'cancelled' && (
                    <span className="muted">
                      {' · '}
                      {/* The reason is what the teacher wrote, as written. */}
                      {cancelledBefore}
                      <bdi>{session.cancelled_reason}</bdi>
                      {cancelledAfter}
                    </span>
                  )}
                  {!session.joinable && session.status !== 'cancelled' && (
                    <span className="muted"> · {live.reason(session.reason)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {engagement && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <EngagementStrip engagement={engagement} code={shown.code} />
          {/* The strip is the summary; the record is where a learner goes to see
              the calendar, the badges they have not earned yet, and when each
              one was. Only offered when the feature is on, which is exactly when
              `engagement` exists. */}
          <p style={{ margin: '0.75rem 0 0' }}>
            <Link href="/progress">{t('prog.wholeRecord')}</Link>
          </p>
        </section>
      )}

      {hifzOn && (
        <section className="card" style={{ marginTop: '1.25rem' }} {...english}>
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
          <h2 style={{ marginTop: 0 }}>{t('companion.prayerTitle')}</h2>
          <p className="muted">{t('companion.cardPrayerBody')}</p>
          <Link href="/companion/prayer-times">{t('companion.cardPrayerLink')}</Link>
        </section>
      )}

      {hijriOn && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>{t('companion.hijriTitle')}</h2>
          <p className="muted">{t('companion.cardHijriBody')}</p>
          <Link href="/companion/hijri">{t('companion.cardHijriLink')}</Link>
        </section>
      )}

      {counterOn && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>{t('companion.counterTitle')}</h2>
          <p className="muted">{t('companion.cardCounterBody')}</p>
          <Link href="/companion/counter">{t('companion.cardCounterLink')}</Link>
        </section>
      )}

      {error && (
        <div className="notice error">
          <strong>{t('learn.errorEnrolments')}</strong> <bdi>{error.message}</bdi>
        </div>
      )}
      {profileError && (
        <div className="notice warn">
          <strong>{t('learn.errorProfile')}</strong> <bdi>{profileError.message}</bdi>
        </div>
      )}

      {rows.length > 0 && <h2 className="learner-courses-heading">{t('learn.yourCourses')}</h2>}
      {rows.length === 0 && !error ? (
        <div className="card learner-empty">
          <p className="empty">{t('learn.empty')}</p>
          {!myProfileId && (
            <>
              <p className="muted">{t('learn.needProfile')}</p>
              <ClaimLearner
                label={t('learn.claim')}
                note={t('learn.claimNote')}
                words={{
                  busy: t('learn.claimBusy'),
                  done: t('learn.claimDone'),
                  ready: t('learn.claimReady'),
                  failed: t('learn.claimFailed'),
                }}
              />
            </>
          )}
          <Link href="/catalogue" className="btn">{t('home.browse')}</Link>
        </div>
      ) : (
        <div className="grid cols-2 learner-course-grid">
          {rows.map((r, i) => {
            const s = summaries[i]!;
            const title = courseTitle(r, t);
            const percent = Math.round(s.percentComplete);
            return (
              <div className="card learner-course" key={r.id}>
                <Link href={`/learn/${r.id}`} className="course" style={{ display: 'block' }}>
                  {/* The teacher's own words, in whichever direction they run. */}
                  <span className="title" dir="auto">{title}</span>
                </Link>

                {showLearner && (
                  <span className="badge neutral" style={{ marginBottom: '0.5rem' }}>
                    <bdi>{learnerName(r, myProfileId, t)}</bdi>
                  </span>
                )}

                <div className="badges" style={{ margin: '0.5rem 0 0.75rem' }}>
                  <span className="badge">{statusLabel(r.status, t)}</span>
                  <span className="badge neutral">{versionNumber(r)}</span>
                  <span className="badge neutral">{language(r).toUpperCase()}</span>
                </div>

                {progressOn && (
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('learn.progressLabel', { course: title })}
                >
                  <span style={{ width: `${Math.min(100, Math.max(0, s.percentComplete))}%` }} />
                </div>
                )}

                <div className="meta" style={{ marginTop: '0.5rem' }}>
                  {progressOn
                    ? t('learn.lessonsDone', {
                        done: num(s.lessonsDone),
                        total: num(s.lessonsTotal),
                        percent: num(percent),
                      })
                    : countLabel(shown.code, s.lessonsTotal, {
                        one: 'card.lessonsOne',
                        other: 'card.lessonsOther',
                      })}
                </div>

                <Link href={`/learn/${r.id}`} className="btn secondary" style={{ marginTop: '1rem' }}>
                  {s.lessonsDone === 0 ? t('learn.start') : t('learn.continue')}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/catalogue">{t('home.browse')}</Link>
      </p>
    </div>
  );
}
