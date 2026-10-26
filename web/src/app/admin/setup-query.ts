import type { SupabaseClient } from '@supabase/supabase-js';

import type { SetupFacts } from '@/lib/setup';

/**
 * The four facts the setup panel needs, read as counts.
 *
 * `head: true` with `count: 'exact'` asks PostgREST for the number and none of
 * the rows — four cheap queries instead of four full reads, on a page a staff
 * member opens constantly.
 *
 * A failed count is reported as zero, which errs towards *showing* the panel: a
 * platform that cannot say whether it has courses should be told it has none
 * rather than be reassured that it does. The cost of being wrong that way is a
 * checklist item that is already done; the cost of the other way is a first
 * owner reading "nothing is waiting" on an empty site, which is the defect this
 * exists to fix.
 */
export async function fetchSetupFacts(supabase: SupabaseClient): Promise<SetupFacts> {
  const [subjects, courses, published, reviewers] = await Promise.all([
    supabase
      .from('subject_areas')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .then(({ count, error }) => (error ? 0 : count ?? 0)),

    supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .then(({ count, error }) => (error ? 0 : count ?? 0)),

    supabase
      .from('course_versions')
      .select('id', { count: 'exact', head: true })
      .eq('version_status', 'published')
      .then(({ count, error }) => (error ? 0 : count ?? 0)),

    supabase
      .from('reviewer_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('reviewer_status', 'active')
      .then(({ count, error }) => (error ? 0 : count ?? 0)),

    // Four queries above, and the tuple below must stay four long — a mismatch
    // here would silently report a wrong fact as zero.
  ]).then((values) => values as [number, number, number, number]);

  return { subjects, courses, published, reviewers };
}
