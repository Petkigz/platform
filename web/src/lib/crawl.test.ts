import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSitemap,
  canonicalCataloguePath,
  DISALLOWED_PREFIXES,
  GATED_ROUTES,
  isDisallowed,
  PUBLIC_ROUTES,
  robotsTxt,
} from './crawl.ts';

test('robots.txt allows the site, refuses the private surfaces, and names the sitemap', () => {
  const text = robotsTxt('https://ayahspring.example/sitemap.xml');

  assert.match(text, /^User-agent: \*\nAllow: \/\n/);
  assert.match(text, /^Disallow: \/api\/$/m);
  assert.match(text, /^Disallow: \/admin$/m);
  assert.match(text, /Sitemap: https:\/\/ayahspring\.example\/sitemap\.xml$/m);

  // The verification form must stay crawlable: the `noindex` on the result page
  // can only be read if the page is fetched.
  assert.ok(!text.includes('Disallow: /verify'));
});

test('a sitemap line is only written when there is an absolute address', () => {
  const text = robotsTxt(null);
  assert.ok(!text.includes('Sitemap:'), 'a relative sitemap URL was emitted');
  assert.match(text, /User-agent: \*/, 'the rules are still published without a sitemap');
});

test('a prefix is refused on its own segment, never as a substring', () => {
  assert.equal(isDisallowed('/admin'), true);
  assert.equal(isDisallowed('/admin/users'), true);
  assert.equal(isDisallowed('/admin/users?page=2'), true);
  assert.equal(isDisallowed('/administration'), false, 'a longer word is not the same section');
  assert.equal(isDisallowed('/learn'), true);
  assert.equal(isDisallowed('/learning-paths'), false);
  assert.equal(isDisallowed('/catalogue'), false);
});

test('the API prefix is matched with its trailing slash and without it', () => {
  assert.equal(isDisallowed('/api/'), true);
  assert.equal(isDisallowed('/api/session'), true);
});

test('nothing public is accidentally disallowed', () => {
  for (const route of PUBLIC_ROUTES) {
    assert.equal(isDisallowed(route.path), false, `${route.path} is public but disallowed`);
  }
});

test('no origin means no sitemap, rather than one full of relative URLs', () => {
  assert.deepEqual(buildSitemap(null, { dynamic: [{ path: '/courses/tajweed' }], enabledFlags: new Set() }), []);
});

test('the sitemap carries the public pages as absolute URLs', () => {
  const entries = buildSitemap('https://ayahspring.example', {
    dynamic: [],
    enabledFlags: new Set(),
  });
  const urls = entries.map((e) => e.url);

  assert.deepEqual(urls, PUBLIC_ROUTES.map((r) => `https://ayahspring.example${r.path}`));
  assert.ok(entries.every((e) => e.url.startsWith('https://')));
});

test('dynamic pages join the sitemap and keep their last-modified date', () => {
  const when = new Date('2026-10-01T00:00:00Z');
  const entries = buildSitemap('https://ayahspring.example', {
    dynamic: [{ path: '/courses/tajweed', lastModified: when }, { path: '/teachers/amina' }],
    enabledFlags: new Set(),
  });

  const course = entries.find((e) => e.url.endsWith('/courses/tajweed'));
  assert.ok(course);
  assert.equal(course.lastModified, when);
  assert.equal(course.changeFrequency, 'weekly');

  const teacher = entries.find((e) => e.url.endsWith('/teachers/amina'));
  assert.ok(teacher);
  assert.equal(teacher.lastModified, undefined);
});

test('a private or relative path cannot reach the sitemap', () => {
  const entries = buildSitemap('https://ayahspring.example', {
    dynamic: [
      { path: '/admin/users' },
      { path: '/learn' },
      { path: 'courses/tajweed' },
      { path: '/courses/tajweed' },
    ],
    enabledFlags: new Set(),
  });

  const urls = entries.map((e) => e.url);
  assert.equal(urls.filter((u) => u.includes('/admin')).length, 0);
  assert.equal(urls.filter((u) => u.endsWith('/learn')).length, 0);
  assert.equal(urls.filter((u) => u.includes('courses/tajweed')).length, 1, 'a relative path was published');
});

test('a page listed twice appears once', () => {
  const entries = buildSitemap('https://ayahspring.example', {
    dynamic: [{ path: '/courses/one' }, { path: '/courses/one' }, { path: '/about' }],
    enabledFlags: new Set(),
  });

  const urls = entries.map((e) => e.url);
  assert.equal(new Set(urls).size, urls.length);
  assert.equal(urls.filter((u) => u.endsWith('/about')).length, 1);
});

test('the canonical catalogue drops tracking junk, `all`, and page one', () => {
  assert.equal(canonicalCataloguePath({}), '/catalogue');
  assert.equal(canonicalCataloguePath({ subject: 'all', audience: 'all' }), '/catalogue');
  assert.equal(canonicalCataloguePath({ page: '1' }), '/catalogue');
  assert.equal(canonicalCataloguePath({ q: '  ' }), '/catalogue');
});

test('the canonical catalogue keeps what changes the shelf, in a fixed order', () => {
  assert.equal(
    canonicalCataloguePath({ subject: 'quran', page: '2', audience: 'child' }),
    '/catalogue?subject=quran&audience=child&page=2',
  );
  // Two spellings of the same filter are one address.
  assert.equal(
    canonicalCataloguePath({ audience: 'child', subject: 'quran' }),
    canonicalCataloguePath({ subject: 'quran', audience: 'child' }),
  );
});

test('a nonsense page number is dropped rather than echoed', () => {
  assert.equal(canonicalCataloguePath({ page: '0' }), '/catalogue');
  assert.equal(canonicalCataloguePath({ page: 'abc' }), '/catalogue');
  assert.equal(canonicalCataloguePath({ page: '-3' }), '/catalogue');
});

test('a gated page is absent while its switch is off', () => {
  const urls = buildSitemap('https://ayahspring.example', {
    dynamic: [],
    enabledFlags: new Set(),
  }).map((e) => e.url);

  for (const route of GATED_ROUTES) {
    assert.equal(urls.some((url) => url.endsWith(route.path)), false, `${route.path} was published while off`);
  }
});

test('a gated page appears when its switch is on, and only then', () => {
  const on = buildSitemap('https://ayahspring.example', {
    dynamic: [],
    enabledFlags: new Set(['learning.audience_sections']),
  }).map((e) => e.url);

  // Both doors share the one switch.
  assert.ok(on.some((url) => url.endsWith('/young')));
  assert.ok(on.some((url) => url.endsWith('/adults')));

  // Their siblings have their own switches, which are still off.
  assert.equal(on.some((url) => url.endsWith('/plans')), false);
  assert.equal(on.some((url) => url.endsWith('/paths')), false);
});

test('every gated route names a flag', () => {
  for (const route of GATED_ROUTES) {
    assert.match(route.flag, /^(learning|teaching|commerce|admin)\./, `${route.path} has no real flag`);
  }
});

test('every disallowed prefix begins with a slash', () => {
  for (const prefix of DISALLOWED_PREFIXES) {
    assert.ok(prefix.startsWith('/'), `${prefix} is not a path`);
  }
});
