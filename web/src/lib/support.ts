/**
 * Support cases — the help desk.
 *
 * Every write goes through a database function. The functions are where the
 * rules live: who may open a case, whose learner or order may be attached to
 * it, who may write an internal note, and which status changes are legal from
 * which state. What this module does is shape the request, refuse obviously
 * bad input before it costs a round trip, and translate a database refusal
 * into a status code and a sentence a person can act on.
 *
 * Two things are deliberately not here:
 *
 *   * the actor. No function takes a user id; identity comes from the session.
 *   * notifications. Nothing emails or pushes when a case is answered —
 *     `delivery.notifications` is a separate flag with no provider chosen, and
 *     this module does not imply otherwise.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPORT_CATEGORIES = [
  { value: 'account', label: 'My account' },
  { value: 'payment', label: 'Payment or refund' },
  { value: 'access', label: 'Cannot open a course or lesson' },
  { value: 'content', label: 'Something wrong with a lesson' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'family', label: 'Family and child profiles' },
  { value: 'other', label: 'Something else' },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]['value'];

export const SUPPORT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_STATUSES = [
  'open',
  'assigned',
  'waiting_on_user',
  'resolved',
  'closed',
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUBJECT_MAX = 200;
export const BODY_MAX = 4000;

export const STATUS_LABEL: Record<SupportStatus, string> = {
  open: 'Waiting for us',
  assigned: 'Someone is on it',
  waiting_on_user: 'Waiting for you',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABEL: Record<SupportPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const CATEGORY_LABEL: Record<SupportCategory, string> = {
  account: 'My account',
  payment: 'Payment or refund',
  access: 'Cannot open a course or lesson',
  content: 'Something wrong with a lesson',
  certificate: 'Certificate',
  family: 'Family and child profiles',
  other: 'Something else',
};

export type SupportCase = {
  id: string;
  caseNumber: string;
  category: SupportCategory;
  subject: string;
  body: string;
  status: SupportStatus;
  priority: SupportPriority;
  requestedBy: string;
  requesterName: string | null;
  learnerProfileId: string | null;
  orderId: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  closedAt: string | null;
  closeReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: string;
  caseId: string;
  authorName: string | null;
  authorIsStaff: boolean;
  authorIsMe: boolean;
  body: string;
  isInternal: boolean;
  createdAt: string;
};

type CaseRow = {
  id: string;
  case_number: string;
  category: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  requested_by: string;
  learner_profile_id: string | null;
  order_id: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  closed_at: string | null;
  close_reason: string | null;
  created_at: string;
  updated_at: string;
  requester?: { display_name: string | null }[] | null;
  assignee?: { display_name: string | null }[] | null;
};

type MessageRow = {
  id: string;
  case_id: string;
  author_user_id: string;
  author_kind: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author?: { display_name: string | null }[] | null;
};

const CASE_COLUMNS =
  'id, case_number, category, subject, body, status, priority, requested_by, ' +
  'learner_profile_id, order_id, assigned_to, resolved_at, resolution_note, ' +
  'closed_at, close_reason, created_at, updated_at';

function toCase(r: CaseRow): SupportCase {
  return {
    id: r.id,
    caseNumber: r.case_number,
    category: r.category as SupportCategory,
    subject: r.subject,
    body: r.body,
    status: r.status as SupportStatus,
    priority: r.priority as SupportPriority,
    requestedBy: r.requested_by,
    requesterName: r.requester?.[0]?.display_name ?? null,
    learnerProfileId: r.learner_profile_id,
    orderId: r.order_id,
    assignedTo: r.assigned_to,
    assigneeName: r.assignee?.[0]?.display_name ?? null,
    resolvedAt: r.resolved_at,
    resolutionNote: r.resolution_note,
    closedAt: r.closed_at,
    closeReason: r.close_reason,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export type SupportResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

/**
 * Turn a database refusal into a status and a sentence.
 *
 * The messages in the migration are written for a person, not for a developer,
 * so they are passed through. Only the status is inferred here, and the three
 * cases that matter are the ones a caller can act on: not allowed (403), not
 * found (404), and not permitted in this state or while the feature is off
 * (409).
 */
export function mapSupportError(error: { message: string; code?: string }): SupportResult<never> {
  const message = error.message;
  if (error.code === 'P0002' || /not found/i.test(message)) {
    return { ok: false, status: 404, error: message };
  }
  if (error.code === 'insufficient_privilege'
      || /only staff|only platform staff|cannot|sign in/i.test(message)) {
    return { ok: false, status: 403, error: message };
  }
  return { ok: false, status: 409, error: message };
}

