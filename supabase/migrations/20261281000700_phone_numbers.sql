-- A phone number is one number, in one notation.
--
-- WHAT WAS WRONG
-- --------------
-- The only place aphone number existed was `auth.users.phone`, which is whatever the
-- auth provider stored and nothing else. `user_profiles` had no phone at all, so
-- the product could not show a person their own number, could not correct it,
-- and could not dial one. Any future feature that needed to reach a person by
-- phone — a staff call-back, an SMS the moment a provider exists, a mobile-money
-- prompt — would have had to invent its own parsing, and two parsers are two
-- answers.
--
-- THE RULE
-- --------
-- **One stored notation: E.164.** `+256712345678`. No spaces, no brackets, no
-- national trunk zero, no `00` international prefix. The number a person types
-- is theirs; the number the platform keeps is a single unambiguous string that
-- can be dialled from anywhere and compared without normalising at every use.
--
-- Formatting is a display concern and lives in `web/src/lib/phone.ts`, which
-- turns E.164 back into something a person recognises. Nothing downstream ever
-- has to guess.
--
-- WHY A TABLE OF DIAL CODES RATHER THAN A REGEX
-- ---------------------------------------------
-- A dial code is not derivable from a number and a length. `+1` is twenty-odd
-- countries; `+44` is four; a nine-digit number can be Uganda, Kenya or a dozen
-- others. So the platform holds the list, generated from libphonenumber's
-- metadata by `scripts/generate-phone-data.mjs` (245 countries, dial code and
-- national length range), and refuses a country it does not have rather than
-- guessing at one. A country is added by regenerating, not by typing a digit.
--
-- WHY THE COUNTRY IS STORED BESIDE THE NUMBER
-- -------------------------------------------
-- E.164 does not say which country a number belongs to when the dial code is
-- shared, and the display of a number needs it. `phone_country` is where the
-- person's number is registered, chosen by them when they entered it. It is not
-- their address and it is not their billing country: those are different facts
-- and the platform already stores them separately.

-- ---------------------------------------------------------------------------
-- The dial codes
-- ---------------------------------------------------------------------------
create table public.country_dial_codes (
  country_code char(2) primary key
    check (country_code ~ '^[A-Z]{2}$'),
  dial_code    text not null
    check (dial_code ~ '^\+[1-9][0-9]{0,3}$'),
  national_min smallint not null
    check (national_min between 4 and 15),
  national_max smallint not null
    check (national_max >= national_min and national_max <= 15),
  -- The digit a country writes in front of a national number but never dials:
  -- '0' in Uganda, '1' in the United States, none at all in Italy, where the
  -- leading zero is part of the number. Read from libphonenumber by parsing the
  -- example number written with and without it.
  trunk_prefix char(1)
    check (trunk_prefix is null or trunk_prefix ~ '^[0-9]$'),
  created_at   timestamptz not null default now()
);

comment on table public.country_dial_codes is
  'Generated from libphonenumber-js metadata by scripts/generate-phone-data.mjs. '
  'A country missing here cannot have a phone number stored — the writer refuses '
  'rather than guessing a dial code.';

comment on column public.country_dial_codes.national_min is
  'Digits in the national number, excluding both the dial code and any trunk '
  'prefix. A number outside this range is refused.';

alter table public.country_dial_codes enable row level security;

create policy country_dial_codes_read on public.country_dial_codes
  for select to authenticated using (true);

-- No insert, update or delete policy: the list is reference data seeded by
-- migration. A writable dial-code table would be a way to route a person's
-- number to a country it does not belong to.

