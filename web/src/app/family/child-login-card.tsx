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
  canCreate?: boolean;
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
  const [made, setMade] = useState<{ username: string; recovered: boolean } | null>(null);
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
    try {
      const res = await fetch('/api/family/child-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ learnerId, username, password }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; username?: string; recovered?: boolean; message?: string; error?: string; code?: string }
        | null;
      if (!res.ok || json?.ok !== true || typeof json.username !== 'string' || typeof json.recovered !== 'boolean') {
        setError(json?.message ?? childLoginSentence(json?.code ?? json?.error));
        return;
      }
      setMade({ username: json.username, recovered: json.recovered });
      setUsername('');
      setPassword('');
      startTransition(() => router.refresh());
    } catch {
      setError('We could not confirm this login. Refresh the family page or contact privacy@ayahspring.com before retrying. If you retry, use the original password.');
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
        | { ok?: boolean; code?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setError(json?.code ? childLoginSentence(json.code) :
          'We could not confirm detachment. Refresh the page or contact privacy@ayahspring.com before trying again.');
        return;
      }
      setConfirmRemove(false);
      setReason('');
      startTransition(() => router.refresh());
    } catch {
      setError('We could not confirm detachment. Refresh the page or contact privacy@ayahspring.com before trying again.');
    } finally {
      setBusy(false);
    }
  }

  if (made) {
    return (
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="notice">
          <strong>{childName}&rsquo;s learner profile is linked.</strong> The username is{' '}
          <strong>{made.username}</strong>. {made.recovered
            ? 'This was recovered from an earlier attempt. The password set in that earlier attempt remains in effect; the password entered on this retry did not replace it.'
            : 'Use the password you chose for this login.'}
        </div>
        <p className="muted">The username is a sign-in identifier, not an email mailbox.
          Contact privacy@ayahspring.com if you need help with the password.</p>
        <button type="button" className="btn ghost" onClick={() => { setMade(null); startTransition(() => router.refresh()); }}>
          Done
        </button>
      </div>
    );
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
          Password reset is not available here yet. Contact privacy@ayahspring.com
          if you need help with the sign-in.
        </p>

        {!confirmRemove ? (
          <button type="button" className="btn ghost" onClick={() => setConfirmRemove(true)}>
            Detach this learner
          </button>
        ) : (
          <div>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              This detaches the learner profile but does not delete the sign-in or revoke
              provider sessions. A trusted identity may also be blocked on database paths that
              use the platform identity check; other access can remain. Contact privacy@ayahspring.com to arrange separate sign-in
              removal. Lessons, progress and certificates remain with the learner.
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
                {busy ? 'Detaching…' : 'Detach the learner'}
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

  if (!state.canCreate) {
    return <p className="muted">A new child login is not available for this profile. It may be switched off or an earlier login may need review. Contact privacy@ayahspring.com for help.</p>;
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
