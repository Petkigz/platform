import Link from 'next/link';
import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { countryFromHeaders } from '@/lib/geo';
import { parsePool } from '@/lib/sponsorship';
import { SponsorPool } from './sponsor-pool';

export const dynamic = 'force-dynamic';

/**
 * Sponsoring a seat.
 *
 * The page is reachable without an account — somebody may want to know what
 * this is before signing in — but the pool is only read for a signed-in person,
 * because `sponsorship_pool()` refuses a session with no user. That is honest
 * rather than coy: there is nothing to show a visitor that they could act on.
 *
 * Nothing here is priced by the page. Each seat arrives with the course price
 * resolved for this reader's market, the same function checkout uses.
 */
export default async function SponsorPage() {
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const country = countryFromHeaders(await headers());

  let pool = parsePool({ enabled: true, seats: [] });
  if (supabase && user) {
    const { data } = await supabase.rpc('sponsorship_pool', { p_country: country });
    pool = parsePool(data) ?? pool;
  }

  return (
    <div className="container section">
      <p className="eyebrow">Sponsoring</p>
      <h1>Pay for somebody else’s course</h1>
      <p className="lede">
        A learner who cannot afford a course asks for it. The owner or finance reads the request
        and decides. If it is approved, the seat appears here with a code and the price of the
        course — and never a name. You choose a seat; they get the course.
      </p>

      <div className="grid" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>What you see, and what you do not</h2>
          <p className="meta">
            A seat code, the course, who the course is for, and the price where you are. Not the
            learner’s name, their age, their family or a word of what they wrote. The note they
            sent is read by staff deciding the request and by nobody else.
          </p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>What you pay, and when</h2>
          <p className="meta">
            The price of the course in your own market, resolved the same way a purchase is. No
            card or mobile-money provider is connected to this platform yet, so taking a seat
            records a pledge and explains how to pay; staff record the money and the seat opens
            then. Nothing is charged automatically.
          </p>
        </div>
      </div>

      <h2 style={{ marginTop: '2.25rem' }}>Seats waiting for a sponsor</h2>

      {!supabase && (
        <div className="notice">
          The platform is not connected to a database in this deployment, so the pool cannot be
          read.
        </div>
      )}

      {supabase && !user && (
        <div className="notice">
          <strong>The pool is shown to signed-in people.</strong> Sign in to see the seats, or
          read on to see how a request is made.{' '}
          <Link href="/sign-in?next=/sponsor">Sign in</Link>
        </div>
      )}

      {supabase && user && pool && <SponsorPool seats={pool.seats} signedIn country={country} />}

      {supabase && user && !pool && (
        <div className="notice error">
          The seats could not be read. Nothing has been charged and no seat was taken.
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>Asking for a seat</h2>
        <p className="meta">
          If a course is out of reach, you can ask. You write a sentence about the situation, the
          owner or finance reads it, and you are told the answer either way with a reason. Asking
          costs nothing and obliges nobody.
        </p>
        <p style={{ marginTop: '0.75rem' }}>
          <Link href="/sponsor/apply" className="btn secondary">
            Ask for a sponsored seat
          </Link>{' '}
          <Link href="/catalogue" className="btn ghost">
            Browse the courses
          </Link>
        </p>
      </div>
    </div>
  );
}
