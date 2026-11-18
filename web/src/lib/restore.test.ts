import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RESTORE_FIELDS,
  RESTORE_MAX_BYTES,
  normaliseReport,
  parseRestoreFile,
  readRestoreReport,
  restoreSummary,
  sentenceWithParts,
  skipLines,
  type RestoreReport,
} from './restore.ts';

/**
 * The reading and the counting, not the restoring.
 *
 * What a restore is allowed to write is a database question and is tested in
 * `supabase/tests/restore_my_data.test.mjs` against a real Postgres. This file
 * covers the two things that happen outside it: refusing the wrong file
 * before it is uploaded, and turning the reply into counts and names that do
 * not overstate it.
 *
 * The second half is the one worth testing. "Would put back" and "put back"
 * differ by whether somebody's data now exists; a bug that loses that
 * distinction tells a person their record is restored when it is not.
 *
 * The sentences themselves are in the catalogue (`restore.*`), and the names
 * for refusals and reasons are tested in `restore-outcome.test.ts`.
 */

const document = (over: Partial<RestoreReport> = {}): RestoreReport => ({
  applied: true,
  formatVersion: 2,
  account: { changed: [], skipped: [] },
  notes: { restored: 0, alreadyThere: 0, skipped: [] },
  bookmarks: { restored: 0, alreadyThere: 0, skipped: [] },
  ...over,
});

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

test('a real export is read', () => {
  const result = parseRestoreFile(1200, JSON.stringify({ formatVersion: 2, notes: [] }));
  assert(result.ok === true);
  if (result.ok) assert.deepEqual(result.value, { formatVersion: 2, notes: [] });
});

test('the wrong file is refused by name, each for its own reason', () => {
  const cases: Array<[string, number, string, string]> = [
    ['a video', 40 * 1024 * 1024, 'not read', 'too_large'],
    ['an empty file', 0, '   ', 'not_json'],
    ['a spreadsheet', 200, 'name,value\nalice,1', 'not_json'],
    ['a list', 200, '[{"formatVersion":2}]', 'not_export'],
    ['a word', 200, '"formatVersion"', 'not_export'],
    ['nothing', 200, 'null', 'not_export'],
    ['somebody else’s JSON', 200, '{"exportedFrom":"somewhere-else"}', 'not_export'],
    ['a version that is a word', 200, '{"formatVersion":"2"}', 'not_export'],
    ['a version that is a fraction', 200, '{"formatVersion":1.5}', 'not_export'],
    ['a version below the first', 200, '{"formatVersion":0}', 'not_export'],
    ['a copy from a newer platform', 200, '{"formatVersion":3}', 'newer'],
  ];

  for (const [what, size, text, expected] of cases) {
    const result = parseRestoreFile(size, text);
    assert.equal(result.ok, false, `${what} was accepted`);
    if (!result.ok) assert.equal(result.code, expected, what);
  }
  // Both formats the function reads are let through.
  assert.equal(parseRestoreFile(200, '{"formatVersion":1}').ok, true);
  assert.equal(parseRestoreFile(200, '{"formatVersion":2}').ok, true);
});

test('the size ceiling is the one the database enforces', () => {
  assert.equal(RESTORE_MAX_BYTES, 8 * 1024 * 1024);
  const justOver = parseRestoreFile(RESTORE_MAX_BYTES + 1, '{"formatVersion":2}');
  assert.deepEqual(justOver, { ok: false, code: 'too_large' });
  const justUnder = parseRestoreFile(RESTORE_MAX_BYTES, '{"formatVersion":2}');
  assert.equal(justUnder.ok, true);
});

// ---------------------------------------------------------------------------
// The reply
// ---------------------------------------------------------------------------

test('a reply that does not say whether it applied is not a success', () => {
  for (const read of [normaliseReport, readRestoreReport]) {
    assert.equal(read(null), null);
    assert.equal(read('done'), null);
    assert.equal(read({}), null);
    // The dangerous one: a report that looks complete but will not say.
    assert.equal(read({ notes: { restored: 3 } }), null);
    assert.equal(read({ applied: 'true', notes: { restored: 3 } }), null);
  }
});

