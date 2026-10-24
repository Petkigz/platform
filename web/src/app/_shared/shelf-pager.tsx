import Link from 'next/link';
import { pageHref, pageNumber, pageCount, rangeLabel } from '@/lib/paging';

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
}: {
  basePath: string;
  params: Record<string, string | number | undefined | null>;
  total: number;
  shown: number;
  offset: number;
  limit: number;
}) {
  const label = rangeLabel(offset, shown, total);
  const pages = pageCount(total, limit);
  const current = pageNumber(Math.floor(offset / Math.max(1, limit)) + 1);

  if (label.length === 0) return null;

  return (
    <div className="shelf-meta">
      <p className="shelf-count">{label}</p>

      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {current > 1 ? (
            <Link className="btn secondary" href={pageHref(basePath, params, current - 1)}>
              &larr; Previous
            </Link>
          ) : (
            <span className="btn secondary disabled" aria-disabled="true">
              &larr; Previous
            </span>
          )}

          <span className="pager-at">
            Page {current} of {pages}
          </span>

          {current < pages ? (
            <Link className="btn secondary" href={pageHref(basePath, params, current + 1)}>
              Next &rarr;
            </Link>
          ) : (
            <span className="btn secondary disabled" aria-disabled="true">
              Next &rarr;
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
