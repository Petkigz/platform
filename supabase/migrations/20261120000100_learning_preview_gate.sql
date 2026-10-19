-- The preview flag must control both free lesson access and anonymous reads.
-- Previously `is_preview` granted access unconditionally, while the resource
-- RLS policy treated `public_preview` as public regardless of the lesson flag.

update public.platform_settings
   set preconditions = 'Select the free lesson and public-sample resources per course version; verify sample content before enabling. The flag gates anonymous reads and the free-entitlement bypass; it never unlocks enrolled-only materials.'
 where key = 'learning.previews';

create or replace function public.can_access_lesson_entitlement_now(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
      from public.learner_profiles lp
      join public.lessons l on l.id=p_lesson_id
      join public.course_sections cs on cs.id=l.section_id
     where lp.deleted_at is null
       and (lp.linked_user_id=public.current_user_id()
            or public.is_learner_family_member(lp.id))
       and public.can_access_course_version(lp.id,cs.course_version_id)
  );
$$;
revoke all on function public.can_access_lesson_entitlement_now(uuid) from public;
grant execute on function public.can_access_lesson_entitlement_now(uuid) to anon,authenticated;
comment on function public.can_access_lesson_entitlement_now(uuid) is
  'Course-version entitlement for the current session, deliberately excluding the free-preview bypass.';

create or replace function public.can_access_lesson(
  p_learner_id uuid,
  p_lesson_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
      from public.lessons l
      join public.course_sections cs on cs.id=l.section_id
     where l.id=p_lesson_id
       and (
         (l.is_preview and public.setting_bool('learning.previews',false))
         or public.can_access_course_version(p_learner_id,cs.course_version_id)
       )
  );
$$;

comment on function public.can_access_lesson(uuid,uuid) is
  'Preview lessons bypass payment only while learning.previews is enabled; otherwise course-version entitlement is required.';
comment on column public.lessons.is_preview is
  'Marks a draft lesson as a public sample candidate. Anonymous reads and the free-entitlement bypass both require learning.previews to be enabled.';
comment on column public.lesson_resources.access_classification is
  'Controls resource entitlement. public_preview is exposed only for an is_preview lesson with learning.previews enabled, or to a learner with course entitlement.';

drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.course_sections cs
       where cs.id=lessons.section_id
         and (public.can_read_version(cs.course_version_id)
              or public.can_review_version(cs.course_version_id))
    )
    and (
      public.current_user_id() is not null
      or (is_preview and public.setting_bool('learning.previews',false))
    )
  );

drop policy if exists lesson_resources_read on public.lesson_resources;
create policy lesson_resources_read on public.lesson_resources
  for select to anon, authenticated
  using (
    exists (
      select 1
        from public.lessons l
        join public.course_sections cs on cs.id=l.section_id
       where l.id=lesson_resources.lesson_id
         and (public.can_read_version(cs.course_version_id)
              or public.can_review_version(cs.course_version_id))
         and (
           public.can_author_version(cs.course_version_id)
           or public.can_review_version(cs.course_version_id)
           or public.can_access_lesson_entitlement_now(l.id)
           or (
             lesson_resources.access_classification='public_preview'
             and l.is_preview
             and public.setting_bool('learning.previews',false)
           )
         )
    )
  );

create or replace function public.set_lesson_preview(p_lesson_id uuid,p_is_preview boolean)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_version uuid;
  v_author uuid;
  v_status text;
  v_old boolean;
  v_downgraded integer:=0;
begin
  if v_actor is null then raise exception 'sign in to change preview settings' using errcode='insufficient_privilege'; end if;
  select l.is_preview,cs.course_version_id,cv.created_by,cv.version_status
    into v_old,v_version,v_author,v_status
    from public.lessons l
    join public.course_sections cs on cs.id=l.section_id
    join public.course_versions cv on cv.id=cs.course_version_id
   where l.id=p_lesson_id
   for update of l,cv;
  if not found then raise exception 'lesson % not found',p_lesson_id using errcode='no_data_found'; end if;
  if v_actor is distinct from v_author and not public.is_privileged(v_actor) then
    raise exception 'only the course author may change preview settings' using errcode='insufficient_privilege';
  end if;
  if v_status<>'draft' then
    raise exception 'preview settings are locked with the course version (D5)' using errcode='check_violation';
  end if;
  if v_old is not distinct from p_is_preview then return false; end if;

  update public.lessons set is_preview=p_is_preview where id=p_lesson_id;
  if not p_is_preview then
    -- A resource cannot remain advertised as a public preview once the lesson
    -- itself is no longer a preview. Reclassify it to the safe default.
    update public.lesson_resources set access_classification='enrolled'
     where lesson_id=p_lesson_id and access_classification='public_preview';
    get diagnostics v_downgraded=row_count;
  end if;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'lesson.preview_changed','lesson',p_lesson_id,
    jsonb_build_object('course_version_id',v_version,'is_preview',p_is_preview,
                       'resources_downgraded',v_downgraded));
  return true;
end;
$$;
revoke all on function public.set_lesson_preview(uuid,boolean) from public;
grant execute on function public.set_lesson_preview(uuid,boolean) to authenticated;

comment on function public.set_lesson_preview(uuid,boolean) is
  'Author-only, draft-only preview toggle. Disabling a lesson also downgrades public_preview resources; actual free access remains behind learning.previews.';
