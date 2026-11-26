-- A new privacy notice, as a draft in the register.
--
-- The owner, 2026-11-26: "draft a new privacy notice". The notice in force
-- (version 2) was written before the discussion boards and contradicts what
-- the owner has since decided about them: it says the download holds
-- "everything held about you", that a request for a copy "will be honoured",
-- and that nothing is kept beyond the life of an account; and it does not
-- mention the boards at all.
--
-- **A draft, not in force.** It is written as the next version of `privacy`
-- with status `draft`. Version 2 stays in force until the owner publishes
-- this one from the policy register (`approve_policy_version()`), with an
-- effective date and a reason. It holds no open decision, so nothing but the
-- owner's approval stands between it and being in force. Publishing it asks
-- every account to agree again; there are none yet.
--
-- **What changed from version 2.**
--   * a section on the discussion boards: the username; that what is written
--     is kept with no time limit, including after it is taken back, taken
--     down or the account closes; who reads the record and on what terms;
--     that posts are not in the download and a copy is given only where a law
--     requires it and a court orders it (the owner's decisions of 2026-11-25
--     and 2026-11-26);
--   * what is collected now names a mobile number at sign-up, the record of
--     an agreement, and the boards;
--   * the download is said to hold what the export page lists, not
--     "everything";
--   * Google and the email provider are named where they are used;
--   * the stray "Yes." in the paragraph on transfers is gone.
--
-- **What the builder told the owner with it.** Three of the statements are
-- the owner's decisions and are in tension with data protection law in
-- several places members may live: keeping posts with no time limit,
-- refusing erasure, and giving a copy only on a court order. They are stated
-- here as decided, because a notice has to say what the platform does. See
-- NEXT.md, "The privacy notice draft and the law, 2026-11-26".

do $$
declare
  v_doc  uuid;
  v_next integer;
  v_id   uuid;
  v_body constant text := $doc$## What this notice covers

This is what AyahSpring collects, who can see it, how long it is kept and what you can do about it. It is written from what the platform does. You are asked to agree to it when you make an account, and before you write on a discussion board.

## What is collected

When you create an account: your email address or your mobile number, and a password, which is stored only as a hash by the authentication provider. Signing in with Google stores the identifier and the email address Google returns, not your Google password.

When you fill in your profile: a display name, a country, a time zone and a preferred language. There is no date of birth anywhere on this platform — a child has an age band instead.

As you learn: which courses you enrolled in, which lessons you opened, your progress, your notes and bookmarks, assessment attempts and results, certificates issued, orders and refunds, reviews you write, support cases you open, and the notifications you chose to receive.

As you browse: page and course views, and search terms, recorded against your account when you are signed in.

When you agree to a document such as this one: which document, which version, and the time. If you tick the box on the sign-up page, that is kept on your device for up to an hour so that it can be recorded once your account exists.

On the discussion boards: the username you choose, what you write, when you wrote it, and any report you make of somebody else's post. The section on the discussion boards says what happens to these.

