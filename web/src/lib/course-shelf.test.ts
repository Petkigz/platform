import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALLOWED_SHELF_FIELDS,
  parseShelf,
  shelfAudience,
  shelfSummary,
  statusLabel,
  type ShelfRow,
} from './course-shelf.ts';

function row(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    courseId: '11111111-1111-1111-1111-111111111111',
    slug: 'the-alphabet',
    title: 'The alphabet',
    audience: 'child',
    ageBands: ['5-7', '8-10'],
    status: 'active',
    author: 'Fatima Nur',
    authorId: '22222222-2222-2222-2222-222222222222',
    publishedVersions: 1,
    lastPublishedAt: '2026-10-01T09:00:00.000Z',
    learners: 4,
    createdAt: '2026-09-01T09:00:00.000Z',
    ...over,
  };
}

function payload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { query: null, audience: null, total: 1, shown: 1, truncated: false, rows: [row()], ...over };
}

test('a full row survives parsing with its bands intact', () => {
  const shelf = parseShelf(payload());
  assert.equal(shelf.rows.length, 1);
  const first = shelf.rows[0] as ShelfRow;
  assert.equal(first.title, 'The alphabet');
  assert.deepEqual(first.ageBands, ['5-7', '8-10']);
  assert.equal(first.learners, 4);
  assert.equal(first.lastPublishedAt, '2026-10-01T09:00:00.000Z');
});

test('a row that grows a column this screen does not show is refused', () => {
  // The column somebody adds eventually is a price. A shelf that quietly
  // renders it is a shelf where two currencies get compared by eye.
  assert.throws(
    () => parseShelf({ ...payload(), rows: [row({ priceUsd: 12 })] }),
    /carries 'priceUsd'/, 
  );
  assert.equal(ALLOWED_SHELF_FIELDS.includes('learners'), true);
  assert.equal((ALLOWED_SHELF_FIELDS as readonly string[]).includes('priceUsd'), false);
});

test('a lifecycle this screen has not been taught is refused, not guessed', () => {
  // Defaulting an unknown status to "draft" would put a wrong lifecycle on the
  // one page whose job is being right about who may see what.
  assert.throws(
    () => parseShelf({ ...payload(), rows: [row({ status: 'archived' })] }),
    /which this screen does not know/,
  );
});

test('a course that does not say who it is for is refused', () => {
  assert.throws(
    () => parseShelf({ ...payload(), rows: [row({ audience: 'everyone' })] }),
    /does not say who it is for/,
  );
});

test('a cut-off list is marked cut off even when the payload forgets to say so', () => {
  const shelf = parseShelf(payload({ total: 40, shown: 1, truncated: false }));
  assert.equal(shelf.truncated, true);
  assert.equal(shelf.total, 40);
});

test('the sentence above the list admits when it is a window', () => {
  assert.equal(shelfSummary({ total: 0, shown: 0, truncated: false }), 'No course matches.');
  assert.equal(shelfSummary({ total: 1, shown: 1, truncated: false }), 'One course.');
  assert.equal(shelfSummary({ total: 7, shown: 7, truncated: false }), '7 courses.');
  assert.equal(
    shelfSummary({ total: 120, shown: 50, truncated: true }),
    'Showing 50 of 120 courses. Narrow the search to see the rest.',
  );
});

test('empty bands are said out loud, not left blank', () => {
  assert.equal(shelfAudience({ audience: 'child', ageBands: [] }), 'Young learners · ages 5–17');
  assert.equal(shelfAudience({ audience: 'both', ageBands: [] }), 'Both audiences · every age, child and adult');
});

test('bands are read back in age order, whatever order they arrive in', () => {
  assert.equal(
    shelfAudience({ audience: 'child', ageBands: ['11-13', '5-7'] }),
    'Young learners · Ages 5–7, 11–13',
  );
  // An adult course must never read "Adults · Adults", which is what reusing
  // the course page's sentence would produce, because the 18+ band is itself
  // called "Adults".
  assert.equal(shelfAudience({ audience: 'adult', ageBands: ['18+'] }), 'Adults · 18+');
  assert.equal(shelfAudience({ audience: 'adult', ageBands: [] }), 'Adults · 18+');
});

test('a lifecycle is said the way a badge says it', () => {
  assert.equal(statusLabel('active'), 'Active');
  assert.equal(statusLabel('retired'), 'Retired');
  assert.equal(statusLabel('draft'), 'Draft');
});
