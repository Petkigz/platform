/**
 * Saved courses.
 *
 * The register called this "saved courses to buy later" and said it was only
 * meaningful once checkout was on. The buying half still is. The saving half
 * never was: a course can be free, can be published next month, or can be
 * sitting in the catalogue while a family works out which child it is for.
 *
 * Two decisions this module has to keep honest:
 *
 *   * **A saved list belongs to an account, not to a learner profile.** Every
 *     other learner-scoped thing on this platform asks "who is learning?" when
 *     it matters, which is enrolment. Asking it again on a bookmark makes the
 *     one effortless action into a form. The optional note is where intent goes
 *     instead — and the database corrects a supplied owner id to the session, so
 *     a row can never belong to someone else.
 *   * **No prices on this list.** Resolving what a course costs is a per-version
 *     query through products and price rows, and a saved list may hold a hundred
 *     entries. The list says whether a course is available and whether the
 *     account is already enrolled; the price and the buy button are one tap
 *     away on the course page, where that query is already being made for a
 *     single course.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ownLearnerProfileId } from './enrolment.ts';

export const SAVED_NOTE_MAX = 500;
/** Mirrors the ceiling in `guard_course_wishlist()`. */
export const SAVED_MAX = 100;

export type SavedCourse = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  note: string | null;
  savedAt: string;
  /** 'available' | 'unpublished' | 'retired' — what the learner can do next. */
  availability: 'available' | 'unpublished' | 'retired';
  /** Whose enrolment this is, or null when nobody in the family has it yet. */
  enrolledAs: string | null;
};

export type SavedOutcome<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

type SavedRow = {
  id: string;
  course_id: string;
  note: string | null;
  created_at: string;
  courses?: {
    title: string;
    slug: string | null;
    status: string | null;
    deleted_at: string | null;
    course_versions?: { version_status: string | null }[] | null;
  }[] | null;
};

type EnrolmentRow = {
  course_id: string;
  learner_profile_id: string;
  learner_profiles?: { display_name: string | null }[] | null;
};

/**
 * The note is optional, and blank means none.
 *
 * Storing `''` would make an edited-to-empty note indistinguishable from one
 * never written, and the database trims to null anyway — so the two agree.
 */
export function validateNote(input: { note?: unknown }):
  | { ok: true; note: string | null }
  | { ok: false; status: number; error: string } {
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (note.length > SAVED_NOTE_MAX) {
    return {
      ok: false,
      status: 400,
      error: `Please keep a note under ${SAVED_NOTE_MAX} characters.`,
    };
  }
  return { ok: true, note: note.length > 0 ? note : null };
}

/** Turn a database refusal into a status and a sentence a person can act on. */
export function mapWishlistError(error: { message: string; code?: string }): SavedOutcome<never> {
  const message = error.message;
  if (error.code === 'P0002' || /course not found/i.test(message)) {
    return { ok: false, status: 404, error: message };
  }
  if (/only remove your own|row-level security|signed-in owner/i.test(message)) {
    return { ok: false, status: 403, error: 'Sign in to save a course.' };
  }
  if (/no longer offered/i.test(message)) {
    return { ok: false, status: 409, error: 'That course is no longer offered.' };
  }
  if (/remove one first/i.test(message) || error.code === 'program_limit_exceeded') {
    return {
      ok: false,
      status: 409,
      error: `You have saved ${SAVED_MAX} courses already. Remove one first.`,
    };
  }
  if (/duplicate key/i.test(message)) {
    return { ok: false, status: 409, error: 'That course is already saved.' };
  }
  return { ok: false, status: 409, error: message };
}

/**
 * Is this course on the caller's saved list? One row, one question — and it
 * brings the note back with it, so the course page does not need a second query
 * to render the thing it is about to offer to edit.
 *
 * There is no `user_id` filter: row level security decides whose rows are
 * visible, and adding one would only hide a policy mistake.
 */
export async function isCourseSaved(
  supabase: SupabaseClient,
  courseId: string,
): Promise<{ saved: boolean; id: string | null; note: string | null }> {
  const { data, error } = await supabase
    .from('course_wishlist')
    .select('id, note')
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = (data as { id: string; note: string | null } | null) ?? null;
  return { saved: row !== null, id: row?.id ?? null, note: row?.note ?? null };
}

/**
 * Save a course, or update the note on one already saved.
 *
 * An upsert rather than an insert: the second tap on "save" is not an error, and
 * a caller that had to check first would race itself. The database permits the
 * note to change on a course retired since it was saved, and refuses a *new*
 * save of one.
 */
