# Eight questions waiting on the owner — briefed and answered 2026-11-01

**All eight are answered.** The briefs below are kept as they were written, because
what a question looked like before the answer is the part that stops it being
re-opened by accident. The answers live in `DECISIONS.md` and the consequences are
being built one unit at a time; the table says where each one stands.

| # | Question | Answer | Where it stands |
|---|---|---|---|
| 1 | Retention for coursework | **a year after the class ends**, and a file whose submission goes stops being readable at once | **Built** — `20261281010000` |
| 2 | Safeguarding review of files children send | **a recorded review, not a release queue** | **Built** — `20261281011000`, `/admin/coursework` |
| 3 | Guardian verification on | **on, worldwide, now**, ahead of the legal review | **Decided and documented** — the flag is an owner action (`docs/deploy/README.md` §3.3); the review checklist and the policy are still to write |
| 4 | EU 14-day withdrawal waiver | **a real waiver at checkout**, 14 days if unticked, stored per order | **Built** — `20261281013000`, the checkbox on `/courses/<slug>/buy`, refunds policy republished as version 2; the wording still needs a lawyer |
| 5 | Market grain | **country**, as built | **Confirmed** — no code |
| 6 | What nets against what in the money report | chargeback no offset, fee is the platform's, reversal in its own period, then the net line — **two** derived lines, because a teacher's share is not a ledger row | **Built** — `20261281012000` |
| 7 | AI support and recitation | **the boundary first** — cite a lesson or no answer, refuse rulings to a teacher; recitation stays off | **Built** — `20261281014000`, `/learn/ask`, `/admin/ai-support`; the flag is still off, and recitation is untouched |
| 8 | How long a class's progress stays readable | **as long as the course exists** — the roster does not expire | **Confirmed** — the behaviour was already this; the question is closed |

Nothing in the briefs below was decided when they were written. Every section is
what was blocked, what already existed so it could be checked rather than taken on
trust, the choice, and what building it would cost.

Two of these hold **two features off at once** — coursework retention and the
safeguarding review both gate `learning.assignments` *and* `learning.cohorts`,
which together are the largest built-but-switched-off surface on the platform.
That is why they are first.

| # | Question | Holds | Size of the build behind it |
|---|---|---|---|
| 1 | Retention for coursework | `learning.assignments`, `learning.cohorts` | one migration + tests |
| 2 | Safeguarding review of files children send | the same two flags | one small register + a written rule |
| 3 | Guardian verification on | `family.guardian_verification` (US/EU children) | legal review; almost no code |
| 4 | EU 14-day withdrawal waiver | `platform.withdrawal_right` | one checkbox, one table, tests |
| 5 | Market grain — country or currency | nothing (already built as country) | a confirm; ~0 code |
| 6 | What nets against what in the money report | nothing (report refuses to net) | one function + a line on a page |
| 7 | AI support + recitation | `learning.ai_support`, `learning.recitation` | a whole feature family |
| 8 | How long a class's progress stays readable | nothing yet — it is forever by omission | one predicate + tests |

---

## 1. What happens to a child's handed-in photo when the account or the course goes

**What already exists.** A handed-in file is a `media_assets` row with
`purpose = 'coursework'`, linked to one submission through
`assignment_submission_assets` (`media_asset_id` is `on delete restrict`,
`submission_id` is `on delete cascade`), and declared in
`coursework_upload_declarations` before a byte moves
(`20261281006000_coursework_files.sql`). Deleting a file is a *soft* delete:
`delete_media_asset()` sets `deleted_at` and its own comment says "The master
object survives; retention is a scheduled decision."

**There is no such decision, and the gap is precise.** Three paths exist and none
of them touches the file:

- **The child's clock.** `run_retention_jobs()` deletes the child's enrolments,
  submissions and attempts thirty days after the guardian's account closes
  (`20261281004800_child_record_clock.sql`, line 278). The submission row goes,
  the attachment rows cascade away — and the `media_assets` row and the object in
  the bucket stay. After that clock runs, **the database can no longer say whose
  file it was**, but the bytes are still there.
