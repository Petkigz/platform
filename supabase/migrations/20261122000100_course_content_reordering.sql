-- Let course authors reorder their draft outline without writing positions
-- directly. The existing position constraints are deferred so a swap can be
-- completed atomically without exposing duplicate positions.

create or replace function public.move_course_content(
  p_content_type text,
  p_content_id uuid,
  p_direction text
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_version_id uuid;
  v_parent_id uuid;
  v_status text;
  v_position integer;
  v_neighbor_id uuid;
  v_neighbor_position integer;
  v_new_position integer;
begin
  if v_actor is null then
    raise exception 'sign in to reorder course content' using errcode='insufficient_privilege';
  end if;
  if p_content_type is null or p_content_type not in ('section','lesson','resource') then
    raise exception 'unsupported content type: %',p_content_type using errcode='invalid_parameter_value';
  end if;
  if p_direction is null or p_direction not in ('up','down') then
    raise exception 'choose up or down to reorder content' using errcode='invalid_parameter_value';
  end if;

  -- Find the owning version, then lock that version so concurrent moves in
  -- this outline serialize. The row is re-read and locked below before writes.
  if p_content_type='section' then
    select s.course_version_id into v_version_id
      from public.course_sections s where s.id=p_content_id;
  elsif p_content_type='lesson' then
    select cs.course_version_id,l.section_id into v_version_id,v_parent_id
      from public.lessons l
      join public.course_sections cs on cs.id=l.section_id
     where l.id=p_content_id;
  else
    select cs.course_version_id,lr.lesson_id into v_version_id,v_parent_id
      from public.lesson_resources lr
      join public.lessons l on l.id=lr.lesson_id
      join public.course_sections cs on cs.id=l.section_id
     where lr.id=p_content_id;
  end if;
  if v_version_id is null then
    raise exception '% % not found',p_content_type,p_content_id using errcode='no_data_found';
  end if;

  select cv.version_status into v_status
    from public.course_versions cv where cv.id=v_version_id for update;
  if not found then
    raise exception 'course version not found' using errcode='no_data_found';
  end if;
  if v_status<>'draft' then
    raise exception 'only draft course content can be reordered' using errcode='check_violation';
  end if;
  if not public.can_author_version(v_version_id) then
    raise exception 'only the course author may reorder this content' using errcode='insufficient_privilege';
  end if;

  if p_content_type='section' then
    select s.position into v_position from public.course_sections s
     where s.id=p_content_id and s.course_version_id=v_version_id for update;
    if p_direction='up' then
      select s.id,s.position into v_neighbor_id,v_neighbor_position
        from public.course_sections s
       where s.course_version_id=v_version_id and s.position<v_position
       order by s.position desc limit 1 for update;
    else
      select s.id,s.position into v_neighbor_id,v_neighbor_position
        from public.course_sections s
       where s.course_version_id=v_version_id and s.position>v_position
       order by s.position asc limit 1 for update;
    end if;
  elsif p_content_type='lesson' then
    select l.section_id,l.position into v_parent_id,v_position
      from public.lessons l where l.id=p_content_id for update;
    if p_direction='up' then
      select l.id,l.position into v_neighbor_id,v_neighbor_position
        from public.lessons l
       where l.section_id=v_parent_id and l.position<v_position
       order by l.position desc limit 1 for update;
    else
      select l.id,l.position into v_neighbor_id,v_neighbor_position
        from public.lessons l
       where l.section_id=v_parent_id and l.position>v_position
       order by l.position asc limit 1 for update;
    end if;
  else
    select lr.position into v_position from public.lesson_resources lr
     where lr.id=p_content_id for update;
    if p_direction='up' then
      select lr.id,lr.position into v_neighbor_id,v_neighbor_position
        from public.lesson_resources lr
       where lr.lesson_id=v_parent_id and lr.position<v_position
       order by lr.position desc limit 1 for update;
    else
      select lr.id,lr.position into v_neighbor_id,v_neighbor_position
        from public.lesson_resources lr
       where lr.lesson_id=v_parent_id and lr.position>v_position
       order by lr.position asc limit 1 for update;
    end if;
  end if;

  if v_position is null then
    raise exception '% % not found',p_content_type,p_content_id using errcode='no_data_found';
  end if;
  if v_neighbor_id is null then
    raise exception 'content is already at the % of its list',
      case when p_direction='up' then 'start' else 'end' end
      using errcode='check_violation';
  end if;

  -- The UNIQUE(position) constraints are DEFERRABLE INITIALLY DEFERRED, so
  -- the intermediate duplicate is never observable outside this transaction.
  if p_content_type='section' then
    update public.course_sections set position=v_neighbor_position where id=p_content_id;
    update public.course_sections set position=v_position where id=v_neighbor_id;
  elsif p_content_type='lesson' then
    update public.lessons set position=v_neighbor_position where id=p_content_id;
    update public.lessons set position=v_position where id=v_neighbor_id;
  else
    update public.lesson_resources set position=v_neighbor_position where id=p_content_id;
    update public.lesson_resources set position=v_position where id=v_neighbor_id;
  end if;
  v_new_position:=v_neighbor_position;

  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'course.content_reordered',p_content_type,p_content_id,
    jsonb_build_object('direction',p_direction,'from_position',v_position,
                       'to_position',v_new_position,'swapped_with',v_neighbor_id,
                       'course_version_id',v_version_id));
  return v_new_position;
end;
$$;

revoke all on function public.move_course_content(text,uuid,text) from public;
grant execute on function public.move_course_content(text,uuid,text) to authenticated;
comment on function public.move_course_content(text,uuid,text) is
  'Atomically swaps a draft section, lesson or lesson resource with its nearest neighbour. Course author only; audited; published versions remain immutable.';
