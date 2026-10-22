// Redeeming a promotion code.
//
// The code is applied inside `create_course_order()`, in the same transaction,
// so a refused code leaves no order behind. These tests hold the things a family
// would notice: the discount is what the campaign says, in their own currency;
// a code that is not running cannot be used; the three limits hold; and an order
// can never be discounted into a free one it could not pay for.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('promo-redeem-admin@example.com');
  const teacher = await newInstructor('promo-redeem-teacher@example.com', admin);
  const reviewer = await newReviewer('promo-redeem-reviewer@example.com', admin);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
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

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const count = async (sql, params = []) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  async function withCheckoutOn(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'commerce.checkout'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true' where key = 'commerce.checkout'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1 where key = 'commerce.checkout'`,
        [before]);
    }
  }

  async function transition(versionId, status, actor) {
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'promotion redemption test']);
  }

  let seq = 0;
  async function sellable(author, over = {}) {
    seq += 1;
    const course = await newCourse(author, { status: 'active', title: `Redeem Course ${seq}` });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await scalar(
      `insert into public.products (product_type, name, status, created_by)
       values ('course',$1,'active',$2) returning id`,
      [`Redeem product ${seq}`, author])).id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);
    await q(`insert into public.prices
               (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
             values ($1,$2,$3,'one_time','active',$4,now())`,
      [productId, over.amount ?? 30000, over.currency ?? 'UGX', over.market ?? 'UG']);

    await transition(version, 'submitted', author);
    await transition(version, 'approved', admin);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, productId };
  }

  async function newBuyer(name, country = 'UG') {
    seq += 1;
    const userId = await newUser(`pr-buyer-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    // An account with a country, so a campaign that names markets can be met.
    await q(`insert into public.billing_accounts
               (display_name, billing_currency, billing_country, status, created_by)
             values ($1,$2,$3,'active',$4)`, [name, country === 'KE' ? 'KES' : 'UGX', country, userId]);
    return { userId, learnerId, name, country };
  }

  async function campaign(code, over = {}) {
    const id = (await asActor(admin,
      `select public.create_promotion_campaign(
         $1,$2,$3,$4,$5,$6,$7::text[],$8::uuid[],null,null,$9,$10,false,$11) id`,
      [code, over.name ?? `Offer ${code}`, over.benefit ?? 'percent_off',
       over.percent ?? 20, over.amount ?? null, over.currency ?? null,
       over.markets ?? [], over.courses ?? [],
       over.totalLimit ?? null, over.perUserLimit ?? null,
       over.perFamilyLimit ?? null])).rows[0].id;
    if (over.status !== 'draft') {
      await asActor(admin, `select public.set_promotion_campaign_status($1,'active')`, [id]);
    }
    return id;
  }

  const buy = (buyer, courseId, code, country = null) =>
    withCheckoutOn(() => asActor(buyer.userId,
      'select public.create_course_order($1,$2,$3,$4) r',
      [courseId, buyer.learnerId, country, code]).then((r) => r.rows[0].r));

  await test('a valid code discounts the order, and the rows agree with each other', async () => {
    const offer = await sellable(teacher, { amount: 30000 });
    const buyer = await newBuyer('Discounted');
    await campaign('TWENTY');

    const made = await buy(buyer, offer.course, 'twenty');

    const order = await scalar(
      `select subtotal_minor, discount_minor, total_minor, currency_code, status
         from public.orders where id = $1`, [made.orderId]);
    assert(String(order.subtotal_minor) === '30000', `subtotal ${order.subtotal_minor}`);
    assert(String(order.discount_minor) === '6000', `discount ${order.discount_minor}`);
    assert(String(order.total_minor) === '24000', `total ${order.total_minor}`);
    assert(order.status === 'pending_payment');
    assert(made.discountMinor === '6000', `the writer returned ${made.discountMinor} off`);

    const adjustment = await scalar(
      `select adjustment_type, direction, amount_minor, promotion_redemption_id, description
         from public.order_adjustments where order_id = $1`, [made.orderId]);
    assert(adjustment.adjustment_type === 'promotion');
    assert(adjustment.direction === 'credit');
    assert(String(adjustment.amount_minor) === '6000');
    assert(adjustment.promotion_redemption_id, 'the adjustment has no redemption attached');
    assert(adjustment.description.includes('TWENTY'), adjustment.description);

    const redemption = await scalar(
      `select campaign_id, redeemed_by, billing_account_id, benefit_snapshot
         from public.promotion_redemptions where order_id = $1`, [made.orderId]);
    assert(redemption.redeemed_by === buyer.userId, 'the redemption names nobody');
    assert(redemption.billing_account_id, 'the redemption does not name the family');
    assert(String(redemption.benefit_snapshot.discountMinor) === '6000',
      'the snapshot does not record what the code took off');
  });

  await test('an unknown code creates no order at all', async () => {
    const offer = await sellable(teacher);
    const buyer = await newBuyer('Typo');

    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [offer.course, buyer.learnerId, null, 'NOSUCHCODE']),
      /promotion:unknown_code/));

    // The order and the item are created in the same transaction as the code, so
    // a bad code leaves nothing behind — no stray pending order to confuse them.
    const orders = await count('select id from public.orders where placed_by = $1', [buyer.userId]);
    assert(orders === 0, `${orders} orders survived a refused promotion code`);
  });

  await test('a campaign that is not running cannot be used', async () => {
    const offer = await sellable(teacher);
    const buyer = await newBuyer('Early');

    const draft = await campaign('DRAFTED', { status: 'draft' });
    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [offer.course, buyer.learnerId, null, 'DRAFTED']),
      /promotion:not_active/));

    // Active, but its window closed yesterday.
    await q(`update public.promotion_campaigns
                set status='active', starts_at=now()-interval '10 days',
                    ends_at=now()-interval '1 day'
              where id = $1`, [draft]);
    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [offer.course, buyer.learnerId, null, 'DRAFTED']),
      /promotion:not_running/));
  });

  await test('a code aimed at another country is refused', async () => {
    // Sold in both countries — otherwise the refusal would be "no price here"
    // and the market check would never be reached.
    const offer = await sellable(teacher, { market: 'UG', currency: 'UGX', amount: 30000 });
    await q(`insert into public.prices
               (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
             values ($1,900,'KES','one_time','active','KE',now())`, [offer.productId]);

    const buyer = await newBuyer('Ugandan', 'UG');
    await campaign('KENYA-ONLY', { markets: ['KE'] });

    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [offer.course, buyer.learnerId, null, 'KENYA-ONLY']),
      /promotion:not_in_market/));
  });

  await test('a code written for other courses is refused', async () => {
    const mine = await sellable(teacher);
    const other = await sellable(teacher);
    const buyer = await newBuyer('Wrong Course');
    await campaign('OTHER-COURSE', { courses: [other.course] });

    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [mine.course, buyer.learnerId, null, 'OTHER-COURSE']),
      /promotion:not_for_this_course/));
  });

  await test('the per-family limit counts the account, not the person', async () => {
    const offer = await sellable(teacher);
    const buyer = await newBuyer('Family Of Three');
    const family = (await asActor(buyer.userId,
      'select public.create_family($1) id', ['Redeem family'])).rows[0].id;
    const child = (await asActor(buyer.userId,
      'select public.add_child_to_family($1,$2,$3) id', [family, 'Child', '8-10'])).rows[0].id;

    // Two per family: the parent's purchase and one child's.
    await campaign('TWO-PER-FAMILY', { perFamilyLimit: 2 });

    const first = await buy(buyer, offer.course, 'TWO-PER-FAMILY');
    assert(first.orderId, 'the first redemption was refused');

    const childOrder = await withCheckoutOn(() => asActor(buyer.userId,
      'select public.create_course_order($1,$2,$3,$4) r',
      [offer.course, child, null, 'TWO-PER-FAMILY']).then((r) => r.rows[0].r));
    assert(childOrder.orderId, 'the second redemption was refused');

    // A third learner in the same family is the third, and is refused.
    const third = (await asActor(buyer.userId,
      'select public.add_child_to_family($1,$2,$3) id', [family, 'Second child', '11-13'])).rows[0].id;
    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [offer.course, third, null, 'TWO-PER-FAMILY']),
      /promotion:limit_reached_family/));
  });

  await test('a per-person limit stops the same buyer, even in another family', async () => {
    const offer = await sellable(teacher);
    const buyer = await newBuyer('Once Only');
    await campaign('ONCE-EACH', { perUserLimit: 1 });

    await buy(buyer, offer.course, 'ONCE-EACH');

    const second = await sellable(teacher);
    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [second.course, buyer.learnerId, null, 'ONCE-EACH']),
      /promotion:limit_reached_person/));
  });

  await test('a total limit is a total', async () => {
    const one = await sellable(teacher);
    const two = await sellable(teacher);
    const buyer = await newBuyer('First');
    const second = await newBuyer('Second');
    await campaign('ONLY-ONE', { totalLimit: 1 });

    await buy(buyer, one.course, 'ONLY-ONE');
    await withCheckoutOn(() => rejects(
      () => asActor(second.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [two.course, second.learnerId, null, 'ONLY-ONE']),
      /promotion:limit_reached_total/));
  });

  await test('a code cannot make an order free, because a free order cannot settle', async () => {
    const offer = await sellable(teacher, { amount: 25000 });
    const buyer = await newBuyer('Free Seeker');
    await campaign('EVERYTHING', { percent: 100 });

    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [offer.course, buyer.learnerId, null, 'EVERYTHING']),
      /promotion:would_be_free/));

    const orders = await count('select id from public.orders where placed_by = $1', [buyer.userId]);
    assert(orders === 0, 'a refused free order was created anyway');
  });

  await test('a fixed amount is only applied in the currency it is written in', async () => {
    // Written directly, because the campaign writer would refuse to create this
    // pair — which is the point: this guard is the second line of defence.
    const offer = await sellable(teacher, { amount: 30000, currency: 'UGX', market: 'UG' });
    const buyer = await newBuyer('Mismatch');
    const campaignId = (await scalar(
      `insert into public.promotion_campaigns
         (code,name,status,owner_type,created_by)
       values ('WRONG-CURRENCY','Wrong currency','active','platform',$1) returning id`,
      [admin])).id;
    await q(`insert into public.promotion_benefits
               (campaign_id,benefit_type,amount_off_minor,amount_off_currency)
             values ($1,'fixed_amount_off',5000,'KES')`, [campaignId]);

    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [offer.course, buyer.learnerId, null, 'WRONG-CURRENCY']),
      /promotion:currency_mismatch/));
  });

  await test('an order takes one code, and only while it is pending', async () => {
    const offer = await sellable(teacher);
    const buyer = await newBuyer('Twice Coded');
    await campaign('TWICE-CODE');

    const made = await buy(buyer, offer.course, 'TWICE-CODE');

    // The same code again on the same order: refused, not stacked.
    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.apply_promotion_to_order($1,$2)',
        [made.orderId, 'TWICE-CODE']),
      /promotion:already_applied/));

    await q(`select public.record_payment_success($1,$2,'manual','PR-1',null,'Receipt PR-1')`,
      [made.orderId, admin]);
    await withCheckoutOn(() => rejects(
      () => asActor(buyer.userId, 'select public.apply_promotion_to_order($1,$2)',
        [made.orderId, 'TWICE-CODE']),
      /promotion:order_not_pending/));
  });
}
