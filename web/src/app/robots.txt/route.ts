import { robotsTxt } from '@/lib/crawl';
import { siteOrigin } from '@/lib/site';

/**
 * `/robots.txt`.
 *
 * A route handler rather than Next's `robots.ts` convention, for one reason:
 * the rules live in `lib/crawl.ts`, `robotsTxt()` renders them, and the tests
 * assert on the text a crawler would actually receive. Using the typed
 * convention would mean writing the same list a second time as data and
 * trusting the two to agree.
 *
 * `no-store`, because the sitemap line depends on configuration: a deployment
 * that was built before `NEXT_PUBLIC_SITE_URL` was set must not keep serving a
 * robots file that points nowhere.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const origin = siteOrigin();
  const body = robotsTxt(origin ? `${origin}/sitemap.xml` : null);

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
