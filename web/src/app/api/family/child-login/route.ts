import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServiceRoleConfigured } from '@/lib/env';
import {
  CHILD_LOGIN_DOMAIN, normaliseUsername, passwordProblem, usernameProblem,
} from '@/lib/child-login';

/**
 * Creating a child's login, and removing one.
 *
 * **Only a guardian can do this, and the database says so.** The first thing this
 * route does is call `reserve_child_login()`, which refuses unless the caller is
 * one of the child's own adults and the feature is switched on. Nothing is
 * created until that has succeeded, so a request from anybody else cannot even
 * reach the account-creation step.
 *
 * Then, and only then, an auth account is created with the service-role client,
 * because Supabase's own sign-up needs an email address and a confirmation link —
 * neither of which a seven-year-old has. The address is
 * `<username>@learners.ayahspring.com`, a subdomain with no mailbox: it is a
 * sign-in identifier, and password recovery for a child is the guardian setting a
 * new one.
 *
 * If the link fails the account is deleted again, so a failed attempt leaves no
 * orphan account and no taken username. The order is deliberate: a username taken
 * with no account behind it is recoverable (it is abandoned and freed), an
 * account with no learner behind it is a person nobody can explain.
 */

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function fail(sentence: string, status = 400) {
  return NextResponse.json({ error: sentence }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to make a login for your child.', 401);

  let body: { learnerId?: unknown; username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail('The form could not be read. Please try again.');
  }

  const learnerId = typeof body.learnerId === 'string' ? body.learnerId : '';
  const username = normaliseUsername(typeof body.username === 'string' ? body.username : '');
  const password = typeof body.password === 'string' ? body.password : '';

  if (!/^[0-9a-f-]{36}$/i.test(learnerId)) return fail('That is not a child we can find.');
  const shape = usernameProblem(username);
  if (shape) return fail(shape);
  const weak = passwordProblem(password);
  if (weak) return fail(weak);

  if (!isServiceRoleConfigured()) {
    // Said plainly rather than half-working: the account cannot be made without
    // it, and the guardian should know before they wonder what went wrong.
    return NextResponse.json(
      { code: 'child_login_unavailable' },
      { status: 503, headers: NO_STORE },
    );
  }

  // Step one: claim the username. This is the authorisation point — everything
  // after it exists only because this succeeded.
  const { data: loginId, error: reserveError } = await supabase.rpc('reserve_child_login', {
    p_learner_id: learnerId,
    p_username: username,
  });

  if (reserveError) {
    return NextResponse.json(
      { code: reserveError.message },
      { status: 403, headers: NO_STORE },
    );
  }

  // Step two: the account. No reads with this client, ever.
  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: `${username}@${CHILD_LOGIN_DOMAIN}`,
    password,
    // There is no mailbox to confirm from, and the guardian is standing there.
    email_confirm: true,
    user_metadata: { child_login: true, username },
  });

  if (createError || !created?.user) {
    await supabase.rpc('abandon_child_login', { p_login_id: loginId });
    const alreadyRegistered = /registered|exists/i.test(createError?.message ?? '');
    return fail(
      alreadyRegistered
        ? 'An account already exists for that username. Try a different one.'
        : 'The account could not be created just now. Nothing was changed — please try again.',
      502,
    );
  }

  // Step three: link it to the child, which is the step that makes it real. A
  // failure here deletes the account again rather than leaving one behind.
  const { data: linked, error: linkError } = await supabase.rpc('attach_child_login', {
    p_login_id: loginId,
    p_user_id: created.user.id,
  });

  if (linkError) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    await supabase.rpc('abandon_child_login', { p_login_id: loginId });
    return NextResponse.json(
      { code: linkError.message },
      { status: 400, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      username: (linked as { username?: string } | null)?.username ?? username,
      signInAddress: `${username}@${CHILD_LOGIN_DOMAIN}`,
    },
    { headers: NO_STORE },
  );
}

/** Removing a login. Deletes no learning; see `remove_child_login()`. */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to change your child’s login.', 401);

  let body: { learnerId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail('The form could not be read. Please try again.');
  }

  const learnerId = typeof body.learnerId === 'string' ? body.learnerId : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(learnerId)) return fail('That is not a child we can find.');

  const { data, error } = await supabase.rpc('remove_child_login', {
    p_learner_id: learnerId,
    p_reason: reason || null,
  });

  if (error) {
    return NextResponse.json({ code: error.message }, { status: 400, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true, removed: data }, { headers: NO_STORE });
}
