// Whether an account is staff is a question a caller may ask about itself
// (20261281165000). Measured the other way round on the 371 migrations before
// that one: a visitor who was not signed in asked `is_privileged(<any id>)`
// and `has_role(<any id>, 'platform_admin')` and was told.
//
// What this cannot show: anything about the hosted project, where the
// migration has to be applied by its own approved step; whether PostgREST
// turns the refusal into the status the comments say (42501 is the code it
// maps; no request was made here); and anything about the other functions
// that answer about an account id for reasons other than staff roles, which
// the migration's header lists and leaves alone. The sweep at the end calls
// each function with made-up ids in its other arguments, so a function that
// tells staff apart only for a real lesson or a real institution would not be
// caught by it.

export async function run(ctx) {
  const {
    q, test, assert, rejects, committed,
    newUser, newProfile, grantRole, bootstrapAdmin, newInstructor,
  } = ctx;

  const admin = await bootstrapAdmin('rolequestion-admin@example.com');
  // One account holding all four staff roles, so every predicate says yes about it.
  const staff = await newUser('rolequestion-staff@example.com');
  await newProfile(staff, 'Role Question Staff');
  await committed(async () => {
    for (const code of ['platform_admin', 'governance_admin', 'finance_admin', 'support_agent']) {
      await grantRole(staff, code, admin);
    }
  });
  const teacher = await newInstructor('rolequestion-teacher@example.com', admin);
  const ordinary = await newUser('rolequestion-ordinary@example.com');
  await newProfile(ordinary, 'Role Question Ordinary');
  const asker = await newUser('rolequestion-asker@example.com');
  await newProfile(asker, 'Role Question Asker');

  let step = 0;
  /**
   * One statement through the API's roles. `actor` is an account id for a
   * signed-in person, or null for a visitor (role `anon`, no claims: the real
   * thing, not the harness's `asAnon`, which is `authenticated` without a
   * subject). Afterwards nobody is signed in again.
   */
  async function as(actor, sql, params = [], role = actor ? 'authenticated' : 'anon') {
    const point = `rolequestion_${step += 1}`;
    await q(`savepoint ${point}`);
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [actor ? JSON.stringify({ sub: actor, role }) : '']);
    await q(`set local role ${role}`);
    try {
      const result = await q(sql, params);
      await q('reset role');
      await q(`select set_config('request.jwt.claims','',true)`);
      await q(`release savepoint ${point}`);
      return result;
    } catch (e) {
      await q(`rollback to savepoint ${point}`);
      throw e;
    }
  }
  /** A test's own transaction, undone at the end. */
  async function scene(fn) {
    await q('begin');
    try { return await fn(); } finally { await q('rollback'); }
  }
  const value = async (actor, sql, params, role) => (await as(actor, sql, params, role)).rows[0].v;

  const REFUSED_ROLE = /whether an account holds a role is answered to that account only/;
  const REFUSED_STAFF = /whether an account is staff is answered to that account only/;

  await test('the lookups about any account are closed to the API roles and open to the server key', async () => {
    const rows = (await q(`
      select p.proname::text as name,
             has_function_privilege('anon', p.oid, 'execute') as anon,
             has_function_privilege('authenticated', p.oid, 'execute') as auth,
             has_function_privilege('service_role', p.oid, 'execute') as service,
             p.prosecdef as definer
        from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and p.proname in ('account_has_role', 'account_is_privileged')
       order by 1`)).rows;
    assert(rows.length === 2, `expected both lookups, found ${rows.length}`);
    for (const row of rows) {
      assert(row.anon === false, `${row.name} is executable by anon`);
      assert(row.auth === false, `${row.name} is executable by authenticated`);
      assert(row.service === true, `${row.name} is not executable by the server key`);
      assert(row.definer === true, `${row.name} must run with the owner's rights to read the assignments`);
    }
  });

  await test('the two public names run with the caller\'s rights, and so do the seven built on them', async () => {
    const rows = (await q(`
      select p.oid::regprocedure::text as sig, p.prosecdef as definer
        from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and p.proname in ('has_role', 'is_privileged', 'can_appoint_teacher', 'can_decide_guardian_consent',
                           'can_decide_sponsorship', 'can_moderate_boards', 'can_work_incidents',
                           'may_change_control', 'may_write_setting')`)).rows;
    assert(rows.length === 9, `expected nine functions, found ${rows.length}`);
    const definers = rows.filter((row) => row.definer).map((row) => row.sig);
    assert(definers.length === 0, `still run with the owner's rights: ${definers.join(', ')}`);
  });

  await test('a visitor who is not signed in is refused about a staff account and about an ordinary one alike', async () => {
    await scene(async () => {
      for (const target of [staff, ordinary, teacher]) {
        await rejects(() => as(null, `select public.has_role($1, 'platform_admin') as v`, [target]), REFUSED_ROLE);
        await rejects(() => as(null, `select public.has_role($1, 'instructor') as v`, [target]), REFUSED_ROLE);
        await rejects(() => as(null, 'select public.is_privileged($1) as v', [target]), REFUSED_STAFF);
      }
    });
  });

  await test('the refusal carries code 42501 and does not depend on whom it was asked about', async () => {
    await scene(async () => {
      const seen = [];
      for (const target of [staff, ordinary]) {
        try {
          await as(asker, 'select public.is_privileged($1) as v', [target]);
          seen.push('answered');
        } catch (e) {
          seen.push(`${e.code}:${e.message}`);
        }
      }
      assert(seen[0] === seen[1], `the two refusals differ: ${seen.join(' | ')}`);
      assert(seen[0].startsWith('42501:'), `expected 42501, got ${seen[0]}`);
    });
  });

  await test('a visitor asking about nobody is told false, as every policy read by a visitor relies on', async () => {
    await scene(async () => {
      assert(await value(null, `select public.has_role(null, 'platform_admin') as v`) === false);
      assert(await value(null, 'select public.is_privileged(null) as v') === false);
      assert(await value(null, `select public.has_role(public.current_user_id(), 'platform_admin') as v`) === false);
      assert(await value(null, 'select public.is_privileged(public.current_user_id()) as v') === false);
      // A table whose policy asks is_privileged(current_user_id()) still reads for a visitor.
      const n = (await as(null, 'select count(*)::int as n from public.instructor_public_profiles')).rows[0].n;
      assert(Number.isInteger(n), 'a visitor could not read a table whose policy asks about the caller');
    });
  });

  await test('a signed-in account is refused about anybody else, staff or not', async () => {
    await scene(async () => {
      for (const target of [staff, ordinary, teacher, admin]) {
        await rejects(() => as(asker, `select public.has_role($1, 'platform_admin') as v`, [target]), REFUSED_ROLE);
        await rejects(() => as(asker, `select public.has_role($1, 'support_agent') as v`, [target]), REFUSED_ROLE);
        await rejects(() => as(asker, `select public.has_role($1, 'instructor') as v`, [target]), REFUSED_ROLE);
        await rejects(() => as(asker, 'select public.is_privileged($1) as v', [target]), REFUSED_STAFF);
      }
    });
  });

  await test('an id that belongs to nobody is refused the same way, so the refusal does not say an account exists', async () => {
    await scene(async () => {
      const nobody = '00000000-0000-4000-8000-00000000abcd';
      await rejects(() => as(asker, `select public.has_role($1, 'platform_admin') as v`, [nobody]), REFUSED_ROLE);
      await rejects(() => as(asker, 'select public.is_privileged($1) as v', [nobody]), REFUSED_STAFF);
    });
  });

  await test('everybody is answered about themselves, which is what the application asks', async () => {
    await scene(async () => {
      assert(await value(staff, `select public.has_role($1, 'platform_admin') as v`, [staff]) === true);
      assert(await value(staff, `select public.has_role($1, 'support_agent') as v`, [staff]) === true);
      assert(await value(staff, `select public.has_role($1, 'instructor') as v`, [staff]) === false);
      assert(await value(staff, 'select public.is_privileged($1) as v', [staff]) === true);
      assert(await value(teacher, `select public.has_role($1, 'instructor') as v`, [teacher]) === true);
      assert(await value(teacher, `select public.has_role($1, 'platform_admin') as v`, [teacher]) === false);
      assert(await value(teacher, 'select public.is_privileged($1) as v', [teacher]) === false);
      assert(await value(ordinary, `select public.has_role($1, 'platform_admin') as v`, [ordinary]) === false);
      assert(await value(ordinary, 'select public.is_privileged($1) as v', [ordinary]) === false);
    });
  });

  await test('the two functions underneath answer about the caller and say nothing, the same nothing, about anybody else', async () => {
    await scene(async () => {
      assert(await value(staff, `select public.own_account_has_role($1, 'finance_admin') as v`, [staff]) === true);
      assert(await value(staff, 'select public.own_account_is_privileged($1) as v', [staff]) === true);
      assert(await value(teacher, `select public.own_account_has_role($1, 'instructor') as v`, [teacher]) === true);
      assert(await value(teacher, 'select public.own_account_is_privileged($1) as v', [teacher]) === false);
      assert(await value(ordinary, `select public.own_account_has_role($1, 'finance_admin') as v`, [ordinary]) === false);
      assert(await value(ordinary, 'select public.own_account_is_privileged($1) as v', [ordinary]) === false);
      for (const actor of [asker, staff, null]) {
        for (const target of [staff, ordinary, teacher, admin, '00000000-0000-4000-8000-00000000abcd', null]) {
          if (actor !== null && target === actor) continue;
          assert(await value(actor, `select public.own_account_has_role($1, 'platform_admin') as v`, [target]) === null,
            'own_account_has_role answered about somebody who is not the caller');
          assert(await value(actor, `select public.own_account_has_role($1, 'instructor') as v`, [target]) === null);
          assert(await value(actor, 'select public.own_account_is_privileged($1) as v', [target]) === null,
            'own_account_is_privileged answered about somebody who is not the caller');
        }
      }
    });
  });

  await test('staff are refused about other accounts through these two as well; they read the role register instead', async () => {
    await scene(async () => {
      await rejects(() => as(staff, `select public.has_role($1, 'platform_admin') as v`, [admin]), REFUSED_ROLE);
      await rejects(() => as(staff, 'select public.is_privileged($1) as v', [ordinary]), REFUSED_STAFF);
      const n = (await as(staff,
        `select count(*)::int as n from public.user_role_assignments where user_id = $1 and revoked_at is null`,
        [teacher])).rows[0].n;
      assert(n === 1, `staff should still read another account's assignments from the table, read ${n}`);
      const hidden = (await as(asker,
        `select count(*)::int as n from public.user_role_assignments where user_id = $1`, [staff])).rows[0].n;
      assert(hidden === 0, 'an ordinary account read a staff member\'s role assignments from the table');
    });
  });

  await test('the seven predicates answer about the caller and refuse about anybody else', async () => {
    await scene(async () => {
      const control = (await q('select control_key as k from public.platform_control_rules() order by 1 limit 1')).rows[0].k;
      const seven = [
        ['select public.can_appoint_teacher($1) as v', []],
        ['select public.can_decide_guardian_consent($1) as v', []],
        ['select public.can_decide_sponsorship($1) as v', []],
        ['select public.can_moderate_boards($1) as v', []],
        ['select public.can_work_incidents($1) as v', []],
        ['select public.may_change_control($1, $2) as v', [control]],
        [`select public.may_write_setting($1, 'some.flag', 'flag') as v`, []],
      ];
      for (const [sql, rest] of seven) {
        assert(await value(staff, sql, [staff, ...rest]) === true, `staff were not answered yes about themselves: ${sql}`);
        assert(await value(ordinary, sql, [ordinary, ...rest]) === false, `an ordinary account was not answered no about itself: ${sql}`);
        for (const target of [staff, ordinary]) {
          await rejects(() => as(asker, sql, [target, ...rest]), /whether an account (holds a role|is staff) is answered to that account only/);
        }
      }
      // The form with no argument is the caller.
      assert(await value(staff, 'select public.can_work_incidents() as v') === true);
      assert(await value(ordinary, 'select public.can_work_incidents() as v') === false);
    });
  });

  await test('a function that runs with the owner\'s rights still asks about other people', async () => {
    await scene(async () => {
      // record_teacher_screening() asks has_role(<the person screened>, 'instructor').
      await rejects(() => as(admin,
        `select public.record_teacher_screening($1, 'Background check', 'REF-ROLEQ-1')`, [ordinary]),
      /screening:not_a_teacher/);
      await as(admin, `select public.record_teacher_screening($1, 'Background check', 'REF-ROLEQ-2')`, [teacher]);
      const n = (await q(
        `select count(*)::int as n from public.teacher_screenings where user_id = $1 and evidence_reference = 'REF-ROLEQ-2'`,
        [teacher])).rows[0].n;
      assert(n === 1, 'the screening of a teacher was not recorded');
      // And the caller, when not staff, is still refused by that function's own rule.
      await rejects(() => as(asker,
        `select public.record_teacher_screening($1, 'Background check', 'REF-ROLEQ-3')`, [teacher]),
      /screening:not_allowed/);
    });
  });

  await test('once the owner has asked in a transaction, the API roles are still refused in the same one', async () => {
    // PL/pgSQL keeps an expression it has set up for the rest of the
    // transaction, and the right to execute a function is checked at set-up.
    // Measured before the refusal was looked up on every call: after one
    // allowed question, an `anon` question in the same transaction was
    // answered.
    await scene(async () => {
      assert((await q(`select public.has_role($1, 'platform_admin') as v`, [staff])).rows[0].v === true);
      assert((await q('select public.is_privileged($1) as v', [staff])).rows[0].v === true);
      assert(await value(null, 'select public.is_privileged($1) as v', [staff], 'service_role') === true);
      // The owner's rights, reached by a signed-in member of staff, in this same transaction.
      await rejects(() => as(admin,
        `select public.record_teacher_screening($1, 'Background check', 'REF-ROLEQ-9')`, [ordinary]),
      /screening:not_a_teacher/);
      for (const actor of [asker, null]) {
        await rejects(() => as(actor, `select public.has_role($1, 'platform_admin') as v`, [staff]), REFUSED_ROLE);
        await rejects(() => as(actor, 'select public.is_privileged($1) as v', [staff]), REFUSED_STAFF);
      }
      await rejects(() => as(asker, 'select public.can_moderate_boards($1) as v', [staff]), REFUSED_ROLE);
      // And the other way round: a refusal does not stop the owner afterwards.
      assert((await q('select public.is_privileged($1) as v', [staff])).rows[0].v === true);
    });
  });

  await test('the server key, with no session, is answered about anybody', async () => {
    await scene(async () => {
      assert(await value(null, `select public.has_role($1, 'platform_admin') as v`, [staff], 'service_role') === true);
      assert(await value(null, `select public.has_role($1, 'platform_admin') as v`, [ordinary], 'service_role') === false);
      assert(await value(null, 'select public.is_privileged($1) as v', [staff], 'service_role') === true);
      assert(await value(null, 'select public.is_privileged($1) as v', [ordinary], 'service_role') === false);
    });
  });

  await test('a suspended member of staff is not staff, to themselves or to the database', async () => {
    await scene(async () => {
      // With no session the account-status guard takes the change for the
      // owner's own; this setting is how the other suites suspend somebody.
      await q(`select set_config('app.account_erasure', 'on', true)`);
      await q(`update public.user_profiles set account_status = 'suspended' where user_id = $1`, [staff]);
      assert(await value(staff, 'select public.is_privileged($1) as v', [staff]) === false);
      assert(await value(staff, `select public.has_role($1, 'platform_admin') as v`, [staff]) === false);
      assert(await value(staff, 'select public.own_account_is_privileged($1) as v', [staff]) === false);
      assert((await q('select public.is_privileged($1) as v', [staff])).rows[0].v === false);
      // A role that is not privileged is a membership fact and survives suspension.
      await q(`update public.user_profiles set account_status = 'suspended' where user_id = $1`, [teacher]);
      assert(await value(teacher, `select public.has_role($1, 'instructor') as v`, [teacher]) === true);
    });
  });

  await test('a teacher\'s published page is public only while they teach, and the question behind it says no more than the page', async () => {
    await scene(async () => {
      await q(`update public.platform_settings set value_text = 'true' where key = 'teaching.public_profile'`);
      await as(teacher,
        `select public.save_instructor_public_profile('rolequestion-teacher', 'Role Question Teacher', 'Teacher', 'Teaches.', null, null, null, null, null, true)`);
      const seen = async (actor) => (await as(actor,
        `select count(*)::int as n from public.instructor_public_profiles where user_id = $1`, [teacher])).rows[0].n;
      assert(await seen(null) === 1, 'a visitor did not see a published teacher page');
      assert(await seen(asker) === 1, 'a signed-in account did not see a published teacher page');
      assert(await value(null, 'select public.teaches_in_public($1) as v', [teacher]) === true);
      // Staff, an ordinary account and an id that is nobody's: the same answer.
      for (const target of [staff, ordinary, '00000000-0000-4000-8000-00000000abcd']) {
        assert(await value(null, 'select public.teaches_in_public($1) as v', [target]) === false);
        assert(await value(asker, 'select public.teaches_in_public($1) as v', [target]) === false);
      }

      await q(`update public.platform_settings set value_text = 'false' where key = 'teaching.public_profile'`);
      assert(await seen(null) === 0, 'the page stayed public with the switch off');
      assert(await value(null, 'select public.teaches_in_public($1) as v', [teacher]) === false,
        'with the switch off the question still said who teaches');
      assert(await seen(teacher) === 1, 'the owner lost sight of their own page');
      assert(await seen(staff) === 1, 'staff lost sight of the page');
      await q(`update public.platform_settings set value_text = 'true' where key = 'teaching.public_profile'`);

      await as(admin, `select public.revoke_role($1, 'instructor', 'role question suite')`, [teacher]);
      assert(await seen(null) === 0, 'the page of somebody who no longer teaches stayed public');
      assert(await value(null, 'select public.teaches_in_public($1) as v', [teacher]) === false);
    });
  });

  await test('a draft page is not public and the question says no about its owner', async () => {
    await scene(async () => {
      await q(`update public.platform_settings set value_text = 'true' where key = 'teaching.public_profile'`);
      await as(teacher,
        `select public.save_instructor_public_profile('rolequestion-draft', 'Role Question Draft', 'Teacher', 'Teaches.', null, null, null, null, null, false)`);
      const n = (await as(null,
        `select count(*)::int as n from public.instructor_public_profiles where user_id = $1`, [teacher])).rows[0].n;
      assert(n === 0, 'a visitor saw a draft teacher page');
      assert(await value(null, 'select public.teaches_in_public($1) as v', [teacher]) === false,
        'the question said a teacher with only a draft page teaches in public');
    });
  });

  await test('no policy asks these questions about a row\'s owner', async () => {
    // A policy runs with the reader's rights, so one that named a column
    // instead of the caller would refuse every reader who is not staff.
    const rows = (await q(`
      select c.relname::text as tbl, pol.polname::text as name, m[1] as call
        from pg_policy pol
        join pg_class c on c.oid = pol.polrelid,
             regexp_matches(
               coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || ' ' ||
               coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), ''),
               '((?:has_role|is_privileged|can_appoint_teacher|can_decide_guardian_consent|can_decide_sponsorship|can_moderate_boards|can_work_incidents|may_write_setting|may_change_control)\\s*\\([^,)]*\\)?)', 'g') m
       where c.relnamespace = 'public'::regnamespace
         and m[1] !~ 'current_user_id\\(\\)'
         and m[1] !~ '^can_work_incidents\\(\\)$'`)).rows;
    assert(rows.length === 0,
      `these policies ask about somebody other than the caller: ${rows.map((r) => `${r.tbl}.${r.name} ${r.call}`).join('; ')}`);
  });

  await test('no function that runs with the caller\'s rights asks these questions about anybody but the caller', async () => {
    const rows = (await q(`
      select p.oid::regprocedure::text as sig, m[2] as arg
        from pg_proc p,
             regexp_matches(p.prosrc,
               '((?:has_role|is_privileged|can_appoint_teacher|can_decide_guardian_consent|can_decide_sponsorship|can_moderate_boards|can_work_incidents|may_write_setting|may_change_control)\\s*\\(\\s*)([^,)]*\\)?)', 'g') m
       where p.pronamespace = 'public'::regnamespace
         and not p.prosecdef
         and p.proname not in ('has_role', 'is_privileged', 'can_appoint_teacher', 'can_decide_guardian_consent',
                               'can_decide_sponsorship', 'can_moderate_boards', 'can_work_incidents',
                               'may_change_control', 'may_write_setting')`)).rows;
    const allowed = new Set(['public.current_user_id()', 'current_user_id()', 'v_actor', 'v_actor)']);
    const odd = rows.filter((row) => !allowed.has(row.arg.trim()));
    assert(odd.length === 0, `asked about something other than the caller: ${odd.map((r) => `${r.sig} ${r.arg}`).join('; ')}`);
    // `v_actor` is the caller in each of them; say so by reading the declaration.
    const actors = (await q(`
      select p.oid::regprocedure::text as sig
        from pg_proc p
       where p.pronamespace = 'public'::regnamespace and not p.prosecdef
         and p.prosrc ~ '(has_role|is_privileged)\\s*\\(\\s*v_actor'
         and p.prosrc !~ 'v_actor\\s+uuid\\s*:=\\s*public\\.current_user_id\\(\\)'`)).rows;
    assert(actors.length === 0, `v_actor is not declared as the caller in: ${actors.map((r) => r.sig).join(', ')}`);
  });

  await test('sweep: no stable function the API roles may call tells a staff account from an ordinary one', async () => {
    const fns = (await q(`
      select p.oid::regprocedure::text as sig, p.proname::text as name,
             (select array_agg(format_type(t, null) order by o) from unnest(p.proargtypes) with ordinality as x(t, o)) as args,
             has_function_privilege('anon', p.oid, 'execute') as anon,
             has_function_privilege('authenticated', p.oid, 'execute') as auth
        from pg_proc p
       where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
         and p.provolatile <> 'v'
         and exists (select 1 from unnest(p.proargtypes) t where t = 'uuid'::regtype)`)).rows;
    assert(fns.length > 100, `the sweep found only ${fns.length} functions; it is not looking at the schema`);
    const KNOWN = ['uuid', 'text', 'boolean', 'integer', 'bigint', 'jsonb', 'date', 'timestamp with time zone', 'numeric'];
    const TEXTS = ['platform_admin', 'support_agent', 'x', 'flag', null];
    const other = '00000000-0000-4000-8000-00000000abcd';
    const answer = async (actor, fn, values) => {
      const ph = values.map((_, i) => `$${i + 1}::${fn.args[i]}`).join(', ');
      try {
        const r = await as(actor, `select public.${fn.name}(${ph}) as v`, values);
        return JSON.stringify(r.rows.map((row) => row.v));
      } catch (e) {
        return `refused ${String(e.message).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>')}`;
      }
    };
    const found = new Set();
    let asked = 0;
    await scene(async () => {
      for (const fn of fns) {
        if (fn.args.some((a) => !KNOWN.includes(a))) continue;
        const positions = fn.args.map((a, i) => (a === 'uuid' ? i : -1)).filter((i) => i >= 0);
        const texts = fn.args.includes('text') ? TEXTS : [null];
        for (const pos of positions) for (const text of texts) for (const actor of [asker, null]) {
          if (actor === null ? !fn.anon : !fn.auth) continue;
          const base = fn.args.map((a) => (a === 'uuid' ? other : a === 'text' ? text : null));
          const aboutStaff = [...base]; aboutStaff[pos] = staff;
          const aboutOrdinary = [...base]; aboutOrdinary[pos] = ordinary;
          const [s, o] = [await answer(actor, fn, aboutStaff), await answer(actor, fn, aboutOrdinary)];
          asked += 1;
          if (s !== o) found.add(`${actor ? 'authenticated' : 'anon'} ${fn.sig} argument ${pos + 1}: staff ${s.slice(0, 60)} | ordinary ${o.slice(0, 60)}`);
        }
      }
    });
    assert(asked > 200, `the sweep asked only ${asked} pairs of questions`);
    assert(found.size === 0, `these tell staff from an ordinary account:\n${[...found].join('\n')}`);
  });
}
