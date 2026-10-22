'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { format, fromMinor } from '@/lib/money';
import { describeOrderAdjustment, describeOrderBreakdown } from '@/lib/checkout';
import {
  ADJUSTMENT_TYPES,
  QUEUE_LIMIT_MAX,
  summariseQueue,
  type QueueOrder,
} from '@/lib/order-adjustments';

/**
 * The order queue: what has not been paid yet, and what can still be changed
 * about it.
 *
 * One card per order, because the adjustment is about *this* order's total and
 * a form that asks for an order id is a form that can be pointed at the wrong
 * one. The totals are shown before and after in the same place, so the effect
 * of a discount is visible without a refresh of anything but the data.
 */
export function OrderQueue({ orders, limit }: { orders: QueueOrder[]; limit: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function send(payload: Record<string, string | null>, key: string): Promise<void> {
    setBusy(key);
    setMessage(null);
    setSaved(null);
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; totals?: { totalMinor?: string; currencyCode?: string } | null }
        | null;
      if (!response.ok || result?.ok !== true) {
        setMessage(result?.message ?? 'Could not record the adjustment.');
        return;
      }
      const totals = result?.totals;
      setSaved(
        totals?.totalMinor && totals?.currencyCode
          ? `Recorded. The order total is now ${format(fromMinor(totals.totalMinor, totals.currencyCode))}.`
          : 'Recorded.',
      );
      router.refresh();
    } catch {
      setMessage('Could not reach the order service.');
    } finally {
      setBusy(null);
    }
  }

  const totals = summariseQueue(orders);

  return (
    <>
      {message && <div className="notice error" role="alert">{message}</div>}
      {saved && <div className="notice" role="status">{saved}</div>}

      <div className="stats">
        <div>
          <span className="n">{orders.length}</span>
          <span className="l">orders awaiting payment</span>
        </div>
        {totals.map((t) => (
          <div key={t.currencyCode}>
            <span className="n">{format(fromMinor(t.totalMinor, t.currencyCode))}</span>
            <span className="l">
              across {t.orders} {t.orders === 1 ? 'order' : 'orders'} in {t.currencyCode}
            </span>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="empty">
          Nothing is waiting. An order appears here while it is still unpaid, which is the
          only time its total can be changed.
        </p>
      ) : (
        <div className="grid">
          {orders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              busy={busy}
              onAdd={(payload) => send(payload, `add:${order.orderId}`)}
              onVoid={(adjustmentId, reason) =>
                send(
                  { action: 'void_adjustment', adjustmentId, reason },
                  `void:${adjustmentId}`,
                )
              }
            />
          ))}
        </div>
      )}

      <p className="muted">
        Showing the {orders.length} most recent of up to {limit} unpaid orders (the reader
        stops at {QUEUE_LIMIT_MAX}). Once an order is paid its total is history: a capture
        and the teacher's earnings were written from it, so a later correction is a
        financial adjustment or a refund, not an edit.
      </p>
    </>
  );
}

