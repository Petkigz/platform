/**
 * What a crawler may see, and what it may keep.
 *
 * The site had no `robots.txt` and no `sitemap.xml`, so a search engine had
 * nothing but links to go on — and the links include `/admin`, `/learn`,
 * `/teach`, `/account` and `/api/…`, all of which redirect to sign-in but all of
 * which get crawled first. For a new site with no inbound links, "we are not in
 * the index yet" is the difference between existing and not existing.
 *
 * This module is the part with rules worth testing; `app/robots.ts` and
 * `app/sitemap.ts` are the thin adapters Next calls.
 *
 * **Three distinctions the rules are built on.**
 *
 * `robots.txt` stops a crawler *requesting* a URL. It does not stop a URL being
 * indexed if it is found another way — a link in a chat, a redirect from a page
 * that is crawled. A `noindex` meta tag stops it being *kept*. They are not
 * interchangeable, so the private surfaces get both, and `/verify/<number>` —
 * which prints a learner's name and is reachable by anybody holding the
 * certificate — gets the meta tag even though it is deliberately not in
 * `robots.txt`: the number is the capability, and a capability is not a reason
 * to let a search engine keep a child's name.
 *
 * A sitemap is a promise that these addresses exist and are worth indexing. So
 * it never contains a path that redirects, never contains a private path, and
 * never contains the verification result page.
 */

export type StaticRoute = {
  path: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
};

/** Pages that are public and exist whatever any switch says. */
export const PUBLIC_ROUTES: readonly StaticRoute[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/catalogue', priority: 0.9, changeFrequency: 'daily' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/verify', priority: 0.5, changeFrequency: 'monthly' },
  // The register of terms. Public on purpose: a term you must accept before
  // signing up has to be readable before signing up, and an index of them is
  // how somebody checks the platform has one.
  { path: '/policies', priority: 0.4, changeFrequency: 'monthly' },
];

/**
 * Pages that only exist while their switch is on.
 *
 * `/young` and `/adults` **redirect** to the catalogue while
 * `learning.audience_sections` is off, and a sitemap that lists a redirect is
 * lying about what is there — a crawler follows it, lands somewhere else, and
 * reports the listed address as "page with redirect". `/plans` and `/paths` do
 * not redirect, but with their switches off they say "not open yet", which is
 * true and useful to a reader and worthless in an index.
 *
 * The flags are the same keys the pages themselves read. If one of these routes
 * ever stops being gated, the entry here is what has to change — which is why
 * `check:repo` #10 refuses a gated route whose page never asks about a flag.
 */
export const GATED_ROUTES: readonly (StaticRoute & { flag: string })[] = [
  { path: '/young', priority: 0.7, changeFrequency: 'weekly', flag: 'learning.audience_sections' },
  { path: '/adults', priority: 0.7, changeFrequency: 'weekly', flag: 'learning.audience_sections' },
  { path: '/plans', priority: 0.6, changeFrequency: 'monthly', flag: 'commerce.subscriptions' },
  { path: '/paths', priority: 0.6, changeFrequency: 'weekly', flag: 'learning.paths' },
];

/**
 * Prefixes a crawler is told to stay out of.
 *
 * `/api/` is first because it is the largest and the least negotiable: every
 * route under it is a POST that answers JSON, and none of it is a page. The
 * rest are the signed-in areas — a crawler that follows a link into `/learn`
 * spends the request being redirected, and the same for each one after it.
 *
 * `/verify` is deliberately absent. The form is public and useful; the result
 * page is excluded by metadata instead, because a `Disallow` there would also
 * stop a link checker following an employer's own certificate, and because
 * `Disallow` prevents the crawl that would let the `noindex` be read at all.
 */
export const DISALLOWED_PREFIXES: readonly string[] = [
  '/api/',
  '/admin',
  '/account',
  '/billing',
  '/certificates',
  '/dashboard',
  '/downloads',
  '/family',
  '/learn',
  '/live',
  '/notifications',
  '/orders',
  '/panel',
  '/review',
  '/saved',
  '/share',
  '/sign-out',
  '/subscriptions',
  '/support',
  '/teach',
];

/**
 * `robots.txt`, as text.
 *
 * One `User-agent: *` block. There is no need for per-bot rules yet, and a rule
 * that only applies to one crawler is a rule nobody tests.
 */
