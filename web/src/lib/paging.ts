/**
 * Pages of a shelf.
 *
 * Three rules, all of them about not lying to somebody looking at a list.
 *
 * **A page says what it is.** "Showing 1–24 of 137" is the whole point: a shelf
 * that shows twenty-four and stops is indistinguishable from a shelf that only
 * has twenty-four, and the second reading is the one people arrive at.
 *
 * **A page number in a URL is a request, not a fact.** `?page=-4`,
 * `?page=0`, `?page=abc` and `?page=1e9` all arrive from somewhere — a stale
 * link, a hand-typed address, a crawler — and none of them may throw, wrap, or
 * ask the database for a billion rows. They are clamped, and the clamp is here
 * rather than in the SQL so the two ends cannot disagree about what page one
 * means.
 *
 * **A link keeps the filters.** Every paging control is built from the current
 * query, so page two of "tafsir, children" is still "tafsir, children". The
 * classic bug is a Next link that silently drops the subject and shows the
 * whole catalogue from the second page on.
 */

import { countLabel, formatNumber, isLocaleCode, translator } from './i18n/index.ts';

/** Courses per page. Twelve rows of two on a desktop, and not a scroll away. */
export const PAGE_SIZE = 24;

/** The largest page number accepted; beyond this the shelf is not that long. */
const MAX_PAGE = 10_000;

/**
 * A 1-based page number from a query string value.
 *
 * Anything that is not a positive whole number is page one: a mistyped address
 * should show the first page, not an error, and never a negative offset.
 */
export function pageNumber(raw: unknown): number {
  if (Array.isArray(raw)) return pageNumber(raw[0]);
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? clampPage(Math.trunc(raw)) : 1;
  }
  if (typeof raw !== 'string') return 1;

  // Digits only, and long enough that a hand-typed or crawled number is
  // clamped rather than silently reset to page one — both land somewhere sane,
  // but clamping keeps the reader where they were trying to go.
  const text = raw.trim();
  if (!/^\d{1,15}$/.test(text)) return 1;
  return clampPage(Number(text));
}

function clampPage(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_PAGE);
}

/** Where a page starts. Always a multiple of the page size. */
export function offsetFor(page: number, size: number = PAGE_SIZE): number {
  const safeSize = Number.isFinite(size) && size > 0 ? Math.trunc(size) : PAGE_SIZE;
  return (pageNumber(page) - 1) * safeSize;
}

/** How many pages a total needs. Zero results is one page, not zero. */
export function pageCount(total: number, size: number = PAGE_SIZE): number {
  const t = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const s = Number.isFinite(size) && size > 0 ? Math.trunc(size) : PAGE_SIZE;
  return Math.max(1, Math.ceil(t / s));
}

/**
 * The line above the grid.
 *
 * Empty when there is nothing to say — the empty state has its own sentence and
 * "Showing 0–0 of 0" underneath it helps nobody. When everything fits on one
 * page it is simply the count, because there is no limit to disclose.
 */
export function rangeLabel(
  offset: number,
  shown: number,
  total: number,
  code: string = 'en',
): string {
  if (!Number.isFinite(total) || total <= 0) return '';
  if (!Number.isFinite(shown) || shown <= 0) return '';

  const from = Math.max(0, offset) + 1;
  const to = Math.max(0, offset) + shown;
  const locale = (isLocaleCode(code) ? code : 'en') as Parameters<typeof translator>[0];

  // Twenty-five of a hundred and thirty-seven is written in the reader's own
  // digits — Arabic says ٢٥ — because a translated sentence with an English
  // number in it is still a sentence a reader has to decode.
  if (total <= shown) {
    return countLabel(locale, total, {
      one: 'catalogue.countOne',
      other: 'catalogue.countOther',
    });
  }
  return translator(locale)('catalogue.showing', {
    from: formatNumber(locale, from),
    to: formatNumber(locale, to),
    total: formatNumber(locale, total),
  });
}

/**
 * A link to page N, keeping every filter that is currently applied.
 *
 * `page=1` is left off the URL entirely, so the first page has exactly one
 * address — otherwise `/catalogue` and `/catalogue?page=1` are two pages with
 * the same content, which splits every bookmark and every search result.
 */
export function pageHref(
  basePath: string,
  params: Record<string, string | number | undefined | null>,
  page: number,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === 'page') continue;
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    // `all` is the absence of a filter everywhere else in the catalogue, so it
    // must not appear in a link either.
    if (text.length === 0 || text === 'all') continue;
    search.set(key, text);
  }

  const n = pageNumber(page);
  if (n > 1) search.set('page', String(n));

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
