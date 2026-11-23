/**
 * What sending an application to teach, or taking one back, was answered
 * with, as names; and what the form may send at all.
 *
 * The form on `/teach/apply` printed the route's English sentence for every
 * reader, and the route answered every refusal at 400. Now
 * `/api/teaching/apply` answers `submit` and `withdraw` with a name and that
 * name's own status, and the page has a sentence for each name in the
 * reader's language.
 *
 * **Only sending and taking back.** The same route also serves `decide`,
 * which the staff desk calls in English and whose answers are unchanged.
 *
 * **What was typed is checked here before the database is asked**, by the
 * same four rules the table holds (`teaching_applications`): the form and the
 * route both call `applicationFaultOf`, so a reader is told which box is
 * wrong rather than "that did not send". The table has no upper limit on the
 * qualifications; 4,000 is the form's own.
 *
 * Kept free of queries and of the catalogue, so the form in the browser can
 * import it.
 */

export const APPLY_OUTCOMES = [
  'not_signed_in',
  'headline_short',
  'headline_long',
  'qualifications_short',
  'qualifications_long',
  'sample_not_link',
  'note_long',
  'applications_closed',
  'already_teaching',
  'already_applied',
  'nothing_to_withdraw',
  'refused',
  'unconfirmed',
] as const;
export type ApplyOutcome = (typeof APPLY_OUTCOMES)[number];

/** The names for what was typed. Each belongs to one box of the form. */
export type ApplyFault = Extract<
  ApplyOutcome,
  'headline_short' | 'headline_long' | 'qualifications_short' | 'qualifications_long' | 'sample_not_link' | 'note_long'
>;

export function applyStatusOf(reason: ApplyOutcome): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'headline_short':
    case 'headline_long':
    case 'qualifications_short':
    case 'qualifications_long':
    case 'sample_not_link':
    case 'note_long': return 400;
    case 'applications_closed': return 403;
    case 'already_teaching':
    case 'already_applied':
    case 'nothing_to_withdraw': return 409;
    case 'refused': return 500;
    case 'unconfirmed': return 502;
  }
}

/** `check (length(btrim(headline)) between 4 and 160)`. */
export const HEADLINE_MIN = 4;
export const HEADLINE_MAX = 160;
/** `check (length(btrim(qualifications)) >= 20)`; the upper limit is the form's. */
export const QUALIFICATIONS_MIN = 20;
export const QUALIFICATIONS_MAX = 4000;
/** `check (sample_url ~* '^https?://[^\s]+$' and length(sample_url) <= 500)`. */
export const SAMPLE_MAX = 500;
/** `check (note is null or length(note) <= 1000)`. */
export const NOTE_MAX = 1000;

export type ApplicationFields = {
  headline: string;
  qualifications: string;
  sampleUrl: string;
  /** Nothing typed is null, which is what the table stores. */
  note: string | null;
};

/** PostgreSQL's `length()` counts characters, not the units JavaScript's `.length` does. */
const characters = (value: string): number => [...value].length;

/**
 * What was typed, as it would be stored: trimmed, and an empty note as null.
 * Anything that is not text is read as nothing typed.
 */
export function applicationOf(input: {
  headline?: unknown;
  qualifications?: unknown;
  sampleUrl?: unknown;
  note?: unknown;
}): ApplicationFields {
  const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
  const note = text(input.note);
  return {
    headline: text(input.headline),
    qualifications: text(input.qualifications),
    sampleUrl: text(input.sampleUrl),
    note: note === '' ? null : note,
  };
}

/**
 * Whether the page would draw this as a link. The table accepts anything
 * that starts with `http://` or `https://` and has no space in it; an address
 * no browser can parse would be stored and then shown to nobody.
 */
function opens(value: string): boolean {
  if (!/^https?:\/\/\S+$/iu.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname !== '';
  } catch {
    return false;
  }
}

