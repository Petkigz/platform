'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  claimantRoleLabel,
  moment,
  teacherSentence,
  type MyTakedown,
} from '@/lib/takedowns';

/**
 * The teacher's side of a takedown.
 *
 * This is the half that makes the process more than a letter arriving at an address
 * nobody checks. The claim is shown in the words it was sent, and the answer is
 * written here — once, because it is evidence rather than correspondence, and a
 * further note belongs in support where it is also on the record.
 */
export function TakedownAnswer({ mine }: { mine: MyTakedown }) {
  const router = useRouter();
  const [answering, setAnswering] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (mine.notices.length === 0) return null;

  async function submit(noticeId: string) {
    setMessage(null);
    setSaved(null);
    if (response.trim().length < 20) {
      setMessage('Say what the material is and why it may be used.');
      return;
    }
    const answer = await fetch('/api/teach/takedown', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'answer', noticeId, response: response.trim() }),
    });
    const result = (await answer.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null;
    if (!answer.ok || result?.ok !== true) {
      setMessage(result?.message ?? 'The answer could not be recorded.');
      return;
    }
    setResponse('');
    setAnswering(null);
    setSaved('Your answer is on the record.');
    startTransition(() => router.refresh());
  }

  return (
    <section className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--danger, #b3261e)' }}>
      <h2 style={{ marginTop: 0 }}>Claims against your courses</h2>

      {mine.notices.map((notice) => (
        <article key={notice.id} style={{ marginTop: '0.75rem' }}>
          <p style={{ margin: 0 }}>
            <strong>
              {notice.courseTitle} v{notice.versionNumber}
            </strong>{' '}
            — <span className="muted">{moment(notice.receivedAt)}</span>
          </p>
          <p style={{ margin: '0.25rem 0' }}>{teacherSentence(notice)}</p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>{notice.claimant}</strong>, {claimantRoleLabel(notice.claimantRole)}, claims{' '}
            <em>{notice.work}</em>: {notice.material}
          </p>
          <blockquote
            style={{
              margin: '0.35rem 0',
              padding: '0.5rem 0.9rem',
              borderLeft: '3px solid var(--border)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {notice.noticeText}
          </blockquote>

          {notice.response && (
            <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
              Your answer: {notice.response}
            </p>
          )}
          {notice.reason && (
            <p className="muted">The decision: {notice.reason}</p>
          )}

          {notice.status === 'held' && !notice.answered && (
            <>
              {answering === notice.id ? (
                <div style={{ display: 'grid', gap: '0.4rem', maxWidth: '40rem' }}>
                  <label>
                    Your answer
                    <textarea
                      value={response}
                      rows={5}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="What the material is, where it came from, and why you may use it."
                    />
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn"
                      disabled={pending}
                      onClick={() => void submit(notice.id)}
                    >
                      {pending ? 'Saving…' : 'Send the answer'}
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        setAnswering(null);
                        setResponse('');
                        setMessage(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                    You can answer once. It is kept as written and read before the decision — if you
                    need to add something afterwards, open a support case so it is on the record too.
                  </p>
                </div>
              ) : (
                <button type="button" className="btn" onClick={() => setAnswering(notice.id)}>
                  Answer this claim
                </button>
              )}
            </>
          )}
        </article>
      ))}

      {saved && (
        <p className="success" role="status">
          {saved}
        </p>
      )}
      {message && (
        <p className="danger" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
