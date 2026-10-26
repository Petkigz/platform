import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  REFERRAL_COOKIE_DAYS,
  cleanReferralCode,
  referralLookupError,
} from '@/lib/referrals';

export const dynamic = 'force-dynamic';

type Resolved = {
  found?: boolean;
  disabled?: boolean;
  code?: string | null;
  inviterName?: string | null;
  percentOff?: number | string | null;
};

/**
 * What a friend sees when they open an invitation.
 *
 * Three facts, no more: who invited them (a first name), what the code takes
 * off, and that it applies to a first course. Nothing about the inviter's
 * purchases, nothing about how many people they have invited, and no email
 * address — the person holding this link is a visitor.
 *
 * The button goes through `/api/referral/<code>`, which leaves the code in a
 * cookie and sends them to the catalogue. Clicking is what remembers it, so a
 * link that is only looked at does not leave anything behind.
 */
export default async function ReferralPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = cleanReferralCode(decodeURIComponent(raw));

  let resolved: Resolved = { found: false };
  let failure: string | null = null;

  if (isSupabaseConfigured() && code) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('resolve_referral_code', { p_code: code });
    if (error) failure = referralLookupError(error.message);
    else resolved = (data ?? { found: false }) as Resolved;
  }

  const percent =
    resolved.percentOff === null || resolved.percentOff === undefined
      ? null
      : Number(resolved.percentOff);

  if (!code || (!failure && resolved.found !== true)) {
    return (
      <div className="page narrow">
        <p className="eyebrow">An invitation</p>
        <h1>This link does not work</h1>
        <p className="lede">
          The code in it is either mistyped or was never real. Nothing has been charged
          and nothing was signed up for — you are just a visitor on this page.
        </p>
        <p style={{ marginTop: '1.25rem' }}>
          <Link href="/catalogue" className="btn">
            Browse the courses
          </Link>
        </p>
      </div>
    );
  }

  if (failure) {
    return (
      <div className="page narrow">
        <p className="eyebrow">An invitation</p>
        <h1>Invitations are not open yet</h1>
        <p className="lede">{failure}</p>
        <p style={{ marginTop: '1.25rem' }}>
          <Link href="/catalogue" className="btn">
            Browse the courses
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page narrow">
      <p className="eyebrow">An invitation</p>
      <h1>
        {resolved.inviterName ? `${resolved.inviterName} invited you` : 'You were invited'}
      </h1>
      <p className="lede">
        {percent !== null && percent > 0
          ? `Their code takes ${percent}% off your first course here.`
          : 'Their code gets you started on your first course here.'}{' '}
        It is a discount on the course, not money, so there is nothing to withdraw.
      </p>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Your invitation</h2>
          <span className="badge neutral">{resolved.code ?? code}</span>
        </div>
        <p className="meta" style={{ marginTop: '0.5rem' }}>
          Use the button and the code is kept for you while you look around; it is filled
          in on the payment page. You can also type it there yourself.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <Link href={`/api/referral/${encodeURIComponent(code)}`} className="btn">
            Keep this code and browse
          </Link>
        </p>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          The code is remembered in this browser for {REFERRAL_COOKIE_DAYS} days and filled
          in on the payment page. You can also type <strong>{resolved.code ?? code}</strong>{' '}
          there yourself.
        </p>
      </div>

      <p className="muted" style={{ marginTop: '1.25rem' }}>
        AyahSpring teaches the Islamic faith to children and adults, at a pace that fits
        around a life. Courses are reviewed before they are published, and every teacher
        is appointed by the platform rather than signing themselves up.
      </p>
    </div>
  );
}
