# NEXT

One current milestone. One current sentence. The implementation history follows
for context; the counts in that historical log are snapshots from their dates.

## Current status

Learning paths, source provenance, public teacher profiles, gated lesson
previews, course-version copying, curriculum reordering and teacher assessment
authoring are implemented.
Teachers curate paths in `/teach/paths`, cite material from the draft
curriculum, prepare shareable profiles at `/teach/profile`, mark preview
lessons/resources, create a new draft from a published version, and reorder
sections, lessons and content with audited up/down controls. Authors can create
and activate assessments and add automatically graded choice/true-false
questions; answer keys are never read back into the editor. Learner submission
now grades objective questions server-side; course authors see an anonymized
queue for written responses, and the final score is committed once every answer
is marked. Certificates now have a session-bound staff admin workflow for
issuance and reasoned revocation, plus an RLS-protected print/save-as-PDF view
for certificate holders and their authorised family. Lesson pages now play
approved direct HTTPS audio/video files natively; first-party uploaded media
still needs a chosen storage provider and short-lived signed playback URLs.
Adults can create a family, add child profiles and review progress at `/family`;
when enabled, `family.guardian_verification` now gates child enrolment on an
active verified guardian with learning permission. The flag remains off until
its review and evidence-handling preconditions are met. `/account` saves the
signed-in user's display name, preferred language and time zone under RLS; the
email recovery path uses a verified callback and authenticated password update.
Phone sign-in now completes the SMS OTP instead of stopping after sending it;
real delivery still depends on Supabase provider configuration. `/paths/[slug]`
shows a learner's required-course progress across a guided path. A learner can
save one private note and one bookmark per lesson from the lesson page; both
tables are new, both are gated by `learning.notes_bookmarks` in the database
rather than only in the UI, and ownership comes from the session with the
enrolment's pinned version checked before a row is written. Transcripts are not
part of it. The help desk is built end to end: `/support` opens and lists
cases, `/support/<caseNumber>` holds the thread, `/admin/support` is the staff
queue, internal notes are staff-only in the read policy, and a requester reply
to a resolved case reopens it. `platform.support` ships off; turning it off
stops new cases but not the ones already in flight. Enrolled learners can rate
and review a course from its page; a rating alone is counted immediately while
words are held until staff publish them, and `/admin/course-reviews` is the
reading queue. Reviews are a satisfaction signal only — nothing in the
publication workflow reads them. `learning.reviews` ships off. An account can also save a course from its page and
keep a private note against it; `/saved` lists them with whether each is
available, unpublished or no longer offered, and whether someone in the family is
already enrolled. The list belongs to an account rather than to a learner
profile — "who is this for" goes in the note, so saving stays one tap — and
removal is not flag-gated, so turning the feature off cannot trap it.
`learning.wishlist` ships off. A teacher marking a written answer can now say
something as well as award a number: `grading_feedback` is written in the same
statement as the mark, so it is immutable with it, and the learner reads it under
"Your marked attempts" on the assessment page. The audit records that a comment
was given and not what it says.

Quizzes gained the same capacity separately, and it matters that they are two
surfaces rather than one: `short_answer` questions are marked through the
existing manual queue in `/teach/[courseId]`, which could award a score and a
verdict and say nothing. That marking now carries a comment, written in the same
statement as the mark so it is immutable with it, and the learner reads it under
"Your marked attempts" on the assessment page. Assignments and quizzes keep their
own feedback because they keep their own submissions — an assignment is dated
work beside a frozen version, a quiz question belongs to the version itself.

The next clarification is now settled: the teacher wants **both** self-paced
courses and dated cohorts, learners submit **text or files** (including voice or
photos), and the **course author** marks. Cohort persistence is built behind
`learning.cohorts`: classes pin one published course version; learners or their
guardians opt in (the author cannot silently add a child); roster rows are
private to the teacher/staff and that learner's family; a version change does
not move an existing class to new material. The teacher manager and learner
join/leave screens are built, and the late-join rule is settled: each cohort
carries `join_closes_at`, defaulting to the start date, which the teacher can
move while the class is a draft or open. The feature still ships off, pending the
safeguarding review of files children send.

`learning.assignments` is not a duplicate quiz, and its database and text
workflow now exist: tasks can be authored after publication; self-paced due
dates are relative to each enrolment, cohort deadlines are absolute; one
private submission can be saved and sent; the author or privileged staff mark
it and return private feedback. `/teach/[courseId]/assignments` and
`/learn/[enrolmentId]/assignment/[assignmentId]` are built. Each task explicitly
chooses whether to accept late work (default: no). One hand-in per learner/task.

Feedback is now actionable. A learner can reopen marked work and hand it in
again: the reopen clears the live mark, snapshots the version that was marked
into `assignment_submission_revisions` (append-only, as private as the submission
it came from) and keeps the learner's own words in the editor, because a revision
starts from what was marked rather than from a blank page. The teacher sets the
policy per task — revisions on by default, an optional limit that counts versions
including the first — and can change it while a task is open, since content and
deadlines freeze once learners rely on them but what happens after marking does
not. The one hard refusal is the deadline: reopening past a due date on a task
that does not accept late work is refused, because otherwise a learner could
trade a grade for a draft they can never hand back in.

File references accept PDF/JPEG/PNG/WebP and common audio formats, with a
25 MiB per-file / 10-file ceiling, but the upload path is still missing: bytes
are not transferred, scanned or delivered, and there is no retention workflow.
The learner screen is text-only for now. Both flags stay off until the secure
media path and retention workflow are ready; the cohort UI is built, but its
These are the remaining pieces, not another quiz table.

The gates themselves are now enforced by the repository rather than by
remembering them. `.github/workflows/ci.yml` runs on every push: a structural
job (`npm run check:repo`, Node builtins only, so it needs no install) and a
gates job (`npm ci`, then the database suite, the web suite, typecheck and the
production build). No secrets and no Supabase project are involved — PGlite runs
in memory and the build succeeds with no credentials configured, which is worth
saying out loud because it is the reason CI can exist before the backend does.

The structural job checks three things that have each cost real time here: two
migrations sharing a filename prefix, which is what happened when separate
sessions both chose `20261130000100`; a new `supabase/tests/*.test.mjs` that
nobody registered in `run.mjs`, which does not fail — it simply never runs, and
the test count in a commit message goes up anyway; and conflict markers left
behind by a three-way apply.

`flags.test.mjs` gained the check that protects the register: it reads
`FLAGS.md` and holds it against `platform_settings`. Every documented key must
exist and every existing key must be documented, the gate in the table must
match `gate_type`, and all 87 flags must still ship off. The serious case is a
gate disagreement — the docs promising an admin that a flag needs a deploy while
the dashboard offers to flip it. Prose is deliberately not compared: keys,
types, gates and shipped-off values are the parts that can hurt somebody.

Auditing what is left turned up a roadmap that was badly wrong about money.
Phase 5 carried six rows all marked blocked, and five of them were false: the
38 money tables are built and enforced in SQL; `lib/payments/` holds a complete
`PaymentProvider` boundary plus working MTN MoMo and Airtel adapters, 1,583 lines
covered by the `payments`, `checkout`, `refunds` and `money` suites;
`/courses/[slug]/buy` → `/api/checkout` → `/orders` is an end-to-end path; and
`/subscriptions`, `/admin/refunds`, `/admin/reconciliation`, `/admin/disputes`
and `/admin/financial-adjustments` all exist. What is genuinely
missing is a merchant account, so none of it has been exercised against a live
provider — a business fact, not a build task. The rows now say that, with the two
honest gaps kept visible: no receipt document, and no renewal or failed-payment
retry. The same audit closed the course-approval row, whose note still claimed an
appeals queue was missing when `/admin/appeals` is built and privileged-only.

Four decisions came back from the owner on 2026-10-19, and all four are
recorded in `DECISIONS.md`:

1. **A teacher keeps 50% of a course sale.** `teaching.revenue_share_percent`
   moves from its seeded 0 to 50 in `20261205000100_revenue_share_decision.sql`,
   which also rewrites the register's description and preconditions so the row
   says who chose the number and when, and logs the change with no actor and
   `source: migration` rather than pretending an administrator made it. 0 was
   never a neutral default — it was the platform keeping everything a teacher
   earned, and every fresh environment would have started there. Two tests pin
   it: the shipped value and its audit row, and a real 40,000-minor-unit sale
   splitting 20,000/20,000 with no zero-share note and `teaching.payouts` still
   off. The percentage is settled; tax per country, processing fees and
   uniform-or-per-teacher are not, and the register still says so.
2. **A course author may see individual learner progress only inside a cohort a
   learner or guardian opted into.** Self-paced learners keep exactly the access
   they have today, which is none. That is the boundary to build row 32 against.
3. **The teacher decides when a cohort stops accepting joiners**, per cohort,
   defaulting to the start date. This was the precondition `learning.cohorts`
   was held on, and it is now built — see `20261206000100_cohort_join_window.sql`.
4. **D8 is decided: Cloudflare R2, for masters and delivery** (2026-10-20),
   taken from the costed research at `docs/decisions/media-storage-costing.md`.
   R2 comes to $1.13 / $7.14 / $113.75 a month at 100 / 1,000 / 50,000 users,
   against Supabase Storage's $0.00 / $64.92 / $4,089.94 and Stream's
   $7.77 / $62.85 / $2,548.50 as delivery only. The arithmetic is settled; the
   byte path is still not built.

The late-join rule is now built. `cohorts.join_closes_at` is not null, backfilled
to `starts_at` for every cohort that already existed, and checked against
`ends_at` at the table level so a window cannot outlive its class even through a
write that bypasses the functions. `create_cohort()` takes it as an eighth
argument — the old seven-argument signature is dropped first, because adding a
DEFAULT argument to a plpgsql function creates an overload rather than replacing
it — and a blank means "use the default", which is the start date.
`set_cohort_join_window()` is a narrow writer for moving it while a class is a
draft or open: not a general `update_cohort()`, because the title, dates and
capacity of a published class are what people registered against, and this is
the one field a teacher legitimately needs to change once the class is running.

`join_cohort()` checks the window before it checks `ends_at`, so the refusal
names the thing that actually stopped somebody. A class can still be running
after it stopped taking joiners, and "this cohort has already ended" would be a
lie the learner could see for themselves. The message carries the date.

Both screens say the same thing from their own side: the teacher gets a window
control beside each draft or open class, and the learner's join button
disappears when the window shuts, replaced by "this class stopped accepting
joiners but is still running" — because a badge that said CLOSED on a class
that meets on Thursday would be wrong in the way that costs trust. The
memberships panel on the enrolment page is unchanged on purpose: it lists
classes the learner is already in, where leaving is the only action, and the
window governs arriving rather than staying.

The serving half of the media path now has a register to serve from.
`media_renditions` holds one row per profile per asset — `1080p`, `720p`, `480p`,
`360p`, `audio`, `poster`, `manifest`, a closed vocabulary because the profile
names the object key and an invented one writes an object nothing can find again.
The bucket and key are derived, never supplied, so a rendition cannot point at
another asset's object. Writers are staff-only: a rendition is what other people
are served, so the uploader of the master cannot mark their own copy available,
which is the same hole `media_assets` had before its status guard closed it.

`may_play_rendition()` is the playback predicate, and it widens no boundary: a
rendition is playable exactly where a lesson referencing its master is open,
through the existing `can_access_lesson_now()`. It requires the rendition *and*
its master to be available, so quarantining a master withdraws every copy
derived from it — which is the entire point of quarantining it.

That predicate differs from `may_download_lesson()` in one deliberate way, and
the difference is the decision from earlier today: playback follows lesson access
including the free-preview bypass, while saving requires entitlement and excludes
it. **Watching a preview is free; keeping one is not.** One test asserts both
halves of that from the same fixture.

Still absent, and still not implied: no transcode worker, so nothing calls these
writers; no playback or download route, so no URL is minted; no player. The
register is built first because a worker needs somewhere to write, and because
the predicate is the part that must not be retrofitted around a worker that
already exists.

Half the media byte path now exists. `/api/media` answers `request_upload` by
asking the database to open a `pending` row — `register_media_upload()` derives
the object key, so a caller cannot name one — and returns a signed
direct-to-R2 PUT for that exact key, with the declared content type inside the
signature so what arrives is what was recorded. Bytes go browser to R2 and never
through the web server. `confirm_upload` is the only way a row becomes
`available`, and it stays privileged, because "we have the file" and "we do not"
is the distinction the whole state machine exists to hold.

Signing is hand-rolled rather than an SDK: R2 speaks the S3 API, so a presigned
URL is an AWS Signature Version 4 calculation, and the implementation is pinned
against AWS's own published worked example — a vector written by somebody else,
so the algorithm is not verified against itself. Masters sign for
`ayahspring-masters` and renditions for `ayahspring-renditions`, and a master key
is refused as a rendition key, because the only bucket a player may ever touch is
the renditions one.

What is not built, and is not implied by any of this: no transcode worker, so no
renditions exist; no playback or download URL, because serving a learner means a
rendition and masters are never served; and no teacher screen that offers the
upload. There is a ceiling on a single file — 8 GiB in SQL, 5 GiB less 5 MiB from a browser — but no quota in
SQL and none invented in the web layer, because that rule belongs to
`platform.cost_controls` and is an open decision.

Offline download is now a rule the database enforces. `may_download_lesson()`
answers one question — may this session save this lesson to a device? — and it
says yes only when the same learner profile has entitlement to the lesson's
course version, holds an active `offline_downloads` feature grant on the plan
being paid for, and the lesson has verified first-party media behind it. All
three parts matter separately: entitlement without the feature is a Basic
subscriber, the feature without entitlement is a stranger with a plan, and media
that is still `pending` or `quarantined` must never be handed out because that
state machine exists precisely to distinguish "we have the file" from "we do
not". A hotlinked resource fails the third check for a plainer reason — it is
somebody else's server, and there is nothing of ours to save.

The vocabulary of sellable feature codes is closed (`pe_feature_vocabulary`,
mirrored by `plan_feature_codes()`), because the failure it prevents is silent:
a plan sold with `offline_download` instead of `offline_downloads` takes money
and grants nothing, with no error anywhere. The admin plan form now offers the
closed list instead of a free-text box, and a refusal names the reason.

What is still open is everything about the bytes: device storage limits, download
expiry, protected media, and the signed transfer itself. The predicate decides
who is entitled and hands nothing over.

That leaves one gap, and it is now code rather than a decision. **Learner
analytics (`SCREENS.md` row 32) is built**, on the boundary decided and recorded
in `DECISIONS.md` under "What a teacher may see about a learner". RLS gave a
course author no read at all on `course_enrolments` or `lesson_progress` — only
the learner and their guardian had one — so a teacher progress screen widens that
boundary, and the chosen width is one cohort membership deep: an author may read
enrolment and progress rows only for learners with an active membership of one of
that course's cohorts, and only for the version the cohort pins. The predicate is
in SQL, beside `can_read_assignment_submission()`, not in a query filter a second
caller could forget. See today's section below for what that cost and what it
deliberately does not do.

The two planning documents were also stale in a way that would have misdirected
the next session, so both were re-audited against the route list in the build
output rather than against memory. `SCREENS.md` had 24 rows saying READY or
BLOCKED for screens that exist — including the settings and flags screen, which
its own note called the critical path while claiming no settings table existed.
It now reads **40 built, 12 ready, 5 blocked**; the five blocked ones are blocked
on a decision or a provider, not on code. `FLAGS.md` claimed seven flags could
not be runtime toggles and then listed eleven: the measured figure is **31 CODE,
14 ADMIN + SETUP, 43 ADMIN** (32 CODE since `delivery.transcode` was added), and
`platform_settings` holds **91 rows — the 88
documented flags plus three controls** that were in the database and not in the
register (`governance.panel_required`, `governance.min_approvals`,
`teaching.revenue_share_percent`). All three are now documented, including the
fact that the revenue share was then 0 because nobody had chosen a number yet (it has since been
chosen at 50%; see below). Version copying
carries forward the curriculum, assessments, completion requirements, citations
and product/price links; existing learners stay pinned
to their original version.
Learners can browse paths, lesson citations and teacher pages when the
corresponding flags are enabled. Public samples have a dedicated course-preview
route; `learning.previews` controls anonymous reads and the free-entitlement
bypass without exposing paid-only lesson resources. Paths do not grant course
access; citations and preview settings lock with the published version; public profiles disclose no
unverified credentials. Public-facing features remain off until reviewed content
is ready.

Verification: **986 database tests, 700 web tests; TypeScript typecheck and
production build pass; 103 tables, 231 policies, 134 user-defined triggers,
238 functions, 102 migrations and 108 app route entries.**

## Today's sentence

Continue with the next non-blocked writer/UI gap, keeping each feature behind
its recorded flag, testing the database and web contract, then committing and
pushing the completed unit.

## Half-built, and what each piece is waiting on

Everything below is deliberately partial. Each piece is behind a flag that ships
`false`, so none of it is reachable by a learner or a teacher, and none of it
claims to work. This table exists so a session that starts cold — or one that
runs out of context mid-unit — can resume without re-deriving what was finished.

Read it with `FLAGS.md` (what each flag is held on) and `ROADMAP.md` (what was
never started). Updated 2026-10-20.

