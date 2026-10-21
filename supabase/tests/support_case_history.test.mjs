// The history behind a support case.
//
// Six tables in this schema were written so that a support agent could explain a
// state, and nothing read them. What is pinned here is not that the rows come back
// — that is the easy half — but whose rows come back. The function is SECURITY
// DEFINER, so it runs as its owner and can read every order, subscription and
// enrolment on the platform; the only thing standing between a support agent and
// the whole database is the scope written inside it.
//
// The scope is the requester's, not the caller's. That distinction is invisible in
// a passing test and catastrophic in a failing one: `can_access_learner()` answers
// yes for every learner when the caller is staff, so a function that reached for it
// would return the entire platform and still look correct from the admin's seat.
// Every test below therefore asks the same question from two seats — the requester
// who may see this data and a stranger who may not — and compares what came back.

export async function run(ctx) {
  const {
    q, test, assert, rejects, asUser, asAnon, committed,
    newUser, newProfile, grantRole, bootstrapAdmin, newCourse, newVersion,
  } = ctx;

  const admin = await bootstrapAdmin('case-history-admin@example.com');
  await newProfile(admin, 'History Admin');
  const agent = await newUser('case-history-agent@example.com');
  await newProfile(agent, 'History Agent');
  await committed(() => grantRole(agent, 'support_agent', admin));

  let seq = 0;
  const tag = (label) => `${label}-${(++seq).toString().padStart(3, '0')}`;

  /** An adult learner profile linked to a real user account. */
  async function newAdult(email, label) {
    const userId = await newUser(email);
    await newProfile(userId, label);
    const learnerId = await committed(() => q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [label, userId])
      .then((r) => r.rows[0].id));
    return { userId, learnerId, label };
  }

  /** A support case written straight to the table: this suite reads history, it
   *  does not exercise the help desk's own rules, which support_cases.test.mjs
   *  pins. The writer functions are the only way a case is normally made. */
  async function newCase(requestedBy, { learner = null, order = null } = {}) {
    return committed(() => q(
      `insert into public.support_cases
         (case_number, requested_by, learner_profile_id, order_id, category, subject, body, status)
       values ($1,$2,$3,$4,'payment','I paid and cannot watch','The course will not play.','open')
       returning id`,
      [`SC-${tag('H')}`, requestedBy, learner, order]).then((r) => r.rows[0].id));
  }

  async function newBillingAccount(userId, { status = 'active' } = {}) {
    return committed(async () => {
      const account = (await q(
        `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
         values ('History account','UGX','active',$1) returning id`, [userId])).rows[0].id;
      await q(
        `insert into public.billing_account_memberships
           (billing_account_id, user_id, can_view_invoices, status, granted_by)
         values ($1,$2,true,$3,$4)
         on conflict (billing_account_id, user_id) do update set status = excluded.status`,
        [account, userId, status, admin]);
      return account;
    });
  }

  /** A paid order has to name who confirmed it and what they confirmed it
   *  against — `orders_paid_has_evidence`, and rightly so. */
  async function newOrder(account, { status = 'paid' } = {}) {
    return committed(() => q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, total_minor, status,
          placed_at, paid_at, payment_confirmed_by, payment_evidence)
       values ($1,'UGX',30000,30000,$2,now(),now(),$3,'Confirmed against a mobile money reference')
       returning id`, [account, status, admin])
      .then((r) => r.rows[0].id));
  }

  /** `subscriptions_state_writer_guard` refuses a bare insert unless the session
   *  says it is the checkout workflow. The guard passes when the setting has never
   *  been touched at all, which is why a suite that runs first gets away without
   *  this and a suite that runs after any subscription writer does not. */
  async function newSubscription(account) {
    return committed(async () => {
      await q(`select set_config('app.subscription_writer','on',true)`);
      const plan = (await q(
        `insert into public.plans (code, name, status)
         values ($1,'History Plan','active') returning id`, [`plan-${tag('history')}`]))
        .rows[0].id;
      const planVersion = (await q(
        `insert into public.plan_versions
           (plan_id, version_number, child_allowance, adult_allowance, billing_interval, status)
         values ($1,1,4,2,'month','active') returning id`, [plan])).rows[0].id;
      return (await q(
        `insert into public.subscriptions
           (billing_account_id, plan_id, plan_version_id, status, started_at)
         values ($1,$2,$3,'active',now()) returning id`, [account, plan, planVersion])).rows[0].id;
    });
  }

  /** Publishing is gated behind a scholarly review, which this suite is not
   *  about. Retiring is not gated, and it is the better fixture anyway: a
   *  retirement is exactly the case where an agent has to explain why a lesson
   *  somebody paid for stopped being there, and the status change writes its own
   *  `publication_events` row through `record_publication_event()`. */
  async function newCourseWithVersion(title, { retire = null } = {}) {
    return committed(async () => {
      const course = await newCourse(admin, { title });
      const version = await newVersion(course, admin);
      if (retire) {
        await q(`update public.course_versions
                    set version_status = 'retired', decision_by = $2, decision_reason = $3
                  where id = $1`, [version, admin, retire]);
      }
      return { course, version };
    });
  }

  async function newEnrolment(learnerId, { course, version }, { status = 'active' } = {}) {
    return committed(() => q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status, enrolled_at)
       values ($1,$2,$3,'purchase',$4,now()) returning id`, [learnerId, course, version, status])
      .then((r) => r.rows[0].id));
  }

  async function newGrant(learnerId, version) {
    return committed(() => q(
      `insert into public.entitlement_grants
         (learner_profile_id, scope_type, course_version_id, source_type, status)
       values ($1,'course_version',$2,'purchase','active') returning id`, [learnerId, version])
      .then((r) => r.rows[0].id));
  }

  /** Call the function as `actor`. Reads roll back; refusals are caught by
   *  `rejects`, and the harness transaction is rolled back either way. */
  const history = (actor, caseId) =>
    asUser(actor, () => q('select public.support_case_history($1) as h', [caseId])
      .then((r) => r.rows[0].h));

  /** The ids in a section, so a scope assertion reads as a set comparison. */
  const ids = (payload, section) => (payload[section]?.rows ?? []).map((row) => row.id);
  const learnerIds = (payload) => (payload.learners ?? []).map((row) => row.id);

  // ---------------------------------------------------------------------
  console.log('\nThe people the history is about');

  const asker = await newAdult('history-asker@example.com', 'History Asker');
  const stranger = await newAdult('history-stranger@example.com', 'History Stranger');
  const friend = await newAdult('history-friend@example.com', 'History Friend');
  const guardian = await newUser('history-guardian@example.com');
  await newProfile(guardian, 'Verified Guardian');
  const identityOnly = await newUser('history-identity@example.com');
  await newProfile(identityOnly, 'Identity Only');
  const billPayer = await newUser('history-payer@example.com');
  await newProfile(billPayer, 'Billing Manager');

  // A family: the asker owns it, the child learns in it, one member is verified
  // for progress, one for identity only, and one only pays.
  const family = await committed(async () => {
    const familyId = (await q(
      `insert into public.families (name, created_by, status)
       values ('History family',$1,'active') returning id`, [asker.userId])).rows[0].id;
    await q(`insert into public.family_memberships
               (family_id, user_id, membership_type, status, joined_at)
             values ($1,$2,'owner','active',now())`, [familyId, asker.userId]);
    const child = (await q(
      `insert into public.learner_profiles
         (display_name, learner_type, age_band, family_id)
       values ('History Child','child','8-10',$1) returning id`, [familyId])).rows[0].id;
    // A profile that was deleted: it stays out of scope, because reading history
    // about somebody the family removed is not the same as reading history.
    const ghost = (await q(
      `insert into public.learner_profiles
         (display_name, learner_type, age_band, family_id, deleted_at)
       values ('History Ghost','child','8-10',$1,now()) returning id`, [familyId])).rows[0].id;
    const member = async (userId, type) => q(
      `insert into public.family_memberships
         (family_id, user_id, membership_type, status, joined_at)
       values ($1,$2,$3,'active',now())`, [familyId, userId, type]);
    await member(billPayer, 'billing_manager');
    await q(
      `insert into public.guardian_relationships
         (guardian_user_id, learner_profile_id, relationship_type, status,
          can_view_progress, verified_at)
       values ($1,$2,'parent','active',true,now())`, [guardian, child]);
    await q(
      `insert into public.guardian_relationships
         (guardian_user_id, learner_profile_id, relationship_type, status,
          can_view_progress, verified_at)
       values ($1,$2,'guardian','active',false,now())`, [identityOnly, child]);
    return { familyId, child, ghost };
  });

  // The money and the learning: an account the asker belongs to, an order, a
  // subscription, and a course the child is enrolled in and entitled to.
  const askersAccount = await newBillingAccount(asker.userId);
  const askersOrder = await newOrder(askersAccount);
  const askersSubscription = await newSubscription(askersAccount);
  const childCourse = await newCourseWithVersion('History: Child Course',
    { retire: 'Retired after the author rewrote the course' });
  const childEnrolment = await newEnrolment(family.child, childCourse);
  const childGrant = await newGrant(family.child, childCourse.version);

  const strangerAccount = await newBillingAccount(stranger.userId);
  const strangerOrder = await newOrder(strangerAccount);
  const strangerCourse = await newCourseWithVersion('History: Stranger Course');
  const strangerEnrolment = await newEnrolment(stranger.learnerId, strangerCourse);
  const strangerGrant = await newGrant(stranger.learnerId, strangerCourse.version);

  // An account the asker has left. Creating an account makes its creator an active
  // member (`billing_account_creator_member`), so leaving is an update, and the
  // order on it stays out of scope until the asker names it on a case: naming an
  // order is the requester telling support which payment they mean.
  const leftAccount = await committed(async () => {
    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ('Left account','UGX','active',$1) returning id`, [asker.userId])).rows[0].id;
    await q(`update public.billing_account_memberships
                set status = 'revoked'
              where billing_account_id = $1 and user_id = $2`, [account, asker.userId]);
    const order = await newOrder(account, { status: 'refunded' });
    return { account, order };
  });

  // Adult progress shares: one on the asker's own profile, one granted *to* the
  // asker about somebody else's profile, and one between two people this case has
  // nothing to do with.
  const shares = await committed(async () => {
    const own = (await q(
      `insert into public.adult_learning_shares (learner_profile_id, grantee_user_id, scope, status)
       values ($1,$2,'progress','active') returning id`, [asker.learnerId, friend.userId]))
      .rows[0].id;
    const granted = (await q(
      `insert into public.adult_learning_shares (learner_profile_id, grantee_user_id, scope, status)
       values ($1,$2,'progress_and_achievements','active') returning id`,
      [stranger.learnerId, asker.userId])).rows[0].id;
    // A revoked share still has to arrive: an agent asked "who could see this"
    // needs the answer as it was, not only as it is.
    const unrelated = (await q(
      `insert into public.adult_learning_shares
         (learner_profile_id, grantee_user_id, scope, status, revoked_at)
       values ($1,$2,'achievements','revoked',now()) returning id`,
      [stranger.learnerId, friend.userId])).rows[0].id;
    return { own, granted, unrelated };
  });

  const askersCase = await newCase(asker.userId);

  // ---------------------------------------------------------------------
  console.log('\nWho may read it');

  await test('staff may read the history behind a case', async () => {
    const h = await history(admin, askersCase);
    assert(h.requester.userId === asker.userId, 'the requester was not identified');
    assert(h.requester.displayName === 'History Asker', 'the requester had no name');
    assert(h.learner === null, 'a case that named no learner reported one');
    assert(learnerIds(h).includes(asker.learnerId), 'the asker was not in their own scope');
    assert(learnerIds(h).includes(family.child), 'the family child was not in scope');
    assert(typeof h.generatedAt === 'string', 'the snapshot was not dated');
  });

  await test('a support agent may read it too', async () => {
    const h = await history(agent, askersCase);
    assert(ids(h, 'orders').includes(askersOrder), 'an agent could not read the order');
  });

  await test('the person who asked may not read their own history this way', async () => {
    // They may read their case and their messages; this bundle exists because it
    // joins money and access across tables they have no business querying.
    await rejects(() => history(asker.userId, askersCase),
      /only platform staff may read the history behind a support case/);
  });

  await test('an unauthenticated caller may not read it', async () => {
    await rejects(
      () => asAnon(() => q('select public.support_case_history($1)', [askersCase])),
      /only platform staff may read the history behind a support case/);
  });

  await test('a case that does not exist is refused rather than returned empty', async () => {
    await rejects(() => history(admin, crypto.randomUUID()), /no support case/);
  });

  // ---------------------------------------------------------------------
  console.log('\nWhose history comes back');

  await test('the scope is the requester\'s, not the staff member\'s', async () => {
    const h = await history(admin, askersCase);
    assert(!learnerIds(h).includes(stranger.learnerId),
      'a stranger\'s learner was in scope because staff may see everyone');
    assert(!ids(h, 'orders').includes(strangerOrder), 'a stranger\'s order was returned');
    assert(!ids(h, 'enrolments').includes(strangerEnrolment), 'a stranger\'s enrolment was returned');
    assert(!ids(h, 'entitlements').includes(strangerGrant), 'a stranger\'s grant was returned');
    assert(!ids(h, 'shares').includes(shares.unrelated),
      'a share between two unconnected people was returned');
  });

  await test('the same rows are visible from the stranger\'s own case', async () => {
    // The absence above could pass on an empty fixture, so the mirror is asserted.
    const strangerCase = await newCase(stranger.userId);
    const h = await history(admin, strangerCase);
    assert(ids(h, 'orders').includes(strangerOrder), 'the stranger could not see their own order');
    assert(ids(h, 'enrolments').includes(strangerEnrolment),
      'the stranger could not see their own enrolment');
    assert(ids(h, 'entitlements').includes(strangerGrant),
      'the stranger could not see their own grant');
    assert(ids(h, 'shares').includes(shares.unrelated), 'the stranger could not see their own share');
  });

  await test('a learner named on the case narrows the history to that learner', async () => {
    const named = await newCase(asker.userId, { learner: family.child });
    const h = await history(admin, named);
    assert(learnerIds(h).join() === family.child, 'a named learner did not narrow the scope');
    assert(h.learner.id === family.child, 'the named learner was not reported');
    assert(h.learner.learnerType === 'child', 'the named learner was not described');
    assert(ids(h, 'enrolments').join() === childEnrolment, 'enrolments were not narrowed');
    assert(!ids(h, 'shares').includes(shares.own),
      'a share on the asker\'s own profile survived narrowing to the child');
    // The money is not narrowed: a case about a child is usually about a payment
    // made by the adult, and the order says who paid.
    assert(ids(h, 'orders').includes(askersOrder), 'naming a learner hid the payment');
  });

  await test('a verified guardian holding the progress permission sees the child', async () => {
    const guardianCase = await newCase(guardian);
    const h = await history(admin, guardianCase);
    assert(learnerIds(h).includes(family.child), 'a verified guardian could not see the child');
    assert(ids(h, 'enrolments').includes(childEnrolment), 'the child\'s enrolment was missing');
  });

  await test('a guardian verified for identity only does not', async () => {
    const identityCase = await newCase(identityOnly);
    const h = await history(admin, identityCase);
    assert(!learnerIds(h).includes(family.child),
      'identity verification alone granted sight of the child\'s learning');
  });

  await test('a member who only pays for the family does not see its learners', async () => {
    const payerCase = await newCase(billPayer);
    const h = await history(admin, payerCase);
    assert(learnerIds(h).length === 0, 'a billing-only family member saw learning data');
    assert(h.enrolments.total === 0, 'a billing-only family member saw enrolments');
  });

  await test('a deleted learner profile stays out of scope', async () => {
    const h = await history(admin, askersCase);
    assert(!learnerIds(h).includes(family.ghost), 'a deleted learner profile was in scope');
  });

  // ---------------------------------------------------------------------
  console.log('\nThe money on the case');

  await test('an order the requester named is in scope after they left its account',
    async () => {
      const named = await newCase(asker.userId, { order: leftAccount.order });
      const h = await history(admin, named);
      const row = h.orders.rows.find((o) => o.id === leftAccount.order);
      assert(row, 'the order named on the case was not returned');
      assert(row.isCaseOrder === true, 'the named order was not marked');
      assert(row.status === 'refunded', 'the named order did not carry its status');
      assert(!ids(h, 'orders').includes(strangerOrder),
        'naming one order opened the requester\'s view of every order on the platform');
    });

  await test('that order is out of scope when the case does not name it', async () => {
    const h = await history(admin, askersCase);
    assert(!ids(h, 'orders').includes(leftAccount.order),
      'an account the requester had left was still in scope');
    assert(h.orders.total === 1, 'the order total counted an account the asker had left');
  });

  await test('subscriptions and their plans come back with the account', async () => {
    const h = await history(admin, askersCase);
    const row = h.subscriptions.rows.find((s) => s.id === askersSubscription);
    assert(row, 'the subscription was not returned');
    assert(row.planName === 'History Plan', 'the subscription did not name its plan');
    assert(row.billingInterval === 'month', 'the subscription did not carry its interval');
    assert(row.billingAccountId === askersAccount, 'the subscription was not tied to the account');
  });

  // ---------------------------------------------------------------------
  console.log('\nWhat each section explains');

  // Set by the fixture below so the assertion can compare the ids it wrote.
  const pinned = { from: null };

  await test('the histories inside each section arrive with the actor named', async () => {
    await committed(async () => {
      await q(`insert into public.order_status_history
                 (order_id, from_status, to_status, reason, changed_by, occurred_at)
               values ($1,'pending_payment','paid','Payment confirmed by hand',$2,now())`,
        [askersOrder, admin]);
      await q(`insert into public.subscription_history
                 (subscription_id, from_status, to_status, reason, changed_by, occurred_at)
               values ($1,'active','past_due','Card declined',$2,now())`, [askersSubscription, admin]);
      await q(`insert into public.entitlement_events
                 (entitlement_grant_id, event_type, from_status, to_status, reason, performed_by, occurred_at)
               values ($1,'suspended','active','suspended','Payment held',$2,now())`,
        [childGrant, admin]);
      // A re-pin has to move between two versions (`cev_history_versions_differ`),
      // so the child's enrolment is recorded as having been moved off version 2.
      const newer = await newVersion(childCourse.course, admin, { version_number: 2 });
      await q(`insert into public.course_enrolment_version_history
                 (course_enrolment_id, from_version_id, to_version_id, initiator, reason, method, occurred_at)
               values ($1,$2,$3,$4,'Version re-pinned after a data repair','data_repair',now())`,
        [childEnrolment, newer, childCourse.version, admin]);
      pinned.from = newer;
      // No insert for a publication event: retiring the version above wrote one.
    });

    const h = await history(admin, askersCase);

    const order = h.orders.rows.find((o) => o.id === askersOrder);
    assert(order.history.length === 1, 'the order carried no status history');
    assert(order.history[0].toStatus === 'paid', 'the order history lost the new status');
    assert(order.history[0].changedByName === 'History Admin', 'the order history lost the actor');

    const subscription = h.subscriptions.rows.find((s) => s.id === askersSubscription);
    assert(subscription.history.length === 1, 'the subscription carried no status history');
    assert(subscription.history[0].toStatus === 'past_due', 'the subscription history was wrong');

    const grant = h.entitlements.rows.find((g) => g.id === childGrant);
    assert(grant, 'the child\'s grant was missing');
    assert(grant.learnerName === 'History Child', 'the grant did not say whose it was');
    assert(grant.events.length === 1, 'the grant carried no events');
    assert(grant.events[0].eventType === 'suspended', 'the grant event was wrong');
    assert(grant.events[0].performedByName === 'History Admin', 'the grant event lost the actor');

    const enrolment = h.enrolments.rows.find((e) => e.id === childEnrolment);
    assert(enrolment.courseTitle === 'History: Child Course', 'the enrolment did not name the course');
    assert(enrolment.versionHistory.length === 1, 'the enrolment carried no version history');
    assert(enrolment.versionHistory[0].method === 'data_repair', 'the version history lost its method');
    assert(enrolment.versionHistory[0].fromVersionId === pinned.from,
      'the version history did not say which version the learner was moved off');
    assert(enrolment.versionHistory[0].toVersionId === childCourse.version,
      'the version history did not say which version the learner is on');

    const retired = h.publicationEvents.rows.find((p) => p.eventType === 'retired'
      && p.courseVersionId === childCourse.version);
    assert(retired, 'a retired version was not reported');
    assert(retired.reason === 'Retired after the author rewrote the course',
      'the event lost the reason the version was retired');
    assert(retired.courseTitle === 'History: Child Course', 'the event did not name the course');
    assert(retired.versionNumber === 1, 'the event did not say which version');
    assert(retired.performedByName === 'History Admin', 'the event lost its actor');
  });

  await test('a share granted to the requester appears even though the learner is out of scope',
    async () => {
      const h = await history(admin, askersCase);
      const granted = h.shares.rows.find((s) => s.id === shares.granted);
      assert(granted, 'a share granted to the requester was not returned');
      assert(granted.learnerName === 'History Stranger', 'the share did not name the learner');
      assert(granted.granteeName === 'History Asker', 'the share did not name the grantee');
      assert(ids(h, 'shares').includes(shares.own), 'a share on the asker\'s own profile was missing');
      assert(h.shares.total === 2, 'the share total was wrong');
    });

  await test('a capped section says how much it left out', async () => {
    // 51 publication events on a version the child is enrolled in, each a minute
    // apart so the ordering is decided by the data and not by insertion order.
    // These are synthetic; the point is the cap, not the story.
    // The events are synthetic; the point is the cap, not the story.
    const capped = await newCourseWithVersion('History: Capped Course');
    await newEnrolment(family.child, capped);
    await committed(async () => {
      for (let i = 0; i < 51; i += 1) {
        await q(`insert into public.publication_events
                   (course_version_id, event_type, performed_by, reason, occurred_at)
                 values ($1,'published',$2,$3,now() - ($4 || ' minutes')::interval)`,
          [capped.version, admin, `Republication ${i}`, i + 1]);
      }
    });

    const h = await history(admin, askersCase);
    assert(h.publicationEvents.total >= 51, 'the total did not count the capped events');
    assert(h.publicationEvents.rows.length === 50, 'the section was not capped');
    const reasons = h.publicationEvents.rows.map((p) => p.reason);
    assert(!reasons.includes('Republication 50'), 'the oldest event was not the one left out');
    assert(reasons.includes('Republication 0'), 'the newest event was missing');
  });

  await test('access checks are not part of the history, and the panel must say so', async () => {
    // The table's own comment promises "recorded so a support agent can explain a
    // denial". Nothing has ever recorded one, so a section here would be empty for
    // every case forever and would read as "no denial happened".
    await committed(() => q(
      `insert into public.access_checks
         (learner_profile_id, course_version_id, was_allowed, reason, checked_at)
       values ($1,$2,false,'no active entitlement',now())`,
      [family.child, childCourse.version]));

    const h = await history(admin, askersCase);
    assert(!('accessChecks' in h), 'the payload carried a section nothing can ever fill');
    assert(!JSON.stringify(h).includes('no active entitlement'),
      'a denial reason reached the payload from a table with no writer');
  });

  await test('reading the history writes nothing', async () => {
    const before = (await q(
      `select count(*)::int as n from public.governance_audit_events`)).rows[0].n;
    const touched = (await q(
      `select updated_at from public.support_cases where id = $1`, [askersCase])).rows[0].updated_at;
    await history(admin, askersCase);
    const after = (await q(
      `select count(*)::int as n from public.governance_audit_events`)).rows[0].n;
    assert(after === before, 'reading the history wrote an audit event');
    const stillTouched = (await q(
      `select updated_at from public.support_cases where id = $1`, [askersCase])).rows[0].updated_at;
    assert(String(stillTouched) === String(touched), 'reading the history touched the case');
  });

  await test('a case about somebody with nothing returns an honest empty bundle', async () => {
    const bare = await newUser('history-bare@example.com');
    await newProfile(bare, 'History Bare');
    const bareCase = await newCase(bare);
    const h = await history(admin, bareCase);
    assert(h.requester.displayName === 'History Bare', 'the requester was not identified');
    assert(h.learners.length === 0, 'a requester with no learners was given some');
    for (const section of ['orders', 'subscriptions', 'entitlements', 'enrolments',
      'publicationEvents', 'shares']) {
      assert(h[section].total === 0, `${section} counted rows for an empty account`);
      assert(Array.isArray(h[section].rows) && h[section].rows.length === 0,
        `${section} was not an empty list`);
    }
  });
}
