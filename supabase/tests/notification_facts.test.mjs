// A notification kept as what it is made of.
//
// The six writers are exercised where they always were (notifications, media
// encode notifications, live cancellation, live recording), and each of those
// suites now reads `facts` beside the sentence. This suite holds what is true
// of the column and of the function that fills it, whoever calls it.

export async function run(ctx) {
  const { q, test, assert, rejects, newUser, newProfile } = ctx;

  const reader = await newUser('facts-reader@example.com');
  await newProfile(reader, 'Facts Reader');
  const other = await newUser('facts-other@example.com');
  await newProfile(other, 'Facts Other');

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
  const centre = (actor) =>
    asActor(actor, 'select public.my_notifications(30) n').then((r) => r.rows[0].n);

  console.log('\nWhat a message is made of');

  await test('a message written the old way has no facts, and is still a message', async () => {
    await q(`select public.notify_user($1,'payout_paid','Your payout has been sent','20000 UGX was sent under reference OLD-1.','/teach/payouts','info','facts-old')`, [reader]);
    const box = await centre(reader);
    const message = box.recent.find((m) => /OLD-1/.test(m.body));
    assert(message, 'the old message was not in the centre');
    assert('facts' in message && message.facts === null, `facts were ${JSON.stringify(message.facts)}`);
    assert(message.title === 'Your payout has been sent');
  });

  await test('the old function is untouched: seven arguments, the same defaults', async () => {
    const id = (await scalar(`select public.notify_user($1,'payout_paid','Short','Call') id`, [reader])).id;
    const row = await scalar('select href, severity, dedupe_key, facts from public.notifications where id = $1', [id]);
    assert(row.href === null && row.severity === 'info' && row.dedupe_key === null && row.facts === null, JSON.stringify(row));
    const n = (await scalar(`select count(*)::int n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
                              where s.nspname = 'public' and p.proname = 'notify_user'`)).n;
    assert(n === 2, `there are ${n} functions called notify_user`);
  });

  await test('a message written with facts is read with them, as they were given', async () => {
    const facts = { amountMinor: '150000', currency: 'KES', reference: 'REF "quoted" <b>' };
    await q(`select public.notify_user($1,'payout_paid','Your payout has been sent','150000 KES was sent under reference X.','/teach/payouts','info','facts-new',$2::jsonb)`,
      [reader, JSON.stringify(facts)]);
    const box = await centre(reader);
    const message = box.recent.find((m) => m.facts && m.facts.currency === 'KES');
    assert(message, 'the message with facts was not in the centre');
    assert(JSON.stringify(message.facts) === JSON.stringify(facts) || Object.keys(facts).every((k) => message.facts[k] === facts[k]),
      JSON.stringify(message.facts));
    // The sentence is still written: the export and an older reader see what they saw.
    assert(message.body === '150000 KES was sent under reference X.');
  });

  await test('the same event twice is still one message, and the first is the one kept', async () => {
    const second = (await scalar(`select public.notify_user($1,'payout_paid','Again','Again','/teach/payouts','info','facts-new',$2::jsonb) id`,
      [reader, JSON.stringify({ amountMinor: '1', currency: 'KES', reference: 'second' })])).id;
    assert(second === null, 'a repeat of the same key wrote a second message');
    const row = await scalar(`select facts from public.notifications where user_id = $1 and dedupe_key = 'facts-new'`, [reader]);
    assert(row.facts.amountMinor === '150000', JSON.stringify(row.facts));
  });

  await test('facts are given by name or not at all', async () => {
    for (const bad of ['[1,2]', '"text"', '7', 'true']) {
      await rejects(
        () => q(`select public.notify_user($1,'payout_paid','T','B',null,'info',null,$2::jsonb)`, [reader, bad]),
        /given by name/i, `facts of ${bad} were accepted`);
    }
    await rejects(
      () => q(`insert into public.notifications (user_id, kind, title, body, facts) values ($1,'payout_paid','T','B','[]'::jsonb)`, [reader]),
      /notifications_facts_is_an_object/, 'the table took facts that are a list');
    // No facts is allowed, and a missing severity is the ordinary one.
    const id = (await scalar(`select public.notify_user($1,'payout_paid','T','B',null,null,null,null) id`, [reader])).id;
    const row = await scalar('select severity, facts from public.notifications where id = $1', [id]);
    assert(row.severity === 'info' && row.facts === null, JSON.stringify(row));
  });

  await test('nobody is needed and nobody else is asked: it still needs a reader', async () => {
    await rejects(
      () => q(`select public.notify_user(null,'payout_paid','T','B',null,'info',null,'{}'::jsonb)`),
      /somebody to read it/i, 'a message for nobody was written');
  });

  await test('a signed-in person cannot write a message, with facts or without', async () => {
    await rejects(
      () => asActor(other, `select public.notify_user($1,'payout_paid','T','B',null,'info',null,'{}'::jsonb)`, [reader]),
      /permission denied/i, 'a signed-in person wrote somebody a message with facts');
    await rejects(
      () => asActor(other, `select public.notify_user($1,'payout_paid','T','B')`, [reader]),
      /permission denied/i, 'a signed-in person wrote somebody a message');
    for (const role of ['anon', 'authenticated']) {
      const row = await scalar(
        `select has_function_privilege($1, 'public.notify_user(uuid,text,text,text,text,text,text,jsonb)', 'execute') as may`, [role]);
      assert(row.may === false, `${role} may execute notify_user with facts`);
    }
  });

  await test('one person\'s facts are not another person\'s to read', async () => {
    const box = await centre(other);
    assert(box.recent.length === 0, `somebody else's centre held ${box.recent.length}`);
    const direct = await asActor(other, 'select id, facts from public.notifications');
    assert(direct.rows.length === 0, `a direct read returned ${direct.rows.length} rows`);
  });
}