insert into public.country_dial_codes
  (country_code, dial_code, national_min, national_max, trunk_prefix) values
  ('AC', '+247', 5, 6, null),
  ('AD', '+376', 6, 9, null),
  ('AE', '+971', 5, 12, '0'),
  ('AF', '+93', 9, 9, '0'),
  ('AG', '+1', 10, 10, '1'),
  ('AI', '+1', 10, 10, '1'),
  ('AL', '+355', 6, 9, '0'),
  ('AM', '+374', 8, 8, '0'),
  ('AO', '+244', 9, 9, null),
  ('AR', '+54', 10, 11, '0'),
  ('AS', '+1', 10, 10, '1'),
  ('AT', '+43', 4, 13, '0'),
  ('AU', '+61', 5, 12, '0'),
  ('AW', '+297', 7, 7, null),
  ('AX', '+358', 5, 12, '0'),
  ('AZ', '+994', 9, 9, '0'),
  ('BA', '+387', 8, 9, '0'),
  ('BB', '+1', 10, 10, '1'),
  ('BD', '+880', 6, 10, '0'),
  ('BE', '+32', 8, 9, '0'),
  ('BF', '+226', 8, 8, null),
  ('BG', '+359', 6, 12, '0'),
  ('BH', '+973', 8, 8, null),
  ('BI', '+257', 8, 8, null),
  ('BJ', '+229', 8, 10, null),
  ('BL', '+590', 9, 9, '0'),
  ('BM', '+1', 10, 10, '1'),
  ('BN', '+673', 7, 7, null),
  ('BO', '+591', 8, 9, '0'),
  ('BQ', '+599', 7, 7, null),
  ('BR', '+55', 8, 11, '0'),
  ('BS', '+1', 10, 10, '1'),
  ('BT', '+975', 7, 8, null),
  ('BW', '+267', 7, 10, null),
  ('BY', '+375', 6, 11, '0'),
  ('BZ', '+501', 7, 11, null),
  ('CA', '+1', 7, 10, '1'),
  ('CC', '+61', 6, 12, '0'),
  ('CD', '+243', 7, 10, '0'),
  ('CF', '+236', 8, 8, null),
  ('CG', '+242', 9, 9, null),
  ('CH', '+41', 9, 12, '0'),
  ('CI', '+225', 10, 10, null),
  ('CK', '+682', 5, 5, null),
  ('CL', '+56', 9, 11, null),
  ('CM', '+237', 8, 9, null),
  ('CN', '+86', 7, 12, '0'),
  ('CO', '+57', 8, 11, null),
  ('CR', '+506', 8, 10, null),
  ('CU', '+53', 6, 10, '0'),
  ('CV', '+238', 7, 7, null),
  ('CW', '+599', 7, 8, null),
  ('CX', '+61', 6, 12, '0'),
  ('CY', '+357', 8, 8, null),
  ('CZ', '+420', 9, 12, null),
  ('DE', '+49', 4, 13, '0'),
  ('DJ', '+253', 8, 8, null),
  ('DK', '+45', 8, 8, null),
  ('DM', '+1', 10, 10, '1'),
  ('DO', '+1', 10, 10, '1'),
  ('DZ', '+213', 8, 9, '0'),
  ('EC', '+593', 8, 11, '0'),
  ('EE', '+372', 7, 10, null),
  ('EG', '+20', 8, 10, '0'),
  ('EH', '+212', 9, 9, '0'),
  ('ER', '+291', 7, 7, '0'),
  ('ES', '+34', 9, 9, null),
  ('ET', '+251', 9, 9, '0'),
  ('FI', '+358', 5, 12, '0'),
  ('FJ', '+679', 7, 11, null),
  ('FK', '+500', 5, 5, null),
  ('FM', '+691', 7, 7, null),
  ('FO', '+298', 6, 6, null),
  ('FR', '+33', 9, 9, '0'),
  ('GA', '+241', 7, 8, null),
  ('GB', '+44', 7, 10, '0'),
  ('GD', '+1', 10, 10, '1'),
  ('GE', '+995', 9, 9, '0'),
  ('GF', '+594', 9, 9, '0'),
  ('GG', '+44', 7, 10, '0'),
  ('GH', '+233', 8, 9, '0'),
  ('GI', '+350', 8, 8, null),
  ('GL', '+299', 6, 6, null),
  ('GM', '+220', 7, 9, null),
  ('GN', '+224', 8, 9, null),
  ('GP', '+590', 9, 9, '0'),
  ('GQ', '+240', 9, 9, null),
  ('GR', '+30', 10, 12, null),
  ('GT', '+502', 8, 11, null),
  ('GU', '+1', 10, 10, '1'),
  ('GW', '+245', 7, 9, null),
  ('GY', '+592', 7, 7, null),
  ('HK', '+852', 5, 11, null),
  ('HN', '+504', 8, 11, null),
  ('HR', '+385', 7, 9, '0'),
  ('HT', '+509', 8, 8, null),
  ('HU', '+36', 8, 9, null),
  ('ID', '+62', 7, 13, '0'),
  ('IE', '+353', 7, 10, '0'),
  ('IL', '+972', 7, 12, '0'),
  ('IM', '+44', 10, 10, '0'),
  ('IN', '+91', 8, 13, '0'),
  ('IO', '+246', 7, 7, null),
  ('IQ', '+964', 8, 10, '0'),
  ('IR', '+98', 4, 10, '0'),
  ('IS', '+354', 7, 9, null),
  ('IT', '+39', 6, 12, null),
  ('JE', '+44', 10, 10, '0'),
  ('JM', '+1', 10, 10, '1'),
  ('JO', '+962', 8, 9, '0'),
  ('JP', '+81', 8, 13, '0'),
  ('KE', '+254', 7, 10, '0'),
  ('KG', '+996', 9, 10, '0'),
  ('KH', '+855', 8, 10, '0'),
  ('KI', '+686', 5, 8, '0'),
  ('KM', '+269', 7, 7, null),
  ('KN', '+1', 10, 10, '1'),
  ('KP', '+850', 8, 10, '0'),
  ('KR', '+82', 5, 13, '0'),
  ('KW', '+965', 7, 8, null),
  ('KY', '+1', 10, 10, '1'),
  ('KZ', '+7', 10, 14, null),
  ('LA', '+856', 8, 10, '0'),
  ('LB', '+961', 7, 8, '0'),
  ('LC', '+1', 10, 10, '1'),
  ('LI', '+423', 7, 9, '0'),
  ('LK', '+94', 9, 9, '0'),
  ('LR', '+231', 7, 9, '0'),
  ('LS', '+266', 8, 8, null),
  ('LT', '+370', 8, 8, '0'),
  ('LU', '+352', 4, 11, null),
  ('LV', '+371', 8, 8, null),
  ('LY', '+218', 9, 9, '0'),
  ('MA', '+212', 9, 9, '0'),
  ('MC', '+377', 8, 9, '0'),
  ('MD', '+373', 8, 8, '0'),
  ('ME', '+382', 8, 9, '0'),
  ('MF', '+590', 9, 9, '0'),
  ('MG', '+261', 9, 9, '0'),
  ('MH', '+692', 7, 7, '1'),
  ('MK', '+389', 8, 8, '0'),
  ('ML', '+223', 8, 8, null),
  ('MM', '+95', 6, 10, '0'),
  ('MN', '+976', 8, 10, '0'),
  ('MO', '+853', 7, 8, null),
  ('MP', '+1', 10, 10, '1'),
  ('MQ', '+596', 9, 9, '0'),
  ('MR', '+222', 8, 8, null),
  ('MS', '+1', 10, 10, '1'),
  ('MT', '+356', 8, 8, null),
  ('MU', '+230', 7, 10, null),
  ('MV', '+960', 7, 10, null),
  ('MW', '+265', 7, 9, '0'),
  ('MX', '+52', 10, 10, null),
  ('MY', '+60', 8, 10, '0'),
  ('MZ', '+258', 8, 9, null),
  ('NA', '+264', 8, 9, '0'),
  ('NC', '+687', 6, 6, null),
  ('NE', '+227', 8, 8, null),
  ('NF', '+672', 6, 6, null),
  ('NG', '+234', 10, 12, '0'),
  ('NI', '+505', 8, 8, null),
  ('NL', '+31', 5, 11, '0'),
  ('NO', '+47', 5, 8, null),
  ('NP', '+977', 8, 11, '0'),
  ('NR', '+674', 7, 7, null),
  ('NU', '+683', 4, 7, null),
  ('NZ', '+64', 5, 10, '0'),
  ('OM', '+968', 7, 9, null),
  ('PA', '+507', 7, 11, null),
  ('PE', '+51', 8, 9, '0'),
  ('PF', '+689', 6, 9, null),
  ('PG', '+675', 7, 8, null),
  ('PH', '+63', 6, 13, '0'),
  ('PK', '+92', 8, 12, '0'),
  ('PL', '+48', 6, 10, null),
  ('PM', '+508', 6, 9, '0'),
  ('PR', '+1', 10, 10, '1'),
  ('PS', '+970', 8, 10, '0'),
  ('PT', '+351', 9, 9, null),
  ('PW', '+680', 7, 7, null),
  ('PY', '+595', 6, 11, '0'),
  ('QA', '+974', 7, 11, null),
  ('RE', '+262', 9, 9, '0'),
  ('RO', '+40', 6, 9, '0'),
  ('RS', '+381', 6, 12, '0'),
  ('RU', '+7', 10, 14, null),
  ('RW', '+250', 8, 9, '0'),
  ('SA', '+966', 9, 10, '0'),
  ('SB', '+677', 5, 7, null),
  ('SC', '+248', 7, 7, null),
  ('SD', '+249', 9, 9, '0'),
  ('SE', '+46', 6, 12, '0'),
  ('SG', '+65', 8, 11, null),
  ('SH', '+290', 4, 5, null),
  ('SI', '+386', 5, 8, '0'),
  ('SJ', '+47', 5, 8, null),
  ('SK', '+421', 6, 9, '0'),
  ('SL', '+232', 8, 8, '0'),
  ('SM', '+378', 8, 10, null),
  ('SN', '+221', 9, 9, null),
  ('SO', '+252', 6, 9, '0'),
  ('SR', '+597', 6, 7, null),
  ('SS', '+211', 9, 9, '0'),
  ('ST', '+239', 7, 7, null),
  ('SV', '+503', 7, 11, null),
  ('SX', '+1', 10, 10, '1'),
  ('SY', '+963', 8, 9, '0'),
  ('SZ', '+268', 8, 9, null),
  ('TA', '+290', 4, 4, null),
  ('TC', '+1', 10, 10, '1'),
  ('TD', '+235', 8, 8, null),
  ('TG', '+228', 8, 8, null),
  ('TH', '+66', 8, 13, '0'),
  ('TJ', '+992', 9, 9, null),
  ('TK', '+690', 4, 7, null),
  ('TL', '+670', 7, 8, null),
  ('TM', '+993', 8, 8, null),
  ('TN', '+216', 8, 8, null),
  ('TO', '+676', 5, 7, null),
  ('TR', '+90', 7, 13, '0'),
  ('TT', '+1', 10, 10, '1'),
  ('TV', '+688', 5, 7, null),
  ('TW', '+886', 7, 11, '0'),
  ('TZ', '+255', 9, 9, '0'),
  ('UA', '+380', 9, 10, '0'),
  ('UG', '+256', 9, 9, '0'),
  ('US', '+1', 10, 10, '1'),
  ('UY', '+598', 4, 12, '0'),
  ('UZ', '+998', 9, 9, null),
  ('VA', '+39', 6, 12, null),
  ('VC', '+1', 10, 10, '1'),
  ('VE', '+58', 10, 10, '0'),
  ('VG', '+1', 10, 10, '1'),
  ('VI', '+1', 10, 10, '1'),
  ('VN', '+84', 7, 10, '0'),
  ('VU', '+678', 5, 7, null),
  ('WF', '+681', 6, 9, null),
  ('WS', '+685', 5, 10, null),
  ('XK', '+383', 8, 12, '0'),
  ('YE', '+967', 7, 9, '0'),
  ('YT', '+262', 9, 9, '0'),
  ('ZA', '+27', 5, 10, '0'),
  ('ZM', '+260', 9, 9, '0'),
  ('ZW', '+263', 7, 10, '0');

