// Telling somebody something, inside the application.
//
// Two kinds of message, kept apart on purpose:
//   stored  — something that happened (a payout sent, failed or cancelled)
//   derived — something about to happen (a class within a day, a renewal within
//             three), computed at read time so it cannot go stale
//
// Everything here is gated on the feature it describes, and nothing is visible
// to anybody but the person it is about.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, grantRole, committed,
    newCourse, newVersion,
  } = ctx;

  const admin = await bootstrapAdmin('notif-admin@example.com');
  const finance = await newUser('notif-finance@example.com');
  await newProfile(finance, 'Finance');
  await committed(() => grantRole(finance, 'finance_admin', admin));
  const teacher = await newInstructor('notif-teacher@example.com', admin);

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
  const badge = (actor) =>
    asActor(actor, 'select public.notification_badge() b').then((r) => r.rows[0].b);

  async function accrue(instructor, { gross = 20000, daysAgo = 40 } = {}) {
    return (await scalar(
      `insert into public.instructor_earnings_entries
         (instructor_user_id, gross_amount_minor, currency_code,
          revenue_share_percent, net_amount_minor, status, accrued_at)
       values ($1,$2,'UGX',50,$3,'accrued', now() - make_interval(days => $4)) returning id`,
      [instructor, gross, Math.round(gross / 2), daysAgo])).id;
  }

  /** A person with a learner profile, so an enrolment can point at them. */
  async function adult(name) {
    const userId = await newUser(`notif-${crypto.randomUUID().slice(0, 8)}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (linked_user_id, display_name, learner_type)
       values ($1,$2,'adult') returning id`, [userId, name])).id;
    return { userId, learnerId };
  }

  await q("select set_config('app.bypassing_code_flag','on',false)");
  await q("update public.platform_settings set value_text='true' where key='teaching.payouts'");

  // -------------------------------------------------------------------------
  console.log('\nSomething that happened');
  // -------------------------------------------------------------------------
  const payoutFor = async (person) => {
    await accrue(person);
    return asActor(person, "select public.request_instructor_payout('UGX','MTN 0772 000 000',true) p")
      .then((r) => r.rows[0].p);
  };

  await test('a payout that was sent tells the teacher it was sent', async () => {
    const id = await payoutFor(teacher);
    assert(await badge(teacher) === 0, 'a teacher had a message before anything happened');

    await asActor(finance, 'select public.complete_instructor_payout($1,$2,$3)', [id, 'MTN MoMo', 'REF-77']);

    const box = await centre(teacher);
    assert(box.unreadCount === 1, `unread was ${box.unreadCount}`);
    assert(box.recent.length === 1, `recent held ${box.recent.length}`);
    const message = box.recent[0];
    assert(message.kind === 'payout_paid', `kind was ${message.kind}`);
    assert(message.href === '/teach/payouts', `href was ${message.href}`);
    assert(/REF-77/.test(message.body), `the body did not name the reference: ${message.body}`);
    assert(await badge(teacher) === 1);
  });

  await test('a payout that failed says why, and says the money is still owed', async () => {
    const id = await payoutFor(teacher);
    await asActor(finance, 'select public.fail_instructor_payout($1,$2)', [id, 'The number was closed']);

    const box = await centre(teacher);
    const message = box.recent[0];
    assert(message.kind === 'payout_failed', `kind was ${message.kind}`);
    assert(message.severity === 'warning', `severity was ${message.severity}`);
    assert(/number was closed/i.test(message.body), `the reason was not in the body: ${message.body}`);
    assert(/still owed/i.test(message.body), `the body did not reassure: ${message.body}`);
  });

  await test('cancelling your own request says nothing; staff cancelling it does', async () => {
    const mine = await payoutFor(teacher);
    await asActor(teacher, 'select public.cancel_instructor_payout($1)', [mine]);
    const afterOwn = await centre(teacher);
    assert(afterOwn.recent.every((m) => m.kind !== 'payout_cancelled'),
      'a teacher was told about their own cancellation');

    const theirs = await payoutFor(teacher);
    await asActor(finance, 'select public.cancel_instructor_payout($1)', [theirs]);
    const afterStaff = await centre(teacher);
    assert(afterStaff.recent[0].kind === 'payout_cancelled',
      `kind was ${afterStaff.recent[0].kind}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nSomething about to happen');
  // -------------------------------------------------------------------------

  await test('a class inside a day is a reminder — and only while live classes are on', async () => {
    const person = await adult('Class Learner');
    const course = await newCourse(teacher);
    const version = await newVersion(course, teacher);
    await q(`insert into public.course_enrolments
               (learner_profile_id, course_id, course_version_id, status)
             values ($1,$2,$3,'active')`, [person.learnerId, course, version]);

    await asActor(teacher, 'select public.schedule_live_session($1,$2,$3,$4)', [
      course, "Qur'an revision", new Date(Date.now() + 2 * 3600_000).toISOString(),
      new Date(Date.now() + 3 * 3600_000).toISOString(),
    ]);

    const off = await centre(person.userId);
    assert(off.reminders.length === 0, 'a reminder appeared with live classes switched off');

    await q("update public.platform_settings set value_text='true' where key='delivery.live_classes'");
    const on = await centre(person.userId);
    assert(on.reminders.length === 1, `reminders: ${JSON.stringify(on.reminders)}`);
    assert(on.reminders[0].kind === 'class_starting');
    assert(/Qur'an revision/.test(on.reminders[0].title));

    // Reminders are current, not unread: they are not counted in the badge.
    assert(on.unreadCount === 0, `a reminder counted as unread: ${on.unreadCount}`);
    await q("update public.platform_settings set value_text='false' where key='delivery.live_classes'");
  });

  await test('a renewal is a reminder to the account\'s members only', async () => {
    const person = await adult('Renewing Subscriber');
    const stranger = await adult('Not A Subscriber');
    const plan = (await asActor(admin, 'select public.create_plan($1,$2,$3,$4) id',
      [`renew-${crypto.randomUUID().slice(0, 6)}`, 'Renewal plan', 'Terms', 'plus'])).rows[0].id;
    const version = (await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan, 0, 1, 'month', 'Terms'])).rows[0].id;
    await asActor(admin, `select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')`,
      [version]);
    await asActor(admin, `select public.set_plan_price($1,25000,'UGX',null)`, [version]);
    await asActor(admin, 'select public.activate_plan_version($1)', [version]);

    const account = (await scalar(
      `insert into public.billing_accounts
         (display_name, billing_country, billing_currency, status, created_by)
       values ('Renewal household','UG','UGX','active',$1) returning id`,
      [person.userId])).id;
    await committed(async () => {
      await q(`select set_config('app.subscription_writer','on',true)`);
      await q(
        `insert into public.subscriptions
           (billing_account_id, plan_id, plan_version_id, status,
            current_period_start, current_period_end)
         values ($1,$2,$3,'active', now(), now() + interval '2 days')`,
        [account, plan, version]);
    });

    await q("update public.platform_settings set value_text='true' where key='commerce.subscriptions'");
    const mine = await centre(person.userId);
    assert(mine.reminders.some((r) => r.kind === 'plan_renewing'),
      `no renewal reminder: ${JSON.stringify(mine.reminders)}`);

    // Somebody who is not on the billing account is not told about it. This is
    // the leak the plan summary had: a definer function does not inherit RLS.
    const theirs = await centre(stranger.userId);
    assert(!theirs.reminders.some((r) => r.kind === 'plan_renewing'),
      'a stranger was told about somebody else\'s renewal');

    await q("update public.platform_settings set value_text='false' where key='commerce.subscriptions'");
  });

  // -------------------------------------------------------------------------
  console.log('\nWhose messages these are');
  // -------------------------------------------------------------------------

  await test('a stranger reads none of it, and marking read touches only your own', async () => {
    const person = await adult('Quiet Person');
    const other = await adult('Other Person');
    // Written by the internal writer, as a payout would.
    const id = (await q(
      `insert into public.notifications (user_id, kind, title, body, href)
       values ($1,'payout_paid','Yours','A message','/teach/payouts') returning id`,
      [person.userId])).rows[0].id;

    const theirs = await centre(other.userId);
    assert(theirs.recent.length === 0, `a stranger saw ${theirs.recent.length} messages`);
    assert(await badge(other.userId) === 0);

    // Marking somebody else's id as read changes nothing.
    const touched = await asActor(other.userId, 'select public.mark_notifications_read($1) n', [[id]])
      .then((r) => r.rows[0].n);
    assert(touched === 0, `a stranger marked ${touched} messages read`);
    const stillUnread = (await scalar('select read_at from public.notifications where id = $1', [id])).read_at;
    assert(stillUnread === null, 'somebody else marked the message read');

    const mine = await asActor(person.userId, 'select public.mark_notifications_read() n')
      .then((r) => r.rows[0].n);
    assert(mine >= 1, `marked ${mine}`);
    assert(await badge(person.userId) === 0);

    // Idempotent: nothing unread is left.
    const again = await asActor(person.userId, 'select public.mark_notifications_read() n')
      .then((r) => r.rows[0].n);
    assert(again === 0, `a second mark read touched ${again}`);
  });

  await test('a signed-out caller is refused', async () => {
    await rejects(() => q('select public.my_notifications(30)'), /sign in to/i);
    await rejects(() => q('select public.mark_notifications_read()'), /sign in to/i);
  });

  // Leave the platform as it shipped.
  await q("update public.platform_settings set value_text='false' where key='teaching.payouts'");
  await q("select set_config('app.bypassing_code_flag','',false)");
}
