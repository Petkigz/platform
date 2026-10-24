import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cardPrice,
  contentLine,
  formatMinutes,
  isPriced,
  parseCards,
  type CourseCard,
} from './catalogue-cards.ts';

const raw = (over: Record<string, unknown> = {}) => ({
  courseId: 'c1',
  offering: { hasLivePrice: false, resolved: false, reason: 'no_price' },
  sections: 2,
  lessons: 5,
  minutes: 40,
  timedLessons: 5,
  ...over,
});

test('the reply becomes a map keyed by course id', () => {
  const cards = parseCards([raw({ courseId: 'a' }), raw({ courseId: 'b' })]);
  assert.equal(cards.size, 2);
  assert.equal(cards.get('a')?.lessons, 5);
});

test('a reply that is not a list is an empty map rather than a crash', () => {
  assert.equal(parseCards(null).size, 0);
  assert.equal(parseCards({ courses: [] }).size, 0);
});

test('a card with no course id is dropped', () => {
  const cards = parseCards([raw({ courseId: undefined }), raw({ courseId: 'kept' })]);
  assert.deepEqual([...cards.keys()], ['kept']);
});

test('a price is read through the same offering rules as the course page', () => {
  const [paid] = [...parseCards([
    raw({
      offering: {
        hasLivePrice: true,
        resolved: true,
        priceId: 'p1',
        amountMinor: '30000',
        currencyCode: 'UGX',
        billingInterval: 'one_time',
        matched: 'country',
        country: 'UG',
      },
    }),
  ]).values()];

  assert.equal(paid?.offering.kind, 'paid');
  assert.equal(cardPrice(paid), 'UGX 30000');
  assert.equal(isPriced(paid), true);
});

test('a course with no live price is free, and a course nobody can buy here is not', () => {
  const [free] = [...parseCards([raw()]).values()];
  assert.equal(cardPrice(free), 'Free');
  assert.equal(isPriced(free), false);

  const [blocked] = [...parseCards([
    raw({ offering: { hasLivePrice: true, resolved: false, reason: 'no_price_for_country' } }),
  ]).values()];
  // Not "Free": a sold course that this buyer cannot buy is a different thing,
  // and saying Free would be a promise the enrol button refuses.
  assert.equal(blocked?.offering.kind, 'not_sold_here');
  assert.equal(cardPrice(blocked), 'Not available in your country yet');
});

test('minutes render short, and hours do not lose the minutes', () => {
  assert.equal(formatMinutes(45), '45 min');
  assert.equal(formatMinutes(60), '1 hr');
  assert.equal(formatMinutes(120), '2 hr');
  assert.equal(formatMinutes(125), '2h 05m');
  assert.equal(formatMinutes(0), '');
});

test('the content line counts what is there', () => {
  const card = (over: Partial<CourseCard> = {}): CourseCard => ({
    courseId: 'c1',
    offering: { kind: 'free' },
    sections: 2,
    lessons: 5,
    minutes: 40,
    timedLessons: 5,
    ...over,
  });

  assert.equal(contentLine(card()), '2 sections · 5 lessons · 40 min');
  assert.equal(contentLine(card({ sections: 1, lessons: 1 })), '1 section · 1 lesson · 40 min');
  assert.equal(contentLine(card({ sections: 0, minutes: null })), '5 lessons');
  assert.equal(contentLine(null), '');
});

test('a duration that does not cover every lesson is written as a floor', () => {
  const [partial] = [...parseCards([raw({ lessons: 5, minutes: 40, timedLessons: 3 })]).values()];
  assert.equal(contentLine(partial), '2 sections · 5 lessons · 40 min+');
});

test('a duration with no timed lesson behind it is not shown at all', () => {
  const [card] = [...parseCards([raw({ minutes: 40, timedLessons: 0 })]).values()];
  assert.equal(card?.minutes, null);
  assert.equal(contentLine(card), '2 sections · 5 lessons');
});

test('a nonsense count does not become a negative or a fraction', () => {
  const [card] = [...parseCards([raw({ lessons: -3, sections: 1.8, minutes: 'lots' })]).values()];
  assert.equal(card?.lessons, 0);
  assert.equal(card?.sections, 1);
  assert.equal(card?.minutes, null);
});
