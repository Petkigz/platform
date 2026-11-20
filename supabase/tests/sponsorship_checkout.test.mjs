// A sponsor pays a pledge through checkout.
//
// The staff path (`record_sponsorship_payment`) is held by sponsorship.test.mjs.
// These hold the other one: an order for exactly the amount pledged, with no
// learner on it and one line that names no product; the seat opening when that order is paid,
// and only then; the sponsor being granted nothing; and money that arrives
// for a pledge that can no longer be honoured being recorded as that, not
// lost and not turned into a seat.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer, grantRole,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('spc-admin@example.com');
  const teacher = await newInstructor('spc-teacher@example.com', admin);
  const reviewer = await newReviewer('spc-reviewer@example.com', admin);
  const finance = await newUser('spc-finance@example.com');
  await newProfile(finance, 'Finance Person');
  await grantRole(finance, 'finance_admin', admin);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify(actor ? { sub: actor, role: 'authenticated' } : { role: 'anon' })]);
    await q(actor ? 'set local role authenticated' : 'set local role anon');
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
  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const flag = (key, on) =>
    asActor(admin, 'update public.platform_settings set value_text = $2 where key = $1',
      [key, on ? 'true' : 'false']);

  await flag('commerce.sponsorship', true);
  await flag('commerce.checkout', true);
  try {
    let seq = 0;
    async function person(name) {
      seq += 1;
      const userId = await newUser(`spc-${seq}@example.com`);
      await newProfile(userId, name);
      const learnerId = (await scalar(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
      return { userId, learnerId, name };
    }

    async function sellable(amount = 30000) {
      seq += 1;
      const course = await newCourse(teacher, { status: 'active', title: `Checkout-sponsored course ${seq}` });
      const version = await newVersion(course, teacher);
      const section = await newSection(version);
      await newLesson(section);
      const productId = (await scalar(
        `insert into public.products (product_type, name, status, created_by)
         values ('course',$1,'active',$2) returning id`, [`Checkout-sponsored product ${seq}`, teacher])).id;
      await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
               values ($1,$2,$3)`, [productId, course, version]);
      await q(`insert into public.prices
                 (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
               values ($1,$2,'UGX','one_time','active','UG',now())`, [productId, amount]);
      for (const [status, actor] of [['submitted', teacher], ['approved', reviewer], ['published', admin]]) {
        await q('select id from public.set_course_version_status($1,$2,$3,$4)',
          [version, status, actor, 'sponsorship checkout test']);
        if (status === 'approved') await satisfyReview(version, reviewer, admin);
      }
      return { course, version, productId };
    }

    /** A pledge waiting to be paid: the learner, the course, the sponsor and the pledge's id. */
    async function pledged(amount = 30000) {
      const learner = await person(`Learner ${seq + 1}`);
      const offer = await sellable(amount);
      const made = (await asActor(learner.userId, 'select public.apply_for_sponsorship($1,$2,$3) as r',
        [learner.learnerId, offer.course, 'I cannot afford this course at the moment.'])).rows[0].r;
      const decision = (await asActor(admin, 'select public.decide_sponsorship_application($1,$2,$3) as r',
        [made.applicationId, true, 'Checked with the family.'])).rows[0].r;
      const donor = await person(`Donor ${seq + 1}`);
      const taken = (await asActor(donor.userId, 'select public.pledge_sponsorship($1,$2,$3) as r',
        [decision.seatCode, 'UG', null])).rows[0].r;
      return { learner, offer, donor, applicationId: made.applicationId, sponsorshipId: taken.sponsorshipId, amount };
    }

    const askToPay = (actor, sponsorshipId) =>
      asActor(actor, 'select public.create_sponsorship_order($1) as r', [sponsorshipId]).then((res) => res.rows[0].r);

    /** A provider's confirmed callback, as the webhook writes one, settling an order. No human behind it. */
    async function providerPays(orderId, reference) {
      const event = (await scalar(
        `insert into public.payment_provider_events
           (provider, provider_event_id, event_type, payload, signature_verified, processing_status)
         values ('pawapay', $1, 'payment.succeeded', '{}'::jsonb, true, 'received') returning id`, [reference])).id;
      return scalar('select (public.record_payment_success($1, null, $2, $3, $4, null)).status as status',
        [orderId, 'pawapay', reference, event]);
    }

    const pledge = (id) => scalar('select * from public.sponsorships where id = $1', [id]);
    const seatOf = (learnerId, version) => scalar(
      `select count(*)::int as grants,
              (select count(*)::int from public.course_enrolments ce
                where ce.learner_profile_id = $1 and ce.course_version_id = $2 and ce.deleted_at is null) as enrolments
         from public.entitlement_grants eg
        where eg.learner_profile_id = $1 and eg.course_version_id = $2 and eg.status = 'active'`,
      [learnerId, version]);
    const audits = async (action, sponsorshipId) => (await q(
      `select detail from public.governance_audit_events
        where action = $1 and target_type = 'sponsorship' and target_id = $2 order by occurred_at`,
      [action, sponsorshipId])).rows.map((r) => r.detail);

    // ---------------------------------------------------------------------
    // Asking to pay
    // ---------------------------------------------------------------------
    await test('a sponsor asks to pay: an order for exactly the pledge, with no learner and one line that names no product', async () => {
      const p = await pledged(45000);
      const made = await askToPay(p.donor.userId, p.sponsorshipId);
      eq(made.amountMinor, '45000', 'the amount');
      eq(made.currencyCode, 'UGX', 'the currency');
      eq(made.changed, true, 'the first ask');

      const order = await scalar('select * from public.orders where id = $1', [made.orderId]);
      eq(order.status, 'pending_payment', 'the order');
      eq(String(order.total_minor), '45000', 'the total');
      eq(String(order.subtotal_minor), '45000', 'the subtotal');
      eq(String(order.tax_minor), '0', 'tax');
      eq(order.placed_by, p.donor.userId, 'who placed it');
      // A sponsor reads their own orders. Nothing on one may say who was helped.
      eq(order.learner_profile_id, null, 'the learner on the order');
      const items = (await q('select * from public.order_items where order_id = $1', [made.orderId])).rows;
      eq(items.length, 1, 'lines');
      eq(items[0].product_id, null, 'the product on the line'); eq(items[0].plan_version_id, null, 'the plan on the line');
      eq(String(items[0].line_total_minor), '45000', 'the line total');
      eq(items[0].item_snapshot.kind, 'sponsorship_pledge', 'what the line says it is');
      assert(/^Sponsored seat: Checkout-sponsored course \d+$/.test(items[0].item_snapshot.title), `the line is titled ${items[0].item_snapshot.title}`);
      // The line, which the sponsor can read, says nothing about who asked.
      const line = JSON.stringify(items[0].item_snapshot);
      assert(!line.includes(p.learner.learnerId) && !line.includes(p.learner.userId) && !line.includes(p.learner.name) && !line.includes(p.applicationId), 'the order line identifies the learner');
      // Every other line still has to name a product or a plan.
      await rejects(() => q(`insert into public.order_items (order_id, quantity, unit_price_minor, currency_code, line_total_minor, item_snapshot) values ($1,1,1,'UGX',1,'{"kind":"anything"}')`, [made.orderId]), /oi_single_target/);
      await rejects(() => q(`insert into public.order_items (order_id, quantity, unit_price_minor, currency_code, line_total_minor) values ($1,1,1,'UGX',1)`, [made.orderId]), /oi_single_target/);
      eq((await pledge(p.sponsorshipId)).order_id, made.orderId, 'the pledge\'s order');
      eq((await pledge(p.sponsorshipId)).status, 'pledged', 'the pledge, before any money');

      // Nothing is granted by asking.
      const seat = await seatOf(p.learner.learnerId, p.offer.version);
      eq(seat.grants, 0, 'grants before payment'); eq(seat.enrolments, 0, 'enrolments before payment');

      // Asked again while it waits: the same order.
      const again = await askToPay(p.donor.userId, p.sponsorshipId);
      eq(again.orderId, made.orderId, 'the second ask'); eq(again.changed, false, 'the second ask changed something');
      eq((await scalar(
        `select count(*)::int as n from public.orders o
           join public.billing_account_memberships m on m.billing_account_id = o.billing_account_id
          where m.user_id = $1`, [p.donor.userId])).n, 1, 'orders after asking twice');
      eq((await audits('sponsorship.order_created', p.sponsorshipId)).length, 1, 'audit lines');
    });

    await test('a sponsor with no billing account is given one in the pledge\'s currency; one they have is left alone', async () => {
      const p = await pledged();
      eq((await scalar('select count(*)::int as n from public.billing_account_memberships where user_id = $1', [p.donor.userId])).n, 0, 'accounts before');
      const made = await askToPay(p.donor.userId, p.sponsorshipId);
      const account = await scalar(
        `select ba.* from public.billing_accounts ba join public.orders o on o.billing_account_id = ba.id where o.id = $1`, [made.orderId]);
      eq(account.billing_currency, 'UGX', 'the new account\'s currency');
      eq(account.billing_country, null, 'a country nobody stated');
      eq((await scalar(`select status from public.billing_account_memberships where user_id = $1 and billing_account_id = $2`, [p.donor.userId, account.id])).status, 'active', 'membership');

      // The same sponsor pledges again in the same currency: the same account, unchanged.
      await q(`update public.billing_accounts set billing_currency = 'KES', billing_country = 'KE' where id = $1`, [account.id]);
      const learner = await person('Second learner');
      const offer = await sellable();
      const second = (await asActor(learner.userId, 'select public.apply_for_sponsorship($1,$2,$3) as r', [learner.learnerId, offer.course, 'Another ask.'])).rows[0].r;
      const decision = (await asActor(admin, 'select public.decide_sponsorship_application($1,$2,$3) as r', [second.applicationId, true, 'Yes.'])).rows[0].r;
      const taken = (await asActor(p.donor.userId, 'select public.pledge_sponsorship($1,$2,$3) as r', [decision.seatCode, 'UG', null])).rows[0].r;
      const other = await askToPay(p.donor.userId, taken.sponsorshipId);
      const after = await scalar(`select ba.* from public.billing_accounts ba join public.orders o on o.billing_account_id = ba.id where o.id = $1`, [other.orderId]);
      eq(after.id, account.id, 'the account used'); eq(after.billing_currency, 'KES', 'its currency'); eq(after.billing_country, 'KE', 'its country');
    });

    await test('only the sponsor may ask, only for a pledge still waiting, and only with both switches on', async () => {
      const p = await pledged();
      const stranger = await person('Stranger');
      // Somebody else's pledge and no pledge at all are the same answer.
      await rejects(() => askToPay(stranger.userId, p.sponsorshipId), /sponsorship:not_found/);
      await rejects(() => askToPay(p.learner.userId, p.sponsorshipId), /sponsorship:not_found/);
      await rejects(() => askToPay(admin, p.sponsorshipId), /sponsorship:not_found/);
      await rejects(() => askToPay(p.donor.userId, '00000000-0000-4000-8000-000000000000'), /sponsorship:not_found/);
      await rejects(() => askToPay(null, p.sponsorshipId), /permission denied|not_signed_in/);

      for (const key of ['commerce.sponsorship', 'commerce.checkout']) {
        await flag(key, false);
        try { await rejects(() => askToPay(p.donor.userId, p.sponsorshipId), /disabled/); }
        finally { await flag(key, true); }
      }
      eq((await pledge(p.sponsorshipId)).order_id, null, 'an order made by a refused ask');

      const gone = await pledged();
      await asActor(gone.donor.userId, 'select public.withdraw_sponsorship($1,$2)', [gone.sponsorshipId, 'Changed my mind']);
      await rejects(() => askToPay(gone.donor.userId, gone.sponsorshipId), /sponsorship:not_pledged/);

      const done = await pledged();
      await asActor(finance, 'select public.record_sponsorship_payment($1,$2,null)', [done.sponsorshipId, 'BANK-1']);
      await rejects(() => askToPay(done.donor.userId, done.sponsorshipId), /sponsorship:not_pledged/);
    });

    await test('the function that grants the seat cannot be called by anybody, and asking cannot be called signed out', async () => {
      const can = async (role, fn) => (await scalar(`select has_function_privilege($1, $2, 'execute') as v`, [role, fn])).v;
      eq(await can('authenticated', 'public.create_sponsorship_order(uuid)'), true, 'authenticated may ask');
      eq(await can('anon', 'public.create_sponsorship_order(uuid)'), false, 'anon may ask');
      eq(await can('authenticated', 'public.sponsorship_settle_paid_order()'), false, 'authenticated may call the trigger function');
      eq(await can('anon', 'public.sponsorship_settle_paid_order()'), false, 'anon may call the trigger function');
    });

    // ---------------------------------------------------------------------
    // The order is paid
    // ---------------------------------------------------------------------
    await test('a provider confirms the payment: the seat opens for the learner, and the sponsor is granted nothing', async () => {
      const p = await pledged(52000);
      const made = await askToPay(p.donor.userId, p.sponsorshipId);
      eq((await providerPays(made.orderId, 'DEP-1')).status, 'paid', 'the order');

      const row = await pledge(p.sponsorshipId);
      eq(row.status, 'paid', 'the pledge');
      eq(row.reference, 'pawapay:DEP-1', 'the reference');
      // A provider confirmed it: no person recorded it, and the row says so.
      eq(row.recorded_by, null, 'who recorded it');
      assert(row.recorded_at, 'no time was recorded');
      eq(row.evidence, `Paid at checkout, order ${made.orderId}`, 'the evidence');
      eq((await scalar('select status from public.sponsorship_applications where id = $1', [p.applicationId])).status, 'funded', 'the request');

      const grant = await scalar('select * from public.entitlement_grants where id = $1', [row.entitlement_grant_id]);
      eq(grant.source_type, 'scholarship', 'the grant source');
      eq(grant.learner_profile_id, p.learner.learnerId, 'who the grant is for');
      const enrolment = await scalar(
        `select * from public.course_enrolments where learner_profile_id = $1 and course_id = $2 and deleted_at is null`,
        [p.learner.learnerId, p.offer.course]);
      assert(enrolment, 'the learner was granted access but not enrolled');
      eq(enrolment.source, 'scholarship', 'the enrolment source');
      eq((await scalar('select public.can_access_course_version($1,$2) as v', [p.learner.learnerId, p.offer.version])).v, true, 'the learner can open the course');

      // The sponsor paid for somebody else's seat, and holds nothing for it.
      const own = await seatOf(p.donor.learnerId, p.offer.version);
      eq(own.grants, 0, 'the sponsor\'s grants'); eq(own.enrolments, 0, 'the sponsor\'s enrolments');
      eq((await scalar('select public.can_access_course_version($1,$2) as v', [p.donor.learnerId, p.offer.version])).v, false, 'the sponsor can open the course');

      // The money is in the ledger at the amount pledged.
      const txn = await scalar(`select amount_minor, currency_code, provider, provider_reference, status from public.financial_transactions where order_id = $1`, [made.orderId]);
      eq(String(txn.amount_minor), '52000', 'the amount settled'); eq(txn.provider_reference, 'DEP-1', 'the provider reference');

      const paid = await audits('sponsorship.paid', p.sponsorshipId);
      eq(paid.length, 1, 'audit lines'); eq(paid[0].via, 'checkout', 'how it was paid'); eq(paid[0].orderId, made.orderId, 'the order in the audit line');

      // What each side reads afterwards: the sponsor a paid pledge with its reference; neither the other's name.
      const mine = (await asActor(p.donor.userId, 'select public.my_sponsorships() as r')).rows[0].r;
      const shown = mine.sponsorships.find((s) => s.id === p.sponsorshipId);
      eq(shown.status, 'paid', 'what the sponsor reads'); eq(shown.reference, 'pawapay:DEP-1', 'the reference the sponsor reads');
      assert(!JSON.stringify(mine).includes(p.learner.name), 'the sponsor is shown the learner\'s name');
      const theirs = (await asActor(p.learner.userId, 'select public.my_sponsorship_applications() as r')).rows[0].r;
      assert(!JSON.stringify(theirs).includes(p.donor.name) && !JSON.stringify(theirs).includes(p.donor.userId), 'the learner is shown who paid');
      // And the sponsor's own order, read as the sponsor, names no learner.
      const order = (await asActor(p.donor.userId, 'select * from public.orders where id = $1', [made.orderId])).rows[0];
      eq(order.status, 'paid', 'the order the sponsor reads'); eq(order.learner_profile_id, null, 'the learner on it');
    });

    await test('the same payment confirmed twice opens one seat', async () => {
      const p = await pledged();
      const made = await askToPay(p.donor.userId, p.sponsorshipId);
      await providerPays(made.orderId, 'DEP-2');
      // A second delivery: record_payment_success answers "already paid" and nothing fires again.
      eq((await scalar('select (public.record_payment_success($1, null, $2, $3, null, null)).status as status', [made.orderId, 'pawapay', 'DEP-2'])).status, 'paid', 'the second confirmation');
      const seat = await seatOf(p.learner.learnerId, p.offer.version);
      eq(seat.grants, 1, 'grants'); eq(seat.enrolments, 1, 'enrolments');
      eq((await audits('sponsorship.paid', p.sponsorshipId)).length, 1, 'audit lines');
      // And a paid pledge cannot be asked for again.
      await rejects(() => askToPay(p.donor.userId, p.sponsorshipId), /sponsorship:not_pledged/);
    });

    await test('finance confirming the order by hand, with evidence, opens the seat the same way', async () => {
      const p = await pledged();
      const made = await askToPay(p.donor.userId, p.sponsorshipId);
      await asActor(finance, 'select public.record_payment_success($1,$2,$3,$4,null,$5)', [made.orderId, finance, 'bank', 'SLIP-9', 'Bank slip 9, seen by finance']);
      const row = await pledge(p.sponsorshipId);
      eq(row.status, 'paid', 'the pledge'); eq(row.reference, 'Bank slip 9, seen by finance', 'the reference');
      eq((await seatOf(p.learner.learnerId, p.offer.version)).grants, 1, 'grants');
    });

    await test('an ordinary course order being paid touches no pledge', async () => {
      const p = await pledged();
      const before = await pledge(p.sponsorshipId);
      const buyer = await person('Ordinary buyer');
      const offer = await sellable(20000);
      const order = (await asActor(buyer.userId, 'select public.create_course_order($1,$2,$3,null) as r', [offer.course, buyer.learnerId, 'UG'])).rows[0].r;
      await providerPays(order.orderId, 'DEP-ORDINARY');
      const after = await pledge(p.sponsorshipId);
      eq(after.status, before.status, 'the pledge'); eq(after.order_id, null, 'its order');
      eq((await scalar('select public.can_access_course_version($1,$2) as v', [buyer.learnerId, offer.version])).v, true, 'the buyer has their course');
    });

    // ---------------------------------------------------------------------
    // Money for a pledge that can no longer be honoured
    // ---------------------------------------------------------------------
    await test('money that arrives after the pledge was called off is recorded, and buys nothing', async () => {
      const p = await pledged(33000);
      const made = await askToPay(p.donor.userId, p.sponsorshipId);
      await asActor(p.donor.userId, 'select public.withdraw_sponsorship($1,$2)', [p.sponsorshipId, 'Changed my mind']);
      // The payer had already approved it on their handset.
      eq((await providerPays(made.orderId, 'DEP-LATE')).status, 'paid', 'the order');
      eq((await pledge(p.sponsorshipId)).status, 'withdrawn', 'the pledge');
      const seat = await seatOf(p.learner.learnerId, p.offer.version);
      eq(seat.grants, 0, 'grants'); eq(seat.enrolments, 0, 'enrolments');
      const lines = await audits('sponsorship.payment_unapplied', p.sponsorshipId);
      eq(lines.length, 1, 'audit lines'); eq(lines[0].reason, 'pledge_withdrawn', 'the reason');
      eq(lines[0].orderId, made.orderId, 'the order'); eq(lines[0].amountMinor, '33000', 'the amount');
      eq((await audits('sponsorship.paid', p.sponsorshipId)).length, 0, 'a seat was recorded as paid');

      // The staff desk shows that line, so staff have to be able to read it
      // as themselves, through row-level security; and nobody else may.
      const readAs = async (actor) => (await asActor(actor,
        `select target_id, detail, occurred_at from public.governance_audit_events
          where action = 'sponsorship.payment_unapplied' and target_type = 'sponsorship' and target_id = $1`,
        [p.sponsorshipId])).rows;
      const seen = await readAs(finance);
      eq(seen.length, 1, 'what finance reads');
      eq(seen[0].detail.reason, 'pledge_withdrawn', 'the reason finance reads');
      eq(seen[0].detail.orderId, made.orderId, 'the order finance reads');
      assert(seen[0].occurred_at, 'the line has no time');
      eq((await readAs(admin)).length, 1, 'what the owner reads');
      eq((await readAs(p.donor.userId)).length, 0, 'what the sponsor reads of the audit trail');
      eq((await readAs(p.learner.userId)).length, 0, 'what the learner reads of the audit trail');
      await rejects(() => readAs(null), /permission denied/);
    });

    await test('money that arrives after staff recorded the pledge by hand is recorded as a second payment, not a second seat', async () => {
      const p = await pledged();
      const made = await askToPay(p.donor.userId, p.sponsorshipId);
      // Staff record money that came another way. The order is still on the pledge, and the row is still valid.
      await asActor(finance, 'select public.record_sponsorship_payment($1,$2,null)', [p.sponsorshipId, 'BANK-7']);
      const byHand = await pledge(p.sponsorshipId);
      eq(byHand.status, 'paid', 'the pledge'); eq(byHand.recorded_by, finance, 'who recorded it'); eq(byHand.order_id, made.orderId, 'its order');
      await providerPays(made.orderId, 'DEP-TWICE');
      const after = await pledge(p.sponsorshipId);
      eq(after.reference, 'BANK-7', 'the reference'); eq(after.recorded_by, finance, 'who recorded it');
      eq((await seatOf(p.learner.learnerId, p.offer.version)).grants, 1, 'grants');
      eq((await audits('sponsorship.payment_unapplied', p.sponsorshipId))[0].reason, 'pledge_paid', 'the reason');
    });

    await test('money that arrives after the course was withdrawn is recorded, and staff can still apply it', async () => {
      const p = await pledged();
      const made = await askToPay(p.donor.userId, p.sponsorshipId);
      await q(`update public.courses set status = 'retired' where id = $1`, [p.offer.course]);
      await providerPays(made.orderId, 'DEP-NO-COURSE');
      eq((await pledge(p.sponsorshipId)).status, 'pledged', 'the pledge');
      eq((await audits('sponsorship.payment_unapplied', p.sponsorshipId))[0].reason, 'course_not_available', 'the reason');
      // The course returns; the pledge is still waiting, and staff apply the money that is already in.
      await q(`update public.courses set status = 'active' where id = $1`, [p.offer.course]);
      await asActor(finance, 'select public.record_sponsorship_payment($1,$2,null)', [p.sponsorshipId, 'order ' + made.orderId]);
      eq((await pledge(p.sponsorshipId)).status, 'paid', 'the pledge after staff applied it');
      eq((await seatOf(p.learner.learnerId, p.offer.version)).grants, 1, 'grants');
    });

    await test('an order that failed is over: asking again makes a new one, and a paid one is not charged twice', async () => {
      const p = await pledged();
      const first = await askToPay(p.donor.userId, p.sponsorshipId);
      await q(`update public.orders set status = 'failed' where id = $1`, [first.orderId]);
      const second = await askToPay(p.donor.userId, p.sponsorshipId);
      assert(second.orderId !== first.orderId, 'the failed order was handed out again');
      eq(second.changed, true, 'the second order'); eq((await pledge(p.sponsorshipId)).order_id, second.orderId, 'the pledge\'s order');
      // The failed order being paid later (it cannot be, but a hand could do it) opens nothing: it is no longer the pledge's.
      eq((await audits('sponsorship.order_created', p.sponsorshipId)).at(-1).replaced, first.orderId, 'what was replaced');

      // Paid, and the pledge could not be settled: asking again is refused, so nobody is charged a second time.
      const stuck = await pledged();
      const order = await askToPay(stuck.donor.userId, stuck.sponsorshipId);
      await q(`update public.courses set status = 'retired' where id = $1`, [stuck.offer.course]);
      await providerPays(order.orderId, 'DEP-STUCK');
      await rejects(() => askToPay(stuck.donor.userId, stuck.sponsorshipId), /sponsorship:not_pledged/);
    });
  } finally {
    await flag('commerce.sponsorship', false);
    await flag('commerce.checkout', false);
  }
}
