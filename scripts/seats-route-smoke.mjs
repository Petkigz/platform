// Real Next /institution/claim and /institution/seats pages and the
// /api/institution/claim route against an entirely synthetic loopback
// Auth/REST API. This is not evidence about hosted Supabase, JWT validation,
// RLS, or the rules inside claim_institution_seat() or
// my_institution_seats(): the stand-in answers whatever it is asked, and
// refuses only when this script tells it to. No real school, code or learner
// is in it; every name, course and code here is invented, and no code is
// ever used on a real database.
//
// What it does show: the page a school's code is typed into, for an account
// with nobody else on it and for one with a child and another adult, in
// English, in Arabic and in English for a language held for review; that
// nobody is chosen for the reader; that a list of learners that could not be
// read is said as that at status 200 with no form drawn; what the page says
// the school sees and can do; the page of what an institution bought for a
// member, for an administrator and when it could not be read; that what an
// administrator works with is drawn for nobody else and is marked as
// English; the name and status the route gives each refusal; that only the
// hash of a code reaches the database and only a title comes back; and that
// the database's own sentences reach nobody. The expected sentences are typed
// here rather than imported, so this fails if a catalogue changes without
// anybody looking at the page.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@synthetic.example', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;

// A sentence only the database would write. It must reach no reader.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE permission denied for table institution_seat_codes';
const INSTITUTION = '5b8f6b0e-6b56-4f0a-9d5e-1c9a52a0c001';
const ORDER = '6c9f7c1f-7c67-4a1b-8e6f-2d0b63b1d002';
const OWN = '1ca318e2-8b44-4a64-9b58-2af31ab941c7';
const CHILD = '7d1f2a30-1111-4222-8333-444455556666';
const SPOUSE = '9e2a3b41-aaaa-4bbb-8ccc-ddddeeeeffff';
// Ten characters of the alphabet a code is made from. It opens nothing.
const CODE = 'ABCDEFGHJK';
const HASH = createHash('sha256').update(CODE).digest('hex');
const LONG_TITLE = 'Synthetic-course-with-a-very-long-title-that-has-no-place-to-break-and-would-widen-a-narrow-screen';

const ALONE = [{ id: OWN, display_name: 'Synthetic Parent', learner_type: 'adult', linked_user_id: user.id }];
const FAMILY = [
  ...ALONE,
  { id: CHILD, display_name: 'Synthetic Child', learner_type: 'child', linked_user_id: null },
  { id: SPOUSE, display_name: 'Synthetic Spouse', learner_type: 'adult', linked_user_id: SPOUSE },
];
const NOBODY_BOUGHT = { seats: 0, claimed: 0, unissued: 0 };
const outside = { enabled: true, joined: false, isAdmin: false, orders: [], totals: NOBODY_BOUGHT };
const member = (enabled = true) => ({ enabled, joined: true, isAdmin: false, orders: [], totals: NOBODY_BOUGHT });
const admin = (enabled = true) => ({
  enabled, joined: true, isAdmin: true, institutionId: INSTITUTION,
  orders: [{
    orderId: ORDER, courseId: 'c-1', courseTitle: LONG_TITLE, versionNumber: 3, seats: 30, issued: 10, claimed: 3, voided: 1, remaining: 20,
    unitPriceMinor: 150000, currency: 'UGX', invoiceReference: 'SYNTHETIC-INVOICE-0001', purchasedOn: '2026-11-02', note: 'Synthetic note about the order',
    codes: [
      { id: 'k-1', tail: '4F2A', issuedAt: '2026-11-03T08:00:00+00:00', claimed: true, claimedAt: '2026-11-04T09:00:00+00:00', voided: false, voidedReason: null },
      { id: 'k-2', tail: '9XQZ', issuedAt: '2026-11-03T08:00:00+00:00', claimed: false, claimedAt: null, voided: false, voidedReason: null },
      { id: 'k-3', tail: '7MNP', issuedAt: '2026-11-03T08:00:00+00:00', claimed: false, claimedAt: null, voided: true, voidedReason: 'Synthetic reason' },
    ],
  }],
  totals: { seats: 30, claimed: 3, unissued: 20 },
});
const CLAIMED = { courseId: 'c-1', courseTitle: 'Synthetic Tajwid', courseSlug: 'synthetic-tajwid', versionNumber: 3, learnerProfileId: CHILD, orderId: ORDER };

const fresh = () => ({
  // What the learner list answers.
  learners: FAMILY,
  // What my_institution_seats() answers.
  seats: member(),
  // Paths that answer with a database error.
  broken: new Set(),
  // What claim_institution_seat() answers: 'ok', an object to answer with, or [status, body].
  claim: 'ok',
  // How long it takes.
  delay: 0,
});
let state = fresh();

const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  const signedIn = req.headers.authorization === `Bearer ${token}`;
  if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(401); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, query: url.search, signedIn, raw: body });
  const send = (value) => res.end(JSON.stringify(value));
  if (state.broken.has(path)) { res.writeHead(500); send({ code: 'XX000', message: DATABASE_SENTENCE }); return; }
  if (path === '/rest/v1/rpc/setting_bool') { send(false); return; }
  if (!signedIn) { res.writeHead(401); res.end('{}'); return; }
  if (path === '/rest/v1/learner_profiles') send(state.learners);
  else if (path === '/rest/v1/rpc/my_institution_seats') send(state.seats);
  else if (path === '/rest/v1/rpc/claim_institution_seat') {
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
    if (state.claim === 'ok') send(CLAIMED);
    else if (Array.isArray(state.claim)) { res.writeHead(state.claim[0]); send(state.claim[1]); }
    else send(state.claim);
  }
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path.startsWith('/rest/v1/rpc/')) send({});
  else send([]);
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = resolve(import.meta.dirname, '..');
const rpcs = (name) => calls.filter((c) => c.path === `/rest/v1/rpc/${name}`);
const refusal = (status, code, message) => [status, { code, message, details: null, hint: null }];
const noAnswer = [503, { message: 'SYNTHETIC-DATABASE upstream connect error' }];

