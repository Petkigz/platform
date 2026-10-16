import type { SupabaseClient } from '@supabase/supabase-js';

export type ReportCategory =
  | 'doctrinal_error'
  | 'translation_error'
  | 'inappropriate_content'
  | 'copyright'
  | 'technical_fault'
  | 'misattribution'
  | 'other';

export const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'doctrinal_error', label: 'Doctrinal error' },
  { value: 'translation_error', label: 'Translation or wording error' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'misattribution', label: 'Misattribution' },
  { value: 'copyright', label: 'Copyright' },
  { value: 'technical_fault', label: 'Technical fault' },
  { value: 'other', label: 'Something else' },
];

const DESCRIPTION_MAX = 2000;

/**
 * The categories the database accepts. Kept next to the labels so the form
 * cannot offer one that the CHECK constraint would refuse — a dropdown that
 * can produce an invalid value is a bug that only appears when someone uses it.
 */
const VALID_CATEGORIES = new Set<string>(REPORT_CATEGORIES.map((c) => c.value));

export type ReportInput = {
  lessonId?: unknown;
  category?: unknown;
  description?: unknown;
  discussionPostId?: unknown;
};

export type ReportResult =
  | { ok: true; reportId: string }
  | { ok: false; status: number; error: string };

/**
 * Flag a problem with a lesson or with a discussion post on it.
 *
 * This is the community safeguard. Moderation catches what a reviewer thinks to
 * look for; it cannot catch everything, and on a platform that teaches faith to
 * children the people reading a lesson are the ones who notice a doctrinal error
 * or a mistranslation. Until this existed there was nowhere for them to say so.
 *
 * The database requires that the reporter can see what they are reporting, which
 * is not a formality: without it, filing a report is a way to probe unpublished
 * course versions by reading back which ids exist.
 */
export async function reportContent(
  supabase: SupabaseClient,
  input: ReportInput,
): Promise<ReportResult> {
  const lessonId = typeof input.lessonId === 'string' ? input.lessonId : '';
  const category = typeof input.category === 'string' ? input.category : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const discussionPostId =
    typeof input.discussionPostId === 'string' && input.discussionPostId
      ? input.discussionPostId
      : null;

  if (!lessonId) return { ok: false, status: 400, error: 'lessonId is required.' };
  if (!VALID_CATEGORIES.has(category)) {
    return { ok: false, status: 400, error: 'Choose what kind of problem this is.' };
  }
  if (!description) {
    return { ok: false, status: 400, error: 'Say what the problem is.' };
  }
  if (description.length > DESCRIPTION_MAX) {
    return {
      ok: false,
      status: 400,
      error: `Please keep it under ${DESCRIPTION_MAX} characters.`,
    };
  }

  const { data, error } = await supabase.rpc('report_content', {
    p_lesson_id: lessonId,
    p_category: category,
    p_description: description,
    p_discussion_post_id: discussionPostId,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('cannot report content you cannot see')) {
      return { ok: false, status: 403, error: 'You cannot report content you cannot see.' };
    }
    if (msg.includes('cannot report a discussion you cannot see')) {
      return {
        ok: false,
        status: 403,
        error: 'You cannot report a discussion you are not enrolled in.',
      };
    }
    if (msg.includes('not on this lesson')) {
      return { ok: false, status: 400, error: 'That post is not on this lesson.' };
    }
    if (msg.includes('duplicate key')) {
      return {
        ok: false,
        status: 409,
        error: 'You already have an open report of this kind here. It has not been ignored.',
      };
    }
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true, reportId: String(data) };
}

export type QueueReport = {
  id: string;
  report_category: string;
  description: string;
  status: string;
  created_at: string;
  reporter: { display_name: string | null } | null;
  lesson: { title: string | null } | null;
};

/** Reports waiting on a person. RLS decides who can see this. */
export async function fetchReportQueue(
  supabase: SupabaseClient,
): Promise<QueueReport[]> {
  const { data, error } = await supabase
    .from('content_reports')
    .select(
      'id, report_category, description, status, created_at, lesson_id,' +
        'reporter:reported_by(display_name), lesson:lesson_id(title)',
    )
    .in('status', ['submitted', 'triaged', 'under_review'])
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as {
    id: string;
    report_category: string;
    description: string;
    status: string;
    created_at: string;
    reporter: { display_name: string | null }[] | null;
    lesson: { title: string | null }[] | null;
  }[]).map(({ reporter, lesson, ...row }) => ({
    ...row,
    reporter: reporter?.[0] ?? null,
    lesson: lesson?.[0] ?? null,
  }));
}

