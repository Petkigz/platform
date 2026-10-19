-- Writer for religious-content provenance, preserving D5's whole-subtree lock.
-- Sources are appended with a lesson link in one transaction; corrections are
-- made in a new draft course version rather than rewriting published content.

create or replace function public.guard_content_source_draft()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_version uuid;
begin
  if tg_table_name='content_sources' then
    v_version:=case when tg_op='DELETE' then old.course_version_id else new.course_version_id end;
    if tg_op='INSERT' and public.current_user_id() is not null
       and new.created_by is distinct from public.current_user_id() then
      raise exception 'a source must record the signed-in author who added it'
        using errcode='insufficient_privilege';
    end if;
  else
    select course_version_id into v_version
      from public.content_sources
     where id=case when tg_op='DELETE' then old.content_source_id else new.content_source_id end;
  end if;
  if not exists(select 1 from public.course_versions where id=v_version and version_status='draft') then
    raise exception 'content provenance is locked with its course version; create a draft version'
      using errcode='check_violation';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists content_sources_draft_guard on public.content_sources;
create trigger content_sources_draft_guard
  before insert or update or delete on public.content_sources
  for each row execute function public.guard_content_source_draft();

drop trigger if exists content_source_links_draft_guard on public.content_source_links;
create trigger content_source_links_draft_guard
  before insert or update or delete on public.content_source_links
  for each row execute function public.guard_content_source_draft();

create or replace function public.add_content_source_for_lesson(
  p_course_version_id uuid,
  p_lesson_id uuid,
  p_source_type text,
  p_title text,
  p_author_or_compiler text default null,
  p_edition_or_version text default null,
  p_reference_locator text default null,
  p_url text default null,
  p_anchor text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_source uuid;
begin
  if v_actor is null then raise exception 'sign in to add a source' using errcode='insufficient_privilege'; end if;
  if not public.can_author_version(p_course_version_id) then
    raise exception 'only the course author may add sources' using errcode='insufficient_privilege';
  end if;
  if not exists(select 1 from public.course_versions where id=p_course_version_id and version_status='draft') then
    raise exception 'content provenance is locked with its course version; create a draft version'
      using errcode='check_violation';
  end if;
  if not exists(
    select 1 from public.lessons l
      join public.course_sections s on s.id=l.section_id
     where l.id=p_lesson_id and s.course_version_id=p_course_version_id
  ) then
    raise exception 'the lesson must belong to this course version' using errcode='check_violation';
  end if;
  if coalesce(btrim(p_title),'')='' then
    raise exception 'a source needs a title' using errcode='invalid_parameter_value';
  end if;
  insert into public.content_sources(
    course_version_id,source_type,title,author_or_compiler,edition_or_version,
    reference_locator,url,notes,created_by
  ) values (
    p_course_version_id,p_source_type,btrim(p_title),nullif(btrim(coalesce(p_author_or_compiler,'')),''),
    nullif(btrim(coalesce(p_edition_or_version,'')),''),nullif(btrim(coalesce(p_reference_locator,'')),''),
    nullif(btrim(coalesce(p_url,'')),''),nullif(btrim(coalesce(p_notes,'')),''),v_actor
  ) returning id into v_source;
  insert into public.content_source_links(content_source_id,lesson_id,anchor)
  values(v_source,p_lesson_id,nullif(btrim(coalesce(p_anchor,'')),''));
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'content_source.added','content_source',v_source,
    jsonb_build_object('course_version_id',p_course_version_id,'lesson_id',p_lesson_id,'source_type',p_source_type));
  return v_source;
end;
$$;
revoke all on function public.add_content_source_for_lesson(uuid,uuid,text,text,text,text,text,text,text,text) from public;
grant execute on function public.add_content_source_for_lesson(uuid,uuid,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.remove_content_source(p_source_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_source public.content_sources;
begin
  if v_actor is null then raise exception 'sign in to remove a source' using errcode='insufficient_privilege'; end if;
  select * into v_source from public.content_sources where id=p_source_id for update;
  if not found then return false; end if;
  if not public.can_author_version(v_source.course_version_id) then
    raise exception 'only the course author may remove sources' using errcode='insufficient_privilege';
  end if;
  if not exists(select 1 from public.course_versions where id=v_source.course_version_id and version_status='draft') then
    raise exception 'content provenance is locked with its course version; create a draft version'
      using errcode='check_violation';
  end if;
  -- Delete links first so their D5 guard can still resolve the parent version.
  delete from public.content_source_links where content_source_id=p_source_id;
  delete from public.content_sources where id=p_source_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'content_source.removed','content_source',p_source_id,
    jsonb_build_object('course_version_id',v_source.course_version_id,'title',v_source.title));
  return true;
end;
$$;
revoke all on function public.remove_content_source(uuid) from public;
grant execute on function public.remove_content_source(uuid) to authenticated;
