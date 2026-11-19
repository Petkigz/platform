// Real Next /account/referrals and /referral/<code> pages, the
// /api/account/referrals route and the /api/referral/<code> route against an
// entirely synthetic loopback Auth/REST API. This is not evidence about hosted
// Supabase, JWT validation, RLS, a purchase or a discount: the stand-in
// answers whatever it is told to, mints nothing and takes nothing off any
// price. What the database does is proved by its own suites.
//
// Inviting a friend is behind `commerce.referrals`, which is off. The stand-in
// answers the switch as it is told to; nothing here switches it on.
//
// What it does show: the two screens in English, Arabic, Persian, French by
// the reader's own choice, and English for a language held for review; that
// what a friend gets is read off the code and not off today's setting; that a
// reward's state and a person's are said from the catalogue and never printed
// as the database wrote them, each date with its zone; that a visitor is told
// a first name and no more; that the three ways an invitation can fail are
// said apart; that the routes answer by name with no sentence of the database
// in any answer; that keeping a code sends the visitor to a path on the host
// they are on; and, with a browser, that the link is the browser's own
// address where the site address is unset, that copying works and that a
// clipboard that says no is said as that. The expected sentences are typed
// here rather than imported, so this fails if a catalogue changes without
// anybody looking at the page.
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

const CODE = 'AYA-7K2M9Q';
const FAR = '2099-12-01T10:00:00Z';

// What the two functions raise, word for word, with the state each is raised
// under and the status PostgREST gives that state.
const RAISED = {
  signed_out_mint: ['42501', 403, 'sign in to invite somebody'],
  signed_out_board: ['42501', 403, 'sign in to see your invitations'],
  off: ['0A000', 400, 'inviting friends is not switched on for this platform yet'],
  not_a_discount: ['23514', 400, 'the referee discount is set to 0, which is not a discount'],
  timeout: ['57014', 500, 'canceling statement due to statement timeout'],
};
// Parts of the database's sentences that must reach no reader, in a page or an answer.
const DATABASE_WORDS = ['sign in to invite', 'sign in to see', 'not switched on for this platform', 'referee discount', 'canceling statement', 'SYNTHETIC', 'commerce.referrals', 'Thank you for an invitation', 'Invitation from'];

const BOARD = {
  enabled: true,
  // Today's setting. The code below was minted when it was fifteen, and
  // fifteen is what the friend is told and what the page must say.
  refereePercent: 10,
  rewardPercent: 20,
  maxPerYear: 10,
  expiryDays: 90,
  code: CODE,
  joined: 4,
  rewards: [
    // Made, and not usable until the refund window has passed.
    { code: 'THANKS-FUTURE1', status: 'rewarded', percent: 20, startsAt: FAR, startsWhenKnown: false, earnedAt: '2026-11-18T09:00:00Z', endsAt: '2100-03-01T10:00:00Z', campaignStatus: 'active' },
    // Usable now.
    { code: 'THANKS-LIVE22', status: 'rewarded', percent: 20, startsAt: '2026-11-01T10:00:00Z', startsWhenKnown: false, earnedAt: '2026-10-29T10:00:00Z', endsAt: FAR, campaignStatus: 'active' },
    // Withdrawn after a refund.
    { code: 'THANKS-GONE33', status: 'reversed', percent: 20, startsAt: '2026-10-01T10:00:00Z', startsWhenKnown: false, earnedAt: '2026-09-28T10:00:00Z', endsAt: FAR, campaignStatus: 'archived' },
    // A state this screen has no word for: "Recorded", and the word is not printed.
    { code: 'THANKS-ODD444', status: 'SYNTHETIC-state', percent: null, startsAt: null, startsWhenKnown: true, earnedAt: null, endsAt: null, campaignStatus: 'active' },
  ],
  invited: [
    { name: 'Amina<b>', status: 'rewarded', joinedAt: '2026-11-18T09:00:00Z' },
    // What the database leaves of "A friend" for somebody with no name.
    { name: 'A', status: 'pending', joinedAt: '2026-11-17T09:00:00Z' },
    { name: 'يوسف', status: 'reversed', joinedAt: '2026-09-28T10:00:00Z' },
    { name: 'Bilal', status: 'capped', joinedAt: '2026-08-28T10:00:00Z' },
  ],
};
const FOUND = { found: true, code: CODE, inviterName: 'Halima Nakato Probe', percentOff: 15 };

