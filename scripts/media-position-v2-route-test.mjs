// Exercise the actual route functions with synthetic Auth/RPC dependencies.
// Not a hosted PostgREST, RLS, Next HTTP or concurrent database test.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';

const bundle = await build({
  entryPoints: [resolve('web/src/app/api/learn/position-v2/route.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'synthetic-dependencies', setup(build) {
    build.onResolve({ filter: /^(next\/server|@\/lib\/env|@\/lib\/supabase\/server)$/ }, (args) => ({ path: args.path, namespace: 'fake' }));
    build.onLoad({ filter: /.*/, namespace: 'fake' }, (args) => ({ loader: 'js', contents:
      args.path === 'next/server' ? `export class NextResponse extends Response { static json(body, options) { return new Response(JSON.stringify(body), { ...options, headers: { 'content-type': 'application/json', ...options?.headers } }); } }` :
      args.path === '@/lib/env' ? `export const isSupabaseConfigured = () => globalThis.fixture.configured;` :
      `export const createClient = async () => ({ auth: { getUser: async () => ({ data: { user: globalThis.fixture.user } }) }, rpc: async (name, args) => globalThis.fixture.rpc(name, args) });` }));
  } }],
});
const route = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const enrolmentId = '00000000-0000-4000-8000-000000000001';
const lessonId = '00000000-0000-4000-8000-000000000002';
const actorId = '00000000-0000-4000-8000-000000000003';
const revision1 = '00000000-0000-4000-8000-000000000004';
const revision2 = '00000000-0000-4000-8000-000000000005';
const url = `https://example.test/api/learn/position-v2?enrolmentId=${enrolmentId}&lessonId=${lessonId}`;
const request = (body) => new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const body = { enrolmentId, lessonId, actorId, seconds: 30, revision: revision1 };
let calls = [];
globalThis.fixture = { configured: true, user: { id: actorId }, rpc: async (name, args) => { calls.push({ name, args }); return { data: { seconds: 10, revision: revision1 }, error: null }; } };
let response = await route.GET(new Request(url));
assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/);
assert.deepEqual(await response.json(), { ok: true, seconds: 10, revision: revision1, actorId });
assert.deepEqual(calls[0], { name: 'resume_position_snapshot', args: { p_enrolment_id: enrolmentId, p_lesson_id: lessonId } });
response = await route.POST(request({ ...body, revision: undefined })); assert.equal(response.status, 400);
response = await route.POST(request({ ...body, seconds: -1 })); assert.equal(response.status, 400);
response = await route.GET(new Request('https://example.test/?enrolmentId=bad&lessonId=bad')); assert.equal(response.status, 400);
fixture.user = null; response = await route.GET(new Request(url)); assert.equal(response.status, 401); fixture.user = { id: revision1 };
response = await route.POST(request(body)); assert.equal(response.status, 403); assert.equal(calls.length, 1);
fixture.user = { id: actorId };
fixture.rpc = async (name, args) => { calls.push({ name, args }); return { data: { ok: true, seconds: 30, revision: revision2 }, error: null }; };
response = await route.POST(request(body)); assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { ok: true, seconds: 30, revision: revision2 });
assert.deepEqual(calls.at(-1), { name: 'compare_record_lesson_position', args: { p_enrolment_id: enrolmentId, p_lesson_id: lessonId, p_seconds: 30, p_revision: revision1 } });
fixture.rpc = async () => ({ data: { ok: false, seconds: 65, revision: revision2 }, error: null });
response = await route.POST(request(body)); assert.equal(response.status, 409);
assert.deepEqual(await response.json(), { ok: false, seconds: 65, revision: revision2 });
fixture.rpc = async () => ({ data: { ok: true, seconds: 65, revision: revision2 }, error: null });
response = await route.POST(request(body)); assert.equal(response.status, 503);
fixture.rpc = async () => ({ data: null, error: { message: 'that is not your learning' } });
response = await route.POST(request(body)); assert.equal(response.status, 403);
fixture.rpc = async () => ({ data: null, error: { message: 'unexpected sensitive backend detail' } });
response = await route.GET(new Request(url)); assert.equal(response.status, 503);
assert.ok(!(await response.text()).includes('sensitive backend detail'));
fixture.configured = false; response = await route.GET(new Request(url)); assert.equal(response.status, 503);
delete globalThis.fixture;
console.log('Conflict-aware resume route simulation passed (synthetic Auth and RPC).');
