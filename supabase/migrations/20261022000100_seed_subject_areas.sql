-- Seed the subject taxonomy.
--
-- The roadmap flagged the catalogue as blocked on `subject_areas` being
-- populated. These are the classical disciplines, arranged as a two-level
-- tree: a discipline and its common subdivisions. Two levels is deliberate —
-- a deeper tree makes the catalogue filter unusable on a phone, which is
-- where most of the audience will be.
--
-- Idempotent. Safe to re-run.

insert into public.subject_areas (code, name, parent_subject_id) values
  ('quran',        'Qur''an',        null),
  ('arabic',       'Arabic',         null),
  ('aqeedah',      'Aqeedah',        null),
  ('fiqh',         'Fiqh',           null),
  ('hadith',       'Hadith',         null),
  ('seerah',       'Seerah',         null),
  ('history',      'Islamic History',null),
  ('akhlaq',       'Akhlaq',         null),
  ('worship',      'Worship & Du''a',null)
on conflict (code) where deleted_at is null do nothing;

-- Subdivisions. Looked up by parent code so this stays idempotent and does not
-- depend on generated ids.
insert into public.subject_areas (code, name, parent_subject_id)
select v.code, v.name, p.id
  from (values
    ('quran.tajweed',  'Recitation & Tajweed', 'quran'),
    ('quran.hifz',     'Hifz (Memorisation)',  'quran'),
    ('quran.tafsir',   'Tafsir',               'quran'),
    ('quran.translation','Translation & Meaning','quran'),

    ('arabic.grammar', 'Grammar (Nahw)',       'arabic'),
    ('arabic.morphology','Morphology (Sarf)',  'arabic'),
    ('arabic.reading', 'Reading & Script',     'arabic'),
    ('arabic.conversation','Conversation',     'arabic'),

    ('aqeedah.pillars','Pillars of Faith',     'aqeedah'),
    ('aqeedah.names',  'Names & Attributes',   'aqeedah'),

    ('fiqh.purification','Purification (Taharah)','fiqh'),
    ('fiqh.prayer',    'Prayer (Salah)',        'fiqh'),
    ('fiqh.fasting',   'Fasting (Sawm)',        'fiqh'),
    ('fiqh.zakat',     'Zakat',                 'fiqh'),
    ('fiqh.hajj',      'Hajj & Umrah',          'fiqh'),
    ('fiqh.transactions','Transactions (Mu''amalat)','fiqh'),

    ('hadith.collections','Hadith Collections', 'hadith'),
    ('hadith.terminology','Terminology (Mustalah)','hadith'),

    ('seerah.life',    'Life of the Prophet ﷺ',  'seerah'),
    ('seerah.companions','The Companions',       'seerah'),

    ('history.caliphates','The Caliphates',     'history'),
    ('history.scholars','Scholars & Schools',   'history'),

    ('akhlaq.character','Character & Manners',  'akhlaq'),
    ('akhlaq.family',  'Family & Community',    'akhlaq'),

    ('worship.dua',    'Du''a & Adhkar',        'worship'),
    ('worship.ramadan','Ramadan',               'worship')
  ) as v(code, name, parent)
  join public.subject_areas p on p.code = v.parent
on conflict (code) where deleted_at is null do nothing;

comment on table public.subject_areas is
  'Catalogue taxonomy. Two levels: discipline, then subdivision. Not a governance construct — reviewer authority lives in reviewer_subject_authorizations.';
