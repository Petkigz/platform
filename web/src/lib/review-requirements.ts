/**
 * What a course version needs before it can publish — the version's side of peer
 * review. The reviewer's side (assignments, decisions, the register) is in
 * `review.ts`; this is what a version is asked for, and whether the asking has been
 * answered.
 *
 * Three tables, all of them previously unreachable:
 *
 *   `content_review_requirements`   one row per subject per scope, with how many
 *                                   approvals it needs
 *   `technical_review_checks`       the checks an author or reviewer performs
 *   `content_change_assessments`    what changed since the last version, and whether
 *                                   it needs a fresh review
 *
 * Two rules make the first one matter, and both were inert while nothing could write
 * a row. `enforce_publication_gate()` refuses to publish while any requirement is
 * open. `validate_review_assignment()` refuses to assign a reviewer who is not
 * authorised for every subject the version wrote down, at the scope being assigned.
 * So the requirements are also what makes "this course teaches Tajweed, therefore a
 * reviewer authorised in Tajweed must approve it" enforceable rather than aspirational.
 *
 * The state shown here comes from `refresh_review_requirements()`, which recounts
 * rather than reads. That is deliberate: the count of approvals that satisfy a
 * requirement is not stored anywhere, and computing it twice — once in SQL and once
 * here — is how a rule ends up enforced in one of them. The recount only ever moves a
 * requirement from open to satisfied, never back, so opening this panel cannot
 * quietly un-publish anything.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReviewOutcome, ReviewScope } from './review.ts';

export type RequirementStatus = 'open' | 'satisfied' | 'waived';

export const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  open: 'Waiting for approvals',
  satisfied: 'Met',
  waived: 'Waived',
};

export const TECHNICAL_CHECK_TYPES = [
  'media_plays',
  'captions_present',
  'links_resolve',
  'metadata_complete',
  'quiz_answers_graded',
  'accessibility',
  'other',
] as const;
export type TechnicalCheckType = (typeof TECHNICAL_CHECK_TYPES)[number];

export const TECHNICAL_CHECK_LABEL: Record<TechnicalCheckType, string> = {
  media_plays: 'The media plays',
  captions_present: 'Captions are there',
  links_resolve: 'The links resolve',
  metadata_complete: 'The metadata is complete',
  quiz_answers_graded: 'Quiz answers are graded',
  accessibility: 'It is usable without sight or sound',
  other: 'Something else',
};

export const CHANGE_CLASSES = [
  'typographical',
  'media_replacement',
  'structural',
  'content_minor',
  'doctrinal',
  'source_change',
] as const;
export type ChangeClass = (typeof CHANGE_CLASSES)[number];

export const CHANGE_CLASS_LABEL: Record<ChangeClass, string> = {
  typographical: 'Spelling and typos',
  media_replacement: 'Media replaced',
  structural: 'Structure changed',
  content_minor: 'Minor content change',
  doctrinal: 'Doctrinal change',
  source_change: 'Sources changed',
};

/**
 * The classes the schema refuses to call low risk. `cca_material_changes_are_risky`
 * says a doctrinal or source change must be high or critical and must be re-reviewed;
 * the form must not offer a combination the database would throw away, and the
 * validator must refuse it in a sentence rather than a constraint name.
 */
export const MATERIAL_CHANGE_CLASSES: readonly ChangeClass[] = ['doctrinal', 'source_change'];

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const SCOPES: readonly ReviewScope[] = ['scholarly', 'technical'];

export const WAIVER_REASON_MAX = 2000;
export const CHECK_EVIDENCE_MAX = 2000;
export const RATIONALE_MAX = 2000;
export const MAX_APPROVALS = 9;

export type ReviewRequirement = {
  id: string;
  subjectAreaId: string;
  subjectName: string | null;
  reviewScope: ReviewScope;
  requiredApprovalCount: number;
  status: RequirementStatus;
  approvals: number | null;
  authorisedReviewers: number | null;
  waivedReason: string | null;
  waivedByName: string | null;
};

