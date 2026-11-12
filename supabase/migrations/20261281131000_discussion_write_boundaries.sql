-- A client must not bypass the moderation RPC by editing moderation fields or
-- hard-deleting posts. Preserve editing one's own pending wording, not metadata.
revoke insert, update, delete on public.discussion_posts from public, anon, authenticated;
grant insert (lesson_id, parent_id, author_user_id, body, visibility_state) on public.discussion_posts to authenticated;
grant update (body) on public.discussion_posts to authenticated;

drop policy discussion_posts_update on public.discussion_posts;
create policy discussion_posts_update on public.discussion_posts
  for update to authenticated
  using (author_user_id = public.current_user_id() and visibility_state = 'pending'
    and deleted_at is null and public.can_read_discussion(lesson_id)
    and public.setting_bool('learning.discussion', false))
  with check (author_user_id = public.current_user_id() and visibility_state = 'pending'
    and deleted_at is null and public.can_read_discussion(lesson_id)
    and public.setting_bool('learning.discussion', false));
drop policy discussion_posts_delete on public.discussion_posts;

-- Existing oversized posts can still be moderated. New or edited wording must
-- respect the limit even when a caller bypasses the web API.
create function public.validate_discussion_body()
returns trigger language plpgsql set search_path=public as $$
begin
  if char_length(new.body)>4000 then
    raise exception 'discussion post is too long' using errcode='check_violation';
  end if;
  return new;
end $$;
revoke all on function public.validate_discussion_body() from public, anon, authenticated;
create trigger discussion_posts_validate_body before insert or update of body
on public.discussion_posts for each row execute function public.validate_discussion_body();

-- Replies only target published roots on the same lesson. Locking the parent
-- serializes this check with moderation of it. The read policy below also
-- hides other people’s replies if the root is later withdrawn.
create function public.validate_discussion_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.discussion_posts;
begin
  if new.parent_id is null then return new; end if;
  select * into p from public.discussion_posts where id = new.parent_id for share;
  if not found or p.lesson_id <> new.lesson_id or p.parent_id is not null
     or p.visibility_state <> 'visible' or p.deleted_at is not null then
    raise exception 'reply target unavailable' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.validate_discussion_reply() from public, anon, authenticated;
create trigger discussion_posts_validate_reply before insert on public.discussion_posts
for each row execute function public.validate_discussion_reply();


-- Avoid leaking a published reply when its root has subsequently been hidden.
-- SECURITY DEFINER avoids recursive RLS and refuses callers without lesson reach.
create function public.discussion_parent_is_public(p_lesson uuid, p_parent uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.can_read_discussion(p_lesson), false) and exists (
    select 1 from public.discussion_posts p where p.id=p_parent
      and p.lesson_id=p_lesson and p.parent_id is null
      and p.visibility_state='visible' and p.deleted_at is null
  );
$$;
revoke all on function public.discussion_parent_is_public(uuid,uuid) from public;
grant execute on function public.discussion_parent_is_public(uuid,uuid) to anon, authenticated;

drop policy discussion_posts_read on public.discussion_posts;
create policy discussion_posts_read on public.discussion_posts
  for select to anon, authenticated
  using (deleted_at is null and public.can_read_discussion(lesson_id) and (
    author_user_id = public.current_user_id() or public.is_privileged(public.current_user_id())
    or (visibility_state = 'visible' and (parent_id is null
      or public.discussion_parent_is_public(lesson_id,parent_id)))
  ));

-- The definer report writer must mirror the same visibility boundary.
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
       and (author_user_id = v_actor or public.is_privileged(v_actor)
            or (visibility_state = 'visible' and (parent_id is null
              or public.discussion_parent_is_public(p_lesson_id,parent_id))));
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

-- A moderator must decide the wording and state actually displayed, not a later
-- edit or another moderator's decision. The predicate is evaluated under the
-- row update lock, so a concurrent edit cannot slip between check and decision.
revoke execute on function public.moderate_discussion_post(uuid,text,text) from public, anon, authenticated;
create function public.moderate_discussion_post(
  p_post_id uuid, p_state text, p_note text, p_reviewed_body text, p_reviewed_state text
) returns public.discussion_posts language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := public.current_user_id();
  v_result public.discussion_posts;
begin
  if not public.is_privileged(v_actor) then
    raise exception 'only staff may moderate discussion' using errcode='insufficient_privilege';
  end if;
  if p_state is null or p_state not in ('visible','hidden','removed')
     or p_reviewed_state is null or p_reviewed_state not in ('pending','visible','hidden','removed')
     or p_reviewed_body is null then
    raise exception 'invalid moderation decision' using errcode='check_violation';
  end if;
  if p_state in ('hidden','removed') and length(trim(coalesce(p_note,'')))=0 then
    raise exception 'withdrawing a post requires a written reason' using errcode='check_violation';
  end if;
  if length(coalesce(p_note,''))>4000 then
    raise exception 'moderation note is too long' using errcode='check_violation';
  end if;
  update public.discussion_posts
     set visibility_state=p_state, moderated_by=v_actor, moderated_at=now(),
         moderation_note=p_note,
         hidden_reason=case when p_state in ('hidden','removed') then p_note else null end
   where id=p_post_id and deleted_at is null
     and body=p_reviewed_body and visibility_state=p_reviewed_state
  returning * into v_result;
  if not found then
    raise exception 'post changed or is unavailable; refresh and review again' using errcode='check_violation';
  end if;
  insert into public.governance_audit_events (actor,action,target_type,target_id,detail)
    values (v_actor,'discussion.moderated','discussion_post',p_post_id,
      jsonb_build_object('state',p_state,'note',p_note));
  return v_result;
end $$;
revoke all on function public.moderate_discussion_post(uuid,text,text,text,text) from public,anon;
grant execute on function public.moderate_discussion_post(uuid,text,text,text,text) to authenticated;
