import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { hifzRefusalOf } from '@/lib/hifz';

/**
 * Memorisation writes.
 *
 * One route with an `action`, like every other writer on the platform: nothing
 * here grants permission. The database decides who may touch a learner's record
 * (`can_access_learner()`), whether the feature is on (`learning.hifz`) and what
 * the schedule does with a verdict. This forwards and reports the answer.
 *
 * **It answers by a name, not by a sentence.** The board is read in
 * twenty-eight languages and has the sentence for each name
 * (`lib/hifz-board-words.ts`); a refused write comes back as
 * `{ ok: false, code: 'already_exists' }`. Until 2026-11-25 this sent an
 * English sentence, and for a refusal it did not know it sent whatever the
 * database had written. Nothing the database writes leaves this file now: an
 * answer with no known name is `refused`, and a write whose request failed on
 * the way is a 502, because whether it was saved is not known.
 */

type Action = 'add' | 'review' | 'status' | 'archive';

const refuse = (code: string, status = 400) => NextResponse.json({ ok: false, code }, { status });

/** A write that came back with an error: a refusal, or not an answer at all. */
const failed = (error: { message?: string | null; code?: string | null }) => {
  const { code, status } = hifzRefusalOf(error);
  return refuse(code, status);
};

export async function POST(request: Request) {
  // Not an answer about the list at all: the board reads a five hundred as
  // "could not confirm", which is the truth.
  if (!isSupabaseConfigured()) return refuse('not_configured', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse('refused');
  }

  const b = (body ?? {}) as {
    action?: unknown;
    learnerId?: unknown;
    label?: unknown;
    status?: unknown;
    passageId?: unknown;
    outcome?: unknown;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return refuse('not_signed_in', 401);

  const uuid = /^[0-9a-f-]{36}$/i;
  const isUuid = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);
  const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

  const action = b.action as Action | undefined;

  if (action === 'add') {
    // The board always sends whose list it is; a request without one was not made by it.
    if (!isUuid(b.learnerId)) return refuse('refused');
    if (str(b.label) === '') return refuse('label_required');

    const { data, error } = await supabase.rpc('add_hifz_passage', {
      p_learner: b.learnerId,
      p_label: str(b.label),
      p_status: b.status === 'memorised' ? 'memorised' : 'learning',
    });

    if (error) return failed(error);
    return NextResponse.json({ ok: true, value: { passageId: data } }, { status: 200 });
  }

  if (action === 'review') {
    if (!isUuid(b.passageId)) return refuse('passage_not_found');
    if (b.outcome !== 'solid' && b.outcome !== 'shaky') return refuse('bad_outcome');

    const { data, error } = await supabase.rpc('review_hifz_passage', {
      p_passage: b.passageId,
      p_outcome: b.outcome,
    });

    if (error) return failed(error);
    return NextResponse.json({ ok: true, value: data }, { status: 200 });
  }

  if (action === 'status') {
    if (!isUuid(b.passageId)) return refuse('passage_not_found');
    if (b.status !== 'learning' && b.status !== 'memorised') return refuse('bad_status');

    const { data, error } = await supabase.rpc('set_hifz_passage_status', {
      p_passage: b.passageId,
      p_status: b.status,
    });

    if (error) return failed(error);
    return NextResponse.json({ ok: true, value: data }, { status: 200 });
  }

  if (action === 'archive') {
    if (!isUuid(b.passageId)) return refuse('passage_not_found');

    const { error } = await supabase.rpc('archive_hifz_passage', { p_passage: b.passageId });

    if (error) return failed(error);
    return NextResponse.json({ ok: true, value: { archived: true } }, { status: 200 });
  }

  return refuse('refused');
}
