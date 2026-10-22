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

/**
 * The assignment states in which the media of the version under review is served.
 *
 * The database decides this — `may_review_version_media()` requires `accepted` or
 * `in_progress` — and this list exists so a screen can say *why* a lesson is not
 * playable instead of showing an empty player. If the two ever disagree, the
 * database wins and the sentence is wrong, which is the safer way to be wrong.
 */
export const WATCHABLE_ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = [
  'accepted',
  'in_progress',
];

export function isAssignmentWatchable(status: AssignmentStatus): boolean {
  return WATCHABLE_ASSIGNMENT_STATUSES.includes(status);
}

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

// ---------------------------------------------------------------------------
// The reviewer register
// ---------------------------------------------------------------------------
/**
 * Who may review, what they are qualified for, and what they must stand aside
 * from.
 *
 * Before this existed the peer-review path could not run at all: publication needs
 * a scholarly approval, an approval needs an assignment, an assignment needs a
 * reviewer whose profile reads `active`, and nothing in the application could put a
 * profile in that state. `/admin/reviews` listed reviewers who were already active,
 * so its dropdown was permanently empty — and, as it happens, its query filtered on
 * a column the client role cannot select, so it did not even come back empty.
 *
 * The rules live in the database, in seven functions that each take no actor: the
 * caller is the session. What is here is the vocabulary, the shape of what comes
 * back, and the refusals that are cheap to make before spending a round trip.
 *
 * Two things this module deliberately does not do:
 *
 *   * It never reads `internal_notes` or `evidence_reference`. Neither column is
 *     granted to the client role, and a query that even filters on an ungranted
 *     column is refused outright, so every column list below is written out rather
 *     than `*`.
 *   * It never sends a status the database will not accept. `applicant` and
 *     `pending_verification` are what registration produces, not something anybody
 *     may set by hand, so they are absent from `SETTABLE_REVIEWER_STATUSES`.
 */

export type ReviewerStatus =
  | 'applicant'
  | 'pending_verification'
  | 'active'
  | 'suspended'
  | 'inactive';

export const REVIEWER_STATUS_LABEL: Record<ReviewerStatus, string> = {
  applicant: 'Applicant',
  pending_verification: 'Waiting to be checked',
  active: 'Verified reviewer',
  suspended: 'Suspended',
  inactive: 'No longer reviewing',
};

/** The statuses a person may set. Verification is the only route to `active`. */
export const SETTABLE_REVIEWER_STATUSES = ['active', 'suspended', 'inactive'] as const;
export type SettableReviewerStatus = (typeof SETTABLE_REVIEWER_STATUSES)[number];

export const QUALIFICATION_TYPES = [
  'certificate',
  'degree',
  'ijazah',
  'experience',
  'institutional_affiliation',
] as const;
export type QualificationType = (typeof QUALIFICATION_TYPES)[number];

export const QUALIFICATION_TYPE_LABEL: Record<QualificationType, string> = {
  certificate: 'Certificate',
  degree: 'Degree',
  ijazah: 'Ijazah',
  experience: 'Experience',
  institutional_affiliation: 'Institutional affiliation',
};

export type QualificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export const QUALIFICATION_STATUS_LABEL: Record<QualificationStatus, string> = {
  pending: 'Waiting to be checked',
  verified: 'Checked',
  rejected: 'Not accepted',
  expired: 'Expired',
};

export const QUALIFICATION_DECISIONS = ['verified', 'rejected'] as const;
export type QualificationDecision = (typeof QUALIFICATION_DECISIONS)[number];

export const AUTHORIZATION_STATUSES = ['pending', 'active', 'suspended', 'revoked'] as const;
export type AuthorizationStatus = (typeof AUTHORIZATION_STATUSES)[number];

export const AUTHORIZATION_STATUS_LABEL: Record<AuthorizationStatus, string> = {
  pending: 'Not yet granted',
  active: 'May review',
  suspended: 'Suspended',
  revoked: 'Revoked',
};

