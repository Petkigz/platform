import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ZAKAT_HONESTY, parseOverview } from '@/lib/sponsorship';
import { SponsorshipDesk } from './sponsorship-desk';

export const dynamic = 'force-dynamic';

/**
 * The sponsorship desk: decide a request, record money that arrived.
 *
 * Gated on exactly the pair the database enforces — platform or finance — so a
 * support agent is turned away here rather than shown buttons that would fail.
 * The same `can_decide_sponsorship()` gates every writer behind this page.
 *
 * The page's most important sentence is the one about what it is not: a
 * sponsorship is not an order, so nothing here creates one, charges tax, or
 * accrues a teacher earning.
 */
export default async function AdminSponsorshipsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/sponsorships');

  // The same pair the database checks in `can_decide_sponsorship()`: the owner
  // or finance. A support agent is sent back to the dashboard rather than shown
  // a screen whose buttons would each fail.
  const [{ data: finance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (finance !== true && platform !== true) redirect('/admin');

  const { data, error } = await supabase.rpc('sponsorship_overview');
  const overview = parseOverview(data);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Sponsored seats</h1>
      <p className="lede">
        A learner asks, you decide, a sponsor covers the course. The sponsor never learns who they
        helped and the learner never learns who paid.
      </p>

      {error && (
        <div className="notice error">
          The desk could not be read: {error.message}
        </div>
      )}

      {overview && (
        <>
          <div className="notice" style={{ marginTop: '1rem' }}>
            <strong>
              {overview.enabled
                ? 'Open for requests and sponsorships.'
                : 'Closed: nobody can ask and no seat can be pledged.'}
            </strong>{' '}
            The switch is `commerce.sponsorship` on <Link href="/admin">the dashboard</Link>.
            Turning it off stops new requests; it does not take away a seat somebody already paid
            for.
          </div>

          <div className="stats" style={{ marginTop: '1.25rem' }}>
            <div>
              <div className="n">{overview.counts.waiting}</div>
              <div className="l">waiting for a decision</div>
            </div>
            <div>
              <div className="n">{overview.counts.approved}</div>
              <div className="l">approved, no sponsor yet</div>
            </div>
            <div>
              <div className="n">{overview.counts.funded}</div>
              <div className="l">seats covered</div>
            </div>
            <div>
              <div className="n">{overview.counts.pledged}</div>
              <div className="l">pledged, money not recorded</div>
            </div>
            <div>
              <div className="n">{overview.counts.paid}</div>
              <div className="l">paid</div>
            </div>
            <div>
              <div className="n">{overview.counts.declined}</div>
              <div className="l">declined</div>
            </div>
          </div>

          <SponsorshipDesk overview={overview} />

          <div className="notice" style={{ marginTop: '1.5rem' }}>
            A sponsored seat creates <strong>no order</strong>, charges <strong>no tax</strong> and
            accrues <strong>no teacher earning</strong> — nobody sold anything. The grant is
            recorded with source <code>scholarship</code> so a revenue report cannot mistake it for
            a sale.
          </div>

          <p className="muted">{ZAKAT_HONESTY}</p>
        </>
      )}

      {!overview && !error && (
        <div className="notice warn">
          The desk came back unreadable. Nothing has changed — this page only reads until you press
          a button.
        </div>
      )}
    </div>
  );
}
