-- Every authenticated user gets a profile.
--
-- WHAT THIS FIXES
-- ---------------
-- user_profiles.user_id is the primary key, foreign-keyed to auth.users, and
-- essentially every other table points at it: courses.created_by,
-- billing_accounts.created_by, user_role_assignments.user_id,
-- learner_profiles.linked_user_id, reviewer_profiles.user_id.
--
-- Nothing created the row. The sign-up page calls supabase.auth.signUp() and
-- stops there. There was no trigger on auth.users and no application insert, so
-- a person who signed up had an auth.users row and no profile — and could not
-- create a course, open a billing account, be given a role, or be linked to a
-- learner profile. Verified directly: each of those inserts fails on its
-- foreign key.
--
-- That makes it the fourteenth instance of the same defect and the one that
-- gates all the others. Every writer added before this was unreachable to
-- anyone who arrived through the front door.
--
-- WHY A TRIGGER RATHER THAN AN APP-SIDE INSERT
-- --------------------------------------------
-- The same signup will happen from the Expo app, from the admin API, and from
-- anything else that talks to Supabase Auth. Doing it in the client means
-- every client has to remember, and the failure mode is a user who can sign in
-- and then can do nothing. Doing it here means it cannot be forgotten.
--
-- WHAT IS DELIBERATELY NOT DECIDED
-- --------------------------------
-- The display name is derived, because sign-up collects only an email or a
-- phone number and display_name is NOT NULL and non-blank. There is no settings
-- screen yet, so the derived name is currently the only name a user has. That
-- is a real gap and is recorded as one rather than papered over with a form
-- this migration has no way to serve.

-- ---------------------------------------------------------------------------
-- The profile row
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_phone text;
  v_name  text;
begin
  -- auth.users exposes email and phone as columns in this schema; read them
  -- from NEW rather than re-querying, so this stays correct inside the
  -- transaction that created the user.
  v_email := new.email;
  v_phone := new.phone;

  -- display_name is NOT NULL with a non-blank CHECK, so something has to be
  -- chosen. Derive it, in preference order, and never emit a blank.
  if v_email is not null and trim(v_email) <> '' then
    v_name := split_part(v_email, '@', 1);
  elsif v_phone is not null and trim(v_phone) <> '' then
    v_name := trim(v_phone);
  else
    v_name := 'Member ' || left(new.id::text, 8);
  end if;

  -- The local part of an address can be a single character, which satisfies
  -- the non-blank check but makes a poor display name. Leave it; it is
  -- editable in principle and honest in the meantime. Inventing a nicer one
  -- would be guessing at a person's name.
  v_name := trim(v_name);
  if v_name = '' then
    v_name := 'Member ' || left(new.id::text, 8);
  end if;

  insert into public.user_profiles (user_id, display_name)
  values (new.id, v_name)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the user_profiles row every other table in the schema depends on. Idempotent, because auth.users inserts can be retried.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- Nothing is expected here — there is no live deployment — but the statement is
-- correct and cheap, and running it means this migration leaves the database
-- consistent whether or not it is applied to a database that already has users.

insert into public.user_profiles (user_id, display_name)
select u.id,
       case
         when u.email is not null and trim(u.email) <> '' then split_part(u.email, '@', 1)
         when u.phone is not null and trim(u.phone) <> '' then trim(u.phone)
         else 'Member ' || left(u.id::text, 8)
       end
  from auth.users u
 where not exists (select 1 from public.user_profiles p where p.user_id = u.id)
on conflict (user_id) do nothing;
