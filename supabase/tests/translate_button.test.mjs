// The Translate button's database side (20261281154000_translate_button.sql).
//
// What this suite holds: nothing is sent while the switch is off; one person
// is held to a day and everybody together to a month; staff are not held to a
// day and keep the last fifth of the month; and only a count is stored.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, asAnon, committed } = ctx;

  const admin = await bootstrapAdmin('translate-admin@example.com');
  const member = await newUser('translate-member@example.com');
  await newProfile(member, 'Translate Member');
  const other = await newUser('translate-other@example.com');
  await newProfile(other, 'Translate Other');

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
  const spend = (actor, n) => asActor(actor, 'select public.spend_translation($1) as r', [n]).then((res) => res.rows[0].r);
  const set = (key, value) => q('update public.platform_settings set value_text=$2 where key=$1', [key, String(value)]);
  const reset = async () => {
    await q('delete from public.translation_spend');
    await set('platform.translate_daily_characters', 20000);
    await set('platform.translate_monthly_characters', 400000);
  };

  await test('the switch ships off, and nothing is counted or allowed while it is', async () => {
    const row = (await q(`select value_text, gate_type, setting_kind from public.platform_settings where key='platform.translate'`)).rows[0];
    assert(row && row.value_text === 'false' && row.gate_type === 'admin_setup' && row.setting_kind === 'flag',
      `the switch is not an off ADMIN + SETUP flag: ${JSON.stringify(row)}`);
    await rejects(() => spend(member, 10), /translate:closed/);
    await rejects(() => spend(admin, 10), /translate:closed/);
    assert((await q('select count(*)::int n from public.translation_spend')).rows[0].n === 0, 'a refused request was counted');
  });

  await test('a member is held to a day, a request to a size, and only a count is kept', async () => {
    await set('platform.translate', 'true');
    try {
      await reset();
      await set('platform.translate_daily_characters', 100);
      await rejects(() => spend(member, 0), /translate:empty/);
      await rejects(() => spend(member, null), /translate:empty/);
      await rejects(() => spend(member, 5001), /translate:too_long/);
      await spend(member, 60);
      await spend(member, 40);
      await rejects(() => spend(member, 1), /translate:too_many/);
      // Somebody else has their own day.
      await spend(other, 100);
      const rows = (await q('select user_id, characters, requests from public.translation_spend order by characters, requests')).rows;
      assert(rows.length === 2 && rows.every((r) => r.characters === 100), `the count is wrong: ${JSON.stringify(rows)}`);
      assert(rows.find((r) => r.user_id === member).requests === 2, 'requests were not counted');
      const columns = (await q(`select column_name from information_schema.columns where table_schema='public' and table_name='translation_spend'`)).rows.map((r) => r.column_name).sort();
      assert(columns.join(',') === 'characters,day,requests,user_id', `the table holds more than a count: ${columns}`);
      // Yesterday does not count against today.
      await q(`update public.translation_spend set day = day - 1 where user_id=$1`, [member]);
      await spend(member, 100);
    } finally { await set('platform.translate', 'false'); await reset(); }
  });

  await test('the month is a ceiling: members stop at four fifths, staff at the whole, and staff have no day', async () => {
    await set('platform.translate', 'true');
    try {
      await reset();
      await set('platform.translate_daily_characters', 50);
      await set('platform.translate_monthly_characters', 1000);
      // Staff are not held to the day.
      await spend(admin, 700);
      await set('platform.translate_daily_characters', 5000);
      await spend(member, 100);
      await rejects(() => spend(member, 1), /translate:month_spent/);
      await rejects(() => spend(other, 1), /translate:month_spent/);
      await spend(admin, 200);
      await rejects(() => spend(admin, 1), /translate:month_spent/);
      const month = (await asActor(admin, 'select public.translation_month() r')).rows[0].r;
      assert(month.characters === 1000 && month.requests === 3 && month.people === 2 && month.monthly === 1000 && month.on === true,
        `the month's figures are wrong: ${JSON.stringify(month)}`);
      // Last month's use is not this month's.
      await q(`update public.translation_spend set day = (date_trunc('month', day) - interval '1 day')::date where user_id=$1`, [admin]);
      await spend(member, 500);
    } finally { await set('platform.translate', 'false'); await reset(); }
  });

  await test('nobody signed out, closed or unprivileged gets past the edges', async () => {
    await set('platform.translate', 'true');
    try {
      await reset();
      await rejects(() => asAnon(() => q('select public.spend_translation(10)')), /translate:not_signed_in/);
      await rejects(() => asActor(member, 'select public.translation_month()'), /translate:not_allowed/);
      await rejects(() => asActor(member, 'select * from public.translation_spend'), /permission denied/);
      await rejects(() => asActor(admin, 'select * from public.translation_spend'), /permission denied/);
      // An account that is not active is nobody here.
      const gone = await newUser('translate-suspended@example.com');
      await newProfile(gone, 'Translate Suspended');
      assert((await spend(gone, 10)) !== null, 'an active account was refused');
      await committed(async () => {
        await q("select set_config('app.account_erasure','on',true)");
        await q("update public.user_profiles set account_status='suspended' where user_id=$1", [gone]);
      });
      await rejects(() => spend(gone, 10), /translate:not_signed_in/);
    } finally { await set('platform.translate', 'false'); await reset(); }
  });
}