export type OpenCaseInput = {
  category?: unknown;
  subject?: unknown;
  body?: unknown;
  learnerProfileId?: unknown;
  orderId?: unknown;
};

/**
 * Validate before the round trip.
 *
 * These are the same limits the table enforces; repeating them here is not
 * belt-and-braces for its own sake. A blank subject that is only caught by a
 * check constraint arrives as a 409 with a database sentence, on a form the
 * person has already filled in.
 */
export function validateOpenCaseInput(input: OpenCaseInput):
  | { ok: true; category: SupportCategory; subject: string; body: string; learnerProfileId: string | null; orderId: string | null }
  | { ok: false; status: number; error: string } {
  const category = typeof input.category === 'string' ? input.category : '';
  if (!SUPPORT_CATEGORIES.some((c) => c.value === category)) {
    return { ok: false, status: 400, error: 'Choose what this is about.' };
  }

  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  if (subject.length < 3) {
    return { ok: false, status: 400, error: 'Add a short subject.' };
  }
  if (subject.length > SUBJECT_MAX) {
    return { ok: false, status: 400, error: `Keep the subject under ${SUBJECT_MAX} characters.` };
  }

  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body) {
    return { ok: false, status: 400, error: 'Describe the problem so it can be answered.' };
  }
  if (body.length > BODY_MAX) {
    return { ok: false, status: 400, error: `Please keep it under ${BODY_MAX} characters.` };
  }

  const learnerProfileId =
    typeof input.learnerProfileId === 'string' && input.learnerProfileId.length > 0
      ? input.learnerProfileId
      : null;
  const orderId =
    typeof input.orderId === 'string' && input.orderId.length > 0 ? input.orderId : null;

  return {
    ok: true,
    category: category as SupportCategory,
    subject,
    body,
    learnerProfileId,
    orderId,
  };
}

export async function openSupportCase(
  supabase: SupabaseClient,
  input: OpenCaseInput,
): Promise<SupportResult<{ id: string }>> {
  const valid = validateOpenCaseInput(input);
  if (!valid.ok) return valid;

  const { data, error } = await supabase.rpc('open_support_case', {
    p_category: valid.category,
    p_subject: valid.subject,
    p_body: valid.body,
    p_learner_profile_id: valid.learnerProfileId,
    p_order_id: valid.orderId,
  });

  if (error) return mapSupportError(error);
  if (typeof data !== 'string' || data.length === 0) {
    return { ok: false, status: 500, error: 'The case was not created.' };
  }
  return { ok: true, value: { id: data } };
}

export function validateReplyBody(value: unknown):
  | { ok: true; body: string }
  | { ok: false; status: number; error: string } {
  const body = typeof value === 'string' ? value.trim() : '';
  if (!body) return { ok: false, status: 400, error: 'Write a reply first.' };
  if (body.length > BODY_MAX) {
    return { ok: false, status: 400, error: `Please keep it under ${BODY_MAX} characters.` };
  }
  return { ok: true, body };
}

export async function replyToSupportCase(
  supabase: SupabaseClient,
  args: { caseId: string; body: string; isInternal?: boolean },
): Promise<SupportResult<{ id: string }>> {
  const valid = validateReplyBody(args.body);
  if (!valid.ok) return valid;

  const { data, error } = await supabase.rpc('reply_to_support_case', {
    p_case_id: args.caseId,
    p_body: valid.body,
    p_is_internal: args.isInternal === true,
  });

  if (error) return mapSupportError(error);
  if (typeof data !== 'string' || data.length === 0) {
    return { ok: false, status: 500, error: 'The reply was not saved.' };
  }
  return { ok: true, value: { id: data } };
}

export function validateReason(value: unknown, label: string):
  | { ok: true; reason: string }
  | { ok: false; status: number; error: string } {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (!reason) {
    return { ok: false, status: 400, error: `${label} needs a written reason.` };
  }
  if (reason.length > BODY_MAX) {
    return { ok: false, status: 400, error: `Please keep it under ${BODY_MAX} characters.` };
  }
  return { ok: true, reason };
}

