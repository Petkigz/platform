import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canAccessLesson,
  fetchLesson,
  formatDuration,
  RESOURCE_LABEL,
  type Lesson,
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
