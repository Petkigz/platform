import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { courseworkFileHref } from '@/lib/coursework';
import {
  describeFileReview,
  parseReviewPage,
  parseReviewSummaryStrict,
  reviewDay,
  reviewHeadline,
  REVIEW_FORM_HELP,
} from '@/lib/coursework-review';
import { readableByteSize } from '@/lib/media';
import {
  HOLDS_NOTE,
  missingClassEndCount,
  parseMissingClassEnds,
  PURGE_NOTE,
  holdMeta,
  holdSentence,
  parseHoldCount,
  parseHoldPage,
  parseStoragePage,
  storageSentence,
} from '@/lib/coursework-retention';
import { ReviewForm } from './review-form';
import { RetentionActionForm } from './retention-actions';
import { acknowledgeConcern, reopenConcern, retrySafeguardingAlert } from './safeguarding-actions';
import { parseSafeguardingAlertStatus, describeSafeguardingAlert, parseSafeguardingAlertHistory, isAlertHistoryCursor, parseSafeguardingAlertFullHistory } from '@/lib/safeguarding-alert-status';
import { attestClassEnd } from './class-end-actions';
import { releaseQuarantine } from './quarantine-actions';
import { isQuarantineCursor, parseCourseworkQuarantines } from '@/lib/coursework-quarantine';
import { parseSafeguardingConcerns, parseSafeguardingHistory } from '@/lib/safeguarding-queue';

export const dynamic = 'force-dynamic';

/** Owner-only review register, alongside separately authorized retention tools.
 * A recorded review is an attestation, not proof that a file was viewed.
 */
