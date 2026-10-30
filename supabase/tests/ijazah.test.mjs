// An ijazah is recorded, not verified — and the register says so.
//
// The temptation in this area is to build a badge: a gold tick on a teacher's
// page and a public chain a learner can click. That is exactly what the owner's
// decision of 2026-10-30 held back, because the platform has no standing to
// check a chain of transmission. So these tests are mostly about restraint:
// nothing is public, nothing is called verified, nothing can be edited, and the
// evidence the owner saw does not travel back out to the holder's screen.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile,
  } = ctx;

  const admin = await bootstrapAdmin('ij-admin@example.com');

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

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function setFlag(on) {
    await q(`update public.platform_settings set value_text = $2 where key = $1`,
      ['learning.ijazah', on ? 'true' : 'false']);
  }

  let seq = 0;
  async function person(label) {
    seq += 1;
    const id = await newUser(`ij-${seq}@example.com`);
    await newProfile(id, label);
    return id;
  }

  const record = (who, grantee, overrides = {}) => {
    const args = {
      grantedBy: 'Shaykh Abdallāh al-Yūsufī',
      scope: 'Ḥafṣ ʿan ʿĀṣim, full recitation',
      evidence: 'Signed page shown by the holder at a sitting in Kampala, 3 pages',
      chain: 'al-Yūsufī ← ʿAbd al-Raḥmān ← … ← the Prophet ﷺ',
      grantedOn: '2019-04-12',
      ...overrides,
    };
    return asActor(who,
      `select public.record_ijazah($1,$2,$3,$4,$5,$6) r`,
      [grantee, args.grantedBy, args.scope, args.evidence, args.grantedOn, args.chain])
      .then((r) => r.rows[0].r);
  };

  const mine = (who) =>
    asActor(who, `select public.my_ijazah_authorisations() a`).then((r) => r.rows[0].a);

  const teacher = await person('A Teacher');
  const other = await person('Somebody Else');

  // The owner records ijazahs for teachers, so the register offers the people who
  // hold that role — which is also how the screen knows who to list.
  const instructorRole = (await scalar(`select id from public.roles where code = 'instructor'`)).id;
  await q(`insert into public.user_role_assignments (user_id, role_id, assigned_by)
           values ($1,$2,$3)`, [teacher, instructorRole, admin]);

  // ---------------------------------------------------------------------------
  // The register, and the flag
  // ---------------------------------------------------------------------------

  await test('the flag is now the owner\'s switch, and says what is not published', async () => {
    const row = await scalar(
      `select value_text, gate_type, description, preconditions
         from public.platform_settings where key = 'learning.ijazah'`);
    assert(row.value_text === 'false', `ships as ${row.value_text}`);
    assert(row.gate_type === 'admin', `gated as ${row.gate_type}`);
    assert(/owner/i.test(row.preconditions), 'the precondition names who records one');
    assert(/NOT built|no public chain view/i.test(row.preconditions),
      'and says plainly that nothing is published');
  });

  await test('while the switch is off, nothing can be recorded', async () => {
    await rejects(() => record(admin, teacher), /ijazah:disabled/);
  });

  await setFlag(true);

  try {
    await test('the owner alone can record one — not staff, not a teacher', async () => {
      const staff = await person('A Governance Admin');
      const role = (await scalar(`select id from public.roles where code = 'governance_admin'`)).id;
      await q(`insert into public.user_role_assignments (user_id, role_id, assigned_by)
               values ($1,$2,$3)`, [staff, role, admin]);

      await rejects(() => record(staff, teacher), /ijazah:owner_only/);
      await rejects(() => record(teacher, teacher), /ijazah:owner_only/);
      await rejects(() => record(other, teacher), /ijazah:owner_only/);
    });

    await test('a row needs a grantor, a scope and evidence', async () => {
      await rejects(() => record(admin, teacher, { grantedBy: '   ' }), /ijazah:needs_grantor/);
      await rejects(() => record(admin, teacher, { scope: '' }), /ijazah:needs_scope/);
      await rejects(() => record(admin, teacher, { evidence: '  ' }), /ijazah:needs_evidence/);
    });

    await test('a date in the future is refused rather than stored as a claim', async () => {
      await rejects(() => record(admin, teacher, {
        grantedOn: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
      }), /ijazah:future_date/);
    });

    await test('the owner records one, and it is audited', async () => {
      const result = await record(admin, teacher);
      assert(result.status === 'recorded', `status was ${result.status}`);
      assert(result.displayName === 'A Teacher', `grantee was ${result.displayName}`);

      const row = await scalar(
        `select granted_by, scope, chain, granted_on, evidence, status
           from public.ijazah_authorisations where id = $1`, [result.id]);
      assert(row.granted_by === 'Shaykh Abdallāh al-Yūsufī', 'the grantor was rewritten');
      assert(row.scope === 'Ḥafṣ ʿan ʿĀṣim, full recitation', 'the scope was rewritten');
      assert(row.chain.includes('←'), 'the chain was not stored as written');
      assert(row.granted_on.toISOString().slice(0, 10) === '2019-04-12', 'the date moved');
      assert(row.status === 'recorded');

      const audit = await scalar(
        `select detail from public.governance_audit_events
          where action = 'ijazah.recorded' and target_id = $1
          order by occurred_at desc limit 1`, [teacher]);
      assert(audit && audit.detail.ijazahId === result.id, 'the record was not audited');
      assert(!JSON.stringify(audit.detail).includes('Signed page'),
        'the audit row copied the evidence');
    });

    await test('the same authorisation cannot be entered twice', async () => {
      await rejects(() => record(admin, teacher), /ijazah:already_recorded/);
    });

    await test('an authorisation with no date is a real answer, not a blank', async () => {
      const result = await record(admin, other, {
        grantedOn: null, scope: 'al-Ājurrūmiyyah', grantedBy: 'Shaykh Yaḥyā',
        evidence: 'Shown the cover page with the grantor’s seal',
      });
      assert(result.status === 'recorded');
      const row = await scalar(
        `select granted_on from public.ijazah_authorisations where id = $1`, [result.id]);
      assert(row.granted_on === null, 'a missing date was invented');
    });
  } finally {
    // The remaining tests want the flag on, so it is restored at the end.
  }

  // ---------------------------------------------------------------------------
  // Nothing is edited, nothing is deleted
  // ---------------------------------------------------------------------------

  const first = (await scalar(
    `select id, grantee_user_id from public.ijazah_authorisations
      where grantee_user_id = $1 and status = 'recorded' limit 1`, [teacher]));

  await test('a row cannot be edited, only withdrawn', async () => {
    await rejects(() => q(
      `update public.ijazah_authorisations set scope = 'Something else' where id = $1`,
      [first.id]), /cannot be edited/);
    await rejects(() => q(
      `update public.ijazah_authorisations set evidence = 'nothing' where id = $1`,
      [first.id]), /cannot be edited/);
  });

  await test('a row cannot be deleted at all', async () => {
    await rejects(() => q(
      `delete from public.ijazah_authorisations where id = $1`, [first.id]),
      /cannot be deleted/);
  });

  await test('a withdrawal needs a reason, and keeps one', async () => {
    await rejects(() => asActor(admin, `select public.withdraw_ijazah($1,$2)`, [first.id, '  ']),
      /ijazah:needs_reason/);

    await asActor(admin, `select public.withdraw_ijazah($1,$2)`,
      [first.id, 'The grantor wrote to say the page was not his']);

    const row = await scalar(
      `select status, withdrawn_at, withdrawn_reason from public.ijazah_authorisations
        where id = $1`, [first.id]);
    assert(row.status === 'withdrawn', `status was ${row.status}`);
    assert(row.withdrawn_at !== null, 'no withdrawal date');
    assert(/not his/.test(row.withdrawn_reason), 'the reason was not kept');

    // And it cannot be withdrawn twice.
    await rejects(() => asActor(admin, `select public.withdraw_ijazah($1,$2)`, [first.id, 'again']),
      /already withdrawn/);
  });

  await test('a withdrawal by somebody who is not the owner is refused', async () => {
    const second = (await scalar(
      `select id from public.ijazah_authorisations
        where grantee_user_id = $1 and status = 'recorded' limit 1`, [other]));
    await rejects(() => asActor(teacher, `select public.withdraw_ijazah($1,$2)`,
      [second.id, 'I would rather not']), /ijazah:owner_only/);
  });

  await test('a withdrawn authorisation can be recorded again, on new evidence', async () => {
    const again = await record(admin, teacher, {
      evidence: 'A second sitting, with the grantor present by telephone',
    });
    assert(again.status === 'recorded');
    const n = (await scalar(
      `select count(*)::int n from public.ijazah_authorisations
        where grantee_user_id = $1 and status = 'recorded'`, [teacher])).n;
    assert(n === 1, `the holder has ${n} live authorisations for one scope`);
  });

  // ---------------------------------------------------------------------------
  // Who can see it
  // ---------------------------------------------------------------------------

  await test('the holder reads their own, and never the evidence', async () => {
    const list = await mine(teacher);
    assert(list.length >= 1, 'the holder saw nothing of their own');
    const live = list.find((a) => a.status === 'recorded');
    assert(live.grantedBy === 'Shaykh Abdallāh al-Yūsufī', 'the grantor was not reported');
    assert(!('evidence' in live), 'the evidence travelled to the holder');

    // And a column grant, not a page trick: selecting it is refused outright.
    await rejects(() => asActor(teacher,
      `select evidence from public.ijazah_authorisations where grantee_user_id = $1`, [teacher]),
      /permission denied/i);
  });

  await test('a stranger reads nothing at all', async () => {
    const stranger = await person('A Stranger');
    const list = await mine(stranger);
    assert(list.length === 0, `a stranger saw ${list.length} authorisations`);

    const rows = await asActor(stranger,
      `select count(*)::int n from public.ijazah_authorisations`);
    assert(rows.rows[0].n === 0, 'a stranger could read the register');
  });

  await test('nothing is public: anon cannot read the table or the functions', async () => {
    // One transaction each: a refused statement aborts the transaction it is in,
    // and a second attempt inside the same one would fail for the wrong reason.
    const asAnon = async (sql) => {
      await q('begin');
      await q(`select set_config('request.jwt.claims', '', true)`);
      await q('set local role anon');
      try {
        await q(sql);
        await q('rollback');
      } catch (e) {
        await q('rollback');
        throw e;
      }
    };

    await rejects(() => asAnon(`select count(*) from public.ijazah_authorisations`),
      /permission denied/i);
    await rejects(() => asAnon(`select public.my_ijazah_authorisations()`),
      /permission denied/i);
    await rejects(() => asAnon(`select public.ijazah_register()`),
      /permission denied/i);
  });

  await test('the staff register withholds the evidence text itself', async () => {
    const register = await asActor(admin, `select public.ijazah_register() r`)
      .then((r) => r.rows[0].r);
    assert(Array.isArray(register.authorisations) && register.authorisations.length >= 2,
      'the register came back empty');
    const row = register.authorisations[0];
    assert(!('evidence' in row), 'the register shipped the evidence text');
    assert(row.hasEvidence === true, 'the register did not say evidence was seen');
    assert(Array.isArray(register.candidates) && register.candidates.length >= 1,
      'the register offered nobody to record against');
  });

  await test('a non-staff caller cannot open the register', async () => {
    await rejects(() => asActor(teacher, `select public.ijazah_register()`), /ijazah:staff_only/);
  });

  await setFlag(false);
}
