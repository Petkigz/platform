// Real Next /subscriptions page and /api/subscriptions route against an
// entirely synthetic loopback Auth/REST API. This is not evidence about
// hosted Supabase, JWT validation, RLS, or the rules inside
// cancel_subscription() and allocate_subscription_learner(): the stand-in
// answers whatever it is asked, and refuses only when this script tells it
// to. No money exists here.
//
// What it does show: the page a subscriber is sent, in English, in Arabic
// and in English for a language held for review; that the list unread is
// said as unread at status 200 and is not "no plan" or a broken page; that
// anything else unread leaves the cards drawn and says part is missing;
// that what is said about a plan comes from its status and its date and is
// never the stored word; who is offered for a free place; the name and
// status the route gives each of the two writers' refusals; that the
// database's own sentences reach nobody; and that an order never paid is
// cancelled with no reason asked while a paid plan needs one. The expected
// sentences are typed here rather than imported, so this fails if a
// catalogue changes without anybody looking at the page.
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

const RUN = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const WAIT = 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2';
const STOP = 'c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3';
const END = 'd4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4';
const GONE = 'e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5';
const OLD = 'f6f6f6f6-f6f6-4f6f-8f6f-f6f6f6f6f6f6';
const V_FAMILY = '11111111-1111-4111-8111-111111111111';
const V_SOLO = '44444444-4444-4444-8444-444444444444';
const V_OLD = '22222222-2222-4222-8222-222222222222';
const OWN = '66666666-6666-4666-8666-666666666666';
const AISHA = '77777777-7777-4777-8777-777777777777';
const BILAL = '78787878-7878-4787-8787-787878787878';
const SPOUSE = '88888888-8888-4888-8888-888888888888';
const HIDDEN = '89898989-8989-4898-8989-898989898989';
// A sentence only the database would write. It must reach no reader.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE new row for relation "subscriptions" violates check constraint';
const LATER = '2099-03-01T09:30:00Z';
const EARLIER = '2020-01-01T00:00:00Z';
// When each paid period began.
const START = '2026-11-01T08:00:00Z';

