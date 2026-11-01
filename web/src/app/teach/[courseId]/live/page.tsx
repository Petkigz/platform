import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeCancellation, describeLength, describeWhen } from '@/lib/live';
import { CancelClass } from './cancel-class';
import { RecordingForm } from './recording';
import { ScheduleForm } from './schedule-form';

export const dynamic = 'force-dynamic';

/**
 * A course's live classes.
 *
 * The teacher's screen: what is scheduled, when, and who came to the ones that
 * happened. Scheduling a room on a course you do not teach is refused by the
 * database, not by hiding this page.
 */
export default async function TeachLivePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  const { courseId } = await params;
  const query = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/teach/${courseId}/live`);

  const { data: courseData } = await supabase
    .from('courses')
    .select('id, title, slug, created_by, deleted_at')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle();
  const course = courseData as unknown as
    | { id: string; title: string; slug: string; created_by: string }
    | null;
  if (!course) notFound();

  const { data: sessions } = await supabase
    .from('live_sessions')
    .select('id,title,description,starts_at,ends_at,scheduled_zone,status,cancelled_reason,room_slug')
    .eq('course_id', course.id)
    .order('starts_at', { ascending: false })
    .limit(40);

  const { data: zoneRow } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('user_id', user.id)
    .maybeSingle();

  // Which classes already have a recording. The address itself is not here and
  // cannot be: it lives in a table with no read policy, and this only says which
  // session ids have one. A failure is silence rather than a broken page — a
  // missing badge is not a reason to lose the class list.
  const { data: recordingRows } = await supabase.rpc('teacher_live_recordings', {
    p_course_id: course.id,
  });
  const recordings = new Set(
    ((recordingRows ?? []) as unknown as { session_id: string }[]).map((r) => r.session_id),
  );

  const rows = (sessions ?? []) as unknown as {
    id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string;
    scheduled_zone: string;
    status: string;
    cancelled_reason: string | null;
    room_slug: string;
  }[];

  // The receipt after a cancellation, read off the URL rather than kept in a
  // component, so it survives the refresh that moves the class out of "Coming
  // up" and can be reloaded or linked without lying about what happened.
  const receipt = readReceipt(query);

  const now = Date.now();
  const upcoming = rows.filter(
    (s) => s.status !== 'ended' && s.status !== 'cancelled' && new Date(s.ends_at).getTime() > now,
  );
  const past = rows.filter((s) => !upcoming.includes(s));

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href={`/teach/${courseId}`}>{course.title}</Link> · Teaching
      </p>
      <h1>Live classes</h1>
      <p className="lede">
        A room your enrolled learners can enter, for the length you set. Learners are
        never recorded. If you record yourself — on a phone, or in whatever app your
        school uses — add the link to the class afterwards and the people entitled to
        the course can watch it.
      </p>

      {receipt && (
        <p className="notice warn" role="status">
          {describeCancellation(receipt)}
        </p>
      )}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Schedule a class</h2>
        <ScheduleForm
          courseId={course.id}
          defaultZone={(zoneRow as unknown as { timezone: string | null } | null)?.timezone ?? 'UTC'}
        />
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="empty">Nothing scheduled.</p>
        ) : (
          <ul className="lessons">
            {upcoming.map((session) => (
              <li key={session.id} style={{ flexWrap: 'wrap' }}>
                <span className="t">
                  {session.title}
                  <span className="muted">
                    {' · '}
                    {describeWhen(session.starts_at, session.scheduled_zone)}
                    {' · '}
                    {describeLength(session.starts_at, session.ends_at)}
                  </span>
                </span>
                <Link className="btn ghost tiny" href={`/live/${session.id}?as=${course.id}`}>
                  Roster
                </Link>
                <CancelClass courseId={course.id} sessionId={session.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Finished</h2>
          <ul className="lessons">
            {past.map((session) => (
              <li key={session.id} style={{ flexWrap: 'wrap' }}>
                <span className="t">
                  {session.title}
                  <span className="muted">
                    {' · '}
                    {describeWhen(session.starts_at, session.scheduled_zone)}
                    {session.status === 'cancelled' ? ` · cancelled: ${session.cancelled_reason}` : ''}
                    {recordings.has(session.id) ? ' · recorded' : ''}
                  </span>
                </span>
                <Link className="btn ghost tiny" href={`/live/${session.id}?as=${course.id}`}>
                  Who came
                </Link>
                {session.status !== 'cancelled' && (
                  <RecordingForm
                    sessionId={session.id}
                    hasRecording={recordings.has(session.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/teach/${courseId}`}>Back to the course</Link>
      </p>
    </div>
  );
}

/**
 * The cancellation receipt, when there is a believable one in the URL.
 *
 * Query strings are user input, so a hand-edited `?notified=9999&people=1` must
 * not put a false sentence on the screen. Anything that does not describe a
 * cancellation that could have happened is ignored rather than printed.
 */
function readReceipt(
  query: Record<string, string | string[] | undefined>,
): { notified: number; people: number; capped: boolean } | null {
  const single = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  if (!single(query.cancelled)) return null;

  const notified = Number.parseInt(single(query.notified) ?? '', 10);
  const people = Number.parseInt(single(query.people) ?? '', 10);
  if (!Number.isFinite(notified) || !Number.isFinite(people)) return null;
  if (notified < 0 || people < 0 || notified > people) return null;

  return { notified, people, capped: single(query.capped) === '1' };
}
