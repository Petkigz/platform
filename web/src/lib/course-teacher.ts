/**
 * Who teaches a course.
 *
 * A course page that names nobody is a course page that could have been written
 * by a content farm — and this platform's whole claim is *taught, not just
 * hosted*. The teacher is also the thing the owner's own audience arrives for.
 *
 * But naming a teacher is a disclosure, and the platform has settled where that
 * boundary is (DECISIONS: *Public teacher profiles — disclosure boundary*). A
 * public profile is readable only when `teaching.public_profile` is on, the
 * teacher holds the instructor role, and the profile itself is published. This
 * module therefore reads `instructor_public_profiles` and lets row level
 * security answer: a draft profile, a flag that is off, or a user who is not a
 * teacher all come back as **no row**, and the page must have something true to
 * say in that case.
 *
 * Two rules, both about not making things up:
 *
 *   * **Never a blank attribution.** A profile with an empty name is treated as
 *     no profile — "Taught by " with nothing after it is worse than the honest
 *     sentence.
 *   * **Never a link the database would not serve.** A slug is validated here
 *     as well as by the table's check constraint, because an href built from a
 *     string nobody validated is how a redirect gets introduced later.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type TeacherSummary = {
  displayName: string;
  headline: string | null;
  slug: string;
};

export type TeacherAttribution =
  | {
      kind: 'named';
      name: string;
      headline: string | null;
      /** Their public page, or null when the stored slug is not a slug. */
      href: string | null;
    }
  | {
      kind: 'unnamed';
      /**
       * Why no name is shown. Deliberately about *the platform's settings and
       * the teacher's choice*, never about the teacher's qualification — an
       * anonymous course is not a lesser course.
       */
      reason: string;
    };

/** The same shape the table's check constraint enforces. */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const UNNAMED_REASON =
  'This course was written by a teacher appointed by the platform, and approved by ' +
  'a reviewer before it could be published — an author cannot approve their own ' +
  'course. This teacher has not published a public page, so they are not named here.';

export function teacherAttribution(profile: TeacherSummary | null | undefined): TeacherAttribution {
  const name = (profile?.displayName ?? '').trim();
  if (!profile || name.length === 0) {
    return { kind: 'unnamed', reason: UNNAMED_REASON };
  }

  const slug = (profile.slug ?? '').trim();
  const headline = (profile.headline ?? '').trim();

  return {
    kind: 'named',
    name,
    headline: headline.length > 0 ? headline : null,
    href: SLUG_RE.test(slug) ? `/teachers/${slug}` : null,
  };
}

/**
 * The teacher behind a course, if the public boundary allows them to be named.
 *
 * The filter here is `user_id` and nothing else — `status = 'published'` and the
 * flag are already in the read policy, and re-deciding them in TypeScript would
 * create a second, weaker copy of a rule that has to hold in one place.
 */
export async function fetchCourseTeacher(
  client: SupabaseClient,
  userId: string | null | undefined,
): Promise<TeacherSummary | null> {
  if (!userId) return null;

  const { data, error } = await client
    .from('instructor_public_profiles')
    .select('display_name, headline, slug')
    .eq('user_id', userId)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as {
    display_name: string | null;
    headline: string | null;
    slug: string | null;
  };

  return {
    displayName: row.display_name ?? '',
    headline: row.headline ?? null,
    slug: row.slug ?? '',
  };
}
