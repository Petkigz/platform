import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { CATEGORY_LABEL, fetchSupportQueue, PRIORITY_LABEL, STATUS_LABEL } from '@/lib/support';
import { ClaimButton } from './claim-button';

export const metadata = { title: 'Support queue' };
export const dynamic = 'force-dynamic';

/**
 * The support queue.
 *
 * Oldest first, not by priority: a queue sorted by priority alone buries
 * anything nobody thought to escalate, and the person who has waited longest is
 * usually the one who most needs an answer. Priority is shown, not sorted on.
 *
 * Triaging happens on the case page, which staff reach by the same route a
 * requester does. One thread view rather than two is deliberate — a staff-only
 * copy of a conversation is how an answer ends up written somewhere the person
 * waiting for it cannot see.
 */
export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/support');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const { scope: scopeParam } = await searchParams;
  const scope = scopeParam === 'all' ? 'all' : 'unresolved';
  const [accepting, cases] = await Promise.all([
    isFlagEnabled(supabase, 'platform.support').catch(() => false),
    fetchSupportQueue(supabase, { scope }),
  ]);

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Support</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Help desk</p>
        <h1>Support requests</h1>
        <p className="muted">
          Every reply is written to the audit trail with who sent it. Internal
          notes are visible to staff only and never to the person who asked.
        </p>
      </div>

      {!accepting && (
        <div className="notice warn">
          <code>platform.support</code> is off, so no new requests can be opened.
          These cases are still live: answer and close them here.
        </div>
      )}

      <div className="row" style={{ gap: '0.5rem', margin: '1rem 0' }}>
        <Link className={`btn ${scope === 'unresolved' ? '' : 'ghost'}`} href="/admin/support">
          Unresolved ({scope === 'unresolved' ? cases.length : '—'})
        </Link>
        <Link className={`btn ${scope === 'all' ? '' : 'ghost'}`} href="/admin/support?scope=all">
          Everything
        </Link>
      </div>

      {cases.length === 0 ? (
        <p className="muted">
          {scope === 'unresolved'
            ? 'Nothing is waiting on an answer.'
            : 'No support cases have been opened.'}
        </p>
      ) : (
        <ul className="lessons">
          {cases.map((c) => (
            <li key={c.id}>
              <div className="t">
                <Link href={`/support/${c.caseNumber}`}>
                  <strong>{c.subject}</strong>
                </Link>
                <span className="muted">
                  {' · '}
                  {c.caseNumber} · {CATEGORY_LABEL[c.category] ?? c.category} ·{' '}
                  {c.requesterName ?? 'Unknown requester'} ·{' '}
                  {new Date(c.createdAt).toLocaleString()}
                </span>
                {c.status === 'resolved' && c.resolutionNote && (
                  <p className="muted" style={{ margin: '.2rem 0 0' }}>
                    Resolved: {c.resolutionNote}
                  </p>
                )}
                {c.status === 'closed' && c.closeReason && (
                  <p className="muted" style={{ margin: '.2rem 0 0' }}>
                    Closed: {c.closeReason}
                  </p>
                )}
              </div>
              <div className="row" style={{ gap: '0.4rem', alignItems: 'center' }}>
                <span
                  className={`badge ${
                    c.status === 'resolved'
                      ? 'ok'
                      : c.status === 'closed'
                        ? 'neutral'
                        : 'warn'
                  }`}
                >
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
                <span className="badge neutral">
                  {PRIORITY_LABEL[c.priority] ?? c.priority}
                </span>
                {c.assigneeName && (
                  <span className="badge neutral">With {c.assigneeName}</span>
                )}
                {c.status !== 'closed' && c.status !== 'resolved' && c.assignedTo !== user.id && (
                  <ClaimButton caseId={c.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="muted" style={{ fontSize: '.85rem' }}>
        Resolving requires the note the requester reads. A requester who replies
        to a resolved case reopens it, so a resolution rate here means answered,
        not merely marked.
      </p>
    </div>
  );
}