-- ---------------------------------------------------------------------------
-- One notation
-- ---------------------------------------------------------------------------
-- Everything the platform stores passes through here, so the rule "E.164 or
-- nothing" is enforced in one place rather than by every caller remembering it.
create or replace function public.normalise_phone_number(
  p_input   text,
  p_country text
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_country text;
  v_dial    text;
  v_code    text;
  v_min     smallint;
  v_max     smallint;
  v_trunk   text;
  v_raw     text;
  v_digits  text;
  v_national text;
begin
  if p_input is null or btrim(p_input) = '' then
    raise exception 'type a phone number' using errcode = 'invalid_parameter_value';
  end if;

  v_country := upper(btrim(coalesce(p_country, '')));
  if v_country = '' then
    raise exception 'choose the country the number is registered in'
      using errcode = 'invalid_parameter_value';
  end if;

  select dial_code, national_min, national_max, trunk_prefix
    into v_dial, v_min, v_max, v_trunk
    from public.country_dial_codes
   where country_code = v_country;

  if v_dial is null then
    raise exception 'this platform has no dial code for % yet, so it cannot store a number from there', v_country
      using errcode = 'invalid_parameter_value';
  end if;
  v_code := substr(v_dial, 2);

  v_raw := btrim(p_input);

  -- A letter in a phone number is a typo or an attempt to smuggle something
  -- through; either way it is not a number.
  if v_raw ~ '[A-Za-z]' then
    raise exception 'a phone number cannot contain letters'
      using errcode = 'invalid_parameter_value';
  end if;

  v_digits := regexp_replace(v_raw, '[^0-9+]', '', 'g');
  if length(v_digits) - length(replace(v_digits, '+', '')) > 1 then
    raise exception 'a phone number has at most one +, and only at the start'
      using errcode = 'invalid_parameter_value';
  end if;
  if position('+' in v_digits) > 1 then
    raise exception 'a phone number has at most one +, and only at the start'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_digits = '' or v_digits = '+' then
    raise exception 'type a phone number, not just punctuation'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A number pasted without its + ('256772123456') is the same number. It is
  -- read as international only when treating it that way produces a number of a
  -- length the country actually has, so the reading can never be wrong: where it
  -- would be, the literal reading below refuses the number instead.
  if left(v_digits, 1) <> '+'
     and left(v_digits, 2) <> '00'
     and left(v_digits, length(v_code)) = v_code
     and length(v_digits) - length(v_code) between v_min and v_max then
    v_digits := '+' || v_digits;
  end if;

  if left(v_digits, 1) = '+' or left(v_digits, 2) = '00' then
    -- Already international. The dial code has to be the chosen country's: a
    -- number that says +44 under a chosen Uganda is one of the two being wrong,
    -- and silently storing it under Uganda would make the display lie.
    v_national := case when left(v_digits, 1) = '+'
                       then substr(v_digits, 2)
                       else substr(v_digits, 3) end;
    if left(v_national, length(v_code)) <> v_code then
      raise exception 'that number is not a % number: it begins %, and a number from there begins %',
        v_country, left(v_digits, length(v_code) + 1), v_dial
        using errcode = 'invalid_parameter_value';
    end if;
    v_national := substr(v_national, length(v_code) + 1);
  else
    v_national := v_digits;
  end if;

  -- The trunk prefix: the digit a country writes in front of a national number
  -- but never dials. '0772…' and '772…' are the same Ugandan number, '+256 (0)
  -- 772…' is the same number again, and Italy's leading zero is not a prefix at
  -- all — `trunk_prefix` is null there, so nothing is stripped. The digit is
  -- dropped once, and only from the front of the national part.
  if v_trunk is not null and left(v_national, 1) = v_trunk then
    v_national := substr(v_national, 2);
  end if;

  if length(v_national) < v_min or length(v_national) > v_max then
    raise exception 'a number from % has % to % digits, and this one has %',
      v_country,
      v_min,
      case when v_min = v_max then v_min::text else v_max::text end,
      length(v_national)
      using errcode = 'invalid_parameter_value';
  end if;

  return v_dial || v_national;
end;
$$;

comment on function public.normalise_phone_number(text, text) is
  'The one place a phone number becomes E.164. Accepts national notation with or '
  'without a trunk prefix, a leading + or 00, and spaces, dashes, dots and '
  'brackets anywhere. Refuses anything else with a sentence saying what is wrong.';

-- ---------------------------------------------------------------------------
-- Where a number lives
-- ---------------------------------------------------------------------------
-- Not on `user_profiles`. That row is read by more of the platform than a
-- contact detail should be — every place that needs a display name — and a phone
-- number is not part of a public profile. One row per person, created the first
-- time they save a number.
create table public.user_contact_details (
  user_id       uuid primary key
                  references auth.users (id) on delete cascade,
  phone_e164    text,
  phone_country char(2)
                  references public.country_dial_codes (country_code),
  updated_at    timestamptz not null default now(),

  -- A number with no country cannot be displayed, and a country with no number
  -- says nothing. They are one fact, so they are null or set together.
  constraint ucd_phone_pair check ((phone_e164 is null) = (phone_country is null)),
  constraint ucd_phone_format check (
    phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{6,14}$'
  )
);

comment on table public.user_contact_details is
  'How to reach a person. Self-read and staff-read only; written only through '
  'set_my_phone()/clear_my_phone(), both of which normalise to E.164 first.';

alter table public.user_contact_details enable row level security;

create policy user_contact_details_read_own on public.user_contact_details
  for select to authenticated
  using (
    user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

-- No insert, update or delete policy. The two writers below are the whole
-- writable surface, which is what makes "E.164 or nothing" a rule rather than a
-- convention: a client cannot insert a row of its own through PostgREST.

create trigger user_contact_details_set_updated_at
  before update on public.user_contact_details
  for each row execute function public.set_updated_at();

-- The writers normalise, and this trigger makes that true of every other writer
-- too — including a future migration or a hand-run statement.
create or replace function public.contact_details_phone_is_canonical()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normal text;
begin
  if new.phone_e164 is null then
    return new;
  end if;
  if new.phone_country is null then
    raise exception 'a phone number is stored with the country it belongs to'
      using errcode = 'check_violation';
  end if;
  v_normal := public.normalise_phone_number(new.phone_e164, new.phone_country);
  if v_normal <> new.phone_e164 then
    raise exception 'a phone number is stored in E.164: % would be stored as %',
      new.phone_e164, v_normal
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger user_contact_details_phone_canonical
  before insert or update of phone_e164, phone_country
  on public.user_contact_details
  for each row execute function public.contact_details_phone_is_canonical();

-- ---------------------------------------------------------------------------
-- The switch, and the two writers
-- ---------------------------------------------------------------------------
-- The feature ships off, like every feature built here. Turning it on is a
-- dashboard switch rather than a deploy, because the whole of it — the table,
-- the normaliser, the form on /account — is what this migration is.
update public.platform_settings
   set gate_type = 'admin',
       description = 'Collect a phone number, stored in E.164 and shown in the country''s own notation.',
       preconditions = 'None. The dial-code table, the normaliser and the form on /account ship with the flag; a number entered without a country on the list is refused rather than guessed. Nothing sends an SMS yet — an SMS provider is still the first external blocker — so this collects a number the platform can reach, and does not message it.'
 where key = 'platform.phone_format';

create or replace function public.my_phone()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.user_contact_details;
begin
  if v_actor is null then
    raise exception 'sign in to read your phone number'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row
    from public.user_contact_details
   where user_id = v_actor;

  return jsonb_build_object(
    'enabled', public.setting_bool('platform.phone_format', false),
    'phoneE164', v_row.phone_e164,
    'phoneCountry', v_row.phone_country,
    'dialCode', (select c.dial_code
                   from public.country_dial_codes c
                  where c.country_code = v_row.phone_country)
  );
end;
$$;

comment on function public.my_phone() is
  'The signed-in person''s own number, with the dial code, and whether the '
  'feature is switched on. A number stored before the switch was turned off is '
  'still returned: hiding it would not remove it.';

create or replace function public.set_my_phone(
  p_phone   text,
  p_country text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_e164  text;
begin
  if v_actor is null then
    raise exception 'sign in to save your phone number'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('platform.phone_format', false) then
    raise exception 'phone numbers are not being collected on this platform yet'
      using errcode = 'feature_not_supported';
  end if;

  v_e164 := public.normalise_phone_number(p_phone, p_country);

  insert into public.user_contact_details (user_id, phone_e164, phone_country)
  values (v_actor, v_e164, upper(btrim(p_country)))
  on conflict (user_id) do update
    set phone_e164    = excluded.phone_e164,
        phone_country = excluded.phone_country;

  return public.my_phone();
end;
$$;

create or replace function public.clear_my_phone()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to change your phone number'
      using errcode = 'insufficient_privilege';
  end if;

  -- Both columns together, because the constraint says they are one fact.
  update public.user_contact_details
     set phone_e164 = null,
         phone_country = null
   where user_id = v_actor;

  return public.my_phone();
end;
$$;

revoke all on function public.normalise_phone_number(text, text) from public;
grant execute on function public.normalise_phone_number(text, text) to authenticated;

revoke all on function public.my_phone() from public;
grant execute on function public.my_phone() to authenticated;

revoke all on function public.set_my_phone(text, text) from public;
grant execute on function public.set_my_phone(text, text) to authenticated;

revoke all on function public.clear_my_phone() from public;
grant execute on function public.clear_my_phone() to authenticated;
