// The real Next /admin page against an entirely synthetic loopback Auth/REST
// API. This is not evidence about hosted Supabase, RLS, `is_privileged()`,
// `has_role()` or what `staff_attention()` counts: the stand-in answers
// whatever it is asked, and nobody here is staff of anything.
//
// What it does show (written 2026-11-28, when the top of the page was put
// into the reader's language): who is sent away before the queues are asked
// for; the page in English and in Arabic for the owner and for a support
// agent; counts in the reader's digits; that a queue is named by its code and
// one the page has no words for keeps the database's English, marked as
// English; that the sentence beside each link and the owner's switchboard are
// still English and are marked so; that a language held for review is
// given English in a marked frame; and, with a browser, that the page does
// not scroll sideways at three widths and that in Arabic the English
// sentence beside a link is drawn after the link. The expected sentences are typed here
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

const queue = (code, label, count, href, detail, feature = null, dormant = false) => ({ code, label, count, href, detail, feature, dormant });
const OWNER_QUEUES = [
  queue('refunds', 'Refund requests', 3, '/admin/refunds', 'Money waiting to go back to a customer.'),
  queue('payouts', 'Teacher payouts', 1234, '/admin/payouts', 'A teacher has asked to be paid. Recording one is not sending one.', 'teaching.payouts', true),
  queue('support', 'Support cases', 0, '/admin/support', 'Open or assigned, and not yet resolved.', 'platform.support', true),
  queue('appeals', 'Governance appeals', 0, '/admin/appeals', 'Somebody is contesting a decision, and silence is itself a decision.'),
  // A queue a later migration added, which the page has no words for.
  queue('synthetic_queue', 'SYNTHETIC queue label', 2, '/admin/reports', 'SYNTHETIC queue sentence.'),
];
const SUPPORT_QUEUES = [
  queue('support', 'Support cases', 0, '/admin/support', 'Open or assigned, and not yet resolved.'),
  queue('reports', 'Reported content', 0, '/admin/reports', 'A reader flagged something. Closing one needs a written note.'),
];
const FLAG = { key: 'synthetic.flag', description: 'SYNTHETIC flag description', value_type: 'boolean', value_text: 'false', gate_type: 'admin', preconditions: 'SYNTHETIC precondition', flag_group: 'Synthetic group', updated_at: null };
// Rows shaped like the register's longest: a key of 33 letters with no place
// to break, a precondition of several lines, and each of the three gates.
// The short one above fitted a 320 pixel screen in one font and stuck out of
// it in another (CI, 2026-11-28), so the drawn check uses these.
const LONG_FLAGS = [
  FLAG,
  { ...FLAG, key: 'companion.calculated_prayer_times', gate_type: 'admin_setup', preconditions: 'SYNTHETIC precondition that runs to several lines: the outside account has to exist, its secret has to be set, and somebody has to have tried it once.' },
  { ...FLAG, key: 'family.child_password_recovery', gate_type: 'code', preconditions: 'SYNTHETIC precondition for a flag that needs a deploy.' },
  { ...FLAG, key: 'family.guardian_verification', value_text: 'true', gate_type: 'admin_setup', preconditions: null },
];
const state = {
  flags: [FLAG],
  // Who is asking: 'owner', 'support' or 'learner'.
  who: 'owner',
  // How much of a platform there is: counts of subjects, courses, published versions, reviewers.
  facts: { subject_areas: 0, courses: 0, course_versions: 0, reviewer_profiles: 0 },
};
const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(401); res.end('{}'); return; }
  const signedIn = req.headers.authorization === `Bearer ${token}`;
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, signedIn });
  const send = (value) => res.end(JSON.stringify(value));
  const table = path.slice('/rest/v1/'.length);
  if (path === '/rest/v1/rpc/is_privileged') return send(state.who !== 'learner');
  if (path === '/rest/v1/rpc/has_role') return send(state.who === 'owner' && payload?.p_role_code === 'platform_admin');
  if (path === '/rest/v1/rpc/staff_attention') {
    const owner = state.who === 'owner';
    const queues = owner ? OWNER_QUEUES : SUPPORT_QUEUES;
    return send({ generatedAt: '2026-11-28T08:00:00Z', waitingCount: queues.reduce((sum, q) => sum + q.count, 0), queues, canSeeFinance: owner, canSeeGovernance: owner, canSeeSupport: true });
  }
  if (path === '/rest/v1/rpc/translation_month') { res.writeHead(500); return send({ code: 'XX000', message: 'SYNTHETIC failure', details: null, hint: null }); }
  if (Object.hasOwn(state.facts, table)) {
    res.setHeader('content-range', `*/${state.facts[table]}`);
    return req.method === 'HEAD' ? res.end() : send([]);
  }
  if (path === '/rest/v1/platform_settings') {
    return send(url.searchParams.get('key') ? [{ value_text: '30' }] : state.flags);
  }
  if (path === '/rest/v1/user_profiles') return send(signedIn ? [{ display_name: 'Synthetic staff', account_status: 'active', deleted_at: null, preferred_language: 'en', timezone: null }] : []);
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

  const asked = () => calls.filter((c) => c.path === '/rest/v1/rpc/staff_attention').length;
  const AR = (d) => new Intl.NumberFormat('ar').format(Number(d));
  // The database's own words for a queue the page names itself. None may reach a reader in another language.
  const DATABASE_ENGLISH = ['Refund requests', 'Money waiting to go back', 'Teacher payouts', 'Support cases', 'Governance appeals', 'Recording one is not sending one'];

  // Signed out: to the sign-in page, and nothing is asked of the database.
  let response = await request('/admin', { 'accept-language': 'en' });
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), '/sign-in?next=/admin');
  // Signed in and not staff: sent home before the queues are asked for.
  state.who = 'learner';
  response = await request('/admin', { cookie, 'accept-language': 'en' });
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), '/');
  assert.equal(asked(), 0);

  // ------------------------------------------------- the owner, in English
  state.who = 'owner';
  let full = await page('/admin', { cookie, 'accept-language': 'en' });
  assert.match(full, /<title>Administration[^<]*<\/title>/);
  let en = inner(full);
  has(en, [
    '<div class="container section staff-page">', '<p class="eyebrow">Administration</p>', '<h1>What is waiting</h1>',
    '<p class="lede" data-staff-lede="true">Waiting: 1,239. Queues with something in them: 3.</p>',
    'Safeguarding concerns are not in these counts.', '<a href="/admin/coursework">Handed-in files</a>',
    '>Before anyone can study here</h2>', 'There are no subject areas yet, so no course can be filed under one.',
    '<li data-setup-step="subjects"><span class="setup-n" aria-hidden="true">1</span>', '<a href="/admin/subjects">A subject to file courses under</a>',
    '<li data-setup-step="published"><span class="setup-n" aria-hidden="true">4</span>', '<a href="/admin/courses">Something a visitor can find</a>',
    'data-staff-queue="refunds"', '>3</div><div style="font-weight:600;margin-top:0.15rem">Refund requests</div>', 'Money waiting to go back to a customer.',
    '>1,234</div><div style="font-weight:600;margin-top:0.15rem">Teacher payouts</div>',
    '<span class="badge neutral">Paused</span>', 'Its feature is switched off, so nothing new is arriving. What is already here still needs a person. (<code dir="ltr">teaching.payouts</code>)',
    // The queue the page has no words for keeps the database's, with no mark on an English page.
    '>2</div><div style="font-weight:600;margin-top:0.15rem">SYNTHETIC queue label</div>', 'SYNTHETIC queue sentence.',
    'Also looked at, and empty: <span><a href="/admin/support">Support cases</a></span><span> · <a href="/admin/appeals">Governance appeals</a></span>',
    '<strong>Queues paused by a feature switch: 2</strong>', '<li>Teacher payouts</li><li>Support cases</li>',
    '<div data-staff-switchboard="true">', 'Feature flags</h2>', 'SYNTHETIC precondition',
    '>Money</h2>', '<p class="lede">What was charged, what goes back,', '<p data-staff-link="/admin/orders"><a href="/admin/orders">Orders awaiting payment</a> — <span>the only orders whose total can still change',
    '>Publication</h2>', '<a href="/admin/reviewers">Reviewer register</a>', '>Institutions</h3>', '>Support</h2>', '<a href="/admin/support">Support queue</a>',
    '>Everyone’s work</h2>', '<a href="/admin/roles">Roles</a>', '<a href="/learn">Back to my learning</a>',
  ], 'owner in English');
  lacks(en, ['lang="en"', 'data-staff-not-owner', 'No queue has anything in it'], 'owner in English');
  assert.equal((en.match(/data-staff-link=/g) ?? []).length, 43);

  // -------------------------------------------------- the owner, in Arabic
  full = await page('/admin', { cookie, 'accept-language': 'ar' });
  assert.match(htmlRoot(full), /lang="ar"/); assert.match(htmlRoot(full), /dir="rtl"/);
  assert.match(full, /<title>الإدارة[^<]*<\/title>/);
  const ar = inner(full);
  has(ar, [
    '<div class="container section staff-page">', '<p class="eyebrow">الإدارة</p>', '<h1>ما ينتظر</h1>',
    `<p class="lede" data-staff-lede="true">في الانتظار: ${AR(1239)}. القوائم التي فيها شيء: ${AR(3)}.</p>`,
    'بلاغات حماية الأطفال ليست ضمن هذه الأعداد.', '<a href="/admin/coursework">الملفات المُسلَّمة</a>',
    '>قبل أن يتمكّن أحد من الدراسة هنا</h2>', 'لا توجد مواد بعد، فلا يمكن إدراج أي دورة تحت مادة.',
    `<li data-setup-step="subjects"><span class="setup-n" aria-hidden="true">${AR(1)}</span>`, '<a href="/admin/subjects">مادة تُدرَج الدورات تحتها</a>',
    '<a href="/admin/reviewers">مراجع موثَّق</a>', '<a href="/admin/courses">دورة للمراجعة</a>', '<a href="/admin/courses">شيء يجده الزائر</a>',
    `>${AR(3)}</div><div style="font-weight:600;margin-top:0.15rem">طلبات الاسترداد</div>`, 'مال ينتظر أن يعود إلى عميل.',
    `>${AR(1234)}</div><div style="font-weight:600;margin-top:0.15rem">مدفوعات المعلمين</div>`, 'طلب معلم أن يُدفع له. تسجيل الدفعة ليس إرسالها.',
    '<span class="badge neutral">متوقفة</span>', 'ميزتها مُطفأة، فلا يصل شيء جديد. وما هو هنا بالفعل ما زال يحتاج إلى شخص. (<code dir="ltr">teaching.payouts</code>)',
    // The database's English for a queue with no words here, marked as English.
    `>${AR(2)}</div><div style="font-weight:600;margin-top:0.15rem" lang="en" dir="ltr">SYNTHETIC queue label</div>`, 'lang="en" dir="ltr">SYNTHETIC queue sentence.</p>',
    'فُحصت أيضًا وهي فارغة: <span><a href="/admin/support">طلبات الدعم</a></span><span> · <a href="/admin/appeals">تظلّمات الحوكمة</a></span>',
    `<strong>قوائم أوقفها مفتاح ميزة: ${AR(2)}</strong>`, '<li>مدفوعات المعلمين</li><li>طلبات الدعم</li>', 'إطفاء ميزة يوقف وصول عمل جديد.',
    // The switchboard is still English, and says so to the browser.
    '<div lang="en" dir="ltr" data-staff-switchboard="true">', 'Feature flags</h2>',
    '>المال</h2>', '<p class="lede">ما حُصِّل، وما يُعاد،',
    // A link's name is Arabic; the sentence beside it is still English, marked.
    '<p data-staff-link="/admin/orders"><a href="/admin/orders">طلبات شراء تنتظر الدفع</a> — <span lang="en" dir="ltr">the only orders whose total can still change',
    '>النشر</h2>', '<a href="/admin/reviewers">سجلّ المراجعين</a>', '<a href="/admin/panels">الهيئات العلمية</a>', '>المؤسسات</h3>',
    '>الدعم</h2>', '<a href="/admin/support">قائمة الدعم</a>', '>عمل الجميع</h2>', '<a href="/admin/appeals">التظلّمات</a>',
  ], 'owner in Arabic');
  // Outside what is marked as English, none of the database's words for a queue is left.
  const unmarked = ar.replace(/<div lang="en" dir="ltr" data-staff-switchboard="true">[\s\S]*?<h2 style="margin-top:2\.5rem">المال<\/h2>/u, '').replace(/<(span|p|div|a|li)[^>]* lang="en" dir="ltr"[^>]*>[\s\S]*?<\/\1>/gu, '');
  lacks(unmarked, [...DATABASE_ENGLISH, 'What is waiting', 'Administration', 'Paused', 'Publication', 'Waiting:', 'the only orders', 'Feature flags'], 'the unmarked part of the Arabic page');
  assert.equal((ar.match(/data-staff-link=/g) ?? []).length, 43);
  assert.equal((ar.match(/ — <span lang="en" dir="ltr">/g) ?? []).length, 43);

  // Persian digits are pinned: 1,239 waiting.
  const fa = inner(await page('/admin', { cookie, 'accept-language': 'fa' }));
  has(fa, ['<h1>چه چیزی در انتظار است</h1>', 'در انتظار: ۱٬۲۳۹. صف‌هایی که چیزی در آن‌هاست: ۳.', '<span class="badge neutral">متوقف</span>'], 'owner in Persian');
  // French keeps its no-break space before a colon.
  const fr = inner(await page('/admin', { cookie, 'accept-language': 'fr' }));
  has(fr, ['<h1>Ce qui attend</h1>', 'En attente\u00a0: 1\u202f239. Files qui contiennent quelque chose\u00a0: 3.', '<a href="/admin/reviewers">Registre des relecteurs</a>'], 'owner in French');
  // A language held for review: English, in a frame that says so.
  has(inner(await page('/admin', { cookie, 'accept-language': 'ha' })), ['<div class="container section staff-page" lang="en" dir="ltr">', '<h1>What is waiting</h1>', '<div data-staff-switchboard="true">'], 'held-language staff page');

  // A platform that is set up: no panel, and the queue sentence is the page's own.
  state.facts = { subject_areas: 6, courses: 3, course_versions: 2, reviewer_profiles: 1 };
  en = inner(await page('/admin', { cookie, 'accept-language': 'en' }));
  lacks(en, ['Before anyone can study here', 'data-setup-step'], 'a set-up platform');
  state.facts = { subject_areas: 6, courses: 0, course_versions: 0, reviewer_profiles: 0 };
  has(inner(await page('/admin', { cookie, 'accept-language': 'en' })), ['Subject areas a course can be filed under: 6.', '<li data-setup-step="reviewers"><span class="setup-n" aria-hidden="true">1</span>'], 'subjects but nothing else');

  // ------------------------------------------------------ a support agent
  state.who = 'support';
  en = inner(await page('/admin', { cookie, 'accept-language': 'en' }));
  has(en, [
    '<p class="lede" data-staff-lede="true">Every staff queue listed here is empty.</p>',
    '<p class="empty">No queue has anything in it. Nothing on this page is asking for you today.</p>',
    'Also looked at, and empty: <span><a href="/admin/support">Support cases</a></span><span> · <a href="/admin/reports">Reported content</a></span>',
    '<div class="notice" style="margin-top:2.5rem" data-staff-not-owner="true">The feature switches and the revenue share belong to the platform admin. The queues above and the links below are yours, and nothing on this page waits for a decision you cannot make.</div>',
    '>Support</h2>', '>Everyone’s work</h2>',
  ], 'support agent in English');
  // Not the owner's and not money's or publication's: none of it is on the page, and the register was not read.
  lacks(en, ['data-staff-switchboard', 'Feature flags', 'SYNTHETIC precondition', 'Before anyone can study here', '>Money</h2>', '>Publication</h2>', '/admin/orders', '/admin/reviewers', 'data-staff-dormant'], 'support agent in English');
  assert.equal((en.match(/data-staff-link=/g) ?? []).length, 21);
  const before = calls.filter((c) => c.path === '/rest/v1/platform_settings').length;
  const sw = inner(await page('/admin', { cookie, 'accept-language': 'sw' }));
  assert.equal(calls.filter((c) => c.path === '/rest/v1/platform_settings').length, before, 'the flag register was read for somebody who cannot change it');
  has(sw, [
    '<h1>Kinachosubiri</h1>', 'Kila foleni ya wafanyakazi iliyoorodheshwa hapa iko tupu.', 'Hakuna foleni yenye kitu. Hakuna chochote katika ukurasa huu kinachokuhitaji leo.',
    'Pia zimeangaliwa, na ziko tupu: <span><a href="/admin/support">Kesi za msaada</a></span><span> · <a href="/admin/reports">Maudhui yaliyoripotiwa</a></span>',
    'data-staff-not-owner="true">Swichi za vipengele na mgao wa mapato ni vya msimamizi wa jukwaa.', '>Kazi ya kila mtu</h2>', '<a href="/admin/support">Foleni ya msaada</a>',
  ], 'support agent in Swahili');
  lacks(sw, ['What is waiting', 'Support cases', 'Reported content', 'Everyone’s work', 'belong to the platform admin'], 'support agent in Swahili');

  console.log('Staff console: signed out goes to sign-in and somebody who is not staff goes home with the queues not asked for; the owner’s page whole in English and in Arabic with counts as this Node writes them for Arabic (Western digits when this was written), Persian digits pinned, French spacing kept; a queue named by its code, and one with no words here left in the database’s English and marked; all 43 links named in the reader’s language with the sentence beside each still English and marked; the switchboard still English and marked; a held language given English in a marked frame; the setup panel gone once the platform is set up; a support agent shown 21 links, no switchboard, no money, and the register not read.');
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
      await tab.goto(`${origin}/admin`, { waitUntil: 'networkidle' });
      return { context, tab, errors };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      // Name what sticks out, so the failure says where to look.
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 30)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: the page scrolls sideways (${scroll}): ${wide.join(' | ')}`);
    };
    state.facts = { subject_areas: 0, courses: 0, course_versions: 0, reviewer_profiles: 0 };
    state.flags = LONG_FLAGS;
    for (const who of ['owner', 'support']) {
      state.who = who;
      for (const [code, heading] of [['en', 'What is waiting'], ['ar', 'ما ينتظر'], ['ta', 'காத்திருப்பவை']]) {
        // The largest text in the dyslexia font is the widest the page is ever asked to be, whatever fonts the machine has.
        for (const [width, a11y] of [[320, null], [320, 'v1.larger.normal.system.dyslexic'], [390, null], [1440, null]]) {
          const label = `${who} ${code} ${width}${a11y ? ' largest text and the dyslexia font' : ''}`;
          const { context, tab, errors } = await open(code, width, a11y);
          assert.equal(await tab.evaluate(() => document.documentElement.lang), code, label);
          assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${label}: heading`);
          await fits(tab, width, `${label} /admin`);
          if (who === 'owner') assert.equal(await tab.locator('[data-staff-switchboard] .lessons li').count(), LONG_FLAGS.length, `${label}: the register's rows`);
          if (code === 'ar') {
            // An English sentence beside an Arabic link starts after the link:
            // on the link's left when they share a line, otherwise below it.
            // Lines are told apart by their middles, because an Arabic font's
            // box is taller than the line and overlaps the one under it.
            const order = await tab.evaluate(() => [...document.querySelectorAll('[data-staff-link]')].map((p) => {
              const parts = p.querySelector('a').getClientRects(); const link = parts[parts.length - 1];
              const note = p.querySelector('span[lang="en"]').getClientRects()[0];
              const middle = (r) => (r.top + r.bottom) / 2;
              const sameLine = Math.abs(middle(note) - middle(link)) < Math.min(note.height, link.height) / 2;
              return { href: p.getAttribute('data-staff-link'), ok: sameLine ? note.right <= link.left + 1 : middle(note) > middle(link) };
            }).filter((row) => !row.ok).map((row) => row.href));
            assert.deepEqual(order, [], `${label}: an English sentence is drawn before the link it follows`);
          }
          assert.deepEqual(errors, [], label);
          await context.close();
        }
      }
    }
    console.log('Staff console in a browser: the owner’s page and a support agent’s, in English, Arabic and Tamil at 320, 390 and 1440 pixels, and at 320 with the largest text in the dyslexia font, with a flag register of long keys, do not scroll sideways; in Arabic the English sentence beside a link starts after the link.');
  }
  console.log('Staff console HTTP smoke passed. Not real Auth, RLS, `is_privileged()`, `has_role()` or `staff_attention()`; nobody here is staff, and no speaker has read the translations.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}

