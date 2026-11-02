-- -----------------------------------------------------------------------------
-- A boundary, before a bot
-- -----------------------------------------------------------------------------
-- `learning.ai_support` has said since the register was written that a study
-- assistant "must refuse to issue rulings and refer to a teacher". That was a
-- promise no prompt can keep. On 2026-11-01 the owner decided what can be kept, and
-- this migration builds exactly that and nothing else:
--
--   * **Retrieval only.** An answer is a citation to a lesson the person asking may
--     open right now — title, course, section, a snippet of text they are already
--     entitled to read. There is no model, no generated paragraph, and no
--     paraphrase of a lesson. `boundary.model` is null in every response, so a
--     screen cannot imply that something wrote an answer when nothing did.
--
--   * **A ruling-shaped question fails closed.** The list of shapes is a table of
--     phrases (`ai_support_ruling_phrases()`), matched on the question as typed.
--     A match does not produce a "best guess", a hedged answer, or a citation that
--     happens to contain the word: it produces *ask a teacher*, and — where the
--     help desk is open — a support case, so the question reaches a person instead
--     of ending in a sentence telling the learner to find one.
--
--   * **No citation, no answer.** A question that matches no lesson gets "nothing
--     in your courses covers this yet" and the same route to a teacher. The
--     alternative — answering from general knowledge — is exactly the failure this
--     boundary exists to stop: a plausible sentence about the religion, written by
--     nobody, presented by a platform that teaches it.
--
--   * **Recitation stays off.** `learning.recitation` is untouched by this
--     migration and stays off until Qur'anic ASR has been validated on makharij.
--     Nothing here records, transcribes or plays back a voice.
--
--   * **Every question is recorded.** `ai_support_questions` holds what was asked,
--     what the boundary did with it, and how many citations came back. A boundary
--     nobody can audit is a claim, not a control, and the refusals are exactly what
--     the owner should read when deciding who is a scholar.
--
-- The flag still ships **off**, and stays off until a provider and a cost ceiling
-- exist for anything generative. Retrieval does not need one — it runs on the same
-- full-text index the lesson search uses — so what is built here works the day the
-- flag is switched on, and no part of it pretends to be the part that is not.

-- -----------------------------------------------------------------------------
-- 1. What counts as asking for a ruling
-- -----------------------------------------------------------------------------
-- Phrases, not topic words. "Marriage" appears in a lesson title and in a question
-- about a course; "is my marriage valid" is asking for a ruling and must not be
-- answered by a search result. The list is deliberately blunt: a false positive
-- costs a learner one extra tap to reach a teacher, and a false negative costs the
-- platform its whole reason for having a boundary.
create or replace function public.ai_support_ruling_phrases()
returns text[]
language sql
immutable
as $$
  select array[
    'fatwa', 'fatwas',
    'what is the ruling', 'the ruling on', 'ruling on', 'is there a ruling',
    'is it haram', 'is this haram', 'is that haram', 'is it halal', 'is this halal',
    'is that halal', 'haram or halal', 'halal or haram',
    'is it permissible', 'is this permissible', 'is that permissible',
    'is it impermissible', 'is it allowed in islam', 'is this allowed in islam',
    'does islam allow', 'does islam permit', 'islamically', 'in islam is',
    'according to sharia', 'under sharia', 'shariah', 'shari''ah',
    'is it a sin', 'is this a sin', 'is that a sin', 'is it sinful', 'a major sin',
    'is it obligatory', 'is it fard', 'is it wajib', 'is it makruh',
    'am i allowed to', 'are we allowed to', 'is it valid', 'is my marriage valid',
    'is my divorce valid', 'can i marry', 'can i divorce', 'do i have to fast',
    'must i pray', 'is it backbiting', 'is it gossip', 'is it riba', 'is it interest'
  ]::text[];
$$;

comment on function public.ai_support_ruling_phrases() is
  'Question shapes that ask for a religious ruling. Matched case-insensitively as substrings. Deliberately blunt: failing closed costs a learner a tap, failing open costs the platform its boundary.';

create or replace function public.ai_support_is_ruling(p_question text)
returns boolean
language sql
immutable
as $$
  select exists (
    select 1
      from unnest(public.ai_support_ruling_phrases()) as phrase
     where lower(coalesce(p_question, '')) like '%' || phrase || '%'
  );
$$;

comment on function public.ai_support_is_ruling(text) is
  'True when a question asks for a ruling. Used to fail closed to "ask a teacher" rather than to answer it from a search index.';

