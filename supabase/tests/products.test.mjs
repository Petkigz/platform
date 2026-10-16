// The purchase path.
//
// products, prices and product_course_versions all had zero rows and no writer
// anywhere. Every table on the revenue path was dead:
//
//   no product -> no price -> nothing to buy -> no order -> no revenue
//
// checkout.ts resolves a price to a product and its course versions,
// enrolment.ts resolves product_course_versions to the course being bought, and
// accrue_instructor_earnings() walks order_items.product_id ->
// product_course_versions -> courses.created_by to decide who earned what. All
// three were reading tables nothing could fill.
//
// The last test here is the one that matters: a teacher publishes a course,
// staff price it, and a learner can actually buy it.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    newUser, newProfile, newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('prod-admin@example.com');
  const teacher  = await newInstructor('prod-teacher@example.com', admin);
  const reviewer = await newReviewer('prod-reviewer@example.com', admin);

  /** Act as a user and COMMIT. The functions read the actor from the session. */
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

  const createProduct = (who, name = 'Quran Foundations', type = 'course') =>
    asActor(who, 'select public.create_product($1,$2,$3) as id',
      [name, type, 'A structured introduction.']);

  const linkVersion = (who, productId, courseId, versionId) =>
    asActor(who, 'select public.link_product_course_version($1,$2,$3) as ok',
      [productId, courseId, versionId]);

  const setPrice = (who, productId, opts = {}) =>
    asActor(who, 'select public.set_product_price($1,$2,$3,$4,$5) as id', [
      productId,
      opts.amount ?? 10000,
      opts.currency ?? 'USD',
      opts.interval ?? 'one_time',
      opts.market ?? null,
    ]);

  const activate = (who, productId) =>
    asActor(who, 'select public.activate_product($1) as ok', [productId]);

  const productRow = async (id) =>
    (await q('select name, status, deleted_at from public.products where id=$1',
      [id])).rows[0];

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'product test']);

  /** A course with a lesson, published through the real review path. */
  async function publishedCourse({ author = teacher } = {}) {
    const course  = await newCourse(author, { status: 'active' });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);

    await transition(version, 'submitted', author);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    return { course, version };
  }

  /** A product that is genuinely on sale. */
  async function onSale() {
    const { course, version } = await publishedCourse();
    const productId = (await createProduct(teacher)).rows[0].id;
    await linkVersion(teacher, productId, course, version);
    await setPrice(admin, productId);
    await activate(admin, productId);
    return { course, version, productId };
  }

  // -------------------------------------------------------------------
  console.log('\nCreating a product');
  // -------------------------------------------------------------------

  await test('a teacher creates a draft product', async () => {
    const id = (await createProduct(teacher)).rows[0].id;
    assert(id, 'no product id returned');

    const row = await productRow(id);
    assert(row.name === 'Quran Foundations', `name was ${row.name}`);
    assert(row.status === 'draft',
      `a new product was ${row.status}; it must start as a draft, not for sale`);
    assert(row.deleted_at === null);
  });

  await test('a product needs a name', async () => {
    await rejects(() => createProduct(teacher, '   '), /needs a name/i);
  });

  await test('an unsupported product type is refused by name', async () => {
    await rejects(() => createProduct(teacher, 'X', 'subscription'),
      /unsupported product type: subscription/i);
  });

  await test('an anonymous caller cannot create a product', async () => {
    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    await rejects(
      () => q('select public.create_product($1,$2,$3)', ['X', 'course', null]),
      /sign in to create a product/i);
    await q('rollback');
  });

  // -------------------------------------------------------------------
  console.log('\nAttaching a course');
  // -------------------------------------------------------------------

  await test('a published version can be attached', async () => {
    const { course, version } = await publishedCourse();
    const productId = (await createProduct(teacher)).rows[0].id;

    const ok = (await linkVersion(teacher, productId, course, version)).rows[0].ok;
    assert(ok === true, 'linking reported no change');

    const n = (await q(
      `select count(*)::int n from public.product_course_versions
        where product_id=$1 and course_version_id=$2`,
      [productId, version])).rows[0].n;
    assert(n === 1, `found ${n} links, expected 1`);
  });

  await test('a draft version cannot be sold', async () => {
    // A draft has never been reviewed. Selling one would put paid-for content
    // on the platform that the scholarly gate has not seen.
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await createProduct(teacher)).rows[0].id;

    await rejects(() => linkVersion(teacher, productId, course, version),
      /only a published version can be sold/i);
  });

  await test('a version cannot be attached to a course it does not belong to', async () => {
    const a = await publishedCourse();
    const b = await publishedCourse();
    const productId = (await createProduct(teacher)).rows[0].id;

    await rejects(() => linkVersion(teacher, productId, a.course, b.version),
      /is not part of course/i);
  });

  await test('attaching the same version twice is idempotent, not a duplicate', async () => {
    const { course, version } = await publishedCourse();
    const productId = (await createProduct(teacher)).rows[0].id;

    await linkVersion(teacher, productId, course, version);
    await linkVersion(teacher, productId, course, version);

    const n = (await q(
      `select count(*)::int n from public.product_course_versions where product_id=$1`,
      [productId])).rows[0].n;
    assert(n === 1, `found ${n} links after linking twice, expected 1`);
  });

  await test('a stranger cannot attach a course to someone else\'s product', async () => {
    const { course, version } = await publishedCourse();
    const productId = (await createProduct(teacher)).rows[0].id;

    const stranger = await newUser('prod-stranger@example.com');
    await newProfile(stranger, 'Stranger');

    await rejects(() => linkVersion(stranger, productId, course, version),
      /only attach courses to your own product/i);
  });

  // -------------------------------------------------------------------
  console.log('\nPricing is a platform decision');
  // -------------------------------------------------------------------

  await test('a teacher cannot set their own price', async () => {
    // The prices_insert policy is is_privileged(current_user_id()). This is
    // settled by the existing schema and is not reversed here: a price is a
    // platform decision, not the seller's.
    const { productId } = await onSale().then(async () => {
      const id = (await createProduct(teacher)).rows[0].id;
      return { productId: id };
    });

    await rejects(() => setPrice(teacher, productId, { amount: 5000 }),
      /only staff may set a price/i);
  });

  await test('staff set a price and it becomes the active one', async () => {
    const productId = (await createProduct(teacher)).rows[0].id;

    const priceId = (await setPrice(admin, productId, { amount: 10000 })).rows[0].id;
    assert(priceId, 'no price id returned');

    const row = (await q(
      `select amount_minor, currency_code, billing_interval, status
         from public.prices where id=$1`, [priceId])).rows[0];
    assert(Number(row.amount_minor) === 10000, `amount was ${row.amount_minor}`);
    assert(String(row.currency_code).trim() === 'USD',
      `currency was ${JSON.stringify(row.currency_code)}`);
    assert(row.status === 'active', `price status was ${row.status}`);
  });

  await test('a price is an integer number of minor units', async () => {
    const productId = (await createProduct(teacher)).rows[0].id;

    await rejects(() => setPrice(admin, productId, { amount: -1 }),
      /cannot be negative/i);

    // Zero is a legitimate price for a free course; negative is not.
    const free = (await setPrice(admin, productId, { amount: 0 })).rows[0].id;
    assert(free, 'a zero price should be allowed for a free course');
  });

  await test('a currency that is not a 3-letter ISO code is refused', async () => {
    const productId = (await createProduct(teacher)).rows[0].id;

    for (const bad of ['usd', 'US', 'USD1', '']) {
      await rejects(() => setPrice(admin, productId, { currency: bad }),
        /three-letter uppercase ISO code/i);
    }
  });

  await test('a market that is not a 2-letter country code is refused', async () => {
    const productId = (await createProduct(teacher)).rows[0].id;

    await rejects(() => setPrice(admin, productId, { market: 'uga' }),
      /two-letter uppercase country code/i);
    await rejects(() => setPrice(admin, productId, { market: 'ug' }),
      /two-letter uppercase country code/i);

    const ok = (await setPrice(admin, productId, { market: 'UG' })).rows[0].id;
    assert(ok, 'a valid market should be accepted');
  });

  await test('re-pricing supersedes the old price rather than rewriting it', async () => {
    // A price someone already bought at must stay readable as it was, so the
    // old row is closed off and kept rather than updated in place.
    const productId = (await createProduct(teacher)).rows[0].id;

    const first  = (await setPrice(admin, productId, { amount: 10000 })).rows[0].id;
    const second = (await setPrice(admin, productId, { amount: 15000 })).rows[0].id;

    const rows = (await q(
      `select id, amount_minor, status, effective_until from public.prices
        where product_id=$1 order by created_at`, [productId])).rows;

    assert(rows.length === 2, `found ${rows.length} price rows, expected 2`);

    const old = rows.find((r) => r.id === first);
    const now = rows.find((r) => r.id === second);
    assert(old.status === 'retired', `the old price was ${old.status}`);
    assert(old.effective_until !== null, 'the old price was not closed off');
    assert(now.status === 'active', `the new price was ${now.status}`);
    assert(Number(now.amount_minor) === 15000);
  });

  await test('the same product can carry different prices per market', async () => {
    const productId = (await createProduct(teacher)).rows[0].id;

    await setPrice(admin, productId, { amount: 10000, market: 'US' });
    await setPrice(admin, productId, { amount: 20000, market: 'UG' });

    const rows = (await q(
      `select market, status from public.prices where product_id=$1 and status='active'`,
      [productId])).rows;

    assert(rows.length === 2,
      `found ${rows.length} active prices, expected one per market`);
  });

  // -------------------------------------------------------------------
  console.log('\nGoing on sale');
  // -------------------------------------------------------------------

  await test('a product with no course attached cannot go on sale', async () => {
    const productId = (await createProduct(teacher)).rows[0].id;
    await setPrice(admin, productId);

    await rejects(() => activate(admin, productId), /needs a course attached/i);
    assert((await productRow(productId)).status === 'draft');
  });

  await test('a product with no price cannot go on sale', async () => {
    const { course, version } = await publishedCourse();
    const productId = (await createProduct(teacher)).rows[0].id;
    await linkVersion(teacher, productId, course, version);

    await rejects(() => activate(admin, productId), /needs an active price/i);
    assert((await productRow(productId)).status === 'draft');
  });

  await test('only staff can put a product on sale', async () => {
    const { course, version } = await publishedCourse();
    const productId = (await createProduct(teacher)).rows[0].id;
    await linkVersion(teacher, productId, course, version);
    await setPrice(admin, productId);

    await rejects(() => activate(teacher, productId),
      /only staff may put a product on sale/i);
  });

  await test('activating twice reports no change rather than failing', async () => {
    const { productId } = await onSale();
    const again = (await activate(admin, productId)).rows[0].ok;
    assert(again === false, 'a second activation should report no change');
    assert((await productRow(productId)).status === 'active');
  });

  // -------------------------------------------------------------------
  console.log('\nRetirement');
  // -------------------------------------------------------------------

  await test('retiring soft-deletes and closes the price', async () => {
    // D7: soft delete. Prices are closed off rather than removed, because
    // orders that reference them must still resolve.
    const { productId } = await onSale();

    const ok = (await asActor(teacher,
      'select public.retire_product($1) as ok', [productId])).rows[0].ok;
    assert(ok === true, 'retirement reported no change');

    const row = await productRow(productId);
    assert(row.status === 'retired', `status was ${row.status}`);
    assert(row.deleted_at !== null, 'deleted_at was not set');

    const open = (await q(
      `select count(*)::int n from public.prices
        where product_id=$1 and status='active' and effective_until is null`,
      [productId])).rows[0].n;
    assert(open === 0, `${open} prices were left active after retirement`);
  });

  await test('a stranger cannot retire someone else\'s product', async () => {
    const { productId } = await onSale();
    const stranger = await newUser('prod-stranger2@example.com');
    await newProfile(stranger, 'Stranger Two');

    await rejects(() => asActor(stranger,
      'select public.retire_product($1)', [productId]),
      /only retire your own product/i);

    assert((await productRow(productId)).deleted_at === null);
  });

  // -------------------------------------------------------------------
  console.log('\nThe thing this all exists for');
  // -------------------------------------------------------------------

  await test('a learner can buy the course, and the teacher earns from it', async () => {
    // This is the end-to-end proof. Before this migration every table below was
    // empty and unfillable, so this chain could not be run at all.
    const { course, version, productId } = await onSale();

    const priceId = (await q(
      `select id from public.prices where product_id=$1 and status='active'`,
      [productId])).rows[0].id;

    // A buyer: a user with a learner profile and a billing account.
    const buyerId = await newUser('prod-buyer@example.com');
    await newProfile(buyerId, 'Buyer');
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Buyer','adult','18+',$1) returning id`, [buyerId])).rows[0].id;

    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ('Buyer','USD','active',$1) returning id`, [buyerId])).rows[0].id;
    await q(
      `insert into public.billing_account_memberships
         (billing_account_id, user_id, can_view_invoices, status, granted_by)
       values ($1,$2,true,'active',$3)
       on conflict (billing_account_id, user_id) do nothing`,
      [account, buyerId, admin]);

    // An order for that price, paid through the real confirmation path.
    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'USD',10000,10000,'pending_payment') returning id`, [account])).rows[0].id;

    await q(
      `insert into public.order_items
         (order_id, product_id, price_id, quantity, unit_price_minor,
          currency_code, discount_minor, line_total_minor)
       values ($1,$2,$3,1,10000,'USD',0,10000)`,
      [order, productId, priceId]);

    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'PROD-E2E-1', 'Card, receipt PROD-E2E-1']);

    const enrolment = (await q(
      `select course_id from public.course_enrolments
        where learner_profile_id = $1 and course_id = $2`, [learnerId, course])).rows[0];
    assert(enrolment, 'the purchase did not enrol the buyer');

    // And the teacher's share — which walks product_course_versions to find
    // who taught the course they bought.
    // No grant to authenticated: this is invoked by the platform after a
    // payment is confirmed, not by a signed-in user.
    await q('select public.accrue_instructor_earnings($1,null,$2)', [order, admin]);

    const entries = (await q(
      `select instructor_user_id, gross_amount_minor, revenue_share_percent
         from public.instructor_earnings_entries where order_id=$1`, [order])).rows;

    assert(entries.length === 1,
      `found ${entries.length} earnings entries, expected 1`);
    assert(entries[0].instructor_user_id === teacher,
      'the earnings went to the wrong instructor');
  });

  await test('the price the catalogue shows resolves to a real course version', async () => {
    // checkout.ts joins prices -> products -> product_course_versions and
    // refuses to trust a product id from the caller. That join returned nothing
    // at all before this migration.
    const { version, productId } = await onSale();

    const resolved = (await q(
      `select pcv.course_version_id
         from public.prices pr
         join public.products p            on p.id = pr.product_id
         join public.product_course_versions pcv on pcv.product_id = p.id
        where pr.product_id = $1 and pr.status = 'active' and p.status = 'active'`,
      [productId])).rows;

    assert(resolved.length === 1,
      `the price resolved to ${resolved.length} course versions, expected 1`);
    assert(resolved[0].course_version_id === version,
      'the price resolved to the wrong course version');
  });

  // -------------------------------------------------------------------
  console.log('\nAudit trail');
  // -------------------------------------------------------------------

  await test('the whole lifecycle is audited', async () => {
    const { course, version } = await publishedCourse();
    const productId = (await createProduct(teacher)).rows[0].id;
    await linkVersion(teacher, productId, course, version);
    await setPrice(admin, productId);
    await activate(admin, productId);
    await asActor(teacher, 'select public.retire_product($1)', [productId]);

    const actions = (await q(
      `select action from public.governance_audit_events
        where target_type='product' and target_id=$1 order by occurred_at`,
      [productId])).rows.map((x) => x.action);

    const expected = 'product.created,product.version_linked,product.price_set,product.activated,product.retired';
    assert(actions.join(',') === expected,
      `audit actions were [${actions.join(', ')}]`);
  });
}
