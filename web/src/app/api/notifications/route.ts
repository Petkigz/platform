import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { markReadIdsOf } from '@/lib/notifications';

/**
 * POST /api/notifications — mark in-app messages read.
 *
 * The database function does the ownership check: an id that is somebody
 * else's is simply not marked. This route decides that somebody is signed
 * in, and that the request names what it means. Nothing here can write a
 * notification; those come from the events that cause them.
 *
 * **A request has to name its messages.** `mark_notifications_read(null)`
 * marks every message the caller has, and this route used to send null
 * whenever the body held no usable list, so a malformed request marked
 * everything read. See `markReadIdsOf`.
 *
 * **Every refusal is named** (`code`). The page says its own sentence in the
 * reader's language; `message` is English for a caller with no words of its
 * own and is never the database's sentence, which is logged instead.
 */
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

type Code = 'rejected' | 'invalid' | 'not_authorized' | 'failed';
const ENGLISH: Record<Code, string> = {
  rejected: 'Supabase is not configured.',
  invalid: 'Name the messages to mark as read.',
  not_authorized: 'Sign in first.',
  failed: 'They could not be marked as read just now.',
};
const refuse = (code: Code, status: number) =>
  NextResponse.json({ ok: false, code, message: ENGLISH[code] }, { status, headers: NO_STORE });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return refuse('rejected', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse('invalid', 400);
  }
  const ids = markReadIdsOf(body);
  if (ids === null) return refuse('invalid', 400);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('not_authorized', 401);

    const { data, error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
    if (error) {
      if (error.code === '42501') return refuse('not_authorized', 401);
      console.error('[notifications] mark read refused:', error.code, error.message);
      return refuse('failed', 500);
    }
    const marked = typeof data === 'number' && Number.isSafeInteger(data) && data >= 0 ? data : 0;
    return NextResponse.json({ ok: true, marked }, { headers: NO_STORE });
  } catch (error) {
    console.error('[notifications] mark read got no answer:', error instanceof Error ? error.message : error);
    return refuse('failed', 500);
  }
}