export function robotsTxt(sitemapUrl: string | null): string {
  const lines = ['User-agent: *', 'Allow: /'];

  for (const prefix of DISALLOWED_PREFIXES) lines.push(`Disallow: ${prefix}`);

  // A `Sitemap:` line must be an absolute URL; emitting a relative one is worse
  // than emitting none, because a crawler will silently ignore the whole file.
  if (sitemapUrl) {
    lines.push('', `Sitemap: ${sitemapUrl}`);
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Is this path one a crawler should stay out of?
 *
 * Used by the sitemap builder as a final refusal — a route added to the list
 * above by mistake should not be able to reach the index through it.
 */
export function isDisallowed(path: string): boolean {
  const clean = path.split('?')[0] ?? path;
  return DISALLOWED_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? clean.startsWith(prefix) : clean === prefix || clean.startsWith(`${prefix}/`),
  );
}

export type SitemapEntry = {
  url: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  lastModified?: Date;
};

/**
 * The sitemap, given an origin and the dynamic pages that exist right now.
 *
 * Two refusals live here rather than in the adapter:
 *
 * - **No origin, no sitemap.** Every URL in one must be absolute; inventing one
 *   from a request header would publish a sitemap pointing at whatever host the
 *   requester typed, which is the same defect the printed certificate avoids.
 *   With nothing configured the answer is an empty list, which is a valid
 *   sitemap that claims nothing.
 * - **A disallowed path is dropped, not trusted.** The caller builds the list;
 *   this function decides what may leave.
 *
 * Duplicates are removed by URL, keeping the first — a course that is also a
 * static path (`/about` happens to be both a page and, in a strange future, a
 * course slug) must appear once.
 */
export function buildSitemap(
  origin: string | null,
  { dynamic, enabledFlags }: {
    dynamic: readonly { path: string; lastModified?: Date }[];
    /** The flags that are switched on. A gated route whose flag is absent is not published. */
    enabledFlags: ReadonlySet<string>;
  },
): SitemapEntry[] {
  if (!origin) return [];

  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];

  const staticRoutes: readonly StaticRoute[] = [
    ...PUBLIC_ROUTES,
    ...GATED_ROUTES.filter((route) => enabledFlags.has(route.flag)),
  ];

  for (const route of staticRoutes) {
    if (isDisallowed(route.path) || seen.has(route.path)) continue;
    seen.add(route.path);
    entries.push({
      url: `${origin}${route.path}`,
      priority: route.priority,
      changeFrequency: route.changeFrequency,
    });
  }

  for (const page of dynamic) {
    if (!page.path.startsWith('/') || isDisallowed(page.path) || seen.has(page.path)) continue;
    seen.add(page.path);
    entries.push({
      url: `${origin}${page.path}`,
      priority: 0.8,
      changeFrequency: 'weekly',
      ...(page.lastModified ? { lastModified: page.lastModified } : {}),
    });
  }

  return entries;
}

/**
 * The canonical address of a catalogue page.
 *
 * `/catalogue?subject=quran&utm_source=whatsapp&page=1` and `/catalogue` are the
 * same page, and a search engine that indexes both splits the one page's
 * standing across two addresses. The rule: keep the parameters that change what
 * is on the shelf, drop everything else, and never write `page=1` — the same
 * rule `pageHref()` applies to the links, so the canonical and the pager cannot
 * disagree about what page one is called.
 *
 * Order is fixed rather than preserved, so two spellings of the same filter are
 * one canonical URL.
 */
const KEPT_PARAMS = ['q', 'subject', 'audience', 'band', 'lang', 'page'] as const;

export function canonicalCataloguePath(params: {
  q?: string;
  subject?: string;
  audience?: string;
  band?: string;
  /** A language code from the chip row. `all` is dropped like every other default. */
  lang?: string;
  page?: string;
}): string {
  const search = new URLSearchParams();

  for (const key of KEPT_PARAMS) {
    const value = params[key]?.trim() ?? '';
    if (value.length === 0 || value === 'all') continue;
    if (key === 'page' && (value === '1' || !/^[1-9]\d{0,14}$/.test(value))) continue;
    search.set(key, value);
  }

  const query = search.toString();
  return query.length > 0 ? `/catalogue?${query}` : '/catalogue';
}
