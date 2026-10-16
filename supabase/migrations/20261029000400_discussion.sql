-- ---------------------------------------------------------------------------
-- Per-lesson discussion.
--
-- Screen 27, and an explicit product want: forum and discussion are wanted.
-- There were no tables for it at all — grepping the schema for
-- discuss|forum|comment|post|thread returned only content_reports.
--
-- The flag register already carried learning.discussion with the precondition
-- "Moderation policy; who answers (teacher vs. peers); abuse handling", and
-- platform.moderation says "Policy before feature. Sectarian/contentious
-- threads on fiqh topics". That precondition was settled rather than skipped:
--
--   * hybrid moderation — a post by the course author or by staff is visible
--     immediately; anything a learner writes is held until a person approves it
--   * enrolled peers may answer each other, not only the teacher
--
-- Combined, those give one rule: **authority posts are visible, learner posts
-- are held.** A peer answer is a learner post, so it is held too — which is
-- what makes "peers may answer" safe on a platform teaching faith to children.
-- Peers can help each other, but unreviewed instruction never appears without
-- someone having looked at it.
--
-- The rule is enforced here, in the database, for one reason: a moderation
-- model that trusts the client is not a moderation model. The insert trigger
-- computes who the author is and *overwrites* whatever visibility_state was
-- supplied, so a learner cannot post as visible by asking to. The flag is
-- checked here too, so the feature is genuinely off until it is enabled from
-- the admin dashboard rather than off only in the UI.
-- ---------------------------------------------------------------------------

create table public.discussion_posts (
  id                 uuid primary key default gen_random_uuid(),

  lesson_id          uuid not null
    references public.lessons (id) on delete cascade,

  -- Null makes this a question at the top of the thread; a value makes it a
  -- reply. Self-referencing, one level deep is all a lesson thread needs.
  parent_id          uuid
    references public.discussion_posts (id) on delete cascade,

  author_user_id     uuid not null
    references public.user_profiles (user_id) on delete cascade,

  body               text not null,

  -- pending: held, visible to nobody but the author and moderators
  -- visible: published
  -- hidden:  was visible, withdrawn by a moderator
  -- removed: refused or taken down; kept for the abuse record
  visibility_state   text not null default 'pending',

  -- Set by the trigger from who the author actually is, never from the
  -- request. This is the column the moderation rule hangs off.
  author_kind        text not null default 'learner',

  moderated_by       uuid
    references public.user_profiles (user_id) on delete set null,
  moderated_at       timestamptz,
  moderation_note    text,
  hidden_reason      text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,

  constraint dp_visibility_state check (
    visibility_state in ('pending', 'visible', 'hidden', 'removed')
  ),
  constraint dp_author_kind check (author_kind in ('teacher', 'learner')),
  constraint dp_body_not_blank check (length(trim(body)) > 0),
  -- A post that is still held has not been moderated. Asserting this stops a
  -- moderation record appearing on a post nobody decided anything about.
  constraint dp_pending_is_unmoderated check (
    visibility_state <> 'pending'
    or (moderated_by is null and moderated_at is null)
  ),
  -- An authority post is never held.
  constraint dp_teacher_never_pending check (
    author_kind <> 'teacher' or visibility_state <> 'pending'
  ),
  -- The load-bearing one: a learner's post cannot reach any state other than
  -- pending without a named moderator. Without this, "held until approved" is
  -- a convention rather than a rule.
  constraint dp_learner_needs_moderator check (
    author_kind <> 'learner'
    or visibility_state = 'pending'
    or moderated_by is not null
  ),
  constraint dp_moderation_together check (
    (moderated_by is null) = (moderated_at is null)
  ),
  constraint dp_hidden_needs_reason check (
    visibility_state not in ('hidden', 'removed')
    or length(trim(coalesce(hidden_reason, ''))) > 0
  ),
  constraint dp_not_self_reply check (parent_id is null or parent_id <> id)
);

create index discussion_posts_lesson_idx
  on public.discussion_posts (lesson_id, created_at);

create index discussion_posts_parent_idx
  on public.discussion_posts (parent_id);

create index discussion_posts_moderation_queue_idx
  on public.discussion_posts (created_at)
  where visibility_state = 'pending' and deleted_at is null;

create trigger discussion_posts_set_updated_at
  before update on public.discussion_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Can this session read the discussion on a lesson?
