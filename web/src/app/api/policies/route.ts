import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  POLICY_ENGLISH,
  acceptedOf,
  isPolicySlug,
  isPolicyVersion,
  policyReasonOf,
  policyStatusOf,
  type PolicyOutcome,
} from '@/lib/policy-outcome';

export const dynamic = 'force-dynamic';

/**
 * A refusal: its name, this route's own English beside it, and the name's
 * status. The database's sentence is never part of it.
 */
const refuse = (reason: PolicyOutcome) =>
  NextResponse.json({ ok: false, reason, message: POLICY_ENGLISH[reason] }, { status: policyStatusOf(reason) });

/**
 * Agree to the version of a policy that the page showed.
 *
 * The database decides who is agreeing and records it (`accept_policy()`);
 * the button used to call it from the browser. It goes through here for two
 * reasons.
 *
 * **The answer is a name.** The page says its own sentence for it, in the
 * reader's language. The database's sentence is logged and never sent.
 *
 * **The version is checked.** `accept_policy()` takes a slug and agrees to
 * whatever is live at that instant. The request carries the version number
 * the reader was shown; the live one is read first, and if it is a different
 * number nothing is asked of the writer and the answer is `changed`. Between
 * that read and the write the owner could still publish, so the reply says
 * which version was recorded, and the button says so when it is not the one
 * on the page. Closing that last gap needs the writer itself to take the
 * version, which is a migration.
 *
 * A second press is a success with `changed: false`: the writer answers with
 * the time of the first.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return refuse('refused');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse('malformed');
  }
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (!isPolicySlug(b.slug) || !isPolicyVersion(b.version)) return refuse('malformed');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return refuse('not_signed_in');

  const live = await supabase.rpc('policy_page', { p_slug: b.slug } as never);
  if (live.error) {
    // Nothing has been asked of the writer yet, so nothing was recorded.
    console.error('policies: the live version could not be read before agreeing:', live.error.message);
    return refuse('refused');
  }
  const liveVersion = (live.data as { versionNumber?: unknown } | null)?.versionNumber;
  // No live version at all is left to the writer, which knows whether the
  // document exists. A live version with another number is not what was read.
  if (live.data !== null && liveVersion !== b.version) return refuse('changed');

  const { data, error } = await supabase.rpc('accept_policy', { p_slug: b.slug } as never);
  if (error) {
    const reason = policyReasonOf(error);
    if (reason === 'refused' || reason === 'unconfirmed') {
      console.error(`policies: agreeing was ${reason}:`, error.message);
    }
    return refuse(reason);
  }
  const accepted = acceptedOf(data);
  if (!accepted) {
    console.error('policies: the writer answered without a version and a time');
    return refuse('unconfirmed');
  }
  return NextResponse.json({
    ok: true,
    changed: !accepted.already,
    version: accepted.version,
    acceptedAt: accepted.acceptedAt,
  });
}
