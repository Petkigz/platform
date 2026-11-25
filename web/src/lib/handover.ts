/**
 * Eighteen: the record becomes theirs, or it is not kept.
 *
 * The platform stores no date of birth, so nothing here can notice a birthday.
 * What it can do is record that somebody said so — the young person on their own
 * login, or the adult who holds the record — and then act: `keep` moves the
 * learner out of the family and makes their account their own; `delete` starts the
 * thirty-day clock that already exists.
 *
 * This module is the statement, the call, and how the sentences are put
 * together. The sentences themselves are in the catalogue (`handover.*`, in
 * `messages/handover.ts`), in the reader's language since 2026-11-25; the page
 * hands them to the form as `HandoverWords`, so this file imports no language
 * and a browser may import it.
 *
 * **The statement is the exception.** `HANDOVER_DECLARATION` is what a person
 * ticks, and it has one wording, in English, on every page: the owner's ruling
 * of 2026-11-25 is that a declaration is not translated.
 *
 * Two rules the copy follows, because both are places where a screen can turn
 * a statement into a claim:
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

/**
 * Why a handover was not done, as a name the form has a sentence for.
 *
 * `refused` is a refusal with no better sentence: the request was understood
 * and turned down, and nothing was changed. `unconfirmed` is the other thing:
 * no answer this page can read, so nobody knows, and the sentence for it sends
 * the reader to look at the record before pressing again.
 */
export type HandoverCode =
  | 'declaration_required'
  | 'needs_an_account'
  | 'not_a_child'
  | 'not_allowed'
  | 'not_active'
  | 'already_requested'
  | 'seat_held'
  | 'refused'
  | 'unconfirmed';

export type HandoverResult =
  | { ok: true; outcome: HandoverOutcome }
  | { ok: false; code: HandoverCode };

/** Every sentence the form says, in the reader's language. `{name}` and `{date}` are filled here. */
export type HandoverWords = {
  keep: string;
  keepMeans: string;
  drop: string;
  dropMeans: string;
  keepRefused: string;
  /** Empty on an English page, where the statement needs no explaining. */
  declarationNote: string;
  confirmKeep: string;
  confirmDrop: string;
  working: string;
  doKeep: string;
  doDrop: string;
  doneKeepLeft: string;
  doneKeep: string;
  doneDropOn: string;
  doneDrop: string;
  refusals: Record<HandoverCode, string>;
};

/** Anything that says a key in some language: `translator(code)` is one. */
type Say = (key: HandoverKey) => string;

type HandoverKey =
  | 'handover.keep' | 'handover.keepMeans' | 'handover.drop' | 'handover.dropMeans'
  | 'handover.keepRefused' | 'handover.declNote' | 'handover.confirmKeep'
  | 'handover.confirmDrop' | 'handover.working' | 'handover.doKeep' | 'handover.doDrop'
  | 'handover.doneKeepLeft' | 'handover.doneKeep' | 'handover.doneDropOn'
  | 'handover.doneDrop' | 'handover.errDeclaration' | 'handover.errNeedsAccount'
  | 'handover.errNotChild' | 'handover.errNotAllowed' | 'handover.errNotActive'
  | 'handover.errAlready' | 'handover.errRefused' | 'handover.errUnconfirmed'
  | 'family.seatHeld';

/**
 * The form's sentences, from a translator.
 *
 * The seat sentence is the family page's (`family.seatHeld`): it is the same
 * refusal for the same reason, and one wording of it is enough.
 */
