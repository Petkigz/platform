import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { courseSlug, createCourse, slugify } from './authoring.ts';
import { newCourseAnswerOf, newCourseSentence, type NewCourseWords } from './course-create.ts';

// Creating a course from `/teach`, which is written in the reader's language
// since 2026-11-28: the address a title is given, what the library answers,
// and how the form reads the route.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u; // the check on `courses.slug`
const tail = () => 'abcdef0123';

test('a title the address can carry whole keeps its own slug', () => {
  assert.equal(courseSlug('Introduction to Tajweed', tail), 'introduction-to-tajweed');
  // An accent is taken off and nothing is lost.
  assert.equal(courseSlug('Introducción al tajwid', tail), 'introduccion-al-tajwid');
  assert.equal(courseSlug('Việc học', tail), 'viec-hoc');
  assert.equal(courseSlug('  Fiqh: level 2!  ', tail), 'fiqh-level-2');
});

test('a title in letters the address cannot carry is given a tail, not refused', () => {
  // Until 2026-11-28 each of these was refused as having "no usable letters".
  for (const title of ['مقدمة في التجويد', 'তাজবিদ পরিচিতি', '泰吉威德入门', 'தஜ்வீத் அறிமுகம்', 'ตัจวีดเบื้องต้น', 'Тәжуидке кіріспе']) {
    assert.equal(courseSlug(title, tail), 'course-abcdef0123', title);
  }
  // Part of the title survives: it is kept, and the tail keeps two such titles apart.
  assert.equal(courseSlug('Tajweed مقدمة', tail), 'tajweed-abcdef0123');
  assert.equal(courseSlug('تجويد 1', tail), '1-abcdef0123');
  // A letter that has no plain form (ı, ß, ø) is a lost letter too.
  assert.equal(courseSlug('Başlangıç', tail), 'baslang-c-abcdef0123');
  // Two courses with one such title get two addresses.
  assert.notEqual(courseSlug('مقدمة في التجويد'), courseSlug('مقدمة في التجويد'));
});

test('every slug passes the column’s check, however long or odd the title', () => {
  const titles = [
    'Introduction to Tajweed', 'مقدمة في التجويد', 'Tajweed مقدمة', 'x'.repeat(200), 'a '.repeat(100),
    `${'word '.repeat(11)}tail`, `${'ab-'.repeat(19)}ab cd`, `${'long'.repeat(20)} مقدمة`, 'Başlangıç', '1', 'Ａ１',
  ];
  for (const title of titles) {
    const slug = courseSlug(title);
    assert.match(slug, SLUG, title);
    assert.ok(slug.length <= 60, title);
  }
  // Cutting at sixty used to be able to leave the cut on a hyphen.
  const cut = `${'a'.repeat(59)} b`;
  assert.equal(slugify(cut), 'a'.repeat(59));
  assert.match(slugify(cut), SLUG);
  // Punctuation alone has no letter to lose and leaves nothing.
  assert.equal(courseSlug('???', tail), '');
  assert.equal(courseSlug('—', tail), '');
});

