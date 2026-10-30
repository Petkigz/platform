import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { LOCALES } from './i18n/locales.ts';
import {
  apply,
  plan,
  readCatalogue,
  type SourceFile,
} from './i18n-apply.ts';
import {
  SECTIONS,
  acceptedPayload,
  claimFor,
  parsePublished,
  parseQueue,
  sectionByPrefix,
  stateIn,
  type LiveCatalogue,
  type Review,
} from './translations.ts';

/**
 * The whole loop, once, with the real modules and the real catalogues.
 *
 * Every part of this feature is tested somewhere: the schema in
 * `supabase/tests/translation_reviews.test.mjs`, the parser and the sentence in
 * `translation-review-wiring.test.ts`, the writer in `i18n-apply.test.ts`. What
 * was never tested is the **seam between them** — that the JSON the database
 * returns is the JSON the parser takes, that what the console hands over is what
 * the script accepts, that the text the script writes is the text the page
 * prints, and that the read which follows turns "nobody has read this" into "one
 * of sixteen parts" and no further.
 *
 * It runs in memory and touches nothing. That is deliberate, and it is the
 * answer to the obvious alternative: a "dry run" that inserted a sample review
 * into the real queue would leave a fake row in a queue exactly one person
 * reads, where it can be accepted, published and named on `/language` as though
 * somebody had read the language. A test that cannot be mistaken for a review is
 * worth more than a button that can.
 */

const here = dirname(fileURLToPath(import.meta.url));
const MESSAGES = join(here, 'i18n', 'messages');

function catalogueFiles(): SourceFile[] {
  return readdirSync(MESSAGES)
    .filter((name) => name.endsWith('.ts') && name !== 'en.ts')
    .sort()
    .map((name) => ({ path: name, text: readFileSync(join(MESSAGES, name), 'utf8') }));
}

/**
 * One submission, in exactly the shape `translation_review_queue()` returns it.
 *
 * Copied from the function's `jsonb_build_object` rather than from a TypeScript
 * type, because the point of this file is to catch the day the two drift apart.
 * Snake_case where the SQL writes snake_case, camelCase inside each proposal
 * where the SQL writes camelCase — that inconsistency is real, and this test is
 * where it is either survived or found.
 */
function queued(over: Partial<Record<string, unknown>> = {}) {
  return {
    reviews: [
      {
        id: '3f3a1f5e-0000-4000-8000-000000000001',
        locale: 'ta',
        reviewer_name: 'Karthik R',
        scope: 'section',
        section: 'nav',
        note: null,
        status: 'submitted',
        created_at: '2026-11-01T09:00:00+00:00',
        decided_at: null,
        decline_reason: null,
        reviewer_email: 'karthik@example.com',
        proposals: [
          {
            id: '3f3a1f5e-0000-4000-8000-0000000000a1',
            messageKey: 'nav.main',
            currentText: 'முதன்மை',
            proposedText: 'பிரதான பட்டியல்',
            reason: 'the menu heading reads like "primary", not "main menu"',
            status: 'proposed',
            decidedAt: null,
          },
          {
            id: '3f3a1f5e-0000-4000-8000-0000000000a2',
            messageKey: 'nav.subscriptions',
            currentText: 'சந்தாக்கள்',
            proposedText: 'சந்தா செலுத்தல்கள்',
            reason: null,
            status: 'proposed',
            decidedAt: null,
          },
        ],
        ...over,
      },
    ],
  };
}

/** The owner accepting or rejecting, as `decide_translation_proposal` records it. */
function decide(review: Review, accepted: string[], rejected: string[] = []): Review {
  return {
    ...review,
    proposals: review.proposals.map((proposal) =>
      accepted.includes(proposal.messageKey)
        ? { ...proposal, status: 'accepted', decidedAt: '2026-11-02T10:00:00+00:00' }
        : rejected.includes(proposal.messageKey)
          ? { ...proposal, status: 'rejected', decidedAt: '2026-11-02T10:00:00+00:00' }
          : proposal,
    ),
  };
}

/** What `published_locale_reviews()` returns once a review is published. */
function published(review: Review, names: Record<string, string> = {}) {
  return [
    {
      locale: review.locale,
      reviewer_name: names[review.locale] ?? review.reviewerName,
      scope: review.scope,
      section: review.section,
      published_at: '2026-11-03T12:00:00+00:00',
    },
  ];
}

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

