import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  ASSIGNMENT_STATUS_LABEL,
  DECISION_LABEL,
  SCOPE_LABEL,
  fetchMyAssignments,
  fetchMyReviewerEntry,
  fetchSubjectOptions,
} from '@/lib/review';
import { MyRegister } from './my-register';

export const dynamic = 'force-dynamic';

/**
 * The review queue, and above it the reviewer's own place on the register.
 *
 * Assignments are created by platform staff, never self-claimed — `cra_write`
 * is privileged only. So an empty queue means nobody has asked this person for
 * anything, not that the page is broken, and it says so.
 *
 * The register comes first because it is the reason a queue is ever empty: until a
 * person applies, is checked, and is granted the subject, no assignment to them can
 * be made and no approval from them can publish anything. An empty queue with no
 * entry on the register is not a quiet page; it is a person who cannot yet be asked.
 */
export default async function ReviewPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/review');

  const [assignments, entry, subjects] = await Promise.all([
    fetchMyAssignments(supabase, user.id),
    fetchMyReviewerEntry(supabase, user.id),
    fetchSubjectOptions(supabase),
  ]);
  const pending = assignments.filter((a) => a.status === 'offered' || a.status === 'accepted' || a.status === 'in_progress');

  return (
    <div className="container section">
      <p className="eyebrow">Reviewing</p>
      <h1>Review queue</h1>
      <p className="lede">
        Assignments come from platform staff. You cannot assign yourself, and
        you cannot approve a course you wrote.
      </p>
      <p className="muted">
        If you sit on a scholarly panel, the cases waiting for your vote are on{' '}
        <a href="/panel">your panel page</a>.
      </p>

      <div style={{ marginTop: '1.5rem' }}>
        <MyRegister entry={entry} subjects={subjects} />
      </div>

      {assignments.length === 0 ? (
        <div className="empty">
          Nothing has been assigned to you. If you expected a review here, a
          platform admin needs to assign it.
        </div>
      ) : (
        <>
          <div className="stats">
            <div>
              <div className="n">{pending.length}</div>
              <div className="l">Awaiting you</div>
            </div>
            <div>
              <div className="n">{assignments.length - pending.length}</div>
              <div className="l">Closed</div>
            </div>
          </div>

          <div className="grid cols-2" style={{ marginTop: '1.5rem' }}>
            {assignments.map((a) => (
              <div className="card" key={a.id}>
                <div className="badges" style={{ marginBottom: '0.5rem' }}>
                  <span className="badge neutral">{SCOPE_LABEL[a.scope]}</span>
                  <span className={`badge ${a.status === 'offered' ? '' : 'neutral'}`}>
                    {ASSIGNMENT_STATUS_LABEL[a.status]}
                  </span>
                </div>

                <h3 style={{ marginTop: 0 }}>{a.courseTitle}</h3>

                {a.assignedAt && (
                  <p className="meta" style={{ margin: '0.25rem 0' }}>
                    Assigned {new Date(a.assignedAt).toLocaleDateString()}
                  </p>
                )}
                {a.dueAt && (
                  <p className="meta" style={{ margin: '0.25rem 0' }}>
                    Due {new Date(a.dueAt).toLocaleDateString()}
                  </p>
                )}

                {a.decisions[0] && (
                  <p className="meta" style={{ margin: '0.25rem 0' }}>
                    Your decision:{' '}
                    {DECISION_LABEL[a.decisions[0].decision] ?? a.decisions[0].decision}
                  </p>
                )}

                <Link href={`/review/${a.id}`} className="btn secondary" style={{ marginTop: '0.75rem' }}>
                  {a.status === 'offered' ? 'View offer' : 'Open review'}
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
