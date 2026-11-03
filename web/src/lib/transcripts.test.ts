import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchTranscripts } from './transcripts.ts';

test('transcript read is bounded to unique lesson ids and preserves plain text', async () => {
  let ids: string[] = [];
  const client = { from: (table: string) => {
    assert.equal(table, 'lesson_transcripts');
    return { select: () => ({ in: (_field: string, values: string[]) => {
      ids = values;
      return Promise.resolve({ data: [{ lesson_id: 'a', body: '<script>text</script>' }], error: null });
    } }) };
  } };
  const result = await fetchTranscripts(client as never, ['a', 'a']);
  assert.deepEqual(ids, ['a']);
  assert.equal(result.a, '<script>text</script>');
});

test('no lesson ids makes no database request', async () => {
  const client = { from: () => { throw new Error('must not query'); } };
  assert.deepEqual(await fetchTranscripts(client as never, []), {});
});

test('database errors are not silently treated as missing transcripts', async () => {
  const client = { from: () => ({ select: () => ({ in: () =>
    Promise.resolve({ data: null, error: { message: 'read failed' } }) }) }) };
  await assert.rejects(() => fetchTranscripts(client as never, ['a']), /read failed/);
});
