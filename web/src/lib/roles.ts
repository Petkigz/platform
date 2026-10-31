import type { SupabaseClient } from '@supabase/supabase-js';

export type RoleRow = {
  code: string;
  name: string;
  description: string | null;
  is_privileged: boolean;
};

export type AssignmentRow = {
  user_id: string;
  role_code: string;
  assigned_at: string;
  assigner: { display_name: string | null } | null;
};

/**
 * The ten roles and who holds them.
 *
 * RLS on user_role_assignments admits a row to its own user or to a privileged
 * caller, so the page calling this has already established that the reader is
 * staff. Nothing here filters by who is asking.
 */
export async function fetchRoleRoster(
  supabase: SupabaseClient,
): Promise<{ roles: RoleRow[]; assignments: AssignmentRow[] }> {
  const { data: roleRows, error: rErr } = await supabase
    .from('roles')
    .select('code, name, description, is_privileged')
    .order('code', { ascending: true });

  if (rErr) throw new Error(rErr.message);

  const { data: assignRows, error: aErr } = await supabase
    .from('user_role_assignments')
    .select(
      'user_id, role_id, assigned_at,' +
        'role:role_id(code), assigner:assigned_by(display_name)',
    )
    .is('revoked_at', null)
    .order('assigned_at', { ascending: false });

  if (aErr) throw new Error(aErr.message);

  return {
    roles: ((roleRows ?? []) as unknown as RoleRow[]),
    assignments: ((assignRows ?? []) as unknown as {
      user_id: string;
      assigned_at: string;
      role: { code: string }[] | null;
      assigner: { display_name: string | null }[] | null;
    }[]).map(({ role, assigner, ...row }) => ({
      ...row,
      role_code: role?.[0]?.code ?? '',
      assigner: assigner?.[0] ?? null,
    })),
  };
}

export type AssignInput = {
  userId?: unknown;
  roleCode?: unknown;
  reason?: unknown;
};

export type RoleResult = { ok: true } | { ok: false; status: number; error: string };

const REASON_MAX = 500;

/**
 * Translate a database refusal into something a person can act on.
 *
 * These messages are not cosmetic. "Only staff may assign roles" and "the last
 * privileged account cannot be removed" are different situations needing
 * different responses, and both arriving as a bare 400 would leave an operator
 * guessing at a step that changes who can administer the platform.
 */
function refusal(message: string): RoleResult {
  const m = message.toLowerCase();

  if (m.includes('sign in to')) {
    return { ok: false, status: 401, error: 'Sign in first.' };
  }
  if (m.includes('only staff may')) {
    return { ok: false, status: 403, error: 'Only staff can change roles.' };
  }
  if (m.includes('no such role')) {
    return { ok: false, status: 400, error: 'That is not a role this platform has.' };
  }
  if (m.includes('user') && m.includes('not found')) {
    return { ok: false, status: 404, error: 'No such person.' };
  }
  if (m.includes('written reason')) {
    return {
      ok: false,
      status: 400,
      error: 'Give a written reason — it goes on the audit trail.',
    };
  }
  // The staff-day journey's rule: a privileged role is the owner's to give or
  // take, and everybody else is told so in one sentence rather than being
  // handed a permission error.
  if (m.includes('only the platform admin may grant')
      || m.includes('only the platform admin may revoke')) {
    return {
      ok: false,
      status: 403,
      error:
        'Only the platform admin can give or take a privileged role. ' +
        'Ask them, and say what the person needs to do.',
    };
  }
  if (m.includes('may not assign a privileged role to themselves')) {
    return {
      ok: false,
      status: 403,
      error: 'You cannot grant yourself a privileged role. Someone else has to.',
    };
  }
  if (m.includes('assigner does not currently hold')) {
    return {
      ok: false,
      status: 403,
      error: 'You do not currently hold a privileged role.',
    };
  }
  if (m.includes('last privileged account')) {
    return {
      ok: false,
      status: 409,
      error:
        'That is the last privileged account. Appoint someone else first, ' +
        'or nobody will be able to administer the platform.',
    };
  }
  return { ok: false, status: 400, error: message };
}

function readReason(reason: unknown): string {
  return typeof reason === 'string' ? reason.trim() : '';
}

/**
 * Grant a role.
 *
 * The actor is not an argument. Both writers read the session, so there is no
 * parameter to spoof — passing an admin's id as "the actor" gets nowhere, which
 * is the whole point.
 */
export async function assignRole(
  supabase: SupabaseClient,
  input: AssignInput,
): Promise<RoleResult> {
  const userId = typeof input.userId === 'string' ? input.userId : '';
  const roleCode = typeof input.roleCode === 'string' ? input.roleCode : '';
  const reason = readReason(input.reason);

  if (!userId) return { ok: false, status: 400, error: 'userId is required.' };
  if (!roleCode) return { ok: false, status: 400, error: 'Choose a role.' };
  if (reason.length > REASON_MAX) {
    return { ok: false, status: 400, error: `Keep the reason under ${REASON_MAX} characters.` };
  }

  const { error } = await supabase.rpc('assign_role', {
    p_user_id: userId,
    p_role_code: roleCode,
    p_reason: reason || null,
  });

  return error ? refusal(error.message) : { ok: true };
}

/**
 * Revoke a role.
 *
 * Soft: the row stays with a reason attached, because who held which role is
 * part of who could do what. A written reason is required, and the database
 * enforces that independently of this check.
 */
export async function revokeRole(
  supabase: SupabaseClient,
  input: AssignInput,
): Promise<RoleResult> {
  const userId = typeof input.userId === 'string' ? input.userId : '';
  const roleCode = typeof input.roleCode === 'string' ? input.roleCode : '';
  const reason = readReason(input.reason);

  if (!userId) return { ok: false, status: 400, error: 'userId is required.' };
  if (!roleCode) return { ok: false, status: 400, error: 'Choose a role.' };
  if (!reason) {
    return { ok: false, status: 400, error: 'Taking a role away needs a written reason.' };
  }
  if (reason.length > REASON_MAX) {
    return { ok: false, status: 400, error: `Keep the reason under ${REASON_MAX} characters.` };
  }

  const { error } = await supabase.rpc('revoke_role', {
    p_user_id: userId,
    p_role_code: roleCode,
    p_reason: reason,
  });

  return error ? refusal(error.message) : { ok: true };
}
