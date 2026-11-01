import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The route half of the class-list export.
 *
 * `cohort-csv.test.ts` pins the file's shape. These tests pin the three things
 * about the route that would be wrong silently: that it does not decide who may
 * see a class, that the copy is recorded before it is handed over, and that the
 * page has a door to it.
 *
 * Reading the source is a blunt instrument — it can prove a call is written, not
 * that it runs first. It is used here because the alternative is worse: a route
 * that hands a register of children's names to whoever asks is either tested by
 * reading it, or it is not tested at all until somebody notices.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, '..', path), 'utf8');

const ROUTE = 'app/api/teach/courses/[courseId]/cohorts/[cohortId]/roster/route.ts';
const route = read(ROUTE);
const page = read('app/teach/[courseId]/cohorts/[cohortId]/page.tsx');

/**
 * The same source with its comments removed.
 *
 * The route explains itself at length, and the explanations name the functions it
 * deliberately does *not* call. Asserting on the raw file would read its prose as
 * code; these tests are about what it does.
 */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const routeCode = code(route);

test('the route asks the roster who may see the class, and does not answer it itself', () => {
  // The same function the class page reads. A second copy of the rule here —
  // `can_manage_cohort`, the flag checks, a join — is a second answer to "who may
  // see this child", and the two would eventually disagree.
  assert.match(routeCode, /fetchCohortProgress\(supabase, cohortId\)/);
  assert.doesNotMatch(routeCode, /cohort_learner_progress/);
  assert.doesNotMatch(routeCode, /can_manage_cohort|can_read_learner_course_progress/);
  assert.doesNotMatch(routeCode, /setting_bool|isFlagEnabled/);
  // And it does not read progress from the tables on its own.
  assert.doesNotMatch(routeCode, /from\('lesson_progress'\)/);
  assert.doesNotMatch(routeCode, /enrolment_progress_summary/);
});

test('the copy is recorded before the file is sent, and a copy that cannot be recorded is not made', () => {
  const logged = routeCode.indexOf("rpc('log_cohort_roster_export'");
  const sent = routeCode.indexOf('new NextResponse(body');
  assert(logged > -1, 'the route does not record the export');
  assert(sent > -1, 'the route does not return a file');
  assert(logged < sent, 'the file is handed over before the copy is recorded');
  assert.match(routeCode, /if \(logError\) \{[\s\S]{0,600}?status: 409/);
});

test('an empty roster is refused rather than sent as an empty file', () => {
  assert.match(routeCode, /result\.rows\.length === 0[\s\S]{0,300}?status: 404/);
});

test('the download is a CSV a spreadsheet opens, not text a browser renders', () => {
  assert.match(routeCode, /'content-type': 'text\/csv; charset=utf-8'/);
  assert.match(routeCode, /'content-disposition': `attachment; filename="\$\{rosterFileName\(meta\)\}"/);
  assert.match(routeCode, /'cache-control': 'no-store'/);
  // The byte-order mark, or Excel on Windows reads the local code page and every
  // Arabic name in the file is mojibake.
  assert.match(routeCode, /`\\uFEFF\$\{rosterCsv\(/);
});

test('the route signs the caller in, and a malformed id is not a query', () => {
  assert.match(routeCode, /await supabase\.auth\.getUser\(\)/);
  assert.match(routeCode, /if \(!user\)/);
  assert.match(routeCode, /if \(!UUID\.test\(courseId\) \|\| !UUID\.test\(cohortId\)\)/);
  // The class must belong to the course in the URL, or one course's name would be
  // written over another course's learners.
  assert.match(routeCode, /fetchCourseCohorts\(supabase, \{ courseId \}\)/);
  assert.match(routeCode, /cohorts\.find\(\(c\) => c\.id === cohortId\)/);
});

test('the class page carries the door, next to the list it copies', () => {
  assert.match(
    page,
    /href=\{`\/api\/teach\/courses\/\$\{courseId\}\/cohorts\/\$\{cohortId\}\/roster`\}/,
  );
  assert.match(page, /Take this list into a spreadsheet/);
  // Offered only where there is something to offer: the link sits inside the
  // branch that already knows the roster is readable and non-empty.
  const link = page.indexOf('Take this list into a spreadsheet');
  const emptyBranch = page.indexOf('Nobody is in this class yet');
  assert(emptyBranch > -1 && link > emptyBranch, 'the link is offered for an empty class');
});
