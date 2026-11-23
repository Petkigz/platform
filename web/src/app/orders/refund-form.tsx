'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { REFUND_REASON_MAX, refundAskOutcomeOf, type RefundAskReason } from '@/lib/orders-outcome';

/** The words this form says. A script sent to a browser holds no catalogue. */
export type RefundWords = {
  ask: string;
  why: string;
  send: string;
  sending: string;
  cancel: string;
  sent: string;
  note: string;
  reasons: Record<RefundAskReason, string>;
};

/**
 * Ask for a refund.
 *
 * The amount is fixed at what is left to refund on the order, as the database
 * counts it, and is not editable here, so the form cannot send a number the
 * user did not see. A partial refund is possible in the schema and staff can
 * arrange one, but the default ask is everything — and letting someone type
 * an arbitrary number would mostly produce requests that the
 * refundable-balance check then refuses.
 *
 * The confirmation says plainly that nothing has been paid back yet, because
 * "submitted" reads like "done" and the refund is actually waiting on a person.
 *
 * What the request was answered with is said by its name
 * (`orders-outcome.ts`), in the reader's language; the server's own sentence
 * is never shown. A press that got no answer is not a failure: a request may
 * have been recorded, so the reader is told to reload before trying again.
 */
export function RefundForm({
  orderId,
  amountMinor,
  amountLine,
  words,
}: {
  orderId: string;
  /** What is asked for: whole minor units, a string. */
  amountMinor: string;
  /** The same amount as the page says it: the words before it, and the amount in major units. */
  amountLine: { lead: string; amount: string };
  words: RefundWords;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [said, setSaid] = useState<{ tone: 'info' | 'warn' | 'error'; text: string } | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setSaid(null);
    let res: Response;
    try {
      res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, amountMinor, reason }),
      });
    } catch {
      setSaid({ tone: 'warn', text: words.reasons.unconfirmed });
      setBusy(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; reason?: unknown } | null;
    setBusy(false);

    if (res.status === 201 && json?.ok === true) {
      setOpen(false);
      setReason('');
      setSaid({ tone: 'info', text: words.sent });
      startTransition(() => router.refresh());
      return;
    }
    const why = refundAskOutcomeOf(res.status, json?.reason);
    setSaid({ tone: why === 'unconfirmed' ? 'warn' : 'error', text: words.reasons[why] });
    // The clock ran out, or the balance moved, while this tab sat open: the page is out of date.
    if (why === 'window_closed' || why === 'too_much' || why === 'not_paid') startTransition(() => router.refresh());
  }

  const notice = said && (
    <div
      className={`notice ${said.tone === 'error' ? 'error' : said.tone === 'warn' ? 'warn' : ''}`}
      role={said.tone === 'info' ? 'status' : 'alert'}
      data-refund-said={said.tone}
    >
      {said.text}
    </div>
  );

  if (!open) {
    return (
      <div className="order-form">
        {notice}
        {/* Once a request is in, a second button would only invite a second request. */}
        {said?.tone !== 'info' && (
          <button type="button" className="btn secondary" onClick={() => { setOpen(true); setSaid(null); }}>
            {words.ask}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="order-form" data-refund-form>
      <p className="meta">
        {amountLine.lead}
        <bdi dir="ltr">{amountLine.amount}</bdi>
      </p>
      <label htmlFor={`r-${orderId}`}>{words.why}</label>
      <textarea
        id={`r-${orderId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={REFUND_REASON_MAX}
        dir="auto"
      />
      <div className="order-actions">
        <button
          type="button"
          className="btn"
          disabled={busy || refreshing || reason.trim().length === 0}
          onClick={submit}
        >
          {busy ? words.sending : words.send}
        </button>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => setOpen(false)}>
          {words.cancel}
        </button>
      </div>
      {notice}
      <p className="muted">{words.note}</p>
    </div>
  );
}
