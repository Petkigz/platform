import assert from 'node:assert/strict';
import test from 'node:test';
import { safeNextPath } from './auth.ts';

test('safeNextPath preserves a relative in-app destination', () => {
  assert.equal(safeNextPath('/learn/course?from=sign-in#lesson'), '/learn/course?from=sign-in#lesson');
});

test('safeNextPath rejects external, protocol-relative and malformed destinations', () => {
  for (const value of ['https://evil.example', '//evil.example/path', '/\\evil.example/path', 'javascript:alert(1)', '', null, undefined]) {
    assert.equal(safeNextPath(value), '/learn');
  }
});
