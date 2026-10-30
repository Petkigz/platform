'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { gateSentence, type MyScreening } from '@/lib/screening';

/**
 * The conduct card on the teacher's dashboard.
 *
 * Two facts decide whether a child-facing course can be published, and this card
 * shows both of them side by side rather than as one "status": a **check** on
 * file, which staff record, and an **acknowledgement** of the conduct policy,
 * which only the teacher can give. Collapsing them into one badge would let a
 * teacher who is checked but has read nothing believe they are done.
 *
 * It renders nothing at all unless the platform is asking — a card explaining a
 * gate that is switched off is a card about nothing.
 */
export function ConductCard({
  screening,
  policyHref,
  policyVersion,
}: {
  screening: MyScreening;
  policyHref: string;
  policyVersion: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!screening.required) return null;

  const acknowledged = screening.conductAcknowledged === true;
  const clear = screening.mayTeachChildren === true;

  async function agree() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/teach/conduct', { method: 'POST' });
    const json = (await res.json().catch(() => null)) as { ok: boolean; message?: string } | null;
    setBusy(false);
    if (!json?.ok) {
      setError(json?.message ?? 'That could not be saved.');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <section className="card" style={{ marginBottom: '1.5rem' }} aria-labelledby="conduct-heading">
      <h2 id="conduct-heading" style={{ marginTop: 0 }}>
        Teaching children
      </h2>

      <p style={{ marginBottom: '0.75rem' }}>
        A course a child may be shown is published only when two things are on
        file: a check recorded by whoever appoints teachers, and your own word
        that you have read the conduct policy.
      </p>

      <ul style={{ marginBottom: '0.75rem' }}>
        <li>
          <strong>Check:</strong>{' '}
          {screening.recorded
            ? screening.expired
              ? 'on file, but lapsed'
              : screening.outcome === 'failed'
                ? 'on file, and it did not pass'
                : `on file${screening.type ? ` — ${screening.type}` : ''}`
            : 'nothing recorded yet'}
        </li>
        <li>
          <strong>Conduct policy:</strong>{' '}
          {acknowledged ? 'read and agreed' : 'not yet read'}
          {policyVersion ? ` (version ${policyVersion})` : ''}
        </li>
      </ul>

      {!acknowledged && (
        <p style={{ marginBottom: '0.75rem' }}>
          The rules are in the{' '}
          <a href={policyHref} target="_blank" rel="noreferrer">
            safeguarding and conduct policy
          </a>
          . Reading it and agreeing is one press, and it is recorded against the
          version you read — a new version asks again.
        </p>
      )}

      {error && (
        <div className="notice error" role="alert" style={{ marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}

      {acknowledged ? (
        <p className={clear ? 'notice' : 'notice warn'} role="status">
          {gateSentence(clear ? 'ok' : (screening.gateReason ?? 'no_screening'), screening.lead)}
        </p>
      ) : (
        <button type="button" className="btn" disabled={busy} onClick={agree}>
          {busy ? 'Saving…' : 'I have read and agree to the conduct policy'}
        </button>
      )}

      {screening.lead && (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
          A concern about a child goes to {screening.lead} — not to the teacher
          involved, and not through a course page.
        </p>
      )}
    </section>
  );
}
