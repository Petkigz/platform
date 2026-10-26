import type { SupabaseClient } from '@supabase/supabase-js';

import { carryOnHeading, continuePoint, type ContinuePoint } from './continue-point.ts';
import { CANDIDATES, rankEnrolments } from './dashboard.ts';
import { flattenOutline, type OutlineSectionRow } from './outline.ts';

/**
 * The one course the dashboard should offer to carry on with.
 *
 * Two reads, not one per course: every progress row for this learner's
 * enrolments, then the outlines of the few versions worth asking about. The
 * ordering rule — activity before enrolment date — is `dashboard.ts`'s, and the
 * choice of lesson inside a course is `continue-point.ts`'s; this function only
 * does the I/O and stops at the first candidate that has anything left to do.
 *
 * **It returns null rather than an empty card.** A learner whose every course is
 * finished gets no "carry on" at all, because a button leading to a course with
 * nothing left in it is worse than no button. Their completed courses are still
 * on the page underneath.
 *
 * A failure in either read is null too. This is the first thing on a dashboard
 * and it is an accelerator, not a prerequisite: the enrolments, their progress
 * and their links are all still there without it.
 */
export type CarryOnLead = {
  enrolmentId: string;
  point: NonNullable<ContinuePoint>;
  copy: { eyebrow: string; action: string };
};

export type CarryOnEnrolment = {
  id: string;
  enrolled_at: string;
  course_version_id: string;
};

type ProgressRow = {
  course_enrolment_id: string;
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  last_seen_at: string | null;
};

export async function fetchCarryOn(
  supabase: SupabaseClient,
  enrolments: readonly CarryOnEnrolment[],
): Promise<CarryOnLead | null> {
  if (enrolments.length === 0) return null;

  // One read for both questions: which course is warm (the newest
  // `last_seen_at`) and what is left to do in it (the statuses).
  const { data: progress, error: progressError } = await supabase
    .from('lesson_progress')
    .select('course_enrolment_id, lesson_id, status, last_seen_at')
    .in('course_enrolment_id', enrolments.map((row) => row.id));

  if (progressError) return null;

  const rows = (progress ?? []) as ProgressRow[];

  const order = rankEnrolments(
    enrolments.map((row) => ({ id: row.id, enrolledAt: row.enrolled_at })),
    rows,
  );

  const byId = new Map(enrolments.map((row) => [row.id, row]));
  const candidates = order
    .map((id) => byId.get(id))
    .filter((row): row is CarryOnEnrolment => Boolean(row))
    .slice(0, CANDIDATES);

  const versions = [...new Set(candidates.map((row) => row.course_version_id))];

  const { data: sections, error: sectionsError } = await supabase
    .from('course_sections')
    .select('course_version_id, id, title, position, lessons ( id, title, position )')
    .in('course_version_id', versions);

  if (sectionsError) return null;

  const sectionsByVersion = new Map<string, OutlineSectionRow[]>();
  for (const row of (sections ?? []) as unknown as (OutlineSectionRow & {
    course_version_id: string;
  })[]) {
    const list = sectionsByVersion.get(row.course_version_id) ?? [];
    list.push(row);
    sectionsByVersion.set(row.course_version_id, list);
  }

  const progressByEnrolment = new Map<string, ProgressRow[]>();
  for (const row of rows) {
    const list = progressByEnrolment.get(row.course_enrolment_id) ?? [];
    list.push(row);
    progressByEnrolment.set(row.course_enrolment_id, list);
  }

  for (const candidate of candidates) {
    const steps = flattenOutline(sectionsByVersion.get(candidate.course_version_id) ?? []);
    const ownRows = progressByEnrolment.get(candidate.id) ?? [];
    const point = continuePoint(steps, ownRows);

    if (!point) continue;

    return {
      enrolmentId: candidate.id,
      point,
      copy: carryOnHeading(point, ownRows.length > 0),
    };
  }

  return null;
}