export const CONFLICT_TYPES = [
  'authorship',
  'financial',
  'family',
  'teacher_student',
  'institutional',
  'personal',
  'other',
] as const;
export type ConflictType = (typeof CONFLICT_TYPES)[number];

export const CONFLICT_TYPE_LABEL: Record<ConflictType, string> = {
  authorship: 'I wrote it',
  financial: 'I could profit from it',
  family: 'Family',
  teacher_student: 'I taught them, or they taught me',
  institutional: 'Same institution',
  personal: 'Personal',
  other: 'Something else',
};

export type ConflictStatus =
  | 'declared'
  | 'under_assessment'
  | 'accepted'
  | 'disqualifying'
  | 'resolved';

export const CONFLICT_STATUS_LABEL: Record<ConflictStatus, string> = {
  declared: 'Declared, waiting to be assessed',
  under_assessment: 'Being assessed',
  accepted: 'Heard, and not a barrier',
  disqualifying: 'Bars the assignment',
  resolved: 'Resolved',
};

/**
 * The declarations that bar an assignment, copied from
 * `validate_review_assignment()`. Reading this list backwards would quietly unbar a
 * conflicted reviewer, so it is written down here rather than left to the labels:
 * `accepted` and `resolved` are the two states that let a reviewer work.
 */
export const BARRING_CONFLICT_STATUSES: readonly ConflictStatus[] = [
  'declared',
  'under_assessment',
  'disqualifying',
];

export const CONFLICT_ASSESSMENTS = [
  'under_assessment',
  'accepted',
  'disqualifying',
  'resolved',
] as const;
export type ConflictAssessment = (typeof CONFLICT_ASSESSMENTS)[number];

export const BIO_MAX = 2000;
export const QUALIFICATION_TITLE_MAX = 200;
export const INSTITUTION_MAX = 200;
export const REVIEWER_NOTE_MAX = 1000;
export const CONFLICT_DESCRIPTION_MAX = 2000;
export const ASSESSMENT_NOTES_MAX = 2000;

export type RegisterReviewer = {
  reviewerProfileId: string;
  userId: string;
  displayName: string | null;
  status: ReviewerStatus;
  publicBio: string | null;
  verifiedAt: string | null;
  verifiedByName: string | null;
  createdAt: string | null;
};

export type ReviewerQualification = {
  id: string;
  reviewerProfileId: string;
  qualificationType: string;
  title: string | null;
  institution: string | null;
  subjectAreaId: string | null;
  subjectName: string | null;
  verificationStatus: QualificationStatus;
  verifiedAt: string | null;
  verifiedByName: string | null;
  validUntil: string | null;
};

export type ReviewerAuthorization = {
  id: string;
  reviewerProfileId: string;
  subjectAreaId: string;
  subjectName: string | null;
  reviewScope: ReviewScope;
  status: AuthorizationStatus;
  approverName: string | null;
  approvedAt: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
};

export type ReviewerConflict = {
  id: string;
  reviewerProfileId: string;
  courseVersionId: string | null;
  conflictType: string;
  description: string;
  status: ConflictStatus;
  assessedByName: string | null;
  assessedAt: string | null;
  resolutionNotes: string | null;
};

export type ReviewerRegisterEntry = {
  reviewer: RegisterReviewer;
  qualifications: ReviewerQualification[];
  authorizations: ReviewerAuthorization[];
  conflicts: ReviewerConflict[];
};

/** Written out, not `*`: two columns on these tables are not granted to clients. */
const REVIEWER_COLUMNS =
  'id, user_id, reviewer_status, public_bio, verified_at, verified_by, created_at, ' +
  'user_profiles ( display_name )';

type ReviewerRow = {
  id: string;
  user_id: string;
  reviewer_status: string;
  public_bio: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string | null;
  user_profiles: { display_name: string | null }[] | null;
};

