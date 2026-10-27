import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeTakedownError } from '@/lib/takedowns';

/**
 * Taking a notice, and deciding one.
 *
 * Two gates, and they are deliberately different:
 *
 *   * **taking** a notice is `platform_admin` or `governance_admin` — the act that
 *     removes a course from the catalogue;
 *   * **deciding** it is the same two roles in the database, minus whoever opened it
 *     (`takedown:self_decision`). That check lives in SQL, not here, because it is a
 *     separation of duty rather than a permission.
 *
 * The actor is never sent from the client.
 */
function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function text(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value : '';
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Malformed request.');
  }
  if (typeof raw !== 'object' || raw === null) return fail('Malformed request.');
  const body = raw as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const [{ data: platform }, { data: governance }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platform !== true && governance !== true) {
    return fail('The owner or governance staff take and decide a notice.', 403);
  }

  switch (body.action) {
    case 'open': {
      const { data, error } = await supabase.rpc('open_takedown_notice', {
        p_version_id: text(body, 'versionId'),
        p_claimant_name: text(body, 'claimantName'),
        p_claimant_email: text(body, 'claimantEmail') || null,
        p_work_description: text(body, 'workDescription'),
        p_material_description: text(body, 'materialDescription'),
        p_notice_text: text(body, 'noticeText'),
        p_claimant_role: text(body, 'claimantRole') || 'owner',
        p_review_by: text(body, 'reviewBy') || null,
      });
      if (error) return fail(describeTakedownError(error.message, error.hint));
      return NextResponse.json({ ok: true, notice: data });
    }
    case 'decide': {
      const { data, error } = await supabase.rpc('decide_takedown_notice', {
        p_notice_id: text(body, 'noticeId'),
        p_outcome: text(body, 'outcome'),
        p_reason: text(body, 'reason'),
      });
      if (error) return fail(describeTakedownError(error.message, error.hint));
      return NextResponse.json({ ok: true, decided: data });
    }
    case 'answer': {
      // The teacher's own answer. The database checks that the version is theirs.
      const { data, error } = await supabase.rpc('record_takedown_response', {
        p_notice_id: text(body, 'noticeId'),
        p_response: text(body, 'response'),
      });
      if (error) return fail(describeTakedownError(error.message, error.hint));
      return NextResponse.json({ ok: true, answer: data });
    }
    default:
      return fail('Unknown action.');
  }
}