-- -----------------------------------------------------------------------------
-- 2. What was asked, and what the boundary did
-- -----------------------------------------------------------------------------
create table public.ai_support_questions (
  id uuid primary key default gen_random_uuid(),

  asked_by uuid not null
    references public.user_profiles (user_id) on delete cascade,

  -- The question as typed. Bounded, because this is a study question and not a
  -- place to paste a book; kept, because the refusals are the record the owner
  -- needs to decide who is a scholar here.
  question text not null check (length(btrim(question)) between 3 and 1000),

  course_id uuid references public.courses (id) on delete set null,

  status text not null
    check (status in ('answered', 'refused_ruling', 'no_match')),

  -- Which phrases matched, when one did. Empty otherwise, never null.
  matched_phrases text[] not null default '{}',

  citation_count integer not null default 0 check (citation_count >= 0),

  -- The case the refusal opened, when the help desk was open to take one.
  support_case_id uuid references public.support_cases (id) on delete set null,

  created_at timestamptz not null default now()
);

create index ai_support_questions_recent_idx
  on public.ai_support_questions (created_at desc);
create index ai_support_questions_asker_idx
  on public.ai_support_questions (asked_by, created_at desc);

alter table public.ai_support_questions enable row level security;

-- The person who asked can read their own questions. Staff can read all of them:
-- a queue of refusals is the only way anybody finds out whether the boundary is
-- refusing too much, or the wrong thing.
create policy ai_support_questions_read on public.ai_support_questions
  for select to authenticated
  using (asked_by = public.current_user_id() or public.is_privileged(public.current_user_id()));

comment on table public.ai_support_questions is
  'Every question the study assistant was asked, what it did with it, and how many lessons it cited. The refusals are the record the owner reads; the citations are the proof that an answer came from an enrolled lesson rather than from nowhere.';

comment on column public.ai_support_questions.status is
  'answered (citations returned), refused_ruling (the question asked for a ruling and went to a teacher), no_match (nothing in the caller''s courses covers it).';

