'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/client';

/**
 * Ask for a reset link.
 *
 * This page is reached from a link in an email, usually by somebody who has just
 * been locked out — the worst moment to hand them a form in a language they do
 * not read. It is a client page, so the words come from the provider in the root
 * layout, which carries the reader's own catalogue and nothing else.
 *
 * The confirmation is deliberately the same sentence whether or not the address
 * is registered: an address that answers "no such account" is a way to find out
 * who has an account here.
 */
export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent('/account/password')}`;
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (requestError) {
        // Rate limiting is the usual reason, and it is not a reason to say the
        // address was wrong. Our sentence says what we know and no more.
        setError(t('auth.resetFailed'));
        return;
      }
      setSent(true);
    } catch {
      setError(t('auth.offline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow">
      <div className="card">
        <h1>{t('auth.forgotTitle')}</h1>
        {sent ? (
          <div className="notice" role="status">
            {t('auth.resetSent')}
          </div>
        ) : (
          <>
            <p className="muted">{t('auth.forgotLede')}</p>
            <form onSubmit={submit} style={{ display: 'grid', gap: '0.65rem' }}>
              <label htmlFor="reset-email">{t('auth.email')}</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
              {error && <div className="notice error" role="alert">{error}</div>}
              <button type="submit" className="btn" disabled={busy}>
                {busy ? t('auth.sending') : t('auth.sendLink')}
              </button>
            </form>
          </>
        )}
        <p style={{ marginTop: '1rem' }}>
          <Link href="/sign-in">{t('auth.backToSignIn')}</Link>
        </p>
      </div>
    </div>
  );
}
