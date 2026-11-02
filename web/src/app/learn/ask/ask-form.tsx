'use client';

import Link from 'next/link';
import { useState } from 'react';
import { type AiSupportAnswer, describeAiSupportStatus } from '@/lib/ai-support';
import { snippetParts } from '@/lib/lesson-search';

/**
 * The question box.
 *
 * It renders exactly what the database returned and nothing it inferred. A
 * citation is a link to the course, with a line of text parsed into pieces so the
 * `<mark>` tags the database emits are elements rather than HTML — a lesson title
 * is author-supplied, and this is the second place that rule applies.
 */
export function AskForm() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AiSupportAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch('/api/learn/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        answer?: AiSupportAnswer;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.answer) {
        setError(json.error ?? 'That could not be sent.');
        return;
      }
      setAnswer(json.answer);
      // A refusal is still an answer to the person asking, so the box empties on
      // any recorded question — the record says what was asked.
      setQuestion('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <label htmlFor="ask" className="eyebrow">
        What would you like to understand?
      </label>
      <textarea
        id="ask"
        rows={3}
        maxLength={1000}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Where is the letter ha produced?"
      />
      <div className="row" style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          onClick={submit}
          disabled={busy || question.trim().length < 3}
        >
          {busy ? 'Looking…' : 'Look it up'}
        </button>
      </div>

      {error && (
        <div className="notice error" role="alert" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {answer && (
        <section className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
          <p className="eyebrow">{describeAiSupportStatus(answer.status)}</p>
          <p>{answer.message}</p>

          {answer.supportCaseNumber && (
            <p>
              <Link href={`/support/${answer.supportCaseNumber}`}>
                Open case {answer.supportCaseNumber}
              </Link>
            </p>
          )}

          {answer.citations.length > 0 && (
            <ul className="lessons">
              {answer.citations.map((lesson) => (
                <li key={lesson.lessonId}>
                  <span className="t">
                    <Link href={lesson.href}>{lesson.lessonTitle}</Link>
                    <br />
                    <span className="muted">
                      {lesson.courseTitle}
                      {lesson.sectionTitle ? ` · ${lesson.sectionTitle}` : ''}
                    </span>
                    <br />
                    {snippetParts(lesson.snippet).map((part, index) =>
                      part.mark
                        ? <mark key={index}>{part.text}</mark>
                        : <span key={index}>{part.text}</span>,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="meta" style={{ marginTop: '0.75rem' }}>
            {answer.boundary.rules}
          </p>
        </section>
      )}
    </div>
  );
}
