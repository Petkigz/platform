'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CONFLICT_DESCRIPTION_MAX, CONFLICT_TYPES } from '@/lib/review';
import type { AssignmentConflictWords } from '@/lib/review-assignment';
import {
  checkConflict,
  isRegisterRefusal,
  registerRefusalSentence,
  type RegisterFailure,
} from '@/lib/review-register';

/**
 * Standing aside from a course you have been offered.
 *
 * This is where a declaration names a version, because here the version is known:
 * the reviewer is looking at it. A standing declaration (one about the person
 * rather than one course) lives on `/review`.
 *
 * Declaring does not close the assignment. Those are two different records and the
 * database keeps them apart: the declaration goes to governance staff, who hear it
 * and mark it accepted or disqualifying, while declining is the reviewer's own answer
 * to an offer. From migration 371 a declaration bars its reviewer from deciding
 * the review until it is heard, and a review already accepted is closed by
 * staff, not by its reviewer. The form says so, because a reviewer who declares
 * and walks away leaves an assignment sitting open.
 *
 * Its words come from the page (2026-11-28); a refusal is one of the
 * register's, said by name, and an answer nobody could read is not one.
 */
export function ConflictForm({ courseVersionId, words }: { courseVersionId: string; words: AssignmentConflictWords }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [conflictType, setConflictType] = useState<string>(CONFLICT_TYPES[0] ?? '');
  const [description, setDescription] = useState('');

  const refuse = (failure: Pick<RegisterFailure, 'code' | 'max'>) => setError(registerRefusalSentence(words, failure));

  async function submit() {
    const checked = checkConflict({ conflictType, description, courseVersionId });
    if (!checked.ok) {
      refuse(checked);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/review/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'conflict', ...checked.value }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown; max?: unknown } | null;
      if (json?.ok === true) {
        setDone(true);
        setDescription('');
        startTransition(() => router.refresh());
        return;
      }
      // A declaration bars the review the moment it exists, so "nothing was
      // recorded" is not said about an answer with no name on it.
      refuse(isRegisterRefusal(json?.code)
        ? { code: json.code, max: typeof json.max === 'number' ? json.max : undefined }
        : { code: 'unsure' });
    } catch {
      refuse({ code: 'unsure' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" data-assign-conflict>
      <div className="outline-h register-head">
        <h3>{words.standHead}</h3>
        {done && <span className="badge warn">{words.declared}</span>}
      </div>

      <details>
        <summary className="assignment-open">{words.declareOpen}</summary>

        <div className="stack assignment-declare">
          <p className="meta">{words.declareNote}</p>

          <label htmlFor="assignment-conflict-kind" className="meta">{words.conflictKind}</label>
          <select id="assignment-conflict-kind" value={conflictType} onChange={(e) => setConflictType(e.target.value)}>
            {CONFLICT_TYPES.map((kind) => (
              <option key={kind} value={kind}>{words.conflictType[kind]}</option>
            ))}
          </select>

          <label htmlFor="assignment-conflict-text" className="meta">{words.describe}</label>
          <textarea
            id="assignment-conflict-text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={words.describeHint}
            maxLength={CONFLICT_DESCRIPTION_MAX}
            dir="auto"
          />

          <div className="register-send">
            <button type="button" className="btn secondary" disabled={busy} onClick={submit}>
              {busy ? words.working : words.declareIt}
            </button>
          </div>
          {error && <p className="danger register-notice" role="alert">{error}</p>}
        </div>
      </details>
    </div>
  );
}
