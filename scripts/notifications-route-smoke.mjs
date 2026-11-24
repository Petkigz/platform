// The real Next /notifications page and its two routes against an entirely
// synthetic loopback Auth/REST API. This is not evidence about hosted
// Supabase, JWT validation, RLS, `my_notifications()`, a payout, a class or
// a subscription: the stand-in answers whatever it is told to. What the
// functions do is proved by their own database suites.
//
// What it does show: the page in the reader's own language (English, Arabic,
// French) and in English, marked, for a language held for review; a reminder
// said whole from the catalogue; a stored message under its kind's name in
// the reader's language, with the stored text set apart as English and the
// page saying so once; a kind the page has no word for shown with no name;
// an address that leaves the site not followed; a centre or a set of
// switches that could not be read said as that, each without taking the
// other with it; that neither route sends a browser the database's
// sentence; that a request to mark messages read which names none marks
// none; and, with a browser, that a switch moves only when the database says
// it did and that the page fits a phone. The expected sentences are typed
// here rather than imported, so this fails if a catalogue changes without
// anybody looking at the page.
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


const M1 = '11111111-1111-4111-8111-111111111111';
const M2 = '22222222-2222-4222-8222-222222222222';
const M3 = '33333333-3333-4333-8333-333333333333';
const M4 = '44444444-4444-4444-8444-444444444444';
const M5 = '55555555-5555-4555-8555-555555555555';
const CLASS = '66666666-6666-4666-8666-666666666666';
// Messages kept with what they are made of (since migration 355). The five above them are older: sentences only.
const N1 = '71111111-1111-4111-8111-111111111111';
const N2 = '72222222-2222-4222-8222-222222222222';
const N3 = '73333333-3333-4333-8333-333333333333';
const N4 = '74444444-4444-4444-8444-444444444444';
const N5 = '75555555-5555-4555-8555-555555555555';
const N6 = '76666666-6666-4666-8666-666666666666';
const N7 = '77777777-7777-4777-8777-777777777777';
const N8 = '78888888-8888-4888-8888-888888888888';
const COURSE = '88888888-8888-4888-8888-888888888888';
const STARTS = '2026-11-21T06:00:00+00:00';
const READ = '2026-11-15T12:00:00Z';
const said = (id, kind, title, body, href, facts, createdAt, readAt = READ) => ({ id, kind, title, body, href, severity: 'info', createdAt, readAt, facts });
const message = (id, kind, title, body, href, readAt = null, createdAt = '2026-11-20T10:00:00Z') => ({ id, kind, title, body, href, severity: 'info', createdAt, readAt });
const CENTRE = {
  unreadCount: 3,
  reminders: [
    { kind: 'class_starting', title: 'حلقة التجويد <b>', body: 'Your class in Tajweed starts 24 Nov 09:00 UTC.', href: '/live', severity: 'action', happensAt: '2026-11-24T09:00:00Z', sortKey: 0 },
    { kind: 'plan_renewing', title: 'Family <plan> renews soon', body: 'The next period starts 25 Nov 2026. Cancel before then if you do not want it to continue.', href: '/subscriptions', severity: 'info', happensAt: '2026-11-25T00:00:00Z', sortKey: 1 },
    // A reminder this page has never heard of.
    { kind: 'exam_tomorrow', title: 'SYNTHETIC exam tomorrow', body: 'Bring a pencil.', href: 'https://evil.example/x', severity: 'info', happensAt: '2026-11-24T12:00:00Z', sortKey: 2 },
  ],
  recent: [
    message(M1, 'payout_failed', 'A payout did not go through', '51500 UGX was not sent: the number is not registered.', '/teach/payouts'),
    message(M2, 'live_cancelled', 'Class cancelled: Tajweed <circle>', 'The teacher wrote: المعلم مريض اليوم <i>', `/live/${CLASS}`),
    message(M3, 'payout_paid', 'Payout sent', '80000 UGX was sent to your mobile money.', '/teach/payouts', '2026-11-19T08:00:00Z', '2026-11-18T10:00:00Z'),
    // A kind added to the database before this page learned it, and an address that leaves the site.
    message(M4, 'marketing_offers', 'SYNTHETIC offer', 'Half price today.', '//evil.example/offer', null, '2026-11-17T10:00:00Z'),
    message(M5, 'media_encode_failed', 'A recording will not play', 'The upload could not be prepared.', null, '2026-11-16T12:00:00Z', '2026-11-16T10:00:00Z'),
    // The amount is kept in minor units: eighty thousand shillings. The stored sentence prints the figure as it is kept.
    said(N1, 'payout_paid', 'Your payout has been sent', '8000000 KES was sent under reference REF-77 <b>.', '/teach/payouts',
      { amountMinor: '8000000', currency: 'KES', reference: 'REF-77 <b>' }, '2026-11-15T10:00:00Z'),
    said(N2, 'payout_failed', 'A payout did not go through', '51500 UGX was not sent. الرقم مغلق <i> Your earnings are still owed and nothing has been lost.', '/teach/payouts',
      { amountMinor: '51500', currency: 'UGX', reason: 'الرقم مغلق <i>' }, '2026-11-15T09:00:00Z'),
    said(N3, 'payout_cancelled', 'A payout request was cancelled', 'The request for 20000 UGX was cancelled by the platform. Your earnings are still owed; ask again when you are ready.', '/teach/payouts',
      { amountMinor: '20000', currency: 'UGX' }, '2026-11-15T08:00:00Z'),
    // A file with no name, to the person who uploaded it; and a named one, to the author of a lesson that uses it.
    said(N4, 'media_encode_failed', 'A recording of yours will not play', 'A recording you uploaded could not be turned into something a learner can play, so it will not play until it is retried. The encoder said: encoder exited 137 (out of memory)', '/teach/media',
      { part: 'uploader', name: null, reason: 'encoder exited 137 (out of memory)' }, '2026-11-15T07:00:00Z'),
    said(N5, 'media_encode_failed', 'A lesson of yours has nothing to play', 'The recording “Surah <one>” could not be turned into something a learner can play.', `/teach/${COURSE}/preview`,
      { part: 'author', name: 'Surah <one>', reason: 'encoder exited 137 (out of memory)' }, '2026-11-15T06:00:00Z'),
    said(N6, 'live_cancelled', 'Class cancelled: Tajweed <circle>', '21 Nov 2026, 09:00 Africa/Kampala · المعلم مريض اليوم', `/live/${CLASS}`,
      { title: 'Tajweed <circle>', startsAt: STARTS, zone: 'Africa/Kampala', reason: 'المعلم مريض اليوم' }, '2026-11-15T05:00:00Z'),
    said(N7, 'live_recording_ready', 'Recording ready: Tajweed <circle>', '21 Nov 2026, 09:00 Africa/Kampala · the recording is ready to watch', `/live/${CLASS}`,
      { title: 'Tajweed <circle>', startsAt: STARTS, zone: 'Africa/Kampala' }, '2026-11-15T04:00:00Z'),
    // Facts that are not whole: nothing is said from them, and the message is shown as it was written.
    said(N8, 'payout_paid', 'Your payout has been sent', 'SYNTHETIC stored sentence.', '/teach/payouts',
      { amountMinor: 'lots', currency: 'KES', reference: 'REF-78' }, '2026-11-15T03:00:00Z'),
  ],
};
const KINDS = ['payout_paid', 'payout_failed', 'payout_cancelled', 'media_encode_failed', 'class_starting', 'plan_renewing', 'live_cancelled', 'live_recording_ready'];
const LOCKED = ['payout_failed', 'payout_cancelled'];
const prefsOf = (off = []) => KINDS.map((kind) => ({ kind, enabled: !off.includes(kind), locked: LOCKED.includes(kind), available: !['class_starting', 'plan_renewing'].includes(kind) }));
const copy = (value) => JSON.parse(JSON.stringify(value));
// What the stand-in answers. Each is 'ok', 'broken', or a payload.
let centre = 'ok';
let prefs = 'ok';
let off = [];
// How the two writes are answered: 'ok', or a PostgREST error, or 'odd' (an answer nobody can read).
let markAnswer = 'ok';
let setAnswer = 'ok';
let live = copy(CENTRE);
// What this account owes and has agreed to: a payload, or null (the read fails).
// An account that owes nothing unless a case says otherwise: a read that fails
// is written to the server's log, and a page opened in a browser repeats that
// log in its console, where a page with nothing wrong must say nothing.
const NOTHING_OWED = { acceptanceRequired: [], outstanding: 0, history: [] };
let standing = NOTHING_OWED;
const calls = [];
const DATABASE = (code, message) => ({ code, message: `SYNTHETIC-DATABASE ${message}`, details: null, hint: null });

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
  else if (path === '/rest/v1/rpc/my_notifications') {
    if (centre === 'broken') send(DATABASE('57014', 'canceling statement due to statement timeout'), 500);
    else send(centre === 'ok' ? live : centre);
  }
  else if (path === '/rest/v1/rpc/my_notification_preferences') {
    if (prefs === 'broken') send(DATABASE('57014', 'canceling statement due to statement timeout'), 500);
    else send(prefs === 'ok' ? prefsOf(off) : prefs);
  }
  else if (path === '/rest/v1/rpc/my_policy_standing') {
    if (standing === null) send(DATABASE('57014', 'canceling statement due to statement timeout'), 500);
    else send(standing);
  }
  else if (path === '/rest/v1/rpc/mark_notifications_read') {
    if (markAnswer !== 'ok') { send(markAnswer, 400); return; }
    // As the function does: every message when no ids are named.
    let marked = 0;
    for (const m of live.recent) if (m.readAt === null && (sent?.p_ids == null || sent.p_ids.includes(m.id))) { m.readAt = '2026-11-23T09:00:00Z'; marked += 1; }
    live.unreadCount = live.recent.filter((m) => m.readAt === null).length;
    send(marked);
  }
  else if (path === '/rest/v1/rpc/set_notification_preference') {
    if (setAnswer === 'odd') { send({ kind: 'something_else', enabled: 'yes' }); return; }
    if (setAnswer !== 'ok') { send(setAnswer, 400); return; }
    off = sent.p_enabled ? off.filter((k) => k !== sent.p_kind) : [...new Set([...off, sent.p_kind])];
    send({ kind: sent.p_kind, enabled: sent.p_enabled, locked: false });
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
  // English a page in another language must not say. (Outside the stored text, which is English on purpose.)
  const ENGLISH = ['Amount:', 'Reference:', 'The reason given', 'The money is still', 'The staff of', 'A lesson of yours', 'The recording:', 'It could not be prepared', 'What the program', 'The class:', 'It was to start', 'The class was on', 'Older messages', 'Notifications', 'Account settings', 'Messages from', 'Coming up', 'Recent', 'Unread', 'A class', 'Plan:', 'The next period', 'Cancel before', 'Mark all', 'What you are told', 'These switches', 'Everything you', 'Always on', 'Not in use', 'A payout', 'A recording', 'When ', 'Turning this off', 'Your area', 'Open', 'reminder'];
  const dateIn = (code, iso, timeZone) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone }).format(new Date(iso));
  const date = (code, iso) => dateIn(code, iso, 'UTC');
  // The page without what the database wrote and without the names its rows are marked with.
  const own = (main) => main.replace(/<div class="told-stored" lang="en">[\s\S]*?<\/div>/g, '').replace(/ data-[a-z-]+="[^"]*"/g, '');
  const items = (main, marker) => main.split(marker).slice(1).map((piece) => piece.split('</li>')[0]);
  const reset = () => { centre = 'ok'; prefs = 'ok'; off = []; markAnswer = 'ok'; setAnswer = 'ok'; live = copy(CENTRE); standing = NOTHING_OWED; calls.length = 0; };
  const rpc = (name) => calls.filter((c) => c.path === `/rest/v1/rpc/${name}`);

  // ================================================================ the page
  {
    reset();
    const out = await fetch(`${origin}/notifications`, { redirect: 'manual', signal: AbortSignal.timeout(90000) });
    assert.equal(out.status, 307); assert.match(out.headers.get('location') ?? '', /\/sign-in\?next=\/notifications/);
    assert.equal(calls.length, 0, 'something was read for nobody');

    let seen = await get('/notifications');
    assert.equal(seen.status, 200, logs.slice(-2000));
    assert.match(seen.html, /<title>Notifications/);
    assert.deepEqual(rpc('my_notifications').map((c) => c.sent), [{ p_limit: 50 }]);
    assert.equal(rpc('my_notification_preferences').length, 1);
    has(seen.main, ['<div class="page told-page">', '<p class="eyebrow"><a href="/account">Account settings</a></p>', '<h1>Notifications</h1>',
      '<p class="lede">Messages from the platform, shown inside the application. They are not sent to an inbox or a phone. This page is the only place they appear.</p>',
      '<section class="told-section" data-reminders="3"><h2>Coming up</h2>', '<section class="told-section" data-centre="list" data-unread="3">',
      '<h2>Recent</h2><span class="badge">Unread: <bdi>3</bdi></span>', '<p class="told-links"><a href="/dashboard">Your area</a></p>'], 'the page');
    // Nothing read as unread, nothing that leaves the site, no table, and (in English) no note about English.
    none(seen.main, ['could not be read', 'evil.example', 'data-in-english', 'written in English', '<table', 'NaN', 'undefined', 'severity', 'sortKey', 'Payouts</a>'], 'the page');

    // A reminder is said whole by the page: its kind, a name as typed, and the moment.
    const reminders = items(seen.main, '<li data-reminder=');
    assert.equal(reminders.length, 3);
    has(reminders[0], ['"class_starting">', '<strong>A class is about to start</strong>', '<p class="told-name"><bdi>حلقة التجويد &lt;b&gt;</bdi></p>',
      `<p>A class starts on: <bdi>${date('en', '2026-11-24T09:00:00Z')}</bdi></p>`, '<p><a href="/live">Open</a></p>'], 'a class reminder');
    none(reminders[0], ['Your class in', 'told-text', 'lang="en"'], 'a class reminder');
    has(reminders[1], ['"plan_renewing">', '<strong>A plan renews soon</strong>', '<p class="told-name">Plan: <bdi>Family &lt;plan&gt;</bdi></p>',
      `<p>The next period starts on: <bdi>${date('en', '2026-11-25T00:00:00Z')}</bdi></p>`, '<p class="muted">Cancel before then if you do not want it to continue.</p>', '<a href="/subscriptions">Open</a>'], 'a renewal reminder');
    none(reminders[1], ['renews soon</bdi>', 'told-text', '25 Nov 2026.'], 'a renewal reminder');
    // One the page has no sentence for: what the database wrote, and its outside address not followed.
    has(reminders[2], ['"unnamed">', '<div class="told-text" lang="en"><p dir="auto"><strong>SYNTHETIC exam tomorrow</strong></p><p dir="auto">Bring a pencil.</p></div>'], 'a reminder with no word');
    none(reminders[2], ['<a ', 'exam_tomorrow'], 'a reminder with no word');

    // A stored message, in English: the stored text is the message, said once, with when and where it leads.
    const messages = items(seen.main, '<li data-message=');
    assert.equal(messages.length, 13);
    assert.deepEqual(messages.map((m) => /data-said="([a-z]+)"/.exec(m)?.[1]), ['stored', 'stored', 'stored', 'stored', 'stored', 'here', 'here', 'here', 'here', 'here', 'here', 'here', 'stored']);
    none(seen.main, ['told-stored'], 'the English page');
    none(messages.slice(0, 5).join(''), ['A payout was sent to you</strong></div>', 'A class you were going to was cancelled</strong></div>'], 'the English page names an older message above itself');
    assert.equal(seen.main.split('A payout did not go through').length - 1, 3, 'once as the older message, once as the heading of the newer one, once beside its switch');
    has(messages[0], [`"${M1}" data-kind="payout_failed" data-read="no" data-said="stored">`, '<div class="told-kind"><span class="badge">Unread</span></div>',
      '<div class="told-text" lang="en"><p dir="auto"><strong>A payout did not go through</strong></p><p dir="auto">51500 UGX was not sent: the number is not registered.</p></div>',
      `<p class="told-foot"><span class="muted">${date('en', '2026-11-20T10:00:00Z')}</span><a href="/teach/payouts">Open</a></p>`], 'a failed payout');
    // What somebody typed is kept as typed, and is text.
    has(messages[1], ['data-kind="live_cancelled" data-read="no"', '<p dir="auto"><strong>Class cancelled: Tajweed &lt;circle&gt;</strong></p>',
      '<p dir="auto">The teacher wrote: المعلم مريض اليوم &lt;i&gt;</p>', `<a href="/live/${CLASS}">Open</a>`], 'a cancelled class');
    has(messages[2], ['data-kind="payout_paid" data-read="yes" data-said="stored"><div class="told-text" lang="en"><p dir="auto"><strong>Payout sent</strong></p>', `<span class="muted">${date('en', '2026-11-18T10:00:00Z')}</span>`], 'a payout');
    none(messages[2], ['badge', 'told-kind'], 'a read message');
    // A kind with no word: no name, still a message. Its address leaves the site, so it is not a link.
    has(messages[3], ['data-kind="unnamed" data-read="no"', '<div class="told-kind"><span class="badge">Unread</span></div>', '<p dir="auto"><strong>SYNTHETIC offer</strong></p><p dir="auto">Half price today.</p>'], 'a message with no word');
    none(messages[3], ['<a ', 'marketing_offers'], 'a message with no word');
    has(messages[4], ['data-kind="media_encode_failed" data-read="yes"', '<strong>A recording will not play</strong>'], 'a failed recording');
    none(messages[4], ['<a '], 'a message that leads nowhere');

    // A message kept with what it is made of is said by the page, in English too.
    // The amount is said as money: 8000000 minor units of KES is KES 80000.00, which the stored sentence never said.
    const when = dateIn('en', STARTS, 'Africa/Kampala');
    has(messages[5], [`"${N1}" data-kind="payout_paid" data-read="yes" data-said="here"><div class="told-kind"><strong>A payout was sent to you</strong></div>`,
      '<div class="told-said"><p>Amount: <bdi dir="ltr">KES 80000.00</bdi></p><p>Reference: <bdi dir="ltr">REF-77 &lt;b&gt;</bdi></p></div>',
      `<p class="told-foot"><span class="muted">${date('en', '2026-11-15T10:00:00Z')}</span><a href="/teach/payouts">Open</a></p>`], 'a payout, said');
    none(messages[5], ['8000000', 'Your payout has been sent', 'was sent under', 'lang="en"', 'badge'], 'a payout, said');
    // A reason is what somebody typed: kept as typed, as text, finding its own direction.
    has(messages[6], ['<strong>A payout did not go through</strong></div><div class="told-said"><p>Amount: <bdi dir="ltr">UGX 51500</bdi></p><p>The reason given: <bdi>الرقم مغلق &lt;i&gt;</bdi></p><p>The money is still owed to you. Nothing has been lost.</p></div>'], 'a failed payout, said');
    has(messages[7], ['<strong>A payout request was cancelled</strong></div><div class="told-said"><p>Amount: <bdi dir="ltr">UGX 20000</bdi></p><p>The staff of this site cancelled this request. The money is still owed to you. Ask again when you are ready.</p></div>'], 'a cancelled payout, said');
    // No name: no line for one, and no empty quotation marks.
    has(messages[8], ['<strong>A recording of yours will not play</strong></div><div class="told-said"><p>It could not be prepared for playing. It will not play until it is tried again.</p><p>What the program that prepares it reported: <bdi dir="ltr">encoder exited 137 (out of memory)</bdi></p></div>', '<a href="/teach/media">Open</a>'], 'a failed recording, to its uploader');
    none(messages[8], ['The recording:'], 'a failed recording with no name');
    // The author of a lesson is told it is their lesson, and is led to the rehearsal.
    has(messages[9], ['<strong>A lesson of yours has nothing to play</strong></div><div class="told-said"><p>The recording: <bdi>Surah &lt;one&gt;</bdi></p><p>It could not be prepared for playing.', `<a href="/teach/${COURSE}/preview">Open</a>`], 'a failed recording, to an author');
    // A class's moment is said in the zone it was scheduled in.
    assert.match(when, /9:00/, when);
    has(messages[10], [`<strong>A class you were going to was cancelled</strong></div><div class="told-said"><p>The class: <bdi>Tajweed &lt;circle&gt;</bdi></p><p>It was to start on: <bdi>${when}</bdi></p><p>The reason given: <bdi>المعلم مريض اليوم</bdi></p></div>`, `<a href="/live/${CLASS}">Open</a>`], 'a cancelled class, said');
    has(messages[11], [`<strong>A recording of a class is ready</strong></div><div class="told-said"><p>The class: <bdi>Tajweed &lt;circle&gt;</bdi></p><p>The class was on: <bdi>${when}</bdi></p></div>`], 'a recording, said');
    none(messages.slice(5, 12).join(''), ['Class cancelled:', 'Recording ready:', 'The encoder said', 'Africa/Kampala ·', 'told-text', 'told-stored'], 'a message said by the page');
    // Facts that are not whole are not said: the stored sentences are, and nothing reads "lots".
    has(messages[12], [`"${N8}" data-kind="payout_paid" data-read="yes" data-said="stored"><div class="told-text" lang="en"><p dir="auto"><strong>Your payout has been sent</strong></p><p dir="auto">SYNTHETIC stored sentence.</p></div>`], 'a message whose facts are not whole');
    none(seen.main, ['lots', 'REF-78', 'NaN', 'Invalid Date'], 'a message whose facts are not whole');
    // Unread beside the heading the page says.
    const unreadSaid = copy(CENTRE); unreadSaid.recent = unreadSaid.recent.filter((m) => m.id === N1).map((m) => ({ ...m, readAt: null })); unreadSaid.unreadCount = 1; unreadSaid.reminders = [];
    centre = unreadSaid;
    seen = await get('/notifications');
    has(seen.main, ['data-read="no" data-said="here"><div class="told-kind"><strong>A payout was sent to you</strong><span class="badge">Unread</span></div>'], 'an unread message, said');
    centre = 'ok';
    seen = await get('/notifications');
    has(seen.main, ['<div class="told-mark" data-mark-all="true"><button class="btn secondary" type="button">Mark all as read</button></div>'], 'the button');

    // The switches: eight, in the database's order, the two money failures on and held.
    has(seen.main, ['<div id="preferences" class="told-anchor"><section class="card told-prefs" data-preferences="read" data-off="0"><h2>What you are told</h2><p class="muted">These switches decide what appears on this page.</p><p class="muted" role="status" data-summary="sumAllOn">Everything you can choose is on.</p>'], 'the switches');
    const switches = items(seen.main, '<label class="told-switch" data-kind=');
    assert.deepEqual(switches.map((s) => s.slice(1, s.indexOf('"', 1))), KINDS);
    assert.ok(switches.every((s) => s.includes('data-on="yes"') && s.includes('checked=""')));
    assert.deepEqual(switches.map((s) => s.includes('disabled=""')), KINDS.map((k) => LOCKED.includes(k)));
    has(switches[1], ['<strong>A payout did not go through</strong> <span class="badge neutral">Always on</span><span class="muted told-what">When a transfer did not go through. Always on: it is how you find out, and the fix is usually yours to make.</span>'], 'a locked switch');
    has(switches[0], ['<strong>A payout was sent to you</strong><span class="muted told-what">When money owed to you has been sent.</span>'], 'a switch');
    none(switches[0], ['Always on', 'Not in use'], 'a switch');
    has(switches[4], ['<span class="muted told-note">Not in use on this platform yet. Your choice is saved and applies if it is switched on.</span>'], 'a kind not in use');
    assert.equal(seen.main.split('told-note').length - 1, 2);

    // Some switched off: counted, after a colon.
    off = ['payout_paid', 'live_cancelled'];
    seen = await get('/notifications');
    has(seen.main, ['data-preferences="read" data-off="2">', '<p class="muted" role="status" data-summary="sumOff">Optional messages switched off: <bdi>2</bdi></p>'], 'two off');
    off = KINDS.filter((k) => !LOCKED.includes(k));
    seen = await get('/notifications');
    has(seen.main, ['data-summary="sumAllOff">You have switched off every optional message.</p>'], 'all off');
    off = [];

    // Nothing at all is said as nothing, and is not an error.
    centre = { unreadCount: 0, reminders: [], recent: [] };
    seen = await get('/notifications');
    has(seen.main, ['<section class="told-section" data-centre="none" data-unread="0">', '<h2>Recent</h2></div><p class="empty">No messages yet.</p>', 'data-preferences="read"'], 'nothing yet');
    none(seen.main, ['Coming up', 'data-mark-all', 'role="alert"', 'badge">Unread'], 'nothing yet');

    // Not read: said as that, not as "no messages", and the switches are still there.
    const UNREAD = '<div class="notice error" role="alert" data-centre="unread">Your notifications could not be read just now. That is not the same as having none.</div>';
    const bad = copy(CENTRE); bad.recent[1].createdAt = 'yesterday';
    const noCount = copy(CENTRE); delete noCount.unreadCount;
    for (const [what, value] of [['the database failing', 'broken'], ['no reply', null], ['a list', []], ['one row that makes no sense', bad], ['no count', noCount], ['a reply with no lists', { unreadCount: 0 }]]) {
      centre = value;
      seen = await get('/notifications');
      assert.equal(seen.status, 200, `${what}: an error page`);
      has(seen.main, [UNREAD, 'data-preferences="read"', '<h2>What you are told</h2>'], `${what}, unread`);
      none(seen.main, ['No messages yet', 'Recent', 'Coming up', 'SYNTHETIC', 'statement timeout', 'data-mark-all'], `${what}, unread`);
    }
    // The switches not read: said as that, and the messages are still there.
    centre = 'ok';
    const PREFS_UNREAD = '<section class="card told-prefs" data-preferences="unread"><h2>What you are told</h2><div class="notice error" role="alert">What you have chosen could not be read just now. Nothing was changed.</div></section>';
    for (const [what, value] of [['the database failing', 'broken'], ['no list', {}], ['a kind with no word', [...prefsOf(), { kind: 'marketing_offers', enabled: true, locked: false }]], ['a name every object has', [{ kind: 'constructor', enabled: true }]]]) {
      prefs = value;
      seen = await get('/notifications');
      assert.equal(seen.status, 200, `${what}: an error page`);
      has(seen.main, [PREFS_UNREAD, 'data-centre="list"', '<strong>Payout sent</strong>'], `switches unread: ${what}`);
      none(seen.main, ['told-switch', 'marketing_offers', 'SYNTHETIC-DATABASE', 'Everything you can choose'], `switches unread: ${what}`);
    }
    // Both at once.
    centre = 'broken'; prefs = 'broken';
    seen = await get('/notifications');
    has(seen.main, [UNREAD, PREFS_UNREAD], 'both unread');
    reset();

    // ------------------------------------------------------------ Arabic
    seen = await get('/notifications', 'ar');
    assert.match(seen.html, /<html[^>]*lang="ar"[^>]*dir="rtl"|<html[^>]*dir="rtl"[^>]*lang="ar"/);
    assert.match(seen.html, /<title>الإشعارات/);
    has(seen.main, ['<div class="page told-page">', '<a href="/account">إعدادات الحساب</a>', '<h1>الإشعارات</h1>',
      '<p class="lede">رسائل من المنصة تُعرض داخل التطبيق. لا تُرسَل إلى بريد ولا إلى هاتف. هذه الصفحة هي المكان الوحيد الذي تظهر فيه.</p>',
      '<h2>قريبًا</h2>', `<h2>الأخيرة</h2><span class="badge">غير مقروءة: <bdi>${new Intl.NumberFormat('ar').format(3)}</bdi></span>`,
      // Said once, above the list, to somebody who is not reading English.
      '<p class="muted told-english" data-in-english="true">الرسائل الأقدم تظهر بالإنجليزية كما كُتبت. السطر الذي فوق كل رسالة يبيّن موضوعها.</p>',
      // A message kept with what it is made of is said in Arabic: nothing of it is English but what somebody typed.
      '<div class="told-kind"><strong>أُرسلت إليك دفعة</strong></div><div class="told-said"><p>المبلغ: <bdi dir="ltr">KES 80000.00</bdi></p><p>المرجع: <bdi dir="ltr">REF-77 &lt;b&gt;</bdi></p></div>',
      '<strong>دفعة لم تتم</strong></div><div class="told-said"><p>المبلغ: <bdi dir="ltr">UGX 51500</bdi></p><p>السبب المذكور: <bdi>الرقم مغلق &lt;i&gt;</bdi></p><p>المال ما زال مستحقًا لك. لم يضع شيء.</p></div>',
      '<strong>أُلغي طلب دفعة</strong></div><div class="told-said"><p>المبلغ: <bdi dir="ltr">UGX 20000</bdi></p><p>ألغى العاملون في هذا الموقع هذا الطلب. المال ما زال مستحقًا لك. اطلب من جديد متى كنت مستعدًا.</p></div>',
      '<strong>تسجيل لك لا يمكن تشغيله</strong></div><div class="told-said"><p>تعذّر تجهيزه للتشغيل. لن يعمل حتى تُعاد المحاولة.</p><p>ما أفاد به البرنامج الذي يجهّزه: <bdi dir="ltr">encoder exited 137 (out of memory)</bdi></p></div>',
      '<strong>درس لك ليس فيه ما يُشغَّل</strong></div><div class="told-said"><p>التسجيل: <bdi>Surah &lt;one&gt;</bdi></p>',
      `<strong>أُلغيت حصة كنت ستحضرها</strong></div><div class="told-said"><p>الحصة: <bdi>Tajweed &lt;circle&gt;</bdi></p><p>كان موعد بدئها: <bdi>${dateIn('ar', STARTS, 'Africa/Kampala')}</bdi></p><p>السبب المذكور: <bdi>المعلم مريض اليوم</bdi></p></div>`,
      `<strong>تسجيل حصة صار جاهزًا</strong></div><div class="told-said"><p>الحصة: <bdi>Tajweed &lt;circle&gt;</bdi></p><p>كانت الحصة في: <bdi>${dateIn('ar', STARTS, 'Africa/Kampala')}</bdi></p></div>`,
      // The one whose facts are not whole is named in Arabic and shown as stored, like an older message.
      'data-said="stored"><div class="told-kind"><strong>أُرسلت إليك دفعة</strong></div><div class="told-stored" lang="en"><p dir="auto"><strong>Your payout has been sent</strong></p><p dir="auto">SYNTHETIC stored sentence.</p></div>',
      '<strong>حصة على وشك أن تبدأ</strong>', `<p>موعد بدء الحصة: <bdi>${date('ar', '2026-11-24T09:00:00Z')}</bdi></p>`,
      '<strong>خطة تتجدّد قريبًا</strong>', '<p class="told-name">الخطة: <bdi>Family &lt;plan&gt;</bdi></p>', `<p>الفترة التالية تبدأ في: <bdi>${date('ar', '2026-11-25T00:00:00Z')}</bdi></p>`, '<p class="muted">ألغِ قبل ذلك إن لم ترد أن يستمر.</p>',
      '<div class="told-kind"><strong>دفعة لم تتم</strong><span class="badge">غير مقروءة</span></div>',
      // The stored text is as stored, and marked as English.
      '<div class="told-stored" lang="en"><p dir="auto"><strong>A payout did not go through</strong></p><p dir="auto">51500 UGX was not sent: the number is not registered.</p></div>',
      '<strong>أُلغيت حصة كنت ستحضرها</strong>', '<strong>أُرسلت إليك دفعة</strong>', '<a href="/teach/payouts">فتح</a>', '<button class="btn secondary" type="button">اجعلها كلها مقروءة</button>',
      '<h2>ما تُبلَّغ به</h2><p class="muted">هذه المفاتيح تحدّد ما يظهر في هذه الصفحة.</p><p class="muted" role="status" data-summary="sumAllOn">كل ما يمكنك اختياره مُشغَّل.</p>',
      '<strong>دفعة لم تتم</strong> <span class="badge neutral">مُشغَّل دائمًا</span><span class="muted told-what">عندما لا يتم تحويل. مُشغَّل دائمًا: بهذا تعرف، وإصلاحه في الغالب بيدك.</span>',
      '<span class="muted told-note">غير مستخدَم في هذه المنصة بعد. اختيارك محفوظ ويُطبَّق إذا شُغِّل.</span>', '<a href="/dashboard">صفحتك</a>'], 'the Arabic page');
    assert.equal(seen.main.split('data-in-english').length - 1, 1, 'the note about English is said once');
    none(own(seen.main), ENGLISH, 'the Arabic page');
    centre = 'broken'; prefs = 'broken';
    seen = await get('/notifications', 'ar');
    has(seen.main, ['data-centre="unread">تعذّرت قراءة إشعاراتك الآن. هذا لا يعني أنه لا توجد إشعارات.</div>', '<div class="notice error" role="alert">تعذّرت قراءة ما اخترتَه الآن. لم يتغيّر شيء.</div>'], 'Arabic, unread');
    centre = { unreadCount: 0, reminders: [], recent: [] }; prefs = 'ok';
    seen = await get('/notifications', 'ar');
    has(seen.main, ['<p class="empty">لا توجد رسائل بعد.</p>'], 'Arabic, nothing yet');
    none(seen.main, ['data-in-english'], 'Arabic, nothing yet');
    // Only messages the page can say: nothing on it is English, so nothing says that some of it is.
    const onlySaid = copy(CENTRE); onlySaid.recent = onlySaid.recent.filter((m) => [N1, N2, N3, N4, N5, N6, N7].includes(m.id)); onlySaid.unreadCount = 0; onlySaid.reminders = [];
    centre = onlySaid;
    seen = await get('/notifications', 'ar');
    assert.equal(items(seen.main, '<li data-message=').length, 7);
    none(seen.main, ['data-in-english', 'told-stored', 'lang="en"', 'data-said="stored"'], 'Arabic, only messages the page says');
    none(own(seen.main), ENGLISH, 'Arabic, only messages the page says');
    reset();

    // ------------------------------------------------------------ French, and a held language
    seen = await get('/notifications', 'fr');
    has(seen.main, ['<a href="/account">Paramètres du compte</a>', '<h2>À venir</h2>', '<h2>Récents</h2><span class="badge">Non lus\u00a0: <bdi>3</bdi></span>',
      '<p class="muted told-english" data-in-english="true">Les messages plus anciens sont affichés en anglais, tels qu’ils ont été rédigés. La ligne au-dessus de chacun dit de quoi il s’agit.</p>',
      '<strong>Un versement vous a été envoyé</strong></div><div class="told-said"><p>Montant\u00a0: <bdi dir="ltr">KES 80000.00</bdi></p><p>Référence\u00a0: <bdi dir="ltr">REF-77 &lt;b&gt;</bdi></p></div>',
      `<p>Cours\u00a0: <bdi>Tajweed &lt;circle&gt;</bdi></p><p>Début prévu\u00a0: <bdi>${dateIn('fr', STARTS, 'Africa/Kampala')}</bdi></p><p>Raison donnée\u00a0: <bdi>المعلم مريض اليوم</bdi></p>`,
      '<strong>Un cours va bientôt commencer</strong>', `<p>Début du cours\u00a0: <bdi>${date('fr', '2026-11-24T09:00:00Z')}</bdi></p>`, '<p class="told-name">Formule\u00a0: <bdi>Family &lt;plan&gt;</bdi></p>',
      `<p>Début de la prochaine période\u00a0: <bdi>${date('fr', '2026-11-25T00:00:00Z')}</bdi></p>`, '<p class="muted">Annulez avant cette date si vous ne voulez pas que cela continue.</p>',
      '<div class="told-kind"><strong>Un versement n’a pas abouti</strong><span class="badge">Non lu</span></div>', '<strong>Un cours auquel vous deviez assister a été annulé</strong>',
      '<span class="muted told-what">Un rappel avant un cours en direct auquel vous ou l’un de vos enfants pouvez assister.</span>', '<button class="btn secondary" type="button">Tout marquer comme lu</button>', '<h2>Ce que l’on vous signale</h2>', 'data-summary="sumAllOn">Tout ce que vous pouvez choisir est activé.</p>',
      '<span class="badge neutral">Toujours activé</span>', '<a href="/dashboard">Votre espace</a>', '>Ouvrir</a>'], 'the French page');
    // "Notifications" is the French word too.
    none(own(seen.main), ENGLISH.filter((word) => word !== 'Notifications'), 'the French page');
    off = ['payout_paid'];
    seen = await get('/notifications', 'fr');
    has(seen.main, ['data-summary="sumOff">Messages facultatifs désactivés\u00a0: <bdi>1</bdi></p>'], 'French, one off');
    off = [];
    seen = await get('/notifications', 'ha');
    assert.match(seen.main, /<div class="page told-page" lang="en" dir="ltr">/, 'Hausa is not given the English page, marked');
    has(seen.main, ['<h1>Notifications</h1>', '<strong>A class is about to start</strong>', 'Everything you can choose is on.', '<div class="told-text" lang="en">'], 'the Hausa page');
    none(seen.main, ['data-in-english', 'told-stored'], 'the Hausa page');
  }
  console.log('Notifications: signed out goes to sign in and reads nothing; three reminders, a class and a renewal said whole by the page and one with no word shown as stored; thirteen messages: seven kept with what they are made of and said by the page in English, Arabic and French (an amount as money, a class’s moment in its own zone, a reason as typed, a file with no name said without one), five older ones in English shown as the message and in another language each under its kind’s name with the stored text set apart as English, one whose facts are not whole shown as stored, one with no word shown with no name; the note about English only while something on the page is English; an address that leaves the site not followed; what somebody typed kept as typed; eight switches in the database’s order, two held on, two marked not in use; none, some and all off said; nothing yet said as nothing; six kinds of unread centre and four of unread switches, each said as itself and neither taking the other with it; Arabic and French by the reader’s choice, saying once that the messages are English; Hausa in English, marked.');

  // =================================================== documents that changed
  {
    reset();
    // An account that owes nothing: no section, and the question was asked once.
    let seen = await get('/notifications');
    assert.equal(rpc('my_policy_standing').length, 1);
    none(seen.main, ['data-changed', 'Documents that have changed'], 'the page of an account that owes nothing');

    // What this account owes could not be read: the section is left out and
    // the rest of the page is whole. Nothing of the database's is shown.
    reset();
    standing = null;
    seen = await get('/notifications');
    assert.equal(seen.status, 200);
    assert.equal(rpc('my_policy_standing').length, 1);
    none(seen.main, ['data-changed', 'Documents that have changed', 'SYNTHETIC-DATABASE', 'statement timeout'], 'the page with the standing unread');
    has(seen.main, ['<h1>Notifications</h1>', '<h2>Coming up</h2>', '<h2>Recent</h2>'], 'the page with the standing unread');

    const owed = (slug, title, versionNumber, acceptedAt) => ({ slug, title, versionNumber, effectiveAt: '2026-11-24', acceptedAt });
    const before = (slug, title, versionNumber) => ({ slug, title, versionNumber, acceptedAt: '2026-10-29T08:00:00+00:00' });
    // Three documents ask for agreement. One changed since it was agreed to;
    // one is agreed to as it stands; one was never agreed to at all.
    standing = {
      acceptanceRequired: [
        owed('synthetic-terms', 'Synthetic terms', 3, null),
        owed('synthetic-privacy', 'Synthetic privacy notice', 2, '2026-11-20T09:14:00+00:00'),
        owed('synthetic-teaching', 'Synthetic teacher terms', 1, null),
      ],
      outstanding: 2,
      history: [before('synthetic-terms', 'Synthetic terms', 2), before('synthetic-privacy', 'Synthetic privacy notice', 2)],
    };
    seen = await get('/notifications');
    has(seen.main, [
      '<section class="told-section" data-changed="1"><h2>Documents that have changed</h2>',
      '<p class="muted told-english">You agreed to an earlier version of each of these, and that agreement is kept. The new version is not agreed to until you say so on its page.</p>',
      '<li data-changed-policy="synthetic-terms"><p class="told-name"><bdi>Synthetic terms</bdi></p>',
      '<li>Version: <bdi>3</bdi></li>', '<li>In force from: <bdi>Nov 24, 2026</bdi></li>',
      '<p><a href="/policies/synthetic-terms">Read what changed</a></p>',
    ], 'the changed document');
    none(seen.main, ['Synthetic privacy notice', 'Synthetic teacher terms', 'data-changed="2"'], 'the changed documents');
    // It is the first thing on the page, above what is coming up.
    assert.ok(seen.main.indexOf('data-changed="1"') < seen.main.indexOf('<h2>Coming up</h2>'), 'the changed document is not listed first');
    // It is not a kept message: it is not counted as unread and has no mark.
    assert.equal(seen.main.split('data-message=').length - 1, CENTRE.recent.length);

    // In Arabic: the page's words in Arabic, the owner's title as written and marked.
    seen = await get('/notifications', 'ar');
    has(seen.main, ['<h2>وثائق تغيّرت</h2>', '<bdi lang="en" dir="ltr">Synthetic terms</bdi>', '<li>الإصدار: <bdi>3</bdi></li>', '<a href="/policies/synthetic-terms">اقرأ ما تغيّر</a>',
      'وافقت على إصدار سابق من كل وثيقة من هذه، وتلك الموافقة محفوظة. الإصدار الجديد لا يُعدّ موافَقًا عليه حتى توافق عليه في صفحته.'], 'the changed document in Arabic');
    none(seen.main, ['Documents that have changed', 'Read what changed', 'Version:', 'In force from'], 'the changed document in Arabic');

    // The messages could not be read: the changed document is still said.
    centre = 'broken';
    seen = await get('/notifications');
    has(seen.main, ['data-centre="unread"', 'data-changed="1"', 'Synthetic terms'], 'the page with the messages unread');
    centre = 'ok';

    // Nothing changed, and an answer that is not a standing: no section.
    standing = { acceptanceRequired: [owed('synthetic-teaching', 'Synthetic teacher terms', 1, null)], outstanding: 1, history: [] };
    none((await get('/notifications')).main, ['data-changed'], 'a new account');
    standing = { SYNTHETIC: 'not a standing' };
    none((await get('/notifications')).main, ['data-changed', 'not a standing'], 'an answer that is not a standing');
    standing = NOTHING_OWED;
  }
  console.log('Notifications, documents that changed: listed first, one for each document agreed to before whose version in force is not; not one agreed to as it stands and not one never agreed to; the owner’s title as written; in Arabic; still said when the messages are unread; left out when it could not be read, with the rest of the page whole.');

  // ============================================================== the routes
  {
    reset();
    const post = async (path, body, signedIn = true) => {
      const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { ...(signedIn ? { cookie } : {}), 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const text = await response.text();
      assert.ok(!text.includes('SYNTHETIC'), `${path} sent the database's sentence: ${text}`);
      return { status: response.status, json: JSON.parse(text), cache: response.headers.get('cache-control') };
    };

    // ---- marking read
    let said = await post('/api/notifications', { ids: [M1] }, false);
    assert.deepEqual([said.status, said.json, said.cache], [401, { ok: false, code: 'not_authorized', message: 'Sign in first.' }, 'no-store']);
    assert.equal(rpc('mark_notifications_read').length, 0);
    // A request that names nothing marks nothing. The database would read "no ids" as "everything".
    for (const body of ['not json', '{}', { ids: null }, { ids: [] }, { ids: 'all' }, { ids: [M1, 7] }, { ids: ['x'] }, [M1], { ids: Array.from({ length: 101 }, () => M1) }]) {
      said = await post('/api/notifications', body);
      assert.deepEqual([said.status, said.json], [400, { ok: false, code: 'invalid', message: 'Name the messages to mark as read.' }], JSON.stringify(body).slice(0, 40));
    }
    assert.equal(rpc('mark_notifications_read').length, 0, 'a request that named nothing reached the database');
    assert.equal(live.recent.filter((m) => m.readAt === null).length, 3, 'something was marked read');
    said = await post('/api/notifications', { ids: [M1, M2, M1] });
    assert.deepEqual([said.status, said.json, said.cache], [200, { ok: true, marked: 2 }, 'no-store']);
    assert.deepEqual(rpc('mark_notifications_read').map((c) => c.sent), [{ p_ids: [M1, M2] }]);
    assert.equal(live.recent.find((m) => m.id === M4).readAt, null, 'a message nobody named was marked');
    markAnswer = DATABASE('42501', 'sign in to manage your notifications');
    said = await post('/api/notifications', { ids: [M4] });
    assert.deepEqual([said.status, said.json.code], [401, 'not_authorized']);
    markAnswer = DATABASE('57014', 'canceling statement due to statement timeout');
    said = await post('/api/notifications', { ids: [M4] });
    assert.deepEqual([said.status, said.json], [500, { ok: false, code: 'failed', message: 'They could not be marked as read just now.' }]);
    markAnswer = 'ok';

    // ---- a switch
    calls.length = 0;
    said = await post('/api/notifications/preferences', { kind: 'payout_paid', enabled: false }, false);
    assert.deepEqual([said.status, said.json.reason, said.cache], [401, 'signed_out', 'no-store']);
    for (const body of ['not json', '{}', { kind: 'payout_paid' }, { enabled: true }, { kind: 7, enabled: true }, { kind: 'payout_paid', enabled: 'false' }, [{ kind: 'payout_paid', enabled: true }]]) {
      said = await post('/api/notifications/preferences', body);
      assert.deepEqual([said.status, said.json.reason], [400, 'malformed'], JSON.stringify(body));
    }
    assert.equal(rpc('set_notification_preference').length, 0);
    said = await post('/api/notifications/preferences', { kind: 'payout_paid', enabled: false, user_id: 'somebody-else' });
    assert.deepEqual([said.status, said.json], [200, { ok: true, value: { kind: 'payout_paid', enabled: false } }]);
    assert.deepEqual(rpc('set_notification_preference').map((c) => c.sent), [{ p_kind: 'payout_paid', p_enabled: false }]);
    // Each way the database refuses, under its own name and status, and never in its own words.
    for (const [code, reason, status, message] of [
      ['42501', 'signed_out', 401, 'Sign in to choose what you are told.'],
      ['22023', 'unknown_kind', 400, 'That is not something the platform tells you about.'],
      ['23514', 'locked', 409, 'Being told that money owed to you did not arrive cannot be switched off.'],
      ['57014', 'failed', 500, 'That change was not saved.'],
    ]) {
      setAnswer = DATABASE(code, 'being told your money did not arrive cannot be turned off');
      said = await post('/api/notifications/preferences', { kind: 'payout_failed', enabled: false });
      assert.deepEqual([said.status, said.json], [status, { ok: false, reason, message }], code);
    }
    // An answer nobody can read: the row may have been written, so it is not "not saved".
    setAnswer = 'odd';
    said = await post('/api/notifications/preferences', { kind: 'payout_paid', enabled: true });
    assert.deepEqual([said.status, said.json], [502, { ok: false, reason: 'unconfirmed', message: 'No answer came back. Reload to see whether the change was saved.' }]);
    reset();
  }
  console.log('Notification routes: nine requests that name no message each refused and none reaching the database, where "no ids" means every message; two named and two marked, a third left alone; a switch sends the kind and on-or-off and nothing else; four refusals each under its own name and status; an answer nobody can read is "unconfirmed", not "not saved"; nothing the database said is sent to a browser; nothing is cached.');

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
        reset();
        const { context, tab, errors } = await open('/notifications', code, width);
        await tab.locator('main h1').waitFor();
        await fits(tab, width, `/notifications ${code} ${width}`);
        assert.equal(await tab.evaluate(() => document.documentElement.dir || 'ltr'), code === 'ar' ? 'rtl' : 'ltr');
        // What the database wrote in English reads left to right whichever way the page does,
        // and a name typed in Arabic reads right to left whichever way the page does.
        assert.equal(await tab.locator('[data-message] [lang="en"] p').first().evaluate((el) => getComputedStyle(el).direction), 'ltr');
        assert.equal(await tab.locator('[data-reminder="class_starting"] .told-name bdi').evaluate((el) => getComputedStyle(el).direction), 'rtl');
        // In a message the page says: an amount and a reference read left to right on an Arabic page,
        // and a reason typed in Arabic reads right to left on an English one.
        assert.equal(await tab.locator(`[data-message="${N1}"] .told-said bdi`).first().evaluate((el) => getComputedStyle(el).direction), 'ltr');
        assert.equal(await tab.locator(`[data-message="${N6}"] .told-said bdi`).last().evaluate((el) => getComputedStyle(el).direction), 'rtl');
        assert.equal(await tab.locator('[data-message][data-said="here"]').count(), 7);
        // Eight switches, each a real checkbox with its words beside it, none wider than the card.
        assert.equal(await tab.locator('.told-switch input[type="checkbox"]').count(), 8);
        assert.equal(await tab.locator('.told-switch input:disabled').count(), 2);
        const small = await tab.locator('.told-switch input').evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 40).length);
        assert.equal(small, 0, `/notifications ${code} ${width}: a checkbox is stretched`);
        // Nothing on the page leads off the site.
        const outside = await tab.locator('main a').evaluateAll((els) => els.map((el) => el.getAttribute('href')).filter((href) => !href?.startsWith('/') || href.startsWith('//')));
        assert.deepEqual(outside, []);
        if (shots && width !== 1440) await tab.screenshot({ path: `${shots}/notifications-${code}-${width}.png`, fullPage: true });
        assert.deepEqual(errors, [], `/notifications ${code} ${width}: ${errors.join(' | ')}`);
        await context.close();
      }
      console.log(`Synthetic notifications in ${code}: fits a phone with no sideways scroll; stored English reads left to right and a typed Arabic name right to left; in a message the page says, an amount reads left to right and a reason typed in Arabic right to left; eight checkboxes, two held; no link leaves the site; no page error`);
    }

    // A switch moves when the database says it did, and only then.
    {
      reset();
      const { context, tab, errors } = await open('/notifications', 'en', 390);
      const box = (kind) => tab.locator(`.told-switch[data-kind="${kind}"] input`);
      const summary = tab.locator('.told-prefs [role="status"]');
      await box('payout_paid').click();
      await tab.locator('.told-switch[data-kind="payout_paid"][data-on="no"]').waitFor();
      assert.equal(await box('payout_paid').isChecked(), false);
      assert.equal(await summary.innerText(), 'Optional messages switched off: 1');
      assert.deepEqual(rpc('set_notification_preference').map((c) => c.sent), [{ p_kind: 'payout_paid', p_enabled: false }]);
      assert.equal(await tab.locator('main [role="alert"]').count(), 0);
      // Refused: the switch stays where it was, and the page says so in its own words.
      setAnswer = DATABASE('57014', 'canceling statement due to statement timeout');
      await box('live_cancelled').click();
      await tab.locator('[data-pref-said="failed"]').waitFor();
      assert.equal(await tab.locator('[data-pref-said]').innerText(), 'That change was not saved.');
      assert.equal(await box('live_cancelled').isChecked(), true);
      assert.equal(await summary.innerText(), 'Optional messages switched off: 1');
      setAnswer = DATABASE('23514', 'being told your money did not arrive cannot be turned off');
      await box('live_cancelled').click();
      await tab.locator('[data-pref-said="locked"]').waitFor();
      assert.equal(await tab.locator('[data-pref-said]').innerText(), 'Being told that money owed to you did not arrive cannot be switched off.');
      // No answer that can be read: not "saved", not "not saved". Reload to see.
      setAnswer = 'odd';
      await box('live_cancelled').click();
      await tab.locator('[data-pref-said="unsure"]').waitFor();
      assert.equal(await tab.locator('[data-pref-said]').innerText(), 'No answer came back. Reload this page to see whether the change was saved.');
      assert.equal(await box('live_cancelled').isChecked(), true);
      // The connection dropping is the same.
      await tab.route('**/api/notifications/preferences', (route) => route.abort());
      setAnswer = 'ok';
      await box('media_encode_failed').click();
      await tab.locator('[data-pref-said="unsure"]').waitFor();
      assert.equal(await box('media_encode_failed').isChecked(), true);
      await tab.unroute('**/api/notifications/preferences');
      // A good answer clears what was said, and switching back on is counted.
      await box('payout_paid').click();
      await tab.locator('.told-switch[data-kind="payout_paid"][data-on="yes"]').waitFor();
      assert.equal(await summary.innerText(), 'Everything you can choose is on.');
      assert.equal(await tab.locator('[data-pref-said]').count(), 0);
      assert.ok(!(await tab.locator('body').innerText()).includes('SYNTHETIC-DATABASE'));

      // Marking read: refused first, then the three this page showed as unread, and no others.
      calls.length = 0;
      markAnswer = DATABASE('57014', 'canceling statement due to statement timeout');
      await tab.getByRole('button', { name: 'Mark all as read', exact: true }).click();
      await tab.locator('[data-mark-failed]').waitFor();
      assert.equal(await tab.locator('[data-mark-failed]').innerText(), 'They could not be marked as read just now.');
      assert.equal(await tab.locator('[data-message][data-read="no"]').count(), 3);
      markAnswer = 'ok';
      await tab.getByRole('button', { name: 'Mark all as read', exact: true }).click();
      await tab.locator('[data-marked="3"]').waitFor();
      assert.equal(await tab.locator('[data-marked]').innerText(), 'Marked as read: 3');
      assert.deepEqual(rpc('mark_notifications_read').map((c) => c.sent), [{ p_ids: [M1, M2, M4] }, { p_ids: [M1, M2, M4] }]);
      // The list is redrawn from the database: nothing unread, no button, and what was said is still there.
      await tab.locator('[data-centre="list"][data-unread="0"]').waitFor();
      assert.equal(await tab.locator('[data-message][data-read="no"]').count(), 0);
      assert.equal(await tab.getByRole('button', { name: 'Mark all as read', exact: true }).count(), 0);
      assert.equal(await tab.locator('[data-marked]').innerText(), 'Marked as read: 3');
      assert.equal(await tab.locator('[data-mark-failed]').count(), 0);
      if (shots) await tab.screenshot({ path: `${shots}/notifications-en-390-after.png`, fullPage: true });
      assert.deepEqual(errors.filter((line) => !(line.includes('[notifications]') && line.includes('Server'))), [], errors.join(' | '));
      await context.close();
    }
    // The same in Arabic: the page's own words, a count as Arabic writes it.
    {
      reset();
      const { context, tab, errors } = await open('/notifications', 'ar', 320);
      await tab.locator('.told-switch[data-kind="payout_paid"] input').click();
      await tab.locator('.told-switch[data-kind="payout_paid"][data-on="no"]').waitFor();
      assert.match(await tab.locator('.told-prefs [role="status"]').innerText(), /^الرسائل الاختيارية الموقوفة: (1|١)$/u);
      setAnswer = 'odd';
      await tab.locator('.told-switch[data-kind="live_cancelled"] input').click();
      await tab.getByRole('alert').filter({ hasText: 'لم يصل ردّ. أعد تحميل هذه الصفحة لترى هل حُفظ التغيير.' }).waitFor();
      await fits(tab, 320, '/notifications ar 320 after a refusal');
      await tab.getByRole('button', { name: 'اجعلها كلها مقروءة', exact: true }).click();
      await tab.locator('[data-marked="3"]').waitFor();
      assert.match(await tab.locator('[data-marked]').innerText(), /^جُعلت مقروءة: (3|٣)$/u);
      if (shots) await tab.screenshot({ path: `${shots}/notifications-ar-320-after.png`, fullPage: true });
      assert.deepEqual(errors.filter((line) => !(line.includes('[notifications]') && line.includes('Server'))), [], errors.join(' | '));
      await context.close();
    }
    // Unread, in a browser: each said aloud, once.
    {
      reset(); centre = 'broken'; prefs = 'broken';
      const { context, tab, errors } = await open('/notifications', 'ar', 320);
      await tab.getByRole('alert').filter({ hasText: 'تعذّرت قراءة إشعاراتك الآن. هذا لا يعني أنه لا توجد إشعارات.' }).waitFor();
      await tab.getByRole('alert').filter({ hasText: 'تعذّرت قراءة ما اخترتَه الآن. لم يتغيّر شيء.' }).waitFor();
      assert.equal(await tab.locator('main [role="alert"]').count(), 2);
      await fits(tab, 320, '/notifications ar 320 unread');
      if (shots) await tab.screenshot({ path: `${shots}/notifications-ar-320-unread.png`, fullPage: true });
      // The page logs why on the server. A development server replays its log in
      // the browser's console, marked as the server's; a production build does
      // not. Nothing else may be there, and the reason is not in the page.
      assert.ok(errors.every((line) => line.includes('[notifications]') && line.includes('Server')), errors.join(' | '));
      assert.ok(!(await tab.locator('body').innerText()).includes('SYNTHETIC-DATABASE'));
      await context.close();
    }
    console.log('Synthetic switches and marking: a switch moves when the database says it did; refused, held, unreadable and dropped each leave it where it was and say one of three sentences; marking names the three shown as unread and no others, says how many, and keeps saying it once the list is redrawn; the same in Arabic; unread said twice, once for each thing.');
  }
  console.log('Notifications HTTP smoke passed. Not real Auth, RLS, a notification, a payout or a class: the stand-in answers what it is told to.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close().catch(() => {});
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
