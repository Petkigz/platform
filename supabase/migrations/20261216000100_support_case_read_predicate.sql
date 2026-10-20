-- One definition of who may read a support case.
--
-- `can_read_support_case()` has existed since the help desk was built, and its
-- own comment claimed it was "used by the writer functions; reads are handled by
-- RLS". Neither half was true. No writer calls it — each one checks the row it is
-- already holding — and the reads that were "handled by RLS" spelled the same
-- predicate out again, twice:
--
--   support_cases_read          requested_by = me OR is_privileged(me)
--   support_case_messages_read  EXISTS (a case where id = message.case_id AND
--                                   (is_privileged(me) OR (requested_by = me
--                                    AND NOT is_internal)))
--   can_read_support_case       is_privileged(me) OR EXISTS (a case where
--                                   id = p_case_id AND requested_by = me)
--
-- Three copies of one rule, and the one written to be the single copy was the one
-- nothing read. That is not a style complaint: the next change to who may see a
-- case — an assigned agent who is not otherwise privileged, say — has to be made
-- in three places, and a policy that is missed does not fail loudly. It fails by
-- showing one person a conversation that was not theirs, or hiding one that was.
--
-- Both read policies now call the function. What stays inline is the part that is
-- genuinely a second question: who may read a *case*, and which of its *messages*
-- they may read. An internal note stays inside the team even from the person who
-- opened the case, and a staff member who opens their own case can still read
-- them, because internal notes are staff information and they are staff. That
-- rule belongs to the message policy, where a reader of it will look.
--
-- The behaviour is identical, which is the point: this is the same predicate in
-- one place rather than three, and the existing tests — a case visible to its
-- requester and to staff and to nobody else, an internal note invisible to the
-- requester and readable by staff — pin the outcome either way.
--
-- No recursion: `can_read_support_case()` is SECURITY DEFINER, so the case lookup
-- inside it runs as the function owner and is not itself filtered by the policy
-- that called it. `cohorts_read` has used `can_read_cohort()` this way since
-- cohorts were built.

drop policy if exists support_cases_read on public.support_cases;

create policy support_cases_read on public.support_cases
  for select to authenticated
  using (public.can_read_support_case(id));

drop policy if exists support_case_messages_read on public.support_case_messages;

-- An internal note stays inside the team even from the person who opened the
-- case. A staff member who opens their own case can still read them: internal
-- notes are staff information, and they are staff.
create policy support_case_messages_read on public.support_case_messages
  for select to authenticated
  using (
    public.can_read_support_case(case_id)
    and (
      public.is_privileged(public.current_user_id())
      or not support_case_messages.is_internal
    )
  );

comment on function public.can_read_support_case(uuid) is
  'The account that opened the case, or staff. The single definition, used by both read policies: support_cases_read asks about the row, and support_case_messages_read asks about the message''s case and then hides internal notes from a requester who is not staff. No writer calls it — each writer checks the row it is already holding.';
