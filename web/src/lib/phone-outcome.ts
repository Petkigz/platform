/**
 * What saving or removing a phone number was answered with, as names.
 *
 * `/api/account/phone` used to answer a refusal with whatever sentence
 * `set_my_phone()` raised, and `parsePhone()` returned English sentences that
 * the form printed. The card was the one part of the account page left in
 * English for every reader, and marked as that.
 *
 * So a number that cannot be stored has a reason with a name, the route
 * answers with the same names, and the form says each in the reader's
 * language. The database's sentences are told apart here by their words, and
 * a test reads those words out of the migration so the two cannot drift.
 *
 * What may be carried beside a name is digits: where a number begins, the
 * dial code it should begin with, how many digits a country's numbers have.
 * Each is checked to be digits before it is passed on. The country is not
 * passed on at all: the reader chose it and the form already has it.
 *
 * Saving and removing are writes. A reply that never arrived is not a refusal
 * and not a failure: it is unknown, and the form says so (`phone.unconfirmed`)
 * and asks the reader to reload, which shows the number that is stored.
 *
 * Kept apart from `phone.ts` so the words can be tested without the tables.
 */

/** Why a number cannot be stored. The same seven the database refuses for. */
export type PhoneWhy =
  | 'country'
  | 'empty'
  | 'letters'
  | 'punctuation'
  | 'plus'
  | 'other_country'
  | 'length';

export const PHONE_WHYS: readonly PhoneWhy[] = [
  'country',
  'empty',
  'letters',
  'punctuation',
  'plus',
  'other_country',
  'length',
];

/** What goes in the gaps of the two reasons that have them. */
export type PhoneParts = {
  /** How the number begins, with its plus: `+447`. */
  begins?: string;
  /** The dial code a number from the chosen country begins with: `+256`. */
  dial?: string;
  /** The fewest and the most digits a number from the chosen country has. */
  min?: number;
  max?: number;
  /** How many digits this number has. */
  count?: number;
};

export type PhoneReason = { why: PhoneWhy } & PhoneParts;

export type PhoneCode = PhoneWhy | 'no_dial' | 'signed_out' | 'off' | 'malformed' | 'refused' | 'failed';

/**
 * The English the route sends beside each code, for a caller with no words of
 * its own. Its own sentences: none repeats the words the database raises, so
 * a check for the database's words in an answer cannot be fooled by these.
 */
export const PHONE_SENTENCE: Record<PhoneCode, string> = {
  country: 'Choose the country this number belongs to.',
  empty: 'No phone number was typed.',
  letters: 'A phone number has digits only. Take the letters out.',
  punctuation: 'Type the digits of the number. So far there are only signs.',
  plus: 'A number has one plus sign at most, and only at the beginning.',
  other_country: 'This number does not belong to the country chosen.',
  length: 'This number has too few or too many digits for the country chosen.',
  no_dial: 'No code is on record here for that country, so its numbers cannot be kept yet.',
  signed_out: 'You are signed out. Sign in again, then try once more. Nothing was changed.',
  off: 'Phone numbers are not being collected at the moment. Nothing was changed.',
  malformed: 'The request was not one this address understands.',
  refused: 'The platform did not accept this number. Nothing was changed.',
  failed: 'The change could not be confirmed.',
};

const isPhoneCode = (value: unknown): value is PhoneCode =>
  typeof value === 'string' && Object.hasOwn(PHONE_SENTENCE, value);

/** The status the route answers a code with. Only `failed` is not a refusal. */
export function phoneStatusOf(code: PhoneCode): number {
  if (code === 'signed_out') return 401;
  if (code === 'off' || code === 'refused') return 409;
  if (code === 'failed') return 502;
  return 400;
}

const DIAL = /^\+[0-9]{1,5}$/u;

const digitsOf = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 99 ? value : undefined;

/** Only digits, and only the five gaps there are. Anything else is left behind. */
export function phonePartsOf(value: unknown): PhoneParts {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const min = digitsOf(raw.min);
  const max = digitsOf(raw.max);
  const count = digitsOf(raw.count);
  return {
    ...(typeof raw.begins === 'string' && DIAL.test(raw.begins) ? { begins: raw.begins } : {}),
    ...(typeof raw.dial === 'string' && DIAL.test(raw.dial) ? { dial: raw.dial } : {}),
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
    ...(count === undefined ? {} : { count }),
  };
}

export type PhoneRefusal = { ok: false; code: PhoneCode; message: string } & PhoneParts;

