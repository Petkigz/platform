'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The finance queue.
 *
 * Completing a payout is the only action in the product that marks an earning
 * paid, so it asks for the two things that make it checkable later: who sent
 * the money and under what reference. The requested amount and what the ledger
 * owes today are shown side by side, because a request made three weeks ago is
 * not an instruction to pay a number that has since shrunk.
 */
export type QueueRow = {
  id: string;
  teacherName: string | null;
  currency: string;
  amountLabel: string;
  eligibleNowLabel: string;
  stale: boolean;
  status: string;
  statusLabel: string;
  requestedLabel: string | null;
  destination: string | null;
  providerReference: string | null;
  failureReason: string | null;
};

export function PayoutQueue({ rows }: { rows: QueueRow[] }) {
  const open = rows.filter((r) => r.status === 'scheduled' || r.status === 'processing');
  const closed = rows.filter((r) => r.status !== 'scheduled' && r.status !== 'processing');

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section>
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3>Waiting</h3>
          <span className="badge neutral">{open.length}</span>
        </div>
        {open.length === 0 ? (
          <p className="empty">No payout is waiting.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {open.map((row) => (
              <PayoutRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="outline-h">
          <h3>Recorded</h3>
        </div>
        {closed.length === 0 ? (
          <p className="empty">Nothing recorded yet.</p>
        ) : (
          <div className="card">
            <ul className="lessons">
              {closed.map((row) => (
                <li key={row.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <span>
                      <strong>
                        {row.teacherName ?? 'A teacher'} · {row.amountLabel}
                      </strong>
                      <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                        {row.requestedLabel ? `Requested ${row.requestedLabel}` : ''}
                        {row.providerReference ? ` · reference ${row.providerReference}` : ''}
                      </span>
                      {row.failureReason && (
                        <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                          {row.failureReason}
                        </span>
                      )}
                    </span>
                    <span className={`badge ${row.status === 'failed' ? 'warn' : 'neutral'}`}>{row.statusLabel}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function PayoutRow({ row }: { row: QueueRow }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'complete' | 'fail'>('idle');
  const [provider, setProvider] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  async function send(body: Record<string, unknown>) {
    setMessage(null);
    const response = await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || result?.ok !== true) {
      setMessage({ ok: false, text: result?.message ?? 'That could not be recorded.' });
      return;
    }
    setMessage({ ok: true, text: result.message ?? 'Recorded.' });
    setMode('idle');
    startTransition(() => router.refresh());
  }

  return (
    <div className="card" style={{ padding: '1.15rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <strong>{row.teacherName ?? 'A teacher'}</strong>
          <p className="muted" style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>
            Asked for {row.amountLabel} in {row.currency}
            {row.requestedLabel ? ` on ${row.requestedLabel}` : ''} · ledger owes {row.eligibleNowLabel} today
          </p>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Destination: {row.destination ?? 'not recorded'}
          </p>
        </div>
        <span className="badge neutral">{row.statusLabel}</span>
      </div>

      {row.stale && (
        <div className="notice warn" style={{ marginTop: '0.8rem' }}>
          The ledger owes less than was requested — a refund or a reversal has landed since. Completing this
          pays the current figure, not the estimate. Cancel it if the teacher should ask again.
        </div>
      )}

      {message && (
        <div className={message.ok ? 'notice' : 'notice error'} role={message.ok ? 'status' : 'alert'} style={{ marginTop: '0.8rem' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={() => setMode(mode === 'complete' ? 'idle' : 'complete')}>
          Record as paid
        </button>
        <button className="outline-h" type="button" onClick={() => setMode(mode === 'fail' ? 'idle' : 'fail')} style={{ cursor: 'pointer' }}>
          It did not go through
        </button>
      </div>

      {mode === 'complete' && (
        <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.9rem', maxWidth: '30rem' }}>
          <label>
            Provider
            <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="MTN MoMo, Airtel, bank…" />
          </label>
          <label>
            Reference
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="The provider's own reference" />
          </label>
          <div>
            <button
              className="btn"
              type="button"
              disabled={pending}
              onClick={() => send({ action: 'complete', payoutId: row.id, provider, reference })}
            >
              Confirm {row.eligibleNowLabel} was sent
            </button>
          </div>
        </div>
      )}

      {mode === 'fail' && (
        <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.9rem', maxWidth: '30rem' }}>
          <label>
            What happened?
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="The teacher reads this."
            />
          </label>
          <div>
            <button className="btn" type="button" disabled={pending} onClick={() => send({ action: 'fail', payoutId: row.id, reason })}>
              Mark failed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PayoutPolicyForm({ holdDays }: { holdDays: number }) {
  const router = useRouter();
  const [days, setDays] = useState(String(holdDays));
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'policy', holdDays: Number(days), reason }),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || result?.ok !== true) {
      setMessage({ ok: false, text: result?.message ?? 'Could not save.' });
      return;
    }
    setMessage({ ok: true, text: result.message ?? 'Saved.' });
    setReason('');
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={save} className="card" style={{ padding: '1.25rem' }}>
      <div className="outline-h" style={{ marginTop: 0 }}>
        <h3>Refund hold</h3>
        <span className="badge neutral">{holdDays} days</span>
      </div>
      <p className="muted">
        How long an earning must sit before a teacher may ask to be paid. It exists so a refund lands before the
        money leaves: without it, the platform can pay a teacher for a sale it later has to give back.
      </p>
      <div style={{ display: 'grid', gap: '0.8rem', maxWidth: '30rem' }}>
        <label>
          Days
          <input
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            required
          />
        </label>
        <label>
          Why?
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Kept in the audit trail" required />
        </label>
        {message && (
          <div className={message.ok ? 'notice' : 'notice error'} role={message.ok ? 'status' : 'alert'}>
            {message.text}
          </div>
        )}
        <div>
          <button className="btn" type="submit" disabled={pending}>
            Save the hold
          </button>
        </div>
      </div>
    </form>
  );
}
