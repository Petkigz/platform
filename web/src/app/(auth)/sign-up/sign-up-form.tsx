'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toE164 } from '@/lib/phone';
import { oauthRedirectUrl } from '@/lib/oauth';
import { useT } from '@/lib/i18n/client';
import { SIGNUP_KEY, storeSignupAgreement } from '@/lib/policy-notice';

/**
 * The box somebody ticks before an account is made. The words come from the
 * server, already in the reader's language; the titles are the owner's.
 */
export type SignUpAgreement = {
  /** The documents, with the version in force when the page was read. Empty when that could not be read. */
  documents: { slug: string; title: string; version: number; versionLine: string }[];
  box: string;
  /** Said when somebody goes on without ticking. */
  tick: string;
  /** The link to the list of documents, when they could not be named. */
  all: string;
};

export function SignUpForm({ googleEnabled, agreement }: { googleEnabled: boolean; agreement: SignUpAgreement }) {
  const t = useT();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+256');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  /**
   * Whether the box is ticked, and if it is, what was agreed to is kept on
   * this device so it can be recorded when there is an account. False stops
   * all three ways in.
   */
  function agreedFirst(): boolean {
    if (!agreed) {
      setDone(null);
      setError(agreement.tick);
      return false;
    }
    if (agreement.documents.length > 0) {
      try {
        window.localStorage.setItem(
          SIGNUP_KEY,
          storeSignupAgreement(agreement.documents.map((d) => ({ slug: d.slug, version: d.version })), Date.now()),
        );
      } catch {
        // Nothing is kept, so nothing is recorded from here; the account page asks.
      }
    }
    return true;
  }

  /**
   * The same call as signing in: with Google there is no difference between
   * creating an account and entering one, and pretending otherwise would mean
   * an account that exists but refuses to open.
   */
  async function signUpWithGoogle() {
    if (!agreedFirst()) return;
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      const { error: err } = await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthRedirectUrl(window.location.origin, '/dashboard'),
          queryParams: { prompt: 'select_account' },
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.somethingWrong'));
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedFirst()) return;
    setError(null);
    setDone(null);
    setBusy(true);

    const supabase = createClient();

    try {
      if (mode === 'email') {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setDone(t('auth.checkEmail'));
      } else {
        // D3: phone stored in E.164, so it is one account however it was typed.
        const normalised = toE164(phone, countryCode);
        if (!normalised) {
          throw new Error(t('auth.invalidPhone'));
        }
        const { error: err } = await supabase.auth.signUp({ phone: normalised, password });
        if (err) throw err;
        setDone(t('auth.accountCreated', { phone: normalised }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow">
    <div className="card">
      <h1>{t('auth.signUpTitle')}</h1>
      {/* The lede that used to sit here said children learn under a family
          account "not their own login". That stopped being true on 2026-10-30,
          when a guardian gained the right to make one, so the sentence is gone
          rather than left wrong — in this language and in the thirty-two the
          catalogue had it in. A missing sentence is better than a false
          promise; see DECISIONS.md. */}

      <div className="tabs">
        <a href="#email" aria-current={mode === 'email' ? 'page' : undefined}
           onClick={(e) => { e.preventDefault(); setMode('email'); }}>
          {t('auth.email')}
        </a>
        <a href="#phone" aria-current={mode === 'phone' ? 'page' : undefined}
           onClick={(e) => { e.preventDefault(); setMode('phone'); }}>
          {t('auth.mobile')}
        </a>
      </div>

      {error && <p className="danger" role="alert">{error}</p>}
      {done && <div className="notice">{done}</div>}

      {/* Above all three ways in, because it comes before each of them. */}
      <div data-signup-agree style={{ margin: '0.75rem 0' }}>
        <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            name="agree"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked && error === agreement.tick) setError(null);
            }}
            style={{ inlineSize: '1.25rem', blockSize: '1.25rem', margin: '0.15rem 0 0', flex: 'none' }}
          />
          <span>{agreement.box}</span>
        </label>
        <ul style={{ margin: '0.5rem 0 0', paddingInlineStart: '2.4rem', display: 'grid', gap: '0.25rem' }}>
          {agreement.documents.length > 0 ? (
            agreement.documents.map((d) => (
              <li key={d.slug}>
                {/* The owner's title, as written; the documents are not translated. */}
                <Link href={`/policies/${d.slug}`} target="_blank" lang="en" dir="ltr">
                  {d.title}
                </Link>
                {' · '}
                <span className="muted">{d.versionLine}</span>
              </li>
            ))
          ) : (
            <li>
              <Link href="/policies" target="_blank">
                {agreement.all}
              </Link>
            </li>
          )}
        </ul>
      </div>

      {googleEnabled && (
        <>
          <button
            type="button"
            className="btn secondary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            onClick={signUpWithGoogle}
            disabled={busy}
          >
            {t('auth.google')}
          </button>
          <p className="muted" style={{ textAlign: 'center', margin: '0.75rem 0', fontSize: '0.85rem' }}>
            {t('auth.orCreate')}
          </p>
        </>
      )}

      <form onSubmit={onSubmit}>
        {mode === 'email' ? (
          <>
            <label htmlFor="email">{t('auth.email')}</label>
            <input id="email" type="email" autoComplete="email" required
                   value={email} onChange={(e) => setEmail(e.target.value)} />
          </>
        ) : (
          <>
            <label htmlFor="phone">{t('auth.mobile')}</label>
            <div className="row">
              <input aria-label={t('auth.countryCode')} value={countryCode}
                     onChange={(e) => setCountryCode(e.target.value)} />
              <input id="phone" type="tel" inputMode="tel" autoComplete="tel" required
                     placeholder="0772 123 456"
                     value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
              {t('auth.phoneAs', { phone: toE164(phone, countryCode) ?? '—' })}
            </p>
          </>
        )}

        <label htmlFor="password">{t('auth.password')}</label>
        <input id="password" type="password" autoComplete="new-password" required
               minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          {t('auth.passwordNote')}
        </p>

        <button type="submit" disabled={busy}>
          {busy ? t('auth.working') : t('auth.signUpTitle')}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}><Link href="/sign-in">{t('auth.haveAccount')}</Link></p>
    </div>
    </div>
  );
}
