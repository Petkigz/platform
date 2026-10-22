'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The code on an unpaid order, and the two things a family may do about it.
 *
 * A wrong code used to be permanent: the order carried the wrong total until it expired,
 * and the code stayed spent on the family's limit. Now the order can lose it — or gain
 * one it never had — while it is still unpaid. Once it is paid neither button appears,
 * because after that the discount is part of what was charged, and changing it is a
 * refund rather than a re-price.
 *
 * The sentences in here come from the database. This component has no opinion about
 * whether a code is valid, for this course, in this country, or used up.
 */
export function PromotionActions({
  orderId,
  applied,
}: {
  orderId: string;
  /**
   * Whether this order has a live promotion adjustment. The code itself is deliberately
   * not read here: the adjustment's description is prose, and the writer returns the
   * code when it changes one. Guessing a code out of a sentence to put it in a button
   * label is the kind of parsing that goes wrong quietly.
   */
  applied: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');

  async function send(action: 'apply' | 'remove') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/orders/promotion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, orderId, code: action === 'apply' ? code : undefined }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; message?: string }
        | null;

      if (!res.ok || !json?.ok) {
        setError(json?.message ?? 'That could not be changed.');
        return;
      }
      setCode('');
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="stack" style={{ gap: '0.35rem' }}>
      {applied ? (
        <span className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn tiny ghost"
            disabled={busy}
            onClick={() => send('remove')}
          >
            {busy ? 'Taking it off…' : 'Take the code off'}
          </button>
        </span>
      ) : (
        <span className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Promotion code"
            aria-label={`Promotion code for order ${orderId}`}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={32}
            style={{ maxWidth: '12rem' }}
          />
          <button
            type="button"
            className="btn tiny"
            disabled={busy || code.trim() === ''}
            onClick={() => send('apply')}
          >
            {busy ? 'Applying…' : 'Use this code'}
          </button>
        </span>
      )}
      {error && (
        <span className="danger" style={{ fontSize: '0.85rem' }} role="alert">{error}</span>
      )}
    </span>
  );
}
