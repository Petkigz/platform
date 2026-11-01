// The account that closed but could still sign in.
//
// `/account/delete` has told every person who used it that closing the account
// removes their name from everything it touched. It does, in this database. It
// does not remove the sign-in, which lives in `auth.users` at the authentication
// provider — so a closed account could still sign in, because nothing had been
// told to stop it.
//
// Three units named that in passing and wrote it down as staff work. A paragraph
// in a document is not a queue: nobody knows which identities are outstanding,
// nobody records the ones they remove, and the question a person actually asks
// afterwards — *was my account erased?* — has no answer anywhere.
//
// This suite walks the whole thing, and it is written around one discovery.
// `user_profiles.user_id` was `references auth.users (id) on delete cascade`, so
// the obvious staff step was worse than the gap it closed: for an account that
// ever opened a support case, asked for a refund, taught a course or was
// screened, eighteen `on delete restrict` keys made the delete **fail**; for an
// account with none of those it **succeeded** and took the profile, the roles,
// the policy acceptances and — because `governance_audit_events.actor` is
// `on delete set null` — the name against every audit entry they ever caused.
//
// The one record `/account/delete` promised to keep was the thing that would have
// gone. So Act I proves the foreign key is gone and both halves of that are now
// false.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newUser: _u, grantRole, committed,
  } = ctx;

  const owner = await bootstrapAdmin('identity-owner@example.com');
  const governance = await newUser('identity-governance@example.com');
  await newProfile(governance, 'Hafsa Nakato');
  await committed(() => grantRole(governance, 'governance_admin', owner));
  const agent = await newUser('identity-agent@example.com');
  await newProfile(agent, 'Musa Kigozi');
  await committed(() => grantRole(agent, 'support_agent', owner));

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

  const call = async (actor, sql, params = []) =>
    (await asActor(actor, sql, params)).rows[0].r;

  const one = async (sql, params = []) => (await q(sql, params)).rows[0];
  const count = async (sql, params = []) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  /** A closed account, the way the product closes one. */
  async function joinAndClose(email, name) {
    const id = await newUser(email);
    await newProfile(id, name);
    const receipt = await call(id, 'select public.erase_my_account($1) as r', [name]);
    return { id, receipt };
  }

  // -------------------------------------------------------------------------
  console.log('\nAct I — a profile is no longer a child of its identity');
  // -------------------------------------------------------------------------

  await test('the cascade is gone, so deleting an identity keeps the row it was hanging on', async () => {
    const fk = await one(
      `select count(*)::int n from pg_constraint
        where conrelid = 'public.user_profiles'::regclass
          and confrelid = to_regclass('auth.users')`);
    assert(fk.n === 0,
      'user_profiles still points at auth.users, so deleting an identity still takes the profile with it');

    const person = await newUser('cascade-gone@example.com');
    await newProfile(person, 'Sumayya Nakato');
    await q('delete from auth.users where id = $1', [person]);

    const left = await one(
      'select display_name, account_status from public.user_profiles where user_id = $1', [person]);
    assert(left !== undefined,
      'the profile was deleted with the identity, which is what the audit trail hangs on');
    assert(left.display_name === 'Sumayya Nakato', 'the profile on its own survived with the wrong name');
  });

  /** Turn a settings flag on for the duration of fn. */
  async function withFlag(key, fn) {
    const before = (await one(
      'select value_text from public.platform_settings where key = $1', [key])).value_text;
    await q('update public.platform_settings set value_text = $1 where key = $2', ['true', key]);
    try {
      return await fn();
    } finally {
      await q('update public.platform_settings set value_text = $1 where key = $2', [before, key]);
    }
  }

  await test('an account that ever asked for help can have its identity deleted at all', async () => {
    // This is the half of the bug that looked like a broken dashboard: the
    // support case holds the profile with `on delete restrict`, so the delete
    // failed with a foreign key error nobody could act on.
    const asker = await newUser('identity-asker@example.com');
    await newProfile(asker, 'Bilal Muwanga');
    const caseId = await withFlag('platform.support', () => call(asker,
      `select public.open_support_case('account', 'Cannot sign in',
         'The code never arrives, and I have tried twice.') as r`));

    await q('delete from auth.users where id = $1', [asker]);
    assert(await count('select 1 from public.support_cases where id = $1', [caseId]) === 1,
      'the support case went with the identity');
    assert(await count('select 1 from public.user_profiles where user_id = $1', [asker]) === 1,
      'the profile went with the identity');
  });

  await test('the audit trail keeps the name against what a closed account did', async () => {
    // `governance_audit_events.actor` is `on delete set null`. While the profile
    // was a cascade child of the identity, deleting the identity blanked every
    // act the person had ever taken — including the record that they closed the
    // account, which `/account/delete` promises to keep.
    const { id } = await joinAndClose('identity-audit@example.com', 'Khadija Muwanga');

    const before = await count(
      `select 1 from public.governance_audit_events
        where actor = $1 and action = 'account.closed_by_owner'`, [id]);
    assert(before === 1, 'closing the account left no audit entry to test');

    await q('delete from auth.users where id = $1', [id]);

    const after = await count(
      `select 1 from public.governance_audit_events
        where actor = $1 and action = 'account.closed_by_owner'`, [id]);
    assert(after === 1, 'deleting the identity blanked who closed the account');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — closing an account now records the sign-in it left behind');
  // -------------------------------------------------------------------------

  await test('the receipt says the sign-in is still at the provider', async () => {
    const { receipt } = await joinAndClose('identity-record@example.com', 'Amina Ssekandi');
    assert(receipt.identity !== undefined, 'the receipt says nothing about the sign-in');
    assert(receipt.identity.stillAtProvider === true,
      'the receipt claims the sign-in is gone when closing an account cannot remove it');
    assert(receipt.identity.removedBy === 'staff', 'the receipt does not say who removes it');
  });

  await test('a closed account lands in the ledger with a fingerprint and no removal date', async () => {
    const { id } = await joinAndClose('identity-ledger@example.com', 'Yusuf Kigozi');
    const row = await one(
      `select address_hash, source, identity_removed_at, identity_removed_by
         from public.erased_identities where user_id = $1`, [id]);
    assert(row !== undefined, 'no ledger row was written');
    assert(/^[a-f0-9]{64}$/.test(row.address_hash),
      `the fingerprint is not a hash: ${row.address_hash}`);
    assert(row.source === 'self_service', `the row says ${row.source}`);
    assert(row.identity_removed_at === null, 'the row claims the identity is already gone');
    assert(row.identity_removed_by === null);

    // Case and whitespace are normalised, so a support agent typing the address
    // the way the person wrote it still finds this row.
    const same = await one(
      'select public.identity_hash($1) = (select address_hash from public.erased_identities where user_id = $2) as same',
      ['  IDENTITY-LEDGER@Example.com ', id]);
    assert(same.same === true, 'the fingerprint does not survive case and padding');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — the queue, and the two states that should not exist');
  // -------------------------------------------------------------------------

  await test('the queue lists closed accounts whose identity is still there', async () => {
    const queue = await call(owner, 'select public.identity_removal_queue() as r');
    assert(queue.stillAtProvider >= 2,
      `the queue sees ${queue.stillAtProvider} identities at the provider, and there are at least two`);
    assert(queue.unrecorded === queue.stillAtProvider,
      `${queue.unrecorded} of ${queue.stillAtProvider} outstanding identities are counted as recorded`);
    assert(queue.removed === 0, 'the queue claims a removal that nobody has taken');
    assert(queue.rows.length > 0, 'the queue returns no rows');

    const sample = queue.rows.find((r) => r.erased === true);
    assert(sample !== undefined, 'no row is marked as having a ledger entry');
    assert(sample.recordedRemoved === false, 'a row claims its identity was removed');
    assert(typeof sample.closedAt === 'string', 'a row does not say when the account closed');
    assert(!('address_hash' in sample) && !('email' in sample),
      'the queue hands out addresses or fingerprints, which the ledger deliberately does not');
  });

  await test('an account that can sign in but has no identity is reported, not ignored', async () => {
    const ghost = await newUser('identity-ghost@example.com');
    await newProfile(ghost, 'Halima Kigozi');
    const before = (await call(owner, 'select public.identity_removal_queue() as r'))
      .activeWithoutIdentity;

    await q('delete from auth.users where id = $1', [ghost]);

    const after = await call(owner, 'select public.identity_removal_queue() as r');
    assert(after.activeWithoutIdentity === before + 1,
      'an active account whose identity vanished is not reported');
  });

  await test('nobody but the owner sees the queue', async () => {
    await rejects(() => call(governance, 'select public.identity_removal_queue() as r'),
      /identity:not_allowed/);
    await rejects(() => call(agent, 'select public.identity_removal_queue() as r'),
      /identity:not_allowed/);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — recording the step, and refusing to record a step nobody took');
  // -------------------------------------------------------------------------

  await test('a removal cannot be recorded while the identity is still there', async () => {
    // The whole point. "Recorded" and "done" drifting apart is how this gap
    // survived for a month in the first place.
    const { id } = await joinAndClose('identity-early@example.com', 'Zaynab Nansubuga');
    await rejects(() => call(owner, 'select public.record_identity_removal($1, $2) as r',
      [id, 'deleted it']), /identity:still_present/);
    assert(await count(
      'select 1 from public.erased_identities where user_id = $1 and identity_removed_at is not null',
      [id]) === 0, 'the ledger recorded a removal that has not happened');
  });

  await test('once it is deleted, the removal records, audits, and leaves the queue', async () => {
    const { id } = await joinAndClose('identity-done@example.com', 'Maryam Nakato');
    const before = (await call(owner, 'select public.identity_removal_queue() as r')).unrecorded;

    await q('delete from auth.users where id = $1', [id]);

    const result = await call(owner, 'select public.record_identity_removal($1, $2) as r',
      [id, 'deleted in Supabase, 1 November']);
    assert(result.recorded === true, 'the removal was not recorded');
    assert(result.remainingAtProvider < before,
      `the queue did not shrink (${before} → ${result.remainingAtProvider})`);

    const row = await one(
      `select identity_removed_at, identity_removed_by, note, source
         from public.erased_identities where user_id = $1`, [id]);
    assert(row.identity_removed_at !== null, 'no removal date');
    assert(row.identity_removed_by === owner, 'the removal is attributed to the wrong person');
    assert(row.source === 'self_service',
      'recording a removal rewrote who closed the account in the first place');
    assert(/Supabase/.test(row.note), 'the note was lost');

    const audit = await count(
      `select 1 from public.governance_audit_events
        where action = 'identity.removed' and target_id = $1`, [id]);
    assert(audit === 1, 'the removal was not audited');

    const after = await call(owner, 'select public.identity_removal_queue() as r');
    assert(!after.rows.some((r) => r.userId === id),
      'the account is still in the queue after being recorded');
  });

  await test('recording it twice is refused rather than silently repeated', async () => {
    const { id } = await joinAndClose('identity-twice@example.com', 'Sumayya Muwanga');
    await q('delete from auth.users where id = $1', [id]);
    await call(owner, 'select public.record_identity_removal($1) as r', [id]);
    await rejects(() => call(owner, 'select public.record_identity_removal($1) as r', [id]),
      /identity:already_recorded/);

    const n = await count(
      `select 1 from public.governance_audit_events
        where action = 'identity.removed' and target_id = $1`, [id]);
    assert(n === 1, `the removal was audited ${n} times`);
  });

  await test('an open account is refused, because it still signs in', async () => {
    const open = await newUser('identity-open@example.com');
    await newProfile(open, 'Bilal Nakato');
    await q('delete from auth.users where id = $1', [open]);
    await rejects(() => call(owner, 'select public.record_identity_removal($1) as r', [open]),
      /identity:not_closed/);
  });

  await test('support and governance cannot record a removal', async () => {
    const { id } = await joinAndClose('identity-perms@example.com', 'Hafsa Ssekandi');
    await q('delete from auth.users where id = $1', [id]);
    await rejects(() => call(governance, 'select public.record_identity_removal($1) as r', [id]),
      /identity:not_allowed/);
    await rejects(() => call(agent, 'select public.record_identity_removal($1) as r', [id]),
      /identity:not_allowed/);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct V — the question a person actually asks');
  // -------------------------------------------------------------------------

  await test('a lookup finds an erased account, and says whether the sign-in is gone', async () => {
    const address = 'identity-lookup@example.com';
    const { id } = await joinAndClose(address, 'Ruqayya Nakato');

    const before = await call(agent, 'select public.identity_lookup($1) as r', [address]);
    assert(before.found === true, 'the erased account was not found by its address');
    assert(before.stillAtProvider === true, 'the lookup says the sign-in is gone when it is not');
    assert(before.identityRemovedAt === null);
    assert(/still at the authentication provider/.test(before.note),
      `the note does not explain what to do: ${before.note}`);

    await q('delete from auth.users where id = $1', [id]);
    await call(owner, 'select public.record_identity_removal($1) as r', [id]);

    const after = await call(agent, 'select public.identity_lookup($1) as r', [address]);
    assert(after.found === true && after.stillAtProvider === false);
    assert(after.identityRemovedAt !== null, 'the lookup does not say when the sign-in went');
    assert(/removed/.test(after.note));
  });

  await test('a lookup does not claim an unknown address never existed', async () => {
    // The honest answer. The ledger starts today, so "not found" is not proof of
    // anything, and a support agent who reads it as proof will tell somebody who
    // erased themselves that they never had an account.
    const unknown = await call(agent, 'select public.identity_lookup($1) as r',
      ['never-signed-up@example.com']);
    assert(unknown.found === false);
    assert(/not proof/.test(unknown.note), `the note overclaims: ${unknown.note}`);
    assert(/2026-11-01/.test(unknown.note), 'the note does not say when the ledger starts');
  });

  await test('somebody who came back is reported as both', async () => {
    const address = 'identity-returned@example.com';
    const { id } = await joinAndClose(address, 'Aisha Nakato');
    await q('delete from auth.users where id = $1', [id]);
    await call(owner, 'select public.record_identity_removal($1) as r', [id]);

    const again = await newUser(address);
    await newProfile(again, 'Aisha Nakato');

    const found = await call(agent, 'select public.identity_lookup($1) as r', [address]);
    assert(found.found === true, 'the erased account disappeared when the person came back');
    assert(found.activeAccountsAtAddress === 1,
      `the lookup reports ${found.activeAccountsAtAddress} live accounts at an address that has one`);
  });

  await test('every lookup is audited, and the audit does not keep the address', async () => {
    const address = 'identity-audited@example.com';
    await joinAndClose(address, 'Fatima Nakato');

    const before = await count(
      `select 1 from public.governance_audit_events where action = 'identity.looked_up'`);
    await call(agent, 'select public.identity_lookup($1) as r', [address]);
    const after = await count(
      `select 1 from public.governance_audit_events where action = 'identity.looked_up'`);
    assert(after === before + 1, 'the lookup was not audited');

    const leaked = await count(
      `select 1 from public.governance_audit_events
        where action = 'identity.looked_up'
          and detail::text like '%identity-audited%'`);
    assert(leaked === 0, 'the audit trail kept the address that was looked up');
  });

  await test('a learner cannot use the lookup at all', async () => {
    const learner = await newUser('identity-learner@example.com');
    await newProfile(learner, 'Zaynab Kigozi');
    await rejects(() => call(learner, 'select public.identity_lookup($1) as r',
      ['identity-audited@example.com']), /identity:not_allowed/);
    await rejects(() => call(owner, 'select public.identity_lookup($1) as r', ['  ']),
      /identity:address_required/);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct VI — the ledger is a record, not a scratch table');
  // -------------------------------------------------------------------------

  await test('an erased identity cannot be deleted, even by the owner', async () => {
    const { id } = await joinAndClose('identity-keep@example.com', 'Safiya Nakato');
    await rejects(() => q('delete from public.erased_identities where user_id = $1', [id]),
      /only record that the account existed/);
    assert(await count('select 1 from public.erased_identities where user_id = $1', [id]) === 1);
  });

  await test('a fingerprint cannot be rewritten, and a removal cannot be undone', async () => {
    const { id } = await joinAndClose('identity-rewrite@example.com', 'Nusayba Nakato');

    await rejects(() => q(
      'update public.erased_identities set address_hash = $2 where user_id = $1',
      [id, 'f'.repeat(64)]), /records what happened/);

    await q('delete from auth.users where id = $1', [id]);
    await call(owner, 'select public.record_identity_removal($1) as r', [id]);

    await rejects(() => q(
      'update public.erased_identities set identity_removed_at = null, identity_removed_by = null where user_id = $1',
      [id]), /already recorded/);
  });

  await test('nothing but the functions can read the ledger', async () => {
    const privilege = await one(
      `select has_table_privilege('authenticated', 'public.erased_identities', 'select') as can,
              has_table_privilege('anon', 'public.erased_identities', 'select') as anon_can`);
    assert(privilege.can === false,
      'any staff session can select the ledger, which makes it an address-membership oracle');
    assert(privilege.anon_can === false);
  });
}
