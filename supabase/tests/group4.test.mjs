// Group 4 tests: products, pricing, subscriptions, promotions, entitlements.
//
// The invariants that matter: money is never a float, the entitlement grant is
// the only thing consulted at access time, suspension overrides it, family
// capacity is enforced in the transaction, and promotion terms are snapshotted.

export async function run(ctx) {
  const {
    q, count, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile,
    bootstrapAdmin, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson,
    ensureReviewerProfile, satisfyReview,
  } = ctx;

  const admin    = await bootstrapAdmin('g4-admin@example.com');
  const teacher  = await newInstructor('g4-teacher@example.com', admin);
  const reviewer = await newReviewer('g4-reviewer@example.com', admin);
  const stranger = await newUser('g4-stranger@example.com');
  await newProfile(stranger);

  const setStatus = (versionId, status, actor, reason = 'test') =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, reason]);

  async function newAdultLearner(email) {
    const userId = await newUser(email);
    await newProfile(userId, email);
    const r = await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [email, userId]);
    return { userId, learnerId: r.rows[0].id };
  }

  // D2: a child is a learner_profile under a family, never a user. The
  // lp_needs_family_or_login constraint requires the family row.
  async function newChildLearner(email) {
    const fam = (await q(
      `insert into public.families (name) values ('Family of ' || $1) returning id`,
      [email])).rows[0].id;
    const r = await q(
      `insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
       values ($1, $2, 'child', '8-10') returning id`, [fam, email]);
    return r.rows[0].id;
  }

  async function publishedCourse({ preview = false } = {}) {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);
    const previewLesson = preview
      ? await newLesson(section, { position: 2, is_preview: true })
      : null;
    await setStatus(version, 'submitted', teacher);
    await setStatus(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await setStatus(version, 'published', admin);
    return { course, version, section, lesson, previewLesson };
  }

  // ---------------------------------------------------------------------
  console.log('Schema');

  await test('all eighteen Group 4 tables exist', async () => {
    const want = ['products', 'product_course_versions', 'plans', 'plan_versions',
      'plan_entitlements', 'prices', 'promotion_campaigns', 'promotion_benefits',
      'promotion_redemptions', 'billing_accounts', 'billing_account_memberships',
      'subscriptions', 'subscription_items', 'subscription_history',
      'family_plan_allocations', 'entitlement_grants', 'entitlement_events',
      'access_checks'];
    const names = (await q(
      `select table_name from information_schema.tables
        where table_schema='public' and table_type='BASE TABLE'`)).rows.map(r => r.table_name);
    for (const t of want) assert(names.includes(t), `missing table ${t}`);
  });

  await test('no monetary column anywhere is a floating point type (D4)', async () => {
    const bad = (await q(
      `select table_name, column_name, data_type
         from information_schema.columns
        where table_schema = 'public'
          and (column_name ilike '%amount%' or column_name ilike '%price%'
               or column_name ilike '%_off_%' or column_name = 'balance')
          and data_type in ('double precision', 'real')`)).rows;
    assert(bad.length === 0,
      `float money columns found: ${bad.map(r => `${r.table_name}.${r.column_name}`).join(', ')}`);
  });

  await test('amounts are stored as integer minor units with an explicit currency', async () => {
    const cols = (await q(
      `select column_name, data_type, character_maximum_length
         from information_schema.columns
        where table_schema='public' and table_name='prices'
          and column_name in ('amount_minor','currency_code')`)).rows;
    const amt = cols.find(c => c.column_name === 'amount_minor');
    const cur = cols.find(c => c.column_name === 'currency_code');
    assert(amt.data_type === 'bigint', `amount_minor is ${amt.data_type}, not bigint`);
    assert(cur.character_maximum_length === 3,
      `currency_code allows ${cur.character_maximum_length} characters, not 3`);
  });

  // ---------------------------------------------------------------------
  console.log('\nPricing');

  await test('a price must name exactly one owner', async () => {
    const pc = await publishedCourse();
    const prod = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Tajweed basics','active',$1) returning id`, [teacher])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [prod, pc.course, pc.version]);

    await q(`insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
             values ($1, 30000, 'UGX', 'one_time', 'active')`, [prod]);

    await rejects(() => q(
      `insert into public.prices (amount_minor, currency_code, billing_interval, status)
       values (1000, 'UGX', 'one_time', 'active')`),
      'a price with no owner was accepted');
  });

  await test('two active prices for the same target and window are rejected', async () => {
    const prod = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Overlap test','active',$1) returning id`, [teacher])).rows[0].id;
    await q(`insert into public.prices
               (product_id, amount_minor, currency_code, billing_interval, status)
             values ($1, 30000, 'UGX', 'one_time', 'active')`, [prod]);
    await rejects(() => q(
      `insert into public.prices
         (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1, 25000, 'UGX', 'one_time', 'active')`, [prod]),
      'two overlapping active prices existed for the same target');

    // A different market is a different price, not a conflict.
    await q(`insert into public.prices
               (product_id, amount_minor, currency_code, billing_interval, market, status)
             values ($1, 900, 'USD', 'one_time', 'US', 'active')`, [prod]);
  });

  await test('a currency code must be three uppercase letters', async () => {
    const prod = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Currency test','active',$1) returning id`, [teacher])).rows[0].id;
    await rejects(() => q(
      `insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1, 100, 'shillings', 'one_time', 'active')`, [prod]),
      'a free-text currency was accepted');
    await rejects(() => q(
      `insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1, -500, 'UGX', 'one_time', 'active')`, [prod]),
      'a negative amount was accepted');
  });

  await test('a product pins an exact course version', async () => {
    const a = await publishedCourse();
    const b = await publishedCourse();
    const prod = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Pin test','active',$1) returning id`, [teacher])).rows[0].id;
    await rejects(() => q(
      `insert into public.product_course_versions (product_id, course_id, course_version_id)
       values ($1,$2,$3)`, [prod, a.course, b.version]),
      'a product was mapped to a version of a different course');
  });

  // ---------------------------------------------------------------------
  console.log('\nSubscriptions and family capacity');

  async function newPlan({ children = 0, adults = 1, interval = 'month' } = {}) {
    const plan = (await q(
      `insert into public.plans (code, name, status)
       values ($1, 'Plan ' || $1, 'active') returning id`,
      [`plan-${crypto.randomUUID().slice(0, 8)}`])).rows[0].id;
    const pv = (await q(
      `insert into public.plan_versions (plan_id, version_number, child_allowance, adult_allowance, billing_interval, status)
       values ($1, 1, $2, $3, $4, 'active') returning id`,
      [plan, children, adults, interval])).rows[0].id;
    return { plan, pv };
  }

  async function newBillingAccount(userId) {
    const acct = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, created_by)
       values ('Family account', 'UGX', $1) returning id`, [userId])).rows[0].id;
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, granted_by) values ($1,$2,$2)`, [acct, userId]);
    return acct;
  }

  async function newSubscription(acct, pv) {
    return (await q(
      `insert into public.subscriptions (billing_account_id, plan_id, plan_version_id, status, started_at)
       select $1, pv.plan_id, pv.id, 'active', now()
         from public.plan_versions pv where pv.id = $2 returning id`, [acct, pv])).rows[0].id;
  }

  await test('family slot capacity is enforced against the plan version', async () => {
    const { plan, pv } = await newPlan({ children: 2, adults: 1 });
    const { userId, learnerId } = await newAdultLearner('fam-1@example.com');
    const acct = await newBillingAccount(userId);
    const sub = await newSubscription(acct, pv);

    const c1 = await newChildLearner('child-1');
    const c2 = await newChildLearner('child-2');
    const c3 = await newChildLearner('child-3');

    const mk = (learner) => q(
      `insert into public.family_plan_allocations (subscription_id, learner_profile_id, slot_type)
       values ($1,$2,'child')`, [sub, learner]);

    await mk(c1);
    await mk(c2);
    await rejects(() => mk(c3), 'a third child was allocated to a two-child plan');
  });

  await test('child and adult slots are separate pools', async () => {
    const { plan, pv } = await newPlan({ children: 1, adults: 1 });
    const { userId, learnerId } = await newAdultLearner('fam-2@example.com');
    const acct = await newBillingAccount(userId);
    const sub = await newSubscription(acct, pv);
    const child = await newChildLearner('child-pool');

    await q(`insert into public.family_plan_allocations (subscription_id, learner_profile_id, slot_type)
             values ($1,$2,'adult')`, [sub, learnerId]);
    await q(`insert into public.family_plan_allocations (subscription_id, learner_profile_id, slot_type)
             values ($1,$2,'child')`, [sub, child]);

    const c2 = await newChildLearner('child-pool-2');
    await rejects(() => q(
      `insert into public.family_plan_allocations (subscription_id, learner_profile_id, slot_type)
       values ($1,$2,'child')`, [sub, c2]),
      'a second child took a slot from the one-child allowance');
  });

  await test('one live slot per learner per subscription', async () => {
    const { plan, pv } = await newPlan({ children: 3 });
    const { userId } = await newAdultLearner('fam-3@example.com');
    const acct = await newBillingAccount(userId);
    const sub = await newSubscription(acct, pv);
    const child = await newChildLearner('dup-child');

    await q(`insert into public.family_plan_allocations (subscription_id, learner_profile_id, slot_type)
             values ($1,$2,'child')`, [sub, child]);
    await rejects(() => q(
      `insert into public.family_plan_allocations (subscription_id, learner_profile_id, slot_type)
       values ($1,$2,'child')`, [sub, child]),
      'the same learner took two live slots');
  });

  await test('subscription status changes are recorded and the history is append-only', async () => {
    const { plan, pv } = await newPlan();
    const { userId } = await newAdultLearner('sub-1@example.com');
    const acct = await newBillingAccount(userId);
    const sub = await newSubscription(acct, pv);

    await q(`update public.subscriptions set status='past_due' where id=$1`, [sub]);
    await q(`update public.subscriptions set status='cancelled', cancelled_at=now(),
                cancel_reason='moved abroad' where id=$1`, [sub]);

    const hist = (await q(
      `select to_status from public.subscription_history
        where subscription_id=$1 order by occurred_at`, [sub])).rows.map(r => r.to_status);
    assert(hist.join(',') === 'past_due,cancelled', `unexpected history: ${hist.join(',')}`);

    await rejects(() => q('delete from public.subscription_history where subscription_id=$1', [sub]),
      'subscription history was deleted');
  });

  // ---------------------------------------------------------------------
  console.log('\nPromotions');

  await test('a redemption snapshots the benefit and cannot be edited', async () => {
    const code = `PROMO-${crypto.randomUUID().slice(0, 8)}`;
    const camp = (await q(
      `insert into public.promotion_campaigns (code, name, status, created_by)
       values ($1,'Ramadan offer','active',$2) returning id`, [code, admin])).rows[0].id;
    await q(`insert into public.promotion_benefits
               (campaign_id, benefit_type, percent_off, renewal_scope)
             values ($1,'percent_off',25,'first_period')`, [camp]);

    const { userId } = await newAdultLearner('promo-1@example.com');
    const r = (await q(
      `insert into public.promotion_redemptions (campaign_id, redeemed_by, benefit_snapshot)
       values ($1,$2,'{"percent_off":25,"renewal_scope":"first_period"}') returning id`,
      [camp, userId])).rows[0].id;

    // The campaign is edited afterwards; the redemption must not move.
    await q(`update public.promotion_benefits set percent_off = 50 where campaign_id=$1`, [camp]);
    const snap = (await q('select benefit_snapshot from public.promotion_redemptions where id=$1',
      [r])).rows[0].benefit_snapshot;
    assert(snap.percent_off === 25, `the snapshot drifted to ${snap.percent_off}`);

    await rejects(() => q('delete from public.promotion_redemptions where id=$1', [r]),
      'a redemption was deleted');
  });

  await test('per-user and total usage limits are enforced', async () => {
    const code = `LIMIT-${crypto.randomUUID().slice(0, 8)}`;
    const camp = (await q(
      `insert into public.promotion_campaigns
         (code, name, status, total_usage_limit, per_user_limit, created_by)
       values ($1,'Limited','active',3,1,$2) returning id`, [code, admin])).rows[0].id;

    const a = await newAdultLearner('limit-a@example.com');
    const b = await newAdultLearner('limit-b@example.com');
    const c = await newAdultLearner('limit-c@example.com');
    const d = await newAdultLearner('limit-d@example.com');

    const redeem = (u) => q(
      `insert into public.promotion_redemptions (campaign_id, redeemed_by, benefit_snapshot)
       values ($1,$2,'{}')`, [camp, u]);

    await redeem(a.userId);
    await rejects(() => redeem(a.userId), 'a user exceeded the per-user limit');
    await redeem(b.userId);
    await redeem(c.userId);
    await rejects(() => redeem(d.userId), 'the total usage limit was exceeded');
  });

  await test('an inactive or expired campaign cannot be redeemed', async () => {
    const { userId } = await newAdultLearner('promo-2@example.com');
    const draft = (await q(
      `insert into public.promotion_campaigns (code, name, status, created_by)
       values ($1,'Not live','draft',$2) returning id`,
      [`DRAFT-${crypto.randomUUID().slice(0, 8)}`, admin])).rows[0].id;
    await rejects(() => q(
      `insert into public.promotion_redemptions (campaign_id, redeemed_by, benefit_snapshot)
       values ($1,$2,'{}')`, [draft, userId]),
      'a draft campaign was redeemed');

    const ended = (await q(
      `insert into public.promotion_campaigns
         (code, name, status, ends_at, created_by)
       values ($1,'Ended','active', now() - interval '1 day', $2) returning id`,
      [`ENDED-${crypto.randomUUID().slice(0, 8)}`, admin])).rows[0].id;
    await rejects(() => q(
      `insert into public.promotion_redemptions (campaign_id, redeemed_by, benefit_snapshot)
       values ($1,$2,'{}')`, [ended, userId]),
      'an ended campaign was redeemed');
  });

  await test('a benefit definition must match its type', async () => {
    const camp = (await q(
      `insert into public.promotion_campaigns (code, name, status, created_by)
       values ($1,'Benefit test','active',$2) returning id`,
      [`BEN-${crypto.randomUUID().slice(0, 8)}`, admin])).rows[0].id;
    await rejects(() => q(
      `insert into public.promotion_benefits (campaign_id, benefit_type)
       values ($1,'percent_off')`, [camp]),
      'a percent_off benefit with no percentage was accepted');
  });

  // ---------------------------------------------------------------------
  console.log('\nEntitlements and access');

  await test('a learner without a grant cannot access the content', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('ent-1@example.com');
    const allowed = (await q(
      'select public.can_access_course_version($1,$2) as v', [learnerId, pc.version])).rows[0].v;
    assert(allowed === false, 'access was granted with no entitlement');
  });

  await test('a grant gives access, and revoking it takes access away', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('ent-2@example.com');
    const g = (await q(
      `insert into public.entitlement_grants
         (learner_profile_id, scope_type, course_version_id, source_type)
       values ($1,'course_version',$2,'purchase') returning id`,
      [learnerId, pc.version])).rows[0].id;

    const before = (await q('select public.can_access_course_version($1,$2) as v',
      [learnerId, pc.version])).rows[0].v;
    assert(before === true, 'a valid grant did not grant access');

    await q(`update public.entitlement_grants
                set status='revoked', revoked_at=now(), revoked_by=$1,
                    revocation_reason='refunded'
              where id=$2`, [admin, g]);

    const after = (await q('select public.can_access_course_version($1,$2) as v',
      [learnerId, pc.version])).rows[0].v;
    assert(after === false, 'a revoked grant still granted access');
  });

  await test('course suspension overrides a valid entitlement', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('ent-3@example.com');
    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, course_version_id, source_type)
             values ($1,'course_version',$2,'subscription')`, [learnerId, pc.version]);

    await q(`update public.courses
                set suspended_at = now(), suspended_reason = 'under doctrinal review',
                    suspended_by = $1
              where id = $2`, [admin, pc.course]);

    const allowed = (await q('select public.can_access_course_version($1,$2) as v',
      [learnerId, pc.version])).rows[0].v;
    assert(allowed === false, 'suspension did not override a valid entitlement');
  });

  await test('a retired course still serves already-enrolled learners (D6)', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('ent-4@example.com');
    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, course_version_id, source_type)
             values ($1,'course_version',$2,'purchase')`, [learnerId, pc.version]);

    await q(`update public.courses set status = 'retired' where id = $1`, [pc.course]);

    const allowed = (await q('select public.can_access_course_version($1,$2) as v',
      [learnerId, pc.version])).rows[0].v;
    assert(allowed === true,
      'retiring a course cut off an existing learner, which D6 forbids');
  });

  await test('a preview lesson is free; the rest is not', async () => {
    const pc = await publishedCourse({ preview: true });
    const preview = pc.previewLesson;
    const { learnerId } = await newAdultLearner('ent-5@example.com');

    const free = (await q('select public.can_access_lesson($1,$2) as v',
      [learnerId, preview])).rows[0].v;
    const paid = (await q('select public.can_access_lesson($1,$2) as v',
      [learnerId, pc.lesson])).rows[0].v;
    assert(free === true, 'a preview lesson was not free');
    assert(paid === false, 'a paid lesson was accessible without entitlement');
  });

  await test('expiring access keeps progress and certificates (D7)', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('ent-6@example.com');
    // eg_active_is_live refuses an already-expired grant recorded as active,
    // which is correct. Create it as expired.
    const g = (await q(
      `insert into public.entitlement_grants
         (learner_profile_id, scope_type, course_version_id, source_type,
          effective_from, effective_until, status)
       values ($1,'course_version',$2,'subscription',
               now() - interval '30 days', now() - interval '1 day', 'expired')
       returning id`, [learnerId, pc.version])).rows[0].id;

    const enr = (await q(
      `insert into public.course_enrolments (learner_profile_id, course_id, course_version_id)
       values ($1,$2,$3) returning id`, [learnerId, pc.course, pc.version])).rows[0].id;
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1,$2,'completed',100,now())`, [enr, pc.lesson]);

    const allowed = (await q('select public.can_access_course_version($1,$2) as v',
      [learnerId, pc.version])).rows[0].v;
    assert(allowed === false, 'an expired grant still granted access');

    const progress = await count(
      'select count(*)::int n from public.lesson_progress where course_enrolment_id=$1', [enr]);
    assert(progress === 1, 'expiring access deleted the learner\'s progress');
  });

  await test('entitlement events are append-only and record every change', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('ent-7@example.com');
    const g = (await q(
      `insert into public.entitlement_grants
         (learner_profile_id, scope_type, course_version_id, source_type)
       values ($1,'course_version',$2,'admin_grant') returning id`,
      [learnerId, pc.version])).rows[0].id;

    await q(`update public.entitlement_grants set status='suspended' where id=$1`, [g]);
    await q(`update public.entitlement_grants set status='active' where id=$1`, [g]);
    await q(`update public.entitlement_grants
                set status='revoked', revoked_at=now(), revocation_reason='error' where id=$1`, [g]);

    const types = (await q(
      `select event_type from public.entitlement_events
        where entitlement_grant_id=$1 order by occurred_at`, [g])).rows.map(r => r.event_type);
    assert(types.join(',') === 'suspended,restored,revoked',
      `unexpected entitlement history: ${types.join(',')}`);

    await rejects(() => q('delete from public.entitlement_events where entitlement_grant_id=$1', [g]),
      'entitlement history was deleted');
  });

  // ---------------------------------------------------------------------
  console.log('\nRow level security');

  await test('a billing member sees billing but never learning data', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('rls-bill@example.com');
    const payer = await newUser('payer@example.com');
    await newProfile(payer);
    const acct = await newBillingAccount(payer);
    const { plan, pv } = await newPlan();
    await newSubscription(acct, pv);

    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, course_version_id, source_type)
             values ($1,'course_version',$2,'subscription')`, [learnerId, pc.version]);

    const subs = await asUser(payer, () =>
      count('select count(*)::int n from public.subscriptions where billing_account_id=$1', [acct]));
    assert(subs === 1, `a billing member saw ${subs} subscriptions`);

    const grants = await asUser(payer, () =>
      count('select count(*)::int n from public.entitlement_grants'));
    assert(grants === 0, `a billing member saw ${grants} entitlement grants`);

    const progress = await asUser(payer, () =>
      count('select count(*)::int n from public.lesson_progress'));
    assert(progress === 0, `a billing member saw ${progress} progress rows`);
  });

  await test('the catalogue and its prices are public; drafts are not', async () => {
    const prod = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Public course','active',$1) returning id`, [teacher])).rows[0].id;
    const draft = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Unlisted','draft',$1) returning id`, [teacher])).rows[0].id;
    await q(`insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
             values ($1, 30000, 'UGX', 'one_time', 'active')`, [prod]);

    assert(await asAnon(() => count('select count(*)::int n from public.products where id=$1', [prod])) === 1,
      'anonymous could not see an active product');
    assert(await asAnon(() => count('select count(*)::int n from public.products where id=$1', [draft])) === 0,
      'anonymous saw a draft product');
    assert(await asAnon(() => count('select count(*)::int n from public.prices')) >= 1,
      'anonymous could not see an active price');
  });

  await test('a stranger cannot see another learner\'s entitlements', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('rls-ent@example.com');
    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, course_version_id, source_type)
             values ($1,'course_version',$2,'purchase')`, [learnerId, pc.version]);
    const seen = await asUser(stranger, () =>
      count('select count(*)::int n from public.entitlement_grants'));
    assert(seen === 0, `a stranger saw ${seen} entitlement grants`);
  });
}
