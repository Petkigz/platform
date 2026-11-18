import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { asciiDigits } from '@/lib/phone';
import {
  phoneCodeOf,
  phoneRefusal,
  phoneStatusOf,
  type PhoneCode,
  type PhoneParts,
} from '@/lib/phone-outcome';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store' };

/** A refusal, by name, with the status that name is always answered with. */
function refuse(code: PhoneCode, parts: PhoneParts = {}) {
  return NextResponse.json(phoneRefusal(code, parts), { status: phoneStatusOf(code), headers: NO_STORE });
}

/**
 * Save or clear the signed-in person's phone number.
 *
 * The work is done by `set_my_phone()`/`clear_my_phone()` in the database, which
 * normalise to E.164, refuse a country they do not have a dial code for, and
 * refuse to store a number while `platform.phone_format` is off. Removing one is
 * never refused for that: a number stored before the switch went off can still
 * be taken away.
 *
 * It deliberately does **not** validate the number itself. A second validator in
 * the request path would be a second answer to "is this a real number", and the
 * one that decides is the one that stores it. The one thing done to what was
 * typed is that digits of another script are written as the ten the database
 * reads (`asciiDigits`): `۰۹۱۲…` is a number to the person whose keyboard
 * types it, and the database would strip every digit of it as punctuation.
 *
 * Every refusal has a name (`lib/phone-outcome.ts`) and its own status. No
 * sentence the database wrote is forwarded; beside a name go only the digits
 * that fill its sentence's gaps. A reply that is not a stored number, or the
 * absence of one, is `failed`: nothing is known about what happened.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return refuse('malformed');
    }
    const body = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('signed_out');

    const clearing = body.clear === true;
    if (!clearing && (typeof body.phone !== 'string' || typeof body.country !== 'string')) {
      return refuse('malformed');
    }

    const { data, error } = clearing
      ? await supabase.rpc('clear_my_phone')
      : await supabase.rpc('set_my_phone', { p_phone: asciiDigits(body.phone as string), p_country: body.country });
    if (error) {
      const { code, ...parts } = phoneCodeOf(error);
      return refuse(code, parts);
    }

    // What is stored now, as the database says it. Anything that is not that
    // (no object, a number after a removal, nothing after a save) is unknown.
    const state = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    const kept = state && typeof state.phoneE164 === 'string' && state.phoneE164 !== '' ? state.phoneE164 : null;
    const blank = state !== null && (state.phoneE164 === null || state.phoneE164 === undefined);
    if (!state || (clearing ? !blank : kept === null)) return refuse('failed');

    return NextResponse.json(
      {
        ok: true,
        phoneE164: kept,
        phoneCountry: kept && typeof state.phoneCountry === 'string' ? state.phoneCountry : null,
      },
      { headers: NO_STORE },
    );
  } catch {
    // Nothing is known about what happened, so nothing is claimed.
    return refuse('failed');
  }
}
