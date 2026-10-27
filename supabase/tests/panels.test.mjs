// The scholarly panel: convened, seated, voted, decided — and refused when it is
// not.
//
// These four tables existed since 2026-10-18 and nothing could close a case, so
// `governance.panel_required` would have blocked every publication on the
// platform for ever. The tests below are mostly about the refusals, because the
// refusals are what the owner's rule ("the board decides only when it is present
// and active") actually means.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    ensureReviewerProfile, satisfyReview, grantRole, newCourse, newVersion,
    committed,
  } = ctx;

  const admin = await bootstrapAdmin('panel-admin@example.com');

  async function account(email, name) {
    const id = await newUser(email);
    await newProfile(id, name);
    return id;
  }

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
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

  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;
  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const governance = await account('panel-governance@example.com', 'Governance Person');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  const teacher = await newInstructor('panel-teacher@example.com', admin);

  // Three people the owner has appointed to the board and seated.
  const members = [];
  for (const [email, name] of [
    ['panel-chair@example.com', 'Panel Chair'],
    ['panel-member-one@example.com', 'Panel Member One'],
    ['panel-member-two@example.com', 'Panel Member Two'],
  ]) {
    const id = await account(email, name);
    await committed(() => grantRole(id, 'scholarly_panel_member', admin));
    const profile = await ensureReviewerProfile(id, admin);
    members.push({ id, profile });
  }
  const [chair, first, second] = members;
  // `chair` holds the chair's seat, `first` and `second` are ordinary members.

  // Appointed, checked, but without the board appointment.
  const unappointed = await account('panel-unappointed@example.com', 'Not Appointed');
  const unappointedProfile = await ensureReviewerProfile(unappointed, admin);

  // Has the role, has an application, not checked.
  const applicant = await account('panel-applicant@example.com', 'Not Checked');
  await committed(() => grantRole(applicant, 'scholarly_panel_member', admin));
  const applicantProfile = (await q(
    `insert into public.reviewer_profiles (user_id, reviewer_status)
     values ($1, 'applicant') returning id`, [applicant])).rows[0].id;

  const course = await newCourse(teacher, { title: 'Aqeedah for beginners', status: 'active' });
  const version = await newVersion(course, teacher);

  // A name of its own: another suite (group3) seeds a panel called "Fiqh panel"
  // to test the publication gate, and looking this one up by a shared name would
  // silently test that one instead.
  const PANEL_NAME = 'Workflow fiqh panel';
  let panelId = '';

  await test('only the owner opens a panel, and it is not convened by existing', async () => {
    await rejects(() => call(governance, 'open_panel($1,$2,$3,$4)',
      [PANEL_NAME, null, null, 2]), /not_allowed/);
    await rejects(() => call(members[0].id, 'open_panel($1,$2,$3,$4)',
      [PANEL_NAME, null, null, 2]), /not_allowed/);
    await rejects(() => call(admin, 'open_panel($1,$2,$3,$4)',
      ['X', null, null, 2]), /name_required/);
    await rejects(() => call(admin, 'open_panel($1,$2,$3,$4)',
      [PANEL_NAME, null, null, 0]), /quorum_invalid/);
    await rejects(() => call(admin, 'open_panel($1,$2,$3,$4)',
      [PANEL_NAME, null, null, 26]), /quorum_invalid/);
    await rejects(() => call(admin, 'open_panel($1,$2,$3,$4)',
      [PANEL_NAME, null, '00000000-0000-0000-0000-000000000000', 2]), /subject_not_found/);

    const opened = await call(admin, 'open_panel($1,$2,$3,$4)',
      [PANEL_NAME, 'Cases about fiqh courses.', null, 2]);
    eq(opened.status, 'inactive', 'a panel on paper');
    eq(opened.quorum, 2, 'the quorum the owner chose');
    panelId = opened.id;
    eq((await q('select count(*)::int n from public.scholarly_panels where name = $1',
      [PANEL_NAME])).rows[0].n, 1, 'panels with this name');
  });

  await test('a seat needs both the appointment and a checked person', async () => {
    await rejects(() => call(governance, 'add_panel_member($1,$2,$3)',
      [panelId, first.profile, 'member']), /not_allowed/);
    await rejects(() => call(admin, 'add_panel_member($1,$2,$3)',
      [panelId, '00000000-0000-0000-0000-000000000000', 'member']), /reviewer_not_found/);
    await rejects(() => call(admin, 'add_panel_member($1,$2,$3)',
      [panelId, applicantProfile, 'member']), /reviewer_not_active/);
    await rejects(() => call(admin, 'add_panel_member($1,$2,$3)',
      [panelId, unappointedProfile, 'member']), /appointment_required/);
    await rejects(() => call(admin, 'add_panel_member($1,$2,$3)',
      [panelId, chair.profile, 'king']), /role_invalid/);

    const seated = await call(admin, 'add_panel_member($1,$2,$3)',
      [panelId, chair.profile, 'chair']);
    eq(seated.memberRole, 'chair', 'the chair’s seat');

    await rejects(() => call(admin, 'add_panel_member($1,$2,$3)',
      [panelId, chair.profile, 'member']), /already_a_member/);

    // A member who left can be seated again, because the old row is history.
    const old = (await q(
      `select id from public.scholarly_panel_memberships
        where panel_id = $1 and reviewer_profile_id = $2 and status = 'active'`,
      [panelId, chair.profile])).rows[0].id;
    await call(admin, 'remove_panel_member($1,$2)', [old, 'Stepping down for now.']);
    const again = await call(admin, 'add_panel_member($1,$2,$3)',
      [panelId, chair.profile, 'chair']);
    assert(again.id !== old, 're-seating reused the old membership row');
  });

  await test('a panel is not convened until enough people are seated', async () => {
    await rejects(() => call(governance, 'set_panel_status($1,$2,$3)',
      [panelId, 'active', 'Ready.'], ), /not_allowed/);
    await rejects(() => call(admin, 'set_panel_status($1,$2,$3)',
      [panelId, 'active', null]), /not_enough_members/);

    await call(admin, 'add_panel_member($1,$2,$3)', [panelId, first.profile, 'member']);
    await call(admin, 'add_panel_member($1,$2,$3)', [panelId, second.profile, 'member']);
    const convened = await call(admin, 'set_panel_status($1,$2,$3)',
      [panelId, 'active', 'Convened for the fiqh cases.']);
    eq(convened.status, 'active', 'the panel after convening');

    const same = await call(admin, 'set_panel_status($1,$2,$3)', [panelId, 'active', null]);
    eq(same.changed, false, 'convening twice is not a change');

    // Dissolving with cases open is refused; with none it needs a reason.
    await rejects(() => call(admin, 'set_panel_status($1,$2,$3)',
      [panelId, 'dissolved', null]), /reason_required/);
  });

  await test('a case opens on an unpublished version, once, on a convened panel', async () => {
    await rejects(() => call(members[0].id, 'open_panel_case($1,$2)',
      [panelId, version]), /not_allowed/);
    await rejects(() => call(governance, 'open_panel_case($1,$2)',
      ['00000000-0000-0000-0000-000000000000', version]), /not_found/);
    await rejects(() => call(governance, 'open_panel_case($1,$2)',
      [panelId, '00000000-0000-0000-0000-000000000000']), /version_not_found/);

    const opened = await call(governance, 'open_panel_case($1,$2)', [panelId, version]);
    eq(opened.status, 'open', 'a new case');

    await rejects(() => call(governance, 'open_panel_case($1,$2)', [panelId, version]),
      /case_open/);
  });

  const caseId = (await q(
    'select id from public.scholarly_panel_cases where course_version_id = $1',
    [version])).rows[0].id;

  await test('only a seated member of a convened panel votes, and only once', async () => {
    await rejects(() => call(unappointed, 'cast_panel_vote($1,$2,$3)',
      [caseId, 'approve', null]), /not_a_member/);
    await rejects(() => call(applicant, 'cast_panel_vote($1,$2,$3)',
      [caseId, 'approve', null]), /not_a_member/); // a reviewer, but not seated
    await rejects(() => call(first.id, 'cast_panel_vote($1,$2,$3)',
      [caseId, 'maybe', null]), /vote_invalid/);

    const voted = await call(first.id, 'cast_panel_vote($1,$2,$3)',
      [caseId, 'approve', 'The text is sound.']);
    eq(voted.vote, 'approve', 'the vote cast');

    await rejects(() => call(first.id, 'cast_panel_vote($1,$2,$3)',
      [caseId, 'reject', null]), /already_voted/);

    // A panel that is not convened decides nothing, even for a seated member.
    await call(admin, 'set_panel_status($1,$2,$3)', [panelId, 'inactive', null]);
    await rejects(() => call(second.id, 'cast_panel_vote($1,$2,$3)',
      [caseId, 'approve', null]), /not_convened/);
    await call(admin, 'set_panel_status($1,$2,$3)', [panelId, 'active', null]);
  });

  await test('the member sees their case, and nobody else’s vote until they vote', async () => {
    const work = await call(first.id, 'my_panel_work()');
    eq(work.panelMember, true, 'a seated member');
    eq(work.cases.length, 1, 'the cases waiting on this member');
    eq(work.cases[0].myVote, 'approve', 'their own vote');
    assert(work.cases[0].tally !== null, 'a member who has voted cannot see the tally');

    // Before voting, a member sees how many have voted — never how.
    const before = await call(second.id, 'my_panel_work()');
    eq(before.cases[0].myVote, null, 'a vote they have not cast');
    eq(before.cases[0].cast, 1, 'votes cast by others');
    eq(before.cases[0].tally, null, 'the direction of other members’ votes');

    const stranger = await call(unappointed, 'my_panel_work()');
    eq(stranger.panelMember, false, 'somebody not on a panel');
    eq(stranger.cases.length, 0, 'cases shown to a non-member');
  });

  await test('a case is not closed without quorum, and not against its own votes', async () => {
    await rejects(() => call(admin, 'decide_panel_case($1,$2,$3)',
      [caseId, 'approved', 'Approved by the panel.'], ), /quorum_not_met/);

    // A second vote, so the quorum is met: one approve, one reject is a tie.
    await call(second.id, 'cast_panel_vote($1,$2,$3)', [caseId, 'reject', 'One passage needs a source.']);

    const tally = await call(admin, 'panel_tally($1)', [caseId]);
    eq(tally.cast, 2, 'votes cast at quorum');
    eq(tally.approve, 1, 'approvals');
    eq(tally.reject, 1, 'rejections');

    await rejects(() => call(admin, 'decide_panel_case($1,$2,$3)',
      [caseId, 'approved', 'Approved anyway.']), /outcome_contradicts_votes/);
    await rejects(() => call(admin, 'decide_panel_case($1,$2,$3)',
      [caseId, 'rejected', 'short']), /summary_required/);
    await rejects(() => call(admin, 'decide_panel_case($1,$2,$3)',
      [caseId, 'maybe', 'A decision that is not one.']), /outcome_invalid/);

    // A chair may record the board's decision; a member who is not the chair may not.
    await rejects(() => call(first.id, 'decide_panel_case($1,$2,$3)',
      [caseId, 'withdrawn', 'Withdrawn by a member.']), /not_allowed/);
  });

  await test('quorum and a majority close the case, and the publication gate opens', async () => {
    // The chair's own vote breaks the tie, then the chair records the decision.
    await call(chair.id, 'cast_panel_vote($1,$2,$3)', [caseId, 'approve', 'Approved.']);
    const decided = await call(chair.id, 'decide_panel_case($1,$2,$3)',
      [caseId, 'approved', 'Approved by the fiqh panel on 2026-10-27.']);
    eq(decided.status, 'approved', 'the case');
    eq(decided.tally.approve, 2, 'approvals on the record');
    eq(decided.tally.reject, 1, 'rejections on the record');

    const row = (await q(
      'select status, closed_at, outcome_summary from public.scholarly_panel_cases where id = $1',
      [caseId])).rows[0];
    eq(row.status, 'approved', 'the stored case');
    assert(row.closed_at !== null, 'a closed case with no closing time');
    eq(row.outcome_summary, 'Approved by the fiqh panel on 2026-10-27.', 'the written decision');

    await rejects(() => call(admin, 'decide_panel_case($1,$2,$3)',
      [caseId, 'rejected', 'Decided twice.']), /already_decided/);

    // With the panel required, the publication gate now has what it asks for.
    const on = await q(`update public.platform_settings set value_text = 'true'
                         where key = 'governance.panel_required'`);
    void on;
    await satisfyReview(version, await newReviewer('panel-reviewer@example.com', admin), admin);
    await q(`update public.course_versions
                set version_status = 'published', decision_by = $2,
                    decision_reason = 'Approved after the panel sat'
              where id = $1`, [version, admin]);
    const published = (await q(
      'select version_status from public.course_versions where id = $1', [version])).rows[0];
    eq(published.version_status, 'published', 'the version after the panel approved it');

    await q(`update public.platform_settings set value_text = 'false'
              where key = 'governance.panel_required'`);
  });

  await test('a convened panel cannot be emptied below its quorum', async () => {
    const seats = (await q(
      `select id, reviewer_profile_id from public.scholarly_panel_memberships
        where panel_id = $1 and status = 'active' order by joined_at`, [panelId])).rows;
    // Three seated, quorum two: one removal leaves the panel able to decide, the
    // next would leave it unable to, which is the refusal.
    await call(admin, 'remove_panel_member($1,$2,$3)',
      [seats[0].id, 'Stepping down.', 'stepped_down']);
    const left = (await q(
      `select count(*)::int n from public.scholarly_panel_memberships
        where panel_id = $1 and status = 'active'`, [panelId])).rows[0].n;
    eq(left, 2, 'members still seated at quorum');

    await rejects(() => call(admin, 'remove_panel_member($1,$2)',
      [seats[1].id, 'Stepping down.']), /below_quorum/);
    await rejects(() => call(admin, 'remove_panel_member($1,$2)',
      [seats[1].id, '']), /reason_required/);
    await rejects(() => call(governance, 'remove_panel_member($1,$2)',
      [seats[1].id, 'Not mine to do.']), /not_allowed/);

    // Making the panel inactive first is the way out the refusal names.
    await call(admin, 'set_panel_status($1,$2,$3)', [panelId, 'inactive', null]);
    const removed = await call(admin, 'remove_panel_member($1,$2)',
      [seats[1].id, 'Stepping down while the panel is closed.']);
    eq(removed.status, 'stepped_down', 'the removal');

    // And a panel that has been dissolved stays dissolved.
    await call(admin, 'set_panel_status($1,$2,$3)',
      [panelId, 'dissolved', 'The fiqh cases are finished.']);
    await rejects(() => call(admin, 'add_panel_member($1,$2,$3)',
      [panelId, first.profile, 'member']), /dissolved/);
  });

  await test('the register is staff reading, and it says what is waiting', async () => {
    await rejects(() => call(unappointed, 'panel_register()'), /not_allowed/);

    const register = await call(governance, 'panel_register()');
    const panel = register.panels.find((row) => row.id === panelId);
    assert(panel, 'the panel is not on the register');
    eq(panel.status, 'dissolved', 'the panel after dissolving');
    eq(panel.quorum, 2, 'the quorum');
    assert(panel.cases.some((c) => c.id === caseId && c.status === 'approved'),
      'the decided case is not on the register');
    eq(register.counts.panels >= 1, true, 'the panel count');
    eq(register.panelRequired, false, 'the publication switch is off again');

    // The people who could be seated, with the appointment marked rather than
    // filtered out — the screen says why somebody cannot be seated.
    const candidate = register.candidates.find((c) => c.name === 'Not Appointed');
    assert(candidate, 'a checked reviewer is not offered as a candidate');
    eq(candidate.appointed, false, 'somebody without the appointment');
    assert(register.candidates.find((c) => c.name === 'Panel Chair').appointed === true,
      'a seated member is not marked as appointed');

    // The versions a case could be opened against are listed, and a published
    // one is not among them.
    assert(register.awaiting.every((row) => row.versionStatus !== 'published'),
      'a published version is offered for a panel case');
  });

  await test('the panel flag says what is built and what is still the owner’s', async () => {
    const row = (await q(
      `select gate_type, preconditions from public.platform_settings
        where key = 'teaching.panel'`)).rows[0];
    assert(row, 'teaching.panel is not in the register');
    eq(row.gate_type, 'admin_setup', 'the panel gate');
    assert(/quorum/i.test(row.preconditions), 'the precondition does not name the quorum decision');
    assert(/governance.panel_required/i.test(row.preconditions),
      'the precondition does not name the switch that publishes');
  });
}
