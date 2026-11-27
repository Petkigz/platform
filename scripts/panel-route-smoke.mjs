// The real Next /panel page against an entirely synthetic loopback Auth/REST
// API. This is not evidence about hosted Supabase, RLS, or what
// `my_panel_work()` and `cast_panel_vote()` do: the stand-in answers whatever
// it is asked, no board sat and no vote was counted.
//
// What it does show (written 2026-11-27, when the page was put into the
// reader's language): the page in English and in Arabic, and in English in a
// marked frame for a language held for review; that a board's name, a
// course's title and what a board decided keep their own direction; that a
// person who sits on no board is told so; that work which could not be read
// is said to be unread rather than thrown; and, with a browser, that each
// refusal of a vote is said in the reader's language by its name, that an
// answer nobody could read is not called a refusal, and that a vote which
// was recorded shows on the page. The expected sentences are typed here
// rather than imported, so this fails if a catalogue changes without
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

const LONG = 'Synthetic0123456789012345678901234567890123456789012345';
const work = () => ({
  panelMember: true,
  panels: [
    { id: 'p1', name: 'مجلس الفقه', status: 'active', quorum: 3, memberRole: 'chair' },
    { id: 'p2', name: `Tafsir board ${LONG}`, status: 'inactive', quorum: 2, memberRole: 'member' },
  ],
  cases: [
    { id: 'c1', panelName: 'مجلس الفقه', quorum: 3, openedAt: '2026-11-20T08:00:00Z', versionNumber: 2, courseTitle: 'أحكام الطهارة', cast: 1, myVote: null, tally: null },
    { id: 'c2', panelName: 'مجلس الفقه', quorum: 3, openedAt: '2026-11-21T08:00:00Z', versionNumber: 1, courseTitle: `Reading fluently ${LONG}`, cast: 3, myVote: 'approve', tally: { approve: 2, reject: 1, abstain: 0, cast: 3 } },
  ],
  decided: [
    { id: 'd1', outcome: 'approved', closedAt: '2026-11-10T08:00:00Z', outcomeSummary: 'موافَق عليها بشرط تعديل الدرس الثالث.', courseTitle: 'Tajwid basics', myVote: 'abstain' },
    // An outcome this page has no word for, and a case the member never voted on.
    { id: 'd2', outcome: 'synthetic_outcome', closedAt: '2026-11-09T08:00:00Z', outcomeSummary: null, courseTitle: 'Old course', myVote: null },
  ],
});
const NOT_MEMBER = { panelMember: false, panels: [], cases: [], decided: [] };
// The database's own words. None of these may reach a reader.
const DATABASE_WORDS = ['panel:', 'SYNTHETIC', 'synthetic_outcome', 'already_voted', 'permission denied'];
const REFUSALS = {
  already: [409, { code: '23505', message: 'panel:already_voted' }],
  decided: [400, { code: '23514', message: 'panel:already_decided' }],
  notConvened: [400, { code: '23514', message: 'panel:not_convened' }],
  notMember: [403, { code: '42501', message: 'panel:not_a_member' }],
  signedOut: [403, { code: '42501', message: 'panel:not_signed_in' }],
  invalid: [400, { code: '23514', message: 'panel:vote_invalid' }],
  denied: [403, { code: '42501', message: 'SYNTHETIC permission denied' }],
};

