import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  EMPTY_PLAN,
  type RetentionPlan,
} from '@/lib/retention';
import {
  EMPTY_IDENTITY_QUEUE,
  parseIdentityQueue,
  type IdentityQueue,
} from '@/lib/identity';
import { RetentionConsole } from './retention-console';
import { IdentityPanel } from './identity-panel';

export const dynamic = 'force-dynamic';

/**
 * The retention clock, read before it is wound.
 *
 * Three things this page is for:
 *
 * 1. **Saying what the rules are, from the plan rather than from copy.** The
 *    numbers come out of `retention_plan()`, which is the same function the
 *    cleanup uses, so a screen that says "three years" and a job that deletes
 *    after four is not a state this page can be in.
 *
 * 2. **Showing the cases outside the rule.** A case nobody closed has no clock,
 *    and a page that showed only "0 due" would be right and misleading at once.
 *
 * 3. **Letting the owner press it.** A deletion that can only be performed by
 *    opening `psql` is a deletion that either does not happen or happens without
 *    a record. The press is here, behind the gate the database enforces anyway.
 *
 * 4. **Counting what this database cannot delete.** The sign-in lives at the
 *    authentication provider, so a closed account kept a live sign-in for three
 *    units while the answer sat in a document. It is a queue here: every closed
 *    account whose identity is still at the provider, the press that records the
 *    deletion once it is done, and the lookup that answers "is it gone?" for
 *    somebody who can no longer sign in to ask.
 *
 * Readable by the owner only: `retention_plan()` refuses everybody else, so a
 * redirect is the courtesy and not the defence.
 */
export default async function AdminRetentionPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/retention');

  const { data: platform } = await supabase.rpc('has_role', {
    p_user_id: user.id,
    p_role_code: 'platform_admin',
  });
  if (platform !== true) redirect('/');

  const { data, error } = await supabase.rpc('retention_plan', {});
  if (error) throw new Error(error.message);
  const plan = (data ?? EMPTY_PLAN) as unknown as RetentionPlan;

  // The sign-ins this database cannot delete. Read separately from the plan
  // because it is not a clock: nothing here falls due, and a screen that folded
  // it into "total to delete" would promise a deletion the cleanup cannot make.
  const { data: queueData } = await supabase.rpc('identity_removal_queue', {});
  const queue: IdentityQueue = queueData
    ? parseIdentityQueue(queueData)
    : EMPTY_IDENTITY_QUEUE;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Retention clock</h1>
      <p className="lede">
        What the privacy notice and the children&rsquo;s policy promise to delete, and when.
        Three things are kept on a clock — a closed support case, a record that an adult who
        teaches was checked, and a child&rsquo;s learning record once the guardian&rsquo;s
        account has closed — and nothing else on this platform outlives the account it
        belongs to.
      </p>

      <RetentionConsole plan={plan} canRun={platform === true} />

      <IdentityPanel queue={queue} />

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>What this page does not do</h3>
      </div>
      <div className="card">
        <ul className="lessons">
          <li>
            <strong>It does not close cases for you</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              A case that is never closed is kept forever, and no rule says it should be. The
              count above is how that gets noticed; closing one is on the{' '}
              <Link href="/admin/support">support queue</Link>.
            </span>
          </li>
          <li>
            <strong>It does not touch an adult&rsquo;s own learning record</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              The thirty days are the children&rsquo;s policy, and they start when somebody
              else&rsquo;s account closes. An adult who closes their own account is told, on{' '}
              <Link href="/account/delete">that page</Link>, that their enrolments and progress
              are kept — and keeping that sentence true matters more than making the two
              clocks look alike. Changing it is a decision, not a tidy-up.
            </span>
          </li>
          <li>
            <strong>It does not delete a certificate</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              A certificate keeps its number for ever, because somebody may have shown it to an
              employer. What goes is the evidence behind it — the enrolment — and the
              certificate records that on the day it happens.
            </span>
          </li>
          <li>
            <strong>It does not delete a sign-in</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              The sign-in lives with the authentication provider, and closing an account here
              cannot reach it. Every identity still left is counted above and recorded here
              once it is deleted there — the number is the queue, not a promise.
            </span>
          </li>
        </ul>
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}
