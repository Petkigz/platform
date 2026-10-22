// Taking a code off an order before it is paid.
//
// The redemption was written when the order was made, and the table has refused every
// update and delete since it existed — deliberately, because the row is the record of
// what was applied at checkout. These tests hold the narrow exception to that: a row can
// be voided once, with a reason, and nothing else about it can change. They also hold the
// consequence that matters to a family: a code taken off is a code not spent.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('removal-admin@example.com');
  const teacher = await newInstructor('removal-teacher@example.com', admin);
  const reviewer = await newReviewer('removal-reviewer@example.com', admin);

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
      [versionId, status, actor, 'promotion removal test']);
  }

  let seq = 0;
  async function sellable(author, over = {}) {
    seq += 1;
    const course = await newCourse(author, { status: 'active', title: `Removal Course ${seq}` });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await scalar(
      `insert into public.products (product_type, name, status, created_by)
       values ('course',$1,'active',$2) returning id`,
      [`Removal product ${seq}`, author])).id;
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

  async function buyer(name, country = 'UG') {
    seq += 1;
    const userId = await newUser(`removal-buyer-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    const accountId = (await scalar(
      `insert into public.billing_accounts
         (display_name, billing_currency, billing_country, status, created_by)
       values ($1,$2,$3,'active',$4) returning id`,
      [name, country === 'KE' ? 'KES' : 'UGX', country, userId])).id;
    return { userId, learnerId, accountId, name, country };
  }

  async function campaign(code, over = {}) {
    const id = (await asActor(admin,
      `select public.create_promotion_campaign(
         $1,$2,$3,$4,$5,$6,$7::text[],$8::uuid[],null,null,$9,$10,false,$11) id`,
      [code, over.name ?? `Offer ${code}`, 'percent_off', over.percent ?? 20,
       null, null, over.markets ?? [], over.courses ?? [],
       over.totalLimit ?? null, over.perUserLimit ?? null,
       over.perFamilyLimit ?? null])).rows[0].id;
    await asActor(admin, `select public.set_promotion_campaign_status($1,'active')`, [id]);
    return id;
  }

  const buy = (person, courseId, code = null) =>
    withCheckoutOn(() => asActor(person.userId,
      'select public.create_course_order($1,$2,$3,$4) r',
      [courseId, person.learnerId, person.country, code]).then((r) => r.rows[0].r));

  const remove = (person, orderId) =>
    withCheckoutOn(() => asActor(person.userId,
      'select public.remove_promotion_from_order($1) r', [orderId]).then((r) => r.rows[0].r));

  await test('taking the code off puts the order back to its list price', async () => {
    const offer = await sellable(teacher, { amount: 30000 });
    const person = await buyer('Changed My Mind');
    await campaign('REM-TWENTY');

    const made = await buy(person, offer.course, 'REM-TWENTY');
    assert(made.discountMinor === '6000', `discount was ${made.discountMinor}`);
    const before = await scalar(
      'select subtotal_minor, discount_minor, total_minor from public.orders where id = $1',
      [made.orderId]);
    assert(String(before.total_minor) === '24000');

    const removed = await remove(person, made.orderId);
    assert(removed.code === 'REM-TWENTY');
    assert(removed.removedMinor === '6000', `removed ${removed.removedMinor}`);
    assert(removed.totalMinor === '30000', `total after removal ${removed.totalMinor}`);

    const after = await scalar(
      'select subtotal_minor, discount_minor, total_minor from public.orders where id = $1',
      [made.orderId]);
    assert(String(after.discount_minor) === '0', 'a discount survived its removal');
    assert(String(after.total_minor) === '30000', `the total is ${after.total_minor}`);

    assert(await count('select id from public.order_adjustments where order_id = $1',
      [made.orderId]) === 0, 'the withdrawn adjustment is still on the order');

    const redemption = await scalar(
      `select voided_at, voided_by, voided_reason from public.promotion_redemptions
        where order_id = $1`, [made.orderId]);
    assert(redemption.voided_at, 'the redemption was not voided');
    assert(redemption.voided_by === person.userId, 'the void does not name who did it');
    assert(/taken off/.test(redemption.voided_reason ?? ''), redemption.voided_reason);

    const audit = await scalar(
      `select actor, detail from public.governance_audit_events
        where action = 'promotion.removed' and target_id = $1`, [made.orderId]);
    assert(audit.actor === person.userId, 'the removal was not attributed');
    assert(audit.detail.code === 'REM-TWENTY');
  });

  await test('a redeemed-then-removed code is not spent', async () => {
    // One use per family. Take it off the first order, and the same family can use it
    // on the second — which is the whole point of voiding rather than hiding the row.
    const offer = await sellable(teacher);
    const second = await sellable(teacher);
    const person = await buyer('One Per Family');
    await campaign('REM-FAMILY-ONE', { perFamilyLimit: 1 });

    const first = await buy(person, offer.course, 'REM-FAMILY-ONE');
    assert(first.discountMinor === '6000');

    await remove(person, first.orderId);
    const again = await buy(person, second.course, 'REM-FAMILY-ONE');
    assert(again.discountMinor === '6000',
      'the family limit still counted a code that was taken off');

    // And it is genuinely live again: a second use on top of the new one is refused.
    const third = await sellable(teacher);
    await withCheckoutOn(() => rejects(
      () => asActor(person.userId, 'select public.create_course_order($1,$2,$3,$4)',
        [third.course, person.learnerId, person.country, 'REM-FAMILY-ONE']),
      /promotion:limit_reached_family/));
  });

  await test('removing when there is nothing to remove says so', async () => {
    const offer = await sellable(teacher);
    const person = await buyer('No Code');
    await campaign('REM-ONCE');

    const plain = await buy(person, offer.course);
    await withCheckoutOn(() => rejects(
      () => asActor(person.userId, 'select public.remove_promotion_from_order($1)',
        [plain.orderId]),
      /promotion:none_applied/));

    // And a second removal on the order that did take a code is the same refusal: the
    // adjustment is gone, so there is nothing left to take off.
    const other = await sellable(teacher);
    const coded = await buy(person, other.course, 'REM-ONCE');
    await remove(person, coded.orderId);
    await withCheckoutOn(() => rejects(
      () => asActor(person.userId, 'select public.remove_promotion_from_order($1)',
        [coded.orderId]),
      /promotion:none_applied/));
  });

  await test('once it is paid, the code stays: that is a refund, not a re-price', async () => {
    const offer = await sellable(teacher);
    const person = await buyer('Already Paid');
    await campaign('REM-PAID');

    const made = await buy(person, offer.course, 'REM-PAID');
    await q(`select public.record_payment_success($1,$2,'manual','REM-PR-1',null,'Receipt REM-PR-1')`,
      [made.orderId, admin]);

    await withCheckoutOn(() => rejects(
      () => asActor(person.userId, 'select public.remove_promotion_from_order($1)',
        [made.orderId]),
      /promotion:order_not_pending/));

    const order = await scalar(
      'select discount_minor, total_minor from public.orders where id = $1', [made.orderId]);
    assert(String(order.discount_minor) === '6000', 'a paid order lost its discount');
    assert(String(order.total_minor) === '24000', 'a paid order was re-priced');
  });

  await test('only the family that pays for the order may change it', async () => {
    const offer = await sellable(teacher);
    const owner = await buyer('Pays For It');
    const stranger = await buyer('Not Mine');
    await campaign('REM-NOT-YOURS');

    const made = await buy(owner, offer.course, 'REM-NOT-YOURS');

    await withCheckoutOn(() => rejects(
      () => asActor(stranger.userId, 'select public.remove_promotion_from_order($1)',
        [made.orderId]),
      /promotion:not_your_order/));

    const order = await scalar(
      'select discount_minor from public.orders where id = $1', [made.orderId]);
    assert(String(order.discount_minor) === '6000', 'a stranger removed somebody else’s discount');
  });

  await test('a redemption is append-only, and a void is the one way it ends', async () => {
    const offer = await sellable(teacher);
    const person = await buyer('Record Keeper');
    await campaign('REM-APPEND');

    const made = await buy(person, offer.course, 'REM-APPEND');
    const redemption = await scalar(
      'select id, benefit_snapshot from public.promotion_redemptions where order_id = $1',
      [made.orderId]);

    // The terms are not editable, by anybody, before or after a void.
    await rejects(() => q(
      `update public.promotion_redemptions set benefit_snapshot = '{}'::jsonb where id = $1`,
      [redemption.id]), /append-only/);
    await rejects(() => q('delete from public.promotion_redemptions where id = $1',
      [redemption.id]), /append-only/);

    await remove(person, made.orderId);

    // Nor is a void edited, or repeated.
    await rejects(() => q(
      `update public.promotion_redemptions set voided_reason = 'changed' where id = $1`,
      [redemption.id]), /append-only/);
    await rejects(() => q(
      `update public.promotion_redemptions set voided_at = now() where id = $1`,
      [redemption.id]), /append-only/);

    // A void with no reason is not a void: the constraint and the trigger both refuse it.
    const unsaid = await buy(await buyer('No Reason'), (await sellable(teacher)).course, 'REM-APPEND');
    await rejects(() => q(
      `update public.promotion_redemptions set voided_at = now(), voided_by = $2 where order_id = $1`,
      [unsaid.orderId, person.userId]), /pr_void_agrees|append-only/);
  });
}
