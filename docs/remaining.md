# What is left

Three different things get called "remaining", and confusing them is how a
session spends a day building something nobody asked for. So:

- **A decision** — only you can make it. Code, content or policy is blocked
  behind it, or a switch sits off until it is answered.
- **An adjustment** — nobody has to decide anything. A document, a sentence or a
  flag row disagrees with the software, and I fix it.
- **An account** — not a decision and not code. A credential, a licence or a
  provider that has to exist before something can be switched on.

Measured at `84df989`, 2026-11-02: **231 migrations**, **2 517 database
assertions in 166 suites**, **2 026 web tests**, **142 tables**, 109 rows in
`platform_settings` — 93 boolean feature flags and 16 controls. **Two flags are
on**: `platform.withdrawal_right` (a statutory right, CODE-gated so it cannot be
switched off from a dashboard) and `family.guardian_verification`.

---

## Part 1 — Decisions that block code that is already built

**Owner response, 2026-11-03:** proceed with the recommendations for D1–D8.
The choices below are approved; implementation and verification remain outstanding.
Approval is not evidence that a feature is safe to enable. In particular, D1 needs
its file-access paths and same-day escalation verified before assignments or cohorts
are enabled; in-app notification creation alone does not prove the owner received it.
D4 and D5 require enforcement, not just terms. D7 and D8 remain deferred as described.

**Revised owner answers (2026-11-03):** The answers below supersede the original
recommendations wherever they differ. Implementation and verification remain open.

- **D1:** marker and owner access (alongside the learner and verified guardian);
  an owner queue now, with an email alert when a provider is configured. A queued
  alert is not proof of delivery or receipt.
- **D2:** optional author-provided transcripts, rather than no transcripts.
- **D3:** alert at 80% of a monthly storage budget. The amount and currency have
  not yet been supplied; estimated costs also need a price source.
- **D4:** the recommended subscription terms.
- **D5:** owner approval for every refund, with the requester unable to approve
  their own request. Approval is not a transfer.
- **D6:** allow learners and authors to reply, subject to moderation.
- **D7:** prioritize all four features; sources, licences, calculation methods
  and scholarly accuracy still need to be established.
- **D8:** include quiz generation; investigate free, no-card or self-hosted
  providers without paid usage. The existing retrieval-only support boundary
  remains; no provider has been selected.

The original recommendations below are retained for context, not as the current
answers where these differ.

### D1. Who may look at a file a child hands in, and what a teacher does with a worry

**Blocks** `learning.assignments`, `learning.cohorts`, and any reliance on the
coursework review register. Both machinery halves are built — the retention clock
and the recorded review — and `/admin/coursework` shows what nobody has looked at.
What is missing is a paragraph: who may open a child's file, and what a teacher
does when what they see worries them.

**Safety gate:** assignments and cohorts are deployment-gated while the access,
owner queue, file safety and deletion work remains incomplete. The migration
preserves any existing switch value; an already-enabled deployment needs an
operator to turn it off. The gate does not itself fix those safeguards.

**Implementation started, 2026-11-03:** `20261281027000_coursework_review_note.sql`
fixes a loss of information: a second concern by the same reviewer with different
wording is now appended, not mistaken for a double-click. The same normalized note
still deduplicates, and audit entries do not copy the note. This is not delivery
or owner acknowledgement. The switches remain off pending the access and escalation
work described above.

**Recommendation:** the marker and the owner; a concern is recorded on the file
with a sentence and goes to you the same day; the file is never forwarded, never
shown to another learner's family, and never copied out of the platform. Written
into the safeguarding policy as a new version, not an edit.

### D2. Do lessons carry transcripts?

**Progress:** optional author-provided text can be edited on a draft lesson,
reviewed by assigned reviewers and read by entitled learners. It is copied into
new draft versions and remains frozen after submission. Transcripts are not yet
included in search, public previews or the quiz generator; no speech-to-text is
provided. The deployment needs the transcript migration.

**Blocks** the rest of `platform.search`, plus`learning.quran_sync`,
`learning.recitation` and the "transcripts are not part of it" limit on notes.

Before transcripts were implemented, a lesson had only a title, a description and
media, with no stored body text. Optional transcripts now provide authored text,
but they are not yet searchable.

