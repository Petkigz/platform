import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  CHECKLIST_DOC,
  EVIDENCE_NOTE,
  REVIEWER_CHECKLIST,
  dayLabel,
  daysUntil,
  enforcementNote,
  guardianConsentRegister,
  methodLabel,
  policyLine,
  registerHeadline,
  relationshipLabel,
} from '@/lib/guardian-consent';
import { DecideForm } from './decide-form';
import { ReconcileForm } from './reconcile-form';
import { RecordChildRemoval } from './record-child-removal';
import { ReconcileErasure } from './reconcile-erasure';
import { BlockChildDatabase } from './block-child-database';
import { parseChildLoginPendingAttempts, parseChildLoginRemovalTasks, parseChildLoginErasureRecovery, parseChildLoginLegacyErasure, queuePageNumber } from '@/lib/child-login-queue';

export const dynamic = 'force-dynamic';

/**
 * The consent queue.
 *
 * This page's absence was the original defect: a parent could ask, and nobody
 * could see the asking. What it shows now is the whole loop — the statement in
 * the parent's own words, the method, whether evidence exists (never what it
 * is), how long the request has waited, and every live consent with its expiry
 * so a lapse is visible before it happens rather than after.
 *
 * It is deliberately not hidden when the flag is off. The flag decides whether a
 * lapse bites, not whether a review can happen; a queue that only works once
 * enforcement is on would make enforcement impossible to prepare for.
 */
type QueuePageKey = 'attemptPage' | 'removalPage' | 'recoveryPage' | 'legacyPage';
type QueuePages = Record<QueuePageKey, number>;

function QueueNavigation({ pageKey, pages, hasMore }: { pageKey: QueuePageKey; pages: QueuePages; hasMore: boolean }) {
  function href(page: number) {
    const params = new URLSearchParams();
    for (const key of ['attemptPage', 'removalPage', 'recoveryPage', 'legacyPage'] as const) {
      const value = key === pageKey ? page : pages[key];
      if (value > 0) params.set(key, String(value));
    }
    return `/admin/guardians?${params.toString()}`;
  }
  return <nav className="row" aria-label="Queue pages" style={{ gap: '0.75rem' }}>
    {pages[pageKey] > 0 && <Link href={href(pages[pageKey] - 1)}>Previous</Link>}
    <span>Page {pages[pageKey] + 1}</span>
    {hasMore && <Link href={href(pages[pageKey] + 1)}>Next</Link>}
  </nav>;
}

