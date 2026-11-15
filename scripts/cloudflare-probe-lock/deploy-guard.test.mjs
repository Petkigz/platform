import assert from 'node:assert/strict';
import test from 'node:test';
import { workerName, previewConfig, validateConfig, assertAbsent, deploymentDiagnostic } from './deploy-guard.mjs';

test('worker names are unique to a GitHub run and attempt', () => {
  assert.equal(workerName('12345', '1'), 'ayahspring-test-12345-1');
  assert.notEqual(workerName('12345', '1'), workerName('12345', '2'));
  for (const value of ['', '0', '-1', '1/../../other', '1.0', '012', '1'.repeat(21)]) assert.throws(() => workerName(value, '1'));
  for (const value of ['', '0', '-1', '2/other']) assert.throws(() => workerName('12345', value));
});

test('preview configuration contains only the reviewed data-free bindings', () => {
  const name = workerName('12345', '1');
  const c = previewConfig(name);
  assert.doesNotThrow(() => validateConfig(c, name));
  assert.equal(c.assets.run_worker_first, true);
  for (const mutate of [
    (x) => { x.assets.run_worker_first = false; },
    (x) => { x.assets.html_handling = 'auto-trailing-slash'; },
    (x) => { x.assets.not_found_handling = 'single-page-application'; },
    (x) => { x.main = '.open-next/worker.js'; },
    (x) => { x.vars.NEXT_PUBLIC_SUPABASE_URL = 'https://real.example'; },
    (x) => { x.vars.SUPABASE_SERVICE_ROLE_KEY = 'anything'; },
    (x) => { x.routes = ['example.com/*']; },
    (x) => { x.services[0].service = 'different'; },
  ]) {
    const changed = structuredClone(c); mutate(changed);
    assert.throws(() => validateConfig(changed, name));
  }
});

test('only a clear not-found response permits first deployment', () => {
  assert.doesNotThrow(() => assertAbsent(404, { success: false, errors: [{ code: 10007 }] }));
  for (const [status, body] of [[200, {}], [403, { success: false, errors: [{ code: 10007 }] }], [404, {}], [404, { success: false, errors: [{ code: 999 }] }], [404, { success: false, errors: [{ code: 10007 }, { code: 42 }] }]]) assert.throws(() => assertAbsent(status, body));
});

test('deployment diagnostics emit only fixed categories and numeric error codes', () => {
  const privateText = 'secret-token-and-account-info';
  const result = deploymentDiagnostic(`\u001b[31mAuthentication error [code: 10000]\u001b[0m ${privateText} [code: 10000] [code: 42]`);
  assert.equal(result, 'Wrangler diagnostics: authentication; Cloudflare error codes: 10000, 42.');
  assert.equal(result.includes(privateText), false);
  assert.equal(deploymentDiagnostic(`unrecognized ${privateText} [code: ${privateText}]`), 'Wrangler diagnostics: no recognized category; Cloudflare error codes: none detected.');
  assert.match(deploymentDiagnostic('Workers.dev subdomain not registered'), /workers\.dev configuration/);
});
