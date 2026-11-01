import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCOUNT_FIELD_LABELS,
  RESTORE_MAX_BYTES,
  accountSentence,
  normaliseReport,
  parseRestoreFile,
  restoreHeadline,
  skipLines,
  type RestoreReport,
} from './restore.ts';

/**
 * The reading and the wording, not the restoring.
 *
 * What a restore is allowed to write is a database question and is tested in
 * `supabase/tests/restore_my_data.test.mjs` against a real Postgres. This file
 * covers the two things that happen in a browser: refusing the wrong file
 * before it is uploaded, and saying what happened afterwards in a sentence that
 * does not overstate it.
 *
 * The second half is the one worth testing. "Two notes came back" and "two
 * notes would come back" differ by one word and by whether somebody's data now
 * exists; a bug that loses that distinction tells a person their record is
 * restored when it is not.
 */

const document = (over: Partial<RestoreReport> = {}): RestoreReport => ({
  applied: true,
  formatVersion: 2,
  account: { changed: [], skipped: [] },
  notes: { restored: 0, alreadyThere: 0, skipped: [] },
  bookmarks: { restored: 0, alreadyThere: 0, skipped: [] },
  notRestored: [],
  ...over,
});

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

test('a real export is read', () => {
  const result = parseRestoreFile('ayahspring-data-2026-11-01.json', 1200, JSON.stringify({ formatVersion: 2, notes: [] }));
  assert(result.ok === true);
  if (result.ok) assert.deepEqual(result.value, { formatVersion: 2, notes: [] });
});

test('the wrong file is refused with something to do about it', () => {
  const cases: Array<[string, number, string, RegExp]> = [
    ['holiday.mp4', 40 * 1024 * 1024, 'not read', /is 40\.0 mib/i],
    ['empty.json', 0, '   ', /is empty/i],
    ['data.csv', 200, 'name,value\nalice,1', /not JSON/i],
    ['list.json', 200, '[{"formatVersion":2}]', /one JSON object/i],
    ['other.json', 200, '{"exportedFrom":"somewhere-else"}', /no formatVersion/i],
  ];

  for (const [name, size, text, expected] of cases) {
    const result = parseRestoreFile(name, size, text);
    assert.equal(result.ok, false, `${name} was accepted`);
    if (!result.ok) {
      assert.match(result.message, expected, `${name} said: ${result.message}`);
      // Every refusal names the file, so a person with a folder of downloads
      // knows which one they picked.
      assert.match(result.message, new RegExp(name.replace('.', '\\.')));
    }
  }
});

test('the size ceiling is the one the database enforces', () => {
  assert.equal(RESTORE_MAX_BYTES, 8 * 1024 * 1024);
  const justOver = parseRestoreFile('big.json', RESTORE_MAX_BYTES + 1, '{"formatVersion":2}');
  assert.equal(justOver.ok, false);
  const justUnder = parseRestoreFile('fine.json', RESTORE_MAX_BYTES, '{"formatVersion":2}');
  assert.equal(justUnder.ok, true);
});

// ---------------------------------------------------------------------------
// The reply
// ---------------------------------------------------------------------------

test('a reply that does not say whether it applied is not a success', () => {
  assert.equal(normaliseReport(null), null);
  assert.equal(normaliseReport('done'), null);
  assert.equal(normaliseReport({}), null);
  // The dangerous one: a report that looks complete but will not say.
  assert.equal(normaliseReport({ notes: { restored: 3 } }), null);
});

test('missing sections read as empty rather than throwing', () => {
  const report = normaliseReport({ applied: false });
  assert(report);
  assert.deepEqual(report?.account.changed, []);
  assert.equal(report?.notes.restored, 0);
  assert.deepEqual(report?.notRestored, []);
});

test('counts that arrive as strings or negatives do not become nonsense', () => {
  const report = normaliseReport({
    applied: true,
    notes: { restored: '4', alreadyThere: -2, skipped: [null, 7, { lesson: 'A', reason: 'why' }] },
  });
  assert(report);
  assert.equal(report?.notes.restored, 0, 'a string count was believed');
  assert.equal(report?.notes.alreadyThere, 0, 'a negative count was believed');
  assert.equal(report?.notes.skipped.length, 1, 'a skip without a reason survived');
  assert.equal(report?.notes.skipped[0]?.reason, 'why');
});

// ---------------------------------------------------------------------------
// The sentence
// ---------------------------------------------------------------------------

test('a dry run says what would happen, and an apply says what did', () => {
  const would = document({
    applied: false,
    notes: { restored: 2, alreadyThere: 0, skipped: [] },
  });
  assert.equal(restoreHeadline(would), '2 notes would come back.');

  const did = { ...would, applied: true };
  assert.equal(restoreHeadline(did), '2 notes came back.');
});

test('the sentence counts what came back and stops there', () => {
  const report = document({
    notes: { restored: 2, alreadyThere: 0, skipped: [] },
    bookmarks: { restored: 1, alreadyThere: 0, skipped: [] },
    account: { changed: ['displayName'], skipped: [] },
  });
  assert.equal(restoreHeadline(report), '2 notes, 1 bookmark and your profile came back.');
});

test('nothing to do is said in words, and the two reasons are not confused', () => {
  const nothing = document();
  assert.equal(restoreHeadline(nothing), 'Nothing in this file could be put back as things stand.');

  // Already there is a different outcome from could not be put back, and a
  // person re-running a file they ran last month is in the first case.
  const already = document({ notes: { restored: 0, alreadyThere: 3, skipped: [] } });
  assert.equal(
    restoreHeadline(already),
    'Everything in this file was already here, so nothing was changed.',
  );
});

test('skipped entries are mentioned in the headline, not buried', () => {
  const report = document({
    notes: { restored: 1, alreadyThere: 0, skipped: [{ lesson: 'Introduction', reason: 'not enrolled' }] },
  });
  assert.match(restoreHeadline(report), /1 entry needs attention/);
});

test('the account line names fields the way a person does', () => {
  const report = document({ account: { changed: ['displayName', 'timezone'], skipped: [] } });
  assert.equal(accountSentence(report), 'Updated your display name and time zone.');
  assert.equal(accountSentence({ ...report, applied: false }), 'Would update your display name and time zone.');
  assert.equal(accountSentence(document()), null);
});

test('an unknown field is shown rather than dropped', () => {
  assert.equal(ACCOUNT_FIELD_LABELS.displayName, 'display name');
  const report = document({ account: { changed: ['somethingNew'], skipped: [] } });
  assert.equal(accountSentence(report), 'Updated your somethingNew.');
});

test('every skipped entry is listed with a place and a reason', () => {
  const report = document({
    account: { changed: [], skipped: [{ field: 'timezone', reason: 'not a time zone this server knows' }] },
    notes: { restored: 0, alreadyThere: 0, skipped: [{ lesson: 'Introduction', reason: 'not enrolled' }] },
    bookmarks: { restored: 0, alreadyThere: 0, skipped: [{ lesson: '—', reason: 'bookmarks are off' }] },
  });

  const lines = skipLines(report);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0], { where: 'time zone', reason: 'not a time zone this server knows' });
  assert.deepEqual(lines[1], { where: 'Introduction', reason: 'not enrolled' });
  // An entry with no lesson name still gets a line: it is a row in the file.
  assert.deepEqual(lines[2], { where: 'A saved entry', reason: 'bookmarks are off' });
});