| Piece | Built and tested | Not built | Waiting on |
|---|---|---|---|
| **Media ingest** (D8 = R2) | `media_assets` register with a pending/available/quarantined/deleted state machine and four writer functions; SigV4 signing in `web/src/lib/media-r2.ts`, pinned against AWS's published vector; `POST /api/media` `request_upload` + `confirm_upload`; multipart upload for a file too big for one presigned PUT (`lib/media-multipart.ts` on the server, `lib/multipart-upload.ts` in the browser, four more actions on the same route); `resume_upload`, which finds the caller's own `pending` row by checksum and size and reads back from the bucket the parts storage already holds, so a closed tab costs one part rather than the file; `abandon_media_upload()` and the `/admin/media` panel that reaches it, which is the only place an upload nobody finished can be seen; R2 variables documented in `web/.env.example` | Any R2 credential in this environment, so nothing has been exercised against a real bucket; the bucket's CORS rule, which multipart needs and single-PUT did not | **Nothing** that is a design question. R2 is chosen; when credentials are issued the masters bucket must allow `PUT` from the app's origin and expose `ETag` |
| **Media delivery** | The whole path, end to end: `media_renditions` register with a closed profile vocabulary and derived object keys; the transcode worker that fills it (`web/src/worker/transcode-worker.ts`, decisions in `lib/transcode.ts`, gated by `delivery.transcode`), which checks the master's SHA-256 against the bytes before it encodes anything; `/api/media/playback` and `/api/media/download` signing short-lived rendition URLs with the database as the only authority on who may watch; a player on the lesson page with a quality selector and a poster; `/teach/media`, where a teacher uploads straight to R2 with a browser-computed checksum; `verify` on `/admin/media`, which asks storage whether the file arrived at the declared size and only then confirms it; and `retry_media_rendition()`, reached from the same screen, which puts a copy that failed to encode back in the queue on a written reason | A host to run the worker on with ffmpeg, R2 credentials and a staff account for it, and a decision about whether a free preview may be watched signed-out | **Nothing** that is a design question. What is left is infrastructure and one product decision |
| **Offline download** | `may_download_lesson()` requiring entitlement + an `offline_downloads` feature grant + verified first-party media; closed feature vocabulary (`pe_feature_vocabulary`, `plan_feature_codes()`) with the admin plan form offering the list; 17 database tests | Any download route or UI, device registration, device storage limits, download expiry, protected-media handling | **Decisions:** device limits, expiry and protected media (`learning.offline`). It would also serve renditions, which do not exist |
| **Upload cost control** | A per-file ceiling of 8 GiB that the browser can now actually reach: `lib/digest.ts` hashes a slice at a time so the checksum does not cap the size, and above 32 MiB `lib/multipart-upload.ts` sends 16 MiB parts so the transport does not either — a failed part is retried rather than the file restarted | A cumulative per-teacher byte quota and a spend alert. Resuming needs the same file to be chosen again, because the checksum is what recognises it, so a half-sent file cannot be finished from the library without it; and an unfinished upload whose key was not derived from an asset can be listed but not ended, since the audit trail would have nothing to point at | **Decision:** quota policy (`platform.cost_controls`). Note that `register_media_upload()` is open to **any signed-in user**, not only teachers, because learners attach files to assignment submissions through the same table — so the missing control is a cumulative quota per person, not a role check |
| **Assignments** | Tasks, self-paced and cohort deadlines, one private submission per learner, drafts and hand-in, marking with immutable feedback, a revision loop with an append-only snapshot, file *references* with type and size ceilings | Byte transfer for submissions (the R2 path exists but is not wired to submissions), scanning, secure delivery to the marker, retention of children's files | **Decision/review:** the safeguarding review of files children send. This one review holds `learning.assignments` **and** `learning.cohorts` |
| **Cohorts** | Tables, exact-version pinning, opt-in join/leave, capacity serialisation, family opt-in for children, counts on the manager and, since row 32, names and progress on the class page for the teacher who opened it, teacher manager, learner join/leave, the teacher-set `join_closes_at` window, how full each class is on the course page a joiner reads it from (`cohort_places()`, counts only — the roster stays behind `can_read_cohort_member()`), and the teacher's control over the published number (`set_cohort_capacity()`, never below the learners already in the class) | Nothing structural | The same safeguarding review. `learning.cohorts` ships `false` |
| **Learner analytics** (`SCREENS.md` row 32) | `can_read_learner_course_progress()` as a second branch on the `course_enrolments` and `lesson_progress` read policies; `cohort_learner_progress()`, which returns four columns of a profile rather than the row; `/teach/[courseId]/cohorts/[cohortId]` with a class summary and a roster ordered by need; 19 database tests, most of them negative | Aggregate or platform-wide reporting, event instrumentation beyond lesson progress, export or CSV, anything that follows a learner across courses | **Retention:** how long progress stays readable after a class ends or a learner leaves — a decision, not a default. `delivery.analytics` and `learning.cohorts` both ship `false`, and the predicate checks both |
| **Reviewer access to lesson media** | `may_review_version_media()` — an accepted or in-progress assignment and nothing else — as a third branch of `may_play_rendition()`, with the player wired into `/review/[assignmentId]`; `may_watch_master()`, `master_preview_target()` and `/api/media/master` for the uploader, staff and the version author, with `Watch` on `/teach/media` and `/admin/media`; 19 database tests, most of them refusals | Any copy for a reviewer: no download, no master, no export. Aggregate review analytics | **Nothing.** Decided 2026-10-20: "other teachers" means a reviewer checking quality for a named period, not co-teachers and not any teacher on the platform. The period is the assignment's state, so access ends with the review |
| **Live classes with teacher-only recording** | Nothing. No live-class tables exist | Schema, capture, recording, storage, playback, and the rule that learners' video and audio are never captured | **Decision:** build versus buy. This is the one workload that would reopen the Stream decision, because self-hosting a media server is the largest piece of engineering left. Costed in §7 of `docs/decisions/media-storage-costing.md`. Decided 2026-10-20: teacher-only capture, so the child-recording safeguarding question does not arise |
| **Payments** | MTN MoMo and Airtel adapters, checkout, orders, refunds, reconciliation, disputes, financial adjustments, subscriptions with entitlement grants that drive access, 50% teacher-share accrual with the split snapshotted per row | Live credentials, callback verification against a real provider, automatic renewal, failed-payment retry, the receipt document, a merchant account | **External:** provider sandbox and merchant credentials (P12). Do not claim any of this works end to end |
| **Payouts** (`teaching.payouts`) | Three tables, earnings entries, a split that must satisfy its own check constraint, reversal on refund | Fields and endpoints; disbursement of any kind | **External/decision:** payout policy, tax per country, who bears processing fees, uniform versus per-teacher share. Setting the share to 50 did not enable payouts |
| **Guardian verification** | Tables and flow complete, shipping off. **Not to be deleted** — COPPA makes verifiable parental consent mandatory for US under-13s | Enabling it | **External:** legal review, and it must be on before any US child enrols |
| **Notifications** | Email/password sign-up, sign-in and recovery; phone OTP requested and verified in-app | Live email and SMS delivery | **External:** a delivery provider and its credentials |
| **Product analytics** (`delivery.analytics`) | Nothing | Event instrumentation and the reporting screens | **Decision:** what is collected and its retention. Distinct from learner analytics above, which is decided |
| **Visual identity** | White and green theme settled, tokens in `web/src/app/globals.css` | Type, logo, illustration; 0 of the 50 inventoried screens designed | **Decision:** the owner's. Not a blocker for any backend work |

### Found by audit, 2026-10-20

The ledger above lists the pieces that were being built. An audit of the whole
repository against the running schema found a second category the ledger did not
cover: **schema that exists and nothing can reach.** Counted by asking, for every
table, whether any route or screen names it, and if not whether any SQL function
that the web layer calls touches it.

**25 tables have no path from the application** — no screen reads them, no route
writes them, and no function the web layer calls touches them. They are not
broken; they are the shape of features that were built in SQL first and never
given a surface. Grouped by the feature they belong to:

| Group | Tables | Accounted for by |
|---|---|---|
| Promotions | `promotion_campaigns`, `promotion_benefits`, `promotion_redemptions` | `commerce.promotions`, off, eligibility and stacking rules undecided |
| Scholarly panel | `scholarly_panels`, `scholarly_panel_memberships`, `scholarly_panel_cases`, `scholarly_panel_votes` | `teaching.panel`, off and deliberately dormant (P6) |
| Reviewer machinery — the people | `reviewer_qualifications`, `reviewer_subject_authorizations`, `reviewer_conflict_declarations` | **Now written** by seven functions in `20261220000100_reviewer_register.sql`, on `/admin/reviewers` (governance staff) and `/review` (the reviewer themself). The audit called this group "no admin surface of its own"; the truer account is in the section below — it had no *writer* of any kind, so no reviewer could become active and nothing could be published through the product |
| Reviewer machinery — the versions | `content_review_requirements`, `technical_review_checks`, `content_change_assessments` | Still unreachable, and still the next unit. Until `content_review_requirements` can be written, `validate_review_assignment()`'s authorisation loop is empty, so any verified reviewer fits any subject |
| Payouts | `instructor_payouts`, `instructor_payout_items` | `teaching.payouts`, off; ROADMAP already says "3 tables with no fields and no endpoints" |
| Institutions | `institutions` | `commerce.institutions` and four `institution.*` flags, all off |
| Money plumbing | `currency_exchange_rates`, `order_adjustments`, `payment_method_references` | Multi-currency reporting and stored payment methods, neither decided |
| History and diagnostics | `order_status_history`, `publication_events`, `entitlement_events`, `course_enrolment_version_history`, `subscription_history` | **Now read** by `support_case_history()`, on `/support/<caseNumber>` for staff. Still closed to every other read path, which is the point: one function decides what support may see |
| Diagnostics with no writer | `access_checks` | **Correction to the audit:** nothing has ever inserted a row here — not a trigger, not a function, not a route. Its comment promises a denial log for support agents and the platform does not keep one. Excluded from the console on purpose; an always-empty list would read as "no denial happened" |
| Other | `adult_learning_shares` | **Now read** by the same console, where empty is a real answer ("nobody can see your progress"). Still never written by the product: no screen or route creates a share, only SQL can. The adult privacy story is the gap, not the panel |

**Two functions were genuinely unreachable**, in the stronger sense that nothing
called them at all — not a route, not a policy, not a trigger, not another
function. Both are now closed:

- `cohort_member_count()` — built so the cohort roster could show counts without
  exposing members. The teacher UI showed counts, but counted rows itself. It is
  now the definition `cohort_places()` uses for each cohort, so a joiner sees how
  full a class is — see "A learner can see how full a class is before joining".
- `can_read_support_case()` — its own comment claimed it was "used by the writer
  functions", and no writer called it: both read policies spelled the same rule
  out inline, so who may read a support case was defined three times and the copy
  written to be the only one was the one nothing read. Both policies now ask it —
  see "Who may read a support case is written down once".

**Four staff functions had no admin surface.** Two are now closed — `/admin/media`
reaches `quarantine_media_upload()` and `delete_media_asset()`, so a rights
complaint or a safeguarding report about an uploaded master has a path. The other
two, `confirm_media_rendition()` and `fail_media_rendition()`, now have a caller:
the transcode worker below. It is not deployed, so in production they are still
uncalled, but nothing is waiting on a design any more.

**A second divergence, found while closing the first, and worse:** `web/src/lib/
media.ts` was complete, tested and **imported by nothing** — including an 8 GiB
per-file upload ceiling, a `fetchMediaAssets()` read path and an
`attachMediaAsset()` that refuses a file which was never confirmed. `POST
/api/media`, written the day before this audit, validated and registered an
upload itself instead, so the ceiling existed and was not in force. The route now
calls the library, the duplicate validator is deleted, and the ceiling is live.
This is the same failure as `add_child_to_family()` one level up: not a rule
enforced in one of two paths, but a library of rules bypassed by a second
implementation. The lesson is general and worth stating — **before writing a
helper, grep for one that already exists**, and the audit should have checked
for unimported libraries rather than only for unreferenced tables.

**One divergence between SQL and the web layer:** `add_child_to_family()` is
called by tests only. `web/src/lib/family.ts` inserts into `learner_profiles`
directly and relies on RLS, and its own comment records that this made the
helper "unreachable in practice". Two paths to one outcome is how a rule gets
enforced in one of them.

**What the audit found that was already right:** the counts in `README.md` and
`NEXT.md` (103 tables, RLS on every one, 231 policies, 220 functions, 90
migrations, 97 route entries = 52 pages + 45 API routes) all reproduce from the
schema and the build. Every one of the 37 paths `SCREENS.md` cites exists. The
flag register and `platform_settings` agree, and are pinned by a test.

**One document was wrong and is now corrected:** `SCREENS.md` counted 40 built
screens because it counted inventoried rows, while 17 more exist in the app and
were never added as rows — nine of them admin screens, which is why its section 7
said "Administration — 9" when the app has fifteen admin routes. Section 11 now
lists them and the counts give both numbers.

**Two rules for resuming any row.** First, nothing above is enabled by writing
code alone — each sits behind a flag in `platform_settings`, and a flag moves
only through the admin surface, so a half-built piece cannot leak. Second, where
a row says **Decision**, do not infer an answer: the repository's discipline is
that an undecided rule is recorded as open rather than guessed, because a guess
in code is far harder to find later than a gap in a document.

### The transcode worker, 2026-10-20

The `media_renditions` register was built before anything could write to it, on
the argument that a worker needs somewhere to write and that the playback
predicate must not be retrofitted around one. This is the writer.

**Where the decisions live.** `web/src/lib/transcode.ts` holds every branch that
decides something — which profiles a master gets, what ffmpeg is told, in what
order the database is called, and what counts as a failure. It touches no disk,
no network and no database, so it is unit-tested: 32 tests. The program that does
the I/O, `web/src/worker/transcode-worker.ts`, is thin, and nothing in it runs in
CI, because `ffmpeg` is not installed, there are no R2 credentials, and there is
no staff account to sign in with. That split is the reason the worker could be
built at all before any of those three things exist.

**Three rules worth stating plainly.**

- **The order is forced by the schema.** Encode, measure, register, upload,
  confirm. `register_media_rendition()` takes the byte size and the dimensions,
  and a row could not be corrected afterwards — `media_renditions` has no update
  policy and `confirm` only moves `pending` to `available`. So a row is opened
  only once the encode has happened. *(Since: `record_media_rendition_encode()`
  re-measures a `pending` row, the one case where the file that arrives is not
  the file the row was opened from.)* The useful consequence: a crash before
  `register` leaves nothing behind, and a crash after it leaves a `pending` row
  the next run finishes, because the object key is derived from the asset and the
  profile and is therefore the same key both times.
- **Nothing is confirmed before its bytes are uploaded.** Confirming first would
  publish a row that `may_play_rendition()` hands to a learner as a URL that 404s.
