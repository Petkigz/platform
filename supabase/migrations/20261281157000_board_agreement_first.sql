-- Nobody writes on a discussion board before agreeing to the terms and the
-- privacy notice.
--
-- The owner, 2026-11-26, about the people who write on the boards:
--
--   "all we have to do is create a box where they agree to data collection
--    and privacy. Also they have to agree to terms and conditions."
--
-- The platform already keeps the two documents, versioned, and a record of
-- who agreed to which version and when (20261281001400). What it did not do
-- is ask: an account could sign up, choose a username and write without ever
-- having agreed to either. From this migration the boards ask first.
--
-- What changes, and nothing else:
--   * `board_agreements_owed(account)` is new and internal: the documents
--     `terms` and `privacy` whose version in force this account has not
--     agreed to, each with its title and version number.
--   * `my_board()` is its earlier definition plus `agreements`, that list, so
--     the page can draw the box and name the version it is asking about.
--   * `set_board_handle()` and `board_writer()` are their earlier definitions
--     plus one refusal, `board:agree_first`, while that list is not empty.
--     `board_writer()` is what a new thread and a reply both pass through, so
--     choosing a username, starting a thread and replying are all refused.
--
-- Agreement is to the version in force. When the owner publishes a new
-- version of either document, an account that agreed to the old one is asked
-- again before the next thing it writes.
--
-- What does not change:
--   * Reading. A member who has agreed to nothing can still open a board and
--     read it: nothing about them is recorded by reading.
--   * Reporting a post and taking one's own post back. Neither is made
--     harder by a document.
--   * Moderating. The owner and governance take a post down, block a
--     username and open the report queue as before, agreed or not. To write
--     a reply as staff they agree like anybody else.
--   * How an agreement is recorded: by `accept_policy(slug, version)`, once
--     for each person and version, with an audit event. Nothing here writes
--     an agreement; the box calls that function.
--   * No table or column is added, no row is changed, no switch is turned.
--     Both boards stay off.
--
-- What this does not do, said plainly: the privacy notice in force was
-- written before the boards existed and does not mention them. An agreement
-- to it is an agreement to what it says. A version that describes the boards
-- is the owner's to publish, and the switches' preconditions now say so.

-- ---------------------------------------------------------------------------
-- What an account has still to agree to
-- ---------------------------------------------------------------------------
create or replace function public.board_agreements_owed(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
                    'slug', d.slug,
                    'title', d.title,
                    'versionNumber', v.version_number)
                  order by d.sort_order, d.slug), '[]'::jsonb)
    from public.policy_documents d
    join public.policy_versions v
      on v.document_id = d.id and v.status = 'in_force'
   where d.slug in ('terms', 'privacy')
     and not exists (
       select 1 from public.policy_acceptances a
        where a.policy_version_id = v.id and a.user_id = p_user);
$$;

revoke all on function public.board_agreements_owed(uuid) from public, anon, authenticated;

comment on function public.board_agreements_owed(uuid) is
  'The terms and the privacy notice, where the version in force is one this account has not agreed to. Internal: read by my_board(), set_board_handle() and board_writer().';

