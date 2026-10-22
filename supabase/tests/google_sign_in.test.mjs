// Signing in with Google.
//
// Supabase Auth runs the flow. What this platform owes it is a flag so a button
// that cannot work is never shown, a display name that is a person's name
// rather than an email address, and an honest answer to "how do I sign in
// here" — so somebody who arrived through Google is not handed a password form
// that will not work.

export async function run(ctx) {
  const {
    q, test, assert, rejects, newUser, newProfile, bootstrapAdmin,
  } = ctx;

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
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

  /** An auth.users row shaped the way an OAuth callback leaves it. */
  async function oauthUser(email, metadata) {
    const id = crypto.randomUUID();
    await q('insert into auth.users (id, email, raw_user_meta_data) values ($1,$2,$3)',
      [id, email, JSON.stringify(metadata)]);
    return id;
  }

  const nameOf = async (id) =>
    (await scalar('select display_name from public.user_profiles where user_id = $1', [id])).display_name;

  async function identity(userId, provider) {
    await q('insert into auth.identities (user_id, provider) values ($1,$2)', [userId, provider]);
  }

  await test('the flag ships off, so no button appears before the provider exists', async () => {
    const row = await scalar(
      `select value_text, gate_type from public.platform_settings where key = 'auth.google_sign_in'`);
    assert(row, 'the flag is missing');
    assert(row.value_text === 'false', `the flag ships ${row.value_text}`);
    assert(row.gate_type === 'admin_setup',
      `gate type was ${row.gate_type}; this needs configuring, not a deploy`);
  });

  // -------------------------------------------------------------------------
  console.log('\nA name somebody would recognise');
  // -------------------------------------------------------------------------

  await test('a password sign-up still gets the local part of its email', async () => {
    const id = await newUser('regression@example.com');
    assert(await nameOf(id) === 'regression', `got ${await nameOf(id)}`);
  });

  await test('a Google sign-up uses the name Google supplied', async () => {
    const id = await oauthUser('aisha@example.com', { full_name: '  Aisha Nakato  ' });
    assert(await nameOf(id) === 'Aisha Nakato', `got ${JSON.stringify(await nameOf(id))}`);
  });

  await test('the shorter claim is used when the full one is absent', async () => {
    const id = await oauthUser('yusuf@example.com', { name: 'Yusuf Ali' });
    assert(await nameOf(id) === 'Yusuf Ali', `got ${await nameOf(id)}`);
  });

  await test('a blank claim falls back to the address rather than writing whitespace', async () => {
    const id = await oauthUser('blank@example.com', { full_name: '   ' });
    assert(await nameOf(id) === 'blank', `got ${JSON.stringify(await nameOf(id))}`);
  });

  await test('a hostile claim cannot write a kilobyte into every greeting', async () => {
    const id = await oauthUser('long@example.com', { full_name: 'A'.repeat(500) });
    const name = await nameOf(id);
    assert(name.length === 80, `stored ${name.length} characters`);
  });

  // -------------------------------------------------------------------------
  console.log('\nHow do I sign in here');
  // -------------------------------------------------------------------------

  await test('a password account is told it has a password', async () => {
    const id = await newUser('password@example.com');
    await identity(id, 'email');
    const methods = (await asActor(id, 'select public.my_sign_in_methods() m')).rows[0].m;
    assert(methods.hasPassword === true);
    assert(methods.providers.includes('email'));
    assert(/password/i.test(methods.summary), `summary was ${methods.summary}`);
  });

  await test('a Google account is told it has none, and is not sent to a password form', async () => {
    const id = await oauthUser('onlygoogle@example.com', { full_name: 'Google Only' });
    await identity(id, 'google');
    const methods = (await asActor(id, 'select public.my_sign_in_methods() m')).rows[0].m;
    assert(methods.hasPassword === false, 'a Google account claims to have a password');
    assert(methods.providers.includes('google'));
    assert(/with Google/i.test(methods.summary), `summary was ${methods.summary}`);
    assert(/no password/i.test(methods.summary), `summary was ${methods.summary}`);
  });

  await test('an account with both says both', async () => {
    const id = await oauthUser('both@example.com', { full_name: 'Both Ways' });
    await identity(id, 'google');
    await identity(id, 'email');
    const methods = (await asActor(id, 'select public.my_sign_in_methods() m')).rows[0].m;
    assert(methods.hasPassword === true);
    assert(methods.providers.length === 2, `providers: ${JSON.stringify(methods.providers)}`);
    assert(/password or with Google/i.test(methods.summary), `summary was ${methods.summary}`);
  });

  await test('a signed-out caller is refused', async () => {
    await rejects(() => q('select public.my_sign_in_methods()'), /sign in to/i);
  });

  // The admin who will flip the flag once the provider exists.
  const admin = await bootstrapAdmin('google-admin@example.com');
  await newProfile(admin, 'Owner');
  await test('only the platform owner can flip it, and it is a settings change', async () => {
    await asActor(admin, "update public.platform_settings set value_text='true' where key='auth.google_sign_in'");
    const value = await scalar(
      "select value_text from public.platform_settings where key='auth.google_sign_in'");
    assert(value.value_text === 'true', 'the owner could not turn it on');
    // Put it back: the register is asserted by the flags suite.
    await asActor(admin, "update public.platform_settings set value_text='false' where key='auth.google_sign_in'");
  });
}
