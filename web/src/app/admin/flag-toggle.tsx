'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  flagRefusalOf,
  gateLabelKey,
  type FlagRefusal,
  type FlagToggleWords,
  type GateType,
} from '@/lib/flags';

/**
 * One flag row's control.
 *
 * A `code`-gated flag renders as inert with its precondition shown, because
 * the useful information is *why* it cannot be flipped — not that it cannot
 * be. The database would refuse it anyway; this just says so first.
 *
 * Its sentences are the page's (`words`), in the reader's language since
 * 2026-11-28. Two things are not: the precondition, which is a row of the
 * database, and the database's own sentence when it refuses. Both are English
 * and are marked as English where the page is in another language.
 *
 * A change that got no answer of the API's own is not shown as made and is
 * not said to have failed: nobody can say, and the sentence says to look.
 */
export function FlagToggle({
  flagKey,
  enabled,
  gateType,
  preconditions,
  words,
}: {
  flagKey: string;
  enabled: boolean;
  gateType: GateType;
  preconditions: string | null;
  words: FlagToggleWords;
}) {
  const router = useRouter();
  const [state, setState] = useState(enabled);
  const [error, setError] = useState<{ refusal: FlagRefusal; said: string | null } | null>(null);
  const [pending, startTransition] = useTransition();
  // From the press until its answer the switch takes no second press. Two
  // changes in flight are answered in whatever order they arrive, and the
  // switch would then show the last answer, not what the database holds.
  // (Until 2026-11-28 it was only held while the page was drawn again.)
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);

  const locked = gateType === 'code';
  const english = words.markEnglish ? ({ lang: 'en', dir: 'ltr' } as const) : {};

  async function flip(next: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setError(null);
    const previous = state;
    setState(next);

    let status = 0;
    let body: unknown = null;
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: flagKey, enabled: next }),
      });
      status = res.status;
      body = await res.json().catch(() => null);
    } catch {
      body = null;
    } finally {
      inFlight.current = false;
      setSending(false);
    }

    if (typeof body === 'object' && body !== null && (body as { ok?: unknown }).ok === true) {
      startTransition(() => router.refresh());
      return;
    }
    setState(previous);
    setError(flagRefusalOf(status, body));
  }

  return (
    <li>
      <span className="t">
        <code style={{ fontSize: '0.85rem' }} dir="ltr">{flagKey}</code>
        {preconditions && (
          <span className="muted" style={{ display: 'block', fontSize: '0.82rem' }} {...english} data-flag-precondition>
            {preconditions}
          </span>
        )}
      </span>

      <span className="badge neutral" style={{ flex: 'none' }} data-flag-gate>
        {words.gates[gateLabelKey(gateType, state)]}
      </span>

      {locked ? (
        <span className="badge" style={{ flex: 'none' }} title={words.gates['switch.gateDeploy']}>
          {state ? words.on : words.off}
        </span>
      ) : (
        <button
          type="button"
          className={`switch ${state ? 'on' : ''}`}
          role="switch"
          aria-checked={state}
          aria-label={`${flagKey}: ${state ? words.on : words.off}`}
          disabled={pending || sending}
          aria-busy={sending || undefined}
          onClick={() => flip(!state)}
        >
          <span />
        </button>
      )}

      {error && (
        <span className="danger" style={{ fontSize: '0.8rem', flexBasis: '100%' }} role="alert" data-flag-refusal={error.refusal}>
          {words.refusals[error.refusal]}
          {error.said ? (
            <>
              {' '}
              <span {...english} data-flag-said>{error.said}</span>
            </>
          ) : null}
        </span>
      )}
    </li>
  );
}