test('missing sections read as empty and do not throw', () => {
  for (const read of [normaliseReport, readRestoreReport]) {
    const report = read({ applied: false });
    assert(report);
    assert.deepEqual(report.account, { changed: [], skipped: [] });
    assert.deepEqual(report.notes, { restored: 0, alreadyThere: 0, skipped: [] });
    assert.deepEqual(report.bookmarks, { restored: 0, alreadyThere: 0, skipped: [] });
  }
});

test('counts that arrive as strings or negatives do not become nonsense', () => {
  const report = normaliseReport({
    applied: true,
    notes: { restored: '4', alreadyThere: -2, skipped: [null, 7, { lesson: 'A', reason: 'this note has no text' }] },
  });
  assert(report);
  assert.equal(report.notes.restored, 0, 'a string count was believed');
  assert.equal(report.notes.alreadyThere, 0, 'a negative count was believed');
  assert.equal(report.notes.skipped.length, 1, 'something that was not an entry survived');
  assert.deepEqual(report.notes.skipped[0], { why: 'note_empty', lesson: 'A' });
});

test('the database’s report comes out with names for its reasons and none of its sentences', () => {
  const fromDatabase = {
    applied: false,
    formatVersion: 2,
    account: {
      changed: ['displayName'],
      skipped: [{ field: 'timezone', reason: '“Mars/Olympus” is not a time zone this server knows' }],
    },
    notes: {
      restored: 2,
      alreadyThere: 1,
      skipped: [
        { lesson: 'Introduction', reason: 'you are not enrolled in a course with a lesson called “Introduction” any more' },
        { lesson: '—', reason: 'this file holds 1204 notes and only the first 1000 are read — export again and restore the rest with a second file' },
        { lesson: 'Wudu', reason: 'new row for relation "lesson_notes" violates check constraint "x"' },
      ],
    },
    bookmarks: { restored: 0, alreadyThere: 0, skipped: [] },
    notRestored: [{ what: 'Enrolments', why: 'An enrolment is an entitlement, sometimes a paid one.' }],
  };
  const report = normaliseReport(fromDatabase);
  assert(report);
  assert.deepEqual(report, {
    applied: false,
    formatVersion: 2,
    account: { changed: ['displayName'], skipped: [{ why: 'timezone', value: 'Mars/Olympus', field: 'timezone' }] },
    notes: {
      restored: 2,
      alreadyThere: 1,
      skipped: [
        { why: 'not_enrolled', lesson: 'Introduction' },
        // A reason about the whole section names no lesson.
        { why: 'capped', held: 1204, read: 1000 },
        // What an insert raised is not a sentence anybody is shown.
        { why: 'other', lesson: 'Wudu' },
      ],
    },
    bookmarks: { restored: 0, alreadyThere: 0, skipped: [] },
  });
  // Nothing the function wrote in English is in what goes to the browser.
  const sent = JSON.stringify(report);
  assert.doesNotMatch(sent, /server knows|enrolled in a course|violates|entitlement|notRestored|reason/u);

  // And the browser reads back exactly what was sent.
  assert.deepEqual(readRestoreReport(JSON.parse(sent)), report);
});

test('the browser believes a name only if it is one, and a number only if it is one', () => {
  const report = readRestoreReport({
    applied: true,
    notes: {
      restored: 1,
      skipped: [
        { why: 'made_up', lesson: 'A', count: '9', read: -1, held: 2.5, value: 7 },
        { why: 'toString' },
        { why: 'note_long', count: 4000, lesson: `  ${'x'.repeat(400)}  ` },
        'note_empty',
      ],
    },
  });
  assert(report);
  assert.deepEqual(report.notes.skipped[0], { why: 'other', lesson: 'A' });
  assert.deepEqual(report.notes.skipped[1], { why: 'other' });
  assert.equal(report.notes.skipped[2]?.why, 'note_long');
  assert.equal(report.notes.skipped[2]?.count, 4000);
  assert.equal(report.notes.skipped[2]?.lesson?.length, 120);
  assert.equal(report.notes.skipped.length, 3);
});

// ---------------------------------------------------------------------------
// What is said
// ---------------------------------------------------------------------------

