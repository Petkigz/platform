// Real Next /teach/apply page and the submit and withdraw actions of the
// /api/teaching/apply route against an entirely synthetic loopback Auth/REST
// API. This is not evidence about hosted Supabase, JWT validation, RLS, the
// table's own constraints, or the rules inside my_teaching_application(),
// submit_teaching_application() or withdraw_teaching_application(): the
// stand-in answers whatever it is asked, and refuses only when this script
// tells it to. No real applicant is in it; every name and sentence an
// applicant or an owner "typed" here is invented.
//
// What it does show: the page somebody is sent with applications open and
// closed, with an application waiting, refused, taken back and approved, and
// when they already teach, in English, in Arabic and in English for a
// language held for review; that what an applicant and an owner typed is
// drawn as written and marked as being in no known language; that an
// application that could not be read is said as unread at status 200, with no
// form, and is not "no application"; that what was typed is checked before
// the database is asked and the box is named; the name and status the route
// gives each refusal of sending and taking back; that the staff desk's action
// is answered as before; and that the database's own sentences reach nobody.
// The expected sentences are typed here rather than imported, so this fails
// if a catalogue changes without anybody looking at the page.
import assert from 'node:assert/strict';
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
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE permission denied for table teaching_applications';
const APPLICATION = '7c1d9f52-2a0b-4f36-8f4e-1c9a52a0d001';
const SENT_AT = '2026-11-20T09:14:00+00:00';
const DECIDED_AT = '2026-11-22T16:05:00+00:00';
const LONG_LINK = `https://video.example/${'synthetic-lesson-with-no-place-to-break-'.repeat(4)}end`;
const TYPED = {
  headline: 'Synthetic tajwid for children',
  // Two paragraphs, markup that must stay text, and Arabic inside English.
  qualifications: 'Synthetic ijazah in Hafs, given by a named teacher.\n\nSix years teaching <b>children</b> & adults. إجازة في رواية حفص',
  sampleUrl: LONG_LINK,
  note: 'Synthetic note: evenings, UTC+3',
};
const application = (status, more = {}) => ({
  id: APPLICATION, ...TYPED, status,
  decisionReason: null, submittedAt: SENT_AT, decidedAt: null, ...more,
});
const REASON = 'Synthetic reason: the sample lesson could not be opened.\nSend one the owner can watch.';
const board = (open, isInstructor, app = null) => ({ open, isInstructor, application: app });