**Recommendation:** no transcripts for now. Everything that *is* text is already
searchable behind `learning.lesson_search`. Leave the flag as the honest record of
a promise not made, and stop treating it as a build.

### D3. The upload spend alert's number

**Blocks** `platform.cost_controls`. The 50 GB quota is built and enforced before
a byte moves. The alert is not, and cannot be honestly: it needs a price per
gigabyte or a monthly budget in a currency.

**Recommendation:** no alert. 50 GB *is* the ceiling, and an alert that fires at
80% of a cap you already enforce adds a notification and no money saved. If you
want one, give me a number and a currency and it is an hour's work.

### D4. Subscription terms

**Blocks** `commerce.subscriptions` and the automatic renewal worker.

Four questions: the grace period after a failed charge (per market?), whether a
plan change is prorated, what a renewal does to a price agreed under an older
version, and how many retries before suspension.

**Recommendation:** 7-day grace, no proration (month-to-month only, upgrade at the
next renewal), renewal honours the version it bought, three retries then suspend,
and nothing is deleted on suspension — access ends, the record stays.

### D5. Refund authority limits

**Blocks** `commerce.refunds`. The mechanism, the two-person rule and part-refunds
all ship; what is undefined is who may approve how much, and when it escalates.

**Recommendation:** `finance_admin` alone up to 25% of an order; above that or
anything already accrued to a teacher needs `platform_admin` as well; any refund on
an order a staff member opened still needs a different person from the opener
(that part is already enforced).

### D6. Discussion — who answers

**Progress, 2026-11-03:** Learner replies already go through the moderation
queue; course-author posts appear immediately. The author can now open the
live thread from the preview of a published lesson when discussion is enabled,
without enrolling as a learner. Readers can report a visible reply, and the report
writer checks the post visibility before accepting it. This does not itself approve the moderation
policy or turn the feature on; deployment and an end-to-end moderation review
remain necessary.

**Blocks** `learning.discussion` and `platform.moderation`. The thread, the report
route and the moderation queue all exist.

**Recommendation:** at launch, learners ask and *the course author answers*;
peer-to-peer replies off. A teacher with an audience behind them needs one queue,
not two. `teaching.qa_capacity` (a cap on open questions per teacher) becomes worth
building the day there are more than 30 learners on one course.

### D7. Companion and worship content — four decisions, one shape

**Blocks** `companion.ayah_daily`, `learning.quran_sync`, `companion.prayer_tools`,
`platform.calendar`.

- Ayah of the day needs **audio and tafsir licensing** — whose recording, whose
  translation.
- Quran sync needs a **timing dataset**, licensed or generated.
- Prayer times need a **calculation method** per region and a position on whether
  a location is stored, derived, or asked each time.
- The Hijri calendar needs a **source**, because a calculated date and an observed
  date differ by a day and somebody will notice.

**Recommendation:** do none of these before the first paid course. Each is a
licensing and scholarly-accuracy question, and a wrong prayer time is worse than no
prayer time — the platform's own rule about religious content.

### D8. AI — provider and cost ceiling

**Owner choice:** use reviewed, non-generative platform help for everyone, and
run a small model on the owner's computer temporarily while a separate server is
considered. `/support` now searches published help articles; platform admins manage
them visually on `/admin/ai-support`. Three initial navigation articles are included;
the owner should review and expand them before launch. This library contains platform instructions,
not religious rulings. It does not yet answer every AyahSpring question or generate
quizzes. The app must be connected to the PC securely before the model can serve a
separately hosted website: the current quiz prototype is loopback-only and will not
reach the owner's PC from Vercel or another host. Do not expose Ollama publicly.

**Started:** course authors can request up to three unreviewed quiz drafts from
teaching material they paste, using the local `qwen3:4b` model through Ollama on
the web server. No quiz is saved or published; a teacher must review and manually
add approved questions. Setup and the remaining limitations are in
`docs/deploy/local-quiz.md`. The switch remains off until setup and review testing.
This does not yet implement a platform-wide assistant, automatic lesson retrieval
for teachers, word of the day, or a calendar. The learner assistant remains
retrieval-only. No model performance has been tested on the owner's machine.

