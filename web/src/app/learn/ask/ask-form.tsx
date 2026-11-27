'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ASK_MAX,
  type AiSupportAnswer,
  type AskWords,
  askRefusalOf,
  askSaysKey,
  normaliseAiSupportAnswer,
} from '@/lib/ai-support';
import { snippetParts } from '@/lib/snippet';

/**
 * The question box.
 *
 * It draws the lessons the database returned and nothing it inferred. A
 * citation is a link to the course, with a line of text parsed into pieces so the
 * `<mark>` tags the database emits are elements rather than HTML — a lesson title
 * is author-supplied, and this is the second place that rule applies.
 *
 * Since 2026-11-27 every sentence here is handed over by the page, in the
 * reader's language. The database's own English sentence and its line about
 * the rules are not printed: the page says what the answer's status means
 * in its own words. A refusal travels by name, and a reply that is no answer
 * (a five hundred, no reply at all, something that is not the answer's
 * shape) is not called a refusal: the question may have been recorded, and
 * the box says to look before asking again. Then what was typed is kept.
 */
export function AskForm({ words }: { words: AskWords }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AiSupportAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const asked = question.trim();
    if (asked.length < 3) { setAnswer(null); setError(words.refusals.tooShort); return; }
    if (asked.length > ASK_MAX) { setAnswer(null); setError(words.refusals.tooLong); return; }
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch('/api/learn/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; answer?: unknown; code?: unknown } | null;
      if (!res.ok) {
        setError(words.refusals[askRefusalOf(res.status, json?.code)]);
        return;
      }
      // The route read the answer strictly; this reads it again, because a
      // proxy's page with a 200 on it is not an answer either.
      const read = json?.ok ? normaliseAiSupportAnswer(json.answer) : null;
      if (!read) { setError(words.refusals.unsure); return; }
      setAnswer(read);
      // A refusal is still an answer to the person asking, so the box empties on
      // any recorded question — the record says what was asked.
      setQuestion('');
    } catch {
      setError(words.refusals.unsure);
    } finally {
      setBusy(false);
    }
  }

  const [openBefore = '', openAfter = ''] = words.openCase.split('{number}');

  return (
    <div style={{ marginTop: '1.25rem' }} data-ask-form>
      <label htmlFor="ask" className="eyebrow">{words.label}</label>
      <textarea
        id="ask"
        rows={3}
        maxLength={ASK_MAX}
        dir="auto"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={words.example}
      />
      <div className="row" style={{ marginTop: '0.5rem' }}>
        <button type="button" className="btn" onClick={submit} disabled={busy}>
          {busy ? words.looking : words.look}
        </button>
      </div>

      {error && (
        <div className="notice error" role="alert" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {answer && (
        <section className="card" style={{ padding: '1.25rem', marginTop: '1rem' }} data-ask-answer={answer.status} aria-live="polite">
          <p className="eyebrow">{words.status[answer.status]}</p>
          <p>{words.says[askSaysKey(answer)]}</p>

          {answer.supportCaseNumber && (
            <p>
              <Link href={`/support/${answer.supportCaseNumber}`}>
                {openBefore}<bdi dir="ltr">{answer.supportCaseNumber}</bdi>{openAfter}
              </Link>
            </p>
          )}

          {answer.citations.length > 0 && (
            <ul className="lessons ask-lessons">
              {answer.citations.map((lesson) => (
                <li key={lesson.lessonId}>
                  <span className="t">
                    <Link href={lesson.href}><bdi>{lesson.lessonTitle}</bdi></Link>
                    <br />
                    <span className="muted">
                      <bdi>{lesson.courseTitle}</bdi>
                      {lesson.sectionTitle ? <>{' · '}<bdi>{lesson.sectionTitle}</bdi></> : null}
                    </span>
                    <br />
                    <span dir="auto" className="ask-line">
                      {snippetParts(lesson.snippet).map((part, index) =>
                        part.mark
                          ? <mark key={index}>{part.text}</mark>
                          : <span key={index}>{part.text}</span>,
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="meta" style={{ marginTop: '0.75rem' }}>{words.rules}</p>
        </section>
      )}
    </div>
  );
}