/** Staff or the requester withdrawing their own case; the database decides which. */
export async function closeSupportCase(
  supabase: SupabaseClient,
  args: { caseId: string; reason: string },
): Promise<SupportResult> {
  const valid = validateReason(args.reason, 'Closing a case');
  if (!valid.ok) return valid;

  const { error } = await supabase.rpc('close_support_case', {
    p_case_id: args.caseId,
    p_reason: valid.reason,
  });
  if (error) return mapSupportError(error);
  return { ok: true, value: undefined };
}

export async function assignSupportCase(
  supabase: SupabaseClient,
  args: { caseId: string; assigneeId: string },
): Promise<SupportResult> {
  if (!args.assigneeId) {
    return { ok: false, status: 400, error: 'Choose who should answer this.' };
  }
  const { error } = await supabase.rpc('assign_support_case', {
    p_case_id: args.caseId,
    p_assignee: args.assigneeId,
  });
  if (error) return mapSupportError(error);
  return { ok: true, value: undefined };
}

export async function setSupportCasePriority(
  supabase: SupabaseClient,
  args: { caseId: string; priority: string },
): Promise<SupportResult> {
  if (!SUPPORT_PRIORITIES.some((p) => p === args.priority)) {
    return { ok: false, status: 400, error: 'Choose a supported priority.' };
  }
  const { error } = await supabase.rpc('set_support_case_priority', {
    p_case_id: args.caseId,
    p_priority: args.priority,
  });
  if (error) return mapSupportError(error);
  return { ok: true, value: undefined };
}

export async function resolveSupportCase(
  supabase: SupabaseClient,
  args: { caseId: string; note: string },
): Promise<SupportResult> {
  const valid = validateReason(args.note, 'Resolving a case');
  if (!valid.ok) return valid;

  const { error } = await supabase.rpc('resolve_support_case', {
    p_case_id: args.caseId,
    p_note: valid.reason,
  });
  if (error) return mapSupportError(error);
  return { ok: true, value: undefined };
}

/** My cases, newest first. RLS already limits this to my own. */
export async function fetchMyCases(supabase: SupabaseClient, limit = 50): Promise<SupportCase[]> {
  const { data, error } = await supabase
    .from('support_cases')
    .select(CASE_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as CaseRow[]).map(toCase);
}

/** One case by its human reference, with the thread the caller may read. */
export async function fetchCaseByNumber(
  supabase: SupabaseClient,
  args: { caseNumber: string; myUserId: string },
): Promise<{ supportCase: SupportCase; messages: SupportMessage[] } | null> {
  const { data, error } = await supabase
    .from('support_cases')
    .select(`${CASE_COLUMNS}, requester:user_profiles!support_cases_requested_by_fkey(display_name), assignee:user_profiles!support_cases_assigned_to_fkey(display_name)`)
    .eq('case_number', args.caseNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as unknown as CaseRow | null;
  if (!row) return null;

  const messages = await fetchCaseMessages(supabase, { caseId: row.id, myUserId: args.myUserId });
  return { supportCase: toCase(row), messages };
}

/**
 * The thread.
 *
 * Internal notes are filtered by the read policy, not here: a requester simply
 * never receives those rows. Filtering in the application would mean the client
 * was one query away from seeing them.
 */
export async function fetchCaseMessages(
  supabase: SupabaseClient,
  args: { caseId: string; myUserId: string },
): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_case_messages')
    .select('id, case_id, author_user_id, author_kind, body, is_internal, created_at, author:user_profiles!support_case_messages_author_user_id_fkey(display_name)')
    .eq('case_id', args.caseId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as MessageRow[]).map((r) => ({
    id: r.id,
    caseId: r.case_id,
    authorName: r.author?.[0]?.display_name ?? null,
    authorIsStaff: r.author_kind === 'staff',
    authorIsMe: r.author_user_id === args.myUserId,
    body: r.body,
    isInternal: r.is_internal,
    createdAt: r.created_at,
  }));
}

export type QueueFilters = {
  /** 'unresolved' is the working queue; omit to list everything. */
  scope?: 'unresolved' | 'all';
  limit?: number;
};

/** The staff queue, with who asked and who is answering. */
export async function fetchSupportQueue(
  supabase: SupabaseClient,
  { scope = 'unresolved', limit = 50 }: QueueFilters = {},
): Promise<SupportCase[]> {
  let query = supabase
    .from('support_cases')
    .select(`${CASE_COLUMNS}, requester:user_profiles!support_cases_requested_by_fkey(display_name), assignee:user_profiles!support_cases_assigned_to_fkey(display_name)`)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (scope === 'unresolved') {
    query = query.in('status', ['open', 'assigned', 'waiting_on_user']);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as CaseRow[]).map(toCase);
}

