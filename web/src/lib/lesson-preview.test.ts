import assert from 'node:assert/strict';
import test from 'node:test';

import {
  durationLabel,
  playbackOf,
  previewOf,
  rehearseVersion,
  rowFor,
  SEVERITY,
  type AuthoredRow,
  type PreviewLesson,
} from './lesson-preview.ts';
import type { Delivery } from './media-encoding.ts';
import { nativeMediaKind, RESOURCE_LABEL } from './lessons.ts';

function resource(overrides: Partial<AuthoredRow> = {}): AuthoredRow {
  return {
    id: 'r-1',
    resourceName: 'Lesson one',
    resourceType: 'video',
    externalUrl: 'https://media.example/lesson.mp4',
    mediaAssetId: null,
    access: 'enrolled',
    ...overrides,
  };
}

function lesson(overrides: Partial<Parameters<typeof previewOf>[0]> = {}) {
  return {
    id: 'l-1',
    title: 'The pillars',
    isPreview: false,
    sectionTitle: 'Foundations',
    description: 'What the five pillars are.',
    durationSeconds: 750,
    resources: [resource()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// The one rule that must not drift
//
// `playbackOf` restates `nativeMediaKind`'s rule rather than importing it, so
// that a null can be told apart from a null. That duplication is only safe if
// the two answers agree, which is what these cases — copied from
// `lessons.test.ts`, where they pin the learner page — check.
// ---------------------------------------------------------------------------

test('every case nativeMediaKind answers, playbackOf answers the same way', () => {
  const cases: { resourceType: AuthoredRow['resourceType']; externalUrl: string }[] = [
    // The four that play.
    { resourceType: 'video', externalUrl: 'https://media.example/lesson.mp4?token=abc' },
    { resourceType: 'video', externalUrl: 'https://media.example/lesson.webm' },
    { resourceType: 'audio', externalUrl: 'https://media.example/recitation.mp3#chapter' },
    { resourceType: 'audio', externalUrl: 'https://media.example/recitation.ogg' },
    // The ones that do not.
    { resourceType: 'video', externalUrl: 'http://media.example/lesson.mp4' },
    { resourceType: 'audio', externalUrl: 'https://media.example/lesson.mp4' },
    { resourceType: 'video', externalUrl: 'https://video.example/watch/123' },
    { resourceType: 'document', externalUrl: 'https://media.example/lesson.mp4' },
    { resourceType: 'audio', externalUrl: 'not a url' },
  ];

  for (const one of cases) {
    const native = nativeMediaKind(one);
    const ours = playbackOf(resource(one));
    if (native) {
      assert.equal(ours, native, `${one.externalUrl} should play as ${native}`);
    } else {
      assert.notEqual(ours, 'video', `${one.externalUrl} must not promise a video player`);
      assert.notEqual(ours, 'audio', `${one.externalUrl} must not promise an audio player`);
    }
  }

  // And specifically: a media type with a *working* HTTPS address that is not a
  // media file is a link, not a broken resource. That distinction is the reason
  // this module exists.
  assert.equal(playbackOf(resource({ resourceType: 'video', externalUrl: 'https://video.example/watch/123' })), 'link');
  assert.equal(playbackOf(resource({ resourceType: 'audio', externalUrl: 'https://media.example/lesson.mp4' })), 'link');
});

test('the unplayable-because-unusable cases are told apart from the link case', () => {
  // `nativeMediaKind` returns null for all of these; a learner does not.
  assert.equal(playbackOf(resource({ externalUrl: 'http://media.example/lesson.mp4' })), 'nothing');
  assert.equal(playbackOf(resource({ externalUrl: 'https://' })), 'nothing');
  assert.equal(playbackOf(resource({ externalUrl: 'not a url' })), 'nothing');
  assert.equal(playbackOf(resource({ externalUrl: null })), 'nothing');
});

test('documents and worksheets are offered as files, links stay links', () => {
  assert.equal(playbackOf(resource({ resourceType: 'document', externalUrl: 'https://files.example/handout.pdf' })), 'download');
  assert.equal(playbackOf(resource({ resourceType: 'worksheet', externalUrl: 'https://files.example/worksheet.docx' })), 'download');
  assert.equal(playbackOf(resource({ resourceType: 'link', externalUrl: 'https://files.example/reading' })), 'link');
  assert.equal(playbackOf(resource({ resourceType: 'quiz', externalUrl: 'https://files.example/quiz' })), 'link');
});

test('a file we host is playable, not missing', () => {
  // The other permitted source: a media asset rather than an address. The
  // learner page builds a player from its renditions, so calling this "nothing"
  // would be the preview's worst lie — it would tell authors their own uploads
  // are broken.
  const uploaded = resource({ externalUrl: null, mediaAssetId: '11111111-1111-4111-8111-111111111111' });
  assert.equal(playbackOf(uploaded), 'uploaded');

  const row = rowFor(uploaded, true);
  assert.equal(row.url, null, 'an uploaded file has no address to open');
  assert.match(row.sentence, /our own file/i);
  assert.doesNotMatch(row.sentence, /no address|nothing to click/i);
});

test('an address wins over an uploaded file, because the learner page reads it first', () => {
  const both = resource({
    externalUrl: 'https://media.example/lesson.mp4',
    mediaAssetId: '11111111-1111-4111-8111-111111111111',
  });
  assert.equal(playbackOf(both), 'video');
});

test('each row carries the learner page’s own label, never the column value', () => {
  const label = RESOURCE_LABEL.video;
  assert.equal(rowFor(resource({ resourceType: 'video' }), true).label, label);

  // The public sample page prints `resource_type` raw ("public_preview"-style
  // snake case in a badge). The preview must not: a teacher reads a label.
  const worksheet = rowFor(resource({ resourceType: 'worksheet', externalUrl: 'https://f.example/w.pdf' }), true);
  assert.equal(worksheet.label, RESOURCE_LABEL.worksheet);
  assert.notEqual(worksheet.label, 'worksheet');
});

test('a public preview with previews off says so on the row itself', () => {
  const on = rowFor(resource({ access: 'public_preview' }), true);
  assert.doesNotMatch(on.sentence, /switched off/);

  const off = rowFor(resource({ access: 'public_preview' }), false);
  assert.match(off.sentence, /public preview/i);
  assert.match(off.sentence, /previews are switched off/i);

  // A merely enrolled resource is not affected by the flag.
  assert.doesNotMatch(rowFor(resource({ access: 'enrolled' }), false).sentence, /switched off/);
});

// ---------------------------------------------------------------------------
// An uploaded file, where the address is not the answer
//
// `playbackOf` can only say "our own file" — it has no address to judge. Whether
// a learner gets a player depends on a delivery copy existing, which is a fact
// about the encoding worker rather than about the lesson. When the caller has
// asked for it, the row says what is true; when it has not, the standing sentence
// promises nothing it cannot know.
// ---------------------------------------------------------------------------

const uploaded = (over: Partial<AuthoredRow> = {}) =>
  resource({
    resourceType: 'video',
    externalUrl: null,
    mediaAssetId: '11111111-1111-4111-8111-111111111111',
    ...over,
  });

function encoding(over: Partial<Delivery> = {}) {
  return {
    assetId: '11111111-1111-4111-8111-111111111111',
    assetStatus: 'available' as const,
    available: 0,
    pending: 0,
    failed: 0,
    videoReady: false,
    audioReady: false,
    failureReason: null,
    ...over,
  };
}

test('an uploaded file whose copies are ready is ready', () => {
  const row = rowFor(uploaded({ encoding: encoding({ available: 2, videoReady: true }) }), true);
  assert.equal(row.playback, 'uploaded');
  assert.equal(row.ready, true);
  assert.equal(row.holdUp, null);
  assert.match(row.sentence, /our own server/);
});

test('an uploaded file still encoding is not ready, and says so in three words', () => {
  const row = rowFor(uploaded({ encoding: encoding({ pending: 1 }) }), true);
  assert.equal(row.ready, false);
  assert.equal(row.holdUp, 'still encoding');
  assert.match(row.sentence, /still being made/);
});

test('a failed encode is named as failed, not as a wait', () => {
  const row = rowFor(uploaded({ encoding: encoding({ failed: 1, failureReason: 'out of memory' }) }), true);
  assert.equal(row.ready, false);
  assert.equal(row.holdUp, 'its encode failed');
  assert.match(row.sentence, /out of memory/);
});

test('with no encoding state the row promises nothing it cannot know', () => {
  // A screen that did not ask must not claim a file plays, and must not claim it
  // does not: the old sentence says the player arrives when the copies do.
  const row = rowFor(uploaded(), true);
  // Not a promise and not a warning: `ready` is false because nothing was
  // checked, `holdUp` is null because there is no known reason, and the sentence
  // declines to say either way.
  assert.equal(row.ready, false, 'an unchecked file is not reported as playing');
  assert.equal(row.holdUp, null, 'and is not given a reason it does not have');
  assert.match(row.sentence, /as soon as the delivery copies are ready/);

  // So it neither counts as playable nor raises the stalled warning.
  const preview = previewOf(lesson({ resources: [uploaded()] }), { previewsOn: true, published: false });
  assert.equal(preview.playable, 0);
  assert.ok(!preview.warnings.some((one) => /uploaded but|uploaded files/i.test(one)));
});

test('a lesson with an uploaded file nobody can play says so, once', () => {
  const preview = previewOf(lesson({ resources: [uploaded({ encoding: encoding({ pending: 1 }) })] }), {
    previewsOn: true,
    published: false,
  });
  const warning = preview.warnings.find((one) => /uploaded but/i.test(one));
  assert.ok(warning, 'the reviewer of this preview must be told the file does not play');
  assert.match(warning, /“Lesson one”/);
  assert.match(warning, /still encoding/);
  assert.match(warning, /media library/i, 'and where to find the reason');
});

test('several stalled files are listed with their own reasons', () => {
  const preview = previewOf(
    lesson({
      resources: [
        uploaded({ id: 'r-1', resourceName: 'Tajweed', encoding: encoding({ failed: 1, failureReason: 'oom' }) }),
        uploaded({ id: 'r-2', resourceName: 'Memorisation', encoding: encoding() }),
      ],
    }),
    { previewsOn: true, published: false },
  );
  const warning = preview.warnings.find((one) => /uploaded files/i.test(one));
  assert.ok(warning);
  assert.match(warning, /2 uploaded files/);
  assert.match(warning, /“Tajweed” — its encode failed/);
  assert.match(warning, /“Memorisation” — nothing has been encoded from it/);
});

test('a file that cannot play is not counted as playable', () => {
  // The footer says "N of M play". Counting a stalled file is how it says
  // "1 of 1 play" above a row that says it does not.
  const preview = previewOf(
    lesson({
      resources: [
        uploaded({ id: 'r-1', encoding: encoding({ pending: 1 }) }),
        resource({ id: 'r-2', externalUrl: 'https://media.example/lesson.mp4' }),
      ],
    }),
    { previewsOn: true, published: false },
  );
  assert.equal(preview.rows.length, 2);
  assert.equal(preview.playable, 1);

  const ready = previewOf(lesson({ resources: [uploaded({ encoding: encoding({ available: 1, videoReady: true }) })] }), {
    previewsOn: true,
    published: false,
  });
  assert.equal(ready.playable, 1);
});

test('a held file is not described as one to wait for', () => {
  const row = rowFor(uploaded({ encoding: encoding({ assetStatus: 'quarantined', available: 2, videoReady: true }) }), true);
  assert.equal(row.ready, false);
  assert.equal(row.holdUp, 'it is held for review');
  assert.match(row.sentence, /withdrawn until staff release it/);
});

// ---------------------------------------------------------------------------
// The notes. Each is a sentence an author can act on; none of them refuses
// anything, which is the reason `previewOf` returns them rather than throwing.
// ---------------------------------------------------------------------------

test('an empty lesson is named before anything else', () => {
  const preview = previewOf(lesson({ resources: [] }), { previewsOn: true, published: false });
  assert.equal(preview.rows.length, 0);
  assert.equal(preview.playable, 0);
  assert.match(preview.warnings[0] ?? '', /nothing in it/i);
  // A lesson with no resources is not also scolded for having no description:
  // that would be a second note about the same empty page.
  assert.ok(!preview.warnings.some((warning) => /no description/i.test(warning)));
});

test('a resource with neither address nor file is reported rather than hidden', () => {
  const preview = previewOf(lesson({ resources: [resource({ externalUrl: null, mediaAssetId: null })] }), {
    previewsOn: true,
    published: false,
  });
  const warning = preview.warnings.find((one) => /neither an address nor an uploaded file/i.test(one));
  assert.ok(warning, 'the unclickable row must be named');
  assert.match(warning, /“Lesson one”/, 'the author is told which row');
});

test('a media item that will open as a link is named, once, without calling it broken', () => {
  const one = previewOf(lesson({ resources: [resource({ resourceType: 'video', externalUrl: 'https://video.example/watch/123' })] }), {
    previewsOn: true,
    published: false,
  });
  const warning = one.warnings.find((w) => /plain link/i.test(w));
  assert.ok(warning);
  assert.match(warning, /“Lesson one”/);
  assert.match(warning, /only worth knowing/i);
  assert.doesNotMatch(warning, /broken|invalid|error/i);

  const two = previewOf(
    lesson({
      resources: [
        resource({ id: 'r-1', resourceName: 'Tajweed', externalUrl: 'https://video.example/watch/1' }),
        resource({ id: 'r-2', resourceName: 'Memorisation', resourceType: 'audio', externalUrl: 'https://audio.example/page/2' }),
      ],
    }),
    { previewsOn: true, published: false },
  );
  const plural = two.warnings.find((w) => /plain links/i.test(w));
  assert.ok(plural);
  assert.match(plural, /2 items/);
  assert.match(plural, /“Tajweed” and “Memorisation”/);
});

test('three linked items read as a list a person can read', () => {
  const preview = previewOf(
    lesson({
      resources: ['alif', 'ba', 'ta'].map((name, index) =>
        resource({ id: `r-${index}`, resourceName: name, externalUrl: `https://video.example/watch/${index}` }),
      ),
    }),
    { previewsOn: true, published: false },
  );
  const warning = preview.warnings.find((w) => /“alif”/.test(w));
  assert.ok(warning);
  assert.match(warning, /“alif”, “ba” and “ta”/);
});

test('a lesson with materials and no description says so', () => {
  const preview = previewOf(lesson({ description: null }), { previewsOn: true, published: false });
  assert.ok(preview.warnings.some((w) => /no description/i.test(w)));

  const empty = previewOf(lesson({ description: '   ' }), { previewsOn: true, published: false });
  // Whitespace is not a description — the learner page renders the card anyway,
  // which is a blank box. The flag and the note have to agree about that.
  assert.ok(empty.warnings.some((w) => /no description/i.test(w)));
  assert.equal(empty.hasDescription, false);
  assert.equal(previewOf(lesson({ description: 'What the five pillars are.' }), { previewsOn: true, published: false }).hasDescription, true);
});

test('a preview lesson with previews switched off is not a sample of anything', () => {
  const preview = previewOf(lesson({ isPreview: true }), { previewsOn: false, published: true });
  assert.ok(preview.warnings.some((w) => /previews are switched off/i.test(w)));
  // And the contradiction is only stated once, not once per resource.
  assert.equal(preview.warnings.filter((w) => /previews are switched off/i.test(w)).length, 1);
});

test('a preview lesson with nothing marked public shows a stranger an empty page', () => {
  const preview = previewOf(lesson({ isPreview: true, resources: [resource({ access: 'enrolled' })] }), {
    previewsOn: true,
    published: true,
  });
  const warning = preview.warnings.find((w) => /none of its content is marked a public preview/i.test(w));
  assert.ok(warning);
  assert.match(warning, /empty page/);

  const withSample = previewOf(lesson({ isPreview: true, resources: [resource({ access: 'public_preview' })] }), {
    previewsOn: true,
    published: true,
  });
  assert.ok(!withSample.warnings.some((w) => /public preview/i.test(w)));
});

test('a preview lesson in an unpublished version has no public page yet', () => {
  const draft = previewOf(lesson({ isPreview: true, resources: [resource({ access: 'public_preview' })] }), {
    previewsOn: true,
    published: false,
  });
  assert.ok(draft.warnings.some((w) => /not published/i.test(w)));

  const live = previewOf(lesson({ isPreview: true, resources: [resource({ access: 'public_preview' })] }), {
    previewsOn: true,
    published: true,
  });
  assert.ok(!live.warnings.some((w) => /not published/i.test(w)));
});

test('only a player counts as playable', () => {
  const preview = previewOf(
    lesson({
      resources: [
        resource({ id: 'r-1' }),
        resource({ id: 'r-2', resourceType: 'audio', externalUrl: 'https://media.example/recitation.mp3' }),
        resource({ id: 'r-3', resourceType: 'video', externalUrl: 'https://video.example/watch/9' }),
        resource({ id: 'r-4', resourceType: 'document', externalUrl: 'https://files.example/handout.pdf' }),
        resource({ id: 'r-5', resourceType: 'video', externalUrl: null, mediaAssetId: 'a-1' }),
        resource({ id: 'r-6', resourceType: 'video', externalUrl: null, mediaAssetId: null }),
      ],
    }),
    { previewsOn: true, published: false },
  );
  assert.equal(preview.rows.length, 6);
  assert.equal(preview.playable, 2);
  assert.deepEqual(
    preview.rows.map((row) => row.playback),
    ['video', 'audio', 'link', 'download', 'uploaded', 'nothing'],
  );
  // Order is the curriculum's order, or the preview would describe a lesson
  // nobody reads.
  assert.deepEqual(preview.rows.map((row) => row.id), ['r-1', 'r-2', 'r-3', 'r-4', 'r-5', 'r-6']);
});

test('a lesson that is wrong in every way still returns rows and never throws', () => {
  // The standing rule: these are notes, not blocks. Nothing here refuses a save,
  // a submission or a publication.
  const preview = previewOf(
    {
      id: 'l-1',
      title: '',
      isPreview: true,
      sectionTitle: 'Unnamed section',
      description: null,
      durationSeconds: null,
      resources: [
        resource({ id: 'r-1', resourceName: 'Video', externalUrl: 'https://video.example/watch/1' }),
        resource({ id: 'r-2', resourceName: 'Gone', externalUrl: null, mediaAssetId: null }),
      ],
    },
    { previewsOn: false, published: false },
  );
  assert.equal(preview.rows.length, 2);
  assert.ok(preview.warnings.length >= 4);
  for (const warning of preview.warnings) {
    assert.ok(warning.trim().length > 0);
    assert.ok(warning.trim().endsWith('.'), 'each note is a sentence, not a fragment');
  }
});

test('a clean lesson has nothing to say', () => {
  const preview = previewOf(
    lesson({
      description: 'What the five pillars are.',
      resources: [resource({ access: 'public_preview' })],
    }),
    { previewsOn: true, published: true },
  );
  assert.deepEqual(preview.warnings, []);
  assert.equal(preview.playable, 1);
});

// ---------------------------------------------------------------------------
// Duration
//
// The learner page prints `12:30` in the eyebrow, and `0` means "not known"
// rather than "an instant lesson". This must not print `0:00` or `NaN:NaN`.
// ---------------------------------------------------------------------------

test('a duration is printed the way the learner page prints it', () => {
  assert.equal(durationLabel(750), '12:30');
  assert.equal(durationLabel(45), '0:45');
  assert.equal(durationLabel(3600), '60:00');
  assert.equal(durationLabel(750.6), '12:31');
  assert.equal(durationLabel(59.4), '0:59');
});

test('no duration prints nothing at all', () => {
  assert.equal(durationLabel(null), null);
  assert.equal(durationLabel(undefined), null);
  assert.equal(durationLabel(0), null);
  assert.equal(durationLabel(-5), null);
  assert.equal(durationLabel(Number.NaN), null);
  assert.equal(durationLabel(Number.POSITIVE_INFINITY), null);
});

// ---------------------------------------------------------------------------
// The whole version at once
//
// A teacher submitting forty lessons should not find out one at a time. The
// rehearsal is the same decision per lesson, plus the one thing a list of forty
// rows cannot say: which row to open first.
// ---------------------------------------------------------------------------

function taught(over: Partial<PreviewLesson> = {}): PreviewLesson {
  return {
    id: 'l-x',
    title: 'A lesson',
    isPreview: false,
    sectionTitle: 'S',
    description: 'What it covers.',
    durationSeconds: 600,
    resources: [resource({ id: 'r-x', resourceName: 'Recording' })],
    ...over,
  };
}

test('the rehearsal keeps the course in reading order', () => {
  // The teacher is looking at their course. A course re-sorted by brokenness no
  // longer looks like the thing they wrote, so the named fix sits above the list
  // instead of rearranging it.
  const rehearsal = rehearseVersion(
    [
      { id: 's-1', title: 'Foundations', lessons: [taught({ id: 'l-1' }), taught({ id: 'l-2' })] },
      { id: 's-2', title: 'Practice', lessons: [taught({ id: 'l-3' })] },
    ],
    { previewsOn: true, published: false },
  );

  assert.deepEqual(
    rehearsal.sections.map((section) => section.lessons.map((lesson) => lesson.id)),
    [['l-1', 'l-2'], ['l-3']],
  );
  assert.equal(rehearsal.lessonCount, 3);
});

test('an empty lesson outranks a lesson whose file cannot play', () => {
  const rehearsal = rehearseVersion(
    [
      {
        id: 's-1',
        title: 'S',
        lessons: [
          taught({ id: 'l-stalled', resources: [uploaded({ id: 'r-1', encoding: encoding({ failed: 1, failureReason: 'oom' }) })] }),
          taught({ id: 'l-empty', resources: [] }),
        ],
      },
    ],
    { previewsOn: true, published: false },
  );

  const byId = new Map(rehearsal.sections[0]?.lessons.map((lesson) => [lesson.id, lesson]));
  assert.equal(byId.get('l-empty')?.severity, SEVERITY.empty);
  assert.equal(byId.get('l-stalled')?.severity, SEVERITY.silent);

  assert.equal(rehearsal.next?.lessonId, 'l-empty', 'the empty page is the worst thing here');
  assert.match(rehearsal.next?.sentence ?? '', /nothing in it at all/);
  assert.equal(rehearsal.nextAlso, 0);
});

test('the named lesson is the first at that severity, not the last', () => {
  const rehearsal = rehearseVersion(
    [
      {
        id: 's-1',
        title: 'S',
        lessons: [
          taught({ id: 'l-1', resources: [] }),
          taught({ id: 'l-2', resources: [] }),
          taught({ id: 'l-3', resources: [] }),
        ],
      },
    ],
    { previewsOn: true, published: false },
  );

  assert.equal(rehearsal.next?.lessonId, 'l-1');
  assert.equal(rehearsal.nextAlso, 2, 'and the sentence can say "and 2 others"');
  assert.equal(rehearsal.withNothing, 3);
});

test('a clean course has nothing to say, and says so', () => {
  const rehearsal = rehearseVersion(
    [{ id: 's-1', title: 'S', lessons: [taught({ id: 'l-1' }), taught({ id: 'l-2' })] }],
    { previewsOn: true, published: false },
  );
  assert.equal(rehearsal.next, null);
  assert.equal(rehearsal.nextAlso, 0);
  assert.equal(rehearsal.withSomething, 2);
  assert.equal(rehearsal.withTrouble, 0);
  assert.equal(rehearsal.sections[0]?.lessons[0]?.severity, SEVERITY.clean);
  assert.deepEqual(rehearsal.sections[0]?.lessons[0]?.trouble, []);
});

test('a lesson with one usable item and one dead one is noted, not silent', () => {
  const rehearsal = rehearseVersion(
    [
      {
        id: 's-1',
        title: 'S',
        lessons: [
          taught({
            id: 'l-1',
            resources: [
              resource({ id: 'r-1', resourceName: 'Recording' }),
              resource({ id: 'r-2', resourceName: 'Handout', resourceType: 'document', externalUrl: null }),
            ],
          }),
        ],
      },
    ],
    { previewsOn: true, published: false },
  );

  const lesson = rehearsal.sections[0]?.lessons[0];
  assert.equal(lesson?.severity, SEVERITY.noted);
  assert.ok(lesson?.trouble.some((one) => /“Handout” has nowhere to point/.test(one)));
  assert.equal(rehearsal.withSomething, 1, 'a learner does get the recording');
  assert.equal(rehearsal.withNothing, 0);
});

test('a media item that opens as a link is trouble, and is named as a surprise', () => {
  const rehearsal = rehearseVersion(
    [
      {
        id: 's-1',
        title: 'S',
        lessons: [
          taught({
            id: 'l-1',
            resources: [resource({ resourceName: 'Tajweed', externalUrl: 'https://video.example/watch/1' })],
          }),
        ],
      },
    ],
    { previewsOn: true, published: false },
  );
  const lesson = rehearsal.sections[0]?.lessons[0];
  assert.equal(lesson?.severity, SEVERITY.noted);
  assert.ok(lesson?.trouble.some((one) => /opens as a link rather than in the page/.test(one)));
  assert.ok(!lesson?.trouble.some((one) => /nowhere to point/.test(one)), 'it works, it is just not a player');
});

test('a stalled upload is named with its own reason, so the right person is found', () => {
  const rehearsal = rehearseVersion(
    [
      {
        id: 's-1',
        title: 'S',
        lessons: [
          taught({ id: 'l-1', resources: [uploaded({ resourceName: 'Memorisation', encoding: encoding({ pending: 1 }) })] }),
        ],
      },
    ],
    { previewsOn: true, published: false },
  );
  const lesson = rehearsal.sections[0]?.lessons[0];
  assert.equal(lesson?.severity, SEVERITY.silent);
  assert.ok(lesson?.trouble.some((one) => /“Memorisation” still encoding/.test(one)));
});

test('a missing description is a note, and never the first thing named', () => {
  const rehearsal = rehearseVersion(
    [
      {
        id: 's-1',
        title: 'S',
        lessons: [
          taught({ id: 'l-1', description: null }),
          taught({ id: 'l-2', resources: [] }),
        ],
      },
    ],
    { previewsOn: true, published: false },
  );
  assert.equal(rehearsal.next?.lessonId, 'l-2', 'the empty lesson still comes first');
  assert.equal(rehearsal.withTrouble, 2);
});

test('an empty version rehearses without pretending to have a next step', () => {
  const rehearsal = rehearseVersion([], { previewsOn: true, published: false });
  assert.equal(rehearsal.lessonCount, 0);
  assert.equal(rehearsal.next, null);
  assert.deepEqual(rehearsal.sections, []);
});

test('a version with no lessons at all, only sections, is still zero', () => {
  const rehearsal = rehearseVersion([{ id: 's-1', title: 'Empty section', lessons: [] }], {
    previewsOn: false,
    published: true,
  });
  assert.equal(rehearsal.lessonCount, 0);
  assert.equal(rehearsal.next, null);
  assert.equal(rehearsal.sections.length, 1, 'the section is still rendered, or the page loses its shape');
});
