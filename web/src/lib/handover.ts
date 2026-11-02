/**
 * Eighteen: the record becomes theirs, or it is not kept.
 *
 * The platform stores no date of birth, so nothing here can notice a birthday.
 * What it can do is record that somebody said so — the young person on their own
 * login, or the adult who holds the record — and then act: `keep` moves the
 * learner out of the family and makes their account their own; `delete` starts the
 * thirty-day clock that already exists.
 *
 * This module is the words and the call. Two rules the copy follows, because both
 * are places where a screen can turn a statement into a claim:
 *
 * 1. **It says what is being recorded, not what was checked.** "You are stating
 *    that this learner is 18 or older. The platform records the statement."
 * 2. **It says what happens to the work.** Keeping it moves the record, not a copy
 *    of it; not keeping it deletes it thirty days later, with the certificate
 *    exception the children's policy already states.
 */

export type HandoverDecision = 'keep' | 'delete';

export type HandoverOutcome = {
  decision: HandoverDecision;
  requestedAs: 'self' | 'guardian';
  becameOwnAccount: string | null;
  leftFamily: boolean;
  deletionDue: string | null;
};

export type HandoverResult =
  | { ok: true; outcome: HandoverOutcome }
  | { ok: false; message: string };

/** What the two decisions actually do, in the order a person reads them. */
export const HANDOVER_OPTIONS: readonly {
  value: HandoverDecision;
  label: string;
  effect: string;
}[] = [
  {
    value: 'keep',
    label: 'Keep it, as their own account',
    effect:
      'The record becomes theirs: their progress, hand-ins and certificates stay '
      + 'exactly where they are, their account stops being something a guardian '
      + 'manages, and it leaves the family. This needs an account of their own; if '
      + 'they have none, make them a login first.',
  },
  {
    value: 'delete',
    label: 'Do not keep it',
    effect:
      'The learning record is deleted thirty days from today — the same clock the '
      + 'children’s policy already describes. A certificate already issued keeps its '
      + 'number and can still be verified, because a certificate somebody may have '
      + 'shown an employer has to keep meaning something.',
  },
];

export const HANDOVER_DECLARATION =
  'I confirm this learner is 18 or older. The platform records this statement; it '
  + 'does not hold a date of birth to check it against.';

export const HANDOVER_EXPLAINER =
  'The platform never stores a date of birth, so it cannot notice an eighteenth '
  + 'birthday. This is where somebody says so — the learner on their own login, or '
  + 'the adult who has been holding the record.';

const row = (raw: unknown): Record<string, unknown> =>
  (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

export function parseHandoverOutcome(data: unknown): HandoverOutcome | null {
  const r = row(data);
  const decision = text(r.decision);
  const requestedAs = text(r.requestedAs);
  if (decision !== 'keep' && decision !== 'delete') return null;
  if (requestedAs !== 'self' && requestedAs !== 'guardian') return null;
  if (text(r.status) !== 'completed') return null;
  return {
    decision,
    requestedAs,
    becameOwnAccount: text(r.becameOwnAccount) || null,
    leftFamily: r.leftFamily === true,
    deletionDue: text(r.deletionDue) || null,
  };
}

/** What just happened, said in the past tense and without a claim of verification. */
export function describeOutcome(outcome: HandoverOutcome): string {
  if (outcome.decision === 'keep') {
    return outcome.leftFamily
      ? 'The record is theirs. It has left the family account, and the account it lives in is their own.'
      : 'The record is theirs. The account it lives in is their own.';
  }
  return outcome.deletionDue
    ? `The record will be deleted on ${outcome.deletionDue}. Until then nothing changes, and the decision is on file.`
    : 'The record will be deleted thirty days from today. Until then nothing changes.';
}

/** What the form says before anybody presses anything. */
export function confirmSentence(decision: HandoverDecision, name: string): string {
  return decision === 'keep'
    ? `${name} becomes an adult learner on this platform. This cannot be undone by the platform; the guardian's access ends.`
    : `${name}'s learning record will be deleted thirty days from today. A certificate already issued still verifies.`;
}

export function describeHandoverError(message: string): string {
  if (/declaration_required/.test(message)) {
    return 'The statement is the whole record: tick the box confirming this learner is 18 or older.';
  }
  if (/needs_an_account/.test(message)) {
    return 'This record can only become their own account once they have one. Make them a login first, then hand it over.';
  }
  if (/not_a_child/.test(message)) {
    return 'That learner already holds their own record; there is nothing to hand over.';
  }
  if (/not_allowed/.test(message)) {
    return 'Only the learner, or an adult in their family, can hand a record over.';
  }
  if (/not_active/.test(message)) {
    return 'That record is already on its way out.';
  }
  if (/already_requested/.test(message)) {
    return 'There is already a request on this record that has not been acted on.';
  }
  if (/family plan/.test(message)) {
    return 'This learning holds a seat on a family plan, so it cannot leave the family until that seat is released.';
  }
  return 'That did not go through. Reload the page and try again — nothing was changed.';
}

export async function requestHandover(input: {
  learnerId: string;
  decision: HandoverDecision;
  declaresAdult: boolean;
}): Promise<HandoverResult> {
  try {
    const res = await fetch('/api/handover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      outcome?: unknown;
      error?: string;
    };
    if (res.ok && json.ok) {
      const outcome = parseHandoverOutcome(json.outcome);
      if (outcome) return { ok: true, outcome };
      return {
        ok: false,
        message: 'The handover came back in a shape this page will not trust. Nothing is shown as done.',
      };
    }
    return { ok: false, message: describeHandoverError(String(json.error ?? '')) };
  } catch {
    return { ok: false, message: 'The request did not reach the server. Nothing was changed.' };
  }
}
