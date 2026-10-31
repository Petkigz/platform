import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { rehearsalFrom } from './version-rehearsal.ts';
import type { AuthoredVersion } from './authoring.ts';

/**
 * The reviewer's seat.
 *
 * A reviewer decides whether a course may reach learners, and until this screen
 * they could see the outline, the requirements and — for files that happened to
 * have a delivery copy — a player. What they could not see was the lesson that
 * had nothing in it, the recording that never encoded, or the link that will not
 * play. Those are the facts that decide whether the course is ready, and they were
 * one screen away.
 *
 * These tests pin the wiring, because every one of these failures is silent: a
 * reviewer would see a page that looks entirely correct and decide on it.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, '..', path), 'utf8');

const reviewPage = read('app/review/[assignmentId]/page.tsx');
const previewPage = read('app/teach/[courseId]/preview/[lessonId]/page.tsx');
const reviewLib = read('lib/review.ts');

test('the reviewer is shown the same rehearsal the author is', () => {
  assert.match(reviewPage, /loadRehearsal\(supabase, assignment\.courseVersionId/);
  // Not a second implementation: the counts, the severity and the named lesson
  // all come from the one module.
  assert.ok(!/previewOf\(/.test(reviewPage), 'the review page must not decide for itself');
  assert.match(reviewPage, /rehearsal\.withSomething/);
  assert.match(reviewPage, /rehearsal\.next/);
  assert.match(reviewPage, /SEVERITY\.empty|SEVERITY\.silent/);
});

test('the reviewer is told what a learner gets, not what to decide', () => {
  // A scholarly reviewer judges what is taught; this panel says what arrives.
  // A panel that read as a verdict would be the platform deciding the review.
  assert.match(reviewPage, /The decision is yours/);
  assert.match(reviewPage, /nothing here is a reason to accept or decline on its own/);
  // And it must not carry the author's imperative.
  assert.ok(!/Before this reaches a learner/.test(reviewPage));
});

test('an unreadable encoding state is admitted, not reported as broken', () => {
  // A timeout on the delivery read must not turn into "this file does not play":
  // the reviewer would be told something false about a lesson they must judge.
  assert.match(reviewPage, /loaded && !loaded\.deliveryKnown/);
  assert.match(reviewPage, /nobody asked about rather than one that failed/);

  const version: AuthoredVersion = {
    id: 'v',
    versionNumber: 1,
    status: 'draft',
    lessonCount: 1,
    sections: [
      {
        id: 's',
        title: 'S',
        position: 1,
        lessons: [
          {
            id: 'l',
            title: 'L',
            position: 1,
            isPreview: false,
            description: 'd',
            durationSeconds: null,
            resources: [
              {
                id: 'r',
                resourceName: 'File',
                resourceType: 'video',
                externalUrl: null,
                mediaAssetId: 'a',
                access: 'enrolled',
                position: 1,
              },
            ],
          },
        ],
      },
    ],
  };
  const loaded = rehearsalFrom(version, new Map(), {
    previewsOn: true,
    published: false,
    deliveryKnown: false,
  });
  assert.equal(loaded.deliveryKnown, false);
});

test('the outline and the rehearsal come from one read', () => {
  // Two reads of the same version is how the badge and the title drift apart.
  assert.match(reviewPage, /const sections = loaded\?\.version\.sections \?\? \[\]/);
  assert.ok(
    !/fetchSections\(/.test(reviewPage),
    'the outline is already in the rehearsal; a second read is a second truth',
  );
  assert.ok(
    !/fetchMediaResourcesForLessons/.test(reviewPage),
    'the media rows are in the outline already; fetching them again was an N+1 of shapes',
  );
});

test('the badge vocabulary is the author’s, word for word', () => {
  const rehearsalPage = read('app/teach/[courseId]/preview/page.tsx');
  for (const word of ['Nothing in it', 'Nothing to play', 'Worth a look', 'Ready']) {
    assert.ok(reviewPage.includes(word), `the reviewer's badge is missing "${word}"`);
    assert.ok(rehearsalPage.includes(word), `the author's badge is missing "${word}"`);
  }
});

test('the reviewer can open the lesson they are told to open', () => {
  // The link goes to the author's preview page, so that page has to admit an
  // active reviewer — otherwise the panel points at a 404 and the reviewer
  // concludes the lesson is missing.
  assert.match(reviewPage, /href=\{`\/teach\/\$\{assignment\.courseId\}\/preview\/\$\{rehearsal\.next\.lessonId\}`\}/);
  assert.match(previewPage, /may_review_version_media/);

  // That course id comes from the version, not from the nested course relation:
  // a draft course is not readable to a reviewer through `courses_read`, so the
  // relation would be null and the link would be empty.
  assert.match(reviewLib, /course_versions \( course_id, courses \( title, slug \) \)/);
  assert.match(reviewLib, /courseId: r\.course_versions\?\.\[0\]\?\.course_id \?\? ''/);
});