const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const seen = { logs: '' };
const origin = `http://localhost:${port}`;

// The page itself: what is inside <main>, without the scripts Next adds, the
// comments React puts between two pieces of text, or the entity it writes an
// apostrophe as.
const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'').replaceAll('&quot;', '"');
const has = (html, sentences, what) => { for (const sentence of sentences) assert.ok(html.includes(sentence), `${what} lacks "${sentence}"\n${html.slice(0, 9000)}`); };
const hasNot = (html, sentences, what) => { for (const sentence of sentences) assert.ok(!html.includes(sentence), `${what} still says "${sentence}"`); };
// What the database calls things. None of it is a sentence.
const STORED = ['SYNTHETIC-DATABASE', 'institution:', 'code_used', 'code_voided', 'not_your_learner', 'already_enrolled', 'seats_closed', '>adult<', '>child<', INSTITUTION, HASH];
// English a translated page must not hold. Names, titles and codes here all begin "Synthetic" or are Latin letters.
const ENGLISH_ONLY = ['Use a code', 'Type the code', 'The school', 'Your code', 'Ten letters', 'Who is this', 'One code', 'Myself', 'This course', 'could not be read', 'Use this code', 'My learning', 'Catalogue', 'Account settings', 'Institutions', 'Choose a learner', '(child)', 'Courses the', 'Codes from schools', 'Only the', 'You are a member', 'Your institution', 'Seats', 'Claim'];
// What only an administrator is shown.
const ADMIN_ONLY = ['data-inst-admin', 'seats bought', 'has not bought', 'A seat is one learner', 'Issue codes', 'How a school buys seats', 'SYNTHETIC-INVOICE', '4F2A', LONG_TITLE, 'Withdraw'];

