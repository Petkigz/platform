-- A labelled date display is independent of the unimplemented calendar suite.
insert into public.platform_settings(key,description,value_type,value_text,gate_type,preconditions,flag_group)
values('companion.hijri_date','Calculated Hijri date display','boolean','false','admin_setup',
 'Browser-calculated Umm al-Qura civil date only, not local sighting or a religious ruling. Midnight rollover, not sunset. Browser calendar data can vary or be unavailable. English-only; review accessibility, translation and hosted browser behaviour before enabling.', 'Learner features')
on conflict (key) do nothing;
