import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  courseReportCsv,
  courseReportFileName,
  type CourseReport,
} from './course-report-csv.ts';

const report = (over: Partial<CourseReport> = {}): CourseReport => ({
  courseId: 'c1',
  title: 'Tajweed Basics',
  days: 30,
  since: '2026-10-02T09:00:00Z',
  events: 41,
  learners: 7,
  people: 5,
  byEvent: [
    { code: 'lesson.opened', description: 'A lesson was opened', events: 30, learners: 7 },
    { code: 'course.viewed', description: 'A course page was opened', events: 11, learners: 4 },
  ],
  daily: [
    { day: '2026-10-31', events: 9 },
    { day: '2026-11-01', events: 4 },
  ],
  lessons: [{ lessonId: 'l1', title: 'The conditions of prayer', opens: 18, learners: 6 }],
  enrolments: { total: 12, active: 9, completed: 3, joinedInWindow: 2 },
  certificates: { issued: 3, revoked: 1 },
  aggregateOnly: true,
  ...over,
});

const meta = { generatedAt: new Date('2026-11-02T12:00:00Z'), madeFor: 'the teacher who wrote the course' };

// The document is CRLF, per RFC 4180, because a lone newline inside a quoted
// cell breaks a row in Excel on Windows. The reader splits on the same rule.
const lines = (csv: string) => csv.split('\r\n');

/** The rows of one named section, between its title and the next blank line. */
function section(csv: string, title: string): string[] {
  const all = lines(csv);
  // A heading with a comma in it is quoted by `csvCell`, which is correct and is
  // not a reason for the test to look for the wrong line.
  const start = all.findIndex((line) => line.replace(/^"|"$/g, '') === title);
  assert.notEqual(start, -1, `no section called ${title}`);
  const out: string[] = [];
  for (let i = start + 1; i < all.length; i += 1) {
    const line = all[i] ?? '';
    if (line.trim() === '') break;
    out.push(line);
  }
  return out;
}

test('the file says what it is, and says it does not name anybody', () => {
  const csv = courseReportCsv(report(), meta);

  assert.match(csv, /^Course report/);
  assert.match(csv, /Tajweed Basics/);
  assert.match(csv, /30 days/);
  assert.match(csv, /2026-10-02/, 'the first day of the window is not printed');
  assert.match(csv, /2026-11-02/, 'the day the copy was made is not printed');
  // The sentence a person needs in March, when the address it came from is gone.
  assert.match(csv, /contains no learner name, family, account or contact detail/);
});

test('the two windows are told apart, in the file and in its name', () => {
  const month = courseReportCsv(report({ days: 30 }), meta);
  const week = courseReportCsv(report({ days: 7 }), meta);
  assert.notEqual(month, week, 'a 7-day report and a 30-day report are the same file');

  const a = courseReportFileName(report({ days: 30 }), meta.generatedAt);
  const b = courseReportFileName(report({ days: 7 }), meta.generatedAt);
  assert.notEqual(a, b);
  assert.match(a, /30d/);
  assert.match(a, /2026-11-02\.csv$/);
});

test('every section the database returned is in the file, in order', () => {
  const csv = courseReportCsv(report(), meta);
  const order = ['Course report', 'Totals', 'Events by type', 'Lessons, by opens', 'By day']
    .map((title) => csv.indexOf(title));
  assert.ok(order.every((at) => at >= 0), `a section is missing: ${order}`);
  assert.deepEqual([...order].sort((x, y) => x - y), order, 'the sections are out of order');

  assert.match(section(csv, 'Events by type').join('\n'), /lesson\.opened/);
  assert.match(section(csv, 'Events by type').join('\n'), /A lesson was opened/);
  assert.match(section(csv, 'Lessons, by opens').join('\n'), /The conditions of prayer/);
  assert.match(section(csv, 'By day').join('\n'), /2026-10-31,9/);
});

test('an empty section is still a section, because an absent one reads as "not covered"', () => {
  const csv = courseReportCsv(
    report({ byEvent: [], lessons: [], daily: [], events: 0, learners: 0, people: 0 }),
    meta,
  );
  assert.ok(csv.includes('Events by type'), 'the section vanished when it was empty');
  assert.ok(csv.includes('By day'));
  assert.match(section(csv, 'Totals').join('\n'), /Events in the window,0/);
});

test('the distinct-account count is not passed off as distinct learners', () => {
  // One parent acting for two children is two learners and one account. A file
  // that called both "learners" would be wrong in a way nobody could see.
  const csv = courseReportCsv(report({ learners: 7, people: 5 }), meta);
  const totals = section(csv, 'Totals').join('\n');
  assert.match(totals, /Learners behind those events,7/);
  assert.match(totals, /Accounts behind those events,5/);
});

test('a title that looks like a formula is a title', () => {
  const csv = courseReportCsv(report({ title: '=HYPERLINK("http://x","click")' }), meta);
  assert.ok(csv.includes("'=HYPERLINK"), 'a course title could execute in a spreadsheet');
});

test('a filename survives a title in a script the header cannot carry', () => {
  const name = courseReportFileName(report({ title: 'تجويد' }), meta.generatedAt);
  assert.match(name, /^ayahspring-course-report-course-30d-/,
    'a non-ASCII title produced a filename nobody planned for');
});

test('the page and the route read the one function that audits the copy', () => {
  const page = readFileSync(
    new URL('../app/teach/[courseId]/reports/page.tsx', import.meta.url), 'utf8');
  const route = readFileSync(
    new URL('../app/api/teach/courses/[courseId]/report/route.ts', import.meta.url), 'utf8');

  assert.match(page, /\/api\/teach\/courses\/\$\{courseId\}\/report\?days=\$\{days\}/,
    'the report has no download link, so the file exists and nobody can reach it');
  assert.match(route, /rpc\('export_course_report'/,
    'the route builds a report of its own instead of asking the audited function');
  assert.match(route, /teacher_course_analytics/, 'the comment no longer says which rule it defers to');
  // The one thing that must never appear: a per-learner read on the export path.
  assert.ok(!/cohort_learner_progress|learner_profiles/.test(route),
    'the report route reads a learner list');
});