/** The first thing wrong with what was typed, in the order of the form, or null. */
export function applicationFaultOf(fields: ApplicationFields): ApplyFault | null {
  const headline = characters(fields.headline);
  if (headline < HEADLINE_MIN) return 'headline_short';
  if (headline > HEADLINE_MAX) return 'headline_long';
  const qualifications = characters(fields.qualifications);
  if (qualifications < QUALIFICATIONS_MIN) return 'qualifications_short';
  if (qualifications > QUALIFICATIONS_MAX) return 'qualifications_long';
  if (characters(fields.sampleUrl) > SAMPLE_MAX || !opens(fields.sampleUrl)) return 'sample_not_link';
  if (fields.note !== null && characters(fields.note) > NOTE_MAX) return 'note_long';
  return null;
}

/** The box of the form a fault belongs to. */
export function faultFieldOf(fault: ApplyFault): 'headline' | 'qualifications' | 'sample' | 'note' {
  switch (fault) {
    case 'headline_short':
    case 'headline_long': return 'headline';
    case 'qualifications_short':
    case 'qualifications_long': return 'qualifications';
    case 'sample_not_link': return 'sample';
    case 'note_long': return 'note';
  }
}

/** What `submit_teaching_application()` and `withdraw_teaching_application()` raise, and the name for each. */
const RAISED: Readonly<Record<string, ApplyOutcome>> = {
  'teaching:not_signed_in': 'not_signed_in',
  'teaching:applications_closed': 'applications_closed',
  'teaching:already_teaching': 'already_teaching',
  'teaching:already_applied': 'already_applied',
  'teaching:nothing_to_withdraw': 'nothing_to_withdraw',
};

/**
 * The index that lets an account hold one open application. Two requests at
 * the same instant both pass the function's own look, and the second is
 * stopped here with the database's sentence rather than the function's.
 */
export const ONE_OPEN_INDEX = 'teaching_applications_one_open';

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * The reason behind a database error from sending or taking back.
 *
 * A five-character SQLSTATE outside class 08 is the database's answer, and
 * whatever was being written was rolled back with it. Anything else is not
 * an answer, and the application may have been written.
 */
export function applyReasonOf(error: DatabaseError): ApplyOutcome {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unconfirmed';
  const said = (error.message ?? '').trim();
  if (Object.hasOwn(RAISED, said)) return RAISED[said]!;
  if (state === '23505' && said.includes(`"${ONE_OPEN_INDEX}"`)) return 'already_applied';
  return 'refused';
}

/**
 * What the form says about a reply that was not a success: a reason it
 * knows, arriving with that reason's own status, or `unconfirmed`.
 */
export function applyOutcomeOf(status: number, reason: unknown): ApplyOutcome {
  const known = typeof reason === 'string' && (APPLY_OUTCOMES as readonly string[]).includes(reason);
  if (!known || applyStatusOf(reason as ApplyOutcome) !== status) return 'unconfirmed';
  return reason as ApplyOutcome;
}

/** The English the route sends beside each reason, for a caller with no words of its own. */
export const APPLY_ENGLISH: Record<ApplyOutcome, string> = {
  not_signed_in: 'Sign in first.',
  headline_short: 'Say what you would teach, in a few words.',
  headline_long: 'Keep what you would teach to one line.',
  qualifications_short: 'Write a sentence or two about what you know and who you learned it from.',
  qualifications_long: 'What you know is longer than this form takes. Shorten it.',
  sample_not_link: 'The sample lesson has to be a link that opens, with no spaces in it.',
  note_long: 'The last box is longer than this form takes. Shorten it.',
  applications_closed: 'Applications to teach are closed at the moment. Nothing was sent.',
  already_teaching: 'You already teach here. There is nothing to apply for.',
  already_applied: 'You already have an application with the owner. Wait for the answer.',
  nothing_to_withdraw: 'There is no open application to take back.',
  refused: 'That could not be done. Nothing was changed.',
  unconfirmed: 'We could not confirm that this was done. Open the page again to see.',
};
