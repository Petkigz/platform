// Real Next /plans and /plans/<id> pages and the plan branch of /api/checkout
// against an entirely synthetic loopback Auth/REST API and a synthetic
// payment provider. This is not evidence about hosted Supabase, JWT
// validation, RLS, the plan order writer's own rules, or any real provider:
// the stand-ins answer whatever they are asked, and refuse only when this
// script tells them to. No money exists here.
//
// What it does show: the pages a visitor and a signed-in buyer are sent, in
// English, in Arabic and in English for a language held for review; that a
// read that fails is said as not read and is not a broken page; that a price
// is shown only to an account that would be charged it; the name and status
// the route gives each of the writer's twelve refusals; that the database's
// and the provider's own sentences reach nobody; that a plan is not ordered
// when nothing can take payment for it; and what is sent to the writer and
// to the provider. The expected sentences are typed here rather than
// imported, so this fails if a catalogue changes without anybody looking at
// the page.
//
// Next is started twice: once with no payment provider, which is how the
// site stands today, and once with a provider that points at this script.
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

const FAMILY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const V_MONTH = '11111111-1111-4111-8111-111111111111';
const V_OLD = '22222222-2222-4222-8222-222222222222';
const V_YEAR = '33333333-3333-4333-8333-333333333333';
const V_SOLO = '44444444-4444-4444-8444-444444444444';
const OWN = '66666666-6666-4666-8666-666666666666';
const AISHA = '77777777-7777-4777-8777-777777777777';
const SPOUSE = '88888888-8888-4888-8888-888888888888';
const ORDER = '99999999-9999-4999-8999-999999999999';
const ACCOUNT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
// A sentence only the database would write. It must reach no reader.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE new row for relation "orders" violates check constraint';
// What the provider says when it fails. It must reach no reader either.
const PROVIDER_SENTENCE = 'SYNTHETIC-PROVIDER internal ledger fault';

