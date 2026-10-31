/**
 * One version, rehearsed — the read that three screens share.
 *
 * Three people now ask "what does a learner actually get from this version": the
 * author opening one lesson, the author checking all forty before submitting, and
 * the reviewer deciding whether it may publish. Written three times they would be
 * three chances for the answers to differ, and the reviewer's copy is the one that
 * would be wrong first — it would be the screen nobody looks at while editing.
 *
 * So the shape is: `fetchVersion()` for the course, `deliveryForVersion()` for the
 * encoding counts, and `rehearsalFrom()` — pure, tested without a database — to
 * turn both into `previewOf()`'s answer for every lesson.
 *
 * **The delivery read is allowed to fail.** A deployment without the function, a
 * timeout, a policy change: none of them should turn a review screen into an error
 * page. The failure is reported as an empty map, and an empty map is exactly the
 * honest state — *we did not find out whether this plays* — which
 * `lesson-preview.ts` already distinguishes from *it does not play*.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchVersion, type AuthoredVersion } from './authoring.ts';
import { byAsset, parseDelivery, type Delivery } from './media-encoding.ts';
import {
  rehearseVersion,
  type AuthoredRow,
  type PreviewLesson,
  type Rehearsal,
} from './lesson-preview.ts';

export type LoadedRehearsal = {
  version: AuthoredVersion;
  /** Every lesson in reading order, with the notes a learner's page implies. */
  rehearsal: Rehearsal;
  /** The same lessons keyed by id, for a screen that renders one of them. */
  lessons: Map<string, PreviewLesson>;
  previewsOn: boolean;
  /**
   * False when the encoding counts could not be read. A screen may say so; it
   * must not turn it into "nothing plays".
   */
  deliveryKnown: boolean;
};

/** The authored lesson as the preview needs it, with whatever encoding we have. */
function previewLessonOf(
  sectionTitle: string,
  lesson: AuthoredVersion['sections'][number]['lessons'][number],
  delivery: Map<string, Delivery>,
): PreviewLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    isPreview: lesson.isPreview,
    sectionTitle,
    description: lesson.description,
    durationSeconds: lesson.durationSeconds,
    resources: lesson.resources.map(
      (resource): AuthoredRow => ({
        id: resource.id,
        resourceName: resource.resourceName,
        resourceType: resource.resourceType,
        externalUrl: resource.externalUrl,
        mediaAssetId: resource.mediaAssetId,
        // `null` rather than undefined when the row has no file: an external
        // address has no encoding state, and the row says so.
        encoding:
          resource.mediaAssetId === null ? null : (delivery.get(resource.mediaAssetId) ?? null),
        access: resource.access,
      }),
    ),
  };
}

/**
 * The pure half: an authored version plus whatever is known about encoding.
 *
 * No database, no flags, no dates — which is what makes it possible to test the
 * reviewer's screen and the author's screen against the same fixtures.
 */
export function rehearsalFrom(
  version: AuthoredVersion,
  delivery: Map<string, Delivery>,
  options: { previewsOn: boolean; published: boolean; deliveryKnown?: boolean },
): LoadedRehearsal {
  const lessons = new Map<string, PreviewLesson>();
  const sections = version.sections.map((section) => ({
    id: section.id,
    title: section.title,
    lessons: section.lessons.map((lesson) => {
      const built = previewLessonOf(section.title, lesson, delivery);
      lessons.set(lesson.id, built);
      return built;
    }),
  }));

  return {
    version,
    rehearsal: rehearseVersion(sections, {
      previewsOn: options.previewsOn,
      published: options.published,
    }),
    lessons,
    previewsOn: options.previewsOn,
    deliveryKnown: options.deliveryKnown ?? true,
  };
}

export type DeliveryReading = {
  delivery: Map<string, Delivery>;
  /**
   * False when the call itself failed. The distinction matters: no rows from a
   * working function means "nothing here is uploaded", and no rows from a failed
   * call means "we did not find out" — and a screen that confused them would
   * accuse a course of being empty after a timeout.
   */
  known: boolean;
};

/**
 * The encoding counts for a version.
 *
 * `version_delivery_state()` returns counts and no object coordinates, and its
 * three branches are `may_watch_master()`'s: the author, an active reviewer, and
 * a file's own uploader. Everybody else gets no rows — which is the answer, not
 * an error, and is why this cannot throw.
 */
export async function deliveryForVersion(
  supabase: SupabaseClient,
  versionId: string,
): Promise<DeliveryReading> {
  const { data, error } = await supabase.rpc('version_delivery_state', {
    p_version_id: versionId,
  });
  if (error) return { delivery: new Map(), known: false };
  return { delivery: byAsset(parseDelivery(data)), known: true };
}

/**
 * Everything a rehearsal screen needs, in one call.
 *
 * `null` means the version is not readable to this caller at all — a stranger's
 * guessed id, or a version deleted under a page that was already open.
 */
export async function loadRehearsal(
  supabase: SupabaseClient,
  versionId: string,
  options: { previewsOn: boolean },
): Promise<LoadedRehearsal | null> {
  const version = await fetchVersion(supabase, versionId).catch(() => null);
  if (!version) return null;

  const reading = await deliveryForVersion(supabase, versionId);

  return rehearsalFrom(version, reading.delivery, {
    previewsOn: options.previewsOn,
    published: version.status === 'published',
    deliveryKnown: reading.known,
  });
}
