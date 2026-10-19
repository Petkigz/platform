import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createFamily } from '@/lib/family';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 }); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as { name?: unknown };
  if (body.name !== undefined && typeof body.name !== 'string') {
    return NextResponse.json({ ok: false, message: 'Use a text family name.' }, { status: 400 });
  }
  if (typeof body.name === 'string' && body.name.trim().length > 120) {
    return NextResponse.json({ ok: false, message: 'Keep the family name under 120 characters.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const result = await createFamily(supabase, typeof body.name === 'string' ? body.name : undefined);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
