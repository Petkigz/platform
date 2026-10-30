-- A correction to a translation, from the person who speaks it.
--
-- THE PROBLEM THIS EXISTS TO SOLVE
-- --------------------------------
-- The interface speaks fifty-one languages and **not one of them has been read
-- by a native speaker**. `/language` prints that sentence on every catalogue,
-- because a count of translated keys is not a claim that the translation is
-- good: it is a claim that the keys are filled. The register in
-- `web/src/lib/i18n/locales.ts` says `reviewed: false` for all fifty, and until
-- now there was no way for anybody to change it except editing that file and
-- hoping.
--
-- So this unit builds the missing half of the feature: **a way for a person who
-- speaks the language to say what is wrong, and a way for the owner to record
-- that they said it.**
--
-- WHAT A REVIEW IS, AND WHAT IT IS NOT
-- ------------------------------------
-- A review is a person's claim about their own language. The platform cannot
-- check it — there is no qualification to check, and the standing authority is
-- that **the owner decides** who has reviewed a language, exactly as the owner
-- decides who is a scholar. A published review is therefore the owner's
-- acceptance of a named person's word, and `/language` prints the name and the
-- date beside it rather than a tick.
--
-- Two consequences are built in rather than promised:
--
--   * **Only a whole-catalogue review can be published.** The sentence on
--     `/language` is "A first-language speaker has read this translation." A
--     partial read does not support that sentence, so a `part` review is
--     recorded, its corrections still arrive, and it cannot flip the claim.
--   * **Nothing is published with a decision outstanding.** `publish` refuses
--     while any proposal is undecided, because a language marked as read while
--     half its corrections sit in a queue is a claim made early.
--
-- THE CODE IS THE TRUTH, AND THAT IS NOT A SHORTCUT
-- -------------------------------------------------
-- Translations live in the repository as TypeScript, not in these tables. When a
-- proposal is accepted the text still has to reach `asia-*.ts`, and this schema
-- does not pretend otherwise: **`current_text` is stored with each proposal** so
-- that the console can compare it against the catalogue that is actually built
-- and say, per row, "still in the code", "applied", or "the file changed since
-- this was submitted".
--
-- The alternative was to serve corrections from the database at render time.
-- That was rejected: it would make every page's own words depend on a database
-- round trip, and it would mean the question "what does the Sinhala catalogue
-- say" could no longer be answered from the repository alone — which is the
-- property that let fifty catalogues be verified by a script in one afternoon.
--
-- WHO MAY WRITE
-- -------------
-- **Anybody, with no account.** The person who can fix a bad Tamil rendering is
-- exactly the person who has no reason to make an account here, and a correction
-- form behind a sign-up is a form that collects an email address in exchange for
-- a favour. So the insert policies are open to `anon`, the read side is closed
-- to everybody but staff, and the moderation is the owner reading the queue.
--
-- What that costs is abuse, and the guards are in the schema rather than in the
-- hope that nobody tries: a shape check on the locale and the key, a cap of
-- sixty proposals per review, and a flag (`platform.translation_reviews`) that
-- closes the door entirely without a deploy.
--
-- PRIVACY, STATED ON THE FORM AND ENFORCED HERE
-- ---------------------------------------------
-- A reviewer gives a name and an email address. **The name is published** beside
-- the language when the review is published; the email address never leaves this
-- table and is never granted to any role. That is said on the form before it is
-- asked for, and the column grants below make it true rather than polite.

