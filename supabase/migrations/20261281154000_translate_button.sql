-- A Translate button on what people write.
--
-- The owner, 2026-11-24: staff read English and Arabic, and people write in
-- their own languages. Staff have to be able to read a post, a report or an
-- application in English, and a person has to be able to read an answer in
-- theirs. Asked how an answer should reach somebody, the owner said: the way
-- it works on social media. Everybody writes in their own language, and
-- whoever reads it can press Translate.
--
-- So nothing is translated when it is written, and nothing translated is
-- kept. A reader presses a button; the application sends that text to a
-- machine translation service (Google Cloud Translation, the owner's choice)
-- and shows what comes back under the original, marked as a machine's.
--
-- This reverses an earlier line in DECISIONS.md ("no machine translation at
-- request time"), for writing by people only. The platform's own sentences
-- are still written by hand and are not machine translated.
--
-- What this migration holds is the part the database owns:
--
--   * the switch, `platform.translate`, off;
--   * two numbers the owner controls: how much one person may have
--     translated in a day, and how much everybody together may in a month;
--   * a count of characters by person and day, and nothing else. The text
--     sent and the text returned are never stored here or anywhere.
--
-- `spend_translation()` is asked before each request to the service. It
-- refuses when the switch is off, when the text is longer than one request
-- may be, when the person has used their day, or when the month is used.
-- Staff are not held to a day. Members stop at four fifths of the month, so
-- that moderation does not go blind at the end of a busy month.
--
-- The service's key is a server setting (`GOOGLE_TRANSLATE_API_KEY`), not a
-- row: the database never sees it. What a person wrote leaves the platform
-- when a reader presses the button, and only then. Before the switch is
-- turned on, the privacy policy has to say so and name the service.

-- ---------------------------------------------------------------------------
-- The switch and the two numbers
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, description, value_type, value_text, gate_type, preconditions, flag_group)
values
  ('platform.translate', 'A Translate button on what people write', 'boolean', 'false', 'admin_setup',
   'Set GOOGLE_TRANSLATE_API_KEY on the server first: without it the button is not drawn. Pressing the button sends what somebody wrote, which can be a child''s post, to Google Cloud Translation. Publish a privacy policy version that says so and names the service before switching on. Check Google''s current price and free allowance and set platform.translate_monthly_characters to what you are willing to pay for.',
   'Platform')
on conflict (key) do nothing;

insert into public.platform_settings (key, description, setting_kind, value_type, value_text, gate_type, preconditions)
values
  ('platform.translate_daily_characters',
   'How many characters one person may have translated in a day. Staff are not held to it.',
   'control', 'integer', '20000', 'admin', null),
  ('platform.translate_monthly_characters',
   'How many characters everybody together may have translated in a calendar month. Members stop at four fifths of it; the rest is kept for staff. This is the ceiling on what the translation service can charge for.',
   'control', 'integer', '400000', 'admin', null)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- What was spent: a count, never the words
-- ---------------------------------------------------------------------------
create table public.translation_spend (
  user_id    uuid not null references public.user_profiles (user_id) on delete cascade,
  day        date not null,
  characters integer not null default 0 check (characters >= 0),
  requests   integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);

create index translation_spend_day_idx on public.translation_spend (day);

alter table public.translation_spend enable row level security;
revoke all on table public.translation_spend from public, anon, authenticated;

comment on table public.translation_spend is
  'Characters sent for machine translation, by person and UTC day. A count only: neither the text sent nor the translation is stored anywhere.';

-- The most one request may carry. The application cuts nothing: a longer
-- text is refused, so that a translation is never of half a post.
create or replace function public.translation_request_max()
returns integer
language sql
immutable
as $$ select 5000 $$;

-- ---------------------------------------------------------------------------
-- May this be sent? If so, it is counted.
-- ---------------------------------------------------------------------------
create or replace function public.spend_translation(p_characters integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_staff   boolean;
  v_day     date := (now() at time zone 'utc')::date;
  v_daily   bigint := greatest(public.setting_int('platform.translate_daily_characters', 20000), 0);
  v_monthly bigint := greatest(public.setting_int('platform.translate_monthly_characters', 400000), 0);
  v_mine    bigint;
  v_month   bigint;
begin
  if v_actor is null or not exists (
       select 1 from public.user_profiles p
        where p.user_id = v_actor and p.account_status = 'active' and p.deleted_at is null) then
    raise exception 'translate:not_signed_in' using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('platform.translate', false) then
    raise exception 'translate:closed' using errcode = 'feature_not_supported';
  end if;
  if p_characters is null or p_characters < 1 then
    raise exception 'translate:empty' using errcode = 'check_violation';
  end if;
  if p_characters > public.translation_request_max() then
    raise exception 'translate:too_long' using errcode = 'check_violation';
  end if;

  v_staff := public.is_privileged(v_actor);

  -- One at a time, so that two requests cannot both fit under the ceiling.
  perform pg_advisory_xact_lock(hashtext('translate:spend'));

  select coalesce(sum(s.characters), 0) into v_month
    from public.translation_spend s
   where s.day >= date_trunc('month', v_day)::date;
  if v_month + p_characters > (case when v_staff then v_monthly else (v_monthly * 4) / 5 end) then
    raise exception 'translate:month_spent' using errcode = 'program_limit_exceeded';
  end if;

  select s.characters into v_mine
    from public.translation_spend s
   where s.user_id = v_actor and s.day = v_day;
  if not v_staff and coalesce(v_mine, 0) + p_characters > v_daily then
    raise exception 'translate:too_many' using errcode = 'program_limit_exceeded';
  end if;

  -- Counted before the service is asked. A request that then fails stays
  -- counted: the other way round, a failure would be a way to ask for free.
  insert into public.translation_spend (user_id, day, characters, requests)
  values (v_actor, v_day, p_characters, 1)
  on conflict (user_id, day) do update
    set characters = public.translation_spend.characters + excluded.characters,
        requests   = public.translation_spend.requests + 1;

  return jsonb_build_object('spent', p_characters);
end;
$$;

comment on function public.spend_translation(integer) is
  'Asked before a text is sent for machine translation: refuses when the switch is off, the text is too long, the caller has used their day (staff have none) or the month is used (members at four fifths), and otherwise counts the characters. Stores no text.';

-- ---------------------------------------------------------------------------
-- What the month has used, for the owner
-- ---------------------------------------------------------------------------
create or replace function public.translation_month()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_first date := date_trunc('month', (now() at time zone 'utc'))::date;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'translate:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'on', public.setting_bool('platform.translate', false),
    'monthStarts', v_first,
    'characters', (select coalesce(sum(s.characters), 0) from public.translation_spend s where s.day >= v_first),
    'requests',   (select coalesce(sum(s.requests), 0)   from public.translation_spend s where s.day >= v_first),
    'people',     (select count(distinct s.user_id)      from public.translation_spend s where s.day >= v_first),
    'monthly',    greatest(public.setting_int('platform.translate_monthly_characters', 400000), 0),
    'daily',      greatest(public.setting_int('platform.translate_daily_characters', 20000), 0));
end;
$$;

comment on function public.translation_month() is
  'For staff: how many characters were sent for machine translation this calendar month, by how many people, against the two limits.';

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
revoke all on function public.translation_request_max() from public, anon;
revoke all on function public.spend_translation(integer) from public, anon;
revoke all on function public.translation_month() from public, anon;
grant execute on function public.translation_request_max() to authenticated;
grant execute on function public.spend_translation(integer) to authenticated;
grant execute on function public.translation_month() to authenticated;
