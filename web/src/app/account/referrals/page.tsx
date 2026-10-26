import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  emptyReferralBoard,
  parseReferralBoard,
  type ReferralBoard,
} from '@/lib/referrals';
import { ReferralsPanel } from './referrals-panel';

export const dynamic = 'force-dynamic';

/**
 * The site address a shared link is built from.
 *
 * `NEXT_PUBLIC_SITE_URL`, never the Host header — the same rule the certificate
 * printer follows, because a link built from whatever host the request arrived
 * on is a link that can point somewhere else. Unset is a supported state: the
 * link comes back relative and the code itself is still on screen.
 */
function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? '';
}

/**
 * Inviting a friend.
 *
 * The code is minted on the first visit, because that is the only moment the
 * person is definitely present to be given one. After that the database returns
 * the same code for ever — a referral code that changed while somebody was
 * halfway through sending it would be worse than no code at all.
 *
 * The flag is checked before the mint: while it is off the RPC refuses, and the
 * page says the programme is closed in a sentence rather than showing an error.
 */
export default async function AccountReferralsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/account/referrals');

  const enabled = await isFlagEnabled(supabase, 'commerce.referrals').catch(() => false);

  if (!enabled) {
    return (
      <div className="container section">
        <p className="eyebrow">
          <Link href="/account">Account</Link>
        </p>
        <h1>Invite a friend</h1>
        <p className="lede">
          Inviting a friend is built and waiting to be switched on. When the owner turns
          it on, this page mints your code and shows what came of it. Nothing is being
          withheld from you today — there is simply no code yet.
        </p>
        <ReferralsPanel
          board={emptyReferralBoard()}
          origin={siteOrigin()}
          displayName={null}
        />
      </div>
    );
  }

  // Mint if this is the first visit, then read the board. A failed mint is not
  // fatal: the read still shows the terms, and the panel says the code is
  // missing rather than pretending the person has one.
  await supabase.rpc('my_referral_code');

  const [{ data }, { data: profile }] = await Promise.all([
    supabase.rpc('my_referrals'),
    supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
  ]);

  const board: ReferralBoard | null = parseReferralBoard(data);
  const displayName = (profile as { display_name?: string | null } | null)?.display_name ?? null;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/account">Account</Link>
      </p>
      <h1>Invite a friend</h1>
      <p className="lede">
        A friend who is new here gets a discount on their first course, and you get one on
        your next. Both are discounts on a course rather than money, so there is nothing
        to withdraw and no bank details to give.
      </p>
      {board ? (
        <ReferralsPanel board={board} origin={siteOrigin()} displayName={displayName} />
      ) : (
        <div className="notice error">
          The invitation details could not be read. Nothing has been charged and no code
          was spent — reloading is safe.
        </div>
      )}
    </div>
  );
}
