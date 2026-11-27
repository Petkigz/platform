// Real Next /support and /support/<number> pages and the /api/support route
// against an entirely synthetic loopback Auth/REST API. This is not evidence
// about hosted Supabase, JWT validation, RLS, or what `open_support_case()`
// and its neighbours do: the stand-in answers whatever it is asked, and no
// request reaches a person.
//
// What it does show (written 2026-11-27, when the pages were put into the
// reader's language): the page a signed-in reader is sent, in English, in
// Arabic and in French, and in English for a language held for review; that
// what somebody wrote keeps its own direction; that the part only staff see
// is marked as English and is not sent to the person who asked; and that
// each refusal the route gives travels by name, with the database's English
// sentence never shown to a reader of another language. The expected
// sentences are typed here rather than imported, so this fails if a
// catalogue changes without anybody looking at the page.
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

const STAFF = '7d1f3c55-52a4-4f0e-9a63-1f0a6c0f2b11';
const LONG = 'SYNTHETIC-ORDER-0123456789-0123456789-0123456789-0123456789-0123456789';
const caseRow = (over = {}) => ({
  id: 'b2b6a0de-3f0f-4d2e-8c58-6f2b54a0c001', case_number: 'SC-000007', category: 'payment',
  subject: 'Synthetic: charged twice', body: `I paid once and was charged twice.\nOrder ${LONG}`,
  status: 'assigned', priority: 'high', requested_by: user.id, learner_profile_id: null, order_id: null,
  assigned_to: STAFF, resolved_at: null, resolution_note: null, closed_at: null, close_reason: null,
  created_at: '2026-11-20T08:05:00Z', updated_at: '2026-11-21T09:00:00Z',
  requester: { display_name: 'Synthetic learner' }, assignee: { display_name: 'Synthetic agent' },
  ...over,
});
const MESSAGES = [
  { id: 'm1', case_id: caseRow().id, author_user_id: STAFF, author_kind: 'staff', body: 'We are looking at the second charge.', is_internal: false, created_at: '2026-11-20T10:00:00Z', author: { display_name: null } },
  { id: 'm2', case_id: caseRow().id, author_user_id: user.id, author_kind: 'requester', body: 'شكرًا، أنتظر ردّكم.', is_internal: false, created_at: '2026-11-20T11:30:00Z', author: { display_name: 'Synthetic learner' } },
];

// What the support functions raise, word for word. None of these sentences
// may reach a reader whose page is not in English.
const RAISED = {
  off: { status: 400, code: '23514', message: 'support is not open right now (platform.support is off)' },
  five: { status: 400, code: '23514', message: 'you already have five open requests; wait for a reply or close one first' },
  closed: { status: 400, code: '23514', message: 'this case is closed; open a new one if you still need help' },
  missing: { status: 400, code: 'P0002', message: 'support case not found' },
  account: { status: 403, code: '42501', message: 'support:account_closed_or_missing' },
};
const DATABASE_WORDS = ['platform.support is off', 'five open requests', 'this case is closed', 'support case not found', 'account_closed_or_missing', 'SYNTHETIC gateway'];

