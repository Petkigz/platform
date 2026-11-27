import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRIORITY_LABEL, type SupportCase } from '@/lib/support';
import { parseSupportCleanupHoldStatus, parseSupportCleanupHoldHistory, parseSupportHeldVersions, SUPPORT_HOLD_ID } from '@/lib/support-case-cleanup-hold';
import { CaseHistory } from './case-history';
import { changeCleanupHold } from './cleanup-hold-action';
import { StaffCaseActions } from './staff-case-actions';

/**
 * What staff alone are shown under a support case.
 *
 * Moved out of the page on 2026-11-27, unchanged, when the page itself was put
 * into the reader's language: the priority and who holds the case, the owner's
 * pause on scheduled cleanup, the history panel, and the form that answers,
 * triages, resolves and closes. **All of it is in English**, as every staff
 * page is, and the block says so (`lang="en"`), so a member of staff whose own
 * pages are in Arabic gets this part left to right and read out as English.
 *
 * The page mounts this only for somebody `is_privileged` says is staff. The
 * functions below refuse anybody else whatever the page does.
 */
export async function StaffPanel({
  supabase, supportCaseRow, myUserId, query,
}: {
  supabase: SupabaseClient;
  supportCaseRow: SupportCase;
  myUserId: string;
  query: { cleanupHold?: string; holdEventAfter?: string; heldVersionAfter?: string };
}) {
  const result = query.cleanupHold;
  const ownerResult = await supabase.rpc('safeguarding_owner_status');
  const owner = !ownerResult?.error && ownerResult?.data?.is_owner === true;
  const holdResult = owner ? await supabase.rpc('support_case_cleanup_hold_status', { p_case_id: supportCaseRow.id }) : null;
  const hold = holdResult && !holdResult.error ? parseSupportCleanupHoldStatus(holdResult.data) : null;
  const eventCursorValid = !query.holdEventAfter || SUPPORT_HOLD_ID.test(query.holdEventAfter);
  const eventResult = owner && eventCursorValid ? await supabase.rpc('support_case_cleanup_hold_history', {
    p_case_id: supportCaseRow.id, p_after: query.holdEventAfter ?? null, p_limit: 51,
  }) : null;
  const events = eventResult && !eventResult.error ? parseSupportCleanupHoldHistory(eventResult.data) : null;
  const eventNext = events && events.length > 50 ? events[49]?.id : null;
  const versionCursorValid = !query.heldVersionAfter || SUPPORT_HOLD_ID.test(query.heldVersionAfter);
  const versionResult = owner && hold?.held && versionCursorValid ? await supabase.rpc('support_case_held_version_page', {
    p_case_id: supportCaseRow.id, p_after: query.heldVersionAfter ?? null, p_limit: 21,
  }) : null;
  const versions = versionResult && !versionResult.error ? parseSupportHeldVersions(versionResult.data) : null;
  const versionNext = versions && versions.length > 20 ? versions[19]?.id : null;


  return (
    <div className="support-staff" lang="en" dir="ltr" data-support-staff>
      <p className="eyebrow">
        Staff · priority {PRIORITY_LABEL[supportCaseRow.priority] ?? supportCaseRow.priority}
        {supportCaseRow.assigneeName ? <> · with <bdi>{supportCaseRow.assigneeName}</bdi></> : null}
      </p>

      {owner && <section id="cleanup-hold" className="card">
        <h2>Pause scheduled case cleanup</h2>
        <p className="muted">Owner only. This pauses scheduled deletion and defers account-closure erasure of this case and its messages. Existing support access still applies. It cannot restore erased information or protect against every other deletion path or loss of external copies. Review the concern separately.</p>
        <p className="muted"><Link href="/admin/retention#support-case-holds">View paused cases</Link>. Reasons are kept privately after release; avoid names and sensitive details.</p>
        {result === 'held' && <p role="status">Scheduled cleanup was paused.</p>}
        {result === 'released' && <p role="status">The pause was released. Any deferred account-closure erasure was applied; if the case is due, cleanup may remove it immediately.</p>}
        {result === 'already' && <p role="status">No change was needed; check the current status.</p>}
        {result === 'uncertain' && <p className="notice warn" role="alert">The action could not be confirmed. Refresh and check the current status before trying again.</p>}
        {result === 'invalid' && <p className="notice warn" role="alert">Confirm the action and give a reason.</p>}
        {hold?.held && <section aria-label="Saved prior versions">
          <h3>Saved prior versions</h3>
          <p className="muted">Private to the safeguarding owner. When a held case or message is edited, its previous version is saved here. The current conversation is above. Versions are erased on release; review the evidence before releasing. Earlier losses and outside copies cannot be restored. Entries are ordered by ID, not date; check the first page again for new entries.</p>
          {versions === null ? <p className="notice warn">Saved versions could not be loaded. Do not assume there are none.</p>
            : versions.length === 0 ? <p className="muted">No prior versions were returned on this page.</p>
            : versions.slice(0,20).map(version => <details key={version.id}>
              <summary>{version.sourceKind === 'case' ? 'Case' : 'Message'} · saved {new Date(version.capturedAt).toLocaleString()}</summary>
              <dl>{Object.entries(version.content).map(([key,value]) => <div key={key}>
                <dt>{key.replaceAll('_',' ')}</dt><dd style={{overflowWrap:'anywhere',whiteSpace:'pre-wrap'}}>{value === null ? '—' : typeof value === 'string' ? value : JSON.stringify(value)}</dd>
              </div>)}</dl>
            </details>)}
          {query.heldVersionAfter && <p><Link href={`/support/${supportCaseRow.caseNumber}#cleanup-hold`}>First versions page</Link></p>}
          {versionNext && <p><Link href={`/support/${supportCaseRow.caseNumber}?${new URLSearchParams({ heldVersionAfter: versionNext })}#cleanup-hold`}>More prior versions</Link></p>}
        </section>}
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
            <label><input type="checkbox" name="reviewed" value="yes" required /> I understand releasing this pause deletes saved prior versions, applies deferred account-closure and child-link erasure immediately and may allow scheduled deletion.</label>
            <button className="btn ghost" type="submit">{hold.held ? 'Release cleanup pause' : 'Pause scheduled cleanup'}</button>
          </form>
        </>}
      </section>}

      <CaseHistory caseId={supportCaseRow.id} />

      <StaffCaseActions
        caseId={supportCaseRow.id}
        status={supportCaseRow.status}
        priority={supportCaseRow.priority}
        assignedTo={supportCaseRow.assignedTo}
        myUserId={myUserId}
      />
    </div>
  );
}
