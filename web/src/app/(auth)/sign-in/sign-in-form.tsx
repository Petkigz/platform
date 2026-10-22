'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toE164, isE164 } from '@/lib/phone';
import { oauthRedirectUrl } from '@/lib/oauth';

/**
 * D3: both email+password and phone OTP.
 *
 * OTP is deliberately offered at sign-in rather than as the only method — the
 * recorded decision is that long-lived refresh tokens make OTP fire at
 * registration and recovery, so a returning user should not pay for an SMS
 * every time they open the app.
 */
export function SignInForm({
  googleEnabled,
  next,
  initialError,
}: {
  googleEnabled: boolean;
  next: string;
  initialError: string | null;
}) {
  const router = useRouter();

  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+256');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [sent, setSent] = useState<string | null>(null);
  const [sentPhone, setSentPhone] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');

  /**
   * Hand the whole flow to Supabase, which knows the client id and secret. This
   * browser only decides where to come back to.
   */
  async function signInWithGoogle() {
    setError(null);
    setSent(null);
    setBusy(true);
    try {
      const { error: err } = await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthRedirectUrl(window.location.origin, next),
          queryParams: { prompt: 'select_account' },
        },
      });
      if (err) throw err;
      // On success the browser is already navigating to Google.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in could not start.');
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(null);
    setBusy(true);

    const supabase = createClient();

    try {
      if (mode === 'password') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push(next);
        router.refresh();
      } else if (sentPhone) {
        const { error: err } = await supabase.auth.verifyOtp({
          phone: sentPhone,
          token: otpCode.trim(),
          type: 'sms',
        });
        if (err) throw err;
        router.push(next);
        router.refresh();
      } else {
        // D3: whatever the user typed, what leaves this browser is E.164.
        const normalised = toE164(phone, countryCode);
        if (!normalised) {
          throw new Error(
            'That does not look like a valid phone number. Include the country code, e.g. +256772123456.',
          );
        }
        const { error: err } = await supabase.auth.signInWithOtp({ phone: normalised });
        if (err) throw err;
        setSentPhone(normalised);
        setSent(`If an account exists for ${normalised}, a code is on its way.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!sentPhone || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await createClient().auth.signInWithOtp({ phone: sentPhone });
      if (err) throw err;
      setOtpCode('');
      setSent(`A new code has been sent to ${sentPhone}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    } finally {
      setBusy(false);
    }
  }

  const phoneIsE164 = isE164(phone);

  return (
    <div className="narrow">
    <div className="card">
      <h1>Sign in</h1>
      <p className="muted">Welcome back.</p>

      {googleEnabled && (
        <>
          <button
            type="button"
            className="btn secondary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            onClick={signInWithGoogle}
            disabled={busy}
          >
            Continue with Google
          </button>
          <p className="muted" style={{ textAlign: 'center', margin: '0.75rem 0', fontSize: '0.85rem' }}>
            or use one of these
          </p>
        </>
      )}

      <div className="tabs">
        <a
          href="#password"
          aria-current={mode === 'password' ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setMode('password'); }}
        >
          Email and password
        </a>
        <a
          href="#otp"
          aria-current={mode === 'otp' ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setMode('otp'); }}
        >
          Phone code
        </a>
      </div>

      {error && <p className="danger">{error}</p>}
      {sent && <div className="notice">{sent}</div>}

      <form onSubmit={onSubmit}>
        {mode === 'password' ? (
          <>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        ) : (
          <>
            <label htmlFor="phone">Mobile number</label>
            <div className="row">
              <input
                aria-label="Country code"
                value={countryCode}
                disabled={Boolean(sentPhone) || busy}
                onChange={(e) => setCountryCode(e.target.value)}
              />
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="0772 123 456"
                value={phone}
                disabled={Boolean(sentPhone) || busy}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
              {phoneIsE164
                ? 'Already in international format.'
                : `Will be sent as ${toE164(phone, countryCode) ?? '—'}`}
            </p>
            {sentPhone && (
              <>
                <label htmlFor="otp-code">Text message code</label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]+"
                  maxLength={12}
                  required
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))}
                />
                <div className="row">
                  <button type="button" className="btn secondary" disabled={busy} onClick={resendCode}>
                    Resend code
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={() => {
                      setSentPhone(null);
                      setOtpCode('');
                      setSent(null);
                      setError(null);
                    }}
                  >
                    Change number
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'password' ? 'Sign in' : sentPhone ? 'Verify code' : 'Send code'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        {mode === 'password' && <><Link href="/forgot-password">Forgot password?</Link>{' · '}</>}
        <Link href="/sign-up">Create an account</Link>
      </p>
    </div>
    </div>
  );
}
