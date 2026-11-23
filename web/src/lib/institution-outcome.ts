/**
 * What asking to join or leave an institution was answered with, as names,
 * and the dates a member's counts are read between.
 *
 * The two buttons on `/institution` printed the route's English sentence for
 * every reader, and the page printed the database's own text when it could
 * not read. Now `/api/institution` answers joining and leaving with a name
 * and that name's own status, and the page has a sentence for each name in
 * the reader's language.
 *
 * **Only joining and leaving.** The same route also serves the fields an
 * administrator fills in and the staff desk, which are in English and still
 * read its `message`. Their answers are unchanged.
 *
 * Kept free of queries and of the catalogue, so the buttons in the browser
 * can import it.
 */

export const MEMBERSHIP_OUTCOMES = [
  'not_signed_in',
  'already_joined',
  'no_verified_domain',
  'not_a_member',
  'last_admin',
  'refused',
  'unconfirmed',
] as const;
export type MembershipOutcome = (typeof MEMBERSHIP_OUTCOMES)[number];

export function membershipStatusOf(reason: MembershipOutcome): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'no_verified_domain': return 403;
    case 'already_joined':
    case 'not_a_member':
    case 'last_admin': return 409;
    case 'refused': return 500;
    case 'unconfirmed': return 502;
  }
}

/** What `join_institution()` and `leave_institution()` raise, and the name for each. */
const RAISED: Readonly<Record<string, MembershipOutcome>> = {
  'institution:not_signed_in': 'not_signed_in',
  'institution:already_joined': 'already_joined',
  'institution:no_verified_domain': 'no_verified_domain',
  'institution:not_a_member': 'not_a_member',
  'institution:last_admin': 'last_admin',
};

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * The reason behind a database error from joining or leaving.
 *
 * A five-character SQLSTATE outside class 08 is the database's answer, and
 * whatever was being written was rolled back with it. Anything else is not
 * an answer, and the membership may have changed.
 */
export function membershipReasonOf(error: DatabaseError): MembershipOutcome {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unconfirmed';
  const said = (error.message ?? '').trim();
  return Object.hasOwn(RAISED, said) ? RAISED[said]! : 'refused';
}

/**
 * What a button says about a reply that was not a success: a reason it
 * knows, arriving with that reason's own status, or `unconfirmed`.
 */
export function membershipOutcomeOf(status: number, reason: unknown): MembershipOutcome {
  const known = typeof reason === 'string' && (MEMBERSHIP_OUTCOMES as readonly string[]).includes(reason);
  if (!known || membershipStatusOf(reason as MembershipOutcome) !== status) return 'unconfirmed';
  return reason as MembershipOutcome;
}

/** The English the route sends beside each reason, for a caller with no words of its own. */
export const MEMBERSHIP_ENGLISH: Record<MembershipOutcome, string> = {
  not_signed_in: 'Sign in first.',
  already_joined: 'You already belong to an institution.',
  no_verified_domain: 'No checked email domain matches your address, so you were not joined.',
  not_a_member: 'You are not a member of an institution.',
  last_admin: 'You are its only administrator. Somebody else has to be made an administrator before you can leave.',
  refused: 'That could not be done. Nothing was changed.',
  unconfirmed: 'We could not confirm that this was done. Open the page again to see.',
};

/** The longest stretch `institution_report()` will read: p_to - p_from may be 731 and no more. */
export const REPORT_WINDOW_DAYS = 731;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The UTC midnight of a `YYYY-MM-DD` that is a real day, or null. */
function dayOf(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const at = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(at)) return null;
  // `2026-02-31` parses in some engines as the third of March; it is not a day.
  return new Date(at).toISOString().slice(0, 10) === value ? at : null;
}

export type ReportWindow = {
  from: string;
  to: string;
  /** Why these two dates cannot be read, as the database would name it, or null when they can. */
  fault: 'bad_window' | 'window_too_long' | null;
};

/**
 * The two dates the counts are read between.
 *
 * A date that is missing or is not a day becomes the default (the 365 days
 * ending today) rather than a refusal, because an address somebody mistyped
 * should still show them a page. Two real dates the database would refuse
 * are named here, so the page says which without asking it.
 */
export function reportWindowOf(params: { from?: unknown; to?: unknown }, today: Date): ReportWindow {
  const iso = (at: number) => new Date(at).toISOString().slice(0, 10);
  const now = Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  const to = dayOf(params.to) ?? now;
  const from = dayOf(params.from) ?? Math.min(now, to) - 365 * DAY_MS;
  const days = Math.round((to - from) / DAY_MS);
  return {
    from: iso(from),
    to: iso(to),
    fault: days < 0 ? 'bad_window' : days > REPORT_WINDOW_DAYS ? 'window_too_long' : null,
  };
}
