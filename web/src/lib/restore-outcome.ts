/**
 * What putting a copy back was answered with, as names.
 *
 * `/api/account/restore` used to answer a refusal with whatever sentence
 * `restore_my_data()` raised, and the report it sent on success carried the
 * database's reason for every entry it left in the file, in English, straight
 * to the screen. A reader of Arabic was told, in the middle of an Arabic page,
 * that "the profile column cannot hold …; set it again from /account".
 *
 * So the route names the refusal, the report names the reason for each entry,
 * and the screen says both in the reader's language. The database's sentences
 * are told apart here by their words, and a test reads those words out of the
 * migration so the two cannot drift. A sentence this file does not recognise,
 * including whatever an insert trigger raised, becomes `other`, which has one
 * sentence of its own. Nothing the database wrote is shown.
 *
 * What may be shown is what the reader's own file said: the name of a lesson,
 * the language, time zone or country it held. Each is cut to a length a line
 * can hold.
 *
 * Putting a file back is a write. A reply that never arrived, after the button
 * that writes was pressed, is not a refusal and not a failure: it is unknown,
 * and the screen says so (`restore.unconfirmed`). Asking again is safe because
 * an entry that is already here is skipped.
 *
 * Kept apart from `restore.ts` so the words can be tested without the queries.
 */

/** The same ceiling `restore_my_data()` applies (`v_ceiling`). */
export const RESTORE_MAX_BYTES = 8 * 1024 * 1024;

/** The newest `formatVersion` `restore_my_data()` reads. A test reads the migration. */
export const RESTORE_FORMAT_NEWEST = 2;

/** The longest piece of the reader's file that is said back to them. */
export const RESTORE_VALUE_LIMIT = 120;

export type RestoreCode =
  | 'signed_out'
  | 'too_large'
  | 'not_json'
  | 'not_export'
  | 'newer'
  | 'refused'
  | 'failed';

/** The English the route sends beside each code, for a caller with no words of its own. */
export const RESTORE_SENTENCE: Record<RestoreCode, string> = {
  signed_out: 'You are signed out. Sign in again, then choose the file again. Nothing was changed.',
  too_large: 'This file is larger than a copy of your data can be.',
  not_json: 'This file is empty or is not JSON.',
  not_export: 'This file holds JSON, but it is not a copy of your data made by this platform.',
  newer: 'This copy was made by a newer version of the platform than this one reads.',
  refused: 'The platform refused this file. Nothing was changed.',
  failed: 'The file could not be read just now.',
};

const isRestoreCode = (value: unknown): value is RestoreCode =>
  typeof value === 'string' && Object.hasOwn(RESTORE_SENTENCE, value);

/** The status the route answers a code with. Only `failed` is not a refusal. */
export function restoreStatusOf(code: RestoreCode): number {
  if (code === 'signed_out') return 401;
  if (code === 'too_large') return 413;
  if (code === 'not_json' || code === 'not_export') return 400;
  if (code === 'newer' || code === 'refused') return 409;
  return 502;
}

/** A refusal as the route sends it. */
export function restoreRefusal(code: RestoreCode): { ok: false; code: RestoreCode; message: string } {
  return { ok: false, code, message: RESTORE_SENTENCE[code] };
}

/**
 * What the screen believes about a reply that was not a report.
 *
 * A refusal is believed only from a 4xx that names a reason this file knows.
 * Everything else, a 5xx, a proxy's page, a name from a newer server, is
 * `failed`: the screen does not know what happened.
 */
export function restoreOutcomeOf(status: number, code: unknown): RestoreCode {
  if (status < 400 || status > 499 || !isRestoreCode(code)) return 'failed';
  return code;
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * `restore_my_data()` raises seven things under two error codes
 * (`20261281007000_restore_my_data.sql`). They are told apart by their words.
 *
 * Every one of them is raised before anything is written, so each is a
 * refusal: nothing changed. An error under any other code is not known to be
 * that, and is `failed`.
 */
export function restoreCodeOf(error: DatabaseError): RestoreCode {
  const code = error.code ?? '';
  const message = error.message ?? '';
  if (code === '42501') {
    if (/sign in to restore your data/iu.test(message)) return 'signed_out';
    // "there is no profile for this account to restore into", and anything
    // else refused for want of a right.
    return 'refused';
  }
  if (code === '22023') {
    if (/written by a newer version of the platform/iu.test(message)) return 'newer';
    if (/an export is far smaller than/iu.test(message)) return 'too_large';
    if (
      /the file should be one JSON object/iu.test(message) ||
      /has no formatVersion/iu.test(message) ||
      /is not a version of this format/iu.test(message)
    ) {
      return 'not_export';
    }
    return 'refused';
  }
  return 'failed';
}

// ---------------------------------------------------------------------------
// Why an entry stayed in the file
// ---------------------------------------------------------------------------

export type RestoreWhy =
  | 'name_blank'
  | 'name_long'
  | 'language'
  | 'timezone'
  | 'country'
  | 'not_list'
  | 'capped'
  | 'off'
  | 'note_empty'
  | 'note_long'
  | 'no_lesson'
  | 'not_enrolled'
  | 'ambiguous'
  | 'differs'
  | 'no_access'
  | 'other';

export const RESTORE_WHYS: readonly RestoreWhy[] = [
  'name_blank',
  'name_long',
  'language',
  'timezone',
  'country',
  'not_list',
  'capped',
  'off',
  'note_empty',
  'note_long',
  'no_lesson',
  'not_enrolled',
  'ambiguous',
  'differs',
  'no_access',
  'other',
];

export type RestoreReason = {
  why: RestoreWhy;
  /** What the reader's file held, for the three reasons that quote it. */
  value?: string;
  /** A limit: the most characters a name or a note may have. */
  count?: number;
  /** For a list that was cut: how many entries were read, and how many the file held. */
  read?: number;
  held?: number;
};

/** A piece of the reader's own file, with nothing in it that redraws a line. */
export function restoreQuoted(value: string): string {
  // Control characters and the marks that turn text around (U+202A to U+202E,
  // U+2066 to U+2069) are dropped: a value is set inside an isolate of the
  // screen's own, and one of these in a file would close it early.
  return value
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu, '')
    .trim()
    .slice(0, RESTORE_VALUE_LIMIT);
}

