import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCompletion, fetchProgress, fetchSummary } from '@/lib/progress';
import { MarkComplete } from './mark-complete';

export const dynamic = 'force-dynamic';

type Section = {
  id: string;
  title: string;
  position: number;
  lessons: {
    id: string;
    title: string;
    position: number;
    is_preview: boolean;
  }[] | null;
};

type EnrolmentRow = {
  id: string;
  status: string;
  course_version_id: string;
  courses: { title: string; slug: string }[] | null;
  course_versions: {
    version_number: number;
    language: string;
    course_sections: Section[] | null;
  }[] | null;
};

/**
 * The course view.
 *
 * Everything on this page is scoped to the enrolment's pinned version — the
 * join goes enrolment → version → sections → lessons, which is the same shape
 * the database uses. A learner who enrolled into v1 keeps seeing v1 even after
 * v2 is published (D5), and `enforce_progress_version_match` refuses progress
 * recorded against any other version.
 */
export default async function CourseViewPage({
  params,
}: {
  params: Promise<{ enrolmentId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { enrolmentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/learn/${enrolmentId}`);

  const { data, error } = await supabase
    .from('course_enrolments')
    .select(
      'id, status, course_version_id, ' +
        'courses ( title, slug ), ' +
        'course_versions ( version_number, language, ' +
        'course_sections ( id, title, position, ' +
        'lessons ( id, title, position, is_preview ) ) )',
    )
    .eq('id', enrolmentId)
    .eq('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const enrolment = data as unknown as EnrolmentRow | null;

  // A missing enrolment and someone else's enrolment look identical here: RLS
  // returns nothing for both. That is the point, and it is why this is a
  // notFound rather than a permission error.
  if (!enrolment) notFound();

  const course = enrolment.courses?.[0];
  const version = enrolment.course_versions?.[0];

  const sections = (version?.course_sections ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  const [progress, summary, completion] = await Promise.all([
    fetchProgress(supabase, enrolment.id),
    fetchSummary(supabase, enrolment.id),
    fetchCompletion(supabase, enrolment.id).catch(() => null),
  ]);

  const pct = Math.round(summary.percentComplete);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/learn">My learning</Link>
        {course ? ` · ${course.title}` : ''}
      </p>
      <h1>{course?.title ?? 'Course'}</h1>
      <p className="muted">
        Version {version?.version_number ?? '?'} · {(version?.language ?? '?').toUpperCase()}
      </p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Course progress"
        >
          <span style={{ width: `${Math.min(100, Math.max(0, summary.percentComplete))}%` }} />
        </div>
        <div className="meta" style={{ marginTop: '0.6rem' }}>
          {summary.lessonsDone} of {summary.lessonsTotal} lessons complete · {pct}%
        </div>

        {completion && completion.isComplete && (
          <div className="notice" style={{ marginTop: '1rem' }}>
            <strong>Course complete.</strong> Certificates are issued by the
            platform once your completion has been reviewed.
          </div>
        )}

        {completion && !completion.isComplete && completion.blocking.length > 0 && (
          <div className="notice warn" style={{ marginTop: '1rem' }}>
            <strong>Still to do:</strong>
            <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem' }}>
              {completion.blocking.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {sections.length === 0 ? (
        <p className="empty">This course has no published outline yet.</p>
      ) : (
        sections.map((s, i) => (
          <div key={s.id}>
            <div className="outline-h">
              <h3>
                {i + 1}. {s.title}
              </h3>
            </div>
            <div className="card">
              <ul className="lessons">
                {(s.lessons ?? [])
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((l, j) => {
                    const row = progress.get(l.id);
                    const done = row?.status === 'completed';
                    return (
                      <li key={l.id}>
                        <span className="n">{j + 1}</span>
                        <span className={`t ${done ? 'done' : ''}`}>
                          {l.title}
                          {l.is_preview && (
                            <span className="badge neutral" style={{ marginLeft: '0.5rem' }}>
                              Preview
                            </span>
                          )}
                        </span>
                        <MarkComplete
                          enrolmentId={enrolment.id}
                          lessonId={l.id}
                          initiallyDone={done}
                        />
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        ))
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
