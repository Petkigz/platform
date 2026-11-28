import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SCREENING_NOTHING_BLOCKED,
  describeScreeningError,
  gateSentence,
  myScreeningWords,
  screeningCountsSentence,
  screeningLine,
  screeningStatusLabel,
  type ScreeningRow,
} from './screening.ts';
import { formatDay, translator } from './i18n/index.ts';

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

// The teacher's own record is said by `/teach` in the reader's language
// since 2026-11-28, so the library answers with keys and the page with words.
const say = (mine: Parameters<typeof myScreeningWords>[0]) => {
  const words = myScreeningWords(mine, (iso) => formatDay('en', iso));
  const t = translator('en');
  return {
    ...words,
    text: t(words.sentence.key, words.sentence.values),
    noteText: words.note ? t(words.note) : '',
    keptText: words.kept ? t(words.kept.key, words.kept.values) : '',
  };
};

test('the teacher’s own sentence never implies a pass means approval to teach', () => {
  // The sentence used to say "that is not a mark against you, because the
  // standard is still being decided". The owner decided it on 2026-10-30, so the
  // honest version says what is missing and what it stops.
  const none = say({ recorded: false, required: true });
  assert.equal(none.status, 'teach.scStNone');
  assert.match(none.text, /No check is on file/);
  assert.match(none.noteText, /cannot be published/i);
  assert.doesNotMatch(none.text + none.noteText, /still being decided/i);
  const held = say({ recorded: true, outcome: 'passed', type: 'Basic disclosure', checkedAt: '2026-10-27', validUntil: '2028-10-27', required: true });
  assert.equal(held.status, 'teach.scStChecked');
  assert.match(held.text, /recorded on Oct 27, 2026 and holds until Oct 27, 2028/);
  // A current pass is not followed by a warning.
  assert.equal(held.note, null);
  const lapsed = say({ recorded: true, outcome: 'passed', type: 'Basic disclosure', checkedAt: '2026-10-27', expired: true, validUntil: '2026-01-01', required: true });
  assert.equal(lapsed.status, 'teach.scStLapsed');
  assert.match(lapsed.text, /lapsed on Jan 1, 2026/);
  assert.match(lapsed.noteText, /Until a current check is recorded/);
  const failed = say({ recorded: true, outcome: 'failed', required: true });
  assert.equal(failed.status, 'teach.scStFailed');
  assert.match(failed.text, /did not pass/i);
  assert.match(failed.noteText, /cannot be published/i);
  assert.deepEqual(myScreeningWords(null, () => ''), myScreeningWords({ recorded: false }, () => ''));
});

test('the teacher is told what the record stops only when that is known', () => {
  // The page used to say both "cannot be published" and "nothing here blocks
  // your teaching" to the same teacher. Which is true is `required`.
  assert.equal(say({ recorded: false, required: true }).note, 'teach.scBlocks');
  assert.equal(say({ recorded: false, required: false }).note, 'teach.scNotAsked');
  assert.match(say({ recorded: false, required: false }).noteText, /not asking for a check today/);
  // An answer that does not say whether the platform is asking gets no note.
  assert.equal(say({ recorded: false }).note, null);
  assert.equal(say({ recorded: true, outcome: 'failed' }).note, null);
  // Lapsed or failed while the platform is not asking stops nothing, and says so.
  assert.equal(say({ recorded: true, outcome: 'passed', expired: true, required: false }).note, 'teach.scNotAsked');
  assert.equal(say({ recorded: true, outcome: 'failed', required: false }).note, 'teach.scNotAsked');
  assert.equal(say({ recorded: true, outcome: 'passed', required: false }).note, null);
});

test('a sentence with no date is chosen when there is no date, never one with a hole', () => {
  const keys = (mine: Parameters<typeof myScreeningWords>[0]) => say(mine).sentence.key;
  assert.equal(keys({ recorded: true, outcome: 'passed', checkedAt: '2026-10-27', validUntil: '2028-10-27' }), 'teach.scHoldsFrom');
  assert.equal(keys({ recorded: true, outcome: 'passed', checkedAt: null, validUntil: '2028-10-27' }), 'teach.scHolds');
  assert.equal(keys({ recorded: true, outcome: 'passed', checkedAt: '2026-10-27' }), 'teach.scNoExpiryFrom');
  assert.equal(keys({ recorded: true, outcome: 'passed', checkedAt: 'not a day' }), 'teach.scNoExpiry');
  assert.equal(keys({ recorded: true, outcome: 'failed', checkedAt: '2026-10-27T09:00:00Z' }), 'teach.scFailedOn');
  assert.equal(keys({ recorded: true, outcome: 'failed' }), 'teach.scFailed');
  assert.equal(keys({ recorded: true, outcome: 'passed', expired: true, validUntil: '2026-01-01' }), 'teach.scLapsedOn');
  assert.equal(keys({ recorded: true, outcome: 'passed', expired: true }), 'teach.scLapsed');
  for (const mine of [
    { recorded: true, outcome: 'passed', checkedAt: '2026-10-27', validUntil: '2028-10-27' },
    { recorded: true, outcome: 'failed', checkedAt: '2026-02-31' },
    { recorded: true, outcome: 'passed', expired: true, validUntil: '' },
  ] as const) {
    assert.doesNotMatch(say(mine).text, /[{}]|undefined|Invalid/);
  }
});

test('the kind of check is what was typed, kept out of the sentence, and the deletion day is said', () => {
  const mine = say({
    recorded: true, outcome: 'passed', type: '  Basic disclosure ', checkedAt: '2026-10-27',
    validUntil: '2028-10-27', retentionUntil: '2033-10-27', required: true,
  });
  assert.equal(mine.kind, 'Basic disclosure');
  assert.doesNotMatch(mine.text, /Basic disclosure/);
  assert.match(mine.keptText, /kept until Oct 27, 2033 and then deleted/);
  assert.equal(say({ recorded: true, outcome: 'passed', type: '   ' }).kind, null);
  assert.equal(say({ recorded: true, outcome: 'passed' }).kept, null);
  // Nothing on file has no kind and no day to be deleted on.
  assert.equal(say({ recorded: false, type: 'x', retentionUntil: '2033-10-27' } as never).kind, null);
  assert.equal(say({ recorded: false, retentionUntil: '2033-10-27' } as never).kept, null);
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
