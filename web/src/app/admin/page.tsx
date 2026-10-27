import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchFlags, groupFlags } from '@/lib/flags';
import { FlagToggle } from './flag-toggle';
import { RevenueShareForm } from './revenue-share-form';
import { consoleSections, switchboardNotice, type StaffFacts } from '@/lib/admin-console';
import { emptyQueueLede, outstandingSteps } from '@/lib/setup';
import { fetchSetupFacts } from './setup-query';
import { SetupPanel } from './setup-panel';

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

type ConsoleLink = { href: string; label: string; note: string };

/**
 * The screens below the queues, grouped by who may open them.
 *
 * Each group matches the gate its page actually enforces — the money screens
 * redirect anybody without `finance_admin` or `platform_admin`, so a support
 * agent is not shown them here. A link that refuses is worse than no link: it
 * teaches the reader that this page cannot be trusted to know what they may do.
 *
 * A screen whose page gate is `is_privileged` is in `sharedLinks`, whoever it
 * belongs to conceptually. Being honest about the gate beats being tidy about
 * the filing.
 */
const moneyLinks: ConsoleLink[] = [
  { href: '/admin/orders', label: 'Orders awaiting payment', note: 'the only orders whose total can still change: record a discount, tax, fee or rounding against one, or withdraw one' },
  { href: '/admin/refunds', label: 'Refund requests', note: 'money going back out. Approving is an agreement, not a transfer' },
  { href: '/admin/financial-adjustments', label: 'Financial adjustments', note: 'append-only accounting corrections and earnings clawbacks' },
  { href: '/admin/reconciliation', label: 'Payment reconciliation', note: 'signed statement rows against the internal ledger' },
  { href: '/admin/disputes', label: 'Payment disputes', note: 'a chargeback has a deadline; the provider decides what happens if it passes' },
  { href: '/admin/tax', label: 'Tax and transfer fees', note: 'what a buyer is charged on top of the price, by the country they buy from' },
  { href: '/admin/exchange-rates', label: 'Exchange rates', note: 'what one currency was worth in another, when, and who said so' },
  { href: '/admin/revenue', label: 'Revenue analytics', note: 'what sold in a period by currency, course, plan and teacher, with refunds beside the sale and never netted out of sight' },
  { href: '/admin/money-report', label: 'Money report', note: 'what moved in a period, in the one currency the platform is read in, with the rate beside every figure' },
  { href: '/admin/renewals', label: 'Renewals', note: 'every live subscription expanded forward at the price it was sold at. Committed, not arrived — nothing charges a renewal yet' },
  { href: '/admin/payouts', label: 'Teacher payouts', note: 'what teachers have asked to be paid, and the refund hold that keeps a sale from leaving before it can be reversed' },
];

const publicationLinks: ConsoleLink[] = [
  { href: '/admin/courses', label: 'Courses', note: 'every course, which door it stands behind and how many learners it holds. Changing an audience is recorded against your name, with both sides of the change' },
  { href: '/admin/teachers', label: 'Teachers', note: 'the people asking to teach, and everyone who may teach here with what each has published and how many learners their courses hold. Approving an application is the appointment: it grants the role, with your reason against the applicant' },
  { href: '/admin/reviews', label: 'Assign reviews', note: 'courses waiting for a reviewer' },
  { href: '/admin/subjects', label: 'Subject areas', note: 'the vocabulary of the catalogue: what a learner can filter by, and what a badge on a course card may say. A subject in use by a live course cannot be retired' },
  { href: '/admin/reviewers', label: 'Reviewer register', note: 'who applied to review, who has been checked, and what each may judge. Nothing publishes until somebody here is verified' },
];

const sponsorshipLinks: ConsoleLink[] = [
  { href: '/admin/sponsorships', label: 'Sponsored seats', note: 'learners asking for a course, and donors paying for one. Deciding needs a written reason and recording a payment needs a reference; a sponsored seat is not an order, so it carries no tax and no teacher earning' },
];

const referralLinks: ConsoleLink[] = [
  { href: '/admin/referrals', label: 'Invitations', note: 'who invited whom, what it earned and what the yearly cap or a refund stopped. Both rewards are discounts on a course — nothing is paid out, so there is no balance here' },
];

const supportLinks: ConsoleLink[] = [
  { href: '/admin/support', label: 'Support queue', note: 'requests people opened from Help. Turning the feature off stops new ones; it does not close what is in flight' },
];

