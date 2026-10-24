/**
 * Who a course is for.
 *
 * Two ideas that look like one. **Audience** is the door — young learners or
 * adults — and it is a safeguarding signal: child content is what the guardian
 * machinery exists for. **Age band** is the shelf inside that door: a course for
 * a six-year-old and a course for a fifteen-year-old are both child content and
 * are not the same course.
 *
 * The database settles both (`courses.audience`, `courses.age_bands`, and
 * `age_bands_for_audience()` deciding which bands an audience may claim). These
 * are the labels and the matching rules the screens read them with.
 */

export const AGE_BANDS = ['5-7', '8-10', '11-13', '14-17', '18+'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const BAND_LABEL: Record<AgeBand, string> = {
  '5-7': 'Ages 5–7',
  '8-10': 'Ages 8–10',
  '11-13': 'Ages 11–13',
  '14-17': 'Ages 14–17',
  '18+': 'Adults',
};

export type Audience = 'child' | 'adult' | 'both';

export const AUDIENCE_BANDS: Record<Audience, AgeBand[]> = {
  child: ['5-7', '8-10', '11-13', '14-17'],
  adult: ['18+'],
  both: ['5-7', '8-10', '11-13', '14-17', '18+'],
};

export function isAgeBand(value: unknown): value is AgeBand {
  return typeof value === 'string' && (AGE_BANDS as readonly string[]).includes(value);
}

/**
 * Read the bands a form sent, in the canonical order.
 *
 * Unknown values are **kept** in `unknown` rather than silently dropped: a
 * course that quietly loses a band looks fine on the screen and is wrong in the
 * database, and the form should be able to say which one it did not recognise.
 */
export function parseBands(value: unknown): { bands: AgeBand[]; unknown: string[] } {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed.length > 0) seen.add(trimmed);
  }
  const bands = AGE_BANDS.filter((band) => seen.has(band));
  const unknown = [...seen].filter((entry) => !isAgeBand(entry));
  return { bands: [...bands], unknown };
}

/**
 * The sentence a form shows before it sends, or nothing when the pair is fine.
 *
 * It mirrors `set_course_audience()` rather than replacing it — the database
 * refuses the same combinations, and its refusal is the one that counts. This
 * exists so a checkbox mistake costs no round trip.
 */
export function validateAudience(audience: string, bands: AgeBand[]): string | null {
  if (audience !== 'child' && audience !== 'adult' && audience !== 'both') {
    return 'Choose young learners, adults, or both.';
  }
  const allowed = AUDIENCE_BANDS[audience];
  const bad = bands.find((band) => !allowed.includes(band));
  if (bad) {
    return `${BAND_LABEL[bad]} is not available for that audience.`;
  }
  return null;
}

export type Door = 'young' | 'adults';

/** Which courses belong on which door, given the audience a course declares. */
export function audienceFits(courseAudience: string, door: Door): boolean {
  if (courseAudience === 'both') return true;
  return door === 'young' ? courseAudience === 'child' : courseAudience === 'adult';
}

/**
 * Does a course suit this band?
 *
 * **Empty means every band the audience allows.** That is what every course
 * written before the column existed means, and treating empty as "no bands"
 * would hide the entire back catalogue from both doors on the day it shipped.
 */
export function bandFits(courseBands: readonly string[] | null | undefined, band: AgeBand | null): boolean {
  if (!band) return true;
  if (!courseBands || courseBands.length === 0) return true;
  return courseBands.includes(band);
}

/** What the course page says about who it is for. */
export function audienceSummary(audience: string, bands: readonly string[] | null | undefined): string {
  const door =
    audience === 'child' ? 'Young learners'
    : audience === 'adult' ? 'Adults'
    : 'All ages';
  const known = (bands ?? []).filter(isAgeBand);
  if (known.length === 0) return `${door} · suited to every age in that group`;
  const labels = AGE_BANDS.filter((band) => known.includes(band)).map((band) => BAND_LABEL[band]);
  return `${door} · ${labels.join(', ')}`;
}
