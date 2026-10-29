import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  SEAT_CODE_ALPHABET,
  claimSuccessSentence,
  formatCodeSheet,
  formatSeatCode,
  generateSeatCode,
  normaliseSeatCode,
  parseMySeats,
  parseSeatDirectory,
  seatCodeLine,
  seatCodeTail,
  seatCountSentence,
  seatPriceSentence,
  seatsHeadline,
  type SeatOrder,
} from './seats.ts';

/** A deterministic `pick`, so a "random" code can be asserted character by character. */
function counter(values: number[]) {
  let index = 0;
  return (max: number) => {
    const value = values[index % values.length]!;
    index += 1;
    return value % max;
  };
}

test('the alphabet cannot spell the characters people mistype', () => {
  for (const character of ['I', 'L', 'O', '0', '1']) {
    assert(!SEAT_CODE_ALPHABET.includes(character), `${character} must not be in a code`);
  }
  assert(SEAT_CODE_ALPHABET.length > 20, 'enough alphabet to be worth guessing at');
});

test('a generated code is always ten characters from the alphabet', () => {
  const code = generateSeatCode(counter([1, 2, 3, 4, 5, 6, 7]));
  assert.equal(code.length, 10);
  for (const character of code) assert(SEAT_CODE_ALPHABET.includes(character));
});

test('a draw above the last whole multiple is rejected rather than folded in', () => {
  // 0xFFFF is above the largest multiple of the alphabet size, so the first
  // character has to come from the next draw. A modulo would silently bias it.
  const code = generateSeatCode(counter([0xFFFF, 0xFFFF, 0, 0, 0, 0, 0, 0, 0, 0]));
  assert.equal(code[0], SEAT_CODE_ALPHABET[0]);
  assert.equal(code.length, 10);
});

test('a code is shown in two groups of five', () => {
  assert.equal(formatSeatCode('ABCDEFGHJK'), 'ABCDE-FGHJK');
  // A code that is not the right length is returned as it is, not padded into a
  // shape somebody might trust.
  assert.equal(formatSeatCode('ABCDE'), 'ABCDE');
});

test('what a person types is forgiven for spaces and dashes, and nothing else', () => {
  assert.equal(normaliseSeatCode('abcde-fghjk'), 'ABCDEFGHJK');
  assert.equal(normaliseSeatCode(' ABCDE FGHJK '), 'ABCDEFGHJK');
  assert.equal(normaliseSeatCode('abcde_fghjk'), null, 'an underscore is not a typo we guess at');
  assert.equal(normaliseSeatCode('ABCDEFGHJ0'), null, 'a zero was mistyped from a page with no zero');
  assert.equal(normaliseSeatCode('ABCDE'), null);
  assert.equal(normaliseSeatCode(null), null);
});

test('the tail is the last four characters, and it is not the code', () => {
  assert.equal(seatCodeTail('ABCDEFGHJK'), 'GHJK');
  assert.notEqual(seatCodeTail('ABCDEFGHJK'), 'ABCDEFGHJK');
});

test('a sheet of codes is numbered, so a school can tick them off', () => {
  const sheet = formatCodeSheet(['ABCDEFGHJK', 'ABCDEFGHJM']);
  assert.equal(sheet, ' 1. ABCDE-FGHJK\n 2. ABCDE-FGHJM');
});

function order(over: Partial<SeatOrder> = {}): SeatOrder {
  return {
    orderId: 'o1',
    courseId: 'c1',
    courseTitle: 'Tajweed foundations',
    versionNumber: 1,
    seats: 30,
    issued: 10,
    claimed: 3,
    voided: 1,
    remaining: 20,
    unitPriceMinor: 1500,
    currency: 'USD',
    invoiceReference: 'BR-2026-0041',
    purchasedOn: '2026-10-28',
    note: null,
    codes: [],
    ...over,
  };
}

test('a price is shown per seat, and an absent price is not a zero', () => {
  assert.equal(seatPriceSentence(order()), '15 USD per seat');
  assert.equal(seatPriceSentence(order({ unitPriceMinor: null, currency: null })), 'Price not recorded');
  // A bursary must not read as "0 USD per seat", which is a claim about money.
  assert.doesNotMatch(seatPriceSentence(order({ unitPriceMinor: null, currency: null })), /\b0\b/);
});

