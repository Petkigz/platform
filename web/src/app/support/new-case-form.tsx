'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BODY_MAX, SUBJECT_MAX, SUPPORT_CATEGORIES } from '@/lib/support';

/**
 * Open a support case.
 *
 * Three fields, on purpose. The database accepts optional learner and order
 * context, and the API will pass it, but asking someone to identify the right
 * order id before they can say "I was charged twice" is how a help form gets
 * abandoned. An agent can ask for the detail in the thread, where the person
 * can see the question next to their answer.
 *
 * No actor id is sent: the case belongs to whoever is signed in.
 */
export function NewCaseForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>('account');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function submit() {
    setMessage(null);

    if (subject.trim().length < 3) {
      setTone('error');
      setMessage('Add a short subject so the team knows what this is about.');
      return;
    }
    if (!body.trim()) {
      setTone('error');
      setMessage('Describe the problem — what happened, and what you expected.');
      return;
    }

    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'open', category, subject, body }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; id?: string };

    if (!res.ok || !json.id) {
      setTone('error');
      setMessage(json.error ?? 'The request was not sent.');
      return;
    }

    setTone('info');
    setMessage('Sent. You will see our reply on this page.');
    setSubject('');
    setBody('');
    startTransition(() => router.refresh());
  }

  return (
    <section className="card">
      <h2>What do you need help with?</h2>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div>
          <label className="eyebrow" htmlFor="support-category">
            Topic
          </label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={pending}
          >
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="eyebrow" htmlFor="support-subject">
            Subject
          </label>
          <input
            id="support-subject"
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="For example: charged twice for one course"
            disabled={pending}
          />
        </div>

        <div>
          <label className="eyebrow" htmlFor="support-body">
            What happened?
          </label>
          <textarea
            id="support-body"
            rows={5}
            value={body}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell us what you did, what you saw, and what you expected to happen."
            disabled={pending}
          />
          <span className="muted" style={{ fontSize: '.8rem' }}>
            {body.length}/{BODY_MAX}
          </span>
        </div>

        <button type="button" className="btn" disabled={pending} onClick={submit}>
          {pending ? 'Sending…' : 'Send request'}
        </button>

        {message && (
          <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
            {message}
          </div>
        )}
      </div>
    </section>
  );
}
