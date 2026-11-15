// First deployment of a uniquely named, data-free test Worker only.
// No automatic retries, updates, cleanup, or real application credentials.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function workerName(runId, attempt) {
  if (!/^[1-9][0-9]{0,19}$/.test(runId ?? '') || !/^[1-9][0-9]{0,4}$/.test(attempt ?? '')) throw new Error('Invalid GitHub run identifier');
  return `ayahspring-test-${runId}-${attempt}`;
}

export function previewConfig(name) {
  return {
    name, main: 'preview-worker.mjs', compatibility_date: '2026-10-15',
    compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
    workers_dev: true,
    assets: { directory: '.open-next/assets', binding: 'ASSETS', run_worker_first: true, html_handling: 'none', not_found_handling: 'none' },
    services: [{ binding: 'WORKER_SELF_REFERENCE', service: name }],
    images: { binding: 'IMAGES' },
    vars: { NEXT_PUBLIC_ALLOW_MISSING_SUPABASE: '1', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
  };
}

export function validateConfig(config, name) {
  if (JSON.stringify(config) !== JSON.stringify(previewConfig(name))) throw new Error('Preview configuration differs from reviewed data-free configuration');
}

export function assertAbsent(status, data) {
  if (status !== 404 || data?.success !== false || !Array.isArray(data.errors) || data.errors.length !== 1 || data.errors[0]?.code !== 10007) {
    throw new Error('Worker absence could not be established; stop and inspect the account');
  }
}

// Never print Wrangler's raw output: it can contain account details or secrets.
// Report only fixed descriptions and numeric Cloudflare error codes.
export function deploymentDiagnostic(logs) {
  const clean = logs.replace(/\x1b\[[0-9;]*m/g, '');
  const codes = [...new Set([...clean.matchAll(/\[code:\s*(\d{1,8})\]/gi)].map((m) => m[1]))].slice(0, 10);
  const categories = [];
  if (/authentication error|unable to authenticate|invalid api token/i.test(clean)) categories.push('authentication');
  if (/not authorized|permission denied|insufficient permissions|unauthorized/i.test(clean)) categories.push('permissions');
  if (/workers\.dev.*(?:subdomain|register)|(?:subdomain|register).*workers\.dev/i.test(clean)) categories.push('workers.dev configuration');
  if (/exceeded.*(?:limit|quota)|(?:limit|quota).*exceeded/i.test(clean)) categories.push('limit or quota');
  if (/could not resolve|network error|fetch failed|timed? out/i.test(clean)) categories.push('network');
  return `Wrangler diagnostics: ${categories.length ? categories.join(', ') : 'no recognized category'}; Cloudflare error codes: ${codes.length ? codes.join(', ') : 'none detected'}.`;
}

async function run() {
  const e = process.env;
  if (e.GITHUB_REPOSITORY !== 'Petkigz/platform' || e.GITHUB_REF !== 'refs/heads/arena/4f30fd1d-platform' || e.GITHUB_EVENT_NAME !== 'push' || e.CF_PREVIEW_READY !== 'free-data-free') throw new Error('Preview authorization or target is not configured');
  const event = JSON.parse(await readFile(e.GITHUB_EVENT_PATH, 'utf8'));
  if (!event.head_commit?.message?.startsWith('test: publish guarded datafree preview')) throw new Error('Not the reviewed preview trigger');
  const name = workerName(e.GITHUB_RUN_ID, e.GITHUB_RUN_ATTEMPT);
  const account = e.CF_PREVIEW_ACCOUNT_ID;
  const token = e.CF_PREVIEW_API_TOKEN;
  if (!/^[a-f0-9]{32}$/i.test(account ?? '') || !token || token.length < 20 || /\s/.test(token)) throw new Error('Cloudflare account or token configuration is invalid');
  validateConfig(JSON.parse(await readFile('web/wrangler.jsonc', 'utf8')), name);
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${name}`;
  const result = await fetch(endpoint, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
  let payload;
  try { payload = await result.json(); } catch { throw new Error('Cloudflare preflight response was not valid JSON'); }
  assertAbsent(result.status, payload);
  console.log(`Unique preview target ${name} was absent at preflight; concurrent external writes are still possible.`);
  const env = { PATH: e.PATH, HOME: e.HOME, TMPDIR: e.TMPDIR, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token };
  const cli = spawn('../node_modules/.bin/wrangler', ['deploy', '--keep-vars'], { cwd: 'web', env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  for (const stream of [cli.stdout, cli.stderr]) stream.on('data', (chunk) => { logs = (logs + chunk.toString()).slice(-100000); });
  const code = await new Promise((resolve, reject) => { cli.once('error', reject); cli.once('exit', resolve); });
  if (code !== 0) {
    console.error(deploymentDiagnostic(logs));
    throw new Error('Cloudflare deploy did not report success. Outcome may be partial or uncertain; inspect the dashboard before any retry.');
  }
  const url = logs.match(new RegExp(`https://${name}\\.[a-z0-9-]+\\.workers\\.dev(?=[/\\s]|$)`, 'i'))?.[0];
  console.log(`Cloudflare CLI reported success for ${name}. Preview stays closed until PREVIEW_PASSWORD is set privately in Cloudflare.`);
  if (url) console.log(`Reported preview URL: ${url}`);
  else console.log('A workers.dev URL was not confirmed in CLI output; inspect the Cloudflare dashboard.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => { console.error(`Preview deploy stopped: ${error instanceof Error ? error.message : 'unexpected error'}`); process.exitCode = 1; });
}
