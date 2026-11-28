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
// English; that the sentence beside each link is in the reader's language
// too (since the second unit of 2026-11-28) and carries no mark; that the
// owner's switchboard is in the reader's language as well (the third unit of
// that day), with the three things the database wrote in it marked as
// English: a flag's precondition, a group the page has not heard of, and the
// database's sentence when it refuses; that a language held for review is
// given English in a marked frame; and, with a browser, that the page does
// not scroll sideways at three widths, that the word for the console in the
// main navigation is the reader's, that in Arabic the sentence beside a link
// is drawn after the link, and what a switch and the revenue share form say
// when the stand-in refuses, answers with a gateway's page, or agrees. The
// expected sentences are typed here rather than imported, so this fails if a
// catalogue changes without anybody looking at the page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
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
  { ...FLAG, key: 'companion.calculated_prayer_times', flag_group: 'Learner features', gate_type: 'admin_setup', preconditions: 'SYNTHETIC precondition that runs to several lines: the outside account has to exist, its secret has to be set, and somebody has to have tried it once.' },
  { ...FLAG, key: 'family.child_password_recovery', flag_group: 'Children and families', gate_type: 'code', preconditions: 'SYNTHETIC precondition for a flag that needs a deploy.' },
  { ...FLAG, key: 'family.guardian_verification', flag_group: 'Children and families', value_text: 'true', gate_type: 'admin_setup', preconditions: null },
];
const state = {
  flags: [FLAG],
  // Who is asking: 'owner', 'support' or 'learner'.
  who: 'owner',
  // What the Translate button has sent this month. Null: the read fails.
  month: null,
  // How a write to the register answers: 'ok', 'owner' (only the platform
  // admin may), 'other' (a sentence the page has no name for) or 'gateway'
  // (a page that is not the database's).
  write: 'ok',
  // How the revenue share's writer answers: 'ok' or 'other'.
  share: 'ok',
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
  if (path === '/rest/v1/rpc/translation_month') {
    if (state.month) return send(state.month);
    res.writeHead(500); return send({ code: 'XX000', message: 'SYNTHETIC failure', details: null, hint: null });
  }
  if (path === '/rest/v1/rpc/set_revenue_share_percent') {
    if (state.share === 'ok') { state.percent = payload.p_percent; return send(payload.p_percent); }
    res.writeHead(400); return send({ code: 'P0001', message: 'SYNTHETIC refusal of the share', details: null, hint: null });
  }
  if (Object.hasOwn(state.facts, table)) {
    res.setHeader('content-range', `*/${state.facts[table]}`);
    return req.method === 'HEAD' ? res.end() : send([]);
  }
  if (path === '/rest/v1/platform_settings') {
    const key = url.searchParams.get('key')?.replace(/^eq\./, '') ?? null;
    if (key === 'teaching.revenue_share_percent') return send([{ value_text: String(state.percent ?? 30) }]);
    if (req.method === 'PATCH') {
      // The switch's write. Nothing here is the table's trigger or its policy.
      if (state.write === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); return res.end('<html><body>Bad gateway</body></html>'); }
      if (state.write === 'owner') { res.writeHead(403); return send({ code: '42501', message: 'SYNTHETIC: only the platform admin may change a switch', details: null, hint: null }); }
      if (state.write === 'other') { res.writeHead(400); return send({ code: 'P0001', message: 'SYNTHETIC refusal by the database', details: null, hint: null }); }
      const row = { ...state.flags.find((f) => f.key === key), ...payload };
      state.flags = state.flags.map((f) => (f.key === key ? row : f));
      return send(row);
    }
    return send(key ? state.flags.filter((f) => f.key === key) : state.flags);
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
    '<div data-staff-switchboard="true">', 'Feature flags</h2>', 'data-flag-precondition="true">SYNTHETIC precondition</span>',
    '<p class="lede">Everything is built and shipped off. Turn features on here as their preconditions are met.</p>',
    '<h3>Teacher revenue share</h3><span class="badge neutral">To teachers: 30%</span>', 'Teacher share, whole percent', 'placeholder="For example: approved policy on paying teachers, reviewed on…"', '>Save revenue share</button>',
    '<div class="n">0</div><div class="l">Enabled</div>', '<div class="n">1</div><div class="l">Off</div>', '<div class="l">Off, outside setup first</div>', '<div class="l">Need a deploy</div>',
    '<a href="/admin/retention">Retention clock</a> — the two things the privacy notice promises to delete on a date',
    'A flag marked “Needs a deploy” cannot be switched on here',
    '<h3>Synthetic group</h3>', '>On: 0 of 1</span>', 'data-flag-gate="true">Runtime toggle</span>', 'aria-label="synthetic.flag: Off"',
    '>Money</h2>', '<p class="lede">What was charged, what goes back,', '<p data-staff-link="/admin/orders"><a href="/admin/orders">Orders awaiting payment</a> — <span>the only orders whose total can still change',
    '>Publication</h2>', '<a href="/admin/reviewers">Reviewer register</a>', '>Institutions</h3>', '>Support</h2>', '<a href="/admin/support">Support queue</a>',
    '>Everyone’s work</h2>', '<a href="/admin/roles">Roles</a>', '<a href="/learn">Back to my learning</a>',
    // The sentence beside a link is the catalogue's; a flag's key is written as the register writes it.
    '<p data-staff-link="/admin/roles"><a href="/admin/roles">Roles</a> — <span>who may do what. Every check in the database reads these</span></p>',
    'While platform.safeguarding is on, a course a child may be shown cannot be published', 'and with governance.panel_required off nothing waits on it</span>',
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
    // The switchboard is Arabic too, and carries no mark: it is the page's language.
    '<div data-staff-switchboard="true">', '>مفاتيح الميزات</h2>',
    '<p class="lede">كل شيء مبنيّ ومنشور وهو مُطفأ. شغِّل الميزات من هنا كلما تحققت شروطها المسبقة.</p>',
    `<h3>حصة المعلمين من الإيرادات</h3><span class="badge neutral">للمعلمين: ${AR(30)}%</span>`, 'حصة المعلم، نسبة مئوية صحيحة', 'placeholder="مثال: سياسة معتمدة لأجور المعلمين، روجعت بتاريخ…"', '>حفظ حصة الإيرادات</button>',
    `<div class="n">${AR(0)}</div><div class="l">مفعَّلة</div>`, `<div class="n">${AR(1)}</div><div class="l">مُطفأة</div>`, '<div class="l">مُطفأة، والإعداد الخارجي أولًا</div>', '<div class="l">تحتاج إلى نشر</div>',
    '<a href="/admin/retention">ساعة الاحتفاظ</a> — الأمران اللذان يَعِد إشعار الخصوصية بحذفهما في تاريخ محدد',
    'الميزة التي عليها «يحتاج إلى نشر» لا يمكن تشغيلها من هنا',
    `>المفعَّل: ${AR(0)} من ${AR(1)}</span>`, 'data-flag-gate="true">تشغيل مباشر</span>', 'aria-label="synthetic.flag: مُطفأ"',
    // Two things in it are the database's, and are marked as English: a group the page has not heard of, and what a flag still needs.
    '<h3 lang="en" dir="ltr">Synthetic group</h3>', 'lang="en" dir="ltr" data-flag-precondition="true">SYNTHETIC precondition</span>',
    '<code style="font-size:0.85rem" dir="ltr">synthetic.flag</code>',
    '>المال</h2>', '<p class="lede">ما حُصِّل، وما يُعاد،',
    // A link's name is Arabic and so is the sentence beside it, with no mark: it is the page's language.
    '<p data-staff-link="/admin/orders"><a href="/admin/orders">طلبات شراء تنتظر الدفع</a> — <span>الطلبات الوحيدة التي ما زال مجموعها قابلًا للتغيير: سجِّل على الطلب خصمًا أو ضريبة أو رسمًا أو تقريبًا، أو اسحبه</span></p>',
    // What a member of staff types or looks up stays in Latin letters inside the Arabic.
    'ما دام platform.safeguarding مفعَّلًا', 'governance.panel_required', ' DNS ',
    '>النشر</h2>', '<a href="/admin/reviewers">سجلّ المراجعين</a>', '<a href="/admin/panels">الهيئات العلمية</a>', '>المؤسسات</h3>',
    '>الدعم</h2>', '<a href="/admin/support">قائمة الدعم</a>', '>عمل الجميع</h2>', '<a href="/admin/appeals">التظلّمات</a>',
  ], 'owner in Arabic');
  // Outside what is marked as English, none of the database's words for a queue is left.
  const unmarked = ar.replace(/<(span|p|div|a|li|h3)[^>]* lang="en" dir="ltr"[^>]*>[\s\S]*?<\/\1>/gu, '');
  lacks(unmarked, [
    ...DATABASE_ENGLISH, 'What is waiting', 'Administration', 'Paused', 'Publication', 'Waiting:', 'the only orders',
    // The switchboard's English, none of which is left, and what the database wrote, none of which is unmarked.
    'Feature flags', 'Everything is built', 'Teacher revenue share', 'to teachers', 'To teachers', 'whole percent', 'Reason for this change', 'For example', 'Save revenue share',
    'Enabled', 'Need a deploy', 'Needs a deploy', 'Retention clock', 'the privacy notice', 'cannot be switched on here', 'Runtime toggle', 'On: ', ': Off"', ': off"',
    'SYNTHETIC precondition', 'Synthetic group', 'SYNTHETIC',
  ], 'the unmarked part of the Arabic page');
  // The switchboard is not a block of English any more.
  lacks(ar, ['<div lang="en" dir="ltr" data-staff-switchboard="true">', 'data-translation-month'], 'the Arabic page');
  // No sentence beside a link is English any more, marked or not.
  lacks(ar, ['the only orders', 'money going back out', 'who may do what', 'courses waiting for a reviewer', 'Aggregates only'], 'the Arabic page');
  assert.equal((ar.match(/data-staff-link=/g) ?? []).length, 43);
  assert.equal((ar.match(/ — <span lang="en" dir="ltr">/g) ?? []).length, 0);
  assert.equal((ar.match(/<\/a> — <span>[^<]+<\/span><\/p>/g) ?? []).length, 43);

  // Persian digits are pinned: 1,239 waiting.
  const fa = inner(await page('/admin', { cookie, 'accept-language': 'fa' }));
  has(fa, [
    '<h1>چه چیزی در انتظار است</h1>', 'در انتظار: ۱٬۲۳۹. صف‌هایی که چیزی در آن‌هاست: ۳.', '<span class="badge neutral">متوقف</span>',
    // The switchboard writes its numbers in Persian digits too: the share, the four counts, a group's count.
    '<h3>سهم معلمان از درآمد</h3><span class="badge neutral">برای معلمان: ۳۰%</span>', '<div class="n">۰</div><div class="l">روشن</div>', '<div class="n">۱</div><div class="l">خاموش</div>', '>روشن: ۰ از ۱</span>',
  ], 'owner in Persian');
  // French keeps its no-break space before a colon.
  const fr = inner(await page('/admin', { cookie, 'accept-language': 'fr' }));
  has(fr, ['<span class="badge neutral">Aux enseignants\u00a0: 30\u00a0%</span>', '>Activées\u00a0: 0 sur 1</span>', 'Une fonction marquée «\u00a0Demande un déploiement\u00a0» ne peut pas être activée ici'], 'the switchboard in French');
  has(fr, ['<h1>Ce qui attend</h1>', 'En attente\u00a0: 1\u202f239. Files qui contiennent quelque chose\u00a0: 3.', '<a href="/admin/reviewers">Registre des relecteurs</a>', '<span>les seules commandes dont le total peut encore changer\u00a0: enregistrez-y une remise, une taxe, des frais ou un arrondi, ou retirez la commande</span>'], 'owner in French');
  // A language held for review: English, in a frame that says so.
  const ha = inner(await page('/admin', { cookie, 'accept-language': 'ha' }));
  has(ha, ['<div class="container section staff-page" lang="en" dir="ltr">', '<h1>What is waiting</h1>', '<div data-staff-switchboard="true">', 'Feature flags</h2>', '<h3>Teacher revenue share</h3>', '<a href="/admin/orders">Orders awaiting payment</a> — <span>the only orders whose total can still change'], 'held-language staff page');
  // Inside that frame nothing needs a second mark: the frame already says English.
  assert.equal((ha.match(/ lang="en"/g) ?? []).length, 1, 'held-language staff page marks English inside its English frame');

  // What the Translate button sent this month, once the read answers. The
  // switch is on and this server has no key, which is the state said loudest.
  state.month = { on: true, monthStarts: '2026-11-01', characters: 320000, requests: 412, people: 3, monthly: 400000, daily: 20000 };
  has(inner(await page('/admin', { cookie, 'accept-language': 'en' })), ['<div class="notice warn" data-translation-month="true"><strong>Translation.</strong> The translation switch is on, but this server has no GOOGLE_TRANSLATE_API_KEY, so no button is drawn and nothing is sent. Characters this month: 320,000 of 400,000 (80%). Requests: 412. People: 3. The most one person may send in a day: 20,000. Members stop at four fifths of the month; the rest is kept for staff.</div>'], 'the translation month in English');
  has(inner(await page('/admin', { cookie, 'accept-language': 'ar' })), [`<div class="notice warn" data-translation-month="true"><strong>الترجمة.</strong> مفتاح الترجمة مفعَّل، لكن هذا الخادم ليس فيه GOOGLE_TRANSLATE_API_KEY، فلا يُعرض أي زر ولا يُرسَل شيء. الأحرف هذا الشهر: ${AR(320000)} من ${AR(400000)} (${AR(80)}%). الطلبات: ${AR(412)}. الأشخاص: ${AR(3)}. أقصى ما يرسله شخص واحد في اليوم: ${AR(20000)}.`], 'the translation month in Arabic');
  has(inner(await page('/admin', { cookie, 'accept-language': 'fa' })), ['<strong>ترجمه.</strong> کلید ترجمه روشن است، اما این سرور GOOGLE_TRANSLATE_API_KEY ندارد', 'نویسه‌های این ماه: ۳۲۰٬۰۰۰ از ۴۰۰٬۰۰۰ (۸۰%). درخواست‌ها: ۴۱۲. افراد: ۳.'], 'the translation month in Persian');
  state.month = { ...state.month, on: false, characters: 12 };
  has(inner(await page('/admin', { cookie, 'accept-language': 'sw' })), ['<div class="notice" data-translation-month="true"><strong>Tafsiri.</strong> Tafsiri imezimwa, na seva hii haina GOOGLE_TRANSLATE_API_KEY. Inahitaji vyote viwili. Herufi za mwezi huu: 12 kati ya 400,000 (0%).'], 'the translation month in Swahili');
  state.month = null;

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
    'data-staff-not-owner="true">Swichi za vipengele na mgao wa mapato ni vya msimamizi wa jukwaa.', '>Kazi ya kila mtu</h2>',
    '<p data-staff-link="/admin/support"><a href="/admin/support">Foleni ya msaada</a> — <span>maombi ambayo watu walifungua kutoka Msaada. Kuzima kipengele husimamisha mapya; hakufungi yaliyo njiani</span></p>',
  ], 'support agent in Swahili');
  lacks(sw, ['What is waiting', 'Support cases', 'Reported content', 'Everyone’s work', 'belong to the platform admin', 'requests people opened from Help', 'lang="en"', 'data-staff-switchboard', 'Swichi za vipengele</h2>', 'data-revenue-share'], 'support agent in Swahili');
  assert.equal((sw.match(/<\/a> — <span>[^<]+<\/span><\/p>/g) ?? []).length, 21);

  console.log('Staff console: signed out goes to sign-in and somebody who is not staff goes home with the queues not asked for; the owner’s page whole in English and in Arabic with counts as this Node writes them for Arabic (Western digits when this was written), Persian digits pinned, French spacing kept; a queue named by its code, and one with no words here left in the database’s English and marked; all 43 links named in the reader’s language and the sentence beside each in it too, unmarked, with the flag keys and DNS left in Latin letters; the switchboard in the reader’s language with its numbers in the reader’s digits, and a flag’s precondition and a group the page has not heard of left in the database’s English and marked; the translation line said from the month the stand-in gave, and not drawn when the read fails; a held language given English in one marked frame; the setup panel gone once the platform is set up; a support agent shown 21 links, no switchboard, no money, and the register not read.');
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
    // For a person to look at, when asked: ADMIN_SMOKE_SHOTS names a directory.
    const shots = process.env.ADMIN_SMOKE_SHOTS;
    const shoot = async (target, name) => { if (shots) await target.screenshot({ path: join(shots, `${name}.png`) }); };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      // Name what sticks out, so the failure says where to look.
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 30)}"`).slice(0, 6), width);
      // A word too long for its box sticks out of it without making the box
      // any wider, so the words are measured as well as the boxes.
      const words = scroll <= width + 1 ? [] : await tab.evaluate((limit) => {
        const found = []; const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT); const range = document.createRange();
        for (let node = walker.nextNode(); node && found.length < 6; node = walker.nextNode()) {
          if (!node.textContent.trim()) continue;
          range.selectNodeContents(node);
          if ([...range.getClientRects()].some((r) => r.right > limit + 1 || r.left < -1)) found.push(`${node.parentElement.tagName.toLowerCase()}.${node.parentElement.className} "${node.textContent.trim().slice(0, 40)}"`);
        }
        return found;
      }, width);
      assert.ok(scroll <= width + 1, `${label}: the page scrolls sideways (${scroll}): boxes ${wide.join(' | ') || 'none'}; words ${words.join(' | ') || 'none'}`);
    };
    state.facts = { subject_areas: 0, courses: 0, course_versions: 0, reviewer_profiles: 0 };
    state.flags = LONG_FLAGS;
    // What a switch says when a change is not made, typed here in three languages.
    const SWITCH_SAYS = {
      en: {
        off: 'Off', on: 'On',
        notOwner: 'Only the platform admin can change a feature switch. This one is as it was.',
        refused: 'The database refused that change, and the switch is as it was. What it said:',
        unsure: 'Nobody can say whether that switch changed. Load the page again and look at it before pressing again.',
      },
      ar: {
        off: 'مُطفأ', on: 'مفعَّل',
        notOwner: 'مدير المنصة وحده يستطيع تغيير مفتاح ميزة. وهذا المفتاح باقٍ كما كان.',
        refused: 'رفضت قاعدة البيانات هذا التغيير، والمفتاح باقٍ كما كان. وهذا ما قالته:',
        unsure: 'لا أحد يستطيع أن يقول هل تغيّر هذا المفتاح. أعد تحميل الصفحة وانظر إليه قبل أن تضغط من جديد.',
      },
      ta: {
        off: 'அணைந்துள்ளது', on: 'இயக்கத்தில்',
        notOwner: 'அம்சச் சுவிட்சைத் தள நிர்வாகி மட்டுமே மாற்ற முடியும். இந்தச் சுவிட்சு இருந்தபடியே உள்ளது.',
        refused: 'தரவுத்தளம் அந்த மாற்றத்தை மறுத்தது; சுவிட்சு இருந்தபடியே உள்ளது. அது சொன்னது:',
        unsure: 'அந்தச் சுவிட்சு மாறியதா என்று யாராலும் சொல்ல முடியாது. பக்கத்தை மீண்டும் ஏற்றி, மீண்டும் அழுத்துவதற்கு முன் அதைப் பாருங்கள்.',
      },
    };
    // Press the first switch against each answer the stand-in can give. A
    // change that is not made leaves the switch as it was and says why, in the
    // reader's language; the database's own sentence is marked as English.
    const pressSwitch = async (tab, code, width, label) => {
      const says = SWITCH_SAYS[code];
      const row = tab.locator('[data-staff-switchboard] .lessons li').filter({ hasText: 'synthetic.flag' });
      const control = row.getByRole('switch');
      assert.equal(await control.getAttribute('aria-label'), `synthetic.flag: ${says.off}`, `${label}: the switch's name`);
      const alert = row.locator('[role="alert"]');
      const writes = () => calls.filter((c) => c.method === 'PATCH' && c.path === '/rest/v1/platform_settings');
      // Press, and wait for what is expected to be on the row. Before the page
      // has hydrated a press does nothing, so a press that changed nothing on
      // the page is made again.
      const press = async (expected, what) => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await control.click();
          try { await expected.waitFor({ state: 'attached', timeout: 5000 }); return; } catch { /* press again */ }
        }
        assert.fail(`${label}: the switch never showed ${what}`);
      };
      // Each answer differs from the one before it, so an old sentence left on the row cannot pass for a new one.
      for (const [write, refusal, said] of [['owner', 'notOwner', null], ['gateway', 'unsure', null], ['other', 'refused', 'SYNTHETIC refusal by the database'], ['cut', 'unsure', null]]) {
        // 'cut': the API itself is not reached; the connection goes before any answer.
        state.write = write === 'cut' ? 'ok' : write;
        if (write === 'cut') await tab.route('**/api/admin/flags', (route) => route.abort());
        const before = writes().length;
        await press(row.locator(`[data-flag-refusal="${refusal}"]`), `"${refusal}" for "${write}"`);
        assert.equal((await alert.textContent()).trim(), said ? `${says[refusal]} ${said}` : says[refusal], `${label}: what the switch says for "${write}"`);
        if (said) assert.deepEqual(await alert.locator('[data-flag-said]').evaluate((el) => [el.textContent, el.getAttribute('lang'), el.getAttribute('dir')]), code === 'en' ? [said, null, null] : [said, 'en', 'ltr'], `${label}: the database's sentence and its mark`);
        assert.equal(await control.getAttribute('aria-checked'), 'false', `${label}: a change that was not made is shown as made ("${write}")`);
        if (write === 'cut') {
          assert.equal(writes().length, before, `${label}: the cut request reached the stand-in`);
          await tab.unroute('**/api/admin/flags');
        } else {
          assert.ok(writes().length > before, `${label}: "${write}" was answered without the stand-in being asked`);
        }
        await fits(tab, width, `${label} /admin after "${write}"`);
        await shoot(row, `switch-${code}-${width}-${write}`);
      }
      // And a change that is made: the switch is on, says so, and says nothing else.
      // The switch turns at once and is turned back if the answer is a refusal,
      // so "on" is only looked at after the stand-in has answered and the page
      // has been drawn again from what it now holds.
      state.write = 'ok';
      const made = writes().length;
      // The answer is held back for a moment and the switch is pressed twice
      // more meanwhile: from a press until its answer it takes no other, or
      // two changes would be in flight and the last answer would win.
      await tab.route('**/api/admin/flags', async (route) => { await new Promise((done) => setTimeout(done, 1500)); await route.continue(); });
      await control.click();
      await control.evaluate((el) => { el.click(); el.click(); });
      assert.equal(await control.isDisabled(), true, `${label}: the switch can be pressed again before it is answered`);
      for (let i = 0; i < 60 && writes().length === made; i += 1) await tab.waitForTimeout(250);
      await tab.waitForTimeout(750);
      await tab.unroute('**/api/admin/flags');
      assert.equal(writes().length, made + 1, `${label}: three presses before the answer, one write`);
      await tab.waitForLoadState('networkidle');
      await tab.waitForTimeout(500);
      assert.equal(await control.getAttribute('aria-checked'), 'true', `${label}: a change that was made is not shown`);
      assert.equal(await alert.count(), 0, `${label}: a change that was made still shows a refusal`);
      assert.equal(await control.getAttribute('aria-label'), `synthetic.flag: ${says.on}`, `${label}: the switch's name once on`);
      assert.deepEqual(writes().at(-1).payload, { value_text: 'true' }, `${label}: what was written`);
      state.flags = LONG_FLAGS;
    };
    for (const who of ['owner', 'support']) {
      state.who = who;
      for (const [code, heading, word] of [['en', 'What is waiting', 'Admin'], ['ar', 'ما ينتظر', 'الإدارة'], ['ta', 'காத்திருப்பவை', 'நிர்வாகம்']]) {
        // The largest text in the dyslexia font is the widest the page is ever asked to be, whatever fonts the machine has.
        for (const [width, a11y] of [[320, null], [320, 'v1.larger.normal.system.dyslexic'], [390, null], [1440, null]]) {
          const label = `${who} ${code} ${width}${a11y ? ' largest text and the dyslexia font' : ''}`;
          const { context, tab, errors } = await open(code, width, a11y);
          assert.equal(await tab.evaluate(() => document.documentElement.lang), code, label);
          assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${label}: heading`);
          await fits(tab, width, `${label} /admin`);
          // The way back to the console, in the main navigation: the reader's
          // word for it, with no language mark of its own, and it is this page.
          const back = tab.locator('nav.nav a[href="/admin"]');
          await back.waitFor({ state: 'attached', timeout: 10000 });
          assert.deepEqual(await back.evaluate((a) => [a.textContent, a.getAttribute('lang'), a.getAttribute('dir'), a.getAttribute('aria-current')]), [word, null, null, 'page'], `${label}: the console's word in the navigation`);
          if (who === 'owner') {
            assert.equal(await tab.locator('[data-staff-switchboard] .lessons li').count(), LONG_FLAGS.length, `${label}: the register's rows`);
            // The switchboard is the page's language: no mark of its own, and the only English marked in it is the database's.
            assert.deepEqual(await tab.locator('[data-staff-switchboard]').evaluate((el) => [el.getAttribute('lang'), el.getAttribute('dir')]), [null, null], `${label}: the switchboard's mark`);
            assert.deepEqual(
              await tab.locator('[data-staff-switchboard] [lang]').evaluateAll((els) => [...new Set(els.map((el) => `${el.tagName.toLowerCase()}${el.hasAttribute('data-flag-precondition') ? '[precondition]' : ''}:${el.getAttribute('lang')}`))].sort()),
              code === 'en' ? [] : ['h3:en', 'span[precondition]:en'], `${label}: what is marked inside the switchboard`);
            await shoot(tab.locator('[data-staff-switchboard]'), `board-${code}-${width}${a11y ? '-widest' : ''}`);
            if (width === 320 && !a11y) await pressSwitch(tab, code, width, label);
          }
          if (code === 'ar') {
            // The sentence beside an Arabic link starts after the link: on the
            // link's left when they share a line, otherwise below it. (It was
            // English until 2026-11-28, and this is what caught it being drawn
            // before the link; it is kept for the Latin words inside it.)
            // Lines are told apart by their middles, because an Arabic font's
            // box is taller than the line and overlaps the one under it.
            const order = await tab.evaluate(() => [...document.querySelectorAll('[data-staff-link]')].map((p) => {
              const parts = p.querySelector('a').getClientRects(); const link = parts[parts.length - 1];
              const note = p.querySelector('span').getClientRects()[0];
              const middle = (r) => (r.top + r.bottom) / 2;
              const sameLine = Math.abs(middle(note) - middle(link)) < Math.min(note.height, link.height) / 2;
              return { href: p.getAttribute('data-staff-link'), ok: sameLine ? note.right <= link.left + 1 : middle(note) > middle(link) };
            }).filter((row) => !row.ok).map((row) => row.href));
            assert.equal(await tab.locator('[data-staff-link] span[lang]').count(), 0, `${label}: a sentence beside a link is marked as another language`);
            assert.deepEqual(order, [], `${label}: a sentence is drawn before the link it follows`);
          }
          assert.deepEqual(errors, [], label);
          await context.close();
        }
      }
    }
    // The revenue share, in Persian: the page shows Persian digits, so the
    // form reads them. What cannot be a percentage, and a missing reason, are
    // refused before anything is sent; the stand-in's refusal is marked as
    // English; and what is saved is the number that was typed.
    {
      state.who = 'owner';
      const label = 'owner fa 320, the revenue share';
      const { context, tab, errors } = await open('fa', 320, null);
      const form = tab.locator('form[data-revenue-share]');
      const field = form.locator('input[type="text"]');
      const refusal = form.locator('[role="alert"]');
      const sent = () => calls.filter((c) => c.path === '/rest/v1/rpc/set_revenue_share_percent');
      const save = async (attribute, value) => {
        for (let i = 0; i < 40; i += 1) {
          await form.getByRole('button').click();
          await tab.waitForTimeout(300);
          if ((await form.locator(`[${attribute}]`).count()) && (value === null || (await form.locator(`[${attribute}]`).getAttribute(attribute)) === value)) return;
        }
        assert.fail(`${label}: the form never showed ${attribute}=${value}`);
      };
      assert.equal(await form.locator('.badge').textContent(), 'برای معلمان: ۳۰%', `${label}: the badge`);
      assert.equal(await field.inputValue(), '۳۰', `${label}: the field opens with the figure in the page's digits`);
      const before = sent().length;
      await field.fill('۱۰۱');
      await save('data-revenue-share-refusal', 'percent');
      assert.equal((await refusal.textContent()).trim(), 'درصدی صحیح از ۰ تا ۱۰۰ وارد کنید.', `${label}: 101`);
      await field.fill('۴۰');
      await save('data-revenue-share-refusal', 'reason');
      assert.equal((await refusal.textContent()).trim(), 'دلیلی بنویسید. در سابقهٔ ممیزی نگه داشته می‌شود.', `${label}: no reason`);
      assert.equal(sent().length, before, `${label}: something was sent before the form was whole`);
      await form.locator('textarea').fill('SYNTHETIC reason');
      state.share = 'other';
      await save('data-revenue-share-refusal', 'refused');
      assert.equal((await refusal.textContent()).trim(), 'پایگاه داده این تغییر را نپذیرفت و سهم همان‌طور که بود مانده است. آنچه گفت: SYNTHETIC refusal of the share', `${label}: the stand-in refused`);
      assert.deepEqual(await refusal.locator('[data-revenue-share-said]').evaluate((el) => [el.getAttribute('lang'), el.getAttribute('dir')]), ['en', 'ltr'], `${label}: the mark on the database's sentence`);
      await fits(tab, 320, `${label} after a refusal`);
      await shoot(form, 'share-fa-320-refused');
      state.share = 'ok';
      await form.getByRole('button').click();
      await form.locator('[role="status"]').waitFor({ state: 'visible', timeout: 15000 });
      assert.equal(await form.locator('[role="status"]').textContent(), 'ذخیره شد.', `${label}: saved`);
      assert.equal(await refusal.count(), 0, `${label}: a refusal is still shown after saving`);
      assert.deepEqual(sent().at(-1).payload, { p_percent: 40, p_reason: 'SYNTHETIC reason' }, `${label}: what was sent`);
      assert.equal(await field.inputValue(), '۴۰', `${label}: the field after saving keeps what was typed`);
      await tab.waitForFunction(() => document.querySelector('form[data-revenue-share] .badge')?.textContent === 'برای معلمان: ۴۰%', null, { timeout: 15000 });
      assert.deepEqual(errors, [], label);
      await context.close();
      state.percent = 30;
    }
    console.log('Staff console in a browser, the switchboard: in English, Arabic and Tamil the switchboard carries no language mark and the only English marked inside it is a group the page has not heard of and a flag’s precondition; a switch pressed against a stand-in that says only the platform admin may, that refuses in its own words, that answers with a gateway’s page, and against a connection that is cut, stays as it was and says which in the reader’s language, with the stand-in’s sentence marked as English; a change that is made turns it on, and pressed three times before its answer comes it is written once. In Persian the revenue share form reads ۱۰۱ and refuses it, refuses a missing reason, sends nothing for either, shows the stand-in’s refusal marked as English, and saves ۴۰ as 40; the field opens with ۳۰ and keeps ۴۰, and the figure beside the heading becomes ۴۰ once the page is drawn again.');
    console.log('Staff console in a browser: the owner’s page and a support agent’s, in English, Arabic and Tamil at 320, 390 and 1440 pixels, and at 320 with the largest text in the dyslexia font, with a flag register of long keys, do not scroll sideways; the console’s word in the main navigation is the reader’s, unmarked, and is the current page; in Arabic the sentence beside a link starts after the link.');
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

