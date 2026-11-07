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

## Part 1 — Decisions and their implementation history

The subsections record decisions and dated implementation history, not a current
readiness checklist. Later progress notes supersede earlier descriptions of missing
code. `DECISIONS.md`, the current migrations and the audit at the end of this
document are the sources to check before enabling or deploying a feature.

**Owner response, 2026-11-03:** proceed with the recommendations for D1–D8.
The owner later revised several choices as listed below. Parts have been implemented;
other implementation and verification remain outstanding. Approval is not evidence
that a feature is safe to enable. In particular, D1 needs
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
- **D8:** reviewed platform help and a small model temporarily hosted on the
  owner's PC. The quiz prototype exists, but its secure remote connection and
  live model testing are not complete. The existing learner assistant remains
  retrieval-only; no paid provider has been selected.

The original recommendations below are retained for context, not as the current
answers where these differ.

### D1. Who may look at a file a child hands in, and what a teacher does with a worry

**Blocks** `learning.assignments`, `learning.cohorts`, and any reliance on the
coursework review register. Both machinery halves are built — the retention clock
and the recorded review — and `/admin/coursework` shows what nobody has looked at.
The owner has decided who may open a child's file and how concerns should reach
them. The dated progress notes below describe access and queue code that was later
implemented. End-to-end escalation, file safety and deployment verification remain open.

**Safety gate:** assignments and cohorts are deployment-gated while the access,
owner queue, file safety and deletion work remains incomplete. The migration
preserves any existing switch value; an already-enabled deployment needs an
operator to turn it off. The gate does not itself fix those safeguards.

**Media write boundary:** authenticated accounts can no longer directly insert
media rows or change their storage coordinates, ownership, purpose or lifecycle.
Checked upload and lifecycle writers remain, as do limited descriptive edits. This
migration needs deployment and does not itself fix the existing broad read/signing
paths, revoke previously issued URLs, scan files, or control storage credentials.

**Personal-data exports:** the learner, assignment, assessment and offline-device
study sections and their counts now include a learner only for their linked account
or a currently verified guardian with progress permission and unexpired consent.
This applies to all ages, independently of the general guardian switch. Other
personal records such as a caller's own invitations and guardian relationships
remain in the export. Review the separate account-closure/erasure path and other
administrative and retention paths; do not assume the entire data-rights workflow
has the same boundary. The account-closure safeguard now preserves another learner's submission when
its creator closes their account, and pauses closure for review when it would
tombstone a child with a separate login or held coursework. Affected
people are directed to privacy@ayahspring.com. This is not a complete child
retention or guardianship solution: unlinked children without held coursework can
still be tombstoned, another active family member need not be a verified guardian,
and other closure/retention and concurrency paths need review. Deploy the migrations.

**Submission write authority:** saving a draft, submitting, reopening and
removing an attachment now require the learner or a currently verified guardian
with progress permission. Only the assignment creator (the marker in the current
schema) can grade; a staff or safeguarding-owner role alone is not a grading
assignment. The stricter rule applies to all ages. Other export, retention and
administrative paths still need review. Deploy the migration; keep assignments
and cohorts off.

**Retention privacy:** hold details, storage keys, retention plans, hold and
release, and recording storage deletion are limited to the configured active
safeguarding owner. A held file cannot be recorded as purged. Storage deletion is
a human statement, not checked by the database; the form asks for an explicit
attestation. The regular platform-admin retention job still runs separately.
The scheduled coursework cleanup now locks each media row and rechecks its hold
before tombstoning. The normal harness is single-connection. On 2026-11-05, a separate
PostgreSQL 16.15 test using a minimal schema and the actual hold/cleanup functions
verified both lock orders; repeat an end-to-end test with the deployed schema
before relying on it. Other deletion paths still need review:
generic media withdrawal now refuses coursework, including historical
library files attached to submissions. Child-record cleanup now defers a child record while its attached coursework is
held and reports the deferral; it rechecks after locking the relevant assets.
Generic quarantine, other deletion paths, and historical unattached files need
review. The stored
bytes may remain, but a hold is not a complete preservation guarantee. Storage
access and historic attestations also need review. Deploy the migrations and keep assignments and cohorts off.

**Child-record cleanup:** due child records with an attached open coursework
hold are deferred, and the run reports them rather than saying nothing was due.
Other due children can still be processed. On 2026-11-05, PostgreSQL 16.15
with a minimal schema and a stub erasure function exercised both lock orders for
the actual hold/child-cleanup wrappers; repeat with the deployed schema. The owner decided on 2026-11-05 that 30-day erasure takes priority over the
ordinary one-year coursework clock unless a safeguarding hold prevents removal.
Other removal paths and concurrent operations still need review on the deployed
system; a hold is not a complete preservation guarantee. Deploy the migration.

