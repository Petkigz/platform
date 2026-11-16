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

test('allows an active suite to exceed the inactivity timeout', async () => {
  const output = capture(), errors = capture();
  const script = `console.log('--- active suite ---'); let n = 0;
    const timer = setInterval(() => { console.log('@@db-query select $1');
      if (++n === 6) { clearInterval(timer); } }, 100);`;
  const result = await runWithWatchdog({ args: ['-e', script], timeoutMs: 400, output: output.stream, errors: errors.stream });
  assert.equal(result, 0); assert.equal(errors.text(), '');
});

test('reports the current suite when the overall deadline expires despite activity', async () => {
  const output = capture(), errors = capture();
  const script = `console.log('--- lengthy suite ---');
    setInterval(() => console.log('@@db-query select $1'), 50);`;
  const result = await runWithWatchdog({ args: ['-e', script], timeoutMs: 500, overallTimeoutMs: 300, output: output.stream, errors: errors.stream });
  assert.equal(result, 1);
  assert.match(errors.text(), /Database suite overall deadline/);
  assert.match(errors.text(), /lengthy suite was running when the 300ms overall deadline was reached/);
  assert.match(errors.text(), /last query: select \$1/);
});

test('kills an unresponsive child and names the suite', async () => {
  const output = capture(), errors = capture();
  const result = await runWithWatchdog({ args: ['-e', 'console.log("--- synthetic suite ---"); console.log("@@db-query select test($1)"); setInterval(() => {}, 1000)'], timeoutMs: 300, output: output.stream, errors: errors.stream });
  assert.equal(result, 1); assert.match(errors.text(), /synthetic suite made no traced query or suite progress for 300ms/);
  assert.match(errors.text(), /last query: select test\(\$1\)/);
});
