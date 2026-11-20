// The real Next /sponsor and /sponsor/apply pages, and the route behind their
// two buttons, against an entirely synthetic loopback Auth/REST API. This is
// not evidence about hosted Supabase, JWT validation, RLS, a request, a
// pledge or a seat: the stand-in answers whatever it is told to and nobody is
// sponsored. What the database does is proved by its own suites.
//
// Sponsoring a seat is behind `commerce.sponsorship`, which is off. The
// stand-in reports the switch as it is told to; nothing here switches it on.
//
// What it does show: both pages in the reader's own language (English,
// Arabic, French) and in English, marked, for a language held for review; a
// price in major units (it was printed as stored: 19.99 read as 1999); a
// course's audience and difficulty said from the catalogue and a value the
// page has no word for left out; a pool or a list that could not be read
// said as that and not as empty; the switch off said, with nothing offered;
// every refusal of taking a seat and of asking under its own name and status
// with none of the database's words; no amount taken from the browser; and,
// with a browser, that both pages fit a phone and that each form says what
// happened in the reader's language. The expected sentences are typed here
// rather than imported, so this fails if a catalogue changes without anybody
// looking at the page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;

const LEARNER = '66666666-6666-4666-8666-666666666666';
const CHILD = '22222222-2222-4222-8222-222222222222';
const COURSE = '11111111-1111-4111-8111-111111111111';
// A sentence only the database would write. It must reach no reader and no reply.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE new row violates check constraint "sa_reason"';

const POOL = {
  enabled: true,
  seats: [
    { seatCode: 'SPN-AB12CD', courseTitle: 'Tajwid <for> beginners', courseSlug: 'tajwid', audience: 'child', difficulty: 'beginner', approvedAt: '2026-11-10T09:00:00Z', price: { amountMinor: 1999, currencyCode: 'USD' } },
    { seatCode: 'SPN-EF34GH', courseTitle: 'Fiqh of prayer', courseSlug: 'fiqh', audience: 'adult', difficulty: 'advanced', approvedAt: '2026-11-11T09:00:00Z', price: { amountMinor: '50000', currencyCode: 'UGX' } },
    // No price where this reader is; an audience of both; a difficulty the page has no word for.
    { seatCode: 'SPN-IJ56KL', courseTitle: 'سيرة النبي', courseSlug: null, audience: 'both', difficulty: 'expert', approvedAt: '2026-11-12T09:00:00Z', price: { reason: 'no_price_for_country' } },
    // A price that is not an amount.
    { seatCode: 'SPN-MN78OP', courseTitle: null, courseSlug: null, audience: 'grown-ups', difficulty: null, approvedAt: null, price: { amountMinor: '19.99', currencyCode: 'USD' } },
    // A seat nobody can name is not drawn.
    { courseTitle: 'No code', price: { amountMinor: 100, currencyCode: 'USD' } },
  ],
};

const fresh = () => ({
  on: true,
  // 'ok', 'off', 'none', 'timeout', 'word'
  pool: 'ok',
  // The two lists the asking page reads: rows, or 'broken'.
  learners: [{ id: LEARNER, display_name: 'Halima <Probe>', linked_user_id: user.id, family_id: null }, { id: CHILD, display_name: 'يوسف', linked_user_id: null, family_id: 'f' }],
  courses: [{ id: COURSE, title: 'Tajwid <for> beginners', audience: 'child' }, { id: '33333333-3333-4333-8333-333333333333', title: 'سيرة النبي', audience: 'both' }],
  // What each writer answers: 'ok', or [status, body].
  apply: 'ok', pledge: 'ok',
});
let state = fresh();
const calls = [];
const refusal = (key, code = 'P0001', status = 400) => [status, { code, message: `sponsorship:${key}`, details: null, hint: null }];
const noAnswer = [503, { message: 'SYNTHETIC-DATABASE upstream connect error' }];

