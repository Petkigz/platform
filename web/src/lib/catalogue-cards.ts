/**
 * What is in a course, and what it costs me — the card behind a catalogue row.
 *
 * `catalogue_cards(ids, country)` answers for a whole shelf in one call, so a
 * catalogue of forty courses is one request rather than forty. This module is
 * the boundary: it parses that reply, refuses a shape it does not understand,
 * and turns the numbers into the one line a card can afford.
 *
 * Two rules carried over from the money screens:
 *
 *   * **The price is never computed here.** `offeringFromAnswer()` and
 *     `offeringLabel()` are the same functions the course page and the enrol
 *     button use, fed the same resolver's answer. A catalogue that formatted
 *     its own price would eventually disagree with the button that charges, and
 *     the person who finds out is the buyer.
 *
 *   * **Nothing is summed.** A card has one offering in one currency. There is
 *     no total across the shelf anywhere in this file, because two currencies do
 *     not add up.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  offeringFromAnswer,
  offeringLabel,
  type CoursePriceAnswer,
  type Offering,
} from './enrolment.ts';

export type CourseCard = {
  courseId: string;
  offering: Offering;
  sections: number;
  lessons: number;
  /** Total minutes across lessons that declared a length, or null if none did. */
  minutes: number | null;
  /** How many lessons declared a length. Less than `lessons` means `minutes` is a floor. */
  timedLessons: number;
};

type RawCard = {
  courseId?: unknown;
  offering?: unknown;
  sections?: unknown;
  lessons?: unknown;
  minutes?: unknown;
  timedLessons?: unknown;
};

const asCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

/**
 * Parse the reply into a map keyed by course id.
 *
 * A card for a course that is not in the caller's list is dropped rather than
 * kept: the database answers only about courses on the shelf, and a stale row
 * would be a card for something that is no longer there.
 */
export function parseCards(value: unknown): Map<string, CourseCard> {
  if (!Array.isArray(value)) return new Map();

  const out = new Map<string, CourseCard>();
  for (const raw of value) {
    const row = (raw ?? {}) as RawCard;
    const courseId = typeof row.courseId === 'string' ? row.courseId : '';
    if (!courseId) continue;

    const minutes =
      typeof row.minutes === 'number' && Number.isFinite(row.minutes) && row.minutes > 0
        ? Math.round(row.minutes)
        : null;
    const timedLessons = asCount(row.timedLessons);

    out.set(courseId, {
      courseId,
      offering: offeringFromAnswer((row.offering ?? null) as CoursePriceAnswer | null),
      sections: asCount(row.sections),
      lessons: asCount(row.lessons),
      // A duration with no timed lesson behind it is not a duration.
      minutes: timedLessons > 0 ? minutes : null,
      timedLessons,
    });
  }

  return out;
}

/** "2h 05m" / "45 min" — the shortest honest rendering of a running time. */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const whole = Math.round(minutes);
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * One line under the description: how much there is to do.
 *
 * A duration that does not cover every lesson is written with a `+`, because
 * "20 min" for a course where one of three lessons has no stated length is a
 * claim the data does not support. Missing data is silence, not zero.
 */
export function contentLine(card: CourseCard | null | undefined): string {
  if (!card) return '';

  const parts: string[] = [];
  if (card.sections > 0) parts.push(`${card.sections} ${card.sections === 1 ? 'section' : 'sections'}`);
  if (card.lessons > 0) parts.push(`${card.lessons} ${card.lessons === 1 ? 'lesson' : 'lessons'}`);

  const time = card.minutes === null ? '' : formatMinutes(card.minutes);
  if (time) {
    parts.push(card.timedLessons < card.lessons ? `${time}+` : time);
  }

  return parts.join(' · ');
}

/** The price, in the words the rest of the product uses. */
export function cardPrice(card: CourseCard | null | undefined): string | null {
  if (!card) return null;
  return offeringLabel(card.offering);
}

/**
 * Whether the price is an invitation to pay.
 *
 * A card showing a figure is a card whose click leads to a checkout; a card
 * showing "Free" is one whose click enrols. This exists so a caller can style
 * them differently without re-deciding what each offering kind means.
 */
export function isPriced(card: CourseCard | null | undefined): boolean {
  return card?.offering.kind === 'paid';
}

/**
 * Ask the database for a whole shelf at once.
 *
 * The country is a display hint, exactly as it is on the course page: the
 * database prefers the account's recorded country and ignores this when there
 * is one, so a crafted header cannot change what a signed-in buyer is charged.
 * It can only change what a signed-out visitor is shown — and a signed-out
 * visitor on a British connection should see the British price, not the
 * default one.
 */
export async function fetchCourseCards(
  client: SupabaseClient,
  courseIds: string[],
  country: string | null,
): Promise<Map<string, CourseCard>> {
  const ids = [...new Set(courseIds.filter((id) => typeof id === 'string' && id.length > 0))].slice(0, 100);
  if (ids.length === 0) return new Map();

  const { data, error } = await client.rpc('catalogue_cards', {
    p_course_ids: ids,
    p_country: country,
  });
  if (error) throw new Error(error.message);

  return parseCards(data ?? []);
}
