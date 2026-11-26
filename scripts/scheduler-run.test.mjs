// The scheduler against a stand-in deployment: what it sends, what it prints,
// and what ends a run in failure.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { judge, ROUTES, run, siteOrigin } from './scheduler-run.mjs';

const SECRET = 'a-scheduler-secret-of-enough-length';

async function standIn(answers) {
  const seen = [];
  const server = createServer((req, res) => {
    seen.push({ method: req.method, url: req.url, authorization: req.headers.authorization });
    const name = req.url.split('/').pop();
    const status = answers[name] ?? 404;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: status === 200, sent: 3, to: 'somebody@example.com' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { seen, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

test('each named route is called once, in order, by POST with the secret', async () => {
  const site = await standIn({ 'dispatch-messages': 200, 'owner-alert': 200, 'safeguarding-alert': 200, retention: 200 });
  try {
    const result = await run({ env: { AYAHSPRING_SITE_URL: site.url + '/some/page?x=1', CRON_SECRET: ` ${SECRET} ` }, names: ['dispatch-messages', 'owner-alert'], allowLocal: true });
    assert.equal(result.code, 0);
    assert.deepEqual(result.lines, ['dispatch-messages: 200 done', 'owner-alert: 200 done']);
    assert.deepEqual(site.seen, [
      { method: 'POST', url: '/api/cron/dispatch-messages', authorization: `Bearer ${SECRET}` },
      { method: 'POST', url: '/api/cron/owner-alert', authorization: `Bearer ${SECRET}` },
    ]);
  } finally { await site.close(); }
});

test('nothing a route answers, and no secret, is printed', async () => {
  const site = await standIn({ 'dispatch-messages': 200, retention: 500 });
  try {
    const result = await run({ env: { AYAHSPRING_SITE_URL: site.url, CRON_SECRET: SECRET }, names: ['dispatch-messages', 'retention'], allowLocal: true });
    const printed = result.lines.join('\n');
    assert.ok(!printed.includes(SECRET) && !printed.includes('somebody@example.com') && !printed.includes('"sent"'), printed);
    assert.equal(result.code, 1);
    assert.deepEqual(result.lines, ['dispatch-messages: 200 done', 'retention: 500 failed']);
  } finally { await site.close(); }
});

test('a route that is not set up yet does not fail the clock; a wrong secret, a missing route or no answer does', async () => {
  const site = await standIn({ 'dispatch-messages': 503, 'owner-alert': 401, 'safeguarding-alert': 200 });
  try {
    const env = { AYAHSPRING_SITE_URL: site.url, CRON_SECRET: SECRET };
    const waiting = await run({ env, names: ['dispatch-messages', 'safeguarding-alert'], allowLocal: true });
    assert.equal(waiting.code, 0);
    assert.deepEqual(waiting.lines, ['dispatch-messages: 503 not set up yet on the deployment', 'safeguarding-alert: 200 done']);
    const refused = await run({ env, names: ['owner-alert', 'safeguarding-alert'], allowLocal: true });
    assert.equal(refused.code, 1);
    // The route after a failed one is still called.
    assert.deepEqual(refused.lines, ["owner-alert: 401 refused: CRON_SECRET here is not the deployment's", 'safeguarding-alert: 200 done']);
    const missing = await run({ env, names: ['retention'], allowLocal: true });
    assert.equal(missing.code, 1);
    assert.match(missing.lines[0], /^retention: 404 no such route/);
  } finally { await site.close(); }
  const gone = await run({ env: { AYAHSPRING_SITE_URL: site.url, CRON_SECRET: SECRET }, names: ['retention'], allowLocal: true });
  assert.deepEqual(gone, { lines: ['retention: no answer'], code: 1 });
});

test('nothing is called without a site, over plain http, without a secret, or for a name that is not a route', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return new Response('{}'); };
  const cases = [
    [{ CRON_SECRET: SECRET }, ['retention'], 1, /AYAHSPRING_SITE_URL is not set/],
    [{ AYAHSPRING_SITE_URL: 'not an address', CRON_SECRET: SECRET }, ['retention'], 1, /not an address/],
    [{ AYAHSPRING_SITE_URL: 'http://ayahspring.example', CRON_SECRET: SECRET }, ['retention'], 1, /must begin with https/],
    [{ AYAHSPRING_SITE_URL: 'http://127.0.0.1:9', CRON_SECRET: SECRET }, ['retention'], 1, /must begin with https/],
    [{ AYAHSPRING_SITE_URL: 'https://user:pw@ayahspring.example', CRON_SECRET: SECRET }, ['retention'], 1, /user name or password/],
    [{ AYAHSPRING_SITE_URL: 'https://ayahspring.example' }, ['retention'], 1, /CRON_SECRET is not set/],
    [{ AYAHSPRING_SITE_URL: 'https://ayahspring.example', CRON_SECRET: 'short' }, ['retention'], 1, /CRON_SECRET is not set/],
    [{ AYAHSPRING_SITE_URL: 'https://ayahspring.example', CRON_SECRET: SECRET }, [], 2, /Name at least one route/],
    [{ AYAHSPRING_SITE_URL: 'https://ayahspring.example', CRON_SECRET: SECRET }, ['retention', '../payments/webhook'], 2, /Not a scheduler route/],
  ];
  for (const [env, names, code, words] of cases) {
    const result = await run({ env, names, fetchImpl });
    assert.equal(result.code, code, JSON.stringify(env));
    assert.match(result.lines.join(' '), words);
    assert.ok(!result.lines.join(' ').includes(SECRET));
  }
  assert.equal(calls, 0);
  assert.deepEqual(siteOrigin('https://ayahspring.example/path'), { origin: 'https://ayahspring.example' });
  assert.equal(judge(204).failed, false);
});

test('the routes named here are the routes the application has, and the workflow calls only those', () => {
  for (const name of ROUTES) {
    const route = readFileSync(new URL(`../web/src/app/api/cron/${name}/route.ts`, import.meta.url), 'utf8');
    assert.match(route, /export async function POST\(/, name);
    assert.match(route, /checkScheduler\(/, name);
  }
  const workflow = readFileSync(new URL('../.github/workflows/scheduler.yml', import.meta.url), 'utf8');
  const called = [...workflow.matchAll(/scheduler-run\.mjs ([a-z\- ]+)$/gm)].flatMap((m) => m[1].trim().split(/\s+/));
  assert.deepEqual([...new Set(called)].sort(), [...ROUTES].sort());
  // It does nothing until the owner names a deployment, and may only read the repository.
  assert.match(workflow, /if: \$\{\{ vars\.AYAHSPRING_SITE_URL != '' \}\}/);
  assert.match(workflow, /^permissions:\n  contents: read\njobs:|^permissions:\n  contents: read\nconcurrency:/m);
  assert.doesNotMatch(workflow, /: write/);
  assert.match(workflow, /CRON_SECRET: \$\{\{ secrets\.CRON_SECRET \}\}/);
  assert.doesNotMatch(workflow, /SERVICE_ROLE|RESEND_API_KEY|SUPABASE/);
});
