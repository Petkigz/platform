/**
 * A course report, as a spreadsheet.
 *
 * The page at `/teach/[courseId]/reports` shows the same figures; this is the
 * same numbers in a grid a teacher can sort, send to a head teacher, or keep in a
 * folder. Four decisions follow from what the page already promises.
 *
 * **Aggregates only, and the file says so.** The report is not a list of learners
 * — it never was, and this file could not become one because the JSON it is built
 * from has no per-learner rows in it. The header states it anyway, in the words a
 * person reading the file in March needs: *this counts learners; it does not name
 * them*.
 *
 * **Every section the database returned, and nothing invented.** `byEvent`,
 * `daily`, `lessons`, `enrolments`, `certificates` are written as they arrive, in
 * the order they arrive. A section that is empty is still a section with its
 * heading and no rows: a report that silently omits "certificates" because nobody
 * has one reads as a report that does not cover certificates.
 *
 * **The window is in the file, not just in the URL.** A spreadsheet is separated
 * from the address it came from within a minute of arriving, so "30 days" and the
 * first date of the window are both printed. Without them, two files a month
 * apart are indistinguishable, and the older one becomes evidence of a decline
 * that is really a difference in window.
 *
 * **A cell is data, never a formula** — the same rule as the account export and
 * the class list, through the same `csvCell()`.
 */

import { csvDocument, type CsvSection } from './csv.ts';

export type ReportEvent = {
  code: string;
  description: string;
  events: number | string;
  learners: number | string;
};

export type ReportDay = { day: string; events: number | string };

export type ReportLesson = {
  lessonId: string;
  title: string;
  opens: number | string;
  learners: number | string;
};

export type CourseReport = {
  courseId?: string;
  title: string;
  days: number;
  since?: string | null;
  events: number | string;
  learners: number | string;
  people: number | string;
  byEvent: ReportEvent[];
  daily: ReportDay[];
  lessons: ReportLesson[];
  enrolments: {
    total: number | string;
    active: number | string;
    completed: number | string;
    joinedInWindow: number | string;
  };
  certificates: { issued: number | string; revoked: number | string };
  aggregateOnly?: boolean;
};

export type CourseReportMeta = {
  /** The day the file was made, so a printed copy is identifiable later. */
  generatedAt: Date;
  /** How the person is reading it, e.g. "the teacher who wrote the course". */
  madeFor: string;
};

const n = (value: number | string | undefined): number => Number(value ?? 0);

const dateOnly = (value: string | null | undefined): string => {
  if (!value) return '';
  const when = new Date(value);
  return Number.isFinite(when.getTime()) ? when.toISOString().slice(0, 10) : '';
};

/**
 * The file, already assembled.
 *
 * Sections in the order a person reads a report: what this is, then the totals,
 * then who is enrolled, then what people did, then which lessons they did it in,
 * then the day-by-day shape.
 */
export function courseReportCsv(report: CourseReport, meta: CourseReportMeta): string {
  const header: CsvSection = {
    title: 'Course report',
    columns: ['Field', 'Value'],
    rows: [
      ['Course', report.title],
      ['Window', `${report.days} days`],
      ['From', dateOnly(report.since)],
      ['Made', meta.generatedAt.toISOString().slice(0, 10)],
      ['Prepared for', meta.madeFor],
      [
        'What this is',
        'Counts of what happened on one course: events, the learners behind them, enrolments, certificates and lesson opens. '
          + 'It contains no learner name, family, account or contact detail — the platform does not give a teacher that list, '
          + 'and this file is no exception.',
      ],
    ],
  };

  const totals: CsvSection = {
    title: 'Totals',
    columns: ['Measure', 'Value'],
    rows: [
      ['Events in the window', String(n(report.events))],
      ['Learners behind those events', String(n(report.learners))],
      // Distinct accounts, which is not the same thing as distinct learners: one
      // parent may be acting for two children.
      ['Accounts behind those events', String(n(report.people))],
      ['Enrolled, all time', String(n(report.enrolments?.total))],
      ['Enrolled and active', String(n(report.enrolments?.active))],
      ['Completed', String(n(report.enrolments?.completed))],
      ['Joined inside the window', String(n(report.enrolments?.joinedInWindow))],
      ['Certificates issued', String(n(report.certificates?.issued))],
      ['Certificates revoked', String(n(report.certificates?.revoked))],
    ],
  };

  const events: CsvSection = {
    title: 'Events by type',
    columns: ['Event', 'What it means', 'Events', 'Learners'],
    rows: (report.byEvent ?? []).map((row) => [
      row.code,
      row.description ?? '',
      String(n(row.events)),
      String(n(row.learners)),
    ]),
  };

  const lessons: CsvSection = {
    title: 'Lessons, by opens',
    columns: ['Lesson', 'Opens', 'Learners'],
    rows: (report.lessons ?? []).map((row) => [
      row.title,
      String(n(row.opens)),
      String(n(row.learners)),
    ]),
  };

  const daily: CsvSection = {
    title: 'By day',
    columns: ['Day', 'Events'],
    rows: (report.daily ?? []).map((row) => [dateOnly(row.day), String(n(row.events))]),
  };

  return csvDocument([header, totals, events, lessons, daily]);
}

/**
 * A filename a teacher can find again.
 *
 * ASCII only, because the header that carries it is not a place to discover that
 * a phone mangled an Arabic course title — the title is inside the file, where it
 * renders. The window is in the name because two reports of one course taken a
 * month apart have to be told apart in a downloads folder.
 */
export function courseReportFileName(report: CourseReport, generatedAt: Date): string {
  const slug = report.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const stamp = generatedAt.toISOString().slice(0, 10);
  return `ayahspring-course-report-${slug || 'course'}-${report.days}d-${stamp}.csv`;
}
