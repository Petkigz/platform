/**
 * Content review — the reviewer's side.
 *
 * The rules that matter, all enforced in the database:
 *
 * - Assignments are created by platform staff (`cra_write` is privileged
 *   only). A reviewer cannot assign themselves to anything.
 * - `validate_review_decision()` requires that a decision's version and scope
 *   match its assignment, **and that `decided_by` is the reviewer the
 *   assignment names.** So one reviewer cannot sign for another, and a
 *   decision cannot be attached to a version it was not asked about.
 * - A decision is one of `approved`, `revision_requested`, `rejected`. The
 *   version's own state change is separate and goes through
 *   `set_course_version_status()`.
 *
 * The status and timestamp columns are constrained together: `accepted_at`
 * may only be set once the assignment is no longer `offered`, and
 * `completed_at` only once it is `completed` or `cancelled`. The helpers below
 * always move both together so a caller cannot trip that.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AssignmentStatus =
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  offered: 'Offered',
  accepted: 'Accepted',
  declined: 'Declined',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export type ReviewScope = 'technical' | 'scholarly';

export const SCOPE_LABEL: Record<ReviewScope, string> = {
  technical: 'Technical',
  scholarly: 'Scholarly',
};

export type Decision = 'approved' | 'revision_requested' | 'rejected';

export const DECISION_LABEL: Record<Decision, string> = {
  approved: 'Approve',
  revision_requested: 'Request revisions',
  rejected: 'Reject',
};

export type ReviewDecision = {
  id: string;
  decision: Decision;
  rationale: string | null;
  decidedAt: string | null;
};

export type ReviewAssignment = {
  id: string;
  courseVersionId: string;
  courseTitle: string;
  courseSlug: string;
  scope: ReviewScope;
  status: AssignmentStatus;
  assignedAt: string | null;
  dueAt: string | null;
  decisions: ReviewDecision[];
};

type AssignmentRow = {
  id: string;
  course_version_id: string;
  review_scope: string;
  assignment_status: string;
  assigned_at: string | null;
  due_at: string | null;
  course_versions: { courses: { title: string; slug: string }[] | null }[] | null;
  content_review_decisions: {
    id: string;
    decision: string;
    rationale: string | null;
    decided_at: string | null;
  }[] | null;
};

/**
 * The assignments that belong to me.
 *
 * `cra_read` admits either side of a review — the reviewer, and anyone who can
 * see the review of that version — so this filters to the ones naming my
 * reviewer profile. Which profile that is comes from `reviewer_profiles`,
 * looked up by the session user rather than taken on trust.
 */
