import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Recording that somebody looked at a handed-in file.
 *
 * Deliberately **not** under `/api/admin`: the person who most often records a
 * review is the teacher the work was handed to, not a staff member, and the screen
 * they do it from is the course's own assignment queue. The authority is
 * `record_coursework_review()`, which reads the session and decides — the course
 * author or the named safeguarding owner, never the household. This route repeats none of that rule; it
 * refuses only what it can see for itself.
 *
 * That is why the route can be open to any signed-in caller without opening
 * anything: an unauthorised call gets the database's refusal in the database's own
 * words, and the words are what the screen shows.
 *
 * The note is optional in the request and required by the database for a concern.
 * Both are true on purpose: "a concern needs words" is a rule about the record, not
 * about the payload, and this route must not be the place where it can be avoided.
 */

type Payload = {
  assetId?: unknown;
  decision?: unknown;
  note?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fail = (message: string, status: number) =>
  NextResponse.json({ ok: false, error: message }, { status });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown = null;
  try {
    raw = await request.json();
  } catch {
    return fail('A review needs a body.', 400);
  }

  const body = (raw && typeof raw === 'object' ? raw : {}) as Payload;
  const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : '';
  const decision = typeof body.decision === 'string' ? body.decision.trim().toLowerCase() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : '';

  if (!UUID.test(assetId)) return fail('Which file? No file was named.', 400);
  if (decision !== 'clear' && decision !== 'concern') {
    return fail('A review is either clear or a concern.', 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const { data, error } = await supabase.rpc('record_coursework_review', {
    p_asset_id: assetId,
    p_decision: decision,
    p_note: note === '' ? null : note,
  });

  if (error) {
    const message = error.message;
    // The three refusals a person can act on keep their own sentence and their own
    // status; everything else is a 500 with the database's words, because a route
    // is the wrong place to invent a reason.
    if (/family that sent a file|only the teacher the work was handed to|not available for your review/i.test(message)) {
      return fail(message, 403);
    }
    if (/needs a sentence|has been deleted|nothing to look at yet|not handed in as coursework/i.test(message)) {
      return fail(message, 409);
    }
    if (/sign in/i.test(message)) return fail(message, 401);
    return fail(message, 500);
  }

  return NextResponse.json({ ok: true, review: data });
}
