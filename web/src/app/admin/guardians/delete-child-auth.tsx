'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteChildAuth({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function remove() {
    if (!confirmed) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch('/api/admin/child-login-auth-removal', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean } | null;
      if (!response.ok || result?.ok !== true) {
        setMessage('Could not confirm removal. Refresh the queue and review the identity before retrying; the provider may have completed the request.');
      } else {
        setMessage('The original identity and matching marked identity are currently absent from Auth. Existing tokens and provider copies are not confirmed gone.');
        router.refresh();
      }
    } catch { setMessage('Could not confirm removal. Refresh the queue before retrying; the provider may have completed the request.'); }
    finally { setBusy(false); }
  }
  return <div className="stack">
    <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} />{' '}
      I checked this exact trusted sign-in and understand deletion is permanent. The child&rsquo;s learning stays; sessions and external copies still need review.
    </label>
    <button type="button" className="btn danger" disabled={busy || !confirmed} onClick={remove}>
      {busy ? 'Checking…' : 'Delete this trusted sign-in'}
    </button>
    {message && <p role="status">{message}</p>}
  </div>;
}
