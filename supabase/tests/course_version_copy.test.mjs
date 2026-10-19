// Starting the next version must preserve the authored teaching material while
// giving it new IDs, so existing enrolments and certificates stay immutable.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('copy-admin@example.com');
  const teacher = await newInstructor('copy-teacher@example.com', admin);
  const other = await newInstructor('copy-other@example.com', admin);
  const reviewer = await newReviewer('copy-reviewer@example.com', admin);

  async function asActor(actor, sql, params) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let result;
    try {
      result = await q(sql, params);
    } catch (error) {
      await q('rollback');
      throw error;
    }
    await q('commit');
    return result;
  }

  const course = await newCourse(teacher, { status: 'active' });
  const source = await newVersion(course, teacher);
  const section = await newSection(source, { title: 'Foundations' });
  const lesson = await newLesson(section, {
    position: 1,
    title: 'Opening lesson',
    is_preview: true,
  });
  await q(`insert into public.lesson_resources
             (lesson_id,resource_type,external_url,display_name,position,access_classification)
           values ($1,'video','https://cdn.example.com/opening.mp4','Opening sample',1,'public_preview')`,
    [lesson]);
  const subjectId = (await q(
    `select id from public.subject_areas where code='quran' and deleted_at is null`,
  )).rows[0].id;
  await q(`insert into public.course_version_subjects(course_version_id,subject_area_id)
           values ($1,$2)`, [source, subjectId]);

  const assessment = (await q(
    `insert into public.assessments
       (course_version_id,lesson_id,title,type,pass_threshold,status)
     values ($1,$2,'Opening check','graded',70,'active') returning id`,
    [source, lesson])).rows[0].id;
  await q(`insert into public.assessment_questions
             (assessment_id,type,content,answer_key,points,position,grading_method)
           values ($1,'single_choice','{"prompt":"Which chapter opens the Quran?"}'::jsonb,
                   '{"answer":"Al-Fatiha"}'::jsonb,1,1,'automatic')`, [assessment]);

  const policy = (await q(
    `insert into public.course_completion_policies
       (course_version_id,completion_mode,certificate_enabled)
     values ($1,'requirements',false) returning id`, [source])).rows[0].id;
  await q(`insert into public.course_completion_requirements
             (completion_policy_id,type,target_lesson_id,position)
           values ($1,'lesson_completion',$2,1)`, [policy, lesson]);
  await q(`insert into public.course_completion_requirements
             (completion_policy_id,type,target_assessment_id,minimum_score,position)
           values ($1,'assessment_passed',$2,70,2)`, [policy, assessment]);

  const citation = (await q(
    `insert into public.content_sources
       (course_version_id,source_type,title,author_or_compiler,reference_locator,created_by)
     values ($1,'quran','The Quran','Translation team','1:1-7',$2) returning id`,
    [source, teacher])).rows[0].id;
  await q(`insert into public.content_source_links(content_source_id,lesson_id,anchor)
           values ($1,$2,'00:00')`, [citation, lesson]);

  await q('select id from public.set_course_version_status($1,$2,$3,$4)',
    [source, 'submitted', teacher, 'copy fixture']);
  await q('select id from public.set_course_version_status($1,$2,$3,$4)',
    [source, 'approved', reviewer, 'copy fixture']);
  await satisfyReview(source, reviewer, admin);
  await q('select id from public.set_course_version_status($1,$2,$3,$4)',
    [source, 'published', admin, 'copy fixture']);
  const productId = (await q(
    `insert into public.products(product_type,name,status,created_by)
     values ('course','Foundations course','active',$1) returning id`, [teacher])).rows[0].id;
  await q(`insert into public.product_course_versions(product_id,course_id,course_version_id)
           values ($1,$2,$3)`, [productId, course, source]);
  await q(`insert into public.prices(product_id,amount_minor,currency_code,billing_interval,status)
           values ($1,2500,'USD','one_time','active')`, [productId]);

  let copiedVersion;
  await test('the author creates a new draft by copying the published curriculum', async () => {
    const created = await asActor(teacher,
      'select version_id,version_number from public.create_course_version_from($1)', [source]);
    assert(created.rows.length === 1, 'the copy writer returned no version');
    copiedVersion = created.rows[0].version_id;
    assert(created.rows[0].version_number === 2, 'version number was not incremented');

    const version = (await q(
      `select version_status,language,created_by from public.course_versions where id=$1`,
      [copiedVersion])).rows[0];
    assert(version.version_status === 'draft', 'the copy was not an editable draft');
    assert(version.language === 'en' && version.created_by === teacher,
      'language or author was not preserved');
    assert(await q('select 1 from public.course_versions where id=$1 and version_status=\'published\'', [source]).then(r => r.rows.length) === 1,
      'the source version was modified');
  });

  await test('the copied lesson tree, preview, resources and subjects receive new version-owned rows', async () => {
    const newSection = (await q(
      `select id,title,position from public.course_sections where course_version_id=$1`,
      [copiedVersion])).rows[0];
    assert(newSection?.title === 'Foundations', 'section was not copied');
    const newLesson = (await q(
      `select id,title,is_preview from public.lessons where section_id=$1`, [newSection.id])).rows[0];
    assert(newLesson?.title === 'Opening lesson' && newLesson.is_preview === true,
      'lesson title or preview setting was not copied');
    assert(newLesson.id !== lesson, 'lesson ID was reused across versions');

    const resource = (await q(
      `select lesson_id,external_url,access_classification from public.lesson_resources where lesson_id=$1`,
      [newLesson.id])).rows[0];
    assert(resource?.external_url === 'https://cdn.example.com/opening.mp4'
      && resource.access_classification === 'public_preview', 'resource settings were not copied');
    assert(resource.lesson_id !== lesson, 'resource remained attached to the source lesson');

    assert((await q(
      `select 1 from public.course_version_subjects where course_version_id=$1 and subject_area_id=$2`,
      [copiedVersion, subjectId])).rows.length === 1, 'subject mapping was not copied');
  });

  await test('paid products and their current price stay attached, so the copied version cannot become accidentally free', async () => {
    const linked = await q(
      `select 1 from public.product_course_versions where product_id=$1 and course_version_id=$2`,
      [productId, copiedVersion]);
    assert(linked.rows.length === 1, 'existing product link was not carried forward');
    const sold = (await q('select public.is_sold_version($1) as sold', [copiedVersion])).rows[0].sold;
    assert(sold === true, 'the copied paid version would allow a free enrolment');
    const price = (await q(
      `select amount_minor,currency_code,status from public.prices where product_id=$1`, [productId])).rows[0];
    assert(Number(price.amount_minor) === 2500 && price.currency_code.trim() === 'USD' && price.status === 'active',
      `copying the version changed its existing price: ${JSON.stringify(price)}`);
  });

  await test('assessments, answer keys and completion requirements point only to copied content', async () => {
    const newLesson = (await q(
      `select l.id from public.lessons l join public.course_sections cs on cs.id=l.section_id
        where cs.course_version_id=$1`, [copiedVersion])).rows[0].id;
    const newAssessment = (await q(
      `select id,lesson_id,status from public.assessments where course_version_id=$1`,
      [copiedVersion])).rows[0];
    assert(newAssessment?.lesson_id === newLesson && newAssessment.status === 'active',
      'assessment was not copied against the new lesson');
    const question = (await q(
      `select answer_key from public.assessment_questions where assessment_id=$1`,
      [newAssessment.id])).rows[0];
    assert(question.answer_key.answer === 'Al-Fatiha', 'answer key was lost');

    const newPolicy = (await q(
      `select id from public.course_completion_policies where course_version_id=$1`,
      [copiedVersion])).rows[0].id;
    const requirements = (await q(
      `select target_lesson_id,target_assessment_id from public.course_completion_requirements
        where completion_policy_id=$1 order by position`, [newPolicy])).rows;
    assert(requirements.length === 2, 'completion requirements were not copied');
    assert(requirements[0].target_lesson_id === newLesson, 'lesson requirement points to old content');
    assert(requirements[1].target_assessment_id === newAssessment.id,
      'assessment requirement points to old content');
  });

  await test('source citations follow the copied lesson with new IDs', async () => {
    const link = (await q(
      `select cs.id as source_id,csl.lesson_id,cs.title
         from public.content_source_links csl
         join public.content_sources cs on cs.id=csl.content_source_id
        where cs.course_version_id=$1`, [copiedVersion])).rows[0];
    const newLesson = (await q(
      `select l.id from public.lessons l join public.course_sections s on s.id=l.section_id
        where s.course_version_id=$1`, [copiedVersion])).rows[0].id;
    assert(link?.title === 'The Quran' && link.lesson_id === newLesson,
      'citation or its lesson anchor was not copied');
    assert(link.source_id !== citation, 'the source row was shared across versions');
  });

  await test('only the author can copy, and a course can have only one active draft/review at a time', async () => {
    await rejects(() => asActor(other,
      'select version_id from public.create_course_version_from($1)', [source]),
      /only the course author/i);
    await rejects(() => asActor(teacher,
      'select version_id from public.create_course_version_from($1)', [source]),
      /already has a draft or a version in review/i);
  });
}
