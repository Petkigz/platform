/**
 * Guardian verification.
 *
 * This is the verifiable parental consent workflow. COPPA requires it before a
 * US under-13 can enrol, which is exactly what it was built for — so it is kept
 * complete and shipped behind `family.guardian_verification`, off by default,
 * to be enabled before any US child enrols.
 *
 * The flow was a dead end. A parent could create a `guardian_relationships` row
 * at `pending_verification`, and staff could approve a case and have the
 * relationship flip to `active` — but nothing connected the two:
 *
 *   parent creates guardian_relationship  -> allowed
 *   parent creates verification case      -> refused by RLS (gvc_admin)
 *   staff creates case and approves       -> works
 *   ...and there was no UI for any of it
 *
 * So a request sat at `pending_verification` forever with no queue for anyone to
 * see. Measured, not inferred.
 *
 * The split is deliberate and stays: cases are staff-only, because "who may
 * decide that this adult is this child's parent" is a governance question, not
 * a self-service one. What was missing is the parent-facing request and the
 * staff-facing queue, not a looser policy.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type RelationshipStatus = 'pending_verification' | 'active' | 'revoked';

export type CaseStatus =
  | 'pending'
  | 'in_review'
  | 'verified'
  | 'rejected'
  | 'needs_information'
  | 'revoked';

export type GuardianRequest = {
  id: string;
  learnerProfileId: string;
  learnerName: string;
  relationshipType: 'parent' | 'guardian' | 'other';
  status: RelationshipStatus;
  canViewProgress: boolean;
  canManageLearning: boolean;
  canManageProfile: boolean;
  createdAt: string;
  verifiedAt: string | null;
};

type RelationshipRow = {
  id: string;
  learner_profile_id: string;
  relationship_type: string;
  status: string;
  can_manage_profile: boolean;
  can_view_progress: boolean;
  can_manage_learning: boolean;
  created_at: string;
  verified_at: string | null;
  learner_profiles: { display_name: string }[] | null;
};

/**
 * Ask to be recognised as a child's guardian.
 *
 * Always created at `pending_verification`. The table enforces that an `active`
 * relationship must have `verified_at`, so an active-on-insert row is refused
 * outright — which is the constraint that makes self-service escalation
 * impossible, and it should stay that way.
 */
export async function requestGuardianAccess(
  supabase: SupabaseClient,
  args: {
    guardianUserId: string;
    learnerProfileId: string;
    relationshipType: 'parent' | 'guardian' | 'other';
  },
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('guardian_relationships')
    .insert({
      guardian_user_id: args.guardianUserId,
      learner_profile_id: args.learnerProfileId,
      relationship_type: args.relationshipType,
      status: 'pending_verification',
      // Requested capabilities. A reviewer can narrow these before approving;
      // requesting the maximum is normal, granting it is not automatic.
      can_manage_profile: true,
      can_view_progress: true,
      can_manage_learning: true,
    })
    .select('id')
    .single();

  if (error) {
    // 23505 here means a relationship already exists for this pair, which is a
    // duplicate request rather than a failure worth alarming anyone about.
    if (error.code === '23505') {
      return { ok: false, message: 'You have already asked to be this child’s guardian.' };
    }
    return { ok: false, message: error.message };
  }

  const id = (data as { id: string } | null)?.id;
  if (!id) return { ok: false, message: 'The request was not recorded.' };
  return { ok: true, id };
}

/** My own guardian requests, so a parent can see where things stand. */
export async function myGuardianRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<GuardianRequest[]> {
  const { data, error } = await supabase
    .from('guardian_relationships')
    .select(
      'id, learner_profile_id, relationship_type, status, can_manage_profile, ' +
        'can_view_progress, can_manage_learning, created_at, verified_at, ' +
        'learner_profiles ( display_name )',
    )
    .eq('guardian_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RelationshipRow[]).map((r) => ({
    id: r.id,
    learnerProfileId: r.learner_profile_id,
    learnerName: r.learner_profiles?.[0]?.display_name ?? 'Unknown learner',
    relationshipType: r.relationship_type as GuardianRequest['relationshipType'],
    status: r.status as RelationshipStatus,
    canViewProgress: r.can_view_progress,
    canManageLearning: r.can_manage_learning,
    canManageProfile: r.can_manage_profile,
    createdAt: r.created_at,
    verifiedAt: r.verified_at,
  }));
}

export type ReviewQueueItem = GuardianRequest & {
  guardianName: string;
  caseId: string | null;
  caseStatus: CaseStatus | null;
};

