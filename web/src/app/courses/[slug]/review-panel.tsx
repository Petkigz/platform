'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { REVIEW_BODY_MAX, type CourseReview, type ReviewSummary } from '@/lib/reviews';
import { reviewOutcomeOf, type ReviewLines, type ReviewWords } from '@/lib/course-parts';

/**
 * `.row` pins its first child to a label's width, and `.btn` asks for the whole
 * line. Neither suits a button whose words are a different length in every
 * language: this lets each be as wide as what it says.
 */
const NATURAL = { flex: '0 0 auto', width: 'auto', margin: 0 } as const;

/** "Reason given: …" with the reason set apart, since it may be in another script. */
function withReason(sentence: string, reason: string) {
  const at = sentence.indexOf('{reason}');
  if (at === -1) return <>{sentence} <bdi>{reason}</bdi></>;
  return (
    <>
      {sentence.slice(0, at)}
      <bdi>{reason}</bdi>
      {sentence.slice(at + '{reason}'.length)}
    </>
  );
}

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
 *
 * It carries no sentence of its own: the course page hands it `words` in the
 * reader's language. A refusal is said by its name (`reviewOutcomeOf`); a
 * reply that names nothing this panel knows is "could not be confirmed,
 * reload", and the route's sentence — the database's, for most refusals — is
 * never printed. What a learner wrote, a learner's name and the reason a
 * member of staff gave are theirs and are shown as written.
 *
 * It writes no number and no date. The average, the count, the bars' counts
 * and each review's day arrive finished in `lines`, written by the server: a
 * browser's copy of a language can be thinner than the server's (Chromium
 * writes a Kazakh "4,3" as "4.3" and a Nepali "१२" as "12"), and a panel that
 * formatted for itself would disagree with the page it was sent. The day on
 * a review is the day it was written in UTC.
 */
export function ReviewPanel({
  courseId,
  summary,
  reviews,
  signedIn,
  canReview,
  words,
  lines,
}: {
  courseId: string;
  summary: ReviewSummary;
  reviews: CourseReview[];
  signedIn: boolean;
  canReview: boolean;
  words: ReviewWords;
  /** The numbers and the days, already written out. */
  lines: ReviewLines;
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

  /** One request. A reply that did not arrive is a status of zero. */
  async function send(payload: Record<string, unknown>): Promise<{ status: number; json: { code?: unknown; held?: unknown } }> {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { code?: unknown; held?: unknown };
      return { status: res.status, json };
    } catch {
      return { status: 0, json: {} };
    }
  }

  function refuse(status: number, code: unknown) {
    const outcome = reviewOutcomeOf(status, code);
    setTone('error');
    setMessage(outcome === 'unconfirmed' ? words.unconfirmed : words.refusals[outcome]);
    // Unconfirmed is not "nothing happened": draw the page from the database.
    if (outcome === 'unconfirmed') startTransition(() => router.refresh());
  }

  async function submit() {
    setMessage(null);
    if (rating === null) {
      setTone('error');
      setMessage(words.choose);
      return;
    }
    const { status, json } = await send({ action: 'write', courseId, rating, body });
    if (status < 200 || status > 299) return refuse(status, json.code);

    setTone('info');
    setMessage(json.held === true ? words.held : words.thanks);
    startTransition(() => router.refresh());
  }

  async function removeMine() {
    if (!mine) return;
    setMessage(null);
    const { status, json } = await send({ action: 'remove', reviewId: mine.id });
    if (status < 200 || status > 299) return refuse(status, json.code);

    setTone('info');
    setMessage(words.removed);
    setRating(null);
    setBody('');
    startTransition(() => router.refresh());
  }

  return (
    <section>
      <h2>{words.title}</h2>

      <p className="muted" style={{ fontSize: '.9rem' }}>{words.body}</p>

      <div className="card">
        {summary.count === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            {words.none}
          </p>
        ) : (
          <div className="row" style={{ gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto' }}>
              <div className="n" style={{ fontSize: '2rem', lineHeight: 1 }}>
                {lines.average}
              </div>
              <div className="muted" style={{ fontSize: '.85rem' }}>
                {words.outOf} · {lines.count}
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.2rem', flex: 1, minWidth: '12rem' }}>
              {[...words.stars].reverse().map((star) => {
                const count = summary.distribution[star.value] ?? 0;
                return (
                  <div key={star.value} className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                    <span className="muted" style={{ flex: '0 0 1.5rem', fontSize: '.8rem' }}>
                      {star.digit}
                    </span>
                    {/* The track takes the room between the two numbers; the bar is a share of it. */}
                    <span aria-hidden style={{ flex: '1 1 0', minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          height: '0.4rem',
                          borderRadius: '2px',
                          background: 'var(--green-500, #2f7a4f)',
                          width: `${Math.round((count / maxStar) * 100)}%`,
                          minWidth: count > 0 ? '2px' : 0,
                          opacity: count > 0 ? 1 : 0,
                        }}
                      />
                    </span>
                    <span className="muted" style={{ flex: '0 0 auto', minWidth: '1.5rem', textAlign: 'end', fontSize: '.8rem' }}>
                      {lines.rows[star.value] ?? ''}
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
          <h3 style={{ marginTop: 0 }}>{mine ? words.update : words.write}</h3>

          <div className="row" style={{ gap: '0.25rem', flexWrap: 'wrap' }} role="radiogroup" aria-label={words.yourRating}>
            {words.stars.map((star) => (
              <button
                key={star.value}
                type="button"
                role="radio"
                aria-checked={rating === star.value}
                aria-label={star.label}
                className={`btn tiny ${rating === star.value ? '' : 'ghost'}`}
                style={NATURAL}
                disabled={pending}
                onClick={() => setRating(star.value)}
              >
                {star.digit}★
              </button>
            ))}
          </div>

          <label className="eyebrow" htmlFor="review-body">
            {words.sayMore}
          </label>
          <textarea
            id="review-body"
            rows={3}
            dir="auto"
            value={body}
            maxLength={REVIEW_BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder={words.placeholder}
            disabled={pending}
          />

          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '.75rem' }}>
            <button type="button" className="btn" style={NATURAL} disabled={pending} onClick={submit}>
              {pending ? words.saving : mine ? words.update : words.submit}
            </button>
            {mine && (
              <button
                type="button"
                className="btn ghost"
                style={NATURAL}
                disabled={pending}
                onClick={removeMine}
              >
                {words.remove}
              </button>
            )}
          </div>

          <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>{words.rule}</p>
        </div>
      )}

      {!canReview && <p className="muted">{signedIn ? words.needEnrol : words.signIn}</p>}

      {published.length > 0 && (
        <ul className="lessons" style={{ alignItems: 'flex-start' }}>
          {published.map((r) => (
            <li key={r.id}>
              <div className="t">
                <strong>{'★'.repeat(r.rating)}</strong>
                {r.body ? <p style={{ margin: '.25rem 0 0' }} dir="auto">{r.body}</p> : null}
                <span className="muted" style={{ fontSize: '.85rem' }}>
                  {r.reviewerName ? <bdi>{r.reviewerName}</bdi> : words.anon}
                  {' · '}
                  <time dateTime={r.createdAt}>{lines.days[r.id] ?? ''}</time>
                  {r.isMine ? ` · ${words.mine}` : ''}
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
              words.held
            ) : (
              <>
                {words.withdrawn}
                {r.withdrawnReason ? <> {withReason(words.withdrawnWhy, r.withdrawnReason)}</> : null}
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