type QualificationRow = {
  id: string;
  reviewer_profile_id: string;
  qualification_type: string;
  qualification_title: string | null;
  issuing_institution: string | null;
  subject_area_id: string | null;
  verification_status: string;
  verified_at: string | null;
  verified_by: string | null;
  valid_until: string | null;
};

type AuthorizationRow = {
  id: string;
  reviewer_profile_id: string;
  subject_area_id: string;
  review_scope: string;
  status: string;
  approver: string | null;
  approved_at: string | null;
  effective_from: string | null;
  effective_until: string | null;
};

type ConflictRow = {
  id: string;
  reviewer_profile_id: string;
  course_version_id: string | null;
  conflict_type: string;
  description: string;
  status: string;
  assessed_by: string | null;
  assessed_at: string | null;
  resolution_notes: string | null;
};

function isReviewerStatus(value: string): value is ReviewerStatus {
  return value in REVIEWER_STATUS_LABEL;
}

function isQualificationStatus(value: string): value is QualificationStatus {
  return value in QUALIFICATION_STATUS_LABEL;
}

function isAuthorizationStatus(value: string): value is AuthorizationStatus {
  return value in AUTHORIZATION_STATUS_LABEL;
}

function isConflictStatus(value: string): value is ConflictStatus {
  return value in CONFLICT_STATUS_LABEL;
}

/** Names for whoever verified, approved or assessed, in one query. */
async function fetchNames(
  supabase: SupabaseClient,
  userIds: Array<string | null>,
): Promise<Map<string, string | null>> {
  const ids = [...new Set(userIds.filter((id): id is string => typeof id === 'string' && id !== ''))];
  const names = new Map<string, string | null>();
  if (ids.length === 0) return names;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, display_name')
    .in('user_id', ids);

  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as { user_id: string; display_name: string | null }[]) {
    names.set(row.user_id, row.display_name);
  }
  return names;
}

async function fetchSubjectNames(
  supabase: SupabaseClient,
  subjectIds: Array<string | null>,
): Promise<Map<string, string>> {
  const ids = [...new Set(subjectIds.filter((id): id is string => typeof id === 'string' && id !== ''))];
  const names = new Map<string, string>();
  if (ids.length === 0) return names;

  const { data, error } = await supabase
    .from('subject_areas')
    .select('id, name')
    .in('id', ids);

  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as { id: string; name: string }[]) {
    names.set(row.id, row.name);
  }
  return names;
}

/**
 * The whole register: every reviewer who is not closed, with what they claim, what
 * they may review, and what they have stood aside from.
 *
 * Readable by governance staff; the read policies decide what anybody else sees, and
 * a reviewer reading this gets their own row and nothing else.
 */
