/**
 * Corrections to the interface translations, as the screens say them.
 *
 * The interface speaks fifty-one languages and **not one of them has been read
 * by a native speaker**. `/language` prints that, honestly, on every catalogue —
 * and until now there was no way for a person who speaks the language to change
 * it. This module is the vocabulary of the other half: a correction sheet
 * anybody may fill in, and a queue only the owner decides.
 *
 * **The code is the truth, and this module never pretends otherwise.** The
 * translations live in the repository as TypeScript, not in a table. So a
 * proposal is not applied by being accepted; it is applied by reaching the
 * catalogue file, and the console says which of those has happened by comparing
 * the text it stored against the catalogue that is actually built:
 *
 *   `pending`   the line in the code is still what they corrected
 *   `applied`   the code now says what they proposed
 *   `stale`     the code says something else entirely — somebody edited it first
 *
 * That comparison is the reason `current_text` is stored with every proposal. A
 * queue that could not tell an applied correction from an ignored one would be
 * a queue nobody could trust to be empty.
 *
 * Nothing here reads the database. The queries live on the pages; this file
 * turns rows into sentences and sentences into code, and is pure so it can be
 * tested without a network.
 */

import { en, type MessageKey } from './i18n/messages/en.ts';

export type Decision = 'proposed' | 'accepted' | 'rejected';

/**
 * Whether a correction has reached the code.
 *
 * `stale` is not an error: it means somebody improved the line first, which is
 * the outcome everyone wanted. It matters because the alternative — showing an
 * old proposal as "still pending" forever — is a queue that quietly never
 * empties.
 */
export type ProposalState = 'pending' | 'applied' | 'stale' | 'unknown';

export type Proposal = {
  id: string;
  messageKey: string;
  currentText: string;
  proposedText: string;
  reason: string | null;
  status: Decision;
  decidedAt: string | null;
};

export type Review = {
  id: string;
  locale: string;
  reviewerName: string;
  /** `null` for everybody but the owner — the column is granted to them alone. */
  reviewerEmail: string | null;
  scope: 'whole' | 'part';
  note: string | null;
  status: 'submitted' | 'published' | 'declined';
  createdAt: string;
  decidedAt: string | null;
  declineReason: string | null;
  proposals: Proposal[];
};

