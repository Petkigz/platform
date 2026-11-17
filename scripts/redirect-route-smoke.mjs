// Local HTTP regression against the actual Next locale route. No hosted services.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const reservation = createServer();
await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port;
await new Promise((r) => reservation.close(r));
const root = resolve(import.meta.dirname, '..');
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
try {
  await new Promise((ready, reject) => {
    const timer = setTimeout(() => reject(new Error(`Next startup timed out\n${logs}`)), 60000);
    const receive = (chunk) => { logs += chunk.toString(); if (logs.includes('Ready in')) { clearTimeout(timer); ready(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (error) => { clearTimeout(timer); reject(error); });
    next.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Next exited ${code}\n${logs}`)); });
  });
  const origin = `http://localhost:${port}`;
  const post = (target) => fetch(`${origin}/api/locale`, {
    method: 'POST', body: new URLSearchParams({ locale: 'en', next: target }),
    redirect: 'manual', signal: AbortSignal.timeout(30000),
  });
  for (const target of ['/\n/evil.example', '/\t/evil.example', '/a/..//evil.example', '/%2e%2e//evil.example', '/\\evil.example', '//evil.example']) {
    const response = await post(target);
    assert.equal(response.status, 303);
    const location = new URL(response.headers.get('location'));
    assert.ok(['localhost', '0.0.0.0'].includes(location.hostname), JSON.stringify(target));
    assert.equal(location.port, String(port));
    assert.equal(`${location.pathname}${location.search}${location.hash}`, '/language');
  }
  const valid = await post('/courses/quran?from=sign-in#lesson');
  assert.equal(valid.status, 303);
  const validLocation = new URL(valid.headers.get('location'));
  assert.ok(['localhost', '0.0.0.0'].includes(validLocation.hostname));
  assert.equal(validLocation.port, String(port));
  assert.equal(`${validLocation.pathname}${validLocation.search}${validLocation.hash}`, '/courses/quran?from=sign-in#lesson');
  assert.match(valid.headers.get('set-cookie') ?? '', /locale/i);
  console.log('Locale redirect HTTP smoke passed: unsafe targets rejected; local path and language cookie preserved.');

  // An address with nothing at it answers in the reader's language. It was
  // English for everybody. Two people get it: one mistyped, and one followed a
  // link to a course that has been withdrawn, who is the one who most needs to
  // be able to read it.
  const missing = async (headers) => {
    const response = await fetch(`${origin}/no-such-page-${port}`, { headers, signal: AbortSignal.timeout(60000) });
    const html = await response.text();
    return { status: response.status, html, title: html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '',
      wrapper: html.match(/<div class="container section"[^>]*>(?=<p class="eyebrow"><bdi>404)/)?.[0] ?? '',
      // What the reader is shown of it: from its wrapper to the footer.
      body: html.slice(html.indexOf('<p class="eyebrow"><bdi>404'), html.indexOf('<footer')).replace(/<script[\s\S]*?<\/script>/g, '') };
  };
  const englishWords = ['That page is not here', 'Either the address', 'My learning', 'Browse the catalogue', '>Home<', 'Ask for help', 'Tell us where'];
  {
    const page = await missing({});
    assert.equal(page.status, 404); assert.equal(page.title, 'Not found · AyahSpring');
    assert.equal(page.wrapper, '<div class="container section">');
    for (const text of englishWords) assert.ok(page.body.includes(text), `English 404: ${text}`);
    assert.match(page.body, /through <a href="\/learn">My learning<\/a>\./);
  }
  for (const [headers, lang, dir, title, words] of [
    [{ 'accept-language': 'ar' }, 'ar', 'rtl', 'غير موجودة · AyahSpring', ['هذه الصفحة غير موجودة هنا', '<a href="/learn">تعلّمي</a>', '>تصفّح الكتالوج<', '>الرئيسية<', '>اطلب المساعدة<', '>أخبرنا أين كان الرابط<']],
    [{ cookie: 'ayahspring_locale=fr', 'accept-language': 'ar' }, 'fr', 'ltr', 'Introuvable · AyahSpring', ['<a href="/learn">Mon apprentissage</a>', '>Parcourir le catalogue<', '>Accueil<', '>Dites-nous où se trouvait le lien<']],
    [{ 'accept-language': 'zh-CN' }, 'zh-hans', 'ltr', '未找到 · AyahSpring', ['该页面不在这里', '通过<a href="/learn">我的学习</a>阅读', '>首页<']],
  ]) {
    const page = await missing(headers);
    assert.equal(page.status, 404, lang);
    assert.match(page.html, new RegExp(`<html[^>]*lang="${lang}"[^>]*dir="${dir}"`));
    assert.equal(page.title, title);
    // The frame's language is the page's: nothing marks it as another.
    assert.equal(page.wrapper, '<div class="container section">', lang);
    for (const text of words) assert.ok(page.body.includes(text), `${lang} 404: ${text}`);
    for (const text of englishWords) assert.equal(page.body.includes(text), false, `${lang} 404 still says "${text}"`);
  }
  // A language with something held reads it in English, whole, and marked so:
  // left to right inside a Pashto frame that runs the other way.
  for (const [code, dir] of [['ha', 'ltr'], ['ps', 'rtl']]) {
    const page = await missing({ 'accept-language': code });
    assert.equal(page.status, 404, code);
    assert.match(page.html, new RegExp(`<html[^>]*lang="${code}"[^>]*dir="${dir}"`));
    assert.equal(page.wrapper, '<div class="container section" lang="en" dir="ltr">', code);
    assert.equal(page.title, 'Not found · AyahSpring');
    for (const text of englishWords) assert.ok(page.body.includes(text), `${code} 404: ${text}`);
  }
  // A withheld language is English, not the next language on the device's list.
  {
    const page = await missing({ 'accept-language': 'wo, fr' });
    assert.match(page.html, /<html[^>]*lang="en"/); assert.equal(page.wrapper, '<div class="container section">');
    assert.ok(page.body.includes('That page is not here')); assert.equal(page.body.includes('Accueil'), false);
  }
  console.log('Wrong-address page passed: English, Arabic, French by cookie, Chinese; English and marked as English for Hausa and Pashto; English for Wolof. No translation here has been read by a speaker.');
} catch (error) { console.error(logs); throw error; }
finally {
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
}