const state = {
  // What `my_panel_work()` answers: 'member', 'notMember' or 'broken'.
  work: 'member', rows: work(),
  // What `cast_panel_vote()` does: 'ok', a key of REFUSALS, or 'gateway'.
  vote: 'ok',
};
const calls = [];
const fake = createServer(async (req, res) => {
  // The vote is cast from the browser, from another origin.
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(401); res.end('{}'); return; }
  const signedIn = req.headers.authorization === `Bearer ${token}`;
  const path = new URL(req.url, 'http://localhost').pathname;
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, signedIn });
  const send = (value) => res.end(JSON.stringify(value));
  if (path === '/rest/v1/rpc/my_panel_work') {
    if (state.work === 'broken') { res.writeHead(500); return send({ code: 'XX000', message: 'SYNTHETIC failure', details: null, hint: null }); }
    return send(state.work === 'member' ? state.rows : NOT_MEMBER);
  }
  if (path === '/rest/v1/rpc/cast_panel_vote') {
    if (state.vote === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); return res.end('<html>SYNTHETIC gateway</html>'); }
    if (state.vote !== 'ok') { const [status, error] = REFUSALS[state.vote]; res.writeHead(status); return send({ ...error, details: null, hint: null }); }
    const row = state.rows.cases.find((c) => c.id === payload?.p_case_id);
    row.myVote = payload.p_vote; row.cast += 1;
    row.tally = { approve: 0, reject: 0, abstain: 0, cast: row.cast, [payload.p_vote]: 1 };
    return send({ ok: true });
  }
  if (path === '/rest/v1/user_profiles') return send(signedIn ? [{ display_name: 'Synthetic scholar', account_status: 'active', deleted_at: null, preferred_language: 'en', timezone: null }] : []);
  if (path === '/rest/v1/rpc/notification_badge') return send(0);
  if (path.startsWith('/rest/v1/rpc/')) return send(false);
  return send([]);
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
  const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  // The page itself: what is inside <main>, without the scripts Next adds.
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('&#x27;', '’').replaceAll('<!-- -->', '');
  const page = async (path, headers) => { const response = await request(path, headers); assert.equal(response.status, 200, `${path}\n${logs.slice(-2000)}`); return response.text(); };
  const has = (html, sentences, label) => { for (const s of sentences) assert.ok(html.includes(s), `${label} lacks "${s}"\n${html.slice(0, 3000)}`); };
  const lacks = (html, sentences, label) => { for (const s of sentences) assert.ok(!html.includes(s), `${label} says "${s}"`); };

  const ENGLISH = ['Scholarly panel', 'My learning', 'You do not sit', 'Your panels', 'Chair', 'Convened', 'Quorum', 'Waiting for you', 'Version', 'Votes cast', 'Your vote', 'cannot be undone', 'Cast my vote', 'Decided, and', 'Approved', 'Reviews assigned', 'could not be read'];
  // Arabic's digits are whatever this Node gives the page; Persian's are pinned below.
  const AR_DIGIT = (d) => new Intl.NumberFormat('ar').format(Number(d));
  const worked = () => calls.filter((c) => c.path === '/rest/v1/rpc/my_panel_work');

  // Signed out: to the sign-in page, and the database is not asked.
  let response = await request('/panel', { 'accept-language': 'en' });
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), '/sign-in?next=/panel');
  assert.equal(worked().length, 0);

  // ------------------------------------------------------------- a member
  let full = await page('/panel', { cookie, 'accept-language': 'en' });
  let en = inner(full);
  has(en, [
    '<div class="container section panel-page">', '<p class="eyebrow"><a href="/learn">My learning</a></p>', '<h1>Scholarly panel</h1>',
    '<p class="lede">The cases waiting for a decision from a panel you sit on. One vote each, and a vote is not changed afterwards. How the other members voted is shown once you have voted, so that nobody is led by the first name in the list.</p>',
    '<h2>Your panels</h2>', '<li class="card" data-panel="active"><strong dir="auto">مجلس الفقه</strong><span class="muted panel-facts"><span>Chair</span><span>Convened</span><span>Quorum: 3</span></span></li>',
    `<li class="card" data-panel="inactive"><strong dir="auto">Tafsir board ${LONG}</strong><span class="muted panel-facts"><span>Member</span><span>Not convened</span><span>Quorum: 2</span></span><p class="muted">This panel is not convened, so nothing can be decided here until the owner convenes it. That is the rule, not a fault.</p></li>`,
    '<h2>Waiting for you</h2>', '<li class="card" data-panel-case="open"><h3 dir="auto">أحكام الطهارة</h3><p class="muted panel-facts"><span>Version 2</span><bdi>مجلس الفقه</bdi></p><p class="muted">Waiting on quorum. Votes cast: 1. Needed: 3</p><form class="panel-vote" data-panel-vote="true"><p class="muted">A vote cannot be undone.</p><fieldset><legend>Your vote</legend>',
    '<span>Approve</span>', '<span>Reject</span>', '<span>Abstain</span>', '<label for="rationale-c1">Why, in a sentence (optional, kept with the case)</label>', '<button type="submit" class="btn">Cast my vote</button>',
    `<li class="card" data-panel-case="voted"><h3 dir="auto">Reading fluently ${LONG}</h3>`, '<p class="muted">Quorum met. Votes cast: 3. Needed: 3</p><p><strong>Your vote: Approve</strong></p><p class="muted">The votes so far. Approve: 2. Reject: 1. Abstain: 0</p><p class="muted">The chair, the governance team or the owner records the decision once the panel has finished.</p></li>',
    '<h2>Decided, and how you voted</h2>', '<li class="card" data-panel-decided="approved"><strong dir="auto">Tajwid basics</strong><span class="muted panel-facts"><span>Approved</span><span>Your vote: Abstain</span></span><p class="muted" dir="auto">موافَق عليها بشرط تعديل الدرس الثالث.</p></li>',
    // An outcome with no word here is given none, and "never voted" is not "abstained".
    '<li class="card" data-panel-decided="synthetic_outcome"><strong dir="auto">Old course</strong><span class="muted panel-facts"><span>Your vote: Not voted</span></span></li>',
    '<a href="/review">Reviews assigned to you</a>', '<a href="/learn">Back to my learning</a>',
  ], 'English panel page');
  lacks(en, ['data-panel-state', 'The reviewer register', '>synthetic_outcome<'], 'English panel page');
  assert.equal(en.split('data-panel-vote').length - 1, 1, 'a vote is offered on a case already voted on');
  assert.match(htmlRoot(full), /lang="en"/);
  assert.ok(full.includes('<title>Scholarly panel'), 'the tab is not named');

  full = await page('/panel', { cookie, 'accept-language': 'ar' });
  const ar = inner(full);
  assert.match(htmlRoot(full), /lang="ar"/); assert.match(htmlRoot(full), /dir="rtl"/);
  has(ar, [
    '<div class="container section panel-page">', '<a href="/learn">تعلّمي</a>', '<h1>الهيئة العلمية</h1>', '<h2>هيئاتك</h2>',
    '<strong dir="auto">مجلس الفقه</strong><span class="muted panel-facts"><span>رئيس</span><span>منعقدة</span><span>النصاب: AR3</span></span>',
    `<strong dir="auto">Tafsir board ${LONG}</strong><span class="muted panel-facts"><span>عضو</span><span>غير منعقدة</span><span>النصاب: AR2</span></span><p class="muted">هذه الهيئة غير منعقدة، فلا يُقرَّر هنا شيء حتى يعقدها المالك. هذه هي القاعدة وليست خللًا.</p>`,
    '<h2>بانتظارك</h2>', '<span>الإصدار AR2</span><bdi>مجلس الفقه</bdi>', 'بانتظار اكتمال النصاب. الأصوات المدلى بها: AR1. المطلوب: AR3',
    '<p class="muted">لا يمكن التراجع عن الصوت.</p><fieldset><legend>صوتك</legend>', '<span>موافقة</span>', '<span>رفض</span>', '<span>امتناع</span>',
    '<label for="rationale-c1">السبب في جملة (اختياري، ويُحفظ مع القضية)</label>', '<button type="submit" class="btn">أدلِ بصوتي</button>',
    'اكتمل النصاب. الأصوات المدلى بها: AR3. المطلوب: AR3', '<strong>صوتك: موافقة</strong>', 'الأصوات حتى الآن. موافقة: AR2. رفض: AR1. امتناع: AR0',
    'يسجّل القرارَ رئيسُ الهيئة أو فريق الحوكمة أو المالك بعد أن تنتهي الهيئة.', '<h2>ما تقرّر، وكيف صوّتَّ</h2>',
    '<span>تمت الموافقة</span><span>صوتك: امتناع</span>', '<span>صوتك: لم تصوّت</span>',
    '<a href="/review">المراجعات المسندة إليك</a>', '<a href="/learn">العودة إلى تعلّمي</a>',
  ].map((s) => s.replace(/AR(\d)/g, (_, d) => AR_DIGIT(d))), 'Arabic panel page');
  lacks(ar, ENGLISH, 'Arabic panel page');
  assert.ok(full.includes('<title>الهيئة العلمية'), 'the tab is not named in Arabic');

  // Counts are in the reader's digits.
  const fa = inner(await page('/panel', { cookie, 'accept-language': 'fa' }));
  has(fa, ['<span>حد نصاب: ۳</span>', '<span>نسخهٔ ۲</span>', 'رأی‌ها تا اینجا. موافق: ۲. مخالف: ۱. ممتنع: ۰', 'در انتظار حد نصاب. رأی‌های داده‌شده: ۱. لازم: ۳'], 'Persian panel page');
  lacks(fa, ENGLISH, 'Persian panel page');
  const uz = inner(await page('/panel', { cookie, 'accept-language': 'uz' }));
  has(uz, ['<h1>Ilmiy kengash</h1>', '<span>2-versiya</span>', '<span>Aʼzo</span>', 'Hozirgacha berilgan ovozlar. Yoqlab: 2. Qarshi: 1. Betaraf: 0'], 'Uzbek panel page');

  has(inner(await page('/panel', { cookie, 'accept-language': 'ha' })), ['<div class="container section panel-page" lang="en" dir="ltr">', '<h1>Scholarly panel</h1>'], 'held-language panel page');

  // ------------------------------------------------- somebody on no board
  state.work = 'notMember';
  en = inner(await page('/panel', { cookie, 'accept-language': 'en' }));
  has(en, [
    '<div class="notice" data-panel-state="not-member"><strong>You do not sit on a scholarly panel.</strong> Panels decide questions about a course that one reviewer should not settle alone: how a ruling is presented, what a course claims, whether something is taught at all.</div>',
    '<p class="muted">Two things have to be true before a seat means anything: the owner appoints you to the panel, and the platform checks your qualifications. Applying to review is the way in.</p>',
    '<a href="/review">The reviewer register</a>', '<a href="/learn">Back to my learning</a>',
  ], 'English page for somebody on no board');
  lacks(en, ['Your panels', 'data-panel-vote', 'Reviews assigned to you'], 'English page for somebody on no board');
  const sw = inner(await page('/panel', { cookie, 'accept-language': 'sw' }));
  has(sw, ['<strong>Wewe si mjumbe wa bodi yoyote ya wanazuoni.</strong> Bodi huamua maswali kuhusu kozi', '<a href="/review">Rejista ya wakaguzi</a>', '<a href="/learn">Rudi kwenye masomo yangu</a>'], 'Swahili page for somebody on no board');
  lacks(sw, ENGLISH, 'Swahili page for somebody on no board');

  // --------------------------------------- work that could not be read
  state.work = 'broken';
  const fr = inner(await page('/panel', { cookie, 'accept-language': 'fr' }));
  has(fr, ['<h1>Conseil savant</h1>', '<div class="notice error" role="alert" data-panel-state="unread">Vos conseils n’ont pas pu être lus pour l’instant. Réessayez dans un instant.</div>', '<a href="/learn">Retour à mon apprentissage</a>'], 'French panel page, unread');
  // Not "you do not sit on a board": nobody knows that.
  lacks(fr, ['Vous ne siégez', 'data-panel-state="not-member"', 'SYNTHETIC', 'href="/review"'], 'French panel page, unread');
  state.work = 'member';
  console.log('Panel page: signed out goes to sign-in with the database not asked; English and Arabic each whole; counts in Persian digits; a held language is given English in a marked frame; somebody on no board is told so in English and Swahili; work that could not be read is said to be unread in French, not "you do not sit on a board".');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (code, width, a11y) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
        ...(a11y ? [{ name: 'ayahspring_a11y', value: a11y, url: origin }] : []),
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      const sent = []; tab.on('request', (r) => { if (r.url().endsWith('/rest/v1/rpc/cast_panel_vote') && r.method() === 'POST') sent.push(r.postDataJSON()); });
      await tab.goto(`${origin}/panel`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      // Name what sticks out, so the failure says where to look.
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 30)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: the page scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => (el.textContent ?? '').slice(0, 40)));
      assert.deepEqual(spill, [], `${label}: a card's contents are wider than the card`);
    };
    const SIZES = [[320, null], [320, 'v1.larger.normal.system.dyslexic'], [390, null], [1440, null]];
    for (const [code, heading, castWord] of [['en', 'Scholarly panel', 'Cast my vote'], ['ar', 'الهيئة العلمية', 'أدلِ بصوتي'], ['fr', 'Conseil savant', 'Enregistrer mon vote'], ['ta', 'அறிஞர் குழு', 'என் வாக்கை அளி']]) {
      for (const [width, a11y] of SIZES) {
        const label = `${code} ${width}${a11y ? ' largest text and the dyslexia font' : ''}`;
        const { context, tab, errors } = await open(code, width, a11y);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${label}: heading`);
        assert.equal(await tab.getByRole('button', { name: castWord, exact: true }).count(), 1, `${label}: the vote`);
        await fits(tab, width, `${label} /panel`);
        // A vote's word is on one line: a radio button given the row's width once left it a sliver.
        const broken = await tab.evaluate(() => [...document.querySelectorAll('[data-panel-vote] fieldset label span')].filter((el) => el.getClientRects().length > 1).map((el) => el.textContent));
        assert.deepEqual(broken, [], `${label}: a vote's word is broken across lines`);
        // A refusal under the vote must fit too.
        state.vote = 'already';
        await tab.getByRole('button', { name: castWord, exact: true }).click();
        await tab.locator('[data-panel-vote]').getByRole('alert').waitFor();
        await fits(tab, width, `${label} /panel with a refusal`);
        state.vote = 'ok';
        assert.deepEqual(errors, [], `${label}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && width !== 1440) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/panel-${code}-${width}${a11y ? '-dys' : ''}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic panel page in ${code}: fits at 320, 390 and 1440px, and at 320px with the largest text and the dyslexia font, with a refusal under the vote too.`);
    }

    // ------------------------------------------------------ the vote, in Arabic
    {
      const { context, tab, errors, sent } = await open('ar', 390, null);
      const form = tab.locator('[data-panel-vote]');
      const cast = form.getByRole('button', { name: 'أدلِ بصوتي', exact: true });
      const why = tab.locator('#rationale-c1');
      const text = async () => (await tab.locator('main').innerText());
      const said = async (sentence, label) => {
        await form.getByRole('alert').filter({ hasText: sentence }).waitFor();
        assert.equal(await form.getByRole('alert').count(), 1, `${label}: two notices`);
        const seen = await text(); for (const words of DATABASE_WORDS) assert.ok(!seen.includes(words), `${label}: the page says "${words}"`);
      };
      assert.equal(await form.getByRole('radio').count(), 3);
      assert.equal(await form.getByRole('radio', { name: 'موافقة', exact: true }).isChecked(), true);

      // Each refusal by its name. Nothing typed is sent as nothing, not as an empty string.
      for (const [kind, sentence] of [
        ['already', 'سبق أن صوّتَّ في هذه القضية. لكل عضو صوت واحد، ولا يُغيَّر الصوت بعد ذلك.'],
        ['decided', 'هذه القضية حُسمت من قبل.'],
        ['notConvened', 'هذه الهيئة غير منعقدة، فلا يُقرَّر هنا شيء حتى يعقدها المالك. هذه هي القاعدة وليست خللًا.'],
        ['notMember', 'لا يصوّت في القضية إلا عضو في الهيئة التي تنظر فيها.'],
        ['signedOut', 'سجّل الدخول من جديد لتصوّت.'],
        ['invalid', 'لم يُسجَّل الصوت. أعد تحميل الصفحة لترى أين وصلت القضية.'],
        ['denied', 'لم يُسجَّل الصوت. أعد تحميل الصفحة لترى أين وصلت القضية.'],
      ]) {
        state.vote = kind;
        await cast.click();
        await said(sentence, kind);
        assert.deepEqual(sent.at(-1), { p_case_id: 'c1', p_vote: 'approve', p_rationale: null }, kind);
        assert.equal(await form.count(), 1, `${kind}: the vote went away after a refusal`);
      }
      // Not refusals: nobody can say what happened, and the page does not say "not recorded".
      const UNSURE = 'لا أحد يستطيع أن يقول هل سُجّل الصوت. أعد تحميل الصفحة وانظر إلى القضية قبل أن تصوّت من جديد.';
      await why.fill('  الدرس الثالث يحتاج إلى مراجعة  ');
      await form.getByRole('radio', { name: 'رفض', exact: true }).check();
      state.vote = 'gateway';
      await cast.click();
      await said(UNSURE, 'a gateway’s page');
      assert.ok(!(await text()).includes('لم يُسجَّل الصوت'), 'a gateway’s page was called a refusal');
      await tab.route('**/rest/v1/rpc/cast_panel_vote', (route) => route.abort());
      await cast.click();
      await said(UNSURE, 'a lost connection');
      await tab.unroute('**/rest/v1/rpc/cast_panel_vote');
      // What was chosen and typed is still there.
      assert.equal(await form.getByRole('radio', { name: 'رفض', exact: true }).isChecked(), true);
      assert.equal(await why.inputValue(), '  الدرس الثالث يحتاج إلى مراجعة  ');

      // Recorded: the page is read again, and shows the vote where the form was.
      state.vote = 'ok';
      await cast.click();
      await tab.locator('[data-panel-case="voted"]').filter({ hasText: 'أحكام الطهارة' }).waitFor();
      assert.deepEqual(sent.at(-1), { p_case_id: 'c1', p_vote: 'reject', p_rationale: '  الدرس الثالث يحتاج إلى مراجعة  ' });
      assert.equal(await tab.locator('[data-panel-vote]').count(), 0, 'a vote is still offered after one was recorded');
      const voted = await tab.locator('[data-panel-case="voted"]').filter({ hasText: 'أحكام الطهارة' }).innerText();
      assert.ok(voted.includes('صوتك: رفض'), voted);
      assert.equal(await tab.locator('main').getByRole('alert').count(), 0, 'a refusal is still shown after the vote was recorded');
      assert.deepEqual(errors, []);
      await context.close();
      state.rows = work();
      console.log('Synthetic vote in Arabic: already voted, already decided, not convened, not a member, signed out and two refusals with no sentence of their own each said in Arabic by name, with none of the database’s words; a gateway’s page and a lost connection each said as "nobody can say", with the choice and the reason kept; a recorded vote shown where the form was.');
    }
  }
  console.log('Panel HTTP smoke passed. Not real Auth, RLS, `my_panel_work()` or `cast_panel_vote()`; no board sat and no vote was counted, and no speaker has read the translations.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
