import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  CLAIM_ENGLISH,
  claimLearnerOf,
  claimReasonOf,
  claimStatusOf,
  claimedCourseOf,
  type ClaimOutcome,
} from '@/lib/seat-claim';
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
 *
 * **A refusal is a name with that name's own status.** The form has a sentence
 * for each name in the reader's language; the English beside it is for a caller
 * with no words of its own. The database's own text is logged and sent to
 * nobody.
 *
 * **An answer that is not the database's is `unconfirmed`, not a refusal.** A
 * code works once: if the request broke after the database had written, the code
 * is spent, and telling the reader "nothing was used" would send them back to
 * the school for a second one.
 *
 * **What is sent back is the course's title and nothing else.** The database
 * also answers with the school's order and the learner's profile; the form needs
 * neither.
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
  const body = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;

  const refuse = (code: ClaimOutcome) =>
    NextResponse.json({ ok: false, code, message: CLAIM_ENGLISH[code] }, { status: claimStatusOf(code) });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return refuse('not_signed_in');

  const code = normaliseSeatCode(typeof body.code === 'string' ? body.code : null);
  if (!code) return refuse('bad_code');

  // Somebody who is not the shape of a learner is nobody this account manages.
  // The database is not asked, so the code cannot be spent on a guess.
  const who = claimLearnerOf(body.learnerProfileId);
  if (!who.ok) return refuse('not_your_learner');

  const asked = await supabase
    .rpc('claim_institution_seat', {
      p_code_hash: createHash('sha256').update(code).digest('hex'),
      p_learner: who.learner,
    })
    .then((r) => r, () => ({ data: null, error: { code: '', message: 'the request could not be made' } }));

  if (asked.error) {
    const reason = claimReasonOf(asked.error);
    if (reason === 'refused' || reason === 'unconfirmed') {
      console.error(`institution: using a code was ${reason}:`, asked.error.message);
    }
    return refuse(reason);
  }

  return NextResponse.json({ ok: true, ...claimedCourseOf(asked.data) });
}
