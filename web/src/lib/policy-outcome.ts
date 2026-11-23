/**
 * What asking to agree to a policy was answered with, as names.
 *
 * The button on a policy's page called `accept_policy()` straight from the
 * browser and printed what came back: one of three English sentences it
 * recognised, and otherwise the database's own text, for every reader. There
 * was no route. Now `/api/policies` asks, and answers with a name; the page
 * has a sentence for each name in the reader's language.
 *
 * **`changed` is this route's, not the database's.** `accept_policy()` takes
 * a slug and agrees to whatever version is live at that instant. That is
 * right for a version id nobody can forge, and wrong for a page left open:
 * the owner publishes version 4 while somebody is reading version 3, they
 * press the button, and an agreement to a text they were never shown is
 * recorded with their name on it. The request now carries the version the
 * page showed, the route reads the live one first, and a different number is
 * `changed`: nothing is recorded, and the page is read again.
 *
 * Kept free of queries and of the catalogue, so the button in the browser
 * can import it.
 */

export const POLICY_OUTCOMES = [
  'not_signed_in',
  'malformed',
  'not_found',
  'not_in_force',
  'changed',
  'refused',
  'unconfirmed',
] as const;
export type PolicyOutcome = (typeof POLICY_OUTCOMES)[number];

export function policyStatusOf(reason: PolicyOutcome): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'malformed': return 400;
    case 'not_found': return 404;
    case 'not_in_force':
    case 'changed': return 409;
    case 'refused': return 500;
    case 'unconfirmed': return 502;
  }
}

/** What `accept_policy()` and `my_policy_standing()` raise, and the name for each. */
const RAISED: Readonly<Record<string, PolicyOutcome>> = {
  'policy:not_signed_in': 'not_signed_in',
  'policy:not_found': 'not_found',
  'policy:not_in_force': 'not_in_force',
};

/** The name for one sentence the database raised, or null when it has none. */
export function policySentenceReason(message: string | null | undefined): PolicyOutcome | null {
  const said = (message ?? '').trim();
  return Object.hasOwn(RAISED, said) ? RAISED[said]! : null;
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * The reason behind a database error from `accept_policy()`.
 *
 * A five-character SQLSTATE outside class 08 is the database's answer, and
 * whatever was being written was rolled back with it. Anything else is not
 * an answer, and the agreement may have been recorded.
 */
export function policyReasonOf(error: DatabaseError): PolicyOutcome {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unconfirmed';
  return policySentenceReason(error.message) ?? 'refused';
}

/**
 * What the button says about a reply that was not a success: a reason it
 * knows, arriving with that reason's own status, or `unconfirmed`.
 */
export function policyOutcomeOf(status: number, reason: unknown): PolicyOutcome {
  const known = typeof reason === 'string' && (POLICY_OUTCOMES as readonly string[]).includes(reason);
  if (!known || policyStatusOf(reason as PolicyOutcome) !== status) return 'unconfirmed';
  return reason as PolicyOutcome;
}

/** A slug as `policy_documents` allows one. Anything else names no document. */
export function isPolicySlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/u.test(value);
}

/** A version number as the database numbers them: a whole number from one up. */
export function isPolicyVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1_000_000;
}

/**
 * What `accept_policy()` answered, read without trusting its shape.
 *
 * Null when the reply does not say which version was agreed to and when:
 * the route then says it could not confirm, because it cannot.
 */
export function acceptedOf(data: unknown): { version: number; acceptedAt: string; already: boolean } | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const row = data as Record<string, unknown>;
  if (!isPolicyVersion(row.versionNumber)) return null;
  if (typeof row.acceptedAt !== 'string' || Number.isNaN(Date.parse(row.acceptedAt))) return null;
  return { version: row.versionNumber, acceptedAt: row.acceptedAt, already: row.already === true };
}

/** The English the route sends beside each reason, for a caller with no words of its own. */
export const POLICY_ENGLISH: Record<PolicyOutcome, string> = {
  not_signed_in: 'Sign in first.',
  malformed: 'Malformed request.',
  not_found: 'There is no such document.',
  not_in_force: 'No version of this document is in force, so there is nothing to agree to.',
  changed: 'This document changed after the page was opened. Nothing was recorded.',
  refused: 'Your agreement could not be recorded. Nothing was changed.',
  unconfirmed: 'We could not confirm that your agreement was recorded. Open the page again to see.',
};
