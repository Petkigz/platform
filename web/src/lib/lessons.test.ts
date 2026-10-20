import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canAccessLesson,
  fetchLesson,
  fetchMediaResourcesForLessons,
  formatDuration,
  nativeMediaKind,
  RESOURCE_LABEL,
  type Lesson,
  type LessonMediaResource,
} from './lessons.ts';

// ---------------------------------------------------------------------------
// PostgREST returns nested relations as arrays even for to-one joins. Getting
// that wrong is silent: `row.course_sections.title` is undefined rather than a
// crash, and the page renders a blank section name. These tests pin the shape.
// ---------------------------------------------------------------------------

type Call = { table?: string; method?: string; args?: unknown };

function stubClient(handlers: {
  lessons?: unknown;
  lesson_resources?: { data?: unknown; error?: { message: string } | null };
  rpc?: { data?: unknown; error?: { message: string } | null };
}) {
  const calls: Call[] = [];
  let table = '';

  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    single: async () => {
      calls.push({ table, method: 'single' });
      const h = handlers.lessons;
      if (!h) return { data: null, error: { message: 'no row' } };
      return { data: h, error: null };
    },
    maybeSingle: async () => {
      calls.push({ table, method: 'maybeSingle' });
      return { data: null, error: null };
    },
    then: (resolve: (v: unknown) => unknown) => {
      // lesson_resources has no terminal call in the lib, so it awaits the
      // chain itself. Record the call here, otherwise the assertion that the
      // resources were fetched can never pass.
      calls.push({ table, method: 'then' });
      const h = handlers.lesson_resources ?? { data: [], error: null };
      return Promise.resolve(h).then(resolve);
    },
  };

  const client = {
    from: (name: string) => {
      table = name;
      return chain;
    },
    rpc: async (_fn: string, _args: unknown) => {
      calls.push({ method: 'rpc', args: _args });
      return handlers.rpc ?? { data: null, error: { message: 'no rpc' } };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return { client, calls };
}

const LESSON_ROW = {
  id: 'l-1',
  section_id: 's-1',
  title: 'Introduction to Tajweed',
  description: 'The first lesson.',
  type: 'video',
  position: 1,
  duration_seconds: 754,
  is_preview: false,
  // Nested to-one join arrives as an array — this is the trap.
  course_sections: [{ title: 'Basics', course_version_id: 'v-1' }],
};

test('formatDuration renders minutes and seconds', () => {
  assert.equal(formatDuration(null), null);
  assert.equal(formatDuration(0), null);
  assert.equal(formatDuration(-5), null);
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(60), '1 min');
  assert.equal(formatDuration(600), '10 min');
  assert.equal(formatDuration(754), '12 min 34s');
});

test('every resource type has a label', () => {
  const types = ['video', 'audio', 'document', 'worksheet', 'link', 'quiz', 'other'] as const;
  for (const t of types) {
    assert.ok(RESOURCE_LABEL[t], `no label for resource type '${t}'`);
  }
});

test('fetchLesson flattens the nested section join', async () => {
  const { client, calls } = stubClient({
    lessons: LESSON_ROW,
    lesson_resources: {
      data: [
        {
          id: 'r-1',
          lesson_id: 'l-1',
          resource_type: 'video',
          display_name: 'The lesson',
          position: 1,
          external_url: 'https://cdn.example.com/a.mp4',
          media_asset_id: null,
          access_classification: 'enrolled',
        },
      ],
    },
  });

  const lesson = (await fetchLesson(client, 'l-1')) as Lesson;
  assert.ok(lesson, 'fetchLesson returned null for a lesson that exists');

  assert.equal(lesson.sectionTitle, 'Basics');
  assert.equal(lesson.courseVersionId, 'v-1');
  assert.equal(lesson.title, 'Introduction to Tajweed');
  assert.equal(lesson.durationSeconds, 754);
  assert.equal(lesson.isPreview, false);

  assert.equal(lesson.resources.length, 1);
  const r = lesson.resources[0];
  assert.equal(r?.displayName, 'The lesson');
  assert.equal(r?.resourceType, 'video');
  assert.equal(r?.externalUrl, 'https://cdn.example.com/a.mp4');
  assert.equal(r?.accessClassification, 'enrolled');

  assert.ok(
    calls.some((c) => c.table === 'lessons'),
    'the lesson row was never fetched',
  );
  assert.ok(
    calls.some((c) => c.table === 'lesson_resources'),
    'the resources were never fetched',
  );
});

