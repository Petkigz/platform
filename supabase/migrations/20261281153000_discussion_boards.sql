-- Two discussion boards: one for students and teachers, one for teachers only.
--
-- Asked for by the owner on 2026-11-24, with four answers given the same day:
--
--   * a student gets in with a class somebody paid for (bought, on a plan,
--     a sponsored seat or a school's seat; a free course does not count), and
--     is out again when that ends;
--   * people write under a username they choose, because some questions are
--     hard to ask under your own name;
--   * nobody but the owner and governance staff can find out which account is
--     behind a username, and every time they look it is written down;
--   * a post is shown at once. It can be reported and taken down afterwards.
--     Students under 18 use the board on the same terms as adults.
--
-- The per-lesson discussion (20261029000400) is a different thing and is not
-- touched: it hangs off one lesson, shows the author's name, and holds every
-- learner's post until somebody approves it.
--
-- How anonymity is kept, and what it rests on:
--
--   * The four tables have row-level security on and **no policy**, and the
--     two API roles hold no privilege on them. Nothing reads them but the
--     functions below.
--   * No function that a member can call returns an account, a learner, a
--     name or an e-mail address. A post goes out with its username, whether
--     its author was a student, a teacher or staff when they wrote it, and
--     whether it is the caller's own.
--   * One function returns the account behind a post: `board_author()`. It
--     is for the owner and governance, needs a written reason, and writes an
--     audit entry before it answers.
--
-- What anonymity here does not cover, said plainly: staff can look; what
-- somebody writes can identify them whatever name it is under; a username is
-- per board, so a teacher is one name among teachers and another among
-- students, but each name is the same on every post.
--
-- Who is a student here: an account that a learner studies through, where
-- that learner holds a grant that is active now, covers a course, and came
-- from money: a purchase, a plan, a family plan, a sponsored seat or a
-- school's seat. A free course, a staff grant and a promotion do not open the
-- board.
--
-- "Studies through" is the same thing it is for a lesson. A learner with a
-- login of their own is that login and no other. A learner without one (a
-- child, while `family.child_login` is off) studies through the family
-- account that looks after them, so that account is let in on the child's
-- paid class. The owner chose on 2026-11-24 that students under 18 use the
-- board on the same terms as adults; that a child without a login gets in
-- through the family's sign-in is the builder's reading of that answer, not
-- something the owner was asked. It means an adult in the family can read
-- and write there too, under the same username, marked as a student; adult
-- students are on that board in any case. Where guardian verification is
-- enforced, the family account must be the child's verified guardian with
-- consent that is current, as it must be to open the child's lesson. Somebody who only pays
-- for the family is not let in. One account has one username on a board, so
-- a parent and two children on one sign-in write under one name.
--
-- Closing an account takes its words off the boards and cuts the username
-- from the account (a trigger on `user_profiles`, at the end of this file).
--
-- Who is a teacher: an account holding the `instructor` role, which is given
-- by appointment only.
--
-- Both boards ship **off**. Each has its own switch.

-- ---------------------------------------------------------------------------
-- The switches
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, description, value_type, value_text, gate_type, preconditions, flag_group)
values
  ('community.student_board', 'The students'' discussion board', 'boolean', 'false', 'admin_setup',
   'Posts are shown at once and are only taken down after somebody reports them (owner decision, 2026-11-24), and students under 18 use it on the same terms as adults. Before switching on: name who reads the report queue and how often, and read the house rules on the board''s page. The words are in twenty-seven languages and were read by no speaker.',
   'Learner features'),
  ('community.teacher_board', 'The teachers'' discussion board', 'boolean', 'false', 'admin_setup',
   'Only accounts holding the teacher role can open it; the owner and governance can read it to moderate. Posts are shown at once. Before switching on: name who reads the report queue.',
   'Teaching')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- A username, one for each board
-- ---------------------------------------------------------------------------
create table public.board_handles (
  id             uuid primary key default gen_random_uuid(),
  board          text not null check (board in ('students', 'teachers')),

  -- The account. Set to null when the account is erased: the posts stay
  -- under the username and are then nobody's.
  user_id        uuid references public.user_profiles (user_id) on delete set null,

  handle         text not null,

  -- A blocked username can read and cannot write.
  blocked_at     timestamptz,
  blocked_by     uuid references public.user_profiles (user_id) on delete set null,
  blocked_reason text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint board_handles_one_each unique (board, user_id),
  constraint board_handles_length check (char_length(handle) between 3 and 24),
  -- No space, no invisible character, and none of the marks that make a name
  -- look like an address, a link or markup. Letters and digits of any script
  -- and the underscore are what is left.
  constraint board_handles_shape check (
    handle !~ '[\s\u00A0\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u3000]'
    and handle !~ '[]\[!"#$%&''()*+,./:;<=>?@\\^`{|}~-]'
  ),
  constraint board_handles_block_together check (
    (blocked_at is null) = (blocked_reason is null)
  )
);

