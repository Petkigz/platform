import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ACCOUNT_PROFILE_SENTENCES, saveAccountProfile, type AccountProfileInput } from '@/lib/account';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, code: 'malformed', message: ACCOUNT_PROFILE_SENTENCES.malformed }, { status: 400 }); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (typeof body.displayName !== 'string' || typeof body.preferredLanguage !== 'string' || typeof body.timezone !== 'string') {
    return NextResponse.json({ ok: false, code: 'malformed', message: ACCOUNT_PROFILE_SENTENCES.malformed }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: 'signed_out', message: ACCOUNT_PROFILE_SENTENCES.signed_out }, { status: 401 });
  }

  const result = await saveAccountProfile(supabase, user.id, {
    displayName: body.displayName,
    preferredLanguage: body.preferredLanguage,
    timezone: body.timezone,
  } satisfies AccountProfileInput);
  if (!result.ok) {
    // A typing mistake is the reader's to fix (400). An update the database
    // did not make is ours (502), and a profile row that is not there is a
    // session that has outlived its account (409).
    const status = result.code === 'failed' ? 502 : result.code === 'not_found' ? 409 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result, { status: 200 });
}
