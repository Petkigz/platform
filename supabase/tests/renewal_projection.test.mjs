// What renews, when, and for how much.
//
// The projection expands each live subscription forward at its own interval and
// at the price pinned to the version it bought, so a later price change cannot
// move what an existing subscriber is due to pay. It is a projection of
// committed terms, not of income — there is no renewal engine — and it says so
// in its own output rather than relying on somebody remembering.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, grantRole, committed,
  } = ctx;

  const admin = await bootstrapAdmin('renew-admin@example.com');
  const finance = await newUser('renew-finance@example.com');
  await newProfile(finance, 'Finance');
  await committed(() => grantRole(finance, 'finance_admin', admin));
  const teacher = await newInstructor('renew-teacher@example.com', admin);

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

  const projection = (actor, months = 6) =>
    asActor(actor, 'select public.platform_renewal_projection($1) p', [months])
      .then((r) => r.rows[0].p);

  /** A plan with one price, activated, as staff. */
  async function aPlan({ amount = 25000, currency = 'UGX', interval = 'month' } = {}) {
    const plan = (await asActor(admin, 'select public.create_plan($1,$2,$3,$4) id',
      [`renew-${crypto.randomUUID().slice(0, 6)}`, 'Renewal plan', 'Terms', 'plus'])).rows[0].id;
    const version = (await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan, 0, 1, interval, 'Terms'])).rows[0].id;
    await asActor(admin, `select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')`, [version]);
    await asActor(admin, `select public.set_plan_price($1,$2,$3,null)`, [version, amount, currency]);
    await asActor(admin, 'select public.activate_plan_version($1)', [version]);
    return { plan, version };
  }

  async function subscriber({ plan, version, status = 'active', endsIn = '20 days' }) {
    const user = await newUser(`renew-${crypto.randomUUID().slice(0, 8)}@example.com`);
    await newProfile(user, 'Subscriber');
    const account = (await scalar(
      `insert into public.billing_accounts
         (display_name, billing_country, billing_currency, status, created_by)
       values ('Renewal household','UG','UGX','active',$1) returning id`,
      [user])).id;
    const id = await committed(async () => {
      await q(`select set_config('app.subscription_writer','on',true)`);
      return (await scalar(
        `insert into public.subscriptions
           (billing_account_id, plan_id, plan_version_id, status,
            current_period_start, current_period_end, cancelled_at)
         values ($1,$2,$3,$4, now() - interval '10 days', now() + $5::interval,
                 case when $4 in ('cancelled','expired') then now() else null end)
         returning id`,
        [account, plan, version, status, endsIn])).id;
    });
    return { user, account, id };
  }

  await test('only finance or the owner may look, and the window is bounded', async () => {
    await rejects(() => q('select public.platform_renewal_projection(6)'), /sign in to/i);
    await rejects(
      () => asActor(teacher, 'select public.platform_renewal_projection(6)'),
      /only a finance admin or platform admin/i);
    await rejects(
      () => asActor(finance, 'select public.platform_renewal_projection(25)'),
      /between 1 and 24 months/i);
  });

  const ugxTotal = (p) => {
    const row = p.totalByCurrency.find((c) => c.currency === 'UGX');
    return row ? Number(row.amountMinor) : 0;
  };

  await test('a monthly subscription is counted once a month, at its pinned price', async () => {
    // Other suites leave live subscriptions behind, so this is a delta: what
    // this plan added, not what the platform happens to hold.
    const before = await projection(finance);
    const plan = await aPlan({ amount: 25000, currency: 'UGX', interval: 'month' });
    // Ends in twenty days, so a six-month window holds about five charges: the
    // renewal at twenty days and one a month after.
    await subscriber({ ...plan, endsIn: '20 days' });

    const after = await projection(finance);
    const added = ugxTotal(after) - ugxTotal(before);
    assert(added >= 25000 * 4 && added <= 25000 * 6,
      `a monthly plan ending in 20 days added ${added / 25000} charges over six months`);
  });

  await test('a price change after the sale does not move an existing renewal', async () => {
    const plan = await aPlan({ amount: 10000, currency: 'EUR', interval: 'year' });
    const sub = await subscriber({ ...plan, endsIn: '30 days' });

    const before = await projection(finance);
    const eurBefore = before.totalByCurrency.find((c) => c.currency === 'EUR');
    assert(eurBefore, 'the yearly plan was not projected');

    // A new version at a new price is what "raising the price" actually means.
    // The existing subscription is pinned to the old one and must not move.
    const higher = await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan.plan, 1, 1, 'year', 'Higher terms']).then((r) => r.rows[0].id);
    await asActor(admin, `select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')`, [higher]);
    await asActor(admin, `select public.set_plan_price($1,99000,'EUR',null)`, [higher]);
    await asActor(admin, 'select public.activate_plan_version($1)', [higher]);

    const after = await projection(finance);
    const eurAfter = after.totalByCurrency.find((c) => c.currency === 'EUR');
    assert(eurAfter.amountMinor === eurBefore.amountMinor,
      `the projected total moved from ${eurBefore.amountMinor} to ${eurAfter.amountMinor}`);
    void sub;
  });

  await test('a past-due subscription is projected and counted as at risk', async () => {
    const plan = await aPlan({ amount: 15000, currency: 'GBP', interval: 'month' });
    await subscriber({ ...plan, status: 'past_due', endsIn: '5 days' });

    const result = await projection(finance);
    const first = result.monthly.find((m) => m.byCurrency.some((c) => c.currency === 'GBP'));
    assert(first, 'a past-due subscription was not projected at all');
    assert(first.atRisk >= 1, `at risk was ${first.atRisk} in the month it renews`);
  });

  await test('a cancelled subscription is not projected', async () => {
    const plan = await aPlan({ amount: 40000, currency: 'KES', interval: 'month' });
    await subscriber({ ...plan, status: 'expired', endsIn: '10 days' });
    await subscriber({ ...plan, status: 'cancelled', endsIn: '10 days' });

    const result = await projection(finance);
    const kes = result.totalByCurrency.find((c) => c.currency === 'KES');
    assert(!kes, `a dead subscription was projected: ${JSON.stringify(kes)}`);
  });

  await test('the answer says it is not income', async () => {
    const result = await projection(finance);
    assert(result.automaticRenewal === false,
      'the projection claims something charges these renewals');
    assert(result.from && result.to, 'the window was not reported');
  });
}
