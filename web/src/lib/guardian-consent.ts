/**
 * Verifiable parental consent, read and written.
 *
 * The database half of this (U120) makes a consent four facts rather than a
 * boolean: **who** asked, **how** the relationship was established, **when** it
 * was verified, and **when it lapses**. A lapse pauses access and deletes
 * nothing; a withdrawal clears the permissions and records why. Everything here
 * is a thin wrapper over five functions, because the rules belong in the
 * database where a second client cannot bypass them:
 *
 *   submit_guardian_consent   relationship + case in one call
 *   decide_guardian_consent   verify for a number of months, reject, or ask more
 *   revoke_guardian_consent   a parent withdrawing, with a reason
 *   my_guardian_consents      the parent's own view, never the evidence
 *   guardian_consent_register the queue and every live consent
 *
 * Two things this file must never do: hand out an evidence reference, and
 * pretend a policy is in force. Both are reported as booleans by the database
 * (`referenceGiven`, `policyInForce`) precisely so no screen has to guess.
 *
 * The sentences are pure so they can be tested without a browser.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type ConsentMethod =
  | 'video_call'
  | 'id_document'
  | 'in_person'
  | 'signed_declaration';

export type RelationshipType = 'parent' | 'guardian' | 'other';

/** The relationship state as the parent sees it; `lapsed` is computed, not stored. */
export type ConsentState = 'pending_verification' | 'active' | 'lapsed' | 'revoked';

export type ConsentDecision = 'verified' | 'rejected' | 'needs_information';

export type ConsentDecisionRecord = {
  status: string;
  at: string | null;
  reason: string | null;
};

export type MyConsent = {
  relationshipId: string;
  learnerProfileId: string;
  learnerName: string;
  relationshipType: RelationshipType;
  status: ConsentState;
  method: ConsentMethod | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  canViewProgress: boolean;
  canManageLearning: boolean;
  canManageProfile: boolean;
  policyChanged: boolean;
  openCase: { id: string; status: string; submittedAt: string; note: string | null } | null;
  lastDecision: ConsentDecisionRecord | null;
};

export type MyConsents = {
  enforced: boolean;
  policyInForce: boolean;
  consents: MyConsent[];
};

export type WaitingConsent = {
  caseId: string;
  relationshipId: string;
  childName: string;
  ageBand: string | null;
  guardianName: string;
  relationshipType: RelationshipType;
  method: ConsentMethod | null;
  statement: string;
  referenceGiven: boolean;
  submittedAt: string;
  status: string;
  note: string | null;
  waitingDays: number;
};

export type LiveConsent = {
  relationshipId: string;
  childName: string;
  guardianName: string;
  method: ConsentMethod | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  lapsed: boolean;
  noExpiry: boolean;
  policyChanged: boolean;
  canViewProgress: boolean;
  canManageLearning: boolean;
};

export type ConsentRegister = {
  enforced: boolean;
  policyInForce: boolean;
  waiting: WaitingConsent[];
  active: LiveConsent[];
  counts: {
    waiting: number;
    active: number;
    lapsed: number;
    noExpiry: number;
    children: number;
  };
};

export const CONSENT_METHODS: readonly { value: ConsentMethod; label: string; hint: string }[] = [
  {
    value: 'video_call',
    label: 'A video call',
    hint: 'You and the reviewer spoke, and they saw you.',
  },
  {
    value: 'id_document',
    label: 'An identity document',
    hint: 'A document showing your name, matched to the child’s record.',
  },
  {
    value: 'in_person',
    label: 'In person',
    hint: 'You were seen at a class, an office or an event.',
  },
  {
    value: 'signed_declaration',
    label: 'A signed declaration',
    hint: 'A written statement you signed, kept outside the database.',
  },
];

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  parent: 'Parent',
  guardian: 'Guardian',
  other: 'Other adult',
};

/**
 * How long a verification lasts. Twelve months is the default because a
 * relationship can change within a year and nobody has time to re-verify every
 * term; thirty-six is the ceiling the database enforces.
 */
