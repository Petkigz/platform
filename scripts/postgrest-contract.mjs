// The real pages, asking the real request server, in front of a real database.
//
// Every other check of a page in this repository answers the page's requests
// from a stand-in that says yes to anything. That is how eight reads spelt
// `.eq('deleted_at', null)` — an error on the real server — passed every test
// (2026-11-17). This one puts PostgREST and PostgreSQL where the stand-in was:
//
//   browser request -> Next page -> this gateway -> PostgREST -> PostgreSQL
//
// with every migration applied, row-level security on, and a signed token for a
// learner, a teacher and an owner. It walks every page that has no id in its
// address, plus the learner's own course, lesson and quiz, and fails when the
// request server refuses a request for a reason that is the page's fault: a
// column or relationship that does not exist, a function that is not there, a
// value of the wrong kind.
//
// What it is not. The sign-in server is still a stand-in: `/auth/v1/user` is
// answered here, so nothing is learnt about hosted Auth, sessions or cookies
// as Supabase sets them. A bare PostgreSQL does not have Supabase's default
// grants, so a "permission denied" here may not happen there (and is reported,
// not failed, for that reason). The data is a handful of fabricated rows put
// in past the triggers. It proves requests are well formed and that the rows a
// learner owns come back; it does not prove the pages are right.
//
//   node scripts/postgrest-contract.mjs prepare   apply, seed, write the fixture
//   node scripts/postgrest-contract.mjs run       walk the pages
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const DATABASE = 'ayahspring_postgrest_contract';
const fixturePath = process.env.CONTRACT_FIXTURE ?? '/tmp/ayahspring-postgrest-contract.json';
const mode = process.argv[2];

if (process.env.POSTGREST_CONTRACT !== '1' || process.env.PGDATABASE !== DATABASE) {
  throw new Error(`Use POSTGREST_CONTRACT=1 and a disposable PGDATABASE=${DATABASE}. Never point this at a project.`);
}

// GitHub keeps a step's log where this workspace cannot read it, and shows at
// most ten notes of each kind for a step. So the whole report travels in a few
// long notes, and failures are errors.
const escapeNote = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
function publish(title, lines, level = 'notice') {
  const text = lines.join('\n');
  console.log(`\n== ${title}\n${text}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### ${title}\n\n\`\`\`\n${text}\n\`\`\`\n`);
  if (!process.env.GITHUB_ACTIONS) return;
  const size = 3500; const parts = [];
  for (let at = 0; at < text.length; at += size) parts.push(text.slice(at, at + size));
  parts.slice(0, 8).forEach((part, i) => console.log(`::${level} title=${title} (${i + 1}/${parts.length})::${escapeNote(part)}`));
}

try {
  if (mode === 'prepare') await prepare();
  else if (mode === 'run') await run();
  else throw new Error('Say "prepare" or "run".');
} catch (error) {
  // The log of a failed step cannot be read from where this is developed, so
  // the reason has to leave as a note.
  publish('Contract check stopped', [String(error?.stack ?? error).slice(0, 6000)], 'error');
  process.exitCode = 1;
}

