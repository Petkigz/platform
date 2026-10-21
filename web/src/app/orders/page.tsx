import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { format, fromMinor } from '@/lib/money';
import { describeOrderAdjustment, describeOrderBreakdown } from '@/lib/checkout';
import { RefundForm } from './refund-form';

export const dynamic = 'force-dynamic';

type AdjustmentRow = {
  id: string;
  adjustment_type: string;
  direction: 'debit' | 'credit';
  amount_minor: string | number;
  currency_code: string;
  description: string | null;
  voided_at: string | null;
  voided_reason: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  currency_code: string;
  subtotal_minor: string | number;
  discount_minor: string | number;
  tax_minor: string | number;
  fee_minor: string | number;
  total_minor: string | number;
  paid_at: string | null;
  created_at: string;
  order_items: {
    id: string;
    item_snapshot: { title?: string } | null;
  }[] | null;
  order_adjustments: AdjustmentRow[] | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Not started',
  pending_payment: 'Awaiting payment',
  awaiting_confirmation: 'Payment in progress',
  paid: 'Paid',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  failed: 'Failed',
  expired: 'Expired',
};

/**
 * My orders.
 *
 * This page is the payer's answer to "did it work?", and it is the return URL
 * for a provider redirect. That makes its honesty load-bearing: someone comes
 * back here from a payment screen expecting to be let in.
 *
 * So it does not infer success from having been redirected. The order's status
 * comes from the database, which only `record_payment_success()` can set to
 * paid, and that only happens on a verified provider event. A redirect that
 * arrives before the webhook lands shows "awaiting payment" — which is the
 * truth, and better than a green tick that turns out to be wrong.
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { pending } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/orders');

  const { data: memberships } = await supabase
    .from('billing_account_memberships')
    .select('billing_account_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const accountIds = ((memberships ?? []) as { billing_account_id: string }[]).map(
    (m) => m.billing_account_id,
  );

  const orders: OrderRow[] =
    accountIds.length === 0
      ? []
      : (((
          await supabase
            .from('orders')
            .select(
              'id, status, currency_code, subtotal_minor, discount_minor, tax_minor, ' +
              'fee_minor, total_minor, paid_at, created_at, ' +
              'order_items ( id, item_snapshot ), ' +
              // A payer may read the adjustments on their own order, including
              // withdrawn ones: without them the total on this page cannot be
              // reconstructed from anything the payer can see.
              'order_adjustments ( id, adjustment_type, direction, amount_minor, ' +
              'currency_code, description, voided_at, voided_reason )',
            )
            .in('billing_account_id', accountIds)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
        ).data ?? []) as unknown as OrderRow[]);

  // The order the payer was just redirected back from, if that is why they are
  // here. Looked up in the list already fetched rather than queried separately,
  // so the status shown in the banner is exactly the status in the table.
  const returned = pending ? orders.find((o) => o.id === pending) : undefined;

  return (
    <main className="page narrow">
      <div className="page-head">
        <p className="eyebrow">Account</p>
        <h1>My orders</h1>
      </div>

      {returned && returned.status !== 'paid' && (
        <div className="notice warn">
          <strong>Still waiting on confirmation.</strong> You came back from the
          payment screen, but the payment has not been confirmed yet. Access
          opens the moment it is — you can leave this page and come back.
        </div>
      )}

      {returned && returned.status === 'paid' && (
        <div className="notice">
          <strong>Payment confirmed.</strong> Access is open.{' '}
          <Link href="/learn">Go to my learning</Link>.
        </div>
      )}

      {orders.length === 0 ? (
        <p className="muted">
          You have not placed any orders yet.{' '}
          <Link href="/catalogue">Browse the catalogue</Link>.
        </p>
      ) : (
        <section className="card">
          <ul className="lessons">
            {orders.map((o) => {
              const title =
                o.order_items?.[0]?.item_snapshot?.title ?? 'Order';
              const amount = format(
                fromMinor(o.total_minor, o.currency_code),
              );
              const paid = o.status === 'paid';
              // Null when the total is the whole story, which it is for nearly
              // every order: no discount, no tax, no fee.
              const breakdown = describeOrderBreakdown({
                currencyCode: o.currency_code,
                subtotalMinor: String(o.subtotal_minor ?? 0),
                discountMinor: String(o.discount_minor ?? 0),
                taxMinor: String(o.tax_minor ?? 0),
                feeMinor: String(o.fee_minor ?? 0),
                totalMinor: String(o.total_minor ?? 0),
              });
              const adjustments = (o.order_adjustments ?? []).map((a) =>
                describeOrderAdjustment({
                  id: a.id,
                  adjustment_type: a.adjustment_type,
                  direction: a.direction,
                  // PostgREST sends a bigint as a JSON number; money is a
                  // decimal integer string everywhere else, so it becomes one
                  // here rather than being formatted as a float.
                  amount_minor: String(a.amount_minor),
                  currency_code: a.currency_code,
                  description: a.description,
                  voided_at: a.voided_at,
                  voided_reason: a.voided_reason,
                }),
              );
              return (
                <li key={o.id}>
                  <span className="t">
                    {title}
                    <span className="muted"> · {amount}</span>
                    {breakdown && (
                      <span className="muted" style={{ display: 'block' }}>
                        {breakdown}
                      </span>
                    )}
                    {adjustments.map((line, i) => (
                      <span
                        key={`${o.id}-adjustment-${i}`}
                        className="muted"
                        style={{ display: 'block' }}
                      >
                        {line}
                      </span>
                    ))}
                  </span>
                  <span
                    className={`badge ${paid ? 'ok' : 'neutral'}`}
                  >
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  {paid && (
                    <Link href="/learn" className="btn secondary">
                      Start learning
                    </Link>
                  )}
                  {o.status === 'pending_payment' && (
                    <span className="muted">
                      Not paid — no access yet
                    </span>
                  )}
                  {(o.status === 'paid' || o.status === 'partially_refunded') && (
                    <RefundForm
                      orderId={o.id}
                      amountMinor={o.total_minor}
                      currencyCode={o.currency_code}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="muted">
        Access is granted when a payment is confirmed against a verified provider
        event. Returning from a payment screen is not itself confirmation.
      </p>
    </main>
  );
}
