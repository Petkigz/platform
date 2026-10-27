// An institution has a home.
//
// Four flags shipped as CODE because branding, reporting, an API and SSO each
// needed something that did not exist. Three of the four now do — a name and a
// tone, a count that names nobody, and a key whose secret never reaches the
// database. SSO stays CODE, and the last test in this file holds that line:
// domain identity is real, a provider is not.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor,
    newCourse, newVersion,
  } = ctx;

  const admin = await bootstrapAdmin('inst-admin@example.com');

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

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;

  const flag = (key, on) =>
    q(`update public.platform_settings set value_text = $2 where key = $1`,
      [key, on ? 'true' : 'false']);

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  for (const key of ['institution.branding', 'institution.reporting', 'institution.api', 'institution.sso']) {
    await flag(key, true);
  }

  // One institution, created properly, its first administrator named by the owner.
  const head = await account('inst-head@example.com', 'Head Teacher');
  let institutionId;

  await test('the owner creates an institution and names its first administrator', async () => {
    const made = await call(admin, 'create_institution($1,$2,$3,$4,$5)',
      ['Alnoor-Madrasah', 'Alnoor Madrasah', 'madrasah', head, 'Opened with the head teacher.']);
    institutionId = made.institutionId;
    assert(institutionId, 'no institution id came back');

    const row = await scalar('select code, name, institution_type from public.institutions where id = $1',
      [institutionId]);
    eq(row.code, 'alnoor-madrasah', 'the code is stored lower case');
    eq(row.institution_type, 'madrasah', 'its type');

    const member = await scalar(
      `select role, status from public.institution_memberships where institution_id = $1 and user_id = $2`,
      [institutionId, head]);
    eq(member.role, 'admin', 'the first administrator');
    eq(member.status, 'active', 'their membership');

    await rejects(
      () => call(admin, 'create_institution($1,$2,$3,$4,$5)',
        ['another', 'Another', 'school', head, '  ']),
      /reason_required/);
    await rejects(
      () => call(head, 'create_institution($1,$2,$3,$4,$5)',
        ['third', 'Third', 'school', head, 'I would like one.']),
      /not_allowed/);
  });

  await test('the owner finds the head teacher by address, and nobody else can', async () => {
    const found = await call(admin, 'institution_admin_candidate($1)', ['inst-head@example.com']);
    eq(found.userId, head, 'the account found');

    await rejects(
      () => call(admin, 'institution_admin_candidate($1)', ['no-such-person-anywhere@example.com']),
      /admin_not_found/);
    await rejects(
      () => call(head, 'institution_admin_candidate($1)', ['inst-head@example.com']),
      /not_allowed/);
  });

  await test('the default institution is not one of anybody’s', async () => {
    const list = await call(admin, 'institution_directory()');
    assert(Array.isArray(list.institutions));
    assert(!list.institutions.some((i) => i.code === 'default'),
      'the tenancy root is listed as if it were a school');
    const mine = list.institutions.find((i) => i.id === institutionId);
    assert(mine, 'the new institution is missing');
    eq(mine.admins, 1, 'its administrator count');
    eq(mine.members, 1, 'its member count');
  });

  await test('an administrator may brand it; a member may not; the palette is ours', async () => {
    const member = await account('inst-member@example.com', 'Member One');
    await q(`insert into public.institution_memberships (institution_id, user_id, role)
             values ($1,$2,'member')`, [institutionId, member]);

    await call(head, 'update_institution_branding($1,$2,$3,$4)',
      ['Alnoor', 'Quran and Arabic, every evening', 'olive', 'https://alnoor.example/logo.png']);

    const brand = await scalar('select * from public.institution_branding where institution_id = $1',
      [institutionId]);
    eq(brand.accent, 'olive', 'the tone');
    eq(brand.logo_url, 'https://alnoor.example/logo.png', 'the logo');

    await rejects(
      () => call(member, 'update_institution_branding($1,$2,$3,$4)',
        ['Hijack', null, null, null]),
      /not_an_admin/);

    await rejects(
      () => call(head, 'update_institution_branding($1,$2,$3,$4)',
        ['Alnoor', null, 'magenta', null]),
      /check constraint/);

    await rejects(
      () => call(head, 'update_institution_branding($1,$2,$3,$4)',
        ['Alnoor', null, null, 'http://insecure.example/logo.png']),
      /check constraint/);

    await flag('institution.branding', false);
    try {
      await rejects(
        () => call(head, 'update_institution_branding($1,$2,$3,$4)', ['Alnoor', null, null, null]),
        /branding_closed/);
    } finally {
      await flag('institution.branding', true);
    }
  });

  await test('a domain is a claim until a person has checked it', async () => {
    const claim = await call(head, 'claim_institution_domain($1)', ['https://Alnoor.Example/arabic']);
    eq(claim.domain, 'alnoor.example', 'the domain is normalised');
    assert(/^ayahspring-site-verification=[a-f0-9]{32}$/.test(claim.claimToken),
      'the claim token is not the shape a DNS record needs');
    eq(claim.status, 'claimed', 'a new claim is not verified');

    await rejects(
      () => call(head, 'claim_institution_domain($1)', ['alnoor.example']),
      /duplicate key|unique/i);

    const member = await scalar(
      `select user_id from public.institution_memberships
        where institution_id = $1 and role = 'member'`, [institutionId]);
    await rejects(
      () => call(member.user_id, 'claim_institution_domain($1)', ['other.example']),
      /not_an_admin/);

    // Until somebody checks, the address grants nothing — even to the head.
    const notYet = await account('pending@alnoor.example', 'Pending Person');
    eq(await call(notYet, 'institution_joinable_domain()'), null,
      'an unverified claim let somebody in');

    await rejects(
      () => call(head, 'verify_institution_domain($1,$2,$3)', [claim.id, true, 'looked']),
      /not_allowed/);

    await rejects(
      () => call(admin, 'verify_institution_domain($1,$2,$3)', [claim.id, true, ' ']),
      /reason_required/);

    const out = await call(admin, 'verify_institution_domain($1,$2,$3)',
      [claim.id, true, 'TXT record present, matches the token.']);
    eq(out.status, 'verified', 'the verification');
  });

  await test('an account at a verified domain may join, and nobody else may', async () => {
    const inside = await account('amina@alnoor.example', 'Amina');
    const outside = await account('amina@elsewhere.example', 'Amina Elsewhere');

    await rejects(() => call(outside, 'join_institution()'), /no_verified_domain/);

    const joined = await call(inside, 'join_institution()');
    eq(joined.institutionId, institutionId, 'which institution');
    eq(joined.role, 'member', 'a new member is not an administrator');

    // Joining is how they got in; nothing about their address is stored on the
    // membership, so a later change of address does not silently re-home them.
    const membership = await scalar(
      `select role, status from public.institution_memberships where user_id = $1`, [inside]);
    eq(membership.role, 'member', 'their role');

    await rejects(() => call(inside, 'join_institution()'), /already_joined/);
  });

  await test('a person who is not a member is told, and told whether they could join', async () => {
    const inside = await account('yusuf@alnoor.example', 'Yusuf');
    const board = await call(inside, 'my_institution()');
    eq(board.joined, false, 'signed in, not a member');
    eq(board.joinable, true, 'their address is at a verified domain');
    eq(board.flags.branding, true, 'the flags are read for the page');

    const outside = await account('yusuf@nowhere.example', 'Yusuf Outside');
    const other = await call(outside, 'my_institution()');
    eq(other.joinable, false, 'an address nobody has verified');
  });

  await test('the report counts people and names nobody', async () => {
    const inside = await scalar(
      `select user_id from public.institution_memberships
        where institution_id = $1 and user_id = (select user_id from public.user_profiles
                                                  where display_name = 'Amina')`,
      [institutionId]);

    const learner = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Amina Learner', 'adult', '18+', $1) returning id`, [inside.user_id])).rows[0].id;

    const teacher = await newInstructor('inst-report-teacher@example.com', admin);
    const course = await newCourse(teacher, { title: 'Arabic letters', status: 'active' });
    const version = await newVersion(course, teacher);

    const enrolment = (await q(
      `insert into public.course_enrolments (learner_profile_id, course_id, course_version_id, source)
       values ($1,$2,$3,'free') returning id`, [learner, course, version])).rows[0].id;
    await q(`update public.course_enrolments
                set status = 'completed', completed_at = now()
              where id = $1`, [enrolment]);

    const report = await call(inside.user_id, 'institution_report($1,$2)',
      ['2025-01-01', '2026-12-31']);
    eq(report.totals.members, 3, 'members counted');
    assert(report.totals.learners >= 1, 'the member’s own learner profile is not counted');
    assert(report.totals.enrolments >= 1, 'the enrolment is not counted');
    assert(report.totals.completions >= 1, 'the completion is not counted');
    eq(report.totals.certificates, 0, 'certificates issued');

    const rows = report.courses.find((c) => c.course === 'Arabic letters');
    assert(rows, 'the course is missing from the report');
    eq(rows.learnerProfiles, 1, 'learners on the course');

    // The whole payload is checked, not one field: no name, no address, no id.
    const json = JSON.stringify(report);
    for (const forbidden of ['Amina Learner', 'amina@', inside.user_id, learner]) {
      assert(!json.includes(String(forbidden)), `the report leaked ${forbidden}`);
    }
    for (const row of report.courses) {
      assert(Object.keys(row).sort().join(',') === 'completions,course,enrolments,learnerProfiles',
        `unexpected fields on a course row: ${Object.keys(row).join(',')}`);
    }
  });

  await test('a learner belonging to somebody outside is not counted', async () => {
    const outsider = await account('stranger-report@example.com', 'Stranger');
    const learner = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Stranger Learner', 'adult', '18+', $1) returning id`, [outsider])).rows[0].id;
    const teacher = await newInstructor('inst-report-teacher2@example.com', admin);
    const course = await newCourse(teacher, { title: 'Fiqh basics', status: 'active' });
    const version = await newVersion(course, teacher);
    await q(
      `insert into public.course_enrolments (learner_profile_id, course_id, course_version_id, source)
       values ($1,$2,$3,'free')`, [learner, course, version]);

    const mine = await call(head, 'institution_report($1,$2)', ['2025-01-01', '2026-12-31']);
    assert(!mine.courses.some((c) => c.course === 'Fiqh basics'),
      'an outsider’s enrolment appeared in the institution report');
  });

  await test('an api key is stored as a hash, works once issued, and stops when revoked', async () => {
    const prefix = 'a1b2c3d4e5f6';
    const hash = 'f'.repeat(64);

    await call(head, 'create_institution_api_key($1,$2,$3)', ['Nightly export', prefix, hash]);

    const stored = await scalar(
      'select prefix, secret_hash from public.institution_api_keys where prefix = $1', [prefix]);
    eq(stored.secret_hash, hash, 'the hash is stored');
    assert(!JSON.stringify(stored).includes('the-secret'), 'a plaintext secret is stored');

    const exportReport = await q(
      'select public.institution_api_report($1,$2,$3,$4) as r',
      [prefix, hash, '2025-01-01', '2026-12-31']);
    eq(exportReport.rows[0].r.totals.members, 3, 'the key reads the same report');

    const used = await scalar(
      'select last_used_at from public.institution_api_keys where prefix = $1', [prefix]);
    assert(used.last_used_at, 'the key does not record when it was used');

    await rejects(
      () => q('select public.institution_api_report($1,$2,$3,$4)',
        [prefix, 'e'.repeat(64), '2025-01-01', '2026-12-31']),
      /bad_key/);

    const keyId = (await scalar('select id from public.institution_api_keys where prefix = $1',
      [prefix])).id;
    await rejects(
      () => call(head, 'revoke_institution_api_key($1,$2)', [keyId, '']),
      /reason_required/);
    await call(head, 'revoke_institution_api_key($1,$2)', [keyId, 'Laptop lost.']);

    await rejects(
      () => q('select public.institution_api_report($1,$2,$3,$4)',
        [prefix, hash, '2025-01-01', '2026-12-31']),
      /bad_key/);
  });

  await test('a key has a ceiling, and a bad key cannot spend it', async () => {
    const prefix = '0a1b2c3d4e5f';
    const hash = 'a'.repeat(64);
    await call(head, 'create_institution_api_key($1,$2,$3)', ['Scraper', prefix, hash]);

    for (let i = 0; i < 240; i += 1) {
      await q('select public.institution_api_report($1,$2,$3,$4)',
        [prefix, hash, '2025-01-01', '2026-12-31']);
    }
    await rejects(
      () => q('select public.institution_api_report($1,$2,$3,$4)',
        [prefix, hash, '2025-01-01', '2026-12-31']),
      /rate_limited/);

    const calls = await scalar(
      'select calls from public.institution_api_usage u join public.institution_api_keys k on k.id = u.api_key_id where k.prefix = $1',
      [prefix]);
    // The refusal rolls back its own increment, so a key that is over its
    // ceiling does not keep charging itself for calls it never served.
    eq(calls.calls, 240, 'the counter after the refused call');
  });

  await test('an administrator can be replaced, and the last one cannot walk out', async () => {
    const member = await scalar(
      `select user_id from public.institution_memberships
        where institution_id = $1 and role = 'member' limit 1`, [institutionId]);

    await rejects(
      () => call(admin, 'set_institution_admin($1,$2,$3,$4)', [institutionId, member.user_id, true, '']),
      /reason_required/);

    // Up, down, up again: the appointment is not one-way, and the last
    // administrator is the only thing it protects.
    await call(admin, 'set_institution_admin($1,$2,$3,$4)',
      [institutionId, member.user_id, true, 'Taking over the timetable.']);
    await call(admin, 'set_institution_admin($1,$2,$3,$4)',
      [institutionId, head, false, 'Handing over.']);
    await call(admin, 'set_institution_admin($1,$2,$3,$4)',
      [institutionId, head, true, 'Back, with the new timetable.']);
    await call(admin, 'set_institution_admin($1,$2,$3,$4)',
      [institutionId, member.user_id, false, 'Timetable settled.']);

    await rejects(() => call(admin, 'leave_institution()'), /not_a_member/);
    await call(member.user_id, 'leave_institution()');
    const left = await scalar(
      `select status, left_at from public.institution_memberships where user_id = $1`, [member.user_id]);
    eq(left.status, 'left', 'leaving records a state, not a deletion');
    assert(left.left_at, 'the time they left is missing');

    // The only remaining administrator cannot leave without a replacement.
    await rejects(() => call(head, 'leave_institution()'), /last_admin/);
  });

  await test('the switches are the owner’s, and one of them still says what is missing', async () => {
    const rows = (await q(
      `select key, gate_type, preconditions from public.platform_settings
        where key like 'institution.%' order by key`)).rows;

    eq(rows.length, 4, 'institution flags');
    for (const row of rows) {
      eq(row.gate_type, 'admin', `${row.key} gate`);
    }

    const sso = rows.find((r) => r.key === 'institution.sso');
    assert(/SAML|OIDC/.test(sso.preconditions),
      'the SSO precondition does not name the provider it is missing');
    assert(/no single-sign-on login button/i.test(sso.preconditions),
      'the SSO precondition does not say there is no login button');
  });
}
