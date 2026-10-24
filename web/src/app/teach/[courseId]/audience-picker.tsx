'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AGE_BANDS,
  type AgeBand,
  type Audience,
  AUDIENCE_BANDS,
  BAND_LABEL,
  validateAudience,
} from '@/lib/audience';

/**
 * Say who the course is for.
 *
 * Two questions, in this order, because the second is a consequence of the
 * first: an audience decides which door the course stands behind, and the bands
 * say how far inside that audience it reaches. A child course cannot claim
 * 18+, and an adult course cannot claim a children's band — the database
 * refuses both, and this form never offers a box that would be refused.
 *
 * **Empty bands mean every band the audience allows.** That is what every
 * course on the platform meant before this column existed, so leaving the boxes
 * unticked changes nothing about a course that is already published.
 */

const AUDIENCE_OPTIONS: { value: Audience; label: string; hint: string }[] = [
  {
    value: 'child',
    label: 'Young learners',
    hint: 'Under 18. Appears behind the young learners’ door.',
  },
  {
    value: 'adult',
    label: 'Adults',
    hint: '18 and over. Appears behind the adults’ door.',
  },
  {
    value: 'both',
    label: 'Both',
    hint: 'Written to be taught to either. Appears behind both doors.',
  },
];

export function AudiencePicker({
  courseId,
  initialAudience,
  initialBands,
}: {
  courseId: string;
  initialAudience: Audience;
  initialBands: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [bands, setBands] = useState<AgeBand[]>(
    initialBands.filter((b): b is AgeBand => (AGE_BANDS as readonly string[]).includes(b)),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowed = AUDIENCE_BANDS[audience];

  // Changing the audience can strand a band the new audience may not claim, so
  // the selection is narrowed as the radio moves rather than left for the
  // database to refuse later.
  function choose(next: Audience) {
    setAudience(next);
    setBands((prev) => prev.filter((b) => AUDIENCE_BANDS[next].includes(b)));
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

    const problem = validateAudience(audience, bands);
    if (problem) {
      setError(problem);
      return;
    }

    const res = await fetch('/api/teach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'set_audience', courseId, audience, ageBands: bands }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      value?: { changed?: boolean };
    };

    if (!res.ok || json.ok !== true) {
      setError(json.message ?? 'Could not save who this course is for.');
      return;
    }

    setMessage(
      json.value?.changed === false
        ? 'Nothing changed — the course already said this.'
        : 'Saved. This is what learners see when they land on the course.',
    );
    startTransition(() => router.refresh());
  }

  const dirty =
    audience !== initialAudience ||
    bands.length !== initialBands.length ||
    bands.some((b) => !initialBands.includes(b));

  return (
    <div className="card" style={{ display: 'grid', gap: '0.5rem' }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        Who this is for
      </p>

      <p className="muted" style={{ margin: 0 }}>
        Which shelf the course stands on, and the ages inside it. Every change
        is recorded against your name, so the answer to &ldquo;who decided
        this?&rdquo; is always a person.
      </p>

      <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        {AUDIENCE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="row"
            style={{ gap: '0.35rem', alignItems: 'flex-start', maxWidth: '15rem' }}
          >
            <input
              type="radio"
              name="audience"
              checked={audience === option.value}
              onChange={() => choose(option.value)}
            />
            <span>
              <strong style={{ display: 'block' }}>{option.label}</strong>
              <span className="muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <div>
        <p className="eyebrow" style={{ margin: '0.25rem 0' }}>
          Ages
        </p>
        <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
          {allowed.map((band) => (
            <label key={band} className="row" style={{ gap: '0.3rem', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={bands.includes(band)}
                onChange={() => toggle(band)}
              />
              {BAND_LABEL[band]}
            </label>
          ))}
        </div>
        <p className="muted" style={{ margin: '0.35rem 0 0' }}>
          {bands.length === 0
            ? 'Nothing ticked means every age this audience allows — which is what every course meant before this question was asked.'
            : `Reaching ${bands.map((b) => BAND_LABEL[b]).join(', ')}.`}
        </p>
      </div>

      <div className="row">
        <button type="button" className="btn" disabled={pending || !dirty} onClick={save}>
          {pending ? 'Saving…' : 'Save audience'}
        </button>
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
