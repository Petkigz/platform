import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { addLesson, addSection, createCourse, transitionVersion } from '@/lib/authoring';

/**
 * Course authoring writes.
 *
 * One route with an `action`, because these four are the whole authoring
 * surface and they share the same auth story: you are the author or you are
 * not, and the policies decide which. Nothing here grants permission — it
 * forwards to the database and reports what came back.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Malformed request.' },
      { status: 400 },
    );
  }

  const b = body as {
    action?: unknown;
    title?: unknown;
    versionId?: unknown;
    sectionId?: unknown;
    isPreview?: unknown;
    to?: unknown;
  };

  const uuid = /^[0-9a-f-]{36}$/i;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Sign in first.' },
      { status: 401 },
    );
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const isUuid = (v: unknown): v is string => typeof v === 'string' && uuid.test(v);

  // ---------------------------------------------------------------------
  if (b.action === 'create_course') {
    if (str(b.title).length === 0) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'A course title is required.' },
        { status: 400 },
      );
    }

    const outcome = await createCourse(supabase, {
      title: str(b.title),
      userId: user.id,
    });
    return json(outcome);
  }

  // ---------------------------------------------------------------------
  if (b.action === 'add_section') {
    if (!isUuid(b.versionId) || str(b.title).length === 0) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'A version and a title are required.' },
        { status: 400 },
      );
    }
    return json(await addSection(supabase, { versionId: b.versionId, title: str(b.title) }));
  }

  // ---------------------------------------------------------------------
  if (b.action === 'add_lesson') {
    if (!isUuid(b.sectionId) || str(b.title).length === 0) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'A section and a title are required.' },
        { status: 400 },
      );
    }
    return json(
      await addLesson(supabase, {
        sectionId: b.sectionId,
        title: str(b.title),
        isPreview: b.isPreview === true,
      }),
    );
  }

  // ---------------------------------------------------------------------
  if (b.action === 'transition') {
    if (!isUuid(b.versionId) || (b.to !== 'submitted' && b.to !== 'draft')) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'A version and a target status are required.' },
        { status: 400 },
      );
    }
    // The actor is the session, never the request body. Letting a caller name
    // the actor would make the transition table decorative.
    return json(
      await transitionVersion(supabase, {
        versionId: b.versionId,
        to: b.to,
        actorId: user.id,
      }),
    );
  }

  return NextResponse.json(
    { ok: false, code: 'rejected', message: 'Unknown action.' },
    { status: 400 },
  );
}

function json(outcome: { ok: boolean; code?: string; message?: string }) {
  if (outcome.ok) return NextResponse.json(outcome, { status: 200 });
  const status =
    outcome.code === 'duplicate' ? 409
    : outcome.code === 'locked' ? 409
    : 400;
  return NextResponse.json(outcome, { status });
}
