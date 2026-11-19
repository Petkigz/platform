import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { validateInvitationToken, validateInviteInput } from '@/lib/sharing';
import { shareAnswerOf, shareCodeOf, shareRefusal, shareStatusOf, type ShareCode } from '@/lib/sharing-outcome';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store' };

/** A refusal, by name, with the status that name is always answered with. */
function refuse(code: ShareCode) {
  return NextResponse.json(shareRefusal(code), { status: shareStatusOf(code), headers: NO_STORE });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Sharing an adult's own learning: invite an address, accept an invitation,
 * end a share.
 *
 * Nothing here takes an actor and nothing here decides who may do what: the
 * database reads the session, and `invite_learning_share()`,
 * `accept_learning_share()` and `revoke_adult_learning_share()` enforce their
 * own rules. This route chooses the function, refuses a request it cannot
 * pass on without asking the database, and reads the reply for what it says
 * happened.
 *
 * Every refusal has a name (`lib/sharing-outcome.ts`) and its own status. No
 * sentence the database wrote is forwarded, and nothing else from its reply
 * is either, except until when an invitation can be accepted. A reply that
 * cannot be read is `failed`: nothing is claimed about it.
 *
 * **The switch stops inviting and accepting, never ending.** A share granted
 * while `family.adult_shares` was on is still read by the other account after
 * it is turned off, so the person who granted it can still end it here. The
 * database allows exactly that, and this route used to refuse it.
 *
 * There is deliberately no action that asks whether an address has an
 * account. The invitation reply does not depend on it, and no endpoint here
 * answers it.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return refuse('malformed');
    }
    const body = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('signed_out');

    const action = body.action;
    const switchedOn = () => isFlagEnabled(supabase, 'family.adult_shares').catch(() => false);

    if (action === 'invite') {
      if (typeof body.email !== 'string' || body.email.length > 400) return refuse('malformed');
      const checked = validateInviteInput({ email: body.email, scope: body.scope, days: body.days });
      if (!checked.ok) {
        // The address is the one thing a person types; a scope or a length
        // that is not offered did not come from the form.
        const typed = validateInviteInput({ email: body.email, scope: 'progress', days: 7 });
        return refuse(typed.ok ? 'malformed' : 'email');
      }
      if (!(await switchedOn())) return refuse('off');
      const { data, error } = await supabase.rpc('invite_learning_share', {
        p_email: checked.value.email,
        p_scope: checked.value.scope,
        p_days: checked.value.days,
      });
      if (error) return refuse(shareCodeOf(error));
      const answer = shareAnswerOf('invite', data);
      return answer.ok ? NextResponse.json(answer, { headers: NO_STORE }) : refuse(answer.code);
    }

    if (action === 'accept') {
      const checked = validateInvitationToken(body.token);
      if (!checked.ok) return refuse('link');
      if (!(await switchedOn())) return refuse('off');
      const { data, error } = await supabase.rpc('accept_learning_share', { p_token: checked.value });
      if (error) return refuse(shareCodeOf(error));
      const answer = shareAnswerOf('accept', data);
      return answer.ok ? NextResponse.json(answer, { headers: NO_STORE }) : refuse(answer.code);
    }

    if (action === 'revoke') {
      if (typeof body.shareId !== 'string' || !UUID.test(body.shareId)) return refuse('malformed');
      const { data, error } = await supabase.rpc('revoke_adult_learning_share', { p_share_id: body.shareId });
      if (error) return refuse(shareCodeOf(error));
      const answer = shareAnswerOf('revoke', data);
      return answer.ok ? NextResponse.json(answer, { headers: NO_STORE }) : refuse(answer.code);
    }

    return refuse('malformed');
  } catch {
    // Nothing is known about what happened, so nothing is claimed.
    return refuse('failed');
  }
}
