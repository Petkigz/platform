/**
 * What taking a seat, and asking for one, were answered with, as names.
 *
 * `/sponsor` and `/sponsor/apply` were English for every reader, and their
 * forms printed whatever sentence `/api/sponsorship` sent back, which for a
 * refusal nobody had anticipated was "That did not work". This file is the
 * names: the route sends one as `reason` with a status of its own, and each
 * form says its own sentence for it, in the reader's language
 * (`messages/sponsor.ts`).
 *
 * The same three rules as the checkout's names (`checkout-outcome.ts`):
 *
 * 1. A database error with a five-character SQLSTATE outside class 08 is the
 *    database's answer. Anything else is not, and something may have been
 *    written: that is `unconfirmed`, and the reader is sent to look before
 *    trying again.
 * 2. A form believes a reason only when it arrives with that reason's own
 *    status.
 * 3. A refusal nobody named is `failed`. The database's sentence stays in
 *    the server's log.
 *
 * `gone` is one name for a seat somebody else has just taken, one that is
 * no longer open, and a code that names no seat. A sponsor can do the same
 * thing about all three, and saying which would say something about a
 * request that is not theirs to know about.
 */

/** Reasons a pledge (taking a seat) can be refused with. */
export const PLEDGE_SEAT_REASONS = ['gone', 'own_seat', 'no_price', 'off', 'too_long', 'not_signed_in', 'malformed', 'failed', 'unconfirmed'] as const;
export type PledgeSeatReason = (typeof PLEDGE_SEAT_REASONS)[number];

/** Reasons a request for a seat can be refused with. */
export const ASK_SEAT_REASONS = ['reason_required', 'too_long', 'choose', 'learner_not_yours', 'no_course', 'has_course', 'already_asked', 'off', 'not_signed_in', 'malformed', 'failed', 'unconfirmed'] as const;
export type AskSeatReason = (typeof ASK_SEAT_REASONS)[number];

export type SeatReason = PledgeSeatReason | AskSeatReason;

/** The status each reason is answered with. */
export function seatStatusOf(reason: SeatReason): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'malformed':
    case 'choose':
    case 'reason_required':
    case 'too_long': return 400;
    case 'learner_not_yours': return 403;
    case 'no_course': return 404;
    case 'failed': return 500;
    case 'unconfirmed': return 502;
    // The platform's own state, or somebody else's: not the reader's mistake.
    default: return 409;
  }
}

type DatabaseError = { code?: string | null; message?: string | null };

const keyOf = (error: DatabaseError): string | null | 'unanswered' => {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unanswered';
  return /sponsorship:([a-z_]+)/iu.exec(error.message ?? '')?.[1]?.toLowerCase() ?? null;
};

/** The reason behind a database error from `pledge_sponsorship()`. */
export function pledgeSeatReasonOf(error: DatabaseError): PledgeSeatReason {
  const key = keyOf(error);
  if (key === 'unanswered') return 'unconfirmed';
  switch (key) {
    case 'seat_taken':
    case 'seat_not_open':
    case 'seat_not_found': return 'gone';
    case 'own_seat': return 'own_seat';
    case 'no_price_for_you': return 'no_price';
    case 'disabled': return 'off';
    case 'note_too_long': return 'too_long';
    case 'not_signed_in': return 'not_signed_in';
    default: return 'failed';
  }
}

/** The reason behind a database error from `apply_for_sponsorship()`. */
export function askSeatReasonOf(error: DatabaseError): AskSeatReason {
  const key = keyOf(error);
  if (key === 'unanswered') return 'unconfirmed';
  switch (key) {
    case 'reason_required': return 'reason_required';
    case 'reason_too_long': return 'too_long';
    case 'learner_required': return 'choose';
    case 'learner_not_yours': return 'learner_not_yours';
    case 'course_not_available': return 'no_course';
    case 'already_has_access': return 'has_course';
    case 'already_asked': return 'already_asked';
    case 'disabled': return 'off';
    case 'not_signed_in': return 'not_signed_in';
    default: return 'failed';
  }
}

/** What a form says about a reply that was not a success. */
export function pledgeSeatOutcomeOf(status: number, reason: unknown): PledgeSeatReason {
  const known = typeof reason === 'string' && (PLEDGE_SEAT_REASONS as readonly string[]).includes(reason);
  return known && seatStatusOf(reason as PledgeSeatReason) === status ? (reason as PledgeSeatReason) : 'unconfirmed';
}

export function askSeatOutcomeOf(status: number, reason: unknown): AskSeatReason {
  const known = typeof reason === 'string' && (ASK_SEAT_REASONS as readonly string[]).includes(reason);
  return known && seatStatusOf(reason as AskSeatReason) === status ? (reason as AskSeatReason) : 'unconfirmed';
}

/** How long a note to staff, and a reason, may be. The database's own limits. */
export const SEAT_NOTE_MAX = 500;
export const ASK_REASON_MAX = 2000;
