// Six pages that had never been drawn in a browser, drawn signed in: /progress,
// /certificates, /handover, /family/guardians, /verify and /admin/connections.
// Real Next pages against a stand-in for Supabase's HTTP surface, each page
// with nothing to show and with something to show, at three widths in English
// and at a phone's width in Arabic.
//
// It checks that the page arrives, says what it should, fits its width, raises
// no console error (a hydration mismatch is one), and holds none of the
// identifiers the stand-in answered with. It is not real Auth, not row-level
// security and not the database functions' own rules; every name in it is
// invented.
//
//   RESPONSIVE_PLAYWRIGHT=…/playwright-core/index.mjs RESPONSIVE_CHROME=…/chrome node scripts/drawn-pages-smoke.mjs
//   RESPONSIVE_BROWSER=firefox (or webkit) uses that browser as Playwright installed it.
//   DRAWN_PRINT=1 prints each page's text instead of judging it.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const kind = process.env.RESPONSIVE_BROWSER ?? 'chromium';
if (!process.env.RESPONSIVE_PLAYWRIGHT) throw new Error('Set RESPONSIVE_PLAYWRIGHT');
if (kind === 'chromium' && !process.env.RESPONSIVE_CHROME) throw new Error('Set RESPONSIVE_CHROME');
const PRINT = process.env.DRAWN_PRINT === '1';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@synthetic.example', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };

const LEARNER = '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4001';
const CHILD_A = '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4002';
const CHILD_B = '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4003';
const FAMILY = '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4004';
const RELATION = '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4005';
const CASE = '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4006';
// A word with no place to break, and markup that must stay text.
const LONG = `Synthetic-course-title-with-no-place-to-break-${'x'.repeat(90)}`;
const MARKUP = 'Synthetic <b>Tajwid</b> & Makharij';
const DATABASE_SENTENCE = 'SYNTHETIC-DATABASE permission denied for table certificates';
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

const FULL = {
  adult: [{ id: LEARNER, display_name: 'Synthetic Learner', family_id: null, learner_type: 'adult' }],
  record: {
    learnerProfileId: LEARNER, displayName: 'Synthetic Learner', timezone: 'Africa/Kampala', today,
    streakDays: 3, longestStreakDays: 12, lastActiveOn: today,
    totals: { lessonsCompleted: 41, coursesCompleted: 1, certificates: 1, studyDays: 19 },
    studyDays: [today, daysAgo(1), daysAgo(2), daysAgo(9), daysAgo(30)],
    badges: [
      { code: 'first_lesson', name: 'Synthetic first lesson', description: 'Synthetic: finish one lesson.', earned: true, earnedOn: daysAgo(30), have: 1, need: 1, unit: 'lesson' },
      { code: 'seven_days', name: 'Synthetic seven days', description: 'Synthetic: study seven days in a row.', earned: false, earnedOn: null, have: 3, need: 7, unit: 'day' },
    ],
    courses: [
      { enrolmentId: '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4010', courseTitle: MARKUP, courseSlug: 'synthetic-tajwid', status: 'active', lessonsDone: 7, lessonsTotal: 20, percentComplete: 35 },
      { enrolmentId: '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4011', courseTitle: LONG, courseSlug: 'synthetic-long', status: 'completed', lessonsDone: 34, lessonsTotal: 34, percentComplete: 100 },
    ],
    certificates: [{ certificateNumber: 'AS-2026-00000123', courseTitle: LONG, issuedOn: daysAgo(9), status: 'issued' }],
  },
  certificates: [
    { id: '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4020', certificate_number: 'AS-2026-00000123', status: 'issued', issued_at: '2026-11-17T09:14:00+00:00', course_title: LONG, course_version_number: 2, course_language: 'ar', learner_display_name: 'Synthetic Learner', revocation_reason: null },
    { id: '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4021', certificate_number: 'AS-2026-00000124', status: 'revoked', issued_at: '2026-10-02T09:14:00+00:00', course_title: MARKUP, course_version_number: 1, course_language: 'en', learner_display_name: 'Synthetic Learner', revocation_reason: 'Synthetic reason: issued by mistake.' },
  ],
  children: [
    { id: CHILD_A, display_name: 'Synthetic Child One', age_band: '13-17', family_id: FAMILY, linked_user_id: null },
    { id: CHILD_B, display_name: 'Synthetic Child Two', age_band: '9-12', family_id: FAMILY, linked_user_id: null },
  ],
  memberships: [{ families: { id: FAMILY, name: 'Synthetic Family', learner_profiles: [
    { id: CHILD_A, display_name: 'Synthetic Child One', learner_type: 'child' },
    { id: CHILD_B, display_name: 'Synthetic Child Two', learner_type: 'child' },
    { id: LEARNER, display_name: 'Synthetic Learner', learner_type: 'adult' },
  ] } }],
  consents: { enforced: true, policyInForce: true, consents: [
    { relationshipId: RELATION, learnerProfileId: CHILD_A, learnerName: 'Synthetic Child One', relationshipType: 'parent', status: 'active', method: 'video_call',
      verifiedAt: '2026-06-01T10:00:00+00:00', expiresAt: '2027-06-01T10:00:00+00:00', revokedAt: null, revokedReason: null,
      canViewProgress: true, canManageLearning: true, canManageProfile: false, policyChanged: false, openCase: null, lastDecision: { status: 'verified', at: '2026-06-01T10:00:00+00:00', reason: null } },
    { relationshipId: '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4007', learnerProfileId: CHILD_B, learnerName: 'Synthetic Child Two', relationshipType: 'guardian', status: 'pending_verification', method: null,
      verifiedAt: null, expiresAt: null, revokedAt: null, revokedReason: null,
      canViewProgress: false, canManageLearning: false, canManageProfile: false, policyChanged: false,
      openCase: { id: CASE, status: 'needs_information', submittedAt: '2026-11-20T09:14:00+00:00', note: 'Synthetic note: please send the second page.' }, lastDecision: null },
  ] },
  verify: {
    'AS-2026-00000123': [{ valid: true, status: 'issued', course_title: LONG, learner_name: 'Synthetic Learner', issued_on: '2026-11-17', course_version: 2, language: 'ar', revoked_reason: null }],
    'AS-2026-00000124': [{ valid: false, status: 'revoked', course_title: MARKUP, learner_name: 'Synthetic Learner', issued_on: '2026-10-02', course_version: 1, language: 'en', revoked_reason: 'Synthetic reason: issued by mistake.' }],
  },
};
const EMPTY = { adult: [], record: null, certificates: [], children: [], memberships: [], consents: null, verify: {} };

