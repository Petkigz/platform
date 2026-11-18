// Real Next /family and /family/<child> pages and the three /api/family
// routes against an entirely synthetic loopback Auth/REST API. This is not
// evidence about hosted Supabase, JWT validation or RLS: the stand-in answers
// whatever it is asked, and refuses only when this script tells it to.
//
// What it does show: the pages a signed-in reader is sent, in English, in
// Arabic, in French by the reader's own choice, and in English for a language
// held for review; the name and status the routes give each refusal; and that
// the database's own sentence reaches nobody. The expected sentences are typed
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

const FAMILY = '11111111-1111-4111-8111-111111111111';
const AISHA = '22222222-2222-4222-8222-222222222222';
const BILAL = '33333333-3333-4333-8333-333333333333';
const NOBODY = '44444444-4444-4444-8444-444444444444';
// A sentence only the database would write. It must reach no reader.
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE new row for relation "families" violates check constraint';
// What the declaration function hands back as the wording agreed to.
const STATEMENT = 'I am 18 or older, and I am the parent or guardian of the children I add.';

const family = () => ({ id: FAMILY, name: 'Synthetic household' });
const state = {
  flags: new Set(),
  families: [],
  children: [
    { id: AISHA, family_id: FAMILY, display_name: 'Aisha', learner_type: 'child', age_band: '8-10', status: 'active', linked_user_id: null, deleted_at: null },
    { id: BILAL, family_id: FAMILY, display_name: 'Bilal', learner_type: 'child', age_band: '14-17', status: 'archived', linked_user_id: null, deleted_at: null },
  ],
  own: { id: 'own', display_name: 'Synthetic learner', family_id: FAMILY, learner_type: 'adult' },
  adults: [
    { learner_profile_id: 'own', display_name: 'Synthetic learner', linked_user_id: user.id, age_band: '18+', status: 'active', is_me: true },
    { learner_profile_id: 'lp-2', display_name: 'Maryam', linked_user_id: 'u-2', age_band: '18+', status: 'active', is_me: false },
    { learner_profile_id: 'lp-3', display_name: 'Yusuf', linked_user_id: 'u-3', age_band: '18+', status: 'active', is_me: false },
  ],
  members: [
    { id: 'm-1', family_id: FAMILY, user_id: user.id, membership_type: 'owner', status: 'active', user_profiles: { display_name: 'Synthetic learner' } },
    { id: 'm-2', family_id: FAMILY, user_id: 'u-2', membership_type: 'guardian', status: 'invited', user_profiles: { display_name: null } },
    { id: 'm-3', family_id: FAMILY, user_id: 'u-3', membership_type: 'billing_manager', status: 'revoked', user_profiles: { display_name: 'Yusuf' } },
  ],
  declaration: { required: false },
  // What each writer answers: 'ok', or [status, { code, message }].
  create: 'ok', add: 'ok', join: 'ok', leave: 'ok',
  joined: { learnerProfileId: 'own', created: true, joined: true, displayName: 'Synthetic learner' },
};
const today = new Date().toISOString();
const across = [
  { enrolment_id: 'e-1', course_id: 'c-1', course_slug: 'reading', course_title: 'Synthetic reading course', enrolment_status: 'active', lessons_completed: 1, lessons_in_version: 4, percent_complete: 25, last_activity_at: today, certificate_number: null, certificate_status: null },
  { enrolment_id: 'e-2', course_id: 'c-2', course_slug: 'empty', course_title: 'Synthetic empty course', enrolment_status: 'active', lessons_completed: 0, lessons_in_version: 0, percent_complete: 0, last_activity_at: null, certificate_number: null, certificate_status: null },
  { enrolment_id: 'e-3', course_id: 'c-3', course_slug: 'done', course_title: 'Synthetic third course', enrolment_status: 'completed', lessons_completed: 3, lessons_in_version: 3, percent_complete: 100, last_activity_at: '2026-01-05T10:00:00Z', certificate_number: 'AS-2026-0001', certificate_status: 'issued' },
  { enrolment_id: 'e-4', course_id: 'c-4', course_slug: 'paused', course_title: 'Synthetic fourth course', enrolment_status: 'suspended', lessons_completed: 1, lessons_in_version: 2, percent_complete: 50, last_activity_at: '2026-01-05T10:00:00Z', certificate_number: 'AS-2026-0002', certificate_status: 'revoked' },
];

