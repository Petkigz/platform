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
import { changedSince, neverAsked } from '@/lib/policy-notice';

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
 * **The version the reader was shown goes to the writer.** Agreeing by slug
 * alone records whatever is in force at that instant, which for a page left
 * open while the owner published is a text its reader never saw. This route
 * used to read the live version first and refuse a different number itself,
 * which left the moment between that read and the write. Since 2026-11-24
 * the writer takes the number and compares it inside its own transaction,
 * holding the version it read until it has written. So nothing is read here
 * first: the writer is the one place that decides, and `changed` is its
 * answer.
 *
 * The reply still says which version was recorded. It can only be the one
 * that was sent; a reply that says otherwise is not believed.
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

  const { data, error } = await supabase.rpc('accept_policy', { p_slug: b.slug, p_version: b.version } as never);
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
  if (accepted.version !== b.version) {
    // The writer compares before it records. An answer naming another
    // version is not one this route can explain, so it does not say "agreed".
    console.error('policies: the writer answered for a version that was not the one sent');
    return refuse('unconfirmed');
  }
  return NextResponse.json({
    ok: true,
    changed: !accepted.already,
    version: accepted.version,
    acceptedAt: accepted.acceptedAt,
  });
}

const noStore = { 'cache-control': 'no-store' } as const;

/**
 * Which documents changed since this reader agreed to them, and, for an
 * account that has agreed to nothing at all, which are waiting.
 *
 * Asked by the notice under every page, once each time the application is
 * opened (`_shared/policy-notice.tsx`). The root layout cannot ask on the
 * server: it knows nobody, so that pages can be drawn once for everyone.
 *
 * The answer is a slug and a version number for each document, and nothing
 * else: no title, no text, no time. A visitor is answered `signedIn: false`
 * and the database is not asked.
 *
 * A read that fails is answered `changed: null`, which says nothing about
 * any document: the notice shows nothing and asks again on the next page
 * rather than recording that nothing changed. It is not an error status.
 * This is asked in the background of whatever page was opened, and a failed
 * request there would be reported in the browser on a page that is fine.
 */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ signedIn: false }, { headers: noStore });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false }, { headers: noStore });

  const standing = await supabase.rpc('my_policy_standing').then(
    (reply) => reply,
    () => ({ data: null, error: { message: 'no answer' } }),
  );
  const changed = standing.error ? null : changedSince(standing.data);
  // An account that has agreed to nothing at all: made by Google from the
  // sign-in page, where there is no box. It is asked by the same notice.
  const waiting = standing.error ? null : neverAsked(standing.data);
  if (changed === null || waiting === null) {
    console.error('policies: what changed could not be read for the notice:', standing.error?.message ?? 'a reply that was not a standing');
    return NextResponse.json({ signedIn: true, changed: null }, { headers: noStore });
  }
  return NextResponse.json(
    {
      signedIn: true,
      changed: changed.map((doc) => ({ slug: doc.slug, version: doc.version })),
      waiting: waiting.map((doc) => ({ slug: doc.slug, version: doc.version })),
    },
    { headers: noStore },
  );
}
