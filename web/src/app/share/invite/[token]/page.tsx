import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { validateInvitationToken } from '@/lib/sharing';
import { AcceptInvitationForm } from './accept-form';

export const dynamic = 'force-dynamic';

/**
 * Opening an invitation.
 *
 * The page knows nothing about who sent the invitation or what it covers: those live
 * behind the token, which the database matches by hash and only for the address it was
 * sent to. So this page asks the signed-in person to accept, and the answer — including
 * "this was sent to a different address" — comes from `accept_learning_share()`.
 *
 * Accepting is a button and not a page load on purpose. Mail clients and security
 * scanners open links before a person does, and a GET that granted access would let
 * them accept on somebody else's behalf.
 */
export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { token } = await params;
  // Next hands back the segment percent-encoded. A malformed escape is not a crash; it
  // is simply not a token, and the validator below says so.
  const decoded = (() => {
    try {
      return decodeURIComponent(token);
    } catch {
      return token;
    }
  })();
  const checked = validateInvitationToken(decoded);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/share/invite/${token}`)}`);
  }

  const enabled = await isFlagEnabled(supabase, 'family.adult_shares').catch(() => false);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/account/sharing">Sharing</Link>
      </p>
      <h1>Somebody has invited you to see their learning</h1>

      {!checked.ok ? (
        <div className="notice error">{checked.message}</div>
      ) : !enabled ? (
        <div className="notice warn">
          Sharing an adult&rsquo;s learning is not enabled on this platform, so this
          invitation cannot be accepted yet. Nothing has been shared with you.
        </div>
      ) : (
        <>
          <p className="lede" style={{ maxWidth: '42rem' }}>
            Accepting lets you see the progress or the certificates they chose to share,
            until the invitation runs out or they end it. You can stop looking at any
            time by ignoring it; only they can end the share itself.
          </p>

          <div className="notice" style={{ maxWidth: '42rem', marginBottom: '1rem' }}>
            Signed in as <strong>{user.email ?? user.phone ?? 'unknown'}</strong>. An
            invitation only works for the address it was sent to, so if this is a
            different address, sign out and sign back in with the one that received the
            email.
          </div>

          <AcceptInvitationForm token={checked.value} />
        </>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/account/sharing">Back to sharing</Link>
      </p>
    </div>
  );
}
