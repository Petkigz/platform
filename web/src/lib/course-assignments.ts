import type { SupabaseClient } from '@supabase/supabase-js';

export const ASSIGNMENT_TEXT_MAX = 10_000;
export const ASSIGNMENT_FEEDBACK_MAX = 5_000;
export const ASSIGNMENT_FILE_MAX_BYTES = 25 * 1024 * 1024;
export const ASSIGNMENT_FILE_MAX_COUNT = 10;

export type AssignmentInput = {
  courseVersionId: string;
  cohortId: string | null;
  title: string;
  instructions: string;
  dueAfterDays: number | null;
  dueAt: string | null;
  acceptLate: boolean;
  pointsPossible: number | null;
};

export type AssignmentValidation =
  | { ok: true; value: AssignmentInput }
  | { ok: false; message: string };

/**
 * The form can produce strings, blank strings and NaN. Normalize them once at
 * the edge, and enforce the deliberate split between the two deadline clocks:
 * an ungrouped task is relative to enrolment; a cohort task is absolute.
 */
export function validateAssignmentInput(input: {
  courseVersionId: unknown;
  cohortId?: unknown;
  title: unknown;
  instructions?: unknown;
  dueAfterDays?: unknown;
  dueAt?: unknown;
  acceptLate: unknown;
  pointsPossible?: unknown;
}): AssignmentValidation {
  const courseVersionId = typeof input.courseVersionId === 'string'
    ? input.courseVersionId.trim()
    : '';
  if (!courseVersionId) return { ok: false, message: 'Choose a published course version.' };

  const cohortId = typeof input.cohortId === 'string' && input.cohortId.trim()
    ? input.cohortId.trim()
    : null;

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title || title.length > 200)
    return { ok: false, message: 'An assignment needs a title under 200 characters.' };

  const instructions = typeof input.instructions === 'string' ? input.instructions.trim() : '';
  if (instructions.length > ASSIGNMENT_TEXT_MAX)
    return { ok: false, message: `Keep instructions under ${ASSIGNMENT_TEXT_MAX} characters.` };

  let dueAfterDays: number | null = null;
  if (input.dueAfterDays !== null && input.dueAfterDays !== undefined && input.dueAfterDays !== '') {
    dueAfterDays = typeof input.dueAfterDays === 'number'
      ? input.dueAfterDays
      : Number(input.dueAfterDays);
    if (!Number.isInteger(dueAfterDays) || dueAfterDays < 1)
      return { ok: false, message: 'A relative deadline must be a whole number of days, at least one.' };
  }

  let dueAt: string | null = null;
  if (input.dueAt !== null && input.dueAt !== undefined && input.dueAt !== '') {
    if (typeof input.dueAt !== 'string' || !Number.isFinite(Date.parse(input.dueAt)))
      return { ok: false, message: 'Choose a valid due date and time.' };
    dueAt = new Date(input.dueAt).toISOString();
  }

  if (cohortId && dueAfterDays !== null)
    return { ok: false, message: 'A cohort assignment uses a calendar due date, not days after enrolment.' };
  if (!cohortId && dueAt !== null)
    return { ok: false, message: 'Self-paced work uses days after enrolment, not a shared calendar date.' };

  if (typeof input.acceptLate !== 'boolean')
    return { ok: false, message: 'Choose whether late work is accepted.' };

  let pointsPossible: number | null = null;
  if (input.pointsPossible !== null && input.pointsPossible !== undefined && input.pointsPossible !== '') {
    pointsPossible = typeof input.pointsPossible === 'number'
      ? input.pointsPossible
      : Number(input.pointsPossible);
    if (!Number.isFinite(pointsPossible) || pointsPossible <= 0)
      return { ok: false, message: 'Points possible must be greater than zero.' };
  }

  return {
    ok: true,
    value: {
      courseVersionId,
      cohortId,
      title,
      instructions,
      dueAfterDays,
      dueAt,
      acceptLate: input.acceptLate,
      pointsPossible,
    },
  };
}

