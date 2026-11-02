import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  courseReportCsv,
  courseReportFileName,
  type CourseReport,
} from '@/lib/course-report-csv';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WINDOWS = [7, 30, 90];

/**
 * A course report, as a file.
 *
 * The permission is not decided here, and neither is the window. `export_course_report()`
 * asks `teacher_course_analytics()` — the same function the page reads — for every
 * figure, so this route cannot hand over a report the screen would refuse, and the
 * numbers in the file are the numbers on the screen because there is one query
 * behind both.
 *
 * **The copy is recorded before it is sent.** The audit row is written inside the
 * same call that returns the report, so a file that could not be recorded is not
 * produced: a copy nobody can account for is worse than no copy, and there is no
 * "afterwards" that can un-send a download. What the row holds is the window, the
 * counts, the format and `aggregate_only: true` — never a learner.
 *
 * An empty window is still a real report and is written rather than refused. A
 * class list with nobody in it would be a lie about who is in the class; a course
 * with no events this week is a fact, which is exactly what a teacher opens the
 * file to find out.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const { courseId } = await params;
  if (!UUID.test(courseId)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const asked = Number(new URL(request.url).searchParams.get('days'));
  const days = WINDOWS.includes(asked) ? asked : 30;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'sign in to export a course report' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('export_course_report', {
    p_course_id: courseId,
    p_days: days,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('does not exist')) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    if (message.includes('belongs to the teacher')) {
      return NextResponse.json(
        { error: 'A course report belongs to the teacher who wrote the course.' },
        { status: 403 },
      );
    }
    if (message.includes('analytics is not enabled')) {
      return NextResponse.json(
        {
          error:
            'Analytics is switched off, so this course has no events to report. Nothing was downloaded.',
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const report = data as unknown as CourseReport | null;
  if (!report || typeof report.title !== 'string') {
    return NextResponse.json(
      { error: 'That report came back empty, so no file was made.' },
      { status: 500 },
    );
  }

  const generatedAt = new Date();
  const meta = { generatedAt, madeFor: 'the teacher who wrote the course' };

  // The byte-order mark is what makes Excel on Windows read UTF-8 rather than the
  // local code page; without it every Arabic course title is mojibake.
  const body = `\uFEFF${courseReportCsv(report, meta)}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${courseReportFileName(report, generatedAt)}"`,
      'cache-control': 'no-store',
    },
  });
}
