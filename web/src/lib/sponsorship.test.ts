import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ZAKAT_HONESTY,
  audienceWords,
  describeApplicationStatus,
  describeSponsorshipStatus,
  parseApplicationBoard,
  parseOverview,
  parsePool,
  parseSponsorBoard,
  pledgeNextStep,
  seatPrice,
  sponsorshipRefusal,
} from './sponsorship.ts';

describe('the applicant’s board', () => {
  it('reads a board that came back whole', () => {
    const board = parseApplicationBoard({
      enabled: true,
      applications: [
        {
          id: 'a1',
          learnerName: 'Amina',
          courseTitle: 'Tajweed 1',
          courseSlug: 'tajweed-1',
          status: 'funded',
          seatCode: 'SPN-3F2C91',
          reason: 'I cannot afford it',
          decisionReason: 'Checked with the family',
          askedAt: '2026-10-26T00:00:00Z',
          decidedAt: '2026-10-26T06:00:00Z',
          covered: true,
        },
      ],
    });
    assert.ok(board);
    assert.equal(board.enabled, true);
    assert.equal(board.applications.length, 1);
    assert.equal(board.applications[0]!.seatCode, 'SPN-3F2C91');
    assert.equal(board.applications[0]!.covered, true);
  });

  it('has no donor field to render, because the database does not send one', () => {
    const board = parseApplicationBoard({
      applications: [{ id: 'a1', status: 'funded', covered: true, donor: 'Somebody' }],
    });
    assert.ok(board);
    assert.equal('donor' in board.applications[0]!, false);
    assert.doesNotMatch(JSON.stringify(board), /Somebody/);
  });

  it('treats missing lists as empty and refuses a shape it cannot read', () => {
    const board = parseApplicationBoard({ enabled: false });
    assert.ok(board);
    assert.deepEqual(board.applications, []);
    assert.equal(parseApplicationBoard(null), null);
    assert.equal(parseApplicationBoard('nope'), null);
  });

  it('drops a row that is not an object rather than inventing one', () => {
    const board = parseApplicationBoard({ applications: [null, 7, { id: 'ok' }] });
    assert.ok(board);
    assert.equal(board.applications.length, 1);
  });
});

describe('the sponsor’s board', () => {
  it('keeps money as a string from the database to the screen', () => {
    const board = parseSponsorBoard({
      enabled: true,
      sponsorships: [
        {
          id: 's1',
          seatCode: 'SPN-3F2C91',
          courseTitle: 'Tajweed 1',
          status: 'paid',
          amountMinor: '40000',
          currencyCode: 'UGX',
          reference: 'BANK-5',
          recordedAt: '2026-10-26T00:00:00Z',
        },
      ],
    });
    assert.ok(board);
    assert.equal(board.sponsorships[0]!.amountMinor, '40000');
    assert.equal(board.sponsorships[0]!.currencyCode, 'UGX');
    assert.equal(board.sponsorships[0]!.reference, 'BANK-5');
  });

  it('accepts a numeric amount without turning it into a float', () => {
    const board = parseSponsorBoard({ sponsorships: [{ id: 's1', amountMinor: 40000 }] });
    assert.ok(board);
    assert.equal(board.sponsorships[0]!.amountMinor, '40000');
  });

  it('has no learner field to render', () => {
    const board = parseSponsorBoard({
      sponsorships: [{ id: 's1', learnerName: 'Amina', learnerProfileId: 'lp-1' }],
    });
    assert.ok(board);
    assert.equal('learnerName' in board.sponsorships[0]!, false);
    assert.doesNotMatch(JSON.stringify(board), /Amina|lp-1/);
  });
});