const fake = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const json = { 'content-type': 'application/json' };
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{"message":"not authenticated"}'); return; }
    res.writeHead(200, json); res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  let sent = null; try { sent = JSON.parse(body); } catch { /* no body */ }
  calls.push({ method: req.method, path, sent });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  const broken = () => send({ code: '57014', message: 'SYNTHETIC-DATABASE canceling statement due to statement timeout', details: null, hint: null }, 500);
  const writer = (how, good) => { if (how === 'ok') send(good); else send(how[1], how[0]); };
  if (path === '/rest/v1/rpc/setting_bool') send(sent?.p_key === 'commerce.sponsorship' && state.on);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Halima Probe', preferred_language: 'en', timezone: 'Africa/Kampala', account_status: 'active' }]);
  else if (path === '/rest/v1/rpc/sponsorship_pool') {
    if (state.pool === 'ok') send(POOL);
    else if (state.pool === 'off') send({ enabled: false, reason: 'disabled', seats: [] });
    else if (state.pool === 'none') send({ enabled: true, seats: [] });
    else if (state.pool === 'word') send('SYNTHETIC not a pool');
    else broken();
  }
  else if (path === '/rest/v1/learner_profiles') { if (state.learners === 'broken') broken(); else send(state.learners); }
  else if (path === '/rest/v1/courses') { if (state.courses === 'broken') broken(); else send(state.courses); }
  else if (path === '/rest/v1/rpc/apply_for_sponsorship') writer(state.apply, { applicationId: 'app-1', status: 'submitted' });
  else if (path === '/rest/v1/rpc/pledge_sponsorship') writer(state.pledge, { sponsorshipId: 'sp-1', status: 'pledged', seatCode: sent?.p_seat_code, amountMinor: 1999, currencyCode: 'USD' });
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
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'');
  const get = async (path, language = 'en', signedIn = true) => {
    const response = await fetch(`${origin}${path}`, { headers: { ...(signedIn ? { cookie } : {}), 'accept-language': language, 'x-vercel-ip-country': 'UG' }, redirect: 'manual', signal: AbortSignal.timeout(90000) });
    const html = await response.text();
    return { status: response.status, main: response.status === 200 ? inner(html) : '', location: response.headers.get('location'), html };
  };
  const has = (text, pieces, label) => { for (const piece of pieces) assert.ok(text.includes(piece), `${label} lacks: ${piece}`); };
  const none = (text, words, label) => { for (const word of words) assert.ok(!text.includes(word), `${label} says "${word}"`); };
  const rpcs = (name) => calls.filter((c) => c.path === `/rest/v1/rpc/${name}`);
  // English a page in another language must not say.
  const ENGLISH = ['Sponsoring', 'Pay for somebody', 'What you see', 'What you pay', 'Seats waiting', 'For a child', 'For an adult', 'Beginner', 'Advanced', 'The price of this course', 'A note for staff', '(optional)', 'Sponsor this seat', 'Nothing is taken', 'Asking for a seat', 'Ask for a sponsored seat', 'Browse the courses', 'Which course', 'Choose a course', 'What is the situation', 'Ask for this seat', 'Who is this for', 'scholar’s ruling'];

  // ================================================================ the pool
  {
    // Signed out: what this is, a way to sign in, and the pool is not read.
    state = fresh(); calls.length = 0;
    let seen = await get('/sponsor', 'en', false);
    assert.equal(seen.status, 200, logs.slice(-2000));
    has(seen.main, ['<h1>Pay for somebody else’s course</h1>', 'What you see, and what you do not', 'Taking a seat is a pledge and takes no money.', '<div class="notice" data-pool="signed-out">The seats are shown to people who are signed in. <a href="/sign-in?next=/sponsor">Sign in</a></div>', 'Ask for a sponsored seat', 'Browse the courses', 'zakat, sadaqah or neither'], 'the page, signed out');
    none(seen.main, ['No seat is waiting', 'could not be read', 'SPN-', 'No card or mobile-money provider'], 'the page, signed out');
    assert.equal(rpcs('sponsorship_pool').length, 0, 'the pool was read for nobody');

    // Signed in.
    calls.length = 0;
    seen = await get('/sponsor');
    assert.equal(seen.status, 200, logs.slice(-2000));
    assert.deepEqual(rpcs('sponsorship_pool').map((c) => c.sent), [{ p_country: 'UG' }]);
    has(seen.main, [
      // A title somebody typed is text, and set apart.
      '<bdi>Tajwid &lt;for&gt; beginners</bdi>', 'Seat: <bdi dir="ltr">SPN-AB12CD</bdi>',
      // 19.99, not 1999; and who it is for and how hard, from the catalogue.
      '<bdi dir="ltr">USD 19.99</bdi>', 'For a child · Beginner', '<bdi dir="ltr">UGX 50000</bdi>', 'For an adult · Advanced',
      'The price of this course where you are. It is the seat that is sponsored, not a gift card.',
      '<label class="field" for="note-SPN-AB12CD"><span>A note for staff, if you want one (optional)</span></label>', 'Sponsor this seat', 'Nothing is taken until you pay. The seat opens when the payment is confirmed.',
      // No price here: shown, and cannot be taken. A difficulty with no word is left out; "all ages" is the catalogue's.
      '<bdi>سيرة النبي</bdi>', 'All ages', 'This course has no price where you are, so this seat cannot be taken from here.',
      // A price that is not an amount: said, and cannot be taken. A course with no title is "A course".
      'A course', 'The price of this seat could not be read, so it cannot be taken just now.',
    ], 'the pool');
    none(seen.main, ['USD 1999', '19.99</bdi> ·', 'expert', 'grown-ups', '>child<', '>adult<', 'No code', 'beginner<', 'No card or mobile-money provider', 'whatever means', 'placeholder='], 'the pool');
    assert.equal(seen.main.split('data-seat=').length - 1, 4, 'seats drawn');
    // Two seats can be taken, two cannot: two buttons and two notes.
    assert.equal(seen.main.split('<button').length - 1, 2); assert.equal(seen.main.split('id="note-').length - 1, 2);

    // Switched off, none, and unread are three different things.
    state.pool = 'off';
    seen = await get('/sponsor');
    has(seen.main, ['<div class="notice warn" data-pool="off">Sponsoring a seat is switched off at the moment, so no seat can be taken and none can be asked for.</div>'], 'the pool, off');
    none(seen.main, ['SPN-', 'No seat is waiting', 'could not be read'], 'the pool, off');
    state.pool = 'none';
    seen = await get('/sponsor');
    has(seen.main, ['<p class="empty" data-pool="none">No seat is waiting for a sponsor right now. A request appears here once staff approve it.</p>'], 'the pool, none');
    for (const how of ['timeout', 'word']) {
      state.pool = how;
      seen = await get('/sponsor');
      has(seen.main, ['<div class="notice error" role="alert" data-pool="unread">The seats could not be read. Nothing has been charged and no seat was taken.</div>'], `the pool, ${how}`);
      none(seen.main, ['No seat is waiting', 'SYNTHETIC', 'statement timeout', 'switched off'], `the pool, ${how}`);
    }
    state = fresh();

    // Arabic, French, and Hausa (held: English, whole, marked).
    seen = await get('/sponsor', 'ar');
    has(seen.main, ['<h1>ادفع ثمن دورة لغيرك</h1>', 'ما تراه وما لا تراه', 'المقعد: <bdi dir="ltr">SPN-AB12CD</bdi>', '<bdi dir="ltr">USD 19.99</bdi>', 'لطفل', 'اكفل هذا المقعد', 'ليس لهذه الدورة ثمن في بلدك، فلا يمكن أخذ هذا المقعد من هنا.'], 'the Arabic pool');
    none(seen.main, [...ENGLISH, 'lang="en"'], 'the Arabic pool');
    seen = await get('/sponsor', 'fr');
    // French puts a no-break space before a colon and a semicolon.
    has(seen.main, ['<h1>Payer le cours de quelqu’un d’autre</h1>', 'Vous choisissez une place\u00a0; l’apprenant reçoit le cours.', 'Parrainer cette place', 'Pour un enfant'], 'the French pool');
    none(seen.main, ENGLISH, 'the French pool');
    seen = await get('/sponsor', 'ha');
    assert.match(seen.main, /<div class="container section" lang="en" dir="ltr">/, 'Hausa is not given the English page, marked');
    has(seen.main, ['<h1>Pay for somebody else’s course</h1>', 'Sponsor this seat'], 'the Hausa pool');
  }
  console.log('Sponsors’ pool: signed out says what this is and reads no pool; signed in draws four seats with a price in major units (USD 19.99), the audience and difficulty from the catalogue and a value with no word left out, and offers two of them (one has no price here, one a price that is not an amount); switched off, none waiting and unread are said as three different things, the last aloud and without the database’s words; Arabic and French by the reader’s choice, Hausa in English, marked.');

  // ================================================================== asking
  {
    state = fresh(); calls.length = 0;
    const out = await fetch(`${origin}/sponsor/apply`, { redirect: 'manual', signal: AbortSignal.timeout(90000) });
    assert.equal(out.status, 307); assert.match(out.headers.get('location') ?? '', /\/sign-in\?next=\/sponsor\/apply/);

    let seen = await get('/sponsor/apply');
    assert.equal(seen.status, 200, logs.slice(-2000));
    has(seen.main, [
      '<h1>Ask for a sponsored seat</h1>', 'If a course is out of reach, write a few sentences about the situation.',
      '<label for="apply-learner">Who is this for?</label>', '<label for="apply-course">Which course?</label>', '<option value="" selected="">Choose a course</option>', '<label for="apply-reason">What is the situation?</label>',
      'Read by the staff who decide, and by nobody else. Not shown to whoever pays for the seat.', 'Ask for this seat',
      // Names and titles somebody typed are text.
      'Halima &lt;Probe&gt;', 'يوسف', 'Tajwid &lt;for&gt; beginners',
      'Never your name, your family or what you wrote here.', 'zakat, sadaqah or neither', '<a href="/account/sponsorship">What I have asked for and sponsored</a>',
    ], 'the asking page');
    none(seen.main, ['owner or finance', 'placeholder=', 'A few sentences is enough'], 'the asking page');
    // The box for what somebody writes takes its own direction, and is described by the note under it.
    assert.match(seen.main, /<textarea id="apply-reason" rows="4" dir="auto" maxLength="2000" aria-describedby="apply-reason-note"/);

    // Switched off: said, and no form.
    state.on = false;
    seen = await get('/sponsor/apply');
    has(seen.main, ['<div class="notice warn" data-ask="off">Sponsoring a seat is switched off at the moment, so no seat can be taken and none can be asked for.</div>'], 'asking, off');
    none(seen.main, ['<form', 'apply-reason'], 'asking, off');
    state = fresh();
    // Nobody to ask for, nothing to ask for, and a list nobody could read: three different things.
    state.learners = [];
    seen = await get('/sponsor/apply');
    has(seen.main, ['<div class="notice" data-ask="no-learner">There is no learner on this account yet, so there is nobody to ask for.</div>'], 'asking, no learner');
    state = fresh(); state.courses = [];
    seen = await get('/sponsor/apply');
    has(seen.main, ['<div class="notice" data-ask="no-course">No course is on sale at the moment, so there is nothing to ask for.</div>'], 'asking, no course');
    for (const list of ['learners', 'courses']) {
      state = fresh(); state[list] = 'broken';
      seen = await get('/sponsor/apply');
      has(seen.main, ['<div class="notice error" role="alert" data-ask="unread">That did not work. Nothing was charged and nothing changed.</div>'], `asking, ${list} unread`);
      none(seen.main, ['there is nobody to ask for', 'there is nothing to ask for', 'SYNTHETIC', '<form'], `asking, ${list} unread`);
    }
    state = fresh();
    seen = await get('/sponsor/apply', 'ar');
    has(seen.main, ['<h1>اطلب مقعدًا مكفولًا</h1>', '<label for="apply-course">أي دورة؟</label>', 'اطلب هذا المقعد', 'ما الحال؟'], 'the Arabic asking page');
    none(seen.main, [...ENGLISH, 'lang="en"'], 'the Arabic asking page');
    seen = await get('/sponsor/apply', 'ha');
    assert.match(seen.main, /<div class="container section" lang="en" dir="ltr">/);
  }
  console.log('Asking for a seat: signed out goes to sign in; the form names its three fields from the catalogue, escapes what somebody typed and lets the reason keep its own direction; switched off is said with no form; nobody to ask for, nothing to ask for and a list that could not be read are three different things; Arabic by the reader’s choice, Hausa in English, marked.');

  // =============================================================== the route
  {
    const send = async (body, signedIn = true) => {
      const response = await fetch(`${origin}/api/sponsorship`, { method: 'POST', headers: { 'content-type': 'application/json', ...(signedIn ? { cookie } : {}) }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const text = await response.text();
      for (const word of ['SYNTHETIC', 'check constraint', 'upstream']) assert.ok(!text.includes(word), `a reply says "${word}"`);
      return { status: response.status, json: JSON.parse(text), cache: response.headers.get('cache-control') };
    };
    const pledge = { action: 'pledge', seatCode: 'SPN-AB12CD', country: 'UG', note: 'For my mother', amountMinor: 1, amount: '0.01', currencyCode: 'USD' };
    const ask = { action: 'apply', learnerProfileId: LEARNER, courseId: COURSE, reason: 'My income changed.' };

    // Taking a seat: the database is sent the code, the country and the note, and no amount.
    state = fresh(); calls.length = 0;
    let answer = await send(pledge);
    assert.equal(answer.status, 200); assert.equal(answer.json.ok, true); assert.equal(answer.cache, 'no-store');
    assert.deepEqual(rpcs('pledge_sponsorship').map((c) => c.sent), [{ p_seat_code: 'SPN-AB12CD', p_country: 'UG', p_note: 'For my mother' }]);
    for (const [key, status, reason] of [['seat_taken', 409, 'gone'], ['seat_not_open', 409, 'gone'], ['seat_not_found', 409, 'gone'], ['own_seat', 409, 'own_seat'], ['no_price_for_you', 409, 'no_price'], ['disabled', 409, 'off'], ['note_too_long', 400, 'too_long'], ['not_signed_in', 401, 'not_signed_in'], ['something_new', 500, 'failed']]) {
      state.pledge = refusal(key);
      answer = await send(pledge);
      assert.equal(answer.status, status, key); assert.equal(answer.json.reason, reason, key); assert.equal(answer.json.ok, false, key); assert.equal(answer.cache, 'no-store', key);
    }
    state.pledge = [400, { code: '23514', message: DATABASE_SENTENCE, details: null, hint: null }];
    answer = await send(pledge);
    assert.equal(answer.status, 500); assert.equal(answer.json.reason, 'failed'); assert.equal(answer.json.message, 'That did not work. Nothing was charged and nothing changed.');
    state.pledge = noAnswer;
    answer = await send(pledge);
    assert.equal(answer.status, 502); assert.equal(answer.json.reason, 'unconfirmed');
    state = fresh(); calls.length = 0;
    answer = await send({ action: 'pledge' });
    assert.equal(answer.status, 400); assert.equal(answer.json.reason, 'malformed'); assert.equal(rpcs('pledge_sponsorship').length, 0);
    answer = await send(pledge, false);
    assert.equal(answer.status, 401); assert.equal(answer.json.reason, 'not_signed_in'); assert.equal(rpcs('pledge_sponsorship').length, 0);

    // Asking.
    answer = await send(ask);
    assert.equal(answer.status, 200); assert.equal(answer.json.ok, true);
    assert.deepEqual(rpcs('apply_for_sponsorship').map((c) => c.sent), [{ p_learner_profile_id: LEARNER, p_course_id: COURSE, p_reason: 'My income changed.' }]);
    for (const [key, status, reason] of [['reason_required', 400, 'reason_required'], ['reason_too_long', 400, 'too_long'], ['learner_required', 400, 'choose'], ['learner_not_yours', 403, 'learner_not_yours'], ['course_not_available', 404, 'no_course'], ['already_has_access', 409, 'has_course'], ['already_asked', 409, 'already_asked'], ['disabled', 409, 'off'], ['something_new', 500, 'failed']]) {
      state.apply = refusal(key);
      answer = await send(ask);
      assert.equal(answer.status, status, key); assert.equal(answer.json.reason, reason, key);
    }
    state.apply = noAnswer;
    answer = await send(ask);
    assert.equal(answer.status, 502); assert.equal(answer.json.reason, 'unconfirmed');
    state = fresh(); calls.length = 0;
    answer = await send({ action: 'apply', learnerProfileId: LEARNER, reason: 'x' });
    assert.equal(answer.status, 400); assert.equal(answer.json.reason, 'choose'); assert.equal(rpcs('apply_for_sponsorship').length, 0);
    // The staff desk's actions keep the shape the staff desk reads.
    answer = await send({ action: 'decide' });
    assert.equal(answer.status, 400); assert.equal(answer.json.ok, false); assert.equal('reason' in answer.json, false);
    assert.equal((await send('{not json')).status, 400);
  }
  console.log('Sponsorship route: taking a seat sends the database the code, the country and the note and no amount; nine refusals of taking and nine of asking each under its own name and status; a refusal nobody named is 500 in this route’s words, and no answer is 502 "unconfirmed"; nothing is asked of the database for a request with no seat, no course or nobody signed in; the staff desk’s actions keep their shape.');

  // ============================================================== a browser
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const shots = process.env.RESPONSIVE_SCREENSHOTS; if (shots) mkdirSync(shots, { recursive: true });
    const open = async (path, code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', extraHTTPHeaders: { 'x-vercel-ip-country': 'UG' } });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: code, url: origin }]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 300)); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > limit + 1 || r.left < -1); }).slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${el.className}`), width);
      assert.ok(scroll <= width + 1, `${label}: scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card, main .notice')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
      assert.equal(spill, 0, `${label}: a card's contents are wider than the card`);
    };
    for (const code of ['en', 'ar', 'ta', 'fil', 'fr']) {
      for (const width of code === 'en' || code === 'ar' ? [320, 390, 1440] : [320]) {
        for (const path of ['/sponsor', '/sponsor/apply']) {
          state = fresh();
          const { context, tab, errors } = await open(path, code, width);
          await tab.locator('main h1').waitFor();
          await fits(tab, width, `${path} ${code} ${width}`);
          assert.equal(await tab.evaluate(() => document.documentElement.dir || 'ltr'), code === 'ar' ? 'rtl' : 'ltr');
          if (path === '/sponsor') assert.equal(await tab.locator('[data-seat="SPN-AB12CD"] bdi[dir="ltr"]').first().evaluate((el) => getComputedStyle(el).direction), 'ltr');
          if (shots && width !== 1440) await tab.screenshot({ path: `${shots}/${path === '/sponsor' ? 'pool' : 'ask'}-${code}-${width}.png`, fullPage: true });
          assert.deepEqual(errors, [], `${path} ${code} ${width}: ${errors.join(' | ')}`);
          await context.close();
        }
      }
      console.log(`Synthetic pool and asking pages in ${code}: fit; a seat code and a price read left to right; no page error`);
    }

    // The pool's button, in English: the seat is taken, and the page says what was pledged and where to look.
    {
      state = fresh(); calls.length = 0;
      const { context, tab, errors } = await open('/sponsor', 'en', 390);
      const card = tab.locator('[data-seat="SPN-AB12CD"]');
      await card.locator('input').fill('For my mother');
      await card.getByRole('button', { name: 'Sponsor this seat', exact: true }).click();
      const said = tab.locator('[data-pool-said="info"]');
      await said.waitFor();
      const text = (await said.textContent()).replace(/\s+/g, ' ').trim();
      assert.equal(text, 'This seat is yours to pay for: USD 19.99Nothing has been taken. Your sponsored seats page says how to pay. What I have asked for and sponsored');
      assert.equal(await said.getAttribute('role'), 'status');
      assert.equal(await said.locator('a').getAttribute('href'), '/account/sponsorship');
      assert.deepEqual(rpcs('pledge_sponsorship').map((c) => c.sent), [{ p_seat_code: 'SPN-AB12CD', p_country: 'UG', p_note: 'For my mother' }]);
      // Somebody else took the next one a moment earlier.
      state.pledge = refusal('seat_taken');
      await tab.locator('[data-seat="SPN-EF34GH"]').getByRole('button', { name: 'Sponsor this seat', exact: true }).click();
      await tab.getByRole('alert').filter({ hasText: 'That seat has just been taken, or is no longer open. Choose another.' }).waitFor();
      // No answer at all: not "failed", and the way to look.
      state.pledge = noAnswer;
      await tab.locator('[data-seat="SPN-EF34GH"]').getByRole('button', { name: 'Sponsor this seat', exact: true }).click();
      const unsure = tab.locator('[data-pool-said="warn"]');
      await unsure.filter({ hasText: 'We could not confirm whether that was recorded. Look at your sponsored seats before trying again.' }).waitFor();
      assert.equal(await unsure.locator('a').getAttribute('href'), '/account/sponsorship');
      for (const word of ['SYNTHETIC', 'did not work']) assert.equal((await tab.locator('main').textContent()).includes(word), false, `the pool says "${word}"`);
      if (shots) await tab.screenshot({ path: `${shots}/pool-en-390-said.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
    }
    // The same in Arabic: the sentence is Arabic and the amount still reads left to right.
    {
      state = fresh();
      const { context, tab, errors } = await open('/sponsor', 'ar', 390);
      await tab.locator('[data-seat="SPN-AB12CD"]').getByRole('button', { name: 'اكفل هذا المقعد', exact: true }).click();
      const said = tab.locator('[data-pool-said="info"]');
      await said.waitFor();
      assert.ok((await said.textContent()).includes('هذا المقعد لك لتدفع ثمنه:'));
      assert.equal(await said.locator('bdi[dir="ltr"]').textContent(), 'USD 19.99');
      assert.equal((await said.textContent()).includes('This seat is yours'), false);
      assert.deepEqual(errors, []);
      await context.close();
    }
    // Asking, in English: sent once, said, and a refusal by its name.
    {
      state = fresh(); calls.length = 0;
      const { context, tab, errors } = await open('/sponsor/apply', 'en', 390);
      const submit = tab.getByRole('button', { name: 'Ask for this seat', exact: true });
      assert.equal(await submit.isDisabled(), true, 'the form can be sent with nothing in it');
      await tab.locator('#apply-course').selectOption(COURSE);
      await tab.locator('#apply-reason').fill('دخلي تغيّر هذا العام.');
      // What was typed in Arabic reads right to left in an English form.
      assert.equal(await tab.locator('#apply-reason').evaluate((el) => getComputedStyle(el).direction), 'rtl');
      await submit.click();
      const done = tab.locator('[data-ask-said="info"]');
      await done.waitFor();
      assert.ok((await done.textContent()).startsWith('Asked. Staff will read it, and the answer, with its reason, will be on your sponsored seats page.'));
      assert.deepEqual(rpcs('apply_for_sponsorship').map((c) => c.sent), [{ p_learner_profile_id: LEARNER, p_course_id: COURSE, p_reason: 'دخلي تغيّر هذا العام.' }]);
      state.apply = refusal('already_asked');
      await tab.locator('#apply-course').selectOption(COURSE);
      await tab.locator('#apply-reason').fill('Again.');
      await submit.click();
      await tab.getByRole('alert').filter({ hasText: 'There is already an open request for this course.' }).waitFor();
      state.apply = [400, { code: '23514', message: DATABASE_SENTENCE, details: null, hint: null }];
      await submit.click();
      await tab.getByRole('alert').filter({ hasText: 'That did not work. Nothing was charged and nothing changed.' }).waitFor();
      assert.equal((await tab.locator('main').textContent()).includes('SYNTHETIC'), false);
      if (shots) await tab.screenshot({ path: `${shots}/ask-en-390-said.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Synthetic forms: taking a seat says what was pledged (USD 19.99) and where to look, a seat somebody else took and an answer that never came each in their own words; in Arabic the sentence is Arabic and the amount reads left to right; asking sends what was typed once, lets Arabic read right to left in an English form, and says a refusal by its name.');
  }
  console.log('Sponsors’ pool HTTP smoke passed. Not real Auth, RLS, a request, a pledge or a seat: the stand-in sponsors nobody, and the switch is off in the product.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close().catch(() => {});
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
