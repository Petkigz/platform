// Real Chromium media and localStorage with a synthetic HTTP CAS server.
// No hosted Auth/RLS, real database concurrency, abrupt process kill or mobile
// browser lifecycle is exercised. Audio is locally generated silence.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

if (!process.env.RESPONSIVE_PLAYWRIGHT || !process.env.RESPONSIVE_CHROME) throw new Error('Set RESPONSIVE_PLAYWRIGHT and RESPONSIVE_CHROME');
const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const root = resolve(import.meta.dirname, '..');
const bundle = await build({ stdin: { resolveDir: root, loader: 'jsx', contents: `
  import React from 'react'; import { createRoot } from 'react-dom/client';
  import { AudioPlayer } from './web/src/app/_shared/media-resume';
  createRoot(document.getElementById('root')).render(<AudioPlayer name="Synthetic recording" src="/silence.wav" enrolmentId="${id(1)}" lessonId="${id(2)}" resourceId="${id(3)}" legacyActorId="${id(4)}" resumeAt={null}/>);
` }, bundle: true, write: false, platform: 'browser', format: 'iife', alias: { '@': resolve(root, 'web/src') }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });

// A valid 30-second PCM WAV, no external media or network access.
const samples = 8000 * 30, bytes = samples * 2;
const wav = Buffer.alloc(44 + bytes);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
let saved = null, revision = null, sequence = 10, failNext = false;
const calls = [];
const server = createServer(async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/') { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); return; }
  if (url.pathname === '/bundle.js') { res.setHeader('content-type', 'text/javascript'); res.end(bundle.outputFiles[0].text); return; }
  if (url.pathname === '/silence.wav') { res.setHeader('content-type', 'audio/wav'); res.end(wav); return; }
  if (url.pathname === '/api/learn/position-v3') {
    res.setHeader('content-type', 'application/json');
    if (req.method === 'GET') {
      calls.push({ method: 'GET', resourceId: url.searchParams.get('resourceId') });
      res.end(JSON.stringify({ ok: true, seconds: saved, revision, actorId: id(4) })); return;
    }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); calls.push({ method: 'POST', ...body });
    if (failNext) { failNext = false; res.statusCode = 503; res.end('{"error":"simulated interruption"}'); return; }
    if (body.revision !== revision) { res.statusCode = 409; res.end(JSON.stringify({ ok: false, seconds: saved, revision })); return; }
    saved = body.seconds; revision = id(sequence++); res.end(JSON.stringify({ ok: true, seconds: saved, revision })); return;
  }
  res.statusCode = 404; res.end();
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/`;
let browser;
const waitFor = async (predicate, text) => {
  const end = Date.now() + 8000;
  while (Date.now() < end) { if (predicate()) return; await new Promise((r) => setTimeout(r, 25)); }
  throw new Error(`Timed out: ${text}`);
};
try {
  browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext();
  const a = await context.newPage(), b = await context.newPage();
  await Promise.all([a.goto(url), b.goto(url)]);
  for (const page of [a, b]) {
    await page.waitForFunction(() => document.querySelector('audio')?.readyState >= 1 && document.querySelector('audio')?.controls);
  }
  assert.equal(calls.filter((c) => c.method === 'GET' && c.resourceId === id(3)).length, 2);
  async function playSeekPause(page, seconds) {
    await page.locator('audio').evaluate(async (audio, target) => { await audio.play(); audio.currentTime = target; audio.pause(); }, seconds);
  }
  await playSeekPause(a, 5);
  try { await waitFor(() => saved === 5, 'first tab save'); }
  catch (error) {
    console.error('First-tab diagnostics:', JSON.stringify({ saved, revision, calls, audio: await a.locator('audio').evaluate((el) => ({ currentTime: el.currentTime, duration: el.duration, paused: el.paused, readyState: el.readyState })), text: await a.locator('body').innerText() }));
    throw error;
  }
  await playSeekPause(b, 12);
  await b.getByRole('button', { name: /Keep this player/ }).waitFor();
  assert.equal(saved, 5, 'stale tab overwrote the first save');
  const shownRevision = revision;
  await b.getByRole('button', { name: /Keep this player/ }).click();
  await waitFor(() => saved === 12, 'reviewed second tab save');
  assert.ok(calls.some((c) => c.method === 'POST' && c.seconds === 12 && c.revision === shownRevision), 'reviewed save did not compare the shown revision');

  await b.getByRole('checkbox', { name: /temporary recovery place/ }).check();
  failNext = true;
  await playSeekPause(b, 20);
  await b.getByText(/Could not confirm your saved place/).waitFor();
  assert.equal(saved, 12, 'unconfirmed write should not change the synthetic server');
  const pending = await b.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ayahspring:resume-recovery:v3:item:')));
  assert.ok(pending.some((k) => k.includes(id(3))), 'resource-specific recovery not stored');
  await b.reload();
  await b.getByRole('button', { name: /Review device place/ }).first().waitFor();
  await b.waitForFunction(() => document.querySelector('audio')?.readyState >= 1);
  await b.getByRole('button', { name: /Review device place/ }).first().click();
  await b.getByRole('button', { name: /Keep this player/ }).waitFor();
  await b.getByRole('button', { name: /Keep this player/ }).click();
  await waitFor(() => saved === 20, 'recovered save');
  await b.waitForFunction(() => !Object.keys(localStorage).some((k) => k.startsWith('ayahspring:resume-recovery:v3:item:')));
  await context.close();
  console.log('Chromium audio resume smoke passed: real media seek, competing tabs and opt-in recovery after reload. Synthetic HTTP server only.');
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
