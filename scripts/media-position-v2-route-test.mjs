// Test the retired route with synthetic NextResponse; no hosted PostgREST proof.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';
const bundle = await build({
  entryPoints: [resolve('web/src/app/api/learn/position-v2/route.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'next-response', setup(build) {
    build.onResolve({ filter: /^next\/server$/ }, () => ({ path: 'next', namespace: 'fake' }));
    build.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({ loader: 'js', contents:
      `export class NextResponse extends Response { static json(body, options) { return new Response(JSON.stringify(body), { ...options, headers: { 'content-type': 'application/json', ...options?.headers } }); } }` }));
  } }],
});
const route = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
for (const method of ['GET', 'POST']) {
  const response = await route[method]();
  assert.equal(response.status, 410); assert.match(response.headers.get('cache-control'), /no-store/);
  assert.match((await response.json()).error, /reload/i);
}
console.log('Lesson-wide v2 endpoint retirement simulation passed.');