const whole = (digits: string | undefined): number | undefined => {
  const value = Number(digits);
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
};

/**
 * The database's reason for leaving one entry in the file, as a name.
 *
 * The order matters only where one sentence contains another's words; none of
 * these do. A reason nobody recognises, and the text of any error an insert
 * raised (`sqlerrm`), is `other`.
 */
export function restoreReasonOf(reason: unknown): RestoreReason {
  if (typeof reason !== 'string') return { why: 'other' };

  if (/the name in the file is blank/iu.test(reason)) return { why: 'name_blank' };

  const nameLong = /the name in the file is longer than (\d+) characters/iu.exec(reason);
  if (nameLong) return { why: 'name_long', count: whole(nameLong[1]) };

  const language = /the profile column cannot hold “(.*)”; set it again/isu.exec(reason);
  if (language) return { why: 'language', value: restoreQuoted(language[1] ?? '') };

  const zone = /^“(.*)” is not a time zone this server knows$/isu.exec(reason);
  if (zone) return { why: 'timezone', value: restoreQuoted(zone[1] ?? '') };

  const country = /^“(.*)” is not a two-letter country code$/isu.exec(reason);
  if (country) return { why: 'country', value: restoreQuoted(country[1] ?? '') };

  if (/section of this file is not a list/iu.test(reason)) return { why: 'not_list' };

  const capped = /this file holds (\d+) (?:notes|bookmarks) and only the first (\d+) are read/iu.exec(reason);
  if (capped) return { why: 'capped', held: whole(capped[1]), read: whole(capped[2]) };

  if (/are switched off on this platform/iu.test(reason)) return { why: 'off' };
  if (/this note has no text/iu.test(reason)) return { why: 'note_empty' };

  const noteLong = /this note is longer than the (\d+) characters a note may hold/iu.exec(reason);
  if (noteLong) return { why: 'note_long', count: whole(noteLong[1]) };

  if (/this entry names no lesson/iu.test(reason)) return { why: 'no_lesson' };
  if (/you are not enrolled in a course with a lesson called/iu.test(reason)) return { why: 'not_enrolled' };
  if (/more than one of your courses has a lesson called/iu.test(reason)) return { why: 'ambiguous' };
  if (/already written a different note on this lesson/iu.test(reason)) return { why: 'differs' };
  if (/an active enrolment in this course, and access to this lesson, are required/iu.test(reason)) {
    return { why: 'no_access' };
  }

  return { why: 'other' };
}

// ---------------------------------------------------------------------------
// What a file never puts back
// ---------------------------------------------------------------------------

/**
 * The seven things the page says a file never puts back, by the key each is
 * written under (`restore.cannot<Name>` and `restore.cannot<Name>Note`).
 */
export const RESTORE_NEVER = ['Enrol', 'Cert', 'Money', 'Published', 'People', 'History', 'SignIn'] as const;

export type RestoreNever = (typeof RESTORE_NEVER)[number];

/**
 * The nine things `restore_my_data()` says it left behind (`notRestored`), and
 * the one of the page's seven that says each.
 *
 * The database's list is written in English inside the report and is not
 * shown. This is what keeps the page honest about it: a test reads the nine
 * names out of the migration and fails if one of them has no place here, so a
 * tenth thing the function refuses cannot go unsaid on the page.
 */
export const RESTORE_NEVER_SAID_BY: Record<string, RestoreNever> = {
  Enrolments: 'Enrol',
  Certificates: 'Cert',
  'Orders and refunds': 'Money',
  'Progress, quiz attempts and marks': 'Money',
  'Reviews, discussion posts and assignment submissions': 'Published',
  'Learner profiles, including children': 'People',
  'Roles and staff permissions': 'People',
  'The audit trail and your activity history': 'History',
  'Your sign-in address and password': 'SignIn',
};
