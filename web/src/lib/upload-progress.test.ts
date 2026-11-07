import assert from 'node:assert/strict';
import test from 'node:test';
import { putWithProgress } from './upload-progress.ts';

test('a refused create-only retry is uncertain and preserves the signed headers', async () => {
  const previous = globalThis.XMLHttpRequest;
  const sent: Record<string, string> = {};
  class StubRequest {
    status = 412;
    upload = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    ontimeout: (() => void) | null = null;
    open(method: string) { assert.equal(method, 'PUT'); }
    setRequestHeader(name: string, value: string) { sent[name] = value; }
    send() { this.onload?.(); }
  }
  try {
    globalThis.XMLHttpRequest = StubRequest as unknown as typeof XMLHttpRequest;
    await assert.rejects(putWithProgress('https://storage.test', { 'content-type': 'image/jpeg', 'if-none-match': '*' }, new Blob(['x']), () => {}), /may already exist/);
    assert.equal(sent['if-none-match'], '*');
  } finally { globalThis.XMLHttpRequest = previous; }
});
