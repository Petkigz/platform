import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { askAiSupport } from '@/lib/ai-support';

export const dynamic = 'force-dynamic';

/**
 * POST /api/learn/ask — one question to the study assistant.
 *
 * The route is thin on purpose. Everything that decides what may be answered lives
 * in `ai_support_ask()`: the flag, the ruling-phrase list, which lessons the caller
 * may cite, and whether a refusal opens a support case. If the route re-decided any
 * of that, there would be two boundaries and one of them would be wrong.
 *
 * The actor comes from the session. There is no user id, no learner id and no
 * "answer" in the request — a body that could name those would be a body that could
 * ask on somebody else's behalf.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'This deployment is not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to ask a question.' }, { status: 401 });
  }

  let body: { question?: unknown; courseId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question : '';
  const courseId = typeof body.courseId === 'string' && body.courseId.trim()
    ? body.courseId.trim()
    : null;

  const result = await askAiSupport(supabase, { question, courseId });
  if (!result.ok) {
    // 422 for a refusal the person can act on, 500 only when the payload was
    // unreadable — a distinction the form uses to decide whether to keep the text
    // in the box.
    const status = /will not render/.test(result.message) ? 500 : 422;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json({ ok: true, answer: result.answer });
}
