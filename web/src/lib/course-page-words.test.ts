import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { bandMismatch } from './audience.ts';
import { coursePageWords } from './course-page-words.ts';
import { UNNAMED_REASON } from './course-teacher.ts';
import { enrolOutcomeOf } from './enrol-outcome.ts';
import { en } from './i18n/messages/en.ts';
import { COURSE_PAGE } from './i18n/messages/course-page.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const arabic = { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', direction: 'rtl' as const, courses: 1 };
const english = { code: 'en', nativeName: 'English', englishName: 'English', direction: 'ltr' as const, courses: 1 };

test('the ages a course is written for are said in age order, in the reader’s language', () => {
  const words = coursePageWords('en');
  assert.equal(words.writtenFor(['11-13', '8-10']), 'Written for Ages 8–10 and Ages 11–13.');
  assert.equal(words.writtenFor(['18+']), 'Written for Adults.');
  // No age named, or only values this build does not know, says nothing.
  assert.equal(words.writtenFor([]), null);
  assert.equal(words.writtenFor(null), null);
  assert.equal(words.writtenFor(['0-4']), null);

  const french = coursePageWords('fr').writtenFor(['8-10', '11-13']);
  assert.equal(french, 'Rédigé pour : 8–10 ans et 11–13 ans.');
  // Arabic writes its own digits or Latin ones as the locale formats them; what
  // matters is that the sentence is Arabic and carries both bands.
  const ar = coursePageWords('ar').writtenFor(['8-10', '11-13']) ?? '';
  assert.match(ar, /^مكتوبة لهذه الفئات: /);
  assert.equal(ar.includes('{'), false);
});

test('the note about ages is the one `bandMismatch` decides, and is never a gate', () => {
  const words = coursePageWords('en');
  for (const [bands, band] of [
    [['8-10'], '8-10'],
    [['8-10'], '14-17'],
    [[], '5-7'],
    [['8-10', '11-13'], '18+'],
    [['8-10'], null],
    [['8-10'], 'nonsense'],
  ] as const) {
    // Whenever the English library says something, so does this, and never otherwise.
    assert.equal(words.outside(bands, band) === null, bandMismatch(bands, band) === null, `${bands} / ${band}`);
  }
  assert.equal(words.outside(['8-10'], '14-17'), 'Written for Ages 8–10 — Ages 14–17 is outside that.');
  assert.equal(
    coursePageWords('id').outside(['8-10'], '18+'),
    'Ditulis untuk: Usia 8–10 — “Dewasa” berada di luar itu.',
  );
});

test('the language a course is taught in is named in the reader’s language', () => {
  assert.equal(coursePageWords('en').taughtIn(arabic), 'Taught in Arabic — العربية.');
  // English is the default and a line declaring it on every page is noise.
  assert.equal(coursePageWords('en').taughtIn(english), null);
  assert.equal(coursePageWords('fr').taughtIn(english), null);
  assert.equal(coursePageWords('en').taughtIn(null), null);
  assert.equal(coursePageWords('fr').taughtIn(arabic), 'Langue d’enseignement : arabe — العربية.');
  // An Arabic reader is not told the name twice.
  assert.equal(coursePageWords('ar').taughtIn(arabic), 'لغة التدريس: العربية.');
  // A code the runtime has no name for keeps the register’s English name.
  const odd = { ...arabic, code: 'qzz', englishName: 'Somewhere', nativeName: 'Somewhere' };
  assert.match(coursePageWords('fr').taughtIn(odd) ?? '', /Somewhere/);
});

test('the learners the button lists carry their own label and their own note', () => {
  const listed = coursePageWords('fr').learners(
    [
      { id: 'a', name: 'Amina', isSelf: true, ageBand: '18+' },
      { id: 'b', name: 'Yusuf', isSelf: false, ageBand: '8-10' },
    ],
    ['8-10'],
  );
  assert.deepEqual(listed, [
    { id: 'a', name: 'Amina', isSelf: true, label: 'Amina (moi)', outside: 'Rédigé pour : 8–10 ans — « Adultes » est en dehors.' },
    { id: 'b', name: 'Yusuf', isSelf: false, label: 'Yusuf', outside: null },
  ]);
});

