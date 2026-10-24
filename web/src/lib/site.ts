/**
 * The address this deployment answers on, when it has been told.
 *
 * A printed certificate has to say where to check it. The browser's `Host`
 * header cannot be trusted for that: it is attacker-controlled on any request,
 * and putting an attacker's host on a downloadable PDF is how a verification
 * page becomes a phishing page. So the origin comes from configuration, and
 * when configuration is absent the certificate prints the path only — which is
 * still exact for anybody who received the certificate from the holder and is
 * therefore already on the site.
 *
 * `NEXT_PUBLIC_SITE_URL` is public by design: it is the address people type.
 */

/** An http(s) origin with no trailing slash, or null. */
export function siteOrigin(value: unknown = process.env.NEXT_PUBLIC_SITE_URL): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed.length === 0) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  // An origin carries no path, no query and no fragment; anything else is not
  // what this variable means and would print a second, confusing address.
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') return null;

  return url.origin;
}

/**
 * How a certificate tells a reader where to check it.
 *
 * With a configured origin it is a complete address; without one it is the
 * path, which is never wrong and never invents a domain.
 */
export function verificationAddress(certificateNumber: string): string {
  const path = `/verify/${encodeURIComponent(certificateNumber)}`;
  const origin = siteOrigin();
  return origin ? `${origin}${path}` : path;
}
