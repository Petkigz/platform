-- Three defects in sitting an assessment, found on 2026-11-17 by sitting one
-- as a learner for the first time. Every earlier test of this table wrote to
-- it as the database owner.
--
-- 1. A learner could write their own mark.
--    `assessment_responses_insert` let a learner insert a row on their own
--    attempt and said nothing about which columns. A response inserted with
--    `score`, `is_correct`, `graded_by` and `graded_at` already filled in was
--    accepted, and `submit_assessment_attempt()` marks only the responses
--    whose `graded_at` is null — so it skipped that one and added the
--    learner's own score to the total. Measured: the wrong answer, a
--    self-written 1 of 1, and the attempt came out graded, 1 of 1, passed.
--    That verdict is what `assessment_passed` completion rules and
--    certificates read.
--
-- 2. A learner could not change an answer, and was told they had.
--    There is an insert policy and no update policy. The first answer to a
--    question was saved; changing it matched no row a learner may update, the
--    database changed nothing and reported no error, and the page printed
--    "Saved". The attempt was then marked on the first answer.
--
-- 3. A practice assessment could never be handed in.
--    A practice assessment must not have a pass mark
--    (`assessments_pass_threshold_sensible`), so `finalize_attempt_grading()`
--    leaves `passed` null — and `aa_graded_has_verdict` required a verdict on
--    every graded attempt. Every automatic practice quiz failed at the moment
--    it was submitted, with a constraint's name for a message.
--
-- No row is changed. The hosted test project has no attempts and no responses.

-- ---------------------------------------------------------------------------
-- 3. A graded attempt has a score. A verdict only where there is a pass mark.
-- ---------------------------------------------------------------------------
alter table public.assessment_attempts
  drop constraint aa_graded_has_verdict;

alter table public.assessment_attempts
  add constraint aa_graded_has_score check (
    status <> 'graded' or score_earned is not null
  );

comment on constraint aa_graded_has_score on public.assessment_attempts is
  'A graded attempt has a score. passed stays null where the assessment has no pass mark (practice), and is never invented.';

-- ---------------------------------------------------------------------------
-- 1. Marks are written by the grading functions and by nothing else.
--
-- Two locks, on purpose. The privileges below take direct writes away from
-- the roles a browser can be. This trigger does not depend on who is asking:
-- it holds for a future policy, a future grant, and a role that bypasses row
-- level security. `grade_response()` is the one writer of marks and turns
-- `app.grading_attempt` on around its update, as the existing response lock
-- already expects; the setting cannot be reached through the API, which
-- exposes functions in `public` only and none that sets it for a caller.
-- ---------------------------------------------------------------------------
create or replace function public.guard_response_marks()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.grading_attempt', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.score is not null or new.is_correct is not null
       or new.graded_by is not null or new.graded_at is not null
       or new.grading_feedback is not null then
      raise exception 'a response is marked by grading, not when it is written'
        using errcode = 'insufficient_privilege';
    end if;
  elsif new.score is distinct from old.score
     or new.is_correct is distinct from old.is_correct
     or new.graded_by is distinct from old.graded_by
     or new.graded_at is distinct from old.graded_at
     or new.grading_feedback is distinct from old.grading_feedback then
    raise exception 'a response is marked by grading, not by editing it'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_response_marks() from public, anon, authenticated;

create trigger assessment_responses_marks
  before insert or update on public.assessment_responses
  for each row execute function public.guard_response_marks();

-- The table is written through `save_assessment_response()` below. Reading is
-- unchanged: `assessment_responses_read` still decides which rows.
revoke insert, update, delete, truncate
  on public.assessment_responses from anon, authenticated;

-- It could only ever permit what is no longer granted. Left in place it would
-- read as if a learner still wrote here directly.
drop policy assessment_responses_insert on public.assessment_responses;

-- ---------------------------------------------------------------------------
-- 2. One writer for a learner's answer: save it, change it, or take it back.
--
-- The attempt row is locked first, the same lock `submit_assessment_attempt()`
-- takes, so an answer and a submission arriving together are put in an order
-- and the answer either counts or is refused — never saved after the marking
-- has read the row.
--
-- An empty answer is no answer. `submit_attempt()` counts a question as
-- answered when a response with content exists; an emptied short answer or a
-- multiple choice with every box unticked used to leave a row behind and so
-- counted. The row is removed instead.
--
-- Somebody else's attempt and an attempt that does not exist get the same
-- refusal.
-- ---------------------------------------------------------------------------
create or replace function public.save_assessment_response(
  p_attempt_id  uuid,
  p_question_id uuid,
  p_content     jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_attempt public.assessment_attempts;
  v_empty   boolean;
begin
  if v_actor is null then
    raise exception 'sign in to answer this assessment'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_attempt
    from public.assessment_attempts
   where id = p_attempt_id
     for update;

  if not found or not public.can_access_learner(v_attempt.learner_profile_id) then
    raise exception 'that attempt was not found'
      using errcode = 'no_data_found';
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'this attempt has already been submitted'
      using errcode = 'check_violation';
  end if;

  v_empty := p_content is null
          or p_content = 'null'::jsonb
          or p_content = '""'::jsonb
          or p_content = '[]'::jsonb
          or (jsonb_typeof(p_content) = 'string' and btrim(p_content #>> '{}') = '');

  if v_empty then
    delete from public.assessment_responses
     where assessment_attempt_id = p_attempt_id
       and question_id = p_question_id;
    return false;
  end if;

  -- `enforce_response_question_match` refuses a question from another
  -- assessment, on insert and on a change of question alike.
  insert into public.assessment_responses (assessment_attempt_id, question_id, response_content)
  values (p_attempt_id, p_question_id, p_content)
  on conflict (assessment_attempt_id, question_id)
  do update set response_content = excluded.response_content;

  return true;
end;
$$;

revoke all on function public.save_assessment_response(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_assessment_response(uuid, uuid, jsonb) to authenticated;

comment on function public.save_assessment_response(uuid, uuid, jsonb) is
  'Saves, changes or clears one answer on an in-progress attempt the caller may act for. True when an answer is held afterwards. The only way a learner writes to assessment_responses; marks are never accepted.';
