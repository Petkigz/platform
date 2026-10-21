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

  const callWriter = (actor, courseId, priceId) =>
    asActor(actor, 'select public.create_course_order($1,$2) as r', [courseId, priceId]);

  // ---------------------------------------------------------------------
  // The shape of the writer
  // ---------------------------------------------------------------------

  await test('the writer takes a course and a price and nothing else', async () => {
    const args = (await scalar(
      `select pg_get_function_arguments('public.create_course_order(uuid,uuid)'::regprocedure) as a`
    )).a;
    assert(args === 'p_course_id uuid, p_price_id uuid',
      `the writer accepts '${args}' — an amount, a product or a billing account ` +
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
    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course, offer.priceId));
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

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course, offer.priceId));
    const orderId = made.rows[0].r.orderId;

    // order_adjustments_insert still exists (Unit 21 replaces it), so this
    // asserts what is true today rather than what will be: the row can be
    // written, and it changes nothing, because no total is derived from it.
    await asUser(buyer.userId, async () => {
      await q(`insert into public.order_adjustments
                 (order_id, adjustment_type, direction, amount_minor, currency_code, description)
               values ($1,'manual_discount','credit',50000,'UGX','asked nicely')`, [orderId]);
    });

    const back = await scalar(
      'select total_minor, discount_minor, subtotal_minor from public.orders where id = $1',
      [orderId]);
    assert(Number(back.total_minor) === 30000,
      `a customer-written adjustment moved the total to ${back.total_minor}`);
    assert(Number(back.discount_minor) === 0,
      `a customer-written adjustment moved the discount to ${back.discount_minor}`);
  });

  // ---------------------------------------------------------------------
  // The writer works
  // ---------------------------------------------------------------------

  await test('a payer with no billing account gets an order, a line and an account', async () => {
    const offer = await sellableCourse({ amountMinor: 42500 });
    const buyer = await newBuyer('First Purchase');

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course, offer.priceId));
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
      await rejects(() => q('select public.create_course_order($1,$2)', [offer.course, offer.priceId]),
        /checkout:not_signed_in/);
    });
  });

  await test('the writer refuses while commerce.checkout is off', async () => {
    const offer = await sellableCourse();
    const buyer = await newBuyer('Flagged Out');

    const off = await scalar(
      `select value_text from public.platform_settings where key = 'commerce.checkout'`);
    assert(off.value_text === 'false', `commerce.checkout ships as '${off.value_text}'`);

    await rejects(() => callWriter(buyer.userId, offer.course, offer.priceId),
      /checkout:disabled/);

    const orders = await count('select id from public.orders where placed_by = $1', [buyer.userId]);
    assert(orders === 0, `${orders} orders were created with checkout disabled`);
  });

  // ---------------------------------------------------------------------
  // The amount comes from prices, and only for this course
  // ---------------------------------------------------------------------

  await test('the amount charged is the price row, not anything the caller sent', async () => {
    const cheap = await sellableCourse({ amountMinor: 1500 });
    const buyer = await newBuyer('Cheap Buyer');

    // A second, dearer price on the same product: the writer must charge the
    // one it was given, and must not pick the highest. A different market,
    // because two active prices for the same target, currency, market and
    // interval may not overlap.
    const dearer = (await q(
      `insert into public.prices
         (product_id, amount_minor, currency_code, billing_interval, status, market)
       values ($1, 99000, 'UGX', 'one_time', 'active', 'KE') returning id`,
      [cheap.productId])).rows[0].id;

    const made = await withCheckoutOn(() => callWriter(buyer.userId, cheap.course, dearer));
    assert(made.rows[0].r.amountMinor === '99000',
      `the writer charged ${made.rows[0].r.amountMinor} for the 99000 price`);

    const order = await scalar('select total_minor from public.orders where id = $1',
      [made.rows[0].r.orderId]);
    assert(Number(order.total_minor) === 99000, `the order total is ${order.total_minor}`);
  });

  await test('a price for another course cannot be used against this one', async () => {
    const mine = await sellableCourse({ amountMinor: 10000 });
    const theirs = await sellableCourse({ amountMinor: 20000 });
    const buyer = await newBuyer('Cross Course');

    await withCheckoutOn(async () => {
      await rejects(() => callWriter(buyer.userId, mine.course, theirs.priceId),
        /checkout:price_not_for_this_course/);
    });

    const orders = await count('select id from public.orders where placed_by = $1', [buyer.userId]);
    assert(orders === 0, `${orders} orders were created from a mismatched price`);
  });

  await test('a subscription price is not a course purchase', async () => {
    const offer = await sellableCourse();
    const buyer = await newBuyer('Monthly');

    const monthly = (await q(
      `insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1, 5000, 'UGX', 'month', 'active') returning id`, [offer.productId])).rows[0].id;

    await withCheckoutOn(async () => {
      // record_payment_success() creates no subscription, so accepting this
      // would take recurring money and grant a one-off entitlement.
      await rejects(() => callWriter(buyer.userId, offer.course, monthly),
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
      for (const [label, offer, pattern] of [
        ['retired', retired, /checkout:price_not_available/],
        ['draft', draft, /checkout:price_not_available/],
        ['expired', expired, /checkout:price_window/],
        ['not yet effective', notYet, /checkout:price_window/],
      ]) {
        await rejects(() => callWriter(buyer.userId, offer.course, offer.priceId), pattern);
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
        // resolveOffering() only shows prices on active products, so accepting
        // one here would sell something the catalogue does not offer.
        await rejects(() => callWriter(buyer.userId, offer.course, offer.priceId),
          /checkout:price_not_for_this_course/);
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

    const elsewhere = await sellableCourse({ amountMinor: 1000 });
    const unknownPrice = (await scalar('select gen_random_uuid() as id')).id;

    await withCheckoutOn(async () => {
      // A perfectly good price for a different course, offered against one with
      // nothing published: the course is resolved first, so this is "not
      // available" rather than "wrong price".
      await rejects(() => callWriter(buyer.userId, draftCourse, elsewhere.priceId),
        /checkout:course_not_available/);
      await rejects(() => callWriter(buyer.userId, archived.course, archived.priceId),
        /checkout:course_not_available/);
      await rejects(() => callWriter(buyer.userId, null, null),
        /checkout:course_not_available/);
      await rejects(() => callWriter(buyer.userId, elsewhere.course, unknownPrice),
        /checkout:price_not_available/);
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

    const one = await withCheckoutOn(() => callWriter(buyer.userId, first.course, first.priceId));
    const two = await withCheckoutOn(() => callWriter(buyer.userId, second.course, second.priceId));

    assert(one.rows[0].r.billingAccountId === two.rows[0].r.billingAccountId,
      'two purchases opened two billing accounts, so "my orders" is no longer one list');

    const accounts = await count(
      'select id from public.billing_accounts where created_by = $1', [buyer.userId]);
    assert(accounts === 1, `${accounts} accounts were opened for one payer`);
  });

  await test('an account in another currency is left alone and a matching one is opened', async () => {
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

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course, offer.priceId));
    const r = made.rows[0].r;

    assert(r.billingAccountId !== buyer.usdAccount,
      'a UGX order was hung off a USD account, whose billing_currency is documented ' +
      'as authoritative for the original amount');

    const order = await scalar(
      `select o.currency_code, ba.billing_currency
         from public.orders o
         join public.billing_accounts ba on ba.id = o.billing_account_id
        where o.id = $1`, [r.orderId]);
    assert(order.currency_code === order.billing_currency.trim(),
      `order in ${order.currency_code} on an account billing in ${order.billing_currency}`);
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

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course, offer.priceId));
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

    const made = await withCheckoutOn(() => callWriter(other.userId, offer.course, offer.priceId));
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

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course, offer.priceId));
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

    const made = await withCheckoutOn(() => callWriter(buyer.userId, offer.course, offer.priceId));
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
}
