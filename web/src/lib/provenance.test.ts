import assert from 'node:assert/strict';
import test from 'node:test';

import { addLessonSource, fetchLessonSources, fetchVersionSources, removeLessonSource } from './provenance.ts';

function stubRpc(result: { data?: unknown; error?: { message: string } } = { data: 'source-1' }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

function stubSources(data: unknown, error: { message: string } | null = null) {
  const query = { table: '', filters: {} as Record<string, unknown> };
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = (key: string, value: unknown) => { query.filters[key] = value; return chain; };
  chain.order = () => chain;
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(resolve);
  const client = { from: (table: string) => { query.table = table; return chain; } } as any;
  return { client, query };
}

test('lesson citations flatten the source join without losing anchor metadata', async () => {
  const { client, query } = stubSources([
    {
      anchor: 'Surah Al-Baqarah 2:255',
      content_sources: [{
        id: 'source-1', source_type: 'quran', title: 'The Qur’an',
        author_or_compiler: null, edition_or_version: 'Hafs',
        reference_locator: '2:255', url: 'https://example.org/quran',
      }],
    },
    { anchor: null, content_sources: null },
  ]);
  const sources = await fetchLessonSources(client, 'lesson-1');
  assert.equal(query.table, 'content_source_links');
  assert.equal(query.filters.lesson_id, 'lesson-1');
  assert.deepEqual(sources, [{
    id: 'source-1', sourceType: 'quran', title: 'The Qur’an',
    authorOrCompiler: null, editionOrVersion: 'Hafs',
    referenceLocator: '2:255', url: 'https://example.org/quran',
    anchor: 'Surah Al-Baqarah 2:255',
  }]);
});

test('version source rows are grouped by lesson and filtered to that version', async () => {
  const { client, query } = stubSources([
    { lesson_id: 'lesson-1', anchor: 'opening', content_sources: [{
      id: 'source-1', source_type: 'book', title: 'Book', author_or_compiler: 'Author',
      edition_or_version: null, reference_locator: 'p. 5', url: null,
    }] },
  ]);
  const grouped = await fetchVersionSources(client, 'version-1');
  assert.equal(query.table, 'content_source_links');
  assert.equal(query.filters['content_sources.course_version_id'], 'version-1');
  assert.equal(grouped['lesson-1']?.[0]?.id, 'source-1');
});

test('a source query failure is not silently shown as no citations', async () => {
  const { client } = stubSources(null, { message: 'database unavailable' });
  await assert.rejects(() => fetchLessonSources(client, 'lesson-1'), /database unavailable/);
});

test('adding a lesson source sends normalized metadata to one atomic RPC', async () => {
  const { client, calls } = stubRpc({ data: 'source-9' });
  const result = await addLessonSource(client, {
    courseVersionId: 'version-1', lessonId: 'lesson-1', sourceType: 'hadith',
    title: '  Sahih al-Bukhari ', authorOrCompiler: '  Imam al-Bukhari ',
    editionOrVersion: '  edition 2 ', referenceLocator: ' Book 1, Hadith 1 ',
    url: ' https://example.org/hadith ', anchor: '  opening paragraph ', notes: '  verify numbering  ',
  });
  assert.deepEqual(result, { ok: true, id: 'source-9' });
  assert.deepEqual(calls, [{
    fn: 'add_content_source_for_lesson',
    args: {
      p_course_version_id: 'version-1', p_lesson_id: 'lesson-1', p_source_type: 'hadith',
      p_title: 'Sahih al-Bukhari', p_author_or_compiler: 'Imam al-Bukhari',
      p_edition_or_version: 'edition 2', p_reference_locator: 'Book 1, Hadith 1',
      p_url: 'https://example.org/hadith', p_anchor: 'opening paragraph',
      p_notes: 'verify numbering',
    },
  }]);
});

test('removing a citation calls the guarded database writer', async () => {
  const { client, calls } = stubRpc({ data: true });
  assert.deepEqual(await removeLessonSource(client, 'source-1'), { ok: true, id: 'true' });
  assert.deepEqual(calls, [{ fn: 'remove_content_source', args: { p_source_id: 'source-1' } }]);
  const empty = await removeLessonSource(client, '');
  assert.equal(empty.ok, false);
  assert.equal(calls.length, 1);
});

test('invalid form values never reach the database', async () => {
  const { client, calls } = stubRpc();
  assert.equal((await addLessonSource(client, {
    courseVersionId: 'v', lessonId: 'l', sourceType: 'quran', title: ' ',
  })).ok, false);
  assert.equal((await addLessonSource(client, {
    courseVersionId: 'v', lessonId: 'l', sourceType: 'book', title: 'Book',
    url: 'http://example.org',
  })).ok, false);
  assert.equal(calls.length, 0);
});

test('database author and D5 refusals are explained in actionable terms', async () => {
  const { client: outsider } = stubRpc({ error: { message: 'only the course author may add sources' } });
  const common = { courseVersionId: 'version-1', lessonId: 'lesson-1', sourceType: 'book' as const, title: 'Book' };
  const rejected = await addLessonSource(outsider, common);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.match(rejected.message, /author/i);

  const { client: locked } = stubRpc({ error: { message: 'content provenance is locked with its course version' } });
  const result = await addLessonSource(locked, common);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /draft version/i);
});
