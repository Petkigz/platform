-- Who may teach.
--
-- The owner's rule (2026-10-22): a teacher signs in and is a teacher, a scholar
-- is a scholar, the admin holds every control, and a learner is a learner — the
-- power of each ends exactly where their work does. The course insert policy was
-- the one place that did not follow it: `courses_insert` allowed any signed-in
-- person to create a course attributed to themselves, so a learner's account
-- could open a shop. `/teach` did not check either.
--
-- Teaching is an appointment, not a self-service sign-up: `teaching.applications`
-- exists in the register, ships off, and its own note says the cohort is curated
-- by decision. So the database now requires the `instructor` role, and the
-- platform owner grants it from `/admin/roles`. When applications open, that
-- queue grants the same role through the same writer — this policy does not have
-- to change.
--
-- Writing an existing course is unchanged: `can_write_course()` already answers
-- "the author or privileged staff", and a teacher who loses the role still owns
-- what they wrote. What they cannot do is start something new.

drop policy if exists courses_insert on public.courses;

create policy courses_insert on public.courses
  for insert to authenticated
  with check (
    created_by = public.current_user_id()
    and (
      public.has_role(public.current_user_id(), 'instructor')
      or public.has_role(public.current_user_id(), 'platform_admin')
    )
  );

comment on policy courses_insert on public.courses is
  'A course is opened by a teacher or the platform owner. Teaching is an appointment (teaching.applications ships off); writing an existing course still follows can_write_course().';

-- A teacher has to be able to see how often their own campaign was used, or the
-- screen that manages it is describing something they cannot observe. The
-- redemption rows stay unreadable to everybody else: `redeemed_by` still only
-- admits the person who redeemed and privileged staff.
drop policy if exists promotion_redemptions_campaign_owner_read on public.promotion_redemptions;
create policy promotion_redemptions_campaign_owner_read on public.promotion_redemptions
  for select to authenticated
  using (exists (
    select 1 from public.promotion_campaigns pc
     where pc.id = campaign_id
       and pc.owner_type = 'teacher'
       and pc.instructor_id = public.current_user_id()
  ));

-- ---------------------------------------------------------------------------
-- The countries a promotion can be aimed at
-- ---------------------------------------------------------------------------
-- The screen has to offer a list of countries rather than ask somebody to type
-- "UG" and hope. The honest list is the one the platform already sells in — a
-- market appears the moment a live price names it — so it is read from the price
-- table rather than kept in a second place that can disagree with it.
--
-- SECURITY DEFINER because `prices` is not readable by every teacher, and the
-- question here is not "what does this cost" but "which countries exist".
create or replace function public.promotion_market_options()
returns table (market text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.market
    from public.prices p
    join public.products pr
      on pr.id = p.product_id
     and pr.status = 'active'
   where p.market is not null
     and p.status = 'active'
     and p.billing_interval = 'one_time'
     and p.effective_from <= now()
     and (p.effective_until is null or p.effective_until > now())
   order by 1;
$$;

comment on function public.promotion_market_options() is
  'The countries the platform currently sells in, read from live prices, so a promotion screen offers a list instead of asking for a code.';

revoke execute on function public.promotion_market_options() from public, anon;
grant  execute on function public.promotion_market_options() to authenticated;