export async function fetchReviewerRegister(
  supabase: SupabaseClient,
): Promise<ReviewerRegisterEntry[]> {
  const { data, error } = await supabase
    .from('reviewer_profiles')
    .select(REVIEWER_COLUMNS)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const reviewers = ((data ?? []) as unknown as ReviewerRow[]);
  if (reviewers.length === 0) return [];

  const ids = reviewers.map((r) => r.id);
  const [qualifications, authorizations, conflicts] = await Promise.all([
    supabase.from('reviewer_qualifications')
      .select('id, reviewer_profile_id, qualification_type, qualification_title, '
        + 'issuing_institution, subject_area_id, verification_status, verified_at, '
        + 'verified_by, valid_until')
      .in('reviewer_profile_id', ids)
      .order('created_at', { ascending: true }),
    supabase.from('reviewer_subject_authorizations')
      .select('id, reviewer_profile_id, subject_area_id, review_scope, status, approver, '
        + 'approved_at, effective_from, effective_until')
      .in('reviewer_profile_id', ids)
      .order('created_at', { ascending: true }),
    supabase.from('reviewer_conflict_declarations')
      .select('id, reviewer_profile_id, course_version_id, conflict_type, description, '
        + 'status, assessed_by, assessed_at, resolution_notes')
      .in('reviewer_profile_id', ids)
      .order('created_at', { ascending: false }),
  ]);

  for (const result of [qualifications, authorizations, conflicts]) {
    if (result.error) throw new Error(result.error.message);
  }

  const qualificationRows = (qualifications.data ?? []) as unknown as QualificationRow[];
  const authorizationRows = (authorizations.data ?? []) as unknown as AuthorizationRow[];
  const conflictRows = (conflicts.data ?? []) as unknown as ConflictRow[];

  const [names, subjects] = await Promise.all([
    fetchNames(supabase, [
      ...reviewers.map((r) => r.verified_by),
      ...qualificationRows.map((r) => r.verified_by),
      ...authorizationRows.map((r) => r.approver),
      ...conflictRows.map((r) => r.assessed_by),
    ]),
    fetchSubjectNames(supabase, [
      ...qualificationRows.map((r) => r.subject_area_id),
      ...authorizationRows.map((r) => r.subject_area_id),
    ]),
  ]);

  return reviewers.map((row) => ({
    reviewer: {
      reviewerProfileId: row.id,
      userId: row.user_id,
      displayName: row.user_profiles?.[0]?.display_name ?? null,
      status: isReviewerStatus(row.reviewer_status) ? row.reviewer_status : 'applicant',
      publicBio: row.public_bio,
      verifiedAt: row.verified_at,
      verifiedByName: row.verified_by ? (names.get(row.verified_by) ?? null) : null,
      createdAt: row.created_at,
    },
    qualifications: qualificationRows
      .filter((q) => q.reviewer_profile_id === row.id)
      .map((q) => ({
        id: q.id,
        reviewerProfileId: q.reviewer_profile_id,
        qualificationType: q.qualification_type,
        title: q.qualification_title,
        institution: q.issuing_institution,
        subjectAreaId: q.subject_area_id,
        subjectName: q.subject_area_id ? (subjects.get(q.subject_area_id) ?? null) : null,
        verificationStatus: isQualificationStatus(q.verification_status)
          ? q.verification_status
          : 'pending',
        verifiedAt: q.verified_at,
        verifiedByName: q.verified_by ? (names.get(q.verified_by) ?? null) : null,
        validUntil: q.valid_until,
      })),
    authorizations: authorizationRows
      .filter((a) => a.reviewer_profile_id === row.id)
      .map((a) => ({
        id: a.id,
        reviewerProfileId: a.reviewer_profile_id,
        subjectAreaId: a.subject_area_id,
        subjectName: subjects.get(a.subject_area_id) ?? null,
        reviewScope: a.review_scope === 'technical' ? ('technical' as const) : ('scholarly' as const),
        status: isAuthorizationStatus(a.status) ? a.status : 'pending',
        approverName: a.approver ? (names.get(a.approver) ?? null) : null,
        approvedAt: a.approved_at,
        effectiveFrom: a.effective_from,
        effectiveUntil: a.effective_until,
      })),
    conflicts: conflictRows
      .filter((c) => c.reviewer_profile_id === row.id)
      .map((c) => ({
        id: c.id,
        reviewerProfileId: c.reviewer_profile_id,
        courseVersionId: c.course_version_id,
        conflictType: c.conflict_type,
        description: c.description,
        status: isConflictStatus(c.status) ? c.status : 'declared',
        assessedByName: c.assessed_by ? (names.get(c.assessed_by) ?? null) : null,
        assessedAt: c.assessed_at,
        resolutionNotes: c.resolution_notes,
      })),
  }));
}