export async function saveCourse(
  supabase: SupabaseClient,
  input: { courseId: string; note?: unknown },
): Promise<SavedOutcome<{ id: string }>> {
  const courseId = typeof input.courseId === 'string' ? input.courseId.trim() : '';
  if (!courseId) {
    return { ok: false, status: 400, error: 'courseId is required.' };
  }

  const note = validateNote({ note: input.note });
  if (!note.ok) return note;

  const { data, error } = await supabase
    .from('course_wishlist')
    .upsert({ course_id: courseId, note: note.note }, { onConflict: 'user_id,course_id' })
    .select('id')
    .maybeSingle();

  if (error) return mapWishlistError(error);
  const id = (data as { id: string } | null)?.id;
  if (!id) return { ok: false, status: 500, error: 'The course was not saved.' };
  return { ok: true, value: { id } };
}

/** Edit the note on a saved course. The course itself cannot be repointed. */
export async function setSavedNote(
  supabase: SupabaseClient,
  input: { savedId: string; note?: unknown },
): Promise<SavedOutcome> {
  const savedId = typeof input.savedId === 'string' ? input.savedId.trim() : '';
  if (!savedId) {
    return { ok: false, status: 400, error: 'savedId is required.' };
  }

  const note = validateNote({ note: input.note });
  if (!note.ok) return note;

  const { error } = await supabase
    .from('course_wishlist')
    .update({ note: note.note })
    .eq('id', savedId);

  if (error) return mapWishlistError(error);
  return { ok: true, value: undefined };
}

/**
 * Remove a saved course.
 *
 * Not flag-gated in the database, deliberately: switching the feature off must
 * not trap rows somebody already saved. A learner who cannot unsave something
 * has been given a list they do not control.
 */
export async function removeSavedCourse(
  supabase: SupabaseClient,
  savedId: string,
): Promise<SavedOutcome> {
  const id = typeof savedId === 'string' ? savedId.trim() : '';
  if (!id) {
    return { ok: false, status: 400, error: 'savedId is required.' };
  }

  const { data, error } = await supabase
    .from('course_wishlist')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) return mapWishlistError(error);
  const removed = ((data ?? []) as unknown[]).length;
  if (removed === 0) {
    // Row level security hides other people's rows, so "nothing deleted" is what
    // a wrong id and somebody else's id both look like. Say the safe thing.
    return { ok: false, status: 404, error: 'That saved course was not found.' };
  }
  return { ok: true, value: undefined };
}

/**
 * The saved list, newest first, with what the learner can do about each one.
 *
 * Row level security decides whose rows come back; there is no `user_id` filter
 * here and there must not be one, because a wrong filter is the only thing
 * standing between this page and somebody else's list.
 */
export async function fetchSavedCourses(
  supabase: SupabaseClient,
  args: { userId: string },
): Promise<SavedCourse[]> {
  const { data, error } = await supabase
    .from('course_wishlist')
    .select(
      'id, course_id, note, created_at, ' +
        'courses!course_wishlist_course_id_fkey ( title, slug, status, deleted_at, ' +
        'course_versions ( version_status ) )',
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as unknown as SavedRow[]);
  if (rows.length === 0) return [];

  // Two queries for the whole list rather than two per row: which of these
  // courses the family already has, and whose they are.
  const courseIds = rows.map((r) => r.course_id);
  const [enrolments, myProfileId] = await Promise.all([
    supabase
      .from('course_enrolments')
      .select('course_id, learner_profile_id, learner_profiles ( display_name )')
      .in('course_id', courseIds)
      .in('status', ['active', 'completed'])
      .is('deleted_at', null),
    ownLearnerProfileId(supabase, args.userId),
  ]);
  if (enrolments.error) throw new Error(enrolments.error.message);

  const enrolled = new Map<string, string>();
  for (const e of (enrolments.data ?? []) as unknown as EnrolmentRow[]) {
    const name =
      e.learner_profile_id === myProfileId
        ? 'you'
        : (e.learner_profiles?.[0]?.display_name ?? 'someone in your family');
    // First enrolment wins; a course taken by two children still reads as taken.
    if (!enrolled.has(e.course_id)) enrolled.set(e.course_id, name);
  }

  return rows.map((r) => {
    const course = r.courses?.[0];
    const published = (course?.course_versions ?? []).some(
      (v) => v.version_status === 'published',
    );
    const availability: SavedCourse['availability'] =
      !course || course.deleted_at !== null || course.status === 'retired'
        ? 'retired'
        : published
          ? 'available'
          : 'unpublished';

    return {
      id: r.id,
      courseId: r.course_id,
      courseTitle: course?.title ?? 'A course that is no longer here',
      courseSlug: course?.slug ?? '',
      note: r.note,
      savedAt: r.created_at,
      availability,
      enrolledAs: enrolled.get(r.course_id) ?? null,
    };
  });
}

/** What the learner can do about a saved course, in one short sentence. */
export function availabilityLabel(c: SavedCourse): string {
  if (c.enrolledAs) return c.enrolledAs === 'you' ? 'You are enrolled' : `Enrolled for ${c.enrolledAs}`;
  if (c.availability === 'retired') return 'No longer offered';
  if (c.availability === 'unpublished') return 'Not published yet';
  return 'Available now';
}
