// Browser smoke for the public front door. Uses an isolated Playwright install
// and the runner's Chrome; no account, application data, or hosted services.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const modulePath = process.env.RESPONSIVE_PLAYWRIGHT;
const chromePath = process.env.RESPONSIVE_CHROME;
if (!modulePath || !chromePath) throw new Error('Set RESPONSIVE_PLAYWRIGHT and RESPONSIVE_CHROME');
const { chromium } = await import(pathToFileURL(modulePath).href);
const server = spawn('npm', ['run', 'dev'], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_ALLOW_MISSING_SUPABASE: '1', PORT: '3000' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', (chunk) => { logs = (logs + chunk).slice(-5000); });
let browser;
try {
  let ready = false;
  for (let n = 0; n < 80; n++) {
    if (server.exitCode !== null) throw new Error('Local server exited early');
    try {
      const response = await fetch('http://127.0.0.1:3000/');
      if (response.ok) { ready = true; break; }
    } catch { /* local server is still starting */ }
    await delay(500);
  }
  if (!ready) throw new Error(`Local server did not start: ${logs}`);
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] });
  for (const [locale, direction] of [['en', 'ltr'], ['ar', 'rtl']]) {
    for (const width of [320, 390, 768, 1024, 1440, 1920, 2560]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, locale });
      await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => {
        const hero = document.querySelector('.home-hero .container');
        const header = document.querySelector('.masthead-inner');
        if (!hero || !header) throw new Error('Missing public layout');
        return { direction: document.documentElement.dir, viewport: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          heroWidth: hero.getBoundingClientRect().width,
          headerWidth: header.getBoundingClientRect().width };
      });
      assert.equal(metrics.direction, direction, `${locale} direction`);
      assert.ok(metrics.scrollWidth <= width + 1, `${locale} ${width}: unexpected page overflow: ${metrics.scrollWidth}`);
      assert.ok(metrics.heroWidth >= width - 1, `${locale} ${width}: hero does not use the viewport`);
      assert.ok(metrics.headerWidth >= width - 1, `${locale} ${width}: header does not use the viewport`);
      console.log(`${locale} ${width}: no page overflow, full-width hero and header`);
      await page.close();
    }
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
