// One number, one notation.
//
// The platform keeps a phone number in E.164 and nothing else, so that no
// feature ever has to guess what "+256 (0)772 12 34 56" meant. This suite is
// about the three ways that can go wrong: a number accepted in a shape that
// cannot be dialled, a number whose country does not agree with its dial code,
// and a writer that gets around the normaliser.

export async function run(ctx) {
  const { q, test, assert, rejects, asUser, asAnon, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('phone-admin@example.com');
  const person = await newUser('phone-person@example.com');
  await newProfile(person, 'Phone Person');
  const other = await newUser('phone-other@example.com');
  await newProfile(other, 'Other Person');

  const flag = (on) =>
    q(`update public.platform_settings set value_text = $1
        where key = 'platform.phone_format'`, [on ? 'true' : 'false']);

  const stored = async (userId) =>
    (await q(`select phone_e164, phone_country from public.user_contact_details
               where user_id = $1`, [userId])).rows[0] ?? null;

  /** Call a writer as a signed-in person, committing so later tests can read it. */
  async function call(actor, sql, params = []) {
    await q('begin');
    try {
      await q(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: actor, role: 'authenticated' })]);
      await q('set local role authenticated');
      const out = await q(sql, params);
      await q('commit');
      return out.rows[0]?.r ?? null;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const myPhone = (actor) => call(actor, 'select public.my_phone() as r');
  const save = (actor, phone, country) =>
    call(actor, 'select public.set_my_phone($1,$2) as r', [phone, country]);
  const clear = (actor) => call(actor, 'select public.clear_my_phone() as r');

  const normalise = async (input, country) =>
    (await q('select public.normalise_phone_number($1,$2) as n', [input, country])).rows[0].n;

  const eq = (actual, expected, what) =>
    assert(actual === expected, `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  // -------------------------------------------------------------------------
  // The normaliser
  // -------------------------------------------------------------------------
  await test('a national number keeps its dial code and drops the trunk zero', async () => {
    eq(await normalise('0772123456', 'UG'), '+256772123456', 'with the trunk zero');
    eq(await normalise('772123456', 'UG'), '+256772123456', 'without it');
    eq(await normalise('0752 123 456', 'TZ'), '+255752123456', 'a Tanzanian number');
    eq(await normalise('12015550123', 'US'), '+12015550123', 'a US number written with its 1');
    eq(await normalise('256772123456', 'UG'), '+256772123456', 'a number pasted without its +');
  });

  await test('spaces, dashes, dots and brackets are notation, not data', async () => {
    eq(await normalise('+256 (0) 772-123.456', 'UG'), '+256772123456', 'the (0) form');
    eq(await normalise('  +44 7400 123456  ', 'GB'), '+447400123456', 'padded and spaced');
    eq(await normalise('(020) 7946 0018', 'GB'), '+442079460018', 'a bracketed area code');
  });

  await test('an international prefix of 00 is read as +', async () => {
    eq(await normalise('00256772123456', 'UG'), '+256772123456', '00256');
    eq(await normalise('0049 1512 3456789', 'DE'), '+4915123456789', '0049');
  });

  await test('a number that says it is from somewhere else is refused, both codes named', async () => {
    await rejects(() => normalise('+447400123456', 'UG'), /not a UG number.*\+447.*\+256/);
  });

  await test('a country with no dial code on the list is refused by name', async () => {
    await rejects(() => normalise('0772123456', 'XX'), /no dial code for XX/);
    await rejects(() => normalise('0772123456', ''), /choose the country/);
  });

  await test('a number that is the wrong length is refused with the length it should be', async () => {
    await rejects(() => normalise('077212345', 'UG'), /9 to 9 digits, and this one has 8/);
    await rejects(() => normalise('07721234567', 'UG'), /9 to 9 digits, and this one has 10/);
  });

  await test('letters are refused rather than stripped', async () => {
    await rejects(() => normalise('call me on 0772123456', 'UG'), /cannot contain letters/);
    await rejects(() => normalise('+', 'UG'), /not just punctuation/);
    await rejects(() => normalise('   ', 'UG'), /type a phone number/);
  });

  await test('a second plus, or one that is not at the front, is refused', async () => {
    await rejects(() => normalise('++256772123456', 'UG'), /at most one \+/);
    await rejects(() => normalise('256+772123456', 'UG'), /only at the start/);
  });

  await test("a national number whose own digits start with 0 is not truncated", async () => {
    // Italy's leading zero is part of the number — its dial-code row carries no
    // trunk prefix — so the 0 must survive.
    eq(await normalise('0612345678', 'IT'), '+390612345678', 'an Italian landline');
  });

  // -------------------------------------------------------------------------
  // The writers
  // -------------------------------------------------------------------------
  await test('the feature ships off, and the writer says so', async () => {
    await flag(false);

    const state = await myPhone(person);
    eq(state.enabled, false, 'the flag should be off by default');
    eq(state.phoneE164, null, 'nothing should be stored yet');

    await rejects(() => save(person, '0772123456', 'UG'), /not being collected/);
    eq(await stored(person), null, 'a refused write must leave no row');
  });

  await test('switched on, a number is stored in E.164 with its country', async () => {
    await flag(true);

    const saved = await save(person, '0772 123 456', 'UG');
    eq(saved.phoneE164, '+256772123456', 'the stored number');
    eq(saved.phoneCountry, 'UG', 'the stored country');
    eq(saved.dialCode, '+256', 'the dial code');
    eq(saved.enabled, true, 'the flag');

    const row = await stored(person);
    eq(row.phone_e164, '+256772123456', 'the row');
    eq(row.phone_country.trim(), 'UG', 'the row country');
  });

  await test('saving again replaces the number rather than adding a second', async () => {
    await save(person, '+256 700 111222', 'UG');
    const n = (await q(
      'select count(*)::int as n from public.user_contact_details where user_id = $1',
      [person])).rows[0].n;
    eq(n, 1, 'rows for one person');
    eq((await myPhone(person)).phoneE164, '+256700111222', 'the replaced number');
  });

  await test('clearing removes the number and the country together', async () => {
    await flag(true);
    await save(person, '0772123456', 'UG');

    const cleared = await clear(person);
    eq(cleared.phoneE164, null, 'the writer’s report');
    const row = await stored(person);
    eq(row.phone_e164, null, 'the number');
    eq(row.phone_country, null, 'the country');
  });

  await test('a number cannot be written by hand in another notation', async () => {
    await flag(true);

    // The writers normalise; this is the check that a writer who forgets does
    // not get to store something the rest of the platform cannot dial.
    await rejects(
      () => q(`insert into public.user_contact_details (user_id, phone_e164, phone_country)
              values ($1, '0772123456', 'UG')`, [person]),
      /E\.164/,
    );
    await rejects(
      () => q(`insert into public.user_contact_details (user_id, phone_e164, phone_country)
              values ($1, '+256772123456', null)`, [person]),
      /with the country/,
    );
  });

  await test('a number and its country are one fact, so the table refuses one without the other', async () => {
    await q('insert into public.user_contact_details (user_id) values ($1)', [other]);
    await rejects(
      () => q(`update public.user_contact_details set phone_e164 = '+256772123456'
                where user_id = $1`, [other]),
      /stored with the country|ucd_phone_pair|violates check constraint/,
    );
  });

  // -------------------------------------------------------------------------
  // Reading
  // -------------------------------------------------------------------------
  await test('a person cannot read another person’s number', async () => {
    await flag(true);
    await save(person, '0772123456', 'UG');

    const seen = await asUser(other, async () =>
      (await q(`select count(*)::int as n from public.user_contact_details
                 where user_id = $1`, [person])).rows[0].n);
    eq(seen, 0, 'another person’s rows that are visible');

    eq((await myPhone(other)).phoneE164, null, 'what the other person’s own view says');
  });

  await test('staff can read it, because they are the people who call somebody back', async () => {
    await flag(true);
    await save(person, '0772123456', 'UG');

    const seen = await asUser(admin, async () =>
      (await q('select phone_e164 from public.user_contact_details where user_id = $1', [person]))
        .rows[0]?.phone_e164);
    eq(seen, '+256772123456', 'what staff read');
  });

  await test('signed out, there is nothing to read or write', async () => {
    await rejects(() => asAnon(() => q('select public.my_phone()')), /sign in/);
    await rejects(() => call(null, 'select public.set_my_phone($1,$2) as r', ['0772123456', 'UG']),
      /sign in/);
  });

  await test('a number stored before the switch was turned off is still returned', async () => {
    await flag(true);
    await save(person, '0772123456', 'UG');
    await flag(false);

    const state = await myPhone(person);
    eq(state.enabled, false, 'the flag after being turned off');
    eq(state.phoneE164, '+256772123456',
      'a stored number must not vanish when the switch goes off');
  });

  // -------------------------------------------------------------------------
  // The table of countries
  // -------------------------------------------------------------------------
  await test('the country table covers the world, and every row is a plausible dial code', async () => {
    const row = (await q(`select count(*)::int as n,
                                 count(distinct dial_code)::int as codes,
                                 min(national_min)::int as lo,
                                 max(national_max)::int as hi
                            from public.country_dial_codes`)).rows[0];

    assert(row.n > 200, `only ${row.n} countries seeded`);
    assert(row.codes > 150, `only ${row.codes} distinct dial codes`);
    assert(row.lo >= 4 && row.hi <= 15,
      `length range ${row.lo}-${row.hi} is outside anything a phone number can be`);
  });

  await test('the four countries this platform is most likely to sell into are right', async () => {
    const rows = (await q(`select country_code, dial_code, national_min::int, national_max::int,
                                  trunk_prefix
                             from public.country_dial_codes
                            where country_code in ('UG','KE','GB','US')`)).rows;
    const by = Object.fromEntries(rows.map((r) => [r.country_code.trim(), r]));

    eq(by.UG.dial_code, '+256', 'Uganda');
    eq(by.UG.national_min, 9, 'Ugandan digit count');
    eq(by.UG.trunk_prefix, '0', 'the Ugandan trunk prefix');
    eq(by.KE.dial_code, '+254', 'Kenya');
    eq(by.GB.dial_code, '+44', 'Britain');
    eq(by.US.dial_code, '+1', 'the United States');
    eq(by.US.national_min, 10, 'US digit count');
  });

  await test('the table refuses a dial code that is not one', async () => {
    await rejects(
      () => q(`insert into public.country_dial_codes (country_code, dial_code, national_min, national_max)
              values ('ZZ', '256', 9, 9)`),
      /check constraint|violates/,
    );
  });

  // -------------------------------------------------------------------------
  // The switch
  // -------------------------------------------------------------------------
  await test('the flag is the owner’s to flip, and it is recorded as such', async () => {
    const row = (await q(`select gate_type, preconditions, description
                            from public.platform_settings
                           where key = 'platform.phone_format'`)).rows[0];

    eq(row.gate_type, 'admin', 'a built feature must not stay CODE-gated');
    assert(row.preconditions, 'an admin flag with no written precondition is a bug waiting to be enabled');
    assert(/E\.164/.test(row.description), 'the description does not say how a number is stored');
  });
}
