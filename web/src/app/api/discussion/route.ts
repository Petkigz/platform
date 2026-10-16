import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { postToDiscussion } from '@/lib/discussion';

export const dynamic = 'force-dynamic';

type Body = {
  lessonId?: unknown;
  body?: unknown;
  parentId?: unknown;
};

/**
 * POST /api/discussion — ask a question or reply in a lesson thread.
 *
 * Whether the post is held is not decided here. The insert trigger computes
 * who the author is and overwrites the supplied visibility state, so this
 * route could not publish a learner's post even if it tried. What it does is
 * check the flag first, so the caller gets a plain sentence rather than a
 * check-violation error.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to join the discussion.' }, { status: 401 });
  }

  const enabled = await isFlagEnabled(supabase, 'learning.discussion');
  if (!enabled) {
    return NextResponse.json(
      { error: 'Discussion is not open yet.', code: 'flag_disabled' },
      { status: 409 },
    );
  }

  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const lessonId = typeof payload.lessonId === 'string' ? payload.lessonId.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body : '';
  const parentId = typeof payload.parentId === 'string' ? payload.parentId : null;

  if (!lessonId) {
    return NextResponse.json({ error: 'lessonId is required.' }, { status: 400 });
  }
  // A hard ceiling. The table only requires non-blank, but an unbounded post on
  // a lesson thread is how a discussion becomes unreadable.
  if (body.length > 4000) {
    return NextResponse.json(
      { error: 'That is too long. Keep it under 4000 characters.' },
      { status: 400 },
    );
  }

  const result = await postToDiscussion(supabase, { lessonId, body, parentId });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  // `held` is read back from the row, not assumed. Telling someone "posted!"
  // when it is sitting in a review queue is how they conclude the site is
  // broken.
  return NextResponse.json({ ok: true, id: result.id, held: result.held });
}