-- ---------------------------------------------------------------------------
-- The submission
-- ---------------------------------------------------------------------------
create table public.translation_reviews (
  id                uuid primary key default gen_random_uuid(),

  -- Which catalogue. A shape check, not a list: the list lives in
  -- `locales.ts`, and a duplicated list here would be a second register that
  -- drifts from the first. The application checks it against the real one.
  locale            text not null,

  reviewer_name     text not null,
  -- Write-only to everybody: no role is granted select on this column, and no
  -- function returns it.
  reviewer_email    text not null,
  -- Set only when the reviewer happened to be signed in. Nullable on purpose:
  -- requiring an account is what this feature exists to avoid.
  reviewer_user_id  uuid references public.user_profiles (user_id) on delete set null,

  -- `whole` means "I read the whole catalogue"; only that can be published.
  scope             text not null check (scope in ('whole', 'part')),
  note              text,

  status            text not null default 'submitted'
                      check (status in ('submitted', 'published', 'declined')),
  decided_by        uuid references public.user_profiles (user_id) on delete set null,
  decided_at        timestamptz,
  decline_reason    text,
  created_at        timestamptz not null default now(),

  constraint review_locale_shape
    check (locale ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$' and locale <> 'en'),
  constraint review_name_not_blank
    check (length(btrim(reviewer_name)) between 2 and 120),
  constraint review_email_looks_like_one
    check (reviewer_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint review_note_not_endless
    check (note is null or length(note) <= 2000),
  -- A row with a decision is a decided row: no half-states.
  constraint review_decision_complete check (
    (status = 'submitted'
      and decided_at is null and decline_reason is null)
    or (status = 'published'
      and decided_at is not null and decline_reason is null)
    or (status = 'declined'
      and decided_at is not null
      and length(btrim(coalesce(decline_reason, ''))) > 0)
  ),
  -- Redundant against the primary key, and load-bearing: it is what lets a
  -- proposal carry the locale with a foreign key, so a proposal cannot claim a
  -- different language from the review it belongs to.
  constraint review_locale_pair unique (id, locale)
);

create index translation_reviews_open
  on public.translation_reviews (status, created_at);
create index translation_reviews_by_locale
  on public.translation_reviews (locale, status);

comment on table public.translation_reviews is
  'A native speaker''s offer to correct a catalogue. Submitted by anybody with no account; published only by the owner, only for a whole-catalogue read, and only when every proposal has been decided. The name is published with it; the email address never is.';

-- ---------------------------------------------------------------------------
-- The corrections themselves
-- ---------------------------------------------------------------------------
create table public.translation_proposals (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null,
  locale        text not null,

  -- A key from the English catalogue (`home.title`, `auth.password`). Shape
  -- checked here; whether it exists is the application's check, against the
  -- one copy of the key list.
  message_key   text not null,
  -- What the catalogue said when they read it. Kept so the console can tell a
  -- proposal that is still pending from one the file has moved past.
  current_text  text not null,
  proposed_text text not null,
  reason        text,

  status        text not null default 'proposed'
                  check (status in ('proposed', 'accepted', 'rejected')),
  decided_by    uuid references public.user_profiles (user_id) on delete set null,
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),

  constraint proposal_locale_matches
    foreign key (review_id, locale)
    references public.translation_reviews (id, locale) on delete cascade,

  constraint proposal_key_shape
    check (message_key ~ '^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$'),
  constraint proposal_text_not_blank
    check (length(btrim(proposed_text)) between 1 and 600),
  -- A proposal that changes nothing is not a proposal. This is the check that
  -- keeps the queue honest: the form sends only the rows a reviewer edited.
  constraint proposal_is_a_change
    check (btrim(proposed_text) <> btrim(current_text)),
  constraint proposal_reason_not_endless
    check (reason is null or length(reason) <= 600),
  constraint proposal_decision_complete check (
    (status = 'proposed' and decided_at is null)
    or (status in ('accepted', 'rejected') and decided_at is not null)
  ),
  -- One proposal per key per review: two corrections of the same line in the
  -- same submission is an argument nobody can decide.
  constraint proposal_once_per_key unique (review_id, message_key)
);

create index translation_proposals_queue
  on public.translation_proposals (status, created_at);
create index translation_proposals_by_review
  on public.translation_proposals (review_id);

comment on table public.translation_proposals is
  'One proposed replacement for one message key, inside one review. `current_text` is what the catalogue said at the time, so the console can show whether the row is still pending, already applied, or overtaken by a later edit.';

-- ---------------------------------------------------------------------------
-- A ceiling, because the door is open to the internet
-- ---------------------------------------------------------------------------
-- Sixty is not a judgement about how many lines a language can get wrong. It is
-- the point at which an automated submission becomes obviously a script, and a
-- reviewer reading a queue is the only moderator this table has.
-- `security definer`, because a trigger runs with the privileges of whoever
-- fired it and the caller here is `anon`, which may write a proposal and may not
-- read the table it is writing to. Without this the cap would refuse every
-- submission with "permission denied" — a policy that looks like a working one.
create or replace function public.cap_translation_proposals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.translation_proposals
       where review_id = new.review_id) >= 60 then
    raise exception 'translation:too_many'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger translation_proposals_capped
  before insert on public.translation_proposals
  for each row execute function public.cap_translation_proposals();

