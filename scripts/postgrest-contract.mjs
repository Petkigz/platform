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

if (mode === 'prepare') await prepare();
else if (mode === 'run') await run();
else throw new Error('Say "prepare" or "run".');

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

    const id = Object.fromEntries(['learner', 'teacher', 'owner', 'stranger', 'learnerProfile', 'course', 'version', 'section', 'lesson', 'secondLesson', 'resource', 'enrolment', 'assessment', 'assignment'].map((name) => [name, randomUUID()]));
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
    await db.query("insert into public.assessments (id, course_version_id, title, type, status) values ($1, $2, 'Contract quiz', 'practice', 'active')", [id.assessment, id.version]);
    await db.query("insert into public.course_assignments (id, course_id, course_version_id, title, status, created_by) values ($1, $2, $3, 'Contract assignment', 'open', $4)", [id.assignment, id.course, id.version, id.teacher]);
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
  if (/^PGRST[12]\d\d$/.test(code) || /^(22|42)/.test(code) || code === '08P01' || status === 400 || status === 404) return 'malformed';
  if (/^(23|P0|AS|[A-Z]{2}\d{3})/.test(code) || status === 409) return 'refused by a rule';
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
        assert.ok((await body('/learn')).includes('Contract course'), 'the learner’s dashboard does not show their course');
        assert.ok((await body(`/learn/${id.enrolment}`)).includes('Contract lesson'), 'the course page does not show its lessons');
        const lesson = await body(`/learn/${id.enrolment}/lesson/${id.lesson}`);
        assert.ok(lesson.includes('Fabricated reading text.') && lesson.includes('Contract video'), 'the lesson page does not show the lesson and its video');
      }
      publish('Contract walk', [
        `${server}; ${pages.length} page loads, ${forwarded} requests forwarded to the request server, ${refusals.length} refused; ${switched.rowCount} switches turned on for the later passes.`,
        ...['anonymous', 'learner', 'learner, all switches on', 'teacher, all switches on', 'owner, all switches on'].map((pass) => {
          const mine = pages.filter((p) => p.pass === pass); const by = {};
          for (const p of mine) by[p.status] = (by[p.status] ?? 0) + 1;
          return `${pass}: ${mine.length} pages — ${Object.entries(by).map(([status, n]) => `${n}×${status}`).join(', ')}`;
        }),
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
      publish('Next log, last lines', logs.split('\n').filter((line) => /⨯|Error|error/.test(line)).slice(-40));
      throw new Error(`PostgREST contract failed:\n${failures.join('\n')}`);
    }
    console.log(`PostgREST contract passed: ${pages.length} page loads as an anonymous visitor, a learner, a teacher and an owner against ${server} and a migrated PostgreSQL, no request refused as malformed and no page failing. The sign-in server was a stand-in; not hosted Supabase, not Supabase's default grants, fabricated rows.`);
  } finally {
    try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already gone */ }
    if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
    gateway.closeAllConnections?.(); await new Promise((r) => gateway.close(r));
  }
}
