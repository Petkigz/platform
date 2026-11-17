import type { CourseworkFileCode } from './coursework.ts';

/**
 * Why the database refused to open an upload for a file, as a word.
 *
 * `register_coursework_upload` and `retry_coursework_upload_target` refuse in
 * English sentences. `/api/media` used to pass the sentence on with a status
 * guessed from a few words in it, and the learner's page, which prints a
 * sentence in the reader's language for a code, had no code to read. It told
 * the learner only that the upload could not be confirmed.
 *
 * A refusal here is known, not uncertain: the function raised, so its
 * transaction was rolled back and nothing was registered. That is why these
 * are answered 4xx with a code, and why the page may say "this cannot be
 * done" rather than "check before sending again".
 *
 * The sentences are matched as written in migrations `20261281006000` and
 * `20261281116000`. `coursework-refusal.test.ts` reads those two files and
 * fails when either function raises a sentence this does not know, so a
 * reworded migration is noticed rather than falling silently to the last
 * line.
 *
 * What is not given a code: a missing type, size or checksum and a name over
 * two hundred characters. The page's own code never sends those. They stay
 * 400 with the sentence and no code, and the page reads that as "not known".
 */
export type CourseworkRefusal = { code: CourseworkFileCode | null; status: number };

const REFUSALS: ReadonlyArray<readonly [RegExp, CourseworkFileCode, number]> = [
  [/^sign in to /i, 'not_signed_in', 401],
  [/responsible for|not available to you|only the uploader|verified guardian/i, 'not_allowed', 403],
  [/not found/i, 'not_found', 404],
  [/can only be (?:attached|sent) to an open draft/i, 'not_draft', 409],
  [/no longer pending/i, 'list_changed', 409],
  [/at most \d+ files|maximum number of attached files/i, 'too_many', 409],
  [/cannot exceed \d+ MiB/i, 'too_big', 413],
  [/file type is not supported/i, 'wrong_kind', 415],
  [/choose the same file/i, 'different_file', 409],
  [/a file needs a name/i, 'no_name', 400],
];

export function mapCourseworkUploadError(message: string): CourseworkRefusal {
  for (const [pattern, code, status] of REFUSALS) {
    if (pattern.test(message)) return { code, status };
  }
  return { code: null, status: 400 };
}