**Coursework withdrawal:** the generic library withdrawal RPC now refuses all
coursework and historical mixed-purpose submission attachments, whether or not
held. The learner can still remove an attachment from a draft under the existing
rules; this does not delete the stored object. Requests to withdraw a coursework object outside the erasure clock require
individual review via privacy@ayahspring.com until a dedicated workflow exists. Existing uploads and objects are not changed. Apply the migration;
review orphaned uploads, quarantine and child-record cleanup separately.

**Submission read boundary:** direct assignment submission text, feedback,
revision snapshots and attachment references, plus the file-list RPC, now use
the learner, current verified guardian with progress permission, assignment author
or named safeguarding-owner rule. It applies to all ages and does not rely on
the general guardian switch. Other SECURITY DEFINER exports and write paths still
need review; this is not a complete safeguarding boundary. Deploy the migration
and keep assignments and cohorts off.

**Review privacy:** the review register and its summary are now restricted to
the separately configured safeguarding owner. Recording a review is limited to
the assignment author or that owner when they can open the file; a household or
verified guardian cannot review its own file, and conflicting historic contexts
fail closed. Other staff and guardians do not receive review state through the
submission-file list. A review is a person's attestation, not proof that they
opened a file or a complete viewing log. Other submission, retention, storage and
administrative metadata still need an access audit. Deploy the migration and web
changes, and keep assignments and cohorts off.

**Upload authority:** a new coursework declaration, confirmation or legacy
reattachment requires the actual learner or a currently verified guardian with
progress permission; the confirmer and reattacher must also be the uploader.
The check applies to all coursework, even with the general guardian flag off.
The generic staff confirmation cannot promote coursework. Deploy the migration
and updated web route. Previously issued upload links remain valid until expiry,
and the web route's size check is not enforced by direct database RPC calls;
neither path scans files. Other metadata, administrative and storage-credential
paths still need review, and assignments/cohorts remain off.

**Master-file containment:** the checked master route and ordinary media-asset
row reads now require the learner, a current verified guardian with progress
permission, the assignment author for an attached available file, or the named
active safeguarding owner. This conservative boundary applies to all coursework,
not just files currently labelled as a child's. Unattributed or conflicting
contexts fail closed except to that owner. It also covers currently attached
legacy library files, but cannot identify legacy library files after attribution
has been lost. The upload, other metadata and administrative RPCs still need a
full audit, and existing signed URLs and storage credentials are unaffected.
Deploy the migration and bootstrap the safeguarding owner; assignment and cohort
flags must remain off until all safeguarding gaps are addressed.

**Rendition containment:** lesson rendition reads and the transcode worker now
exclude coursework and currently attached legacy files, including old rendition
rows. The worker checks before downloading; existing object-store bytes and
previously issued links are not revoked. Legacy library attachments that were
already detached and lost their attribution cannot reliably be identified by this
check. Deploy the migration and updated worker; direct master access, staff
metadata paths, existing copies and other safeguarding gaps remain unresolved.

**Attachment boundary:** new assignment attachments must be declared coursework
for that submission and cannot also be lesson resources. Existing attachments
are not reclassified or deleted; older library-labelled attachments and any lesson
references to them need a careful review. This migration must be deployed and does
not fix all file-read, upload, scanning or retention paths.

**Upload-path containment:** the general library resume lookup excludes coursework,
and library multipart operations require the signed-in uploader and a live library
asset even when a staff account can read the row. This needs web deployment. It does
not change the coursework upload permission checks, revoke a previously issued URL,
or prevent a recipient from saving or copying bytes. Further file-access work remains.

**Owner concern queue:** recorded coursework concerns now appear in a queue
available only to a separately configured safeguarding owner; an acknowledgement
is recorded, not treated as resolution; acknowledged items can be revisited and
reopened. A concern repeated after acknowledgement creates a new queue item.
Existing concerns are included, including
records whose learner details have been erased, and all ages are included to avoid
losing a concern when a learner's classification changes. The queue and identity
migration must be deployed and the owner bootstrapped by a trusted database operator;
until then access fails closed. Migration 790 adds private, generic owner email
alerts when configured, but does not establish delivery confirmation or a complete
escalation workflow. Existing coursework file access and other staff review paths
have not yet been brought into line with the owner's exact access rule; the queue is
not a claim that all concern metadata or files are private to the owner.

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
shown in public previews; no speech-to-text is provided. Authors can select a
transcript as quiz source text when the local quiz feature is enabled. Lesson search can find them only for a session allowed to read them.
The deployment needs both transcript migrations. Quran sync and recitation have
separate sourcing and implementation requirements; a transcript does not complete them.

Before transcripts were implemented, a lesson had only a title, a description and
media, with no stored body text. Optional transcripts now provide authored text,
and lesson search now includes only transcripts the caller may read.

**Earlier recommendation, superseded:** no transcripts for now. The owner instead
chose optional author-provided transcripts.

### D3. The upload spend alert's number

**Blocks** `platform.cost_controls`. The 50 GB quota is built and enforced before
a byte moves. The alert is not, and cannot be honestly: it needs a price per
gigabyte or a monthly budget in a currency.

