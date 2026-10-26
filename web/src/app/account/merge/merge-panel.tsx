'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  confirmsMerge,
  describeBlocks,
  describeExpiry,
  describeMergeStatus,
  describeMoves,
  leftBehind,
  type MergeBoard,
  type MergeRequest,
} from '@/lib/merge';

/**
 * The two sides of a merge, on one screen.
 *
 * The person who wants to leave an account fills in the email of the account
 * they want to keep; the person who owns that account sees the request waiting
 * and either agrees or does not. Both sides are the same person in practice —
 * that is the point — but the platform still asks both, because "I control both
 * of these" is the only claim a merge rests on.
 *
 * What the screen refuses to do: make it look easy. The confirmation is typing
 * the surviving account's own name, the wording says it cannot be undone, and
 * the list of what will move is shown before the button rather than after it.
 */
export function MergePanel({
  board,
  displayName,
}: {
  board: MergeBoard;
  displayName: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function send(url: string, body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!response.ok || result?.ok !== true) {
        setError(result?.message ?? 'That did not work. Nothing was changed.');
        return null;
      }
      startTransition(() => router.refresh());
      return result;
    } catch {
      setError('Could not reach the server. Nothing was changed.');
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const result = await send('/api/account/merge', { action: 'request', email }, 'request');
    if (result) {
      setEmail('');
      setMessage('The request is waiting on the other account. Sign in there to agree to it.');
    }
  }

  return (
    <>
      {error && <p className="notice error" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}

      {board.incoming.length > 0 && (
        <section className="section">
          <h2>Another account is asking to be merged into this one</h2>
          <p className="muted">
            If this is you on a second account, agreeing moves that account&rsquo;s
            learning, roles and details into this one and closes it. It cannot be
            undone. If it is not you, decline — nothing happens either way until
            you answer.
          </p>
          {board.incoming.map((request) => (
            <IncomingRequest
              key={request.id}
              request={request}
              displayName={displayName}
              busy={busy === request.id}
              onDecide={async (accept, confirm) => {
                const result = await send(
                  '/api/account/merge',
                  { action: 'decide', requestId: request.id, accept, confirm },
                  request.id,
                );
                if (result) {
                  setMessage(accept
                    ? 'The accounts are merged. The other one is closed.'
                    : 'Declined. Both accounts are exactly as they were.');
                }
              }}
            />
          ))}
        </section>
      )}

      <section className="section">
        <h2>Move this account into another one</h2>
        <p className="muted">
          If you have two accounts and this is the one you no longer want, type the
          email address of the account you want to keep. The request waits there
          until somebody signs in to it and agrees — which is also how the platform
          knows you control both.
        </p>
        <form onSubmit={ask} className="card" style={{ padding: '1.25rem', maxWidth: '32rem' }}>
          <label htmlFor="merge-target">The account to keep</label>
          <input
            id="merge-target"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy !== null}
          />
          <p className="muted" style={{ marginTop: '0.4rem' }}>
            That account has to agree before anything moves. This account is closed
            afterwards, and closing it cannot be undone.
          </p>
          <button className="btn" type="submit" disabled={busy !== null || email.trim() === ''}>
            {busy === 'request' ? 'Asking…' : 'Ask to be merged'}
          </button>
        </form>
      </section>

      {board.outgoing.length > 0 && (
        <section className="section">
          <h2>Requests made from this account</h2>
          <ul className="lessons">
            {board.outgoing.map((request) => (
              <li key={request.id}>
                <span className="n">{describeMergeStatus(request.status, request.expired)}</span>
                <span className="t">
                  Into {request.otherName ?? 'another account'}
                  {request.expiresAt && request.status === 'pending' && !request.expired && (
                    <span className="muted">
                      {' '}· waiting until {describeExpiry(request.expiresAt)}
                    </span>
                  )}
                  {request.status === 'completed' && (
                    <>
                      <br />
                      <span className="muted">
                        {describeMoves(request.summary).join(' · ') || 'Nothing needed moving'}
                      </span>
                    </>
                  )}
                </span>
                {request.status === 'pending' && !request.expired && (
                  <button
                    className="btn secondary"
                    type="button"
                    disabled={busy !== null}
                    onClick={async () => {
                      const result = await send(
                        '/api/account/merge',
                        { action: 'cancel', requestId: request.id },
                        request.id,
                      );
                      if (result) setMessage('Request withdrawn. Nothing moved.');
                    }}
                  >
                    Withdraw
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function IncomingRequest({
  request,
  displayName,
  busy,
  onDecide,
}: {
  request: MergeRequest;
  displayName: string;
  busy: boolean;
  onDecide: (accept: boolean, confirm: string) => Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const blocked = describeBlocks(request.preview);
  const moves = describeMoves(request.summary);
  const stayed = leftBehind(request.summary);

  return (
    <article className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
      <div className="outline-h">
        <h3>{request.otherName ?? 'An account with no name yet'}</h3>
        <span className="badge neutral">
          {describeMergeStatus(request.status, request.expired)}
        </span>
      </div>

      {request.status === 'completed' ? (
        <>
          <p className="muted">Merged. The other account is closed.</p>
          <ul className="lessons">
            {moves.map((line) => (
              <li key={line}><span className="t">{line} moved here</span></li>
            ))}
          </ul>
          {stayed !== null && (
            <p className="notice warn">
              {stayed} record{stayed === 1 ? '' : 's'} stayed with the archived account,
              because this one already held the same thing. Nothing was deleted.
            </p>
          )}
        </>
      ) : blocked ? (
        <div className="notice error" role="alert">{blocked}</div>
      ) : request.expired ? (
        <p className="muted">
          This request expired before it was answered. Ask again from the other account.
        </p>
      ) : (
        <>
          {request.preview && request.preview.notes.length > 0 && (
            <ul className="lessons">
              {request.preview.notes.map((note) => (
                <li key={note}><span className="t">{note}</span></li>
              ))}
            </ul>
          )}
          <p className="muted">
            What moves: everything that account holds — its learning record with
            progress and certificates, its roles, its messages, its number, and
            anything it has published. What stays: the record of what it did, such as
            orders it placed, because that is history and rewriting it would destroy
            the only account of what happened.
          </p>

          <label htmlFor={`merge-confirm-${request.id}`}>
            Type your own name ({displayName}) to confirm
          </label>
          <input
            id={`merge-confirm-${request.id}`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={busy}
            autoComplete="off"
          />
          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button
              className="btn"
              type="button"
              disabled={busy || !confirmsMerge(typed, displayName)}
              onClick={() => onDecide(true, typed)}
            >
              {busy ? 'Merging…' : 'Merge it into this account'}
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={busy}
              onClick={() => onDecide(false, typed)}
            >
              Decline
            </button>
          </div>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            This cannot be undone. The other account is closed and anonymised, and
            its sign-in remains at the sign-in provider until it is deleted there.
          </p>
        </>
      )}
    </article>
  );
}

/** The link the account page carries, so the screen is reachable from where it belongs. */
export function MergeLink({ waiting }: { waiting: number }) {
  return (
    <Link href="/account/merge">
      {waiting > 0 ? `Merging accounts (${waiting} waiting)` : 'Merging accounts'}
    </Link>
  );
}
