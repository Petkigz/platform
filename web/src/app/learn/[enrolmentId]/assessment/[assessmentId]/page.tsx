import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ownLearnerProfileId } from '@/lib/enrolment';
import {
  fetchAttemptResults,
  fetchQuestions,
  startAttempt,
  type Attempt,
} from '@/lib/assessment';
import { isFlagEnabled } from '@/lib/flags';
import { Quiz } from './quiz';

export const dynamic = 'force-dynamic';

type EnrolmentRow = {
  id: string;
  learner_profile_id: string;
  courses: { title: string }[] | null;
};

type AssessmentRow = {
  id: string;
  title: string;
  instructions: string | null;
  type: string;
  pass_threshold: number | null;
  attempt_limit: number | null;
  course_version_id: string;
};

/**
 * Take an assessment.
 *
 * The attempt is started server-side here rather than on a button press, so a
 * learner who opens the page and closes the tab has still used an attempt —
 * which is what `attempt_limit` is meant to mean.
 */
export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ enrolmentId: string; assessmentId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { enrolmentId, assessmentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/learn/${enrolmentId}`);

  const { data: enrolmentData } = await supabase
    .from('course_enrolments')
    .select('id, learner_profile_id, course_version_id, courses ( title )')
    .eq('id', enrolmentId)
    .eq('deleted_at', null)
    .maybeSingle();

  const enrolment = enrolmentData as unknown as
    | (EnrolmentRow & { course_version_id: string })
    | null;
  if (!enrolment) notFound();

  const { data: assessmentData } = await supabase
    .from('assessments')
    .select('id, title, instructions, type, pass_threshold, attempt_limit, course_version_id')
    .eq('id', assessmentId)
    .eq('status', 'active')
    .maybeSingle();

  const assessment = assessmentData as unknown as AssessmentRow | null;

  // A missing assessment and one belonging to a different course version look
  // the same here. Both are a notFound; neither is worth distinguishing to
  // someone who did not have access in the first place.
  if (!assessment || assessment.course_version_id !== enrolment.course_version_id) notFound();

  if (!(await isFlagEnabled(supabase, 'learning.assessments').catch(() => false))) {
    redirect(`/learn/${enrolmentId}`);
  }

  const started = await startAttempt(supabase, {
    learnerProfileId: enrolment.learner_profile_id,
    enrolmentId: enrolment.id,
    assessmentId: assessment.id,
  });

  const questions = await fetchQuestions(supabase, assessment.id);

  // Marked attempts and what the teacher said. Fetched whether or not a new
  // attempt could be started: running out of attempts is exactly when a learner
  // most needs to see the comment on the one they used.
  const results = await fetchAttemptResults(supabase, {
    enrolmentId: enrolment.id,
    assessmentId: assessment.id,
  });

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href={`/learn/${enrolment.id}`}>
          {enrolment.courses?.[0]?.title ?? 'Course'}
        </Link>
        {' · Assessment'}
      </p>
      <h1>{assessment.title}</h1>

      <div className="badges" style={{ marginBottom: '1rem' }}>
        <span className="badge">{assessment.type}</span>
        {assessment.pass_threshold !== null && (
          <span className="badge neutral">Pass at {assessment.pass_threshold}%</span>
        )}
        {assessment.attempt_limit !== null && (
          <span className="badge neutral">
            {assessment.attempt_limit} attempt{assessment.attempt_limit === 1 ? '' : 's'} allowed
          </span>
        )}
      </div>

      {assessment.instructions && <p className="lede">{assessment.instructions}</p>}

      {!started.ok ? (
        <div className="notice error">{started.message}</div>
      ) : questions.length === 0 ? (
        <p className="empty">This assessment has no questions yet.</p>
      ) : (
        <>
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            Attempt {(started.attempt as Attempt).attempt_number}. Your answers
            save as you go.
          </p>
          <Quiz attemptId={started.attempt.id} questions={questions} />
        </>
      )}

      {results.length > 0 && (
        <section aria-labelledby="marked-attempts" style={{ marginTop: '1.5rem' }}>
          <h2 id="marked-attempts">Your marked attempts</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {results.map((r) => (
              <div className="card" key={r.attemptNumber}>
                <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>
                  Attempt {r.attemptNumber}
                  {r.scorePossible !== null && r.scoreEarned !== null
                    ? ` · ${r.scoreEarned} of ${r.scorePossible}`
                    : ''}
                  {r.passed === null ? '' : r.passed ? ' · passed' : ' · not passed'}
                </p>

                {r.comments.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Marked, with no comment.
                  </p>
                ) : (
                  r.comments.map((c, i) => (
                    <blockquote key={`${r.attemptNumber}-${i}`} style={{ margin: '0.5rem 0 0' }}>
                      <p className="muted" style={{ margin: 0, fontSize: '.9rem' }}>
                        {c.prompt}
                      </p>
                      <p style={{ margin: '.25rem 0 0', whiteSpace: 'pre-wrap' }}>{c.feedback}</p>
                      {c.score !== null && c.points !== null && (
                        <p className="muted" style={{ margin: '.25rem 0 0', fontSize: '.85rem' }}>
                          {c.score} of {c.points} points
                        </p>
                      )}
                    </blockquote>
                  ))
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/learn/${enrolment.id}`}>Back to the course</Link>
      </p>
    </div>
  );
}