**Recommendation:** no alert. 50 GB *is* the ceiling, and an alert that fires at
80% of a cap you already enforce adds a notification and no money saved. If you
want one, give me a number and a currency and it is an hour's work.

### D4. Subscription terms

**Progress:** checkout is gated and the subscription switch is now CODE-gated
until a deployment supplies the missing behavior. The migration preserves existing
switch values; if already enabled, an operator must switch it off and review any
existing commitments. This is containment, not implementation of the terms.

**Still required:** seven-day grace, three retries then suspension, no proration,
upgrades at the next monthly renewal, and honoring the purchased price version.
Keep records on suspension. A reliable renewal worker and payment provider are
not established. Existing plans include annual intervals; their interaction with
the chosen monthly upgrade rule needs a deliberate implementation, not an assumption.

### D5. Refund authority limits

**Progress:** direct request writes are refused. New approvals require a single
explicitly configured owner account, not merely an admin role; the requester
cannot decide their own request. Until the trusted one-time owner bootstrap is
performed, approvals fail closed. The migration and setup must be deployed; old
pending approvals need review before provider action. The owner cannot approve a
request they opened, and ownership recovery/transfer has no visual workflow yet.
Approval records a pending internal transaction; it does not send money. Direct
authenticated ledger insertion is also refused; this prevents forged ledger
entries, not transfers through external systems.

`commerce.refunds` is registered, but the refund writers do not enforce its value:
switching it off does not block requests or decisions. Provider initiation,
verified callbacks and safe handling of prior approvals remain deployment gaps.

**Decision (2026-11-03):** the owner approves every refund, not the earlier
percentage-based recommendation. The requester cannot approve their own request.

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
them visually on `/admin/ai-support`. Three initial navigation articles are published. Eight additional navigation
articles are saved as private drafts for an administrator to review, edit and
publish before they can appear to learners. The owner should review and expand
the library before launch. This library contains platform instructions,
not religious rulings. It does not yet answer every AyahSpring question or generate
quizzes. The app must be connected to the PC securely before the model can serve a
separately hosted website: the current quiz prototype is loopback-only and will not
reach the owner's PC from Vercel or another host. Do not expose Ollama publicly.

**Started:** course authors can request up to three unreviewed quiz drafts from
teaching material they paste, using the local `qwen3:4b` model through Ollama on
the web server. No quiz is saved or published; a teacher must review and manually
add approved questions. Setup and the remaining limitations are in
`docs/deploy/local-quiz.md`. The switch remains off until setup and review testing.
This does not yet implement a platform-wide assistant, automatic retrieval of
multiple lessons for teachers, word of the day, or a calendar. The learner assistant remains
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

External setup is only one kind of remaining work. Providers, their current terms,
no-card signup, pricing, operational procedures and integration testing all need
verification; code, safeguarding, privacy and owner decisions also remain open.
The owner has not approved paid services.

| Need | What remains |
|---|---|
| Email provider and sending domain | Verify signup and delivery; configure SPF, DKIM and DMARC before relying on messages. |
| Phone OTP provider, if phone OTP is offered | Verify provider eligibility, charges and the working registration and recovery integration. |
| Payment merchant and payout arrangements | Choose and test a provider, settlement and country-specific tax handling; a refund approval does not move money. |
| Media storage and an ffmpeg worker | Test storage, CORS, upload, processing and playback; R2 has a free allowance but no-card signup is unverified. |
| Google OAuth client | Configure and test Google sign-in. |
| Legal and safeguarding review | Review policies, child protection and relevant market requirements; review is not replaced by an account or credential. |
| Mobile store accounts, if native apps are released | Check current store requirements and costs before committing to publication. |

See `docs/deploy/README.md` for the unverified deployment plan and free-tier limits.
No provider signup or production deployment is assumed complete.

---

## The short version

- D1–D8 have owner choices, some revised after the original recommendations. Code
  exists for parts of several decisions; the individual sections identify gaps.
- D9–D13 include product choices still needing review; don't treat a recommendation
  as an owner decision.
- A1–A5 were completed on 2026-11-02.
- Remaining work is not limited to paid services or nine accounts. It includes
  implementation, privacy and security work, testing, content, operational setup,
  licensing, owner decisions and external review.


**2026-11-05 retention decision:** When a guardian closes their account, the owner
chose the 30-day erasure exception for the child's coursework, unless a safeguarding
hold prevents it. Ordinary coursework still follows the one-year rule. The erasure code and children's policy now state that exception. Deletion of
stored bytes is a separate step that is not yet automated or verified. A separate child login
must not be silently closed with a guardian's account.

**Open-ended class retention:** Coursework in a cohort with no recorded end no
longer gets an ordinary deadline based on hand-in; the erasure exception and
holds still apply. The identified safeguarding owner can see affected class names
and counts under Handed-in files. The owner can attest a verified missing end for a closed class in that screen,
with a reason and explicit confirmation that files may become due. It is not
independent proof, and existing end dates and other states still require individual
review; do not guess. The list is paginated at 100 classes.
Deploy migrations 550 and 560. Day-based retention comparisons, other removal paths and
deployed-schema concurrency still need review. Keep assignments and cohorts off.

