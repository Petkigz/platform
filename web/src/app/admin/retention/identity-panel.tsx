'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  canRecordRemoval,
  describeIdentityRemoval,
  identityAttentionLines,
  identityLookupSentence,
  identityQueueHeadline,
  identityRefusalSentence,
  identityRowSituation,
  parseIdentityLookup,
  parseIdentityRemoval,
  type IdentityLookup,
  type IdentityQueue,
  type IdentityQueueRow,
} from '@/lib/identity';

/**
 * The identities nobody could see.
 *
 * Three units called this "staff work" and wrote it in a document. A document is
 * not a queue: the number was never counted, the step was never recorded, and the
 * person who asked "did it happen?" had no answer. This card is the queue.
 *
 * Why the button can be pressed without a confirmation step: it does not delete
 * anything. It asks the database to write down a deletion that has already
 * happened, and the database checks `auth.users` first and refuses if the row is
 * still there. Pressing the wrong row is therefore harmless — it comes back with
 * "Supabase still holds this sign-in" — and pressing the right one twice is
 * refused as already recorded.
 *
 * The lookup is the other half. Somebody who closed their account cannot sign in
 * to ask whether it worked, so support asks for them. Every lookup is audited by
 * the database and returns no name.
 */
export function IdentityPanel({ queue }: { queue: IdentityQueue }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [lookup, setLookup] = useState<IdentityLookup | null>(null);
  const [, startTransition] = useTransition();

  const attention = identityAttentionLines(queue);

  async function record(row: IdentityQueueRow) {
    setMessage(null);
    setFailed(false);
    setBusy(row.userId);
    try {
      const response = await fetch('/api/admin/identity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'record', userId: row.userId }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; code?: string | null; removal?: unknown }
        | null;
      if (!response.ok || result?.ok !== true) {
        setFailed(true);
        setMessage(identityRefusalSentence(result?.code ?? null));
        return;
      }
      setMessage(describeIdentityRemoval(parseIdentityRemoval(result.removal)));
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setFailed(false);
    setLookup(null);
    const response = await fetch('/api/admin/identity', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'lookup', address }),
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; lookup?: unknown }
      | null;
    if (!response.ok || result?.ok !== true) {
      setFailed(true);
      setMessage(result?.message ?? 'The lookup did not run.');
      return;
    }
    setLookup(parseIdentityLookup(result.lookup));
  }

  return (
    <>
      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>Sign-ins still at the provider</h3>
      </div>

      <div className="stats" style={{ marginTop: '1rem' }}>
        <div>
          <div className="n">{queue.stillAtProvider}</div>
          <div className="l">Still able to sign in</div>
        </div>
        <div>
          <div className="n">{queue.removed}</div>
          <div className="l">Recorded as deleted</div>
        </div>
        <div>
          <div className="n">{queue.closedAccounts}</div>
          <div className="l">Accounts closed</div>
        </div>
        <div>
          <div className="n">{queue.activeWithoutIdentity}</div>
          <div className="l">Active, no identity</div>
        </div>
      </div>

      <div className="notice" style={{ marginTop: '1rem' }}>
        {identityQueueHeadline(queue)}
      </div>

      {attention.map((line) => (
        <p key={line} className="muted" style={{ marginTop: '0.75rem' }}>
          {line}
        </p>
      ))}

      {message && (
        <p style={{ color: failed ? 'var(--danger, #b3261e)' : undefined, marginTop: '0.9rem' }}>
          {message}
        </p>
      )}

      {queue.rows.length === 0 ? (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p className="muted" style={{ margin: 0 }}>
            Nothing is outstanding. A closed account whose sign-in is deleted at the provider
            appears here until somebody records it, and nothing else does.
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginTop: '1rem' }}>
          <ul className="lessons">
            {queue.rows.map((row) => (
              <li key={row.userId}>
                <strong>{row.label}</strong>
                <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                  {identityRowSituation(row)}
                </span>
                {canRecordRemoval(row) && (
                  <span style={{ display: 'block', marginTop: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busy !== null}
                      onClick={() => void record(row)}
                    >
                      {busy === row.userId ? 'Recording…' : 'Record it deleted at the provider'}
                    </button>
                  </span>
                )}
                <span className="muted" style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  {row.userId}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>Ask whether an account was erased</h3>
      </div>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Somebody who closed their account cannot sign in to ask. Type the address they used and
          this answers from a fingerprint of it: whether an erased account is behind the address,
          and whether the sign-in is gone. It never returns a name, and the database records every
          time this is asked.
        </p>
        <form onSubmit={ask} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="the address they signed in with"
            aria-label="Address to look up"
            style={{ flex: '1 1 18rem', padding: '0.55rem 0.7rem' }}
          />
          <button type="submit" className="btn" disabled={address.trim() === ''}>
            Ask
          </button>
        </form>
        {lookup && (
          <p style={{ marginBottom: 0, marginTop: '0.9rem' }}>{identityLookupSentence(lookup)}</p>
        )}
      </div>
    </>
  );
}
