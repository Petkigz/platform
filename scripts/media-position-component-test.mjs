// Simulated DOM of the actual player/hook. No real browser media, database,
// page termination, multiple tabs or cross-device concurrency is exercised.
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = await build({
  stdin: { contents: `import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { VideoWithResume } from './web/src/app/_shared/media-resume';
    createRoot(document.getElementById('root')).render(<VideoWithResume name="Synthetic media" src="https://example.invalid/media.mp4" enrolmentId="enrolment" lessonId="lesson" resumeAt={null}/>);`,
    resolveDir: root, loader: 'jsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', alias: { '@': resolve(root, 'web/src') }, logLevel: 'silent',
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
  const { window } = dom; const requests = []; const pending = [];
  window.fetch = (url, options) => {
    requests.push({ url, options });
    return new Promise((resolve, reject) => { pending.push({ resolve, reject }); });
  };
  window.eval(bundle.outputFiles[0].text);
  await waitFor(() => window.document.querySelector('video'), 'media player');
  const video = window.document.querySelector('video');
  const send = (seconds, type) => { video.currentTime = seconds; video.dispatchEvent(new window.Event(type, { bubbles: true })); };
  send(11, 'timeupdate'); await waitFor(() => requests.length === 1, 'first save');
  assert.equal(requests[0].options.keepalive, true);
  assert.equal(JSON.parse(requests[0].options.body).seconds, 11);
  send(25, 'timeupdate'); send(30, 'pause');
  assert.equal(requests.length, 1);
  pending[0].resolve({ ok: true, json: async () => ({ ok: true, seconds: 11 }) });
  await waitFor(() => requests.length === 2, 'latest pending save');
  assert.equal(JSON.parse(requests[1].options.body).seconds, 30);
  send(5, 'pause');
  pending[1].reject(new Error('connection lost'));
  await waitFor(() => window.document.body.textContent.includes('Could not confirm your saved place'), 'unconfirmed save warning');
  send(50, 'timeupdate');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(requests.length, 2);
  assert.deepEqual(errors, []);
  console.log('Media position component simulation passed: ordered coalescing, keepalive request and ambiguous-save warning.');
} finally { dom.window.close(); }
