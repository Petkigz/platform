import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { en } from './i18n/messages/en.ts';
import { LOCALES } from './i18n/locales.ts';
import {
  SECTIONS,
  acceptedBlock,
  dayOf,
  parsePublished,
  parseQueue,
  reviewState,
  sectionByPrefix,
  stateIn,
  tsLiteral,
  type Review,
} from './translations.ts';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, '..', path), 'utf8');

// The half of the review loop that is TypeScript: what a correction becomes, and
// what `/language` is allowed to claim. The database half is tested in
// `supabase/tests/translation_reviews.test.mjs`; neither is a substitute for the
// other, because the feature only works if both ends agree about what "read"
// means.

function review(over: Partial<Review> = {}): Review {
  return {
    id: 'r1',
    locale: 'si',
    reviewerName: 'Amina Fernando',
    reviewerEmail: null,
    scope: 'whole',
    note: null,
    status: 'submitted',
    createdAt: '2026-11-01T09:00:00Z',
    decidedAt: null,
    declineReason: null,
    proposals: [],
    ...over,
  };
}

function proposal(over: Partial<Review['proposals'][number]> = {}) {
  return {
    id: 'p1',
    messageKey: 'home.title',
    currentText: 'old',
    proposedText: 'new',
    reason: null,
    status: 'proposed' as const,
    decidedAt: null,
    ...over,
  };
}

test('every English key is reachable from exactly one section of the sheet', () => {
  // The sheet is generated from the English key set rather than from a list
  // somebody maintains. A string added under a new prefix would otherwise be a
  // string no reviewer could ever get to — and nobody would notice, because the
  // page would look complete.
  const seen = new Map<string, string>();
  for (const section of SECTIONS) {
    for (const key of section.keys) {
      assert.ok(!seen.has(key), `${key} is in both ${seen.get(key)} and ${section.prefix}`);
      seen.set(key, section.prefix);
    }
  }
  assert.deepEqual([...seen.keys()].sort(), Object.keys(en).sort());
  assert.equal(sectionByPrefix('home')?.keys.length, 42);
  assert.equal(sectionByPrefix('nope'), undefined);
});

test('a line of TypeScript is quoted, not merely wrapped', () => {
  // Every language here has apostrophes, and one of them has an apostrophe look-
  // alike. A paste block that produced `'don't'` would be a syntax error in the
  // catalogue file, discovered by a build rather than by the person who pasted it.
  assert.equal(tsLiteral('plain'), "'plain'");
  assert.equal(tsLiteral("don't"), "'don\\'t'");
  assert.equal(tsLiteral('back\\slash'), "'back\\\\slash'");
  assert.equal(tsLiteral('two\nlines'), "'two\\nlines'");
  assert.equal(tsLiteral("’smart’"), "'’smart’'");
});

test('the paste block carries accepted lines only, in key order', () => {
  const block = acceptedBlock(review({
    proposals: [
      proposal({ id: 'a', messageKey: 'home.title', status: 'accepted', proposedText: 'B' }),
      proposal({ id: 'b', messageKey: 'auth.email', status: 'rejected', proposedText: 'X' }),
      proposal({ id: 'c', messageKey: 'auth.password', status: 'accepted', proposedText: 'A' }),
      proposal({ id: 'd', messageKey: 'nav.main', status: 'proposed', proposedText: 'Y' }),
    ],
  }));
  assert.equal(block, [
    "    'auth.password': 'A',",
    "    'home.title': 'B',",
  ].join('\n'));
  // A rejected correction reaching the paste block is the worst kind of bug: the
  // reviewer finds it in the language they offered to fix.
  assert.ok(!block.includes("'X'"));
  assert.ok(!block.includes("'Y'"));
});

test('a correction knows whether it reached the code', () => {
  const live = new Map([['home.title', 'new']]);
  const lookup = (_locale: string, key: string) => live.get(key);

  assert.equal(stateIn(proposal(), 'si', lookup), 'applied');
  live.set('home.title', 'old');
  assert.equal(stateIn(proposal(), 'si', lookup), 'pending');
  live.set('home.title', 'something a fourth person wrote');
  assert.equal(stateIn(proposal(), 'si', lookup), 'stale');
  live.delete('home.title');
  assert.equal(stateIn(proposal(), 'si', lookup), 'unknown');
});

test('a language is only "ready" when a whole read has nothing left to decide', () => {
  assert.match(reviewState(review({ scope: 'part' })), /partial read/i);
  assert.match(reviewState(review({ proposals: [proposal()] })), /Waiting on 1 correction/);
  assert.match(reviewState(review()), /Ready to publish/);
  assert.match(
    reviewState(review({ status: 'published', decidedAt: '2026-11-02T00:00:00Z' })),
    /Published — Amina Fernando/,
  );
  assert.match(reviewState(review({ status: 'declined', declineReason: 'duplicate' })), /duplicate/);
});

test('the queue parser does not invent a name or an address', () => {
  // These rows cross a boundary with nothing typed on the other side. A missing
  // email must be `null`, never the string "undefined" printed into a heading.
  const parsed = parseQueue({
    reviews: [
      {
        id: 'r1',
        locale: 'ta',
        reviewer_name: '  Karthik  ',
        reviewer_email: null,
        scope: 'part',
        status: 'submitted',
        created_at: '2026-11-01T00:00:00Z',
        proposals: [{ id: 'p', messageKey: 'nav.main', currentText: 'a', proposedText: 'b', status: 'proposed' }],
      },
    ],
  });
  assert.equal(parsed.length, 1);
  const [first] = parsed;
  assert.ok(first);
  assert.equal(first.reviewerEmail, null);
  assert.equal(first.reviewerName, '  Karthik  ');
  assert.equal(first.scope, 'part');
  assert.equal(first.proposals.length, 1);
  assert.deepEqual(parseQueue(null), []);
  assert.deepEqual(parseQueue({ reviews: 'nonsense' }), []);
});

