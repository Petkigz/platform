'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Accepting an invitation, once.
 *
 * The token goes to the server and the server decides. This component has no opinion
 * about who is signed in or whether the link is theirs: a refusal such as "that
 * invitation was sent to a different address" is the database's sentence and is shown
 * as it comes.
 *
 * When it works the person is sent to their sharing page rather than told "done", because
 * that page is where the thing they just accepted is actually visible.
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);

    const res = await fetch('/api/account/sharing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'accept', token }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; message?: string }
      | null;

    if (!json?.ok) {
      setBusy(false);
      setError(json?.message ?? 'That invitation could not be accepted.');
      return;
    }

    startTransition(() => {
      router.push('/account/sharing');
      router.refresh();
    });
  }

  return (
    <div className="stack" style={{ maxWidth: '42rem' }}>
      <div className="row">
        <button type="button" className="btn" disabled={busy} onClick={accept}>
          {busy ? 'Accepting…' : 'Accept the invitation'}
        </button>
      </div>
      {error && (
        <p className="danger" style={{ fontSize: '0.9rem' }} role="alert">{error}</p>
      )}
    </div>
  );
}
