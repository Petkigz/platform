#!/usr/bin/env node
// The scheduler: the clock that calls the application's unattended routes.
//
// The application has four routes that do work nobody is signed in for:
// sending queued email, the owner's alert, the safeguarding alert, and the
// retention cleanup. Each is a POST with `Authorization: Bearer <CRON_SECRET>`.
// Nothing calls them unless something outside the application keeps time.
// This is that something, small enough to run anywhere `node` runs: a GitHub
// Actions schedule (.github/workflows/scheduler.yml), a server's crontab, or
// by hand.
//
//   AYAHSPRING_SITE_URL=https://… CRON_SECRET=… node scripts/scheduler-run.mjs dispatch-messages owner-alert
//
// It says, for each route, the HTTP status and one fixed word. It never
// prints the secret, and never prints what a route answered: this repository
// is public, and so are the logs of its workflows.
//
// What ends the run in failure, and what does not:
//   - 2xx: done.
//   - 503: the deployment says that route is not set up yet (no email key, no
//     worker account). That is a state to finish setting up, not a failure of
//     the clock, so the run still ends 0, with a notice.
//   - 401: the secret here is not the deployment's. Exit 1.
//   - anything else, or no answer: exit 1.
import { pathToFileURL } from 'node:url';

export const ROUTES = ['dispatch-messages', 'owner-alert', 'safeguarding-alert', 'retention'];
const TIMEOUT_MS = 60_000;

/** The origin to call, or a sentence saying why it will not be called. */
export function siteOrigin(value, { allowLocal = false } = {}) {
  const text = (value ?? '').trim();
  if (!text) return { error: 'AYAHSPRING_SITE_URL is not set: there is no deployment to call yet.' };
  let url;
  try {
    url = new URL(text);
  } catch {
    return { error: 'AYAHSPRING_SITE_URL is not an address.' };
  }
  const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  if (url.protocol !== 'https:' && !(allowLocal && local && url.protocol === 'http:')) {
    return { error: 'AYAHSPRING_SITE_URL must begin with https://, so the secret is not sent in the clear.' };
  }
  if (url.username || url.password) return { error: 'AYAHSPRING_SITE_URL must not carry a user name or password.' };
  return { origin: url.origin };
}

export function judge(status) {
  if (status >= 200 && status < 300) return { word: 'done', failed: false };
  if (status === 503) return { word: 'not set up yet on the deployment', failed: false };
  if (status === 401) return { word: 'refused: CRON_SECRET here is not the deployment\'s', failed: true };
  if (status === 404) return { word: 'no such route on this deployment (an older build?)', failed: true };
  return { word: 'failed', failed: true };
}

/**
 * Calls each named route once, in order. Returns the lines to print and the
 * exit code. `fetchImpl` and `allowLocal` exist for the test.
 */
export async function run({ env, names, fetchImpl = fetch, allowLocal = false, timeoutMs = TIMEOUT_MS }) {
  const lines = [];
  const unknown = names.filter((name) => !ROUTES.includes(name));
  if (names.length === 0 || unknown.length > 0) {
    lines.push(names.length === 0 ? 'Name at least one route.' : `Not a scheduler route: ${unknown.join(', ')}.`);
    lines.push(`The routes are: ${ROUTES.join(', ')}.`);
    return { lines, code: 2 };
  }
  const site = siteOrigin(env.AYAHSPRING_SITE_URL, { allowLocal });
  if (site.error) return { lines: [site.error], code: 1 };
  const secret = (env.CRON_SECRET ?? '').trim();
  if (secret.length < 16) {
    return { lines: ['CRON_SECRET is not set (or is shorter than 16 characters). Nothing was called.'], code: 1 };
  }
  let code = 0;
  for (const name of names) {
    let status = 0;
    try {
      const response = await fetchImpl(`${site.origin}/api/cron/${name}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}` },
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      });
      status = response.status;
      // The body is drained and not read: what a route did is the staff pages' to say.
      await response.arrayBuffer().catch(() => undefined);
    } catch {
      lines.push(`${name}: no answer`);
      code = 1;
      continue;
    }
    const verdict = judge(status);
    lines.push(`${name}: ${status} ${verdict.word}`);
    if (verdict.failed) code = 1;
  }
  return { lines, code };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = await run({ env: process.env, names: process.argv.slice(2) });
  for (const line of result.lines) console.log(line);
  process.exit(result.code);
}
