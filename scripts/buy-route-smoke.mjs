// Real Next /courses/<slug>/buy page and the two /api/checkout routes against
// an entirely synthetic loopback Auth/REST API and a synthetic payment
// provider. This is not evidence about hosted Supabase, JWT validation, RLS,
// the order writer's own rules, or any real provider: the stand-ins answer
// whatever they are asked, and refuse only when this script tells them to.
// No money exists here.
//
// What it does show: the page a signed-in buyer is sent, in English, in
// Arabic, in French by the reader's own choice, and in English for a language
// held for review; the name and status the routes give each refusal; that the
// database's own sentence reaches nobody; that a mistyped phone number writes
// no order; and what is sent to the order writer and to the provider. The
// expected sentences are typed here rather than imported, so this fails if a
// catalogue changes without anybody looking at the page.
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

const COURSE = '11111111-1111-4111-8111-111111111111';
const VERSION = '55555555-5555-4555-8555-555555555555';
const OWN = '66666666-6666-4666-8666-666666666666';
const AISHA = '22222222-2222-4222-8222-222222222222';
const BILAL = '33333333-3333-4333-8333-333333333333';
const ORDER = '77777777-7777-4777-8777-777777777777';
const PLAN = '88888888-8888-4888-8888-888888888888';
// A sentence only the database would write. It must reach no reader.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE new row for relation "orders" violates check constraint';
// What the provider says when it fails. It must reach no reader either.
const PROVIDER_SENTENCE = 'SYNTHETIC-PROVIDER internal ledger fault';
// The paragraph the database hands the withdrawal box.
const WAIVER = 'SYNTHETIC-WAIVER I ask for the course to open now and accept that the 14 days end when it does.';

const own = { id: OWN, display_name: 'Synthetic learner', learner_type: 'adult' };
const aisha = { id: AISHA, display_name: 'Aisha', learner_type: 'child' };
const bilal = { id: BILAL, display_name: 'Bilal', learner_type: 'child' };
const priced = { hasLivePrice: true, resolved: true, priceId: 'price-1', amountMinor: '50000', currencyCode: 'UGX', billingInterval: 'one_time', market: 'UG', matched: 'country', country: 'UG', countrySource: 'request' };
const waiver = { country: 'UG', countryKnown: true, statutory: true, canWaive: true, flagOn: true, policyVersionId: 'policy-1', policyVersionNumber: 1, policyInForceFrom: '2026-01-01', wording: WAIVER, reason: 'offered', message: 'SYNTHETIC-WAIVER the right applies here.' };
const plainQuote = { listMinor: '50000', discountMinor: '0', taxMinor: '0', feeMinor: '0', chargeLabels: { tax: null, fee: null }, totalMinor: '50000', currencyCode: 'UGX', promotionCode: null, promotionName: null, title: 'Synthetic reading course' };
// 50000 less 5000, then 8100 of tax and 900 of a fee the database names itself.
const fullQuote = { listMinor: '50000', discountMinor: '5000', taxMinor: '8100', feeMinor: '900', chargeLabels: { tax: null, fee: 'Handset levy' }, totalMinor: '54000', currencyCode: 'UGX', promotionCode: 'EID24', promotionName: 'Synthetic campaign', title: 'Synthetic reading course' };

const fresh = () => ({
  flags: new Set(['commerce.checkout']),
  course: { id: COURSE, slug: 'reading', title: 'Synthetic reading course', status: 'active', deleted_at: null },
  published: true,
  own,
  learners: [own],
  entitled: new Set(),
  price: priced,
  withdrawal: null,
  quoteRow: plainQuote,
  orderRow: { orderId: ORDER, amountMinor: '50000', currencyCode: 'UGX' },
  // What each writer answers: 'ok', or [status, { code, message }].
  quote: 'ok', order: 'ok', choice: 'ok', plan: 'ok',
  // What the provider answers to a payment request, and how long the order
  // writer takes.
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
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  // The real server compares a column with the *word* "null" when asked
  // `eq.null`; on a date column that is an error, not an empty answer.
  if ([...url.searchParams.values()].some((value) => /^(?:not\.)?(?:eq|neq)\.(?:null|undefined)$/.test(value))) {
    res.writeHead(400); res.end(JSON.stringify({ code: '22007', message: 'invalid input syntax for type timestamp with time zone: "null"' })); return;
  }
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, query: url.search });
  const one = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
  const send = (value) => res.end(JSON.stringify(value));
  const writer = (answer, good) => {
    if (answer === 'ok') { send(good); return; }
    res.writeHead(answer[0]); send(answer[1]);
  };
  const q = (name) => url.searchParams.get(name);
  if (path === '/rest/v1/rpc/setting_bool') send(state.flags.has(payload.p_key));
  else if (path === '/rest/v1/courses') send(q('slug') === `eq.${state.course.slug}` ? [state.course] : []);
  else if (path === '/rest/v1/course_versions') send(state.published ? [{ id: VERSION, version_number: 1 }] : []);
  else if (path === '/rest/v1/learner_profiles') send(q('linked_user_id') ? (state.own ? [{ id: state.own.id }] : []) : state.learners);
  else if (path === '/rest/v1/rpc/can_access_course_version') send(state.entitled.has(payload.p_learner_id));
  else if (path === '/rest/v1/rpc/course_price_for_me') send(state.price);
  else if (path === '/rest/v1/rpc/withdrawal_offer') send(state.withdrawal);
  else if (path === '/rest/v1/rpc/quote_course_order') writer(state.quote, state.quoteRow);
  else if (path === '/rest/v1/rpc/create_course_order') {
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
    writer(state.order, state.orderRow);
  } else if (path === '/rest/v1/rpc/record_withdrawal_choice') writer(state.choice, { decision: payload.p_accepted ? 'waived' : 'retained', country: 'UG', policyVersionId: 'policy-1', statutory: true, message: 'SYNTHETIC-WAIVER recorded.' });
  else if (path === '/rest/v1/payment_attempts') {
    if (req.method === 'GET') send([]);
    else { res.writeHead(201); send(one ? { id: 'attempt-1' } : [{ id: 'attempt-1' }]); }
  } else if (path === '/rest/v1/billing_account_memberships') send([{ billing_account_id: 'billing-1' }]);
  else if (path === '/rest/v1/rpc/create_plan_order') writer(state.plan, [{ order_id: ORDER, subscription_id: 'sub-1', amount_minor: '30000', currency_code: 'UGX' }]);
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

const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
// The page itself: what is inside <main>, without the scripts Next adds, the
// comments React puts between two pieces of text, or the entity it writes an
// apostrophe as.
const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'');
const wrapper = (html) => inner(html).match(/<div class="page narrow"([^>]*)>/)?.[1];
const has = (html, sentences, what) => { for (const sentence of sentences) assert.ok(html.includes(sentence), `${what} lacks "${sentence}"`); };
const hasNot = (html, sentences, what) => { for (const sentence of sentences) assert.ok(!html.includes(sentence), `${what} still says "${sentence}"`); };
const ENGLISH_ONLY = ['Checkout', 'Buy', 'What you will pay', 'Priced for', 'standard price', 'One-off', 'This purchase', 'Who is this for', 'Choose a learner', '(child)', 'Discount code', '(optional)', 'Check the price', 'Have a code', 'Mobile money', 'The number that', 'Continue to payment', 'Access starts', 'Your orders', 'Catalogue', 'Pay with', 'not open', 'No payment provider', 'already has', 'There is nobody', 'Add a child', 'Back to the', 'not priced', 'Nothing has been', 'Contact us', 'This order will', 'Uganda', 'undefined', '{'];
const BUY = '/courses/reading/buy';

