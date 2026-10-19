'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function CreateFamily() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/family/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!response.ok || result?.ok !== true) {
        setError(result?.message ?? 'Could not create your family.');
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.65rem', maxWidth: '36rem' }}>
      <h2 style={{ margin: 0 }}>Create your family space</h2>
      <p className="muted" style={{ margin: 0 }}>
        Add children under your adult account. They do not need an email address, password or separate sign-in.
      </p>
      <label htmlFor="family-name">Family name <span className="muted">(optional)</span></label>
      <input
        id="family-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="For example, our family"
        maxLength={120}
        autoComplete="off"
        disabled={busy}
      />
      {error && <div className="notice error" role="alert">{error}</div>}
      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Creating…' : 'Create family'}
      </button>
    </form>
  );
}
