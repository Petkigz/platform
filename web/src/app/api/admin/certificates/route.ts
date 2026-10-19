import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { issueCertificate, revokeCertificate } from '@/lib/certificates';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 }); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const [{ data: platformAdmin }, { data: supportAgent }] = await Promise.all([
    supabase.rpc('is_privileged', { p_user_id: user.id }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'support_agent' }),
  ]);
  if (platformAdmin !== true && supportAgent !== true) {
    return NextResponse.json({ ok: false, message: 'Only platform staff may manage certificates.' }, { status: 403 });
  }

  if (body.action === 'issue') {
    if (typeof body.enrolmentId !== 'string' || !UUID.test(body.enrolmentId)) {
      return NextResponse.json({ ok: false, message: 'Choose a valid completed enrolment.' }, { status: 400 });
    }
    const result = await issueCertificate(supabase, { enrolmentId: body.enrolmentId });
    if (!result.ok) {
      return NextResponse.json(result, { status: result.code === 'not_privileged' ? 403 : 400 });
    }
    return NextResponse.json(result, { status: 201 });
  }

  if (body.action === 'revoke') {
    if (typeof body.certificateId !== 'string' || !UUID.test(body.certificateId)) {
      return NextResponse.json({ ok: false, message: 'Choose a valid certificate.' }, { status: 400 });
    }
    if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500) {
      return NextResponse.json({ ok: false, message: 'Give a written reason under 500 characters.' }, { status: 400 });
    }
    const result = await revokeCertificate(supabase, {
      certificateId: body.certificateId,
      reason: body.reason,
    });
    if (!result.ok) {
      const status = /only platform administrators/i.test(result.message) ? 403
        : /not found/i.test(result.message) ? 404
        : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result, { status: 200 });
  }

  return NextResponse.json({ ok: false, message: 'Unsupported certificate action.' }, { status: 400 });
}