// What the stand-in answers with now. `broken` makes every read fail with the database's words.
const state = { data: EMPTY, owner: true, broken: false, signedIn: true };
const calls = [];
const fake = createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const url = new URL(req.url, 'http://stand-in');
  const body = Buffer.concat(chunks).toString('utf8');
  calls.push({ method: req.method, path: url.pathname, query: url.search, body });
  const send = (status, value) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
  if (url.pathname === '/auth/v1/user') return state.signedIn ? send(200, user) : send(401, { message: 'no session' });
  const refused = () => send(403, { code: '42501', message: DATABASE_SENTENCE, details: null, hint: null });
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const name = url.pathname.split('/').pop();
    const args = body ? JSON.parse(body) : {};
    if (name === 'has_role') return send(200, state.owner);
    if (name === 'my_policy_standing') return send(200, null);
    if (state.broken) return refused();
    if (name === 'learner_progress_record') return send(200, state.data.record);
    if (name === 'my_guardian_consents') return send(200, state.data.consents);
    if (name === 'verify_certificate') return send(200, state.data.verify[args.p_certificate_number] ?? []);
    return send(200, null);
  }
  const table = url.pathname.replace('/rest/v1/', '');
  if (table === 'user_profiles') return send(200, [{ display_name: 'Synthetic Learner' }]);
  if (state.broken) return refused();
  if (table === 'learner_profiles') return send(200, url.search.includes('learner_type=eq.adult') ? state.data.adult : state.data.children);
  if (table === 'certificates') return send(200, state.data.certificates);
  if (table === 'family_memberships') return send(200, state.data.memberships);
  return send(200, []);
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = resolve(import.meta.dirname, '..');
const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const seen = { logs: '' };
next.stdout.on('data', (d) => { seen.logs += d; }); next.stderr.on('data', (d) => { seen.logs += d; });
const origin = `http://127.0.0.1:${port}`;

