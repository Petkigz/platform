-- Group 1 · seed
-- Idempotent: safe to re-run.

insert into public.institutions (code, name, institution_type, status)
values ('default', 'AyahSpring', 'default', 'active')
on conflict do nothing;

-- Roles from the project record. is_privileged marks the roles guarded by
-- protect_privileged_role_assignment().
insert into public.roles (code, name, description, is_privileged) values
  ('learner',              'Learner',              'Adult learner with their own account.', false),
  ('guardian',             'Guardian',             'Manages child learner profiles they are verified for.', false),
  ('billing_manager',      'Billing manager',      'Handles payment for a family. No automatic access to learning data.', false),
  ('instructor',           'Instructor',           'Authors and publishes courses.', false),
  ('reviewer',             'Reviewer',             'Reviews submitted content within their authorised subjects.', false),
  ('scholarly_panel_member','Scholarly panel member','Votes on panel cases. Deferred — see DECISIONS P6.', false),
  ('support_agent',        'Support agent',        'Handles support cases. Least privilege.', true),
  ('governance_admin',     'Governance admin',     'Content governance, suspension, guardian verification decisions.', true),
  ('finance_admin',        'Finance admin',        'Refunds, reconciliation, payment administration.', true),
  ('platform_admin',       'Platform admin',       'Full administrative access.', true)
on conflict (code) do nothing;
