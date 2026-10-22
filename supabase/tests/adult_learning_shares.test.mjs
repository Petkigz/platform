// An adult can share their learning, and the person they share with can see it.
//
// `adult_learning_shares` was designed in the first week with the whole rule already
// in it — three scopes, an expiry that has to be in the future, a revocation
// timestamp the status is tied to by a CHECK, one active share per person per scope,
// and a trigger that refuses to route a child's learning through this table or an
// adult's to their own account — and nothing ever inserted a row. The support console
// reads it and reports an empty section honestly, which was a true statement about a
// feature that did not exist.
//
// The second half of the gap mattered more than the first: no predicate read the
// table either, so even a row written by hand would not have granted anybody
// anything. What is pinned here is both ends — that a share can be granted and taken
// back by the person it belongs to, and that granting one actually changes what
// somebody else may see, until the moment it stops.

export async function run(ctx) {
  const {
    q, test, assert, rejects, committed,
    newUser, newProfile, grantRole, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('shares-admin@example.com');
  await newProfile(admin, 'Shares Admin');

  const governance = await newUser('shares-governance@example.com');
  await newProfile(governance, 'Shares Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  // Privileged, and outside every decision here.
  const support = await newUser('shares-support@example.com');
  await newProfile(support, 'Shares Support');
  await committed(() => grantRole(support, 'support_agent', admin));

  const learnerUser = await newUser('shares-learner@example.com');
  await newProfile(learnerUser, 'The Adult Learner');
  const friend = await newUser('shares-friend@example.com');
  await newProfile(friend, 'A Person Shared With');
  const sibling = await newUser('shares-sibling@example.com');
  await newProfile(sibling, 'Another Person');
  const stranger = await newUser('shares-stranger@example.com');
  await newProfile(stranger, 'Somebody With No Share');
  const cousin = await newUser('shares-cousin@example.com');
  await newProfile(cousin, 'A Cousin');
  const aunt = await newUser('shares-aunt@example.com');
  await newProfile(aunt, 'An Aunt');
  const uncle = await newUser('shares-uncle@example.com');
  await newProfile(uncle, 'An Uncle');

  /** Writes commit, so a later test can read what an earlier one decided. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q('select set_config(\'request.jwt.claims\',$1,true)', [
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

  const share = (actor, learnerId, grantee, scope, expiresAt = null) =>
    asActor(actor, 'select public.share_adult_learning($1,$2,$3,$4) as r',
      [learnerId, grantee, scope, expiresAt]).then((res) => res.rows[0].r);
  const revoke = (actor, shareId) =>
    asActor(actor, 'select public.revoke_adult_learning_share($1) as r', [shareId])
      .then((res) => res.rows[0].r);
  const myShares = (actor, learnerId) =>
    asActor(actor, 'select public.my_learning_shares($1) as r', [learnerId])
      .then((res) => res.rows[0].r);
  const overview = (actor, learnerId) =>
    asActor(actor, 'select public.shared_learning_overview($1) as r', [learnerId])
      .then((res) => res.rows[0].r);
  const mayRead = async (learnerId, kind, viewer) =>
    (await q('select public.may_read_shared_learning($1,$2,$3) as ok',
      [learnerId, kind, viewer])).rows[0].ok;

  const shareRow = async (id) =>
    (await q(`select status, scope, expires_at, revoked_at, grantee_user_id
                from public.adult_learning_shares where id = $1`, [id])).rows[0];
  const auditFor = async (action, targetId) =>
    (await q(`select actor, detail from public.governance_audit_events
               where action = $1 and target_id = $2 order by occurred_at`,
      [action, targetId])).rows;

  /**
   * A share granted two hours ago for one hour, so it has already lapsed. Written
   * directly because `share_adult_learning()` refuses to create one that has ended —
   * correctly, and that refusal is tested above — and because backdating `expires_at`
   * on a live row would break `als_expiry_in_future`, which compares the two columns
   * rather than the clock. This is how a lapsed share exists in the world: it was
   * granted in the past, and time moved.
   */
  const lapsedShare = (grantee, scope) => committed(() => q(
    `insert into public.adult_learning_shares
       (learner_profile_id, grantee_user_id, scope, status, granted_at, expires_at)
     values ($1,$2,$3,'active', now() - interval '2 hours', now() - interval '1 hour')
     returning id`, [learner, grantee, scope]).then((r) => r.rows[0].id));

  const setFlag = (on) => q(
    `update public.platform_settings set value_text = $1 where key = 'family.adult_shares'`,
    [on ? 'true' : 'false']);

  const learner = await committed(() => q(
    `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
     values ('The Adult Learner','adult','18+',$1) returning id`, [learnerUser])
    .then((r) => r.rows[0].id));

  // A child in a family, to prove this table stays what its name says.
  const family = await committed(() => q(
    `insert into public.families (name, created_by) values ('Shares Family',$1) returning id`,
    [learnerUser]).then((r) => r.rows[0].id));
  const child = await committed(() => q(
    `insert into public.learner_profiles (display_name, learner_type, age_band, family_id, status)
     values ('A Child','child','8-10',$1,'active') returning id`, [family]).then((r) => r.rows[0].id));

  const course = await newCourse(learnerUser, { title: 'Shares Course' });
  const version = await newVersion(course, learnerUser);
  const section = await newSection(version);
  const lessonOne = await newLesson(section, { title: 'First', position: 1 });
  await newLesson(section, { title: 'Second', position: 2 });

  // issue_certificate() reads the version's completion policy, and refuses a version
  // that does not issue certificates.
  await committed(() => q(
    `insert into public.course_completion_policies
       (course_version_id, completion_mode, certificate_enabled, certificate_template_version)
     values ($1,'all_lessons',true,'shares-v1')`, [version]));

  const enrolment = await committed(() => q(
    `insert into public.course_enrolments
       (learner_profile_id, course_id, course_version_id, source, status)
     values ($1,$2,$3,'free','active') returning id`, [learner, course, version])
    .then((r) => r.rows[0].id));

  await committed(() => q(
    `insert into public.lesson_progress
       (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
     values ($1,$2,'completed',100,now(),now())
     on conflict (course_enrolment_id, lesson_id) do update
       set status = 'completed', progress_percent = 100, completed_at = now()`,
    [enrolment, lessonOne]));

  try {
    // -------------------------------------------------------------------
    console.log('\nWhile the flag is off');

    await test('nothing can be shared until family.adult_shares is on', async () => {
      await rejects(() => share(learnerUser, learner, friend, 'progress'),
        /sharing an adult's learning is not enabled/);
      // Scoped to this learner: other suites write shares of their own to test what
      // reads them, and a whole-table count would make this test depend on the order
      // the suites run in.
      const count = (await q(
        `select count(*)::int n from public.adult_learning_shares
          where learner_profile_id = $1`, [learner])).rows[0].n;
      assert(count === 0, 'a share was written while the flag was off');
    });

    await setFlag(true);

    // -------------------------------------------------------------------
    console.log('\nGranting a share');

    const granted = await share(learnerUser, learner, friend, 'progress');

    await test('the adult shares their own progress, and the row says what it says', async () => {
      assert(granted.granted === true, 'the grant did not report itself');
      assert(granted.status === 'active', `a new share was ${granted.status}`);
      assert(/runs until you revoke it/.test(granted.note || ''),
        'an open-ended share did not say so');

      const row = await shareRow(granted.shareId);
      assert(row.status === 'active', 'the row was not active');
      assert(row.scope === 'progress', 'the scope was lost');
      assert(row.grantee_user_id === friend, 'the share named the wrong person');
      assert(row.expires_at === null, 'an open-ended share got an expiry');
      assert(row.revoked_at === null, 'a new share was already revoked');

      const audit = await auditFor('family.share_granted', granted.shareId);
      assert(audit.length === 1, 'granting a share was not audited');
      assert(audit[0].actor === learnerUser, 'the audit named the wrong person');
      assert(audit[0].detail.grantee_user_id === friend, 'the audit lost the grantee');
    });

    await test('nobody else may grant it, including the person it would benefit', async () => {
      await rejects(() => share(friend, learner, sibling, 'progress'),
        /only the learner whose progress this is may share it/);
      await rejects(() => share(stranger, learner, stranger, 'achievements'),
        /only the learner whose progress this is may share it/);
      await rejects(() => share(support, learner, support, 'progress'),
        /only the learner whose progress this is may share it/);
      await rejects(() => share(governance, learner, governance, 'progress'),
        /only the learner whose progress this is may share it/);
    });

    await test('a child’s learning cannot be routed through this table', async () => {
      // The trigger, not the function: als_validate refuses any learner who is not an
      // adult, so a guardian cannot use the adult path to hand a child's progress to
      // somebody. The function's own gate stops first here, because the caller is not
      // the child's linked account — which is the same answer by a shorter route.
      await rejects(() => share(learnerUser, child, friend, 'progress'),
        /only the learner whose progress this is may share it/);
      await rejects(() => committed(() => q(
        `insert into public.adult_learning_shares (learner_profile_id, grantee_user_id, scope)
         values ($1,$2,'progress')`, [child, friend])),
        /applies only to adult learners/);
    });

    await test('the terms are checked before anything is written', async () => {
      await rejects(() => share(learnerUser, learner, friend, 'everything'),
        /a share covers progress, achievements or both/);
      await rejects(() => share(learnerUser, learner, null, 'progress'),
        /say whose account should see it/);
      await rejects(() => share(learnerUser, learner, learnerUser, 'progress'),
        /your own account can already see your learning/);
      await rejects(() => share(learnerUser, learner, crypto.randomUUID(), 'progress'),
        /no account/);
      await rejects(() => share(learnerUser, learner, sibling, 'progress', '2020-01-01T00:00:00Z'),
        /a share that has already ended is not a share/);
    });

    await test('one active share per person per scope, and the second scope is its own row', async () => {
      const again = await share(learnerUser, learner, friend, 'progress');
      assert(again.granted === false, 'a second grant claimed to be new');
      assert(again.shareId === granted.shareId, 'a second row was made for the same terms');
      assert(/revoke it first/.test(again.note || ''), 'the answer did not say how to change the terms');

      const both = await share(learnerUser, learner, friend, 'progress_and_achievements');
      assert(both.granted === true, 'a wider scope was refused as a duplicate');
      assert(both.shareId !== granted.shareId, 'a wider scope overwrote the narrower one');

      const count = (await q(
        `select count(*)::int n from public.adult_learning_shares
          where learner_profile_id = $1 and grantee_user_id = $2 and status = 'active'`,
        [learner, friend])).rows[0].n;
      assert(count === 2, 'the two scopes did not leave two active rows');
    });

    // -------------------------------------------------------------------
    console.log('\nWhat a share is worth');

    await test('the person shared with may read what the scope covers, and nothing more', async () => {
      assert(await mayRead(learner, 'progress', friend) === true,
        'a progress share did not grant progress');
      assert(await mayRead(learner, 'achievements', friend) === true,
        'the wider share did not grant achievements');
      assert(await mayRead(learner, 'progress', stranger) === false,
        'somebody with no share could read progress');
      assert(await mayRead(learner, 'progress', learnerUser) === false,
        'the predicate answered for the learner themself, which is a different question');
      assert(await mayRead(learner, 'notes', friend) === false,
        'an unknown kind was treated as covered');
      assert(await mayRead(child, 'progress', friend) === false,
        'a child profile answered through the adult predicate');
    });

    const seen = await overview(friend, learner);

    await test('the overview shows the progress, the terms, and no more than the scope', async () => {
      assert(seen.seesProgress === true, 'progress was not reported as shared');
      assert(seen.learner.displayName === 'The Adult Learner', 'the learner was not named');
      assert(seen.progress.total === 1, `one enrolment reported as ${seen.progress.total}`);
      const row = seen.progress.rows[0];
      assert(row.courseTitle === 'Shares Course', 'the course was not named');
      assert(row.lessonsCompleted === 1, 'the completed lesson was not counted');
      assert(row.lessonsTotal === 2, 'the version was not counted');
      assert(row.status === 'active', 'the enrolment status was lost');

      // The narrower share is still there, and the wider one is what grants
      // achievements; both are listed so the reader can see the terms they read under.
      assert(seen.shares.length === 2, 'the terms were not shown');
      assert(seen.shares.every((s) => s.expiresAt === null), 'an expiry was invented');
    });

    await test('somebody with no share is refused the whole document', async () => {
      await rejects(() => overview(stranger, learner),
        /this person has not shared their learning with you/);
      await rejects(() => overview(learnerUser, learner),
        /this person has not shared their learning with you/);
      await rejects(() => overview(support, learner),
        /this person has not shared their learning with you/);
    });

    await test('achievements come with a certificate when the scope covers them', async () => {
      await committed(() => q(
        `insert into public.lesson_progress
           (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
         select $1, l.id, 'completed', 100, now(), now()
           from public.lessons l
           join public.course_sections cs on cs.id = l.section_id
          where cs.course_version_id = $2
         on conflict (course_enrolment_id, lesson_id) do update
           set status = 'completed', progress_percent = 100, completed_at = now()`,
        [enrolment, version]));
      const certificate = (await q(
        'select id from public.issue_certificate($1,$2)', [enrolment, admin])).rows[0].id;

      const awarded = await overview(friend, learner);
      assert(awarded.seesAchievements === true, 'achievements were not reported as shared');
      assert(awarded.achievements.total === 1, 'the certificate was not counted');
      const row = awarded.achievements.rows[0];
      assert(row.certificateId === certificate, 'the certificate was not the one issued');
      assert(typeof row.certificateNumber === 'string' && row.certificateNumber.length > 0,
        'the certificate lost its number');
      assert(row.courseTitle === 'Shares Course', 'the certificate lost its course');

      // The narrow share alone does not carry achievements: revoke the wider one and
      // the same reader stops seeing them while still seeing the progress.
      const wider = (await q(
        `select id from public.adult_learning_shares
          where learner_profile_id = $1 and grantee_user_id = $2
            and scope = 'progress_and_achievements' and status = 'active'`,
        [learner, friend])).rows[0].id;
      await revoke(learnerUser, wider);

      const after = await overview(friend, learner);
      assert(after.seesProgress === true, 'progress was lost with the wider share');
      assert(after.seesAchievements === false, 'achievements outlived the share that granted them');
      assert(after.achievements.total === 0, 'a section that is not shared reported rows');
    });

    // -------------------------------------------------------------------
    console.log('\nTaking it back');

    await test('revocation ends the access at once, and keeps the record', async () => {
      // The wider share was revoked in the achievements test, so this narrow one is the
      // last thing granting this reader anything: revoking it has to end the access
      // outright, which is the only way to prove the revocation did the work.
      const revoked = await revoke(learnerUser, granted.shareId);
      assert(revoked.changed === true, 'the revocation did not report itself');
      assert(revoked.status === 'revoked', `the share was left ${revoked.status}`);

      const row = await shareRow(granted.shareId);
      assert(row.status === 'revoked', 'the row was not revoked');
      assert(row.revoked_at !== null, 'als_terminal_state_timestamp was not satisfied');

      assert(await mayRead(learner, 'progress', friend) === false,
        'a revoked share still granted progress');
      await rejects(() => overview(friend, learner),
        /has not shared their learning with you/);

      const audit = await auditFor('family.share_revoked', granted.shareId);
      assert(audit.length === 1, 'a revocation was not audited');
      assert(audit[0].detail.revoked_by_owner === true, 'the audit did not say who ended it');

      const again = await revoke(learnerUser, granted.shareId);
      assert(again.changed === false, 'revoking twice claimed a change');
      assert(/already revoked/.test(again.note || ''), 'revoking twice did not say why');
    });

    await test('the person shared with may not end it, and neither may a support agent', async () => {
      // Granted fresh, because the test above revoked everything this reader held:
      // revoking a revoked share proves nothing about who may revoke a live one.
      const live = await share(learnerUser, learner, friend, 'progress');
      assert(live.granted === true, 'a share could not be granted again after a revocation');

      await rejects(() => revoke(friend, live.shareId),
        /only the person who granted this share, or governance staff/);
      await rejects(() => revoke(stranger, live.shareId),
        /only the person who granted this share, or governance staff/);
      await rejects(() => revoke(support, live.shareId),
        /only the person who granted this share, or governance staff/);
      await rejects(() => revoke(learnerUser, crypto.randomUUID()), /no share/);

      const row = await shareRow(live.shareId);
      assert(row.status === 'active', 'a refused revocation ended the share anyway');
    });

    await test('governance staff may end one, and the audit says it was not the owner', async () => {
      const live = await share(learnerUser, learner, sibling, 'achievements');
      const revoked = await revoke(governance, live.shareId);
      assert(revoked.changed === true, 'governance staff could not revoke');
      const audit = await auditFor('family.share_revoked', live.shareId);
      assert(audit[0].detail.revoked_by_owner === false,
        'a staff revocation was recorded as the owner\'s');
      assert(await mayRead(learner, 'achievements', sibling) === false,
        'a share governance ended still granted');
    });

    // -------------------------------------------------------------------
    console.log('\nWhen a share runs out');

    await test('a share with an expiry grants inside its window', async () => {
      const expiring = await share(learnerUser, learner, sibling, 'progress',
        new Date(Date.now() + 3600_000).toISOString());
      assert(await mayRead(learner, 'progress', sibling) === true,
        'a share inside its window did not grant');
      const row = await shareRow(expiring.shareId);
      assert(row.expires_at !== null, 'the expiry was dropped');
    });

    await test('a lapsed share grants nothing, whatever its status column says', async () => {
      const lapsedId = await lapsedShare(cousin, 'progress');
      const row = await shareRow(lapsedId);
      assert(row.status === 'active', 'the fixture did not leave the row active');

      assert(await mayRead(learner, 'progress', cousin) === false,
        'a lapsed share still granted access');
      await rejects(() => overview(cousin, learner),
        /has not shared their learning with you/);
    });

    await test('looking at it corrects the row, and says so in the audit', async () => {
      const lapsedId = await lapsedShare(aunt, 'achievements');

      const mine = await myShares(learnerUser, learner);
      const shown = mine.shares.find((s) => s.shareId === lapsedId);
      assert(shown.status === 'expired', 'the learner was shown a share that had ended');

      const after = await shareRow(lapsedId);
      assert(after.status === 'expired', 'the row was left claiming an access that had ended');
      assert(after.revoked_at === null, 'an expiry was recorded as a revocation');

      const audit = await auditFor('family.share_expired', lapsedId);
      assert(audit.length === 1, 'the correction was not audited');
      assert(audit[0].detail.expires_at !== null, 'the audit lost the expiry');

      // Corrected once, and not again: a second look writes nothing new.
      await myShares(learnerUser, learner);
      assert((await auditFor('family.share_expired', lapsedId)).length === 1,
        'the same lapse was audited twice');
    });

    await test('a revocation is not overwritten by an expiry', async () => {
      const lapsedId = await lapsedShare(uncle, 'progress');
      await revoke(learnerUser, lapsedId);
      await myShares(learnerUser, learner);

      const row = await shareRow(lapsedId);
      assert(row.status === 'revoked', 'a revoked share was rewritten as expired');
      assert(row.revoked_at !== null, 'the revocation lost its timestamp');
      assert((await auditFor('family.share_expired', lapsedId)).length === 0,
        'a revocation was reported as an expiry');
    });

    // -------------------------------------------------------------------
    console.log('\nWho may list the shares');

    await test('only the learner lists who can see their learning', async () => {
      const mine = await myShares(learnerUser, learner);
      assert(Array.isArray(mine.shares), 'the list was not returned');
      assert(mine.shares.length >= 6, 'the history of shares was dropped');
      assert(mine.shares.every((s) => typeof s.granteeName === 'string'),
        'a grantee was shown without a name');

      await rejects(() => myShares(friend, learner),
        /only the learner whose progress this is may list/);
      await rejects(() => myShares(stranger, learner),
        /only the learner whose progress this is may list/);
    });

    await test('nobody can ask whether an address has an account', async () => {
      // This function used to answer, and the answer was the disclosure: sharing is
      // now by invitation, which is created whether or not the address is registered,
      // so there is nothing left to ask — and nothing left that may answer.
      for (const email of ['shares-friend@example.com', 'nobody-here@example.com']) {
        await rejects(
          () => asActor(learnerUser, 'select public.resolve_share_grantee($1) as r', [email]),
          /permission denied/i,
        );
      }
    });

    await test('every function here is granted to authenticated and to nobody else', async () => {
      const rows = (await q(
        `select p.proname,
                bool_or(has_function_privilege('anon'::name, p.oid, 'execute'::text)) as anon_may,
                bool_or(has_function_privilege('authenticated'::name, p.oid, 'execute'::text)) as auth_may
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('share_adult_learning', 'revoke_adult_learning_share',
                              'my_learning_shares', 'shared_learning_overview',
                              'may_read_shared_learning')
          group by p.proname`)).rows;
      assert(rows.length === 5, `expected five functions, found ${rows.length}`);
      for (const row of rows) {
        assert(row.anon_may === false, `${row.proname} is callable anonymously`);
        assert(row.auth_may === true, `${row.proname} is not callable by a signed-in user`);
      }

      // The one that used to answer "does this address have an account" is callable by
      // neither seat: an invitation is the only way to learn anything about an address.
      const resolve = (await q(
        `select bool_or(has_function_privilege('anon'::name, p.oid, 'execute'::text)) as anon_may,
                bool_or(has_function_privilege('authenticated'::name, p.oid, 'execute'::text)) as auth_may
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'resolve_share_grantee'`)).rows[0];
      assert(resolve.anon_may === false, 'resolve_share_grantee is callable anonymously');
      assert(resolve.auth_may === false, 'resolve_share_grantee still answers signed-in callers');
    });
  } finally {
    await setFlag(false);
  }
}
