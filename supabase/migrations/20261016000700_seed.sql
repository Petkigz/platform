-- Group 2 · seed
--
-- A starter catalogue taxonomy. Idempotent. Deliberately small: subject areas
-- are discoverability infrastructure and can be extended from the admin
-- dashboard without a migration.

insert into public.subject_areas (code, name) values
  ('quran',         'Qur''an'),
  ('arabic',        'Arabic language'),
  ('aqidah',        'Aqeedah'),
  ('fiqh',          'Fiqh'),
  ('seerah',        'Seerah'),
  ('hadith',        'Hadith'),
  ('akhlaq',        'Akhlaq and adab'),
  ('islamic-history','Islamic history')
on conflict do nothing;

-- Second level, only where the hierarchy genuinely helps a learner browse.
with parent as (
  select id, code from public.subject_areas
   where code in ('quran', 'arabic') and deleted_at is null
)
insert into public.subject_areas (code, name, parent_subject_id)
select child.code, child.name, parent.id
  from parent
  join (values
    ('quran',    'quran.tajweed',   'Tajweed'),
    ('quran',    'quran.hifz',      'Hifz and memorisation'),
    ('quran',    'quran.tafsir',    'Tafsir'),
    ('arabic',   'arabic.grammar',  'Nahw and grammar'),
    ('arabic',   'arabic.reading',  'Reading and script')
  ) as child (parent_code, code, name)
    on child.parent_code = parent.code
on conflict do nothing;
