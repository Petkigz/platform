import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { institutionRefusal } from '@/lib/institution';
import { normaliseSeatCode } from '@/lib/seats';

export const dynamic = 'force-dynamic';

/**
 * Redeeming a seat code.
 *
 * A code is a bearer token, so it is hashed here and only the hash is sent to the
 * database — the same treatment institution API keys get, and the reason the seat
 * table cannot be replayed into thirty free courses from a dump.
 *
 * The code is normalised before hashing: a parent reading `ABCDE-FGHJK` off a
 * school letter in capitals, with a dash, has typed the right thing. A code
 * containing a character our alphabet excludes is refused rather than guessed at,
 * because guessing would spend somebody else's seat.
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

  const code = normaliseSeatCode(typeof body.code === 'string' ? body.code : null);
  if (!code) {
    return NextResponse.json(
      {
        ok: false,
        code: 'bad_code',
        message: 'That code does not look like one of ours. Check it and try again.',
      },
      { status: 400 },
    );
  }

  const learnerId = typeof body.learnerProfileId === 'string' && body.learnerProfileId !== ''
    ? body.learnerProfileId
    : null;

  const { data, error } = await supabase.rpc('claim_institution_seat', {
    p_code_hash: createHash('sha256').update(code).digest('hex'),
    p_learner: learnerId,
  });

  if (error) {
    const refusal = institutionRefusal(error.message);
    return NextResponse.json({ ok: false, ...refusal }, { status: 409 });
  }

  return NextResponse.json({ ok: true, ...(data as object) });
}
