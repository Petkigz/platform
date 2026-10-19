import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addLessonResource, fetchSubjects, fetchVersionSubjects, setLessonPreview,
  setSubjects, validateAddResource,
} from './authoring.ts';

// ---------------------------------------------------------------------------
// Subject tagging is what makes a course findable. The catalogue filter and the
// subject badges both read course_version_subjects, so a course with no tags is
// invisible under every subject however good it is.
//
// The rules under test:
//
//   * an empty list is refused before the RPC, because a course with no subject
//     can never be found
//   * the codes go through as an array, not joined into a string
//   * the D5 lock is reported as "published and locked" rather than as a
//     generic failure, because the remedy is different: cut a new version
//   * an unknown code is reported by name
// ---------------------------------------------------------------------------

type RpcCall = { fn: string; args: Record<string, unknown> };

/** Indexing with noUncheckedIndexedAccess on: fail loudly, not with a cast. */
function one<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`expected at least one ${label}, got none`);
  return row;
}

function stubRpc(
  result: { data?: unknown; error?: { message: string } } = { data: 2 },
) {
  const calls: RpcCall[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

/** A stub for the chained queries, in the order each function issues them. */
function stubChain(queries: { rows: unknown[]; error?: { message: string } | null }[]) {
  let i = 0;
  const seen: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    from: (table: string) => {
      const spec = queries[i++] ?? { rows: [] };
      seen.push(table);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: spec.rows, error: spec.error ?? null }).then(resolve);
      return chain;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, tables: () => seen };
}

// ---------------------------------------------------------------------------
// setSubjects
// ---------------------------------------------------------------------------

test('an empty subject list is refused before the RPC', async () => {
  const { client, calls } = stubRpc();

  const res = await setSubjects(client, { versionId: 'v-1', codes: [] });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0, 'a course with no subject can never be found');
  if (!res.ok) assert.match(res.message, /at least one subject/i);
});

test('the codes go through as an array', async () => {
  const { client, calls } = stubRpc({ data: 2 });

  const res = await setSubjects(client, {
    versionId: 'v-1',
    codes: ['quran', 'arabic'],
  });

  assert.equal(res.ok, true);
  const args = one(calls, 'rpc call').args;
  assert.deepEqual(args.p_subject_codes, ['quran', 'arabic']);
  assert.equal(args.p_version_id, 'v-1');
  if (res.ok) assert.equal(res.value.count, 2);
});

test('a D5 lock is reported as locked, with the remedy', async () => {
  const { client } = stubRpc({
    error: {
      message:
        'cannot modify subject mapping of course version 1234, which is published and therefore locked (D5)',
    },
  });

  const res = await setSubjects(client, { versionId: 'v-1', codes: ['quran'] });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.code, 'locked', 'this is not a validation failure');
    assert.match(res.message, /new version/i);
  }
});

test('an unknown subject code is reported by name', async () => {
  const { client } = stubRpc({
    error: { message: 'no such subject area(s): astrology' },
  });

  const res = await setSubjects(client, {
    versionId: 'v-1',
    codes: ['quran', 'astrology'],
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.code, 'rejected');
    assert.match(res.message, /astrology/, 'the bad code must be named');
  }
});

test('a non-author is told so rather than getting a bare error', async () => {
  const { client } = stubRpc({
    error: { message: 'only the author may tag this course version' },
  });

  const res = await setSubjects(client, { versionId: 'v-1', codes: ['quran'] });

  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.message, /only the author/i);
});

// ---------------------------------------------------------------------------
// The taxonomy
// ---------------------------------------------------------------------------

test('subjects are split into top level and subdivisions', async () => {
  const { client, tables } = stubChain([
    {
      rows: [
        { code: 'quran', name: 'Quran', parent_id: null },
        { code: 'tajweed', name: 'Tajweed', parent_id: 'quran-id' },
        { code: 'fiqh', name: 'Fiqh', parent_id: null },
      ],
    },
  ]);

  const subjects = await fetchSubjects(client);

  assert.equal(subjects.length, 3);
  const quran = subjects.find((s) => s.code === 'quran');
  const tajweed = subjects.find((s) => s.code === 'tajweed');
  assert.equal(quran?.isTopLevel, true);
  assert.equal(tajweed?.isTopLevel, false);
  assert.deepEqual(tables(), ['subject_areas']);
});

test('a subjects query error propagates', async () => {
  const { client } = stubChain([{ rows: [], error: { message: 'permission denied' } }]);

  await assert.rejects(() => fetchSubjects(client), /permission denied/);
});

// ---------------------------------------------------------------------------
// Reading back the tags
// ---------------------------------------------------------------------------

test('the current tags are read back as codes', async () => {
  const { client } = stubChain([
    {
      rows: [
        { subject_area_id: 'a', subject: [{ code: 'quran' }] },
        { subject_area_id: 'b', subject: [{ code: 'arabic' }] },
      ],
    },
  ]);

  const codes = await fetchVersionSubjects(client, 'v-1');

  assert.deepEqual(codes, ['quran', 'arabic']);
});

test('a dangling subject join is dropped rather than becoming an empty code', async () => {
  // Without the filter this returns [''], which would render as a blank badge
  // and, worse, be sent back on save and refused as an unknown code.
  const { client } = stubChain([
    {
      rows: [
        { subject_area_id: 'a', subject: null },
        { subject_area_id: 'b', subject: [{ code: 'fiqh' }] },
      ],
    },
  ]);

  const codes = await fetchVersionSubjects(client, 'v-1');

  assert.deepEqual(codes, ['fiqh']);
});

test('a version with no tags reads back as an empty list, not an error', async () => {
  const { client } = stubChain([{ rows: [] }]);

  const codes = await fetchVersionSubjects(client, 'v-1');

  assert.deepEqual(codes, []);
});

// ---------------------------------------------------------------------------
// Preview access
// ---------------------------------------------------------------------------

test('preview settings use the audited database writer', async () => {
  const { client, calls } = stubRpc({ data: true });
  const result = await setLessonPreview(client, { lessonId: 'lesson-1', isPreview: true });
  assert.equal(result.ok, true);
  assert.deepEqual(one(calls, 'preview rpc').args, {
    p_lesson_id: 'lesson-1',
    p_is_preview: true,
  });
});

test('a locked preview update is reported as a new-version action', async () => {
  const { client } = stubRpc({ error: { message: 'preview settings are locked with the course version (D5)' } });
  const result = await setLessonPreview(client, { lessonId: 'lesson-1', isPreview: false });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /new version/i);
});

test('public preview resource access is passed through explicitly', async () => {
  const { client, calls } = stubRpc({ data: 'resource-1' });
  const result = await addLessonResource(client, {
    lessonId: 'lesson-1',
    resourceType: 'video',
    url: 'https://cdn.example.com/sample.mp4',
    name: 'Sample',
    access: 'public_preview',
  });
  assert.equal(result.ok, true);
  assert.equal(one(calls, 'resource rpc').args.p_access, 'public_preview');
});

test('resource validation rejects unsupported access classes', () => {
  const result = validateAddResource({
    lessonId: 'lesson-1',
    resourceType: 'video',
    url: 'https://cdn.example.com/sample.mp4',
    name: 'Sample',
    access: 'restricted' as never,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /enrolled access or public preview/i);
});
