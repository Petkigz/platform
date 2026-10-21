import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  resolveShareGrantee,
  revokeLearningShare,
  shareMyLearning,
} from '@/lib/sharing';

export const dynamic = 'force-dynamic';

/**
 * Sharing an adult's own learning.
 *
 * Nothing here takes an actor and nothing here decides who may do what: the learner
 * whose progress it is grants and revokes, `share_adult_learning()` checks that against
 * the session, and `family.adult_shares` gates the whole thing from the database. The
 * flag is checked here too so that a form on a page that cannot work is not offered at
 * all, and because the difference between "not enabled" and "not yours" is worth
 * telling a person.
 */

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function statusFor(outcome: { ok: boolean; code?: string }): number {
  if (outcome.ok) return 200;
  return outcome.code === 'forbidden' ? 403 : 422;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return fail('Malformed request.', 400); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  if (!(await isFlagEnabled(supabase, 'family.adult_shares').catch(() => false))) {
    return fail('Sharing an adult’s learning is not enabled on this platform.', 403);
  }

  if (body.action === 'resolve') {
    const outcome = await resolveShareGrantee(supabase, body.email);
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, account: outcome.value });
  }

  if (body.action === 'share') {
    if (typeof body.learnerProfileId !== 'string' || body.learnerProfileId === '') {
      return fail('You have no learner profile yet.', 422);
    }
    const outcome = await shareMyLearning(supabase, {
      learnerProfileId: body.learnerProfileId,
      granteeUserId: body.granteeUserId,
      scope: body.scope,
      days: body.days,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'revoke') {
    if (typeof body.shareId !== 'string' || body.shareId === '') {
      return fail('That share is missing.', 400);
    }
    const outcome = await revokeLearningShare(supabase, body.shareId);
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  return fail('Unsupported sharing action.', 400);
}
