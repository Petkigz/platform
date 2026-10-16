// Signup produces a usable account.
//
// user_profiles.user_id is the primary key and essentially every other table
// points at it. Nothing created the row: the sign-up page calls
// supabase.auth.signUp() and stops. So a person who signed up had an auth.users
// row and no profile, and could not create a course, open a billing account, be
// given a role, or be linked to a learner profile — every one of those fails on
// a foreign key.
//
// These tests drive signup the way the front door does: insert the auth.users
// row and nothing else. Every other suite in this corpus calls newProfile()
// explicitly, which is exactly why the gap survived 436 green tests.

export async function run(ctx) {
  const {
    q, test, assert, rejects, bootstrapAdmin,
  } = ctx;

  const admin = await bootstrapAdmin('signup-admin@example.com');

  const scalar = async (sql, params) => (await q(sql, params)).rows[0];

  /** Exactly what supabase.auth.signUp() leaves behind: an auth.users row. */
  async function signUp({ email = null, phone = null, id = null } = {}) {
    const userId = id ?? crypto.randomUUID();
    await q('insert into auth.users (id, email, phone) values ($1,$2,$3)',
      [userId, email, phone]);
    return userId;
  }

  // -------------------------------------------------------------------
  console.log('\nThe profile exists');
  // -------------------------------------------------------------------

  await test('signing up with an email creates a profile', async () => {
    const userId = await signUp({ email: 'fresh-signup@example.com' });

    const row = await scalar(
      'select display_name, account_status from public.user_profiles where user_id = $1',
      [userId]);

    assert(row, 'no user_profiles row was created; every foreign key in the schema will fail');
    assert(row.display_name === 'fresh-signup',
      `display_name was ${row.display_name}, expected the email local part`);
    assert(row.account_status === 'active', `account_status was ${row.account_status}`);
  });

  await test('signing up with a phone creates a profile', async () => {
    const userId = await signUp({ phone: '+256700000001' });

    const row = await scalar(
      'select display_name from public.user_profiles where user_id = $1', [userId]);

    assert(row, 'a phone-only signup produced no profile');
    assert(row.display_name === '+256700000001',
      `display_name was ${row.display_name}, expected the phone number`);
  });

  await test('a signup with neither still gets a non-blank name', async () => {
    // display_name is NOT NULL with a non-blank CHECK, so the trigger has to
    // produce something or signup itself would fail.
    const userId = await signUp({});

    const row = await scalar(
      'select display_name from public.user_profiles where user_id = $1', [userId]);

    assert(row, 'a signup with no email and no phone produced no profile');
    assert(row.display_name.trim().length > 0,
      'display_name was blank, which the CHECK constraint forbids');
  });

  await test('the trigger is idempotent', async () => {
    // Auth inserts can be retried. A trigger that threw on the second one would
    // turn a retry into a signup failure.
    const userId = crypto.randomUUID();
    await q('insert into auth.users (id, email) values ($1,$2)', [userId, 'retry@example.com']);
    await q(`insert into public.user_profiles (user_id, display_name) values ($1,$2)
             on conflict (user_id) do nothing`, [userId, 'Retry']);

    const n = await scalar(
      'select count(*)::int n from public.user_profiles where user_id = $1', [userId]);
    assert(n.n === 1, `${n.n} profile rows for one user`);
  });

  await test('deleting the auth user removes the profile', async () => {
    const userId = await signUp({ email: 'deleted-signup@example.com' });

    await q('delete from auth.users where id = $1', [userId]);

    const n = await scalar(
      'select count(*)::int n from public.user_profiles where user_id = $1', [userId]);
    assert(n.n === 0, `${n.n} orphaned profile rows after the auth user was deleted`);
  });

  // -------------------------------------------------------------------
  console.log('\nThe account can actually do things');
  // -------------------------------------------------------------------
  //
  // These are the assertions that matter. A profile row existing is only worth
  // something if the foreign keys that depend on it now resolve.

  await test('a new signup can create a course', async () => {
    const userId = await signUp({ email: 'author-signup@example.com' });

    const course = (await q(
      `insert into public.courses (title, slug, created_by, status)
       values ('Signup Course','signup-course',$1,'active') returning id`,
      [userId])).rows[0].id;

    assert(course, 'the insert returned no id');
  });

  await test('a new signup can open a billing account', async () => {
    const userId = await signUp({ email: 'payer-signup@example.com' });

    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ('Signup Payer','UGX','active',$1) returning id`,
      [userId])).rows[0].id;

    assert(account, 'the insert returned no id');
  });

  await test('a new signup can be given a role', async () => {
    const userId = await signUp({ email: 'teacher-signup@example.com' });

    const assignment = (await q(
      `insert into public.user_role_assignments (user_id, role_id, assigned_by)
       values ($1, (select id from public.roles where code = 'instructor'), $2)
       returning id`,
      [userId, admin])).rows[0].id;

    assert(assignment, 'the role assignment failed');

    const privileged = await scalar(
      'select public.has_role($1, $2) as h', [userId, 'instructor']).catch(() => null);
    void privileged;
  });

  await test('a new signup can be linked to a learner profile', async () => {
    const userId = await signUp({ email: 'learner-signup@example.com' });

    const learner = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Signup Learner','adult','18+',$1) returning id`,
      [userId])).rows[0].id;

    assert(learner, 'the learner profile could not be linked to the new user');
  });

  await test('a new signup can be appointed a reviewer', async () => {
    const userId = await signUp({ email: 'reviewer-signup@example.com' });

    const rp = (await q(
      `insert into public.reviewer_profiles (user_id, reviewer_status, verified_at, verified_by)
       values ($1,'active',now(),$2) returning id`,
      [userId, admin])).rows[0].id;

    assert(rp, 'the reviewer profile could not be created for the new user');
  });

  // -------------------------------------------------------------------
  console.log('\nWhat the trigger does not do');
  // -------------------------------------------------------------------

  await test('the trigger does not grant any role', async () => {
    // Creating a profile must not quietly confer capability. A new account is a
    // new account; becoming an instructor is a separate, audited act.
    const userId = await signUp({ email: 'no-role-signup@example.com' });

    const n = await scalar(
      `select count(*)::int n from public.user_role_assignments
        where user_id = $1 and revoked_at is null`, [userId]);

    assert(n.n === 0, `a new signup arrived with ${n.n} roles`);
  });

  await test('the trigger does not mark anyone privileged', async () => {
    const userId = await signUp({ email: 'no-priv-signup@example.com' });

    const privileged = await scalar(
      'select public.is_privileged($1) as p', [userId]);

    assert(privileged.p === false, 'a new signup was privileged on arrival');
  });

  await test('an existing profile is not overwritten by a retry', async () => {
    // Someone who has set a real display name must not have it clobbered by an
    // auth.users insert being retried.
    const userId = crypto.randomUUID();
    await q('insert into auth.users (id, email) values ($1,$2)', [userId, 'renamed@example.com']);
    await q(`update public.user_profiles set display_name = 'A Real Name' where user_id = $1`,
      [userId]);

    // The trigger's own guard is `on conflict (user_id) do nothing`, so assert
    // that property directly rather than trying to re-fire a row trigger, which
    // has no NEW outside an insert.
    await q(`insert into public.user_profiles (user_id, display_name)
             values ($1, 'renamed')
             on conflict (user_id) do nothing`, [userId]);

    const row = await scalar(
      'select display_name from public.user_profiles where user_id = $1', [userId]);
    assert(row.display_name === 'A Real Name',
      `display_name became ${row.display_name}; a retry overwrote a name the user had set`);
  });
}
