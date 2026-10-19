-- Public teacher profiles are separate from reviewer_profiles, which contain
-- confidential qualification and conflict data. Only teacher-authored profile
-- text and outbound links are exposed; no credential is implied or surfaced.

update public.platform_settings
   set description='Public teacher page with biography, social links and published courses',
       preconditions='Review profile text and outbound links before enabling; do not imply unverified qualifications.'
 where key='teaching.public_profile';

create table public.instructor_public_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(user_id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  headline text check (headline is null or length(headline) <= 160),
  biography text check (biography is null or length(biography) <= 3000),
  website_url text check (website_url is null or website_url ~ '^https://'),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https://'),
  youtube_url text check (youtube_url is null or youtube_url ~ '^https://'),
  tiktok_url text check (tiktok_url is null or tiktok_url ~ '^https://'),
  facebook_url text check (facebook_url is null or facebook_url ~ '^https://'),
  constraint ipp_instagram_host check (instagram_url is null or instagram_url ~* '^https://([a-z0-9-]+[.])*instagram[.]com(/|$)'),
  constraint ipp_youtube_host check (youtube_url is null or youtube_url ~* '^https://([a-z0-9-]+[.])*(youtube[.]com|youtu[.]be)(/|$)'),
  constraint ipp_tiktok_host check (tiktok_url is null or tiktok_url ~* '^https://([a-z0-9-]+[.])*tiktok[.]com(/|$)'),
  constraint ipp_facebook_host check (facebook_url is null or facebook_url ~* '^https://([a-z0-9-]+[.])*facebook[.]com(/|$)'),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger instructor_public_profiles_updated_at
  before update on public.instructor_public_profiles
  for each row execute function public.set_updated_at();

alter table public.instructor_public_profiles enable row level security;

create policy instructor_public_profiles_read on public.instructor_public_profiles
  for select to anon, authenticated
  using (
    user_id=public.current_user_id()
    or public.is_privileged(public.current_user_id())
    or (
      status='published'
      and public.setting_bool('teaching.public_profile',false)
      and public.has_role(user_id,'instructor')
    )
  );

grant select on public.instructor_public_profiles to anon, authenticated;
revoke insert, update, delete on public.instructor_public_profiles from anon, authenticated;

create or replace function public.save_instructor_public_profile(
  p_slug text,
  p_display_name text,
  p_headline text default null,
  p_biography text default null,
  p_website_url text default null,
  p_instagram_url text default null,
  p_youtube_url text default null,
  p_tiktok_url text default null,
  p_facebook_url text default null,
  p_publish boolean default false
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_profile public.instructor_public_profiles;
  v_id uuid;
begin
  if v_actor is null then raise exception 'sign in to manage your teacher profile' using errcode='insufficient_privilege'; end if;
  if not public.has_role(v_actor,'instructor') then
    raise exception 'an active instructor role is required' using errcode='insufficient_privilege';
  end if;
  if coalesce(btrim(p_slug),'') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'use a lowercase hyphenated profile address' using errcode='invalid_parameter_value';
  end if;
  if coalesce(btrim(p_display_name),'')='' or length(btrim(p_display_name))>120 then
    raise exception 'display name must be between 1 and 120 characters' using errcode='invalid_parameter_value';
  end if;
  if length(coalesce(p_headline,''))>160 or length(coalesce(p_biography,''))>3000 then
    raise exception 'headline or biography is too long' using errcode='string_data_right_truncation';
  end if;
  if exists (
    select 1 from unnest(array[p_website_url,p_instagram_url,p_youtube_url,p_tiktok_url,p_facebook_url]) u
     where nullif(btrim(u),'') is not null and btrim(u) !~ '^https://'
  ) then raise exception 'profile links must use HTTPS' using errcode='invalid_parameter_value'; end if;

  select * into v_profile from public.instructor_public_profiles where user_id=v_actor for update;
  if found then
    update public.instructor_public_profiles set
      slug=btrim(p_slug),display_name=btrim(p_display_name),
      headline=nullif(btrim(coalesce(p_headline,'')),''),
      biography=nullif(btrim(coalesce(p_biography,'')),''),
      website_url=nullif(btrim(coalesce(p_website_url,'')),''),
      instagram_url=nullif(btrim(coalesce(p_instagram_url,'')),''),
      youtube_url=nullif(btrim(coalesce(p_youtube_url,'')),''),
      tiktok_url=nullif(btrim(coalesce(p_tiktok_url,'')),''),
      facebook_url=nullif(btrim(coalesce(p_facebook_url,'')),''),
      status=case when p_publish then 'published' else 'draft' end
      where id=v_profile.id returning id into v_id;
  else
    insert into public.instructor_public_profiles(
      user_id,slug,display_name,headline,biography,website_url,instagram_url,
      youtube_url,tiktok_url,facebook_url,status
    ) values (
      v_actor,btrim(p_slug),btrim(p_display_name),nullif(btrim(coalesce(p_headline,'')),''),
      nullif(btrim(coalesce(p_biography,'')),''),nullif(btrim(coalesce(p_website_url,'')),''),
      nullif(btrim(coalesce(p_instagram_url,'')),''),nullif(btrim(coalesce(p_youtube_url,'')),''),
      nullif(btrim(coalesce(p_tiktok_url,'')),''),nullif(btrim(coalesce(p_facebook_url,'')),''),
      case when p_publish then 'published' else 'draft' end
    ) returning id into v_id;
  end if;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'instructor_profile.saved','instructor_public_profile',v_id,
    jsonb_build_object('slug',btrim(p_slug),'status',case when p_publish then 'published' else 'draft' end));
  return v_id;
end;
$$;
revoke all on function public.save_instructor_public_profile(text,text,text,text,text,text,text,text,text,boolean) from public;
grant execute on function public.save_instructor_public_profile(text,text,text,text,text,text,text,text,text,boolean) to authenticated;

comment on table public.instructor_public_profiles is
  'Public-facing instructor-authored biography and social links. Separate from confidential reviewer qualifications; does not assert verified credentials.';