create unique index board_handles_name_once
  on public.board_handles (board, lower(handle));

create trigger board_handles_set_updated_at
  before update on public.board_handles
  for each row execute function public.set_updated_at();

comment on table public.board_handles is
  'The username an account writes under on one discussion board. Read by no API role: only the board functions, and board_author() for staff with a reason.';

-- ---------------------------------------------------------------------------
-- Threads and replies
-- ---------------------------------------------------------------------------
create table public.board_threads (
  id               uuid primary key default gen_random_uuid(),
  board            text not null check (board in ('students', 'teachers')),
  handle_id        uuid not null references public.board_handles (id) on delete restrict,

  -- What the author was when they wrote it, set by the function and never by
  -- the request. A badge a reader can trust.
  author_kind      text not null check (author_kind in ('student', 'teacher', 'staff')),

  title            text not null check (char_length(btrim(title)) between 4 and 140),
  body             text not null check (char_length(btrim(body)) between 1 and 6000),

  -- visible:   shown
  -- withdrawn: taken back by its author
  -- removed:   taken down by staff, with a reason
  state            text not null default 'visible'
                     check (state in ('visible', 'withdrawn', 'removed')),
  removed_by       uuid references public.user_profiles (user_id) on delete set null,
  removed_at       timestamptz,
  removed_reason   text,

  reply_count      integer not null default 0 check (reply_count >= 0),
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),

  constraint board_threads_removed_has_reason check (
    state <> 'removed' or (removed_at is not null and length(btrim(coalesce(removed_reason, ''))) > 0)
  )
);

create index board_threads_list_idx
  on public.board_threads (board, last_activity_at desc)
  where state = 'visible';
create index board_threads_handle_idx on public.board_threads (handle_id, created_at);

create table public.board_replies (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid not null references public.board_threads (id) on delete cascade,
  handle_id      uuid not null references public.board_handles (id) on delete restrict,
  author_kind    text not null check (author_kind in ('student', 'teacher', 'staff')),
  body           text not null check (char_length(btrim(body)) between 1 and 6000),
  state          text not null default 'visible'
                   check (state in ('visible', 'withdrawn', 'removed')),
  removed_by     uuid references public.user_profiles (user_id) on delete set null,
  removed_at     timestamptz,
  removed_reason text,
  created_at     timestamptz not null default now(),

  constraint board_replies_removed_has_reason check (
    state <> 'removed' or (removed_at is not null and length(btrim(coalesce(removed_reason, ''))) > 0)
  )
);

create index board_replies_thread_idx on public.board_replies (thread_id, created_at);
create index board_replies_handle_idx on public.board_replies (handle_id, created_at);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table public.board_reports (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.board_threads (id) on delete cascade,
  -- Null: the report is about the thread's first post.
  reply_id    uuid references public.board_replies (id) on delete cascade,

  -- Who reported. Kept so one person cannot report one post a hundred times
  -- and so a false report can be answered; shown to nobody but staff, and to
  -- them only through board_author().
  reporter_id uuid references public.user_profiles (user_id) on delete set null,
  reason      text not null check (char_length(btrim(reason)) between 4 and 1000),

  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.user_profiles (user_id) on delete set null,
  outcome     text check (outcome in ('removed', 'kept')),

  constraint board_reports_resolved_together check (
    (resolved_at is null) = (outcome is null)
  )
);

create unique index board_reports_one_open
  on public.board_reports (thread_id, coalesce(reply_id, thread_id), reporter_id)
  where resolved_at is null;
create index board_reports_open_idx on public.board_reports (created_at) where resolved_at is null;

-- ---------------------------------------------------------------------------
-- Nothing reads these tables but the functions below
-- ---------------------------------------------------------------------------
alter table public.board_handles enable row level security;
alter table public.board_threads enable row level security;
alter table public.board_replies enable row level security;
alter table public.board_reports enable row level security;

