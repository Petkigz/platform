'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toE164, isE164 } from '@/lib/phone';
import { oauthRedirectUrl } from '@/lib/oauth';
import { useT } from '@/lib/i18n/client';
import { signInAddress } from '@/lib/child-login';

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
  const t = useT();

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
      // A provider's own words, in English: Supabase Auth wrote the reason and
      // translating it would be a guess. Our own refusals are ours.
      setError(err instanceof Error ? err.message : t('auth.somethingWrong'));
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
        // A bare word is a child's username; anything with an @ is an address and
        // is left exactly as typed. The transform is local: it never asks the
        // database whether a username exists, so a wrong one fails the same way a
        // wrong password does and cannot be used to enumerate children.
        const { error: err } = await supabase.auth.signInWithPassword({
          email: signInAddress(email),
          password,
        });
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
          throw new Error(t('auth.invalidPhone'));
        }
        const { error: err } = await supabase.auth.signInWithOtp({ phone: normalised });
        if (err) throw err;
        setSentPhone(normalised);
        setSent(t('auth.codeSent', { phone: normalised }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.somethingWrong'));
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
      setSent(t('auth.codeResent', { phone: sentPhone }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  const phoneIsE164 = isE164(phone);

  return (
    <div className="narrow">
    <div className="card">
      <h1>{t('auth.signInTitle')}</h1>
      <p className="muted">{t('auth.signInLede')}</p>

      {googleEnabled && (
        <>
          <button
            type="button"
            className="btn secondary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            onClick={signInWithGoogle}
            disabled={busy}
          >
            {t('auth.google')}
          </button>
          <p className="muted" style={{ textAlign: 'center', margin: '0.75rem 0', fontSize: '0.85rem' }}>
            {t('auth.orGoogle')}
          </p>
        </>
      )}

      <div className="tabs">
        <a
          href="#password"
          aria-current={mode === 'password' ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setMode('password'); }}
        >
          {t('auth.tabPassword')}
        </a>
        <a
          href="#otp"
          aria-current={mode === 'otp' ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setMode('otp'); }}
        >
          {t('auth.tabPhone')}
        </a>
      </div>

      {error && <p className="danger">{error}</p>}
      {sent && <div className="notice">{sent}</div>}

      <form onSubmit={onSubmit}>
        {mode === 'password' ? (
          <>
            <label htmlFor="email">{t('auth.email')}</label>
            {/* Text rather than type="email" since 2026-10-30, because a child
                signs in with the username their guardian made rather than an
                address — the browser's own validation would refuse it before
                this form ever ran. An address still goes through untouched. */}
            <input
              id="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="password">{t('auth.password')}</label>
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
            <label htmlFor="phone">{t('auth.mobile')}</label>
            <div className="row">
              <input
                aria-label={t('auth.countryCode')}
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
                ? t('auth.international')
                : t('auth.phoneAs', { phone: toE164(phone, countryCode) ?? '—' })}
            </p>
            {sentPhone && (
              <>
                <label htmlFor="otp-code">{t('auth.otpCode')}</label>
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
                    {t('auth.resendCode')}
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
                    {t('auth.changeNumber')}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <button type="submit" disabled={busy}>
          {busy
            ? t('auth.working')
            : mode === 'password'
              ? t('auth.signInTitle')
              : sentPhone
                ? t('auth.verifyCode')
                : t('auth.sendCode')}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        {mode === 'password' && <><Link href="/forgot-password">{t('auth.forgot')}</Link>{' · '}</>}
        <Link href="/sign-up">{t('auth.noAccount')}</Link>
      </p>
    </div>
    </div>
  );
}
