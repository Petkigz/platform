// Actual route functions with synthetic dependencies, not a hosted HTTP/RLS test.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';

async function load(path) {
  const result = await build({ entryPoints: [resolve(path)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
    plugins: [{ name: 'mock', setup(build) {
      build.onResolve({ filter: /^(next\/server|@\/lib\/(env|progress|supabase\/server))$/ }, (args) => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ loader: 'js', contents:
        args.path === 'next/server' ? `export class NextResponse extends Response { static json(body, opts) { return new Response(JSON.stringify(body), { ...opts, headers: { 'content-type': 'application/json', ...opts?.headers } }); } }` :
        args.path === '@/lib/env' ? 'export const isSupabaseConfigured = () => true;' :
        args.path === '@/lib/progress' ? 'export const recordLessonProgress = async (_, args) => { globalThis.calls.push(args); return {ok:true,status:args.status}; };' :
        `export const createClient = async () => ({auth:{getUser: async () => ({data: {user: {id: 'learner'}}})}});` }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const old = await load('web/src/app/api/learn/position/route.ts');
const progress = await load('web/src/app/api/progress/route.ts');
const headers = { 'content-type': 'application/json' };
const post = (body) => new Request('https://example.test/api/progress', { method: 'POST', headers, body: JSON.stringify(body) });
const id = '00000000-0000-4000-8000-000000000001';
const valid = { enrolmentId: id, lessonId: id, status: 'completed' };
globalThis.calls = [];
const obsolete = await old.POST(); assert.equal(obsolete.status, 410); assert.match(obsolete.headers.get('cache-control'), /no-store/);
let response = await progress.POST(post({ ...valid, videoPosition: 42 })); assert.equal(response.status, 409); assert.equal(calls.length, 0);
response = await progress.POST(post({ ...valid, videoPosition: null })); assert.equal(response.status, 409); assert.equal(calls.length, 0);
response = await progress.POST(post(null)); assert.equal(response.status, 400);
response = await progress.POST(post(valid)); assert.equal(response.status, 200);
assert.deepEqual(calls, [{ userId: 'learner', enrolmentId: id, lessonId: id, status: 'completed' }]);
delete globalThis.calls;
console.log('Legacy resume endpoints refuse unversioned positions; status-only progress remains available (simulated dependencies).');
