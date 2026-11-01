import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCohortProgress } from '@/lib/cohort-analytics';
import { fetchCourseCohorts } from '@/lib/cohorts';
import { rosterCsv, rosterFileName, type RosterMeta } from '@/lib/cohort-csv';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A class list, as a file.
 *
 * The permission is not decided here. `fetchCohortProgress()` asks
 * `cohort_learner_progress()`, the same function the class page reads, so the file
 * holds exactly the rows the teacher can already see on screen — nothing filtered
 * out, nothing added. A route with its own rule would be a second answer to "who
 * may see this child", and two answers drift.
 *
 * The copy is recorded before it is handed over. `log_cohort_roster_export()`
 * writes the audit event and re-counts the learners itself; a file whose record
 * could not be written is not sent, because a copy nobody can account for is
 * worse than no copy — and there is no "afterwards" that can un-send a download.
 *
 * An empty roster is refused rather than turned into an empty file. The database
 * deliberately cannot tell a caller apart from an empty class, a class they do not
 * manage, and a switched-off feature; turning any of those into a valid-looking
 * spreadsheet would say "nobody is in this class", which may be a lie.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; cohortId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const { courseId, cohortId } = await params;
  if (!UUID.test(courseId) || !UUID.test(cohortId)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'sign in to export a class list' }, { status: 401 });
  }

  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('id,title')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle();
  if (courseError) {
    return NextResponse.json({ error: 'This course could not be read.' }, { status: 500 });
  }
  const course = courseData as unknown as { id: string; title: string } | null;
  if (!course) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Scoped by `course_id` at the query, so a class belonging to another course is
  // simply not this course's class — the same answer the page gives.
  const cohorts = await fetchCourseCohorts(supabase, { courseId });
  const cohort = cohorts.find((c) => c.id === cohortId);
  if (!cohort) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const versionResult = await supabase
    .from('course_versions')
    .select('version_number')
    .eq('id', cohort.courseVersionId)
    .maybeSingle();
  const versionNumber = versionResult.error
    ? null
    : (versionResult.data as unknown as { version_number: number } | null)?.version_number ?? null;

  const result = await fetchCohortProgress(supabase, cohortId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: 'There is nothing in this class that you can see, so there is no file to make.' },
      { status: 404 },
    );
  }

  const { error: logError } = await supabase.rpc('log_cohort_roster_export', {
    p_cohort_id: cohortId,
  });
  if (logError) {
    return NextResponse.json(
      {
        error:
          'The copy could not be recorded, so it was not made. Nothing was downloaded. Try again in a moment.',
      },
      { status: 409 },
    );
  }

  const meta: RosterMeta = {
    courseTitle: course.title,
    cohortTitle: cohort.title,
    versionNumber,
    generatedAt: new Date(),
  };

  // The byte-order mark is what makes Excel on Windows read UTF-8 rather than the
  // local code page; without it every Arabic name is mojibake.
  const body = `\uFEFF${rosterCsv(result.rows, meta)}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${rosterFileName(meta)}"`,
      'cache-control': 'no-store',
    },
  });
}