const calls = [];
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (!req.url?.startsWith('/rest/v1/') || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{}'); return; }
  let body = ''; for await (const chunk of req) body += chunk;
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  // The real server compares a column with the *word* "null" when asked
  // `eq.null`; on a date column that is an error, not an empty answer.
  if ([...url.searchParams.values()].some((value) => /^(?:not\.)?(?:eq|neq)\.(?:null|undefined)$/.test(value))) {
    res.writeHead(400); res.end(JSON.stringify({ code: '22007', message: 'invalid input syntax for type timestamp with time zone: "null"' })); return;
  }
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, query: url.search });
  const send = (value) => res.end(JSON.stringify(value));
  const writer = (answer, good) => {
    if (answer === 'ok') { send(good); return; }
    res.writeHead(answer[0]); send(answer[1]);
  };
  const q = (name) => url.searchParams.get(name);
  if (path === '/rest/v1/rpc/setting_bool') send(state.flags.has(payload.p_key));
  else if (path === '/rest/v1/families') send(state.families);
  else if (path === '/rest/v1/learner_profiles') {
    if (q('learner_type') === 'eq.child') send(state.children);
    else if (q('linked_user_id')) send(state.own ? [state.own] : []);
    else send(state.children.filter((c) => q('id') === `eq.${c.id}`).map((c) => ({ id: c.id, display_name: c.display_name, age_band: c.age_band, learner_type: 'child', family_id: FAMILY })));
  } else if (path === '/rest/v1/family_memberships') send(state.members);
  else if (path === '/rest/v1/course_enrolments') {
    send(q('learner_profile_id') === `eq.${AISHA}` ? [{ id: 'e-1', status: 'active', courses: { title: 'Synthetic reading course', slug: 'reading' } }] : []);
  } else if (path === '/rest/v1/rpc/enrolment_progress_summary') send([{ lessons_total: 4, lessons_done: 1, percent_complete: 25 }]);
  else if (path === '/rest/v1/rpc/child_login_state') send(null);
  else if (path === '/rest/v1/rpc/family_adult_learners') send(state.adults);
  else if (path === '/rest/v1/rpc/my_adult_declaration') send(state.declaration);
  else if (path === '/rest/v1/rpc/learner_across_courses') send(payload.p_learner_profile_id === AISHA ? across : []);
  else if (path === '/rest/v1/rpc/create_family') writer(state.create, FAMILY);
  else if (path === '/rest/v1/rpc/add_child_to_family') writer(state.add, 'new-child-id');
  else if (path === '/rest/v1/rpc/claim_family_adult_learner') writer(state.join, [state.joined]);
  else if (path === '/rest/v1/rpc/release_family_adult_learner') writer(state.leave, null);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(false);
  else { res.writeHead(404); res.end('{}'); }
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
  for (const path of ['/family', `/family/${AISHA}`]) {
    const anonymous = await request(path);
    assert.equal(anonymous.status, 307, path);
    const redirect = new URL(anonymous.headers.get('location'), origin);
    assert.equal(redirect.pathname, '/sign-in'); assert.equal(redirect.searchParams.get('next'), path);
  }

  const digits = (code, value) => new Intl.NumberFormat(code).format(value);
  const htmlRoot = (html) => html.match(/<html[^>]*>/)?.[0] ?? '';
  // The page itself: what is inside <main>, without the scripts Next adds,
  // the comments React puts between two pieces of text, or the entity it
  // writes an apostrophe as.
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '').replaceAll('&#x27;', '\'');
  const wrapper = (html) => inner(html).match(/<div class="container section"([^>]*)>/)?.[1];
  const page = async (path, headers) => { const response = await request(path, { cookie, ...headers }); assert.equal(response.status, 200, `${path}\n${logs.slice(-2000)}`); return response.text(); };
  const has = (html, sentences, what) => { for (const sentence of sentences) assert.ok(html.includes(sentence), `${what} lacks "${sentence}"`); };
  const hasNot = (html, sentences, what) => { for (const sentence of sentences) assert.ok(!html.includes(sentence), `${what} still says "${sentence}"`); };
  const ENGLISH_ONLY = ['No family yet', 'A family lets', 'Create your family space', 'Family name', 'Create family', 'Children and progress', 'When a learner turns', 'You learn here too', 'Your courses, progress', 'Take my learning out', 'Leaving keeps', 'Also learning here', 'Ages ', 'Archived', 'Not enrolled', 'lessons', 'Open ', 'Add a child', 'Adults:', 'Owner', 'Guardian', 'Billing', 'Unnamed', 'invited', 'removed', 'Go to my learning', 'Learn on this account', '(optional)', 'My family', 'Back to your family', 'in progress', 'finished', 'stopped', 'Finished', 'Paused by', 'Not started', 'Active ', 'Last active', 'Certificate', 'Look again', 'Continue', 'Start course', 'Nothing here yet', 'Catalogue', 'undefined', '{'];

  // ------------------------------------------------- no family: the first visit
  const none = inner(await page('/family', { 'accept-language': 'en' }));
  has(none, ['My family', 'No family yet', 'A family lets one adult account hold several children. Each child learns under your account — they do not need an email address or a password.', 'Create your family space', 'Family name <span class="muted">(optional)</span>', 'placeholder="For example, our family"', 'Create family', 'Until you have a family you do not need one to learn: your own account is enough.', 'Learn on this account', 'Go to my learning'], 'the English first visit');
  const noneAr = inner(await page('/family', { 'accept-language': 'ar' }));
  has(noneAr, ['عائلتي', 'لا توجد عائلة بعد', 'أنشئ مساحة عائلتك', 'اسم العائلة <span class="muted">(اختياري)</span>', 'placeholder="مثلًا: عائلتنا"', 'إنشاء العائلة', 'حسابك وحده يكفي.', 'التعلّم على هذا الحساب', 'اذهب إلى تعلّمي'], 'the Arabic first visit');
  hasNot(noneAr, ENGLISH_ONLY, 'the Arabic first visit');

  // ------------------------------------------------------------------ English
  state.families = [family()];
  const englishHtml = await page('/family', { 'accept-language': 'en' });
  const english = inner(englishHtml);
  assert.equal(wrapper(englishHtml), '', 'an English page marks its own family page as a different language');
  has(english, [
    'Children and progress',
    'The separate young-learner and adult experiences are not enabled yet, so children and adults currently see the same catalogue.',
    'When a learner turns eighteen, their record can become their own account, or be deleted. <a href="/handover">A learner has turned eighteen</a>',
    '<h3><bdi>Synthetic household</bdi></h3>',
    // One active adult of three memberships: the invited and the removed are not counted.
    '1 adult · 2 children',
    // The name inside the heading is isolated, so it keeps its own direction.
    'You learn here too — \u2068Synthetic learner\u2069',
    'Your courses, progress and certificates sit beside the children\'s, so one plan can cover everybody.'.replace('\'', '’'),
    'Take my learning out of this family',
    'Also learning here: <bdi>Maryam</bdi> and <bdi>Yusuf</bdi>.',
    '<bdi>Aisha</bdi>', '<span class="badge">Ages 8–10</span>', '<span class="badge">Ages 14–17</span>',
    '<span class="badge neutral">Archived</span>',
    'aria-label="\u2068Aisha\u2069: \u2068Synthetic reading course\u2069 progress"',
    '1 of 4 lessons · 25%', 'Not enrolled in anything yet.',
    `<a href="/family/${AISHA}">Open <bdi>Aisha</bdi>’s learning</a>`,
    'Add a child',
    // A membership that is not active is said in words, and a member with no
    // name is said to have none.
    'Adults: <span><bdi>Synthetic learner</bdi> (Owner)</span>, <span><bdi>Unnamed</bdi> (Guardian, invited)</span>, and <span><bdi>Yusuf</bdi> (Billing, removed)</span>',
    'Go to my learning',
  ], 'the English family page');
  hasNot(english, ['lang="en"', 'SYNTHETIC-DATABASE', 'billing_manager', '>archived<', 'revoked', 'I am 18 or older'], 'the English family page');
  // Once per family, not once above the children and once below.
  assert.equal(english.split('>Add a child<').length - 1, 1, 'the add-a-child button is offered more than once in one family');

  // ------------------------------------------------------------------- Arabic
  const arabicHtml = await page('/family', { 'accept-language': 'ar' });
  const ar = inner(arabicHtml);
  assert.match(htmlRoot(arabicHtml), /lang="ar"/); assert.match(htmlRoot(arabicHtml), /dir="rtl"/);
  assert.equal(wrapper(arabicHtml), '', 'the Arabic family page is Arabic and needs no wrapper');
  has(ar, [
    'الأطفال والتقدّم', 'عندما يبلغ المتعلّم الثامنة عشرة، يمكن أن يصبح سجلّه حسابًا خاصًا به، أو أن يُحذف. <a href="/handover">متعلّم بلغ الثامنة عشرة</a>',
    `عدد البالغين: ${digits('ar', 1)} · عدد الأطفال: ${digits('ar', 2)}`,
    'أنت تتعلّم هنا أيضًا — \u2068Synthetic learner\u2069', 'إخراج تعلّمي من هذه العائلة',
    'يتعلّم هنا أيضًا: <bdi>Maryam</bdi> و<bdi>Yusuf</bdi>.',
    `<span class="badge">الأعمار ${digits('ar', 8)}–${digits('ar', 10)}</span>`, '<span class="badge neutral">مؤرشف</span>',
    `الدروس: ${digits('ar', 1)} من ${digits('ar', 4)} · ${digits('ar', 25)}%`, 'غير مسجّل في أي دورة بعد.',
    `<a href="/family/${AISHA}">فتح صفحة تعلّم <bdi>Aisha</bdi></a>`, 'إضافة طفل',
    '<span><bdi>Synthetic learner</bdi> (المالك)</span>', '<span><bdi>بلا اسم</bdi> (وليّ الأمر، مدعوّ)</span>', '<span><bdi>Yusuf</bdi> (الفوترة، أُزيل)</span>',
    'اذهب إلى تعلّمي',
  ], 'the Arabic family page');
  hasNot(ar, [...ENGLISH_ONLY, 'lang="en"'], 'the Arabic family page');
  // A course title is the teacher's own text: it keeps its own direction.
  assert.match(ar, /<div class="title" dir="auto">Synthetic reading course<\/div>/);

  // The four states of the adult's own card, each said in Arabic.
  const card = async (own) => { state.own = own; return inner(await page('/family', { 'accept-language': 'ar' })); };
  has(await card({ id: 'own', display_name: 'Synthetic learner', family_id: null, learner_type: 'adult' }), ['تعلّمك منفصل عن هذه العائلة', 'نقل تعلّمي إلى هذه العائلة', 'لا يُنسخ شيء ولا يضيع شيء.'], 'a learner outside every family');
  const elsewhere = await card({ id: 'own', display_name: 'Synthetic learner', family_id: NOBODY, learner_type: 'adult' });
  has(elsewhere, ['تعلّمك في عائلة أخرى', 'ملف المتعلّم يتبع عائلة واحدة في كل مرة.'], 'a learner in another family');
  hasNot(elsewhere, ['نقل تعلّمي إلى هذه العائلة', 'التعلّم هنا باسمي', 'إخراج تعلّمي من هذه العائلة'], 'a learner in another family (no button does anything there)');
  has(await card(null), ['لست متعلّمًا بعد', 'التعلّم هنا باسمي'], 'an account that does not learn');
  state.own = { id: 'own', display_name: 'Synthetic learner', family_id: FAMILY, learner_type: 'adult' };

  // The declaration is the one card left in English, and says so about itself.
  state.declaration = { required: true, declared: false, withdrawn: false, statementVersion: 1, statement: STATEMENT };
  const asked = inner(await page('/family', { 'accept-language': 'ar' }));
  assert.match(asked, /<div class="card"[^>]*lang="en" dir="ltr"[^>]*>\s*<h3[^>]*>Before you add a child<\/h3>/, 'the English declaration card is not marked as English on an Arabic page');
  assert.ok(asked.includes(STATEMENT), 'the wording agreed to is not shown as it was written');
  assert.equal((asked.match(/lang="en"/g) ?? []).length, 1, 'something besides the declaration card is marked as English');
  state.declaration = { required: true, declared: true, withdrawn: false, statementVersion: 1, statement: STATEMENT, declaredAt: '2026-03-04T23:30:00Z' };
  const declared = inner(await page('/family', { 'accept-language': 'ar' }));
  // Half past eleven at night in UTC is the fifth already in Kampala. The
  // card says which zone it means, so nobody has to guess.
  assert.match(declared, /lang="en" dir="ltr"[^>]*>\s*<strong>You declared this on [^<]*Mar(?:ch)? 4, 2026[^<]*UTC[^<]*\.<\/strong>/, 'the date of the declaration is not said with its zone');
  state.declaration = { required: false };

  // ------------------------------------------- French, by the reader's choice
  const frenchHtml = await page('/family', { 'accept-language': 'ar', cookie: `${cookie}; ayahspring_locale=fr` });
  assert.match(htmlRoot(frenchHtml), /lang="fr"/);
  // French puts a no-break space before a colon; it is written out here so
  // nobody mistakes it for an ordinary one.
  has(inner(frenchHtml).replaceAll('\'', '’'), ['Enfants et progression', '1 adulte · 2 enfants', 'Apprennent aussi ici\u00a0: <bdi>Maryam</bdi> et <bdi>Yusuf</bdi>.', '<span class="badge">8–10 ans</span>', 'Ouvrir l’apprentissage de <bdi>Aisha</bdi>', '<span><bdi>Sans nom</bdi> (Tuteur, invitation envoyée)</span>', 'Adultes\u00a0: '], 'the French family page');

  // ------------------------------------------------------- held for review
  // Hausa has no family page of its own: Hausa frame, English page, marked.
  const hausa = await page('/family', { 'accept-language': 'ha' });
  assert.match(htmlRoot(hausa), /lang="ha"/);
  assert.equal(wrapper(hausa), ' lang="en" dir="ltr"');
  has(inner(hausa), ['Children and progress', '1 adult · 2 children', 'Add a child'], 'a Hausa reader’s family page');
  // Pashto is right-to-left with the same hold: the English must not inherit it.
  const pashto = await page('/family', { 'accept-language': 'ps' });
  assert.match(htmlRoot(pashto), /dir="rtl"/);
  assert.equal(wrapper(pashto), ' lang="en" dir="ltr"');
  // Wolof is withheld whole: English everywhere, so nothing to mark.
  const wolof = await page('/family', { 'accept-language': 'wo, fr' });
  assert.match(htmlRoot(wolof), /lang="en"/);
  assert.equal(wrapper(wolof), '');
  assert.ok(inner(wolof).includes('Children and progress') && !inner(wolof).includes('Enfants et progression'));
  console.log(`Family page languages: English; Arabic (right-to-left, digits ${digits('ar', 25)}, names isolated, lists joined the Arabic way, four states of the adult's card); French by the reader's own choice over an Arabic device; the declaration card in English and marked as English, its date said with its zone; Hausa and Pashto frames with an English page marked lang="en" dir="ltr"; Wolof-then-French device in English. Synthetic backend.`);

  // ------------------------------------------------------ one learner's page
  const childHtml = await page(`/family/${AISHA}`, { 'accept-language': 'en' });
  const child = inner(childHtml);
  assert.equal(wrapper(childHtml), '');
  // The tab says where this is, not whose it is.
  assert.equal(/<title>[^<]*Aisha[^<]*<\/title>/.test(childHtml), false, 'the child’s name is in the tab title');
  assert.match(childHtml, /<title>My family[^<]*<\/title>/);
  has(child, [
    '<a href="/family">My family</a>', '<bdi>Aisha</bdi></h1>',
    'Ages 8–10 · 2 courses in progress · 1 finished · 1 stopped',
    '1 of 4 lessons · 25% · Active today', 'No lessons in this course yet · Not started yet',
    '3 of 3 lessons · 100% · Last active Jan 5, 2026', '1 of 2 lessons · 50% · Last active Jan 5, 2026',
    '<span class="badge neutral">Finished</span>', '<span class="badge neutral">Paused by the teacher</span>',
    '<a href="/certificates/AS-2026-0001">Certificate AS-2026-0001</a>', 'Certificate AS-2026-0002 — revoked',
    '<a class="btn" href="/learn/e-1">Continue</a>', '<a class="btn" href="/learn/e-2">Start course</a>', '<a class="btn" href="/learn/e-3">Look again</a>',
    'aria-label="\u2068Synthetic reading course\u2069 progress"', 'Back to your family',
  ], 'the English learner page');
  // A revoked certificate is named and is not a link to a page that vouches for it.
  assert.equal(child.includes('href="/certificates/AS-2026-0002"'), false, 'a revoked certificate is linked as though it stood');

  const childAr = inner(await page(`/family/${AISHA}`, { 'accept-language': 'ar' }));
  const arDay = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date('2026-01-05T10:00:00Z'));
  has(childAr, [
    '<a href="/family">عائلتي</a>',
    `الأعمار ${digits('ar', 8)}–${digits('ar', 10)} · دورات قيد التقدّم: ${digits('ar', 2)} · المنتهية: ${digits('ar', 1)} · المتوقّفة: ${digits('ar', 1)}`,
    `الدروس: ${digits('ar', 1)} من ${digits('ar', 4)} · ${digits('ar', 25)}% · نشط اليوم`, 'لا دروس في هذه الدورة بعد · لم يبدأ بعد',
    `آخر نشاط: ${arDay}`, '<span class="badge neutral">انتهت</span>', '<span class="badge neutral">أوقفها المعلّم مؤقتًا</span>',
    'الشهادة AS-2026-0001</a>', 'الشهادة AS-2026-0002 — أُلغيت', '>متابعة</a>', '>بدء الدورة</a>', '>مراجعتها من جديد</a>', 'العودة إلى عائلتك',
  ], 'the Arabic learner page');
  hasNot(childAr, [...ENGLISH_ONLY, 'lang="en"'], 'the Arabic learner page');
  assert.match(childAr, /<h2[^>]*dir="auto">Synthetic reading course<\/h2>/);

  const childFr = inner(await page(`/family/${AISHA}`, { cookie: `${cookie}; ayahspring_locale=fr` })).replaceAll('\'', '’');
  has(childFr, ['8–10 ans · 2 cours en cours · terminés\u00a0: 1 · arrêtés\u00a0: 1', 'Actif aujourd’hui', 'Pas encore de leçon dans ce cours · Pas encore commencé', 'Dernière activité\u00a0: 5 janv. 2026', 'Certificat AS-2026-0002 — révoqué', '>Revoir</a>', 'Retour à votre famille'], 'the French learner page');

  // A learner with nothing yet, and the way to add something.
  const empty = inner(await page(`/family/${BILAL}`, { 'accept-language': 'en' }));
  has(empty, ['Ages 14–17 · nothing in progress', 'Nothing here yet.', 'A guardian can add a course from the catalogue, choosing this learner when it asks who is learning. <a href="/catalogue">Catalogue</a>'], 'an empty learner page');
  const emptyAr = inner(await page(`/family/${BILAL}`, { 'accept-language': 'ar' }));
  has(emptyAr, ['لا شيء قيد التقدّم', 'لا شيء هنا بعد.', '<a href="/catalogue">الدورات</a>'], 'an empty Arabic learner page');
  // Somebody the reader may not see is not there, rather than refused.
  const stranger = await request(`/family/${NOBODY}`, { cookie, 'accept-language': 'en' });
  assert.equal(stranger.status, 404);
  const heldChild = await page(`/family/${AISHA}`, { 'accept-language': 'ha' });
  assert.equal(wrapper(heldChild), ' lang="en" dir="ltr"');
  console.log('One learner’s page: English, Arabic and French; four courses in three groups, each with its progress, when it was last opened (today, never, a date in the reader’s calendar words), its certificate (a link when it stands, plain when revoked) and the right button; an empty page; 404 for a learner the stand-in does not return; the tab title names the section, not the child.');

  // ------------------------------------------------------------- the routes
  // Each refusal has a name and a status, and the database's sentence stays
  // behind.
  const send = async (path, method, body, headers = { cookie }) => {
    const response = await fetch(`${origin}${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    assert.equal(text.includes('SYNTHETIC-DATABASE'), false, `${path} passed on the database’s own sentence`);
    return { status: response.status, json: JSON.parse(text) };
  };
  const rpcs = (name) => calls.filter((c) => c.path === `/rest/v1/rpc/${name}`);
  const expect = (answer, status, code, what) => {
    assert.equal(answer.status, status, `${what}: ${JSON.stringify(answer)}`);
    assert.equal(answer.json.ok, false, what); assert.equal(answer.json.code, code, what);
    assert.equal(typeof answer.json.message, 'string', what);
  };
  const refusal = (status, code, message) => [status, { code, message, details: null, hint: null }];

  // create
  calls.length = 0;
  expect(await send('/api/family/create', 'POST', { name: 'X' }, {}), 401, 'signed_out', 'create, signed out');
  expect(await send('/api/family/create', 'POST', '{not json'), 400, 'malformed', 'create, not JSON');
  expect(await send('/api/family/create', 'POST', { name: 7 }), 400, 'malformed', 'create, a name that is a number');
  expect(await send('/api/family/create', 'POST', { name: 'x'.repeat(121) }), 400, 'name_long', 'create, a long name');
  assert.equal(rpcs('create_family').length, 0, 'a refused family was still sent to the database');
  state.create = refusal(403, '42501', 'sign in to create a family');
  expect(await send('/api/family/create', 'POST', { name: 'X' }), 401, 'signed_out', 'create, the database says signed out');
  state.create = refusal(400, '23514', DATABASE_SENTENCE);
  expect(await send('/api/family/create', 'POST', { name: 'X' }), 409, 'refused', 'create, a database refusal');
  // An answer that is not the database's: the family may exist.
  state.create = [503, { message: 'SYNTHETIC-DATABASE upstream connect error' }];
  expect(await send('/api/family/create', 'POST', { name: 'X' }), 502, 'unconfirmed', 'create, no answer from the database');
  state.create = 'ok'; calls.length = 0;
  let answer = await send('/api/family/create', 'POST', { name: '  Synthetic household  ' });
  assert.equal(answer.status, 201); assert.equal(answer.json.ok, true);
  assert.deepEqual(rpcs('create_family').map((c) => c.payload), [{ p_name: 'Synthetic household' }], 'the family name is not trimmed, or something else was sent with it');

  // children
  calls.length = 0;
  const kid = { familyId: FAMILY, displayName: '  Zayd  ', ageBand: '5-7' };
  expect(await send('/api/family/children', 'POST', { ...kid, familyId: 'not-an-id' }), 400, 'malformed', 'child, a bad family id');
  expect(await send('/api/family/children', 'POST', { ...kid, displayName: '   ' }), 400, 'name_missing', 'child, no name');
  expect(await send('/api/family/children', 'POST', { ...kid, ageBand: '21-30' }), 400, 'band_invalid', 'child, an age band that does not exist');
  // An adult is not added as a child: the adult band is not one of a child's.
  expect(await send('/api/family/children', 'POST', kid, {}), 401, 'signed_out', 'child, signed out');
  assert.equal(rpcs('add_child_to_family').length, 0, 'a refused child was still sent to the database');
  for (const [reply, status, code] of [
    [refusal(403, '42501', 'only the owner may add a child to this family'), 403, 'not_owner'],
    [refusal(403, '42501', 'age:declare_before_adding_a_child'), 409, 'declaration_required'],
    [refusal(403, '42501', 'sign in to add a child'), 401, 'signed_out'],
    [refusal(404, 'P0002', `family ${FAMILY} not found`), 404, 'no_family'],
    [refusal(400, '23502', DATABASE_SENTENCE), 409, 'refused'],
    [[503, { message: 'SYNTHETIC-DATABASE upstream connect error' }], 502, 'unconfirmed'],
  ]) {
    state.add = reply;
    expect(await send('/api/family/children', 'POST', kid), status, code, `child, ${code}`);
  }
  state.add = 'ok'; calls.length = 0;
  answer = await send('/api/family/children', 'POST', kid);
  assert.equal(answer.status, 201); assert.deepEqual(answer.json, { ok: true, childId: 'new-child-id' });
  assert.deepEqual(rpcs('add_child_to_family').map((c) => c.payload), [{ p_family_id: FAMILY, p_display_name: 'Zayd', p_age_band: '5-7' }]);

  // learner: joining and leaving
  calls.length = 0;
  expect(await send('/api/family/learner', 'POST', { familyId: FAMILY }, {}), 401, 'signed_out', 'join, signed out');
  expect(await send('/api/family/learner', 'POST', { familyId: 'nope' }), 400, 'malformed', 'join, a bad family id');
  expect(await send('/api/family/learner', 'DELETE', '{not json'), 400, 'malformed', 'leave, not JSON');
  assert.equal(rpcs('claim_family_adult_learner').length + rpcs('release_family_adult_learner').length, 0);
  for (const [reply, status, code] of [
    [refusal(403, '42501', 'you are not a member of this family'), 403, 'not_member'],
    [refusal(400, '23514', 'your learning already belongs to another family; leave that family first'), 409, 'other_family'],
    [refusal(400, '23514', DATABASE_SENTENCE), 409, 'refused'],
    [[503, { message: 'SYNTHETIC-DATABASE upstream connect error' }], 502, 'unconfirmed'],
  ]) {
    state.join = reply;
    expect(await send('/api/family/learner', 'POST', { familyId: FAMILY }), status, code, `join, ${code}`);
  }
  state.join = 'ok';
  answer = await send('/api/family/learner', 'POST', { familyId: FAMILY });
  assert.equal(answer.status, 201); assert.equal(answer.json.created, true);
  state.joined = { learnerProfileId: 'own', created: false, joined: true, displayName: 'Synthetic learner' };
  answer = await send('/api/family/learner', 'POST', { familyId: FAMILY });
  assert.equal(answer.status, 200); assert.equal(answer.json.created, false); assert.equal(answer.json.joined, true);
  for (const [reply, status, code] of [
    [refusal(403, '42501', 'this learning holds a seat on the family plan. Ask whoever manages the plan to release the seat first.'), 409, 'seat_held'],
    [refusal(404, 'P0002', 'this account does not learn inside that family'), 409, 'not_here'],
    [[503, { message: 'SYNTHETIC-DATABASE upstream connect error' }], 502, 'unconfirmed'],
  ]) {
    state.leave = reply;
    expect(await send('/api/family/learner', 'DELETE', { familyId: FAMILY }), status, code, `leave, ${code}`);
  }
  state.leave = 'ok'; calls.length = 0;
  answer = await send('/api/family/learner', 'DELETE', { familyId: FAMILY });
  assert.equal(answer.status, 200); assert.deepEqual(answer.json, { ok: true, released: true });
  assert.deepEqual(rpcs('release_family_adult_learner').map((c) => c.payload), [{ p_family_id: FAMILY }], 'leaving names something besides the family');
  console.log('Family routes: create, add a child, join and leave each answer signed out 401, malformed 400, a typing mistake 400 with nothing sent, every database refusal under its own name and status without the database’s sentence, no answer from the database 502 "unconfirmed" rather than a refusal, and a good write with trimmed arguments and nothing extra. The stand-in enforces nothing: not real Auth or RLS.');

  if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
    const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
    browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
    const open = async (code, width, path = '/family') => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
      await context.addCookies([
        { name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin },
        { name: 'ayahspring_locale', value: code, url: origin },
      ]);
      const tab = await context.newPage();
      const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
      // What React says about a page the browser drew differently from the
      // server is said on the console, not thrown. A refused request is said
      // there too, and this script refuses on purpose, so that is left out.
      tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
      const sent = []; tab.on('request', (r) => { if (r.url().includes('/api/family/')) sent.push(`${r.method()} ${new URL(r.url()).pathname}`); });
      await tab.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      return { context, tab, errors, sent };
    };
    state.declaration = { required: true, declared: false, withdrawn: false, statementVersion: 1, statement: STATEMENT };
    for (const [code, heading, childHeading] of [['en', 'Children and progress', 'Aisha'], ['ar', 'الأطفال والتقدّم', 'Aisha'], ['ta', 'குழந்தைகளும் முன்னேற்றமும்', 'Aisha']]) {
      for (const width of [320, 390, 1440]) {
        for (const [path, name] of [['/family', heading], [`/family/${AISHA}`, childHeading]]) {
          const { context, tab, errors } = await open(code, width, path);
          assert.equal(await tab.evaluate(() => document.documentElement.lang), code);
          assert.equal(await tab.getByRole('heading', { name, exact: true, level: 1 }).count(), 1, `${code} ${width} ${path}: heading`);
          const scroll = await tab.evaluate(() => document.documentElement.scrollWidth);
          assert.ok(scroll <= width + 1, `${code} ${width} ${path}: the page scrolls sideways (${scroll})`);
          // Nothing inside a card may be wider than the card.
          const spill = await tab.evaluate(() => [...document.querySelectorAll('main .card, main form.card')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
          assert.equal(spill, 0, `${code} ${width} ${path}: a card's contents are wider than the card`);
          assert.deepEqual(errors, [], `${code} ${width} ${path}: page errors`);
          if (process.env.RESPONSIVE_SCREENSHOTS && [390, 1440].includes(width)) await tab.screenshot({ path: `${process.env.RESPONSIVE_SCREENSHOTS}/family${path === '/family' ? '' : '-child'}-${code}-${width}.png`, fullPage: true });
          await context.close();
        }
      }
      console.log(`Synthetic family page and learner page in ${code}: fit at 320, 390 and 1440px`);
    }
    state.declaration = { required: false };

    // Adding a child, in Arabic.
    {
      const { context, tab, errors, sent } = await open('ar', 390);
      assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('main h1')).direction), 'rtl');
      await tab.getByRole('button', { name: 'إضافة طفل', exact: true }).click();
      const name = tab.locator(`#child-name-${FAMILY}`);
      assert.equal(await name.getAttribute('dir'), 'auto');
      assert.deepEqual(await tab.locator(`#child-age-${FAMILY} option`).allTextContents(), [[5, 7], [8, 10], [11, 13], [14, 17]].map(([a, b]) => `الأعمار ${digits('ar', a)}–${digits('ar', b)}`), 'the age bands are not offered in Arabic, or an adult is offered as a child');
      const add = tab.getByRole('button', { name: 'إضافة الطفل', exact: true });
      await add.click();
      await tab.getByRole('alert').filter({ hasText: 'أضف اسم الطفل.' }).waitFor();
      assert.equal(sent.length, 0, 'a child with no name was still sent');
      await name.fill('زيد');
      state.add = refusal(403, '42501', 'age:declare_before_adding_a_child');
      await add.click();
      await tab.getByRole('alert').filter({ hasText: `أقِرّ بأن عمرك ${digits('ar', 18)} سنة أو أكثر قبل إضافة طفل.` }).waitFor();
      state.add = refusal(403, '42501', 'only the owner may add a child to this family');
      await add.click();
      await tab.getByRole('alert').filter({ hasText: 'مالك العائلة وحده يستطيع إضافة طفل.' }).waitFor();
      // No answer from the database: the child may have been added, so the
      // sentence sends the reader to look rather than to try again.
      state.add = [503, { message: 'SYNTHETIC-DATABASE upstream connect error' }];
      await add.click();
      await tab.getByRole('alert').filter({ hasText: 'لم نتمكّن من التأكّد من أن الطفل أُضيف. أعد تحميل الصفحة للتحقّق قبل أن تضيفه مرة أخرى.' }).waitFor();
      const said = await tab.locator('main').textContent();
      for (const sentence of ['SYNTHETIC-DATABASE', 'could not', 'Only the', 'age:declare']) assert.equal(said.includes(sentence), false, `a refusal is said in English or in the database's words: ${sentence}`);
      // The connection goes: the form says so and comes back to life.
      await context.setOffline(true);
      await add.click();
      await tab.getByRole('alert').filter({ hasText: 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.' }).waitFor();
      assert.equal(await add.isEnabled(), true, 'the form stays busy for good when the request cannot be made');
      await context.setOffline(false);
      state.add = 'ok';
      await add.click();
      await tab.getByRole('button', { name: 'إضافة طفل', exact: true }).waitFor();
      assert.equal(await tab.getByRole('alert').filter({ hasText: 'تعذّر' }).count(), 0);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic add-a-child form in Arabic: four age bands in Arabic and no adult band; no name named without a request; the declaration, the owner rule and "could not confirm" each said in Arabic without the database’s sentence; a lost connection said as one and the form usable again; a good add closes the form.');
    }

    // The adult's own card, in Arabic: leaving refused, then leaving; joining.
    {
      const { context, tab, errors } = await open('ar', 390);
      const leave = tab.getByRole('button', { name: 'إخراج تعلّمي من هذه العائلة', exact: true });
      state.leave = refusal(403, '42501', 'this learning holds a seat on the family plan. Ask whoever manages the plan to release the seat first.');
      await leave.click();
      await tab.getByRole('alert').filter({ hasText: 'هذا التعلّم يشغل مقعدًا في الخطة العائلية. على من يدير الخطة أن يحرّر ذلك المقعد أولًا.' }).waitFor();
      state.leave = 'ok';
      state.own = { id: 'own', display_name: 'Synthetic learner', family_id: null, learner_type: 'adult' };
      await leave.click();
      await tab.getByRole('status').filter({ hasText: 'خرج تعلّمك من هذه العائلة. كل دورة وكل تقدّمك ما زال موجودًا.' }).waitFor();
      // The page is read again: the card now offers the way back in.
      const join = tab.getByRole('button', { name: 'نقل تعلّمي إلى هذه العائلة', exact: true });
      await join.waitFor();
      state.join = refusal(400, '23514', 'your learning already belongs to another family; leave that family first');
      await join.click();
      await tab.getByRole('alert').filter({ hasText: 'تعلّمك في عائلة أخرى' }).waitFor();
      state.join = 'ok'; state.joined = { learnerProfileId: 'own', created: false, joined: true, displayName: 'Synthetic learner' };
      state.own = { id: 'own', display_name: 'Synthetic learner', family_id: FAMILY, learner_type: 'adult' };
      await join.click();
      await tab.getByRole('status').filter({ hasText: 'انتقل تعلّمك إلى هذه العائلة. وكل ما كان لديك جاء معه.' }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic adult card in Arabic: a held seat said in Arabic; leaving confirmed and the card redrawn with the way back; another family said by name; moving in confirmed.');
    }

    // Creating a family, in French, from the first visit.
    {
      state.families = [];
      const { context, tab, errors, sent } = await open('fr', 390);
      await tab.getByRole('heading', { name: 'Pas encore de famille', exact: true, level: 1 }).waitFor();
      const create = tab.getByRole('button', { name: 'Créer la famille', exact: true });
      state.create = [503, { message: 'SYNTHETIC-DATABASE upstream connect error' }];
      await tab.locator('#family-name').fill('Notre famille');
      await create.click();
      await tab.getByRole('alert').filter({ hasText: 'Nous n’avons pas pu confirmer que votre famille a été créée. Rechargez la page pour vérifier avant de réessayer.' }).waitFor();
      state.create = refusal(400, '23514', DATABASE_SENTENCE);
      await create.click();
      await tab.getByRole('alert').filter({ hasText: 'Votre famille n’a pas pu être créée.' }).waitFor();
      assert.equal((await tab.locator('main').textContent()).includes('SYNTHETIC-DATABASE'), false);
      state.create = 'ok'; state.families = [family()];
      await create.click();
      await tab.getByRole('heading', { name: 'Enfants et progression', exact: true, level: 1 }).waitFor();
      assert.equal(sent.filter((s) => s === 'POST /api/family/create').length, 3);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('Synthetic create-a-family form in French: "could not confirm" and a refusal each said in French without the database’s sentence; a good create shows the family.');
    }
  }
  console.log('Family HTTP smoke passed. Not real Auth or RLS.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
