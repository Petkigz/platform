/**
 * Learner ratings and reviews.
 *
 * A review is a satisfaction signal and nothing else. It cannot approve a
 * course, it is not read by the review workflow, and the interface has to say
 * so — on a platform where "reviewed" already means a scholar checked the
 * content, a star rating that reads as an endorsement is a misrepresentation.
 *
 * The rules live in `write_course_review()` and its siblings: enrolled learners
 * only, an account reviews as itself, the author cannot review their own
 * course, one review per learner per course, and text is held until a person
 * publishes it. This module shapes requests and reports what the database
 * decided — including whether a review is being held, which is read back
 * rather than assumed, because "thanks for your review!" over a sentence
 * nobody has approved yet is how someone concludes the site lost it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const REVIEW_BODY_MAX = 2000;
export const RATING_MIN = 1;
export const RATING_MAX = 5;

export type ReviewVisibility = 'visible' | 'pending' | 'withdrawn';

export type ReviewSummary = {
  average: number;
  count: number;
  /** Star value -> number of published reviews. Absent stars are zero. */
  distribution: Record<number, number>;
};

export type CourseReview = {
  id: string;
  courseId: string;
  courseVersionId: string;
  rating: number;
  body: string | null;
  visibility: ReviewVisibility;
  reviewerName: string | null;
  isMine: boolean;
  withdrawnReason: string | null;
  createdAt: string;
};

export type ReviewOutcome<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

type SummaryRow = {
  average_rating: string | number;
  review_count: string | number;
  rating_rows: Record<string, number> | string | null;
};

type ReviewRow = {
  id: string;
  course_id: string;
  course_version_id: string;
  rating: number;
  body: string | null;
  visibility_state: string;
  written_by: string;
  withdrawn_reason: string | null;
  created_at: string;
  reviewer?: { display_name: string | null }[] | null;
  courses?: { title: string; slug: string | null }[] | null;
};

/**
 * A rating is required; words are not.
 *
 * Keeping text optional is the whole reason leaving a review can be two taps,
 * and it is also what makes the moderation rule tractable: a rating has nothing
 * to moderate, so it is counted immediately, and only sentences are held.
 */
export function validateReviewInput(input: { rating?: unknown; body?: unknown }):
  | { ok: true; rating: number; body: string | null }
  | { ok: false; status: number; error: string } {
  const raw = input.rating;
  const rating = typeof raw === 'string' && raw.trim() !== '' ? Number(raw.trim()) : typeof raw === 'number' ? raw : NaN;

  if (!Number.isInteger(rating) || rating < RATING_MIN || rating > RATING_MAX) {
    return { ok: false, status: 400, error: `Choose a rating from ${RATING_MIN} to ${RATING_MAX}.` };
  }

  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (body.length > REVIEW_BODY_MAX) {
    return {
      ok: false,
      status: 400,
      error: `Please keep a review under ${REVIEW_BODY_MAX} characters.`,
    };
  }

  return { ok: true, rating, body: body.length > 0 ? body : null };
}

/** Turn a database refusal into a status and a sentence a person can act on. */
export function mapReviewError(error: { message: string; code?: string }): ReviewOutcome<never> {
  const message = error.message;
  if (error.code === 'P0002' || /not found/i.test(message)) {
    return { ok: false, status: 404, error: message };
  }
  if (
    error.code === 'insufficient_privilege' ||
    /only review a course you are enrolled in|cannot review a course you wrote|only staff|sign in|learner profile/i.test(message)
  ) {
    return { ok: false, status: 403, error: message };
  }
  return { ok: false, status: 409, error: message };
}

export async function fetchReviewSummary(
  supabase: SupabaseClient,
  courseId: string,
): Promise<ReviewSummary> {
  const { data, error } = await supabase.rpc('course_review_summary', {
    p_course_id: courseId,
  });
  if (error) throw new Error(error.message);

  // One aggregate row, always — including for a course nobody has reviewed.
  const rows = (Array.isArray(data) ? data : [data]) as unknown as SummaryRow[];
  const row = rows[0];
  if (!row) return { average: 0, count: 0, distribution: {} };

  const parsed =
    typeof row.rating_rows === 'string'
      ? (JSON.parse(row.rating_rows) as Record<string, number>)
      : (row.rating_rows ?? {});

  const distribution: Record<number, number> = {};
  for (let star = RATING_MIN; star <= RATING_MAX; star++) {
    distribution[star] = Number(parsed[String(star)] ?? 0);
  }

  return {
    average: Number(row.average_rating ?? 0),
    count: Number(row.review_count ?? 0),
    distribution,
  };
}

/**
 * The reviews a caller may read.
 *
 * RLS decides: published reviews to anyone, a held or withdrawn one to its own
 * author and to staff. Nothing here filters by viewer, so this cannot drift
 * into showing a queue that was meant to be private.
 */
