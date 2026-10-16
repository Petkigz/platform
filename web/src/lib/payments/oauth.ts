/**
 * Bearer tokens with expiry.
 *
 * Both MTN MoMo and Airtel Money authenticate the same way at the shape level —
 * POST credentials, get a short-lived access token, send it as a Bearer header —
 * and differ in the details (MTN uses HTTP Basic plus a subscription-key header,
 * Airtel sends client credentials in a JSON body). Caching is identical, so it
 * lives here and each adapter supplies only its own fetch.
 *
 * Two details that matter in production:
 *
 *   * Tokens are cached per credential set, not per request. Without this every
 *     checkout call costs a round trip to the auth endpoint, and MTN rate-limits
 *     it.
 *   * The refresh happens 60s early. A token that expires mid-request produces a
 *     401 on the payment call, and the payer sees a failure for a payment that
 *     was never attempted.
 */

type Cached = { token: string; expiresAt: number };

const REFRESH_MARGIN_MS = 60_000;

const cache = new Map<string, Cached>();

export type TokenFetch = () => Promise<{
  accessToken: string;
  /** Seconds, as the providers report it. */
  expiresIn: number;
}>;

/**
 * A valid token, fetching or reusing one as needed.
 *
 * `key` must identify the credential set — not just the provider — so a sandbox
 * and a production token for the same provider can never be served to each
 * other. That mix-up produces 401s that look like a configuration error and are
 * not.
 *
 * A failed fetch is not cached. Otherwise one transient auth failure would pin
 * the provider down until the negative entry expired, which is worse than
 * retrying.
 */
export async function accessToken(key: string, fetchToken: TokenFetch): Promise<string> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt - REFRESH_MARGIN_MS > now) return hit.token;

  const { accessToken: token, expiresIn } = await fetchToken();
  cache.set(key, {
    token,
    // A provider that omits expiry gets a short default rather than being
    // cached forever, which would eventually serve a dead token.
    expiresAt: now + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 300) * 1000,
  });
  return token;
}

/** Drop a cached token, e.g. after a 401 so the next call re-authenticates. */
export function invalidateToken(key: string): void {
  cache.delete(key);
}

/** Test hook: clears every cached token. */
export function clearTokenCache(): void {
  cache.clear();
}

/**
 * Read a JSON body from a provider response, tolerating the empty and
 * non-JSON bodies these APIs actually return.
 *
 * MTN answers 202 Accepted with no body at all, and both providers return HTML
 * error pages from their gateways when something is wrong upstream. Letting
 * `.json()` throw on those turns a legible provider error into an opaque parse
 * failure at the exact moment someone is trying to debug a payment.
 */
export async function readJson(body: { text(): Promise<string> }): Promise<unknown> {
  const text = await body.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { _unparsed: text.slice(0, 500) };
  }
}
