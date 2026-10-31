/**
 * What a learner will actually get, worked out before publication.
 *
 * A teacher adds a resource, sees a green "added" tick, and moves on. What they
 * have not seen is the thing that matters: **whether a learner can watch it.** A
 * `video` pointing at a YouTube watch page is not a video as far as this platform
 * is concerned — `nativeMediaKind()` returns null and the lesson page renders a
 * plain link in a new tab. A teacher who expected a player finds out from a
 * student, weeks later, in a message that reads like a complaint about the
 * platform.
 *
 * So this module answers the question the editor never asked: for each resource,
 * *what will happen when a learner clicks it* — a player in the page, a new tab,
 * a download, or nothing at all. And for the lesson as a whole, the list of
 * things that are worth knowing **before** it reaches a learner.
 *
 * It is deliberately not a preview renderer. Rendering the learner page twice
 * would be a second copy of it, and the second copy is the one that drifts. The
 * page at `/teach/[courseId]/preview/[lessonId]` renders the **same shapes** the
 * learner page renders, and this module decides the parts that are decisions
 * rather than layout.
 *
 * **What the schema already guarantees, and this therefore does not warn about.**
 * `lesson_resources` requires exactly one source — an https URL or a media asset
 * — and its check constraint refuses anything but `https://`. So "the teacher
 * typed http" is not a reachable state, and neither is "no address and no file".
 * The cases that *are* reachable are the interesting ones: an https address that
 * is a watch page rather than a file, a lesson with nothing attached, a file
 * uploaded here rather than hosted elsewhere, and a preview that is not a preview
 * because a flag is off.
 *
 * **It says one thing the learner page does not.** A learner sees the finished
 * article; a teacher needs the three cases that produce an empty screen named out
 * loud. Those are notes, not errors: the author decides when a lesson is
 * finished.
 */

import { deliveryOf, type Delivery } from './media-encoding.ts';
import { RESOURCE_LABEL, type ResourceType } from './lessons.ts';

export type Playback = 'video' | 'audio' | 'link' | 'download' | 'uploaded' | 'nothing';

/** One resource, as the teacher needs to see it. */
export type PreviewRow = {
  id: string;
  name: string;
  type: ResourceType;
  /** The label the learner page prints beside it. */
  label: string;
  access: 'public_preview' | 'enrolled' | 'guardian' | 'restricted';
  /** What happens when a learner clicks it. */
  playback: Playback;
  /**
   * Whether a learner gets anything at all. False for a dead address, false for
   * an uploaded file whose delivery copies are not ready — the case this page
   * was built to catch — and false for an uploaded file whose state nobody asked
   * for, because "we did not check" must not be reported as "it plays".
   */
  ready: boolean;
  /** When it is not ready, why, in three words: `still encoding`, `held…`. */
  holdUp: string | null;
  /** One sentence, in the teacher's terms, about what that means. */
  sentence: string;
  /** The address, when there is one — never for an uploaded file. */
  url: string | null;
};

/**
 * The authored shape, which is what the editor has.
 *
 * `mediaAssetId` is the other permitted source. The editor does not create one
 * yet — `/api/lesson-resources` accepts only external URLs — but the table does,
 * and a preview that treated an uploaded file as "nothing" would start lying the
 * day uploading arrives.
 */
export type AuthoredRow = {
  id: string;
  resourceName: string;
  resourceType: ResourceType;
  externalUrl: string | null;
  mediaAssetId?: string | null;
  /**
   * The delivery state of an uploaded file, when the caller has asked for it.
   * Absent means "not known" — an address has no encoding state at all, and a
   * screen that did not fetch the counts must not pretend the file is ready.
   */
  encoding?: Delivery | null;
  access: 'public_preview' | 'enrolled' | 'guardian' | 'restricted';
};

/**
 * The same decision `nativeMediaKind()` makes, restated here as a value.
 *
 * Restated rather than imported because the learner page's function returns
 * `'video' | 'audio' | null` and this needs to distinguish *why* it is not a
 * player — a watch page is a link a learner can follow, a file we host is a
 * player that is not built from an address at all. The test that keeps the two in
 * step is `nativeMediaKind`'s own cases, run through this.
 *
 * The order is the learner page's order, which matters: an external URL wins over
 * an uploaded file when both somehow exist, because the learner page checks the
 * URL first.
 */
