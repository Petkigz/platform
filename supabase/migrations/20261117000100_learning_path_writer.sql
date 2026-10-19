-- Create and publish curated multi-course learning paths.
--
-- A path is an ordered catalogue of courses, not a bundle or a subscription.
-- Each item points at the stable course identity; the learner follows the
-- course's currently published version. This does not create enrolments or
-- entitlements, and the existing `learning.paths` runtime flag stays off until
-- content has been authored and the storefront is intentionally enabled.

create or replace function public.create_learning_path(
  p_title text,
  p_slug text,
  p_audience text default 'both',
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_id uuid;
begin
  if v_actor is null then raise exception 'sign in to create a learning path' using errcode='insufficient_privilege'; end if;
  if coalesce(btrim(p_title),'')='' or length(btrim(p_title))>200 then
    raise exception 'a learning path needs a title under 200 characters' using errcode='invalid_parameter_value';
  end if;
  if coalesce(btrim(p_slug),'') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'use a lowercase hyphenated slug' using errcode='invalid_parameter_value';
  end if;
  if p_audience not in ('child','adult','both') then
    raise exception 'audience must be child, adult or both' using errcode='invalid_parameter_value';
  end if;
  insert into public.learning_paths(title,slug,audience,description,created_by,status)
  values(btrim(p_title),btrim(p_slug),p_audience,nullif(btrim(coalesce(p_description,'')),''),v_actor,'draft')
  returning id into v_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'learning_path.created','learning_path',v_id,jsonb_build_object('slug',btrim(p_slug),'audience',p_audience));
  return v_id;
end;
$$;
revoke all on function public.create_learning_path(text,text,text,text) from public;
grant execute on function public.create_learning_path(text,text,text,text) to authenticated;

create or replace function public.add_learning_path_item(
  p_learning_path_id uuid,
  p_course_id uuid,
  p_required boolean default true
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_path public.learning_paths;
  v_position integer;
  v_id uuid;
begin
  if v_actor is null then raise exception 'sign in to edit a learning path' using errcode='insufficient_privilege'; end if;
  select * into v_path from public.learning_paths where id=p_learning_path_id and deleted_at is null for update;
  if not found then raise exception 'learning path % not found',p_learning_path_id using errcode='no_data_found'; end if;
  if v_path.created_by is distinct from v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the path author may add a course' using errcode='insufficient_privilege';
  end if;
  if v_path.status<>'draft' then
    raise exception 'courses can only be changed on a draft path' using errcode='check_violation';
  end if;
  if not exists(select 1 from public.courses c join public.course_versions cv on cv.course_id=c.id
    where c.id=p_course_id and c.status='active' and c.deleted_at is null and c.suspended_at is null
      and cv.version_status='published') then
    raise exception 'add only an active, published course' using errcode='invalid_parameter_value';
  end if;
  select coalesce(max(position),0)+1 into v_position from public.learning_path_items where learning_path_id=p_learning_path_id;
  insert into public.learning_path_items(learning_path_id,course_id,position,required)
  values(p_learning_path_id,p_course_id,v_position,coalesce(p_required,true)) returning id into v_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'learning_path.course_added','learning_path',p_learning_path_id,
    jsonb_build_object('course_id',p_course_id,'position',v_position,'required',coalesce(p_required,true)));
  return v_id;
end;
$$;
revoke all on function public.add_learning_path_item(uuid,uuid,boolean) from public;
grant execute on function public.add_learning_path_item(uuid,uuid,boolean) to authenticated;

create or replace function public.remove_learning_path_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_path_id uuid;
  v_path public.learning_paths;
  v_course uuid;
begin
  if v_actor is null then raise exception 'sign in to edit a learning path' using errcode='insufficient_privilege'; end if;
  select learning_path_id,course_id into v_path_id,v_course from public.learning_path_items where id=p_item_id;
  if not found then return false; end if;
  select * into v_path from public.learning_paths where id=v_path_id for update;
  if v_path.created_by is distinct from v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the path author may remove a course' using errcode='insufficient_privilege';
  end if;
  if v_path.status<>'draft' then raise exception 'courses can only be changed on a draft path' using errcode='check_violation'; end if;
  delete from public.learning_path_items where id=p_item_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'learning_path.course_removed','learning_path',v_path_id,jsonb_build_object('course_id',v_course));
  return true;
end;
$$;
revoke all on function public.remove_learning_path_item(uuid) from public;
grant execute on function public.remove_learning_path_item(uuid) to authenticated;

