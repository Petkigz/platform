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
    const player = (name) => <VideoWithResume name={name} src="https://example.invalid/media.mp4" enrolmentId="${id(1)}" lessonId="${id(2)}" resumeAt={null}/>;
    window.mountPlayer = () => { window.playerRoot = createRoot(document.getElementById('root')); window.playerRoot.render(player('Synthetic media')); };
    window.mountTwo = () => { window.playerRoot = createRoot(document.getElementById('root')); window.playerRoot.render(<>{player('First')}{player('Second')}</>); };
    window.mountPlayer();`, resolveDir: root, loader: 'jsx' },
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
  await waitFor(() => window.document.querySelector('input[type="checkbox"]'), 'recovery opt-in');
  assert.equal(window.localStorage.length, 0, 'no storage before opt-in');
  window.document.querySelector('input[type="checkbox"]').click();
  const send = (seconds, type) => { video.currentTime = seconds; video.dispatchEvent(new window.Event(type, { bubbles: true })); };
  send(11, 'timeupdate'); await waitFor(() => requests.length === 2, 'first save');
  assert.equal(requests[1].options.keepalive, true);
  assert.equal(JSON.parse(requests[1].options.body).revision, id(3));
  send(25, 'timeupdate'); send(30, 'pause'); assert.equal(requests.length, 2);
  respond(1, 409, { ok: false, seconds: 65, revision: id(5) });
  await waitFor(() => button('Keep this player'), 'conflict choice');
  assert.match(window.document.body.textContent, /1:05/); assert.match(window.document.body.textContent, /0:30/);
  button('Keep this player').click(); await waitFor(() => requests.length === 3, 'reviewed overwrite');
  assert.deepEqual(JSON.parse(requests[2].options.body), { enrolmentId: id(1), lessonId: id(2), actorId: id(4), seconds: 30, revision: id(5) });
  respond(2, 409, { ok: false, seconds: 75, revision: id(6) });
  await waitFor(() => button('Use saved place'), 'second conflict'); button('Use saved place').click();
  assert.equal(video.currentTime, 75);
  send(5, 'pause'); await waitFor(() => requests.length === 4, 'rewind');
  assert.equal(JSON.parse(requests[3].options.body).revision, id(6));
  pending[3].reject(new Error('connection lost'));
  await waitFor(() => window.document.body.textContent.includes('Could not confirm your saved place'), 'unconfirmed warning');
  send(50, 'timeupdate'); await new Promise((r) => setTimeout(r, 50)); assert.equal(requests.length, 4);
  assert.ok([...Array(window.localStorage.length)].some((_, i) => window.localStorage.key(i).includes(':item:')), 'unconfirmed place retained');
  window.playerRoot.unmount(); window.mountPlayer();
  await waitFor(() => requests.length === 5, 'another account snapshot');
  respond(4, 200, { ok: true, seconds: 75, revision: id(6), actorId: id(8) });
  await waitFor(() => window.document.querySelector('video')?.controls, 'another account ready');
  assert.equal(button('Review this place'), undefined, 'another actor cannot see the recovery');
  window.playerRoot.unmount(); window.mountPlayer();
  await waitFor(() => requests.length === 6, 'original account snapshot');
  respond(5, 200, { ok: true, seconds: 75, revision: id(6), actorId: id(4) });
  await waitFor(() => button('Review this place'), 'recovery choice');
  assert.match(window.document.body.textContent, /0:50/);
  const recoveryVideo = window.document.querySelector('video');
  recoveryVideo.currentTime = 35; recoveryVideo.dispatchEvent(new window.Event('timeupdate', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 30)); assert.equal(requests.length, 6, 'recovery choice gates automatic saves');
  button('Review this place').click(); await waitFor(() => button('Keep this player'), 'recovery conflict choice');
  assert.equal(window.document.querySelector('video').currentTime, 50);
  button('Keep this player').click(); await waitFor(() => requests.length === 7, 'recovery save');
  assert.equal(JSON.parse(requests[6].options.body).seconds, 50);
  respond(6, 200, { ok: true, seconds: 50, revision: id(7) });
  await waitFor(() => window.localStorage.length === 1, 'recovery record cleared after confirmation');
  window.document.querySelector('input[type="checkbox"]').click();
  assert.equal(window.localStorage.length, 0, 'opting out removes consent and records');
  window.document.querySelector('input[type="checkbox"]').click();
  window.playerRoot.unmount(); window.mountPlayer();
  await waitFor(() => requests.length === 8, 'offline snapshot');
  respond(7, 503, { error: 'offline' });
  await waitFor(() => window.document.body.textContent.includes('saving is unavailable'), 'offline warning');
  const checkbox = window.document.querySelector('input[type="checkbox"]');
  assert.ok(checkbox?.checked, 'device opt-out available offline'); checkbox.click();
  assert.equal(window.localStorage.length, 0, 'offline opt-out clears storage');
  window.playerRoot.unmount(); window.mountTwo();
  await waitFor(() => requests.length === 10, 'two player snapshots');
  respond(8, 200, { ok: true, seconds: null, revision: null, actorId: id(4) });
  respond(9, 200, { ok: true, seconds: null, revision: null, actorId: id(4) });
  await waitFor(() => window.document.querySelectorAll('input[type="checkbox"]').length === 2, 'two recovery controls');
  const boxes = window.document.querySelectorAll('input[type="checkbox"]'); boxes[0].click();
  await waitFor(() => boxes[1].checked, 'same-page opt-in synchronization');
  boxes[1].click(); await waitFor(() => !boxes[0].checked, 'same-page opt-out synchronization');
  assert.equal(window.localStorage.length, 0);
  assert.deepEqual(errors, []);
  console.log('Media position component simulation passed: conflicts, opt-in interrupted recovery, and opt-out.');
} finally { dom.window.close(); }