/**
 * Requests awaiting a decision.
 *
 * A relationship can exist with no case yet — that is the state a parent leaves
 * it in — so the case is left-joined rather than required, and `caseId` being
 * null is the signal that the reviewer has not opened one.
 */
export async function pendingGuardianQueue(
  supabase: SupabaseClient,
): Promise<ReviewQueueItem[]> {
  const { data, error } = await supabase
    .from('guardian_relationships')
    .select(
      'id, learner_profile_id, relationship_type, status, can_manage_profile, ' +
        'can_view_progress, can_manage_learning, created_at, verified_at, ' +
        'learner_profiles ( display_name ), ' +
        'user_profiles!guardian_relationships_guardian_user_id_fkey ( display_name ), ' +
        'guardian_verification_cases ( id, status )',
    )
    .eq('status', 'pending_verification')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  type Row = RelationshipRow & {
    user_profiles: { display_name: string }[] | null;
    guardian_verification_cases: { id: string; status: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const c = r.guardian_verification_cases?.[0] ?? null;
    return {
      id: r.id,
      learnerProfileId: r.learner_profile_id,
      learnerName: r.learner_profiles?.[0]?.display_name ?? 'Unknown learner',
      relationshipType: r.relationship_type as GuardianRequest['relationshipType'],
      status: r.status as RelationshipStatus,
      canViewProgress: r.can_view_progress,
      canManageLearning: r.can_manage_learning,
      canManageProfile: r.can_manage_profile,
      createdAt: r.created_at,
      verifiedAt: r.verified_at,
      guardianName: r.user_profiles?.[0]?.display_name ?? 'Unknown guardian',
      caseId: c?.id ?? null,
      caseStatus: (c?.status as CaseStatus) ?? null,
    };
  });
}

export type Decision = 'verified' | 'rejected' | 'needs_information';

/**
 * Decide a case.
 *
 * A case is opened if one does not exist yet, then moved to the decision. The
 * trigger `apply_guardian_verification_decision()` does the rest: `verified`
 * sets the relationship active and stamps `verified_at`; `rejected` or
 * `revoked` revokes it and strips every capability, so a rejected guardian
 * cannot keep the access they were asking for.
 *
 * The constraints this has to satisfy are not arbitrary:
 *   - a terminal status requires both `reviewed_at` and `reviewed_by`
 *   - `rejected` requires a non-blank `decision_reason`
 *   - `reviewed_at` must not precede `submitted_at`
 */
export async function decideGuardianCase(
  supabase: SupabaseClient,
  args: {
    relationshipId: string;
    reviewerId: string;
    decision: Decision;
    reason: string;
    evidenceReference?: string | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  // A rejection with no reason is refused by the table. Refusing it here too
  // gives the reviewer a sentence instead of a database error.
  if (args.decision === 'rejected' && args.reason.trim().length === 0) {
    return { ok: false, message: 'A rejection needs a written reason.' };
  }

  const { data: existing } = await supabase
    .from('guardian_verification_cases')
    .select('id')
    .eq('guardian_relationship_id', args.relationshipId)
    .limit(1);

  const open = (existing as { id: string }[] | null)?.[0]?.id ?? null;

  if (!open) {
    const { data, error } = await supabase
      .from('guardian_verification_cases')
      .insert({
        guardian_relationship_id: args.relationshipId,
        status: 'pending',
        evidence_reference: args.evidenceReference ?? null,
      })
      .select('id')
      .single();

    if (error) return { ok: false, message: error.message };
    const created = (data as { id: string } | null)?.id;
    if (!created) return { ok: false, message: 'Could not open a review case.' };
    return applyDecision(supabase, created, args);
  }

  return applyDecision(supabase, open, args);
}

async function applyDecision(
  supabase: SupabaseClient,
  caseId: string,
  args: { reviewerId: string; decision: Decision; reason: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  // now() rather than a client clock: reviewed_at must not precede
  // submitted_at, and a skewed browser clock would make that fail in a way
  // nobody could diagnose from the error.
  const { error } = await supabase
    .from('guardian_verification_cases')
    .update({
      status: args.decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: args.reviewerId,
      decision_reason: args.reason,
    })
    .eq('id', caseId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export const RELATIONSHIP_LABEL: Record<string, string> = {
  parent: 'Parent',
  guardian: 'Guardian',
  other: 'Other adult',
};

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  pending: 'Awaiting review',
  in_review: 'In review',
  verified: 'Verified',
  rejected: 'Rejected',
  needs_information: 'More information needed',
  revoked: 'Revoked',
};
