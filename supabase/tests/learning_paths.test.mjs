// Curated journeys through published courses.
// The path points at stable course ids, not course-version ids. Publishing a
// path creates no enrolments or entitlements; it is a catalogue/ordering layer.

export async function run(ctx){
  const {q,test,assert,rejects,bootstrapAdmin,newUser,newProfile,newInstructor,newReviewer,satisfyReview,newCourse,newVersion,newSection,newLesson}=ctx;
  const admin=await bootstrapAdmin('paths-admin@example.com');
  const teacher=await newInstructor('paths-teacher@example.com',admin);
  const otherTeacher=await newInstructor('paths-other@example.com',admin);
  const reviewer=await newReviewer('paths-reviewer@example.com',admin);
  const outsider=await newUser('paths-outsider@example.com');await newProfile(outsider,'Outsider');

  async function asActor(actor,sql,params=[]){await q('begin');await q("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor,role:'authenticated'})]);await q('set local role authenticated');try{const r=await q(sql,params);await q('commit');return r;}catch(e){await q('rollback');throw e;}}
  const transition=(id,status,actor)=>q('select id from public.set_course_version_status($1,$2,$3,$4)',[id,status,actor,'learning path test']);
  async function publishedCourse(author=teacher){
    const course=await newCourse(author,{status:'active'});const version=await newVersion(course,author);const section=await newSection(version);await newLesson(section);
    await transition(version,'submitted',author);await transition(version,'approved',reviewer);await satisfyReview(version,reviewer,admin);await transition(version,'published',admin);return course;
  }
  async function draftCourse(author=teacher){const course=await newCourse(author,{status:'active'});const version=await newVersion(course,author);return {course,version};}
  const makePath=(who,title='Quran foundations',slug='quran-foundations',audience='both')=>asActor(who,
    'select public.create_learning_path($1,$2,$3,$4) id',[title,slug,audience,'A path through verified courses']);
  const add=(who,path,course,required=true)=>asActor(who,'select public.add_learning_path_item($1,$2,$3) id',[path,course,required]);

  await test('path author creates a draft path',async()=>{
    const id=(await makePath(teacher)).rows[0].id;
    const row=(await q('select title,slug,audience,status,created_by from public.learning_paths where id=$1',[id])).rows[0];
    assert(row.title==='Quran foundations'&&row.slug==='quran-foundations'&&row.audience==='both');
    assert(row.status==='draft'&&row.created_by===teacher);
  });

  await test('title, slug and audience are validated',async()=>{
    await rejects(()=>makePath(teacher,'   ','empty-title'),/needs a title/i);
    await rejects(()=>makePath(teacher,'Valid title','Bad Slug'),/lowercase hyphenated slug/i);
    await rejects(()=>makePath(teacher,'Valid title','valid-slug','senior'),/audience must be child, adult or both/i);
  });

  await test('only active published courses can be added',async()=>{
    const path=(await makePath(teacher,'Published only','published-only')).rows[0].id;
    const draft=await draftCourse();
    await rejects(()=>add(teacher,path,draft.course),/active, published course/i);
    const published=await publishedCourse();
    const item=(await add(teacher,path,published)).rows[0].id;
    assert(item,'item id was not returned');
  });

  await test('a path author may curate public courses authored by another teacher',async()=>{
    // These are publicly published course pages; a curated learning journey
    // may link to them without asserting ownership or republishing them.
    const course=await publishedCourse(otherTeacher);
    const path=(await makePath(teacher,'Peer courses','peer-courses')).rows[0].id;
    assert((await add(teacher,path,course)).rows[0].id);
  });

  await test('a stranger cannot add items to someone else\'s draft path',async()=>{
    const path=(await makePath(teacher,'Private draft','private-draft')).rows[0].id;
    const course=await publishedCourse();
    await rejects(()=>add(outsider,path,course),/only the path author may add/i);
  });

  await test('items append in order and can be removed only while draft',async()=>{
    const path=(await makePath(teacher,'Ordered path','ordered-path')).rows[0].id;
    const a=await publishedCourse();const b=await publishedCourse();
    const i1=(await add(teacher,path,a,true)).rows[0].id;
    const i2=(await add(teacher,path,b,false)).rows[0].id;
    const rows=(await q('select course_id,position,required from public.learning_path_items where learning_path_id=$1 order by position',[path])).rows;
    assert(rows.length===2&&Number(rows[0].position)===1&&Number(rows[1].position)===2);
    assert(rows[0].required===true&&rows[1].required===false);
    const removed=(await asActor(teacher,'select public.remove_learning_path_item($1) ok',[i1])).rows[0].ok;
    assert(removed===true);
    assert((await q('select count(*)::int n from public.learning_path_items where learning_path_id=$1',[path])).rows[0].n===1);
    const again=(await asActor(teacher,'select public.remove_learning_path_item($1) ok',[i1])).rows[0].ok;
    assert(again===false);
    assert(i2);
  });

  await test('a path cannot activate empty',async()=>{
    const path=(await makePath(teacher,'Empty path','empty-path')).rows[0].id;
    await rejects(()=>asActor(teacher,'select public.activate_learning_path($1)',[path]),/at least one course/i);
    assert((await q('select status from public.learning_paths where id=$1',[path])).rows[0].status==='draft');
  });

  await test('activation requires every course to remain published and active',async()=>{
    const path=(await makePath(teacher,'Stale path','stale-path')).rows[0].id;
    const course=await publishedCourse();await add(teacher,path,course);
    await q("update public.courses set status='retired' where id=$1",[course]);
    await rejects(()=>asActor(teacher,'select public.activate_learning_path($1)',[path]),/no longer active and published/i);
  });

  await test('valid path activates and activation is idempotent',async()=>{
    const path=(await makePath(teacher,'Live path','live-path','adult')).rows[0].id;
    const course=await publishedCourse();await add(teacher,path,course);
    const first=(await asActor(teacher,'select public.activate_learning_path($1) ok',[path])).rows[0].ok;
    const second=(await asActor(teacher,'select public.activate_learning_path($1) ok',[path])).rows[0].ok;
    assert(first===true&&second===false);
    assert((await q('select status from public.learning_paths where id=$1',[path])).rows[0].status==='active');
  });

  await test('direct insert cannot skip draft review',async()=>{
    await rejects(()=>asActor(teacher,`insert into public.learning_paths(title,slug,audience,status,created_by)
      values('Forged active','forged-active','both','active',$1)`,[teacher]),/must be created as a draft/i);
  });

  await test('direct status changes and active content edits are trigger-blocked',async()=>{
    const path=(await makePath(teacher,'Guarded active','guarded-active')).rows[0].id;
    const course=await publishedCourse();await add(teacher,path,course);await asActor(teacher,'select public.activate_learning_path($1)',[path]);
    await rejects(()=>asActor(teacher,"update public.learning_paths set status='retired' where id=$1",[path]),/status changes must use the path workflow/i);
    await rejects(()=>asActor(teacher,"update public.learning_paths set title='Changed' where id=$1",[path]),/active learning path cannot be edited/i);
    await rejects(()=>asActor(teacher,`insert into public.learning_path_items(learning_path_id,course_id,position)
      values($1,$2,9)`,[path,course]),/only be changed on a draft learning path/i);
  });

  await test('retirement needs a reason, hides the path, and cannot be undone',async()=>{
    const path=(await makePath(teacher,'Retire me','retire-me')).rows[0].id;
    await rejects(()=>asActor(teacher,"select public.retire_learning_path($1,'  ')",[path]),/written retirement reason/i);
    const retired=(await asActor(teacher,"select public.retire_learning_path($1,'Out of date') ok",[path])).rows[0].ok;
    assert(retired===true);
    const row=(await q('select status,deleted_at from public.learning_paths where id=$1',[path])).rows[0];
    assert(row.status==='retired'&&row.deleted_at!==null);
    await rejects(()=>asActor(teacher,'select public.activate_learning_path($1)',[path]),/not found/i);
  });

  await test('create, add, activate and retire are audited',async()=>{
    const path=(await makePath(teacher,'Audited path','audited-path')).rows[0].id;
    const course=await publishedCourse();await add(teacher,path,course);await asActor(teacher,'select public.activate_learning_path($1)',[path]);await asActor(teacher,"select public.retire_learning_path($1,'Finished')",[path]);
    const actions=(await q(`select action from public.governance_audit_events where target_type='learning_path' and target_id=$1 order by occurred_at`,[path])).rows.map(x=>x.action);
    assert(actions.join(',')==='learning_path.created,learning_path.course_added,learning_path.activated,learning_path.retired',`actions were ${actions.join(',')}`);
  });
}
