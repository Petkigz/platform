'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toE164 } from '@/lib/phone';

export default function SignUp() {
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+256');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setBusy(true);

    const supabase = createClient();

    try {
      if (mode === 'email') {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setDone(
          'Account created. Check your email to confirm the address, then sign in.',
        );
      } else {
        // D3: phone stored in E.164, so it is one account however it was typed.
        const normalised = toE164(phone, countryCode);
        if (!normalised) {
          throw new Error(
            'That does not look like a valid phone number. Include the country code.',
          );
        }
        const { error: err } = await supabase.auth.signUp({ phone: normalised, password });
        if (err) throw err;
        setDone(`Account created for ${normalised}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>Create an account</h1>
      <p className="muted">An adult account. Children learn under a family, not their own login.</p>

      <div className="tabs">
        <a href="#email" aria-current={mode === 'email' ? 'page' : undefined}
           onClick={(e) => { e.preventDefault(); setMode('email'); }}>
          Email
        </a>
        <a href="#phone" aria-current={mode === 'phone' ? 'page' : undefined}
           onClick={(e) => { e.preventDefault(); setMode('phone'); }}>
          Mobile number
        </a>
      </div>

      {error && <p className="danger">{error}</p>}
      {done && <div className="notice">{done}</div>}

      <form onSubmit={onSubmit}>
        {mode === 'email' ? (
          <>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required
                   value={email} onChange={(e) => setEmail(e.target.value)} />
          </>
        ) : (
          <>
            <label htmlFor="phone">Mobile number</label>
            <div className="row">
              <input aria-label="Country code" value={countryCode}
                     onChange={(e) => setCountryCode(e.target.value)} />
              <input id="phone" type="tel" inputMode="tel" autoComplete="tel" required
                     placeholder="0772 123 456"
                     value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
              Stored as {toE164(phone, countryCode) ?? '—'}
            </p>
          </>
        )}

        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="new-password" required
               minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          We never store it. Supabase Auth holds the credential.
        </p>

        <button type="submit" disabled={busy}>{busy ? 'Working…' : 'Create account'}</button>
      </form>

      <p style={{ marginTop: '1rem' }}><Link href="/sign-in">Already have an account?</Link></p>
    </div>
  );
}
