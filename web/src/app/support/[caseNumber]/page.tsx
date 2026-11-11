import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  CATEGORY_LABEL,
  fetchCaseByNumber,
  PRIORITY_LABEL,
  STATUS_LABEL,
} from '@/lib/support';
import { CaseActions } from './case-actions';
import { CaseHistory } from './case-history';
import { parseSupportCleanupHoldStatus, parseSupportCleanupHoldHistory, SUPPORT_HOLD_ID } from '@/lib/support-case-cleanup-hold';
import { changeCleanupHold } from './cleanup-hold-action';

export const metadata = { title: 'Support request' };
export const dynamic = 'force-dynamic';

/**
 * One support case, by its human reference.
 *
 * The same page serves the person who asked and the person answering, because
 * the difference between the two views is decided by the database rather than
 * by this file: row level security hides a case from anyone who is not its
 * requester or staff, and hides internal notes from the requester. What is
 * rendered here is whatever came back.
 *
 * That is why there is no `where requested_by = user.id` filter below. Adding
 * one would not make the page safer — RLS already is — and it would break the
 * staff queue, which links here.
 *
 * One part is not the same for both seats: the history panel below is mounted for
 * staff only. It reads tables the requester cannot see, through a function that
 * refuses anybody who is not staff, so showing it to a requester would render an
 * error where their conversation should be.
 */