const EN = {
  title: 'Use a code from a school',
  lede: 'Type the code the school gave you. It works once. It adds a course for the learner you choose, and you pay nothing.',
  sees: 'The school sees which of its codes have been used and when. It is not shown the learner’s name. If the school kept a note of who was given each code, it can tell that yours was used.',
  withdraw: 'The school can withdraw a code later. If it withdraws one that was used, the learner can no longer open the course. The work already done is kept.',
  help: 'Ten letters and numbers, on the letter or card from the school. Small letters and the dash do not matter. A code never has the letters I, L or O, and never a zero or a one.',
  forMe: 'This course will be added for you.',
  whoNote: 'One code is for one learner. Once it is used for one learner, it cannot be used for another.',
  unread: 'The learners on your account could not be read just now, so the code cannot be used here yet. Nothing was used. Try again in a moment.',
  seatsTitle: 'Courses the institution bought',
  seatsUnread: 'What your institution bought could not be read just now. This does not mean it bought nothing. Try again in a moment.',
  seatsOff: 'Codes from schools are switched off at the moment. Until they are switched on again, nothing new can be bought, no code can be given out and no code can be used. Courses already added by a code are not taken away.',
  memberTitle: 'Only the institution’s administrators see this page',
  memberBody: 'You are a member of this institution and not one of its administrators, so the courses it bought are not listed for you. If you were given a code, it is used on another page.',
};
const AR = {
  title: 'استخدام رمز من مدرسة',
  lede: 'اكتب الرمز الذي أعطتك إياه المدرسة. يعمل مرة واحدة. يضيف دورة للمتعلّم الذي تختاره، ولا تدفع شيئًا.',
  sees: 'ترى المدرسة أيّ رموزها استُخدم ومتى. لا يُعرض عليها اسم المتعلّم. إذا احتفظت المدرسة بسجلّ لمن أُعطي كل رمز، فبإمكانها أن تعرف أن رمزك استُخدم.',
  withdraw: 'يمكن للمدرسة أن تسحب رمزًا لاحقًا. إذا سحبت رمزًا استُخدم، لا يستطيع المتعلّم فتح الدورة بعد ذلك. يبقى العمل الذي أُنجز محفوظًا.',
  code: 'رمزك',
  help: 'عشرة أحرف وأرقام، على الرسالة أو البطاقة من المدرسة. الأحرف الصغيرة والشرطة لا تهمّ. لا يحتوي الرمز أبدًا على الأحرف I أو L أو O، ولا على صفر أو واحد.',
  who: 'لمن هذه الدورة؟',
  whoNote: 'الرمز الواحد لمتعلّم واحد. إذا استُخدم لمتعلّم، لا يمكن استخدامه لآخر.',
  choose: 'اختر متعلّمًا',
  me: 'لي أنا',
  forMe: 'ستُضاف هذه الدورة لك.',
  unread: 'تعذّرت قراءة المتعلّمين في حسابك الآن، لذا لا يمكن استخدام الرمز هنا بعد. لم يُستخدم شيء. حاول مرة أخرى بعد قليل.',
  submit: 'استخدم هذا الرمز',
  working: 'جارٍ العمل…',
  doneWhere: 'ستجدها في صفحة التعلّم.',
  learning: 'تعلّمي',
  another: 'استخدم رمزًا آخر',
  unsure: 'لم نتمكّن من التأكّد من أن الرمز استُخدم. انظر في صفحة التعلّم قبل أن تحاول مرة أخرى.',
  failed: 'تعذّر تنفيذ ذلك. لم يتغيّر شيء.',
  signedOut: 'لقد سُجّل خروجك. سجّل الدخول وحاول مرة أخرى.',
  unknown: 'ليس لدينا رمز كهذا. راجعه على ما أعطتك المدرسة. لم يُستخدم شيء.',
  used: 'استُخدم هذا الرمز من قبل، والرمز يعمل مرة واحدة. إذا استخدمته أنت، فالدورة في صفحة التعلّم. وإن لم تستخدمه، فاطلب من المدرسة رمزًا آخر.',
  voided: 'سحبت المدرسة هذا الرمز. اطلب من المدرسة رمزًا غيره.',
  courseGone: 'الدورة التي يخصّها هذا الرمز لا يمكن الانضمام إليها الآن. لم يُستخدم الرمز، فيمكنك تجربته لاحقًا.',
  notYours: 'لا يمكنك استخدام رمز لهذا المتعلّم. لم يُستخدم الرمز.',
  already: 'هذا المتعلّم مسجّل من قبل في الدورة التي يخصّها هذا الرمز. لم يُستخدم الرمز، فيمكن استخدامه لمتعلّم آخر.',
  closed: 'لا يمكن استخدام رموز المدارس الآن. لم يُستخدم الرمز. حاول لاحقًا.',
  seatsTitle: 'الدورات التي اشترتها المؤسسة',
  seatsUnread: 'تعذّرت قراءة ما اشترته مؤسستك الآن. هذا لا يعني أنها لم تشترِ شيئًا. حاول مرة أخرى بعد قليل.',
  seatsOff: 'رموز المدارس موقوفة الآن. إلى أن تُشغَّل من جديد، لا يمكن شراء شيء جديد ولا إعطاء رمز ولا استخدام رمز. الدورات التي أُضيفت برمز من قبل لا تُسحب.',
  memberTitle: 'مسؤولو المؤسسة وحدهم يرون هذه الصفحة',
  memberBody: 'أنت عضو في هذه المؤسسة ولست من مسؤوليها، لذا لا تُعرض عليك الدورات التي اشترتها. إذا أُعطيت رمزًا، فهو يُستخدم في صفحة أخرى.',
  useCode: 'استخدم رمزًا',
  adminEnglish: 'الأجزاء أدناه خاصة بمسؤولي هذه المؤسسة وهي بالإنجليزية حاليًا.',
};
const crumbs = (account, institutions, here) => `<nav class="crumbs"><a href="/account">${account}</a><span aria-hidden="true">›</span><a href="/institution">${institutions}</a><span aria-hidden="true">›</span><span>${here}</span></nav>`;
const isolated = (name) => `\u2068${name}\u2069`;

