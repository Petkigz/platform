import assert from 'node:assert/strict';
import test from 'node:test';

import {
  availabilityLabel,
  fetchSavedCourses,
  isCourseSaved,
  mapWishlistError,
  removeSavedCourse,
  SAVED_MAX,
  SAVED_NOTE_MAX,
  saveCourse,
  setSavedNote,
  validateNote,
} from './wishlist.ts';

// ---------------------------------------------------------------------------
// What is worth pinning here:
//
//   * no caller may supply an owner id — the database corrects it, and a payload
//     that contains one is a bug in this module
//   * the saved list must not filter by user id, because row level security is
//     what makes the list private; a filter here would hide a policy mistake
//   * deleting nothing is a failure, not a success, since a wrong id and someone
//     else's id are indistinguishable through RLS
//   * availability and whose enrolment it is decide the sentence the learner
//     reads, so they are computed here rather than left to the page
// ---------------------------------------------------------------------------

type Call = {
  table: string;
  select: string;
  filters: Record<string, unknown>;
  order: string | null;
  op: string;
  payload?: unknown;
  opts?: unknown;
  /** Kept apart from `opts`, which the later `.select()` call overwrites. */
  upsertOpts?: unknown;
};

function stubClient(
  tables: Record<string, unknown[]>,
  error: { message: string; code?: string } | null = null,
) {
  const log: Call[] = [];

  function makeChain(table: string) {
    const rec: Call = { table, select: '', filters: {}, order: null, op: 'select' };
    log.push(rec);
    const rows = tables[table] ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    chain.select = (s: string, opts?: unknown) => { rec.select = s; rec.opts = opts; return chain; };
    chain.eq = (c: string, v: unknown) => { rec.filters[c] = v; return chain; };
    chain.in = (c: string, v: unknown) => { rec.filters[c] = v; return chain; };
    chain.is = (c: string, v: unknown) => { rec.filters[c] = v; return chain; };
    chain.order = (c: string, o?: { ascending?: boolean }) => {
      rec.order = `${c}:${o?.ascending === false ? 'desc' : 'asc'}`;
      return chain;
    };
    chain.limit = () => chain;
    chain.upsert = (p: unknown, o: unknown) => { rec.op = 'upsert'; rec.payload = p; rec.upsertOpts = o; return chain; };
    chain.update = (p: unknown) => { rec.op = 'update'; rec.payload = p; return chain; };
    chain.delete = () => { rec.op = 'delete'; return chain; };
    chain.maybeSingle = async () => ({ data: rows[0] ?? null, error });
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows, error }).then(resolve);
    return chain;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = { from: (table: string) => makeChain(table) } as any;
  return { client, log };
}

const publishedVersion = { version_status: 'published' };
const draftVersion = { version_status: 'draft' };

// ---------------------------------------------------------------------------
// The note
// ---------------------------------------------------------------------------

test('a note is trimmed, and blank means none', () => {
  assert.equal(validateNote({ note: '   ' }).ok, true);
  const blank = validateNote({ note: '   ' });
  if (blank.ok) assert.equal(blank.note, null);

  const trimmed = validateNote({ note: '  For Amina  ' });
  if (trimmed.ok) assert.equal(trimmed.note, 'For Amina');

  assert.equal(validateNote({}).ok, true);
  assert.equal(validateNote({ note: 42 }).ok, true, 'a non-string note is treated as none');
});

test('an overlong note is refused before it is sent', () => {
  assert.equal(validateNote({ note: 'x'.repeat(SAVED_NOTE_MAX) }).ok, true);
  const tooLong = validateNote({ note: 'x'.repeat(SAVED_NOTE_MAX + 1) });
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.equal(tooLong.status, 400);
});

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

test('saving never sends an owner id', async () => {
  const { client, log } = stubClient({ course_wishlist: [{ id: 'w-1' }] });
  const result = await saveCourse(client, { courseId: 'c-1', note: 'later' });

  assert.equal(result.ok, true);
  const call = log[0];
  assert.equal(call?.table, 'course_wishlist');
  assert.equal(call?.op, 'upsert');
  assert.deepEqual(Object.keys((call?.payload ?? {}) as object).sort(), ['course_id', 'note']);
  // The conflict target names the real unique constraint. Naming only
  // `course_id` would ask Postgres for a constraint that does not exist.
  assert.deepEqual(call?.upsertOpts, { onConflict: 'user_id,course_id' });
});