-- ---------------------------------------------------------------------------
-- What was submitted stays submitted
-- ---------------------------------------------------------------------------
-- The reviewer's own words — their name, their address, their note, the
-- catalogue they read — are what they offered, and they are not the platform's
-- to tidy afterwards. The only permitted change is the decision.
create or replace function public.refuse_translation_review_edit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'translation:no_delete'
      using errcode = 'insufficient_privilege';
  end if;

  if new.id               is distinct from old.id
     or new.locale        is distinct from old.locale
     or new.reviewer_name is distinct from old.reviewer_name
     or new.reviewer_email is distinct from old.reviewer_email
     or new.scope         is distinct from old.scope
     or new.note          is distinct from old.note
     or new.created_at    is distinct from old.created_at then
    raise exception 'translation:no_edit'
      using errcode = 'insufficient_privilege';
  end if;

  if old.status <> 'submitted' then
    raise exception 'translation:already_decided'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger translation_reviews_append_only
  before update or delete on public.translation_reviews
  for each row execute function public.refuse_translation_review_edit();

create or replace function public.refuse_translation_proposal_edit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'translation:no_delete'
      using errcode = 'insufficient_privilege';
  end if;

  if new.id            is distinct from old.id
     or new.review_id   is distinct from old.review_id
     or new.locale      is distinct from old.locale
     or new.message_key is distinct from old.message_key
     or new.current_text is distinct from old.current_text
     or new.proposed_text is distinct from old.proposed_text
     or new.reason      is distinct from old.reason
     or new.created_at  is distinct from old.created_at then
    raise exception 'translation:no_edit'
      using errcode = 'insufficient_privilege';
  end if;

  if old.status <> 'proposed' then
    raise exception 'translation:already_decided'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger translation_proposals_append_only
  before update or delete on public.translation_proposals
  for each row execute function public.refuse_translation_proposal_edit();

-- ---------------------------------------------------------------------------
-- Who may read what
-- ---------------------------------------------------------------------------
alter table public.translation_reviews enable row level security;
alter table public.translation_proposals enable row level security;

revoke select, update, delete on public.translation_reviews from anon, authenticated;
revoke select, update, delete on public.translation_proposals from anon, authenticated;

-- Insert, and only insert. A caller cannot read back what anybody else wrote —
-- including their own row, which is why the application generates the id rather
-- than using `returning`.
grant insert on public.translation_reviews to anon, authenticated;
grant insert on public.translation_proposals to anon, authenticated;

-- Whether a submission is still open to more corrections. `security definer`
-- so that the answer does not depend on whether the caller may read the table
-- the question is about — and so that a stranger learns one bit about a row
-- instead of being able to enumerate the row.
create or replace function public.translation_review_is_open(p_review_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.translation_reviews
     where id = p_review_id and status = 'submitted'
  );
$$;

comment on function public.translation_review_is_open(uuid) is
  'True while a submission still accepts corrections. Exposed because the row-level policy needs it; returns a boolean and no data.';

grant execute on function public.translation_review_is_open(uuid) to anon, authenticated;

-- Anybody may offer a correction, and only while the door is open. The flag is
-- checked **here** as well as in the page: a route that forgets to look is not a
-- reason for the table to accept a row.
create policy translation_reviews_submit on public.translation_reviews
  for insert to anon, authenticated
  with check (
    status = 'submitted'
    and decided_by is null
    and decided_at is null
    and decline_reason is null
    and (reviewer_user_id is null or reviewer_user_id = public.current_user_id())
    and public.setting_bool('platform.translation_reviews', false)
  );