create or replace function public.guard_learning_path_state()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.learning_path_writer',true)<>'on' then
    if tg_op='INSERT' then
      if new.status<>'draft' then
        raise exception 'a learning path must be created as a draft' using errcode='insufficient_privilege';
      end if;
      return new;
    end if;
    if old.status is distinct from new.status then
      raise exception 'learning path status changes must use the path workflow' using errcode='insufficient_privilege';
    end if;
    if old.status='active' and row(new.title,new.slug,new.audience,new.description,new.institution_id)
      is distinct from row(old.title,old.slug,old.audience,old.description,old.institution_id) then
      raise exception 'an active learning path cannot be edited; create a new draft path' using errcode='check_violation';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists learning_paths_state_guard on public.learning_paths;
create trigger learning_paths_state_guard before insert or update on public.learning_paths
  for each row execute function public.guard_learning_path_state();

create or replace function public.guard_learning_path_item_edit()
returns trigger
language plpgsql
as $$
declare
  v_path_id uuid;
  v_status text;
begin
  if current_setting('app.learning_path_writer',true)='on' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  v_path_id:=case when tg_op='DELETE' then old.learning_path_id else new.learning_path_id end;
  select status into v_status from public.learning_paths where id=v_path_id;
  if v_status is distinct from 'draft' then
    raise exception 'course items can only be changed on a draft learning path'
      using errcode='check_violation';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

create trigger learning_path_items_draft_guard
  before insert or update or delete on public.learning_path_items
  for each row execute function public.guard_learning_path_item_edit();

create or replace function public.activate_learning_path(p_learning_path_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_path public.learning_paths;
  v_items integer;
  v_invalid integer;
begin
  if v_actor is null then raise exception 'sign in to publish a learning path' using errcode='insufficient_privilege'; end if;
  select * into v_path from public.learning_paths where id=p_learning_path_id and deleted_at is null for update;
  if not found then raise exception 'learning path % not found',p_learning_path_id using errcode='no_data_found'; end if;
  if v_path.created_by is distinct from v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the path author may publish it' using errcode='insufficient_privilege';
  end if;
  if v_path.status='active' then return false; end if;
  if v_path.status='retired' then raise exception 'a retired learning path cannot be reactivated' using errcode='check_violation'; end if;
  select count(*) into v_items from public.learning_path_items where learning_path_id=p_learning_path_id;
  if v_items=0 then raise exception 'a learning path needs at least one course' using errcode='check_violation'; end if;
  select count(*) into v_invalid from public.learning_path_items lpi
   where lpi.learning_path_id=p_learning_path_id and not exists(
     select 1 from public.courses c join public.course_versions cv on cv.course_id=c.id
      where c.id=lpi.course_id and c.status='active' and c.deleted_at is null and c.suspended_at is null
        and cv.version_status='published');
  if v_invalid>0 then raise exception '% course(s) in this path are no longer active and published',v_invalid using errcode='check_violation'; end if;
  perform set_config('app.learning_path_writer','on',true);
  update public.learning_paths set status='active' where id=p_learning_path_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'learning_path.activated','learning_path',p_learning_path_id,jsonb_build_object('courses',v_items));
  return true;
end;
$$;
revoke all on function public.activate_learning_path(uuid) from public;
grant execute on function public.activate_learning_path(uuid) to authenticated;

create or replace function public.retire_learning_path(p_learning_path_id uuid,p_reason text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_path public.learning_paths;
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if v_actor is null then raise exception 'sign in to retire a learning path' using errcode='insufficient_privilege'; end if;
  if v_reason is null then raise exception 'a written retirement reason is required' using errcode='invalid_parameter_value'; end if;
  select * into v_path from public.learning_paths where id=p_learning_path_id and deleted_at is null for update;
  if not found then raise exception 'learning path % not found',p_learning_path_id using errcode='no_data_found'; end if;
  if v_path.created_by is distinct from v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the path author may retire it' using errcode='insufficient_privilege';
  end if;
  if v_path.status='retired' then return false; end if;
  perform set_config('app.learning_path_writer','on',true);
  update public.learning_paths set status='retired',deleted_at=now() where id=p_learning_path_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'learning_path.retired','learning_path',p_learning_path_id,jsonb_build_object('reason',v_reason));
  return true;
end;
$$;
revoke all on function public.retire_learning_path(uuid,text) from public;
grant execute on function public.retire_learning_path(uuid,text) to authenticated;

comment on function public.create_learning_path(text,text,text,text) is
  'Creates a draft ordered course path for the caller; path access remains governed by learning.paths.';
comment on function public.add_learning_path_item(uuid,uuid,boolean) is
  'Appends an active, published course to a draft path; no course version is pinned here.';
comment on function public.activate_learning_path(uuid) is
  'Activates a non-empty path only while every item remains an active, published course.';
comment on function public.retire_learning_path(uuid,text) is
  'Soft-retires a path with a written reason; it cannot be reactivated.';
