'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BODY_MAX, SUBJECT_MAX, supportRefusalOf, type NewCaseWords, type SupportCategory } from '@/lib/support';

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
 *
 * It carries no sentence of its own (2026-11-27): the page hands it `words` in
 * the reader's language. A refusal is said by its name (`supportRefusalOf`);
 * an answer that never arrived, or that is not a refusal, is "nobody can say
 * whether that was sent", and the route's English sentence is never printed.
 */
export function NewCaseForm({ words }: { words: NewCaseWords }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<SupportCategory>('account');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  const refuse = (sentence: string) => {
    setTone('error');
    setMessage(sentence);
  };

  async function submit() {
    setMessage(null);
    if (subject.trim().length < 3) return refuse(words.needSubject);
    if (!body.trim()) return refuse(words.needWhat);

    setBusy(true);
    let status = 0;
    let code: unknown;
    let id: unknown;
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'open', category, subject, body }),
      });
      status = res.status;
      const json = (await res.json().catch(() => ({}))) as { code?: unknown; id?: unknown };
      code = json.code;
      id = json.id;
    } catch {
      // No answer at all: a status of zero, which is "nobody can say".
    }
    setBusy(false);

    if (status < 200 || status > 299 || typeof id !== 'string') {
      const why = supportRefusalOf(status, code);
      // An empty box the browser let through is the box this form names.
      return refuse(why === 'empty' ? words.needWhat : why === 'gone' ? words.unsure : words[why]);
    }

    setTone('info');
    setMessage(words.sent);
    setSubject('');
    setBody('');
    startTransition(() => router.refresh());
  }

  const waiting = busy || pending;

  return (
    <section className="card" data-support-form="open">
      <h2>{words.heading}</h2>

      <div className="support-fields">
        <div>
          <label className="eyebrow" htmlFor="support-category">
            {words.topic}
          </label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            disabled={waiting}
          >
            {words.topics.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="eyebrow" htmlFor="support-subject">
            {words.subject}
          </label>
          <input
            id="support-subject"
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={words.subjectExample}
            disabled={waiting}
            dir="auto"
          />
        </div>

        <div>
          <label className="eyebrow" htmlFor="support-body">
            {words.what}
          </label>
          <textarea
            id="support-body"
            rows={5}
            value={body}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder={words.whatExample}
            aria-describedby="support-body-limit"
            disabled={waiting}
            dir="auto"
          />
          <span className="muted support-small" id="support-body-limit">
            {words.limit}
          </span>
        </div>

        <button type="button" className="btn" disabled={waiting} onClick={submit}>
          {waiting ? words.sending : words.send}
        </button>

        {message && (
          <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role={tone === 'error' ? 'alert' : 'status'}>
            {message}
          </div>
        )}
      </div>
    </section>
  );
}
