import type { MessageKey } from './i18n/messages/en.ts';
import type { RehearsalBadge } from './lesson-preview.ts';
import type { AssignmentStatus, ConflictType, Decision } from './review.ts';
import type { RegisterRefusal } from './review-register.ts';

/**
 * One assignment (`/review/[assignmentId]`), said in the reader's language
 * (2026-11-28): the name of each refusal the route can give, the catalogue
 * key that says it, and the words the two forms on the page are handed.
 * Nothing here asks the database anything.
 *
 * The sentences matched below are those of the review migrations, the last
 * of them `20261281164000_review_decided_in_own_name.sql`: a decision is
 * recorded on a review that was accepted and is still open, a reviewer who
 * declared a conflict is barred, and an offer is answered once.
 */

export const ASSIGNMENT_REFUSALS = ['signedOut', 'notYours', 'notOpen', 'conflict', 'reason', 'refused', 'unsure'] as const;
export type AssignmentRefusal = (typeof ASSIGNMENT_REFUSALS)[number];

export const ASSIGNMENT_REFUSAL_KEY = {
  signedOut: 'review.eSignedOut',
  notYours: 'ra.eNotYours',
  notOpen: 'ra.eNotOpen',
  conflict: 'ra.eConflict',
  reason: 'ra.eReason',
  refused: 'ra.eRefused',
  // Said once for the whole of `/review`: nobody can say whether it was recorded.
  unsure: 'review.eUnsure',
} as const satisfies Record<AssignmentRefusal, MessageKey>;

export function isAssignmentRefusal(value: unknown): value is AssignmentRefusal {
  return typeof value === 'string' && (ASSIGNMENT_REFUSALS as readonly string[]).includes(value);
}

/**
 * What the database said about an answer to an offer or a decision, as a name.
 *
 * `unsure` is not a refusal: an answer with no state (a gateway's page, a
 * connection that went) leaves nobody able to say whether the decision was
 * written, and a decision is written once.
 */
export function assignmentRefusalOf(error: { message?: string | null; state?: string | null; code?: string | null } | null | undefined): AssignmentRefusal {
  const state = String(error?.state ?? '');
  if (state === '' || state.startsWith('08')) return 'unsure';
  const text = String(error?.message ?? '');
  if (/is still open; this one is |is not made \S+ by its reviewer|completed by recording a decision|the times on an assignment/u.test(text)) return 'notOpen';
  if (text.includes('unresolved conflict declaration')) return 'conflict';
  if (/recorded by the assigned reviewer|policy|permission denied/u.test(text)) return 'notYours';
  // `respondToAssignment()` and `recordDecision()` put their own sentence in place of a policy's, and mark it.
  if (error?.code === 'forbidden') return 'notYours';
  return 'refused';
}

/** The HTTP status that goes with a name. */
export function assignmentStatusOf(code: AssignmentRefusal): number {
  if (code === 'signedOut') return 401;
  if (code === 'notYours') return 403;
  if (code === 'notOpen' || code === 'conflict') return 409;
  if (code === 'unsure') return 502;
  return 422;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** An assignment's id as the database would accept it. Anything else is no assignment, and is not sent. */
export function isAssignmentId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/**
 * What the page offers for an assignment in this state.
 *
 * `offer`: accept or decline. `decide`: the decision form. `decided`: the
 * decision already recorded. `closed`: declined, cancelled, or completed with
 * no decision of this reviewer's to show; nothing can be recorded, and the
 * form is not offered. Until 2026-11-28 the form was shown on a declined or
 * cancelled review, and the database (from migration 371) refused what it sent.
 */
export type AssignmentSeat = 'offer' | 'decide' | 'decided' | 'closed';

export function assignmentSeatOf(assignment: { status: AssignmentStatus; decisions: readonly unknown[] }): AssignmentSeat {
  if (assignment.decisions.length > 0) return 'decided';
  if (assignment.status === 'offered') return 'offer';
  if (assignment.status === 'accepted' || assignment.status === 'in_progress') return 'decide';
  return 'closed';
}

/** A conflict is declared about a course from its assignment while that assignment is still open. */
export function assignmentIsOpen(status: AssignmentStatus): boolean {
  return status === 'offered' || status === 'accepted' || status === 'in_progress';
}

export const BADGE_KEY = {
  empty: 'ra.bEmpty',
  silent: 'ra.bSilent',
  noted: 'ra.bNoted',
  ready: 'ra.bReady',
} as const satisfies Record<RehearsalBadge, MessageKey>;

/** The button that makes a decision ("Approve"); `DECISION_MADE_KEY` is the decision once made ("Approved"). */
export const DECISION_BUTTON_KEY = {
  approved: 'ra.approve',
  revision_requested: 'ra.revise',
  rejected: 'ra.reject',
} as const satisfies Record<Decision, MessageKey>;

/** Every sentence the decision card says, handed over by the page; it reads no catalogue itself. */
export type AssignmentWords = {
  offerHead: string; offerNote: string; accept: string; decline: string; working: string;
  recordHead: string; reason: string; reasonHint: string; approveNote: string;
  decided: string; closedNote: string; notMoved: string;
  decisionButton: Record<Decision, string>;
  decisionMade: Record<Decision, string>;
  refusals: Record<AssignmentRefusal, string>;
  /** The day each recorded decision was made, by decision id, already written. */
  days: Record<string, string>;
};

/** The words of the conflict form on an assignment. Its refusals are the register's. */
export type AssignmentConflictWords = {
  standHead: string; declared: string; declareOpen: string; declareNote: string;
  conflictKind: string; describe: string; describeHint: string; declareIt: string; working: string;
  conflictType: Record<ConflictType, string>;
  refusals: Record<RegisterRefusal, string>;
  limits: Record<string, string>;
};
