-- Reviewed platform help, independent of the model and of a user's device.
-- This is platform navigation help, not a religious-answers library.
create table public.platform_help_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 3 and 160),
  body text not null check (length(btrim(body)) between 10 and 5000),
  keywords text not null default '' check (length(keywords) <= 500),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_help_articles enable row level security;
revoke all on public.platform_help_articles from public, anon, authenticated;
grant select on public.platform_help_articles to authenticated;

-- Published platform instructions are visible to signed-in users, not private
-- learner data. Only a platform admin can read unpublished drafts.
create policy platform_help_read on public.platform_help_articles for select to authenticated
  using (public.current_user_id() is not null
     and (status = 'published' or public.has_role(public.current_user_id(), 'platform_admin')));

comment on table public.platform_help_articles is
  'Owner-managed platform help, never private learner data or religious rulings. Published articles are readable by signed-in users; drafts and archived articles only by platform admins.';

create or replace function public.save_platform_help_article(
  p_id uuid, p_title text, p_body text, p_keywords text, p_status text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := public.current_user_id();
  v_id uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_keywords text := btrim(coalesce(p_keywords, ''));
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'Only a platform admin can manage platform help' using errcode = 'insufficient_privilege';
  end if;
  if length(v_title) not between 3 and 160 or length(v_body) not between 10 and 5000
     or length(v_keywords) > 500 or p_status is null or p_status not in ('draft','published','archived') then
    raise exception 'Check the title, answer, keywords and status' using errcode = 'check_violation';
  end if;
  if p_id is null then
    insert into public.platform_help_articles(title, body, keywords, status, updated_by)
    values(v_title, v_body, v_keywords, p_status, v_actor) returning id into v_id;
  else
    update public.platform_help_articles set title=v_title, body=v_body, keywords=v_keywords,
      status=p_status, updated_by=v_actor, updated_at=now()
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'Help article not found' using errcode='no_data_found'; end if;
  end if;
  insert into public.governance_audit_events(actor, action, target_type, target_id, detail)
  values(v_actor, 'platform_help.saved', 'platform_help_article', v_id, jsonb_build_object('status',p_status));
  return v_id;
end;
$$;
revoke all on function public.save_platform_help_article(uuid,text,text,text,text) from public, anon;
grant execute on function public.save_platform_help_article(uuid,text,text,text,text) to authenticated;

-- The initial articles describe routes and controls, not promises that optional
-- switches are on. An owner can correct or retire them visually.
insert into public.platform_help_articles(title,body,keywords,status) values
('Where do I find my courses?', 'Open Learning to find your enrolled courses and continue your lessons. If you cannot find a course you expected, contact support when it is open.', 'courses lessons enrolment learning student', 'published'),
('How do I manage a course I teach?', 'Open Teaching and select your course to work on its versions, lessons and assessments. Some tools are available only when the owner has enabled them.', 'teacher author course lessons quiz assessment', 'published'),
('How do I get help?', 'On this Help page, you can search published platform help. If support is open, you can also send a request and see your existing requests here.', 'support help contact question', 'published');
