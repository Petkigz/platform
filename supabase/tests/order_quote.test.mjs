// What would this cost? — the quote, before any order exists.
//
// The point of the quote is that it answers the question the checkout already answers
// without doing anything the checkout does. So the tests hold both halves of that: the
// numbers agree with the order exactly, and asking leaves no order, no account and no
// redemption behind. The third thing held here is the limits: previewing a limited code
// must not spend it.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('quote-admin@example.com');
  const teacher = await newInstructor('quote-teacher@example.com', admin);
  const reviewer = await newReviewer('quote-reviewer@example.com', admin);

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
      [versionId, status, actor, 'quote test']);
  }

  let seq = 0;
  async function sellable(author, over = {}) {
    seq += 1;
    const course = await newCourse(author, { status: 'active', title: `Quote Course ${seq}` });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await scalar(
      `insert into public.products (product_type, name, status, created_by)
       values ('course',$1,'active',$2) returning id`,
      [`Quote product ${seq}`, author])).id;
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

  /** A signed-in adult learner: no billing account, which is the first-purchase case. */
  async function bareLearner(name, country = 'UG') {
    seq += 1;
    const userId = await newUser(`quote-learner-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name, country };
  }

  /** The same, with a billing account that names a country. */
  async function buyer(name, country = 'UG') {
    const person = await bareLearner(name, country);
    await q(`insert into public.billing_accounts
               (display_name, billing_currency, billing_country, status, created_by)
             values ($1,$2,$3,'active',$4)`,
    [name, country === 'KE' ? 'KES' : 'UGX', country, person.userId]);
    return person;
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

  // The country is what the route reads from the request headers and passes in; a
  // person with a billing account overrides it with the account's recorded country.
  const quote = (person, courseId, code = null, country = person.country) =>
    withCheckoutOn(() => asActor(person.userId,
      'select public.quote_course_order($1,$2,$3,$4) r',
      [courseId, person.learnerId, country, code]).then((r) => r.rows[0].r));

  const quoteRejects = (person, courseId, code, pattern, country = person.country) =>
    withCheckoutOn(() => rejects(
      () => asActor(person.userId, 'select public.quote_course_order($1,$2,$3,$4)',
        [courseId, person.learnerId, country, code]),
      pattern));

  const buy = (person, courseId, code = null, country = person.country) =>
    withCheckoutOn(() => asActor(person.userId,
      'select public.create_course_order($1,$2,$3,$4) r',
      [courseId, person.learnerId, country, code]).then((r) => r.rows[0].r));

  await test('a quote reports the list price when no code is given', async () => {
    const offer = await sellable(teacher, { amount: 30000 });
    const person = await buyer('Paying Full');

    const quoted = await quote(person, offer.course);

    assert(quoted.listMinor === '30000', `list ${quoted.listMinor}`);
    assert(quoted.discountMinor === '0', `discount ${quoted.discountMinor}`);
    assert(quoted.totalMinor === '30000', `total ${quoted.totalMinor}`);
    assert(quoted.currencyCode === 'UGX');
    assert(quoted.promotionCode === null, 'a code appeared from nowhere');
    assert(quoted.reserved === false, 'the quote claimed to reserve something');
  });

  await test('the quote and the order agree, to the shilling', async () => {
    const offer = await sellable(teacher, { amount: 33333 });
    const person = await buyer('Discount Preview');
    await campaign('QUOTE-TWENTY', { percent: 20 });

    const quoted = await quote(person, offer.course, 'quote-twenty');
    assert(quoted.discountMinor === '6667', `quote took off ${quoted.discountMinor}`);
    assert(quoted.totalMinor === '26666', `quote total ${quoted.totalMinor}`);
    assert(quoted.promotionCode === 'QUOTE-TWENTY');

    const made = await buy(person, offer.course, 'QUOTE-TWENTY');
    assert(made.discountMinor === quoted.discountMinor,
      `the order took off ${made.discountMinor} after a quote of ${quoted.discountMinor}`);

    const order = await scalar(
      'select subtotal_minor, discount_minor, total_minor from public.orders where id = $1',
      [made.orderId]);
    assert(String(order.total_minor) === quoted.totalMinor,
      `the order totals ${order.total_minor} after a quote of ${quoted.totalMinor}`);
  });

  await test('asking the price creates no order, no account and no redemption', async () => {
    const offer = await sellable(teacher);
    const person = await bareLearner('Just Looking');
    await campaign('QUOTE-LOOK-FIRST');

    const quoted = await quote(person, offer.course, 'QUOTE-LOOK-FIRST');
    assert(quoted.discountMinor === '6000', `quote took off ${quoted.discountMinor}`);

    assert(await count('select id from public.orders where placed_by = $1', [person.userId]) === 0,
      'a quote created an order');
    assert(await count(
      'select id from public.billing_accounts where created_by = $1', [person.userId]) === 0,
    'a quote opened a billing account');
    assert(await count(
      `select id from public.promotion_redemptions
        where campaign_id = (select id from public.promotion_campaigns where code = 'QUOTE-LOOK-FIRST')`)
      === 0, 'a quote spent a redemption');
    assert(await count(
      `select id from public.governance_audit_events
        where action = 'commerce.course_order_created' and actor = $1`, [person.userId]) === 0,
    'a quote wrote an order audit row');

    // A first purchase has no account yet, and the quote says so rather than inventing one.
    assert(quoted.billingAccountId === null, 'a quote invented a billing account');
  });

  await test('previewing a limited code does not spend it', async () => {
    const offer = await sellable(teacher);
    const first = await buyer('One Left');
    const second = await buyer('Locked Out');
    await campaign('QUOTE-LAST-ONE', { totalLimit: 1 });

    const preview = await quote(first, offer.course, 'QUOTE-LAST-ONE');
    assert(preview.discountMinor === '6000');
    // Twice, because a page refresh must not be the thing that sells the last one.
    await quote(first, offer.course, 'QUOTE-LAST-ONE');
    assert(await count(
      `select id from public.promotion_redemptions
        where campaign_id = (select id from public.promotion_campaigns where code = 'QUOTE-LAST-ONE')`)
      === 0, 'a preview spent the campaign');

    const made = await buy(first, offer.course, 'QUOTE-LAST-ONE');
    assert(made.discountMinor === '6000', 'the code was gone by the time the order was made');

    await quoteRejects(second, offer.course, 'QUOTE-LAST-ONE', /promotion:limit_reached_total/);
  });

  await test('a quote refuses what the order would refuse, and leaves nothing behind', async () => {
    const offer = await sellable(teacher, { market: 'UG', currency: 'UGX', amount: 30000 });
    const person = await buyer('Refused Preview');

    await quoteRejects(person, offer.course, 'NO-SUCH-CODE', /promotion:unknown_code/);

    await campaign('QUOTE-DRAFT', { status: 'draft' });
    await quoteRejects(person, offer.course, 'QUOTE-DRAFT', /promotion:not_active/);

    // A code written for a different course.
    const other = await sellable(teacher);
    await campaign('QUOTE-OTHER', { courses: [other.course] });
    await quoteRejects(person, offer.course, 'QUOTE-OTHER', /promotion:not_for_this_course/);

    // A code aimed at another country. Sold in both, or the refusal would be about
    // the price and the market check would never run.
    await q(`insert into public.prices
               (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
             values ($1,900,'KES','one_time','active','KE',now())`, [offer.productId]);
    await campaign('QUOTE-KENYA', { markets: ['KE'] });
    await quoteRejects(person, offer.course, 'QUOTE-KENYA', /promotion:not_in_market/);

    assert(await count('select id from public.orders where placed_by = $1', [person.userId]) === 0,
      'a refused quote left an order behind');
    assert(await count(
      `select id from public.promotion_redemptions
        where campaign_id in (select id from public.promotion_campaigns
                               where code in ('QUOTE-DRAFT','QUOTE-OTHER','QUOTE-KENYA'))`)
      === 0, 'a refused quote redeemed something');
  });

  await test('a quote is refused for somebody else’s learner, and for a course already owned', async () => {
    const offer = await sellable(teacher);
    const owner = await buyer('Someone Else');
    const stranger = await buyer('Not Yours');

    await withCheckoutOn(() => rejects(
      () => asActor(stranger.userId, 'select public.quote_course_order($1,$2,null,null)',
        [offer.course, owner.learnerId]),
      /checkout:learner_not_yours/));

    // Buy it and pay, then ask about it again: the answer is that there is nothing
    // left to sell. An unpaid order grants nothing, so the payment is what makes the
    // learner's access exist.
    const made = await buy(owner, offer.course);
    assert(made.orderId, 'the fixture order was not created');
    await q(`select public.record_payment_success($1,$2,'manual','QUOTE-PR-1',null,'Receipt QUOTE-PR-1')`,
      [made.orderId, admin]);
    await withCheckoutOn(() => rejects(
      () => asActor(owner.userId, 'select public.quote_course_order($1,$2,null,null)',
        [offer.course, owner.learnerId]),
      /checkout:already_owned/));
  });

  await test('a quote for a course with no price in the buyer’s country is refused', async () => {
    const offer = await sellable(teacher, { market: 'KE', currency: 'KES', amount: 900 });
    const ugandan = await buyer('No Price Here', 'UG');

    await quoteRejects(ugandan, offer.course, null, /checkout:no_price_for_country/);
  });

  await test('a quote needs a signed-in buyer, and the checkout switched on', async () => {
    const offer = await sellable(teacher);
    const person = await buyer('Closed Shop');

    // Nobody signed in. Asked as the superuser, which is the one seat with no session.
    await withCheckoutOn(() => rejects(
      () => q('select public.quote_course_order($1,$2,null,null)', [offer.course, person.learnerId]),
      /checkout:not_signed_in/));

    // Signed in, but commerce.checkout is off — and the quote says so rather than
    // pricing something the platform will not sell.
    await rejects(() => asActor(person.userId,
      'select public.quote_course_order($1,$2,null,null)', [offer.course, person.learnerId]),
    /checkout:disabled/);
  });
}
