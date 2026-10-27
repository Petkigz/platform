import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  EVIDENCE_NOTE,
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
export default async function AdminGuardiansPage() {
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

      <p className="lede">{registerHeadline(register)}</p>

      {enforcementNote(register.enforced) && (
        <div className="notice warn">{enforcementNote(register.enforced)}</div>
      )}

      <div className="notice info">{policyLine(register.policyInForce)}</div>

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
