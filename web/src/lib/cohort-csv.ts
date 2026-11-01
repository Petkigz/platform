/**
 * A class, as a spreadsheet.
 *
 * The teacher already sees this list on the class page. What changes here is
 * only the shape: the same rows, the same order, the same words, arranged in a
 * grid a teacher can sort and bring to a meeting. Three decisions follow from
 * that, and each of them is a way the file could otherwise start lying.
 *
 * **Every row the database gave, and no filter.** The caller passes what
 * `fetchCohortProgress()` returned and this module writes all of it. A file that
 * quietly dropped somebody — a learner with no enrolment, a row the page chose
 * not to render — would be a register that disagrees with the register, which is
 * the one thing a register must never do.
 *
 * **The same order the screen uses.** `sortForAttention()` is applied by the
 * page and by the route, so the first row of the file is the first card on the
 * screen. Somebody checking the file against the page should not have to work
 * out whether the difference is a bug.
 *
 * **The words, not the numbers alone.** "No activity for 16 days" is the thing
 * the teacher acts on; a bare `16` in a column invites a formula that quietly
 * means something else. The percent is included beside it because a spreadsheet
 * cannot compute it without being told what the version holds this week.
 *
 * The cells go through `csvCell()`, so a learner called `=HYPERLINK(...)` is a
 * learner and not a formula — the same rule the account export follows, for the
 * same reason.
 */

import { csvDocument, type CsvSection } from './csv.ts';
import {
  paceLabel,
  percentComplete,
  sortForAttention,
  type CohortLearnerProgress,
} from './cohort-analytics.ts';

export type RosterMeta = {
  courseTitle: string;
  cohortTitle: string;
  versionNumber: number | null;
  /** The day the file was made, so a printed copy is identifiable later. */
  generatedAt: Date;
};

const date = (value: string | null): string => {
  if (!value) return '';
  const when = new Date(value);
  return Number.isFinite(when.getTime()) ? when.toISOString().slice(0, 10) : '';
};

const timestamp = (value: string | null): string => {
  if (!value) return '';
  const when = new Date(value);
  return Number.isFinite(when.getTime()) ? when.toISOString().slice(0, 16).replace('T', ' ') : '';
};

/**
 * The file, already assembled — sections, headings and all.
 *
 * The first section is a header a person reads, not a machine: which course,
 * which class, which version of it, and when the copy was made. A spreadsheet
 * found in a downloads folder in March has to say what it is.
 */
export function rosterCsv(rows: CohortLearnerProgress[], meta: RosterMeta): string {
  const ordered = sortForAttention(rows);

  const header: CsvSection = {
    title: 'Class list',
    columns: ['Field', 'Value'],
    rows: [
      ['Course', meta.courseTitle],
      ['Class', meta.cohortTitle],
      ['Version', meta.versionNumber === null ? 'not recorded' : String(meta.versionNumber)],
      ['Made', meta.generatedAt.toISOString().slice(0, 10)],
      ['Learners', String(ordered.length)],
      [
        'What this is',
        'The members of one class and their progress in the version that class teaches, copied from the platform. It does not contain a family, an account or contact details.',
      ],
    ],
  };

  const roster: CsvSection = {
    title: 'Learners',
    columns: [
      'Learner',
      'Adult or child',
      'Age band',
      'Joined the class',
      'Enrolment',
      'Lessons completed',
      'Lessons in progress',
      'Lessons in this version',
      'Percent complete',
      'Where they are',
      'Last seen',
    ],
    rows: ordered.map((row) => [
      row.displayName,
      row.learnerType === 'child' ? 'Child' : 'Adult',
      row.ageBand ?? '',
      date(row.joinedAt),
      row.enrolmentId ? (row.enrolmentStatus ?? 'enrolled') : 'not enrolled',
      String(row.lessonsCompleted),
      String(row.lessonsInProgress),
      String(row.lessonsInVersion),
      // A learner in the class with no enrolment has no percentage at all, and a
      // `0` in that column would read as "started and got nowhere".
      row.enrolmentId ? String(percentComplete(row)) : '',
      paceLabel(row),
      timestamp(row.lastSeenAt),
    ]),
  };

  return csvDocument([header, roster]);
}

/**
 * A filename a teacher can find again.
 *
 * ASCII only, because the header that carries it is not a place to discover that
 * a phone's file manager mangled an Arabic class name — the name is in the file,
 * where it renders. A title with nothing usable in it becomes `class`, which is
 * still a filename somebody can open.
 */
export function rosterFileName(meta: RosterMeta): string {
  const slug = meta.cohortTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const stamp = meta.generatedAt.toISOString().slice(0, 10);
  return `ayahspring-class-${slug || 'class'}-${stamp}.csv`;
}
