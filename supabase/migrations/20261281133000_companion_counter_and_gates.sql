-- The counter is independent of the unimplemented prayer-time, content and
-- calendar features. It has no stored user data and ships off.
insert into public.platform_settings(key,description,value_type,value_text,gate_type,preconditions,flag_group)
values('companion.dhikr_counter','Private session-only counting tool','boolean','false','admin_setup',
  'A simple counter, not a prayer-time service or a prescribed practice. The screen is currently English-only; review translation and accessibility before enabling. Counts stay in page memory and are cleared on reload; a browser may temporarily restore a page when navigating back.', 'Learner features')
on conflict (key) do nothing;

-- These switches do not yet have the described end-to-end implementations.
-- Preserve existing values: operators of an already enabled deployment must
-- review and turn them off. Do not disable or alter the independent counter.
set app.bypassing_code_flag = 'on';
update public.platform_settings set gate_type='code', preconditions=case key
  when 'companion.ayah_daily' then 'Not implemented. Verified text, recordings, translations and tafsir rights and scholarly review are required before deployment. An existing enabled value is preserved and needs operator review.'
  when 'learning.quran_sync' then 'Not implemented. Licensed or generated verse timing data and reviewed audio/text alignment are required before deployment. An existing enabled value is preserved and needs operator review.'
  when 'companion.prayer_tools' then 'Prayer times, qibla and adhkar are not implemented. Location privacy, calculation methods and verified content are required. The session-only counter has its own independent switch. An existing enabled value is preserved and needs operator review.'
  when 'platform.calendar' then 'Not implemented. A Hijri date source, regional calculation choices and reviewed content are required before deployment. An existing enabled value is preserved and needs operator review.'
end where key in ('companion.ayah_daily','learning.quran_sync','companion.prayer_tools','platform.calendar');
reset app.bypassing_code_flag;
