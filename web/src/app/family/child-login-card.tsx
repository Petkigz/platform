'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { childLoginSentence, passwordProblem, usernameProblem } from '@/lib/child-login';

export type ChildLoginState = {
  learnerProfileId: string;
  hasLogin: boolean;
  username: string | null;
  createdAt: string | null;
  canManage: boolean;
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
 * The password the guardian types is sent once and never stored anywhere the
 * platform can read it: it goes straight to Supabase's auth, and no screen can
 * show it again. That is why the card says to write it down.
 */
export function ChildLoginCard({
  learnerId,
  childName,
  state,
}: {
  learnerId: string;
  childName: string;
  state: ChildLoginState;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [reason, setReason] = useState('');
  const [, startTransition] = useTransition();

  if (!state.canManage) return null;

  async function make() {
    setError(null);
    const shape = usernameProblem(username);
    if (shape) {
      setError(shape);
      return;
    }
    const weak = passwordProblem(password);
    if (weak) {
      setError(weak);
      return;
    }

    setBusy(true);
    const res = await fetch('/api/family/child-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ learnerId, username, password }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; username?: string; error?: string; code?: string }
      | null;
    setBusy(false);

    if (!res.ok || !json?.ok) {
      setError(childLoginSentence(json?.code ?? json?.error));
      return;
    }

    setMade(json.username ?? username);
    setUsername('');
    setPassword('');
    startTransition(() => router.refresh());
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/family/child-login', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ learnerId, reason }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; code?: string }
      | null;
    setBusy(false);
    if (!res.ok || !json?.ok) {
      setError(childLoginSentence(json?.code));
      return;
    }
    setConfirmRemove(false);
    setReason('');
    startTransition(() => router.refresh());
  }

  if (state.hasLogin && state.username) {
    return (
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="outline-h">
          <strong style={{ fontSize: '0.95rem' }}>Their own login</strong>
          <span className="badge">{state.username}</span>
        </div>
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
          {childName} signs in with the username <strong>{state.username}</strong>
          {state.createdAt
            ? ` — made on ${new Date(state.createdAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}.`
            : '.'}{' '}
          If they forget the password, set a new one here: there is no email to send a
          reset to, because the login has no mailbox.
        </p>

        {!confirmRemove ? (
          <button type="button" className="btn ghost" onClick={() => setConfirmRemove(true)}>
            Remove this login
          </button>
        ) : (
          <div>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              {childName} will stop being able to sign in as themselves. Their lessons,
              progress and certificates stay exactly where they are, and you keep seeing
              them here — nothing is deleted.
            </p>
            <label htmlFor={`reason-${learnerId}`}>
              Why (optional — kept for the record)
            </label>
            <input
              id={`reason-${learnerId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn" onClick={remove} disabled={busy}>
                {busy ? 'Removing…' : 'Remove the login'}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmRemove(false)}
                disabled={busy}
              >
                Keep it
              </button>
            </div>
          </div>
        )}
        {error && <p className="muted" style={{ color: 'var(--danger, #b3261e)' }}>{error}</p>}
      </div>
    );
  }

  if (made) {
    return (
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="notice">
          <strong>{childName} can now sign in.</strong> The username is{' '}
          <strong>{made}</strong>. If you did not write the password down, set a new one
          by removing this login and making it again — nobody on the platform can read it.
        </div>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          On the sign-in page, {childName} types <strong>{made}</strong> where it asks for
          an email address. It is not one: it is a username, and nothing is ever sent to
          it.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {!open ? (
        <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
          Give {childName} their own login
        </button>
      ) : (
        <div className="card">
          <label htmlFor={`username-${learnerId}`}>
            Username
          </label>
          <input
            id={`username-${learnerId}`}
            
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="amina.k"
          />
          <label htmlFor={`password-${learnerId}`}>
            Password
          </label>
          <input
            id={`password-${learnerId}`}
            
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Write the password down somewhere safe. It is sent straight to the sign-in
            service and nobody — including us — can read it back afterwards. Letters,
            numbers, dots, dashes and underscores; no spaces.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn" onClick={make} disabled={busy}>
              {busy ? 'Making the login…' : `Make ${childName}'s login`}
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
              Cancel
            </button>
          </div>
          {error && <p className="muted" style={{ color: 'var(--danger, #b3261e)' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
