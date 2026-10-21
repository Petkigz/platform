// Entitlement fulfilment.
//
// For most of this project's life nothing created an entitlement grant. The
// reader — can_access_course_version() — was correct and consulted
// entitlement_grants alone, but there was no writer anywhere: not in the
// migrations, not in the app, not in record_payment_success(). A fresh
// database had zero rows and no way to get one.
//
// The consequence was hidden by a second defect: lesson_resources_read ignored
// entitlement and let any signed-in user read the resources of any published
// course. The platform looked like it worked because authorisation was broken.
//
// These tests pin both halves together, because either one alone is a
// regression: closing the leak without fulfilment locks every learner out, and
// fulfilment without closing the leak hands paid content to anyone signed in.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, grantRole, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('ful-admin@example.com');
  const teacher  = await newInstructor('ful-teacher@example.com', admin);
  const reviewer = await newReviewer('ful-reviewer@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'fulfilment test']);

  let learnerSeq = 0;
  async function newAdult(name) {
    learnerSeq += 1;
    const userId = await newUser(`ful-learner-${learnerSeq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId };
  }

  /** A published course, optionally attached to a product so it counts as sold. */
  async function publishedCourse({ sold = false, preview = false } = {}) {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section, { is_preview: preview });

    // Both resources are created while the version is still a draft. D5
    // freezes the whole subtree on publication, so a resource added
    // afterwards is refused — which is the trigger doing its job, not a bug.
    await q(`insert into public.lesson_resources
               (lesson_id, resource_type, external_url, display_name, position, access_classification)
             values ($1,'video','https://cdn.example.com/lesson.mp4','The lesson',1,'enrolled')`,
      [lesson]);
    if (preview) {
      await q(`insert into public.lesson_resources
                 (lesson_id, resource_type, external_url, display_name, position, access_classification)
               values ($1,'video','https://cdn.example.com/taster.mp4','Taster',2,'public_preview')`,
        [lesson]);
    }

    if (sold) {
      const prod = (await q(
        `insert into public.products (product_type, name, status, created_by)
         values ('course','Sold course','active',$1) returning id`, [teacher])).rows[0].id;
      await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
               values ($1,$2,$3)`, [prod, course, version]);
      await q(`insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
               values ($1, 30000, 'UGX', 'one_time', 'active')`, [prod]);
      await transition(version, 'submitted', teacher);
      await transition(version, 'approved', reviewer);
      await satisfyReview(version, reviewer, admin);
      await transition(version, 'published', admin);
      return { course, version, section, lesson, productId: prod };
    }

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, section, lesson, productId: null };
  }

  // -------------------------------------------------------------------
  // The free path
  // -------------------------------------------------------------------
  await test('a free enrolment grants access to the course', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdult('Free Learner');

    assert((await q('select public.is_sold_version($1) v', [pc.version])).rows[0].v === false,
      'the control course should not be sold');

    const enrolmentId = await committed(async () => (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`,
      [learnerId, pc.course, pc.version])).rows[0].id);

    // The grant is the point: without it the enrolment is a row that lets the
    // learner open nothing.
    const grants = await count(
      `select 1 from public.entitlement_grants
        where learner_profile_id = $1 and course_version_id = $2
          and source_type = 'free' and status = 'active'`,
      [learnerId, pc.version]);
    assert(grants === 1, `expected exactly 1 active free grant, found ${grants}`);

    const access = (await q(
      'select public.can_access_course_version($1,$2) v', [learnerId, pc.version])).rows[0].v;
    assert(access === true, 'the learner still had no access to the course they enrolled in');

    const lessonAccess = (await q(
      'select public.can_access_lesson($1,$2) v', [learnerId, pc.lesson])).rows[0].v;
    assert(lessonAccess === true, 'the learner could not access the lesson');

    void enrolmentId;
  });

  await test('the enrolment is not created twice-granted on replay', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdult('Replay Learner');

    await committed(async () => {
      await q(`insert into public.course_enrolments
                 (learner_profile_id, course_id, course_version_id, source, status)
               values ($1,$2,$3,'free','active')`, [learnerId, pc.course, pc.version]);
    });

    // course_enrolments_one_active_per_course forbids two active enrolments
    // in one course, so a replay means the first is gone and a new one
    // arrives. The grant must still not be duplicated.
    await committed(async () => {
      await q(`update public.course_enrolments set deleted_at = now(), status = 'expired'
                where learner_profile_id = $1 and course_id = $2`, [learnerId, pc.course]);
      await q(`insert into public.course_enrolments
                 (learner_profile_id, course_id, course_version_id, source, status)
               values ($1,$2,$3,'free','active')`, [learnerId, pc.course, pc.version]);
    });

    const grants = await count(
      `select 1 from public.entitlement_grants
        where learner_profile_id = $1 and course_version_id = $2 and source_type = 'free'`,
      [learnerId, pc.version]);
    assert(grants === 1, `a replay produced ${grants} grants, expected 1`);
  });

  await test('a sold version does not get a free grant', async () => {
    const pc = await publishedCourse({ sold: true });
    const { learnerId } = await newAdult('Would Be Freeloader');

    assert((await q('select public.is_sold_version($1) v', [pc.version])).rows[0].v === true,
      'the control course should be sold');

    // The enrolment policy refuses a sold course claimed as free; assert the
    // grant would not appear either, since the trigger skips sold versions
    // even when the policy is bypassed by a SECURITY DEFINER writer.
    // As the learner, not as superuser: the rule lives in an RLS policy, and
    // a superuser bypasses RLS, so asserting at this level would prove
    // nothing either way.
    const { userId } = await newAdult('Freeload Attempt');
    await asUser(userId, async () => {
      await rejects(() => q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [learnerId, pc.course, pc.version]),
        'a sold course was recorded as a free enrolment');
    });

    const grants = await count(
      `select 1 from public.entitlement_grants
        where learner_profile_id = $1 and course_version_id = $2`, [learnerId, pc.version]);
    assert(grants === 0, `${grants} grant(s) appeared for a refused enrolment`);
  });

  // -------------------------------------------------------------------
  // The leak, closed
  // -------------------------------------------------------------------
  await test('a signed-in stranger cannot read a course they have not bought', async () => {
    const pc = await publishedCourse({ sold: true, preview: true });
    const { learnerId: buyerId, userId: buyerUser } = await newAdult('Buyer');
    const { userId: strangerUser } = await newAdult('Stranger');
    const original = (await q(
      `select value_text from public.platform_settings where key='learning.previews'`)).rows[0].value_text;

    // Give the buyer a real entitlement, as a purchase would.
    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, course_version_id, source_type, status)
             values ($1,'course_version',$2,'purchase','active')`, [buyerId, pc.version]);

    const namesFor = async (userId) => {
      let names = [];
      await asUser(userId, async () => {
        names = (await q(
          `select display_name from public.lesson_resources
            where lesson_id = $1 order by position`, [pc.lesson])).rows.map((r) => r.display_name);
      });
      return names;
    };

    try {
      await q(`update public.platform_settings set value_text='true' where key='learning.previews'`);
      const buyerSaw = await namesFor(buyerUser);
      assert(buyerSaw.includes('The lesson'),
        `the entitled buyer could not read the paid resource (saw: ${buyerSaw.join(', ') || 'nothing'})`);

      // The paid resource must remain private while the public sample is visible.
      const strangerSaw = await namesFor(strangerUser);
      assert(!strangerSaw.includes('The lesson'),
        `a stranger with no entitlement read the paid resource (saw: ${strangerSaw.join(', ')})`);
      assert(strangerSaw.includes('Taster'),
        'a public preview was hidden from a signed-in visitor');
    } finally {
      await q(`update public.platform_settings set value_text=$1 where key='learning.previews'`, [original]);
    }
  });

  await test('a public preview resource stays readable without entitlement when previews are enabled', async () => {
    const pc = await publishedCourse({ sold: true, preview: true });
    const { userId: strangerUser } = await newAdult('Browser');
    const original = (await q(
      `select value_text from public.platform_settings where key='learning.previews'`)).rows[0].value_text;

    try {
      await q(`update public.platform_settings set value_text='true' where key='learning.previews'`);
      await asUser(strangerUser, async () => {
        const rows = (await q(
          `select display_name from public.lesson_resources
            where lesson_id = $1 order by position`, [pc.lesson])).rows;
        const names = rows.map((r) => r.display_name);
        assert(names.includes('Taster'),
          `a public preview was hidden from a signed-in visitor (saw: ${names.join(', ') || 'nothing'})`);
        assert(!names.includes('The lesson'),
          'a paid resource was visible to someone with no entitlement');
      });
    } finally {
      await q(`update public.platform_settings set value_text=$1 where key='learning.previews'`, [original]);
    }
  });

  // -------------------------------------------------------------------
  // The billing account a purchase has to hang off
  // -------------------------------------------------------------------
  // This section exists because the paid path had a second, earlier dead end:
  // billing_accounts_insert allows created_by = current_user_id(), but every
  // read and every write beneath the account is gated on
  // is_billing_member(), which consults billing_account_memberships alone.
  // Nothing created that row, and the policy that would have let someone add
  // a member was itself gated on already being one. Measured as a real
  // authenticated user: create an account, cannot read it, cannot add
  // themselves, cannot order. The paid path was unreachable end to end.

  await test('creating a billing account makes the creator a paying member', async () => {
    const { userId } = await newAdult('Self Serve Payer');
    let account = null;

    await committed(async () => {
      account = (await q(
        `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
         values ($1,'UGX','active',$2) returning id`, ['Self Serve Payer', userId])).rows[0].id;
    });

    await asUser(userId, async () => {
      const m = (await q(
        `select status, can_view_invoices, can_manage_payment_methods, can_cancel_subscriptions
           from public.billing_account_memberships
          where billing_account_id = $1 and user_id = $2`, [account, userId])).rows[0];

      assert(m, 'the creator was not made a member of the account they created');
      assert(m.status === 'active', `the creator membership is '${m.status}'`);
      // The creator is the payer. Invoice-only would strand them: they could
      // see a bill and could neither pay it nor cancel it.
      assert(m.can_view_invoices === true, 'the creator cannot view invoices');
      assert(m.can_manage_payment_methods === true,
        'the creator cannot attach a payment method, so they cannot pay');
      assert(m.can_cancel_subscriptions === true,
        'the creator cannot cancel a subscription they started');

      const visible = (await q(
        'select id from public.billing_accounts where id = $1', [account])).rows.length;
      assert(visible === 1, 'the creator could not read the account they created');
    });
  });

  // This used to assert the opposite: that the creator could INSERT an order on
  // their own account. That was the right pin when the creator-membership
  // trigger landed, because an account nobody could order against made the whole
  // paid path unreachable. It became the wrong pin once it was noticed what the
  // insert policy actually allowed: `orders_insert` asked only whether the
  // writer was a billing member, so a payer could write the total and, through
  // `order_items_insert`, the product that record_payment_success() fulfils
  // from. 20261224000100_course_order_writer.sql drops both policies and moves
  // order creation into create_course_order().
  //
  // The reachability half of the old assertion is not lost — it is now made
  // through the writer, in course_order.test.mjs ('a payer with no billing
  // account gets an order, a line and an account').
  await test('the creator cannot write an order row on their own account', async () => {
    const { userId } = await newAdult('Ordering Payer');
    let account = null;

    await committed(async () => {
      account = (await q(
        `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
         values ($1,'UGX','active',$2) returning id`, ['Ordering Payer', userId])).rows[0].id;
    });

    await asUser(userId, () => rejects(
      () => q(
        `insert into public.orders
           (billing_account_id, currency_code, subtotal_minor, discount_minor,
            tax_minor, total_minor, status)
         values ($1,'UGX',30000,0,0,30000,'pending_payment') returning id`,
        [account]),
      /row-level security/i));

    const orders = await count(
      'select id from public.orders where billing_account_id = $1', [account]);
    assert(orders === 0, `${orders} orders exist — the direct insert got through`);
  });

  await test('a user cannot join someone else\'s billing account', async () => {
    const { userId: owner } = await newAdult('Account Owner');
    const { userId: intruder } = await newAdult('Intruder');
    let account = null;

    await committed(async () => {
      account = (await q(
        `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
         values ($1,'UGX','active',$2) returning id`, ['Account Owner', owner])).rows[0].id;
    });

    // The bootstrap is scoped to the creator, so it must not become a way in.
    // Two separate asUser blocks: inside one, the first error aborts the
    // transaction and every later statement fails with "current transaction
    // is aborted", which would mask the read-back assertion entirely.
    await asUser(intruder, async () => {
      await rejects(() => q(
        `insert into public.billing_account_memberships
           (billing_account_id, user_id, can_view_invoices, status, granted_by)
         values ($1,$2,true,'active',$3)`, [account, intruder, intruder]),
        'an unrelated user added themselves to someone else\'s billing account');
    });

    await asUser(intruder, async () => {
      const visible = (await q(
        'select id from public.billing_accounts where id = $1', [account])).rows.length;
      assert(visible === 0, `an unrelated user could read someone else's account (${visible} row)`);
    });
  });

  await test('the creator membership is not duplicated', async () => {
    const { userId } = await newAdult('Repeat Payer');
    let account = null;

    await committed(async () => {
      account = (await q(
        `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
         values ($1,'UGX','active',$2) returning id`, ['Repeat Payer', userId])).rows[0].id;
      // A second attempt to grant the same pair must be a no-op, not an error:
      // bam_one_per_user is unique, and the trigger uses on-conflict-do-nothing.
      await q(`insert into public.billing_account_memberships
                 (billing_account_id, user_id, granted_by) values ($1,$2,$2)
               on conflict (billing_account_id, user_id) do nothing`, [account, userId]);
    });

    const n = await count(
      `select 1 from public.billing_account_memberships
        where billing_account_id = $1 and user_id = $2`, [account, userId]);
    assert(n === 1, `found ${n} memberships for one user on one account, expected 1`);
  });

  // -------------------------------------------------------------------
  // The paid path
  // -------------------------------------------------------------------

  /** A billing account with one member who has a learner profile. */
  async function buyerAccount(name) {
    const { userId, learnerId } = await newAdult(name);
    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ($1, 'UGX', 'active', $2) returning id`, [name, userId])).rows[0].id;
    // Idempotent: the creator is already a member by trigger, so re-asserting
    // the same pair would collide rather than prove anything.
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, can_view_invoices, status, granted_by)
             values ($1, $2, true, 'active', $3)
             on conflict (billing_account_id, user_id) do nothing`, [account, userId, admin]);
    return { userId, learnerId, account };
  }

  async function paidOrder(buyer, pc, totalMinor = 30000) {
    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1, 'UGX', $2, $2, 'pending_payment') returning id`,
      [buyer.account, totalMinor])).rows[0].id;
    const priceId = (await q(
      'select id from public.prices where product_id = $1 limit 1', [pc.productId])).rows[0].id;
    await q(`insert into public.order_items
               (order_id, product_id, price_id, quantity, unit_price_minor,
                currency_code, discount_minor, line_total_minor)
             values ($1, $2, $3, 1, $4, 'UGX', 0, $4)`,
      [order, pc.productId, priceId, totalMinor]);
    return order;
  }

  await test('a confirmed payment grants the course and enrols the buyer', async () => {
    const pc = await publishedCourse({ sold: true });
    const buyer = await buyerAccount('Paying Buyer');
    const order = await paidOrder(buyer, pc);

    // No entitlement and no enrolment before payment.
    assert((await count(
      'select 1 from public.entitlement_grants where learner_profile_id = $1', [buyer.learnerId])) === 0,
      'the buyer had an entitlement before paying');

    // Privileged actor with written evidence, which is the manual path the
    // function allows. A provider event would need signature_verified.
    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'BANK-REF-1', 'Bank statement 2026-01-04']);

    const grants = await count(
      `select 1 from public.entitlement_grants
        where learner_profile_id = $1 and course_version_id = $2
          and source_type = 'purchase' and status = 'active'`,
      [buyer.learnerId, pc.version]);
    assert(grants === 1, `expected 1 purchase grant after payment, found ${grants}`);

    const enrolments = await count(
      `select 1 from public.course_enrolments
        where learner_profile_id = $1 and course_version_id = $2 and source = 'purchase'`,
      [buyer.learnerId, pc.version]);
    assert(enrolments === 1, `expected 1 purchase enrolment, found ${enrolments}`);

    const access = (await q(
      'select public.can_access_course_version($1,$2) v', [buyer.learnerId, pc.version])).rows[0].v;
    assert(access === true, 'the buyer still could not access what they paid for');

    // And they can now read the paid resource the stranger could not.
    let buyerSaw = [];
    await asUser(buyer.userId, async () => {
      buyerSaw = (await q(
        `select display_name from public.lesson_resources
          where lesson_id = $1 order by position`, [pc.lesson])).rows.map((r) => r.display_name);
    });
    assert(buyerSaw.includes('The lesson'),
      `the buyer could not read what they paid for (saw: ${buyerSaw.join(', ') || 'nothing'})`);
  });

  await test('confirming the same payment twice grants once', async () => {
    const pc = await publishedCourse({ sold: true });
    const buyer = await buyerAccount('Double Confirm');
    const order = await paidOrder(buyer, pc);

    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'BANK-REF-2', 'Bank statement 2026-01-05']);
    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'BANK-REF-2', 'Bank statement 2026-01-05']);

    const grants = await count(
      'select 1 from public.entitlement_grants where learner_profile_id = $1', [buyer.learnerId]);
    assert(grants === 1, `a replayed confirmation produced ${grants} grants, expected 1`);

    const enrolments = await count(
      'select 1 from public.course_enrolments where learner_profile_id = $1', [buyer.learnerId]);
    assert(enrolments === 1, `a replayed confirmation produced ${enrolments} enrolments, expected 1`);
  });

  await test('a payment with no proof still grants nothing', async () => {
    // D4: a redirect is not proof. If this ever grants access, the whole
    // payment stack is decorative.
    const pc = await publishedCourse({ sold: true });
    const buyer = await buyerAccount('No Proof');
    const order = await paidOrder(buyer, pc);

    await rejects(() => q(
      'select id from public.record_payment_success($1,$2,$3,$4)',
      [order, admin, 'momo', 'redirect-returned']),
      'a payment was confirmed with no evidence and no provider event');

    const grants = await count(
      'select 1 from public.entitlement_grants where learner_profile_id = $1', [buyer.learnerId]);
    assert(grants === 0, `${grants} grant(s) appeared for an unconfirmed payment`);

    const status = (await q('select status from public.orders where id = $1', [order])).rows[0].status;
    assert(status === 'pending_payment', `the order moved to '${status}' without proof`);
  });

  // -------------------------------------------------------------------
  // The webhook path: no human behind it
  // -------------------------------------------------------------------
  // A provider callback has no session, so it cannot be attributed to a person.
  // governance_audit_events.actor is nullable and has always allowed that;
  // orders_paid_has_evidence did not, and refused a null confirmer outright.
  // 20261029000200_system_payment_confirmer.sql refines it to require evidence
  // and leaves the actor requirement where it is actually enforced — in
  // record_payment_success(), which still refuses an anonymous manual
  // confirmation because is_privileged(null) is false.

  /** A signed provider event, as the webhook route would record it. */
  async function providerEvent(eventId, { verified = true, status = 'received' } = {}) {
    return committed(async () => {
      await q(
        `insert into public.payment_provider_events
           (provider, provider_event_id, event_type, payload, signature_verified, processing_status)
         values ('mtn_momo', $1, 'payment.succeeded', '{}', $2, $3)`,
        [eventId, verified, status]);
      return (await q(
        'select id from public.payment_provider_events where provider_event_id = $1',
        [eventId])).rows[0].id;
    });
  }

  await test('a verified webhook confirms a payment with no human actor', async () => {
    const pc = await publishedCourse({ sold: true });
    const buyer = await buyerAccount('Webhook Buyer');
    const order = await paidOrder(buyer, pc);
    const eventId = await providerEvent('evt_hook_1');

    // Null actor. This is the call the webhook route makes.
    await q('select id from public.record_payment_success($1,$2,$3,$4,$5,null)',
      [order, null, 'mtn_momo', 'hook-ref-1', eventId]);

    const o = (await q(
      `select status, payment_confirmed_by is null as actor_is_null, payment_evidence
         from public.orders where id = $1`, [order])).rows[0];
    assert(o.status === 'paid', `the order is '${o.status}', expected paid`);
    assert(o.actor_is_null === true, 'a human actor was recorded for a webhook payment');
    assert(o.payment_evidence === 'mtn_momo:hook-ref-1',
      `evidence is '${o.payment_evidence}'`);

    // And it fulfils exactly as a manual confirmation does.
    const grants = await count(
      `select 1 from public.entitlement_grants
        where learner_profile_id = $1 and course_version_id = $2 and status = 'active'`,
      [buyer.learnerId, pc.version]);
    assert(grants === 1, `expected 1 active grant from the webhook, found ${grants}`);

    const enrolments = await count(
      `select 1 from public.course_enrolments
        where learner_profile_id = $1 and course_version_id = $2`,
      [buyer.learnerId, pc.version]);
    assert(enrolments === 1, `expected 1 enrolment from the webhook, found ${enrolments}`);
  });

  await test('an unverified event cannot confirm a payment', async () => {
    // The whole webhook path rests on this. A provider redirect is not proof;
    // the signature is.
    const pc = await publishedCourse({ sold: true });
    const buyer = await buyerAccount('Unverified Buyer');
    const order = await paidOrder(buyer, pc);
    const eventId = await providerEvent('evt_hook_2', { verified: false });

    await rejects(() => q(
      'select id from public.record_payment_success($1,$2,$3,$4,$5,null)',
      [order, null, 'mtn_momo', 'hook-ref-2', eventId]),
      'an unverified provider event confirmed a payment');

    const status = (await q('select status from public.orders where id = $1', [order])).rows[0].status;
    assert(status === 'pending_payment', `the order moved to '${status}' on an unverified event`);
  });

  await test('an event cannot be applied twice', async () => {
    const pc = await publishedCourse({ sold: true });
    const buyer = await buyerAccount('Replayed Buyer');
    const order = await paidOrder(buyer, pc);
    const eventId = await providerEvent('evt_hook_3');

    await q('select id from public.record_payment_success($1,$2,$3,$4,$5,null)',
      [order, null, 'mtn_momo', 'hook-ref-3', eventId]);

    // The second call finds the order already paid and returns early, which is
    // the idempotent behaviour D4 requires. Assert it does not double-grant.
    await q('select id from public.record_payment_success($1,$2,$3,$4,$5,null)',
      [order, null, 'mtn_momo', 'hook-ref-3', eventId]);

    const grants = await count(
      'select 1 from public.entitlement_grants where learner_profile_id = $1', [buyer.learnerId]);
    assert(grants === 1, `a replayed webhook produced ${grants} grants, expected 1`);
  });

  await test('an anonymous manual confirmation is still refused', async () => {
    // The constraint was refined, not removed. Dropping the actor must not
    // become a way to confirm a payment on nothing but a typed sentence.
    const pc = await publishedCourse({ sold: true });
    const buyer = await buyerAccount('Anonymous Manual');
    const order = await paidOrder(buyer, pc);

    await rejects(() => q(
      'select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, null, 'manual', 'no-actor', 'a bank slip someone mentioned']),
      'a manual confirmation with no actor was accepted');

    const status = (await q('select status from public.orders where id = $1', [order])).rows[0].status;
    assert(status === 'pending_payment', `the order moved to '${status}' with no actor and no event`);
  });

  await test('fulfilment is recorded in the governance audit trail', async () => {
    const pc = await publishedCourse({ sold: true });
    const buyer = await buyerAccount('Audited Buyer');
    const order = await paidOrder(buyer, pc);

    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'BANK-REF-3', 'Bank statement 2026-01-06']);

    const actions = (await q(
      `select action from public.governance_audit_events
        where target_type = 'order' and target_id = $1 order by occurred_at`, [order]))
      .rows.map((r) => r.action);

    assert(actions.includes('payment.confirmed'),
      `payment.confirmed missing from the audit trail (${actions.join(', ')})`);
    assert(actions.includes('entitlement.granted'),
      `entitlement.granted missing from the audit trail (${actions.join(', ')})`);
  });
}
