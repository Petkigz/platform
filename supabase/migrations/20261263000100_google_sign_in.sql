-- ---------------------------------------------------------------------------
-- Signing in with Google.
--
-- The flow itself is Supabase Auth's: the browser goes to Google, Google
-- returns a code to Supabase, Supabase returns a session. So there is no
-- password to hash here and no token to mint — what the platform owes this is
-- four things it does not get for free:
--
--   1. a flag, because a provider that is not configured yet must not show a
--      button that cannot work;
--   2. a profile name that is a person's name rather than the local part of
--      their email, since Google is the one party in this flow that knows it;
--   3. a truthful answer to "how do I sign in here", so somebody who arrived
--      through Google is not offered a password form that will not work;
--   4. nothing else. A Google user is an ordinary user — same profiles, same
--      roles, same everything.
--
-- The account this creates is not special. Teaching is still an appointment and
-- every role is still granted by a person.
-- ---------------------------------------------------------------------------

insert into public.platform_settings
  (key, value_type, value_text, description, gate_type, preconditions, flag_group)
values
  ('auth.google_sign_in', 'boolean', 'false',
   'Offer "Continue with Google" on sign-in and sign-up. Off until a Google OAuth client and the Supabase provider exist, because a button that cannot work is worse than no button.',
   'admin_setup',
   'A Google OAuth client exists; https://<project>.supabase.co/auth/v1/callback is registered as a redirect URI; the Supabase Google provider is enabled with its client id and secret; the site URL and any extra redirect URLs include this deployment.',
   'Accounts')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- A name Google already knows
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
  v_email := new.email;
  v_phone := new.phone;

  -- An OAuth sign-up carries the provider's claims. `full_name` is what Google
  -- sends; `name` is the same claim under its shorter key and other providers
  -- use it. Both are read, because guessing which provider is a detail that
  -- would rot.
  v_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name')), '');

  -- A claim is not a verified fact about a person, but it is the name they use
  -- and it is what they expect to see. Cap it so a hostile claim cannot write a
  -- kilobyte into every screen that greets them.
  if v_name is not null then
    v_name := left(v_name, 80);
  end if;

  -- display_name is NOT NULL with a non-blank CHECK, so something has to be
  -- chosen. Derive it, in preference order, and never emit a blank.
  if v_name is null then
    if v_email is not null and trim(v_email) <> '' then
      v_name := split_part(v_email, '@', 1);
    elsif v_phone is not null and trim(v_phone) <> '' then
      v_name := trim(v_phone);
    else
      v_name := 'Member ' || left(new.id::text, 8);
    end if;
  end if;

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
  'Creates the user_profiles row every other table in the schema depends on, preferring the name an OAuth provider supplied. Idempotent, because auth.users inserts can be retried.';

-- ---------------------------------------------------------------------------
-- How does this person sign in?
-- ---------------------------------------------------------------------------
create or replace function public.my_sign_in_methods()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_providers jsonb := '[]'::jsonb;
  v_row       record;
  v_password  boolean := false;
begin
  if v_actor is null then
    raise exception 'sign in to read your sign-in methods'
      using errcode = 'insufficient_privilege';
  end if;

  -- `auth.identities` is Supabase's table, not ours. A definer function is the
  -- only way an ordinary session can read a row that belongs to it, and it
  -- returns the provider names only — never the identity payload.
  for v_row in
    select distinct i.provider
      from auth.identities i
     where i.user_id = v_actor
     order by i.provider
  loop
    v_providers := v_providers || to_jsonb(v_row.provider);
    if v_row.provider = 'email' then
      v_password := true;
    end if;
  end loop;

  return jsonb_build_object(
    'providers',   v_providers,
    'hasPassword', v_password,
    -- The sentence a screen should show, decided once rather than in three
    -- places: a person who signed up through Google has no password to change.
    'summary', case
      when v_password and v_providers ? 'google' then 'You can sign in with a password or with Google.'
      when v_password then 'You sign in with your email address and a password.'
      when v_providers ? 'google' then 'You sign in with Google. There is no password on this account.'
      when jsonb_array_length(v_providers) = 0 then 'No sign-in method is recorded for this account.'
      else 'You sign in with ' || (select string_agg(value, ', ') from jsonb_array_elements_text(v_providers) value) || '.'
    end
  );
end;
$$;

revoke all on function public.my_sign_in_methods() from public;
grant execute on function public.my_sign_in_methods() to authenticated;

comment on function public.my_sign_in_methods() is
  'The signed-in person''s own sign-in methods, as provider names and a sentence. Reads auth.identities through a definer function so the identity payload is never exposed.';