test('counts are said in a way that survives being read aloud', () => {
  assert.equal(
    seatCountSentence(order()),
    '30 seats · 3 claimed · 6 issued and unused · 1 voided · 20 not yet issued',
  );
  assert.equal(seatCountSentence(order({ seats: 1, issued: 1, claimed: 0, voided: 0, remaining: 0 })),
    '1 seat · 0 claimed · 1 issued and unused');
  // Nothing is said twice: a fully spent order names no unused seats at all.
  assert.equal(seatCountSentence(order({ seats: 2, issued: 2, claimed: 2, voided: 0, remaining: 0 })),
    '2 seats · 2 claimed');
});

test('the headline names the three numbers a school actually asks about', () => {
  assert.match(seatsHeadline({ enabled: true, joined: true, isAdmin: true, orders: [], totals: { seats: 0, claimed: 0, unissued: 0 } }),
    /has not bought any seats/i);
  assert.equal(
    seatsHeadline({ enabled: true, joined: true, isAdmin: true, orders: [order()], totals: { seats: 30, claimed: 3, unissued: 20 } }),
    '30 seats bought · 3 claimed · 20 not yet issued',
  );
});

test('a code line says what is true of it, including why it stopped', () => {
  const base = { id: 'k1', tail: 'GHJK', issuedAt: null, claimedAt: null, voidedReason: null };
  assert.equal(seatCodeLine({ ...base, claimed: false, voided: false }), 'Code …GHJK — not yet claimed');
  assert.equal(seatCodeLine({ ...base, claimed: true, voided: false }), 'Code …GHJK — claimed');
  assert.equal(seatCodeLine({ ...base, claimed: false, voided: true, voidedReason: 'Printed twice' }),
    'Code …GHJK — voided: Printed twice');
});

test('the claim answer names the course, not the code somebody typed', () => {
  assert.match(claimSuccessSentence({ courseTitle: 'Tajweed foundations', versionNumber: 1 }),
    /Tajweed foundations, version 1/);
  assert.match(claimSuccessSentence(null), /That seat is now yours/i);
});

test('a seat payload with anything personal in it is dropped at the door', () => {
  const parsed = parseMySeats({
    enabled: true,
    joined: true,
    isAdmin: true,
    orders: [{
      orderId: 'o1',
      courseTitle: 'Tajweed foundations',
      seats: 2,
      issued: 2,
      claimed: 1,
      voided: 0,
      remaining: 0,
      codes: [
        { id: 'k1', tail: 'AAAA', claimed: true, claimedAt: '2026-10-28', learnerProfileId: 'leak', claimedBy: 'leak' },
      ],
      // A field a later database change might add. It must not survive the parse.
      claimedByNames: ['Amina'],
    }],
    totals: { seats: 2, claimed: 1, unissued: 0 },
  });

  assert.equal(parsed.orders.length, 1);
  assert.equal(parsed.orders[0]!.codes.length, 1);
  const text = JSON.stringify(parsed);
  assert(!text.includes('leak'), 'a learner id or account id reached the page');
  assert(!text.includes('Amina'), 'a name reached the page');
  assert(!/learnerProfileId/i.test(text));
});

test('seats that did not arrive say so rather than looking like zero seats', () => {
  const empty = parseMySeats(null);
  assert.equal(empty.enabled, false);
  assert.equal(empty.isAdmin, false);
  assert.deepEqual(empty.orders, []);
  assert.equal(empty.totals.seats, 0);
});

test('a member’s empty order list is not a mistake to report', () => {
  const member = parseMySeats({ enabled: true, joined: true, isAdmin: false, orders: [], totals: {} });
  assert.equal(member.joined, true);
  assert.equal(member.isAdmin, false);
  assert.deepEqual(member.orders, []);
});

test('the staff directory lists schools, never learners', () => {
  const directory = parseSeatDirectory({
    enabled: true,
    institutions: [{ institutionId: 'i1', name: 'Dar ul-Ilm', code: 'dar', orders: 2, seats: 30, claimed: 12 }],
  });
  assert.equal(directory.enabled, true);
  assert.equal(directory.institutions[0]!.seats, 30);
  assert.deepEqual(parseSeatDirectory(null), { enabled: false, institutions: [] });
});
