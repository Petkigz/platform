'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { choicesOf, promptOf, type Question } from '@/lib/assessment';

/**
 * The quiz.
 *
 * Answers are saved as they are chosen rather than on submit, so a dropped
 * connection mid-quiz does not cost the learner their work. Nothing here
 * computes a score: grading is server-side, because `grade_response()` is the
 * only code allowed to read the answer key.
 */
export function Quiz({
  attemptId,
  questions,
}: {
  attemptId: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function save(questionId: string, content: unknown) {
    setAnswers((a) => ({ ...a, [questionId]: content }));
    setError(null);

    const res = await fetch('/api/assessment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'answer', attemptId, questionId, content }),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(json?.message ?? 'Could not save that answer.');
      return;
    }
    setSaved((s) => ({ ...s, [questionId]: true }));
  }

  async function submit() {
    setBusy(true);
    setError(null);

    const res = await fetch('/api/assessment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'submit', attemptId }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok: boolean;
      message?: string;
      attempt?: { score_earned: number | null; score_possible: number | null; passed: boolean | null; status: string };
    };

    setBusy(false);

    if (!json.ok) {
      setError(json.message ?? 'Could not submit.');
      return;
    }

    const a = json.attempt;
    if (a?.status === 'awaiting_manual_grading') {
      setResult('Submitted. Some answers need a teacher to mark them.');
    } else if (a && a.score_possible !== null && a.score_earned !== null) {
      setResult(
        `Submitted — ${a.score_earned} of ${a.score_possible}` +
          (a.passed === null ? '' : a.passed ? ' · passed' : ' · not passed'),
      );
    } else {
      setResult('Submitted.');
    }
    router.refresh();
  }

  const answered = questions.filter((q) => answers[q.id] !== undefined).length;

  return (
    <div>
      {questions.map((q, i) => {
        const prompt = promptOf(q);
        const choices = choicesOf(q);
        const value = answers[q.id];

        return (
          <div className="card" key={q.id} style={{ marginBottom: '0.9rem' }}>
            <div className="outline-h" style={{ marginTop: 0 }}>
              <h3 style={{ fontSize: '1rem' }}>
                {i + 1}. {prompt || <span className="muted">Untitled question</span>}
              </h3>
              <span className="badge neutral">
                {q.points} {q.points === 1 ? 'point' : 'points'}
              </span>
            </div>

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
                        name={`q-${q.id}`}
                        checked={selected}
                        onChange={() => {
                          if (multiple) {
                            const cur = Array.isArray(value) ? (value as string[]) : [];
                            const next = cur.includes(c.id)
                              ? cur.filter((x) => x !== c.id)
                              : [...cur, c.id];
                            void save(q.id, next);
                          } else {
                            void save(q.id, c.id);
                          }
                        }}
                      />
                      <span>{c.text}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <>
                <label htmlFor={`short-${q.id}`} style={{ marginTop: 0 }}>
                  Your answer
                </label>
                <textarea
                  id={`short-${q.id}`}
                  rows={3}
                  defaultValue={typeof value === 'string' ? value : ''}
                  onBlur={(e) => {
                    if (e.target.value !== value) void save(q.id, e.target.value);
                  }}
                />
              </>
            )}

            {saved[q.id] && (
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                Saved
              </span>
            )}
          </div>
        );
      })}

      {error && <div className="notice error">{error}</div>}
      {result && <div className="notice">{result}</div>}

      <div className="hero-actions">
        <button type="button" className="btn" onClick={submit} disabled={busy || Boolean(result)}>
          {busy ? 'Submitting…' : `Submit (${answered}/${questions.length} answered)`}
        </button>
      </div>
    </div>
  );
}