export type AssignmentWriteResult =
  | { ok: true; id: string | null }
  | { ok: false; status: number; message: string };

export type CourseAssignment = {
  id: string;
  courseId: string;
  courseVersionId: string;
  cohortId: string | null;
  title: string;
  instructions: string;
  dueAfterDays: number | null;
  dueAt: string | null;
  acceptLate: boolean;
  pointsPossible: number | null;
  status: 'draft' | 'open' | 'closed' | 'cancelled';
  createdAt: string;
};

export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  learnerProfileId: string;
  courseEnrolmentId: string;
  bodyText: string;
  status: 'draft' | 'submitted' | 'graded';
  submittedAt: string | null;
  isLate: boolean | null;
  scoreEarned: number | null;
  feedback: string | null;
  markedAt: string | null;
};

export type AssignmentFileReference = {
  id: string;
  submissionId: string;
  mediaAssetId: string;
  position: number;
};

type AssignmentRow = {
  id: string;
  course_id: string;
  course_version_id: string;
  cohort_id: string | null;
  title: string;
  instructions: string;
  due_after_days: number | null;
  due_at: string | null;
  accept_late: boolean;
  points_possible: number | string | null;
  status: CourseAssignment['status'];
  created_at: string;
};

type SubmissionRow = {
  id: string;
  assignment_id: string;
  learner_profile_id: string;
  course_enrolment_id: string;
  body_text: string;
  status: AssignmentSubmission['status'];
  submitted_at: string | null;
  is_late: boolean | null;
  score_earned: number | string | null;
  feedback: string | null;
  marked_at: string | null;
};

function mapAssignment(row: AssignmentRow): CourseAssignment {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    courseVersionId: String(row.course_version_id),
    cohortId: row.cohort_id ? String(row.cohort_id) : null,
    title: String(row.title),
    instructions: String(row.instructions ?? ''),
    dueAfterDays: row.due_after_days === null ? null : Number(row.due_after_days),
    dueAt: row.due_at,
    acceptLate: Boolean(row.accept_late),
    pointsPossible: row.points_possible === null ? null : Number(row.points_possible),
    status: row.status,
    createdAt: String(row.created_at),
  };
}

function mapSubmission(row: SubmissionRow): AssignmentSubmission {
  return {
    id: String(row.id),
    assignmentId: String(row.assignment_id),
    learnerProfileId: String(row.learner_profile_id),
    courseEnrolmentId: String(row.course_enrolment_id),
    bodyText: String(row.body_text ?? ''),
    status: row.status,
    submittedAt: row.submitted_at,
    isLate: row.is_late,
    scoreEarned: row.score_earned === null ? null : Number(row.score_earned),
    feedback: row.feedback,
    markedAt: row.marked_at,
  };
}

export function mapAssignmentError(error: { message: string; code?: string }): { status: number; message: string } {
  const m = error.message;
  if (/not enabled|not available yet/i.test(m))
    return { status: 409, message: 'Assignments are not available right now.' };
  if (/only the course author|only the uploader|responsible for|insufficient privilege|row-level security/i.test(m))
    return { status: 403, message: 'You do not have permission to do that.' };
  if (/not found|no_data_found|does not exist/i.test(m) || error.code === 'P0002')
    return { status: 404, message: 'That assignment or submission could not be found.' };
  if (/deadline has passed|already submitted|not open|closed|cannot move|already graded|only a draft/i.test(m))
    return { status: 409, message: m };
  if (/permission denied/i.test(m))
    return { status: 403, message: 'You do not have permission to do that.' };
  if (/duplicate|unique/i.test(m))
    return { status: 409, message: 'This work already has a submission.' };
  return { status: 400, message: m };
}

