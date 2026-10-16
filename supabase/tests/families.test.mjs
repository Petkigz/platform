// Families, and the children underneath them.
//
// families and family_memberships both had zero rows and no writer, and the two
// policies governing them made the first row impossible to create:
//
//   fm_write_owner  using (is_family_owner(family_id, current_user_id()))
//
// is_family_owner() looks for an active 'owner' row in family_memberships, so
// inserting the first owner membership requires already being an active owner.
// A bootstrap deadlock.
//
// Measured before writing any code:
//   plain INSERT into families ................ allowed
//   INSERT into families ... RETURNING id ..... refused by RLS
//   INSERT the owner membership ............... refused by RLS
//   creator selects their own family .......... 0 rows
//
// The RETURNING case fails for a subtler reason: RETURNING must satisfy the
// SELECT policy, and families_read requires an active membership the creator
// does not have. The creator could not even read back the family they made.
//
// Why this matters beyond a missing table: D2 says a child is a learner_profile
// under a family, never a user, and the schema enforces it —
// lp_no_child_login_yet (a child may not have a login) together with
// lp_needs_family_or_login (a profile needs a family or a login) means a child
// profile REQUIRES a family. With no way to create one, no child could exist,
// and so no child could be enrolled. guardian_relationships has the same
// dependency, so the parental-consent workflow was blocked at the same point.
//
// This corrects an earlier claim that child enrolment was wired. The enrolment
// path was; the family it depends on could not be created.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, newUser, newProfile, newInstructor, newReviewer, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin   = await bootstrapAdmin('fam-admin@example.com');
  let seq = 0;
  const parent = async () => {
    seq += 1;
    const userId = await newUser(`fam-parent-${seq}@example.com`);
    await newProfile(userId, `Parent ${seq}`);
    return userId;
  };

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

  const createFamily = (who, name = 'The Ahmeds') =>
    asActor(who, 'select public.create_family($1) as id', [name]);

  const invite = (who, familyId, userId, type = 'guardian') =>
    asActor(who, 'select public.invite_family_member($1,$2,$3) as id',
      [familyId, userId, type]);

  const accept = (who, membershipId) =>
    asActor(who, 'select public.accept_family_membership($1) as ok', [membershipId]);

  const revokeMember = (who, membershipId, reason) =>
    asActor(who, 'select public.revoke_family_membership($1,$2) as ok',
      [membershipId, reason]);

  const addChild = (who, familyId, name = 'Amina', band = '8-10') =>
    asActor(who, 'select public.add_child_to_family($1,$2,$3) as id',
      [familyId, name, band]);

  const childRow = async (id) =>
    (await q(`select display_name, learner_type, age_band, family_id, linked_user_id, status
                from public.learner_profiles where id=$1`, [id])).rows[0];

  // -------------------------------------------------------------------
  console.log('\nCreating a family');
  // -------------------------------------------------------------------

  await test('a parent creates a family and can see it', async () => {
    const userId = await parent();

    const id = (await createFamily(userId)).rows[0].id;
    assert(id, 'no family id returned');

    // The thing that was broken: the creator could not read their own family,
    // because families_read requires an active membership.
    let visible = -1;
    await asUser(userId, async () => {
      visible = (await q('select count(*)::int n from public.families where id=$1',
        [id])).rows[0].n;
    });
    assert(visible === 1,
      `the creator can see ${visible} of their own families; expected 1`);
  });

  await test('creating a family also creates its owner membership', async () => {
    const userId = await parent();
    const id = (await createFamily(userId)).rows[0].id;

    const rows = (await q(
      `select membership_type, status, joined_at from public.family_memberships
        where family_id=$1`, [id])).rows;

    assert(rows.length === 1, `found ${rows.length} memberships, expected 1`);
    assert(rows[0].membership_type === 'owner',
      `membership was ${rows[0].membership_type}, expected owner`);
    assert(rows[0].status === 'active', `status was ${rows[0].status}`);
    assert(rows[0].joined_at !== null,
      'joined_at was null, which the fm_joined_when_active check requires');
  });

  await test('no family is ever created without an owner', async () => {
    // Atomicity is the point: a family with no owner is invisible and
    // unmanageable, and its children would be stranded.
    const userId = await parent();
    const id = (await createFamily(userId, null)).rows[0].id;

    const n = (await q(
      `select count(*)::int n from public.family_memberships
        where family_id=$1 and membership_type='owner' and status='active'`,
      [id])).rows[0].n;
    assert(n === 1, `found ${n} active owners, expected 1`);

    // A name is optional; the family still has one.
    const fam = (await q('select name from public.families where id=$1', [id])).rows[0];
    assert(fam.name === null, `name was ${JSON.stringify(fam.name)}, expected null`);
  });

  await test('an anonymous caller cannot create a family', async () => {
    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    await rejects(() => q('select public.create_family($1)', ['X']),
      /sign in to create a family/i);
    await q('rollback');
  });

  // -------------------------------------------------------------------
  console.log('\nInviting and accepting');
  // -------------------------------------------------------------------

  await test('an owner invites someone, who must accept before joining', async () => {
    const owner  = await parent();
    const invitee = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    const mId = (await invite(owner, familyId, invitee, 'guardian')).rows[0].id;
    assert(mId, 'no membership id returned');

    // Invited, not active. Being added to someone else's household without
    // agreeing would be a way to attach an account that never chose it.
    const before = (await q(
      'select status, joined_at from public.family_memberships where id=$1',
      [mId])).rows[0];
    assert(before.status === 'invited', `status was ${before.status}`);
    assert(before.joined_at === null, 'joined_at should be null until accepted');

    const ok = (await accept(invitee, mId)).rows[0].ok;
    assert(ok === true, 'acceptance reported no change');

    const after = (await q(
      'select status, joined_at from public.family_memberships where id=$1',
      [mId])).rows[0];
    assert(after.status === 'active', `status was ${after.status}`);
    assert(after.joined_at !== null, 'joined_at was not set on acceptance');
  });

  await test('only the invited person may accept', async () => {
    const owner   = await parent();
    const invitee = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;
    const mId = (await invite(owner, familyId, invitee, 'guardian')).rows[0].id;

    // An owner accepting on someone's behalf would defeat the point of asking.
    await rejects(() => accept(owner, mId),
      /only the invited person may accept/i);

    const row = (await q('select status from public.family_memberships where id=$1',
      [mId])).rows[0];
    assert(row.status === 'invited', `status became ${row.status}`);
  });

  await test('accepting twice reports no change rather than failing', async () => {
    const owner   = await parent();
    const invitee = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;
    const mId = (await invite(owner, familyId, invitee, 'guardian')).rows[0].id;
    await accept(invitee, mId);

    const again = (await accept(invitee, mId)).rows[0].ok;
    assert(again === false, 'a second acceptance should report no change');
  });

  await test('a second invitation for the same person is refused, not stacked', async () => {
    const owner   = await parent();
    const invitee = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    await invite(owner, familyId, invitee, 'guardian');
    await rejects(() => invite(owner, familyId, invitee, 'billing_manager'),
      /already a member/i);
  });

  await test('a non-owner cannot invite anyone', async () => {
    const owner   = await parent();
    const invitee = await parent();
    const stranger = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;
    const mId = (await invite(owner, familyId, stranger, 'guardian')).rows[0].id;
    await accept(stranger, mId);

    // A guardian is a member but not an owner.
    await rejects(() => invite(stranger, familyId, invitee, 'guardian'),
      /only the owner may invite/i);
  });

  await test('an unsupported membership type is refused by name', async () => {
    const owner = await parent();
    const other = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    await rejects(() => invite(owner, familyId, other, 'child'),
      /unsupported membership type: child/i);
  });

  await test('inviting a user who does not exist is refused', async () => {
    const owner = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    await rejects(() => invite(owner, familyId,
      '00000000-0000-4000-8000-000000000000', 'guardian'),
      /no such user/i);
  });

  // -------------------------------------------------------------------
  console.log('\nRemoving a member');
  // -------------------------------------------------------------------

  await test('removing a member needs a written reason and soft-revokes', async () => {
    const owner   = await parent();
    const invitee = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;
    const mId = (await invite(owner, familyId, invitee, 'guardian')).rows[0].id;
    await accept(invitee, mId);

    await rejects(() => revokeMember(owner, mId, '   '),
      /a reason is required/i);

    const ok = (await revokeMember(owner, mId, 'no longer part of the household')).rows[0].ok;
    assert(ok === true, 'removal reported no change');

    const row = (await q(
      'select status, revoked_at from public.family_memberships where id=$1',
      [mId])).rows[0];
    assert(row.status === 'revoked', `status was ${row.status}`);
    assert(row.revoked_at !== null, 'revoked_at was not set, which the CHECK requires');
  });

  await test('the last owner cannot be removed', async () => {
    // Lockout guard, as with privileged roles. A family with no owner would be
    // unmanageable and its children stranded.
    const owner = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    const mId = (await q(
      `select id from public.family_memberships
        where family_id=$1 and membership_type='owner'`, [familyId])).rows[0].id;

    await rejects(() => revokeMember(owner, mId, 'leaving'),
      /needs at least one owner/i);

    const row = (await q('select status from public.family_memberships where id=$1',
      [mId])).rows[0];
    assert(row.status === 'active', `the owner was ${row.status}`);
  });

  await test('a second owner can be removed once there are two', async () => {
    const owner  = await parent();
    const second = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    const mId = (await invite(owner, familyId, second, 'owner')).rows[0].id;
    await accept(second, mId);

    const ok = (await revokeMember(owner, mId, 'no longer an owner')).rows[0].ok;
    assert(ok === true, 'removal reported no change');

    const n = (await q(
      `select count(*)::int n from public.family_memberships
        where family_id=$1 and membership_type='owner' and status='active'`,
      [familyId])).rows[0].n;
    assert(n === 1, `${n} active owners left, expected 1`);
  });

  await test('a non-owner cannot remove a member', async () => {
    const owner   = await parent();
    const invitee = await parent();
    const third   = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    const a = (await invite(owner, familyId, invitee, 'guardian')).rows[0].id;
    await accept(invitee, a);
    const b = (await invite(owner, familyId, third, 'guardian')).rows[0].id;
    await accept(third, b);

    await rejects(() => revokeMember(invitee, b, 'not needed'),
      /only the owner may remove/i);
  });

  // -------------------------------------------------------------------
  console.log('\nAdding a child');
  // -------------------------------------------------------------------

  await test('an owner adds a child, who has no login', async () => {
    const owner = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    const childId = (await addChild(owner, familyId, 'Amina', '8-10')).rows[0].id;
    assert(childId, 'no learner profile id returned');

    const c = await childRow(childId);
    assert(c.display_name === 'Amina', `name was ${c.display_name}`);
    assert(c.learner_type === 'child', `type was ${c.learner_type}`);
    assert(c.age_band === '8-10', `age band was ${c.age_band}`);
    assert(c.family_id === familyId, 'the child is not in the family');

    // D2: a child is never a user. lp_no_child_login_yet enforces it, and this
    // asserts the writer respects it rather than relying on the constraint to
    // fail loudly later.
    assert(c.linked_user_id === null,
      'a child was given a login, which D2 forbids');
  });

  await test('a child needs a name', async () => {
    const owner = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    await rejects(() => addChild(owner, familyId, '   ', '8-10'),
      /a child needs a name/i);
  });

  await test('an adult age band cannot be added as a child', async () => {
    // An adult should sign up, not be added to a household as a child.
    const owner = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    await rejects(() => addChild(owner, familyId, 'Dad', '18+'),
      /unsupported age band for a child: 18\+/i);

    for (const band of ['5-7', '11-13', '14-17']) {
      const id = (await addChild(owner, familyId, `Kid ${band}`, band)).rows[0].id;
      assert(id, `a child in band ${band} should be accepted`);
    }
  });

  await test('a non-owner cannot add a child', async () => {
    const owner   = await parent();
    const guardian = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;
    const mId = (await invite(owner, familyId, guardian, 'guardian')).rows[0].id;
    await accept(guardian, mId);

    await rejects(() => addChild(guardian, familyId, 'NotMine', '8-10'),
      /only the owner may add a child/i);
  });

  await test('a stranger cannot add a child to someone else\'s family', async () => {
    const owner    = await parent();
    const stranger = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;

    await rejects(() => addChild(stranger, familyId, 'Intruder', '8-10'),
      /only the owner may add a child/i);
  });

  // -------------------------------------------------------------------
  console.log('\nThe child can actually be enrolled');
  // -------------------------------------------------------------------

  await test('a child in a family can be enrolled in a course', async () => {
    // This is the whole point. Before this migration no child could exist, so
    // no child could be enrolled however correct the enrolment path was.
    const owner = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;
    const childId = (await addChild(owner, familyId, 'Amina', '8-10')).rows[0].id;

    const teacher  = await newInstructor('fam-teacher@example.com', admin);
    const course   = await newCourse(teacher, { status: 'active' });
    const version  = await newVersion(course, teacher);
    const section  = await newSection(version);
    await newLesson(section);

    const enrolment = (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'family_entitlement','active') returning id, status`,
      [childId, course, version])).rows[0];

    assert(enrolment.id, 'the enrolment was not created');
    assert(enrolment.status === 'active', `status was ${enrolment.status}`);
  });

  await test('the owner can act for their child, and a stranger cannot', async () => {
    const owner    = await parent();
    const stranger = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;
    const childId  = (await addChild(owner, familyId, 'Amina', '8-10')).rows[0].id;

    let ownerSees = -1;
    let strangerSees = -1;

    await asUser(owner, async () => {
      ownerSees = (await q(
        'select count(*)::int n from public.learner_profiles where id=$1',
        [childId])).rows[0].n;
    });
    await asUser(stranger, async () => {
      strangerSees = (await q(
        'select count(*)::int n from public.learner_profiles where id=$1',
        [childId])).rows[0].n;
    });

    assert(ownerSees === 1, `the owner can see ${ownerSees} of their own child`);
    assert(strangerSees === 0,
      `a stranger can see ${strangerSees} of someone else's child`);
  });

  await test('the parental-consent workflow can now be started', async () => {
    // gr_insert requires is_learner_family_member(learner_profile_id). With no
    // family creatable, a parent could not even request guardianship.
    const owner    = await parent();
    const familyId = (await createFamily(owner)).rows[0].id;
    const childId  = (await addChild(owner, familyId, 'Amina', '8-10')).rows[0].id;

    const rel = (await q(
      `insert into public.guardian_relationships
         (guardian_user_id, learner_profile_id, relationship_type, status,
          can_manage_profile, can_view_progress, can_manage_learning)
       values ($1,$2,'parent','pending_verification',true,true,true) returning id, status`,
      [owner, childId])).rows[0];

    assert(rel.id, 'the guardian relationship was not created');
    assert(rel.status === 'pending_verification', `status was ${rel.status}`);
  });

  // -------------------------------------------------------------------
  console.log('\nAudit trail');
  // -------------------------------------------------------------------

  await test('the whole family lifecycle is audited', async () => {
    const owner   = await parent();
    const invitee = await parent();

    const familyId = (await createFamily(owner)).rows[0].id;
    const mId = (await invite(owner, familyId, invitee, 'guardian')).rows[0].id;
    await accept(invitee, mId);
    await addChild(owner, familyId, 'Amina', '8-10');
    await revokeMember(owner, mId, 'no longer needed');

    const actions = (await q(
      `select action from public.governance_audit_events
        where target_type='family' and target_id=$1 order by occurred_at`,
      [familyId])).rows.map((x) => x.action);

    const expected = 'family.created,family.member_invited,family.member_joined,family.child_added,family.member_removed';
    assert(actions.join(',') === expected,
      `audit actions were [${actions.join(', ')}]`);
  });
}
