import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { playbackOf, previewOf, rowFor } from './lesson-preview.ts';

/**
 * The page half of the lesson preview.
 *
 * `lesson-preview.test.ts` pins the decisions. These tests pin the three things
 * about the page that would be wrong silently: who may open it, what it refuses
 * to fake, and where the door to it is.
 *
 * Reading the source is a blunt instrument — it can prove a gate is written, not
 * that it runs first. It is used here because the alternative is worse: a page
 * this sensitive is either tested by reading it, or it is not tested at all until
 * a stranger's guessed URL renders somebody else's draft.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, '..', path), 'utf8');

const PAGE = 'app/teach/[courseId]/preview/[lessonId]/page.tsx';
const page = read(PAGE);
const REHEARSAL = 'app/teach/[courseId]/preview/page.tsx';
const rehearsal = read(REHEARSAL);
const curriculum = read('app/teach/[courseId]/curriculum.tsx');
const teachPage = read('app/teach/[courseId]/page.tsx');

test('the preview is the author’s, and only the author’s', () => {
  // Signed in, or sent to sign-in — the same door as the editor itself.
  assert.match(page, /if \(!user\) redirect\(/);

  // Ownership, checked against `courses.created_by` rather than trusted from the
  // URL. `courses_read` would otherwise admit any active course to any
  // signed-in user.
  assert.match(page, /course\.created_by !== user\.id/);
  assert.match(page, /if \(!course \|\| course\.created_by !== user\.id\) notFound\(\)/);

  // And the lesson must belong to *this* course's version, or a lesson id from
  // another course would resolve under a course the caller does own.
  assert.match(page, /version\.course_id !== course\.id/);
});

test('the preview decides what a learner sees by the live flag, not by assumption', () => {
  assert.match(page, /isFlagEnabled\(supabase, 'learning\.previews'\)/);
  // The publish state is passed in, because the same warning means "to do" on a
  // draft and "live problem" on a published version.
  assert.match(page, /previewOf\(/);
  assert.match(page, /\{ previewsOn, published \}/);
});

test('the preview does not re-render the learner page', () => {
  // The learner page's components are bound to an enrolment: progress, notes,
  // discussion, practice. Importing any of them would mean the preview needs an
  // enrolment, or fakes one.
  for (const forbidden of ['MarkComplete', 'Discussion', 'PracticeCheck', 'StudyTools', 'RenditionPlayer']) {
    assert.ok(!page.includes(forbidden), `${forbidden} belongs to the learner page, not to the preview`);
  }
  assert.ok(!page.includes("/learn/[enrolmentId]"), 'the preview must not import the learner route');

  // It still uses the learner page's *rules*, rather than restating them.
  assert.match(page, /from '@\/lib\/lesson-preview'/);
});

test('the page names what it cannot show, instead of showing it', () => {
  // The banner lists the enrolled-only parts by name. A preview of a page that
  // does not exist is worse than no preview.
  assert.match(page, /progress/);
  assert.match(page, /notes/i);
  assert.match(page, /discussion/i);
});

test('the preview prints the learner’s label, never the column value', () => {
  // The public sample page puts `resource_type` in a badge, so a stranger reads
  // "public_preview"-style snake case. A teacher gets `RESOURCE_LABEL`'s word.
  assert.match(page, /row\.label/);
  assert.ok(
    !/row\.type\s*\}/.test(page),
    'printing row.type in the list would put the raw column value on screen',
  );
  assert.equal(rowFor({ id: 'r', resourceName: 'n', resourceType: 'worksheet', externalUrl: null, access: 'enrolled' }, true).label, 'Worksheet');
});

test('the preview is built from the lessons table, which is where the description lives', () => {
  // `AuthoredLesson` has neither a description nor a duration, so a preview
  // assembled from `fetchVersions()` would silently show neither and would
  // then warn about a missing description that exists.
  assert.match(page, /\.from\('lessons'\)/);
  assert.match(page, /description/);
  assert.match(page, /duration_seconds/);
  assert.ok(!page.includes('fetchVersions'), 'fetchVersions cannot supply the description');
});

test('a broken lesson still renders: these are notes, not blocks', () => {
  // The page must never decide that a lesson is unpublishable. The only
  // `notFound()` calls are about identity, not quality.
  const preview = previewOf(
    {
      id: 'l',
      title: 'Empty',
      isPreview: false,
      sectionTitle: 'S',
      description: null,
      durationSeconds: null,
      resources: [],
    },
    { previewsOn: false, published: false },
  );
  assert.ok(preview.warnings.length > 0);
  assert.deepEqual(preview.rows, []);

  // And the page renders from `preview.rows` / `preview.warnings` rather than
  // re-deriving either.
  assert.match(page, /preview\.rows/);
  assert.match(page, /preview\.warnings/);
  assert.match(page, /preview\.hasDescription/);
  assert.equal(playbackOf({ id: 'r', resourceName: 'n', resourceType: 'video', externalUrl: null, access: 'enrolled' }), 'nothing');
});

test('every lesson in the editor has a door to its preview', () => {
  // `courseId` was not a prop of the editor before this; the link needs it.
  assert.match(curriculum, /courseId: string;/);
  assert.match(curriculum, /href=\{`\/teach\/\$\{courseId\}\/preview\/\$\{l\.id\}`\}/);
  assert.match(teachPage, /<Curriculum\s*\n?\s*courseId=\{row\.id\}/);

  // The link is outside `editable`, unlike every control in that list: a
  // published version is frozen, and "what does a learner see" is exactly the
  // question you cannot answer from inside it.
  const link = curriculum.indexOf('/teach/${courseId}/preview/${l.id}');
  assert.ok(link > 0);
  const before = curriculum.slice(0, link);
  const lastEditable = before.lastIndexOf('{editable && (');
  const lastClose = before.lastIndexOf(')}');
  assert.ok(
    lastClose > lastEditable,
    'the preview link must not sit inside an `editable &&` block',
  );
});

// ---------------------------------------------------------------------------
// The whole version, rehearsed at once
// ---------------------------------------------------------------------------

test('the rehearsal is the author’s, gated exactly like the editor', () => {
  assert.match(rehearsal, /if \(!user\) redirect\(/);
  assert.match(rehearsal, /courses'?\)?\s*\n?\s*\.select\('id, slug, title, created_by'\)/);
  assert.match(rehearsal, /course\.created_by !== user\.id/);
  // And it rehearses the draft — the thing the teacher is about to change —
  // falling back to the newest version when there is none.
  assert.match(rehearsal, /version_status === 'draft'/);
  assert.match(rehearsal, /draft \?\? versions\[0\] \?\? null/);
});

test('the rehearsal reads every lesson and every resource in one query each', () => {
  // Forty lessons must not be forty round trips, and an N+1 here is invisible
  // until a real course exists.
  assert.match(rehearsal, /\.in\('section_id', sections\.map/);
  assert.match(rehearsal, /\.in\('lesson_id', lessonIds\)/);
  assert.ok(!/lessons\.map\(async/.test(rehearsal), 'no per-lesson await');
});

test('the rehearsal is a list in reading order, not a gate', () => {
  // It renders the curriculum's own order and offers no submit control: the
  // submission requirements live on the curriculum page, and a rehearsal that
  // could refuse would be a second opinion about when a course is finished.
  assert.match(rehearsal, /rehearseVersion\(/);
  const jsx = rehearsal.slice(rehearsal.indexOf('return ('));
  assert.ok(!/type="submit"/.test(jsx));
  assert.ok(!/api\/(teach|review)/.test(jsx), 'the rehearsal writes nothing');

  // The worst lesson is named above the list rather than the list being sorted
  // by brokenness, so the course still looks like the thing its author wrote.
  assert.match(rehearsal, /rehearsal\.next &&/);
  assert.match(rehearsal, /rehearsal\.sections\.map/);
});

test('both preview screens are reachable from the editor', () => {
  // One lesson at a time from every row, the whole version from the top.
  assert.match(curriculum, /href=\{`\/teach\/\$\{courseId\}\/preview\/\$\{l\.id\}`\}/);
  assert.match(teachPage, /href=\{`\/teach\/\$\{row\.id\}\/preview`\}/);
  assert.match(teachPage, /Rehearse the whole version/);
});
