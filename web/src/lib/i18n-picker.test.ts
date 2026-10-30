import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LOCALES, localeGroups, translatedLocales } from './i18n/index.ts';

/**
 * The language picker shows every language.
 *
 * This file exists because of a question a reader asked about the live page:
 * *"there's not a single Asian language — why?"* There were five, in the
 * register and in the dropdown, filed under **Asia**. The defect was the
 * dropdown: a native `<select>` opens on the top of its list, and the top of
 * this list was twenty-one African languages. On a phone, the other three
 * continents were below the fold of a scroll area that looks like it has no
 * more to give. The page was right and the page read as wrong, which is the same
 * thing.
 *
 * So the picker renders a block per region, every language a button, and these
 * tests hold it there: no `<select>` may come back, every block the register
 * defines must be drawn, and every choice must be a submit button inside one
 * plain form so the whole thing still works with JavaScript off.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const PAGE = read('../app/language/page.tsx');
const ROUTE = read('../app/api/locale/route.ts');
const CSS = read('../app/globals.css');

test('the picker is blocks of buttons, not one long dropdown', () => {
  // The regression this guards: 33 languages inside a `<select>` is 33
  // languages behind a scroll, and the first 21 of them are one continent.
  assert.doesNotMatch(PAGE, /<select[\s>]/u, 'the picker is back inside a dropdown');
  assert.doesNotMatch(PAGE, /<optgroup/u);
  assert.match(PAGE, /\{groups\.map\(\(group\) => \(/u);
  assert.match(PAGE, /\{group\.locales\.map\(\(locale\) => \(/u);
  // A heading per region, so a reader can see the shape of the list at a glance.
  assert.match(PAGE, /<h3 className="locale-block-title">\{t\(regionLabel\(group\.region\)\)\}<\/h3>/u);
});

test('Asia is a block, and it is not empty', () => {
  // The five that were there all along. Named individually, because "Asia is
  // present" is exactly the kind of assertion that passes while the thing a
  // reader wanted is missing.
  const asia = localeGroups().find((group) => group.region === 'Asia');
  assert.ok(asia, 'the register has no Asia block');
  // The five that were there all along, then the ten added across 2026-10-30 when
  // this question was asked: Central Asia and Afghanistan first, then South Asia
  // and Thailand. Named individually, because "Asia is present" is exactly the
  // assertion that passes while the thing a reader wanted is missing.
  assert.deepEqual(
    asia!.locales.map((l) => l.code),
    [
      'ur', 'id', 'ms', 'bn', 'hi',
      'uz', 'kk', 'az', 'ps', 'fa-af',
      'ta', 'ne', 'si', 'th', 'dv',
    ],
  );
  assert.deepEqual(
    asia!.locales.map((l) => l.englishName),
    [
      'Urdu', 'Indonesian', 'Malay', 'Bengali', 'Hindi',
      'Uzbek', 'Kazakh', 'Azerbaijani', 'Pashto', 'Dari',
      'Tamil', 'Nepali', 'Sinhala', 'Thai', 'Dhivehi',
    ],
  );
});

test('every language in the register reaches the picker', () => {
  // Nothing is filtered in the markup: the page maps over the groups the
  // register produces, so a language cannot be added to `locales.ts` and
  // silently left out of the only screen that offers it.
  assert.match(PAGE, /const groups = localeGroups\(\);/u);
  const offered = [...localeGroups().flatMap((g) => g.locales.map((l) => l.code)), 'en'];
  assert.equal(offered.length, translatedLocales().length);
  assert.deepEqual(offered.sort(), translatedLocales().map((l) => l.code).sort());
  // And no region is drawn with nothing in it.
  for (const group of localeGroups()) assert.ok(group.locales.length > 0);
});

test('the choice is a form post, so it works with JavaScript off', () => {
  assert.match(PAGE, /<form action="\/api\/locale" method="post">/u);
  assert.match(PAGE, /<input type="hidden" name="next" value="\/language" \/>/u);
  // One form, many submit buttons: the button that was pressed supplies the
  // language, which is what keeps this a no-JS control rather than a menu that
  // needs a client component.
  const choices = PAGE.match(/type="submit"\s+name="locale"\s+value="[^"]+"/gu) ?? [];
  assert.ok(choices.length >= 2, `only ${choices.length} choices submit a language`);
  assert.match(PAGE, /value="device"/u, 'the “my device’s language” choice is gone');
  assert.match(ROUTE, /const clears = chosen === 'device';/u);
  // The route refuses anything that is not a language in the register.
  assert.match(ROUTE, /if \(!clears && !isLocaleCode\(chosen\)\)/u);
});

test('the language in force is marked, and each name is in its own script', () => {
  // `aria-current` is the same marker the shelf's filters use, so the current
  // choice is announced rather than only coloured.
  assert.match(PAGE, /aria-current=\{code === locale\.code \? 'true' : undefined\}/u);
  assert.match(PAGE, /aria-current=\{code === 'en' \? 'true' : undefined\}/u);
  assert.match(PAGE, /aria-current=\{source === 'device' \? 'true' : undefined\}/u);
  // The native name carries `lang` and `dir`, so a screen reader switches voice
  // for the language it is naming — and Arabic does not set its name in LTR.
  assert.match(PAGE, /lang=\{locale\.code\} dir=\{locale\.dir\}/u);
  for (const locale of LOCALES) {
    assert.ok(locale.nativeName.length > 0, `${locale.code} has no native name`);
    assert.ok(['ltr', 'rtl'].includes(locale.dir), `${locale.code} has no direction`);
  }
});

test('every class the picker uses is a class the stylesheet defines', () => {
  // `check:repo` enforces this too; asserting it here keeps the failure next to
  // the change that causes it.
  const used = new Set(
    (PAGE.match(/className="([a-z][a-z0-9 -]*)"/gu) ?? []).flatMap((match) =>
      match
        .replace(/className="|"/gu, '')
        .split(' ')
        .filter(Boolean),
    ),
  );
  for (const name of used) {
    assert.match(CSS, new RegExp(`\\.${name}[\\s,{]`), `globals.css has no .${name}`);
  }
  assert.match(CSS, /\.locale-choice\[aria-current='true'\]/u);
});
