import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  normaliseOrdersOverview,
  QUEUE_LIMIT_MAX,
} from '@/lib/order-adjustments';
import { OrderQueue } from './order-queue';

export const dynamic = 'force-dynamic';

/**
 * Orders awaiting payment.
 *
 * The only orders on this screen are the ones whose total can still change.
 * `orders_read` is `is_billing_member()`, so finance cannot read a single order
 * through PostgREST — which is right for a payer's invoice — and the list comes
 * from `admin_orders_overview()` instead, a definer reader gated on the same
 * role pair as the two writers it feeds. Widening the policy to every
 * privileged role would have handed every order on the platform to
 * `support_agent`, whose job is one order that already has a case open.
 *
 * Paid orders are deliberately absent. Their total is history — a capture and
 * the teacher's earnings were written from it — so the instruments for them are
 * on `/admin/reconciliation` and `/admin/financial-adjustments`, and a row here
 * with a button that always refuses would only teach people to click and read
 * errors.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { limit } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/orders');

  const [{ data: platformAdmin }, { data: financeAdmin }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
  ]);
  if (platformAdmin !== true && financeAdmin !== true) redirect('/admin');

  const requested = Number.parseInt(limit ?? '', 10);
  const pageLimit = Number.isFinite(requested) && requested > 0
    ? Math.min(requested, QUEUE_LIMIT_MAX)
    : 50;

  const { data, error } = await supabase.rpc('admin_orders_overview', { p_limit: pageLimit });
  if (error) throw new Error(error.message);

  // Recounted from the array rather than trusting the reader's own count: a
  // screen that shows a count and a list which disagree is worse than either.
  const overview = normaliseOrdersOverview(data);

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/admin">Administration</Link></p>
      <h1>Orders awaiting payment</h1>
      <p className="lede">
        An order's total is derived from its lines and its adjustments, and can only be
        changed while it is unpaid. A discount, a tax, a fee or a rounding recorded here
        is audited, is visible to the payer on their own invoice, and is what the payment
        and the teacher's earnings are then calculated from.
      </p>

      <OrderQueue orders={overview.orders} limit={overview.limit} />

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        After payment, a correction is a{' '}
        <Link href="/admin/financial-adjustments">financial adjustment</Link> or a{' '}
        <Link href="/admin/refunds">refund</Link>, and a provider statement is settled on{' '}
        <Link href="/admin/reconciliation">reconciliation</Link>.
      </p>
      <p><Link href="/admin">Back to administration</Link></p>
    </div>
  );
}
