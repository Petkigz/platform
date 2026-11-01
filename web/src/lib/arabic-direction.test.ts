import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LOCALES, localeByCode } from './i18n/locales.ts';

/**
 * The page opens in the reader's direction, and the layout follows it.
 *
 * `arabic.test.ts` covers what a piece of text is; `arabic-wiring.test.ts`
 * covers whether the screens mark it. This file covers the third thing, the one
 * with no runtime behaviour to test: the *shape* of the page. A translated page
 * in a right-to-left language is not only different words — the whole document
 * is laid out from the other edge, and the only way to be wrong is quietly. An
 * Arabic screen with a left-hand margin looks fine to everybody who opens it in
 * English, which is everybody who reviews it.
 *
 * So these assertions are about the mechanisms rather than about a screen: the
 * document declares its direction, the stylesheet has no physical edge, the
 * three things a logical property cannot move are moved by hand, and
 * `scripts/repo-check.mjs` fails the build when a fourth appears.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const globals = read('../app/globals.css');
const layout = read('../app/layout.tsx');
const repoCheck = read('../../../scripts/repo-check.mjs');

test('the document declares the direction of the reader’s language', () => {
  // `dir` on `<html>` is what makes a logical property mean anything at all:
  // without it, `margin-inline-start` is `margin-left` on every page.
  assert.match(
    layout,
    /<html lang=\{[^}]+\} dir=\{directionOf\(/,
    'layout.tsx no longer sets dir on <html>, so the layout has no writing direction',
  );
});

test('every locale states a direction, and the ones that write right to left say so', () => {
  const rtl = LOCALES.filter((locale) => locale.dir === 'rtl').map((locale) => locale.code);
  assert.deepEqual(rtl.sort(), ['ar', 'dv', 'fa', 'fa-af', 'ps', 'ur'], 'the right-to-left languages changed');

  for (const locale of LOCALES) {
    assert.ok(
      locale.dir === 'ltr' || locale.dir === 'rtl',
      `${locale.code} has no direction, so directionOf() guesses`,
    );
  }

  // Arabic, Urdu, Persian, Pashto, Dari and Dhivehi. Any other locale claiming
  // `rtl` would flip a page whose text runs left to right, and any of these
  // dropping it would print their punctuation at the wrong end of the line.
  for (const code of rtl) {
    assert.equal(localeByCode(code).dir, 'rtl');
  }
});

test('the stylesheet holds no physical edge to be left behind', () => {
  // The same rule the build enforces, restated here so that a person reading
  // this file learns it without running the whole repository check. Anything
  // this misses is caught by `scripts/repo-check.mjs`, which reads every
  // component as well.
  assert.doesNotMatch(globals, /[^-](margin|padding)-(left|right)\s*:/, 'a margin or padding names an edge');
  assert.doesNotMatch(globals, /[^-]border-(left|right)\s*:/, 'a border names an edge');
  assert.doesNotMatch(globals, /text-align:\s*(left|right)\b/, 'text is aligned to the paper, not the writing');
  assert.doesNotMatch(globals, /float:\s*(left|right)\b/, 'something is floated to the paper');
});

test('the three things a logical property cannot move are moved by hand', () => {
  // 1. A glyph that points. `›` is one character in forty-six breadcrumb navs;
  //    mirroring it in the stylesheet keeps that at one rule rather than forty-six.
  assert.match(
    globals,
    /\[dir='rtl'\] \.dir-flip,[\s\S]{0,120}?transform: scaleX\(-1\);/,
    'a pointing glyph is no longer mirrored, so a breadcrumb chevron points forward in Arabic',
  );

  // 2. A transform. The toggle's knob travels on the x axis, which has no
  //    logical form: `inset-inline-start` places it and this rule carries it.
  assert.match(
    globals,
    /\[dir='rtl'\] \.switch\.on > span \{ transform: translateX\(-1\.15rem\); \}/,
    'the on/off knob no longer travels the other way in a right-to-left page',
  );

  // 3. A number. A phone number, an amount and a dialling code are Latin and
  //    ordered left to right even when the sentence around them is not.
  assert.match(
    globals,
    /\[dir='rtl'\] input\[type='tel'\][\s\S]{0,400}?direction: ltr;/,
    'a phone number can be reordered in an Arabic page, which is a wrong number',
  );
  assert.match(
    globals,
    /\[dir='rtl'\] input\[inputmode='numeric' i\]/,
    'an amount field is no longer pinned to left-to-right digits',
  );
});

test('the build fails when a screen reintroduces a physical edge', () => {
  // The check is the reason this file exists rather than being nice to read: a
  // rule nobody reruns is a rule that lasts until the next screen.
  assert.match(repoCheck, /12\. The layout is written in logical properties/, 'the direction check is gone');
  assert.match(repoCheck, /const PHYSICAL_CSS = \[/, 'the CSS half of the direction check is gone');
  assert.match(repoCheck, /marginLeft\|marginRight\|paddingLeft\|paddingRight\|borderLeft\|borderRight/, 'the inline-style half of the direction check is gone');
  assert.match(repoCheck, /Asymmetric|asymmetric shorthand/, 'the shorthand half of the direction check is gone');
  // A check that scans nothing passes for the wrong reason.
  assert.match(repoCheck, /no \.tsx files were scanned/, 'the direction check no longer notices an empty scan');
});