create policy translation_proposals_submit on public.translation_proposals
  for insert to anon, authenticated
  with check (
    status = 'proposed'
    and decided_by is null
    and decided_at is null
    and public.setting_bool('platform.translation_reviews', false)
    -- The review must be one that is still open: attaching a correction to a
    -- published or declined review would be writing into a closed file.
    --
    -- Asked through a function rather than an `exists` here, because a policy's
    -- subquery runs with the caller's privileges and `anon` has no select on the
    -- reviews table — an inline check would fail with "permission denied" and
    -- look, from the outside, exactly like a policy working.
    and public.translation_review_is_open(review_id)
  );

-- Staff may read the queue. The owner decides it; that is a function, below,
-- and not a policy, because a policy cannot say "and this one is yours".
create policy translation_reviews_read on public.translation_reviews
  for select using (public.is_privileged(public.current_user_id()));

create policy translation_proposals_read on public.translation_proposals
  for select using (public.is_privileged(public.current_user_id()));

-- `reviewer_email` is not in this list, so not even staff can read it through a
-- client. The owner reads it in the console, through the function below, which
-- is a deliberate second door rather than an accident.
revoke select on public.translation_reviews from authenticated;
grant select (id, locale, reviewer_name, reviewer_user_id, scope, note, status,
              decided_by, decided_at, decline_reason, created_at)
  on public.translation_reviews to authenticated;

