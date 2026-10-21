import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  BARRING_CONFLICT_STATUSES,
  fetchReviewerRegister,
  fetchSubjectOptions,
} from '@/lib/review';
import { ReviewerRegister } from './register';

export const dynamic = 'force-dynamic';

/**
 * The reviewer register: who applied, who has been checked, what each may review,
 * and what each has stood aside from.
 *
 * Gated on `governance_admin` or `platform_admin` rather than `is_privileged`. That
 * is narrower than `/admin/reviews`, and deliberately so: assigning a reviewer is
 * scheduling work, while this page decides who is trusted to say what the platform
 * teaches. A support agent is privileged for refunds and cases and should not be able
 * to appoint a scholar. The functions themselves refuse anyone else too, so this
 * redirect is a courtesy rather than the defence.
 *
 * There is no feature flag in front of it. Publication always needs a scholarly
 * approval — `enforce_publication_gate()` reads `governance.min_approvals`, which
 * defaults to 1 and is not tied to `teaching.peer_review` — so an empty register is
 * not "review switched off". It is "nothing can be published", and the dials that
 * change that are `governance.min_approvals` and `governance.panel_required` on the
 * flags page.
 */
export default async function AdminReviewersPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin/reviewers');

  const [{ data: governance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (governance !== true && platform !== true) redirect('/admin');

  const [register, subjects] = await Promise.all([
    fetchReviewerRegister(supabase),
    fetchSubjectOptions(supabase),
  ]);

  const awaiting = register.filter(
    (e) => e.reviewer.status === 'applicant' || e.reviewer.status === 'pending_verification',
  );
  const verified = register.filter((e) => e.reviewer.status === 'active');
  const barred = register.filter((e) =>
    e.conflicts.some((c) => BARRING_CONFLICT_STATUSES.includes(c.status)),
  );

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Reviewer register</h1>
      <p className="lede">
        Who may review, what they are qualified for, and what they have to stand
        aside from. Checking somebody here is what makes them assignable, and an
        approval from somebody assignable is what lets a course publish.
      </p>

      <div className="stats">
        <div>
          <div className="n">{awaiting.length}</div>
          <div className="l">Waiting to be checked</div>
        </div>
        <div>
          <div className="n">{verified.length}</div>
          <div className="l">Verified reviewers</div>
        </div>
        <div>
          <div className="n">{barred.length}</div>
          <div className="l">Barred by a declaration</div>
        </div>
        <div>
          <div className="n">{subjects.length}</div>
          <div className="l">Subjects to grant</div>
        </div>
      </div>

      {verified.length === 0 && (
        <div className="notice warn" style={{ marginTop: '1.5rem' }}>
          Nobody is verified yet, so no assignment can be made and no course version
          can be published. An application has to be made by the person themselves
          on <Link href="/review">/review</Link> — staff cannot create a reviewer
          profile for somebody else — and then checked here.
        </div>
      )}

      <ReviewerRegister register={register} subjects={subjects} />

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin/reviews">Assign reviews</Link>
        {' · '}
        <Link href="/admin">Back to feature flags</Link>
      </p>
    </div>
  );
}
