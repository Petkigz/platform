import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  attachAssignmentAsset,
  createCourseAssignment,
  markAssignmentSubmission,
  removeAssignmentAsset,
  saveAssignmentDraft,
  setCourseAssignmentStatus,
  submitAssignment,
  updateCourseAssignmentDraft,
  validateAssignmentInput,
} from '@/lib/course-assignments';

export const dynamic = 'force-dynamic';

type Payload = {
  action?: unknown;
  assignmentId?: unknown;
  courseVersionId?: unknown;
  cohortId?: unknown;
  submissionId?: unknown;
  learnerProfileId?: unknown;
  mediaAssetId?: unknown;
  title?: unknown;
  instructions?: unknown;
  dueAfterDays?: unknown;
  dueAt?: unknown;
  acceptLate?: unknown;
  pointsPossible?: unknown;
  bodyText?: unknown;
  status?: unknown;
  score?: unknown;
  feedback?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const fail = (message: string, status: number) =>
  NextResponse.json({ ok: false, message }, { status });
const respond = (result: Awaited<ReturnType<typeof createCourseAssignment>>) =>
  result.ok
    ? NextResponse.json(result)
    : NextResponse.json({ ok: false, message: result.message }, { status: result.status });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  let body: Payload;
  try {
    body = await request.json() as Payload;
  } catch {
    return fail('Malformed request body.', 400);
  }

  if (body.action === 'create' || body.action === 'update_draft') {
    if (body.action === 'update_draft' && !isUuid(body.assignmentId))
      return fail('Choose a draft assignment.', 400);
    const checked = validateAssignmentInput({
      courseVersionId: body.courseVersionId,
      cohortId: body.cohortId,
      title: body.title,
      instructions: body.instructions,
      dueAfterDays: body.dueAfterDays,
      dueAt: body.dueAt,
      acceptLate: body.acceptLate,
      pointsPossible: body.pointsPossible,
    });
    if (!checked.ok) return fail(checked.message, 400);
    if (!isUuid(checked.value.courseVersionId) ||
        (checked.value.cohortId !== null && !isUuid(checked.value.cohortId)))
      return fail('Choose a valid course version and cohort.', 400);

    const outcome = body.action === 'create'
      ? await createCourseAssignment(supabase, checked.value)
      : await updateCourseAssignmentDraft(supabase, {
          ...checked.value,
          assignmentId: body.assignmentId as string,
        });
    return respond(outcome);
  }

  if (body.action === 'set_status') {
    if (!isUuid(body.assignmentId) || !['open', 'closed', 'cancelled'].includes(String(body.status)))
      return fail('Choose a valid assignment and status.', 400);
    return respond(await setCourseAssignmentStatus(
      supabase,
      body.assignmentId,
      body.status as 'open' | 'closed' | 'cancelled',
    ));
  }

  if (body.action === 'save_draft') {
    if (!isUuid(body.assignmentId) || !isUuid(body.learnerProfileId) || typeof body.bodyText !== 'string')
      return fail('Choose the assignment, learner and a written response.', 400);
    const result = await saveAssignmentDraft(supabase, {
      assignmentId: body.assignmentId,
      learnerProfileId: body.learnerProfileId,
      bodyText: text(body.bodyText),
    });
    return respond(result);
  }

  if (body.action === 'submit') {
    if (!isUuid(body.submissionId)) return fail('Choose a draft to submit.', 400);
    return respond(await submitAssignment(supabase, body.submissionId));
  }

  if (body.action === 'attach_asset' || body.action === 'remove_asset') {
    if (!isUuid(body.submissionId) || !isUuid(body.mediaAssetId))
      return fail('Choose the submission and file.', 400);
    const result = body.action === 'attach_asset'
      ? await attachAssignmentAsset(supabase, body.submissionId, body.mediaAssetId)
      : await removeAssignmentAsset(supabase, body.submissionId, body.mediaAssetId);
    return respond(result);
  }

  if (body.action === 'mark') {
    if (!isUuid(body.submissionId)) return fail('Choose a submission to mark.', 400);
    const score = body.score === null || body.score === undefined ||
      (typeof body.score === 'string' && body.score.trim() === '')
      ? null
      : typeof body.score === 'number'
        ? body.score
        : Number(body.score);
    if (score !== null && !Number.isFinite(score)) return fail('Enter a valid score.', 400);
    const outcome = await markAssignmentSubmission(supabase, {
      submissionId: body.submissionId,
      score,
      feedback: text(body.feedback),
    });
    return respond(outcome);
  }

  return fail('Choose a supported assignment action.', 400);
}