export type ResolveInput = {
  reportId?: unknown;
  status?: unknown;
  notes?: unknown;
};

export type ResolveResult = { ok: true } | { ok: false; status: number; error: string };

const CLOSING_STATUSES = new Set(['resolved', 'dismissed']);
const VALID_STATUSES = new Set(['triaged', 'under_review', 'resolved', 'dismissed']);

/**
 * Move a report through triage to closed.
 *
 * Closing needs a written note, and the database enforces that too. A queue of
 * silently dismissed reports teaches readers that reporting does nothing, which
 * is worse than not offering the button at all.
 */
export async function resolveReport(
  supabase: SupabaseClient,
  input: ResolveInput,
): Promise<ResolveResult> {
  const reportId = typeof input.reportId === 'string' ? input.reportId : '';
  const status = typeof input.status === 'string' ? input.status : '';
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';

  if (!reportId) return { ok: false, status: 400, error: 'reportId is required.' };
  if (!VALID_STATUSES.has(status)) {
    return { ok: false, status: 400, error: 'That is not a status a report can be moved to.' };
  }
  if (CLOSING_STATUSES.has(status) && !notes) {
    return { ok: false, status: 400, error: 'Closing a report needs a written note.' };
  }

  const { error } = await supabase.rpc('resolve_content_report', {
    p_report_id: reportId,
    p_status: status,
    p_notes: notes || null,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('only staff may resolve')) {
      return { ok: false, status: 403, error: 'Only staff can resolve a report.' };
    }
    if (msg.includes('already')) {
      return { ok: false, status: 409, error: 'That report has already been closed.' };
    }
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true };
}

export type AppealInput = {
  decisionId?: unknown;
  reason?: unknown;
};

export type AppealResult =
  | { ok: true; appealId: string }
  | { ok: false; status: number; error: string };

/**
 * Contest a reviewer's rejection of a course version.
 *
 * Without this a reviewer's word is final and unreviewable, which concentrates a
 * lot of consequence in one person's judgement. A gate with no appeal is not a
 * scholarly gate, it is just a refusal.
 */
export async function appealDecision(
  supabase: SupabaseClient,
  input: AppealInput,
): Promise<AppealResult> {
  const decisionId = typeof input.decisionId === 'string' ? input.decisionId : '';
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';

  if (!decisionId) return { ok: false, status: 400, error: 'decisionId is required.' };
  if (!reason) return { ok: false, status: 400, error: 'Say what you are appealing.' };
  if (reason.length > DESCRIPTION_MAX) {
    return { ok: false, status: 400, error: `Please keep it under ${DESCRIPTION_MAX} characters.` };
  }

  const { data, error } = await supabase.rpc('appeal_review_decision', {
    p_decision_id: decisionId,
    p_reason: reason,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('only the author')) {
      return { ok: false, status: 403, error: 'Only the author of that course can appeal.' };
    }
    if (msg.includes('nothing to appeal')) {
      return { ok: false, status: 409, error: 'That decision was not a rejection.' };
    }
    if (msg.includes('duplicate key')) {
      return {
        ok: false,
        status: 409,
        error: 'You already have an appeal open on this decision.',
      };
    }
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true, appealId: String(data) };
}

export type QueueAppeal = {
  id: string;
  appeal_reason: string;
  status: string;
  created_at: string;
  appellant: { display_name: string | null } | null;
  course_version_id: string | null;
};

/** Appeals waiting on a decision. */
export async function fetchAppealQueue(
  supabase: SupabaseClient,
): Promise<QueueAppeal[]> {
  const { data, error } = await supabase
    .from('governance_appeals')
    .select(
      'id, appeal_reason, status, created_at, related_decision_id,' +
        'appellant:submitted_by(display_name),' +
        'decision:related_decision_id(course_version_id)',
    )
    .in('status', ['submitted', 'accepted_for_review', 'under_review'])
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as {
    id: string;
    appeal_reason: string;
    status: string;
    created_at: string;
    appellant: { display_name: string | null }[] | null;
    decision: { course_version_id: string | null }[] | null;
  }[]).map(({ appellant, decision, ...row }) => ({
    ...row,
    appellant: appellant?.[0] ?? null,
    course_version_id: decision?.[0]?.course_version_id ?? null,
  }));
}