// ---------------------------------------------------------------------------
// The history behind a case
// ---------------------------------------------------------------------------
/**
 * Six tables in this schema are written so that a support agent can explain how a
 * state came about — `order_status_history`, `subscription_history`,
 * `entitlement_events`, `course_enrolment_version_history`, `publication_events`
 * and `adult_learning_shares` — and none of them was readable by any screen. This
 * is the read model for them.
 *
 * Everything arrives from one call to `support_case_history()`, which is a
 * SECURITY DEFINER function and therefore the only place that decides what a
 * member of staff may see. Two consequences shape this module:
 *
 *   * The scope is the requester's, not the reader's. The bundle describes the
 *     learners and payments the person who asked could see, so a support agent
 *     answering a case about one family is not handed the platform. Nothing here
 *     can widen that, and no query in this file reaches those tables directly.
 *   * A section that comes back empty means empty. Because the sections are only
 *     ever filled by a function that can read every row, a missing or malformed
 *     section is refused rather than defaulted — an invented empty list is the one
 *     answer a support agent cannot recover from.
 *
 * The seventh table, `access_checks`, is not in the bundle at all. Its comment
 * promises a log of denials and nothing has ever written a row to it; the panel
 * says so in words instead of showing an empty list.
 */

/** Every section reports how many rows exist beside the rows it returned, so a
 *  cap in the SQL is never silent. */
export type CaseHistorySection<T> = {
  total: number;
  rows: T[];
};

export type CaseHistoryRequester = {
  userId: string;
  displayName: string | null;
  accountStatus: string | null;
  createdAt: string | null;
};

export type CaseHistoryLearner = {
  id: string;
  displayName: string | null;
  learnerType: string | null;
  ageBand: string | null;
  status: string | null;
  /** True when this is the profile belonging to the person who asked. */
  isRequester: boolean;
};

/** One step in a status history, shared by orders and subscriptions. */
export type CaseHistoryStatusStep = {
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  changedByName: string | null;
  occurredAt: string | null;
};

export type CaseHistoryOrder = {
  id: string;
  isCaseOrder: boolean;
  status: string | null;
  currencyCode: string | null;
  subtotalMinor: number | null;
  discountMinor: number | null;
  taxMinor: number | null;
  totalMinor: number | null;
  placedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  billingAccountId: string | null;
  history: CaseHistoryStatusStep[];
};

export type CaseHistorySubscription = {
  id: string;
  status: string | null;
  planId: string | null;
  planName: string | null;
  planVersionId: string | null;
  billingInterval: string | null;
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  billingAccountId: string | null;
  history: CaseHistoryStatusStep[];
};

export type CaseHistoryEntitlementEvent = {
  eventType: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  performedBy: string | null;
  performedByName: string | null;
  occurredAt: string | null;
};

export type CaseHistoryEntitlement = {
  id: string;
  learnerProfileId: string | null;
  learnerName: string | null;
  scopeType: string | null;
  courseId: string | null;
  courseTitle: string | null;
  courseVersionId: string | null;
  subjectAreaId: string | null;
  featureCode: string | null;
  sourceType: string | null;
  status: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  events: CaseHistoryEntitlementEvent[];
};

export type CaseHistoryVersionStep = {
  fromVersionId: string | null;
  toVersionId: string | null;
  reason: string | null;
  method: string | null;
  initiator: string | null;
  initiatorName: string | null;
  occurredAt: string | null;
};

export type CaseHistoryEnrolment = {
  id: string;
  learnerProfileId: string | null;
  learnerName: string | null;
  courseId: string | null;
  courseTitle: string | null;
  courseVersionId: string | null;
  versionNumber: number | null;
  versionStatus: string | null;
  status: string | null;
  source: string | null;
  enrolledAt: string | null;
  completedAt: string | null;
  versionHistory: CaseHistoryVersionStep[];
};

export type CaseHistoryPublicationEvent = {
  courseVersionId: string;
  courseTitle: string | null;
  versionNumber: number | null;
  eventType: string | null;
  reason: string | null;
  performedBy: string | null;
  performedByName: string | null;
  occurredAt: string | null;
};