let browser;
try {
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${seen.logs}`)), 60000);
    const receive = (chunk) => { seen.logs += chunk.toString(); if (seen.logs.includes('Ready in')) { clearTimeout(timeout); resolveReady(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (e) => { clearTimeout(timeout); reject(e); });
    next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${seen.logs}`)); });
  });

  const request = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  const whole = async (path, headers = {}, status = 200) => { const response = await request(path, headers); assert.equal(response.status, status, `${path}\n${seen.logs.slice(-2000)}`); return response.text(); };
  const page = async (path, code = 'en') => {
    const html = inner(await whole(path, { cookie, 'accept-language': code }));
    // Whatever the page says, it never says it in the database's words.
    hasNot(html, STORED, `${path} in ${code}`);
    return html;
  };
  const send = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/institution/claim`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    assert.equal(text.includes('SYNTHETIC-DATABASE'), false, `the route passed on a sentence that is not its own: ${text}`);
    return { status: response.status, json: JSON.parse(text) };
  };
  const expect = (answer, status, code, what) => {
    assert.equal(answer.status, status, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(answer.json.ok, false, what);
    assert.equal(answer.json.code, code, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(typeof answer.json.message, 'string', what);
    assert.deepEqual(Object.keys(answer.json).sort(), ['code', 'message', 'ok'], what);
  };

  // ------------------------------------------------- the page a code is used on
  // Signed out: sent to sign in, and nothing is asked of the database.
  calls.length = 0;
  let away = await request('/institution/claim', { 'accept-language': 'en' });
  assert.equal(away.status, 307);
  assert.equal(new URL(away.headers.get('location'), origin).pathname + new URL(away.headers.get('location'), origin).search, '/sign-in?next=/institution/claim');
  assert.equal(calls.filter((c) => c.path === '/rest/v1/learner_profiles').length, 0);

  // An account with nobody else on it: told who the course is for, asked nothing.
  state = fresh(); state.learners = ALONE;
  let full = await whole('/institution/claim', { cookie, 'accept-language': 'en' });
  assert.match(full, /<html[^>]*lang="en"[^>]*dir="ltr"/);
  assert.match(full, /<title>Use a code from a school/);
  let html = await page('/institution/claim');
  has(html, [
    `<div class="page narrow inst-page">${crumbs('Account settings', 'Institutions', EN.title)}`,
    `<h1>${EN.title}</h1><p class="muted">${EN.lede}</p>`,
    'data-claim-state="form"', '<label for="seat-code">Your code</label>', 'placeholder="ABCDE-FGHJK"', 'dir="ltr"',
    `<p class="muted claim-help" id="seat-code-help">${EN.help}</p>`,
    `<p class="muted claim-help" data-claim-for="me">${EN.forMe}</p>`,
    `<p class="muted claim-note">${EN.sees}</p><p class="muted claim-note">${EN.withdraw}</p>`,
    '<a href="/learn">My learning</a> · <a href="/catalogue">Catalogue</a>',
  ], 'the page for an account on its own');
  hasNot(html, ['<select', 'Who is this course for?', 'not told', 'Claim a seat', 'no card', 'Synthetic Parent', 'data-claim-state="unread"'], 'the page for an account on its own');
  // Nothing can be pressed before a code is typed.
  assert.match(html, /<button type="submit" class="btn" disabled=""[^>]*data-claim-button="true">Use this code<\/button>/);
  // The list is asked for with the same four columns and two filters, and by nobody else's name.
  const asked = calls.filter((c) => c.path === '/rest/v1/learner_profiles').at(-1);
  assert.equal(asked.method, 'GET');
  assert.equal(new URLSearchParams(asked.query).get('select'), 'id,display_name,learner_type,linked_user_id');
  assert.equal(new URLSearchParams(asked.query).get('status'), 'eq.active');
  assert.equal(new URLSearchParams(asked.query).get('deleted_at'), 'is.null');

  // No learner at all yet: the same, because the database makes the account's own.
  state = fresh(); state.learners = [];
  html = await page('/institution/claim');
  has(html, [EN.forMe, 'data-claim-state="form"'], 'the page for an account with no learner yet');
  hasNot(html, ['<select'], 'the page for an account with no learner yet');

  // A child and another adult: asked who, with nobody chosen, and the account's own name not offered twice.
  state = fresh();
  html = await page('/institution/claim');
  has(html, [
    '<label for="seat-learner">Who is this course for?</label>',
    `<option value="" selected="">Choose a learner</option><option value="self">Myself</option><option value="${CHILD}">${isolated('Synthetic Child')} (child)</option><option value="${SPOUSE}">Synthetic Spouse</option></select>`,
    `<p class="muted claim-help" id="seat-learner-help">${EN.whoNote}</p>`,
  ], 'the page for an account with a family');
  hasNot(html, ['Synthetic Parent', EN.forMe, OWN], 'the page for an account with a family');

  // Unread, four ways: said as that at 200, and no form to spend a code on the wrong learner.
  for (const [what, set] of [
    ['a database error', (s) => s.broken.add('/rest/v1/learner_profiles')],
    ['a reply that is not a list', (s) => { s.learners = { SYNTHETIC: 'not what was asked for' }; }],
    ['a learner of a kind nobody knows', (s) => { s.learners = [...FAMILY, { id: CHILD, display_name: 'Synthetic Other', learner_type: 'pupil', linked_user_id: null }]; }],
    ['a learner with no name', (s) => { s.learners = [{ id: CHILD, display_name: null, learner_type: 'child', linked_user_id: null }]; }],
  ]) {
    state = fresh(); set(state);
    html = await page('/institution/claim');
    has(html, [`<div class="notice error" role="alert" data-claim-state="unread">${EN.unread}</div>`, EN.sees], `unread (${what})`);
    hasNot(html, ['<form', 'seat-code', '<select', EN.forMe, 'Use this code'], `unread (${what})`);
  }
  console.log('Code page: signed out is sent to sign in; an account on its own is told the course is for them and asked nothing; a family is asked who with nobody chosen; what the school sees and can withdraw is said; a list unread four ways is said at 200 with no form.');

  // Arabic.
  state = fresh();
  full = await whole('/institution/claim', { cookie, 'accept-language': 'ar' });
  assert.match(full, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
  assert.match(full, new RegExp(`<title>${AR.title}`));
  let ar = await page('/institution/claim', 'ar');
  has(ar, [
    `<div class="page narrow inst-page">${crumbs('إعدادات الحساب', 'المؤسسات', AR.title)}`,
    `<h1>${AR.title}</h1><p class="muted">${AR.lede}</p>`,
    `<label for="seat-code">${AR.code}</label>`, AR.help, `<label for="seat-learner">${AR.who}</label>`,
    `<option value="" selected="">${AR.choose}</option><option value="self">${AR.me}</option><option value="${CHILD}">${isolated('Synthetic Child')} (طفل)</option>`,
    AR.whoNote, `>${AR.submit}</button>`, AR.sees, AR.withdraw, `<a href="/learn">${AR.learning}</a>`,
  ], 'the code page in Arabic');
  hasNot(ar, ENGLISH_ONLY, 'the code page in Arabic');
  // The code is Latin letters whatever the page's direction.
  assert.match(ar, /<input[^>]*id="seat-code"[^>]*>/);
  assert.match(/<input[^>]*id="seat-code"[^>]*>/.exec(ar)[0], /dir="ltr"/);
  state = fresh(); state.learners = ALONE;
  ar = await page('/institution/claim', 'ar');
  has(ar, [AR.forMe], 'the code page in Arabic, alone');
  state = fresh(); state.broken.add('/rest/v1/learner_profiles');
  ar = await page('/institution/claim', 'ar');
  has(ar, [`data-claim-state="unread">${AR.unread}</div>`], 'the code page in Arabic, unread');
  hasNot(ar, ENGLISH_ONLY, 'the code page in Arabic, unread');
  // A language held for review reads this part in English, and the page says so.
  state = fresh();
  const ha = await page('/institution/claim', 'ha');
  has(ha, [`<div class="page narrow inst-page" lang="en" dir="ltr">${crumbs('Account settings', 'Institutions', EN.title)}`, EN.lede, 'Who is this course for?'], 'the code page for a held language');
  console.log('Code page in Arabic: the form, who it is for, what the school sees and unread all in Arabic with no other English and no stored word, the code’s own field left to right; a held language reads the page in English, marked.');

  // --------------------------------------------- the page of what was bought
  calls.length = 0;
  away = await request('/institution/seats', { 'accept-language': 'en' });
  assert.equal(away.status, 307);
  assert.equal(new URL(away.headers.get('location'), origin).search, '?next=/institution/seats');
  assert.equal(rpcs('my_institution_seats').length, 0);
  // Somebody who has not joined is sent to the institution page.
  state = fresh(); state.seats = outside;
  away = await request('/institution/seats', { cookie, 'accept-language': 'en' });
  assert.equal(away.status, 307);
  assert.equal(new URL(away.headers.get('location'), origin).pathname, '/institution');

  // A member.
  state = fresh();
  full = await whole('/institution/seats', { cookie, 'accept-language': 'en' });
  assert.match(full, /<title>Courses the institution bought/);
  html = await page('/institution/seats');
  has(html, [
    `<div class="page wide inst-page">${crumbs('Account settings', 'Institutions', EN.seatsTitle)}`,
    `<h1>${EN.seatsTitle}</h1>`,
    `<section class="card inst-card" data-seats-state="member"><h2>${EN.memberTitle}</h2><p class="muted">${EN.memberBody} <a href="/institution/claim">Use a code</a></p></section>`,
    '<p class="inst-code"><a href="/institution">Your institution</a></p>',
  ], 'the member’s page');
  // A member is not told what was or was not bought, and nothing of an administrator's is drawn.
  hasNot(html, [...ADMIN_ONLY, 'data-seats-off', 'nobody at the school', 'The parts below'], 'the member’s page');
  state = fresh(); state.seats = member(false);
  html = await page('/institution/seats');
  has(html, [`<div class="notice warn" role="status" data-seats-off="true">${EN.seatsOff}</div>`, EN.memberTitle], 'the member’s page with codes off');

  // An administrator.
  state = fresh(); state.seats = admin();
  html = await page('/institution/seats');
  has(html, [
    '<div class="inst-admin seats-admin" data-inst-admin="true" data-seats-state="admin"><p class="muted">30 seats bought · 3 claimed · 20 not yet issued</p>',
    'The school sees which of its codes have been claimed and when — never the learner, and never a name. A school that kept a note of who was given each code can therefore tell whose was claimed.',
    LONG_TITLE, 'Invoice SYNTHETIC-INVOICE-0001', 'Issue codes', '…4F2A — claimed', '…7MNP — voided: Synthetic reason', 'How a school buys seats',
  ], 'the administrator’s page');
  // In English nothing needs marking as English.
  hasNot(html, ['The parts below', 'lang="en"', EN.memberTitle, 'data-seats-off'], 'the administrator’s page');
  state = fresh(); state.seats = admin(false);
  html = await page('/institution/seats');
  has(html, [EN.seatsOff, 'data-seats-state="admin"'], 'the administrator’s page with codes off');
  // An administrator whose institution bought nothing is told so; nobody else is.
  state = fresh(); state.seats = { ...admin(), orders: [], totals: NOBODY_BOUGHT };
  html = await page('/institution/seats');
  has(html, ['Your institution has not bought any seats yet.'], 'an administrator with nothing bought');

  // Unread, four ways: said as that at 200, and never a redirect as though nobody had joined.
  for (const [what, set] of [
    ['a database error', (s) => s.broken.add('/rest/v1/rpc/my_institution_seats')],
    ['a reply that does not say whether this account has joined', (s) => { s.seats = { SYNTHETIC: 'not what was asked for' }; }],
    ['no reply', (s) => { s.seats = null; }],
    ['an administrator’s reply without its orders', (s) => { s.seats = { enabled: true, joined: true, isAdmin: true, totals: NOBODY_BOUGHT }; }],
  ]) {
    state = fresh(); set(state);
    html = await page('/institution/seats');
    has(html, [`<div class="notice error" role="alert" data-seats-state="unread">${EN.seatsUnread}</div>`, '<a href="/institution">Your institution</a>'], `unread (${what})`);
    hasNot(html, [...ADMIN_ONLY, EN.memberTitle, 'The seats could not be read'], `unread (${what})`);
  }

  // Arabic: a member, an administrator, unread.
  state = fresh(); state.seats = member(false);
  full = await whole('/institution/seats', { cookie, 'accept-language': 'ar' });
  assert.match(full, new RegExp(`<title>${AR.seatsTitle}`));
  ar = await page('/institution/seats', 'ar');
  has(ar, [
    `${crumbs('إعدادات الحساب', 'المؤسسات', AR.seatsTitle)}`, `<h1>${AR.seatsTitle}</h1>`, `data-seats-off="true">${AR.seatsOff}</div>`,
    `<h2>${AR.memberTitle}</h2><p class="muted">${AR.memberBody} <a href="/institution/claim">${AR.useCode}</a></p>`, '<a href="/institution">مؤسستك</a>',
  ], 'the member’s page in Arabic');
  hasNot(ar, [...ENGLISH_ONLY, ...ADMIN_ONLY], 'the member’s page in Arabic');
  state = fresh(); state.seats = admin();
  ar = await page('/institution/seats', 'ar');
  has(ar, [
    `<p class="muted inst-english">${AR.adminEnglish}</p><div class="inst-admin seats-admin" data-inst-admin="true" data-seats-state="admin" lang="en" dir="ltr"><p class="muted">30 seats bought`,
    `<h1>${AR.seatsTitle}</h1>`, 'Issue codes',
  ], 'the administrator’s page in Arabic');
  hasNot(ar.slice(0, ar.indexOf('<div class="inst-admin')) + ar.slice(ar.indexOf('<p class="inst-code">')), ENGLISH_ONLY, 'the administrator’s page in Arabic, outside the English block');
  state = fresh(); state.broken.add('/rest/v1/rpc/my_institution_seats');
  ar = await page('/institution/seats', 'ar');
  has(ar, [`data-seats-state="unread">${AR.seatsUnread}</div>`], 'unread in Arabic');
  hasNot(ar, ENGLISH_ONLY, 'unread in Arabic');
  console.log('Bought page: signed out and not joined are sent on; a member is told only administrators see it and where a code is used, and nothing of what was bought; an administrator’s orders and codes are drawn for nobody else, in a block marked English on an Arabic page; codes off is said to both; unread four ways is said at 200 and is not a redirect.');

  // ------------------------------------------------------------- the route
  // Signed out: the database is not asked.
  state = fresh(); calls.length = 0;
  expect(await send({ code: CODE }, {}), 401, 'not_signed_in', 'signed out');
  assert.equal(rpcs('claim_institution_seat').length, 0);
  // Not the shape of a code: refused here, and the database is not asked.
  for (const bad of [undefined, '', 'ABCDE', 'ABCDEFGHJKM', 'ABCDEFGHJO', 'ABCDEFGHJ1', 'ABCDE_FGHJK', 7, ['ABCDEFGHJK']]) {
    expect(await send({ code: bad }), 400, 'bad_code', `code ${JSON.stringify(bad)}`);
  }
  // Somebody who is not the shape of a learner: refused here, so a code is never spent on a guess.
  for (const bad of ['self', 'not-a-learner', 7, { id: CHILD }, `${CHILD}x`]) {
    expect(await send({ code: CODE, learnerProfileId: bad }), 403, 'not_your_learner', `learner ${JSON.stringify(bad)}`);
  }
  assert.equal(rpcs('claim_institution_seat').length, 0);
  // A body that is not JSON, and one that is not an object.
  let answer = await send('{not json');
  assert.equal(answer.status, 400); assert.equal(answer.json.ok, false);
  expect(await send('[]'), 400, 'bad_code', 'a body that is a list');
  assert.equal(rpcs('claim_institution_seat').length, 0);

  // A code as a person types it: only its hash reaches the database, and only the title comes back.
  for (const [typed, learner, sent] of [[CODE, undefined, null], ['abcde-fghjk', null, null], [' abcde fghjk ', '', null], ['ABCDE-FGHJK', CHILD.toUpperCase(), CHILD]]) {
    calls.length = 0;
    answer = await send({ code: typed, learnerProfileId: learner });
    assert.deepEqual(answer, { status: 200, json: { ok: true, courseTitle: 'Synthetic Tajwid' } }, `typed ${typed}`);
    const made = rpcs('claim_institution_seat');
    assert.equal(made.length, 1);
    assert.deepEqual(made[0].payload, { p_code_hash: HASH, p_learner: sent });
    assert.equal(calls.some((c) => (c.raw + c.query).toUpperCase().includes(CODE)), false, 'the code itself reached the database');
  }
  // A success that names no course is still a success.
  state = fresh(); state.claim = { courseId: 'c-1' };
  assert.deepEqual(await send({ code: CODE }), { status: 200, json: { ok: true, courseTitle: null } });

  // Each sentence the database raises, by name and status.
  for (const [state5, raised, status, code] of [
    ['42501', 'institution:not_signed_in', 401, 'not_signed_in'],
    ['0A000', 'institution:seats_closed', 503, 'seats_closed'],
    ['22023', 'institution:bad_code', 400, 'bad_code'],
    ['P0002', 'institution:code_unknown', 404, 'code_unknown'],
    ['23514', 'institution:code_voided', 410, 'code_voided'],
    ['23505', 'institution:code_used', 409, 'code_used'],
    ['23514', 'institution:course_unavailable', 409, 'course_unavailable'],
    ['42501', 'institution:not_your_learner', 403, 'not_your_learner'],
    ['23505', 'institution:already_enrolled', 409, 'already_enrolled'],
  ]) {
    state = fresh(); state.claim = refusal(400, state5, raised);
    expect(await send({ code: CODE, learnerProfileId: CHILD }), status, code, raised);
  }
  // A refusal with no name of ours, and a name from another part of the same route: refused, nothing changed.
  state = fresh(); state.claim = refusal(403, '42501', DATABASE_SENTENCE);
  expect(await send({ code: CODE }), 500, 'refused', 'an unnamed refusal');
  state = fresh(); state.claim = refusal(400, 'P0001', 'institution:last_admin');
  expect(await send({ code: CODE }), 500, 'refused', 'a name from another part');
  // No answer from the database: the code may be spent, and the route does not say it is not.
  state = fresh(); state.claim = noAnswer;
  answer = await send({ code: CODE });
  expect(answer, 502, 'unconfirmed', 'no answer');
  assert.doesNotMatch(answer.json.message, /Nothing was|not used/);
  console.log('Code route: signed out, nine shapes that are not a code and five that are not a learner reach no database; a code typed four ways reaches it as one hash and only a title comes back; each of the nine sentences using a code raises answered by name and status; an unnamed refusal and a name from another part 500, no answer 502 and not called unspent, with nothing of the database’s in any reply.');

  // ----------------------------------------------------------- in a browser
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const visit = async (path, code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: code, url: origin }]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      // A refused request is said on the console, and this script refuses on purpose.
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      const sent = []; tab.on('request', (r) => { if (r.url().includes('/api/institution')) sent.push(r.postDataJSON()); });
      // Nothing in the browser talks to the database itself.
      const direct = []; tab.on('request', (r) => { if (r.url().includes('/rest/v1/') || r.url().includes('/auth/v1/')) direct.push(r.url()); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent, direct };
    };
    // The caret is left alone: hiding it writes a style on each field, and on a
    // page that has just been loaded React reports that as a mismatch.
    const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png`, fullPage: true, caret: 'initial' }); };
    const fits = (tab) => tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    const direction = (tab, selector) => tab.evaluate((s) => getComputedStyle(document.querySelector(s)).direction, selector);

    for (const [code, title, bought, dir] of [['en', EN.title, EN.seatsTitle, 'ltr'], ['ar', AR.title, AR.seatsTitle, 'rtl'], ['ta', 'பள்ளி கொடுத்த குறியீட்டைப் பயன்படுத்துதல்', 'நிறுவனம் வாங்கிய பாடநெறிகள்', 'ltr']]) {
      for (const width of [320, 390, 1440]) {
        // The form, with a family to choose from.
        state = fresh();
        let { context, tab, errors } = await visit('/institution/claim', code, width);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: title, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        assert.equal(await direction(tab, 'main h1'), dir);
        assert.equal(await direction(tab, '#seat-code'), 'ltr');
        assert.equal(await tab.locator('#seat-learner').inputValue(), '');
        assert.ok(await fits(tab), `${code} ${width}: the code page is wider than the screen`);
        if ([390, 1440].includes(width)) await shot(tab, `seats-claim-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}: the code page`);
        await context.close();

        // A member, with codes switched off.
        state = fresh(); state.seats = member(false);
        ({ context, tab, errors } = await visit('/institution/seats', code, width));
        assert.equal(await tab.getByRole('heading', { name: bought, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        assert.equal(await tab.locator('[data-seats-state="member"]').count(), 1);
        assert.equal(await tab.locator('[data-inst-admin]').count(), 0);
        assert.ok(await fits(tab), `${code} ${width}: the member’s page is wider than the screen`);
        if (width === 390) await shot(tab, `seats-member-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}: the member’s page`);
        await context.close();

        // An administrator, with a title, an invoice and codes that have no place to break.
        state = fresh(); state.seats = admin();
        ({ context, tab, errors } = await visit('/institution/seats', code, width));
        assert.equal(await tab.locator('[data-inst-admin]').count(), 1);
        assert.equal(await direction(tab, '[data-inst-admin]'), 'ltr');
        assert.equal(await direction(tab, 'main h1'), dir);
        assert.equal(await tab.locator('.inst-english').count(), code === 'en' ? 0 : 1);
        assert.ok(await fits(tab), `${code} ${width}: the administrator’s page is wider than the screen`);
        if ([390, 1440].includes(width)) await shot(tab, `seats-admin-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}: the administrator’s page`);
        await context.close();
      }
    }
    console.log('Code page and bought page in a browser: English, Arabic and Tamil at 320, 390 and 1440; the form, a member and an administrator, nothing wider than the screen, the code’s field and the administrator’s block left to right on a right-to-left page.');

    // Using a code, in Arabic, for a child.
    {
      state = fresh();
      const { context, tab, errors, sent, direct } = await visit('/institution/claim', 'ar', 390);
      const field = tab.locator('#seat-code');
      const who = tab.locator('#seat-learner');
      const button = tab.locator('[data-claim-button]');
      const says = (text) => tab.locator('[data-claim-refusal]').filter({ hasText: text }).waitFor();
      assert.equal(await button.textContent(), AR.submit);

      // What is typed is reformed, and nothing can be pressed until somebody is chosen.
      assert.equal(await button.isDisabled(), true);
      await field.fill('abcde fghjk');
      assert.equal(await field.inputValue(), 'ABCDE-FGHJK');
      assert.equal(await button.isDisabled(), true, 'the button waits for a learner');
      await who.selectOption(CHILD);
      assert.equal(await button.isDisabled(), false);

      // Each refusal in Arabic, and what was typed is still there.
      for (const [state5, raised, sentence] of [
        ['P0002', 'institution:code_unknown', AR.unknown],
        ['23505', 'institution:code_used', AR.used],
        ['23514', 'institution:code_voided', AR.voided],
        ['23514', 'institution:course_unavailable', AR.courseGone],
        ['42501', 'institution:not_your_learner', AR.notYours],
        ['23505', 'institution:already_enrolled', AR.already],
        ['0A000', 'institution:seats_closed', AR.closed],
        ['42501', 'institution:not_signed_in', AR.signedOut],
        ['42501', DATABASE_SENTENCE, AR.failed],
      ]) {
        state.claim = refusal(400, state5, raised);
        await button.click();
        await says(sentence);
        assert.equal(await field.inputValue(), 'ABCDE-FGHJK', `${raised}: the field was cleared`);
        assert.equal(await who.inputValue(), CHILD);
        assert.equal(await button.isEnabled(), true);
      }
      await shot(tab, 'seats-claim-ar-390-refused');
      // No answer: it does not know, and says where to look.
      state.claim = noAnswer;
      await button.click();
      await says(AR.unsure);
      // The connection goes: the same, and the button comes back to life.
      state.claim = refusal(400, 'P0002', 'institution:code_unknown');
      await button.click(); await says(AR.unknown);
      await context.setOffline(true);
      await button.click();
      await says(AR.unsure);
      assert.equal(await button.isEnabled(), true, 'the button stays busy for good when the request cannot be made');
      await context.setOffline(false);
      assert.equal(await tab.locator('main').evaluate((m) => m.textContent.includes('SYNTHETIC-DATABASE') || m.textContent.includes('institution:')), false);

      // Pressed twice while the answer is on its way: one request, and the button says it is working.
      state.claim = 'ok'; state.delay = 700; calls.length = 0;
      const before = sent.length;
      await button.dblclick();
      await tab.locator('[data-claim-state="done"]').waitFor();
      assert.equal(rpcs('claim_institution_seat').length, 1, 'pressed twice, the code was sent twice');
      assert.deepEqual(sent.slice(before), [{ code: 'ABCDE-FGHJK', learnerProfileId: CHILD }]);
      assert.deepEqual(rpcs('claim_institution_seat')[0].payload, { p_code_hash: HASH, p_learner: CHILD });
      // Done: the title the database gave, kept in one piece, and where to find the course.
      const done = tab.locator('[data-claim-state="done"]');
      assert.equal(await done.locator('[role="status"]').textContent(), 'استُخدم الرمز. أُضيفت هذه الدورة: Synthetic Tajwid');
      assert.equal(await done.locator('bdi').textContent(), 'Synthetic Tajwid');
      assert.equal(await done.getByRole('link', { name: AR.learning, exact: true }).getAttribute('href'), '/learn');
      assert.ok(await fits(tab));
      await shot(tab, 'seats-claim-ar-390-done');

      // Another code: an empty field, and again nobody chosen.
      state.delay = 0;
      await done.getByRole('button', { name: AR.another, exact: true }).click();
      assert.equal(await field.inputValue(), '');
      assert.equal(await who.inputValue(), '');
      await field.fill('ABCDEFGHJK');
      assert.equal(await button.isDisabled(), true);
      // For oneself: no learner is named, and the database finds or makes the account's own.
      await who.selectOption('self');
      calls.length = 0; state.claim = { courseId: 'c-1' };
      await button.click();
      await tab.locator('[data-claim-state="done"]').waitFor();
      assert.deepEqual(rpcs('claim_institution_seat')[0].payload, { p_code_hash: HASH, p_learner: null });
      assert.equal(await tab.locator('[data-claim-state="done"] [role="status"]').textContent(), 'استُخدم الرمز وأُضيفت الدورة.');
      assert.deepEqual(direct, [], 'the browser talked to the database itself');
      assert.deepEqual(errors, []);
      await context.close();
    }
    // An account on its own, in English: asked nothing, and the code goes to no named learner.
    {
      state = fresh(); state.learners = ALONE;
      const { context, tab, errors } = await visit('/institution/claim', 'en', 390);
      assert.equal(await tab.locator('#seat-learner').count(), 0);
      assert.equal(await tab.locator('[data-claim-for="me"]').textContent(), EN.forMe);
      const button = tab.locator('[data-claim-button]');
      await tab.locator('#seat-code').fill('abcdefghjk');
      assert.equal(await button.isEnabled(), true);
      // A shape the route refuses is said, not sent on.
      await tab.locator('#seat-code').fill('abcdefghjo');
      calls.length = 0;
      await button.click();
      await tab.locator('[data-claim-refusal]').filter({ hasText: 'That is not the shape of a code. Check each letter and number against what the school gave you.' }).waitFor();
      assert.equal(rpcs('claim_institution_seat').length, 0);
      await tab.locator('#seat-code').fill('abcdefghjk');
      await button.click();
      await tab.locator('[data-claim-state="done"]').waitFor();
      assert.deepEqual(rpcs('claim_institution_seat')[0].payload, { p_code_hash: HASH, p_learner: null });
      assert.equal(await tab.locator('[data-claim-state="done"] [role="status"]').textContent(), 'The code was used. This course was added: Synthetic Tajwid');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Using a code in Arabic at 390: what is typed is reformed; nothing can be pressed until a learner is chosen; nine refusals said in Arabic with the code still in the field; no answer and no connection both say it is not known whether the code was used; pressed twice, one request; done names the course and where it is; another code starts with nobody chosen; for oneself no learner is named.');
  }
  console.log('Seats HTTP smoke passed. Not real Auth, RLS or the database’s own rules; every school, course, learner and code in it is invented, and no code was used on a real database.');
} catch (e) { console.error(seen.logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