- **Account erasure.** `erase_my_account()` blanks `assignment_submissions.body_text`
  and does not mention media at all. The profile is de-identified rather than
  deleted, so nothing cascades.
- **A course.** There is no function anywhere that deletes a course;
  `courses.deleted_at` is a soft delete and no path reaches a submission. So
  "the course was deleted" is not an event that can happen today.

**The choice.**

- **A. The file follows the record.** When the submission row goes, the attached
  coursework asset is made unwatchable immediately and deleted from storage after
  a short, named hold — the same thirty days — unless it is attached to an open
  safeguarding case.
- **B. A fixed term for coursework.** Every handed-in file is kept for, say, a
  year after the term and then deleted, whether or not the submission exists.
- **C. Keep it.** Storage is cheap and a teacher might want it later. For a
  child's photograph this is the worst of the three and the easiest to drift into.

**Recommendation: A**, with one addition — **a course retiring never deletes a
learner's file.** The file is the learner's, handed to one teacher; it goes when
the submission goes, not when the course is unpublished or retired. And B's useful
half is kept as the *hold*: thirty days between "unwatchable" and "gone", so a
safeguarding case opened in that window does not find the evidence destroyed.

**If you pick A, what gets built.** A due-records arm for coursework files that
have lost their submission; `media_assets` tombstoned in the same call that
deletes the submission, not by a later sweep; `/admin/retention` gains the count;
tests for all three paths, including "the marker cannot open a deleted file" and
"a case on hold survives the sweep".

**Cost, honestly.** The database half is free and enforceable today: tombstoning
makes the file unwatchable at once, because `may_watch_master()` already refuses
anything not `available`. The *bytes* need R2 credentials to actually delete, so
the first version queues them and the worker that already exists for encoding is
where the delete lands. That is the same missing credential as every other media
gap, and the deploy runbook already has the step.

---

## 2. Safeguarding review of the files children send

**What already exists.** Type, 25 MiB and ten-file limits checked before the
transfer; a `coursework` file kind that can never be attached to a lesson;
`quarantine_media_upload()` for staff; and `may_watch_master()` with a coursework
branch that lets **whoever can read the submission** open the file.

**What does not exist: any human in the loop.** `confirm_coursework_upload()`
promotes a file from `pending` to `available` **by its own uploader**, attaches it
to the draft submission in the same transaction, and no member of staff ever sees
it. There is no record that anybody looked. That is the whole of the reason both
flags are off — not a missing scanner, a missing *rule*.

**The review has to answer three things, and only the third is code.**

1. **Who may open a child's file?** Today: the household and the course author,
   plus staff. Is a co-teacher or an institution admin allowed? (This is the same
   question `may_review_version_media()` answered for lesson media by tying it to
   an assignment and a period.)
