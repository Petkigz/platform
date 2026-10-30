import Link from 'next/link';
import { pageHref, pageNumber, pageCount, rangeLabel } from '@/lib/paging';
import {
  directionOf,
  formatNumber,
  isLocaleCode,
  translator,
  type LocaleCode,
} from '@/lib/i18n';

/**
 * The count above a shelf and the two links under it.
 *
 * A shelf that shows twenty-four of a hundred and thirty-seven and says nothing
 * is read as a shelf of twenty-four. The line above the grid is therefore always
 * there when there is a total to report, and the pager is only rendered when
 * there is more than one page — a control that cannot move is not a control.
 *
 * Every link keeps the filters, because page two of "tafsir, children" has to
 * still be "tafsir, children": a Next link that quietly drops the subject is the
 * most common way a paged list starts showing the wrong thing from page two on.
 *
 * `params` is the current query as it arrived, so the links are built from what
 * the reader actually chose rather than from what the page assumed.
 */
export function ShelfPager({
  basePath,
  params,
  total,
  shown,
  offset,
  limit,
  locale = 'en',
}: {
  basePath: string;
  params: Record<string, string | number | undefined | null>;
  total: number;
  shown: number;
  offset: number;
  limit: number;
  /** The language the page is in — the count and the two links follow it. */
  locale?: LocaleCode;
}) {
  const code: LocaleCode = isLocaleCode(locale) ? locale : 'en';
  const t = translator(code);

  // The arrows follow the reading direction, not the words. In Arabic "previous"
  // sits to the right of "next", so a left-pointing arrow beside the word for
  // "previous" points the reader at the wrong page. The glyph is the only thing
  // that changes; the link and its label are the same link and the same label.
  const [back, forward] = directionOf(code) === 'rtl' ? ['\u2192', '\u2190'] : ['\u2190', '\u2192'];
  const label = rangeLabel(offset, shown, total, code);
  const pages = pageCount(total, limit);
  const current = pageNumber(Math.floor(offset / Math.max(1, limit)) + 1);

  if (label.length === 0) return null;

  return (
    <div className="shelf-meta">
      <p className="shelf-count">{label}</p>

      {pages > 1 && (
        <nav className="pager" aria-label={t('catalogue.pages')}>
          {current > 1 ? (
            <Link className="btn secondary" href={pageHref(basePath, params, current - 1)}>
              {back} {t('catalogue.previous')}
            </Link>
          ) : (
            <span className="btn secondary disabled" aria-disabled="true">
              {back} {t('catalogue.previous')}
            </span>
          )}

          <span className="pager-at">
            {t('catalogue.pageOf', {
              page: formatNumber(code, current),
              pages: formatNumber(code, pages),
            })}
          </span>

          {current < pages ? (
            <Link className="btn secondary" href={pageHref(basePath, params, current + 1)}>
              {t('catalogue.next')} {forward}
            </Link>
          ) : (
            <span className="btn secondary disabled" aria-disabled="true">
              {t('catalogue.next')} {forward}
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
