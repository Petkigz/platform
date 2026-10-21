import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  createCohort,
  joinCohort,
  leaveCohort,
  mapCohortError,
  setCohortCapacity,
  setCohortJoinWindow,
  setCohortStatus,
  validateCapacity,
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
  joinClosesAt?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status });

/**
 * A join window is required rather than optional: moving it to blank would mean
 * "go back to the default", and the writer takes a timestamp. Asking for the
 * default again is a deliberate date the teacher can see.
 */
function validateCohortJoinWindow(value: unknown): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
    return { ok: false, message: 'Choose when registration should close.' };
  const closes = new Date(value);
  if (closes.getTime() <= Date.now())
    return { ok: false, message: 'Registration must close later than now.' };
  return { ok: true, value: closes.toISOString() };
}
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
      joinClosesAt: body.joinClosesAt,
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

  // Moving the join window is the one change a teacher legitimately needs once a
  // class is running: "we will take joiners for two more days". The database
  // decides who may do it and how far it may move.
  if (body.action === 'set_join_window') {
    if (!isUuid(body.cohortId)) return fail('Choose a cohort.', 400);
    const checked = validateCohortJoinWindow(body.joinClosesAt);
    if (!checked.ok) return fail(checked.message, 400);
    return respond(await setCohortJoinWindow(supabase, body.cohortId, checked.value));
  }

  // How big the class is. Published to learners as "3 of 12 places taken" the
  // moment `cohort_places()` exists, so the teacher has to be able to change it:
  // otherwise the only way to let a thirteenth learner in is to cancel a running
  // class and open another. The database decides who may, and refuses a limit
  // below the learners already in the room.
  if (body.action === 'set_capacity') {
    if (!isUuid(body.cohortId)) return fail('Choose a cohort.', 400);
    const checked = validateCapacity(body.capacity);
    if (!checked.ok) return fail(checked.message, 400);
    return respond(await setCohortCapacity(supabase, body.cohortId, checked.value));
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