revoke all on table public.board_handles from public, anon, authenticated;
revoke all on table public.board_threads from public, anon, authenticated;
revoke all on table public.board_replies from public, anon, authenticated;
revoke all on table public.board_reports from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Who is in
-- ---------------------------------------------------------------------------
create or replace function public.can_moderate_boards(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(p_actor, 'platform_admin')
      or public.has_role(p_actor, 'governance_admin');
$$;

comment on function public.can_moderate_boards(uuid) is
  'The owner or governance may take a post down, block a username and, with a written reason, see the account behind a post. Support, finance, reviewers and teachers may not.';

-- What this account is on this board, now. One row, always.
--   kind:  'teacher', 'student', 'staff', or null when it is not let in
--   until: when a student's access ends, if it has an end
create or replace function public.board_standing(p_user uuid, p_board text)
returns table (kind text, until timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_open_ended boolean;
  v_until      timestamptz;
  v_found      boolean;
begin
  kind := null; until := null;

  if p_user is null or p_board not in ('students', 'teachers')
     or not exists (
       select 1 from public.user_profiles p
        where p.user_id = p_user and p.account_status = 'active' and p.deleted_at is null
     ) then
    return next; return;
  end if;

  -- A teacher is in both.
  if public.has_role(p_user, 'instructor') then
    kind := 'teacher'; return next; return;
  end if;

  -- Staff read both, to moderate.
  if public.can_moderate_boards(p_user) then
    kind := 'staff'; return next; return;
  end if;

  if p_board = 'teachers' then
    return next; return;
  end if;

  -- A student: a learner this account studies as, with a class somebody
  -- paid for that is open now.
  select count(*) > 0,
         coalesce(bool_or(eg.effective_until is null), false),
         max(eg.effective_until)
    into v_found, v_open_ended, v_until
    from public.entitlement_grants eg
    join public.learner_profiles lp on lp.id = eg.learner_profile_id
   where lp.status = 'active'
     and lp.deleted_at is null
     and (
       -- its own learner
       lp.linked_user_id = p_user
       -- or a learner with no login of their own, in a family this account
       -- looks after (not one it only pays for)
       or (
         lp.linked_user_id is null
         and lp.family_id is not null
         and exists (
           select 1 from public.family_memberships fm
            where fm.family_id = lp.family_id
              and fm.user_id = p_user
              and fm.status = 'active'
              and fm.membership_type <> 'billing_manager')
         and (
           not public.guardian_consent_enforced()
           or lp.learner_type <> 'child'
           or exists (
             select 1 from public.guardian_relationships gr
              where gr.learner_profile_id = lp.id
                and gr.guardian_user_id = p_user
                and gr.status = 'active'
                and gr.deleted_at is null
                and public.guardian_consent_is_current(gr.id))
         )
       )
     )
     and eg.status = 'active'
     and now() >= eg.effective_from
     and (eg.effective_until is null or eg.effective_until > now())
     and eg.scope_type in ('course_version', 'course', 'subject')
     and eg.source_type in ('purchase', 'subscription', 'family_entitlement',
                            'scholarship', 'institution');

  if v_found then
    kind := 'student';
    until := case when v_open_ended then null else v_until end;
  end if;
  return next;
end;
$$;

comment on function public.board_standing(uuid, text) is
  'What an account is on a board right now: teacher (the instructor role), staff (owner or governance), student (a learner it studies as, its own or a child without a login in a family it looks after, holds an active grant for a course that came from a purchase, a plan, a sponsored seat or a school), or nothing. Read at every call, so access ends when the grant does.';

create or replace function public.board_switch(p_board text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_board
    when 'students' then public.setting_bool('community.student_board', false)
    when 'teachers' then public.setting_bool('community.teacher_board', false)
    else false
  end;
$$;

-- The checks every member function starts with. Returns the caller's kind.
create or replace function public.board_enter(p_actor uuid, p_board text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kind text;
begin
  if p_actor is null then
    raise exception 'board:not_signed_in' using errcode = 'insufficient_privilege';
  end if;
  if p_board is null or p_board not in ('students', 'teachers') then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  select s.kind into v_kind from public.board_standing(p_actor, p_board) s;
  -- Staff moderate a board that is switched off; nobody else opens one.
  if not public.board_switch(p_board) and coalesce(v_kind, '') <> 'staff' then
    raise exception 'board:closed' using errcode = 'feature_not_supported';
  end if;
  if v_kind is null then
    raise exception 'board:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  return v_kind;
end;
$$;

-- ---------------------------------------------------------------------------
-- Where I stand, and my username
-- ---------------------------------------------------------------------------
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
    'moderator', public.can_moderate_boards(v_actor));
end;
$$;

comment on function public.my_board(text) is
  'The caller''s standing on a board: whether it is switched on, what they are there (teacher, student, staff or nothing), when a student''s access ends, their username, and whether it can still be changed.';

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

comment on function public.set_board_handle(text, text) is
  'Choose the username this account writes under on one board. It can be changed until something has been written under it, and not after.';

-- ---------------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------------
create or replace function public.board_threads_page(
  p_board  text,
  p_before timestamptz default null,
  p_limit  integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_kind  text := public.board_enter(v_actor, p_board);
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
  v_rows  jsonb;
  v_count integer;
begin
  select coalesce(jsonb_agg(x.row order by x.at desc), '[]'::jsonb), count(*)
    into v_rows, v_count
    from (
      select t.last_activity_at as at,
             jsonb_build_object(
               'id',             t.id,
               'title',          t.title,
               'handle',         h.handle,
               'kind',           t.author_kind,
               'createdAt',      t.created_at,
               'lastActivityAt', t.last_activity_at,
               'replies',        t.reply_count,
               'mine',           h.user_id is not distinct from v_actor) as row
        from public.board_threads t
        join public.board_handles h on h.id = t.handle_id
       where t.board = p_board
         and t.state = 'visible'
         and (p_before is null or t.last_activity_at < p_before)
       order by t.last_activity_at desc
       limit v_limit + 1
    ) x;

  if v_count > v_limit then
    v_rows := v_rows - v_limit;
  end if;

  return jsonb_build_object('threads', v_rows, 'more', v_count > v_limit);
end;
$$;

comment on function public.board_threads_page(text, timestamptz, integer) is
  'The threads on a board, newest activity first, for somebody let in. Each with its title, its author''s username and kind, and whether it is the caller''s own. No account, name or learner.';

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

  -- A thread that was taken back or taken down is not there for anybody but
  -- its author and staff.
  if v_thread.state <> 'visible' and not v_mine and not v_staff then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;

  -- A reply that is gone keeps its place, so the replies after it still make
  -- sense, and says nothing: not its words and not who wrote it. Its author
  -- and staff still see it.
  select coalesce(jsonb_agg(
           case when r.state = 'visible' or rh.user_id is not distinct from v_actor or v_staff then
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
  'One thread and its replies, for somebody let in to its board. A reply that was taken back or taken down keeps its place and says nothing, except to its author and to staff.';

-- ---------------------------------------------------------------------------
-- Writing
-- ---------------------------------------------------------------------------
-- The username the caller writes under, or the reason they cannot.
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

create or replace function public.post_board_thread(p_board text, p_title text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_kind   text := public.board_enter(v_actor, p_board);
  v_handle uuid := public.board_writer(v_actor, p_board);
  v_title  text := btrim(coalesce(p_title, ''));
  v_body   text := btrim(coalesce(p_body, ''));
  v_id     uuid;
begin
  if char_length(v_title) < 4 or char_length(v_title) > 140 then
    raise exception 'board:title_length' using errcode = 'check_violation';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 6000 then
    raise exception 'board:body_length' using errcode = 'check_violation';
  end if;
  -- Five threads in a day is a person; fifty is not.
  if v_kind <> 'staff' and (
       select count(*) from public.board_threads t
        where t.handle_id = v_handle and t.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'board:too_many' using errcode = 'program_limit_exceeded';
  end if;

  insert into public.board_threads (board, handle_id, author_kind, title, body)
  values (p_board, v_handle, v_kind, v_title, v_body)
  returning id into v_id;

  return jsonb_build_object('threadId', v_id);
end;
$$;

comment on function public.post_board_thread(text, text, text) is
  'Start a thread under the caller''s username. Shown at once. At most five in twenty-four hours.';

create or replace function public.post_board_reply(p_thread uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_thread public.board_threads;
  v_kind   text;
  v_handle uuid;
  v_body   text := btrim(coalesce(p_body, ''));
  v_id     uuid;
begin
  if v_actor is null then
    raise exception 'board:not_signed_in' using errcode = 'insufficient_privilege';
  end if;
  select * into v_thread from public.board_threads t where t.id = p_thread for update;
  if v_thread.id is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  v_kind := public.board_enter(v_actor, v_thread.board);
  if v_thread.state <> 'visible' then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  v_handle := public.board_writer(v_actor, v_thread.board);
  if char_length(v_body) < 1 or char_length(v_body) > 6000 then
    raise exception 'board:body_length' using errcode = 'check_violation';
  end if;
  if v_kind <> 'staff' and (
       select count(*) from public.board_replies r
        where r.handle_id = v_handle and r.created_at > now() - interval '24 hours') >= 60 then
    raise exception 'board:too_many' using errcode = 'program_limit_exceeded';
  end if;

  insert into public.board_replies (thread_id, handle_id, author_kind, body)
  values (v_thread.id, v_handle, v_kind, v_body)
  returning id into v_id;

  update public.board_threads
     set reply_count = reply_count + 1, last_activity_at = now()
   where id = v_thread.id;

  return jsonb_build_object('replyId', v_id, 'threadId', v_thread.id);
end;
$$;

comment on function public.post_board_reply(uuid, text) is
  'Reply in a thread under the caller''s username. Shown at once. At most sixty in twenty-four hours.';

-- Taking back what you wrote. A reply is named with its thread.
create or replace function public.withdraw_board_post(p_thread uuid, p_reply uuid default null)
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
begin
  if v_actor is null then
    raise exception 'board:not_signed_in' using errcode = 'insufficient_privilege';
  end if;
  select * into v_thread from public.board_threads t where t.id = p_thread for update;
  if v_thread.id is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;

  -- Somebody whose access has ended may still take back what they wrote, so
  -- this does not ask whether they are let in now. It asks whose it is.
  if p_reply is null then
    select h.user_id into v_owner from public.board_handles h where h.id = v_thread.handle_id;
    if v_owner is distinct from v_actor then
      raise exception 'board:not_found' using errcode = 'no_data_found';
    end if;
    if v_thread.state = 'visible' then
      update public.board_threads set state = 'withdrawn' where id = v_thread.id;
    end if;
    return jsonb_build_object('threadId', v_thread.id, 'state',
      case when v_thread.state = 'visible' then 'withdrawn' else v_thread.state end);
  end if;

  select * into v_reply from public.board_replies r
   where r.id = p_reply and r.thread_id = v_thread.id for update;
  if v_reply.id is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  select h.user_id into v_owner from public.board_handles h where h.id = v_reply.handle_id;
  if v_owner is distinct from v_actor then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  if v_reply.state = 'visible' then
    update public.board_replies set state = 'withdrawn' where id = v_reply.id;
    update public.board_threads set reply_count = greatest(reply_count - 1, 0) where id = v_thread.id;
  end if;
  return jsonb_build_object('threadId', v_thread.id, 'replyId', v_reply.id, 'state',
    case when v_reply.state = 'visible' then 'withdrawn' else v_reply.state end);
end;
$$;

comment on function public.withdraw_board_post(uuid, uuid) is
  'The author takes back a thread or a reply. It stops being shown and is kept. Allowed after access has ended.';

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

  return jsonb_build_object('reported', true);
end;
$$;

comment on function public.report_board_post(uuid, uuid, text) is
  'Report a thread''s first post (no reply named) or one reply, with a reason. One open report for each person and post.';

-- ---------------------------------------------------------------------------
-- Moderation: the owner and governance
-- ---------------------------------------------------------------------------
create or replace function public.board_report_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.can_moderate_boards(v_actor) then
    raise exception 'board:not_allowed' using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'students', public.board_switch('students'),
    'teachers', public.board_switch('teachers'),
    'reports', (
      select coalesce(jsonb_agg(x.row order by x.first_at), '[]'::jsonb)
        from (
          select min(br.created_at) as first_at,
                 jsonb_build_object(
                   'threadId',  t.id,
                   'replyId',   r.id,
                   'board',     t.board,
                   'title',     t.title,
                   'body',      coalesce(r.body, t.body),
                   'handleId',  h.id,
                   'handle',    h.handle,
                   'kind',      coalesce(r.author_kind, t.author_kind),
                   'blocked',   h.blocked_at is not null,
                   'postedAt',  coalesce(r.created_at, t.created_at),
                   'reports',   count(*)::int,
                   'firstReportedAt', min(br.created_at),
                   -- What each reporter wrote. Not who they are.
                   'reasons',   jsonb_agg(br.reason order by br.created_at)) as row
            from public.board_reports br
            join public.board_threads t on t.id = br.thread_id
            left join public.board_replies r on r.id = br.reply_id
            join public.board_handles h on h.id = coalesce(r.handle_id, t.handle_id)
           where br.resolved_at is null
           group by t.id, r.id, h.id
        ) x));
end;
$$;

comment on function public.board_report_queue() is
  'Posts with an open report, oldest report first, for the owner and governance: the post, its username, and what each reporter wrote. No account behind either.';

create or replace function public.moderate_board_post(
  p_thread uuid,
  p_reply  uuid,
  p_remove boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_thread public.board_threads;
  v_reply  public.board_replies;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_closed integer;
begin
  if v_actor is null or not public.can_moderate_boards(v_actor) then
    raise exception 'board:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  if p_remove is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  if char_length(v_reason) < 4 then
    raise exception 'board:reason_required' using errcode = 'check_violation';
  end if;
  select * into v_thread from public.board_threads t where t.id = p_thread for update;
  if v_thread.id is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  if p_reply is not null then
    select * into v_reply from public.board_replies r
     where r.id = p_reply and r.thread_id = v_thread.id for update;
    if v_reply.id is null then
      raise exception 'board:not_found' using errcode = 'no_data_found';
    end if;
  end if;

  if p_remove then
    if p_reply is null then
      update public.board_threads
         set state = 'removed', removed_by = v_actor, removed_at = now(), removed_reason = v_reason
       where id = v_thread.id and state <> 'removed';
    else
      if v_reply.state = 'visible' then
        update public.board_threads set reply_count = greatest(reply_count - 1, 0) where id = v_thread.id;
      end if;
      update public.board_replies
         set state = 'removed', removed_by = v_actor, removed_at = now(), removed_reason = v_reason
       where id = v_reply.id and state <> 'removed';
    end if;
  end if;

  update public.board_reports br
     set resolved_at = now(), resolved_by = v_actor,
         outcome = case when p_remove then 'removed' else 'kept' end
   where br.thread_id = v_thread.id
     and br.reply_id is not distinct from p_reply
     and br.resolved_at is null;
  get diagnostics v_closed = row_count;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor,
          case when p_remove then 'board.post_removed' else 'board.post_kept' end,
          case when p_reply is null then 'board_thread' else 'board_reply' end,
          coalesce(p_reply, v_thread.id),
          jsonb_build_object('board', v_thread.board, 'threadId', v_thread.id,
                             'reason', v_reason, 'reportsClosed', v_closed));

  return jsonb_build_object('removed', p_remove, 'reportsClosed', v_closed);
end;
$$;

comment on function public.moderate_board_post(uuid, uuid, boolean, text) is
  'The owner or governance takes a post down, or decides it stays, with a written reason. Every open report about it is closed, and the decision is audited.';

create or replace function public.block_board_handle(p_handle uuid, p_block boolean, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_handle public.board_handles;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_actor is null or not public.can_moderate_boards(v_actor) then
    raise exception 'board:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  if p_block is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  if char_length(v_reason) < 4 then
    raise exception 'board:reason_required' using errcode = 'check_violation';
  end if;
  select * into v_handle from public.board_handles h where h.id = p_handle for update;
  if v_handle.id is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;

  if p_block then
    update public.board_handles
       set blocked_at = coalesce(blocked_at, now()), blocked_by = v_actor, blocked_reason = v_reason
     where id = v_handle.id;
  else
    update public.board_handles
       set blocked_at = null, blocked_by = null, blocked_reason = null
     where id = v_handle.id;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, case when p_block then 'board.handle_blocked' else 'board.handle_unblocked' end,
          'board_handle', v_handle.id,
          jsonb_build_object('board', v_handle.board, 'reason', v_reason));

  return jsonb_build_object('blocked', p_block);
end;
$$;

comment on function public.block_board_handle(uuid, boolean, text) is
  'The owner or governance stops a username writing, or lets it write again, with a written reason. A blocked username still reads. Audited.';

-- The one way to the account behind a post.
create or replace function public.board_author(p_thread uuid, p_reply uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_thread public.board_threads;
  v_reply  public.board_replies;
  v_handle public.board_handles;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_name   text;
begin
  if v_actor is null or not public.can_moderate_boards(v_actor) then
    raise exception 'board:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  -- A reason somebody could read later and understand.
  if char_length(v_reason) < 10 then
    raise exception 'board:reason_required' using errcode = 'check_violation';
  end if;
  select * into v_thread from public.board_threads t where t.id = p_thread;
  if v_thread.id is null then
    raise exception 'board:not_found' using errcode = 'no_data_found';
  end if;
  if p_reply is not null then
    select * into v_reply from public.board_replies r where r.id = p_reply and r.thread_id = v_thread.id;
    if v_reply.id is null then
      raise exception 'board:not_found' using errcode = 'no_data_found';
    end if;
  end if;
  select * into v_handle from public.board_handles h where h.id = coalesce(v_reply.handle_id, v_thread.handle_id);

  -- Written before the answer is given, in the same transaction: there is no
  -- looking without a record of it.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'board.author_opened',
          case when p_reply is null then 'board_thread' else 'board_reply' end,
          coalesce(p_reply, v_thread.id),
          jsonb_build_object('board', v_thread.board, 'threadId', v_thread.id,
                             'handleId', v_handle.id, 'reason', v_reason));

  select p.display_name into v_name from public.user_profiles p where p.user_id = v_handle.user_id;

  return jsonb_build_object(
    'handle',  v_handle.handle,
    -- Null when the account has since been erased.
    'userId',  v_handle.user_id,
    'name',    v_name);
end;
$$;

comment on function public.board_author(uuid, uuid, text) is
  'The account behind a post, for the owner or governance, with a written reason of at least ten characters. An audit entry is written before it answers. Nothing else returns an account from a board.';

-- ---------------------------------------------------------------------------
-- A closed account leaves the boards
-- ---------------------------------------------------------------------------
-- erase_my_account() keeps the profile row and blanks it. When it does, what
-- that account wrote on a board goes the way a lesson's discussion post goes:
-- the words are replaced, the row stays so other people's replies keep their
-- place. A thread nobody else has replied in is taken back whole. The
-- username is replaced by one that says nothing and is cut from the account,
-- so board_author() answers that the account is gone; and a report the
-- account made no longer names it.
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

create trigger user_profiles_leave_boards
  after update of deleted_at on public.user_profiles
  for each row
  when (old.deleted_at is null and new.deleted_at is not null)
  execute function public.board_forget_closed_account();

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
revoke all on function public.board_standing(uuid, text) from public, anon, authenticated;
revoke all on function public.board_switch(text) from public, anon, authenticated;
revoke all on function public.board_enter(uuid, text) from public, anon, authenticated;
revoke all on function public.board_writer(uuid, text) from public, anon, authenticated;

revoke all on function public.can_moderate_boards(uuid) from public, anon;
grant execute on function public.can_moderate_boards(uuid) to authenticated;

revoke all on function public.my_board(text) from public, anon;
grant execute on function public.my_board(text) to authenticated;
revoke all on function public.set_board_handle(text, text) from public, anon;
grant execute on function public.set_board_handle(text, text) to authenticated;
revoke all on function public.board_threads_page(text, timestamptz, integer) from public, anon;
grant execute on function public.board_threads_page(text, timestamptz, integer) to authenticated;
revoke all on function public.board_thread(uuid) from public, anon;
grant execute on function public.board_thread(uuid) to authenticated;
revoke all on function public.post_board_thread(text, text, text) from public, anon;
grant execute on function public.post_board_thread(text, text, text) to authenticated;
revoke all on function public.post_board_reply(uuid, text) from public, anon;
grant execute on function public.post_board_reply(uuid, text) to authenticated;
revoke all on function public.withdraw_board_post(uuid, uuid) from public, anon;
grant execute on function public.withdraw_board_post(uuid, uuid) to authenticated;
revoke all on function public.report_board_post(uuid, uuid, text) from public, anon;
grant execute on function public.report_board_post(uuid, uuid, text) to authenticated;
revoke all on function public.board_report_queue() from public, anon;
grant execute on function public.board_report_queue() to authenticated;
revoke all on function public.moderate_board_post(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.moderate_board_post(uuid, uuid, boolean, text) to authenticated;
revoke all on function public.block_board_handle(uuid, boolean, text) from public, anon;
grant execute on function public.block_board_handle(uuid, boolean, text) to authenticated;
revoke all on function public.board_author(uuid, uuid, text) from public, anon;
grant execute on function public.board_author(uuid, uuid, text) to authenticated;
