import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import {
  A11Y_BOOT,
  A11Y_COOKIE,
  CONTRASTS,
  DEFAULTS,
  MOTIONS,
  TEXT_SIZES,
  encodePreferences,
  htmlAttributes,
  isDefault,
  parsePreferences,
  preferenceCookie,
  preferencesInCookie,
  samePreferences,
  wantsLessMotion,
} from './a11y.ts';

describe('reading preferences', () => {
  it('round-trips through the cookie value', () => {
    const prefs = { text: 'larger', contrast: 'high', motion: 'reduce' } as const;
    assert.deepEqual(parsePreferences(encodePreferences(prefs)), prefs);
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
    assert.deepEqual(htmlAttributes({ text: 'large', contrast: 'normal', motion: 'system' }), {
      'data-text': 'large',
    });
    assert.deepEqual(htmlAttributes({ text: 'normal', contrast: 'high', motion: 'reduce' }), {
      'data-contrast': 'high',
      'data-motion': 'reduce',
    });
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
    const prefs = { text: 'large', contrast: 'high', motion: 'reduce' } as const;
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
    assert.doesNotMatch(controls, /useT|@\/lib\/i18n|'reading\./);
    assert.match(controls, /words: ReadingWords/);
  });

  it('writes a cookie that lasts a year and stays on this site', () => {
    const cookie = preferenceCookie({ text: 'large', contrast: 'high', motion: 'reduce' });
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
});
