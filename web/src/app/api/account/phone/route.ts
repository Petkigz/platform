import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Save or clear the signed-in person's phone number.
 *
 * The work is done by `set_my_phone()`/`clear_my_phone()` in the database, which
 * normalise to E.164, refuse a country they do not have a dial code for, and
 * refuse to write at all while `platform.phone_format` is off. This route does
 * one thing they cannot: it turns a refusal into a sentence the form can show
 * rather than a 500.
 *
 * It deliberately does **not** validate the number itself. A second validator in
 * the request path would be a second answer to "is this a real number", and the
 * one that decides is the one that stores it.
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

  if (body.clear === true) {
    const { data, error } = await supabase.rpc('clear_my_phone');
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    const state = (data ?? {}) as { phoneE164?: string | null };
    return NextResponse.json({ ok: true, phoneE164: state.phoneE164 ?? null });
  }

  if (typeof body.phone !== 'string' || typeof body.country !== 'string') {
    return NextResponse.json(
      { ok: false, message: 'Type a number and choose its country.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc('set_my_phone', {
    p_phone: body.phone,
    p_country: body.country,
  });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  const state = (data ?? {}) as { phoneE164?: string | null; phoneCountry?: string | null };
  return NextResponse.json({
    ok: true,
    phoneE164: state.phoneE164 ?? null,
    phoneCountry: state.phoneCountry ?? null,
  });
}