export async function fetchCourseReviews(
  supabase: SupabaseClient,
  args: { courseId: string; myUserId?: string | null; limit?: number },
): Promise<CourseReview[]> {
  const { data, error } = await supabase
    .from('course_reviews')
    .select(
      'id, course_id, course_version_id, rating, body, visibility_state, ' +
        'written_by, withdrawn_reason, created_at, ' +
        'reviewer:learner_profiles!course_reviews_learner_profile_id_fkey(display_name)',
    )
    .eq('course_id', args.courseId)
    .order('created_at', { ascending: false })
    .limit(args.limit ?? 20);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as ReviewRow[]).map((r) => ({
    id: r.id,
    courseId: r.course_id,
    courseVersionId: r.course_version_id,
    rating: r.rating,
    body: r.body,
    visibility: r.visibility_state as ReviewVisibility,
    // The learner profile's name, not the account's: a review is written by the
    // learner who studied the course.
    reviewerName: r.reviewer?.[0]?.display_name ?? null,
    isMine: Boolean(args.myUserId) && r.written_by === args.myUserId,
    withdrawnReason: r.withdrawn_reason,
    createdAt: r.created_at,
  }));
}

export async function writeReview(
  supabase: SupabaseClient,
  args: { courseId: string; rating: unknown; body?: unknown },
): Promise<ReviewOutcome<{ id: string; held: boolean }>> {
  const valid = validateReviewInput({ rating: args.rating, body: args.body });
  if (!valid.ok) return valid;

  const { data, error } = await supabase.rpc('write_course_review', {
    p_course_id: args.courseId,
    p_rating: valid.rating,
    p_body: valid.body,
  });
  if (error) return mapReviewError(error);
  if (typeof data !== 'string' || data.length === 0) {
    return { ok: false, status: 500, error: 'The review was not saved.' };
  }

  // Read back what the database decided rather than predicting it.
  const { data: row, error: readError } = await supabase
    .from('course_reviews')
    .select('visibility_state')
    .eq('id', data)
    .maybeSingle();
  if (readError) return mapReviewError(readError);

  return {
    ok: true,
    value: {
      id: data,
      held: (row as { visibility_state: string } | null)?.visibility_state === 'pending',
    },
  };
}

export async function removeReview(
  supabase: SupabaseClient,
  reviewId: string,
): Promise<ReviewOutcome> {
  if (!reviewId) return { ok: false, status: 400, error: 'A review id is required.' };

  const { error } = await supabase.rpc('remove_course_review', { p_review_id: reviewId });
  if (error) return mapReviewError(error);
  return { ok: true, value: undefined };
}

/**
 * May this account review this course?
 *
 * The same question the database asks, resolved before rendering the form: the
 * rule is an enrolment of the caller's *own* learner profile, not entitlement.
 * Being entitled without an enrolment row is possible (a family allocation, an
 * admin grant), and neither is "I studied this".
 */
export async function canReviewCourse(
  supabase: SupabaseClient,
  args: { courseId: string; learnerProfileId: string | null },
): Promise<boolean> {
  if (!args.learnerProfileId) return false;

  const { data, error } = await supabase
    .from('course_enrolments')
    .select('id')
    .eq('course_id', args.courseId)
    .eq('learner_profile_id', args.learnerProfileId)
    .in('status', ['active', 'completed'])
    .is('deleted_at', null)
    .limit(1);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown[]).length > 0;
}

export type ModerationState = 'visible' | 'withdrawn';
export async function moderateReview(
  supabase: SupabaseClient,
  args: { reviewId: string; state: ModerationState; note?: string },
): Promise<ReviewOutcome> {
  if (!args.reviewId) return { ok: false, status: 400, error: 'A review id is required.' };

  const note = typeof args.note === 'string' ? args.note.trim() : '';
  // Withdrawing removes a published opinion from the aggregate. Saying why is
  // not paperwork; it is the sentence the author reads.
  if (args.state === 'withdrawn' && !note) {
    return { ok: false, status: 400, error: 'Withdrawing a review needs a written reason.' };
  }
  if (note.length > REVIEW_BODY_MAX) {
    return { ok: false, status: 400, error: `Please keep the note under ${REVIEW_BODY_MAX} characters.` };
  }

  const { error } = await supabase.rpc('moderate_course_review', {
    p_review_id: args.reviewId,
    p_state: args.state,
    p_note: note || null,
  });
  if (error) return mapReviewError(error);
  return { ok: true, value: undefined };
}

export type QueueReview = CourseReview & { courseTitle: string; courseSlug: string | null };

/** Held reviews, oldest first — the queue is worked in the order it arrived. */
export async function fetchReviewQueue(
  supabase: SupabaseClient,
  limit = 50,
): Promise<QueueReview[]> {
  const { data, error } = await supabase
    .from('course_reviews')
    .select(
      'id, course_id, course_version_id, rating, body, visibility_state, ' +
        'written_by, withdrawn_reason, created_at, ' +
        'reviewer:learner_profiles!course_reviews_learner_profile_id_fkey(display_name), ' +
        'courses!course_reviews_course_id_fkey(title, slug)',
    )
    .eq('visibility_state', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as ReviewRow[]).map((r) => ({
    id: r.id,
    courseId: r.course_id,
    courseVersionId: r.course_version_id,
    rating: r.rating,
    body: r.body,
    visibility: r.visibility_state as ReviewVisibility,
    reviewerName: r.reviewer?.[0]?.display_name ?? null,
    isMine: false,
    withdrawnReason: r.withdrawn_reason,
    createdAt: r.created_at,
    courseTitle: r.courses?.[0]?.title ?? 'Unknown course',
    courseSlug: r.courses?.[0]?.slug ?? null,
  }));
}