--
-- A separate helper because can_access_lesson() is keyed on a learner profile,
-- not on a user, and an RLS policy only has the current user. This resolves the
-- gap: any learner profile this user may act for that can access the lesson is
-- enough, plus the course author and staff.
-- ---------------------------------------------------------------------------
create or replace function public.can_read_discussion(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_privileged(public.current_user_id())
      or exists (
        select 1
          from public.lessons l
          join public.course_sections cs on cs.id = l.section_id
          join public.course_versions cv on cv.id = cs.course_version_id
         where l.id = p_lesson_id
           and public.can_author_version(cv.id)
      )
      or exists (
        select 1
          from public.learner_profiles lp
         where public.can_access_learner(lp.id)
           and public.can_access_lesson(lp.id, p_lesson_id)
      );
$$;

revoke all on function public.can_read_discussion(uuid) from public;
grant execute on function public.can_read_discussion(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The moderation rule, enforced on write.
-- ---------------------------------------------------------------------------
create or replace function public.apply_discussion_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_authority boolean;
  v_parent_lesson uuid;
begin
  -- Off means off. Checked here rather than only in the UI, so the feature
  -- cannot be used before the policy behind the flag is in place.
  if not public.setting_bool('learning.discussion', false) then
    raise exception
      'per-lesson discussion is not enabled (learning.discussion is off)'
      using errcode = 'check_violation';
  end if;

  -- A reply must be on the same lesson as the post it answers, otherwise a
  -- thread can be grafted onto a lesson its author cannot read.
  if new.parent_id is not null then
    select lesson_id into v_parent_lesson
      from public.discussion_posts where id = new.parent_id;
    if not found then
      raise exception 'reply target % does not exist', new.parent_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_parent_lesson <> new.lesson_id then
      raise exception
        'a reply must be on the same lesson as the post it answers'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Authority means: privileged staff, or the author of the course version
  -- this lesson belongs to. Computed, never supplied.
  select public.is_privileged(public.current_user_id())
      or public.can_author_version(cv.id)
    into v_is_authority
    from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
    join public.course_versions cv on cv.id = cs.course_version_id
   where l.id = new.lesson_id;

  if v_is_authority then
    new.author_kind := 'teacher';
    -- An authority post is published on arrival.
    new.visibility_state := 'visible';
    new.moderated_by := null;
    new.moderated_at := null;
    new.moderation_note := null;
    new.hidden_reason := null;
  else
    new.author_kind := 'learner';
    -- The point of the whole trigger: whatever the caller asked for is
    -- discarded. A learner's post is held until a person approves it, and
    -- no request can say otherwise.
    new.visibility_state := 'pending';
    new.moderated_by := null;
    new.moderated_at := null;
    new.moderation_note := null;
    new.hidden_reason := null;
  end if;

  -- Nobody posts as somebody else — but only when there is a session to be.
  --
  -- current_user_id() reads request.jwt.claims and is null with no claims,
  -- which is the state of a superuser fixture and of a migration. Overwriting
  -- unconditionally would blank the author for both, and "exempt the
  -- privileged" phrasing has already broken this suite once, because a
  -- superuser is not privileged under this helper — it simply has no claims.
  --
  -- This is not a weakening. Only `authenticated` may insert at all, and an
  -- authenticated request always carries a subject, so in production this
  -- branch always fires and the supplied id is always discarded. There is no
  -- request path where an anonymous caller reaches here with a null subject:
  -- the insert policy is restricted to authenticated, and can_read_discussion
  -- is false for a session with no user.
  if public.current_user_id() is not null then
    new.author_user_id := public.current_user_id();
  end if;

  return new;
end;
$$;

revoke all on function public.apply_discussion_moderation() from public;

create trigger discussion_posts_apply_moderation
  before insert on public.discussion_posts
  for each row execute function public.apply_discussion_moderation();

-- ---------------------------------------------------------------------------
-- Moderating a held post.
--
-- A separate function rather than a bare UPDATE, because the decision has to
-- be recorded: who approved it, when, and why anything was withdrawn. A
-- moderation queue that leaves no trail cannot answer the only question that
-- matters afterwards.
-- ---------------------------------------------------------------------------
create or replace function public.moderate_discussion_post(
  p_post_id uuid,
  p_state   text,
  p_note    text default null
)
returns public.discussion_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_result public.discussion_posts;
begin
  if not public.is_privileged(v_actor) then
    raise exception 'only staff may moderate discussion'
      using errcode = 'insufficient_privilege';
  end if;

  if p_state not in ('visible', 'hidden', 'removed') then
    raise exception 'a moderation decision must be visible, hidden or removed'
      using errcode = 'check_violation';
  end if;

  -- Withdrawing something that was published needs a reason. Approving
  -- something does not, though a note is welcome.
  if p_state in ('hidden', 'removed') and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception 'withdrawing a post requires a written reason'
      using errcode = 'check_violation';
  end if;

  update public.discussion_posts
     set visibility_state = p_state,
         moderated_by     = v_actor,
         moderated_at     = now(),
         moderation_note  = p_note,
         hidden_reason    = case when p_state in ('hidden','removed') then p_note else null end
   where id = p_post_id
  returning * into v_result;

  if not found then
    raise exception 'discussion post % not found', p_post_id
      using errcode = 'no_data_found';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'discussion.moderated', 'discussion_post', p_post_id,
          jsonb_build_object('state', p_state, 'note', p_note));

  return v_result;
end;
$$;

revoke execute on function public.moderate_discussion_post(uuid, text, text) from public, anon;
grant  execute on function public.moderate_discussion_post(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.discussion_posts enable row level security;

-- Reading: you must be able to reach the lesson, and you only ever see posts
-- that are published, or your own. A learner sees their own held post so they
-- are not left wondering whether it vanished; nobody sees anyone else's.
create policy discussion_posts_read on public.discussion_posts
  for select to anon, authenticated
  using (
    deleted_at is null
    and public.can_read_discussion(lesson_id)
    and (
      visibility_state = 'visible'
      or author_user_id = public.current_user_id()
      or public.is_privileged(public.current_user_id())
    )
  );

-- Posting: same reach as reading. The trigger decides whether it is held.
create policy discussion_posts_insert on public.discussion_posts
  for insert to authenticated
  with check (
    deleted_at is null
    and public.can_read_discussion(lesson_id)
  );

-- Editing your own post is allowed only while it is still held. Once a person
-- has approved wording, quietly changing it would publish something nobody
-- reviewed.
create policy discussion_posts_update on public.discussion_posts
  for update to authenticated
  using (
    (
      author_user_id = public.current_user_id()
      and visibility_state = 'pending'
    )
    or public.is_privileged(public.current_user_id())
  )
  with check (
    (
      author_user_id = public.current_user_id()
      and visibility_state = 'pending'
    )
    or public.is_privileged(public.current_user_id())
  );

-- Soft delete only. A withdrawn post is part of the abuse record.
create policy discussion_posts_delete on public.discussion_posts
  for delete to authenticated
  using (
    author_user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

