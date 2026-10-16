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

  async function makePlan(code='family-monthly') {
    return (await asActor(admin, 'select public.create_plan($1,$2,$3) id',
      [code, 'Family monthly', 'Household access'])).rows[0].id;
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
    const plan = await makePlan('all-scopes');
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
