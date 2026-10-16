'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toE164, isE164 } from '@/lib/phone';

/**
 * D3: both email+password and phone OTP.
 *
 * OTP is deliberately offered at sign-in rather than as the only method — the
 * recorded decision is that long-lived refresh tokens make OTP fire at
 * registration and recovery, so a returning user should not pay for an SMS
 * every time they open the app.
 */
function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/learn';

  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+256');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

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
        setSent(`If an account exists for ${normalised}, a code is on its way.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const phoneIsE164 = isE164(phone);

  return (
    <div className="card">
      <h1>Sign in</h1>
      <p className="muted">Welcome back.</p>

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
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
              {phoneIsE164
                ? 'Already in international format.'
                : `Will be sent as ${toE164(phone, countryCode) ?? '—'}`}
            </p>
          </>
        )}

        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'password' ? 'Sign in' : 'Send code'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        <Link href="/sign-up">Create an account</Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="card">Loading…</div>}>
      <SignIn />
    </Suspense>
  );
}