// What no page here may hold: the database's words, or an identifier the stand-in answered with.
// What no drawing may hold. The ids of the account's own children and consents
// are not here: a form names its child by id in a field's value, which is how
// forms work, and the reader already owns those rows.
const NEVER = ['SYNTHETIC-DATABASE', 'permission denied', user.id, FAMILY, CASE, '<b>Tajwid</b> &amp;amp;'];

let browser;
let drawn = 0;
const failures = [];
async function draw(path, { width = 390, locale = 'en', has = [], hasNot = [], lands = path, cookie = true, dir } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const cookies = [{ name: 'ayahspring_locale', value: locale, url: origin }];
  if (cookie) cookies.push({ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin });
  await context.addCookies(cookies);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 400)));
  const what = `${path} at ${width} in ${locale} (${kind})`;
  try {
    const response = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 180_000 });
    const text = await page.locator('main').innerText();
    if (PRINT) { console.log(`\n===== ${what} -> ${response.status()} ${page.url().replace(origin, '')}\n${text}`); if (errors.length) console.log('ERRORS', errors); return text; }
    // Every complaint about one drawing is collected, so one run names them all.
    const say = (ok, message) => { if (!ok) failures.push(message); };
    say(new URL(page.url()).pathname + new URL(page.url()).search === lands, `${what} landed on ${page.url().replace(origin, '')}, not ${lands}`);
    say(response.status() === 200, `${what} answered ${response.status()}`);
    for (const sentence of has) say(text.includes(sentence), `${what} lacks "${sentence}"`);
    for (const sentence of hasNot) say(!text.includes(sentence), `${what} still says "${sentence}"`);
    const html = await page.content();
    for (const never of NEVER) say(!html.includes(never), `${what} holds "${never}"`);
    const fit = await page.evaluate(() => {
      const view = document.documentElement.clientWidth;
      // The widest things on the page, when it does not fit: what to go and fix.
      const out = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > view + 1 || r.left < -1); };
      // The innermost ones: an element is named only when nothing inside it sticks out too.
      const wide = [...document.querySelectorAll('main *')].filter((el) => out(el) && ![...el.children].some(out))
        .slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} "${(el.textContent ?? '').slice(0, 30)}"`);
      return { wide: document.documentElement.scrollWidth, view, dir: document.documentElement.dir, culprits: wide };
    });
    say(fit.wide <= fit.view + 1, `${what} is ${fit.wide} wide in a window of ${fit.view}: ${fit.culprits.join(' | ')}`);
    if (dir) say(fit.dir === dir, `${what} is ${fit.dir}, not ${dir}`);
    say(errors.length === 0, `${what} raised console errors: ${errors.join(' | ')}`);
    drawn += 1;
    return text;
  } finally { await context.close(); }
}

try {
  const started = Date.now();
  for (;;) {
    if (next.exitCode !== null) throw new Error('next exited');
    try { await fetch(origin + '/not-a-page', { signal: AbortSignal.timeout(3000) }); break; } catch { /* not up yet */ }
    if (Date.now() - started > 180_000) throw new Error('next did not start');
    await new Promise((r) => setTimeout(r, 500));
  }
  const playwright = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
  browser = await playwright[kind].launch(kind === 'chromium'
    ? { executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] }
    : { headless: true });
  const WIDTHS = [320, 390, 1280];

  // 1. Nothing to show.
  state.data = EMPTY;
  for (const width of WIDTHS) {
    await draw('/progress', { width, has: ['Progress and achievements', 'A progress record belongs to a learner, and this account is not one yet.', 'Become a learner'] });
    await draw('/certificates', { width, has: ['No certificates yet. They are issued for completed courses whose author has enabled them.'] });
    await draw('/handover', { width, has: ['A record that becomes theirs', 'There is no child profile on this account, so there is nothing to hand over.'] });
    await draw('/family/guardians', { width, has: ['Guardian consent', 'You have no guardian consent on record yet.', 'There is no child profile in your family to ask about yet.'] });
    await draw('/verify', { width, has: ['Check a certificate', 'Where to find it', 'What checking does not tell you'] });
    await draw('/verify?number=AS-2026-000123', { width, has: ['That does not look like a certificate number.'] });
    await draw('/verify?number=AS-2026-00000999', { width, lands: '/verify/AS-2026-00000999', has: ['No certificate matches that number.', 'Check for a transcription error.'] });
    await draw('/admin/connections', { width, has: ['Connections', 'This shows what is set, not whether it is right.', 'Still to set: SUPABASE_SERVICE_ROLE_KEY', 'Still to set: RESEND_API_KEY', 'Set somewhere this page cannot see', 'The domain and its DNS records'], hasNot: ['fake-anon'] });
  }

  // 2. Something to show.
  state.data = FULL;
  for (const width of WIDTHS) {
    await draw('/progress', { width, has: ['Your progress', '3 days in a row — your best is 12 days.', '41 lessons finished', '1 of 2 earned.', 'Synthetic seven days', 'Four more days', '7 of 20 lessons · 35%', MARKUP, LONG, 'AS-2026-00000123'], hasNot: ['Become a learner', 'Four more lessons'] });
    const shelf = await draw('/certificates', { width, has: ['AS-2026-00000123', 'AS-2026-00000124', LONG, MARKUP, 'Issued Nov 17, 2026', 'Revoked: Synthetic reason: issued by mistake.', 'View and print certificate'], hasNot: ['No certificates yet.'] });
    // One certificate stands and one is revoked: the word "Revoked" as a mark appears once, and once more in the reason.
    if (shelf.split('Revoked').length - 1 !== 2) failures.push(`/certificates at ${width} marks the wrong certificates as revoked`);
    await draw('/handover', { width, has: ['Synthetic Child One · Ages 13–17', 'Synthetic Child Two · Ages 9–12', 'Keep it, as their own account', 'Do not keep it', 'This learner has no login yet, so this option will be refused until they have one.'], hasNot: ['There is no child profile on this account'] });
    await draw('/family/guardians', { width, has: ['Synthetic Child One · Parent', 'Synthetic Child Two · Guardian', 'How it is confirmed: A video call\n', 'You may see the child’s progress.', 'The reviewer has asked for more information.', 'Withdraw this consent', 'Ask for consent'], hasNot: ['You have no guardian consent on record yet.', 'Verification enforcement is off.', 'A video call It lapses'] });
    await draw('/verify?number=AS-2026-00000123', { width, lands: '/verify/AS-2026-00000123', has: ['This certificate is valid.', 'Synthetic Learner', LONG, 'Nov 17, 2026'], hasNot: ['not valid'] });
    // Typed in lower case with spaces, as copied out of a PDF: the same certificate.
    await draw('/verify?number=as%202026%2000000124', { width, lands: '/verify/AS-2026-00000124', has: ['This certificate is not valid.', 'Revoked: Synthetic reason: issued by mistake.', 'Synthetic Learner', MARKUP] });
  }

  // 3. Arabic at a phone's width: right to left, and still fits.
  for (const path of ['/progress', '/certificates', '/handover', '/family/guardians', '/verify?number=AS-2026-00000123']) {
    await draw(path, { width: 390, locale: 'ar', dir: 'rtl', has: ['Synthetic'], lands: path.startsWith('/verify') ? '/verify/AS-2026-00000123' : path });
  }
  await draw('/handover', { width: 390, locale: 'ar', dir: 'rtl', has: ['بلوغ الثامنة عشرة', 'Synthetic Child One · الأعمار'], hasNot: ['Turning eighteen', 'Keep it, as their own account'] });

  // 4. Who is turned away. No session: to sign in, and back here afterwards. Not the owner: to the front page.
  state.signedIn = false;
  for (const path of ['/progress', '/certificates', '/handover', '/family/guardians', '/admin/connections']) {
    await draw(path, { cookie: false, lands: `/sign-in?next=${path}`, hasNot: ['Synthetic', 'Still to set'] });
  }
  state.signedIn = true;
  state.owner = false;
  // A signed-in member who is not the owner is sent to the front page, which sends a member on to /learn.
  await draw('/admin/connections', { lands: '/learn', hasNot: ['Still to set', 'RESEND_API_KEY', 'Connections'] });
  state.owner = true;

  assert.deepEqual(failures, [], `${failures.length} complaint(s):\n  ${failures.join('\n  ')}`);
  if (!PRINT) console.log(`Drawn pages smoke passed in ${kind}: ${drawn} drawings of six pages, empty and with something to show, at 320, 390 and 1280 in English and at 390 in Arabic. Not real Auth, row-level security or the database functions; every name in it is invented.`);
} catch (e) { console.error(seen.logs.slice(-3000)); throw e; }
finally {
  if (browser) await browser.close();
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
