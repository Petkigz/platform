/**
 * A certificate number, as a person types it.
 *
 * `certificates.certificate_number` is generated as `AS-2026-00000001` and
 * `verify_certificate()` compares it as exact text. That is correct for the
 * database and wrong for the human being asked to type it: an employer reading
 * a printed certificate has the number with a line break in the middle, a
 * phone keyboard that capitalised nothing, a PDF that substituted en dashes for
 * hyphens, or — most likely of all — the address bar of the link they clicked,
 * pasted whole.
 *
 * This module turns any of those into the one string the database stores, or
 * refuses. It is deliberately forgiving about *formatting* and strict about
 * *content*: a lookup that lands on the wrong certificate would be far worse
 * than one that asks the person to try again, so every transformation here is
 * lossless with respect to which number is meant.
 */

/** The only shape the database ever stores. */
export const CERTIFICATE_NUMBER_RE = /^AS-\d{4}-\d{8}$/;

/** Long enough for a pasted URL, short enough not to chew on nonsense. */
const MAX_INPUT = 200;

/** Typographic dashes a PDF or a phone keyboard substitutes for a hyphen. */
const DASHES = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;

/** Everything that is not a letter or a digit goes: spaces, dashes, dots. */
const SEPARATORS = /[^A-Z0-9]/g;

/**
 * The canonical number, or null when the input cannot be one.
 *
 * Accepted: the number itself, either case, with or without the separators;
 * and a URL that ends in the number (the usual way somebody arrives with one).
 */
export function normaliseCertificateNumber(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  let text = input.trim();
  if (text.length === 0 || text.length > MAX_INPUT) return null;

  // A pasted address: drop the query and fragment, then keep the last segment.
  if (text.includes('/')) {
    text = text.split('#')[0]!.split('?')[0]!;
    const parts = text.split('/').filter((p) => p.length > 0);
    text = parts[parts.length - 1] ?? '';
  }

  text = text.replace(DASHES, '-').toUpperCase();

  // Now accept either the canonical form or a run of bare characters, which is
  // what survives a copy from a PDF ("AS 2026 00000001", "AS202600000001").
  if (CERTIFICATE_NUMBER_RE.test(text)) return text;

  const bare = text.replace(SEPARATORS, '');
  const match = /^AS(\d{4})(\d{8})$/.exec(bare);
  if (!match) return null;

  return `AS-${match[1]}-${match[2]}`;
}

/** A typed number is shareable as a link once it is canonical. */
export function certificateVerifyPath(number: string): string {
  return `/verify/${encodeURIComponent(number)}`;
}

/**
 * What to tell somebody whose paste did not parse.
 *
 * It quotes the shape rather than returning a code, because the person reading
 * it is holding a piece of paper, not a session.
 */
export function numberProblem(input: unknown): string | null {
  if (normaliseCertificateNumber(input) !== null) return null;
  if (typeof input !== 'string' || input.trim().length === 0) {
    return 'Enter the certificate number to check it.';
  }
  return 'That does not look like a certificate number. They look like AS-2026-00000001 — 3 letters, the year, then eight digits.';
}
