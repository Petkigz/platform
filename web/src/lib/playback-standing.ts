/**
 * What a learner is told when the recording is not there.
 *
 * The lesson page printed one sentence — *"uploaded, not yet encoded for
 * playback"* — for six different situations. It was a database column talking, to
 * the one person who can do nothing about any of them: no idea whether to wait,
 * whether to tell somebody, or whether the lesson is broken for good.
 *
 * **Six states for staff, three words for the learner**, and the difference is the
 * point. `media-encoding.ts` answers *whose job is this* — the encoder, moderation,
 * the verification queue — because those are five different people. The learner's
 * job is never one of them, so what is left is the only question they have: do I
 * wait, or do I tell someone?
 *
 *   plays        watch it.
 *   preparing    not ready yet; nothing for you to do.
 *   unavailable  it will not play without a person. Tell somebody.
 *
 * **`preparing` promises nothing.** There is no transcode worker in this
 * deployment, so a verified file with nothing encoded can sit there indefinitely.
 * "Not ready yet" is true of it. "It will appear shortly" would be a promise this
 * platform cannot keep, and it is exactly the sentence a learner would remember.
 *
 * `unavailable` is the failed and held cases and nothing else, because those are
 * the two where nobody is coming unless somebody is told.
 */

import { en, type MessageKey } from './i18n/messages/en.ts';

/** One resource's standing, from `lesson_playback_standing()`. */
export type Standing = 'plays' | 'preparing' | 'unavailable';

export type ResourceStanding = {
  resourceId: string;
  state: Standing;
};

/**
 * Whatever the RPC returned, as the shape above.
 *
 * Anything unrecognised is dropped rather than guessed at: a state the page does
 * not know is a sentence the page cannot stand behind, and the resource then
 * renders with no note at all — which is what it did before this existed.
 */
export function parseStanding(rows: unknown): Map<string, Standing> {
  const map = new Map<string, Standing>();
  if (!Array.isArray(rows)) return map;

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const resourceId = row.resource_id ?? row.resourceId;
    const state = row.state ?? row.standing;
    if (!resourceId) continue;
    if (state !== 'plays' && state !== 'preparing' && state !== 'unavailable') continue;
    map.set(String(resourceId), state);
  }

  return map;
}

export type Note = {
  /** The quieter word above the sentence: what is happening, in one word. */
  heading: string;
  /** One sentence, in the learner's terms, that refuses to promise anything. */
  sentence: string;
  /**
   * Where those two are in the catalogue, for a page written in another
   * language. `heading` and `sentence` are the English of the same two keys,
   * so there is one wording and the page chooses the language.
   */
  headingKey: MessageKey;
  sentenceKey: MessageKey;
  /** Whether the learner should be pointed at the report form. */
  tellSomeone: boolean;
};

function note(headingKey: MessageKey, sentenceKey: MessageKey, tellSomeone: boolean): Note {
  return { heading: en[headingKey], sentence: en[sentenceKey], headingKey, sentenceKey, tellSomeone };
}

/**
 * The sentence a learner reads in place of the player.
 *
 * `null` means "say nothing" — either it plays, or this page was never told, and
 * silence is better than a guess on a screen somebody is trying to study from.
 *
 * **It never blames the learner**, never mentions encoding, profiles, workers or
 * moderation, and never gives a time it cannot stand behind. Those are the four
 * ways this copy could be wrong in a way that is remembered.
 */
export function noteFor(state: Standing | null | undefined): Note | null {
  if (state === 'plays') return null;

  if (state === 'preparing') {
    // Nothing to do about it, and saying "report it" would send a person to a
    // queue for something that is already on its way through one.
    return note('lesson.recPreparingHead', 'lesson.recPreparing', false);
  }

  if (state === 'unavailable') {
    return note('lesson.recUnavailableHead', 'lesson.recUnavailable', true);
  }

  return null;
}

/**
 * The lesson as a whole, when something in it cannot be played.
 *
 * Said above the materials rather than under them, because a learner who reads the
 * first line and stops is the one who needs it most. `null` when everything plays
 * or the page was not told — the same rule as a single note.
 */
export function lessonNote(states: readonly (Standing | null | undefined)[]): Note | null {
  if (states.length === 0) return null;

  // A single unavailable item is worse than any number of items still coming: it
  // is the one that needs a person, and it is the one worth leading with.
  if (states.some((state) => state === 'unavailable')) {
    const count = states.filter((state) => state === 'unavailable').length;
    // "One" and "some", not a number: no language has to make a noun agree.
    return note(count === 1 ? 'lesson.recSummaryOne' : 'lesson.recSummarySome', 'lesson.recSummaryBroken', true);
  }

  if (states.some((state) => state === 'preparing')) {
    return note('lesson.recSummaryPreparingHead', 'lesson.recSummaryPreparing', false);
  }

  return null;
}
