'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AGE_BANDS, AGE_BAND_LABEL } from '@/lib/family';

/**
 * Add a child.
 *
 * Two fields and nothing else — a name and an age band. The age band is not
 * decoration: it drives which content is age-appropriate, and the database
 * refuses a child profile without one. There is deliberately no date of
 * birth field anywhere in this system; an age band is enough to teach a child
 * and is far less to lose.
 */
export function AddChild({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [ageBand, setAgeBand] = useState<string>(AGE_BANDS[1] ?? '8-10');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" className="btn secondary" onClick={() => setOpen(true)}>
        Add a child
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch('/api/family/children', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ familyId, displayName: name, ageBand }),
    });
    const json = (await res.json().catch(() => null)) as { ok: boolean; message?: string };

    setBusy(false);
    if (!json.ok) {
      setError(json.message ?? 'Could not add that child.');
      return;
    }
    startTransition(() => {
      setOpen(false);
      setName('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: '0.75rem' }}>
      <h3 style={{ marginTop: 0 }}>Add a child</h3>

      <label htmlFor="child-name">Name</label>
      <input
        id="child-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="What should we call them?"
        required
        maxLength={60}
        autoFocus
      />

      <label htmlFor="child-age">Age band</label>
      <select id="child-age" value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
        {AGE_BANDS.map((b) => (
          <option key={b} value={b}>
            {AGE_BAND_LABEL[b] ?? b}
          </option>
        ))}
      </select>

      <p className="muted" style={{ fontSize: '0.82rem' }}>
        No date of birth and no email address. A child learns under your
        account, not their own.
      </p>

      {error && <div className="notice error">{error}</div>}

      <div className="row" style={{ marginTop: '0.5rem' }}>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Adding…' : 'Add child'}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
