import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeLength, describeWhen } from '@/lib/live';
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
}: {
  params: Promise<{ courseId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  const { courseId } = await params;

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
        never recorded; you may be, if recording is ever switched on.
      </p>

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
              <li key={session.id}>
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
              <li key={session.id}>
                <span className="t">
                  {session.title}
                  <span className="muted">
                    {' · '}
                    {describeWhen(session.starts_at, session.scheduled_zone)}
                    {session.status === 'cancelled' ? ` · cancelled: ${session.cancelled_reason}` : ''}
                  </span>
                </span>
                <Link className="btn ghost tiny" href={`/live/${session.id}?as=${course.id}`}>
                  Who came
                </Link>
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
