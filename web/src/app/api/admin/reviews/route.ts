import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { assignReviewer, type ReviewScope } from '@/lib/review';

const SCOPES: ReviewScope[] = ['technical', 'scholarly'];

/**
 * Assign a reviewer to a submitted course version.
 *
 * This is the only way an assignment comes into existence — `cra_write` is
 * privileged only, so a reviewer cannot claim work and a teacher cannot
 * nominate their own reviewer. The privilege check below exists for the
 * message; the policy is what actually refuses.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Malformed request.' },
      { status: 400 },
    );
  }

  const b = body as {
    versionId?: unknown;
    reviewerProfileId?: unknown;
    scope?: unknown;
  };

  const uuid = /^[0-9a-f-]{36}$/i;

  if (typeof b.versionId !== 'string' || !uuid.test(b.versionId)) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'A course version is required.' },
      { status: 400 },
    );
  }
  if (typeof b.reviewerProfileId !== 'string' || !uuid.test(b.reviewerProfileId)) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Choose a reviewer.' },
      { status: 400 },
    );
  }
  const scope = (typeof b.scope === 'string' && SCOPES.includes(b.scope as ReviewScope)
    ? b.scope
    : 'scholarly') as ReviewScope;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'forbidden', message: 'Sign in first.' },
      { status: 401 },
    );
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json(
      {
        ok: false,
        code: 'forbidden',
        message: 'Only platform staff can assign a reviewer.',
      },
      { status: 403 },
    );
  }

  const outcome = await assignReviewer(supabase, {
    versionId: b.versionId,
    reviewerProfileId: b.reviewerProfileId,
    scope,
    assignedBy: user.id,
  });

  if (!outcome.ok) {
    return NextResponse.json(outcome, {
      status: outcome.code === 'forbidden' ? 403 : 400,
    });
  }

  return NextResponse.json(outcome, { status: 201 });
}