const own = { id: OWN, display_name: 'Synthetic learner', learner_type: 'adult', linked_user_id: user.id };
const aisha = { id: AISHA, display_name: 'Aisha', learner_type: 'child', linked_user_id: null };
// Another adult in the family: readable, and not somebody a plan can be bought for.
const spouse = { id: SPOUSE, display_name: 'Synthetic spouse', learner_type: 'adult', linked_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' };

const price = (id, version, amount, currency, interval, market = null, more = {}) =>
  ({ id, plan_version_id: version, amount_minor: amount, currency_code: currency, billing_interval: interval, market, status: 'active', effective_from: null, effective_until: null, ...more });

const fresh = () => ({
  flags: new Set(['commerce.subscriptions', 'learning.offline']),
  // The order the database would give: Basic above Plus.
  plans: [
    { id: SOLO, name: 'Synthetic solo', description: null, tier: 'basic', status: 'active' },
    { id: FAMILY, name: 'Synthetic family', description: 'SYNTHETIC-DESCRIPTION for a household.', tier: 'plus', status: 'active' },
  ],
  versions: [
    { id: V_MONTH, plan_id: FAMILY, version_number: 2, billing_interval: 'month', adult_allowance: 1, child_allowance: 3 },
    // Older terms for the same period, still marked active: what somebody already has.
    { id: V_OLD, plan_id: FAMILY, version_number: 1, billing_interval: 'month', adult_allowance: 1, child_allowance: 1 },
    { id: V_YEAR, plan_id: FAMILY, version_number: 3, billing_interval: 'year', adult_allowance: 1, child_allowance: 3 },
    { id: V_SOLO, plan_id: SOLO, version_number: 1, billing_interval: 'month', adult_allowance: 1, child_allowance: 0 },
  ],
  prices: [
    price('p-month', V_MONTH, '30000', 'UGX', 'month'),
    price('p-month-ke', V_MONTH, '900', 'KES', 'month', 'KE'),
    price('p-old', V_OLD, '17171', 'UGX', 'month'),
    price('p-year', V_YEAR, '300000', 'UGX', 'year'),
    price('p-solo', V_SOLO, '499', 'USD', 'month'),
    price('p-solo-ug', V_SOLO, '15000', 'UGX', 'month', 'UG'),
    // Ended, and not started: neither is on sale.
    price('p-ended', V_YEAR, '27272', 'UGX', 'year', null, { effective_until: '2026-01-01T00:00:00Z' }),
    price('p-later', V_YEAR, '37373', 'UGX', 'year', null, { effective_from: '2099-01-01T00:00:00Z' }),
  ],
  entitlements: [
    { plan_version_id: V_MONTH, scope_type: 'catalogue', feature_code: null, subject_areas: { name: 'Synthetic tajwid' }, products: null },
    { plan_version_id: V_MONTH, scope_type: 'product', feature_code: null, subject_areas: null, products: { name: 'Synthetic Arabic year one' } },
    { plan_version_id: V_MONTH, scope_type: 'feature', feature_code: 'offline_downloads', subject_areas: null, products: null },
    { plan_version_id: V_MONTH, scope_type: 'feature', feature_code: 'something_new', subject_areas: null, products: null },
    { plan_version_id: V_SOLO, scope_type: 'catalogue', feature_code: null, subject_areas: { name: 'Synthetic tajwid' }, products: null },
  ],
  memberships: [{ billing_account_id: ACCOUNT }],
  country: null,
  subscriptions: [],
  learners: [own],
  // Paths that answer with a database error, and whether the switch does.
  broken: new Set(), flagFails: false,
  // What the writer answers: 'ok', or [status, { code, message }].
  plan: 'ok',
  // What the provider answers to a payment request, and how long the writer takes.
  provider: 202, delay: 0,
});
let state = fresh();

const calls = [];
const provider = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  // The synthetic payment provider, addressed the way MTN's API is.
  if (req.url === '/collection/token/') { res.end(JSON.stringify({ access_token: 'synthetic-provider-token', expires_in: 3600 })); return; }
  if (req.url === '/collection/v1_0/requesttopay') {
    provider.push({ reference: req.headers['x-reference-id'], payload: JSON.parse(body) });
    res.writeHead(state.provider); res.end(state.provider === 202 ? '' : JSON.stringify({ message: PROVIDER_SENTENCE })); return;
  }
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  // A visitor reads the catalogue with the public key and no session.
  const signedIn = req.headers.authorization === `Bearer ${token}`;
  if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(401); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  // The real server compares a column with the *word* "null" when asked
  // `eq.null`; on a date column that is an error, not an empty answer.
  if ([...url.searchParams.values()].some((value) => /^(?:not\.)?(?:eq|neq)\.(?:null|undefined)$/.test(value))) {
    res.writeHead(400); res.end(JSON.stringify({ code: '22007', message: 'invalid input syntax for type timestamp with time zone: "null"' })); return;
  }
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, query: url.search, signedIn });
  const one = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
  const send = (value) => res.end(JSON.stringify(value));
  const q = (name) => url.searchParams.get(name);
  const within = (name, value) => { const asked = q(name); return !asked || asked === `eq.${value}` || (asked.startsWith('in.(') && asked.slice(4, -1).split(',').map((v) => v.replaceAll('"', '')).includes(value)); };
  if (state.broken.has(path)) { res.writeHead(500); send({ code: 'XX000', message: DATABASE_SENTENCE }); return; }
  const publicPaths = ['/rest/v1/rpc/setting_bool', '/rest/v1/plans', '/rest/v1/plan_versions', '/rest/v1/prices', '/rest/v1/plan_entitlements'];
  if (!signedIn && !publicPaths.includes(path)) { res.writeHead(401); res.end('{}'); return; }
  if (path === '/rest/v1/rpc/setting_bool') {
    if (state.flagFails) { res.writeHead(500); send({ code: 'XX000', message: DATABASE_SENTENCE }); } else send(state.flags.has(payload.p_key));
  }
  else if (path === '/rest/v1/plans') send(state.plans.filter((p) => within('id', p.id)));
  else if (path === '/rest/v1/plan_versions') send(state.versions.filter((v) => within('id', v.id) && within('plan_id', v.plan_id)));
  else if (path === '/rest/v1/prices') send(state.prices.filter((p) => within('id', p.id) && within('plan_version_id', p.plan_version_id)));
  else if (path === '/rest/v1/plan_entitlements') send(state.entitlements.filter((e) => within('plan_version_id', e.plan_version_id)));
  else if (path === '/rest/v1/billing_account_memberships') send(state.memberships);
  else if (path === '/rest/v1/billing_accounts') {
    if (req.method === 'GET') send([{ id: ACCOUNT, billing_country: state.country }]);
    else { res.writeHead(201); res.end(''); }
  }
  else if (path === '/rest/v1/subscriptions') send(state.subscriptions.filter((s) => within('plan_id', s.plan_id)));
  else if (path === '/rest/v1/learner_profiles') send(state.learners);
  else if (path === '/rest/v1/payment_attempts') {
    if (req.method === 'GET') send([]);
    else { res.writeHead(201); send(one ? { id: 'attempt-1' } : [{ id: 'attempt-1' }]); }
  }
  else if (path === '/rest/v1/rpc/create_plan_order') {
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
    if (state.plan === 'ok') {
      const wanted = state.prices.find((p) => p.id === payload.p_price_id);
      send([{ order_id: ORDER, subscription_id: 'sub-1', amount_minor: wanted?.amount_minor ?? '30000', currency_code: wanted?.currency_code ?? 'UGX' }]);
    } else { res.writeHead(state.plan[0]); send(state.plan[1]); }
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
const uganda = { 'x-vercel-ip-country': 'UG' };

/** Start Next with these extra settings, run `work` against it, and stop it. */
async function withNext(extra, work) {
  const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
  const port = reservation.address().port; await new Promise((r) => reservation.close(r));
  const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
    cwd: resolve(root, 'web'), detached: true,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon', ...extra },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const seen = { logs: '' };
  try {
    await new Promise((resolveReady, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${seen.logs}`)), 60000);
      const receive = (chunk) => { seen.logs += chunk.toString(); if (seen.logs.includes('Ready in')) { clearTimeout(timeout); resolveReady(); } };
      next.stdout.on('data', receive); next.stderr.on('data', receive);
      next.once('error', (e) => { clearTimeout(timeout); reject(e); });
      next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${seen.logs}`)); });
    });
    await work(`http://localhost:${port}`, seen);
  } catch (e) { console.error(seen.logs.slice(-4000)); throw e; }
  finally {
    try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
    if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
    try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  }
}


// The page itself: what is inside <main>, without the scripts Next adds, the
// comments React puts between two pieces of text, or the entity it writes an
// apostrophe as.
const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'');
const has = (html, sentences, what) => { for (const sentence of sentences) assert.ok(html.includes(sentence), `${what} lacks "${sentence}"\n${html.slice(0, 3000)}`); };
const hasNot = (html, sentences, what) => { for (const sentence of sentences) assert.ok(!html.includes(sentence), `${what} still says "${sentence}"`); };
const amount = (value) => `<strong><bdi dir="ltr">${value}</bdi></strong>`;
// English a translated page must not hold. (`Basic` and `Plus` are the
// shelves' names and are marked as English; a plan's own name is its own.)
const ENGLISH_ONLY = ['Choose a learning plan', 'A plan opens', 'Nothing is taken', 'VIP package', 'opens the lessons', 'For one', 'Places for', 'What it opens', 'Every course', 'Saving lessons', 'Choose this plan', 'Subscriptions', 'not on sale', 'could not be read', 'Who is this plan', 'Continue to payment', 'Mobile money', 'waiting for payment', 'This plan'];
// What the database calls things. None of it is a sentence.
const STORED = ['offline_downloads', 'something_new', 'version 2', 'catalogue', 'SYNTHETIC-DATABASE', 'p-month', 'KES', '17171', '27272', '37373'];
const LIST = '/plans';
// The fourteen days the law gives in some countries (the owner's word, 2026-11-24).
const REFUND = 'If you live in the European Union, Iceland, Liechtenstein, Norway or the United Kingdom, you can ask for your money back within 14 days of paying. You ask on your orders page. The plan ends when all of the money has been returned.';
const REFUND_AR = 'إذا كنت تقيم في الاتحاد الأوروبي أو أيسلندا أو ليختنشتاين أو النرويج أو المملكة المتحدة، يمكنك طلب استرداد مالك خلال 14 يومًا من الدفع. تطلب ذلك من صفحة طلباتك. تنتهي الخطة عند إعادة المبلغ كله.';
const PAY = `/plans/${V_MONTH}`;
const MTN = { MTN_MOMO_SUBSCRIPTION_KEY: 'synthetic', MTN_MOMO_API_USER: 'synthetic', MTN_MOMO_API_KEY: 'synthetic' };