export type CaseHistoryShare = {
  id: string;
  learnerProfileId: string | null;
  learnerName: string | null;
  granteeUserId: string | null;
  granteeName: string | null;
  scope: string | null;
  status: string | null;
  grantedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type CaseHistory = {
  generatedAt: string | null;
  requester: CaseHistoryRequester | null;
  /** The learner named on the case, or null when the requester did not name one. */
  learner: Omit<CaseHistoryLearner, 'isRequester'> | null;
  learners: CaseHistoryLearner[];
  orders: CaseHistorySection<CaseHistoryOrder>;
  subscriptions: CaseHistorySection<CaseHistorySubscription>;
  entitlements: CaseHistorySection<CaseHistoryEntitlement>;
  enrolments: CaseHistorySection<CaseHistoryEnrolment>;
  publicationEvents: CaseHistorySection<CaseHistoryPublicationEvent>;
  shares: CaseHistorySection<CaseHistoryShare>;
};

export const HISTORY_ORDER_STATUS_LABEL: Record<string, string> = {
  draft: 'Not placed',
  pending_payment: 'Waiting for payment',
  awaiting_confirmation: 'Waiting for us to confirm',
  paid: 'Paid',
  partially_refunded: 'Partly refunded',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  failed: 'Failed',
  expired: 'Expired',
};

export const HISTORY_SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  trialing: 'Trialling',
  active: 'Active',
  past_due: 'Past due',
  paused: 'Paused',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const HISTORY_ENTITLEMENT_STATUS_LABEL: Record<string, string> = {
  active: 'Can open it',
  suspended: 'Suspended',
  revoked: 'Revoked',
  expired: 'Expired',
};

export const HISTORY_ENTITLEMENT_EVENT_LABEL: Record<string, string> = {
  granted: 'Granted',
  activated: 'Activated',
  suspended: 'Suspended',
  restored: 'Restored',
  revoked: 'Revoked',
  expired: 'Expired',
};

export const HISTORY_ENROLMENT_STATUS_LABEL: Record<string, string> = {
  active: 'Enrolled',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
  suspended: 'Suspended',
  expired: 'Expired',
};

export const HISTORY_PUBLICATION_EVENT_LABEL: Record<string, string> = {
  submitted: 'Sent for review',
  approved_for_publication: 'Approved',
  published: 'Published',
  suspended: 'Suspended',
  restored: 'Restored',
  retired: 'Retired',
};

/** How an enrolment came to point at a different version of its course. */
export const HISTORY_REPIN_METHOD_LABEL: Record<string, string> = {
  admin: 'Changed by staff',
  learner_request: 'At the learner\'s request',
  course_merge: 'Courses merged',
  data_repair: 'Data repair',
};

export const HISTORY_SHARE_SCOPE_LABEL: Record<string, string> = {
  progress: 'Progress',
  achievements: 'Achievements',
  progress_and_achievements: 'Progress and achievements',
};

export const HISTORY_SHARE_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  revoked: 'Revoked',
  expired: 'Expired',
};

export const HISTORY_LEARNER_TYPE_LABEL: Record<string, string> = {
  adult: 'Adult',
  child: 'Child',
};

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function whole(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function list(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) return null;
  const rows: Record<string, unknown>[] = [];
  for (const item of value) {
    const row = record(item);
    if (!row) return null;
    rows.push(row);
  }
  return rows;
}

function readStatusSteps(value: unknown): CaseHistoryStatusStep[] | null {
  const rows = list(value);
  if (!rows) return null;
  return rows.map((r) => ({
    fromStatus: text(r.fromStatus),
    toStatus: text(r.toStatus),
    reason: text(r.reason),
    changedBy: text(r.changedBy),
    changedByName: text(r.changedByName),
    occurredAt: text(r.occurredAt),
  }));
}

function readSection<T>(
  value: unknown,
  readRow: (row: Record<string, unknown>) => T | null,
): CaseHistorySection<T> | null {
  const body = record(value);
  if (!body) return null;
  const total = whole(body.total);
  const rows = list(body.rows);
  if (total === null || !rows) return null;
  const out: T[] = [];
  for (const row of rows) {
    const read = readRow(row);
    if (!read) return null;
    out.push(read);
  }
  return { total, rows: out };
}