/** A refusal as the route sends it. */
export function phoneRefusal(code: PhoneCode, parts: PhoneParts = {}): PhoneRefusal {
  return { ok: false, code, message: PHONE_SENTENCE[code], ...phonePartsOf(parts) };
}

/**
 * What the form believes about a reply that was not a saved number.
 *
 * A refusal is believed only from a 4xx that names a reason this file knows.
 * Everything else, a 5xx, a proxy's page, a name from a newer server, is
 * `failed`: the form does not know what happened.
 */
export function phoneOutcomeOf(status: number, body: unknown): { code: PhoneCode } & PhoneParts {
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined;
  if (status < 400 || status > 499 || !isPhoneCode(code)) return { code: 'failed' };
  return { code, ...phonePartsOf(body) };
}

type DatabaseError = { code?: string | null; message?: string | null };

const whole = (digits: string | undefined): number | undefined => digitsOf(Number(digits));

/**
 * What `set_my_phone()`, `clear_my_phone()` and the normaliser under them
 * raise (`20261281000700_phone_numbers.sql`), told apart by their words.
 *
 * Every one of them is raised before anything is written, so each is a
 * refusal: nothing changed. So is a row the table's own trigger turned away
 * (`check_violation`). An error under any other state is not known to be
 * that, and is `failed`.
 */
export function phoneCodeOf(error: DatabaseError): { code: PhoneCode } & PhoneParts {
  const state = error.code ?? '';
  const message = error.message ?? '';

  if (state === '42501') {
    return { code: /sign in to (?:save|change|read) your phone number/iu.test(message) ? 'signed_out' : 'refused' };
  }
  if (state === '0A000') {
    return { code: /phone numbers are not being collected/iu.test(message) ? 'off' : 'refused' };
  }
  if (state === '23514') return { code: 'refused' };
  if (state !== '22023') return { code: 'failed' };

  // The longer sentence first: it begins with the shorter one's words.
  if (/type a phone number, not just punctuation/iu.test(message)) return { code: 'punctuation' };
  if (/type a phone number/iu.test(message)) return { code: 'empty' };
  if (/choose the country the number is registered in/iu.test(message)) return { code: 'country' };
  if (/has no dial code for/iu.test(message)) return { code: 'no_dial' };
  if (/a phone number cannot contain letters/iu.test(message)) return { code: 'letters' };
  if (/at most one \+, and only at the start/iu.test(message)) return { code: 'plus' };

  const other = /is not a \S+ number: it begins (\+?[0-9]*), and a number from there begins (\+[0-9]+)/iu.exec(message);
  if (other) {
    // Written with a plus however it was typed: `0044` is `+44`.
    const typed = other[1] ?? '';
    const begins = typed.startsWith('+') ? typed : `+${typed.startsWith('00') ? typed.slice(2) : typed}`;
    return { code: 'other_country', ...phonePartsOf({ begins, dial: other[2] }) };
  }

  const length = /has (\d+) to (\d+) digits, and this one has (\d+)/iu.exec(message);
  if (length) {
    return { code: 'length', ...phonePartsOf({ min: whole(length[1]), max: whole(length[2]), count: whole(length[3]) }) };
  }

  return { code: 'refused' };
}

/** The six sentences a reason can be said with: a length has two. */
export type PhoneSaid = Exclude<PhoneWhy, 'length'> | 'length_one' | 'length_range';

/**
 * Which sentence says a reason, and whether everything it needs came with it.
 *
 * "Has 9 digits" and "has at least 7 and at most 9" are two sentences because
 * a range written with one number twice reads as a mistake in any language.
 * A reason that arrived without what goes in its gaps returns nothing, and the
 * form says the general refusal instead of a sentence with a hole in it.
 */
export function phoneSaidAs(reason: PhoneReason): PhoneSaid | null {
  if (reason.why === 'other_country') {
    return reason.begins !== undefined && reason.dial !== undefined ? 'other_country' : null;
  }
  if (reason.why === 'length') {
    if (reason.min === undefined || reason.max === undefined || reason.count === undefined) return null;
    return reason.min === reason.max ? 'length_one' : 'length_range';
  }
  return reason.why;
}

const isPhoneWhy = (value: unknown): value is PhoneWhy =>
  typeof value === 'string' && (PHONE_WHYS as readonly string[]).includes(value);

/** A refusal's code as a reason for the number, where it is one. */
export function phoneReasonOf(outcome: { code: PhoneCode } & PhoneParts): PhoneReason | null {
  if (!isPhoneWhy(outcome.code)) return null;
  const { code, ...parts } = outcome;
  return { why: code, ...parts };
}
