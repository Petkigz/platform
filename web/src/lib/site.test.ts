import assert from 'node:assert/strict';
import test from 'node:test';

import { siteOrigin, verificationAddress } from './site.ts';

test('a configured origin is used as it is', () => {
  assert.equal(siteOrigin('https://ayahspring.com'), 'https://ayahspring.com');
  assert.equal(siteOrigin('https://ayahspring.example.org'), 'https://ayahspring.example.org');
});

test('a trailing slash does not produce a double slash', () => {
  assert.equal(siteOrigin('https://ayahspring.com/'), 'https://ayahspring.com');
  assert.equal(siteOrigin('https://ayahspring.com///'), 'https://ayahspring.com');
  assert.equal(siteOrigin('  https://ayahspring.com/  '), 'https://ayahspring.com');
});

test('anything that is not an http origin is refused', () => {
  // A printed certificate carrying a javascript: or an ftp: address would be
  // worse than one carrying no address at all.
  assert.equal(siteOrigin('javascript:alert(1)'), null);
  assert.equal(siteOrigin('ftp://ayahspring.com'), null);
  assert.equal(siteOrigin('ayahspring.com'), null);
  assert.equal(siteOrigin('https://ayahspring.com/verify'), null);
  assert.equal(siteOrigin('https://ayahspring.com?x=1'), null);
  assert.equal(siteOrigin(''), null);
  assert.equal(siteOrigin('   '), null);
  assert.equal(siteOrigin(undefined), null);
  assert.equal(siteOrigin(null), null);
});

test('without a configured origin the address is the path, not a guess', () => {
  const saved = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(verificationAddress('AS-2026-00000001'), '/verify/AS-2026-00000001');

    process.env.NEXT_PUBLIC_SITE_URL = 'https://ayahspring.com';
    assert.equal(
      verificationAddress('AS-2026-00000001'),
      'https://ayahspring.com/verify/AS-2026-00000001',
    );

    // An invalid value is no value.
    process.env.NEXT_PUBLIC_SITE_URL = 'not a url';
    assert.equal(verificationAddress('AS-2026-00000001'), '/verify/AS-2026-00000001');
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = saved;
  }
});
