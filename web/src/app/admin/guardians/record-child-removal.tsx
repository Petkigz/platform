'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RecordChildRemoval({ taskId }: { taskId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  async function record() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/child-login-removal', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId }),
      });
      const result = await res.json().catch(() => null) as { ok?: boolean } | null;
      if (!res.ok || result?.ok !== true) setMessage('Could not confirm the record. Refresh the list and check the identity before retrying.');
      else { setMessage('Identity absence recorded. Previously issued sessions or external copies are not verified by this step.'); router.refresh(); }
    } catch { setMessage('Could not confirm the record. Refresh the list before retrying.'); }
    finally { setBusy(false); }
  }
  return <div><button className="btn ghost" type="button" onClick={record} disabled={busy}>
    {busy ? 'Checking…' : 'Record verified identity absence'}
  </button>{message && <p role="status">{message}</p>}</div>;
}
