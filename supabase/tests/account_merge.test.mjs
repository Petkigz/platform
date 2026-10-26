// Two accounts, one person.
//
// A merge is the most dangerous thing a person can do to their own account: it
// closes one, moves everything it held into another, and cannot be undone. This
// suite is about the four things that make it safe — both sides agreeing, the
// refusals that stop it guessing, the moves that must happen, and the moves that
// must not.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, newInstructor, grantRole } = ctx;

  const admin = await bootstrapAdmin('merge-admin@example.com');

  const flag = (on) =>
    q(`update public.platform_settings set value_text = $1
        where key = 'platform.account_merge'`, [on ? 'true' : 'false']);

  /** Call a function as a signed-in person, committing. */
  async function call(actor, sql, params = []) {
    await q('begin');
    try {
      await q(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: actor, role: 'authenticated' })]);
      await q('set local role authenticated');
      const out = await q(sql, params);
      await q('commit');
      return out.rows[0]?.r ?? null;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  /** An account with a profile, and nothing else. */
  async function account(email, name, country = 'UG') {
    const id = await newUser(email);
    await newProfile(id, name);
    await q(`update public.user_profiles set country_code = $2 where user_id = $1`, [id, country]);
    return id;
  }

  /** An adult learner of their own — the shape claim_own_learner_profile() makes. */
  async function ownLearner(userId, name) {
    return (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id, status)
       values ($1, 'adult', '18+', $2, 'active') returning id`, [name, userId])).rows[0].id;
  }

  const learnerOf = async (userId) =>
    (await q(`select id, status, display_name, linked_user_id
                from public.learner_profiles where linked_user_id = $1`, [userId])).rows[0] ?? null;

  const profile = async (userId) =>
    (await q(`select display_name, account_status, deleted_at from public.user_profiles
               where user_id = $1`, [userId])).rows[0];

  const request = (actor, email) =>
    call(actor, 'select public.request_account_merge($1) as r', [email]);
  const mine = (actor) => call(actor, 'select public.my_merge_requests() as r');
  const decide = (actor, id, accept, confirm) =>
    call(actor, 'select public.decide_account_merge($1,$2,$3) as r', [id, accept, confirm]);
  const preview = (duplicate, target) =>
    call(duplicate, 'select public.merge_blocks($1,$2) as r', [duplicate, target]);

  const audit = async (action) =>
    (await q(`select count(*)::int as n from public.governance_audit_events where action = $1`,
      [action])).rows[0].n;

  // -------------------------------------------------------------------------
  // Asking
  // -------------------------------------------------------------------------
  await test('the feature ships off, and a request is refused by name', async () => {
    await flag(false);

    const a = await account('merge-off-a@example.com', 'Off A');
    const b = await account('merge-off-b@example.com', 'Off B');
    eq((await mine(a)).enabled, false, 'the flag reported to the screen');
    await rejects(() => request(a, 'merge-off-b@example.com'), /not enabled/);
    assert(b, 'fixture');
  });

  await test('a request names the account it would go into, or is refused', async () => {
    await flag(true);
    const a = await account('merge-target-a@example.com', 'Ask A');
    await account('merge-target-b@example.com', 'Ask B');

    // The suites share one database, so "an address that does not exist" has to
    // be one that really does not exist rather than a plausible-looking one.
    await rejects(() => request(a, `missing-${crypto.randomUUID()}@example.com`),
      /no account with that email/);
    await rejects(() => request(a, 'merge-target-a@example.com'), /that is this account/);
    await rejects(() => request(a, '   '), /type the email address/);
  });

  await test('asking twice answers with the request already waiting', async () => {
    await flag(true);
    const a = await account('merge-twice-a@example.com', 'Twice A');
    const b = await account('merge-twice-b@example.com', 'Twice B');

    const first = await request(a, 'merge-twice-b@example.com');
    eq(first.requested, true, 'the first ask');
    const second = await request(a, 'merge-twice-b@example.com');
    eq(second.requested, false, 'the second ask');
    eq(second.alreadyPending, true, 'the second ask, recognised');
    eq(second.requestId, first.requestId, 'the same request');

    const rows = await q(`select count(*)::int as n from public.account_merge_requests
                           where duplicate_user_id = $1`, [a]);
    eq(rows.rows[0].n, 1, 'requests in the table');
    assert(b, 'fixture');
  });

  await test('the account being absorbed sees it is waiting; the other sees what it would move', async () => {
    await flag(true);
    const a = await account('merge-view-a@example.com', 'View A');
    const b = await account('merge-view-b@example.com', 'View B');

    const req = await request(a, 'merge-view-b@example.com');

    const outgoing = await mine(a);
    eq(outgoing.outgoing.length, 1, 'requests this account made');
    eq(outgoing.outgoing[0].status, 'pending', 'its status');
    eq(outgoing.incoming.length, 0, 'requests it must decide');

    const incoming = await mine(b);
    eq(incoming.incoming.length, 1, 'requests waiting on this account');
    eq(incoming.incoming[0].id, req.requestId, 'which request');
    eq(incoming.incoming[0].otherName, 'View A', 'who is asking');
    assert(incoming.incoming[0].preview, 'the preview is missing');
  });

  // -------------------------------------------------------------------------
  // Deciding
  // -------------------------------------------------------------------------
  await test('only the account that would survive can decide', async () => {
    await flag(true);
    const a = await account('merge-who-a@example.com', 'Who A');
    const b = await account('merge-who-b@example.com', 'Who B');
    const req = await request(a, 'merge-who-b@example.com');

    await rejects(() => decide(a, req.requestId, true, 'Who A'), /only the account that would survive/);
    await rejects(() => decide(admin, req.requestId, true, 'Merge Admin'), /only the account that would survive/);
    assert(b, 'fixture');
  });

  await test('declining leaves both accounts exactly as they were', async () => {
    await flag(true);
    const a = await account('merge-decline-a@example.com', 'Decline A');
    const b = await account('merge-decline-b@example.com', 'Decline B');
    const req = await request(a, 'merge-decline-b@example.com');

    const answer = await decide(b, req.requestId, false, 'Decline B');
    eq(answer.merged, false, 'the answer');
    eq(answer.status, 'declined', 'the status');

    eq((await profile(a)).account_status, 'active', 'the asking account');
    eq((await profile(b)).account_status, 'active', 'the deciding account');
    eq(await audit('account.merge_declined'), 1, 'declines recorded');
  });

  await test('a merge cannot run on the wrong confirmation', async () => {
    await flag(true);
    const a = await account('merge-confirm-a@example.com', 'Confirm A');
    const b = await account('merge-confirm-b@example.com', 'Confirm B');
    const req = await request(a, 'merge-confirm-b@example.com');

    await rejects(() => decide(b, req.requestId, true, 'Confirm A'), /type your name exactly/);
    eq((await profile(a)).account_status, 'active', 'nothing moved');
  });

  // -------------------------------------------------------------------------
  // A merge that runs
  // -------------------------------------------------------------------------
  await test('an accepted merge closes the absorbed account and says what moved', async () => {
    await flag(true);
    const a = await account('merge-yes-a@example.com', 'Yes A');
    const b = await account('merge-yes-b@example.com', 'Yes B');
    const req = await request(a, 'merge-yes-b@example.com');

    const answer = await decide(b, req.requestId, true, 'Yes B');
    eq(answer.merged, true, 'the answer');
    assert(answer.moved, 'the merge reported no summary');

    const closed = await profile(a);
    eq(closed.account_status, 'closed', 'the absorbed account');
    eq(closed.display_name, 'Merged account', 'its name');
    assert(closed.deleted_at, 'its deletion date');

    eq((await profile(b)).account_status, 'active', 'the surviving account');
    eq(await audit('account.merged'), 1, 'the audit row');
  });

  await test('the surviving account inherits the other one’s roles', async () => {
    await flag(true);
    const a = await account('merge-role-a@example.com', 'Role A');
    const b = await account('merge-role-b@example.com', 'Role B');
    await grantRole(a, 'instructor', admin);

    const req = await request(a, 'merge-role-b@example.com');
    await decide(b, req.requestId, true, 'Role B');

    const roles = (await q(`select r.code from public.user_role_assignments ura
                              join public.roles r on r.id = ura.role_id
                             where ura.user_id = $1 and ura.revoked_at is null`, [b])).rows
      .map((row) => row.code);
    assert(roles.includes('instructor'), `the surviving account holds ${roles.join(', ') || 'nothing'}`);

    const old = await q(`select count(*)::int as n from public.user_role_assignments
                          where user_id = $1 and revoked_at is null`, [a]);
    eq(old.rows[0].n, 0, 'roles still live on the closed account');
  });

  await test('a learning record with a learner of its own is carried across whole', async () => {
    await flag(true);
    const a = await account('merge-learn-a@example.com', 'Learn A');
    const b = await account('merge-learn-b@example.com', 'Learn B');
    const learnerA = await ownLearner(a, 'Learn A');

    // A published course, enrolled by the account being absorbed.
    const teacher = await newInstructor('merge-teacher@example.com', admin);
    const course = await ctx.newCourse(teacher, { title: 'Merge course', status: 'active' });
    const version = await ctx.newVersion(course, teacher);
    const enrolment = (await q(
      `insert into public.course_enrolments (learner_profile_id, course_id, course_version_id, source)
       values ($1,$2,$3,'free') returning id`, [learnerA, course, version])).rows[0].id;

    const req = await request(a, 'merge-learn-b@example.com');
    await decide(b, req.requestId, true, 'Learn B');

    // The target had no learner, so the record simply becomes theirs.
    const moved = await learnerOf(b);
    eq(moved.id, learnerA, 'the learner the surviving account now holds');
    eq(moved.status, 'active', 'its status');

    const enrolled = await q(`select count(*)::int as n from public.course_enrolments
                               where learner_profile_id = $1 and id = $2`, [learnerA, enrolment]);
    eq(enrolled.rows[0].n, 1, 'the enrolment after the merge');
  });

  await test('two learner records become one, and the surplus is archived not deleted', async () => {
    await flag(true);
    const a = await account('merge-two-a@example.com', 'Two A');
    const b = await account('merge-two-b@example.com', 'Two B');
    const learnerA = await ownLearner(a, 'Two A');
    const learnerB = await ownLearner(b, 'Two B');

    const teacher = await newInstructor('merge-teacher2@example.com', admin);
    const course = await ctx.newCourse(teacher, { title: 'Two record course', status: 'active' });
    const version = await ctx.newVersion(course, teacher);
    await q(`insert into public.course_enrolments (learner_profile_id, course_id, course_version_id, source)
             values ($1,$2,$3,'free')`, [learnerA, course, version]);

    const req = await request(a, 'merge-two-b@example.com');
    const answer = await decide(b, req.requestId, true, 'Two B');
    eq(answer.moved.enrolments, 1, 'enrolments moved');

    const enrolments = await q(`select learner_profile_id from public.course_enrolments
                                 where course_id = $1`, [course]);
    eq(enrolments.rows.length, 1, 'enrolments left');
    eq(enrolments.rows[0].learner_profile_id, learnerB, 'the surviving learner');

    const archived = (await q('select status, display_name from public.learner_profiles where id = $1',
      [learnerA])).rows[0];
    eq(archived.status, 'archived', 'the absorbed learner record');
    assert(/merged/.test(archived.display_name), 'the archived record is not marked');
  });

  await test('what the person made goes with them, but what they did stays with the record', async () => {
    await flag(true);
    const teacher = await newInstructor('merge-author@example.com', admin);
    const course = await ctx.newCourse(teacher, { title: 'Authored course', status: 'active' });
    const b = await account('merge-author-b@example.com', 'Author B');

    // An order the absorbed account placed: an action, which must stay theirs.
    const acct = (await q(
      `insert into public.billing_accounts (display_name, billing_country, billing_currency, status, created_by)
       values ('Household','UG','UGX','active',$1) returning id`, [teacher])).rows[0].id;
    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, discount_minor,
                                  total_minor, status, placed_at, placed_by)
       values ($1,'UGX',1000,0,1000,'pending_payment',now(),$2) returning id`, [acct, teacher])).rows[0].id;

    const req = await request(teacher, 'merge-author-b@example.com');
    await decide(b, req.requestId, true, 'Author B');

    eq((await q('select created_by from public.courses where id = $1', [course])).rows[0].created_by,
      b, 'the course author after the merge');
    eq((await q('select placed_by from public.orders where id = $1', [order])).rows[0].placed_by,
      teacher, 'who placed the order must not be rewritten');
  });

  await test('a message follows the person, and the phone number does too', async () => {
    await flag(true);
    const a = await account('merge-detail-a@example.com', 'Detail A');
    const b = await account('merge-detail-b@example.com', 'Detail B');
    await q(`insert into public.notifications (user_id, kind, title, body)
             values ($1, 'payout_paid', 'Notice', 'A message to carry across')`, [a]);
    await q(`update public.platform_settings set value_text = 'true' where key = 'platform.phone_format'`);
    await q(`insert into public.user_contact_details (user_id, phone_e164, phone_country)
             values ($1, '+256772123456', 'UG')`, [a]);

    const req = await request(a, 'merge-detail-b@example.com');
    await decide(b, req.requestId, true, 'Detail B');

    eq((await q('select count(*)::int as n from public.notifications where user_id = $1', [b])).rows[0].n,
      1, 'messages on the surviving account');
    eq((await q('select phone_e164 from public.user_contact_details where user_id = $1', [b])).rows[0]
      ?.phone_e164, '+256772123456', 'the phone number');
    eq((await q('select count(*)::int as n from public.user_contact_details where user_id = $1', [a])).rows[0].n,
      0, 'the closed account must not keep a phone number');
  });

  // -------------------------------------------------------------------------
  // The refusals
  // -------------------------------------------------------------------------
  await test('two accounts that both started the same course are refused, and told which', async () => {
    await flag(true);
    const a = await account('merge-shared-a@example.com', 'Shared A');
    const b = await account('merge-shared-b@example.com', 'Shared B');
    const learnerA = await ownLearner(a, 'Shared A');
    const learnerB = await ownLearner(b, 'Shared B');

    const teacher = await newInstructor('merge-teacher3@example.com', admin);
    const course = await ctx.newCourse(teacher, { title: 'Shared course', status: 'active' });
    const version = await ctx.newVersion(course, teacher);
    for (const learner of [learnerA, learnerB]) {
      await q(`insert into public.course_enrolments (learner_profile_id, course_id, course_version_id, source)
               values ($1,$2,$3,'free')`, [learner, course, version]);
    }

    const check = await preview(a, b);
    eq(check.ok, false, 'the preview');
    assert(check.blocks.some((block) => /Shared course/.test(block)),
      `the refusal does not name the course: ${JSON.stringify(check.blocks)}`);

    const req = await request(a, 'merge-shared-b@example.com');
    await rejects(() => decide(b, req.requestId, true, 'Shared B'), /Shared course/);

    eq((await profile(a)).account_status, 'active', 'the asking account after the refusal');
    eq((await profile(b)).account_status, 'active', 'the deciding account after the refusal');
  });

  await test('a payout in flight stops the merge', async () => {
    await flag(true);
    const a = await account('merge-payout-a@example.com', 'Payout A');
    const b = await account('merge-payout-b@example.com', 'Payout B');
    await q(`insert into public.instructor_payouts
               (instructor_user_id, amount_minor, currency_code, status, created_by)
             values ($1, 50000, 'UGX', 'scheduled', $2)`, [a, admin]);

    const check = await preview(a, b);
    eq(check.ok, false, 'the preview');
    assert(check.blocks.some((block) => /payout/.test(block)),
      `the refusal does not mention the payout: ${JSON.stringify(check.blocks)}`);
  });

  await test('a billing account shared with somebody else stops the merge', async () => {
    await flag(true);
    const a = await account('merge-bill-a@example.com', 'Bill A');
    const b = await account('merge-bill-b@example.com', 'Bill B');
    const c = await account('merge-bill-c@example.com', 'Bill C');

    const acct = (await q(
      `insert into public.billing_accounts (display_name, billing_country, billing_currency, status, created_by)
       values ('Shared household','UG','UGX','active',$1) returning id`, [a])).rows[0].id;
    for (const member of [a, c]) {
      // The creator may already be a member through whatever writer made the
      // account, so this is an upsert rather than an insert.
      await q(`insert into public.billing_account_memberships (billing_account_id, user_id, granted_by)
               values ($1,$2,$2)
               on conflict (billing_account_id, user_id) do nothing`, [acct, member]);
    }

    const check = await preview(a, b);
    eq(check.ok, false, 'the preview');
    assert(check.blocks.some((block) => /billing account/.test(block)),
      `the refusal does not mention the billing account: ${JSON.stringify(check.blocks)}`);
  });

  await test('a closed account cannot ask, and nothing can be merged into a closed one', async () => {
    await flag(true);
    const a = await account('merge-closed-a@example.com', 'Closed A');
    const b = await account('merge-closed-b@example.com', 'Closed B');

    // Closing an account is an administrative act; the trigger refuses it from
    // the account itself, so this is done the way the platform does it.
    await call(admin, `update public.user_profiles set account_status = 'closed', deleted_at = now()
                        where user_id = $1`, [b]);

    const check = await preview(a, b);
    eq(check.ok, false, 'the preview');
    assert(check.blocks.some((block) => /closed/.test(block)),
      `the refusal does not mention that an account is closed: ${JSON.stringify(check.blocks)}`);
  });

  await test('an expired request cannot be accepted', async () => {
    await flag(true);
    const a = await account('merge-exp-a@example.com', 'Exp A');
    const b = await account('merge-exp-b@example.com', 'Exp B');
    const req = await request(a, 'merge-exp-b@example.com');

    await q(`update public.account_merge_requests set expires_at = now() - interval '1 day'
              where id = $1`, [req.requestId]);

    const answer = await decide(b, req.requestId, true, 'Exp B');
    eq(answer.merged, false, 'the answer');
    eq(answer.status, 'expired', 'the answer’s status');
    eq((await q('select status from public.account_merge_requests where id = $1',
      [req.requestId])).rows[0].status, 'expired', 'the request status');
    eq((await profile(a)).account_status, 'active', 'nothing moved');
  });

  await test('the asking account can withdraw the request, and only it', async () => {
    await flag(true);
    const a = await account('merge-withdraw-a@example.com', 'Withdraw A');
    const b = await account('merge-withdraw-b@example.com', 'Withdraw B');
    const req = await request(a, 'merge-withdraw-b@example.com');

    await rejects(
      () => call(b, 'select public.cancel_account_merge($1) as r', [req.requestId]),
      /only the account asking/);

    const out = await call(a, 'select public.cancel_account_merge($1) as r', [req.requestId]);
    eq(out.cancelled, true, 'the withdrawal');
    eq((await mine(b)).incoming.length, 0, 'the target still sees a request');
  });

  await test('a merge cannot be run by a client directly', async () => {
    await rejects(
      () => call(admin, 'select public.merge_duplicate_account($1,$2) as r', [admin, admin]),
      /permission denied/);
  });

  await test('the flag is the owner’s to flip, and says so', async () => {
    const row = (await q(`select gate_type, preconditions from public.platform_settings
                           where key = 'platform.account_merge'`)).rows[0];
    eq(row.gate_type, 'admin', 'a built feature must not stay CODE-gated');
    assert(row.preconditions, 'an admin flag with no written precondition is a bug waiting to be enabled');
  });
}