What is never collected: your date of birth, your location beyond the country you set (a request's country is used to price a course and is not stored as a position), advertising identifiers, or anything from a third-party tracker. This platform runs no advertising and sells no data.

## Who can see it

You can. A family member sees your progress only if you have invited them and chosen what they see, and you can end that at any time.

A teacher sees a learner's name and progress only inside a class they run and you joined. Otherwise they see counts: how many enrolled, how many completed. A teacher never sees your notes.

An institution sees counts of its own members — never a name, never a row per person.

Staff see what their work requires and record a written reason when they act on an account, a payment or a course. Support can read a case you opened; support cannot read your password, because nobody can.

On the discussion boards, other members see your username and whether you are a student, a teacher or staff. They do not see your name.

## The discussion boards

There are two: one for students who have a paid class and for teachers, and one for teachers only. You write there under a username, not under your name.

What you write there is kept, with no time limit. A post comes off the board when you take it back, when a moderator takes it down, or when you close your account. Neither you nor other members then see it, and the words stay in the platform's record. When you close your account they stay without your name, your account or your username attached to them. Taking a post off the board does not erase it from the record, and the platform gives nobody a way to erase it.

The platform's owner and its governance staff moderate the boards. They can still read a post that you took back or that a moderator took down. To read what a closed account wrote, or to find out which account wrote a post, they write down a reason first, and the reason is recorded against their own account; they find out who wrote a post only when it has been reported or when somebody may be in danger. Teachers, support staff and other staff can do none of this.

This is done so that somebody who is threatened, bullied or misled on a board can be protected, and so that taking a post back does not remove the record of what was said.

When you report a post, the owner is told that a post was reported. The report, and who made it, are seen only by the owner and governance staff.

Your posts on the discussion boards are not in the file you can download from your account page: that file carries your name, and the boards are written under a username. A copy of your posts is not given on request. It is given where a law requires it and a court orders it.

What you write can still show who you are. Do not put a name, a phone number or an address in a post, whether yours or anybody else's.

## Where it is processed

The database and sign-in are provided by Supabase, in its Frankfurt region (eu-central-1). Lesson media, once there is any, is stored by Cloudflare R2 in the European Union. If you choose to sign in with Google, Google tells the platform who you are. Email, where the platform sends any, is sent through Resend. The application runs on a hosting provider.

Personal data is stored in the European Union and is reached from wherever the platform is operated. Where a learner or teacher is outside the EU, that transfer rests on the European Commission's standard contractual clauses and on the provider's own data processing terms.

## How long it is kept

Your account and learning record are kept while your account exists. Usage analytics are kept indefinitely: a decision recorded on 2026-10-22, because a year of history cannot be reconstructed after the fact.

Closing your account anonymises the account and archives the learner record instead of deleting it, so a certificate already issued can still be verified. Orders and payments are kept because accounting records outlive an account. What you did is kept, without you attached to it.

A support case is kept for three years after it is closed. A safeguarding or screening record is kept for seven years after the person it concerns turns 18, or for seven years after it is made where they were already an adult. What is written on the discussion boards is kept with no time limit, as the section on the boards says. Nothing else about a person is kept beyond the life of their account, apart from what the law requires and the certificate number described in the children's policy.

## Your rights

You can download what is held about you, as one file, from your account page. That page lists what the file leaves out and why; your posts on the discussion boards are one of those things. You can correct your details. You can close your account. None of these costs anything and none requires a request by email.

Where the law gives you more — access, portability, objection, deletion, a copy in another format — ask and it will be honoured, with one exception: what you wrote on the discussion boards is kept, and a copy of it is given only where a law requires it and a court orders it.

## Children

A child is a learner profile inside an adult's account and does not need a sign-in of their own. No one under 13 may use this platform anywhere, in any country until guardian verification is working and switched on. It is working and the operator applies it in every country from 2026-11-01: a child of any age is enrolled only after an adult has been verified as their parent or guardian, and that verification carries a method, a stated lifetime and a way to withdraw. The children's policy states the same rule.

A child reaches the students' discussion through the account of the adult who looks after them, or through a sign-in that adult made for them. Whichever account is used is the one asked to agree to this notice before writing there. What a child writes on a board is kept in the same way as anybody's.

## Who is responsible

AyahSpring is the controller of the personal data described in this notice. It is operated from Uganda, and you can write to privacy@ayahspring.com about anything in this notice — to ask what is held about you, to have it corrected, to have it deleted, or to complain about how it has been handled.

This notice is written against the Data Protection and Privacy Act, 2019 of Uganda, and the supervisory authority is the Personal Data Protection Office (PDPO) of Uganda. You may also complain to the supervisory authority of the country you live in.

## Changes

This notice is versioned. A change is a new version with an effective date, and where it needs your agreement you will be asked for it and it will be recorded with a timestamp on your account.$doc$;
begin
  select d.id into v_doc from public.policy_documents d where d.slug = 'privacy';
  if v_doc is null then
    raise exception 'privacy notice draft: there is no privacy document';
  end if;

  if exists (select 1 from public.policy_versions v
              where v.document_id = v_doc and position('## The discussion boards' in v.body) > 0) then
    raise notice 'privacy notice draft: a version with the section on the boards is already in the register';
    return;
  end if;

  if public.policy_open_decisions(v_body) > 0 then
    raise exception 'privacy notice draft: the text holds an open decision';
  end if;

  select coalesce(max(v.version_number), 0) + 1 into v_next
    from public.policy_versions v where v.document_id = v_doc;

  insert into public.policy_versions (document_id, version_number, body, change_note, status)
  values (v_doc, v_next, v_body,
          'Adds the discussion boards: posts are kept with no time limit, who may read the record, and that a copy is given only where a law requires it and a court orders it. Names a mobile number at sign-up, Google and the email provider. Drafted on the owner''s instruction of 2026-11-26.',
          'draft')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'policy.draft_saved', 'policy_version', v_id,
          jsonb_build_object(
            'slug', 'privacy',
            'versionNumber', v_next,
            'openDecisions', 0,
            'source', 'owner instruction of 2026-11-26, drafted by migration; not in force until the owner approves it'));

  raise notice 'privacy notice draft: version % saved as a draft', v_next;
end $$;
