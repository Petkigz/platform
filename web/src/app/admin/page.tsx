import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchFlags, groupFlags } from '@/lib/flags';
import { FlagToggle } from './flag-toggle';
import { RevenueShareForm } from './revenue-share-form';

export const dynamic = 'force-dynamic';

/** One queue, exactly as `staff_attention()` shapes it. */
type AttentionQueue = {
  code: string;
  label: string;
  count: number;
  href: string;
  detail: string;
  feature: string | null;
  dormant: boolean;
};

type Attention = {
  generatedAt: string;
  waitingCount: number;
  queues: AttentionQueue[];
  canSeeFinance: boolean;
  canSeeGovernance: boolean;
  canSeeSupport: boolean;
};

/**
 * The admin flag dashboard.
 *
 * This is the page the standing architecture decision points at: build
 * everything, ship it off, turn it on from here.
 *
 * The register is read from `platform_settings`, which is privileged-only, so
 * a non-privileged visitor is redirected rather than shown an empty page — an
 * empty dashboard and a forbidden one look identical to the person staring at
 * it, and "you are not staff" is the more useful answer.
 *
 * Above the flags sits `staff_attention()`: every queue this person may work,
 * each with the count in it. This page is where `homeFor()` sends a platform or
 * governance admin on sign-in, so the first thing they read should be what is
 * waiting rather than a wall of switches. The queues are filtered in the
 * database, not here — a card this screen chose not to render would still have
 * been sent, and the count of refund requests is information a support agent
 * does not get.
 *
 * Three things the block says out loud:
 *
 *   - A zero is an answer. Every queue the reader may work is listed, empty or
 *     not; an absent card would be indistinguishable from a queue that does not
 *     exist.
 *   - A queue whose feature is switched off is marked `dormant`, not hidden.
 *     Turning a feature off stops new work arriving; it does not empty what is
 *     already there.
 *   - Nothing is counted twice. The total is the sum of the cards, not a
 *     separate query that could disagree with them.
 */
