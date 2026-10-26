import assert from 'node:assert/strict';
import test from 'node:test';

import {
  breadcrumbJsonLd,
  courseJsonLd,
  escapeJsonLd,
  formatPrice,
  organisationJsonLd,
  serialise,
  websiteJsonLd,
  type CourseFacts,
} from './structured-data.ts';

const facts = (over: Partial<CourseFacts> = {}): CourseFacts => ({
  title: 'The pillars of Islam',
  description: 'Five lessons on the pillars, for adults beginning the faith.',
  path: '/courses/the-pillars',
  language: 'en',
  subjects: ['Aqeedah'],
  level: 'Beginner',
  lessons: ['What a pillar is', 'Shahadah', 'Salah', 'Zakah', 'Sawm'],
  offer: { amountMinor: '4900', currency: 'GBP' },
  rating: { average: 4.666, count: 12 },
  teacherName: 'Fatima Nur',
  ...over,
});

const origin = 'https://ayahspring.example';

test('a course is marked up from the row, not from a summary', () => {
  const out = courseJsonLd(facts(), origin);

  assert.equal(out['@type'], 'Course');
  assert.equal(out.name, 'The pillars of Islam');
  assert.equal(out.url, `${origin}/courses/the-pillars`);
  assert.equal(out.inLanguage, 'en');
  assert.equal(out.courseMode, 'online');
});

test('with no configured origin the URL is a path, never a guessed domain', () => {
  const out = courseJsonLd(facts(), null);

  assert.equal(out.url, '/courses/the-pillars');
  assert.deepEqual((out.provider as Record<string, unknown>).url, undefined);
});

test('the lessons are the real lesson names', () => {
  const out = courseJsonLd(facts(), origin);
  const parts = out.hasPart as Array<{ name: string; position: number }>;

  assert.equal(parts.length, 5);
  assert.equal(parts[0]!.name, 'What a pillar is');
  assert.equal(parts[4]!.position, 5);
  assert.ok(parts.every((p) => !/^Lesson \d+$/.test(p.name)), 'a placeholder name reached the markup');
});

test('a course with no summary carries no description, not an empty string', () => {
  assert.equal(courseJsonLd(facts({ description: null }), origin).description, undefined);
  assert.equal(courseJsonLd(facts({ description: '   ' }), origin).description, undefined);
  assert.equal(courseJsonLd(facts(), origin).description, 'Five lessons on the pillars, for adults beginning the faith.');
});

test('a course with no lessons carries no hasPart rather than an empty list', () => {
  assert.equal(courseJsonLd(facts({ lessons: [] }), origin).hasPart, undefined);
});

test('the price is the price the page showed, in major units', () => {
  const out = courseJsonLd(facts(), origin);
  const offer = out.offers as Record<string, unknown>;

  assert.equal(offer.price, '49.00');
  assert.equal(offer.priceCurrency, 'GBP');
  assert.equal(offer.availability, 'https://schema.org/InStock');
});

test('a currency with no minor unit is not marked up at a hundred times its price', () => {
  const out = courseJsonLd(facts({ offer: { amountMinor: '45000', currency: 'UGX' } }), origin);

  assert.equal((out.offers as Record<string, unknown>).price, '45000');
});

test('a currency with three decimal places keeps all three', () => {
  const out = courseJsonLd(facts({ offer: { amountMinor: '1250', currency: 'KWD' } }), origin);

  assert.equal((out.offers as Record<string, unknown>).price, '1.250');
});

test('no price shown means no offer — not an offer of zero', () => {
  const out = courseJsonLd(facts({ offer: null }), origin);

  assert.equal(out.offers, undefined, 'a course with no price for this reader was marked up as free');
});

test('a malformed amount is no offer, because free is a different claim', () => {
  assert.equal(formatPrice('12.5', 'GBP'), null);
  assert.equal(formatPrice('nonsense', 'GBP'), null);
  assert.equal(courseJsonLd(facts({ offer: { amountMinor: '12.5', currency: 'GBP' } }), origin).offers, undefined);
});

test('ratings appear only when somebody has rated', () => {
  const rated = courseJsonLd(facts(), origin).aggregateRating as Record<string, unknown>;
  assert.equal(rated.ratingValue, 4.7, 'a repeating decimal is rounded to one place');
  assert.equal(rated.reviewCount, 12);

  assert.equal(courseJsonLd(facts({ rating: { average: 0, count: 0 } }), origin).aggregateRating, undefined);
  assert.equal(courseJsonLd(facts({ rating: null }), origin).aggregateRating, undefined);
});

test('a teacher is named only when the page names one', () => {
  const named = courseJsonLd(facts(), origin);
  assert.deepEqual(named.instructor, { '@type': 'Person', name: 'Fatima Nur' });

  const silent = courseJsonLd(facts({ teacherName: null }), origin);
  assert.equal(silent.instructor, undefined);
  assert.equal(silent.author, undefined);
});

test('the course is marked up with nothing it does not promise', () => {
  const out = courseJsonLd(facts(), origin);

  for (const absent of ['hasCourseInstance', 'coursePrerequisites', 'educationalCredentialAwarded', 'timeRequired']) {
    assert.equal(out[absent], undefined, `${absent} is a claim the platform cannot make`);
  }
});

test('a title containing a script tag cannot close the script element', () => {
  const out = serialise(courseJsonLd(facts({ title: '</script><img src=x onerror=alert(1)>' }), origin));

  assert.ok(!out.includes('</script>'), 'the payload can escape its element');
  assert.ok(!out.includes('<img'), 'the payload contains live markup');
  assert.ok(out.includes('\\u003c'), 'the angle bracket was not escaped');
});

test('a line separator inside a description is escaped, so a JS parser cannot break', () => {
  const out = serialise({ description: 'one\u2028two\u2029three' });

  assert.ok(!out.includes('\u2028'));
  assert.ok(out.includes('\\u2028'));
});

test('escaping leaves the content intact when parsed back', () => {
  const original = { name: 'A < b & c > d', nested: ['</script>'] };
  const round = JSON.parse(escapeJsonLd(JSON.stringify(original)).replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&'));

  assert.deepEqual(round, original);
});

test('the organisation names itself and points at its logo only with a known origin', () => {
  const withOrigin = organisationJsonLd(origin);
  assert.equal(withOrigin.name, 'AyahSpring');
  assert.equal(withOrigin['@type'], 'EducationalOrganization');
  assert.equal(withOrigin.logo, `${origin}/icon.svg`);

  const without = organisationJsonLd(null);
  assert.equal(without.logo, undefined, 'a relative logo is a broken image to a crawler');
  assert.equal(without.url, undefined);
});

test('the site graph and the organisation are separate things', () => {
  assert.equal(websiteJsonLd(origin)['@type'], 'WebSite');
  assert.equal(websiteJsonLd(origin).name, 'AyahSpring');
});

test('a breadcrumb counts from one, in the order the reader walked it', () => {
  const out = breadcrumbJsonLd(
    [
      { name: 'Home', path: '/' },
      { name: 'Catalogue', path: '/catalogue' },
      { name: 'The pillars of Islam', path: '/courses/the-pillars' },
    ],
    origin,
  );
  const items = out.itemListElement as Array<Record<string, unknown>>;

  assert.deepEqual(items.map((i) => i.position), [1, 2, 3]);
  assert.equal(items[0]!.item, `${origin}/`);
  assert.equal(items[2]!.name, 'The pillars of Islam');
});