/** What the reviewer's own screen needs: their row, or null when they have none. */
export async function fetchMyReviewerEntry(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReviewerRegisterEntry | null> {
  const { data, error } = await supabase
    .from('reviewer_profiles')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as { id?: string } | null;
  if (!row?.id) return null;

  const register = await fetchReviewerRegister(supabase);
  return register.find((entry) => entry.reviewer.reviewerProfileId === row.id) ?? null;
}

export type RegisterValidation<T> = { ok: true; value: T } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredId(value: unknown, label: string): RegisterValidation<string> {
  const id = optionalId(value, label);
  if (!id.ok) return id;
  if (id.value === null) return { ok: false, message: `${label} is required.` };
  return { ok: true, value: id.value };
}

function optionalId(value: unknown, label: string): RegisterValidation<string | null> {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  if (typeof value !== 'string' || !UUID.test(value)) {
    return { ok: false, message: `${label} is not a valid id.` };
  }
  return { ok: true, value };
}

function within(value: unknown, max: number, label: string): RegisterValidation<string | null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false, message: `${label} must be text.` };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (trimmed.length > max) {
    return { ok: false, message: `${label} must be ${max} characters or fewer.` };
  }
  return { ok: true, value: trimmed };
}

function required(value: unknown, max: number, label: string): RegisterValidation<string> {
  const checked = within(value, max, label);
  if (!checked.ok) return checked;
  if (!checked.value) return { ok: false, message: `${label} is required.` };
  return { ok: true, value: checked.value };
}

/** The biography shown on a public reviewer page. Optional, and never a claim. */
export function validateReviewerBio(value: unknown): RegisterValidation<string | null> {
  return within(value, BIO_MAX, 'A biography');
}

export function validateReviewerStatusInput(input: {
  status?: unknown;
  note?: unknown;
}): RegisterValidation<{ status: SettableReviewerStatus; note: string | null }> {
  const status = typeof input.status === 'string' ? input.status : '';
  if (!SETTABLE_REVIEWER_STATUSES.includes(status as SettableReviewerStatus)) {
    return {
      ok: false,
      message: 'A reviewer is verified, suspended or retired. Nothing may be set back to applicant.',
    };
  }
  const note = required(input.note, REVIEWER_NOTE_MAX, 'A reason');
  if (!note.ok) {
    // Verifying somebody needs no reason; ending their access does.
    if (status === 'active') return { ok: true, value: { status: 'active', note: null } };
    return note;
  }
  if (status === 'active') {
    const optional = within(input.note, REVIEWER_NOTE_MAX, 'A note');
    if (!optional.ok) return optional;
    return { ok: true, value: { status: 'active', note: optional.value } };
  }
  return { ok: true, value: { status: status as SettableReviewerStatus, note: note.value } };
}

export function validateQualificationInput(input: {
  qualificationType?: unknown;
  title?: unknown;
  institution?: unknown;
  subjectAreaId?: unknown;
}): RegisterValidation<{
  qualificationType: QualificationType;
  title: string;
  institution: string | null;
  subjectAreaId: string;
}> {
  const type = typeof input.qualificationType === 'string' ? input.qualificationType : '';
  if (!QUALIFICATION_TYPES.includes(type as QualificationType)) {
    return { ok: false, message: 'Choose what kind of qualification this is.' };
  }
  const title = required(input.title, QUALIFICATION_TITLE_MAX, 'A title');
  if (!title.ok) return title;
  const institution = within(input.institution, INSTITUTION_MAX, 'An institution');
  if (!institution.ok) return institution;
  // A qualification that names no subject can never authorise anything, so the
  // screen will not produce one (decided 2026-10-22). The database refuses it too.
  const subject = requiredId(input.subjectAreaId, 'The subject it is in');
  if (!subject.ok) return subject;
  return {
    ok: true,
    value: {
      qualificationType: type as QualificationType,
      title: title.value,
      institution: institution.value,
      subjectAreaId: subject.value,
    },
  };
}

