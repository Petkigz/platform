import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { addLessonSource, removeLessonSource, SOURCE_TYPES } from '@/lib/provenance';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 }); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const removing = body.action === 'remove';
  if (removing) {
    if (typeof body.sourceId !== 'string' || !UUID.test(body.sourceId))
      return NextResponse.json({ ok: false, message: 'Choose a valid source.' }, { status: 400 });
  } else if (
    typeof body.courseVersionId !== 'string' || !UUID.test(body.courseVersionId) ||
    typeof body.lessonId !== 'string' || !UUID.test(body.lessonId) ||
    typeof body.sourceType !== 'string' || !SOURCE_TYPES.includes(body.sourceType as (typeof SOURCE_TYPES)[number]) ||
    typeof body.title !== 'string'
  ) {
    return NextResponse.json({ ok: false, message: 'Choose a valid course version, lesson, type and title.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  let result;
  if (removing) {
    result = await removeLessonSource(supabase, body.sourceId as string);
  } else {
    const optional = (key: string) => typeof body[key] === 'string' ? body[key] as string : undefined;
    result = await addLessonSource(supabase, {
      courseVersionId: body.courseVersionId as string,
      lessonId: body.lessonId as string,
      sourceType: body.sourceType as (typeof SOURCE_TYPES)[number],
      title: body.title as string,
      authorOrCompiler: optional('authorOrCompiler'),
      editionOrVersion: optional('editionOrVersion'),
      referenceLocator: optional('referenceLocator'),
      url: optional('url'),
      anchor: optional('anchor'),
      notes: optional('notes'),
    });
  }
  if (!result.ok) {
    const status = /only the course author/i.test(result.message) ? 403
      : /locked with its course version/i.test(result.message) ? 409 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result, { status: removing ? 200 : 201 });
}
