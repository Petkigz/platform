import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  A11Y_BOOT,
  A11Y_COOKIE,
  DEFAULTS,
  describePreferences,
  encodePreferences,
  htmlAttributes,
  isDefault,
  parsePreferences,
  preferenceCookie,
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

  it('describes what is on, in words a person reads', () => {
    assert.match(describePreferences(DEFAULTS), /Normal text size, normal contrast/);
    assert.match(
      describePreferences({ text: 'larger', contrast: 'high', motion: 'reduce' }),
      /Largest text, stronger outlines, motion always reduced/,
    );
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
