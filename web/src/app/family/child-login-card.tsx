'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Say } from '@/components/say';
import { passwordCode, usernameCode } from '@/lib/child-login';
import type { ChildLoginAge } from '@/lib/child-login-age';
import { childLoginOutcomeOf, type ChildLoginCode } from '@/lib/child-login-outcome';

export type ChildLoginState = {
  learnerProfileId: string;
  hasLogin: boolean;
  username: string | null;
  createdAt: string | null;
  canManage: boolean;
  canCreate?: boolean;
  canReset?: boolean;
};

/**
 * Every sentence the card says, in the reader's language.
 *
 * A sentence arrives whole with its gaps in it: `{name}` for the child,
 * `{username}`, and `{date}` in `signsInSince`. The card fills them with
 * markup (`Say`), so a name keeps its own direction inside an Arabic
 * sentence. The address to write to is already in the sentences that have
 * one.
 */
export type ChildLoginWords = {
  linked: string;
  usernameIs: string;
  recovered: string;
  handOver: string;
  notMailbox: string;
  done: string;
  title: string;
  signsIn: string;
  signsInSince: string;
  canReset: string;
  noReset: string;
  ownYes: string;
  ownNo: string;
  setNew: string;
  newPassword: string;
  resetNote: string;
  checking: string;
  change: string;
  resetDone: string;
  detach: string;
  detachMeans: string;
  why: string;
  detaching: string;
  detachYes: string;
  keep: string;
  underTwelve: string;
  notOffered: string;
  give: string;
  username: string;
  password: string;
  firstPassword: string;
  confirmTwelve: string;
  making: string;
  make: string;
  cancel: string;
  /** A refusal, by the name `childLoginOutcomeOf` gives it. */
  refusals: Record<Exclude<ChildLoginCode, 'unconfirmed'>, string>;
  /** An answer that is not plainly a refusal, by what was being done. */
  unconfirmed: Record<'make' | 'reset' | 'detach', string>;
};

/**
 * A child's own login, on the child's card.
 *
 * Two fields and one button, because that is the whole decision: the guardian
 * picks a username and a password the child can remember. There is no invitation
 * link to forward and no email address to invent — see `reserve_child_login()`
 * for why the name is claimed before the account exists.
 *
 * Three states:
 *
 *   * the child has no login and the adult may make one — the form;
 *   * the child has one — the username, the day it was made, and a way to remove
 *     it that says plainly that nothing is deleted;
 *   * the adult may not manage this child — nothing, because a button that would
 *     be refused is worse than no button.
 *
 * Creation follows the dashboard switch and current guardian verification.
 * Detachment stays visible even while creation is off.
 *
 * **From twelve** (owner decision, 2026-11-24). A child under twelve has no
 * login of their own and the card says so instead of offering a form. For
 * the 11-13 band the guardian ticks a box saying the child is twelve or
 * older; no date of birth is asked for. The database holds the rule
 * (`prepare_child_login`); this card only stops a guardian filling in a form
 * that would be refused. When `age` could not be read the form is drawn and
 * the database still decides.
 *
 * **The password becomes the child's.** The guardian chooses the first one
 * to hand over; the child is asked to choose their own when they sign in,
 * and the card says whether they have.
 *
 * **The words are handed in** by the family page, in the reader's language
 * (`ChildLoginWords`). There is no English of its own in this file.
 *
 * **A refusal is said by its name** (`lib/child-login-outcome.ts`). The card
 * used to print the sentence the route sent, which was English. A login is
 * made in two places, so an answer that is not plainly a refusal is not
 * "try again": the sentence for it sends the guardian to look first, and a
 * request that could not be made at all is said the same way.
 *
 * `madeOn` is the day the login was made, already written in the reader's
 * language by the page; empty when it is not known.
 */
