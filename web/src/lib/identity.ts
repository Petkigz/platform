/**
 * The account that closed but could still sign in.
 *
 * `/account/delete` has promised, since it was written, that closing an account
 * removes the person. It removes them from this database. It does not remove the
 * sign-in, which lives in `auth.users` at the authentication provider — so a
 * closed account could still sign in, because nothing had been told to stop it.
 *
 * For three units that lived in a paragraph: "it is staff work, it is in
 * `NEXT.md`". A paragraph is not a queue. Nobody knows which identities are
 * outstanding, nobody records the ones they remove, and the question a person
 * actually asks afterwards — *was my account erased?* — had no answer anywhere.
 *
 * `20261281004900` turned the paragraph into three things this module reads:
 *
 * 1. `identity_removal_queue()` — closed accounts whose sign-in is still at the
 *    provider, plus the two states that should not exist (an active account with
 *    no identity; a closed one nobody recorded).
 * 2. `record_identity_removal()` — the staff step, and it refuses to record a
 *    deletion that has not happened. That refusal is the design: "recorded" and
 *    "done" drifting apart is precisely how the gap opened.
 * 3. `identity_lookup()` — the support question, answered from a SHA-256
 *    fingerprint of the address, audited, and never with a name.
 *
 * Two rules the copy follows, and the reason this is a module rather than copy in
 * a component:
 *
 * 1. **A number that is not zero is not a problem on its own.** "12 identities
 *    still at the provider" means nothing until the sentence says what the
 *    provider is, why this database cannot fix it, and what the person was told.
 * 2. **The screen never claims a deletion happened.** Every sentence about a
 *    removal is built from what the database returned, and a press that fails
 *    says why in the database's own words.
 *
 * Pure, so every sentence is testable without a browser or a database.
 */

import { retentionDay } from './retention.ts';

export type IdentityQueueRow = {
  /** The account id. The only handle on a row that has nobody behind it. */
  userId: string;
  closedAt: string | null;
  /** "Deleted account" for anything closed through the product, by design. */
  label: string;
  /** Whether the ledger already holds a row for this account. */
  erased: boolean;
  erasedAt: string | null;
  /** Whether staff have already recorded the identity as deleted. */
  recordedRemoved: boolean;
};

export type IdentityQueue = {
  /** Every closed account, whether or not its identity is still there. */
  closedAccounts: number;
  /** Closed accounts whose `auth.users` row still exists — the work. */
  stillAtProvider: number;
  /** Ledger rows whose identity has been recorded as deleted. */
  removed: number;
  /** Outstanding identities nobody has recorded. Should equal `stillAtProvider`. */
  unrecorded: number;
  /** Active accounts with no identity: they cannot sign in and do not know it. */
  activeWithoutIdentity: number;
  rows: IdentityQueueRow[];
};

export type IdentityLookup = {
  found: boolean;
  erasedAt: string | null;
  identityRemovedAt: string | null;
  /** True while the provider still holds the sign-in for an erased account. */
  stillAtProvider: boolean;
  /** Accounts at the same address today — somebody erased, then came back. */
  activeAccountsAtAddress: number;
  note: string;
};

export type IdentityRemoval = {
  recorded: boolean;
  /** Closed accounts still at the provider after the press. */
  remainingAtProvider: number;
};

export const EMPTY_IDENTITY_QUEUE: IdentityQueue = {
  closedAccounts: 0,
  stillAtProvider: 0,
  removed: 0,
  unrecorded: 0,
  activeWithoutIdentity: 0,
  rows: [],
};

const num = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const str = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/**
 * The queue, parsed defensively.
 *
 * A `jsonb` return is `unknown` to TypeScript and to anybody reading it, and a
 * page that trusted the shape would show `undefined` as a count on the one screen
 * where "0 outstanding" is a claim of compliance. Missing numbers become 0, a
 * missing row list becomes empty, and the headline sentence then says what zero
 * means rather than implying everybody has been erased.
 */
export function parseIdentityQueue(raw: unknown): IdentityQueue {
  const body = object(raw);
  const rows = Array.isArray(body.rows) ? body.rows : [];
  return {
    closedAccounts: num(body.closedAccounts),
    stillAtProvider: num(body.stillAtProvider),
    removed: num(body.removed),
    unrecorded: num(body.unrecorded),
    activeWithoutIdentity: num(body.activeWithoutIdentity),
    rows: rows.map((row): IdentityQueueRow => {
      const r = object(row);
      return {
        userId: typeof r.userId === 'string' ? r.userId : '',
        closedAt: str(r.closedAt),
        label: typeof r.label === 'string' && r.label !== '' ? r.label : 'Deleted account',
        erased: r.erased === true,
        erasedAt: str(r.erasedAt),
        recordedRemoved: r.recordedRemoved === true,
      };
    }),
  };
}

export function parseIdentityLookup(raw: unknown): IdentityLookup {
  const body = object(raw);
  return {
    found: body.found === true,
    erasedAt: str(body.erasedAt),
    identityRemovedAt: str(body.identityRemovedAt),
    stillAtProvider: body.stillAtProvider === true,
    activeAccountsAtAddress: num(body.activeAccountsAtAddress),
    note: typeof body.note === 'string' ? body.note : '',
  };
}