export type TechnicalCheck = {
  id: string;
  checkType: string;
  passed: boolean;
  evidence: string | null;
  performedByName: string | null;
  performedAt: string | null;
};

export type ChangeAssessment = {
  id: string;
  changeClass: string;
  riskLevel: string;
  requiresReReview: boolean;
  rationale: string;
  assessedByName: string | null;
  assessedAt: string | null;
  fromVersionId: string | null;
};

export type VersionReviewState = {
  courseVersionId: string;
  requirements: ReviewRequirement[];
  checks: TechnicalCheck[];
  /** One per kind, newest first: a re-check is a new row, not an edit. */
  latestChecks: TechnicalCheck[];
  assessments: ChangeAssessment[];
  openRequirements: number;
  /** Why this version cannot publish yet, in one sentence, or null if it can. */
  blockedBecause: string | null;
  /** Set when the recount itself failed, so the panel says so rather than guessing. */
  recountError: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RequirementRow = {
  id: string;
  subject_area_id: string;
  review_scope: string;
  required_approval_count: number;
  requirement_status: string;
  waived_by: string | null;
  waived_reason: string | null;
};

type CheckRow = {
  id: string;
  check_type: string;
  passed: boolean;
  evidence: string | null;
  performed_by: string | null;
  performed_at: string | null;
};

type AssessmentRow = {
  id: string;
  change_class: string;
  risk_level: string;
  requires_re_review: boolean;
  rationale: string;
  assessed_by: string | null;
  assessed_at: string | null;
  from_version_id: string | null;
};

type RecountRow = {
  requirementId?: unknown;
  reviewScope?: unknown;
  status?: unknown;
  approvals?: unknown;
  required?: unknown;
};

function isRequirementStatus(value: unknown): value is RequirementStatus {
  return value === 'open' || value === 'satisfied' || value === 'waived';
}

function scopeOf(value: unknown): ReviewScope {
  return value === 'technical' ? 'technical' : 'scholarly';
}

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

/**
 * How many reviewers could satisfy a requirement in one subject and scope.
 *
 * A requirement nobody can meet is a version that cannot publish, and the reason is
 * invisible unless somebody counts: the gate says "1 review requirement still open"
 * and does not say that no living reviewer is authorised for that subject. This is
 * the same test `is_authorised_reviewer()` applies — an active profile, an active
 * authorisation, and a window that has not closed — asked of everybody at once.
 */
export async function countAuthorisedReviewers(
  supabase: SupabaseClient,
  subjectAreaId: string,
  scope: ReviewScope,
): Promise<number> {
  const { data, error } = await supabase
    .from('reviewer_subject_authorizations')
    .select('reviewer_profile_id, effective_until, reviewer_profiles ( reviewer_status )')
    .eq('subject_area_id', subjectAreaId)
    .eq('review_scope', scope)
    .eq('status', 'active');

  if (error) throw new Error(error.message);

  type Row = {
    reviewer_profile_id: string;
    effective_until: string | null;
    reviewer_profiles: { reviewer_status: string }[] | null;
  };

  const now = Date.now();
  const live = ((data ?? []) as unknown as Row[]).filter((row) => {
    if (row.reviewer_profiles?.[0]?.reviewer_status !== 'active') return false;
    if (!row.effective_until) return true;
    const until = new Date(row.effective_until).getTime();
    return !Number.isNaN(until) && until > now;
  });

  return new Set(live.map((row) => row.reviewer_profile_id)).size;
}

/**
 * Everything a version needs, has checked, and has been assessed as changing.
 *
 * Reads the three tables and asks the database to recount, then merges: the recount
 * decides the status and the approval count, the rows supply the subjects, the
 * waivers and the names. A recount that fails is reported rather than hidden, because
 * a panel showing stale statuses is how a teacher is told their course can publish
 * when it cannot.
 */
export async function fetchVersionReviewState(
  supabase: SupabaseClient,
  courseVersionId: string,
): Promise<VersionReviewState> {
  const [recount, requirements, checks, assessments] = await Promise.all([
    supabase.rpc('refresh_review_requirements', { p_course_version_id: courseVersionId }),
    supabase.from('content_review_requirements')
      .select('id, subject_area_id, review_scope, required_approval_count, '
        + 'requirement_status, waived_by, waived_reason')
      .eq('course_version_id', courseVersionId)
      .order('created_at', { ascending: true }),
    supabase.from('technical_review_checks')
      .select('id, check_type, passed, evidence, performed_by, performed_at')
      .eq('course_version_id', courseVersionId)
      .order('performed_at', { ascending: false }),
    supabase.from('content_change_assessments')
      .select('id, change_class, risk_level, requires_re_review, rationale, assessed_by, '
        + 'assessed_at, from_version_id')
      .eq('course_version_id', courseVersionId)
      .order('assessed_at', { ascending: false }),
  ]);

  for (const result of [requirements, checks, assessments]) {
    if (result.error) throw new Error(result.error.message);
  }

  const recountError = recount.error ? recount.error.message : null;
  const recounted = new Map<string, RecountRow>();
  if (!recount.error) {
    const payload = (recount.data ?? {}) as { requirements?: unknown };
    for (const row of (Array.isArray(payload.requirements) ? payload.requirements : []) as RecountRow[]) {
      if (typeof row.requirementId === 'string') recounted.set(row.requirementId, row);
    }
  }

  const requirementRows = (requirements.data ?? []) as unknown as RequirementRow[];
  const checkRows = (checks.data ?? []) as unknown as CheckRow[];
  const assessmentRows = (assessments.data ?? []) as unknown as AssessmentRow[];

  const subjectIds = [...new Set(requirementRows.map((r) => r.subject_area_id))];
  const [names, subjectNames, authorised] = await Promise.all([
    fetchNames(supabase, [
      ...requirementRows.map((r) => r.waived_by),
      ...checkRows.map((r) => r.performed_by),
      ...assessmentRows.map((r) => r.assessed_by),
    ]),
    (async () => {
      const map = new Map<string, string>();
      if (subjectIds.length === 0) return map;
      const { data, error } = await supabase.from('subject_areas').select('id, name').in('id', subjectIds);
      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as { id: string; name: string }[]) map.set(row.id, row.name);
      return map;
    })(),
    (async () => {
      const map = new Map<string, number>();
      const wanted = requirementRows.filter((r) => r.requirement_status !== 'waived');
      await Promise.all(wanted.map(async (row) => {
        const key = `${row.subject_area_id}:${row.review_scope}`;
        if (map.has(key)) return;
        const count = await countAuthorisedReviewers(supabase, row.subject_area_id, scopeOf(row.review_scope));
        map.set(key, count);
      }));
      return map;
    })(),
  ]);

  const merged: ReviewRequirement[] = requirementRows.map((row) => {
    const counted = recounted.get(row.id);
    const status = counted && isRequirementStatus(counted.status)
      ? counted.status
      : isRequirementStatus(row.requirement_status)
        ? row.requirement_status
        : 'open';
    return {
      id: row.id,
      subjectAreaId: row.subject_area_id,
      subjectName: subjectNames.get(row.subject_area_id) ?? null,
      reviewScope: scopeOf(row.review_scope),
      requiredApprovalCount: row.required_approval_count,
      status,
      approvals: typeof counted?.approvals === 'number' ? counted.approvals : null,
      authorisedReviewers: status === 'waived'
        ? null
        : (authorised.get(`${row.subject_area_id}:${row.review_scope}`) ?? null),
      waivedReason: row.waived_reason,
      waivedByName: row.waived_by ? (names.get(row.waived_by) ?? null) : null,
    };
  });

  const open = merged.filter((r) => r.status === 'open');
  const unstaffed = open.filter((r) => r.authorisedReviewers === 0);

  const latestChecks: TechnicalCheck[] = [];
  for (const row of checkRows) {
    if (!latestChecks.some((c) => c.checkType === row.check_type)) {
      latestChecks.push({
        id: row.id,
        checkType: row.check_type,
        passed: row.passed === true,
        evidence: row.evidence,
        performedByName: row.performed_by ? (names.get(row.performed_by) ?? null) : null,
        performedAt: row.performed_at,
      });
    }
  }

  return {
    courseVersionId,
    requirements: merged,
    checks: checkRows.map((row) => ({
      id: row.id,
      checkType: row.check_type,
      passed: row.passed === true,
      evidence: row.evidence,
      performedByName: row.performed_by ? (names.get(row.performed_by) ?? null) : null,
      performedAt: row.performed_at,
    })),
    latestChecks,
    assessments: assessmentRows.map((row) => ({
      id: row.id,
      changeClass: row.change_class,
      riskLevel: row.risk_level,
      requiresReReview: row.requires_re_review === true,
      rationale: row.rationale,
      assessedByName: row.assessed_by ? (names.get(row.assessed_by) ?? null) : null,
      assessedAt: row.assessed_at,
      fromVersionId: row.from_version_id,
    })),
    openRequirements: open.length,
    blockedBecause: open.length === 0
      ? null
      : unstaffed.length > 0
        ? `${open.length} review requirement${open.length === 1 ? '' : 's'} still open, and `
          + `${unstaffed.length} of ${open.length === 1 ? 'it' : 'them'} has no reviewer `
          + 'authorised for that subject — nobody can close it, so it has to be waived or '
          + 'somebody has to be granted the subject'
        : `${open.length} review requirement${open.length === 1 ? '' : 's'} still open`,
    recountError,
  };
}

