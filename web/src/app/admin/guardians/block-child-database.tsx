'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BlockChildDatabase({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function block() {
    setBusy(true); setMessage(null);
    try {
      const res = await fetch('/api/admin/child-login-database-block', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId }),
      });
      const result = await res.json().catch(() => null) as { ok?: boolean } | null;
      if (!res.ok || result?.ok !== true) setMessage('Could not confirm a block. Review the identity, other roles and family links before taking further action.');
      else { setMessage('Database identity-helper access is blocked. Provider sessions and other paths still need review.'); router.refresh(); }
    } catch { setMessage('Could not confirm a block. Refresh and review the case before retrying.'); }
    finally { setBusy(false); }
  }
  return <div><button type="button" className="btn ghost" disabled={busy} onClick={block}>
    {busy ? 'Checking…' : 'Block database identity-helper access'}
  </button>{message && <p role="status">{message}</p>}</div>;
}
