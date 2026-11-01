import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Two presses from the identity card.
 *
 * `record` says "this sign-in has been deleted at the provider". It performs
 * nothing: the database asks `auth.users` whether the row is still there and
 * refuses if it is, which is the whole point of the route not being able to lie.
 * The service-role key that *could* delete the row is deliberately not used here
 * — that is a bigger decision than a screen, and it is written up rather than
 * taken.
 *
 * `lookup` answers "I closed my account — is it gone?" from the fingerprint in
 * the ledger. It returns no name and no history, and the database writes an audit
 * entry for every call. The address is not sent back to the client after the
 * round trip; it is not logged here either.
 *
 * The actor is never taken from the request. Both functions read the session, so
 * the audit entries name who really pressed.
 */
function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown = null;
  try {
    raw = await request.json();
  } catch {
    raw = null;
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  if (body.action === 'lookup') {
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    if (address === '' || address.length > 320) return fail('Type the address the person used to sign in.');

    const { data, error } = await supabase.rpc('identity_lookup', { p_address: address });
    if (error) {
      if (/identity:not_allowed/.test(error.message)) {
        return fail('Only staff answer this question.', 403);
      }
      if (/identity:address_required/.test(error.message)) {
        return fail('Type the address the person used to sign in.');
      }
      return fail('The lookup did not run.', 500);
    }
    return NextResponse.json({ ok: true, lookup: data });
  }

  if (body.action !== 'record') return fail('Unknown action.');

  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return fail('That is not an account id.');
  }

  const { data: platform } = await supabase.rpc('has_role', {
    p_user_id: user.id,
    p_role_code: 'platform_admin',
  });
  if (platform !== true) {
    return fail('Only the platform owner deletes an identity.', 403);
  }

  const { data, error } = await supabase.rpc('record_identity_removal', {
    p_user_id: userId,
    p_note: null,
  });
  if (error) {
    const code = (error.message.match(/identity:[a-z_]+/) ?? [null])[0];
    if (code === 'identity:not_allowed') {
      return fail('Only the platform owner deletes an identity.', 403);
    }
    if (code) return NextResponse.json({ ok: false, code, message: error.message }, { status: 409 });
    return fail('The removal was not recorded.', 500);
  }

  return NextResponse.json({ ok: true, removal: data });
}