let browser;
try {
  // ===================================================== no payment provider
  // How the site stands today: nothing is connected.
  await withNext({}, async (origin, seen) => {
    const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
    const page = async (path, headers = {}) => { const response = await request(path, headers); assert.equal(response.status, 200, `${path}\n${seen.logs.slice(-2000)}`); return inner(await response.text()); };
    const send = async (path, body, headers = { cookie, ...uganda }) => {
      const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const text = await response.text();
      assert.equal(text.includes('SYNTHETIC'), false, `${path} passed on a sentence that is not its own: ${text}`);
      return { status: response.status, json: JSON.parse(text) };
    };
    const expect = (answer, status, reason, what) => {
      assert.equal(answer.status, status, `${what}: ${JSON.stringify(answer)}`);
      assert.equal(answer.json.reason, reason, what);
      assert.equal(typeof answer.json.error, 'string', what);
    };

    // ------------------------------------------------------ not on sale yet
    // The switch is off, as it ships. Nothing about a plan is read.
    state.flags = new Set();
    calls.length = 0;
    const closed = await page(LIST, { 'accept-language': 'en' });
    has(closed, ['<p class="eyebrow">Plans</p>', '<h1>Choose a learning plan</h1>', 'data-plans-state="closed"', '<strong>Plans are not on sale yet.</strong> When they are, each plan and its price will be listed here. Nothing can be bought before then.'], 'the closed page');
    hasNot(closed, ['Synthetic', 'UGX', 'Choose this plan'], 'the closed page');
    assert.deepEqual([...new Set(calls.map((c) => c.path))], ['/rest/v1/rpc/setting_bool'], 'a catalogue that is not on sale was read');
    const closedAr = await page(LIST, { 'accept-language': 'ar' });
    has(closedAr, ['<p class="eyebrow">الخطط</p>', '<h1>اختر خطة تعلّم</h1>', '<strong>الخطط غير معروضة للبيع بعد.</strong> عند عرضها ستُدرج هنا كل خطة وسعرها. لا يمكن شراء شيء قبل ذلك.'], 'the closed page in Arabic');
    hasNot(closedAr, [...ENGLISH_ONLY, 'lang="en"'], 'the closed page in Arabic');
    // A language held for review reads this part in English, and the page says so.
    const closedHa = await page(LIST, { 'accept-language': 'ha' });
    has(closedHa, ['<div class="page" lang="en" dir="ltr">', '<strong>Plans are not on sale yet.</strong>'], 'the closed page for a held language');
    // The pay page says the same, signed in, and reads no plan.
    calls.length = 0;
    const closedPay = await page(PAY, { cookie, 'accept-language': 'en' });
    has(closedPay, ['data-pay-state="closed"', '<strong>Plans are not on sale yet.</strong>'], 'the closed pay page');
    assert.equal(calls.some((c) => c.path === '/rest/v1/plan_versions'), false, 'a plan that is not on sale was read');
    state = fresh();

    // -------------------------------------------------- not read is not none
    // Every read that can fail, one at a time. Each is a page that says so,
    // with status 200: none is the "this page broke" screen.
    state.flagFails = true;
    has(await page(LIST, { 'accept-language': 'en' }), ['data-plans-state="unread"', 'role="alert"', 'The plans could not be read just now. This does not mean there are none. Try again in a moment.'], 'the page with the switch unread');
    has(await page(PAY, { cookie, 'accept-language': 'en' }), ['data-pay-state="unread"', 'The plans could not be read just now.'], 'the pay page with the switch unread');
    state = fresh();
    for (const path of ['/rest/v1/plans', '/rest/v1/plan_versions', '/rest/v1/prices', '/rest/v1/plan_entitlements']) {
      state.broken = new Set([path]);
      const unread = await page(LIST, { 'accept-language': 'en' });
      has(unread, ['data-plans-state="unread"', 'The plans could not be read just now.'], `the page with ${path} unread`);
      hasNot(unread, ['SYNTHETIC', 'No plan is on sale', 'Choose this plan'], `the page with ${path} unread`);
    }
    // Signed in, the billing account decides the price: unread, it is not guessed.
    for (const path of ['/rest/v1/billing_account_memberships', '/rest/v1/billing_accounts']) {
      state.broken = new Set([path]);
      has(await page(LIST, { cookie, 'accept-language': 'en' }), ['data-plans-state="unread"'], `the signed-in page with ${path} unread`);
    }
    state.broken = new Set(['/rest/v1/learner_profiles']);
    has(await page(PAY, { cookie, 'accept-language': 'en' }), ['data-pay-state="unread"'], 'the pay page with the learners unread');
    const unreadAr = await page(LIST, { 'accept-language': 'ar' });
    state.broken = new Set(['/rest/v1/plans']);
    has(await page(LIST, { 'accept-language': 'ar' }), ['تعذّرت قراءة الخطط الآن. هذا لا يعني أنه لا توجد خطط. حاول مرة أخرى بعد قليل.'], 'the unread page in Arabic');
    assert.ok(unreadAr.includes('data-plans-state="open"'), 'a visitor is refused the list because learners cannot be read');
    state = fresh();

    // ---------------------------------------------------------- nothing on sale
    state.plans = [];
    has(await page(LIST, { 'accept-language': 'en' }), ['data-plans-state="none"', 'No plan is on sale at the moment.'], 'the page with no plans');
    state = fresh();

    // ------------------------------------------------------------- a visitor
    // Signed out: no account, so no country, so the prices for no market.
    const visitor = await page(LIST, { 'accept-language': 'en', ...uganda });
    has(visitor, [
      'data-plans-state="open"',
      '<p class="lede">A plan opens courses for the learners it covers, for the period it is paid for. It starts when payment is confirmed, not when the order is placed.</p>',
      '<p class="muted"><bdi lang="en" dir="ltr">Basic</bdi> opens the lessons. <bdi lang="en" dir="ltr">Plus</bdi> is the VIP package: the same lessons, and more besides. Each plan lists what it opens.</p>',
      '<p class="eyebrow"><bdi lang="en" dir="ltr">Basic</bdi></p><h2 dir="auto">Synthetic solo</h2>',
      '<p class="eyebrow"><bdi lang="en" dir="ltr">Plus</bdi></p><h2 dir="auto">Synthetic family</h2><p class="muted" dir="auto">SYNTHETIC-DESCRIPTION for a household.</p>',
      `<li>For one month: ${amount('USD 4.99')}</li>`,
      `<li>For one month: ${amount('UGX 30000')}</li>`,
      `<li>For one year: ${amount('UGX 300000')}</li>`,
      '<li>Places for adults: 1</li><li>Places for children: 3</li>',
      '<p class="eyebrow">What it opens</p>',
      '<li>Every course in this subject: <bdi>Synthetic tajwid</bdi></li><li><bdi>Synthetic Arabic year one</bdi></li><li>Saving lessons in the app, to watch with no connection</li>',
      `<a class="btn" href="/sign-in?next=/plans/${V_MONTH}">Choose this plan</a>`,
      `<a class="btn" href="/sign-in?next=/plans/${V_YEAR}">Choose this plan</a>`,
      'Nothing is taken again automatically. When the period ends, the plan ends unless it is paid for again.',
      // A visitor may be one of the people the fourteen days are for.
      `<p class="muted" data-plans-refund="true">${REFUND}</p>`,
    ], 'the visitor’s page');
    hasNot(visitor, [...STORED, 'UGX 15000', V_OLD, 'per month', 'renew', '<a href="/subscriptions">'], 'the visitor’s page');
    // Basic above Plus, and a plan's month before its year.
    assert.ok(visitor.indexOf('Synthetic solo') < visitor.indexOf('Synthetic family'));
    assert.ok(visitor.indexOf(`data-plan="${V_MONTH}"`) < visitor.indexOf(`data-plan="${V_YEAR}"`));
    assert.equal((visitor.match(/data-plan="/g) ?? []).length, 3, 'a card for terms that are not the ones on sale');
    // Saving lessons is promised only while it is switched on.
    state.flags = new Set(['commerce.subscriptions']);
    hasNot(await page(LIST, { 'accept-language': 'en' }), ['Saving lessons'], 'the page with saving switched off');
    state = fresh();

    // ---------------------------------------------- the account's own market
    state.country = 'UG';
    const buyer = await page(LIST, { cookie, 'accept-language': 'en', ...uganda });
    has(buyer, [`<li>For one month: ${amount('UGX 15000')}</li>`, `<a class="btn" href="/plans/${V_SOLO}">Choose this plan</a>`, '<a href="/subscriptions">Subscriptions</a>'], 'the Ugandan account’s page');
    hasNot(buyer, ['USD 4.99', ...STORED, '/sign-in'], 'the Ugandan account’s page');
    // The fourteen days are not said to an account known to be somewhere the law gives none.
    hasNot(buyer, ['data-plans-refund', '14 days'], 'the Ugandan account’s page');
    // A country the request claims is not the account's: the account has none.
    state.country = null;
    has(await page(LIST, { cookie, 'accept-language': 'en', ...uganda }), [`<li>For one month: ${amount('USD 4.99')}</li>`, 'data-plans-refund="true"', REFUND], 'the page of an account with no country');
    // An account in Germany, and one in the United Kingdom: said.
    for (const country of ['DE', 'GB', 'NO']) {
      state.country = country;
      has(await page(LIST, { cookie, 'accept-language': 'en' }), ['data-plans-refund="true"', REFUND], `the page of an account in ${country}`);
    }
    // An account in a country with no price of its own for a plan gets the default.
    state.country = 'TZ';
    has(await page(LIST, { cookie, 'accept-language': 'en' }), [`<li>For one month: ${amount('USD 4.99')}</li>`, `<li>For one month: ${amount('UGX 30000')}</li>`], 'the Tanzanian account’s page');
    // A plan with no price for this account is a card with nothing to press.
    state = fresh(); state.prices = state.prices.filter((p) => p.plan_version_id !== V_SOLO || p.market === 'UG');
    const unpriced = await page(LIST, { cookie, 'accept-language': 'en' });
    has(unpriced, ['<p class="notice warn">This plan has no price for your account yet, so it cannot be bought here.</p>'], 'the page with an unpriced plan');
    hasNot(unpriced, [`/plans/${V_SOLO}`, 'UGX 15000'], 'the page with an unpriced plan');
    state = fresh();

    // ------------------------------------------------------------- in Arabic
    const three = new Intl.NumberFormat('ar').format(3);
    const arabic = await page(LIST, { cookie, 'accept-language': 'ar' });
    has(arabic, [
      '<h1>اختر خطة تعلّم</h1>',
      '<p class="muted"><bdi lang="en" dir="ltr">Basic</bdi> تفتح الدروس. <bdi lang="en" dir="ltr">Plus</bdi> هي باقة VIP: الدروس نفسها وزيادة عليها. كل خطة تذكر ما تفتحه.</p>',
      `<li>لشهر واحد: ${amount('UGX 30000')}</li>`,
      `<li>لسنة واحدة: ${amount('UGX 300000')}</li>`,
      `<li>أماكن للأطفال: ${three}</li>`,
      '<p class="eyebrow">ما الذي تفتحه</p>',
      '<li>كل دورة في هذا المجال: <bdi>Synthetic tajwid</bdi></li>',
      '<li>حفظ الدروس داخل التطبيق لمشاهدتها بلا اتصال</li>',
      `<a class="btn" href="/plans/${V_MONTH}">اختر هذه الخطة</a>`,
      'لا يُخصم أي مبلغ مرة أخرى تلقائيًا. عند انتهاء المدة تنتهي الخطة ما لم تُدفع من جديد.',
      '<a href="/subscriptions">الاشتراكات</a>',
      '<p class="eyebrow"><bdi lang="en" dir="ltr">Plus</bdi></p>',
      `<p class="muted" data-plans-refund="true">${REFUND_AR}</p>`,
    ], 'the Arabic page');
    hasNot(arabic, [...ENGLISH_ONLY, ...STORED, '<div class="page" lang'], 'the Arabic page');
    // Held for review: English, and the wrapper says so.
    has(await page(LIST, { cookie, 'accept-language': 'ha' }), ['<div class="page" lang="en" dir="ltr">', 'For one month: '], 'the page for a held language');

    // ------------------------------------------------------------ the pay page
    const anonymous = await request(PAY);
    assert.equal(anonymous.status, 307);
    const to = new URL(anonymous.headers.get('location'), origin);
    assert.equal(to.pathname, '/sign-in'); assert.equal(to.searchParams.get('next'), PAY);
    // An address that is not a plan's is not sent on to sign-in as one.
    const stray = await request('/plans/not-a-plan');
    assert.equal(stray.status, 307); assert.equal(new URL(stray.headers.get('location'), origin).pathname, '/plans');
    for (const path of ['/plans/not-a-plan', '/plans/12345678-1234-4234-8234-123456789012']) {
      has(await page(path, { cookie, 'accept-language': 'en' }), ['data-pay-state="not-here"', 'This plan is not on sale, or there is no such plan.'], path);
    }
    // The older terms are not for sale at their own address either.
    has(await page(`/plans/${V_OLD}`, { cookie, 'accept-language': 'en' }), ['data-pay-state="not-here"'], 'the pay page of terms that are not on sale');

    // Nothing can take payment: there is no form, so no order that could never be paid.
    const noService = await page(PAY, { cookie, 'accept-language': 'en' });
    has(noService, [
      '<a href="/plans">Plans</a>', '<h1 dir="auto">Synthetic family</h1>',
      `<li>For one month: ${amount('UGX 30000')}</li>`,
      'data-pay-state="no-service"', '<strong>No payment provider is connected yet. </strong>So a plan cannot be bought yet. No order has been placed.',
    ], 'the pay page with no provider');
    hasNot(noService, ['data-plan-form', 'Continue to payment', ...STORED], 'the pay page with no provider');
    has(await page(PAY, { cookie, 'accept-language': 'ar' }), ['<strong>لم تُربط أي جهة دفع بعد. </strong>لذلك لا يمكن شراء خطة بعد. لم يُقدَّم أي طلب.'], 'the Arabic pay page with no provider');

    // ------------------------------------------------- the route, no provider
    const order = { planVersionId: V_MONTH, priceId: 'p-month', learnerProfileId: OWN };
    calls.length = 0;
    expect(await send('/api/checkout', order, {}), 401, 'not_signed_in', 'a plan, signed out');
    expect(await send('/api/checkout', { planVersionId: V_MONTH, learnerProfileId: OWN }), 400, 'malformed', 'a plan with no price');
    expect(await send('/api/checkout', { planVersionId: V_MONTH, priceId: 'p-month' }), 400, 'learner_required', 'a plan for nobody');
    // A plan is not ordered while nothing can take payment for it: the order
    // would stand in the way of every later one.
    const unpayable = await send('/api/checkout', order);
    assert.equal(unpayable.status, 503);
    assert.deepEqual(unpayable.json, { reason: 'provider_unavailable', error: 'No payment provider can take this payment yet.' });
    assert.equal(rpcs('create_plan_order').length, 0, 'a plan was ordered with nothing to pay it through');
    assert.equal(calls.some((c) => c.path === '/rest/v1/billing_accounts' && c.method === 'POST'), false, 'a billing account was opened for an order that was never written');
    console.log('Plans, no provider: closed while the switch is off and nothing read; each failed read said as unread at status 200; a visitor shown the default prices and an account its own market’s; the fourteen days the law gives in some countries said to a visitor, to an account with no country and to one in Germany, the United Kingdom, Norway or France, on the list and before paying, and not to an account in Uganda; English, Arabic and a held language; the pay page with no form; the route orders nothing.');
  });

  // ======================================================= a provider connected
  // The provider's address is this script. Nothing here is MTN. One account:
  // Uganda's, which collects Ugandan shillings in whole amounts.
  await withNext({ ...MTN, MTN_MOMO_BASE_URL: `http://127.0.0.1:${fake.address().port}` }, async (origin, seen) => {
    state = fresh();
    const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
    const page = async (path, headers = {}) => { const response = await request(path, { cookie, ...headers }); assert.equal(response.status, 200, `${path}\n${seen.logs.slice(-2000)}`); return inner(await response.text()); };
    const send = async (path, body) => {
      const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie, ...uganda }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const text = await response.text();
      assert.equal(text.includes('SYNTHETIC'), false, `${path} passed on a sentence that is not its own: ${text}`);
      return { status: response.status, json: JSON.parse(text) };
    };
    const order = { planVersionId: V_MONTH, priceId: 'p-month', learnerProfileId: OWN, msisdn: '0772 123456' };

    // ------------------------------------------------- what the pay page says
    state.learners = [own, aisha, spouse];
    const open = await page(PAY, { 'accept-language': 'en' });
    has(open, [
      '<p class="lede">Choose who this plan is for and how to pay. The plan starts once the payment is confirmed.</p>',
      'data-pay-state="open"', 'data-plan-form',
      '<label for="plan-learner" class="eyebrow">Who is this plan for?</label>',
      '<option value="" selected="">Choose a learner</option>',
      `<option value="${OWN}">Synthetic learner</option>`,
      `<option value="${AISHA}">\u2068Aisha\u2069 (child)</option>`,
      '<label for="plan-msisdn" class="eyebrow">Mobile money number</label>',
      'Continue to payment</button>',
    ], 'the pay page');
    // Another adult is somebody the writer would refuse, so is not offered.
    hasNot(open, ['Synthetic spouse', SPOUSE, ...STORED, 'Which price?', 'USD'], 'the pay page');
    // One learner is a sentence, not a list.
    state.learners = [own];
    has(await page(PAY, { 'accept-language': 'en' }), ['This plan is for: <bdi>Synthetic learner</bdi>'], 'the pay page for one learner');
    // A plan with no place for a child does not offer one.
    state.learners = [own, aisha];
    state.country = 'UG';
    const solo = await page(`/plans/${V_SOLO}`, { 'accept-language': 'en' });
    has(solo, ['This plan is for: <bdi>Synthetic learner</bdi>', `For one month: ${amount('UGX 15000')}`], 'the solo pay page');
    hasNot(solo, ['Aisha'], 'the solo pay page');
    // Before the money is asked for: the fourteen days, to whoever they may be
    // true of. Not to an account in Uganda; to one in France, and in Arabic.
    hasNot(solo, ['data-plans-refund', '14 days'], 'the Ugandan account’s pay page');
    state.country = 'FR';
    has(await page(`/plans/${V_SOLO}`, { 'accept-language': 'en' }), ['data-plans-refund="true"', REFUND], 'the French account’s pay page');
    has(await page(`/plans/${V_SOLO}`, { 'accept-language': 'ar' }), ['data-plans-refund="true"', REFUND_AR], 'the French account’s pay page in Arabic');
    state.country = 'UG';
    // Nobody the plan can cover.
    state.learners = [aisha];
    const nobody = await page(`/plans/${V_SOLO}`, { 'accept-language': 'en' });
    has(nobody, ['data-pay-state="nobody"', '<strong>There is nobody on your account this plan can cover yet.</strong> A place for an adult is for you, once you are a learner on this account. A place for a child is for a child in your family.', 'Learn on this account</button>'], 'the pay page with nobody');
    hasNot(nobody, ['data-plan-form', 'href="/family"'], 'the pay page with nobody');
    state.learners = [];
    has(await page(PAY, { 'accept-language': 'ar' }), ['<strong>لا يوجد في حسابك بعد مَن يمكن أن تشمله هذه الخطة.</strong>', 'التعلّم على هذا الحساب</button>', '<a class="btn secondary" href="/family">عائلتي</a>'], 'the Arabic pay page with nobody');
    state = fresh();
    // The service collects shillings: a price in dollars has no service here.
    const dollars = await page(`/plans/${V_SOLO}`, { 'accept-language': 'en' });
    has(dollars, ['data-pay-state="no-service"', 'No payment service connected to this platform collects the currency this plan is priced in here: <bdi dir="ltr">USD</bdi>. </span>So a plan cannot be bought yet. No order has been placed.'], 'the pay page priced in dollars');
    hasNot(dollars, ['data-plan-form'], 'the pay page priced in dollars');
    // What the account already has of this plan.
    state.subscriptions = [{ plan_id: FAMILY, status: 'pending', current_period_end: null }];
    const waiting = await page(PAY, { 'accept-language': 'en' });
    has(waiting, ['data-pay-state="waiting"', 'An order for this plan is waiting for payment. To start again, cancel it under your subscriptions first.', '<a href="/subscriptions">Subscriptions</a>'], 'the pay page with an order waiting');
    hasNot(waiting, ['data-plan-form'], 'the pay page with an order waiting');
    state.subscriptions = [{ plan_id: FAMILY, status: 'cancelled', current_period_end: '2099-03-01T09:30:00Z' }];
    const live = await page(PAY, { 'accept-language': 'en' });
    has(live, ['data-pay-state="live"', 'This account already has this plan. It runs until: <bdi>'], 'the pay page of a plan already held');
    assert.match(live, /It runs until: <bdi>[^<]*2099[^<]*<\/bdi>/u);
    hasNot(live, ['data-plan-form', '2099-03-01T'], 'the pay page of a plan already held');
    // Another plan's subscription is not in the way, and one that ended is not either.
    state.subscriptions = [{ plan_id: SOLO, status: 'pending', current_period_end: null }, { plan_id: FAMILY, status: 'expired', current_period_end: '2020-01-01T00:00:00Z' }];
    has(await page(PAY, { 'accept-language': 'en' }), ['data-plan-form'], 'the pay page beside another plan’s order');
    // The subscriptions unread: the form is still offered, and the writer decides.
    state.broken = new Set(['/rest/v1/subscriptions']);
    has(await page(PAY, { 'accept-language': 'en' }), ['data-plan-form'], 'the pay page with the subscriptions unread');
    state = fresh();

    // ------------------------------------------------------------ the route
    // Each sentence the writer raises, as the database would send it.
    for (const [sqlstate, sentence, status, reason] of [
      ['42501', 'sign in to start a subscription', 401, 'not_signed_in'],
      ['42501', 'checkout:disabled', 503, 'disabled'],
      ['42501', 'you cannot pay from that billing account', 403, 'account_not_yours'],
      ['P0002', 'that plan version is not currently available', 404, 'plan_not_available'],
      ['22023', 'that price is not currently available for this plan version', 409, 'price_not_available'],
      ['22023', 'that price is not available in the billing account country', 409, 'price_not_available'],
      ['P0002', 'that learner profile is not available', 403, 'learner_not_yours'],
      ['23514', 'this plan has no adult learner slots', 409, 'no_slot'],
      ['42501', 'an adult subscription slot may only be assigned to your own learner profile', 403, 'learner_not_yours'],
      ['23514', 'this plan has no child learner slots', 409, 'no_slot'],
      ['42501', 'only an active family member may select this child', 403, 'learner_not_yours'],
      ['23505', 'this billing account already has a pending or unexpired subscription to that plan', 409, 'already_subscribed'],
      // A sentence nobody named, and no answer at all.
      ['23514', DATABASE_SENTENCE, 500, 'refused'],
    ]) {
      state.plan = refusal(400, sqlstate, sentence);
      const answer = await send('/api/checkout', order);
      assert.equal(answer.status, status, `${sentence}: ${JSON.stringify(answer)}`);
      assert.equal(answer.json.reason, reason, sentence);
      assert.deepEqual(Object.keys(answer.json).sort(), ['error', 'reason'], sentence);
      assert.equal(answer.json.error.toLowerCase().includes(sentence.toLowerCase()), false, `the database’s sentence was sent: ${sentence}`);
    }
    state.plan = noAnswer;
    let answer = await send('/api/checkout', order);
    assert.equal(answer.status, 502); assert.equal(answer.json.reason, 'unconfirmed');
    assert.equal(provider.length, 0, 'the provider was asked for a payment with no order');
    state = fresh();

    // A number that is not one writes nothing.
    calls.length = 0;
    answer = await send('/api/checkout', { ...order, msisdn: '12' });
    assert.equal(answer.status, 400); assert.equal(answer.json.reason, 'phone_invalid');
    answer = await send('/api/checkout', { ...order, msisdn: undefined });
    assert.equal(answer.status, 400); assert.equal(answer.json.reason, 'phone_invalid');
    // A price this service cannot collect writes nothing: dollars, here.
    answer = await send('/api/checkout', { ...order, planVersionId: V_SOLO, priceId: 'p-solo' });
    assert.equal(answer.status, 503); assert.deepEqual(answer.json, { reason: 'provider_unavailable', error: 'No payment provider can take this payment yet.' });
    // The price unread is a refusal, and writes nothing.
    state.broken = new Set(['/rest/v1/prices']);
    answer = await send('/api/checkout', order);
    assert.equal(answer.status, 500); assert.equal(answer.json.reason, 'refused');
    // So is the billing account: this used to be the framework's error page.
    state.broken = new Set(['/rest/v1/billing_account_memberships']);
    answer = await send('/api/checkout', order);
    assert.equal(answer.status, 500); assert.equal(answer.json.reason, 'refused');
    assert.equal(rpcs('create_plan_order').length, 0, 'an order was written that should not have been');
    assert.equal(provider.length, 0);
    state = fresh();

    // An order, and a prompt.
    calls.length = 0;
    answer = await send('/api/checkout', order);
    assert.equal(answer.status, 200, JSON.stringify(answer));
    assert.equal(answer.json.orderId, ORDER); assert.equal(answer.json.kind, 'pending');
    // Ids, and nothing else: no amount, whatever the request carried.
    assert.deepEqual(rpcs('create_plan_order').map((c) => c.payload), [{ p_billing_account_id: ACCOUNT, p_plan_version_id: V_MONTH, p_price_id: 'p-month', p_learner_profile_id: OWN }]);
    assert.equal(provider.length, 1);
    assert.equal(provider[0].payload.amount, '30000'); assert.equal(provider[0].payload.currency, 'UGX');
    assert.equal(provider[0].payload.payer.partyId, '256772123456');
    assert.equal(calls.filter((c) => c.path === '/rest/v1/payment_attempts' && c.method === 'POST').length, 1);
    // The provider fails after the order is written: the reply names the order.
    state.provider = 500; provider.length = 0;
    answer = await send('/api/checkout', order);
    assert.equal(answer.status, 502);
    assert.deepEqual(answer.json, { reason: 'provider_failed', error: 'The payment provider could not start this payment.', orderId: ORDER });
    state = fresh();
    console.log('Plan checkout route, synthetic provider: each of the writer’s twelve sentences answered by name and status with nothing of the database’s in the reply; an unnamed refusal 500, no answer 502; a mistyped number, a currency the service does not collect, an unread price and an unread account each write nothing; one order sends ids only and one prompt for UGX 30000.');

    // ----------------------------------------------------------- in a browser
    if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
      const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
      browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
      const visit = async (code, width, path) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', extraHTTPHeaders: uganda });
        await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: code, url: origin }]);
        const tab = await context.newPage();
        const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
        // A refused request is said on the console, and this script refuses on purpose.
        tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
        const sent = []; tab.on('request', (r) => { if (r.url().includes('/api/checkout')) sent.push(`${r.method()} ${new URL(r.url()).pathname}`); });
        await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
        return { context, tab, errors, sent };
      };
      const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png`, fullPage: true }); };
      const fits = (tab) => tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

      state.learners = [own, aisha, spouse];
      for (const [code, title, dir] of [['en', 'Choose a learning plan', 'ltr'], ['ar', 'اختر خطة تعلّم', 'rtl'], ['ta', 'ஒரு கற்றல் திட்டத்தைத் தேர்ந்தெடுக்கவும்', 'ltr']]) {
        for (const width of [320, 390, 1440]) {
          const { context, tab, errors } = await visit(code, width, LIST);
          assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
          assert.equal(await tab.getByRole('heading', { name: title, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
          assert.equal(await tab.locator('main article').count(), 3);
          assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main h1')).direction), dir);
          // An amount is left to right whatever the page is.
          assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main .plan-prices bdi')).direction), 'ltr');
          assert.ok(await tab.locator('main [data-plans-refund]').isVisible(), `${code} ${width}: the fourteen days are not said`);
          assert.ok(await fits(tab), `${code} ${width}: the list is wider than the screen`);
          if ([390, 1440].includes(width)) await shot(tab, `plans-${code}-${width}`);
          assert.deepEqual(errors, [], `${code} ${width}`);
          await context.close();
        }
      }
      console.log('Plans list in a browser: English, Arabic and Tamil at 320, 390 and 1440; three cards and the fourteen days said, nothing wider than the screen, amounts left to right.');

      // The whole form, in Arabic.
      {
        const { context, tab, errors, sent } = await visit('ar', 390, PAY);
        assert.ok(await fits(tab), 'the pay page is wider than the screen');
        await shot(tab, 'plan-pay-ar-390');
        const pay = tab.getByRole('button', { name: 'المتابعة إلى الدفع', exact: true });
        const alert = (text) => tab.locator('main').getByRole('alert').filter({ hasText: text }).waitFor();
        const alerts = tab.locator('main').getByRole('alert');
        assert.equal(await tab.locator('label[for="plan-learner"]').textContent(), 'لمن هذه الخطة؟');
        // Nobody chosen: said without a request.
        await pay.click();
        await alert('اختر لمن هذه الخطة.');
        assert.equal(sent.length, 0, 'an order for nobody was still sent');
        await tab.locator('#plan-learner').selectOption(AISHA);
        assert.equal(await alerts.count(), 0, 'the form still says nobody is chosen after somebody was');

        // The number.
        const number = tab.locator('#plan-msisdn');
        const help = tab.locator('#plan-msisdn-help');
        assert.equal(await number.getAttribute('dir'), 'ltr');
        assert.ok((await help.innerText()).startsWith('الرقم الذي سيُطلب منه الموافقة على الدفع.'), await help.innerText());
        await number.fill('12');
        assert.equal(await number.getAttribute('aria-invalid'), 'true');
        calls.length = 0;
        await pay.click();
        await alert('رقم الهاتف هذا غير صحيح. تحقّق منه وحاول مرة أخرى.');
        assert.equal(sent.length, 0, 'a number the form could name was sent');
        await number.fill('0772 123456');
        assert.equal(await number.getAttribute('aria-invalid'), null);

        // Refusals that leave nothing behind: said, and the button stays.
        state.plan = refusal(400, '23514', 'this plan has no child learner slots');
        await pay.click();
        await alert('ليس في هذه الخطة مكان لذلك المتعلّم. لم يُقدَّم أي طلب.');
        state.plan = refusal(400, '22023', 'that price is not available in the billing account country');
        await pay.click();
        await alert('هذا السعر لم يعد متاحًا لحسابك. لم يُقدَّم أي طلب. افتح الخطط من جديد لترى السعر الحالي.');
        state.plan = refusal(400, '23514', DATABASE_SENTENCE);
        await pay.click();
        await alert('تعذّر تقديم الطلب. لم يُخصم أي مبلغ.');
        // No answer from the database: an order may exist, so the buyer is sent to look.
        state.plan = noAnswer;
        await pay.click();
        await alert('لم نتمكّن من التأكّد من تقديم طلبك. راجع طلباتك قبل المحاولة مرة أخرى.');
        assert.equal(await alerts.locator('a[href="/orders"]').textContent(), 'طلباتك');
        assert.equal(await pay.isEnabled(), true);
        // The connection goes: the form says so and comes back to life.
        await context.setOffline(true);
        await pay.click();
        await alert('تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.');
        assert.equal(await pay.isEnabled(), true, 'the form stays busy for good when the request cannot be made');
        await context.setOffline(false);
        let text = await tab.locator('main').textContent();
        for (const sentence of ['SYNTHETIC-DATABASE', 'could not', 'This plan', 'slots']) assert.equal(text.includes(sentence), false, `a refusal is said in English or in the database's words: ${sentence}`);

        // The account already has it: the button goes, and the way out is linked.
        state.plan = refusal(400, '23505', 'this billing account already has a pending or unexpired subscription to that plan');
        await pay.click();
        await alert('هذا الحساب لديه هذه الخطة بالفعل، أو طلب لها ما زال ينتظر. انظر في اشتراكاتك.');
        assert.equal(await alerts.locator('a[href="/subscriptions"]').textContent(), 'الاشتراكات');
        assert.equal(await pay.count(), 0, 'the button is still offered for a plan the account already has');
        await shot(tab, 'plan-pay-ar-390-already');

        // The provider fails after the order is written: an order is waiting,
        // and pressing again would only be refused.
        await tab.reload({ waitUntil: 'networkidle' });
        await tab.locator('#plan-learner').selectOption(OWN);
        await tab.locator('#plan-msisdn').fill('0772 123456');
        state.plan = 'ok'; state.provider = 500;
        await pay.click();
        await alert('تعذّر بدء الدفع. يوجد طلب لهذه الخطة ينتظر الدفع. للبدء من جديد، ألغِه أولًا من اشتراكاتك.');
        assert.equal(await pay.count(), 0, 'the button is still offered with an order waiting');
        text = await tab.locator('main').textContent();
        assert.equal(text.includes('SYNTHETIC-PROVIDER'), false);

        // Pressed twice while the order is being written: one order.
        await tab.reload({ waitUntil: 'networkidle' });
        await tab.locator('#plan-learner').selectOption(AISHA);
        await tab.locator('#plan-msisdn').fill('٠٧٧٢ ١٢٣ ٤٥٦');
        state.provider = 202; state.delay = 700; calls.length = 0; provider.length = 0; sent.length = 0;
        await pay.dblclick();
        await tab.getByRole('status').filter({ hasText: 'وافق على الدفع من هاتفك. تبدأ الخطة عند تأكّد الدفع. قد يستغرق ذلك لحظات.' }).waitFor();
        assert.deepEqual(sent, ['POST /api/checkout'], 'pressing twice sent two orders');
        assert.deepEqual(rpcs('create_plan_order').map((c) => c.payload), [{ p_billing_account_id: ACCOUNT, p_plan_version_id: V_MONTH, p_price_id: 'p-month', p_learner_profile_id: AISHA }]);
        assert.equal(provider.length, 1); assert.equal(provider[0].payload.payer.partyId, '256772123456');
        assert.equal(await pay.count(), 0, 'the button is offered again after a prompt was sent');
        assert.equal(await alerts.count(), 0, 'an earlier refusal is still shown beside the confirmation');
        assert.ok(await fits(tab));
        await shot(tab, 'plan-pay-ar-390-approve');
        state.delay = 0;
        assert.deepEqual(errors, []);
        await context.close();
      }
      // In English, wide, and the states that have no form.
      {
        state = fresh(); state.learners = [own, aisha];
        const { context, tab, errors } = await visit('en', 1440, PAY);
        assert.equal(await tab.getByRole('heading', { name: 'Synthetic family', exact: true, level: 1 }).count(), 1);
        await shot(tab, 'plan-pay-en-1440');
        state.subscriptions = [{ plan_id: FAMILY, status: 'pending', current_period_end: null }];
        await tab.reload({ waitUntil: 'networkidle' });
        assert.equal(await tab.locator('[data-pay-state="waiting"]').count(), 1);
        await shot(tab, 'plan-pay-en-1440-waiting');
        assert.deepEqual(errors, []);
        await context.close();
      }
      console.log('Plan pay form in Arabic at 390: nobody chosen and a mistyped number each said without a request; five refusals said in Arabic with nothing of the database’s; a plan already held and an order left waiting each take the button away and link the subscriptions page; pressed twice, one order and one prompt.');
    }
  });
  console.log('Plans HTTP smoke passed. Not real Auth, RLS, plan order rules or a real provider; no money.');
} finally {
  if (browser) await browser.close();
  await new Promise((r) => fake.close(r));
}
