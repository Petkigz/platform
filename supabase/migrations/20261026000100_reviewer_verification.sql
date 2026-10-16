-- A user could verify themselves as a reviewer.
--
-- reviewer_profiles_insert admits any row where user_id = current_user_id(),
-- and reviewer_profiles_update admits any update to your own row. Neither
-- says anything about reviewer_status, so this was allowed:
--
--   insert into reviewer_profiles (user_id, reviewer_status, verified_at, verified_by)
--   values (auth.uid(), 'active', now(), auth.uid());
--
-- or, in two steps, register as an 'applicant' and then update yourself to
-- 'active'. Either way you end up with a profile that reads as verified, with
-- yourself recorded as the person who verified it.
--
-- What it does and does not buy you matters, and is worth being precise
-- about. It is NOT a route to approving courses: is_authorised_reviewer()
-- additionally requires a live reviewer_subject_authorizations row, and
-- rsa_write is privileged only, so validate_review_assignment() still refuses
-- to assign a self-verified reviewer to any version that has review
-- requirements.
--
-- What it IS: a public false credential. reviewer_profiles_read shows active
-- profiles to the anonymous role, so a self-verified profile is displayed to
-- the world as a verified reviewer. It also lands in the staff assignment
-- dropdown, which filters on reviewer_status = 'active' — so the defect
-- degrades a human judgement rather than bypassing a machine one.
--
-- Fixed with a trigger rather than a WITH CHECK clause, because the same rule
-- has to hold on insert and on update, and because the codebase's convention
-- for "this must not be bypassable" is a trigger.

-- ---------------------------------------------------------------------------
-- The guard
-- ---------------------------------------------------------------------------

create or replace function public.protect_reviewer_verification()
returns trigger
language plpgsql
as $$
begin
  -- This trigger polices self-service writes only: the defect is a person
  -- verifying their OWN profile. Anything else — staff writing someone
  -- else's profile, a migration, a SECURITY DEFINER function, or the test
  -- fixtures, none of which carry a JWT subject — is left alone.
  --
  -- Scoping it this way rather than exempting "privileged or no subject"
  -- matters: a rule whose exemption is "there is no authenticated user" can
  -- be read as trusting the anonymous role. A rule whose exemption is "this
  -- row is not yours" cannot, because a self-service write by definition has
  -- a subject that matches the row.
  if new.user_id is distinct from public.current_user_id() then
    return new;
  end if;

  if public.is_privileged(public.current_user_id()) then
    return new;
  end if;

  -- 'active' and 'suspended' are the two states the schema treats as verified
  -- (both require verified_at to be set). Everything else a person may set on
  -- their own profile: applicant, pending_verification, inactive.
  if new.reviewer_status in ('active', 'suspended') then
    raise exception
      'only platform staff may move a reviewer profile to %', new.reviewer_status
      using errcode = 'insufficient_privilege';
  end if;

  -- Recording who verified you, or when, is the act of verification itself.
  if new.verified_at is not null or new.verified_by is not null then
    raise exception
      'a reviewer may not record their own verification'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function public.protect_reviewer_verification() is
  'Refuses a self-service write that would mark a reviewer profile as verified. Only fires when the row belongs to the acting user, so staff, migrations and definer functions are unaffected. Covers insert and update, because inserting straight to active was as easy as updating into it.';

drop trigger if exists protect_reviewer_verification on public.reviewer_profiles;
create trigger protect_reviewer_verification
  before insert or update on public.reviewer_profiles
  for each row
  execute function public.protect_reviewer_verification();

-- ---------------------------------------------------------------------------
-- Clean up any self-verified rows
-- ---------------------------------------------------------------------------
--
-- The app has no reviewer registration page yet, so this is expected to match
-- nothing. It is here so the migration is safe to run against a database that
-- has had the hole open for a while.

update public.reviewer_profiles rp
   set reviewer_status = 'pending_verification',
       verified_at = null,
       verified_by = null
 where rp.reviewer_status in ('active', 'suspended')
   and rp.verified_by = rp.user_id
   and not public.is_privileged(rp.verified_by);