**Account-status authorization:** Privileged role checks now require an active,
undeleted profile as well as an unrevoked role. A suspended or closed staff member
cannot use paths guarded by these checks, including the owner retention and refund
writers; reinstatement restores an unrevoked role. This does not disable the
provider identity or cover every path: non-privileged role membership remains a
fact for screening, and learner, guardian and author authorization may rely on
identity or relationships rather than privileged roles. Review those paths and
account merge and closure beyond the named-owner boundary below. Deploy migration 570.

**Named-owner continuity:** Self-service closure and merging the absorbed account
are refused while it is the named safeguarding or refund-approval owner. A
separate manual recovery or transfer must be arranged; no visual owner-transfer
workflow exists yet. The merge preview tells only the parties to a real pending
request, and a decline remains possible. Bootstrap, closure and merge acceptance
lock the same profile. On 2026-11-05, PostgreSQL 16.15 tested both lock orders
for both appointments and both operations using the actual wrappers in a minimal
schema with stub closure and merge bodies; repeat against the deployed schema.
Existing installations with a closed/suspended named owner need operator
review. Deploy migration 580.

**2026-11-05 code audit:** The old `next lint` command failed under Next 16. It
was replaced with a focused Biome lint gate, included in CI and `npm test`. It
checks the specific duplicate and correctness hazards listed in `web/biome.json`,
not the full recommended rule set. A one-time recommended-rules run reported 110
errors and additional warnings across the web source and tests; these need
individual review before enabling that broader ruleset. No exact duplicate source
files were found in the scanned web, script and database-test code; that is not a
semantic duplicate-code audit. Dependency audit reported no known vulnerabilities
on the checked lockfile, not a guarantee that dependencies are safe.

**Playback audit:** A pending playback URL request could finish after a later
selection or unmount and overwrite the newer state. The player now cancels the
previous request, ignores late results even if abort is ignored, binds a URL to
the selected rendition and clears stale poster state. Automated tests exercise
request ordering and the component wiring; a real browser/network test is still
needed. Existing signed URLs remain valid until they expire.

**Coursework inactive-session audit:** The coursework text, revision, attachment, learner study-export
and master-file read predicates now require an active, undeleted account; learner
and guardian hand-in, author grading and coursework review writers recheck it
and hold the profile lock through the transaction. This covers those paths, not
every learner, guardian, author, personal-export section or media endpoint. Previously issued
signed URLs can still work until expiry. Deployed concurrency and live-browser
checks remain necessary. Deploy migration 590; keep assignments and cohorts off.

**Account closure wording and retained text:** Closure clears the current answer
body on the closing account's linked learner profile, but earlier revision
snapshots and attached objects can remain; the account page now says so. Review
whether the adult closure/retention and safeguarding-hold rules adequately cover
those snapshots before enabling coursework. Support-message name redaction only
matches the profile display name; it cannot establish that all identifiers were
removed. Identity removal is a separate step checked against `auth.users`; it
is not proof of deletion of all external-provider copies. Existing sessions and
previously issued signed links need a separate revocation review.

**Child login creation (2026-11-05):** The earlier attachment RPC allowed an
authenticated caller to link an existing account without proving trusted creation.
Migration 600 removed the old reservation and attachment grants; they remain
removed. Migrations 610–640 added a current verified-guardian check, a durable
attempt, a service-only completion tied to auth app metadata, retry recovery,
verified-guardian detachment and a private pending-attempt readout.

Migration 650 restores creation through the rebuilt route and changes the flag
to ADMIN + SETUP. It preserves the existing flag value, so creation resumes
when the new code and migrations are deployed if the flag was already on;
existing linked accounts are unaffected. Before production deployment, configure
the server-only Supabase service role key and test the full path in a
non-production Supabase project. Local cross-layer tests use
a simulated Auth provider, not Supabase's real API or deployed concurrency.

Pending attempts may need individual owner review; the guardian-consent page
is paginated and can complete a uniquely marked existing identity after rechecking guardian permission. Detachment itself does not delete the auth identity or revoke existing sessions; migration 730 adds a separate owner-reviewed provider deletion path for eligible marked identities, not yet tested with Supabase. Password reset remains unimplemented. If a retry recovers an earlier identity,
the original password remains in effect. The older general profile-management
predicate still needs review on its other paths. Do not delete guardian verification
machinery. No migration has been deployed as part of this work.