/** What the built catalogue says for one key, or `undefined` if it says nothing. */
export type LiveCatalogue = (locale: string, key: string) => string | undefined;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function plain(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * The queue as the database returns it.
 *
 * Written as a parser rather than a cast because these rows cross a boundary
 * where nothing is typed: a `reviewer_email` that arrived as `undefined` must be
 * `null` and never the string `"undefined"` printed into a heading.
 */
export function parseQueue(raw: unknown): Review[] {
  const reviews = (raw as { reviews?: unknown } | null)?.reviews;
  if (!Array.isArray(reviews)) return [];

  return reviews.map((row) => {
    const r = row as Record<string, unknown>;
    const proposals = Array.isArray(r.proposals) ? r.proposals : [];
    return {
      id: plain(r.id),
      locale: plain(r.locale),
      reviewerName: plain(r.reviewer_name ?? (r as Record<string, unknown>).reviewerName),
      reviewerEmail: text(r.reviewer_email ?? (r as Record<string, unknown>).reviewerEmail),
      scope: r.scope === 'whole' ? 'whole' : 'part',
      note: text(r.note),
      status:
        r.status === 'published' || r.status === 'declined' ? r.status : 'submitted',
      createdAt: plain(r.created_at ?? r.createdAt),
      decidedAt: text(r.decided_at ?? r.decidedAt),
      declineReason: text(r.decline_reason ?? r.declineReason),
      proposals: proposals.map((p) => {
        const q = p as Record<string, unknown>;
        const status = q.status === 'accepted' || q.status === 'rejected'
          ? q.status
          : 'proposed';
        return {
          id: plain(q.id),
          messageKey: plain(q.messageKey ?? q.message_key),
          currentText: plain(q.currentText ?? q.current_text),
          proposedText: plain(q.proposedText ?? q.proposed_text),
          reason: text(q.reason),
          status,
          decidedAt: text(q.decidedAt ?? q.decided_at),
        };
      }),
    };
  });
}

export function stateIn(
  proposal: Proposal,
  locale: string,
  live: LiveCatalogue,
): ProposalState {
  const current = live(locale, proposal.messageKey);
  if (current === undefined) return 'unknown';
  if (current === proposal.proposedText.trim()) return 'applied';
  if (current === proposal.currentText.trim()) return 'pending';
  return 'stale';
}

/**
 * One line of TypeScript, quoted correctly.
 *
 * The catalogue files are `Record<MessageKey, string>`, so a value containing a
 * single quote — which is ordinary in every language with apostrophes, and in
 * the ones that use ʼ — has to be escaped or the paste is a syntax error. This
 * function is the whole reason the console can hand over a block to paste rather
 * than describing the change in prose.
 */
export function tsLiteral(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `'${escaped}'`;
}

/**
 * The accepted corrections, as lines to paste into a catalogue.
 *
 * In key order rather than decision order, so the block reads like the file it
 * is going into. Only `accepted` rows are included: a rejected correction that
 * crept into the paste would be the worst kind of bug — one the reviewer would
 * find in the language they offered to fix.
 */
export function acceptedBlock(review: Review): string {
  return review.proposals
    .filter((p) => p.status === 'accepted')
    .sort((a, b) => a.messageKey.localeCompare(b.messageKey))
    .map((p) => `    ${tsLiteral(p.messageKey)}: ${tsLiteral(p.proposedText.trim())},`)
    .join('\n');
}

/** The sentence a review's state deserves, in the console's own words. */
export function reviewState(review: Review): string {
  if (review.status === 'published') {
    return `Published — ${review.reviewerName} is named against this language.`;
  }
  if (review.status === 'declined') {
    return `Declined: ${review.declineReason ?? 'no reason recorded'}.`;
  }
  const open = review.proposals.filter((p) => p.status === 'proposed').length;
  if (review.scope === 'part') {
    return `Submitted as a partial read — corrections can be accepted, but it cannot make the language “read”.${open > 0 ? ` ${open} undecided.` : ''}`;
  }
  return open > 0
    ? `Waiting on ${open} correction${open === 1 ? '' : 's'}.`
    : 'Every correction is decided. Ready to publish.';
}

/**
 * The sections of the catalogue, derived from the English key set.
 *
 * Derived rather than listed: a hand-written list of sections is a second
 * register of the keys, and the first string added under a new prefix would be
 * a string no reviewer could reach. `Object.keys(en)` is the single source, and
 * a test walks it to prove every key appears in exactly one section.
 */
export type Section = { prefix: string; label: string; keys: MessageKey[] };

const SECTION_LABELS: Record<string, string> = {
  skip: 'The skip link',
  nav: 'The navigation',
  footer: 'The footer',
  action: 'Buttons',
  region: 'The regions in the language picker',
  language: 'The language page',
  catalogue: 'The course catalogue',
  audience: 'Who a course is for',
  difficulty: 'Course difficulty',
  price: 'Prices',
  card: 'The cards on the shelf',
  auth: 'Signing in and out',
  doors: 'The two doors',
  young: 'The young learners page',
  adults: 'The adults page',
  home: 'The front page',
};

export const SECTIONS: Section[] = (() => {
  const byPrefix = new Map<string, MessageKey[]>();
  for (const key of Object.keys(en) as MessageKey[]) {
    const prefix = key.split('.')[0] ?? key;
    const bucket = byPrefix.get(prefix);
    if (bucket) bucket.push(key);
    else byPrefix.set(prefix, [key]);
  }
  return [...byPrefix.entries()].map(([prefix, keys]) => ({
    prefix,
    label: SECTION_LABELS[prefix] ?? prefix,
    keys,
  }));
})();

export function sectionByPrefix(prefix: string | null | undefined): Section | undefined {
  if (!prefix) return undefined;
  return SECTIONS.find((s) => s.prefix === prefix);
}

/** The English sentence a correction is answering to. */
export function englishFor(key: string): string | undefined {
  return (en as Record<string, string>)[key];
}

/**
 * The review line `/language` prints.
 *
 * A name and a date, not a sentence: the sentence above them — “A
 * first-language speaker has read this translation.” — is already translated
 * into all fifty-one catalogues, and adding a second sentence with the name in
 * it would have meant fifty-one more unreviewed translations to say the same
 * thing. A name and a date are values, like an age band or a page number, and a
 * value needs no translating.
 */
export type PublishedReview = {
  locale: string;
  reviewerName: string;
  scope: 'whole' | 'part';
  publishedAt: string;
};

export function parsePublished(raw: unknown): Map<string, PublishedReview[]> {
  const rows = Array.isArray(raw) ? raw : [];
  const byLocale = new Map<string, PublishedReview[]>();
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const locale = plain(r.locale);
    const reviewerName = plain(r.reviewer_name ?? r.reviewerName).trim();
    const publishedAt = plain(r.published_at ?? r.publishedAt);
    if (!locale || !reviewerName) continue;
    const entry: PublishedReview = {
      locale,
      reviewerName,
      scope: r.scope === 'part' ? 'part' : 'whole',
      publishedAt,
    };
    const bucket = byLocale.get(locale);
    if (bucket) bucket.push(entry);
    else byLocale.set(locale, [entry]);
  }
  return byLocale;
}

/** `2026-11-02` — a date as a value, in the same order everywhere. */
export function dayOf(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}
