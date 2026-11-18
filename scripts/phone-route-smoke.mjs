// Real Next /account page (its phone card) and the /api/account/phone route
// against an entirely synthetic loopback Auth/REST API. This is not evidence
// about hosted Supabase, JWT validation, RLS, or what `set_my_phone()` stores:
// the stand-in answers whatever it is told to and normalises nothing. What
// the database does with a number is proved by
// `supabase/tests/phone_numbers.test.mjs`.
//
// The card is behind `platform.phone_format`, which is off. The stand-in
// answers `my_phone` as if it were on; nothing here switches it on.
//
// What it does show: the card a signed-in reader is sent, in English, Arabic,
// French by the reader's own choice, and English for a language held for
// review; that a stored number is shown and can be removed while numbers are
// not being collected; the name and status the route gives each thing the
// database raises, with no sentence of the database in any answer; and, with
// a browser, that the card names a mistake before anything is sent, reads
// digits of the reader's own script, and says an unanswered write as unknown.
// The expected sentences are typed here rather than imported, so this fails
// if a catalogue changes without anybody looking at the page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;

// What `set_my_phone()` and the table's trigger raise, word for word, with
// the state each is raised under and the status PostgREST gives that state.
const RAISED = {
  empty: ['22023', 400, 'type a phone number'],
  country: ['22023', 400, 'choose the country the number is registered in'],
  no_dial: ['22023', 400, 'this platform has no dial code for XX yet, so it cannot store a number from there'],
  letters: ['22023', 400, 'a phone number cannot contain letters'],
  plus: ['22023', 400, 'a phone number has at most one +, and only at the start'],
  punctuation: ['22023', 400, 'type a phone number, not just punctuation'],
  other_country: ['22023', 400, 'that number is not a UG number: it begins +447, and a number from there begins +256'],
  length: ['22023', 400, 'a number from UG has 9 to 9 digits, and this one has 8'],
  range: ['22023', 400, 'a number from DE has 4 to 13 digits, and this one has 3'],
  signed_out: ['42501', 403, 'sign in to save your phone number'],
  off: ['0A000', 400, 'phone numbers are not being collected on this platform yet'],
  trigger: ['23514', 409, 'a phone number is stored in E.164: 0772123456 would be stored as +256772123456'],
  // Words this page has no name for, under a state it knows: refused, nothing changed.
  unknown_words: ['22023', 400, 'SYNTHETIC a sentence written after this page was'],
  // A state it does not know: nothing is known.
  timeout: ['57014', 500, 'canceling statement due to statement timeout'],
};
// Parts of the database's sentences that must reach no reader in any answer.
const DATABASE_WORDS = ['type a phone number', 'registered in', 'no dial code', 'cannot contain letters', 'at most one +', 'not just punctuation', 'is not a UG number', 'digits, and this one has', 'sign in to save', 'not being collected on this platform yet', 'stored in E.164', 'SYNTHETIC', 'canceling statement'];

