-- The coursework access and concern escalation rules have not yet been fully
-- enforced. Do not offer runtime enablement until that work is deployed.
-- Do not silently turn off a running deployment: its current value is retained.
set app.bypassing_code_flag = 'on';
update public.platform_settings
   set gate_type = 'code',
       preconditions = 'Assignment deadlines are relative to enrolment for self-paced work and absolute for cohorts. Text hand-in, feedback and a per-task revision loop are built. File upload, size checking and gated links exist, but file access does not yet implement the owner''s exact marker, owner, learner and verified-guardian rule on every path. A private owner concern queue and escalation are not complete. No malware scanner is connected; type declarations and a storage size check are not a scan. Retention tombstones exist, but object deletion needs a verified storage process. Keep off until these safeguards are implemented and tested.'
 where key = 'learning.assignments';
update public.platform_settings
   set gate_type = 'code',
       preconditions = 'Cohort screens, opt-in enrolment, private roster and the teacher-set join_closes_at are built. Keep off until the related child coursework access, private owner concern queue, file safety and deletion paths are implemented and tested.'
 where key = 'learning.cohorts';
reset app.bypassing_code_flag;

-- Gate metadata is part of the deployed code, not an editable switch. Without
-- this an admin could demote a CODE gate through a direct table update and then
-- enable it, bypassing the deploy requirement. Value changes retain their
-- existing role checks and the CODE guard; database migrations have no JWT.
create or replace function public.protect_setting_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.current_user_id() is not null
     and (to_jsonb(new) - 'value_text' - 'updated_by' - 'updated_at')
         is distinct from (to_jsonb(old) - 'value_text' - 'updated_by' - 'updated_at') then
    raise exception 'setting metadata is managed by deployments, not runtime changes'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_setting_metadata() from public, anon, authenticated;
drop trigger if exists platform_settings_metadata_guard on public.platform_settings;
create trigger platform_settings_metadata_guard
  before update on public.platform_settings
  for each row execute function public.protect_setting_metadata();
