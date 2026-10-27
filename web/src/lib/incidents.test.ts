import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NOTICE_NOT_SENT,
  categoryLabels,
  describeIncidentError,
  impactSentence,
  nextStateProblem,
  nextStates,
  obligationLabel,
  obligationSentence,
  registerHeadline,
  severityLabel,
  statusLabel,
  timeUntil,
  type IncidentDetail,
  type IncidentRegister,
  type Obligation,
} from './incidents.ts';

function obligation(overrides: Partial<Obligation>): Obligation {
  return {
    id: 'n1',
    audience: 'The data protection authority',
    basis: 'The 72-hour rule',
    dueAt: '2026-10-30T09:00:00Z',
    toldAt: null,
    toldBy: null,
    method: null,
    note: null,
    waivedAt: null,
    waiveReason: null,
    state: 'due',
    ...overrides,
  };
}

function detail(overrides: Partial<IncidentDetail['incident']> = {}, notifications: Obligation[] = []): IncidentDetail {
  return {
    incident: {
      id: 'i1',
      reference: 'INC-2026-0001',
      title: 'A backup was exposed',
      summary: 'A nightly backup was served without authentication.',
      severity: 'critical',
      status: 'open',
      occurredAt: null,
      discoveredAt: '2026-10-27T08:00:00Z',
      containedAt: null,
      resolvedAt: null,
      closedAt: null,
      categories: ['accounts'],
      people: 412,
      children: 30,
      teachers: 12,
      harm: 'Names were readable.',
      learnerNotice: null,
      lessons: null,
      openedBy: 'Owner',
      createdAt: '2026-10-27T08:05:00Z',
      ...overrides,
    },
    notifications,
    entries: [],
  };
}

function register(counts: Partial<IncidentRegister['counts']>): IncidentRegister {
  return {
    incidents: [],
    counts: {
      open: 0,
      resolved: 0,
      closed: 0,
      critical: 0,
      overdueObligations: 0,
      noObligations: 0,
      childrenAffected: 0,
      ...counts,
    },
    canWork: true,
  };
}

const NOW = new Date('2026-10-27T12:00:00Z');

test('labels are words a person reads, not codes', () => {
  assert.equal(severityLabel('critical'), 'Critical');
  assert.equal(severityLabel(null), 'Major');
  assert.equal(statusLabel('contained'), 'Contained');
  assert.equal(statusLabel('nonsense'), 'Open');
  assert.equal(obligationLabel('waived'), 'Decided against');
  assert.equal(obligationLabel(undefined), 'Due');
});

test('what kinds of data were involved read as descriptions', () => {
  assert.deepEqual(categoryLabels(['accounts', 'children']), ['Account details', 'Children’s data']);
  assert.deepEqual(categoryLabels([]), ['Not yet described']);
  assert.deepEqual(categoryLabels(null), ['Not yet described']);
  assert.deepEqual(categoryLabels(['teacher_records']), ['Teacher records']);
});

test('a deadline is said in hours while hours still matter, and in days after that', () => {
  assert.equal(timeUntil('2026-10-27T14:00:00Z', NOW), '2 hours left');
  assert.equal(timeUntil('2026-10-27T11:00:00Z', NOW), '1 hour late');
  assert.equal(timeUntil('2026-10-27T11:30:00Z', NOW), '30 minutes late');
  assert.equal(timeUntil('2026-10-30T12:00:00Z', NOW), '3 days left');
  assert.equal(timeUntil('not a date', NOW), 'with no readable deadline');
});

test('an obligation says what happened or what is left, and never blurs the two', () => {
  assert.match(
    obligationSentence(obligation({ state: 'told', toldAt: '2026-10-28T09:00:00Z', method: 'Letter' }), NOW),
    /inside the deadline/,
  );
  assert.match(
    obligationSentence(obligation({ state: 'late', toldAt: '2026-10-31T09:00:00Z', method: 'Email' }), NOW),
    /after the deadline/,
  );
  // A waived obligation carries its reason; it must never read like an unstarted one.
  const waived = obligationSentence(obligation({ state: 'waived', waiveReason: 'They already knew.' }), NOW);
  assert.match(waived, /Decided not to tell/);
  assert.match(waived, /They already knew/);
  assert.match(
    obligationSentence(obligation({ state: 'overdue', dueAt: '2026-10-26T12:00:00Z' }), NOW),
    /Overdue by 1 day/,
  );
  assert.match(
    obligationSentence(obligation({ dueAt: '2026-10-29T12:00:00Z' }), NOW),
    /2 days left/,
  );
});

