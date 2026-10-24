// The delivery contract: the half of a sending system that is not HTTP.
//
// There is still no provider and no credential. What this suite covers is the
// set of decisions that make the eventual HTTP call safe to make — a lease so
// two dispatchers cannot both send, a backoff so a broken provider is not
// hammered, a dead letter so a bad address stops trying, and a do-not-send list
// so the next message to that address is not sent either.
//
// The most important test here is the one about `queue_message()`: it runs
// inside payment confirmation, so it must never raise for a suppressed address.
// A message the platform chose not to send is recorded, not dropped, and a
// receipt that could not be emailed must not refuse a payment that was taken.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed, bootstrapAdmin, newUser, newProfile, grantRole,
  } = ctx;

  const admin = await bootstrapAdmin('dlv-admin@example.com');
  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
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

  /** Delivery is off by default; the queue is the switch's subject. */
  async function withDelivery(fn) {
    await committed(async () => {
      await q(`update public.platform_settings set value_text = 'true'
               where key = 'delivery.notifications'`);
    });
    try {
      return await fn();
    } finally {
      await committed(async () => {
        await q(`update public.platform_settings set value_text = 'false'
                 where key = 'delivery.notifications'`);
      });
    }
  }

  let seq = 0;
  const freshAddress = () => {
    seq += 1;
    return `family-${seq}-${crypto.randomUUID().slice(0, 8)}@example.com`;
  };

  /** A queued message, made the way the platform makes one. */
  async function queue(address = freshAddress(), data = {}) {
    return asActor(admin, `select public.queue_message('email','receipt_email',$1,'receipt',$2) id`,
      [address, JSON.stringify({
        name: 'A family',
        amount: 'UGX 30,000',
        course: 'A course',
        reference: `AS-${seq}`,
        ...data,
      })]).then((r) => r.rows[0].id);
  }

  const claim = (limit = 20) =>
    asActor(admin, 'select public.claim_outbound_messages($1) c', [limit])
      .then((r) => r.rows[0].c);

  const outcome = (id, kind, provider = null, reference = null, error = null) =>
    asActor(admin, 'select public.record_delivery_outcome($1,$2,$3,$4,$5) r',
      [id, kind, provider, reference, error]).then((r) => r.rows[0].r);

  const row = (id) => scalar('select * from public.outbound_messages where id = $1', [id]);

  // -------------------------------------------------------------------------
  console.log('\nThe switch is the switch');
  // -------------------------------------------------------------------------

  await test('nothing is claimed while delivery is off', async () => {
    await queue();
    const result = await claim();
    assert(result.disabled === true, 'a claim was made with the feature off');
    assert(result.claimed.length === 0, `${result.claimed.length} message(s) claimed`);
    assert(/delivery.notifications is off/i.test(result.reason), `it said ${result.reason}`);
  });

  await test('with delivery on, a queued message is leased to the dispatcher', async () => {
    await withDelivery(async () => {
      const id = await queue();
      const result = await claim();
      assert(result.disabled === false, 'the claim says delivery is still off');
      assert(result.claimed.length >= 1, 'nothing was claimed');
      const mine = result.claimed.find((c) => c.id === id);
      assert(mine, 'the message I queued was not claimed');
      // The lease is what stops a second run taking it.
      const stored = await row(id);
      assert(stored.claimed_until !== null, 'no lease was written');
      assert(stored.claimed_by === admin, 'the lease does not name who holds it');
      // And the dispatcher is given what it needs to send, not an id to go and
      // look up again.
      assert(mine.body && mine.body.length > 20, 'the claim carried no body');
      assert(mine.to === stored.to_address, 'the claim carried the wrong address');
    });
  });

  await test('a second claim cannot take a message the first one holds', async () => {
    await withDelivery(async () => {
      const id = await queue();
      await claim();
      const second = await claim();
      assert(!second.claimed.some((c) => c.id === id),
        'the same message was handed out twice');
    });
  });

  await test('an expired lease hands the message back', async () => {
    // A dispatcher that dies mid-send must not strand the row. The lease is
    // short for exactly this reason.
    await withDelivery(async () => {
      const id = await queue();
      await claim();
      await q(`update public.outbound_messages
                  set claimed_until = now() - interval '1 minute' where id = $1`, [id]);
      const again = await claim();
      assert(again.claimed.some((c) => c.id === id), 'the message never came back');
    });
  });

  await test('only a claim can be settled', async () => {
    await withDelivery(async () => {
      const id = await queue();
      await rejects(
        () => outcome(id, 'sent', 'postmark', 'ref-1'),
        /not claimed by anybody/i);
      // And nothing was written.
      assert((await row(id)).status === 'queued', 'an unclaimed message was marked sent');
    });
  });

  // -------------------------------------------------------------------------
  console.log('\nA delivery has to be provable');
  // -------------------------------------------------------------------------

  await test('sent needs the provider and its own reference', async () => {
    await withDelivery(async () => {
      const id = await queue();
      await claim();

      await rejects(() => outcome(id, 'sent', null, 'ref-1'),
        /names the provider/i);
      await rejects(() => outcome(id, 'sent', 'postmark', null),
        /provider's own reference/i);

      const result = await outcome(id, 'sent', 'postmark', 'pm-12345');
      assert(result.status === 'sent', `status was ${result.status}`);

      const stored = await row(id);
      assert(stored.status === 'sent', 'it was not stored as sent');
      assert(stored.sent_at !== null, 'no time of sending');
      assert(stored.provider === 'postmark', `provider was ${stored.provider}`);
      assert(stored.provider_reference === 'pm-12345', 'the reference was not kept');
      assert(stored.claimed_until === null, 'the lease was not released');
    });
  });

  await test('an outcome that is not one of the three is refused', async () => {
    await withDelivery(async () => {
      const id = await queue();
      await claim();
      await rejects(() => outcome(id, 'delivered', 'postmark', 'r'), /sent, error or bounce/i);
    });
  });

  // -------------------------------------------------------------------------
  console.log('\nA broken provider is not hammered');
  // -------------------------------------------------------------------------

  await test('a retryable failure waits, and the wait grows', async () => {
    await withDelivery(async () => {
      const id = await queue();
      await claim();

      const first = await outcome(id, 'error', null, null, 'provider timed out');
      assert(first.status === 'queued', `status became ${first.status}`);
      assert(first.backoffMinutes === 5, `first backoff was ${first.backoffMinutes}`);

      const stored = await row(id);
      assert(stored.attempts === 1, `attempts is ${stored.attempts}`);
      assert(stored.last_error === 'provider timed out', 'the error was not kept');
      assert(stored.claimed_until === null, 'the lease was not released');
      // It is queued but not eligible: the backoff is a clock, not a status.
      const immediate = await claim();
      assert(!immediate.claimed.some((c) => c.id === id),
        'the message was handed out again before its backoff passed');
    });
  });

  await test('the schedule is one place: 5, 15, 60, 240, then 720', async () => {
    const schedule = (await q(
      'select a, b, c, d, e, f from (select '
      + 'public.delivery_backoff_minutes(1) a, public.delivery_backoff_minutes(2) b, '
      + 'public.delivery_backoff_minutes(3) c, public.delivery_backoff_minutes(4) d, '
      + 'public.delivery_backoff_minutes(5) e, public.delivery_backoff_minutes(9) f) t')).rows[0];
    assert(schedule.a === 5 && schedule.b === 15 && schedule.c === 60
      && schedule.d === 240 && schedule.e === 720 && schedule.f === 720,
      `the schedule is ${JSON.stringify(schedule)}`);
  });

  await test('after the ceiling it is a dead letter, and stays dead', async () => {
    await withDelivery(async () => {
      await committed(async () => {
        await q(`update public.platform_settings set value_text = '2'
                 where key = 'delivery.max_attempts'`);
      });
      try {
        const id = await queue();
        await claim();
        const first = await outcome(id, 'error', null, null, 'still down');
        assert(first.deadLettered === undefined || first.deadLettered === false,
          'one failure dead-lettered at a ceiling of two');

        // Make it eligible again without waiting out the backoff.
        await q(`update public.outbound_messages set next_attempt_at = now() - interval '1 minute'
                  where id = $1`, [id]);
        await claim();
        const second = await outcome(id, 'error', null, null, 'still down');
        assert(second.status === 'failed', `status was ${second.status}`);
        assert(second.deadLettered === true, 'the ceiling was reached and it did not die');

        const stored = await row(id);
        assert(stored.dead_lettered_at !== null, 'no moment of death');
        assert(stored.claimed_until === null, 'a dead letter kept its lease');

        // And it is not handed out again, however long the queue runs.
        await q(`update public.outbound_messages set next_attempt_at = now() - interval '1 day'
                  where id = $1`, [id]);
        const later = await claim();
        assert(!later.claimed.some((c) => c.id === id), 'a dead letter was retried by the queue');
      } finally {
        await committed(async () => {
          await q(`update public.platform_settings set value_text = '5'
                   where key = 'delivery.max_attempts'`);
        });
      }
    });
  });

  await test('a dead letter is audited, because it needs a person', async () => {
    const event = await scalar(
      `select actor, detail from public.governance_audit_events
        where action = 'delivery.dead_lettered'
        order by occurred_at desc limit 1`);
    assert(event, 'no dead letter was recorded in the audit');
    assert(/still down/.test(event.detail.error), `the audit kept ${event.detail.error}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nA bad address stops being written to');
  // -------------------------------------------------------------------------

  await test('a bounce suppresses that message and every future one to the address', async () => {
    await withDelivery(async () => {
      const address = freshAddress();
      const id = await queue(address);
      await claim();
      const result = await outcome(id, 'bounce', null, null, 'mailbox does not exist');
      assert(result.status === 'suppressed', `status was ${result.status}`);

      const stored = await row(id);
      assert(stored.suppressed_reason === 'mailbox does not exist', 'the reason was not kept');

      // The list is what makes it permanent, and it is normalised so a
      // differently-capitalised spelling cannot route around it.
      const blocked = await scalar(
        'select reason from public.message_suppressions where address = $1',
        [address.toLowerCase()]);
      assert(blocked && blocked.reason === 'mailbox does not exist',
        'the address is not on the do-not-send list');

      // And the next receipt is written, but not queued.
      const next = await queue(address.toUpperCase());
      assert((await row(next)).status === 'suppressed',
        'a later message to a bounced address was still queued');
    });
  });

  await test('queueing to a suppressed address records the message instead of dropping it', async () => {
    // The distinction that matters: a family is still owed a receipt, and the
    // record says we chose not to send it. Silently skipping would make the
    // outbox a liar about what the platform did.
    await withDelivery(async () => {
      const address = freshAddress();
      await asActor(admin, `select public.suppress_address('email',$1,$2) r`,
        [address, 'Asked us to stop']);

      const id = await queue(address);
      const stored = await row(id);
      assert(stored.status === 'suppressed', `status was ${stored.status}`);
      assert(stored.suppressed_reason === 'Asked us to stop',
        `reason was ${stored.suppressed_reason}`);
      assert(stored.body && stored.body.length > 20, 'the message body was not rendered');
    });
  });

  await test('suppressing an address stops what is already queued for it', async () => {
    await withDelivery(async () => {
      const address = freshAddress();
      const id = await queue(address);
      assert((await row(id)).status === 'queued', 'the fixture did not queue');

      const result = await asActor(admin,
        `select public.suppress_address('email',$1,$2) r`,
        [address, 'Hard bounce from the provider dashboard']).then((r) => r.rows[0].r);
      assert(result.stoppedQueued >= 1, `it stopped ${result.stoppedQueued}`);
      assert((await row(id)).status === 'suppressed', 'a queued message survived the suppression');
    });
  });

  await test('a suppression needs a written reason', async () => {
    await rejects(
      () => asActor(admin, `select public.suppress_address('email',$1,$2) r`,
        [freshAddress(), '  ']),
      /say why/i);
  });

  // -------------------------------------------------------------------------
  console.log('\nThe way back');
  // -------------------------------------------------------------------------

  await test('a dead letter can be retried with a reason, and starts clean', async () => {
    await withDelivery(async () => {
      await committed(async () => {
        await q(`update public.platform_settings set value_text = '1'
                 where key = 'delivery.max_attempts'`);
      });
      try {
        const id = await queue();
        await claim();
        await outcome(id, 'error', null, null, 'provider was down');

        const result = await asActor(admin,
          'select public.retry_outbound_message($1,$2) r',
          [id, 'Provider confirmed the outage is over']).then((r) => r.rows[0].r);
        assert(result.attempts === 0, 'the attempt count was not reset');

        const stored = await row(id);
        assert(stored.status === 'queued', `status is ${stored.status}`);
        assert(stored.dead_lettered_at === null, 'it is still marked as dead');
        assert(stored.attempts === 0, 'attempts were not reset');
        assert(stored.next_attempt_at <= new Date(Date.now() + 1000),
          'it is not eligible immediately');

        const event = await scalar(
          `select detail from public.governance_audit_events
            where action = 'delivery.retried' order by occurred_at desc limit 1`);
        assert(/provider was down/.test(event.detail.previousError),
          'the error it died on was not kept in the audit');
      } finally {
        await committed(async () => {
          await q(`update public.platform_settings set value_text = '5'
                   where key = 'delivery.max_attempts'`);
        });
      }
    });
  });

  await test('a message that is not dead cannot be "retried"', async () => {
    await withDelivery(async () => {
      const id = await queue();
      await rejects(
        () => asActor(admin, 'select public.retry_outbound_message($1,$2) r', [id, 'Why not']),
        /nothing to revive/i);
    });
  });

  await test('a dead letter to a suppressed address will not be revived', async () => {
    // Sending to it again is the one thing the list exists to prevent, so the
    // refusal points at the list rather than quietly doing it.
    await withDelivery(async () => {
      const address = freshAddress();
      const id = await queue(address);
      await claim();
      await outcome(id, 'bounce', null, null, 'mailbox does not exist');
      await q(`update public.outbound_messages
                  set status = 'failed', dead_lettered_at = now() where id = $1`, [id]);

      await rejects(
        () => asActor(admin, 'select public.retry_outbound_message($1,$2) r',
          [id, 'Try again']),
        /do-not-send list/i);
    });
  });

  // -------------------------------------------------------------------------
  console.log('\nWho may do any of this');
  // -------------------------------------------------------------------------

  await test('a learner can neither dispatch, settle nor suppress', async () => {
    const learner = await newUser('dlv-learner@example.com');
    await newProfile(learner, 'Learner');
    await rejects(() => asActor(learner, 'select public.claim_outbound_messages(5)'),
      /only platform staff/i);
    await rejects(() => asActor(learner, "select public.record_delivery_outcome($1,'sent','p','r')",
      ['00000000-0000-0000-0000-000000000000']), /only platform staff/i);
    await rejects(() => asActor(learner, "select public.suppress_address('email',$1,$2)",
      [freshAddress(), 'No']), /only platform staff/i);
    await rejects(() => asActor(learner, 'select public.outbox_standing()'),
      /only platform staff/i);
  });

  await test('the standing says delivery is off and how many are waiting', async () => {
    const standing = await asActor(admin, 'select public.outbox_standing() s')
      .then((r) => r.rows[0].s);
    assert(standing.deliveryEnabled === false, 'the standing claims delivery is on');
    assert(typeof standing.counts.queued === 'number', 'no queued count');
    assert(standing.maxAttempts >= 1, 'no attempt ceiling');
    assert(Array.isArray(standing.deadLetters), 'the dead letters are not a list');
  });

  // -------------------------------------------------------------------------
  console.log('\nThe two constraints that keep the words honest');
  // -------------------------------------------------------------------------

  await test('sent without a reference is refused by the table, not only the function', async () => {
    // The function is one door. The constraint is the door being locked.
    await rejects(() => q(
      `insert into public.outbound_messages
         (channel, template_code, purpose, to_address, subject, body, status, sent_at, provider)
       values ('email','receipt_email','receipt','x@example.com','s','b','sent', now(), 'postmark')`),
      /om_sent_has_reference/);
  });

  await test('a suppressed row without a reason is refused by the table', async () => {
    await rejects(() => q(
      `insert into public.outbound_messages
         (channel, template_code, purpose, to_address, subject, body, status)
       values ('email','receipt_email','receipt','x@example.com','s','b','suppressed')`),
      /om_suppressed_has_reason/);
  });

  await test('a half-lease cannot exist', async () => {
    await rejects(() => q(
      `insert into public.outbound_messages
         (channel, template_code, purpose, to_address, subject, body, claimed_at)
       values ('email','receipt_email','receipt','x@example.com','s','b', now())`),
      /om_claim_agrees/);
  });

  await test('a failed row must carry the moment it died', async () => {
    await rejects(() => q(
      `insert into public.outbound_messages
         (channel, template_code, purpose, to_address, subject, body, status, last_error)
       values ('email','receipt_email','receipt','x@example.com','s','b','failed','nope')`),
      /om_dead_letter_agrees/);
  });
}
