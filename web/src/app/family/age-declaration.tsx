'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdultDeclaration } from '@/lib/adult-declaration';

/**
 * The declaration card.
 *
 * It appears above "add a child" while the platform is asking for one, because
 * that is the moment the question is earned: an adult who is about to put a
 * child on their account is being asked whether they are one. It is deliberately
 * **not** a sign-up step — an account that never adds a child never needs it,
 * and a form that asked everybody would be collecting a claim it had no use for.
 *
 * Three states, three sentences, and the third is the one that matters:
 *
 *   * not asked for (the flag is off) — nothing renders at all;
 *   * declared — the date, the wording, and a way to withdraw it;
 *   * withdrawn — "you withdrew this on X", with the same button as never made.
 *
 * The note under the button says we do not check it. That sentence is the whole
 * honesty of this screen: a declaration that looked like a verification would be
 * the exact overclaim `platform.age_assurance` sat in the register to avoid.
 */
export function AgeDeclarationCard({
  declaration,
}: {
  declaration: AdultDeclaration;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!declaration.required) return null;

  async function send(action: 'declare' | 'withdraw') {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/family/declaration', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; message?: string }
      | null;
    setBusy(false);
    if (!json?.ok) {
      setError(json?.message ?? 'That could not be saved.');
      return;
    }
    startTransition(() => router.refresh());
  }

  const when = declaration.declaredAt
    ? new Date(declaration.declaredAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  if (declaration.declared) {
    return (
      <div className="notice" role="status" style={{ marginTop: '1rem' }}>
        <strong>You declared this on {when}.</strong>{' '}
        {declaration.statement}
        <div style={{ marginTop: '0.6rem' }}>
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={() => send('withdraw')}
          >
            {busy ? 'Withdrawing…' : 'Withdraw the declaration'}
          </button>
        </div>
        {error && (
          <div className="notice error" role="alert" style={{ marginTop: '0.5rem' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>Before you add a child</h3>
      {declaration.withdrawn && when && (
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          You withdrew your declaration. Declaring again is the same one answer.
        </p>
      )}
      <p style={{ marginBottom: '0.5rem' }}>{declaration.statement}</p>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        We record that you said this and when. We do not check it — no document,
        no card. If it is untrue, the children on your account are the reason we
        ask.
      </p>
      {error && (
        <div className="notice error" role="alert" style={{ marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}
      <button type="button" className="btn" disabled={busy} onClick={() => send('declare')}>
        {busy ? 'Saving…' : 'I declare this'}
      </button>
    </div>
  );
}
