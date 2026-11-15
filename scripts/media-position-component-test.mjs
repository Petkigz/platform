// Actual React player/hook with synthetic fetch and DOM, not real browser media,
// PostgreSQL concurrency, hosted Auth/RLS or browser termination.
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const bundle = await build({
  stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client';
    import { VideoWithResume } from './web/src/app/_shared/media-resume';
    createRoot(document.getElementById('root')).render(<VideoWithResume name="Synthetic media" src="https://example.invalid/media.mp4" enrolmentId="${id(1)}" lessonId="${id(2)}" resumeAt={null}/>);`, resolveDir: root, loader: 'jsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', alias: { '@': resolve(root, 'web/src') }, logLevel: 'silent',
});
const virtualConsole = new VirtualConsole(); const errors = []; virtualConsole.on('jsdomError', (error) => errors.push(error));
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
const waitFor = async (predicate, description) => {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) { if (predicate()) return; await new Promise((r) => setTimeout(r, 10)); }
  throw new Error(`Timed out: ${description}`);
};
try {
  const { window } = dom; const requests = []; const pending = [];
  window.fetch = (url, options) => { requests.push({ url, options }); return new Promise((resolve, reject) => { pending.push({ resolve, reject }); }); };
  const respond = (index, status, body) => pending[index].resolve({ ok: status >= 200 && status < 300, status, json: async () => body });
  const button = (text) => [...window.document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
  window.eval(bundle.outputFiles[0].text);
  await waitFor(() => window.document.querySelector('video') && requests.length === 1, 'snapshot');
  const video = window.document.querySelector('video');
  assert.equal(video.controls, false);
  respond(0, 200, { ok: true, seconds: 50, revision: id(3), actorId: id(4) });
  await waitFor(() => video.controls, 'ready');
  const send = (seconds, type) => { video.currentTime = seconds; video.dispatchEvent(new window.Event(type, { bubbles: true })); };
  send(11, 'timeupdate'); await waitFor(() => requests.length === 2, 'first save');
  assert.equal(requests[1].options.keepalive, true);
  assert.equal(JSON.parse(requests[1].options.body).revision, id(3));
  send(25, 'timeupdate'); send(30, 'pause'); assert.equal(requests.length, 2);
  respond(1, 409, { ok: false, seconds: 65, revision: id(5) });
  await waitFor(() => button('Keep this player'), 'conflict choice');
  assert.match(window.document.body.textContent, /1:05/); assert.match(window.document.body.textContent, /0:30/);
  button('Keep this player').click(); await waitFor(() => requests.length === 3, 'reviewed overwrite');
  assert.deepEqual(JSON.parse(requests[2].options.body), { enrolmentId: id(1), lessonId: id(2), seconds: 30, revision: id(5) });
  respond(2, 409, { ok: false, seconds: 75, revision: id(6) });
  await waitFor(() => button('Use saved place'), 'second conflict'); button('Use saved place').click();
  assert.equal(video.currentTime, 75);
  send(5, 'pause'); await waitFor(() => requests.length === 4, 'rewind');
  assert.equal(JSON.parse(requests[3].options.body).revision, id(6));
  pending[3].reject(new Error('connection lost'));
  await waitFor(() => window.document.body.textContent.includes('Could not confirm your saved place'), 'unconfirmed warning');
  send(50, 'timeupdate'); await new Promise((r) => setTimeout(r, 50)); assert.equal(requests.length, 4);
  assert.deepEqual(errors, []);
  console.log('Media position component simulation passed: revision conflicts, both choices, rewind and uncertain save.');
} finally { dom.window.close(); }