export function handoverWords(t: Say, english: boolean): HandoverWords {
  return {
    keep: t('handover.keep'),
    keepMeans: t('handover.keepMeans'),
    drop: t('handover.drop'),
    dropMeans: t('handover.dropMeans'),
    keepRefused: t('handover.keepRefused'),
    declarationNote: english ? '' : t('handover.declNote'),
    confirmKeep: t('handover.confirmKeep'),
    confirmDrop: t('handover.confirmDrop'),
    working: t('handover.working'),
    doKeep: t('handover.doKeep'),
    doDrop: t('handover.doDrop'),
    doneKeepLeft: t('handover.doneKeepLeft'),
    doneKeep: t('handover.doneKeep'),
    doneDropOn: t('handover.doneDropOn'),
    doneDrop: t('handover.doneDrop'),
    refusals: {
      declaration_required: t('handover.errDeclaration'),
      needs_an_account: t('handover.errNeedsAccount'),
      not_a_child: t('handover.errNotChild'),
      not_allowed: t('handover.errNotAllowed'),
      not_active: t('handover.errNotActive'),
      already_requested: t('handover.errAlready'),
      seat_held: t('family.seatHeld'),
      refused: t('handover.errRefused'),
      unconfirmed: t('handover.errUnconfirmed'),
    },
  };
}

/**
 * The statement a person ticks. English on every page, on purpose: it is the
 * one thing here that is agreed to, and it has one wording.
 */
export const HANDOVER_DECLARATION =
  'I confirm this learner is 18 or older. The platform records this statement; it '
  + 'does not hold a date of birth to check it against.';

const row = (raw: unknown): Record<string, unknown> =>
  (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const put = (sentence: string, name: string, value: string): string =>
  sentence.split(`{${name}}`).join(value);

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

/**
 * What just happened, said in the past tense and without a claim of verification.
 *
 * `day` writes the date the record goes, in the reader's calendar; a date it
 * cannot write is left out and the sentence says "thirty days" instead, which
 * is true of every deletion this makes.
 */
export function describeOutcome(
  outcome: HandoverOutcome,
  words: HandoverWords,
  day: (value: string) => string,
): string {
  if (outcome.decision === 'keep') return outcome.leftFamily ? words.doneKeepLeft : words.doneKeep;
  const date = outcome.deletionDue ? day(outcome.deletionDue) : '';
  return date ? put(words.doneDropOn, 'date', date) : words.doneDrop;
}

/** What the form says before anybody presses anything. */
export function confirmSentence(decision: HandoverDecision, name: string, words: HandoverWords): string {
  return put(decision === 'keep' ? words.confirmKeep : words.confirmDrop, 'name', name);
}

/**
 * The reason the database or the route gave, as a name. Used by the route, so
 * that what crosses to the browser is a name and never a sentence in English.
 *
 * A message nobody has a name for is `refused`: the function raised, so the
 * transaction it ran in changed nothing.
 */
export function handoverReasonOf(message: string): Exclude<HandoverCode, 'unconfirmed'> {
  if (/declaration_required/.test(message)) return 'declaration_required';
  if (/needs_an_account/.test(message)) return 'needs_an_account';
  if (/not_a_child/.test(message)) return 'not_a_child';
  if (/not_allowed/.test(message)) return 'not_allowed';
  if (/not_active/.test(message)) return 'not_active';
  if (/already_requested/.test(message)) return 'already_requested';
  if (/family plan/.test(message)) return 'seat_held';
  return 'refused';
}

const NAMED: readonly HandoverCode[] = [
  'declaration_required', 'needs_an_account', 'not_a_child', 'not_allowed',
  'not_active', 'already_requested', 'seat_held', 'refused',
];

/**
 * What the route answered, as the name the form says it by.
 *
 * Only a reply in the four hundreds that names a reason is a refusal. A five
 * hundred, a page from something in front of the site, or a reply with no
 * name is `unconfirmed`: the handover is one transaction and it either
 * happened or it did not, but this page was not told which.
 */
export function handoverCodeOf(status: number, code: unknown): HandoverCode {
  if (status < 400 || status > 499) return 'unconfirmed';
  return typeof code === 'string' && NAMED.includes(code as HandoverCode)
    ? (code as HandoverCode)
    : 'unconfirmed';
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
      code?: unknown;
    };
    if (res.ok && json.ok) {
      const outcome = parseHandoverOutcome(json.outcome);
      // A reply in a shape this page will not trust is not shown as done.
      return outcome ? { ok: true, outcome } : { ok: false, code: 'unconfirmed' };
    }
    return { ok: false, code: handoverCodeOf(res.status, json.code) };
  } catch {
    // The reply was lost; the request may not have been.
    return { ok: false, code: 'unconfirmed' };
  }
}