**Blocks** `learning.ai_quiz_gen`, and the answer half of `learning.ai_support`.
The support boundary is built and needs no provider: retrieval from the learner's
own enrolled lessons, no citation means no answer, a ruling-shaped question fails
closed to a teacher as a support case.

**Recommendation:** leave quiz generation off. Ship the retrieval-only assistant
behind `learning.ai_support` when you are ready to answer the cases it escalates,
because that is the only part that costs you time rather than money.

---

## Part 2 — Decisions about the product, not about code

These do not unblock a build; they decide what the build is for. The first is the
one that makes "done" mean anything.

### D9. First release scope and success criteria — the only open Phase 1 task

`ROADMAP.md` has carried this as the single open task since day one. Everything
else in this file is smaller than it: without it, "built to completion" has no
edge, and every session is free to pick its own next unit.

**Recommendation:** v1 is **one published course, one teacher, one real learner,
and the money path tested end to end in a sandbox**. Success is: a stranger
finds the course, buys it (or is sponsored), studies it, finishes it, and holds a
certificate that verifies. Everything else ships off. That is a scope a single
person can finish and a milestone you can look at.

### D10. What the first courses are

Who authors them is decided (you and teacher friends). Which ones is not. It
determines what `learning.paths` content looks like and what the catalogue has to
show on day one.

**Recommendation:** one short course you can teach from memory — a fiqh or tajweed
basics course of eight to ten lessons — because the first course is a demonstration
of the whole machine, not a curriculum.

### D11. Which five screens to design first

50 inventoried, 0 designed, and every screen currently uses the shared card and
badge vocabulary, which is consistent but undesigned.

**Recommendation:** `/` , `/courses/[slug]`, the lesson page, `/learn`, and the
certificate. Those five are the whole journey a stranger takes, and designing them
first means the rest inherit a real type scale instead of inventing one.

### D12. Price floors and ceilings per market

`teaching.set_pricing` waits on this and on the same facts as checkout. Without a
floor a teacher can price a course at 1 UGX; without a ceiling a market has no
protection from a price that reads as a mistake.

**Recommendation:** a floor of one hour of local minimum wage and no ceiling —
the floor is the one that prevents harm, and the market already caps what anyone
will pay.

### D13. The help desk's promise

`platform.support` needs two sentences: who answers, and how long a case is kept
(the retention clock is built and already deletes three years after a case closes).
**Recommendation:** you answer, first reply within two working days, and the
three-year clock is right.

---

## Part 3 — Adjustments I should make, needing no decision

These are defects in the record, not gaps in the software. Each is small and each
makes a document stop lying.

### A1. Seven flags with no written precondition — **done 2026-11-02**

`FLAGS.md` states its own rule: *a flag with no written precondition is a bug
waiting to be enabled.* Seven rows carried an empty `preconditions` field:
`commerce.free`, `family.profiles`, `learning.progress`, `platform.audit`,
`platform.maintenance_mode`, `teaching.dashboard`, `teaching.invites`.

This entry first said nine, and it was wrong twice over. Two of the nine —
`governance.panel_required` and `governance.scholar_board_active` — are *controls*,
not flags: they carry a value and their `description` says what it decides, and
both are enforced by a trigger rather than by a switch. And the sentence "six of
those seven gate nothing at all" was too generous to `learning.progress`, which
does gate something real.

Checked one at a time against the tree, the seven split three ways: one gates a
screen (`learning.progress` — a UI gate only, since `record_lesson_position()`
writes the position regardless), five name work that shipped
(`family.profiles`, `teaching.dashboard`), duplicated another key
(`teaching.invites`), or never had anything behind it (`commerce.free`,
`platform.audit`), and one was never built and could not be a toggle
(`platform.maintenance_mode`). `20261281025000` wrote the precondition for the
first and removed the other six; the check that found the seventh —
`platform.terms_versioning`, whose precondition claimed readiness while nothing
read the key — is `supabase/tests/register_truth.test.mjs`.

**The rule that came out of it:** a flag may be unread only while its precondition
says what is missing; a row that claims it is ready must be read by code. That is
now enforced, so this defect cannot return quietly.

### A2. Ten more stale preconditions — **done 2026-11-02**

Promotions, the storage quota and lesson search were corrected on 2026-11-02.
Ten more named work that had shipped. This entry said eight; it listed ten.

