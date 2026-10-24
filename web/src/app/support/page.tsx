import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { CATEGORY_LABEL, fetchMyCases, STATUS_LABEL } from '@/lib/support';
import { NewCaseForm } from './new-case-form';

export const metadata = { title: 'Help' };
export const dynamic = 'force-dynamic';

/**
 * Help — open a case, and see the ones already open.
 *
 * Support is a signed-in surface. An anonymous "contact us" form has nowhere to
 * send the answer, and on a platform where a case can discuss a child's
 * progress or a payment, an unattributed thread is a thread nobody can close.
 * "This lesson is wrong" from someone who will not sign in already has a home:
 * the report form on the lesson itself.
 *
 * While `platform.support` is off the page still lists existing cases. Turning
 * the feature off stops new ones arriving; it does not delete a conversation
 * somebody is in the middle of.
 */
export default async function SupportPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/support');

  const accepting = await isFlagEnabled(supabase, 'platform.support').catch(() => false);
  // Fetched whether or not the desk is open: a case opened last week is still
  // this person's case, and hiding it while the flag is off would look exactly
  // like a request that was never received.
  const cases = await fetchMyCases(supabase);

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/">Home</Link>
        <span aria-hidden>›</span>
        <span>Help</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Support</p>
        <h1>Ask for help</h1>
        <p className="muted">
          Tell us what is not working. A person reads every request — there is
          no bot in front of this queue.
        </p>
      </div>

      {accepting ? (
        <NewCaseForm />
      ) : (
        <section className="card">
          <h2>Support is not open right now</h2>
          <p className="muted">
            We are not accepting new requests at the moment. If you already have
            a case, it is still being worked — and if a lesson looks wrong, the
            <em> Report a problem</em> form on that lesson still reaches the
            review team.
          </p>
        </section>
      )}

      <section className="section">
        <h2>My requests</h2>
        {cases.length === 0 ? (
          <p className="muted">
            {accepting
              ? 'Nothing yet. If you need us, the form above is the way.'
              : 'No requests on this account.'}
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
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  {c.status === 'resolved' && c.resolutionNote && (
                    <p className="muted" style={{ margin: '.2rem 0 0' }}>
                      {c.resolutionNote}
                    </p>
                  )}
                </div>
                <span
                  className={`badge ${c.status === 'resolved' ? 'ok' : c.status === 'closed' ? 'neutral' : 'warn'}`}
                >
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="muted" style={{ fontSize: '.85rem' }}>
        Nothing you write here is published. Staff notes on a case are internal
        and are never shown to you; your own messages are visible only to the
        people answering.
      </p>
    </div>
  );
}
