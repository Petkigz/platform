// The real Next /billing page ("What you have paid") against an entirely
// synthetic loopback Auth/REST API. This is not evidence about hosted
// Supabase, JWT validation, RLS, `my_statement()`, an order, a payment or a
// refund: the stand-in answers whatever it is told to and no money exists in
// it. What the function counts is proved by its own database suite.
//
// What it does show: the page in the reader's own language (English, Arabic,
// French) and in English, marked, for a language held for review; sums and
// movements in major units; a running figure that ends on the net one; each
// thing that has not moved money said in the page's own sentence, chosen by
// its kind and state, with none of the sentences the database sends and none
// of its stored names; a kind or a state the page has no word for still drawn;
// a statement that could not be read, or cannot be trusted, said as that and
// not as "nothing paid"; and, with a browser, that the statement fits a phone
// without scrolling sideways. The expected sentences are typed here rather
// than imported, so this fails if a catalogue changes without anybody looking
// at the page.
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
const SECOND = '88888888-8888-4888-8888-888888888888';
const FIRST_ORDER = '11111111-1111-4111-8111-111111111111';
const NO_TITLE = '22222222-2222-4222-8222-222222222222';
const DOLLARS = '33333333-3333-4333-8333-333333333333';
// English the database writes beside each waiting row. The page must not print it.
const SAYS = 'SYNTHETIC-SAYS Approved, but not sent. A refund is a transfer, not a click.';
const moved = (kind, at, orderId, number, amount, direction, description, running) => ({ kind, occurredAt: at, orderId, orderNumber: number, amountMinor: amount, direction, description, runningMinor: running });
const waiting = (kind, status, amount, extra = {}) => ({ kind, occurredAt: '2026-11-20T10:00:00Z', orderId: FIRST_ORDER, orderNumber: 'AS-00000001', amountMinor: amount, status, reason: null, says: SAYS, ...extra });
const STATEMENT = {
  generatedAt: '2026-11-23T08:00:00Z',
  accounts: [
    {
      billingAccountId: ACCOUNT, displayName: 'The Okello <family>', billingCountry: 'UG', billingCurrency: 'UGX',
      currencies: [
        // Three decimals, and nothing has moved: only something waiting.
        { currencyCode: 'KWD', chargedMinor: '0', refundedMinor: '0', netMinor: '0', moved: [], notYetMoney: [waiting('refund', 'failed', '5000')] },
        {
          currencyCode: 'UGX', chargedMinor: '90000', refundedMinor: '12000', netMinor: '78000',
          moved: [
            moved('charge', '2026-11-19T09:14:00Z', FIRST_ORDER, 'AS-00000001', '50000', 'out', 'Fiqh of prayer', '50000'),
            // No title: the database writes "Order <number>" in English.
            moved('charge', '2026-11-19T10:00:00Z', NO_TITLE, 'AS-00000002', '40000', 'out', 'Order AS-00000002', '90000'),
            moved('refund', '2026-11-21T12:30:00Z', FIRST_ORDER, 'AS-00000001', '12000', 'in', 'Fiqh of prayer', '78000'),
            // A kind this page has never heard of, with an Arabic title and no order.
            moved('goodwill_credit', '2026-11-22T08:00:00Z', null, null, '0', 'in', 'سيرة النبي', '78000'),
          ],
          notYetMoney: [
            waiting('refund_request', 'requested', '5000', { reason: 'أريد استرداد المبلغ <b>الآن</b>' }),
            waiting('refund_request', 'approved', '4000'),
            waiting('refund_request', 'rejected', '3500'),
            waiting('refund_request', 'withdrawn', '3200'),
            waiting('refund', 'pending', '3000'),
            waiting('dispute', 'under_review', '50000'),
            waiting('dispute', 'won', '2500'),
            waiting('dispute', 'lost', '2400'),
            waiting('dispute', 'withdrawn', '2300'),
            // A state and a kind the page has no word for.
            waiting('refund_request', 'escalated', '2200'),
            waiting('voucher', 'held', '1000', { orderId: null, orderNumber: null }),
          ],
        },
        { currencyCode: 'USD', chargedMinor: '1999', refundedMinor: '0', netMinor: '1999', moved: [moved('charge', '2026-11-19T09:14:00Z', DOLLARS, null, '1999', 'out', 'Tajwid <for> beginners', '1999')], notYetMoney: [] },
      ],
    },
    // On an account, and nothing paid on it.
    { billingAccountId: SECOND, displayName: 'حساب ثانٍ', billingCountry: null, billingCurrency: 'KES', currencies: [] },
  ],
};
const copy = () => JSON.parse(JSON.stringify(STATEMENT));
// 'ok' (the statement above), 'broken' (the database fails), or a payload.
let state = 'ok';
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
  let sent = null; try { sent = JSON.parse(body); } catch { /* no body */ }
  calls.push({ method: req.method, path, sent, query: url.search });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Halima Probe', preferred_language: 'en', timezone: 'Africa/Kampala', account_status: 'active' }]);
  else if (path === '/rest/v1/rpc/my_statement') {
    if (state === 'broken') send({ code: '57014', message: 'SYNTHETIC-DATABASE canceling statement due to statement timeout', details: null, hint: null }, 500);
    else send(state === 'ok' ? STATEMENT : state);
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
  const ENGLISH = ['What you have paid', 'Account settings', 'Money that has moved', 'Billed in', 'Paid', 'Returned', 'Net paid', 'Payment', 'Refund', 'Not counted yet', 'None of this', 'Asked for', 'Approved', 'Declined', 'payment service', 'Your bank', 'The case', 'You wrote', 'Still waiting', 'Asking for a refund', 'platform’s record', 'My orders', 'Subscriptions', 'Help', 'Nothing has', 'Browse', 'Uganda'];
  const date = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: 'UTC' }).format(new Date(iso));
  const card = (main, code) => { const parts = main.split(`<div class="card statement-card" data-currency="${code}">`); assert.equal(parts.length, 2, `${code} card`); return parts[1].split('<div class="card statement-card"')[0].split('</section>')[0]; };
  // The page without the names its rows are marked with, which are the database's on purpose.
  const visible = (main) => main.replace(/ data-(waiting|moved|state)="[A-Za-z_]+"/g, '');
  const rows = (text, marker) => text.split(marker).slice(1).map((piece) => piece.split('</li>')[0]);

  // ================================================================ the page
  {
    state = 'ok'; calls.length = 0;
    const out = await fetch(`${origin}/billing`, { redirect: 'manual', signal: AbortSignal.timeout(90000) });
    assert.equal(out.status, 307); assert.match(out.headers.get('location') ?? '', /\/sign-in\?next=\/billing/);
    assert.equal(calls.length, 0, 'something was read for nobody');

    let seen = await get('/billing');
    assert.equal(seen.status, 200, logs.slice(-2000));
    assert.match(seen.html, /<title>What you have paid/);
    assert.deepEqual(calls.filter((c) => c.path === '/rest/v1/rpc/my_statement').map((c) => c.method), ['POST']);
    has(seen.main, ['<p class="eyebrow"><a href="/account">Account settings</a></p>', '<h1>What you have paid</h1>',
      '<p class="lede">Money that has moved, and money that has not yet. Only the first changes the net figure.</p>', '<div data-statement="read">',
      // A name somebody typed, a country in words, and a currency as its code.
      '<h2><bdi>The Okello &lt;family&gt;</bdi></h2>', '<p class="muted"><bdi>Uganda</bdi> · Billed in: <bdi dir="ltr">UGX</bdi></p>',
      '<h2><bdi>حساب ثانٍ</bdi></h2>', '<p class="muted">Billed in: <bdi dir="ltr">KES</bdi></p>',
      '<p class="empty" data-account-quiet="true">Nothing has been paid on this account yet. <a href="/catalogue">Browse the courses</a></p>',
      '<div class="notice statement-note"><strong>This is the platform’s record, not your bank’s.</strong> A refund shown here as completed may take a few days to reach you, and a fee charged for receiving it is not this platform’s. Neither appears on this page. Amounts are shown in the currency you were charged. Nothing here is converted into another one.</div>',
      '<a href="/orders">My orders</a> · <a href="/subscriptions">Subscriptions</a> · <a href="/support">Help</a>'], 'the page');
    // Nothing the database wrote in English, nothing as it is stored, and no table to scroll.
    // (Outside the attributes the checks below find each row by.)
    none(seen.main.replace(/ data-(waiting|moved)="[a-z_]+"/g, ''), ['SYNTHETIC', 'not a click', 'under_review', 'refund_request', 'goodwill_credit', 'escalated', 'voucher', '>held<', 'Order AS-', '<table', 'scroll-x', 'badge', 'could not be read', 'You are not on a billing account', 'NaN', 'undefined', 'lang="en"'], 'the page');
    assert.equal(seen.main.split('data-account="true"').length - 1, 2, 'accounts drawn');
    assert.equal(seen.main.split('<div class="card statement-card"').length - 1, 3, 'one card for each currency');

    // Shillings: three sums, four movements in order, a running figure that ends on the net one.
    const ugx = card(seen.main, 'UGX');
    has(ugx, ['<div data-sum="paid"><div class="n"><bdi dir="ltr">UGX 90000</bdi></div><div class="l">Paid</div></div>',
      '<div data-sum="returned"><div class="n"><bdi dir="ltr">UGX 12000</bdi></div><div class="l">Returned</div></div>',
      '<div data-sum="net"><div class="n"><bdi dir="ltr">UGX 78000</bdi></div><div class="l">Net paid</div></div>', '<ul class="lessons stacked" data-moved-list="list">'], 'the shilling sums');
    const movements = rows(ugx, '<li class="statement-row" data-moved=');
    assert.equal(movements.length, 4);
    has(movements[0], ['"charge" data-direction="out">', '<strong>Payment: <bdi>Fiqh of prayer</bdi></strong>', `<p class="meta statement-when"><bdi>${date('en', '2026-11-19T09:14:00Z')}</bdi><a href="/orders/${FIRST_ORDER}/receipt"><bdi dir="ltr">AS-00000001</bdi></a></p>`,
      '<p class="meta" data-amount="true">Paid: <bdi dir="ltr">UGX 50000</bdi></p>', '<p class="muted order-line" data-after="true">Net paid after this: <bdi dir="ltr">UGX 50000</bdi></p>'], 'a payment');
    // No title: "payment", and the number beside it, not the database's English.
    has(movements[1], ['<strong>Payment</strong>', `<a href="/orders/${NO_TITLE}/receipt"><bdi dir="ltr">AS-00000002</bdi></a>`, 'Paid: <bdi dir="ltr">UGX 40000</bdi>', 'Net paid after this: <bdi dir="ltr">UGX 90000</bdi>'], 'a payment with no title');
    has(movements[2], ['"refund" data-direction="in">', '<strong>Refund: <bdi>Fiqh of prayer</bdi></strong>', 'Returned: <bdi dir="ltr">UGX 12000</bdi>', 'Net paid after this: <bdi dir="ltr">UGX 78000</bdi>'], 'a refund');
    none(movements[2], ['Paid:'], 'a refund');
    // A kind with no word: still drawn, by its title, as money that came back.
    has(movements[3], ['"other" data-direction="in">', '<strong><bdi>سيرة النبي</bdi></strong>', `<p class="meta statement-when"><bdi>${date('en', '2026-11-22T08:00:00Z')}</bdi></p>`, 'Returned: <bdi dir="ltr">UGX 0</bdi>'], 'a movement with no word');
    none(movements[3], ['<a href'], 'a movement with no order');

    // What has not moved: each kind and state in the page's own words.
    has(ugx, ['<div class="statement-waiting" data-waiting-list="true"><h3>Not counted yet</h3><p class="muted">None of this has moved money, so none of it changes the net paid figure above.</p>'], 'what is waiting');
    const waits = rows(ugx, '<li class="statement-row" data-waiting=');
    assert.equal(waits.length, 11);
    const sentences = [
      ['"refund_request" data-state="rqRequested">', 'Refund asked for: <bdi dir="ltr">UGX 5000</bdi>', 'Asked for. Nobody has decided yet.'],
      ['"refund_request" data-state="rqApproved">', 'Refund asked for: <bdi dir="ltr">UGX 4000</bdi>', 'Approved, but not sent yet. Nothing has been returned.'],
      ['"refund_request" data-state="rqRejected">', 'Refund asked for: <bdi dir="ltr">UGX 3500</bdi>', 'Declined. Nothing was returned. You can ask why through the help page.'],
      ['"refund_request" data-state="rqWithdrawn">', 'Refund asked for: <bdi dir="ltr">UGX 3200</bdi>', 'The request was withdrawn.'],
      ['"refund" data-state="rfPending">', 'Refund: <bdi dir="ltr">UGX 3000</bdi>', 'Sent to the payment service. Waiting for it to confirm.'],
      ['"dispute" data-state="dpOpen">', 'Case with your bank: <bdi dir="ltr">UGX 50000</bdi>', 'Your bank has a case open. Nothing has moved in this record.'],
      ['"dispute" data-state="dpWon">', 'Case with your bank: <bdi dir="ltr">UGX 2500</bdi>', 'The case was decided in the platform’s favour, so nothing was returned.'],
      ['"dispute" data-state="dpLost">', 'Case with your bank: <bdi dir="ltr">UGX 2400</bdi>', 'The case was decided in your favour. This record has no entry for it, so the figures above do not include it.'],
      ['"dispute" data-state="dpWithdrawn">', 'Case with your bank: <bdi dir="ltr">UGX 2300</bdi>', 'The case was withdrawn.'],
    ];
    sentences.forEach(([marker, amount, sentence], i) => has(waits[i], [marker, `<strong>${amount}</strong>`, `<p class="meta">${sentence}</p>`, `<a href="/orders/${FIRST_ORDER}/receipt"><bdi dir="ltr">AS-00000001</bdi></a>`], `waiting ${i}`));
    // What the payer typed is theirs: as written, escaped, and finding its own direction.
    has(waits[0], ['<p class="muted order-line" data-reason="true">You wrote: <bdi>أريد استرداد المبلغ &lt;b&gt;الآن&lt;/b&gt;</bdi></p>'], 'what was typed');
    none(waits[1], ['data-reason'], 'a request with nothing typed');
    // A state with no word has its amount and no sentence; a kind with none is "not counted yet".
    has(waits[9], ['"refund_request" data-state="unknown">', 'Refund asked for: <bdi dir="ltr">UGX 2200</bdi>'], 'a state with no word');
    none(waits[9], ['<p class="meta">'], 'a state with no word');
    has(waits[10], ['"other" data-state="unknown">', '<strong>Not counted yet: <bdi dir="ltr">UGX 1000</bdi></strong>'], 'a kind with no word');
    none(waits[10], ['<p class="meta">', '<a href'], 'a kind with no word');

    // Dollars in major units, and an order with no number links by the word "receipt".
    const usd = card(seen.main, 'USD');
    has(usd, ['<bdi dir="ltr">USD 19.99</bdi></div><div class="l">Paid</div>', '<bdi dir="ltr">USD 0.00</bdi></div><div class="l">Returned</div>', '<strong>Payment: <bdi>Tajwid &lt;for&gt; beginners</bdi></strong>', `<a href="/orders/${DOLLARS}/receipt">Receipt</a>`, 'Paid: <bdi dir="ltr">USD 19.99</bdi>'], 'the dollar card');
    none(usd, ['1999', 'data-waiting-list'], 'the dollar card');
    // Three decimals; nothing moved, which is said, and one thing waiting.
    const kwd = card(seen.main, 'KWD');
    has(kwd, ['<bdi dir="ltr">KWD 0.000</bdi>', '<p class="empty" data-moved-list="none">Nothing has moved in this currency.</p>', '"refund" data-state="rfFailed">', '<strong>Refund: <bdi dir="ltr">KWD 5.000</bdi></strong>', '<p class="meta">The payment service refused it. Nothing was returned.</p>'], 'the dinar card');
    // A count across currencies, which a total could not be.
    has(seen.main, ['<p class="muted statement-foot" data-waiting-count="12">Still waiting on this account: <bdi dir="ltr">12</bdi><span class="order-rule">Asking for a refund does not return money. A completed refund does.</span></p>'], 'the count');
    assert.equal(seen.main.split('data-waiting-count=').length - 1, 1, 'a quiet account has nothing waiting');

    // On no account at all.
    state = { generatedAt: '2026-11-23T08:00:00Z', accounts: [] };
    seen = await get('/billing');
    has(seen.main, ['<p class="empty" data-statement="none">You are not on a billing account yet. One is created the first time you buy something, and everything you pay appears here afterwards. <a href="/catalogue">Browse the courses</a></p>', 'This is the platform’s record'], 'no account');
    none(seen.main, ['could not be read', 'data-statement="read"', 'data-account'], 'no account');

    // Unread is neither. Five ways a statement can fail to be one.
    const float = copy(); float.accounts[0].currencies[1].netMinor = '780.5';
    const huge = copy(); huge.accounts[0].currencies[1].moved[0].amountMinor = '12345678901234567890';
    const lower = copy(); lower.accounts[0].currencies[2].currencyCode = 'usd';
    for (const [label, what] of [['the database fails', 'broken'], ['no list of accounts', { generatedAt: 'x' }], ['an amount that is not whole', float], ['an amount too long to say', huge], ['a currency that is not a code', lower]]) {
      state = what;
      seen = await get('/billing');
      assert.equal(seen.status, 200, label);
      has(seen.main, ['<div class="notice error" role="alert" data-statement="unread">What you have paid could not be read just now. That is not the same as having paid nothing.</div>', 'This is the platform’s record', '<a href="/orders">My orders</a>'], label);
      none(seen.main, ['SYNTHETIC', 'statement timeout', 'data-statement="read"', 'data-statement="none"', 'You are not on a billing account', 'Nothing has been paid', 'UGX', 'Okello', 'minor units'], label);
    }

    // Arabic, French, and Hausa (held: English, whole, marked).
    state = 'ok';
    seen = await get('/billing', 'ar');
    assert.match(seen.html, /<title>ما دفعتَه/);
    has(seen.main, ['<h1>ما دفعتَه</h1>', '<a href="/account">إعدادات الحساب</a>', '<p class="muted"><bdi>أوغندا</bdi> · عملة الفوترة: <bdi dir="ltr">UGX</bdi></p>',
      '<bdi dir="ltr">UGX 90000</bdi></div><div class="l">المدفوع</div>', '<div class="l">المُعاد</div>', '<div class="l">صافي المدفوع</div>',
      '<strong>دفعة: <bdi>Fiqh of prayer</bdi></strong>', '<strong>دفعة</strong>', '<strong>استرداد: <bdi>Fiqh of prayer</bdi></strong>', `<bdi>${date('ar', '2026-11-19T09:14:00Z')}</bdi>`,
      'المدفوع: <bdi dir="ltr">UGX 50000</bdi>', 'المُعاد: <bdi dir="ltr">UGX 12000</bdi>', 'صافي المدفوع بعد هذا: <bdi dir="ltr">UGX 78000</bdi>',
      '<h3>لم يُحتسب بعد</h3>', 'استرداد مطلوب: <bdi dir="ltr">UGX 5000</bdi>', '<p class="meta">طُلب. لم يقرّر أحد بعد.</p>', '<p class="meta">أُرسل إلى جهة الدفع. بانتظار تأكيدها.</p>',
      'قضية لدى مصرفك: <bdi dir="ltr">UGX 50000</bdi>', '<p class="meta">لدى مصرفك قضية مفتوحة. لم يتحرّك شيء في هذا السجل.</p>', 'المكتوب في الطلب: <bdi>أريد استرداد المبلغ &lt;b&gt;الآن&lt;/b&gt;</bdi>',
      'ما زال بالانتظار في هذا الحساب: <bdi dir="ltr">12</bdi>', 'طلب الاسترداد لا يعيد المال. الاسترداد المكتمل هو الذي يعيده.', '<strong>هذا سجل المنصة، لا سجل مصرفك.</strong>', '<a href="/orders">طلباتي</a>', '<a href="/support">المساعدة</a>',
      // What somebody else wrote is theirs.
      'The Okello &lt;family&gt;', 'Tajwid &lt;for&gt; beginners'], 'the Arabic page');
    none(visible(seen.main), [...ENGLISH, 'lang="en"', 'SYNTHETIC'], 'the Arabic page');
    seen = await get('/billing', 'fr');
    // French puts a no-break space before a colon and a semicolon.
    has(seen.main, ['<h1>Ce que vous avez payé</h1>', '<bdi>Ouganda</bdi> · Devise de facturation\u00a0: <bdi dir="ltr">UGX</bdi>', '<div class="l">Net payé</div>', '<strong>Paiement\u00a0: <bdi>Fiqh of prayer</bdi></strong>', '<strong>Remboursement\u00a0: <bdi>Fiqh of prayer</bdi></strong>',
      'Payé\u00a0: <bdi dir="ltr">UGX 50000</bdi>', 'Restitué\u00a0: <bdi dir="ltr">UGX 12000</bdi>', 'Net payé après cela\u00a0: <bdi dir="ltr">UGX 78000</bdi>', `<bdi>${date('fr', '2026-11-19T09:14:00Z')}</bdi>`,
      'Rien de tout cela n’a fait bouger d’argent\u00a0; rien de tout cela ne modifie donc le net payé ci-dessus.', 'Remboursement demandé\u00a0: <bdi dir="ltr">UGX 5000</bdi>', 'Litige auprès de votre banque\u00a0: <bdi dir="ltr">UGX 50000</bdi>',
      'Vous avez écrit\u00a0: <bdi>', 'Encore en attente sur ce compte\u00a0: <bdi dir="ltr">12</bdi>', '<bdi dir="ltr">USD 19,99</bdi>'.replace(',', '.')], 'the French page');
    none(visible(seen.main), ENGLISH, 'the French page');
    state = 'broken';
    seen = await get('/billing', 'fr');
    has(seen.main, ['data-statement="unread">Ce que vous avez payé n’a pas pu être lu pour le moment. Cela ne veut pas dire que rien n’a été payé.</div>'], 'French, unread');
    state = 'ok';
    seen = await get('/billing', 'ha');
    assert.match(seen.main, /<div class="page" lang="en" dir="ltr">/, 'Hausa is not given the English page, marked');
    has(seen.main, ['<h1>What you have paid</h1>', 'Net paid after this: <bdi dir="ltr">UGX 78000</bdi>', '<bdi>Uganda</bdi>'], 'the Hausa page');
  }
  console.log('What you have paid: signed out goes to sign in and reads nothing; two accounts, one of them quiet, and a card for each of three currencies; sums in major units (UGX 90000, USD 19.99, KWD 0.000); four movements as a list with a running figure that ends on the net one, a payment with no title said as "payment" and a kind with no word still drawn; eleven things waiting, nine in the page’s own sentences and none in the database’s, a state and a kind with no word given an amount and no sentence; what the payer typed kept as typed; a count across currencies and no total; no account, and five kinds of unread, each said as itself; Arabic and French by the reader’s choice, Hausa in English, marked.');

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
        state = 'ok';
        const { context, tab, errors } = await open('/billing', code, width);
        await tab.locator('main h1').waitFor();
        await fits(tab, width, `/billing ${code} ${width}`);
        assert.equal(await tab.evaluate(() => document.documentElement.dir || 'ltr'), code === 'ar' ? 'rtl' : 'ltr');
        // An amount reads left to right whichever way the page does, and a sum is on one line.
        assert.equal(await tab.locator('[data-sum="paid"] bdi').first().evaluate((el) => getComputedStyle(el).direction), 'ltr');
        const tall = await tab.locator('[data-sum] .n').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))));
        assert.ok(tall.every((lines) => lines === 1), `/billing ${code} ${width}: a sum is broken across lines (${tall.join(',')})`);
        // What the payer typed in Arabic starts from the right, even in an English page.
        const typed = tab.locator('[data-reason] bdi').first();
        assert.equal(await typed.evaluate((el) => getComputedStyle(el).direction), 'rtl');
        // Every line that has an order leads to its receipt: three movements and
        // ten things waiting in shillings, one in dinars, one in dollars.
        const links = await tab.locator('main a[href*="/receipt"]').count();
        assert.equal(links, 15, `/billing ${code} ${width}: receipt links`);
        // An order's number is never broken in two.
        const broken = await tab.locator('main a[href*="/receipt"]').evaluateAll((els) => els.filter((el) => el.getClientRects().length > 1).length);
        assert.equal(broken, 0, `/billing ${code} ${width}: an order's number is broken across lines`);
        if (shots && width !== 1440) await tab.screenshot({ path: `${shots}/billing-${code}-${width}.png`, fullPage: true });
        assert.deepEqual(errors, [], `/billing ${code} ${width}: ${errors.join(' | ')}`);
        await context.close();
      }
      console.log(`Synthetic statement in ${code}: fits a phone with no sideways scroll; sums on one line and read left to right; typed Arabic reads right to left; no page error`);
    }
    // Unread, in a browser: said aloud, once.
    {
      state = 'broken';
      const { context, tab, errors } = await open('/billing', 'ar', 320);
      await tab.getByRole('alert').filter({ hasText: 'تعذّرت قراءة ما دفعتَه الآن. هذا لا يعني أنه لم يُدفع شيء.' }).waitFor();
      assert.equal(await tab.locator('main [role="alert"]').count(), 1);
      await fits(tab, 320, '/billing ar 320 unread');
      if (shots) await tab.screenshot({ path: `${shots}/billing-ar-320-unread.png`, fullPage: true });
      // The page logs why on the server. A development server replays its
      // log in the browser's console, marked as the server's; a production
      // build does not. Nothing else may be there, and the reason is not in the page.
      assert.ok(errors.every((line) => line.includes('[billing] statement unread:') && line.includes('Server')), errors.join(' | '));
      assert.ok(!(await tab.locator('body').innerText()).includes('SYNTHETIC'));
      await context.close();
    }
    console.log('Synthetic statement, unread: said once, as an alert, in Arabic.');
  }
  console.log('Billing HTTP smoke passed. Not real Auth, RLS, a statement, a payment or a refund: the stand-in answers what it is told to and no money exists in it.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close().catch(() => {});
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
