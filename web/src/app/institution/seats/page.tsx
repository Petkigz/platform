import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SEAT_NOTICE, SEAT_PAYMENT_NOTICE, parseMySeats, seatsHeadline } from '@/lib/seats';
import { SeatDesk } from './seats-desk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seats' };

/**
 * The seats an institution bought, and the codes it hands out.
 *
 * Administrators only, decided by `my_institution_seats()` in SQL rather than by
 * this page: an ordinary member gets an empty order list and the page says so.
 * The screen is here rather than folded into `/institution` because a principal
 * needs it at the start of a term, not every day — and because a code block and a
 * monthly report do not belong on the same page.
 */
export default async function InstitutionSeatsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/institution/seats');

  const { data, error } = await supabase.rpc('my_institution_seats');
  const seats = parseMySeats(data);

  if (!seats.joined) redirect('/institution');

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/account">Account</Link>
        <span aria-hidden>›</span>
        <Link href="/institution">Institution</Link>
        <span aria-hidden>›</span>
        <span>Seats</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Institution</p>
        <h1>Seats</h1>
        <p className="muted">{seatsHeadline(seats)}</p>
      </div>

      {error && (
        <div className="notice error" role="alert">
          The seats could not be read: {error.message}
        </div>
      )}

      {!seats.enabled && (
        <p className="notice warn" style={{ maxWidth: '48rem' }}>
          <strong>Seat sales are switched off at the moment.</strong> Any seat you already hold keeps
          working — the codes below are still listed — but nothing new can be bought, issued or
          claimed until the owner turns them back on.
        </p>
      )}

      {!seats.isAdmin ? (
        <section className="card" style={{ maxWidth: '44rem' }}>
          <h2 style={{ marginTop: 0 }}>Seats belong to the institution&apos;s administrators</h2>
          <p className="muted">
            You are a member of this institution, so the courses it has bought are not on your page —
            which courses a school pays for is the school&rsquo;s business. If you were given a seat
            code, redeem it at <Link href="/institution/claim">the claim page</Link>; the seat becomes
            yours and nobody at the school is told which code you used.
          </p>
        </section>
      ) : (
        <>
          <p className="muted" style={{ maxWidth: '48rem' }}>
            {SEAT_NOTICE}
          </p>

          <SeatDesk orders={seats.orders} />

          <section className="card" style={{ maxWidth: '48rem', marginTop: '1.5rem' }}>
            <h2 style={{ marginTop: 0 }}>How a school buys seats</h2>
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              {SEAT_PAYMENT_NOTICE}
            </p>
            <p className="muted" style={{ marginBottom: 0 }}>
              To buy seats, write to{' '}
              <a href="mailto:privacy@ayahspring.com">privacy@ayahspring.com</a> with the course, how
              many learners and how the school will pay. The owner records the order against the
              invoice reference, and it appears on this page.
            </p>
          </section>
        </>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/institution">Back to the institution</Link>
      </p>
    </div>
  );
}
