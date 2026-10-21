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
  params,
}: {
  params: Promise<{ caseNumber: string }>;
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

  return (
    <main className="page narrow">
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

      {isStaff && <CaseHistory caseId={supportCaseRow.id} />}

      <CaseActions
        caseId={supportCaseRow.id}
        status={supportCaseRow.status}
        priority={supportCaseRow.priority}
        assignedTo={supportCaseRow.assignedTo}
        isStaff={isStaff}
        myUserId={user.id}
      />
    </main>
  );
}
