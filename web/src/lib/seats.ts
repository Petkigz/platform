/**
 * Seats an institution bought, as its screens and its claim form see them.
 *
 * Two rules carry the weight here, and both are the same rule seen twice.
 *
 * **A seat code is a bearer token.** Whoever holds it can spend a course, so it
 * is generated from a cryptographic source, shown once, stored only as a SHA-256
 * and a four-character tail, and never logged. That is why generation lives in
 * this module with an injectable source of randomness: the tests can prove the
 * alphabet is exclusive of `I`, `O`, `0` and `1` (which people mistype) without
 * waiting for a coin to land on one.
 *
 * **The school does not learn who took a seat.** The parser walks the payload and
 * keeps only counts, dates, prices, titles and code tails — anything else a future
 * database change might add is dropped here rather than rendered. That is the same
 * defence the institution report already uses, applied to the same audience.
 */

/** No `I`, `L`, `O`, `0` or `1`: these codes are read off paper and typed by hand. */
export const SEAT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const SEAT_CODE_LENGTH = 10;

export type SeatCode = {
  id: string;
  tail: string;
  issuedAt: string | null;
  claimed: boolean;
  claimedAt: string | null;
  voided: boolean;
  voidedReason: string | null;
};

export type SeatOrder = {
  orderId: string;
  courseId: string;
  courseTitle: string;
  versionNumber: number | null;
  seats: number;
  issued: number;
  claimed: number;
  voided: number;
  remaining: number;
  unitPriceMinor: number | null;
  currency: string | null;
  invoiceReference: string;
  purchasedOn: string | null;
  note: string | null;
  codes: SeatCode[];
};

export type SeatTotals = { seats: number; claimed: number; unissued: number };

export type MySeats = {
  enabled: boolean;
  joined: boolean;
  isAdmin: boolean;
  orders: SeatOrder[];
  totals: SeatTotals;
};

