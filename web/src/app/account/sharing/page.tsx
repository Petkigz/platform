import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { ownLearnerProfileId } from '@/lib/enrolment';
import { fetchMyLearningShares, fetchSharedWithMe, SHARE_SCOPE_LABEL } from '@/lib/sharing';
import { SharingPanel } from './sharing-panel';

export const dynamic = 'force-dynamic';

/**
 * Who can see my learning, and whose learning I can see.
 *
 * Both seats on one page because they are the same question asked from two ends of it,
 * and a person who has been shared with should not have to hunt for where it went.
 *
 * The grant side is gated by `family.adult_shares`, which ships off; the read side is
 * not, because a share granted while the flag was on must still be revocable after it
 * is turned off. Turning a feature off strands nobody's privacy decision — that is the
 * same rule the support history follows.
 */
export default async function AccountSharingPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/account/sharing');

  const [enabled, emailEnabled, learnerProfileId, sharedWithMe] = await Promise.all([
    isFlagEnabled(supabase, 'family.adult_shares').catch(() => false),
    isFlagEnabled(supabase, 'delivery.notifications').catch(() => false),
    ownLearnerProfileId(supabase, user.id),
    fetchSharedWithMe(supabase, user.id),
  ]);

  // A refusal here is worth showing rather than hiding: "you have no learner profile"
  // and "the database would not answer" are different facts.
  const mine = learnerProfileId
    ? await fetchMyLearningShares(supabase, learnerProfileId)
    : null;

  const shared = sharedWithMe.ok ? sharedWithMe.value : [];

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/account">Account</Link>
      </p>
      <h1>Sharing my learning</h1>
      <p className="lede">
        Your learning is private by default, including inside your family. Nothing is
        visible to anybody else unless you grant it here, and everything you grant can
        be ended here.
      </p>

      {learnerProfileId ? (
        <SharingPanel
          shares={mine?.ok ? mine.value : []}
          enabled={enabled}
          emailEnabled={emailEnabled}
        />
      ) : (
        <div className="notice">
          You have no learner profile yet, so there is nothing of your own to share. You
          get one when you enrol in your first course. If somebody has invited you to see
          theirs, it is below.
        </div>
      )}

      {mine && !mine.ok && (
        <div className="notice error" style={{ marginTop: '1rem' }}>
          The list of your shares could not be read: {mine.message}
        </div>
      )}
      {!sharedWithMe.ok && (
        <div className="notice error" style={{ marginTop: '1rem' }}>
          What has been shared with you could not be read: {sharedWithMe.message}
        </div>
      )}

      <div className="outline-h" style={{ marginTop: '1.75rem' }}>
        <h2 style={{ margin: 0 }}>Learning shared with me</h2>
      </div>

      {shared.length === 0 ? (
        <div className="empty">
          Nobody has shared their learning with you. If you expected somebody to, they
          invite you from their own sharing page and you open the link in that email —
          you cannot request it and you cannot see it until you accept.
        </div>
      ) : (
        shared.map((overview) => (
          <div className="card" key={overview.learnerId} style={{ marginBottom: '1rem' }}>
            <div className="outline-h" style={{ marginTop: 0 }}>
              <h3 style={{ margin: 0 }}>{overview.learnerName ?? 'Somebody'}</h3>
              <span className="badge neutral">
                {overview.terms.map((t) => SHARE_SCOPE_LABEL[t.scope as keyof typeof SHARE_SCOPE_LABEL] ?? t.scope).join(', ')}
              </span>
            </div>

            <p className="meta" style={{ marginTop: '0.25rem' }}>
              {overview.terms.map((t) => (t.expiresAt
                ? `Shared until ${new Date(t.expiresAt).toLocaleDateString()}`
                : 'Shared with no end date')).join(' · ')}
              {' · '}they can end this at any time, and it stops the moment they do.
            </p>

            {overview.seesProgress && (
              <>
                <div className="stats">
                  <div>
                    <div className="n">{overview.progress.total}</div>
                    <div className="l">Courses</div>
                  </div>
                  <div>
                    <div className="n">
                      {overview.progress.rows.reduce((n, r) => n + r.lessonsCompleted, 0)}
                    </div>
                    <div className="l">Lessons completed</div>
                  </div>
                </div>

                {overview.progress.rows.length === 0 ? (
                  <p className="empty">No enrolments yet.</p>
                ) : (
                  <ul className="lessons">
                    {overview.progress.rows.map((row) => (
                      <li key={row.enrolmentId}>
                        <span>
                          {row.courseTitle}
                          {` · ${row.lessonsCompleted} of ${row.lessonsTotal} lessons`}
                          {row.lastActivityAt
                            ? ` · last seen ${new Date(row.lastActivityAt).toLocaleDateString()}`
                            : ''}
                        </span>
                        <span className={`badge ${row.status === 'completed' ? 'ok' : 'neutral'}`}>
                          {row.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {overview.progress.total > overview.progress.rows.length && (
                  <p className="meta">
                    Showing {overview.progress.rows.length} of {overview.progress.total} enrolments.
                  </p>
                )}
              </>
            )}

            {overview.seesAchievements && (
              <>
                <div className="outline-h" style={{ marginTop: '1rem' }}>
                  <h4 style={{ margin: 0 }}>Certificates</h4>
                </div>
                {overview.achievements.rows.length === 0 ? (
                  <p className="empty">None issued yet.</p>
                ) : (
                  <ul className="lessons">
                    {overview.achievements.rows.map((row) => (
                      <li key={row.certificateId}>
                        <span>
                          {row.courseTitle} · {row.certificateNumber}
                          {row.issuedAt ? ` · issued ${new Date(row.issuedAt).toLocaleDateString()}` : ''}
                        </span>
                        <span className={`badge ${row.status === 'revoked' ? 'warn' : 'ok'}`}>
                          {row.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {overview.achievements.total > overview.achievements.rows.length && (
                  <p className="meta">
                    Showing {overview.achievements.rows.length} of {overview.achievements.total} certificates.
                  </p>
                )}
              </>
            )}
          </div>
        ))
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/account">Back to my account</Link>
      </p>
    </div>
  );
}
