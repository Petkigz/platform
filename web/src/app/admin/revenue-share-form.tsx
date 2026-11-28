'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  readPercent,
  revenueShareRefusalOf,
  type RevenueShareRefusal,
  type RevenueShareWords,
} from '@/lib/revenue-share';

/**
 * The teacher's share of a course sale, and the form that changes it.
 *
 * Its sentences are the page's (`words`), in the reader's language since
 * 2026-11-28. The database's own sentence, when it refuses for a reason the
 * form has no name for, is English and is marked as English.
 *
 * The percentage is a text field and not a number field: a number field
 * takes only the digits 0 to 9, and a reader shown "۰ تا ۱۰۰" types "۴۰".
 * `readPercent()` reads the digits this site's languages write, and what it
 * cannot read is refused here, before anything is sent. The figure the
 * field opens with is written by the page in the digits it writes the same
 * figure in beside the heading (`shownPercent`), and after a save the field
 * keeps what was typed when that is the number that was saved.
 *
 * An answer that is not the API's own (a gateway's page, a connection that
 * went) is not said to have failed: nobody can say whether the share was
 * saved, and the sentence says to read the figure before saving again.
 */
export function RevenueShareForm({
  currentPercent,
  shownPercent,
  words,
}: {
  currentPercent: number;
  /** The same figure as the page writes it for this reader: "30", "۳۰", "৩০". */
  shownPercent: string;
  words: RevenueShareWords;
}) {
  const router = useRouter();
  const [percent, setPercent] = useState(readPercent(shownPercent) === currentPercent ? shownPercent : String(currentPercent));
  const [reason, setReason] = useState('');
  const [refusal, setRefusal] = useState<{ refusal: RevenueShareRefusal; said: string | null } | null>(null);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [pending, startTransition] = useTransition();

  const english = words.markEnglish ? ({ lang: 'en', dir: 'ltr' } as const) : {};

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRefusal(null);
    setSaved(false);

    const numericPercent = readPercent(percent);
    if (numericPercent === null) {
      setRefusal({ refusal: 'percent', said: null });
      return;
    }
    if (reason.trim().length === 0) {
      setRefusal({ refusal: 'reason', said: null });
      return;
    }

    setSending(true);
    let status = 0;
    let body: unknown = null;
    try {
      const response = await fetch('/api/admin/revenue-share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ percent: numericPercent, reason }),
      });
      status = response.status;
      body = await response.json().catch(() => null);
    } catch {
      body = null;
    } finally {
      setSending(false);
    }

    if (typeof body !== 'object' || body === null || (body as { ok?: unknown }).ok !== true) {
      setRefusal(revenueShareRefusalOf(status, body));
      return;
    }

    const answered = (body as { percent?: unknown }).percent;
    const stored = typeof answered === 'number' ? answered : numericPercent;
    if (readPercent(percent) !== stored) setPercent(String(stored));
    setReason('');
    setSaved(true);
    startTransition(() => router.refresh());
  }

  const busy = sending || pending;

  return (
    <form onSubmit={save} noValidate className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }} data-revenue-share>
      <div className="outline-h" style={{ marginTop: 0 }}>
        <h3>{words.title}</h3>
        <span className="badge neutral">{words.badge}</span>
      </div>
      <p className="muted">{words.body}</p>
      {currentPercent === 0 && (
        <div className="notice" role="note">
          {words.zero}
        </div>
      )}
      <div style={{ display: 'grid', gap: '0.8rem', maxWidth: '34rem', marginTop: '1rem' }}>
        <label>
          {words.field}
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              required
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
              aria-label={words.field}
              aria-invalid={refusal?.refusal === 'percent' ? true : undefined}
            />
            <span aria-hidden="true">%</span>
          </span>
        </label>
        <label>
          {words.reason}
          <textarea
            required
            maxLength={500}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={words.example}
            aria-invalid={refusal?.refusal === 'reason' || refusal?.refusal === 'long' ? true : undefined}
          />
        </label>
        <div>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? words.saving : words.save}
          </button>
          {saved && <span className="success" role="status" style={{ marginInlineStart: '0.75rem' }}>{words.saved}</span>}
          {refusal && (
            <p className="danger" role="alert" data-revenue-share-refusal={refusal.refusal}>
              {words.refusals[refusal.refusal]}
              {refusal.said ? (
                <>
                  {' '}
                  <span {...english} data-revenue-share-said>{refusal.said}</span>
                </>
              ) : null}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
