import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchCourseCohorts } from '@/lib/cohorts';
import {
  fetchCohortProgress,
  paceLabel,
  percentComplete,
  progressLabel,
  sortForAttention,
  summariseCohort,
} from '@/lib/cohort-analytics';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One class, and how its members are getting on.
 *
 * Everything that decides who may see this is in the database: the course has to
 * be this teacher's, the cohort has to be readable by them, and every learner row
 * has to pass `can_read_learner_course_progress()`. This page adds no filter of
 * its own, because a second place that decides visibility is a second place that
 * can disagree with the first.
 */
export default async function CohortProgressPage({
  params,
}: {
  params: Promise<{ courseId: string; cohortId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  const { courseId, cohortId } = await params;
  if (!UUID.test(courseId) || !UUID.test(cohortId)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/teach/${courseId}/cohorts/${cohortId}`);

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id,title,created_by')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle();
  if (courseError) throw new Error(courseError.message);
  const courseRow = course as unknown as { id: string; title: string; created_by: string } | null;
  if (!courseRow || courseRow.created_by !== user.id) notFound();

  // A class this teacher cannot read and a class that does not exist get the same
  // answer, so the page cannot be used to find out which cohorts are real.
  const cohorts = await fetchCourseCohorts(supabase, { courseId });
  const cohort = cohorts.find((c) => c.id === cohortId);
  if (!cohort) notFound();

  const versionResult = await supabase
    .from('course_versions')
    .select('version_number')
    .eq('id', cohort.courseVersionId)
    .maybeSingle();
  const versionNumber = versionResult.error
    ? null
    : (versionResult.data as unknown as { version_number: number } | null)?.version_number ?? null;

  const [cohortsOn, analyticsOn] = await Promise.all([
    isFlagEnabled(supabase, 'learning.cohorts').catch(() => false),
    isFlagEnabled(supabase, 'delivery.analytics').catch(() => false),
  ]);
  const enabled = cohortsOn && analyticsOn;

  // Only ask for the roster while the feature is on. The database would answer
  // with no rows either way; not asking is what lets this page say why it is empty
  // instead of showing a teacher a class that looks like nobody joined.
  const result = enabled
    ? await fetchCohortProgress(supabase, cohortId)
    : { ok: true as const, rows: [] };
  const rows = result.ok ? sortForAttention(result.rows) : [];
  const summary = summariseCohort(rows);
  const needsANudge = summary.notEnrolled + summary.stalled + summary.notStarted;

  const when = (value: string | null) => (value ? new Date(value).toLocaleDateString() : null);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href={`/teach/${courseId}/cohorts`}>Teaching · {courseRow.title} · Cohorts</Link>
      </p>
      <h1>{cohort.title}</h1>
      <p className="lede">
        {cohort.status === 'open' ? 'Running now' : `Status: ${cohort.status}`}
        {' · starts '}{new Date(cohort.startsAt).toLocaleDateString()}
        {cohort.endsAt ? ` · ends ${new Date(cohort.endsAt).toLocaleDateString()}` : ' · open-ended'}
        {versionNumber ? ` · version ${versionNumber}` : ''}
      </p>

      {!enabled && (
        <p className="notice warn">
          Learner analytics are not enabled. No learner in this class is visible to you until{' '}
          <code>
            {[!cohortsOn ? 'learning.cohorts' : null, !analyticsOn ? 'delivery.analytics' : null]
              .filter((key): key is string => key !== null)
              .join(' and ')}
          </code>{' '}
          is switched on. The dates and status above come from the class itself, which does not
          depend on analytics.
        </p>
      )}

      {!result.ok && (
        <p className="notice error">{result.message}</p>
      )}

      {result.ok && enabled && (
        <>
          {rows.length === 0 ? (
            <p className="empty">
              Nobody is in this class yet. A learner joins it themselves, or a parent joins a child;
              you cannot add somebody to a dated class.
            </p>
          ) : (
            <>
              <div className="stats">
                <div><p className="n">{summary.learners}</p><p className="l">In the class</p></div>
                <div><p className="n">{summary.finished}</p><p className="l">Finished</p></div>
                <div><p className="n">{summary.inProgress}</p><p className="l">Working through it</p></div>
                <div><p className="n">{needsANudge}</p><p className="l">Need a nudge</p></div>
                <div><p className="n">{summary.averagePercent}%</p><p className="l">Average complete</p></div>
              </div>

              <div className="stack" style={{ marginTop: '1.5rem', gap: '0.75rem' }}>
                {rows.map((row) => {
                  const percent = percentComplete(row);
                  const label = paceLabel(row);
                  return (
                    <section className="card" key={row.learnerProfileId}>
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h2 style={{ margin: 0 }}>{row.displayName}</h2>
                          <p className="muted" style={{ margin: '.25rem 0', fontSize: '0.9rem' }}>
                            {row.learnerType === 'child' ? 'Child' : 'Adult'}
                            {row.ageBand ? ` · ${row.ageBand}` : ''}
                            {' · joined '}{when(row.joinedAt) ?? '—'}
                            {row.enrolmentStatus && row.enrolmentStatus !== 'active'
                              ? ` · enrolment ${row.enrolmentStatus}`
                              : ''}
                          </p>
                        </div>
                        <span className={`badge ${percent === 100 ? '' : 'neutral'}`}>{label}</span>
                      </div>
                      <p style={{ margin: '.5rem 0 .35rem' }}>
                        {row.enrolmentId ? progressLabel(row) : 'Not enrolled in this version'}
                        {row.enrolmentId ? ` · ${percent}%` : ''}
                        {row.lessonsInProgress > 0 ? ` · ${row.lessonsInProgress} open` : ''}
                      </p>
                      {row.enrolmentId && (
                        <div className="progress" aria-hidden="true">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                      )}
                      <p className="muted" style={{ margin: '.5rem 0 0', fontSize: '0.85rem' }}>
                        {row.lastSeenAt
                          ? `Last seen ${new Date(row.lastSeenAt).toLocaleString()}`
                          : 'No lesson opened yet'}
                      </p>
                    </section>
                  );
                })}
              </div>

              <p className="notice" style={{ marginTop: '1.5rem' }}>
                This shows names and lesson progress for the members of this class, in the version
                the class teaches, while they are in it. It does not show a learner&apos;s family,
                their account, or their contact details, and somebody who leaves the class leaves
                this page with it. A learner who took the course on their own, without a class, is
                not here at all.
              </p>
            </>
          )}
        </>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/teach/${courseId}/cohorts`}>Back to cohorts</Link>
        {' · '}
        <Link href={`/teach/${courseId}`}>Back to curriculum</Link>
      </p>
    </div>
  );
}
