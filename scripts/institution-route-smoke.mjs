// Real Next /institution page and the join and leave actions of the
// /api/institution route against an entirely synthetic loopback Auth/REST
// API. This is not evidence about hosted Supabase, JWT validation, RLS, or
// the rules inside my_institution(), join_institution(), leave_institution()
// or institution_report(): the stand-in answers whatever it is asked, and
// refuses only when this script tells it to. No real institution is in it;
// every name, course and number here is invented.
//
// What it does show: the page somebody who is not a member is sent, for an
// address that could join, for one that could not, and with joining closed;
// that joining says the family is counted before the button; the page a
// member is sent and the page an administrator is sent, in English, in
// Arabic and in English for a language held for review; that the fields an
// administrator fills in are drawn for nobody else and are marked as English;
// that an institution or counts that could not be read are said as unread at
// status 200 and are neither "not in an institution" nor "nobody enrolled";
// that two dates the database would refuse are named without asking it; the
// name and status the route gives each refusal of joining and leaving; and
// that the database's own sentences reach nobody. The expected sentences are
// typed here rather than imported, so this fails if a catalogue changes
// without anybody looking at the page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@synthetic.example', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;

// A sentence only the database would write. It must reach no reader.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE permission denied for table institution_memberships';
const INSTITUTION = '5b8f6b0e-6b56-4f0a-9d5e-1c9a52a0c001';
const JOINED_AT = '2026-11-20T09:14:00+00:00';
const FLAGS = { branding: true, reporting: true, api: true, sso: true };
const outside = (joinable, flags = FLAGS) => ({ joined: false, joinable, flags: { ...flags } });
const inside = (role, flags = FLAGS) => ({
  joined: true,
  joinable: false,
  institution: { id: INSTITUTION, code: 'synthetic', name: 'Synthetic Madrasah', type: 'madrasah', status: 'active' },
  role,
  joinedAt: JOINED_AT,
  branding: { displayName: 'Synthetic Display Name', tagline: 'Synthetic line about it', accent: 'green', logoUrl: null, updatedAt: JOINED_AT },
  // The database gives a member neither.
  domains: role === 'admin' ? [{ id: 'd-1', domain: 'synthetic.example', status: 'verified', claimToken: null, note: null, verifiedAt: JOINED_AT }] : [],
  keys: [],
  flags: { ...flags },
});
const REPORT = {
  institutionId: INSTITUTION,
  totals: { members: 12, learners: 31, enrolments: 1204, completions: 9, certificates: 4 },
  courses: [
    { course: 'Synthetic Tajwid', learnerProfiles: 20, enrolments: 1180, completions: 5 },
    // A title a spreadsheet would run, and one with no place to break.
    { course: '=Synthetic("formula")', learnerProfiles: 3, enrolments: 4, completions: 0 },
    { course: 'Synthetic-course-with-a-very-long-title-that-has-no-place-to-break-and-would-widen-a-narrow-screen', learnerProfiles: 8, enrolments: 20, completions: 4 },
  ],
  months: [{ month: '2026-10', enrolments: 1204 }],
};

