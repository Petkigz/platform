// Real Next /policies and /policies/<slug> pages and the /api/policies route
// against an entirely synthetic loopback Auth/REST API. This is not evidence
// about hosted Supabase, JWT validation, RLS, or the rules inside
// accept_policy(): the stand-in answers whatever it is asked, and refuses
// only when this script tells it to. No real policy is in it; every document
// here is invented.
//
// What it does show: the register and one document as a visitor is sent
// them, in English, in Arabic and in English for a language held for review;
// that a document's own words are shown as written and marked as English;
// that a register or a document that could not be read is said as unread at
// status 200 and is neither "no policies" nor a broken page; that a draft is
// never shown; that the button asks the route and not the database; that the
// route sends the writer the version the page showed and reads nothing
// first; the name and status the route gives each of the writer's refusals,
// "changed" among them; that the database's own sentences reach nobody; and
// that the notice about a changed document is asked for once an opening, by
// somebody signed in, and is put away for those versions. The stand-in's
// writer compares the version the way the real one does. The
// expected sentences are typed here rather than imported, so this fails if a
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

// A sentence only the database would write. It must reach no reader.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE permission denied for table policy_versions';
const TERMS = 'synthetic-terms';
const PRIVACY = 'synthetic-privacy';
const TEACHING = 'synthetic-teaching';
const CHILDREN = 'synthetic-children';
const AGREED_AT = '2026-11-20T09:14:00+00:00';
const BODY = [
  '# Synthetic first heading',
  'Synthetic first paragraph, with a very long address in it: https://example.invalid/a-very-long-address-that-has-no-place-to-break-and-would-widen-a-narrow-screen-if-it-were-allowed-to',
  '[OWNER DECISION: SYNTHETIC-UNANSWERED which law applies]',
  '## Synthetic second heading',
  'Synthetic second paragraph.\nIts second line.',
].join('\n\n');

