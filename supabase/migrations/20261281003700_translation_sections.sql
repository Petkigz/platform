-- A part of the interface is a reviewable unit.
--
-- THE PROBLEM THIS EXISTS TO SOLVE
-- --------------------------------
-- The correction sheet could only count in one size: **the whole catalogue**.
-- A hundred and ninety-one lines, one sitting, or nothing. That is a demand
-- nobody has met — the queue is empty, and the sentence on `/language` is still
-- "no first-language speaker has read this" — and the reason is not that people
-- will not read one screen's worth of their own language. It is that the unit was
-- too large to finish, and a review that cannot be finished is a favour nobody
-- completes.
--
-- So a review can now cover **one part** of the catalogue — the navigation, the
-- sign-in screen, the front page. The claim a `section` review makes is narrow
-- and checkable in one sitting: *I read every line of this part.*
--
-- WHAT STILL CANNOT HAPPEN
-- ------------------------
-- The sentence on `/language` is a claim about the **whole** translation, and it
-- is not weakened by this. It appears when every part has a published read, or
-- when one person has published a whole-catalogue read. Three parts out of
-- sixteen is not "read by a first-language speaker", and the database will not
-- let it be recorded as such: publishing a section review records which part it
-- covered, and the page adds up the parts.
--
--   * a `part` review is still unpublishable, whatever it contains;
--   * every correction in a publishable review must be decided;
--   * a correction cannot be attached to a section review about a different
--     part, because a correction filed under the navigation while claiming to be
--     about prices is a row the owner cannot judge without re-reading both.
--
-- WHY A SECTION IS A KEY PREFIX
-- -----------------------------
-- The sections are `nav`, `auth`, `home` and so on — the first segment of the
-- message key — and the list of them lives in `web/src/lib/translations.ts`,
-- derived from the English catalogue rather than written down a second time. To
-- keep that the only copy, this migration stores a **prefix string** and checks
-- its shape; it does not carry its own list of sections. A section that exists in
-- the page but not in the database is impossible; a section in the database that
-- the page does not know is a row the page will show as *unknown part*, which is
-- the honest way round for a column the application writes.

-- ---------------------------------------------------------------------------
-- Which part, if not the whole
-- ---------------------------------------------------------------------------
alter table public.translation_reviews
  add column section text;

comment on column public.translation_reviews.section is
  'The message-key prefix this review covers (`nav`, `auth`, `home`). Null for a whole-catalogue review, and also allowed null on a `part` read, which may cover a part or none of it.';

-- The old `scope` check said ('whole', 'part'); it has to admit 'section'.
-- Dropped by searching for it rather than by name, because a constraint written
-- inline in a `create table` gets a name nobody chose on purpose, and a migration
-- that guesses it wrong fails on a database that was built a slightly different
-- way — this one has to run on every copy of the schema that exists.
do $$
declare
  c text;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.translation_reviews'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%scope%'
  loop
    execute format('alter table public.translation_reviews drop constraint %I', c);
  end loop;
end;
$$;

-- The two columns have to agree, and this is the constraint that says so:
-- a whole-catalogue review covers no part in particular, a section review must
-- name one, and a partial read may do either.
alter table public.translation_reviews
  add constraint review_scope_coherent check (
    (scope = 'whole' and section is null)
    or (scope = 'section' and section is not null)
    or (scope = 'part')
  );

alter table public.translation_reviews
  add constraint review_section_shape check (
    section is null or section ~ '^[a-z][a-zA-Z0-9]*$'
  );

-- What the reviewer said is what they said — including which part they said it
-- about. The original trigger listed every immutable column by name, so the new
-- one has to be added to that list or a review could be moved to a different part
-- after the fact, which would silently re-label a person's claim.
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
     or new.section       is distinct from old.section
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

-- ---------------------------------------------------------------------------
-- A correction belongs to the part it was filed under
-- ---------------------------------------------------------------------------
-- `security definer` for the same reason the cap trigger is: the caller is `anon`,
-- which may write a proposal and may not read the review it is writing against.
-- Without that, the check would fail with "permission denied" and look, from the
-- outside, exactly like a check working.
create or replace function public.check_translation_proposal_section()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_section text;
begin
  select section into v_section
    from public.translation_reviews
   where id = new.review_id;

  if v_section is not null
     and split_part(new.message_key, '.', 1) <> v_section then
    raise exception 'translation:wrong_section'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger translation_proposals_in_section
  before insert on public.translation_proposals
  for each row execute function public.check_translation_proposal_section();

