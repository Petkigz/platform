import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  fetchAssignableReviewers,
  fetchPendingVersions,
} from '@/lib/review';
import { AssignForm } from './assign-form';

export const dynamic = 'force-dynamic';

/**
 * Assign reviewers to submitted courses.
 *
 * This is the only place an assignment is created, and that is deliberate:
 * `cra_write` is privileged only, so a reviewer cannot claim work and a
 * teacher cannot nominate their own reviewer. Both would quietly defeat the
 * point of having a review step.
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

  const [versions, reviewers] = await Promise.all([
    fetchPendingVersions(supabase),
    fetchAssignableReviewers(supabase),
  ]);

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
        versions.map((v) => (
          <div className="card" key={v.id} style={{ marginBottom: '1rem' }}>
            <div className="outline-h" style={{ marginTop: 0 }}>
              <h3 style={{ margin: 0 }}>{v.courseTitle}</h3>
              <span className="badge neutral">Version {v.versionNumber}</span>
            </div>
            <p className="meta" style={{ marginTop: '0.5rem' }}>
              /{v.courseSlug}
            </p>
            <AssignForm
              versionId={v.id}
              courseTitle={v.courseTitle}
              reviewers={reviewers}
            />
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
