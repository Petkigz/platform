import { NOBODY, parseSession, type SessionSummary } from '@/lib/session';

/**
 * Who is signed in, asked once for each page that is loaded.
 *
 * The masthead asked `/api/session` by itself. The notice about changed
 * documents needs the same answer, and a second request for it on every
 * page would be paid by every visitor. So the question is asked once, and
 * whoever needs the answer waits for the same one.
 *
 * It lasts as long as the page: moving between pages inside the application
 * keeps the header that is already drawn, and a page loaded afresh asks
 * afresh, which is what happens after signing in or out.
 *
 * A request that fails, or an answer that is not one, is "nobody": the
 * header stays as the server drew it and the notice says nothing.
 */
let asked: Promise<SessionSummary> | null = null;

export function sessionOnce(): Promise<SessionSummary> {
  asked ??= (async () => {
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      if (!response.ok) return NOBODY;
      return parseSession(await response.json());
    } catch {
      return NOBODY;
    }
  })();
  return asked;
}
