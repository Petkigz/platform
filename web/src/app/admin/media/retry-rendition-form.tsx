'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type FailedRendition = {
  id: string;
  profile: string;
  /** What the worker wrote when the encode did not finish. */
  failureReason: string | null;
};

/**
 * Putting a failed copy of a lesson back in the queue.
 *
 * Until this existed, a failed encode was a dead end. `fail_media_rendition()`
 * moved the row to `failed`, nothing moved it back, and registering the same
 * profile again hit the unique index — so one transient failure (a full disk, a
 * missing font, a bucket that was unreachable for ten minutes) permanently
 * removed a rung from a lesson, and the only repair was editing the database.
 *
 * The reason is required because it is a decision, not a button. The commonest
 * cause of a failed encode is the master itself, and an automatic retry would
 * spend encode time on it forever without anybody ever reading why it failed.
 * Written down, the reason is also the audit trail's answer to "who believed a
 * second attempt would work, and on what grounds".
 *
 * Retrying does not encode anything. It moves the row back to `pending` and
 * keeps its id and derived object key; the next worker run finds it with the
 * same filter that finds a crashed run's leftovers.
 */
export function RetryRenditionForm({ failed }: { failed: FailedRendition[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);

  if (failed.length === 0) return null;

  async function retry(rendition: FailedRendition) {
    const reason = (reasons[rendition.id] ?? '').trim();
    if (reason.length === 0) {
      setMessage({
        tone: 'error',
        text: 'Say why a second attempt will work. A retry with no reason is a guess.',
      });
      return;
    }

    setBusyId(rendition.id);
    setMessage(null);

    const res = await fetch('/api/admin/media', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'retry_rendition',
        renditionId: rendition.id,
        reason,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusyId(null);

    if (!res.ok) {
      setMessage({ tone: 'error', text: json.error ?? 'That was not recorded.' });
      return;
    }

    setReasons((current) => ({ ...current, [rendition.id]: '' }));
    setMessage({
      tone: 'info',
      text: `${rendition.profile} is back in the queue. The next worker run encodes it again and overwrites the file that was never confirmed.`,
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="stack" style={{ marginTop: '0.75rem' }}>
      <p className="eyebrow">Copies that failed to encode</p>

      {failed.map((rendition) => (
        <div className="card" key={rendition.id} style={{ display: 'grid', gap: '0.5rem' }}>
          <p style={{ margin: 0 }}>
            <strong>{rendition.profile}</strong>
            {' — '}
            {rendition.failureReason ? rendition.failureReason : 'no reason was recorded'}
          </p>

          <label className="eyebrow" htmlFor={`retry-${rendition.id}`}>
            Why a second attempt will work
          </label>
          <input
            id={`retry-${rendition.id}`}
            value={reasons[rendition.id] ?? ''}
            onChange={(event) =>
              setReasons((current) => ({ ...current, [rendition.id]: event.target.value }))
            }
            maxLength={2000}
            placeholder="Fixed on the worker, master replaced, storage was unreachable"
            style={{ width: '100%' }}
          />

          <div>
            <button
              type="button"
              className="btn secondary"
              disabled={pending || busyId !== null}
              onClick={() => void retry(rendition)}
            >
              Retry this copy
            </button>
          </div>
        </div>
      ))}

      <p className="muted" style={{ fontSize: '0.9rem' }}>
        Retrying is not encoding. It puts the copy back in the queue and leaves
        the row, its id and its storage key alone, so the new file replaces the
        one that never arrived. Only platform staff can do it, and it is recorded
        in the governance audit trail with both reasons: why it failed, and why
        somebody thought a second attempt would work.
      </p>

      {message && (
        <p className={message.tone === 'error' ? 'error' : 'muted'} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
