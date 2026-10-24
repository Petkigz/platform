import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchCatalogue,
  fetchCataloguePage,
  orderByIds,
  parseCataloguePage,
  parseSearchHits,
  searchCatalogue,
  type CatalogueCourse,
} from './catalogue.ts';
import { PAGE_SIZE } from './paging.ts';

// ---------------------------------------------------------------------------
// Catalogue search.
//
// The function is the one place a match is defined; this file covers the client
// around it, which has three jobs that are easy to get quietly wrong:
//
//   * read an untyped reply defensively, because a malformed row must not render
//   * put the rows back in ranked order, because `in('id', …)` has no order
//   * fall back to browsing when the box is cleared, not to an empty page
// ---------------------------------------------------------------------------

type Call = { kind: 'rpc' | 'select'; name: string; args?: Record<string, unknown> };

function stubClient(options: {
  rpcData?: unknown;
  rpcError?: { message: string };
  rows?: unknown[];
  rowsError?: { message: string };
} = {}) {
  const calls: Call[] = [];

  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ kind: 'rpc', name, args });
      return { data: options.rpcData ?? [], error: options.rpcError ?? null };
    },
    from: (table: string) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        in: (column: string, values: string[]) => {
          calls.push({ kind: 'select', name: table, args: { column, values } });
          return Promise.resolve({ data: options.rows ?? [], error: options.rowsError ?? null });
        },
        order: () => builder,
        limit: () => builder,
        // Browsing (no `in`) awaits the builder itself, so the chain must be
        // thenable the way PostgREST's is.
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: options.rows ?? [], error: options.rowsError ?? null }).then(resolve),
      };
      return builder;
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, calls };
}

