// The price follows the buyer's country (decided 2026-10-22).
//
// Until this unit `prices.market` was a label. `create_course_order()` accepted
// any live price id, and `resolveOffering()` listed every market's price on the
// buy page, so a payer in Kampala could buy at the price set for Nairobi and the
// cheapest market was available to anyone who could read a network response.
//
// Two sources of country, in this order, and the test pins both:
//
//   1. The billing account, once a country is recorded on it. That outlives any
//      one request, which is what makes last week's price explain this week's
//      invoice.
//   2. The request, resolved by the hosting layer from the connection's address.
//      Consulted only for an account that has no country yet — a new account, or
//      one that has never bought anything.
//
// And the rule inside a country: the country's price, then the price that
// declares no market, then a refusal. Within that band the account's currency
// wins; a band naming two currencies with no preferred one is refused rather
// than guessed, because picking one would be a coin toss on somebody's money.

export async function run(ctx) {
  const {
    q, test, assert, rejects, committed, asAnon, grantRole,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('mp-admin@example.com');
  const teacher  = await newInstructor('mp-teacher@example.com', admin);
  const reviewer = await newReviewer('mp-reviewer@example.com', admin);
  const finance  = await newUser('mp-finance@example.com');
  await newProfile(finance, 'Finance Admin');
  await committed(() => grantRole(finance, 'finance_admin', admin));

  async function asActor(actor, sql, params = []) {
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

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'market pricing test']);

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

  let seq = 0;
  async function newBuyer(name, over = {}) {
    seq += 1;
    const userId = await newUser(`mp-buyer-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    if (over.account) {
      const account = (await q(
        `insert into public.billing_accounts
           (display_name, billing_currency, billing_country, status, created_by)
         values ($1,$2,$3,'active',$4) returning id`,
        [name, over.account.currency ?? 'UGX', over.account.country ?? null, userId])).rows[0].id;
      // The creator-membership trigger has already made the row; this only
      // makes sure the fixture can pay from it.
      await q(
        `insert into public.billing_account_memberships
           (billing_account_id, user_id, can_view_invoices, can_manage_payment_methods,
            can_cancel_subscriptions, status, granted_by)
         values ($1,$2,true,true,true,'active',$3)
         on conflict (billing_account_id, user_id) do update
           set can_manage_payment_methods = true, status = 'active'`,
        [account, userId, admin]);
      return { userId, learnerId, account };
    }
    return { userId, learnerId, account: null };
  }

  /**
   * A published course behind an active product. `prices` is a list of
   * `{ amount, currency, market }`; the default when none is given is one
   * 30 000 UGX price that declares no market.
   */
  async function sellableCourse(over = {}) {
    const course  = await newCourse(teacher, { status: 'active', title: over.title ?? 'Market Course' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course',$1,'active',$2) returning id`,
      [over.productName ?? 'Market Course product', teacher])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);

    const prices = over.prices ?? [{ amount: 30000, currency: 'UGX', market: null }];
    for (const p of prices) {
      await q(
        `insert into public.prices
           (product_id, amount_minor, currency_code, billing_interval, status, market,
            effective_from)
         values ($1,$2,$3,'one_time','active',$4,now())`,
        [productId, p.amount, p.currency, p.market]);
    }

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    return { course, version, productId };
  }

  const makeOrder = (buyer, courseId, country = null) =>
    withCheckoutOn(() => asActor(buyer.userId,
      'select public.create_course_order($1,$2,$3) as r',
      [courseId, buyer.learnerId, country]))
      .then((r) => r.rows[0].r);

  const resolve = (courseId, country = null, currency = null) =>
    scalar(`select public.resolve_course_price($1,$2,$3) as r`,
      [courseId, country, currency]).then((r) => r.r);

  const priceForMe = (actor, courseId, country = null) => {
    const sql = 'select public.course_price_for_me($1,$2) as r';
    if (actor === null) {
      return asAnon(() => q(sql, [courseId, country])).then((r) => r.rows[0].r);
    }
    return asActor(actor, sql, [courseId, country]).then((r) => r.rows[0].r);
  };

  // ---------------------------------------------------------------------
  console.log('\nWhich price applies');

  const twoMarkets = await sellableCourse({
    title: 'Two Markets',
    prices: [
      { amount: 30000, currency: 'UGX', market: null },
      { amount: 20000, currency: 'UGX', market: 'UG' },
    ],
  });

  await test('a country price is used, and the default is not', async () => {
    const result = await resolve(twoMarkets.course, 'UG');
    assert(result.resolved === true, 'a Ugandan buyer had no price');
    assert(result.amountMinor === '20000',
      `a Ugandan buyer resolved to ${result.amountMinor} instead of the country price`);
    assert(result.matched === 'country', 'the match was not named as a country match');
  });

  await test('a country with no price of its own falls to the default', async () => {
    // Kenya has no price; the price that declares no market is the default the
    // catalogue offers for its currency.
    const result = await resolve(twoMarkets.course, 'KE');
    assert(result.resolved === true, 'the default price was not offered');
    assert(result.amountMinor === '30000', `resolved to ${result.amountMinor}`);
    assert(result.matched === 'default', 'the fallback did not say it was the default');

    // And an unknown country is the same case, not a refusal: the platform
    // cannot place every connection, and pretending it can would break a sale.
    const unknown = await resolve(twoMarkets.course, null);
    assert(unknown.resolved === true && unknown.amountMinor === '30000',
      'an unplaced buyer was not offered the default price');
  });

  await test('a country with no price at all is refused, and named', async () => {
    const onlyUganda = await sellableCourse({
      title: 'Uganda Only',
      prices: [{ amount: 15000, currency: 'UGX', market: 'UG' }],
    });

    const result = await resolve(onlyUganda.course, 'TZ');
    assert(result.resolved === false, 'a Tanzanian buyer resolved to a price');
    assert(result.reason === 'no_price_for_country',
      `refused as ${result.reason} instead of there being no price for the country`);
    assert(result.hasLivePrice === true,
      'the refusal claimed the course has no price anywhere, which would make it look free');
    assert(result.country === 'TZ', 'the refusal did not say which country it was about');
  });

  await test('the account currency breaks a tie inside one country', async () => {
    const twoCurrencies = await sellableCourse({
      title: 'Two Currencies',
      prices: [
        { amount: 8000, currency: 'USD', market: 'TZ' },
        { amount: 300000, currency: 'TZS', market: 'TZ' },
      ],
    });

    const dollars = await resolve(twoCurrencies.course, 'TZ', 'USD');
    assert(dollars.resolved === true && dollars.currencyCode === 'USD',
      'a USD account did not get the USD price');

    const shillings = await resolve(twoCurrencies.course, 'TZ', 'TZS');
    assert(shillings.resolved === true && shillings.currencyCode === 'TZS',
      'a TZS account did not get the TZS price');

    // Neither is preferred by a new account, so there is no honest answer.
    const neither = await resolve(twoCurrencies.course, 'TZ', null);
    assert(neither.resolved === false, 'two currencies were resolved without a preference');
    assert(neither.reason === 'price_ambiguous', `refused as ${neither.reason}`);
    assert(neither.currencies.length === 2, 'the refusal did not name both currencies');
  });

  // ---------------------------------------------------------------------
  console.log('\nThe country on the account');

  await test('a first purchase records the country the request came from', async () => {
    const course = await sellableCourse({
      title: 'First Purchase',
      prices: [
        { amount: 30000, currency: 'UGX', market: null },
        { amount: 21000, currency: 'UGX', market: 'UG' },
      ],
    });
    const buyer = await newBuyer('First Time');

    // Lower case and padded: a proxy header is not required to be tidy, and a
    // misspelled market would silently fall back to the default price.
    const made = await makeOrder(buyer, course.course, ' ug ');
    assert(made.amountMinor === '21000',
      `the first purchase charged ${made.amountMinor} instead of the Ugandan price`);

    const account = await scalar(
      `select billing_country, billing_currency from public.billing_accounts where id = $1`,
      [made.billingAccountId]);
    assert(account.billing_country === 'UG', `the account country is ${account.billing_country}`);
    assert(account.billing_currency === 'UGX',
      `the account currency is ${account.billing_currency}, not the price's`);

    const audit = (await q(
      `select detail from public.governance_audit_events
        where action = 'commerce.billing_country_set' and target_id = $1`,
      [made.billingAccountId])).rows;
    assert(audit.length === 1, 'recording the country on a new account was not audited once');
    assert(audit[0].detail.source === 'first_purchase', 'the audit lost where the country came from');
  });

  await test('a country recorded once is not moved by a later request', async () => {
    const course = await sellableCourse({
      title: 'Fixed Country',
      prices: [
        { amount: 30000, currency: 'UGX', market: null },
        { amount: 20000, currency: 'UGX', market: 'UG' },
        { amount: 7000, currency: 'KES', market: 'KE' },
      ],
    });
    const buyer = await newBuyer('Fixed Family');

    const first = await makeOrder(buyer, course.course, 'UG');
    assert(first.amountMinor === '20000', 'the first order did not use the Ugandan price');

    // The same family, on a network in Kenya. The account is what the price
    // follows; a request that disagrees with it does not re-price them.
    const secondCourse = await sellableCourse({
      title: 'Second Purchase',
      prices: [
        { amount: 99000, currency: 'UGX', market: null },
        { amount: 1000, currency: 'KES', market: 'KE' },
      ],
    });
    const second = await makeOrder(buyer, secondCourse.course, 'KE');
    assert(second.billingAccountId === first.billingAccountId,
      'a second account was opened for the same person');
    assert(second.amountMinor === '99000',
      `travel re-priced the family: charged ${second.amountMinor}`);

    const account = await scalar(
      `select billing_country from public.billing_accounts where id = $1`,
      [first.billingAccountId]);
    assert(account.billing_country === 'UG', `the account country moved to ${account.billing_country}`);
  });

  await test('staff move a country in writing, and the next order follows it', async () => {
    const course = await sellableCourse({
      title: 'Moved Family',
      prices: [
        { amount: 30000, currency: 'UGX', market: null },
        { amount: 20000, currency: 'UGX', market: 'UG' },
        { amount: 12000, currency: 'KES', market: 'KE' },
      ],
    });
    const buyer = await newBuyer('Relocated');
    const first = await makeOrder(buyer, course.course, 'UG');
    assert(first.amountMinor === '20000', 'the first order was not the Ugandan price');

    await rejects(() => asActor(teacher,
      'select public.set_billing_country($1,$2,$3)',
      [first.billingAccountId, 'KE', 'Moved to Nairobi']),
    /only a finance admin may change the country/);

    await rejects(() => asActor(finance,
      'select public.set_billing_country($1,$2,$3)',
      [first.billingAccountId, 'KE', '   ']),
    /say why this account's billing country is being changed/);

    await rejects(() => asActor(finance,
      'select public.set_billing_country($1,$2,$3)',
      [first.billingAccountId, 'Kenya', 'Moved']),
    /a country is a two-letter ISO 3166-1 code/);

    const moved = await asActor(finance,
      'select public.set_billing_country($1,$2,$3) as r',
      [first.billingAccountId, 'KE', 'Family relocated to Nairobi, tenancy agreement seen']);
    assert(moved.rows[0].r.changed === true, 'the move reported no change');

    const audit = (await q(
      `select actor, detail from public.governance_audit_events
        where action = 'commerce.billing_country_changed' and target_id = $1`,
      [first.billingAccountId])).rows;
    assert(audit.length === 1, 'the move was not audited once');
    assert(audit[0].actor === finance, 'the audit named the wrong person');
    assert(audit[0].detail.from === 'UG' && audit[0].detail.to === 'KE',
      'the audit did not record what changed');
    assert(/Nairobi/.test(audit[0].detail.reason), 'the audit lost the reason');

    // A different course, same catalogue shape: the next purchase is Kenyan.
    const another = await sellableCourse({
      title: 'Moved Family Again',
      prices: [
        { amount: 30000, currency: 'UGX', market: null },
        { amount: 20000, currency: 'UGX', market: 'UG' },
        { amount: 12000, currency: 'KES', market: 'KE' },
      ],
    });
    const next = await makeOrder(buyer, another.course, 'TZ');
    assert(next.amountMinor === '12000',
      `the moved family was charged ${next.amountMinor}, not the Kenyan price`);
    assert(next.matched === 'country', 'the order did not say it matched the new country');
  });

  await test('a second move to the same country reports nothing to do', async () => {
    const course = await sellableCourse({ title: 'Already There' });
    const buyer = await newBuyer('Already Kenyan', { account: { country: 'KE' } });
    const made = await makeOrder(buyer, course.course, 'KE');

    const again = await asActor(finance,
      'select public.set_billing_country($1,$2,$3) as r',
      [made.billingAccountId, 'KE', 'Support ticket 42']);
    assert(again.rows[0].r.changed === false, 'a no-op move reported a change');
    assert(/already billed there/.test(again.rows[0].r.note), 'a no-op did not say why');

    const audit = (await q(
      `select count(*)::int n from public.governance_audit_events
        where action = 'commerce.billing_country_changed' and target_id = $1`,
      [made.billingAccountId])).rows[0].n;
    assert(audit === 0, 'a no-op move was audited');
  });

  // ---------------------------------------------------------------------
  console.log('\nWhat the page is allowed to say');

  await test('the read path uses the same answer the writer will charge', async () => {
    const course = await sellableCourse({
      title: 'Read Path',
      prices: [
        { amount: 30000, currency: 'UGX', market: null },
        { amount: 20000, currency: 'UGX', market: 'UG' },
      ],
    });
    const buyer = await newBuyer('Read Their Price', { account: { country: 'UG' } });

    const shown = await priceForMe(buyer.userId, course.course, 'KE');
    assert(shown.resolved === true, 'the page could not price the course');
    assert(shown.amountMinor === '20000', `the page showed ${shown.amountMinor}`);
    assert(shown.countrySource === 'account',
      `the page used ${shown.countrySource} instead of the account`);

    const charged = await makeOrder(buyer, course.course, 'KE');
    assert(charged.amountMinor === shown.amountMinor,
      `the page showed ${shown.amountMinor} and the order charged ${charged.amountMinor}`);
  });

  await test('a signed-out visitor sees the default price and is told nothing was decided', async () => {
    const shown = await priceForMe(null, twoMarkets.course, null);
    assert(shown.resolved === true, 'an anonymous visitor could not price the course');
    assert(shown.amountMinor === '30000', `the anonymous price was ${shown.amountMinor}`);
    assert(shown.countrySource === 'none', 'an anonymous visitor was given a country source');
  });

  await test('a request country is a display hint, and is named as one', async () => {
    const buyer = await newBuyer('Hinted');
    const shown = await priceForMe(buyer.userId, twoMarkets.course, 'UG');
    assert(shown.countrySource === 'request', 'the request country was not named as the source');
    assert(shown.amountMinor === '20000', `the hinted price was ${shown.amountMinor}`);

    // Nothing was written: reading a price does not establish a country.
    const country = await scalar(
      `select count(*)::int n from public.billing_accounts where created_by = $1`,
      [buyer.userId]);
    assert(country.n === 0, `${country.n} accounts were opened by a price read`);
  });

  await test('a course that is not sold here is not shown as free', async () => {
    const onlyUganda = await sellableCourse({
      title: 'Not Sold Here',
      prices: [{ amount: 15000, currency: 'UGX', market: 'UG' }],
    });
    const buyer = await newBuyer('Tanzanian', { account: { country: 'TZ' } });

    const shown = await priceForMe(buyer.userId, onlyUganda.course);
    assert(shown.resolved === false, 'a course with no price for this country resolved');
    assert(shown.reason === 'no_price_for_country', `the page said ${shown.reason}`);
    assert(shown.hasLivePrice === true,
      'the page would read this as a free course, and free enrolment would be refused later');
  });

  // ---------------------------------------------------------------------
  console.log('\nNothing else moved');

  await test('a price id can no longer be posted to the writer', async () => {
    const offer = await sellableCourse({ title: 'No Price Id' });
    const args = (await scalar(
      `select pg_get_function_arguments('public.create_course_order(uuid,uuid,text)'::regprocedure) as a`
    )).a;
    assert(/p_buyer_country/.test(args) && !/p_price_id/.test(args),
      `the writer still accepts a price id: ${args}`);

    const buyer = await newBuyer('No Price Id Buyer');
    // A price id is a uuid, and a uuid is not a country. The value is only
    // there to make the point: this writer has nowhere to put a price.
    const aPriceId = (await scalar('select gen_random_uuid() id')).id;
    await withCheckoutOn(async () => {
      await rejects(() => asActor(buyer.userId,
        'select public.create_course_order($1,$2,$3)',
        [offer.course, buyer.learnerId, aPriceId]),
      /a country is a two-letter ISO 3166-1 code/);
    });
  });

  await test('the resolver only sees prices on an active product', async () => {
    const offer = await sellableCourse({ title: 'Draft Product Market' });
    await q(`update public.products set status = 'draft' where id = $1`, [offer.productId]);
    try {
      const result = await resolve(offer.course, 'UG');
      assert(result.resolved === false, 'a draft product still offered a price');
      assert(result.reason === 'no_price', `resolved as ${result.reason}`);
    } finally {
      await q(`update public.products set status = 'active' where id = $1`, [offer.productId]);
    }
  });

  await test('a price outside its window is not on sale', async () => {
    const offer = await sellableCourse({ title: 'Expired Market' });
    await q(`update public.prices
                set effective_from = now() - interval '60 days',
                    effective_until = now() - interval '30 days'
              where product_id = $1`, [offer.productId]);

    const result = await resolve(offer.course, 'UG');
    assert(result.resolved === false, 'an expired price resolved');
    assert(result.hasLivePrice === false, 'an expired price counted as being on sale');
  });
}