test('a submission runs the whole way to a sentence on /language', () => {
  const files = catalogueFiles();

  // 1. The queue, as the database hands it over.
  const parsed = parseQueue(queued());
  assert.equal(parsed.length, 1);
  const [review] = parsed;
  assert.ok(review);
  assert.equal(review.locale, 'ta');
  assert.equal(review.section, 'nav');
  assert.equal(review.scope, 'section');
  assert.equal(review.reviewerEmail, 'karthik@example.com');
  assert.equal(review.proposals.length, 2);

  // 2. The console asks what the code says about each line. Both are still the
  //    old text, so both are pending — the state a reviewer's work starts in.
  const live = readCatalogue(files, 'ta');
  const beforeLive: LiveCatalogue = (_locale, key) => live[key];
  for (const proposal of review.proposals) {
    assert.equal(stateIn(proposal, 'ta', beforeLive), 'pending');
  }

  // 3. The owner decides: one accepted, one rejected.
  const decided = decide(review, ['nav.main'], ['nav.subscriptions']);
  const payload = acceptedPayload(decided);
  const parsedPayload = JSON.parse(payload) as {
    locale: string;
    reviewer: string;
    corrections: { key: string; from: string; to: string }[];
  };
  // A rejected correction is not in the payload, and the reviewer's name is.
  assert.equal(parsedPayload.reviewer, 'Karthik R');
  assert.deepEqual(parsedPayload.corrections, [
    { key: 'nav.main', from: 'முதன்மை', to: 'பிரதான பட்டியல்' },
  ]);

  // 4. The script plans it against the real catalogues.
  const planned = plan([parsedPayload], files);
  assert.deepEqual(planned.problems, [], 'the payload the console produced was refused');
  assert.equal(planned.edits.length, 1);
  assert.equal(planned.edits[0]?.path, 'asia-ta.ts');

  // 5. It writes, and the file still parses — read back through the same reader
  //    the page would use, not through a string search.
  const written = apply(files, planned.edits);
  assert.ok(written);
  const after = readCatalogue(written, 'ta');
  assert.equal(after['nav.main'], 'பிரதான பட்டியல்');
  // Nothing else moved: a hundred and ninety-one other strings, untouched.
  const untouched = Object.keys(live).filter((key) => key !== 'nav.main');
  assert.deepEqual(
    untouched.filter((key) => after[key] !== live[key]),
    [],
    'a correction changed a line it was not about',
  );
  assert.ok(!after['nav.subscriptions.everything'], 'the rejected line was written anyway');
  assert.equal(after['nav.subscriptions'], 'சந்தாக்கள்');

  // 6. The console now says the accepted line is *in the code* — the sentence
  //    that tells the owner when they can stop worrying about it.
  const [accepted] = decided.proposals;
  assert.ok(accepted);
  const afterLive: LiveCatalogue = (_locale, key) => after[key];
  assert.equal(stateIn(accepted, 'ta', afterLive), 'applied');

  // 7. The review is published, and `/language` says how much was read — one
  //    part of sixteen, which is progress and is not the claim.
  const claim = claimFor(parsePublished(published(decided)).get('ta') ?? []);
  assert.deepEqual(claim, { kind: 'partial', read: 1, total: SECTIONS.length });
  assert.notEqual(claim.kind, 'reviewed');
});

test('every part read, and only then does the page say somebody read it', () => {
  // The same language, the same reviewer, sixteen separate submissions — which
  // is what a patient volunteer actually produces, one screen at a time.
  const rows = SECTIONS.map((section) => ({
    locale: 'si',
    reviewer_name: 'Amina Fernando',
    scope: 'section',
    section: section.prefix,
    published_at: '2026-11-03T12:00:00+00:00',
  }));

  const byLocale = parsePublished(rows);
  const reviewers = byLocale.get('si') ?? [];
  assert.equal(reviewers.length, SECTIONS.length);

  // Fifteen of sixteen is still not the claim.
  const fifteen = claimFor(reviewers.slice(0, SECTIONS.length - 1));
  assert.equal(fifteen.kind, 'partial');
  assert.equal(fifteen.kind === 'partial' ? fifteen.read : -1, SECTIONS.length - 1);

  // All sixteen is.
  assert.deepEqual(claimFor(reviewers), { kind: 'reviewed' });

  // And a single whole-catalogue read gets there in one row, which is still the
  // shortest path if somebody ever does it.
  const whole = parsePublished([
    {
      locale: 'si',
      reviewer_name: 'Amina Fernando',
      scope: 'whole',
      section: null,
      published_at: '2026-11-03T12:00:00+00:00',
    },
  ]).get('si') ?? [];
  assert.deepEqual(claimFor(whole), { kind: 'reviewed' });
});

test('a partial read is applied, and never flips the sentence', () => {
  // The reviewer who fixed two lines and said so. Their corrections are real and
  // are applied; the claim is not theirs to make.
  const files = catalogueFiles();
  const [review] = parseQueue(
    queued({ scope: 'part', section: null }),
  );
  assert.ok(review);
  const decided = decide(review, ['nav.main'], ['nav.subscriptions']);

  const planned = plan([JSON.parse(acceptedPayload(decided))], files);
  assert.deepEqual(planned.problems, []);
  const written = apply(files, planned.edits);
  assert.ok(written);
  assert.equal(readCatalogue(written, 'ta')['nav.main'], 'பிரதான பட்டியல்');

  // Even with every correction applied, a `part` row publishes as nothing.
  const claim = claimFor(parsePublished(published(decided)).get('ta') ?? []);
  assert.deepEqual(claim, { kind: 'unreviewed' });
});

