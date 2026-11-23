'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { orderCodeOutcomeOf, type OrderCodeReason } from '@/lib/orders-outcome';

/** The words this form says. A script sent to a browser holds no catalogue. */
export type CodeWords = {
  label: string;
  use: string;
  remove: string;
  reasons: Record<OrderCodeReason, string>;
};

/**
 * The code on an unpaid order, and the two things a family may do about it.
 *
 * A wrong code used to be permanent: the order carried the wrong total until it expired,
 * and the code stayed spent on the family's limit. Now the order can lose it — or gain
 * one it never had — while it is still unpaid. Once it is paid neither button appears,
 * because after that the discount is part of what was charged, and changing it is a
 * refund rather than a re-price.
 *
 * This component has no opinion about whether a code is valid, for this course, in this
 * country, or used up. The database decides; the route names what it decided
 * (`orders-outcome.ts`); and what is said here is the page's sentence for that name, in
 * the reader's language. The server's own sentence is never shown. A press that got no
 * answer is not a failure: the order may have been re-priced, so the reader is told to
 * reload before trying again.
 */
export function PromotionActions({
  orderId,
  applied,
  words,
}: {
  orderId: string;
  /**
   * Whether this order has a live promotion adjustment. The code itself is deliberately
   * not read here: the adjustment's description is prose, and the writer returns the
   * code when it changes one. Guessing a code out of a sentence to put it in a button
   * label is the kind of parsing that goes wrong quietly.
   */
  applied: boolean;
  words: CodeWords;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ tone: 'warn' | 'error'; text: string } | null>(null);
  const [code, setCode] = useState('');

  async function send(action: 'apply' | 'remove') {
    if (busy) return;
    setBusy(true);
    setSaid(null);
    let res: Response;
    try {
      res = await fetch('/api/orders/promotion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, orderId, code: action === 'apply' ? code : undefined }),
      });
    } catch {
      setSaid({ tone: 'warn', text: words.reasons.unconfirmed });
      setBusy(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; reason?: unknown } | null;
    setBusy(false);

    if (res.ok && json?.ok === true) {
      setCode('');
      startTransition(() => router.refresh());
      return;
    }
    const why = orderCodeOutcomeOf(res.status, json?.reason);
    // The order already has no code, which is what was asked for: the page was out of date.
    if (why !== 'none_applied') setSaid({ tone: why === 'unconfirmed' ? 'warn' : 'error', text: words.reasons[why] });
    if (why === 'none_applied' || why === 'already_applied' || why === 'order_not_pending') {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="order-form" data-code-form={applied ? 'applied' : 'none'}>
      {applied ? (
        <div className="order-actions">
          <button type="button" className="btn ghost" disabled={busy} onClick={() => send('remove')}>
            {words.remove}
          </button>
        </div>
      ) : (
        <>
          <label htmlFor={`c-${orderId}`}>{words.label}</label>
          <div className="order-actions">
            <input
              id={`c-${orderId}`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
              dir="ltr"
              className="order-code"
            />
            <button type="button" className="btn secondary" disabled={busy || code.trim() === ''} onClick={() => send('apply')}>
              {words.use}
            </button>
          </div>
        </>
      )}
      {said && (
        <div className={`notice ${said.tone === 'error' ? 'error' : 'warn'}`} role="alert" data-code-said={said.tone}>
          {said.text}
        </div>
      )}
    </div>
  );
}
