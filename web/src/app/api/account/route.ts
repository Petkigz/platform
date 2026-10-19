import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { saveAccountProfile, type AccountProfileInput } from '@/lib/account';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 }); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (typeof body.displayName !== 'string' || typeof body.preferredLanguage !== 'string' || typeof body.timezone !== 'string') {
    return NextResponse.json({ ok: false, message: 'Check the profile fields and try again.' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const result = await saveAccountProfile(supabase, user.id, {
    displayName: body.displayName,
    preferredLanguage: body.preferredLanguage,
    timezone: body.timezone,
  } satisfies AccountProfileInput);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 200 });
}