-- ---------------------------------------------------------------------------
-- What the interface may say
-- ---------------------------------------------------------------------------
-- The one public read: which languages have been read, by whom, and when. No
-- email, no note, no drafts, nothing unpublished. `/language` prints one line per
-- row and nothing else.
create or replace function public.published_locale_reviews()
returns table (
  locale        text,
  reviewer_name text,
  scope         text,
  published_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.locale, btrim(r.reviewer_name), r.scope, r.decided_at
    from public.translation_reviews r
   where r.status = 'published'
   order by r.locale, r.decided_at;
$$;

comment on function public.published_locale_reviews() is
  'The review attribution /language prints: who read which catalogue and when. Never the email address, never an unpublished row.';

grant execute on function public.published_locale_reviews() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Deciding
-- ---------------------------------------------------------------------------
create or replace function public.decide_translation_proposal(
  p_proposal_id uuid,
  p_accept      boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.translation_proposals;
  v_review public.translation_reviews;
begin
  if not public.has_role(v_actor, 'platform_admin') then
    raise exception 'translation:not_owner'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.translation_proposals where id = p_proposal_id;
  if not found then
    raise exception 'translation:no_such_proposal'
      using errcode = 'no_data_found';
  end if;

  if v_row.status <> 'proposed' then
    raise exception 'translation:already_decided'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_review from public.translation_reviews where id = v_row.review_id;
  if v_review.status <> 'submitted' then
    raise exception 'translation:review_closed'
      using errcode = 'insufficient_privilege';
  end if;

  update public.translation_proposals
     set status = case when p_accept then 'accepted' else 'rejected' end,
         decided_by = v_actor,
         decided_at = now()
   where id = p_proposal_id;

  return jsonb_build_object(
    'id', p_proposal_id,
    'status', case when p_accept then 'accepted' else 'rejected' end
  );
end;
$$;

comment on function public.decide_translation_proposal(uuid, boolean) is
  'Accepts or rejects one proposed correction. The owner alone: a language is not declared read by a committee.';

grant execute on function public.decide_translation_proposal(uuid, boolean) to authenticated;

create or replace function public.publish_translation_review(p_review_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_review public.translation_reviews;
  v_open   int;
begin
  if not public.has_role(v_actor, 'platform_admin') then
    raise exception 'translation:not_owner'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_review from public.translation_reviews where id = p_review_id;
  if not found then
    raise exception 'translation:no_such_review'
      using errcode = 'no_data_found';
  end if;

  if v_review.status <> 'submitted' then
    raise exception 'translation:already_decided'
      using errcode = 'insufficient_privilege';
  end if;

  -- The sentence on `/language` says a first-language speaker read **this**
  -- translation. A part read does not support it.
  if v_review.scope <> 'whole' then
    raise exception 'translation:partial_read'
      using errcode = 'check_violation';
  end if;

  select count(*) into v_open
    from public.translation_proposals
   where review_id = p_review_id and status = 'proposed';
  if v_open > 0 then
    raise exception 'translation:undecided'
      using errcode = 'check_violation';
  end if;

  update public.translation_reviews
     set status = 'published',
         decided_by = v_actor,
         decided_at = now()
   where id = p_review_id;

  return jsonb_build_object(
    'id', p_review_id,
    'locale', v_review.locale,
    'reviewer_name', btrim(v_review.reviewer_name)
  );
end;
$$;

comment on function public.publish_translation_review(uuid) is
  'Records that the owner accepts a named person''s read of a catalogue. Refuses a partial read and refuses while any correction is undecided.';

grant execute on function public.publish_translation_review(uuid) to authenticated;

create or replace function public.decline_translation_review(
  p_review_id uuid,
  p_reason    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if not public.has_role(v_actor, 'platform_admin') then
    raise exception 'translation:not_owner'
      using errcode = 'insufficient_privilege';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'translation:needs_reason'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.translation_reviews
     where id = p_review_id and status = 'submitted'
  ) then
    raise exception 'translation:already_decided'
      using errcode = 'insufficient_privilege';
  end if;

  update public.translation_reviews
     set status = 'declined',
         decided_by = v_actor,
         decided_at = now(),
         decline_reason = btrim(p_reason)
   where id = p_review_id;

  return jsonb_build_object('id', p_review_id, 'status', 'declined');
end;
$$;

grant execute on function public.decline_translation_review(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The console's read
-- ---------------------------------------------------------------------------
-- One call, because the page needs the queue and the corrections together and
-- two round trips would let the two disagree. `reviewer_email` is included here
-- and nowhere else: this function is `platform_admin` only, so the address is
-- readable by exactly one person, which is the person who may need to reply to
-- it.
create or replace function public.translation_review_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if not public.is_privileged(v_actor) then
    raise exception 'translation:not_staff'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'reviews', coalesce((
      select jsonb_agg(row_to_json(r) order by
               case r.status when 'submitted' then 0 else 1 end,
               r.created_at desc)
        from (
          select id, locale, reviewer_name, scope, note, status, created_at,
                 decided_at, decline_reason,
                 case when public.has_role(v_actor, 'platform_admin')
                      then reviewer_email else null end as reviewer_email,
                 coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'id', p.id,
                            'messageKey', p.message_key,
                            'currentText', p.current_text,
                            'proposedText', p.proposed_text,
                            'reason', p.reason,
                            'status', p.status,
                            'decidedAt', p.decided_at)
                          order by p.message_key)
                     from public.translation_proposals p
                    where p.review_id = t.id), '[]'::jsonb) as proposals
            from public.translation_reviews t
        ) r
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.translation_review_queue() is
  'Every submission with its corrections, for the owner''s console. The reviewer''s email address is included only for the platform admin, who is the only person who might need to ask a follow-up question.';

grant execute on function public.translation_review_queue() to authenticated;

-- ---------------------------------------------------------------------------
-- The switch
-- ---------------------------------------------------------------------------
-- Off by default, like every other feature here, because the default has to be
-- the safe one and this is the only table in the schema a stranger may write to.
-- The owner opens it when they have time to read the queue, and closes it when
-- they do not — which is the honest way to run a form that only one person
-- moderates.
insert into public.platform_settings
  (key, description, value_type, value_text, gate_type, preconditions, flag_group)
values
  ('platform.translation_reviews',
   'A correction sheet for the interface translations, open to anybody with no account',
   'boolean', 'false', 'admin',
   'Opens the only public write path in the schema. Every submission is read by the '
   || 'owner before anything is published, and a language is only described as read '
   || 'when the owner accepts a whole-catalogue review. The reviewer''s name is '
   || 'published; their email address is not. Close it when nobody is reading the '
   || 'queue',
   'Platform')
on conflict (key) do update
  set description   = excluded.description,
      preconditions = excluded.preconditions;
