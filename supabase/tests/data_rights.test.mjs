// The two data rights, checked against each other.
//
// `export_my_data()`, `erase_my_account()` and their screens were built a month
// apart, each with its own suite, and each suite asked the right question about
// its own half: is the document complete, and does closing an account delete
// what it says it deletes. Neither asked the question a person asks —
// **is the thing being deleted the thing I was shown?** — and the answer was no
// in both directions.
//
//   1. The receipt counted saved courses, invitations and guardian links.
//      The document contained none of the three, and `/account/export` has
//      listed "saved courses" under "What you wrote" since the page was
//      written. A page that promises a section is a specification.
//
//   2. Erasure's own header said "Kept untouched: nothing that names the
//      person." A sweep of every text column after an account closed found the
//      name still in the person's notifications, in the invitation email they
//      had sent, and in the staff replies on their own support case.
//
// Both are closed in `20261281004600_data_rights_loop.sql`. What this suite
// holds is the loop itself, walked as one person from their first saved course
// to the day they close the account, and it is written so that a future
// migration cannot quietly reopen either half: the receipt is compared to the
// document field by field, and the sweep is run over the whole schema rather
// than over the tables somebody remembered.
//
// The deliberate exception is stated and pinned rather than hidden: **other
// people's words about you stay as they were written.** A classmate's reply
// that mentions your name is their post, not yours, and the export already
// says so under `notIncluded`.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, grantRole, committed,
    newCourse, newVersion, newSection, newLesson, newReviewer, satisfyReview,
  } = ctx;

  const owner = await bootstrapAdmin('rights-owner@example.com');
  const teacher = await newInstructor('rights-teacher@example.com', owner);
  const reviewer = await newReviewer('rights-reviewer@example.com', owner);
  const governance = await newUser('rights-governance@example.com');
  await newProfile(governance, 'Hafsa Nakato');
  await committed(() => grantRole(governance, 'governance_admin', owner));

  const NAME = 'Zaynab Ssekandi';
  const ADDRESS = 'rights-zaynab@example.com';
  const CLASSMATE = 'Bilal Muwanga';

  /**
   * Act as a person and COMMIT.
   *
   * `asUser()` rolls back, which is right for one assertion and useless for a
   * loop: the saved course has to still exist when the account is closed two
   * acts later, and `set_config(..., is_local)` only means anything inside an
   * explicit transaction.
   */
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

  /** One scalar answer from a function. */
  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;

  const count = async (sql, params = []) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  /** The document, as the person downloads it. */
  const exportOf = async (actor) =>
    (await asActor(actor, 'select public.export_my_data() d')).rows[0].d;

  /** Turn a feature on for one block and put the register exactly as it was. */
  async function withFlag(key, fn) {
    const before = (await q(
      'select value_text from public.platform_settings where key = $1', [key])).rows[0].value_text;
    await q('update public.platform_settings set value_text = $1 where key = $2', ['true', key]);
    try {
      return await fn();
    } finally {
      await q('update public.platform_settings set value_text = $1 where key = $2',
        [before, key]);
    }
  }

  // -------------------------------------------------------------------------
  console.log('\nAct I — a person, and a week of their record');
  // -------------------------------------------------------------------------

  const person = await newUser(ADDRESS);
  await newProfile(person, NAME);

  const learner = (await q(
    `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
     values ($1, 'adult', '18+', $2) returning id`, [NAME, person])).rows[0].id;

  // A course the person can actually study: published, with a lesson, and an
  // enrolment. Notes and bookmarks are written while learning, and the guard
  // says so.
  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson = await newLesson(section);
  const transition = (status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [version, status, actor, 'data rights']);
  await transition('submitted', teacher);
  await satisfyReview(version, reviewer, owner);
  await transition('approved', reviewer);
  await transition('published', owner);

  const enrolmentId = (await q(
    `insert into public.course_enrolments
       (learner_profile_id, course_id, course_version_id, source, status)
     values ($1, $2, $3, 'free', 'active') returning id`, [learner, course, version])).rows[0].id;

  await test('they save a course, with a private note nobody else can read', async () => {
    // The page promises this in writing. It was the section the export did not
    // have, and the note is the most personal thing in the table.
    await withFlag('learning.wishlist', async () => {
      await asActor(person,
        `insert into public.course_wishlist (course_id, note) values ($1, $2)`,
        [course, 'for after Ramadan, when the children are back at madrasah']);
    });
    assert(await count('select 1 from public.course_wishlist where user_id = $1', [person]) === 1,
      'the course was not saved');
  });

  await test('they write a note and a bookmark while learning', async () => {
    await withFlag('learning.notes_bookmarks', async () => {
      await asActor(person,
        `insert into public.lesson_notes
           (learner_profile_id, course_enrolment_id, lesson_id, body)
         values ($1, $2, $3, 'Ask the teacher about the madd rule in verse 4')`,
        [learner, enrolmentId, lesson]);
      await asActor(person,
        `insert into public.lesson_bookmarks
           (learner_profile_id, course_enrolment_id, lesson_id)
         values ($1, $2, $3)`, [learner, enrolmentId, lesson]);
    });
  });

  await test('they review the course and ask a question in the discussion', async () => {
    await q(`insert into public.course_reviews
               (course_id, course_version_id, learner_profile_id, written_by, rating, body)
             values ($1,$2,$3,$4,5,'Clear, and the teacher answers questions')`,
      [course, version, learner, person]);

    await withFlag('learning.discussion', async () => {
      await asActor(person,
        `insert into public.discussion_posts (lesson_id, author_user_id, body, author_kind)
         values ($1,$2,'How is the madd counted here?','learner')`, [lesson, person]);
    });
  });

  await test('a classmate replies, and mentions them by name', async () => {
    // This is the exception the suite pins rather than hides: a reply is
    // somebody else's words, and erasure does not rewrite them.
    const classmate = await newUser('rights-classmate@example.com');
    await newProfile(classmate, CLASSMATE);
    await withFlag('learning.discussion', async () => {
      await q(`insert into public.discussion_posts
                 (lesson_id, author_user_id, body, author_kind)
               values ($1,$2,$3,'learner')`,
        [lesson, classmate, `${NAME} asked the same question last week, and the answer is two counts.`]);
    });
    assert(await count(
      `select 1 from public.discussion_posts where body like $1`, [`%${NAME}%`]) === 1,
      'the classmate\'s reply was not written');
  });

  let caseId;

  await test('they open a support case, and support answers them by name', async () => {
    await withFlag('platform.support', async () => {
      caseId = await call(person, 'open_support_case($1,$2,$3)',
        ['payment', 'Two charges on one order', 'Both say 12 August. One course.']);
      await asActor(owner, 'select public.reply_to_support_case($1,$2,$3)',
        [caseId, `I can see it, ${NAME}. Refund opened.`, false]);
      await asActor(owner, 'select public.reply_to_support_case($1,$2,$3)',
        [caseId, `Internal: ${NAME} is a guardian in the Zubairi family, check the ledger.`, true]);
    });
    assert(caseId, 'no support case');
  });

  await test('they invite a friend to see their progress', async () => {
    const invitation = await withFlag('family.adult_shares', () =>
      call(person, 'invite_learning_share($1,$2,$3)',
        ['friend-of-zaynab@example.com', 'progress', 7]));
    assert(invitation.invitationId, 'no invitation');
  });

  let child;

  await test('they become a verified guardian of a child', async () => {
    // The real path, not a row: a guardian relationship is what the erasure
    // receipt counts, and it is created by the consent decision.
    const family = await call(person, 'create_family($1)', ['The Ssekandis']);
    child = await call(person, 'add_child_to_family($1,$2,$3)', [family, 'Maryam Ssekandi', '8-10']);
    const submitted = await call(person, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [child, 'parent', 'video_call', 'vault/consent/zaynab.pdf',
       'I am Maryam\'s mother, and the school has my number.']);

    await asActor(governance, 'select public.decide_guardian_consent($1,$2,$3,$4)',
      [submitted.caseId, 'verified', 'Identity document matched the school record', 12]);

    assert(await count(
      `select 1 from public.guardian_relationships
        where guardian_user_id = $1 and learner_profile_id = $2
          and status = 'active' and verified_at is not null`,
      [person, child]) === 1, 'the guardian relationship was not verified');
  });

  await test('the platform sends them a notification with their name in it', async () => {
    await q(`insert into public.notifications (user_id, kind, title, body)
             values ($1, 'payout_paid', $2, 'Your account is ready.')`,
      [person, `Welcome, ${NAME}`]);
  });

  let order;

  await test('they buy a course, and the ledger records it', async () => {
    // Signing up creates a billing account and makes the person its first
    // member (`bam_one_per_user` allows exactly one), so the order is placed
    // against that one rather than a second account invented here.
    // Creating the account makes its creator a member (the
    // `billing_account_creator_member` trigger), so the membership line is a
    // no-op rather than a second row — `bam_one_per_user` is unique on
    // (account, person) and says so.
    const account = (await q(
      `insert into public.billing_accounts
         (display_name, billing_country, billing_currency, created_by)
       values ('The Ssekandis', 'UG', 'UGX', $1) returning id`, [person])).rows[0].id;
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, status, granted_by)
             values ($1,$2,'active',$2)
             on conflict (billing_account_id, user_id) do nothing`, [account, person]);

    const product = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course', 'A course somebody bought', 'active', $1) returning id`,
      [teacher])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [product, course, version]);
    const price = (await q(
      `insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1, 60000, 'UGX', 'one_time', 'active') returning id`, [product])).rows[0].id;

    order = (await q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1, 'UGX', 60000, 60000, 'pending_payment') returning id`, [account])).rows[0].id;
    await q(`insert into public.order_items
               (order_id, product_id, price_id, quantity, unit_price_minor,
                currency_code, discount_minor, line_total_minor)
             values ($1,$2,$3,1,60000,'UGX',0,60000)`, [order, product, price]);

    await q('select public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, owner, 'manual', 'RIGHTS-CAP-1', 'Bank statement, 12 August']);
    assert((await q('select status from public.orders where id = $1', [order])).rows[0].status
      === 'paid', 'the order did not settle');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — they download it, and it is all there');
  // -------------------------------------------------------------------------

  let doc;

  await test('the document carries the saved course, with its private note', async () => {
    doc = await exportOf(person);
    assert(Array.isArray(doc.savedCourses), 'there is no saved-courses section at all');
    assert(doc.savedCourses.length === 1, `${doc.savedCourses.length} saved courses`);
    assert(/after Ramadan/.test(doc.savedCourses[0].note),
      'the private note is not in the document');
    assert(doc.savedCourses[0].course, 'the saved course has no title');
  });

  await test('it carries who they invited, and not the link that was sent', async () => {
    assert(Array.isArray(doc.invitations), 'there is no invitations section at all');
    assert(doc.invitations.length === 1, `${doc.invitations.length} invitations`);
    assert(doc.invitations[0].address === 'friend-of-zaynab@example.com',
      `the address is ${doc.invitations[0].address}`);
    assert(doc.invitations[0].scope === 'progress');
    // The link that was emailed is a credential: it lets its holder see what
    // was shared. The document lists what was sent and to whom, never the key.
    assert(!Object.keys(doc.invitations[0]).some((key) => /token|url|link/i.test(key)),
      `an invitation carries ${Object.keys(doc.invitations[0]).join(', ')}`);
    // The mail they sent is in here, and its rendered body carried the link.
    // The path survives with the key blanked out; a live token does not.
    const serialised = JSON.stringify(doc);
    assert(!/\/share\/invite\/(?!\[redacted\])/.test(serialised),
      'a live invitation link is in the document');
    assert(/\/share\/invite\/\[redacted\]/.test(serialised),
      'the mail was dropped rather than redacted; the document should still say what was sent');
  });

  await test('it carries who they are responsible for, and on what terms', async () => {
    assert(doc.guardians && Array.isArray(doc.guardians.of),
      'there is no guardianship section at all');
    assert(doc.guardians.of.length === 1, `${doc.guardians.of.length} guardian links`);
    const link = doc.guardians.of[0];
    assert(link.learner === 'Maryam Ssekandi', `the child is ${link.learner}`);
    assert(link.status === 'active', `the link is ${link.status}`);
    assert(link.verifiedAt, 'the document does not say when it was verified');
    assert(link.canViewProgress === true, 'the permissions are not in the document');
  });

  await test('it carries the words they wrote, and the mail they caused and received', async () => {
    assert(doc.notes.length === 1, `${doc.notes.length} notes`);
    assert(/madd rule/.test(doc.notes[0].body));
    assert(doc.bookmarks.length === 1, `${doc.bookmarks.length} bookmarks`);
    assert(doc.reviews.length === 1 && /Clear, and the teacher/.test(doc.reviews[0].body));
    assert(doc.discussion.length === 1,
      `${doc.discussion.length} posts: a classmate's reply must not be in here`);
    assert(doc.messages.length >= 1, 'the invitation email they sent is not in the document');
    assert(doc.messages.some((m) => /invite|share/i.test(`${m.purpose} ${m.subject ?? ''}`)),
      'the mail they caused is not in the document');
  });

  await test('it carries their support case, their own words and support\'s answer', async () => {
    assert(doc.support.length === 1, `${doc.support.length} cases`);
    const bodies = doc.support[0].messages.map((m) => m.body).join(' ');
    assert(/Refund opened/.test(bodies), 'support\'s answer to them is missing');
    assert(!/Internal:/.test(bodies), 'an internal staff note was handed to the customer');
  });

  await test('the counts in the footer agree with the lists above them', async () => {
    const counts = doc.meta.counts;
    for (const [key, actual] of [
      ['savedCourses', doc.savedCourses.length],
      ['invitations', doc.invitations.length],
      ['guardians', doc.guardians.of.length],
      ['messages', doc.messages.length],
      ['notes', doc.notes.length],
      ['bookmarks', doc.bookmarks.length],
      ['reviews', doc.reviews.length],
    ]) {
      assert(Number(counts[key]) === actual,
        `meta.counts.${key} says ${counts[key]}, the list holds ${actual}`);
    }
    assert(doc.meta.note === 'Every list is complete.', doc.meta.note);
  });

  await test('and it says, in words, what it leaves out', async () => {
    const named = doc.notIncluded.map((row) => `${row.what}: ${row.why}`).join('\n');
    assert(/invitation link/i.test(named), 'the invitation link is not named as left out');
    assert(/sign-in address/i.test(named), 'the sign-in address is not named as left out');
    assert(/Other people's words/i.test(named) || /Other people’s words/i.test(named),
      'other people\'s words are not named as left out');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — they close the account');
  // -------------------------------------------------------------------------

  let receipt;

  await test('a wrong confirmation closes nothing', async () => {
    await rejects(() => asActor(person, 'select public.erase_my_account($1)', ['Zaynab']),
      /type your name exactly/i);
    assert((await q('select account_status from public.user_profiles where user_id = $1',
      [person])).rows[0].account_status === 'active', 'a mistyped name closed the account');
  });

  await test('the receipt counts exactly what the document showed them', async () => {
    // This is the loop. Every number in the receipt is a list that was in the
    // document they downloaded a minute earlier, so they can check the deletion
    // against the copy they hold — which is the only way a receipt means
    // anything.
    receipt = await call(person, 'erase_my_account($1)', [NAME]);

    const pairs = [
      ['savedCourses', doc.savedCourses.length],
      ['invitations', doc.invitations.length],
      ['guardianLinks', doc.guardians.of.length],
      ['messages', doc.messages.length],
      ['notifications', doc.notifications.length],
      ['notes', doc.notes.length],
      ['bookmarks', doc.bookmarks.length],
      ['reviews', doc.reviews.length],
      ['shares', doc.sharing.given.length + doc.sharing.received.length],
    ];
    for (const [key, expected] of pairs) {
      assert(receipt.removed[key] === expected,
        `the receipt says ${key}: ${receipt.removed[key]}, the document showed ${expected}`);
    }
  });

  await test('the account is closed, tombstoned, and cannot be reopened by them', async () => {
    const row = (await q(
      'select display_name, account_status, deleted_at from public.user_profiles where user_id = $1',
      [person])).rows[0];
    assert(row.account_status === 'closed', `status: ${row.account_status}`);
    assert(row.display_name === 'Deleted account', `name: ${row.display_name}`);
    assert(row.deleted_at, 'no deletion date');

    await rejects(() => asActor(person,
      `update public.user_profiles set account_status = 'active' where user_id = $1`, [person]),
      /administrator/i);
  });

  await test('a second press answers the same way and changes nothing', async () => {
    // The account is already closed, so the function answers before it ever
    // looks at the typed name — which is what makes a retried request safe
    // after a dropped connection.
    const again = await asActor(person, 'select public.erase_my_account($1) r', ['whatever']);
    const reply = again.rows[0].r;
    assert(reply.alreadyClosed === true, `the second press said ${JSON.stringify(reply)}`);
    assert(reply.learnersErased === 0, 'the second press erased something again');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — the sweep: the name is nowhere left');
  // -------------------------------------------------------------------------

  /** Every table and column that could hold a person's words. */
  async function textColumns() {
    return (await q(`
      select c.table_name, c.column_name
        from information_schema.columns c
        join information_schema.tables t
          on t.table_schema = c.table_schema and t.table_name = c.table_name
       where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
         and c.data_type in ('text', 'character varying', 'jsonb', 'uuid', 'character')
       order by 1, 2`)).rows;
  }

  /** Where a string still appears, as `table.column(n)` — read from the schema, not a list. */
  async function sweep(needle) {
    const hits = [];
    for (const column of await textColumns()) {
      const n = (await q(
        `select count(*)::int n from public."${column.table_name}"
          where "${column.column_name}"::text ilike $1`, [`%${needle}%`])).rows[0].n;
      if (n > 0) hits.push(`${column.table_name}.${column.column_name}(${n})`);
    }
    return hits;
  }

  await test('their name survives only in somebody else\'s words', async () => {
    const hits = await sweep(NAME);
    assert(hits.length === 1 && hits[0] === 'discussion_posts.body(1)',
      `the name is still in: ${hits.join(', ') || 'nothing'} — expected only the classmate's reply`);
  });

  await test('their address is nowhere at all', async () => {
    const hits = await sweep(ADDRESS);
    assert(hits.length === 0, `the address is still in: ${hits.join(', ')}`);
  });

  await test('what staff wrote about them is kept, and no longer names them', async () => {
    const notes = (await q(
      `select body from public.support_case_messages where case_id = $1`, [caseId])).rows;
    assert(notes.length >= 2, `${notes.length} messages on the case`);
    const text = notes.map((r) => r.body).join('\n');
    assert(/the account holder/.test(text), 'the staff note was not redacted');
    assert(!text.includes(NAME), 'a retained case message still names the person');
  });

  await test('the inbox and the mail that existed only for them are gone', async () => {
    assert(await count('select 1 from public.notifications where user_id = $1', [person]) === 0,
      'a closed account still has an inbox');
    assert(await count(
      'select 1 from public.outbound_messages where lower(to_address) = $1', [ADDRESS]) === 0,
      'mail addressed to them survived the erasure');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct V — the half that must not be deleted');
  // -------------------------------------------------------------------------

  await test('the order, the money and the audit trail are still there', async () => {
    const row = (await q(
      'select status, total_minor from public.orders where id = $1', [order])).rows[0];
    assert(row.status === 'paid', `the order is ${row.status}`);

    assert(await count(
      `select 1 from public.financial_transactions
        where order_id = $1 and transaction_type = 'capture'`, [order]) === 1,
      'the capture is gone; the ledger has a hole in it');

    assert(await count(
      `select 1 from public.governance_audit_events
        where action = 'account.closed_by_owner' and target_id = $1`, [person]) === 1,
      'the closing was not recorded');
  });

  await test('their learning is still a record, attached to a tombstone', async () => {
    const row = (await q(
      `select lp.display_name, lp.status, ce.status as enrolment
         from public.learner_profiles lp
         join public.course_enrolments ce on ce.learner_profile_id = lp.id
        where lp.id = $1`, [learner])).rows[0];
    assert(row.display_name === 'Deleted learner', `the learner is called ${row.display_name}`);
    assert(row.status === 'archived');
    assert(row.enrolment, 'the enrolment vanished');
  });

  await test('and the child went with the last adult, as a tombstone, not a deletion', async () => {
    const row = (await q(
      'select display_name, status, deleted_at from public.learner_profiles where id = $1',
      [child])).rows[0];
    assert(row.display_name === 'Deleted learner', `the child is called ${row.display_name}`);
    assert(row.status === 'archived' && row.deleted_at, 'the child was not archived');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct VI — the helper, and the claim the documents make');
  // -------------------------------------------------------------------------

  await test('redaction treats a name as a literal, in any case, and never guesses', async () => {
    const r = await q(`
      select
        public.redact_name('Fatima Zubairi rang about ZUBAIRI''s order', 'Fatima Zubairi') a,
        public.redact_name('nobody here', 'Fatima Zubairi') b,
        public.redact_name(null, 'Fatima Zubairi') c,
        public.redact_name('A. (B) C.', 'A. (B) C.') d,
        public.redact_name('Zaynab Ssekandi', 'Zaynab Ssekandi') e`).then((x) => x.rows[0]);
    assert(r.a === 'the account holder rang about ZUBAIRI\'s order',
      `case-insensitive redaction produced: ${r.a}`);
    assert(r.b === 'nobody here', 'a sentence without the name was changed');
    assert(r.c === null, 'null was not passed through');
    assert(r.d === 'the account holder', 'a name with regex punctuation was not treated as a literal');
    assert(r.e === 'the account holder');
  });

  await test('a signed-in caller cannot redact or read the helper at all', async () => {
    await rejects(() => asActor(person,
      'select public.redact_name($1,$2)', ['a name', 'a name']),
      /permission denied|does not exist/i);
  });

  await test('the export is not behind a switch, and a closed account gets a tombstone', async () => {
    // A right behind a switch that ships off is not a right: the flag exists
    // for the CSV and PDF renderings, and the JSON is not gated by it.
    const flag = (await q(
      `select value_text from public.platform_settings where key = 'platform.data_export'`)).rows[0];
    assert(flag.value_text === 'false', 'the export flag ships off');

    // After closing, the document still answers — with the tombstone and
    // nothing of the person. An empty refusal would hide whether the account
    // still exists, which is not something a closed account needs to know.
    const after = await exportOf(person);
    assert(after.account.displayName === 'Deleted account',
      `the document still calls them ${after.account.displayName}`);
    assert(after.savedCourses.length === 0 && after.invitations.length === 0,
      'the deleted lists came back');
    assert(after.account.accountStatus === 'closed');
  });
}
