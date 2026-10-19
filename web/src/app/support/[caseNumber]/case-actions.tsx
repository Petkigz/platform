'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BODY_MAX,
  SUPPORT_PRIORITIES,
  PRIORITY_LABEL,
  type SupportPriority,
  type SupportStatus,
} from '@/lib/support';

/**
 * What can be done to a case from its own page.
 *
 * Two different endpoints, because two different sets of rules apply: a
 * requester replies and may withdraw, staff answer, triage, resolve and close.
 * The split is in the database too — this component only decides which door to
 * knock on, and what it offers to show.
 *
 * The wording on resolve is the part worth getting right. Resolving is what the
 * requester reads, so the field says so; and a reply that reopens a resolved
 * case is expected behaviour, not a failure, so nothing here discourages it.
 */
export function CaseActions({
  caseId,
  status,
  priority,
  assignedTo,
  isStaff,
  myUserId,
}: {
  caseId: string;
  status: SupportStatus;
  priority: SupportPriority;
  assignedTo: string | null;
  isStaff: boolean;
  myUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [nextPriority, setNextPriority] = useState<string>(priority);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  const closed = status === 'closed';
  const endpoint = isStaff ? '/api/admin/support' : '/api/support';

  /** Returns whether the change landed — state updates are not visible to the
   *  caller in the same tick, so the outcome has to come back as a value. */
  async function send(payload: Record<string, unknown>, success: string): Promise<boolean> {
    setMessage(null);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ caseId, ...payload }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'That change was not saved.');
      return false;
    }

    setTone('info');
    setMessage(success);
    startTransition(() => router.refresh());
    return true;
  }

  async function submitReply() {
    if (!reply.trim()) {
      setTone('error');
      setMessage('Write a reply first.');
      return;
    }
    const isInternalNote = isStaff && internal;
    const ok = await send(
      { action: 'reply', body: reply, isInternal: isInternalNote },
      isInternalNote
        ? 'Internal note added. The requester cannot see it.'
        : status === 'resolved'
          ? 'Reply sent — this reopens the request.'
          : 'Reply sent.',
    );
    if (ok) {
      setReply('');
      setInternal(false);
    }
  }

  if (closed) {
    return (
      <section className="card">
        <h2>This request is closed</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Closed cases cannot be replied to. Open a new request if you still
          need help — it will start fresh, with a new case number.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>{isStaff ? 'Answer this request' : 'Add to your request'}</h2>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div>
          <label className="eyebrow" htmlFor={`reply-${caseId}`}>
            Reply
          </label>
          <textarea
            id={`reply-${caseId}`}
            rows={4}
            value={reply}
            maxLength={BODY_MAX}
            onChange={(e) => setReply(e.target.value)}
            placeholder={
              isStaff
                ? 'What you found, and what happens next.'
                : 'Anything else we should know. Replying to a resolved request reopens it.'
            }
            disabled={pending}
          />
        </div>

        {isStaff && (
          <label className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              disabled={pending}
            />
            <span className="muted">
              Internal note — visible to staff only, never to the requester
            </span>
          </label>
        )}

        <div className="row" style={{ gap: '0.5rem' }}>
          <button type="button" className="btn" disabled={pending} onClick={submitReply}>
            {pending ? 'Sending…' : isStaff && internal ? 'Add internal note' : 'Send reply'}
          </button>
        </div>
      </div>

      {isStaff && (
        <div
          className="section"
          style={{ borderTop: '1px solid var(--line, #e6e8e6)', marginTop: '1rem', paddingTop: '1rem', display: 'grid', gap: '0.75rem' }}
        >
          <h3 style={{ margin: 0 }}>Triage</h3>

          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            <label className="eyebrow" htmlFor={`priority-${caseId}`}>
              Priority
            </label>
            <select
              id={`priority-${caseId}`}
              value={nextPriority}
              onChange={(e) => setNextPriority(e.target.value)}
              disabled={pending}
            >
              {SUPPORT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn secondary"
              disabled={pending || nextPriority === priority}
              onClick={() => send({ action: 'priority', priority: nextPriority }, 'Priority updated.')}
            >
              Set priority
            </button>
            {assignedTo !== myUserId && (
              <button
                type="button"
                className="btn secondary"
                disabled={pending || status === 'resolved'}
                onClick={() => send({ action: 'assign' }, 'Assigned to you.')}
              >
                Assign to me
              </button>
            )}
          </div>

          <div>
            <label className="eyebrow" htmlFor={`note-${caseId}`}>
              Resolution — the requester reads this
            </label>
            <textarea
              id={`note-${caseId}`}
              rows={2}
              value={note}
              maxLength={BODY_MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was done, in the words you want them to see."
              disabled={pending}
            />
            <button
              type="button"
              className="btn"
              disabled={pending || status === 'resolved'}
              onClick={() => send({ action: 'resolve', note }, 'Marked resolved.')}
            >
              Mark resolved
            </button>
          </div>
        </div>
      )}

      <div
        className="section"
        style={{ borderTop: '1px solid var(--line, #e6e8e6)', marginTop: '1rem', paddingTop: '1rem', display: 'grid', gap: '0.5rem' }}
      >
        <h3 style={{ margin: 0 }}>{isStaff ? 'Close this case' : 'Withdraw my request'}</h3>
        <label className="eyebrow" htmlFor={`reason-${caseId}`}>
          Reason (required)
        </label>
        <input
          id={`reason-${caseId}`}
          value={reason}
          maxLength={BODY_MAX}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            isStaff
              ? 'For example: duplicate of SC-000123, or settled by phone.'
              : 'For example: I found the answer myself.'
          }
          disabled={pending}
        />
        <button
          type="button"
          className="btn ghost"
          disabled={pending}
          onClick={() => send({ action: 'close', reason }, 'Closed.')}
        >
          {isStaff ? 'Close case' : 'Withdraw request'}
        </button>
        <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
          Closing is final: neither side can reply afterwards.
        </p>
      </div>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </section>
  );
}
