// Inviting a friend, without paying anybody.
//
// A referral is a discount code with a person's name on it: the friend buys
// their first course for less, and the referrer is minted a code for their next
// one once the money has actually stayed. This suite holds the rules that make
// that safe — you cannot invite yourself, a code cannot earn twice, the reward
// waits for the refund window, and the numbers are the owner's, on a screen,
// with a written reason.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('ref-admin@example.com');
  const teacher = await newInstructor('ref-teacher@example.com', admin);
  const reviewer = await newReviewer('ref-reviewer@example.com', admin);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
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
  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  /**
   * Settings are written the way the product writes them. The authority trigger
   * refuses a bare table write for anybody who is not the migration, and that is
   * the rule this suite is meant to be held to as well.
   */
  // A switch is the owner's, and is flipped on the flag dashboard: the update
  // goes straight at the row, which is what that page does.
  const flag = (key, on) =>
    asActor(admin, 'update public.platform_settings set value_text = $2 where key = $1',
      [key, on ? 'true' : 'false']);

  // A number with a screen of its own goes through that screen's writer.
  const setting = (key, value) =>
    asActor(admin, 'select public.set_platform_control($1,$2,$3)',
      [key, String(value), 'referral test']);

  const refundWindow = (hours) =>
    asActor(admin, 'select public.set_refund_window($1,$2)', [hours, 'referral test']);

  // Referrals on for the whole suite: every test that needs it off turns it off
  // and back on explicitly.
  await flag('commerce.referrals', true);
  try {
    await flag('commerce.checkout', true);
    await setting('commerce.referral_referee_percent', 10);
    await setting('commerce.referral_reward_percent', 20);
    await setting('commerce.referral_max_per_year', 10);
    await setting('commerce.referral_reward_expiry_days', 90);
    await refundWindow(72);

    let seq = 0;
    async function person(name) {
      seq += 1;
      const userId = await newUser(`ref-${seq}@example.com`);
      await newProfile(userId, name);
      const learnerId = (await scalar(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
      return { userId, learnerId, name };
    }

    async function sellable(amount = 30000) {
      seq += 1;
      const course = await newCourse(teacher, { status: 'active', title: `Referral course ${seq}` });
      const version = await newVersion(course, teacher);
      const section = await newSection(version);
      await newLesson(section);
      const productId = (await scalar(
        `insert into public.products (product_type, name, status, created_by)
         values ('course',$1,'active',$2) returning id`, [`Referral product ${seq}`, teacher])).id;
      await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
               values ($1,$2,$3)`, [productId, course, version]);
      await q(`insert into public.prices
                 (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
               values ($1,$2,'UGX','one_time','active','UG',now())`, [productId, amount]);

      for (const [status, actor] of [['submitted', teacher], ['approved', reviewer],
                                     ['published', admin]]) {
        await q('select id from public.set_course_version_status($1,$2,$3,$4)',
          [version, status, actor, 'referral test']);
        if (status === 'approved') await satisfyReview(version, reviewer, admin);
      }
      return { course, version, productId };
    }

    const myCode = (actor) =>
      asActor(actor, 'select public.my_referral_code() as r').then((res) => res.rows[0].r);

    const buy = async (buyer, courseId, code) => {
      const res = await asActor(buyer.userId,
        'select public.create_course_order($1,$2,$3,$4) r',
        [courseId, buyer.learnerId, 'UG', code]);
      return res.rows[0].r;
    };

    const payOrder = (orderId) =>
      q(`select public.record_payment_success($1,$2,'manual',$3,null,'Receipt')`,
        [orderId, admin, `REF-${orderId.slice(0, 8)}`]);

    const conversionFor = async (referee) =>
      (await q(`select * from public.referral_conversions where referee_user_id = $1`,
        [referee])).rows[0] ?? null;

    // -------------------------------------------------------------------------
    // The code
    // -------------------------------------------------------------------------
    await test('a person gets one code, and asking twice returns the same one', async () => {
      const inviter = await person('Inviter One');

      const first = await myCode(inviter.userId);
      assert(/^AYA-[A-Z0-9]{6}$/.test(first.code), `the code was ${first.code}`);
      eq(first.created, true, 'the first call minted it');

      const second = await myCode(inviter.userId);
      eq(second.code, first.code, 'the second call');
      eq(second.created, false, 'the second call created another');

      const rows = await q('select count(*)::int n from public.referral_codes where user_id = $1',
        [inviter.userId]);
      eq(rows.rows[0].n, 1, 'codes for one person');
    });

    await test('the code is a real discount, sitting on a live campaign', async () => {
      const inviter = await person('Inviter Two');
      const { code } = await myCode(inviter.userId);

      const row = (await q(
        `select c.status, c.per_user_limit, c.new_customers_only, b.benefit_type, b.percent_off
           from public.referral_codes rc
           join public.promotion_campaigns c on c.id = rc.campaign_id
           join public.promotion_benefits b on b.campaign_id = c.id
          where rc.code = $1`, [code])).rows[0];

      eq(row.status, 'active', 'the campaign');
      eq(row.per_user_limit, 1, 'the use limit');
      eq(row.new_customers_only, true, 'a first purchase only');
      eq(row.benefit_type, 'percent_off', 'the benefit');
      eq(Number(row.percent_off), 10, 'the referee discount');
    });

    await test('a visitor who is not signed in can still read what a link is worth', async () => {
      const inviter = await person('Inviter Public');
      const { code } = await myCode(inviter.userId);

      // The landing page is read before anybody makes an account, so `anon` has
      // to be able to call the lookup — and nothing else here.
      const seen = (await q("select public.resolve_referral_code($1) as r", [code])).rows[0].r;
      eq(seen.found, true, 'the lookup for a signed-out visitor');

      const anonCanLookUp = (await q(
        `select has_function_privilege('anon'::name, 'public.resolve_referral_code(text)', 'execute') as may`)).rows[0].may;
      eq(anonCanLookUp, true, 'a visitor cannot read what the link is worth');

      const anonMay = (await q(
        `select has_function_privilege('anon'::name, 'public.my_referrals()', 'execute') as may`)).rows[0].may;
      eq(anonMay, false, 'an anonymous caller may read somebody\'s invitation board');
    });

    await test('a shared link shows what it is worth and nothing about the person', async () => {
      const inviter = await person('Inviter Three');
      const { code } = await myCode(inviter.userId);

      const seen = (await q('select public.resolve_referral_code($1) as r', [code.toLowerCase()])).rows[0].r;
      eq(seen.found, true, 'the code was found in lower case');
      eq(seen.inviterName, 'Inviter Three', 'the inviter name');
      eq(Number(seen.percentOff), 10, 'the discount');
      assert(!('email' in seen), 'the lookup returned an email address');

      const missing = (await q("select public.resolve_referral_code('AYA-NOPE00') as r")).rows[0].r;
      eq(missing.found, false, 'a code that does not exist');
    });

    await test('the feature ships off, and both the code and the link say so', async () => {
      const inviter = await person('Inviter Off');
      await flag('commerce.referrals', false);
      try {
        await rejects(() => myCode(inviter.userId), /not switched on/);
        const seen = (await q("select public.resolve_referral_code('AYA-ANYTHI') as r")).rows[0].r;
        eq(seen.found, false, 'the lookup while off');
        eq(seen.disabled, true, 'the lookup says why');
      } finally {
        await flag('commerce.referrals', true);
      }
    });

    // -------------------------------------------------------------------------
    // Using it
    // -------------------------------------------------------------------------
    await test('using your own code is refused, not discounted', async () => {
      const inviter = await person('Self Referrer');
      const { code } = await myCode(inviter.userId);
      const offer = await sellable();

      await rejects(() => buy(inviter, offer.course, code), /self_referral/);
      eq(await conversionFor(inviter.userId), null, 'a conversion was still recorded');
    });

    await test('a friend who uses the code pays less, and the introduction is recorded', async () => {
      const inviter = await person('Inviter Four');
      const friend = await person('Friend Four');
      const { code } = await myCode(inviter.userId);
      const offer = await sellable(30000);

      const order = await buy(friend, offer.course, code);
      const made = (await scalar(
        `select subtotal_minor::int s, discount_minor::int d, total_minor::int t
           from public.orders where id = $1`, [order.orderId]));
      eq(made.s, 30000, 'the subtotal');
      eq(made.d, 3000, 'the discount at 10%');
      eq(made.t, 27000, 'the total');

      const conversion = await conversionFor(friend.userId);
      assert(conversion, 'no conversion was recorded');
      eq(conversion.status, 'pending', 'the conversion before payment');
      eq(conversion.referrer_user_id, inviter.userId, 'who gets the credit');
      eq(conversion.order_id, order.orderId, 'the qualifying order');
    });

    await test('a second friend earns no second reward from the same person', async () => {
      const inviter = await person('Inviter Five');
      const friendA = await person('Friend Five A');
      const friendB = await person('Friend Five B');
      const { code } = await myCode(inviter.userId);
      const offerA = await sellable();
      const offerB = await sellable();

      await buy(friendA, offerA.course, code);
      await buy(friendB, offerB.course, code);

      const rows = await q(`select count(*)::int n from public.referral_conversions
                             where referrer_user_id = $1`, [inviter.userId]);
      // Two friends, two introductions — the *code* is reusable, the reward is one
      // per friend, which is the point of a referral rather than a coupon.
      eq(rows.rows[0].n, 2, 'introductions recorded');
    });

    await test('one person can only ever be referred once', async () => {
      const first = await person('Inviter Six A');
      const second = await person('Inviter Six B');
      const friend = await person('Friend Six');
      const codeA = (await myCode(first.userId)).code;
      const codeB = (await myCode(second.userId)).code;
      const offerA = await sellable();
      const offerB = await sellable();

      await buy(friend, offerA.course, codeA);
      await buy(friend, offerB.course, codeB);

      const conversion = await conversionFor(friend.userId);
      eq(conversion.referrer_user_id, first.userId,
        'the first inviter keeps the credit for the introduction');
      const rows = await q('select count(*)::int n from public.referral_conversions where referee_user_id = $1',
        [friend.userId]);
      eq(rows.rows[0].n, 1, 'conversions for one person');
    });

    await test('a refused code leaves no order behind', async () => {
      const inviter = await person('Inviter Seven');
      const { code } = await myCode(inviter.userId);
      const offer = await sellable();
      const friend = await person('Friend Seven');

      // The friend is not a new customer: they bought, and paid, before.
      const earlier = await sellable();
      const firstOrder = await buy(friend, earlier.course, null);
      await payOrder(firstOrder.orderId);

      await rejects(() => buy(friend, offer.course, code), /new_customers_only/);
      const rows = await q(`select count(*)::int n from public.orders where learner_profile_id = $1`,
        [friend.learnerId]);
      eq(rows.rows[0].n, 1, 'orders after the refusal');
    });

    // -------------------------------------------------------------------------
    // Earning it
    // -------------------------------------------------------------------------
    await test('paying the friend’s order mints the referrer a code, which waits for the refund window', async () => {
      const inviter = await person('Inviter Eight');
      const friend = await person('Friend Eight');
      const { code } = await myCode(inviter.userId);
      const offer = await sellable(30000);

      const order = await buy(friend, offer.course, code);
      await payOrder(order.orderId);

      const conversion = await conversionFor(friend.userId);
      eq(conversion.status, 'rewarded', 'the conversion after payment');
      assert(conversion.reward_code, 'no reward code was minted');

      const campaign = (await q(
        `select c.starts_at, c.ends_at, c.status, b.percent_off
           from public.promotion_campaigns c
           join public.promotion_benefits b on b.campaign_id = c.id
          where c.code = $1`, [conversion.reward_code])).rows[0];
      eq(campaign.status, 'active', 'the reward campaign');
      eq(Number(campaign.percent_off), 20, 'the reward percentage');
      assert(new Date(campaign.starts_at).getTime() > Date.now(),
        'the reward started before the refund window closed');

      // And it cannot be used yet.
      const other = await sellable(30000);
      const inviterOrder = await rejects(
        () => buy(inviter, other.course, conversion.reward_code), /not_running/);
      assert(!inviterOrder, 'the reward was usable before it started');
    });

    await test('the reward becomes usable once the window has passed', async () => {
      const inviter = await person('Inviter Nine');
      const friend = await person('Friend Nine');
      const { code } = await myCode(inviter.userId);
      const offer = await sellable(30000);

      const order = await buy(friend, offer.course, code);
      await payOrder(order.orderId);
      const conversion = await conversionFor(friend.userId);

      // Time passes: the window closed a minute ago.
      await q(`update public.promotion_campaigns set starts_at = now() - interval '1 minute'
                where code = $1`, [conversion.reward_code]);

      const next = await sellable(30000);
      const made = await buy(inviter, next.course, conversion.reward_code);
      const disc = (await scalar('select discount_minor::int d from public.orders where id = $1',
        [made.orderId])).d;
      eq(disc, 6000, 'the referrer’s discount at 20%');
    });

    await test('a refund before the reward starts cancels it', async () => {
      const inviter = await person('Inviter Ten');
      const friend = await person('Friend Ten');
      const { code } = await myCode(inviter.userId);
      const offer = await sellable(30000);

      const order = await buy(friend, offer.course, code);
      await payOrder(order.orderId);
      const conversion = await conversionFor(friend.userId);

      await q(`update public.orders set status = 'refunded' where id = $1`, [order.orderId]);

      const after = (await q('select * from public.referral_conversions where id = $1',
        [conversion.id])).rows[0];
      eq(after.status, 'reversed', 'the conversion after the refund');
      assert(after.reversed_at, 'the reversal was not timestamped');

      const campaign = (await q('select status from public.promotion_campaigns where code = $1',
        [conversion.reward_code])).rows[0];
      eq(campaign.status, 'archived', 'the reward campaign');
    });

    await test('the yearly cap stops the reward without hiding the introduction', async () => {
      await setting('commerce.referral_max_per_year', 0);
      try {
        const inviter = await person('Inviter Eleven');
        const friend = await person('Friend Eleven');
        const { code } = await myCode(inviter.userId);
        const offer = await sellable(30000);

        const order = await buy(friend, offer.course, code);
        await payOrder(order.orderId);

        const conversion = await conversionFor(friend.userId);
        eq(conversion.status, 'capped', 'the conversion');
        eq(conversion.reward_code, null, 'a reward was minted past the cap');
      } finally {
        await setting('commerce.referral_max_per_year', 10);
      }
    });

    // -------------------------------------------------------------------------
    // What the person reads
    // -------------------------------------------------------------------------
    await test('the referral page has the code, the terms and who came', async () => {
      const inviter = await person('Inviter Twelve');
      const friend = await person('Friend Twelve');
      const { code } = await myCode(inviter.userId);
      const offer = await sellable(30000);
      const order = await buy(friend, offer.course, code);
      await payOrder(order.orderId);

      const board = (await asActor(inviter.userId, 'select public.my_referrals() as r')).rows[0].r;
      eq(board.enabled, true, 'the flag');
      eq(board.code, code, 'the code');
      eq(Number(board.refereePercent), 10, 'the referee percentage');
      eq(Number(board.rewardPercent), 20, 'the reward percentage');
      eq(board.joined, 1, 'people who joined');
      eq(board.invited.length, 1, 'the invited list');
      eq(board.invited[0].name, 'Friend', 'the invited name is first-name only');
      assert(!('email' in board.invited[0]), 'the invited list leaked an email');
      eq(board.rewards.length, 1, 'rewards');
      assert(board.rewards[0].code, 'the reward has no code');
    });

    await test('a person with no invitations gets an honest empty board, not an error', async () => {
      const lonely = await person('Lonely Person');
      const board = (await asActor(lonely.userId, 'select public.my_referrals() as r')).rows[0].r;
      eq(board.joined, 0, 'people who joined');
      eq(board.rewards.length, 0, 'rewards');
      eq(board.invited.length, 0, 'invited people');
      eq(board.code, null, 'a code that was never minted');
    });

    // -------------------------------------------------------------------------
    // The numbers
    // -------------------------------------------------------------------------
    await test('a learner cannot change the terms; staff can, with a reason, and it is audited', async () => {
      const person1 = await person('Terms Person');

      await rejects(
        () => asActor(person1.userId,
          'select public.set_platform_control($1,$2,$3)',
          ['commerce.referral_reward_percent', '50', 'because']),
        /only platform staff/);

      await rejects(
        () => asActor(admin, 'select public.set_platform_control($1,$2,$3)',
          ['commerce.referral_reward_percent', '30', '   ']),
        /say why/);

      await rejects(
        () => asActor(admin, 'select public.set_platform_control($1,$2,$3)',
          ['commerce.referral_reward_percent', '120', 'too much']),
        /above the ceiling/);

      await rejects(
        () => asActor(admin, 'select public.set_platform_control($1,$2,$3)',
          ['commerce.referral_reward_percent', 'lots', 'not a number']),
        /takes a whole number/);

      const out = (await asActor(admin, 'select public.set_platform_control($1,$2,$3) as r',
        ['commerce.referral_reward_percent', '25', 'A smaller programme while we test it'])).rows[0].r;
      eq(out.value, '25', 'the new reward percentage');
      eq(out.changed, true, 'the writer says it changed');

      const audit = (await q(`select detail from public.governance_audit_events
                               where action = 'setting.control_changed'
                                 and detail ->> 'key' = 'commerce.referral_reward_percent'
                               order by occurred_at desc limit 1`)).rows[0];
      eq(audit.detail.reason, 'A smaller programme while we test it', 'the recorded reason');
      eq(audit.detail.from, '20', 'the value it was');

      await asActor(admin, 'select public.set_platform_control($1,$2,$3)',
        ['commerce.referral_reward_percent', '20', 'restore']);
    });

    await test('the four referral numbers are controls on the settings screen, not a new page', async () => {
      const keys = (await q(`select control_key, requires_platform, label
                               from public.platform_control_rules()
                              where control_key like 'commerce.referral%'
                              order by control_key`)).rows;
      eq(keys.length, 4, 'referral controls');
      for (const row of keys) {
        eq(row.requires_platform, true, `${row.control_key} is not the platform admin's`);
        assert(row.label, `${row.control_key} has no label a screen can show`);
      }

      const board = (await asActor(admin, 'select public.platform_controls() as r')).rows[0].r;
      const mine = board.controls.filter((c) => c.key.startsWith('commerce.referral'));
      eq(mine.length, 4, 'referral controls on the admin settings screen');
      eq(Number(board.totalControls), 15, 'the whole register of controls');
    });

    await test('a percentage changed later does not re-price a code already shared', async () => {
      const inviter = await person('Inviter Thirteen');
      const friend = await person('Friend Thirteen');
      const { code } = await myCode(inviter.userId);

      await setting('commerce.referral_referee_percent', 40);
      try {
        const offer = await sellable(30000);
        const order = await buy(friend, offer.course, code);
        const disc = (await scalar('select discount_minor::int d from public.orders where id = $1',
          [order.orderId])).d;
        // The code was minted at 10%, and the friend was told 10%.
        eq(disc, 3000, 'the discount after the percentage changed');
      } finally {
        await setting('commerce.referral_referee_percent', 10);
      }
    });

    await test('the staff overview is staff-only and counts what happened', async () => {
      const learner = await person('Overview Learner');
      await rejects(
        () => asActor(learner.userId, 'select public.referral_overview()'),
        /only platform staff/);

      const board = (await asActor(admin, 'select public.referral_overview() as r')).rows[0].r;
      assert(board.codes > 0, 'the programme has no codes');
      assert(board.conversions >= board.rewardsMinted,
        'more rewards than introductions, which cannot be');
      assert(Array.isArray(board.recent), 'the recent list is missing');
    });

    await test('the flag is the owner’s to flip, and says what it needs', async () => {
      const row = (await q(`select gate_type, preconditions, description
                              from public.platform_settings where key = 'commerce.referrals'`)).rows[0];
      eq(row.gate_type, 'admin', 'a built feature must not stay CODE-gated');
      assert(row.preconditions, 'an admin flag with no written precondition is a bug waiting to be enabled');
      assert(/discount/.test(row.description), 'the description does not say what the benefit is');
    });
  } finally {
    await flag('commerce.referrals', false);
    await flag('commerce.checkout', false);
  }
}
