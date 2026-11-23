// The real Next receipt page (/orders/<id>/receipt) against an entirely
// synthetic loopback Auth/REST API. This is not evidence about hosted
// Supabase, JWT validation, RLS, an order, a payment or a refund: the stand-in
// answers whatever it is told to and no money exists in it. In particular,
// "somebody else's order is not found" is shown here only as "an order the
// stand-in does not return is not found"; that the database does not return
// it is the row policies' to prove, in their own suite.
//
// What it does show: the receipt in the reader's own language (English,
// Arabic, French) and in English, marked, for a language held for review;
// parts that add up to the total, with a fee on it; the payment service by its
// own name and nothing a member of staff typed; only completed refunds counted
// as returned; an unpaid order that is not a receipt and says no payment has
// been confirmed; an order that cannot be read, or cannot be shown whole, said
// as that; and, with a browser, that the sheet fits a phone, follows the
// reader's direction, prints, and prints without the site around it. The
// expected sentences are typed here rather than imported, so this fails if a
// catalogue changes without anybody looking at the page.
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

const PAID = '11111111-1111-4111-8111-111111111111';
const PART = '22222222-2222-4222-8222-222222222222';
const UNPAID = '33333333-3333-4333-8333-333333333333';
const ODD = '44444444-4444-4444-8444-444444444444';
const NOBODYS = '55555555-5555-4555-8555-555555555555';
const ACCOUNT = '99999999-9999-4999-8999-999999999999';
const LEARNER = '77777777-7777-4777-8777-777777777777';
// What staff typed when recording a payment by hand. Written for a colleague; the receipt must not print it.
const EVIDENCE = 'SYNTHETIC-EVIDENCE bank slip 4411, checked with Musa';
const order = (id, over = {}) => ({
  id, order_number: 'AS-00000001', status: 'paid', currency_code: 'UGX',
  subtotal_minor: 60000, discount_minor: 10000, tax_minor: 0, fee_minor: 1500, total_minor: 51500,
  created_at: '2026-11-19T09:10:00Z', paid_at: '2026-11-19T09:14:00Z', payment_evidence: EVIDENCE,
  learner_profile_id: LEARNER, billing_account_id: ACCOUNT, order_items: [], order_adjustments: [], payment_attempts: [], ...over,
});
const ORDERS = {
  // Paid, with everything a receipt can carry.
  [PAID]: order(PAID, {
    order_items: [
      { id: 'i1', quantity: 1, unit_price_minor: 50000, line_total_minor: 50000, item_snapshot: { title: 'Fiqh of prayer <b>' } },
      { id: 'i2', quantity: 2, unit_price_minor: 5000, line_total_minor: 10000, item_snapshot: { title: 'سيرة النبي' } },
    ],
    order_adjustments: [
      { id: 'a1', adjustment_type: 'promotion', direction: 'credit', amount_minor: 9300, currency_code: 'UGX', description: 'RAMADAN10', voided_at: null },
      { id: 'a2', adjustment_type: 'fee', direction: 'debit', amount_minor: 1500, currency_code: 'UGX', description: 'رسوم التحويل', voided_at: null },
      // Withdrawn: history, which my orders shows and a receipt does not.
      { id: 'a3', adjustment_type: 'manual_discount', direction: 'credit', amount_minor: 999, currency_code: 'UGX', description: 'SYNTHETIC-VOIDED', voided_at: '2026-11-19T09:12:00Z' },
      // A kind the page has no word for.
      { id: 'a4', adjustment_type: 'goodwill_gesture', direction: 'credit', amount_minor: 700, currency_code: 'UGX', description: null, voided_at: null },
    ],
    payment_attempts: [
      { id: 'p1', provider: 'airtel_money_ug', provider_reference: 'FIRST-TRY', status: 'failed' },
      { id: 'p2', provider: 'mtn_momo_ug', provider_reference: 'MOMO-REF-778', status: 'succeeded' },
    ],
  }),
  // Partly refunded, in cents, nothing off and nothing added, no title, no number,
  // paid through a service this code has never heard of, and nobody's name readable.
  [PART]: order(PART, {
    order_number: null, status: 'partially_refunded', currency_code: 'USD', subtotal_minor: 1999, discount_minor: 0, fee_minor: 0, total_minor: 1999, learner_profile_id: null,
    billing_account_id: '00000000-0000-4000-8000-000000000000',
    order_items: [{ id: 'i3', quantity: 1, unit_price_minor: 1999, line_total_minor: 1999, item_snapshot: {} }],
    payment_attempts: [{ id: 'p3', provider: 'stripe_xx', provider_reference: 'REF-OF-A-SERVICE-WITH-NO-NAME', status: 'succeeded' }],
  }),
  // Not paid: three decimals, no lines, a prompt still out.
  [UNPAID]: order(UNPAID, {
    order_number: 'AS-00000003', status: 'pending_payment', currency_code: 'KWD', subtotal_minor: 5000, discount_minor: 0, fee_minor: 0, total_minor: 5000, paid_at: null, payment_evidence: null,
    payment_attempts: [{ id: 'p4', provider: 'mtn_momo_ug', provider_reference: 'SYNTHETIC-PENDING-REF', status: 'processing' }],
  }),
  // A state the page has never heard of.
  [ODD]: order(ODD, { order_number: 'AS-00000004', status: 'on_hold', discount_minor: 0, fee_minor: 0, subtotal_minor: 51500, paid_at: null, payment_evidence: null }),
};
const REFUNDS = {
  [PART]: [
    { id: 'r1', amount_minor: 500, currency_code: 'USD', status: 'completed', refunded_at: '2026-11-21T12:30:00Z' },
    { id: 'r2', amount_minor: 300, currency_code: 'USD', status: 'pending', refunded_at: null },
    { id: 'r3', amount_minor: 200, currency_code: 'USD', status: 'failed', refunded_at: null },
    { id: 'r5', amount_minor: 250, currency_code: 'USD', status: 'completed', refunded_at: '2026-11-22T08:00:00Z' },
  ],
};
// What the stand-in does wrong, if anything: 'orders' or 'refunds' fail; `change` rewrites an order or its refunds.
let broken = null; let change = null;
const calls = [];

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
  calls.push({ method: req.method, path, query: url.search });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  const fail = () => send({ code: '57014', message: 'SYNTHETIC-DATABASE canceling statement due to statement timeout', details: null, hint: null }, 500);
  const wanted = (column) => (url.searchParams.get(column) ?? '').replace(/^eq\./, '');
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Halima Probe', preferred_language: 'en', timezone: 'Africa/Kampala', account_status: 'active' }]);
  else if (path === '/rest/v1/orders') {
    if (broken === 'orders') return fail();
    const found = ORDERS[wanted('id')];
    send(found ? [change?.order ? change.order(structuredClone(found)) : found] : []);
  }
  else if (path === '/rest/v1/billing_accounts') send(wanted('id') === ACCOUNT ? [{ display_name: 'The Okello <family>' }] : []);
  else if (path === '/rest/v1/learner_profiles') send(wanted('id') === LEARNER ? [{ display_name: 'أمينة' }] : []);
  else if (path === '/rest/v1/refund_transactions') {
    if (broken === 'refunds') return fail();
    const rows = REFUNDS[wanted('order_id')] ?? [];
    send(change?.refunds ? change.refunds(structuredClone(rows)) : rows);
  }
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
  // English a page in another language must not say.
  const ENGLISH = ['My orders', 'Print or save', 'This is not a receipt', 'No payment has been confirmed', 'Receipt', 'Order', 'Number', 'Placed on', 'Paid', 'Billed to', 'For:', 'Untitled', 'Quantity', 'Price for one', 'Subtotal', 'Discount', 'Fee', 'Adjustment', 'Total', 'Returned', 'Payment', 'Refund', 'payment service', 'This document', 'tax invoice', 'What you have paid', 'could not be read', 'Waiting'];
  const date = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: 'UTC' }).format(new Date(iso));
  // The page without the names its parts are marked with, which are the database's on purpose.
  const visible = (main) => main.replace(/ data-(state|refund|part|receipt|due|through)="[A-Za-z_-]+"/g, '');
  const receipt = (id) => `/orders/${id}/receipt`;
  const UNREAD = '<div class="notice error" role="alert" data-receipt="unread">This order could not be read just now. That does not change what has been paid.</div>';

  // ================================================================ the page
  {
    const out = await fetch(`${origin}${receipt(PAID)}`, { redirect: 'manual', signal: AbortSignal.timeout(90000) });
    assert.equal(out.status, 307); assert.equal(new URL(out.headers.get('location'), origin).searchParams.get('next'), receipt(PAID));
    assert.equal(calls.filter((c) => c.path === '/rest/v1/orders').length, 0, 'an order was read for nobody');

    // What is not an order's id, an id that names nothing, and somebody else's order: one page.
    for (const path of ['/orders/not-an-id/receipt', '/orders/11111111-1111-4111-8111-11111111111g/receipt', receipt(NOBODYS)]) {
      const gone = await get(path);
      assert.equal(gone.status, 404, path);
    }
    // An address that is not an address is refused before the page is asked.
    assert.equal((await get('/orders/%E0%A4%A/receipt')).status, 400);
    assert.equal(calls.filter((c) => c.path === '/rest/v1/orders').length, 1, 'an order was looked for under something that is not an id');

    // ---- a paid order: a receipt
    calls.length = 0;
    let seen = await get(receipt(PAID));
    assert.equal(seen.status, 200, logs.slice(-2000));
    assert.match(seen.html, /<title>Receipt/);
    // The order, then the two names and the refunds, and nothing else about money.
    assert.deepEqual(calls.filter((c) => !c.path.includes('/rpc/') && c.path !== '/rest/v1/user_profiles').map((c) => c.path).sort(), ['/rest/v1/billing_accounts', '/rest/v1/learner_profiles', '/rest/v1/orders', '/rest/v1/refund_transactions']);
    assert.ok(!calls.find((c) => c.path === '/rest/v1/orders').query.includes('payment_evidence'), 'what staff typed is still asked for');
    has(seen.main, ['<div class="page receipt-page">', '<p class="eyebrow"><a href="/orders">My orders</a></p><button type="button" class="btn no-print">Print or save as PDF</button>',
      '<article class="receipt-sheet" data-receipt="receipt" data-state="paid">', '<bdi dir="ltr">AyahSpring</bdi></p><h1>Receipt</h1><p class="receipt-state"><span class="badge ok">Paid</span></p>',
      '<strong data-number="true">Number: <bdi dir="ltr">AS-00000001</bdi></strong>', `<span class="receipt-meta">Placed on: <bdi>${date('en', '2026-11-19T09:10:00Z')}</bdi></span>`, `<span class="receipt-meta" data-paid-on="true">Paid on: <bdi>${date('en', '2026-11-19T09:14:00Z')}</bdi></span>`,
      // Names somebody typed: escaped, and each finding its own direction.
      '<p data-billed-to="true">Billed to: <bdi>The Okello &lt;family&gt;</bdi></p>', '<p data-for="true">For: <bdi>أمينة</bdi></p>',
      // Each line is the line's own total. Two of something says so, with the price of one.
      '<ul class="receipt-lines" data-lines="list"><li><div class="receipt-line"><span><bdi>Fiqh of prayer &lt;b&gt;</bdi></span><strong><bdi dir="ltr">UGX 50000</bdi></strong></div></li>',
      '<li><div class="receipt-line"><span><bdi>سيرة النبي</bdi></span><strong><bdi dir="ltr">UGX 10000</bdi></strong></div><p class="receipt-meta">Quantity: <bdi dir="ltr">2</bdi> · Price for one: <bdi dir="ltr">UGX 5000</bdi></p></li></ul>',
      // The parts add up to the total: 60000 − 10000 + 1500 = 51500. The fee used to be left out.
      '<p data-part="subtotal">Subtotal: <bdi dir="ltr">UGX 60000</bdi></p><p data-part="discount">Discount: <bdi dir="ltr">−UGX 10000</bdi></p><p data-part="fee">Fee: <bdi dir="ltr">+UGX 1500</bdi></p>',
      // What changed the total, with the note beside it as it was written.
      'data-adjustment="true">Discount: <bdi dir="ltr">−UGX 9300</bdi> <bdi dir="auto" class="order-note">RAMADAN10</bdi></p>', 'data-adjustment="true">Fee: <bdi dir="ltr">+UGX 1500</bdi> <bdi dir="auto" class="order-note">رسوم التحويل</bdi></p>',
      // A kind with no word is "an adjustment", not its stored name.
      'data-adjustment="true">Adjustment: <bdi dir="ltr">−UGX 700</bdi></p>',
      '<p class="receipt-due" data-due="paid"><strong>Total paid: <bdi dir="ltr">UGX 51500</bdi></strong></p>',
      // The service by its own name, and the reference of the attempt that paid.
      '<section class="receipt-payment" data-payment="true"><h2>Payment</h2><p data-through="true">Paid through: <bdi dir="ltr">MTN MoMo</bdi></p><p data-reference="true">Payment reference: <bdi dir="ltr">MOMO-REF-778</bdi></p></section>',
      '<footer class="receipt-foot"><p>This document is made from the order record the platform holds. It is not a tax invoice.</p></footer>',
      '<p class="receipt-links no-print"><a href="/orders">My orders</a> · <a href="/billing">What you have paid</a></p>'], 'the receipt');
    // No stored word, nothing staff typed for a colleague, nothing withdrawn, no attempt that failed, no table, and it is not held left to right.
    none(seen.main, ['SYNTHETIC', 'bank slip', 'mtn_momo', 'mtn momo', 'airtel', 'FIRST-TRY', 'goodwill', 'promotion', 'UGX 999', 'Confirmed by', '<table', 'scroll-x', 'dir="ltr" class', '<article class="receipt-sheet" dir', 'not a receipt', 'data-returned', 'receipt-refunds', 'Total to pay', 'undefined', 'NaN', 'lang="en"'], 'the receipt');
    assert.equal(seen.main.split('data-adjustment=').length - 1, 3, 'a withdrawn adjustment is on the receipt');

    // ---- partly refunded, in cents
    seen = await get(receipt(PART));
    has(seen.main, ['data-receipt="receipt" data-state="partially_refunded">', '<span class="badge neutral">Partly refunded</span>',
      // No title: said, not "Course". No number: left out.
      '<div class="receipt-line"><span>Untitled item</span><strong><bdi dir="ltr">USD 19.99</bdi></strong></div></li></ul>',
      // Nothing off and nothing added: the total is the whole story.
      '<div class="receipt-total" data-total="true"><p class="receipt-due" data-due="paid"><strong>Total paid: <bdi dir="ltr">USD 19.99</bdi></strong></p>',
      // Only the two completed refunds have returned anything: 5.00 + 2.50.
      '<p data-returned="true">Returned: <bdi dir="ltr">USD 7.50</bdi></p>',
      // A service nobody here can name is not named. Its reference is still the payer's.
      '<h2>Payment</h2><p data-through="unnamed">Payment confirmed.</p><p data-reference="true">Payment reference: <bdi dir="ltr">REF-OF-A-SERVICE-WITH-NO-NAME</bdi></p>',
      `<li data-refund="completed">Refund: <bdi dir="ltr">USD 5.00</bdi><span class="order-rule">Returned on: <bdi>${date('en', '2026-11-21T12:30:00Z')}</bdi></span></li>`,
      '<li data-refund="pending">Refund: <bdi dir="ltr">USD 3.00</bdi><span class="order-rule">Sent to the payment service. Waiting for it to confirm.</span></li>',
      '<li data-refund="failed">Refund: <bdi dir="ltr">USD 2.00</bdi><span class="order-rule">The payment service refused it. Nothing was returned.</span></li>',
      `<li data-refund="completed">Refund: <bdi dir="ltr">USD 2.50</bdi><span class="order-rule">Returned on: <bdi>${date('en', '2026-11-22T08:00:00Z')}</bdi></span></li></ul>`], 'partly refunded');
    none(seen.main, ['stripe', '1999', 'data-number', 'receipt-people', 'data-billed-to', 'data-for', 'Account holder', 'Course', 'data-part', 'Paid through', 'not a receipt'], 'partly refunded');

    // ---- not paid: not a receipt, and it says what the platform knows
    seen = await get(receipt(UNPAID));
    has(seen.main, ['<div class="notice warn" role="status" data-receipt="not-a-receipt"><strong>This is not a receipt.</strong> No payment has been confirmed for this order. What follows is the order as it stands.</div>',
      '<article class="receipt-sheet" data-receipt="order" data-state="pending_payment">', '<h1>Order</h1><p class="receipt-state"><span class="badge neutral">Waiting for payment</span></p>', 'Number: <bdi dir="ltr">AS-00000003</bdi>',
      '<p class="muted receipt-none" data-lines="none">No items are recorded on this order.</p>',
      '<p class="receipt-due" data-due="to-pay"><strong>Total to pay: <bdi dir="ltr">KWD 5.000</bdi></strong></p>'], 'an unpaid order');
    // Never a date it was paid, a payment, or a claim about the payer's wallet.
    none(seen.main, ['<h1>Receipt</h1>', 'Total paid', 'Paid on', 'data-payment', 'Paid through', 'SYNTHETIC', 'nothing has been charged', 'Payment confirmed'], 'an unpaid order');

    // ---- unread is said, eight ways, and is never half a receipt
    const cases = [
      ['the order cannot be read', PAID, () => { broken = 'orders'; }],
      ['its refunds cannot be read', PART, () => { broken = 'refunds'; }],
      ['a total that is not whole', PAID, () => { change = { order: (o) => ({ ...o, total_minor: '515.5' }) }; }],
      ['a line in a currency that is not one', PAID, () => { change = { order: (o) => ({ ...o, currency_code: 'ugx' }) }; }],
      ['a completed refund in another currency', PART, () => { change = { refunds: (rows) => [...rows, { id: 'r9', amount_minor: 100, currency_code: 'UGX', status: 'completed', refunded_at: '2026-11-22T09:00:00Z' }] }; }],
      // Whether money moved is what the state would have said, of an order and of a refund.
      ['a state the page has never heard of', ODD, () => {}],
      ['a refund in a state the page has never heard of', PART, () => { change = { refunds: (rows) => [...rows, { id: 'r8', amount_minor: 100, currency_code: 'USD', status: 'reversed', refunded_at: null }] }; }],
      ['a completed refund with no date', PART, () => { change = { refunds: (rows) => rows.map((row) => ({ ...row, refunded_at: null })) }; }],
    ];
    for (const [label, id, arrange] of cases) {
      broken = null; change = null; arrange();
      seen = await get(receipt(id));
      assert.equal(seen.status, 200, label);
      has(seen.main, [UNREAD, '<a href="/orders">My orders</a>', '<a href="/billing">What you have paid</a> · <a href="/support">Help</a>'], label);
      none(seen.main, ['receipt-sheet', 'SYNTHETIC', 'statement timeout', 'UGX', 'USD', 'Okello', 'on_hold', 'not a receipt', 'Total', 'Print'], label);
    }
    broken = null; change = null;

    // ---- Arabic, French, and Hausa (held: English, whole, marked)
    seen = await get(receipt(PAID), 'ar');
    assert.match(seen.html, /<title>الإيصال/);
    has(seen.main, ['<a href="/orders">طلباتي</a></p><button type="button" class="btn no-print">اطبعه أو احفظه بصيغة PDF</button>', '<h1>الإيصال</h1>', '<span class="badge ok">مدفوع</span>',
      'الرقم: <bdi dir="ltr">AS-00000001</bdi>', `تاريخ الطلب: <bdi>${date('ar', '2026-11-19T09:10:00Z')}</bdi>`, `تاريخ الدفع: <bdi>${date('ar', '2026-11-19T09:14:00Z')}</bdi>`,
      'الفاتورة باسم: <bdi>The Okello &lt;family&gt;</bdi>', 'لصالح: <bdi>أمينة</bdi>', 'الكمية: <bdi dir="ltr">2</bdi> · سعر الواحد: <bdi dir="ltr">UGX 5000</bdi>',
      '<bdi dir="ltr">−UGX 10000</bdi>', '<bdi dir="ltr">+UGX 1500</bdi>', '<strong>إجمالي المدفوع: <bdi dir="ltr">UGX 51500</bdi></strong>',
      'الدفع عبر: <bdi dir="ltr">MTN MoMo</bdi>', 'مرجع الدفع: <bdi dir="ltr">MOMO-REF-778</bdi>', '<p>أُعدّ هذا المستند من سجل الطلب الذي تحتفظ به المنصة. وهو ليس فاتورة ضريبية.</p>',
      // What somebody else wrote is theirs.
      'Fiqh of prayer &lt;b&gt;', 'RAMADAN10'], 'the Arabic receipt');
    none(visible(seen.main), [...ENGLISH, 'lang="en"', 'SYNTHETIC'], 'the Arabic receipt');
    seen = await get(receipt(UNPAID), 'ar');
    has(seen.main, ['<strong>هذا ليس إيصالًا.</strong> لم يُؤكَّد أي دفع لهذا الطلب. ما يلي هو الطلب كما هو الآن.', '<strong>الإجمالي المطلوب دفعه: <bdi dir="ltr">KWD 5.000</bdi></strong>', '>لا توجد بنود مسجّلة في هذا الطلب.</p>'], 'the Arabic order');
    none(visible(seen.main), ENGLISH, 'the Arabic order');
    seen = await get(receipt(PART), 'fr');
    // French puts a no-break space before a colon.
    has(seen.main, ['<h1>Reçu</h1>', '<span>Article sans titre</span>', '<strong>Total payé\u00a0: <bdi dir="ltr">USD 19.99</bdi></strong>', 'Restitué\u00a0: <bdi dir="ltr">USD 7.50</bdi>',
      `Remboursement\u00a0: <bdi dir="ltr">USD 5.00</bdi><span class="order-rule">Restitué le\u00a0: <bdi>${date('fr', '2026-11-21T12:30:00Z')}</bdi></span>`,
      'Référence du paiement\u00a0: <bdi dir="ltr">REF-OF-A-SERVICE-WITH-NO-NAME</bdi>', 'Ce n’est pas une facture fiscale.</p>', '>Imprimer ou enregistrer en PDF</button>'], 'the French receipt');
    // "Total" is a French word too.
    none(visible(seen.main), ENGLISH.filter((word) => word !== 'Total'), 'the French receipt');
    broken = 'orders';
    seen = await get(receipt(PAID), 'fr');
    has(seen.main, ['data-receipt="unread">Cette commande n’a pas pu être lue pour le moment. Cela ne change rien à ce qui a été payé.</div>'], 'French, unread');
    broken = null;
    seen = await get(receipt(PAID), 'ha');
    assert.match(seen.main, /<div class="page receipt-page" lang="en" dir="ltr">/, 'Hausa is not given the English receipt, marked');
    has(seen.main, ['<h1>Receipt</h1>', '<strong>Total paid: <bdi dir="ltr">UGX 51500</bdi></strong>', 'Paid through: <bdi dir="ltr">MTN MoMo</bdi>'], 'the Hausa receipt');
  }
  console.log('The receipt: signed out goes to sign in and reads nothing; what is not an id, an id that names nothing and somebody else’s order are one 404; a paid order is a receipt whose parts add up to its total (the fee is on it), each line its own total, the service by its own name (MTN MoMo) and nothing staff typed; partly refunded in cents says only what completed refunds returned (USD 7.50), each refund with its own sentence; an unpaid order is not a receipt and says no payment has been confirmed; eight kinds of unread, an order or a refund in a state nobody here has a word for among them, each said and none drawn as half a receipt; Arabic and French by the reader’s choice, Hausa in English, marked.');

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
        for (const [name, id] of [['paid', PAID], ['part', PART]]) {
          const { context, tab, errors } = await open(receipt(id), code, width);
          await tab.locator('main h1').waitFor();
          await fits(tab, width, `receipt ${name} ${code} ${width}`);
          // The sheet follows the reader: it is no longer held left to right.
          assert.equal(await tab.locator('.receipt-sheet').evaluate((el) => getComputedStyle(el).direction), code === 'ar' ? 'rtl' : 'ltr');
          // An amount reads left to right whichever way the page does, and is never broken in two.
          assert.equal(await tab.locator('[data-due] bdi').evaluate((el) => getComputedStyle(el).direction), 'ltr');
          const broken = await tab.locator('.receipt-line strong, .receipt-total bdi[dir="ltr"], .receipt-lines bdi[dir="ltr"], .receipt-refunds bdi[dir="ltr"], [data-number] bdi').evaluateAll((els) => els.filter((el) => el.getClientRects().length > 1).length);
          assert.equal(broken, 0, `receipt ${name} ${code} ${width}: an amount or the number is broken across lines`);
          if (name === 'paid') {
            // A name typed in Arabic starts from the right, even on an English sheet.
            assert.equal(await tab.locator('[data-for] bdi').evaluate((el) => getComputedStyle(el).direction), 'rtl');
            // The button prints, and says nothing in English to a reader of another language.
            await tab.evaluate(() => { window.printed = 0; window.print = () => { window.printed += 1; }; });
            await tab.locator('.receipt-bar button').click();
            assert.equal(await tab.evaluate(() => window.printed), 1, `receipt ${code} ${width}: the button did not print`);
            // On paper: the sheet, and none of the site around it.
            await tab.emulateMedia({ media: 'print' });
            for (const gone of ['.receipt-bar', '.receipt-links', '.masthead', 'body > footer, footer:not(.receipt-foot)']) {
              const shown = await tab.locator(gone).evaluateAll((els) => els.filter((el) => getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0).length);
              assert.equal(shown, 0, `receipt ${code} ${width}: ${gone} is printed`);
            }
            assert.ok(await tab.locator('.receipt-sheet .receipt-foot').isVisible(), 'the sheet is not printed');
            await tab.emulateMedia({ media: 'screen' });
          }
          if (shots && width !== 1440) await tab.screenshot({ path: `${shots}/receipt-${name}-${code}-${width}.png`, fullPage: true });
          assert.deepEqual(errors, [], `receipt ${name} ${code} ${width}: ${errors.join(' | ')}`);
          await context.close();
        }
      }
      console.log(`Synthetic receipt in ${code}: fits a phone with no sideways scroll; follows the reader's direction with amounts left to right and unbroken; the button prints; on paper there is the sheet and none of the site`);
    }
    // Not a receipt, and unread, in Arabic on a phone.
    {
      const { context, tab, errors } = await open(receipt(UNPAID), 'ar', 320);
      await tab.getByRole('status').filter({ hasText: 'هذا ليس إيصالًا.' }).waitFor();
      await fits(tab, 320, 'receipt unpaid ar 320');
      // On paper it still says what it is not, and calls itself an order.
      await tab.emulateMedia({ media: 'print' });
      assert.ok(await tab.locator('[data-receipt="not-a-receipt"]').isVisible(), 'a printed unpaid order does not say it is not a receipt');
      assert.equal(await tab.locator('main h1').innerText(), 'طلب');
      await tab.emulateMedia({ media: 'screen' });
      if (shots) await tab.screenshot({ path: `${shots}/receipt-unpaid-ar-320.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
    }
    {
      broken = 'orders';
      const { context, tab, errors } = await open(receipt(PAID), 'ar', 320);
      await tab.getByRole('alert').filter({ hasText: 'تعذّرت قراءة هذا الطلب الآن. هذا لا يغيّر ما دُفع.' }).waitFor();
      assert.equal(await tab.locator('main [role="alert"]').count(), 1);
      assert.equal(await tab.locator('.receipt-sheet').count(), 0);
      await fits(tab, 320, 'receipt ar 320 unread');
      // The page logs why on the server. A development server replays its
      // log in the browser's console, marked as the server's; a production
      // build does not. Nothing else may be there, and the reason is not in the page.
      assert.ok(errors.every((line) => line.includes('[receipt] order unread:') && line.includes('Server')), errors.join(' | '));
      assert.ok(!(await tab.locator('body').innerText()).includes('SYNTHETIC'));
      broken = null;
      await context.close();
    }
    console.log('Synthetic order that is not a receipt, and one that is unread: each said once, in Arabic, on a phone.');
  }
  console.log('Receipt HTTP smoke passed. Not real Auth, RLS, an order, a payment or a refund: the stand-in answers what it is told to and no money exists in it.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close().catch(() => {});
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
