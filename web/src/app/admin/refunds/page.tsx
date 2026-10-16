import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchRefundQueue } from '@/lib/refunds';
import { format, fromMinor } from '@/lib/money';
import { DecideForm } from './decide-form';

export const dynamic = 'force-dynamic';

/**
 * The refund queue.
 *
 * Approving here is a decision, not a payment. It creates a refund transaction
 * in `pending`; the money moves when the provider confirms and the transaction
 * completes, which is what writes the ledger entry and moves the order to
 * refunded. Nothing on this page can make money move on its own.
 *
 * That split is D4, and it is worth stating on the screen rather than only in
 * the schema, because the instinct when approving is to believe you have just
 * refunded someone. You have not — you have agreed to.
 */
export default async function AdminRefundsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/refunds');

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) redirect('/');

  const queue = await fetchRefundQueue(supabase);

  return (
    <main className="page">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Refunds</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Money out</p>
        <h1>Refund requests</h1>
        <p className="muted">
          Nobody can approve a refund they asked for. Approving creates a
          pending transaction; the money moves only once the provider confirms
          it.
        </p>
      </div>

      {queue.length === 0 && (
        <p className="muted">No refund requests are waiting on a decision.</p>
      )}

      {queue.map((item) => (
        <section className="card" key={item.id}>
          <p className="eyebrow">
            {format(fromMinor(item.requested_amount_minor, item.currency_code))}
            {' · requested '}
            {new Date(item.created_at).toLocaleDateString()}
          </p>
          <blockquote style={{ margin: '0.5rem 0 1rem' }}>
            <p>{item.reason}</p>
            <footer className="muted">— {item.requester?.display_name ?? 'Unknown'}</footer>
          </blockquote>

          <DecideForm requestId={item.id} />
        </section>
      ))}

      <p className="muted">
        Every decision is written to the governance audit trail with who made it
        and when.
      </p>
    </main>
  );
}
