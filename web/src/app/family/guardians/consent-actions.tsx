'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { WITHDRAWAL_EFFECT } from '@/lib/guardian-consent';

/**
 * Withdraw one consent.
 *
 * The reason is required and shown to the other guardian and to staff, which is
 * why the button does not just ask "are you sure?". The effect is stated before
 * the field, not after the fact: a withdrawal clears permissions and deletes
 * nothing.
 */
export function ConsentActions({ relationshipId }: { relationshipId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function withdraw() {
    setMessage(null);
    if (reason.trim().length < 10) {
      setTone('error');
      setMessage('Say why you are withdrawing — at least 10 characters.');
      return;
    }

    const res = await fetch('/api/family/guardians', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'withdraw', relationshipId, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The withdrawal was not recorded.');
      return;
    }

    setTone('info');
    setMessage('Withdrawn. The reason is kept with the record.');
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <button type="button" className="linklike" onClick={() => setOpen(true)}>
        Withdraw this consent
      </button>
    );
  }

  return (
    <div className="stack">
      <p className="muted">{WITHDRAWAL_EFFECT}</p>
      <div className="field">
        <label className="eyebrow" htmlFor={`why-${relationshipId}`}>
          Why (required)
        </label>
        <textarea
          id={`why-${relationshipId}`}
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What changed."
        />
      </div>
      <div className="row" style={{ gap: '0.75rem' }}>
        <button type="button" className="btn danger" onClick={withdraw} disabled={pending}>
          {pending ? 'Withdrawing…' : 'Withdraw'}
        </button>
        <button type="button" className="linklike" onClick={() => setOpen(false)}>
          Cancel
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