const state = { on: true, mint: 'ok', board: 'ok', resolve: 'found', name: 'Halima Nakato Probe' };
const calls = [];
const fake = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const json = { 'content-type': 'application/json' };
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, json); res.end('{"message":"not authenticated"}'); return; }
    res.writeHead(200, json); res.end(JSON.stringify(user)); return;
  }
  // A visitor with no account asks with the public key, as the product does.
  const signedIn = req.headers.authorization === `Bearer ${token}`;
  if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(404, json); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  let sent = null; try { sent = JSON.parse(body); } catch { /* no body */ }
  calls.push({ method: req.method, path, sent, signedIn });
  const send = (value, status = 200) => { res.writeHead(status, json); res.end(JSON.stringify(value)); };
  const raise = (name) => { const [code, status, message] = RAISED[name]; send({ code, message, details: null, hint: null }, status); };
  const answer = (how, good) => {
    if (how === 'ok') send(good);
    else if (how === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); res.end('<html>bad gateway SYNTHETIC</html>'); }
    else if (how === 'no_reply') send(null);
    else if (how === 'word') send('SYNTHETIC not a reply');
    else raise(how);
  };
  if (path === '/rest/v1/rpc/resolve_referral_code') {
    if (state.resolve === 'found') send({ ...FOUND, inviterName: state.name, code: String(sent?.p_code ?? '').toUpperCase() });
    else if (state.resolve === 'none') send({ found: false });
    else if (state.resolve === 'disabled') send({ found: false, disabled: true });
    else if (state.resolve === 'no_worth') send({ ...FOUND, inviterName: null, percentOff: null });
    else answer(state.resolve, null);
    return;
  }
  if (!signedIn) { res.writeHead(401, json); res.end('{}'); return; }
  if (path === '/rest/v1/rpc/setting_bool') send(sent?.p_key === 'commerce.referrals' ? state.on : false);
  else if (path === '/rest/v1/user_profiles') send(url.searchParams.get('select') === 'display_name' ? { display_name: state.name } : [{ display_name: state.name, preferred_language: 'en', timezone: 'Africa/Kampala', account_status: 'active' }]);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path === '/rest/v1/rpc/my_policy_standing') send({ outstanding: 0, acceptanceRequired: [], history: [] });
  else if (path === '/rest/v1/rpc/my_referral_code') answer(state.mint, { code: CODE, created: false });
  else if (path === '/rest/v1/rpc/my_referrals') {
    if (state.board === 'switched_off') send({ ...BOARD, enabled: false, joined: 0, rewards: [], invited: [] });
    else if (state.board === 'no_code') send({ ...BOARD, code: null, joined: 0, rewards: [], invited: [] });
    else if (state.board === 'empty') send({ ...BOARD, joined: 0, rewards: [], invited: [] });
    else answer(state.board, BOARD);
  }
  else send({}, 404);
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const root = resolve(import.meta.dirname, '..');
// No NEXT_PUBLIC_SITE_URL: the state a preview is in, and the one in which the
// old page copied a bare path and the old route sent a visitor to localhost.
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
  const request = (path, headers = {}, method = 'GET') => fetch(`${origin}${path}`, { method, headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  const read = async (path, headers) => { const response = await request(path, headers); assert.equal(response.status, 200, `${path}: ${logs.slice(-2000)}`); return { html: await response.text(), response }; };
  const page = async (headers) => (await read('/account/referrals', { cookie, ...headers })).html;
  const landing = async (headers, code = CODE) => (await read(`/referral/${code}`, headers)).html;
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '');
  const none = (text, words, label) => { for (const word of words) assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `${label} says "${word}"`); };
  const count = (text, piece) => text.split(piece).length - 1;
  const asked = (name) => calls.filter((c) => c.path === `/rest/v1/rpc/${name}`);
  const GAPS = ['{count}', '{date}', '{days}', '{max}', '{percent}', '{friend}', '{you}', '{name}', '{link}'];
  const ENGLISH_ONLY = ['Invite a friend', 'Account settings', 'Your invitation code', 'Copy the invitation link', 'Copy a message', 'Rewards you have earned', 'Who you invited', 'How it works', 'Bought a course', 'A friend', 'An invitation', 'Your invitation', 'Keep this code and browse', 'Browse the courses', 'not money'];

  // ------------------------------------------------------------- signed out
  {
    const out = await request('/account/referrals');
    assert.ok([302, 303, 307, 308].includes(out.status), `signed out: ${out.status}`);
    assert.ok(decodeURIComponent(decodeURIComponent(out.headers.get('location') ?? '')).includes('/sign-in?next=/account/referrals'), `sent to ${out.headers.get('location')}`);
  }

  // ---------------------------------------------------------------- English
  const english = await page({ 'accept-language': 'en' });
  const en = inner(english);
  assert.match(english, /<title>Invite a friend[^<]*<\/title>/);
  for (const sentence of [
    '<a href="/account">Account settings</a>',
    '<h1>Invite a friend</h1>',
    'A friend who is new here gets a discount on their first course, and you get one on your next. Both are discounts on a course, not money, so there is nothing to withdraw and no bank details to give.',
    '>Your invitation code</h2>',
    `>${CODE}</strong>`,
    // Fifteen is what the code says; ten is today's setting and is not printed.
    'Your friend gets 15% off their first course. When their payment arrives you get a code for 20% off your next course, which starts to work once the refund window has passed.',
    '>Copy the invitation link</button>',
    '>Copy a message</button>',
    `/referral/${CODE}</p>`,
    '>Rewards you have earned</h2>',
    'Rewards: 4',
    '>THANKS-FUTURE1</strong>',
    '20% off a course',
    'Earned',
    'Withdrawn: the purchase it came from was refunded',
    'Recorded',
    'Type it in the code box on the payment page of any course you are buying.',
    '>Who you invited</h2>',
    'People: 4',
    // A name is text, never markup, and is set apart from the line it is in.
    '<bdi>Amina&lt;b&gt;</bdi>',
    '<bdi>يوسف</bdi>',
    // Somebody with no name is "A friend", not the letter the database leaves.
    '<strong style="overflow-wrap:anywhere">A friend</strong>',
    'Bought a course',
    'Started a purchase',
    'Their purchase was refunded',
    'Only a first name is shown. What somebody else learns, and with whom, is not yours to see because you invited them.',
    '>How it works</h2>',
    'You send the link. They open it and see what the code is worth before they decide anything.',
    'They type it while buying their first course, and the discount shows on the receipt they keep.',
    'When their payment arrives, your reward code is made. It starts to work once the refund window has passed, and then works for this many days: 90. If they are refunded, the reward is withdrawn.',
    'Rewards you may earn in twelve months: 10. Each one is an ordinary discount on an ordinary order, with an ordinary receipt.',
    'Both rewards are discounts on a course, not money. Nothing is paid out to anyone, which is why inviting a friend needs no bank details.',
  ]) assert.ok(en.includes(sentence), `English invitation page lost "${sentence}"`);
  none(en, DATABASE_WORDS, 'the English invitation page');
  none(en, ['lang="en"', ...GAPS, '10% off', '<bdi>A</bdi>', 'switched off', 'could not be read', '<code>', 'Nakato'], 'the English invitation page');
  // A state as the database wrote it is never the label.
  for (const raw of ['>rewarded<', '>reversed<', '>pending<', '>capped<', 'SYNTHETIC-state']) assert.ok(!en.includes(raw), `the English invitation page prints ${raw}`);
  // Every time carries its zone: the server does not know the reader's clock.
  assert.match(en, /Usable from [^<]*2099[^<]*UTC/);
  assert.match(en, /Use it by [^<]*2099[^<]*UTC/);
  assert.equal(count(en, 'Usable from '), 1);
  // One is usable today, so one is told where to type it; a withdrawn one has no date.
  assert.equal(count(en, 'Use it by '), 1);
  assert.equal(count(en, 'Type it in the code box'), 1);
  assert.equal(count(en, 'Bought a course'), 2, 'reaching the yearly limit is not said about the friend');
  // The switch was asked before a code was minted, and the code's own worth was read.
  assert.deepEqual(asked('resolve_referral_code').at(-1).sent, { p_code: CODE });
  assert.equal(asked('my_referral_code').length, 1);

  // --------------------------------------- the switch off: nothing is minted
  {
    state.on = false;
    const before = calls.length;
    const off = inner(await page({ 'accept-language': 'en' }));
    assert.ok(off.includes('<div class="notice">Inviting a friend is switched off at the moment, so there is no code to give yet. When it is switched on, this page shows your code and what came of it.</div>'));
    none(off, ['<button', CODE, 'Your invitation code', 'Rewards', '<code>', 'commerce.referrals'], 'the page with inviting off');
    const since = calls.slice(before).map((c) => c.path);
    for (const rpc of ['my_referral_code', 'my_referrals', 'resolve_referral_code']) assert.ok(!since.includes(`/rest/v1/rpc/${rpc}`), `off still asked ${rpc}`);
    state.on = true;
    // Turned off between the two questions: the board says so, and the page believes it.
    state.board = 'switched_off';
    const late = inner(await page({ 'accept-language': 'en' }));
    assert.ok(late.includes('Inviting a friend is switched off at the moment'));
    none(late, ['<button', CODE], 'the page with inviting turned off on the way');
    state.board = 'ok';
  }

  // ------------------------------- a board nobody could read is said as that
  for (const how of ['timeout', 'gateway', 'no_reply', 'word', 'off', 'signed_out_board']) {
    state.board = how;
    const html = inner(await page({ 'accept-language': 'en' }));
    assert.ok(html.includes('<div class="notice error" role="alert">The invitation details could not be read just now. Nothing was charged and no code was used. Reloading is safe.</div>'), how);
    none(html, [...DATABASE_WORDS, '<button', 'Rewards you have earned'], `a board answered with ${how}`);
  }
  state.board = 'ok';

  // ------------------- a code that could not be minted is said, not invented
  {
    state.mint = 'not_a_discount'; state.board = 'no_code';
    const html = inner(await page({ 'accept-language': 'en' }));
    assert.ok(html.includes('Your code is made the first time this page opens and stays the same for good. If it is still missing, reload the page once.'));
    none(html, [...DATABASE_WORDS, '<button', '/referral/'], 'the page with no code');
    assert.ok(html.includes('Rewards: 0') && html.includes('People: 0'));
    assert.ok(html.includes('Nothing yet. A reward appears here once somebody uses your code and their payment has arrived.'));
    assert.ok(html.includes('Nobody yet. People appear here once they have used your code on a purchase.'));
    state.mint = 'ok'; state.board = 'ok';
  }

  // ----- what the code is worth could not be read: the link, and no number
  for (const how of ['timeout', 'none', 'disabled', 'no_worth']) {
    state.resolve = how;
    const html = inner(await page({ 'accept-language': 'en' }));
    assert.ok(html.includes(`>${CODE}</strong>`) && html.includes('>Copy the invitation link</button>'), how);
    none(html, ['Your friend gets', 'Copy a message', '10%', '15%', ...DATABASE_WORDS], `the page when the worth answered ${how}`);
  }
  state.resolve = 'found';

  // ----------------------------------------------------------------- Arabic
  {
    const html = await page({ cookie: `${cookie}; ayahspring_locale=ar` });
    assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
    const ar = inner(html);
    for (const sentence of [
      '<h1>ادعُ صديقًا</h1>',
      'الصديق الجديد هنا يحصل على خصم على دورته الأولى، وتحصل أنت على خصم على دورتك التالية. كلاهما خصم على دورة لا مال، فلا شيء يُسحب ولا حاجة إلى بيانات مصرفية.',
      '>انسخ رابط الدعوة</button>',
      '>انسخ رسالة</button>',
      '>المكافآت التي حصلت عليها</h2>',
      'المكافآت: 4',
      'سُحبت: الشراء الذي نتجت عنه استُرد مبلغه',
      '>من دعوتهم</h2>',
      'الأشخاص: 4',
      '<strong style="overflow-wrap:anywhere">صديق</strong>',
      // Said without a verb, which in Arabic would give the friend a gender.
      'شراء دورة',
      'المكافأتان خصمان على دورة لا مال. لا يُصرف شيء لأحد، ولهذا لا تحتاج دعوة صديق إلى بيانات مصرفية.',
    ]) assert.ok(ar.includes(sentence), `Arabic invitation page lost "${sentence}"`);
    none(ar, [...ENGLISH_ONLY, ...GAPS, ...DATABASE_WORDS, 'lang="en"'], 'the Arabic invitation page');
    // A code and a link read left to right whatever the page.
    assert.ok(ar.includes(`<strong dir="ltr" data-referral-code="true"`), 'the code lost its direction');
    assert.ok(/<p class="muted" dir="ltr" data-referral-link="true"/.test(ar), 'the link lost its direction');
    assert.match(ar, /يمكن استخدامه ابتداءً من [^<]*2099/);
  }
  // ---------------------------------------------- Persian: its own digits
  {
    const fa = inner(await page({ cookie: `${cookie}; ayahspring_locale=fa` }));
    assert.ok(fa.includes('پاداش‌ها: ۴') && fa.includes('افراد: ۴'), 'Persian counts are not in Persian digits');
    assert.ok(fa.includes('سپس این تعداد روز کار می‌کند: ۹۰.'), 'Persian days are not in Persian digits');
    assert.ok(fa.includes('۱۵') && fa.includes('۲۰'), 'Persian percentages are not in Persian digits');
    none(fa, [...ENGLISH_ONLY, ...GAPS], 'the Persian invitation page');
  }
  // ------------------------------------------------------------------ French
  {
    const fr = inner(await page({ cookie: `${cookie}; ayahspring_locale=fr` }));
    for (const sentence of ['Récompenses\u00a0: 4', 'Personnes\u00a0: 4', '>Copier le lien d’invitation</button>', 'Retirée\u00a0: l’achat dont elle provenait a été remboursé', '>Un ami</strong>']) assert.ok(fr.includes(sentence), `French invitation page lost "${sentence}"`);
    assert.match(fr, /Votre ami obtient 15\s%\sde réduction sur son premier cours\./u);
    none(fr, [...ENGLISH_ONLY, ...GAPS], 'the French invitation page');
  }
  // ---------------- a language held for review: English, whole, and marked
  {
    const html = await page({ cookie: `${cookie}; ayahspring_locale=ha` });
    assert.match(html, /<html[^>]*lang="ha"/);
    const ha = inner(html);
    assert.ok(ha.includes('<div class="container section" lang="en" dir="ltr">'), 'the held page is not marked as English');
    assert.ok(ha.includes('<h1>Invite a friend</h1>') && ha.includes('Rewards: 4') && ha.includes('>Copy the invitation link</button>'));
  }
  console.log('Invitation page: signed out is sent to sign in; English says what the code is worth (15%, read off the code, not the 10% setting), four rewards each on its side of its window with its zone, four people with a nameless one as "A friend" and the yearly limit not said about anybody; the switch off mints and asks nothing; a board answered six wrong ways is "could not be read" with no word of the database; a code that could not be minted is said; a worth that could not be read leaves the link and no number; Arabic right to left with the code and link left to right, Persian in its own digits, French, and Hausa in English, marked.');

  // =========================================== the page a friend opens
  {
    // Nobody is signed in: this is a visitor.
    const { html, response } = await read(`/referral/${CODE.toLowerCase()}`, { 'accept-language': 'en' });
    assert.match(html, /<title>An invitation[^<]*<\/title>/);
    assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
    const en2 = inner(html);
    for (const sentence of [
      '<p class="eyebrow">An invitation</p>',
      // A first name, and no more of it.
      '<bdi>Halima</bdi> invited you</h1>',
      'Their code takes 15% off your first course here.',
      'It is a discount on the course, not money, so there is nothing to withdraw.',
      '>Your invitation</h2>',
      `>${CODE}</strong>`,
      `<a class="btn" href="/api/referral/${CODE}">Keep this code and browse</a>`,
      'Use the button and this browser remembers the code and fills it in on the payment page. Days it is remembered: 30. You can also type it there yourself.',
      'AyahSpring teaches the Islamic faith to children and adults, at a pace that fits around a life. Courses are reviewed before they are published, and every teacher is appointed by the platform.',
    ]) assert.ok(en2.includes(sentence), `English invitation landing lost "${sentence}"`);
    none(en2, ['Nakato', 'Probe', ...GAPS, ...DATABASE_WORDS, 'lang="en"'], 'the English invitation landing');
    // Looking leaves nothing behind.
    assert.equal(response.headers.get('set-cookie'), null, 'opening the page set a cookie');
    assert.equal(asked('resolve_referral_code').at(-1).signedIn, false);
    assert.deepEqual(asked('resolve_referral_code').at(-1).sent, { p_code: CODE });

    // No name and no worth: neither is invented.
    state.resolve = 'no_worth';
    const bare = inner(await landing({ 'accept-language': 'en' }));
    assert.ok(bare.includes('>You were invited</h1>'));
    assert.ok(bare.includes('<p class="lede">It is a discount on the course, not money, so there is nothing to withdraw.</p>'));
    none(bare, ['Their code takes', '%'], 'a landing with no worth');
    // A name that is markup is text.
    state.resolve = 'found'; state.name = '<img src=x> Probe';
    assert.ok(inner(await landing({ 'accept-language': 'en' })).includes('<bdi>&lt;img</bdi> invited you</h1>'));
    state.name = 'Halima Nakato Probe';

    // Three ways to fail, said apart.
    const BAD = '<h1>This link does not work</h1><p class="lede">The code in it is mistyped or was never real. Nothing was charged and nothing was signed up for. You are only a visitor on this page.</p>';
    const STILL = '<p class="lede">Nothing was charged, and the courses are still here.</p>';
    state.resolve = 'none';
    const gone = inner(await landing({ 'accept-language': 'en' }));
    assert.ok(gone.includes(BAD) && gone.includes('<a class="btn" href="/catalogue">Browse the courses</a>'));
    state.resolve = 'disabled';
    const closed = inner(await landing({ 'accept-language': 'en' }));
    assert.ok(closed.includes('<h1>Invitations are not open at the moment</h1>') && closed.includes(STILL));
    for (const how of ['timeout', 'gateway', 'no_reply', 'word']) {
      state.resolve = how;
      const html2 = inner(await landing({ 'accept-language': 'en' }));
      assert.ok(html2.includes('<h1>This invitation could not be read just now</h1>') && html2.includes(STILL), how);
      none(html2, [...DATABASE_WORDS, 'not open', 'does not work', 'Keep this code'], `a landing answered ${how}`);
    }
    state.resolve = 'found';
    // A code that is no code is refused without asking anybody, and a stray
    // percent sign is a sentence, not a broken page.
    const before = asked('resolve_referral_code').length;
    for (const bad of ['short', 'AYA%207K2M9Q', '%2525', 'x'.repeat(40), '%25E0%25A4%25A', 'AYA-7K2M9Q%3Cscript%3E']) {
      const html2 = inner(await landing({ 'accept-language': 'en' }, bad));
      assert.ok(html2.includes(BAD), `a bad code ${bad}`);
    }
    assert.equal(asked('resolve_referral_code').length, before, 'a code that is no code reached the database');

    // Arabic by the visitor's device, French by choice, and a held language in English.
    const arabic = await landing({ 'accept-language': 'ar' });
    assert.match(arabic, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
    const ar2 = inner(arabic);
    for (const sentence of ['<p class="eyebrow">دعوة</p>', 'دعوة من <bdi>Halima</bdi></h1>', 'هو خصم على الدورة لا مال، فلا شيء يُسحب.', '>دعوتك</h2>', '>احتفظ بهذا الرمز وتصفّح</a>', 'عدد أيام تذكّره: 30.']) assert.ok(ar2.includes(sentence), `Arabic landing lost "${sentence}"`);
    none(ar2, [...ENGLISH_ONLY, ...GAPS, 'Nakato'], 'the Arabic landing');
    const fr2 = inner(await landing({ cookie: 'ayahspring_locale=fr' }));
    assert.ok(fr2.includes('<bdi>Halima</bdi> vous invite</h1>') && fr2.includes('>Garder ce code et parcourir</a>'));
    const ha2 = inner(await landing({ cookie: 'ayahspring_locale=ha' }));
    assert.ok(ha2.includes('<div class="page narrow" lang="en" dir="ltr">') && ha2.includes('<bdi>Halima</bdi> invited you</h1>'));
    state.resolve = 'none';
    assert.ok(inner(await landing({ 'accept-language': 'ar' })).includes('<h1>هذا الرابط لا يعمل</h1>'));
    state.resolve = 'found';
  }
  console.log('Invitation landing: a visitor is told a first name and 15%, with noindex and no cookie set by looking; no name and no worth are not invented; a wrong code, the switch off and a database that did not answer (four ways) are three different headings; six codes that are no code are refused without asking the database, a stray percent sign included; Arabic, French, and Hausa in English, marked.');

  // ===================================================== keeping the code
  {
    const keep = async (code) => {
      const response = await request(`/api/referral/${code}`);
      return { status: response.status, location: response.headers.get('location'), cookie: response.headers.get('set-cookie'), cache: response.headers.get('cache-control') };
    };
    const kept = await keep(CODE.toLowerCase());
    assert.equal(kept.status, 303);
    // A path on the host the visitor is on: never another host.
    assert.equal(kept.location, '/catalogue', `sent to ${kept.location}`);
    assert.equal(kept.cache, 'no-store');
    assert.match(kept.cookie ?? '', new RegExp(`^ayahspring_referral=${CODE};`));
    for (const part of ['Path=/', 'Max-Age=2592000', 'HttpOnly', 'SameSite=lax']) assert.ok((kept.cookie ?? '').toLowerCase().includes(part.toLowerCase()), `the cookie lost ${part}: ${kept.cookie}`);
    // Nothing is remembered unless the code was found.
    for (const how of ['none', 'disabled', 'timeout', 'gateway', 'no_reply', 'word']) {
      state.resolve = how;
      const answer = await keep(CODE);
      assert.equal(answer.status, 303, how); assert.equal(answer.location, '/catalogue', how); assert.equal(answer.cookie, null, `${how} left a cookie`);
    }
    state.resolve = 'found';
    const before = asked('resolve_referral_code').length;
    for (const bad of ['short', '%2525', '%25E0%25A4%25A', 'x'.repeat(40)]) {
      const answer = await keep(bad);
      assert.equal(answer.status, 303, bad); assert.equal(answer.location, '/catalogue', bad); assert.equal(answer.cookie, null, `${bad} left a cookie`);
    }
    assert.equal(asked('resolve_referral_code').length, before, 'a code that is no code reached the database');
  }

  // ============================================== the route a screen may ask
  {
    const ask = async (method, headers = { cookie }) => {
      const response = await request('/api/account/referrals', headers, method);
      const text = await response.text();
      let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
      return { status: response.status, text, json, cache: response.headers.get('cache-control') };
    };
    const clean = (answer, label) => { none(answer.text, DATABASE_WORDS, label); assert.equal(answer.cache, 'no-store', `${label} may be kept`); };
    for (const method of ['GET', 'POST']) {
      const out = await ask(method, {});
      assert.equal(out.status, 401, method); assert.equal(out.json.code, 'signed_out'); clean(out, `signed out ${method}`);
    }
    const board = await ask('GET');
    assert.equal(board.status, 200, board.text); assert.equal(board.json.ok, true); assert.equal(board.json.board.code, CODE); assert.equal(board.json.board.rewards.length, 4);
    // The board is data, and a state in it is passed on as the database wrote it; no sentence is.
    none(board.text, DATABASE_WORDS.filter((w) => w !== 'SYNTHETIC'), 'a board'); assert.equal(board.cache, 'no-store');
    const minted = await ask('POST');
    assert.deepEqual(minted.json, { ok: true, code: CODE }); clean(minted, 'a code');
    const NAMED = [
      ['GET', 'board', 'signed_out_board', 401, 'signed_out'], ['GET', 'board', 'off', 409, 'off'],
      ['GET', 'board', 'timeout', 502, 'failed'], ['GET', 'board', 'gateway', 502, 'failed'], ['GET', 'board', 'no_reply', 502, 'failed'], ['GET', 'board', 'word', 502, 'failed'],
      ['POST', 'mint', 'signed_out_mint', 401, 'signed_out'], ['POST', 'mint', 'off', 409, 'off'], ['POST', 'mint', 'not_a_discount', 502, 'failed'],
      ['POST', 'mint', 'timeout', 502, 'failed'], ['POST', 'mint', 'gateway', 502, 'failed'], ['POST', 'mint', 'no_reply', 502, 'failed'], ['POST', 'mint', 'word', 502, 'failed'],
    ];
    for (const [method, what, how, status, code] of NAMED) {
      state[what] = how;
      const got = await ask(method);
      const label = `${how} to ${method}`;
      assert.equal(got.status, status, `${label}: ${got.text}`);
      assert.equal(got.json.ok, false); assert.equal(got.json.code, code, label);
      assert.deepEqual(Object.keys(got.json).sort(), ['code', 'message', 'ok'], label);
      clean(got, label);
      state[what] = 'ok';
    }
  }
  console.log('Invitation routes: keeping a found code is 303 to the path /catalogue with an HttpOnly, lax, thirty-day cookie and no-store; six answers that are not "found" and four codes that are no code leave no cookie, the four without asking the database. The board route: signed out 401, a board, a code, and thirteen database answers each under its name (401 signed_out, 409 off, 502 failed), with no sentence of the database in any answer and every answer no-store.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (code, width, path = '/account/referrals', { signedIn = true, clipboard = 'real' } = {}) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', deviceScaleFactor: process.env.RESPONSIVE_SCREENSHOTS ? 2 : 1 });
      await context.addCookies([
        ...(signedIn ? [{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }] : []),
        { name: 'ayahspring_locale', value: code, url: origin },
      ]);
      // A clipboard the test can read back, or one that says no, in place of
      // the browser's own: a headless browser's permission prompt proves nothing.
      await context.addInitScript((kind) => {
        const store = { text: null };
        Object.defineProperty(window, '__copied', { get: () => store.text });
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: (text) => (kind === 'refuses' ? Promise.reject(new DOMException('SYNTHETIC denied', 'NotAllowedError')) : ((store.text = text), Promise.resolve())) },
        });
      }, clipboard);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      tab.on('console', (m) => { if (m.type() === 'error' && /hydrat/i.test(m.text())) errors.push(m.text()); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
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
    const LINK = `${origin}/referral/${CODE}`;

    for (const [code, heading] of [['en', 'Invite a friend'], ['ar', 'ادعُ صديقًا'], ['ta', null], ['fil', null]]) {
      for (const width of [320, 390, 1440]) {
        const { context, tab, errors } = await open(code, width);
        if (heading) await tab.getByRole('heading', { level: 1, name: heading, exact: true }).waitFor();
        else await tab.locator('main h1').waitFor();
        // With no site address set, the link is the browser's own address, not a bare path.
        await tab.waitForFunction((want) => document.querySelector('[data-referral-link]')?.textContent === want, LINK);
        await fits(tab, width, `invitation ${code} ${width}`);
        assert.equal(await tab.locator('[data-referral-link]').evaluate((el) => getComputedStyle(el).direction), 'ltr');
        assert.equal(await tab.locator('[data-referral-code]').evaluate((el) => getComputedStyle(el).direction), 'ltr');
        assert.deepEqual(errors, [], `invitation ${code} ${width}: ${errors.join(' | ')}`);
        if ([390, 1440].includes(width)) await shot(tab, `referrals-${code}-${width}`);
        await context.close();
      }
      console.log(`Synthetic invitation page in ${code}: fits at 320, 390 and 1440px; the link is the browser's own address; no hydration error`);
    }

    {
      // English: what is copied.
      const { context, tab, errors } = await open('en', 390);
      const status = tab.locator('main').getByRole('status');
      await tab.waitForFunction((want) => document.querySelector('[data-referral-link]')?.textContent === want, LINK);
      assert.equal((await status.innerText()).trim(), '');
      await tab.getByRole('button', { name: 'Copy the invitation link', exact: true }).click();
      await tab.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent === 'Link copied');
      assert.equal(await tab.evaluate(() => window.__copied), LINK);
      await tab.getByRole('button', { name: 'Copy a message', exact: true }).click();
      await tab.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent === 'Message copied');
      // A first name, the code's own worth, and the link last.
      assert.equal(await tab.evaluate(() => window.__copied), `Halima invited you to AyahSpring. 15% off your first course: ${LINK}`);
      assert.deepEqual(errors, []);
      await context.close();

      // Arabic: the message in Arabic, and a clipboard that says no.
      const arabic = await open('ar', 390);
      await arabic.tab.waitForFunction((want) => document.querySelector('[data-referral-link]')?.textContent === want, LINK);
      await arabic.tab.getByRole('button', { name: 'انسخ رسالة', exact: true }).click();
      await arabic.tab.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent === 'تم نسخ الرسالة');
      const copied = await arabic.tab.evaluate(() => window.__copied);
      assert.ok(copied.startsWith('دعوة من Halima إلى AyahSpring. خصم ') && copied.endsWith(`على دورتك الأولى: ${LINK}`), copied);
      await arabic.context.close();
      const refused = await open('ar', 390, '/account/referrals', { clipboard: 'refuses' });
      await refused.tab.getByRole('button', { name: 'انسخ رابط الدعوة', exact: true }).click();
      await refused.tab.waitForFunction(() => document.querySelector('main [role="status"]')?.textContent === 'لم يسمح هذا المتصفح بالنسخ. الرابط مكتوب في الأسفل ويمكن تحديده يدويًا.');
      assert.equal(await refused.tab.evaluate(() => window.__copied), null);
      await fits(refused.tab, 390, 'invitation ar 390 after a refusal');
      await shot(refused.tab, 'referrals-ar-390-refused');
      assert.deepEqual(refused.errors, []);
      await refused.context.close();
      console.log('Synthetic invitation page: the link copied is the full address; the message copied carries a first name, 15% and the link last, in English and in Arabic; a clipboard that says no is said in Arabic, and nothing is claimed copied.');
    }

    {
      // The page a friend opens: a visitor, a phone, then the button.
      for (const [code, width] of [['en', 320], ['ar', 390], ['fr', 1440], ['ta', 320]]) {
        const { context, tab, errors } = await open(code, width, `/referral/${CODE}`, { signedIn: false });
        await tab.locator('main h1').waitFor();
        await fits(tab, width, `landing ${code} ${width}`);
        assert.deepEqual(errors, [], `landing ${code} ${width}: ${errors.join(' | ')}`);
        // Looking has left nothing behind.
        assert.equal((await context.cookies(origin)).filter((c) => c.name === 'ayahspring_referral').length, 0, `landing ${code}: a cookie before the button`);
        await shot(tab, `landing-${code}-${width}`);
        if (code === 'ar') {
          await tab.getByRole('link', { name: 'احتفظ بهذا الرمز وتصفّح', exact: true }).click();
          await tab.waitForURL(`${origin}/catalogue`);
          const kept = (await context.cookies(origin)).find((c) => c.name === 'ayahspring_referral');
          assert.equal(kept?.value, CODE); assert.equal(kept?.httpOnly, true);
        }
        await context.close();
      }
      console.log('Synthetic invitation landing: fits in English and Tamil at 320px, Arabic at 390px and French at 1440px with no cookie left by looking; the button in Arabic lands on the catalogue of the same host with the code kept.');
    }
  }
  console.log('Invitation HTTP smoke passed. Not real Auth, RLS, a purchase or a discount: the stand-in mints nothing, and the switch is off in the product.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
