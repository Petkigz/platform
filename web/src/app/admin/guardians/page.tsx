import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  CASE_STATUS_LABEL,
  pendingGuardianQueue,
  RELATIONSHIP_LABEL,
} from '@/lib/guardians';
import { DecideForm } from './decide-form';

export const dynamic = 'force-dynamic';

/**
 * Guardian verification queue.
 *
 * This page did not exist, and its absence was the actual defect. A parent
 * could ask to be recognised as a child's guardian, and the database would
 * happily store that request at `pending_verification` — with nowhere for
 * anyone to see it. The decision machinery was complete and correct: approving
 * a case flips the relationship to active and stamps `verified_at`, rejecting
 * one revokes it and strips every capability. It just had no queue.
 *
 * Which matters legally rather than cosmetically. Verifiable parental consent
 * is what COPPA requires before a US under-13 enrolls, and this is the
 * workflow built for it. A consent process nobody can action is not a consent
 * process.
 */
export default async function AdminGuardiansPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/guardians');

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) redirect('/');

  const enabled = await isFlagEnabled(supabase, 'family.guardian_verification');
  const queue = enabled ? await pendingGuardianQueue(supabase) : [];

  return (
    <main className="page">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Guardian verification</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Governance</p>
        <h1>Guardian verification</h1>
        <p className="muted">
          Adults asking to be recognised as a child&rsquo;s parent or guardian.
          This is verifiable parental consent, so a decision here should follow
          whatever evidence procedure you have settled on — it is a legal
          record, not a convenience toggle.
        </p>
      </div>

      {!enabled && (
        <div className="notice warn">
          <strong>
            <code>family.guardian_verification</code> is off.
          </strong>{' '}
          Requests are still being accepted from families but cannot be decided,
          so the queue is hidden rather than showing work that will fail. Enable
          it from <Link href="/admin">the flag dashboard</Link> once the evidence
          procedure and the retention policy behind it are settled — this is a
          human queue with a real cost attached.
        </div>
      )}

      {enabled && queue.length === 0 && (
        <p className="muted">No guardian requests are waiting.</p>
      )}

      {queue.map((item) => (
        <section className="card" key={item.id}>
          <h2>{item.learnerName}</h2>
          <p className="muted">
            Requested by <strong>{item.guardianName}</strong> as{' '}
            {RELATIONSHIP_LABEL[item.relationshipType] ?? item.relationshipType}
            {' · '}
            {new Date(item.createdAt).toLocaleDateString()}
          </p>
          <ul className="lessons">
            <li>
              <span className="t">Requested access</span>
              <span className="muted">
                {[
                  item.canViewProgress && 'view progress',
                  item.canManageLearning && 'manage learning',
                  item.canManageProfile && 'manage profile',
                ]
                  .filter(Boolean)
                  .join(', ') || 'none'}
              </span>
            </li>
            <li>
              <span className="t">Case</span>
              <span className="muted">
                {item.caseStatus
                  ? CASE_STATUS_LABEL[item.caseStatus]
                  : 'not opened yet'}
              </span>
            </li>
          </ul>

          <DecideForm relationshipId={item.id} />
        </section>
      ))}
    </main>
  );
}