test('fetchLesson tolerates a lesson with no resources', async () => {
  const { client } = stubClient({
    lessons: { ...LESSON_ROW, course_sections: null },
    lesson_resources: { data: [], error: null },
  });

  const lesson = (await fetchLesson(client, 'l-1')) as Lesson;
  assert.ok(lesson);
  assert.deepEqual(lesson.resources, []);
  // A missing section join must degrade, not throw — the page still has to
  // render the lesson.
  assert.equal(lesson.sectionTitle, '');
  assert.equal(lesson.courseVersionId, '');
});

test('fetchLesson returns null for a lesson that is not visible', async () => {
  const { client } = stubClient({});
  const lesson = await fetchLesson(client, 'missing');
  assert.equal(lesson, null);
});

test('a failed resource query is an error, not an empty lesson', async () => {
  // The distinction matters: an empty list means "you may not see these", a
  // failure means something is broken. Collapsing them would make an outage
  // look like an entitlement denial.
  const { client } = stubClient({
    lessons: LESSON_ROW,
    lesson_resources: { error: { message: 'connection reset' } },
  });

  await assert.rejects(() => fetchLesson(client, 'l-1'), /connection reset/);
});

test('canAccessLesson passes both ids and treats failure as no access', async () => {
  const ok = stubClient({ rpc: { data: true } });
  assert.equal(await canAccessLesson(ok.client, 'learner-1', 'l-1'), true);
  const rpcCall = ok.calls.find((c) => c.method === 'rpc');
  assert.deepEqual(rpcCall?.args, {
    p_learner_id: 'learner-1',
    p_lesson_id: 'l-1',
  });

  // Deny on error. Access control that defaults to open when the database
  // hiccups is not access control.
  const failing = stubClient({ rpc: { error: { message: 'timeout' } } });
  assert.equal(await canAccessLesson(failing.client, 'learner-1', 'l-1'), false);

  const noData = stubClient({ rpc: { data: null } });
  assert.equal(await canAccessLesson(noData.client, 'learner-1', 'l-1'), false);
});

test('native playback recognises direct HTTPS video and audio files', () => {
  assert.equal(nativeMediaKind({ resourceType: 'video', externalUrl: 'https://media.example/lesson.mp4?token=abc' }), 'video');
  assert.equal(nativeMediaKind({ resourceType: 'video', externalUrl: 'https://media.example/lesson.webm' }), 'video');
  assert.equal(nativeMediaKind({ resourceType: 'audio', externalUrl: 'https://media.example/recitation.mp3#chapter' }), 'audio');
  assert.equal(nativeMediaKind({ resourceType: 'audio', externalUrl: 'https://media.example/recitation.ogg' }), 'audio');
});

test('native playback refuses non-HTTPS, mismatched types and non-media pages', () => {
  assert.equal(nativeMediaKind({ resourceType: 'video', externalUrl: 'http://media.example/lesson.mp4' }), null);
  assert.equal(nativeMediaKind({ resourceType: 'audio', externalUrl: 'https://media.example/lesson.mp4' }), null);
  assert.equal(nativeMediaKind({ resourceType: 'video', externalUrl: 'https://video.example/watch/123' }), null);
  assert.equal(nativeMediaKind({ resourceType: 'document', externalUrl: 'https://media.example/lesson.mp4' }), null);
  assert.equal(nativeMediaKind({ resourceType: 'audio', externalUrl: 'not a url' }), null);
});

