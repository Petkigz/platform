// The real Next /orders page and the two routes behind its forms, against an
// entirely synthetic loopback Auth/REST API. This is not evidence about hosted
// Supabase, JWT validation, RLS, an order, a payment, a refund or a promotion
// code: the stand-in answers whatever it is told to and no money exists in
// it. What the database does is proved by its own suites.
//
// Checkout is behind `commerce.checkout`, which is off; nothing here switches
// it on, and no payment service is spoken to.
//
// What it does show: the page in the reader's own language (English, Arabic,
// French) and in English, marked, for a language held for review; an order's
// state said from the catalogue and a state with no word left unsaid; totals
// in major units (it printed whatever `format()` gave, which was right, beside
// English prose, which was not); the parts of a total and what changed them;
// the four standings of a refund as four different things, with no answer said
// as no answer and not as a refusal; orders that could not be read said as
// that and not as "you have placed none"; "payment confirmed" said only for a
// paid order; every refusal of a refund request and of a code under its own
// name and status with none of the database's words; a refund asked for what
// is left and not for the order's total; and, with a browser, that the page
// fits a phone with every form open and that each form says what happened in
// the reader's language. The expected sentences are typed here rather than
// imported, so this fails if a catalogue changes without anybody looking at
// the page.
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

const ACCOUNT = '99999999-9999-4999-8999-999999999999';
const PAID = '11111111-1111-4111-8111-111111111111';
const CODED = '22222222-2222-4222-8222-222222222222';
const UNPAID = '33333333-3333-4333-8333-333333333333';
const PARTLY = '44444444-4444-4444-8444-444444444444';
const CLOSED = '55555555-5555-4555-8555-555555555555';
const UNSURE = '66666666-6666-4666-8666-666666666666';
const RETURNED = '77777777-7777-4777-8777-777777777777';
const ODD = '88888888-8888-4888-8888-888888888888';
const TAXED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SPENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
// A sentence only the database would write. It must reach no reader and no reply.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE new row violates check constraint "refund_requests_amount"';

const order = (id, status, currency, total, extra = {}) => ({
  id, status, currency_code: currency, subtotal_minor: total, discount_minor: 0, tax_minor: 0, fee_minor: 0, total_minor: total,
  paid_at: ['paid', 'partially_refunded', 'refunded'].includes(status) ? '2026-11-19T09:14:00Z' : null, created_at: '2026-11-19T09:00:00Z',
  order_items: [{ id: `item-${id}`, item_snapshot: { title: 'Fiqh of prayer' } }], order_adjustments: [], ...extra,
});
const ORDERS = [
  // Paid, 19.99, and a title somebody typed.
  order(PAID, 'paid', 'USD', 1999, { order_items: [{ id: 'i1', item_snapshot: { title: 'Tajwid <for> beginners' } }] }),
  // Unpaid with a code on it: the total is made of parts, and the code's own line says which.
  order(CODED, 'pending_payment', 'UGX', 45000, { subtotal_minor: 50000, discount_minor: 5000, order_adjustments: [{ id: 'adj-1', adjustment_type: 'promotion', direction: 'credit', amount_minor: 5000, currency_code: 'UGX', description: 'EID24 <Eid offer>', voided_at: null, voided_reason: null }] }),
  // Unpaid with none, in a three-decimal currency, with an Arabic title.
  order(UNPAID, 'pending_payment', 'KWD', 5000, { order_items: [{ id: 'i3', item_snapshot: { title: 'سيرة النبي' } }] }),
  // Partly refunded: 30000 was paid and 12000 is left.
  order(PARTLY, 'partially_refunded', 'UGX', 30000),
  order(CLOSED, 'paid', 'UGX', 60000),
  order(UNSURE, 'paid', 'UGX', 70000),
  order(RETURNED, 'refunded', 'UGX', 80000),
  // A state the page has no word for, a total that is not an amount, and no title.
  order(ODD, 'chargeback', 'USD', '19.99', { order_items: [] }),
  // Tax and a fee, a note in Arabic, and an adjustment that was withdrawn with a reason.
  order(TAXED, 'awaiting_confirmation', 'KES', 1200000, { subtotal_minor: 1000000, tax_minor: 180000, fee_minor: 20000, order_adjustments: [
    { id: 'adj-2', adjustment_type: 'tax', direction: 'debit', amount_minor: 180000, currency_code: 'KES', description: 'ضريبة القيمة المضافة', voided_at: null, voided_reason: null },
    { id: 'adj-3', adjustment_type: 'shipping', direction: 'debit', amount_minor: 50000, currency_code: 'KES', description: null, voided_at: '2026-11-19T10:00:00Z', voided_reason: 'Added by mistake' },
    // An amount that is not one: the line is left out.
    { id: 'adj-4', adjustment_type: 'fee', direction: 'debit', amount_minor: 'lots', currency_code: 'KES', description: 'SYNTHETIC unreadable', voided_at: null, voided_reason: null },
  ] }),
  order(SPENT, 'paid', 'UGX', 90000),
];
const standing = (id, reason, extra = {}) => ({
  orderId: id, orderNumber: 'AS-00000001', status: 'paid', allowed: reason === 'allowed', reason,
  // English the database writes. The page must not print it.
  message: 'SYNTHETIC-STANDING A refund can be asked for until 22 Nov 2026 at 09:14 UTC.',
  windowHours: 72, paidAt: '2026-11-19T09:14:00Z', closesAt: '2026-11-22T09:14:00Z', remainingHours: 40, refundableMinor: '1999', currencyCode: 'USD', asStaff: false,
  withdrawal: { rule: 'policy_window', hours: 72, closesAt: '2026-11-22T09:14:00Z' }, ...extra,
});
const STANDINGS = {
  [PAID]: standing(PAID, 'allowed'),
  [PARTLY]: standing(PARTLY, 'allowed', { refundableMinor: '12000', currencyCode: 'UGX', closesAt: '2026-12-03T09:14:00Z', withdrawal: { rule: 'statutory_14_days' } }),
  [CLOSED]: standing(CLOSED, 'window_closed', { refundableMinor: '60000', currencyCode: 'UGX', closesAt: '2026-11-18T08:00:00Z', withdrawal: { rule: 'waived_policy_window' } }),
  [SPENT]: standing(SPENT, 'nothing_left', { refundableMinor: '0', currencyCode: 'UGX' }),
};

