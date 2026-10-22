// Unit 20 — an order is created by the platform, not by the browser.
//
// `orders_insert` and `order_items_insert` (20261020000400_rls.sql) asked only
// "is this person a member of the billing account?". A payer is, so a payer
// could write the money rows themselves: an order for 50000 with a line item
// pointing at any product in the catalogue, unit price 0, satisfying both
// `orders_totals_agree` and `oi_line_total_agrees`. `record_payment_success()`
// fulfils from `order_items.product_id`, so paying the real total bought
// whatever product the payer had named. The price never had to exist.
//
// Everything here is measured as the `authenticated` role with a JWT subject,
// because that is the only seat the exploit was reachable from. The interesting
// assertions are the refusals: a direct insert that used to work, and a definer
// writer that still does after its insert policies are gone.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile,
    newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('co-admin@example.com');
  const teacher  = await newInstructor('co-teacher@example.com', admin);
  const reviewer = await newReviewer('co-reviewer@example.com', admin);

  /** Act as a user and COMMIT, so a later block can act on what was created. */
  async function asActor(actor, sql, params) {
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

  const scalar = async (sql, params) => (await q(sql, params)).rows[0];
  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'course order test']);

  /**
   * `commerce.checkout` ships off, so every test that expects the writer to
   * work has to turn it on — and put it back. It is a single global row, and
   * flags.test.mjs asserts the seeded value, so a suite that left it flipped
   * would fail somewhere else entirely.
   */
  async function withCheckoutOn(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'commerce.checkout'`
    ))?.value_text ?? 'false';
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'commerce.checkout'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'commerce.checkout'`, [before]);
    }
  }

  let buyerSeq = 0;
  async function newBuyer(name) {
    buyerSeq += 1;
    const userId = await newUser(`co-buyer-${buyerSeq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId, name };
  }

  /**
   * A published course behind an active product with one live one-time price.
   * This is the whole offer the writer is allowed to see; nothing about it is
   * taken from the caller.
   */
  async function sellableCourse(over = {}) {
    const course  = await newCourse(teacher, { status: 'active', title: over.title ?? 'Sold Course' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course',$1,'active',$2) returning id`,
      [over.productName ?? 'Sold Course product', teacher])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);
    const priceId = (await q(
      `insert into public.prices
         (product_id, amount_minor, currency_code, billing_interval, status,
          effective_from, effective_until)
       values ($1,$2,$3,'one_time',$4,coalesce($5, now()),$6) returning id`,
      [productId,
       over.amountMinor ?? 30000,
       over.currency ?? 'UGX',
       over.priceStatus ?? 'active',
       over.effectiveFrom ?? null,
       over.effectiveUntil ?? null])).rows[0].id;

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    return { course, version, productId, priceId };
  }

  const callWriter = (actor, courseId, country = null) =>
    asActor(actor, 'select public.create_course_order($1,$2) as r', [courseId, country]);

  // ---------------------------------------------------------------------
  // The shape of the writer
  // ---------------------------------------------------------------------

  await test('the writer takes a course and the country the request came from', async () => {
    const args = (await scalar(
      `select pg_get_function_arguments('public.create_course_order(uuid,text)'::regprocedure) as a`
    )).a;
    assert(args === 'p_course_id uuid, p_buyer_country text DEFAULT NULL::text',
      `the writer accepts '${args}' — an amount, a price or a billing account ` +
      `in this list would be a thing the caller gets to choose`);

    const n = (await scalar(
      `select count(*)::int n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
        where ns.nspname = 'public' and p.proname = 'create_course_order'`)).n;
    assert(n === 1, `${n} overloads of create_course_order — an old signature would still be callable`);
  });

  await test('the writer is callable by a signed-in payer and by nobody else', async () => {
    const row = await scalar(
      `select p.proacl::text as acl,
              has_function_privilege('anon'::name, p.oid, 'execute'::text) as anon_may,
              has_function_privilege('authenticated'::name, p.oid, 'execute'::text) as auth_may
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'create_course_order'`);
    assert(row.auth_may === true, 'a signed-in payer cannot call the writer');
    assert(row.anon_may === false, 'an anonymous caller can call the writer');
    // A PUBLIC grant shows up in the ACL as an entry with no grantee before the
    // '=', which is exactly what `revoke all ... from public` removes.
    assert(!/(^\{|,)=[^,]*X/.test(row.acl),
      `the writer is still executable by PUBLIC: ${row.acl}`);
  });

  await test('the client-side insert policies are gone and the reads are not', async () => {
    const rows = (await q(
      `select c.relname, p.polname
         from pg_policy p join pg_class c on c.oid = p.polrelid
        where c.relname in ('orders','order_items','order_adjustments')
        order by c.relname, p.polname`)).rows;
    const names = rows.map((r) => `${r.relname}.${r.polname}`);

    for (const gone of ['orders.orders_insert', 'order_items.order_items_insert']) {
      assert(!names.includes(gone),
        `${gone} still exists: a billing member can still write that row directly`);
    }
    for (const kept of ['orders.orders_read', 'order_items.order_items_read',
                        'order_adjustments.order_adjustments_read']) {
      assert(names.includes(kept), `${kept} was dropped with the insert policy`);
    }
  });

  // ---------------------------------------------------------------------
  // The exploit, closed
  // ---------------------------------------------------------------------

  await test('a billing member can no longer write an order or add a line to one', async () => {
    const offer = await sellableCourse({ amountMinor: 50000 });
    const bonus = await sellableCourse({ amountMinor: 60000, title: 'Expensive Course' });
    const buyer = await newBuyer('Direct Insert');

    // A real order, created the only way one can be now.
    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    const orderId = made.rows[0].r.orderId;
    const account = made.rows[0].r.billingAccountId;

    // Half the exploit: write the order yourself, at a total you chose.
    // One asUser block per raising statement — the first refusal aborts its
    // transaction, and a second statement in the same block then reports the
    // aborted transaction rather than the policy.
    await asUser(buyer.userId, () => rejects(
      () => q(`insert into public.orders
                 (billing_account_id, currency_code, subtotal_minor, discount_minor,
                  tax_minor, total_minor, status)
               values ($1,'UGX',50000,0,0,50000,'pending_payment')`, [account]),
      /row-level security/i));

    // The other half, and the one that actually cost money: add a second line
    // to a real pending order naming a different product, at zero. Both CHECKs
    // on order_items are satisfied by it (0 = 0 * 1 - 0), the order total is
    // unchanged, and record_payment_success() fulfils every line on the order —
    // so paying for the first course would have delivered the second free.
    await asUser(buyer.userId, () => rejects(
      () => q(`insert into public.order_items
                 (order_id, product_id, quantity, unit_price_minor, currency_code,
                  discount_minor, line_total_minor, item_snapshot)
               values ($1,$2,1,0,'UGX',0,0,'{}')`, [orderId, bonus.productId]),
      /row-level security/i));

    const lines = await count('select id from public.order_items where order_id = $1', [orderId]);
    assert(lines === 1, `${lines} lines on the order — the extra one got through`);
    const orders = await count(
      'select id from public.orders where billing_account_id = $1', [account]);
    assert(orders === 1, `${orders} orders on the account — the direct insert got through`);
  });

  await test('a payer cannot write a discount onto their own order', async () => {
    const offer = await sellableCourse();
    const buyer = await newBuyer('Adjuster');

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    const orderId = made.rows[0].r.orderId;

    // order_adjustments_insert asked the same question as the two policies
    // dropped above, so a customer could put a discount on their own order.
    // 20261225000100_order_adjustment_writer.sql drops it: add_order_adjustment()
    // is the only way in, and it is finance-only.
    await asUser(buyer.userId, () => rejects(
      () => q(`insert into public.order_adjustments
                 (order_id, adjustment_type, direction, amount_minor, currency_code, description)
               values ($1,'manual_discount','credit',50000,'UGX','asked nicely')`, [orderId]),
      /row-level security/i));

    const back = await scalar(
      'select total_minor, discount_minor, subtotal_minor from public.orders where id = $1',
      [orderId]);
    assert(Number(back.total_minor) === 30000,
      `the total moved to ${back.total_minor}`);
    assert(Number(back.discount_minor) === 0,
      `the discount moved to ${back.discount_minor}`);
  });

  // ---------------------------------------------------------------------
  // The writer works
  // ---------------------------------------------------------------------

  await test('a payer with no billing account gets an order, a line and an account', async () => {
    const offer = await sellableCourse({ amountMinor: 42500 });
    const buyer = await newBuyer('First Purchase');

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    const r = made.rows[0].r;

    assert(typeof r.orderId === 'string' && r.orderId.length > 0, 'no order id came back');
    assert(r.amountMinor === '42500',
      `amountMinor is ${JSON.stringify(r.amountMinor)}, expected the string '42500' — ` +
      `a JSON number here is where a bigint stops being exact`);
    assert(r.currencyCode === 'UGX', `currency is ${r.currencyCode}`);
    assert(r.productId === offer.productId, 'the writer picked a different product');
    assert(r.courseVersionId === offer.version, 'the writer picked a different version');
    assert(r.priceId === offer.priceId, 'the writer did not record the price it used');

    const order = await scalar(
      `select billing_account_id, currency_code, subtotal_minor, discount_minor,
              tax_minor, total_minor, status, placed_by, placed_at, paid_at
         from public.orders where id = $1`, [r.orderId]);
    assert(order.status === 'pending_payment', `the order is '${order.status}'`);
    assert(Number(order.total_minor) === 42500, `total is ${order.total_minor}`);
    assert(Number(order.subtotal_minor) === 42500, `subtotal is ${order.subtotal_minor}`);
    assert(Number(order.discount_minor) === 0 && Number(order.tax_minor) === 0,
      'the writer invented a discount or a tax');
    assert(order.placed_by === buyer.userId, 'the order does not record who placed it');
    assert(order.placed_at, 'the order is not marked as placed');
    assert(!order.paid_at, 'a pending order is already marked paid');

    const account = await scalar(
      `select display_name, billing_currency, status, created_by
         from public.billing_accounts where id = $1`, [order.billing_account_id]);
    assert(account.created_by === buyer.userId, 'the account was not created for the payer');
    assert(account.billing_currency === 'UGX',
      `the account bills in ${account.billing_currency} but the order is in ${order.currency_code}`);
    assert(account.display_name === 'First Purchase',
      `the account is called '${account.display_name}', not the payer's name`);

    const member = await scalar(
      `select status, can_manage_payment_methods from public.billing_account_memberships
        where billing_account_id = $1 and user_id = $2`, [order.billing_account_id, buyer.userId]);
    assert(member && member.status === 'active', 'the payer is not a member of their own account');
    assert(member.can_manage_payment_methods === true,
      'the payer cannot manage payment methods on the account the writer opened');

    const lines = (await q(
      `select product_id, price_id, quantity, unit_price_minor, currency_code,
              discount_minor, line_total_minor, item_snapshot
         from public.order_items where order_id = $1`, [r.orderId])).rows;
    assert(lines.length === 1, `${lines.length} line items — one course purchase is one line`);
    const line = lines[0];
    assert(line.product_id === offer.productId, 'the line names a different product');
    assert(line.price_id === offer.priceId, 'the line does not name the price it was charged at');
    assert(line.quantity === 1, `quantity is ${line.quantity}`);
    assert(Number(line.unit_price_minor) === 42500, `unit price is ${line.unit_price_minor}`);
    assert(Number(line.line_total_minor) === 42500, `line total is ${line.line_total_minor}`);
    assert(line.currency_code === order.currency_code, 'the line is in another currency');

    // /orders renders item_snapshot.title, so the keys are an interface, not
    // an implementation detail.
    const snap = typeof line.item_snapshot === 'string'
      ? JSON.parse(line.item_snapshot) : line.item_snapshot;
    for (const key of ['title', 'course_id', 'course_version_id', 'billing_interval', 'priced_at']) {
      assert(key in snap, `item_snapshot is missing '${key}'`);
    }
    assert(snap.course_id === offer.course, 'the snapshot names another course');
    assert(snap.course_version_id === offer.version, 'the snapshot names another version');
    assert(snap.billing_interval === 'one_time', `the snapshot says '${snap.billing_interval}'`);

    const audit = await scalar(
      `select actor, detail from public.governance_audit_events
        where action = 'commerce.course_order_created' and target_id = $1`, [r.orderId]);
    assert(audit && audit.actor === buyer.userId, 'the purchase was not audited against the payer');
  });

  await test('an anonymous caller is refused before the flag is even consulted', async () => {
    const offer = await sellableCourse();
    // No withCheckoutOn: not_signed_in has to win, or "turn checkout off"
    // becomes a way to learn that the platform has checkout at all.
    await asAnon(async () => {
      await rejects(() => q('select public.create_course_order($1)', [offer.course]),
        /checkout:not_signed_in/);
    });
  });

  await test('the writer refuses while commerce.checkout is off', async () => {
    const offer = await sellableCourse();
    const buyer = await newBuyer('Flagged Out');

    const off = await scalar(
      `select value_text from public.platform_settings where key = 'commerce.checkout'`);
    assert(off.value_text === 'false', `commerce.checkout ships as '${off.value_text}'`);

    await rejects(() => callWriter(buyer.userId, offer.course),
      /checkout:disabled/);

    const orders = await count('select id from public.orders where placed_by = $1', [buyer.userId]);
    assert(orders === 0, `${orders} orders were created with checkout disabled`);
  });

  // ---------------------------------------------------------------------
  // The amount comes from prices, and only for this course
  // ---------------------------------------------------------------------

  await test("the buyer's country picks the price, and another market's is not charged", async () => {
    const cheap = await sellableCourse({ amountMinor: 1500 });

    // A dearer price for Kenya on the same product. It must apply to a Kenyan
    // buyer and to nobody else — the price is a function of where the buyer is,
    // not of what the request asked for.
    await q(
      `insert into public.prices
         (product_id, amount_minor, currency_code, billing_interval, status, market)
       values ($1, 99000, 'UGX', 'one_time', 'active', 'KE')`,
      [cheap.productId]);

    const kenyan = await newBuyer('Kenyan Buyer');
    const made = await withCheckoutOn(() => callWriter(kenyan.userId, cheap.course, 'KE'));
    assert(made.rows[0].r.amountMinor === '99000',
      `a Kenyan buyer was charged ${made.rows[0].r.amountMinor} for the Kenyan price`);
    assert(made.rows[0].r.matched === 'country', 'the order did not say it matched a country');

    const order = await scalar('select total_minor, currency_code from public.orders where id = $1',
      [made.rows[0].r.orderId]);
    assert(Number(order.total_minor) === 99000, `the order total is ${order.total_minor}`);

    // No country at all: the price that declares no market is the default.
    const elsewhere = await newBuyer('Unplaced Buyer');
    const fallback = await withCheckoutOn(() => callWriter(elsewhere.userId, cheap.course));
    assert(fallback.rows[0].r.amountMinor === '1500',
      `an unplaced buyer was charged ${fallback.rows[0].r.amountMinor} instead of the default price`);
    assert(fallback.rows[0].r.matched === 'default', 'the fallback was not named as the default');
  });

  await test('a country that is not a country is refused before anything is priced', async () => {
    const offer = await sellableCourse({ amountMinor: 10000 });
    const buyer = await newBuyer('Bad Country');

    await withCheckoutOn(async () => {
      // The old writer took a price id and trusted it. This one takes a country
      // and it must at least be a country; a price id in that position is a
      // request the writer does not know how to honour.
      await rejects(() => callWriter(buyer.userId, offer.course, 'UGA'),
        /a country is a two-letter ISO 3166-1 code/);
    });

    const orders = await count('select id from public.orders where placed_by = $1', [buyer.userId]);
    assert(orders === 0, `${orders} orders were created from an invalid country`);
  });

  await test('a product priced only by subscription is not a course purchase', async () => {
    const offer = await sellableCourse();
    const buyer = await newBuyer('Monthly');

    // Retire the one-off price and leave a monthly one: the only thing on sale
    // is a subscription, which this writer must not sell. record_payment_success()
    // creates no subscription, so taking it would grant a one-off entitlement
    // for recurring money.
    await q(`update public.prices set status = 'retired'
              where product_id = $1 and billing_interval = 'one_time'`, [offer.productId]);
    await q(
      `insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1, 5000, 'UGX', 'month', 'active')`, [offer.productId]);

    await withCheckoutOn(async () => {
      await rejects(() => callWriter(buyer.userId, offer.course),
        /checkout:not_one_time/);
    });
  });

  await test('a draft, retired or out-of-window price is refused', async () => {
    const buyer = await newBuyer('Stale Price');
    const past = new Date(Date.now() - 86400000 * 30).toISOString();
    const future = new Date(Date.now() + 86400000 * 30).toISOString();

    const retired = await sellableCourse({ priceStatus: 'retired' });
    const draft = await sellableCourse({ priceStatus: 'draft' });
    const expired = await sellableCourse({
      effectiveFrom: new Date(Date.now() - 86400000 * 60).toISOString(),
      effectiveUntil: past,
    });
    const notYet = await sellableCourse({ effectiveFrom: future });

    await withCheckoutOn(async () => {
      // A price outside its window, or not active, is not on sale. The window
      // is applied where "on sale" is defined, so all four answer alike.
      for (const [label, offer, pattern] of [
        ['retired', retired, /checkout:price_not_available/],
        ['draft', draft, /checkout:price_not_available/],
        ['expired', expired, /checkout:price_not_available/],
        ['not yet effective', notYet, /checkout:price_not_available/],
      ]) {
        await rejects(() => callWriter(buyer.userId, offer.course), pattern);
      }
    });

    const orders = await count('select id from public.orders where placed_by = $1', [buyer.userId]);
    assert(orders === 0, `${orders} orders were created from an unusable price`);
  });

  await test('a price behind a draft product is refused', async () => {
    const offer = await sellableCourse();
    const buyer = await newBuyer('Draft Product');

    await q(`update public.products set status = 'draft' where id = $1`, [offer.productId]);
    try {
      await withCheckoutOn(async () => {
        // A draft product is not an offer, so its price is not on sale. The
        // same definition the buy page reads decides it.
        await rejects(() => callWriter(buyer.userId, offer.course),
          /checkout:price_not_available/);
      });
    } finally {
      await q(`update public.products set status = 'active' where id = $1`, [offer.productId]);
    }
  });

  await test('a course with nothing published cannot be bought', async () => {
    const buyer = await newBuyer('Unpublished');

    const draftCourse = await newCourse(teacher, { status: 'active' });
    await newVersion(draftCourse, teacher);

    const archived = await sellableCourse();
    await q(`update public.courses set status = 'retired' where id = $1`, [archived.course]);

    await withCheckoutOn(async () => {
      await rejects(() => callWriter(buyer.userId, draftCourse),
        /checkout:course_not_available/);
      await rejects(() => callWriter(buyer.userId, archived.course),
        /checkout:course_not_available/);
      await rejects(() => callWriter(buyer.userId, null, null),
        /checkout:course_not_available/);
    });

    const orders = await count('select id from public.orders where placed_by = $1', [buyer.userId]);
    assert(orders === 0, `${orders} orders were created for an unpublishable course`);
  });

  // ---------------------------------------------------------------------
  // Whose account the order hangs off
  // ---------------------------------------------------------------------

  await test('a second purchase reuses the account rather than opening another', async () => {
    const first = await sellableCourse({ amountMinor: 20000 });
    const second = await sellableCourse({ amountMinor: 25000 });
    const buyer = await newBuyer('Repeat Buyer');

    const one = await withCheckoutOn(() => callWriter(buyer.userId, first.course));
    const two = await withCheckoutOn(() => callWriter(buyer.userId, second.course));

    assert(one.rows[0].r.billingAccountId === two.rows[0].r.billingAccountId,
      'two purchases opened two billing accounts, so "my orders" is no longer one list');

    const accounts = await count(
      'select id from public.billing_accounts where created_by = $1', [buyer.userId]);
    assert(accounts === 1, `${accounts} accounts were opened for one payer`);
  });

  await test('an account follows the currency of the price it just bought', async () => {
    const offer = await sellableCourse({ amountMinor: 30000, currency: 'UGX' });
    const buyer = await newBuyer('Dollar Account');

    await committed(async () => {
      const usd = (await q(
        `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
         values ('Dollar Account','USD','active',$1) returning id`, [buyer.userId])).rows[0].id;
      await q(`insert into public.billing_account_memberships
                 (billing_account_id, user_id, can_view_invoices, can_manage_payment_methods,
                  can_cancel_subscriptions, status, granted_by)
               values ($1,$2,true,true,true,'active',$3)
               on conflict (billing_account_id, user_id) do update
                 set can_manage_payment_methods = true, status = 'active'`, [usd, buyer.userId, admin]);
      buyer.usdAccount = usd;
    });

    // Before this unit the writer opened a second account in the price's
    // currency rather than touch the first. That made a second account for the
    // same person — and, once a country is recorded on an account, a second
    // country to get wrong. One account, following the price it just paid.
    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    const r = made.rows[0].r;
    assert(r.billingAccountId === buyer.usdAccount,
      'the buyer was given a second billing account instead of their own');

    const order = await scalar(
      `select o.currency_code, ba.billing_currency
         from public.orders o
         join public.billing_accounts ba on ba.id = o.billing_account_id
        where o.id = $1`, [r.orderId]);
    assert(order.currency_code === order.billing_currency.trim(),
      `order in ${order.currency_code} on an account billing in ${order.billing_currency}`);

    const audit = (await q(
      `select detail from public.governance_audit_events
        where action = 'commerce.billing_currency_changed' and target_id = $1`,
      [buyer.usdAccount])).rows;
    assert(audit.length === 1, 'the currency change was not audited exactly once');
    assert(audit[0].detail.from === 'USD' && audit[0].detail.to === 'UGX',
      'the audit did not record the move');
  });

  await test('a membership that cannot pay is not used to pay', async () => {
    const offer = await sellableCourse();
    const buyer = await newBuyer('Viewer Only');

    await committed(async () => {
      const account = (await q(
        `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
         values ('Viewer Only','UGX','active',$1) returning id`, [admin])).rows[0].id;
      // can_manage_payment_methods defaults to false: this person may read the
      // invoices but may not pay them.
      await q(`insert into public.billing_account_memberships
                 (billing_account_id, user_id, can_view_invoices, status, granted_by)
               values ($1,$2,true,'active',$3)`, [account, buyer.userId, admin]);
      buyer.viewerAccount = account;
    });

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    assert(made.rows[0].r.billingAccountId !== buyer.viewerAccount,
      'an order was placed on an account the payer may not pay from');
  });

  await test('a payer cannot direct an order onto somebody else\'s account', async () => {
    const offer = await sellableCourse();
    const mine = await newBuyer('Account Owner');
    const other = await newBuyer('Intruder');

    await committed(async () => {
      const account = (await q(
        `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
         values ('Account Owner','UGX','active',$1) returning id`, [mine.userId])).rows[0].id;
      await q(`insert into public.billing_account_memberships
                 (billing_account_id, user_id, can_view_invoices, can_manage_payment_methods,
                  can_cancel_subscriptions, status, granted_by)
               values ($1,$2,true,true,true,'active',$3)
               on conflict (billing_account_id, user_id) do update
                 set can_manage_payment_methods = true, status = 'active'`, [account, mine.userId, admin]);
      mine.account = account;
    });

    const made = await withCheckoutOn(() => callWriter(other.userId, offer.course));
    assert(made.rows[0].r.billingAccountId !== mine.account,
      'an order landed on an account the caller is not a member of');

    // There is no parameter to abuse, which is the point: the account is
    // derived from the caller's own memberships.
    const placed = await scalar(
      'select billing_account_id, placed_by from public.orders where id = $1',
      [made.rows[0].r.orderId]);
    assert(placed.placed_by === other.userId, 'the order does not name the person who placed it');
  });

  // ---------------------------------------------------------------------
  // What the order is worth once it is paid
  // ---------------------------------------------------------------------

  await test('an order from the writer fulfils the course it actually sold', async () => {
    const offer = await sellableCourse({ amountMinor: 30000 });
    const buyer = await newBuyer('Fulfilled Buyer');

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    const orderId = made.rows[0].r.orderId;

    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [orderId, admin, 'manual', 'CO-1', 'Cash, receipt CO-1']);

    const order = await scalar('select status, paid_at from public.orders where id = $1', [orderId]);
    assert(order.status === 'paid', `the order is '${order.status}' after confirmation`);
    assert(order.paid_at, 'a paid order has no paid_at');

    const grants = await count(
      `select id from public.entitlement_grants
        where learner_profile_id = $1 and course_version_id = $2
          and source_type = 'purchase' and source_id = $3 and status = 'active'`,
      [buyer.learnerId, offer.version, orderId]);
    assert(grants === 1, `${grants} entitlements were granted for the paid order`);

    const enrolments = await count(
      `select id from public.course_enrolments
        where learner_profile_id = $1 and course_version_id = $2 and deleted_at is null`,
      [buyer.learnerId, offer.version]);
    assert(enrolments === 1, `${enrolments} enrolments exist for the buyer`);

    const earnings = await scalar(
      `select gross_amount_minor, net_amount_minor, revenue_share_percent
         from public.instructor_earnings_entries where order_id = $1`, [orderId]);
    assert(earnings, 'no earnings row was accrued for the paid order');
    assert(Number(earnings.gross_amount_minor) === 30000,
      `the teacher's gross is ${earnings.gross_amount_minor}, not the price that was charged`);
  });

  await test('a buyer can read the order they placed and a stranger cannot', async () => {
    const offer = await sellableCourse();
    const buyer = await newBuyer('Reader');
    const stranger = await newBuyer('Stranger');

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    const orderId = made.rows[0].r.orderId;

    const seen = await asUser(buyer.userId, () =>
      count('select id from public.orders where id = $1', [orderId]));
    assert(seen === 1, 'a payer cannot read the order they just placed');

    const lines = await asUser(buyer.userId, () =>
      count('select id from public.order_items where order_id = $1', [orderId]));
    assert(lines === 1, `a payer saw ${lines} of their own line items`);

    const hidden = await asUser(stranger.userId, () =>
      count('select id from public.orders where id = $1', [orderId]));
    assert(hidden === 0, `a stranger saw ${hidden} of somebody else's orders`);
  });

  // ---------------------------------------------------------------------
  // A purchase that would grant nothing new (decided and built 2026-10-22)
  //
  // The writer derived everything about an order from the catalogue and never
  // asked whether the buyer already had the thing, so an account with live
  // access could pay for it again. The refusal is scoped to a live `purchase`
  // entitlement for this exact version, on a profile belonging to an active
  // member of the account that would pay — which is precisely what
  // record_payment_success() would skip.
  // ---------------------------------------------------------------------

  /** Pay an order the way the platform does — a privileged actor with evidence. */
  const payOrder = (orderId, reference) =>
    q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [orderId, admin, 'manual', reference, `Cash, receipt ${reference}`]);

  await test('a second purchase of the same course is refused and makes no order', async () => {
    const offer = await sellableCourse({ amountMinor: 30000 });
    const buyer = await newBuyer('Bought Twice');

    const first = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    const orderId = first.rows[0].r.orderId;
    await payOrder(orderId, 'CO-DUP-1');

    const accountId = (await scalar(
      'select billing_account_id from public.orders where id = $1', [orderId])).billing_account_id;

    await withCheckoutOn(() => rejects(
      () => callWriter(buyer.userId, offer.course),
      /checkout:already_owned/i));

    const orders = await count(
      'select id from public.orders where billing_account_id = $1', [accountId]);
    assert(orders === 1,
      `${orders} orders exist after one purchase and one refusal — a refusal wrote a row`);

    // The refusal is the guard, not the flag: checkout was open when it fired.
    const flag = await scalar(
      `select value_text from public.platform_settings where key = 'commerce.checkout'`);
    assert(flag.value_text === 'false',
      `the checkout flag is '${flag.value_text}' — the suite did not put it back`);
  });

  await test('a lapsed entitlement does not block a purchase', async () => {
    const offer = await sellableCourse({ amountMinor: 15000 });
    const buyer = await newBuyer('Lapsed');
    const first = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    await payOrder(first.rows[0].r.orderId, 'CO-DUP-2');

    // Revoked: the family lost access, so buying again is a real purchase. A
    // rule that counted any historical entitlement would lock them out of the
    // course they had already paid for once.
    // eg_revocation_agrees: a revoked grant names when and why, so the row stays
    // explainable — the same rule the refund path follows.
    await q(`update public.entitlement_grants
                set status = 'revoked', revoked_at = now(),
                    revocation_reason = 'Revoked by the family'
              where learner_profile_id = $1 and course_version_id = $2`,
      [buyer.learnerId, offer.version]);

    const again = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    assert(again.rows[0].r.orderId, 'a revoked entitlement still blocked the purchase');
  });

  await test('access from a subscription does not block buying the course outright', async () => {
    const offer = await sellableCourse({ amountMinor: 20000 });
    const buyer = await newBuyer('Subscribed');

    // A plan grants this version, and that grant ends when the plan does.
    // Buying the course adds permanence, and the fulfilment would create a new
    // purchase entitlement — it skips only a live `purchase` row, so this
    // refusal asks the same question rather than a stricter one.
    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, course_version_id,
                source_type, status, effective_from)
             values ($1,'course_version',$2,'subscription','active',now())`,
      [buyer.learnerId, offer.version]);

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course));
    assert(made.rows[0].r.orderId, 'a subscription grant blocked an outright purchase');
  });

  await test('another account can buy the course this one already owns', async () => {
    const offer = await sellableCourse({ amountMinor: 18000 });
    const first = await newBuyer('First Family');
    const second = await newBuyer('Second Family');

    const bought = await withCheckoutOn(() => callWriter(first.userId, offer.course));
    await payOrder(bought.rows[0].r.orderId, 'CO-DUP-3');

    const other = await withCheckoutOn(() => callWriter(second.userId, offer.course));
    assert(other.rows[0].r.orderId,
      'one family owning a course blocked another family from buying it');
  });
}
