'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Retire a rule, with a reason.
 *
 * A tax rule is never deleted: an order that was billed under it has to keep
 * pointing at the rule that produced the line. Retiring stops it applying to new
 * orders and leaves the history intact, which is the only honest way to correct
 * a rate that was entered wrongly.
 */
export function RetireButton({
  client,
  id,
  label,
}: {
  client: SupabaseClient;
  id: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retire() {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await client.rpc('retire_market_charge', {
      p_id: id,
      p_reason: reason.trim(),
    });
    if (rpcError) {
      setError(rpcError.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="btn ghost tiny" onClick={() => setOpen(true)}>
        Retire
      </button>
    );
  }

  return (
    <div className="stack" style={{ minWidth: '16rem' }}>
      <label htmlFor={`why-${id}`}>Why is {label} being retired?</label>
      <input
        id={`why-${id}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Rate changed on 1 December"
        disabled={busy}
      />
      {error && <p className="notice error">{error}</p>}
      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn danger tiny"
          onClick={retire}
          disabled={busy || reason.trim() === ''}
        >
          {busy ? 'Retiring…' : 'Retire it'}
        </button>
        <button type="button" className="btn ghost tiny" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
