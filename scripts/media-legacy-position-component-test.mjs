// React/jsdom simulation, not a real browser media lifecycle or hosted Auth.
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const bundle = await build({
  stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client';
    import { VideoWithResume } from './web/src/app/_shared/media-resume';
    window.mount = (actor = '${id(4)}') => { window.playerRoot = createRoot(document.getElementById('root'));
      window.playerRoot.render(<VideoWithResume name="Recording" src="https://example.invalid/video.mp4" enrolmentId="${id(1)}" lessonId="${id(2)}" resourceId="${id(9)}" legacyActorId={actor} resumeAt={50}/>); };`, resolveDir: root, loader: 'jsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', alias: { '@': resolve(root, 'web/src') }, logLevel: 'silent',
});
const consoleCapture = new VirtualConsole(); const errors = []; consoleCapture.on('jsdomError', (error) => errors.push(error));
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: consoleCapture });
const waitFor = async (predicate, description) => {
  const until = Date.now() + 3000;
  while (Date.now() < until) { if (predicate()) return; await new Promise((r) => setTimeout(r, 10)); }
  throw new Error(`Timed out: ${description}`);
};
try {
  const { window } = dom; const requests = []; const pending = [];
  window.fetch = (url, options) => { requests.push({ url, options }); return new Promise((resolve, reject) => pending.push({ resolve, reject })); };
  const respond = (index, status, body) => pending[index].resolve({ ok: status >= 200 && status < 300, status, json: async () => body });
  const button = (text) => [...window.document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
  window.eval(bundle.outputFiles[0].text); window.mount();
  await waitFor(() => requests.length === 1, 'snapshot');
  respond(0, 200, { ok: true, seconds: 70, revision: id(3), actorId: id(4) });
  await waitFor(() => button('Review earlier place'), 'legacy choice');
  const video = window.document.querySelector('video');
  assert.equal(video.currentTime, 0, 'old place was automatically applied');
  button('Review earlier place').click();
  await waitFor(() => window.document.body.textContent.includes('Wait for the recording to load'), 'metadata warning');
  video.dispatchEvent(new window.Event('loadedmetadata', { bubbles: true }));
  assert.equal(video.currentTime, 70, 'only the resource-specific snapshot is resumed');
  button('Review earlier place').click();
  await waitFor(() => button('Keep this player'), 'explicit conflict choice');
  assert.equal(video.currentTime, 50);
  assert.equal(requests.length, 1, 'review alone must not write');
  video.dispatchEvent(new window.Event('timeupdate', { bubbles: true }));
  assert.equal(requests.length, 1, 'timeupdate must not bypass choice');
  button('Keep this player').click();
  await waitFor(() => requests.length === 2, 'reviewed write');
  assert.deepEqual(JSON.parse(requests[1].options.body), { enrolmentId: id(1), lessonId: id(2), resourceId: id(9), actorId: id(4), seconds: 50, revision: id(3) });
  respond(1, 409, { ok: false, seconds: 85, revision: id(5) });
  await waitFor(() => window.document.body.textContent.includes('1:25'), 'newer device wins another review');
  button('Use saved place').click(); assert.equal(video.currentTime, 85);
  window.playerRoot.unmount(); window.mount(id(8));
  await waitFor(() => requests.length >= 3, 'account change snapshot');
  const index = requests.length - 1;
  respond(index, 200, { ok: true, seconds: null, revision: null, actorId: id(4) });
  await waitFor(() => window.document.querySelector('video')?.controls, 'ready after actor change');
  assert.equal(button('Review earlier place'), undefined, 'old server-rendered value must not be offered after actor mismatch');
  assert.deepEqual(errors, []);
  console.log('Legacy lesson-wide place simulation passed: explicit review, actor guard and conflict handling.');
} finally { dom.window.close(); }
