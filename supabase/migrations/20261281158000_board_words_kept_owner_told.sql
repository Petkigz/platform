-- What is written on a board is kept when the account closes, and the owner is
-- told when a post is reported.
--
-- The owner, 2026-11-26, on the boards: "keep records", and "send
-- notifications about things that require the administrator".
--
-- 1. **Kept.** Until now, closing an account overwrote what it had written on
--    a board with `[erased]`. A post taken back by its writer, or taken down
--    by staff, has always kept its words in its row; only closing destroyed
--    them, and so somebody could write something to hurt another person and
--    then close the account to be rid of it. Now the words are copied to
--    `board_kept_words` first. Everything else is as it was: the post comes
--    off the board, the row a reader can reach says `[erased]`, the username
--    is replaced by one that says nothing and is cut from the account, so
--    `board_author()` still answers that the account is gone. What is kept
--    is the words and when they were written, not whose they were.
--
--    Nobody reads the table: it has no grant and no policy. The one way in
--    is `board_kept_post()`, for the owner or governance, with a written
--    reason of at least ten characters, and an audit entry is written before
--    it answers, as for `board_author()`.
--
--    **What this does not do.** It does not make the keeping a secret, and
--    nothing here should be read as doing so. Somebody who agrees to a
--    privacy notice agrees to what the notice says; a notice that does not
--    say posts are kept after an account closes has not been agreed to on
--    that point. Both board switches now say, in their preconditions, that
--    the notice has to say it before a board is turned on. There is also no
--    period after which a kept post is deleted: that is the owner's to
--    decide, and the notice has to state it.
--
-- 2. **Told.** `report_board_post()` writes a message to every account
--    holding `platform_admin`, of a new kind, `board_reported`. It says
--    which board and links to the boards desk; it carries neither the words
--    nor anybody's name. Governance, support and the other staff are not
--    told, which is the owner's ruling of 2026-11-25. The kind cannot be
--    switched off and is not listed among the preferences: it is not a
--    choice a learner has, and the owner asked to be told.
--
--    This is a message inside the site: the unread count on `/account` and
--    the list on `/notifications`. It does not reach a telephone. An email
--    would, and nothing sends one yet (see NEXT.md).

-- ---------------------------------------------------------------------------
-- The words that are kept
-- ---------------------------------------------------------------------------
create table public.board_kept_words (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.board_threads(id) on delete restrict,
  reply_id   uuid references public.board_replies(id) on delete restrict,
  -- A thread has a title; a reply has none.
  title      text,
  body       text not null,
  written_at timestamptz not null,
  kept_at    timestamptz not null default now(),
  constraint board_kept_words_shape check ((reply_id is null) = (title is not null))
);

create unique index board_kept_words_thread_once on public.board_kept_words (thread_id) where reply_id is null;
create unique index board_kept_words_reply_once on public.board_kept_words (reply_id) where reply_id is not null;

alter table public.board_kept_words enable row level security;
revoke all on public.board_kept_words from public, anon, authenticated;

comment on table public.board_kept_words is
  'What a closed account had written on a board, copied before the post is erased from the board. The words and when they were written; not the account. No grant and no policy: read only through board_kept_post(), which is audited.';

create or replace function public.board_forget_closed_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handles uuid[];
begin
  select array_agg(h.id) into v_handles from public.board_handles h where h.user_id = new.user_id;

  update public.board_reports set reporter_id = null where reporter_id = new.user_id;

  if v_handles is null then
    return new;
  end if;

  -- Kept first, then taken off the board. What follows is as it was.
  insert into public.board_kept_words (thread_id, reply_id, title, body, written_at)
  select r.thread_id, r.id, null, r.body, r.created_at
    from public.board_replies r
   where r.handle_id = any(v_handles) and r.body <> '[erased]'
  on conflict do nothing;

  insert into public.board_kept_words (thread_id, reply_id, title, body, written_at)
  select t.id, null, t.title, t.body, t.created_at
    from public.board_threads t
   where t.handle_id = any(v_handles) and t.body <> '[erased]'
  on conflict do nothing;

  with gone as (
    update public.board_replies r
       set body = '[erased]', state = 'withdrawn'
     where r.handle_id = any(v_handles) and r.state = 'visible'
    returning r.thread_id
  )
  update public.board_threads t
     set reply_count = greatest(t.reply_count - g.n, 0)
    from (select thread_id, count(*)::int as n from gone group by thread_id) g
   where t.id = g.thread_id;

  update public.board_replies r
     set body = '[erased]'
   where r.handle_id = any(v_handles) and r.body <> '[erased]';

  update public.board_threads t
     set title = '[erased]',
         body  = '[erased]',
         state = case
           when t.state = 'visible' and not exists (
             select 1 from public.board_replies r
              where r.thread_id = t.id and r.state = 'visible')
           then 'withdrawn' else t.state end
   where t.handle_id = any(v_handles);

  update public.board_handles h
     set handle = 'gone_' || substr(replace(h.id::text, '-', ''), 1, 16),
         user_id = null
   where h.id = any(v_handles);

  return new;
end;
$$;

revoke all on function public.board_forget_closed_account() from public, anon, authenticated;