export function ChildLoginCard({
  learnerId,
  childName,
  state,
  age = null,
  words,
  madeOn = '',
}: {
  learnerId: string;
  childName: string;
  state: ChildLoginState;
  age?: ChildLoginAge | null;
  words: ChildLoginWords;
  madeOn?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ username: string; recovered: boolean } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [reason, setReason] = useState('');
  const [twelve, setTwelve] = useState(false);
  // What the database said about the child's age when this page could not read it.
  const [told, setTold] = useState<'confirm' | 'under_twelve' | null>(null);
  const gate = told ?? age?.gate ?? null;
  const [, startTransition] = useTransition();

  if (!state.canManage) return null;

  const sentenceFor = (code: ChildLoginCode, doing: 'make' | 'reset' | 'detach') =>
    code === 'unconfirmed' ? words.unconfirmed[doing] : words.refusals[code];
  // What goes into a sentence's gaps. A name and a username are isolated: each
  // keeps its own direction whatever the sentence around it is written in.
  const name = <bdi>{childName}</bdi>;
  const parts = (shownUsername: string | null) => ({
    name,
    username: <strong><bdi>{shownUsername ?? ''}</bdi></strong>,
    date: madeOn,
  });

  async function make() {
    setError(null);
    const shape = usernameCode(username) ?? passwordCode(password);
    if (shape) {
      setError(words.refusals[shape]);
      return;
    }
    if (gate === 'confirm' && !twelve) {
      setError(words.refusals.confirm_twelve);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/family/child-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ learnerId, username, password, twelveOrOlder: twelve }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; username?: string; recovered?: boolean; code?: unknown }
        | null;
      if (!res.ok || json?.ok !== true || typeof json.username !== 'string' || typeof json.recovered !== 'boolean') {
        const code = childLoginOutcomeOf(res.status, json?.code);
        if (code === 'confirm_twelve') setTold('confirm');
        if (code === 'under_twelve') setTold('under_twelve');
        setError(sentenceFor(code, 'make'));
        return;
      }
      setMade({ username: json.username, recovered: json.recovered });
      setUsername('');
      setPassword('');
      startTransition(() => router.refresh());
    } catch {
      // The request may have arrived and its answer been lost.
      setError(words.unconfirmed.make);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError(null);
    setResetDone(false);
    const weak = passwordCode(password);
    if (weak) {
      setError(words.refusals[weak]);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/family/child-login', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ learnerId, password }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown } | null;
      if (!res.ok || json?.ok !== true) {
        setError(sentenceFor(childLoginOutcomeOf(res.status, json?.code), 'reset'));
        return;
      }
      setPassword('');
      setResetOpen(false);
      setResetDone(true);
    } catch {
      setError(words.unconfirmed.reset);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/family/child-login', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ learnerId, reason }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; code?: unknown; removed?: { removed?: boolean } }
        | null;
      if (!res.ok || json?.ok !== true || json.removed?.removed !== true) {
        setError(sentenceFor(childLoginOutcomeOf(res.status, json?.code), 'detach'));
        return;
      }
      setConfirmRemove(false);
      setReason('');
      startTransition(() => router.refresh());
    } catch {
      setError(words.unconfirmed.detach);
    } finally {
      setBusy(false);
    }
  }

  const problem = error && (
    <p className="muted" role="alert" style={{ color: 'var(--danger, #b3261e)' }}>
      {error}
    </p>
  );

  if (made) {
    return (
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="notice">
          <strong>
            <Say text={words.linked} parts={parts(made.username)} />
          </strong>{' '}
          <Say text={words.usernameIs} parts={parts(made.username)} />{' '}
          {made.recovered ? words.recovered : words.handOver}
        </div>
        <p className="muted">{words.notMailbox}</p>
        <button type="button" className="btn ghost" onClick={() => { setMade(null); startTransition(() => router.refresh()); }}>
          {words.done}
        </button>
      </div>
    );
  }

  if (state.hasLogin && state.username) {
    return (
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="outline-h">
          <strong style={{ fontSize: '0.95rem' }}>{words.title}</strong>
          <span className="badge"><bdi>{state.username}</bdi></span>
        </div>
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
          <Say text={madeOn ? words.signsInSince : words.signsIn} parts={parts(state.username)} />{' '}
          {state.canReset ? words.canReset : words.noReset}
        </p>

        {age && age.ownPassword !== null && (
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }} data-child-own-password={age.ownPassword ? 'yes' : 'no'}>
            <Say text={age.ownPassword ? words.ownYes : words.ownNo} parts={parts(state.username)} />
          </p>
        )}

        {state.canReset && (!resetOpen ? (
          <button type="button" className="btn ghost" disabled={busy} onClick={() => { setResetOpen(true); setResetDone(false); setError(null); }}>
            {words.setNew}
          </button>
        ) : (
          <div>
            <label htmlFor={`reset-password-${learnerId}`}>{words.newPassword}</label>
            <input id={`reset-password-${learnerId}`} type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="muted">{words.resetNote}</p>
            <button type="button" className="btn" disabled={busy} onClick={() => void resetPassword()}>
              {busy ? words.checking : words.change}
            </button>{' '}
            <button type="button" className="btn ghost" disabled={busy} onClick={() => { setResetOpen(false); setPassword(''); setError(null); }}>
              {words.cancel}
            </button>
          </div>
        ))}
        {resetDone && <p role="status">{words.resetDone}</p>}
        {!confirmRemove ? (
          <button type="button" className="btn ghost" onClick={() => setConfirmRemove(true)}>
            {words.detach}
          </button>
        ) : (
          <div>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{words.detachMeans}</p>
            <label htmlFor={`reason-${learnerId}`}>{words.why}</label>
            <input
              id={`reason-${learnerId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn" onClick={remove} disabled={busy}>
                {busy ? words.detaching : words.detachYes}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmRemove(false)}
                disabled={busy}
              >
                {words.keep}
              </button>
            </div>
          </div>
        )}
        {problem}
      </div>
    );
  }

  if (gate === 'under_twelve') {
    return (
      <p className="muted" data-child-login-age="under_twelve">
        <Say text={words.underTwelve} parts={parts(null)} />
      </p>
    );
  }

  if (!state.canCreate) {
    return <p className="muted">{words.notOffered}</p>;
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {!open ? (
        <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
          <Say text={words.give} parts={parts(null)} />
        </button>
      ) : (
        <div className="card">
          <label htmlFor={`username-${learnerId}`}>{words.username}</label>
          <input
            id={`username-${learnerId}`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            dir="ltr"
            placeholder="amina.k"
          />
          <label htmlFor={`password-${learnerId}`}>{words.password}</label>
          <input
            id={`password-${learnerId}`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            <Say text={words.firstPassword} parts={parts(null)} />
          </p>
          {gate === 'confirm' && (
            <label htmlFor={`twelve-${learnerId}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }} data-child-login-age="confirm">
              <input
                id={`twelve-${learnerId}`}
                type="checkbox"
                checked={twelve}
                onChange={(e) => setTwelve(e.target.checked)}
                // Not squeezed by a long sentence beside it: in Tamil it shrank to a dot.
                style={{ inlineSize: 'auto', flex: 'none', marginBlockStart: '0.25rem' }}
              />
              <span>
                <Say text={words.confirmTwelve} parts={parts(null)} />
              </span>
            </label>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn" onClick={make} disabled={busy}>
              {busy ? words.making : <Say text={words.make} parts={parts(null)} />}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              disabled={busy}
            >
              {words.cancel}
            </button>
          </div>
          {problem}
        </div>
      )}
    </div>
  );
}
