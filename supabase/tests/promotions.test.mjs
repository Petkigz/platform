// Promotions: who may run one, where, and what a fixed amount is worth there.
//
// The owner's rule (2026-10-22) is that the platform and sometimes teachers run
// promotions, that different promotions run in different regions and countries,
// and that prices already differ by market. These tests hold the two
// consequences that are easy to get wrong: a teacher can only discount their
// own course, and a fixed amount cannot be written in one currency and aimed at
// a market priced in another.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('promo-admin@example.com');
  const teacher = await newInstructor('promo-teacher@example.com', admin);
  const otherTeacher = await newInstructor('promo-teacher-2@example.com', admin);
  const reviewer = await newReviewer('promo-reviewer@example.com', admin);
  const learner = await newUser('promo-learner@example.com');
  await newProfile(learner, 'Learner');

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

  async function transition(versionId, status, actor) {
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'promotion test']);
  }

  let courseSeq = 0;

  /** A published course with one live price per entry in `prices`. */
  async function sellable(author, prices) {
    courseSeq += 1;
    const course = await newCourse(author, {
      status: 'active', title: `Promotion Course ${courseSeq}`,
    });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Promoted product','active',$1) returning id`, [author])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);

    for (const p of prices) {
      await q(
        `insert into public.prices
           (product_id, amount_minor, currency_code, billing_interval, status, market,
            effective_from)
         values ($1,$2,$3,'one_time','active',$4,now())`,
        [productId, p.amount, p.currency, p.market]);
    }

    await transition(version, 'submitted', author);
    await transition(version, 'approved', admin);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version };
  }

  const create = (actor, code, over = {}) => asActor(actor,
    `select public.create_promotion_campaign(
       $1,$2,$3,$4,$5,$6,$7::text[],$8::uuid[],null,null,$9,$10,false,$11) id`,
    [code, over.name ?? 'Eid offer', over.benefit ?? 'percent_off',
     over.percent ?? 20, over.amount ?? null, over.currency ?? null,
     over.markets ?? [], over.courses ?? [],
     over.totalLimit ?? null, over.perUserLimit ?? null,
     over.perFamilyLimit ?? null]);

  // Two markets, two currencies: the shape the whole unit is about.
  const prices = [
    { amount: 30000, currency: 'UGX', market: 'UG' },
    { amount: 900, currency: 'KES', market: 'KE' },
  ];
  const offer = await sellable(teacher, prices);

  await test('the owner can run a percentage promotion everywhere', async () => {
    const { id } = (await create(admin, 'all-markets', { markets: [] })).rows[0];
    const campaign = (await q(
      `select code, owner_type, instructor_id, status from public.promotion_campaigns
        where id = $1`, [id])).rows[0];
    assert(campaign.code === 'ALL-MARKETS', `the code was stored as ${campaign.code}`);
    assert(campaign.owner_type === 'platform' && campaign.instructor_id === null,
      'a platform campaign named a teacher as its owner');
    assert(campaign.status === 'draft', `a new campaign is ${campaign.status}`);

    const benefit = (await q(
      `select benefit_type, percent_off from public.promotion_benefits where campaign_id = $1`,
      [id])).rows[0];
    assert(benefit.benefit_type === 'percent_off' && Number(benefit.percent_off) === 20,
      'the benefit was not recorded');

    const markets = (await q(
      `select market from public.promotion_campaign_markets where campaign_id = $1`,
      [id])).rows.length;
    assert(markets === 0, 'an "everywhere" campaign recorded markets anyway');
  });

  await test('a fixed amount may only name markets priced in its own currency', async () => {
    // A course created for this test, so a price row from another fixture cannot
    // decide the answer.
    const mine = await sellable(teacher, prices);
    const stored = (await q(
      `select p.market, p.currency_code from public.prices p
         join public.product_course_versions pcv on pcv.product_id = p.product_id
        where pcv.course_id = $1 order by p.market`, [mine.course])).rows;
    assert(
      stored.length === 2
        && stored.some((r) => r.market === 'KE' && r.currency_code === 'KES'),
      `the fixture prices are ${JSON.stringify(stored)}`);

    const ok = await create(admin, 'ugx-five', {
      benefit: 'fixed_amount_off', amount: 5000, currency: 'UGX', markets: ['UG'],
      courses: [mine.course],
    });
    assert(ok.rows[0].id, 'a fixed amount in the market currency was refused');

    await rejects(() => create(admin, 'ugx-in-kenya', {
      benefit: 'fixed_amount_off', amount: 5000, currency: 'UGX', markets: ['KE'],
      courses: [mine.course],
    }), /priced in KES in market KE/);
  });

  await test('a market the course is not priced in is refused', async () => {
    const mine = await sellable(teacher, prices);
    await rejects(() => create(admin, 'tanzania', {
      benefit: 'percent_off', percent: 10, markets: ['TZ'], courses: [mine.course],
    }), /no live price in market TZ/);
  });

  await test('a teacher can run one for their own course', async () => {
    const { id } = (await create(teacher, 'my-course-off', {
      percent: 25, markets: ['UG'], courses: [offer.course],
    })).rows[0];

    const campaign = (await q(
      `select owner_type, instructor_id from public.promotion_campaigns where id = $1`,
      [id])).rows[0];
    assert(campaign.owner_type === 'teacher' && campaign.instructor_id === teacher,
      'a teacher campaign did not record the teacher who owns it');

    const markets = (await q(
      `select market from public.promotion_campaign_markets where campaign_id = $1`,
      [id])).rows.map((r) => r.market);
    assert(markets.join(',') === 'UG', `the markets were ${markets.join(',')}`);
  });

  await test('a teacher cannot discount somebody else\'s course', async () => {
    await rejects(() => create(otherTeacher, 'not-mine', {
      percent: 10, courses: [offer.course],
    }), /is not yours to discount/);
  });

  await test('a teacher cannot run a platform-wide campaign', async () => {
    await rejects(() => create(teacher, 'everything', {
      percent: 10, courses: [],
    }), /has to name the courses it applies to/);
  });

  await test('a learner cannot create a promotion', async () => {
    await rejects(() => create(learner, 'free-stuff', {
      percent: 100, courses: [offer.course],
    }), /only the platform owner or a teacher/);
  });

  await test('a code is one code, whatever its case', async () => {
    await create(admin, 'Eid24', { percent: 10 });
    await rejects(() => create(admin, 'eid24', { percent: 10 }),
      /already used by another promotion/);
  });

  await test('a per-family limit is the campaign\'s to choose — two, three, or none', async () => {
    const { id: two } = (await create(admin, 'family-two', { perFamilyLimit: 2 })).rows[0];
    const { id: three } = (await create(admin, 'family-three', { perFamilyLimit: 3 })).rows[0];
    const { id: none } = (await create(admin, 'family-all', {})).rows[0];

    const limits = (await q(
      `select code, per_family_limit from public.promotion_campaigns
        where id = any($1::uuid[]) order by code`, [[two, three, none]])).rows;
    const byCode = Object.fromEntries(limits.map((r) => [r.code, r.per_family_limit]));
    assert(byCode['FAMILY-TWO'] === 2, `two was stored as ${byCode['FAMILY-TWO']}`);
    assert(byCode['FAMILY-THREE'] === 3, `three was stored as ${byCode['FAMILY-THREE']}`);
    assert(byCode['FAMILY-ALL'] === null, `unlimited was stored as ${byCode['FAMILY-ALL']}`);

    await rejects(() => create(admin, 'family-zero', { perFamilyLimit: 0 }),
      /at least one redemption/);
  });

  await test('the limits can be edited afterwards, and never below what happened', async () => {
    const { id } = (await create(teacher, 'editable-limits', {
      courses: [offer.course], perFamilyLimit: 2,
    })).rows[0];

    const changed = (await asActor(teacher,
      'select public.set_promotion_limits($1,$2,$3,$4) r', [id, 100, 5, 3])).rows[0].r;
    assert(changed.perFamilyLimit === 3, `the limit became ${changed.perFamilyLimit}`);
    assert(changed.totalLimit === 100 && changed.perUserLimit === 5,
      'the other limits were not set');

    // Redemptions exist, so a total limit below them is not a limit at all.
    await asActor(teacher,
      `select public.set_promotion_campaign_status($1,'active')`, [id]);
    for (let i = 0; i < 2; i += 1) {
      await q(`insert into public.promotion_redemptions
                 (campaign_id, redeemed_by, benefit_snapshot)
               values ($1,$2,'{}'::jsonb)`, [id, learner]);
    }

    await rejects(() => asActor(teacher,
      'select public.set_promotion_limits($1,$2,$3,$4)', [id, 1, 5, 3]),
      /already been redeemed 2 times/);
    await rejects(() => asActor(admin,
      'select public.set_promotion_limits($1,$2,$3,$4)', [id, 100, 5, 0]),
      /has to be at least one redemption/);
  });

  await test('only the campaign owner may edit the limits', async () => {
    const { id } = (await create(teacher, 'not-yours-to-edit', {
      courses: [offer.course], perFamilyLimit: 2,
    })).rows[0];

    await rejects(() => asActor(otherTeacher,
      'select public.set_promotion_limits($1,$2,$3,$4)', [id, 10, 2, 2]),
      /only the owner of this campaign/);

    const after = (await q(
      'select per_family_limit from public.promotion_campaigns where id = $1', [id])).rows[0];
    assert(after.per_family_limit === 2, 'a refused edit changed the limit anyway');
  });

  await test('only the campaign\'s owner can switch it on, and not by direct write', async () => {
    const { id } = (await create(teacher, 'switch-me', {
      percent: 15, courses: [offer.course],
    })).rows[0];

    const status = (await asActor(teacher,
      `select public.set_promotion_campaign_status($1,'active') s`, [id])).rows[0].s;
    assert(status === 'active', `the status became ${status}`);

    await rejects(() => asActor(otherTeacher,
      `select public.set_promotion_campaign_status($1,'paused')`, [id]),
      /only the owner of this campaign/);

    // The direct write policies were dropped, so a staff member cannot insert a
    // campaign that skips the checks above.
    await rejects(() => asActor(admin,
      `insert into public.promotion_campaigns (code, name, status, created_by)
       values ('bypass','Bypass','draft',$1)`, [admin]),
      /row-level security|permission denied/i);
  });
}
