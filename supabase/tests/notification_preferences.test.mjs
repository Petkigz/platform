// You choose what you are told.
//
// The in-app centre has six kinds of message. This suite is about the two
// rules that make a preferences screen safe to offer: the two kinds that report
// money not arriving cannot be silenced, and a muted message is kept and not
// counted rather than deleted.

export async function run(ctx) {
  const { q, test, assert, rejects, asUser, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('prefs-admin@example.com');
  const user = await newUser('prefs-user@example.com');
  await newProfile(user, 'Prefs User');
  const other = await newUser('prefs-other@example.com');
  await newProfile(other, 'Other User');

  // Two stored messages of a mutable kind, one of a locked kind.
  const paidId = (await q(
    `insert into public.notifications (user_id, kind, title, body, severity)
     values ($1, 'payout_paid', 'Payout sent', 'Your payout is on its way.', 'info')
     returning id`, [user])).rows[0].id;
  const failedId = (await q(
    `insert into public.notifications (user_id, kind, title, body, severity)
     values ($1, 'payout_failed', 'Payout failed', 'The transfer did not go through.', 'warning')
     returning id`, [user])).rows[0].id;

  async function asCommitted(userId, sql, params) {
    await q('begin');
    try {
      await q(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: userId })]);
      await q('set local role authenticated');
      const out = await q(sql, params);
      await q('commit');
      return out;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const prefs = async (who) => {
    const { rows } = await asUser(who, () => q('select public.my_notification_preferences() v'));
    return rows[0].v;
  };
  const setPref = (who, kind, enabled) =>
    asCommitted(who, 'select public.set_notification_preference($1,$2) v', [kind, enabled])
      .then((r) => r.rows[0].v);
  const badge = async (who) => {
    const { rows } = await asUser(who, () => q('select public.notification_badge() n'));
    return Number(rows[0].n);
  };
  const feed = async (who) => {
    const { rows } = await asUser(who, () => q('select public.my_notifications(30) v'));
    return rows[0].v;
  };

  // -------------------------------------------------------------------------
  console.log('\nThe list');
  // -------------------------------------------------------------------------

  await test('a signed-out caller is told to sign in', async () => {
    await rejects(
      () => ctx.asAnon(() => q('select public.my_notification_preferences()')),
      /sign in/);
  });

  await test('every kind comes back, whether or not it has been changed', async () => {
    const list = await prefs(user);
    assert(Array.isArray(list) && list.length === 6, `got ${list.length} kinds`);
    // Six since `media_encode_failed`: the closed vocabulary lives in the two
    // table CHECKs, the `foreach` in `my_notification_preferences()`, the guard
    // in `set_notification_preference()` and this list. A kind added to one and
    // forgotten in another is a screen that throws, so they are pinned here.
    assert(
      JSON.stringify(list.map((p) => p.kind))
        === JSON.stringify(['payout_paid', 'payout_failed', 'payout_cancelled',
                            'media_encode_failed', 'class_starting', 'plan_renewing']),
      'the order or the vocabulary changed');
    assert(list.every((p) => p.enabled === true), 'a kind is off by default');
  });

  await test('a kind nobody can receive says so rather than pretending', async () => {
    // The two reminders exist only while their features are on, and both ship
    // off. A switch for one is still allowed — a choice can be made in advance —
    // but the screen must not imply that something arrives either way.
    const list = await prefs(user);
    const byKind = Object.fromEntries(list.map((p) => [p.kind, p]));
    assert(byKind.payout_paid.available === true, 'a stored kind is not offered');
    assert(byKind.payout_failed.available === true, 'a stored kind is not offered');
    assert(byKind.class_starting.available === false, 'a reminder nobody computes is offered as live');
    assert(byKind.plan_renewing.available === false, 'a reminder nobody computes is offered as live');

    // And it can still be chosen: availability must not disable the switch.
    await setPref(user, 'class_starting', false);
    assert((await prefs(user)).find((p) => p.kind === 'class_starting').enabled === false,
      'an unavailable kind could not be chosen');
    await setPref(user, 'class_starting', true);
  });

  await test('the two money-failure kinds are marked locked', async () => {
    const list = await prefs(user);
    const locked = list.filter((p) => p.locked).map((p) => p.kind);
    assert(JSON.stringify(locked) === JSON.stringify(['payout_failed', 'payout_cancelled']),
      `locked: ${locked.join(', ')}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nChanging one');
  // -------------------------------------------------------------------------

  await test('a kind can be turned off and on again', async () => {
    const off = await setPref(user, 'class_starting', false);
    assert(off.enabled === false, 'the write did not take');
    assert((await prefs(user)).find((p) => p.kind === 'class_starting').enabled === false,
      'the list disagrees with the write');

    await setPref(user, 'class_starting', true);
    assert((await prefs(user)).find((p) => p.kind === 'class_starting').enabled === true,
      'turning it back on did not take');
  });

  await test('a kind the platform does not send is refused', async () => {
    await rejects(
      () => asCommitted(user, 'select public.set_notification_preference($1,$2)',
        ['marketing_offers', false]),
      /is not something the platform tells you about/i);
  });

  await test('money that did not arrive cannot be silenced', async () => {
    await rejects(
      () => asCommitted(user, 'select public.set_notification_preference($1,$2)',
        ['payout_failed', false]),
      /cannot be turned off/);
  });

  await test('a hand-written row cannot silence it either', async () => {
    // The table is granted to authenticated, so the check must not live only in
    // the writer: a preference row saying "off" still reads as on.
    await q(`insert into public.notification_preferences (user_id, kind, enabled)
             values ($1, 'payout_failed', false)`, [user]);
    assert((await prefs(user)).find((p) => p.kind === 'payout_failed').enabled === true,
      'a row bypassed the lock');
    await q(`delete from public.notification_preferences where user_id = $1 and kind = 'payout_failed'`,
      [user]);
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat muting does');
  // -------------------------------------------------------------------------

  await test('a muted message is not counted', async () => {
    const before = await badge(user);
    assert(before === 2, `expected two unread, got ${before}`);

    await setPref(user, 'payout_paid', false);
    assert((await badge(user)) === 1, 'the muted message is still counted');

    await setPref(user, 'payout_paid', true);
    assert((await badge(user)) === 2, 'unmuting did not restore the count');
  });

  await test('a muted message is kept and hidden, then shown again', async () => {
    await setPref(user, 'payout_paid', false);
    const muted = await feed(user);
    assert(!muted.recent.some((n) => n.id === paidId), 'the muted message was shown');
    assert(muted.recent.some((n) => n.id === failedId), 'the locked message was hidden');

    const { rows } = await q('select count(*)::int n from public.notifications where id = $1',
      [paidId]);
    assert(rows[0].n === 1, 'the muted message was deleted');

    await setPref(user, 'payout_paid', true);
    const shown = await feed(user);
    assert(shown.recent.some((n) => n.id === paidId), 'unmuting did not bring it back');
  });

  await test('one person\u2019s choice does not touch another\u2019s', async () => {
    await setPref(user, 'plan_renewing', false);
    assert((await prefs(other)).find((p) => p.kind === 'plan_renewing').enabled === true,
      'the preference leaked between accounts');
    await setPref(user, 'plan_renewing', true);
  });

  await test('nobody can read or write somebody else\u2019s rows', async () => {
    await setPref(user, 'class_starting', false);
    const { rows } = await asUser(other, () =>
      q('select count(*)::int n from public.notification_preferences where user_id = $1', [user]));
    assert(rows[0].n === 0, 'another account can read the row');

    // And the writer only ever writes for the caller.
    await setPref(other, 'class_starting', false);
    const still = (await prefs(user)).find((p) => p.kind === 'class_starting');
    assert(still.enabled === false, 'the first person\u2019s choice was overwritten');
    await setPref(user, 'class_starting', true);
    await setPref(other, 'class_starting', true);
  });
}