test('the headline leads with what is late, then with what has nobody to tell', () => {
  assert.match(registerHeadline(register({})), /No incident has ever been recorded/);
  assert.equal(registerHeadline(null), 'The register could not be read.');

  const one = registerHeadline(register({ open: 1, overdueObligations: 1, childrenAffected: 30, noObligations: 1 }));
  assert.match(one, /One incident is open/);
  assert.match(one, /one notification is past its deadline/);
  assert.match(one, /One open incident has nobody recorded to tell/);
  assert.match(one, /30 children are affected/);

  const quiet = registerHeadline(register({ open: 2 }));
  assert.equal(quiet, '2 incidents are open.');
});

test('a state is offered only when the database would accept it', () => {
  assert.deepEqual(nextStates(detail()), ['contained', 'resolved', 'open']);
  assert.deepEqual(nextStates(detail({ status: 'contained' })), ['resolved', 'open']);
  assert.deepEqual(nextStates(detail({ status: 'resolved' })), ['closed', 'open']);
  assert.deepEqual(nextStates(detail({ status: 'closed' })), ['open']);
});

test('the reason a state cannot be reached is the same reason the database gives', () => {
  // One step at a time.
  assert.match(nextStateProblem(detail(), 'closed') ?? '', /pass through contained first/);
  // Backwards is a reopen, not a slide.
  assert.match(
    nextStateProblem(detail({ status: 'resolved' }), 'contained') ?? '',
    /reopen it instead/,
  );
  // Nobody told and nobody waived.
  assert.match(
    nextStateProblem(detail({ status: 'contained' }, [obligation({})]), 'resolved') ?? '',
    /neither told nor decided against/,
  );
  assert.match(
    nextStateProblem(detail({ status: 'contained' }, [obligation({}), obligation({ id: 'n2' })]), 'resolved') ?? '',
    /^2 notifications/,
  );
  // A waiver is an ending, so it closes the gap.
  assert.equal(
    nextStateProblem(
      detail({ status: 'contained' }, [obligation({ state: 'waived', waivedAt: '2026-10-27T09:00:00Z', waiveReason: 'They knew.' })]),
      'resolved',
    ),
    null,
  );
  // Nothing closes without a lesson.
  assert.match(
    nextStateProblem(detail({ status: 'resolved', lessons: 'Short.' }), 'closed') ?? '',
    /Record what changed/,
  );
  assert.equal(
    nextStateProblem(
      detail({ status: 'resolved', lessons: 'Backup objects are private by default and the policy is checked in CI.' }),
      'closed',
    ),
    null,
  );
  // Reopening is always allowed, and reopening an open incident is not.
  assert.equal(nextStateProblem(detail({ status: 'closed' }), 'open'), null);
  assert.match(nextStateProblem(detail(), 'open') ?? '', /already open/);
});

test('impact is counts, and a zero is not "nobody was hurt"', () => {
  assert.equal(impactSentence({ people: 412, children: 30, teachers: 12 }), '412 people, of whom 30 are children and 12 are teachers.');
  assert.equal(impactSentence({ people: 1, children: 0, teachers: 0 }), '1 person.');
  assert.equal(impactSentence({ people: 3, children: 0, teachers: 1 }), '3 people, of whom 1 is a teacher.');
  assert.equal(impactSentence({ people: 0, children: 0, teachers: 0 }), 'Nobody is recorded as affected yet.');
});

test('the notice field says it does not send, in the same breath as existing', () => {
  assert.match(NOTICE_NOT_SENT, /not sent/i);
  assert.match(NOTICE_NOT_SENT, /email or SMS provider/);
});

test('a refusal is a sentence, and an unknown code still says something true', () => {
  assert.match(describeIncidentError('incident:not_allowed'), /owner or governance staff/);
  assert.equal(
    describeIncidentError('incident:obligations_open', '1 obligation(s) are neither told nor waived'),
    'A notification is neither told nor decided against. One of those, and it can move on. 1 obligation(s) are neither told nor waived.',
  );
  assert.equal(describeIncidentError('incident:entry_append_only'), 'The log is a record, not a document. Add a line instead of editing one.');
  assert.equal(describeIncidentError('incident:something_new'), 'something new');
  assert.equal(describeIncidentError('', 'the database said no'), 'the database said no');
  assert.match(describeIncidentError(null), /reason was not returned/);
});
