-- The message surface: what the platform would send, recorded before it can.
--
-- `delivery.notifications` ships off and there is no provider. Three built or
-- decided things are waiting on one — invitations to an address with no
-- account, purchase receipts, and the guardian correspondence that today is
-- read in a dashboard — and none of them can be finished honestly by pretending
-- a message left the building.
--
-- So this is the preparation, not the feature. `queue_message()` renders a
-- named template and writes a row to `outbound_messages`; nothing sends, no
-- provider is configured, and `provider` stays null. When a provider exists,
-- the dispatcher reads this table and moves rows from `queued` to `sent` or
-- `failed` — the call sites do not change, and no caller ever talks to a
-- vendor directly.
--
-- The templates live in the database rather than in TypeScript because they are
-- the copy a person reads about money and invitations, and changing a sentence
-- should not need a deploy. A template with an unfilled placeholder is refused
-- rather than sent with `{{amount}}` in it: a receipt that says `{{amount}}` is
-- worse than no receipt.

-- ---------------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------------
create table public.message_templates (
  code text primary key,

  channel text not null
    check (channel in ('email', 'sms')),

  purpose text not null
    check (purpose in ('invite', 'receipt', 'guardian', 'support', 'account')),

  subject_template text,
  body_template text not null,

  description text not null,

  created_at timestamptz not null default now(),

  -- An SMS has no subject, and an email without one is a deliverability
  -- problem rather than a style choice.
  constraint mt_subject_matches_channel check (
    (channel = 'email') = (subject_template is not null)
  )
);

comment on table public.message_templates is
  'Named copy, rendered by queue_message(). Editing a sentence is a data change, not a deploy.';
comment on column public.message_templates.body_template is
  'Placeholders are {{key}} and must all be supplied by the caller; an unfilled one is refused.';

insert into public.message_templates
  (code, channel, purpose, subject_template, body_template, description)
values
  ('receipt_email', 'email', 'receipt',
   'Your AyahSpring receipt {{reference}}',
   E'Assalamu alaikum {{name}},\n\nWe have received {{amount}} for {{course}}. Your receipt reference is {{reference}}.\n\nYou can see the order in your account at any time.\n\nAyahSpring',
   'Sent when a payment is confirmed. Amount and reference come from the order, never from the browser.'),
  ('invite_email', 'email', 'invite',
   '{{inviter}} invited you to AyahSpring',
   E'Assalamu alaikum,\n\n{{inviter}} has invited you to {{resource}} on AyahSpring.\n\nOpen the invitation: {{url}}\n\nIt expires on {{expires}}. If you were not expecting this, you can ignore this message.',
   'Sent when somebody shares with an address that has no account. Says nothing about whether one exists.');

-- ---------------------------------------------------------------------------
-- The outbox
-- ---------------------------------------------------------------------------
create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),

  channel text not null
    check (channel in ('email', 'sms')),

  template_code text not null
    references public.message_templates (code) on delete restrict,

  purpose text not null
    check (purpose in ('invite', 'receipt', 'guardian', 'support', 'account')),

  -- The address as the sender typed or the order recorded it. Deliberately not
  -- a foreign key to a profile: a receipt has to survive the account, and a
  -- message to an address with no account has no profile to point at.
  to_address text not null
    check (length(btrim(to_address)) between 3 and 320),

  subject text,
  body text not null,
  payload jsonb not null default '{}'::jsonb,

  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'suppressed')),

  provider text,
  provider_reference text,
  attempts integer not null default 0
    check (attempts >= 0),
  last_error text,

  created_by uuid references public.user_profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,

  -- `sent` is a claim about the world, so it needs the two things that make it
  -- checkable: a provider and a time.
  constraint om_sent_agrees check (
    (status = 'sent') = (sent_at is not null)
  ),
  constraint om_sent_has_provider check (
    status <> 'sent' or provider is not null
  ),
  constraint om_failure_has_reason check (
    status <> 'failed' or last_error is not null
  ),
  constraint om_body_not_blank check (length(btrim(body)) > 0)
);