function course(id: string, title: string): CatalogueCourse {
  return {
    id,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    title,
    description: null,
    audience: 'both',
    age_bands: [],
    difficulty: 'beginner',
    course_versions: [],
  };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

test('a malformed search reply is discarded, not rendered', () => {
  const hits = parseSearchHits([
    { course_id: 'a', score: 9 },
    { course_id: 'a', score: 4 },          // a duplicate is still one course
    { course_id: '', score: 3 },            // nothing to link to
    { course_id: 7, score: 1 },             // not an id
    { course_id: 'b' },                     // no score is allowed; it is only order
    null,
    'nonsense',
  ]);

  assert.deepEqual(hits, [
    { courseId: 'a', score: 9 },
    { courseId: 'b', score: 0 },
  ]);

  for (const junk of [null, undefined, 'nonsense', 42, { course_id: 'a' }]) {
    assert.deepEqual(parseSearchHits(junk), [], `${String(junk)} was accepted as a reply`);
  }
});

test('rows come back in the order they were ranked, and a missing row is skipped', () => {
  const rows = [course('b', 'Beta'), course('a', 'Alpha'), course('z', 'Zeta')];

  assert.deepEqual(
    orderByIds(rows, ['a', 'b']).map((row) => row.id),
    ['a', 'b'],
  );

  // The database can return fewer rows than were ranked — a policy change, or a
  // course retired between the two queries. The order still holds; nothing throws.
  assert.deepEqual(
    orderByIds(rows, ['a', 'gone', 'b']).map((row) => row.id),
    ['a', 'b'],
  );
});

// ---------------------------------------------------------------------------
// The call
// ---------------------------------------------------------------------------

const envelope = (over: Record<string, unknown> = {}) => ({
  total: 1,
  shown: 1,
  offset: 0,
  limit: 24,
  ordered: [{ courseId: 'a', score: 12 }],
  ...over,
});

test('one call answers both browsing and searching', async () => {
  // This used to be two: a PostgREST select for browsing and a different
  // function for a query. The two disagreed — the browse path never filtered a
  // suspended course, and it applied the subject filter after the limit — so
  // the disagreement *was* the bug. There is one question now.
  const { client, calls } = stubClient({
    rpcData: envelope(),
    rows: [course('a', 'Alpha')],
  });

  const found = await fetchCatalogue(client, { q: 'fiqh', subject: 'all', audience: 'all' });

  assert.deepEqual(found.map((row) => row.id), ['a']);
  assert.equal(calls[0]?.kind, 'rpc');
  assert.equal(calls[0]?.name, 'catalogue_page');
  assert.deepEqual(calls[0]?.args, {
    p_query: 'fiqh',
    p_subject: null,
    p_audience: null,
    p_band: null,
    p_limit: PAGE_SIZE,
    p_offset: 0,
  });
});

test('a blank query and "all" go as nothing at all', async () => {
  const { client, calls } = stubClient({
    rpcData: envelope({ ordered: [{ courseId: 'a', score: 0 }] }),
    rows: [course('a', 'Alpha')],
  });

  await fetchCatalogue(client, { q: '   ', subject: 'all', audience: 'all', band: '8-10' });

  assert.deepEqual(calls[0]?.args, {
    p_query: null,
    p_subject: null,
    p_audience: null,
    p_band: '8-10',
    p_limit: PAGE_SIZE,
    p_offset: 0,
  });
});

test('an empty page never reads the courses table', async () => {
  const { client, calls } = stubClient({
    rpcData: envelope({ total: 0, shown: 0, ordered: [] }),
  });

  const page = await fetchCataloguePage(client, { q: 'nothing' });
  assert.deepEqual(page.courses, []);
  assert.equal(page.total, 0);
  assert.equal(calls.length, 1, 'an empty page still fetched rows');
});

test('the envelope carries the true total, not the size of the page', async () => {
  const { client } = stubClient({
    rpcData: envelope({ total: 137, shown: 1, offset: 24, limit: 24 }),
    rows: [course('a', 'Alpha')],
  });

  const page = await fetchCataloguePage(client, {}, { limit: 24, offset: 24 });
  assert.equal(page.total, 137);
  assert.equal(page.shown, 1);
  assert.equal(page.offset, 24);
  assert.equal(page.courses.length, 1);
});

test('the page is sent to the database as a page, not fetched whole', async () => {
  const { client, calls } = stubClient({
    rpcData: envelope({ total: 137, offset: 48, limit: 24 }),
    rows: [course('a', 'Alpha')],
  });

  await fetchCataloguePage(client, { subject: 'quran' }, { limit: 24, offset: 48 });
  assert.equal(calls[0]?.args?.p_offset, 48);
  assert.equal(calls[0]?.args?.p_limit, 24);
  assert.equal(calls[0]?.args?.p_subject, 'quran');
});

test('shown describes what was delivered, not what was promised', async () => {
  // A page that says twenty-four and delivers twenty must describe the twenty,
  // or the range label claims courses the reader is not looking at.
  const parsed = parseCataloguePage({
    total: 137, shown: 24, offset: 0, limit: 24, ordered: [{ courseId: 'a' }],
  });
  assert.equal(parsed.shown, 1);
  assert.equal(parsed.total, 137);
});

test('a malformed envelope becomes an empty page rather than a crash', () => {
  for (const junk of [null, undefined, 'nonsense', 42, {}]) {
    const parsed = parseCataloguePage(junk);
    assert.equal(parsed.total, 0, `${String(junk)} produced a total`);
    assert.deepEqual(parsed.hits, []);
  }
});

test('a refusal from the database is raised rather than shown as no results', async () => {
  // "No results" and "the search broke" are different things, and a parent who
  // mistypes a code should not be told the catalogue is empty.
  const { client } = stubClient({ rpcError: { message: 'permission denied' } });
  await assert.rejects(() => searchCatalogue(client, { q: 'fiqh' }), /permission denied/);

  const reading = stubClient({
    rpcData: envelope(),
    rowsError: { message: 'policy failure' },
  });
  await assert.rejects(() => searchCatalogue(reading.client, { q: 'fiqh' }), /policy failure/);
});