**Child-login erasure interaction found in audit (2026-11-05):** A local PGlite
probe created a pending `child_login_attempts` row for a child whose record was
due, then called the child-record purge. The purge returned `erased: true`, but
the attempt row (including username and guardian/learner references) remained.
Completed attempts can also remain after detachment. The existing child-record
suite's learner-reference sweep did not catch this case because its fixture had no
child-login attempt. A pending attempt can represent an Auth creation still in
flight, so blindly deleting the row could lose the only recovery marker for an
orphaned identity. Reconciliation and a privacy-safe retention/identity-removal
workflow are needed; the queue shows pending attempts, and its completion action cannot remove an identity. Do
not represent child identity data or provider accounts as fully erased. This is a
local reproduction, not a deployed-system test.


**Child-login removal tasks:** Migration 670 makes detachment and a durable removal
 task one database transaction and backfills still-present historical detachments.
The named safeguarding owner can see outstanding tasks on the guardian-consent
page and record absence only after the original Auth ID and any identity with the
expected trusted marker are absent from `auth.users`. A matching identity that
reappears makes the task visible again. Older unmarked identities require individual
review; neither the queue nor its recording button deletes a provider identity,
revokes sessions or verifies external copies. Existing rows already removed before
this migration cannot be reconstructed from `child_logins`. Task and attempt data
can still identify a child after the learning-record purge; safe cleanup and
in-flight-provider coordination remain unfinished. No migration has been deployed.


**Child-login data after learning-record purge:** Migration 680 changes the
successful purge to remove attempt and removal-task rows that name the child,
guardian or username. Before removing them it stores a private recovery marker,
a normalized-address fingerprint and, when known, an identity ID; the safeguarding
owner can view possible matching identities on the guardian-consent page. A late
provider creation remains discoverable. Held child records are not purged or
changed by this step. The fingerprint, marker and identity ID are still personal
data, and Auth identities, sessions, audit records and provider copies may remain.
The queue does not delete identities or know that an in-flight request is finished;
there is no automated cleanup of the recovery markers yet. Records already erased
before this migration need individual review; migration 690 adds an owner-only visual
queue and a hold-aware action for removing their child-linked login rows.
Local tests cover pending, completed, legacy and held cases, including a late
marked identity; deployed-schema concurrency and real Supabase remain untested.


**Earlier erased records:** Migration 690 lets the safeguarding owner find and
clean child-linked login rows left on already-erased records, through the guardian
consent dashboard. The action keeps pseudonymous recovery markers and rechecks
safeguarding holds; it cannot purge a live child record. It does not delete an
Auth identity, revoke sessions or remove recovery evidence. No migration has been
deployed; real provider and deployed concurrency testing remain outstanding.


**Owner queue pagination:** Migration 700 adds paginated private readers for
pending attempts, sign-in removal tasks, erasure-recovery markers and older erased
records. The guardian-consent page has separate navigation for each queue; existing
one-argument readers remain available. Lists can change while a person is browsing,
so refresh and revisit earlier pages after processing cases. This does not automate
identity deletion, session revocation or recovery-marker cleanup.


**Database session boundary for detached trusted child logins:** Migration 710
adds a private deny list checked by `current_user_id()`. Detachment blocks an
exclusive child identity only when a completed attempt and current Auth marker and
address match; an unmarked legacy account or one with another learner, active
family/guardian link or non-learner role is not automatically blocked. The owner
can see the status and apply the same check to a previously detached marked
identity. This blocks later database calls that use the identity helper, not every
API, every already-running transaction, existing signed URLs, provider sign-in or
provider sessions. A private ID remains in the deny list; its safe cleanup is not
automated. Provider deletion, broad authorization audit, concurrency testing and
real Supabase validation remain necessary. No migration has been deployed.


**Late completion after detachment:** Migration 720 rechecks that a completed
attempt still has its active child link before reporting an idempotent success. A
delayed retry after removal is refused instead of falsely saying the child remains
linked. This does not remove or revoke the provider identity.


**Owner-reviewed Auth removal:** Migration 730 adds a private owner action for a
verified marked, detached, exclusive child identity. A durable deletion authorization
and an `auth.users` before-delete trigger recheck the identity and conflicting use
in the deletion transaction. The server verifies the provider result and records
current database absence, including after a lost reply; an uncertain result is not
reported as success. This is locally tested with PGlite and a simulated provider,
not a tested Supabase integration. The trigger's managed-schema permissions,
full-schema concurrency, session behavior and provider cascade effects must be
verified in a non-production Supabase project before use. Legacy, changed or
shared identities still need individual review; late identities may reappear.
Private deletion authorization, recovery and session-denial records remain personal
data, and no safe automatic cleanup is implemented. No migration has been deployed.


**Coursework upload retry:** Migration 740 and the web changes let the original
uploader check a pending hand-in again without sending the bytes a second time.
A previously confirmed available attachment can also be checked again after a
lost response. The database locks the asset and refuses a confirmation if it was
quarantined, even if the attachment already exists; an incomplete or lost response
is not treated as success. Object checks verify reported size, not file safety or
checksum. Older quarantines without a recorded prior state, pending uploads whose bytes never arrived,
other media paths and real storage/deployed concurrency testing remain open. This
migration has not been deployed and does not change the assignment feature flags.


