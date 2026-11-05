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
them. The access, escalation and file-safety mechanisms still need implementation
and verification.

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
tombstone a child with a separate login or any assignment submission. Affected
people are directed to privacy@ayahspring.com. This is not a complete child
retention or guardianship solution: unlinked children without submissions can
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
the actual hold/child-cleanup wrappers; repeat with the deployed schema. The
account-closure and cleanup changes do not settle the conflict between the existing thirty-day erasure clock
and the chosen one-year coursework period. Review the retention rules, other
removal paths and concurrent operations on the deployed system; a hold is not a
complete preservation guarantee. Deploy the migration.

**Coursework withdrawal:** the generic library withdrawal RPC now refuses all
coursework and historical mixed-purpose submission attachments, whether or not
held. The learner can still remove an attachment from a draft under the existing
rules; this does not delete the stored object. Requests to withdraw a coursework
object require individual review via privacy@ayahspring.com until a dedicated
workflow exists. Existing uploads and objects are not changed. Apply the migration;
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
until then access fails closed. No email alert, delivery confirmation or escalation
workflow is connected. Existing coursework file access and other staff review paths
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


**2026-11-05 retention decision:** When a guardian closes their account, the owner
chose the 30-day erasure exception for the child's coursework, unless a safeguarding
hold prevents it. Ordinary coursework still follows the one-year rule. The software
and policy wording must be reconciled with that decision; deletion of stored bytes
is a separate step that is not yet automated or verified. A separate child login
must not be silently closed with a guardian's account.