const own = { id: OWN, display_name: 'Synthetic learner', learner_type: 'adult', linked_user_id: user.id, age_band: '18+' };
const aisha = { id: AISHA, display_name: 'Aisha', learner_type: 'child', linked_user_id: null, age_band: '8-10' };
const bilal = { id: BILAL, display_name: 'Bilal', learner_type: 'child', linked_user_id: null, age_band: '11-13' };
// Another adult in the family: readable, and not somebody this account can place.
const spouse = { id: SPOUSE, display_name: 'Synthetic spouse', learner_type: 'adult', linked_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' };

const on = (learner, name = learner.display_name) => ({ status: 'active', learner_profile_id: learner.id, slot_type: learner.learner_type, learner_profiles: name === null ? null : { display_name: name, age_band: learner.age_band ?? null } });
// Every plan here belongs to an account in Uganda unless a case says
// otherwise, and was paid for by an order that is still paid: the fourteen
// days the law gives elsewhere are said only where a case asks for them.
const account = (country) => ({ billing_accounts: { billing_country: country }, order_items: { orders: { status: 'paid' } } });
const family = { plans: { name: 'Synthetic family', tier: 'plus' }, plan_versions: { adult_allowance: 1, child_allowance: 2 }, ...account('UG') };
const solo = { plans: { name: 'Synthetic solo', tier: 'basic' }, plan_versions: { adult_allowance: 1, child_allowance: 0 }, ...account('UG') };

const fresh = () => ({
  flags: new Set(['learning.offline']),
  // Newest first, as the page asks for them.
  subscriptions: [
    // Paid and running: the buyer is on it, one child is, one child's place is free.
    { id: RUN, status: 'active', plan_version_id: V_FAMILY, current_period_start: START, current_period_end: LATER, ...family,
      family_plan_allocations: [on(own), on(aisha), { status: 'released', learner_profile_id: BILAL, slot_type: 'child', learner_profiles: { display_name: 'Bilal' } }] },
    // Ordered and not paid.
    { id: WAIT, status: 'pending', plan_version_id: V_SOLO, current_period_start: null, current_period_end: null, ...solo, family_plan_allocations: [] },
    // Cancelled after it was paid: what was paid for stays.
    { id: STOP, status: 'cancelled', plan_version_id: V_SOLO, current_period_start: START, current_period_end: LATER, ...solo,
      // A learner whose name the row policy does not show this reader.
      family_plan_allocations: [{ status: 'active', learner_profile_id: HIDDEN, slot_type: 'adult', learner_profiles: null }] },
    // The period is over. Its row still says active: nothing writes "expired".
    { id: END, status: 'active', plan_version_id: V_SOLO, current_period_start: 'SYNTHETIC-not-a-date', current_period_end: EARLIER, ...solo, family_plan_allocations: [on(own)] },
    // Cancelled before it was ever paid.
    { id: GONE, status: 'cancelled', plan_version_id: V_SOLO, current_period_start: START, current_period_end: null, ...solo, family_plan_allocations: [] },
    // A plan that is no longer on sale: the plain read is shown neither its name nor its places.
    { id: OLD, status: 'active', plan_version_id: V_OLD, current_period_start: START, current_period_end: LATER, plans: null, plan_versions: null, family_plan_allocations: [], ...account('UG') },
  ],
  summary: [{ subscriptionId: OLD, planName: 'Synthetic retired plan', tier: 'basic', adultAllowance: 1, childAllowance: 0 }],
  entitlements: [
    { plan_version_id: V_FAMILY, scope_type: 'catalogue', feature_code: null, subject_areas: { name: 'Synthetic tajwid' }, products: null },
    { plan_version_id: V_FAMILY, scope_type: 'product', feature_code: null, subject_areas: null, products: { name: 'Synthetic Arabic year one' } },
    { plan_version_id: V_FAMILY, scope_type: 'feature', feature_code: 'offline_downloads', subject_areas: null, products: null },
    { plan_version_id: V_FAMILY, scope_type: 'feature', feature_code: 'something_new', subject_areas: null, products: null },
  ],
  learners: [aisha, bilal, own, spouse],
  // Paths that answer with a database error.
  broken: new Set(),
  // What each writer answers: 'ok', false (cancel only), or [status, body].
  cancel: 'ok', allocate: 'ok',
  // How long a writer takes.
  delay: 0,
});
let state = fresh();

const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  const signedIn = req.headers.authorization === `Bearer ${token}`;
  if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(401); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, query: url.search, signedIn });
  const send = (value) => res.end(JSON.stringify(value));
  const q = (name) => url.searchParams.get(name);
  const within = (name, value) => { const asked = q(name); return !asked || asked === `eq.${value}` || (asked.startsWith('in.(') && asked.slice(4, -1).split(',').map((v) => v.replaceAll('"', '')).includes(value)); };
  if (state.broken.has(path)) { res.writeHead(500); send({ code: 'XX000', message: DATABASE_SENTENCE }); return; }
  if (path === '/rest/v1/rpc/setting_bool') { send(state.flags.has(payload.p_key)); return; }
  if (!signedIn) { res.writeHead(401); res.end('{}'); return; }
  if (path === '/rest/v1/subscriptions') {
    const found = state.subscriptions.filter((s) => within('id', s.id));
    // Asked for one row as an object, PostgREST refuses when there is not exactly one.
    if (String(req.headers.accept ?? '').includes('vnd.pgrst.object')) {
      if (found.length === 1) send(found[0]); else { res.writeHead(406); send({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${found.length} rows` }); }
    } else send(found);
  }
  else if (path === '/rest/v1/learner_profiles') send(state.learners);
  else if (path === '/rest/v1/plan_entitlements') send(state.entitlements.filter((e) => within('plan_version_id', e.plan_version_id)));
  else if (path === '/rest/v1/rpc/my_plan_summary') send(state.summary);
  else if (path === '/rest/v1/rpc/allocate_subscription_learner') {
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
    if (state.allocate === 'ok') {
      // What the writer would leave behind, so the page read again shows it.
      const sub = state.subscriptions.find((s) => s.id === payload.p_subscription_id);
      const learner = state.learners.find((l) => l.id === payload.p_learner_profile_id);
      if (sub && learner && !sub.family_plan_allocations.some((a) => a.learner_profile_id === learner.id && a.status === 'active')) sub.family_plan_allocations.push(on(learner));
      send('00000000-0000-4000-8000-000000000001');
    } else { res.writeHead(state.allocate[0]); send(state.allocate[1]); }
  }
  else if (path === '/rest/v1/rpc/cancel_subscription') {
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
    if (state.cancel === 'ok') {
      const sub = state.subscriptions.find((s) => s.id === payload.p_subscription_id);
      const changed = Boolean(sub) && sub.status !== 'cancelled';
      if (sub) sub.status = 'cancelled';
      send(changed);
    } else if (state.cancel === false) send(false);
    else { res.writeHead(state.cancel[0]); send(state.cancel[1]); }
  }
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else { res.writeHead(404); res.end('{}'); }
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = resolve(import.meta.dirname, '..');
const rpcs = (name) => calls.filter((c) => c.path === `/rest/v1/rpc/${name}`);
const refusal = (status, code, message) => [status, { code, message, details: null, hint: null }];
const noAnswer = [503, { message: 'SYNTHETIC-DATABASE upstream connect error' }];

const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const seen = { logs: '' };
const origin = `http://localhost:${port}`;

// The page itself: what is inside <main>, without the scripts Next adds, the
// comments React puts between two pieces of text, or the entity it writes an
// apostrophe as.
const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'');
const has = (html, sentences, what) => { for (const sentence of sentences) assert.ok(html.includes(sentence), `${what} lacks "${sentence}"\n${html.slice(0, 6000)}`); };
const hasNot = (html, sentences, what) => { for (const sentence of sentences) assert.ok(!html.includes(sentence), `${what} still says "${sentence}"`); };
const date = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: 'UTC' }).format(new Date(iso));
// One card, from its marker to the end of its article.
const card = (html, id) => { const from = html.indexOf(`data-sub="${id}"`); assert.ok(from > 0, `no card for ${id}`); return html.slice(from, html.indexOf('</article>', from)); };
// English a translated page must not hold. (`Basic` and `Plus` are the
// shelves' names and are marked as English; a plan's own name is its own.)
const ENGLISH_ONLY = ['VIP package', 'opens the lessons', 'Your plans', 'Each plan', 'could not be read', 'no plan', 'no longer on sale', 'Waiting for payment', 'Runs until', 'Ended', 'Cancelled', 'Paid for', 'Learning on', 'Nobody', 'A learner', 'Add a learner', 'Add to this plan', 'Every place', 'Cancel this', 'Cancelling', 'Why are you', 'Places for', 'What it opens', 'Every course', 'Saving lessons', 'Choose a learner', '(child)', 'Subscriptions', 'My family', '>Plans<', 'In a place', 'comes with', 'Compare the plans', 'Ages ', '· Adult'];
// What the database calls things. None of it is a sentence.
const STORED = ['offline_downloads', 'something_new', 'catalogue', 'SYNTHETIC-DATABASE', 'pending', 'past_due', 'trialing', '>active', 'active<', 'cancelled', 'expired', 'released', 'Bilal</bdi>'];
const PAGE = '/subscriptions';
const UNPAID = 'Cancelled by the buyer before payment. No reason was asked for.';

let browser;
try {
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${seen.logs}`)), 60000);
    const receive = (chunk) => { seen.logs += chunk.toString(); if (seen.logs.includes('Ready in')) { clearTimeout(timeout); resolveReady(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (e) => { clearTimeout(timeout); reject(e); });
    next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${seen.logs}`)); });
  });

  const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  const page = async (headers = {}) => { const response = await request(PAGE, { cookie, ...headers }); assert.equal(response.status, 200, `${PAGE}\n${seen.logs.slice(-2000)}`); return inner(await response.text()); };
  const send = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/subscriptions`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    assert.equal(text.includes('SYNTHETIC'), false, `the route passed on a sentence that is not its own: ${text}`);
    return { status: response.status, json: JSON.parse(text) };
  };
  const expect = (answer, status, reason, what) => {
    assert.equal(answer.status, status, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(answer.json.ok, false, what);
    assert.equal(answer.json.reason, reason, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(typeof answer.json.message, 'string', what);
    assert.deepEqual(Object.keys(answer.json).sort(), ['message', 'ok', 'reason'], what);
  };

  // ------------------------------------------------------------- signed out
  const out = await request(PAGE);
  assert.equal(out.status, 307); assert.equal(out.headers.get('location'), '/sign-in?next=/subscriptions');

  // ---------------------------------------------------- not read is not none
  // The list itself: one sentence, at status 200, and not the "this page broke" screen.
  state.broken = new Set(['/rest/v1/subscriptions']);
  const unread = await page({ 'accept-language': 'en' });
  has(unread, ['<p class="eyebrow">Subscriptions</p>', '<h1>Your plans</h1>', 'data-subs-state="unread"', 'role="alert"', 'Your plans could not be read just now. This does not mean you have none. Try again in a moment.', '<a href="/plans">Plans</a>'], 'the page with the list unread');
  hasNot(unread, ['SYNTHETIC', 'There is no plan', 'data-sub='], 'the page with the list unread');
  has(await page({ 'accept-language': 'ar' }), ['تعذّرت قراءة خططك الآن. هذا لا يعني أنه لا توجد لديك خطط. حاول مرة أخرى بعد قليل.'], 'the unread page in Arabic');
  // A row the page cannot make sense of is the list unread too, not a card with a stored word on it.
  state = fresh(); state.subscriptions[0].status = 'SYNTHETIC-STATUS';
  has(await page({ 'accept-language': 'en' }), ['data-subs-state="unread"'], 'the page with a status it does not know');
  state = fresh();

  // Anything else unread: the cards are drawn without it, and the page says part is missing.
  const PART = 'Part of this page could not be read just now, so some of it is missing. Try again in a moment.';
  state.broken = new Set(['/rest/v1/learner_profiles']);
  let part = await page({ 'accept-language': 'en' });
  has(part, ['data-subs-state="partial"', PART, 'data-subs-state="open"', '<h2 dir="auto">Synthetic family</h2>', 'data-sub-cancel="plan"'], 'the page with the learners unread');
  hasNot(part, ['data-sub-add', 'SYNTHETIC-DATABASE'], 'the page with the learners unread');
  state.broken = new Set(['/rest/v1/plan_entitlements']);
  part = await page({ 'accept-language': 'en' });
  has(part, ['data-subs-state="partial"', PART, 'data-sub-add', 'Places for children: 2'], 'the page with what plans open unread');
  hasNot(part, ['What it opens', 'Synthetic tajwid'], 'the page with what plans open unread');
  // The summary is only missed by a plan the plain read could not name.
  state.broken = new Set(['/rest/v1/rpc/my_plan_summary']);
  part = await page({ 'accept-language': 'en' });
  has(part, ['data-subs-state="partial"', PART, '<h2>A plan that is no longer on sale</h2>'], 'the page with the summary unread');
  hasNot(part, ['Synthetic retired plan'], 'the page with the summary unread');
  state.subscriptions = state.subscriptions.filter((s) => s.id !== OLD);
  hasNot(await page({ 'accept-language': 'en' }), ['data-subs-state="partial"'], 'the page with the summary unread and nothing that needs it');
  state = fresh();
  // The switch for saving lessons unread is treated as off: not promised, and nothing is said to be missing.
  state.broken = new Set(['/rest/v1/rpc/setting_bool']);
  part = await page({ 'accept-language': 'en' });
  hasNot(part, ['Saving lessons', 'data-sub-plus', 'data-subs-state="partial"'], 'the page with the offline switch unread');
  state = fresh();

  // ------------------------------------------------------------------ no plan
  state.subscriptions = [];
  calls.length = 0;
  const none = await page({ 'accept-language': 'en' });
  has(none, ['data-subs-state="none"', 'There is no plan on this account.', '<a href="/plans">Plans</a> · <a href="/family">My family</a>'], 'the page with no plan');
  hasNot(none, ['data-subs-state="partial"'], 'the page with no plan');
  assert.equal(calls.some((c) => c.path === '/rest/v1/plan_entitlements'), false, 'what plans open was asked for with no plan');
  state = fresh();

  // ---------------------------------------------------------------- the page
  calls.length = 0;
  const en = await page({ 'accept-language': 'en' });
  // It does not ask whether plans are on sale: somebody who has one keeps the page.
  assert.deepEqual([...new Set(rpcs('setting_bool').map((c) => c.payload.p_key))], ['learning.offline'], 'the page read a switch it should not depend on');
  const later = date('en', LATER);
  const start = date('en', START);
  const PLUS_ADDS = '<p class="muted sub-plus" data-sub-plus="true">Saving lessons in the app, to watch with no connection, comes with: <bdi lang="en" dir="ltr">Plus</bdi> <a href="/plans">Compare the plans</a></p>';
  has(en, ['<div class="page">', '<p class="lede">Each plan on your account: what it opens, who is learning on it and when it ends.</p>', 'data-subs-state="open"',
    // What the two shelves are, in the plans page's sentence: a Basic subscriber is told what Plus is.
    '<p class="muted"><bdi lang="en" dir="ltr">Basic</bdi> opens the lessons. <bdi lang="en" dir="ltr">Plus</bdi> is the VIP package: the same lessons, and more besides. Each plan lists what it opens.</p>'], 'the page');
  hasNot(en, [...STORED, 'data-subs-state="partial"', 'Synthetic spouse'], 'the page');
  assert.equal(en.split('<article').length - 1, 6);

  // Paid and running.
  const run = card(en, RUN);
  has(run, [
    'data-standing="running"',
    '<p class="eyebrow"><bdi lang="en" dir="ltr">Plus</bdi></p><h2 dir="auto">Synthetic family</h2>',
    // Both ends of the paid period.
    `<p class="sub-standing">Runs until: <bdi>${later}</bdi></p><p class="muted sub-from">Paid for from: <bdi>${start}</bdi></p>`,
    // Which kind of place each is in, and a child's ages.
    '<h3 class="eyebrow">Learning on this plan</h3><ul class="plan-lines" data-sub-learners="true"><li>In a place for an adult: <bdi>Synthetic learner</bdi></li><li>In a place for a child: <bdi>Aisha</bdi><span class="muted sub-band"> · Ages 8–10</span></li></ul>',
    '<li>Places for adults: 1</li><li>Places for children: 2</li>',
    '<h3 class="eyebrow">What it opens</h3><ul class="plan-lines"><li>Every course in this subject: <bdi>Synthetic tajwid</bdi></li><li><bdi>Synthetic Arabic year one</bdi></li><li>Saving lessons in the app, to watch with no connection</li></ul>',
    // One child's place is free, and one child is not on it: that child, and nobody else.
    `<label for="sub-add-${RUN}" class="eyebrow">Add a learner</label>`,
    `<option value="" selected="">Choose a learner</option><option value="${BILAL}">\u2068Bilal\u2069 (child) · Ages 11–13</option></select>`,
    '>Add to this plan</button>',
    '<details class="sub-cancel" data-sub-cancel="plan"><summary>Cancel this plan</summary>',
    `Cancelling returns no money and does not end the plan early. Nothing is taken again whether you cancel or not. After cancelling, nobody else can be added to it. This plan is paid for until: <bdi>${later}</bdi>`,
    `<label for="sub-reason-${RUN}" class="eyebrow">Why are you cancelling?</label>`,
    'maxLength="500"',
  ], 'the running plan');
  // Somebody who has Plus is not told what Plus adds.
  hasNot(run, ['data-sub-plus', 'Every place on this plan is taken.', 'Cancel this order', `value="${OWN}"`, `value="${SPOUSE}"`, `value="${AISHA}"`], 'the running plan');

  // Ordered and not paid: one press, and no question.
  const wait = card(en, WAIT);
  has(wait, ['data-standing="waiting"', '<bdi lang="en" dir="ltr">Basic</bdi>', '<p class="sub-standing">Waiting for payment. It has not started.</p>', 'Nobody is learning on this plan yet.', PLUS_ADDS, 'data-sub-cancel="order"', 'This cancels the order before it is paid, so that you can start again. If a payment request is still waiting on a phone, do not approve it.', '>Cancel this order</button>'], 'the order waiting');
  // Not paid for: no paid period has begun.
  hasNot(wait, ['Paid for from', 'sub-from', '<textarea', 'Why are you cancelling?', 'data-sub-add', 'Cancel this plan'], 'the order waiting');

  // Cancelled after it was paid: what was paid for is still dated, and nothing can be done to it.
  const stop = card(en, STOP);
  has(stop, ['data-standing="stopped"', `<p class="sub-standing">Cancelled. Paid for until: <bdi>${later}</bdi></p><p class="muted sub-from">Paid for from: <bdi>${start}</bdi></p>`, '<li>In a place for an adult: A learner whose name is not shown to you</li>'], 'the cancelled plan');
  hasNot(stop, ['data-sub-plus', 'data-sub-forms', '<button'], 'the cancelled plan');

  // The period is over, whatever the row says.
  const end = card(en, END);
  has(end, ['data-standing="ended"', `<p class="sub-standing">Ended: <bdi>${date('en', EARLIER)}</bdi></p>`], 'the plan that ended');
  // Its start is not a date: left out, and nothing is drawn in its place.
  hasNot(end, ['Paid for from', 'Invalid Date', 'data-sub-plus', 'Runs until', 'Learning on this plan', 'data-sub-forms', '<button'], 'the plan that ended');

  const gone = card(en, GONE);
  has(gone, ['data-standing="withdrawn"', '<p class="sub-standing">Cancelled before it was paid for.</p>'], 'the order that was cancelled');
  hasNot(gone, ['Paid for from', 'data-sub-plus', 'Learning on this plan', 'data-sub-forms'], 'the order that was cancelled');

  // No longer on sale: named and counted from the summary; the buyer can still take its place.
  const old = card(en, OLD);
  has(old, ['<h2 dir="auto">Synthetic retired plan</h2>', '<bdi lang="en" dir="ltr">Basic</bdi>', '<li>Places for adults: 1</li>', `<option value="${OWN}">Synthetic learner · Adult</option>`, `Paid for from: <bdi>${start}</bdi>`, PLUS_ADDS], 'the plan no longer on sale');
  hasNot(old, ['Places for children', `value="${AISHA}"`], 'the plan no longer on sale');

  // Every place taken is said, and no list is offered.
  state.subscriptions[0].family_plan_allocations.push(on(bilal));
  const full = card(await page({ 'accept-language': 'en' }), RUN);
  has(full, ['<p class="muted">Every place on this plan is taken.</p>', 'data-sub-cancel="plan"'], 'the full plan');
  hasNot(full, ['data-sub-add'], 'the full plan');
  state = fresh();
  console.log('Subscriptions page: signed out goes to sign in; the list unread and a status it does not know are each one sentence at 200; learners, what plans open and the summary unread each leave the cards and say part is missing; six plans each said from status and date with no stored word; only the one child with a free place is offered.');

  // -------------------------------------------------------------- money back
  // The owner's word of 2026-11-24: a buyer in the European Union, the rest of
  // the European Economic Area or the United Kingdom may ask for the money
  // back within fourteen days of paying, and the plan ends when it has all
  // gone back.
  {
    const REFUND = 'If you live in the European Union, Iceland, Liechtenstein, Norway or the United Kingdom, you can ask for your money back within 14 days of paying. You ask on your orders page. The plan ends when all of the money has been returned.';
    const SAID = `<p class="muted sub-refund" data-sub-refund="true">${REFUND} <a href="/orders">My orders</a></p>`;
    const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const running = (more) => { state = fresh(); Object.assign(state.subscriptions[0], { current_period_start: daysAgo(3) }, more); };

    // The page asks for the account's country and for the order the plan began with.
    calls.length = 0;
    running(account('DE'));
    let shown = await page({ 'accept-language': 'en' });
    const asked = calls.find((c) => c.path === '/rest/v1/subscriptions');
    assert.ok(decodeURIComponent(asked.query).includes('billing_accounts(billing_country),order_items(orders(status))'), `the page did not ask for the account or the order: ${asked.query}`);
    // Paid for three days ago from Germany: said, on that card and on no other.
    has(card(shown, RUN), [SAID, 'data-standing="running"', 'data-sub-cancel="plan"'], 'a plan paid for three days ago from Germany');
    assert.equal(shown.split('data-sub-refund').length - 1, 1, 'the fourteen days are said on a card they are not true of');
    // From Uganda: not said. The platform's own time is said on the orders page.
    running(account('UG'));
    hasNot(await page({ 'accept-language': 'en' }), ['data-sub-refund', '14 days'], 'a plan paid for three days ago from Uganda');
    // No country on the account, or the account not shown: the benefit of the doubt.
    running(account(null));
    has(card(await page({ 'accept-language': 'en' }), RUN), [SAID], 'a plan on an account with no country');
    running({ billing_accounts: null });
    has(card(await page({ 'accept-language': 'en' }), RUN), [SAID], 'a plan whose account was not shown');
    // Fifteen days after paying: not said any more.
    running({ ...account('DE'), current_period_start: daysAgo(15) });
    hasNot(await page({ 'accept-language': 'en' }), ['data-sub-refund'], 'a plan paid for fifteen days ago');
    // Cancelled and still running: cancelling returned no money, and it can still be asked back.
    state = fresh(); Object.assign(state.subscriptions[2], { current_period_start: daysAgo(1), ...account('IE') });
    has(card(await page({ 'accept-language': 'en' }), STOP), [SAID, 'data-standing="stopped"'], 'a cancelled plan in its first fourteen days');

    // The money went back in full: the plan ended then, and the card says why.
    const BACK = '2026-11-10T10:00:00Z';
    const refunded = (status) => { state = fresh(); Object.assign(state.subscriptions[0], { status: 'cancelled', current_period_start: START, current_period_end: BACK, billing_accounts: { billing_country: 'DE' }, order_items: { orders: { status } }, family_plan_allocations: [{ status: 'released', learner_profile_id: OWN, slot_type: 'adult', learner_profiles: { display_name: 'Synthetic learner' } }] }); };
    refunded('refunded');
    shown = card(await page({ 'accept-language': 'en' }), RUN);
    has(shown, ['data-standing="refunded"', `<p class="sub-standing">Ended when its payment was returned: <bdi>${date('en', BACK)}</bdi></p><p class="muted sub-from">Paid for from: <bdi>${start}</bdi></p>`], 'a plan whose payment was returned');
    hasNot(shown, ['Learning on this plan', 'data-sub-refund', 'data-sub-forms', '<button', 'Ended: <bdi>', 'Synthetic learner'], 'a plan whose payment was returned');
    // Part of the money back, or the order not shown: it ended, and no reason is guessed.
    for (const status of ['partially_refunded', null]) {
      refunded(status);
      if (status === null) state.subscriptions[0].order_items = null;
      shown = card(await page({ 'accept-language': 'en' }), RUN);
      has(shown, ['data-standing="ended"', `<p class="sub-standing">Ended: <bdi>${date('en', BACK)}</bdi></p>`], `a plan that ended with its order ${status}`);
      hasNot(shown, ['payment was returned'], `a plan that ended with its order ${status}`);
    }

    // In Arabic, with the link in Arabic.
    running(account('FR'));
    has(card(await page({ 'accept-language': 'ar' }), RUN), ['<p class="muted sub-refund" data-sub-refund="true">إذا كنت تقيم في الاتحاد الأوروبي أو أيسلندا أو ليختنشتاين أو النرويج أو المملكة المتحدة، يمكنك طلب استرداد مالك خلال 14 يومًا من الدفع. تطلب ذلك من صفحة طلباتك. تنتهي الخطة عند إعادة المبلغ كله. <a href="/orders">طلباتي</a></p>'], 'the fourteen days in Arabic');
    refunded('refunded');
    shown = card(await page({ 'accept-language': 'ar' }), RUN);
    has(shown, [`<p class="sub-standing">انتهت عند إعادة ما دُفع عنها: <bdi>${date('ar', BACK)}</bdi></p>`], 'a refunded plan in Arabic');
    hasNot(shown, ['Ended', 'returned'], 'a refunded plan in Arabic');
    state = fresh();
  }
  console.log('Subscriptions page, money back: the fourteen days said on a plan paid for from Germany, Ireland or France or from an account with no country, in its first fourteen days, with the way to the orders page; not said from Uganda or after the fourteen days; a plan whose payment went back in full said to have ended for that reason, and one part refunded or whose order is not shown said only to have ended; both in Arabic.');

  // ------------------------------------------------------------------ Arabic
  const ar = await page({ 'accept-language': 'ar' });
  const laterAr = date('ar', LATER);
  has(ar, [
    '<div class="page">', '<p class="eyebrow">الاشتراكات</p>', '<h1>خططك</h1>',
    '<p class="lede">كل خطة في حسابك: ما تفتحه، ومن يتعلّم عليها، ومتى تنتهي.</p>',
    // The shelf's name is a name, marked as English; the plan's own name is as written.
    '<p class="eyebrow"><bdi lang="en" dir="ltr">Plus</bdi></p><h2 dir="auto">Synthetic family</h2>',
    `<p class="sub-standing">سارية حتى: <bdi>${laterAr}</bdi></p>`,
    '<h3 class="eyebrow">من يتعلّم على هذه الخطة</h3>',
    '<li>أماكن للبالغين: 1</li><li>أماكن للأطفال: 2</li>',
    '<li>كل دورة في هذا المجال: <bdi>Synthetic tajwid</bdi></li>',
    '<li>حفظ الدروس داخل التطبيق لمشاهدتها بلا اتصال</li>',
    `<label for="sub-add-${RUN}" class="eyebrow">إضافة متعلّم</label>`,
    `<option value="" selected="">اختر متعلّمًا</option><option value="${BILAL}">\u2068Bilal\u2069 (طفل) · الأعمار 11–13</option>`,
    `<p class="muted sub-from">مدفوعة ابتداءً من: <bdi>${date('ar', START)}</bdi></p>`,
    '<li>في مكان للبالغين: <bdi>Synthetic learner</bdi></li><li>في مكان للأطفال: <bdi>Aisha</bdi><span class="muted sub-band"> · الأعمار 8–10</span></li>',
    '<p class="muted sub-plus" data-sub-plus="true">حفظ الدروس داخل التطبيق لمشاهدتها بلا اتصال متاح مع: <bdi lang="en" dir="ltr">Plus</bdi> <a href="/plans">قارن بين الخطط</a></p>',
    `<option value="${OWN}">Synthetic learner · بالغ</option>`,
    '>أضف إلى هذه الخطة</button>',
    '<summary>إلغاء هذه الخطة</summary>',
    `الإلغاء لا يعيد أي مبلغ ولا ينهي الخطة قبل موعدها. لا يُخصم شيء مرة أخرى سواء ألغيت أم لا. بعد الإلغاء لا يمكن إضافة أحد آخر إليها. هذه الخطة مدفوعة حتى: <bdi>${laterAr}</bdi>`,
    'لماذا تلغي؟',
    '<p class="sub-standing">في انتظار الدفع. لم تبدأ بعد.</p>', 'لا أحد يتعلّم على هذه الخطة بعد.',
    'هذا يلغي الطلب قبل دفعه لتتمكّن من البدء من جديد. إذا كان طلب دفع ما زال ينتظر على هاتف، فلا توافق عليه.', '>إلغاء هذا الطلب</button>',
    `<p class="sub-standing">أُلغيت. مدفوعة حتى: <bdi>${laterAr}</bdi></p>`, '<li>في مكان للبالغين: متعلّم لا يظهر لك اسمه</li>',
    `<p class="sub-standing">انتهت في: <bdi>${date('ar', EARLIER)}</bdi></p>`,
    '<p class="sub-standing">أُلغيت قبل أن تُدفع.</p>',
    '<a href="/plans">الخطط</a> · <a href="/family">عائلتي</a>',
  ], 'the Arabic page');
  hasNot(ar, [...ENGLISH_ONLY, ...STORED], 'the Arabic page');
  state.subscriptions = [];
  has(await page({ 'accept-language': 'ar' }), ['لا توجد خطة في هذا الحساب.'], 'the Arabic page with no plan');
  state = fresh(); state.broken = new Set(['/rest/v1/learner_profiles']);
  has(await page({ 'accept-language': 'ar' }), ['تعذّرت قراءة جزء من هذه الصفحة الآن، ولذلك ينقص بعضها. حاول مرة أخرى بعد قليل.'], 'the Arabic page with part unread');
  state = fresh();
  // A language held for review reads this part in English, and the page says so.
  const ha = await page({ 'accept-language': 'ha' });
  has(ha, ['<div class="page" lang="en" dir="ltr">', '<h1>Your plans</h1>', 'Waiting for payment. It has not started.'], 'the page for a held language');
  console.log('Subscriptions page in Arabic: every sentence, the two forms’ words and the dates in Arabic with no English and no stored word; a held language reads it in English, marked.');

  // ---------------------------------------------------------------- the route
  // Shape first: none of these reaches a writer.
  calls.length = 0;
  expect(await send({ action: 'cancel', subscriptionId: RUN, reason: 'x' }, {}), 401, 'not_signed_in', 'signed out');
  expect(await send('{not json'), 400, 'malformed', 'not JSON');
  expect(await send({ action: 'pause', subscriptionId: RUN }), 400, 'malformed', 'an action that does not exist');
  expect(await send({ action: 'cancel', subscriptionId: 'sub-1', reason: 'x' }), 400, 'malformed', 'an id that is not one');
  expect(await send({ action: 'allocate', subscriptionId: RUN }), 400, 'malformed', 'nobody to add');
  expect(await send({ action: 'allocate', subscriptionId: RUN, learnerProfileId: 'aisha' }), 400, 'malformed', 'a learner id that is not one');
  expect(await send({ action: 'cancel', subscriptionId: RUN, reason: 5 }), 400, 'malformed', 'a reason that is not text');
  expect(await send({ action: 'cancel', subscriptionId: RUN, reason: 'x'.repeat(501) }), 400, 'reason_required', 'a reason too long to keep');
  assert.equal(rpcs('cancel_subscription').length + rpcs('allocate_subscription_learner').length, 0, 'a request with the wrong shape reached a writer');

  // Every sentence the two writers, the function and the trigger raise.
  const ADD = { action: 'allocate', subscriptionId: RUN, learnerProfileId: BILAL };
  for (const [code, sentence, status, reason] of [
    ['42501', 'sign in to allocate a learner', 401, 'not_signed_in'],
    ['23514', 'that subscription is not active', 409, 'not_running'],
    ['42501', 'you are not a member of this billing account', 403, 'not_yours'],
    ['P0002', 'that learner profile is not available', 403, 'learner_not_yours'],
    ['42501', 'an adult slot may only be assigned to your own learner profile', 403, 'learner_not_yours'],
    ['42501', 'only an active family member may select this child', 403, 'learner_not_yours'],
    ['23514', 'only an active subscription can grant plan access', 409, 'not_running'],
    ['23514', `plan version ${V_FAMILY} allows 2 child slot(s); 2 already allocated`, 409, 'no_slot'],
    ['23514', DATABASE_SENTENCE, 500, 'refused'],
  ]) {
    state.allocate = refusal(400, code, sentence);
    const answer = await send(ADD);
    expect(answer, status, reason, sentence);
    assert.equal(JSON.stringify(answer.json).includes(V_FAMILY), false, 'a plan version id was passed on');
  }
  // No answer is not a refusal: the learner may be on the plan.
  state.allocate = noAnswer;
  expect(await send(ADD), 502, 'unconfirmed', 'no answer from the database');
  state.allocate = 'ok'; calls.length = 0;
  let answer = await send(ADD);
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, changed: true });
  assert.deepEqual(rpcs('allocate_subscription_learner').map((c) => c.payload), [{ p_subscription_id: RUN, p_learner_profile_id: BILAL }]);
  state = fresh();

  const STOPPING = { action: 'cancel', subscriptionId: RUN, reason: '  SYNTHETIC reason for leaving  ' };
  for (const [code, sentence, status, reason] of [
    ['42501', 'sign in to cancel a subscription', 401, 'not_signed_in'],
    ['23514', 'a written cancellation reason is required', 400, 'reason_required'],
    ['P0002', `subscription ${RUN} not found`, 403, 'not_yours'],
    ['42501', 'you do not have permission to cancel this subscription', 403, 'not_yours'],
    ['XX000', DATABASE_SENTENCE, 500, 'refused'],
  ]) {
    state.cancel = refusal(400, code, sentence);
    expect(await send(STOPPING), status, reason, sentence);
  }
  state.cancel = noAnswer;
  expect(await send(STOPPING), 502, 'unconfirmed', 'no answer from the database');
  // Cancelled already: nothing changed, and that is not a failure.
  state.cancel = false;
  answer = await send(STOPPING);
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, changed: false });
  state = fresh(); calls.length = 0;
  answer = await send(STOPPING);
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, changed: true });
  // The subscriber's own words, trimmed, and nothing else.
  assert.deepEqual(rpcs('cancel_subscription').map((c) => c.payload), [{ p_subscription_id: RUN, p_reason: 'SYNTHETIC reason for leaving' }]);
  state = fresh();

  // No reason given. A paid plan needs one, and the writer is not asked.
  calls.length = 0;
  expect(await send({ action: 'cancel', subscriptionId: RUN }), 400, 'reason_required', 'a paid plan with no reason');
  expect(await send({ action: 'cancel', subscriptionId: RUN, reason: '   ' }), 400, 'reason_required', 'a paid plan with a blank reason');
  expect(await send({ action: 'cancel', subscriptionId: STOP }), 400, 'reason_required', 'a cancelled plan with no reason');
  // One this account cannot see is the same answer as one that does not exist.
  expect(await send({ action: 'cancel', subscriptionId: '99999999-9999-4999-8999-999999999999' }), 403, 'not_yours', 'a subscription nobody here can see');
  // The status unread: nothing was asked of the writer, so nothing changed.
  state.broken = new Set(['/rest/v1/subscriptions']);
  expect(await send({ action: 'cancel', subscriptionId: WAIT }), 500, 'refused', 'the status unread');
  assert.equal(rpcs('cancel_subscription').length, 0, 'the writer was asked to cancel with no reason');
  state = fresh(); calls.length = 0;
  // An order that was never paid: taken, with a sentence that says nobody was asked.
  answer = await send({ action: 'cancel', subscriptionId: WAIT });
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, changed: true });
  assert.deepEqual(rpcs('cancel_subscription').map((c) => c.payload), [{ p_subscription_id: WAIT, p_reason: UNPAID }]);
  state = fresh();
  console.log('Subscriptions route: signed out and seven wrong shapes reach no writer; each of the writers’ twelve sentences answered by name and status with nothing of the database’s in the reply; an unnamed refusal 500, no answer 502; already cancelled is a success that changed nothing; an unpaid order is cancelled with no reason asked and a paid plan is not.');

  // ----------------------------------------------------------- in a browser
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const visit = async (code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: code, url: origin }]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      // A refused request is said on the console, and this script refuses on purpose.
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      const sent = []; tab.on('request', (r) => { if (r.url().includes('/api/subscriptions')) sent.push(r.postDataJSON()); });
      await tab.goto(`${origin}${PAGE}`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent };
    };
    const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png`, fullPage: true }); };
    const fits = (tab) => tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

    // The longest card there is: a plan paid for three days ago from Germany,
    // which also says the fourteen days.
    state = fresh(); Object.assign(state.subscriptions[0], { current_period_start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), ...account('DE') });
    for (const [code, title, dir] of [['en', 'Your plans', 'ltr'], ['ar', 'خططك', 'rtl'], ['ta', 'உங்கள் திட்டங்கள்', 'ltr']]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await visit(code, width);
        assert.equal(await tab.locator(`[data-sub="${RUN}"] [data-sub-refund] a[href="/orders"]`).count(), 1, `${code} ${width}: the fourteen days and the way to the orders page`);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: title, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        assert.equal(await tab.locator('main article').count(), 6);
        assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main h1')).direction), dir);
        assert.ok(await fits(tab), `${code} ${width}: the page is wider than the screen`);
        // Opened, the form that cancels a plan still fits.
        await tab.locator(`[data-sub="${RUN}"] summary`).click();
        assert.ok(await tab.locator(`#sub-reason-${RUN}`).isVisible());
        assert.ok(await fits(tab), `${code} ${width}: the open form is wider than the screen`);
        if ([390, 1440].includes(width)) await shot(tab, `subscriptions-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}`);
        await context.close();
      }
    }
    console.log('Subscriptions page in a browser: English, Arabic and Tamil at 320, 390 and 1440; six cards, one of them saying the fourteen days, nothing wider than the screen with the cancel form open.');

    // The forms, in Arabic.
    {
      state = fresh();
      const { context, tab, errors, sent } = await visit('ar', 390);
      const running = tab.locator(`[data-sub="${RUN}"]`);
      const alerts = running.getByRole('alert');
      const alert = (text) => alerts.filter({ hasText: text }).waitFor();
      const add = running.getByRole('button', { name: 'أضف إلى هذه الخطة', exact: true });
      const choice = running.locator(`#sub-add-${RUN}`);

      // Nobody chosen: said without a request.
      await add.click();
      await alert('اختر متعلّمًا');
      assert.equal(sent.length, 0, 'adding nobody was still sent');
      await choice.selectOption(BILAL);
      assert.equal(await alerts.count(), 0, 'the form still says nobody is chosen after somebody was');

      // Refusals: each said in Arabic, and the button comes back.
      state.allocate = refusal(400, '42501', 'only an active family member may select this child');
      await add.click();
      await alert('لا يمكن وضع ذلك المتعلّم على هذه الخطة من حسابك.');
      state.allocate = refusal(400, '23514', DATABASE_SENTENCE);
      await add.click();
      await alert('تعذّر تنفيذ ذلك. لم يتغيّر شيء.');
      state.allocate = noAnswer;
      await add.click();
      await alert('لم نتمكّن من التأكّد من تنفيذ ذلك. راجع هذه الصفحة من جديد قبل المحاولة مرة أخرى.');
      assert.equal(await add.isEnabled(), true);
      await shot(tab, 'subscriptions-ar-390-unsure');
      // The connection goes: the form says so and comes back to life.
      await context.setOffline(true);
      await add.click();
      await alert('تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.');
      assert.equal(await add.isEnabled(), true, 'the form stays busy for good when the request cannot be made');
      await context.setOffline(false);
      let text = await tab.locator('main').textContent();
      for (const sentence of ['SYNTHETIC-DATABASE', 'could not', 'That learner', 'family member']) assert.equal(text.includes(sentence), false, `a refusal is said in English or in the database's words: ${sentence}`);

      // Somebody else took the place first: said, and the page is read again.
      state.allocate = refusal(400, '23514', `plan version ${V_FAMILY} allows 2 child slot(s); 2 already allocated`);
      state.subscriptions[0].family_plan_allocations.push(on({ ...bilal, id: HIDDEN }, 'Synthetic cousin'));
      await add.click();
      await alert('ذلك المكان شُغل للتوّ. لم يُضف أحد.');
      await running.getByText('كل الأماكن في هذه الخطة مشغولة.').waitFor();
      assert.equal(await add.count(), 0, 'a list is still offered for a plan with no place left');
      assert.equal((await tab.locator('main').textContent()).includes(V_FAMILY), false);

      // Pressed twice while the writer works: one request, and the learner is on the plan.
      state = fresh(); state.delay = 700;
      await tab.reload({ waitUntil: 'networkidle' });
      sent.length = 0; calls.length = 0;
      await choice.selectOption(BILAL);
      await add.dblclick();
      await running.locator('[data-sub-learners] li').filter({ hasText: 'Bilal' }).waitFor();
      assert.deepEqual(sent, [{ subscriptionId: RUN, action: 'allocate', learnerProfileId: BILAL }], 'pressing twice sent two requests');
      assert.equal(rpcs('allocate_subscription_learner').length, 1);
      assert.equal(await alerts.count(), 0, 'something is still said to have gone wrong after it went right');
      assert.equal(await add.count(), 0);
      state.delay = 0;

      // The order that was never paid: one press, no question, and the card says so.
      const waiting = tab.locator(`[data-sub="${WAIT}"]`);
      sent.length = 0; calls.length = 0;
      await waiting.getByRole('button', { name: 'إلغاء هذا الطلب', exact: true }).click();
      await waiting.getByText('أُلغيت قبل أن تُدفع.').waitFor();
      assert.deepEqual(sent, [{ subscriptionId: WAIT, action: 'cancel' }]);
      assert.deepEqual(rpcs('cancel_subscription').map((c) => c.payload), [{ p_subscription_id: WAIT, p_reason: UNPAID }]);
      assert.equal(await waiting.locator('button').count(), 0);

      // The paid plan: behind a disclosure, and it asks why.
      const reason = running.locator(`#sub-reason-${RUN}`);
      assert.equal(await reason.isVisible(), false, 'the form that cancels a paid plan is open before anybody asked');
      await running.locator('summary').click();
      const stopIt = running.getByRole('button', { name: 'إلغاء هذه الخطة', exact: true });
      sent.length = 0; calls.length = 0;
      await stopIt.click();
      await alert('اكتب سبب الإلغاء.');
      assert.equal(sent.length, 0, 'a cancellation with no reason was still sent');
      await reason.fill('SYNTHETIC سبب');
      assert.equal(await alerts.count(), 0);
      await shot(tab, 'subscriptions-ar-390-cancel');
      // The writer says somebody else may: the plan is still running, and the form stays.
      state.cancel = refusal(400, '42501', 'you do not have permission to cancel this subscription');
      await stopIt.click();
      await alert('لا يمكن تغيير هذه الخطة من حسابك.');
      state.cancel = 'ok'; sent.length = 0;
      await stopIt.click();
      await running.getByText('أُلغيت. مدفوعة حتى:').waitFor();
      assert.deepEqual(sent, [{ subscriptionId: RUN, action: 'cancel', reason: 'SYNTHETIC سبب' }]);
      // Cancelled: nobody else can be added, and nothing is left to press.
      assert.equal(await running.locator('button').count(), 0);
      assert.equal(await running.locator('summary').count(), 0);
      assert.ok(await fits(tab));
      await shot(tab, 'subscriptions-ar-390-cancelled');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Subscription forms in Arabic at 390: nobody chosen and no reason written each said without a request; six refusals said in Arabic with nothing of the database’s; a place taken first reads the page again; pressed twice, one request; an unpaid order cancelled with one press; a paid plan cancelled with the subscriber’s words, after which nothing is left to press.');
  }
  console.log('Subscriptions HTTP smoke passed. Not real Auth, RLS or the writers’ own rules; no money.');
} catch (e) { console.error(seen.logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
