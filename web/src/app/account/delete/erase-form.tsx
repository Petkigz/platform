'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * The confirmation, and nothing else.
 *
 * The button stays disabled until the typed name matches, so the guard is visible
 * before it is hit rather than explained after. The database checks the same
 * string again — this is the courtesy, not the control.
 */
export function EraseAccount({ displayName }: { displayName: string }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim() === displayName.trim() && displayName.trim().length > 0;

  async function erase() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account/erase', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: typed }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; message?: string }
        | null;

      if (!res.ok || !json?.ok) {
        setError(json?.message ?? 'The account was not closed. Nothing was changed.');
        setBusy(false);
        return;
      }

      // A full navigation rather than a client push: the session has just ended,
      // and every cached page under it belongs to an account that no longer exists.
      window.location.assign('/');
    } catch {
      setError('The account was not closed. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <label htmlFor="confirm-name">
        Type <strong>{displayName}</strong> to confirm
      </label>
      <input
        id="confirm-name"
        name="confirm"
        type="text"
        autoComplete="off"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        disabled={busy}
      />
      {error && <p className="notice error">{error}</p>}
      <div className="row" style={{ gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn danger"
          style={{ width: 'auto' }}
          disabled={!matches || busy}
          onClick={erase}
        >
          {busy ? 'Closing…' : 'Close my account for good'}
        </button>
        <Link href="/account">Keep my account</Link>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        The button becomes available when the name matches exactly. This cannot be
        undone, and there is no cooling-off period.
      </p>
    </div>
  );
}
