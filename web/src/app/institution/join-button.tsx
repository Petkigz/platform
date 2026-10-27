'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Joining by a domain somebody has already verified.
 *
 * One button and no confirmation, because the database has already decided
 * whether this address may join: `join_institution()` reads the verified domain
 * and refuses if there is none. The button can only do the thing the screen
 * already said was possible.
 */
export function JoinInstitution() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/institution', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
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
      <button type="button" className="btn" disabled={busy || pending} onClick={join}>
        {busy ? 'Joining…' : 'Join with my email domain'}
      </button>
      {error && (
        <p className="notice error" role="alert" style={{ marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
