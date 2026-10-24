import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  activateAssessment, addAssessmentQuestion, createAssessment,
  markManualAssessmentResponse,
  type AssessmentType, type QuestionType,
} from '@/lib/assessment';
import {
  addLesson, addLessonResource, addSection, createCourse, createCourseVersionFrom,
  moveCourseContent, setAudience, setLessonPreview, setSubjects,
  type MoveDirection, type ReorderableContentType,
  transitionVersion, validateAddResource, type AddResourceAccess, type ResourceType,
} from '@/lib/authoring';

/**
 * Course authoring writes.
 *
 * One route with an `action`, because these authoring writes share the same
 * auth story: you are the author or you are not, and the policies decide which. Nothing here grants permission — it
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
    courseId?: unknown;
    audience?: unknown;
    ageBands?: unknown;
    title?: unknown;
    type?: unknown;
    versionId?: unknown;
    sourceVersionId?: unknown;
    contentType?: unknown;
    contentId?: unknown;
    direction?: unknown;
    assessmentId?: unknown;
    responseId?: unknown;
    score?: unknown;
    isCorrect?: unknown;
    feedback?: unknown;
    passThreshold?: unknown;
    attemptLimit?: unknown;
    lessonId?: unknown;
    instructions?: unknown;
    prompt?: unknown;
    choices?: unknown;
    answerId?: unknown;
    answerIds?: unknown;
    gradingMethod?: unknown;
    sectionId?: unknown;
    isPreview?: unknown;
    to?: unknown;
    codes?: unknown;
    resourceType?: unknown;
    url?: unknown;
    name?: unknown;
    access?: unknown;
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
  if (b.action === 'create_version') {
    if (!isUuid(b.sourceVersionId)) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'Choose a published version to copy.' },
        { status: 400 },
      );
    }
    return json(await createCourseVersionFrom(supabase, b.sourceVersionId));
  }

  // ---------------------------------------------------------------------
  if (b.action === 'mark_manual_response') {
    if (!isUuid(b.responseId) || typeof b.score !== 'number' || typeof b.isCorrect !== 'boolean') {
      return NextResponse.json(
        { ok: false, message: 'Choose a score and verdict for this response.' },
        { status: 400 },
      );
    }
    const outcome = await markManualAssessmentResponse(supabase, {
      responseId: b.responseId,
      score: b.score,
      isCorrect: b.isCorrect,
      // Optional, and validated in the library and again in the database: a
      // comment is the part of marking a learner can act on, so refusing it here
      // for being slightly too long would be the wrong kind of strict.
      feedback:
        typeof b.feedback === 'string' || b.feedback === null || b.feedback === undefined
          ? b.feedback
          : '',
    });
    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 400 });
  }

  // ---------------------------------------------------------------------
  if (b.action === 'create_assessment') {
    if (
      !isUuid(b.versionId) || typeof b.title !== 'string' ||
      (b.type !== 'practice' && b.type !== 'graded' && b.type !== 'final') ||
      (b.passThreshold !== null && typeof b.passThreshold !== 'number') ||
      (b.attemptLimit !== null && typeof b.attemptLimit !== 'number') ||
      (b.lessonId !== null && typeof b.lessonId !== 'string') ||
      typeof b.instructions !== 'string'
    ) {
      return NextResponse.json(
        { ok: false, message: 'Check the assessment details and try again.' },
        { status: 400 },
      );
    }
    if (b.lessonId !== null && !isUuid(b.lessonId)) {
      return NextResponse.json(
        { ok: false, message: 'Choose a lesson from this version.' },
        { status: 400 },
      );
    }
    const outcome = await createAssessment(supabase, {
      versionId: b.versionId,
      title: b.title,
      type: b.type as AssessmentType,
      passThreshold: b.passThreshold,
      attemptLimit: b.attemptLimit,
      lessonId: b.lessonId,
      instructions: b.instructions,
    });
    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 400 });
  }

  // ---------------------------------------------------------------------
  if (b.action === 'add_assessment_question') {
    const validQuestionType =
      b.type === 'single_choice' || b.type === 'multiple_choice' || b.type === 'true_false';
    const validGradingMethod = b.gradingMethod === 'automatic';
    const choicesValid = Array.isArray(b.choices) && b.choices.every((choice) =>
      typeof choice === 'object' && choice !== null &&
      typeof (choice as { id?: unknown }).id === 'string' &&
      typeof (choice as { text?: unknown }).text === 'string');
    if (
      !isUuid(b.assessmentId) || !validQuestionType || !validGradingMethod ||
      typeof b.prompt !== 'string' || !choicesValid ||
      (b.answerId !== undefined && typeof b.answerId !== 'string') ||
      (b.answerIds !== undefined &&
        (!Array.isArray(b.answerIds) || !b.answerIds.every((id) => typeof id === 'string')))
    ) {
      return NextResponse.json(
        { ok: false, message: 'Check the question details and try again.' },
        { status: 400 },
      );
    }
    const outcome = await addAssessmentQuestion(supabase, {
      assessmentId: b.assessmentId,
      type: b.type as QuestionType,
      gradingMethod: b.gradingMethod as 'automatic' | 'manual',
      prompt: b.prompt,
      choices: b.choices as { id: string; text: string }[],
      answerId: b.answerId as string | undefined,
      answerIds: b.answerIds as string[] | undefined,
    });
    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 400 });
  }

  // ---------------------------------------------------------------------
  if (b.action === 'activate_assessment') {
    if (!isUuid(b.assessmentId)) {
      return NextResponse.json(
        { ok: false, message: 'Choose an assessment to activate.' },
        { status: 400 },
      );
    }
    const outcome = await activateAssessment(supabase, b.assessmentId);
    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 400 });
  }

  // ---------------------------------------------------------------------
  if (b.action === 'move_content') {
    if (
      !isUuid(b.contentId) ||
      (b.contentType !== 'section' && b.contentType !== 'lesson' && b.contentType !== 'resource') ||
      (b.direction !== 'up' && b.direction !== 'down')
    ) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'Choose a section, lesson or content item and move it up or down.' },
        { status: 400 },
      );
    }
    return json(await moveCourseContent(supabase, {
      contentType: b.contentType as ReorderableContentType,
      contentId: b.contentId,
      direction: b.direction as MoveDirection,
    }));
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
    const created = await addLesson(supabase, {
      sectionId: b.sectionId,
      title: str(b.title),
      // Preview status is set by the audited RPC below, not by a direct insert.
      isPreview: false,
    });
    if (!created.ok || b.isPreview !== true) return json(created);
    const preview = await setLessonPreview(supabase, {
      lessonId: created.value.lessonId,
      isPreview: true,
    });
    return preview.ok ? json(created) : json(preview);
  }

  // ---------------------------------------------------------------------
  if (b.action === 'set_preview') {
    if (!isUuid(b.lessonId) || typeof b.isPreview !== 'boolean') {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'A lesson and preview setting are required.' },
        { status: 400 },
      );
    }
    return json(await setLessonPreview(supabase, {
      lessonId: b.lessonId,
      isPreview: b.isPreview,
    }));
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

  // ---------------------------------------------------------------------
  if (b.action === 'set_subjects') {
    if (!isUuid(b.versionId) || !Array.isArray(b.codes)) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'A version and a list of subject codes are required.' },
        { status: 400 },
      );
    }
    // Codes are validated against subject_areas in the database, so a typo is
    // reported by name rather than becoming a foreign key violation on a uuid.
    return json(
      await setSubjects(supabase, {
        versionId: b.versionId,
        codes: (b.codes as unknown[]).filter((c): c is string => typeof c === 'string'),
      }),
    );
  }

  // ---------------------------------------------------------------------
  if (b.action === 'set_audience') {
    // Who a course is for sits on the course, not the version, so this is not
    // blocked by a published version the way every other write here is.
    if (!isUuid(b.courseId) || typeof b.audience !== 'string' || !Array.isArray(b.ageBands)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'rejected',
          message: 'A course, an audience and a list of age bands are required.',
        },
        { status: 400 },
      );
    }
    return json(
      await setAudience(supabase, {
        courseId: b.courseId,
        audience: b.audience,
        ageBands: (b.ageBands as unknown[]).filter((x): x is string => typeof x === 'string'),
      }),
    );
  }

  // ---------------------------------------------------------------------
  if (b.action === 'add_resource') {
    // A lesson with no resource is an empty page. Until now nothing could add
    // one, so every lesson published on this platform was blank.
    if (
      !isUuid(b.lessonId) ||
      typeof b.resourceType !== 'string' ||
      typeof b.url !== 'string' ||
      typeof b.name !== 'string'
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: 'rejected',
          message: 'A lesson, a content type, a URL and a name are required.',
        },
        { status: 400 },
      );
    }

    if (b.access !== undefined && b.access !== 'enrolled' && b.access !== 'public_preview') {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'Choose enrolled access or public preview.' },
        { status: 400 },
      );
    }

    // Validated here so the teacher reads a sentence rather than the CHECK
    // constraint name — the column requires ^https://.
    const check = validateAddResource({
      lessonId: b.lessonId,
      resourceType: b.resourceType as ResourceType,
      url: b.url,
      name: b.name,
      access: b.access as AddResourceAccess | undefined,
    });
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: check.message },
        { status: 400 },
      );
    }

    return json(
      await addLessonResource(supabase, {
        lessonId: b.lessonId,
        resourceType: b.resourceType as ResourceType,
        url: b.url,
        name: b.name,
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
