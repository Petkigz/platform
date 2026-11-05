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
import {
  HOLDS_NOTE,
  PURGE_NOTE,
  holdMeta,
  holdSentence,
  parseHoldCount,
  parseHolds,
  parseStorageQueue,
  storageSentence,
} from '@/lib/coursework-retention';
import { ReviewForm } from './review-form';
import { RetentionActionForm } from './retention-actions';
import { acknowledgeConcern, reopenConcern } from './safeguarding-actions';
import { parseSafeguardingConcerns, parseSafeguardingHistory } from '@/lib/safeguarding-queue';

export const dynamic = 'force-dynamic';

/** Owner-only review register, alongside separately authorized retention tools.
 * A recorded review is an attestation, not proof that a file was viewed.
 */
export default async function AdminCourseworkPage({ searchParams }: { searchParams: Promise<{ concern?: string; before?: string; beforeId?: string }> }) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const [summaryResult, queueResult, holdsResult, holdCountResult, planResult, storageResult] =
    await Promise.all([
      supabase.rpc('coursework_review_summary'),
      supabase.rpc('coursework_review_queue', { p_limit: 200 }),
      // Governance staff or the owner. A support agent reaches this page and the
      // database refuses the list; the page then says whose work it is instead of
      // rendering an empty register that reads as "nobody has held anything".
      supabase.rpc('coursework_holds', { p_limit: 100 }),
      supabase.rpc('coursework_hold_count'),
      // The owner alone: this plan names what is about to be deleted, and the
      // storage queue carries a bucket key for every unwatchable object.
      supabase.rpc('coursework_retention_plan'),
      supabase.rpc('coursework_bytes_awaiting', { p_limit: 50 }),
    ]);

  const statusResult = await supabase.rpc('safeguarding_owner_status');
  const ownerStatus = statusResult.data as { configured?: boolean; is_owner?: boolean } | null;
  const ownerStatusValid = !statusResult.error && typeof ownerStatus?.configured === 'boolean' && typeof ownerStatus?.is_owner === 'boolean';
  const isSafeguardingOwner = ownerStatusValid && ownerStatus?.is_owner === true;
  const params = await searchParams;
  const cursorValid = (!params.before && !params.beforeId) ||
    (typeof params.before === 'string' && Number.isFinite(Date.parse(params.before)) &&
      typeof params.beforeId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.beforeId));
  const concernResult = isSafeguardingOwner
    ? await supabase.rpc('safeguarding_concern_queue', { p_limit: 100 })
    : null;
  const historyResult = isSafeguardingOwner && cursorValid
    ? await supabase.rpc('safeguarding_concern_history', {
        // Preserve the database's microseconds; converting to JS Date would lose
        // cursor precision and could skip acknowledged concerns.
        p_before: params.before ?? null, p_before_id: params.beforeId ?? null, p_limit: 50,
      }) : null;
  const concerns = concernResult && !concernResult.error
    ? parseSafeguardingConcerns(concernResult.data) : null;
  const history = historyResult && !historyResult.error
    ? parseSafeguardingHistory(historyResult.data) : null;
  const lastHistory = history?.[history.length - 1];
  const nextHistory = history?.length === 50 && lastHistory
    ? `/admin/coursework?${new URLSearchParams({ before: lastHistory.acknowledged_at, beforeId: lastHistory.review_id })}`
    : null;
  const actionState = params.concern;

  const summary = summaryResult.error ? EMPTY_SUMMARY : parseReviewSummary(summaryResult.data);
  const queue = queueResult.error ? [] : parseReviewQueue(queueResult.data);
  const unreviewed = queue.filter((row) => row.review === 'none');
  const reviewed = queue.filter((row) => row.review !== 'none');

  const canSeeHolds = !holdsResult.error;
  const holds = canSeeHolds ? parseHolds(holdsResult.data) : [];
  const holdCount = canSeeHolds ? parseHoldCount(holdCountResult.data) : null;
  const canSeeStorage = !planResult.error && !storageResult.error;
  const storage = canSeeStorage ? parseStorageQueue(storageResult.data) : [];
  const plan = canSeeStorage ? (planResult.data as Record<string, unknown>) : null;

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Handed-in files</span>
      </nav>

      {!ownerStatusValid && <p className="notice warn">Safeguarding owner setup could not be checked.</p>}
      {ownerStatusValid && ownerStatus?.configured === false && (
        <section className="notice warn">
          The safeguarding owner is not configured. Concerns are recorded, but no one can open the owner queue until the trusted database setup is complete. No email alert is connected.
        </section>
      )}
      {isSafeguardingOwner && (
        <section className="card" style={{ marginBlock: '1rem' }}>
          <h2>Safeguarding concerns for the owner</h2>
          <p>Oldest unacknowledged coursework concerns first, up to 100 at a time. Acknowledge and refresh to see any later items. All ages are included so a changed or erased learner record cannot hide a concern. Acknowledging records that you marked the item; it does not mean it is resolved. No email alert is connected.</p>
          {actionState === 'recorded' && <p role="status">Acknowledgement recorded.</p>}
          {actionState === 'already' && <p role="status">That concern had already been acknowledged.</p>}
          {actionState === 'reopened' && <p role="status">The concern is back in the open queue.</p>}
          {actionState === 'already-open' && <p role="status">That concern was not acknowledged.</p>}
          {actionState === 'failed' && <p className="notice warn" role="alert">The acknowledgement could not be recorded. Check your access and try again.</p>}
          {concerns === null ? <p className="notice warn">The concern queue could not be loaded. Do not assume it is empty.</p>
            : concerns.length === 0 ? <p>No unacknowledged concerns were returned.</p>
              : <ul className="lessons">{concerns.map((row) => <li key={row.review_id}>
                <div className="t">
                  <strong>{row.learner_name ?? 'Learner details unavailable'} · {row.course_title ?? 'Course unavailable'}</strong>
                  <p>{row.note}</p>
                  <p className="muted">Recorded {row.reviewed_at} by {row.reviewer_name ?? 'reviewer unavailable'} · File ID: {row.asset_id}</p>
                  <a href={courseworkFileHref(row.asset_id)} target="_blank" rel="noreferrer">Try opening the file</a>
                  {row.details_unavailable && <p className="muted">The original submission or learner details are no longer available.</p>}
                  <form action={acknowledgeConcern}>
                    <input type="hidden" name="reviewId" value={row.review_id} />
                    <button type="submit" className="btn">Record acknowledgement</button>
                  </form>
                </div>
              </li>)}</ul>}
          <h3>Previously acknowledged</h3>
          <p>These remain available for review; reopening returns a concern to the open queue. The audit keeps the acknowledgement and reopening events.</p>
          {history === null ? <p className="notice warn">Acknowledgement history could not be loaded.</p>
            : history.length === 0 ? <p>No items on this history page.</p>
              : <ul className="lessons">{history.map((row) => <li key={row.review_id}>
                <div className="t">
                  <strong>{row.learner_name ?? 'Learner details unavailable'} · {row.course_title ?? 'Course unavailable'}</strong>
                  <p>{row.note}</p>
                  <p className="muted">Acknowledged {row.acknowledged_at} · File ID: {row.asset_id}</p>
                  <form action={reopenConcern}>
                    <input type="hidden" name="reviewId" value={row.review_id} />
                    <button type="submit" className="btn">Reopen concern</button>
                  </form>
                </div>
              </li>)}</ul>}
          {params.before && <p><Link href="/admin/coursework">Back to recent acknowledgements</Link></p>}
          {nextHistory && <p><Link href={nextHistory}>Older acknowledgements</Link></p>}
        </section>
      )}

      <div className="page-head">
        <p className="eyebrow">Safeguarding</p>
        <h1>Handed-in files</h1>
        <p className="muted">
          Review records are statements by the marker or safeguarding owner. They do
          not prove that anyone opened the file or list everyone who has seen it.
        </p>
      </div>

      {summaryResult.error ? <p className="notice warn">The review summary is available only to the configured safeguarding owner, or could not be loaded. Do not assume it is empty.</p> : <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="outline-h"><h2>Where things stand</h2></div>
        <p>{reviewHeadline(summary)}</p>
        <ul className="lessons">
          <li>
            <span className="t">Review recorded</span>
            <span className="muted">{summary.reviewed} of {summary.files}</span>
          </li>
          <li>
            <span className="t">No review recorded</span>
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
                {summary.reviewsOutlivingFiles} — the review record survives the file.
              </span>
            </li>
          )}
        </ul>
      </section>}

      {queueResult.error && <p className="notice warn">The review register is available only to the configured safeguarding owner, or could not be loaded. Do not assume it is empty.</p>}
      {!queueResult.error && queue.length === 0 && (
        <p className="muted">
          No available handed-in files were returned. A missing review record does
          not prove whether anyone opened a file.
        </p>
      )}

      {unreviewed.length > 0 && (
        <section className="card">
          <div className="outline-h">
            <h2>No review recorded for {unreviewed.length === 1 ? 'this file' : `these ${unreviewed.length} files`}</h2>
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
              <RetentionActionForm
                assetId={row.assetId}
                action="hold"
                label="Hold this from deletion"
                name={row.fileName ?? 'this file'}
              />
            </article>
          ))}
        </section>
      )}

      {reviewed.length > 0 && (
        <section className="card" style={{ marginBlockStart: '1rem' }}>
          <div className="outline-h"><h2>Reviews recorded</h2></div>
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

      <section className="card" style={{ marginBlockStart: '1.5rem' }}>
        <div className="outline-h">
          <h2>
            Held from deletion
            {holdCount ? ` (${holdCount.held})` : ''}
          </h2>
        </div>
        {!canSeeHolds ? (
          <p className="muted">
            Holding a file back belongs to governance staff and the owner, so this
            register is theirs. Everything above is still yours to review.
          </p>
        ) : (
          <>
            <p className="muted">{HOLDS_NOTE}</p>
            {holdCount && holdCount.holdingNothing > 0 && (
              <div className="notice warn">
                {holdCount.holdingNothing} of these {holdCount.held === 1 ? 'holds names a file' : 'holds name files'} that
                already left the register. A hold on a file that is gone keeps nothing;
                releasing it is how the register stops saying otherwise.
              </div>
            )}
            {holds.length === 0 ? (
              <p className="muted">
                Nothing is held. The clock is running on every file, which is the
                ordinary state.
              </p>
            ) : (
              <ul className="lessons">
                {holds.map((row) => (
                  <li key={row.assetId}>
                    <span className="t">
                      {row.displayName}
                      <span className="muted"> · {holdMeta(row)}</span>
                      <br />
                      <span className="muted">&ldquo;{row.reason}&rdquo;</span>
                      <br />
                      <span className="muted">{holdSentence(row)}</span>
                    </span>
                    <RetentionActionForm
                      assetId={row.assetId}
                      action="release"
                      label="Release the hold"
                      name={row.displayName}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {canSeeStorage && (
        <section className="card" style={{ marginBlockStart: '1rem' }}>
          <div className="outline-h">
            <h2>Handed-in files waiting in storage</h2>
          </div>
          <p className="muted">{PURGE_NOTE}</p>
          {plan && Number(plan.awaitingStorage ?? 0) === 0 ? (
            <p className="muted">
              Nothing is waiting. Every file this platform has tombstoned has had its
              deletion from storage recorded.
            </p>
          ) : (
            <ul className="lessons">
              {storage.map((row) => (
                <li key={row.assetId}>
                  <span className="t">
                    {row.displayName}
                    <br />
                    <span className="muted">{storageSentence(row)}</span>
                    <br />
                    <code style={{ fontSize: '0.8rem' }}>
                      {row.bucket}/{row.key}
                    </code>
                  </span>
                  <RetentionActionForm
                    assetId={row.assetId}
                    action="purge"
                    label="Record the deletion"
                    name={row.displayName}
                  />
                </li>
              ))}
            </ul>
          )}
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
