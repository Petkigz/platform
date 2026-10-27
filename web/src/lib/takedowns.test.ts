import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HOLD_EFFECT,
  NO_MONEY_MOVES,
  claimantRoleLabel,
  decisionProblem,
  describeTakedownError,
  holdingLine,
  registerHeadline,
  takedownStatusLabel,
  teacherHeadline,
  teacherSentence,
  type MyTakedown,
  type TakedownNotice,
  type TakedownRegister,
} from './takedowns.ts';

function notice(overrides: Partial<TakedownNotice>): TakedownNotice {
  return {
    id: 'n1',
    reference: 'TD-2026-0001',
    courseTitle: 'Seerah for young learners',
    courseCode: 'seerah',
    versionNumber: 1,
    teacher: 'A Teacher',
    status: 'held',
    claimant: 'A Publisher',
    claimantRole: 'owner',
    work: 'The Sealed Nectar',
    material: 'Lesson 3, 4:10 to 9:30',
    noticeText: 'The narration reproduces our audio edition.',
    receivedAt: '2026-10-21T09:00:00Z',
    reviewBy: null,
    overdueReview: false,
    daysHeld: 6,
    answered: false,
    response: null,
    responseAt: null,
    outcome: null,
    reason: null,
    openedByMe: false,
    ...overrides,
  };
}

function register(counts: Partial<TakedownRegister['counts']>): TakedownRegister {
  return {
    notices: [],
    candidates: [],
    counts: { held: 0, upheld: 0, released: 0, unanswered: 0, reviewOverdue: 0, ...counts },
  };
}

test('statuses and claimant roles read as sentences', () => {
  assert.equal(takedownStatusLabel('held'), 'Held');
  assert.equal(takedownStatusLabel('withdrawn'), 'Withdrawn');
  assert.equal(takedownStatusLabel('nonsense'), 'Held');
  assert.equal(claimantRoleLabel('agent'), 'an agent acting for the rights holder');
  assert.equal(claimantRoleLabel(null), 'the rights holder');
});

test('the headline leads with what is held and what nobody answered', () => {
  assert.equal(registerHeadline(register({})), 'No notice has ever been recorded.');
  assert.equal(registerHeadline(null), 'The register could not be read.');

  const line = registerHeadline(register({ held: 2, unanswered: 1, reviewOverdue: 1, upheld: 1 }));
  assert.match(line, /^2 versions are held and one notice has not been answered\./);
  assert.match(line, /nothing lifts a hold on a timer/);
  assert.match(line, /One version was taken down for good\./);
});

test('the effect of a hold is stated, including for learners who already paid', () => {
  assert.match(HOLD_EFFECT, /already paid/);
  assert.match(HOLD_EFFECT, /Rejecting the notice reverses all of this/);
});

test('a hold is not a refund, and the screen says so rather than implying it', () => {
  assert.match(NO_MONEY_MOVES, /does not refund anybody/);
  assert.match(NO_MONEY_MOVES, /does not change what a teacher has earned/);
  assert.match(NO_MONEY_MOVES, /decision the owner has not made/);
});

test('nothing about the decision is hidden behind a disabled button without a reason', () => {
  assert.match(decisionProblem(notice({ status: 'upheld' }), false) ?? '', /already been decided/);
  assert.match(decisionProblem(notice({}), true) ?? '', /Somebody else decides/);
  assert.equal(decisionProblem(notice({}), false), null);
  // A passed review date is a nudge, never a silent release.
  assert.equal(decisionProblem(notice({ reviewBy: '2020-01-01' }), false), null);
});

test('a holding line says how long, and whether the review date has passed', () => {
  assert.equal(holdingLine(notice({})), '6 days held, with no review date set.');
  assert.equal(holdingLine(notice({ daysHeld: 1, reviewBy: '2026-11-04' })), '1 day held. Review by 4 Nov 2026.');
  assert.match(
    holdingLine(notice({ overdueReview: true, reviewBy: '2026-10-24' })) ,
    /The review date of 24 Oct 2026 has passed and nothing lifted it/,
  );
});

test('the teacher is told what is happening to their own course', () => {
  assert.match(teacherSentence({ ...notice({}), status: 'held', answered: false }), /held while this claim is looked at/);
  assert.match(teacherSentence({ ...notice({}), status: 'held', answered: true }), /answer is on the record/);
  assert.match(teacherSentence({ ...notice({}), status: 'upheld' }), /stays out of distribution/);
  assert.match(teacherSentence({ ...notice({}), status: 'rejected' }), /back in the catalogue/);
  assert.match(teacherSentence({ ...notice({}), status: 'withdrawn' }), /claimant withdrew/);
});

test('a teacher with nothing on their record sees nothing at all', () => {
  const empty: MyTakedown = { notices: [], held: 0 };
  assert.equal(teacherHeadline(empty), null);
  assert.equal(teacherHeadline(null), null);
  assert.match(
    teacherHeadline({ notices: [{ ...notice({}), courseTitle: 'A course' }], held: 2 }) ?? '',
    /2 of your courses are held/,
  );
  assert.match(
    teacherHeadline({ notices: [{ ...notice({}) }], held: 0 }) ?? '',
    /was decided/,
  );
});

test('a refusal is a sentence, and an unknown code still says something true', () => {
  assert.match(describeTakedownError('takedown:already_held'), /already under a hold/);
  assert.match(describeTakedownError('takedown:self_decision'), /Somebody else decides/);
  assert.equal(describeTakedownError('takedown:something_new'), 'something new');
  assert.equal(describeTakedownError('', 'the database said no'), 'the database said no');
  assert.match(describeTakedownError(null), /reason was not returned/);
});
