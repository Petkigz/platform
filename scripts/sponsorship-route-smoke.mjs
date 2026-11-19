// The real Next /account/sponsorship page against an entirely synthetic
// loopback Auth/REST API. This is not evidence about hosted Supabase, JWT
// validation, RLS, a pledge, a payment or a seat: the stand-in answers
// whatever it is told to and nobody is sponsored. What the database does is
// proved by its own suites.
//
// Sponsoring a seat is behind `commerce.sponsorship`, which is off. The
// stand-in reports the switch as it is told to; nothing here switches it on.
//
// What it does show: the page in English, Arabic, Persian, French by the
// reader's own choice, and English for a language held for review; that a
// state is said from the catalogue and never printed as the database wrote
// it; that an amount is a currency code and major units (it used to be
// printed in minor units); that every date carries its zone; that what staff
// wrote is printed as text, apart, in its own direction; that a board nobody
// could read is said as that and is not an empty list; that with the switch
// off earlier rows are still listed and nothing new is offered; that no word
// of the database reaches the page; and, with a browser, that it fits a
// phone and a desk in four languages. The expected sentences are typed here
// rather than imported, so this fails if a catalogue changes without anybody
// looking at the page.
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

// Parts of the database's words that must reach no reader.
const DATABASE_WORDS = ['sponsorship:', 'not_signed_in', 'canceling statement', 'SYNTHETIC', 'commerce.sponsorship', 'bad gateway'];

const ASKED = {
  enabled: true,
  applications: [
    { id: 'a1', learnerName: 'Maryam <i>N</i>', courseTitle: 'Tajwid <for> beginners', courseSlug: 'tajwid-beginners', status: 'funded', seatCode: 'SEAT-7K2M', reason: 'SYNTHETIC what the family wrote', decisionReason: null, askedAt: '2026-10-01T09:00:00Z', decidedAt: '2026-10-03T12:30:00Z', covered: true },
    { id: 'a2', learnerName: 'يوسف', courseTitle: 'سيرة النبي', courseSlug: null, status: 'declined', seatCode: null, reason: null, decisionReason: 'لا توجد مقاعد هذا الفصل.\n<b>Try next term</b>', askedAt: '2026-09-01T09:00:00Z', decidedAt: '2026-09-04T08:00:00Z', covered: false },
    { id: 'a3', learnerName: null, courseTitle: null, courseSlug: null, status: 'submitted', seatCode: null, reason: null, decisionReason: null, askedAt: '2026-11-18T09:00:00Z', decidedAt: null, covered: false },
    { id: 'a4', learnerName: 'Bilal', courseTitle: 'Fiqh of prayer', courseSlug: 'fiqh-prayer', status: 'approved', seatCode: 'SEAT-9Q4X', reason: null, decisionReason: 'A note that is not a refusal', askedAt: '2026-11-10T09:00:00Z', decidedAt: '2026-11-12T09:00:00Z', covered: false },
    { id: 'a5', learnerName: 'Bilal', courseTitle: 'Arabic one', courseSlug: 'arabic-one', status: 'withdrawn', seatCode: null, reason: null, decisionReason: null, askedAt: '2026-08-10T09:00:00Z', decidedAt: null, covered: false },
    // A state this page has no word for: "Recorded", and the word is not printed.
    { id: 'a6', learnerName: 'Bilal', courseTitle: 'Arabic two', courseSlug: 'arabic-two', status: 'SYNTHETIC-state', seatCode: null, reason: null, decisionReason: null, askedAt: null, decidedAt: null, covered: false },
  ],
};
const GAVE = {
  enabled: true,
  sponsorships: [
    // Minor units, as the database stores them: 1999 is 19.99.
    { id: 's1', seatCode: 'SEAT-AAAA', courseTitle: 'Tajwid <for> beginners', courseSlug: 'tajwid-beginners', status: 'pledged', amountMinor: 1999, currencyCode: 'USD', reference: null, recordedAt: null, pledgedAt: '2026-11-17T10:00:00Z' },
    { id: 's2', seatCode: 'SEAT-BBBB', courseTitle: 'Fiqh of prayer', courseSlug: 'fiqh-prayer', status: 'paid', amountMinor: '50000', currencyCode: 'UGX', reference: 'MOMO-<7781>', recordedAt: '2026-11-02T08:15:00Z', pledgedAt: '2026-11-01T10:00:00Z' },
    { id: 's3', seatCode: 'SEAT-CCCC', courseTitle: null, courseSlug: null, status: 'withdrawn', amountMinor: '5000', currencyCode: 'KWD', reference: null, recordedAt: '2026-10-02T08:15:00Z', pledgedAt: '2026-10-01T10:00:00Z' },
    // An amount that cannot be read as one, and a state with no word: neither is printed.
    { id: 's4', seatCode: null, courseTitle: 'Arabic one', courseSlug: 'arabic-one', status: 'SYNTHETIC-state', amountMinor: '19.99', currencyCode: 'usd', reference: null, recordedAt: null, pledgedAt: null },
  ],
};