test('only a four hundred that names a known reason is a refusal', () => {
  assert.equal(enrolOutcomeOf(409, 'already_enrolled'), 'already_enrolled');
  assert.equal(enrolOutcomeOf(402, 'payment_required'), 'payment_required');
  assert.equal(enrolOutcomeOf(401, 'not_signed_in'), 'not_signed_in');
  assert.equal(enrolOutcomeOf(409, 'guardian_verification_required'), 'guardian_verification_required');
  // A lost reply, a five hundred, a reason this build has no words for, a
  // success that did not say `ok`: none of them is a refusal.
  assert.equal(enrolOutcomeOf(0, undefined), 'unconfirmed');
  assert.equal(enrolOutcomeOf(503, 'not_available'), 'unconfirmed');
  assert.equal(enrolOutcomeOf(502, 'already_enrolled'), 'unconfirmed');
  assert.equal(enrolOutcomeOf(409, 'something_new'), 'unconfirmed');
  assert.equal(enrolOutcomeOf(201, undefined), 'unconfirmed');
  assert.equal(enrolOutcomeOf(400, 'unconfirmed'), 'unconfirmed');
});

test('every reason the enrolment library can give has a sentence, in every written language', () => {
  const library = read('./enrolment.ts');
  const union = library.slice(library.indexOf('export type EnrolErrorCode ='));
  const codes = [...union.slice(0, union.indexOf(';')).matchAll(/'([a-z_]+)'/g)].map((m) => String(m[1]));
  assert.ok(codes.length >= 8, 'the list of reasons could not be read');
  for (const code of ['en', ...Object.keys(COURSE_PAGE)] as const) {
    const refusals = coursePageWords(code as never).enrolWords('UGX 20,000').refusals as Record<string, string>;
    for (const reason of [...codes, 'unconfirmed']) {
      assert.ok(refusals[reason] && refusals[reason].length > 10, `${code} has no sentence for ${reason}`);
    }
    if (code !== 'en') {
      assert.notEqual(refusals.already_enrolled, en['cpage.errAlready'], `${code} refuses in English`);
    }
  }
  assert.equal(coursePageWords('en').enrolWords('UGX 20,000').buy, 'Buy — UGX 20,000');
});

test('the sentence for a teacher who is not named is the one the library tests', () => {
  // `course-teacher.ts` keeps the English for anything that reads it without a
  // reader; the page says the key. They are one sentence.
  assert.equal(en['cpage.teacherUnnamedWhy'], UNNAMED_REASON);
  assert.equal(coursePageWords('en').teacher.all('Amina'), 'Everything Amina teaches');
  assert.equal(coursePageWords('fr').teacher.all('Amina'), 'Tous les cours de Amina');
});

test('the course page and its button carry no sentence of their own', () => {
  const page = read('../app/courses/[slug]/page.tsx');
  const button = read('../app/courses/[slug]/enrol-button.tsx');
  const card = read('../app/_shared/who-teaches.tsx');

  assert.match(page, /languageShownFor\(locale, 'cpage'\)/);
  assert.match(page, /coursePageWords\(shown\.code\)/);
  assert.match(page, /offeringLabel\(offering, shown\.code\)/);
  for (const gone of ['Who teaches this', 'Course outline', 'The outline is not published yet', 'Current version', 'Written for ', 'Taught in ']) {
    assert.equal(page.includes(`>${gone}`) || page.includes(`\`${gone}`), false, `the page still says "${gone}" itself`);
  }
  // The three parts behind switches are still English and are marked so.
  for (const part of ['<CohortBrowser', '<SaveButton', '<ReviewPanel']) {
    const at = page.lastIndexOf(part);
    assert.ok(at > 0, part);
    assert.match(page.slice(at - 60, at), /<div \{\.\.\.english\}>\s*$/, `${part} is not marked as English`);
  }

  // A browser may not import the catalogues, and the button does not need to.
  assert.doesNotMatch(button, /from '@\/lib\/i18n/);
  assert.doesNotMatch(button, /from '@\/lib\/audience'/);
  assert.match(button, /enrolOutcomeOf\(status, json\.code\)/);
  assert.match(button, /words\.refusals\[refusal\]/);
  assert.doesNotMatch(button, /json\.message/);
  for (const gone of ['Enrolling…', 'Enrol — free', 'Who is learning?', 'Go to my learning', 'I already have an account', 'Contact us']) {
    assert.equal(button.includes(gone), false, `the button still says "${gone}" itself`);
  }
  assert.doesNotMatch(card, /Written and taught by a teacher|attribution\.reason|Everything \{/);
  assert.doesNotMatch(read('./enrol-outcome.ts'), /^import /m, 'the outcome file is imported by a browser and must import nothing');
});