async function rpcWrite(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<AssignmentWriteResult> {
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    const mapped = mapAssignmentError(error);
    return { ok: false, ...mapped };
  }
  return { ok: true, id: data === null || data === undefined ? null : String(data) };
}

export async function createCourseAssignment(
  client: SupabaseClient,
  input: AssignmentInput,
): Promise<AssignmentWriteResult> {
  return rpcWrite(client, 'create_course_assignment', {
    p_course_version_id: input.courseVersionId,
    p_cohort_id: input.cohortId,
    p_title: input.title,
    p_instructions: input.instructions,
    p_due_after_days: input.dueAfterDays,
    p_due_at: input.dueAt,
    p_accept_late: input.acceptLate,
    p_points_possible: input.pointsPossible,
  });
}

export async function updateCourseAssignmentDraft(
  client: SupabaseClient,
  input: AssignmentInput & { assignmentId: string },
): Promise<AssignmentWriteResult> {
  return rpcWrite(client, 'update_course_assignment_draft', {
    p_assignment_id: input.assignmentId,
    p_title: input.title,
    p_instructions: input.instructions,
    p_due_after_days: input.dueAfterDays,
    p_due_at: input.dueAt,
    p_accept_late: input.acceptLate,
    p_points_possible: input.pointsPossible,
  });
}

export async function setCourseAssignmentStatus(
  client: SupabaseClient,
  assignmentId: string,
  status: CourseAssignment['status'],
): Promise<AssignmentWriteResult> {
  return rpcWrite(client, 'set_course_assignment_status', {
    p_assignment_id: assignmentId,
    p_status: status,
  });
}

export async function saveAssignmentDraft(
  client: SupabaseClient,
  input: { assignmentId: string; learnerProfileId: string; bodyText: string },
): Promise<AssignmentWriteResult> {
  if (input.bodyText.length > ASSIGNMENT_TEXT_MAX)
    return { ok: false, status: 400, message: `Keep your answer under ${ASSIGNMENT_TEXT_MAX} characters.` };
  return rpcWrite(client, 'save_assignment_draft', {
    p_assignment_id: input.assignmentId,
    p_learner_profile_id: input.learnerProfileId,
    p_body_text: input.bodyText,
  });
}

export async function submitAssignment(
  client: SupabaseClient,
  submissionId: string,
): Promise<AssignmentWriteResult> {
  return rpcWrite(client, 'submit_assignment', { p_submission_id: submissionId });
}

export async function markAssignmentSubmission(
  client: SupabaseClient,
  input: { submissionId: string; score: number | null; feedback: string },
): Promise<AssignmentWriteResult> {
  if (input.feedback.length > ASSIGNMENT_FEEDBACK_MAX)
    return { ok: false, status: 400, message: `Keep feedback under ${ASSIGNMENT_FEEDBACK_MAX} characters.` };
  return rpcWrite(client, 'mark_assignment_submission', {
    p_submission_id: input.submissionId,
    p_score: input.score,
    p_feedback: input.feedback,
  });
}

export async function attachAssignmentAsset(
  client: SupabaseClient,
  submissionId: string,
  mediaAssetId: string,
): Promise<AssignmentWriteResult> {
  return rpcWrite(client, 'attach_assignment_asset', {
    p_submission_id: submissionId,
    p_media_asset_id: mediaAssetId,
  });
}

export async function removeAssignmentAsset(
  client: SupabaseClient,
  submissionId: string,
  mediaAssetId: string,
): Promise<AssignmentWriteResult> {
  return rpcWrite(client, 'remove_assignment_asset', {
    p_submission_id: submissionId,
    p_media_asset_id: mediaAssetId,
  });
}

const ASSIGNMENT_COLUMNS =
  'id, course_id, course_version_id, cohort_id, title, instructions, due_after_days, due_at, accept_late, points_possible, status, created_at';
const SUBMISSION_COLUMNS =
  'id, assignment_id, learner_profile_id, course_enrolment_id, body_text, status, submitted_at, is_late, score_earned, feedback, marked_at';

