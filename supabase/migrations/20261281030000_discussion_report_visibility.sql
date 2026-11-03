-- A report must not reveal or target a post the caller cannot read. Direct
-- table inserts bypass report_content's checks, so reporting goes through it.
revoke insert on public.content_reports from anon, authenticated;

create or replace function public.report_content(
  p_lesson_id          uuid,
  p_category           text,
  p_description        text,
  p_discussion_post_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_lesson  public.lessons;
  v_version uuid;
  v_post    public.discussion_posts;
  v_id      uuid;
begin
  select * into v_lesson from public.lessons where id = p_lesson_id;
  if v_lesson.id is null then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  select course_version_id into v_version
    from public.course_sections
   where id = v_lesson.section_id;

  -- The reporter has to be able to see what they are reporting. Without this a
  -- caller could probe unpublished course versions by reporting them and
  -- reading back which ones existed.
  if not public.can_read_version(v_version) then
    raise exception
      'you cannot report content you cannot see'
      using errcode = 'insufficient_privilege';
  end if;

  if p_discussion_post_id is not null then
    -- A SECURITY DEFINER cannot rely on discussion_posts RLS. Reproduce its
    -- read conditions explicitly before acknowledging a post exists.
    if not public.can_read_discussion(p_lesson_id) then
      raise exception 'you cannot report a discussion you cannot see'
        using errcode = 'insufficient_privilege';
    end if;
    select * into v_post from public.discussion_posts
     where id = p_discussion_post_id and lesson_id = p_lesson_id
       and deleted_at is null
       and (visibility_state = 'visible' or author_user_id = v_actor
            or public.is_privileged(v_actor));
    if not found then
      raise exception 'discussion post unavailable'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if coalesce(trim(p_description), '') = '' then
    raise exception
      'say what the problem is'
      using errcode = 'check_violation';
  end if;

  -- reported_by is nullable on purpose: the reporting function admits anon, so
  -- someone who will not sign in can still flag a doctrinal error. An
  -- unattributed report is visible to staff only.
  insert into public.content_reports
    (course_version_id, lesson_id, discussion_post_id, reported_by,
     report_category, description)
  values
    (v_version, p_lesson_id, p_discussion_post_id, v_actor, p_category, p_description)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'content.reported',
    'content_report',
    v_id,
    jsonb_build_object(
      'category',        p_category,
      'lesson_id',       p_lesson_id,
      'discussion_post', p_discussion_post_id
    )
  );

  return v_id;
end;
$$;

revoke execute on function public.report_content(uuid, text, text, uuid) from public;
grant execute on function public.report_content(uuid, text, text, uuid) to anon, authenticated;
