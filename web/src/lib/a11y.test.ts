import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import {
  A11Y_BOOT,
  A11Y_COOKIE,
  CONTRASTS,
  DEFAULTS,
  LETTERS,
  LETTERS_NOT_FOR,
  MOTIONS,
  TEXT_SIZES,
  encodePreferences,
  htmlAttributes,
  isDefault,
  lettersReach,
  parsePreferences,
  preferenceCookie,
  preferencesInCookie,
  samePreferences,
  wantsLessMotion,
} from './a11y.ts';

describe('reading preferences', () => {
  it('round-trips through the cookie value', () => {
    const prefs = { text: 'larger', contrast: 'high', motion: 'reduce', letters: 'normal' } as const;
    assert.deepEqual(parsePreferences(encodePreferences(prefs)), prefs);
    const other = { ...prefs, letters: 'dyslexic' } as const;
    assert.deepEqual(parsePreferences(encodePreferences(other)), other);
  });

  it('keeps the cookie it always wrote, and reads an old one as the device\'s letters', () => {
    // The fourth setting (2026-11-27) is a fifth part, written only when chosen.
    assert.equal(encodePreferences({ text: 'large', contrast: 'high', motion: 'reduce', letters: 'normal' }), 'v1.large.high.reduce');
    assert.equal(encodePreferences({ ...DEFAULTS, letters: 'dyslexic' }), 'v1.normal.normal.system.dyslexic');
    assert.equal(parsePreferences('v1.large.high.reduce').letters, 'normal');
    assert.equal(parsePreferences('v1.large.high.reduce.dyslexic').letters, 'dyslexic');
    assert.equal(parsePreferences('v1.large.high.reduce.comic').letters, 'normal');
    assert.deepEqual(LETTERS, ['normal', 'dyslexic']);
    assert.equal(isDefault({ ...DEFAULTS, letters: 'dyslexic' }), false);
    assert.equal(samePreferences(DEFAULTS, { ...DEFAULTS, letters: 'dyslexic' }), false);
    assert.deepEqual(htmlAttributes({ ...DEFAULTS, letters: 'dyslexic' }), { 'data-letters': 'dyslexic' });
    assert.match(A11Y_BOOT, /p\[4\]==='dyslexic'\)h\.setAttribute\('data-letters','dyslexic'\)/);
  });

  it('carries the font it offers, with its licence, and asks for it only when chosen', () => {
    const folder = new URL('../../public/fonts/opendyslexic/', import.meta.url);
    for (const file of ['OpenDyslexic-Regular.woff2', 'OpenDyslexic-Bold.woff2']) {
      const bytes = readFileSync(new URL(file, folder));
      assert.equal(bytes.subarray(0, 4).toString('latin1'), 'wOF2', file);
      assert.ok(bytes.length > 50_000, file);
    }
    const licence = readFileSync(new URL('OFL.txt', folder), 'utf8');
    assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.match(licence, /Reserved Font Name OpenDyslexic/);
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
    assert.equal([...css.matchAll(/font-family: 'OpenDyslexic';\n {2}src: url\('\/fonts\/opendyslexic\/OpenDyslexic-(Regular|Bold)\.woff2'\) format\('woff2'\);/g)].length, 2);
    // Only under the attribute: the plain page names the font nowhere else.
    const uses = css.split('\n').filter((line) => line.includes("'OpenDyslexic'") && !line.includes('font-family:'));
    assert.equal(uses.length, 1);
    assert.match(css, /--font-letters: 'OpenDyslexic', var\(--font-device\);/);
    assert.match(css, /html\[data-letters='dyslexic'\]:not\([^{]*\) \{\n {2}--font: var\(--font-letters\);/);
    // A font is sent without asking who is signed in.
    const middleware = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8');
    assert.match(middleware, /\(\?!_next\/static\|_next\/image\|fonts\/\|/);
    // It has no Arabic letters, and is not offered any.
    assert.doesNotMatch(css.match(/unicode-range: [^;]+;/)?.[0] ?? 'U+0600', /U\+06/);
  });

  it('reads nothing as the platform defaults', () => {
    assert.deepEqual(parsePreferences(null), DEFAULTS);
    assert.deepEqual(parsePreferences(''), DEFAULTS);
    assert.deepEqual(parsePreferences('v2.large'), DEFAULTS);
  });

  it('ignores a value it does not know rather than throwing', () => {
    assert.equal(parsePreferences('v1.huge.high.reduce').text, 'normal');
    assert.equal(parsePreferences('v1.large.nope.system').contrast, 'normal');
    assert.equal(parsePreferences('v1.large.high.wobble').motion, 'system');
  });

  it('sets no attributes at the defaults, so the plain page stays plain', () => {
    assert.deepEqual(htmlAttributes(DEFAULTS), {});
    assert.equal(isDefault(DEFAULTS), true);
  });

  it('sets one attribute per changed preference', () => {
    assert.deepEqual(htmlAttributes({ text: 'large', contrast: 'normal', motion: 'system', letters: 'normal' }), {
      'data-text': 'large',
    });
    assert.deepEqual(htmlAttributes({ text: 'normal', contrast: 'high', motion: 'reduce', letters: 'normal' }), {
      'data-contrast': 'high',
      'data-motion': 'reduce',
    });
  });

  it('leaves a language of another script as it was', async () => {
    const { LOCALES } = await import('./i18n/locales.ts');
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
    // The stylesheet and this file name the same languages, in the same order.
    const list = LETTERS_NOT_FOR.map((code) => `:lang(${code})`).join(', ');
    const not = `:not(${list})`;
    const is = `:is(${list})`;
    for (const rule of [
      `html[data-letters='dyslexic']${not} {`,
      `html[data-letters='dyslexic']${not} body {`,
      `html[data-letters='dyslexic']${not} .card {`,
      `html[data-letters='dyslexic'] [lang]${is}:not(.arabic) { font-family: var(--font-device); }`,
      `html[data-letters='dyslexic']${is} [lang]${not}:not(.arabic) {`,
    ]) assert.ok(css.includes(rule), rule);
    // Nothing turns the font on for every language: each rule that does names the list.
    for (const line of css.split('\n')) {
      if (!line.trimStart().startsWith("html[data-letters='dyslexic']")) continue;
      assert.ok(line.includes(':lang(ar)'), line);
    }
    // Every language in the register is on the list, or is written in letters
    // the font has. Its own name says which.
    for (const locale of LOCALES) {
      const own = /^[\p{Script=Latin}\p{Script=Cyrillic}\p{M}\s'’ʻʼ().-]+$/u.test(locale.nativeName);
      assert.equal(lettersReach(locale.code), own, `${locale.code} (${locale.nativeName})`);
    }
    assert.equal(lettersReach('fa-af'), false);
    assert.equal(lettersReach('zh-hant'), false);
    assert.equal(lettersReach('en'), true);
    assert.equal(lettersReach('kk'), true);
    // A code that only begins the same way is another language.
    assert.equal(lettersReach('tiv'), true);
    assert.equal(lettersReach('AR'), false);
  });

  it('has no sentences of its own', () => {
    // The names of the choices and the sentence under each come from the
    // catalogue, in the reader's language. This file is imported by a client
    // component and used to carry them in English for every reader.
    assert.deepEqual(TEXT_SIZES, ['normal', 'large', 'larger']);
    assert.deepEqual(CONTRASTS, ['normal', 'high']);
    assert.deepEqual(MOTIONS, ['system', 'reduce']);
    const source = readFileSync(new URL('./a11y.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /label:|note:|describePreferences/);
  });

  it('reads the settings back out of a cookie string, or says there are none', () => {
    const prefs = { text: 'large', contrast: 'high', motion: 'reduce', letters: 'normal' } as const;
    const cookie = preferenceCookie(prefs).split(';')[0];
    assert.deepEqual(preferencesInCookie(`other=1; ${cookie}; more=2`), prefs);
    assert.deepEqual(preferencesInCookie(cookie), prefs);
    // A browser that refuses cookies keeps nothing: that is `null`, not the
    // defaults, so the page does not say "saved".
    assert.equal(preferencesInCookie(''), null);
    assert.equal(preferencesInCookie(null), null);
    assert.equal(preferencesInCookie('other=1'), null);
    // A name that only ends the same way is somebody else's cookie.
    assert.equal(preferencesInCookie(`x${A11Y_COOKIE}=v1.large.high.reduce`), null);
    // A value that cannot be decoded is not a reason to throw.
    assert.equal(preferencesInCookie(`${A11Y_COOKIE}=%E0%A4%A`), null);
  });

  it('tells two sets of settings apart', () => {
    assert.equal(samePreferences(DEFAULTS, { ...DEFAULTS }), true);
    assert.equal(samePreferences(DEFAULTS, { ...DEFAULTS, text: 'large' }), false);
    assert.equal(samePreferences(DEFAULTS, { ...DEFAULTS, contrast: 'high' }), false);
    assert.equal(samePreferences(DEFAULTS, { ...DEFAULTS, motion: 'reduce' }), false);
  });

  it('asks for no less motion where there is no page to ask', () => {
    assert.equal(wantsLessMotion(), false);
  });

  it('is asked before a script scrolls, and the controls say saved only after reading back', () => {
    const manager = readFileSync(
      new URL('../app/teach/[courseId]/assignments/assignment-manager.tsx', import.meta.url),
      'utf8',
    );
    assert.match(manager, /behavior: wantsLessMotion\(\) \? 'auto' : 'smooth'/);
    assert.doesNotMatch(manager, /behavior: 'smooth'/);

    const controls = readFileSync(
      new URL('../app/account/accessibility/preferences.tsx', import.meta.url),
      'utf8',
    );
    assert.match(controls, /const back = preferencesInCookie\(document\.cookie\);/);
    assert.match(controls, /setSaid\(kept \? 'saved' : 'notKept'\)/);
    assert.match(controls, /role="alert"/);
    assert.match(controls, /role="status"/);
    // No words of its own, and no way to ask the catalogue for any.
    assert.doesNotMatch(controls, /useT|@\/lib\/i18n|'reading\.|'ease\./);
    assert.match(controls, /words: ReadingWords/);
  });

  it('writes a cookie that lasts a year and stays on this site', () => {
    const cookie = preferenceCookie({ text: 'large', contrast: 'high', motion: 'reduce', letters: 'normal' });
    assert.match(cookie, new RegExp(`^${A11Y_COOKIE}=v1\\.large\\.high\\.reduce`));
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /Max-Age=31536000/);
    assert.match(cookie, /SameSite=Lax/);
  });

  it('ships a boot script that reads the same cookie and checks the same values', () => {
    assert.match(A11Y_BOOT, new RegExp(A11Y_COOKIE));
    assert.match(A11Y_BOOT, /data-text/);
    assert.match(A11Y_BOOT, /data-contrast/);
    assert.match(A11Y_BOOT, /data-motion/);
    // It must be a statement, not a string that contains a script tag — the
    // layout injects it as the body of a script element.
    assert.doesNotMatch(A11Y_BOOT, /<\/script/i);
    assert.doesNotThrow(() => new Function(A11Y_BOOT));
  });

  it('tells React that the element the boot script writes on differs from what the server sent', () => {
    // The script sets attributes on <html> before React wakes up. React then
    // reports "a tree hydrated but some attributes ... didn't match" on every
    // page a reader with a preference opens (seen in a browser, 2026-11-28),
    // unless that one element says the difference is meant.
    const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
    assert.match(layout, /__html: A11Y_BOOT/);
    assert.match(layout, /<html lang=\{code\} dir=\{directionOf\(code\)\} suppressHydrationWarning>/);
    // And it is said nowhere else in the layout: a difference inside the page is still reported.
    assert.equal(layout.split('suppressHydrationWarning').length - 1, 1);
    // The script writes on that element and no other.
    assert.match(A11Y_BOOT, /var h=document\.documentElement;/);
    assert.equal(A11Y_BOOT.split('setAttribute').length - 1, A11Y_BOOT.split('h.setAttribute').length - 1);
  });
});
