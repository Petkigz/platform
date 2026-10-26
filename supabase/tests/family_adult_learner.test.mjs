// An adult in a family account is also a learner.
//
// Before this, a family held children and nothing else. A parent who ran one had
// two disconnected identities: the family with the plan and the seats, and their
// own learner profile outside it. `allocate_subscription_learner()` already had
// an 'adult' slot type and the rule "an adult slot may only be assigned to your
// own learner profile" — a seat no screen could fill, because the parent's
// profile was never in the family.
//
// The interesting half is the identity guard. `guard_learner_profile_identity()`
// freezes `family_id` for everybody but staff, and that is right: it stops an
// owner turning a child's profile into an adult linked to an account of their
// choosing. The exception added here is written in terms of rows, not intent,
// because a trigger cannot see intent. Most of the tests below are about what
// the exception still refuses.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('fam-adult-admin@example.com');

  let seq = 0;
  async function adultPerson(label) {
    seq += 1;
    const id = await newUser(`fam-adult-${seq}@example.com`);
    await newProfile(id, label);
    return id;
  }

  /** Act as a user and COMMIT: the functions read the actor from the session. */
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

  const createFamily = (who, name) =>
    asActor(who, 'select public.create_family($1) id', [name]).then((r) => r.rows[0].id);

  const join = (who, familyId) =>
    asActor(who, 'select public.claim_family_adult_learner($1) r', [familyId]).then((r) => r.rows[0].r);

  const leave = (who, familyId) =>
    asActor(who, 'select public.release_family_adult_learner($1) r', [familyId]).then((r) => r.rows[0].r);

  const adultsIn = (who, familyId) =>
    asActor(who, 'select * from public.family_adult_learners($1)', [familyId]).then((r) => r.rows);

  const ownProfile = async (who) =>
    (await q(`select * from public.learner_profiles
               where linked_user_id = $1 and deleted_at is null`, [who])).rows[0] ?? null;

  // -------------------------------------------------------------------------
  // A parent becomes a learner in their own family
  // -------------------------------------------------------------------------

  const parent = await adultPerson('Parent');
  const family = await createFamily(parent, 'The Rahmans');

  await test('a parent who has never learnt before becomes a learner in their own family', async () => {
    const result = await join(parent, family);

    assert(result.created === true, `created was ${result.created}`);
    assert(result.joined === false, 'a brand new profile cannot also be "linked"');

    const profile = await ownProfile(parent);
    assert(profile, 'joining created no learner profile');
    assert(profile.family_id === family, 'the profile was created outside the family');
    assert(profile.learner_type === 'adult', `type was ${profile.learner_type}`);
    assert(profile.age_band === '18+', `age band was ${profile.age_band}`);
    assert(String(result.learnerProfileId) === String(profile.id), 'the returned id is not the profile');
  });

  await test('the family lists them as an adult learner, not a child', async () => {
    const rows = await adultsIn(parent, family);

    assert(rows.length === 1, `expected one adult learner, got ${rows.length}`);
    assert(rows[0].display_name === 'Parent', `display name was ${rows[0].display_name}`);
    assert(rows[0].linked_user_id === parent, 'the adult row is not linked to the account');
  });

  await test('clicking again changes nothing and says so', async () => {
    const before = await ownProfile(parent);
    const result = await join(parent, family);

    assert(result.created === false && result.joined === false,
      `second join reported created=${result.created} joined=${result.joined}`);
    const after = await ownProfile(parent);
    assert(String(before.id) === String(after.id), 'a second join created a second profile');
    const n = (await q(`select count(*)::int n from public.learner_profiles
                         where linked_user_id = $1`, [parent])).rows[0].n;
    assert(n === 1, `${n} profiles exist for one account`);
  });

  // -------------------------------------------------------------------------
  // Somebody who already learnt outside a family keeps everything
  // -------------------------------------------------------------------------

  await test('an existing learner profile is moved, not replaced, so progress survives', async () => {
    const mother = await adultPerson('Mother');
    const second = await createFamily(mother, 'The Iqbals');

    // Her own learning, from before the family existed.
    await asActor(mother, 'select public.claim_own_learner_profile()');
    const before = await ownProfile(mother);
    assert(before !== null && before.family_id === null, 'the fixture did not start outside a family');

    // A course, enrolled, so there is something to lose.
    const course = (await q(
      `insert into public.courses (slug, title, audience, created_by, status)
       values ($1, 'Fiqh', 'both', $2, 'active') returning id`,
      [`fiqh-${crypto.randomUUID().slice(0, 6)}`, mother])).rows[0].id;
    // An enrolment pins the version it was sold, so a version is needed even
    // though nothing here reads the content.
    const version = (await q(
      `insert into public.course_versions (course_id, version_number, language, created_by)
       values ($1, 1, 'en', $2) returning id`, [course, mother])).rows[0].id;
    await q(`insert into public.course_enrolments (learner_profile_id, course_id, course_version_id)
             values ($1, $2, $3)`, [before.id, course, version]);

    const result = await join(mother, second);
    assert(result.joined === true, 'the existing profile was not linked into the family');
    assert(String(result.learnerProfileId) === String(before.id), 'joining created a different profile');

    const after = await ownProfile(mother);
    assert(String(after.id) === String(before.id), 'the profile id changed');
    assert(after.family_id === second, 'the profile did not join the family');
    const enrolments = (await q(`select count(*)::int n from public.course_enrolments
                                  where learner_profile_id = $1`, [before.id])).rows[0].n;
    assert(enrolments === 1, 'the enrolments did not survive the move');
  });

  await test('a learner already in one family may not silently join another', async () => {
    const person = await adultPerson('Traveler');
    const first = await createFamily(person, 'First');
    const second = await createFamily(person, 'Second');
    await join(person, first);

    await rejects(() => join(person, second), /already belongs to another family/);
  });

  // -------------------------------------------------------------------------
  // The permission is membership of that family
  // -------------------------------------------------------------------------

  await test('a stranger cannot join somebody else\'s family', async () => {
    const stranger = await adultPerson('Stranger');

    await rejects(() => join(stranger, family), /not a member of this family/);
    const profile = await ownProfile(stranger);
    assert(profile === null || profile.family_id !== family,
      'a stranger was put inside the family');
  });

  await test('a family that does not exist is refused, not created', async () => {
    const ghost = await adultPerson('Ghost');

    await rejects(() => join(ghost, crypto.randomUUID()), /not found/);
  });

  // -------------------------------------------------------------------------
  // What the identity guard still refuses
  // -------------------------------------------------------------------------

  await test('an owner still cannot move a child\'s profile into another family', async () => {
    const owner = await adultPerson('Owner');
    const a = await createFamily(owner, 'A');
    const b = await createFamily(owner, 'B');
    const child = (await asActor(owner,
      'select public.add_child_to_family($1,$2,$3) id', [a, 'Amina', '8-10'])).rows[0].id;

    await rejects(() => asActor(owner,
      'update public.learner_profiles set family_id = $1 where id = $2', [b, child]),
    /cannot change how it is linked/);
  });

  await test('a profile still cannot be handed to a different account', async () => {
    const one = await adultPerson('One');
    const two = await adultPerson('Two');
    await join(one, await createFamily(one, 'One family'));
    const profile = await ownProfile(one);
    assert(profile !== null, 'the fixture did not create the profile it is about to hand over');

    // From the owner of the profile: RLS lets them touch the row, so the guard
    // is what has to refuse.
    await rejects(() => asActor(one,
      'update public.learner_profiles set linked_user_id = $1 where id = $2', [two, profile.id]),
    /cannot change how it is linked/);

    // From somebody else: RLS means the row is not theirs to update at all, and
    // an UPDATE that matches nothing reports success. The assertion is the
    // effect, not the silence.
    const attempt = await asActor(two,
      'update public.learner_profiles set linked_user_id = $1 where id = $2', [two, profile.id]);
    assert(attempt.rows.length === 0 || attempt.affectedRows === 0,
      'a stranger\'s update reported touching a profile that is not theirs');

    const after = (await q('select linked_user_id from public.learner_profiles where id = $1',
      [profile.id])).rows[0];
    assert(after.linked_user_id === one, 'the profile was handed to a different account');
  });

  await test('an adult cannot move their own learning into a family they do not belong to', async () => {
    const outsider = await adultPerson('Outsider');
    await join(outsider, await createFamily(outsider, 'Outsiders'));
    const profile = await ownProfile(outsider);

    await rejects(() => asActor(outsider,
      'update public.learner_profiles set family_id = $1 where id = $2', [family, profile.id]),
    /only move your own learning into a family you are a member of/);
  });

  await test('an adult may move their own learning out of a family, and keeps the profile', async () => {
    const mover = await adultPerson('Mover');
    const home = await createFamily(mover, 'Movers');
    await join(mover, home);
    const profile = await ownProfile(mover);

    const result = await leave(mover, home);
    assert(result.released === true, 'leaving did not report releasing anything');

    const after = await ownProfile(mover);
    assert(String(after.id) === String(profile.id), 'the profile was replaced rather than released');
    assert(after.family_id === null, 'the profile is still in the family');
    const rows = await adultsIn(mover, home);
    assert(rows.length === 0, `${rows.length} adult learners still listed after leaving`);
  });

  await test('leaving a family you do not learn inside is refused', async () => {
    const idle = await adultPerson('Idle');
    const elsewhere = await createFamily(idle, 'Elsewhere');

    await rejects(() => leave(idle, elsewhere), /does not learn inside that family/);
  });

  // -------------------------------------------------------------------------
  // A seat on the family plan pins the learner to the family
  // -------------------------------------------------------------------------

  await test('a learner holding an active plan seat cannot leave the family', async () => {
    const payer = await adultPerson('Payer');
    const household = await createFamily(payer, 'Household');
    await join(payer, household);
    const profile = await ownProfile(payer);

    // A real subscription, through the real checkout: a stub row would be
    // refused by the writer's own guard and would prove nothing about seats.
    const plan = (await asActor(admin, 'select public.create_plan($1,$2,$3,$4) id',
      ['family-seat', 'family-seat', 'Family seat plan', 'plus'])).rows[0].id;
    const version = (await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan, 3, 1, 'month', 'Terms'])).rows[0].id;
    const subject = (await q("select id from public.subject_areas where code = 'quran' limit 1")).rows[0].id;
    await asActor(admin, "select public.add_plan_entitlement($1,'catalogue',$2,null,null)",
      [version, subject]);
    await asActor(admin, "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')",
      [version]);
    const price = (await asActor(admin, "select public.set_plan_price($1,25000,'UGX',null) id",
      [version])).rows[0].id;
    await asActor(admin, 'select public.activate_plan_version($1)', [version]);

    await asActor(payer,
      `insert into public.billing_accounts
         (display_name,billing_country,billing_currency,status,created_by)
       values ('Household','UG','UGX','active',$1)`, [payer]);
    const account = (await q('select id from public.billing_accounts where created_by=$1',
      [payer])).rows[0].id;

    // `commerce.subscriptions` ships off; the toggle is restored afterwards so
    // the next suite meets the platform as it ships.
    const before = (await q(
      `select value_text from public.platform_settings where key='commerce.subscriptions'`)).rows[0].value_text;
    await q(`update public.platform_settings set value_text='true' where key='commerce.subscriptions'`);
    let orderId;
    try {
      orderId = (await asActor(payer, 'select * from public.create_plan_order($1,$2,$3,$4)',
        [account, version, price, profile.id])).rows[0].order_id;
    } finally {
      await q(`update public.platform_settings set value_text=$1 where key='commerce.subscriptions'`,
        [before]);
    }
    await q("select public.record_payment_success($1,$2,'manual','FAM-SEAT-1',null,'Bank receipt')",
      [orderId, admin]);

    const seat = (await q(`select slot_type,status from public.family_plan_allocations
                            where learner_profile_id = $1`, [profile.id])).rows[0];
    assert(seat && seat.status === 'active' && seat.slot_type === 'adult',
      'the fixture did not place an adult seat on the family plan');

    await rejects(() => leave(payer, household), /holds a seat on the family plan/);

    // And via the guard itself, which is the path a direct update would take.
    await rejects(() => asActor(payer,
      'update public.learner_profiles set family_id = null where id = $1', [profile.id]),
    /holds a seat on a family plan/);

    await q(`update public.family_plan_allocations set status = 'released',
               effective_until = now() where learner_profile_id = $1`, [profile.id]);
    const result = await leave(payer, household);
    assert(result.released === true, 'leaving was still refused after the seat was released');
  });

  // -------------------------------------------------------------------------
  // Who can see the adults in a family
  // -------------------------------------------------------------------------

  await test('another adult in the family sees them; an unrelated account does not', async () => {
    const owner = await adultPerson('Owner Two');
    const guest = await adultPerson('Guest');
    const home = await createFamily(owner, 'Shared');
    await join(owner, home);

    const membership = (await asActor(owner,
      'select public.invite_family_member($1,$2,$3) id', [home, guest, 'guardian'])).rows[0].id;
    await asActor(guest, 'select public.accept_family_membership($1) ok', [membership]);

    const seen = await adultsIn(guest, home);
    assert(seen.length === 1, `a family member saw ${seen.length} adult learners`);
    assert(seen[0].linked_user_id === owner, 'the wrong adult was listed');

    const outsider = await adultPerson('Unrelated');
    const hidden = await adultsIn(outsider, home);
    assert(hidden.length === 0, `an unrelated account saw ${hidden.length} adults`);
  });

  await test('the join and release are both in the audit trail', async () => {
    const subjectPerson = await adultPerson('Audited');
    const home = await createFamily(subjectPerson, 'Audited family');
    await join(subjectPerson, home);
    await leave(subjectPerson, home);

    const actions = (await q(
      `select action from public.governance_audit_events
        where target_type = 'family' and target_id = $1 order by occurred_at`, [home])).rows
      .map((r) => r.action);

    assert(actions.includes('family.adult_learner_joined'), `actions were ${actions.join(', ')}`);
    assert(actions.includes('family.adult_learner_released'), `actions were ${actions.join(', ')}`);
  });

  // -------------------------------------------------------------------------
  // An adult profile is still an adult profile
  // -------------------------------------------------------------------------

  await test('joining a family does not give the account admin rights over it', async () => {
    const learner = await adultPerson('Learner');
    const boss = await adultPerson('Boss');
    const home = await createFamily(boss, 'Boss family');
    const membership = (await asActor(boss,
      'select public.invite_family_member($1,$2,$3) id', [home, learner, 'billing_manager'])).rows[0].id;
    await asActor(learner, 'select public.accept_family_membership($1) ok', [membership]);

    // A billing-only member is a member: they may learn here as themselves.
    const result = await join(learner, home);
    assert(result.created === true, 'a billing member could not join as a learner');

    // But adding a child stays the owner's decision.
    await rejects(() => asActor(learner,
      'select public.add_child_to_family($1,$2,$3)', [home, 'Not mine', '8-10']),
    /only the owner/);
  });
}