const fresh = () => ({
  // What my_institution() answers.
  board: inside('member'),
  // What institution_report() answers.
  report: REPORT,
  // Paths that answer with a database error.
  broken: new Set(),
  // Paths that answer with something that is not what was asked for.
  nonsense: new Set(),
  // What the two writers answer: 'ok', or [status, body].
  join: 'ok',
  leave: 'ok',
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
  if (path === '/rest/v1/rpc/my_institution') send(state.board);
  else if (path === '/rest/v1/rpc/institution_report') send({ ...state.report, from: payload.p_from, to: payload.p_to });
  else if (path === '/rest/v1/rpc/join_institution' || path === '/rest/v1/rpc/leave_institution') {
    const joining = path.endsWith('join_institution');
    const answer = joining ? state.join : state.leave;
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
    if (answer === 'ok') {
      // What the writer would leave behind, so the page read again shows it.
      state.board = joining ? inside('member') : outside(true);
      send(joining ? { institutionId: INSTITUTION, role: 'member', domain: 'synthetic.example' } : { status: 'left' });
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
const num = (code, value) => new Intl.NumberFormat(code).format(value);
// The value one of the two date fields was sent with, wherever React put it in the tag.
const dateIn = (html, id) => { const tag = new RegExp(`<input[^>]*id="${id}"[^>]*>`).exec(html)?.[0] ?? ''; assert.match(tag, /type="date"/, `no date field ${id}`); return /value="([^"]*)"/.exec(tag)?.[1]; };
const isoDay = (at) => new Date(at).toISOString().slice(0, 10);
const TODAY = isoDay(Date.now());
const YEAR_AGO = isoDay(Date.parse(`${TODAY}T00:00:00Z`) - 365 * 86400000);
// English a translated page must not hold. What an institution typed about
// itself and what a teacher called a course all begin "Synthetic" here.
const ENGLISH_ONLY = ['Institutions', 'Your institution', 'could not be read', 'You are not', 'Your email address', 'Joining', 'Join this', 'No institution', 'Do you have', 'Use a code', 'You are a member', 'You joined', 'What its people', 'These are numbers', '>From<', '>To<', 'Show these', 'Download', 'Accounts that', 'Learners', 'Enrolments', 'Courses finished', 'Certificates', 'By course', '>Course<', 'Finished', 'Nobody enrolled', 'Choose', 'Leaving', 'Leave this', 'Account settings', 'Working', 'The headings'];
// What only an administrator is shown.
const ADMIN_ONLY = ['data-inst-admin', 'How it looks', 'Your domain', 'Keys for your own systems', 'href="/institution/seats"', 'No domain has been claimed', 'synthetic.example'];
// What the database calls things. None of it is a sentence.
const STORED = ['SYNTHETIC', 'institution:', 'no_verified_domain', 'last_admin', '>member<', '>admin<', 'madrasah<', INSTITUTION];
const UNREAD = 'Your institution could not be read just now. This does not mean you are not in one. Try again in a moment.';
const MEANS = 'Joining adds you and the learners in your family to that institution’s numbers: how many of its people enrolled in each course and how many finished. Its members are shown those numbers. No name is shown. A small number can still point at somebody.';
const WHAT = 'These are numbers, not records. They count the accounts that joined, the learners in those accounts’ families, the courses those learners enrolled in between the two dates, the courses finished and the certificates issued. No name and no email address is shown. A learner with no account in this institution is not counted. A number as small as one can still point at somebody, so treat a small number as you would a name.';
const CODE = '<p class="muted inst-code">Do you have a code from a school? It is used on another page. <a href="/institution/claim">Use a code</a></p>';
const CRUMBS = '<nav class="crumbs"><a href="/account">Account settings</a><span aria-hidden="true">›</span><span>Institutions</span></nav>';

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
  const page = async (path = '/institution', code = 'en') => {
    const html = inner(await whole(path, { cookie, 'accept-language': code }));
    // Whatever the page says, it never says it in the database's words.
    hasNot(html, STORED, `${path} in ${code}`);
    return html;
  };
  const send = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/institution`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    assert.equal(text.includes('SYNTHETIC'), false, `the route passed on a sentence that is not its own: ${text}`);
    return { status: response.status, json: JSON.parse(text) };
  };
  const expect = (answer, status, code, what) => {
    assert.equal(answer.status, status, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(answer.json.ok, false, what);
    assert.equal(answer.json.code, code, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(typeof answer.json.message, 'string', what);
    assert.deepEqual(Object.keys(answer.json).sort(), ['code', 'message', 'ok'], what);
  };

  // --------------------------------------------------------- not a member
  // Signed out: sent to sign in, and nothing is asked of the database.
  calls.length = 0;
  const away = await request('/institution', { 'accept-language': 'en' });
  assert.equal(away.status, 307);
  assert.equal(away.headers.get('location'), '/sign-in?next=/institution');
  assert.equal(rpcs('my_institution').length, 0);

  // An address that could join: what joining counts is said before the button.
  state.board = outside(true);
  calls.length = 0;
  const html = await whole('/institution', { cookie, 'accept-language': 'en' });
  assert.match(html, /<title>Institutions[^<]*<\/title>/);
  let en = inner(html);
  assert.equal(rpcs('my_institution').length, 1);
  assert.equal(rpcs('institution_report').length, 0, 'the counts were asked for somebody who is not a member');
  has(en, [
    `<div class="page inst-page">${CRUMBS}<div class="page-head"><h1>Institutions</h1></div>`,
    '<section class="card inst-card" data-inst-state="joinable"><h2>You are not in an institution</h2><p>Your email address is at a domain that an institution has shown is its own, so you may join it. Nothing happens by itself: you join by pressing the button.</p>',
    `<p class="muted">${MEANS}</p><div class="inst-ask" data-inst-ask="join"><button type="button" class="btn" aria-busy="false" data-inst-button="join">Join this institution</button></div></section>${CODE}`,
  ], 'the page for an address that could join');
  hasNot(en, [...ADMIN_ONLY, 'data-inst-leave', 'data-inst-report', 'No institution has', 'not open at the moment'], 'the page for an address that could join');
  // An address no institution has checked: why, and nothing to press.
  state.board = outside(false);
  en = await page();
  has(en, [`<section class="card inst-card" data-inst-state="no-match"><h2>You are not in an institution</h2><p class="muted">No institution has a checked email domain that matches your address. If your school or madrasah should be here, ask its administrator.</p></section>${CODE}`], 'the page for an address that could not join');
  hasNot(en, ['<button', 'Your email address is at a domain', MEANS], 'the page for an address that could not join');
  // Joining by address switched off is a different sentence from no match.
  state.board = outside(false, { ...FLAGS, sso: false });
  en = await page();
  has(en, ['<section class="card inst-card" data-inst-state="closed"><h2>You are not in an institution</h2><p class="muted">Joining an institution with an email address is not open at the moment. An institution’s administrators are named by the platform.</p></section>'], 'the page with joining closed');
  hasNot(en, ['<button', 'No institution has a checked'], 'the page with joining closed');

  // Not read is not "not in an institution": one sentence, at status 200.
  const unreadAs = async (what) => {
    const unread = await page();
    has(unread, [`<div class="page inst-page">${CRUMBS}<div class="page-head"><h1>Institutions</h1></div><div class="notice error" role="alert" data-inst-state="unread">${UNREAD}</div>${CODE}`], what);
    hasNot(unread, ['You are not in an institution', '<button', 'data-inst-leave', 'data-inst-report', ...ADMIN_ONLY], what);
  };
  state = fresh(); state.broken = new Set(['/rest/v1/rpc/my_institution']);
  await unreadAs('the page with the institution unread');
  // A reply that does not say whether this account has joined.
  state = fresh(); state.nonsense = new Set(['/rest/v1/rpc/my_institution']);
  await unreadAs('the page with a reply that is not an answer');
  state = fresh(); state.board = {};
  await unreadAs('the page with an empty reply');
  // A reply that says it has, and does not name what.
  state = fresh(); state.board = { ...inside('member'), institution: null };
  await unreadAs('the page with a membership of nothing');
  state = fresh(); state.broken = new Set(['/rest/v1/rpc/my_institution']);
  has(await page('/institution', 'ar'), ['<div class="notice error" role="alert" data-inst-state="unread">تعذّرت قراءة مؤسستك الآن. هذا لا يعني أنك لست في مؤسسة. حاول مرة أخرى بعد قليل.</div>'], 'the unread page in Arabic');
  state = fresh();
  console.log('Institution page, not a member: signed out is sent to sign in; an address that could join is told its family is counted before the button; no match and joining closed are two sentences with nothing to press; unread, four ways, is said at 200 and is not "not in an institution".');

  // --------------------------------------------------------------- a member
  calls.length = 0;
  en = await page();
  // The 365 days ending today, asked for once.
  assert.deepEqual(rpcs('institution_report').map((c) => c.payload), [{ p_from: YEAR_AGO, p_to: TODAY }]);
  has(en, [
    `<div class="page wide inst-page">${CRUMBS}<div class="page-head" data-inst-state="joined" data-inst-role="member"><p class="eyebrow">Your institution</p><h1><bdi>Synthetic Display Name</bdi></h1><p class="muted" dir="auto">Synthetic line about it</p></div>`,
    `<ul class="inst-facts"><li>You are a member of this institution. Its administrators manage it. You can leave at any time.</li><li>You joined on: <bdi>${moment('en', JOINED_AT)}</bdi></li></ul>`,
    `<section class="card inst-card" data-inst-report="read"><h2>What its people studied</h2><p class="muted">${WHAT}</p><form class="inst-dates" method="get"><label for="inst-from">From</label>`,
    '<label for="inst-to">To</label>', '<button type="submit" class="btn secondary">Show these dates</button></form>',
    `<ul class="inst-totals"><li>Accounts that joined: <strong>12</strong></li><li>Learners in their families: <strong>31</strong></li><li>Enrolments between the two dates: <strong>1,204</strong></li><li>Courses finished between the two dates: <strong>9</strong></li><li>Certificates issued between the two dates: <strong>4</strong></li></ul><h3>By course</h3>`,
    '<thead><tr><th scope="col">Course</th><th scope="col">Learners</th><th scope="col">Enrolments</th><th scope="col">Finished</th></tr></thead>',
    '<tr><th scope="row" dir="auto">Synthetic Tajwid</th><td>20</td><td>1,180</td><td>5</td></tr>',
    // A title is text on the page, whatever a spreadsheet would make of it.
    '<tr><th scope="row" dir="auto">=Synthetic("formula")</th><td>3</td><td>4</td><td>0</td></tr>',
    `data-inst-file="institution-report-${YEAR_AGO}-to-${TODAY}.csv">Download as a file</button></div></section>`,
    '<section class="card inst-card" data-inst-leave="true"><h2>Leaving</h2><p class="muted">Leaving ends your membership, and you and your family are no longer counted in its numbers. It does not delete your account or anything you have learned.</p><div class="inst-ask" data-inst-ask="leave"><button type="button" class="btn secondary" aria-busy="false" data-inst-button="leave">Leave this institution</button></div></section>',
  ], 'the member’s page');
  assert.equal(moment('en', JOINED_AT), 'Nov 20, 2026, 9:14 AM UTC');
  assert.equal(dateIn(en, 'inst-from'), YEAR_AGO); assert.equal(dateIn(en, 'inst-to'), TODAY);
  // A member is shown nothing an administrator fills in, and nothing about a
  // domain the database did not give them. The English page does not say the
  // file is in English, and no number is a record.
  hasNot(en, [...ADMIN_ONLY, 'The headings inside the file', 'The parts below', 'You are not in an institution', 'Nobody enrolled', 'data-inst-button="join"'], 'the member’s page');
  // The institution's own name when it has set no other.
  state.board = { ...inside('member'), branding: null };
  en = await page();
  has(en, ['<p class="eyebrow">Your institution</p><h1><bdi>Synthetic Madrasah</bdi></h1></div>'], 'the page of an institution with no branding');

  // Two real dates are asked for as given.
  state = fresh(); calls.length = 0;
  en = await page('/institution?from=2026-01-01&to=2026-03-31');
  assert.deepEqual(rpcs('institution_report').map((c) => c.payload), [{ p_from: '2026-01-01', p_to: '2026-03-31' }]);
  assert.equal(dateIn(en, 'inst-from'), '2026-01-01'); assert.equal(dateIn(en, 'inst-to'), '2026-03-31');
  has(en, ['data-inst-report="read"', 'data-inst-file="institution-report-2026-01-01-to-2026-03-31.csv"'], 'the page for two dates');
  // A date that is not a day is not asked for: the default is read instead.
  calls.length = 0;
  en = await page('/institution?from=2026-02-31&to=soon');
  assert.deepEqual(rpcs('institution_report').map((c) => c.payload), [{ p_from: YEAR_AGO, p_to: TODAY }]);
  // A start after the end, and more than two years: named, and the database is not asked.
  calls.length = 0;
  en = await page('/institution?from=2026-04-01&to=2026-03-31');
  assert.equal(rpcs('institution_report').length, 0, 'the database was asked for a start after the end');
  has(en, ['<section class="card inst-card" data-inst-report="bad_window">', '</form><div class="notice warn" role="alert">Choose a start date that is not after the end date.</div></section>'], 'the page for a start after the end');
  assert.equal(dateIn(en, 'inst-from'), '2026-04-01');
  hasNot(en, ['inst-totals', 'data-inst-file', 'could not be read'], 'the page for a start after the end');
  en = await page('/institution?from=2024-01-01&to=2026-03-31');
  assert.equal(rpcs('institution_report').length, 0, 'the database was asked for more than two years');
  has(en, ['data-inst-report="window_too_long"', '<div class="notice warn" role="alert">Choose two dates no more than two years apart.</div>'], 'the page for more than two years');

  // Counts not read are not nought: said, with the dates still there to change.
  for (const how of ['broken', 'nonsense']) {
    state = fresh(); state[how] = new Set(['/rest/v1/rpc/institution_report']);
    en = await page();
    has(en, ['data-inst-report="unread"', '</form><div class="notice error" role="alert">The numbers could not be read just now. This does not mean there are none. Try again in a moment.</div></section>', 'data-inst-leave="true"', '<h1><bdi>Synthetic Display Name</bdi></h1>'], `the page with the counts ${how}`);
    hasNot(en, ['inst-totals', 'Nobody enrolled', 'data-inst-file', '<strong>0</strong>'], `the page with the counts ${how}`);
  }
  // Nobody enrolled is a sentence, with the totals above it.
  state = fresh(); state.report = { ...REPORT, totals: { members: 2, learners: 3, enrolments: 0, completions: 0, certificates: 0 }, courses: [], months: [] };
  en = await page();
  has(en, ['<li>Enrolments between the two dates: <strong>0</strong></li>', '<h3>By course</h3><p class="empty">Nobody enrolled in anything between these dates.</p>', 'data-inst-file='], 'the page with nobody enrolled');
  hasNot(en, ['<table'], 'the page with nobody enrolled');
  // Reporting switched off: no card, and nothing asked.
  state = fresh(); state.board = inside('member', { ...FLAGS, reporting: false }); calls.length = 0;
  en = await page();
  assert.equal(rpcs('institution_report').length, 0);
  has(en, ['data-inst-leave="true"', 'You are a member of this institution.'], 'the page with reporting off');
  hasNot(en, ['data-inst-report', 'What its people studied'], 'the page with reporting off');
  state = fresh();
  console.log('Institution page, a member: the name, when they joined on a named clock, five totals and a row per course; nothing an administrator fills in; two dates asked as given, a date that is not a day ignored, a start after the end and more than two years named with the database not asked; counts unread are not nought; nobody enrolled is a sentence; reporting off draws no card.');

  // ------------------------------------------------------- an administrator
  state.board = inside('admin');
  en = await page();
  has(en, [
    'data-inst-state="joined" data-inst-role="admin"',
    `<ul class="inst-facts"><li>You joined on: <bdi>${moment('en', JOINED_AT)}</bdi></li></ul>`,
    '<div class="inst-admin" data-inst-admin="true"><p class="muted"><a href="/institution/seats">Seats</a>',
    'How it looks', 'Your domain', '<strong>synthetic.example</strong>', 'Keys for your own systems', 'No keys yet.',
    'data-inst-leave="true"', 'data-inst-report="read"',
  ], 'the administrator’s page');
  // An administrator may not be able to leave, so the page does not say they can.
  hasNot(en, ['You are a member of this institution', 'The parts below', 'lang="en"'], 'the administrator’s page');
  // Each card behind its own switch.
  state.board = inside('admin', { branding: false, reporting: false, api: false, sso: false });
  en = await page();
  has(en, ['<a href="/institution/seats">Seats</a>', 'data-inst-leave="true"'], 'the administrator’s page with every switch off');
  hasNot(en, ['How it looks', 'Your domain', 'Keys for your own systems', 'data-inst-report'], 'the administrator’s page with every switch off');
  state = fresh();
  console.log('Institution page, an administrator: the three cards and the seats link, each card behind its own switch, and no sentence saying they can leave at any time.');

  // --------------------------------------------------------------- in Arabic
  state.board = outside(true);
  let ar = await page('/institution', 'ar');
  has(ar, [
    '<nav class="crumbs"><a href="/account">إعدادات الحساب</a><span aria-hidden="true">›</span><span>المؤسسات</span></nav><div class="page-head"><h1>المؤسسات</h1></div>',
    '<h2>لست عضوًا في مؤسسة</h2><p>بريدك الإلكتروني على نطاق أثبتت مؤسسة أنه نطاقها، فيمكنك الانضمام إليها. لا شيء يحدث تلقائيًا: تنضم بالضغط على الزر.</p>',
    '<p class="muted">الانضمام يضيفك أنت والمتعلّمين في عائلتك إلى أعداد تلك المؤسسة: كم من أفرادها سجّل في كل دورة وكم أتمّها. تُعرض هذه الأعداد على أعضائها. لا يُعرض أي اسم. والعدد الصغير قد يدلّ على شخص بعينه.</p>',
    'data-inst-button="join">انضم إلى هذه المؤسسة</button>',
    '<p class="muted inst-code">هل لديك رمز من مدرسة؟ يُستخدم في صفحة أخرى. <a href="/institution/claim">استخدم رمزًا</a></p>',
  ], 'the page for an address that could join, in Arabic');
  hasNot(ar, ENGLISH_ONLY, 'the page for an address that could join, in Arabic');
  state.board = outside(false);
  has(await page('/institution', 'ar'), ['<p class="muted">لا توجد مؤسسة لها نطاق بريد متحقَّق منه يطابق عنوانك. إن كان ينبغي أن تكون مدرستك هنا، فاسأل مسؤولها.</p>'], 'no match in Arabic');
  state.board = outside(false, { ...FLAGS, sso: false });
  has(await page('/institution', 'ar'), ['<p class="muted">الانضمام إلى مؤسسة بالبريد الإلكتروني غير متاح حاليًا. مسؤولو المؤسسة تسمّيهم المنصة.</p>'], 'joining closed in Arabic');
  state = fresh();
  ar = await page('/institution', 'ar');
  has(ar, [
    '<p class="eyebrow">مؤسستك</p><h1><bdi>Synthetic Display Name</bdi></h1><p class="muted" dir="auto">Synthetic line about it</p>',
    `<ul class="inst-facts"><li>أنت عضو في هذه المؤسسة. يديرها مسؤولوها. يمكنك المغادرة في أي وقت.</li><li>انضممت في: <bdi>${moment('ar', JOINED_AT)}</bdi></li></ul>`,
    '<h2>ما درسه أفرادها</h2><p class="muted">هذه أعداد وليست سجلات. تَعُدّ الحسابات التي انضمت، والمتعلّمين في عائلات تلك الحسابات، والدورات التي سجّل فيها هؤلاء المتعلّمون بين التاريخين، والدورات المُتمَّة والشهادات الصادرة. لا يُعرض أي اسم ولا أي عنوان بريد. المتعلّم الذي لا حساب له في هذه المؤسسة لا يُعَدّ. والعدد الصغير حتى الواحد قد يدلّ على شخص بعينه، فعامِل العدد الصغير كما تعامل الاسم.</p>',
    '<label for="inst-from">من</label>', '<label for="inst-to">إلى</label>', '<button type="submit" class="btn secondary">اعرض هذه التواريخ</button>',
    `<ul class="inst-totals"><li>الحسابات التي انضمت: <strong>${num('ar', 12)}</strong></li><li>المتعلّمون في عائلاتها: <strong>${num('ar', 31)}</strong></li><li>التسجيلات بين التاريخين: <strong>${num('ar', 1204)}</strong></li><li>الدورات المُتمَّة بين التاريخين: <strong>${num('ar', 9)}</strong></li><li>الشهادات الصادرة بين التاريخين: <strong>${num('ar', 4)}</strong></li></ul><h3>حسب الدورة</h3>`,
    '<thead><tr><th scope="col">الدورة</th><th scope="col">المتعلّمون</th><th scope="col">التسجيلات</th><th scope="col">المُتمَّة</th></tr></thead>',
    `<tr><th scope="row" dir="auto">Synthetic Tajwid</th><td>${num('ar', 20)}</td><td>${num('ar', 1180)}</td><td>${num('ar', 5)}</td></tr>`,
    // The file's headings are English, and the Arabic page says so.
    '>نزّل كملف</button><p class="muted">العناوين داخل الملف بالإنجليزية.</p></div></section>',
    '<h2>المغادرة</h2><p class="muted">المغادرة تنهي عضويتك، ولا تُعَدّ أنت وعائلتك بعدها ضمن أعدادها. لا تحذف حسابك ولا شيئًا مما تعلّمته.</p>',
    'data-inst-button="leave">غادر هذه المؤسسة</button>',
  ], 'the member’s page in Arabic');
  hasNot(ar, [...ENGLISH_ONLY, ...ADMIN_ONLY], 'the member’s page in Arabic');
  assert.match(await whole('/institution', { cookie, 'accept-language': 'ar' }), /<title>المؤسسات[^<]*<\/title>/);
  has(await page('/institution?from=2026-04-01&to=2026-03-31', 'ar'), ['<div class="notice warn" role="alert">اختر تاريخ بداية لا يأتي بعد تاريخ النهاية.</div>'], 'a start after the end in Arabic');
  has(await page('/institution?from=2024-01-01&to=2026-03-31', 'ar'), ['<div class="notice warn" role="alert">اختر تاريخين لا يفصل بينهما أكثر من سنتين.</div>'], 'more than two years in Arabic');
  state.broken = new Set(['/rest/v1/rpc/institution_report']);
  has(await page('/institution', 'ar'), ['<div class="notice error" role="alert">تعذّرت قراءة الأعداد الآن. هذا لا يعني أنه لا توجد أعداد. حاول مرة أخرى بعد قليل.</div>'], 'counts unread in Arabic');
  state = fresh(); state.report = { ...REPORT, courses: [] };
  has(await page('/institution', 'ar'), ['<p class="empty">لم يسجّل أحد في أي شيء بين هذين التاريخين.</p>'], 'nobody enrolled in Arabic');
  // An administrator: the page says in Arabic that what follows is English, and marks it.
  state = fresh(); state.board = inside('admin');
  ar = await page('/institution', 'ar');
  has(ar, ['<p class="muted inst-english">الأجزاء أدناه خاصة بمسؤولي هذه المؤسسة وهي بالإنجليزية حاليًا.</p><div class="inst-admin" data-inst-admin="true" lang="en" dir="ltr"><p class="muted"><a href="/institution/seats">Seats</a>', 'Keys for your own systems'], 'the administrator’s page in Arabic');
  // Outside that block the page holds no English.
  hasNot(ar.slice(0, ar.indexOf('<div class="inst-admin"')) + ar.slice(ar.indexOf('data-inst-leave')), ENGLISH_ONLY, 'the administrator’s page in Arabic, outside the English block');
  state = fresh();
  // A language held for review reads this part in English, and the page says so.
  const ha = await page('/institution', 'ha');
  has(ha, [`<div class="page wide inst-page" lang="en" dir="ltr">${CRUMBS}`, '<h2>What its people studied</h2>', 'Leave this institution'], 'the page for a held language');
  hasNot(ha, ['The headings inside the file'], 'the page for a held language');
  console.log('Institution page in Arabic: joining, no match, closed, the member’s page, both date refusals, counts unread and nobody enrolled all in Arabic with no other English and no stored word; the administrator’s block announced in Arabic and marked English; a held language reads the page in English, marked.');

  // ---------------------------------------------------------------- the route
  // Signed out: named, and no writer is asked.
  calls.length = 0;
  for (const action of ['join', 'leave']) expect(await send({ action }, {}), 401, 'not_signed_in', `${action}, signed out`);
  assert.equal(calls.filter((c) => c.path.includes('_institution')).length, 0, 'a writer was asked for somebody signed out');
  // Each sentence the two writers raise, by name and by that name's own status.
  for (const [action, raised, sqlstate, status] of [
    ['join', 'already_joined', '23505', 409], ['join', 'no_verified_domain', 'P0002', 403], ['join', 'not_signed_in', '42501', 401],
    ['leave', 'not_a_member', '42501', 409], ['leave', 'last_admin', '23514', 409], ['leave', 'not_signed_in', '42501', 401],
  ]) {
    state[action] = refusal(400, sqlstate, `institution:${raised}`);
    expect(await send({ action }), status, raised, `${action} refused as ${raised}`);
    state = fresh();
  }
  for (const action of ['join', 'leave']) {
    // A refusal nobody named, one that belongs to another part of the console, and no answer at all.
    state[action] = refusal(403, '42501', DATABASE_SENTENCE);
    expect(await send({ action }), 500, 'refused', `${action}, an unnamed refusal`);
    state[action] = refusal(400, '42501', 'institution:not_an_admin');
    expect(await send({ action }), 500, 'refused', `${action}, a name that is not its own`);
    state[action] = noAnswer;
    expect(await send({ action }), 502, 'unconfirmed', `${action}, no answer`);
    state = fresh();
  }
  // Done: what the writer answered, and nothing else.
  state.board = outside(true); calls.length = 0;
  let answer = await send({ action: 'join' });
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, institutionId: INSTITUTION, role: 'member', domain: 'synthetic.example' });
  assert.deepEqual(rpcs('join_institution').map((c) => c.payload), [{}]);
  answer = await send({ action: 'leave' });
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, status: 'left' });
  assert.equal(rpcs('leave_institution').length, 1);
  // The screens that are still English are answered as they were: a sentence, at 400.
  state = fresh(); state.other = refusal(400, '0A000', 'institution:branding_closed');
  answer = await send({ action: 'branding', displayName: 'Synthetic' });
  assert.equal(answer.status, 400); assert.deepEqual(answer.json, { ok: false, code: 'branding_closed', message: 'Branding is switched off at the moment. Nothing was saved.' });
  answer = await send({ action: 'revokeKey' });
  assert.equal(answer.status, 400); assert.deepEqual(answer.json, { ok: false, message: 'Which key?' });
  answer = await send({ action: 'SYNTHETIC-ACTION' });
  assert.equal(answer.status, 400); assert.deepEqual(answer.json, { ok: false, message: 'Unknown action.' });
  answer = await send('{not json');
  assert.equal(answer.status, 400);
  state = fresh();
  console.log('Institution route: signed out reaches no writer; each of the five sentences joining and leaving raise answered by name and status; an unnamed refusal and a name from another part 500, no answer 502, with nothing of the database’s in any reply; the English screens’ actions answered as before.');

  // ----------------------------------------------------------- in a browser
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const visit = async (path, code, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', acceptDownloads: true });
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

    for (const [code, title, dir] of [['en', 'Institutions', 'ltr'], ['ar', 'المؤسسات', 'rtl'], ['ta', 'நிறுவனங்கள்', 'ltr']]) {
      for (const width of [320, 390, 1440]) {
        // Somebody whose address could join.
        state = fresh(); state.board = outside(true);
        let { context, tab, errors } = await visit('/institution', code, width);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: title, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        assert.equal(await direction(tab, 'main h1'), dir);
        assert.equal(await tab.locator('[data-inst-button="join"]').count(), 1);
        assert.ok(await fits(tab), `${code} ${width}: the page for joining is wider than the screen`);
        if ([390, 1440].includes(width)) await shot(tab, `institution-join-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}`);
        await context.close();
        // A member: a course title with no place to break does not widen the page.
        state = fresh();
        ({ context, tab, errors } = await visit('/institution', code, width));
        assert.equal(await tab.getByRole('heading', { name: 'Synthetic Display Name', exact: true, level: 1 }).count(), 1);
        assert.equal(await direction(tab, 'main .inst-card h2'), dir);
        assert.equal(await tab.locator('main tbody tr').count(), 3);
        // Two labelled dates, and a button for each thing that can be done.
        assert.equal(await tab.locator('main input[type="date"]').count(), 2);
        assert.equal(await tab.locator('main form.inst-dates label').count(), 2);
        assert.equal(await tab.locator('[data-inst-button="leave"]').count(), 1);
        assert.equal(await tab.locator('[data-inst-admin]').count(), 0);
        assert.ok(await fits(tab), `${code} ${width}: the member’s page is wider than the screen`);
        if ([390, 1440].includes(width)) await shot(tab, `institution-member-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}`);
        await context.close();
        // An administrator: the English block reads left to right on any page.
        state = fresh(); state.board = inside('admin');
        ({ context, tab, errors } = await visit('/institution', code, width));
        assert.equal(await direction(tab, '[data-inst-admin] h2'), 'ltr');
        assert.equal(await direction(tab, '[data-inst-leave] h2'), dir);
        assert.equal(await tab.locator('[data-inst-admin]').getAttribute('lang'), code === 'en' ? null : 'en');
        assert.ok(await fits(tab), `${code} ${width}: the administrator’s page is wider than the screen`);
        if (width === 390) await shot(tab, `institution-admin-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}`);
        await context.close();
      }
    }
    console.log('Institution page in a browser: English, Arabic and Tamil at 320, 390 and 1440; joining, a member and an administrator, nothing wider than the screen, the administrator’s block left to right on a right-to-left page.');

    // Joining, in Arabic.
    {
      state = fresh(); state.board = outside(true);
      const { context, tab, errors, sent, direct } = await visit('/institution', 'ar', 390);
      const box = tab.locator('[data-inst-ask="join"]');
      const join = box.getByRole('button', { name: 'انضم إلى هذه المؤسسة', exact: true });
      const says = (text) => box.locator('[data-inst-refusal]').filter({ hasText: text }).waitFor();

      // Refusals: each said in Arabic, and the button comes back.
      state.join = refusal(400, 'P0002', 'institution:no_verified_domain');
      await join.click();
      await says('لا يوجد نطاق بريد متحقَّق منه يطابق عنوانك، فلم تُضَف.');
      await shot(tab, 'institution-join-ar-390-refused');
      state.join = refusal(403, '42501', DATABASE_SENTENCE);
      await join.click();
      await says('تعذّر تنفيذ ذلك. لم يتغيّر شيء.');
      state.join = noAnswer;
      await join.click();
      await says('لم نتمكّن من التأكّد من تنفيذ ذلك. افتح هذه الصفحة من جديد لترى.');
      assert.equal(await join.isEnabled(), true);
      state.join = refusal(400, '42501', 'institution:not_signed_in');
      await join.click();
      await says('لقد سُجّل خروجك. سجّل الدخول وحاول مرة أخرى.');
      // The connection goes: the button says so and comes back to life.
      await context.setOffline(true);
      await join.click();
      await says('تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.');
      assert.equal(await join.isEnabled(), true, 'the button stays busy for good when the request cannot be made');
      await context.setOffline(false);
      const text = await tab.locator('main').textContent();
      for (const sentence of ['SYNTHETIC-DATABASE', 'could not', 'institution:', 'permission denied', 'No checked']) assert.equal(text.includes(sentence), false, `a refusal is said in English or in the database's words: ${sentence}`);
      assert.equal(state.board.joined, false);

      // Pressed twice while the writer works: one request, and the page draws the member's half.
      state.join = 'ok'; state.delay = 700;
      sent.length = 0; calls.length = 0;
      await join.dblclick();
      await tab.getByRole('heading', { name: 'Synthetic Display Name', exact: true, level: 1 }).waitFor();
      assert.deepEqual(sent, [{ action: 'join' }], 'pressing twice sent two requests');
      assert.equal(rpcs('join_institution').length, 1);
      await tab.locator('[data-inst-button="join"]').waitFor({ state: 'detached' });
      await tab.getByText('أنت عضو في هذه المؤسسة. يديرها مسؤولوها. يمكنك المغادرة في أي وقت.').waitFor();
      assert.ok(await fits(tab));
      state.delay = 0;

      // The file: what the page drew, with a title a spreadsheet would run made text.
      const [download] = await Promise.all([tab.waitForEvent('download'), tab.getByRole('button', { name: 'نزّل كملف', exact: true }).click()]);
      assert.equal(download.suggestedFilename(), `institution-report-${YEAR_AGO}-to-${TODAY}.csv`);
      const file = await readFile(await download.path());
      // A byte-order mark, so Excel reads a title in any script.
      assert.deepEqual([...file.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
      assert.equal(file.subarray(3).toString('utf8'), [
        '"Course","Learner profiles","Enrolments","Completions"',
        '"Synthetic Tajwid","20","1180","5"',
        '"\'=Synthetic(""formula"")","3","4","0"',
        '"Synthetic-course-with-a-very-long-title-that-has-no-place-to-break-and-would-widen-a-narrow-screen","8","20","4"',
        '',
        '"Month","Enrolments"',
        '"2026-10",1204',
        '',
      ].join('\n'));

      // Leaving: the only administrator is told why not, in Arabic, and stays.
      const leaving = tab.locator('[data-inst-ask="leave"]');
      const leave = leaving.getByRole('button', { name: 'غادر هذه المؤسسة', exact: true });
      state.leave = refusal(400, '23514', 'institution:last_admin');
      await leave.click();
      await leaving.locator('[data-inst-refusal]').filter({ hasText: 'أنت مسؤولها الوحيد. يجب أن يُعيَّن شخص آخر مسؤولًا قبل أن تغادر.' }).waitFor();
      assert.equal(state.board.joined, true);
      await shot(tab, 'institution-leave-ar-390-last-admin');
      // Left: the page draws the other half again.
      state.leave = 'ok'; sent.length = 0; calls.length = 0;
      await leave.click();
      await tab.getByRole('heading', { name: 'لست عضوًا في مؤسسة', exact: true, level: 2 }).waitFor();
      assert.deepEqual(sent, [{ action: 'leave' }]);
      assert.equal(rpcs('leave_institution').length, 1);
      await tab.locator('[data-inst-button="leave"]').waitFor({ state: 'detached' });
      assert.ok(await fits(tab));
      // Both buttons asked this app's route and nothing else.
      assert.deepEqual(direct, [], 'the browser talked to the database itself');
      assert.deepEqual(errors, []);
      await context.close();
    }
    // The page was behind: somebody who has already left presses Leave.
    {
      state = fresh();
      const { context, tab, errors } = await visit('/institution', 'ar', 390);
      state.board = outside(false); state.leave = refusal(400, '42501', 'institution:not_a_member');
      await tab.getByRole('button', { name: 'غادر هذه المؤسسة', exact: true }).click();
      // It is read again, and says where they stand now.
      await tab.getByRole('heading', { name: 'لست عضوًا في مؤسسة', exact: true, level: 2 }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }
    // The two dates, changed in the page and sent with its own button.
    {
      state = fresh();
      const { context, tab, errors } = await visit('/institution', 'ar', 390);
      await tab.locator('#inst-from').fill('2026-04-01');
      await tab.locator('#inst-to').fill('2026-03-31');
      await tab.getByRole('button', { name: 'اعرض هذه التواريخ', exact: true }).click();
      await tab.getByText('اختر تاريخ بداية لا يأتي بعد تاريخ النهاية.').waitFor();
      await tab.waitForLoadState('networkidle');
      assert.equal(new URL(tab.url()).search, '?from=2026-04-01&to=2026-03-31');
      assert.equal(await tab.locator('#inst-from').inputValue(), '2026-04-01');
      assert.ok(await fits(tab));
      await shot(tab, 'institution-member-ar-390-bad-dates');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Institution buttons in Arabic at 390: five refusals of joining said in Arabic with nothing of the database’s; pressed twice, one request, and the page draws the member’s half; the file is what the page drew with a formula made text; the only administrator is told why they cannot leave; leaving draws the other half; a page that was behind is read again; two dates changed in the page are refused in Arabic; the browser asked only this app.');
  }
  console.log('Institution HTTP smoke passed. Not real Auth, RLS or the database’s own rules; every institution, course and number in it is invented.');
} catch (e) { console.error(seen.logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