**Coursework quarantine recovery:** Migration 750 captures the previous pending
or available state when a coursework file is newly quarantined. The named active
safeguarding owner can review a paginated list, see a recorded reason and attest
release in the coursework dashboard; the file returns only to its previous state.
An original pending upload still needs confirmation. The action does not remove a
retention hold, verify object bytes, scan malware or prove the review occurred.
Historical quarantines with unknown prior state require individual review rather
than promotion by guesswork. Other moderation paths, deployed concurrency, storage
operations and real Supabase permissions remain to be tested. This migration and
UI are not deployed, and existing feature-switch values are unchanged.

**Unattached quarantined uploads:** Migration 760 keeps a quarantined upload
visible in its submission's file list even if it was never attached, so the
learner sees that it is held for review instead of seeing it disappear. The
existing submission-access and review-privacy checks still apply. This does
not scan files or release a quarantine. It has not been deployed.

**Coursework quarantine authority:** Migration 770 closes a guessed-ID path in
which unrelated privileged staff could quarantine a private coursework file.
Authorized staff who can open that file, including the named safeguarding owner,
retain quarantine; ordinary library moderation is unchanged. The check uses the
asset and actor locks but does not prove every deployed concurrency interleaving.
No migration is deployed, and this change does not scan or delete objects.

**Open safeguarding queue:** Migration 780 adds keyset pagination, allowing the
owner to see later open concerns without acknowledging earlier ones merely to
reach them. Timestamp ties use the review ID, and the original reader remains
available. Lists can change, so revisit earlier pages. This is not an email alert,
delivery receipt or resolution, and has not been deployed.


**Private concern alerts:** Migration 790 creates a separate private alert
register, not the staff-visible message outbox. New and previously unacknowledged
concerns can prompt a generic email to the current active owner's verified Auth
address when the email provider, service-role key, notification flag and scheduler
are configured. The message contains no child, concern or file details. The owner
can see pending, in-flight, failed or provider-accepted status and retry a failed
alert visually; the provider's reference is not proof of delivery or receipt.
A lost reply may cause a duplicate; an acknowledgement or owner change during an
in-flight provider request cannot recall that request. Scheduling frequency, free
provider limits, actual delivery and real Supabase role/lease behavior need a
non-production test. No alert or migration has been deployed. This does not complete
same-day escalation, file scanning or storage deletion.


**Safeguarding alert history:** Migration 800 keeps a private append-only
record of alert state changes and provider references even when a concern is
reopened or an alert is retried. The owner can browse the history visually;
the journal does not contain the address or case text. Prior transitions cannot
be reconstructed if dispatch ran before the migration. These pseudonymous
records are personal data, and no retention or automated deletion process for
them is implemented. Provider acceptance is not delivery or receipt. This has
not been deployed or verified on a real Supabase project.

**Staff storage overview:** Migration 810 excludes coursework and currently
attached or declared legacy coursework from per-uploader library aggregates.
The dashboard labels the figures as only the library portion; actual upload
allowances still count all applicable master files. Detached legacy files with
no remaining attribution cannot be classified reliably. This change does not
protect storage credentials, bucket listings, or establish actual object size.

**Multipart cleanup:** Migration 820 prevents the direct library abandonment
RPC from writing private coursework keys and sizes into the staff-visible
shared governance audit, including for currently attached legacy files. It does
not remove any historical audit entries. Migration 830 restricts the staff unfinished-multipart listing to exact
bucket/key matches for library assets; the named safeguarding owner may inspect
unrecognized entries, which cannot be ended in the library interface. Old audit
entries are not repaired. Database authorization cannot hold an asset lock
across a later external storage request; concurrent attachment and abort behavior
requires a separately designed guard and live verification. Unattributed legacy
files cannot reliably be identified as coursework. Bucket lifecycle expiry must
be configured and verified rather than assumed.

**Deletion statements:** Migration 840 rejects a coursework deletion statement
for a library asset. The owner interface now treats an interrupted or ambiguous
response as unknown and asks for a register check before retrying. A recorded
statement remains unverified; the legacy shared audit action name says
`coursework_bytes_deleted` even though it records only an owner's statement.
Historical audit records and actual object deletion have not been verified.

**Shared audit privacy:** Migration 850 restricts historic and future coursework
and concern events in the shared audit to the named safeguarding owner, and
filters the security-signals definer aggregate by the same boundary. Ordinary
library moderation events remain visible to staff. The audit entries themselves
are not removed; previous exposure and unattributed historical media cannot be
undone or reliably classified. Other database definer paths and real deployments
still require audit; storage credentials are outside this RLS boundary.

**Storage queue access:** Migration 860 gives the safeguarding owner a
keyset-paginated visual storage register, so held or unresolved entries on the
first page no longer make later entries unreachable. Entries can move as holds
or statements change; a fresh first-page review may be needed. Migration 870 also pages the owner hold register, including when multiple
holds share a timestamp. These pages do not delete or verify objects.