2. **What does a teacher do when they see something worrying?** The incident
   register exists (`platform.incident`, CODE-gated, "detection counts and never
   judges") but nothing connects a file to a case.
3. **Is every file reviewed, or only the ones that matter?**

**The choice.**

- **A. A written rule only.** The safeguarding lead writes down who may look,
  what to do with a worrying file, and how it is recorded. The flag turns on; no
  code changes.
- **B. Scanning on receipt.** Every file checked by a provider before the marker
  sees it. Not free — this is the one option that costs money monthly.
- **C. A recorded review.** Files stay self-confirmed (fast for the family), but
  `/admin/media` lists coursework files, and a review is *marked* with who and
  when. The marker's screen shows a file nobody has looked at yet.
- **D. Hold every file until staff release it.** Safest, and it puts a staff queue
  in front of every homework photo a child sends. At three classes this is already
  a job; at thirty it is a failure that reads as the platform losing homework.

**Recommendation: A + C, explicitly not D, and B later behind its own flag.**
Reasons: ease of use is the dominant principle and D spends it on the common case;
the marker is the trusted adult and a queue in front of every photo says otherwise;
but a *recorded* review of the ones that matter is exactly what a safeguarding
lead needs when a parent asks "who has seen my child's photograph?". B waits for a
provider that can be afforded — Cloudflare's free tier does not include one, and
nothing in the current stack scans files.

**If you pick A + C, what gets built.** A review mark on a coursework file
(who, when, what was decided) that the marker's list and `/admin/media` both read;
a filter for "not yet reviewed"; and the incident link in the other direction, so a
case can name the file. One migration, a writer, a column on a staff screen, tests
for the refusals — a reviewer must not be able to mark their own child's file, and
a case must be openable without the file being public.

---

## 3. Turning guardian verification on

**What already exists — the whole loop, built 2026-10-27.**
`submit_guardian_consent()` writes the relationship and a pending case in one call;
the method is from a closed vocabulary (video call, identity document, in person,
signed declaration) with the parent's statement in their own words and a
**write-only** evidence reference nobody can read back; staff decide, verify for a
stated number of months (default 12, never past 36), or reject with a reason. The
expiry lives in one predicate behind the thirteen policies that call
`can_access_learner()` plus the child-enrolment trigger. A lapse pauses access and
deletes nothing; a **withdrawal** starts the children's deletion clock.

**What is actually missing is not code.**

- **A legal review** of the flow against COPPA (a US under-13) and the GDPR's
  child-consent rules. I can prepare the pack — what is recorded, what is
  write-only, what expires, what is deleted — but I cannot give the opinion, and
  guessing it is the one thing here that would be dishonest.
- **A published children's policy.** `policy_version` on a consent is null today
  because no policy is in force, and the console says so rather than letting the
  platform write "they agreed to the policy" when there is none.
- **One rule inside the machinery:** does a *signed declaration* count as
  verification for a US under-13, or is an identity document required there? The
  machinery supports either; the vocabulary already has both.

**Recommendation: leave the flag off, and do the two cheap halves now.** Publish
the children's policy as a version, so a consent records what was agreed; and write
the reviewer's checklist (what to look at, how long to give, when to reject).
Then the flag turns on per market, after the lawyer, and `learning.assignments` /
`learning.cohorts` can be considered separately — they are not gated on this.

**Why waiting is safe.** The precondition is "must be live before any US child
enrols", not "before any child enrols". What is unsafe is turning it on
*unreviewed* in order to be ready. Nothing in the platform requires it today.

**Cost.** The policy publish is an action `/admin/policies` already supports. The
checklist is a page of writing. The code is done and tested.

---

## 4. The EU 14-day withdrawal waiver

**What already exists.** The 72-hour refund window (`20261267000100`), its control
and the written-reason workflow (`20261268000100`), and a teacher's share reversed
on a full refund. The `refunds` policy draft carries two `[OWNER DECISION]` markers
for exactly this.

**One correction to the record.** `FLAGS.md` says the waiver has no home "because
there is no checkout". There *is* a checkout now —
`/courses/[slug]/buy` with `buy-form.tsx`, posting a course id and never a price —
and `/plans` starts plan orders through the same `createOrder()`. No provider moves
money, so a ticked waiver would today be recorded against an order that can never
be paid; but the screen the buyer sees exists, and the waiver has a place to live.
The flag entry is stale (worth fixing whichever way you answer).

**The choice.**

- **A. The statutory period replaces the 72 hours in the EU and UK.** One rule per
  market. Simpler to explain, and it means an EU buyer can change their mind on day
  thirteen after watching everything.
- **B. They stack.** 14 days in the EU and UK, 72 hours elsewhere. Nothing is
  waived; nothing needs a lawyer's wording for a waiver.
- **C. An explicit waiver at checkout for immediate access**, so the 72-hour rule
  is the rule everywhere — with the statutory 14 days applying to anyone who does
  not tick it.

**Recommendation: C, with the fallback written into the same flow.** One rule
worldwide is worth having: a family in Kampala and a family in Berlin read the same
sentence about when they can ask for money back, which matters more than the
statute when the platform is new and the support desk is one person. But the
waiver only works if it is real — an unticked, separate checkbox with its own
words, whose acceptance is stored **per order** with the buyer's country, the
policy version and a timestamp; and if the buyer does not tick it, the statutory
14 days applies rather than a refusal. A waiver that is pre-ticked or buried in a
terms link is not a waiver, and a checkout that refuses to proceed without it is
not consent.

**Cost.** One table (or three columns on the order) and its writer, one checkbox,
tests that prove an unticked box grants the longer period and that a waiver cannot
be written after the fact. Small. The **wording** needs a lawyer; I can draft it
and mark it as unreviewed.

---

## 5. Market grain: a country, or a currency only

**What already exists and works.** `prices.market` is an ISO country code.
`resolve_course_price(course, country, currency)` takes an exact country match,
then the price that declares no market, then refuses — and a missing country does
not silently fall back to the cheapest row. `create_course_order()` re-resolves the
price rather than trusting a posted price id. `market_charges` uses the same grain
for tax and transfer fees. Audit exists: the country comes from the request on a
first purchase and from the billing account afterwards, and staff correct it in
writing.

**The choice.**

- **A. Country, exactly as built.** Uganda can be cheaper than Kenya in the same
  money. A VPN can claim a cheaper country once; after the first purchase the
  account's country is what counts, and only staff change it.
- **B. Currency only.** One price per course per currency. Simpler to explain to a
  teacher and cannot be gamed by a VPN — but it forces a single price across the
  whole CFA franc zone and across the eurozone, which is a larger distortion than
  the one it removes.

**Recommendation: keep A.** The reason local pricing exists is that a Ugandan
family pays what a Ugandan family can pay; currency-only cannot express that, and
the two biggest currency areas on the platform are also the most internally
unequal. The anti-gaming argument is real but bounded — one cheaper course per
account, corrected in writing — and it is a support cost rather than a revenue hole.

**Cost.** None: it is built and tested (`market_pricing.test.mjs`). **This one is a
confirmation, not a build** — say "country" and I record it and move on. Choosing
currency instead is one function and its tests, plus a migration of existing
`prices.market` rows.

---

## 6. What nets against what in the money report

**What already exists.** `report_money_in_reporting_currency()` groups the ledger
by transaction type and direction, converts each group at **one** rate (the window's
end), reports the rate beside every row, and lists what it could not convert. It
used to refuse to produce a net figure. **Answered 2026-11-01 — all three as
recommended, and built in `20261281012000_money_netting.sql`**, which returns a
`netting` block with two derived lines (what the platform handled, what it kept) and
each line's rule printed beside it.

**Three separate questions, each with a recommendation.**

1. **Does a chargeback offset the capture it came from?** **No.** Show it as a
   debit in the period it happened. The capture did happen; a chargeback is a second
   event with its own date and its own evidence. Rewriting the capture would also
   break the append-only ledger, which is the one thing the money code never does.
2. **Is a provider fee deducted from revenue here, or from the teacher's payout?**
   **Here — and never from the teacher's share.** This is already decided by the
   split rule: "only credits are shared; a fee is the platform's cost and tax is
   remitted." The report should say so rather than leave it to be inferred.
3. **Does a reversal belong to the period it happened in, or the one it was reversed
   in?** **The period it was reversed in.** Back-dating a row into a closed period
   makes last month's report change after it has been read, which is the single most
   corrosive thing a finance screen can do.

**Then add one derived line, and only one:** *platform net* = captures − refunds −
chargebacks − provider fees, for the period, with those two rules printed beside it
and the gross lines left where they are. That answers "what did we make" without
burying the parts the answer is made of.

**Cost.** One function change, its tests, and a line on `/admin/money-report`. The
provider-fee half has nothing to deduct until a provider exists, so it can be
written and reported as zero with a sentence saying why.

---

## 7. AI study help and recitation feedback

**What already exists: nothing but the flags, deliberately.** `learning.ai_support`
is CODE-gated on "safeguarding policy; provider chosen; cost ceiling; **must refuse
to issue rulings and refer to a teacher**". `learning.recitation` is CODE-gated on
"Quranic ASR accuracy validated; **start with letter-level makharij on short surahs
only** — a wrong correction on religious content is worse than none". There is no
table, no adapter, no prompt, no vendor in the codebase. That is the correct state
to be in, and it is worth keeping until the three answers exist.

**The three answers.**

1. **Provider.** Free tiers move monthly (Gemini, Groq and OpenRouter all have
   allowances that have changed within a year), so the recommendation is an adapter
   with a stub, and no vendor named in any table — the same shape `payments/registry.ts`
   already uses for providers that do not exist yet.
2. **Cost ceiling.** A setting with a hard daily cap, a per-learner cap, and a kill
   switch an admin can press. Enforced in the database, not in the prompt: a ceiling
   that lives in a model's instructions is not a ceiling. Free tier means the real
   ceiling is "what a free allowance permits", which is exactly the kind of thing
   that must be able to run out gracefully rather than at 3 a.m.
3. **Never issue a religious ruling.** This cannot be guaranteed by asking a model
   nicely. What *can* be guaranteed is that the platform never presents model text
   as a ruling: answers must carry a citation to a lesson the learner is enrolled
   in, an answer with no citation is not shown, and anything shaped like a ruling
   fails closed to a human referral that opens a support case. The test is the
   refusal, not the answer.

**Recommendation: build the boundary, not the bot.** Ship retrieval-only study help
first — it cites the lesson text the learner already has and offers "ask a teacher",
which files a case through the help desk that already exists. That version is free,
cannot hallucinate a ruling, and is useful the day it lands. The generative layer
comes after a provider and a ceiling number, behind its own flag. Recitation stays
off until somebody has validated an ASR against makharij on short surahs — I cannot
validate that here, and the note already says a wrong correction is worse than none.

**Cost.** The boundary is a real unit: a table for questions and citations, an
adapter with a stub, a refusal path, a settings row with a hard cap, a screen, and
tests for the refusals. The bot itself is one flag away after a provider and a
number arrive. Under the free-tier rule, the honest statement is: **retrieval-only
is free and can be built now; generative help needs a provider and a budget, and
the cheapest honest option is a free tier with a hard cap that fails closed.**

---

## 8. How long a class's progress stays readable after the class ends

**What already exists, and what it actually does.** `cohort_learner_progress()`
returns every active member of a class with their progress and last-seen date, and
`can_read_cohort_member()` admits the class creator and staff. **Neither reads
`cohorts.ends_at`.** A cohort has a start and an optional end, and the end does
nothing: a teacher keeps a register of children they taught indefinitely, and the
ledger row says so — "until then it stays readable, which is the safer default".

**The choice.**

- **A. Forever, which is today.** Nothing expires, and the promise "until then" is
  a promise to keep children's names on a roster with no end.
- **B. The class, plus a year.** Names readable while the class runs and for twelve
  months after `ends_at`; after that the same function returns the row with counts
  and no name.
- **C. Until the course is unpublished.** Ties a child's record to a decision the
  teacher makes about content, which is the wrong owner for it.

**Recommendation: B.** A teacher needs the register for reporting, for the odd
appeal about a mark, and for writing references — a year covers all three. After
that, a roster of children's names serves no purpose the counts do not serve, and
"we kept it because deleting it was a decision nobody made" is what this ledger row
currently says. Counts staying is the important half: the class's history survives,
the names go.

**If you pick B, what gets built.** One predicate — is this cohort inside its
window — read by `cohort_learner_progress()` and by the class page, with the row
kept and `display_name` withheld after the window; a sentence on the class page
saying why the names are gone; tests for both sides of the boundary and for a
cohort with no `ends_at` (which reads as "still running", not "expired").

**Cost.** Small: one function and its tests. The class list CSV inherits it
automatically, because it asks the same function — which is the argument for the
predicate living there rather than in the page.

---

## The order I would answer them in

1. **#1 and #2 together** — they unblock the two biggest switched-off surfaces, and
   both are policy-shaped rather than technical, so one sitting answers both.
2. **#8** — small, and it is the only one where the current answer is "forever by
   omission", which is not a decision anyone made.
3. **#5** — say one word and it is done.
4. **#6 and #4** — both money, both small, and #6's three answers are each one line.
5. **#3** — the legal review, which takes as long as it takes and blocks nothing
   today.
6. **#7** — a whole family, and the only one on this list where doing nothing is
   genuinely the right move until a provider and a budget exist.
