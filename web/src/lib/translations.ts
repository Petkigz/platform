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

/**
 * How much of a catalogue a review covers.
 *
 * `whole` is the whole interface in one sitting. `section` is one part of it —
 * the navigation, the sign-in screen — read properly, which is the unit a person
 * can actually finish on a Saturday. `part` is the honest catch-all for "I fixed
 * the lines that were wrong and I am not claiming anything else"; it is recorded,
 * its corrections can be accepted, and it never counts as a read.
 *
 * The distinction is the whole reason this file exists: `section` made the
 * coverage number reachable, and `part` is what keeps it true.
 */
export type Scope = 'whole' | 'section' | 'part';

export type Review = {
  id: string;
  locale: string;
  reviewerName: string;
  /** `null` for everybody but the owner — the column is granted to them alone. */
  reviewerEmail: string | null;
  scope: Scope;
  /** The key prefix this review covers, when it covers one. */
  section: string | null;
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

function scopeIn(value: unknown): Scope {
  return value === 'whole' ? 'whole' : value === 'section' ? 'section' : 'part';
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
      scope: scopeIn(r.scope),
      section: text(r.section),
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
/**
 * The accepted corrections as the payload `npm run i18n:apply` takes.
 *
 * This is the shape the last step of the flow actually uses. The paste block
 * below is kept for the case where somebody would rather edit the file by hand —
 * it is still correct TypeScript — but the script is what checks the
 * placeholders, refuses a line the catalogue has moved past, and writes the file
 * with the escaping already done. Asking a person to do that by eye, in a
 * language they do not read, was the step most likely to break.
 *
 * `from` travels with every correction on purpose: the script compares it
 * against the catalogue and refuses a correction the file has moved past, which
 * is the difference between applying a review and overwriting somebody's later
 * fix.
 */
export function acceptedPayload(review: Review): string {
  return JSON.stringify(
    {
      locale: review.locale,
      reviewer: review.reviewerName.trim(),
      corrections: review.proposals
        .filter((proposal) => proposal.status === 'accepted')
        .sort((a, b) => a.messageKey.localeCompare(b.messageKey))
        .map((proposal) => ({
          key: proposal.messageKey,
          from: proposal.currentText,
          to: proposal.proposedText.trim(),
        })),
    },
    null,
    2,
  );
}

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
  if (review.scope === 'section') {
    const part = sectionName(review.section);
    return open > 0
      ? `Reads ${part} — waiting on ${open} correction${open === 1 ? '' : 's'}.`
      : `Reads ${part}, and every correction is decided. Ready to publish; it counts as that part read.`;
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

/**
 * The part the sheet opens on when nobody has chosen one.
 *
 * Not `SECTIONS[0]`, which happens to be the skip link: a reviewer's first sight
 * of the correction sheet would be one line they have probably never noticed on a
 * page, and *is this it?* is the wrong first question. The navigation is the row
 * of words every reader has looked at, and it is ten lines — enough to be worth
 * doing, small enough to finish in ten minutes.
 *
 * If `nav` ever disappears from the English catalogue this falls back to the
 * largest section rather than throwing: a sheet that opens on nothing is worse
 * than one that opens on the wrong part.
 */
export function defaultSection(): Section {
  return (
    sectionByPrefix('nav') ??
    SECTIONS.reduce(
      (biggest, section) => (section.keys.length > biggest.keys.length ? section : biggest),
      SECTIONS[0]!,
    )
  );
}

/** The English sentence a correction is answering to. */
export function englishFor(key: string): string | undefined {
  return (en as Record<string, string>)[key];
}

/**
 * `The navigation` → `the navigation`, for a sentence that begins mid-line.
 *
 * The labels are written to stand alone in a list, so they start with a capital;
 * a sentence that says “Reads The navigation” reads like a title dropped into a
 * sentence. Unknown prefixes are returned as they are: a part the page does not
 * know is a part the database should not have, and printing it is more honest
 * than printing nothing.
 */
export function sectionName(prefix: string | null | undefined): string {
  if (!prefix) return 'the whole catalogue';
  const label = sectionByPrefix(prefix)?.label ?? prefix;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/**
 * How much of a catalogue has been read, added up from published reviews.
 *
 * The sentence on `/language` is a claim about the **whole** translation, so it
 * is only made when every part has a published read, or when one person has
 * published a whole-catalogue read. Nothing here trusts a count stored anywhere:
 * the parts are derived from the same section list the correction sheet offers,
 * so a part can only be counted if a reviewer could have been shown it.
 *
 * A published read of a part the page no longer has is ignored rather than
 * counted — it covers keys nobody can see, and counting it would let the claim
 * appear with a hole behind it.
 */
export type PartCoverage = {
  /** True when one published review covered the whole catalogue. */
  whole: boolean;
  /** The prefixes a published review covered. */
  parts: string[];
  /** The parts still with nobody's name against them. */
  missing: Section[];
  read: number;
  total: number;
  /** Whether “a first-language speaker has read this” is a claim the parts support. */
  complete: boolean;
};

export function coverageOfReviews(reviews: PublishedReview[]): PartCoverage {
  const total = SECTIONS.length;
  const whole = reviews.some((review) => review.scope === 'whole');
  const parts = [
    ...new Set(
      reviews
        .filter((review) => review.scope === 'section' && review.section)
        .map((review) => review.section as string)
        .filter((prefix) => sectionByPrefix(prefix) !== undefined),
    ),
  ];
  const missing = whole ? [] : SECTIONS.filter((section) => !parts.includes(section.prefix));
  return {
    whole,
    parts,
    missing,
    read: whole ? total : total - missing.length,
    total,
    complete: whole || missing.length === 0,
  };
}

/**
 * What `/language` is allowed to say about one language, as a fact.
 *
 * A three-way answer rather than a boolean, because there are three true
 * sentences and rounding between them is how a page lies without noticing:
 * *nobody has read this* over three named parts, or *a first-language speaker has
 * read this* over a catalogue with thirteen parts left. The page prints one of
 * them; this decides which.
 *
 * It lives here, and not inline in the page, so the end-to-end test can assert
 * the claim itself rather than a regular expression over the page's source.
 */
export type Claim =
  | { kind: 'reviewed' }
  | { kind: 'partial'; read: number; total: number }
  | { kind: 'unreviewed' };

export function claimFor(
  reviewers: PublishedReview[],
  registerReviewed = false,
): Claim {
  const parts = coverageOfReviews(reviewers);
  // The register's own `reviewed: true` is the older way a language is called
  // read, and it is true for English alone. It still wins: a decision recorded by
  // hand in `locales.ts` is not overturned by there being no database row.
  if (parts.complete || registerReviewed) return { kind: 'reviewed' };
  if (parts.read > 0) return { kind: 'partial', read: parts.read, total: parts.total };
  return { kind: 'unreviewed' };
}

/**
 * Every language, against every part: what is done and what to ask for next.
 *
 * The per-card line on the console says how near *one* language is. This says it
 * for all of them at once, which is a different question and the one that
 * decides what the owner does on Monday morning: **which single read would move a
 * language to done**, and which part nobody anywhere has read.
 *
 * Two lists, because "0 of 16" fifty times is a wall and not information:
 *
 *   * `progressed` — a language with at least one part read, closest to done
 *     first, each carrying the part to ask for next and a link to that part;
 *   * `untouched` — a count, because a language nobody has started on needs the
 *     same thing as every other language nobody has started on.
 *
 * The order is by parts read, then by locale, so it is stable between loads: an
 * owner coming back to the page sees the same list in the same order and can
 * pick up where they left off.
 */
export type ClaimRow = {
  locale: string;
  claim: Claim;
  read: number;
  total: number;
  /** The parts with nobody's name against them, in catalogue order. */
  missing: Section[];
  /** The part to ask for next, or `undefined` when nothing is left. */
  next: Section | undefined;
  /** The names already published against this language, without repeats. */
  names: string[];
};

export type PartRow = {
  section: Section;
  /** How many languages have a published read of this part. */
  languages: number;
};

export type ClaimBoard = {
  progressed: ClaimRow[];
  /** Languages with no published read of any part. */
  untouched: number;
  /** Languages considered at all — every one with a catalogue. */
  total: number;
  byPart: PartRow[];
};

export function claimBoard(
  published: Map<string, PublishedReview[]>,
  locales: readonly string[],
): ClaimBoard {
  const progressed: ClaimRow[] = [];
  let untouched = 0;

  for (const locale of locales) {
    const reviews = published.get(locale) ?? [];
    const coverage = coverageOfReviews(reviews);
    const claim = claimFor(reviews);
    if (claim.kind === 'unreviewed') {
      untouched += 1;
      continue;
    }
    progressed.push({
      locale,
      claim,
      read: coverage.read,
      total: coverage.total,
      missing: coverage.missing,
      next: coverage.missing[0],
      names: [...new Set(reviews.map((review) => review.reviewerName.trim()).filter(Boolean))],
    });
  }

  progressed.sort((a, b) => b.read - a.read || a.locale.localeCompare(b.locale));

  const byPart: PartRow[] = SECTIONS.map((section) => {
    let languages = 0;
    for (const locale of locales) {
      const reviews = published.get(locale) ?? [];
      const covered =
        reviews.some((review) => review.scope === 'whole') ||
        reviews.some(
          (review) => review.scope === 'section' && review.section === section.prefix,
        );
      if (covered) languages += 1;
    }
    return { section, languages };
  });

  return { progressed, untouched, total: locales.length, byPart };
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
  scope: Scope;
  /** The part this read covered, or `null` for a whole-catalogue read. */
  section: string | null;
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
      scope: scopeIn(r.scope),
      section: text(r.section),
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
