import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { runWithWatchdog } from './db-suite-watchdog.mjs';

function capture() {
  let text = '';
  return { stream: new Writable({ write(chunk, _enc, callback) { text += chunk.toString(); callback(); } }), text: () => text };
}

test('passes a completed child and preserves its output', async () => {
  const output = capture(), errors = capture();
  const result = await runWithWatchdog({ args: ['-e', 'console.log("--- first ---"); console.log("done")'], timeoutMs: 5000, output: output.stream, errors: errors.stream });
  assert.equal(result, 0); assert.match(output.text(), /done/); assert.equal(errors.text(), '');
});

test('reports a failing child rather than claiming success', async () => {
  const output = capture(), errors = capture();
  const result = await runWithWatchdog({ args: ['-e', 'process.exit(7)'], timeoutMs: 5000, output: output.stream, errors: errors.stream });
  assert.equal(result, 1); assert.match(errors.text(), /exited 7/);
});

test('kills an unresponsive child and names the suite', async () => {
  const output = capture(), errors = capture();
  const result = await runWithWatchdog({ args: ['-e', 'console.log("--- synthetic suite ---"); console.log("@@db-query select test($1)"); setInterval(() => {}, 1000)'], timeoutMs: 300, output: output.stream, errors: errors.stream });
  assert.equal(result, 1); assert.match(errors.text(), /synthetic suite exceeded 300ms/);
  assert.match(errors.text(), /last query: select test\(\$1\)/);
});
