// Simulated DOM test of the real progress control. Network responses and the
// router are synthetic; this does not test database concurrency or RLS.
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = await build({
  stdin: { contents: `import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MarkComplete } from './web/src/app/learn/[enrolmentId]/mark-complete';
    const root = createRoot(document.getElementById('root'));
    window.renderControl = (key, done) => root.render(<MarkComplete key={key} enrolmentId="enrolment" lessonId="lesson" initiallyDone={done}/>);`,
    resolveDir: root, loader: 'jsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', logLevel: 'silent',
  plugins: [{ name: 'router-stub', setup(build) {
    build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'router', namespace: 'test-router' }));
    build.onLoad({ filter: /.*/, namespace: 'test-router' }, () => ({ contents: 'export const useRouter = () => ({ refresh: () => { window.refreshes++; } });', loader: 'js' }));
  } }],
});
const virtualConsole = new VirtualConsole(); const errors = [];
virtualConsole.on('jsdomError', (error) => errors.push(error));
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
const waitFor = async (predicate, description) => {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) { if (predicate()) return; await new Promise((r) => setTimeout(r, 10)); }
  throw new Error(`Timed out: ${description}`);
};
try {
  const { window } = dom; window.refreshes = 0; window.eval(bundle.outputFiles[0].text);
  const buttons = () => [...window.document.querySelectorAll('button')];
  const button = (text) => buttons().find((b) => b.textContent === text);
  let requests = []; let complete;
  window.fetch = (url, options) => { requests.push({ url, options }); return new Promise((resolve, reject) => { complete = { resolve, reject }; }); };
  window.renderControl('failure', false);
  await waitFor(() => button('Mark complete'), 'initial button');
  button('Mark complete').click();
  await waitFor(() => button('Saving…'), 'saving state');
  assert.equal(button('Saving…').disabled, true);
  button('Saving…').click();
  assert.equal(requests.length, 1);
  assert.equal(JSON.parse(requests[0].options.body).status, 'completed');
  complete.reject(new Error('connection lost'));
  await waitFor(() => window.document.querySelector('[role="alert"]'), 'uncertain outcome warning');
  assert.match(window.document.querySelector('[role="alert"]').textContent, /Could not confirm/);
  assert.equal(button('Mark complete').disabled, true);
  assert.ok(button('Reload page'));
  assert.equal(window.refreshes, 0);

  window.renderControl('bad-reply', false);
  await waitFor(() => button('Mark complete') && !button('Mark complete').disabled, 'fresh control');
  button('Mark complete').click();
  await waitFor(() => requests.length === 2, 'malformed reply request');
  complete.resolve({ ok: true, json: async () => ({ ok: true, status: 'in_progress' }) });
  await waitFor(() => window.document.querySelector('[role="alert"]'), 'wrong status rejected');
  assert.equal(button('Mark complete').disabled, true);

  window.renderControl('success', false);
  await waitFor(() => button('Mark complete') && !button('Mark complete').disabled, 'fresh success control');
  button('Mark complete').click();
  await waitFor(() => requests.length === 3, 'success request');
  complete.resolve({ ok: true, json: async () => ({ ok: true, status: 'completed' }) });
  await waitFor(() => button('Undo') && !button('Undo').disabled && window.refreshes === 1, 'confirmed completion');
  button('Undo').click();
  await waitFor(() => requests.length === 4, 'undo request');
  assert.equal(JSON.parse(requests[3].options.body).status, 'in_progress');
  complete.resolve({ ok: false, json: async () => ({ ok: false }) });
  await waitFor(() => window.document.querySelector('[role="alert"]'), 'undo uncertain');
  assert.equal(button('Undo').disabled, true);
  assert.equal(window.refreshes, 1);
  assert.deepEqual(errors, []);
  console.log('Mark-complete component simulation passed: single in-flight write, ambiguous network and reply handling, successful completion, and uncertain undo.');
} finally { dom.window.close(); }