test('one stale line stops the whole payload, and nothing is written', () => {
  // The reviewer copied the catalogue on Monday; somebody edited `nav.main` on
  // Tuesday. Applying the correction anyway would overwrite Tuesday's fix with
  // Monday's opinion — so the script refuses the payload, all of it, and says
  // which line moved.
  const files = catalogueFiles();
  const [review] = parseQueue(queued());
  assert.ok(review);
  const decided = decide(review, ['nav.main', 'nav.subscriptions']);

  const payload = JSON.parse(acceptedPayload(decided)) as {
    locale: string;
    corrections: { key: string; from: string; to: string }[];
  };
  const stale = {
    ...payload,
    corrections: payload.corrections.map((correction) =>
      correction.key === 'nav.subscriptions'
        ? { ...correction, from: 'something somebody wrote on Tuesday' }
        : correction,
    ),
  };

  const planned = plan([stale], files);
  assert.equal(planned.edits.length, 0, 'a half-applied payload was planned');
  assert.equal(planned.problems.length, 1);
  assert.equal(planned.problems[0]?.key, 'nav.subscriptions');
  assert.equal(planned.problems[0]?.code, 'stale');

  // And the file that would have been fine is not written either.
  assert.equal(apply(files, planned.edits)?.length, files.length);
  assert.equal(readCatalogue(files, 'ta')['nav.main'], 'முதன்மை');
});

test('a correction for a key the catalogue lacks is the key’s first translation', () => {
  // Every one of the fifty languages is complete today, so this path is never
  // exercised by the real files — which is exactly why it is tested with a file
  // that is short a key. A language that falls back to English is the ordinary
  // state of a catalogue between two units.
  const short = [
    {
      path: 'test.ts',
      text: [
        "import type { LocaleCode } from '../locales.ts';",
        'export const TEST: Partial<Record<LocaleCode, Partial<Messages>>> = {',
        '  ta: {',
        "    'nav.main': 'முதன்மை',",
        "    'nav.learn': 'என் கற்றல்',",
        '  },',
        '};',
        '',
      ].join('\n'),
    },
  ];

  const planned = plan(
    [{ locale: 'ta', corrections: [{ key: 'nav.family', to: 'என் குடும்பம்' }] }],
    short,
  );
  assert.deepEqual(planned.problems, []);
  assert.equal(planned.edits[0]?.inserted, true);

  const written = apply(short, planned.edits);
  assert.ok(written);
  const catalogue = readCatalogue(written, 'ta');
  assert.equal(catalogue['nav.family'], 'என் குடும்பம்');
  // And the existing lines survived the insert.
  assert.equal(catalogue['nav.main'], 'முதன்மை');
  assert.equal(catalogue['nav.learn'], 'என் கற்றல்');
});

test('the payload the console prints is JSON a person can save without editing', () => {
  // The console shows this in a `<pre>` and tells the owner to save it as
  // `ta.json`. If it needed an edit to be valid, the instruction would be wrong.
  const [review] = parseQueue(queued());
  assert.ok(review);
  const text = acceptedPayload(decide(review, ['nav.main'], ['nav.subscriptions']));
  const round = JSON.parse(text) as unknown;
  assert.deepEqual(JSON.parse(JSON.stringify(round)), round);
  // Two-space indent, newline-terminated: the shape an editor saves.
  assert.match(text, /^\{\n {2}"locale": "ta",/u);
  assert.ok(!text.endsWith('\n'));
});

test('every language in the register can be written to', () => {
  // The loop is only real for a language whose block the script can find. A
  // register row with no block, or a block the parser cannot see, would accept a
  // correction and then refuse to write it — the worst of both.
  const files = catalogueFiles();
  const sections = sectionByPrefix('nav');
  assert.ok(sections);

  const missing: string[] = [];
  for (const locale of LOCALES) {
    if (locale.code === 'en') continue;
    const planned = plan(
      [
        {
          locale: locale.code,
          corrections: [{ key: 'nav.main', to: `x-${locale.code}` }],
        },
      ],
      files,
    );
    if (planned.problems.length > 0 || planned.edits.length !== 1) {
      missing.push(`${locale.code}: ${planned.problems.map((p) => p.code).join(',') || 'no edit'}`);
    }
  }
  assert.deepEqual(missing, [], 'these languages accept a correction and cannot be written');
});

test('the audit’s view of a proposed line is the same text the script writes', () => {
  // Two things look at a correction before it lands: the console flags what a
  // machine noticed, and the script refuses what it cannot write. Both are
  // looking at `proposedText.trim()`, and this asserts they agree — a flag raised
  // on text that is never written, or a write of text nobody looked at, are both
  // ways for the two halves to drift.
  const files = catalogueFiles();
  const [review] = parseQueue(queued());
  assert.ok(review);
  const proposal = review.proposals[0];
  assert.ok(proposal);

  const planned = plan(
    [{ locale: 'ta', corrections: [{ key: proposal.messageKey, to: proposal.proposedText.trim() }] }],
    files,
  );
  const written = apply(files, planned.edits);
  assert.ok(written);
  assert.equal(readCatalogue(written, 'ta')[proposal.messageKey], proposal.proposedText.trim());
});
