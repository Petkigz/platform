// Tax and transfer fees, paid by the buyer, at rates that depend on where they are.
//
// The properties that matter:
//
//   - the register wins over nothing, and no rule means no charge — a platform
//     registered nowhere must not invent a tax line;
//   - the precedence is the same one prices use: a country rule beats a global
//     one, a currency rule beats one without;
//   - tax is charged on what the buyer actually pays, so a discount reduces it;
//   - the transfer fee is on the amount moved, which includes the tax;
//   - a computed line cannot be edited or voided by hand;
//   - an order that has been paid keeps the charges it was billed.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('tax-admin@example.com');
  const teacher = await newInstructor('tax-teacher@example.com', admin);
  const reviewer = await newReviewer('tax-reviewer@example.com', admin);

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

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

  let seq = 0;

  /** A rule in the register, added by the owner through the screen's function. */
  async function rule(args) {
    const r = await asActor(admin, 'select public.set_market_charge(' +
      'p_kind => $1, p_country => $2, p_currency => $3, p_label => $4, ' +
      'p_rate_bps => $5, p_fixed_minor => $6, p_min_minor => $7, ' +
      'p_max_minor => $8, p_note => $9) r',
    [args.kind, args.country ?? null, args.currency ?? null, args.label ?? 'Tax',
      args.rateBps ?? 0, args.fixed ?? 0, args.min ?? null, args.max ?? null,
      args.note ?? null]);
    return r.rows[0].r;
  }

  /**
   * Every test owns its rules and cannot leak one into the next.
   *
   * Retirement, not deletion: `order_adjustments.rule_id` is `on delete
   * restrict`, so a rule an order was billed under cannot be removed at all.
   * That is the property, not an inconvenience — a tax line on a paid order has
   * to keep pointing at the rule that produced it, years later, or it is a
   * number with no explanation.
   */
  async function withRules(fn) {
    const retireAll = () => q(
      `update public.market_charges
          set status = 'retired', effective_to = greatest(now(), effective_from)
        where status = 'active'`);
    await retireAll();
    try {
      return await fn();
    } finally {
      await retireAll();
    }
  }

  async function adult(name) {
    seq += 1;
    const userId = await newUser(`tax-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'tax test']);

  async function sellableCourse(
    priceMinor = 30000,
    extra = [{ amount: 900, currency: 'KES', market: 'KE' }],
  ) {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: `Tax Course ${seq}` });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await scalar(
      `insert into public.products (product_type, name, status, created_by)
       values ('course',$1,'active',$2) returning id`,
      [`Tax product ${seq}`, teacher])).id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);
    await q(`insert into public.prices
               (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
             values ($1,$2,'UGX','one_time','active','UG',now())`, [productId, priceMinor]);
    for (const p of extra) {
      await q(`insert into public.prices
                 (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
               values ($1,$2,$3,'one_time','active',$4,now())`,
        [productId, p.amount, p.currency, p.market]);
    }

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version };
  }

  async function withCheckout(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'commerce.checkout'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'commerce.checkout'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'commerce.checkout'`, [before]);
    }
  }

  const quoteAs = async (actor, courseId, learnerId, country) =>
    (await asActor(actor, 'select public.quote_course_order($1,$2,$3) q',
      [courseId, learnerId, country])).rows[0].q;

  const orderAs = async (actor, courseId, learnerId, country, code = null) =>
    (await asActor(actor, 'select public.create_course_order($1,$2,$3,$4) o',
      [courseId, learnerId, country, code])).rows[0].o;

  const totals = async (orderId) => scalar(
    `select subtotal_minor::text, discount_minor::text, tax_minor::text,
            fee_minor::text, total_minor::text
       from public.orders where id = $1`, [orderId]);

  // ---------------------------------------------------------------------------
  // Nothing registered, nothing charged
  // ---------------------------------------------------------------------------
  await test('with no rule in the register, an order has no tax and no fee', async () => withRules(async () => {
    const me = await adult('Untaxed Buyer');
    const { course } = await sellableCourse(30000);
    const order = await withCheckout(() => orderAs(me.userId, course, me.learnerId, 'UG'));

    assert(order.taxMinor === '0', `tax of ${order.taxMinor} with no rule`);
    assert(order.feeMinor === '0', `fee of ${order.feeMinor} with no rule`);
    assert(order.totalMinor === '30000', `total ${order.totalMinor}`);
  }));

  // ---------------------------------------------------------------------------
  // A rule applies to the buyer's country, and only to it
  // ---------------------------------------------------------------------------

  await test('a country rule taxes that country and leaves the others alone', async () => withRules(async () => {
    await rule({ kind: 'tax', country: 'UG', label: 'VAT', rateBps: 1800 });

    const me = await adult('Ugandan Buyer');
    const { course } = await sellableCourse(30000);

    const here = await withCheckout(() => orderAs(me.userId, course, me.learnerId, 'UG'));
    assert(here.taxMinor === '5400', `18% of 30000 came out as ${here.taxMinor}`);
    assert(here.totalMinor === '35400', `total ${here.totalMinor}`);

    // A different learner buys the same course from a country with no rule.
    const other = await adult('Kenyan Buyer');
    const elsewhere = await withCheckout(() => orderAs(other.userId, course, other.learnerId, 'KE'));
    assert(elsewhere.taxMinor === '0', `a Kenyan order was charged Ugandan tax: ${elsewhere.taxMinor}`);
    // The price is Kenyan, so the total is in KES — the point is that nothing
    // was added to it.
    assert(elsewhere.totalMinor === '900', `total ${elsewhere.totalMinor}`);
    assert(elsewhere.currencyCode === 'KES', `currency ${elsewhere.currencyCode}`);
  }));

  await test('a global rule applies everywhere, and a country rule beats it', async () => withRules(async () => {
    await rule({ kind: 'tax', label: 'Sales tax', rateBps: 500 });
    const global = await scalar(`select public.quote_market_charges('NG','NGN',10000) q`);
    assert(global.q.taxMinor === '500', `global 5% of 10000 gave ${global.q.taxMinor}`);

    await rule({ kind: 'tax', country: 'NG', label: 'VAT', rateBps: 750 });
    const overridden = await scalar(`select public.quote_market_charges('NG','NGN',10000) q`);
    assert(overridden.q.taxMinor === '750',
      `the country rule did not beat the global one: ${overridden.q.taxMinor}`);
    assert(overridden.q.tax.label === 'VAT', `label is ${overridden.q.tax.label}`);

    const elsewhere = await scalar(`select public.quote_market_charges('GH','GHS',10000) q`);
    assert(elsewhere.q.taxMinor === '500', 'the global rule stopped applying elsewhere');
  }));

  await test('a fee takes a fixed amount, a floor and a ceiling', async () => withRules(async () => {
    await rule({ kind: 'transfer_fee', country: 'UG', label: 'Mobile money fee',
      rateBps: 100, fixed: 500, min: 500, max: 2000 });

    // 1% of 1,000 is 10, plus 500 fixed is 510 — under the 500 floor is impossible
    // with a fixed part, so this one exercises the arithmetic rather than the clamp.
    const small = await scalar(`select public.quote_market_charges('UG','UGX',1000) q`);
    assert(small.q.feeMinor === '510', `1% + 500 on 1000 gave ${small.q.feeMinor}`);

    // 1% of 1,000,000 is 10,000, plus 500, clamped to 2,000.
    const big = await scalar(`select public.quote_market_charges('UG','UGX',1000000) q`);
    assert(big.q.feeMinor === '2000', `the ceiling was not applied: ${big.q.feeMinor}`);
  }));

  // ---------------------------------------------------------------------------
  // What is taxed
  // ---------------------------------------------------------------------------

  await test('tax is a share of what is actually paid, so a discount reduces it', async () => withRules(async () => {
    await rule({ kind: 'tax', country: 'UG', label: 'VAT', rateBps: 1800 });

    // A 10% campaign, made through the writer the admin screen uses.
    const code = 'TAXTEN';
    await asActor(admin,
      `select public.create_promotion_campaign(
         $1,$2,$3,$4,$5,$6,$7::text[],$8::uuid[],null,null,null,null,false,null) id`,
      [code, 'Ten off', 'percent_off', 10, null, null, [], []]);
    await q(`update public.promotion_campaigns set status = 'active' where code = $1`, [code]);

    const me = await adult('Discounted Buyer');
    const { course } = await sellableCourse(30000);
    const order = await withCheckout(() => orderAs(me.userId, course, me.learnerId, 'UG', code));

    const t = await totals(order.orderId);
    assert(t.discount_minor === '3000', `discount ${t.discount_minor}`);
    // 18% of 27,000, not of 30,000.
    assert(t.tax_minor === '4860', `tax ${t.tax_minor} — was it charged on the list price?`);
    assert(t.total_minor === '31860', `total ${t.total_minor}`);
  }));

  await test('the transfer fee is charged on the amount being moved, tax included', async () => withRules(async () => {
    await rule({ kind: 'tax', country: 'UG', label: 'VAT', rateBps: 1800 });
    await rule({ kind: 'transfer_fee', country: 'UG', label: 'Payment fee', rateBps: 100 });

    const quoted = await scalar(`select public.quote_market_charges('UG','UGX',10000) q`);
    assert(quoted.q.taxMinor === '1800', `tax ${quoted.q.taxMinor}`);
    // 1% of 11,800, not of 10,000.
    assert(quoted.q.feeMinor === '118', `fee ${quoted.q.feeMinor}`);
    assert(quoted.q.totalMinor === '11918', `total ${quoted.q.totalMinor}`);
  }));

  // ---------------------------------------------------------------------------
  // The preview and the charge agree
  // ---------------------------------------------------------------------------

  await test('the quote shows the same tax the order will charge', async () => withRules(async () => {
    await rule({ kind: 'tax', country: 'UG', label: 'VAT', rateBps: 1800 });
    await rule({ kind: 'transfer_fee', country: 'UG', label: 'Payment fee', rateBps: 100 });

    const me = await adult('Quoted Buyer');
    const { course } = await sellableCourse(30000);

    const quote = await withCheckout(() => quoteAs(me.userId, course, me.learnerId, 'UG'));
    const order = await withCheckout(() => orderAs(me.userId, course, me.learnerId, 'UG'));

    assert(quote.taxMinor === order.taxMinor,
      `quote tax ${quote.taxMinor}, order tax ${order.taxMinor}`);
    assert(quote.feeMinor === order.feeMinor,
      `quote fee ${quote.feeMinor}, order fee ${order.feeMinor}`);
    assert(quote.totalMinor === order.totalMinor,
      `quote total ${quote.totalMinor}, order total ${order.totalMinor}`);
    assert(quote.chargeLabels.tax === 'VAT', `label ${quote.chargeLabels.tax}`);
  }));

  // ---------------------------------------------------------------------------
  // A computed line is not editable
  // ---------------------------------------------------------------------------

  await test('a calculated tax line cannot be voided or edited by hand', async () => withRules(async () => {
    await rule({ kind: 'tax', country: 'UG', label: 'VAT', rateBps: 1800 });

    const me = await adult('Protected Buyer');
    const { course } = await sellableCourse(30000);
    const order = await withCheckout(() => orderAs(me.userId, course, me.learnerId, 'UG'));

    const taxRow = await scalar(
      `select id from public.order_adjustments
        where order_id = $1 and adjustment_type = 'tax' and rule_id is not null`,
      [order.orderId]);
    assert(taxRow !== undefined, 'the tax was not written as a rule-backed adjustment');

    await rejects(() => q(
      `update public.order_adjustments
          set amount_minor = 1
        where id = $1`, [taxRow.id]),
      'a calculated tax line was edited by hand');

    await rejects(() => q(
      `update public.order_adjustments
          set voided_at = now(), voided_reason = 'waived'
        where id = $1`, [taxRow.id]),
      'a calculated tax line was voided by hand');
  }));

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  await test('a paid order keeps the charges it was billed, whatever the register says next', async () => withRules(async () => {
    await rule({ kind: 'tax', country: 'UG', label: 'VAT', rateBps: 1800 });

    const me = await adult('Paying Buyer');
    const { course } = await sellableCourse(30000);
    const order = await withCheckout(() => orderAs(me.userId, course, me.learnerId, 'UG'));
    const before = await totals(order.orderId);

    await q(`select public.record_payment_success($1,$2,'test','tax-test-ref',null,$3)`,
      [order.orderId, admin, 'verified in the tax suite']);

    // The register changes afterwards — a rate cut, a new rule. The paid order
    // must not move: a ledger row exists for 35,400.
    await q(`update public.market_charges
                set status = 'retired', effective_to = greatest(now(), effective_from)
              where status = 'active'`);
    await rule({ kind: 'tax', country: 'UG', label: 'VAT', rateBps: 200 });

    const refreshed = await scalar('select public.refresh_order_charges($1) r',
      [order.orderId]);
    assert(refreshed.r.skipped === true, 'a paid order was recalculated');

    const after = await totals(order.orderId);
    assert(after.tax_minor === before.tax_minor, `tax moved from ${before.tax_minor} to ${after.tax_minor}`);
    assert(after.total_minor === before.total_minor,
      `total moved from ${before.total_minor} to ${after.total_minor}`);
  }));

  await test('a retired rule stops applying to new orders and keeps its history', async () => withRules(async () => {
    const first = await rule({ kind: 'tax', country: 'UG', label: 'VAT', rateBps: 1800 });
    await rejects(() => asActor(admin, 'select public.retire_market_charge($1,$2)', [first.id, '']),
      'a rule was retired without a reason');

    const retired = (await asActor(admin, 'select public.retire_market_charge($1,$2) r',
      [first.id, 'Rate cut'])).rows[0].r;
    assert(retired.status === 'retired', `status ${retired.status}`);
    assert(retired.effective_to !== null, 'a retired rule has no end date');

    const quoted = await scalar(`select public.quote_market_charges('UG','UGX',10000) q`);
    assert(quoted.q.taxMinor === '0', 'a retired rule still charged');

    // And the history is still readable.
    const kept = await scalar('select label, rate_bps from public.market_charges where id = $1',
      [first.id]);
    assert(kept !== undefined, 'the retired rule was deleted');
  }));

  // ---------------------------------------------------------------------------
  // Who may change a rate
  // ---------------------------------------------------------------------------

  await test('only a finance or platform admin may set a rate', async () => withRules(async () => {
    const me = await adult('Ordinary User');
    await rejects(() => asActor(me.userId,
      `select public.set_market_charge(p_kind => 'tax', p_country => 'UG',
        p_label => 'Mine', p_rate_bps => 1)`),
      'an ordinary user wrote a tax rule');

    await rejects(() => asActor(me.userId,
      'select public.retire_market_charge($1,$2)', [admin, 'nope']),
      'an ordinary user retired a rule');

    assert((await scalar(
      `select count(*)::int n from public.market_charges where status = 'active'`)).n === 0,
      'a refused write still produced a rule');
  }));
}
