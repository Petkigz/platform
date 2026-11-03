-- Optional author-provided plain text, never a public preview by default.
create table public.lesson_transcripts (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  body text not null check (length(btrim(body)) > 0 and length(body) <= 100000),
  updated_at timestamptz not null default now()
);
alter table public.lesson_transcripts enable row level security;
revoke all on public.lesson_transcripts from public, anon, authenticated;
grant select on public.lesson_transcripts to authenticated;
create policy lesson_transcripts_read on public.lesson_transcripts for select to authenticated
using (
  public.current_user_id() is not null and exists (
    select 1 from public.lessons l join public.course_sections s on s.id=l.section_id
    where l.id=lesson_transcripts.lesson_id
      and (public.can_author_version(s.course_version_id)
           or public.can_review_version(s.course_version_id)
           or public.can_access_lesson_entitlement_now(l.id))
  )
);

-- Only the course author can write, and only while the version is a draft.
-- Lock the version to serialize against submission/review and publication.
create function public.save_lesson_transcript(p_lesson_id uuid, p_body text)
returns boolean
language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := public.current_user_id();
  v_owner uuid;
  v_status text;
begin
  if v_actor is null then
    raise exception 'sign in to edit a transcript' using errcode='insufficient_privilege';
  end if;
  select c.created_by, cv.version_status into v_owner, v_status
    from public.lessons l
    join public.course_sections s on s.id=l.section_id
    join public.course_versions cv on cv.id=s.course_version_id
    join public.courses c on c.id=cv.course_id
   where l.id=p_lesson_id and c.deleted_at is null
   for update of cv;
  if not found or v_owner is distinct from v_actor then
    raise exception 'only the course author can edit this transcript' using errcode='insufficient_privilege';
  end if;
  if v_status <> 'draft' then
    raise exception 'only a draft transcript can be edited' using errcode='check_violation';
  end if;
  if length(coalesce(p_body, '')) > 100000 then
    raise exception 'transcript must be at most 100000 characters' using errcode='check_violation';
  end if;
  if btrim(coalesce(p_body, '')) = '' then
    delete from public.lesson_transcripts where lesson_id=p_lesson_id;
  else
    insert into public.lesson_transcripts(lesson_id, body) values (p_lesson_id, btrim(p_body))
    on conflict (lesson_id) do update set body=excluded.body, updated_at=now();
  end if;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'lesson.transcript_saved','lesson',p_lesson_id,
         jsonb_build_object('removed', btrim(coalesce(p_body,'')) = ''));
  return true;
end;
$$;
revoke all on function public.save_lesson_transcript(uuid,text) from public, anon;
grant execute on function public.save_lesson_transcript(uuid,text) to authenticated;

