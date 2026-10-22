import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { ANALYTICS_EVENT_LABELS, type AnalyticsEventCode } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

type Row = { code: string; description: string; events: number | string; learners: number | string };
type Day = { day: string; events: number | string };
type Lesson = { lessonId: string; title: string; opens: number | string; learners: number | string };

type Report = {
  title: string;
  days: number;
  events: number | string;
  learners: number | string;
  people: number | string;
  byEvent: Row[];
  daily: Day[];
  lessons: Lesson[];
};

const WINDOWS = [7, 30, 90];

function n(value: number | string | undefined): number {
  return Number(value ?? 0);
}

/**
 * What a teacher may know about their own course.
 *
 * Aggregates only, and deliberately so: the number of people who opened lesson
 * three is a fact about the course, while a list of *who* opened it is a fact
 * about children. The database will not return one, and this page could not
 * display it if it did.
 */
export default async function CourseReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { courseId } = await params;
  const { days: daysParam } = await searchParams;
  const days = WINDOWS.includes(Number(daysParam)) ? Number(daysParam) : 30;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/teach/${courseId}/reports`);

  const { data: courseData } = await supabase
    .from('courses')
    .select('id, title, created_by')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle();

  const course = courseData as unknown as { id: string; title: string; created_by: string } | null;
  if (!course) notFound();

  const [{ data: privileged }, enabled] = await Promise.all([
    supabase.rpc('is_privileged', { p_user_id: user.id }),
    isFlagEnabled(supabase, 'delivery.analytics'),
  ]);

  if (course.created_by !== user.id && privileged !== true) notFound();

  const { data, error } = await supabase.rpc('teacher_course_analytics', {
    p_course_id: courseId,
    p_days: days,
  });

  const report = (data ?? null) as Report | null;
  const peak = (report?.daily ?? []).reduce((max, row) => Math.max(max, n(row.events)), 0);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href={`/teach/${courseId}`}>{course.title}</Link> · Reports
      </p>
      <h1>How this course is being used</h1>

      {!enabled ? (
        <div className="notice">
          Analytics is switched off on this platform, so nothing has been recorded.
          When it is on, this page shows how many people opened each lesson — counts,
          not names.
        </div>
      ) : error ? (
        <div className="notice warn">{error.message}</div>
      ) : !report || n(report.events) === 0 ? (
        <div className="notice">
          Nothing recorded in the last {days} days. A learner who opens a lesson appears
          here within a moment of the page loading.
        </div>
      ) : (
        <>
          <p style={{ marginTop: '1rem' }}>
            Window:{' '}
            {WINDOWS.map((w) => (
              <span key={w} style={{ marginRight: '0.75rem' }}>
                {w === days ? (
                  <strong>{w} days</strong>
                ) : (
                  <Link href={`/teach/${courseId}/reports?days=${w}`}>{w} days</Link>
                )}
              </span>
            ))}
          </p>

          <div className="stats">
            <div>
              <div className="n">{n(report.events)}</div>
              <div className="l">Events</div>
            </div>
            <div>
              <div className="n">{n(report.learners)}</div>
              <div className="l">Learners</div>
            </div>
            <div>
              <div className="n">{n(report.people)}</div>
              <div className="l">People signed in</div>
            </div>
          </div>

          <div className="outline-h" style={{ marginTop: '1.5rem' }}>
            <h3>By event</h3>
          </div>
          <div className="card">
            <ul className="lessons">
              {report.byEvent.map((row) => (
                <li key={row.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <strong>
                      {ANALYTICS_EVENT_LABELS[row.code as AnalyticsEventCode] ?? row.code}
                    </strong>
                    <span className="muted">
                      {n(row.events)} event(s) · {n(row.learners)} learner(s)
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {report.lessons.length > 0 && (
            <>
              <div className="outline-h" style={{ marginTop: '2rem' }}>
                <h3>The lessons being opened</h3>
              </div>
              <div className="card">
                <ul className="lessons">
                  {report.lessons.map((lesson) => (
                    <li key={lesson.lessonId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span>{lesson.title}</span>
                        <span className="muted">
                          {n(lesson.opens)} open(s) · {n(lesson.learners)} learner(s)
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {report.daily.length > 0 && (
            <>
              <div className="outline-h" style={{ marginTop: '2rem' }}>
                <h3>Lesson opens by day</h3>
              </div>
              <div className="card">
                <ul className="lessons">
                  {report.daily.map((row) => (
                    <li key={row.day}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="muted" style={{ width: '7rem', fontSize: '0.85rem' }}>
                          {row.day}
                        </span>
                        <span
                          aria-hidden
                          style={{
                            display: 'inline-block',
                            height: '0.6rem',
                            borderRadius: '999px',
                            background: 'var(--green-800)',
                            width: `${peak > 0 ? Math.max(2, Math.round((n(row.events) / peak) * 100)) : 0}%`,
                            minWidth: '0.4rem',
                          }}
                        />
                        <span style={{ fontSize: '0.85rem' }}>{n(row.events)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <p className="muted" style={{ marginTop: '1.5rem' }}>
            These are counts. To see how one named learner is doing, use the cohort
            progress view — that is a different question with its own permission.
          </p>
        </>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/teach/${courseId}`}>Back to the course</Link>
      </p>
    </div>
  );
}
