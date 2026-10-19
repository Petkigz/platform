import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  createCohort,
  joinCohort,
  leaveCohort,
  mapCohortError,
  setCohortStatus,
  validateCohortInput,
} from '@/lib/cohorts';

export const dynamic = 'force-dynamic';

type Payload = {
  action?: unknown;
  courseId?: unknown;
  courseVersionId?: unknown;
  cohortId?: unknown;
  learnerProfileId?: unknown;
  title?: unknown;
  description?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  capacity?: unknown;
  status?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status });
const respond = (result: Awaited<ReturnType<typeof createCohort>>) => result.ok
  ? NextResponse.json(result)
  : NextResponse.json({ ok: false, message: result.message }, { status: result.status });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  let body: Payload;
  try { body = await request.json() as Payload; }
  catch { return fail('Malformed request body.', 400); }

  if (body.action === 'create') {
    const checked = validateCohortInput({
      courseId: body.courseId,
      courseVersionId: body.courseVersionId,
      title: body.title,
      description: body.description,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      capacity: body.capacity,
    });
    if (!checked.ok) return fail(checked.message, 400);
    if (!isUuid(checked.value.courseId) || !isUuid(checked.value.courseVersionId))
      return fail('Choose a valid course and published version.', 400);
    return respond(await createCohort(supabase, checked.value));
  }

  if (body.action === 'set_status') {
    if (!isUuid(body.cohortId) || !['open', 'closed', 'cancelled'].includes(String(body.status)))
      return fail('Choose a valid cohort and status.', 400);
    return respond(await setCohortStatus(
      supabase,
      body.cohortId,
      body.status as 'open' | 'closed' | 'cancelled',
    ));
  }

  if (body.action === 'join' || body.action === 'leave') {
    if (!isUuid(body.cohortId) || !isUuid(body.learnerProfileId))
      return fail('Choose the cohort and learner.', 400);
    const result = body.action === 'join'
      ? await joinCohort(supabase, body.cohortId, body.learnerProfileId)
      : await leaveCohort(supabase, body.cohortId, body.learnerProfileId);
    return respond(result);
  }

  return fail('Choose a supported cohort action.', 400);
}
