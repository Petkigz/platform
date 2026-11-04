// The deployment runbook, executed.
//
// `docs/deploy/README.md` tells somebody how to bring this platform up: apply the
// migrations, grant the first owner role, deploy, connect storage, email and
// sign-in. Prose about SQL rots silently — a column is renamed, a function's
// guard changes, and the instruction keeps looking authoritative while it no
// longer works.
//
// So the two pieces of SQL a person actually pastes are tested here:
//
//   1. `docs/deploy/verify.sql`, run verbatim. It is what tells an operator
//      whether the schema landed, and it has to work against the schema it ships
//      with.
//   2. The bootstrap block from step 3, extracted from the markdown and run as
//      written — including the refusal when the `set` line is missing, because the
//      reason that line exists is a rule about power, not a formality.
//
// Nothing here asserts a table *count*: migrations add tables, and a test that
// pins 153 would fail for being right. The shape is pinned, and the two numbers
// that mean "nobody can run this yet" are computed rather than guessed.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const docs = join(here, '..', '..', 'docs', 'deploy');

export async function run(ctx) {
  const { q, test, assert, newUser } = ctx;

  const verifySql = readFileSync(join(docs, 'verify.sql'), 'utf8');
  const runbook = readFileSync(join(docs, 'README.md'), 'utf8');

  /** The probe's 12 rows, newest call — the last statement in the file. */
  async function probe() {
    const results = await ctx.db.exec(verifySql);
    return results[results.length - 1].rows;
  }

  const valueOf = (rows, fact) => rows.find((row) => row.fact === fact)?.value;
  const number = (rows, fact) => Number(valueOf(rows, fact));

  // -------------------------------------------------------------------------
  // The probe
  // -------------------------------------------------------------------------

  await test('every command the runbook tells an operator to run exists', async () => {
    // A runbook is executed by a person at the worst possible moment, so a
    // command it names has to exist in package.json. This one was added with the
    // preflight: the step that says `npm run preflight` is the first thing in the
    // document, and a renamed script would make the first instruction fail.
    const pkg = JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf8'));
    const declared = new Set(Object.keys(pkg.scripts ?? {}));
    const commands = new Set(
      [...runbook.matchAll(/npm run ([a-z:]+)/g)].map((m) => m[1]).filter(Boolean),
    );
    assert(commands.size > 0, 'the runbook names no npm script at all');
    const missing = [...commands].filter((c) => !declared.has(c));
    assert(missing.length === 0, `the runbook names scripts that do not exist: ${missing.join(', ')}`);

    // The Done checklist has to mention it, or the last page of the document
    // describes a finished deployment that would fail its own first check.
    assert(/npm run preflight/.test(runbook), 'the runbook never tells anybody to run the preflight');
  });

  await test('the probe runs, and answers in one statement', async () => {
    const results = await ctx.db.exec(verifySql);
    assert(results.length === 1,
      `docs/deploy/verify.sql must be one statement so the SQL editor shows one result; got ${results.length}`);
    const rows = results[0].rows;
    assert(rows.length === 12, `expected 12 facts, got ${rows.length}`);
  });

  await test('every fact has a number or a verdict, and a sentence in plain English', async () => {
    for (const row of await probe()) {
      assert(typeof row.fact === 'string' && row.fact.length > 0, 'a fact with no name');
      assert(/^(\d+|present|MISSING)$/.test(String(row.value)),
        `'${row.fact}' answered '${row.value}', which is neither a count nor present/MISSING`);
      // The sentence is the point: a number without one is a number somebody has
      // to already understand to use.
      assert(String(row.means).length > 20, `'${row.fact}' has no explanation`);
      assert(!/supabase|postgres|sql/gi.test(String(row.means)),
        `'${row.fact}' explains itself in machinery words: ${row.means}`);
    }
  });

  await test('the probe answers the questions a deployment actually has', async () => {
    const rows = await probe();
    assert(valueOf(rows, 'signup trigger') === 'present',
      'the trigger that creates a profile on sign-up is not attached: a new account could not be given a role');
    assert(number(rows, 'roles') === 10, `the role vocabulary is ${valueOf(rows, 'roles')}`);
    // A floor, not a count: the exact split is asserted in `setting_authority`,
    // and this only has to catch a table that came up empty or half-seeded. It is
    // lowered when rows are retired, which is a decision recorded in DECISIONS.md
    // rather than a number that drifted.
    assert(number(rows, 'settings') > 90, 'the flag register did not seed');
    assert(number(rows, 'tables') > 100, 'the schema is not here');
    assert(number(rows, 'policies') > 100, 'the schema is here without row level security');
  });

  await test('every fact the probe prints is explained in the runbook', async () => {
    // The other direction of the same coupling: a row nobody documented is a row
    // an operator will read and not know what to do about.
    for (const row of await probe()) {
      assert(runbook.includes(row.fact),
        `verify.sql reports '${row.fact}' and docs/deploy/README.md never mentions it`);
    }
  });

  await test('the runbook says what the two alarming numbers mean', async () => {
    // `staff = 0` and `features on = 0` are the two that look like a broken
    // deployment and are in fact the intended state. Both are spelled out.
    assert(/staff = 0/.test(runbook), 'the runbook does not say that staff = 0 is the state to watch');
    assert(/features on`? \| \*\*0\*\*/.test(runbook),
      'the runbook does not say that every feature shipping off is deliberate');
  });

  // -------------------------------------------------------------------------
  // The bootstrap, exactly as written
  // -------------------------------------------------------------------------

  /** The block from step 3: the only `sql` fence that sets the bootstrap flag. */
  function bootstrapBlock() {
    const blocks = [...runbook.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]);
    const block = blocks.find((b) => b.includes("app.bootstrap_privileged_roles"));
    assert(block, 'docs/deploy/README.md has no SQL block that sets app.bootstrap_privileged_roles');
    assert(/'you@example\.com'/.test(block),
      'the bootstrap block must carry the placeholder the runbook tells the reader to replace');
    return block;
  }

  // Unique per run: every suite shares one database, so a fixed address is an
  // address some other suite may already have used — which is exactly how this
  // test failed the first time it ran inside the full suite instead of alone.
  const token = globalThis.crypto.randomUUID().slice(0, 8);
  const OWNER = `runbook-owner-${token}@example.com`;
  const STRANGER = `runbook-stranger-${token}@example.com`;
  const NOBODY = `runbook-nobody-${token}@example.com`;
  const ownerId = await newUser(OWNER);
  const strangerId = await newUser(STRANGER);

  // The session setting is what the block turns on; make sure it is off first, so
  // a previous call in this process cannot make the refusal test pass by accident.
  await ctx.exec("set app.bootstrap_privileged_roles = '';");

  // -------------------------------------------------------------------------
  // The one gap the runbook keeps rather than closes
  // -------------------------------------------------------------------------

  await test('the runbook says plainly that the room behind live classes is not connected', async () => {
    // The owner's decision (2026-11-02) was to leave the live room as a documented
    // gap rather than pin a host: keep the setting, keep the explanation, and do not
    // claim classes work end to end. A gap is only honest while it is written down,
    // so the prose is held here beside the behaviour it describes.
    // Flattened first: the prose wraps, and a phrase that a hard line break happens
    // to split is still the sentence a reader reads.
    const flat = runbook.replace(/\s+/g, ' ');
    for (const phrase of [
      '`delivery.live_room_base` ships **empty**',
      'no_room_host',
      'must not be claimed',
      'one minute of audio or video',
      'arrival through this platform',
      'no room behind the door',
    ]) {
      assert(flat.includes(phrase),
        `the runbook no longer says: ${phrase}`);
    }

    // …and the switch really does ship empty, and joining really does refuse with
    // the sentence the runbook quotes. If either moves, the document is wrong.
    const base = (await q(
      `select coalesce(value_text, '') v from public.platform_settings
        where key = 'delivery.live_room_base'`)).rows[0];
    assert((base.v ?? '') === '', `live_room_base ships as ${JSON.stringify(base.v)}`);

    const joinSrc = (await q(
      `select pg_get_functiondef('public.join_live_session(uuid,uuid)'::regprocedure) as src`))
      .rows[0].src;
    assert(/'no_room_host'/.test(joinSrc),
      'join_live_session no longer answers no_room_host when there is no host');
  });

  await test('without the setting, the bootstrap insert is refused', async () => {
    // This is the test that justifies the `set` line rather than merely describing
    // it: a role that can appoint itself is not a role.
    const block = bootstrapBlock().replace(/'you@example\.com'/g, `'${STRANGER}'`);
    const insertOnly = block
      .split('\n')
      .filter((line) => !/^\s*set\s+app\.bootstrap_privileged_roles/i.test(line))
      .join('\n');

    let message = '';
    try {
      await ctx.exec(insertOnly);
    } catch (e) {
      message = String(e?.message ?? e);
    }
    assert(/privileged role requires an explicit assigner/i.test(message),
      `expected the assigner rule, got: ${message || 'no error at all'}`);
  });

  await test('the bootstrap block grants exactly one platform_admin, and says so', async () => {
    const before = number(await probe(), 'staff');
    const block = bootstrapBlock().replace(/'you@example\.com'/g, `'${OWNER}'`);
    await ctx.exec(block);

    assert(await q('select public.is_privileged($1) as p', [ownerId]).then((r) => r.rows[0].p),
      'the address in the block is privileged afterwards');
    assert(number(await probe(), 'staff') === before + 1,
      'staff did not go up by exactly one');

    const rows = (await q(
      `select a.assigned_by, r.code
         from public.user_role_assignments a
         join public.roles r on r.id = a.role_id
        where a.user_id = $1 and a.revoked_at is null`, [ownerId])).rows;
    assert(rows.length === 1, `expected one active role, got ${rows.length}`);
    assert(rows[0].code === 'platform_admin', `expected platform_admin, got ${rows[0].code}`);
    assert(rows[0].assigned_by === null,
      'the first owner has no assigner: that is what the bootstrap setting is for');
  });

  await test('running it a second time changes nothing', async () => {
    // Somebody will re-run it after a `INSERT 0 0` they did not read, or after a
    // deployment they were not sure about. It must be safe.
    const before = number(await probe(), 'staff');
    await ctx.exec(bootstrapBlock().replace(/'you@example\.com'/g, `'${OWNER}'`));
    assert(number(await probe(), 'staff') === before, 'a second run granted a second role');
  });

  await test('a bootstrap for an address that does not exist grants nothing, silently', async () => {
    // The block is a select-insert; a typo in the address yields `INSERT 0 0`.
    // Failing loudly would be worse here — it would leave the reader not knowing
    // whether the schema or the address was wrong.
    assert(await q('select count(*)::int as n from auth.users where email = $1', [NOBODY])
      .then((r) => r.rows[0].n === 0), 'the premise failed: that address exists');
    const before = number(await probe(), 'staff');
    await ctx.exec(bootstrapBlock().replace(/'you@example\.com'/g, `'${NOBODY}'`));
    assert(number(await probe(), 'staff') === before, 'a role was granted to nobody');
  });

  await test('the setting leaks nowhere: a later privileged grant without a reason is still refused', async () => {
    // Once the block has run, `app.bootstrap_privileged_roles` is still `on` in the
    // session that ran it — which is why the runbook says to run it in the SQL
    // editor, not through the app. What must not happen is a *second* person being
    // grantable that way by the ordinary path: `assign_role()` still needs an actor
    // and a reason.
    await ctx.exec("set app.bootstrap_privileged_roles = '';");
    let message = '';
    try {
      await q('select public.assign_role($1,$2,$3)', [strangerId, 'platform_admin', '']);
    } catch (e) {
      message = String(e?.message ?? e);
    }
    assert(/sign in to assign a role/i.test(message),
      `the ordinary path must still need a signed-in person, got: ${message || 'no error'}`);
  });
  await test('the documented safeguarding setup binds the exact owner', async () => {
    const blocks = [...runbook.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]);
    const block = blocks.find((b) => b.includes('bootstrap_safeguarding_owner'));
    assert(block && block.includes("'you@example.com'"), 'safeguarding owner bootstrap block is missing');
    await q('begin');
    try {
      await q('delete from public.safeguarding_owner');
      const result = await ctx.db.exec(block.replace(/'you@example\.com'/g, `'${OWNER}'`));
      assert(result[result.length - 1].rows.length === 1, 'bootstrap did not return one row');
      const owner = (await q('select owner_user_id from public.safeguarding_owner')).rows[0];
      assert(owner.owner_user_id === ownerId, 'wrong safeguarding owner was configured');
      const audit = (await q(`select count(*)::int as n from public.governance_audit_events
        where action='safeguarding.owner_bootstrapped' and target_id=$1`, [ownerId])).rows[0];
      assert(audit.n === 1, 'safeguarding bootstrap was not audited');
    } finally { await q('rollback'); }
  });

  await test('the documented refund-owner setup binds the exact account and audits it', async () => {
    const blocks = [...runbook.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]);
    const block = blocks.find((b) => b.includes('bootstrap_refund_approval_owner'));
    assert(block && block.includes("'you@example.com'"), 'refund owner bootstrap block is missing');
    await q('begin');
    try {
      await q('delete from public.refund_approval_owner');
      const result = await ctx.db.exec(block.replace(/'you@example\.com'/g, `'${OWNER}'`));
      assert(result[result.length - 1].rows.length === 1, 'bootstrap did not return exactly one row');
      const owner = (await q('select owner_user_id from public.refund_approval_owner')).rows[0];
      assert(owner.owner_user_id === ownerId, 'wrong account was configured');
      const audit = (await q(`select count(*)::int as n from public.governance_audit_events
        where action='refund.owner_bootstrapped' and target_id=$1`, [ownerId])).rows[0];
      assert(audit.n === 1, 'bootstrap was not audited');
    } finally {
      await q('rollback');
    }
  });

}
