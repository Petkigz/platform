// What became of a message after the provider took it (20261281162000): the
// provider's word recorded once, and a dead or complaining address added to
// the do-not-send list from the platform's own row.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('events-admin@example.com');
  const visitor = await newUser('events-visitor@example.com');
  await newProfile(visitor, 'Events Visitor');

  let step = 0;
  async function as(role, actor, sql, params = []) {
    const point = `events_${step += 1}`;
    await q(`savepoint ${point}`);
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify(actor ? { sub: actor, role } : { role })]);
    await q(`set local role ${role}`);
    try {
      const result = await q(sql, params);
      await q('reset role');
      await q(`release savepoint ${point}`);
      return result;
    } catch (e) {
      await q(`rollback to savepoint ${point}`);
      throw e;
    }
  }
  const FN = 'record_provider_event($1,$2,$3,$4,$5,$6)';
  const service = async (params) => (await as('service_role', null, `select public.${FN} as r`, params)).rows[0].r;
  const event = (id, kind, reference, permanent = false, at = null) => service(['resend', id, kind, reference, permanent, at]);

  // A message the provider accepted, as the dispatcher leaves it.
  async function sentTo(address, reference) {
    return (await q(
      `insert into public.outbound_messages
         (channel, template_code, purpose, to_address, subject, body, status, provider, provider_reference, sent_at, attempts)
       select 'email', 'receipt_email', 'receipt', $1, 'A subject', 'A body.',
              'sent', 'resend', $2, now(), 1
       returning id`, [address, reference])).rows[0].id;
  }
  const message = async (id) => (await q(
    `select status, provider_outcome, provider_outcome_at from public.outbound_messages where id = $1`, [id])).rows[0];
  const suppressed = async (address) => (await q(
    `select reason, source, suppressed_by from public.message_suppressions where channel = 'email' and address = $1`, [address])).rows;

  console.log('\nWhat became of a message after the provider took it');

  await q('begin');
  try {
    await test('delivered is recorded on the message and suppresses nobody', async () => {
      const id = await sentTo('Arrives@Example.com', 'ref-delivered');
      const said = await event('evt-1', 'delivered', 'ref-delivered', false, '2026-11-26T08:00:00Z');
      assert(said.state === 'recorded' && said.kind === 'delivered', JSON.stringify(said));
      const row = await message(id);
      assert(row.status === 'sent' && row.provider_outcome === 'delivered', JSON.stringify(row));
      assert(new Date(row.provider_outcome_at).toISOString() === '2026-11-26T08:00:00.000Z');
      assert((await suppressed('arrives@example.com')).length === 0);
    });

    await test('a permanent bounce suppresses the address the platform wrote to, once, and is audited', async () => {
      const id = await sentTo(' Gone@Example.com', 'ref-bounced');
      const said = await event('evt-2', 'bounced', 'ref-bounced', true);
      assert(said.state === 'suppressed' && said.kind === 'bounced', JSON.stringify(said));
      const rows = await suppressed('gone@example.com');
      assert(rows.length === 1 && rows[0].source === 'bounce' && rows[0].suppressed_by === null, JSON.stringify(rows));
      assert(/permanently refused/.test(rows[0].reason));
      assert((await message(id)).provider_outcome === 'bounced');
      const audit = (await q(
        `select actor, detail from public.governance_audit_events
          where action = 'delivery.address_suppressed_by_provider' and target_id = $1`, [id])).rows;
      assert(audit.length === 1 && audit[0].actor === null && audit[0].detail.kind === 'bounced' && audit[0].detail.alreadySuppressed === false,
        JSON.stringify(audit));
      // The audit entry does not carry the address.
      assert(!JSON.stringify(audit).toLowerCase().includes('gone@example.com'));

      // The provider sends the same event again: nothing changes.
      const again = await event('evt-2', 'bounced', 'ref-bounced', true);
      assert(again.state === 'seen', JSON.stringify(again));
      assert((await q(`select count(*)::int n from public.provider_events where event_id = 'evt-2'`)).rows[0].n === 1);
      assert((await q(`select count(*)::int n from public.governance_audit_events
                        where action = 'delivery.address_suppressed_by_provider' and target_id = $1`, [id])).rows[0].n === 1);

      // The next message to that address is not queued to be sent.
      const next = (await as('authenticated', admin,
        `select public.queue_message('email','receipt_email','GONE@example.com','receipt',$1) as id`,
        [JSON.stringify({ name: 'A family', amount: 'UGX 30,000', course: 'A course', reference: 'R-1', date: '26 November 2026' })])).rows[0].id;
      assert((await message(next)).status === 'suppressed', 'a message was queued to an address that bounced');
    });

    await test('a complaint suppresses; a delay or a bounce not called permanent does not', async () => {
      await sentTo('complains@example.com', 'ref-complained');
      const said = await event('evt-3', 'complained', 'ref-complained');
      assert(said.state === 'suppressed' && said.kind === 'complained');
      const rows = await suppressed('complains@example.com');
      assert(rows.length === 1 && rows[0].source === 'complaint' && /marked a message from the platform as spam/.test(rows[0].reason));

      const full = await sentTo('full@example.com', 'ref-soft');
      assert((await event('evt-4', 'delayed', 'ref-soft')).state === 'recorded');
      assert((await event('evt-5', 'bounced', 'ref-soft', false)).state === 'recorded');
      assert((await event('evt-6', 'failed', 'ref-soft')).state === 'recorded');
      assert((await suppressed('full@example.com')).length === 0, 'a temporary failure suppressed an address');
      assert((await message(full)).provider_outcome === 'bounced');
    });

    await test('a graver word is not overwritten by a later, lesser one', async () => {
      const id = await sentTo('order@example.com', 'ref-order');
      await event('evt-7', 'delivered', 'ref-order', false, '2026-11-26T08:00:00Z');
      await event('evt-8', 'complained', 'ref-order', false, '2026-11-26T09:00:00Z');
      await event('evt-9', 'delivered', 'ref-order', false, '2026-11-26T10:00:00Z');
      await event('evt-10', 'delayed', 'ref-order', false, '2026-11-26T11:00:00Z');
      const row = await message(id);
      assert(row.provider_outcome === 'complained' && new Date(row.provider_outcome_at).toISOString() === '2026-11-26T09:00:00.000Z',
        JSON.stringify(row));
      assert((await q(`select count(*)::int n from public.provider_events where provider_reference = 'ref-order'`)).rows[0].n === 4);
    });

    await test('a reference that is not a message in the outbox is recorded and suppresses nothing', async () => {
      const before = (await q(`select count(*)::int n from public.message_suppressions`)).rows[0].n;
      const said = await event('evt-11', 'bounced', 'ref-nobody-sent', true);
      assert(said.state === 'unknown_message', JSON.stringify(said));
      assert((await q(`select count(*)::int n from public.message_suppressions`)).rows[0].n === before);
      const row = (await q(`select message_id, suppressed from public.provider_events where event_id = 'evt-11'`)).rows[0];
      assert(row.message_id === null && row.suppressed === false);
      // Another provider's message under the same reference is not this provider's.
      await q(`update public.outbound_messages set provider = 'another' where provider_reference = 'ref-delivered'`);
      assert((await event('evt-12', 'bounced', 'ref-delivered', true)).state === 'unknown_message');
      assert((await suppressed('arrives@example.com')).length === 0);
    });

    await test('when a message is removed, what was said about it goes with it', async () => {
      const id = await sentTo('leaves@example.com', 'ref-leaves');
      await event('evt-20', 'delivered', 'ref-leaves');
      assert((await q(`select count(*)::int n from public.provider_events where message_id = $1`, [id])).rows[0].n === 1);
      await q(`delete from public.outbound_messages where id = $1`, [id]);
      assert((await q(`select count(*)::int n from public.provider_events where provider_reference = 'ref-leaves'`)).rows[0].n === 0);
    });

    await test('only the service role records one, and what it is given is checked', async () => {
      for (const who of [visitor, admin]) {
        await rejects(() => as('authenticated', who, `select public.${FN}`, ['resend', 'evt-x', 'bounced', 'ref-bounced', true, null]), /permission denied/);
      }
      await rejects(() => as('anon', null, `select public.${FN}`, ['resend', 'evt-x', 'bounced', 'ref-bounced', true, null]), /permission denied/);
      await rejects(() => service(['somebody', 'evt-x', 'bounced', 'ref-bounced', true, null]), /unknown provider/);
      await rejects(() => service(['resend', 'evt-x', 'opened', 'ref-bounced', true, null]), /unknown provider event/);
      await rejects(() => service(['resend', '  ', 'bounced', 'ref-bounced', true, null]), /are required/);
      await rejects(() => service(['resend', 'evt-x', 'bounced', '', true, null]), /are required/);
      await rejects(() => service(['resend', 'x'.repeat(201), 'bounced', 'ref-bounced', true, null]), /are required/);
      // Nobody writes the register directly, and a visitor does not read it.
      for (const role of ['anon', 'authenticated']) {
        for (const right of ['INSERT', 'UPDATE', 'DELETE']) {
          assert((await q(`select has_table_privilege($1, 'public.provider_events', $2) as yes`, [role, right])).rows[0].yes === false, `${role} ${right}`);
        }
      }
      assert((await as('authenticated', visitor, `select count(*)::int n from public.provider_events`)).rows[0].n === 0, 'a visitor reads provider events');
      assert((await as('authenticated', admin, `select count(*)::int n from public.provider_events`)).rows[0].n > 0, 'the owner cannot read them');
      // No address is kept in it.
      const columns = (await q(`select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'provider_events' order by 1`)).rows.map((r) => r.column_name);
      assert(!columns.some((c) => /address|email|recipient/.test(c)), columns.join(', '));
    });
  } finally {
    await q('rollback');
  }
}
