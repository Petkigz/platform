import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SEAT_NOTICE } from '@/lib/seats';
import { ClaimForm } from './claim-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Claim a seat' };

/**
 * Where a school's seat code is turned into a course.
 *
 * Open to anybody signed in — a seat is not reserved for an institution's own
 * members, because a madrasah may well buy seats for children whose families
 * never joined anything. The code is the entitlement; the account is who holds it.
 *
 * The learner list comes from the same RLS-limited read the checkout page uses:
 * the caller's own profile plus the children in families they belong to. The
 * database checks `can_access_learner()` again, so the list is a convenience and
 * not the control.
 */
export default async function ClaimSeatPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/institution/claim');

  const { data: learnerRows } = await supabase
    .from('learner_profiles')
    .select('id,display_name')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('display_name');

  const learners = ((learnerRows ?? []) as { id: string; display_name: string }[]).map((row) => ({
    id: row.id,
    name: row.display_name,
  }));

  return (
    <div className="page narrow">
      <nav className="crumbs">
        <Link href="/account">Account</Link>
        <span aria-hidden>›</span>
        <span>Claim a seat</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">A seat from your school</p>
        <h1>Claim a seat</h1>
        <p className="muted">
          Type the code the school gave you. It works once, and it adds the course to the learner
          you choose — no payment, no card, nothing to sign up for beyond the account you already
          have.
        </p>
      </div>

      <section className="card">
        <ClaimForm learners={learners} />
      </section>

      <p className="muted" style={{ maxWidth: '40rem' }}>
        {SEAT_NOTICE}
      </p>

      <p className="muted" style={{ maxWidth: '40rem' }}>
        A code that does not work may have been used already, or withdrawn by the school. Ask them
        for another seat rather than trying again — nothing is charged for a code that fails.
      </p>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">My learning</Link> · <Link href="/catalogue">Catalogue</Link>
      </p>
    </div>
  );
}