test('the published reviews are grouped by language, and nothing else is shown', () => {
  const byLocale = parsePublished([
    { locale: 'si', reviewer_name: 'Amina', scope: 'whole', published_at: '2026-11-02T00:00:00Z' },
    { locale: 'si', reviewer_name: 'Nuwan', scope: 'whole', published_at: '2026-11-03T00:00:00Z' },
    { locale: 'ta', reviewer_name: 'Karthik', scope: 'whole', published_at: '2026-11-04T00:00:00Z' },
    // A row with no name is not a review of anything and must not be counted.
    { locale: 'ta', reviewer_name: '   ', published_at: '2026-11-04T00:00:00Z' },
  ]);
  assert.equal(byLocale.get('si')?.length, 2);
  assert.equal(byLocale.get('ta')?.length, 1);
  assert.equal(byLocale.get('dv'), undefined);
  assert.deepEqual(parsePublished(undefined).size, 0);
});

test('a date is a value, in the same order in every language', () => {
  assert.equal(dayOf('2026-11-02T13:45:00Z'), '2026-11-02');
  assert.equal(dayOf('not a date'), '');
});

test('/language prints the reviewer only when a review is published', () => {
  const page = read('app/language/page.tsx');
  assert.match(page, /published_locale_reviews/u);
  // The three ways of not knowing — unconfigured, unreachable, nothing published
  // — all end in "nobody has read this", which is the claim that cannot be wrong.
  assert.match(page, /published = new Map\(\)/u);
  assert.match(page, /const reviewers = published\.get\(code\) \?\? \[\]/u);
  assert.match(page, /const readBy = reviewers\.length > 0 \|\| current\.reviewed/u);
  // And it is a name and a date, not a second sentence in fifty-one catalogues.
  assert.match(page, /<time dateTime=\{review\.publishedAt\}>/u);
  assert.match(page, /t\('language\.reviewed'\) : t\('language\.unreviewed'\)/u);
});

test('the correction sheet is a plain form, and says where the name goes', () => {
  const page = read('app/contribute/page.tsx');
  assert.match(page, /action="\/api\/contribute"/u);
  assert.match(page, /method="post"/u);
  // It asks for an account nowhere, and says the email is not one.
  assert.ok(!/type="password"/.test(page), 'the correction sheet asks for a password');
  assert.match(page, /No account is created/u);
  // The promise about the name has to be on the page before the field, not in a
  // policy nobody opens.
  assert.match(page, /This is published if your review is accepted/u);
  assert.match(page, /Never published, never granted to any screen, and not a login/u);
});

test('the route re-checks everything the form offered', () => {
  const route = read('app/api/contribute/route.ts');
  // The flag, in the database as well as here.
  assert.match(route, /isFlagEnabled\(supabase, 'platform\.translation_reviews'\)/u);
  // The language and the section, against the register and the key set.
  assert.match(route, /isLocaleCode\(localeCode\)/u);
  assert.match(route, /sectionByPrefix/u);
  // `current_text` from the catalogue, never from the client.
  assert.match(route, /const currentText = current\(key\)/u);
  assert.ok(
    !/form\.get\('current_text'\)/.test(route),
    'the client is allowed to say what the current text is',
  );
  // A correction that drops {count} is refused by name.
  assert.match(route, /placeholders\(proposed\) !== placeholders\(currentText\)/u);
  // The id is generated here, because anon holds insert and no select.
  assert.match(route, /const reviewId = crypto\.randomUUID\(\)/u);
});

test('the console is the owner’s, and staff may not decide', () => {
  const page = read('app/admin/translations/page.tsx');
  assert.match(page, /p_role_code: 'platform_admin'/u);
  assert.match(page, /translation_review_queue/u);
  // The state of every line is computed against the built catalogue on the
  // server — the console says what the code says, not what was accepted.
  assert.match(page, /stateIn\(proposal, review\.locale, live\)/u);
  assert.ok(page.includes('TranslationConsole reviews={reviews} states={states}'),
    'the console is not handed the server-side verdicts');

  const console_ = read('app/admin/translations/translation-console.tsx');
  assert.match(console_, /rpc\('decide_translation_proposal'/u);
  assert.match(console_, /rpc\('publish_translation_review'/u);
  assert.match(console_, /rpc\('decline_translation_review'/u);
  // Accepting is not applying, and the console has to say so where the button is.
  assert.match(console_, /Accepting a correction does not change the site/u);
});

test('the correction sheet is gated in the sitemap, not promised to a crawler', () => {
  const crawl = read('lib/crawl.ts');
  assert.match(
    crawl,
    /path: '\/contribute'[^}]*flag: 'platform\.translation_reviews'/u,
  );
  const gated = crawl.slice(crawl.indexOf('GATED_ROUTES'), crawl.indexOf('DISALLOWED_PREFIXES'));
  assert.match(gated, /\/contribute/u);
});

test('every language on the sheet has a catalogue behind it', () => {
  // A correction sheet that offered a language with no catalogue would collect
  // corrections to nothing, and a locale list that drifted from the register is
  // exactly the kind of second register this project keeps refusing to have.
  const contribute = read('app/contribute/page.tsx');
  assert.match(contribute, /translatedLocales\(\)/u);
  assert.ok(LOCALES.length >= 51, `the register has shrunk to ${LOCALES.length}`);
  assert.ok(LOCALES.filter((l) => l.code !== 'en').length >= 50);
});