async function prepare() {
  const { default: pg } = await import('pg');
  const db = new pg.Client();
  await db.connect();
  try {
    const existing = await db.query("select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'auth') and c.relkind in ('r', 'p', 'v', 'm', 'S') limit 1");
    if (existing.rowCount) throw new Error('Database is not empty; refusing to run');
    await db.query(await readFile(join(root, 'supabase/tests/harness.sql'), 'utf8'));
    const dir = join(root, 'supabase/migrations');
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) await db.query(await readFile(join(dir, file), 'utf8'));

    // The role the request server signs in as. It can become the three roles a
    // token may name and nothing else. Supabase creates the same role.
    const password = process.env.CONTRACT_DB_PASSWORD;
    assert.ok(password && /^[a-f0-9]{32,}$/.test(password), 'CONTRACT_DB_PASSWORD must be a generated hex string');
    await db.query(`do $$ begin if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit; end if; end $$`);
    await db.query(`alter role authenticator password '${password}'`);
    await db.query('grant anon, authenticated, service_role to authenticator');

    const id = Object.fromEntries(['learner', 'teacher', 'owner', 'stranger', 'learnerProfile', 'course', 'version', 'section', 'lesson', 'secondLesson', 'resource', 'enrolment', 'assessment', 'assignment', 'question', 'secondQuestion'].map((name) => [name, randomUUID()]));
    // Inserted with triggers on, so each gets the profile a real sign-up gets.
    for (const who of ['learner', 'teacher', 'owner', 'stranger']) {
      await db.query('insert into auth.users (id, email) values ($1, $2)', [id[who], `${who}@example.test`]);
    }
    // A minimal course, put in past the triggers: this is a fixture for reading,
    // and the writes that build a course are tested where they belong.
    await db.query("set session_replication_role = 'replica'");
    await db.query("insert into public.learner_profiles (id, linked_user_id, display_name, learner_type, age_band) values ($1, $2, 'Contract learner', 'adult', '18+')", [id.learnerProfile, id.learner]);
    await db.query("insert into public.courses (id, slug, title, description, status, created_by) values ($1, 'contract-course', 'Contract course', 'A fabricated course.', 'active', $2)", [id.course, id.teacher]);
    await db.query("insert into public.course_versions (id, course_id, version_number, version_status, published_at, created_by) values ($1, $2, 1, 'published', now(), $3)", [id.version, id.course, id.teacher]);
    await db.query("insert into public.course_sections (id, course_version_id, title, position) values ($1, $2, 'Contract section', 1)", [id.section, id.version]);
    await db.query("insert into public.lessons (id, section_id, title, description, type, position, duration_seconds) values ($1, $3, 'Contract lesson', 'Fabricated reading text.', 'video', 1, 120), ($2, $3, 'Contract second lesson', null, 'text', 2, null)", [id.lesson, id.secondLesson, id.section]);
    await db.query("insert into public.lesson_resources (id, lesson_id, resource_type, display_name, external_url, position) values ($1, $2, 'video', 'Contract video', 'https://example.invalid/contract.mp4', 1)", [id.resource, id.lesson]);
    await db.query('insert into public.course_enrolments (id, learner_profile_id, course_id, course_version_id) values ($1, $2, $3, $4)', [id.enrolment, id.learnerProfile, id.course, id.version]);
    await db.query("insert into public.entitlement_grants (learner_profile_id, scope_type, course_version_id, source_type, status) values ($1, 'course_version', $2, 'free', 'active')", [id.learnerProfile, id.version]);
    await db.query("insert into public.assessments (id, course_version_id, title, type, status, attempt_limit) values ($1, $2, 'Contract quiz', 'practice', 'active', 2)", [id.assessment, id.version]);
    // Two questions the server can mark by itself, so the quiz can be sat to the end.
    await db.query(`insert into public.assessment_questions (id, assessment_id, type, content, answer_key, points, position) values
      ($1, $3, 'true_false', '{"prompt":"Contract statement"}'::jsonb, '"true"'::jsonb, 1, 1),
      ($2, $3, 'single_choice', '{"prompt":"Contract choice","choices":[{"id":"a","text":"Contract first"},{"id":"b","text":"Contract second"}]}'::jsonb, '"b"'::jsonb, 1, 2)`, [id.question, id.secondQuestion, id.assessment]);
    await db.query("insert into public.course_assignments (id, course_id, course_version_id, title, status, points_possible, created_by) values ($1, $2, $3, 'Contract assignment', 'open', 10, $4)", [id.assignment, id.course, id.version, id.teacher]);
    for (const [who, role] of [['teacher', 'instructor'], ['owner', 'platform_admin']]) {
      await db.query('insert into public.user_role_assignments (user_id, role_id, assigned_by) select $1, id, $1 from public.roles where code = $2', [id[who], role]);
    }
    await db.query("set session_replication_role = 'origin'");

    // Before any page is asked: does the database itself let the learner see
    // their course, and hide it from somebody else? If not, the walk below
    // would be measuring an empty site.
    const sees = async (who, sql, params) => {
      await db.query('begin');
      try {
        await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id[who], role: 'authenticated' })]);
        await db.query('set local role authenticated');
        return (await db.query(sql, params)).rowCount;
      } finally { await db.query('rollback'); }
    };
    assert.equal(await sees('learner', 'select 1 from public.course_enrolments where id = $1 and deleted_at is null', [id.enrolment]), 1, 'the learner cannot see their own enrolment');
    assert.equal(await sees('stranger', 'select 1 from public.course_enrolments where id = $1', [id.enrolment]), 0, 'a stranger can see the learner’s enrolment');
    assert.equal(await sees('learner', 'select 1 from public.lessons where id = $1', [id.lesson]), 1, 'the learner cannot see the lesson');

    writeFileSync(fixturePath, JSON.stringify({ id, migrations: files.length }, null, 2));
    const version = (await db.query('show server_version')).rows[0].server_version;
    publish('Contract database prepared', [`PostgreSQL ${version}, ${files.length} migrations, fabricated course with one learner, one teacher, one owner and a stranger.`, 'The learner sees their enrolment and lesson under row-level security; the stranger does not.']);
  } finally { await db.end(); }
}

function token(secret, claims) {
  const part = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${part({ alg: 'HS256', typ: 'JWT' })}.${part(claims)}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

function staticRoutes() {
  const routes = [];
  (function walk(dir, url) {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name.startsWith('[') || name.startsWith('_') || name === 'api') continue;
        walk(path, name.startsWith('(') ? url : `${url}/${name}`);
      } else if (name === 'page.tsx') routes.push(url || '/');
    }
  })(join(root, 'web/src/app'), '');
  return routes;
}

// Why the request server refused. "The page's fault" is a request that could
// never succeed whoever sent it; "not allowed" depends on who is asking and on
// grants a bare database does not have; "no row" is what `.single()` gets when
// there is nothing, which pages are expected to handle.
function classify(status, body) {
  const code = String(body?.code ?? '');
  if (code === 'PGRST116') return 'no row';
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST302' || status === 401 || status === 403) return 'not allowed';
  if (/^PGRST[12]\d\d$/.test(code) || /^(22|42)/.test(code) || code === '08P01') return 'malformed';
  // By its code before by its status. The request server answers 400 to a
  // check violation (23514) and to a plain `raise exception` (P0001), which
  // are the database refusing a well-formed request because of what is in it:
  // an attempt with a question unanswered, an attempt already handed in. Read
  // by status alone those were counted as the page's fault, and nothing had
  // provoked one until the walk sat a quiz.
  if (/^(23|P0|AS|[A-Z]{2}\d{3})/.test(code) || status === 409) return 'refused by a rule';
  if (status === 400 || status === 404) return 'malformed';
  return status >= 500 ? 'server error' : 'other';
}

