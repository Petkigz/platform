import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { courseworkFileHref } from '@/lib/coursework';
import {
  EMPTY_SUMMARY,
  describeFileReview,
  parseReviewQueue,
  parseReviewSummary,
  reviewDay,
  reviewHeadline,
  REVIEW_FORM_HELP,
} from '@/lib/coursework-review';
import { readableByteSize } from '@/lib/media';
import { ReviewForm } from './review-form';

export const dynamic = 'force-dynamic';

/**
 * Files children handed in, and who has looked at them.
 *
 * The gap this screen answers was one sentence wide and total: a handed-in file is
 * confirmed by the family that sends it and attached to their draft in the same
 * call, which is right for a child on metered data — and **no member of staff ever
 * saw the file or recorded having looked**. So the platform could not answer the
 * question a safeguarding lead actually gets asked.
 *
 * What this is not: a queue in front of the file. The teacher marking the work
 * opens it the moment it arrives, and this page says so on its face, because a
 * queue that never empties stops being read and a release gate spends the family's
 * goodwill on the ordinary case.
 *
 * The two answers are deliberately unequal. "No concern" needs nothing further;
 * "something to raise" needs a sentence, and the sentence stays with the file
 * rather than in the audit log, where a summary about a child's photograph would
 * outlive the people who could explain it.
 *
 * Staff-only, decided in the database (`coursework_review_queue()`), so the route
 * cannot be the place the rule is weakened.
 */
export default async function AdminCourseworkPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const [summaryResult, queueResult] = await Promise.all([
    supabase.rpc('coursework_review_summary'),
    supabase.rpc('coursework_review_queue', { p_limit: 200 }),
  ]);

  const summary = summaryResult.error ? EMPTY_SUMMARY : parseReviewSummary(summaryResult.data);
  const queue = queueResult.error ? [] : parseReviewQueue(queueResult.data);
  const unreviewed = queue.filter((row) => row.review === 'none');
  const reviewed = queue.filter((row) => row.review !== 'none');

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Handed-in files</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Safeguarding</p>
        <h1>Handed-in files</h1>
        <p className="muted">
          Work a learner sent as a photograph, a document or a recording. The teacher
          it was handed to can open it immediately; this page is how somebody records
          having looked at it, so the question &ldquo;who has seen my child&rsquo;s
          photograph?&rdquo; has an answer that is not a memory.
        </p>
      </div>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="outline-h"><h2>Where things stand</h2></div>
        <p>{reviewHeadline(summary)}</p>
        <ul className="lessons">
          <li>
            <span className="t">Looked at</span>
            <span className="muted">{summary.reviewed} of {summary.files}</span>
          </li>
          <li>
            <span className="t">Not looked at yet</span>
            <span className="muted">{summary.unreviewed}</span>
          </li>
          <li>
            <span className="t">A concern was noted</span>
            <span className="muted">
              {summary.concerns} of {summary.files}
              {summary.concerns > 0 ? ' — a conversation, not a decision' : ''}
            </span>
          </li>
          {summary.reviewsOutlivingFiles > 0 && (
            <li>
              <span className="t">Reviews whose file has since been deleted</span>
              <span className="muted">
                {summary.reviewsOutlivingFiles} — the record of somebody having
                looked survives the photograph, which is the point of keeping it.
              </span>
            </li>
          )}
        </ul>
      </section>

      {queue.length === 0 && (
        <p className="muted">
          Nothing has been handed in yet. When a learner sends a file it appears here
          within a second of arriving, and the teacher marking the work sees it
          immediately — with or without a review.
        </p>
      )}

      {unreviewed.length > 0 && (
        <section className="card">
          <div className="outline-h">
            <h2>Nobody has looked at {unreviewed.length === 1 ? 'this one' : `these ${unreviewed.length}`}</h2>
          </div>
          <p className="muted" style={{ fontSize: '0.9rem' }}>{REVIEW_FORM_HELP}</p>
          {unreviewed.map((row) => (
            <article key={row.assetId} style={{ display: 'grid', gap: '0.6rem', paddingBlock: '1rem', borderBlockStart: '1px solid var(--border, #e5e7e5)' }}>
              <div>
                <strong>{row.learnerName ?? 'A learner'}</strong>
                <span className="muted">
                  {' · '}
                  {row.courseTitle ?? 'a course'}
                  {' · '}
                  <a href={courseworkFileHref(row.assetId)} target="_blank" rel="noreferrer">
                    {row.fileName ?? 'handed-in file'}
                  </a>
                  {' · '}
                  {readableByteSize(Number(row.byteSize) || 0)}
                </span>
                <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                  Handed in {reviewDay(row.attachedAt) ?? 'recently'} · {describeFileReview(row)}
                </p>
              </div>
              <ReviewForm assetId={row.assetId} fileName={row.fileName} />
            </article>
          ))}
        </section>
      )}

      {reviewed.length > 0 && (
        <section className="card" style={{ marginBlockStart: '1rem' }}>
          <div className="outline-h"><h2>Looked at</h2></div>
          <ul className="lessons">
            {reviewed.map((row) => (
              <li key={row.assetId}>
                <span className="t">
                  {row.learnerName ?? 'A learner'} · {row.fileName ?? 'handed-in file'}
                  <span className="muted">
                    {' '}· {describeFileReview(row)}
                    {row.reviewerName ? ` by ${row.reviewerName}` : ''}
                  </span>
                  {row.review === 'concern' && (
                    <span className="badge warn" style={{ marginInlineStart: '0.5rem' }}>
                      concern noted
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="muted" style={{ fontSize: '0.9rem', marginBlockStart: '1.5rem' }}>
        A file is deleted a year after the class it belongs to ends, or thirty days
        after a learner&rsquo;s record is erased where that is sooner. The review stays:
        it is a record that somebody saw the file, and it is worth more than the
        photograph once the photograph is gone.
      </p>
    </div>
  );
}
