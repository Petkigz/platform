/**
 * Whether a failed read is a failure, or only a wrong address.
 *
 * A page that looks a row up by an id from its address gets an error, not an
 * empty answer, when that id is not an id at all: PostgreSQL refuses to
 * compare a `uuid` column with `abc` (`22P02`). That is a wrong address and
 * the page's "not found". Every other error is a read that did not happen,
 * and a page must not say "not found", "none" or "not yours" about something
 * it did not read: it throws, and the reader gets the site's error page.
 */
export function isWrongAddress(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === '22P02';
}

/** Throw unless the read worked or only the address was wrong. */
export function throwUnlessWrongAddress(error: { code?: string | null; message?: string } | null | undefined): void {
  if (error && !isWrongAddress(error)) throw new Error(error.message ?? 'the read failed');
}