-- -----------------------------------------------------------------------------
-- 3. Asking
-- -----------------------------------------------------------------------------
create or replace function public.ai_support_ask(
  p_question  text,
  p_course_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_question text := btrim(coalesce(p_question, ''));
  v_phrases  text[];
  v_hits     integer := 0;
  v_cites    jsonb := '[]'::jsonb;
  v_case     uuid;
  v_case_no  text;
  v_status   text;
  v_message  text;
  v_id       uuid;
  r          record;
begin
  if v_actor is null then
    raise exception 'ai_support:not_signed_in' using errcode = 'insufficient_privilege';
  end if;

  -- Off is a state, not an error. A panel that says "this is not open yet" is
  -- better than one that 500s, because the flag may well be off on purpose.
  if not public.setting_bool('learning.ai_support', false) then
    return jsonb_build_object(
      'status', 'closed',
      'boundary', jsonb_build_object('retrievalOnly', true, 'model', null, 'generatedText', false),
      'citations', '[]'::jsonb,
      'message', 'The study assistant is not switched on. Ask your teacher in the lesson, or open a support case.');
  end if;

  if length(v_question) < 3 then
    raise exception 'ai_support:too_short' using errcode = 'invalid_parameter_value';
  end if;
  if length(v_question) > 1000 then
    raise exception 'ai_support:too_long' using errcode = 'invalid_parameter_value';
  end if;

  v_phrases := array(
    select phrase
      from unnest(public.ai_support_ruling_phrases()) as phrase
     where lower(v_question) like '%' || phrase || '%'
  );

  if array_length(v_phrases, 1) is not null then
    -- Fail closed, and route it. The question is not answered, softened, or
    -- answered with a citation that happens to contain a matching word: it goes
    -- to a person. `open_support_case()` is gated on `platform.support`, and when
    -- the desk is closed the message says so rather than promising a reply.
    v_status := 'refused_ruling';
    begin
      v_case := public.open_support_case(
        -- 'content' is the closest of the desk's own categories: the question is
        -- about the teaching material and needs a teacher, not a billing desk.
        'content',
        left('Study question for a teacher: ' || v_question, 160),
        'Asked through the study assistant, which does not answer ruling-shaped questions. '
        || E'Question as typed:\n\n' || v_question,
        null, null);
    exception when others then
      v_case := null;
    end;

    if v_case is not null then
      select s.case_number into v_case_no
        from public.support_cases s where s.id = v_case;
      v_message := format(
        'That is a question for a teacher, and this assistant does not answer those. '
        || 'We have opened case %s so a person can answer it.', v_case_no);
    else
      v_message := 'That is a question for a teacher, and this assistant does not answer those. '
        || 'The help desk is not taking cases yet, so ask your teacher in the lesson.';
    end if;
  else
    -- Retrieval. `search_lessons()` is the same index the catalogue uses, and it
    -- already refuses to show a description the caller may not read — so a
    -- citation cannot leak a lesson somebody is not enrolled in.
    v_hits := 0;
    for r in
      select *
        from public.search_lessons(v_question, 10) s
       -- A title match is visible to anybody, which is right for a catalogue and
       -- wrong for an answer: "cite an enrolled lesson" means one this caller can
       -- open now, so the unentitled matches are dropped here rather than shown
       -- as a teaser.
       where public.can_access_lesson_now(s.lesson_id)
       limit 5
    loop
      v_hits := v_hits + 1;
      v_cites := v_cites || jsonb_build_object(
        'lessonId', r.lesson_id,
        'lessonTitle', r.lesson_title,
        'sectionTitle', r.section_title,
        'courseId', r.course_id,
        'courseSlug', r.course_slug,
        'courseTitle', r.course_title,
        'snippet', r.snippet,
        'matchedIn', r.matched_in,
        'href', '/courses/' || r.course_slug);
    end loop;

    if v_hits = 0 then
      v_status  := 'no_match';
      v_message := 'Nothing in your courses covers this yet. A teacher can answer it — '
        || 'ask in the lesson, or open a support case.';
    else
      v_status  := 'answered';
      v_message := 'This is what your courses cover on that. It is a pointer to a lesson, '
        || 'not an answer written for you.';
    end if;
  end if;

  insert into public.ai_support_questions
    (asked_by, question, course_id, status, matched_phrases, citation_count, support_case_id)
  values
    (v_actor, v_question, p_course_id, v_status,
     coalesce(v_phrases, '{}'), v_hits, v_case)
  returning id into v_id;

  return jsonb_build_object(
    'questionId', v_id,
    'status',     v_status,
    'message',    v_message,
    'citations',  v_cites,
    'matchedPhrases', to_jsonb(coalesce(v_phrases, '{}'::text[])),
    'supportCaseId', v_case,
    'supportCaseNumber', v_case_no,
    -- Stated on every response, in the response itself. A screen that renders a
    -- citation can print this line without asking anything else, and a later
    -- change that starts generating text has to change this to say so.
    'boundary', jsonb_build_object(
      'retrievalOnly', true,
      'model', null,
      'generatedText', false,
      'rules', 'A citation to a lesson you can open, or no answer. Ruling-shaped questions go to a teacher.'));
end;
$$;

revoke all on function public.ai_support_ask(text, uuid) from public;
grant execute on function public.ai_support_ask(text, uuid) to authenticated;

comment on function public.ai_support_ask(text, uuid) is
  'The study assistant, retrieval-only: cites lessons the caller may open, refuses ruling-shaped questions to a teacher and opens a support case where the desk is open, and answers nothing when no lesson matches. Writes one row per question. Never generates text.';

-- -----------------------------------------------------------------------------
-- 4. What the owner reads
-- -----------------------------------------------------------------------------
create or replace function public.ai_support_summary(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_days  integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if not public.is_privileged(v_actor) then
    raise exception 'only staff may read the assistant summary'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'days', v_days,
    'asked', (select count(*) from public.ai_support_questions q
               where q.created_at >= now() - make_interval(days => v_days)),
    'answered', (select count(*) from public.ai_support_questions q
                  where q.status = 'answered'
                    and q.created_at >= now() - make_interval(days => v_days)),
    'refused', (select count(*) from public.ai_support_questions q
                 where q.status = 'refused_ruling'
                   and q.created_at >= now() - make_interval(days => v_days)),
    'unmatched', (select count(*) from public.ai_support_questions q
                   where q.status = 'no_match'
                     and q.created_at >= now() - make_interval(days => v_days)),
    'withCase', (select count(*) from public.ai_support_questions q
                  where q.support_case_id is not null
                    and q.created_at >= now() - make_interval(days => v_days)),
    -- The phrases doing the refusing, so a false positive shows up as a count
    -- rather than as somebody's complaint three weeks later.
    'topPhrases', coalesce((
      select jsonb_agg(jsonb_build_object('phrase', phrase, 'count', n) order by n desc)
        from (
          select unnest(q.matched_phrases) as phrase, count(*)::int as n
            from public.ai_support_questions q
           where q.created_at >= now() - make_interval(days => v_days)
           group by 1
           order by 2 desc
           limit 10
        ) t), '[]'::jsonb),
    'recitation', public.setting_bool('learning.recitation', false));
end;
$$;

revoke all on function public.ai_support_summary(integer) from public;
grant execute on function public.ai_support_summary(integer) to authenticated;

comment on function public.ai_support_summary(integer) is
  'How often the study assistant answered, refused and found nothing, and which phrases did the refusing — the counts a person reads when deciding whether the boundary is too blunt or too loose. Also says whether recitation is on, which it is not.';
