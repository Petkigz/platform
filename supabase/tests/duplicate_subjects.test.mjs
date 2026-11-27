// One subject per discipline (20261281163000): the two duplicates the seeds
// left (`aqidah` beside `aqeedah`, `islamic-history` beside `history`) are
// retired, and nothing else about the vocabulary moved.
//
// What this cannot show: the migration's other branch, where something
// points at a duplicate and it is left alone. By the time a suite runs the
// migration already has. That branch is in scripts/hosted-migration-370.test.mjs,
// which applies the migration to a database that still has the 369.

export async function run(ctx) {
  const { q, test, assert, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('duplicates-admin@example.com');
  const visitor = await newUser('duplicates-visitor@example.com');
  await newProfile(visitor, 'Duplicates Visitor');

  let step = 0;
  async function as(role, actor, sql, params = []) {
    const point = `duplicates_${step += 1}`;
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
  const row = async (code) => (await q(
    `select s.id, s.status, s.deleted_at, s.name,
            (select count(*)::int from public.subject_areas c where c.parent_subject_id = s.id) as children
       from public.subject_areas s where s.code = $1`, [code])).rows[0];

  // One transaction for the whole suite, undone at the end: `as()` works in
  // savepoints, and nothing here is meant to outlive the suite.
  await q('begin');
  try {
    await test('the first seed\'s duplicates are retired; the ones with subdivisions stay', async () => {
      for (const [old, kept] of [['aqidah', 'aqeedah'], ['islamic-history', 'history']]) {
        const gone = await row(old); const stays = await row(kept);
        assert(gone && gone.status === 'retired', `${old} should be retired, is ${gone?.status}`);
        assert(gone.deleted_at === null, `${old} is retired, not deleted: it can be reactivated`);
        assert(gone.children === 0, `${old} had no subdivisions to lose`);
        assert(stays && stays.status === 'active', `${kept} should be active, is ${stays?.status}`);
        assert(stays.children === 2, `${kept} keeps its two subdivisions, has ${stays.children}`);
      }
    });

    await test('nobody reading the catalogue sees two subjects with one name', async () => {
      // The home page and the catalogue filter read exactly this, as a visitor.
      for (const [role, actor] of [['anon', null], ['authenticated', visitor]]) {
        const seen = (await as(role, actor,
          `select code, name from public.subject_areas
            where status = 'active' and deleted_at is null and parent_subject_id is null`)).rows;
        const names = seen.map((s) => s.name.toLowerCase());
        const twice = names.filter((name, i) => names.indexOf(name) !== i);
        assert(twice.length === 0, `${role} sees a discipline twice: ${twice.join(', ')}`);
        const codes = seen.map((s) => s.code);
        assert(!codes.includes('aqidah') && !codes.includes('islamic-history'), `${role} still sees a retired duplicate`);
        assert(codes.includes('aqeedah') && codes.includes('history'), `${role} lost the subject that stays`);
        // A retired row is hidden from readers by the policy too, not only by the page's filter.
        const hidden = (await as(role, actor,
          `select count(*)::int n from public.subject_areas where code in ('aqidah', 'islamic-history')`)).rows[0].n;
        assert(hidden === 0, `${role} can read ${hidden} retired duplicate(s) directly`);
      }
    });

    await test('nothing was moved or deleted, and the log says what happened', async () => {
      const total = (await q(`select count(*)::int n from public.subject_areas where code in ('aqidah','aqeedah','islamic-history','history','aqeedah.pillars','aqeedah.names','history.caliphates','history.scholars')`)).rows[0].n;
      assert(total === 8, `the eight rows are all still there, found ${total}`);
      const log = (await q(
        `select detail->>'code' as code, actor, detail->'before'->>'status' as was
           from public.governance_audit_events
          where action = 'subject.retired' and detail->>'code' in ('aqidah', 'islamic-history')
          order by 1`)).rows;
      assert(log.length === 2, `two retirements in the audit log, found ${log.length}`);
      assert(log.every((e) => e.actor === null && e.was === 'active'), 'recorded with no actor, from active: a migration is nobody');
    });

    await test('the owner can still see a retired duplicate and bring it back; a visitor cannot', async () => {
      const seen = (await as('authenticated', admin,
        `select code, status from public.subject_areas where code = 'aqidah'`)).rows;
      assert(seen.length === 1 && seen[0].status === 'retired', 'staff who manage subjects see the retired row');
      // Brought back and retired again, inside a savepoint that is then undone.
      await q('savepoint duplicates_back');
      try {
        await as('authenticated', admin, `update public.subject_areas set status = 'active' where code = 'aqidah'`);
        assert((await row('aqidah')).status === 'active', 'reactivated by the owner');
      } finally { await q('rollback to savepoint duplicates_back'); }
      assert((await row('aqidah')).status === 'retired', 'left retired after the test');
      const tried = await as('authenticated', visitor,
        `update public.subject_areas set status = 'active' where code = 'aqidah' returning id`);
      assert(tried.rows.length === 0, 'a visitor\'s update reaches no row');
      });
  } finally {
    await q('rollback');
  }
}