test('a dry run is a check and an apply is applied, with the same counts', () => {
  const would = document({ applied: false, notes: { restored: 2, alreadyThere: 0, skipped: [] } });
  assert.deepEqual(restoreSummary(would), {
    kind: 'check',
    notes: 2,
    bookmarks: 0,
    fields: [],
    profile: false,
    here: 0,
  });
  assert.equal(restoreSummary({ ...would, applied: true }).kind, 'applied');
});

test('the summary counts what came back and stops there', () => {
  const report = document({
    notes: { restored: 2, alreadyThere: 3, skipped: [] },
    bookmarks: { restored: 1, alreadyThere: 4, skipped: [] },
    account: { changed: ['displayName', 'timezone'], skipped: [] },
  });
  assert.deepEqual(restoreSummary(report), {
    kind: 'applied',
    notes: 2,
    bookmarks: 1,
    fields: ['displayName', 'timezone'],
    profile: true,
    here: 7,
  });
});

test('nothing to do is one of two things, and the two are not confused', () => {
  assert.equal(restoreSummary(document()).kind, 'nothing');
  assert.equal(restoreSummary(document({ applied: false })).kind, 'nothing');

  // Already there is a different outcome from could not be put back, and a
  // person using last month's file again is in the first case.
  const already = document({ notes: { restored: 0, alreadyThere: 3, skipped: [] } });
  assert.equal(restoreSummary(already).kind, 'all_here');
  assert.equal(restoreSummary(already).here, 3);

  // Entries that were left in the file do not make it "something".
  const onlySkipped = document({ notes: { restored: 0, alreadyThere: 0, skipped: [{ why: 'not_enrolled', lesson: 'A' }] } });
  assert.equal(restoreSummary(onlySkipped).kind, 'nothing');
});

test('a profile field nobody has a word for still counts as the profile changing', () => {
  assert.deepEqual([...RESTORE_FIELDS], ['displayName', 'preferredLanguage', 'timezone', 'countryCode']);
  const report = document({ applied: false, account: { changed: ['somethingNew'], skipped: [] } });
  const summary = restoreSummary(report);
  assert.equal(summary.kind, 'check');
  assert.equal(summary.profile, true);
  // The column's name is the database's word, so it is not handed on.
  assert.deepEqual(summary.fields, []);
});

test('every entry left in the file is a line with a place and a reason', () => {
  const report = document({
    account: { changed: [], skipped: [{ why: 'timezone', value: 'Mars/Olympus', field: 'timezone' }, { why: 'other', field: 'somethingNew' }] },
    notes: { restored: 0, alreadyThere: 0, skipped: [{ why: 'not_enrolled', lesson: 'Introduction' }] },
    bookmarks: { restored: 0, alreadyThere: 0, skipped: [{ why: 'off' }] },
  });

  const lines = skipLines(report);
  assert.equal(lines.length, 4);
  assert.deepEqual(lines[0], { where: { field: 'timezone' }, why: 'timezone', value: 'Mars/Olympus' });
  // A field with no word of its own is said as the profile.
  assert.deepEqual(lines[1], { where: { field: null }, why: 'other' });
  assert.deepEqual(lines[2], { where: { lesson: 'Introduction' }, why: 'not_enrolled' });
  // An entry with no lesson name still gets a line: it is a row in the file.
  assert.deepEqual(lines[3], { where: { entry: true }, why: 'off' });
});

test('a reason whose gap has nothing to go in it is said as the general one', () => {
  const general = 'This entry could not be put back.';
  const long = 'This note is too long. The most characters a note may have: {count}';
  const cut = 'Entries read: {read}. Entries in the file: {held}';
  assert.equal(sentenceWithParts(long, general, ['count']), long);
  assert.equal(sentenceWithParts(long, general, []), general);
  assert.equal(sentenceWithParts(long, general, ['value']), general);
  // Both gaps or neither: half a sentence is not said.
  assert.equal(sentenceWithParts(cut, general, ['read', 'held']), cut);
  assert.equal(sentenceWithParts(cut, general, ['read']), general);
  // A sentence with no gap is itself whatever came with it.
  assert.equal(sentenceWithParts('This note has no text.', general, []), 'This note has no text.');
  assert.equal(sentenceWithParts(general, general, ['count']), general);
});
