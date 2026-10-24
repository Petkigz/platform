/**
 * Which navigation item is the page you are on.
 *
 * The masthead is eight links that all look the same, so the only thing telling
 * a reader where they are is the content. A sighted reader works it out from the
 * heading; a screen-reader user gets nothing at all, because `aria-current` was
 * never set anywhere in the chrome.
 *
 * The matching rule is the whole of this module, and it is subtler than it
 * looks: `/learn` is the current section on `/learn` and on
 * `/learn/abc/lesson/xyz`, but not on `/learned` or `/learn-paths`. A bare
 * `startsWith` says yes to all four.
 */

/** Strip a query, a fragment and trailing slashes; `''` becomes `/`. */
export function normalisePath(value: string): string {
  const path = value.split('?')[0]?.split('#')[0] ?? '';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : '/';
}

/**
 * True when `href` is the section the reader is in.
 *
 * `/` is only ever itself — every path starts with a slash, so accepting a
 * prefix would mark the home link current on every page of the site.
 */
export function isCurrentPath(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  const path = normalisePath(pathname);
  const target = normalisePath(href);

  if (target === '/') return path === '/';
  return path === target || path.startsWith(`${target}/`);
}
