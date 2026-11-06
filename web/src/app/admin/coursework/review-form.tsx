'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { postCourseworkReview, reviewConfirmation } from '@/lib/coursework-review';

/**
 * What a reviewer says about one file.
 *
 * Two answers rather than a checkbox, because a checkbox that only ever says
 * "done" cannot record the case that matters. "Something to raise" needs a
 * sentence — the database refuses without one, and this form says so before the
 * round trip rather than after it.
 *
 * Nothing here takes the file away from anybody. The teacher marking the work can
 * open it whether or not this has been filled in, which is the whole reason a
 * recorded review was chosen over a release queue.
 */
export function ReviewForm({
  assetId,
  fileName,
  onDone,
}: {
  assetId: string;
  fileName: string | null;
  /** Called after a review lands, so the parent can close the form. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<'clear' | 'concern' | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');
  const [uncertain, setUncertain] = useState(false);
  const name = fileName ?? 'this file';

  async function submit() {
    setMessage(null);

    if (decision === null) {
      setTone('error');
      setMessage('Choose a review outcome before recording it.');
      return;
    }

    if (decision === 'concern' && note.trim().length < 3) {
      setTone('error');
      setMessage('Say what worried you in a sentence. A concern with no words is a flag somebody has to guess at.');
      return;
    }

    setBusy(true);
    try {
      const result = await postCourseworkReview({
        assetId,
        decision,
        note: decision === 'concern' ? note : null,
      });

      if (!result.ok) {
        setTone('error');
        setUncertain(result.uncertain === true);
        setMessage(result.error);
        return;
      }

      setTone('info');
      setMessage(reviewConfirmation(result.decision));
      setNote('');
      startTransition(() => {
        router.refresh();
        onDone?.();
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '0.6rem' }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: '0.35rem' }}>
        <legend className="eyebrow">Record a review of {name}</legend>
        <p className="muted">Open the file before recording a review. The platform cannot verify that you viewed it.</p>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
          <input
            type="radio"
            name={`review-${assetId}`}
            checked={decision === 'clear'}
            onChange={() => setDecision('clear')}
          />
          <span>No concern noted</span>
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
          <input
            type="radio"
            name={`review-${assetId}`}
            checked={decision === 'concern'}
            onChange={() => setDecision('concern')}
          />
          <span>Something to raise</span>
        </label>
      </fieldset>

      {decision === 'concern' && (
        <div>
          <label className="eyebrow" htmlFor={`note-${assetId}`}>
            What worried you (required)
          </label>
          <textarea
            id={`note-${assetId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={2000}
            style={{ width: '100%' }}
            placeholder="What is in the file, and what you did about it"
          />
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            The note is available in the safeguarding owner queue. The audit trail
            records that a concern was noted and which file, not the sentence itself.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn" disabled={busy || pending || uncertain} onClick={submit}>
          {busy || pending ? 'Recording…' : 'Record this review'}
        </button>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          A review does not delay the file. An alert may be sent if configured, but delivery is not guaranteed. Contact the safeguarding lead directly about a concern.
        </span>
      </div>

      {uncertain && <button type="button" className="btn ghost" onClick={() => {
        startTransition(() => router.refresh()); setUncertain(false); setMessage(null);
      }} disabled={busy || pending}>Refresh after checking</button>}
      {message && (
        <p className={tone === 'error' ? 'error' : 'muted'} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
