import assert from 'node:assert/strict';
import test from 'node:test';

import {
  offsetFor,
  pageCount,
  pageHref,
  pageNumber,
  PAGE_SIZE,
  rangeLabel,
} from './paging.ts';

test('a page number is a request and nonsense is page one', () => {
  assert.equal(pageNumber('3'), 3);
  assert.equal(pageNumber(3), 3);
  assert.equal(pageNumber(' 2 '), 2);

  // Everything a stale link, a hand-typed address or a crawler can produce.
  for (const junk of ['0', '-4', 'abc', '', '  ', '1.5', '1e9', 'NaN', 'Infinity', null, undefined, {}, true]) {
    assert.equal(pageNumber(junk), 1, `${String(junk)} was not page one`);
  }
});

test('a page number cannot exceed the shelf', () => {
  // Not an error: an address from an old bookmark should land somewhere sane
  // rather than asking the database for a billion rows.
  assert.equal(pageNumber('999999999999'), 10_000);
});

test('an offset is a multiple of the page size and never negative', () => {
  assert.equal(offsetFor(1), 0);
  assert.equal(offsetFor(2), PAGE_SIZE);
  assert.equal(offsetFor(-3), 0);
  assert.equal(offsetFor(0), 0);
});

test('pages are counted so the last one is not lost', () => {
  assert.equal(pageCount(0), 1, 'no results is one page, not zero');
  assert.equal(pageCount(1), 1);
  assert.equal(pageCount(PAGE_SIZE), 1);
  assert.equal(pageCount(PAGE_SIZE + 1), 2);
  assert.equal(pageCount(PAGE_SIZE * 3), 3);
  assert.equal(pageCount(-5), 1);
});

test('the label says the total when everything fits, and the slice when it does not', () => {
  assert.equal(rangeLabel(0, 5, 5), '5 courses');
  assert.equal(rangeLabel(0, 1, 1), '1 course');
  assert.equal(rangeLabel(0, PAGE_SIZE, 137), `Showing 1\u2013${PAGE_SIZE} of 137`);
  assert.equal(rangeLabel(PAGE_SIZE, 24, 48), `Showing ${PAGE_SIZE + 1}\u2013${PAGE_SIZE * 2} of 48`);
});

test('the label is silent when there is nothing to say', () => {
  assert.equal(rangeLabel(0, 0, 0), '');
  assert.equal(rangeLabel(0, 0, 10), '', 'an empty page has no range');
});

test('a paging link keeps every filter', () => {
  const href = pageHref('/catalogue', { q: 'tafsir', subject: 'quran', audience: 'child' }, 2);
  assert.equal(href, '/catalogue?q=tafsir&subject=quran&audience=child&page=2');
});

test('page one has exactly one address', () => {
  assert.equal(pageHref('/catalogue', {}, 1), '/catalogue');
  // `page=1` is never written, so `/catalogue` and `/catalogue?page=1` cannot
  // become two bookmarks for one page.
  assert.equal(pageHref('/catalogue', { page: 2 }, 1), '/catalogue');
});

test('"all" and blanks never reach a link', () => {
  assert.equal(pageHref('/catalogue', { subject: 'all', q: '  ', band: undefined }, 2), '/catalogue?page=2');
});

test('odd characters in a filter are encoded, not pasted through', () => {
  const href = pageHref('/catalogue', { q: 'a&b=c' }, 2);
  assert.equal(href, '/catalogue?q=a%26b%3Dc&page=2');
  // And it survives a round trip.
  const parsed = new URL(href, 'https://example.test').searchParams;
  assert.equal(parsed.get('q'), 'a&b=c');
  assert.equal(parsed.get('page'), '2');
});
