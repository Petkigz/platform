import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeLength, describeReason, describeWhen } from '@/lib/live';
import { JoinButton } from './join-button';
import { MarkLeft } from './attendance';

export const dynamic = 'force-dynamic';

/**
 * One live class.
 *
 * Two people arrive here and see different pages: the teacher sees the roll and
 * who is still in the room, a learner sees a door. Both are decided by the
 * database — `live_session_roster()` returns nothing to anybody who is not the
 * host or staff, and the join itself re-checks the entitlement.
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

  const { data: sessionData } = await supabase
    .from('live_sessions')
    .select(
      'id,course_id,title,description,starts_at,ends_at,scheduled_zone,status,' +
        'cancelled_reason,host_user_id,courses(title,slug)',
    )
    .eq('id', sessionId)
    .maybeSingle();

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
        courses: { title: string; slug: string }[] | null;
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

  const [{ data: roll }, { data: mine }] = await Promise.all([
    supabase.rpc('live_session_roster', { p_session_id: session.id }),
    supabase
      .from('course_enrolments')
      .select('learner_profile_id, learner_profiles(display_name, learner_type)')
      .eq('course_id', session.course_id)
      .in('status', ['active', 'completed'])
      .is('deleted_at', null),
  ]);

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
    learner_profiles: { display_name: string; learner_type: string }[] | null;
  };
  const seats = (mine ?? []) as unknown as Seat[];

  const state = await supabase.rpc('live_session_joinable', {
    p_session_id: session.id,
    p_learner_profile_id: seats[0]?.learner_profile_id ?? null,
  });
  const joinState = (state.data ?? null) as
    | { joinable?: boolean; reason?: string }
    | null;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/learn">My learning</Link> · {session.courses?.[0]?.title ?? 'Course'}
      </p>
      <h1>{session.title}</h1>
      <p className="muted">
        {describeWhen(session.starts_at, session.scheduled_zone, readerZone)} ·{' '}
        {describeLength(session.starts_at, session.ends_at)}
      </p>
      {session.description && <p className="lede">{session.description}</p>}

      {session.status === 'cancelled' && (
        <div className="notice warn">
          <strong>This class was cancelled.</strong> {session.cancelled_reason}
        </div>
      )}

      {attendees.length > 0 ? (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Who came</h2>
          <ul className="lessons">
            {attendees.map((a) => (
              <li key={a.learner_profile_id}>
                <span className="t">
                  {a.display_name}
                  <span className="muted">
                    {' · '}arrived {new Date(a.joined_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: readerZone,
                    })}
                    {a.minutes_present !== null
                      ? ` · ${a.minutes_present} minute${a.minutes_present === 1 ? '' : 's'}`
                      : ' · still in the room'}
                  </span>
                </span>
                {a.left_at === null && (
                  <MarkLeft
                    sessionId={session.id}
                    learnerProfileId={a.learner_profile_id}
                    name={a.display_name}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>The room</h2>
          {joinState?.joinable === true && seats[0] ? (
            <JoinButton sessionId={session.id} learnerProfileId={seats[0].learner_profile_id} />
          ) : (
            <>
              <p className="muted">
                {describeReason(joinState?.reason) ??
                  'You are not enrolled in this course, so there is no seat in this room.'}
              </p>
              <p className="muted" style={{ marginBottom: 0 }}>
                The room opens 15 minutes before the start. Nobody but enrolled learners
                can enter, and learners are never recorded.
              </p>
            </>
          )}
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/courses/${session.courses?.[0]?.slug ?? ''}`}>Back to the course</Link>
      </p>
    </div>
  );
}