const state = { enabled: true, stored: null, answer: 'ok' };
const mine = () => ({ enabled: state.enabled, phoneE164: state.stored?.e164 ?? null, phoneCountry: state.stored?.country ?? null, dialCode: state.stored ? '+256' : null });
const calls = [];
const fake = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const json = { 'content-type': 'application/json' };
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{"message":"not authenticated"}'); return; }
    res.writeHead(200, json); res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{}'); return; }
  const path = new URL(req.url, 'http://localhost').pathname;
  let sent = null; try { sent = JSON.parse(body); } catch { /* no body */ }
  calls.push({ method: req.method, path, sent });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  const write = path === '/rest/v1/rpc/set_my_phone' || path === '/rest/v1/rpc/clear_my_phone';
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Synthetic learner', preferred_language: 'en', timezone: 'Africa/Kampala', account_status: 'active' }]);
  else if (path === '/rest/v1/learner_profiles') send([]);
  else if (path === '/rest/v1/rpc/my_sign_in_methods') send({ providers: ['email'], hasPassword: true, summary: 'SYNTHETIC-SUMMARY' });
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/my_phone') send(mine());
  else if (path === '/rest/v1/rpc/my_merge_requests') send({ enabled: false, incoming: [] });
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/rpc/my_policy_standing') send({ outstanding: 0, acceptanceRequired: [], history: [] });
  else if (write && state.answer === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); res.end('<html>bad gateway SYNTHETIC</html>'); }
  else if (write && state.answer === 'no_reply') send(null);
  else if (write && state.answer === 'word') send('SYNTHETIC not a number');
  // Says the opposite of what was asked: nothing after a save, a number after a removal.
  else if (write && state.answer === 'liar') send(path.endsWith('set_my_phone') ? { enabled: true, phoneE164: null, phoneCountry: null } : { enabled: true, phoneE164: '+256772123456', phoneCountry: 'UG' });
  else if (write && state.answer !== 'ok') { const [code, status, message] = RAISED[state.answer]; send({ code, message, details: null, hint: null }, status); }
  else if (path === '/rest/v1/rpc/set_my_phone') { state.stored = { e164: '+256772123456', country: 'UG' }; send(mine()); }
  else if (path === '/rest/v1/rpc/clear_my_phone') { state.stored = null; send(mine()); }
  else send({}, 404);
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const root = resolve(import.meta.dirname, '..');
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = ''; let browser;
try {
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${logs}`)), 60000);
    const receive = (chunk) => { logs += chunk.toString(); if (logs.includes('Ready in')) { clearTimeout(timeout); resolveReady(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (e) => { clearTimeout(timeout); reject(e); });
    next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${logs}`)); });
  });
  const origin = `http://localhost:${port}`;
  const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  const page = async (headers) => { const response = await request('/account', { cookie, ...headers }); assert.equal(response.status, 200, logs.slice(-2000)); return response.text(); };
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '');
  // The card: the section that holds the country picker's label, or the heading.
  const card = (html, heading) => { const all = inner(html); const at = all.indexOf(heading); if (at < 0) return ''; const start = all.lastIndexOf('<section', at); return all.slice(start, all.indexOf('</section>', at)); };
  const writes = () => calls.filter((c) => c.path === '/rest/v1/rpc/set_my_phone' || c.path === '/rest/v1/rpc/clear_my_phone');
  const ENGLISH_ONLY = ['Your phone number', 'It is kept in one form', 'Kept as', 'Country', 'Phone number', 'Write it any way', 'Save my number', 'Change my number', 'Remove my number', 'Nothing is sent to this number', 'not being collected', 'Uganda', 'United Kingdom', 'Germany'];

  // ------------------------------------------------- off, and nothing stored
  state.enabled = false; state.stored = null;
  const off = await page({ 'accept-language': 'en' });
  assert.equal(inner(off).includes('Your phone number'), false, 'a card for a feature that is off and holds nothing');
  assert.equal(inner(off).includes('account-phone'), false);

  // ------------------------------------------------------------------ English
  state.enabled = true;
  const english = await page({ 'accept-language': 'en' });
  const en = card(english, 'Your phone number');
  for (const sentence of ['Your phone number', 'It is kept in one form, the country code and then the number, so that a call from any country reaches the same phone. You see it here, and platform staff are allowed to read it.', 'Country', 'Phone number', 'Write it any way you like: with spaces, with brackets, with a zero in front or with a plus sign. It is read the same way.', 'Save my number', 'Nothing is sent to this number: no messaging service is connected to this platform. No staff screen shows it yet.']) {
    assert.ok(en.includes(sentence), `English phone card lost "${sentence}"`);
  }
  for (const absent of ['Remove my number', 'Change my number', 'Kept as', 'not being collected', 'lang="en"', '{', 'reach you', 'reach me']) assert.ok(!en.includes(absent), `English phone card says "${absent}" with nothing stored`);
  assert.equal((en.match(/<option /g) ?? []).length, 245, 'the picker is not the 245 countries of the table');
  // A left-to-right mark on each side of the dial code keeps its plus in front of it.
  assert.match(en, /<option value="UG" selected="">Uganda \(\u200e\+256\u200e\)<\/option>/);
  assert.ok(en.indexOf('>Germany (') < en.indexOf('>Uganda ('), 'the English list is not in English order');
  assert.match(en, /<input[^>]*id="account-phone"[^>]*>/);
  const field = en.match(/<input[^>]*id="account-phone"[^>]*>/)[0];
  for (const attribute of ['type="tel"', 'inputMode="tel"', 'dir="ltr"', 'autoComplete="tel-national"', 'aria-describedby="account-phone-help"']) assert.ok(field.toLowerCase().includes(attribute.toLowerCase()), `the field lost ${attribute}`);
  assert.match(en, /<button class="btn" type="submit" disabled="">Save my number<\/button>/);

  // ------------------------------------------------- Arabic, a number stored
  state.stored = { e164: '+256772123456', country: 'UG' };
  const arabic = await page({ 'accept-language': 'ar' });
  const ar = card(arabic, 'رقم هاتفك');
  assert.match(arabic.match(/<html[^>]*>/)[0], /dir="rtl"/);
  for (const sentence of ['رقم هاتفك', 'يُحفظ بصيغة واحدة، رمز البلد ثم الرقم، حتى يصل الاتصال من أي بلد إلى الهاتف نفسه. تراه أنت هنا، ويُسمح لموظفي المنصة بقراءته.', 'البلد', 'رقم الهاتف', 'غيّر رقمي', 'احذف رقمي', 'لا يُرسل شيء إلى هذا الرقم: لا توجد خدمة مراسلة موصولة بهذه المنصة. ولا تعرضه أي شاشة للموظفين حتى الآن.']) {
    assert.ok(ar.includes(sentence), `Arabic phone card lacks "${sentence}"`);
  }
  for (const sentence of [...ENGLISH_ONLY, '{', 'lang="en"']) assert.ok(!ar.includes(sentence), `Arabic phone card still says "${sentence}"`);
  // The number is written left to right, twice: as people read it and as it is kept.
  assert.match(ar, /<strong><bdi dir="ltr">\+256 772 123456<\/bdi><\/strong>/);
  assert.match(ar, /محفوظ بهذه الصيغة: (?:<!-- -->)?<bdi dir="ltr">\+256772123456<\/bdi>/);
  assert.match(ar, /<bdi>أوغندا<\/bdi>/);
  assert.match(ar, /<option value="UG" selected="">أوغندا \(\u200e\+256\u200e\)<\/option>/);
  assert.match(ar, /<option value="DE"[^>]*>ألمانيا \(/);
  // The stored number is in the field, and it is a number that can be saved.
  assert.match(ar, /<input[^>]*id="account-phone"[^>]*value="\+256772123456"/);
  assert.match(ar, /سيُحفظ بهذه الصيغة: (?:<!-- -->)?<bdi dir="ltr">\+256772123456<\/bdi>/);

  // ----------------------------------------------- French, by the reader's choice
  const french = await page({ 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` });
  const fr = card(french, 'Votre numéro de téléphone');
  for (const sentence of ['Votre numéro de téléphone', 'Conservé sous cette forme\u00a0: ', 'Modifier mon numéro', 'Supprimer mon numéro', '>Ouganda (', '>Allemagne (', 'Rien n’est envoyé à ce numéro\u00a0: aucun service de messagerie n’est relié à cette plateforme.']) {
    assert.ok(fr.includes(sentence), `French phone card lacks "${sentence}"`);
  }
  assert.ok(fr.indexOf('>Allemagne (') < fr.indexOf('>France ('), 'the French list is not in French order');

  // ------------------------------------------ Persian: its own names and order
  const persian = await page({ 'accept-language': 'fa' });
  const fa = card(persian, 'شمارهٔ تلفن شما');
  for (const sentence of ['شمارهٔ تلفن شما', '>اوگاندا (', 'شمارهٔ مرا تغییر بده']) assert.ok(fa.includes(sentence), `Persian phone card lacks "${sentence}"`);

  // ------------------------------- Hausa: held for review, so English, marked
  const hausa = await page({ 'accept-language': 'ha' });
  assert.match(hausa.match(/<html[^>]*>/)[0], /lang="ha"/);
  assert.match(inner(hausa), /<div class="container section" lang="en" dir="ltr">/);
  const ha = card(hausa, 'Your phone number');
  for (const sentence of ['Your phone number', 'Change my number', '>Uganda (']) assert.ok(ha.includes(sentence), `the held-language phone card lacks "${sentence}"`);

  // ---------------------------- off, with a number stored: seen, and removable
  state.enabled = false;
  const paused = await page({ 'accept-language': 'en' });
  const pa = card(paused, 'Your phone number');
  assert.ok(pa !== '', 'a number is stored and its owner is shown no card');
  for (const sentence of ['Phone numbers are not being collected at the moment. Your number is kept until you remove it.', 'Remove my number', '<strong><bdi dir="ltr">+256 772 123456</bdi></strong>']) assert.ok(pa.includes(sentence), `the paused card lacks "${sentence}"`);
  for (const absent of ['<select', '<input', 'Save my number', 'Change my number']) assert.ok(!pa.includes(absent), `the paused card offers "${absent}"`);
  state.enabled = true;

  assert.equal(writes().length, 0, 'opening the account page wrote something');
  console.log('Phone card: none while the switch is off and nothing is stored; English with 245 countries in English order; Arabic, French and Persian with their own country names and order, the number left to right; English and marked for Hausa; with the switch off and a number stored, the number and only a remove button.');

  // -------------------------------------------------------------------- route
  const post = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/account/phone`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: response.status, text, json, cache: response.headers.get('cache-control') };
  };
  const clean = (answer, label) => {
    assert.equal(answer.cache, 'no-store', `${label}: an answer a cache may keep`);
    for (const words of DATABASE_WORDS) assert.ok(!answer.text.toLowerCase().includes(words.toLowerCase()), `${label}: the answer carries the database's "${words}"`);
  };
  {
    const before = writes().length;
    const signedOut = await post({ phone: '0772 123 456', country: 'UG' }, {});
    assert.equal(signedOut.status, 401); assert.equal(signedOut.json.code, 'signed_out'); clean(signedOut, 'signed out');
    for (const [label, body] of [['not JSON', '{'], ['a list', '[]'], ['no number', { country: 'UG' }], ['a number that is not text', { phone: 256772123456, country: 'UG' }], ['no country', { phone: '0772 123 456' }], ['clear that is not true', { clear: 'yes' }]]) {
      const answer = await post(body);
      assert.equal(answer.status, 400, label); assert.equal(answer.json.code, 'malformed', label); clean(answer, label);
    }
    assert.equal(writes().length, before, 'a request the route refused itself reached the database');
    const get = await request('/api/account/phone', { cookie });
    assert.equal(get.status, 405);
  }
  const NAMED = {
    empty: [400, 'empty', {}], country: [400, 'country', {}], no_dial: [400, 'no_dial', {}], letters: [400, 'letters', {}], plus: [400, 'plus', {}], punctuation: [400, 'punctuation', {}],
    other_country: [400, 'other_country', { begins: '+447', dial: '+256' }],
    length: [400, 'length', { min: 9, max: 9, count: 8 }],
    range: [400, 'length', { min: 4, max: 13, count: 3 }],
    signed_out: [401, 'signed_out', {}], off: [409, 'off', {}], trigger: [409, 'refused', {}], unknown_words: [409, 'refused', {}],
    timeout: [502, 'failed', {}], gateway: [502, 'failed', {}], no_reply: [502, 'failed', {}], word: [502, 'failed', {}], liar: [502, 'failed', {}],
  };
  for (const [answer, [status, code, parts]] of Object.entries(NAMED)) {
    state.answer = answer;
    const got = await post({ phone: '0772 123 456', country: 'UG' });
    assert.equal(got.status, status, `${answer}: ${got.text}`);
    assert.equal(got.json.ok, false); assert.equal(got.json.code, code, answer);
    const { ok: _ok, code: _code, message: _message, ...carried } = got.json;
    assert.deepEqual(carried, parts, `${answer}: what travelled beside the name`);
    clean(got, answer);
  }
  {
    // Removing: the same names; a number still there after a removal is not believed.
    state.answer = 'liar';
    const lied = await post({ clear: true });
    assert.equal(lied.status, 502); assert.equal(lied.json.code, 'failed'); clean(lied, 'a removal answered with a number');
    state.answer = 'signed_out';
    const out = await post({ clear: true });
    assert.equal(out.status, 401); assert.equal(out.json.code, 'signed_out');
  }
  {
    state.answer = 'ok'; state.stored = null;
    const saved = await post({ phone: '0772 123 456', country: 'UG' });
    assert.equal(saved.status, 200); assert.equal(saved.cache, 'no-store');
    assert.deepEqual(saved.json, { ok: true, phoneE164: '+256772123456', phoneCountry: 'UG' });
    assert.deepEqual(writes().at(-1).sent, { p_phone: '0772 123 456', p_country: 'UG' }, 'what was typed is not what was sent');
    // Digits of another script are sent as the ten the database reads; nothing else is touched.
    await post({ phone: '۰۷۷۲ (۱۲۳) ۴۵۶', country: 'UG' });
    assert.deepEqual(writes().at(-1).sent, { p_phone: '0772 (123) 456', p_country: 'UG' });
    await post({ phone: '＋২৫৬ ৭৭২ ১২৩ ৪৫৬ x', country: 'UG' });
    assert.deepEqual(writes().at(-1).sent, { p_phone: '+256 772 123 456 x', p_country: 'UG' });
    const cleared = await post({ clear: true });
    assert.equal(cleared.status, 200);
    assert.deepEqual(cleared.json, { ok: true, phoneE164: null, phoneCountry: null });
    assert.equal(writes().at(-1).path, '/rest/v1/rpc/clear_my_phone');
  }
  console.log('Phone route: signed out 401; six requests it does not understand 400 "malformed", none of which asked the database; GET 405. The eleven things the database raises each under their own name with only digits beside it; a trigger refusal and unknown words under a known state 409 "refused"; an unknown state, a gateway page, an empty reply, a word and a reply that contradicts the request 502 "failed". No answer carries a sentence of the database and every answer is no-store. Digits of another script are sent as ASCII.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', deviceScaleFactor: process.env.RESPONSIVE_SCREENSHOTS ? 2 : 1 });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      tab.on('console', (m) => { if (m.type() === 'error' && /hydrat/i.test(m.text())) errors.push(m.text()); });
      await tab.goto(`${origin}/account`, { waitUntil: 'networkidle' });
      return { context, tab, errors };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 40)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
      assert.equal(spill, 0, `${label}: a card's contents are wider than the card`);
    };
    const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.locator('section:has(#account-phone-country), section:has(#account-phone)').first().screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png` }).catch(() => {}); };

    state.answer = 'ok'; state.enabled = true; state.stored = { e164: '+256772123456', country: 'UG' };
    for (const [code, heading] of [['en', 'Your phone number'], ['ar', 'رقم هاتفك'], ['ta', 'உங்கள் தொலைபேசி எண்'], ['fil', 'Ang numero ng iyong telepono']]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await open(code, width);
        await tab.getByRole('heading', { name: heading, exact: true }).waitFor();
        await fits(tab, width, `phone ${code} ${width}`);
        // The field is left to right whatever the page, and the two buttons are in one bar.
        assert.deepEqual(await tab.locator('#account-phone').evaluate((el) => [getComputedStyle(el).direction, getComputedStyle(el).unicodeBidi]), ['ltr', 'bidi-override']);
        const bar = tab.locator('section:has(#account-phone) .page-actions');
        assert.equal(await bar.locator('button').count(), 2, `${code} ${width}: save and remove are not one bar`);
        assert.deepEqual(errors, [], `phone ${code} ${width}: ${errors.join(' | ')}`);
        if ([390, 1440].includes(width)) await shot(tab, `phone-${code}-${width}`);
        await context.close();
      }
      console.log(`Synthetic phone card in ${code}: fits at 320, 390 and 1440px; no hydration error; the field left to right`);
    }

    {
      // Arabic, a phone-sized screen, nothing stored: mistakes named before a request.
      state.stored = null;
      const { context, tab, errors } = await open('ar', 390);
      const posts = []; tab.on('request', (r) => { if (r.url().includes('/api/account/phone')) posts.push(r.postData()); });
      const help = tab.locator('#account-phone-help');
      const save = tab.getByRole('button', { name: 'احفظ رقمي', exact: true });
      const alerts = tab.locator('main').getByRole('alert');
      assert.equal(await help.innerText(), 'اكتبه بأي طريقة تشاء: بمسافات أو بأقواس أو بصفر في أوله أو بعلامة الزائد. يُقرأ بالطريقة نفسها.');
      assert.equal(await save.isDisabled(), true);
      const typed = async (value) => { await tab.locator('#account-phone').fill(value); return (await help.innerText()).replace(/[\u2066-\u2069]/g, ''); };
      assert.equal(await typed('call me'), 'لا يمكن أن يحتوي رقم الهاتف على حروف.');
      assert.equal(await typed('()'), 'اكتب أرقام الهاتف. لا يوجد حتى الآن سوى علامات.');
      assert.equal(await typed('256+772'), 'في الرقم علامة زائد واحدة على الأكثر، وفي أوله فقط.');
      assert.equal(await typed('077212345'), 'عدد الخانات في رقم من هذا البلد بعد رمز البلد: 9. عدد الخانات في هذا الرقم: 8 هذه الخانة المكتوبة في أول الرقم لا تُحسب: 0');
      assert.equal(await typed('+25'), 'عدد الخانات في رقم من هذا البلد بعد رمز البلد: 9. عدد الخانات في هذا الرقم: 0 هذه الخانة المكتوبة في أول الرقم لا تُحسب: 0');
      assert.equal(await typed('+447400123456'), 'بداية هذا الرقم: +4474. بداية أرقام البلد المختار: +256. اختر البلد الذي ينتمي إليه الرقم.');
      // Each code is its own left-to-right island inside the Arabic sentence.
      assert.equal(await help.locator('bdi[dir="ltr"]').count(), 2);
      assert.equal(await save.isDisabled(), true);
      // Germany's numbers have a range, so the sentence with two limits is said.
      await tab.locator('#account-phone-country').selectOption('DE');
      assert.equal(await typed('123'), 'في هذا البلد حدّان لعدد الخانات بعد رمز البلد. الأقل: 4. الأكثر: 13. في هذا الرقم: 3 هذه الخانة المكتوبة في أول الرقم لا تُحسب: 0');
      await tab.locator('#account-phone-country').selectOption('UG');
      assert.equal(posts.length, 0, 'a mistake the card could name was sent');

      // The reader's own digits are a number.
      assert.equal(await typed('٠٧٧٢ ١٢٣ ٤٥٦'), 'سيُحفظ بهذه الصيغة: +256772123456');
      assert.equal(await save.isDisabled(), false);
      await fits(tab, 390, 'phone ar 390 while typing');
      if (process.env.RESPONSIVE_SCREENSHOTS) { await tab.locator('#account-phone').screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/phone-ar-field.png` }); await tab.locator('#account-phone-country').screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/phone-ar-picker.png` }); }

      // The database refuses what the card accepted: its reason, in Arabic.
      state.answer = 'length';
      await save.click();
      await alerts.first().waitFor();
      assert.equal((await alerts.first().innerText()).replace(/[\u2066-\u2069]/g, ''), 'عدد الخانات في رقم من هذا البلد بعد رمز البلد: 9. عدد الخانات في هذا الرقم: 8 هذه الخانة المكتوبة في أول الرقم لا تُحسب: 0');
      assert.equal(await alerts.count(), 1);
      assert.deepEqual(JSON.parse(posts.at(-1)), { phone: '٠٧٧٢ ١٢٣ ٤٥٦', country: 'UG' });
      assert.deepEqual(writes().at(-1).sent, { p_phone: '0772 123 456', p_country: 'UG' });
      for (const [answer, sentence] of [
        ['other_country', 'بداية هذا الرقم: +447. بداية أرقام البلد المختار: +256. اختر البلد الذي ينتمي إليه الرقم.'],
        ['no_dial', 'لا يوجد هنا رمز مسجّل لذلك البلد، ولذلك لا يمكن حفظ رقم منه بعد.'],
        ['off', 'لا تُجمع أرقام الهواتف في الوقت الحالي. لم يتغيّر شيء.'],
        ['signed_out', 'لقد سُجّل خروجك. سجّل الدخول من جديد ثم حاول مرة أخرى. لم يتغيّر شيء.'],
        ['trigger', 'لم تقبل المنصة هذا الرقم. لم يتغيّر شيء.'],
        ['unknown_words', 'لم تقبل المنصة هذا الرقم. لم يتغيّر شيء.'],
        // Nothing is known, so nothing is claimed: not "nothing changed".
        ['timeout', 'لم يصل أي ردّ، ولذلك لا يُعرف هل تغيّر رقمك. أعد تحميل هذه الصفحة لترى ما هو محفوظ.'],
        ['gateway', 'لم يصل أي ردّ، ولذلك لا يُعرف هل تغيّر رقمك. أعد تحميل هذه الصفحة لترى ما هو محفوظ.'],
        ['liar', 'لم يصل أي ردّ، ولذلك لا يُعرف هل تغيّر رقمك. أعد تحميل هذه الصفحة لترى ما هو محفوظ.'],
      ]) {
        state.answer = answer;
        await save.click();
        await tab.waitForFunction((want) => [...document.querySelectorAll('main [role="alert"]')].some((el) => el.textContent.replace(/[\u2066-\u2069]/g, '') === want), sentence, { timeout: 15000 }).catch(async () => { throw new Error(`${answer}: the card says "${await alerts.allInnerTexts()}"`); });
        assert.equal(await alerts.count(), 1, answer);
        assert.equal(await tab.locator('main').getByRole('status').count(), 0, `${answer}: a refusal beside a confirmation`);
      }
      const shown = await tab.locator('main').innerText();
      for (const words of [...DATABASE_WORDS, 'Nothing was changed', 'could not be confirmed']) assert.ok(!shown.includes(words), `the Arabic card shows "${words}"`);
      await shot(tab, 'phone-ar-refused');

      // The request never arrives at all.
      await tab.route('**/api/account/phone', (r) => r.abort());
      await save.click();
      await tab.waitForFunction(() => document.querySelector('main [role="alert"]')?.textContent.startsWith('لم يصل أي ردّ'));
      assert.equal(await save.isDisabled(), false, 'the button stayed busy after a request that never arrived');
      await tab.unroute('**/api/account/phone');

      // Saved: said as a status, the stored line appears, the buttons change.
      state.answer = 'ok';
      await save.click();
      const status = tab.locator('main').getByRole('status');
      await status.waitFor();
      assert.equal(await status.innerText(), 'تم حفظ رقم هاتفك.');
      assert.equal(await alerts.count(), 0);
      await tab.getByRole('button', { name: 'غيّر رقمي', exact: true }).waitFor();
      assert.equal(await tab.locator('#account-phone').inputValue(), '+256772123456', 'the field does not show what was stored');
      assert.equal((await tab.locator('section:has(#account-phone) strong').first().innerText()).replace(/[\u2066-\u2069]/g, ''), '+256 772 123456');
      await fits(tab, 390, 'phone ar 390 after saving');
      await shot(tab, 'phone-ar-saved');

      // Removed.
      await tab.getByRole('button', { name: 'احذف رقمي', exact: true }).click();
      await tab.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent === 'تم حذف رقم هاتفك.');
      await tab.getByRole('button', { name: 'احفظ رقمي', exact: true }).waitFor();
      assert.equal(await tab.getByRole('button', { name: 'احذف رقمي', exact: true }).count(), 0);
      assert.equal(await tab.locator('#account-phone').inputValue(), '');
      assert.equal(writes().at(-1).path, '/rest/v1/rpc/clear_my_phone');
      assert.deepEqual(errors, [], errors.join(' | '));
      await context.close();
      console.log('Synthetic phone card in Arabic at 390px: letters, signs, a stray plus, a short number, a code half typed, another country and a range each named before a request; Arabic-Indic digits read as a number and sent as ASCII; nine answers of the database each said in Arabic, an unknown one never as "nothing changed"; a request that never arrived said as unknown; saved and removed said as a status');
    }

    {
      // Persian at a desk: counts in Persian digits, the codes still Latin and left to right.
      state.stored = null; state.answer = 'ok';
      const { context, tab, errors } = await open('fa', 1440);
      const help = tab.locator('#account-phone-help');
      await tab.locator('#account-phone').fill('۰۷۷۲۱۲۳۴۵');
      assert.equal((await help.innerText()).replace(/[\u2066-\u2069]/g, ''), 'تعداد رقم‌های شمارهٔ این کشور بعد از کد کشور: ۹. تعداد رقم‌های این شماره: ۸ این رقم که در ابتدای شماره نوشته می‌شود شمرده نمی‌شود: ۰');
      await tab.locator('#account-phone').fill('۰۷۷۲ ۱۲۳ ۴۵۶');
      assert.equal((await help.innerText()).replace(/[\u2066-\u2069]/g, ''), 'به این شکل نگه داشته خواهد شد: +256772123456');
      await fits(tab, 1440, 'phone fa 1440');
      await shot(tab, 'phone-fa-1440');
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic phone card in Persian at 1440px: counts in Persian digits, Persian digits read as a number');
    }

    {
      // The switch off, a number stored: it can be seen and taken away, and nothing else.
      state.enabled = false; state.stored = { e164: '+256772123456', country: 'UG' }; state.answer = 'ok';
      const { context, tab, errors } = await open('sw', 390);
      await tab.getByRole('heading', { name: 'Namba yako ya simu', exact: true }).waitFor();
      const section = tab.locator('section:has(h2:text-is("Namba yako ya simu"))');
      assert.ok((await section.innerText()).includes('Namba za simu hazikusanywi kwa sasa. Namba yako inabaki imehifadhiwa hadi utakapoiondoa.'));
      assert.equal(await section.locator('select, input').count(), 0);
      assert.equal(await section.locator('button').count(), 1);
      await fits(tab, 390, 'phone sw 390 paused');
      await shot(tab, 'phone-sw-paused');
      // A removal that is not answered is not said to have happened.
      state.answer = 'gateway';
      await section.getByRole('button', { name: 'Ondoa namba yangu', exact: true }).click();
      await section.getByRole('alert').waitFor();
      assert.equal(await section.getByRole('alert').innerText(), 'Hakuna jibu lililofika, kwa hiyo haijulikani kama namba yako imebadilika. Pakia upya ukurasa huu ili uone kilichohifadhiwa.');
      assert.equal(await section.locator('button').count(), 1, 'the button went away after a removal nobody confirmed');
      state.answer = 'ok';
      await section.getByRole('button', { name: 'Ondoa namba yangu', exact: true }).click();
      await section.getByRole('status').waitFor();
      assert.equal(await section.getByRole('status').innerText(), 'Namba yako ya simu imeondolewa.');
      assert.equal(await section.getByRole('alert').count(), 0);
      assert.equal(await section.locator('button').count(), 0);
      assert.equal(await section.locator('strong').count(), 0, 'the number is still shown after it was removed');
      assert.equal(state.stored, null);
      assert.deepEqual(errors, []);
      await context.close();
      state.enabled = true;
      console.log('Synthetic phone card in Swahili with the switch off and a number stored: the number and one button; an unanswered removal said as unknown and the button kept; removed, said as a status, the number and the button gone');
    }
  }
  console.log('Phone HTTP smoke passed. Not real Auth, RLS or a real number: the stand-in normalises and stores nothing, and the switch is off in the product.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