create or replace function public.board_kept_post(p_thread uuid, p_reply uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_kept   public.board_kept_words;
  v_board  text;
begin
  if v_actor is null or not public.can_moderate_boards(v_actor) then
    raise exception 'board:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  if char_length(v_reason) < 10 then
    raise exception 'board:reason_required' using errcode = 'check_violation';
  end if;
  select t.board into v_board from public.board_threads t where t.id = p_thread;
  select * into v_kept
    from public.board_kept_words k
   where k.thread_id = p_thread and k.reply_id is not distinct from p_reply;
  if v_board is null or v_kept.id is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;

  -- Written down before it answers.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'board.kept_words_opened',
          case when p_reply is null then 'board_thread' else 'board_reply' end,
          coalesce(p_reply, p_thread),
          jsonb_build_object('board', v_board, 'threadId', p_thread, 'reason', v_reason));

  return jsonb_build_object(
    'title',     v_kept.title,
    'body',      v_kept.body,
    'writtenAt', v_kept.written_at,
    'keptAt',    v_kept.kept_at);
end;
$$;

revoke all on function public.board_kept_post(uuid, uuid, text) from public, anon;
grant execute on function public.board_kept_post(uuid, uuid, text) to authenticated;

comment on function public.board_kept_post(uuid, uuid, text) is
  'What a closed account had written in one post, for the owner or governance, with a written reason of at least ten characters. An audit entry is written before it answers. It does not say whose the post was: that was cut when the account closed.';

-- ---------------------------------------------------------------------------
-- The owner is told of a report
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                  'media_encode_failed', 'live_cancelled', 'live_recording_ready',
                  'teaching_answered', 'board_reported'));

-- Not a preference: nobody chooses whether the owner hears of a report.
create or replace function public.notification_kind_is_locked(p_kind text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_kind in ('payout_failed', 'payout_cancelled', 'board_reported'), false);
$$;

create or replace function public.report_board_post(p_thread uuid, p_reply uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_thread public.board_threads;
  v_reply  public.board_replies;
  v_owner  uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_id     uuid;
  v_told   uuid;
begin
  if v_actor is null then
    raise exception 'board:not_signed_in' using errcode = 'insufficient_privilege';
  end if;
  select * into v_thread from public.board_threads t where t.id = p_thread;
  if v_thread.id is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  perform public.board_enter(v_actor, v_thread.board);
  if v_thread.state <> 'visible' then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;

  if p_reply is null then
    select h.user_id into v_owner from public.board_handles h where h.id = v_thread.handle_id;
  else
    select * into v_reply from public.board_replies r
     where r.id = p_reply and r.thread_id = v_thread.id and r.state = 'visible';
    if v_reply.id is null then
      raise exception 'board:not_found' using errcode = 'no_data_found';
    end if;
    select h.user_id into v_owner from public.board_handles h where h.id = v_reply.handle_id;
  end if;

  if v_owner is not distinct from v_actor then
    raise exception 'board:own_post' using errcode = 'check_violation';
  end if;
  if char_length(v_reason) < 4 or char_length(v_reason) > 1000 then
    raise exception 'board:reason_length' using errcode = 'check_violation';
  end if;
  -- Ten reports in a day from one account is enough to be heard.
  if (select count(*) from public.board_reports br
       where br.reporter_id = v_actor and br.created_at > now() - interval '24 hours') >= 10 then
    raise exception 'board:too_many' using errcode = 'program_limit_exceeded';
  end if;

  begin
    insert into public.board_reports (thread_id, reply_id, reporter_id, reason)
    values (v_thread.id, p_reply, v_actor, v_reason)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'board:already_reported' using errcode = 'unique_violation';
  end;

  -- The owner is told, and nobody else. The message says which board and
  -- where to go: not the words, not who wrote them, not who reported them.
  -- One message for a post in a day, however many people report it.
  for v_told in
    select distinct ura.user_id
      from public.user_role_assignments ura
      join public.roles r on r.id = ura.role_id
     where r.code = 'platform_admin'
       and ura.user_id <> v_actor
       and public.has_role(ura.user_id, 'platform_admin')
  loop
    perform public.notify_user(
      v_told,
      'board_reported',
      'A post on a discussion board was reported',
      case v_thread.board
        when 'teachers' then 'Somebody reported a post on the teachers'' board. It is waiting on the boards desk.'
        else 'Somebody reported a post on the students'' board. It is waiting on the boards desk.'
      end,
      '/admin/boards',
      'action',
      'board_report:' || coalesce(p_reply, v_thread.id)::text || ':' || to_char(now() at time zone 'utc', 'YYYY-MM-DD'),
      jsonb_build_object('board', v_thread.board));
  end loop;

  return jsonb_build_object('reported', true);
end;
$$;

revoke all on function public.report_board_post(uuid, uuid, text) from public, anon;
grant execute on function public.report_board_post(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Both switches say what has to be true first
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = preconditions || ' From 2026-11-26 (owner decision): what a closed account wrote is kept, cut from the account, and read only by the owner or governance with a written reason. Before turning this on, publish a privacy notice that says posts are kept after they are taken back, taken down or the account closes, for how long, and who may read them; a kept record nobody was told of has not been agreed to.'
 where key in ('community.student_board', 'community.teacher_board')
   and preconditions not like '%what a closed account wrote is kept%';
