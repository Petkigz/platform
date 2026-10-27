import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ALL_LANGUAGES,
  cardLanguageNote,
  describeCourseLanguage,
  parseLanguages,
  sameLanguage,
  textProps,
  validLanguageFilter,
} from './language.ts';

const arabic = {
  code: 'ar',
  nativeName: 'العربية',
  englishName: 'Arabic',
  direction: 'rtl' as const,
  courses: 3,
};
const english = {
  code: 'en',
  nativeName: 'English',
  englishName: 'English',
  direction: 'ltr' as const,
  courses: 12,
};

describe('the chip row', () => {
  it('reads the languages somebody writes in', () => {
    const list = parseLanguages([
      { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', direction: 'rtl', courses: 3 },
      { code: 'en', nativeName: 'English', englishName: 'English', direction: 'ltr', courses: 12 },
    ]);
    assert.equal(list.length, 2);
    assert.equal(list[0]?.direction, 'rtl');
    assert.equal(list[0]?.courses, 3);
  });

  it('drops a row with no code and refuses a non-list', () => {
    assert.equal(parseLanguages([{ englishName: 'nonsense' }]).length, 0);
    assert.deepEqual(parseLanguages(null), []);
    assert.deepEqual(parseLanguages({ code: 'ar' }), []);
  });

  it('defaults a direction it does not recognise to left-to-right', () => {
    const list = parseLanguages([{ code: 'ar', direction: 'sideways' }]);
    assert.equal(list[0]?.direction, 'ltr');
  });

  it('accepts only a language the chip row actually offers', () => {
    const list = [arabic, english];
    assert.equal(validLanguageFilter('ar', list), 'ar');
    assert.equal(validLanguageFilter('he', list), null);
    assert.equal(validLanguageFilter(ALL_LANGUAGES, list), null);
    assert.equal(validLanguageFilter('', list), null);
  });
});

describe('direction', () => {
  it('asks the browser to decide, and names the language when it can', () => {
    assert.deepEqual(textProps('ar'), { dir: 'auto', lang: 'ar' });
    assert.deepEqual(textProps('ar-EG'), { dir: 'auto', lang: 'ar-EG' });
  });

  it('sets no lang for a code that is not a tag', () => {
    assert.deepEqual(textProps('not a tag'), { dir: 'auto' });
    assert.deepEqual(textProps(null), { dir: 'auto' });
  });
});

describe('what a reader is told', () => {
  it('says which language a course is taught in', () => {
    assert.equal(describeCourseLanguage(arabic), 'Taught in Arabic');
    assert.match(describeCourseLanguage(null), /could not read/);
  });

  it('does not repeat the default on every card', () => {
    assert.equal(cardLanguageNote(english), null);
    assert.equal(cardLanguageNote(arabic), 'Arabic');
    assert.equal(cardLanguageNote(null), null);
  });

  it('compares two courses by language code', () => {
    assert.equal(sameLanguage(arabic, { code: 'ar' }), true);
    assert.equal(sameLanguage(arabic, english), false);
  });
});