export async function fetchCourseAssignments(
  client: SupabaseClient,
  args: { courseId: string; courseVersionId?: string },
): Promise<CourseAssignment[]> {
  let query = client
    .from('course_assignments')
    .select(ASSIGNMENT_COLUMNS)
    .eq('course_id', args.courseId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (args.courseVersionId) query = query.eq('course_version_id', args.courseVersionId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as AssignmentRow[]).map(mapAssignment);
}

export async function fetchCourseAssignment(
  client: SupabaseClient,
  assignmentId: string,
): Promise<CourseAssignment | null> {
  const { data, error } = await client
    .from('course_assignments')
    .select(ASSIGNMENT_COLUMNS)
    .eq('id', assignmentId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapAssignment(data as unknown as AssignmentRow) : null;
}

export async function fetchAssignmentSubmissions(
  client: SupabaseClient,
  assignmentIds: string[],
): Promise<AssignmentSubmission[]> {
  if (assignmentIds.length === 0) return [];
  const { data, error } = await client
    .from('assignment_submissions')
    .select(SUBMISSION_COLUMNS)
    .in('assignment_id', assignmentIds)
    .order('submitted_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as SubmissionRow[]).map(mapSubmission);
}

export async function fetchAssignmentSubmissionsForLearner(
  client: SupabaseClient,
  args: { assignmentIds: string[]; learnerProfileId: string },
): Promise<AssignmentSubmission[]> {
  if (args.assignmentIds.length === 0) return [];
  const { data, error } = await client
    .from('assignment_submissions')
    .select(SUBMISSION_COLUMNS)
    .in('assignment_id', args.assignmentIds)
    .eq('learner_profile_id', args.learnerProfileId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as SubmissionRow[]).map(mapSubmission);
}

export async function fetchAssignmentSubmission(
  client: SupabaseClient,
  args: { assignmentId: string; learnerProfileId: string },
): Promise<AssignmentSubmission | null> {
  const { data, error } = await client
    .from('assignment_submissions')
    .select(SUBMISSION_COLUMNS)
    .eq('assignment_id', args.assignmentId)
    .eq('learner_profile_id', args.learnerProfileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSubmission(data as unknown as SubmissionRow) : null;
}

export async function fetchAssignmentFileReferences(
  client: SupabaseClient,
  submissionIds: string[],
): Promise<AssignmentFileReference[]> {
  if (submissionIds.length === 0) return [];
  const { data, error } = await client
    .from('assignment_submission_assets')
    .select('id, submission_id, media_asset_id, position')
    .in('submission_id', submissionIds)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as {
    id: string; submission_id: string; media_asset_id: string; position: number;
  }[]).map((row) => ({
    id: String(row.id),
    submissionId: String(row.submission_id),
    mediaAssetId: String(row.media_asset_id),
    position: Number(row.position),
  }));
}

/** Deadline shown to one learner: absolute for a cohort, relative to enrolment otherwise. */
export function assignmentDeadline(
  assignment: Pick<CourseAssignment, 'cohortId' | 'dueAt' | 'dueAfterDays'>,
  enrolledAt: string,
): Date | null {
  if (assignment.cohortId) return assignment.dueAt ? new Date(assignment.dueAt) : null;
  if (assignment.dueAfterDays === null) return null;
  const enrolled = new Date(enrolledAt);
  if (!Number.isFinite(enrolled.getTime())) return null;
  return new Date(enrolled.getTime() + assignment.dueAfterDays * 24 * 60 * 60 * 1000);
}

export const ASSIGNMENT_STATUS_LABEL: Record<CourseAssignment['status'], string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const SUBMISSION_STATUS_LABEL: Record<AssignmentSubmission['status'], string> = {
  draft: 'Draft — not submitted',
  submitted: 'Waiting for marking',
  graded: 'Marked',
};
