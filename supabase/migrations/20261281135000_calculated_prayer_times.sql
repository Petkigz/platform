-- The calculated prayer-time preview is separate from the unbuilt prayer suite.
insert into public.platform_settings(key,description,value_type,value_text,gate_type,preconditions,flag_group)
values('companion.calculated_prayer_times','Calculated prayer times','boolean','false','admin_setup',
 'On-device location and calculations only. Requires local religious review, verified regional guidance, time-zone and high-latitude testing, translation, accessibility and hosted browser review before enabling. Calculations may differ from local timetables. The separate prayer tools switch remains code-gated.', 'Learner features')
on conflict (key) do nothing;