const fresh = () => ({
  // What my_teaching_application() answers.
  board: board(true, false),
  // Paths that answer with a database error.
  broken: new Set(),
  // Paths that answer with something that is not what was asked for.
  nonsense: new Set(),
  // What the two writers answer: 'ok', or [status, body].
  submit: 'ok',
  withdraw: 'ok',
  // What any other writer answers.
  other: [200, {}],
  // How long a writer takes.
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
  calls.push({ method: req.method, path, payload, query: url.search, signedIn });
  const send = (value) => res.end(JSON.stringify(value));
  if (state.broken.has(path)) { res.writeHead(500); send({ code: 'XX000', message: DATABASE_SENTENCE }); return; }
  if (state.nonsense.has(path)) { send({ SYNTHETIC: 'not what was asked for' }); return; }
  if (path === '/rest/v1/rpc/setting_bool') { send(false); return; }
  if (!signedIn) { res.writeHead(401); res.end('{}'); return; }
  if (path === '/rest/v1/rpc/my_teaching_application') send(state.board);
  else if (path === '/rest/v1/rpc/submit_teaching_application' || path === '/rest/v1/rpc/withdraw_teaching_application') {
    const sending = path.endsWith('submit_teaching_application');
    const answer = sending ? state.submit : state.withdraw;
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
    if (answer === 'ok') {
      // What the writer would leave behind, so the page read again shows it.
      state.board = sending
        ? board(state.board.open, false, application('submitted', { headline: payload.p_headline, qualifications: payload.p_qualifications, sampleUrl: payload.p_sample_url, note: payload.p_note }))
        : board(state.board.open, false, application('withdrawn'));
      send(sending ? { applicationId: APPLICATION, status: 'submitted' } : { status: 'withdrawn' });
    } else { res.writeHead(answer[0]); send(answer[1]); }
  }
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else if (path.startsWith('/rest/v1/rpc/')) { res.writeHead(state.other[0]); send(state.other[1]); }
  else { res.writeHead(404); res.end('{}'); }
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
const moment = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: 'UTC' }).format(new Date(iso));
// English a translated page must not hold. Everything an applicant or an
// owner typed begins "Synthetic" here.
const ENGLISH_ONLY = ['Apply to teach', 'Teaching here', 'by appointment', 'The owner reads', 'could not be read', 'You already teach', 'Go to your courses', 'was approved', 'The note left', 'Your application', 'With the owner', 'Sent on', 'The answer will', 'The sample lesson', 'Take this', 'You can take', 'Not approved', 'You can send', 'You took', 'Applications are', 'What the owner', 'What would you', 'For example', 'What you know', 'In your own words', 'A link to', 'Anything else', '(optional)', 'Send to the owner', 'Account settings', 'Catalogue', 'My learning', 'Ask for help', 'Working', 'Submitted', 'waiting to be read', 'Sending this', 'Withdraw'];
// What the database calls things. None of it is a sentence.
const STORED = ['SYNTHETIC', 'teaching:', '>submitted<', '>declined<', '>withdrawn<', '>approved<', 'already_applied', 'applications_closed', APPLICATION];
const RULE = 'Teaching here is by appointment. Sending this asks the owner to consider you. It does not make you a teacher, and it creates no course and no page. Nothing you write here is published. If you are approved, every course you write is still reviewed before a learner sees it.';
const AS_WRITTEN = 'The owner reads what you write as you wrote it. It is not translated.';
const UNREAD = 'Your application could not be read. This page sent nothing and changed nothing.';
const HEAD = `<nav class="crumbs"><a href="/account">Account settings</a><span aria-hidden="true">›</span><span>Apply to teach</span></nav><div class="page-head"><h1>Apply to teach</h1><p class="tapply-rule">${RULE}</p></div>`;
const WAYS = '<p class="tapply-ways"><a class="btn secondary" href="/catalogue">Catalogue</a><a class="btn ghost" href="/learn">My learning</a></p>';
// What a person typed, as HTML: line breaks kept as they are, markup made text.
const KNOW_HTML = 'Synthetic ijazah in Hafs, given by a named teacher.\n\nSix years teaching &lt;b&gt;children&lt;/b&gt; &amp; adults. إجازة في رواية حفص';
const REASON_HTML = REASON;
const AR = {
  title: 'التقدّم للتدريس',
  rule: 'التدريس هنا بالتعيين. إرسال هذا الطلب يطلب من المالك أن ينظر في أمرك. لا يجعلك معلّمًا، ولا ينشئ دورة ولا صفحة. لا يُنشر شيء مما تكتبه هنا. وإن قُبل طلبك، فكل دورة تكتبها تُراجَع قبل أن يراها أي متعلّم.',
  asWritten: 'يقرأ المالك ما تكتبه كما كتبته. لا يُترجَم.',
  unread: 'تعذّرت قراءة طلبك. هذه الصفحة لم ترسل شيئًا ولم تغيّر شيئًا.',
};

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
  const page = async (code = 'en') => {
    const html = inner(await whole('/teach/apply', { cookie, 'accept-language': code }));
    // Whatever the page says, it never says it in the database's words.
    hasNot(html, STORED, `/teach/apply in ${code}`);
    return html;
  };
  const send = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/teaching/apply`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
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

  // ------------------------------------------------------------- the form
  // Signed out: sent to sign in, and nothing is asked of the database.
  calls.length = 0;
  const away = await request('/teach/apply', { 'accept-language': 'en' });
  assert.equal(away.status, 307);
  assert.equal(away.headers.get('location'), '/sign-in?next=/teach/apply');
  assert.equal(rpcs('my_teaching_application').length, 0);

  // Open, and nothing sent yet: the rule first, then four labelled boxes.
  calls.length = 0;
  const html = await whole('/teach/apply', { cookie, 'accept-language': 'en' });
  assert.match(html, /<title>Apply to teach[^<]*<\/title>/);
  let en = inner(html);
  assert.equal(rpcs('my_teaching_application').length, 1);
  has(en, [
    `<div class="page tapply-page">${HEAD}<section class="card tapply-card" data-tapply-state="form"><h2>What the owner reads</h2><p class="muted">${AS_WRITTEN}</p><form class="tapply-form" noValidate="" data-tapply-form="true">`,
    '<label for="teach-headline">What would you teach, in one line?</label><input id="teach-headline" type="text" dir="auto" maxLength="160" aria-describedby="teach-headline-hint" aria-invalid="false" value=""/><p class="muted tapply-hint" id="teach-headline-hint">For example: tajweed and Quran recitation for children.</p>',
    '<label for="teach-qualifications">What you know, and who you learned it from</label><textarea id="teach-qualifications" rows="5" dir="auto" maxLength="4000" aria-describedby="teach-qualifications-hint" aria-invalid="false"></textarea><p class="muted tapply-hint" id="teach-qualifications-hint">In your own words. A person checks a teacher’s qualifications here, so write what you would tell another teacher: for example an ijazah and who gave it, the years you have taught, and where.</p>',
    '<label for="teach-sample">A link to a sample lesson</label><input id="teach-sample" type="url" inputMode="url" dir="ltr" maxLength="500" placeholder="https://" aria-describedby="teach-sample-hint" aria-invalid="false" value=""/><p class="muted tapply-hint" id="teach-sample-hint">A link to a lesson you have recorded or streamed. The owner has to be able to watch it. A file cannot be uploaded here.</p>',
    '<label for="teach-note">Anything else <span class="muted">(optional)</span></label><textarea id="teach-note" rows="3" dir="auto" maxLength="1000" aria-describedby="teach-note-hint" aria-invalid="false"></textarea><p class="muted tapply-hint" id="teach-note-hint">For example the hours you can teach, your time zone and the languages you teach in.</p>',
    // The button can be pressed whatever is typed: a mistake is named, not greyed out.
    `<button type="submit" class="btn" aria-busy="false" data-tapply-button="submit">Send to the owner</button></form></section>${WAYS}</div>`,
  ], 'the form');
  hasNot(en, ['disabled', 'data-tapply-answer', 'data-tapply-refusal', 'Not approved', 'You took', 'Applications are closed'], 'the form');

  // Closed: said, with where to ask, and no form.
  state.board = board(false, false);
  en = await page();
  has(en, [`<div class="page tapply-page">${HEAD}<div class="notice" data-tapply-state="closed">Applications are closed at the moment, so nothing can be sent from this page. If you would like to teach here, ask the owner. <a href="/support">Ask for help</a></div>${WAYS}</div>`], 'the closed page');
  hasNot(en, ['<form', '<input', 'Send to the owner'], 'the closed page');
  console.log('Teach apply page: signed out sent to sign in with nothing asked; open, the appointment rule then four labelled boxes with their hints and a button that is never greyed out for what was typed; closed, said with where to ask and no form.');

  // ---------------------------------------------------------- an application
  // Waiting: what was sent, as it was typed, and how the answer will come.
  state.board = board(true, false, application('submitted'));
  en = await page();
  has(en, [
    `${HEAD}<section class="card tapply-card" data-tapply-state="waiting"><h2>Your application</h2><p><span class="badge neutral">With the owner, waiting to be read</span></p>`,
    `<dl class="tapply-sent"><dt>What would you teach, in one line?</dt><dd dir="auto" lang="">Synthetic tajwid for children</dd><dt>What you know, and who you learned it from</dt><dd class="tapply-written" dir="auto" lang="">${KNOW_HTML}</dd>`,
    // The link opens somewhere else and hands that site nothing.
    `<dt>The sample lesson you sent</dt><dd><a href="${LONG_LINK}" rel="noreferrer noopener" target="_blank" dir="ltr">${LONG_LINK}</a></dd><dt>Anything else</dt><dd class="tapply-written" dir="auto" lang="">Synthetic note: evenings, UTC+3</dd></dl>`,
    `<ul class="tapply-facts"><li>Sent on: <bdi>${moment('en', SENT_AT)}</bdi></li><li>${AS_WRITTEN}</li><li>The answer will be shown on this page. No message is sent when it comes, so look here again.</li><li>You can take it back at any time before it is answered. You do not have to say why.</li></ul>`,
    `<div class="tapply-ask" data-tapply-ask="withdraw"><button type="button" class="btn secondary" aria-busy="false" data-tapply-button="withdraw">Take this application back</button></div></section>${WAYS}</div>`,
  ], 'a waiting application');
  hasNot(en, ['<form', 'Send to the owner', '<b>children</b>'], 'a waiting application');
  // No note, and a link a browser should not be sent to: the address is text.
  state.board = board(true, false, application('submitted', { note: null, sampleUrl: 'javascript:alert(1)' }));
  en = await page();
  has(en, ['<dt>The sample lesson you sent</dt><dd><bdi dir="ltr">javascript:alert(1)</bdi></dd></dl>'], 'a link that is not one');
  hasNot(en, ['Anything else', 'href="javascript'], 'a link that is not one');
  // A date that is not one is not drawn, and nothing else goes with it.
  state.board = board(true, false, application('submitted', { submittedAt: 'SYNTHETIC-not-a-date' }));
  en = inner(await whole('/teach/apply', { cookie, 'accept-language': 'en' }));
  has(en, [`<ul class="tapply-facts"><li>${AS_WRITTEN}</li>`], 'an application with no date');
  hasNot(en, ['Sent on', 'Invalid Date'], 'an application with no date');

  // Refused: the owner's note as it was written, and the form again.
  state.board = board(true, false, application('declined', { decisionReason: REASON, decidedAt: DECIDED_AT }));
  en = await page();
  has(en, [
    `${HEAD}<div class="notice warn" data-tapply-answer="declined"><p><strong>Not approved this time.</strong> You can send another application.</p><p class="tapply-note-head">The note left for you, as it was written:</p><blockquote class="tapply-written" data-tapply-note="true" dir="auto" lang="">${REASON_HTML}</blockquote></div><section class="card tapply-card" data-tapply-state="form">`,
    'Send to the owner',
  ], 'a refused application');
  // Refused with applications closed: no promise that another can be sent.
  state.board = board(false, false, application('declined', { decisionReason: REASON, decidedAt: DECIDED_AT }));
  en = await page();
  has(en, ['<p><strong>Not approved this time.</strong></p><p class="tapply-note-head">', 'data-tapply-state="closed"'], 'refused, and closed');
  hasNot(en, ['You can send another', '<form'], 'refused, and closed');
  // Refused with no note left: nothing is announced that is not there.
  state.board = board(true, false, application('declined'));
  en = await page();
  hasNot(en, ['The note left', '<blockquote'], 'refused with no note');

  // Taken back: said, and the form again; closed, only closed.
  state.board = board(true, false, application('withdrawn'));
  en = await page();
  has(en, [`${HEAD}<div class="notice" data-tapply-answer="withdrawn">You took your application back. You can send a new one.</div><section class="card tapply-card" data-tapply-state="form">`], 'an application taken back');
  state.board = board(false, false, application('withdrawn'));
  en = await page();
  hasNot(en, ['You took your application back', 'You can send', '<form'], 'taken back, and closed');
  has(en, ['data-tapply-state="closed"'], 'taken back, and closed');

  // Approved: said, with the note, and the way to the courses.
  state.board = board(true, true, application('approved', { decisionReason: 'Synthetic welcome.', decidedAt: DECIDED_AT }));
  en = await page();
  has(en, [`${HEAD}<div class="notice info" data-tapply-state="teaches"><p><strong>Your application was approved.</strong></p><p class="tapply-note-head">The note left for you, as it was written:</p><blockquote class="tapply-written" data-tapply-note="true" dir="auto" lang="">Synthetic welcome.</blockquote><p>You already teach here, so there is nothing to apply for. <a href="/teach">Go to your courses</a></p></div>${WAYS}</div>`], 'an approved application');
  // A teacher appointed some other way: no approval is claimed, and an old refusal is not shown.
  state.board = board(true, true);
  en = await page();
  has(en, [`${HEAD}<div class="notice info" data-tapply-state="teaches"><p>You already teach here, so there is nothing to apply for. <a href="/teach">Go to your courses</a></p></div>`], 'somebody who teaches');
  state.board = board(false, true, application('declined', { decisionReason: REASON }));
  en = await page();
  hasNot(en, ['was approved', 'Not approved', 'Synthetic reason', '<form', 'Applications are closed'], 'a teacher with an old refusal');
  console.log('Teach apply states: waiting shows what was typed as written with markup made text, a link that opens elsewhere, and a script address as text; refused carries the owner’s note and offers another only while open; taken back; approved; a teacher appointed another way is not told an application was approved.');

  // ---------------------------------------------------------------- unread
  for (const [what, set] of [
    ['a database error', () => state.broken.add('/rest/v1/rpc/my_teaching_application')],
    ['a reply that is not one', () => state.nonsense.add('/rest/v1/rpc/my_teaching_application')],
    ['an empty reply', () => { state.board = null; }],
    ['a reply that does not say whether applications are open', () => { state.board = { isInstructor: false, application: null }; }],
    ['a reply that does not say whether this account teaches', () => { state.board = { open: true, application: null }; }],
  ]) {
    state = fresh(); set();
    en = await page();
    has(en, [`<div class="page tapply-page">${HEAD}<div class="notice error" role="alert" data-tapply-state="unread">${UNREAD}</div>${WAYS}</div>`], what);
    hasNot(en, ['<form', '<input', 'Send to the owner', 'Applications are closed', 'Take this application back'], what);
  }
  assert.match(seen.logs, /teach\/apply: the application could not be read: SYNTHETIC-DATABASE/, 'the database’s sentence was not logged');
  state = fresh();
  console.log('Teach apply unread: a database error, a reply that is not one, an empty reply and a reply missing either answer are each said as unread at 200 with no form, and are not "closed" or "no application"; the database’s sentence is logged and shown to nobody.');

  // ------------------------------------------------------------- in Arabic
  state.board = board(true, false);
  let ar = await page('ar');
  has(ar, [
    `<div class="page tapply-page"><nav class="crumbs"><a href="/account">إعدادات الحساب</a><span aria-hidden="true">›</span><span>${AR.title}</span></nav><div class="page-head"><h1>${AR.title}</h1><p class="tapply-rule">${AR.rule}</p></div><section class="card tapply-card" data-tapply-state="form"><h2>ما يقرؤه المالك</h2><p class="muted">${AR.asWritten}</p>`,
    '<label for="teach-headline">ماذا ستدرّس، في سطر واحد؟</label>',
    '<label for="teach-qualifications">ما تعرفه، وعمّن تعلّمته</label>',
    // An address reads left to right on any page.
    '<label for="teach-sample">رابط درس نموذجي</label><input id="teach-sample" type="url" inputMode="url" dir="ltr"',
    '<label for="teach-note">أي شيء آخر <span class="muted">(اختياري)</span></label>',
    '>أرسل إلى المالك</button>',
    '<a class="btn secondary" href="/catalogue">الدورات</a><a class="btn ghost" href="/learn">تعلّمي</a>',
  ], 'the form in Arabic');
  hasNot(ar, ENGLISH_ONLY, 'the form in Arabic');
  state.board = board(false, false);
  ar = await page('ar');
  has(ar, ['<div class="notice" data-tapply-state="closed">التقدّم للتدريس مغلق حاليًا، فلا يمكن إرسال شيء من هذه الصفحة. إن رغبت في التدريس هنا، فاسأل المالك. <a href="/support">اطلب المساعدة</a></div>'], 'closed in Arabic');
  hasNot(ar, ENGLISH_ONLY, 'closed in Arabic');
  state.board = board(true, false, application('submitted'));
  ar = await page('ar');
  has(ar, [
    '<h2>طلبك</h2><p><span class="badge neutral">لدى المالك، بانتظار القراءة</span></p>',
    // What was typed stays as typed, in whatever it was typed in.
    '<dd dir="auto" lang="">Synthetic tajwid for children</dd>',
    `<dt>الدرس النموذجي الذي أرسلته</dt><dd><a href="${LONG_LINK}" rel="noreferrer noopener" target="_blank" dir="ltr">`,
    `<li>أُرسل في: <bdi>${moment('ar', SENT_AT)}</bdi></li><li>${AR.asWritten}</li><li>سيظهر الرد في هذه الصفحة. لا تُرسَل رسالة عند وصوله، فعُد إلى هنا لتراه.</li><li>يمكنك سحبه في أي وقت قبل الرد عليه. ولا يلزمك ذكر السبب.</li>`,
    '>اسحب هذا الطلب</button>',
  ], 'waiting in Arabic');
  hasNot(ar.replaceAll(KNOW_HTML, '').replaceAll('Synthetic note: evenings, UTC+3', '').replaceAll('Synthetic tajwid for children', ''), ENGLISH_ONLY, 'waiting in Arabic');
  state.board = board(true, false, application('declined', { decisionReason: REASON }));
  ar = await page('ar');
  has(ar, [`<div class="notice warn" data-tapply-answer="declined"><p><strong>لم يُقبل هذه المرة.</strong> يمكنك إرسال طلب آخر.</p><p class="tapply-note-head">الملاحظة التي تُركت لك، كما كُتبت:</p><blockquote class="tapply-written" data-tapply-note="true" dir="auto" lang="">${REASON_HTML}</blockquote></div>`], 'refused in Arabic');
  hasNot(ar.replaceAll(REASON_HTML, ''), ENGLISH_ONLY, 'refused in Arabic');
  state.board = board(true, false, application('withdrawn'));
  ar = await page('ar');
  has(ar, ['<div class="notice" data-tapply-answer="withdrawn">سحبت طلبك. يمكنك إرسال طلب جديد.</div>'], 'taken back in Arabic');
  state.board = board(true, true, application('approved', { decisionReason: 'Synthetic welcome.' }));
  ar = await page('ar');
  has(ar, ['<p><strong>قُبل طلبك.</strong></p>', '<p>أنت تدرّس هنا بالفعل، فلا شيء تتقدّم له. <a href="/teach">انتقل إلى دوراتك</a></p>'], 'approved in Arabic');
  hasNot(ar.replaceAll('Synthetic welcome.', ''), ENGLISH_ONLY, 'approved in Arabic');
  state = fresh(); state.broken.add('/rest/v1/rpc/my_teaching_application');
  ar = await page('ar');
  has(ar, [`<div class="notice error" role="alert" data-tapply-state="unread">${AR.unread}</div>`], 'unread in Arabic');
  hasNot(ar, ENGLISH_ONLY, 'unread in Arabic');
  state = fresh();
  // A language held for review reads this page in English, and the page says so.
  const ha = await page('ha');
  has(ha, ['<div class="page tapply-page" lang="en" dir="ltr"><nav class="crumbs">', '<h2>What the owner reads</h2>', 'Send to the owner'], 'the page for a held language');
  console.log('Teach apply page in Arabic: the form, closed, waiting, refused, taken back, approved and unread all in Arabic with no other English and no stored word; what was typed stays as typed; a language held for review is sent English, marked as English.');

  // ---------------------------------------------------------------- the route
  const GOOD = { action: 'submit', headline: TYPED.headline, qualifications: 'Synthetic ijazah in Hafs from a named teacher.', sampleUrl: 'https://video.example/lesson', note: '' };
  const writers = () => calls.filter((c) => c.path.endsWith('_teaching_application') && !c.path.endsWith('my_teaching_application'));
  // Signed out: named, and no writer is asked.
  calls.length = 0;
  expect(await send(GOOD, {}), 401, 'not_signed_in', 'submit, signed out');
  expect(await send({ action: 'withdraw' }, {}), 401, 'not_signed_in', 'withdraw, signed out');
  assert.equal(writers().length, 0, 'a writer was asked for somebody signed out');
  // What was typed: each box named before the database is asked.
  for (const [change, name] of [
    [{ headline: ' abc ' }, 'headline_short'], [{ headline: undefined }, 'headline_short'], [{ headline: 'x'.repeat(161) }, 'headline_long'],
    [{ qualifications: 'Synthetic, short' }, 'qualifications_short'], [{ qualifications: 7 }, 'qualifications_short'], [{ qualifications: 'x'.repeat(4001) }, 'qualifications_long'],
    [{ sampleUrl: 'video.example/lesson' }, 'sample_not_link'], [{ sampleUrl: 'javascript:alert(1)' }, 'sample_not_link'], [{ sampleUrl: 'https://video.example/a lesson' }, 'sample_not_link'], [{ sampleUrl: `https://video.example/${'x'.repeat(500)}` }, 'sample_not_link'],
    [{ note: 'x'.repeat(1001) }, 'note_long'],
    // The first wrong box in the order of the form.
    [{ headline: '', qualifications: '', sampleUrl: '' }, 'headline_short'],
  ]) expect(await send({ ...GOOD, ...change }), 400, name, `submit with ${JSON.stringify(change).slice(0, 60)}`);
  assert.equal(writers().length, 0, 'the database was asked about an application this app knew it would refuse');
  // Each sentence the two writers raise, by name and by that name's own status.
  for (const [action, raised, sqlstate, status] of [
    ['submit', 'not_signed_in', '42501', 401], ['submit', 'applications_closed', '0A000', 403], ['submit', 'already_teaching', '23514', 409], ['submit', 'already_applied', '23505', 409],
    ['withdraw', 'nothing_to_withdraw', 'P0002', 409],
  ]) {
    state[action] = refusal(400, sqlstate, `teaching:${raised}`);
    expect(await send(action === 'submit' ? GOOD : { action }), status, raised, `${action} refused as ${raised}`);
    state = fresh();
  }
  // Two requests at one instant: the second is stopped by the index, and is told the same.
  state.submit = refusal(409, '23505', 'duplicate key value violates unique constraint "teaching_applications_one_open"');
  expect(await send(GOOD), 409, 'already_applied', 'the second of two at one instant');
  for (const action of ['submit', 'withdraw']) {
    const body = action === 'submit' ? GOOD : { action };
    // A refusal nobody named, one that belongs to the staff desk, and no answer at all.
    state[action] = refusal(403, '42501', DATABASE_SENTENCE);
    expect(await send(body), 500, 'refused', `${action}, an unnamed refusal`);
    state[action] = refusal(400, '42501', 'teaching:not_allowed');
    expect(await send(body), 500, 'refused', `${action}, a name that is not its own`);
    state[action] = noAnswer;
    expect(await send(body), 502, 'unconfirmed', `${action}, no answer`);
    // An answer that does not say it was done is not taken as done.
    state[action] = [200, { SYNTHETIC: 'not what was asked for' }];
    expect(await send(body), 502, 'unconfirmed', `${action}, an answer that says nothing`);
    state = fresh();
  }
  // Done: trimmed, an empty last box sent as nothing, and only "done" answered.
  calls.length = 0;
  let answer = await send({ ...GOOD, headline: `  ${TYPED.headline}  `, note: '   ' });
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, status: 'submitted' });
  assert.deepEqual(rpcs('submit_teaching_application').map((c) => c.payload), [{ p_headline: TYPED.headline, p_qualifications: GOOD.qualifications, p_sample_url: GOOD.sampleUrl, p_note: null }]);
  answer = await send({ action: 'withdraw' });
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, status: 'withdrawn' });
  assert.equal(rpcs('withdraw_teaching_application').length, 1);
  // The staff desk, which is still English, is answered as it was: a sentence, at 400.
  state = fresh(); state.other = refusal(400, '23514', 'teaching:already_decided');
  answer = await send({ action: 'decide', applicationId: APPLICATION, approve: false, reason: 'Synthetic reason' });
  assert.equal(answer.status, 400); assert.equal(answer.json.ok, false); assert.equal(answer.json.code, 'already_decided'); assert.equal(typeof answer.json.message, 'string');
  answer = await send({ action: 'decide', applicationId: APPLICATION, approve: true });
  assert.equal(answer.status, 400); assert.equal(answer.json.code, 'reason_required');
  state.other = [200, { status: 'declined', roleAssignmentId: null }];
  answer = await send({ action: 'decide', applicationId: APPLICATION, approve: false, reason: 'Synthetic reason' });
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, status: 'declined', roleAssignmentId: null });
  answer = await send({ action: 'decide', applicationId: APPLICATION, approve: false, reason: 'Synthetic reason' }, {});
  assert.equal(answer.status, 401); assert.deepEqual(answer.json, { ok: false, message: 'Sign in first.' });
  answer = await send({ action: 'SYNTHETIC-ACTION' });
  assert.equal(answer.status, 400); assert.deepEqual(answer.json, { ok: false, message: 'Unknown action.' });
  answer = await send('{not json');
  assert.equal(answer.status, 400);
  state = fresh();
  console.log('Teach apply route: signed out reaches no writer; twelve mistakes in what was typed named at 400 without asking the database; each of the five sentences sending and taking back raise answered by name and status; the second of two at one instant told the same as the first refusal; an unnamed refusal and a name from the staff desk 500, no answer and an answer that says nothing 502, with nothing of the database’s in any reply; the staff desk’s action answered as before.');

  // ----------------------------------------------------------- in a browser
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const visit = async (code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: code, url: origin }]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      // A refused request is said on the console, and this script refuses on purpose.
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      const sent = []; tab.on('request', (r) => { if (r.url().includes('/api/teaching/apply')) sent.push(r.postDataJSON()); });
      // Nothing in the browser talks to the database itself.
      const direct = []; tab.on('request', (r) => { if (r.url().includes('/rest/v1/') || r.url().includes('/auth/v1/')) direct.push(r.url()); });
      await tab.goto(`${origin}/teach/apply`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent, direct };
    };
    // The caret is left alone: hiding it writes a style on each field, and on a
    // page that has just been loaded React reports that as a mismatch.
    const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png`, fullPage: true, caret: 'initial' }); };
    const fits = (tab) => tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    const direction = (tab, selector) => tab.evaluate((s) => getComputedStyle(document.querySelector(s)).direction, selector);
    const focused = (tab) => tab.evaluate(() => document.activeElement?.id ?? '');

    for (const [code, title, dir] of [['en', 'Apply to teach', 'ltr'], ['ar', AR.title, 'rtl'], ['ta', 'கற்பிக்க விண்ணப்பிக்க', 'ltr']]) {
      for (const width of [320, 390, 1440]) {
        // The form.
        state = fresh();
        let { context, tab, errors } = await visit(code, width);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: title, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        assert.equal(await direction(tab, 'main h1'), dir);
        // Four boxes, each with a label of its own, and one button.
        for (const id of ['teach-headline', 'teach-qualifications', 'teach-sample', 'teach-note']) {
          assert.equal(await tab.locator(`main label[for="${id}"]`).count(), 1, `${code}: ${id} has no label`);
          assert.equal(await tab.locator(`#${id}`).isEditable(), true);
        }
        // An address is typed left to right on any page.
        assert.equal(await direction(tab, '#teach-sample'), 'ltr');
        assert.equal(await tab.locator('[data-tapply-button="submit"]').isEnabled(), true, 'the button is greyed out before anything is typed');
        assert.ok(await fits(tab), `${code} ${width}: the form is wider than the screen`);
        if ([390, 1440].includes(width)) await shot(tab, `teach-apply-form-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}`);
        await context.close();
        // Waiting: a link with no place to break does not widen the page.
        state = fresh(); state.board = board(true, false, application('submitted'));
        ({ context, tab, errors } = await visit(code, width));
        assert.equal(await tab.locator('[data-tapply-button="withdraw"]').count(), 1);
        assert.equal(await tab.locator('main form').count(), 0);
        // English typed on an Arabic page reads left to right, where it was typed.
        assert.equal(await direction(tab, '.tapply-sent dd'), 'ltr');
        assert.equal(await direction(tab, '.tapply-facts'), dir);
        assert.ok(await fits(tab), `${code} ${width}: a waiting application is wider than the screen`);
        if ([390, 1440].includes(width)) await shot(tab, `teach-apply-waiting-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}`);
        await context.close();
        // Refused: the note, then the form again.
        state = fresh(); state.board = board(true, false, application('declined', { decisionReason: REASON, decidedAt: DECIDED_AT }));
        ({ context, tab, errors } = await visit(code, width));
        assert.equal(await tab.locator('[data-tapply-note]').count(), 1);
        assert.equal(await tab.locator('[data-tapply-button="submit"]').count(), 1);
        assert.ok(await fits(tab), `${code} ${width}: a refused application is wider than the screen`);
        if (width === 390) await shot(tab, `teach-apply-declined-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}`);
        await context.close();
      }
    }
    console.log('Teach apply page in a browser: English, Arabic and Tamil at 320, 390 and 1440; the form, a waiting application and a refused one, nothing wider than the screen, every box labelled, the address box left to right on a right-to-left page.');

    // Sending, in Arabic.
    {
      state = fresh();
      const { context, tab, errors, sent, direct } = await visit('ar', 390);
      const form = tab.locator('[data-tapply-form]');
      const press = form.getByRole('button', { name: 'أرسل إلى المالك', exact: true });
      const says = (text) => form.locator('[data-tapply-refusal]').filter({ hasText: text }).waitFor();
      // A mistake is said under its own box, the box is described by it, and the caret is in the box.
      const wrong = async (id) => {
        assert.equal(await focused(tab), id, `the caret is not in ${id}`);
        assert.deepEqual(await form.locator('[aria-invalid="true"]').evaluateAll((all) => all.map((el) => el.id)), [id]);
        assert.equal(await tab.locator(`#${id}`).getAttribute('aria-describedby'), `${id}-hint ${id}-wrong`);
        assert.equal(await form.locator('[data-tapply-refusal]').evaluateAll((all) => all.map((el) => el.id).join()), `${id}-wrong`);
        assert.equal(await tab.evaluate((box) => document.getElementById(`${box}-hint`).nextElementSibling.id, id), `${id}-wrong`);
      };

      // Nothing typed: the first box is named, the caret is put in it, and nothing is sent.
      calls.length = 0;
      await press.click();
      await says('اذكر ما ستدرّسه في بضع كلمات.');
      await wrong('teach-headline');
      await shot(tab, 'teach-apply-form-ar-390-first-box');
      await tab.locator('#teach-headline').fill('تجويد القرآن للأطفال');
      await press.click();
      await says('اكتب جملة أو جملتين عمّا تعرفه وعمّن تعلّمته.');
      await wrong('teach-qualifications');
      await tab.locator('#teach-qualifications').fill('إجازة في رواية حفص عن عاصم، وست سنوات في تدريس الأطفال.');
      await tab.locator('#teach-sample').fill('video.example/lesson');
      await press.click();
      await says('هذا ليس رابطًا يستطيع المالك فتحه. الصق عنوان الدرس كاملًا، بلا مسافات.');
      await wrong('teach-sample');
      await shot(tab, 'teach-apply-form-ar-390-not-a-link');
      assert.deepEqual(sent, [], 'something was sent before the form was right');
      assert.equal(writers().length, 0, 'the database was asked before the form was right');

      // Refusals: each said in Arabic, and the button comes back.
      await tab.locator('#teach-sample').fill('https://video.example/lesson');
      state.submit = refusal(400, '0A000', 'teaching:applications_closed');
      await press.click();
      await says('التقدّم للتدريس مغلق حاليًا. لم يُرسل شيء.');
      assert.equal(await form.locator('[aria-invalid="true"]').count(), 0, 'a box is still marked wrong after it was put right');
      state.submit = refusal(403, '42501', DATABASE_SENTENCE);
      await press.click();
      await says('تعذّر تنفيذ ذلك. لم يتغيّر شيء.');
      state.submit = noAnswer;
      await press.click();
      await says('لم نتمكّن من التأكّد من تنفيذ ذلك. افتح هذه الصفحة من جديد لترى.');
      assert.equal(await press.isEnabled(), true);
      state.submit = refusal(400, '42501', 'teaching:not_signed_in');
      await press.click();
      await says('لقد سُجّل خروجك. سجّل الدخول من جديد ثم أعد المحاولة.');
      // The route itself finds something the form let through: the box is named all the same.
      await context.route('**/api/teaching/apply', (r) => r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, code: 'note_long', message: 'SYNTHETIC English' }) }), { times: 1 });
      await press.click();
      await says('أحد الحقول فيه أكثر مما يتّسع له. اختصره ثم أرسل من جديد.');
      await wrong('teach-note');
      // The connection goes: the form says so, keeps what was typed, and comes back to life.
      await context.setOffline(true);
      await press.click();
      await says('تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.');
      assert.equal(await press.isEnabled(), true, 'the button stays busy for good when the request cannot be made');
      await context.setOffline(false);
      assert.equal(await tab.locator('#teach-headline').inputValue(), 'تجويد القرآن للأطفال', 'what was typed was lost');
      const text = await tab.locator('main').textContent();
      for (const sentence of ['SYNTHETIC', 'could not', 'teaching:', 'permission denied', 'Applications']) assert.equal(text.includes(sentence), false, `a refusal is said in English or in the database's words: ${sentence}`);
      assert.equal(state.board.application, null);

      // Pressed twice while the writer works: one request, and the page draws what was sent.
      // The button does not move when it is pressed. When the form took its
      // last sentence away at once, the button jumped up and the second press
      // landed on the link under the form and left the page.
      state.submit = 'ok'; state.delay = 700;
      sent.length = 0; calls.length = 0;
      const before = await press.boundingBox();
      await press.dblclick();
      assert.equal(new URL(tab.url()).pathname, '/teach/apply', 'the second press left the page');
      assert.deepEqual(await tab.locator('[data-tapply-button="submit"]').boundingBox(), before, 'the button moved under the finger that pressed it');
      await tab.getByRole('heading', { name: 'طلبك', exact: true, level: 2 }).waitFor();
      assert.equal(new URL(tab.url()).pathname, '/teach/apply', 'the second press left the page');
      assert.deepEqual(sent, [{ action: 'submit', headline: 'تجويد القرآن للأطفال', qualifications: 'إجازة في رواية حفص عن عاصم، وست سنوات في تدريس الأطفال.', sampleUrl: 'https://video.example/lesson', note: null }], 'pressing twice sent two requests');
      assert.equal(rpcs('submit_teaching_application').length, 1);
      await tab.locator('[data-tapply-form]').waitFor({ state: 'detached' });
      await tab.getByText('تجويد القرآن للأطفال', { exact: true }).waitFor();
      // Arabic typed on an Arabic page reads right to left.
      assert.equal(await direction(tab, '.tapply-sent dd'), 'rtl');
      assert.ok(await fits(tab));
      state.delay = 0;
      await shot(tab, 'teach-apply-waiting-ar-390-just-sent');

      // Taking it back: refused in Arabic, then done, and the form is drawn again.
      const asking = tab.locator('[data-tapply-ask="withdraw"]');
      const back = asking.getByRole('button', { name: 'اسحب هذا الطلب', exact: true });
      state.withdraw = refusal(403, '42501', DATABASE_SENTENCE);
      await back.click();
      await asking.locator('[data-tapply-refusal]').filter({ hasText: 'تعذّر تنفيذ ذلك. لم يتغيّر شيء.' }).waitFor();
      assert.equal(state.board.application.status, 'submitted');
      await shot(tab, 'teach-apply-withdraw-ar-390-refused');
      state.withdraw = 'ok'; state.delay = 700; sent.length = 0; calls.length = 0;
      await back.dblclick();
      await tab.getByText('سحبت طلبك. يمكنك إرسال طلب جديد.', { exact: true }).waitFor();
      assert.deepEqual(sent, [{ action: 'withdraw' }], 'pressing twice sent two requests');
      assert.equal(rpcs('withdraw_teaching_application').length, 1);
      await tab.locator('[data-tapply-button="withdraw"]').waitFor({ state: 'detached' });
      // A new form, empty: what was sent before is not typed in again for them.
      assert.equal(await tab.locator('#teach-headline').inputValue(), '');
      assert.ok(await fits(tab));
      // Both buttons asked this app's route and nothing else.
      assert.deepEqual(direct, [], 'the browser talked to the database itself');
      assert.deepEqual(errors, []);
      await context.close();
    }
    // The page was behind: an application is already with the owner (another tab sent it).
    {
      state = fresh();
      const { context, tab, errors } = await visit('ar', 390);
      await tab.locator('#teach-headline').fill('تجويد القرآن للأطفال');
      await tab.locator('#teach-qualifications').fill('إجازة في رواية حفص عن عاصم، وست سنوات في تدريس الأطفال.');
      await tab.locator('#teach-sample').fill('https://video.example/lesson');
      state.board = board(true, false, application('submitted')); state.submit = refusal(400, '23505', 'teaching:already_applied');
      await tab.getByRole('button', { name: 'أرسل إلى المالك', exact: true }).click();
      // It is read again, and shows the application that is there.
      await tab.getByRole('heading', { name: 'طلبك', exact: true, level: 2 }).waitFor();
      await tab.locator('[data-tapply-form]').waitFor({ state: 'detached' });
      // And one answered while the page was open: taking it back shows the answer.
      state.board = board(true, false, application('declined', { decisionReason: REASON })); state.withdraw = refusal(400, 'P0002', 'teaching:nothing_to_withdraw');
      await tab.getByRole('button', { name: 'اسحب هذا الطلب', exact: true }).click();
      await tab.getByText('لم يُقبل هذه المرة.', { exact: true }).waitFor();
      await tab.locator('[data-tapply-note]').waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Teach apply buttons in Arabic at 390: three mistakes named in Arabic with the caret put in the box and nothing sent; five refusals of sending and a lost connection said in Arabic with what was typed kept and nothing of the database’s; pressed twice, one request, and the page draws what was sent, right to left; taking back refused, then done with one request, and an empty form drawn again; a page that was behind is read again both ways.');
  }
  console.log('Teach apply HTTP smoke passed. Not real Auth, RLS, the table’s constraints or the database’s own rules; every applicant, sentence and answer in it is invented.');
} catch (e) { console.error(seen.logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