export const VALIDITY_MONTHS: readonly number[] = [6, 12, 24, 36];

export const DEFAULT_VALIDITY_MONTHS = 12;

export function methodLabel(method: string | null | undefined): string {
  const found = CONSENT_METHODS.find((m) => m.value === method);
  return found ? found.label.toLowerCase() : 'a method that was not recorded';
}

export function relationshipLabel(type: string | null | undefined): string {
  if (type === 'parent' || type === 'guardian' || type === 'other') {
    return RELATIONSHIP_LABELS[type];
  }
  return 'Adult';
}

/**
 * The parent's state, in one word.
 *
 * `revoked` covers two different things — a reviewer refusing and a parent
 * withdrawing — so the last decision is what separates them. A screen that
 * called both "withdrawn" would tell a refused parent they had done something
 * they had not.
 */
export function consentStateLabel(consent: Pick<MyConsent, 'status' | 'lastDecision'>): string {
  switch (consent.status) {
    case 'active':
      return 'Verified';
    case 'lapsed':
      return 'Lapsed';
    case 'pending_verification':
      return 'Waiting for review';
    case 'revoked':
      return consent.lastDecision?.status === 'rejected' ? 'Not granted' : 'Withdrawn';
    default:
      return 'Waiting for review';
  }
}

export function consentTone(
  consent: Pick<MyConsent, 'status' | 'lastDecision'>,
): 'ok' | 'neutral' | 'warn' {
  if (consent.status === 'active') return 'ok';
  if (consent.status === 'lapsed') return 'warn';
  if (consent.status === 'revoked' && consent.lastDecision?.status !== 'rejected') return 'neutral';
  return 'neutral';
}

/** Whole days between now and an ISO moment; negative once it has passed. */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((then - now.getTime()) / 86_400_000);
}

export function dayLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The one sentence a parent needs about a consent.
 *
 * It never says "verified" for something that has lapsed, and never gives a
 * date it does not have. An approval made before expiry existed has no lifetime,
 * and this says so rather than inventing one.
 */
export function consentSentence(consent: MyConsent, now: Date = new Date()): string {
  const state = consentStateLabel(consent);
  const method = consent.method ? methodLabel(consent.method) : null;
  const verified = dayLabel(consent.verifiedAt);
  const expires = dayLabel(consent.expiresAt);

  if (consent.status === 'revoked') {
    if (consent.lastDecision?.status === 'rejected') {
      return 'A reviewer did not grant this. Nothing was removed from the child’s account.';
    }
    return 'You withdrew this consent. The child’s account is unchanged.';
  }

  if (consent.status === 'pending_verification') {
    const said = consent.openCase?.status === 'needs_information'
      ? ' The reviewer has asked for more information.'
      : '';
    return `Submitted${method ? ` as ${method}` : ''}; waiting for a reviewer.${said}`;
  }

  if (consent.status === 'lapsed') {
    return `This verification ran out on ${expires ?? 'a date that was not recorded'}. `
      + 'Nothing was deleted — ask again to renew it.';
  }

  const days = daysUntil(consent.expiresAt, now);
  if (expires && days !== null && days >= 0) {
    return `${state}${verified ? ` on ${verified}` : ''}${method ? ` by ${method}` : ''}. `
      + `It lapses on ${expires} (${days} ${days === 1 ? 'day' : 'days'}).`;
  }
  if (expires) {
    return `${state}${verified ? ` on ${verified}` : ''}. It lapses on ${expires}.`;
  }
  return `${state}${verified ? ` on ${verified}` : ''}, with no expiry recorded `
    + '— it was approved before lifetimes existed. Renew it to give it one.';
}

/** The warning shown when a live consent is within a month of lapsing. */
export function expiryWarning(consent: MyConsent, now: Date = new Date()): string | null {
  if (consent.status !== 'active') return null;
  const days = daysUntil(consent.expiresAt, now);
  if (days === null) {
    return 'This verification has no expiry. It is counted as verified until it is renewed.';
  }
  if (days < 0) return null;
  if (days > 30) return null;
  if (days === 0) return 'This verification lapses today. Renew it to keep access.';
  return `This verification lapses in ${days} ${days === 1 ? 'day' : 'days'}.`;
}

