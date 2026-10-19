/** Accept only same-origin app paths for post-auth redirects. */
export function safeNextPath(candidate: string | null | undefined, fallback = '/learn'): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  try {
    const base = new URL('https://ayahspring.invalid');
    const destination = new URL(candidate, base);
    if (destination.origin !== base.origin) return fallback;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}
