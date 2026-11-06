'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReconcileForm({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reconcile() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/child-login-reconcile', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean } | null;
      if (!response.ok || result?.ok !== true) {
        setMessage('Could not confirm completion. Refresh the list and review the guardian verification and the attempt before trying again.');
      } else {
        setMessage('The existing identity is linked. The password originally set still applies.');
        router.refresh();
      }
    } catch {
      setMessage('Could not confirm completion. Refresh the list before trying again.');
    } finally { setBusy(false); }
  }

  return <div>
    <button type="button" className="btn ghost" disabled={busy} onClick={reconcile}>
      {busy ? 'Checking…' : 'Complete this existing login'}
    </button>
    {message && <p role="status">{message}</p>}
  </div>;
}