test('saving without a course id never reaches the database', async () => {
  const { client, log } = stubClient({ course_wishlist: [] });
  const result = await saveCourse(client, { courseId: '  ' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
  assert.equal(log.length, 0);
});

test('a refusal arrives as a sentence a person can act on', async () => {
  const retired = stubClient(
    { course_wishlist: [] },
    { message: 'this course is no longer offered' },
  );
  const first = await saveCourse(retired.client, { courseId: 'c-1' });
  assert.equal(first.ok, false);
  if (!first.ok) {
    assert.equal(first.status, 409);
    assert.equal(first.error, 'That course is no longer offered.');
  }

  const capped = stubClient(
    { course_wishlist: [] },
    { message: `you have saved ${SAVED_MAX} courses already; remove one first`, code: 'program_limit_exceeded' },
  );
  const second = await saveCourse(capped.client, { courseId: 'c-1' });
  if (!second.ok) assert.match(second.error, /Remove one first/);

  const missing = mapWishlistError({ message: 'course not found', code: 'P0002' });
  if (!missing.ok) assert.equal(missing.status, 404);

  const foreign = mapWishlistError({ message: 'new row violates row-level security policy' });
  if (!foreign.ok) {
    assert.equal(foreign.status, 403);
    assert.equal(foreign.error, 'Sign in to save a course.');
  }
});

test('editing a note sends only the note', async () => {
  const { client, log } = stubClient({ course_wishlist: [{ id: 'w-1' }] });
  const result = await setSavedNote(client, { savedId: 'w-1', note: '  for Yusuf  ' });
  assert.equal(result.ok, true);
  assert.equal(log[0]?.op, 'update');
  assert.deepEqual(log[0]?.payload, { note: 'for Yusuf' });
  assert.deepEqual(log[0]?.filters, { id: 'w-1' });
});

// ---------------------------------------------------------------------------
// Removing
// ---------------------------------------------------------------------------

test('removing nothing is a failure, because RLS makes the cases identical', async () => {
  const { client } = stubClient({ course_wishlist: [] });
  const result = await removeSavedCourse(client, 'w-1');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 404);
    assert.match(result.error, /not found/i);
  }
});

test('removing a saved course reports success', async () => {
  const { client, log } = stubClient({ course_wishlist: [{ id: 'w-1' }] });
  const result = await removeSavedCourse(client, 'w-1');
  assert.equal(result.ok, true);
  assert.equal(log[0]?.op, 'delete');
});

test('removing without an id never reaches the database', async () => {
  const { client, log } = stubClient({ course_wishlist: [{ id: 'w-1' }] });
  assert.equal((await removeSavedCourse(client, '')).ok, false);
  assert.equal(log.length, 0);
});

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

test('the saved list is not filtered by user id', async () => {
  const { client, log } = stubClient({
    course_wishlist: [],
    course_enrolments: [],
    learner_profiles: [],
  });
  await fetchSavedCourses(client, { userId: 'me' });
  const savedQuery = log.find((c) => c.table === 'course_wishlist');
  assert.deepEqual(savedQuery?.filters, {}, 'a user_id filter was sent');
  assert.equal(savedQuery?.order, 'created_at:desc');
});

