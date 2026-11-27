import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { languageName } from './i18n/language-name.ts';

test('a language is named, in the language of the page, and never shown as its code', () => {
  assert.equal(languageName('en', 'ar'), 'Arabic');
  assert.equal(languageName('en', 'en'), 'English');
  assert.equal(languageName('fr', 'ar'), 'arabe');
  assert.equal(languageName('ar', 'ar'), 'العربية');
  assert.equal(languageName('ar', 'en'), 'الإنجليزية');
  // However the register wrote the code.
  assert.equal(languageName('en', 'AR'), 'Arabic');
  assert.equal(languageName('en', ' sw '), 'Swahili');
  assert.equal(languageName('en', 'zh-Hans'), 'Simplified Chinese');
});

test('a code nobody has a name for is shown as it was written, and nothing is nothing', () => {
  assert.equal(languageName('en', 'qqq'), 'qqq');
  assert.equal(languageName('en', 'not a code'), 'not a code');
  assert.equal(languageName('en', null), null);
  assert.equal(languageName('en', undefined), null);
  assert.equal(languageName('en', '   '), null);
});

test('the pages that showed "ar" ask for the name', () => {
  const read = (path: string) => readFileSync(new URL(`../app/${path}`, import.meta.url), 'utf8');
  // Found by drawing the pages, 2026-11-26: the course's language was its code.
  assert.match(read('verify/[number]/page.tsx'), /languageName\(shown\.code, result\.language\) \?\? '—'/u);
  assert.match(read('certificates/page.tsx'), /languageName\(shown\.code, c\.courseLanguage\)/u);
  assert.match(read('learn/page.tsx'), /languageName\(shown\.code, language\(r\)\)/u);
  assert.match(read('learn/[enrolmentId]/page.tsx'), /language: languageName\(/u);
  // In the page's language since 2026-11-27; it was pinned to English while the page was.
  assert.match(read('teachers/[slug]/page.tsx'), /languageName\(shown\.code, course\.language\)/u);
  for (const page of ['verify/[number]/page.tsx', 'certificates/page.tsx', 'learn/page.tsx', 'learn/[enrolmentId]/page.tsx']) {
    assert.doesNotMatch(read(page), /anguage[^\n]*\.toUpperCase\(\)/u, page);
  }
});