let browser;
try {
  // ===================================================== no payment provider
  // How the site stands today: nothing is connected, so an order can be
  // written and cannot be paid.
  await withNext({}, async (origin, seen) => {
    const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
    const page = async (path, headers) => { const response = await request(path, { cookie, ...uganda, ...headers }); assert.equal(response.status, 200, `${path}\n${seen.logs.slice(-2000)}`); return response.text(); };

    const anonymous = await request(BUY);
    assert.equal(anonymous.status, 307);
    const to = new URL(anonymous.headers.get('location'), origin);
    assert.equal(to.pathname, '/sign-in'); assert.equal(to.searchParams.get('next'), BUY);
    assert.equal((await request('/courses/no-such-course/buy', { cookie })).status, 404);
    state.course = { ...state.course, status: 'draft' };
    assert.equal((await request(BUY, { cookie })).status, 404, 'a course that is not active can be bought');
    state = fresh();

    // ------------------------------------------------- where a buyer is sent
    // One learner who has it already goes to their learning; a course with
    // no live price goes back to its own page.
    state.entitled = new Set([OWN]);
    let sent = await request(BUY, { cookie });
    assert.equal(sent.status, 307); assert.equal(new URL(sent.headers.get('location'), origin).pathname, '/learn');
    state = fresh(); state.price = { hasLivePrice: false };
    sent = await request(BUY, { cookie });
    assert.equal(sent.status, 307); assert.equal(new URL(sent.headers.get('location'), origin).pathname, '/courses/reading');
    state = fresh();

    // ----------------------------------------------------- nobody to buy for
    state.own = null; state.learners = [];
    const nobody = inner(await page(BUY, { 'accept-language': 'en' }));
    has(nobody, ['<a href="/catalogue">Catalogue</a>', '<a dir="auto" href="/courses/reading">Synthetic reading course</a>', '<span>Buy</span>', '<p class="eyebrow">Checkout</p>', '<h1 dir="auto">Synthetic reading course</h1>', '<strong>There is nobody to buy this for yet.</strong> A course purchase covers one learner, so there has to be one to name: you on this account, or a child’s profile in your family.', 'Buy it for myself', 'This makes you a learner on this account. It is not a second account.', '<a class="btn secondary" href="/family">Add a child instead</a>', 'Back to the course'], 'the English page with nobody to buy for');
    const nobodyAr = inner(await page(BUY, { 'accept-language': 'ar' }));
    has(nobodyAr, ['<a href="/catalogue">الدورات</a>', '<span>الشراء</span>', '<p class="eyebrow">إتمام الشراء</p>', '<strong>لا يوجد بعدُ من تُشترى له هذه الدورة.</strong> شراء الدورة يكون لمتعلّم واحد، فلا بدّ من متعلّم يُسمّى: أنت على هذا الحساب، أو ملف طفل في عائلتك.', 'أشتريها لنفسي', 'بهذا تصبح متعلّمًا على هذا الحساب. وليس هذا حسابًا ثانيًا.', 'أضف طفلًا بدلًا من ذلك', 'العودة إلى الدورة'], 'the Arabic page with nobody to buy for');
    hasNot(nobodyAr, [...ENGLISH_ONLY, 'lang="en"'], 'the Arabic page with nobody to buy for');
    state = fresh();

    // --------------------------------------------- sold, but not to this buyer
    state.price = { hasLivePrice: true, resolved: false, reason: 'no_price_for_country', country: 'UG', countrySource: 'request' };
    const unpriced = inner(await page(BUY, { 'accept-language': 'en' }));
    has(unpriced, ['<strong>This course is not priced for \u2068Uganda\u2069 yet.</strong> Nothing has been charged. Contact us and we will open your market, then you can buy it.', '<a class="btn secondary" href="/courses/reading">Back to the course</a>'], 'the English page for a country with no price');
    hasNot(unpriced, ['What you will pay', 'Continue to payment'], 'a page with no price');
    // The country's name is the runtime's, in the reader's language, and is
    // put after a colon so it needs no case ending.
    const unpricedAr = inner(await page(BUY, { 'accept-language': 'ar' }));
    has(unpricedAr, ['<strong>لم يُحدَّد بعدُ سعر لهذه الدورة في هذا البلد: \u2068أوغندا\u2069.</strong> لم يُخصم أي مبلغ. تواصل معنا لنفتح البيع في بلدك، ثم يمكنك شراؤها.'], 'the Arabic page for a country with no price');
    hasNot(unpricedAr, ENGLISH_ONLY, 'the Arabic page for a country with no price');
    state.price = { hasLivePrice: true, resolved: false, reason: 'no_price_for_country', country: null, countrySource: 'none' };
    has(inner(await page(BUY, { 'accept-language': 'en' })), ['<strong>This course is not priced for your country yet.</strong>'], 'a buyer whose country nobody knows');
    state.price = { hasLivePrice: true, resolved: false, reason: 'price_ambiguous', country: 'UG', countrySource: 'request' };
    has(inner(await page(BUY, { 'accept-language': 'en' })), ['<strong>This course has more than one price for your country.</strong> We will not choose a currency on your behalf. Contact us and we will set the right one, then you can buy it.'], 'two prices for one country');
    state.price = { hasLivePrice: true, resolved: false, reason: 'not_one_time', country: 'UG', countrySource: 'request' };
    has(inner(await page(BUY, { 'accept-language': 'en' })), ['<strong>This course is sold as a subscription, not as a one-off purchase.</strong> Subscriptions are not on sale through this checkout yet. Nothing has been charged.'], 'a course sold by subscription');
    state = fresh();

    // ------------------------------------------------------ checkout is closed
    state.flags = new Set();
    const closed = inner(await page(BUY, { 'accept-language': 'en' }));
    has(closed, ['<strong>Checkout is not open yet.</strong> This platform is not taking payment for courses at the moment, so no order can be placed and nothing has been charged. Free courses can still be joined from the course page.'], 'the closed page');
    hasNot(closed, ['What you will pay', 'UGX', 'Continue to payment', 'No payment provider'], 'the closed page');
    const closedAr = inner(await page(BUY, { 'accept-language': 'ar' }));
    has(closedAr, ['<strong>الشراء غير مفتوح بعد.</strong> هذه المنصّة لا تستقبل حاليًا مدفوعات للدورات، فلا يمكن تقديم أي طلب ولم يُخصم أي مبلغ. ما زال الانضمام إلى الدورات المجانية ممكنًا من صفحة الدورة.'], 'the closed Arabic page');
    hasNot(closedAr, ENGLISH_ONLY, 'the closed Arabic page');
    state = fresh();

    // --------------------------------------------- open, and nothing connected
    const englishHtml = await page(BUY, { 'accept-language': 'en' });
    const english = inner(englishHtml);
    assert.equal(wrapper(englishHtml), '', 'an English page marks its own buy page as a different language');
    assert.match(englishHtml, /<title>Checkout[^<]*<\/title>/);
    has(english, [
      '<strong>No payment provider is connected yet.</strong> You can place this order and it will be saved, but it cannot be paid until a provider is connected. Nothing is charged, and the course does not open until payment is confirmed.',
      '>What you will pay</h2>',
      // A currency code and Latin digits, kept left to right.
      '<bdi dir="ltr">UGX 50000</bdi>',
      'Priced for \u2068Uganda\u2069. One-off purchase, not a subscription.',
      'This purchase is for <bdi>Synthetic learner</bdi>.',
      'Discount code <span class="meta">(optional)</span>', 'Check the price',
      'Have a code? Enter it here. If it does not apply to this course, you will be told before anything is charged.',
      'Continue to payment', 'This order will be recorded but cannot be paid yet.',
      'Access starts when payment is confirmed, not when you press the button. The order is listed on your orders page either way. <a href="/orders">Your orders</a>',
    ], 'the English buy page');
    // No provider, so no number to ask for and nothing to choose between.
    hasNot(english, ['lang="en"', 'Mobile money number', 'Pay with', 'SYNTHETIC', 'Who is this for'], 'the English buy page');
    state.price = { ...priced, matched: 'default' };
    has(inner(await page(BUY, { 'accept-language': 'en' })), ['The standard price. One-off purchase, not a subscription.'], 'a price that is nobody’s country’s');
    state = fresh();

    const arabicHtml = await page(BUY, { 'accept-language': 'ar' });
    const ar = inner(arabicHtml);
    assert.match(htmlRoot(arabicHtml), /lang="ar"/); assert.match(htmlRoot(arabicHtml), /dir="rtl"/);
    assert.equal(wrapper(arabicHtml), '', 'the Arabic buy page is Arabic and needs no wrapper');
    assert.match(arabicHtml, /<title>إتمام الشراء[^<]*<\/title>/);
    has(ar, [
      '<strong>لم تُربط أي جهة دفع بعد.</strong> يمكنك تقديم هذا الطلب وسيُحفظ، لكن لا يمكن دفعه حتى تُربط جهة دفع. لا يُخصم أي مبلغ، ولا تُفتح الدورة حتى يتأكّد الدفع.',
      '>ما ستدفعه</h2>', '<bdi dir="ltr">UGX 50000</bdi>',
      'السعر الخاص بهذا البلد: \u2068أوغندا\u2069. شراء لمرة واحدة، لا اشتراك.',
      'هذا الشراء لـ <bdi>Synthetic learner</bdi>.',
      'رمز الخصم <span class="meta">(اختياري)</span>', 'تحقّق من السعر',
      'لديك رمز؟ أدخله هنا. إن لم يكن صالحًا لهذه الدورة فستُخبَر بذلك قبل خصم أي مبلغ.',
      'المتابعة إلى الدفع', 'سيُسجَّل هذا الطلب، لكن لا يمكن دفعه بعد.',
      'يبدأ الوصول عند تأكّد الدفع، لا عند الضغط على الزر. وفي الحالتين يظهر الطلب في صفحة طلباتك. <a href="/orders">طلباتك</a>',
      '<h1 dir="auto">Synthetic reading course</h1>',
    ], 'the Arabic buy page');
    hasNot(ar, [...ENGLISH_ONLY, 'lang="en"'], 'the Arabic buy page');

    // The 14-day box is the database's paragraph, in English on every page,
    // and says so about itself where the page is not English.
    state.withdrawal = waiver;
    const boxed = inner(await page(BUY, { 'accept-language': 'ar' }));
    assert.match(boxed, /<div lang="en" dir="ltr"><label for="withdrawal-waiver" class="radio">/, 'the English withdrawal box is not marked as English on an Arabic page');
    has(boxed, [`<span>${WAIVER}</span>`, 'Leaving the box unticked is fine', '<a href="/policies/refunds">The refunds policy</a>'], 'the withdrawal box');
    assert.equal((boxed.match(/lang="en"/g) ?? []).length, 1, 'something besides the withdrawal box is marked as English');
    assert.doesNotMatch(boxed, /id="withdrawal-waiver"[^>]*checked/, 'the box arrives ticked');
    const boxedEn = inner(await page(BUY, { 'accept-language': 'en' }));
    assert.ok(boxedEn.includes(WAIVER) && !boxedEn.includes('lang="en"'), 'an English page marks its own withdrawal box');
    // The right applies and cannot be waived here: said, not hidden.
    state.withdrawal = { ...waiver, canWaive: false, reason: 'switched_off', message: 'SYNTHETIC-WAIVER the 14 days apply and are not asked about here.' };
    const said = inner(await page(BUY, { 'accept-language': 'ar' }));
    assert.match(said, /<div lang="en" dir="ltr"><p class="muted"[^>]*>SYNTHETIC-WAIVER the 14 days apply and are not asked about here\.<\/p><\/div>/);
    assert.equal(said.includes('withdrawal-waiver'), false, 'a box that cannot be recorded is still offered');
    state = fresh();

    // ---------------------------------------------------------- several learners
    state.learners = [aisha, bilal, own];
    const family = inner(await page(BUY, { 'accept-language': 'en' }));
    has(family, ['<label for="learner" class="eyebrow">Who is this for?</label>', `<option value="${AISHA}">\u2068Aisha\u2069 (child)</option>`, `<option value="${BILAL}">\u2068Bilal\u2069 (child)</option>`, `<option value="${OWN}" selected="">Synthetic learner</option>`, 'One purchase covers one learner. To buy for two children, buy it twice.'], 'the English page for a family');
    hasNot(family, ['Choose a learner', 'already has this course'], 'a family nobody of which has the course');
    const familyAr = inner(await page(BUY, { 'accept-language': 'ar' }));
    has(familyAr, ['<label for="learner" class="eyebrow">لمن هذه الدورة؟</label>', `<option value="${AISHA}">\u2068Aisha\u2069 (طفل)</option>`, 'الشراء الواحد لمتعلّم واحد. للشراء لطفلين، اشترِها مرتين.'], 'the Arabic page for a family');
    hasNot(familyAr, ENGLISH_ONLY, 'the Arabic page for a family');

    // The buyer's own learner has the course and two children do not. This
    // page used to say "choose another learner below" above no form at all.
    state.entitled = new Set([OWN]); calls.length = 0;
    const second = inner(await page(BUY, { 'accept-language': 'en' }));
    has(second, ['<div class="notice warn">\u2068Synthetic learner\u2069 already has this course. This purchase is for another learner.</div>', '<option value="" selected="">Choose a learner</option>', `<option value="${AISHA}">\u2068Aisha\u2069 (child)</option>`, `<option value="${BILAL}">\u2068Bilal\u2069 (child)</option>`, '<bdi dir="ltr">UGX 50000</bdi>', 'Continue to payment'], 'a family whose first learner has the course');
    assert.equal(second.includes(`<option value="${OWN}"`), false, 'the learner who has the course is still offered');
    // Asked once about the learner who has it, and the price asked for again
    // for everybody else.
    assert.deepEqual(rpcs('can_access_course_version').map((c) => c.payload.p_learner_id), [OWN]);
    assert.equal(rpcs('course_price_for_me').length, 1, 'the price was not asked for again without the learner who has it');
    has(inner(await page(BUY, { 'accept-language': 'ar' })), ['هذه الدورة موجودة من قبل لدى \u2068Synthetic learner\u2069. هذا الشراء لمتعلّم آخر.', '<option value="" selected="">اختر متعلّمًا</option>'], 'the Arabic page for a family whose first learner has the course');
    // One other learner: there is nothing to choose, so it is said.
    state.learners = [aisha, own];
    const onlyOther = inner(await page(BUY, { 'accept-language': 'en' }));
    has(onlyOther, ['already has this course. This purchase is for another learner.', 'This purchase is for <bdi>Aisha</bdi>.'], 'a family with one learner left to buy for');
    assert.equal(onlyOther.includes('<select'), false);
    state = fresh();

    // ------------------------------------------- French, by the reader's choice
    const frenchHtml = await page(BUY, { 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` });
    assert.match(htmlRoot(frenchHtml), /lang="fr"/);
    // French puts a no-break space before a colon; it is written out here so
    // nobody mistakes it for an ordinary one.
    has(inner(frenchHtml).replaceAll('\'', '’'), ['<p class="eyebrow">Paiement</p>', '<strong>Aucun prestataire de paiement n’est encore connecté.</strong>', '>Ce que vous paierez</h2>', 'Prix pour ce pays\u00a0: \u2068Ouganda\u2069. Achat unique, et non un abonnement.', 'Cet achat est destiné à <bdi>Synthetic learner</bdi>.', 'Continuer vers le paiement', '<a href="/orders">Vos commandes</a>'], 'the French buy page');

    // ---------------------------------------------------------- held for review
    // Hausa has no buy page of its own: Hausa frame, English page, marked.
    state.withdrawal = waiver;
    const hausa = await page(BUY, { 'accept-language': 'ha' });
    assert.match(htmlRoot(hausa), /lang="ha"/);
    assert.equal(wrapper(hausa), ' lang="en" dir="ltr"');
    has(inner(hausa), ['What you will pay', 'Priced for \u2068Uganda\u2069.', 'Continue to payment'], 'a Hausa reader’s buy page');
    // The whole page is marked, so the box inside it is not marked again.
    assert.equal((inner(hausa).match(/lang="en"/g) ?? []).length, 1, 'English inside an English page is marked twice');
    // Pashto is right-to-left with the same hold: the English must not inherit it.
    const pashto = await page(BUY, { 'accept-language': 'ps' });
    assert.match(htmlRoot(pashto), /dir="rtl"/);
    assert.equal(wrapper(pashto), ' lang="en" dir="ltr"');
    // Wolof is withheld whole: English everywhere, so nothing to mark.
    const wolof = await page(BUY, { 'accept-language': 'wo, fr' });
    assert.match(htmlRoot(wolof), /lang="en"/);
    assert.equal(wrapper(wolof), '');
    assert.ok(inner(wolof).includes('What you will pay') && !inner(wolof).includes('Ce que vous paierez'));
    state = fresh();
    console.log('Buy page, no provider connected: signed out to sign-in, unknown and inactive courses 404, an owner to /learn, a free course to its page; nobody to buy for, four reasons it is not sold to this buyer, checkout closed, and the open page, each in English and Arabic; the withdrawal box in English and marked as English on an Arabic page, never ticked on arrival; a family, a family whose first learner has the course (form drawn, owner left out, nobody chosen), and one learner left; French by the reader’s own choice over an Arabic device; Hausa and Pashto frames with an English page marked once; Wolof-then-French device in English. Synthetic backend.');

    // -------------------------------------------------------------- the routes
    const send = async (path, body, headers = { cookie, ...uganda }) => {
      const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const text = await response.text();
      assert.equal(text.includes('SYNTHETIC-DATABASE'), false, `${path} passed on the database’s own sentence`);
      assert.equal(text.includes('SYNTHETIC-PROVIDER'), false, `${path} passed on the provider’s own sentence`);
      return { status: response.status, json: JSON.parse(text) };
    };
    const expect = (answer, status, reason, what) => {
      assert.equal(answer.status, status, `${what}: ${JSON.stringify(answer)}`);
      assert.equal(answer.json.reason, reason, what);
      assert.equal(typeof (answer.json.error ?? answer.json.message), 'string', what);
    };
    const order = { courseId: COURSE, learnerProfileId: OWN };

    calls.length = 0;
    expect(await send('/api/checkout', order, {}), 401, 'not_signed_in', 'order, signed out');
    expect(await send('/api/checkout', '{not json'), 400, 'malformed', 'order, not JSON');
    expect(await send('/api/checkout', { courseId: COURSE, planVersionId: PLAN, learnerProfileId: OWN }), 400, 'malformed', 'order, a course and a plan at once');
    expect(await send('/api/checkout', { courseId: COURSE }), 400, 'learner_required', 'order, nobody named');
    // With no provider there is nobody to send a number to, so one is not
    // read at all, whatever was typed: a number is a number of the country the
    // chosen service collects in, and no service has been chosen. (It used to
    // be read as Ugandan and refused here.) The request goes on to be told
    // there is no provider. With a provider, a mistyped number is refused
    // before anything is written: that is checked in the second half.
    let answer = await send('/api/checkout', { ...order, msisdn: '12' });
    expect(answer, 503, 'provider_unavailable', 'order, no provider and a number nobody will read');
    state = fresh();
    calls.length = 0;

    state.entitled = new Set([OWN]);
    expect(await send('/api/checkout', order), 409, 'already_owned', 'order, the learner has it');
    state = fresh(); state.price = { hasLivePrice: false };
    answer = await send('/api/checkout', order);
    expect(answer, 409, 'free_course', 'order, a free course'); assert.equal(answer.json.redirect, '/api/enrol');
    assert.equal(rpcs('create_course_order').length, 0);
    state = fresh();

    // Every refusal the writer makes, under its own name and status.
    for (const [key, status, reason] of [
      ['checkout:disabled', 503, 'disabled'], ['checkout:not_signed_in', 401, 'not_signed_in'],
      ['checkout:course_not_available', 404, 'course_not_available'], ['checkout:price_not_available', 409, 'price_not_available'],
      ['checkout:not_one_time', 409, 'not_one_time'], ['checkout:no_price_for_country', 409, 'no_price_for_country'],
      ['checkout:price_ambiguous', 409, 'price_ambiguous'], ['checkout:already_owned', 409, 'already_owned'],
      ['checkout:learner_required', 400, 'learner_required'], ['checkout:learner_not_yours', 403, 'learner_not_yours'],
      ['promotion:unknown_code', 409, 'unknown_code'], ['promotion:not_active', 409, 'not_active'], ['promotion:not_running', 409, 'not_running'],
      ['promotion:not_in_market', 409, 'not_in_market'], ['promotion:not_for_this_course', 409, 'not_for_this_course'],
      ['promotion:self_referral', 409, 'self_referral'], ['promotion:new_customers_only', 409, 'new_customers_only'],
      ['promotion:limit_reached_total', 409, 'limit_reached_total'], ['promotion:limit_reached_person', 409, 'limit_reached_person'],
      ['promotion:limit_reached_family', 409, 'limit_reached_family'], ['promotion:would_be_free', 409, 'would_be_free'],
      ['promotion:currency_mismatch', 409, 'currency_mismatch'], ['promotion:nothing_off', 409, 'nothing_off'],
    ]) {
      state.order = refusal(400, 'P0001', key);
      answer = await send('/api/checkout', order);
      expect(answer, status, reason, `order, ${key}`);
      assert.equal('orderId' in answer.json, false, `${key} is answered with an order`);
    }
    // A refusal nobody wrote a sentence for: the route's words, not the database's.
    state.order = refusal(400, '23514', DATABASE_SENTENCE);
    answer = await send('/api/checkout', order);
    expect(answer, 500, 'refused', 'order, an unnamed refusal');
    assert.equal(answer.json.error, 'The order could not be placed. Nothing has been charged.');
    // No answer from the database: an order may exist, so this is not a refusal.
    state.order = noAnswer;
    answer = await send('/api/checkout', order);
    expect(answer, 502, 'unconfirmed', 'order, no answer');
    assert.equal(answer.json.error, 'We could not confirm whether your order was placed. Look at your orders before trying again.');
    // Answered without an order in the answer.
    state.order = 'ok'; state.orderRow = { orderId: ORDER };
    expect(await send('/api/checkout', order), 502, 'unconfirmed', 'order, an answer with no amount');
    state = fresh();

    // The buyer's answer about the 14 days could not be recorded: payment is
    // not started, and the order that exists is named.
    state.choice = refusal(400, 'P0001', 'withdrawal:no_policy');
    answer = await send('/api/checkout', { ...order, withdrawalChoice: 'retained' });
    expect(answer, 409, 'withdrawal_not_recorded', 'order, the choice not recorded'); assert.equal(answer.json.orderId, ORDER);
    state = fresh();

    // The order is written and nothing can take the payment.
    calls.length = 0; provider.length = 0;
    answer = await send('/api/checkout', { ...order, promotionCode: '  eid24  ', withdrawalChoice: 'waived', amountMinor: '1', priceId: 'price-of-another-market' });
    expect(answer, 503, 'provider_unavailable', 'order, no provider');
    assert.equal(answer.json.orderId, ORDER);
    assert.equal(answer.json.error, 'No payment provider is configured yet, so this order cannot be paid. It has been saved and will appear in your orders.');
    // A course, a learner, a country and a code. No price and no amount,
    // whatever the request carried.
    assert.deepEqual(rpcs('create_course_order').map((c) => c.payload), [{ p_course_id: COURSE, p_learner_profile_id: OWN, p_buyer_country: 'UG', p_promotion_code: 'eid24' }]);
    assert.deepEqual(rpcs('record_withdrawal_choice').map((c) => c.payload), [{ p_order_id: ORDER, p_accepted: true, p_country: 'UG' }]);
    assert.equal(provider.length, 0, 'a provider was called that is not configured');
    assert.equal(calls.filter((c) => c.path === '/rest/v1/payment_attempts').length, 0, 'an attempt was recorded with no provider to attempt it');

    // A plan goes through the same route and keeps the shape its page reads.
    state.plan = refusal(400, 'P0001', 'checkout:disabled');
    answer = await send('/api/checkout', { planVersionId: PLAN, priceId: 'price-1', learnerProfileId: OWN });
    assert.equal(answer.status, 503);
    assert.deepEqual(answer.json, { error: 'Subscriptions are not open on this platform yet.', code: 'checkout_disabled' });
    state = fresh();

    // The price check.
    calls.length = 0;
    expect(await send('/api/checkout/quote', order, {}), 401, 'not_signed_in', 'price, signed out');
    expect(await send('/api/checkout/quote', '{not json'), 400, 'malformed', 'price, not JSON');
    expect(await send('/api/checkout/quote', { learnerProfileId: OWN }), 400, 'malformed', 'price, no course');
    expect(await send('/api/checkout/quote', { courseId: COURSE }), 400, 'learner_required', 'price, nobody named');
    assert.equal(rpcs('quote_course_order').length, 0);
    state.quote = refusal(400, 'P0001', 'promotion:unknown_code');
    answer = await send('/api/checkout/quote', { ...order, promotionCode: 'nope' });
    expect(answer, 409, 'unknown_code', 'price, a code nobody knows'); assert.equal(answer.json.ok, false);
    state.quote = refusal(400, 'P0001', 'checkout:already_owned');
    expect(await send('/api/checkout/quote', order), 409, 'already_owned', 'price, the learner has it');
    state.quote = refusal(400, '23514', DATABASE_SENTENCE);
    answer = await send('/api/checkout/quote', order);
    expect(answer, 500, 'refused', 'price, an unnamed refusal'); assert.equal(answer.json.message, 'That price could not be worked out. Try again.');
    state.quote = noAnswer;
    expect(await send('/api/checkout/quote', order), 502, 'unconfirmed', 'price, no answer');
    // Parts that do not add up to the total are not shown as a price.
    state.quote = 'ok'; state.quoteRow = { ...fullQuote, totalMinor: '54001' };
    expect(await send('/api/checkout/quote', order), 500, 'refused', 'price, parts that do not add up');
    state.quoteRow = fullQuote; calls.length = 0;
    answer = await send('/api/checkout/quote', { ...order, promotionCode: ' eid24 ' });
    assert.equal(answer.status, 200);
    assert.deepEqual(answer.json.quote, { title: 'Synthetic reading course', listMinor: '50000', discountMinor: '5000', taxMinor: '8100', feeMinor: '900', chargeLabels: { tax: 'Tax', fee: 'Handset levy' }, totalMinor: '54000', currencyCode: 'UGX', promotionCode: 'EID24', promotionName: 'Synthetic campaign', reserved: false });
    assert.deepEqual(rpcs('quote_course_order').map((c) => c.payload), [{ p_course_id: COURSE, p_learner_profile_id: OWN, p_buyer_country: 'UG', p_promotion_code: 'eid24' }]);
    assert.equal(rpcs('create_course_order').length, 0, 'asking the price wrote an order');
    state = fresh();
    console.log('Checkout routes, no provider connected: signed out 401, malformed 400, nobody named 400, a number typed with no service to read it for left unread, 23 writer refusals each under its own name and status with no order in the reply, an unnamed refusal 500 in the route’s words, no answer from the database 502 "unconfirmed", a choice that could not be recorded and a missing provider each naming the order that exists; the writer is sent a course, a learner, a country and a code and nothing else; a plan keeps its old reply; the price check answers the same names and writes nothing. The stand-in enforces nothing: not real Auth, RLS or the writer’s own rules.');

    if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
      const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
      browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
      // Buying with nothing connected, in French: the order is saved and the
      // buyer is told it cannot be paid.
      const context = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'en', extraHTTPHeaders: uganda });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: 'fr', url: origin }]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      await tab.goto(`${origin}${BUY}`, { waitUntil: 'networkidle' });
      await tab.getByRole('heading', { name: 'Ce que vous paierez', exact: true, level: 2 }).waitFor();
      assert.equal(await tab.locator('#msisdn').count(), 0, 'a number is asked for with no provider to send it to');
      await tab.getByRole('button', { name: 'Continuer vers le paiement', exact: true }).click();
      await tab.getByRole('alert').filter({ hasText: 'Aucun prestataire de paiement n’est encore connecté ; cette commande ne peut donc pas être payée. Votre commande a été enregistrée.' }).waitFor();
      const text = await tab.locator('main').textContent();
      for (const sentence of ['SYNTHETIC', 'No payment provider', 'configured']) assert.equal(text.includes(sentence), false, `the reply is said in the server's words: ${sentence}`);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic buy form in French with no provider: no number asked for; the order is written and the buyer told, in French, that it cannot be paid and that it was saved.');
    }
  });

  // ======================================================= a provider connected
  // The provider's address is this script. Nothing here is MTN.
  // Two accounts: Uganda's, under the names without a country, and Ghana's,
  // under its own. The course is priced in Ugandan shillings.
  await withNext({ MTN_MOMO_SUBSCRIPTION_KEY: 'synthetic', MTN_MOMO_API_USER: 'synthetic', MTN_MOMO_API_KEY: 'synthetic', MTN_MOMO_BASE_URL: `http://127.0.0.1:${fake.address().port}`, MTN_MOMO_GH_SUBSCRIPTION_KEY: 'synthetic-gh', MTN_MOMO_GH_API_USER: 'synthetic-gh', MTN_MOMO_GH_API_KEY: 'synthetic-gh', MTN_MOMO_GH_BASE_URL: `http://127.0.0.1:${fake.address().port}` }, async (origin, seen) => {
    state = fresh();
    const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
    const page = async (path, headers) => { const response = await request(path, { cookie, ...uganda, ...headers }); assert.equal(response.status, 200, `${path}\n${seen.logs.slice(-2000)}`); return response.text(); };
    const send = async (path, body) => {
      const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie, ...uganda }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const text = await response.text();
      assert.equal(text.includes('SYNTHETIC-PROVIDER'), false, `${path} passed on the provider’s own sentence`);
      return { status: response.status, json: JSON.parse(text) };
    };

    const english = inner(await page(BUY, { 'accept-language': 'en' }));
    has(english, ['<label for="msisdn" class="eyebrow">Mobile money number</label>', 'The number that will be asked to approve the payment.', 'Continue to payment'], 'the English page with a provider');
    // The page says which country a number without a country code is read as one of.
    assert.match(english, /A number written without a country code is read as a number of this country: (?:<!-- -->)?<bdi>Uganda<\/bdi>(?:<!-- -->)?\. Its code: (?:<!-- -->)?<bdi dir="ltr">\+256<\/bdi>(?:<!-- -->)?\./);
    // Ghana's account collects cedis, so a course in shillings is not offered it: one service, nothing to choose.
    hasNot(english, ['No payment provider', 'No payment service', 'This order will be recorded but cannot be paid yet.', 'Pay with', 'Ghana', '+233', 'placeholder="0772'], 'the English page with a provider');
    const ar = inner(await page(BUY, { 'accept-language': 'ar' }));
    has(ar, ['<label for="msisdn" class="eyebrow">رقم محفظة الهاتف المحمول</label>', 'الرقم الذي سيُطلب منه الموافقة على الدفع.'], 'the Arabic page with a provider');
    assert.match(ar, /الرقم المكتوب بلا رمز بلد يُقرأ على أنه رقم من هذا البلد: (?:<!-- -->)?<bdi>أوغندا<\/bdi>(?:<!-- -->)?\. رمزه: (?:<!-- -->)?<bdi dir="ltr">\+256<\/bdi>(?:<!-- -->)?\./);
    hasNot(ar, [...ENGLISH_ONLY, 'lang="en"'], 'the Arabic page with a provider');

    // A number that is not one of the service's country is refused before
    // anything is written, and the reply names no order because there is none.
    calls.length = 0; provider.length = 0;
    for (const [typed, why] of [['12', 'length'], ['', 'empty'], ['call me', 'letters'], ['+254712345678', 'other_country'], ['+233 24 123 4567', 'other_country']]) {
      const refused = await send('/api/checkout', { courseId: COURSE, learnerProfileId: OWN, msisdn: typed });
      assert.equal(refused.status, 400, `"${typed}"`); assert.equal(refused.json.reason, 'phone_invalid', `"${typed}"`);
      assert.equal(refused.json.phone.why, why, `"${typed}" is refused as ${refused.json.phone.why}`);
      assert.equal('orderId' in refused.json, false, 'a refused number is answered with an order');
    }
    assert.equal(calls.filter((c) => c.path === '/rest/v1/rpc/create_course_order').length, 0, 'a refused number still wrote an order');
    assert.equal(provider.length, 0, 'a refused number reached the provider');

    // The same digits are Ghana's number when Ghana's service is the one
    // chosen: read as +233, not refused and not turned into a Ugandan number.
    // Ghana's account collects cedis and this order is in shillings, so the
    // order is saved and nobody is prompted.
    let answer = await send('/api/checkout', { courseId: COURSE, learnerProfileId: OWN, provider: 'mtn_momo_gh', msisdn: '024 123 4567' });
    assert.equal(answer.status, 503, JSON.stringify(answer.json)); assert.equal(answer.json.reason, 'provider_unavailable'); assert.equal(answer.json.orderId, ORDER);
    assert.equal(provider.length, 0, 'a service was asked to collect a currency it does not hold');
    // A Ugandan number written in full is not Ghana's to prompt. (Written
    // without its code it cannot be told from a Ghanaian one: both countries
    // write nine digits after a zero. That is why the page says which country
    // a number without a code is read as one of.)
    answer = await send('/api/checkout', { courseId: COURSE, learnerProfileId: OWN, provider: 'mtn_momo_gh', msisdn: '+256772123456' });
    assert.equal(answer.status, 400); assert.equal(answer.json.reason, 'phone_invalid'); assert.equal(answer.json.phone.why, 'other_country');
    state = fresh();

    // A number typed the way Uganda writes one. It used to be refused.
    calls.length = 0; provider.length = 0;
    answer = await send('/api/checkout', { courseId: COURSE, learnerProfileId: OWN, msisdn: '0772 123456' });
    assert.equal(answer.status, 200, JSON.stringify(answer));
    assert.deepEqual(Object.keys(answer.json).sort(), ['kind', 'orderId', 'providerReference']);
    assert.equal(answer.json.kind, 'pending'); assert.equal(answer.json.orderId, ORDER);
    // The provider is asked for the order's amount, in whole units, from the
    // number in full, and the reference the buyer is given is the one it holds.
    assert.equal(provider.length, 1);
    assert.equal(provider[0].reference, answer.json.providerReference);
    assert.equal(provider[0].payload.amount, '50000'); assert.equal(provider[0].payload.currency, 'UGX');
    assert.equal(provider[0].payload.externalId, ORDER);
    // The digits as dialled from abroad, without the plus: that is an MSISDN as MTN writes one.
    assert.deepEqual(provider[0].payload.payer, { partyIdType: 'MSISDN', partyId: '256772123456' });
    const attempts = calls.filter((c) => c.path === '/rest/v1/payment_attempts' && c.method === 'POST');
    assert.equal(attempts.length, 1);
    assert.deepEqual(attempts[0].payload, { order_id: ORDER, amount_minor: '50000', currency_code: 'UGX', provider: 'mtn_momo', method: 'mobile_money', status: 'pending', idempotency_key: `${ORDER}:1` });
    // The provider fails: its sentence stays behind, and the order is named.
    state.provider = 500;
    answer = await send('/api/checkout', { courseId: COURSE, learnerProfileId: OWN, msisdn: '+256772123456' });
    assert.equal(answer.status, 502); assert.equal(answer.json.reason, 'provider_failed'); assert.equal(answer.json.orderId, ORDER);
    // A provider that needs a number and is given none.
    state.provider = 202; provider.length = 0;
    // It used to write the order first and let the provider's adapter throw:
    // an order nobody could pay, and "the payment could not be started".
    calls.length = 0;
    answer = await send('/api/checkout', { courseId: COURSE, learnerProfileId: OWN });
    assert.equal(answer.status, 400); assert.equal(answer.json.reason, 'phone_invalid'); assert.equal(answer.json.phone.why, 'empty');
    assert.equal(calls.filter((c) => c.path === '/rest/v1/rpc/create_course_order').length, 0, 'an order was written with no number to prompt');
    assert.equal(provider.length, 0);
    // One that is named and not connected.
    answer = await send('/api/checkout', { courseId: COURSE, learnerProfileId: OWN, provider: 'airtel_money', msisdn: '0772 123456' });
    assert.equal(answer.status, 503); assert.equal(answer.json.reason, 'provider_unavailable'); assert.equal(answer.json.orderId, ORDER);
    console.log('Checkout route with a synthetic provider: five numbers that are not one of the service’s country refused by name with no order written; the same digits read as Ghana’s when Ghana’s service is chosen, and that service not asked for shillings; a number typed the way Uganda writes one accepted and sent as MTN writes it; the provider is asked for the order’s own amount and the buyer is given the provider’s reference; an attempt is recorded before the provider is called; a provider that fails is answered 502 without its sentence and with the order named. Not MTN, and no money.');

    if (browser) {
      const open = async (code, width) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', extraHTTPHeaders: uganda });
        await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: code, url: origin }]);
        const tab = await context.newPage();
        const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
        // What React says about a page the browser drew differently from the
        // server is said on the console, not thrown. A refused request is said
        // there too, and this script refuses on purpose, so that is left out.
        tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
        const sent = []; tab.on('request', (r) => { if (r.url().includes('/api/checkout')) sent.push(`${r.method()} ${new URL(r.url()).pathname}`); });
        await tab.goto(`${origin}${BUY}`, { waitUntil: 'networkidle' });
        return { context, tab, errors, sent };
      };
      // The fullest page: a family, the notice about the learner who has it,
      // the withdrawal box, a number to type.
      state = fresh(); state.learners = [aisha, bilal, own]; state.entitled = new Set([OWN]); state.withdrawal = waiver; state.quoteRow = fullQuote;
      for (const [code, heading] of [['en', 'What you will pay'], ['ar', 'ما ستدفعه'], ['ta', 'நீங்கள் செலுத்தவிருப்பது']]) {
        for (const width of [320, 390, 1440]) {
          const { context, tab, errors } = await open(code, width);
          assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
          assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 2 }).count(), 1, `${code} ${width}: heading`);
          // With the price worked out too, which is the widest line on the page.
          await tab.locator('#learner').selectOption(AISHA);
          await tab.locator('#promotion').fill('eid24');
          await tab.locator('#promotion ~ button').click();
          await tab.getByRole('status').filter({ hasText: 'UGX 54000' }).waitFor();
          const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
          assert.ok(scroll <= width + 1, `${code} ${width}: the page scrolls sideways (${scroll})`);
          // Nothing inside the card may be wider than the card.
          const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card, main .notice, main select, main input')].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 || el.getBoundingClientRect().left < -1).length);
          assert.equal(spill, 0, `${code} ${width}: something is wider than the page or its card`);
          // The box sits beside its paragraph, not across the card above it,
          // and the price button is beside the code, not a bar under it.
          const box = await tab.locator('#withdrawal-waiver').boundingBox();
          assert.ok(box.width <= 24, `${code} ${width}: the withdrawal box is ${box.width}px wide`);
          const words = await tab.locator('label[for="withdrawal-waiver"] span').boundingBox();
          assert.ok(box.y < words.y + words.height && words.y < box.y + box.height, `${code} ${width}: the withdrawal box is on a line of its own`);
          // Where there is room: a long label on a narrow phone goes under it.
          if (width === 1440 || (code === 'en' && width === 390)) {
            const field = await tab.locator('#promotion').boundingBox();
            const button = await tab.locator('#promotion ~ button').boundingBox();
            assert.ok(Math.abs(field.y - button.y) <= 2 && Math.abs(field.height - button.height) <= 4, `${code} ${width}: the price button is not beside the code (${JSON.stringify(field)} ${JSON.stringify(button)})`);
          }
          assert.deepEqual(errors, [], `${code} ${width}: page errors`);
          if (process.env.RESPONSIVE_SCREENSHOTS && [390, 1440].includes(width)) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/buy-${code}-${width}.png`, fullPage: true });
          await context.close();
        }
        console.log(`Synthetic buy page in ${code}, a family, the withdrawal box and a worked-out price: fits at 320, 390 and 1440px`);
      }

      // The whole form, in Arabic.
      {
        const { context, tab, errors, sent } = await open('ar', 390);
        assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main h2')).direction), 'rtl');
        // The amount stays left to right inside a right-to-left page.
        assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main .card bdi')).direction), 'ltr');
        const buy = tab.getByRole('button', { name: 'المتابعة إلى الدفع', exact: true });
        const alert = (text) => tab.getByRole('alert').filter({ hasText: text }).waitFor();
        // Nobody chosen: said without a request.
        await buy.click();
        await alert('اختر من تكون له هذه الدورة.');
        assert.equal(sent.length, 0, 'an order for nobody was still sent');
        await tab.locator('#learner').selectOption(AISHA);
        // Next keeps an announcer of its own outside <main>; these are the form's.
        const alerts = tab.locator('main').getByRole('alert');
        assert.equal(await alerts.count(), 0, 'the form still says nobody is chosen after somebody was');

        // The price.
        const check = tab.getByRole('button', { name: 'تحقّق من السعر', exact: true });
        await tab.locator('#promotion').fill('eid24');
        state.quote = refusal(400, 'P0001', 'promotion:unknown_code');
        await check.click();
        await alert('هذا الرمز غير معروف لدينا. تحقّق منه وحاول مرة أخرى.');
        state.quote = refusal(400, 'P0001', 'promotion:not_running');
        await check.click();
        await alert('هذا الرمز غير سارٍ حاليًا: إما أنه انتهى أو لم يبدأ بعد.');
        state.quote = noAnswer;
        await check.click();
        await alert('تعذّر حساب السعر. حاول مرة أخرى.');
        state.quote = 'ok';
        await check.click();
        const price = tab.getByRole('status').filter({ hasText: 'UGX 54000' });
        await price.waitFor();
        assert.equal((await price.textContent()).replace(/\s+/g, ' ').trim(), 'السعر المعلن UGX 50000 · الرمز EID24 يخصم UGX 5000 · الضريبة UGX 8100 · Handset levy UGX 900 · تدفع UGX 54000. تُحسب الضريبة والرسوم على السعر بعد أي خصم. لا يُحجز شيء حتى تقدّم الطلب.');
        // The database's own name for a charge is English, and says so.
        assert.equal(await price.locator('bdi[lang="en"][dir="ltr"]').textContent(), 'Handset levy');
        assert.equal(await alerts.count(), 0, 'the refusal of the price is still shown beside the price');
        // Changing who it is for takes the price away: it was somebody else's.
        await tab.locator('#learner').selectOption(BILAL);
        assert.equal(await price.count(), 0, 'a price worked out for one learner is still shown for another');
        await tab.locator('#learner').selectOption(AISHA);

        // The order.
        const number = tab.locator('#msisdn');
        assert.equal(await number.getAttribute('dir'), 'ltr');
        calls.length = 0;
        // Before anything is typed, the field says whose a number without a country code is.
        const help = tab.locator('#msisdn-help');
        assert.equal((await help.innerText()).replace(/[\u2066-\u2069]/g, ''), 'الرقم الذي سيُطلب منه الموافقة على الدفع. الرقم المكتوب بلا رمز بلد يُقرأ على أنه رقم من هذا البلد: أوغندا. رمزه: +256.');
        assert.equal(await number.getAttribute('placeholder'), null, 'the field still shows one country’s way of writing a number');
        await number.fill('12');
        // The mistake is named as it is typed, in the phone card's own words, and nothing is sent.
        assert.ok((await help.innerText()).startsWith('عدد الخانات في رقم من هذا البلد بعد رمز البلد: 9.'), await help.innerText());
        assert.equal(await number.getAttribute('aria-invalid'), 'true');
        const before = calls.length;
        await buy.click();
        await alert('رقم الهاتف هذا غير صحيح. تحقّق منه وحاول مرة أخرى.');
        assert.equal(rpcs('create_course_order').length, 0, 'a mistyped number wrote an order');
        assert.equal(calls.length, before, 'a number the form could name was sent');
        // A Kenyan number is not this service's to prompt.
        await number.fill('+254712345678');
        assert.ok((await help.innerText()).replace(/[\u2066-\u2069]/g, '').startsWith('بداية هذا الرقم: +2547.'), await help.innerText());
        // The reader's own digits are a number, and the note comes back.
        await number.fill('٠٧٧٢ ١٢٣ ٤٥٦');
        assert.ok((await help.innerText()).startsWith('الرقم الذي سيُطلب منه الموافقة على الدفع.'));
        assert.equal(await number.getAttribute('aria-invalid'), null);
        await number.fill('0772 123456');
        state.order = refusal(400, 'P0001', 'checkout:already_owned');
        await buy.click();
        await alert('هذا المتعلّم لديه هذه الدورة من قبل، فشراؤها مرة أخرى لا يضيف شيئًا.');
        state.order = refusal(400, 'P0001', 'promotion:limit_reached_family');
        await buy.click();
        await alert('لقد استخدمت عائلتك هذا الرمز بالقدر الذي يسمح به.');
        state.order = refusal(400, '23514', DATABASE_SENTENCE);
        await buy.click();
        await alert('تعذّر تقديم الطلب. لم يُخصم أي مبلغ.');
        // No answer from the database: an order may exist, so the sentence
        // sends the buyer to look rather than to press again, and does not
        // say an order was saved.
        state.order = noAnswer;
        await buy.click();
        await alert('لم نتمكّن من التأكّد من تقديم طلبك. راجع طلباتك قبل المحاولة مرة أخرى.');
        let text = await tab.locator('main').textContent();
        for (const sentence of ['SYNTHETIC-DATABASE', 'could not', 'That learner', 'حُفظ طلبك']) assert.equal(text.includes(sentence), false, `a refusal is said in English, in the database's words, or with an order nobody can vouch for: ${sentence}`);
        // The connection goes: the form says so and comes back to life.
        await context.setOffline(true);
        await buy.click();
        await alert('تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.');
        assert.equal(await buy.isEnabled(), true, 'the form stays busy for good when the request cannot be made');
        await context.setOffline(false);
        // The provider fails after the order is written.
        state.order = 'ok'; state.provider = 500;
        await buy.click();
        await alert('تعذّر بدء الدفع. راجع طلباتك قبل المحاولة مرة أخرى. حُفظ طلبك.');
        text = await tab.locator('main').textContent();
        assert.equal(text.includes('SYNTHETIC-PROVIDER'), false);
        // The box was never ticked, and that is what was recorded each time.
        assert.ok(rpcs('record_withdrawal_choice').length > 0);
        assert.ok(rpcs('record_withdrawal_choice').every((c) => c.payload.p_accepted === false), 'an unticked box was recorded as a waiver');

        // Pressed twice while the order is being written: one order.
        state.provider = 202; state.delay = 700; calls.length = 0; provider.length = 0; sent.length = 0;
        await tab.locator('#withdrawal-waiver').check();
        await buy.dblclick();
        await tab.getByRole('status').filter({ hasText: 'وافق على الدفع من هاتفك. تُفتح دورتك عند تأكّد الدفع. قد يستغرق ذلك لحظات.' }).waitFor();
        assert.deepEqual(sent, ['POST /api/checkout'], 'pressing twice sent two orders');
        assert.equal(rpcs('create_course_order').length, 1);
        assert.deepEqual(rpcs('create_course_order')[0].payload, { p_course_id: COURSE, p_learner_profile_id: AISHA, p_buyer_country: 'UG', p_promotion_code: 'eid24' });
        assert.deepEqual(rpcs('record_withdrawal_choice').map((c) => c.payload.p_accepted), [true], 'a ticked box was not recorded as one');
        assert.equal(provider.length, 1); assert.equal(provider[0].payload.payer.partyId, '256772123456');
        assert.equal(await alerts.count(), 0, 'an earlier refusal is still shown beside the confirmation');
        state.delay = 0;
        assert.deepEqual(errors, []);
        await context.close();
        console.log('Synthetic buy form in Arabic: nobody chosen said without a request; an unknown code, a code not running and an unreadable answer each said in Arabic; a price with a discount, tax and a database-named fee written out, the fee’s English name marked; the price cleared when the learner changes; a mistyped number refused with no order written; three refusals and "could not confirm" in Arabic without the database’s sentence; a lost connection said as one and the form usable again; a provider failure with the order said to be saved; the unticked box recorded as kept and the ticked one as waived; two presses, one order; the confirmation.');
      }
    }
  });
  console.log('Buy HTTP smoke passed. Not real Auth, RLS, order rules or a real provider; no money.');
} finally {
  if (browser) await browser.close();
  await new Promise((r) => fake.close(r));
}
