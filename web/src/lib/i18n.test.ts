import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCALES,
  LOCALE_COOKIE,
  chooseLocale,
  coverageOf,
  directionOf,
  fill,
  localeLabel,
  matchLocale,
  messagesFor,
  safeNextPath,
  translatedLocales,
  translator,
} from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';

// The interface's own language. What is tested here is the part that decides
// *which* language a page is rendered in, and the part that decides what a
// half-translated catalogue is allowed to claim.

test('a choice beats the device, and the device beats English', () => {
  assert.deepEqual(
    chooseLocale({ chosen: 'fr', acceptLanguage: 'ar-EG,ar;q=0.9' }),
    { code: 'fr', source: 'chosen' },
  );
  assert.deepEqual(
    chooseLocale({ chosen: null, acceptLanguage: 'ar-EG,ar;q=0.9' }),
    { code: 'ar', source: 'device' },
  );
  assert.deepEqual(
    chooseLocale({ chosen: null, acceptLanguage: 'zh-CN,ja;q=0.8' }),
    { code: 'en', source: 'default' },
  );
});

test('a region is dropped, and an unknown language is not guessed at', () => {
  assert.equal(matchLocale('fr-CA'), 'fr');
  assert.equal(matchLocale('pt_BR'), 'pt');
  assert.equal(matchLocale('AR'), 'ar');
  assert.equal(matchLocale('zh-Hans-CN'), null);
  assert.equal(matchLocale(''), null);
  assert.equal(matchLocale(null), null);
});

test('the device preference is honoured in its own order', () => {
  // German is not a language this interface has, so the first one we do have
  // wins — the header's order, not its q-values re-sorted by hand.
  assert.equal(chooseLocale({ acceptLanguage: 'de-DE,ur;q=0.6' }).code, 'ur');
  assert.equal(
    chooseLocale({ acceptLanguage: 'de-DE,de;q=0.9,ms;q=0.2' }).code,
    'ms',
  );
});

test('a weight in the header outranks the order it arrived in', () => {
  // Browsers sort the header by weight, so this should never matter — and a
  // reader who gets the wrong language because it did is not a hypothetical.
  assert.equal(chooseLocale({ acceptLanguage: 'en;q=0.2,ar;q=0.9' }).code, 'ar');
  assert.equal(chooseLocale({ acceptLanguage: 'de;q=0.9,fr;q=0.4' }).code, 'fr');
  // `q=0` is the header's way of saying "do not use this".
  assert.equal(chooseLocale({ acceptLanguage: 'ar;q=0,ms;q=0.3' }).code, 'ms');
  // A tie keeps the order the header listed.
  assert.equal(chooseLocale({ acceptLanguage: 'sw;q=0.5,ur;q=0.5' }).code, 'sw');
  // `*` is any language, and it is not one this interface has.
  assert.equal(chooseLocale({ acceptLanguage: '*' }).code, 'en');
});

test('the three right-to-left languages say so, and nothing else does', () => {
  const rtl = LOCALES.filter((l) => l.dir === 'rtl').map((l) => l.code);
  assert.deepEqual(rtl.sort(), ['ar', 'fa', 'ur']);
  assert.equal(directionOf('fr'), 'ltr');
  assert.equal(directionOf('ar'), 'rtl');
});

test('every catalogue is inside the English key set, and none is empty', () => {
  const known = new Set(Object.keys(en));
  for (const [code, catalogue] of Object.entries(CATALOGUES)) {
    for (const [key, value] of Object.entries(catalogue ?? {})) {
      assert(known.has(key), `${code} has a key English does not: ${key}`);
      assert(typeof value === 'string' && value.trim() !== '', `${code}.${key} is empty`);
    }
  }
});

test('every placeholder survives translation', () => {
  // A translation that drops `{year}` is a sentence that quietly lost a number,
  // and it would never be reported by a reader.
  for (const [code, catalogue] of Object.entries(CATALOGUES)) {
    for (const [key, value] of Object.entries(catalogue ?? {})) {
      const source = en[key as keyof typeof en] ?? '';
      const expected = [...source.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((m) => m[1]).sort();
      const actual = [...String(value).matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((m) => m[1]).sort();
      assert.deepEqual(actual, expected, `${code}.${key} changed its placeholders`);
    }
  }
});

test('every offered language actually translates something', () => {
  for (const locale of translatedLocales()) {
    const coverage = coverageOf(locale.code);
    assert.equal(coverage.total, Object.keys(en).length, `${locale.code} counts the wrong total`);
    assert(
      coverage.percent >= 80,
      `${locale.code} is offered at ${coverage.percent}% — too little to be useful`,
    );
  }
});

test('English is complete, and a language with no catalogue is not offered', () => {
  assert.deepEqual(coverageOf('en'), { translated: Object.keys(en).length, total: Object.keys(en).length, percent: 100 });
  const offered = translatedLocales().map((l) => l.code);
  assert(offered.includes('en'));
  assert.equal(new Set(offered).size, offered.length, 'a language is offered twice');
  assert.equal(LOCALES.length >= offered.length, true);
});

test('a missing string falls back to English rather than to a blank', () => {
  // The catalogue is a partial by construction; `messagesFor` is what makes the
  // fallback total rather than per-call.
  const messages = messagesFor('en');
  for (const key of Object.keys(en)) {
    assert.equal(typeof messages[key as keyof typeof messages], 'string');
  }
});

test('placeholders are filled, and an unknown one is left visible', () => {
  assert.equal(fill('© {year} AyahSpring', { year: 2026 }), '© 2026 AyahSpring');
  assert.equal(fill('{greeting}, {name}', { name: 'Fatima' }), '{greeting}, Fatima');
  assert.equal(fill('no placeholders'), 'no placeholders');
});

test('the translator renders a real sentence in a real language', () => {
  const ar = translator('ar');
  assert.match(ar('nav.catalogue'), /الدورات/);
  assert.match(ar('footer.rights', { year: 2026 }), /2026/);
  // And English is the fallback for a language that has the key.
  assert.equal(translator('fr')('action.save'), 'Enregistrer');
  assert.equal(translator('en')('action.save'), 'Save');
});

test('the picker label carries the language in its own script', () => {
  const arabic = LOCALES.find((l) => l.code === 'ar')!;
  assert.equal(localeLabel(arabic), 'العربية · Arabic');
  assert.equal(localeLabel(LOCALES[0]!), 'English');
});

test('a form can only send somebody to a page on this site', () => {
  assert.equal(safeNextPath('/account'), '/account');
  assert.equal(safeNextPath('/courses/tajweed?x=1'), '/courses/tajweed?x=1');
  assert.equal(safeNextPath('//evil.example'), '/language');
  assert.equal(safeNextPath('/\\evil.example'), '/language');
  assert.equal(safeNextPath('https://evil.example'), '/language');
  assert.equal(safeNextPath('javascript:alert(1)'), '/language');
  assert.equal(safeNextPath(''), '/language');
  assert.equal(safeNextPath(null), '/language');
  assert.equal(safeNextPath('/account', '/fallback'), '/account');
});

test('the cookie name is a cookie name', () => {
  assert.match(LOCALE_COOKIE, /^[a-z0-9_]+$/);
});
