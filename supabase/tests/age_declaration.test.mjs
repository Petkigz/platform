// The adulthood declaration, and the gate it holds.
//
// `platform.age_assurance` sat in the register for months with one honest
// sentence against it: *the method is undecided, and a guessed method is worse
// than an honest gap*. The owner decided the method on 2026-10-30 — **a
// declaration** — so what is tested here is not an age check but the record of a
// claim:
//
//   * the sentence a person agreed to is stored **by version**, so a declaration
//     made today cannot be silently restated in new words;
//   * withdrawing sets a date and deletes nothing, and **does not remove a child
//     who was already added** — that is a separate act;
//   * the gate refuses a *missing* declaration and says so by name, and lifts
//     completely when the flag is off;
//   * one account cannot read another's declaration.
//
// What is deliberately not tested: that the person is telling the truth. The
// platform holds no means to test it, and a test that pretended otherwise would
// be the same lie the screen is written to avoid.

export async function run(ctx) {
  const { q, test, assert, rejects, newUser, newProfile } = ctx;

  const flag = (on) =>
    q(`update public.platform_settings set value_text = $1 where key = 'platform.age_assurance'`,
      [on ? 'true' : 'false']);

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

  // ---------------------------------------------------------------------------
  // Fixtures
  // ---------------------------------------------------------------------------
  const guardian = await newUser('age-guardian@example.com');
  await newProfile(guardian);

  const other = await newUser('age-other@example.com');
  await newProfile(other);

  const familyId = (await q(
    `insert into public.families (name, created_by) values ('Age Family', $1) returning id`,
    [guardian])).rows[0].id;
  await q(
    `insert into public.family_memberships (family_id, user_id, membership_type, status, joined_at)
     values ($1, $2, 'owner', 'active', now())`, [familyId, guardian]);

  const addChild = (actor, name) =>
    call(actor, 'add_child_to_family($1,$2,$3)', [familyId, name, '8-10']);

  const declaration = (actor) => call(actor, 'my_adult_declaration()');

  await flag(false);

  // ---------------------------------------------------------------------------
  await test('nothing is asked until the platform asks', async () => {
    const d = await declaration(guardian);
    eq(d.required, false, 'the flag is off, so a declaration is not required');
    eq(d.declared, false, 'and this account has not made one');
    eq(d.withdrawn, false, 'nothing has been withdrawn either');
    // The sentence is still readable while the flag is off: a page explaining
    // what will one day be asked should not have to hard-code the words.
    assert(typeof d.statement === 'string' && d.statement.length > 40,
      'the statement text should be readable before it is required');
  });

  await test('the declaration records the wording, not just a tick', async () => {
    await flag(true);
    const made = await call(guardian, 'declare_adult($1)', [1]);

    eq(made.declared, true, 'a declaration now exists');
    eq(made.statementVersion, 1, 'it was made against version one');
    assert(made.declaredAt !== null, 'and it carries the moment it was made');
    // Read back in its own words: this is what a family asking "what did I agree
    // to?" two years from now will be shown.
    eq(made.statement, (await q(
      `select public.adult_declaration_statement(1) as s`)).rows[0].s,
      'the declaration is readable in the words it was made in');

    eq(await call(guardian, 'has_declared_adult()'), true, 'has_declared_adult() agrees');

    const audit = (await q(
      `select detail from public.governance_audit_events
        where actor = $1 and action = 'age.declared'`, [guardian])).rows;
    eq(audit.length, 1, 'one audit entry for one declaration');
    eq(Number(audit[0].detail.statementVersion), 1, 'the audit names the version, not the person');
  });

  await test('a sentence that does not exist cannot be agreed to', async () => {
    await rejects(
      () => call(guardian, 'declare_adult($1)', [99]),
      /unknown_statement_version/,
      'an unversioned statement must be refused rather than stored as if it meant something',
    );
    eq((await q(`select public.adult_declaration_statement(99) as s`)).rows[0].s, null,
      'and the lookup itself returns nothing for a version that does not exist');
  });

  await test('re-declaring refreshes one row instead of growing a log', async () => {
    await q(`update public.adult_declarations set declared_at = now() - interval '10 days'
              where user_id = $1`, [guardian]);
    const before = (await q(
      `select declared_at from public.adult_declarations where user_id = $1`,
      [guardian])).rows[0].declared_at;

    const again = await call(guardian, 'declare_adult($1)', [1]);
    const after = (await q(
      `select declared_at from public.adult_declarations where user_id = $1`,
      [guardian])).rows[0].declared_at;

    assert(new Date(after) > new Date(before), 'the date moves forward');
    eq(again.declared, true, 'and the declaration is still in force');
    eq((await q(`select count(*)::int as n from public.adult_declarations where user_id = $1`,
      [guardian])).rows[0].n, 1, 'one row per account, not a pile of them');
  });

  // ---------------------------------------------------------------------------
  await test('withdrawing is a date, never a delete', async () => {
    const withdrawn = await call(guardian, 'withdraw_adult_declaration()');
    eq(withdrawn.declared, false, 'a withdrawn declaration is not a declaration');
    eq(withdrawn.withdrawn, true, 'and the page says it was withdrawn rather than never made');

    const row = (await q(
      `select stated_row.declared_at, stated_row.withdrawn_at
         from public.adult_declarations stated_row where user_id = $1`,
      [guardian])).rows[0];
    assert(row !== undefined, 'the row still exists');
    assert(row.withdrawn_at !== null, 'with the moment it was withdrawn');

    eq(await call(guardian, 'has_declared_adult()'), false, 'and the gate sees no declaration');

    await rejects(() => call(guardian, 'withdraw_adult_declaration()'),
      /nothing_to_withdraw/, 'withdrawing twice is refused rather than silently accepted');

    const audit = (await q(
      `select count(*)::int as n from public.governance_audit_events
        where actor = $1 and action = 'age.declaration_withdrawn'`, [guardian])).rows[0].n;
    eq(audit, 1, 'the withdrawal is audited too');
  });

  // ---------------------------------------------------------------------------
  await test('the gate refuses a missing declaration, and names it', async () => {
    await rejects(() => addChild(guardian, 'Amina'),
      /age:declare_before_adding_a_child/,
      'an adult who has not declared cannot add a child while the flag is on');
  });

  await test('declaring opens the gate', async () => {
    await call(guardian, 'declare_adult($1)', [1]);
    const child = await addChild(guardian, 'Amina');
    assert(typeof child === 'string' && child.length === 36, 'the child is created');
  });

  await test('withdrawing does not remove a child who is already here', async () => {
    await call(guardian, 'withdraw_adult_declaration()');
    const children = (await q(
      `select count(*)::int as n from public.learner_profiles
        where family_id = $1 and learner_type = 'child' and deleted_at is null`,
      [familyId])).rows[0].n;
    assert(children >= 1, 'the child stays: withdrawing consent is not a deletion');
  });

  await test('with the flag off, the gate is gone and nothing is stranded', async () => {
    await flag(false);
    // The same account, still withdrawn, adds a second child: with the feature
    // switched off the platform does not ask, and a family that turned it off is
    // not locked out of its own account.
    const second = await addChild(guardian, 'Yusuf');
    assert(typeof second === 'string', 'a child can be added while the flag is off');
  });

  // ---------------------------------------------------------------------------
  await test('one account cannot read another’s declaration', async () => {
    await flag(true);
    await call(guardian, 'declare_adult($1)', [1]);

    const visible = (await asActor(other,
      `select count(*)::int as n from public.adult_declarations`)).rows[0].n;
    eq(visible, 0, 'RLS shows an account only its own row');

    const mine = (await asActor(guardian,
      `select count(*)::int as n from public.adult_declarations`)).rows[0].n;
    eq(mine, 1, 'and its own row is readable');
  });

  await test('the flag is a switch now, not a deploy', async () => {
    const row = (await q(
      `select gate_type from public.platform_settings where key = 'platform.age_assurance'`)).rows[0];
    eq(row.gate_type, 'admin',
      'the method is decided, so the owner may turn it on from the dashboard');
  });

  await flag(false);
}
