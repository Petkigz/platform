import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  fetchAssignableReviewers,
  fetchPendingVersions,
  fetchSubjectOptions,
} from '@/lib/review';
import { fetchVersionReviewState } from '@/lib/review-requirements';
import { RequirementPanel } from '@/app/_shared/requirement-panel';
import { VersionChecks } from '@/app/_shared/version-checks';
import { AssignForm } from './assign-form';

export const dynamic = 'force-dynamic';

/**
 * Assign reviewers to submitted courses.
 *
 * This is the only place an assignment is created, and that is deliberate:
 * `cra_write` is privileged only, so a reviewer cannot claim work and a
 * teacher cannot nominate their own reviewer. Both would quietly defeat the
 * point of having a review step.
 *
 * Each version also shows what it needs before it can publish, because assigning a
 * reviewer without that is guessing: if the version wrote down a subject, then
 * `validate_review_assignment()` refuses any reviewer who is not authorised for it,
 * and the dropdown below does not say who is. Governance staff may also waive a
 * requirement here, which is the only way a version whose subject has no authorised
 * reviewer ever publishes — and it needs the reason in writing.
 */
export default async function AdminReviewsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin/reviews');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  // Reading this page is a staff matter. Waiving a review requirement is a governance
  // one, so the control is offered to the two roles the database will accept and not
  // to every privileged caller: a support agent can assign a reviewer and cannot
  // decide that a course needs no review.
  const [{ data: governance }, { data: platformAdmin }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  const isGovernance = governance === true || platformAdmin === true;

  const [versions, reviewers, subjectOptions] = await Promise.all([
    fetchPendingVersions(supabase),
    fetchAssignableReviewers(supabase),
    fetchSubjectOptions(supabase),
  ]);

  const states = await Promise.all(
    versions.map((v) => fetchVersionReviewState(supabase, v.id)),
  );

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Assign reviews</h1>
      <p className="lede">
        Courses waiting for a reviewer. Assigning one is a staff decision — a
        reviewer cannot claim work, and a teacher cannot nominate their own.
      </p>

      <div className="stats">
        <div>
          <div className="n">{versions.length}</div>
          <div className="l">Awaiting review</div>
        </div>
        <div>
          <div className="n">{reviewers.length}</div>
          <div className="l">Active reviewers</div>
        </div>
      </div>

      {reviewers.length === 0 && (
        <div className="notice warn" style={{ marginTop: '1.5rem' }}>
          There are no verified reviewers, so nothing below can be assigned. A
          reviewer applies on{' '}
          <Link href="/review">their own review page</Link> and is checked on the{' '}
          <Link href="/admin/reviewers">reviewer register</Link> — staff cannot
          create a profile for somebody else, and an unchecked applicant cannot be
          assigned.
        </div>
      )}

      <div className="outline-h" style={{ marginTop: '1.75rem' }}>
        <h3>Submitted for review</h3>
      </div>

      {versions.length === 0 ? (
        <div className="empty">
          Nothing has been submitted for review.
        </div>
      ) : (
        versions.map((v, i) => (
          <div className="card" key={v.id} style={{ marginBottom: '1rem' }}>
            <div className="outline-h" style={{ marginTop: 0 }}>
              <h3 style={{ margin: 0 }}>{v.courseTitle}</h3>
              <span className="badge neutral">Version {v.versionNumber}</span>
              {states[i] && states[i].openRequirements > 0 && (
                <span className="badge warn">
                  {states[i].openRequirements} requirement{states[i].openRequirements === 1 ? '' : 's'} open
                </span>
              )}
            </div>
            <p className="meta" style={{ marginTop: '0.5rem' }}>
              /{v.courseSlug}
            </p>
            <AssignForm
              versionId={v.id}
              courseTitle={v.courseTitle}
              reviewers={reviewers}
            />
            {states[i] && (
              <details style={{ marginTop: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
                  What this version needs before it can publish
                  {states[i].latestChecks.length > 0
                    ? ` · ${states[i].latestChecks.filter((c) => c.passed).length}/${states[i].latestChecks.length} checks passed`
                    : ''}
                  {states[i].assessments[0]
                    ? ` · classified as ${states[i].assessments[0].changeClass.replace(/_/g, ' ')}`
                    : ''}
                </summary>
                <div style={{ marginTop: '0.75rem' }}>
                  <RequirementPanel
                    versionId={v.id}
                    requirements={states[i].requirements}
                    subjects={subjectOptions}
                    blockedBecause={states[i].blockedBecause}
                    recountError={states[i].recountError}
                    canRequire={isGovernance}
                    canWaive={isGovernance}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <VersionChecks
                      versionId={v.id}
                      latestChecks={states[i].latestChecks}
                      checks={states[i].checks}
                      assessments={states[i].assessments}
                      versions={[]}
                      canCheck={false}
                      canAssess={isGovernance}
                    />
                  </div>
                </div>
              </details>
            )}
          </div>
        ))
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin/reviewers">Reviewer register</Link>
        {' · '}
        <Link href="/admin">Back to feature flags</Link>
      </p>
    </div>
  );
}
