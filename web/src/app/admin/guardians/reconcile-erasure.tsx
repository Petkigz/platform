'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReconcileErasure({ learnerId }: { learnerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function reconcile() {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch('/api/admin/child-login-erasure', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ learnerId }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean } | null;
      if (!response.ok || result?.ok !== true) setMessage('Could not confirm cleanup. Refresh the list and check for a safeguarding hold before retrying.');
      else { setMessage('Child-linked rows cleaned; pseudonymous recovery evidence remains.'); router.refresh(); }
    } catch { setMessage('Could not confirm cleanup. Refresh the list before retrying.'); }
    finally { setBusy(false); }
  }
  return <div><button type="button" className="btn ghost" disabled={busy} onClick={reconcile}>
    {busy ? 'Checking…' : 'Clean these old login links'}
  </button>{message && <p role="status">{message}</p>}</div>;
}
