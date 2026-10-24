'use client';

import { useState } from 'react';
import type { Question } from '@/lib/assessment';
import { answerIsEmpty, choicesOf, promptOf } from '@/lib/practice';

export type PracticeItem = {
  id: string;
  title: string;
  instructions: string | null;
  questions: Question[];
};

type Outcome = {
  status: 'checking' | 'correct' | 'wrong';
  explanation: string | null;
};

/**
 * The questions at the bottom of a lesson.
 *
 * This is the half of "interactive" that was missing: a question you can answer
 * while you are still reading, and find out straight away whether you followed.
 * It is deliberately **not** the quiz — no attempt, no score, no attempt limit,
 * nothing recorded. The marked sitting is a different page, and confusing the
 * two would make a learner spend an attempt on a stray click.
 *
 * A wrong answer gets the explanation too. That is where the learning is, and
 * a practice question that keeps quiet when you are wrong is a test in
 * disguise.
 */
export function PracticeCheck({ items }: { items: PracticeItem[] }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setOutcomes((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  async function check(question: Question) {
    const value = answers[question.id];
    if (answerIsEmpty(question.type, value)) return;

    setError(null);
    setOutcomes((prev) => ({ ...prev, [question.id]: { status: 'checking', explanation: null } }));

    const res = await fetch('/api/learn/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, answer: value }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      correct?: boolean;
      explanation?: string | null;
      message?: string;
    };

    if (!res.ok || json.ok !== true) {
      setOutcomes((prev) => {
        const next = { ...prev };
        delete next[question.id];
        return next;
      });
      setError(json.message ?? 'That could not be checked. Try again.');
      return;
    }

    setOutcomes((prev) => ({
      ...prev,
      [question.id]: {
        status: json.correct ? 'correct' : 'wrong',
        explanation: typeof json.explanation === 'string' ? json.explanation : null,
      },
    }));
  }

  return (
    <section className="card">
      <h2>Check yourself</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        These are not marked and do not count as an attempt. Answering them
        changes nothing except what you know — the quiz, if this course has one,
        is a separate sitting.
      </p>

      {items.map((item) => (
        <div key={item.id} style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.25rem' }}>{item.title}</h3>
          {item.instructions && (
            <p className="muted" style={{ marginTop: 0 }}>
              {item.instructions}
            </p>
          )}

          {item.questions.map((q, index) => {
            const outcome = outcomes[q.id];
            const value = answers[q.id];
            const choices = choicesOf(q);
            const locked = outcome?.status === 'correct';

            return (
              <div key={q.id} style={{ marginTop: '0.9rem' }}>
                <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>
                  {index + 1}. {promptOf(q) || 'Untitled question'}
                </p>

                {choices.length > 0 ? (
                  <div className="choices">
                    {choices.map((c) => {
                      const multiple = q.type === 'multiple_choice';
                      const selected = multiple
                        ? Array.isArray(value) && value.includes(c.id)
                        : value === c.id;

                      return (
                        <label className={`choice ${selected ? 'on' : ''}`} key={c.id}>
                          <input
                            type={multiple ? 'checkbox' : 'radio'}
                            name={`practice-${q.id}`}
                            checked={selected}
                            disabled={locked}
                            onChange={() => {
                              if (multiple) {
                                const current = Array.isArray(value) ? (value as string[]) : [];
                                const next = current.includes(c.id)
                                  ? current.filter((x) => x !== c.id)
                                  : [...current, c.id];
                                // Sorted here as well as in the database: the
                                // graded quiz sends sorted arrays, and the check
                                // must not be more forgiving than the marker.
                                setAnswer(q.id, [...next].sort());
                              } else {
                                setAnswer(q.id, c.id);
                              }
                            }}
                          />
                          <span>{c.text}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : q.type === 'true_false' ? (
                  <div className="choices">
                    {[true, false].map((option) => (
                      <label
                        className={`choice ${value === option ? 'on' : ''}`}
                        key={String(option)}
                      >
                        <input
                          type="radio"
                          name={`practice-${q.id}`}
                          checked={value === option}
                          disabled={locked}
                          onChange={() => setAnswer(q.id, option)}
                        />
                        <span>{option ? 'True' : 'False'}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    <label htmlFor={`practice-${q.id}`}>Your answer</label>
                    <textarea
                      id={`practice-${q.id}`}
                      rows={2}
                      value={typeof value === 'string' ? value : ''}
                      disabled={locked}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  </>
                )}

                {!locked && (
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={
                      outcome?.status === 'checking' || answerIsEmpty(q.type, value)
                    }
                    onClick={() => void check(q)}
                  >
                    {outcome?.status === 'checking' ? 'Checking…' : 'Check'}
                  </button>
                )}

                {outcome?.status === 'correct' && (
                  <div className="notice" role="status" style={{ marginTop: '0.5rem' }}>
                    <strong>That&rsquo;s right.</strong>
                    {outcome.explanation && <> {outcome.explanation}</>}
                  </div>
                )}

                {outcome?.status === 'wrong' && (
                  <div className="notice warn" role="status" style={{ marginTop: '0.5rem' }}>
                    <strong>Not quite.</strong>
                    {outcome.explanation
                      ? <> {outcome.explanation}</>
                      : <> Try again, or read that part of the lesson once more.</>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {error && (
        <div className="notice error" role="alert" style={{ marginTop: '0.75rem' }}>
          {error}
        </div>
      )}
    </section>
  );
}