| Row | Said | Is |
|---|---|---|
| `platform.admin_settings` | "Must be built **first**" | `/admin` and `/admin/settings` are the switchboard — **row removed** |
| `learning.certificates.simple` | "Template chosen; certificate numbering scheme" | `certificate_number_seq`, `template_version`, and the real gate is per course: `certificate_enabled`. **Row removed** |
| `learning.certificates.verification` | "Verification page deployed; token format fixed" | `/verify`, `/verify/[number]`, revocation with a reason. There is no token: the number *is* the capability. **Row removed** |
| `teaching.authoring` | "Authoring flow tested; media upload limits" | 8 GiB per file and 50 GB per account, both enforced; the quota the sentence still called missing shipped in `20261229000100`. **Row removed** |
| `learning.provenance` | "needs a UI, not a schema" | corrected — `content_sources`, the route, the editor and the learner's line |
| `learning.audience_sections` | "Learner switcher designed" | **wrong twice**: it is not the switcher, which does not exist, and what it gates are the audience doors `/adults` and `/young` — corrected |
| `learning.age_bands` | "Bands chosen" | corrected — five values, as a check constraint |
| `platform.data_export` | "cheaper than retrofit across 85 tables" | corrected — JSON, CSV, print and a restore all ship; what is left is PDF |
| `delivery.analytics` | "Decide who reads the report" | corrected — decided (staff) and refused by name in three functions |
| `learning.ai_support` | "provider chosen; cost ceiling" | corrected — retrieval-only, no provider, no invoice |

**Fix:** `20261281026000` rewrites six rows and removes four, and
`preconditions_proved.test.mjs` holds each surviving sentence to the mechanism it
names — the constraint's five values, the refusal string in `pg_proc`, the quota
asserted before a byte moves. Four rows went rather than being reworded because
their true sentence is *there is nothing here to switch*: the feature shipped, it
is on for everybody, and a row saying otherwise tells the owner a control exists
that does not.

### A3. `ROADMAP.md` was quoting day-one numbers as current facts — **done 2026-11-02**

It said **47 flags**, **85 tables**, **121 endpoints** and "38 screens unblocked",
with a progress line reading *11 done · 9 part · 16 todo · 13 blocked · 4 conflict
(53 total)*. Measured on 2026-11-02: **80 flags and 18 controls**, **159 tables**
with RLS on every one and 282 policies, **128 page routes and 115 route handlers**,
and a checklist of **59** rows split *20 · 21 · 7 · 6 · 5* — the header was wrong
about the total before it was wrong about the split.

The `[X] CONFLICT` rows were worse than stale, and there were **five**, not four:
each recorded a conflict that had been **resolved**, so they invited a future
session to reopen closed decisions. All five now carry the date that ended them —
2026-10-15 for worldwide-not-Uganda-first and for the panel (P6), 2026-10-22 for
expansion-by-price-market, 2026-10-26 for applications, 2026-10-27 for the panel
machinery being built dormant. The fifth was never a conflict at all: *"Test all
roles and complete user journeys"* described finished work and had been marked
`[X]` by mistake, which is why the header counted five and the section below it
listed four.

**Fix:** `ROADMAP.md` recounted, its phase headers re-derived from its own rows
(they said 6/6 and 5/6 for phases that are 5/6 and 3/6), and a check added to
`scripts/repo-check.mjs` that fails when the progress line and the marks disagree —
the specific defect here was a header nobody counted.

### A4. The screen count disagreed with the tree — **done 2026-11-02**

`SCREENS.md` quoted **121 page routes** from a production build while **128**
`page.tsx` files sat on disk, and the difference had never been explained. It
turned out not to be a difference at all: the two numbers were not measuring the
same thing.

**121 was app routes** — pages and route handlers together — measured on
2026-10-22, when the tree held 63 pages and 57 handlers. `NEXT.md` records it in
exactly that unit (*"121 app routes"*). It was later quoted in `SCREENS.md` as
"121 page routes", so it was wrong in kind before it was wrong by seven.