export type RequirementValidation<T> = { ok: true; value: T } | { ok: false; message: string };

export function validateRequirementInput(input: {
  subjectAreaId?: unknown;
  scope?: unknown;
  count?: unknown;
}): RequirementValidation<{ subjectAreaId: string; scope: ReviewScope; count: number }> {
  const subject = typeof input.subjectAreaId === 'string' ? input.subjectAreaId : '';
  if (!UUID.test(subject)) return { ok: false, message: 'Choose which subject needs reviewing.' };

  const scope = input.scope === 'technical' ? 'technical' : input.scope === 'scholarly' ? 'scholarly' : '';
  if (!scope) return { ok: false, message: 'A review is technical or scholarly.' };

  const raw = input.count;
  const count = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isInteger(count) || count < 1 || count > MAX_APPROVALS) {
    return {
      ok: false,
      message: `Ask for between 1 and ${MAX_APPROVALS} approvals.`,
    };
  }

  return { ok: true, value: { subjectAreaId: subject, scope: scope as ReviewScope, count } };
}

export function validateWaiverInput(input: {
  reason?: unknown;
}): RequirementValidation<{ reason: string }> {
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (reason.length === 0) {
    return { ok: false, message: 'A waiver needs the reason in writing.' };
  }
  if (reason.length > WAIVER_REASON_MAX) {
    return { ok: false, message: `The reason must be ${WAIVER_REASON_MAX} characters or fewer.` };
  }
  return { ok: true, value: { reason } };
}

