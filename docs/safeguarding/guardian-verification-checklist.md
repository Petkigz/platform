# Guardian verification — the reviewer's checklist

Who this is for: the person deciding a guardian consent on `/admin/guardians`.
That is the owner today (`can_decide_guardian_consent()` says who), and it is the
one place on the platform where a decision is made about a **child's** relationship
to an adult rather than about content.

Why it exists: the queue gave a person a statement, four buttons and no standard.
Two reviewers deciding the same request on the same day could give different
answers, and the adult reads the reason either way. This is the standard, written
once. The same nine lines are rendered on the screen
(`REVIEWER_CHECKLIST` in `web/src/lib/guardian-consent.ts`), and a test holds the
two together so they cannot drift into two answers.

**Read every request within two working days.** A request that waits is a child who
cannot start. The queue is short by design — verification is manual, on purpose,
because the alternative is enrolling children on an adult's word.

---

## 1. Read the statement, not just the name

The adult has to say who the child is to them, in their own words. Twenty
characters is the floor the database enforces, not the standard: a sentence that
could be about any child in the world answers nothing.

What a useful statement does: names the child, says the relationship in plain
words, and says something only that adult would know or could say. What it does
not need to be: well written, in English, or long.

## 2. Check the method that was actually used

The four methods the database accepts, and what each one has to have meant:

- **A video call** — you saw them, and they saw you. Not a voice call, not a
  message thread.
- **An identity document** — a name on the document matched the child's record.
- **In person** — somebody saw them at a class, an office or an event.
- **A signed declaration** — something signed exists *outside* this database.

If the method chosen never happened, ask for more information rather than deciding
on a guess. A reviewer who decides "probably" has moved the risk, not checked it.

## 3. Never ask for the document itself

The reference is write-only. The queue reports whether one exists and never what
it is, and the database will not return it to you, the child, or support. That is
the point: the platform must not become a copy of anybody's passport.

If you need to look at a document, look at it outside the platform and record only
that you did.

## 4. Decide how long the verification lasts

- **12 months** — the ordinary answer, and the default on the form.
- **6 months** — evidence that is thin, or a household in flux.
- **24 months** — a relationship with documentary grounds and a stable history.
- **36 months** — the ceiling the database enforces. Nothing longer is possible,
  and the number is checked in SQL rather than in the form.

The expiry is computed from the decision, not typed, so two reviewers deciding the
same week give the same answer. It expires on its own; renewing does not add time
to one that has lapsed.

## 5. Narrow the permissions, never widen them

Three permissions, and they are not the same power:

- **View progress** — reading what a child has done.
- **Manage learning** — enrolling, leaving a class, changing what they study.
- **Manage profile** — renaming or removing the child.

Grant the first two to a parent. Withhold the third unless that adult is the only
one who could do it. A reviewer can always grant less than the form offers.

## 6. Reject when the adult is not who they say, or not this child’s

Each of these is a rejection with a reason, not a maybe:

- the statement names no child;
- the method was chosen but never completed;
- the adult is not a member of the child's family;
- a second adult claims a child who already has a live consent — one child, one
  verified guardian at a time, and a second claim is a conversation with the first
  adult, not a second approval.

Rejecting **revokes the relationship and clears every permission**. It deletes no
learning: the child's enrolments and progress stay exactly where they were.

## 7. Ask for more information rather than deciding blind

It keeps the request open, revokes nothing, and tells the adult what is missing.
Use it when the answer is "I cannot tell yet" — never as a way of clearing the
queue without looking.

## 8. Write the reason for the adult, not for the file

The database requires five characters. The standard is that the adult can read it
and know what to do next. A rejection that explains itself is the difference
between a refusal and an insult, and this is a parent reading about their child.

## 9. A consent decision is not a safeguarding investigation

This decides **who may act for a child**, not whether a child is safe. If the
statement raises a worry:

- record the decision on its own merits, and
- take the worry to the safeguarding lead that day — that is
  `safeguarding_lead()`, the operator, at privacy@ayahspring.com. It is a
  different record, a different queue, and a different decision.

Do not reject a consent because you are worried, and do not approve one to make a
worry go away. Say each thing in the place it belongs.

---

## What a decision is not

- **Not a background check.** The platform does not run one, and this queue does
  not claim one happened.
- **Not a judgement of the adult's character.** It is a judgement that the
  relationship is what they say it is, established by a method that was actually
  used.
- **Not permanent.** Everything here expires, and a lapsed verification is asked
  for again — including the consents approved before 2026-11-01, which lapsed when
  the requirement was switched on because they were approved before the machinery
  recorded a lifetime.

## What the record keeps

The decision, the method, the months, the permissions, the date, the reviewer, and
the version of the children's policy that was in force at the moment of the
decision. Not the evidence, and not the reference to it. The statement stays
because the reviewer read it, and it is visible to governance staff only.