**Review form and repeat review:** The owner can open an already-reviewed file,
record another review and place a hold from that row. Review responses now
report network or malformed-reply ambiguity instead of claiming failure or
inventing a clear result. The form says email alerts may be sent only when
configured and are not proof of delivery; staff must still contact the lead
directly. Migration 880 pages the owner review register rather than stopping
after its first 200 files; a fresh first-page review is needed when files change
state while browsing.

**Held coursework byte deadlines:** newly opened holds preserve any existing
storage-deletion deadline and restore it on release, even if it has passed.
Historical holds did not capture the deadline; where none is known the system
still assigns thirty days after release, so the owner must review those cases
individually rather than assume that date satisfies the closure-erasure decision.
Neither the deadline nor an owner's statement removes or verifies stored bytes.
Apply the migration and test against the deployed system and object storage.

**Storage queue hold warnings:** the owner page now identifies open holds on
queued objects and suppresses the deletion-statement action while held. Hold
status is a point-in-time view and can change; neither the screen nor the
statement can prevent or verify independent object-store operations. Review the
hold immediately before acting. Deploy and test against the hosted system.

**File-opening cache controls:** the application responses containing signed master,
playback and download addresses request private, no-store handling; the coursework
redirect already does so. This does not control copies made by an authorised reader
or prove how the object-storage response itself is cached. Verify actual R2 response
headers and intermediate caches in the deployed environment before relying on them.

**Batched database regression:** frozen revision `feb0274` ran all 170 database
suites in their normal order within eight fresh PGlite databases (22 suites in each
of the first seven batches, 16 in the last): 2,625 assertions passed and none
failed. The normal test-only coursework and guardian-fixture settings were retained.
This covers the migrations at that revision, including the hold-status storage
queue. It is not the single shared-database run: interactions between suites in
different batches are not exercised. PGlite also does not prove concurrent hosted
PostgreSQL, Supabase Auth, storage or provider behavior. The earlier shared run was
interrupted and has no final result.

**Revision-file provenance:** the local migration preserves private asset-ID
provenance for legacy library-labelled files still referenced by a current
attachment, declaration or revision, and captures future legacy references. This
keeps such files out of ordinary library playback, staff listings and generic
withdrawal even after those references disappear. A current single revision
context permits the learner, verified guardian, assigned marker and named owner to
open the file; multiple contexts fail closed except to the owner. An owner-only,
paginated review list identifies surviving mixed-use evidence without changing or
deleting objects or lesson references. Existing lesson playback for a mixed file
may be restricted for privacy and needs individual review. The asset-ID evidence
is still personal data and needs a verified cleanup route. Historic use whose
references had already disappeared before migration cannot be reconstructed.

**Child revision erasure (local migration 920):** the record purge can remove
append-only revisions only inside a private transaction-scoped erasure capability.
It locks submissions and referenced assets, rechecks holds on attachments,
declarations and snapshots, and queues exclusively attributable coursework
objects immediately. Shared and legacy-library objects are not automatically
deleted: a private owner review register retains their learner and asset IDs,
which are still personal data. Ordinary retention also avoids known shared or
review-flagged objects. The local PGlite regression covers a real marked and
reopened revision, a detached snapshot hold, release, pending uploads, mixed-use
exceptions and ordinary revision protection.

**Shared child-erasure cases (local migration 950):** a later child purge
now preserves an earlier unresolved review of the same file, records the later
child's own review context, and does not claim nothing remains. A local test
exercises both the purge update and attachment-cascade paths. This is still an
unresolved individual review, not storage deletion or full erasure.

**Guardian closure (local migration 930):** the last-guardian precheck also
locks submission and referenced asset rows, then rechecks holds on attachments,
declarations and revisions. Local tests cover snapshot-only and pending-upload
holds, release, and the existing account and child-record behavior. Hosted
PostgreSQL concurrency and lock ordering remain unverified.

**Detached coursework retention (local migration 940):** the private clock now
includes surviving declarations and revision references as well as current
attachments, grouped by asset and submission. The latest known reference is a
conservative anchor; an open-ended class still has no ordinary deadline. Held
files remain held, and a file referenced by multiple submissions is excluded
from automatic expiry even when they belong to the same learner. Local tests
cover pending and detached files, holds, newer revisions, invalid JSON and a
multi-submission conflict. Cleanup rechecks under submission and asset locks;
some existing upload-confirmation paths take these locks in the opposite order,
so PostgreSQL may abort a conflicting transaction and the real deployment needs
concurrency testing and retry review. The PGlite test does not prove interleavings.

**Shared retention review (local migration 960):** due coursework files that
are skipped because of multiple contexts, lesson use or an unresolved erasure
review appear in a separate, paginated owner-only list. Retention due and held
counts now count distinct files rather than submission rows. The list identifies
cases; the later guarded action described below can queue an eligible case but
does not delete stored bytes. Local tests
cover owner access, pagination boundaries, holds and distinct held counts.