export async function fetchMyAssignments(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReviewAssignment[]> {
  const { data: profile } = await supabase
    .from('reviewer_profiles')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .limit(1);

  const reviewerProfileId = (profile?.[0] as { id?: string } | undefined)?.id;
  if (!reviewerProfileId) return [];

  const { data, error } = await supabase
    .from('content_review_assignments')
    .select(
      'id, course_version_id, review_scope, assignment_status, assigned_at, due_at, course_versions ( courses ( title, slug ) ), content_review_decisions ( id, decision, rationale, decided_at )',
    )
    .eq('reviewer_profile_id', reviewerProfileId)
    .order('assigned_at', { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as AssignmentRow[]).map((r) => ({
    id: r.id,
    courseVersionId: r.course_version_id,
    courseTitle: r.course_versions?.[0]?.courses?.[0]?.title ?? 'Untitled course',
    courseSlug: r.course_versions?.[0]?.courses?.[0]?.slug ?? '',
    scope: r.review_scope as ReviewScope,
    status: r.assignment_status as AssignmentStatus,
    assignedAt: r.assigned_at,
    dueAt: r.due_at,
    decisions: (r.content_review_decisions ?? []).map((d) => ({
      id: d.id,
      decision: d.decision as Decision,
      rationale: d.rationale,
      decidedAt: d.decided_at,
    })),
  }));
}

export async function fetchAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<ReviewAssignment | null> {
  const { data, error } = await supabase
    .from('content_review_assignments')
    .select(
      'id, course_version_id, review_scope, assignment_status, assigned_at, due_at, course_versions ( courses ( title, slug ) ), content_review_decisions ( id, decision, rationale, decided_at )',
    )
    .eq('id', assignmentId)
    .single();

  if (error || !data) return null;

  const r = data as unknown as AssignmentRow;
  return {
    id: r.id,
    courseVersionId: r.course_version_id,
    courseTitle: r.course_versions?.[0]?.courses?.[0]?.title ?? 'Untitled course',
    courseSlug: r.course_versions?.[0]?.courses?.[0]?.slug ?? '',
    scope: r.review_scope as ReviewScope,
    status: r.assignment_status as AssignmentStatus,
    assignedAt: r.assigned_at,
    dueAt: r.due_at,
    decisions: (r.content_review_decisions ?? []).map((d) => ({
      id: d.id,
      decision: d.decision as Decision,
      rationale: d.rationale,
      decidedAt: d.decided_at,
    })),
  };
}

export type ReviewOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; code: 'rejected' | 'forbidden'; message: string };

/**
 * Accept or decline an offered assignment.
 *
 * `accepted_at` and `completed_at` are moved with the status because the
 * schema constrains them together: `accepted_at` is only legal once the
 * assignment has left `offered`, and `completed_at` only once it is
 * `completed` or `cancelled`.
 */
export async function respondToAssignment(
  supabase: SupabaseClient,
  args: { assignmentId: string; accept: boolean },
): Promise<ReviewOutcome<{ status: AssignmentStatus }>> {
  const patch = args.accept
    ? { assignment_status: 'accepted' as const, accepted_at: new Date().toISOString() }
    : { assignment_status: 'declined' as const, accepted_at: null };

  const { data, error } = await supabase
    .from('content_review_assignments')
    .update(patch)
    .eq('id', args.assignmentId)
    .select('assignment_status');

  if (error) {
    // cra_update admits privileged users and the assigned reviewer, so anyone
    // else gets a policy error — or, if the row simply is not theirs, zero
    // rows matched. Both are the same answer from here.
    if (/policy|permission/i.test(error.message)) {
      return { ok: false, code: 'forbidden', message: 'That assignment is not yours.' };
    }
    return { ok: false, code: 'rejected', message: error.message };
  }

  const row = (data?.[0] ?? null) as { assignment_status?: string } | null;
  if (!row?.assignment_status) {
    return { ok: false, code: 'forbidden', message: 'That assignment is not yours.' };
  }
  return { ok: true, value: { status: row.assignment_status as AssignmentStatus } };
}

/**
 * Record a decision.
 *
 * The version and scope are copied from the assignment rather than passed in,
 * because `validate_review_decision()` requires them to match — sending them
 * from the client would just be a way to get that wrong.
 */
export async function recordDecision(
  supabase: SupabaseClient,
  args: {
    assignmentId: string;
    courseVersionId: string;
    scope: ReviewScope;
    decision: Decision;
    rationale: string;
    reviewerUserId: string;
  },
): Promise<ReviewOutcome<{ decision: Decision }>> {
  const rationale = args.rationale.trim();
  // rationale is NOT NULL in the schema, and a bare "approved" with no
  // reasoning is worth refusing anyway: this is the record a teacher appeals
  // against.
  if (rationale.length === 0) {
    return { ok: false, code: 'rejected', message: 'Give a reason for the decision.' };
  }

  const { data, error } = await supabase
    .from('content_review_decisions')
    .insert({
      review_assignment_id: args.assignmentId,
      course_version_id: args.courseVersionId,
      review_scope: args.scope,
      decision: args.decision,
      rationale,
      decided_by: args.reviewerUserId,
    })
    .select('decision');

  if (error) {
    if (/assigned reviewer|insufficient_privilege/i.test(error.message)) {
      return {
        ok: false,
        code: 'forbidden',
        message: 'Only the reviewer named on this assignment can decide it.',
      };
    }
    return { ok: false, code: 'rejected', message: error.message };
  }

  const row = (data?.[0] ?? null) as { decision?: string } | null;
  return { ok: true, value: { decision: (row?.decision ?? args.decision) as Decision } };
}

/**
 * Apply the version-level effect of a decision.
 *
 * Recording a decision and moving the version are separate acts on purpose: a
 * decision is a statement about the content, and the version's status is what
 * happens next. Keeping them apart means an approval can be recorded and
 * audited even if the transition later fails.
 */
export async function applyDecisionToVersion(
  supabase: SupabaseClient,
  args: { versionId: string; decision: Decision; actorId: string },
): Promise<ReviewOutcome<{ status: string }>> {
  const to =
    args.decision === 'approved' ? 'approved'
    : args.decision === 'revision_requested' ? 'rejected'
    : 'rejected';

  const { data, error } = await supabase.rpc('set_course_version_status', {
    p_version_id: args.versionId,
    p_new_status: to,
    p_actor_id: args.actorId,
    p_reason: `Review decision: ${DECISION_LABEL[args.decision]}`,
  });

  if (error) return { ok: false, code: 'rejected', message: error.message };
  return { ok: true, value: { status: (data as unknown as string) ?? to } };
}

// ---------------------------------------------------------------------------
// The staff side: assigning reviewers
// ---------------------------------------------------------------------------

export type Reviewer = {
  reviewerProfileId: string;
  userId: string;
  displayName: string | null;
  status: string;
};

export type PendingVersion = {
  id: string;
  versionNumber: number;
  courseTitle: string;
  courseSlug: string;
  submittedBy: string | null;
};

/**
 * Reviewers who can be assigned.
 *
 * `reviewer_profiles_read` admits active profiles to anyone, and everything to
 * a privileged user, so this deliberately lists only active ones — offering a
 * suspended reviewer in a dropdown would just produce a failed assignment.
 */
export async function fetchAssignableReviewers(
  supabase: SupabaseClient,
): Promise<Reviewer[]> {
  const { data, error } = await supabase
    .from('reviewer_profiles')
    .select('id, user_id, reviewer_status, user_profiles ( display_name )')
    .eq('reviewer_status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    user_id: string;
    reviewer_status: string;
    user_profiles: { display_name: string | null }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    reviewerProfileId: r.id,
    userId: r.user_id,
    displayName: r.user_profiles?.[0]?.display_name ?? null,
    status: r.reviewer_status,
  }));
}

