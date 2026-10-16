import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { moderatePost } from '@/lib/discussion';

export const dynamic = 'force-dynamic';

type Body = {
  postId?: unknown;
  state?: unknown;
  note?: unknown;
};

const STATES = ['visible', 'hidden', 'removed'] as const;
type State = (typeof STATES)[number];

/**
 * POST /api/admin/discussion — approve, hide or remove a post.
 *
 * The privileged check happens twice: here, so the failure is a clean 403
 * rather than an RLS error the reviewer would read as a bug, and inside
 * `moderate_discussion_post()`, which is the one that actually matters. The
 * route is not the boundary.
 *
 * The decision is written to the governance audit trail by the function, so
 * "who approved this, and why was that one taken down" stays answerable after
 * the fact. That is the point of routing moderation through a function rather
 * than letting the dashboard issue an UPDATE.
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
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const postId = typeof payload.postId === 'string' ? payload.postId.trim() : '';
  const state = typeof payload.state === 'string' ? payload.state : '';
  const note = typeof payload.note === 'string' ? payload.note : undefined;

  if (!postId) {
    return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
  }
  if (!STATES.includes(state as State)) {
    return NextResponse.json(
      { error: `state must be one of: ${STATES.join(', ')}.` },
      { status: 400 },
    );
  }

  const result = await moderatePost(supabase, {
    postId,
    state: state as State,
    note,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, postId, state });
}