export function validateTechnicalCheckInput(input: {
  checkType?: unknown;
  passed?: unknown;
  evidence?: unknown;
}): RequirementValidation<{ checkType: TechnicalCheckType; passed: boolean; evidence: string | null }> {
  const type = typeof input.checkType === 'string' ? input.checkType : '';
  if (!TECHNICAL_CHECK_TYPES.includes(type as TechnicalCheckType)) {
    return { ok: false, message: 'Choose which check this is.' };
  }
  if (typeof input.passed !== 'boolean') {
    return { ok: false, message: 'Say whether the check passed.' };
  }
  const evidence = typeof input.evidence === 'string' ? input.evidence.trim() : '';
  if (evidence.length > CHECK_EVIDENCE_MAX) {
    return { ok: false, message: `Evidence must be ${CHECK_EVIDENCE_MAX} characters or fewer.` };
  }
  return {
    ok: true,
    value: { checkType: type as TechnicalCheckType, passed: input.passed, evidence: evidence || null },
  };
}

export function validateChangeAssessmentInput(input: {
  changeClass?: unknown;
  riskLevel?: unknown;
  requiresReReview?: unknown;
  rationale?: unknown;
  fromVersionId?: unknown;
}): RequirementValidation<{
  changeClass: ChangeClass;
  riskLevel: RiskLevel;
  requiresReReview: boolean;
  rationale: string;
  fromVersionId: string | null;
}> {
  const changeClass = typeof input.changeClass === 'string' ? input.changeClass : '';
  if (!CHANGE_CLASSES.includes(changeClass as ChangeClass)) {
    return { ok: false, message: 'Choose what kind of change this is.' };
  }

  const riskLevel = typeof input.riskLevel === 'string' ? input.riskLevel : '';
  if (!RISK_LEVELS.includes(riskLevel as RiskLevel)) {
    return { ok: false, message: 'Choose how risky it is.' };
  }

  if (typeof input.requiresReReview !== 'boolean') {
    return { ok: false, message: 'Say whether this needs a fresh review.' };
  }

  // The schema says it, and a form that offered "doctrinal, low risk, no re-review"
  // would be offering a combination that cannot be stored.
  if (MATERIAL_CHANGE_CLASSES.includes(changeClass as ChangeClass)
      && (!RISK_LEVELS.slice(2).includes(riskLevel as RiskLevel) || !input.requiresReReview)) {
    return {
      ok: false,
      message: `A ${CHANGE_CLASS_LABEL[changeClass as ChangeClass].toLowerCase()} is never low risk, `
        + 'and always needs a fresh review.',
    };
  }

  const rationale = typeof input.rationale === 'string' ? input.rationale.trim() : '';
  if (rationale.length === 0) {
    return { ok: false, message: 'Classify a change with the reason in writing.' };
  }
  if (rationale.length > RATIONALE_MAX) {
    return { ok: false, message: `The reason must be ${RATIONALE_MAX} characters or fewer.` };
  }

  let fromVersionId: string | null = null;
  if (input.fromVersionId !== null && input.fromVersionId !== undefined && input.fromVersionId !== '') {
    if (typeof input.fromVersionId !== 'string' || !UUID.test(input.fromVersionId)) {
      return { ok: false, message: 'The version this came from is not a valid id.' };
    }
    fromVersionId = input.fromVersionId;
  }

  return {
    ok: true,
    value: {
      changeClass: changeClass as ChangeClass,
      riskLevel: riskLevel as RiskLevel,
      requiresReReview: input.requiresReReview,
      rationale,
      fromVersionId,
    },
  };
}