function learnerOf(row: Record<string, unknown>): Omit<CaseHistoryLearner, 'isRequester'> | null {
  const id = text(row.id);
  if (!id) return null;
  return {
    id,
    displayName: text(row.displayName),
    learnerType: text(row.learnerType),
    ageBand: text(row.ageBand),
    status: text(row.status),
  };
}

/**
 * Read the bundle, or refuse.
 *
 * The sections are the answer, so a section that is missing, is not an object, or
 * carries rows that are not objects is a refusal rather than an empty list. The
 * fields inside a row are not required: a course with no title yet is a fact about
 * the course, not a malformed payload.
 */
export function readCaseHistory(value: unknown): { history: CaseHistory } | { error: string } {
  const body = record(value);
  if (!body) return { error: 'the history came back empty' };

  const requesterRow = body.requester === null ? null : record(body.requester);
  if (body.requester !== null && !requesterRow) {
    return { error: 'the history did not identify who asked' };
  }
  const requesterUserId = requesterRow ? text(requesterRow.userId) : null;
  if (requesterRow && !requesterUserId) {
    return { error: 'the history did not identify who asked' };
  }

  const learnerRow = body.learner === null ? null : record(body.learner);
  const learner = learnerRow ? learnerOf(learnerRow) : null;
  if (body.learner !== null && !learner) {
    return { error: 'the history named a learner it could not describe' };
  }

  const learnerRows = list(body.learners);
  if (!learnerRows) return { error: 'the history did not say which learners it covers' };
  const learners: CaseHistoryLearner[] = [];
  for (const row of learnerRows) {
    const read = learnerOf(row);
    if (!read) return { error: 'the history could not describe a learner it covers' };
    learners.push({ ...read, isRequester: row.isRequester === true });
  }

  const sections = {
    orders: readSection(body.orders, (r) => {
      const id = text(r.id);
      if (!id) return null;
      const history = readStatusSteps(r.history);
      if (!history) return null;
      const order: CaseHistoryOrder = {
        id,
        isCaseOrder: r.isCaseOrder === true,
        status: text(r.status),
        currencyCode: text(r.currencyCode),
        subtotalMinor: whole(r.subtotalMinor),
        discountMinor: whole(r.discountMinor),
        taxMinor: whole(r.taxMinor),
        totalMinor: whole(r.totalMinor),
        placedAt: text(r.placedAt),
        paidAt: text(r.paidAt),
        cancelledAt: text(r.cancelledAt),
        billingAccountId: text(r.billingAccountId),
        history,
      };
      return order;
    }),
    subscriptions: readSection(body.subscriptions, (r) => {
      const id = text(r.id);
      if (!id) return null;
      const history = readStatusSteps(r.history);
      if (!history) return null;
      const subscription: CaseHistorySubscription = {
        id,
        status: text(r.status),
        planId: text(r.planId),
        planName: text(r.planName),
        planVersionId: text(r.planVersionId),
        billingInterval: text(r.billingInterval),
        startedAt: text(r.startedAt),
        currentPeriodStart: text(r.currentPeriodStart),
        currentPeriodEnd: text(r.currentPeriodEnd),
        cancelledAt: text(r.cancelledAt),
        cancelReason: text(r.cancelReason),
        billingAccountId: text(r.billingAccountId),
        history,
      };
      return subscription;
    }),
    entitlements: readSection(body.entitlements, (r) => {
      const id = text(r.id);
      if (!id) return null;
      const events = list(r.events);
      if (!events) return null;
      const grant: CaseHistoryEntitlement = {
        id,
        learnerProfileId: text(r.learnerProfileId),
        learnerName: text(r.learnerName),
        scopeType: text(r.scopeType),
        courseId: text(r.courseId),
        courseTitle: text(r.courseTitle),
        courseVersionId: text(r.courseVersionId),
        subjectAreaId: text(r.subjectAreaId),
        featureCode: text(r.featureCode),
        sourceType: text(r.sourceType),
        status: text(r.status),
        effectiveFrom: text(r.effectiveFrom),
        effectiveUntil: text(r.effectiveUntil),
        revokedAt: text(r.revokedAt),
        revocationReason: text(r.revocationReason),
        events: events.map((e) => ({
          eventType: text(e.eventType),
          fromStatus: text(e.fromStatus),
          toStatus: text(e.toStatus),
          reason: text(e.reason),
          performedBy: text(e.performedBy),
          performedByName: text(e.performedByName),
          occurredAt: text(e.occurredAt),
        })),
      };
      return grant;
    }),
    enrolments: readSection(body.enrolments, (r) => {
      const id = text(r.id);
      if (!id) return null;
      const steps = list(r.versionHistory);
      if (!steps) return null;
      const enrolment: CaseHistoryEnrolment = {
        id,
        learnerProfileId: text(r.learnerProfileId),
        learnerName: text(r.learnerName),
        courseId: text(r.courseId),
        courseTitle: text(r.courseTitle),
        courseVersionId: text(r.courseVersionId),
        versionNumber: whole(r.versionNumber),
        versionStatus: text(r.versionStatus),
        status: text(r.status),
        source: text(r.source),
        enrolledAt: text(r.enrolledAt),
        completedAt: text(r.completedAt),
        versionHistory: steps.map((step) => ({
          fromVersionId: text(step.fromVersionId),
          toVersionId: text(step.toVersionId),
          reason: text(step.reason),
          method: text(step.method),
          initiator: text(step.initiator),
          initiatorName: text(step.initiatorName),
          occurredAt: text(step.occurredAt),
        })),
      };
      return enrolment;
    }),
    publicationEvents: readSection(body.publicationEvents, (r) => {
      const courseVersionId = text(r.courseVersionId);
      if (!courseVersionId) return null;
      const event: CaseHistoryPublicationEvent = {
        courseVersionId,
        courseTitle: text(r.courseTitle),
        versionNumber: whole(r.versionNumber),
        eventType: text(r.eventType),
        reason: text(r.reason),
        performedBy: text(r.performedBy),
        performedByName: text(r.performedByName),
        occurredAt: text(r.occurredAt),
      };
      return event;
    }),
    shares: readSection(body.shares, (r) => {
      const id = text(r.id);
      if (!id) return null;
      const share: CaseHistoryShare = {
        id,
        learnerProfileId: text(r.learnerProfileId),
        learnerName: text(r.learnerName),
        granteeUserId: text(r.granteeUserId),
        granteeName: text(r.granteeName),
        scope: text(r.scope),
        status: text(r.status),
        grantedAt: text(r.grantedAt),
        expiresAt: text(r.expiresAt),
        revokedAt: text(r.revokedAt),
      };
      return share;
    }),
  };

  for (const [name, section] of Object.entries(sections)) {
    if (!section) return { error: `the history could not be read: ${name}` };
  }

  return {
    history: {
      generatedAt: text(body.generatedAt),
      requester: requesterRow
        ? {
            userId: requesterUserId as string,
            displayName: text(requesterRow.displayName),
            accountStatus: text(requesterRow.accountStatus),
            createdAt: text(requesterRow.createdAt),
          }
        : null,
      learner,
      learners,
      orders: sections.orders as CaseHistorySection<CaseHistoryOrder>,
      subscriptions: sections.subscriptions as CaseHistorySection<CaseHistorySubscription>,
      entitlements: sections.entitlements as CaseHistorySection<CaseHistoryEntitlement>,
      enrolments: sections.enrolments as CaseHistorySection<CaseHistoryEnrolment>,
      publicationEvents:
        sections.publicationEvents as CaseHistorySection<CaseHistoryPublicationEvent>,
      shares: sections.shares as CaseHistorySection<CaseHistoryShare>,
    },
  };
}

export type CaseHistoryResult =
  | { ok: true; history: CaseHistory }
  | { ok: false; status: number; error: string };

/**
 * The history behind one case.
 *
 * Only staff may call it, and the function refuses everybody else, so the caller
 * does not have to be trusted to check first — though the panel that renders it is
 * only mounted for staff, because a requester has no business being shown a bundle
 * built from tables they cannot read.
 */
export async function fetchCaseHistory(
  supabase: SupabaseClient,
  caseId: string,
): Promise<CaseHistoryResult> {
  const { data, error } = await supabase.rpc('support_case_history', { p_case_id: caseId });
  if (error) {
    // mapSupportError cannot succeed, but its return type allows it, and a cast
    // here would be the only place this module pretends a refusal is an answer.
    const mapped = mapSupportError(error);
    return mapped.ok
      ? { ok: false, status: 502, error: 'the history could not be read' }
      : { ok: false, status: mapped.status, error: mapped.error };
  }
  const read = readCaseHistory(data);
  if ('error' in read) return { ok: false, status: 502, error: read.error };
  return { ok: true, history: read.history };
}
