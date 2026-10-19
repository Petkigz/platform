'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function ProfileForm({
  initial,
}: {
  initial: { displayName: string; preferredLanguage: string; timezone: string | null };
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [preferredLanguage, setPreferredLanguage] = useState(initial.preferredLanguage);
  const [timezone, setTimezone] = useState(initial.timezone ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, preferredLanguage, timezone }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || result?.ok !== true) {
        setError(result?.message ?? 'Could not save your profile.');
        return;
      }
      setMessage('Your profile has been updated.');
      startTransition(() => router.refresh());
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.65rem', maxWidth: '42rem' }}>
      <label htmlFor="account-display-name">Display name</label>
      <input
        id="account-display-name"
        autoComplete="name"
        maxLength={80}
        required
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        disabled={busy}
      />
      <label htmlFor="account-language">Preferred language code</label>
      <input
        id="account-language"
        placeholder="en or en-GB"
        pattern="[a-z]{2}(-[A-Z]{2})?"
        maxLength={5}
        required
        value={preferredLanguage}
        onChange={(event) => setPreferredLanguage(event.target.value)}
        disabled={busy}
      />
      <p className="muted" style={{ margin: '-0.3rem 0 0' }}>
        The language preference is saved to your profile; translated interface content can be enabled as it becomes available.
      </p>
      <label htmlFor="account-timezone">Time zone</label>
      <input
        id="account-timezone"
        autoComplete="off"
        placeholder="Africa/Kampala"
        maxLength={100}
        value={timezone}
        onChange={(event) => setTimezone(event.target.value)}
        disabled={busy}
      />
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
