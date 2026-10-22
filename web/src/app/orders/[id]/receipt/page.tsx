import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { format, fromMinor } from '@/lib/money';
import { PrintReceiptButton } from './print-button';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Adjustment = {
  id: string;
  adjustment_type: string;
  direction: 'debit' | 'credit';
  amount_minor: string | number;
  currency_code: string;
  description: string | null;
  voided_at: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  currency_code: string;
  subtotal_minor: string | number;
  discount_minor: string | number;
  total_minor: string | number;
  created_at: string;
  paid_at: string | null;
  payment_evidence: string | null;
  learner_profile_id: string | null;
  billing_account_id: string;
  order_items:
    | {
        id: string;
        quantity: number;
        unit_price_minor: string | number;
        item_snapshot: { title?: string } | null;
      }[]
    | null;
  order_adjustments: Adjustment[] | null;
  payment_attempts:
    | {
        id: string;
        provider: string;
        method: string | null;
        provider_reference: string | null;
        status: string;
        resolved_at: string | null;
      }[]
    | null;
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

const SETTLED = new Set(['paid', 'partially_refunded', 'refunded']);

function date(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * A receipt.
 *
 * The order list could say "paid" and nothing more, so a family had no document and no
 * reference — the only identifier was a UUID, which is not something anyone reads down
 * a phone. `order_number` is assigned by the database and cannot be rewritten, so the
 * number on this page is the number on the order.
 *
 * Every figure is read from the order, never recomputed here: a receipt that did its
 * own arithmetic could disagree with the bill. If the order has not been paid, the page
 * says so plainly and is not a receipt — that is the same honesty the rest of the money
 * path keeps about confirmation.
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { id: raw } = await params;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    notFound();
  }
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/orders/${id}/receipt`)}`);

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, currency_code, subtotal_minor, discount_minor, ' +
        'total_minor, created_at, paid_at, payment_evidence, learner_profile_id, ' +
        'billing_account_id, ' +
        'order_items ( id, quantity, unit_price_minor, item_snapshot ), ' +
        'order_adjustments ( id, adjustment_type, direction, amount_minor, ' +
        'currency_code, description, voided_at ), ' +
        'payment_attempts ( id, provider, method, provider_reference, status, resolved_at )',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const order = data as unknown as OrderRow;

  // Read through the caller's own policies: a guardian sees the learner's name, a
  // billing manager who pays for a family they do not parent does not — and the
  // receipt is still complete without it.
  const [account, learner, refunds] = await Promise.all([
    supabase
      .from('billing_accounts')
      .select('display_name')
      .eq('id', order.billing_account_id)
      .maybeSingle(),
    order.learner_profile_id
      ? supabase
          .from('learner_profiles')
          .select('display_name')
          .eq('id', order.learner_profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('refund_transactions')
      .select('id, amount_minor, currency_code, status, refunded_at')
      .eq('order_id', order.id),
  ]);

  const settled = SETTLED.has(order.status);
  const money = (amount: string | number) =>
    format(fromMinor(String(amount ?? 0), order.currency_code));

  const lines = order.order_items ?? [];
  const credits = (order.order_adjustments ?? []).filter(
    (a) => !a.voided_at && a.direction === 'credit',
  );
  const refunded = (refunds.data ?? []) as {
    id: string;
    amount_minor: string | number;
    currency_code: string;
    status: string;
    refunded_at: string | null;
  }[];
  const refundedTotal = refunded
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + BigInt(String(r.amount_minor)), 0n);

  const payments = order.payment_attempts ?? [];
  const paidThrough = payments.find((p) => p.status === 'succeeded') ?? null;

  return (
    <div className="container section receipt-page">
      <div className="row no-print" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="eyebrow">
          <Link href="/orders">My orders</Link>
        </p>
        <PrintReceiptButton />
      </div>

      {!settled && (
        <div className="notice warn no-print" role="status">
          <strong>This is not a receipt.</strong> The order has not been paid, so nothing
          has been charged. What follows is the order as it stands.
        </div>
      )}

      <article className="receipt-sheet">
        <header className="receipt-head">
          <div>
            <p className="receipt-brand">
              <span className="certificate-mark" aria-hidden="true" /> AyahSpring
            </p>
            <h1>{settled ? 'Receipt' : 'Order'}</h1>
          </div>
          <div className="receipt-number">
            <span className="receipt-label">Number</span>
            <strong>{order.order_number}</strong>
            <span className="receipt-meta">Issued {date(order.paid_at ?? order.created_at)}</span>
          </div>
        </header>

        <dl className="facts receipt-facts">
          <div>
            <dt>Billed to</dt>
            <dd>
              {(account.data as { display_name?: string } | null)?.display_name ?? 'Account holder'}
            </dd>
          </div>
          {learner.data && (
            <div>
              <dt>For</dt>
              <dd>{(learner.data as { display_name: string }).display_name}</dd>
            </div>
          )}
          <div>
            <dt>Status</dt>
            <dd>{STATUS_LABEL[order.status] ?? order.status}</dd>
          </div>
          {settled && (
            <div>
              <dt>Paid on</dt>
              <dd>{date(order.paid_at)}</dd>
            </div>
          )}
        </dl>

        <table className="receipt-lines">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Qty</th>
              <th scope="col" className="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  No line items are recorded on this order.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.item_snapshot?.title ?? 'Course'}</td>
                  <td>{line.quantity}</td>
                  <td className="amount">{money(line.unit_price_minor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="receipt-total">
          <dl className="facts">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(order.subtotal_minor)}</dd>
            </div>
            {credits.map((line) => (
              <div key={line.id}>
                <dt>
                  {line.adjustment_type === 'promotion' ? 'Discount' : line.adjustment_type}
                </dt>
                <dd>
                  −{money(line.amount_minor)}
                  {line.description && <span className="receipt-meta"> · {line.description}</span>}
                </dd>
              </div>
            ))}
            <div className="receipt-due">
              <dt>{settled ? 'Total paid' : 'Total due'}</dt>
              <dd>
                <strong>{money(order.total_minor)}</strong>
              </dd>
            </div>
            {refundedTotal > 0n && (
              <div>
                <dt>Refunded</dt>
                <dd>
                  {format(fromMinor(refundedTotal.toString(), order.currency_code))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {settled && (
          <section className="receipt-payment">
            <h2>Payment</h2>
            {paidThrough ? (
              <p>
                {paidThrough.provider.replace(/_/g, ' ')}
                {paidThrough.method && ` · ${paidThrough.method.replace(/_/g, ' ')}`}
                {paidThrough.provider_reference && (
                  <>
                    {' · reference '}
                    <strong>{paidThrough.provider_reference}</strong>
                  </>
                )}
              </p>
            ) : (
              <p className="muted">
                Confirmed by {order.payment_evidence ?? 'a recorded payment'}.
              </p>
            )}
            {refunded.length > 0 && (
              <ul className="receipt-refunds">
                {refunded.map((refund) => (
                  <li key={refund.id}>
                    {refund.status === 'completed' ? 'Refunded' : `Refund ${refund.status}`}{' '}
                    {format(fromMinor(String(refund.amount_minor), refund.currency_code))}
                    {refund.refunded_at && ` on ${date(refund.refunded_at)}`}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="receipt-foot">
          <p>
            This document is generated from the order record held by AyahSpring. It is
            not a tax invoice.
          </p>
          <p className="receipt-meta">
            Order {order.order_number} · {order.currency_code}
          </p>
        </footer>
      </article>

      <p className="no-print" style={{ marginTop: '1.5rem' }}>
        <Link href="/orders">Back to my orders</Link>
      </p>
    </div>
  );
}