// ---------------------------------------------------------------------------
// Many lessons' media in one query
//
// A reviewer's screen lists a whole version, and one query per lesson would be
// one round trip per row of the outline for the same table. What matters here is
// that the query asks for the media rows only, and that a failure is thrown
// rather than turned into an empty list: "no media" and "you may not see this"
// are different sentences and a screen cannot tell them apart otherwise.
// ---------------------------------------------------------------------------

function stubResources(rows: unknown[], options: { error?: string } = {}) {
  const calls: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: (columns: string) => {
      calls.push(`select:${columns}`);
      return chain;
    },
    in: (column: string, values: unknown[]) => {
      calls.push(`in:${column}=${values.join(',')}`);
      return chain;
    },
    not: (column: string, op: string, value: unknown) => {
      calls.push(`not:${column} ${op} ${String(value)}`);
      return chain;
    },
    order: (column: string) => {
      calls.push(`order:${column}`);
      return chain;
    },
    then: (
      resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => void,
    ) =>
      resolve(
        options.error
          ? { data: null, error: { message: options.error } }
          : { data: rows, error: null },
      ),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from: (table: string) => { calls.push(`from:${table}`); return chain; } } as any, calls };
}

const resourceRow = (over: Record<string, unknown> = {}) => ({
  id: 'resource-1',
  lesson_id: 'lesson-1',
  resource_type: 'video',
  display_name: 'Recorded lesson',
  position: 1,
  external_url: null,
  media_asset_id: 'asset-1',
  access_classification: 'entitled',
  ...over,
});

await test('the media of many lessons is asked for in one query', async () => {
  const stub = stubResources([resourceRow()]);
  const rows = await fetchMediaResourcesForLessons(stub.client, ['lesson-1', 'lesson-2']);

  assert.ok(stub.calls.includes('from:lesson_resources'), 'the wrong table was asked');
  assert.equal(stub.calls.find((c) => c.startsWith('in:')), 'in:lesson_id=lesson-1,lesson-2');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.lessonId, 'lesson-1', 'the lesson a resource belongs to was lost');
  assert.equal(rows[0]?.mediaAssetId, 'asset-1');
  assert.equal(rows[0]?.displayName, 'Recorded lesson');
});

await test('only rows with a master behind them are asked for', async () => {
  const stub = stubResources([]);
  await fetchMediaResourcesForLessons(stub.client, ['lesson-1']);
  assert.equal(stub.calls.find((c) => c.startsWith('not:')), 'not:media_asset_id is null',
    'a document or an external URL was fetched for a player that cannot use it');
  assert.equal(stub.calls.find((c) => c.startsWith('order:')), 'order:position');
});

await test('lesson ids are deduped and blanks dropped', async () => {
  const stub = stubResources([]);
  await fetchMediaResourcesForLessons(stub.client, ['lesson-1', 'lesson-1', ' ', 'lesson-2']);
  assert.equal(stub.calls.find((c) => c.startsWith('in:')), 'in:lesson_id=lesson-1,lesson-2');
});

await test('no lessons means no query at all', async () => {
  const stub = stubResources([resourceRow()]);
  const rows = await fetchMediaResourcesForLessons(stub.client, []);
  assert.deepEqual(rows, []);
  assert.deepEqual(stub.calls, [], 'nothing is asked of the database');
});

await test('a failed read is thrown, not turned into an empty outline', async () => {
  const stub = stubResources([], { error: 'permission denied for table lesson_resources' });
  await assert.rejects(
    () => fetchMediaResourcesForLessons(stub.client, ['lesson-1']),
    /permission denied/,
  );
});

await test('a null result is an empty list, because the driver says null for no rows', async () => {
  const stub = stubResources(null as unknown as unknown[]);
  const rows: LessonMediaResource[] = await fetchMediaResourcesForLessons(stub.client, ['lesson-1']);
  assert.deepEqual(rows, []);
});
