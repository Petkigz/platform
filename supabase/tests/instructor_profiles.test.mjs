// Public instructor profiles are explicitly separate from confidential
// reviewer qualifications. Only self-authored text, owned social links and
// published courses belong on the public surface.
export async function run(ctx) {
  const { q, count, test, assert, rejects, asAnon, bootstrapAdmin,
    newInstructor, newUser, newProfile } = ctx;
  const admin = await bootstrapAdmin('instructor-profile-admin@example.com');
  const teacher = await newInstructor('profile-teacher@example.com', admin);
  const ordinary = await newUser('profile-ordinary@example.com');
  await newProfile(ordinary, 'Ordinary learner');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const result = await q(sql, params); await q('commit'); return result; }
    catch (error) { await q('rollback'); throw error; }
  }

  const save = (actor, slug, displayName, publish = false, extra = {}) => asActor(actor,
    `select public.save_instructor_public_profile($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) id`,
    [slug, displayName, extra.headline ?? 'Islamic educator', extra.biography ?? 'Teaching with care.',
      extra.website ?? null, extra.instagram ?? null, extra.youtube ?? null, extra.tiktok ?? null,
      extra.facebook ?? null, publish]);

  await test('only an active instructor can create a public profile', async () => {
    const profile = (await save(teacher, 'teacher-amina', 'Amina Yusuf')).rows[0].id;
    assert(profile, 'profile id was not returned');
    await rejects(() => save(ordinary, 'ordinary-user', 'Ordinary User'), /active instructor role is required/i);
  });

  await test('profile fields are normalized and changes are audited', async () => {
    const first = (await save(teacher, 'teacher-amina', ' Amina Yusuf ', false, {
      headline: '  Qur’an and Arabic teacher  ',
      biography: '  Helping learners grow.  ',
      website: ' https://amina.example ',
      instagram: 'https://www.instagram.com/amina',
      youtube: 'https://youtu.be/channel',
    })).rows[0].id;
    const row = (await q(`select user_id,slug,display_name,headline,biography,website_url,instagram_url,youtube_url,status
      from public.instructor_public_profiles where id=$1`, [first])).rows[0];
    assert(row.user_id === teacher && row.slug === 'teacher-amina' && row.display_name === 'Amina Yusuf');
    assert(row.headline === 'Qur’an and Arabic teacher' && row.biography === 'Helping learners grow.');
    assert(row.website_url === 'https://amina.example' && row.instagram_url === 'https://www.instagram.com/amina');
    assert(row.youtube_url === 'https://youtu.be/channel' && row.status === 'draft');
    const events = (await q(`select count(*)::int n from public.governance_audit_events
      where action='instructor_profile.saved' and target_id=$1`, [first])).rows[0].n;
    assert(events === 2, 'both the initial save and subsequent edit must be audited');
  });

  await test('profile slug, name, lengths and secure social links are enforced', async () => {
    await rejects(() => save(teacher, 'Bad Slug', 'Name'), /lowercase hyphenated/i);
    await rejects(() => save(teacher, 'teacher-empty', '  '), /display name/i);
    await rejects(() => save(teacher, 'teacher-long', 'x'.repeat(121)), /display name/i);
    await rejects(() => save(teacher, 'teacher-http', 'Name', false, { website: 'http://unsafe.example' }), /HTTPS/i);
    await rejects(() => save(teacher, 'teacher-fake-social', 'Name', false, { instagram: 'https://instagram.com.evil.example/fake' }), /ipp_instagram_host/i);
  });

  await test('profile updates keep one row, and duplicate public slugs are rejected', async () => {
    const first = (await save(teacher, 'teacher-amina', 'Amina Yusuf')).rows[0].id;
    const updated = (await save(teacher, 'amina-yusuf', 'Amina Yusuf', true)).rows[0].id;
    assert(first === updated, 'saving should update the existing profile');
    const countRows = (await q('select count(*)::int n from public.instructor_public_profiles where user_id=$1', [teacher])).rows[0].n;
    assert(countRows === 1);
    const secondTeacher = await newInstructor('profile-teacher2@example.com', admin);
    await rejects(() => save(secondTeacher, 'amina-yusuf', 'Another Teacher'), /unique constraint/i);
  });

  await test('RLS keeps drafts private and the runtime flag controls published visibility', async () => {
    await q("update public.platform_settings set value_text='false' where key='teaching.public_profile'");
    const draftId = (await save(teacher, 'teacher-private', 'Private Teacher')).rows[0].id;
    assert(await asAnon(() => count('select count(*)::int n from public.instructor_public_profiles where id=$1', [draftId])) === 0);
    assert(await count('select count(*)::int n from public.instructor_public_profiles where id=$1', [draftId]) === 1);

    const publishedId = (await save(teacher, 'teacher-public', 'Public Teacher', true)).rows[0].id;
    assert(await asAnon(() => count('select count(*)::int n from public.instructor_public_profiles where id=$1', [publishedId])) === 0,
      'a published profile leaked while the feature flag was off');
    await q("update public.platform_settings set value_text='true' where key='teaching.public_profile'");
    assert(await asAnon(() => count('select count(*)::int n from public.instructor_public_profiles where id=$1', [publishedId])) === 1,
      'public profile did not appear after enabling the flag');
    await asActor(admin, "select public.revoke_role($1,'instructor','profile access revoked for test')", [teacher]);
    assert(await asAnon(() => count('select count(*)::int n from public.instructor_public_profiles where id=$1', [publishedId])) === 0,
      'a revoked instructor profile stayed public');
    await asActor(admin, "select public.assign_role($1,'instructor','restore test profile access')", [teacher]);
    await q("update public.platform_settings set value_text='false' where key='teaching.public_profile'");
  });

  await test('the public profile table has no direct client write grants', async () => {
    await rejects(() => asActor(teacher,
      `insert into public.instructor_public_profiles(user_id,slug,display_name)
       values($1,'forged-profile','Forged')`, [teacher]), /permission denied/i);
  });
}