test('availability comes from the published version, not the course row', async () => {
  const { client } = stubClient({
    course_wishlist: [
      {
        id: 'w-1', course_id: 'c-1', note: null, created_at: '2026-10-01T09:00:00Z',
        courses: [{ title: 'Tajweed', slug: 'tajweed', status: 'active', deleted_at: null, course_versions: [draftVersion, publishedVersion] }],
      },
      {
        id: 'w-2', course_id: 'c-2', note: 'waiting', created_at: '2026-10-02T09:00:00Z',
        courses: [{ title: 'Fiqh of fasting', slug: 'fiqh-fasting', status: 'active', deleted_at: null, course_versions: [draftVersion] }],
      },
      {
        id: 'w-3', course_id: 'c-3', note: null, created_at: '2026-10-03T09:00:00Z',
        courses: [{ title: 'Old course', slug: 'old', status: 'retired', deleted_at: null, course_versions: [publishedVersion] }],
      },
      {
        id: 'w-4', course_id: 'c-4', note: null, created_at: '2026-10-04T09:00:00Z',
        courses: [{ title: 'Gone', slug: 'gone', status: 'active', deleted_at: '2026-10-05T09:00:00Z', course_versions: [publishedVersion] }],
      },
      { id: 'w-5', course_id: 'c-5', note: null, created_at: '2026-10-05T09:00:00Z', courses: null },
    ],
    course_enrolments: [],
    learner_profiles: [{ id: 'lp-me' }],
  });

  const saved = await fetchSavedCourses(client, { userId: 'me' });
  assert.deepEqual(
    saved.map((s) => s.availability),
    ['available', 'unpublished', 'retired', 'retired', 'retired'],
  );
  assert.equal(saved[4]?.courseTitle, 'A course that is no longer here');
  assert.equal(availabilityLabel(saved[0]!), 'Available now');
  assert.equal(availabilityLabel(saved[1]!), 'Not published yet');
  assert.equal(availabilityLabel(saved[2]!), 'No longer offered');
});

test('an enrolment says whose it is, and yours reads as yours', async () => {
  const { client, log } = stubClient({
    course_wishlist: [
      {
        id: 'w-1', course_id: 'c-1', note: null, created_at: '2026-10-01T09:00:00Z',
        courses: [{ title: 'Tajweed', slug: 'tajweed', status: 'active', deleted_at: null, course_versions: [publishedVersion] }],
      },
      {
        id: 'w-2', course_id: 'c-2', note: null, created_at: '2026-10-02T09:00:00Z',
        courses: [{ title: 'Arabic 1', slug: 'arabic-1', status: 'active', deleted_at: null, course_versions: [publishedVersion] }],
      },
    ],
    course_enrolments: [
      { course_id: 'c-1', learner_profile_id: 'lp-me', learner_profiles: [{ display_name: 'Me' }] },
      { course_id: 'c-2', learner_profile_id: 'lp-child', learner_profiles: [{ display_name: 'Amina' }] },
    ],
    learner_profiles: [{ id: 'lp-me' }],
  });

  const saved = await fetchSavedCourses(client, { userId: 'me' });
  assert.equal(availabilityLabel(saved[0]!), 'You are enrolled');
  assert.equal(availabilityLabel(saved[1]!), 'Enrolled for Amina');

  // One enrolment query for the whole list, not one per saved course: a list
  // may hold a hundred rows.
  const enrolmentQueries = log.filter((c) => c.table === 'course_enrolments');
  assert.equal(enrolmentQueries.length, 1);
  assert.deepEqual(enrolmentQueries[0]?.filters.course_id, ['c-1', 'c-2']);
  assert.deepEqual(enrolmentQueries[0]?.filters.status, ['active', 'completed']);
});

test('an empty saved list asks nothing else', async () => {
  const { client, log } = stubClient({ course_wishlist: [] });
  const saved = await fetchSavedCourses(client, { userId: 'me' });
  assert.deepEqual(saved, []);
  assert.equal(log.length, 1, 'an empty list still queried enrolments');
});

test('a read error propagates rather than becoming an empty list', async () => {
  const { client } = stubClient({ course_wishlist: [] }, { message: 'permission denied for table course_wishlist' });
  await assert.rejects(() => fetchSavedCourses(client, { userId: 'me' }), /permission denied/);
});

test('the course page asks one question and gets the note with it', async () => {
  const { client, log } = stubClient({ course_wishlist: [{ id: 'w-1', note: 'for Amina' }] });
  const state = await isCourseSaved(client, 'c-1');
  assert.deepEqual(state, { saved: true, id: 'w-1', note: 'for Amina' });
  assert.equal(log[0]?.select, 'id, note');
  assert.deepEqual(log[0]?.filters, { course_id: 'c-1' }, 'a user_id filter was sent');

  const none = stubClient({ course_wishlist: [] });
  assert.deepEqual(await isCourseSaved(none.client, 'c-1'), { saved: false, id: null, note: null });
});