export default async function AdminPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const { data: attentionData, error: attentionError } = await supabase.rpc('staff_attention');
  if (attentionError) throw new Error(attentionError.message);
  const attention = attentionData as unknown as Attention | null;
  const queues = attention?.queues ?? [];
  const waiting = attention?.waitingCount ?? 0;
  const busy = queues.filter((q) => q.count > 0);
  const quiet = queues.filter((q) => q.count === 0);
  const dormant = queues.filter((q) => q.dormant);

  const flags = await fetchFlags(supabase);
  const groups = groupFlags(flags);
  const { data: shareSetting, error: shareError } = await supabase
    .from('platform_settings')
    .select('value_text')
    .eq('key', 'teaching.revenue_share_percent')
    .maybeSingle();
  if (shareError) throw new Error(shareError.message);
  const revenueSharePercent = Number(shareSetting?.value_text ?? 0);

  const on = flags.filter((f) => f.enabled).length;
  const deployGated = flags.filter((f) => f.gateType === 'code').length;
  const setupGated = flags.filter((f) => f.gateType === 'admin_setup').length;

  return (
    <div className="container section">
      <p className="eyebrow">Administration</p>
      <h1>What is waiting</h1>
      <p className="lede">
        {waiting === 0
          ? 'Nothing is waiting. Every queue you can work was checked, and every one reads zero.'
          : `${waiting} ${waiting === 1 ? 'thing is' : 'things are'} waiting across ${
              busy.length === 1 ? 'one queue' : `${busy.length} queues`
            }.`}
      </p>

      {busy.length > 0 ? (
        <div className="grid cols-3" style={{ marginTop: '1.5rem' }}>
          {busy.map((q) => (
          <Link
            key={q.code}
            href={q.href}
            className="card"
            style={{ display: 'block', padding: '1.1rem 1.25rem' }}
          >
            <div style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.1, color: 'var(--green-800)' }}>
              {q.count}
            </div>
            <div style={{ fontWeight: 600, marginTop: '0.15rem' }}>{q.label}</div>
            <p className="muted" style={{ fontSize: '0.85rem', margin: '0.35rem 0 0' }}>
              {q.detail}
            </p>
            {q.dormant ? (
              <p style={{ margin: '0.5rem 0 0' }}>
                <span className="badge neutral">Paused</span>{' '}
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  <code>{q.feature}</code> is off, so nothing new is arriving. What is
                  already here still needs a person.
                </span>
              </p>
            ) : null}
            </Link>
          ))}
        </div>
      ) : null}

      {busy.length === 0 ? (
        <p className="empty">
          No queue has anything in it. The switches below are the reason this page
          exists; nothing on it is asking for you today.
        </p>
      ) : null}

      {quiet.length > 0 ? (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
          Also checked and empty:{' '}
          {quiet.map((q, i) => (
            <span key={q.code}>
              {i > 0 ? ', ' : ''}
              <Link href={q.href}>{q.label}</Link> ({q.count})
            </span>
          ))}
          .
        </p>
      ) : null}

      {dormant.length > 0 ? (
        <div className="notice" style={{ marginTop: '1.25rem' }}>
          <strong>
            {dormant.length === 1 ? 'One queue is' : `${dormant.length} queues are`} paused
            by a feature switch
          </strong>
          : {dormant.map((q) => q.label).join(', ')}. Turning a feature off stops new work
          arriving; it does not empty what is already there, so anything in one of these
          still needs a person.
        </div>
      ) : null}

      <h2 style={{ marginTop: '2.5rem' }}>Feature flags</h2>
      <p className="lede">
        Everything is built and shipped off. Turn features on here as their
        preconditions are met.
      </p>

      <RevenueShareForm currentPercent={revenueSharePercent} />

      <div className="stats">
        <div>
          <div className="n">{on}</div>
          <div className="l">Enabled</div>
        </div>
        <div>
          <div className="n">{flags.length - on}</div>
          <div className="l">Off</div>
        </div>
        <div>
          <div className="n">{setupGated}</div>
          <div className="l">Need external setup</div>
        </div>
        <div>
          <div className="n">{deployGated}</div>
          <div className="l">Need a deploy</div>
        </div>
      </div>

      <div className="notice" style={{ marginTop: '1.5rem' }}>
        A flag marked <strong>needs a deploy</strong> cannot be switched on
        here, and the refusal is enforced in the database rather than by hiding
        the control. Each one carries the precondition that has to be true
        first — a flag with no written precondition is a bug waiting to be
        enabled.
      </div>

      {flags.length === 0 ? (
        <p className="empty">The flag register is empty.</p>
      ) : (
        groups.map((g) => (
          <div key={g.group}>
            <div className="outline-h">
              <h3>{g.group}</h3>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {g.flags.filter((f) => f.enabled).length} / {g.flags.length} on
              </span>
            </div>
            <div className="card">
              <ul className="lessons">
                {g.flags.map((f) => (
                  <FlagToggle
                    key={f.key}
                    flagKey={f.key}
                    enabled={f.enabled}
                    gateType={f.gateType}
                    preconditions={f.preconditions}
                  />
                ))}
              </ul>
            </div>
          </div>
        ))
      )}

      <h2 style={{ marginTop: '2.5rem' }}>Other administration</h2>
      <p>
        <Link href="/admin/settings">Controls</Link> — the numbers behind features
        that are already on: what a teacher may store, how many devices a learner
        may save to, how long a saved lesson plays, and the publication threshold.
        Only the ones your role owns are shown, and each change needs a reason.
      </p>
      <p>
        <Link href="/admin/certificates">Certificates</Link> — issue completion certificates and manage revocations with an audit-ready reason.
      </p>
      <p>
        <Link href="/admin/analytics">Analytics</Link> — what people do, kept
        forever, by event and by day. Aggregates only; a closed account keeps its
        rows and loses its name.
      </p>
      <p>
        <Link href="/admin/plans">Subscription plans</Link> — configure versioned terms, entitlements and recurring prices.
      </p>
      <p>
        <Link href="/admin/orders">Orders awaiting payment</Link> — the only orders
        whose total can still change: record a discount, tax, fee or rounding
        against one, or withdraw one (finance/platform admin).
      </p>
      <p>
        <Link href="/admin/financial-adjustments">Financial adjustments</Link> — append-only accounting corrections and earnings clawbacks (finance/platform admin).
      </p>
      <p>
        <Link href="/admin/reconciliation">Payment reconciliation</Link> — compare statement rows to settled transactions (finance/platform admin).
      </p>
      <p>
        <Link href="/admin/disputes">Payment disputes</Link> — track and review provider cases (finance/platform admin).
      </p>
      <p>
        <Link href="/admin/tax">Tax and transfer fees</Link> — what a buyer is
        charged on top of the price, by the country they buy from. No rule means
        no charge (finance/platform admin).
      </p>
      <p>
        <Link href="/admin/exchange-rates">Exchange rates</Link> — what one
        currency was worth in another, when, and who said so. Every converted
        total rests on a row here (finance/platform admin).
      </p>
      <p>
        <Link href="/admin/money-report">Money report</Link> — what moved in a
        period, in the one currency the platform is read in, with the rate beside
        every figure and the money it could not convert listed as a gap
        (finance/platform admin).
      </p>
      <p>
        <Link href="/admin/reviews">Assign reviews</Link> — courses waiting
        for a reviewer.
      </p>
      <p>
        <Link href="/admin/reviewers">Reviewer register</Link> — who applied to
        review, who has been checked, what each may judge, and what each has stood
        aside from (governance/platform admin). Nothing can be published until
        somebody here is verified.
      </p>
      <p>
        <Link href="/admin/guardians">Guardian verification</Link> — adults
        asking to be recognised as a child&rsquo;s parent. Off until{' '}
        <code>family.guardian_verification</code> is enabled.
      </p>
      <p>
        <Link href="/admin/refunds">Refund requests</Link> — money going back
        out. Approving is an agreement, not a transfer.
      </p>
      <p>
        <Link href="/admin/renewals">Renewals</Link> — every live subscription expanded forward at
        the price it was sold at, by month. It is what has been committed to, not what will arrive:
        nothing charges a renewal yet.
      </p>
      <p>
        <Link href="/admin/payouts">Teacher payouts</Link> — what teachers have
        asked to be paid, the refund hold that keeps a sale from being paid out
        before it can be reversed, and the one action that marks an earning
        paid. Recording a payout is not sending one.
      </p>
      <p>
        <Link href="/admin/reports">Content reports</Link> — problems readers
        flagged in a lesson or an answer. Closing one needs a written note.
      </p>
      <p>
        <Link href="/admin/media">Uploaded media</Link> — every master anybody
        has uploaded. Quarantine holds one for review and withdraws every copy
        derived from it; withdrawing ends its use but keeps the object. Both
        need a written reason.
      </p>
      <p>
        <Link href="/admin/promotions">Promotions</Link> — codes and offers, which
        countries each applies in, and how many times a family may use one.
      </p>
      <p>
        <Link href="/admin/roles">Roles</Link> — who may do what. Every check in
        the database reads these; granting or revoking needs a written reason.
      </p>
      <p>
        <Link href="/admin/appeals">Appeals</Link> — teachers contesting a
        reviewer&rsquo;s rejection. You cannot decide an appeal against your own
        decision.
      </p>
      <p>
        <Link href="/admin/discussion">Discussion queue</Link> — learner
        questions and peer answers held for review. Empty until{' '}
        <code>learning.discussion</code> is enabled.
      </p>
      <p>
        <Link href="/admin/support">Support queue</Link> — requests people
        opened from <Link href="/support">Help</Link>. Turning{' '}
        <code>platform.support</code> off stops new ones; it does not close the
        cases already in flight, which stay answerable here.
      </p>

      <p>
        <Link href="/admin/messages">Messages</Link> — what the platform would
        send, rendered and recorded. Nothing leaves the building until a
        delivery provider is configured, which is why{' '}
        <code>delivery.notifications</code> ships off.
      </p>

      <p>
        <Link href="/admin/course-reviews">Course review queue</Link> — learner
        ratings that include words, held until someone reads them. Ratings
        alone are published immediately. Off until{' '}
        <code>learning.reviews</code> is enabled, and never part of scholarly
        review.
      </p>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