function OrderCard({
  order,
  busy,
  onAdd,
  onVoid,
}: {
  order: QueueOrder;
  busy: string | null;
  onAdd: (payload: Record<string, string | null>) => void;
  onVoid: (adjustmentId: string, reason: string) => void;
}) {
  const [type, setType] = useState(ADJUSTMENT_TYPES[0]?.value ?? 'manual_discount');
  const [voidReason, setVoidReason] = useState<Record<string, string>>({});
  const chosen = ADJUSTMENT_TYPES.find((t) => t.value === type) ?? null;
  const breakdown = describeOrderBreakdown({
    currencyCode: order.currencyCode,
    subtotalMinor: order.subtotalMinor,
    discountMinor: order.discountMinor,
    taxMinor: order.taxMinor,
    feeMinor: order.feeMinor,
    totalMinor: order.totalMinor,
  });

  return (
    <article className="card">
      <div className="grid cols-2">
        <div>
          <h2>{order.billingAccountName ?? 'Unnamed account'}</h2>
          <p className="muted">
            <span className="badge neutral">{order.status.replace(/_/g, ' ')}</span>{' '}
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
          </p>
          <code style={{ fontSize: '0.8rem' }}>{order.orderId}</code>
        </div>
        <div>
          <p className="eyebrow">Total</p>
          <p style={{ fontSize: '1.2rem' }}>
            {format(fromMinor(order.totalMinor, order.currencyCode))}
          </p>
          {breakdown && <p className="muted">{breakdown}</p>}
        </div>
      </div>

      <ul className="lessons">
        {order.items.map((item) => (
          <li key={item.itemId}>
            <span className="t">{item.title ?? 'Line item'}</span>
            <span className="muted">
              {format(fromMinor(item.lineTotalMinor, order.currencyCode))}
            </span>
          </li>
        ))}
        {order.adjustments.map((a) => (
          <li key={a.adjustmentId}>
            <span className="t">
              {describeOrderAdjustment({
                id: a.adjustmentId,
                adjustment_type: a.adjustmentType,
                direction: a.direction,
                amount_minor: a.amountMinor,
                currency_code: a.currencyCode,
                description: a.description,
                voided_at: a.voidedAt,
                voided_reason: a.voidedReason,
              })}
            </span>
            {!a.voidedAt && (
              // .row fixes its first child at 6.5rem, which is what the label
              // is for: the input and the button take the rest.
              <span className="row">
                <span className="muted">Withdraw</span>
                <input
                  aria-label="Reason for withdrawing this adjustment"
                  placeholder="Why is it being withdrawn?"
                  maxLength={500}
                  value={voidReason[a.adjustmentId] ?? ''}
                  onChange={(e) =>
                    setVoidReason({ ...voidReason, [a.adjustmentId]: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="btn secondary tiny"
                  disabled={
                    busy !== null || (voidReason[a.adjustmentId] ?? '').trim().length === 0
                  }
                  onClick={() => onVoid(a.adjustmentId, (voidReason[a.adjustmentId] ?? '').trim())}
                >
                  {busy === `void:${a.adjustmentId}` ? 'Withdrawing…' : 'Withdraw'}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onAdd({
            action: 'add_adjustment',
            orderId: order.orderId,
            adjustmentType: String(data.get('adjustmentType') ?? ''),
            amountMinor: String(data.get('amountMinor') ?? ''),
            direction: String(data.get('direction') ?? '') || null,
            reason: String(data.get('reason') ?? ''),
            orderItemId: String(data.get('orderItemId') ?? '') || null,
          });
          event.currentTarget.reset();
        }}
      >
        <div className="grid cols-2">
          <label>
            Adjustment
            <select
              name="adjustmentType"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {ADJUSTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label>
            Amount, minor units
            <input
              name="amountMinor"
              required
              inputMode="numeric"
              pattern="[1-9][0-9]*"
              placeholder="5000"
            />
          </label>
          {chosen?.direction === null && (
            <label>
              Direction
              <select name="direction" required defaultValue="credit">
                <option value="credit">Credit — takes from the total</option>
                <option value="debit">Debit — adds to the total</option>
              </select>
            </label>
          )}
          {order.items.length > 1 && (
            <label>
              About which line (optional)
              <select name="orderItemId" defaultValue="">
                <option value="">The whole order</option>
                {order.items.map((item) => (
                  <option key={item.itemId} value={item.itemId}>
                    {item.title ?? item.itemId}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {chosen && <p className="muted">{chosen.explains}</p>}
        <label>
          Written reason
          <textarea name="reason" required maxLength={500} rows={2} />
        </label>
        <button className="btn" disabled={busy !== null}>
          {busy === `add:${order.orderId}` ? 'Recording…' : 'Record adjustment'}
        </button>
      </form>
    </article>
  );
}
