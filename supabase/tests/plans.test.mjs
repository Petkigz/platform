// Configure subscription plans without raw SQL from the admin UI.
//
// This suite covers the offer-definition layer only. It does not pretend that
// a pending subscription is paid; renewal and payment-confirmed activation still
// belong to the provider/callback integration.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, grantRole } = ctx;
  const admin = await bootstrapAdmin('plans-admin@example.com');
  const stranger = await newUser('plans-stranger@example.com');
  await newProfile(stranger, 'Plan stranger');

  async function asActor(actor, sql, params) {
    await q('begin');
    await q('select set_config(\'request.jwt.claims\',$1,true)', [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  async function makePlan(code='family-monthly', { tier = 'basic' } = {}) {
    return (await asActor(admin, 'select public.create_plan($1,$2,$3,$4) id',
      [code, 'Family monthly', 'Household access', tier])).rows[0].id;
  }

  async function makeVersion(planId, interval='month') {
    return (await asActor(admin,
      'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [planId, 4, 2, interval, 'Initial terms'])).rows[0].id;
  }

  await test('only privileged staff may create a plan', async () => {
    await rejects(
      () => asActor(stranger, "select public.create_plan('stranger-plan','X',null)"),
      /only platform staff may create a plan/i,
    );
    const id = await makePlan();
    const row = (await q('select code,name,status from public.plans where id=$1',[id])).rows[0];
    assert(row.code === 'family-monthly');
    assert(row.name === 'Family monthly');
    assert(row.status === 'draft', 'a new plan must not be on sale');
  });

  await test('plan codes and names are validated', async () => {
    await rejects(() => asActor(admin,
      "select public.create_plan('Bad Code','X',null)"), /lowercase plan code/i);
    await rejects(() => asActor(admin,
      "select public.create_plan('blank-name','  ',null)"), /plan needs a name/i);
  });

  await test('plan version numbers increment and terms begin as a draft', async () => {
    const plan = await makePlan('versioned');
    const v1 = await makeVersion(plan);
    const v2 = await makeVersion(plan, 'year');
    const rows = (await q(`select version_number,billing_interval,status,child_allowance,adult_allowance
      from public.plan_versions where id=any($1) order by version_number`, [[v1,v2]])).rows;
    assert(rows.length === 2);
    assert(Number(rows[0].version_number) === 1);
    assert(Number(rows[1].version_number) === 2);
    assert(rows[0].status === 'draft' && rows[1].status === 'draft');
    assert(Number(rows[0].child_allowance) === 4 && Number(rows[0].adult_allowance) === 2);
  });

  await test('negative learner allowances and unknown billing intervals are refused', async () => {
    const plan = await makePlan('bad-terms');
    await rejects(() => asActor(admin,
      "select public.create_plan_version($1,-1,1,'month',null)",[plan]), /allowances cannot be negative/i);
    await rejects(() => asActor(admin,
      "select public.create_plan_version($1,1,1,'fortnight',null)",[plan]), /subscription plans require a recurring interval/i);
  });

  await test('entitlement scope must match exactly one target', async () => {
    const plan = await makePlan('scopes');
    const version = await makeVersion(plan);
    await rejects(() => asActor(admin,
      "select public.add_plan_entitlement($1,'catalogue',null,null,null)",[version]), /exactly one subject area/i);
    await rejects(() => asActor(admin,
      "select public.add_plan_entitlement($1,'product',null,null,null)",[version]), /exactly one product/i);
    await rejects(() => asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'  ')",[version]), /exactly one feature code/i);
    await rejects(() => asActor(admin,
      "select public.add_plan_entitlement($1,'unknown',null,null,null)",[version]), /unsupported plan entitlement scope/i);
  });

  await test('catalogue, product and feature entitlements can be added', async () => {
    // The download feature is a Plus benefit, so the plan this test grants it on
    // has to be on the Plus shelf. That is the rule added in 20261252.
    const plan = await makePlan('all-scopes', { tier: 'plus' });
    const version = await makeVersion(plan);
    const subject = (await q("select id from public.subject_areas where code='quran' limit 1")).rows[0].id;
    const catalogue = await asActor(admin,
      "select public.add_plan_entitlement($1,'catalogue',$2,null,null) id", [version,subject]);
    const feature = await asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads') id", [version]);
    assert(catalogue.rows[0].id && feature.rows[0].id);
    const rows = (await q('select scope_type from public.plan_entitlements where plan_version_id=$1 order by scope_type',[version])).rows;
    assert(rows.map(x=>x.scope_type).join(',') === 'catalogue,feature');
  });

  await test('plan price is recurring and currency/market are validated', async () => {
    const plan = await makePlan('price-rules');
    const monthly = await makeVersion(plan, 'month');
    await rejects(() => asActor(admin,
      "select public.create_plan_version($1,0,1,'one_time',null)",[plan]), /subscription plans require a recurring interval/i);
    await rejects(() => asActor(admin,
      "select public.set_plan_price($1,1000,'usd',null)",[monthly]), /three-letter uppercase ISO/i);
    await rejects(() => asActor(admin,
      "select public.set_plan_price($1,1000,'UGX','UGA')",[monthly]), /two-letter uppercase country/i);
    const id = (await asActor(admin,
      "select public.set_plan_price($1,125000,'UGX',null) id",[monthly])).rows[0].id;
    const price = (await q('select amount_minor,currency_code,billing_interval,status from public.prices where id=$1',[id])).rows[0];
    assert(Number(price.amount_minor) === 125000);
    assert(price.currency_code === 'UGX' && price.billing_interval === 'month');
    assert(price.status === 'active');
  });

  await test('repricing supersedes rather than rewrites the old price', async () => {
    const plan = await makePlan('repriced');
    const version = await makeVersion(plan);
    const first = (await asActor(admin,
      "select public.set_plan_price($1,10000,'UGX',null) id",[version])).rows[0].id;
    const second = (await asActor(admin,
      "select public.set_plan_price($1,12000,'UGX',null) id",[version])).rows[0].id;
    const rows = (await q('select amount_minor,status,effective_until from public.prices where id=any($1) order by amount_minor',[[first,second]])).rows;
    assert(rows.length === 2);
    assert(Number(rows[0].amount_minor) === 10000 && rows[0].status === 'retired' && rows[0].effective_until !== null);
    assert(Number(rows[1].amount_minor) === 12000 && rows[1].status === 'active' && rows[1].effective_until === null);
  });

  await test('a plan version cannot activate without entitlements and a live price', async () => {
    const plan = await makePlan('activation-prereqs');
    const version = await makeVersion(plan);
    await rejects(() => asActor(admin,
      'select public.activate_plan_version($1)',[version]), /at least one entitlement/i);
    const subject = (await q("select id from public.subject_areas where code='quran' limit 1")).rows[0].id;
    await asActor(admin,"select public.add_plan_entitlement($1,'catalogue',$2,null,null)",[version,subject]);
    await rejects(() => asActor(admin,
      'select public.activate_plan_version($1)',[version]), /active price/i);
    await asActor(admin,"select public.set_plan_price($1,10000,'UGX',null)",[version]);
    const active = (await asActor(admin,
      'select public.activate_plan_version($1) active',[version])).rows[0].active;
    assert(active === true);
    const statuses = (await q(`select p.status plan_status,pv.status version_status
      from public.plans p join public.plan_versions pv on pv.plan_id=p.id where pv.id=$1`,[version])).rows[0];
    assert(statuses.plan_status === 'active' && statuses.version_status === 'active');
    const again = (await asActor(admin,
      'select public.activate_plan_version($1) active',[version])).rows[0].active;
    assert(again === false, 'activation should be idempotent');
  });

  await test('a retired plan cannot receive new versions or be activated', async () => {
    const plan = await makePlan('retired');
    await q("update public.plans set status='retired' where id=$1",[plan]);
    await rejects(() => asActor(admin,
      "select public.create_plan_version($1,0,1,'month',null)",[plan]), /not found or retired/i);
  });

  // ---------------------------------------------------------------------------
  // basic and plus are shelves, not labels
  // ---------------------------------------------------------------------------
  // Decided 2026-10-22: downloads live on "a plan on top of the basic plan with
  // more features, more like the vip package." A tier that nothing enforces is
  // a word on a form, so these tests check the enforcement, not the column.

  await test('a new plan is born on the basic shelf unless told otherwise', async () => {
    const plan = (await asActor(admin, 'select public.create_plan($1,$2,$3) id',
      ['default-tier', 'Default tier', 'No tier asked for'])).rows[0].id;
    const tier = (await q('select tier from public.plans where id=$1', [plan])).rows[0].tier;
    assert(tier === 'basic', `a plan created without a tier came out as ${tier}`);
  });

  await test('a plan cannot be created on a shelf that does not exist', async () => {
    await rejects(() => asActor(admin, 'select public.create_plan($1,$2,$3,$4)',
      ['gold-plan', 'Gold', null, 'gold']), /either basic or plus/i);
  });

  await test('a basic plan may not carry a plus feature', async () => {
    const plan = await makePlan('basic-downloads');
    const version = await makeVersion(plan);
    // The refusal that makes the tier mean something: a Basic plan cannot be
    // given the benefit the Plus shelf exists to sell.
    await rejects(() => asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')", [version]),
    /plus feature/i);
    const count = (await q('select count(*)::int as n from public.plan_entitlements where plan_version_id=$1',[version])).rows[0].n;
    assert(count === 0, 'the refused grant was written anyway');
  });

  await test('moving a plan to plus lets the feature be granted', async () => {
    const plan = await makePlan('moved-to-plus');
    const version = await makeVersion(plan);
    const moved = (await asActor(admin, 'select public.set_plan_tier($1,$2) as result',
      [plan, 'plus'])).rows[0].result;
    assert(moved.changed === true && moved.tier === 'plus', JSON.stringify(moved));
    const id = (await asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads') id", [version])).rows[0].id;
    assert(id, 'the feature was still refused after the plan moved to plus');
    const audited = (await q(`select detail from public.governance_audit_events
      where action='plan.tier_changed' and target_id=$1`,[plan])).rows[0];
    assert(audited && audited.detail.from === 'basic' && audited.detail.to === 'plus',
      `audit detail was ${JSON.stringify(audited?.detail)}`);
  });

  await test('setting the tier a plan already has is a quiet no-op', async () => {
    const plan = await makePlan('same-shelf');
    const again = (await asActor(admin, 'select public.set_plan_tier($1,$2) as result',
      [plan, 'basic'])).rows[0].result;
    assert(again.changed === false, 'an unchanged tier was reported as a change');
    const events = (await q(`select count(*)::int as n from public.governance_audit_events
      where action='plan.tier_changed' and target_id=$1`,[plan])).rows[0].n;
    assert(events === 0, 'a no-op wrote an audit event');
  });

  await test('a plus plan cannot drop to basic while its terms still carry the feature', async () => {
    const plan = await makePlan('stuck-plus', { tier: 'plus' });
    const version = await makeVersion(plan);
    const entitlement = (await asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads') id", [version])).rows[0].id;
    await rejects(() => asActor(admin, 'select public.set_plan_tier($1,$2)', [plan, 'basic']),
      /still carries offline_downloads/i);
    const tier = (await q('select tier from public.plans where id=$1',[plan])).rows[0].tier;
    assert(tier === 'plus', 'the downgrade happened despite the refusal');

    // And with the grant gone, the downgrade is allowed — the refusal has a way
    // out rather than trapping the plan on the wrong shelf forever.
    await asActor(admin, 'select public.remove_plan_entitlement($1)', [entitlement]);
    const after = (await asActor(admin, 'select public.set_plan_tier($1,$2) as result',
      [plan, 'basic'])).rows[0].result;
    assert(after.changed === true && after.tier === 'basic', JSON.stringify(after));
    const removed = (await q(`select count(*)::int as n from public.governance_audit_events
      where action='plan.entitlement_removed' and target_id=$1`,[version])).rows[0].n;
    assert(removed === 1, 'the removal was not audited');
  });

  await test('only privileged staff may move a plan or remove a grant', async () => {
    const plan = await makePlan('guarded-shelf');
    await rejects(() => asActor(stranger, 'select public.set_plan_tier($1,$2)',[plan,'plus']),
      /only platform staff/i);
    await rejects(() => asActor(stranger, 'select public.set_plan_tier($1,$2)',[plan,'gold']),
      /only platform staff/i);
    await rejects(() => asActor(stranger, 'select public.remove_plan_entitlement($1)',
      ['00000000-0000-0000-0000-000000000000']), /only platform staff/i);
  });

  await test('plan setup is audited', async () => {
    const plan = await makePlan('audit-plan');
    const version = await makeVersion(plan);
    const subject = (await q("select id from public.subject_areas where code='quran' limit 1")).rows[0].id;
    await asActor(admin,"select public.add_plan_entitlement($1,'catalogue',$2,null,null)",[version,subject]);
    await asActor(admin,"select public.set_plan_price($1,9000,'UGX',null)",[version]);
    await asActor(admin,'select public.activate_plan_version($1)',[version]);
    const actions=(await q(`select action from public.governance_audit_events
      where target_id=any($1) order by occurred_at`,[[plan,version]])).rows.map(x=>x.action);
    assert(actions.join(',') === 'plan.created,plan.version_created,plan.entitlement_added,plan.price_set,plan.version_activated',
      `actions were ${actions.join(',')}`);
  });
}
