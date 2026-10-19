'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
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
        setError('We could not send a reset link right now. Check the address and try again later.');
        return;
      }
      setSent(true);
    } catch {
      setError('We could not send a reset link right now. Try again later.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow">
      <div className="card">
        <h1>Reset your password</h1>
        {sent ? (
          <div className="notice" role="status">
            If an account uses that email address, a password reset link is on its way. Check your inbox and spam folder.
          </div>
        ) : (
          <>
            <p className="muted">Enter the email address on your account. We will send a secure link if it is registered.</p>
            <form onSubmit={submit} style={{ display: 'grid', gap: '0.65rem' }}>
              <label htmlFor="reset-email">Email</label>
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
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
        <p style={{ marginTop: '1rem' }}><Link href="/sign-in">Back to sign in</Link></p>
      </div>
    </div>
  );
}
