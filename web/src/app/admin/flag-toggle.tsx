'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { gateLabel, type GateType } from '@/lib/flags';

/**
 * One flag row's control.
 *
 * A `code`-gated flag renders as inert with its precondition shown, because
 * the useful information is *why* it cannot be flipped — not that it cannot
 * be. The database would refuse it anyway; this just says so first.
 */
export function FlagToggle({
  flagKey,
  enabled,
  gateType,
  preconditions,
}: {
  flagKey: string;
  enabled: boolean;
  gateType: GateType;
  preconditions: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const locked = gateType === 'code';

  async function flip(next: boolean) {
    setError(null);
    const previous = state;
    setState(next);

    const res = await fetch('/api/admin/flags', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: flagKey, enabled: next }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok: boolean;
      message?: string;
    };

    if (!json.ok) {
      setState(previous);
      setError(json.message ?? 'Could not change that flag.');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <li>
      <span className="t">
        <code style={{ fontSize: '0.85rem' }}>{flagKey}</code>
        {preconditions && (
          <span className="muted" style={{ display: 'block', fontSize: '0.82rem' }}>
            {preconditions}
          </span>
        )}
      </span>

      <span className="badge neutral" style={{ flex: 'none' }}>
        {gateLabel(gateType)}
      </span>

      {locked ? (
        <span className="badge" style={{ flex: 'none' }} title="Needs a deploy">
          {state ? 'On' : 'Off'}
        </span>
      ) : (
        <button
          type="button"
          className={`switch ${state ? 'on' : ''}`}
          role="switch"
          aria-checked={state}
          aria-label={`${flagKey}: ${state ? 'on' : 'off'}`}
          disabled={pending}
          onClick={() => flip(!state)}
        >
          <span />
        </button>
      )}

      {error && (
        <span className="danger" style={{ fontSize: '0.8rem', flexBasis: '100%' }} role="alert">
          {error}
        </span>
      )}
    </li>
  );
}