export type DecideAppealInput = {
  appealId?: unknown;
  outcome?: unknown;
  summary?: unknown;
};

export type DecideAppealResult = { ok: true } | { ok: false; status: number; error: string };

const VALID_OUTCOMES = new Set(['upheld', 'overturned', 'withdrawn']);

/**
 * Uphold, overturn or withdraw an appeal.
 *
 * The reviewer whose decision is being appealed cannot decide it — the same rule
 * that stops an author approving their own course and a requester approving
 * their own refund. Upholding your own rejection is not a review.
 */
export async function decideAppeal(
  supabase: SupabaseClient,
  input: DecideAppealInput,
): Promise<DecideAppealResult> {
  const appealId = typeof input.appealId === 'string' ? input.appealId : '';
  const outcome = typeof input.outcome === 'string' ? input.outcome : '';
  const summary = typeof input.summary === 'string' ? input.summary.trim() : '';

  if (!appealId) return { ok: false, status: 400, error: 'appealId is required.' };
  if (!VALID_OUTCOMES.has(outcome)) {
    return { ok: false, status: 400, error: 'That is not an appeal outcome.' };
  }
  if (outcome === 'overturned' && !summary) {
    return {
      ok: false,
      status: 400,
      error: 'Overturning a decision needs a written summary.',
    };
  }

  const { error } = await supabase.rpc('decide_appeal', {
    p_appeal_id: appealId,
    p_outcome: outcome,
    p_summary: summary || null,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('only staff may decide')) {
      return { ok: false, status: 403, error: 'Only staff can decide an appeal.' };
    }
    if (msg.includes('your own decision')) {
      return {
        ok: false,
        status: 403,
        error: 'You cannot decide an appeal against your own decision.',
      };
    }
    if (msg.includes('already')) {
      return { ok: false, status: 409, error: 'That appeal has already been decided.' };
    }
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true };
}

export type Rejection = {
  decisionId: string;
  course_version_id: string;
  version_number: number | null;
  review_scope: string;
  rationale: string | null;
  decided_at: string;
  hasOpenAppeal: boolean;
};

/**
 * Rejections on one course, and whether each has already been appealed.
 *
 * Only the course author can see this: the page that calls it has already
 * established authorship, and content_review_decisions_read admits a decision to
 * the decision-maker and to privileged roles, not to authors. Authors therefore
 * cannot be shown a decision this way, which is why this reads through the
 * appeal-eligible path the author is allowed to use.
 */
export async function fetchRejections(
  supabase: SupabaseClient,
  courseId: string,
): Promise<Rejection[]> {
  const { data: versions, error: vErr } = await supabase
    .from('course_versions')
    .select('id, version_number')
    .eq('course_id', courseId)
    .eq('version_status', 'rejected');

  if (vErr) throw new Error(vErr.message);

  const rows = (versions ?? []) as unknown as { id: string; version_number: number | null }[];
  if (rows.length === 0) return [];

  const versionIds = rows.map((r) => r.id);

  const { data: decisions, error: dErr } = await supabase
    .from('content_review_decisions')
    .select(
      'id, course_version_id, review_scope, rationale, decided_at, decided_by',
    )
    .eq('decision', 'rejected')
    .in('course_version_id', versionIds);

  if (dErr) throw new Error(dErr.message);

  const decisionsRows = (decisions ?? []) as unknown as {
    id: string;
    course_version_id: string;
    review_scope: string;
    rationale: string | null;
    decided_at: string;
    decided_by: string | null;
  }[];

  // One appeal per decision is what the database allows while one is open, so
  // knowing whether an appeal exists decides whether the button belongs here.
  const { data: appeals } = await supabase
    .from('governance_appeals')
    .select('id, related_decision_id, status')
    .in('related_decision_id', decisionsRows.map((d) => d.id));

  const open = new Set(
    ((appeals ?? []) as unknown as { related_decision_id: string; status: string }[])
      .filter((a) => !['upheld', 'overturned', 'withdrawn'].includes(a.status))
      .map((a) => a.related_decision_id),
  );

  const byVersion = new Map(rows.map((r) => [r.id, r.version_number]));

  return decisionsRows.map((d) => ({
    decisionId: d.id,
    course_version_id: d.course_version_id,
    version_number: byVersion.get(d.course_version_id) ?? null,
    review_scope: d.review_scope,
    rationale: d.rationale,
    decided_at: d.decided_at,
    hasOpenAppeal: open.has(d.id),
  }));
}