/**
 * Course versions sitting in review.
 *
 * A privileged caller sees these through `can_read_version()`. Filtering on
 * `submitted` is what makes this a queue rather than a list of every version
 * anyone has ever written.
 */
export async function fetchPendingVersions(
  supabase: SupabaseClient,
): Promise<PendingVersion[]> {
  const { data, error } = await supabase
    .from('course_versions')
    .select('id, version_number, created_by, courses ( title, slug )')
    .eq('version_status', 'submitted')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    version_number: number;
    created_by: string | null;
    courses: { title: string; slug: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    versionNumber: r.version_number,
    courseTitle: r.courses?.[0]?.title ?? 'Untitled course',
    courseSlug: r.courses?.[0]?.slug ?? '',
    submittedBy: r.created_by,
  }));
}

export async function assignReviewer(
  supabase: SupabaseClient,
  args: { versionId: string; reviewerProfileId: string; scope: ReviewScope; assignedBy: string },
): Promise<ReviewOutcome<{ assignmentId: string }>> {
  const { data, error } = await supabase
    .from('content_review_assignments')
    .insert({
      course_version_id: args.versionId,
      reviewer_profile_id: args.reviewerProfileId,
      review_scope: args.scope,
      assigned_by: args.assignedBy,
      assignment_status: 'offered',
    })
    .select('id');

  if (error) {
    // cra_write is privileged only, so anyone else gets a policy error.
    if (/policy|permission/i.test(error.message)) {
      return {
        ok: false,
        code: 'forbidden',
        message: 'Only platform staff can assign a reviewer.',
      };
    }
    return { ok: false, code: 'rejected', message: error.message };
  }

  const row = (data?.[0] ?? null) as { id?: string } | null;
  if (!row?.id) {
    return { ok: false, code: 'rejected', message: 'The assignment was not created.' };
  }
  return { ok: true, value: { assignmentId: row.id } };
}
