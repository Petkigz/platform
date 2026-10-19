// Reordering is a versioned authoring write: swaps are atomic, draft-only,
// scoped to the owning list, and leave an audit event.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newInstructor, newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('reorder-admin@example.com');
  const teacher = await newInstructor('reorder-teacher@example.com', admin);
  const stranger = await newInstructor('reorder-stranger@example.com', admin);
  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const sections = await Promise.all([
    newSection(version, { title: 'First', position: 1 }),
    newSection(version, { title: 'Second', position: 2 }),
    newSection(version, { title: 'Third', position: 3 }),
  ]);
  const lessons = await Promise.all([
    newLesson(sections[0], { title: 'Lesson one', position: 1 }),
    newLesson(sections[0], { title: 'Lesson two', position: 2 }),
    newLesson(sections[0], { title: 'Lesson three', position: 3 }),
  ]);
  await q(
    `insert into public.lesson_resources
       (lesson_id,resource_type,external_url,display_name,position)
     values ($1,'video','https://cdn.example.com/one.mp4','One',1),
            ($1,'video','https://cdn.example.com/two.mp4','Two',2)`, [lessons[0]]);
  const resources = (await q(
    `select id from public.lesson_resources where lesson_id=$1 order by position`,
    [lessons[0]])).rows.map(row => row.id);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('commit');
      return result;
    } catch (error) {
      await q('rollback');
      throw error;
    }
  }

  const move = (actor, type, id, direction) => asActor(actor,
    'select public.move_course_content($1,$2,$3) as position', [type, id, direction]);

  await test('sections, lessons and resources swap with their nearest neighbour', async () => {
    const movedSection = await move(teacher, 'section', sections[2], 'up');
    assert(movedSection.rows[0].position === 2, 'section did not report its new position');
    const sectionOrder = (await q(
      `select title from public.course_sections where course_version_id=$1 order by position`,
      [version])).rows.map(row => row.title);
    assert(sectionOrder.join(',') === 'First,Third,Second', 'section order was not swapped');

    await move(teacher, 'lesson', lessons[0], 'down');
    const lessonOrder = (await q(
      `select title from public.lessons where section_id=$1 order by position`,
      [sections[0]])).rows.map(row => row.title);
    assert(lessonOrder.join(',') === 'Lesson two,Lesson one,Lesson three',
      'lesson moved outside its section or to the wrong position');

    await move(teacher, 'resource', resources[1], 'up');
    const resourceOrder = (await q(
      `select display_name from public.lesson_resources where lesson_id=$1 order by position`,
      [lessons[0]])).rows.map(row => row.display_name);
    assert(resourceOrder.join(',') === 'Two,One', 'resource order was not swapped');
  });

  await test('the first and last items cannot move beyond their list', async () => {
    await rejects(() => move(teacher, 'section', sections[0], 'up'), /already at the start/i);
    await rejects(() => move(teacher, 'lesson', lessons[2], 'down'), /already at the end/i);
    await rejects(() => move(teacher, 'resource', resources[1], 'up'), /already at the start/i);
  });

  await test('only the course author can reorder someone else’s draft', async () => {
    await rejects(() => move(stranger, 'section', sections[0], 'down'), /only the course author/i);
    const order = (await q(
      `select title from public.course_sections where course_version_id=$1 order by position`,
      [version])).rows.map(row => row.title);
    assert(order.join(',') === 'First,Third,Second', 'a rejected move changed the outline');
  });

  await test('submitted content is locked against reordering', async () => {
    const lockedCourse = await newCourse(teacher, { status: 'active' });
    const lockedVersion = await newVersion(lockedCourse, teacher);
    const lockedSection = await newSection(lockedVersion);
    await newLesson(lockedSection);
    await asActor(teacher,
      'select id from public.set_course_version_status($1,$2,$3,$4)',
      [lockedVersion, 'submitted', teacher, 'reordering lock test']);
    await rejects(() => move(teacher, 'section', lockedSection, 'down'), /only draft course content/i);
  });

  await test('unsupported content types and directions are rejected', async () => {
    await rejects(() => move(teacher, 'course', sections[0], 'down'), /unsupported content type/i);
    await rejects(() => move(teacher, 'section', sections[0], 'sideways'), /choose up or down/i);
  });

  await test('each successful move writes its direction and position change to the audit trail', async () => {
    const events = (await q(
      `select detail from public.governance_audit_events
        where actor=$1 and action='course.content_reordered' and target_type in ('section','lesson','resource')
        order by occurred_at`, [teacher])).rows;
    assert(events.length === 3, `expected 3 successful move events, got ${events.length}`);
    assert(events[0].detail.direction === 'up' && events[0].detail.from_position === 3
      && events[0].detail.to_position === 2, 'audit event omitted the move');
    assert(events[2].detail.course_version_id === version, 'audit event omitted the version');
  });
}
