'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Say } from '@/components/say';
import { fill, formatDateTime, formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
import {
  INVITE_EXPIRY_OPTIONS,
  SHARE_SCOPES,
  validateEmailInput,
  type ShareScope,
  type ShareStatus,
} from '@/lib/sharing';
import { shareDoneOf, shareOutcomeOf, type ShareCode } from '@/lib/sharing-outcome';

/** Everything this panel says, in the language of the page that draws it. */
export type ShareWords = {
  /** The language the words are in: counts and dates are written its way. */
  locale: LocaleCode;
  whoHeading: string;
  /** Holds `{count}`. */
  liveCount: string;
  nobody: string;
  end: string;
  ending: string;
  inviteHeading: string;
  inviteLede: string;
  emailLabel: string;
  scopeLabel: string;
  lengthLabel: string;
  scopes: Record<ShareScope, string>;
  /** A length offered, by its number of days. */
  lengths: Record<number, string>;
  lengthHelp: string;
  invite: string;
  inviting: string;
  emailOff: string;
  sameAnswer: string;
  /** Holds `{email}`. */
  invited: string;
  /** Holds `{date}`. */
  invitedUntil: string;
  endedDone: string;
  /** What is said for each refusal this panel can be answered with. */
  errors: Record<'signed_out' | 'email' | 'own_address' | 'no_profile' | 'no_share' | 'not_yours' | 'refused', string>;
  off: string;
  /** Something was asked for and no answer came back. */
  unconfirmed: string;
};

/** One share this account granted, with everything about it already in words. */
export type ShareView = {
  id: string;
  /** The name the other account gave itself, or the screen's words for none. */
  name: string;
  /** Whether `name` is a person's own, and so is set apart from the sentence. */
  named: boolean;
  scope: string;
  status: ShareStatus;
  statusLabel: string;
  /** When it was shared, until when, and when it was ended: one line each. */
  lines: string[];
};

type Done = { did: 'invited'; email: string; until: string | null } | { did: 'ended' };

/**
 * Who can see this adult's learning.
 *
 * The form asks for an address and then invites it. It does not look the
 * address up first, because a lookup that says "no account found" tells
 * whoever asked that the address is not registered here, and that is a fact
 * about a stranger, not a feature. The invitation is created either way and
 * the reply is the same either way, so there is nothing on this screen to
 * compare.
 *
 * An invitation is a link in a mailbox, so it always has an end: a week, a
 * month or three months. Ending a share is the whole of the control
 * afterwards: changing the terms means ending one and granting another.
 *
 * **It has no words of its own.** Every sentence is handed to it by the page,
 * already in the reader's language. What the route answers is read as a name
 * (`lib/sharing-outcome.ts`); nothing the database wrote is shown.
 *
 * **An invitation with no answer is unknown.** It may have been recorded and
 * sent, so a request that never arrived, or a reply nobody can read, is not
 * said as "nothing was sent": the reader is asked to reload and see.
 *
 * **With the switch off it is only the list.** A share granted while sharing
 * was on is still read by the other account, so ending it is still offered;
 * nobody can be invited, so the form is not drawn.
 */
export function SharingPanel({
  words,
  enabled,
  emailEnabled,
  shares,
}: {
  words: ShareWords;
  /** Whether sharing is switched on. Off: the list and its buttons, nothing else. */
  enabled: boolean;
  emailEnabled: boolean;
  /** The shares this account granted, or `null` when the list could not be read. */
  shares: ShareView[] | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  const [email, setEmail] = useState('');
  const [scope, setScope] = useState<ShareScope>(SHARE_SCOPES[0] ?? 'progress');
  const [days, setDays] = useState<number>(INVITE_EXPIRY_OPTIONS[0]?.days ?? 7);

  const said = (code: ShareCode): string => {
    if (code === 'failed') return words.unconfirmed;
    if (code === 'off') return words.off;
    if (
      code === 'signed_out' ||
      code === 'email' ||
      code === 'own_address' ||
      code === 'no_profile' ||
      code === 'no_share' ||
      code === 'not_yours'
    ) {
      return words.errors[code];
    }
    return words.errors.refused;
  };

  async function send(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setDone(null);
    try {
      const response = await fetch('/api/account/sharing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result: unknown = await response.json().catch(() => null);
      const finished = response.ok ? shareDoneOf(result) : null;
      // Whatever was answered, the page is read again: a refusal usually
      // means the list on it is out of date.
      startTransition(() => router.refresh());
      if (!finished) {
        setError(said(response.ok ? 'failed' : shareOutcomeOf(response.status, result)));
        return null;
      }
      return finished;
    } catch {
      setError(words.unconfirmed);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const checked = validateEmailInput({ email });
    if (!checked.ok) {
      setDone(null);
      setError(words.errors.email);
      return;
    }
    const finished = await send({ action: 'invite', email: checked.value, scope, days }, 'invite');
    if (!finished) return;
    if (finished.did !== 'invited') {
      setError(words.unconfirmed);
      return;
    }
    setDone({
      did: 'invited',
      email: checked.value,
      until: finished.expiresAt ? formatDateTime(words.locale, finished.expiresAt) : null,
    });
    setEmail('');
  }

  async function end(shareId: string) {
    const finished = await send({ action: 'revoke', shareId }, shareId);
    if (!finished) return;
    if (finished.did !== 'ended') {
      setError(words.unconfirmed);
      return;
    }
    setDone({ did: 'ended' });
  }

  const live = (shares ?? []).filter((share) => share.status === 'active').length;

  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="notice" role="status">
          {done.did === 'ended' ? (
            words.endedDone
          ) : (
            <>
              {/* Never "we found them" or "we did not": the answer is the same for both. */}
              <Say text={words.invited} parts={{ email: <bdi dir="ltr">{done.email}</bdi> }} />
              {done.until && <> {fill(words.invitedUntil, { date: done.until })}</>}
            </>
          )}
        </p>
      )}

      {shares && (
        <section className="section-sm">
          <h2>{words.whoHeading}</h2>
          {shares.length === 0 ? (
            <p className="empty">{words.nobody}</p>
          ) : (
            <>
              <p className="muted">{fill(words.liveCount, { count: formatNumber(words.locale, live) })}</p>
              <ul className="lessons stacked">
                {shares.map((share) => (
                  <li key={share.id}>
                    <span className={`badge ${share.status === 'active' ? 'warn' : 'neutral'}`}>
                      {share.statusLabel}
                    </span>
                    <span className="t" style={{ display: 'block', marginTop: '0.35rem' }}>
                      {share.named ? <bdi>{share.name}</bdi> : share.name}
                      <span className="muted" style={{ display: 'block' }}>
                        {share.scope}
                      </span>
                      {share.lines.map((line) => (
                        <span key={line} className="muted" style={{ display: 'block' }}>
                          {line}
                        </span>
                      ))}
                    </span>
                    {share.status === 'active' && (
                      <div className="page-actions" style={{ marginTop: '0.6rem' }}>
                        <button
                          className="btn secondary"
                          type="button"
                          disabled={busy !== null}
                          onClick={() => end(share.id)}
                        >
                          {busy === share.id ? words.ending : words.end}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {enabled && (
        <section className="section-sm">
          <h2>{words.inviteHeading}</h2>
          <p className="muted">{words.inviteLede}</p>

          <form onSubmit={invite} noValidate className="card" style={{ padding: '1.25rem', maxWidth: '32rem' }}>
            <label htmlFor="share-email">{words.emailLabel}</label>
            <input
              id="share-email"
              type="email"
              dir="ltr"
              autoComplete="off"
              maxLength={320}
              aria-describedby="share-email-help"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy !== null}
            />
            <p id="share-email-help" className="muted" style={{ marginTop: '0.4rem' }}>
              {words.sameAnswer}
            </p>

            <label htmlFor="share-scope">{words.scopeLabel}</label>
            <select
              id="share-scope"
              value={scope}
              onChange={(event) => setScope(event.target.value as ShareScope)}
              disabled={busy !== null}
            >
              {SHARE_SCOPES.map((value) => (
                <option key={value} value={value}>
                  {words.scopes[value]}
                </option>
              ))}
            </select>

            <label htmlFor="share-days" style={{ marginTop: '0.75rem' }}>
              {words.lengthLabel}
            </label>
            <select
              id="share-days"
              value={String(days)}
              aria-describedby="share-days-help"
              onChange={(event) => setDays(Number(event.target.value))}
              disabled={busy !== null}
            >
              {INVITE_EXPIRY_OPTIONS.map((option) => (
                <option key={option.days} value={String(option.days)}>
                  {words.lengths[option.days] ?? formatNumber(words.locale, option.days)}
                </option>
              ))}
            </select>
            <p id="share-days-help" className="muted" style={{ marginTop: '0.4rem' }}>
              {words.lengthHelp}
            </p>

            {!emailEnabled && <p className="muted">{words.emailOff}</p>}

            <button className="btn" type="submit" disabled={busy !== null}>
              {busy === 'invite' ? words.inviting : words.invite}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