export function playbackOf(row: AuthoredRow): Playback {
  const url = row.externalUrl;

  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      // `https://` and nothing else parses as a URL, and the column's check
      // constraint only proves the prefix. Nothing to click.
      return 'nothing';
    }
    // Unreachable through the database — the column refuses anything but
    // `https://` — but this function is also called on unsaved editor state.
    if (parsed.protocol !== 'https:') return 'nothing';

    const path = parsed.pathname.toLowerCase();

    if (row.resourceType === 'video') {
      return /\.(mp4|webm|ogv)$/.test(path) ? 'video' : 'link';
    }
    if (row.resourceType === 'audio') {
      return /\.(mp3|m4a|aac|ogg|oga|wav|flac)$/.test(path) ? 'audio' : 'link';
    }
    if (row.resourceType === 'document' || row.resourceType === 'worksheet') {
      return 'download';
    }
    return 'link';
  }

  // No address. Either a file uploaded here, or nothing at all.
  return row.mediaAssetId ? 'uploaded' : 'nothing';
}

const SENTENCE: Record<Playback, string> = {
  video: 'Plays in the page, on its own player.',
  audio: 'Plays in the page, with a player and a scrubber.',
  link: 'Opens in a new tab. The learner gets a link, not a player.',
  download: 'Opens in a new tab. Most browsers will offer to download it.',
  uploaded:
    'Our own file, not an address — a learner gets the player as soon as the delivery copies are ready, and no third-party site can take it down.',
  nothing: 'There is no address and no file here, so a learner would see a name and nothing to click.',
};

/**
 * The short reason a file cannot be played yet, for a list of them.
 *
 * Three words rather than a sentence, because it is repeated inside a sentence
 * that already names the file and says what a learner gets.
 */
const HOLD_UP: Record<string, string> = {
  encoding: 'still encoding',
  failed: 'its encode failed',
  silent: 'nothing has been encoded from it',
  unverified: 'the file is not verified yet',
  held: 'it is held for review',
};

export function rowFor(row: AuthoredRow, previewsOn: boolean): PreviewRow {
  const playback = playbackOf(row);
  let sentence = SENTENCE[playback];
  // An address is its own evidence: a link opens, a file downloads. An uploaded
  // file is not, so it starts at "not promised" and only the counts move it.
  let ready = playback !== 'nothing' && playback !== 'uploaded';
  let holdUp: string | null = null;

  // An uploaded file is the one row where the address is not the answer: what a
  // learner gets depends on a worker having made a copy. When the caller has the
  // counts, the sentence comes from them; when it does not, the standing sentence
  // stays honest by promising nothing it cannot know.
  if (playback === 'uploaded') {
    const verdict = deliveryOf(row.encoding ?? null);
    if (verdict) {
      sentence = verdict.sentence;
      ready = verdict.ready;
      holdUp = verdict.ready ? null : (HOLD_UP[verdict.kind] ?? null);
    }
  }

  // The one combination where the classification and the switch disagree: a
  // resource marked a public sample while previews are switched off is
  // invisible to everybody outside the course, and the author is the only person
  // who can notice.
  if (row.access === 'public_preview' && !previewsOn) {
    sentence +=
      ' Marked a public preview, but previews are switched off — nobody outside the course can see it.';
  }

  return {
    id: row.id,
    name: row.resourceName,
    type: row.resourceType,
    label: RESOURCE_LABEL[row.resourceType] ?? 'Resource',
    access: row.access,
    playback,
    ready,
    holdUp,
    sentence,
    url: row.externalUrl,
  };
}

/** An authored lesson, as much of it as a preview needs. */
export type PreviewLesson = {
  id: string;
  title: string;
  isPreview: boolean;
  sectionTitle: string;
  description?: string | null;
  durationSeconds?: number | null;
  resources: AuthoredRow[];
};