export function validateQualificationDecision(input: {
  decision?: unknown;
  validUntil?: unknown;
}): RegisterValidation<{ decision: QualificationDecision; validUntil: string | null }> {
  const decision = typeof input.decision === 'string' ? input.decision : '';
  if (!QUALIFICATION_DECISIONS.includes(decision as QualificationDecision)) {
    return { ok: false, message: 'A qualification is checked or not accepted.' };
  }
  const raw = typeof input.validUntil === 'string' ? input.validUntil.trim() : '';
  if (raw === '') return { ok: true, value: { decision: decision as QualificationDecision, validUntil: null } };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, message: 'That is not a date.' };
  }
  // Either decision writes verified_at, and the schema requires it to fall inside
  // the window, so a date in the past cannot be recorded whichever way it goes.
  if (date.getTime() <= Date.now()) {
    return { ok: false, message: 'A validity window that has already closed cannot be recorded.' };
  }
  return { ok: true, value: { decision: decision as QualificationDecision, validUntil: date.toISOString() } };
}

export function validateAuthorizationInput(input: {
  subjectAreaId?: unknown;
  scope?: unknown;
  status?: unknown;
  effectiveUntil?: unknown;
}): RegisterValidation<{
  subjectAreaId: string;
  scope: ReviewScope;
  status: AuthorizationStatus;
  effectiveUntil: string | null;
}> {
  const subject = optionalId(input.subjectAreaId, 'The subject');
  if (!subject.ok) return subject;
  if (!subject.value) return { ok: false, message: 'Choose which subject this covers.' };

  const scope = input.scope === 'technical' ? 'technical' : input.scope === 'scholarly' ? 'scholarly' : '';
  if (!scope) return { ok: false, message: 'A review is technical or scholarly.' };

  const status = typeof input.status === 'string' ? input.status : '';
  if (!AUTHORIZATION_STATUSES.includes(status as AuthorizationStatus)) {
    return { ok: false, message: 'Choose what becomes of this authorisation.' };
  }

  const raw = typeof input.effectiveUntil === 'string' ? input.effectiveUntil.trim() : '';
  let until: string | null = null;
  if (raw !== '') {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return { ok: false, message: 'That is not a date.' };
    if (status === 'active' && date.getTime() <= Date.now()) {
      return { ok: false, message: 'An authorisation that has already expired cannot be made active.' };
    }
    until = date.toISOString();
  }

  return {
    ok: true,
    value: {
      subjectAreaId: subject.value,
      scope: scope as ReviewScope,
      status: status as AuthorizationStatus,
      effectiveUntil: until,
    },
  };
}

export function validateConflictInput(input: {
  conflictType?: unknown;
  description?: unknown;
  courseVersionId?: unknown;
}): RegisterValidation<{
  conflictType: ConflictType;
  description: string;
  courseVersionId: string | null;
}> {
  const type = typeof input.conflictType === 'string' ? input.conflictType : '';
  if (!CONFLICT_TYPES.includes(type as ConflictType)) {
    return { ok: false, message: 'Choose what kind of conflict this is.' };
  }
  const description = required(input.description, CONFLICT_DESCRIPTION_MAX, 'A description');
  if (!description.ok) return description;
  const version = optionalId(input.courseVersionId, 'The course version');
  if (!version.ok) return version;
  return {
    ok: true,
    value: {
      conflictType: type as ConflictType,
      description: description.value,
      courseVersionId: version.value,
    },
  };
}

export function validateAssessmentInput(input: {
  status?: unknown;
  notes?: unknown;
}): RegisterValidation<{ status: ConflictAssessment; notes: string | null }> {
  const status = typeof input.status === 'string' ? input.status : '';
  if (!CONFLICT_ASSESSMENTS.includes(status as ConflictAssessment)) {
    return { ok: false, message: 'Choose what becomes of this declaration.' };
  }
  const notes = within(input.notes, ASSESSMENT_NOTES_MAX, 'Notes');
  if (!notes.ok) return notes;
  // Both of these end something: one bars the reviewer, the other lets them work
  // despite what they declared. Either way the reason is part of the record.
  if ((status === 'accepted' || status === 'disqualifying') && !notes.value) {
    return { ok: false, message: 'Say why, in writing.' };
  }
  return { ok: true, value: { status: status as ConflictAssessment, notes: notes.value } };
}

