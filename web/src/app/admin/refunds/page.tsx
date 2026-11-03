import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchRefundQueue } from '@/lib/refunds';
import { format, fromMinor } from '@/lib/money';
import { DecideForm } from './decide-form';
import { OpenOnBehalfForm } from './open-on-behalf-form';
import { RefundWindowForm } from './window-form';

export const dynamic = 'force-dynamic';

/**
 * The refund queue.
 *
 * Approving here is a decision, not a payment. It creates a refund transaction
 * in `pending`; the money moves when the provider confirms and the transaction
 * completes, which is what writes the ledger entry and moves the order to
 * refunded. Nothing on this page can make money move on its own.
 *
 * That split is D4, and it is worth stating on the screen rather than only in
 * the schema, because the instinct when approving is to believe you have just
 * refunded someone. You have not — you have agreed to.
 */
export default async function AdminRefundsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/refunds');

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) redirect('/');

  // Only the explicitly configured owner can approve. Finance or a platform
  // admin may decline; the requester cannot decide their own request.
  const [{ data: financeAdmin }, { data: platformAdmin }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  const canDecide = financeAdmin === true || platformAdmin === true;
  const { data: approvalStatus, error: approvalError } = await supabase.rpc('refund_approval_status');
  const status = approvalStatus as { configured?: boolean; is_owner?: boolean } | null;
  const canApprove = !approvalError && status?.is_owner === true;

  const queue = await fetchRefundQueue(supabase);

  // The window is read from the register, which staff may read. A page that
  // enforced a number it could not show would leave the person changing it
  // guessing at the current value.
  const { data: windowRow } = await supabase
    .from('platform_settings')
    .select('value_text')
    .eq('key', 'commerce.refund_window_hours')
    .maybeSingle();
  const windowHours = Number((windowRow as { value_text?: string } | null)?.value_text ?? 72);

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Refunds</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Money out</p>
        <h1>Refund requests</h1>
        <p className="muted">
          Only the configured owner can approve a refund, and nobody can decide
          one they requested. Approval records a pending transaction; it does not
          send money to a provider or transfer money.
        </p>
      </div>

      {approvalError ? (
        <p className="notice warn">Could not verify refund approval authority. Approval is unavailable.</p>
      ) : status?.configured !== true ? (
        <p className="notice warn">Refund approval is unavailable until the operator configures the owner account.</p>
      ) : !canApprove ? (
        <p className="muted">Only the configured owner can approve refunds.</p>
      ) : null}

      {queue.length === 0 && (
        <p className="muted">No refund requests are waiting on a decision.</p>
      )}

      {queue.map((item) => (
        <section className="card" key={item.id}>
          <p className="eyebrow">
            {format(fromMinor(item.requested_amount_minor, item.currency_code))}
            {' · requested '}
            {new Date(item.created_at).toLocaleDateString()}
          </p>
          <blockquote style={{ margin: '0.5rem 0 1rem' }}>
            <p>{item.reason}</p>
            <footer className="muted">— {item.requester?.display_name ?? 'Unknown'}</footer>
          </blockquote>

          {item.requested_by === user.id ? (
            <p className="muted">You cannot decide a refund you requested yourself.</p>
          ) : canDecide ? (
            <DecideForm requestId={item.id} canApprove={canApprove} />
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Approval belongs to the configured owner; finance or a platform
              admin can decline. You can still open a request on a customer&rsquo;s behalf below.
            </p>
          )}
        </section>
      ))}

      <section className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>Open one on a customer&rsquo;s behalf</h2>
        <p className="muted">
          A customer can ask for a refund for 72 hours after their payment. After
          that the window has closed, and this form is how something still gets
          put right — a course sold wrong, a duplicate charge, a family who could
          not get to a phone inside three days. The window is a customer policy,
          not a lock on us.
        </p>
        <p className="muted">
          It needs a written reason, and the request is attributed to{' '}
          <strong>you</strong>; because nobody may decide a refund they opened,
          somebody else has to approve it. The audit trail records it as
          staff-opened, with no window, because the window did not apply.
        </p>
        <p className="muted">
          <strong>All of it, or part of it.</strong> The amount fills itself in
          with what is left on the order, and leaving it there refunds everything,
          which closes the course when the money settles. A smaller number is a
          goodwill part-refund for a course sold wrong or half delivered — and it
          leaves the learner&rsquo;s access in place, because they are still the
          person who paid for what they are still taking.
        </p>
        <OpenOnBehalfForm />
      </section>

      <section className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>How long a customer has</h2>
        <p className="muted">
          A refund can be asked for for <strong>{windowHours} hours</strong> after
          the payment. The clock runs from the payment, not from the request, and it
          is read in the database — so a browser cannot ask early or late.
        </p>
        <RefundWindowForm currentHours={windowHours} />
      </section>

      <p className="muted">
        Every decision is written to the governance audit trail with who made it
        and when.
      </p>
    </div>
  );
}