export default async function SupportCasePage({
  params, searchParams,
}: {
  params: Promise<{ caseNumber: string }>;
  searchParams: Promise<{ cleanupHold?: string; holdEventAfter?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { caseNumber } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/support/${caseNumber}`);

  const found = await fetchCaseByNumber(supabase, { caseNumber, myUserId: user.id });
  // Not a permission statement so much as a factual one: RLS makes somebody
  // else's case indistinguishable from a case that does not exist, and both
  // should land on the same page.
  if (!found) notFound();

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  const isStaff = privileged === true;

  const { supportCase: supportCaseRow, messages } = found;
  const open = supportCaseRow.status !== 'closed';
  const query = await searchParams;
  const result = query.cleanupHold;
  const ownerResult = isStaff ? await supabase.rpc('safeguarding_owner_status') : null;
  const owner = !ownerResult?.error && ownerResult?.data?.is_owner === true;
  const holdResult = owner ? await supabase.rpc('support_case_cleanup_hold_status', { p_case_id: supportCaseRow.id }) : null;
  const hold = holdResult && !holdResult.error ? parseSupportCleanupHoldStatus(holdResult.data) : null;
  const eventCursorValid = !query.holdEventAfter || SUPPORT_HOLD_ID.test(query.holdEventAfter);
  const eventResult = owner && eventCursorValid ? await supabase.rpc('support_case_cleanup_hold_history', {
    p_case_id: supportCaseRow.id, p_after: query.holdEventAfter ?? null, p_limit: 51,
  }) : null;
  const events = eventResult && !eventResult.error ? parseSupportCleanupHoldHistory(eventResult.data) : null;
  const eventNext = events && events.length > 50 ? events[49]?.id : null;

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/support">Help</Link>
        <span aria-hidden>›</span>
        <span>{supportCaseRow.caseNumber}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">
          {supportCaseRow.caseNumber} · {CATEGORY_LABEL[supportCaseRow.category] ?? supportCaseRow.category}
          {' · opened '}
          {new Date(supportCaseRow.createdAt).toLocaleDateString()}
          {isStaff ? ` · priority ${PRIORITY_LABEL[supportCaseRow.priority] ?? supportCaseRow.priority}` : ''}
        </p>
        <h1>{supportCaseRow.subject}</h1>
        <div className="row" style={{ gap: '0.5rem', marginTop: '0.75rem' }}>
          <span
            className={`badge ${
              supportCaseRow.status === 'resolved'
                ? 'ok'
                : supportCaseRow.status === 'closed'
                  ? 'neutral'
                  : 'warn'
            }`}
          >
            {STATUS_LABEL[supportCaseRow.status] ?? supportCaseRow.status}
          </span>
          {isStaff && supportCaseRow.assigneeName && (
            <span className="badge neutral">With {supportCaseRow.assigneeName}</span>
          )}
        </div>
      </div>

      {supportCaseRow.status === 'resolved' && supportCaseRow.resolutionNote && (
        <section className="card">
          <h2>How this was resolved</h2>
          <p>{supportCaseRow.resolutionNote}</p>
          <p className="muted" style={{ marginBottom: 0 }}>
            If this did not fix it, reply below and the request reopens.
          </p>
        </section>
      )}

      {supportCaseRow.status === 'closed' && supportCaseRow.closeReason && (
        <section className="card">
          <h2>Closed</h2>
          <p className="muted">{supportCaseRow.closeReason}</p>
        </section>
      )}

      <section className="card">
        <h2>Conversation</h2>

        <ol className="lessons" style={{ alignItems: 'flex-start' }}>
          <li style={{ display: 'grid', gap: '0.25rem', width: '100%' }}>
            <span className="t">{supportCaseRow.body}</span>
            <span className="muted">
              {supportCaseRow.requesterName ?? 'You'} ·{' '}
              {new Date(supportCaseRow.createdAt).toLocaleString()}
            </span>
          </li>

          {messages.map((m) => (
            <li key={m.id} style={{ display: 'grid', gap: '0.25rem', width: '100%' }}>
              <span className="t">{m.body}</span>
              <span className="muted">
                {m.authorIsMe
                  ? 'You'
                  : m.authorIsStaff
                    ? (m.authorName ?? 'AyahSpring support')
                    : (m.authorName ?? 'You')}
                {' · '}
                {new Date(m.createdAt).toLocaleString()}
              </span>
              {m.isInternal && (
                <span className="badge neutral" style={{ justifySelf: 'start' }}>
                  Internal note — not visible to the requester
                </span>
              )}
            </li>
          ))}
        </ol>

        {!open && (
          <p className="muted">
            This request is closed. If you still need help,{' '}
            <Link href="/support">open a new one</Link>.
          </p>
        )}
      </section>

      {owner && <section id="cleanup-hold" className="card">
        <h2>Pause scheduled case cleanup</h2>
        <p className="muted">Owner only. This pauses scheduled deletion and defers account-closure erasure of this case and its messages. Existing support access still applies. It cannot restore erased information or protect against every other deletion path or loss of external copies. Review the concern separately.</p>
        <p className="muted"><Link href="/admin/retention#support-case-holds">View paused cases</Link>. Reasons are kept privately after release; avoid names and sensitive details.</p>
        {result === 'held' && <p role="status">Scheduled cleanup was paused.</p>}
        {result === 'released' && <p role="status">The pause was released. Any deferred account-closure erasure was applied; if the case is due, cleanup may remove it immediately.</p>}
        {result === 'already' && <p role="status">No change was needed; check the current status.</p>}
        {result === 'uncertain' && <p className="notice warn" role="alert">The action could not be confirmed. Refresh and check the current status before trying again.</p>}
        {result === 'invalid' && <p className="notice warn" role="alert">Confirm the action and give a reason.</p>}
        <h3>Pause history</h3>
        <p className="muted">Entries are ordered by event ID, not by date. New entries can appear on an earlier page, so return to the first page to check again. History for a case that has since been deleted is retained privately but is not displayed here.</p>
        {events === null ? <p className="notice warn">History could not be loaded; do not assume there were no earlier actions.</p>
          : events.length === 0 ? <p className="muted">No history was returned on this page.</p>
          : <ul className="lessons">{events.slice(0, 50).map((event) => <li key={event.id}>
            <span className="t">{event.action === 'held' ? 'Paused' : 'Released'} · {new Date(event.occurredAt).toLocaleString()}<br /><span className="muted">{event.reason}</span></span>
          </li>)}</ul>}
        {query.holdEventAfter && <p><Link href={`/support/${supportCaseRow.caseNumber}#cleanup-hold`}>First history page</Link></p>}
        {eventNext && <p><Link href={`/support/${supportCaseRow.caseNumber}?${new URLSearchParams({ holdEventAfter: eventNext })}#cleanup-hold`}>More history</Link></p>}
        {hold === null ? <p className="notice warn">The pause status could not be loaded. Do not assume the case is protected.</p> : <>
          <p>{hold.held ? 'Scheduled cleanup is paused for this case.' : 'Scheduled cleanup is not paused for this case.'}</p>
          {hold.held && <p className="muted">Reason: {hold.reason}</p>}
          <form action={changeCleanupHold} style={{ display: 'grid', gap: '.5rem' }}>
            <input type="hidden" name="caseId" value={supportCaseRow.id} />
            <input type="hidden" name="caseNumber" value={supportCaseRow.caseNumber} />
            <input type="hidden" name="action" value={hold.held ? 'release' : 'hold'} />
            <label>Reason <textarea name="reason" required minLength={3} maxLength={1000} rows={2} /></label>
            <label><input type="checkbox" name="reviewed" value="yes" required /> I understand releasing this pause applies deferred account-closure and child-link erasure immediately and may allow scheduled deletion.</label>
            <button className="btn ghost" type="submit">{hold.held ? 'Release cleanup pause' : 'Pause scheduled cleanup'}</button>
          </form>
        </>}
      </section>}

      {isStaff && <CaseHistory caseId={supportCaseRow.id} />}

      <CaseActions
        caseId={supportCaseRow.id}
        status={supportCaseRow.status}
        priority={supportCaseRow.priority}
        assignedTo={supportCaseRow.assignedTo}
        isStaff={isStaff}
        myUserId={user.id}
      />
    </div>
  );
}