/** What a parent may do with the consent they hold, as a sentence. */
export function permissionSentence(consent: Pick<
  MyConsent,
  'canViewProgress' | 'canManageLearning' | 'canManageProfile'
>): string {
  const parts: string[] = [];
  if (consent.canViewProgress) parts.push('see progress');
  if (consent.canManageLearning) parts.push('change what the child is learning');
  if (consent.canManageProfile) parts.push('change the child’s profile');
  if (parts.length === 0) return 'No permissions: the consent is not in force.';
  return `You may ${parts.join(', ')}.`;
}

/**
 * The enforcement note. Both screens carry it, because the difference between
 * "recorded" and "enforced" is the whole point of the flag and it is not
 * obvious from a green badge.
 */
export const ENFORCEMENT_NOTE =
  'Verification enforcement is off. Consents are recorded, lapse and can be '
  + 'withdrawn, but a lapse does not yet remove access to a learning record. '
  + 'Turning it on makes every verification without a lifetime lapse at once.';

export function enforcementNote(enforced: boolean): string | null {
  return enforced ? null : ENFORCEMENT_NOTE;
}

/** What withdrawal does, stated before the button is pressed. */
export const WITHDRAWAL_EFFECT =
  'Withdrawing clears every permission and records your reason. It does not '
  + 'delete the child’s account, their work or their progress, and another '
  + 'guardian can be verified in your place.';

/** What the queue can and cannot know about a case. */
export const EVIDENCE_NOTE =
  'The reference to the evidence is write-only: this queue reports whether it '
  + 'exists and never what it is. A reviewer’s judgement rests on the statement, '
  + 'the method, and whatever they checked outside the platform.';

/** The sentence above the decision form. */
export function decisionEffect(decision: ConsentDecision, months: number): string {
  if (decision === 'verified') {
    return `Verifying gives the permissions ticked below for ${months} months. `
      + 'It expires on its own; renewing does not add time to a lapsed consent.';
  }
  if (decision === 'rejected') {
    return 'Rejecting revokes the relationship and clears every permission. '
      + 'The child’s account is untouched.';
  }
  return 'Asking for more information keeps the request open. The parent sees your note.';
}

/**
 * A database refusal, as a sentence.
 *
 * The functions raise stable codes (`guardian:...`) rather than prose, so the
 * client maps them once and every screen says the same thing.
 */
export function describeConsentError(message: string | null | undefined): string {
  const text = (message ?? '').trim();
  if (!text) return 'That did not work. Nothing was recorded.';

  const known: Record<string, string> = {
    'guardian:not_signed_in': 'Your session has ended. Sign in again.',
    'guardian:not_allowed':
      'Only governance staff or the owner can do that.',
    'guardian:not_in_family':
      'Only an adult in this child’s family can ask to be their guardian.',
    'guardian:not_a_child': 'That profile is an adult. Consent is for a child.',
    'guardian:child_not_found': 'That child profile no longer exists.',
    'guardian:statement_required':
      'Write who this child is to you, in your own words (at least 20 characters).',
    'guardian:method_invalid':
      'Choose how the relationship can be established.',
    'guardian:relationship_invalid': 'Choose what you are to this child.',
    'guardian:already_verified':
      'This child is already verified to you. There is nothing to renew until it lapses.',
    'guardian:already_waiting': 'A request is already with the reviewer.',
    'guardian:already_decided': 'This case has already been decided.',
    'guardian:already_revoked': 'This consent is already withdrawn.',
    'guardian:decision_invalid': 'Choose verify, reject, or ask for more.',
    'guardian:reason_required':
      'A written reason is required — the parent reads it.',
    'guardian:validity_invalid':
      'A verification lasts between one and thirty-six months.',
    'guardian:case_not_found': 'That case no longer exists.',
    'guardian:not_found': 'That consent no longer exists.',
  };

  for (const [code, sentence] of Object.entries(known)) {
    if (text.includes(code)) return sentence;
  }
  return text;
}

