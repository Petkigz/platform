'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * "Learn on this account" — the button that makes an adult a learner.
 *
 * It appears wherever the absence of a profile is the thing stopping somebody: the
 * account page, an empty learning page, the checkout that has nobody to sell to. All of
 * them use this one component so the sentence and the behaviour cannot drift.
 *
 * The writing is done by `claim_own_learner_profile()`, which is idempotent — a second
 * press returns the same profile — so this does not ask first whether a profile exists
 * and does not disable itself after a success.
 */
export function ClaimLearner({
  label = 'Learn on this account',
  note,
}: {
  label?: string;
  /** A sentence under the button, for the screen that needs to explain why. */
  note?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function claim() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account/learner', { method: 'POST' });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; message?: string }
        | null;

      if (!res.ok || !json?.ok) {
        setError(json?.message ?? 'Your learner profile could not be set up.');
        return;
      }

      setDone(true);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: '0.4rem' }}>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn" disabled={busy || done} onClick={claim}>
          {busy ? 'Setting up…' : done ? 'You are ready' : label}
        </button>
      </div>
      {note && <p className="meta">{note}</p>}
      {done && !error && (
        <p className="muted">
          You can now enrol in a course, buy one, or share your own progress.
        </p>
      )}
      {error && (
        <p className="danger" style={{ fontSize: '0.9rem' }} role="alert">{error}</p>
      )}
    </div>
  );
}
