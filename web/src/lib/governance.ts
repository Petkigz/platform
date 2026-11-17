import { fetchDiscussionContexts, type DiscussionContext } from './discussion-context.ts';
import { encodeDiscussionCursor, type DiscussionCursor } from './discussion-queue-cursor.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { one, type Embedded } from './embed.ts';

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

/** The longest description the form accepts; the textarea stops there too. */
export const REPORT_DESCRIPTION_MAX = 2000;
const DESCRIPTION_MAX = REPORT_DESCRIPTION_MAX;

/**
 * Why a report was refused, as a word a page can translate.
 *
 * The sentences beside them are English and stay in the reply for a page that
 * is English. A page in another language reads the code.
 *
 * `not_visible` is three refusals the database makes (the lesson, the
 * discussion, the post): each means the reporter may not see the thing, and
 * telling them which would tell them it exists.
 */
export type ReportCode =
  | 'no_lesson'
  | 'no_category'
  | 'no_description'
  | 'too_long'
  | 'not_found'
  | 'not_visible'
  | 'wrong_lesson'
  | 'duplicate';

const REPORT_CODES = new Set<string>([
  'no_lesson', 'no_category', 'no_description', 'too_long', 'not_found', 'not_visible', 'wrong_lesson', 'duplicate',
]);

/** What the form says when a report did not go through. */
export type ReportOutcome = 'too_long' | 'not_visible' | 'duplicate' | 'refused' | 'uncertain';

/**
 * What a reply to POST /api/reports means to the person who sent it.
 *
 * Only a 4xx that names a code is a refusal. A lost reply, a server error, a
 * reply with no code and a code this page has never heard of are all
 * `uncertain`: the report may or may not have arrived. Sending it again is
 * safe, because one person can hold only one open report of a kind on a thing
 * and the second is answered `duplicate`.
 */
export function reportOutcomeOf(status: number, code: unknown): ReportOutcome {
  if (status < 400 || status > 499 || typeof code !== 'string' || !REPORT_CODES.has(code)) return 'uncertain';
  if (code === 'too_long' || code === 'not_visible' || code === 'duplicate') return code;
  return 'refused';
}

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
  | { ok: false; status: number; error: string; code?: ReportCode };

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

  if (!lessonId) return { ok: false, status: 400, code: 'no_lesson', error: 'lessonId is required.' };
  if (!VALID_CATEGORIES.has(category)) {
    return { ok: false, status: 400, code: 'no_category', error: 'Choose what kind of problem this is.' };
  }
  if (!description) {
    return { ok: false, status: 400, code: 'no_description', error: 'Say what the problem is.' };
  }
  if (description.length > DESCRIPTION_MAX) {
    return {
      ok: false,
      status: 400,
      code: 'too_long',
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
      return { ok: false, status: 403, code: 'not_visible', error: 'You cannot report content you cannot see.' };
    }
    if (msg.includes('cannot report a discussion you cannot see')) {
      return {
        ok: false,
        status: 403,
        code: 'not_visible',
        error: 'You cannot report a discussion you are not enrolled in.',
      };
    }
    if (msg.includes('discussion post unavailable')) {
      return { ok: false, status: 403, code: 'not_visible', error: 'That post is unavailable to report.' };
    }
    if (msg.includes('not on this lesson')) {
      return { ok: false, status: 400, code: 'wrong_lesson', error: 'That post is not on this lesson.' };
    }
    if (msg.includes('lesson not found')) {
      return { ok: false, status: 404, code: 'not_found', error: 'That lesson was not found.' };
    }
    if (msg.includes('say what the problem is')) {
      return { ok: false, status: 400, code: 'no_description', error: 'Say what the problem is.' };
    }
    if (msg.includes('duplicate key')) {
      return {
        ok: false,
        status: 409,
        code: 'duplicate',
        error: 'You already have an open report of this kind here. It has not been ignored.',
      };
    }
    // Anything else has no code: the page cannot say what happened, and says
    // that rather than print a database's sentence.
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
  discussion_post_id: string | null;
  discussionPost: { body: string; visibility_state: string; parent_id: string | null; parent: DiscussionContext | null } | null;
};

/** Reports waiting on a person. RLS decides who can see this. */
export async function fetchReportQueue(
  supabase: SupabaseClient,
  options: { cursor?: DiscussionCursor | null; limit?: number } = {},
): Promise<{ items: QueueReport[]; nextCursor: string | null }> {
  const limit=options.limit ?? 50;
  if(!Number.isInteger(limit) || limit<1 || limit>100) throw new Error('Invalid report queue page size.');
  let query = supabase
    .from('content_reports')
    .select(
      'id, report_category, description, status, created_at, lesson_id, discussion_post_id,' +
        'reporter:reported_by(display_name), lesson:lesson_id(title), discussion_post:discussion_post_id(body,visibility_state,parent_id,lesson_id)',
    )
    .in('status', ['submitted', 'triaged', 'under_review'])
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit+1);
  if(options.cursor) {
    encodeDiscussionCursor(options.cursor);
    const {createdAt,id}=options.cursor;
    query=query.or(`created_at.gt."${createdAt}",and(created_at.eq."${createdAt}",id.gt.${id})`);
  }
  const {data,error}=await query;
  if (error) throw new Error(error.message);

  const oneRelation = <T>(value: T | T[] | null): T | null =>
    Array.isArray(value) ? value[0] ?? null : value;

  const fetched=((data ?? []) as unknown as {
    id: string;
    report_category: string;
    description: string;
    status: string;
    created_at: string;
    reporter: { display_name: string | null } | { display_name: string | null }[] | null;
    lesson: { title: string | null } | { title: string | null }[] | null;
    discussion_post_id: string | null;
    discussion_post: { body: string; visibility_state: string; parent_id: string | null; lesson_id: string } | { body: string; visibility_state: string; parent_id: string | null; lesson_id: string }[] | null;
  }[]);
  const rows=fetched.slice(0,limit);
  const last=rows.at(-1);
  const nextCursor=fetched.length>limit && last ? encodeDiscussionCursor({createdAt:last.created_at,id:last.id}) : null;
  const posts=rows.map(r=>oneRelation(r.discussion_post));
  const parents=await fetchDiscussionContexts(supabase,posts.flatMap(p=>p?.parent_id ? [p.parent_id] : []));
  const items=rows.map(({ reporter, lesson, discussion_post, ...row }) => {
    const post=oneRelation(discussion_post);
    const parent=post?.parent_id ? parents.get(post.parent_id) : null;
    return {...row,reporter:oneRelation(reporter),lesson:oneRelation(lesson),
      discussionPost:post ? {...post,parent:parent?.lessonId===post.lesson_id ? parent : null} : null};
  });
  return {items,nextCursor};
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
    appellant: Embedded<{ display_name: string | null }>;
    decision: Embedded<{ course_version_id: string | null }>;
  }[]).map(({ appellant, decision, ...row }) => ({
    ...row,
    appellant: one(appellant),
    course_version_id: one(decision)?.course_version_id ?? null,
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
