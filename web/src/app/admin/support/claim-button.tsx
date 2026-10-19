'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Claim a case from the queue.
 *
 * The one triage action worth having inline: without it, answering anything
 * means opening each case to find out whether somebody is already on it. The
 * rest of the triage controls live on the case page, next to the conversation
 * they are about.
 */
export function ClaimButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setError(null);
    const res = await fetch('/api/admin/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // No assignee: the route uses the session user, so "assign to me" cannot
      // be pointed at somebody else by editing the request.
      body: JSON.stringify({ action: 'assign', caseId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(json.error ?? 'The case was not assigned.');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <span style={{ display: 'inline-grid', gap: '0.2rem' }}>
      <button type="button" className="btn tiny" disabled={pending} onClick={claim}>
        {pending ? 'Claiming…' : 'Assign to me'}
      </button>
      {error && (
        <span className="danger" role="alert" style={{ fontSize: '.75rem' }}>
          {error}
        </span>
      )}
    </span>
  );
}