- **`failed` is written only for an error that is a property of the file.** The
  state is terminal for the worker — nothing in it moves a row back to `pending`,
  and `register` would meet the unique index on `(asset_id, profile)` — so
  marking a row failed retires that profile until somebody adds a retry path.
  *(Since: `retry_media_rendition()` is that path, and it is a person's decision
  on `/admin/media`, not the worker's.)* An ffmpeg refusal is
  definitive and gets recorded. An upload error or a confirm refusal is usually a
  network blip or a missing grant, so the row is **left pending**, invisible to
  learners and picked up by the next run. A worker that failed a row on a timeout
  would permanently cost a course its 720p copy.

**The probe decides, not the declaration.** `media_assets.mime_type` is what the
uploader said. The worker downloads the master and runs `ffprobe`, and plans from
what it finds: a file declared `video/mp4` that contains only audio gets an audio
rendition rather than four encodes that fail. Cover art on an audio file probes
as a video stream and is excluded, or every MP3 would grow a picture ladder. And
nothing upscales — a 480p master gets 480p and 360p, because a 1080p rendition
of it would cost storage, cost bandwidth, and tell a learner the picture is
better than it is.

**It signs in.** There is no `service_role` anywhere in this schema, so the
worker is a real account that an admin has made staff at `/admin/roles`, and it
is subject to the same refusals as any other caller. Revoking the role stops it.
Reading `platform_settings` is itself a privilege check, so an unprivileged
worker cannot even see `delivery.transcode`.

**What is still not true.** No rendition exists, because nothing has run: the
flag ships off, and enabling it is CODE-gated, which means a deploy — a host with
ffmpeg, R2 credentials in its environment, and the staff account. `manifest` is
in the profile vocabulary and nothing produces one, because an HLS manifest is
thousands of segment objects and this register holds one row per profile. A
rendition stuck `failed` needs SQL to retry, and there is no playback route to
serve one even when it exists.

### Serving a rendition to a learner, 2026-10-20

The lesson page used to say *"secure playback setup is still required"* for any
first-party upload. That was true, and it is the last thing standing between an
uploaded lesson and a watched one.

**Three pieces.** `/api/media/playback?rendition=<id>` signs a short-lived GET
for one delivery copy. `/api/media/download?lesson=<id>` signs the same object
with `response-content-disposition: attachment`, so a button labelled *Save for
offline* saves a file instead of opening a tab. And `rendition-player.tsx` plays
either, with a quality selector that shows the size of each rung.

**The database is the only authority on who may watch.** `media_renditions_read`
is `may_play_rendition(id) or is_privileged(...)`, and that predicate already
walks rendition → master → `lesson_resources` → `lessons` and asks
`can_access_lesson_now()`. So the route selects the row and trusts the answer
rather than re-checking entitlement, because a second check is a second
authority and two authorities that can disagree is the failure this repository
keeps finding. A row the caller may not play does not come back at all, so
"does not exist" and "is not yours" answer identically.

**Streaming defaults down, saving defaults up.** A streamed lesson costs data
every time it is watched and most of these learners are on metered mobile
connections, so playback starts at 480p and the learner can choose another rung.
A saved lesson costs data once, so saving takes the best rung that exists. Both
are overridable; neither changes what the database allowed.

**The URL is fetched, not embedded.** A presigned URL is a bearer token, so
putting it in server-rendered HTML would leave it in the browser history, in any
saved copy of the page, and in the page source of a lesson somebody
screen-shared. It also expires, and a long lesson watched slowly outlives a URL
minted at page load, so the player asks again.

**The filename is treated as hostile input.** A lesson title here can be Arabic,
can contain a quote, and can contain a slash, and it ends up in a
`Content-Disposition` header. `downloadFilename()` strips separators, quotes and
control characters and trims leading dots — trimmed *before* stripping, since
`.. / ..` only starts with a dot once the spaces are gone. The header carries an
ASCII fallback plus RFC 6266 `filename*`, so the learner sees their own lesson's
name rather than a transliteration of it.

**Two things this is not.** Not DRM: the saved file is an ordinary MP4 that can
be copied, so what the feature buys is convenience and not protection, and the
device-limit and expiry decisions are still open. And not wired into the public
preview page: `may_play_rendition()` requires a signed-in identity, so an
anonymous visitor would get a player that always errors. Whether a free preview
should be watchable signed-out is a product decision, and it has been left open
rather than answered by quietly widening the predicate.

### A teacher can upload, and every file has a name, 2026-10-20

`/teach/media` is the teacher's end of the byte path: choose a file, name it,
and it goes from the browser straight to Cloudflare R2 on a presigned PUT with a
progress bar. The bytes never pass through the web server, and nothing is
published by uploading — the row is `pending` until a staff member verifies it,
because letting an uploader mark their own file ready is how unreviewed material
reaches a child.

**The checksum is computed in the browser, and that has a cost.**
`register_media_upload()` requires a SHA-256 digest: it is what proves the
platform still holds the exact original somebody uploaded, and what lets a
rights request be matched to every copy. But WebCrypto has no streaming digest,
so hashing means holding the whole file in memory. A browser upload is therefore
capped at **512 MiB**, well below the database's 8 GiB, and the refusal names
both numbers and the reason. Lifting it needs a chunked digest or an uploader
that runs somewhere with a filesystem; neither exists.

*(Since: `lib/digest.ts` is the chunked digest, so the browser ceiling is now
storage's own 5 GiB limit on a single request — see "A browser can now upload a
recording it can actually make".)*

**Files got names, which needed a schema change.** `media_assets` recorded a
type, a size, a digest and a duration, and nothing a teacher could recognise —
`technical_metadata` was designed to hold the original filename and
`register_media_upload()` never wrote it, so the first screen that lists a
teacher's uploads would have shown "video/mp4" twelve times. `display_name` is
now a column and a **required** parameter, with the old five-argument signature
dropped rather than left beside the new one: an added DEFAULT would have kept the
name-less path open for anything not updated. Null had to be handled explicitly,
because `btrim(null) = ''` is not true and a missing name would have walked
straight past the check.

**One thing verified before changing it.** It looks as though registration should
be restricted to teachers, since any signed-in user can currently open an upload
and get a presigned URL for it. It should not: `assignment_submission_assets`
references `media_assets`, so learners attach files to assignments through the
same table. The control that is genuinely missing is a cumulative quota per
person, which is an open decision, and not a role check that would break
homework.

### Nothing became available without being looked at, 2026-10-20

Uploading a file and confirming it were two acts, and only the first had a
screen. `confirm_media_upload()` is staff-only precisely so an uploader cannot
mark their own file ready, but no person could reach it either: every upload sat
at `pending` forever, which means it could not be attached to a lesson and the
worker would not encode it, because `register_media_rendition()` requires an
available master.

**`verify` on `/admin/media`** closes that, and it does not confirm on trust. One
HEAD request against the master's own object answers whether it arrived and
whether storage reports the size the uploader declared; only when both are yes is
`confirm_media_upload()` called. A missing object, a truncated one and an
unreachable bucket are three different answers — 409, 409 and 503 — because the
first two are the teacher's problem with different causes and the third is ours.

**Confirming now goes through one function.** The ingest route's `confirm_upload`
action used to call the RPC directly, so there were two ways to confirm and one
of them did not look at storage. Both call `confirmMediaUpload()` in
`lib/media-verify.ts` now. The old direct call also mapped the SQL's *"only staff
may confirm an upload"* to a 409 rather than a 403, because the regex it tested
was a different sentence — a permissions refusal reported as a conflict sends
somebody looking in the wrong place.

**The digest is still not verified at confirm time, and that is not an
oversight.** A HEAD reports a size, not a SHA-256, and recomputing one means
downloading the file — up to 8 GiB through a route handler. The only place the
bytes are already on a local disk is the transcode worker, so that is where the
check now lives: it hashes the master it downloaded, compares it with the row,
and refuses to encode anything from a file that does not match, saying so in its
log. A master whose digest does not match is not the file anybody declared, and
every takedown matched against that digest would have matched the wrong bytes.

**`lib/media-verify.ts` is its own module because of the client bundle.** It
signs requests, so it imports `media-r2.ts`, which uses `node:crypto`.
`lib/media.ts` is imported by the teacher's upload form — a client component — so
a signing import there would break the browser build. The ingest and moderation
library stays free of signing code, and the constraint is written into both file
headers.

### A teacher can now see who is falling behind, 2026-10-20

`SCREENS.md` row 32 was the last teaching screen marked READY, and it was ready
only because a person had decided how wide a teacher's view of a learner may be.
That decision is now enforced where the rows live.

**The predicate is `can_read_learner_course_progress(learner, version)`.** It
answers yes only for the author of that version (or staff), only while both
`learning.cohorts` and `delivery.analytics` are on, and only for a learner with
an active membership of a cohort that pins exactly that version. Both flags are
checked inside the predicate rather than in a screen, so no caller reaches the
read path by forgetting one, and turning either off closes the feature without a
deploy. A learner who left stops being visible at once — a child who leaves a
class is precisely the case where continuing to watch their pace would be wrong —
while a class that has ended is still that teacher's class.

**It is a second branch on the two existing read policies, not a replacement.**
`course_enrolments_read` and `lesson_progress_read` keep their old predicate
verbatim, including the progress policy's habit of not checking `deleted_at`,
which the new branch does check; nothing a learner, a parent or a guardian could
read became unreadable, and the tests assert exactly that. No insert or update
policy was touched. A teacher may read progress and may not write it, and the
test asserts the refusal rather than a row that quietly did not change.

**Names come through a function, not through a wider policy.** A course author
cannot read `learner_profiles`, and that table holds `family_id` and
`linked_user_id` — the two columns that connect a child to a household and to an
account. Widening `lp_read` to show one name would have handed a teacher every
column of a child's profile. `cohort_learner_progress(cohort)` returns eleven
fields instead, four of them from a profile, and is gated by `can_manage_cohort()`
*and* the per-learner predicate, so a class a caller manages but whose version
they did not author returns nothing. The limit is structural: there is no query
against this function that returns more. Two tests hold the column list, one in
SQL and one in TypeScript, because a spread would carry every column the function
ever grows.

**Completion is not counted twice.** The roster's "done" and "of how many" come
from `enrolment_progress_summary()`, the function that already decides whether a
course is complete, so a class page can never disagree with a certificate.

**The screen sorts by need and filters nothing.** Somebody in the class who has
not enrolled comes first — that is the one thing this page can fix with a message
— then whoever went quiet, meaning fourteen days without being seen, then whoever
has not started, then whoever is working, then whoever finished. Within a rank
the least far along comes first. Sorting is presentation: every row the database
returned is still on the page, because a screen that dropped somebody would be a
second place deciding visibility, and the whole point of putting the predicate in
SQL was that there is only one.

Still open, and deliberately not guessed: **retention** — how long progress stays
readable after a class ends or a learner leaves — and event instrumentation
beyond lesson progress, which is what `delivery.analytics` was originally about.

### Everybody who needs to watch a lesson now can, 2026-10-20

`may_play_rendition()` asked one question — is this caller an entitled learner,
right now — and two people who need the same bytes had no path at all.

**A teacher could not watch their own upload.** `can_access_lesson_now()` only
ever looks at learner profiles, so the author of a version was refused by the
predicate that serves its lessons. The test that pinned this said authors reach
their own media "by another path"; there was no other path.
`presignMasterDownload()` existed in `lib/media-r2.ts` and had no caller outside
its own tests, so a teacher could upload 8 GiB, watch the row turn `available`,
and never see what they had made. A claim inside a passing test is still a claim,
and this one was false — the assertion is now inverted, with the reason written
where the old one was.

**A reviewer could see where the bytes were and could not be served them.**
`lesson_resources_read` has had a `can_review_version()` branch since October, so
an assigned reviewer could read the row naming a lesson's media, while the
predicate that serves it asked only about learners.

Three predicates now answer this, and each is narrower than the last:
`may_review_version_media()` wants an accepted or in-progress assignment;
`may_watch_master()` wants the uploader, staff, or the author of a version whose
lesson uses an available master; and `may_play_rendition()` gained the author and
the reviewer as branches inside the same `exists`, so quarantining a master still
withdraws every copy from everybody at once. A reviewer gets the delivery copy
and not the archive, because what is under review is what a learner will see;
`may_download_lesson()` is untouched, so watching is not saving.

**The route is `/api/media/master`, and it decides nothing.** It calls
`master_preview_target()`, which is SECURITY DEFINER and returns the bucket, key
and description only where `may_watch_master()` says yes. That function exists
because `media_assets_read` is uploader-or-staff and is *narrower* than the
predicate: a version author who did not upload the file may watch it but cannot
read its row, and widening that policy to hand a route two columns would have
exposed every other column to the same caller. Seven columns come back, and two
tests hold the list — one in SQL, one in TypeScript — because a spread would
carry the digest and the uploader with it.

The window is fifteen minutes against a learner's six hours. This is a check,
not a lesson, and a master URL is a bearer token for the one copy nothing else in
the system hands out.

**All three paths are reachable from a screen**, because a capability no screen
reaches is the exact defect the audit kept finding: `Watch` on `/teach/media` for
the person who uploaded it, `Watch the file` on `/admin/media` beside `Verify` —
verification compares a byte count with storage, which is not the same as looking
— and the rendition player on `/review/[assignmentId]` for every lesson of the
version under review, which says in words when an assignment is closed and the
media has stopped. `RenditionPlayer` moved to `app/_shared/` because two routes
use it now, and `app/_shared` is not routable, so the move added no page.

`/admin/media` used to end with "no byte is transferred by this screen". That was
true and is not now, so the sentence says which act transfers nothing and which
one does.

No new flag: the gate is the predicate, and a flag would be a second switch on a
door that already has a lock. What is still open is a reviewer's own record of
what they watched — no aggregate review analytics, no export, and no copy.

### A failed encode stopped being a dead end, 2026-10-20

The transcode worker's header described `--asset` as the escape hatch for a
master that does not match its filter, "such as one whose profile is stuck
`failed`, which nothing in the schema can retry". That was true, and it meant one
bad afternoon on the worker host cost a lesson a rung of its quality ladder for
good: `fail_media_rendition()` moved the row to `failed`, nothing moved it back,
and registering the same profile again met the unique index on
`(asset_id, profile)`. The repair was SQL against production, with no audit entry
and no record of who had decided the file was worth another attempt.

**Two writers, one meaning each.**

- `retry_media_rendition(rendition, reason)` — staff-only, reason required and
  trimmed, `failed` to `pending`. It keeps the row and the derived object key, so
  the next encode overwrites the file that was never confirmed instead of
  orphaning an object nothing will ever list. It refuses unless the master is
  `available` and not tombstoned, and says which: encoding again from a file
  under review would be encoding from evidence that has been withdrawn. It writes
  `media.rendition_retried` with both reasons — why it failed, and why somebody
  believed a second attempt would work — because only the second one is new.
- `record_media_rendition_encode(...)` — staff-only, `pending` only, and the same
  shape checks `register` makes. A recovered row's measurements belong to the run
  that crashed, and the file about to be uploaded is a different one;
  `fetchPlayableRenditions()` sorts the ladder by `byte_size`, so a stale number
  mis-orders the quality picker and mis-states a download size. An `available`
  row's measurements are history and a `failed` row is waiting for a person, so
  neither is accepted.

**Why a person and not the worker.** The commonest reason a master will not
encode is the master itself, and an automatic retry would spend encode time on it
forever while the reason went unread. The written reason is the decision, and the
audit trail is its record. For the same reason `register_media_rendition()` was
**not** turned into an upsert: a duplicate profile is a bug worth hearing about
today, and as an upsert it becomes a silent overwrite of a row that may be being
served to learners right now.

**The worker re-measures before it uploads.** `TranscodeDeps` gained `record()`,
called on the recovered path only, between the encode and the upload. If the
database refuses the measurements, the run reports it and leaves the row pending
rather than putting a file in storage whose size the register will not take —
uploading first would leave a served row describing the wrong file.

**Reached from a screen.** `/admin/media` now lists every failed copy with the
reason the worker wrote and a Retry control that asks for its own, through
`POST /api/admin/media` with `action: 'retry_rendition'` and a `renditionId`.
Staff-only in the route and in the database. Retrying is offered only for a
master that is still `available`, because a button that always fails is worse
than no button. While wiring it, the moderation form's three buttons turned out
to use a `.button` class that `globals.css` does not define, so they rendered
unstyled; they are `.btn` now.

**Not built.** No automatic retry and no retry budget or attempt counter — a
second failure shows up on the same screen with its own reason, and a person
decides again. Retrying does not encode anything: it re-queues, and the next
worker run does the work. 11 database tests, 7 web.

### A browser can now upload a recording it can actually make, 2026-10-20

The browser ceiling was 512 MiB against a database ceiling of 8 GiB, and the gap
was not conservatism. A 45-minute lesson at the 1080p rung this platform encodes
to is about 2 GiB, so the ingest path refused the most ordinary thing a teacher
has, and the refusal named the checksum — truthfully. `register_media_upload()`
requires a SHA-256 digest, and WebCrypto's `subtle.digest` takes a whole
`ArrayBuffer`, so hashing meant holding the file in memory.

**`web/src/lib/digest.ts` is the same algorithm fed a slice at a time.** It reads
`Blob.slice()` in 4 MiB chunks, so memory is bounded by the chunk and not by the
file, and it runs at about 84 MiB/s — roughly a minute for a 5 GiB recording.
That minute is reported: the upload form now shows a progress bar for hashing as
well as for the transfer, because a button that says only "Computing the
checksum…" for sixty seconds gets the tab closed.

**One implementation, not a fast path and a slow path.** WebCrypto would be
several times faster below some threshold, and using it there is the obvious
design. It is refused because the digest is a security property: two
implementations means the one exercised least is the large-file path, which is
where a bug hides, and a wrong digest does not fail loudly — it fails when
somebody tries to match a rights request to the file. Every upload now goes
through the same code.

**The new ceiling is the transport's, not ours.** 5 GiB less 5 MiB is the
provider's limit on a single request (Cloudflare's R2 limits documentation,
checked October 2026), and this upload is one presigned PUT. Getting the last
3 GiB up to the database's ceiling needs multipart — parts of at least 5 MiB, all
but the last the same size, at most 10,000 of them — and with it two things that
matter more than the number:

- **A single PUT cannot be resumed.** A failure at 90% of a 4 GiB recording
  starts again from zero, which is why the provider recommends single PUT only
  below about 100 MB.
- **The presigned URL lives at most an hour** (`MAX_UPLOAD_SECONDS`), so at this
  ceiling a teacher needs a sustained 1.5 MiB/s or the URL expires mid-transfer.

**Tests.** The digest is checked against `node:crypto`: the four published
vectors including a million `a`s; every block and padding boundary — 55/56/57,
63/64/65, 119/120/127/128/129 and chunk ±1 — fed three ways (one buffer, a byte
at a time, uneven slices); progress monotonic; a finished digest refusing more
bytes; and 512 MiB of zeros end to end. That last one is the expensive test and
it is kept: 512 MiB is the smallest input whose padded bit count has a non-zero
high word, so it is the only test that drives the branch the WebCrypto-only path
never reached, in the range this unit just made uploadable. 13 web tests, and no
database change.

**Not built.** Multipart, which is resumable and parallel and lifts the ceiling
past 5 GiB. A desktop uploader. Cancelling a hash in flight — the button is
disabled while it runs, so a teacher who picks a huge file by mistake has to
reload the page.

### A learner can see how full a class is before joining, 2026-10-20

`cohort_member_count()` was written for the joiner-facing "3 of 12 places", and
the audit found nothing had ever called it. The course page therefore offered a
Join button next to "Up to 12 learners" with no idea how many places were taken,
so the way to learn a class was full was to choose it, pick which child was
joining, press the button and be refused by `join_cohort()`.

**Why it stayed unbuilt is the roster boundary, and the boundary is right.**
`cohort_members_read` is deliberately narrower than `cohorts_read`: a learner sees
their own membership and their family's, never a class list of other people's
children. That rules out counting rows client-side, which is what the teacher's
own cohort page does, because a teacher may read the roster.

**`cohort_places(uuid[])` returns the number and nothing the number is made of.**
One row per cohort the caller may already read, with `cohort_id` and
`active_members` and no third column, built on `cohort_member_count()` so the
scalar function is finally the definition rather than a bystander. It is SECURITY
DEFINER because it has to read membership rows the caller cannot, and that is
what a definer function is for; three of twelve places taken is not personal data
about the three.

**A cohort the caller cannot read is absent, not zero.** A zero would make a draft
class look like an open one with room in it. Absent means unknown, and unknown is
rendered as silence: `summarisePlaces()` returns `full: false` whenever the count
is missing, so an unreadable number never fills a class and never takes the
button away. Refusing a joiner over a count that could not be read would be worse
than letting them try — `join_cohort()` still enforces capacity under a row lock,
so the count is a courtesy and never the authority.

**On the page.** Each class card now reads "3 of 12 places taken" where a count
could be read, keeps "Up to 12 learners" where it could not, carries a `Full`
badge, and replaces the Join button with a sentence when every place is taken —
including the part that matters, which is that somebody leaving opens one again.
One call covers every cohort on the page rather than one per cohort.

6 database tests, 5 web. No flag: the gate is `can_read_cohort()`, which already
answers to `learning.cohorts`, and a second switch on the same door would be a
second way to be wrong.

**Left open.** `can_read_support_case()` is still dead and still claims in its own
comment to be used by the writer functions; the predicate it expresses is written
inline in two policies instead, so who may read a support case is defined in three
places.

### Who may read a support case is written down once, 2026-10-20

The audit's second dead function was `can_read_support_case()`, and its comment
claimed it was "used by the writer functions; reads are handled by RLS". Neither
half was true. No writer calls it — each checks the row it is already holding —
and the reads that were "handled by RLS" spelled the same predicate out twice
more:

- `support_cases_read` — `requested_by = me OR is_privileged(me)`
- `support_case_messages_read` — an `EXISTS` over `support_cases` repeating that
  rule, plus the internal-note condition
- `can_read_support_case()` — `is_privileged(me) OR EXISTS (this case, requested
  by me)`

Three copies of one rule. That is not a style complaint: the next change to who
may see a case — an assigned agent who is not otherwise privileged, say — would
have had to be made in three places, and a policy that is missed does not fail
loudly. It either shows one person a conversation that was not theirs or hides
one that was, and both look like the system working.

**Both read policies now ask the function.** What stays inline is the part that
is genuinely a second question: who may read a *case*, and which of its
*messages* they may read. An internal note still stays inside the team even from
the person who opened the case, and a staff member who opens their own case still
reads its internal notes, because internal notes are staff information and they
are staff. That rule belongs in the message policy, where a reader of it will
look, not in a function whose name is about cases.

**The behaviour is identical, which is the point.** The existing tests pinned the
outcome either way — a case visible to its requester and to staff and to nobody
else, an internal note invisible to the requester and readable by staff — and
they pass unchanged. No recursion either, and the reason is the objection that
usually stops this refactor: the function is SECURITY DEFINER, so its own lookup
of `support_cases` runs as the owner and is not filtered by the policy that
called it. `cohorts_read` has used `can_read_cohort()` the same way since cohorts
were built.

**Three new tests pin the shape, not only the outcome**: both policies mention
`can_read_support_case()` and neither still contains `requested_by`; the
internal-note rule is still in the message policy; the function answers true for
the requester, an agent and an admin, and false for a stranger; and a staff
requester reads the internal note on their own case. 917 database tests. No web
change, no new function, no new policy.

That closes the audit's dead-function list. What the audit found that is still
open is a category rather than an item: tables written by triggers and read by
nobody — `order_status_history`, `publication_events`, `entitlement_events`,
`access_checks`, `subscription_history` — which are waiting on a support console
rather than on a decision.

### The teacher can set the number a learner is refused by, 2026-10-20

Publishing "3 of 12 places taken" on the course page made `cohorts.capacity` a
promise to the people it refuses — and it could only be set once, in
`create_cohort()`. A teacher with fourteen people who want in and a class opened
for twelve had two bad options: cancel a running class and open another, moving
everybody's membership and leaving the conversation behind, or turn learners away
for a number typed once, before anybody had joined. The obvious follow-up to
showing a learner that a class is full is letting its owner make it bigger.

**`set_cohort_capacity()` is the sibling of `set_cohort_join_window()` and keeps
its terms**: the teacher who opened the class or staff, a draft or an open class,
a row lock, an audit entry (`cohort.capacity_set`, with the previous size, the new
one and the membership that set the floor). A closed or cancelled class has a
size rather than a setting — it is not taking anybody, so editing the number
would be editing history.

**The floor is the people already in the room.** A capacity below the current
active membership is refused and names the count. Both alternatives are worse:
allowing it makes the published number a lie in the direction that matters, since
a learner reading "14 of 12" is being told there is room; enforcing it means
removing a learner from a class because a number changed, which for a child's
class is the most harmful thing this feature could do — a parent gets a withdrawal
they did not ask for and cannot see the cause of. Raising the limit is the act
that needs no protection and is the one a teacher wants.

**The lock is the same one `join_cohort()` takes.** Both writers select the cohort
row `for update` before counting, so either a join lands first and the floor is
computed with that learner in it, or the limit lands first and the join is refused
for spare capacity. Without that ordering the floor could be checked against a
count that is already stale — which is how a class ends up over its own limit,
silently, with both writers individually correct. A test walks it: fill a class of
six to three, set the limit to three, and the fourth joiner is refused while
`cohort_places()` reports three; one of the three leaves and the refused learner
gets in, at the same limit.

**Null is no limit, and it is a choice rather than an omission** — "I will take
everybody" is a real position, and blank is how the create form already spells it,
so the writer takes it explicitly rather than defaulting to it. Zero is refused:
a class nobody can join is a cancelled class in a different hat. **Not
flag-gated**, like the join-window writer and unlike `create_cohort()`: the flag
governs arriving, so with it off a size change publishes nothing, and taking the
control away mid-class would strand a teacher over a decision that is not about
them.

**On the screen.** The size control sits beside the join window on each class card
in `/teach/[courseId]/cohorts`, with the current membership in the label, blank
for no limit, Save disabled until something changes, and the floor stated before
it is hit — "nobody is removed to make a number true" — so a teacher who wanted to
shrink a running class learns that here rather than from a refusal. One call,
`POST /api/cohorts` with `action: 'set_capacity'`.

7 database tests, 4 web. No new flag, no new policy, no new table.

### A large recording goes up in pieces, and a piece that fails is retried, 2026-10-21

The browser ceiling was storage's, not ours. One presigned PUT carries at most
5 GiB less 5 MiB and cannot be resumed, so a failure at 90% of a 4 GiB recording
started again from zero, and a file above the cap could not be sent at all even
though `register_media_upload()` would have taken it. The database allows 8 GiB,
so the two numbers disagreed and the browser was the smaller one.

**Parts close the gap and change what a failure costs.** Above 32 MiB the
transfer is a multipart upload: `lib/multipart-upload.ts` in the browser PUTs
16 MiB slices straight to storage, and `lib/media-multipart.ts` on the server
opens the upload, signs the slices, assembles them and throws them away. A part
that fails is retried up to three times against a freshly signed URL, so a
dropped connection costs one part rather than the file. `MAX_BROWSER_UPLOAD_BYTES`
is now `MAX_UPLOAD_BYTES` — 8 GiB — and the refusal above it says the limit is on
the record rather than on the network, because that is what it is.

**The server keeps the three calls that matter.** Initiate, complete and abort
are server-side signed requests; the browser only PUTs presigned parts. That
split is the design and not an implementation detail: the XML stays out of the
tab, the upload id is learned from storage rather than being told by a client,
and no URL that could finish or cancel an upload is ever handed to a browser — a
presigned complete URL is a credential that assembles whatever parts it is
pointed at. `request_upload` now takes a `transport`, and registering for
`multipart` mints no single-PUT URL, because an unused presigned PUT is still a
live credential for an hour.

**Part URLs live fifteen minutes and are signed eight at a time.** Signing all
512 of an 8 GiB upload at the start would hand out credentials that outlive the
transfer and expire before they are used; batches mean a multi-hour upload never
meets the one-hour window a single presigned PUT is limited to, which was the
other half of why a large file could not finish.

**Parts go one at a time.** Parallel would be quicker on a fast link and worse
everywhere else: four parts in flight on a connection that drops is four retries
and a progress bar that moves backwards. Sequential gives a number that only
rises, on the connection this platform is actually used on, and it makes the
browser half testable without a scheduler.

**Completing is not publishing.** Assembling the object leaves the row `pending`;
a staff member still verifies the size in storage before it becomes `available`,
exactly as for a single PUT. And complete refuses a short part list instead of
assembling it — storage would accept fewer parts and produce a truncated object
whose row still declares the full size, which is a lesson that stops in the
middle and is found later by somebody comparing two numbers.

**What is deliberately not here:** the upload id is not written to the database,
so a page reload cannot resume a half-finished upload. The part that fails is
retried, which is the common case and the expensive one to get wrong; a tab
closed mid-upload starts again. Storage aborts an incomplete multipart upload on
its own lifecycle after seven days, and this asks for an explicit abort when it
gives up, so an abandoned upload costs a week of storage at worst and usually
less. Recording the in-flight upload on the row — so a later visit can resume it,
and an operator can find and delete an orphan — is the next unit.

**One new deployment requirement.** The masters bucket needs a CORS rule allowing
`PUT` from the app's origin with `Access-Control-Expose-Headers: ETag`. Every
part uploads happily without it and the assembly then fails, because a browser
may not read a response header the server did not expose — so the error names the
header instead of reporting a mystery at the end of a long transfer.

49 web tests: 14 on the signing and the XML, 22 on the server's three calls, 12
on the browser's flow, and one on where the threshold sits. No migration, no new
flag, no new table, no new route.

### An unfinished upload can be found again, and ended, 2026-10-21

Parts made a large file possible and left a new kind of mess: an upload nobody
finished. A multipart upload stores its parts as they arrive and the object does
not exist until it is completed, so a tab closed at part 300 of 512 left bytes in
the bucket that no row in the schema mentioned — billed, unservable, invisible.
The same gap cost the teacher the whole file, because a second attempt registered
a second row and started again from zero.

**The upload id is storage's, and it stays that way.** Nothing here records an
in-flight upload, so the way back to one is a question to the bucket: list the
unfinished uploads for a key, then list the parts of the newest one. That is a
choice over the obvious alternative of a column on the row. A recorded id has to
be kept true against a transfer happening somewhere else, and its failure mode is
a row claiming an upload is in flight that storage completed or expired days ago.
Storage is the only authority on what it is holding, and asking costs one Class A
request at the moment somebody actually asks.

**The lookup is by checksum and size, because those are what survive a reload.**
A page cannot remember an upload id it no longer has, and a teacher cannot be
asked which of their pending files they meant. So `resume_upload` takes the digest
the browser just computed and the size it just read, and finds the caller's own
newest `pending` row that matches. Scoped to `uploaded_by` even though the read
policy already hides somebody else's row from a learner: staff may read every row,
and a member of staff uploading a file a teacher left half-sent must not be handed
the teacher's object key to write into.

**The parts come from the bucket, not from memory.** Which parts arrived, and the
ETags that completing them needs, are read back with a parts listing. Resuming
from a browser's account of what it sent would assemble an object out of guesses,
made by the one party that has already lost its state once.

**A resume that does not fit is refused rather than completed.** A listed part
whose size is not the size this deployment's plan makes — a part size that has
changed, a row whose declared size has changed — leaves the upload alone and
starts a new one, with the reason in the response. Completing it would produce an
object whose bytes do not line up with the row describing it. A document that is
not a listing at all is refused for the same kind of reason: an HTML error page
with a 200 on it parses as "nothing unfinished", which is a wrong answer that
costs a teacher a transfer they had already paid for.

**Reusing the row is the other half of the win.** A second attempt now continues
the first attempt's record instead of opening a second `pending` row — including a
small file that travels in one request, where the same checksum finds the same row
and the route signs a fresh PUT for the key already derived. Without that, every
failed attempt left a file in the teacher's library that would never have bytes
behind it.

**Staff can see the ones nobody is coming back for.** `/admin/media` gained a
panel that lists the bucket's unfinished uploads on a button. The listing is a
paid request to storage and the page already reads the moderation queue, so paying
for it on every visit to look at something usually empty is not a trade to make
silently. Each entry names the file it belongs to where its key was derived from
an asset, says how long it has been sitting there, and can be ended on a written
reason.

**Ending one records the decision, then deletes.** `abandon_media_upload()` is
staff-only, needs a reason, writes `media.upload_abandoned` with the key, the
bucket, the upload id, the declared size and the asset's state at the time, and
touches no row. The order is the point: if storage then refuses, the trail says
what was decided and why, and storage's own seven-day lifecycle finishes the job —
while the opposite order would leave a deletion with no record whenever the write
failed, which is the one gap an audit trail may not have. The response says which
of the two happened, because "recorded and deleted" and "recorded, storage
refused" are different facts.

**Nothing here changes a file's state.** An unfinished upload says nothing about
the asset: it may be `pending` and about to be resumed, or `available` because a
later attempt succeeded and these are the parts of an earlier one. Quarantining or
withdrawing as part of a cleanup would be a decision about the file dressed up as
a decision about the bytes, and `delete_media_asset()` already exists for that
decision.

9 database tests, 43 web. One migration, one function, no new table, no new flag,
no new route.

### The history behind a support case is now readable, 2026-10-21

Six tables were written so that a support agent could explain how a state came
about — `order_status_history`, `subscription_history`, `entitlement_events`,
`course_enrolment_version_history`, `publication_events` and
`adult_learning_shares` — and nothing read any of them. They are append-only where
it matters, they are indexed, and between them they hold the only answer to the
question a paid platform gets most often: "I paid and I still cannot watch."
Answering it means reading four tables at once — what the order did, what the
subscription did, what the access grant did, and whether the learner was moved to a
different version of the course in between. Until now the answer was to read the
current state of those rows, which is precisely the state that has already changed.

**One function, one authority.** `support_case_history(case)` returns the whole
bundle as one `jsonb` document: who asked, which learners the case is about, and
the orders, subscriptions, access grants, enrolments, publication events and
progress shares behind them — each with the steps that got it there and the name of
whoever took each step. It is `SECURITY DEFINER`, staff-only, and it writes nothing.

The alternative was a panel that queries the tables, which would have needed read
policies widened to staff on two of them: `subscription_history` is readable by the
billing account's members and not by staff, and `order_status_history` is readable
through the order. Widening a policy to answer one screen's question gives every
future staff query the same reach, permanently, with nowhere to write down what
support may see. One function is one place to decide it, and the six tables stay
closed to everything else.

**The scope is the requester's, not the reader's.** This is the part that is easy
to get wrong and impossible to notice from the staff seat. The bundle describes
what the person who asked could see: their own learner profiles, the learners in
their family other than a billing-only member, the children a verified guardian
holds the progress permission for, and the billing accounts they are an active
member of — plus the single order they named on the case, which is in scope even
when they have left its account, because naming an order is the requester saying
which payment they mean. `can_access_learner()` cannot express that here. Inside a
`SECURITY DEFINER` function the caller is the member of staff, so it answers yes for
every learner on the platform and would hand an agent everybody's enrolments and
grants. The same rule is written out against the case's `requested_by` instead, and
the tests ask every question from two seats — the requester's and a stranger's —
because a scope that returns too much passes every assertion written from the staff
side of the screen.

**A cap is never silent.** Every section reports how many rows exist beside the
rows it returned, so a panel showing 50 publication events out of 63 says so. The
histories nested inside a row are uncapped on purpose: a state machine has a
handful of transitions, and a list that hides one of them would be worse than no
list.

**Two findings, recorded rather than papered over.**

- `access_checks` is not in the bundle. Its table comment says "Recorded so a
  support agent can explain a denial", and nothing in the schema, the web layer or
  the worker has ever inserted a row into it: the diagnostic was designed and never
  wired, presumably because keeping it would mean a write on every lesson every
  learner opens. An always-empty section would read as "no denial happened", which
  is the one wrong answer a support agent cannot recover from, so the panel says in
  words that refusals are not recorded and points at what to read instead: a refusal
  is a missing, expired, suspended or revoked grant, or a version that was retired.
  This corrects the audit row in the ledger above, which listed the table as
  trigger-written.
- `adult_learning_shares` is in the bundle, and here empty means empty: nobody has
  been given sight of this adult's progress or achievements, which is a true answer
  to a real question. What is not true yet is that a person can create one — no
  screen or route writes this table, only SQL — so the console can show a share and
  nothing in the product can make one.

**Where it renders.** `/support/<caseNumber>`, for staff, above the case actions, in
collapsed sections so a conversation stays readable. The page already serves both
seats and already knows whether the caller is staff; the function refuses everybody
else in any case, so the panel is not the only thing standing between a requester
and those tables. `platform.support` gates opening new cases and does not gate
reading one, so the history is there for cases opened before the flag went off —
work in flight is not stranded by a switch.

21 database tests, 14 web. One migration, one function, no new table, no new flag,
no new route.

### The reviewer register, 2026-10-21

Four tables were built to say who may review a course — `reviewer_qualifications`,
`reviewer_subject_authorizations`, `reviewer_conflict_declarations` and the subjects
they name — and not one of them had a writer. A profile could only reach `active` by
hand in SQL, and `active` is what everything downstream needs: an assignment can only
be made to an active reviewer, publication needs a scholarly approval, and a scholarly
approval needs an assignment. So the peer-review path was not partly built. It was
complete at the version end and empty at the people end, which meant **no course could
be published through the product at all**.

`/admin/reviews` even explained why its dropdown was empty — "a reviewer has to create
their own profile before staff can assign them" — which was true and unreachable,
because there was no screen where anybody could.

**Seven functions, and no actor anywhere.** `register_as_reviewer`,
`set_reviewer_status`, `record_reviewer_qualification`, `verify_reviewer_qualification`,
`set_reviewer_authorization`, `declare_reviewer_conflict`, `assess_reviewer_conflict`.
Each is `SECURITY DEFINER`, writes to `governance_audit_events` under a `reviewer.*`
action, is revoked from `public` and `anon` and granted to `authenticated`, and takes
no parameter naming the caller: the session says who is asking, so there is no way to
speak for somebody else.

**Who may decide.** Governance staff means `governance_admin` or `platform_admin`, not
`is_privileged`. `is_privileged` also admits a support agent, who should be able to
read a case and refund an order without thereby appointing the scholars who sign off on
what the platform teaches. The route checks the same pair, and a database test pins the
refusal: a support agent is privileged and still may not verify a reviewer, authorise a
subject, or hear a conflict.

**The rules worth writing down, because each is a choice rather than a default:**

- Applying is the only route to `applicant`, and nothing may set that status by hand.
  An admin who could set it could un-verify a reviewer and leave the record saying
  somebody had checked them. Suspension and retirement both need a written reason;
  checking somebody does not.
- Activating a reviewer records who did it, **once**. Reinstating a suspended reviewer
  does not rewrite `verified_by`, because verification is a fact about a moment, not a
  pointer to whoever last touched the row.
- A qualification a reviewer records is always `pending`, and recording one does not
  authorise a subject — that is a separate decision. Staff may record one for somebody
  else, and the audit entry says which of the two happened.
- A validity window that has already closed cannot be recorded whichever way the
  decision goes: `verified_at` is written on a rejection too, and `rq_validity_window`
  compares the two, so a past date would come back as a constraint name rather than a
  sentence.
- Granting a subject updates the live row; revoking keeps it, so granting again writes a
  new row beside the old one. What was taken away stays part of the record.
- Declaring a conflict bars an assignment at once, before anybody has read it, and keeps
  barring until it is heard. `accepted` and `resolved` are the only two answers that let
  the reviewer work again, and both need the reason in writing, because either one ends
  a bar that was protecting a course.
- Only the reviewer may declare one. `rcd_insert` admits nobody else and the function
  takes no reviewer parameter, for the same reason: a declaration about somebody else is
  not a declaration.

**Two grants, and why each is safe.** `reviewer_profiles` and `reviewer_qualifications`
are granted by column so that `internal_notes` and `evidence_reference` cannot survive a
`SELECT *`. That is right and it stays. What it also does is refuse a query that
*filters* on an ungranted column — and one such query was already shipped:
`fetchAssignableReviewers()` asks for active reviewers with `deleted_at is null`,
`deleted_at` was not in the grant, so the reviewer dropdown on `/admin/reviews` failed
with `permission denied for table reviewer_profiles` for every member of staff who
opened the page. The screen did not have an empty dropdown; it had no dropdown, and the
page could not render. `deleted_at` is now granted — a closed profile is not a secret,
the read policy already hides the row from everybody but staff and the reviewer — and so
is `verified_by` on both tables, because a governance screen that cannot say who checked
a reviewer asks to be trusted instead of showing its record. One database test runs the
register's exact column lists as `authenticated`; a second asserts that `internal_notes`,
`evidence_reference` and `SELECT *` are still refused, so the fix cannot quietly become
an over-grant.

**What still cannot be shown.** `evidence_reference` stays unreadable by every client,
deliberately: `reviewer_qualifications_read` admits all privileged roles, a support agent
among them, and the storage key of an identity document is not something to hand out
alongside a refund permission. So checking a qualification on this register is a
judgement made from a document held outside the platform, and the card says so in words
instead of hiding it behind a button that looks like it saw something. A signed evidence
route for governance staff is the missing piece, and it is recorded as such rather than
papered over.

**Where it renders.** `/admin/reviewers`, for governance staff: a count of who is waiting
to be checked, who is verified and who is barred by a declaration, a filter over the
same three groups, and per reviewer their status decision, their qualifications with a
check on each, their subjects with a grant form, and their conflicts with an assessment
on each. The reviewer's own end is on `/review`, above the queue, because an empty queue
with no entry on the register is not a quiet page — it is a person who cannot yet be
asked. A declaration about one course is made from that course's offer
(`/review/<assignmentId>`), where the version is known; a standing declaration is made
from `/review`.

**A second defect, found the same way.** `fetchSubjects()` asked `subject_areas` for
`parent_id`. The column is `parent_subject_id` and always has been, so the query came
back `column subject_areas.parent_id does not exist` — and `/teach/[courseId]` awaits it
beside the rest of its reads, so the teacher's course page could not render either. Its
test passed because the stub was fed `parent_id` rows: a stub answers whatever columns
are asked for and cannot know the table. That stub now records column lists, and the test
asserts the real name.

**Left open on purpose.** Whether a scholarly authorisation should require a verified
qualification in that subject — see the open decisions below. It is not implemented
either way, and the screen shows the verified qualifications beside the grant control so
that whoever decides can see what they are deciding about.

32 database tests, 20 web. One migration, seven functions, no new table, no new flag,
three new route entries.


## Open external decisions (not to be guessed)

- Payment provider merchant/sandbox credentials and callback verification (P12).
- **R2 credentials, and one bucket setting that comes with them.** No credential
  exists in this environment, so no byte has been sent to a real bucket. When
  they are issued, the masters bucket also needs a CORS rule: allow `PUT` from
  this app's origin, and `Access-Control-Expose-Headers: ETag`. Without the
  exposed header a multipart upload transfers every part and then cannot assemble
  them, and it fails at the end of the transfer, which is the most expensive
  place to discover a deployment setting.
- Payout policy/preconditions, tax and jurisdiction treatment, and disbursement
  credentials.
- **Whether a scholarly authorisation should require a verified qualification in
  that subject.** Raised by the reviewer register (2026-10-21) and deliberately not
  implemented either way: it is a governance policy about who is trusted with what the
  platform teaches, and inferring it would bury the answer in a predicate. Today
  `is_authorised_reviewer()` reads authorisations only, and `/admin/reviewers` shows a
  reviewer's verified qualifications beside the grant control so the decision can be
  made with the evidence on screen.
- The saved-lessons questions are answered (2026-10-20, `DECISIONS.md`); what
  is left is code. Both delivery models are wanted — live classes recorded and
  saved, and offline download of anything saved — with the download gated to a
  Plus subscription, which is now built and enforced. "Other teachers" means a
  reviewer checking quality for a named period, which wakes the dormant
  peer-review path rather than opening a shared library. A live class containing
  children is recorded as teacher-only capture: learners' video and audio are
  never recorded. Still to build:
  - **A reviewer-scoped read path for lesson media**, tied to an assigned
    review and a period, so access ends with the review rather than with a
    memory of who was trusted.
  - **Live capture with teacher-only recording.** No live-class tables exist
    yet, so this is design plus schema, not a wiring job. It is also the one
    workload that would reopen the Stream decision, because self-hosting a
    media server is not a weekend; costed in §7 of
    `docs/decisions/media-storage-costing.md`. Because learners are never
    captured, the child-recording safeguarding question does not arise.

Settled on 2026-10-19 and no longer open: the teacher/platform revenue share
(**50%**), what a course author may see about a learner (**individual progress
only inside an opted-in cohort**), and when a cohort stops accepting joiners
(**the teacher sets it, defaulting to the start date**).
- Automatic subscription renewal worker and provider support.
- Legal review and any locale-specific safeguarding/child-consent requirements.

The dormant scholarly panel and other unbuilt product groups remain in
`ROADMAP.md`, `FLAGS.md` and `NEXT.md`'s implementation history below. Do not
claim external integrations work without credentials or provider callbacks.

---

## Implementation history (counts below are historical snapshots)

### Also done since: the authorization matrix

`authorization_matrix: incomplete` was the last open Phase 1 item. It is now
derived from the migrations and written up in
`docs/decisions/authorization-matrix.md`, with
`supabase/tests/authorization.test.mjs` enforcing all ten of the record's
required access tests — two of which had no coverage anywhere.

Writing it down found three real defects, all fixed in
`20261021000100_authz_fixes.sql`:

1. a family `billing_manager` could read the children's profiles
2. an assigned reviewer could not read the content they were asked to review
3. **a verified guardian could not see the child they were verified for** —
   `guardian_relationships` was consulted by no policy at all, so the whole
   verification workflow gated nothing. That workflow is the machinery behind
   verifiable parental consent, which COPPA requires for US under-13s.

**190 tests pass.**

### Done

- [x] Next.js + TypeScript app, `npm run build` clean, 7 routes
- [x] Email+password **and** phone OTP (D3)
- [x] E.164 normalisation at the boundary, 7 unit tests
- [x] Sign-in, sign-up, confirmation and sign-out
- [x] `/learn` reads enrolments with **no client-side filter** — RLS decides
- [x] `supabase/tests/app.test.mjs` pins that data contract (177 tests total)
- [x] `.env.example`, no secrets committed

### Still open — needs a live Supabase project

This sandbox has no Supabase instance, so the app builds and renders but the
authentication round trip is unverified. Pointing `web/.env.local` at a real
project and confirming in a browser is the remaining step.

- [ ] Sign up with email, confirm, sign in
- [ ] Sign in with phone OTP; confirm the number arrives as E.164
- [ ] `/learn` shows only your own enrolments **in the browser**
- [ ] Apply the migrations to the real project with `supabase db push`

### Today's sentence

> Create the Supabase project, push the migrations, and confirm the auth round
> trip in a browser.

### Also done since: the catalogue and the visual identity

**White and green**, per the decision recorded in `DECISIONS.md`. The tokens
live in `web/src/app/globals.css` and nowhere else — changing the brand means
changing that one block.

`/catalogue` (search, subject filter, audience filter) and `/courses/[slug]`
(outline, sections, lessons, preview flags). `web/src/lib/catalogue.ts` holds
the query so the landing page and the catalogue cannot drift into two ideas of
what "on the shelf" means. `subject_areas` is seeded: 9 disciplines, 26
subdivisions, two levels — a deeper tree makes the filter unusable on a phone.

`supabase/tests/catalogue.test.mjs` pins the public contract, and found a
fourth defect: `courses_read` admitted any active course whether or not a
version had ever been published, so an author who set the wrapper to `active`
during drafting put the title and description of unpublished work on the
public internet. The app filtered it out, but a presentation filter is not an
access control. Fixed in `20261022000200_catalogue_visibility.sql`.

**198 tests pass.**

### Also done since: enrolment, and the payment boundary

Both at once, deliberately, because doing the first without the second would
have hidden the thing that mattered.

**Free enrolment works.** The course page resolves the offering from products
and prices rather than from a flag on the course, and `/api/enrol` takes a
course id and nothing else — no learner id, no price, no source. Every one of
those would have been a way to lie.

**The `PaymentProvider` boundary is real code**, not a comment.
`web/src/lib/payments/provider.ts` is the interface an adapter must satisfy;
`UnconfiguredPaymentProvider` is the provider that says no, and it stays in
the tree — an unconfigured deployment must keep behaving that way.
`web/src/lib/money.ts` is D4 in TypeScript: `bigint` minor units, and a float
is a type error rather than a silent truncation. 19 unit tests.

**A serious hole, found by wiring the button.** `course_enrolments_insert`
checked only `can_access_learner(learner_profile_id)` — that you may act for
the learner. It never asked whether the course was for sale. Any signed-in
user could POST an enrolment against a paid course with `source = 'free'` and
walk past the entire payment stack: no product, no price, no order, no
callback. The entitlement model was correct and simply never consulted at the
one moment it mattered. Fixed in `20261023000100_enrolment_gate.sql`;
`supabase/tests/enrolment.test.mjs` holds the negative cases.

**208 tests pass.**

### Also done since: progress and completion

`/learn` now shows a real progress bar per course, and `/learn/[enrolmentId]`
is the course view: sections, lessons, mark complete, undo. `POST
/api/progress` records it. Mark-complete is optimistic — a tick that waits on
a round trip feels broken on a slow connection, and ease of use is the first
design constraint.

Two things worth knowing about the model:

**Progress is pinned to the version the learner enrolled into.** Recording
progress against a lesson from a different version is refused by
`enforce_progress_version_match`. Publishing v2 leaves v1 progress untouched
and does not move anyone's enrolment. Both are pinned by tests.

**Completion is derived, not stored.** There is no `course_completions` table.
`evaluate_completion()` recomputes from recorded facts and returns what is
still blocking, so a completion report cannot drift out of sync with a
progress bar. `progress.test.mjs` asserts the table does not exist, so nobody
adds one by accident.

**219 tests pass.**

### Also done since: assessments

`/learn/[enrolmentId]/assessment/[assessmentId]` is the quiz. Answers save as
they are chosen rather than on submit, so a dropped connection mid-quiz does
not cost the learner their work. `POST /api/assessment` takes three verbs —
start, answer, submit — and the learner and enrolment are always resolved from
the session, never from the body.

The attempt is started server-side when the page loads, not on a button press,
so a learner who opens the page and closes the tab has still used an attempt.
That is what `attempt_limit` is meant to mean.

**The answer key has no read path in the application, and that is tested.**
`SELECT *` on `assessment_questions` is refused outright rather than returning
the granted columns, because the protection is column privileges and a
table-level grant would silently undo it. The suite asserts the star form
fails, that `answer_key` cannot be selected directly, and that **even a
platform admin cannot read it through SQL** — grading happens inside
`grade_response()`, which is the only reader.

**231 tests pass.**

### Also done since: the admin flag dashboard

`/admin` is the page the standing architecture decision points at — build
everything, ship it off, turn it on from here. All 87 flags from `FLAGS.md`
are seeded into `platform_settings`, each with its gate type and its written
precondition, so the dashboard shows *why* a flag is off and not only that it
is.

**A `code`-gated flag cannot be enabled at runtime, and that is a trigger.**
31 of the 87 need a deploy, a provider, or a policy document first. Enforcing
that in the UI by hiding the switch would not be a control — the API is
reachable and so is psql. `reject_code_flag_enablement()` refuses it; a
migration can still do it by setting `app.bypassing_code_flag`, the same
pattern the version lock and enrolment pin use.

Two things had to change to make this possible. `platform_settings` had no
SELECT policy at all, so nothing could render the list; it now has one,
privileged-only, and an ordinary signed-in user still reads zero rows. And
`FLAGS.md` held two duplicate keys — `learning.wishlist` and
`teaching.applications`, each listed twice with different preconditions. Both
were merged with their preconditions preserved; a register with duplicate keys
cannot be a primary key.

**243 tests pass.**

### Also done since: the family dashboard, and a real defect

`/family` is the other half of the product. A child here is a
`learner_profile` under a `family`, never a `user` (D2) — no email, no
password, no date of birth. The page shows each family's children with their
age band and per-course progress, plus who the adults are. Nothing filters by
the signed-in user; RLS decides what comes back, including the case that used
to be a defect: a billing-only member sees the family and none of its
children.

Adding a child asks for a name and an age band and nothing else. That is the
whole COPPA-adjacent surface, and the constraints doing the work are in the
database: `lp_children_need_age_band`, `lp_no_child_login_yet`, and
`lp_insert` requiring active family membership.

**The defect.** A parent could insert a child profile but could not read back
its id:

```sql
insert into learner_profiles (...) values (...)              -- allowed
insert into learner_profiles (...) values (...) returning id -- refused
```

`lp_read` was written as `is_learner_family_member(id)`, which joins
`family_memberships` back through `learner_profiles`. The SELECT policy is
applied to an `INSERT ... RETURNING` result too, and at that instant the new
tuple is not visible to the separate SECURITY DEFINER query inside the helper
— the command counter has not advanced. `is_family_member_of()` decides from
the row's own `family_id` instead, with no join back, and excludes
`billing_manager` so widening it does not quietly undo that fix.

This would have failed at the first child anyone added, because
`.insert().select('id')` is what every client library compiles to. It is
pinned by a regression test that was verified to fail without the fix: 2
failures with the predicate removed, 0 with it restored.

**256 tests pass.**

### Also done since: the teacher's side

`/teach` is the course creation and curriculum tools. Without it, nobody but
someone with database access could put content on the platform — which for a
multi-instructor product is the whole point.

A teacher creates a course (one field; the slug is derived, the first version
is created with it because a course with no version has nowhere to hold
content), then adds sections and lessons, then submits for review. The
curriculum editor renders a published version read-only with an explanation
rather than disabled controls: a greyed-out button invites you to find the
thing that un-greys it, and here there is nothing. Changes go into a new
version.

Only "submit" and "withdraw" are offered to an author. Approving belongs to a
reviewer and publishing to a platform admin, and the transition table refuses
the author regardless of what the client sends. The actor passed to
`set_course_version_status()` comes from the session, never the request body —
letting a caller name the actor would make the transition table decorative.

**A subtlety worth recording.** The write policies on `course_sections` and
`lessons` are phrased as `can_read_version()`, which is true for *any* signed-in
user on a published version. So the thing that actually stops a learner from
injecting content into a course they are enrolled in is the D5 lock trigger,
not the policy. `authoring.test.mjs` asserts the behaviour rather than the
policy shape, so a future tightening of the policy cannot quietly become the
only thing holding.

Two of my own assertions were wrong before this passed, both from the same
recorded trap: writes inside `asUser()` roll back, and the first error inside
it aborts the transaction. A third read was wrong for a different reason — an
active course with no published version is not readable by a non-author at
all, so the teacher under test could not see the title they were trying to
change. The row is now compared as superuser.

**268 tests pass.**

### Also done since: certificates and public verification

`/certificates` lists what you have been awarded, and `/verify/<number>` is a
public page anyone can load without an account. Certificates were fully built
in SQL — `issue_certificate()`, `verify_certificate()`, `revoke_certificate()`,
`protect_certificate_snapshot()` — with no way to reach any of it.

The privacy design is worth stating because the two halves only make sense
together. `certificates_read` is authenticated-only, so **nobody can enumerate
certificates** — not anonymously, and not as a signed-in stranger. But
`verify_certificate()` is granted to `anon`. The number is the capability: you
can be told about a certificate you already hold, and that is all. If the read
policy were ever opened up, the verification page would become a directory of
every learner on the platform, so both halves are asserted in
`certificates.test.mjs`.

Everything on a certificate is a snapshot — course title, version, holder name,
and the criteria that applied — and `protect_certificate_snapshot()` keeps it
that way. The test renames the course and the learner after issue and asserts
the certificate did not move. A certificate has to say what was true when it
was awarded, or it says nothing.

Issuing is staff-only (`is_privileged` or `support_agent`), requires the
version's completion policy to have certificates enabled, requires the
enrolment to actually be complete, and is idempotent — a second call returns
the existing certificate rather than minting another.

Two of my own assertions were wrong before this passed. I linked three learner
profiles to one auth user, which `learner_profiles_linked_user_key` forbids —
a user gets one profile. And I counted certificates globally to prove none had
been issued, when other suites in the same run legitimately issue some; the
count is now scoped to the enrolment.

**281 tests pass.**

### Also done since: the reviewer's side

`/review` is the queue and `/review/<assignmentId>` shows the outline under
review next to the controls. This closes the loop the authoring work opened: a
teacher could submit for review, and until now nobody could act on it.

A reviewer accepts or declines an offer, then records a decision —
`approved`, `revision_requested`, or `rejected` — with a mandatory reason. The
reason is required for approvals too, because this row is what a teacher
appeals against and "looks fine" is not an appeal answer.

Assignments are created by platform staff and cannot be self-claimed
(`cra_write` is privileged only). A decision's version and scope are read back
from the assignment rather than accepted from the client, so a caller cannot
attach a decision to a version they were not asked about even by trying. The
actor comes from the session.

Recording a decision and moving the version are separate acts on purpose: a
decision is a statement about the content, and the version's status is what
happens next. If the transition fails, the decision stays recorded and the API
says so rather than pretending nothing happened.

One of my own assertions was wrong before this passed, from the same recorded
trap: I read an assignment's status back *after* `asUser()`, which always rolls
back, so it could only ever read `offered`. Both halves of the test are now
asserted inside the block using `RETURNING`, which also makes the
"matched zero rows" case observable — an RLS-blocked UPDATE raises nothing.

**296 tests pass.**

### Also done since: assigning reviews

The queue built last turn could never have had anything in it. Assignments are
created by platform staff (`cra_write` is privileged only) and there was no
staff UI to create one, so `/review` would have stayed permanently empty.
`/admin/reviews` closes that: it lists submitted versions and the active
reviewers, and assigns one to the other.

One constraint shapes the page. `reviewer_profiles_insert` only admits
`user_id = current_user_id()`, so **staff cannot create a reviewer profile for
somebody else** — a reviewer has to make their own first. The page says that
plainly when the reviewer list is empty rather than showing a dead dropdown,
and `review.test.mjs` asserts both halves: a user can create their own profile
and cannot create one for anyone else. That is asserted so the constraint is
not quietly widened later.

The queue filters on `version_status = 'submitted'`, and the test pins that a
draft version is not in it — staff being asked to review something that is not
up for review is the kind of thing that erodes trust in a review step.

**299 tests pass.**

### Also done since: a reviewer could verify themselves

While checking the reviewer onboarding loop end to end I found that a signed-in
user could make their own profile read as verified, in a single statement:

```sql
insert into reviewer_profiles (user_id, reviewer_status, verified_at, verified_by)
values (auth.uid(), 'active', now(), auth.uid());
```

`reviewer_profiles_insert` admits any row where `user_id = current_user_id()`,
and `_update` admits any update to your own row. Neither said anything about
`reviewer_status`, so the two-step version worked too: apply as an `applicant`,
then promote yourself.

It is worth being precise about what that did and did not buy. **It was not a
route to approving courses.** `is_authorised_reviewer()` additionally requires a
live `reviewer_subject_authorizations` row, and `rsa_write` is privileged only,
so `validate_review_assignment()` still refused to assign a self-verified
reviewer to any version with review requirements. I checked that rather than
assuming it, because the severity of the fix depends on it.

What it *was* is a public false credential. `reviewer_profiles_read` shows
active profiles to the anonymous role, so a self-verified profile was displayed
to the world as a verified reviewer — and it landed in the staff assignment
dropdown, which filters on `reviewer_status = 'active'`. So the defect degraded
a human judgement rather than bypassing a machine one.

`protect_reviewer_verification()` now refuses it. The scoping took a second
attempt: my first version exempted "privileged or no JWT subject", which broke
twelve tests across four suites because the fixtures run as superuser with no
claims. The narrower rule is also the more honest one — the defect is a person
verifying their *own* profile, so the trigger fires only when the row belongs
to the acting user. A rule whose exemption is "there is no authenticated user"
can be read as trusting the anonymous role; a rule whose exemption is "this row
is not yours" cannot.

The regression test was checked for teeth: with the guard neutered the suite
reports 1 failure, restored it reports 0. A separate test asserts
self-registration as an `applicant` still works, so the fix cannot quietly
become "nobody can apply to be a reviewer".

**303 tests pass.**

### Also done since: nothing ever created an entitlement grant

This is the most consequential thing found so far, and it was hidden by a
second defect.

`can_access_course_version()` consults `entitlement_grants` and nothing else.
That is the recorded design — enrolment is not entitlement is not availability —
and it was implemented correctly. What was missing is the writer:

| Check | Result |
|---|---|
| `INSERT INTO entitlement_grants` in migrations | **0 sites** |
| References in `web/src/` | **0** |
| Functions mentioning the table | **1** — the reader |
| Triggers on `course_enrolments` | `set_updated_at`, `protect_pin` |
| `record_payment_success()` writes | ledger, orders, audit — no grant |
| Rows in a fresh database | **0** |

No learner was ever entitled to anything. The platform only appeared to work
because `lesson_resources_read` was gated on `can_read_version()`, which is true
for any signed-in user on a published version. Measured:

```
enrolled learner              -> saw the resource URL
signed-in stranger, no grant  -> saw the same URL
anonymous                     -> saw nothing
can_access_lesson(stranger)   -> false
```

The entitlement function gave the right answer and the policy never asked it.
That was Groups 4 and 5 — products, pricing, subscriptions, promotions,
entitlements, orders, payments, refunds — sidestepped by creating a free
account and reading a column.

**The two defects hid each other.** Closing the leak alone would have locked
every learner out of their own courses, because nobody had a grant. Fulfilment
alone would have left paid content readable by anyone signed in. They only make
sense shipped together, which is why both are in this unit.

Two writers now exist. A free enrolment on a genuinely unsold version grants
access to it, via a trigger. A confirmed payment grants what was bought and
then enrols the buyer, inside `record_payment_success()` — grant first, then
enrolment, because `can_enrol_in_version()` requires an existing entitlement
before a sold version may be enrolled in. D4 is unchanged in that function:
order amounts stay authoritative, minor units throughout, idempotent on replay,
an unsigned or already-processed provider event refused, a redirect still not
proof. Subscription line items are deliberately not fulfilled there; they have
their own lifecycle, and inventing one inside a payment callback is how a
subscription ends up granting forever.

**Why the suite stayed green the whole time:** the tests insert grants by hand
(`enrolment.test.mjs` 5×, `group4.test.mjs` 14×). The fixtures encoded an
assumption the application never fulfilled, which is exactly the shape of gap a
passing suite cannot see. One of those tests then had to change: it enrolled a
learner free into an unsold course and asserted they had no access because a
*separate* subscription grant had expired — an assertion that only held while
enrolment conferred nothing. It now attaches a product so the expired
subscription is genuinely the only route to the content.

Both fixes were checked for teeth rather than assumed to have them. Neutering
the read policy gives 2 failures; neutering the free path gives 2; neutering the
paid path gives 3; all restored, 0. The first attempt at neutering the paid path
was ineffective — a `union all` let the original query still run — so the paid
path was verified a second time with a neuter that actually applied.

**312 tests pass.**

### Also done since: checkout, and two more dead ends behind it

Building the paid path turned up two more gaps of exactly the same shape as the
entitlement one — machinery that was correct and nothing connected to it.

**A learner could mark a lesson complete but never open it.** Grepping
`lesson_resources` across `web/src/` returned nothing. The entitlement fix had
made the column properly gated and then no page read it, so a learner saw a title
and a button that recorded completion for material they could not reach. A course
you could finish without ever watching. Now `/learn/[enrolmentId]/lesson/[lessonId]`,
linked from the outline.

The interesting part is that an empty resource list has two meanings that look
identical in the data and mean opposite things: no materials attached, or no
entitlement. Rendering the same message for both would be a lie of omission, so
the page asks `can_access_lesson` and says which it is.

**Creating a billing account made you unable to use it.** `billing_accounts_insert`
allows `created_by = current_user_id()`, but every read of the account and every
write beneath it is gated on `is_billing_member()`, which consults
`billing_account_memberships` alone. Nothing inserted that row, and the policy
that would let someone add a member was itself gated on already being one.
Measured as a real authenticated user:

```
created account: 34fe18de-...
  can the owner READ their own new account? -> NO
  can the owner ADD THEMSELVES as a member? -> NO
  can the owner CREATE AN ORDER on it?      -> NO
```

No bootstrap, and no privileged escape hatch in the UI. An ordinary payer was
permanently locked out of paying, so no order could ever exist for
`record_payment_success()` to confirm. A trigger now makes the creator a member
at creation, scoped on the relationship rather than on whether the session is
privileged — that phrasing has already broken this suite once, because a
superuser fixture has no JWT claims and `is_privileged(null)` is false.

That broke 28 tests with one error, `duplicate key value violates unique
constraint "bam_one_per_user"`: the fixtures insert the creator's membership by
hand, asserting the same wrong assumption the entitlement fixtures did. All four
sites now use `on conflict do nothing`.

**A webhook payment has no human confirmer.** `orders_paid_has_evidence` required
a named actor, and `user_profiles.user_id` is a foreign key into `auth.users`, so
there is no system actor to name. Attributing it to the payer is worse than the
hack of inventing one: "who confirmed this payment?" would answer "the person who
paid it", which is the self-approval this schema forbids elsewhere — a refund
requester cannot approve their own refund. `governance_audit_events.actor` has
always been nullable for exactly this case, so the constraint was refined to
require evidence unconditionally and leave the privileged-actor rule where it is
actually enforced, in `record_payment_success()`. Verified both directions: a
verified event with a null actor confirms; an anonymous manual confirmation is
still refused.

**Then the checkout itself.** `/courses/[slug]/buy` → `POST /api/checkout` →
provider → `POST /api/payments/webhook`, plus `/orders`.

The client posts a price id and never an amount; the amount is resolved from the
`prices` row and the product behind it is checked against the version being
bought. A subscription price is refused rather than sold as a purchase, because
fulfilment grants a course version and a subscription has its own lifecycle.

`/orders` is the provider's return URL and it shows the database's status rather
than inferring success from having been redirected. Access opens when the webhook
lands.

The webhook is the one place that bypasses RLS, via a service-role client, because
a provider callback has no session and both `record_payment_success()` and
`payment_provider_events` would refuse it. The signature is the authorisation
instead, checked against the raw bytes before anything is parsed. The event is
persisted before the payment is applied, so a crash in between cannot confirm a
payment with no record of what confirmed it. Duplicate deliveries are
acknowledged rather than re-applied. Unknown event types return 200, because a 500
makes a provider retry forever.

12 unit tests for `createOrder`, aimed at the ways the money can go wrong — a
price for the wrong course, a dead price, one outside its window, a subscription
sold as a purchase, a line item that fails. One test needed the stub fixed rather
than the code: it could not model a failing write, so the error path was never
exercised and the test passed for the wrong reason.

**320 database tests, 37 unit tests, 32 routes.** Both new migrations were checked
for teeth by neutering them and counting failures, then restoring.

Still blocked on P12: the provider hand-off. Everything up to it and everything
after it is built and tested.

### Also done since: guardian verification, and a COPPA queue nobody could work

The verifiable-parental-consent machinery was complete and correct in SQL all
along: approving a case flips the relationship to active and stamps `verified_at`,
rejecting one revokes it and strips every capability. What was missing was
anything connecting the two halves. Measured:

```
parent creates guardian_relationship  -> allowed
parent creates verification case      -> refused (gvc_admin)
staff creates case and approves       -> works
...and there was no UI for any of it
```

So a request landed at `pending_verification` and stayed there forever, with no
queue for anyone to see. That matters legally rather than cosmetically: COPPA
requires verifiable parental consent before a US under-13 enrolls, and a consent
process nobody can action is not a consent process.

Now `/family/guardians` (ask) and `/admin/guardians` (the queue a person works),
both behind `family.guardian_verification`, off by default as decided. The
staff-only split on cases is deliberate and unchanged — "who may decide that this
adult is this child's parent" is a governance question, not a self-service one.
The gap was the UIs, not a loose policy.

**And a second finding while testing it.** `gr_insert` allowed a request whenever
the caller named themselves as guardian, which any session satisfies for any
child:

```
stranger files a guardian request -> ACCEPTED
  state: {"status":"pending_verification","unverified":true}
  is_verified_guardian_of(child) -> false
```

Not an access leak — the row is unverified and grants nothing, and the helper
correctly says false, which is why it went unnoticed. But it is an abuse vector on
a legal review queue: any signed-in account could queue unlimited claims against
any child, noise at best and a way to bury a real family's request at worst, in a
queue that then has to retain the junk.

20261029000300 drops the self-nomination branch. A family member may still
nominate themselves or another adult — which is how a parent adds a grandparent —
and privileged staff may do either. `is_learner_family_member()` excludes
billing-only members, unchanged and deliberate: paying is not parenting.

Both migrations checked for teeth by neutering them and counting failures, then
restoring.

Four of my own test bugs on the way, all from traps already recorded: fixtures
created inside `asUser()` roll back, so a later `guardian_verification_cases`
insert failed on a foreign key that no longer existed; a write proven by reading
it back afterwards proves nothing inside `asUser()` because the first error
aborts the transaction, so those assertions moved inside the block and read
`RETURNING`; and I invented `families.owner_user_id` and forgot
`fm_joined_when_active` needs `joined_at`.

Also worth recording: two COPPA-relevant screens were absent from the 50-screen
inventory entirely. Added as 19a and 19b rather than renumbering.

**329 database tests, 42 unit tests, 36 routes.**

### Also done since: no child could ever be enrolled

Screen 10 in the inventory was the learner switcher, marked "READY — not designed
anywhere". Building it turned up something worse than an undesigned screen.

A child is a `learner_profile` under a `family`, never a `user` (D2). A child
cannot sign in, so a child cannot enrol themselves. And `enrolInFreeCourse()`
always used the caller's own profile — so the only person who could enrol a child
was the parent, and the application never offered it. **No child could ever be
enrolled through the product**, with the family dashboard, the child profiles and
guardian verification all built around that missing step.

The database already permitted it, and I verified that before building anything:

```
parent ENROLs their child at the DB level -> YES
  free-enrolment entitlement granted      -> 1
  child can access the course             -> true
```

`course_enrolments_insert` is gated on `can_access_learner(learner_profile_id)`,
which covers family members. Same shape as the other four: the machinery was
right and nothing connected to it.

Now `/api/enrol` takes an optional `learnerProfileId`, and the enrol button asks
*who is learning?* when the account has children.

Accepting a client-supplied learner id is the kind of thing that needs saying out
loud, so: it is safe because the decision stays where it already lives. The
policy refuses an id the caller may not act for, and the route deliberately does
not re-implement `can_access_learner`. A second, weaker copy of an authorisation
rule is how the two drift apart. Four tests pin that boundary — an unrelated user
is refused, a billing-only family member is refused, and a refused enrolment
produces no grant.

One consequence I had to fix rather than ship: `/learn` reads enrolments with no
learner filter, so once children can be enrolled a parent's dashboard silently
mixes their courses with their children's. A parent opening a child's course
believing it was their own progress is a real confusion, not a cosmetic one, so
each card is now labelled with whose it is.

`enrollableLearners()` returns the caller plus the *child* profiles in their
families. Adult profiles are excluded because enrolling for another adult would
put one person's decisions on someone else's record. Billing-only members are
excluded by `is_learner_family_member()` — paying is not parenting.

Six database tests. One typing error of my own: building a PostgREST select by
string concatenation defeats its generated types, so the cast had to go through
`unknown` as the rest of the codebase does.

**335 database tests, 42 unit tests, 36 routes.**

### Also done since: per-lesson discussion

Forum and discussion were wanted and confirmed, and there were no tables for it at
all — grepping the schema for `discuss|forum|comment|post|thread` returned only
`content_reports`. This is the first schema added since the five groups closed.

The flag register already carried `learning.discussion` with the precondition
"Moderation policy; who answers; abuse handling", and `platform.moderation` says
"Policy before feature. Sectarian/contentious threads on fiqh topics". That
precondition was settled rather than skipped, because pre-moderation and
post-moderation need different tables and guessing would have meant rebuilding:

* **hybrid moderation** — a post by the course author or by staff is visible
  immediately; anything a learner writes is held until a person approves it
* **peers may answer** — enrolled learners answer each other, not only the teacher

Combined, those give one rule: authority posts are visible, learner posts are
held. A peer answer is a learner post, so it is held too — which is exactly what
makes "peers may answer" safe on a platform teaching faith to children. Peers can
help each other, but unreviewed instruction never appears without someone having
looked at it.

**The rule is enforced by a trigger, not by the application.**
`apply_discussion_moderation()` computes who the author is from the course version
and overwrites whatever `visibility_state` the request supplied. A moderation
model that trusts the client is not a moderation model, and a second copy of the
rule in TypeScript would be the weaker one — which is how the two drift apart.
Three constraints back it, the load-bearing one being `dp_learner_needs_moderator`:
a learner's post cannot reach any state other than pending without a named
moderator. Without that, "held until approved" is a convention rather than a rule.

The flag is checked in the trigger as well as the UI, so the feature is genuinely
off until enabled rather than off only in the interface.

Checked for teeth by letting the trigger trust the caller: one test fails, and it
is the right one.

Three of my own bugs on the way, each worth recording because they are traps
already written down and I walked into them anyway:

* the trigger overwrote `author_user_id` with `current_user_id()`
  unconditionally, which is null for a superuser fixture — nine tests failed at
  once with the same not-null violation. Scoped the override to when there is a
  session; only `authenticated` may insert, so in production it always fires.
* a misplaced bracket put `.rows[0]` outside an `asUser` call, so the error
  escaped the block and poisoned the *next* test's fixture. The symptom was
  "course version not found" in an unrelated test — a good reminder that a
  confusing failure is often the previous test's mess.
* I asserted an RLS-blocked UPDATE would be rejected. It matches zero rows and
  raises nothing, so the statement "succeeds" while changing nothing. The real
  assertion is that the wording is still the reviewed one.

**347 database tests, 42 unit tests, 39 routes.**

### Also done since: refunds could never happen

The refund tables have been in the schema since 20261020000300 with a ceiling
trigger, a self-approval ban, a ledger writer and a refundable-balance function —
and nothing that created a row for any of it to act on. **Zero INSERT sites in
the application, zero in any SQL function.** So no customer who ever paid could
ask for their money back, and all the machinery built to make refunding safe was
unreachable.

It is the eighth instance of the same defect: machinery correct, nothing
connected. And it hid the same way the others did — a green suite, because every
fixture hand-inserts the rows it asserts on.

The writers added follow D4 (frozen), which is explicit that a refund request is
not a completed refund:

* `request_refund()` — the customer asks. Moves no money.
* `decide_refund_request()` — staff approve or decline. Approving creates a
  refund transaction in `pending`, which is still not a payment.
* `complete_refund()` — the provider confirms. Only now does the ledger move.

Collapsing any two would mean money moving on a decision rather than a
confirmation, and the ledger is append-only, so there is no undo.

**The defect it also closes:** `refund_requests_insert` allowed any signed-in
account to file a request against any order, because its only check was
`requested_by = current_user_id()`. Knowing an order id was enough. That is the
same shape as the guardian-request hole fixed in 20261029000300 — self-attribution
is not self-scoping. The policy now requires a billing-account relationship.

`complete_refund()` takes the actor as a parameter, as `record_payment_success()`
does, rather than reading the session. A webhook arrives on the service role
where there are no JWT claims, so reading the session would either reject every
provider confirmation or need an exemption for "no JWT subject" — the shape of
trigger that has already caused two incidents here.

### A harness defect the teeth check exposed

Neutering the self-approval ban left the suite green. That should be impossible,
and the reason it was possible is worse than one bad test:

`rejects(fn, msg)` caught **any** error and returned. The pattern was used only
as the failure text when nothing threw — it never checked the message. So every
`rejects(fn, /regex/)` in all 19 suites was asserting only that *something*
threw. A test expecting "you cannot decide a refund you requested yourself"
passed just as happily on "refund request not found".

Fixed to match the reason when a pattern is given. Exactly one test across the
whole suite turned out to be vacuous — but it was vacuous in the direction that
matters: it guarded a money rule and would have stayed green if that rule had
been deleted.

**A rejection for the wrong reason is not a pass.** That is now enforced by the
harness rather than by whoever happens to remember.

**364 database tests, 66 unit tests, 42 routes.**

### Also done since: payment providers (P12, partially settled)

P12 was the only thing blocking the checkout hand-off, and the seam had been
sitting there deliberately empty since the boundary was written. **MTN MoMo and
Airtel Money are now built** — the two you named.

The architecture is the part that matters for "switch the others on later":
`stripe`, `paypal`, `flutterwave` and `pesapal` are already named in the
database's own CHECK constraint on `payment_provider_accounts`, so the schema
anticipates them. Adding one means writing a file and registering it. A provider
is offered as soon as its credentials exist — **no code change, no redeploy** —
and several can be live at once, because a learner in Kampala may have both MTN
and Airtel and being forced onto one network is an avoidable reason to abandon a
purchase.

### The finding that shaped the design

**Neither MTN nor Airtel signs its callbacks.** MTN publishes no signature scheme
for its collection callback and its own guidance is to use the callback only to
find the order and then re-query the transaction; Airtel publishes none either.

That breaks the assumption the webhook was built on. It rejected anything
unsigned — correct for a signing provider, but it would have silently discarded
every real MTN and Airtel payment. So each adapter now declares
`webhookTrust: 'requery'`, and the handler treats a callback as a *notification
that something changed*, never as proof. The outcome is fetched over an
authenticated status query and **the amount recorded is the one that query
returns, not the one in the notification body**.

Trusting the body is the exploit: anyone who knows an order id could POST a
forged `SUCCESSFUL` and get the course free.

The distinction is declared rather than inferred, because both directions are
expensive — rejecting MTN's unsigned callback loses real payments, and trusting
an unsigned callback from a provider that does sign is a vulnerability.

Two other failure modes that cost money, both tested:

* **Unreachable is not failed.** `fetchPaymentStatus` returns `unknown` when the
  provider cannot be reached, and the webhook defers instead of recording.
  Treating an outage as a failed payment is how someone who paid is told they did
  not, and then charged again on retry.
* **Amounts never become floats.** `toMajorString()` converts minor units to the
  decimal string both providers want, in BigInt. UGX has no subunit and goes as
  `30000`; the obvious float implementation would overcharge by 100×.

MTN refunds go out through **Disbursements**, a separate subscription. Without
those credentials the refund is refused rather than skipped — a refund recorded
as sent but never despatched fails silently, and the customer waits for money
that never moves.

**32 payment tests. 364 database tests, 98 unit tests, tsc clean, 43 routes.**

### Also done since: a refund takes the course back

This was the one open policy question I had refused to decide unilaterally. You
settled it: **a refund revokes course access.**

The revocation machinery had been in the schema since Group 4 and nothing ever
used it — `entitlement_grants` has a `revoked` status, `revoked_at`, `revoked_by`
and `revocation_reason`; `entitlement_events` has a `revoked` event type; and
`eg_revocation_agrees` requires both a timestamp and a written reason. Grepping
the whole schema for a write of `revoked` to that table returned nothing. So a
customer could be refunded in full and keep the course forever. Ninth instance of
the same defect.

**How the rule is drawn.** A *full* refund revokes; a *partial* one does not. The
terse version of the rule does not cover that case, so it is worth being explicit:
someone who paid 40,000 and had 15,000 returned because a lesson was missing has
still paid 25,000 for a course, and taking the whole thing back would be taking
money and goods both. Revocation is therefore tied to the order reaching
`refunded` — nothing left to give back — not to a refund having happened.

**Only the grant that order bought is revoked.** A learner may be entitled to the
same version through a family entitlement, a scholarship or an admin grant at the
same time. If another active grant covers it, access continues and the enrolment
is left alone, because `can_access_lesson()` consults entitlements generally and
would rightly still say yes. Withdrawing the enrolment in that case would lock
someone out of a course they have a right to open.

**Certificates and progress are untouched** (D7). A refund is a money event, not a
claim that the learning did not happen.

Revocation is driven from the same trigger that writes the ledger entry and
updates the order status, so all three move together or none do.

Teeth checked by neutering the revocation: five tests fail, including the one
that matters most — `can_access_lesson()` returning false afterwards. Asserting
the grant row was revoked would not have caught a revocation that updated the
table but was never consulted by the access check.

**A bug the test caught in my own code.** I wrote an explicit insert into
`entitlement_events`, not knowing that `entitlement_grants_record_event` already
writes one on any status change. Two revocation events for one refund — which
reads as a double-revocation in an audit trail, and an audit trail you cannot
trust is worse than none. The idempotency test caught it. Traced it by wrapping
the real function with a logging shim rather than guessing, which showed the
function itself was correct (#1 revoked 1, #2 revoked 0) and so the duplicate had
to come from elsewhere.

**372 database tests, 98 unit tests, tsc clean, 43 routes.**

### Also done since: the two governance channels

`content_reports` and `governance_appeals` both existed, with RLS, policies and
an audit trail — and **nothing wrote to either of them**. That is the same
defect class as the other nine: correct machinery, nothing connected. The
consequences were specific:

- A reader who found a mistranslation or a misattributed hadith had nowhere to
  say so. Moderation catches what a reviewer thinks to look for, and on a
  platform that teaches faith to children the people reading a lesson are the
  ones who notice what a pre-publication review did not.
- A teacher whose course was rejected had no way to contest it. A gate with no
  appeal is not a scholarly gate, it is a refusal — and it puts a lot of
  consequence in one reviewer's judgement.

**What was added.** Four writers: `report_content`, `resolve_content_report`,
`appeal_review_decision`, `decide_appeal`. Four API routes, a report form on the
lesson page and on each discussion post, a rejected-versions panel on the
teaching page, and two admin queues at `/admin/reports` and `/admin/appeals`.

**Two rules are load-bearing, and both live in SQL.** Reporting requires that
you can *see* what you report — without it, filing a report is a way to probe
unpublished course versions by reading back which ids exist. And the reviewer
whose decision is appealed cannot decide that appeal, which is the same
independence rule as an author approving their own course or a requester
approving their own refund. Closing a report and overturning an appeal each
require a written note; a queue of silent dismissals teaches readers the button
does nothing.

**A correction I owed.** I had said `governance_appeals` was the appeal path for
a removed discussion post. It is not — `related_decision_id` is a foreign key to
`content_review_decisions`, so it appeals a *reviewer's* rejection of a course
version. A moderated post is reported through `content_reports` instead, which
is what the `discussion_post_id` column now provides.

**Two bugs the tests caught, one of them mine.** A unique index on
`(course_version_id, lesson_id, discussion_post_id, report_category,
reported_by)` did nothing, because Postgres treats NULLs as *distinct* in a
unique index — and the common case is exactly the one with NULLs in it, so a
reader could file the same report of a lesson an unlimited number of times.
Coalescing to a sentinel made NULLs compare equal.

The other was a **vacuous test**, and the second one I have written. The
self-appeal test let a reviewer attempt the decision, then branched on whether
that reviewer was privileged. A reviewer is *not* privileged, so the test always
took the branch asserting a different refusal — and passed with the ban deleted.
The teeth check showed it: removing the ban produced zero failures. Rebuilt to
construct a decider who is both privileged and the author of the ruling, with an
explicit assertion of that premise so it cannot silently degrade again. The
general rule: **a test that branches on a precondition can quietly take the
branch that proves nothing.**

**389 database tests, 121 unit tests, tsc clean, build clean, 49 routes.**
Trigger count corrected from 152 to 111 — the earlier figure counted 803
internal constraint triggers alongside the real ones.

### Also done since: a teacher's earnings now exist at all

`instructor_earnings_entries`, `instructor_payout_items` and `instructor_payouts`
all shipped with RLS and policies, and **nothing wrote to any of them**. A
teacher could sell a course, the platform could take the money, and there was no
record anywhere that the teacher had earned anything — let alone a way to pay
them. That is the eleventh instance of the same defect.

**What was added.** `accrue_instructor_earnings()` is called from
`record_payment_success()`, so the ledger, the order status, the entitlement and
the teacher's share all move together or not at all.
`reverse_earnings_for_refund()` is called from `record_refund_in_ledger()` when
an order reaches `refunded`. Attribution is per line item, so an order spanning
two teachers credits both separately rather than dumping the whole sale on one
of them.

**The revenue-share percentage was not invented.** The project record lists it
as `revenue share: 0`, and my own planning notes name it a precondition for
payouts alongside the provider, tax treatment and thresholds. So it is an admin
setting seeded at 0, and accrual still runs at 0% so the gross record of what
sold survives. **It needed a decision before any teacher was paid — and on
2026-10-19 the owner made it: 50%.** The register now ships 50 rather than 0,
because the register is the seed and every fresh environment would otherwise
start from a placeholder that contradicts a decision. Accrual snapshots the share
per entry, so the change cannot rewrite money already booked, and `teaching.payouts`
stays CODE-gated: the percentage is settled, the terms around it are not.

**Payouts are still unwired, deliberately.** Accruing is safe and reversible;
moving money out is not, and it needs four external facts that are not known.

**A security hole I introduced, and one I inherited.** Both new functions are
`SECURITY DEFINER` owned by postgres and their bodies trust their arguments. I
first granted them to `authenticated`, which meant any signed-in learner could
credit themselves earnings or wipe a teacher's. Checking that made me look at
last unit's `revoke_entitlements_for_refund` — same shape, same grant, so any
signed-in user could strip any learner's course access and write themselves in
as the revoking actor. Both grants are now withdrawn; neither caller needed
them, since both run inside `SECURITY DEFINER` functions owned by postgres.

**Three bugs the tests caught.** A unique index was needed because nothing
stopped a replayed webhook crediting a teacher twice. The reversal hook landed
*after* its `end if`, so it ran on every refund and took earnings back on a
partial one too. And the teeth check found that the security revoke had **zero
tests covering it** — the fix was real but nothing would have noticed if the
grant came back, because every other test calls these functions at superuser
level where grants do not apply.

**407 database tests, 121 unit tests, tsc clean, build clean, 49 routes.**

### Also done since: nobody could be given a role

`user_role_assignments` had **zero rows and no writer**. The trigger guarding
privileged grants is genuinely careful — it refuses a self-grant, refuses a null
assigner, and requires the assigner to hold a privileged role right now — and
there was no way through the product to give anyone a role at all. The test
harness grants roles with a direct INSERT, which is exactly the fixture state
that hides a missing path, so all 407 tests passed while the platform could not
be staffed.

That made it the twelfth instance and the most foundational one: the
authorisation model is capability-based, every check in the schema reads these
roles, and nothing could be appointed. **A teacher could sign up and could never
teach.**

**What was added.** `assign_role()` and `revoke_role()`, an `/admin/roles` page
grouped by role, and `/api/admin/roles`.

**The actor is never an argument.** Both writers read `current_user_id()`. I
first wrote them taking `p_actor_id` and granted them to `authenticated` — which
would have let any signed-in learner pass an admin's id and satisfy the
privilege check. That is the identical hole I had closed one unit earlier in the
earnings and entitlement writers, and I was about to reopen it.

**The lockout guard.** Removing the last privileged account is a one-way door:
afterwards nobody can appoint anybody, and the platform cannot be administered
without direct database access. It is refused here rather than discovered later.

**A claim I had to retract.** I wrote in the migration header that the assignment
trigger "misfired on revocation". It does not. The UPDATE trigger is declared
`BEFORE UPDATE OF revoked_at ... WHEN (old.revoked_at IS NOT NULL AND
new.revoked_at IS NULL)`, so it fires only on **reinstatement**. I verified by
removing my guard and observing identical behaviour. The guard stays as defence
in depth, but the header now says what is true, and the teeth check honestly
records that no test can distinguish it.

**424 database tests, 135 unit tests, tsc clean, build clean, 51 routes.**

### Also done since: courses could never be found by subject

`subject_areas` is seeded with 37 subjects and subdivisions. The catalogue has a
working subject filter and renders subject badges on every card. Both read
`course_version_subjects`.

That table had **zero rows and no writer**. So the filter narrowed against an
empty set: choosing any subject returned no courses, forever, and every badge
was empty. A learner browsing for Quran got a blank page however many courses
were published. Thirteenth instance — and the first one a learner would actually
have seen.

**What was added.** `set_version_subjects()`, a `set_subjects` action on
`/api/teach`, and a subject picker on the teaching page.

**Tagging is draft-only, and that was not my choice.** I had written in the
migration header that subject tags were "deliberately not frozen at publication",
reasoning that tags are only discovery metadata. The tests disagreed:
`lock_subject_mapping_of_locked_version()` already froze this table at
publication, exactly as it does sections and lessons. The header is corrected,
and the consequence is stated rather than hidden — **a mis-tagged published
course cannot be corrected without cutting a new version.**

**Two claims I had to retract.**

I wrote that the write policies let any signed-in user tag anyone else's
published course, because they used `can_read_version()` — which is true for
every published version, to anyone. Testing it showed the insert was still
refused, by the D5 lock rather than by RLS. A draft is refused by RLS, since
`can_read_version()` is false for a stranger there. So both states were already
covered, by two different mechanisms. The predicate is still corrected, because
the right gate for a write is a write predicate — but it is defence in depth,
not a patched hole.

I also added a unique index claiming nothing prevented duplicate subjects. There
already was one: `course_version_subjects_key`, on exactly the same two columns.
Removing my index changed nothing, which is how I found it. It was invisible to
my earlier probe because it is a unique **index**, not a unique **constraint**,
and the probe filtered `pg_constraint` on `contype in ('c','u','f')`.

**436 database tests, 145 unit tests, tsc clean, build clean, 51 routes.**

### Also done since: signing up produced an account that could do nothing

This is the most serious thing found so far, and it gates everything else.

`user_profiles.user_id` is the primary key, foreign-keyed to `auth.users`, and
essentially every other table points at it: `courses.created_by`,
`billing_accounts.created_by`, `user_role_assignments.user_id`,
`learner_profiles.linked_user_id`, `reviewer_profiles.user_id`.

**Nothing created the row.** The sign-up page calls `supabase.auth.signUp()` and
stops. There was no trigger on `auth.users` and no application insert. Verified
directly: a bare `auth.users` row leaves zero profiles, and then creating a
course, opening a billing account, and being given a role each fail on their
foreign key.

So a person who signed up could sign in and then do nothing at all. Every writer
built before this — refunds, earnings, roles, subjects, reports — was unreachable
to anyone who arrived through the front door.

**Why it survived 436 green tests.** Every suite calls `newProfile()`
explicitly. That is the same trap as the fixture-state problem, one level up: the
tests constructed the account the way the product never did.

**The fix is a trigger, not a client-side insert.** The same signup will happen
from the Expo app and from anything else that talks to Supabase Auth. Doing it in
the client means every client has to remember, and the failure mode is an
account that can sign in and do nothing. Doing it in the database means it
cannot be forgotten.

**A gap left open, deliberately.** Sign-up collects only an email or a phone
number, and `display_name` is `NOT NULL` and non-blank, so the trigger derives a
name. There is no settings screen, which means that derived name is currently
the only name a user has. That needs a profile screen; inventing a nicer name in
the trigger would be guessing at a person's name.

**449 database tests, 145 unit tests, tsc clean, build clean, 51 routes.**

### Also done since: every lesson was an empty page

Second most serious thing found, and the first that made the product
**pointless** rather than merely incomplete.

A teacher could create a course, a section, and a lesson. There was no way to
attach anything to it. `lesson_resources` is what the lesson page reads to show
a video, a reading, a worksheet — and nothing in the application ever wrote to
it. The learner side had been reading an always-empty table since it was built.

So a course could be authored end to end, reviewed, published, bought, and
studied, and contain nothing.

**What was added.** `add_lesson_resource()` — author or privileged, draft only
(`lesson_resources_lock` already freezes the table at publication, exactly as it
does sections and lessons), position assigned as `max + 1` because
`(lesson_id, position)` is unique and guessing a free slot would collide. The
curriculum editor now shows what each lesson contains, and marks a lesson with
nothing in it.

**URLs only, deliberately.** The other permitted source is `media_asset_id`, and
`media_assets` has no writer either. Under D8 the masters belong in our own
storage with Cloudflare Stream for delivery; inventing an upload path here would
have committed to a storage layout before that decision was made. **`media_assets`
is the next writer to build, and it gates every video on the platform.**

**A third instance of the same policy mistake.** The write policies used
`can_read_version()` — a read predicate standing in for a write gate, as with
`course_version_subjects`. Corrected to `can_author_version()`. Whether the old
one was exploitable was **tested rather than asserted** this time, because that
claim was made last time and was wrong: the test records which mechanism refuses
the insert, and the conclusion is defence in depth, not a patched hole.

**463 database tests, 155 unit tests, tsc clean, build clean, 51 routes.**

### Also done since: an uploader could mark their own file as available

`media_assets` is where the videos live. It had no writer, so the `media_asset_id`
source on `lesson_resources` was unusable and every video had to be hotlinked —
the opposite of D8.

While probing it, a hole: the INSERT policy was correct
(`uploaded_by = current_user_id()`), but the UPDATE policy was
`uploaded_by = current_user_id() OR is_privileged()` with **no column
restriction**. Verified by running it, not by reading it:

```
@@INSERTED@@      status=pending
@@SELF_CONFIRM@@  rows=1  status=available
```

No bytes were ever uploaded. The whole pending/available/quarantined machine —
which exists to distinguish "we have the file" from "we do not" — could be
bypassed by the person with the most reason to bypass it.

**What was built.** `register_media_upload()` creates the pending row and
**derives** the object key from the new row's own id; a caller-chosen key would
let one teacher register an asset pointing at another's object.
`confirm_media_upload()` and `quarantine_media_upload()` are staff-only, and
quarantining needs a written reason. `delete_media_asset()` is a soft delete per
D7 — the master survives, because retention is a scheduled decision.

A trigger now stops a non-privileged uploader from changing `status` at all.
Writing it exposed a second thing worth keeping: **`SECURITY DEFINER` bypasses
RLS but not triggers**, so the guard blocked the confirmation function too until
it learned to recognise the platform's own transitions.

**Two things deliberately not wired:** the byte transfer (needs storage
credentials and the D8 backend choice — inventing it would commit to a layout
before that decision) and the confirmation trigger (belongs to a storage webhook
or worker). So an upload stops at `pending`, and the application refuses to
attach anything that is not `available` — **the schema does not enforce that**,
which is recorded in a test rather than assumed closed.

**A test of mine caught a real gap:** a fractional duration would have been
silently rounded by PostgreSQL, since the column is `integer`. The validation
now refuses it.

**486 database tests, 164 unit tests, tsc clean, build clean, 51 routes.**

### Also done since: nothing could be bought at all

Every table on the revenue path had **zero rows and no writer** — not in SQL, not
in the application:

```
no product -> no price -> nothing to buy -> no order -> no revenue
```

`checkout.ts` resolves a price to a product and its course versions.
`enrolment.ts` resolves `product_course_versions` to the course being bought.
`accrue_instructor_earnings()` walks `order_items.product_id ->
product_course_versions -> courses.created_by` to decide who earned what. All
three were reading tables nothing could ever fill — which means the earnings unit
built earlier was unreachable.

**How it survived 511 green tests.** `earnings.test.mjs` inserts into `products`,
`prices` and `product_course_versions` **directly, at superuser level, bypassing
RLS entirely**. The tests built the purchase path the way the product never
could. That is the fixture trap again, and it is the reason a coverage probe has
to look for *application* writers rather than any INSERT in the codebase.

**The split was already decided, and is not reversed here.** The row-level
policies said it: `products_insert` is `created_by = current_user_id()`,
`pcv_write` is the product owner, `prices_write` is `is_privileged()`. So a
teacher creates the product and attaches their own **published** version;
**pricing and going on sale are staff actions.**

Rules worth keeping: a **draft cannot be sold** (it has never been reviewed);
`activate_product()` refuses a product with no course or no price, so nothing can
be listed that has no content or no price; re-pricing **supersedes** the old row
rather than mutating it, because what someone already bought at must stay
readable; retirement soft-deletes and closes the price, so existing orders still
resolve.

The end-to-end test is the real proof: a teacher publishes a course, staff price
it, a learner buys it, the enrolment is created, and the teacher's share accrues.

**Three of my own tests were wrong before they were right** — invented column
names (`orders.buyer_id`, `course_enrolments.learner_id`) and a call to
`accrue_instructor_earnings` as an authenticated user, when the grant to
`authenticated` was deliberately withdrawn. Each was fixed against the real
schema rather than by guessing again.

**511 database tests, 179 unit tests, tsc clean, build clean, 51 routes.**

### Also done since: no child could exist on this platform

This one corrects a claim I made earlier. I said child enrolment was wired. The
enrolment path was — the family it depends on could not be created.

`families` and `family_memberships` had zero rows and no writer, and the policy
made the first row impossible to write:

```
fm_write_owner  using (is_family_owner(family_id, current_user_id()))
```

`is_family_owner()` looks for an active `owner` row, so inserting the first owner
membership required already being an active owner. A bootstrap deadlock.
Measured, not inferred:

```
plain INSERT into families ............. allowed
INSERT ... RETURNING id ................ refused by RLS
INSERT the owner membership ............ refused by RLS
creator selects their own family ....... 0 rows
```

The `RETURNING` case is the subtle one: `RETURNING` must satisfy the **SELECT**
policy, and `families_read` requires an active membership the creator does not
have. So a parent could create a family they could not see.

**Why it matters beyond a missing table.** D2 says a child is a `learner_profile`
under a family, never a user, and the schema enforces it: `lp_no_child_login_yet`
(a child may not have a login) plus `lp_needs_family_or_login` (a profile needs a
family or a login) together mean **a child profile requires a family**. With no
way to create one, no child could exist and none could be enrolled.
`guardian_relationships` needs `is_learner_family_member`, so the parental-consent
workflow was blocked at the same point.

**The fix.** `create_family()` writes the family and its owner membership in one
transaction, so no family ever exists without an owner. Removing the owner
membership creation fails 22 tests.

Invitations are `invited` until the person accepts, and only they can accept —
being added to a household without agreeing would attach an account that never
chose it. Removing a member soft-revokes per D7 with a written reason, and **the
last active owner cannot be removed**, the same lockout guard the privileged roles
use.

One of my own tests was wrong first: it used `'guardian'` as an enrolment source,
when the CHECK allows `family_entitlement`. Fixed against the constraint rather
than by guessing again.

**535 database tests, 195 unit tests, tsc clean, build clean, 51 routes.**

### Also done since: no teacher could create a quiz

`assessments` and `assessment_questions` both had zero rows and no writer. That
cascades further than a missing feature:

* completion rules of type `assessment_submitted` and `assessment_passed` carry
  a `target_assessment_id`, and there was no assessment to point at, so those
  rules could never be satisfied
* `submit_attempt()` was unreachable, so no learner could ever sit a quiz
* certificates gated on completion could not be earned by any rule needing one

**A trap closed, not just a writer added.** The learner reader filters
`status='active'`, and D5 freezes assessments at publication. So a teacher who
wrote an assessment, forgot to activate it, and published would leave it
**invisible forever** — with no way to fix it short of cutting a new course
version. Publication now refuses that, and **names the assessment blocking it**,
because "something is not ready" sends the teacher hunting.

Also: activation requires at least one question (an empty assessment produces a
zero-mark attempt nobody could pass), and an automatically graded question
requires an answer key (otherwise it can never be marked and the attempt never
resolves).

**My new guard broke 7 existing tests, and the guard was right.** `group2b`
created assessments without a `status`, so they defaulted to `draft` — a state
learners never see. Those fixtures were building a state the product could not
reach, and were corrected to `active` rather than the guard being weakened.

**Four of my own tests were wrong before they were right.** Two helpers used
`opts.x ?? default`, which turns an explicit `null` into the default — so the
tests meant to check a refusal silently sent the valid value and passed by
proving nothing. I also invented `assessment_responses.attempt_id` (it is
`assessment_attempt_id`) and pre-set a score in the response, which bypassed
`grade_response()` — the only code allowed to read `answer_key`. The test now
runs the real flow: submit, grade, finalise.

**563 database tests, 220 unit tests, tsc clean, build clean, 51 routes.**

### Also done: the revenue-share setting can finally be changed

The number is still a business decision, so I have not changed the seeded 0.
But previously it could not be changed at all: there was no writer and no
control in the dashboard. `set_revenue_share_percent()` now permits only a
finance or platform admin, only an integer from 0 to 100, and only with a
written reason. It records old value, new value, actor and reason in the
append-only governance audit log. The admin dashboard has the matching form.

**0% remains the current value.** Until a rate is chosen, teachers accrue no
share and the platform retains the sale proceeds. This is visible in the admin
UI rather than buried in the earnings function. The four payout preconditions
remain unanswered, so money cannot leave the platform yet.

**574 database tests, 227 unit tests, tsc clean, build clean, 52 routes.**

### Also done: subscription offers can be configured

`plans`, `plan_versions`, `plan_entitlements` and plan-owned `prices` all had
zero rows and no writer. Staff can now create the plan, append versioned
allowances, add catalogue/product/feature entitlements, set a recurring price,
and activate only when both entitlement and price exist. Repricing closes the
old row; it does not rewrite what a subscriber would have bought. A new
`/admin/plans` screen exposes this flow.

### Also done: subscriptions now have a real payment-gated lifecycle

`create_plan_order()` accepts ids, resolves the amount from the active plan price,
checks the payer and the selected learner, and creates a pending order plus a
pending subscription. It grants **nothing** yet. The verified payment-confirmation
path activates the subscription, starts the billing period, allocates the chosen
learner, and creates subject/feature/product grants that expire at period end.
Additional family members can be allocated within the versioned slot allowance.

`/plans` is the customer-facing chooser; `/subscriptions` shows allocations,
allows household additions, and cancels with a written reason. Cancellation leaves
grants alone through the paid period. The status history records the user when a
person acts; a provider callback has no synthetic human actor. A database guard
blocks direct inserts or edits to subscription state, and a cancelled pending
order cannot later be turned paid by a late callback.

The earlier creator-membership migration exposed another **RETURNING trap**:
creating a billing account with `INSERT ... RETURNING` can be refused by the
SELECT policy before the AFTER-triggered creator membership exists. Checkout now
uses plain INSERT, lets the trigger run, then selects the newly visible account.

**Scope boundary: live MTN/Airtel/card credentials (P12) are still absent, so
production provider callbacks and renewals are not verified here.** The database
was tested with the existing privileged manual-evidence path, not a live provider.

**598 database tests, 228 unit tests, tsc clean, build clean, 57 routes.**

### Also done: finance can record the clawback instead of merely flagging it

`financial_adjustments` had zero rows and no writer. `/admin/financial-adjustments`
now lets finance/platform admins record a signed, currency-checked, linked,
append-only correction with a written reason. It does not edit the original
transaction and does not claim to transfer funds.

For the existing `earnings.clawback_needed` path, `record_earnings_clawback()`
requires a fully refunded order, totals the instructor entries already marked
`paid`, links the adjustment to the settled refund transaction, and records the
exact negative amount. It cannot run for a partial refund, no paid earnings, or
an order without a settled refund; it is one per order. The original paid
earnings remain paid — the adjustment records the recovery claim rather than
falsifying the payout history.

**610 database tests, 228 unit tests, tsc clean, build clean, 59 routes.**

### Also done: provider statements can be reconciled without guessed formats

`payment_reconciliations` and `payment_reconciliation_items` had no writer.
`/admin/reconciliation` now starts a provider-period run and accepts signed
minor-unit statement rows. The database matches on provider reference, currency,
signed amount and period. A credit is positive, a debit negative. Unknown or
ambiguous references remain unmatched; amount, currency or date differences are
retained as discrepancies. Staff can resolve a line to the exact transaction,
then finalize (balanced only if every line matches) and close with a written
reason. No row is silently discarded and no reconciliation action changes the
financial transaction itself.

No provider-specific CSV format is guessed: the entry screen is generic until
P12 establishes which provider statement/API format is real.

### Also done: disputes have a controlled internal workflow

`payment_disputes` had no writer. Finance/platform admins can now open a case
against a ledger transaction, with currency matching and a positive amount no
greater than that transaction. `/admin/disputes` lets staff move it through
`open -> under_review -> evidence_submitted -> won/lost/withdrawn`. Every status
change requires a written note; resolved cases are terminal. The case is an
internal record only — provider evidence submission and money movement still
require provider integration and remain separate.

**633 database tests, 228 unit tests, tsc clean, build clean, 63 routes.**

### What comes after that

Payout execution still waits on the four payout preconditions, tax/country
treatment and provider disbursement credentials. Automatic subscription renewal
needs a worker and payment-provider support; an expired paid period must not be
extended by a browser redirect. Other unwired groups remain `promotion_*`,
`learning_paths*`, `reviewer_*`, `institutions`, `scholarly_panel*` (dormant per
P6), `currency_exchange_rates`, `access_checks`, and `content_sources`.

The paid path. It needs a provider, and a provider needs merchant
registration and signed API terms (P12). Until then `payment_required` is the
honest answer and the UI says so.

The dashboard also made a gap visible, and the first two are now closed:
`learning.progress` gates the progress bar and mark-complete, and
`learning.assessments` gates the quiz, its route, and its API. The remaining
84 flags are recorded and toggleable but nothing reads them yet, because the
features they gate are not built. Each one needs its `isFlagEnabled()` call
added where the feature lives.

The gate is checked in the API as well as the UI, because a UI hiding a button
is not a control. One deliberate exception: an attempt already in progress may
still be submitted, so turning assessments off mid-quiz does not strand a
learner who was already answering. And **certificates** are staff-issued only
(`issue_certificate` requires a privileged actor or a support agent), so a
learner completing a course does not get one automatically — that is a
deliberate gate, and it will need a review step in the admin dashboard.

### Not now

Admin dashboard · payments UI · mobile · the investor proposal.

### Decisions still open that this milestone will surface

- **P11 — interfaces, not guesses.** The first screen needs the AyahSpring
  visual identity, which does not exist yet. Either design it now or build
  unstyled and accept rework.
- **P12 — the seven external facts.** Payment providers, jurisdiction,
  trademark clearance. Group 5 has the schema; the providers are still
  unchosen.
- **P6 consequence.** The scholarly panel is dormant. Before switching it on,
  decide whether anything published under peer review gets retroactive panel
  review or is grandfathered.
