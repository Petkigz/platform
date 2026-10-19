-- Saved courses. The flag ships off and can be enabled from the admin
-- dashboard; the guard trigger enforces the same switch, so a direct PostgREST
-- call cannot use the feature while it is disabled.
--
-- The register row said this was "only meaningful once `commerce.checkout` is
-- on". That was true of the *buy* half and false of the *save* half: a course
-- can be free, can be published next month, or can be sitting in the catalogue
-- while a family decides which child it is for. Saving is a bookmark with a
-- reason attached, and it is useful before any money moves. The description and
-- precondition below now say that, and the flag still ships off — the remaining
-- question is a retention one, not a missing table.
--
-- Ownership is deliberately per account, not per learner profile. Every other
-- learner-scoped thing on this platform asks "who is learning?" at the moment it
-- matters, which is enrolment; asking it again when someone taps save would be
-- friction on the one action that is supposed to be effortless. The optional
-- note is where intent goes instead — "for Amina, after Tajweed 1" — which
-- captures the same information without making a five-field decision out of a
-- bookmark.

update public.platform_settings
   set description   = 'Saved courses, with an optional private note',
       preconditions = 'Retention and account-deletion policy decided. Saving works without checkout; taking payment for a saved course still needs `commerce.checkout`.'
 where key = 'learning.wishlist';

create table public.course_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,

  -- Why it was saved. Private, optional, and the only place the "who is this
  -- for" question is answered — see the header.
  note text check (note is null or length(trim(note)) between 0 and 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint course_wishlist_one_per_user_course unique (user_id, course_id)
);

create index course_wishlist_user_created_idx
  on public.course_wishlist(user_id, created_at desc);

create trigger course_wishlist_set_updated_at
  before update on public.course_wishlist
  for each row execute function public.set_updated_at();

alter table public.course_wishlist enable row level security;

-- ---------------------------------------------------------------------------
-- Guard
-- ---------------------------------------------------------------------------
--
-- Insert and update only. Deleting is never gated: turning the flag off must
-- not trap rows someone already saved, the same reasoning as closing the support
-- desk without stranding open cases.
--
-- One hundred saved courses is the ceiling. It is not a product limit — nobody
-- plans to buy a hundred courses — it is the point at which an unbounded
-- per-account table becomes a cheap way to fill a database.

create or replace function public.guard_course_wishlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_saved integer;
begin
  if tg_op <> 'DELETE' then
    if not public.setting_bool('learning.wishlist', false) then
      raise exception 'saved courses are not enabled (learning.wishlist is off)'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'DELETE' then
    -- Only a *signed-in* someone-else is refused. A delete with no actor in the
    -- session is a cascade or a maintenance job — account erasure reaches these
    -- rows through `on delete cascade` from `user_profiles`, and a trigger that
    -- demanded an owner there would make deleting an account impossible. Row
    -- level security already stops one learner removing another's row; this
    -- branch exists for the case where a policy is wrong.
    if v_actor is not null
       and old.user_id <> v_actor
       and not public.is_privileged(v_actor) then
      raise exception 'you can only remove your own saved courses'
        using errcode = 'insufficient_privilege';
    end if;
    return old;
  end if;

  if v_actor is not null then
    new.user_id := v_actor;
  end if;
  if new.user_id is null then
    raise exception 'a signed-in owner is required to save a course'
      using errcode = 'insufficient_privilege';
  end if;

  -- The course cannot be swapped: a saved row means "this course", and letting
  -- it be repointed would turn an edit into a save that never went through the
  -- checks below.
  --
  -- The owner is not checked for change because it cannot change: the
  -- assignment above already overwrote whatever was supplied with the session.
  -- A caller who tries to give a row away, or to plant one on another account,
  -- gets a row owned by themselves. Silently correcting beats raising here,
  -- because the corrected row is exactly what the caller was entitled to write.
  if tg_op = 'UPDATE' and new.course_id is distinct from old.course_id then
    raise exception 'the course of a saved item cannot be changed'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
      from public.courses c
     where c.id = new.course_id
       and c.deleted_at is null
  ) then
    raise exception 'course not found'
      using errcode = 'no_data_found';
  end if;

  -- A retired course is no longer offered, so saving it now would create a row
  -- that can only ever say "unavailable". Rows saved before retirement stay, and
  -- the saved list reports them honestly — including being able to edit the
  -- note, which is why the check is skipped when a row already exists.
  --
  -- That skip is not only for tidiness. `on conflict do update` performs a
  -- *speculative insertion* first, so this BEFORE INSERT trigger fires on the
  -- update path too; without the existence test, saving an edit to a note on a
  -- course retired since would be refused as a new save.
  if tg_op = 'INSERT'
     and not exists (
       select 1 from public.course_wishlist w
        where w.user_id = new.user_id and w.course_id = new.course_id
     )
     and exists (
       select 1
         from public.courses c
        where c.id = new.course_id
          and c.status = 'retired'
     ) then
    raise exception 'this course is no longer offered'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into v_saved
      from public.course_wishlist w
     where w.user_id = new.user_id;
    if v_saved >= 100 then
      raise exception 'you have saved 100 courses already; remove one first'
        using errcode = 'program_limit_exceeded';
    end if;
  end if;

  new.note := nullif(trim(coalesce(new.note, '')), '');
  return new;
end;
$$;
revoke all on function public.guard_course_wishlist() from public;

create trigger course_wishlist_guard
  before insert or update or delete on public.course_wishlist
  for each row execute function public.guard_course_wishlist();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
--
-- A saved list is private. There is no staff read policy and no public one:
-- what someone is considering buying, or which course they wrote a note about
-- for which child, is nobody else's business. Staff reach the table through a
-- privileged session only if a support case ever requires it, and that goes
-- through `is_privileged`, which the audit log records elsewhere.

create policy course_wishlist_read on public.course_wishlist
  for select to authenticated
  using (user_id = public.current_user_id());

create policy course_wishlist_insert on public.course_wishlist
  for insert to authenticated
  with check (user_id = public.current_user_id());

create policy course_wishlist_update on public.course_wishlist
  for update to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy course_wishlist_delete on public.course_wishlist
  for delete to authenticated
  using (user_id = public.current_user_id());

revoke all on public.course_wishlist from anon, authenticated;
grant select, insert, update, delete on public.course_wishlist to authenticated;

comment on table public.course_wishlist is
  'A signed-in account’s saved courses with an optional private note; one row per account per course; flag-gated.';
comment on column public.course_wishlist.note is
  'Private reason for saving. The place "who is this for" is answered, since the row itself is per account rather than per learner profile.';
comment on function public.guard_course_wishlist() is
  'Enforces learning.wishlist, session ownership, an existing course, the retired-course and 100-row ceilings, and note trimming. The owner column is corrected to the session rather than checked. Deleting is not flag-gated so disabling the flag cannot trap saved rows; a signed-in non-owner is still refused, while a cascade or maintenance delete is not.';