**The three files it excluded were never page routes.** `/sign-out` and
`/auth/confirm` are `route.ts` handlers; the not-found page is `not-found.tsx` in
the app root, which Next serves as `/_not-found` and which no `page.tsx` produces.
Subtracting them from a count of `page.tsx` files was a second arithmetic error on
top of the first. Today: **128 page routes**, every one of them a screen, plus
**115 route handlers**; no duplicates, no parallel or intercepted routes, no
`_`-prefixed folder hiding a page. So the answer to *which files are not routes* is
**none** — there is no exception to state.

The reconciliation also found four pages that were routed and documented
**nowhere**: `/account/export/print`, `/account/restore`, `/admin/promotions` and
`/teach/promotions`. All four are now rows in `SCREENS.md` §11, which also said
"50" while holding 66.

**Fix:** the counts corrected, the four rows added, and `scripts/repo-check.mjs`
now fails when a `page.tsx` is not named in `SCREENS.md` — accepting the three
ways the file cites a route — and when the stated count is not the number of pages.

### A5. The register has never been read end to end in one pass — **done 2026-11-02**

Everything in Part 3 was found by reading rows against code. Nothing in CI did
that: `flags.test.mjs` proves `FLAGS.md` and `platform_settings` **agree with each
other**, which is precisely why two rows can agree and both be wrong.

**Fix:** `supabase/tests/register_truth.test.mjs` — eight checks, each failing with
the row's key and the name it could not find:

1. **No switch waits on a precondition nobody wrote**, and a row claiming readiness
   must be read by code (`FLAGS.md`'s own rule, finally enforced).
2. **Every bare identifier in backticks exists** in the schema — relations,
   columns, functions, types, enum labels, check-constraint literals and role
   codes, in one vocabulary.
3. **Every `name()` exists** as a function.
4. **Every route exists** as a page or a handler, with `[param]` matched as a shape.
5. **Every setting key exists** in the register.
6. **Every table named as a table exists.**
7. **Every source file named** (`lib/digest.ts`) exists in the tree.
8. **Every migration named in a document** is a file, across seven documents.

Not hypothetical: run against the real defect that started this, it fails with
*`platform.search → lesson_bodies`* and *`platform.search → lib/search-engine.ts`* —
an invented column and an invented file, which is exactly the shape of the sentence
that sent a reader to index something no lesson has.

Two of the eight were written before A1 rather than after, deliberately: the check
converted a page of notes into measurements and found the seventh blank row
(`platform.terms_versioning`) that the notes had missed. The order of the units is
in the report; the order of the reasoning was the other way round.

---

## Part 4 — Not decisions: accounts, credentials and licences

Nothing here can be finished by writing code, and none of it needs an answer from
you today beyond "when".

| Need | Blocks | Cost |
|---|---|---|
| Email provider + sending domain (SPF, DKIM, DMARC) | password reset, receipts, invites, every notification | free tier exists (Resend: 3 000/month) |
| SMS provider | phone OTP at registration and recovery | paid per message; the only per-message cost in the platform |
| Payment merchant account + sandbox | checkout, mobile money, real money of any kind | free to open; settlement terms vary |
| Cloudflare R2 credentials + one CORS rule | every video and audio byte | free tier: 10 GB, 1 M operations |
| A host for the transcode worker with ffmpeg | first-party media playback | free tier possible; needs a always-on process |
| Payout provider + a tax treatment per country | paying teachers | cannot be waived; this is the one real money question |
| Google OAuth client | Google sign-in | free |
| Legal review of the seven policy documents | the children's policy, the withdrawal wording, the scholarship terms | paid, or a favour |
| App Store $99/yr and Play $25 once | the mobile app | one-off + annual |

The one judgement call in that table is the SMS provider: it is the only item where
a per-message cost is unavoidable, and until it exists the phone-code path shows a
form that cannot complete.

---

## The short version

- **Eight decisions** unblock code that is already written (D1–D8). The owner
  approved the recommendations on 2026-11-03; implementation remains outstanding.
- **Five decisions** shape the product rather than the code (D9–D13), and D9 —
  first release scope — is the one that makes the other twelve finite.
- **Five adjustments** I can make without asking anything (A1–A5), and two of them
  are the same defect I fixed twice today: a sentence in the register that outlived
  the reason for it.
- **Nine accounts and licences** are the only genuinely external blockers.

Part 1 is approved and awaits implementation. Part 2 still needs the owner’s
product choices.