const fresh = () => ({
  // In the order the page asks for them.
  documents: [
    { slug: TERMS, title: 'Synthetic terms', summary: 'Synthetic summary of the terms.', audience: 'everyone', acceptance_required: true, sort_order: 1 },
    { slug: PRIVACY, title: 'Synthetic privacy notice', summary: 'Synthetic summary of the notice.', audience: 'everyone', acceptance_required: false, sort_order: 2 },
    { slug: TEACHING, title: 'Synthetic teacher terms', summary: 'Synthetic summary for teachers.', audience: 'teacher', acceptance_required: true, sort_order: 3 },
    // No summary, and an audience word nobody planned for on the last one.
    { slug: CHILDREN, title: 'Synthetic children’s notice', summary: null, audience: 'child', acceptance_required: false, sort_order: 4 },
    { slug: 'synthetic-schools', title: 'Synthetic school terms', summary: 'Synthetic summary for schools.', audience: 'institution', acceptance_required: true, sort_order: 5 },
  ],
  // The version in force, by slug. A document that is not here is a draft.
  live: {
    [TERMS]: { versionNumber: 3, effectiveAt: '2026-11-01', changeNote: 'Synthetic note about what changed.', body: BODY },
    [PRIVACY]: { versionNumber: 1, effectiveAt: '2026-10-05', changeNote: null, body: 'Synthetic privacy paragraph.' },
  },
  // When this account agreed to the live version, by slug.
  agreed: {},
  // What this account agreed to before: [slug, version].
  history: [],
  // Paths that answer with a database error.
  broken: new Set(),
  // Paths that answer with something that is not what was asked for.
  nonsense: new Set(),
  // What the writer answers: 'ok', or [status, body].
  accept: 'ok',
  // The owner publishes this version of the terms just before the writer runs.
  publishDuringWrite: null,
  // How long the writer takes.
  delay: 0,
});
let state = fresh();
const liveRow = (doc) => ({ slug: doc.slug, title: doc.title, summary: doc.summary, audience: doc.audience, acceptanceRequired: doc.acceptance_required, ...state.live[doc.slug] });

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
  // The register is one of the few things a signed-out visitor may read.
  if (path === '/rest/v1/policy_documents') {
    const asked = url.searchParams.get('slug');
    const found = state.documents.filter((d) => !asked || asked === `eq.${d.slug}`);
    // Asked for one row as an object, PostgREST refuses when there is not exactly one.
    if (String(req.headers.accept ?? '').includes('vnd.pgrst.object')) {
      if (found.length === 1) send(found[0]); else { res.writeHead(406); send({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${found.length} rows` }); }
    } else send(found);
    return;
  }
  if (path === '/rest/v1/rpc/policies_in_force') { send(state.documents.filter((d) => state.live[d.slug]).map((d) => { const { body: _text, ...row } = liveRow(d); return row; })); return; }
  if (path === '/rest/v1/rpc/policy_page') { const doc = state.documents.find((d) => d.slug === payload.p_slug); send(doc && state.live[doc.slug] ? liveRow(doc) : null); return; }
  if (!signedIn) { res.writeHead(401); res.end('{}'); return; }
  if (path === '/rest/v1/rpc/my_policy_standing') {
    const required = state.documents.filter((d) => d.acceptance_required && state.live[d.slug]);
    send({
      acceptanceRequired: required.map((d) => ({ slug: d.slug, title: d.title, versionNumber: state.live[d.slug].versionNumber, effectiveAt: state.live[d.slug].effectiveAt, acceptedAt: state.agreed[d.slug] ?? null })),
      outstanding: required.filter((d) => !state.agreed[d.slug]).length,
      history: state.history.map(([slug, versionNumber]) => ({ slug, title: state.documents.find((d) => d.slug === slug)?.title ?? slug, versionNumber, acceptedAt: '2026-10-29T08:00:00+00:00' })),
    });
  }
  else if (path === '/rest/v1/rpc/accept_policy') {
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
    if (state.accept === 'ok') {
      const slug = payload.p_slug;
      if (state.publishDuringWrite !== null) {
        // A new version went into force after the page was sent and before this write.
        state.live[slug] = { ...state.live[slug], versionNumber: state.publishDuringWrite, body: 'Synthetic newer paragraph.' };
        state.agreed = {};
        state.publishDuringWrite = null;
      }
      // The writer's own rules, as migration 20261281149000 has them.
      if (!state.live[slug]) { res.writeHead(400); send({ code: '23514', message: 'policy:not_in_force', details: null, hint: null }); return; }
      if (state.live[slug].versionNumber !== payload.p_version) { res.writeHead(400); send({ code: '23514', message: 'policy:changed', details: null, hint: 'the version in force is not the one that was read' }); return; }
      // What the writer would leave behind, so the page read again shows it.
      const already = Boolean(state.agreed[slug]);
      if (!already) state.agreed[slug] = AGREED_AT;
      send({ slug, versionNumber: state.live[slug].versionNumber, acceptedAt: state.agreed[slug], already });
    } else { res.writeHead(state.accept[0]); send(state.accept[1]); }
  }
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
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
const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'');
const has = (html, sentences, what) => { for (const sentence of sentences) assert.ok(html.includes(sentence), `${what} lacks "${sentence}"\n${html.slice(0, 7000)}`); };
const hasNot = (html, sentences, what) => { for (const sentence of sentences) assert.ok(!html.includes(sentence), `${what} still says "${sentence}"`); };
const moment = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: 'UTC' }).format(new Date(iso));
const day = (code, iso) => new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
// One card of the register, from its marker to the end of its item.
const card = (html, slug) => { const from = html.indexOf(`data-policy="${slug}"`); assert.ok(from > 0, `no card for ${slug}`); const to = html.indexOf('data-policy="', from + 20); return html.slice(from, to === -1 ? html.indexOf('class="muted policy-kept"', from) : to); };
// English a translated page must not hold. A document's own words are the
// owner's and are English on every page; all of them here begin "Synthetic".
const ENGLISH_ONLY = ['Terms and privacy', 'What you agree to', 'Every version', 'could not be read', 'No policy', 'None of these', 'Documents in force', 'The others', 'For everyone', 'For children', 'For teachers', 'For institutions', 'Not in force', 'Version:', 'In force from', 'You will be asked', 'It is for reading', 'A concern about', 'This document', 'What changed', 'Your agreement', 'Sign in', 'Agreeing records', 'Agree to this', 'You agreed', 'Documents waiting', 'Ask for help', '>Home<', 'Your account', 'Working'];
// What the database calls things. None of it is a sentence.
const STORED = ['SYNTHETIC', 'OWNER DECISION', 'acceptance_required', 'in_force', '>everyone', '>teacher<', '>institution<', '>child<'];
const KEPT = 'Every version of a document is kept. A change is a new version that takes effect on a date, never an edit to an old one, and where it needs your agreement you are asked again.';
const UNREAD = 'The policies could not be read just now. This does not mean there are none. Try again in a moment.';

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
  const page = async (path, headers = {}) => inner(await whole(path, headers));
  const send = async (body, headers = { cookie }) => {
    const response = await fetch(`${origin}/api/policies`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    assert.equal(text.includes('SYNTHETIC'), false, `the route passed on a sentence that is not its own: ${text}`);
    return { status: response.status, json: JSON.parse(text) };
  };
  const expect = (answer, status, reason, what) => {
    assert.equal(answer.status, status, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(answer.json.ok, false, what);
    assert.equal(answer.json.reason, reason, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(typeof answer.json.message, 'string', what);
    assert.deepEqual(Object.keys(answer.json).sort(), ['message', 'ok', 'reason'], what);
  };

  // ------------------------------------------------------------ the register
  // Signed out: anybody may read it.
  calls.length = 0;
  const html = await whole('/policies', { 'accept-language': 'en' });
  assert.match(html, /<title>Terms and privacy[^<]*<\/title>/);
  const en = inner(html);
  assert.equal(calls.some((c) => c.signedIn), false);
  has(en, [
    '<div class="page policy-page">',
    '<h1>Terms and privacy</h1><p class="lede">What you agree to when you learn or teach here, what is done with your data, and what happens when something goes wrong.</p>',
    '<p class="muted" data-policies-state="in-force">Documents in force: 2 · The others are written and not yet approved.</p>',
    `<p class="muted policy-kept">${KEPT}</p>`,
    'A concern about how somebody behaved, or about a child’s safety, is not a question about a policy. It goes to a person. <a href="/support">Ask for help</a>',
    '<p class="policy-ways"><a href="/">Home</a></p>',
  ], 'the register');
  hasNot(en, [...STORED, 'UTC', 'No summary yet', 'data-policies-state="unread"', 'None of these is in force yet.'], 'the register');
  assert.equal(en.split('data-policy="').length - 1, 5);
  // In force, and it asks for agreement. The day has no clock on it.
  has(card(en, TERMS), [
    'data-in-force="yes"', `<h2><a href="/policies/${TERMS}">Synthetic terms</a></h2><p class="muted">Synthetic summary of the terms.</p>`,
    `<ul class="policy-facts"><li>For everyone</li><li><strong>Version: 3</strong></li><li>In force from: <bdi>${day('en', '2026-11-01')}</bdi></li><li>You will be asked to agree to it, and the time you agree is kept.</li></ul>`,
  ], 'the terms card');
  assert.equal(day('en', '2026-11-01'), 'Nov 1, 2026');
  // In force, and only for reading.
  has(card(en, PRIVACY), ['data-in-force="yes"', '<strong>Version: 1</strong>', `In force from: <bdi>${day('en', '2026-10-05')}</bdi>`, '<li>It is for reading. There is nothing to agree to.</li>'], 'the privacy card');
  // Written and not approved: the card stays, and says so.
  const draft = card(en, TEACHING);
  has(draft, ['data-in-force="no"', `<a href="/policies/${TEACHING}">Synthetic teacher terms</a>`, '<li>For teachers</li><li><strong>Not in force yet</strong></li><li>You will be asked to agree to it, and the time you agree is kept.</li>'], 'the draft card');
  hasNot(draft, ['Version:', 'In force from'], 'the draft card');
  // No summary is no line, not a sentence about there being none.
  has(card(en, CHILDREN), [`<h2><a href="/policies/${CHILDREN}">Synthetic children’s notice</a></h2><ul class="policy-facts"><li>For children and their guardians</li>`], 'the children’s card');
  has(card(en, 'synthetic-schools'), ['<li>For institutions</li>'], 'the schools card');
  // An audience word nobody planned for is for everyone, never the stored word.
  state.documents[4].audience = 'SYNTHETIC-AUDIENCE';
  has(card(await page('/policies', { 'accept-language': 'en' }), 'synthetic-schools'), ['<li>For everyone</li>'], 'a card with an audience nobody planned for');
  state = fresh();

  // Every document in force: nothing is said about others.
  state.documents = state.documents.slice(0, 2);
  let some = await page('/policies', { 'accept-language': 'en' });
  has(some, ['<p class="muted" data-policies-state="in-force">Documents in force: 2</p>'], 'the register with everything in force');
  // None in force: said first, with why, and the cards stay.
  state = fresh(); state.live = {};
  some = await page('/policies', { 'accept-language': 'en' });
  has(some, ['<div class="notice" data-policies-state="none-in-force"><strong>None of these is in force yet.</strong> A document is published only when the owner of the platform has answered the questions in it that only they can answer, such as which law applies and who is responsible for your data. Until then it is not in force, and a draft is not shown.</div>'], 'the register with nothing in force');
  hasNot(some, ['Documents in force', 'Version:'], 'the register with nothing in force');
  assert.equal(some.split('data-policy="').length - 1, 5);
  // No document at all.
  state.documents = [];
  some = await page('/policies', { 'accept-language': 'en' });
  has(some, ['<div class="notice" data-policies-state="none">No policy has been written yet.</div>', KEPT], 'the register with no document');
  hasNot(some, ['None of these is in force yet.', 'data-policy="'], 'the register with no document');
  state = fresh();

  // Not read is not none: one sentence, at status 200, and not the "this page broke" screen.
  for (const path of ['/rest/v1/policy_documents', '/rest/v1/rpc/policies_in_force']) {
    state.broken = new Set([path]);
    const unread = await page('/policies', { 'accept-language': 'en' });
    has(unread, ['<h1>Terms and privacy</h1>', `<div class="notice error" role="alert" data-policies-state="unread">${UNREAD}</div>`, '<a href="/support">Ask for help</a>'], `the register with ${path} unread`);
    hasNot(unread, ['SYNTHETIC', 'No policy has been written yet.', 'None of these', 'data-policy="', 'Not in force yet'], `the register with ${path} unread`);
    state = fresh();
    // A reply that is not a list is unread too.
    state.nonsense = new Set([path]);
    has(await page('/policies', { 'accept-language': 'en' }), ['data-policies-state="unread"'], `the register with ${path} answering something else`);
    state = fresh();
  }
  state.broken = new Set(['/rest/v1/policy_documents']);
  has(await page('/policies', { 'accept-language': 'ar' }), ['تعذّرت قراءة السياسات الآن. هذا لا يعني أنه لا توجد سياسات. حاول مرة أخرى بعد قليل.'], 'the unread register in Arabic');
  state = fresh();
  console.log('Policy register: read signed out; five cards with the version and a day with no clock on it; a draft keeps its card and shows no version; no summary is no line; nothing in force and no document are two different sentences; unread, either read, is said at 200 and is neither.');

  // In Arabic: the page is Arabic, and the documents are as the owner wrote them.
  const ar = await page('/policies', { 'accept-language': 'ar' });
  has(ar, [
    '<h1>الشروط والخصوصية</h1><p class="lede">ما توافق عليه حين تتعلّم أو تعلّم هنا، وما يُفعل ببياناتك، وما يحدث إذا وقع خطأ.</p>',
    '<p class="muted" data-policies-state="in-force">الوثائق السارية: 2 · الوثائق الأخرى مكتوبة ولم تُعتمد بعد.</p>',
    'القلق من تصرّف شخص ما، أو على سلامة طفل، ليس سؤالًا عن سياسة. إنه يُرفع إلى إنسان. <a href="/support">اطلب المساعدة</a>',
    '<a href="/">الرئيسية</a>',
  ], 'the register in Arabic');
  has(card(ar, TERMS), [
    `<h2 lang="en" dir="ltr"><a href="/policies/${TERMS}">Synthetic terms</a></h2><p class="muted" lang="en" dir="ltr">Synthetic summary of the terms.</p>`,
    `<li>للجميع</li><li><strong>الإصدار: 3</strong></li><li>سارية من: <bdi>${day('ar', '2026-11-01')}</bdi></li><li>ستُطلب منك الموافقة عليها، ويُحفظ وقت موافقتك.</li>`,
  ], 'the terms card in Arabic');
  has(card(ar, TEACHING), ['<li>للمعلّمين</li><li><strong>غير سارية بعد</strong></li>'], 'the draft card in Arabic');
  has(card(ar, CHILDREN), ['<li>للأطفال وأولياء أمورهم</li>', '<li>هي للقراءة. لا شيء فيها يحتاج إلى موافقة.</li>'], 'the children’s card in Arabic');
  has(card(ar, 'synthetic-schools'), ['<li>للمؤسسات</li>'], 'the schools card in Arabic');
  hasNot(ar, [...ENGLISH_ONLY, ...STORED], 'the register in Arabic');
  assert.match(await whole('/policies', { 'accept-language': 'ar' }), /<title>الشروط والخصوصية[^<]*<\/title>/);
  // A language held for review reads this part in English, and the page says so.
  const ha = await page('/policies', { 'accept-language': 'ha' });
  has(ha, ['<div class="page policy-page" lang="en" dir="ltr">', '<h1>Terms and privacy</h1>', `<h2><a href="/policies/${TERMS}">Synthetic terms</a></h2>`], 'the register for a held language');
  console.log('Policy register in Arabic: every sentence and day in Arabic, each document’s title and summary as written and marked English, no other English and no stored word; a held language reads it in English, marked.');

  // ------------------------------------------------------------ one document
  // Signed out, a document that asks for agreement.
  calls.length = 0;
  const oneHtml = await whole(`/policies/${TERMS}`, { 'accept-language': 'en' });
  assert.match(oneHtml, /<title>Synthetic terms[^<]*<\/title>/);
  const one = inner(oneHtml);
  assert.equal(rpcs('my_policy_standing').length, 0, 'a signed-out reader’s standing was asked for');
  has(one, [
    '<div class="page policy-page" data-policy-state="live" data-policy-version="3">',
    '<p class="eyebrow"><a href="/policies">Terms and privacy</a></p><h1>Synthetic terms</h1><p class="lede">Synthetic summary of the terms.</p>',
    `<ul class="policy-facts"><li><strong>Version: 3</strong></li><li>In force from: <bdi>${day('en', '2026-11-01')}</bdi></li><li>For everyone</li></ul>`,
    '<p class="muted policy-change">What changed in this version: <bdi>Synthetic note about what changed.</bdi></p>',
    // Headings and paragraphs, and nothing else.
    '<article class="policy-body" data-policy-body="true"><h2>Synthetic first heading</h2><p>Synthetic first paragraph, with a very long address in it: https://example.invalid/',
    '<h2>Synthetic second heading</h2><p>Synthetic second paragraph.\nIts second line.</p></article>',
    '<section class="card policy-agree" data-policy-agree="signed-out"><h2>Your agreement</h2><p class="muted">This document asks for your agreement, and the time you give it is kept with your account. Sign in first.</p>',
    `<a class="btn" href="/sign-in?next=/policies/${TERMS}">Sign in to agree</a>`,
    `<p class="muted policy-kept">${KEPT}</p><p class="policy-ways"><a href="/policies">Terms and privacy</a></p>`,
  ], 'the document signed out');
  // A question the owner has not answered is never shown as a term, and the
  // English page does not say the text is in the language it was written in.
  hasNot(one, [...STORED, 'which law applies', '<button', 'The document is shown in the language it was written in.', 'UTC'], 'the document signed out');

  // Signed in and not agreed: the button, what pressing it records, and how many wait.
  calls.length = 0;
  let mine = await page(`/policies/${TERMS}`, { cookie, 'accept-language': 'en' });
  assert.equal(rpcs('my_policy_standing').length, 1);
  has(mine, [
    'data-policy-agree="asked"', '<div class="policy-accept" data-policy-accept="asked"><p class="muted">Agreeing records that you have read this version and accept it. The version and the time are kept with your account.</p>',
    'data-policy-agree-button="true">Agree to this version</button>',
    '<p class="muted" data-policy-waiting="true">Documents waiting for your agreement: 1</p>',
  ], 'the document signed in');
  hasNot(mine, ['Sign in to agree', 'You agreed', 'href="/account"'], 'the document signed in');
  // Agreed: the time, on a named clock, and where the list is. No button.
  state.agreed[TERMS] = AGREED_AT;
  mine = await page(`/policies/${TERMS}`, { cookie, 'accept-language': 'en' });
  has(mine, [
    'data-policy-agree="agreed"', `<p class="policy-agreed" role="status">You agreed to this version on: <bdi>${moment('en', AGREED_AT)}</bdi></p>`,
    '<p class="muted">What you have agreed to is listed on your account page. <a href="/account">Your account</a></p>',
  ], 'the document agreed to');
  assert.equal(moment('en', AGREED_AT), 'Nov 20, 2026, 9:14 AM UTC');
  hasNot(mine, ['<button', 'data-policy-waiting', 'Agreeing records'], 'the document agreed to');
  state = fresh();
  // Whether they agreed could not be read: the button is still offered, since
  // pressing twice is no mistake, and nothing is said about how many wait.
  state.broken = new Set(['/rest/v1/rpc/my_policy_standing']);
  mine = await page(`/policies/${TERMS}`, { cookie, 'accept-language': 'en' });
  has(mine, ['data-policy-state="live"', 'Synthetic second paragraph.', '>Agree to this version</button>'], 'the document with the standing unread');
  hasNot(mine, ['SYNTHETIC', 'data-policy-waiting', 'You agreed'], 'the document with the standing unread');
  state = fresh();

  // For reading only: no agreement card, signed in or not, and the standing is not asked for.
  calls.length = 0;
  const reading = await page(`/policies/${PRIVACY}`, { cookie, 'accept-language': 'en' });
  has(reading, ['<h1>Synthetic privacy notice</h1>', '<article class="policy-body" data-policy-body="true"><p>Synthetic privacy paragraph.</p></article>'], 'a document for reading');
  hasNot(reading, ['data-policy-agree', 'Your agreement', 'What changed in this version', '<button'], 'a document for reading');
  assert.equal(rpcs('my_policy_standing').length, 0);

  // A draft: said, and never shown.
  const unapproved = await page(`/policies/${TEACHING}`, { cookie, 'accept-language': 'en' });
  has(unapproved, [
    '<div class="page policy-page">', '<h1>Synthetic teacher terms</h1>',
    '<div class="notice" data-policy-state="draft"><strong>Not in force yet</strong> This document is written, but no version of it has been approved, so there is nothing here to read or to agree to. A draft is not shown, because it can still change. Nothing here asks for your agreement until a version is approved.</div>',
    KEPT,
  ], 'a draft');
  hasNot(unapproved, ['data-policy-body', 'data-policy-agree', '<button', 'Version:'], 'a draft');
  // A live row with no version number in it is not a version.
  state.live[TEACHING] = { versionNumber: null, effectiveAt: null, changeNote: null, body: 'SYNTHETIC-DRAFT text' };
  hasNot(await page(`/policies/${TEACHING}`, { 'accept-language': 'en' }), ['SYNTHETIC-DRAFT', 'data-policy-body'], 'a row with no version');
  state = fresh();

  // No such document is "nothing at this address"; an address the table could
  // not hold asks the database nothing.
  await whole('/policies/synthetic-nothing', { 'accept-language': 'en' }, 404);
  calls.length = 0;
  for (const bad of ['Synthetic_Terms', 'a--b', `${'a'.repeat(61)}`]) await whole(`/policies/${bad}`, { 'accept-language': 'en' }, 404);
  assert.equal(calls.some((c) => c.path === '/rest/v1/policy_documents' || c.path === '/rest/v1/rpc/policy_page'), false, 'a slug the table could not hold was still asked for');

  // Not read: one sentence at 200, under the register's name, and no document.
  for (const path of ['/rest/v1/policy_documents', '/rest/v1/rpc/policy_page']) {
    state.broken = new Set([path]);
    const unreadHtml = await whole(`/policies/${TERMS}`, { cookie, 'accept-language': 'en' });
    const unread = inner(unreadHtml);
    has(unread, [`<div class="notice error" role="alert" data-policy-state="unread">${UNREAD}</div>`, '<a href="/policies">Terms and privacy</a>'], `the document with ${path} unread`);
    hasNot(unread, ['SYNTHETIC', 'Not in force yet', 'data-policy-body', '<button'], `the document with ${path} unread`);
    assert.equal(unreadHtml.includes('SYNTHETIC-DATABASE'), false);
    state = fresh();
  }
  state.broken = new Set(['/rest/v1/policy_documents']);
  assert.match(await whole(`/policies/${TERMS}`, { 'accept-language': 'en' }), /<title>Terms and privacy[^<]*<\/title>/);
  state = fresh();
  console.log('Policy document: the live text as headings and paragraphs with an unanswered question left out; signed out is sent to sign in; signed in is offered the button and told how many wait; agreed says when, on a named clock; a draft is said and never shown; a wrong address is 404 with nothing asked; unread is said at 200.');

  // In Arabic: the page round the document is Arabic, and the document is not.
  state.agreed[TERMS] = AGREED_AT;
  const oneAr = await page(`/policies/${TERMS}`, { cookie, 'accept-language': 'ar' });
  has(oneAr, [
    '<p class="eyebrow"><a href="/policies">الشروط والخصوصية</a></p><h1 lang="en" dir="ltr">Synthetic terms</h1><p class="lede" lang="en" dir="ltr">Synthetic summary of the terms.</p>',
    `<li><strong>الإصدار: 3</strong></li><li>سارية من: <bdi>${day('ar', '2026-11-01')}</bdi></li><li>للجميع</li>`,
    '<p class="muted policy-change">ما تغيّر في هذا الإصدار: <bdi lang="en" dir="ltr">Synthetic note about what changed.</bdi></p>',
    '<p class="muted policy-as-written">الوثيقة معروضة باللغة التي كُتبت بها.</p>',
    '<article class="policy-body" data-policy-body="true" lang="en" dir="ltr"><h2>Synthetic first heading</h2>',
    '<h2>موافقتك</h2>', `<p class="policy-agreed" role="status">وافقت على هذا الإصدار في: <bdi>${moment('ar', AGREED_AT)}</bdi></p>`,
    'ما وافقت عليه مدرج في صفحة حسابك. <a href="/account">حسابك</a>',
  ], 'the document in Arabic');
  hasNot(oneAr, [...ENGLISH_ONLY, ...STORED], 'the document in Arabic');
  state = fresh();
  const askedAr = await page(`/policies/${TERMS}`, { cookie, 'accept-language': 'ar' });
  has(askedAr, ['الموافقة تسجّل أنك قرأت هذا الإصدار وقبلته. يُحفظ الإصدار والوقت مع حسابك.', '>أوافق على هذا الإصدار</button>', 'وثائق تنتظر موافقتك: 1'], 'the document in Arabic, not agreed');
  const outAr = await page(`/policies/${TERMS}`, { 'accept-language': 'ar' });
  has(outAr, ['هذه الوثيقة تطلب موافقتك، ويُحفظ وقت موافقتك مع حسابك. سجّل الدخول أولًا.', `<a class="btn" href="/sign-in?next=/policies/${TERMS}">سجّل الدخول للموافقة</a>`], 'the document in Arabic, signed out');
  hasNot(outAr, ENGLISH_ONLY, 'the document in Arabic, signed out');
  has(await page(`/policies/${TEACHING}`, { 'accept-language': 'ar' }), ['<strong>غير سارية بعد</strong> هذه الوثيقة مكتوبة، لكن لم يُعتمد أي إصدار منها، فلا شيء هنا للقراءة أو للموافقة. المسودة لا تُعرض لأنها قد تتغيّر. لا شيء هنا يطلب موافقتك إلى أن يُعتمد إصدار.'], 'a draft in Arabic');
  const oneHa = await page(`/policies/${TERMS}`, { 'accept-language': 'ha' });
  has(oneHa, ['<div class="page policy-page" data-policy-state="live" data-policy-version="3" lang="en" dir="ltr">', '<h1>Synthetic terms</h1>', '<article class="policy-body" data-policy-body="true"><h2>'], 'the document for a held language');
  hasNot(oneHa, ['The document is shown in the language it was written in.'], 'the document for a held language');
  console.log('Policy document in Arabic: every sentence, day and time in Arabic; the title, summary, change note and text as written and marked English, and the page says that is why; a held language reads it in English, marked.');

  // ---------------------------------------------------------------- the route
  const ask = { slug: TERMS, version: 3 };
  // Signed out: no writer is asked.
  calls.length = 0;
  expect(await send(ask, {}), 401, 'not_signed_in', 'signed out');
  // Wrong shapes: nothing is asked at all.
  for (const [body, what] of [['not json', 'not JSON'], [[], 'a list'], [{ version: 3 }, 'no slug'], [{ slug: 'Synthetic_Terms', version: 3 }, 'a slug the table could not hold'], [{ slug: TERMS }, 'no version'], [{ slug: TERMS, version: 0 }, 'version nought'], [{ slug: TERMS, version: '3' }, 'a version in quotes'], [{ slug: TERMS, version: 2.5 }, 'half a version']]) {
    expect(await send(body), 400, 'malformed', what);
  }
  assert.equal(calls.filter((c) => c.path.startsWith('/rest/v1/rpc/policy_page') || c.path.startsWith('/rest/v1/rpc/accept_policy')).length, 0, 'a wrong shape still reached the database');

  // The page showed version 2 and version 3 is live: the writer is told which
  // version was read, refuses, and nothing is recorded. Nothing is read first.
  calls.length = 0;
  expect(await send({ slug: TERMS, version: 2 }), 409, 'changed', 'an older version than the live one');
  expect(await send({ slug: TERMS, version: 4 }), 409, 'changed', 'a version that is not live');
  assert.equal(rpcs('policy_page').length, 0, 'the route read the live version itself before asking the writer');
  assert.deepEqual(rpcs('accept_policy').map((c) => c.payload), [{ p_slug: TERMS, p_version: 2 }, { p_slug: TERMS, p_version: 4 }]);
  assert.deepEqual(state.agreed, {});
  // The writer's own sentence for it, however it arrives.
  state.accept = refusal(400, '23514', 'policy:changed');
  expect(await send(ask), 409, 'changed', 'policy:changed');
  state.accept = refusal(400, '22023', 'policy:version_required');
  expect(await send(ask), 400, 'malformed', 'policy:version_required');
  state = fresh();

  // The writer's three sentences, each by name and status.
  for (const [sqlstate, sentence, status, reason] of [['42501', 'policy:not_signed_in', 401, 'not_signed_in'], ['P0002', 'policy:not_found', 404, 'not_found'], ['23514', 'policy:not_in_force', 409, 'not_in_force']]) {
    state.accept = refusal(400, sqlstate, sentence);
    expect(await send(ask), status, reason, sentence);
  }
  // No live version at all is the writer's to refuse: it knows whether the document exists.
  state = fresh(); delete state.live[TERMS];
  calls.length = 0;
  expect(await send(ask), 409, 'not_in_force', 'a document with no live version');
  assert.equal(rpcs('accept_policy').length, 1);
  state = fresh();
  // A refusal nobody named, and no answer at all.
  state.accept = refusal(403, '42501', DATABASE_SENTENCE);
  expect(await send(ask), 500, 'refused', 'an unnamed refusal');
  state.accept = noAnswer;
  expect(await send(ask), 502, 'unconfirmed', 'no answer');
  // An answer that does not say what was agreed to is not a success.
  state.accept = [200, { SYNTHETIC: true }];
  expect(await send(ask), 502, 'unconfirmed', 'an answer with no version in it');
  // An answer for a version that was not the one sent is not passed on as agreed.
  state.accept = [200, { slug: TERMS, versionNumber: 4, acceptedAt: AGREED_AT, already: false }];
  expect(await send(ask), 502, 'unconfirmed', 'an answer for another version');
  state = fresh();

  // Agreed: the version and the time. A second press changed nothing, and says the first time.
  calls.length = 0;
  let answer = await send(ask);
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, changed: true, version: 3, acceptedAt: AGREED_AT });
  assert.deepEqual(rpcs('accept_policy').map((c) => c.payload), [{ p_slug: TERMS, p_version: 3 }]);
  answer = await send(ask);
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, changed: false, version: 3, acceptedAt: AGREED_AT });
  state = fresh();
  // The owner publishes after the page was sent and before the writer runs:
  // refused, and nothing recorded for either version.
  state.publishDuringWrite = 4;
  expect(await send(ask), 409, 'changed', 'published just before the write');
  assert.deepEqual(state.agreed, {});
  state = fresh();

  // What the notice is told. A visitor costs no query.
  const notice = async (headers = { cookie }) => {
    const response = await fetch(`${origin}/api/policies`, { headers, signal: AbortSignal.timeout(90000) });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const text = await response.text();
    assert.equal(text.includes('SYNTHETIC'), false, `the notice was told something that is not a slug or a number: ${text}`);
    return { status: response.status, json: JSON.parse(text) };
  };
  calls.length = 0;
  assert.deepEqual(await notice({}), { status: 200, json: { signedIn: false } });
  assert.equal(calls.length, 0, 'something was read for a visitor');
  // Signed in and never agreed to anything: nothing changed, and the terms
  // are waiting for an account nobody asked. A slug and a number, and no title.
  assert.deepEqual(await notice(), { status: 200, json: { signedIn: true, changed: [], waiting: [{ slug: TERMS, version: 3 }] } });
  // Agreed to version 2, and version 3 is in force: changed, and not "waiting".
  state.history = [[TERMS, 2]];
  assert.deepEqual(await notice(), { status: 200, json: { signedIn: true, changed: [{ slug: TERMS, version: 3 }], waiting: [] } });
  // Agreed to version 3 as well: nothing to tell.
  state.agreed[TERMS] = AGREED_AT;
  assert.deepEqual(await notice(), { status: 200, json: { signedIn: true, changed: [], waiting: [] } });
  // Not read is not "nothing changed", and is not an error status on a page that is fine.
  state = fresh(); state.broken = new Set(['/rest/v1/rpc/my_policy_standing']);
  assert.deepEqual(await notice(), { status: 200, json: { signedIn: true, changed: null } });
  state = fresh(); state.nonsense = new Set(['/rest/v1/rpc/my_policy_standing']);
  assert.deepEqual(await notice(), { status: 200, json: { signedIn: true, changed: null } });
  state = fresh();
  console.log('Policies route: signed out and eight wrong shapes reach no writer; a version that is not the live one is refused with nothing recorded; each of the writer’s three sentences answered by name and status with nothing of the database’s in the reply; an unnamed refusal 500, no answer or no version in it 502; a second press is a success that changed nothing.');

  // ----------------------------------------------------------- in a browser
  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const visit = async (path, code, width, signedIn = true) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([...(signedIn ? [{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }] : []), { name: 'ayahspring_locale', value: code, url: origin }]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      // A refused request is said on the console, and this script refuses on purpose.
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      const sent = []; tab.on('request', (r) => { if (r.url().includes('/api/policies') && r.method() === 'POST') sent.push(r.postDataJSON()); });
      // How many times the notice asked what changed.
      const asked = []; tab.on('request', (r) => { if (r.url().endsWith('/api/policies') && r.method() === 'GET') asked.push(r.url()); });
      // Nothing in the browser may talk to the database itself any more.
      const direct = []; tab.on('request', (r) => { if (r.url().includes('/rest/v1/') || r.url().includes('/auth/v1/')) direct.push(r.url()); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent, direct, asked };
    };
    const shot = async (tab, name) => { if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png`, fullPage: true }); };
    const fits = (tab) => tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

    for (const [code, title, dir] of [['en', 'Terms and privacy', 'ltr'], ['ar', 'الشروط والخصوصية', 'rtl'], ['ta', 'விதிமுறைகளும் தனியுரிமையும்', 'ltr']]) {
      for (const width of [320, 390, 1440]) {
        // The register, signed out.
        let { context, tab, errors } = await visit('/policies', code, width, false);
        assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
        assert.equal(await tab.getByRole('heading', { name: title, exact: true, level: 1 }).count(), 1, `${code} ${width}: heading`);
        assert.equal(await tab.locator('main [data-policy]').count(), 5);
        assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main h1')).direction), dir);
        // A document's title reads left to right whatever the page does.
        assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main [data-policy] h2')).direction), 'ltr');
        assert.ok(await fits(tab), `${code} ${width}: the register is wider than the screen`);
        if ([390, 1440].includes(width)) await shot(tab, `policies-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}`);
        await context.close();
        // One document, signed in: a long address in the text does not widen the page.
        ({ context, tab, errors } = await visit(`/policies/${TERMS}`, code, width));
        assert.equal(await tab.getByRole('heading', { name: 'Synthetic terms', exact: true, level: 1 }).count(), 1);
        assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main [data-policy-body]')).direction), 'ltr');
        assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main .policy-agree h2')).direction), dir);
        assert.equal(await tab.locator('[data-policy-agree-button]').count(), 1);
        assert.ok(await fits(tab), `${code} ${width}: the document is wider than the screen`);
        if ([390, 1440].includes(width)) await shot(tab, `policy-${code}-${width}`);
        assert.deepEqual(errors, [], `${code} ${width}`);
        await context.close();
      }
    }
    console.log('Policy pages in a browser: English, Arabic and Tamil at 320, 390 and 1440; the register and one document, nothing wider than the screen, the document left to right on a right-to-left page.');

    // The button, in Arabic.
    {
      state = fresh();
      const { context, tab, errors, sent, direct } = await visit(`/policies/${TERMS}`, 'ar', 390);
      const box = tab.locator('.policy-agree');
      const agree = box.getByRole('button', { name: 'أوافق على هذا الإصدار', exact: true });
      const says = (text) => box.locator('[data-policy-refusal]').filter({ hasText: text }).waitFor();

      // Refusals: each said in Arabic, and the button comes back.
      state.accept = refusal(403, '42501', DATABASE_SENTENCE);
      await agree.click();
      await says('تعذّر تسجيل موافقتك. لم يتغيّر شيء.');
      state.accept = noAnswer;
      await agree.click();
      await says('لم نتمكّن من التأكّد من تسجيل موافقتك. افتح هذه الصفحة من جديد لترى.');
      assert.equal(await agree.isEnabled(), true);
      await shot(tab, 'policy-ar-390-unsure');
      state.accept = refusal(400, '42501', 'policy:not_signed_in');
      await agree.click();
      await says('لقد سُجّل خروجك. سجّل الدخول من جديد ثم أعد المحاولة.');
      // The connection goes: the button says so and comes back to life.
      await context.setOffline(true);
      await agree.click();
      await says('تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.');
      assert.equal(await agree.isEnabled(), true, 'the button stays busy for good when the request cannot be made');
      await context.setOffline(false);
      const text = await tab.locator('main').textContent();
      for (const sentence of ['SYNTHETIC-DATABASE', 'could not', 'policy:', 'permission denied']) assert.equal(text.includes(sentence), false, `a refusal is said in English or in the database's words: ${sentence}`);
      assert.deepEqual(state.agreed, {});

      // The owner publishes version 4 while the page shows version 3: nothing
      // is recorded, it is said, and the page is read again and shows 4.
      state.accept = 'ok';
      state.live[TERMS] = { ...state.live[TERMS], versionNumber: 4, body: 'Synthetic newer paragraph.' };
      sent.length = 0; calls.length = 0;
      await agree.click();
      await says('تغيّرت هذه الوثيقة بعد فتح هذه الصفحة، فلم يُسجّل شيء. اقرأها من جديد قبل أن توافق.');
      await tab.locator('[data-policy-version="4"]').waitFor();
      await tab.getByText('Synthetic newer paragraph.').waitFor();
      assert.deepEqual(sent, [{ slug: TERMS, version: 3 }]);
      // The writer was told which version the page showed, and refused.
      assert.deepEqual(rpcs('accept_policy').map((c) => c.payload), [{ p_slug: TERMS, p_version: 3 }]);
      assert.deepEqual(state.agreed, {}, 'an agreement was recorded for a version the reader had not been shown');
      await shot(tab, 'policy-ar-390-changed');

      // Pressed twice while the writer works: one request, and it says when.
      state.delay = 700;
      sent.length = 0; calls.length = 0;
      await agree.dblclick();
      await box.getByText(`وافقت على هذا الإصدار في: ${moment('ar', AGREED_AT)}`).waitFor();
      assert.deepEqual(sent, [{ slug: TERMS, version: 4 }], 'pressing twice sent two requests, or the old version');
      assert.equal(rpcs('accept_policy').length, 1);
      await box.locator('[data-policy-refusal]').waitFor({ state: 'detached' });
      assert.equal(await box.locator('button').count(), 0, 'the button is still there after agreeing');
      await box.getByRole('link', { name: 'حسابك', exact: true }).waitFor();
      assert.equal(await box.locator('[data-policy-newer]').count(), 0);
      assert.ok(await fits(tab));
      await shot(tab, 'policy-ar-390-agreed');
      state.delay = 0;
      // The button asked this app's route and nothing else.
      assert.deepEqual(direct, [], 'the browser talked to the database itself');
      assert.deepEqual(errors, []);
      await context.close();
    }
    // The owner publishes after the page was sent and just before the writer
    // runs. Nothing is recorded for either version; the page says the
    // document changed, is read again and shows the new one, and only a
    // second press under that text records an agreement, to that version.
    {
      state = fresh(); state.publishDuringWrite = 4;
      const { context, tab, errors, sent } = await visit(`/policies/${TERMS}`, 'ar', 390);
      const box = tab.locator('.policy-agree');
      const agree = box.getByRole('button', { name: 'أوافق على هذا الإصدار', exact: true });
      calls.length = 0;
      await agree.click();
      await box.locator('[data-policy-refusal]').filter({ hasText: 'تغيّرت هذه الوثيقة بعد فتح هذه الصفحة، فلم يُسجّل شيء. اقرأها من جديد قبل أن توافق.' }).waitFor();
      await tab.locator('[data-policy-version="4"]').waitFor();
      await tab.getByText('Synthetic newer paragraph.').waitFor();
      assert.deepEqual(state.agreed, {}, 'an agreement was recorded for a version published after the page was sent');
      assert.equal(await box.locator('[data-policy-newer]').count(), 0);
      assert.equal(await agree.count(), 1, 'the button went away though nothing was agreed to');
      await agree.click();
      await box.getByText(`وافقت على هذا الإصدار في: ${moment('ar', AGREED_AT)}`).waitFor();
      assert.deepEqual(sent, [{ slug: TERMS, version: 3 }, { slug: TERMS, version: 4 }]);
      assert.deepEqual(rpcs('accept_policy').map((c) => c.payload.p_version), [3, 4]);
      assert.ok(await fits(tab));
      await shot(tab, 'policy-ar-390-published-meanwhile');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Agreement button in Arabic at 390: four refusals said in Arabic with nothing of the database’s; a version published while the page was open, or just before the writer ran, records nothing and the page is read again; pressed twice, one request; agreed says when and leaves no button.');

    // ------------------------------------------------- the notice of a change
    const NOTICE = '[data-policy-notice]';
    const openTab = async (context, path) => {
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      const asked = []; tab.on('request', (r) => { if (r.url().endsWith('/api/policies') && r.method() === 'GET') asked.push(r.url()); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { tab, errors, asked };
    };
    // A visitor: nothing is asked and nothing is drawn.
    {
      state = fresh(); state.history = [[TERMS, 2]];
      const { context, tab, errors, asked } = await visit('/policies', 'en', 390, false);
      assert.deepEqual(asked, [], 'the notice asked about a visitor');
      assert.equal(await tab.locator(NOTICE).count(), 0);
      assert.deepEqual(errors, []);
      await context.close();
    }
    // Signed in, never agreed to anything: an account Google made from the
    // sign-in page, where there is no box. It is asked, in words of its own:
    // nothing "changed" for somebody who never saw a version.
    {
      state = fresh();
      const { context, tab, errors, asked } = await visit('/policies', 'en', 390);
      const notice = tab.locator(NOTICE);
      await notice.waitFor();
      assert.equal(asked.length, 1);
      assert.equal(await notice.getAttribute('data-policy-notice-kind'), 'waiting');
      assert.equal((await notice.locator('p').textContent()).trim(), 'Documents waiting for your agreement: 1');
      assert.equal(await notice.getByRole('link', { name: 'Your agreement', exact: true }).getAttribute('href'), `/policies/${TERMS}`);
      assert.equal(await notice.getByText('changed', { exact: false }).count(), 0, 'a new account was told a document had changed');
      assert.ok(await fits(tab), 'the notice widens the page');
      await shot(tab, 'policy-notice-waiting-en-390');
      // On the document's page the button records the agreement and the notice goes.
      await notice.getByRole('link', { name: 'Your agreement', exact: true }).click();
      await tab.waitForURL(`**/policies/${TERMS}`);
      await tab.locator(NOTICE).waitFor();
      await tab.getByRole('button', { name: 'Agree to this version', exact: true }).click();
      await tab.locator(NOTICE).waitFor({ state: 'detached' });
      assert.equal(asked.length, 1, 'the notice asked again within one opening');
      assert.deepEqual(errors, []);
      await context.close();
    }
    // The same account, having ticked the box on the sign-up page a moment
    // ago: the layout is recording that on this very page, and it is not
    // asked a second time meanwhile.
    {
      state = fresh();
      const context = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'en' });
      await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: 'en', url: origin }]);
      await context.addInitScript((slug) => {
        if (!window.sessionStorage.getItem('synthetic-once')) {
          window.sessionStorage.setItem('synthetic-once', '1');
          window.localStorage.setItem('ayahspring.policy.signup', JSON.stringify({ at: Date.now(), items: [{ slug, version: 3 }] }));
        }
      }, TERMS);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      const posted = []; tab.on('request', (r) => { if (r.url().endsWith('/api/policies') && r.method() === 'POST') posted.push(r.postDataJSON()); });
      const seen = [];
      await tab.exposeFunction('syntheticSaw', (kind) => seen.push(kind));
      await tab.addInitScript(() => {
        new MutationObserver(() => { if (document.querySelector('[data-policy-notice]')) window.syntheticSaw('notice'); }).observe(document, { childList: true, subtree: true });
      });
      await tab.goto(`${origin}/policies`, { waitUntil: 'networkidle' });
      // (A development server runs an effect twice, so it may be sent twice; a built site sends it once.)
      assert.ok(posted.length >= 1, 'what was ticked at sign-up was not recorded');
      for (const body of posted) assert.deepEqual(body, { slug: TERMS, version: 3 });
      assert.deepEqual(seen, [], 'somebody who ticked the box a moment ago was asked again');
      assert.equal(await tab.evaluate(() => window.localStorage.getItem('ayahspring.policy.signup')), null);
      // And not on the next page either: it is recorded.
      await tab.goto(`${origin}/policies`, { waitUntil: 'networkidle' });
      assert.equal(await tab.locator(NOTICE).count(), 0);
      assert.deepEqual(errors, []);
      await context.close();
    }
    // Agreed to version 2 of the terms; version 3 is in force.
    {
      state = fresh(); state.history = [[TERMS, 2]];
      const { context, tab, errors, asked } = await visit('/policies', 'en', 390);
      const notice = tab.locator(NOTICE);
      await notice.waitFor();
      assert.equal((await notice.locator('p').textContent()).trim(), 'Documents that changed after you agreed to them: 1');
      assert.equal(await notice.getAttribute('role'), 'status');
      assert.equal(await notice.getByRole('link', { name: 'Read what changed', exact: true }).getAttribute('href'), `/policies/${TERMS}`);
      assert.equal(asked.length, 1);
      // It is after the page and before the footer, and holds to the bottom
      // of the window: nothing above it was moved to make room.
      const place = await tab.evaluate(() => {
        const box = document.querySelector('[data-policy-notice]');
        const rect = box.getBoundingClientRect();
        return { afterMain: box.previousElementSibling?.tagName, beforeFooter: box.nextElementSibling?.tagName, bottom: Math.round(rect.bottom), window: window.innerHeight, position: getComputedStyle(box).position };
      });
      assert.deepEqual({ ...place, bottom: place.bottom <= place.window }, { afterMain: 'MAIN', beforeFooter: 'FOOTER', bottom: true, window: 900, position: 'sticky' });
      assert.ok(await fits(tab), 'the notice widens the page');
      // It holds to the window, so it must stay short.
      const tall = await notice.evaluate((el) => Math.round(el.getBoundingClientRect().height));
      assert.ok(tall <= 160, `the notice takes ${tall}px of a 390 screen`);
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/notice-en-390-window.png` });
      await shot(tab, 'notice-en-390');

      // Another page in the same opening: still told, and not asked again.
      // Meanwhile the owner publishes a second document this reader had
      // agreed to. It is not announced on a session that is already open.
      state.live['synthetic-schools'] = { versionNumber: 2, effectiveAt: '2026-11-24', changeNote: 'Synthetic second change.', body: 'Synthetic school paragraph.' };
      state.history = [[TERMS, 2], ['synthetic-schools', 1]];
      await tab.goto(`${origin}/policies/${PRIVACY}`, { waitUntil: 'networkidle' });
      await notice.waitFor();
      assert.equal((await notice.locator('p').textContent()).trim(), 'Documents that changed after you agreed to them: 1', 'a version published during the session was announced on it');
      assert.equal(asked.length, 1, 'the notice asked again within one opening');

      // The next opening (a new tab) is told of both, and sent to the list of them.
      const second = await openTab(context, '/policies');
      const both = second.tab.locator(NOTICE);
      await both.waitFor();
      assert.equal((await both.locator('p').textContent()).trim(), 'Documents that changed after you agreed to them: 2');
      assert.equal(await both.getByRole('link', { name: 'Read what changed', exact: true }).getAttribute('href'), '/notifications');
      assert.equal(second.asked.length, 1);

      // Agreeing to one, on its page, takes it out of the notice at once.
      await second.tab.goto(`${origin}/policies/${TERMS}`, { waitUntil: 'networkidle' });
      await second.tab.locator('.policy-agree').getByRole('button', { name: 'Agree to this version', exact: true }).click();
      await second.tab.locator('[data-policy-accept="agreed"]').waitFor();
      await both.locator('p').filter({ hasText: 'Documents that changed after you agreed to them: 1' }).waitFor();
      assert.equal(await both.getByRole('link', { name: 'Read what changed', exact: true }).getAttribute('href'), '/policies/synthetic-schools');
      assert.equal(second.asked.length, 1);

      // Put away: gone, and it stays gone on the next page and at the next
      // opening on this device. Nothing was agreed to by putting it away.
      const before = JSON.stringify(state.agreed);
      await both.getByRole('button', { name: 'Hide this notice', exact: true }).click();
      await both.waitFor({ state: 'detached' });
      await second.tab.goto(`${origin}/policies`, { waitUntil: 'networkidle' });
      assert.equal(await both.count(), 0);
      assert.equal(JSON.stringify(state.agreed), before, 'putting the notice away recorded an agreement');
      const third = await openTab(context, '/policies');
      assert.equal(third.asked.length, 1);
      assert.equal(await third.tab.locator(NOTICE).count(), 0, 'a notice put away came back for the same version');
      // The next change to that document is told again.
      state.live['synthetic-schools'] = { ...state.live['synthetic-schools'], versionNumber: 3 };
      const fourth = await openTab(context, '/policies');
      await fourth.tab.locator(NOTICE).waitFor();
      assert.equal((await fourth.tab.locator(`${NOTICE} p`).textContent()).trim(), 'Documents that changed after you agreed to them: 1');
      for (const one of [errors, second.errors, third.errors, fourth.errors]) assert.deepEqual(one, []);
      await context.close();
    }
    // What changed could not be read: nothing is drawn, nothing is kept, and the next page asks again.
    {
      state = fresh(); state.history = [[TERMS, 2]]; state.broken = new Set(['/rest/v1/rpc/my_policy_standing']);
      const { context, tab, errors, asked } = await visit('/policies', 'en', 390);
      assert.equal(asked.length, 1);
      assert.equal(await tab.locator(NOTICE).count(), 0);
      state.broken = new Set();
      await tab.goto(`${origin}/policies`, { waitUntil: 'networkidle' });
      await tab.locator(NOTICE).waitFor();
      assert.equal(asked.length, 2, 'a read that failed was kept as "nothing changed"');
      assert.deepEqual(errors, []);
      await context.close();
    }
    // In Arabic at 320, and in English, marked, for a language held for review.
    {
      state = fresh(); state.history = [[TERMS, 2]];
      let { context, tab, errors } = await visit('/policies', 'ar', 320);
      const notice = tab.locator(NOTICE);
      await notice.waitFor();
      assert.equal((await notice.locator('p').textContent()).trim(), 'وثائق تغيّرت بعد موافقتك عليها: 1');
      assert.equal(await notice.getByRole('link', { name: 'اقرأ ما تغيّر', exact: true }).count(), 1);
      assert.equal(await notice.getByRole('button', { name: 'أخفِ هذا التنبيه', exact: true }).count(), 1);
      assert.equal(await notice.evaluate((el) => getComputedStyle(el).direction), 'rtl');
      assert.equal(await notice.getAttribute('lang'), null);
      assert.ok(await fits(tab), 'the notice widens a 320 screen in Arabic');
      if (process.env.RESPONSIVE_SCREENSHOTS) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/notice-ar-320-window.png` });
      await shot(tab, 'notice-ar-320');
      assert.deepEqual(errors, []);
      await context.close();
      ({ context, tab, errors } = await visit('/policies', 'ha', 390));
      await tab.locator(NOTICE).waitFor();
      assert.equal(await tab.locator(NOTICE).getAttribute('lang'), 'en');
      assert.equal(await tab.locator(NOTICE).getAttribute('dir'), 'ltr');
      assert.equal((await tab.locator(`${NOTICE} p`).textContent()).trim(), 'Documents that changed after you agreed to them: 1');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Notice of a changed document: a visitor is not asked about; a new account is not told of a change but asked, in its own words, and not asked while what it ticked at sign-up is being recorded; asked once an opening and not again on the next page; a version published during a session is not announced on it and is at the next opening; agreeing takes the document out; put away stays away for that version on this device and comes back for the next; a failed read is asked again; Arabic at 320 and English marked for a held language.');
  }
  console.log('Policies HTTP smoke passed. Not real Auth, RLS or the writer’s own rules; every document in it is invented.');
} catch (e) { console.error(seen.logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