const sharedLinks: ConsoleLink[] = [
  { href: '/admin/users', label: 'Users', note: 'every account on the platform, searchable by name or email — accounts, not children' },
  { href: '/admin/settings', label: 'Controls', note: 'the numbers behind features that are already on. Only the ones your role owns are shown, and each change needs a reason' },
  { href: '/admin/reports', label: 'Content reports', note: 'problems readers flagged in a lesson or an answer. Closing one needs a written note' },
  { href: '/admin/media', label: 'Uploaded media', note: 'every master anybody has uploaded. Quarantine and withdrawal both need a written reason' },
  { href: '/admin/course-reviews', label: 'Course review queue', note: 'learner ratings that include words, held until someone reads them' },
  { href: '/admin/discussion', label: 'Discussion queue', note: 'learner questions and peer answers held for review' },
  { href: '/admin/messages', label: 'Messages', note: 'what the platform would send, rendered and recorded. Nothing leaves the building until a provider is configured' },
  { href: '/admin/plans', label: 'Subscription plans', note: 'versioned terms, entitlements and recurring prices' },
  { href: '/admin/certificates', label: 'Certificates', note: 'issue completion certificates and record revocations with a reason' },
  { href: '/admin/analytics', label: 'Analytics', note: 'what people do, kept forever, by event and by day. Aggregates only' },
  { href: '/admin/guardians', label: 'Guardian verification', note: 'adults asking to be recognised as a child’s parent' },
  { href: '/admin/appeals', label: 'Appeals', note: 'teachers contesting a rejection. You cannot decide an appeal against your own decision' },
  { href: '/admin/roles', label: 'Roles', note: 'who may do what. Every check in the database reads these' },
];

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
 * each with the count in it. This page is where `homeFor()` sends every staff
 * member on sign-in, so the first thing they read should be what is waiting
 * rather than a wall of switches. The queues are filtered in the database, not
 * here — a card this screen chose not to render would still have been sent, and
 * the count of refund requests is information a support agent does not get.
 *
 * Below the queues the page is **grouped by whose work it is**, from the same
 * three booleans `staff_attention()` already returns. The switchboard — the flag
 * register and the revenue share — is only rendered for the platform admin,
 * because only the platform admin may write either; the table refuses anybody
 * else, so a control here would be a promise the database would not keep.
 * Everyone else is told whose the switches are, in one sentence, rather than
 * shown ninety toggles that would each fail.
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

  // Four kinds of staff share this address. The queues were already filtered in
  // the database; this decides what else they are shown — and, for anyone who is
  // not the owner, whether the switchboard is on the page at all.
  const { data: platformRole } = await supabase.rpc('has_role', {
    p_user_id: user.id,
    p_role_code: 'platform_admin',
  });
  const facts: StaffFacts = {
    platformAdmin: platformRole === true,
    financeAdmin: attention?.canSeeFinance === true,
    governanceAdmin: attention?.canSeeGovernance === true,
    supportAgent: attention?.canSeeSupport === true,
  };
  const sections = consoleSections(facts);

  const queues = attention?.queues ?? [];
  const waiting = attention?.waitingCount ?? 0;
  const busy = queues.filter((q) => q.count > 0);
  const quiet = queues.filter((q) => q.count === 0);
  const dormant = queues.filter((q) => q.dormant);

  // The register is only read for the person who may change it. A support agent
  // reading ninety switches they cannot flip is ninety opportunities to believe
  // this page is broken.
  const flags = sections.switchboard ? await fetchFlags(supabase) : [];
  const groups = groupFlags(flags);
  let revenueSharePercent = 0;
  if (sections.switchboard) {
    const { data: shareSetting, error: shareError } = await supabase
      .from('platform_settings')
      .select('value_text')
      .eq('key', 'teaching.revenue_share_percent')
      .maybeSingle();
    if (shareError) throw new Error(shareError.message);
    revenueSharePercent = Number(shareSetting?.value_text ?? 0);
  }

  // Is there anything here yet? Only the platform admin can create the first
  // reviewer or publish the first course, so only they are shown the list.
  const setupFacts = sections.switchboard ? await fetchSetupFacts(supabase) : null;
  const setupSteps = setupFacts ? outstandingSteps(setupFacts) : [];

  const on = flags.filter((f) => f.enabled).length;
  const deployGated = flags.filter((f) => f.gateType === 'code').length;
  const setupGated = flags.filter((f) => f.gateType === 'admin_setup').length;

  return (
    <div className="container section">
      <p className="eyebrow">Administration</p>
      <h1>What is waiting</h1>
      <p className="lede">
        {waiting === 0
          ? (setupFacts && emptyQueueLede(setupFacts))
            ?? 'Nothing is waiting. Every queue you can work was checked, and every one reads zero.'
          : `${waiting} ${waiting === 1 ? 'thing is' : 'things are'} waiting across ${
              busy.length === 1 ? 'one queue' : `${busy.length} queues`
            }.`}
      </p>

      {setupFacts && (
        <SetupPanel facts={setupFacts} steps={setupSteps} />
      )}

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

      {sections.switchboard ? (
        <>
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
        </>
      ) : (
        <div className="notice" style={{ marginTop: '2.5rem' }}>
          {switchboardNotice(facts)}
        </div>
      )}

      {sections.money ? (
        <>
          <h2 style={{ marginTop: '2.5rem' }}>Money</h2>
          <p className="lede">
            What was charged, what goes back, what is owed to a teacher, and the
            rates every converted figure rests on. Every writer here needs a
            written reason.
          </p>
          {[...moneyLinks, ...sponsorshipLinks, ...referralLinks].map((link) => (
            <p key={link.href}>
              <Link href={link.href}>{link.label}</Link> — {link.note}
            </p>
          ))}
        </>
      ) : null}

      {sections.publication ? (
        <>
          <h2 style={{ marginTop: '2.5rem' }}>Publication</h2>
          {publicationLinks.map((link) => (
            <p key={link.href}>
              <Link href={link.href}>{link.label}</Link> — {link.note}
            </p>
          ))}
        </>
      ) : null}

      {sections.support ? (
        <>
          <h2 style={{ marginTop: '2.5rem' }}>Support</h2>
          {supportLinks.map((link) => (
            <p key={link.href}>
              <Link href={link.href}>{link.label}</Link> — {link.note}
            </p>
          ))}
        </>
      ) : null}

      {sections.moderation ? (
        <>
          <h2 style={{ marginTop: '2.5rem' }}>Everyone&rsquo;s work</h2>
          <p className="lede">
            Any member of staff may work these. They are listed for every role
            because none of them is one role&rsquo;s private queue.
          </p>
          {sharedLinks.map((link) => (
            <p key={link.href}>
              <Link href={link.href}>{link.label}</Link> — {link.note}
            </p>
          ))}
        </>
      ) : null}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
