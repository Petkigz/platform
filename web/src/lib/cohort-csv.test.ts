import assert from 'node:assert/strict';
import test from 'node:test';

import { rosterCsv, rosterFileName, type RosterMeta } from './cohort-csv.ts';
import type { CohortLearnerProgress } from './cohort-analytics.ts';

/**
 * The register, not the permission.
 *
 * Who may see a class is decided in the database and tested against a real
 * Postgres in `supabase/tests/learner_analytics.test.mjs`. This file covers the
 * other half: that the file a teacher downloads says the same thing as the page
 * they were looking at — no row dropped, no cell that a spreadsheet will execute,
 * and a missing enrolment that does not read as a zero.
 */

const meta: RosterMeta = {
  courseTitle: 'Tajweed for beginners',
  cohortTitle: 'Monday evening',
  versionNumber: 3,
  generatedAt: new Date('2026-11-01T09:30:00Z'),
};

const row = (over: Partial<CohortLearnerProgress> = {}): CohortLearnerProgress => ({
  learnerProfileId: 'lp-1',
  displayName: 'Amina',
  learnerType: 'adult',
  ageBand: '18+',
  joinedAt: '2026-10-01T10:00:00Z',
  enrolmentId: 'en-1',
  enrolmentStatus: 'active',
  lessonsCompleted: 2,
  lessonsInProgress: 1,
  lessonsInVersion: 10,
  lastSeenAt: '2026-10-30T18:00:00Z',
  ...over,
});

const lines = (csv: string): string[] => csv.split('\r\n');

test('the file says what it is before it says who is in it', () => {
  const csv = rosterCsv([row()], meta);
  assert.match(csv, /^Class list\r\n/);
  assert.match(csv, /Course,Tajweed for beginners/);
  assert.match(csv, /Class,Monday evening/);
  assert.match(csv, /Version,3/);
  assert.match(csv, /Made,2026-11-01/);
  assert.match(csv, /Learners,1/);
});

test('every learner the database returned is in the file', () => {
  const rows = [
    row({ learnerProfileId: 'a', displayName: 'Amina' }),
    row({ learnerProfileId: 'b', displayName: 'Bilal' }),
    row({ learnerProfileId: 'c', displayName: 'Chidera' }),
  ];
  const csv = rosterCsv(rows, meta);
  for (const name of ['Amina', 'Bilal', 'Chidera']) {
    assert.match(csv, new RegExp(`^${name},`, 'm'), `${name} is missing from the file`);
  }
  assert.match(csv, /^Learners,3$/m);
});

test('the file is ordered the way the screen is', () => {
  // Somebody in the class who has not enrolled needs the teacher first, somebody
  // who finished needs them last — the same order the class page renders.
  const csv = rosterCsv(
    [
      row({ learnerProfileId: 'done', displayName: 'Finished', lessonsCompleted: 10 }),
      row({ learnerProfileId: 'none', displayName: 'NotEnrolled', enrolmentId: null, lessonsCompleted: 0, lessonsInProgress: 0, lastSeenAt: null }),
    ],
    meta,
  );
  const names = lines(csv).filter((line) => /^(NotEnrolled|Finished),/.test(line));
  assert.equal(names.length, 2, 'a learner went missing from the file');
  assert.equal(names[0]?.split(',')[0], 'NotEnrolled');
  assert.equal(names[1]?.split(',')[0], 'Finished');
});

test('a learner with no enrolment has no percentage, not a zero', () => {
  const csv = rosterCsv(
    [row({ displayName: 'Unenrolled', enrolmentId: null, enrolmentStatus: null, lessonsCompleted: 0, lessonsInVersion: 10 })],
    meta,
  );
  const line = lines(csv).find((l) => l.startsWith('Unenrolled,'));
  assert(line);
  const cells = line.split(',');
  // Learner, type, band, joined, enrolment, completed, inProgress, inVersion, percent
  assert.equal(cells[4], 'not enrolled');
  assert.equal(cells[8], '', `percent was ${JSON.stringify(cells[8])}`);
});

test('a name that looks like a formula is still only a name', () => {
  // The rule the account export already follows: a display name is data.
  const csv = rosterCsv([row({ displayName: '=HYPERLINK("http://x","click")' })], meta);
  // Quoted, because the name holds commas, and prefixed with the apostrophe that
  // tells a spreadsheet the cell is text.
  assert.match(csv, /"'=HYPERLINK\(/);
  assert.doesNotMatch(csv, /(^|,)"?=HYPERLINK/m, 'a formula reached the file unescaped');
});

test('a comma or a quote in a name does not break the row', () => {
  const csv = rosterCsv([row({ displayName: 'Amina, "Amy" Yusuf' })], meta);
  assert.match(csv, /"Amina, ""Amy"" Yusuf"/);
});

test('children are marked as children', () => {
  const csv = rosterCsv([row({ learnerType: 'child', ageBand: '8-10' })], meta);
  const line = lines(csv).find((l) => l.startsWith('Amina,'));
  assert(line);
  assert.equal(line.split(',')[1], 'Child');
  assert.equal(line.split(',')[2], '8-10');
});

test('the date cells are dates a spreadsheet can read, and blank when unknown', () => {
  const csv = rosterCsv([row({ joinedAt: null, lastSeenAt: null })], meta);
  const line = lines(csv).find((l) => l.startsWith('Amina,'));
  assert(line);
  const cells = line.split(',');
  assert.equal(cells[3], '', 'a missing join date became something');
  assert.equal(cells[10], '', 'a missing last-seen became something');

  const dated = lines(rosterCsv([row()], meta)).find((l) => l.startsWith('Amina,')) ?? '';
  assert.match(dated, /2026-10-01/, 'the join date is not an ISO date');
  assert.match(dated, /2026-10-30 18:00/, 'the last-seen time is not written out');
});

test('the filename is findable and survives a name with no ASCII in it', () => {
  assert.equal(
    rosterFileName(meta),
    'ayahspring-class-monday-evening-2026-11-01.csv',
  );
  assert.equal(
    rosterFileName({ ...meta, cohortTitle: 'الصف الأول' }),
    'ayahspring-class-class-2026-11-01.csv',
    'a non-ASCII class name produced a filename nothing can open',
  );
  assert.equal(
    rosterFileName({ ...meta, cohortTitle: '  Monday   evening!  ' }),
    'ayahspring-class-monday-evening-2026-11-01.csv',
  );
});

test('an empty class still produces a readable file', () => {
  const csv = rosterCsv([], meta);
  assert.match(csv, /^Learners,0$/m);
  // The roster section keeps its heading even with nobody in it, so the file is
  // still a register with an empty column rather than a document with no shape.
  assert.match(csv, /^Learners\r$/m);
  assert.match(csv, /^Learner,Adult or child,/m);
  // The header block and the roster headings, and no data rows.
  assert.equal(lines(csv).filter((line) => line.trim().length > 0).length, 10);
});