create index outbound_messages_status_idx
  on public.outbound_messages (status, created_at);
create index outbound_messages_created_idx
  on public.outbound_messages (created_at desc);

comment on table public.outbound_messages is
  'What the platform would send. Nothing here has left the building until a provider moves a row to sent.';
comment on column public.outbound_messages.to_address is
  'Not a foreign key: a receipt must survive the account, and an invite may be to an address with no account.';

create trigger outbound_messages_set_updated_at
  before insert or update on public.outbound_messages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Queueing
-- ---------------------------------------------------------------------------
create or replace function public.queue_message(
  p_channel       text,
  p_template_code text,
  p_to            text,
  p_purpose       text,
  p_data          jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_template public.message_templates;
  v_subject  text;
  v_body     text;
  v_key      text;
  v_value    text;
  v_missing  text;
  v_id       uuid;
begin
  -- A signed-in caller must be staff. The system paths (a confirmed payment, a
  -- guardian notice) call this with no actor, which is how they get through.
  if v_actor is not null and not public.is_privileged(v_actor) then
    raise exception 'only staff or the platform may queue a message'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_template
    from public.message_templates
   where code = p_template_code;
  if not found then
    raise exception 'no message template %', p_template_code
      using errcode = 'no_data_found';
  end if;

  if v_template.channel <> p_channel then
    raise exception 'template % is a % template, not %',
      p_template_code, v_template.channel, p_channel
      using errcode = 'check_violation';
  end if;

  if v_template.purpose <> p_purpose then
    raise exception 'template % is for %, not %',
      p_template_code, v_template.purpose, p_purpose
      using errcode = 'check_violation';
  end if;

  v_subject := v_template.subject_template;
  v_body := v_template.body_template;

  for v_key, v_value in
    select key, value #>> '{}' from jsonb_each(p_data)
  loop
    v_subject := replace(v_subject, '{{' || v_key || '}}', v_value);
    v_body := replace(v_body, '{{' || v_key || '}}', v_value);
  end loop;

  -- Name the placeholder rather than the template: "receipt_email has an
  -- unfilled placeholder" sends somebody to read SQL, "{{amount}}" sends them
  -- to the caller that forgot it.
  v_missing := substring(coalesce(v_subject, '') || ' ' || v_body from '\{\{[a-z_0-9]+\}\}');
  if v_missing is not null then
    raise exception 'template % still has an unfilled placeholder %',
      p_template_code, v_missing
      using errcode = 'check_violation';
  end if;

  insert into public.outbound_messages
    (channel, template_code, purpose, to_address, subject, body, payload, created_by)
  values
    (p_channel, p_template_code, p_purpose, btrim(p_to),
     nullif(btrim(coalesce(v_subject, '')), ''), v_body, p_data, v_actor)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.queue_message(text,text,text,text,jsonb) is
  'Renders a named template into the outbox. Sending is a separate, provider-dependent step that does not exist yet.';

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
alter table public.message_templates  enable row level security;
alter table public.outbound_messages  enable row level security;

-- Staff read both. There is deliberately no client write policy: rows enter
-- through queue_message() (definer) and only a dispatcher may change a status,
-- which is not built and will be service-only when it is.
create policy message_templates_read on public.message_templates
  for select using (public.is_privileged(public.current_user_id()));

create policy outbound_messages_read on public.outbound_messages
  for select using (public.is_privileged(public.current_user_id()));

revoke all on public.message_templates  from public, anon;
revoke all on public.outbound_messages  from public, anon;
grant select on public.message_templates to authenticated;
grant select on public.outbound_messages to authenticated;

revoke execute on function public.queue_message(text,text,text,text,jsonb) from public, anon;
grant  execute on function public.queue_message(text,text,text,text,jsonb) to authenticated;
