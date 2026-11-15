import assert from 'node:assert/strict';
import test from 'node:test';
import { guardedPreview } from './preview-gate.mjs';

const password = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // synthetic only
const auth = (value) => `Basic ${btoa(`preview:${value}`)}`;
function fixture(secret = password) {
  const seen = [];
  const app = { async fetch(req, env) { seen.push(['app', req.headers.get('authorization'), env.PREVIEW_PASSWORD, await req.text()]); return new Response('app', { headers: { 'cache-control': 'public, max-age=600' } }); } };
  const env = { PREVIEW_PASSWORD: secret, ASSETS: { async fetch(req) { seen.push(['asset', req.headers.get('authorization')]); return new URL(req.url).pathname === '/asset.js' ? new Response('asset') : new Response('missing', { status: 404 }); } } };
  return { worker: guardedPreview(app), env, seen };
}
function request(path, options = {}) { return new Request(`https://preview.invalid${path}`, options); }

test('missing or malformed secret fails closed even for assets', async () => {
  for (const secret of [undefined, '', 'short', 'x'.repeat(129), 'contains whitespace '.repeat(3)]) {
    const f = fixture(secret);
    if (secret === undefined) delete f.env.PREVIEW_PASSWORD;
    const r = await f.worker.fetch(request('/asset.js', { headers: { authorization: auth(password) } }), f.env, {});
    assert.equal(r.status, 503); assert.equal(f.seen.length, 0);
    assert.match(r.headers.get('cache-control'), /no-store/);
  }
});

test('absent, incorrect and malformed credentials never reach app or assets', async () => {
  for (const header of [null, auth('b'.repeat(44)), 'Bearer abc', 'Basic !!!', `Basic ${btoa(`admin:${password}`)}`, `Basic ${btoa('preview:short')}`]) {
    const f = fixture();
    const r = await f.worker.fetch(request('/asset.js', { headers: header ? { authorization: header } : {} }), f.env, {});
    assert.equal(r.status, 401); assert.match(r.headers.get('www-authenticate'), /^Basic /); assert.equal(f.seen.length, 0);
  }
});

test('correct credentials gate both assets and app, never forwarding password', async () => {
  const f = fixture();
  const asset = await f.worker.fetch(request('/asset.js', { headers: { authorization: auth(password) } }), f.env, {});
  assert.equal(await asset.text(), 'asset'); assert.equal(asset.headers.get('cache-control'), 'private, no-store');
  assert.equal(asset.headers.get('x-robots-tag'), 'noindex, nofollow'); assert.deepEqual(f.seen, [['asset', null]]);
  f.seen.length = 0;
  const page = await f.worker.fetch(request('/learn', { method: 'POST', body: 'example', headers: { authorization: auth(password) } }), f.env, {});
  assert.equal(await page.text(), 'app'); assert.equal(page.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(f.seen, [['app', null, undefined, 'example']]);
  f.seen.length = 0;
  await f.worker.fetch(request('/dynamic', { headers: { authorization: auth(password) } }), f.env, {});
  assert.deepEqual(f.seen, [['asset', null], ['app', null, undefined, '']]);
});
