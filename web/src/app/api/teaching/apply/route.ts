import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { teachingRefusal } from '@/lib/teaching';

/**
 * The three things anybody does about teaching, in one place.
 *
 * Every rule is the database's: who may apply, who may decide, when a decision
 * is final, and — the one that matters most — that applying grants nothing.
 * This route chooses the function and turns a refusal into a sentence.
 *
 * There is no `grant` action here, and there could not be a useful one: the
 * role is created inside `decide_teaching_application()` alongside the decision
 * that justifies it, so there is no request a caller could send that makes
 * somebody a teacher without a written reason attached.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const action = typeof body.action === 'string' ? body.action : '';
  const str = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value : null;

  const fail = (message: string, status = 400) =>
    NextResponse.json({ ok: false, ...teachingRefusal(message) }, { status });

  if (action === 'submit') {
    const headline = str(body.headline);
    const qualifications = str(body.qualifications);
    const sampleUrl = str(body.sampleUrl);
    if (!headline || !qualifications || !sampleUrl) {
      return NextResponse.json(
        {
          ok: false,
          code: 'incomplete',
          message: 'A headline, your qualifications and a link to a sample lesson are all needed.',
        },
        { status: 400 },
      );
    }
    const { data, error } = await supabase.rpc('submit_teaching_application', {
      p_headline: headline,
      p_qualifications: qualifications,
      p_sample_url: sampleUrl,
      p_note: str(body.note),
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'withdraw') {
    const { data, error } = await supabase.rpc('withdraw_teaching_application');
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'decide') {
    const applicationId = str(body.applicationId);
    if (!applicationId || typeof body.approve !== 'boolean') {
      return NextResponse.json(
        { ok: false, message: 'Say which application, and whether it is approved.' },
        { status: 400 },
      );
    }
    const reason = str(body.reason);
    if (!reason) {
      return NextResponse.json(
        {
          ok: false,
          code: 'reason_required',
          message: 'Write a reason. The applicant reads it, so it has to say something.',
        },
        { status: 400 },
      );
    }
    const { data, error } = await supabase.rpc('decide_teaching_application', {
      p_application: applicationId,
      p_approve: body.approve,
      p_reason: reason,
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  return NextResponse.json({ ok: false, message: 'Unknown action.' }, { status: 400 });
}
