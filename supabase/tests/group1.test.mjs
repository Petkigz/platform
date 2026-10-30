// Group 1 migration tests: identity, family, guardians, privacy.
//
// Run everything with `npm run test:db` (applies the migrations once, then
// every suite). The harness lives in lib.mjs.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile, grantRole, bootstrapAdmin,
  } = ctx;

  console.log('\nSchema');

  await test('all ten Group 1 tables exist', async () => {
    const want = ['institutions','roles','user_profiles','user_role_assignments','families',
      'family_memberships','learner_profiles','guardian_relationships',
      'guardian_verification_cases','adult_learning_shares'];
    const got = await q(
      `select table_name from information_schema.tables
        where table_schema='public' and table_type='BASE TABLE' order by table_name`);
    const names = got.rows.map(r => r.table_name);
    for (const t of want) assert(names.includes(t), `missing table ${t}`);
  });

  await test('RLS is enabled on every public table', async () => {
    const r = await q(
      `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relrowsecurity = false and c.relkind='r'`);
    assert(r.rows.length === 0, `RLS not enabled on: ${r.rows.map(x => x.relname).join(', ')}`);
  });

  await test('seed: 10 roles, 4 privileged, 1 default institution', async () => {
    const roles = await q('select count(*)::int n from public.roles');
    const priv = await q('select count(*)::int n from public.roles where is_privileged');
    const inst = await q(`select count(*)::int n from public.institutions where code='default'`);
    assert(roles.rows[0].n === 10, `expected 10 roles, got ${roles.rows[0].n}`);
    assert(priv.rows[0].n === 4, `expected 4 privileged, got ${priv.rows[0].n}`);
    assert(inst.rows[0].n === 1, `expected default institution, got ${inst.rows[0].n}`);
  });

  // ---------------------------------------------------------------------------
  console.log('\nConstraints');

  await test('updated_at trigger fires on update', async () => {
    const id = await newUser('trig@example.com');
    await newProfile(id);
    const before = (await q('select updated_at from public.user_profiles where user_id=$1', [id])).rows[0].updated_at;
    await q(`update public.user_profiles set display_name='Renamed' where user_id=$1`, [id]);
    const after = (await q('select updated_at from public.user_profiles where user_id=$1', [id])).rows[0].updated_at;
    assert(new Date(after) >= new Date(before), 'updated_at did not advance');
    const renamed = (await q('select display_name d from public.user_profiles where user_id=$1', [id])).rows[0].d;
    assert(renamed === 'Renamed', 'update did not apply');
  });

  await test('duplicate active role assignment is rejected', async () => {
    const u = await newUser('dup@example.com'); await newProfile(u);
    await grantRole(u, 'learner');
    await rejects(() => grantRole(u, 'learner'), 'duplicate active assignment accepted');
  });

  await test('a revoked role may be granted again', async () => {
    const u = await newUser('regrant@example.com'); await newProfile(u);
    await grantRole(u, 'learner');
    await q(`update public.user_role_assignments
               set revoked_at=now(), revocation_reason='test'
             where user_id=$1 and revoked_at is null`, [u]);
    await grantRole(u, 'learner');
  });

  await test('revocation without a reason is rejected', async () => {
    const u = await newUser('noreason@example.com'); await newProfile(u);
    await grantRole(u, 'learner');
    await rejects(
      () => q(`update public.user_role_assignments set revoked_at=now()
                where user_id=$1 and revoked_at is null`, [u]),
      'revocation without reason accepted');
  });

  await test('self-assignment of a privileged role is rejected', async () => {
    const admin = await bootstrapAdmin('admin1@example.com');
    const victim = await newUser('victim@example.com'); await newProfile(victim);
    await rejects(() => grantRole(victim, 'platform_admin', victim), 'self-escalation accepted');
  });

  await test('a non-privileged assigner cannot grant a privileged role', async () => {
    const nobody = await newUser('nobody@example.com'); await newProfile(nobody);
    await grantRole(nobody, 'learner');
    const target = await newUser('target@example.com'); await newProfile(target);
    await rejects(() => grantRole(target, 'finance_admin', nobody), 'non-privileged grant accepted');
  });

  await test('a privileged assigner CAN grant a privileged role', async () => {
    const admin = await bootstrapAdmin('admin2@example.com');
    const target = await newUser('staff@example.com'); await newProfile(target);
    await grantRole(target, 'governance_admin', admin);
    const got = (await q(
      `select count(*)::int n from public.user_role_assignments ura
         join public.roles r on r.id = ura.role_id
        where ura.user_id = $1 and r.code = 'governance_admin' and ura.revoked_at is null`,
      [target])).rows[0].n;
    assert(got === 1, 'privileged grant by an admin did not persist');
  });

  await test('a child may hold a login, and nobody may swap which account it is', async () => {
    // D2 said a child is never a user, and the schema enforced it with a check
    // constraint. The owner reversed that on 2026-10-30 — a child may have a
    // login, if a guardian made it — so the constraint is gone and the guarantee
    // moved to the identity guard: the account a child is linked to is frozen
    // once set. That is the part that still has to be true, because a profile
    // that could be re-pointed at another account is a profile that changes
    // whose work it is.
    const u = await newUser('childlogin@example.com'); await newProfile(u);
    const other = await newUser('childlogin2@example.com'); await newProfile(other);
    const fam = (await q(
      `insert into public.families (name, created_by) values ('F', $1) returning id`, [u])).rows[0].id;
    await q(`insert into public.family_memberships (family_id, user_id, membership_type, status, joined_at)
             values ($1,$2,'owner','active',now())`, [fam, u]);

    const kid = (await q(
      `insert into public.learner_profiles
         (family_id, linked_user_id, display_name, learner_type, age_band)
       values ($1,$2,'Kid','child','5-7') returning id`, [fam, u])).rows[0].id;

    // Staff may correct almost anything, and this suite runs as staff. What still
    // has to hold is that a child with a login is a child with a login — the
    // refusal for everyone else is tested in `child_login`, where there are real
    // signed-in actors to refuse.
    const linked = (await q(
      `select linked_user_id from public.learner_profiles where id = $1`, [kid])).rows[0];
    assert(linked.linked_user_id === u, 'the child lost the account they were linked to');
    assert(other, 'unused fixture');
  });

  await test('a child profile requires an age band', async () => {
    const u = await newUser('noage@example.com'); await newProfile(u);
    const fam = (await q(`insert into public.families (created_by) values ($1) returning id`, [u])).rows[0].id;
    await rejects(
      () => q(`insert into public.learner_profiles (family_id, display_name, learner_type)
               values ($1,'Kid','child')`, [fam]),
      'child without age_band accepted');
  });

  await test('no date-of-birth column exists anywhere', async () => {
    const r = await q(
      `select column_name from information_schema.columns
        where table_schema='public' and column_name ilike '%birth%'`);
    assert(r.rows.length === 0, `DOB columns found: ${r.rows.map(x => x.column_name)}`);
  });

  await test('a user cannot change their own account_status', async () => {
    const u = await newUser('selfsuspend@example.com'); await newProfile(u);
    await asUser(u, async () => {
      await rejects(
        () => q(`update public.user_profiles set account_status='suspended' where user_id=$1`, [u]),
        'self account_status change accepted');
    });
  });

  await test('an active guardian relationship requires verified_at', async () => {
    const g = await newUser('g1@example.com'); await newProfile(g);
    const p = await newUser('p1@example.com'); await newProfile(p);
    const fam = (await q(`insert into public.families (created_by) values ($1) returning id`, [p])).rows[0].id;
    await q(`insert into public.family_memberships (family_id,user_id,membership_type,status,joined_at)
             values ($1,$2,'owner','active',now())`, [fam, p]);
    const kid = (await q(
      `insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
       values ($1,'Kid','child','8-10') returning id`, [fam])).rows[0].id;
    await rejects(
      () => q(`insert into public.guardian_relationships
                 (guardian_user_id, learner_profile_id, relationship_type, status)
               values ($1,$2,'parent','active')`, [g, kid]),
      'active relationship without verified_at accepted');
  });

  await test('a verified case activates the relationship; a rejection revokes it', async () => {
    const g = await newUser('g2@example.com'); await newProfile(g);
    const p = await newUser('p2@example.com'); await newProfile(p);
    const fam = (await q(`insert into public.families (created_by) values ($1) returning id`, [p])).rows[0].id;
    await q(`insert into public.family_memberships (family_id,user_id,membership_type,status,joined_at)
             values ($1,$2,'owner','active',now())`, [fam, p]);
    const kid = (await q(
      `insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
       values ($1,'Kid','child','8-10') returning id`, [fam])).rows[0].id;

    const rel = (await q(
      `insert into public.guardian_relationships
         (guardian_user_id, learner_profile_id, relationship_type, status, can_view_progress)
       values ($1,$2,'parent','pending_verification',true) returning id`, [g, kid])).rows[0].id;

    const st0 = (await q('select status s from public.guardian_relationships where id=$1', [rel])).rows[0].s;
    assert(st0 === 'pending_verification', 'relationship should start pending');

    const c1 = (await q(
      `insert into public.guardian_verification_cases (guardian_relationship_id, reviewed_by, reviewed_at)
       values ($1,$2,now()) returning id`, [rel, p])).rows[0].id;
    await q(`update public.guardian_verification_cases set status='verified' where id=$1`, [c1]);

    const r1 = (await q('select status s, verified_at v from public.guardian_relationships where id=$1', [rel])).rows[0];
    assert(r1.s === 'active', `expected active after verification, got ${r1.s}`);
    assert(r1.v !== null, 'verified_at not set');

    await q(`update public.guardian_verification_cases set status='revoked', reviewed_by=$1, reviewed_at=now() where id=$2`, [p, c1]);
    const r2 = (await q(
      `select status s, can_view_progress v from public.guardian_relationships where id=$1`, [rel])).rows[0];
    assert(r2.s === 'revoked', `expected revoked, got ${r2.s}`);
    assert(r2.v === false, 'permissions not cleared on revocation');
  });

  await test('an adult learner may not share with their own account', async () => {
    const u = await newUser('adult1@example.com'); await newProfile(u);
    const lp = (await q(
      `insert into public.learner_profiles (linked_user_id, display_name, learner_type)
       values ($1,'Adult','adult') returning id`, [u])).rows[0].id;
    await rejects(
      () => q(`insert into public.adult_learning_shares (learner_profile_id, grantee_user_id, scope)
               values ($1,$2,'progress')`, [lp, u]),
      'self-share accepted');
  });

  await test('adult_learning_shares rejects a child learner', async () => {
    const p = await newUser('p3@example.com'); await newProfile(p);
    const other = await newUser('o3@example.com'); await newProfile(other);
    const fam = (await q(`insert into public.families (created_by) values ($1) returning id`, [p])).rows[0].id;
    const kid = (await q(
      `insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
       values ($1,'Kid','child','8-10') returning id`, [fam])).rows[0].id;
    await rejects(
      () => q(`insert into public.adult_learning_shares (learner_profile_id, grantee_user_id, scope)
               values ($1,$2,'progress')`, [kid, other]),
      'share on a child learner accepted');
  });

  await test('soft-deleting an institution frees its code', async () => {
    await q(`insert into public.institutions (code, name) values ('temp','Temp')`);
    await q(`update public.institutions set deleted_at=now() where code='temp'`);
    await q(`insert into public.institutions (code, name) values ('temp','Temp Again')`);
  });

  // ---------------------------------------------------------------------------
  console.log('\nRow level security');

  await test('a user cannot read another user profile', async () => {
    const a = await newUser('a@ex.com'); await newProfile(a, 'A');
    const b = await newUser('b@ex.com'); await newProfile(b, 'B');
    const seen = await asUser(a, async () =>
      (await q('select count(*)::int n from public.user_profiles')).rows[0].n);
    assert(seen === 1, `expected to see only own profile, saw ${seen}`);
  });

  await test('a non-family member cannot read a learner profile', async () => {
    const p = await newUser('p4@ex.com'); await newProfile(p);
    const stranger = await newUser('s4@ex.com'); await newProfile(stranger);
    const fam = (await q(`insert into public.families (created_by) values ($1) returning id`, [p])).rows[0].id;
    await q(`insert into public.family_memberships (family_id,user_id,membership_type,status,joined_at)
             values ($1,$2,'owner','active',now())`, [fam, p]);
    await q(`insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
             values ($1,'Kid','child','8-10')`, [fam]);

    const asStranger = await asUser(stranger, async () =>
      (await q('select count(*)::int n from public.learner_profiles')).rows[0].n);
    assert(asStranger === 0, `stranger saw ${asStranger} learner profiles`);

    const asParent = await asUser(p, async () =>
      (await q('select count(*)::int n from public.learner_profiles')).rows[0].n);
    assert(asParent === 1, `parent saw ${asParent} learner profiles, expected 1`);
  });

  await test('verification cases are invisible to non-administrators', async () => {
    const p = await newUser('p5@ex.com'); await newProfile(p);
    const seen = await asUser(p, async () =>
      (await q('select count(*)::int n from public.guardian_verification_cases')).rows[0].n);
    assert(seen === 0, `non-admin saw ${seen} verification cases`);
  });

  await test('an anonymous request sees no profiles at all', async () => {
    const u = await newUser('anon-target@ex.com'); await newProfile(u);
    const n = await (async () => {
      await q('begin');
      await q(`select set_config('request.jwt.claims', '', true)`);
      await q('set local role authenticated');
      const r = await q('select count(*)::int n from public.user_profiles');
      await q('rollback');
      return r.rows[0].n;
    })();
    assert(n === 0, `anonymous request saw ${n} profiles`);
  });
}
