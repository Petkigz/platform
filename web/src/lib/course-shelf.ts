/**
 * Every course, and who it is for.
 *
 * The shape is `course_shelf()`, which decides who may read it at all. The
 * parsing is separate from the page so the two things that matter can be
 * tested without a database: a row that grows a column this screen does not
 * show, and a list that claims to be everything when it was cut off.
 *
 * Both have bitten this platform before in spirit — the first is how a money
 * column arrives in a directory, the second is what a LIMIT does when nobody
 * says so out loud.
 */

import { AGE_BANDS, BAND_LABEL, isAgeBand, type Audience } from './audience.ts';

export type ShelfStatus = 'draft' | 'active' | 'retired';

export type ShelfRow = {
  courseId: string;
  slug: string;
  title: string;
  audience: Audience;
  ageBands: string[];
  status: ShelfStatus;
  author: string;
  authorId: string;
  publishedVersions: number;
  lastPublishedAt: string | null;
  learners: number;
  createdAt: string;
};

export type Shelf = {
  query: string | null;
  audience: Audience | null;
  total: number;
  shown: number;
  truncated: boolean;
  rows: ShelfRow[];
};

export class ShelfError extends Error {}

/**
 * The columns a shelf row is allowed to have.
 *
 * Written as a list rather than assumed, so the day somebody adds a price to
 * `course_shelf()` the page does not start rendering it and this file has to be
 * edited first.
 */
export const ALLOWED_SHELF_FIELDS = [
  'courseId', 'slug', 'title', 'audience', 'ageBands', 'status',
  'author', 'authorId', 'publishedVersions', 'lastPublishedAt',
  'learners', 'createdAt',
] as const;

function str(value: unknown, field: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  throw new ShelfError(`a course row has no ${field}`);
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return 0;
}

function isAudience(value: unknown): value is Audience {
  return value === 'child' || value === 'adult' || value === 'both';
}

function isStatus(value: unknown): value is ShelfStatus {
  return value === 'draft' || value === 'active' || value === 'retired';
}

export function parseShelf(value: unknown): Shelf {
  if (!value || typeof value !== 'object') throw new ShelfError('the course shelf did not load');

  const raw = value as Record<string, unknown>;
  const rows = Array.isArray(raw.rows) ? raw.rows : [];
  const total = num(raw.total);

  const parsed: ShelfRow[] = rows.map((entry): ShelfRow => {
    const row = (entry ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(row)) {
      if (!(ALLOWED_SHELF_FIELDS as readonly string[]).includes(key)) {
        throw new ShelfError(`a course row carries '${key}', which this screen does not show`);
      }
    }

    if (!isAudience(row.audience)) {
      throw new ShelfError('a course does not say who it is for');
    }
    // A lifecycle this screen has not been taught is shown by refusing, not by
    // guessing: a retired course badged as a draft would be a wrong fact on a
    // page whose whole job is being right about who may see what.
    if (!isStatus(row.status)) {
      throw new ShelfError(`a course has the status '${String(row.status)}', which this screen does not know`);
    }

    return {
      courseId: str(row.courseId, 'id'),
      slug: str(row.slug, 'address'),
      title: str(row.title, 'title'),
      audience: row.audience,
      ageBands: Array.isArray(row.ageBands)
        ? row.ageBands.filter((b): b is string => typeof b === 'string')
        : [],
      status: row.status,
      author: str(row.author, 'author'),
      authorId: str(row.authorId, 'author id'),
      publishedVersions: num(row.publishedVersions),
      lastPublishedAt: strOrNull(row.lastPublishedAt),
      learners: num(row.learners),
      createdAt: str(row.createdAt, 'creation date'),
    };
  });

  return {
    query: strOrNull(raw.query),
    audience: isAudience(raw.audience) ? raw.audience : null,
    total,
    shown: parsed.length,
    truncated: raw.truncated === true || total > parsed.length,
    rows: parsed,
  };
}

/**
 * What the list says above itself, including the case where it is not every
 * course on the platform. Silence about a LIMIT is how a list of fifty becomes
 * "we have fifty courses" in somebody's head.
 */
export function shelfSummary(shelf: Pick<Shelf, 'total' | 'shown' | 'truncated'>): string {
  if (shelf.total === 0) return 'No course matches.';
  if (!shelf.truncated) {
    return shelf.total === 1 ? 'One course.' : `${shelf.total} courses.`;
  }
  return `Showing ${shelf.shown} of ${shelf.total} courses. Narrow the search to see the rest.`;
}

/**
 * The row, said plainly: "Young learners · Ages 5–7, 8–10".
 *
 * Empty bands are said out loud rather than left blank, because blank reads as
 * "nobody has decided" and an empty array means the opposite — every age the
 * audience allows. An adult course is never shown as "Adults · Adults", which is
 * what reusing the course page's sentence would do, since the 18+ band is
 * itself called "Adults".
 */
export function shelfAudience(row: Pick<ShelfRow, 'audience' | 'ageBands'>): string {
  // An adult course has one band, and that band is called "Adults". Reusing the
  // course page's sentence would print "Adults · Adults"; the code is clearer
  // than the label here.
  if (row.audience === 'adult') return 'Adults · 18+';

  const known = row.ageBands.filter(isAgeBand);
  if (known.length === 0) {
    return row.audience === 'child'
      ? 'Young learners · ages 5–17'
      : 'Both audiences · every age, child and adult';
  }

  const door = row.audience === 'child' ? 'Young learners' : 'Both audiences';
  const labels = AGE_BANDS.filter((band) => known.includes(band)).map((band) => BAND_LABEL[band]);
  // "Ages 5–7, 11–13", not "Ages 5–7, Ages 11–13": the word is said once.
  const [first = '', ...rest] = labels;
  const text = [first, ...rest.map((label) => label.replace(/^Ages /, ''))].join(', ');
  return `${door} · ${text}`;
}

export function statusLabel(status: ShelfStatus): string {
  if (status === 'active') return 'Active';
  if (status === 'retired') return 'Retired';
  return 'Draft';
}
