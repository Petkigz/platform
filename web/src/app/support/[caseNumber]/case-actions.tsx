'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BODY_MAX, supportRefusalOf, type CaseWords } from '@/lib/support';

/**
 * What the person who asked can do to their own request: add to it, or
 * withdraw it.
 *
 * (Staff have `staff-case-actions.tsx`. Until 2026-11-27 one component served
 * both seats, in English.)
 *
 * A reply that reopens a resolved request is expected behaviour, not a
 * failure, so nothing here discourages it: the page hands over a sentence that
 * says so when the request is resolved.
 *
 * It carries no sentence of its own. The page hands it `words` in the reader's
 * language; a refusal is said by its name (`supportRefusalOf`), and an answer
 * that never arrived, or that is not a refusal, is "nobody can say whether
 * that was saved". The route's English sentence is never printed.
 */
export function CaseActions({ caseId, words }: { caseId: string; words: CaseWords }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  const refuse = (sentence: string) => {
    setTone('error');
    setMessage(sentence);
  };

  /** Whether the change landed: the caller clears its box only then. */
  async function send(payload: Record<string, unknown>, success: string, empty: string): Promise<boolean> {
    setMessage(null);
    setBusy(true);
    let status = 0;
    let code: unknown;
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caseId, ...payload }),
      });
      status = res.status;
      code = ((await res.json().catch(() => ({}))) as { code?: unknown }).code;
    } catch {
      // No answer at all: a status of zero, which is "nobody can say".
    }
    setBusy(false);

    if (status < 200 || status > 299) {
      const why = supportRefusalOf(status, code);
      refuse(why === 'empty' ? empty : why === 'tooMany' || why === 'needSubject' ? words.refused : words[why]);
      return false;
    }

    setTone('info');
    setMessage(success);
    startTransition(() => router.refresh());
    return true;
  }

  async function submitReply() {
    if (!reply.trim()) return refuse(words.needReply);
    if (await send({ action: 'reply', body: reply }, words.replySent, words.needReply)) setReply('');
  }

  async function withdraw() {
    if (!reason.trim()) return refuse(words.needReason);
    if (await send({ action: 'close', reason }, words.withdrawn, words.needReason)) setReason('');
  }

  const waiting = busy || pending;

  return (
    <section className="card" data-support-form="case">
      <h2>{words.heading}</h2>

      <div className="support-fields">
        <div>
          <label className="eyebrow" htmlFor={`reply-${caseId}`}>
            {words.reply}
          </label>
          <textarea
            id={`reply-${caseId}`}
            rows={4}
            value={reply}
            maxLength={BODY_MAX}
            onChange={(e) => setReply(e.target.value)}
            placeholder={words.replyExample}
            aria-describedby={words.replyReopens ? `reply-note-${caseId}` : undefined}
            disabled={waiting}
            dir="auto"
          />
          {words.replyReopens && (
            <span className="muted support-small" id={`reply-note-${caseId}`}>
              {words.replyReopens}
            </span>
          )}
        </div>

        <button type="button" className="btn" disabled={waiting} onClick={submitReply}>
          {waiting ? words.sending : words.sendReply}
        </button>
      </div>

      <div className="support-fields support-apart">
        <h3>{words.withdrawHeading}</h3>
        <div>
          <label className="eyebrow" htmlFor={`reason-${caseId}`}>
            {words.reason}
          </label>
          <input
            id={`reason-${caseId}`}
            value={reason}
            maxLength={BODY_MAX}
            onChange={(e) => setReason(e.target.value)}
            placeholder={words.reasonExample}
            aria-describedby={`reason-note-${caseId}`}
            disabled={waiting}
            dir="auto"
          />
        </div>
        <button type="button" className="btn ghost" disabled={waiting} onClick={withdraw}>
          {words.withdraw}
        </button>
        <p className="muted support-small" id={`reason-note-${caseId}`}>
          {words.final}
        </p>
      </div>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role={tone === 'error' ? 'alert' : 'status'}>
          {message}
        </div>
      )}
    </section>
  );
}