const state = {
  // What `setting_bool('platform.support')` answers: true, false, or 'broken'.
  open: true,
  cases: [caseRow()],
  staff: false,
  helpBroken: false,
  // What the stand-in database does with a write: 'ok', a key of RAISED, or 'gateway'.
  write: 'ok',
};
const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, query: url.search });
  const send = (value) => res.end(JSON.stringify(value));
  const one = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
  const write = (ok) => {
    if (state.write === 'ok') return send(ok);
    if (state.write === 'gateway') { res.writeHead(502, { 'content-type': 'text/html' }); return res.end('<html>SYNTHETIC gateway</html>'); }
    const raised = RAISED[state.write]; res.writeHead(raised.status); return send({ code: raised.code, message: raised.message, details: null, hint: null });
  };
  if (path === '/rest/v1/rpc/setting_bool') {
    if (payload?.p_key === 'platform.support') {
      if (state.open === 'broken') { res.writeHead(500); return send({ code: 'XX000', message: 'SYNTHETIC gateway' }); }
      return send(state.open);
    }
    return send(false);
  }
  if (path === '/rest/v1/support_cases') {
    const number = url.searchParams.get('case_number')?.replace(/^eq\./, '');
    const rows = number ? state.cases.filter((c) => c.case_number === number) : state.cases;
    if (one) { if (rows.length !== 1) { res.writeHead(406); return send({ code: 'PGRST116', message: 'no rows', details: null, hint: null }); } return send(rows[0]); }
    return send(rows);
  }
  if (path === '/rest/v1/support_case_messages') return send(MESSAGES);
  if (path === '/rest/v1/platform_help_articles') {
    if (state.helpBroken) { res.writeHead(500); return send({ code: 'XX000', message: 'SYNTHETIC gateway' }); }
    return send([
      { id: 'h1', title: 'Finding your courses', body: 'Open My learning.\nEvery course you are enrolled in is there.', keywords: 'courses learning', status: 'published', updated_at: '2026-11-01T00:00:00Z' },
      { id: 'h2', title: 'استرداد المبلغ', body: 'اطلب الاسترداد من صفحة طلباتي.', keywords: 'refund', status: 'published', updated_at: '2026-11-01T00:00:00Z' },
    ]);
  }
  if (path === '/rest/v1/rpc/is_privileged') return send(state.staff);
  if (path === '/rest/v1/rpc/safeguarding_owner_status') return send({ is_owner: false });
  if (path === '/rest/v1/rpc/support_case_history') return send(null);
  if (path === '/rest/v1/rpc/open_support_case') return write('c0ffee00-0000-4000-8000-000000000001');
  if (path === '/rest/v1/rpc/reply_to_support_case') return write('c0ffee00-0000-4000-8000-000000000002');
  if (path === '/rest/v1/rpc/close_support_case') return write(null);
  if (path === '/rest/v1/user_profiles') return send([{ display_name: 'Synthetic learner', account_status: 'active', deleted_at: null, preferred_language: 'en', timezone: null }]);
  if (path === '/rest/v1/learner_profiles') return send([]);
  if (path === '/rest/v1/rpc/notification_badge') return send(0);
  if (path === '/rest/v1/rpc/has_role') return send(false);
  res.writeHead(404); res.end('{}');
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
  for (const path of ['/support', '/support/SC-000007']) {
    const anonymous = await request(path);
    assert.equal(anonymous.status, 307, path);
    const redirect = new URL(anonymous.headers.get('location'), origin);
    assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), path);
  }

  const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  // The page itself: what is inside <main>, without the scripts Next adds.
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('&#x27;', '’').replaceAll('<!-- -->', '');
  const page = async (path, headers) => { const response = await request(path, { cookie, ...headers }); assert.equal(response.status, 200, `${path}\n${logs.slice(-2000)}`); return response.text(); };
  const has = (html, sentences, label) => { for (const s of sentences) assert.ok(html.includes(s), `${label} lacks "${s}"`); };
  const lacks = (html, sentences, label) => { for (const s of sentences) assert.ok(!html.includes(s), `${label} says "${s}"`); };

  const ENGLISH_ONLY = ['Ask for help', 'Tell us what', 'Find platform help', 'Search help', 'For example', 'My requests', 'What do you need help with', 'Topic', 'Send request', 'Payment or refund', 'Someone is on it',
    'Nothing you write here', 'Conversation', 'Add to your request', 'Send reply', 'Withdraw', 'Closing is final', 'Opened:', 'Reason (', 'Support is not open', 'This request is closed', 'How this was resolved'];
  const STAFF_ONLY = ['data-support-staff', 'Answer this request', 'Triage', 'Mark resolved', 'Internal note', 'priority High', 'Synthetic agent', 'Close this case', 'Assign to me'];

  // ------------------------------------------------------- /support, English
  let full = await page('/support', { 'accept-language': 'en' });
  let en = inner(full);
  has(en, [
    '<div class="page support-page">', '<a href="/">Home</a>', '<p class="eyebrow">Support</p>', '<h1>Ask for help</h1>',
    'Tell us what is not working. A person reads every request. There is no bot in front of this queue.',
    '<h2>Find platform help</h2>', 'Nothing here writes an answer for you, and nothing here is a religious ruling.',
    '<label for="help-search">Search help</label>', 'placeholder="For example: courses"',
    '<strong dir="auto">Finding your courses</strong>', '<p class="support-article" dir="auto">Open My learning.\nEvery course you are enrolled in is there.</p>',
    '<strong dir="auto">استرداد المبلغ</strong>',
    '<section class="card" data-support-form="open"><h2>What do you need help with?</h2>',
    '<option value="account" selected="">My account</option>', '<option value="payment">Payment or refund</option>', '<option value="other">Something else</option>',
    'placeholder="For example: charged twice for one course"', '>What happened?</label>',
    'id="support-body-limit">The most characters it can hold: 4,000</span>',
    '<button type="button" class="btn">Send request</button>',
    '<h2>My requests</h2>', '<a href="/support/SC-000007"><strong dir="auto">Synthetic: charged twice</strong></a>',
    '<span class="muted support-facts"><bdi dir="ltr">SC-000007</bdi><span>Payment or refund</span><bdi>Nov 20, 2026</bdi></span>',
    '<span class="badge warn">Someone is on it</span>',
    'Nothing you write here is published.',
  ], 'the English help page');
  assert.equal((en.match(/<option /g) ?? []).length, 7, 'the form does not offer seven topics');
  assert.equal(en.includes('{'), false, 'a gap in an English sentence was left unfilled');
  lacks(en, STAFF_ONLY, 'the help page');

  // -------------------------------------------------------- /support, Arabic
  full = await page('/support', { 'accept-language': 'ar' });
  let ar = inner(full);
  assert.match(htmlRoot(full), /lang="ar"/); assert.match(htmlRoot(full), /dir="rtl"/);
  has(ar, [
    '<div class="page support-page">', '<p class="eyebrow">الدعم</p>', '<h1>اطلب المساعدة</h1>',
    'أخبرنا بما لا يعمل. كل طلب يقرؤه إنسان. لا يوجد برنامج آلي أمام هذا الطابور.',
    '<h2>ابحث في مساعدة المنصة</h2>', 'ابحث في تعليمات استخدام AyahSpring.', 'placeholder="مثلًا: الدورات"',
    // What a member of staff wrote in English stays as written, in its own direction.
    '<strong dir="auto">Finding your courses</strong>',
    '<h2>بماذا تحتاج إلى المساعدة؟</h2>', '<option value="payment">دفع أو استرداد</option>',
    'placeholder="مثلًا: خُصم المبلغ مرتين لدورة واحدة"', 'أقصى عدد من الأحرف يتّسع له: ',
    '<button type="button" class="btn">أرسل الطلب</button>',
    '<h2>طلباتي</h2>', '<bdi dir="ltr">SC-000007</bdi><span>دفع أو استرداد</span>', '<span class="badge warn">أحدهم يعمل عليه</span>',
    'لا يُنشر شيء مما تكتبه هنا.',
  ], 'the Arabic help page');
  lacks(ar, [...ENGLISH_ONLY, '{', ...STAFF_ONLY], 'the Arabic help page');

  // -------------------------------------------------------- /support, French
  full = await page('/support', { 'accept-language': 'fr' });
  let fr = inner(full);
  assert.match(htmlRoot(full), /lang="fr"/);
  has(fr, ['<h1>Demander de l’aide</h1>', '<h2>Mes demandes</h2>', 'placeholder="Par exemple\u00a0: cours"', '<option value="payment">Paiement ou remboursement</option>',
    'Nombre maximal de caractères\u00a0: 4\u202f000', '<button type="button" class="btn">Envoyer la demande</button>', '<span class="badge warn">Quelqu’un s’en occupe</span>'], 'the French help page');
  lacks(fr, [...ENGLISH_ONLY, '{'], 'the French help page');

  // ------------------------------------ a language held for review: English
  full = await page('/support', { 'accept-language': 'ha' });
  assert.match(htmlRoot(full), /lang="ha"/);
  const held = inner(full);
  has(held, ['<div class="page support-page" lang="en" dir="ltr">', '<h1>Ask for help</h1>', '<h2>My requests</h2>'], 'a Hausa reader’s help page');

  // ------------------------------------------------ the switch, three ways
  state.open = false; state.cases = [];
  en = inner(await page('/support', { 'accept-language': 'en' }));
  has(en, ['<section class="card" data-support-state="paused"><h2>Support is not open right now</h2>', 'No new requests are being taken at the moment.', '<p class="muted">No requests on this account.</p>'], 'the help page with support off');
  lacks(en, ['data-support-form="open"', 'Send request', 'Nothing yet.'], 'the help page with support off');
  ar = inner(await page('/support', { 'accept-language': 'ar' }));
  has(ar, ['<h2>الدعم غير مفتوح الآن</h2>', 'لا طلبات في هذا الحساب.'], 'the Arabic help page with support off');
  // A switch that could not be read is not a switch that is off.
  state.open = 'broken';
  en = inner(await page('/support', { 'accept-language': 'en' }));
  has(en, ['data-support-form="open"', '<p class="muted">Nothing yet. If you need us, the form above is the way.</p>'], 'the help page with the switch unread');
  lacks(en, ['Support is not open right now'], 'the help page with the switch unread');
  state.open = true; state.cases = [caseRow()];
  // Help articles that could not be read are said to be unread, and the form stays.
  state.helpBroken = true;
  ar = inner(await page('/support', { 'accept-language': 'ar' }));
  has(ar, ['<p class="notice warn" data-support-help="unread">تعذّرت قراءة مقالات المساعدة الآن.</p>', 'data-support-form="open"'], 'the Arabic help page with the articles unread');
  lacks(ar, ['data-support-help="search"'], 'the Arabic help page with the articles unread');
  state.helpBroken = false;
  console.log('Help page: signed out goes to sign-in; English, Arabic and French each whole, with a staff-written article and a subject kept in their own direction; a held language is given English in a marked frame; support off says so and keeps the list; an unread switch still offers the form; unread articles are said to be unread.');

  // ------------------------------------------------- one request, English
  full = await page('/support/SC-000007', { 'accept-language': 'en' });
  en = inner(full);
  has(en, [
    '<a href="/support">Help</a>', '<bdi dir="ltr">SC-000007</bdi>',
    '<p class="eyebrow support-facts"><bdi dir="ltr">SC-000007</bdi><span>Payment or refund</span><span>Opened: <bdi>Nov 20, 2026</bdi></span></p>',
    '<h1 dir="auto">Synthetic: charged twice</h1>', '<span class="badge warn" data-support-status="assigned">Someone is on it</span>',
    '<h2>Conversation</h2>', `<span class="t support-said" dir="auto">I paid once and was charged twice.\nOrder ${LONG}</span>`,
    '<bdi>Synthetic learner</bdi><bdi>Nov 20, 2026, 8:05 AM UTC</bdi>',
    // Staff with no name on their profile are the platform, not a person.
    '<span>AyahSpring support</span><bdi>Nov 20, 2026, 10:00 AM UTC</bdi>',
    '<span class="t support-said" dir="auto">شكرًا، أنتظر ردّكم.</span>', '<span>You</span><bdi>Nov 20, 2026, 11:30 AM UTC</bdi>',
    '<section class="card" data-support-form="case"><h2>Add to your request</h2>', 'placeholder="Anything else we should know."',
    '<button type="button" class="btn">Send reply</button>', '<h3>Withdraw my request</h3>', '>Reason (it must be given)</label>',
    '<button type="button" class="btn ghost">Withdraw request</button>', 'Closing is final: neither side can reply afterwards.',
  ], 'the English request');
  lacks(en, [...STAFF_ONLY, 'A reply to a resolved request', '{'], 'the request as the person who asked sees it');

  // -------------------------------------------------- one request, Arabic
  full = await page('/support/SC-000007', { 'accept-language': 'ar' });
  ar = inner(full);
  has(ar, [
    '<bdi dir="ltr">SC-000007</bdi><span>دفع أو استرداد</span><span>فُتح في: <bdi>', '<h1 dir="auto">Synthetic: charged twice</h1>',
    '<span class="badge warn" data-support-status="assigned">أحدهم يعمل عليه</span>', '<h2>المحادثة</h2>',
    '<span>دعم AyahSpring</span>', '<span>أنت</span>',
    '<h2>أضف إلى طلبك</h2>', '<button type="button" class="btn">أرسل الرد</button>', '<h3>اسحب طلبي</h3>', '>السبب (لا بد من ذكره)</label>',
    '<button type="button" class="btn ghost">اسحب الطلب</button>', 'الإغلاق نهائي: لا يستطيع أي من الطرفين الرد بعده.',
  ], 'the Arabic request');
  lacks(ar, [...ENGLISH_ONLY, ...STAFF_ONLY, '{'], 'the Arabic request');

  // ------------------------------------------- resolved, and closed, in French
  state.cases = [caseRow({ status: 'resolved', resolved_at: '2026-11-22T09:00:00Z', resolution_note: 'The second charge was returned.' })];
  fr = inner(await page('/support/SC-000007', { 'accept-language': 'fr' }));
  has(fr, ['<span class="badge ok" data-support-status="resolved">Résolue</span>', '<section class="card" data-support-part="resolved"><h2>Comment cela a été résolu</h2><p dir="auto">The second charge was returned.</p>',
    'Si cela n’a pas réglé le problème, répondez ci-dessous et la demande est rouverte.', 'Répondre à une demande résolue la rouvre.', 'Ouverte le\u00a0: <bdi>'], 'a resolved request in French');
  fr = inner(await page('/support', { 'accept-language': 'fr' }));
  has(fr, ['<p class="muted support-said" dir="auto">The second charge was returned.</p>', '<span class="badge ok">Résolue</span>'], 'a resolved request in the French list');
  state.cases = [caseRow({ status: 'closed', closed_at: '2026-11-23T09:00:00Z', close_reason: 'Settled by phone.' })];
  fr = inner(await page('/support/SC-000007', { 'accept-language': 'fr' }));
  has(fr, ['<span class="badge neutral" data-support-status="closed">Fermée</span>', '<section class="card" data-support-part="closed"><h2>Fermée</h2><p class="muted" dir="auto">Settled by phone.</p>',
    '<section class="card" data-support-part="over"><h2>Cette demande est fermée</h2>', 'On ne peut pas répondre à une demande fermée.', '<a class="btn secondary" href="/support">Demander de l’aide</a>'], 'a closed request in French');
  lacks(fr, ['data-support-form="case"', 'Envoyer la réponse', 'Retirer la demande'], 'a closed request in French');
  state.cases = [caseRow()];

  // ---------------------------------------------- somebody else's: not found
  const absent = await request('/support/SC-999999', { cookie, 'accept-language': 'en' });
  assert.equal(absent.status, 404, 'a request the database does not return is not "not found"');

  // -------------------------------------------- staff: their part, in English
  state.staff = true;
  full = await page('/support/SC-000007', { 'accept-language': 'ar' });
  ar = inner(full);
  has(ar, ['<h2>المحادثة</h2>', '<div class="support-staff" lang="en" dir="ltr" data-support-staff="true">', 'Staff · priority High', 'with <bdi>Synthetic agent</bdi>',
    '<h2>Answer this request</h2>', 'Internal note — visible to staff only, never to the requester', 'Mark resolved', 'Close this case'], 'the request as staff see it, on an Arabic page');
  lacks(ar, ['data-support-form="case"', 'اسحب طلبي'], 'the request as staff see it');
  state.staff = false;
  console.log('One request: English and Arabic each whole, with the subject, both messages and the number kept in their own direction and every moment naming UTC; resolved and closed said in French, a closed one with no form; a request the database does not return is 404; staff get their part in a frame marked English, and the person who asked is sent none of it.');

  // ------------------------------------------------------------- the route
  const post = async (bodyValue, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/support`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(bodyValue), signal: AbortSignal.timeout(60000) });
    return { status: response.status, json: await response.json().catch(() => null) };
  };
  const OPEN = { action: 'open', category: 'payment', subject: 'Charged twice', body: 'Two charges.' };
  let answer = await post(OPEN, {});
  assert.equal(answer.status, 401);
  const rpc = (name) => calls.filter((c) => c.path === `/rest/v1/rpc/${name}`);
  calls.length = 0;
  for (const [bodyValue, code] of [[{ ...OPEN, category: 'telepathy' }, 'category'], [{ ...OPEN, subject: ' x ' }, 'subject_short'], [{ ...OPEN, subject: 'x'.repeat(201) }, 'too_long'],
    [{ ...OPEN, body: '   ' }, 'empty'], [{ ...OPEN, body: 'x'.repeat(4001) }, 'too_long']]) {
    answer = await post(bodyValue);
    assert.equal(answer.status, 400, code); assert.equal(answer.json.code, code);
  }
  assert.equal(rpc('open_support_case').length, 0, 'the database was asked to open a request the route had refused');
  answer = await post(OPEN);
  assert.equal(answer.status, 201); assert.equal(answer.json.id, 'c0ffee00-0000-4000-8000-000000000001');
  assert.deepEqual(rpc('open_support_case')[0].payload, { p_category: 'payment', p_subject: 'Charged twice', p_body: 'Two charges.', p_learner_profile_id: null, p_order_id: null });
  // The switch off: refused by name before the database is asked.
  state.open = false; calls.length = 0;
  answer = await post(OPEN);
  assert.equal(answer.status, 409); assert.equal(answer.json.code, 'flag_disabled'); assert.equal(rpc('open_support_case').length, 0);
  // The switch unread: the database is asked, and its refusal carries the same name.
  state.open = 'broken'; state.write = 'off'; calls.length = 0;
  answer = await post(OPEN);
  assert.equal(answer.status, 409); assert.equal(answer.json.code, 'flag_disabled'); assert.equal(rpc('open_support_case').length, 1);
  state.open = true;
  state.write = 'five'; answer = await post(OPEN);
  assert.equal(answer.status, 409); assert.equal(answer.json.code, 'too_many');
  state.write = 'account'; answer = await post(OPEN);
  assert.equal(answer.status, 403); assert.equal(answer.json.code, undefined);
  // An answer with no state: not a refusal, and the route does not call it one.
  state.write = 'gateway'; answer = await post(OPEN);
  assert.equal(answer.status, 502); assert.equal(answer.json.code, undefined);
  assert.equal(JSON.stringify(answer.json).includes('SYNTHETIC gateway'), false, 'a gateway’s page is sent on to the browser');
  const CASE = caseRow().id;
  state.write = 'ok'; calls.length = 0;
  answer = await post({ action: 'reply', caseId: CASE, body: ' More. ', isInternal: true });
  assert.equal(answer.status, 200);
  // A requester cannot write a note for staff, whatever the request says.
  assert.deepEqual(rpc('reply_to_support_case')[0].payload, { p_case_id: CASE, p_body: 'More.', p_is_internal: false });
  answer = await post({ action: 'reply', caseId: CASE, body: '' });
  assert.equal(answer.status, 400); assert.equal(answer.json.code, 'empty');
  state.write = 'missing'; answer = await post({ action: 'reply', caseId: CASE, body: 'More.' });
  assert.equal(answer.status, 404); assert.equal(answer.json.code, 'not_found');
  state.write = 'closed'; answer = await post({ action: 'reply', caseId: CASE, body: 'More.' });
  assert.equal(answer.status, 409); assert.equal(answer.json.code, undefined);
  state.write = 'ok';
  answer = await post({ action: 'close', caseId: CASE, reason: '' });
  assert.equal(answer.status, 400); assert.equal(answer.json.code, 'empty');
  answer = await post({ action: 'close', caseId: CASE, reason: 'Found it.' });
  assert.equal(answer.status, 200);
  assert.deepEqual(rpc('close_support_case').at(-1).payload, { p_case_id: CASE, p_reason: 'Found it.' });
  console.log('Support route: signed out 401; five mistakes each 400 with a name and the database not asked; a request opened; the switch off refused by name without asking the database, and the database’s own refusal given the same name when the switch could not be read; five open requests, a missing request and an empty reply each by name; a closed request and a closed account refused with no name; an answer with no state is 502, not a refusal; a requester’s reply is never a staff note.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (path, code, width, a11y) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
        ...(a11y ? [{ name: 'ayahspring_a11y', value: a11y, url: origin }] : []),
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      const sent = []; tab.on('request', (r) => { if (r.url().endsWith('/api/support') && r.method() === 'POST') sent.push(r.postDataJSON()); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent };
    };
    const fits = async (tab, width, label) => {
      const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
      // Name what sticks out, so the failure says where to look.
      const wide = scroll <= width + 1 ? [] : await tab.evaluate((limit) => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > limit + 1 || r.left < -1; }).map((el) => `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 40)}"`).slice(0, 6), width);
      assert.ok(scroll <= width + 1, `${label}: the page scrolls sideways (${scroll}): ${wide.join(' | ')}`);
      const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => (el.textContent ?? '').slice(0, 40)));
      assert.deepEqual(spill, [], `${label}: a card's contents are wider than the card`);
    };
    for (const [code, heading] of [['en', 'Ask for help'], ['ar', 'اطلب المساعدة'], ['fr', 'Demander de l’aide']]) {
      for (const [width, a11y] of [[320, null], [320, 'v1.larger.normal.system.dyslexic'], [390, null], [1440, null]]) {
        const label = `${code} ${width}${a11y ? ' largest text and the dyslexia font' : ''}`;
        let { context, tab, errors } = await open('/support', code, width, a11y);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: heading, exact: true, level: 1 }).count(), 1, `${label}: heading`);
        await fits(tab, width, `${label} /support`);
        assert.deepEqual(errors, [], `${label}: page errors`);
        if (process.env.RESPONSIVE_SCREENSHOTS && !a11y && [390, 1440].includes(width)) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/support-${code}-${width}.png`, fullPage: true });
        await context.close();
        // One request, with an order number nobody can break at a space.
        ({ context, tab, errors } = await open('/support/SC-000007', code, width, a11y));
        await fits(tab, width, `${label} /support/SC-000007`);
        assert.deepEqual(errors, [], `${label}: page errors on a request`);
        if (process.env.RESPONSIVE_SCREENSHOTS && !a11y && [390, 1440].includes(width)) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/support-case-${code}-${width}.png`, fullPage: true });
        await context.close();
      }
      console.log(`Synthetic help page and one request in ${code}: fit at 320, 390 and 1440px, and at 320px with the largest text and the dyslexia font; no card wider than itself.`);
    }
    // What staff see, on a phone.
    state.staff = true;
    for (const code of ['en', 'ar']) {
      const { context, tab, errors } = await open('/support/SC-000007', code, 320, null);
      await fits(tab, 320, `${code} 320 staff`);
      assert.equal(await tab.locator('[data-support-staff]').evaluate((el) => getComputedStyle(el).direction), 'ltr', `${code}: the staff part is not left to right`);
      assert.deepEqual(errors, []);
      await context.close();
    }
    state.staff = false;

    // The search, in Arabic: it finds a word, and says so when it finds none.
    {
      const { context, tab, errors } = await open('/support', 'ar', 390, null);
      const list = tab.locator('[data-support-help="search"] .lessons > li');
      assert.equal(await list.count(), 2);
      await tab.locator('#help-search').fill('courses');
      assert.equal(await list.count(), 1);
      await tab.locator('#help-search').fill('zzzz');
      await tab.locator('[data-support-help="search"]').getByRole('status').filter({ hasText: 'لا يوجد مقال مساعدة مطابق.' }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }

    // The form that opens a request, in Arabic.
    {
      const { context, tab, errors, sent } = await open('/support', 'ar', 390, null);
      const form = tab.locator('[data-support-form="open"]');
      const send = form.getByRole('button', { name: 'أرسل الطلب', exact: true });
      const alerts = form.getByRole('alert');
      const said = async (sentence) => {
        await send.click();
        await alerts.filter({ hasText: sentence }).waitFor();
        assert.equal(await alerts.count(), 1, 'more than one thing is announced');
        const text = await tab.locator('main').textContent();
        for (const words of [...DATABASE_WORDS, 'was not sent', 'Nobody can say', 'Add a short subject', 'Describe the problem', '{']) assert.equal(text.includes(words), false, `said in English or in the database's words: ${words}`);
      };
      // Two mistakes named before anything leaves the browser.
      await said('أضف عنوانًا قصيرًا ليعرف الفريق موضوع الطلب.');
      await tab.locator('#support-subject').fill('خُصم المبلغ مرتين');
      await said('صف المشكلة: ماذا حدث، وماذا كنت تتوقع.');
      assert.equal(sent.length, 0, 'a request with an empty box was sent');
      await tab.locator('#support-body').fill('دفعت مرة واحدة.');
      await form.locator('#support-category').selectOption('payment');
      state.write = 'five'; await said('لديك خمسة طلبات مفتوحة. انتظر ردًّا، أو اسحب أحدها، قبل إرسال طلب آخر.');
      state.write = 'off'; await said('الدعم لا يستقبل الطلبات الآن، فلم يُرسل هذا.');
      state.write = 'account'; await said('رُفض ذلك، ولم يُرسل شيء.');
      // An answer nobody can read: "nobody can say", and never "refused".
      state.write = 'gateway'; await said('لا أحد يستطيع أن يقول هل أُرسل ذلك. انظر إلى طلباتك أدناه قبل إرساله من جديد.');
      // What was typed is still there after every refusal.
      assert.equal(await tab.locator('#support-body').inputValue(), 'دفعت مرة واحدة.');
      const before = sent.length;
      await context.setOffline(true);
      await said('لا أحد يستطيع أن يقول هل أُرسل ذلك.');
      await context.setOffline(false);
      assert.equal(sent.length, before + 1);
      state.write = 'ok';
      await send.click();
      await form.getByRole('status').filter({ hasText: 'أُرسل. سيظهر ردّنا في هذه الصفحة.' }).waitFor();
      assert.equal(await alerts.count(), 0);
      assert.deepEqual(sent.at(-1), { action: 'open', category: 'payment', subject: 'خُصم المبلغ مرتين', body: 'دفعت مرة واحدة.' });
      assert.equal(await tab.locator('#support-body').inputValue(), '');
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic request form in Arabic: an empty subject and an empty box named before anything is sent; five open requests, support off and an unnamed refusal each said in Arabic; an unreadable answer and a lost connection said as "nobody can say"; what was typed is kept through every refusal and cleared when the request is sent.');
    }

    // Replying and withdrawing, in French.
    {
      const { context, tab, errors, sent } = await open('/support/SC-000007', 'fr', 390, null);
      const form = tab.locator('[data-support-form="case"]');
      const reply = form.getByRole('button', { name: 'Envoyer la réponse', exact: true });
      const withdraw = form.getByRole('button', { name: 'Retirer la demande', exact: true });
      const alerts = form.getByRole('alert');
      const said = async (button, sentence) => {
        await button.click();
        await alerts.filter({ hasText: sentence }).waitFor();
        assert.equal(await alerts.count(), 1, 'more than one thing is announced');
        const text = await tab.locator('main').textContent();
        for (const words of [...DATABASE_WORDS, 'Write a reply', 'needs a written reason', 'Nobody can say', '{']) assert.equal(text.includes(words), false, `said in English or in the database's words: ${words}`);
      };
      await said(reply, 'Écrivez d’abord une réponse.');
      await said(withdraw, 'Écrivez d’abord la raison.');
      assert.equal(sent.length, 0);
      await form.locator('textarea').fill('Encore ceci.');
      state.write = 'closed'; await said(reply, 'Cela ne peut pas être fait sur cette demande dans son état actuel. Rechargez la page pour voir où elle en est.');
      state.write = 'missing'; await said(reply, 'Cette demande est désormais introuvable.');
      state.write = 'off'; await said(reply, 'L’assistance n’accepte pas de demandes pour l’instant\u00a0; ceci n’a donc pas été envoyé.');
      state.write = 'gateway'; await said(reply, 'Personne ne peut dire si cela a été enregistré. Rechargez la page et regardez la conversation avant de réessayer.');
      assert.equal(await form.locator('textarea').inputValue(), 'Encore ceci.');
      state.write = 'ok';
      await reply.click();
      await form.getByRole('status').filter({ hasText: 'Réponse envoyée.' }).waitFor();
      assert.deepEqual(sent.at(-1), { caseId: CASE, action: 'reply', body: 'Encore ceci.' });
      assert.equal(await form.locator('textarea').inputValue(), '');
      await form.locator('input').fill('J’ai trouvé.');
      await withdraw.click();
      await form.getByRole('status').filter({ hasText: 'Retirée. La demande est maintenant fermée.' }).waitFor();
      assert.deepEqual(sent.at(-1), { caseId: CASE, action: 'close', reason: 'J’ai trouvé.' });
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic reply and withdrawal in French: an empty reply and an empty reason named before anything is sent; a closed request, a missing one and support off each said in French; an unreadable answer said as "nobody can say"; a reply sent and a request withdrawn, each said once.');
    }
  }
  console.log('Support HTTP smoke passed. Not real Auth, RLS or the support functions; no request reached a person, and no speaker has read the translations.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