-- Preserve optional transcripts when creating a new draft version.
create or replace function public.create_course_version_from(p_source_version_id uuid)
returns table(version_id uuid, version_number integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_course_id uuid;
  v_owner uuid;
  v_language text;
  v_source_status text;
  v_course_status text;
  v_version_id uuid;
  v_version_number integer;
  v_sections jsonb;
  v_lessons jsonb;
  v_resources jsonb;
  v_assessments jsonb;
  v_sources jsonb;
  v_policy_id uuid;
  v_products_copied integer:=0;
begin
  if v_actor is null then
    raise exception 'sign in to create a course version' using errcode='insufficient_privilege';
  end if;

  select cv.course_id, c.created_by, cv.language, cv.version_status, c.status
    into v_course_id, v_owner, v_language, v_source_status, v_course_status
    from public.course_versions cv
    join public.courses c on c.id=cv.course_id
   where cv.id=p_source_version_id
     and c.deleted_at is null
   for update of c;
  if not found then
    raise exception 'published source version % not found',p_source_version_id using errcode='no_data_found';
  end if;
  if v_course_status<>'active' then
    raise exception 'a retired course cannot receive a new version' using errcode='check_violation';
  end if;
  if v_source_status not in ('published','retired') then
    raise exception 'only a published or retired version can be copied' using errcode='check_violation';
  end if;
  if v_actor is distinct from v_owner then
    raise exception 'only the course author may create a version' using errcode='insufficient_privilege';
  end if;
  if exists (
    select 1 from public.course_versions cv
     where cv.course_id=v_course_id
       and cv.version_status in ('draft','submitted','approved')
  ) then
    raise exception 'this course already has a draft or a version in review' using errcode='unique_violation';
  end if;

  select coalesce(max(cv.version_number),0)+1 into v_version_number
    from public.course_versions cv where cv.course_id=v_course_id;
  insert into public.course_versions(course_id,version_number,language,version_status,created_by,change_summary)
  values(v_course_id,v_version_number,v_language,'draft',v_actor,
         'Draft copied from version '||(select cv.version_number from public.course_versions cv where cv.id=p_source_version_id))
  returning id into v_version_id;

  select coalesce(jsonb_object_agg(cs.id::text,gen_random_uuid()::text),'{}'::jsonb)
    into v_sections
    from public.course_sections cs where cs.course_version_id=p_source_version_id;
  insert into public.course_sections(id,course_version_id,title,description,position)
  select (v_sections->>cs.id::text)::uuid,v_version_id,cs.title,cs.description,cs.position
    from public.course_sections cs where cs.course_version_id=p_source_version_id;

  select coalesce(jsonb_object_agg(l.id::text,gen_random_uuid()::text),'{}'::jsonb)
    into v_lessons
    from public.lessons l
    join public.course_sections cs on cs.id=l.section_id
   where cs.course_version_id=p_source_version_id;
  insert into public.lessons
    (id,section_id,title,description,type,position,duration_seconds,completion_rule,is_preview)
  select (v_lessons->>l.id::text)::uuid,
         (v_sections->>l.section_id::text)::uuid,
         l.title,l.description,l.type,l.position,l.duration_seconds,l.completion_rule,l.is_preview
    from public.lessons l
    join public.course_sections cs on cs.id=l.section_id
   where cs.course_version_id=p_source_version_id;

  -- Map transcript rows through the same lesson IDs used for resources.
  insert into public.lesson_transcripts (lesson_id, body)
  select (v_lessons->>t.lesson_id::text)::uuid, t.body
    from public.lesson_transcripts t
    join public.lessons l on l.id=t.lesson_id
    join public.course_sections cs on cs.id=l.section_id
   where cs.course_version_id=p_source_version_id;

  select coalesce(jsonb_object_agg(lr.id::text,gen_random_uuid()::text),'{}'::jsonb)
    into v_resources
    from public.lesson_resources lr
    join public.lessons l on l.id=lr.lesson_id
    join public.course_sections cs on cs.id=l.section_id
   where cs.course_version_id=p_source_version_id;
  insert into public.lesson_resources
    (id,lesson_id,resource_type,media_asset_id,external_url,display_name,position,access_classification,technical_metadata)
  select (v_resources->>lr.id::text)::uuid,
         (v_lessons->>lr.lesson_id::text)::uuid,
         lr.resource_type,lr.media_asset_id,lr.external_url,lr.display_name,lr.position,
         lr.access_classification,lr.technical_metadata
    from public.lesson_resources lr
    join public.lessons l on l.id=lr.lesson_id
    join public.course_sections cs on cs.id=l.section_id
   where cs.course_version_id=p_source_version_id;

  insert into public.course_version_subjects(course_version_id,subject_area_id)
  select v_version_id,cvs.subject_area_id
    from public.course_version_subjects cvs
   where cvs.course_version_id=p_source_version_id;

  -- A new version of a paid course must not accidentally become free. Keep
  -- the existing product/price associations; old orders remain pinned to the
  -- version they actually purchased.
  insert into public.product_course_versions(product_id,course_id,course_version_id)
  select pcv.product_id,v_course_id,v_version_id
    from public.product_course_versions pcv
   where pcv.course_version_id=p_source_version_id;
  get diagnostics v_products_copied=row_count;

  select coalesce(jsonb_object_agg(a.id::text,gen_random_uuid()::text),'{}'::jsonb)
    into v_assessments
    from public.assessments a where a.course_version_id=p_source_version_id;
  insert into public.assessments
    (id,course_version_id,lesson_id,title,instructions,type,pass_threshold,attempt_limit,status)
  select (v_assessments->>a.id::text)::uuid,v_version_id,
         case when a.lesson_id is null then null else (v_lessons->>a.lesson_id::text)::uuid end,
         a.title,a.instructions,a.type,a.pass_threshold,a.attempt_limit,a.status
    from public.assessments a where a.course_version_id=p_source_version_id;

  insert into public.assessment_questions
    (assessment_id,type,content,answer_key,points,position,explanation,grading_method)
  select (v_assessments->>q.assessment_id::text)::uuid,
         q.type,q.content,q.answer_key,q.points,q.position,q.explanation,q.grading_method
    from public.assessment_questions q
    join public.assessments a on a.id=q.assessment_id
   where a.course_version_id=p_source_version_id;

  select coalesce(jsonb_object_agg(s.id::text,gen_random_uuid()::text),'{}'::jsonb)
    into v_sources
    from public.content_sources s where s.course_version_id=p_source_version_id;
  insert into public.content_sources
    (id,course_version_id,source_type,title,author_or_compiler,edition_or_version,reference_locator,url,notes,created_by)
  select (v_sources->>s.id::text)::uuid,v_version_id,s.source_type,s.title,
         s.author_or_compiler,s.edition_or_version,s.reference_locator,s.url,s.notes,v_actor
    from public.content_sources s where s.course_version_id=p_source_version_id;

  insert into public.content_source_links
    (content_source_id,lesson_id,lesson_resource_id,assessment_id,anchor)
  select (v_sources->>csl.content_source_id::text)::uuid,
         case when csl.lesson_id is null then null else (v_lessons->>csl.lesson_id::text)::uuid end,
         case when csl.lesson_resource_id is null then null else (v_resources->>csl.lesson_resource_id::text)::uuid end,
         case when csl.assessment_id is null then null else (v_assessments->>csl.assessment_id::text)::uuid end,
         csl.anchor
    from public.content_source_links csl
    join public.content_sources s on s.id=csl.content_source_id
   where s.course_version_id=p_source_version_id;

  select ccp.id into v_policy_id
    from public.course_completion_policies ccp
   where ccp.course_version_id=p_source_version_id;
  if found then
    v_policy_id:=gen_random_uuid();
    insert into public.course_completion_policies
      (id,course_version_id,completion_mode,minimum_progress_percent,certificate_enabled,certificate_template_version)
    select v_policy_id,v_version_id,ccp.completion_mode,ccp.minimum_progress_percent,
           ccp.certificate_enabled,ccp.certificate_template_version
      from public.course_completion_policies ccp
     where ccp.course_version_id=p_source_version_id;
    insert into public.course_completion_requirements
      (completion_policy_id,type,target_lesson_id,target_assessment_id,minimum_score,minimum_percent,is_required,position)
    select v_policy_id,ccr.type,
           case when ccr.target_lesson_id is null then null else (v_lessons->>ccr.target_lesson_id::text)::uuid end,
           case when ccr.target_assessment_id is null then null else (v_assessments->>ccr.target_assessment_id::text)::uuid end,
           ccr.minimum_score,ccr.minimum_percent,ccr.is_required,ccr.position
      from public.course_completion_requirements ccr
     where ccr.completion_policy_id=(select ccp.id from public.course_completion_policies ccp where ccp.course_version_id=p_source_version_id);
  end if;

  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'course.version_copied','course_version',v_version_id,
    jsonb_build_object('source_version_id',p_source_version_id,'version_number',v_version_number,
                       'product_links_copied',v_products_copied));
  return query select v_version_id,v_version_number;
end;
$$;


-- The transcript is now stored, but lesson search has not yet been extended to it.
update public.platform_settings
   set preconditions = 'Catalogue search and lesson title/description search exist. Optional author-provided transcripts are stored separately and readable only to entitled learners, authors and assigned reviewers; they are not yet included in search. Extend and test transcript search without exposing text to unentitled users before claiming this is complete.'
 where key = 'platform.search';
