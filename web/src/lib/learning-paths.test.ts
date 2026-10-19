import assert from 'node:assert/strict';
import test from 'node:test';

import {
  activateLearningPath,
  addLearningPathItem,
  createLearningPath,
  removeLearningPathItem,
  retireLearningPath,
  summarizeLearningPathProgress,
  validatePath,
} from './learning-paths.ts';

function stubRpc(result: { data?: unknown; error?: { message: string } } = { data: 'path-1' }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
  } as any;
  return { client, calls };
}

test('path progress averages required courses, clamps values and ignores optional courses', () => {
  const summary = summarizeLearningPathProgress(
    [
      { courseId: 'done', required: true },
      { courseId: 'working', required: true },
      { courseId: 'not-started', required: true },
      { courseId: 'optional', required: false },
    ],
    new Map([
      ['done', { status: 'completed', percentComplete: 25 }],
      ['working', { status: 'active', percentComplete: 51.6 }],
      ['not-started', { status: 'active', percentComplete: -5 }],
      ['optional', { status: 'active', percentComplete: 100 }],
    ]),
  );
  assert.deepEqual(summary, { requiredCount: 3, completedRequired: 1, percentComplete: 51 });
});

test('an empty or optional-only path does not claim completion', () => {
  assert.deepEqual(summarizeLearningPathProgress([], new Map()), {
    requiredCount: 0, completedRequired: 0, percentComplete: 0,
  });
  assert.deepEqual(summarizeLearningPathProgress(
    [{ courseId: 'optional', required: false }],
    new Map([['optional', { status: 'completed', percentComplete: 100 }]]),
  ), { requiredCount: 0, completedRequired: 0, percentComplete: 0 });
});

test('path titles, slugs and audiences are validated', () => {
  assert.equal(validatePath(' Quran basics ', 'quran-basics', 'child').ok, true);
  assert.equal(validatePath('   ', 'quran', 'child').ok, false);
  assert.equal(validatePath('x'.repeat(201), 'quran', 'child').ok, false);
  assert.equal(validatePath('Quran', 'Quran-Basics', 'child').ok, false);
  assert.equal(validatePath('Quran', 'quran--basics', 'child').ok, false);
  assert.equal(validatePath('Quran', 'quran', 'everyone').ok, false);
});

test('create sends normalized user fields and returns the RPC id', async () => {
  const { client, calls } = stubRpc({ data: 'path-7' });
  const result = await createLearningPath(client, {
    title: '  Quran basics  ',
    slug: ' quran-basics ',
    audience: 'both',
    description: '  Start here.  ',
  });
  assert.deepEqual(result, { ok: true, id: 'path-7' });
  assert.deepEqual(calls, [{
    fn: 'create_learning_path',
    args: {
      p_title: 'Quran basics',
      p_slug: 'quran-basics',
      p_audience: 'both',
      p_description: 'Start here.',
    },
  }]);
});

test('invalid create input is stopped before the database call', async () => {
  const { client, calls } = stubRpc();
  const result = await createLearningPath(client, {
    title: '', slug: 'invalid', audience: 'adult',
  });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test('path item mutations call the intended RPC with exact ids and required flag', async () => {
  const { client, calls } = stubRpc({ data: 'item-1' });
  assert.deepEqual(await addLearningPathItem(client, {
    pathId: 'path-1', courseId: 'course-1', required: false,
  }), { ok: true, id: 'item-1' });
  assert.deepEqual(await removeLearningPathItem(client, 'item-1'), { ok: true, id: 'item-1' });
  assert.deepEqual(calls, [
    {
      fn: 'add_learning_path_item',
      args: { p_learning_path_id: 'path-1', p_course_id: 'course-1', p_required: false },
    },
    { fn: 'remove_learning_path_item', args: { p_item_id: 'item-1' } },
  ]);
});

test('empty mutation ids are refused before the database call', async () => {
  const { client, calls } = stubRpc();
  assert.equal((await addLearningPathItem(client, {
    pathId: '', courseId: 'course-1', required: true,
  })).ok, false);
  assert.equal((await removeLearningPathItem(client, '')).ok, false);
  assert.equal((await activateLearningPath(client, '')).ok, false);
  assert.equal((await retireLearningPath(client, '', 'reason')).ok, false);
  assert.equal(calls.length, 0);
});

test('publishing and retiring map to guarded RPCs; retirement requires a reason', async () => {
  const { client, calls } = stubRpc({ data: 'path-1' });
  assert.deepEqual(await activateLearningPath(client, 'path-1'), { ok: true, id: 'path-1' });
  assert.equal((await retireLearningPath(client, 'path-1', '  ')).ok, false);
  assert.deepEqual(await retireLearningPath(client, 'path-1', '  outdated  '), {
    ok: true, id: 'path-1',
  });
  assert.deepEqual(calls, [
    { fn: 'activate_learning_path', args: { p_learning_path_id: 'path-1' } },
    { fn: 'retire_learning_path', args: { p_learning_path_id: 'path-1', p_reason: 'outdated' } },
  ]);
});

test('database guard errors are translated into useful messages', async () => {
  for (const [error, expected] of [
    ['only the path author may update this path', /author/i],
    ['an active, published course is required', /active, published/i],
    ['a learning path needs at least one course', /at least one/i],
    ['only a draft path may be changed', /draft path/i],
    ['duplicate key violates unique constraint', /already in use/i],
  ] as const) {
    const { client } = stubRpc({ error: { message: error } });
    const result = await activateLearningPath(client, 'path-1');
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, expected);
  }
});
