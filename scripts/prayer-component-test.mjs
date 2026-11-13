// Exercise the real component in a simulated DOM. This is not a browser,
// location-provider, hosted Auth, accessibility or religious accuracy test.
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Keep the simulated device zone consistent with the initial test coordinates.
process.env.TZ = 'Europe/London';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundled = await build({
  stdin: {
    contents: `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {PrayerTimesTool} from './web/src/app/companion/prayer-times/tool';
      createRoot(document.getElementById('root')).render(<PrayerTimesTool/>);`,
    resolveDir: root, loader: 'jsx',
  },
  bundle: true, write: false, format: 'iife', platform: 'browser',
  alias: { '@': resolve(root, 'web/src') },
  logLevel: 'silent',
});
const script = bundled.outputFiles[0].text;
const waitFor = async (predicate, description) => {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out: ${description}`);
};
const virtualConsole = new VirtualConsole();
const errors = [];
virtualConsole.on('jsdomError', error => errors.push(error));
const dom = new JSDOM('<div id="root"></div>', {
  url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
});
try {
  const { window } = dom;
  const callbacks = [];
  Object.defineProperty(window.navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: (success, failure) => callbacks.push({ success, failure }),
  } });
  window.eval(script);
  const query = (selector) => window.document.querySelector(selector);
  const button = (text) => [...window.document.querySelectorAll('button')].find(x => x.textContent === text);
  await waitFor(() => button('Use device location'), 'render location button');
  button('Use device location').click();
  await waitFor(() => callbacks.length === 1 && button('Finding location…'), 'first location request');
  assert.equal(query('#latitude').disabled, true);
  assert.equal(button('Calculate today').disabled, true);
  callbacks[0].success({ coords: { latitude: 51.5, longitude: -0.12, accuracy: 30 } });
  await waitFor(() => query('#latitude').value === '51.5', 'location accepted');
  assert.equal(query('#longitude').value, '-0.12');
  const change = (id, value) => {
    const select = query(id); select.value = value;
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  change('#method', 'MuslimWorldLeague'); change('#asr', 'standard'); change('#night', 'middle');
  const confirmation = query('input[type=checkbox]'); confirmation.click();
  await waitFor(() => confirmation.checked, 'time-zone confirmation');
  button('Calculate today').click();
  await waitFor(() => window.document.body.textContent.includes('Times for '), 'initial calculation');
  button('Use device location').click();
  await waitFor(() => callbacks.length === 2 && query('#latitude').value === '', 'refresh clears location');
  assert.equal(query('#longitude').value, '');
  assert.equal(confirmation.checked, false);
  assert.ok(!window.document.body.textContent.includes('Times for '));
  callbacks[1].failure({ code: 1 });
  await waitFor(() => window.document.body.textContent.includes('permission was denied'), 'denied message');
  assert.equal(query('#latitude').value, '');
  assert.equal(query('#longitude').value, '');
  assert.equal(confirmation.checked, false);
  button('Calculate today').click();
  await waitFor(() => window.document.body.textContent.includes('Enter coordinates'), 'refuse calculation without a fresh location');
  assert.ok(!window.document.body.textContent.includes('Times for '));
  button('Use device location').click();
  await waitFor(() => callbacks.length === 3, 'retry location');
  callbacks[2].success({ coords: { latitude: 0.34, longitude: 32.58, accuracy: 200 } });
  await waitFor(() => query('#latitude').value === '0.34', 'retry accepted');
  confirmation.click();
  await waitFor(() => confirmation.checked, 'retry confirmation');
  delete window.navigator.geolocation;
  button('Use device location').click();
  await waitFor(() => window.document.body.textContent.includes('Location is not available'), 'unavailable message');
  assert.equal(query('#latitude').value, '');
  assert.equal(query('#longitude').value, '');
  assert.equal(confirmation.checked, false);
  assert.deepEqual(errors, []);
  console.log('Prayer component simulation passed: calculation, pending and denied refresh, retry, unavailable location and stale-location refusal.');
} finally {
  dom.window.close();
}
