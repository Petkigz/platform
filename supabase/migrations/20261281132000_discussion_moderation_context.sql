-- Legacy clients may supply author_kind, but the existing insert trigger
-- overwrites it from the session. No moderation or timestamp fields are granted.
grant insert (author_kind) on public.discussion_posts to authenticated;

-- Approval must also match the parent question shown to the moderator. Lock the
-- parent first, then the reply, matching the reply-insertion lock order. A hidden
-- or removed question cannot acquire a newly published reply.
revoke execute on function public.moderate_discussion_post(uuid,text,text,text,text) from public,anon,authenticated;
create function public.moderate_discussion_post(
  p_post_id uuid, p_state text, p_note text, p_reviewed_body text, p_reviewed_state text,
  p_parent_id uuid, p_parent_body text, p_parent_state text
) returns public.discussion_posts language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := public.current_user_id();
  v_result public.discussion_posts;
  v_parent_id uuid;
  v_lesson_id uuid;
  v_parent public.discussion_posts;
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
  select parent_id,lesson_id into v_parent_id,v_lesson_id
    from public.discussion_posts where id=p_post_id and deleted_at is null;
  if not found or v_parent_id is distinct from p_parent_id then
    raise exception 'post changed or is unavailable; refresh and review again' using errcode='check_violation';
  end if;
  if v_parent_id is null then
    if p_parent_body is not null or p_parent_state is not null then
      raise exception 'post context changed; refresh and review again' using errcode='check_violation';
    end if;
  else
    select * into v_parent from public.discussion_posts where id=v_parent_id for share;
    if not found or v_parent.lesson_id <> v_lesson_id or v_parent.parent_id is not null
       or v_parent.deleted_at is not null or p_parent_body is null or p_parent_state is null
       or v_parent.body is distinct from p_parent_body or v_parent.visibility_state is distinct from p_parent_state then
      raise exception 'question changed or is unavailable; refresh and review again' using errcode='check_violation';
    end if;
    if p_state='visible' and v_parent.visibility_state <> 'visible' then
      raise exception 'the question is not visible; the reply cannot be published' using errcode='check_violation';
    end if;
  end if;
  update public.discussion_posts
     set visibility_state=p_state, moderated_by=v_actor, moderated_at=now(),
         moderation_note=p_note,
         hidden_reason=case when p_state in ('hidden','removed') then p_note else null end
   where id=p_post_id and deleted_at is null and lesson_id=v_lesson_id
     and parent_id is not distinct from v_parent_id
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
revoke all on function public.moderate_discussion_post(uuid,text,text,text,text,uuid,text,text) from public,anon;
grant execute on function public.moderate_discussion_post(uuid,text,text,text,text,uuid,text,text) to authenticated;
