// Platform help is shared, reviewed text: no learner's data and no AI inference.
export async function run(ctx) {
  const { q, test, assert, rejects, asUser, asAnon, newUser, newProfile, bootstrapAdmin } = ctx;
  const owner = await bootstrapAdmin('platform-help-owner@example.com');
  const reader = await newUser('platform-help-reader@example.com');
  await newProfile(reader, 'Help reader');

  await test('published help is visible to signed-in learners, not to anonymous callers', async () => {
    const rows = (await asUser(reader, () => q('select * from public.platform_help_articles'))).rows;
    assert(rows.length >= 3 && rows.every((r) => r.status === 'published'), 'published help not readable');
    const anonymous = (await asAnon(() => q('select * from public.platform_help_articles'))).rows;
    assert(anonymous.length === 0, 'a session without a user can read published help');
  });

  await test('draft and archived articles are not visible to ordinary users', async () => {
    await asUser(owner, async () => {
      await q("select public.save_platform_help_article(null,'Draft help','A private draft of platform instructions.','','draft')");
      await q("select public.save_platform_help_article(null,'Archived help','An archived platform instruction.','','archived')");
      const all = (await q('select status from public.platform_help_articles')).rows;
      assert(all.some((r) => r.status === 'draft') && all.some((r) => r.status === 'archived'), 'owner cannot see unpublished articles');
      await q("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: reader })]);
      const visible = (await q('select status from public.platform_help_articles')).rows;
      assert(visible.length >= 3 && visible.every((r) => r.status === 'published'), 'unpublished text leaked');
    });
  });

  await test('only a platform admin may write, including through the RPC', async () => {
    await rejects(() => asUser(reader, () => q("select public.save_platform_help_article(null,'New title','A complete answer here.','','published')")), /Only a platform admin/);
    await rejects(() => asUser(reader, () => q("insert into public.platform_help_articles(title,body,status) values ('New title','A complete answer here.','published')")), /permission denied/);
  });

  await test('the owner can publish and archive with a recorded actor', async () => {
    await asUser(owner, async () => {
      const id = (await q("select public.save_platform_help_article(null,'Owner test','A carefully reviewed answer.','test','published') as id")).rows[0].id;
      const event = (await q("select actor, detail from public.governance_audit_events where target_id=$1 and action='platform_help.saved'", [id])).rows[0];
      assert(event?.actor === owner && event.detail.status === 'published', 'publication not audited');
      await q("select public.save_platform_help_article($1,'Owner test','A carefully reviewed answer.','test','archived')", [id]);
      await q("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: reader })]);
      assert((await q('select id from public.platform_help_articles where id=$1', [id])).rows.length === 0, 'archived article still visible');
    });
  });

  await test('invalid article and missing article are refused', async () => {
    await rejects(() => asUser(owner, () => q("select public.save_platform_help_article(null,'x','short','','published')")), /Check the title/);
    await rejects(() => asUser(owner, () => q("select public.save_platform_help_article(gen_random_uuid(),'Good title','A valid answer for this test.','','draft')")), /not found/);
  });
}
