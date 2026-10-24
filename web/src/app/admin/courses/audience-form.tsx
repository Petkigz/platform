'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AGE_BANDS,
  AUDIENCE_BANDS,
  BAND_LABEL,
  type AgeBand,
  type Audience,
  validateAudience,
} from '@/lib/audience';

/**
 * Change who a course is for, from the shelf.
 *
 * The same question as the author's picker, in less space: the shelf lists
 * every course and this is the one thing on a row that can be changed. The
 * boxes offered are only the bands the chosen audience may claim, because the
 * database refuses the rest and offering a box that will be refused is how a
 * screen teaches somebody to expect refusals.
 *
 * Empty means every band the audience allows — the meaning every course had
 * before the question was asked.
 */
export function AudienceForm({
  courseId,
  audience,
  ageBands,
  label,
}: {
  courseId: string;
  audience: Audience;
  ageBands: string[];
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [next, setNext] = useState<Audience>(audience);
  const [bands, setBands] = useState<AgeBand[]>(
    ageBands.filter((b): b is AgeBand => (AGE_BANDS as readonly string[]).includes(b)),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(choice: Audience) {
    setNext(choice);
    setBands((prev) => prev.filter((b) => AUDIENCE_BANDS[choice].includes(b)));
    setMessage(null);
    setError(null);
  }

  function toggle(band: AgeBand) {
    setBands((prev) =>
      prev.includes(band) ? prev.filter((b) => b !== band) : [...prev, band],
    );
    setMessage(null);
    setError(null);
  }

  async function save() {
    setMessage(null);
    setError(null);

    const problem = validateAudience(next, bands);
    if (problem) {
      setError(problem);
      return;
    }

    const res = await fetch('/api/admin/courses/audience', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ courseId, audience: next, ageBands: bands }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      value?: { changed?: boolean };
    };

    if (!res.ok || json.ok !== true) {
      setError(json.message ?? 'Could not change who this course is for.');
      return;
    }

    setMessage(
      json.value?.changed === false
        ? 'Nothing changed.'
        : 'Saved, and recorded against your name.',
    );
    startTransition(() => router.refresh());
  }

  const dirty =
    next !== audience ||
    bands.length !== ageBands.length ||
    bands.some((b) => !ageBands.includes(b));

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        {(['child', 'adult', 'both'] as const).map((choice) => (
          <label key={choice} className="row" style={{ gap: '0.3rem', fontSize: '0.9rem' }}>
            <input
              type="radio"
              name={`audience-${courseId}`}
              checked={next === choice}
              onChange={() => choose(choice)}
            />
            {choice === 'child' ? 'Young learners' : choice === 'adult' ? 'Adults' : 'Both'}
          </label>
        ))}
      </div>

      {next !== 'adult' && (
        <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
          {AUDIENCE_BANDS[next].map((band) => (
            <label key={band} className="row" style={{ gap: '0.3rem', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={bands.includes(band)}
                onChange={() => toggle(band)}
              />
              {BAND_LABEL[band]}
            </label>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: '0.5rem' }}>
        <button type="button" className="btn" disabled={pending || !dirty} onClick={save}>
          {pending ? 'Saving…' : `Save ${label}`}
        </button>
        {bands.length === 0 && (
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            No band ticked means every age this audience allows.
          </span>
        )}
      </div>

      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
