'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/client';

/**
 * The new-password form.
 *
 * Two of the refusals here are ours — the two fields disagreeing, and an empty
 * field that the browser did not catch — and they are translated. The third is
 * not: when Supabase Auth rejects the password itself (too short, too like the
 * old one, found in a breach list) the reason is the provider's, and this form
 * now shows it **as it arrives**. It used to replace it with a guess about
 * "account security requirements", which is a diagnosis printed as a fact — and
 * it hid the one sentence that tells the reader how to fix it.
 */
export function PasswordForm() {
  const router = useRouter();
  const t = useT();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError(t('auth.noMatch'));
      return;
    }
    if (!password) {
      setError(t('auth.enterPassword'));
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        // The provider's own sentence, untranslated and unhidden: it names the
        // actual rule the password did not meet.
        setError(updateError.message || t('auth.somethingWrong'));
        return;
      }
      router.replace('/learn');
      router.refresh();
    } catch {
      setError(t('auth.offline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.65rem', maxWidth: '34rem' }}>
      <label htmlFor="new-password">{t('auth.newPassword')}</label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={busy}
      />
      <label htmlFor="confirm-password">{t('auth.confirmPassword')}</label>
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
        {busy ? t('auth.updating') : t('auth.updatePassword')}
      </button>
    </form>
  );
}
