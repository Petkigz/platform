'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Say } from '@/components/say';
import { fill, formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
import { confirmsMerge, type MergeMove, type MergeMoved, type MergeState } from '@/lib/merge';
import { mergeDoneOf, mergeOutcomeOf, type MergeCode, type MergeDid, type MergeDone } from '@/lib/merge-outcome';

/** Everything this screen says, in the language of the page that draws it. */
export type MergeWords = {
  /** The language the words are in: counts are written its way. */
  locale: LocaleCode;
  inHeading: string;
  inLede: string;
  noName: string;
  inMerged: string;
  inExpired: string;
  whatMoves: string;
  whatGoes: string;
  /** Holds `{name}`. */
  confirmLabel: string;
  needName: string;
  accept: string;
  accepting: string;
  decline: string;
  cannotUndo: string;
  outHeading: string;
  outLede: string;
  emailLabel: string;
  emailHelp: string;
  ask: string;
  asking: string;
  listHeading: string;
  listInto: string;
  nothingMoved: string;
  withdraw: string;
  movedHeading: string;
  /** One line for each thing a merge counts. All but the first hold `{count}`. */
  moves: Record<MergeMove, string>;
  /** Holds `{count}`. */
  stayed: string;
  /** What is said when something was done. */
  done: Record<MergeDid, string>;
  /** What is said for each refusal the route names. */
  errors: Record<Exclude<MergeCode, 'failed' | 'malformed' | 'off'>, string>;
  off: string;
  /** Something was asked for and no answer came back. */
  unconfirmed: string;
};

/** A request waiting on this account, with everything about it already in words. */
export type IncomingView = {
  id: string;
  state: MergeState;
  stateLabel: string;
  /** The name the other account gave itself, or nothing. */
  name: string | null;
  /** Why it cannot run, one sentence each. Empty when it can. */
  blocks: string[];
  notes: string[];
};

/** A request this account made. */
export type OutgoingView = {
  id: string;
  state: MergeState;
  stateLabel: string;
  /** "Waiting until …", for one still waiting. */
  until: string | null;
  /** What moved, one line each, for one that was completed. */
  moved: string[];
};

/** What a merge counted, said line by line. */
function movedLines(words: MergeWords, moved: MergeMoved[]): string[] {
  return moved.map((line) => fill(words.moves[line.kind], { count: formatNumber(words.locale, line.count) }));
}

/**
 * The two sides of a merge, on one screen.
 *
 * The person who wants to leave an account fills in the email of the account
 * they want to keep; the person who owns that account sees the request waiting
 * and either agrees or does not. Both sides are the same person in practice
 * (that is the point), but the platform still asks both, because "I control
 * both of these" is the only claim a merge rests on.
 *
 * What the screen refuses to do: make it look easy. The confirmation is typing
 * the surviving account's own name, the wording says it cannot be undone, and
 * what moves, what stays and what is deleted is said before the button.
 *
 * **It has no words of its own.** Every sentence is handed to it by the page,
 * already in the reader's language, and so is every reason a merge cannot run.
 * What the route answers is read as a name (`lib/merge-outcome.ts`); nothing
 * the database wrote is shown.
 *
 * **A merge with no answer is unknown.** It cannot be undone, so a request
 * that never arrived, or a reply nobody can read, is not said as "nothing was
 * changed": the reader is asked to reload and see.
 *
 * **With the switch off it is only the list.** A request made while merging
 * was on is still there, and withdrawing it is the one thing the database
 * still allows; nothing can be asked for or agreed to, so neither is offered.
 */
export function MergePanel({
  words,
  enabled,
  incoming,
  outgoing,
  displayName,
}: {
  words: MergeWords;
  /** Whether merging is switched on. Off: the list and its withdraw buttons, nothing else. */
  enabled: boolean;
  incoming: IncomingView[];
  outgoing: OutgoingView[];
  displayName: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<MergeDone | null>(null);
  const [, startTransition] = useTransition();

  const said = (code: MergeCode): string => {
    if (code === 'failed') return words.unconfirmed;
    if (code === 'off') return words.off;
    if (code === 'malformed') return words.errors.refused;
    return words.errors[code];
  };

  async function send(body: Record<string, unknown>, key: string): Promise<MergeDone | null> {
    setBusy(key);
    setError(null);
    setDone(null);
    try {
      const response = await fetch('/api/account/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result: unknown = await response.json().catch(() => null);
      const finished = response.ok ? mergeDoneOf(result) : null;
      // Whatever was answered, the page is read again: a refusal usually means
      // the list on it is out of date.
      startTransition(() => router.refresh());
      if (!finished) {
        setError(said(response.ok ? 'failed' : mergeOutcomeOf(response.status, result)));
        return null;
      }
      setDone(finished);
      return finished;
    } catch {
      setError(words.unconfirmed);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (email.trim() === '') {
      setDone(null);
      setError(words.errors.email);
      return;
    }
    const result = await send({ action: 'request', email }, 'request');
    if (result) setEmail('');
  }

  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <div className="notice" role="status">
          <p style={{ margin: 0 }}>{words.done[done.did]}</p>
          {done.did === 'merged' && done.moved && done.moved.length > 0 && (
            <>
              <p style={{ margin: '0.5rem 0 0' }}>{words.movedHeading}</p>
              <ul style={{ margin: '0.25rem 0 0' }}>
                {movedLines(words, done.moved).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
          {done.did === 'merged' && done.stayed !== undefined && (
            <p style={{ margin: '0.5rem 0 0' }}>
              {fill(words.stayed, { count: formatNumber(words.locale, done.stayed) })}
            </p>
          )}
        </div>
      )}

      {enabled && incoming.length > 0 && (
        <section className="section-sm">
          <h2>{words.inHeading}</h2>
          <p className="muted">{words.inLede}</p>
          {incoming.map((request) => (
            <IncomingRequest
              key={request.id}
              words={words}
              request={request}
              displayName={displayName}
              busy={busy === request.id}
              idle={busy === null}
              onDecide={(accept, confirm) =>
                send({ action: 'decide', requestId: request.id, accept, confirm }, request.id)
              }
            />
          ))}
        </section>
      )}

      {enabled && (
        <section className="section-sm">
          <h2>{words.outHeading}</h2>
          <p className="muted">{words.outLede}</p>
          <form onSubmit={ask} noValidate className="card" style={{ padding: '1.25rem', maxWidth: '32rem' }}>
            <label htmlFor="merge-target">{words.emailLabel}</label>
            <input
              id="merge-target"
              type="email"
              dir="ltr"
              autoComplete="email"
              aria-describedby="merge-target-help"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy !== null}
            />
            <p id="merge-target-help" className="muted" style={{ marginTop: '0.4rem' }}>
              {words.emailHelp}
            </p>
            <button className="btn" type="submit" disabled={busy !== null}>
              {busy === 'request' ? words.asking : words.ask}
            </button>
          </form>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="section-sm">
          <h2>{words.listHeading}</h2>
          <ul className="lessons stacked">
            {outgoing.map((request) => (
              <li key={request.id}>
                <span className="badge neutral">{request.stateLabel}</span>
                <span className="t" style={{ display: 'block', marginTop: '0.35rem' }}>
                  {words.listInto}
                  {request.until && (
                    <span className="muted" style={{ display: 'block' }}>
                      {request.until}
                    </span>
                  )}
                  {request.state === 'completed' && (
                    <span className="muted" style={{ display: 'block' }}>
                      {request.moved.length > 0 ? request.moved.join(' · ') : words.nothingMoved}
                    </span>
                  )}
                </span>
                {request.state === 'pending' && (
                  <div className="page-actions" style={{ marginTop: '0.6rem' }}>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={busy !== null}
                      onClick={() => send({ action: 'cancel', requestId: request.id }, request.id)}
                    >
                      {words.withdraw}
                    </button>
                  </div>
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
  words,
  request,
  displayName,
  busy,
  idle,
  onDecide,
}: {
  words: MergeWords;
  request: IncomingView;
  displayName: string;
  busy: boolean;
  idle: boolean;
  onDecide: (accept: boolean, confirm: string) => Promise<unknown>;
}) {
  const [typed, setTyped] = useState('');
  const named = displayName.trim() !== '';

  return (
    <article className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
      {/* A long name and a long state do not fit one line on a phone: the state goes under. */}
      <div className="outline-h" style={{ flexWrap: 'wrap', marginTop: 0 }}>
        {/* A merged account has no name left: the database wrote an English placeholder over it. */}
        {request.state !== 'completed' && (
          <h3 style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            {request.name ? <bdi>{request.name}</bdi> : words.noName}
          </h3>
        )}
        <span className="badge neutral">{request.stateLabel}</span>
      </div>

      {request.state === 'completed' ? (
        <p className="muted">{words.inMerged}</p>
      ) : request.state === 'expired' ? (
        <p className="muted">{words.inExpired}</p>
      ) : request.state !== 'pending' ? null : request.blocks.length > 0 ? (
        <>
          <div className="notice error">
            {request.blocks.map((line, index) => (
              <p key={line} style={{ margin: index === 0 ? 0 : '0.5rem 0 0' }}>
                {line}
              </p>
            ))}
          </div>
          <div className="page-actions">
            <button className="btn secondary" type="button" disabled={!idle} onClick={() => onDecide(false, '')}>
              {words.decline}
            </button>
          </div>
        </>
      ) : (
        <>
          {request.notes.length > 0 && (
            <ul className="lessons">
              {request.notes.map((note) => (
                <li key={note}>
                  <span className="t">{note}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted">{words.whatMoves}</p>
          <p className="muted">{words.whatGoes}</p>

          {named ? (
            <>
              <label htmlFor={`merge-confirm-${request.id}`}>
                <Say text={words.confirmLabel} parts={{ name: <bdi>{displayName.trim()}</bdi> }} />
              </label>
              <input
                id={`merge-confirm-${request.id}`}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                disabled={!idle}
                autoComplete="off"
                aria-describedby={`merge-undo-${request.id}`}
              />
            </>
          ) : (
            <p className="notice warn">{words.needName}</p>
          )}
          <div className="page-actions">
            {named && (
              <button
                className="btn"
                type="button"
                disabled={!idle || !confirmsMerge(typed, displayName)}
                onClick={() => onDecide(true, typed)}
              >
                {busy ? words.accepting : words.accept}
              </button>
            )}
            <button className="btn secondary" type="button" disabled={!idle} onClick={() => onDecide(false, '')}>
              {words.decline}
            </button>
          </div>
          <p id={`merge-undo-${request.id}`} className="muted" style={{ marginTop: '0.5rem' }}>
            {words.cannotUndo}
          </p>
        </>
      )}
    </article>
  );
}
