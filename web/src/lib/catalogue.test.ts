import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchCatalogue,
  orderByIds,
  parseSearchHits,
  searchCatalogue,
  type CatalogueCourse,
} from './catalogue.ts';

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

test('the search sends the query and sends "all" as nothing at all', async () => {
  const { client, calls } = stubClient({
    rpcData: [{ course_id: 'a', score: 12 }],
    rows: [course('a', 'Alpha')],
  });

  const found = await searchCatalogue(client, {
    q: 'fiqh', subject: 'all', audience: 'all',
  });

  assert.deepEqual(found.map((row) => row.id), ['a']);
  assert.deepEqual(calls[0], {
    kind: 'rpc',
    name: 'search_catalogue',
    args: { p_query: 'fiqh', p_subject: null, p_audience: null, p_limit: 60 },
  });
});

test('an empty result never reads the courses table', async () => {
  const { client, calls } = stubClient({ rpcData: [] });

  assert.deepEqual(await searchCatalogue(client, { q: 'nothing' }), []);
  assert.equal(calls.length, 1, 'an empty search still fetched rows');
});

test('a query goes through the function; browsing does not', async () => {
  const searching = stubClient({
    rpcData: [{ course_id: 'a', score: 3 }],
    rows: [course('a', 'Alpha')],
  });
  await fetchCatalogue(searching.client, { q: '  fiqh  ' });
  assert.equal(searching.calls[0]?.kind, 'rpc', 'a query bypassed the search function');

  const browsing = stubClient({ rows: [course('a', 'Alpha')] });
  const listed = await fetchCatalogue(browsing.client, { q: '   ' });
  assert.equal(listed.length, 1);
  assert.ok(browsing.calls.every((call) => call.kind === 'select'),
    'a blank query called the search function');
});

test('a refusal from the database is raised rather than shown as no results', async () => {
  // "No results" and "the search broke" are different things, and a parent who
  // mistypes a code should not be told the catalogue is empty.
  const { client } = stubClient({ rpcError: { message: 'permission denied' } });
  await assert.rejects(() => searchCatalogue(client, { q: 'fiqh' }), /permission denied/);

  const reading = stubClient({
    rpcData: [{ course_id: 'a', score: 1 }],
    rowsError: { message: 'policy failure' },
  });
  await assert.rejects(() => searchCatalogue(reading.client, { q: 'fiqh' }), /policy failure/);
});
