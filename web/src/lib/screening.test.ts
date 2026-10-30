import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SCREENING_NOTHING_BLOCKED,
  describeScreeningError,
  gateSentence,
  myScreeningSentence,
  screeningCountsSentence,
  screeningLine,
  screeningStatusLabel,
  type ScreeningRow,
} from './screening.ts';

function row(overrides: Partial<ScreeningRow>): ScreeningRow {
  return {
    userId: 'u1',
    name: 'A Teacher',
    status: 'none',
    type: null,
    checkedAt: null,
    validUntil: null,
    checkedByName: null,
    ...overrides,
  };
}

test('a status is labelled as what happened, not as a badge', () => {
  assert.equal(screeningStatusLabel('none'), 'No check on file');
  assert.equal(screeningStatusLabel('checked'), 'Checked');
  assert.equal(screeningStatusLabel('expired'), 'Lapsed');
  assert.equal(screeningStatusLabel('failed'), 'Did not pass');
  // An unknown status from a newer database is not shown as a pass.
  assert.equal(screeningStatusLabel('pending_review'), 'No check on file');
  assert.equal(screeningStatusLabel(null), 'No check on file');
});

test('a checked teacher is told what, when, and until when', () => {
  assert.equal(
    screeningLine(row({ status: 'checked', type: 'Enhanced disclosure', checkedAt: '2026-10-27', validUntil: '2028-10-27' })),
    'Enhanced disclosure recorded 27 Oct 2026, valid until 27 Oct 2028.',
  );
  assert.equal(
    screeningLine(row({ status: 'checked', type: 'Basic disclosure', checkedAt: '2026-10-27' })),
    'Basic disclosure recorded 27 Oct 2026, with no expiry stated.',
  );
});

test('a lapsed check names the date it lapsed, and a failed one is not softened', () => {
  assert.equal(
    screeningLine(row({ status: 'expired', type: 'Enhanced disclosure', validUntil: '2026-01-05' })),
    'Enhanced disclosure lapsed on 5 Jan 2026.',
  );
  assert.equal(
    screeningLine(row({ status: 'failed', type: 'Basic disclosure', checkedAt: '2026-10-27' })),
    'Basic disclosure recorded 27 Oct 2026 did not pass.',
  );
});

test('an empty column is not a failure', () => {
  assert.match(screeningLine(row({})), /nothing recorded/i);
  assert.match(screeningLine(row({})), /empty column/i);
});

test('counts are a sentence, and a zero-teacher register says why it is empty', () => {
  assert.match(
    screeningCountsSentence({ teachers: 0, none: 0, checked: 0, expired: 0, failed: 0 }),
    /nobody holds the teacher role/i,
  );
  assert.equal(
    screeningCountsSentence({ teachers: 4, none: 2, checked: 1, expired: 1, failed: 0 }),
    '4 teachers: 1 checked, 1 lapsed, 2 with nothing on file.',
  );
  assert.equal(
    screeningCountsSentence({ teachers: 1, none: 0, checked: 1, expired: 0, failed: 0 }),
    '1 teacher: 1 checked.',
  );
  // A failed check is named rather than left out of the tally.
  assert.match(
    screeningCountsSentence({ teachers: 2, none: 0, checked: 1, expired: 0, failed: 1 }),
    /1 did not pass/,
  );
});

test('the console says out loud that nothing is enforced', () => {
  assert.match(SCREENING_NOTHING_BLOCKED, /nothing here is enforced/i);
  assert.match(SCREENING_NOTHING_BLOCKED, /owner has not set/i);
});

test('the teacher’s own sentence never implies a pass means approval to teach', () => {
  // The sentence used to say "that is not a mark against you, because the
  // standard is still being decided". The owner decided it on 2026-10-30, so the
  // honest version says what is missing and what it stops.
  assert.match(myScreeningSentence({ recorded: false }), /cannot be published/i);
  assert.doesNotMatch(myScreeningSentence({ recorded: false }), /still being decided/i);
  assert.match(
    myScreeningSentence({ recorded: true, outcome: 'passed', type: 'Basic disclosure', checkedAt: '2026-10-27', validUntil: '2028-10-27' }),
    /holds until 27 Oct 2028/,
  );
  assert.match(
    myScreeningSentence({ recorded: true, outcome: 'passed', type: 'Basic disclosure', checkedAt: '2026-10-27', expired: true, validUntil: '2026-01-01' }),
    /cannot be published until a current check/i,
  );
  assert.match(myScreeningSentence({ recorded: true, outcome: 'failed' }), /did not pass/i);
  assert.equal(myScreeningSentence(null), myScreeningSentence({ recorded: false }));
});

test('a refusal is a sentence, never a code', () => {
  assert.match(describeScreeningError('screening:not_allowed'), /only the owner or governance/i);
  assert.match(describeScreeningError('screening:validity_in_the_past'), /certifies nothing/i);
  assert.match(describeScreeningError('screening:not_a_teacher'), /learner is never screened/i);
  assert.equal(describeScreeningError('screening:something_new'), 'something new');
  assert.equal(describeScreeningError('', 'the database said no'), 'the database said no');
  assert.match(describeScreeningError(null), /reason was not returned/);
});

test('the gate sentence names the missing fact, not a code', () => {
  // A teacher meets a refusal as a sentence. `safeguarding:author_not_cleared`
  // and `no_screening` are for the database, not for a person.
  assert.match(gateSentence('no_screening'), /no check is on file/i);
  assert.match(gateSentence('screening_expired'), /lapsed/i);
  assert.match(gateSentence('conduct_not_acknowledged'), /not yet read/i);
  for (const reason of ['no_screening', 'screening_expired', 'conduct_not_acknowledged']) {
    assert.doesNotMatch(gateSentence(reason), /safeguarding:|_/u);
  }
});

test('the clear sentence says where a concern goes, because that is the question left', () => {
  const lead = 'The platform owner, AyahSpring — privacy@ayahspring.com';
  assert.match(gateSentence('ok', lead), /privacy@ayahspring\.com/);
  // Without a lead named there is still a sentence, never an empty string.
  assert.equal(gateSentence('ok', null).length > 20, true);
  // An unknown reason is a sentence as well, not the raw string.
  assert.doesNotMatch(gateSentence('something_odd'), /something_odd/);
});