/**
 * A refusal, as a code and a sentence.
 *
 * The messages in the migration are written for a person, so they are passed
 * through; only the distinction between "not yours to make" and "not allowed as
 * asked" is added here.
 */
export function mapReviewerError(error: { message: string; code?: string }): ReviewOutcome<never> {
  const message = error.message;
  if (/only a governance admin|may only record qualifications|not registered as a reviewer|sign in/i
    .test(message)) {
    return { ok: false, code: 'forbidden', message };
  }
  if (/policy|permission denied/i.test(message)) {
    return { ok: false, code: 'forbidden', message: 'That is not yours to decide.' };
  }
  return { ok: false, code: 'rejected', message };
}

type ReviewerAnswer = {
  reviewerProfileId?: unknown;
  qualificationId?: unknown;
  authorizationId?: unknown;
  declarationId?: unknown;
  status?: unknown;
  verificationStatus?: unknown;
  changed?: unknown;
  registered?: unknown;
  declared?: unknown;
  note?: unknown;
  verifiedAt?: unknown;
  validUntil?: unknown;
  effectiveUntil?: unknown;
};

function answer(data: unknown): ReviewerAnswer {
  return (data && typeof data === 'object' ? data : {}) as ReviewerAnswer;
}

function identifier(value: unknown, fallback: string): string {
  return typeof value === 'string' && value !== '' ? value : fallback;
}

export async function registerAsReviewer(
  supabase: SupabaseClient,
  args: { bio?: string | null } = {},
): Promise<ReviewOutcome<{ reviewerProfileId: string; status: string; registered: boolean }>> {
  const bio = validateReviewerBio(args.bio);
  if (!bio.ok) return { ok: false, code: 'rejected', message: bio.message };

  const { data, error } = await supabase.rpc('register_as_reviewer', { p_public_bio: bio.value });
  if (error) return mapReviewerError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      reviewerProfileId: identifier(reply.reviewerProfileId, 'unknown'),
      status: typeof reply.status === 'string' ? reply.status : 'applicant',
      registered: reply.registered === true,
    },
  };
}

export async function setReviewerStatus(
  supabase: SupabaseClient,
  args: { reviewerProfileId: string; status: unknown; note?: unknown },
): Promise<ReviewOutcome<{ status: string; changed: boolean; note: string | null }>> {
  const { data, error } = await supabase.rpc('set_reviewer_status', {
    p_reviewer_profile_id: args.reviewerProfileId,
    p_status: args.status,
    p_note: typeof args.note === 'string' ? args.note : null,
  });
  if (error) return mapReviewerError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      status: typeof reply.status === 'string' ? reply.status : '',
      changed: reply.changed === true,
      note: typeof reply.note === 'string' ? reply.note : null,
    },
  };
}

export async function recordReviewerQualification(
  supabase: SupabaseClient,
  args: {
    reviewerProfileId: string;
    qualificationType: unknown;
    title: unknown;
    institution?: unknown;
    subjectAreaId?: unknown;
  },
): Promise<ReviewOutcome<{ qualificationId: string }>> {
  const checked = validateQualificationInput(args);
  if (!checked.ok) return { ok: false, code: 'rejected', message: checked.message };

  const { data, error } = await supabase.rpc('record_reviewer_qualification', {
    p_reviewer_profile_id: args.reviewerProfileId,
    p_qualification_type: checked.value.qualificationType,
    p_title: checked.value.title,
    p_issuing_institution: checked.value.institution,
    p_subject_area_id: checked.value.subjectAreaId,
    p_evidence_reference: null,
  });
  if (error) return mapReviewerError(error);

  const reply = answer(data);
  return { ok: true, value: { qualificationId: identifier(reply.qualificationId, 'unknown') } };
}

