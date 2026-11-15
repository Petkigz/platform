import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

// Resource-scoped endpoint is not yet used by the player. It requires the
// resource migration and a coordinated rollout with old-client boundaries.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);
const reply = (data: object, status = 200) => NextResponse.json(data, {
  status, headers: { 'cache-control': 'private, no-store' },
});

function rpcFailure(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('not your learning') || lower.includes('cannot access that lesson') || lower.includes('resource is not available')) {
    return reply({ error: 'This recording is not available for this learner.' }, 403);
  }
  if (lower.includes('not in the version')) return reply({ error: 'That lesson is not in this course version.' }, 409);
  if (lower.includes('no such enrolment')) return reply({ error: 'That enrolment does not exist.' }, 404);
  return reply({ error: 'Could not confirm your saved place.' }, 503);
}

function snapshot(value: unknown): { seconds: number | null; revision: string | null } | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.seconds === null && row.revision === null) return { seconds: null, revision: null };
  if (typeof row.seconds !== 'number' || !Number.isInteger(row.seconds) || row.seconds < 0 || row.seconds > 86400 || !validId(row.revision)) return null;
  return { seconds: row.seconds, revision: row.revision };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return reply({ error: 'Supabase is not configured.' }, 503);
  const url = new URL(request.url);
  const enrolmentId = url.searchParams.get('enrolmentId');
  const lessonId = url.searchParams.get('lessonId');
  const resourceId = url.searchParams.get('resourceId');
  if (!validId(enrolmentId) || !validId(lessonId) || !validId(resourceId)) {
    return reply({ error: 'A valid enrolment, lesson and recording are required.' }, 400);
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply({ error: 'Sign in to keep your place.' }, 401);
  const { data, error } = await supabase.rpc('resume_resource_snapshot', {
    p_enrolment_id: enrolmentId, p_lesson_id: lessonId, p_resource_id: resourceId,
  });
  if (error) return rpcFailure(error.message);
  const current = snapshot(data);
  if (!current) return reply({ error: 'Could not confirm your saved place.' }, 503);
  return reply({ ok: true, ...current, actorId: user.id });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return reply({ error: 'Supabase is not configured.' }, 503);
  let body: unknown;
  try { body = await request.json(); } catch { return reply({ error: 'Expected a JSON body.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'Expected a JSON object.' }, 400);
  const input = body as Record<string, unknown>;
  if (!validId(input.enrolmentId) || !validId(input.lessonId) || !validId(input.resourceId)) {
    return reply({ error: 'A valid enrolment, lesson and recording are required.' }, 400);
  }
  if (!Number.isInteger(input.seconds) || (input.seconds as number) < 0 || (input.seconds as number) > 86400) return reply({ error: 'A position must be whole seconds between 0 and 86400.' }, 400);
  if (input.revision !== null && !validId(input.revision)) return reply({ error: 'An observed revision is required.' }, 400);
  if (!validId(input.actorId)) return reply({ error: 'An authenticated actor is required.' }, 400);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply({ error: 'Sign in to keep your place.' }, 401);
  if (user.id !== input.actorId) return reply({ error: 'Your account changed. Reload this lesson.' }, 403);
  const { data, error } = await supabase.rpc('compare_record_resource_position', {
    p_enrolment_id: input.enrolmentId, p_lesson_id: input.lessonId, p_resource_id: input.resourceId,
    p_seconds: input.seconds, p_revision: input.revision,
  });
  if (error) return rpcFailure(error.message);
  const current = snapshot(data);
  const outcome = data as { ok?: unknown } | null;
  if (!current || typeof outcome?.ok !== 'boolean' || (outcome.ok && (current.revision === null || current.seconds !== input.seconds))) {
    return reply({ error: 'Could not confirm your saved place.' }, 503);
  }
  return reply({ ok: outcome.ok, ...current }, outcome.ok ? 200 : 409);
}