export function parseIdentityRemoval(raw: unknown): IdentityRemoval {
  const body = object(raw);
  return {
    recorded: body.recorded === true,
    remainingAtProvider: num(body.remainingAtProvider),
  };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * The headline for the card.
 *
 * Zero outstanding is stated as a fact about the ledger, not as a claim that
 * nobody ever signed up: the ledger starts on the day it was created, and every
 * account closed before that was backfilled from the address still sitting at the
 * provider. Saying "every erased account has been removed" would be a bigger
 * claim than the data supports.
 */
export function identityQueueHeadline(queue: IdentityQueue): string {
  if (queue.stillAtProvider === 0) {
    return queue.closedAccounts === 0
      ? 'No account has ever been closed, so there is no sign-in left behind.'
      : `${plural(queue.closedAccounts, 'closed account has', 'closed accounts have')} `
        + 'no sign-in left at the provider. Nothing here is waiting for a deletion.';
  }

  return `${plural(queue.stillAtProvider, 'closed account can', 'closed accounts can')} `
    + 'still sign in: the sign-in lives with the authentication provider, and closing '
    + 'an account inside this database cannot reach it. '
    + 'Each one is deleted in Supabase, then recorded here.';
}

/**
 * What one row is, in a line.
 *
 * The date is the day the account closed, because that is when the promise was
 * made and when the queue started. It is not the day anybody intends to act.
 */
export function identityRowSituation(row: IdentityQueueRow): string {
  const closed = retentionDay(row.closedAt);
  const when = closed ? `Closed ${closed}` : 'Closed on a date this database did not record';
  if (row.recordedRemoved) {
    return `${when} · recorded as deleted at the provider`;
  }
  if (row.erased) {
    return `${when} · in the ledger, sign-in still at the provider`;
  }
  return `${when} · not yet in the ledger`;
}

/**
 * Whether the press should be offered.
 *
 * A row already recorded as removed has nothing left to do, and offering the
 * button again would invite a second audit entry for one deletion. Everything
 * else is offered, including the row whose sign-in is still there — pressing it
 * and being told "still at the provider" is the loop working, not failing.
 */
export function canRecordRemoval(row: IdentityQueueRow): boolean {
  return row.userId !== '' && !row.recordedRemoved;
}

/** What the press did, from the database's own numbers. */
export function describeIdentityRemoval(removal: IdentityRemoval): string {
  if (removal.remainingAtProvider === 0) {
    return 'Recorded. No closed account has a sign-in left at the provider.';
  }
  return `Recorded. ${plural(removal.remainingAtProvider, 'closed account still has', 'closed accounts still have')} `
    + 'a sign-in at the provider.';
}

/**
 * The two states the queue reports beside the work.
 *
 * They are separated because they need different actions and one of them is
 * urgent: an *active* account whose identity vanished cannot sign in, cannot be
 * mailed, and will not know either until it tries.
 */
export function identityAttentionLines(queue: IdentityQueue): string[] {
  const lines: string[] = [];
  if (queue.activeWithoutIdentity > 0) {
    lines.push(
      `${plural(queue.activeWithoutIdentity, 'account is', 'accounts are')} active with no `
      + 'identity at all: the profile says the person is here, the provider has never heard of '
      + 'them, and they cannot sign in. This is what a failed delete or a bad merge looks like '
      + 'from the inside.',
    );
  }
  const drift = queue.stillAtProvider - queue.unrecorded;
  if (drift > 0) {
    lines.push(
      `${plural(drift, 'identity is', 'identities are')} recorded as removed while the provider `
      + 'still holds the sign-in. The ledger and the provider disagree, which is the one thing '
      + '`record_identity_removal()` exists to prevent.',
    );
  }
  return lines;
}

/**
 * Answering "I closed my account — is it gone?".
 *
 * The note is the database's, and it is repeated rather than paraphrased because
 * the part that matters is the limit: a miss is not proof the address was never
 * used here, and support staff who read it as proof will tell somebody who erased
 * themselves that they never had an account.
 */
export function identityLookupSentence(lookup: IdentityLookup): string {
  if (!lookup.found) {
    return lookup.note
      || 'No erased account was recorded for this address. That is not proof it was never used here.';
  }

  const parts: string[] = [];
  const erased = retentionDay(lookup.erasedAt);
  parts.push(erased ? `The account was closed on ${erased}.` : 'The account was closed.');

  if (lookup.identityRemovedAt) {
    const removed = retentionDay(lookup.identityRemovedAt);
    parts.push(
      removed
        ? `The sign-in was deleted at the provider on ${removed}.`
        : 'The sign-in was deleted at the provider.',
    );
  } else if (lookup.stillAtProvider) {
    parts.push('The sign-in is still at the provider, so the person can still sign in.');
  }

  if (lookup.activeAccountsAtAddress > 0) {
    parts.push(
      `${plural(lookup.activeAccountsAtAddress, 'account at this address is', 'accounts at this address are')} `
      + 'active today — somebody erased, then came back.',
    );
  }

  return parts.join(' ');
}

/** Why a press failed, in the words the person reading it needs. */
export function identityRefusalSentence(code: string | null | undefined): string {
  switch (code) {
    case 'identity:still_present':
      return 'Supabase still holds this sign-in. Delete it there first (Authentication → Users), '
        + 'then press again — this records the deletion, it does not perform it.';
    case 'identity:already_recorded':
      return 'This deletion is already recorded. Recording it twice would put two entries in the '
        + 'audit trail for one deletion.';
    case 'identity:not_closed':
      return 'That account is still open. An open account still signs in, so closing it comes '
        + 'first — from the account holder’s own page, not from here.';
    case 'identity:no_account':
      return 'There is no account with that id any more.';
    case 'identity:not_allowed':
      return 'Only the platform owner deletes an identity. It cannot be undone.';
    case 'identity:address_required':
      return 'Type the address the person used to sign in.';
    default:
      return 'The database refused the request, and did not say why. Nothing was written.';
  }
}