type Step = { data?: unknown; error?: { message: string; code?: string } | null };
function client(course: Step, version: Step = { data: { id: 'v1' } }) {
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const supabase = {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserts.push({ table, row });
          const step = table === 'courses' ? course : version;
          return { select: () => ({ single: async () => ({ data: step.data ?? null, error: step.error ?? null }) }) };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { supabase, inserts };
}

test('creating a course answers with a reason, never a sentence', async () => {
  const made = client({ data: { id: 'c1' } });
  assert.deepEqual(await createCourse(made.supabase, { title: ' مقدمة في التجويد ', userId: 'u1' }), {
    ok: true,
    value: { courseId: 'c1', versionId: 'v1' },
  });
  assert.equal(made.inserts[0]?.row.title, 'مقدمة في التجويد');
  assert.match(String(made.inserts[0]?.row.slug), /^course-[0-9a-f]{10}$/u);
  assert.deepEqual(made.inserts[1]?.row, { course_id: 'c1', version_number: 1, created_by: 'u1' });

  // No title, or punctuation alone: nothing is sent.
  for (const title of ['', '   ', '???']) {
    const none = client({ data: { id: 'c1' } });
    assert.deepEqual(await createCourse(none.supabase, { title, userId: 'u1' }), { ok: false, code: 'title' });
    assert.equal(none.inserts.length, 0);
  }

  const taken = client({ error: { code: '23505', message: 'duplicate key value violates unique constraint "courses_slug_key"' } });
  assert.deepEqual(await createCourse(taken.supabase, { title: 'Tajweed', userId: 'u1' }), { ok: false, code: 'duplicate' });

  const refused = client({ error: { code: '42501', message: 'new row violates row-level security policy for table "courses"' } });
  assert.deepEqual(await createCourse(refused.supabase, { title: 'Tajweed', userId: 'u1' }), {
    ok: false,
    code: 'refused',
    said: 'new row violates row-level security policy for table "courses"',
  });
  assert.equal(refused.inserts.length, 1);
});

test('no answer is not called a refusal, and neither is a course left without its version', async () => {
  // A gateway's page has no code; class 08 is the connection itself.
  for (const error of [{ message: '<html>502 Bad Gateway</html>' }, { code: '08006', message: 'connection failure' }, { code: '', message: 'fetch failed' }]) {
    const lost = client({ error });
    assert.deepEqual(await createCourse(lost.supabase, { title: 'Tajweed', userId: 'u1' }), { ok: false, code: 'unsure' });
  }
  // The course row exists; "not created" would be false and would invite a second one.
  const half = client({ data: { id: 'c1' } }, { error: { code: '42501', message: 'new row violates row-level security policy' } });
  assert.deepEqual(await createCourse(half.supabase, { title: 'Tajweed', userId: 'u1' }), { ok: false, code: 'unsure' });
});

const WORDS: NewCourseWords = {
  title: 'T', field: 'F', example: 'X', create: 'C', creating: 'C…',
  eTitle: 'title!', eDuplicate: 'duplicate!', eRefused: 'refused:', eUnsure: 'unsure!', eSignedOut: 'signed out!',
  markEnglish: true,
};
const ID = '0b9f6a52-3c1e-4d7a-9a55-6f2f0c1d2e3f';

test('the form believes only an answer of the route’s own', () => {
  assert.deepEqual(newCourseAnswerOf(200, { ok: true, value: { courseId: ID, versionId: 'v' } }), { ok: true, courseId: ID });
  assert.deepEqual(newCourseAnswerOf(400, { ok: false, code: 'title' }), { ok: false, refusal: 'title', said: null });
  assert.deepEqual(newCourseAnswerOf(409, { ok: false, code: 'duplicate' }), { ok: false, refusal: 'duplicate', said: null });
  assert.deepEqual(newCourseAnswerOf(400, { ok: false, code: 'refused', said: ' no ' }), { ok: false, refusal: 'refused', said: 'no' });
  assert.deepEqual(newCourseAnswerOf(401, { ok: false, code: 'rejected', message: 'Sign in first.' }), { ok: false, refusal: 'signedOut', said: null });
  assert.deepEqual(newCourseAnswerOf(401, null), { ok: false, refusal: 'signedOut', said: null });
  const unsure = { ok: false, refusal: 'unsure', said: null };
  for (const [status, body] of [
    [0, null],                                        // the connection went
    [502, null],                                      // a gateway's page
    [502, { ok: false, code: 'unsure' }],             // the route itself does not know
    [200, { ok: true }],                              // a success that names no course
    [200, { ok: true, value: { courseId: '../x' } }], // or names something that is no id
    [200, 'ok'],
    [400, { ok: false, code: 'refused' }],            // a refusal with nothing said
    [400, { ok: false, code: 'refused', said: '  ' }],
    [400, { ok: false, code: 'rejected', message: 'Malformed request.' }],
    [500, { error: 'x' }],
    [200, []],
  ] as const) {
    assert.deepEqual(newCourseAnswerOf(status, body), unsure, JSON.stringify([status, body]));
  }
  // The database's sentence is cut, so a page of it cannot fill the form.
  const long = newCourseAnswerOf(400, { ok: false, code: 'refused', said: 'x'.repeat(2000) });
  assert.equal(long.ok === false && long.said?.length, 500);
});

test('each refusal has its own sentence out of the page’s words', () => {
  assert.equal(newCourseSentence(WORDS, 'title'), 'title!');
  assert.equal(newCourseSentence(WORDS, 'duplicate'), 'duplicate!');
  assert.equal(newCourseSentence(WORDS, 'refused'), 'refused:');
  assert.equal(newCourseSentence(WORDS, 'unsure'), 'unsure!');
  assert.equal(newCourseSentence(WORDS, 'signedOut'), 'signed out!');
});
