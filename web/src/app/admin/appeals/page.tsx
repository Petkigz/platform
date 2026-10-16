import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchAppealQueue } from '@/lib/governance';
import { DecideAppealForm } from './decide-form';

export const dynamic = 'force-dynamic';

/**
 * Appeals waiting on a decision.
 *
 * This queue is the reason the scholarly gate is defensible rather than merely
 * strict. Without it a reviewer's word is final and unreviewable, which puts a
 * lot of consequence in one person's judgement. A gate with no appeal is not a
 * scholarly gate; it is a refusal.
 *
 * The independence rule — you cannot decide an appeal against your own decision
 * — is enforced in decide_appeal(), not here, because deciding it requires
 * knowing which decision the appeal concerns. What shows on the screen is the
 * refusal that rule produces.
 */
export default async function AdminAppealsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin/appeals');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const appeals = await fetchAppealQueue(supabase);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Appeals</h1>
      <p className="lede">
        {appeals.length} appeal{appeals.length === 1 ? '' : 's'} waiting.
      </p>
      <p className="muted">
        A teacher is contesting a reviewer&apos;s rejection. You cannot decide an
        appeal against your own decision — if the ruling under appeal is yours,
        someone else has to decide it.
      </p>

      {appeals.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Nothing waiting. A rejected course version can be appealed by its
            author from the teaching page.
          </p>
        </div>
      ) : (
        <ul className="lessons" style={{ display: 'grid', gap: '1rem' }}>
          {appeals.map((a) => (
            <li key={a.id}>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge neutral">{a.status}</span>
                <span className="muted">
                  {new Date(a.created_at).toLocaleString()} ·{' '}
                  {a.appellant?.display_name ?? 'the author'}
                </span>
              </div>
              <p style={{ margin: '0.5rem 0' }}>{a.appeal_reason}</p>
              <DecideAppealForm appealId={a.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