export default async function AdminGuardiansPage({ searchParams }: {
  searchParams: Promise<Partial<Record<QueuePageKey, string | string[]>>>;
}) {
  const query = await searchParams;
  const pages: QueuePages = {
    attemptPage: queuePageNumber(query.attemptPage), removalPage: queuePageNumber(query.removalPage),
    recoveryPage: queuePageNumber(query.recoveryPage), legacyPage: queuePageNumber(query.legacyPage),
  };
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/guardians');

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) redirect('/');

  // `is_privileged` is broader than the right to decide: support and finance
  // staff are privileged and must not read a parent's statement or a child's
  // name. The database says who may decide, and this page asks it rather than
  // re-deriving the answer from a role list that could drift.
  const { data: canDecide } = await supabase.rpc('can_decide_guardian_consent', {
    p_user_id: user.id,
  });

  if (canDecide !== true) {
    return (
      <div className="page">
        <nav className="crumbs">
          <Link href="/admin">Admin</Link>
          <span aria-hidden>›</span>
          <span>Guardian consent</span>
        </nav>
        <div className="page-head">
          <p className="eyebrow">Governance</p>
          <h1>Guardian consent</h1>
        </div>
        <div className="notice warn">
          Deciding a guardian consent belongs to governance staff and the owner.
          Your role can administer the platform and cannot read a parent&rsquo;s
          statement or decide this.
        </div>
      </div>
    );
  }

  const register = await guardianConsentRegister(supabase);
  const ownerStatus = await supabase.rpc('safeguarding_owner_status');
  const owner = !ownerStatus.error && ownerStatus.data?.is_owner === true;
  const attemptsResult = owner ? await supabase.rpc('child_login_pending_attempts_page', { p_limit: 51, p_offset: pages.attemptPage * 50 }) : null;
  const attempts = attemptsResult && !attemptsResult.error
    ? parseChildLoginPendingAttempts(attemptsResult.data) : null;
  const removalResult = owner ? await supabase.rpc('child_login_removal_queue_page', { p_limit: 51, p_offset: pages.removalPage * 50 }) : null;
  const removals = removalResult && !removalResult.error
    ? parseChildLoginRemovalTasks(removalResult.data) : null;
  const blockResult = owner && removals ? await supabase.rpc('child_login_database_block_status', { p_tasks: removals.slice(0, 50).map((row) => row.task_id) }) : null;
  const blockRows = blockResult && !blockResult.error && Array.isArray(blockResult.data)
    ? blockResult.data as { task_id: string; blocked: boolean }[] : null;
  const erasureResult = owner ? await supabase.rpc('child_login_erasure_recovery_queue_page', { p_limit: 51, p_offset: pages.recoveryPage * 50 }) : null;
  const erasureRecovery = erasureResult && !erasureResult.error
    ? parseChildLoginErasureRecovery(erasureResult.data) : null;
  const legacyResult = owner ? await supabase.rpc('child_login_legacy_erasure_queue_page', { p_limit: 51, p_offset: pages.legacyPage * 50 }) : null;
  const legacyErasure = legacyResult && !legacyResult.error
    ? parseChildLoginLegacyErasure(legacyResult.data) : null;

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Guardian consent</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Governance</p>
        <h1>Guardian consent</h1>
        <p className="muted">
          Adults asking to be recognised as a child&rsquo;s parent or guardian.
          This is verifiable parental consent, so a decision here is a legal
          record: it carries the method, the reason, and how long it lasts.
        </p>
      </div>

      <div className="stats">
        <div>
          <div className="n">{register.counts.waiting}</div>
          <div className="l">Waiting</div>
        </div>
        <div>
          <div className="n">{register.counts.active}</div>
          <div className="l">Live consents</div>
        </div>
        <div>
          <div className="n">{register.counts.lapsed}</div>
          <div className="l">Lapsed</div>
        </div>
        <div>
          <div className="n">{register.counts.noExpiry}</div>
          <div className="l">Without an expiry</div>
        </div>
        <div>
          <div className="n">{register.counts.children}</div>
          <div className="l">Children on the platform</div>
        </div>
      </div>

      {owner && (
        <section className="card">
          <h2>Pending child-login attempts</h2>
          <p className="muted">Queues can change while you browse. Refresh and revisit earlier pages after processing cases.</p>
          <p className="muted">Private to the named safeguarding owner. Pending attempts are shown 50 per page. A marked identity is not proof
            that it is linked or that other provider copies or sessions are gone; do not delete or
            release an attempt based on this list alone.</p>
          {attempts === null ? <p className="notice warn">The attempt register could not be read.</p>
            : attempts.length === 0 ? <p className="muted">No pending attempts are listed.</p>
            : <ul>{attempts.slice(0, 50).map((attempt) => (
              <li key={attempt.attempt_id}>
                {attempt.learner_name} — guardian {attempt.guardian_name}; username {attempt.username};
                {' '}started {dayLabel(attempt.created_at)}; {attempt.marked_identity_present
                  ? 'a marked identity appears in the authentication table'
                  : 'no matching marked identity appears in the authentication table'}.
                {attempt.marked_identity_present && <ReconcileForm attemptId={attempt.attempt_id} />}
              </li>
            ))}</ul>}
          {attempts !== null && <QueueNavigation pageKey="attemptPage" pages={pages} hasMore={attempts.length > 50} />}
          <p className="muted">Completion links only the existing marked identity after rechecking guardian permission.
            It does not reset the password, create another identity or remove one. Cases without a
            matching identity still need individual review.</p>
        </section>
      )}

      {owner && <section className="card">
        <h2>Child sign-ins awaiting removal</h2>
        <p className="muted">Private to the named safeguarding owner. Detachment keeps lessons and
          progress but does not remove the sign-in. Tasks are shown 50 per page. Review the exact
          identity in Supabase Authentication before any deletion; a missing marker, especially on
          an older login, requires individual investigation. Removing an identity is currently manual.
          This list does not prove that issued sessions or external copies are gone.</p>
        {removals === null ? <p className="notice warn">The removal register could not be read.</p>
          : removals.length === 0 ? <p className="muted">No identity-removal tasks are listed.</p>
          : <ul>{removals.slice(0, 50).map((task) => <li key={task.task_id}>
            {task.learner_name} — username {task.username}; identity ID <code>{task.child_user_id}</code>;
            {' '}started {dayLabel(task.created_at)}. {task.identity_present
              ? task.marker_matches ? 'Identity present with matching trusted marker.' : 'An identity is present, but the original ID and marker do not match: investigate before acting.'
              : 'The original ID and any identity with the matching marker are absent from the authentication table.'}
            {blockRows === null ? <p className="notice warn">Database block status is unavailable.</p>
              : blockRows.find((row) => row.task_id === task.task_id)?.blocked === true
                ? <p className="muted">This identity is blocked on database paths using the identity helper; provider sessions and other paths are not confirmed revoked.</p>
                : <p className="notice warn">No database-helper block is confirmed for this identity. Review it individually.</p>}
            {blockRows !== null && blockRows.find((row) => row.task_id === task.task_id)?.blocked === false
              && task.marker_matches && <BlockChildDatabase taskId={task.task_id} />}
            {!task.identity_present && <RecordChildRemoval taskId={task.task_id} />}
          </li>)}</ul>}
        {removals !== null && <QueueNavigation pageKey="removalPage" pages={pages} hasMore={removals.length > 50} />}
      </section>}

      {owner && <section className="card">
        <h2>Sign-in recovery after child-record erasure</h2>
        <p className="muted">Private to the named safeguarding owner. Recovery markers are shown 50 per page without child or guardian names. A fingerprint and provider IDs are still
          personal data. An absent identity may appear later if a provider request was in flight;
          this screen neither removes the sign-in nor proves sessions or provider copies are gone.
          Legacy identities without a trusted marker need individual review.</p>
        {erasureRecovery === null ? <p className="notice warn">The erasure recovery register could not be read.</p>
          : erasureRecovery.length === 0 ? <p className="muted">No recovery markers are listed.</p>
          : <ul>{erasureRecovery.slice(0, 50).map((item) => <li key={`${item.source_kind}:${item.source_id}`}>
            Recovery marker <code>{item.source_id}</code>, {dayLabel(item.created_at)};{' '}
            {item.identity_present ? item.trusted_marker_matches
              ? 'a trusted matching identity is present.' : 'an identity is present but not verified by a marker: review it individually.'
              : 'no matching identity currently appears; an in-flight request may still finish.'}
            {item.matched_identity_ids.length > 0 && <span> Authentication ID(s):{' '}
              {item.matched_identity_ids.map((id) => <code key={id}>{id} </code>)}.</span>}
          </li>)}</ul>}
        {erasureRecovery !== null && <QueueNavigation pageKey="recoveryPage" pages={pages} hasMore={erasureRecovery.length > 50} />}
      </section>}

      {owner && <section className="card">
        <h2>Old child records needing login-link cleanup</h2>
        <p className="muted">Private to the named safeguarding owner. Already-erased records are shown 50 per page without names. Cleanup retains pseudonymous evidence for provider
          recovery; it does not remove an authentication identity or revoke sessions. A safeguarding
          hold prevents cleanup.</p>
        {legacyErasure === null ? <p className="notice warn">The old-record register could not be read.</p>
          : legacyErasure.length === 0 ? <p className="muted">No old login links are listed.</p>
          : <ul>{legacyErasure.slice(0, 50).map((item) => <li key={item.learner_id}>
            Record <code>{item.learner_id}</code>: {item.attempt_count} attempt(s),{' '}
            {item.removal_task_count} removal task(s). {item.coursework_held
              ? 'A safeguarding hold prevents cleanup.' : <ReconcileErasure learnerId={item.learner_id} />}
          </li>)}</ul>}
        {legacyErasure !== null && <QueueNavigation pageKey="legacyPage" pages={pages} hasMore={legacyErasure.length > 50} />}
      </section>}

      <p className="lede">{registerHeadline(register)}</p>

      {enforcementNote(register.enforced) && (
        <div className="notice warn">{enforcementNote(register.enforced)}</div>
      )}

      <div className="notice info">{policyLine(register.policyInForce)}</div>

      {/* The standard, on the page where the decision is made. A queue that says
          "decide" and never says to what standard is how two reviewers give two
          answers to the same request — and the person deciding here is often the
          owner, at a screen, at night. */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>What a reviewer is checking</h2>
        <p className="muted">
          Read every request within two working days. A request that waits is a
          child who cannot start, and the queue is short by design.
        </p>
        <ol>
          {REVIEWER_CHECKLIST.map((step) => (
            <li key={step.title}>
              <strong>{step.title}.</strong> {step.body}
            </li>
          ))}
        </ol>
        <p className="muted">
          The long form, with the reasons behind each line, is{' '}
          <code>{CHECKLIST_DOC}</code> in the repository. A test keeps this list and
          that document saying the same nine things.
        </p>
      </section>

      <section className="section-sm">
        <h2>Waiting for a decision</h2>
        {register.waiting.length === 0 ? (
          <p className="muted">Nothing is waiting.</p>
        ) : (
          register.waiting.map((item) => (
            <section className="card" key={item.caseId}>
              <h2>
                {item.childName}
                <span className="muted">
                  {item.ageBand ? ` · age ${item.ageBand}` : ''}
                </span>
              </h2>
              <p className="muted">
                Asked by <strong>{item.guardianName}</strong> as{' '}
                {relationshipLabel(item.relationshipType)} ·{' '}
                {methodLabel(item.method)} ·{' '}
                {item.waitingDays === 0
                  ? 'today'
                  : `${item.waitingDays} ${item.waitingDays === 1 ? 'day' : 'days'} ago`}
              </p>
              <blockquote className="card">
                <p>&ldquo;{item.statement}&rdquo;</p>
              </blockquote>
              <ul className="lessons">
                <li>
                  <span className="t">Evidence</span>
                  <span className="muted">
                    {item.referenceGiven
                      ? 'a reference was supplied — it is write-only and cannot be shown'
                      : 'none supplied'}
                  </span>
                </li>
                <li>
                  <span className="t">State</span>
                  <span className="muted">
                    {item.status === 'needs_information'
                      ? 'asked for more information'
                      : item.status}
                  </span>
                </li>
              </ul>
              {item.note && <p className="muted">Last note: {item.note}</p>}
              <DecideForm caseId={item.caseId} />
            </section>
          ))
        )}
        <p className="muted">{EVIDENCE_NOTE}</p>
      </section>

      <section className="section-sm">
        <h2>Live consents</h2>
        {register.active.length === 0 ? (
          <p className="muted">No consent is live.</p>
        ) : (
          <div className="scroll-x">
            <table className="lessons">
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Guardian</th>
                  <th>How</th>
                  <th>Verified</th>
                  <th>Lapses</th>
                  <th>State</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {register.active.map((row) => {
                  const days = daysUntil(row.expiresAt);
                  const state = row.lapsed
                    ? 'lapsed'
                    : row.noExpiry
                      ? 'no expiry'
                      : days !== null && days <= 30
                        ? `lapses in ${days} d`
                        : 'current';
                  return (
                    <tr key={row.relationshipId}>
                      <td>{row.childName}</td>
                      <td>{row.guardianName}</td>
                      <td>{methodLabel(row.method)}</td>
                      <td>{dayLabel(row.verifiedAt) ?? '—'}</td>
                      <td>{dayLabel(row.expiresAt) ?? 'none'}</td>
                      <td>
                        <span className={`badge ${row.lapsed ? 'neutral' : 'ok'}`}>
                          {state}
                        </span>
                        {row.policyChanged && (
                          <span className="muted"> · policy changed</span>
                        )}
                      </td>
                      <td>
                        {[
                          row.canViewProgress && 'progress',
                          row.canManageLearning && 'learning',
                        ]
                          .filter(Boolean)
                          .join(', ') || 'none'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="muted">
        A lapse pauses access and deletes nothing. A withdrawal clears the
        permissions and records the parent&rsquo;s reason. Neither is a
        rejection, and none of the three touches the child&rsquo;s work.
      </p>
    </div>
  );
}
