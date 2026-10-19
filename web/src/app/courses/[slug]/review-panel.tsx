'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  RATING_MAX,
  RATING_MIN,
  REVIEW_BODY_MAX,
  type CourseReview,
  type ReviewSummary,
} from '@/lib/reviews';

const STAR_LABEL: Record<number, string> = {
  1: 'Poor',
  2: 'Disappointing',
  3: 'Fine',
  4: 'Good',
  5: 'Excellent',
};

/**
 * Ratings and reviews on a course page.
 *
 * Two things this component is careful about, both of them about honesty
 * rather than layout:
 *
 *   * It says what the number is. "From people enrolled in this course" and
 *     "not a scholarly review" are on the screen, because on a platform where
 *     scholars check content before publication, a star rating that reads as an
 *     endorsement misrepresents both.
 *   * It says what happened to your words. A held review shows as awaiting
 *     review rather than disappearing, and a withdrawn one shows the reason.
 */
export function ReviewPanel({
  courseId,
  summary,
  reviews,
  signedIn,
  canReview,
}: {
  courseId: string;
  summary: ReviewSummary;
  reviews: CourseReview[];
  signedIn: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const mine = reviews.find((r) => r.isMine) ?? null;
  const [rating, setRating] = useState<number | null>(mine?.rating ?? null);
  const [body, setBody] = useState(mine?.body ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  const published = reviews.filter((r) => r.visibility === 'visible');
  const maxStar = Math.max(1, ...Object.values(summary.distribution));

  async function submit() {
    setMessage(null);
    if (rating === null) {
      setTone('error');
      setMessage('Choose a star rating first.');
      return;
    }

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'write', courseId, rating, body }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      held?: boolean;
    };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The review was not saved.');
      return;
    }

    setTone('info');
    setMessage(
      json.held
        ? 'Thank you. Your rating is counted now; what you wrote appears once someone has read it.'
        : 'Thank you — your rating is on the course page.',
    );
    startTransition(() => router.refresh());
  }

  async function removeMine() {
    if (!mine) return;
    setMessage(null);

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'remove', reviewId: mine.id }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The review was not removed.');
      return;
    }

    setTone('info');
    setMessage('Your review was removed.');
    setRating(null);
    setBody('');
    startTransition(() => router.refresh());
  }

  return (
    <section>
      <h2>What learners say</h2>

      <p className="muted" style={{ fontSize: '.9rem' }}>
        Ratings come from people enrolled in this course. They say whether it
        worked for them — they are not a scholarly review, and course content is
        checked separately before it is published.
      </p>

      <div className="card">
        {summary.count === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            No ratings yet.
          </p>
        ) : (
          <div className="row" style={{ gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div className="n" style={{ fontSize: '2rem', lineHeight: 1 }}>
                {summary.average.toFixed(1)}
              </div>
              <div className="muted" style={{ fontSize: '.85rem' }}>
                out of {RATING_MAX} · {summary.count}{' '}
                {summary.count === 1 ? 'rating' : 'ratings'}
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.2rem', flex: 1, minWidth: '12rem' }}>
              {Array.from({ length: RATING_MAX }, (_, i) => RATING_MAX - i).map((star) => {
                const n = summary.distribution[star] ?? 0;
                return (
                  <div key={star} className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                    <span className="muted" style={{ fontSize: '.8rem', width: '1.5rem' }}>
                      {star}
                    </span>
                    <span
                      aria-hidden
                      style={{
                        display: 'block',
                        height: '0.4rem',
                        borderRadius: '2px',
                        background: 'var(--green-500, #2f7a4f)',
                        width: `${Math.round((n / maxStar) * 100)}%`,
                        minWidth: n > 0 ? '2px' : 0,
                        opacity: n > 0 ? 1 : 0,
                      }}
                    />
                    <span className="muted" style={{ fontSize: '.8rem' }}>
                      {n}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {canReview && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {mine ? 'Update your review' : 'Review this course'}
          </h3>

          <div className="row" style={{ gap: '0.25rem' }} role="radiogroup" aria-label="Your rating">
            {Array.from({ length: RATING_MAX }, (_, i) => i + RATING_MIN).map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} — ${STAR_LABEL[star]}`}
                className={`btn tiny ${rating === star ? '' : 'ghost'}`}
                disabled={pending}
                onClick={() => setRating(star)}
              >
                {star}★
              </button>
            ))}
          </div>

          <label className="eyebrow" htmlFor="review-body">
            Say more (optional)
          </label>
          <textarea
            id="review-body"
            rows={3}
            value={body}
            maxLength={REVIEW_BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What worked, what did not. Words are read by a person before they appear."
            disabled={pending}
          />

          <div className="row" style={{ gap: '0.5rem' }}>
            <button type="button" className="btn" disabled={pending} onClick={submit}>
              {pending ? 'Saving…' : mine ? 'Update review' : 'Submit rating'}
            </button>
            {mine && (
              <button
                type="button"
                className="btn ghost"
                disabled={pending}
                onClick={removeMine}
              >
                Remove my review
              </button>
            )}
          </div>

          <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
            A rating alone is published straight away. If you add words, they
            wait for a person to read them first.
          </p>
        </div>
      )}

      {!canReview && (
        <p className="muted">
          {signedIn
            ? 'You can review this course once you are enrolled in it.'
            : 'Sign in and enrol to rate this course.'}
        </p>
      )}

      {published.length > 0 && (
        <ul className="lessons" style={{ alignItems: 'flex-start' }}>
          {published.map((r) => (
            <li key={r.id}>
              <div className="t">
                <strong>{'★'.repeat(r.rating)}</strong>
                {r.body ? <p style={{ margin: '.25rem 0 0' }}>{r.body}</p> : null}
                <span className="muted" style={{ fontSize: '.85rem' }}>
                  {r.reviewerName ?? 'A learner'} · {new Date(r.createdAt).toLocaleDateString()}
                  {r.isMine ? ' · you' : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviews
        .filter((r) => r.isMine && r.visibility !== 'visible')
        .map((r) => (
          <div className="notice warn" key={r.id} role="status">
            {r.visibility === 'pending' ? (
              <>
                Your rating is counted. What you wrote is waiting for a person to
                read it, and will appear after that.
              </>
            ) : (
              <>
                Your review was withdrawn
                {r.withdrawnReason ? `: ${r.withdrawnReason}` : ''}. You can write
                another one.
              </>
            )}
          </div>
        ))}

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </section>
  );
}
