// Synthetic React/jsdom flow. This does not prove browser termination or cross-tab atomicity.
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const bundle = await build({
  stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client';
    import { VideoWithResume } from './web/src/app/_shared/media-resume';
    window.mount = () => { window.playerRoot = createRoot(document.getElementById('root'));
      window.playerRoot.render(<VideoWithResume name="Recording" src="https://example.invalid/video.mp4" enrolmentId="${id(1)}" lessonId="${id(2)}" resourceId="${id(9)}" legacyActorId="${id(4)}" resumeAt={null}/>); };`, resolveDir: root, loader: 'jsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', alias: { '@': resolve(root, 'web/src') }, logLevel: 'silent',
});
const virtualConsole = new VirtualConsole(); const errors = []; virtualConsole.on('jsdomError', (error) => errors.push(error));
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
const waitFor = async (predicate, description) => {
  const until = Date.now() + 3000;
  while (Date.now() < until) { if (predicate()) return; await new Promise((r) => setTimeout(r, 10)); }
  throw new Error(`Timed out: ${description}`);
};
try {
  const { window } = dom; const requests = []; const pending = [];
  window.fetch = (url, options) => { requests.push({ url, options }); return new Promise((resolve, reject) => pending.push({ resolve, reject })); };
  const respond = (i, status, body) => pending[i].resolve({ ok: status >= 200 && status < 300, status, json: async () => body });
  const button = (text) => [...window.document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
  const key = (actor, session) => `ayahspring:resume-recovery:v1:item:${actor}:${id(1)}:${id(2)}:${session}`;
  const save = (actor, session, seconds) => window.localStorage.setItem(key(actor, session), JSON.stringify({ actorId: actor, enrolmentId: id(1), lessonId: id(2), sessionId: session, seconds, updatedAt: Date.now() }));
  window.localStorage.setItem('ayahspring:resume-recovery:v1:enabled', 'yes');
  save(id(4), id(6), 55); save(id(8), id(7), 99);
  window.eval(bundle.outputFiles[0].text); window.mount();
  await waitFor(() => requests.length === 1, 'snapshot');
  respond(0, 200, { ok: true, seconds: 70, revision: id(3), actorId: id(4) });
  await waitFor(() => button('Review earlier device place'), 'old device place');
  assert.equal(window.document.querySelectorAll('[aria-label^="Review earlier device place"]').length, 1, 'other account must be hidden');
  assert.match(window.document.body.textContent, /may belong to another recording/i);
  const video = window.document.querySelector('video'); video.dispatchEvent(new window.Event('loadedmetadata', { bubbles: true }));
  assert.equal(video.currentTime, 70);
  button('Review earlier device place').click(); await waitFor(() => button('Use saved place'), 'review choice');
  assert.equal(video.currentTime, 55); assert.equal(requests.length, 1, 'review must not write');
  button('Use saved place').click();
  await waitFor(() => !button('Use saved place'), 'choice resolved');
  assert.equal(video.currentTime, 70); assert.ok(window.localStorage.getItem(key(id(4), id(6))), 'choosing server must preserve old device record');
  button('Review earlier device place').click(); await waitFor(() => button('Keep this player'), 'second review');
  button('Keep this player').click(); await waitFor(() => requests.length === 2, 'chosen write');
  assert.deepEqual(JSON.parse(requests[1].options.body), { enrolmentId: id(1), lessonId: id(2), resourceId: id(9), actorId: id(4), seconds: 55, revision: id(3) });
  assert.ok(window.localStorage.getItem(key(id(4), id(6))), 'old record stays pending until confirmation');
  respond(1, 200, { ok: true, seconds: 55, revision: id(5) });
  await waitFor(() => !window.localStorage.getItem(key(id(4), id(6))), 'confirmed removal');
  assert.ok(window.localStorage.getItem(key(id(8), id(7))), 'another account record must survive');
  assert.deepEqual(errors, []);
  console.log('Earlier lesson-wide recovery simulation passed: isolation, choice and confirmed cleanup.');
} finally { dom.window.close(); }
