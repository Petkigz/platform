import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  EMPTY_PLAN,
  type RetentionPlan,
} from '@/lib/retention';
import { RetentionConsole } from './retention-console';

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

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Retention clock</h1>
      <p className="lede">
        What the privacy notice promises to delete, and when. Two things are kept on a
        clock — a closed support case, and a record that an adult who teaches was checked —
        and nothing else on this platform outlives the account it belongs to.
      </p>

      <RetentionConsole plan={plan} canRun={platform === true} />

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
            <strong>It does not delete a child&rsquo;s learning record</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              The children&rsquo;s policy promises that a child&rsquo;s record goes thirty days
              after the guardian&rsquo;s account closes. That is a third clock and it is not
              wound yet: it is a delete across enrolments, progress, submissions, attempts and
              attendance, and it needs its own suite rather than a line in this one.
            </span>
          </li>
          <li>
            <strong>It does not touch the sign-in address</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              That lives with the authentication provider. Closing an account scrubs this
              database and cannot scrub the identity provider from inside it.
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
