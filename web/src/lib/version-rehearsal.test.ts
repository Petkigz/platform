import assert from 'node:assert/strict';
import test from 'node:test';

import { rehearsalFrom } from './version-rehearsal.ts';
import type { AuthoredVersion } from './authoring.ts';
import type { Delivery } from './media-encoding.ts';

/**
 * The pure half of the shared read.
 *
 * Three screens now show the same rehearsal: the author's single lesson, the
 * author's whole version, and the reviewer deciding. This module is what makes
 * them agree, so these tests are about the two places a copy could drift — the
 * mapping from the authored shape, and the mapping from the encoding counts.
 */

function version(over: Partial<AuthoredVersion> = {}): AuthoredVersion {
  return {
    id: 'v-1',
    versionNumber: 1,
    status: 'draft',
    lessonCount: 1,
    sections: [
      {
        id: 's-1',
        title: 'Foundations',
        position: 1,
        lessons: [
          {
            id: 'l-1',
            title: 'The pillars',
            position: 1,
            isPreview: false,
            description: 'What the five pillars are.',
            durationSeconds: 750,
            resources: [
              {
                id: 'r-1',
                resourceName: 'Recording',
                resourceType: 'video',
                externalUrl: 'https://media.example/lesson.mp4',
                mediaAssetId: null,
                access: 'enrolled',
                position: 1,
              },
            ],
          },
        ],
      },
    ],
    ...over,
  };
}

function encoding(over: Partial<Delivery> = {}): Delivery {
  return {
    assetId: 'a-1',
    assetStatus: 'available',
    available: 0,
    pending: 0,
    failed: 0,
    videoReady: false,
    audioReady: false,
    failureReason: null,
    ...over,
  };
}

test('the authored shape maps straight through, description and all', () => {
  const loaded = rehearsalFrom(version(), new Map(), { previewsOn: true, published: false });

  const lesson = loaded.lessons.get('l-1');
  assert.equal(lesson?.title, 'The pillars');
  assert.equal(lesson?.sectionTitle, 'Foundations');
  assert.equal(lesson?.description, 'What the five pillars are.');
  assert.equal(lesson?.durationSeconds, 750);

  // The one that would be silent: a description dropped in the mapping makes
  // every lesson warn about a missing one.
  assert.ok(
    !loaded.rehearsal.sections[0]?.lessons[0]?.trouble.some((one) => /no description/.test(one)),
    'a lesson with a description must not be told it has none',
  );
  assert.equal(loaded.rehearsal.sections[0]?.lessons[0]?.severity, -1, 'and it is clean');
});

test('an uploaded file is judged by its encoding, which comes from the map', () => {
  const uploaded = version();
  uploaded.sections[0]!.lessons[0]!.resources = [
    {
      id: 'r-1',
      resourceName: 'Memorisation',
      resourceType: 'video',
      externalUrl: null,
      mediaAssetId: 'a-1',
      access: 'enrolled',
      position: 1,
    },
  ];

  const stalled = rehearsalFrom(uploaded, new Map([['a-1', encoding({ pending: 1 })]]), {
    previewsOn: true,
    published: false,
  });
  assert.equal(stalled.rehearsal.sections[0]?.lessons[0]?.severity, 1, 'nothing a learner can play');
  assert.ok(
    stalled.rehearsal.sections[0]?.lessons[0]?.trouble.some((one) => /“Memorisation” still encoding/.test(one)),
  );

  const ready = rehearsalFrom(uploaded, new Map([['a-1', encoding({ available: 1, videoReady: true })]]), {
    previewsOn: true,
    published: false,
  });
  assert.equal(ready.rehearsal.sections[0]?.lessons[0]?.severity, -1);

  // And with no counts at all — a failed delivery read — the file is not accused
  // of being broken, it is simply not promised.
  const unknown = rehearsalFrom(uploaded, new Map(), {
    previewsOn: true,
    published: false,
    deliveryKnown: false,
  });
  assert.equal(unknown.rehearsal.sections[0]?.lessons[0]?.severity, 1);
  assert.equal(unknown.deliveryKnown, false);
});

test('an address has no encoding state, and is not looked up as if it had one', () => {
  const loaded = rehearsalFrom(version(), new Map([['a-1', encoding({ pending: 1 })]]), {
    previewsOn: true,
    published: false,
  });
  const resource = loaded.lessons.get('l-1')?.resources[0];
  assert.equal(resource?.encoding, null, 'an external address is not a file we encode');
  assert.equal(loaded.rehearsal.sections[0]?.lessons[0]?.severity, -1);
});

test('every lesson lands in the map, so a single-lesson screen can find its own', () => {
  const two = version();
  two.sections[0]!.lessons.push({
    id: 'l-2',
    title: 'Second',
    position: 2,
    isPreview: true,
    description: 'x',
    durationSeconds: null,
    resources: [],
  });

  const loaded = rehearsalFrom(two, new Map(), { previewsOn: true, published: false });
  assert.deepEqual([...loaded.lessons.keys()], ['l-1', 'l-2']);
  assert.equal(loaded.lessons.get('l-2')?.isPreview, true);
  // The empty one is the worst thing in the version, and the rehearsal says so.
  assert.equal(loaded.rehearsal.next?.lessonId, 'l-2');
});

test('the published flag reaches the warnings that read it', () => {
  const preview = version();
  preview.sections[0]!.lessons[0]!.isPreview = true;
  preview.sections[0]!.lessons[0]!.resources[0]!.access = 'public_preview';

  const draft = rehearsalFrom(preview, new Map(), { previewsOn: true, published: false });
  assert.ok(
    draft.rehearsal.sections[0]?.lessons[0]?.preview.warnings.some((one) => /not published/.test(one)),
  );

  const live = rehearsalFrom(preview, new Map(), { previewsOn: true, published: true });
  assert.ok(
    !live.rehearsal.sections[0]?.lessons[0]?.preview.warnings.some((one) => /not published/.test(one)),
  );
});

test('a version with no sections is empty, not broken', () => {
  const loaded = rehearsalFrom(version({ sections: [], lessonCount: 0 }), new Map(), {
    previewsOn: false,
    published: false,
  });
  assert.equal(loaded.rehearsal.lessonCount, 0);
  assert.equal(loaded.rehearsal.next, null);
  assert.deepEqual([...loaded.lessons.keys()], []);
});