-- ---------------------------------------------------------------------------
-- The page is told what to ask for
-- ---------------------------------------------------------------------------
-- Reproduced in full: PostgreSQL cannot wrap the function it replaces.
create or replace function public.my_board(p_board text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_kind   text;
  v_until  timestamptz;
  v_handle public.board_handles;
  v_wrote  boolean := false;
begin
  if v_actor is null then
    raise exception 'board:not_signed_in' using errcode = 'insufficient_privilege';
  end if;
  if p_board is null or p_board not in ('students', 'teachers') then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;

  select s.kind, s.until into v_kind, v_until from public.board_standing(v_actor, p_board) s;
  select * into v_handle from public.board_handles h where h.board = p_board and h.user_id = v_actor;
  if v_handle.id is not null then
    v_wrote := exists (select 1 from public.board_threads t where t.handle_id = v_handle.id)
            or exists (select 1 from public.board_replies r where r.handle_id = v_handle.id);
  end if;

  return jsonb_build_object(
    'board',     p_board,
    'open',      public.board_switch(p_board),
    'kind',      v_kind,
    'until',     v_until,
    -- A username is shown to its owner even after access has ended.
    'handle',    v_handle.handle,
    -- Once something has been written under it, it stays.
    'handleFixed', v_wrote,
    'blocked',   v_handle.blocked_at is not null,
    'moderator', public.can_moderate_boards(v_actor),
    -- What this account has still to agree to before it may write. Empty
    -- when there is nothing: then the page draws no box.
    'agreements', public.board_agreements_owed(v_actor));
end;
$$;

revoke all on function public.my_board(text) from public, anon;
grant execute on function public.my_board(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Choosing a username, and writing, wait for the agreement
-- ---------------------------------------------------------------------------
-- Both reproduced in full, each with the one refusal added.
create or replace function public.set_board_handle(p_board text, p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_kind   text := public.board_enter(v_actor, p_board);
  v_name   text := coalesce(p_handle, '');
  v_low    text;
  v_mine   public.board_handles;
begin
  -- A username is where writing starts, so the agreement is asked for here.
  if jsonb_array_length(public.board_agreements_owed(v_actor)) > 0 then
    raise exception 'board:agree_first' using errcode = 'insufficient_privilege';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 24
     or v_name ~ '[\s\u00A0\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u3000]'
     or v_name ~ '[]\[!"#$%&''()*+,./:;<=>?@\\^`{|}~-]' then
    raise exception 'board:handle_shape' using errcode = 'check_violation';
  end if;

  -- Names that would read as the site speaking. Staff may not take them
  -- either: the badge beside a post says who is staff, not the name.
  v_low := lower(v_name);
  if v_low ~ '(admin|moderator|staff|support|official|ayahspring|system)' then
    raise exception 'board:handle_reserved' using errcode = 'check_violation';
  end if;

  select * into v_mine from public.board_handles h
   where h.board = p_board and h.user_id = v_actor
   for update;

  if v_mine.id is not null then
    if v_mine.handle = v_name then
      return jsonb_build_object('handle', v_mine.handle);
    end if;
    if exists (select 1 from public.board_threads t where t.handle_id = v_mine.id)
       or exists (select 1 from public.board_replies r where r.handle_id = v_mine.id) then
      raise exception 'board:handle_fixed' using errcode = 'check_violation';
    end if;
  end if;

  if exists (
    select 1 from public.board_handles h
     where h.board = p_board and lower(h.handle) = v_low
       and h.id is distinct from v_mine.id
  ) then
    raise exception 'board:handle_taken' using errcode = 'unique_violation';
  end if;

  begin
    if v_mine.id is null then
      insert into public.board_handles (board, user_id, handle) values (p_board, v_actor, v_name);
    else
      update public.board_handles set handle = v_name where id = v_mine.id;
    end if;
  exception when unique_violation then
    -- Two people asked for one name at the same instant.
    raise exception 'board:handle_taken' using errcode = 'unique_violation';
  end;

  return jsonb_build_object('handle', v_name);
end;
$$;

revoke all on function public.set_board_handle(text, text) from public, anon;
grant execute on function public.set_board_handle(text, text) to authenticated;

create or replace function public.board_writer(p_actor uuid, p_board text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_handle public.board_handles;
begin
  -- Asked again at every post, so that a document published since this
  -- account agreed is agreed to before the next thing it writes.
  if jsonb_array_length(public.board_agreements_owed(p_actor)) > 0 then
    raise exception 'board:agree_first' using errcode = 'insufficient_privilege';
  end if;

  select * into v_handle from public.board_handles h where h.board = p_board and h.user_id = p_actor;
  if v_handle.id is null then
    raise exception 'board:no_handle' using errcode = 'check_violation';
  end if;
  if v_handle.blocked_at is not null then
    raise exception 'board:blocked' using errcode = 'insufficient_privilege';
  end if;
  return v_handle.id;
end;
$$;

revoke all on function public.board_writer(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What the two switches say before they are turned on
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = preconditions || ' From 2026-11-26 (owner decision): nobody chooses a username or writes until their account has agreed to the Terms of use and the Privacy notice in force. The notice in force does not mention the boards; publish a version that does before switching on.'
 where key in ('community.student_board', 'community.teacher_board')
   and preconditions not like '%has agreed to the Terms of use and the Privacy notice%';