export type SeatDirectoryRow = {
  institutionId: string;
  name: string;
  code: string;
  orders: number;
  seats: number;
  claimed: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function whole(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return 0;
}

function orNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

/**
 * A seat code, from a source of randomness the caller supplies.
 *
 * `pick(n)` must return an integer in `[0, n)`. In the route that is
 * `crypto.randomInt`; in a test it is a function that walks the alphabet. The
 * modulo bias of `% n` is avoided by *rejecting* draws above the largest multiple
 * of `n` — a few wasted bits for a token that hands out a course.
 */
export function generateSeatCode(pick: (max: number) => number): string {
  const size = SEAT_CODE_ALPHABET.length;
  const limit = Math.floor(0x100000000 / size) * size;
  let out = '';
  while (out.length < SEAT_CODE_LENGTH) {
    // Two draws per character, joined, so a 32-bit draw is not needed.
    const first = pick(0x10000);
    const second = pick(0x10000);
    const value = first * 0x10000 + second;
    if (value >= limit) continue;
    out += SEAT_CODE_ALPHABET[value % size];
  }
  return out;
}

/** `ABCDEFGHJK` → `ABCDE-FGHJK`. Grouped, because it is read aloud and typed. */
export function formatSeatCode(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== SEAT_CODE_LENGTH) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

/**
 * What a person typed, as the code the database hashes.
 *
 * Returns null rather than a guess: a code with an `O` in it was mistyped from a
 * page that cannot print one, and quietly turning it into a zero would spend
 * somebody else's seat or none at all. Whitespace and dashes are the only things
 * forgiven.
 */
export function normaliseSeatCode(input: string | null | undefined): string | null {
  const clean = (input ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (clean.length !== SEAT_CODE_LENGTH) return null;
  for (const character of clean) {
    if (!SEAT_CODE_ALPHABET.includes(character)) return null;
  }
  return clean;
}

/** The four characters kept in the clear, so an office can match a code. */
export function seatCodeTail(code: string): string {
  return code.slice(-4);
}

/** Codes in blocks of five, which is how a school hands them out on a sheet. */
export function formatCodeSheet(codes: string[]): string {
  return codes.map((code, index) => `${String(index + 1).padStart(2, ' ')}. ${formatSeatCode(code)}`).join('\n');
}

const EMPTY_TOTALS: SeatTotals = { seats: 0, claimed: 0, unissued: 0 };

export function parseMySeats(input: unknown): MySeats {
  const row = record(input);
  if (!row) {
    return { enabled: false, joined: false, isAdmin: false, orders: [], totals: { ...EMPTY_TOTALS } };
  }

  const orders: SeatOrder[] = [];
  for (const entry of Array.isArray(row.orders) ? row.orders : []) {
    const item = record(entry);
    if (!item || typeof item.orderId !== 'string') continue;

    const codes: SeatCode[] = [];
    for (const raw of Array.isArray(item.codes) ? item.codes : []) {
      const code = record(raw);
      if (!code || typeof code.id !== 'string') continue;
      codes.push({
        id: code.id,
        tail: text(code.tail) ?? '',
        issuedAt: text(code.issuedAt),
        claimed: code.claimed === true,
        claimedAt: text(code.claimedAt),
        voided: code.voided === true,
        voidedReason: text(code.voidedReason),
      });
    }

    orders.push({
      orderId: item.orderId,
      courseId: text(item.courseId) ?? '',
      courseTitle: text(item.courseTitle) ?? 'A course',
      versionNumber: orNull(item.versionNumber),
      seats: whole(item.seats),
      issued: whole(item.issued),
      claimed: whole(item.claimed),
      voided: whole(item.voided),
      remaining: whole(item.remaining),
      unitPriceMinor: orNull(item.unitPriceMinor),
      currency: text(item.currency),
      invoiceReference: text(item.invoiceReference) ?? '',
      purchasedOn: text(item.purchasedOn),
      note: text(item.note),
      codes,
    });
  }

  const totalsRow = record(row.totals) ?? {};
  return {
    enabled: row.enabled === true,
    joined: row.joined === true,
    isAdmin: row.isAdmin === true,
    orders,
    totals: {
      seats: whole(totalsRow.seats),
      claimed: whole(totalsRow.claimed),
      unissued: whole(totalsRow.unissued),
    },
  };
}

export function parseSeatDirectory(input: unknown): { enabled: boolean; institutions: SeatDirectoryRow[] } {
  const row = record(input);
  if (!row) return { enabled: false, institutions: [] };
  const institutions: SeatDirectoryRow[] = [];
  for (const entry of Array.isArray(row.institutions) ? row.institutions : []) {
    const item = record(entry);
    if (!item || typeof item.institutionId !== 'string') continue;
    institutions.push({
      institutionId: item.institutionId,
      name: text(item.name) ?? 'An institution',
      code: text(item.code) ?? '',
      orders: whole(item.orders),
      seats: whole(item.seats),
      claimed: whole(item.claimed),
    });
  }
  return { enabled: row.enabled === true, institutions };
}

/** The one sentence that explains what a seat is, used in more than one place. */
export const SEAT_NOTICE =
  'A seat is one learner for one course version. The school buys seats, hands out one code ' +
  'per seat, and whoever redeems a code gets the course. The school sees how many seats are ' +
  'claimed — never which learner took which one, and never a name.';

/** Why payments here are recorded rather than collected. */
export const SEAT_PAYMENT_NOTICE =
  'No payment provider is connected. A school pays by bank transfer or against an invoice, and ' +
  'a member of staff records it here with the reference — so the money moves outside this ' +
  'platform and this page is the written record that it moved. Nothing on this page charges ' +
  'anybody, and nothing here can refund anybody.';

/**
 * Money, or an honest absence.
 *
 * A recorded price is per seat in minor units; a missing one is not a zero. The
 * difference matters to a school reading its own invoice history.
 */
export function seatPriceSentence(order: SeatOrder): string {
  if (order.unitPriceMinor === null || order.currency === null) {
    return 'Price not recorded';
  }
  const amount = order.unitPriceMinor / 100;
  const formatted = amount.toLocaleString('en-GB', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${order.currency} per seat`;
}

/** `30 seats · 12 claimed · 3 issued and unused · 15 not yet issued` */
export function seatCountSentence(order: SeatOrder): string {
  const parts = [
    `${String(order.seats)} ${order.seats === 1 ? 'seat' : 'seats'}`,
    `${String(order.claimed)} claimed`,
  ];
  const issuedUnused = order.issued - order.claimed - order.voided;
  if (issuedUnused > 0) parts.push(`${String(issuedUnused)} issued and unused`);
  if (order.voided > 0) parts.push(`${String(order.voided)} voided`);
  if (order.remaining > 0) parts.push(`${String(order.remaining)} not yet issued`);
  return parts.join(' · ');
}

/** What the institution's own header says. */
export function seatsHeadline(seats: MySeats): string {
  if (seats.orders.length === 0) {
    return 'Your institution has not bought any seats yet.';
  }
  return `${String(seats.totals.seats)} ${seats.totals.seats === 1 ? 'seat' : 'seats'} bought · ${String(
    seats.totals.claimed,
  )} claimed · ${String(seats.totals.unissued)} not yet issued`;
}

/** One code, described for the list — a tail, never the code. */
export function seatCodeLine(code: SeatCode): string {
  if (code.voided) {
    return `Code …${code.tail} — voided${code.voidedReason ? `: ${code.voidedReason}` : ''}`;
  }
  if (code.claimed) return `Code …${code.tail} — claimed`;
  return `Code …${code.tail} — not yet claimed`;
}

/**
 * The claim result, in words a parent can act on.
 *
 * The course title comes from the database rather than the form, because the
 * form only ever held a code — somebody who typed it from a school letter may not
 * know which course it is for.
 */
export function claimSuccessSentence(result: unknown): string {
  const row = record(result);
  const title = text(row?.courseTitle) ?? 'the course';
  const version = orNull(row?.versionNumber);
  return version
    ? `That seat is now yours: ${title}, version ${String(version)}. It is on your learning page.`
    : `That seat is now yours: ${title}. It is on your learning page.`;
}
