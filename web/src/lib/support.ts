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
  if (error.code === 'insufficient_privilege' || /only staff|cannot|sign in/i.test(message)) {
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