/**
 * A refusal, as a code and a sentence.
 *
 * The messages in the migration are written for a person and are passed through
 * unchanged; all that is added here is which of them means "not yours to make".
 */
export function mapRequirementError(error: { message: string; code?: string }): ReviewOutcome<never> {
  const message = error.message;
  if (/only a governance admin|only the author of this version|sign in first/i.test(message)) {
    return { ok: false, code: 'forbidden', message };
  }
  if (/policy|permission denied/i.test(message)) {
    return { ok: false, code: 'forbidden', message: 'That is not yours to decide.' };
  }
  return { ok: false, code: 'rejected', message };
}

type Answer = Record<string, unknown>;

function answer(data: unknown): Answer {
  return (data && typeof data === 'object' ? data : {}) as Answer;
}

function id(value: unknown, fallback: string): string {
  return typeof value === 'string' && value !== '' ? value : fallback;
}

export async function requireReview(
  supabase: SupabaseClient,
  args: { courseVersionId: string; subjectAreaId: unknown; scope: unknown; count: unknown },
): Promise<ReviewOutcome<{ requirementId: string; status: string; reopened: boolean; note: string | null }>> {
  const checked = validateRequirementInput({
    subjectAreaId: args.subjectAreaId, scope: args.scope, count: args.count,
  });
  if (!checked.ok) return { ok: false, code: 'rejected', message: checked.message };

  const { data, error } = await supabase.rpc('require_review', {
    p_course_version_id: args.courseVersionId,
    p_subject_area_id: checked.value.subjectAreaId,
    p_review_scope: checked.value.scope,
    p_required_approval_count: checked.value.count,
  });
  if (error) return mapRequirementError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      requirementId: id(reply.requirementId, 'unknown'),
      status: typeof reply.status === 'string' ? reply.status : 'open',
      reopened: reply.reopened === true,
      note: typeof reply.note === 'string' ? reply.note : null,
    },
  };
}