-- ---------------------------------------------------------------------------
-- Publishing: a part, or the whole thing, but never a partial read
-- ---------------------------------------------------------------------------
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
  v_stray  int;
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

  -- A `part` read says, in the reviewer's own submission, that they did not read
  -- all of anything. It cannot support a claim about even one section, so it is
  -- recorded and it never publishes. A `section` review names its part and does.
  if v_review.scope = 'part' or (v_review.scope = 'section' and v_review.section is null) then
    raise exception 'translation:partial_read'
      using errcode = 'check_violation';
  end if;

  -- Defence in depth: the insert trigger already refuses a correction outside the
  -- review's part, and a review that somehow has one cannot be published as a
  -- read of that part.
  if v_review.section is not null then
    select count(*) into v_stray
      from public.translation_proposals
     where review_id = p_review_id
       and split_part(message_key, '.', 1) <> v_review.section;
    if v_stray > 0 then
      raise exception 'translation:wrong_section'
        using errcode = 'check_violation';
    end if;
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
    'section', v_review.section,
    'reviewer_name', btrim(v_review.reviewer_name)
  );
end;
$$;

comment on function public.publish_translation_review(uuid) is
  'Records that the owner accepts a named person''s read of a catalogue or of one part of it. Refuses a partial read and refuses while any correction is undecided.';

-- ---------------------------------------------------------------------------
-- What the interface may say
-- ---------------------------------------------------------------------------
-- The return type changes (a `section` column), so the function is dropped rather
-- than replaced: `create or replace` cannot change a result signature, and a
-- migration that tried would fail on the second run of the schema.
drop function if exists public.published_locale_reviews();

create or replace function public.published_locale_reviews()
returns table (
  locale        text,
  reviewer_name text,
  scope         text,
  section       text,
  published_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.locale, btrim(r.reviewer_name), r.scope, r.section, r.decided_at
    from public.translation_reviews r
   where r.status = 'published'
   order by r.locale, r.decided_at;
$$;

comment on function public.published_locale_reviews() is
  'The review attribution /language prints: who read which catalogue, or which part of it, and when. Never the email address, never an unpublished row. The page adds the parts up; this function does not decide what "read" means.';

grant execute on function public.published_locale_reviews() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The console's read, now carrying the part
-- ---------------------------------------------------------------------------
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
          select id, locale, reviewer_name, scope, section, note, status, created_at,
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
  'Every submission with its corrections and the part it covers, for the owner''s console. The reviewer''s email address is included only for the platform admin, who is the only person who might need to ask a follow-up question.';

grant execute on function public.translation_review_queue() to authenticated;

-- ---------------------------------------------------------------------------
-- The grant, so the console can read the part through a client too
-- ---------------------------------------------------------------------------
revoke select on public.translation_reviews from authenticated;
grant select (id, locale, reviewer_name, reviewer_user_id, scope, section, note, status,
              decided_by, decided_at, decline_reason, created_at)
  on public.translation_reviews to authenticated;

comment on table public.translation_reviews is
  'A native speaker''s offer to correct a catalogue — all of it, or one part. Submitted by anybody with no account; published only by the owner, only with every correction decided, and only for a whole-catalogue or whole-section read. A language is called read when every part has a published review. The name is published with it; the email address never is.';

-- ---------------------------------------------------------------------------
-- The register's own description
-- ---------------------------------------------------------------------------
update public.platform_settings
   set description = 'A correction sheet for the interface translations, open to anybody with no account',
       preconditions =
         'Opens the only public write path in the schema. Every submission is read by the '
         || 'owner before anything is published, and a language is only described as read '
         || 'when every part of its catalogue has a published review — or when one person '
         || 'has published a whole-catalogue read. The reviewer''s name is published; their '
         || 'email address is not. Close it when nobody is reading the queue'
 where key = 'platform.translation_reviews';
