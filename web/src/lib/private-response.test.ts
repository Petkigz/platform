import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { privateNoStore } from './private-response.ts';

test('private response cache policy replaces conflicting cache headers without changing status or other headers', () => {
  const response = new Response('pending', { status: 409, headers: { 'cache-control': 'public, max-age=600', 'x-test': 'kept' } });
  assert.equal(privateNoStore(response), response);
  assert.equal(response.status, 409);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-test'), 'kept');
});

test('media upload successes and failures share the private response wrapper', () => {
  const route = readFileSync(new URL('../app/api/media/route.ts', import.meta.url), 'utf8');
  assert.match(route, /privateNoStore\(NextResponse\.json\(body, init\)\)/);
  assert.equal((route.match(/NextResponse\.json\(/g) ?? []).length, 1);
  assert.match(route, /const fail = .*privateJson/);
  assert.match(route, /return privateJson/);
  const open = readFileSync(new URL('../app/api/media/open/route.ts', import.meta.url), 'utf8');
  assert.match(open, /privateNoStore\(new NextResponse\(message, \{ status \}\)\)/);
  assert.match(open, /privateNoStore\(NextResponse\.redirect/);
});


test('assignment API successes and failures use the private response wrapper', () => {
  const route = readFileSync(new URL('../app/api/assignments/route.ts', import.meta.url), 'utf8');
  assert.match(route, /privateNoStore\(NextResponse\.json\(body, init\)\)/);
  assert.equal((route.match(/NextResponse\.json\(/g) ?? []).length, 1);
  assert.match(route, /privateJson\(\{ ok: false, message \}/);
  assert.match(route, /privateJson\(\{ ok: true, files: data \}\)/);
  assert.match(route, /\? privateJson\(result\)/);
});
