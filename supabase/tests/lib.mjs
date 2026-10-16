// Shared test harness for the migration suites.
//
// Runs the real migration files against a real PostgreSQL engine (PGlite —
// Postgres compiled to WASM) so constraints, triggers and row level security
// are actually exercised rather than merely parsed.
//
// API note that costs a run to rediscover:
//   db.exec(sql)        simple query protocol — multiple statements, NO parameters
//   db.query(sql, args) extended protocol    — ONE statement, parameters allowed
// Migrations and the harness go through exec(); parameterised fixtures use q().

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

const short = (e) => String(e?.message ?? e).split('\n')[0];

export async function createHarness() {
  const db = new PGlite();
  const exec = (sql) => db.exec(sql);
  const q = (sql, params = []) => db.query(sql, params);

  console.log('\nApplying harness + migrations');
  try {
    await exec(readFileSync(join(here, 'harness.sql'), 'utf8'));
  } catch (e) {
    console.error(`\n  HARNESS FAILED: ${short(e)}\n`);
    process.exit(1);
  }

  // Pre-flight lint for the mistakes that otherwise surface as an opaque
  // PostgreSQL parse error with no line number. Cheap, and this one has
  // bitten repeatedly.
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const lintProblems = [];
  for (const f of files) {
    const lines = readFileSync(join(migrationsDir, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      // A message literal ending in a quote followed by a comma, with USING
      // on the next line: RAISE was given no parameters.
      if (/',\s*$/.test(line.trimEnd()) && /^\s*using errcode/.test(lines[i + 1] ?? '')) {
        lintProblems.push(`${f}:${i + 1} — trailing comma before USING (RAISE has no parameters)`);
      }
    });
  }
  if (lintProblems.length) {
    console.error('\n  SQL LINT:');
    for (const p of lintProblems) console.error(`    ${p}`);
    process.exit(1);
  }

  for (const f of files) {
    try {
      await exec(readFileSync(join(migrationsDir, f), 'utf8'));
      console.log(`  applied ${f}`);
    } catch (e) {
      console.error(`\n  MIGRATION FAILED: ${f}\n  ${short(e)}\n`);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------
  // assertions
  // -------------------------------------------------------------------
  let passed = 0;
  const failures = [];

  const ok = (name) => { passed++; console.log(`  \u2713 ${name}`); };
  const fail = (name, err) => {
    failures.push({ name, err: short(err) });
    console.log(`  \u2717 ${name}\n      ${short(err)}`);
  };
  async function test(name, fn) {
    try { await fn(); ok(name); } catch (e) { fail(name, e); }
  }
  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
  /**
   * Assert that fn throws — and, when a pattern is given, that it throws for
   * the reason claimed.
   *
   * This used to ignore the pattern entirely: `catch { return; }` swallowed
   * whatever the error was and used `msg` only as the failure text. Every
   * rejects(fn, /regex/) in the suite was therefore asserting only that
   * *something* threw. A test that expected "you cannot decide a refund you
   * requested yourself" passed just as happily on "refund request not found",
   * so neutering the protection it was supposed to guard changed nothing.
   *
   * A rejection for the wrong reason is not a pass.
   */
  async function rejects(fn, msg) {
    try {
      await fn();
    } catch (e) {
      if (msg instanceof RegExp) {
        const text = String(e && e.message ? e.message : e);
        if (!msg.test(text)) {
          throw new Error(
            `rejected, but not for the reason asserted: expected ${msg}, ` +
            `got: ${text.slice(0, 220)}`);
        }
      }
      return;
    }
    throw new Error(
      msg
        ? `expected the statement to be rejected (matching ${msg})`
        : 'expected the statement to be rejected');
  }

  // -------------------------------------------------------------------
  // transactions and roles
  // -------------------------------------------------------------------
  async function asSuperuser(fn) {
    await q('begin');
    try { return await fn(); } finally { await q('rollback'); }
  }

  // Same, but commits — for rows later tests must see.
  async function committed(fn) {
    await q('begin');
    try { const r = await fn(); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  // Runs fn as the `authenticated` role with a JWT subject, in a transaction
  // so both the role and the claims stay local.
  async function asUser(userId, fn) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: userId })]);
    await q('set local role authenticated');
    try { return await fn(); } finally { await q('rollback'); }
  }

  async function asAnon(fn) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    try { return await fn(); } finally { await q('rollback'); }
  }

  // -------------------------------------------------------------------
  // fixtures
  // -------------------------------------------------------------------
  async function newUser(email) {
    const id = crypto.randomUUID();
    await q('insert into auth.users (id, email) values ($1, $2)', [id, email]);
    return id;
  }

  async function newProfile(userId, name = 'Test User') {
    // Upsert, not insert. handle_new_user() now creates the profile row when
    // the auth.users row is created, so a plain insert here would collide on
    // user_profiles_pkey. The upsert keeps this helper meaning "this user has a
    // profile with this name", which is what every caller actually wants.
    await q(
      `insert into public.user_profiles (user_id, display_name, country_code, timezone)
       values ($1, $2, 'UG', 'Africa/Kampala')
       on conflict (user_id) do update
         set display_name = excluded.display_name,
             country_code = excluded.country_code,
             timezone     = excluded.timezone`, [userId, name]);
    return userId;
  }

  async function grantRole(userId, code, assignedBy) {
    const r = await q('select id from public.roles where code = $1', [code]);
    await q(
      `insert into public.user_role_assignments (user_id, role_id, assigned_by)
       values ($1, $2, $3)`, [userId, r.rows[0].id, assignedBy ?? null]);
  }

  async function bootstrapAdmin(email) {
    const id = await newUser(email);
    await newProfile(id);
    await committed(async () => {
      await q(`set local app.bootstrap_privileged_roles = 'on'`);
      await grantRole(id, 'platform_admin', id);
    });
    const n = (await q(
      `select count(*)::int n from public.user_role_assignments ura
         join public.roles r on r.id = ura.role_id
        where ura.user_id = $1 and r.code = 'platform_admin' and ura.revoked_at is null`,
      [id])).rows[0].n;
    if (n !== 1) throw new Error('bootstrap did not persist a platform_admin role');
    return id;
  }

  async function newInstructor(email, assignedBy) {
    const id = await newUser(email);
    await newProfile(id);
    await committed(() => grantRole(id, 'instructor', assignedBy));
    return id;
  }

  async function newReviewer(email, assignedBy) {
    const id = await newUser(email);
    await newProfile(id);
    await committed(() => grantRole(id, 'reviewer', assignedBy));
    return id;
  }

  // -------------------------------------------------------------------
  // Governance fixtures
  //
  // Group 3 added a publication gate: a version needs a scholarly approval
  // before it can be published. These helpers satisfy it so the earlier
  // suites test publishing rather than accidentally testing the gate.
  // -------------------------------------------------------------------
  async function ensureReviewerProfile(userId, verifiedBy) {
    const existing = await q('select id from public.reviewer_profiles where user_id = $1', [userId]);
    if (existing.rows.length) return existing.rows[0].id;
    const r = await q(
      `insert into public.reviewer_profiles
         (user_id, reviewer_status, verified_at, verified_by)
       values ($1, 'active', now(), $2) returning id`, [userId, verifiedBy ?? userId]);
    return r.rows[0].id;
  }

  // A completed scholarly review by reviewerUserId, assigned by assignedBy.
  async function satisfyReview(versionId, reviewerUserId, assignedBy) {
    const rp = await ensureReviewerProfile(reviewerUserId, assignedBy);
    const a = (await q(
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by,
          assignment_status, accepted_at, completed_at)
       values ($1, $2, 'scholarly', $3, 'completed', now(), now()) returning id`,
      [versionId, rp, assignedBy])).rows[0].id;
    await q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1, $2, 'scholarly', 'approved', 'Reviewed and approved.', $3)`,
      [a, versionId, reviewerUserId]);
    return a;
  }

  // -------------------------------------------------------------------
  // Group 2 fixtures
  // -------------------------------------------------------------------
  async function newCourse(createdBy, over = {}) {
    const slug = over.slug ?? `course-${crypto.randomUUID().slice(0, 8)}`;
    const r = await q(
      `insert into public.courses (slug, title, audience, created_by, status)
       values ($1, $2, $3, $4, $5) returning id`,
      [slug, over.title ?? 'Test Course', over.audience ?? 'both',
       createdBy, over.status ?? 'draft']);
    return r.rows[0].id;
  }

  async function newVersion(courseId, createdBy, over = {}) {
    const r = await q(
      `insert into public.course_versions (course_id, version_number, language, created_by)
       values ($1, $2, $3, $4) returning id`,
      [courseId, over.version_number ?? 1, over.language ?? 'en', createdBy]);
    return r.rows[0].id;
  }

  async function newSection(versionId, over = {}) {
    const r = await q(
      `insert into public.course_sections (course_version_id, title, position)
       values ($1, $2, $3) returning id`,
      [versionId, over.title ?? 'Section', over.position ?? 1]);
    return r.rows[0].id;
  }

  async function newLesson(sectionId, over = {}) {
    const r = await q(
      `insert into public.lessons (section_id, title, position, type, is_preview)
       values ($1, $2, $3, $4, $5) returning id`,
      [sectionId, over.title ?? 'Lesson', over.position ?? 1,
       over.type ?? 'video', over.is_preview ?? false]);
    return r.rows[0].id;
  }

  async function newAsset(uploadedBy, over = {}) {
    const r = await q(
      `insert into public.media_assets
         (storage_backend, master_bucket, master_key, checksum, mime_type,
          byte_size, status, uploaded_by)
       values ('r2', $1, $2, $3, 'video/mp4', 1048576, 'available', $4) returning id`,
      [over.bucket ?? 'masters',
       over.key ?? `${crypto.randomUUID()}.mp4`,
       over.checksum ?? crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 32),
       uploadedBy]);
    return r.rows[0].id;
  }

  const count = async (sql, params = []) => (await q(sql, params)).rows[0].n;

  const summary = () => ({ passed, failures });
  const close = () => db.close();

  return {
    db, exec, q, count,
    test, assert, rejects,
    asSuperuser, asUser, asAnon, committed,
    newUser, newProfile, grantRole, bootstrapAdmin, newInstructor, newReviewer,
    ensureReviewerProfile, satisfyReview,
    newCourse, newVersion, newSection, newLesson, newAsset,
    summary, close,
  };
}

export function report(suites) {
  let passed = 0;
  const failures = [];
  for (const [name, s] of suites) {
    passed += s.passed;
    for (const f of s.failures) failures.push({ ...f, suite: name });
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - [${f.suite}] ${f.name}: ${f.err}`);
    return 1;
  }
  return 0;
}
