// Which shelf a feature needs, as an owner-editable decision.
//
// `plan_feature_requires_tier()` was a closed CASE with one entry:
// offline_downloads -> plus. The gate was real, but the *decision* lived in a
// migration: changing it needed a developer, while every other plan decision is
// a form on /admin/plans. This suite pins the map, the writer, and the one rule
// that keeps the catalogue from contradicting itself — a feature cannot move up
// to plus while a basic plan is still handing it out.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, newInstructor } = ctx;

  const admin = await bootstrapAdmin('ftr-admin@example.com');
  const stranger = await newUser('ftr-stranger@example.com');
  await newProfile(stranger, 'Stranger');
  let seq = 0;
  const teacher = () => newInstructor(`ftr-teacher-${++seq}@example.com`, admin);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  const requires = (code) =>
    q('select public.plan_feature_requires_tier($1) t', [code]).then((r) => r.rows[0].t);

  const setRule = (who, code, tier) =>
    asActor(who, 'select public.set_feature_tier_requirement($1,$2) r', [code, tier])
      .then((r) => r.rows[0].r);

  const rules = (who) =>
    asActor(who, 'select * from public.plan_feature_tier_rules()').then((r) => r.rows);

  // -------------------------------------------------------------------------
  // The map starts where the code already was
  // -------------------------------------------------------------------------

  await test('offline downloads need plus, as they did before the table existed', async () => {
    assert((await requires('offline_downloads')) === 'plus',
      'the seeded rule does not match the rule that shipped');
  });

  await test('a code nobody has restricted needs only basic', async () => {
    assert((await requires('something_not_sold')) === 'basic',
      'an unknown code was treated as restricted');
  });

  await test('the screen can see every sellable feature with its shelf', async () => {
    const rows = await rules(admin);
    const offline = rows.find((r) => r.feature_code === 'offline_downloads');

    assert(offline, 'the feature vocabulary is missing from the rules reader');
    assert(offline.min_tier === 'plus', `shelf read as ${offline.min_tier}`);
    assert(offline.blocking_plans === null,
      `a basic plan blocks a rule that is already in force: ${offline.blocking_plans}`);
  });

  // -------------------------------------------------------------------------
  // Who may move a feature up or down
  // -------------------------------------------------------------------------

  await test('a learner cannot change which shelf a feature needs', async () => {
    await rejects(() => setRule(stranger, 'offline_downloads', 'basic'),
      /only platform staff/);
  });

  await test('a teacher is not platform staff for this rule', async () => {
    // Hoisted: an `await` inside the arrow handed to rejects() is a syntax
    // error under --experimental-strip-types.
    const someoneWhoTeaches = await teacher();
    await rejects(() => setRule(someoneWhoTeaches, 'offline_downloads', 'basic'),
      /only platform staff/);
  });

  await test('a typo cannot quietly restrict a code no plan carries', async () => {
    await rejects(() => setRule(admin, 'offline_download', 'plus'), /not a feature this platform sells/);
  });

  await test('a shelf that is neither basic nor plus is refused', async () => {
    await rejects(() => setRule(admin, 'offline_downloads', 'platinum'), /a shelf is basic or plus/);
  });

  // -------------------------------------------------------------------------
  // Lowering it makes a Basic plan able to carry the feature
  // -------------------------------------------------------------------------

  const plan = (await asActor(admin, 'select public.create_plan($1,$2,$3,$4) id',
    ['tier-test', 'tier-test', 'Tier test plan', 'basic'])).rows[0].id;
  const version = (await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
    [plan, 1, 1, 'month', 'Terms'])).rows[0].id;

  await test('a basic plan cannot be given downloads while they need plus', async () => {
    await rejects(() => asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')", [version]),
    /plus feature/);
  });

  let entitlementId = null;

  await test('moving the feature down to basic lets the same plan carry it', async () => {
    const result = await setRule(admin, 'offline_downloads', 'basic');
    assert(result.changed === true, 'the change was not reported as a change');
    assert((await requires('offline_downloads')) === 'basic', 'the rule did not move');

    entitlementId = (await asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads') id",
      [version])).rows[0].id;
    assert(entitlementId, 'the entitlement was not created');

    const grant = (await q('select scope_type, feature_code from public.plan_entitlements where id = $1',
      [entitlementId])).rows[0];
    assert(grant.scope_type === 'feature' && grant.feature_code === 'offline_downloads',
      'the entitlement did not record the feature');
  });

  await test('with a basic plan carrying it, the feature cannot be moved back up', async () => {
    await rejects(() => setRule(admin, 'offline_downloads', 'plus'),
      /granted by a basic plan \(tier-test\)/);

    assert((await requires('offline_downloads')) === 'basic',
      'the refused change was written anyway');
  });

  await test('the screen is told which plan is in the way, before the click', async () => {
    const offline = (await rules(admin)).find((r) => r.feature_code === 'offline_downloads');

    assert(offline.min_tier === 'basic', `shelf read as ${offline.min_tier}`);
    assert(offline.blocking_plans === 'tier-test', `blocker read as ${offline.blocking_plans}`);
  });

  await test('once the plan gives the feature up, the rule can move up again', async () => {
    await asActor(admin, 'select public.remove_plan_entitlement($1)', [entitlementId]);

    const result = await setRule(admin, 'offline_downloads', 'plus');
    assert(result.changed === true, 'the raise was not reported as a change');
    assert((await requires('offline_downloads')) === 'plus', 'the rule stayed down');
  });

  await test('setting the shelf it already has is a no-op, not an error', async () => {
    const result = await setRule(admin, 'offline_downloads', 'plus');
    assert(result.changed === false, 'an unchanged rule reported a change');
  });

  await test('the raising of a plan tier is still refused while terms carry a plus feature',
    async () => {
      // The other half of the same pair: this rule moved up, and a plan that
      // carries it may not fall to basic. Put a plus plan carrying it in place.
      const plus = (await asActor(admin, 'select public.create_plan($1,$2,$3,$4) id',
        ['plus-test', 'plus-test', 'Plus test plan', 'plus'])).rows[0].id;
      const plusVersion = (await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
        [plus, 1, 1, 'month', 'Terms'])).rows[0].id;
      await asActor(admin,
        "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')", [plusVersion]);

      await rejects(() => asActor(admin, 'select public.set_plan_tier($1,$2)', [plus, 'basic']),
        /only a plus plan may grant/);
    });

  await test('every change is audited with what it was before', async () => {
    const rows = (await q(
      `select detail from public.governance_audit_events
        where action = 'plan_feature.requirement_changed'
        order by occurred_at`)).rows.map((r) => r.detail);

    assert(rows.length >= 2, `expected the two real changes to be audited, saw ${rows.length}`);
    assert(rows.some((d) => d.to === 'basic' && d.from === 'plus'),
      'lowering the requirement was not audited with its previous shelf');
    assert(rows.some((d) => d.to === 'plus' && d.from === 'basic'),
      'raising the requirement was not audited with its previous shelf');
    assert(rows.every((d) => d.feature_code === 'offline_downloads'), 'an audit row lost its feature');
  });

  await test('the map is readable by staff and invisible to a learner', async () => {
    const seen = await asActor(admin,
      'select feature_code from public.feature_tier_requirements').then((r) => r.rows.length);
    assert(seen >= 1, 'staff cannot read the map they edit');

    const hidden = await asActor(stranger,
      'select feature_code from public.feature_tier_requirements').then((r) => r.rows.length);
    assert(hidden === 0, `a learner read ${hidden} rows of plan configuration`);
  });
}
