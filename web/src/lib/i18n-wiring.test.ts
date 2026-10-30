import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LOCALES, translator } from './i18n/index.ts';

/**
 * The wiring, not the catalogue.
 *
 * `i18n.test.ts` proves every language has a sentence for every key. This file
 * proves the sentences reach the screen. A translated catalogue and an English
 * form is the exact failure this unit exists to fix, and it is invisible to every
 * other test: the strings compile, the page renders, and the only person who
 * notices is the reader who was promised their own language.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const SIGN_IN = read('../app/(auth)/sign-in/sign-in-form.tsx');
const SIGN_UP = read('../app/(auth)/sign-up/sign-up-form.tsx');
const LAYOUT = read('../app/layout.tsx');
const FORGOT = read('../app/(auth)/forgot-password/page.tsx');
const PASSWORD_FORM = read('../app/account/password-form.tsx');
const PASSWORD_PAGE = read('../app/account/password/page.tsx');

const FORMS: Array<[string, string]> = [
  ['the sign-in form', SIGN_IN],
  ['the sign-up form', SIGN_UP],
];

for (const [what, source] of FORMS) {
  test(`${what} asks the catalogue for its words`, () => {
    assert.match(source, /import \{ useT \} from '@\/lib\/i18n\/client'/u);
    assert.match(source, /const t = useT\(\);/u);
    // A form with two translated labels and a hard-coded heading is the defect
    // in miniature, so the count matters: these screens have well over ten.
    const calls = source.match(/t\('auth\./gu) ?? [];
    assert.ok(calls.length >= 12, `${what} only translates ${calls.length} strings`);
  });

  test(`${what} has no English sentence left in its markup`, () => {
    // Any JSX text node of three or more words is a sentence somebody meant to
    // read — and since this file is translated, in this file it is a miss.
    const literal = source.match(/>\s*[A-Z][a-z]+(?: [a-z']+){2,}\s*</gu) ?? [];
    assert.deepEqual(literal, [], `${what} still says ${literal[0] ?? ''} in English`);
    // The same for a string handed to a component as a prop.
    const props = source.match(/(?:label|title|placeholder)="[A-Z][^"]{6,}"/gu) ?? [];
    assert.deepEqual(props, [], `${what} passes an English label`);
  });

  test(`${what} leaves the provider's own message alone`, () => {
    // Supabase Auth writes the reason a password failed. Translating a message
    // we do not control would be a guess printed as a fact, so the form shows it
    // as it arrives — and this test is what stops somebody "fixing" that.
    assert.match(source, /err instanceof Error \? err\.message : t\('auth\.somethingWrong'\)/u);
  });
}

test('the layout hands the reader’s own catalogue to every client component', () => {
  assert.match(LAYOUT, /import \{ I18nProvider \} from '@\/lib\/i18n\/client'/u);
  assert.match(LAYOUT, /<I18nProvider locale=\{code\} messages=\{messagesFor\(code\)\}>/u);
  // Only the reader's language is shipped. `messagesFor` merges English behind
  // it, so a browser never receives thirty-three catalogues to display one.
  assert.match(LAYOUT, /messagesFor\(code\)/u);
});

test('the sign-in screen reads differently in every other language', () => {
  // Four words that no language renders identically. If one of these came back
  // in English the catalogue would look complete and read as English, which is
  // worse than an obviously missing translation.
  const keys = ['auth.signInTitle', 'auth.password', 'auth.noAccount', 'auth.forgot'] as const;

  for (const locale of LOCALES.filter((l) => l.code !== 'en')) {
    const t = translator(locale.code);
    for (const key of keys) {
      assert.notEqual(
        t(key),
        translator('en')(key),
        `${locale.code}.${key} is still the English sentence`,
      );
    }
  }
});

test('every phone-number sentence keeps the number it is about', () => {
  // `{phone}` is the E.164 value computed as the reader types. A translation
  // that drops it is a sentence that lost its subject.
  for (const locale of LOCALES) {
    const t = translator(locale.code);
    const rendered = t('auth.phoneAs', { phone: '+256772123456' });
    assert.match(rendered, /\+256772123456/u, `${locale.code} lost the number`);
  }
});

test('the two password screens are translated, both ends of the journey', () => {
  // A reset that is asked for in Luganda and completed in English is a reset
  // that looks broken. Both screens ask the catalogue for their words, and both
  // are free of English sentences in the markup.
  for (const [what, source, least] of [
    ['the reset request', FORGOT, 8],
    ['the new-password form', PASSWORD_FORM, 4],
  ] as const) {
    assert.match(source, /const t = useT\(\);/u, `${what} does not read the catalogue`);
    const calls = source.match(/t\('auth\./gu) ?? [];
    assert.ok(calls.length >= least, `${what} only translates ${calls.length} strings`);
    const literal = source.match(/>\s*[A-Z][a-z]+(?: [a-z']+){2,}\s*</gu) ?? [];
    assert.deepEqual(literal, [], `${what} still says ${literal[0] ?? ''} in English`);
  }

  // The page a reset link lands on is a server component, so the language is in
  // the first byte rather than swapped in after a flash of English.
  assert.match(PASSWORD_PAGE, /const \{ code \} = chooseLocale\(\{/u);
  assert.match(PASSWORD_PAGE, /const t = translator\(code\);/u);
  assert.match(PASSWORD_PAGE, /\{t\('auth\.chooseTitle'\)\}/u);
});

test('a refused password is quoted, not diagnosed', () => {
  // Supabase Auth names the rule the password broke. Replacing that with "it may
  // not meet the account security requirements" is a guess printed as a fact, and
  // it removes the only sentence that tells the reader what to change.
  assert.match(PASSWORD_FORM, /setError\(updateError\.message \|\| t\('auth\.somethingWrong'\)\)/u);
  assert.doesNotMatch(PASSWORD_FORM, /setError\('The password could not be updated/u);
  // Our own two refusals — the fields disagreeing, and an empty field — stay ours.
  assert.match(PASSWORD_FORM, /t\('auth\.noMatch'\)/u);
  assert.match(PASSWORD_FORM, /t\('auth\.enterPassword'\)/u);
});

test('the reset confirmation does not say whether the address exists', () => {
  // An address that answers "no such account" is a way to find out who has an
  // account here. The sentence is a conditional one, and stays that way in every
  // language — the same promise the sign-in page makes for a phone code.
  for (const locale of LOCALES.filter((l) => l.code !== 'en')) {
    const sentence = translator(locale.code)('auth.resetSent');
    assert.notEqual(sentence.trim(), '', `${locale.code} has no confirmation`);
    assert.notEqual(
      sentence,
      translator('en')('auth.resetSent'),
      `${locale.code}.auth.resetSent is still the English sentence`,
    );
  }
});