export default async function AdminCourseworkPage({ searchParams }: { searchParams: Promise<{ concern?: string; before?: string; beforeId?: string; endsAfter?: string; classEnd?: string; quarantineAfter?: string; quarantine?: string; concernAfter?: string; concernAfterId?: string; alert?: string; alertReview?: string; alertBefore?: string; storageAfter?: string; storageAfterId?: string; holdAfter?: string; holdAfterId?: string; reviewAfterState?: string; reviewAfterAt?: string; reviewAfterId?: string }> }) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const params = await searchParams;
  const endsCursorValid = !params.endsAfter || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.endsAfter);
  const reviewCursorValid = (!params.reviewAfterState && !params.reviewAfterAt && !params.reviewAfterId) ||
    ((params.reviewAfterState === 'reviewed' || params.reviewAfterState === 'unreviewed') &&
      typeof params.reviewAfterAt === 'string' && Number.isFinite(Date.parse(params.reviewAfterAt)) &&
      typeof params.reviewAfterId === 'string' && isQuarantineCursor(params.reviewAfterId));
  const holdCursorValid = (!params.holdAfter && !params.holdAfterId) ||
    (typeof params.holdAfter === 'string' && Number.isFinite(Date.parse(params.holdAfter)) &&
      typeof params.holdAfterId === 'string' && isQuarantineCursor(params.holdAfterId));
  const storageCursorValid = (!params.storageAfter && !params.storageAfterId) ||
    (typeof params.storageAfter === 'string' && Number.isFinite(Date.parse(params.storageAfter)) &&
      typeof params.storageAfterId === 'string' && isQuarantineCursor(params.storageAfterId));
  const [summaryResult, queueResult, holdsResult, holdCountResult, planResult, storageResult, missingEndsResult] =
    await Promise.all([
      supabase.rpc('coursework_review_summary'),
      reviewCursorValid ? supabase.rpc('coursework_review_queue_page', { p_after_reviewed: params.reviewAfterState ? params.reviewAfterState === 'reviewed' : null, p_after_attached: params.reviewAfterAt ?? null, p_after_asset: params.reviewAfterId ?? null, p_limit: 51 }) : Promise.resolve({ data: null, error: true }),
      // The configured safeguarding owner alone can read the hold register.
      holdCursorValid ? supabase.rpc('coursework_holds_page', { p_after: params.holdAfter ?? null, p_after_id: params.holdAfterId ?? null, p_limit: 51 }) : Promise.resolve({ data: null, error: true }),
      supabase.rpc('coursework_hold_count'),
      // The owner alone: this plan names what is about to be deleted, and the
      // storage queue carries a bucket key for every unwatchable object.
      supabase.rpc('coursework_retention_plan'),
      storageCursorValid ? supabase.rpc('coursework_bytes_awaiting_page', { p_after: params.storageAfter ?? null, p_after_id: params.storageAfterId ?? null, p_limit: 51 }) : Promise.resolve({ data: null, error: true }),
      endsCursorValid ? supabase.rpc('coursework_missing_class_ends', { p_limit: 100, p_after: params.endsAfter ?? null }) : Promise.resolve({ data: null, error: true }),
    ]);

  const statusResult = await supabase.rpc('safeguarding_owner_status');
  const ownerStatus = statusResult.data as { configured?: boolean; is_owner?: boolean } | null;
  const ownerStatusValid = !statusResult.error && typeof ownerStatus?.configured === 'boolean' && typeof ownerStatus?.is_owner === 'boolean';
  const isSafeguardingOwner = ownerStatusValid && ownerStatus?.is_owner === true;
  const cursorValid = (!params.before && !params.beforeId) ||
    (typeof params.before === 'string' && Number.isFinite(Date.parse(params.before)) &&
      typeof params.beforeId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.beforeId));
  const quarantineCursorValid = !params.quarantineAfter || isQuarantineCursor(params.quarantineAfter);
  const quarantineResult = isSafeguardingOwner && quarantineCursorValid
    ? await supabase.rpc('coursework_quarantine_queue', { p_limit: 51, p_after: params.quarantineAfter ?? null }) : null;
  const quarantines = quarantineResult && !quarantineResult.error
    ? parseCourseworkQuarantines(quarantineResult.data) : null;
  const quarantineNext = quarantines && quarantines.length > 50 ? quarantines[49]?.asset_id : null;
  const openCursorValid = (!params.concernAfter && !params.concernAfterId) ||
    (typeof params.concernAfter === 'string' && Number.isFinite(Date.parse(params.concernAfter)) &&
      typeof params.concernAfterId === 'string' && isQuarantineCursor(params.concernAfterId));
  const concernResult = isSafeguardingOwner && openCursorValid
    ? await supabase.rpc('safeguarding_concern_queue_page', {
        p_after: params.concernAfter ?? null, p_after_id: params.concernAfterId ?? null, p_limit: 51,
      }) : null;
  const historyResult = isSafeguardingOwner && cursorValid
    ? await supabase.rpc('safeguarding_concern_history', {
        // Preserve database microseconds; converting to JS Date would lose
        // cursor precision and could skip acknowledged concerns.
        p_before: params.before ?? null, p_before_id: params.beforeId ?? null, p_limit: 50,
      }) : null;
  const concerns = concernResult && !concernResult.error
    ? parseSafeguardingConcerns(concernResult.data) : null;
  const nextOpenCursor = concerns && concerns.length > 50 ? concerns[49] : null;
  const nextOpenPage = nextOpenCursor
    ? `/admin/coursework?${new URLSearchParams({ concernAfter: nextOpenCursor.reviewed_at, concernAfterId: nextOpenCursor.review_id })}#open-concerns` : null;
  const alertStatusResult = isSafeguardingOwner && concerns !== null
    ? await supabase.rpc('safeguarding_alert_status', { p_review_ids: concerns.slice(0, 50).map((row) => row.review_id) }) : null;
  const alertStatuses = alertStatusResult && !alertStatusResult.error ? parseSafeguardingAlertStatus(alertStatusResult.data) : null;
  const alertHistoryResult = isSafeguardingOwner && concerns !== null
    ? await supabase.rpc('safeguarding_alert_recent_history', { p_review_ids: concerns.slice(0, 50).map((row) => row.review_id), p_per_alert: 5 }) : null;
  const alertHistory = alertHistoryResult && !alertHistoryResult.error ? parseSafeguardingAlertHistory(alertHistoryResult.data) : null;
  const fullAlertCursorValid = !!params.alertReview && isQuarantineCursor(params.alertReview) &&
    (!params.alertBefore || isAlertHistoryCursor(params.alertBefore));
  const fullAlertResult = isSafeguardingOwner && fullAlertCursorValid
    ? await supabase.rpc('safeguarding_alert_history', { p_review_id: params.alertReview, p_before: params.alertBefore ?? null, p_limit: 51 }) : null;
  const fullAlertHistory = fullAlertResult && !fullAlertResult.error ? parseSafeguardingAlertFullHistory(fullAlertResult.data) : null;
  const fullAlertNext = fullAlertHistory && fullAlertHistory.length > 50 ? fullAlertHistory[49]?.event_id : null;
  const history = historyResult && !historyResult.error
    ? parseSafeguardingHistory(historyResult.data) : null;
  const lastHistory = history?.[history.length - 1];
  const nextHistory = history?.length === 50 && lastHistory
    ? `/admin/coursework?${new URLSearchParams({ before: lastHistory.acknowledged_at, beforeId: lastHistory.review_id })}`
    : null;
  const actionState = params.concern;

  const summary = summaryResult.error ? null : parseReviewSummaryStrict(summaryResult.data);
  const queueRows = queueResult.error ? null : parseReviewPage(queueResult.data);
  const queue = queueRows?.slice(0,50) ?? [];
  const reviewNext = queueRows && queueRows.length > 50 ? queueRows[49] : null;
  const unreviewed = queue.filter((row) => row.review === 'none');
  const reviewed = queue.filter((row) => row.review !== 'none');

  const holdRows = !holdsResult.error ? parseHoldPage(holdsResult.data) : null;
  const holdCountData = holdCountResult.data as Record<string, unknown> | null;
  const validHoldCount = !holdCountResult.error && typeof holdCountData?.held === 'number' &&
    typeof holdCountData?.holdingNothing === 'number' && Number.isSafeInteger(holdCountData.held) &&
    Number.isSafeInteger(holdCountData.holdingNothing) && holdCountData.held >= 0 && holdCountData.holdingNothing >= 0;
  const canSeeHolds = holdRows !== null && validHoldCount;
  const holds = holdRows?.slice(0,50) ?? [];
  const holdNext = holdRows && holdRows.length > 50 ? holdRows[49] : null;
  const holdCount = canSeeHolds ? parseHoldCount(holdCountData) : null;
  const storageRows = !planResult.error && !storageResult.error ? parseStoragePage(storageResult.data) : null;
  const canSeeStorage = storageRows !== null;
  const storage = storageRows?.slice(0,50) ?? [];
  const storageNext = storageRows && storageRows.length > 50 ? storageRows[49] : null;
  const missingCount = planResult.error ? null : missingClassEndCount(planResult.data);
  const missingEnds = missingEndsResult.error ? null : parseMissingClassEnds(missingEndsResult.data);

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
          The safeguarding owner is not configured. Concerns are recorded, but no one can open the owner queue until the trusted database setup is complete. Alerts cannot be sent until an owner is configured.
        </section>
      )}
      {isSafeguardingOwner && params.alertReview && <section id="alert-history" className="card" style={{ marginBlock: '1rem' }}>
        <h2>Private alert history</h2>
        <p>For concern {params.alertReview}. A provider reference is acceptance, not evidence of delivery or receipt. Earlier events may not exist if alert history was enabled later.</p>
        {fullAlertHistory === null ? <p className="notice warn">Alert history could not be loaded; do not assume it is empty.</p>
          : fullAlertHistory.length === 0 ? <p>No events on this page.</p>
            : <ul>{fullAlertHistory.slice(0,50).map((event) => <li key={event.event_id}>
              {event.recorded_at} · {event.status} · attempt {event.attempts}
              {event.provider_reference && ` · ${event.provider ?? 'provider'} reference: ${event.provider_reference}`}
            </li>)}</ul>}
        {params.alertBefore && <p><Link href={`/admin/coursework?${new URLSearchParams({ alertReview: params.alertReview })}#alert-history`}>Back to recent alert history</Link></p>}
        {fullAlertNext && <p><Link href={`/admin/coursework?${new URLSearchParams({ alertReview: params.alertReview, alertBefore: fullAlertNext })}#alert-history`}>Older alert events</Link></p>}
      </section>}
      {isSafeguardingOwner && (
        <section id="coursework-quarantines" className="card" style={{ marginBlock: '1rem' }}>
          <h2>Quarantined coursework</h2>
          <p>Review why each file was quarantined before releasing it. A release restores its recorded previous state, not the file bytes or a safety scan. Pending files still need the uploader to confirm the upload. Older quarantines without a recorded previous state need individual review.</p>
          {params.quarantine === 'pending' && <p role="status">Quarantine released; the file is pending and is not yet confirmed.</p>}
          {params.quarantine === 'available' && <p role="status">Quarantine released; the previous available status was restored.</p>}
          {(params.quarantine === 'failed' || params.quarantine === 'invalid') && <p className="notice warn" role="alert">The release could not be confirmed. Refresh and review the file before trying again.</p>}
          {quarantines === null ? <p className="notice warn">The quarantine list could not be loaded. Do not assume it is empty.</p>
            : quarantines.length === 0 ? <p>No quarantined coursework is shown on this page.</p>
              : <ul className="lessons">{quarantines.slice(0, 50).map((row) => <li key={row.asset_id}>
                <div className="t">
                  <strong>{row.display_name ?? 'Unnamed file'}</strong>
                  <p>File ID: {row.asset_id} · {row.quarantined_at ? `Quarantined ${row.quarantined_at}` : 'Quarantine date not recorded here'}</p>
                  <p>{row.previous_status ? `Previously ${row.previous_status}.` : 'Previous status unknown: individual review required.'}</p>
                  <p>{row.recorded_reason ? `A recorded quarantine reason: ${row.recorded_reason}` : 'No quarantine reason was found here.'} Check any other incident records too.</p>
                  <a href={courseworkFileHref(row.asset_id)} target="_blank" rel="noreferrer">Try opening the file for review</a>
                  {row.previous_status && <form action={releaseQuarantine}>
                    <input type="hidden" name="assetId" value={row.asset_id} />
                    <input type="hidden" name="after" value={params.quarantineAfter ?? ''} />
                    <label><input type="checkbox" name="reviewed" value="yes" required /> I reviewed this quarantine and understand that its previous status will be restored.</label>
                    <button type="submit" className="btn">Release quarantine</button>
                  </form>}
                </div>
              </li>)}</ul>}
          {params.quarantineAfter && <p><Link href="/admin/coursework#coursework-quarantines">Back to first quarantine page</Link></p>}
          {quarantineNext && <p><Link href={`/admin/coursework?${new URLSearchParams({ quarantineAfter: quarantineNext })}#coursework-quarantines`}>More quarantined files</Link></p>}
        </section>
      )}
      {isSafeguardingOwner && (
        <section className="card" style={{ marginBlock: '1rem' }}>
          <h2 id="open-concerns">Safeguarding concerns for the owner</h2>
          <p>Oldest unacknowledged coursework concerns first, 50 per page. You can see later items without acknowledging earlier ones. All ages are included so a changed or erased learner record cannot hide a concern. Acknowledging records that you marked the item; it does not mean it is resolved. Alerts need the provider, scheduler and an active verified owner email; a provider reference does not prove receipt.</p>
          {params.alert === 'queued' && <p role="status">Alert queued for another attempt; no email has been confirmed sent.</p>}
          {params.alert === 'failed' && <p className="notice warn" role="alert">The alert could not be queued for retry.</p>}
          {actionState === 'recorded' && <p role="status">Acknowledgement recorded.</p>}
          {actionState === 'already' && <p role="status">That concern had already been acknowledged.</p>}
          {actionState === 'reopened' && <p role="status">The concern is back in the open queue.</p>}
          {actionState === 'already-open' && <p role="status">That concern was not acknowledged.</p>}
          {actionState === 'failed' && <p className="notice warn" role="alert">The acknowledgement could not be recorded. Check your access and try again.</p>}
          {concerns === null ? <p className="notice warn">The concern queue could not be loaded. Do not assume it is empty.</p>
            : concerns.length === 0 ? <p>No unacknowledged concerns were returned.</p>
              : <ul className="lessons">{concerns.slice(0, 50).map((row) => <li key={row.review_id}>
                <div className="t">
                  <strong>{row.learner_name ?? 'Learner details unavailable'} · {row.course_title ?? 'Course unavailable'}</strong>
                  <p>{row.note}</p>
                  <p className="muted">{describeSafeguardingAlert(alertStatuses?.find((alert) => alert.review_id === row.review_id))}</p>
                  <details><summary>Recent alert history</summary>
                    <p>Up to five recent changes are shown. A provider reference is not proof of delivery or receipt.</p>
                    {alertHistory === null ? <p className="notice warn">Alert history could not be read; do not assume there were no earlier attempts.</p>
                      : alertHistory.filter((event) => event.review_id === row.review_id).length === 0 ? <p>No recorded alert changes were returned.</p>
                        : <ul>{alertHistory.filter((event) => event.review_id === row.review_id).map((event, index) => <li key={`${event.recorded_at}-${index}`}>
                          {event.recorded_at} · {event.status} · attempt {event.attempts}
                          {event.provider_reference && ` · ${event.provider ?? 'provider'} reference: ${event.provider_reference}`}
                        </li>)}</ul>}
                  </details>
                  <Link href={`/admin/coursework?${new URLSearchParams({ alertReview: row.review_id })}#alert-history`}>Full alert history</Link>
                  {alertStatuses?.find((alert) => alert.review_id === row.review_id)?.status === 'failed' && <form action={retrySafeguardingAlert}>
                    <input type="hidden" name="reviewId" value={row.review_id} />
                    <input type="hidden" name="concernAfter" value={params.concernAfter ?? ''} />
                    <input type="hidden" name="concernAfterId" value={params.concernAfterId ?? ''} />
                    <button type="submit" className="btn">Retry alert</button>
                  </form>}
                  <p className="muted">Recorded {row.reviewed_at} by {row.reviewer_name ?? 'reviewer unavailable'} · File ID: {row.asset_id}</p>
                  <a href={courseworkFileHref(row.asset_id)} target="_blank" rel="noreferrer">Try opening the file</a>
                  {row.details_unavailable && <p className="muted">The original submission or learner details are no longer available.</p>}
                  <form action={acknowledgeConcern}>
                    <input type="hidden" name="reviewId" value={row.review_id} />
                    <input type="hidden" name="concernAfter" value={params.concernAfter ?? ''} />
                    <input type="hidden" name="concernAfterId" value={params.concernAfterId ?? ''} />
                    <button type="submit" className="btn">Record acknowledgement</button>
                  </form>
                </div>
              </li>)}</ul>}
          {params.concernAfter && <p><Link href="/admin/coursework#open-concerns">Back to first open-concern page</Link></p>}
          {nextOpenPage && <p><Link href={nextOpenPage}>More open concerns</Link></p>}
          <h3>Previously acknowledged</h3>
          <p>These remain available for review; reopening returns a concern to the open queue. The audit keeps the acknowledgement and reopening events.</p>
          {history === null ? <p className="notice warn">Acknowledgement history could not be loaded.</p>
            : history.length === 0 ? <p>No items on this history page.</p>
              : <ul className="lessons">{history.map((row) => <li key={row.review_id}>
                <div className="t">
                  <strong>{row.learner_name ?? 'Learner details unavailable'} · {row.course_title ?? 'Course unavailable'}</strong>
                  <p>{row.note}</p>
                  <Link href={`/admin/coursework?${new URLSearchParams({ alertReview: row.review_id })}#alert-history`}>Full alert history</Link>
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

      {summary === null ? <p className="notice warn">The review summary is available only to the configured safeguarding owner, or could not be loaded. Do not assume it is empty.</p> : <section className="card" style={{ marginBottom: '1.5rem' }}>
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

      <div id="review-register" />
      {queueRows === null && <p className="notice warn">The review register is available only to the configured safeguarding owner, or could not be loaded. Do not assume it is empty.</p>}
      {queueRows !== null && queue.length === 0 && (
        <p className="muted">
          No available handed-in files were returned on this page. A missing review record does
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
                  {row.learnerName ?? 'A learner'} · <a href={courseworkFileHref(row.assetId)} target="_blank" rel="noreferrer">{row.fileName ?? 'handed-in file'}</a>
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
                <details><summary>Record another review</summary>
                  <ReviewForm assetId={row.assetId} fileName={row.fileName} />
                </details>
                <RetentionActionForm assetId={row.assetId} action="hold" label="Hold this from deletion" name={row.fileName ?? 'this file'} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {queueRows !== null && <section className="card" style={{ marginBlockStart: '1rem' }}>
        <p>Reviews can move files between pages. Return to the first page to check for changes.</p>
        {params.reviewAfterState && <p><Link href="/admin/coursework#review-register">First page of reviews</Link></p>}
        {reviewNext && <p><Link href={`/admin/coursework?${new URLSearchParams({ reviewAfterState: reviewNext.review === 'none' ? 'unreviewed' : 'reviewed', reviewAfterAt: reviewNext.attachedAt, reviewAfterId: reviewNext.assetId })}#review-register`}>More files</Link></p>}
      </section>}

      <section id="coursework-holds" className="card" style={{ marginBlockStart: '1.5rem' }}>
        <div className="outline-h">
          <h2>
            Held from deletion
            {holdCount ? ` (${holdCount.held})` : ''}
          </h2>
        </div>
        {!canSeeHolds ? (
          <p className="muted">
            The hold register is available only to the configured safeguarding owner,
            or could not be loaded. Do not assume it is empty.
          </p>
        ) : (
          <>
            <p className="muted">{HOLDS_NOTE}</p>
            {holdCount && holdCount.holdingNothing > 0 && (
              <div className="notice warn">
                {holdCount.holdingNothing} of these {holdCount.held === 1 ? 'holds names a file' : 'holds name files'} that
                no longer readable. The hold may still protect stored bytes; review the
                case before releasing it.
              </div>
            )}
            {holds.length === 0 ? (
              <p className="muted">
                No holds were returned on this page.
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
            {params.holdAfter && <p><Link href="/admin/coursework#coursework-holds">First page of holds</Link></p>}
            {holdNext && <p><Link href={`/admin/coursework?${new URLSearchParams({ holdAfter: holdNext.openedAt, holdAfterId: holdNext.assetId })}#coursework-holds`}>More holds</Link></p>}
            <p className="muted">Holds can change while you browse. Return to the first page to check again.</p>
          </>
        )}
      </section>

      {isSafeguardingOwner && <section id="missing-class-ends" className="card" style={{ marginBlockStart: '1rem' }}>
        <h2>Classes without an end date</h2>
        {params.classEnd === 'recorded' && <p role="status">Your class-end attestation was recorded. It may have made coursework due; storage is a separate step.</p>}
        {params.classEnd === 'invalid' && <p className="notice warn" role="alert">Check the UTC date, written reason and confirmation, then try again.</p>}
        {params.classEnd === 'failed' && <p className="notice warn" role="alert">The class end was not recorded. Check that the class is closed, its end is still missing and the date follows its start and join window and is not in the future. Otherwise arrange individual review.</p>}
        <p>For coursework in an open-ended class, the ordinary one-year clock cannot start until an end is recorded. A child-record erasure can still be due sooner, subject to a safeguarding hold.</p>
        {missingCount === null || missingEnds === null ? <p className="notice warn">The missing-end report could not be loaded. Do not assume there are no affected files.</p>
          : <>
            <p>{missingCount} file{missingCount === 1 ? '' : 's'} have no ordinary deadline because their class has no recorded end. The list shows up to 100 classes per page.</p>
            {missingEnds.length > 0 && <ul className="lessons">{missingEnds.map((item) => <li key={item.cohortId}>
              <div className="t"><strong>{item.courseTitle} · {item.cohortTitle}</strong>
                <p>{item.files} file{item.files === 1 ? '' : 's'} · {item.status} · Scheduled start {new Date(item.startsAt).toISOString()} · Join window closes {new Date(item.joinClosesAt).toISOString()}</p>
                {item.status === 'closed' ? <details>
                  <summary>Record a verified class end</summary>
                  <p>Use the actual end, not the date the class was closed in the system. Enter UTC. This one-time attestation can make files immediately due for cleanup; it is not proof of the date. If unsure, do not submit.</p>
                  <form action={attestClassEnd}>
                    <input type="hidden" name="cohortId" value={item.cohortId} />
                    <label htmlFor={`end-${item.cohortId}`}>Verified end date and time (UTC)</label>
                    <input id={`end-${item.cohortId}`} type="datetime-local" name="endsAt" required />
                    <label htmlFor={`reason-end-${item.cohortId}`}>How was this verified?</label>
                    <textarea id={`reason-end-${item.cohortId}`} name="reason" required minLength={3} maxLength={1000} />
                    <label><input type="checkbox" name="verified" value="yes" required /> I verified this date and understand coursework may become due.</label>
                    <button className="btn" type="submit">Record my attestation</button>
                  </form>
                </details> : <p className="muted">Only a closed class can receive an end attestation here. Other cases need individual review.</p>}
              </div>
            </li>)}</ul>}
            {params.endsAfter && <p><Link href="/admin/coursework#missing-class-ends">First page of classes</Link></p>}
            {missingEnds.length === 100 && <p><Link href={`/admin/coursework?${new URLSearchParams({ endsAfter: missingEnds[missingEnds.length - 1]!.cohortId })}#missing-class-ends`}>More classes</Link></p>}
            <p className="muted">This records an owner attestation, not independent proof. Existing end dates and other cases cannot be edited here; arrange individual review.</p>
          </>}
      </section>}

      {!canSeeStorage && (
        <p className="notice warn">The storage register is available only to the configured safeguarding owner, or could not be loaded. Do not assume it is empty.</p>
      )}
      {canSeeStorage && (
        <section id="storage-queue" className="card" style={{ marginBlockStart: '1rem' }}>
          <div className="outline-h">
            <h2>Handed-in files waiting in storage</h2>
          </div>
          <p className="muted">{PURGE_NOTE}</p>
          {storage.length === 0 ? (
            <p className="muted">
              No entries were returned on this page. Any recorded deletions are statements by the
              owner, not independent proof that storage bytes are gone.
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
                    label="Record my deletion statement"
                    name={row.displayName}
                  />
                </li>
              ))}
            </ul>
          )}
          {params.storageAfter && <p><Link href="/admin/coursework#storage-queue">First page of storage entries</Link></p>}
          {storageNext && <p><Link href={`/admin/coursework?${new URLSearchParams({ storageAfter: storageNext.sortAt, storageAfterId: storageNext.assetId })}#storage-queue`}>More storage entries</Link></p>}
          <p className="muted">Entries can move between pages when a hold or deletion statement changes. Return to the first page to check again.</p>
        </section>
      )}

      <p className="muted" style={{ fontSize: '0.9rem', marginBlockStart: '1.5rem' }}>
        A file may become due for tombstoning a year after the class ends, or
        thirty days after a learner&rsquo;s record is erased where that is sooner.
        Storage deletion is a separate, unverified statement. A review can remain
        after the file, but it is a statement, not proof of a view.
      </p>
    </div>
  );
}
