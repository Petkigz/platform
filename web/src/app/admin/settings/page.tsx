import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { parseControls } from '@/lib/controls';
import { ControlForm } from './control-form';

export const dynamic = 'force-dynamic';

/**
 * The controls: the numbers and words that decide how a feature behaves.
 *
 * This is not the flag dashboard. A flag is a switch — built, shipped off, turned
 * on when its preconditions are met. A control is the number behind a switch
 * that is already on: what a teacher may store, how many devices one learner may
 * save to, how long a saved lesson plays, which URL carries a live class, how
 * many approvals a course needs before it teaches anything.
 *
 * Until now ten of them could only be changed with an UPDATE against a table
 * nobody outside this repository can see, which is the shape the standing role
 * rule rejects.
 *
 * Three things this page is careful about.
 *
 * **It shows only what this person may change.** The filtering happens in
 * `platform_controls()`, not here — a control sent to the browser and then hidden
 * is still sent, and the value of some of these is not a number to hand every
 * role. The same rule the attention screen follows.
 *
 * **It says that other controls exist.** A finance admin seeing two fields should
 * not conclude the platform has two, so the page names how many others there are
 * and says who owns them, without naming a value.
 *
 * **The numbers that already have a home are not here.** The revenue share, the
 * payout hold and the refund window each have a writer that does more than store
 * a number — the revenue share snapshots into every future earning, the payout
 * policy has two gates — and each lives beside the feature it governs. This page
 * links to them rather than duplicating them, because two doors to one number is
 * how the two doors start to disagree.
 */
export default async function AdminSettingsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/settings');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const { data, error } = await supabase.rpc('platform_controls');
  if (error) throw new Error(error.message);
  const result = parseControls(data);
  const others = Math.max(0, result.totalControls - result.mineCount);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Controls</h1>
      <p className="lede">
        The numbers behind features that are already on. A switch decides whether
        something happens; a control decides how much, how long or how many.
      </p>

      {result.controls.length === 0 ? (
        <div className="notice warn">
          <strong>None of these are yours to change.</strong> You are staff, so you
          can work the queues — but every control here belongs to a role whose job
          it is. Ask the platform owner if one needs to move.
        </div>
      ) : (
        result.controls.map((control) => (
          <ControlForm key={control.key} control={control} />
        ))
      )}

      {others > 0 ? (
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          {others === 1 ? 'One other control exists' : `${others} other controls exist`} and
          are not yours. Each belongs to the role whose work it decides: money to
          finance, publication rules to governance, storage and devices to the
          platform owner.
        </p>
      ) : null}

      <h2 style={{ marginTop: '2.5rem' }}>Changed somewhere else, on purpose</h2>
      <p className="muted">
        Three numbers have their own writer because they do more than store a value,
        and each sits beside the feature it governs:
      </p>
      <ul className="lessons">
        <li>
          <span className="t">
            <Link href="/admin">Teacher revenue share</Link>
            <span className="muted" style={{ display: 'block' }}>
              On the flag dashboard, because every earning snapshots the share it
              accrued under and a change must not rewrite history.
            </span>
          </span>
        </li>
        <li>
          <span className="t">
            <Link href="/admin/payouts">Refund hold before a payout</Link>
            <span className="muted" style={{ display: 'block' }}>
              On the payout queue, beside the requests the hold makes safe.
            </span>
          </span>
        </li>
        <li>
          <span className="t">
            <Link href="/admin/refunds">How long a customer has to ask for a refund</Link>
            <span className="muted" style={{ display: 'block' }}>
              On the refund queue, beside the people already inside it.
            </span>
          </span>
        </li>
      </ul>

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        Feature switches are not here: they live on the{' '}
        <Link href="/admin">flag dashboard</Link>, and this page refuses them by
        name rather than quietly accepting a key it does not own.
      </p>
    </div>
  );
}
