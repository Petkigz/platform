-- A post that is off the board is off it for its writer too.
--
-- The owner, 2026-11-26: posts are kept with no time limit. A post is
-- "deleted" only by the person who wrote it or by a moderator, and deleting
-- means off the board while the words stay in the record.
--
-- **What was already so, and is not changed.** `withdraw_board_post()` lets
-- only the writer take a post back; `moderate_board_post()` lets only the
-- owner or governance take one down. Both change the post's state and leave
-- the words in the row. Nothing in the database deletes a board post, no
-- signed-in role may, and no page offers it.
-- `supabase/tests/board_words_kept.test.mjs` now pins each of those.
--
-- **What changes.** `board_thread()` went on showing a post that had been
-- taken back or taken down to the account that wrote it, words and all. A
-- person who deletes a post and still sees it has not been given what
-- "delete" says. From here the writer is shown what everybody else is: a
-- thread that is gone is not found, and a reply that is gone keeps its place
-- and says nothing.
--
-- **Who still reads it.** The moderators: the owner and governance, when they
-- open the thread, as before. That is how a post that was taken down is
-- checked afterwards. What a *closed account* wrote is not in the thread any
-- more; that is read through `board_kept_post()`, with a written reason and
-- an audit entry (20261281158000). Which account wrote a post is
-- `board_author()`, with a reason and an audit entry of its own. The privacy
-- notice drafted in 20261281160000 says exactly this.
--
-- **The switches.** Both said a notice has to state for how long posts are
-- kept. The owner has decided: no time limit. A notice that says so is in
-- the register as a draft and has to be published before a board is turned
-- on. The preconditions now say that.

create or replace function public.board_thread(p_thread uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_thread public.board_threads;
  v_handle public.board_handles;
  v_kind   text;
  v_staff  boolean;
  v_mine   boolean;
  v_replies jsonb;
begin
  if v_actor is null then
    raise exception 'board:not_signed_in' using errcode = 'insufficient_privilege';
  end if;
  select * into v_thread from public.board_threads t where t.id = p_thread;
  if v_thread.id is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  v_kind := public.board_enter(v_actor, v_thread.board);
  v_staff := public.can_moderate_boards(v_actor);
  select * into v_handle from public.board_handles h where h.id = v_thread.handle_id;
  v_mine := v_handle.user_id is not distinct from v_actor;

  -- A thread that was taken back or taken down is off the board: for its
  -- writer too. Only the moderators still open it.
  if v_thread.state <> 'visible' and not v_staff then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;

  -- A reply that is gone keeps its place, so the replies after it still make
  -- sense, and says nothing: not its words and not who wrote it. That is so
  -- for its writer too. Only the moderators still read it.
  select coalesce(jsonb_agg(
           case when r.state = 'visible' or v_staff then
             jsonb_build_object(
               'id', r.id, 'state', r.state, 'handle', rh.handle, 'kind', r.author_kind,
               'body', r.body, 'createdAt', r.created_at,
               'mine', rh.user_id is not distinct from v_actor)
           else
             jsonb_build_object('id', r.id, 'state', r.state, 'createdAt', r.created_at, 'mine', false)
           end
           order by r.created_at, r.id), '[]'::jsonb)
    into v_replies
    from public.board_replies r
    join public.board_handles rh on rh.id = r.handle_id
   where r.thread_id = v_thread.id;

  return jsonb_build_object(
    'thread', jsonb_build_object(
      'id', v_thread.id, 'board', v_thread.board, 'state', v_thread.state,
      'title', v_thread.title, 'body', v_thread.body,
      'handle', v_handle.handle, 'kind', v_thread.author_kind,
      'createdAt', v_thread.created_at, 'mine', v_mine),
    'replies', v_replies);
end;
$$;

comment on function public.board_thread(uuid) is
  'One thread and its replies, for somebody let in to its board. A thread that was taken back or taken down is not found, and a reply that was keeps its place and says nothing: for its writer as for everybody else. Only the owner and governance still read it.';

-- ---------------------------------------------------------------------------
-- Both switches say what the owner decided, and what has to be published
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = preconditions || ' From 2026-11-26, later the same day (owner decision): board posts are kept with no time limit; only the writer or a moderator takes a post off the board, and the words stay in the record. A privacy notice that says so is in the policy register as a draft (version 3): read it, have somebody qualified read it, and publish it before turning this on. The owner is also sent an email alert for a report once delivery.notifications is on and email is set up.'
 where key in ('community.student_board', 'community.teacher_board')
   and preconditions not like '%board posts are kept with no time limit%';
