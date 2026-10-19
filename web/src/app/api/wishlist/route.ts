import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { removeSavedCourse, saveCourse, setSavedNote } from '@/lib/wishlist';

export const dynamic = 'force-dynamic';

type Body = {
  action?: unknown;
  courseId?: unknown;
  savedId?: unknown;
  note?: unknown;
};

/**
 * POST /api/wishlist — save a course, edit the note, or remove it.
 *
 * The flag is checked here for saving and for editing a note, and deliberately
 * *not* for removing: switching the feature off has to leave a learner able to
 * clear their own list. The database enforces the same asymmetry, so this route
 * agreeing with it is a courtesy to the caller, not the control.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to save a course.' }, { status: 401 });
  }

  const action = payload.action;

  if (action === 'remove') {
    const result = await removeSavedCourse(
      supabase,
      typeof payload.savedId === 'string' ? payload.savedId : '',
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  }

  const open = await isFlagEnabled(supabase, 'learning.wishlist').catch(() => false);
  if (!open) {
    return NextResponse.json(
      { error: 'Saved courses are not enabled on this platform yet.', code: 'flag_disabled' },
      { status: 409 },
    );
  }

  if (action === 'save') {
    const result = await saveCourse(supabase, {
      courseId: typeof payload.courseId === 'string' ? payload.courseId : '',
      note: payload.note,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, id: result.value.id }, { status: 201 });
  }

  if (action === 'note') {
    const result = await setSavedNote(supabase, {
      savedId: typeof payload.savedId === 'string' ? payload.savedId : '',
      note: payload.note,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Choose save, note or remove.' }, { status: 400 });
}