export type Preview = {
  rows: PreviewRow[];
  /**
   * Things a teacher would want to know before this reaches a learner. Each one
   * is a sentence they can act on; none of them blocks anything, because the
   * author decides when a lesson is finished.
   */
  warnings: string[];
  /** How many resources play inside the page, as opposed to opening a tab. */
  playable: number;
  /**
   * Whether the lesson has a description worth printing.
   *
   * Whitespace is not one: the learner page renders the card anyway, which is
   * the blank box this preview tells the author about.
   */
  hasDescription: boolean;
};

/** `‘A’, ‘B’ and ‘C’` — a list a person reads, not one a parser does. */
function quoteList(names: string[]): string {
  const quoted = names.map((name) => `“${name}”`);
  if (quoted.length === 1) return quoted[0] ?? '';
  return `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1] ?? ''}`;
}

/**
 * The whole lesson, as a learner would meet it.
 *
 * `published` matters because it changes what the notes *mean*: a draft's
 * warnings are a to-do list, and a published version's are a live problem. The
 * page says which, and only one warning reads `published` at all — a free
 * preview with no public page behind it yet.
 */
export function previewOf(
  lesson: PreviewLesson,
  options: { previewsOn: boolean; published: boolean },
): Preview {
  const rows = lesson.resources.map((resource) => rowFor(resource, options.previewsOn));
  const hasDescription = (lesson.description ?? '').trim().length > 0;
  const warnings: string[] = [];

  // 1. Nothing at all. The commonest empty screen, and the one the editor's
  // "No content yet" badge does not explain.
  if (rows.length === 0) {
    warnings.push(
      'This lesson has nothing in it. A learner who opens it finds a title and an empty page, and will assume that is what the course is.',
    );
  }

  // 2. A row with neither address nor file. The table's check constraint makes
  // this unreachable; if it ever appears it is a bug, so it is reported rather
  // than hidden.
  const addressless = rows.filter((row) => row.playback === 'nothing');
  if (addressless.length > 0) {
    warnings.push(
      `${addressless.length === 1 ? 'One item has' : `${addressless.length} items have`} neither an address nor an uploaded file (${quoteList(addressless.map((row) => row.name))}), so a learner would see a name and nothing to click.`,
    );
  }

  // 3. The surprise. A media resource that lands on a link is not an error — a
  // teacher may well host a recording somewhere this platform cannot stream —
  // but it is the single most common gap between what an author expects and what
  // a learner gets, so it is said once, without alarm.
  const linked = rows.filter(
    (row) => row.playback === 'link' && (row.type === 'video' || row.type === 'audio'),
  );
  if (linked.length > 0) {
    const names = quoteList(linked.map((row) => row.name));
    warnings.push(
      linked.length === 1
        ? `${names} is marked a ${linked[0]?.type} but its address is not a media file, so it will open as a plain link rather than playing in the page. That is fine if it is hosted somewhere we cannot stream from — it is only worth knowing before a student tells you.`
        : `${linked.length} items are marked media but their addresses are not media files (${names}), so they will open as plain links rather than playing in the page. That is fine if they are hosted somewhere we cannot stream from — it is only worth knowing before a student tells you.`,
    );
  }

  // 4. An uploaded file with nothing a learner can play. This is the case that
  // looks finished everywhere else: the master is verified, the library says
  // "Ready to use", and the lesson has a resource in it. It is the reason this
  // page exists.
  // Only rows whose state is known count: a row we never asked about has no
  // `holdUp`, and warning about it would be a guess wearing a sentence.
  const stalled = rows.filter((row) => row.playback === 'uploaded' && !row.ready && row.holdUp !== null);
  if (stalled.length > 0) {
    if (stalled.length === 1) {
      warnings.push(
        `“${stalled[0]?.name}” is uploaded but ${stalled[0]?.holdUp ?? 'has no playable copy'}, so a learner gets a sentence where the player should be rather than a lesson. The media library has the detail and the reason.`,
      );
    } else {
      warnings.push(
        `${stalled.length} uploaded files have nothing a learner can play yet (${stalled
          .map((row) => `“${row.name}” — ${row.holdUp ?? 'no playable copy'}`)
          .join('; ')}). The media library has the detail and the reason for each.`,
      );
    }
  }

  // 5. No description. Not fatal — the page has a title and materials — but it
  // is the difference between a learner starting and a learner leaving.
  if (lesson.resources.length > 0 && !hasDescription) {
    warnings.push(
      'This lesson has no description, so the page goes straight from the title to the materials. A sentence about what the lesson covers is the difference between a learner starting it and moving on.',
    );
  }

  // 6. The flag. A preview lesson is the marketing surface; with previews
  // switched off there is no surface at all.
  if (lesson.isPreview && !options.previewsOn) {
    warnings.push(
      'This lesson is marked a free preview, but previews are switched off — it is not a sample of anything at the moment.',
    );
  }

  // 7. A preview lesson with nothing in it marked public. The flag makes the
  // lesson reachable; the classification is what a stranger is allowed to see.
  if (lesson.isPreview && options.previewsOn) {
    const sample = rows.filter((row) => row.access === 'public_preview');
    if (sample.length === 0) {
      warnings.push(
        'This lesson is a free preview, but none of its content is marked a public preview — so what a stranger sees is an empty page.',
      );
    }
  }

  // 8. A preview lesson in an unpublished version. There is no public page to
  // reach it by, whatever the flags say.
  if (lesson.isPreview && options.previewsOn && !options.published) {
    warnings.push(
      'This lesson is a free preview in a version that is not published, so there is no public page for it yet. It becomes reachable the day the version goes live.',
    );
  }

  return {
    rows,
    warnings,
    playable: rows.filter(
      (row) =>
        row.playback === 'video' ||
        row.playback === 'audio' ||
        // An uploaded file counts only when it can actually play. Counting a
        // file whose encode failed is how a footer says "3 of 3 play" above
        // three rows that say they do not.
        (row.playback === 'uploaded' && row.ready),
    ).length,
    hasDescription,
  };
}

