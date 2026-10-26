import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeReward, parseReferralOverview } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

const STATUS_WORDS: Record<string, string> = {
  pending: 'Started a purchase',
  rewarded: 'Earned a reward',
  capped: 'Earned nothing — yearly limit',
  reversed: 'Withdrawn — qualifying purchase refunded',
};

function when(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The invitation programme, for the people who run it.
 *
 * Deliberately a reader, not a writer: the switch lives on the flag dashboard
 * and the four numbers live on `/admin/settings`, both of which already insist
 * on a written reason and write an audit row. A third screen that could change
 * the same values would be a third set of rules.
 *
 * What it does add is the answer to "is this working" — how many people have a
 * code, how many introductions turned into a purchase, and every recent
 * introduction with its outcome, including the two that are not wins: a reward
 * withheld by the yearly cap, and a reward withdrawn because the purchase was
 * refunded.
 */
export default async function AdminReferralsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/referrals');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const { data, error } = await supabase.rpc('referral_overview');
  const overview = parseReferralOverview(data);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Invitations</h1>
      <p className="lede">
        One person invites another, the friend gets a discount on a first course, and the
        inviter gets a discount on a later one once that purchase has stayed past the
        refund window. Both are discounts on a course — nothing is paid out, so there is
        no provider behind this page and no balance to reconcile.
      </p>

      {error && (
        <div className="notice error">
          The programme could not be read: {error.message}
        </div>
      )}

      {overview && (
        <>
          <div className="notice" style={{ marginTop: '1rem' }}>
            <strong>
              {overview.enabled ? 'Open for invitations.' : 'Closed: no code can be minted.'}
            </strong>{' '}
            {overview.enabled
              ? 'Switching it off here is done on the flag dashboard, and it stops new codes without touching the ones already shared.'
              : 'The code, the screen and the rules are built. Turning it on is a flag on the dashboard.'}{' '}
            <Link href="/admin/settings">The four numbers</Link> are controls there, each
            with a written reason and an audit entry.
          </div>

          <div className="stats" style={{ marginTop: '1.25rem' }}>
            <div>
              <div className="n">{overview.codes}</div>
              <div className="l">people with a code</div>
            </div>
            <div>
              <div className="n">{overview.conversions}</div>
              <div className="l">introductions</div>
            </div>
            <div>
              <div className="n">{overview.rewardsMinted}</div>
              <div className="l">rewards earned</div>
            </div>
            <div>
              <div className="n">{overview.rewardsCapped}</div>
              <div className="l">stopped by the yearly cap</div>
            </div>
            <div>
              <div className="n">{overview.rewardsReversed}</div>
              <div className="l">withdrawn after a refund</div>
            </div>
          </div>

          <div className="scroll-x" style={{ marginTop: '1.5rem' }}>
          <table style={{ width: '100%' }}>
            <caption className="muted">
              The terms as they stand: {overview.terms.refereePercent}% off for the friend,{' '}
              {overview.terms.rewardPercent}% for the inviter, at most{' '}
              {overview.terms.maxPerYear} rewards a year, each lasting{' '}
              {overview.terms.expiryDays} days. A code already shared keeps the percentage
              it was minted with.
            </caption>
            <thead>
              <tr>
                <th scope="col">Inviter</th>
                <th scope="col">Friend</th>
                <th scope="col">Outcome</th>
                <th scope="col">Reward code</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {overview.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Nobody has used a code yet. When they do, each introduction appears
                    here with what became of it.
                  </td>
                </tr>
              ) : (
                overview.recent.map((row, index) => (
                  <tr key={`${row.referrer ?? 'x'}-${row.at ?? index}`}>
                    <td>{row.referrer ?? 'Closed account'}</td>
                    <td>{row.referee ?? 'Closed account'}</td>
                    <td>{STATUS_WORDS[row.status] ?? row.status}</td>
                    <td>
                      {row.code ?? '—'}
                      {row.code && (
                        <span className="muted"> · {describeReward({
                          code: row.code,
                          status: row.status,
                          percent: null,
                          startsAt: null,
                          earnedAt: null,
                          endsAt: null,
                          campaignStatus: null,
                        })}</span>
                      )}
                    </td>
                    <td>{when(row.at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>

          <p className="muted" style={{ marginTop: '1rem' }}>
            A friend is referred once, for good: a second inviter still gives a discount,
            but the first introduction keeps the credit. Using your own code is refused by
            the database, not by this screen.
          </p>
        </>
      )}

      {!overview && !error && (
        <div className="notice warn">
          The programme summary came back unreadable. Nothing has changed — this page only
          reads.
        </div>
      )}
    </div>
  );
}
