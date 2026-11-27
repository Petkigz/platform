import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { throwUnlessWrongAddress } from '@/lib/read-failed';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { liveWords } from '@/lib/live-words';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { JoinButton } from './join-button';
import { MarkLeft } from './attendance';
import { one, type Embedded } from '@/lib/embed';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'live') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('live.heading') };
}

/**
 * One live class.
 *
 * Two people arrive here and see different pages: the teacher sees the roll and
 * who is still in the room, a learner sees a door. Both are decided by the
 * database — `live_session_roster()` returns nothing to anybody who is not the
 * host or staff, and the join itself re-checks the entitlement.
 *
 * **In the reader's language** since 2026-11-25 (`messages/live.ts`, said
 * through `lib/live-words.ts`); a language held for review reads it in
 * English, whole, under `lang="en"`. The title and the description of the
 * class, the reason it was cancelled and the names on the roll are as their
 * authors wrote them and keep their own direction.
 */
export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  const { sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/live/${sessionId}`);

  const { data: sessionData, error: sessionError } = await supabase
    .from('live_sessions')
    .select(
      'id,course_id,title,description,starts_at,ends_at,scheduled_zone,status,' +
        'cancelled_reason,host_user_id,courses(title,slug)',
    )
    .eq('id', sessionId)
    .maybeSingle();
  // A read that failed is not a thing that does not exist: the site's error
  // page, not "not found" and not an empty list.
  throwUnlessWrongAddress(sessionError);

  const session = sessionData as unknown as
    | {
        id: string;
        course_id: string;
        title: string;
        description: string | null;
        starts_at: string;
        ends_at: string;
        scheduled_zone: string;
        status: string;
        cancelled_reason: string | null;
        host_user_id: string;
        courses: Embedded<{ title: string; slug: string }>;
      }
    | null;
  if (!session) notFound();

  // The reader's own zone, so the time is shown in both.
  const { data: zoneRow } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('user_id', user.id)
    .maybeSingle();
  const readerZone =
    (zoneRow as unknown as { timezone: string | null } | null)?.timezone ?? 'UTC';

  const [{ data: roll, error: rollError }, { data: mine, error: mineError }] = await Promise.all([
    supabase.rpc('live_session_roster', { p_session_id: session.id }),
    supabase
      .from('course_enrolments')
      .select('learner_profile_id, learner_profiles(display_name, learner_type)')
      .eq('course_id', session.course_id)
      .in('status', ['active', 'completed'])
      .is('deleted_at', null),
  ]);
  // Unread is not "nobody came" and not "you have no place in this class".
  if (rollError) throw new Error(rollError.message);
  if (mineError) throw new Error(mineError.message);

  type Attendance = {
    learner_profile_id: string;
    display_name: string;
    joined_at: string;
    left_at: string | null;
    minutes_present: number | null;
  };
  const attendees = (roll ?? []) as unknown as Attendance[];

  type Seat = {
    learner_profile_id: string;
    learner_profiles: { display_name: string; learner_type: string } | null;
  };
  const seats = (mine ?? []) as unknown as Seat[];

  const state = await supabase.rpc('live_session_joinable', {
    p_session_id: session.id,
    p_learner_profile_id: seats[0]?.learner_profile_id ?? null,
  });
  const joinState = (state.data ?? null) as
    | { joinable?: boolean; reason?: string }
    | null;

  // Whether a recording of this class may be watched by this reader. The answer
  // comes from the database, which knows about the enrolment; the address does
  // not come from anywhere yet — it is handed out by the redirect below, one
  // person at a time, and never sits in this page.
  const { data: watchableData } = await supabase.rpc('can_watch_live_recording', {
    p_session_id: session.id,
  });
  const watchable = watchableData === true;

  const { locale, shown } = await readerLanguage();
  const words = liveWords(shown.code);
  const t = words.t;
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">
        <Link href="/learn">{t('nav.learn')}</Link> ·{' '}
        <bdi>{one(session.courses)?.title ?? t('course.fallbackTitle')}</bdi>
      </p>
      <h1 dir="auto">{session.title}</h1>
      <p className="muted">
        {words.when(session.starts_at, session.scheduled_zone, readerZone)} ·{' '}
        {words.length(session.starts_at, session.ends_at)}
      </p>
      {session.description && (
        <p className="lede" dir="auto">
          {session.description}
        </p>
      )}

      {session.status === 'cancelled' && (
        <div className="notice warn">
          <strong>{t('live.rCancelled')}</strong>{' '}
          {/* What the teacher wrote, as written. */}
          <bdi>{session.cancelled_reason}</bdi>
        </div>
      )}

      {watchable && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>{t('live.recTitle')}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {t('live.recBody')}
          </p>
          <a className="btn" href={`/api/live/${session.id}/recording`}>
            {t('live.recWatch')}
          </a>
        </section>
      )}

      {attendees.length > 0 ? (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t('live.whoCame')}</h2>
          <ul className="lessons">
            {attendees.map((a) => (
              <li key={a.learner_profile_id}>
                <span className="t">
                  <bdi>{a.display_name}</bdi>
                  <span className="muted">
                    {' · '}
                    {t('live.arrived', { time: words.clock(a.joined_at, readerZone) })}
                    {' · '}
                    {a.minutes_present !== null ? words.minutes(a.minutes_present) : t('live.stillIn')}
                  </span>
                </span>
                {a.left_at === null && (
                  <MarkLeft
                    sessionId={session.id}
                    learnerProfileId={a.learner_profile_id}
                    title={t('live.markLeftTitle', { name: a.display_name })}
                    words={words.roll}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t('live.room')}</h2>
          {joinState?.joinable === true && seats[0] ? (
            <JoinButton
              sessionId={session.id}
              learnerProfileId={seats[0].learner_profile_id}
              words={words.door}
            />
          ) : (
            <>
              <p className="muted">{words.reason(joinState?.reason) ?? t('live.noSeat')}</p>
              <p className="muted" style={{ marginBottom: 0 }}>
                {t('live.roomRule')}
              </p>
            </>
          )}
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/courses/${one(session.courses)?.slug ?? ''}`}>{t('live.backToCourse')}</Link>
      </p>
    </div>
  );
}
