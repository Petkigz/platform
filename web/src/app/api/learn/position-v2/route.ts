import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

// The old endpoint remains in use until the player and the legacy write paths
// are migrated together. Do not treat this endpoint's existence as a rollout.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);
const reply = (data: object, status = 200) => NextResponse.json(data, {
  status,
  headers: { 'cache-control': 'private, no-store' },
});

function rpcFailure(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('not your learning')) return reply({ error: 'That is not your learning.' }, 403);
  if (lower.includes('not in the version')) return reply({ error: 'That lesson is not in this course version.' }, 409);
  if (lower.includes('no such enrolment')) return reply({ error: 'That enrolment does not exist.' }, 404);
  return reply({ error: 'Could not confirm your saved place.' }, 503);
}

function snapshot(value: unknown): { seconds: number | null; revision: string | null } | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  // Older direct progress writers did not cap the stored value at 24 hours.
  if (row.seconds !== null && (!Number.isInteger(row.seconds) || (row.seconds as number) < 0 || (row.seconds as number) > 2147483647)) return null;
  if (row.revision !== null && !validId(row.revision)) return null;
  if (row.revision === null && row.seconds !== null) return null;
  return { seconds: row.seconds as number | null, revision: row.revision as string | null };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return reply({ error: 'Supabase is not configured.' }, 503);
  const url = new URL(request.url);
  const enrolmentId = url.searchParams.get('enrolmentId');
  const lessonId = url.searchParams.get('lessonId');
  if (!validId(enrolmentId) || !validId(lessonId)) return reply({ error: 'A valid enrolment and lesson are required.' }, 400);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply({ error: 'Sign in to keep your place.' }, 401);
  const { data, error } = await supabase.rpc('resume_position_snapshot', {
    p_enrolment_id: enrolmentId, p_lesson_id: lessonId,
  });
  if (error) return rpcFailure(error.message);
  const current = snapshot(data);
  if (!current) return reply({ error: 'Could not confirm your saved place.' }, 503);
  // The actor is used only to separate opt-in recovery records on this browser;
  // it is derived from the authenticated session, never trusted for DB access.
  return reply({ ok: true, ...current, actorId: user.id });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return reply({ error: 'Supabase is not configured.' }, 503);
  let body: unknown;
  try { body = await request.json(); } catch { return reply({ error: 'Expected a JSON body.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'Expected a JSON object.' }, 400);
  const input = body as Record<string, unknown>;
  if (!validId(input.enrolmentId) || !validId(input.lessonId)) return reply({ error: 'A valid enrolment and lesson are required.' }, 400);
  if (!Number.isInteger(input.seconds) || (input.seconds as number) < 0 || (input.seconds as number) > 86400) return reply({ error: 'A position must be whole seconds between 0 and 86400.' }, 400);
  if (input.revision !== null && !validId(input.revision)) return reply({ error: 'An observed revision is required.' }, 400);
  if (!validId(input.actorId)) return reply({ error: 'An authenticated actor is required.' }, 400);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply({ error: 'Sign in to keep your place.' }, 401);
  if (user.id !== input.actorId) return reply({ error: 'Your account changed. Reload this lesson.' }, 403);
  const { data, error } = await supabase.rpc('compare_record_lesson_position', {
    p_enrolment_id: input.enrolmentId, p_lesson_id: input.lessonId,
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
