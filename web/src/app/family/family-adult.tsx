'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  adultCardExplanation,
  adultCardHeading,
  canJoinFamily,
  joinButtonLabel,
  joinOutcomeMessage,
  LEAVE_NOTE,
  type AdultFamilyState,
} from '@/lib/family-adult';

/**
 * The signed-in adult's own card inside a family.
 *
 * Four states, and only two of them offer a button. A person whose learning
 * already lives in another family is told why there is nothing to click, rather
 * than given a control that would fail — a refusal the screen could foresee is
 * not a safeguard, it is a trap.
 *
 * Both calls go to `/api/family/learner`; the permission is the writer's, not
 * this component's. Nothing here sends a learner id: the caller can only ever
 * name a family, and only their own profile is ever written.
 */
export function FamilyAdultCard({
  familyId,
  familyName,
  state,
  displayName,
}: {
  familyId: string;
  familyName: string;
  state: AdultFamilyState;
  displayName?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'join' | 'leave' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function act(kind: 'join' | 'leave') {
    setBusy(kind);
    setError(null);
    setMessage(null);

    const res = await fetch('/api/family/learner', {
      method: kind === 'join' ? 'POST' : 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ familyId }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; message?: string; created?: boolean; joined?: boolean }
      | null;

    setBusy(null);

    if (!json?.ok) {
      setError(json?.message ?? 'That did not work. Nothing was changed.');
      return;
    }

    setMessage(
      kind === 'join'
        ? joinOutcomeMessage({ created: json.created === true, joined: json.joined === true })
        : 'Your learning is out of this family. Every course and all of your progress is still there.',
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="outline-h">
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>
          {adultCardHeading(state)}
          {state === 'in-family' && displayName ? ` — ${displayName}` : ''}
        </h3>
      </div>
      <p className="muted" style={{ marginTop: '0.5rem' }}>
        {adultCardExplanation(state, familyName)}
      </p>

      {canJoinFamily(state) && (
        <button
          type="button"
          className="btn"
          onClick={() => act('join')}
          disabled={busy !== null}
        >
          {busy === 'join' ? 'Adding you…' : joinButtonLabel(state)}
        </button>
      )}

      {state === 'in-family' && (
        <>
          <button
            type="button"
            className="btn secondary"
            onClick={() => act('leave')}
            disabled={busy !== null}
          >
            {busy === 'leave' ? 'Taking your learning out…' : 'Take my learning out of this family'}
          </button>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
            {LEAVE_NOTE}
          </p>
        </>
      )}

      {message && <p className="notice" style={{ marginBottom: 0 }}>{message}</p>}
      {error && <p className="notice" style={{ marginBottom: 0 }}>{error}</p>}
    </div>
  );
}