const fresh = () => ({
  // rows, or 'broken'
  memberships: [{ billing_account_id: ACCOUNT }], orders: ORDERS,
  // What each writer answers: 'ok', or [status, body].
  refund: 'ok', apply: 'ok', remove: 'ok',
});
let state = fresh();
const calls = [];
const raise = (message, code = '23514', status = 400) => [status, { code, message, details: null, hint: null }];
const refusal = (key, code = 'P0001') => raise(`promotion:${key}`, code);
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
  calls.push({ method: req.method, path, sent, query: url.search });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  const broken = () => send({ code: '57014', message: 'SYNTHETIC-DATABASE canceling statement due to statement timeout', details: null, hint: null }, 500);
  const writer = (how, good) => { if (how === 'ok') send(good); else send(how[1], how[0]); };
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Halima Probe', preferred_language: 'en', timezone: 'Africa/Kampala', account_status: 'active' }]);
  else if (path === '/rest/v1/billing_account_memberships') { if (state.memberships === 'broken') broken(); else send(state.memberships); }
  else if (path === '/rest/v1/orders') { if (state.orders === 'broken') broken(); else send(state.orders); }
  else if (path === '/rest/v1/rpc/refund_standing') { const row = STANDINGS[sent?.p_order_id]; if (row) send(row); else broken(); }
  else if (path === '/rest/v1/rpc/request_refund') writer(state.refund, 'request-1');
  else if (path === '/rest/v1/rpc/apply_promotion_to_order') writer(state.apply, { code: 'EID24', campaignName: 'Eid offer', discountMinor: '500', totalMinor: '4500', currencyCode: 'KWD' });
  else if (path === '/rest/v1/rpc/remove_promotion_from_order') writer(state.remove, { code: 'EID24', removedMinor: '5000', totalMinor: '50000', currencyCode: 'UGX' });
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
  const ENGLISH = ['My orders', 'Account settings', 'Paid', 'Waiting for payment', 'Partly refunded', 'Refunded', 'Total:', 'Placed on', 'Subtotal', 'Discount', 'Start learning', 'Receipt', 'Not paid', 'Ask for a refund', 'A refund can be asked', 'Use this code', 'Take the code off', 'Withdrawn', 'Access opens', 'What you have paid', 'could not be read', 'Help<'];
  const date = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: 'UTC' }).format(new Date(iso));
  const li = (main, state, index = 0) => { const parts = main.split(`<li data-order="${state}">`); assert.ok(parts.length > index + 1, `no ${state} order ${index}`); return parts[index + 1].split('</li>')[0]; };

  // ================================================================ the page
  {
    state = fresh(); calls.length = 0;
    const out = await fetch(`${origin}/orders`, { redirect: 'manual', signal: AbortSignal.timeout(90000) });
    assert.equal(out.status, 307); assert.match(out.headers.get('location') ?? '', /\/sign-in\?next=\/orders/);
    assert.equal(calls.length, 0, 'something was read for nobody');

    let seen = await get('/orders');
    assert.equal(seen.status, 200, logs.slice(-2000));
    assert.match(seen.html, /<title>My orders/);
    has(seen.main, ['<p class="eyebrow"><a href="/account">Account settings</a></p>', '<h1>My orders</h1>', '<ul class="lessons stacked" data-orders="list">',
      '<p class="muted order-foot">Access opens when a payment is confirmed. Coming back from a payment screen is not confirmation.</p>',
      '<a href="/billing">What you have paid</a>', 'Money that has moved and money that has not, across every order on your account.'], 'the page');
    assert.equal(seen.main.split('<li data-order=').length - 1, 10, 'orders drawn');
    // Nothing the database wrote in English, and nothing as it is stored.
    // (Outside the attribute the checks below find each order by.)
    none(seen.main.replace(/ data-order="[a-z_]+"/g, ''), ['SYNTHETIC', 'chargeback', 'pending_payment', 'awaiting_confirmation', 'partially_refunded', 'USD 1999', 'placeholder=', 'Awaiting payment', 'Contact Help', 'hours left', 'days left', 'promotion', 'shipping', 'returning from'], 'the page');

    // Paid: 19.99 and not 1999; a title somebody typed is text; when it was placed, with its zone.
    let row = li(seen.main, 'paid');
    has(row, ['<div class="order-head"><strong><bdi>Tajwid &lt;for&gt; beginners</bdi></strong><span class="badge ok">Paid</span></div>',
      '<p class="meta" data-total="true">Total: <bdi dir="ltr">USD 19.99</bdi></p>', `<p class="meta">Placed on: <bdi>${date('en', '2026-11-19T09:00:00Z')}</bdi></p>`,
      '<a class="btn secondary" href="/learn">Start learning</a>', `<a class="btn ghost" href="/orders/${PAID}/receipt">Receipt</a>`,
      `<div class="order-part" data-refund="open"><p class="muted">A refund can be asked for until: <bdi>${date('en', '2026-11-22T09:14:00Z')}</bdi></p><div class="order-form"><button type="button" class="btn secondary">Ask for a refund</button></div></div>`], 'the paid order');
    // The ordinary window: a date, and no rule added to it. A total that is the whole story has no parts.
    none(row, ['14 days', 'data-line=', 'data-code-form', 'Not paid'], 'the paid order');
    assert.match(date('en', '2026-11-22T09:14:00Z'), /UTC$/);

    // Unpaid with a code: the parts of the total, each with its sign, and the code's own line under them, set apart.
    row = li(seen.main, 'pending_payment');
    has(row, ['<span class="badge neutral">Waiting for payment</span>', 'Total: <bdi dir="ltr">UGX 45000</bdi>',
      '<p class="muted order-line" data-line="subtotal">Subtotal: <bdi dir="ltr">UGX 50000</bdi></p><p class="muted order-line" data-line="discount">Discount: <bdi dir="ltr">−UGX 5000</bdi></p>',
      '<p class="muted order-line order-adjustment" data-adjustment="live">Discount: <bdi dir="ltr">−UGX 5000</bdi> <bdi dir="auto" class="order-note">EID24 &lt;Eid offer&gt;</bdi></p>',
      '<p class="muted">Not paid, so no access yet</p><div class="order-form" data-code-form="applied"><div class="order-actions"><button type="button" class="btn ghost">Take the code off</button></div></div>'], 'the unpaid order with a code');
    none(row, ['Start learning', 'Receipt', 'data-refund', '<input', 'data-line="tax"', 'data-line="fee"'], 'the unpaid order with a code');
    // Unpaid with none: a labelled box for a code, read left to right; three decimals for a dinar.
    row = li(seen.main, 'pending_payment', 1);
    has(row, ['<strong><bdi>سيرة النبي</bdi></strong>', 'Total: <bdi dir="ltr">KWD 5.000</bdi>', `<label for="c-${UNPAID}">Discount code</label>`, 'Use this code</button>'], 'the unpaid order with no code');
    assert.match(row, new RegExp(`<input id="c-${UNPAID}"[^>]*dir="ltr"[^>]*>`));
    assert.match(row, /<button type="button" class="btn secondary" disabled="">Use this code<\/button>/);
    none(row, ['Take the code off', 'data-line='], 'the unpaid order with no code');

    // Partly refunded: the law's fourteen days are said, and the receipt stays.
    row = li(seen.main, 'partially_refunded');
    has(row, ['<span class="badge neutral">Partly refunded</span>', 'Total: <bdi dir="ltr">UGX 30000</bdi>', `/orders/${PARTLY}/receipt`,
      `<div class="order-part" data-refund="open"><p class="muted">A refund can be asked for until: <bdi>${date('en', '2026-12-03T09:14:00Z')}</bdi></p><p class="muted">This is the 14 days the law gives for withdrawing from a purchase.</p>`, 'Ask for a refund'], 'the partly refunded order');
    none(row, ['Start learning'], 'the partly refunded order');

    // A window that closed is said with its date and its rule; nothing left is said; no answer is said as no answer. None has a button.
    row = li(seen.main, 'paid', 1);
    has(row, [`<div class="order-part" data-refund="closed"><p class="muted">The time for asking for a refund on this order ended on: <bdi>${date('en', '2026-11-18T08:00:00Z')}</bdi><span class="order-rule">The 14 days the law gives do not apply to this order, because the course was opened at once at the buyer’s request.</span> <a href="/support">Help</a></p></div>`], 'the closed window');
    none(row, ['<button', 'Ask for a refund'], 'the closed window');
    row = li(seen.main, 'paid', 2);
    has(row, ['<div class="order-part" data-refund="unread"><p class="muted">Whether a refund can be asked for on this order could not be read just now. <a href="/support">Help</a></p></div>'], 'the unread standing');
    none(row, ['<button', 'ended', 'cannot be asked'], 'the unread standing');
    row = li(seen.main, 'paid', 3);
    has(row, ['<div class="order-part" data-refund="nothing_left"><p class="muted">Everything paid on this order has already been returned. <a href="/support">Help</a></p></div>'], 'nothing left');
    // Refunded: a receipt, and nothing to ask for.
    row = li(seen.main, 'refunded');
    has(row, ['<span class="badge neutral">Refunded</span>', `/orders/${RETURNED}/receipt`], 'the refunded order');
    none(row, ['data-refund', 'Start learning'], 'the refunded order');
    // Standing is asked about the five orders that could be refunded, and no other.
    assert.deepEqual(rpcs('refund_standing').map((c) => c.sent.p_order_id).sort(), [PAID, PARTLY, CLOSED, UNSURE, SPENT].sort());

    // A state with no word: no badge and no button. A total that is not an amount is left out. No title is "Order".
    row = li(seen.main, 'unknown');
    has(row, ['<div class="order-head"><strong>Order</strong></div>', 'Placed on: '], 'the odd order');
    none(row, ['badge', 'data-total', '19.99', '<a ', '<button'], 'the odd order');
    // Tax and a fee in shillings; a note in Arabic keeps its direction; a withdrawn line stays, marked, with its reason; an unreadable one is left out.
    row = li(seen.main, 'awaiting_confirmation');
    has(row, ['<span class="badge neutral">Payment being confirmed</span>', 'Total: <bdi dir="ltr">KES 12000.00</bdi>',
      'data-line="subtotal">Subtotal: <bdi dir="ltr">KES 10000.00</bdi>', 'data-line="tax">Tax: <bdi dir="ltr">+KES 1800.00</bdi>', 'data-line="fee">Fee: <bdi dir="ltr">+KES 200.00</bdi>',
      '<p class="muted order-line order-adjustment" data-adjustment="live">Tax: <bdi dir="ltr">+KES 1800.00</bdi> <bdi dir="auto" class="order-note">ضريبة القيمة المضافة</bdi></p>',
      '<p class="muted order-line order-adjustment" data-adjustment="withdrawn">Adjustment: <bdi dir="ltr">+KES 500.00</bdi> <span class="badge neutral">Withdrawn</span> <bdi dir="auto" class="order-note">Added by mistake</bdi></p>'], 'the taxed order');
    none(row, ['data-line="discount"', 'unreadable', 'Start learning', 'Receipt', 'data-code-form', 'data-refund'], 'the taxed order');
    assert.equal(row.split('data-adjustment=').length - 1, 2);

    // Coming back from a payment screen: waiting is said for an order that is not paid, "confirmed" only for one that is.
    seen = await get(`/orders?pending=${UNPAID}`);
    has(seen.main, ['<div class="notice warn" role="status" data-returned="waiting"><strong>Still waiting for confirmation.</strong> You came back from the payment screen, and the payment has not been confirmed yet. Access opens as soon as it is. You can leave this page and come back.</div>'], 'back, unpaid');
    none(seen.main, ['Payment confirmed.'], 'back, unpaid');
    seen = await get(`/orders?pending=${TAXED}`);
    has(seen.main, ['data-returned="waiting"'], 'back, being confirmed'); none(seen.main, ['Payment confirmed.'], 'back, being confirmed');
    seen = await get(`/orders?pending=${PAID}`);
    has(seen.main, ['<div class="notice" role="status" data-returned="paid"><strong>Payment confirmed.</strong> Access is open. <a href="/learn">Go to my learning</a></div>'], 'back, paid');
    none(seen.main, ['Still waiting'], 'back, paid');
    seen = await get('/orders?pending=00000000-0000-4000-8000-000000000000');
    none(seen.main, ['data-returned'], 'back, from an order that is not here');

    // None, and unread, are different things.
    state = fresh(); state.orders = [];
    seen = await get('/orders');
    has(seen.main, ['<p class="empty" data-orders="none">You have not placed any orders yet. <a href="/catalogue">Browse the courses</a></p>'], 'no orders');
    none(seen.main, ['could not be read', 'data-orders="list"'], 'no orders');
    state = fresh(); state.memberships = []; calls.length = 0;
    seen = await get('/orders');
    has(seen.main, ['data-orders="none"'], 'no billing account');
    assert.equal(calls.filter((c) => c.path === '/rest/v1/orders').length, 0, 'orders were read for no account');
    for (const what of ['orders', 'memberships']) {
      state = fresh(); state[what] = 'broken';
      seen = await get(`/orders?pending=${PAID}`);
      has(seen.main, ['<div class="notice error" role="alert" data-orders="unread">Your orders could not be read just now. Nothing has changed: this page only reads.</div>'], `${what} unread`);
      none(seen.main, ['You have not placed any orders yet', 'SYNTHETIC', 'statement timeout', 'data-returned', 'data-orders="list"'], `${what} unread`);
    }

    // Arabic, French, and Hausa (held: English, whole, marked).
    state = fresh();
    seen = await get('/orders', 'ar');
    assert.match(seen.html, /<title>طلباتي/);
    has(seen.main, ['<h1>طلباتي</h1>', '<a href="/account">إعدادات الحساب</a>', '<span class="badge ok">مدفوع</span>', 'الإجمالي: <bdi dir="ltr">USD 19.99</bdi>', `تاريخ الطلب: <bdi>${date('ar', '2026-11-19T09:00:00Z')}</bdi>`,
      'الخصم: <bdi dir="ltr">−UGX 5000</bdi>', 'اطلب استرداد المبلغ', `يمكن طلب الاسترداد حتى: <bdi>${date('ar', '2026-11-22T09:14:00Z')}</bdi>`, 'هذه هي الأربعة عشر يومًا التي يمنحها القانون للتراجع عن الشراء.',
      'استخدم هذا الرمز', 'أزل الرمز', '>رمز الخصم</label>', 'ابدأ التعلّم', 'الإيصال', '<a href="/support">المساعدة</a>', 'يُفتح الوصول عند تأكّد الدفع. العودة من شاشة الدفع ليست تأكيدًا.',
      // What somebody else wrote is theirs.
      'EID24 &lt;Eid offer&gt;', 'Added by mistake'], 'the Arabic page');
    none(seen.main, [...ENGLISH, 'lang="en"', 'SYNTHETIC'], 'the Arabic page');
    seen = await get('/orders', 'fr');
    // French puts a no-break space before a colon.
    has(seen.main, ['<h1>Mes commandes</h1>', 'Total\u00a0: <bdi dir="ltr">USD 19.99</bdi>', `Commande passée le\u00a0: <bdi>${date('fr', '2026-11-19T09:00:00Z')}</bdi>`, 'Remise\u00a0: <bdi dir="ltr">−UGX 5000</bdi>', 'Demander un remboursement', 'Utiliser ce code', 'Retirer le code', '>Code de réduction</label>'], 'the French page');
    none(seen.main, ENGLISH, 'the French page');
    seen = await get('/orders', 'ha');
    assert.match(seen.main, /<div class="page" lang="en" dir="ltr">/, 'Hausa is not given the English page, marked');
    has(seen.main, ['<h1>My orders</h1>', 'Ask for a refund'], 'the Hausa page');
  }
  console.log('My orders: signed out goes to sign in and reads nothing; ten orders drawn with a state from the catalogue (one the page has no word for gets none), totals in major units (USD 19.99, KWD 5.000, KES 12000.00) and one that is not an amount left out, the parts of a total with their signs, a code’s own line and a withdrawn one with what was written beside them kept as written; a refund open (with the law’s fourteen days said where they apply), closed with its date and rule, nothing left, and unread, four different things with a button only on the first; coming back says "confirmed" only for a paid order; none and unread are different, the second aloud; Arabic and French by the reader’s choice, Hausa in English, marked.');

  // ============================================================== the routes
  {
    const post = async (path, body, signedIn = true) => {
      const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(signedIn ? { cookie } : {}) }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const text = await response.text();
      for (const word of ['SYNTHETIC', 'check constraint', 'upstream', 'promotion:', '26 Oct 2026']) assert.ok(!text.includes(word), `a reply says "${word}"`);
      return { status: response.status, json: JSON.parse(text), text, cache: response.headers.get('cache-control') };
    };

    // Asking for a refund: the order, whole minor units and the reason, trimmed; no currency.
    const ask = { orderId: PAID, amountMinor: '1999', reason: '  Duplicate charge  ', currencyCode: 'EUR' };
    state = fresh(); calls.length = 0;
    let answer = await post('/api/refunds', ask);
    assert.equal(answer.status, 201); assert.deepEqual(answer.json, { ok: true, requestId: 'request-1' }); assert.equal(answer.cache, 'no-store');
    assert.deepEqual(rpcs('request_refund').map((c) => c.sent), [{ p_order_id: PAID, p_amount_minor: 1999, p_reason: 'Duplicate charge' }]);
    for (const [message, code, status, reason] of [
      ['sign in to request a refund', '42501', 401, 'not_signed_in'],
      ['order not found', 'P0002', 403, 'not_yours'],
      ['you are not on the billing account for this order', '42501', 403, 'not_yours'],
      ['order is pending_payment, so there is nothing to refund', '23514', 409, 'not_paid'],
      ['refund request of 99999 exceeds the refundable balance of 30000', '23514', 409, 'too_much'],
      ['the refund window closed on 26 Oct 2026 at 09:14 UTC — a refund can be asked for within 72 hours of payment', '23514', 409, 'window_closed'],
      ['say what the refund is for', '23514', 400, 'reason_required'],
      [DATABASE_SENTENCE, '23514', 500, 'failed'],
    ]) {
      state.refund = raise(message, code);
      answer = await post('/api/refunds', ask);
      assert.equal(answer.status, status, message); assert.equal(answer.json.reason, reason, message); assert.equal(answer.json.ok, false, message); assert.equal(answer.cache, 'no-store', message);
    }
    assert.equal(answer.json.error, 'The request could not be sent. Nothing was changed.');
    // An order that is somebody else's and one that is not there are one reply.
    state.refund = raise('order not found', 'P0002'); const absent = (await post('/api/refunds', ask)).text;
    state.refund = raise('you are not on the billing account for this order', '42501'); assert.equal((await post('/api/refunds', ask)).text, absent);
    state.refund = noAnswer;
    answer = await post('/api/refunds', ask);
    assert.equal(answer.status, 502); assert.equal(answer.json.reason, 'unconfirmed');
    // Nothing is asked of the database for a request that cannot be one.
    state = fresh(); calls.length = 0;
    for (const [body, status, reason] of [[{ amountMinor: '1999', reason: 'x' }, 400, 'malformed'], [{ ...ask, amountMinor: '19.99' }, 400, 'malformed'], [{ ...ask, amountMinor: 19.99 }, 400, 'malformed'], [{ ...ask, amountMinor: '0' }, 400, 'malformed'], [{ ...ask, reason: '   ' }, 400, 'reason_required'], [{ ...ask, reason: 'x'.repeat(1001) }, 400, 'too_long'], ['{not json', 400, 'malformed'], ['null', 400, 'malformed']]) {
      answer = await post('/api/refunds', body);
      assert.equal(answer.status, status, JSON.stringify(body).slice(0, 60)); assert.equal(answer.json.reason, reason);
    }
    answer = await post('/api/refunds', ask, false);
    assert.equal(answer.status, 401); assert.equal(answer.json.reason, 'not_signed_in');
    assert.equal(rpcs('request_refund').length, 0);

    // A code on an order: the order and the code, and no amount.
    const use = { action: 'apply', orderId: UNPAID, code: ' eid24 ', discountMinor: '4999', totalMinor: '1' };
    state = fresh(); calls.length = 0;
    answer = await post('/api/orders/promotion', use);
    assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, code: 'EID24', discountMinor: '500', totalMinor: '4500', currencyCode: 'KWD' }); assert.equal(answer.cache, 'no-store');
    assert.deepEqual(rpcs('apply_promotion_to_order').map((c) => c.sent), [{ p_order_id: UNPAID, p_code: 'eid24' }]);
    for (const key of ['unknown_code', 'not_active', 'not_running', 'not_in_market', 'not_for_this_course', 'self_referral', 'new_customers_only', 'limit_reached_total', 'limit_reached_person', 'limit_reached_family', 'would_be_free', 'currency_mismatch', 'nothing_off', 'order_not_pending', 'already_applied']) {
      state.apply = refusal(key);
      answer = await post('/api/orders/promotion', use);
      assert.equal(answer.status, 409, key); assert.equal(answer.json.reason, key, key); assert.equal(answer.json.ok, false, key); assert.equal(answer.cache, 'no-store', key);
    }
    for (const [key, status, reason] of [['not_signed_in', 401, 'not_signed_in'], ['code_required', 400, 'malformed'], ['order_not_found', 403, 'not_yours'], ['not_your_order', 403, 'not_yours'], ['no_benefit', 500, 'failed'], ['something_new', 500, 'failed']]) {
      state.apply = refusal(key);
      answer = await post('/api/orders/promotion', use);
      assert.equal(answer.status, status, key); assert.equal(answer.json.reason, reason, key);
    }
    state.apply = refusal('order_not_found'); const nowhere = (await post('/api/orders/promotion', use)).text;
    state.apply = refusal('not_your_order'); assert.equal((await post('/api/orders/promotion', use)).text, nowhere);
    state.apply = raise(DATABASE_SENTENCE);
    answer = await post('/api/orders/promotion', use);
    assert.equal(answer.status, 500); assert.equal(answer.json.reason, 'failed'); assert.equal(answer.json.message, 'That could not be changed. Nothing was charged.');
    // A key with no SQLSTATE is not the database's answer, whatever it says.
    state.apply = [400, { message: 'promotion:unknown_code' }];
    answer = await post('/api/orders/promotion', use);
    assert.equal(answer.status, 502); assert.equal(answer.json.reason, 'unconfirmed');
    state.apply = noAnswer;
    answer = await post('/api/orders/promotion', use);
    assert.equal(answer.status, 502); assert.equal(answer.json.reason, 'unconfirmed');
    // Taking one off.
    state = fresh(); calls.length = 0;
    answer = await post('/api/orders/promotion', { action: 'remove', orderId: CODED });
    assert.equal(answer.status, 200); assert.equal(answer.json.totalMinor, '50000');
    assert.deepEqual(rpcs('remove_promotion_from_order').map((c) => c.sent), [{ p_order_id: CODED }]);
    state.remove = refusal('none_applied');
    answer = await post('/api/orders/promotion', { action: 'remove', orderId: CODED });
    assert.equal(answer.status, 409); assert.equal(answer.json.reason, 'none_applied');
    state = fresh(); calls.length = 0;
    for (const [body, signedIn, status, reason] of [[{ action: 'apply', code: 'X' }, true, 400, 'malformed'], [{ action: 'apply', orderId: UNPAID, code: '  ' }, true, 400, 'malformed'], [{ action: 'reprice', orderId: UNPAID }, true, 400, 'malformed'], ['{not json', true, 400, 'malformed'], [use, false, 401, 'not_signed_in']]) {
      answer = await post('/api/orders/promotion', body, signedIn);
      assert.equal(answer.status, status, JSON.stringify(body).slice(0, 60)); assert.equal(answer.json.reason, reason);
    }
    assert.equal(rpcs('apply_promotion_to_order').length + rpcs('remove_promotion_from_order').length, 0);
  }
  console.log('Order routes: a refund request sends the database the order, whole minor units and the trimmed reason and no currency; eight refusals of asking and twenty-one of a code each under its own name and status; an order that is somebody else’s and one that is not there are the same reply, byte for byte; a refusal nobody named is 500 in the route’s own words and no answer is 502 "unconfirmed"; nothing is asked of the database for a request that cannot be one or for nobody signed in.');

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
        state = fresh();
        const { context, tab, errors } = await open(`/orders?pending=${UNPAID}`, code, width);
        await tab.locator('main h1').waitFor();
        // Every form open, so the widest the page gets is what is measured.
        const closed = tab.locator('[data-refund="open"] .order-form > button');
        while (await closed.count() > 0) await closed.first().click();
        assert.equal(await tab.locator('[data-refund-form]').count(), 2);
        await fits(tab, width, `/orders ${code} ${width}`);
        assert.equal(await tab.evaluate(() => document.documentElement.dir || 'ltr'), code === 'ar' ? 'rtl' : 'ltr');
        assert.equal(await tab.locator('[data-order="paid"] [data-total] bdi').first().evaluate((el) => getComputedStyle(el).direction), 'ltr');
        // A code's own line is set in from the parts of the total, on whichever side the page starts.
        const [part, own] = await tab.locator('[data-order="pending_payment"]').first().evaluate((el) => [el.querySelector('[data-line="discount"]'), el.querySelector('[data-adjustment]')].map((p) => { const r = p.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }));
        if (code === 'ar') assert.ok(own[1] < part[1], `/orders ar ${width}: a code's line is not set in (${own[1]} against ${part[1]})`);
        else assert.ok(own[0] > part[0], `/orders ${code} ${width}: a code's line is not set in (${own[0]} against ${part[0]})`);
        if (shots && width !== 1440) await tab.screenshot({ path: `${shots}/orders-${code}-${width}.png`, fullPage: true });
        assert.deepEqual(errors, [], `/orders ${code} ${width}: ${errors.join(' | ')}`);
        await context.close();
      }
      console.log(`Synthetic orders page in ${code}: fits with every form open; an amount reads left to right; no page error`);
    }

    // Asking for a refund, in English.
    {
      state = fresh(); calls.length = 0;
      const { context, tab, errors } = await open('/orders', 'en', 390);
      const paid = tab.locator('[data-order="paid"]').first();
      await paid.getByRole('button', { name: 'Ask for a refund', exact: true }).click();
      const form = paid.locator('[data-refund-form]');
      // What is asked for is said before it is asked, in major units.
      assert.equal((await form.locator('p.meta').textContent()).trim(), 'Amount asked for: USD 19.99');
      const send = form.getByRole('button', { name: 'Send the request', exact: true });
      assert.equal(await send.isDisabled(), true, 'a request can be sent with no reason');
      const box = form.getByLabel('Why are you asking for a refund?');
      await box.fill('دُفع المبلغ مرتين.');
      // What was typed in Arabic reads right to left in an English form.
      assert.equal(await box.evaluate((el) => getComputedStyle(el).direction), 'rtl');
      assert.equal(await box.getAttribute('maxlength'), '1000');
      assert.ok((await form.textContent()).includes('A person reviews every request. Access stays open until a refund is actually paid back.'));
      await send.click();
      const said = paid.locator('[data-refund-said="info"]');
      await said.waitFor();
      assert.equal((await said.textContent()).trim(), 'Sent. A person will review it. Nothing has been refunded yet.');
      assert.equal(await said.getAttribute('role'), 'status');
      assert.deepEqual(rpcs('request_refund').map((c) => c.sent), [{ p_order_id: PAID, p_amount_minor: 1999, p_reason: 'دُفع المبلغ مرتين.' }]);
      // Once a request is in, the button that would send a second is gone.
      for (let i = 0; i < 100 && !calls.some((c) => c.path === '/rest/v1/orders'); i += 1) await new Promise((r) => setTimeout(r, 100));
      assert.ok(calls.some((c) => c.path === '/rest/v1/orders'), 'the page was not read again after a request went in');
      assert.equal(await paid.getByRole('button', { name: 'Ask for a refund', exact: true }).count(), 0);
      assert.equal(await said.count(), 1, 'what was said did not survive the page being read again');

      // An order already partly refunded asks for what is left (12000), not for its total (30000).
      calls.length = 0;
      const partly = tab.locator('[data-order="partially_refunded"]');
      await partly.getByRole('button', { name: 'Ask for a refund', exact: true }).click();
      assert.equal((await partly.locator('[data-refund-form] p.meta').textContent()).trim(), 'Amount asked for: UGX 12000');
      await partly.locator('textarea').fill('The rest, please.');
      // The clock ran out while the tab sat open.
      state.refund = raise('the refund window closed on 26 Oct 2026 at 09:14 UTC — a refund can be asked for within 72 hours of payment');
      await partly.getByRole('button', { name: 'Send the request', exact: true }).click();
      await partly.getByRole('alert').filter({ hasText: 'The time for asking for a refund on this order has ended.' }).waitFor();
      assert.deepEqual(rpcs('request_refund').map((c) => c.sent), [{ p_order_id: PARTLY, p_amount_minor: 12000, p_reason: 'The rest, please.' }]);
      // A refusal nobody named, and no answer at all: each in the page's own words.
      state.refund = raise(DATABASE_SENTENCE);
      await partly.getByRole('button', { name: 'Send the request', exact: true }).click();
      await partly.locator('[data-refund-said="error"]').filter({ hasText: 'The request could not be sent. Nothing was changed.' }).waitFor();
      state.refund = noAnswer;
      await partly.getByRole('button', { name: 'Send the request', exact: true }).click();
      await partly.locator('[data-refund-said="warn"]').filter({ hasText: 'We could not confirm whether that was recorded. Reload this page before trying again.' }).waitFor();
      // What was typed is still there to send again.
      assert.equal(await partly.locator('textarea').inputValue(), 'The rest, please.');
      await partly.getByRole('button', { name: 'Cancel', exact: true }).click();
      assert.equal(await partly.locator('[data-refund-form]').count(), 0);
      for (const word of ['SYNTHETIC', '26 Oct 2026', '72 hours']) assert.equal((await tab.locator('main').textContent()).includes(word), false, `the page says "${word}"`);
      if (shots) await tab.screenshot({ path: `${shots}/orders-en-390-refund.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
    }
    // The same in Arabic: the sentences are Arabic and the amount still reads left to right.
    {
      state = fresh(); calls.length = 0;
      const { context, tab, errors } = await open('/orders', 'ar', 390);
      const paid = tab.locator('[data-order="paid"]').first();
      await paid.getByRole('button', { name: 'اطلب استرداد المبلغ', exact: true }).click();
      const line = paid.locator('[data-refund-form] p.meta');
      assert.ok((await line.textContent()).startsWith('المبلغ المطلوب استرداده:'));
      assert.equal(await line.locator('bdi[dir="ltr"]').textContent(), 'USD 19.99');
      await paid.getByLabel('لماذا تطلب الاسترداد؟').fill('Charged twice.');
      // And English typed into an Arabic form reads left to right.
      assert.equal(await paid.locator('textarea').evaluate((el) => getComputedStyle(el).direction), 'ltr');
      await paid.getByRole('button', { name: 'أرسل الطلب', exact: true }).click();
      const said = paid.locator('[data-refund-said="info"]');
      await said.waitFor();
      assert.equal((await said.textContent()).trim(), 'أُرسل. سيراجعه شخص. لم يُستردّ شيء بعد.');
      assert.equal((await tab.locator('main').textContent()).includes('Sent.'), false);
      if (shots) await tab.screenshot({ path: `${shots}/orders-ar-390-refund.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
    }
    // A code on an unpaid order, in English.
    {
      state = fresh(); calls.length = 0;
      const { context, tab, errors } = await open('/orders', 'en', 390);
      const bare = tab.locator('[data-order="pending_payment"]').nth(1);
      const use = bare.getByRole('button', { name: 'Use this code', exact: true });
      assert.equal(await use.isDisabled(), true, 'a code can be sent with nothing typed');
      const box = bare.getByLabel('Discount code');
      await box.fill('eid24');
      assert.equal(await box.evaluate((el) => getComputedStyle(el).direction), 'ltr');
      state.apply = refusal('unknown_code');
      await use.click();
      await bare.getByRole('alert').filter({ hasText: 'That code is not one we recognise. Check it and try again.' }).waitFor();
      assert.equal(await box.inputValue(), 'eid24', 'a refused code was cleared');
      state.apply = refusal('limit_reached_family');
      await use.click();
      await bare.getByRole('alert').filter({ hasText: 'Your family has already used that code as often as it allows.' }).waitFor();
      state.apply = raise(DATABASE_SENTENCE);
      await use.click();
      await bare.getByRole('alert').filter({ hasText: 'That could not be changed. Nothing was charged.' }).waitFor();
      state.apply = noAnswer;
      await use.click();
      await bare.locator('[data-code-said="warn"]').filter({ hasText: 'We could not confirm whether that was recorded. Reload this page before trying again.' }).waitFor();
      // Taken: sent once more, the box is emptied and nothing is left said.
      state.apply = 'ok'; calls.length = 0;
      await use.click();
      await tab.waitForFunction((id) => document.getElementById(id)?.value === '', `c-${UNPAID}`);
      assert.equal(await bare.locator('[data-code-said]').count(), 0);
      assert.deepEqual(rpcs('apply_promotion_to_order').map((c) => c.sent), [{ p_order_id: UNPAID, p_code: 'eid24' }]);
      assert.equal(await box.inputValue(), '');

      // Taking a code off the other order. It had none after all: the page reloads and says nothing.
      const coded = tab.locator('[data-order="pending_payment"]').first();
      state.remove = refusal('none_applied'); calls.length = 0;
      const answered = tab.waitForResponse((r) => r.url().endsWith('/api/orders/promotion'));
      await coded.getByRole('button', { name: 'Take the code off', exact: true }).click();
      assert.equal((await answered).status(), 409);
      assert.deepEqual(rpcs('remove_promotion_from_order').map((c) => c.sent), [{ p_order_id: CODED }]);
      // The page is read again, because what it showed was out of date.
      for (let i = 0; i < 100 && !calls.some((c) => c.path === '/rest/v1/orders'); i += 1) await new Promise((r) => setTimeout(r, 100));
      assert.ok(calls.some((c) => c.path === '/rest/v1/orders'), 'the page was not read again');
      assert.equal(await coded.locator('[data-code-said]').count(), 0);
      // Paid in another tab a moment ago.
      state.remove = refusal('order_not_pending');
      await coded.getByRole('button', { name: 'Take the code off', exact: true }).click();
      await coded.getByRole('alert').filter({ hasText: 'This order is no longer waiting for payment, so its code cannot be changed.' }).waitFor();
      for (const word of ['SYNTHETIC', 'promotion:']) assert.equal((await tab.locator('main').textContent()).includes(word), false, `the page says "${word}"`);
      if (shots) await tab.screenshot({ path: `${shots}/orders-en-390-code.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Synthetic forms: a refund is asked for what is left (USD 19.99; UGX 12000 of 30000), says the amount first, lets Arabic read right to left in an English form and English left to right in an Arabic one, says "sent, nothing refunded yet" once and withdraws its button; a closed window, a refusal nobody named and an answer that never came each in the page’s words, with what was typed kept; a code is refused by its name and kept in the box, taken once, and an order that had none after all reloads and says nothing.');
  }
  console.log('Orders HTTP smoke passed. Not real Auth, RLS, an order, a payment or a refund: the stand-in answers what it is told to and no money exists in it.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close().catch(() => {});
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
