import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { checkAnswer } from '@/lib/practice';

/**
 * POST /api/learn/check — check one answer to one lesson question.
 *
 * A read, in a POST body, because the answer is the input and it can be long.
 * Nothing is created: `check_lesson_answer()` writes no attempt, no response and
 * no score, so there is no idempotency question here and no rate that matters.
 *
 * Entitlement is decided inside the function — a live enrolment pinned to the
 * version the question belongs to, whose learner the caller may act for —
 * because an RPC can be called without going through this route.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Expected a JSON body.' }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const questionId = typeof input.questionId === 'string' ? input.questionId : '';
  if (!questionId) {
    return NextResponse.json(
      { ok: false, message: 'Which question?' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in to check an answer.' }, { status: 401 });
  }

  const result = await checkAnswer(supabase, questionId, input.answer ?? null);
  if (!result.ok) {
    // A refusal is the learner's business, not a server fault: 403 when the
    // function refused on privilege, 400 for everything else it can say.
    const status = /not enrolled|sign in/i.test(result.message) ? 403 : 400;
    return NextResponse.json({ ok: false, message: result.message }, { status });
  }

  return NextResponse.json({
    ok: true,
    correct: result.correct,
    explanation: result.explanation,
  });
}
