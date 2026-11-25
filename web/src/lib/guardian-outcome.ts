/**
 * What `/api/family/guardians` answered, as a name, and the words the two
 * forms on `/family/guardians` are handed.
 *
 * The forms are written in the reader's language since 2026-11-25 and carry
 * no sentences of their own. They used to print the English sentence the
 * route sent; the route now names the reason beside that sentence, and this
 * turns the name into the one the form has words for.
 *
 * The decision that is easy to get wrong is the same as in
 * `family-outcome.ts`: **only a reply in the four hundreds that names a
 * reason this file knows is a refusal.** A reply without a name, a name
 * nobody has heard of, a five hundred, or a page from something in front of
 * the site is `unconfirmed`, and the sentence for that sends the reader to
 * look at what is on record before pressing again.
 *
 * Pure, with no query in it, so a browser may import it.
 */

export type GuardianCode =
  | 'signed_out'
  | 'choose_child'
  | 'statement_short'
  | 'not_in_family'
  | 'not_a_child'
  | 'child_gone'
  | 'method_invalid'
  | 'relationship_invalid'
  | 'already_verified'
  | 'already_waiting'
  | 'reason_short'
  | 'already_revoked'
  | 'gone'
  | 'not_yours'
  | 'refused'
  | 'unconfirmed';

/** The shortest statement and the shortest reason the route and the database accept. */
export const STATEMENT_MIN = 20;
export const REASON_MIN = 10;

export const RELATIONSHIPS = ['parent', 'guardian', 'other'] as const;
export const METHODS = ['video_call', 'id_document', 'in_person', 'signed_declaration'] as const;

export type Relationship = (typeof RELATIONSHIPS)[number];
export type Method = (typeof METHODS)[number];

/** The names the database raises, and the name the forms say each by. */
const RAISED: Record<string, Exclude<GuardianCode, 'unconfirmed'>> = {
  'guardian:not_signed_in': 'signed_out',
  'guardian:not_in_family': 'not_in_family',
  'guardian:not_a_child': 'not_a_child',
  'guardian:child_not_found': 'child_gone',
  'guardian:statement_required': 'statement_short',
  'guardian:method_invalid': 'method_invalid',
  'guardian:relationship_invalid': 'relationship_invalid',
  'guardian:already_verified': 'already_verified',
  'guardian:already_waiting': 'already_waiting',
  'guardian:reason_required': 'reason_short',
  'guardian:already_revoked': 'already_revoked',
  'guardian:not_found': 'gone',
  // Raised on a withdrawal by somebody who is neither the guardian nor a reviewer.
  'guardian:not_allowed': 'not_yours',
};

const NAMES: readonly GuardianCode[] = [
  'signed_out', 'choose_child', 'statement_short', 'not_in_family', 'not_a_child', 'child_gone',
  'method_invalid', 'relationship_invalid', 'already_verified', 'already_waiting', 'reason_short',
  'already_revoked', 'gone', 'not_yours', 'refused',
];

/**
 * A database error, as a name. For the route.
 *
 * A refusal carries a five-character SQLSTATE and was rolled back with it. An
 * error without one, or in class 08 (the connection), is not the database's
 * answer: the request may have been recorded. That is `unconfirmed`.
 */
export function guardianReasonOf(error: { message?: string | null; code?: string | null }): GuardianCode {
  const message = error.message ?? '';
  for (const [raised, name] of Object.entries(RAISED)) {
    if (message.includes(raised)) return name;
  }
  const sqlstate = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(sqlstate) || sqlstate.startsWith('08')) return 'unconfirmed';
  return 'refused';
}

/** The status the route answers a name with. Only `unconfirmed` is not a refusal. */
export function guardianStatusOf(code: GuardianCode): number {
  if (code === 'unconfirmed') return 502;
  if (code === 'signed_out') return 401;
  if (code === 'not_in_family' || code === 'not_yours') return 403;
  if (code === 'child_gone' || code === 'gone') return 404;
  if (
    code === 'choose_child' || code === 'statement_short' || code === 'reason_short'
    || code === 'method_invalid' || code === 'relationship_invalid'
  ) return 400;
  return 409;
}

/** What the route answered, as the name the form says it by. */
export function guardianOutcomeOf(status: number, code: unknown): GuardianCode {
  if (status < 400 || status > 499) return 'unconfirmed';
  return typeof code === 'string' && NAMES.includes(code as GuardianCode)
    ? (code as GuardianCode)
    : 'unconfirmed';
}

export type GuardianRefusals = Record<GuardianCode, string>;

/** Every sentence the form that asks says, in the reader's language. */
export type ConsentFormWords = {
  child: string;
  youAre: string;
  relationships: Record<Relationship, string>;
  how: string;
  methods: Record<Method, { label: string; hint: string }>;
  statement: string;
  statementPlaceholder: string;
  statementHelp: string;
  evidence: string;
  evidencePlaceholder: string;
  evidenceHelp: string;
  sending: string;
  ask: string;
  recorded: string;
  foot: string;
  refusals: GuardianRefusals;
};

/** Every sentence the form that withdraws says, in the reader's language. */
export type ConsentActionWords = {
  open: string;
  effect: string;
  why: string;
  placeholder: string;
  withdrawing: string;
  withdraw: string;
  cancel: string;
  done: string;
  refusals: GuardianRefusals;
};