export async function verifyReviewerQualification(
  supabase: SupabaseClient,
  args: { qualificationId: string; decision: unknown; validUntil?: unknown },
): Promise<ReviewOutcome<{ verificationStatus: string; changed: boolean }>> {
  const { data, error } = await supabase.rpc('verify_reviewer_qualification', {
    p_qualification_id: args.qualificationId,
    p_decision: args.decision,
    p_valid_until: typeof args.validUntil === 'string' ? args.validUntil : null,
  });
  if (error) return mapReviewerError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      verificationStatus: typeof reply.verificationStatus === 'string'
        ? reply.verificationStatus
        : '',
      changed: reply.changed === true,
    },
  };
}

export async function setReviewerAuthorization(
  supabase: SupabaseClient,
  args: {
    reviewerProfileId: string;
    subjectAreaId: unknown;
    scope: unknown;
    status: unknown;
    effectiveUntil?: unknown;
  },
): Promise<ReviewOutcome<{ authorizationId: string; status: string; changed: boolean }>> {
  const { data, error } = await supabase.rpc('set_reviewer_authorization', {
    p_reviewer_profile_id: args.reviewerProfileId,
    p_subject_area_id: args.subjectAreaId,
    p_review_scope: args.scope,
    p_status: args.status,
    p_effective_until: typeof args.effectiveUntil === 'string' ? args.effectiveUntil : null,
  });
  if (error) return mapReviewerError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      authorizationId: identifier(reply.authorizationId, 'unknown'),
      status: typeof reply.status === 'string' ? reply.status : '',
      changed: reply.changed === true,
    },
  };
}

export async function declareReviewerConflict(
  supabase: SupabaseClient,
  args: { conflictType: unknown; description: unknown; courseVersionId?: unknown },
): Promise<ReviewOutcome<{ declarationId: string; declared: boolean; note: string | null }>> {
  const checked = validateConflictInput(args);
  if (!checked.ok) return { ok: false, code: 'rejected', message: checked.message };

  const { data, error } = await supabase.rpc('declare_reviewer_conflict', {
    p_conflict_type: checked.value.conflictType,
    p_description: checked.value.description,
    p_course_version_id: checked.value.courseVersionId,
  });
  if (error) return mapReviewerError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      declarationId: identifier(reply.declarationId, 'unknown'),
      declared: reply.declared === true,
      note: typeof reply.note === 'string' ? reply.note : null,
    },
  };
}

export async function assessReviewerConflict(
  supabase: SupabaseClient,
  args: { declarationId: string; status: unknown; notes?: unknown },
): Promise<ReviewOutcome<{ status: string; changed: boolean }>> {
  const { data, error } = await supabase.rpc('assess_reviewer_conflict', {
    p_declaration_id: args.declarationId,
    p_status: args.status,
    p_resolution_notes: typeof args.notes === 'string' ? args.notes : null,
  });
  if (error) return mapReviewerError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      status: typeof reply.status === 'string' ? reply.status : '',
      changed: reply.changed === true,
    },
  };
}

export type SubjectAreaOption = { id: string; code: string; name: string };

/**
 * The subjects an authorisation or a qualification can name.
 *
 * Ids, not codes: `reviewer_subject_authorizations.subject_area_id` is the id, and
 * `is_authorised_reviewer()` compares ids. Retired subjects are left out — an
 * authorisation for a subject the catalogue no longer uses would be a grant nobody
 * could exercise.
 */
export async function fetchSubjectOptions(
  supabase: SupabaseClient,
): Promise<SubjectAreaOption[]> {
  const { data, error } = await supabase
    .from('subject_areas')
    .select('id, code, name')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as { id: string; code: string; name: string }[])
    .map((r) => ({ id: r.id, code: r.code, name: r.name }));
}
