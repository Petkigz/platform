'use client';
import { useState } from 'react';

export function QuarantineInspection({ assetId }: { assetId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function inspect() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/coursework/quarantine-inspection?${new URLSearchParams({ asset: assetId })}`, { cache: 'no-store' });
      const data: unknown = await response.json().catch(() => null);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The storage response could not be read.');
      const r = data as Record<string, unknown>;
      if (!response.ok || r.ok !== true) throw new Error(typeof r.message === 'string' ? r.message : 'The storage check could not be completed.');
      if (typeof r.matches !== 'boolean' || typeof r.declaredBytes !== 'number' || typeof r.reportedBytes !== 'number' ||
          r.contentVerified !== false || r.malwareScanned !== false) throw new Error('The storage response could not be read.');
      setMessage(`At the time of the check, storage reported ${r.reportedBytes} bytes; the file record declares ${r.declaredBytes}. ${r.matches ? 'The sizes match.' : 'The sizes do not match.'} Contents and malware were not checked; the object may change after this check.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The storage check could not be completed.'); }
    finally { setBusy(false); }
  }
  return <div>
    <button type="button" className="btn ghost tiny" disabled={busy} onClick={() => void inspect()}>{busy ? 'Checking storage…' : 'Check storage size'}</button>
    {message && <p className="notice warn" role="status">{message}</p>}
  </div>;
}
