'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CONFLICT_TYPES,
  CONFLICT_TYPE_LABEL,
  validateConflictInput,
} from '@/lib/review';

/**
 * Standing aside from a course you have been offered.
 *
 * This is where a declaration names a version, because here the version is known:
 * the reviewer is looking at it. A standing declaration — one about the person
 * rather than one course — lives on `/review`.
 *
 * Declaring does not decline the assignment. Those are two different records and the
 * database keeps them apart: the declaration goes to governance staff, who hear it
 * and mark it accepted or disqualifying, while declining is the reviewer's own answer
 * to the offer. The form says so, because a reviewer who declares and walks away
 * leaves an assignment sitting open.
 */
export function ConflictForm({ courseVersionId }: { courseVersionId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [conflictType, setConflictType] = useState<string>(CONFLICT_TYPES[0] ?? '');
  const [description, setDescription] = useState('');

  async function submit() {
    const checked = validateConflictInput({ conflictType, description, courseVersionId });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch('/api/review/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'conflict', ...checked.value }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; message?: string; note?: string | null }
      | null;
    setBusy(false);

    if (!json?.ok) {
      setError(json?.message ?? 'Could not record that declaration.');
      return;
    }

    setDone(true);
    setDescription('');
    startTransition(() => router.refresh());
  }

  return (
    <div className="card">
      <div className="outline-h" style={{ marginTop: 0 }}>
        <h3 style={{ margin: 0 }}>Cannot review this impartially?</h3>
        {done && <span className="badge warn">Declared</span>}
      </div>

      <details>
        <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
          Declare a conflict about this course
        </summary>

        <div className="stack" style={{ marginTop: '0.75rem' }}>
          <p className="meta" style={{ marginTop: 0 }}>
            Declaring bars you from this assignment at once, and keeps barring you
            until governance staff hear it. It does not decline the offer — decline
            separately above if you want the assignment closed.
          </p>

          <select
            value={conflictType}
            onChange={(e) => setConflictType(e.target.value)}
            aria-label="Kind of conflict"
          >
            {CONFLICT_TYPES.map((t) => (
              <option key={t} value={t}>{CONFLICT_TYPE_LABEL[t]}</option>
            ))}
          </select>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What the conflict is, in your own words"
            aria-label="Describe the conflict"
            maxLength={2000}
            style={{ width: '100%' }}
          />

          <div className="row">
            <button type="button" className="btn secondary" disabled={busy} onClick={submit}>
              {busy ? 'Declaring…' : 'Declare it'}
            </button>
            {error && (
              <span className="danger" style={{ fontSize: '0.85rem' }} role="alert">{error}</span>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
