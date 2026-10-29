import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { hifzErrorMessage } from '@/lib/hifz';

/**
 * Memorisation writes.
 *
 * One route with an `action`, like every other writer on the platform: nothing
 * here grants permission. The database decides who may touch a learner's record
 * (`can_access_learner()`), whether the feature is on (`learning.hifz`) and what
 * the schedule does with a verdict. This forwards and reports the answer.
 *
 * The one thing it does decide is the *words*: a refused write comes back as a
 * sentence a learner can act on rather than as `hifz:already_exists`.
 */

type Action = 'add' | 'review' | 'status' | 'archive';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }

  const b = body as {
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
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }

  const uuid = /^[0-9a-f-]{36}$/i;
  const isUuid = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);
  const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

  const refuse = (message: string, status = 400) =>
    NextResponse.json({ ok: false, message }, { status });

  const action = b.action as Action | undefined;

  if (action === 'add') {
    if (!isUuid(b.learnerId)) return refuse('Choose whose list this belongs to.');
    if (str(b.label) === '') return refuse(hifzErrorMessage('hifz:label_required'));

    const { data, error } = await supabase.rpc('add_hifz_passage', {
      p_learner: b.learnerId,
      p_label: str(b.label),
      p_status: b.status === 'memorised' ? 'memorised' : 'learning',
    });

    if (error) return refuse(hifzErrorMessage(error.message));
    return NextResponse.json({ ok: true, value: { passageId: data } }, { status: 200 });
  }

  if (action === 'review') {
    if (!isUuid(b.passageId)) return refuse('That passage is missing.');
    if (b.outcome !== 'solid' && b.outcome !== 'shaky') {
      return refuse(hifzErrorMessage('hifz:bad_outcome'));
    }

    const { data, error } = await supabase.rpc('review_hifz_passage', {
      p_passage: b.passageId,
      p_outcome: b.outcome,
    });

    if (error) return refuse(hifzErrorMessage(error.message));
    return NextResponse.json({ ok: true, value: data }, { status: 200 });
  }

  if (action === 'status') {
    if (!isUuid(b.passageId)) return refuse('That passage is missing.');
    if (b.status !== 'learning' && b.status !== 'memorised') {
      return refuse(hifzErrorMessage('hifz:bad_status'));
    }

    const { data, error } = await supabase.rpc('set_hifz_passage_status', {
      p_passage: b.passageId,
      p_status: b.status,
    });

    if (error) return refuse(hifzErrorMessage(error.message));
    return NextResponse.json({ ok: true, value: data }, { status: 200 });
  }

  if (action === 'archive') {
    if (!isUuid(b.passageId)) return refuse('That passage is missing.');

    const { error } = await supabase.rpc('archive_hifz_passage', { p_passage: b.passageId });

    if (error) return refuse(hifzErrorMessage(error.message));
    return NextResponse.json({ ok: true, value: { archived: true } }, { status: 200 });
  }

  return refuse('Unknown action.');
}
