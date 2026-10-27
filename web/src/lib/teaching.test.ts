import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  APPOINTMENT_NOTICE,
  canTeach,
  describeStatus,
  parseOwnApplication,
  parseQueue,
  safeSampleUrl,
  teachingRefusal,
} from './teaching.ts';

describe('the applicant’s own page', () => {
  it('reads an application that is with the owner', () => {
    const board = parseOwnApplication({
      open: true,
      isInstructor: false,
      application: {
        id: 'a1',
        headline: 'Tajweed for children',
        qualifications: 'Ijazah in Hafs, six years in a madrasah.',
        sampleUrl: 'https://example.org/sample',
        note: 'Evenings, East Africa Time',
        status: 'submitted',
        decisionReason: null,
        submittedAt: '2026-10-26T00:00:00Z',
        decidedAt: null,
      },
    });
    assert.ok(board);
    assert.equal(board.open, true);
    assert.equal(board.application?.status, 'submitted');
    assert.equal(board.application?.sampleUrl, 'https://example.org/sample');
    assert.equal(canTeach(board), false);
  });

  it('reads an empty board as no application rather than inventing one', () => {
    const board = parseOwnApplication({ open: true, isInstructor: false, application: null });
    assert.ok(board);
    assert.equal(board.application, null);
    assert.equal(canTeach(board), false);
  });

  it('refuses a reply that is not an object', () => {
    assert.equal(parseOwnApplication(null), null);
    assert.equal(parseOwnApplication('submitted'), null);
  });

  it('only lets somebody teach when the role says so', () => {
    const approved = parseOwnApplication({
      isInstructor: true,
      application: { id: 'a1', status: 'approved' },
    });
    assert.equal(canTeach(approved), true);

    // An approved-looking application with no role is still a no: the role is
    // what the database checks, and this screen must not promise more than it.
    const lie = parseOwnApplication({
      isInstructor: false,
      application: { id: 'a1', status: 'approved' },
    });
    assert.equal(canTeach(lie), false);
  });
});

describe('the staff queue', () => {
  it('reads the waiting list, with the address to reply to', () => {
    const queue = parseQueue({
      open: true,
      waiting: [
        {
          id: 'a1',
          name: 'Amina',
          email: 'amina@example.com',
          headline: 'Tajweed',
          qualifications: 'Ijazah in Hafs.',
          sampleUrl: 'https://example.org/a',
          submittedAt: '2026-10-26T00:00:00Z',
        },
      ],
      decided: [],
      counts: { waiting: 1, approved: 0, declined: 0 },
    });
    assert.ok(queue);
    assert.equal(queue.waiting.length, 1);
    assert.equal(queue.waiting[0]!.email, 'amina@example.com');
    assert.equal(queue.counts.waiting, 1);
  });

  it('drops a row with no id, because a decision needs one', () => {
    const queue = parseQueue({ waiting: [{ headline: 'no id' }, { id: 'a2', headline: 'ok' }] });
    assert.ok(queue);
    assert.equal(queue.waiting.length, 1);
    assert.equal(queue.waiting[0]!.id, 'a2');
  });

  it('reads missing counts as zero', () => {
    const queue = parseQueue({});
    assert.ok(queue);
    assert.equal(queue.counts.waiting, 0);
    assert.equal(queue.counts.approved, 0);
    assert.deepEqual(queue.decided, []);
  });
});

describe('what each status means', () => {
  it('never implies an application made somebody a teacher', () => {
    assert.match(describeStatus('submitted'), /waiting to be read/);
    assert.match(describeStatus('declined'), /Not approved/);
    assert.match(describeStatus('withdrawn'), /took this back/);
    assert.match(describeStatus('approved'), /Approved/);
  });

  it('carries the appointment rule beside the form', () => {
    assert.match(APPOINTMENT_NOTICE, /by appointment/);
    assert.match(APPOINTMENT_NOTICE, /does not create a teacher/);
    assert.match(APPOINTMENT_NOTICE, /still passes review/);
  });
});

describe('a sample lesson link', () => {
  it('accepts an http or https address', () => {
    assert.equal(safeSampleUrl('https://example.org/lesson'), 'https://example.org/lesson');
    assert.equal(safeSampleUrl('http://example.org/lesson'), 'http://example.org/lesson');
  });

  it('refuses anything else, including javascript and nonsense', () => {
    assert.equal(safeSampleUrl('javascript:alert(1)'), null);
    assert.equal(safeSampleUrl('example.org/lesson'), null);
    assert.equal(safeSampleUrl(''), null);
    assert.equal(safeSampleUrl(null), null);
  });
});

describe('refusals become sentences', () => {
  it('maps the keys the database raises', () => {
    assert.match(teachingRefusal('teaching:applications_closed').message, /closed at the moment/);
    assert.match(teachingRefusal('teaching:already_applied').message, /already have an application/);
    assert.match(teachingRefusal('teaching:not_allowed').message, /Only platform staff/);
    assert.equal(teachingRefusal('teaching:already_applied').code, 'already_applied');
  });

  it('does not leak a raw exception', () => {
    const out = teachingRefusal('some other failure');
    assert.equal(out.code, 'unknown');
    assert.doesNotMatch(out.message, /some other failure/);
  });
});