// ---------------------------------------------------------------------------
// The whole version at once
//
// A teacher about to submit forty lessons should not find out one lesson at a
// time. The rehearsal is the same decision as the single preview, run over every
// lesson, plus the one thing a list of forty rows cannot say by itself: which
// row to open first.
// ---------------------------------------------------------------------------

/** How bad a lesson is, worst first. Numbers so a sort can be written. */
export const SEVERITY = {
  /** Nothing in it at all: a learner opens a title and an empty page. */
  empty: 2,
  /** Something is attached and a learner still gets nothing — a dead address, a
   *  recording that has not encoded. The screen looks finished and is not. */
  silent: 1,
  /** A learner gets something, and there is something worth knowing. */
  noted: 0,
  /** Nothing to say. */
  clean: -1,
} as const;

export type RehearsalLesson = {
  id: string;
  title: string;
  /** Everything the single-lesson preview would compute. */
  preview: Preview;
  /** `SEVERITY`, so the caller can sort or highlight without re-deriving it. */
  severity: number;
  /** The learner-facing facts, in the teacher's words: what a learner gets and
   *  does not. Empty when the lesson is clean. */
  trouble: string[];
};

export type RehearsalSection = { id: string; title: string; lessons: RehearsalLesson[] };

export type Rehearsal = {
  sections: RehearsalSection[];
  lessonCount: number;
  /** Lessons where at least one thing can actually be opened or played. */
  withSomething: number;
  /** Lessons where a learner gets nothing at all. */
  withNothing: number;
  /** Lessons with any note or blocker. */
  withTrouble: number;
  /**
   * The single thing to fix first, and how many other lessons share its
   * severity — the same shape as the translation claim board, for the same
   * reason: with forty rows the question is "what do I do next", not "how bad is
   * this one".
   */
  next: { lessonId: string; lessonTitle: string; sentence: string; severity: number } | null;
  /** Further lessons at that same severity, so the sentence can say "and 3 others". */
  nextAlso: number;
};

