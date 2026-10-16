// The feature-flag register.
//
// The invariant that matters: a CODE-gated flag cannot be turned on at
// runtime. That rule exists because the whole architecture is "build it all,
// enable it later from the admin dashboard" — and some of those features need
// a deploy, a provider, or a policy document first. If the dashboard could
// flip them, the promise would be a lie and the feature would break in front
// of a user.
//
// It is enforced by a trigger rather than by the UI hiding the control,
// because a UI that hides something is not a control.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, grantRole, bootstrapAdmin,
  } = ctx;

  const admin = await bootstrapAdmin('flag-admin@example.com');
  const staffId = await newUser('flag-governance@example.com');
  await newProfile(staffId, 'Governance Admin');
  await committed(async () => {
    await grantRole(staffId, 'governance_admin', admin);
  });

  const nobody = await newUser('flag-nobody@example.com');
  await newProfile(nobody, 'Nobody');

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  // -------------------------------------------------------------------
  // The seed
  // -------------------------------------------------------------------
  await test('the whole register is seeded, with a gate type on every flag', async () => {
    const total = await count(`select 1 from public.platform_settings`);
    assert(total >= 86, `expected at least 86 flags, found ${total}`);

    // platform_settings is a generic settings table: governance.panel_required
    // and governance.min_approvals live here too and are not feature flags.
    // flag_group is what marks a seeded flag, so that is the population to
    // assert over.
    const flags = await count(
      `select 1 from public.platform_settings where flag_group is not null`);
    assert(flags >= 86, `expected at least 86 seeded flags, found ${flags}`);

    const untyped = await count(
      `select 1 from public.platform_settings
        where flag_group is not null and gate_type is null`);
    assert(untyped === 0, `${untyped} flag(s) have no gate type`);

    const blank = await count(
      `select 1 from public.platform_settings
        where flag_group is not null and length(btrim(description)) = 0`);
    assert(blank === 0, `${blank} flag(s) have no description`);
  });

  await test('every flag group is populated', async () => {
    const groups = (await q(
      `select flag_group g, count(*)::int n from public.platform_settings
        group by flag_group order by flag_group`)).rows;

    const named = groups.filter((r) => r.g);
    assert(named.length >= 6, `expected at least 6 groups, found ${named.length}`);
    for (const g of named) {
      assert(g.n > 0, `group '${g.g}' is empty`);
    }
  });

  await test('everything ships off', async () => {
    // The architecture promise: built to completion, enabled later. A flag
    // found on at seed time means something was released by accident.
    const on = await count(
      `select 1 from public.platform_settings where value_text = 'true'`);
    // governance.panel_required and any other pre-existing setting may be on;
    // the 86 feature flags must not be.
    const featureOn = await count(
      `select 1 from public.platform_settings
        where value_text = 'true' and gate_type is not null`);
    assert(featureOn === 0, `${featureOn} feature flag(s) shipped enabled`);
    void on;
  });

  await test('the register has one row per key', async () => {
    // key is the primary key, so this cannot fail — but FLAGS.md held two
    // duplicate keys before they were merged, and the seed would have silently
    // collapsed them. Assert the merge actually happened.
    const keys = await count(`select key from public.platform_settings`);
    const distinct = await count(`select distinct key from public.platform_settings`);
    assert(keys === distinct, `${keys} rows but ${distinct} distinct keys`);

    for (const k of ['learning.wishlist', 'teaching.applications']) {
      const n = await count(`select 1 from public.platform_settings where key = $1`, [k]);
      assert(n === 1, `'${k}' has ${n} rows; the duplicate should have been merged`);
      const pre = (await q(
        'select preconditions p from public.platform_settings where key = $1', [k])).rows[0].p;
      assert(pre && pre.length > 10,
        `'${k}' lost its preconditions in the merge`);
    }
  });

  // -------------------------------------------------------------------
  // The gate
  // -------------------------------------------------------------------
  await test('a CODE-gated flag cannot be enabled at runtime', async () => {
    const key = (await q(
      `select key from public.platform_settings where gate_type = 'code' limit 1`)).rows[0].key;

    await rejects(() => q(
      `update public.platform_settings set value_text = 'true' where key = $1`, [key]),
      'a CODE-gated flag was enabled through the ordinary path');

    const still = (await q(
      'select value_text v from public.platform_settings where key = $1', [key])).rows[0].v;
    assert(still === 'false', `the CODE flag is now '${still}'`);
  });

  await test('inserting a CODE flag already enabled is refused too', async () => {
    await rejects(() => q(
      `insert into public.platform_settings (key, description, value_type, value_text, gate_type)
       values ('test.code_probe', 'Probe', 'boolean', 'true', 'code')`),
      'a CODE flag was inserted enabled');
  });

  await test('a deploy can still enable one, via the bypass', async () => {
    const key = (await q(
      `select key from public.platform_settings where gate_type = 'code' limit 1`)).rows[0].key;

    await committed(async () => {
      await q(`set local app.bypassing_code_flag = 'on'`);
      await q(`update public.platform_settings set value_text = 'true' where key = $1`, [key]);
    });

    const now = (await q(
      'select value_text v from public.platform_settings where key = $1', [key])).rows[0].v;
    assert(now === 'true', 'the bypass did not let a migration enable the flag');

    // Put it back, so the "everything ships off" invariant holds for reruns.
    await q(`update public.platform_settings set value_text = 'false' where key = $1`, [key]);
  });

  await test('an ADMIN flag can be flipped, and setting_bool follows', async () => {
    const key = (await q(
      `select key from public.platform_settings where gate_type = 'admin' limit 1`)).rows[0].key;

    await q(`update public.platform_settings set value_text = 'true' where key = $1`, [key]);
    let v = (await q('select public.setting_bool($1, false) v', [key])).rows[0].v;
    assert(v === true, `setting_bool returned ${v} after enabling '${key}'`);

    await q(`update public.platform_settings set value_text = 'false' where key = $1`, [key]);
    v = (await q('select public.setting_bool($1, false) v', [key])).rows[0].v;
    assert(v === false, `setting_bool returned ${v} after disabling '${key}'`);
  });

  await test('a value that does not match its declared type is refused', async () => {
    await rejects(() => q(
      `insert into public.platform_settings (key, description, value_type, value_text)
       values ('test.bad_bool', 'Probe', 'boolean', 'yes')`),
      "a boolean setting accepted 'yes'");

    await rejects(() => q(
      `insert into public.platform_settings (key, description, value_type, value_text)
       values ('test.bad_int', 'Probe', 'integer', 'twelve')`),
      "an integer setting accepted 'twelve'");
  });

  // -------------------------------------------------------------------
  // Who may touch it
  // -------------------------------------------------------------------
  await test('an ordinary user can neither read nor write the register', async () => {
    await asUser(nobody, async () => {
      const seen = await count(`select 1 from public.platform_settings`);
      assert(seen === 0, `an ordinary user read ${seen} flags`);
    });

    await asUser(nobody, async () => {
      const before = await count(
        `select 1 from public.platform_settings where value_text = 'true'`);
      await q(`update public.platform_settings set value_text = 'true'`);
      const after = await count(
        `select 1 from public.platform_settings where value_text = 'true'`);
      assert(before === after,
        `an ordinary user enabled ${after - before} flag(s)`);
    });
  });

  await test('a non-platform privileged role can read and write', async () => {
    // governance_admin is privileged but not platform_admin. The register is
    // staff-readable, not admin-only — the dashboard is for whoever runs the
    // platform day to day.
    await asUser(staffId, async () => {
      const seen = await count(`select 1 from public.platform_settings`);
      assert(seen >= 86, `a governance admin read only ${seen} flags`);

      const key = (await q(
        `select key from public.platform_settings where gate_type = 'admin' limit 1`)).rows[0].key;
      await q(`update public.platform_settings set value_text = 'true' where key = $1`, [key]);
      const v = (await q(
        'select value_text v from public.platform_settings where key = $1', [key])).rows[0].v;
      assert(v === 'true', 'a governance admin could not enable an admin flag');

      await q(`update public.platform_settings set value_text = 'false' where key = $1`, [key]);
    });
  });

  await test('setting_bool stays readable by everyone', async () => {
    // The app gates features for ordinary users too, so the accessor has to
    // work even though the table is not readable. This is why there is a
    // SECURITY DEFINER function rather than a plain select.
    await asUser(nobody, async () => {
      const v = await q(`select public.setting_bool('learning.progress', true) v`);
      assert(v.rows[0].v === false,
        'setting_bool leaked the register or returned the wrong default');
    });
  });
}
