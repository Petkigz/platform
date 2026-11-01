import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * "Is this a scheduler, or a stranger?"
 *
 * There is no browser in the paths that call this — a mail dispatch, a retention
 * run — so there is no session to read. The one credential is a shared secret
 * compared in constant time, which is the same thing as saying the comparison
 * must not leak how much of the token was right.
 *
 * Two refusals, and they are different on purpose:
 *
 * - **503 when no secret is configured.** A deployment without `CRON_SECRET` has
 *   not set a scheduler up, and answering 401 would send whoever is debugging it
 *   looking for a wrong token that does not exist.
 * - **401 when the token is wrong.** Something is calling a route it does not
 *   hold the key to, and that is a different problem from being unconfigured.
 *
 * Kept apart from both routes so the answer cannot drift between them: two copies
 * of a security check is two chances to get the second one slightly wrong.
 */
export type SchedulerRefusal = {
  ok: false;
  status: 401 | 503;
  body: { error: string; code: string };
};

export type SchedulerAcceptance = { ok: true };

export const NO_SECRET_MESSAGE =
  'CRON_SECRET is not set, so this route cannot tell a scheduler from a '
  + 'stranger. Set it, then call this URL from your scheduler with '
  + '`Authorization: Bearer <secret>`.';

export function checkScheduler(
  authorizationHeader: string | null | undefined,
  secret: string | undefined,
): SchedulerAcceptance | SchedulerRefusal {
  const expected = (secret ?? '').trim();
  if (expected === '') {
    return { ok: false, status: 503, body: { error: NO_SECRET_MESSAGE, code: 'no_secret' } };
  }

  const presented = (authorizationHeader ?? '').replace(/^\s*Bearer\s+/i, '').trim();
  const digest = (value: string) => createHash('sha256').update(value).digest();

  // Hashing first makes the comparison fixed-length whatever was sent, so the
  // time taken does not tell a caller how long the real secret is.
  if (presented === '' || !timingSafeEqual(digest(presented), digest(expected))) {
    return {
      ok: false,
      status: 401,
      body: { error: 'Not permitted.', code: 'bad_secret' },
    };
  }

  return { ok: true };
}