const TROUBLE: Record<Exclude<Playback, 'video' | 'audio' | 'download'>, string> = {
  link: 'opens as a link rather than in the page',
  uploaded: 'is uploaded; whether it plays depends on the copies below',
  nothing: 'has nowhere to point, so a learner sees a name and nothing to click',
};

/**
 * One lesson's trouble, in the teacher's words.
 *
 * It reads the rows rather than the warnings because it needs the *kind* of
 * problem, not its prose: an empty lesson and a lesson whose recording has not
 * encoded both produce a sentence on the preview, and only one of them is worth
 * opening first.
 */
function troubleOf(lesson: { title: string }, preview: Preview): string[] {
  const trouble: string[] = [];

  if (preview.rows.length === 0) {
    trouble.push('has nothing in it at all — a learner gets a title and an empty page');
    return trouble;
  }

  for (const row of preview.rows) {
    if (!row.ready) {
      trouble.push(
        `“${row.name}” ${row.playback === 'uploaded' ? (row.holdUp ?? 'may not play yet') : TROUBLE.nothing}`,
      );
      continue;
    }
    // A media item that opens as a link is not broken. It is the surprise worth
    // knowing, and it belongs below the things a learner cannot use.
    if (row.playback === 'link' && (row.type === 'video' || row.type === 'audio')) {
      trouble.push(`“${row.name}” ${TROUBLE.link}`);
    }
  }

  if (!preview.hasDescription) {
    trouble.push('has no description, so the page goes straight from the title to the materials');
  }

  return trouble;
}

function severityOf(preview: Preview, trouble: string[]): number {
  if (preview.rows.length === 0) return SEVERITY.empty;
  // `ready` is false for a dead address and for an uploaded file with no player,
  // and true for anything a learner can open — so this is exactly "something is
  // attached and a learner gets nothing".
  if (preview.rows.every((row) => !row.ready)) return SEVERITY.silent;
  if (trouble.length > 0) return SEVERITY.noted;
  return SEVERITY.clean;
}

/**
 * Every lesson in a version, in reading order.
 *
 * Reading order and not worst-first: the teacher is looking at their course, and
 * a course that has been re-sorted by brokenness no longer looks like the thing
 * they wrote. The "fix this first" answer sits above the list instead of
 * rearranging it.
 */
export function rehearseVersion(
  sections: { id: string; title: string; lessons: PreviewLesson[] }[],
  options: { previewsOn: boolean; published: boolean },
): Rehearsal {
  const built: RehearsalSection[] = sections.map((section) => ({
    id: section.id,
    title: section.title,
    lessons: section.lessons.map((lesson) => {
      const preview = previewOf(lesson, options);
      const trouble = troubleOf(lesson, preview);
      return {
        id: lesson.id,
        title: lesson.title,
        preview,
        severity: severityOf(preview, trouble),
        trouble,
      };
    }),
  }));

  const all = built.flatMap((section) => section.lessons);
  const withSomething = all.filter(
    (lesson) => lesson.preview.rows.length > 0 && lesson.preview.rows.some((row) => row.ready),
  ).length;

  // Worst first, then the course's own order — so the named lesson is the first
  // one the teacher would meet if they read their course from the top.
  let next: Rehearsal['next'] = null;
  for (let severity = SEVERITY.empty; severity > SEVERITY.clean; severity -= 1) {
    const worst = all.filter((lesson) => lesson.severity === severity);
    if (worst.length === 0) continue;
    const first = worst[0];
    if (!first) break;
    next = {
      lessonId: first.id,
      lessonTitle: first.title,
      sentence: first.trouble[0] ?? 'needs a look',
      severity,
    };
    break;
  }

  return {
    sections: built,
    lessonCount: all.length,
    withSomething,
    withNothing: all.length - withSomething,
    withTrouble: all.filter((lesson) => lesson.trouble.length > 0).length,
    next,
    nextAlso: next ? all.filter((lesson) => lesson.severity === next.severity).length - 1 : 0,
  };
}

/** `12:30` — a duration as the learner page prints it, or nothing. */
export function durationLabel(seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