export async function waiveReviewRequirement(
  supabase: SupabaseClient,
  args: { requirementId: string; reason: unknown },
): Promise<ReviewOutcome<{ requirementId: string; status: string; changed: boolean; note: string | null }>> {
  const checked = validateWaiverInput({ reason: args.reason });
  if (!checked.ok) return { ok: false, code: 'rejected', message: checked.message };

  const { data, error } = await supabase.rpc('waive_review_requirement', {
    p_requirement_id: args.requirementId,
    p_reason: checked.value.reason,
  });
  if (error) return mapRequirementError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      requirementId: id(reply.requirementId, 'unknown'),
      status: typeof reply.status === 'string' ? reply.status : 'waived',
      changed: reply.changed === true,
      note: typeof reply.note === 'string' ? reply.note : null,
    },
  };
}

/**
 * Ask the database to recount.
 *
 * Usually unnecessary — an approval recounts itself — but not always: a requirement
 * written after the approvals arrived, or a reviewer granted the subject afterwards,
 * leaves approvals on the table that nothing has counted yet.
 */
export async function recountRequirements(
  supabase: SupabaseClient,
  courseVersionId: string,
): Promise<ReviewOutcome<{ satisfiedNow: number; stillOpen: number }>> {
  const { data, error } = await supabase.rpc('refresh_review_requirements', {
    p_course_version_id: courseVersionId,
  });
  if (error) return mapRequirementError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      satisfiedNow: typeof reply.satisfiedNow === 'number' ? reply.satisfiedNow : 0,
      stillOpen: typeof reply.stillOpen === 'number' ? reply.stillOpen : 0,
    },
  };
}

export async function recordTechnicalCheck(
  supabase: SupabaseClient,
  args: { courseVersionId: string; checkType: unknown; passed: unknown; evidence?: unknown },
): Promise<ReviewOutcome<{ checkId: string; passed: boolean; note: string | null }>> {
  const checked = validateTechnicalCheckInput(args);
  if (!checked.ok) return { ok: false, code: 'rejected', message: checked.message };

  const { data, error } = await supabase.rpc('record_technical_check', {
    p_course_version_id: args.courseVersionId,
    p_check_type: checked.value.checkType,
    p_passed: checked.value.passed,
    p_evidence: checked.value.evidence,
  });
  if (error) return mapRequirementError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      checkId: id(reply.checkId, 'unknown'),
      passed: reply.passed === true,
      note: typeof reply.note === 'string' ? reply.note : null,
    },
  };
}

export async function assessContentChange(
  supabase: SupabaseClient,
  args: {
    courseVersionId: string;
    changeClass: unknown;
    riskLevel: unknown;
    requiresReReview: unknown;
    rationale: unknown;
    fromVersionId?: unknown;
  },
): Promise<ReviewOutcome<{ assessmentId: string; requiresReReview: boolean; note: string | null }>> {
  const checked = validateChangeAssessmentInput(args);
  if (!checked.ok) return { ok: false, code: 'rejected', message: checked.message };

  const { data, error } = await supabase.rpc('assess_content_change', {
    p_course_version_id: args.courseVersionId,
    p_change_class: checked.value.changeClass,
    p_risk_level: checked.value.riskLevel,
    p_requires_re_review: checked.value.requiresReReview,
    p_rationale: checked.value.rationale,
    p_from_version_id: checked.value.fromVersionId,
  });
  if (error) return mapRequirementError(error);

  const reply = answer(data);
  return {
    ok: true,
    value: {
      assessmentId: id(reply.assessmentId, 'unknown'),
      requiresReReview: reply.requiresReReview === true,
      note: typeof reply.note === 'string' ? reply.note : null,
    },
  };
}