describe('the pool', () => {
  it('reads seats with the price a sponsor would pay', () => {
    const pool = parsePool({
      enabled: true,
      seats: [
        {
          seatCode: 'SPN-3F2C91',
          courseTitle: 'Tajweed 1',
          courseSlug: 'tajweed-1',
          audience: 'child',
          difficulty: 'beginner',
          approvedAt: '2026-10-26T00:00:00Z',
          price: { resolved: true, amountMinor: '40000', currencyCode: 'UGX', reason: null },
        },
      ],
    });
    assert.ok(pool);
    assert.equal(pool.seats.length, 1);
    assert.equal(pool.seats[0]!.amountMinor, '40000');
    assert.equal(seatPrice(pool.seats[0]!).label, 'UGX 40000');
    assert.equal(seatPrice(pool.seats[0]!).ok, true);
  });

  it('drops a seat with no code, because a seat nobody can name cannot be taken', () => {
    const pool = parsePool({ seats: [{ courseTitle: 'No code' }, { seatCode: 'SPN-ABC123' }] });
    assert.ok(pool);
    assert.equal(pool.seats.length, 1);
  });

  it('says why a seat cannot be taken here instead of hiding it', () => {
    const pool = parsePool({
      seats: [
        {
          seatCode: 'SPN-ABC123',
          price: { resolved: false, amountMinor: null, currencyCode: null, reason: 'no_price_for_country' },
        },
      ],
    });
    assert.ok(pool);
    const seat = pool.seats[0]!;
    assert.equal(seatPrice(seat).ok, false);
    assert.match(seatPrice(seat).label, /not priced where you are/);
    assert.equal(seat.priceReason, 'no_price_for_country');
  });

  it('carries the pool’s own reason when it is closed', () => {
    const pool = parsePool({ enabled: false, reason: 'disabled', seats: [] });
    assert.ok(pool);
    assert.equal(pool.enabled, false);
    assert.equal(pool.reason, 'disabled');
  });
});

describe('the staff desk', () => {
  it('reads the queue, the seats and the counts', () => {
    const board = parseOverview({
      enabled: true,
      waiting: [{ id: 'a1', learnerName: 'Amina', courseTitle: 'Tajweed 1', reason: 'please' }],
      seats: [{ seatCode: 'SPN-ABC123', donor: 'Yusuf', status: 'pledged', amountMinor: '40000' }],
      counts: { waiting: 1, approved: 2, funded: 3, declined: 1, pledged: 1, paid: 3 },
    });
    assert.ok(board);
    assert.equal(board.waiting.length, 1);
    assert.equal(board.seats[0]!.donor, 'Yusuf');
    assert.equal(board.counts.funded, 3);
  });

  it('reads missing counts as zero rather than NaN', () => {
    const board = parseOverview({});
    assert.ok(board);
    assert.equal(board.counts.waiting, 0);
    assert.equal(board.counts.paid, 0);
    assert.deepEqual(board.waiting, []);
  });
});

describe('the words', () => {
  it('says what each status means to a person', () => {
    assert.match(describeApplicationStatus('submitted'), /Waiting/);
    assert.match(describeApplicationStatus('approved'), /waiting for a sponsor/);
    assert.match(describeApplicationStatus('funded'), /Covered/);
    assert.match(describeApplicationStatus('declined'), /Not approved/);
    assert.match(describeSponsorshipStatus('pledged'), /Pledged/);
    assert.match(describeSponsorshipStatus('paid'), /seat is open/);
  });

  it('names who a course is for without naming anybody', () => {
    assert.equal(audienceWords('child'), 'for a child');
    assert.equal(audienceWords('adult'), 'for an adult');
    assert.equal(audienceWords('both'), '');
    assert.equal(audienceWords(null), '');
  });

  it('never implies a provider can take a sponsorship', () => {
    const sentence = pledgeNextStep('pledged');
    assert.match(sentence, /No card or mobile-money provider/);
    assert.match(sentence, /staff will record it/);
  });
});

describe('refusals become sentences', () => {
  it('maps the keys the database raises', () => {
    assert.match(sponsorshipRefusal('sponsorship:seat_taken').message, /took that seat/);
    assert.match(sponsorshipRefusal('sponsorship:own_seat').message, /your own request/);
    assert.match(sponsorshipRefusal('sponsorship:already_has_access').message, /already has this course/);
    assert.match(sponsorshipRefusal('sponsorship:not_allowed').message, /owner or finance/);
    assert.equal(sponsorshipRefusal('sponsorship:seat_taken').code, 'seat_taken');
  });

  it('does not leak a raw exception when it does not recognise one', () => {
    const out = sponsorshipRefusal('some other failure entirely');
    assert.equal(out.code, 'unknown');
    assert.doesNotMatch(out.message, /some other failure/);
    assert.match(out.message, /nothing was charged/);
  });
});

describe('what the screens must say out loud', () => {
  it('does not rule on zakat', () => {
    assert.match(ZAKAT_HONESTY, /scholar’s ruling/);
    assert.match(ZAKAT_HONESTY, /does not make it/);
  });
});
