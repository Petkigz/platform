// What is in a course, and what it costs me.
//
// The catalogue showed a title, a description and four badges. A buyer had to
// open every card to find out whether it was a two-hour introduction or a
// thirty-lesson course, and whether it was free. `catalogue_cards()` answers
// both for the whole shelf in one call.
//
// What this suite is actually guarding:
//
//   * the price comes from `course_price_for_me()`, the same resolver the order
//     writer uses — a shelf that computes its own price can disagree with the
//     button on the next page, and the disagreement is always discovered by a
//     buyer;
//   * the lesson count needs the definer's privileges (an anonymous visitor may
//     see only preview lessons), so the function must not become an oracle for
//     drafts — it answers only about courses the public shelf would show;
//   * nothing is summed. Two cards in two currencies are two amounts.

export async function run(ctx) {
  const {
    q, test, assert, rejects, asAnon,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('cc-admin@example.com');
  const teacher = await newInstructor('cc-teacher@example.com', admin);
  const reviewer = await newReviewer('cc-reviewer@example.com', admin);

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'catalogue cards test']);

  /**
   * A course with structure, published through the real path.
   *
   * The structure has to exist while the version is still a draft: D5 locks a
   * published version's sections and lessons, which is exactly the rule that
   * makes a published course safe to sell.
   *
   * `lessons` is a count, and `seconds` are the durations given to them in
   * order (null meaning "this lesson does not declare one").
   */
  async function publishedCourse(over = {}) {
    const course = await newCourse(teacher, {
      status: over.status ?? 'active',
      title: over.title ?? 'Shelf Course',
      audience: over.audience ?? 'both',
    });
    const version = await newVersion(course, teacher);

    const lessonCount = over.lessons ?? 2;
    const sectionCount = over.sections ?? 1;
    const seconds = over.seconds ?? [];
    const perSection = Math.ceil(lessonCount / sectionCount);

    let made = 0;
    for (let s = 1; s <= sectionCount && made < lessonCount; s += 1) {
      const section = await newSection(version, { title: `Section ${s}`, position: s });
      for (let i = 1; i <= perSection && made < lessonCount; i += 1) {
        const lesson = await newLesson(section, { title: `Lesson ${made + 1}`, position: i });
        const d = seconds[made] ?? null;
        if (d !== null) {
          await q('update public.lessons set duration_seconds = $1 where id = $2', [d, lesson]);
        }
        made += 1;
      }
    }

    if (over.publish !== false) {
      await transition(version, 'submitted', teacher);
      await transition(version, 'approved', reviewer);
      await satisfyReview(version, reviewer, admin);
      await transition(version, 'published', admin);
    }

    if (over.price) {
      const productId = (await q(
        `insert into public.products (product_type, name, status, created_by)
         values ('course',$1,'active',$2) returning id`,
        [over.title ?? 'Shelf Course', teacher])).rows[0].id;
      await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
               values ($1,$2,$3)`, [productId, course, version]);
      await q(
        `insert into public.prices
           (product_id, amount_minor, currency_code, billing_interval, status, effective_from)
         values ($1,$2,$3,'one_time','active', now())`,
        [productId, over.price.amountMinor, over.price.currency]);
    }

    if (over.suspend) {
      // The two columns agree or the row is refused (`courses_suspension_agrees`),
      // so a suspension is written the way the product writes one.
      await q(`update public.courses
                  set suspended_at = now(), suspended_reason = 'catalogue cards test'
                where id = $1`, [course]);
    }

    return { course, version };
  }

  const cards = async (ids, country = null) => {
    const { rows } = await q('select public.catalogue_cards($1::uuid[], $2) v', [ids, country]);
    const value = rows[0].v;
    assert(Array.isArray(value), 'the reply is not a list');
    return value;
  };

  const cardFor = async (id, country = null) => {
    const list = await cards([id], country);
    return list.find((c) => c.courseId === id) ?? null;
  };

  // -------------------------------------------------------------------------
  console.log('\nWhat is in it');
  // -------------------------------------------------------------------------

  await test('sections and lessons are counted from the published version', async () => {
    const { course } = await publishedCourse({ lessons: 5, sections: 2, title: 'Counted' });
    const card = await cardFor(course);
    assert(card, 'the course was not answered at all');
    assert(card.sections === 2, `sections: ${card.sections}`);
    assert(card.lessons === 5, `lessons: ${card.lessons}`);
  });

  await test('a duration is reported only when a lesson declares one', async () => {
    // No lesson declares a length: the honest answer is "not known", not zero.
    const silent = await publishedCourse({ lessons: 2, title: 'No Lengths' });
    assert((await cardFor(silent.course)).minutes === null, 'an unknown duration was reported as a number');

    // Two lessons at ten minutes each, one silent: twenty minutes, and the
    // silent lesson does not make it a lie — it makes the figure a floor.
    const known = await publishedCourse({ lessons: 3, seconds: [600, 600], title: 'Known Lengths' });
    const card = await cardFor(known.course);
    assert(card.minutes === 20, `minutes: ${card.minutes}`);
    assert(card.lessons === 3, `lessons: ${card.lessons}`);
    // Two of three declared a length, so twenty minutes is a floor and the
    // reply says so rather than letting a screen claim it is the whole course.
    assert(card.timedLessons === 2, `timedLessons: ${card.timedLessons}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat it costs');
  // -------------------------------------------------------------------------

  await test('a course with no price is answered as having none', async () => {
    const { course } = await publishedCourse({ title: 'Free Course' });
    const card = await cardFor(course);
    // Not "free" as a decision — the absence of a live price, which the web
    // layer turns into "Free" the same way the course page does.
    assert(card.offering.hasLivePrice === false, 'a price appeared from nowhere');
  });

  await test('a priced course carries the amount in its own currency', async () => {
    const { course } = await publishedCourse({
      title: 'Sold In Uganda',
      price: { amountMinor: 30000, currency: 'UGX' },
    });
    const card = await cardFor(course);
    assert(card.offering.hasLivePrice === true, 'the price was not seen');
    assert(card.offering.resolved === true, `not resolved: ${JSON.stringify(card.offering)}`);
    assert(card.offering.amountMinor === '30000', `amount: ${card.offering.amountMinor}`);
    assert(card.offering.currencyCode === 'UGX', `currency: ${card.offering.currencyCode}`);
    assert(card.offering.billingInterval === 'one_time', 'a shelf price is not a one-off');
  });

  await test('two cards in two currencies stay two amounts', async () => {
    const ugx = await publishedCourse({
      title: 'Uganda Price',
      price: { amountMinor: 30000, currency: 'UGX' },
    });
    const gbp = await publishedCourse({
      title: 'Britain Price',
      price: { amountMinor: 2500, currency: 'GBP' },
    });

    const list = await cards([ugx.course, gbp.course]);
    assert(list.length === 2, `cards: ${list.length}`);

    const byId = Object.fromEntries(list.map((c) => [c.courseId, c]));
    assert(byId[ugx.course].offering.currencyCode === 'UGX', 'the first card changed currency');
    assert(byId[gbp.course].offering.currencyCode === 'GBP', 'the second card changed currency');

    // No total, no sum, no "from" — a figure that added these two would be the
    // third currency the platform refuses to invent.
    for (const card of list) {
      assert(!('total' in card), 'a card carries a total');
      assert(!('totalMinor' in card), 'a card carries a total');
      assert(!('total' in card.offering), 'an offering carries a total');
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat it will not answer');
  // -------------------------------------------------------------------------

  await test('a course with no published version is not answered at all', async () => {
    // This is the oracle guard. The lesson count is read with the definer's
    // privileges, so answering about a draft would let anybody who knows an id
    // measure somebody else's unpublished course.
    const draft = await publishedCourse({ title: 'Still A Draft', publish: false, lessons: 4 });
    const list = await cards([draft.course]);
    assert(list.length === 0, `a draft was answered: ${JSON.stringify(list)}`);
  });

  await test('a suspended course is not answered', async () => {
    const { course } = await publishedCourse({ title: 'Suspended', suspend: true });
    assert((await cards([course])).length === 0, 'a suspended course was listed');
  });

  await test('a retired course is not answered', async () => {
    const { course } = await publishedCourse({ title: 'Retired', status: 'retired' });
    assert((await cards([course])).length === 0, 'a retired course was listed');
  });

  // -------------------------------------------------------------------------
  console.log('\nThe shape of the call');
  // -------------------------------------------------------------------------

  await test('an empty shelf is an empty list, not an error', async () => {
    const list = await cards([]);
    assert(list.length === 0, 'an empty shelf answered with something');
  });

  await test('the same course twice is one card', async () => {
    const { course } = await publishedCourse({ title: 'Once Please', lessons: 1 });
    const list = await cards([course, course]);
    assert(list.length === 1, `cards: ${list.length}`);
  });

  await test('a shelf of more than a hundred is refused', async () => {
    const ids = Array.from({ length: 101 }, () => '00000000-0000-0000-0000-000000000000');
    await rejects(
      () => q('select public.catalogue_cards($1::uuid[])', [ids]),
      /at most 100 courses/);
  });

  await test('a visitor who is not signed in can read the shelf', async () => {
    // A catalogue price is public. Without a session there is no account, so
    // the reader sees the default market — which is what the course page shows
    // a signed-out visitor too.
    const { course } = await publishedCourse({ title: 'Public Course', lessons: 3 });
    const { rows } = await asAnon(() =>
      q('select public.catalogue_cards($1::uuid[], null) v', [[course]]));
    const list = rows[0].v;
    assert(Array.isArray(list) && list.length === 1, 'a signed-out visitor saw nothing');
    assert(list[0].lessons === 3, `an anonymous count: ${list[0].lessons}`);
  });
}
