import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { mapCohortError } from './cohorts.ts';
import {
  classCodeOf,
  classOutcomeOf,
  reviewCodeOf,
  reviewOutcomeOf,
  saveCodeOf,
  saveOutcomeOf,
} from './course-parts.ts';
import { classLines, coursePartsWords, reviewLines } from './course-parts-words.ts';
import { languageShownFor, translator, type LocaleCode } from './i18n/index.ts';
import { en } from './i18n/messages/en.ts';
import { COURSE_PARTS } from './i18n/messages/course-parts.ts';
import { LOCALES } from './i18n/locales.ts';
import { mapReviewError, validateReviewInput } from './reviews.ts';
import { mapWishlistError } from './wishlist.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const LANGUAGES = Object.keys(COURSE_PARTS) as LocaleCode[];

/** Every string in a bundle of words, however deep. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

test('a refusal to join a class is named from the sentence the database gave', () => {
  // The sentences `join_cohort()` raises, as `mapCohortError` passes them on.
  const named = (message: string) => classCodeOf(mapCohortError({ message }).message);
  assert.equal(named('this cohort is full'), 'full');
  assert.equal(named('this cohort stopped accepting joiners on 2026-11-20 09:00 UTC'), 'closed');
  assert.equal(named('this cohort is not open to joiners'), 'closed');
  assert.equal(named('this cohort has already ended'), 'closed');
  assert.equal(named('this learner must be enrolled in this course version first'), 'not_enrolled');
  assert.equal(named('this learner is already in the cohort'), 'already');
  // No name: the page says "could not be confirmed" rather than guessing.
  assert.equal(named('cohorts are not enabled (learning.cohorts is off)'), null);
  assert.equal(named('you can only join a learner you are responsible for'), null);
  assert.equal(named('cohort not found'), null);
  assert.equal(named('connection reset'), null);
});

test('only a four hundred that names a known reason is a refusal', () => {
  assert.equal(classOutcomeOf(409, 'full'), 'full');
  assert.equal(classOutcomeOf(400, 'not_enrolled'), 'not_enrolled');
  assert.equal(classOutcomeOf(500, 'full'), 'unconfirmed');
  assert.equal(classOutcomeOf(200, 'full'), 'unconfirmed');
  assert.equal(classOutcomeOf(409, 'something_new'), 'unconfirmed');
  assert.equal(classOutcomeOf(409, undefined), 'unconfirmed');
  assert.equal(classOutcomeOf(0, undefined), 'unconfirmed');

  assert.equal(saveOutcomeOf(409, 'limit'), 'limit');
  assert.equal(saveOutcomeOf(409, 'gone'), 'gone');
  assert.equal(saveOutcomeOf(409, 'flag_disabled'), 'unconfirmed');
  assert.equal(saveOutcomeOf(503, 'limit'), 'unconfirmed');

  assert.equal(reviewOutcomeOf(403, 'not_enrolled'), 'not_enrolled');
  assert.equal(reviewOutcomeOf(403, 'own_course'), 'own_course');
  assert.equal(reviewOutcomeOf(400, 'too_long'), 'too_long');
  assert.equal(reviewOutcomeOf(409, 'flag_disabled'), 'unconfirmed');
  assert.equal(reviewOutcomeOf(502, 'too_long'), 'unconfirmed');
});

test('the saved list and the reviews name their refusals the same way', () => {
  const saved = (message: string, code?: string) => {
    const mapped = mapWishlistError({ message, code });
    return mapped.ok ? null : saveCodeOf(mapped.error);
  };
  assert.equal(saved('you have saved 100 courses already; remove one first'), 'limit');
  assert.equal(saved('anything', 'program_limit_exceeded'), 'limit');
  assert.equal(saved('this course is no longer offered'), 'gone');
  assert.equal(saved('course not found'), null);
  assert.equal(saved('saved courses are not enabled (learning.wishlist is off)'), null);

  const reviewed = (message: string) => {
    const mapped = mapReviewError({ message });
    return mapped.ok ? null : reviewCodeOf(mapped.error);
  };
  assert.equal(reviewed('you can only review a course you are enrolled in'), 'not_enrolled');
  assert.equal(reviewed('you cannot review a course you wrote'), 'own_course');
  assert.equal(reviewed('please keep a review under 2000 characters'), 'too_long');
  assert.equal(reviewed('course reviews are not open yet (learning.reviews is off)'), null);
  assert.equal(reviewed('create your own learner profile before reviewing a course'), null);
  // The same refusal when the page's own check catches it first.
  const long = validateReviewInput({ rating: 4, body: 'x'.repeat(2001) });
  assert.equal(long.ok, false);
  if (!long.ok) assert.equal(reviewCodeOf(long.error), 'too_long');
});

test('every sentence handed to the three parts is whole, in English', () => {
  const words = coursePartsWords('en');
  assert.equal(words.classes.learning, 'Your current enrolments are under My learning.');
  assert.equal(words.save.max, 'You can save up to 100 courses.');
  assert.equal(words.save.savedDone, 'Saved. Find it under Saved courses in My learning.');
  assert.equal(words.save.refusals.limit, 'You have already saved 100 courses. Remove one first.');
  assert.equal(words.reviews.outOf, 'out of 5');
  assert.equal(words.reviews.refusals.too_long, 'Keep a review under 2,000 characters.');
  assert.deepEqual(words.reviews.stars.map((s) => s.label), [
    '1 — Poor', '2 — Disappointing', '3 — Fine', '4 — Good', '5 — Excellent',
  ]);
  assert.equal(words.preview.sample(3), 'A sample from version 3.');
  assert.equal(words.preview.kind('worksheet'), 'Worksheet');
  // A kind the database grows later is "Resource", not the column's value.
  assert.equal(words.preview.kind('flashcards'), 'Resource');

  // The holes left are a component's ({date}, {name}, {note}, {reason}) or
  // the server's own, filled by `classLines` and `reviewLines` before a
  // browser sees them ({capacity}, {count}, {number}, {taken}).
  const left = new Set(strings(words).flatMap((s) => s.match(/\{[a-zA-Z]+\}/g) ?? []));
  assert.deepEqual([...left].sort(), ['{capacity}', '{count}', '{date}', '{name}', '{note}', '{number}', '{reason}', '{taken}']);
});

const SAMPLE_CLASSES = [
  { id: 'a', versionNumber: 3, capacity: 12, places: { activeMembers: 3, full: false } },
  { id: 'b', versionNumber: 3, capacity: 1200, places: { activeMembers: null, full: false } },
  { id: 'c', versionNumber: null, capacity: null, places: { activeMembers: 7, full: true } },
];
const SAMPLE_SUMMARY = { average: 4.3, count: 12, distribution: { 5: 7, 4: 3, 3: 1, 1: 1 } };
const SAMPLE_REVIEWS = [{ id: 'r-1', createdAt: '2026-11-20T23:30:00+00:00' }];

test('every number and every day is written out on the server', () => {
  const words = coursePartsWords('en');
  const lines = classLines('en', words.classes, SAMPLE_CLASSES);
  assert.deepEqual(lines.a, {
    version: 'Version 3',
    places: '3 of 12 places taken',
    full: 'This class is full: its place limit is 12. If somebody leaves, a place opens here.',
    needEnrolSelf: lines.a!.needEnrolSelf,
    needEnrolFor: lines.a!.needEnrolFor,
  });
  assert.match(lines.a!.needEnrolSelf, /version 3/);
  assert.match(lines.a!.needEnrolFor, /^\{name\} .*version 3/);
  assert.equal(lines.b!.places, 'Place limit: 1,200');
  // A class with no limit that still counts as full, and a version nobody
  // could read: the sentences that need neither number.
  assert.deepEqual(lines.c, {
    version: null,
    places: 'No place limit',
    full: words.classes.refusals.full,
    needEnrolSelf: words.classes.refusals.not_enrolled,
    needEnrolFor: words.classes.refusals.not_enrolled,
  });

  assert.deepEqual(reviewLines('en', words.reviews, SAMPLE_SUMMARY, SAMPLE_REVIEWS), {
    average: '4.3',
    count: '12 ratings',
    rows: { 1: '1', 2: '0', 3: '1', 4: '3', 5: '7' },
    days: { 'r-1': 'Nov 20, 2026' },
  });
  assert.equal(reviewLines('en', words.reviews, { ...SAMPLE_SUMMARY, count: 1 }, []).count, '1 rating');

  // The language's own marks and digits, which a browser may not have.
  const kazakh = coursePartsWords('kk');
  assert.equal(reviewLines('kk', kazakh.reviews, SAMPLE_SUMMARY, []).average, '4,3');
  const nepali = coursePartsWords('ne');
  assert.equal(reviewLines('ne', nepali.reviews, SAMPLE_SUMMARY, []).rows[5], '७');
  assert.match(classLines('ne', nepali.classes, SAMPLE_CLASSES).a!.places, /३.*१२|१२.*३/);

  // In every language the only hole that reaches a browser is the name.
  for (const code of LANGUAGES) {
    const w = coursePartsWords(code);
    const classes = classLines(code, w.classes, SAMPLE_CLASSES);
    for (const [id, line] of Object.entries(classes)) {
      for (const [field, value] of Object.entries(line)) {
        if (value === null) continue;
        const holes = value.match(/\{[a-zA-Z]+\}/g) ?? [];
        assert.deepEqual(holes, field === 'needEnrolFor' && id !== 'c' ? ['{name}'] : [], `${code} ${id}.${field}: ${value}`);
      }
    }
    assert.equal(strings(reviewLines(code, w.reviews, SAMPLE_SUMMARY, SAMPLE_REVIEWS)).join(' ').includes('{'), false, code);
  }
});

test('the three components write no number and no date themselves', () => {
  // Chromium carries less language data than the server: a Kazakh "4,3"
  // comes out "4.3" there, a Nepali "१२" comes out "12", and React reports
  // the difference as an error and draws the part again with the worse one.
  for (const file of ['cohort-browser.tsx', 'save-button.tsx', 'review-panel.tsx']) {
    const source = read(`../app/courses/[slug]/${file}`);
    assert.doesNotMatch(source, /formatNumber|formatPercent|formatDay|formatDateTime|pluralForm|Intl\.|toFixed\(/, file);
  }
  const page = read('../app/courses/[slug]/page.tsx');
  assert.match(page, /lines=\{classLines\(shown\.code, parts\.classes, joinableCohorts\)\}/);
  assert.match(page, /lines=\{reviewLines\(shown\.code, parts\.reviews, reviewSummary, courseReviews\)\}/);
  // The one thing only a browser can write is a moment on the reader's clock.
  assert.match(read('../app/courses/[slug]/cohort-browser.tsx'), /<LocalTime iso=\{iso\} locale=\{locale\} \/>/);
});

test('twenty-seven languages say every one of them, and none says it in English', () => {
  assert.equal(LANGUAGES.length, 27);
  const english = coursePartsWords('en');
  const englishStrings = strings(english);
  for (const code of LANGUAGES) {
    const words = coursePartsWords(code);
    const said = strings(words);
    assert.equal(said.length, englishStrings.length, code);
    for (const sentence of said) assert.ok(sentence.trim() !== '', code);

    // The same holes as English, sentence for sentence.
    for (const [i, sentence] of said.entries()) {
      assert.deepEqual(
        (sentence.match(/\{[a-zA-Z]+\}/g) ?? []).sort(),
        (englishStrings[i]!.match(/\{[a-zA-Z]+\}/g) ?? []).sort(),
        `${code}: ${sentence}`,
      );
    }
    // The long sentences cannot be English by coincidence.
    for (const pick of [
      (w: typeof english) => w.classes.body,
      (w: typeof english) => w.classes.unconfirmed,
      (w: typeof english) => w.classes.learning,
      (w: typeof english) => w.save.savedDone,
      (w: typeof english) => w.save.unconfirmed,
      (w: typeof english) => w.reviews.body,
      (w: typeof english) => w.reviews.rule,
      (w: typeof english) => w.reviews.unconfirmed,
      (w: typeof english) => w.preview.empty,
      (w: typeof english) => w.preview.sample(2),
    ]) {
      assert.notEqual(pick(words), pick(english), code);
    }
    // The page a sentence points at is named as that page's heading names it.
    const t = translator(code);
    assert.ok(words.save.savedDone.includes(t('learn.saved')), code);
    assert.ok(words.save.savedDone.includes(t('nav.learn')), code);
    assert.ok(words.classes.learning.includes(t('nav.learn')), code);
    assert.equal(words.preview.sample(2).includes('{'), false, code);
  }
  for (const key of Object.keys(en).filter((k) => k.startsWith('cparts.'))) {
    for (const code of LANGUAGES) {
      assert.ok((COURSE_PARTS[code] as Record<string, string>)[key], `${code} is missing ${key}`);
    }
  }
});

test('the parts are shown in exactly the languages the rest of the course page is', () => {
  // The course page asks which language it is shown in once, for `cpage`, and
  // hands the three parts words in that language. That is only right while
  // the two parts of the catalogue are written for the same languages.
  for (const locale of LOCALES) {
    assert.equal(
      languageShownFor(locale.code, 'cparts').code,
      languageShownFor(locale.code, 'cpage').code,
      locale.code,
    );
  }
});

test('the three components and the sample lesson carry no sentence of their own', () => {
  const page = read('../app/courses/[slug]/page.tsx');
  const classes = read('../app/courses/[slug]/cohort-browser.tsx');
  const save = read('../app/courses/[slug]/save-button.tsx');
  const reviews = read('../app/courses/[slug]/review-panel.tsx');
  const preview = read('../app/courses/[slug]/preview/[lessonId]/page.tsx');

  assert.match(page, /coursePartsWords\(shown\.code\)/);
  assert.match(page, /words=\{parts\.classes\}/);
  assert.match(page, /words=\{parts\.save\}/);
  assert.match(page, /words=\{parts\.reviews\}/);
  assert.match(preview, /languageShownFor\(locale, 'cparts'\)/);

  for (const [name, source] of [['classes', classes], ['save', save], ['reviews', reviews]] as const) {
    // A browser may not import the catalogues.
    assert.doesNotMatch(source, /from '@\/lib\/i18n'/, name);
    assert.doesNotMatch(source, /from '@\/lib\/i18n\/index/, name);
    assert.doesNotMatch(source, /course-parts-words/, name);
    // The route's sentence is never printed, and no date is formatted by the
    // browser's own locale.
    assert.doesNotMatch(source, /result\.message|json\.error|\.message \?\?/, name);
    assert.doesNotMatch(source, /toLocaleString\(|toLocaleDateString\(|toFixed\(1\)\}/, name);
  }
  assert.match(classes, /classOutcomeOf\(response\.status, result\.code\)/);
  assert.match(save, /saveOutcomeOf\(status, code\)/);
  assert.match(reviews, /reviewOutcomeOf\(status, code\)/);
  assert.doesNotMatch(classes, /joinWindowLabel|placesLabel/);

  for (const gone of [
    'Dated classes', 'Who is joining?', 'Joined for', 'Open to joiners', 'No place limit', 'Leave class',
    'Save for later', 'Saved — remove', 'Add a note', 'For Amina', 'Note saved',
    'What learners say', 'No ratings yet', 'Disappointing', 'Remove my review', 'A learner', 'Say more',
  ]) {
    for (const source of [classes, save, reviews]) {
      assert.equal(source.includes(`>${gone}`) || source.includes(`'${gone}`) || source.includes(`"${gone}`), false, `a component still says "${gone}" itself`);
    }
  }
  for (const gone of ['Free preview', 'A sample from version', 'Preview content', 'Back to course', '{resource.resource_type}']) {
    assert.equal(preview.includes(gone), false, `the sample lesson still says "${gone}" itself`);
  }
});

test('the three routes send the name beside the sentence, and still send the sentence', () => {
  const cohorts = read('../app/api/cohorts/route.ts');
  const wishlist = read('../app/api/wishlist/route.ts');
  const reviews = read('../app/api/reviews/route.ts');
  assert.match(cohorts, /classCodeOf\(result\.message\)/);
  assert.match(cohorts, /\{ ok: false, message: result\.message, \.\.\.\(code \? \{ code \} : \{\}\) \}/);
  assert.match(wishlist, /saveCodeOf\(error\)/);
  assert.match(reviews, /reviewCodeOf\(error\)/);
  for (const route of [wishlist, reviews]) {
    assert.match(route, /NextResponse\.json\(\{ error, \.\.\.\(code \? \{ code \} : \{\}\) \}, \{ status \}\)/);
  }
  // The saved list reads the name too since 2026-11-27, and never the sentence.
  assert.match(read('../app/saved/saved-item.tsx'), /savedRefusalOf\(status, code\)/);
  assert.doesNotMatch(read('../app/saved/saved-item.tsx'), /json\.error/);
  // The page that is still English reads the sentence and is not changed.
  assert.match(read('../app/teach/[courseId]/cohorts/cohort-manager.tsx'), /result\.message/);
});
