'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { choicesOf, promptOf, type Question } from '@/lib/assessment';
import { fill, formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';

/**
 * The quiz's own sentences, in one language, chosen by the page.
 *
 * The page is rendered on the server and knows which language this reader is
 * shown; this component runs in the browser and is not sent the catalogue for
 * these sentences (`SERVER_ONLY_PREFIXES`). `answered` and `score` are
 * templates: `{answered}`, `{total}`, `{earned}` and `{possible}` are filled
 * here, with digits written for `locale`.
 */
export type QuizWords = {
  untitledQuestion: string;
  yourAnswer: string;
  saved: string;
  /** The two answers to a true-or-false question. */
  yes: string;
  no: string;
  answered: string;
  submit: string;
  submitting: string;
  submitted: string;
  submittedManual: string;
  score: string;
  passed: string;
  notPassed: string;
  saveFailed: string;
  submitFailed: string;
  alreadySubmitted: string;
  unanswered: string;
};

type Refusal = { code?: string } | null;

type Submission = {
  ok?: boolean;
  code?: string;
  attempt?: { score_earned: number | null; score_possible: number | null; passed: boolean | null; status: string };
};

/**
 * The quiz.
 *
 * Answers are saved as they are chosen rather than on submit, so a dropped
 * connection mid-quiz does not cost the learner their work. Nothing here
 * computes a score: grading is server-side, because `grade_response()` is the
 * only code allowed to read the answer key.
 *
 * **It starts from what is already saved.** `initialAnswers` is the attempt's
 * responses as the server holds them, so a learner who reloads, or comes back
 * tomorrow, sees the answers they gave and a true count of how many.
 *
 * **A refusal is shown by its reason, not by its wording.** The server answers
 * with a `code`; the sentence comes from `words`. The English `message` in the
 * same response is never printed.
 */
export function Quiz({
  attemptId,
  questions,
  initialAnswers,
  locale,
  words,
  pointsLabels,
}: {
  attemptId: string;
  questions: Question[];
  initialAnswers: Record<string, unknown>;
  locale: LocaleCode;
  words: QuizWords;
  /** "2 points", already counted and written, by question id. */
  pointsLabels: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Saves still on their way. Submitting waits for them: a short answer is
  // saved when its box loses focus, and pressing Submit is what takes the
  // focus away, so without this the two requests raced and the server could
  // be asked to mark an attempt whose last answer had not arrived.
  const inFlight = useRef(new Set<Promise<void>>());
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [saved, setSaved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.keys(initialAnswers).map((id) => [id, true])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const num = (value: number) => formatNumber(locale, value);

  /** The sentence for a refusal, by the reason the server gave. */
  function sentenceFor(refusal: Refusal, otherwise: string): string {
    if (refusal?.code === 'already_submitted') return words.alreadySubmitted;
    if (refusal?.code === 'unanswered') return words.unanswered;
    return otherwise;
  }

  function save(questionId: string, content: unknown): Promise<void> {
    const sending = send(questionId, content);
    inFlight.current.add(sending);
    void sending.finally(() => inFlight.current.delete(sending));
    return sending;
  }

  async function send(questionId: string, content: unknown) {
    setAnswers((a) => ({ ...a, [questionId]: content }));
    // Not saved until the server says so: the word under the question must
    // not go on claiming it while a changed answer is still in the air.
    setSaved((s) => ({ ...s, [questionId]: false }));
    setError(null);

    let res: Response;
    try {
      res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'answer', attemptId, questionId, content }),
      });
    } catch {
      // No connection. `fetch` throws; nothing came back to read.
      setError(words.saveFailed);
      return;
    }

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as Refusal;
      setError(sentenceFor(json, words.saveFailed));
      return;
    }
    // "Saved" under a question means an answer is held for it. An emptied
    // answer is taken back on the server, and the word goes with it.
    const json = (await res.json().catch(() => null)) as { held?: boolean } | null;
    setSaved((s) => ({ ...s, [questionId]: json?.held !== false }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    await Promise.allSettled([...inFlight.current]);

    let json: Submission | null = null;
    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'submit', attemptId }),
      });
      json = (await res.json().catch(() => null)) as Submission | null;
    } catch {
      json = null;
    }

    setBusy(false);

    // No answer, or an answer that is not ours (a proxy's error page), is a
    // failure to say so about, not a reason to stop responding.
    if (!json?.ok) {
      setError(sentenceFor(json, words.submitFailed));
      return;
    }

    const a = json.attempt;
    if (a?.status === 'awaiting_manual_grading') {
      setResult(words.submittedManual);
    } else if (a && a.score_possible !== null && a.score_earned !== null) {
      const parts = [
        words.submitted,
        fill(words.score, { earned: num(Number(a.score_earned)), possible: num(Number(a.score_possible)) }),
      ];
      const verdict = a.passed === null ? null : a.passed ? words.passed : words.notPassed;
      setResult(verdict ? `${parts.join(' ')} · ${verdict}` : parts.join(' '));
    } else {
      setResult(words.submitted);
    }
    // The page now has no attempt in progress and draws the outcome itself:
    // the score among the marked attempts, or a line saying it is waiting for
    // the teacher. `done` is what lets it say "Submitted." once this
    // component, and the notice above, are gone.
    router.replace(`${pathname}?done=1`);
  }

  // A cleared short answer and an emptied set of ticks are not answers.
  const isAnswered = (value: unknown) =>
    value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
  const answered = questions.filter((q) => isAnswered(answers[q.id])).length;

  return (
    <div>
      {questions.map((q, i) => {
        const prompt = promptOf(q);
        const choices = choicesOf(q);
        const value = answers[q.id];
        const trueFalse = q.type === 'true_false';

        return (
          <div className="card" key={q.id} style={{ marginBottom: '0.9rem' }}>
            <div className="outline-h" style={{ marginTop: 0 }}>
              <h3 style={{ fontSize: '1rem' }} id={`prompt-${q.id}`}>
                {num(i + 1)}.{' '}
                {prompt ? <bdi>{prompt}</bdi> : <span className="muted">{words.untitledQuestion}</span>}
              </h3>
              <span className="badge neutral">{pointsLabels[q.id]}</span>
            </div>

            {choices.length > 0 ? (
              <div className="choices" role="group" aria-labelledby={`prompt-${q.id}`}>
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
                        disabled={Boolean(result)}
                        onChange={() => {
                          if (multiple) {
                            const cur = Array.isArray(value) ? (value as string[]) : [];
                            const next = cur.includes(c.id)
                              ? cur.filter((x) => x !== c.id)
                              : [...cur, c.id];
                            void save(q.id, next.sort());
                          } else {
                            void save(q.id, c.id);
                          }
                        }}
                      />
                      {/* True and false are the page's words; every other
                          choice is the teacher's, in the teacher's language. */}
                      {trueFalse ? (
                        <span>{c.id === 'true' ? words.yes : words.no}</span>
                      ) : (
                        <span dir="auto">{c.text}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <>
                <label htmlFor={`short-${q.id}`} style={{ marginTop: 0 }}>
                  {words.yourAnswer}
                </label>
                <textarea
                  id={`short-${q.id}`}
                  rows={3}
                  dir="auto"
                  disabled={Boolean(result)}
                  defaultValue={typeof value === 'string' ? value : ''}
                  onBlur={(e) => {
                    if (e.target.value !== (typeof value === 'string' ? value : '')) void save(q.id, e.target.value);
                  }}
                />
              </>
            )}

            <span className="muted" style={{ fontSize: '0.8rem' }} role="status">
              {saved[q.id] ? words.saved : ''}
            </span>
          </div>
        );
      })}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {result && (
        <div className="notice" role="status">
          {result}
        </div>
      )}

      <p className="muted" style={{ fontSize: '0.9rem', margin: '0.75rem 0 0' }} role="status">
        {fill(words.answered, { answered: num(answered), total: num(questions.length) })}
      </p>
      <div className="hero-actions">
        <button type="button" className="btn" onClick={submit} disabled={busy || Boolean(result)}>
          {busy ? words.submitting : words.submit}
        </button>
      </div>
    </div>
  );
}
