// The privacy notice that describes the discussion boards is in the register
// as a draft (20261281160000, the owner's instruction of 2026-11-26), and is
// not in force until the owner approves it.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('notice-admin@example.com');
  const visitor = await newUser('notice-visitor@example.com');
  await newProfile(visitor, 'Notice Visitor');

  let step = 0;
  async function asActor(actor, sql, params = []) {
    const point = `notice_${step += 1}`;
    await q(`savepoint ${point}`);
    await q(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
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
  const call = async (actor, fn, params = []) => (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;
  const versions = async () => (await q(
    `select v.id, v.version_number n, v.status, v.body, v.change_note, v.effective_at, v.approved_at
       from public.policy_versions v join public.policy_documents d on d.id = v.document_id
      where d.slug = 'privacy' order by v.version_number`)).rows;

  console.log('\nThe privacy notice that describes the boards, as a draft');

  await q('begin');
  try {
    const rows = await versions();
    const draft = rows.find((r) => r.status === 'draft' && r.body.includes('## The discussion boards'));
    const live = rows.find((r) => r.status === 'in_force');

    await test('it is the next version, a draft, and the version in force is untouched', async () => {
      assert(draft, 'there is no draft with the section on the boards');
      assert(live && live.n === 2, `version ${live?.n} is in force, not 2`);
      assert(draft.n === 3 && draft.effective_at === null && draft.approved_at === null,
        `the draft is version ${draft.n}, effective ${draft.effective_at}`);
      assert(!live.body.includes('discussion boards'), 'the version in force already speaks of the boards');
      assert(rows.filter((r) => r.status === 'draft' && r.body.includes('## The discussion boards')).length === 1);
      assert((await q(`select public.policy_open_decisions($1) as n`, [draft.body])).rows[0].n === 0);
      const audit = (await q(
        `select actor, detail from public.governance_audit_events where action = 'policy.draft_saved' and target_id = $1`, [draft.id])).rows;
      assert(audit.length === 1 && audit[0].actor === null && audit[0].detail.versionNumber === 3 && audit[0].detail.slug === 'privacy');
    });

    await test('it says what the platform does with a board post, and no longer what is untrue of one', async () => {
      for (const said of [
        'What you write there is kept, with no time limit.',
        'A post comes off the board when you take it back, when a moderator takes it down, or when you close your account.',
        'Taking a post off the board does not erase it from the record, and the platform gives nobody a way to erase it.',
        'Neither you nor other members then see it, and the words stay in the platform\'s record.',
        'They can still read a post that you took back or that a moderator took down.',
        'they write down a reason first, and the reason is recorded against their own account',
        'Teachers, support staff and other staff can do none of this.',
        'A copy of your posts is not given on request. It is given where a law requires it and a court orders it.',
        'What is written on the discussion boards is kept with no time limit, as the section on the boards says.',
        'your email address or your mobile number',
        'Email, where the platform sends any, is sent through Resend.',
        'What a child writes on a board is kept in the same way as anybody\'s.',
      ]) {
        assert(draft.body.includes(said), `the draft does not say: ${said}`);
      }
      for (const untrue of ['You can download everything held about you', '\nYes. Personal data', 'the database and the screens are the\ndescription']) {
        assert(!draft.body.includes(untrue), `the draft still says: ${untrue}`);
      }
      // Every section of the version in force is still there, and one is new.
      const heads = (body) => [...body.matchAll(/^## (.+)$/gmu)].map((m) => m[1]);
      const before = heads(live.body);
      const after = heads(draft.body);
      for (const head of before) assert(after.includes(head), `the section "${head}" is gone`);
      assert(JSON.stringify(after.filter((h) => !before.includes(h))) === JSON.stringify(['The discussion boards']));
    });

    await test('nobody is asked to agree to it, and nobody reads it, until the owner publishes it', async () => {
      const page = await call(visitor, 'policy_page($1)', ['privacy']);
      assert(JSON.stringify(page).includes('"versionNumber": 2') || page.versionNumber === 2,
        `the page shows version ${page.versionNumber}`);
      assert(!JSON.stringify(page).includes('The discussion boards'), 'a visitor is shown the draft');
      await rejects(() => call(visitor, 'accept_policy($1,$2)', ['privacy', 3]));
      await rejects(() => call(visitor, 'approve_policy_version($1,$2,$3)', [draft.id, '2026-12-01', 'A visitor tries to publish it.']));

      // The owner publishes it: it is in force, version 2 is retired, and it is what a visitor reads.
      await call(admin, 'approve_policy_version($1,$2,$3)', [draft.id, '2026-11-26', 'The owner read the draft and publishes it.']);
      const now = await versions();
      assert(now.find((r) => r.n === 3).status === 'in_force' && now.find((r) => r.n === 2).status === 'retired');
      const shown = await call(visitor, 'policy_page($1)', ['privacy']);
      assert(shown.versionNumber === 3 && JSON.stringify(shown).includes('The discussion boards'));
      await call(visitor, 'accept_policy($1,$2)', ['privacy', 3]);
    });
  } finally {
    await q('rollback');
  }
}
