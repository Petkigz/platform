// The outbox.
//
// `delivery.notifications` ships off and no provider exists, so the thing that
// can be built honestly is the part before delivery: a named template, rendered
// with the values the caller supplies, written down with who queued it and
// when. The tests hold three properties that matter more than the plumbing —
// that a message cannot be sent with a placeholder in it, that only staff can
// queue or read one, and that nothing is ever marked `sent` by this code.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, grantRole,
  } = ctx;

  const admin = await bootstrapAdmin('msg-admin@example.com');
  const staff = await newUser('msg-staff@example.com');
  await newProfile(staff, 'Support Agent');
  await grantRole(staff, 'support_agent', admin);

  const learner = await newUser('msg-learner@example.com');
  await newProfile(learner, 'Learner');

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

  const receipt = {
    name: 'Amina',
    amount: 'UGX 25,000',
    course: 'Tajweed for beginners',
    reference: 'AS-1042',
  };

  const queue = (actor, params) => asActor(actor,
    "select public.queue_message($1,$2,$3,$4,$5::jsonb) id", params);

  await test('the templates that exist name their channel and their purpose', async () => {
    const rows = (await q(
      `select code, channel, purpose, subject_template
         from public.message_templates order by code`)).rows;
    assert(rows.length === 2, `expected 2 templates, found ${rows.length}`);
    assert(rows.every((r) => r.channel === 'email'), 'every seeded template is email');
    assert(rows.some((r) => r.code === 'receipt_email' && r.purpose === 'receipt'),
      'no receipt template');
    assert(rows.some((r) => r.code === 'invite_email' && r.purpose === 'invite'),
      'no invite template');
    assert(rows.every((r) => r.subject_template && r.subject_template.length > 0),
      'an email template has no subject');
  });

  await test('a receipt is rendered with every value the caller supplied', async () => {
    const { id } = (await queue(staff, [
      'email', 'receipt_email', 'parent@example.com', 'receipt', receipt,
    ])).rows[0];

    const row = (await q(
      `select channel, template_code, purpose, to_address, subject, body, payload,
              status, provider, sent_at, created_by
         from public.outbound_messages where id=$1`, [id])).rows[0];
    assert(row.channel === 'email');
    assert(row.template_code === 'receipt_email');
    assert(row.purpose === 'receipt');
    assert(row.to_address === 'parent@example.com');
    assert(row.subject.includes('AS-1042'), `subject was ${row.subject}`);
    assert(row.body.includes('UGX 25,000'), 'the amount is not in the body');
    assert(row.body.includes('Tajweed for beginners'), 'the course is not in the body');
    assert(row.body.includes('Amina'), 'the name is not in the body');
    assert(!row.body.includes('{{'), 'a placeholder survived rendering');
    assert(row.status === 'queued', `a new message is ${row.status}`);
    assert(row.provider === null && row.sent_at === null,
      'a message with no provider was recorded as sent');
    assert(row.created_by === staff, 'the row does not say who queued it');
    assert(row.payload.reference === 'AS-1042', 'the payload was not kept');
  });

  await test('an unknown template is refused by name', async () => {
    await rejects(() => queue(staff, [
      'email', 'no_such_template', 'parent@example.com', 'receipt', {},
    ]), /no message template no_such_template/);
  });

  await test('an unfilled placeholder is refused, and it names the placeholder', async () => {
    await rejects(() => queue(staff, [
      'email', 'receipt_email', 'parent@example.com', 'receipt',
      { name: 'Amina', course: 'Tajweed', reference: 'AS-1' },
    ]), /\{\{amount\}\}/);
  });

  await test('a template cannot be used on another channel or for another purpose', async () => {
    await rejects(() => queue(staff, [
      'sms', 'receipt_email', '+256700000000', 'receipt', receipt,
    ]), /is a email template, not sms/);
    await rejects(() => queue(staff, [
      'email', 'invite_email', 'parent@example.com', 'receipt', receipt,
    ]), /is for invite, not receipt/);
  });

  await test('a learner cannot queue a message', async () => {
    await rejects(() => queue(learner, [
      'email', 'receipt_email', 'parent@example.com', 'receipt', receipt,
    ]), /only staff or the platform may queue a message/);
  });

  await test('the system path queues without an actor', async () => {
    // A confirmed payment queues a receipt with nobody signed in. The function
    // treats a null actor as the platform rather than refusing it, which is
    // what lets record_payment_success() call it later without faking a user.
    const { id } = (await q(
      "select public.queue_message('email','receipt_email','system@example.com','receipt',$1::jsonb) id",
      [receipt])).rows[0];
    const row = (await q(
      `select created_by, status from public.outbound_messages where id=$1`, [id])).rows[0];
    assert(row.created_by === null, 'a system message was attributed to a person');
    assert(row.status === 'queued');
  });

  await test('only staff can read the outbox', async () => {
    const seen = (await asActor(learner,
      'select id from public.outbound_messages')).rows.length;
    assert(seen === 0, `a learner read ${seen} messages`);

    const staffSeen = (await asActor(staff,
      'select id from public.outbound_messages')).rows.length;
    assert(staffSeen >= 2, `staff read only ${staffSeen} messages`);
  });

  await test('nothing in the table is marked sent, and a sent row needs a provider', async () => {
    const sent = (await q(
      `select id from public.outbound_messages where status='sent'`)).rows.length;
    assert(sent === 0, `${sent} messages claim to have been sent with no provider`);

    // The constraint, not the absence of a caller, is what will keep that true
    // when a dispatcher exists.
    const one = (await q(`select id from public.outbound_messages limit 1`)).rows[0].id;
    await rejects(() => q(
      `update public.outbound_messages set status='sent', sent_at=now() where id=$1`,
      [one]),
      /om_sent_has_provider/);
  });
}
