/**
 * What the page of sponsored seats was answered with, as names.
 *
 * `/account/sponsorship` used to be written in English for every reader, with
 * dates in British English and no zone, a state printed through an English
 * table, and an amount printed as the database stores it: minor units, so a
 * seat that cost 19.99 was shown as 1999. Nothing here is a sentence a reader
 * sees: these are the names the page says in its own words
 * (`messages/sponsor.ts`).
 *
 * Kept apart from `sponsorship.ts`, whose English is still read by the pool,
 * the form for asking and the staff desk, so these can be tested on their own.
 */
import { MoneyError, format, fromMinor } from './money.ts';

/** The states `sponsorship_applications.status` may hold. */
export const ASK_STATES = ['submitted', 'approved', 'declined', 'withdrawn', 'funded'] as const;
export type AskState = (typeof ASK_STATES)[number] | 'other';

/** The states `sponsorships.status` may hold. */
export const PLEDGE_STATES = ['pledged', 'paid', 'withdrawn'] as const;
export type PledgeState = (typeof PLEDGE_STATES)[number] | 'other';

/** A state this page has a sentence for, or `other`: never the database's word. */
export function askStateOf(status: unknown): AskState {
  return (ASK_STATES as readonly unknown[]).includes(status) ? (status as AskState) : 'other';
}

export function pledgeStateOf(status: unknown): PledgeState {
  return (PLEDGE_STATES as readonly unknown[]).includes(status) ? (status as PledgeState) : 'other';
}

/**
 * An amount as a currency code and a number in major units, or nothing.
 *
 * `UGX 50000`, `USD 19.99`, `KWD 5.000`. Done by `money.ts` in whole numbers;
 * the amount arrives as a string and is never narrowed to a `Number`. Anything
 * that is not a whole, positive number of minor units in a currency that is a
 * currency code is nothing: a page that cannot say an amount correctly leaves
 * it out.
 */
export function amountOf(amountMinor: unknown, currencyCode: unknown): string | null {
  if (typeof currencyCode !== 'string') return null;
  if (typeof amountMinor !== 'string' && typeof amountMinor !== 'number') return null;
  if (typeof amountMinor === 'number' && !Number.isSafeInteger(amountMinor)) return null;
  const digits = String(amountMinor).trim();
  if (!/^\d{1,18}$/u.test(digits)) return null;
  try {
    return format(fromMinor(digits, currencyCode));
  } catch (error) {
    if (error instanceof MoneyError) return null;
    throw error;
  }
}

/**
 * Whether sponsoring is switched on, as the boards say, or `null` when neither
 * could be read. Both boards report the same switch; one answer is enough.
 */
export function switchOf(...boards: ({ enabled: boolean } | null | undefined)[]): boolean | null {
  for (const board of boards) if (board) return board.enabled;
  return null;
}

/** The longest note from staff this page prints. A note is a few sentences. */
export const STAFF_NOTE_MAX = 2000;

/**
 * What staff wrote, trimmed, or nothing. Never translated and never read for
 * meaning: the page prints it apart from its own sentences and says whose
 * words they are.
 */
export function staffNoteOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > STAFF_NOTE_MAX ? `${trimmed.slice(0, STAFF_NOTE_MAX)}…` : trimmed;
}