async function run() {
  const { id } = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const secret = process.env.CONTRACT_JWT_SECRET; const upstream = process.env.POSTGREST_URL;
  assert.ok(secret && secret.length >= 32, 'CONTRACT_JWT_SECRET must be at least 32 characters');
  assert.ok(upstream && /^http:\/\/127\.0\.0\.1:\d+$/.test(upstream), 'POSTGREST_URL must be a loopback address');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const anonKey = token(secret, { role: 'anon', iss: 'contract', exp });
  const serviceKey = token(secret, { role: 'service_role', iss: 'contract', exp });
  const people = Object.fromEntries(['learner', 'teacher', 'owner'].map((who) => {
    const user = { id: id[who], aud: 'authenticated', role: 'authenticated', email: `${who}@example.test`, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
    const access = token(secret, { sub: user.id, role: 'authenticated', aud: 'authenticated', email: user.email, exp });
    const session = { access_token: access, refresh_token: 'contract-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
    return [who, { user, access, cookie: `sb-127-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}` }];
  }));

  // The request server must really be PostgREST, and must really be checking
  // tokens, or everything below is a stand-in again.
  const probe = await fetch(`${upstream}/`, { headers: { accept: 'application/openapi+json' } });
  const server = probe.headers.get('server') ?? '';
  assert.match(server, /postgrest/i, `the upstream does not say it is PostgREST: ${server}`);
  const forged = await fetch(`${upstream}/course_enrolments?select=id`, { headers: { authorization: `Bearer ${token('x'.repeat(40), { sub: id.learner, role: 'authenticated', exp })}` } });
  assert.equal(forged.status, 401, 'the request server accepted a token signed with the wrong secret');
  const reads = async (who, path) => (await fetch(`${upstream}${path}`, { headers: { authorization: `Bearer ${who ? people[who].access : anonKey}` } }));
  assert.equal((await (await reads('learner', `/course_enrolments?select=id&id=eq.${id.enrolment}&deleted_at=is.null`)).json()).length, 1, 'the learner’s enrolment does not come back through the request server');
  assert.equal((await (await reads('teacher', `/course_enrolments?select=id&id=eq.${id.enrolment}&deleted_at=is.null`)).json()).length >= 0, true);
  assert.equal((await (await reads(null, `/course_enrolments?select=id&id=eq.${id.enrolment}`)).json()).length ?? 0, 0, 'an anonymous visitor can read an enrolment');
  // The mistake this check exists for, shown on the real server once, so that
  // the day it stops being refused somebody finds out.
  const spelling = await reads('learner', `/course_enrolments?select=id&deleted_at=eq.null`);
  const spellingBody = await spelling.json();
  assert.equal(spelling.status, 400, `eq.null was not refused: ${spelling.status}`);
  assert.equal(spellingBody.code, '22007', `eq.null was refused for another reason: ${JSON.stringify(spellingBody)}`);

  // What web/src/lib/postgrest-select-contract.test.ts assumes about this
  // server, asked of the server. That test reads source text against a model
  // of PostgREST; if the model is wrong, it is wrong here first.
  const shape = [];
  const one = await (await reads('learner', `/course_enrolments?select=id,courses(title)&id=eq.${id.enrolment}`)).json();
  assert.ok(one[0]?.courses && !Array.isArray(one[0].courses) && one[0].courses.title === 'Contract course', `an enrolment's one course did not come back as an object: ${JSON.stringify(one)}`);
  shape.push('a relation the row holds the key to (enrolment -> course) comes back as one object');
  const many = await (await reads('learner', `/course_sections?select=id,lessons(id)&id=eq.${id.section}`)).json();
  assert.ok(Array.isArray(many[0]?.lessons) && many[0].lessons.length === 2, `a section's lessons did not come back as a list of two: ${JSON.stringify(many)}`);
  shape.push('a relation the other table holds the key to (section -> lessons) comes back as a list');
  const twoKeys = await reads('learner', '/family_memberships?select=id,user_profiles(display_name)');
  const twoKeysBody = await twoKeys.json();
  assert.equal(twoKeysBody.code, 'PGRST201', `a relation two foreign keys could mean was not refused as ambiguous: ${twoKeys.status} ${JSON.stringify(twoKeysBody).slice(0, 300)}`);
  const named = await reads('learner', '/family_memberships?select=id,user_profiles!family_memberships_user_id_fkey(display_name)');
  assert.equal(named.status, 200, `naming the foreign key did not settle it: ${named.status} ${(await named.text()).slice(0, 300)}`);
  shape.push(`a relation two foreign keys could mean is refused (${twoKeys.status} PGRST201) until one is named`);
  const missing = await reads('learner', '/user_profiles?select=user_id,email');
  const missingBody = await missing.json();
  assert.equal(missingBody.code, '42703', `a column that does not exist was not refused: ${missing.status} ${JSON.stringify(missingBody).slice(0, 300)}`);
  shape.push(`a column that does not exist is refused (${missing.status} 42703)`);

  // What migration 20261281144000 is for. The database was prepared with the
  // hosted platform's default privileges, under which these were callable by
  // anybody before that migration. Asked of the real server as nobody and as a
  // signed-in learner.
  const call = async (who, fn, args) => {
    const reply = await fetch(`${upstream}/rpc/${fn}`, { method: 'POST', headers: { authorization: `Bearer ${who ? people[who].access : anonKey}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
    return { status: reply.status, body: await reply.json().catch(() => null) };
  };
  const closed = [
    ['notify_user', { p_user: id.stranger, p_kind: 'contract', p_title: 'Contract', p_body: 'This must never arrive.' }],
    // The one that also keeps what the message is made of (migration 20261281148000): all eight names, so it is that one.
    ['notify_user', { p_user: id.stranger, p_kind: 'contract', p_title: 'Contract', p_body: 'This must never arrive either.', p_href: null, p_severity: 'info', p_dedupe: null, p_facts: { amountMinor: '1' } }],
    ['reverse_earnings_for_refund', { p_order_id: id.course, p_actor_id: id.learner, p_reason: 'contract' }],
    ['accrue_instructor_earnings', { p_order_id: id.course, p_transaction_id: id.course, p_actor_id: id.learner }],
    ['instructor_payout_totals', { p_instructor: id.teacher, p_hold_days: 0 }],
    ['recompute_order_totals', { p_order_id: id.course }],
  ];
  for (const [fn, args] of closed) {
    for (const who of [null, 'learner']) {
      const got = await call(who, fn, args);
      // 42501 is "permission denied"; PGRST202 would mean the arguments here
      // are wrong and nothing was tested.
      assert.equal(got.body?.code, '42501', `${fn} was not refused to ${who ?? 'an anonymous visitor'} for lack of permission: ${got.status} ${JSON.stringify(got.body).slice(0, 300)}`);
    }
  }
  // Agreeing to a policy names the version that was read (migration
  // 20261281149000). Two functions now share the name, and the request server
  // chooses between them by the names of the arguments. A number that is not
  // the one in force is the database's own refusal, with its SQLSTATE; a
  // visitor is refused for lack of permission before anything is compared.
  const stale = await call('learner', 'accept_policy', { p_slug: 'terms', p_version: 999999 });
  assert.equal(stale.body?.code, '23514', `agreeing to a version that is not in force was not refused by the database: ${stale.status} ${JSON.stringify(stale.body).slice(0, 300)}`);
  assert.equal(stale.body?.message, 'policy:changed', `the refusal was not the one the application names: ${JSON.stringify(stale.body).slice(0, 300)}`);
  const visiting = await call(null, 'accept_policy', { p_slug: 'terms', p_version: 999999 });
  assert.equal(visiting.body?.code, '42501', `an anonymous visitor could ask to agree to a policy: ${visiting.status} ${JSON.stringify(visiting.body).slice(0, 300)}`);
  const agreements = await reads('learner', '/policy_acceptances?select=accepted_at');
  assert.equal(agreements.status === 200 ? (await agreements.json()).length : 0, 0, 'an agreement was recorded by a request that named a version not in force');
  shape.push(`agreeing to a policy with a version number that is not in force is refused by the database (${stale.status} 23514 policy:changed), and refused to a visitor (42501)`);
  // The page of an account's plans asks, with each plan, for the country on
  // its billing account and for the order it began with (2026-11-24): whether
  // to say the fourteen days, and whether it ended because the money went
  // back. Both are relationships the request server has to find.
  const plansRead = await reads('learner', '/subscriptions?select=id,status,billing_accounts(billing_country),order_items(orders(status))');
  assert.equal(plansRead.status, 200, `the plans page's read of the account and the order was refused: ${plansRead.status} ${(await plansRead.text()).slice(0, 300)}`);
  shape.push('a plan is read with its billing account’s country and the status of the order it began with (200)');
  const delivered = await reads('learner', '/notifications?select=id&kind=eq.contract');
  assert.equal(delivered.status === 200 ? (await delivered.json()).length : 0, 0, 'a notification was written by a caller who must not be able to');
  const truncate = await fetch(`${upstream}/course_wishlist`, { method: 'DELETE', headers: { authorization: `Bearer ${anonKey}` } });
  assert.ok(truncate.status === 401 || truncate.status === 403, `an anonymous DELETE on a table was not refused for lack of permission: ${truncate.status}`);
  shape.push(`${closed.length} server-only functions refuse an anonymous visitor and a signed-in learner (42501), on a database given the hosted platform's default privileges`);
  publish('What the request server does', shape);

  let current = { pass: 'start', route: '-' }; const refusals = []; let forwarded = 0;
  const gateway = createServer(async (req, res) => {
    const bearer = req.headers.authorization?.replace(/^Bearer /, '');
    if (req.url?.startsWith('/auth/v1/user')) {
      const person = Object.values(people).find((p) => p.access === bearer);
      res.setHeader('content-type', 'application/json');
      if (!person) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
      res.end(JSON.stringify(person.user)); return;
    }
    if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"message":"not part of this check"}'); return; }
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const headers = {};
    for (const name of ['authorization', 'accept', 'content-type', 'prefer', 'range', 'range-unit', 'accept-profile', 'content-profile']) if (req.headers[name]) headers[name] = req.headers[name];
    const path = req.url.slice('/rest/v1'.length);
    let reply;
    try {
      reply = await fetch(`${upstream}${path}`, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
    } catch (error) {
      refusals.push({ ...current, method: req.method, path, status: 502, kind: 'server error', code: 'gateway', message: String(error) });
      res.writeHead(502, { 'content-type': 'application/json' }); res.end('{"message":"gateway"}'); return;
    }
    forwarded += 1;
    const payload = Buffer.from(await reply.arrayBuffer());
    if (reply.status >= 400) {
      let body = null; try { body = JSON.parse(payload.toString('utf8')); } catch { body = { message: payload.toString('utf8').slice(0, 200) }; }
      const role = bearer === anonKey ? 'anon' : bearer === serviceKey ? 'service' : 'user';
      refusals.push({ ...current, role, method: req.method, path: decodeURIComponent(path).slice(0, 400), status: reply.status, kind: classify(reply.status, body), code: body?.code ?? '', message: String(body?.message ?? '').slice(0, 300), hint: String(body?.hint ?? body?.details ?? '').slice(0, 200) });
    }
    const out = {};
    for (const name of ['content-type', 'content-range', 'range-unit', 'preference-applied', 'location']) { const value = reply.headers.get(name); if (value) out[name] = value; }
    res.writeHead(reply.status, out); res.end(payload);
  });
  gateway.listen(0, '127.0.0.1'); await once(gateway, 'listening');

  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise((r) => reservation.close(r));
  const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: resolve(root, 'web'), detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${gateway.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey },
  });
  let logs = ''; const pages = []; const failures = [];
  const receive = (chunk) => { logs = (logs + chunk.toString()).slice(-200000); };
  next.stdout.on('data', receive); next.stderr.on('data', receive);
  try {
    await new Promise((ready, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${logs}`)), 90000);
      const watch = setInterval(() => { if (logs.includes('Ready in')) { clearTimeout(timeout); clearInterval(watch); ready(); } }, 100);
      next.once('exit', (code) => { clearTimeout(timeout); clearInterval(watch); reject(new Error(`Next exited ${code}\n${logs}`)); });
    });

    const everywhere = staticRoutes();
    const own = [`/learn/${id.enrolment}`, `/learn/${id.enrolment}/lesson/${id.lesson}`, `/learn/${id.enrolment}/lesson/${id.secondLesson}`, `/learn/${id.enrolment}/assessment/${id.assessment}`, `/learn/${id.enrolment}/assignment/${id.assignment}`, '/courses/contract-course', `/courses/contract-course/preview/${id.lesson}`, '/courses/contract-course/buy'];
    const taught = [`/teach/${id.course}`, `/teach/${id.course}/assignments`, `/teach/${id.course}/cohorts`, `/teach/${id.course}/live`, `/teach/${id.course}/preview`, `/teach/${id.course}/preview/${id.lesson}`, `/teach/${id.course}/reports`];
    const only = process.env.CONTRACT_ROUTES ? process.env.CONTRACT_ROUTES.split(',') : null;
    const visit = async (pass, who, routes) => {
      for (const route of only ? routes.filter((r) => only.some((o) => r.startsWith(o))) : routes) {
        current = { pass, route };
        const before = refusals.length; const started = Date.now();
        let status = 0; let text = ''; let location = '';
        try {
          const reply = await fetch(`http://127.0.0.1:${port}${route}`, { redirect: 'manual', headers: who ? { cookie: people[who].cookie } : {}, signal: AbortSignal.timeout(120000) });
          status = reply.status; location = reply.headers.get('location') ?? ''; text = await reply.text();
        } catch (error) { text = String(error); }
        pages.push({ pass, route, status, location, ms: Date.now() - started, refused: refusals.length - before });
        if (status === 0 || status >= 500) failures.push(`${pass} ${route}: the page answered ${status || 'nothing'} ${text.replace(/\s+/g, ' ').slice(0, 160)}`);
      }
    };

    const { default: pg } = await import('pg');
    const db = new pg.Client(); await db.connect();
    try {
      await visit('anonymous', null, [...everywhere, '/courses/contract-course', `/courses/contract-course/preview/${id.lesson}`]);
      await visit('learner', 'learner', [...everywhere, ...own]);
      // The same pages with every switch on: most of what a page asks for is
      // behind a switch that ships off, and a request nobody sends is a
      // request nobody has checked. This database is thrown away afterwards.
      // Only the switches an owner can turn on from the dashboard: the ones
      // that need a deploy stay off, as they would for anybody.
      const switched = await db.query("update public.platform_settings set value_text = 'true' where setting_kind = 'flag' and value_type = 'boolean' and value_text = 'false' and coalesce(gate_type, 'admin') <> 'code'");
      await visit('learner, all switches on', 'learner', [...everywhere, ...own]);
      await visit('teacher, all switches on', 'teacher', [...everywhere.filter((r) => /^\/(teach|review|learn|account|notifications|support)/.test(r)), ...taught]);
      await visit('owner, all switches on', 'owner', everywhere.filter((r) => /^\/(admin|teach|review)/.test(r)));

      // The learner's own rows must have reached the page, or the walk above
      // only proved that empty pages are well formed.
      const body = async (route) => (await (await fetch(`http://127.0.0.1:${port}${route}`, { headers: { cookie: people.learner.cookie } })).text()).replace(/<script[\s\S]*?<\/script>/g, '');
      if (!only) {
        current = { pass: 'the learner’s own rows', route: '/learn and below' };
        const expect = (found, what) => { if (!found) failures.push(what); };
        expect((await body('/learn')).includes('Contract course'), 'the learner’s dashboard does not show their course');
        expect((await body(`/learn/${id.enrolment}`)).includes('Contract lesson'), 'the course page does not show its lessons');
        const lesson = await body(`/learn/${id.enrolment}/lesson/${id.lesson}`);
        expect(lesson.includes('Fabricated reading text.') && lesson.includes('Contract video'), 'the lesson page does not show the lesson and its video');
        // Names that arrive through a to-one relation. Each of these was
        // silently missing while the pages indexed [0] into one object.
        expect(lesson.includes('Contract course'), 'the lesson page does not name its course');
        expect(lesson.includes('Contract section'), 'the lesson page does not name its section');
        expect((await body(`/learn/${id.enrolment}`)).includes('Contract course'), 'the course page does not name the course');
        const quiz = await body(`/learn/${id.enrolment}/assessment/${id.assessment}`);
        expect(quiz.includes('Contract quiz') && quiz.includes('Contract course'), 'the quiz page does not show the quiz and its course');
        const assignment = await body(`/learn/${id.enrolment}/assignment/${id.assignment}`);
        expect(assignment.includes('Contract assignment') && assignment.includes('Contract course'), 'the assignment page does not show the assignment and its course');

        // The quiz, sat to the end. Everything above loads pages; this is the
        // one place the walk writes as a learner, because the defects here
        // were in what a page does to the database when it is merely opened.
        // The two refusals it provokes on purpose are reported with the rest
        // under this name.
        current = { pass: 'the quiz, sat to the end', route: 'refusals here are provoked on purpose' };
        const quizRoute = `/learn/${id.enrolment}/assessment/${id.assessment}`;
        const attempts = async () => (await db.query('select id, attempt_number, status, score_earned, score_possible from public.assessment_attempts where assessment_id = $1 order by attempt_number', [id.assessment])).rows;
        const act = async (payload) => {
          const reply = await fetch(`http://127.0.0.1:${port}/api/assessment`, { method: 'POST', headers: { cookie: people.learner.cookie, 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(120000) });
          return { status: reply.status, json: await reply.json().catch(() => null) };
        };
        const said = (reply) => `${reply.status} ${JSON.stringify(reply.json).slice(0, 200)}`;
        let sat = await attempts();
        expect(sat.length === 1 && sat[0].status === 'in_progress', `opening the quiz should have opened exactly one attempt; found ${JSON.stringify(sat.map((a) => a.status))}`);
        await body(quizRoute);
        expect((await attempts()).length === 1, 'opening the quiz a second time opened a second attempt');
        if (sat.length === 1) {
          const attemptId = sat[0].id;
          expect(quiz.includes('Contract statement') && quiz.includes('Contract second') && quiz.includes('0 of 2 answered'), 'the quiz does not show its questions, its choices and an honest count before anything is answered');
          const early = await act({ action: 'submit', attemptId });
          expect(early.status === 409 && early.json?.code === 'unanswered', `handing in an unanswered attempt should be refused as "unanswered"; got ${said(early)}`);
          expect(!JSON.stringify(early.json).includes(attemptId), 'the refusal carries the attempt id, which is the database’s own wording');
          // Straight to the request server, as the learner, without the site:
          // an answer with its own mark on it, which is how any assessment
          // could be passed before migration 20261281145000; then an honest
          // row, because the table is now written through one function only.
          const write = async (row) => {
            const reply = await fetch(`${upstream}/assessment_responses`, { method: 'POST', headers: { authorization: `Bearer ${people.learner.access}`, 'content-type': 'application/json' }, body: JSON.stringify(row) });
            return { status: reply.status, json: await reply.json().catch(() => null) };
          };
          const forged = await write({ assessment_attempt_id: attemptId, question_id: id.question, response_content: 'false', score: 1, is_correct: true, graded_by: id.learner, graded_at: new Date().toISOString() });
          expect(forged.json?.code === '42501', `a learner's answer carrying its own mark was not refused for lack of permission: ${said(forged)}`);
          const direct = await write({ assessment_attempt_id: attemptId, question_id: id.question, response_content: 'false' });
          expect(direct.json?.code === '42501', `a learner wrote to the answer sheet directly: ${said(direct)}`);
          const written = await db.query('select count(*)::int as n from public.assessment_responses where assessment_attempt_id = $1', [attemptId]);
          expect(written.rows[0].n === 0, 'a response was written directly to the table by a learner');

          // The first answer to the statement is the wrong one, and is then
          // changed. A change used to be dropped and reported as saved; the
          // marking at the end is what shows this one was kept.
          for (const [questionId, content] of [[id.question, 'false'], [id.secondQuestion, 'b'], [id.question, 'true']]) {
            const saved = await act({ action: 'answer', attemptId, questionId, content });
            expect(saved.status === 200 && saved.json?.ok === true && saved.json?.held === true, `saving an answer was refused: ${said(saved)}`);
          }
          const changed = await db.query('select response_content from public.assessment_responses where assessment_attempt_id = $1 and question_id = $2', [attemptId, id.question]);
          expect(changed.rowCount === 1 && changed.rows[0].response_content === 'true', `a changed answer was not kept: ${JSON.stringify(changed.rows)}`);
          // An emptied answer is taken back, and the attempt is unanswered again.
          const cleared = await act({ action: 'answer', attemptId, questionId: id.secondQuestion, content: '' });
          expect(cleared.status === 200 && cleared.json?.held === false, `emptying an answer should take it back: ${said(cleared)}`);
          const again = await act({ action: 'submit', attemptId });
          expect(again.status === 409 && again.json?.code === 'unanswered', `an attempt with a taken-back answer should be refused as "unanswered"; got ${said(again)}`);
          const restored = await act({ action: 'answer', attemptId, questionId: id.secondQuestion, content: 'b' });
          expect(restored.status === 200 && restored.json?.held === true, `answering again was refused: ${said(restored)}`);
          // A reload has to show what was saved, or "saved as you go" is a claim.
          const reloaded = await body(quizRoute);
          expect((reloaded.match(/<input[^>]*\bchecked=""/g) ?? []).length === 2 && reloaded.includes('2 of 2 answered'), 'a reload does not show the two saved answers as chosen');
          const handed = await act({ action: 'submit', attemptId });
          expect(handed.status === 200 && handed.json?.ok === true && handed.json?.attempt?.status === 'graded' && Number(handed.json?.attempt?.score_earned) === 2, `handing in two right answers should be marked 2 of 2 by the server; got ${said(handed)}`);
          // What the quiz does next in a browser: the same page, with `done`.
          const after = await body(`${quizRoute}?done=1`);
          sat = await attempts();
          expect(sat.length === 1 && sat[0].status === 'graded', `handing in an attempt opened the next one without being asked; attempts are now ${JSON.stringify(sat.map((a) => a.status))}`);
          // A practice assessment has no pass mark. Until 20261281145000 that
          // made it impossible to hand in at all.
          const verdict = await db.query('select passed from public.assessment_attempts where id = $1', [attemptId]);
          expect(verdict.rows[0]?.passed === null, `a practice attempt was given a verdict: ${JSON.stringify(verdict.rows)}`);
          expect(after.includes('Start another attempt') && after.includes('Starting uses one of your attempts.'), 'after handing in, the page does not offer the next attempt as a choice');
          expect(after.includes('Score: 2 of 2') && after.includes('Submitted.'), 'after handing in, the page does not show the score and that it was submitted');
          expect(!after.includes('0 of 2 answered'), 'after handing in, the page still draws a quiz');
          expect(!after.includes('Not passed') && !after.includes('Passed'), 'a practice attempt is shown with a verdict it does not have');
          const late = await act({ action: 'answer', attemptId, questionId: id.question, content: 'false' });
          expect(late.status === 409 && late.json?.code === 'already_submitted', `changing an answer after handing in should be refused as "already_submitted"; got ${said(late)}`);
          const kept = await db.query('select response_content from public.assessment_responses where assessment_attempt_id = $1 and question_id = $2', [attemptId, id.question]);
          expect(kept.rows[0]?.response_content === 'true', 'an answer was changed after the attempt was handed in');
        }

        // The assignment, handed in, marked and revised. The same reason as the
        // quiz: a page that loads says nothing about what its buttons do.
        current = { pass: 'the assignment, handed in and marked', route: 'refusals here are provoked on purpose' };
        const workRoute = `/learn/${id.enrolment}/assignment/${id.assignment}`;
        const work = async (who, payload) => {
          const reply = await fetch(`http://127.0.0.1:${port}/api/assignments`, { method: 'POST', headers: { cookie: people[who].cookie, 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(120000) });
          return { status: reply.status, json: await reply.json().catch(() => null) };
        };
        const told = (reply) => `${reply.status} ${JSON.stringify(reply.json).slice(0, 240)}`;
        // React puts a comment between a sentence and a value it prints.
        const plain = async (route, who = 'learner') => (await (await fetch(`http://127.0.0.1:${port}${route}`, { headers: { cookie: people[who].cookie } })).text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!-- -->/g, '');
        const handIns = async () => (await db.query('select id, status, body_text, score_earned, feedback, revision_number from public.assignment_submissions where assignment_id = $1', [id.assignment])).rows;
        expect((await handIns()).length === 0, 'opening the assignment page wrote a submission');

        const first = await work('learner', { action: 'save_draft', assignmentId: id.assignment, learnerProfileId: id.learnerProfile, bodyText: 'Contract first draft' });
        expect(first.status === 200 && first.json?.ok === true && typeof first.json?.id === 'string', `saving a draft was refused: ${told(first)}`);
        const second = await work('learner', { action: 'save_draft', assignmentId: id.assignment, learnerProfileId: id.learnerProfile, bodyText: 'Contract answer' });
        expect(second.status === 200 && second.json?.id === first.json?.id, `saving a draft twice should keep one draft: ${told(second)}`);
        let handed = await handIns();
        expect(handed.length === 1 && handed[0].status === 'draft' && handed[0].body_text === 'Contract answer', `a changed draft was not kept: ${JSON.stringify(handed)}`);
        if (handed.length === 1) {
          const submissionId = handed[0].id;
          const drafted = await plain(workRoute);
          expect(drafted.includes('Contract answer') && drafted.includes('Draft saved'), 'a reload does not show the saved draft');

          // Somebody who is not the learner or their guardian, and the learner
          // marking their own work.
          const meddled = await work('teacher', { action: 'save_draft', assignmentId: id.assignment, learnerProfileId: id.learnerProfile, bodyText: 'Written by somebody else' });
          expect(meddled.status === 403, `a teacher wrote a learner's draft for them: ${told(meddled)}`);
          const selfMarked = await work('learner', { action: 'mark', submissionId, score: 10, feedback: 'Full marks.' });
          expect(selfMarked.status === 403, `a learner marked their own work: ${told(selfMarked)}`);
          // Straight to the request server, as the learner: a mark written onto
          // their own row, and a second row already marked.
          const direct = async (method, path, row) => {
            const reply = await fetch(`${upstream}${path}`, { method, headers: { authorization: `Bearer ${people.learner.access}`, 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify(row) });
            return { status: reply.status, json: await reply.json().catch(() => null) };
          };
          const patched = await direct('PATCH', `/assignment_submissions?id=eq.${submissionId}`, { status: 'graded', score_earned: 10 });
          expect(patched.json?.code === '42501', `a learner's direct edit of their hand-in was not refused for lack of permission: ${told(patched)}`);
          const planted = await direct('POST', '/assignment_submissions', { assignment_id: id.assignment, learner_profile_id: id.learnerProfile, status: 'graded', score_earned: 10, body_text: 'Planted' });
          expect(planted.json?.code === '42501', `a learner inserted a hand-in directly: ${told(planted)}`);
          handed = await handIns();
          expect(handed.length === 1 && handed[0].status === 'draft' && handed[0].score_earned === null && handed[0].body_text === 'Contract answer', `the hand-in was changed by somebody who must not: ${JSON.stringify(handed)}`);

          const early = await work('teacher', { action: 'mark', submissionId, score: 8, feedback: 'Too soon.' });
          expect(early.status === 409 && early.json?.code === 'not_submitted', `marking a draft before it is handed in should be refused with its reason: ${told(early)}`);
          const submitted = await work('learner', { action: 'submit', submissionId });
          expect(submitted.status === 200 && submitted.json?.ok === true, `handing in was refused: ${told(submitted)}`);
          expect((await handIns())[0]?.status === 'submitted', 'handing in did not change the status');
          expect((await plain(workRoute)).includes('Submitted and waiting for marking.'), 'after handing in, the page does not say it is waiting for marking');
          const late = await work('learner', { action: 'save_draft', assignmentId: id.assignment, learnerProfileId: id.learnerProfile, bodyText: 'Changed after handing in' });
          // The reason goes out as a word the page can say in the reader's
          // language. This used to be "400" with the database's own sentence.
          expect(late.status === 409 && late.json?.code === 'already_submitted', `saving over handed-in work should be refused with its reason: ${told(late)}`);
          expect((await handIns())[0]?.body_text === 'Contract answer', 'the text of a hand-in changed after it was submitted');

          const marked = await work('teacher', { action: 'mark', submissionId, score: 8, feedback: 'Contract feedback' });
          expect(marked.status === 200 && marked.json?.ok === true, `the teacher could not mark the work: ${told(marked)}`);
          handed = await handIns();
          expect(handed[0]?.status === 'graded' && Number(handed[0]?.score_earned) === 8, `marking did not record the mark: ${JSON.stringify(handed)}`);
          const seen = await plain(workRoute);
          expect(seen.includes('Score: 8 of 10') && seen.includes('Contract feedback') && seen.includes('Revise this work'), 'the learner is not shown the mark, the comment and the way to revise');
          // The same page for a reader of Arabic: the page's own words are
          // Arabic, what the teacher wrote is as written, and nothing is
          // printed in English outside the part marked as English.
          const inArabic = async (route) => (await (await fetch(`http://127.0.0.1:${port}${route}`, { headers: { cookie: `${people.learner.cookie}; ayahspring_locale=ar` } })).text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
          const arabic = await inArabic(workRoute);
          expect(arabic.includes('مراجعة هذا العمل') && arabic.includes('تم التصحيح') && arabic.includes('Contract feedback') && !arabic.includes('Revise this work') && !arabic.includes('Your work'), 'the assignment page is not in Arabic for a reader of Arabic');
          const arabicList = await inArabic(`/learn/${id.enrolment}`);
          expect(arabicList.includes('الواجبات') && arabicList.includes('عرض الملاحظات') && !arabicList.includes('View feedback'), 'the assignment list on the course page is not in Arabic for a reader of Arabic');
          // The teacher's side shows it too.
          expect((await plain(`/teach/${id.course}/assignments`, 'teacher')).includes('Contract assignment'), 'the teacher’s assignment list does not show the assignment');

          const reopened = await work('learner', { action: 'reopen', submissionId });
          expect(reopened.status === 200 && reopened.json?.revisionNumber === 2, `revising marked work was refused: ${told(reopened)}`);
          handed = await handIns();
          expect(handed[0]?.status === 'draft' && handed[0]?.revision_number === 2 && handed[0]?.score_earned === null, `revising did not reopen the work as version 2: ${JSON.stringify(handed)}`);
          const revising = await plain(workRoute);
          expect(revising.includes('Earlier version') && revising.includes('Version 1') && revising.includes('Contract feedback') && revising.includes('Score: 8 of 10'), 'the version that was marked is not kept on the page with its mark');
          const again = await work('learner', { action: 'reopen', submissionId });
          expect(again.status === 409, `a draft was reopened a second time: ${told(again)}`);
          const revised = await work('learner', { action: 'save_draft', assignmentId: id.assignment, learnerProfileId: id.learnerProfile, bodyText: 'Contract revised' });
          const resubmitted = revised.status === 200 ? await work('learner', { action: 'submit', submissionId }) : revised;
          expect(resubmitted.status === 200, `the revised work could not be handed in: ${told(resubmitted)}`);
          handed = await handIns();
          expect(handed.length === 1 && handed[0].status === 'submitted' && handed[0].body_text === 'Contract revised' && handed[0].revision_number === 2, `the revision was not handed in as version 2: ${JSON.stringify(handed)}`);
          const kept = await db.query('select revision_number, body_text, score_earned, feedback from public.assignment_submission_revisions where submission_id = $1', [submissionId]);
          expect(kept.rowCount === 1 && kept.rows[0].body_text === 'Contract answer' && Number(kept.rows[0].score_earned) === 8 && kept.rows[0].feedback === 'Contract feedback', `the marked version was not kept as it was marked: ${JSON.stringify(kept.rows)}`);
        }
      }
      publish('Contract walk', [
        `${server}; ${pages.length} page loads, ${forwarded} requests forwarded to the request server, ${refusals.length} refused; ${switched.rowCount} switches turned on for the later passes.`,
        ...['anonymous', 'learner', 'learner, all switches on', 'teacher, all switches on', 'owner, all switches on'].map((pass) => {
          const mine = pages.filter((p) => p.pass === pass); const by = {};
          for (const p of mine) by[p.status] = (by[p.status] ?? 0) + 1;
          return `${pass}: ${mine.length} pages — ${Object.entries(by).map(([status, n]) => `${n}×${status}`).join(', ')}`;
        }),
        // A page that says "not found" is not a failure, but it should be one somebody expected.
        ...[...new Set(pages.filter((p) => p.status === 404).map((p) => `not found: ${p.route.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>')} (${p.pass})`))],
      ]);
    } finally { await db.end(); }

    // One line for each different refusal, with the pages that met it.
    const grouped = new Map();
    for (const r of refusals) {
      const key = `${r.kind} | ${r.status} ${r.code} | ${r.role} ${r.method} ${r.path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>')} | ${r.message}${r.hint ? ` (${r.hint})` : ''}`;
      const entry = grouped.get(key) ?? { kind: r.kind, where: new Set() }; entry.where.add(`${r.pass}: ${r.route.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>')}`); grouped.set(key, entry);
    }
    const lines = (kind) => [...grouped].filter(([, v]) => v.kind === kind).map(([key, v]) => `${key}\n    at ${[...v.where].slice(0, 6).join('; ')}${v.where.size > 6 ? `; and ${v.where.size - 6} more` : ''}`);
    for (const kind of ['malformed', 'server error', 'other']) {
      const found = lines(kind);
      if (found.length) { publish(`Refused: ${kind}`, found, 'error'); failures.push(`${found.length} different request(s) refused as ${kind}`); }
    }
    for (const kind of ['not allowed', 'refused by a rule', 'no row']) {
      const found = lines(kind);
      if (found.length) publish(`Refused, reported only: ${kind}`, found, 'warning');
    }
    const broken = pages.filter((p) => p.status === 0 || p.status >= 500);
    if (broken.length) publish('Pages that failed', broken.map((p) => `${p.pass} ${p.route} -> ${p.status} (${p.refused} refused requests)`), 'error');
    if (failures.length) {
      publish('Next log, last lines', logs.split('\n').filter((line) => /⨯|Error|error/.test(line)).slice(-40).map((line) => line.slice(0, 300)));
      publish('Contract failed', failures, 'error');
      process.exitCode = 1;
      return;
    }
    console.log(`PostgREST contract passed: ${pages.length} page loads as an anonymous visitor, a learner, a teacher and an owner against ${server} and a migrated PostgreSQL, no request refused as malformed and no page failing. The sign-in server was a stand-in; not hosted Supabase, not Supabase's default grants, fabricated rows.`);
  } finally {
    try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already gone */ }
    if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
    gateway.closeAllConnections?.(); await new Promise((r) => gateway.close(r));
  }
}
