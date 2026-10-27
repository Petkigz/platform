'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Taking an application back.
 *
 * One button and no form: withdrawing is not a decision anybody needs to
 * explain, and asking for a reason would be asking the applicant to justify
 * changing their mind.
 */
export function WithdrawApplication() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/teaching/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw' }),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing changed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn secondary" disabled={busy || pending} onClick={withdraw}>
        {busy ? 'Taking it back…' : 'Take this application back'}
      </button>
      {error && (
        <p className="notice error" role="alert" style={{ marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