**Reviewed erasure actions (local migration 970):** the safeguarding owner can
visually queue an available coursework-purpose exception when no surviving
submission, declaration, revision, lesson, rendition, hold or duplicate object
key is found. After separately recording a storage-deletion statement, the owner
can remove each learner-specific review entry. These actions do not delete bytes
or verify the statement, remove all audit information, or prove complete erasure;
reasons remain in a restricted audit. Pending, quarantined, legacy library,
shared or otherwise ambiguous cases are refused for separate handling. Local
regressions cover denial, holds, quarantine, pending files, duplicate keys,
multiple child entries, retry behavior and the statement boundary.

**Still open:** legacy mixed-use exceptions, shared files with surviving uses,
and shared cases that are not yet due or have separate erasure, lesson or storage
issues do not yet have full resolution workflows.
Historical cases without surviving references cannot be identified reliably.
Storage tombstones and owner statements are not proof of byte deletion; external
object-key reuse after a check, hosted PostgreSQL concurrency and storage remain
unverified.
Existing links and external copies cannot be recalled.

**Legacy-provenance regression:** frozen revision `9672670` ran all 170 database
suites in eight fresh PGlite batches: 2,627 assertions passed and none failed.
A separate upgrade probe applied the migration to a prior schema with both an
existing attachment and a snapshot-only legacy file; both were classified as
coursework. The batches do not test cross-batch fixture interactions, real
PostgreSQL interleavings, hosted Supabase or object-storage behavior.

**Current frozen database regression:** revision `ac58a2f` ran all 170 suites
in eight independent fresh PGlite databases: 2,632 assertions passed, zero
failed. This includes local migrations 920–960 but is not a shared-database,
hosted Supabase, object-storage or PostgreSQL concurrency test. An additional
exploratory order that put course assignments after the coursework review suite
failed five assertions because those suites assume different global flag and
owner fixtures; the normal frozen batch order and the isolated assignments suite
passed. The affected coursework suites now restore their original flags and safeguarding owner in `finally` blocks. The alternative shared-database order was rerun with 149 assertions passing, including the five that failed before; broader ordering and hosted behavior remain separate questions.

**Reviewed-erasure regression:** frozen revision `148ef1c` ran all 170 database
suites in eight independent PGlite batches: 2,632 assertions passed and none
failed. The new visual action also passed the 120-assertion shared coursework and
RPC batch, 2,123 web tests, lint, typecheck, repository checks and build. This
is not evidence of hosted concurrency, object-store deletion, or safe resolution
of the legacy and still-shared cases the action deliberately refuses.

**Fixture-isolation regression:** frozen revision `a96dd20`, including the
suite cleanup changes, passed all 170 database suites and 2,632 assertions in
eight independent PGlite batches. The previously failing alternative shared
order passed 149 assertions in one PGlite database. Neither run establishes
hosted concurrency or provider behavior.

**Storage-key collision audit (local migration 980):** the master-location
unique index excludes tombstones, so another asset can subsequently name the
same bucket/key. The owner storage page now shows the backend and flags known
same-key records or extra renditions for individual review; a routine deletion
statement is refused while those database conflicts remain. Older RPCs still
exist for compatibility, so older clients do not show the warning. The check
is conservative across backends and is only a database snapshot: another object
or reference can appear after it, and it cannot stop external storage deletion.
If a conflicting object was already deleted, use the incident register rather
than treating it as routine cleanup. A local regression covers an active key
collision, a historical rendition, refusal and the non-conflicting path; the
150-assertion alternative shared coursework batch and 2,124 web tests passed.
Hosted concurrency, cross-provider location identity and actual bytes remain
unverified.


**Shared retention action (local migration 990):** after individual review, the
safeguarding owner can queue a coursework master only when every surviving
submission context is due and none has a hold, lesson use, separate erasure
review or known storage conflict. The action locks submissions and the asset,
rejects a context set that changed while waiting, and records a private reason.
This is a tombstone and queue entry, not a verified object deletion. Pending or
quarantined and older library files remain separate; hosted concurrency and
external storage changes remain unverified. The alternative shared coursework
batch passed 150 assertions and web tests passed 2,125.

**Storage collision regression:** frozen revision `b2000e0` passed all 170
database suites and 2,633 assertions in eight independent PGlite batches. It
covers migration 980, not the later shared-retention action (990), and is not a
hosted PostgreSQL or object-storage test.

**Shared-action regression:** frozen revision `8e04521` passed all 170 database
suites and 2,633 assertions in eight independent PGlite batches, including
migration 990. This is not a multi-session or hosted storage test.

**Erasure review collision recheck (local migration 1000):** both the queue and
review-entry removal actions now use the same conservative cross-backend key and
rendition check as the storage queue. A collision discovered after a deletion
statement prevents removal of the child-specific review entry. Local tests cover
both newly discovered collisions; the 150-assertion alternative shared batch,
repo check, typecheck and lint passed. External changes and hosted concurrency
remain unverified.
