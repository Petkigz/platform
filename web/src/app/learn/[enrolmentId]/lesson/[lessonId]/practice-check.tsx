'use client';

import { useState } from 'react';
import type { Question } from '@/lib/assessment';
import { formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
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
 *
 * **The words can be handed in.** The lesson page passes `words` in the
 * reader's language, and `locale` so the question numbers are written that
 * language's way. What the teacher wrote (the title, the instructions, each
 * question, each choice, the explanation) is shown as written and finds its
 * own direction.
 *
 * **When a check does not go through.** The server's sentence is English, so
 * only an English page prints it. Any other page says one thing, that the
 * answer could not be checked and to try again, which is always safe to say
 * because checking writes nothing.
 */
export type PracticeCheckWords = {
  heading: string;
  intro: string;
  untitled: string;
  yourAnswer: string;
  yes: string;
  no: string;
  check: string;
  checking: string;
  right: string;
  wrong: string;
  retry: string;
  failed: string;
};

const ENGLISH: PracticeCheckWords = {
  heading: 'Check yourself',
  intro:
    'These are not marked and do not count as an attempt. Answering them changes nothing except what you know — the quiz, if this course has one, is a separate sitting.',
  untitled: 'Untitled question',
  yourAnswer: 'Your answer',
  yes: 'True',
  no: 'False',
  check: 'Check',
  checking: 'Checking…',
  right: 'That’s right.',
  wrong: 'Not quite.',
  retry: 'Try again, or read that part of the lesson once more.',
  failed: 'That could not be checked. Try again.',
};

export function PracticeCheck({
  items,
  words,
  locale = 'en',
}: {
  items: PracticeItem[];
  words?: PracticeCheckWords;
  /** The language `words` is in. */
  locale?: LocaleCode;
}) {
  const say = words ?? ENGLISH;
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

    type Reply = { ok?: boolean; correct?: boolean; explanation?: string | null; message?: string };
    let res: Response | null = null;
    let json: Reply = {};
    try {
      res = await fetch('/api/learn/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, answer: value }),
      });
      json = (await res.json().catch(() => ({}))) as Reply;
    } catch {
      // No reply at all. Before this was caught the button stayed on
      // "Checking…" for good.
      res = null;
    }

    if (!res?.ok || json.ok !== true) {
      setOutcomes((prev) => {
        const next = { ...prev };
        delete next[question.id];
        return next;
      });
      setError(locale === 'en' && typeof json.message === 'string' ? json.message : say.failed);
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
    <section className="card practice-check">
      <h2>{say.heading}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {say.intro}
      </p>

      {items.map((item) => (
        <div key={item.id} style={{ marginTop: '1rem' }}>
          <h3 dir="auto" style={{ marginBottom: '0.25rem' }}>{item.title}</h3>
          {item.instructions && (
            <p className="muted" dir="auto" style={{ marginTop: 0 }}>
              {item.instructions}
            </p>
          )}

          {item.questions.map((q, index) => {
            const outcome = outcomes[q.id];
            const value = answers[q.id];
            const choices = choicesOf(q);
            const locked = outcome?.status === 'correct';
            const prompt = promptOf(q);

            return (
              <div key={q.id} style={{ marginTop: '0.9rem' }}>
                <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>
                  {formatNumber(locale, index + 1)}. {prompt ? <bdi>{prompt}</bdi> : say.untitled}
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
                          <span dir="auto">{c.text}</span>
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
                        <span>{option ? say.yes : say.no}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    <label htmlFor={`practice-${q.id}`}>{say.yourAnswer}</label>
                    <textarea
                      id={`practice-${q.id}`}
                      rows={2}
                      dir="auto"
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
                    {outcome?.status === 'checking' ? say.checking : say.check}
                  </button>
                )}

                {outcome?.status === 'correct' && (
                  <div className="notice" role="status" style={{ marginTop: '0.5rem' }}>
                    <strong>{say.right}</strong>
                    {outcome.explanation && <> <bdi>{outcome.explanation}</bdi></>}
                  </div>
                )}

                {outcome?.status === 'wrong' && (
                  <div className="notice warn" role="status" style={{ marginTop: '0.5rem' }}>
                    <strong>{say.wrong}</strong>
                    {outcome.explanation
                      ? <> <bdi>{outcome.explanation}</bdi></>
                      : <> {say.retry}</>}
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
