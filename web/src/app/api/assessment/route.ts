import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ownLearnerProfileId } from '@/lib/enrolment';
import { saveResponse, startAttempt, submitAttempt } from '@/lib/assessment';
import { isFlagEnabled } from '@/lib/flags';

/**
 * One endpoint, three verbs: start, answer, submit.
 *
 * The learner is always whoever is signed in, and the enrolment is resolved
 * from their own learner profile — the body cannot name either. Grading is
 * never done here: `grade_response()` is the only reader of `answer_key`, and
 * this module never sees it.
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
    assessmentId?: unknown;
    attemptId?: unknown;
    questionId?: unknown;
    content?: unknown;
  };

  const uuid = /^[0-9a-f-]{36}$/i;
  const action = typeof b.action === 'string' ? b.action : null;

  if (!action || !['start', 'answer', 'submit'].includes(action)) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'action must be start, answer or submit.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'not_signed_in', message: 'Sign in first.' },
      { status: 401 },
    );
  }

  // The gate is checked here as well as in the UI, because the UI hiding a
  // button is not a control. An in-flight attempt is still allowed to submit,
  // so turning the flag off mid-quiz does not strand a learner who was
  // already answering.
  if (action === 'start' && !(await isFlagEnabled(supabase, 'learning.assessments').catch(() => false))) {
    return NextResponse.json(
      {
        ok: false,
        code: 'rejected',
        message: 'Assessments are not enabled on this platform yet.',
      },
      { status: 403 },
    );
  }

  if (action === 'start') {
    if (typeof b.assessmentId !== 'string' || !uuid.test(b.assessmentId)) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'An assessment id is required.' },
        { status: 400 },
      );
    }

    const learnerProfileId = await ownLearnerProfileId(supabase, user.id);
    if (!learnerProfileId) {
      return NextResponse.json(
        { ok: false, code: 'no_enrolment', message: 'Your account has no learner profile yet.' },
        { status: 409 },
      );
    }

    // The enrolment comes from the database, keyed on the learner we just
    // resolved and on the assessment's own version. An attempt is always tied
    // to the enrolment that earns it — the body cannot name one.
    const { data: assessment } = await supabase
      .from('assessments')
      .select('id, course_version_id')
      .eq('id', b.assessmentId)
      .maybeSingle();

    const versionId = (assessment as { course_version_id?: string } | null)?.course_version_id;
    if (!versionId) {
      return NextResponse.json(
        { ok: false, code: 'no_assessment', message: 'That assessment does not exist.' },
        { status: 404 },
      );
    }

    const { data: matched } = await supabase
      .from('course_enrolments')
      .select('id')
      .eq('learner_profile_id', learnerProfileId)
      .eq('course_version_id', versionId ?? '')
      .eq('status', 'active')
      .eq('deleted_at', null)
      .maybeSingle();

    const enrolmentId = (matched as { id: string } | null)?.id;
    if (!enrolmentId) {
      return NextResponse.json(
        {
          ok: false,
          code: 'no_enrolment',
          message: 'You are not enrolled in the course this assessment belongs to.',
        },
        { status: 409 },
      );
    }

    const outcome = await startAttempt(supabase, {
      learnerProfileId,
      enrolmentId,
      assessmentId: b.assessmentId,
    });

    if (!outcome.ok) {
      return NextResponse.json(outcome, { status: 409 });
    }
    return NextResponse.json(outcome, { status: 201 });
  }

  if (action === 'answer') {
    if (typeof b.attemptId !== 'string' || !uuid.test(b.attemptId)) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'An attempt id is required.' },
        { status: 400 },
      );
    }
    if (typeof b.questionId !== 'string' || !uuid.test(b.questionId)) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'A question id is required.' },
        { status: 400 },
      );
    }

    const outcome = await saveResponse(supabase, {
      attemptId: b.attemptId,
      questionId: b.questionId,
      content: b.content ?? null,
    });

    if (!outcome.ok) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: outcome.message },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // submit
  if (typeof b.attemptId !== 'string' || !uuid.test(b.attemptId)) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'An attempt id is required.' },
      { status: 400 },
    );
  }

  const outcome = await submitAttempt(supabase, b.attemptId);
  if (!outcome.ok) {
    // The server refuses an attempt with unanswered questions. That is a real
    // answer to show the learner, not a server error.
    return NextResponse.json(
      { ok: false, code: 'rejected', message: outcome.message },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, attempt: outcome.attempt }, { status: 200 });
}