/** The headline above the staff queue: what needs doing, in one line. */
export function registerHeadline(register: ConsentRegister | null | undefined): string {
  if (!register) return 'Nothing has been read yet.';
  const { waiting, lapsed, noExpiry } = register.counts;
  if (waiting === 0) {
    const extra = lapsed + noExpiry;
    if (extra === 0) return 'Nothing is waiting for a decision.';
    return `Nothing is waiting. ${lapsed} lapsed and ${noExpiry} without an expiry need a renewal.`;
  }
  return `${waiting} ${waiting === 1 ? 'request is' : 'requests are'} waiting for a decision.`;
}

/** The children's policy, as one line. Never claims one is in force when none is. */
export function policyLine(policyInForce: boolean): string {
  return policyInForce
    ? 'Each consent records the children’s policy version in force when it was verified.'
    : 'No children’s policy is in force. Consents therefore record no agreed version, '
      + 'and every screen says so rather than implying agreement to a document that '
      + 'does not exist. Publish the policy from the policy register.';
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return (data as T) ?? null;
}

export async function myGuardianConsents(
  supabase: SupabaseClient,
): Promise<MyConsents> {
  const { data, error } = await supabase.rpc('my_guardian_consents');
  if (error) throw new Error(describeConsentError(error.message));
  const row = firstRow<MyConsents>(data);
  if (!row) return { enforced: false, policyInForce: false, consents: [] };
  return { ...row, consents: row.consents ?? [] };
}

export async function guardianConsentRegister(
  supabase: SupabaseClient,
): Promise<ConsentRegister> {
  const { data, error } = await supabase.rpc('guardian_consent_register');
  if (error) throw new Error(describeConsentError(error.message));
  const row = firstRow<ConsentRegister>(data);
  if (!row) throw new Error('The consent register returned nothing.');
  return {
    ...row,
    waiting: row.waiting ?? [],
    active: row.active ?? [],
    counts: row.counts ?? { waiting: 0, active: 0, lapsed: 0, noExpiry: 0, children: 0 },
  };
}

export async function submitGuardianConsent(
  supabase: SupabaseClient,
  args: {
    learnerProfileId: string;
    relationshipType: RelationshipType;
    method: ConsentMethod;
    statement: string;
    evidenceReference?: string | null;
  },
): Promise<{ ok: true; caseId: string; relationshipId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('submit_guardian_consent', {
    p_learner_profile_id: args.learnerProfileId,
    p_relationship_type: args.relationshipType,
    p_method: args.method,
    p_evidence_reference: args.evidenceReference ?? null,
    p_statement: args.statement,
  });
  if (error) return { ok: false, message: describeConsentError(error.message) };
  const row = data as { caseId?: string; relationshipId?: string } | null;
  if (!row?.caseId || !row.relationshipId) {
    return { ok: false, message: 'The request was not recorded.' };
  }
  return { ok: true, caseId: row.caseId, relationshipId: row.relationshipId };
}

export async function decideGuardianConsent(
  supabase: SupabaseClient,
  args: {
    caseId: string;
    decision: ConsentDecision;
    reason: string;
    months?: number;
    canViewProgress?: boolean;
    canManageLearning?: boolean;
    canManageProfile?: boolean;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('decide_guardian_consent', {
    p_case_id: args.caseId,
    p_decision: args.decision,
    p_reason: args.reason,
    p_valid_months: args.months ?? DEFAULT_VALIDITY_MONTHS,
    p_view_progress: args.canViewProgress ?? true,
    p_manage_learning: args.canManageLearning ?? true,
    p_manage_profile: args.canManageProfile ?? false,
  });
  if (error) return { ok: false, message: describeConsentError(error.message) };
  return { ok: true };
}

export async function revokeGuardianConsent(
  supabase: SupabaseClient,
  args: { relationshipId: string; reason: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('revoke_guardian_consent', {
    p_relationship_id: args.relationshipId,
    p_reason: args.reason,
  });
  if (error) return { ok: false, message: describeConsentError(error.message) };
  return { ok: true };
}
