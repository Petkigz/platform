// The shelf says how many there are, and you can reach the rest.
//
// Three defects lived between the browse path and the search path, and this
// suite holds the rules that close them:
//
//   * a **suspended** course is off the shelf, whichever way you arrive — the
//     browse path never filtered it, so a course taken down for a safeguarding
//     reason stayed browsable while being hidden from search;
//   * the **total** is true, so a page that shows twenty-four of a hundred and
//     thirty-seven can say so instead of ending quietly;
//   * a filter is applied **before** the page is chosen, so filtering by a
//     subject whose courses sort late cannot return nothing.

export async function run(ctx) {
  const {
    q, test, assert,
    bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('cp-admin@example.com');
  const teacher = await newInstructor('cp-teacher@example.com', admin);
  const reviewer = await newReviewer('cp-reviewer@example.com', admin);

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'catalogue page test']);

  /** A published course. Structure has to exist before publication (D5). */
  async function published(over = {}) {
    const course = await newCourse(teacher, {
      status: over.status ?? 'active',
      title: over.title ?? 'Course',
      audience: over.audience ?? 'both',
    });
    if (over.ageBands !== undefined) {
      await q('update public.courses set age_bands = $1 where id = $2',
        [over.ageBands, course]);
    }
    if (over.description !== undefined) {
      await q('update public.courses set description = $1 where id = $2',
        [over.description, course]);
    }

    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    if (over.subject) {
      const subjectId = (await q(
        'select id from public.subject_areas where code = $1', [over.subject])).rows[0]?.id;
      if (!subjectId) throw new Error(`no subject ${over.subject}`);
      await q(`insert into public.course_version_subjects (course_version_id, subject_area_id)
               values ($1,$2)`, [version, subjectId]);
    }

    if (over.publish !== false) {
      await transition(version, 'submitted', teacher);
      await transition(version, 'approved', reviewer);
      await satisfyReview(version, reviewer, admin);
      await transition(version, 'published', admin);
    }

    if (over.suspend) {
      await q(`update public.courses
                 set suspended_at = now(), suspended_reason = 'catalogue page test'
               where id = $1`, [course]);
    }

    return { course, version };
  }

  const page = async (args = {}) => {
    const {
      query = null, subject = null, audience = null, band = null,
      limit = 24, offset = 0,
    } = args;
    const { rows } = await q(
      'select public.catalogue_page($1,$2,$3,$4,$5,$6) v',
      [query, subject, audience, band, limit, offset]);
    const value = rows[0].v;
    assert(value && typeof value === 'object', 'the reply is not an envelope');
    return value;
  };

  const ids = (envelope) => envelope.ordered.map((o) => o.courseId);

  // -------------------------------------------------------------------------
  console.log('\nWho is on the shelf');
  // -------------------------------------------------------------------------

  await test('a published course is on the shelf', async () => {
    const { course } = await published({ title: 'Aaa On The Shelf' });
    const found = await page({ limit: 100 });
    assert(ids(found).includes(course), 'a published course was missing');
  });

  await test('a suspended course is off the shelf, and search agrees', async () => {
    // The defect this closes: browsing ignored `suspended_at`, so a course
    // taken down for a safeguarding reason stayed browsable.
    const { course } = await published({ title: 'Bbb Suspended', suspend: true });

    const browsed = await page({ limit: 100 });
    assert(!ids(browsed).includes(course), 'a suspended course was browsable');

    const { rows } = await q('select course_id from public.search_catalogue(null,null,null,100)');
    assert(!rows.some((r) => r.course_id === course), 'search and browse disagree');
  });

  await test('a course with no published version is not on the shelf', async () => {
    const { course } = await published({ title: 'Ccc Draft', publish: false });
    const found = await page({ limit: 100 });
    assert(!ids(found).includes(course), 'a draft was on the shelf');
  });

  await test('a retired course is not on the shelf', async () => {
    const { course } = await published({ title: 'Ddd Retired', status: 'retired' });
    const found = await page({ limit: 100 });
    assert(!ids(found).includes(course), 'a retired course was on the shelf');
  });

  // -------------------------------------------------------------------------
  console.log('\nHow many there are');
  // -------------------------------------------------------------------------

  // Enough of a shelf that a page can be shorter than the total: before this
  // section only one course has survived being draft, retired or suspended.
  await published({ title: 'Lll Filler One' });
  await published({ title: 'Mmm Filler Two' });
  await published({ title: 'Nnn Filler Three' });

  await test('the total counts the whole shelf, not the page', async () => {
    const envelope = await page({ limit: 2 });
    assert(envelope.limit === 2, `limit: ${envelope.limit}`);
    assert(envelope.shown === 2, `shown: ${envelope.shown}`);
    assert(envelope.total > envelope.shown, `total ${envelope.total} is not more than the page`);
  });

  await test('shown is never more than the limit, and the last page may be short', async () => {
    const total = (await page({ limit: 1 })).total;
    const last = await page({ limit: 100, offset: total });
    assert(last.shown === 0, `an offset at the end returned ${last.shown}`);
    assert(last.total === total, 'the total changed with the offset');
  });

  await test('pages of one course never repeat or miss one', async () => {
    const total = (await page({ limit: 1 })).total;
    const seen = [];
    for (let offset = 0; offset < total; offset += 2) {
      seen.push(...ids(await page({ limit: 2, offset })));
    }
    assert(seen.length === total, `walked ${seen.length} of ${total}`);
    assert(new Set(seen).size === total, 'a course appeared on two pages');
  });

  await test('the offset is clamped at zero rather than wrapping', async () => {
    const first = await page({ limit: 3, offset: 0 });
    const negative = await page({ limit: 3, offset: -50 });
    assert(JSON.stringify(ids(negative)) === JSON.stringify(ids(first)),
      'a negative offset did not read as the first page');
    assert(negative.offset === 0, `offset came back as ${negative.offset}`);
  });

  await test('a limit outside the range is clamped, not refused', async () => {
    assert((await page({ limit: 0 })).limit === 1, 'zero did not clamp to one');
    assert((await page({ limit: 5000 })).limit === 100, 'a huge limit was honoured');
  });

  // -------------------------------------------------------------------------
  console.log('\nFiltering before the page, not after');
  // -------------------------------------------------------------------------

  await test('a subject is filtered in SQL, so the count matches the list', async () => {
    // The defect: the subject filter ran in TypeScript on the sixty rows that
    // had already been chosen, so a subject sorting after the cut showed
    // nothing. Here the filter is part of the shelf question.
    const subject = (await q(
      "select code from public.subject_areas order by code limit 1")).rows[0].code;
    const { course } = await published({ title: 'Eee Subjected', subject });

    const filtered = await page({ subject, limit: 100 });
    assert(ids(filtered).includes(course), 'a matching course was not found by its subject');
    assert(filtered.total <= (await page({ limit: 100 })).total, 'the filtered total is larger');
    assert(filtered.total === filtered.shown + Math.max(0, filtered.total - filtered.shown));
  });

  await test('an audience filter keeps "both" and excludes the other door', async () => {
    const child = await published({ title: 'Fff For Children', audience: 'child' });
    const adult = await published({ title: 'Ggg For Adults', audience: 'adult' });
    const both = await published({ title: 'Hhh For Everyone', audience: 'both' });

    const childShelf = await page({ audience: 'child', limit: 100 });
    assert(ids(childShelf).includes(child.course), 'a children\u2019s course was missing');
    assert(ids(childShelf).includes(both.course), '"both" was excluded from the children\u2019s shelf');
    assert(!ids(childShelf).includes(adult.course), 'an adults\u2019 course was on the children\u2019s shelf');
  });

  await test('a band keeps courses that state it, and courses that state none', async () => {
    const stated = await published({ title: 'Iii Stated Band', ageBands: ['8-10'] });
    const other = await published({ title: 'Jjj Other Band', ageBands: ['14-17'] });
    const open = await published({ title: 'Kkk No Band', ageBands: [] });

    const shelf = await page({ band: '8-10', limit: 100 });
    assert(ids(shelf).includes(stated.course), 'a course stating the band was excluded');
    assert(ids(shelf).includes(open.course), 'a course stating no band was excluded');
    assert(!ids(shelf).includes(other.course), 'a course stating another band was included');
    // The whole run shares one database, so an absolute total here would count
    // other suites' courses. The invariant is about the filter itself: every
    // course on the page either states this band or states none at all.
    const bands = (await q(
      'select id, age_bands from public.courses where id = any($1::uuid[])',
      [ids(shelf)])).rows;
    const byId = new Map(bands.map((r) => [r.id, r.age_bands]));
    for (const id of ids(shelf)) {
      const stated = byId.get(id) ?? [];
      assert(stated.length === 0 || stated.includes('8-10'),
        `a course stating ${JSON.stringify(stated)} was on the 8-10 shelf`);
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nOrder and search');
  // -------------------------------------------------------------------------

  await test('with no query the shelf is alphabetical', async () => {
    const shelf = await page({ limit: 100 });
    // `where id = any(...)` has no order of its own, so the envelope's order is
    // re-applied here — reading titles straight out of the table would test the
    // heap, not the shelf.
    const rows = (await q(
      `select id, title from public.courses where id = any($1::uuid[])`,
      [ids(shelf)])).rows;
    const byId = new Map(rows.map((r) => [r.id, r.title]));
    const titles = ids(shelf).map((id) => byId.get(id));

    const sorted = [...titles].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    assert(JSON.stringify(titles) === JSON.stringify(sorted),
      `not alphabetical: ${titles.slice(0, 5).join(', ')}`);
    assert(shelf.ordered.every((o) => o.score === 0), 'browsing carried a score');
  });

  await test('a query ranks a title hit above a description hit', async () => {
    await published({ title: 'Zzz Tafsir Primer' });
    await published({ title: 'Yyy Unrelated', description: 'a course that mentions tafsir once' });

    const found = await page({ query: 'tafsir', limit: 100 });
    const first = found.ordered[0];
    assert(first, 'nothing matched');
    const title = (await q('select title from public.courses where id = $1', [first.courseId]))
      .rows[0].title;
    assert(title.includes('Tafsir'), `the top hit was "${title}"`);
    assert(first.score > 0, 'a matched course scored zero');
  });

  await test('every word must match, as it always did', async () => {
    await published({ title: 'Www Fiqh Of Prayer' });
    assert((await page({ query: 'fiqh prayer', limit: 100 })).total >= 1, 'both words did not match');
    assert((await page({ query: 'fiqh zanzibar', limit: 100 })).total === 0,
      'a word nothing contains still matched');
  });

  await test('search and browse agree on the total when there is no query', async () => {
    const browsed = await page({ limit: 100 });
    const { rows } = await q('select count(*)::int n from public.search_catalogue(null,null,null,100)');
    assert(rows[0].n === Math.min(browsed.total, 100),
      `search found ${rows[0].n}, browse says ${browsed.total}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nThe envelope');
  // -------------------------------------------------------------------------

  await test('an empty shelf is a valid envelope, not a null', async () => {
    const empty = await page({ query: 'nothing-at-all-matches-this', limit: 10 });
    assert(empty.total === 0, `total: ${empty.total}`);
    assert(empty.shown === 0, `shown: ${empty.shown}`);
    assert(Array.isArray(empty.ordered) && empty.ordered.length === 0, 'ordered is not an empty array');
  });

  await test('the envelope says its own limit and offset back', async () => {
    const e = await page({ limit: 3, offset: 1 });
    assert(e.limit === 3 && e.offset === 1, `limit ${e.limit}, offset ${e.offset}`);
    assert(e.shown === e.ordered.length, 'shown disagrees with the array it describes');
  });

  await test('nothing but ids and scores leaves the database', async () => {
    const e = await page({ limit: 5 });
    for (const entry of e.ordered) {
      const keys = Object.keys(entry).sort();
      assert(JSON.stringify(keys) === JSON.stringify(['courseId', 'score']),
        `an entry carries ${keys.join(', ')}`);
    }
  });
}
