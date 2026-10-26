import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { validateSubject } from '@/lib/subjects';

export const dynamic = 'force-dynamic';

/**
 * The subject vocabulary: adding, renaming and retiring subject areas.
 *
 * The gate is `governance_admin` or `platform_admin` — the pair that owns
 * publication — and not `is_privileged()`, which would also admit a support
 * agent. `can_manage_subjects()` in the database now enforces the same pair, so
 * this route and the table agree; before that policy the table was wider than
 * any screen it has.
 *
 * A refusal from the database is passed through as the sentence it wrote. The
 * retirement guard's message names how many courses block it, which is the whole
 * reason it is a trigger rather than a comment: a failed update has to explain
 * itself to somebody who does not read SQL.
 */

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

async function manageSubjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const [{ data: governance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: userId, p_role_code: 'governance_admin' }),
    supabase.rpc('has_role', { p_user_id: userId, p_role_code: 'platform_admin' }),
  ]);
  return governance === true || platform === true;
}

/** A parent that is missing, or offered in a way the trigger would refuse. */
async function checkParent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string | null,
  selfId: string | null,
): Promise<string | null> {
  if (parentId === null) return null;

  if (parentId === selfId) return 'A subject cannot be its own parent.';

  const { data, error } = await supabase
    .from('subject_areas')
    .select('id, status, parent_subject_id')
    .eq('id', parentId)
    .maybeSingle();
  if (error) return 'Could not check that parent subject.';
  if (!data) return 'That parent subject no longer exists.';
  if (data.status !== 'active') return 'A retired subject cannot be a parent.';

  // Walk up from the proposed parent: if this subject appears, the choice is a
  // cycle. The database's trigger refuses it at any depth; this makes the
  // refusal arrive as a sentence naming the problem.
  let cursor: string | null = data.parent_subject_id as string | null;
  const seen = new Set<string>([parentId]);
  while (cursor !== null && !seen.has(cursor)) {
    if (cursor === selfId) return 'That subject sits below this one, so it cannot become its parent.';
    seen.add(cursor);
    const { data: parent } = await supabase
      .from('subject_areas')
      .select('id, parent_subject_id')
      .eq('id', cursor)
      .maybeSingle();
    cursor = (parent?.parent_subject_id as string | null) ?? null;
  }

  return null;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Malformed request.', 400);
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);
  if (!(await manageSubjects(supabase, user.id))) {
    return fail('Only a governance admin or the platform admin may change the subject list.', 403);
  }

  const checked = validateSubject({ code: body.code, name: body.name, parentId: body.parentId });
  if (!checked.ok) return fail(checked.message, 422);

  const parentProblem = await checkParent(supabase, checked.value.parentId, null);
  if (parentProblem) return fail(parentProblem, 422);

  const { data, error } = await supabase
    .from('subject_areas')
    .insert({
      code: checked.value.code,
      name: checked.value.name,
      parent_subject_id: checked.value.parentId,
    })
    .select('id')
    .single();

  if (error) {
    // 23505 is the unique index on codes. A duplicate is the commonest mistake,
    // and "duplicate key value violates unique constraint" is not a sentence
    // anybody can act on.
    if (error.code === '23505') return fail(`There is already a subject with the code “${checked.value.code}”.`, 409);
    return fail(error.message, 422);
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Malformed request.', 400);
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);
  if (!(await manageSubjects(supabase, user.id))) {
    return fail('Only a governance admin or the platform admin may change the subject list.', 403);
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (id === '') return fail('Which subject?', 400);

  const patch: Record<string, unknown> = {};

  // A display name is free to change: it is a label. The code is not — it is
  // what migrations and imports refer to — so there is deliberately no path
  // here that changes one by accident while fixing a typo in the other.
  if (body.name !== undefined) {
    const name = (typeof body.name === 'string' ? body.name : '').trim();
    if (name === '') return fail('A subject needs a name.', 422);
    const shape = validateSubject({ code: 'placeholder', name });
    if (!shape.ok) return fail(shape.message, 422);
    patch.name = name;
  }

  if (body.status !== undefined) {
    const status = body.status;
    if (status !== 'active' && status !== 'retired') return fail('A subject is active or retired.', 422);
    patch.status = status;
  }

  if (body.parentId !== undefined) {
    const parentId = typeof body.parentId === 'string' && body.parentId.trim() !== ''
      ? body.parentId.trim()
      : null;
    const parentProblem = await checkParent(supabase, parentId, id);
    if (parentProblem) return fail(parentProblem, 422);
    patch.parent_subject_id = parentId;
  }

  if (Object.keys(patch).length === 0) return fail('Nothing to change.', 400);

  const { error } = await supabase.from('subject_areas').update(patch).eq('id', id);
  if (error) {
    // The retirement guard's message names how many course versions block it,
    // and that is the sentence the screen shows. Rewriting it here would throw
    // away the one fact the reader needs.
    return fail(error.message, 422);
  }

  return NextResponse.json({ ok: true });
}
