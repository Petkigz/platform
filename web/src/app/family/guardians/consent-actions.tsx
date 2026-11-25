'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { REASON_MIN, guardianOutcomeOf, type ConsentActionWords } from '@/lib/guardian-outcome';

/**
 * Withdraw one consent.
 *
 * The reason is required and shown to the other guardian and to staff, which is
 * why the button does not just ask "are you sure?". The effect is stated before
 * the field, not after the fact: a withdrawal clears permissions and deletes
 * nothing.
 *
 * The words are handed in by the page, in the reader's language
 * (`ConsentActionWords`). The reason is the parent's own and is kept as
 * written.
 */
export function ConsentActions({
  relationshipId,
  words,
}: {
  relationshipId: string;
  words: ConsentActionWords;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function withdraw() {
    setMessage(null);
    if (reason.trim().length < REASON_MIN) {
      setTone('error');
      setMessage(words.refusals.reason_short);
      return;
    }

    let res: Response;
    try {
      res = await fetch('/api/family/guardians', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw', relationshipId, reason }),
      });
    } catch {
      // The reply was lost; the withdrawal may not have been.
      setTone('error');
      setMessage(words.refusals.unconfirmed);
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { ok?: unknown; code?: unknown };

    // A reply that does not say `ok` is not this route's yes, whatever its status.
    if (!res.ok || json.ok !== true) {
      setTone('error');
      setMessage(words.refusals[guardianOutcomeOf(res.status, json.code)]);
      return;
    }

    setTone('info');
    setMessage(words.done);
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <button type="button" className="linklike" onClick={() => setOpen(true)}>
        {words.open}
      </button>
    );
  }

  return (
    <div className="stack">
      <p className="muted">{words.effect}</p>
      <div className="field">
        <label className="eyebrow" htmlFor={`why-${relationshipId}`}>
          {words.why}
        </label>
        <textarea
          id={`why-${relationshipId}`}
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={words.placeholder}
        />
      </div>
      <div className="row" style={{ gap: '0.75rem' }}>
        <button type="button" className="btn danger" onClick={withdraw} disabled={pending}>
          {pending ? words.withdrawing : words.withdraw}
        </button>
        <button type="button" className="linklike" onClick={() => setOpen(false)}>
          {words.cancel}
        </button>
      </div>
      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'info'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
