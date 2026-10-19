'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function PasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    if (!password) {
      setError('Enter your new password.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('The password could not be updated. It may not meet the account security requirements.');
        return;
      }
      router.replace('/learn');
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.65rem', maxWidth: '34rem' }}>
      <label htmlFor="new-password">New password</label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={busy}
      />
      <label htmlFor="confirm-password">Confirm new password</label>
      <input
        id="confirm-password"
        type="password"
        autoComplete="new-password"
        required
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        disabled={busy}
      />
      {error && <div className="notice error" role="alert">{error}</div>}
      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
