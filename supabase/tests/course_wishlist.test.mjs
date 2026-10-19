// Saved courses.
//
// The rules worth pinning are the ones that make a private list stay private and
// that decide what happens when the feature is switched off: nobody else can see
// or remove a saved course, and turning the flag off must not trap the rows
// someone already saved. The cascade case is pinned because it is the one that
// would have made deleting an account impossible.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newCourse,
  } = ctx;

  const admin = await bootstrapAdmin('wishlist-admin@example.com');
  const teacher = await newInstructor('wishlist-teacher@example.com', admin);

  let seq = 0;
  async function account(name = 'Saver') {
    seq += 1;
    const userId = await newUser(`wishlist-${seq}@example.com`);
    await newProfile(userId, `${name} ${seq}`);
    return userId;
  }

  /** Runs one statement as a signed-in account and commits it. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await q(sql, params); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  /** Expect a refusal, for the reason claimed, without poisoning the session. */
  async function refused(who, sql, params, pattern) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [who === null ? '' : JSON.stringify({ sub: who, role: 'authenticated' })]);
    await q('set local role authenticated');
    await q('savepoint expected_refusal');
    let caught;
    try { await q(sql, params); } catch (e) { caught = e; }
    await q('rollback to savepoint expected_refusal');
    await q('rollback');
    assert(caught, `expected a refusal matching ${pattern}`);
    const text = String(caught.message ?? caught);
    assert(pattern.test(text),
      `refused, but not for the reason asserted: expected ${pattern}, got: ${text.slice(0, 200)}`);
  }

  const SQL_SAVE = `insert into public.course_wishlist (user_id, course_id, note)
                    values ($1, $2, $3) returning id`;
  const SQL_UPSERT = `insert into public.course_wishlist (user_id, course_id, note)
                      values ($1, $2, $3)
                      on conflict (user_id, course_id) do update
                        set note = excluded.note
                      returning id`;
  const rowsFor = async (userId) =>
    (await q('select id, course_id, note from public.course_wishlist where user_id=$1 order by created_at', [userId])).rows;
  const countAll = async () =>
    (await q('select count(*)::int n from public.course_wishlist')).rows[0].n;

  const course = await newCourse(teacher, { status: 'active' });

  // -------------------------------------------------------------------
  await test('saving is off by default and refuses to write', async () => {
    const who = await account();
    assert((await q("select value_text from public.platform_settings where key='learning.wishlist'")).rows[0].value_text === 'false');
    await refused(who, SQL_SAVE, [who, course, null], /not enabled/i);
    assert((await countAll()) === 0);
  });

  await q("update public.platform_settings set value_text='true' where key='learning.wishlist'");
  try {
    await test('a saved course belongs to the session, not to a claimed id', async () => {
      const who = await account();
      const other = await account('Claimed');
      const id = (await asActor(who, SQL_SAVE, [other, course, null])).rows[0].id;
      const row = (await q('select user_id from public.course_wishlist where id=$1', [id])).rows[0];
      assert(row.user_id === who, `owner was ${row.user_id}, expected the session ${who}`);
    });

    await test('one row per account per course, and saving again edits the note', async () => {
      const who = await account();
      await asActor(who, SQL_SAVE, [who, course, 'first']);
      await refused(who, SQL_SAVE, [who, course, 'second'], /duplicate key/i);

      await asActor(who, SQL_UPSERT, [who, course, 'for Amina, after Tajweed 1']);
      const rows = await rowsFor(who);
      assert(rows.length === 1, `expected one saved row, got ${rows.length}`);
      assert(rows[0].note === 'for Amina, after Tajweed 1');
    });

    await test('a blank note is stored as no note, and a long one is refused', async () => {
      const who = await account();
      const id = (await asActor(who, SQL_SAVE, [who, course, '   '])).rows[0].id;
      const row = (await q('select note from public.course_wishlist where id=$1', [id])).rows[0];
      assert(row.note === null, `blank note became ${JSON.stringify(row.note)}`);

      // Distinct courses: the note length is what is under test, and a second
      // save of the same course would fail on uniqueness instead.
      const longCourse = await newCourse(teacher, { status: 'active' });
      await refused(who, SQL_SAVE, [who, longCourse, 'x'.repeat(501)], /course_wishlist_note_check/i);

      const maxCourse = await newCourse(teacher, { status: 'active' });
      await asActor(who, SQL_SAVE, [who, maxCourse, 'x'.repeat(500)]);
    });

    await test('a saved row cannot be repointed at another course', async () => {
      const who = await account();
      const second = await newCourse(teacher, { status: 'active' });
      const id = (await asActor(who, SQL_SAVE, [who, course, null])).rows[0].id;

      await refused(who, 'update public.course_wishlist set course_id=$1 where id=$2',
        [second, id], /cannot be changed/i);
    });

    await test('an owner id supplied by the caller is corrected to the session', async () => {
      // Not an error, and deliberately so: the row ends up owned by the person
      // writing it, which is the only thing they were entitled to write. A
      // caller cannot plant a row on another account or give one away.
      const who = await account();
      const claimed = await account('Claimed');
      const id = (await asActor(who, SQL_SAVE, [claimed, course, null])).rows[0].id;
      const moved = await asActor(who,
        'update public.course_wishlist set user_id=$1 where id=$2 returning user_id',
        [claimed, id]);
      const owner = (await q('select user_id from public.course_wishlist where id=$1', [id])).rows[0];
      assert(owner.user_id === who, `the row moved to ${owner.user_id}`);
      assert((await rowsFor(claimed)).length === 0, 'a row was planted on another account');
      void moved;
    });

    await test('a course that no longer exists cannot be saved', async () => {
      const who = await account();
      const gone = await newCourse(teacher, { status: 'active' });
      await q('update public.courses set deleted_at=now() where id=$1', [gone]);
      await refused(who, SQL_SAVE, [who, gone, null], /course not found/i);
    });

    await test('a retired course cannot be saved, but one saved earlier stays', async () => {
      const who = await account();
      const retiring = await newCourse(teacher, { status: 'active' });
      await asActor(who, SQL_SAVE, [who, retiring, null]);

      await q("update public.courses set status='retired' where id=$1", [retiring]);

      // The row survives retirement and its note stays editable: the saved list
      // reports the course as unavailable rather than silently dropping
      // something the learner chose, and "still hoping this comes back" is a
      // legitimate note.
      await asActor(who, SQL_UPSERT, [who, retiring, 'still hoping this returns']);
      const kept = await rowsFor(who);
      assert(kept.length === 1);
      assert(kept[0].note === 'still hoping this returns');

      const fresh = await newCourse(teacher, { status: 'retired' });
      await refused(who, SQL_SAVE, [who, fresh, null], /no longer offered/i);
    });

    await test('a hundred saved courses is the ceiling', async () => {
      const who = await account();
      // Ninety-nine courses in one statement: the ceiling is about the row
      // count, not about how the courses were made.
      const bulk = await q(
        `insert into public.courses (slug, title, audience, created_by, status)
         select 'wishlist-cap-'||g, 'Cap '||g, 'both', $1, 'active'
           from generate_series(1,99) g returning id`, [teacher]);
      for (const r of bulk.rows) {
        await q('insert into public.course_wishlist (user_id, course_id) values ($1,$2)', [who, r.id]);
      }
      assert((await rowsFor(who)).length === 99);

      await asActor(who, SQL_SAVE, [who, course, null]);
      assert((await rowsFor(who)).length === 100);

      const oneMore = await newCourse(teacher, { status: 'active' });
      await refused(who, SQL_SAVE, [who, oneMore, null], /remove one first/i);
    });

    await test('saving without an owner id works, and saving again edits it', async () => {
      // This is the statement the web layer sends: `user_id` is absent, because
      // a caller has no business supplying it, and the trigger fills it from the
      // session. It has to survive the speculative insertion that
      // `on conflict do update` performs.
      const who = await account();
      const SQL_NO_OWNER = `insert into public.course_wishlist (course_id, note)
                            values ($1, $2)
                            on conflict (user_id, course_id) do update
                              set note = excluded.note
                            returning id`;
      const first = (await asActor(who, SQL_NO_OWNER, [course, 'first'])).rows[0].id;
      const second = (await asActor(who, SQL_NO_OWNER, [course, 'second'])).rows[0].id;
      assert(first === second, 'an upsert without an owner id created a second row');

      const row = (await q('select user_id, note from public.course_wishlist where id=$1', [first])).rows[0];
      assert(row.user_id === who, `owner was ${row.user_id}`);
      assert(row.note === 'second');
    });

    await test('nobody else can see or remove a saved course', async () => {
      const mine = await account('Mine');
      const theirs = await account('Theirs');
      await asActor(mine, SQL_SAVE, [mine, course, 'private']);

      const seen = await asActor(theirs, 'select id from public.course_wishlist');
      assert(seen.rows.length === 0, `another account saw ${seen.rows.length} saved rows`);

      const removed = await asActor(theirs,
        'delete from public.course_wishlist where user_id=$1 returning id', [mine]);
      assert(removed.rows.length === 0, 'another account removed a saved row');
      assert((await rowsFor(mine)).length === 1);

      // A caller with no session cannot plant a row on someone else's account.
      // The trigger cannot catch this one — the supplied owner id is not null,
      // and there is no actor to overwrite it with — so the insert policy is
      // what stops it. Pinned because it is the only thing standing between an
      // unauthenticated request and another person's saved list.
      await refused(null, SQL_SAVE, [mine, course, null], /row-level security/i);
      assert((await rowsFor(mine)).length === 1, 'an anonymous save landed');
    });

    await test('a saved course can be removed while the feature is on', async () => {
      const who = await account();
      const id = (await asActor(who, SQL_SAVE, [who, course, null])).rows[0].id;
      const removed = await asActor(who,
        'delete from public.course_wishlist where id=$1 returning id', [id]);
      assert(removed.rows.length === 1);
      assert((await rowsFor(who)).length === 0);
    });
  } finally {
    await q("update public.platform_settings set value_text='false' where key='learning.wishlist'");
  }

  // -------------------------------------------------------------------
  await test('turning the feature off does not trap saved rows', async () => {
    const who = await account();
    // Saved while on, in a committed transaction the flag change cannot undo.
    await q("update public.platform_settings set value_text='true' where key='learning.wishlist'");
    const id = await committed(async () =>
      (await asActor(who, SQL_SAVE, [who, course, null])).rows[0].id);
    await q("update public.platform_settings set value_text='false' where key='learning.wishlist'");

    await refused(who, SQL_SAVE, [who, await newCourse(teacher, { status: 'active' }), null], /not enabled/i);

    const removed = await asActor(who,
      'delete from public.course_wishlist where id=$1 returning id', [id]);
    assert(removed.rows.length === 1, 'a saved row could not be removed once the flag was off');
    assert((await rowsFor(who)).length === 0);
  });

  await test('deleting an account takes its saved courses with it', async () => {
    const who = await account();
    await q("update public.platform_settings set value_text='true' where key='learning.wishlist'");
    await asActor(who, SQL_SAVE, [who, course, null]);
    await q("update public.platform_settings set value_text='false' where key='learning.wishlist'");

    // The cascade arrives with no actor in the session. A guard that demanded an
    // owner here would make erasing an account impossible, which is the opposite
    // of what a privacy control is for.
    await q('delete from public.user_profiles where user_id=$1', [who]);
    assert((await rowsFor(who)).length === 0, 'saved rows outlived the account');
  });
}