const state = { asked: 'ok', gave: 'ok' };
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
  calls.push({ method: req.method, path, sent });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  const answer = (how, good) => {
    if (how === 'ok') send(good);
    else if (how === 'off') send({ ...good, enabled: false });
    else if (how === 'empty') send({ enabled: true, applications: [], sponsorships: [] });
    else if (how === 'empty_off') send({ enabled: false, applications: [], sponsorships: [] });
    else if (how === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); res.end('<html>bad gateway SYNTHETIC</html>'); }
    else if (how === 'no_reply') send(null);
    else if (how === 'word') send('SYNTHETIC not a reply');
    else if (how === 'signed_out') send({ code: '42501', message: 'sponsorship:not_signed_in', details: null, hint: null }, 403);
    else send({ code: '57014', message: 'canceling statement due to statement timeout', details: null, hint: null }, 500);
  };
  if (path === '/rest/v1/rpc/setting_bool') send(false);
  else if (path === '/rest/v1/user_profiles') send([{ display_name: 'Halima Probe', preferred_language: 'en', timezone: 'Africa/Kampala', account_status: 'active' }]);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/rpc/my_policy_standing') send({ outstanding: 0, acceptanceRequired: [], history: [] });
  else if (path === '/rest/v1/rpc/my_sponsorship_applications') answer(state.asked, ASKED);
  else if (path === '/rest/v1/rpc/my_sponsorships') answer(state.gave, GAVE);
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
  const page = async (headers) => { const response = await request('/account/sponsorship', { cookie, ...headers }); assert.equal(response.status, 200, logs.slice(-2000)); return response.text(); };
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '');
  const none = (text, words, label) => { for (const word of words) assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `${label} says "${word}"`); };
  const count = (text, piece) => text.split(piece).length - 1;
  const GAPS = ['{name}', '{code}', '{amount}', '{reference}', '{date}'];
  const ENGLISH_ONLY = ['Sponsored seats', 'Account settings', 'What I have asked for', 'What I have sponsored', 'Waiting for somebody', 'Approved, and', 'Not approved', 'Taken back', 'Recorded', 'Called off', 'Seats waiting', 'Ask for a sponsored seat', 'Go to my learning', 'scholar', 'Nothing is taken'];
  const ASK_LINK = '<a class="btn secondary" href="/sponsor/apply">Ask for a sponsored seat</a>';
  const POOL_LINK = '<a class="btn secondary" href="/sponsor">Seats waiting</a>';

  // ------------------------------------------------------------- signed out
  {
    const out = await request('/account/sponsorship');
    assert.ok([302, 303, 307, 308].includes(out.status), `signed out: ${out.status}`);
    assert.ok(decodeURIComponent(decodeURIComponent(out.headers.get('location') ?? '')).includes('/sign-in?next=/account/sponsorship'), `sent to ${out.headers.get('location')}`);
  }

  // ---------------------------------------------------------------- English
  const english = await page({ 'accept-language': 'en' });
  const en = inner(english);
  assert.match(english, /<title>Sponsored seats[^<]*<\/title>/);
  for (const sentence of [
    '<a href="/account">Account settings</a>',
    '<h1>Sponsored seats</h1>',
    'Courses somebody else paid for, and courses you paid for somebody else to take. Neither side learns who the other is.',
    '>What I have asked for</h2>',
    // A title is text, never markup, and links to its course when it has one.
    '<a href="/courses/tajwid-beginners"><bdi>Tajwid &lt;for&gt; beginners</bdi></a>',
    '<bdi>سيرة النبي</bdi>',
    'Covered: somebody paid for this seat',
    'Not approved',
    'Waiting for somebody to read it',
    'Approved, and waiting for a sponsor',
    'Taken back',
    'For: <bdi>Maryam &lt;i&gt;N&lt;/i&gt;</bdi>',
    'For: <bdi>يوسف</bdi>',
    'Seat: <bdi dir="ltr">SEAT-7K2M</bdi>',
    'What staff wrote, in their own words:',
    // Their words, as text, in whatever direction they were written.
    'لا توجد مقاعد هذا الفصل.\n&lt;b&gt;Try next term&lt;/b&gt;</p>',
    'A note that is not a refusal</p>',
    '<strong>A seat you asked for has been covered.</strong>',
    'The course is open for the learner now. Whoever paid is not named here, and that is on purpose: who gave is between the giver and Allah.',
    '<a href="/learn">Go to my learning</a>',
    '>What I have sponsored</h2>',
    'Pledged: waiting for the payment to be recorded',
    'Paid, and the seat is open',
    'Called off',
    // Major units, and the currency as written; never 1999.
    'Amount: <bdi dir="ltr">USD 19.99</bdi>',
    'Amount: <bdi dir="ltr">UGX 50000</bdi>',
    'Amount: <bdi dir="ltr">KWD 5.000</bdi>',
    'Reference: <bdi dir="ltr">MOMO-&lt;7781&gt;</bdi>',
    'Nothing is taken automatically: this page collects no payment. Staff record the payment here when it reaches the platform, and the seat opens when they do.',
    'Recorded. The seat is open for the learner, and they have not been told who paid.',
    'This pledge was called off, so no money is expected for it.',
    'Whether a sponsored seat counts as zakat, sadaqah or neither is a scholar’s ruling, and this platform does not make it. Ask somebody you trust before you give.',
    POOL_LINK,
    ASK_LINK,
  ]) assert.ok(en.includes(sentence), `English sponsorship page lost "${sentence}"`);
  none(en, DATABASE_WORDS, 'the English sponsorship page');
  none(en, ['lang="en"', ...GAPS, 'USD 1999', '>1999<', 'switched off', 'could not be read', '<code>', '<button', '<table', 'what the family wrote', 'mobile-money', 'card or', 'provider'], 'the English sponsorship page');
  // The currency written in lower case is not a currency, and is not printed.
  assert.ok(!en.includes('usd') && !en.includes('19.99</bdi> ·'));
  // A state as the database wrote it is never the label.
  for (const raw of ['>funded<', '>declined<', '>submitted<', '>approved<', '>withdrawn<', '>pledged<', '>paid<', 'SYNTHETIC-state']) assert.ok(!en.includes(raw), `the English sponsorship page prints ${raw}`);
  // Every time carries its zone: the server does not know the reader's clock.
  for (const pattern of [/Asked on [^<]*2026[^<]*UTC/, /Decided on [^<]*2026[^<]*UTC/, /Pledged on [^<]*2026[^<]*UTC/, /Payment recorded on [^<]*2026[^<]*UTC/]) assert.match(en, pattern);
  assert.equal(count(en, 'Asked on '), 5, 'a request with no date says no date');
  assert.equal(count(en, 'Decided on '), 3);
  assert.equal(count(en, 'Pledged on '), 3);
  // Only a payment that is recorded has a day it was recorded on.
  assert.equal(count(en, 'Payment recorded on '), 1);
  // A request with no course named and one with no learner named invent neither.
  assert.equal(count(en, '<strong style="overflow-wrap:anywhere">A course</strong>'), 2);
  assert.equal(count(en, 'For: '), 5);
  // Two states with no word, one on each side: "Recorded", and no next step for the pledge.
  assert.equal(count(en, '>Recorded</p>'), 2);
  assert.equal(count(en, 'Amount: '), 3, 'an amount that cannot be read as one is printed');
  assert.equal(count(en, 'data-staff-note="true"'), 2);
  assert.equal(count(en, 'dir="auto"'), 2);
  assert.equal(count(en, '<li data-ask='), 6);
  assert.equal(count(en, '<li data-pledge='), 4);
  // It only reads: the two boards, and nothing is written.
  assert.deepEqual(calls.filter((c) => c.path.includes('sponsor')).map((c) => c.path).sort(), ['/rest/v1/rpc/my_sponsorship_applications', '/rest/v1/rpc/my_sponsorships']);

  // ------------------------- the switch off: what was is listed, nothing new
  {
    state.asked = 'off'; state.gave = 'off';
    const off = inner(await page({ 'accept-language': 'en' }));
    assert.ok(off.includes('<div class="notice warn">Sponsoring a seat is switched off at the moment, so nothing new can be asked for or sponsored. What was asked for or sponsored earlier is still shown here.</div>'));
    assert.equal(count(off, '<li data-ask='), 6, 'off: earlier requests are still listed');
    assert.equal(count(off, '<li data-pledge='), 4, 'off: earlier pledges are still listed');
    none(off, ['/sponsor/apply', 'href="/sponsor"', 'commerce.sponsorship', '<code>'], 'the page with sponsoring off');
    assert.ok(off.includes('Whether a sponsored seat counts as zakat'), 'off: the sentence about zakat went');
    // Off with nothing earlier: said, and nobody is told they can ask.
    state.asked = 'empty_off'; state.gave = 'empty_off';
    const bare = inner(await page({ 'accept-language': 'en' }));
    assert.ok(bare.includes('<p class="empty">You have not asked for a sponsored seat.</p>'));
    assert.ok(bare.includes('<p class="empty">You have not sponsored a seat.</p>'));
    none(bare, ['you can ask', 'Each seat that is waiting', '/sponsor/apply', 'href="/sponsor"'], 'the empty page with sponsoring off');
    // On with nothing: how to start, on both sides.
    state.asked = 'empty'; state.gave = 'empty';
    const fresh = inner(await page({ 'accept-language': 'en' }));
    assert.ok(fresh.includes('<p class="empty">You have not asked for a sponsored seat. If a course is out of reach, you can ask. It costs nothing and obliges nobody.</p>'));
    assert.ok(fresh.includes('<p class="empty">You have not sponsored a seat. Each seat that is waiting is a course somebody asked for.</p>'));
    assert.ok(fresh.includes(ASK_LINK) && fresh.includes(POOL_LINK));
    none(fresh, ['switched off', 'has been covered'], 'the empty page');
    state.asked = 'ok'; state.gave = 'ok';
  }

  // ------------- a board nobody could read is said as that, not as empty
  const ASK_UNREAD = '<div class="notice error" role="alert">Your requests could not be read just now. Nothing has changed: this page only reads.</div>';
  const GAVE_UNREAD = '<div class="notice error" role="alert">Your sponsorships could not be read just now. Nothing has changed: this page only reads.</div>';
  for (const how of ['timeout', 'gateway', 'no_reply', 'word', 'signed_out']) {
    state.asked = how; state.gave = 'ok';
    const one = inner(await page({ 'accept-language': 'en' }));
    assert.ok(one.includes(ASK_UNREAD) && !one.includes(GAVE_UNREAD), `requests answered ${how}`);
    none(one, [...DATABASE_WORDS, 'You have not asked', '<li data-ask='], `requests answered ${how}`);
    assert.equal(count(one, '<li data-pledge='), 4, `${how}: the other board went too`);
    // The other board still says the switch, so the links are still right.
    assert.ok(one.includes(POOL_LINK));
    state.asked = 'ok'; state.gave = how;
    const other = inner(await page({ 'accept-language': 'en' }));
    assert.ok(other.includes(GAVE_UNREAD) && !other.includes(ASK_UNREAD), `pledges answered ${how}`);
    none(other, [...DATABASE_WORDS, 'You have not sponsored', '<li data-pledge='], `pledges answered ${how}`);
    assert.equal(count(other, '<li data-ask='), 6);
  }
  {
    // Neither: both said, the switch unknown, so nothing is said about it and the links stay.
    state.asked = 'timeout'; state.gave = 'gateway';
    const neither = inner(await page({ 'accept-language': 'en' }));
    assert.ok(neither.includes(ASK_UNREAD) && neither.includes(GAVE_UNREAD));
    none(neither, [...DATABASE_WORDS, 'switched off'], 'the page with neither board');
    assert.ok(neither.includes(POOL_LINK) && neither.includes(ASK_LINK));
    // One read and off, the other unread: off is believed.
    state.asked = 'off'; state.gave = 'timeout';
    const half = inner(await page({ 'accept-language': 'en' }));
    assert.ok(half.includes('Sponsoring a seat is switched off at the moment') && half.includes(GAVE_UNREAD));
    none(half, ['/sponsor/apply', 'href="/sponsor"'], 'off with one board unread');
    state.asked = 'ok'; state.gave = 'ok';
  }

  // ----------------------------------------------------------------- Arabic
  {
    const html = await page({ cookie: `${cookie}; ayahspring_locale=ar` });
    assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
    assert.match(html, /<title>المقاعد المكفولة[^<]*<\/title>/);
    const ar = inner(html);
    for (const sentence of [
      '<a href="/account">إعدادات الحساب</a>',
      '<h1>المقاعد المكفولة</h1>',
      '>ما طلبتُه</h2>',
      'مكفول: دفع أحدهم ثمن هذا المقعد',
      'المقعد: <bdi dir="ltr">SEAT-7K2M</bdi>',
      'لأجل: <bdi>Maryam &lt;i&gt;N&lt;/i&gt;</bdi>',
      'ما كتبه فريق العمل، بكلماتهم:',
      'من دفع غير مذكور هنا، وذلك مقصود: من أعطى فأمره بين المعطي وبين الله.',
      '>ما كفلتُه</h2>',
      // An amount reads left to right whatever the page, in the digits it was written in.
      'المبلغ: <bdi dir="ltr">USD 19.99</bdi>',
      'المرجع: <bdi dir="ltr">MOMO-&lt;7781&gt;</bdi>',
      'لا يُؤخذ شيء تلقائيًا: هذه الصفحة لا تحصّل أي دفعة.',
      'هل يُعدّ المقعد المكفول زكاة أو صدقة أو لا يُعدّ أيًّا منهما؟ هذا حكم يقوله أهل العلم، وهذه المنصة لا تحكم فيه. اسأل من تثق به قبل أن تعطي.',
      '<a class="btn secondary" href="/sponsor">المقاعد المنتظرة</a>',
      '<a class="btn secondary" href="/sponsor/apply">اطلب مقعدًا مكفولًا</a>',
    ]) assert.ok(ar.includes(sentence), `Arabic sponsorship page lost "${sentence}"`);
    none(ar, [...ENGLISH_ONLY, ...GAPS, ...DATABASE_WORDS, 'lang="en"'], 'the Arabic sponsorship page');
    assert.equal(count(ar, '>مسجَّل</p>'), 2);
    assert.match(ar, /تاريخ الطلب: [^<]*2026/);
    state.asked = 'off'; state.gave = 'timeout';
    const off = inner(await page({ cookie: `${cookie}; ayahspring_locale=ar` }));
    assert.ok(off.includes('كفالة المقاعد متوقفة حاليًا، فلا يمكن طلب مقعد جديد ولا كفالة مقعد جديد.') && off.includes('تعذّرت قراءة كفالاتك الآن.'));
    state.asked = 'ok'; state.gave = 'ok';
  }
  // ------------------------------- Persian: its own digits in a date, not in money
  {
    const fa = inner(await page({ cookie: `${cookie}; ayahspring_locale=fa` }));
    assert.ok(fa.includes('<h1>جایگاه‌های حمایت‌شده</h1>') && fa.includes('تأمین شد: کسی هزینهٔ این جایگاه را پرداخت'));
    assert.match(fa, /تاریخ درخواست: [^<]*[۰-۹]/u);
    assert.ok(fa.includes('مبلغ: <bdi dir="ltr">USD 19.99</bdi>'), 'an amount changed its digits');
    none(fa, [...ENGLISH_ONLY, ...GAPS], 'the Persian sponsorship page');
  }
  // ------------------------------------------------------------------ French
  {
    const fr = inner(await page({ cookie: `${cookie}; ayahspring_locale=fr` }));
    for (const sentence of ['<h1>Places parrainées</h1>', 'Financée\u00a0: quelqu’un a payé cette place', 'Place\u00a0: <bdi dir="ltr">SEAT-7K2M</bdi>', 'Montant\u00a0: <bdi dir="ltr">UGX 50000</bdi>', '>Demander une place parrainée</a>']) assert.ok(fr.includes(sentence), `French sponsorship page lost "${sentence}"`);
    none(fr, [...ENGLISH_ONLY, ...GAPS], 'the French sponsorship page');
  }
  // ---------------- a language held for review: English, whole, and marked
  {
    const html = await page({ cookie: `${cookie}; ayahspring_locale=ha` });
    assert.match(html, /<html[^>]*lang="ha"/);
    const ha = inner(html);
    assert.ok(ha.includes('<div class="container section" lang="en" dir="ltr">'), 'the held page is not marked as English');
    assert.ok(ha.includes('<h1>Sponsored seats</h1>') && ha.includes('Covered: somebody paid for this seat') && ha.includes('Amount: <bdi dir="ltr">USD 19.99</bdi>'));
  }
  console.log('Sponsorship page: signed out is sent to sign in; English says six requests and four pledges each by its state from the catalogue, two unknown states as "Recorded", amounts in major units (USD 19.99, UGX 50000, KWD 5.000; one that is not an amount left out), every date with its zone, what staff wrote as text in its own direction, and reads two functions and writes nothing; the switch off still lists what was and offers nothing new; a board answered five wrong ways on either side is "could not be read", never an empty list, with no word of the database; Arabic right to left with codes and amounts left to right, Persian with its own digits in dates and not in money, French, and Hausa in English, marked.');

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
      await tab.goto(`${origin}/account/sponsorship`, { waitUntil: 'networkidle' });
      return { context, tab, errors };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 40)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card, main .notice')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
      assert.equal(spill, 0, `${label}: a card's contents are wider than the card`);
    };
    const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.locator('main').screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png` }).catch(() => {}); };

    for (const [code, heading] of [['en', 'Sponsored seats'], ['ar', 'المقاعد المكفولة'], ['ta', null], ['fil', null]]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await open(code, width);
        if (heading) await tab.getByRole('heading', { level: 1, name: heading, exact: true }).waitFor();
        else await tab.locator('main h1').waitFor();
        await fits(tab, width, `sponsorship ${code} ${width}`);
        // An amount and a seat code are left to right whatever the page.
        assert.equal(await tab.locator('li[data-pledge="paid"] bdi[dir="ltr"]').first().evaluate((el) => getComputedStyle(el).direction), 'ltr');
        // What staff wrote in Arabic reads right to left even on an English page, and the English note left to right on an Arabic one.
        const directions = await tab.locator('[data-staff-note]').evaluateAll((els) => els.map((el) => getComputedStyle(el).direction));
        assert.deepEqual(directions, ['rtl', 'ltr'], `sponsorship ${code} ${width}: what staff wrote lost its direction`);
        assert.deepEqual(errors, [], `sponsorship ${code} ${width}: ${errors.join(' | ')}`);
        if ([390, 1440].includes(width)) await shot(tab, `sponsorship-${code}-${width}`);
        await context.close();
      }
      console.log(`Synthetic sponsorship page in ${code}: fits at 320, 390 and 1440px; what staff wrote keeps its own direction; no hydration error`);
    }
  }
  console.log('Sponsorship HTTP smoke passed. Not real Auth, RLS, a pledge, a payment or a seat: the stand-in sponsors nobody, and the switch is off in the product.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
