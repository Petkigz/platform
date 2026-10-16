'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Clawback = { orderId: string; paidEntries: number; at: string };
type Adjustment = { id: string; order_id: string | null; financial_transaction_id: string | null; adjustment_type: string; amount_minor: string | number; currency_code: string; reason: string; created_at: string };

export function AdjustmentManager({ clawbacks, adjustments }: { clawbacks: Clawback[]; adjustments: Adjustment[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function send(payload: Record<string, string>, key: string) {
    setBusy(key); setMessage(null); setSaved(null);
    try {
      const response = await fetch('/api/admin/financial-adjustments', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || result?.ok !== true) { setMessage(result?.message ?? 'Could not record the adjustment.'); return; }
      setSaved('Adjustment recorded. It is an accounting record only; it does not transfer funds.');
      router.refresh();
    } catch { setMessage('Could not reach the adjustment service.'); }
    finally { setBusy(null); }
  }

  return (
    <>
      {message && <div className="notice" role="alert">{message}</div>}
      {saved && <div className="notice" role="status">{saved}</div>}
      <section className="section-sm">
        <h2>Paid earnings awaiting clawback</h2>
        <p className="muted">A full refund after payout does not rewrite the paid earnings entry. Record the negative adjustment to document the amount owed; it does not itself recover or transfer money.</p>
        {clawbacks.length === 0 ? <p className="empty">No unresolved clawback notices.</p> : (
          <div className="grid cols-2">{clawbacks.map((item) => (
            <article className="card" key={item.orderId}>
              <h3>Refunded order</h3><code>{item.orderId}</code>
              <p className="muted">{item.paidEntries} instructor earning row(s) were already paid · flagged {new Date(item.at).toLocaleDateString()}</p>
              <form onSubmit={(event) => {
                event.preventDefault();
                const reason = String(new FormData(event.currentTarget).get('reason') ?? '');
                void send({ action: 'clawback', orderId: item.orderId, reason }, `clawback:${item.orderId}`);
              }}>
                <label>Reason<textarea name="reason" required maxLength={500} rows={2} defaultValue="Full refund after instructor payout; record the outstanding clawback." /></label>
                <button className="btn" disabled={busy !== null}>{busy === `clawback:${item.orderId}` ? 'Recording…' : 'Record calculated clawback'}</button>
              </form>
            </article>
          ))}</div>
        )}
      </section>

      <section className="section-sm">
        <h2>Record another adjustment</h2>
        <p className="muted">Signed amount in integer minor units: positive adds a credit/receivable; negative records a debit/reduction. Link an order or transaction. Money stays a decimal integer string all the way to PostgreSQL.</p>
        <div className="card" style={{ padding: '1.25rem' }}>
          <form onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void send({
              action: 'adjustment',
              orderId: String(data.get('orderId') ?? ''),
              financialTransactionId: String(data.get('financialTransactionId') ?? ''),
              type: String(data.get('type') ?? ''),
              amountMinor: String(data.get('amountMinor') ?? ''),
              currencyCode: String(data.get('currencyCode') ?? '').toUpperCase(),
              reason: String(data.get('reason') ?? ''),
            }, 'adjustment');
          }}>
            <label>Order ID (optional)<input name="orderId" placeholder="UUID" /></label>
            <label>Financial transaction ID (optional)<input name="financialTransactionId" placeholder="UUID" /></label>
            <label>Adjustment type<select name="type" defaultValue="correction"><option value="correction">Correction</option><option value="write_off">Write-off</option><option value="goodwill_credit">Goodwill credit</option><option value="fee_reversal">Fee reversal</option><option value="other">Other</option></select></label>
            <label>Signed amount, minor units<input name="amountMinor" required inputMode="numeric" pattern="-?[1-9][0-9]*" placeholder="-1250" /></label>
            <label>Currency<input name="currencyCode" required minLength={3} maxLength={3} defaultValue="UGX" /></label>
            <label>Written reason<textarea name="reason" required maxLength={500} rows={3} /></label>
            <button className="btn" disabled={busy !== null}>{busy === 'adjustment' ? 'Recording…' : 'Record adjustment'}</button>
          </form>
        </div>
      </section>

      <section className="section-sm">
        <h2>Adjustment history</h2>
        {adjustments.length === 0 ? <p className="empty">No adjustments recorded.</p> : (
          <div className="card"><ul className="lessons">{adjustments.map((row) => <li key={row.id}>
            <span className="t"><strong>{row.adjustment_type}</strong> · {row.amount_minor} {row.currency_code}
              <span className="muted" style={{ display: 'block' }}>{row.reason}</span>
              <code style={{ fontSize: '0.8rem' }}>{row.order_id ?? row.financial_transaction_id}</code>
            </span>
            <span className="muted">{new Date(row.created_at).toLocaleDateString()}</span>
          </li>)}</ul></div>
        )}
      </section>
    </>
  );
}
