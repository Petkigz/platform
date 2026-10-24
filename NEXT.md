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
`platform.cost_controls`, and is no longer open: the number was chosen at 50 GB on
2026-10-22 and the rule is built (`media.upload_quota_gb_per_teacher`, enforced at
initiate while the flag is on).

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

The reviewer register now has one authority for the thing it could not answer
before: who may say a credential is real. The platform owner decides, alone,
unless they have convened a scholarly board — and only they may appoint a member
to it. A qualification also has to name its subject now, because one that does
not can never authorise anything.

Verification: **1501 database tests, 905 web tests; TypeScript typecheck and
production build pass; 117 tables, 241 policies, 146 user-defined triggers,
353 functions, 151 migrations and 151 app route entries.**

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
never started). Updated 2026-10-22: offline downloads, payouts, notifications,
live classes and the analytics screens are no longer half-built, and their rows
say what is left instead of what was missing.

| Piece | Built and tested | Not built | Waiting on |
|---|---|---|---|
| **Media ingest** (D8 = R2) | `media_assets` register with a pending/available/quarantined/deleted state machine and four writer functions; SigV4 signing in `web/src/lib/media-r2.ts`, pinned against AWS's published vector; `POST /api/media` `request_upload` + `confirm_upload`; multipart upload for a file too big for one presigned PUT (`lib/media-multipart.ts` on the server, `lib/multipart-upload.ts` in the browser, four more actions on the same route); `resume_upload`, which finds the caller's own `pending` row by checksum and size and reads back from the bucket the parts storage already holds, so a closed tab costs one part rather than the file; `abandon_media_upload()` and the `/admin/media` panel that reaches it, which is the only place an upload nobody finished can be seen; R2 variables documented in `web/.env.example` | Any R2 credential in this environment, so nothing has been exercised against a real bucket; the bucket's CORS rule, which multipart needs and single-PUT did not | **Nothing** that is a design question. R2 is chosen; when credentials are issued the masters bucket must allow `PUT` from the app's origin and expose `ETag` |
| **Media delivery** | The whole path, end to end: `media_renditions` register with a closed profile vocabulary and derived object keys; the transcode worker that fills it (`web/src/worker/transcode-worker.ts`, decisions in `lib/transcode.ts`, gated by `delivery.transcode`), which checks the master's SHA-256 against the bytes before it encodes anything; `/api/media/playback` and `/api/media/download` signing short-lived rendition URLs with the database as the only authority on who may watch; a player on the lesson page with a quality selector and a poster; `/teach/media`, where a teacher uploads straight to R2 with a browser-computed checksum; `verify` on `/admin/media`, which asks storage whether the file arrived at the declared size and only then confirms it; and `retry_media_rendition()`, reached from the same screen, which puts a copy that failed to encode back in the queue on a written reason | A host to run the worker on with ffmpeg, R2 credentials and a staff account for it, and a decision about whether a free preview may be watched signed-out | **Nothing** that is a design question. What is left is infrastructure and one product decision |
| **Offline download** | Built end to end: `/downloads` reads the device's own storage so it works with no network; `learning.offline_max_devices` (3) and `learning.offline_expiry_days` (30) are settings; only a Plus plan grants `offline_downloads`, and `lesson_download_standing()` explains refusal by reasoning order (signed out → feature off → not entitled → needs Plus → no media → allowed); 11 tests | Nothing structural. The media is a signed rendition URL cached by the app; "never in the file manager" holds only inside the mobile shell, which does not exist yet | **Decisions:** nothing left. The browser build can save a file the OS can see — that limit is the mobile app's job, not this one's |
| **Upload cost control** | A per-file ceiling of 8 GiB that the browser can now actually reach: `lib/digest.ts` hashes a slice at a time so the checksum does not cap the size, and above 32 MiB `lib/multipart-upload.ts` sends 16 MiB parts so the transport does not either — a failed part is retried rather than the file restarted | A cumulative per-teacher byte quota and a spend alert. Resuming needs the same file to be chosen again, because the checksum is what recognises it, so a half-sent file cannot be finished from the library without it; and an unfinished upload whose key was not derived from an asset can be listed but not ended, since the audit trail would have nothing to point at | **Decision:** quota policy (`platform.cost_controls`). Note that `register_media_upload()` is open to **any signed-in user**, not only teachers, because learners attach files to assignment submissions through the same table — so the missing control is a cumulative quota per person, not a role check | **The cumulative quota is now built**: `media.upload_quota_gb_per_teacher` is 50 GB of master bytes, `media_upload_allowance()` answers whether one more upload fits, and `/api/media` refuses with the space left — behind `platform.cost_controls`, which still ships off.
| **Assignments** | Tasks, self-paced and cohort deadlines, one private submission per learner, drafts and hand-in, marking with immutable feedback, a revision loop with an append-only snapshot, file *references* with type and size ceilings | Byte transfer for submissions (the R2 path exists but is not wired to submissions), scanning, secure delivery to the marker, retention of children's files | **Decision/review:** the safeguarding review of files children send. This one review holds `learning.assignments` **and** `learning.cohorts` |
| **Cohorts** | Tables, exact-version pinning, opt-in join/leave, capacity serialisation, family opt-in for children, counts on the manager and, since row 32, names and progress on the class page for the teacher who opened it, teacher manager, learner join/leave, the teacher-set `join_closes_at` window, how full each class is on the course page a joiner reads it from (`cohort_places()`, counts only — the roster stays behind `can_read_cohort_member()`), and the teacher's control over the published number (`set_cohort_capacity()`, never below the learners already in the class) | Nothing structural | The same safeguarding review. `learning.cohorts` ships `false` |
| **Learner analytics** (`SCREENS.md` row 32) | `can_read_learner_course_progress()`, `cohort_learner_progress()`, the class page with a roster ordered by need, `teacher_course_analytics()` with enrolments/completions/certificates, and `/teach/[courseId]/reports` | Export or CSV, anything that follows a learner across courses | **Decision:** how long progress stays readable after a class ends. Until then it stays readable, which is the safer default |
| **Reviewer access to lesson media** | `may_review_version_media()` — an accepted or in-progress assignment and nothing else — as a third branch of `may_play_rendition()`, with the player wired into `/review/[assignmentId]`; `may_watch_master()`, `master_preview_target()` and `/api/media/master` for the uploader, staff and the version author, with `Watch` on `/teach/media` and `/admin/media`; 19 database tests, most of them refusals | Any copy for a reviewer: no download, no master, no export. Aggregate review analytics | **Nothing.** Decided 2026-10-20: "other teachers" means a reviewer checking quality for a named period, not co-teachers and not any teacher on the platform. The period is the assignment's state, so access ends with the review |
| **Live classes with teacher-only recording** | Sessions, join windows, attendance, the roster, `/live` and the teacher's scheduling form; the room URL is `delivery.live_room_base + '/room/' + slug`. Teacher-only capture is the rule | The media server: anything that actually carries audio and video | **Decision made** (build in-house); the remaining work is infrastructure, not design |
| **Payments** | MTN MoMo and Airtel adapters, checkout, orders, refunds, reconciliation, disputes, financial adjustments, subscriptions with entitlement grants that drive access, 50% teacher-share accrual with the split snapshotted per row, and the **72-hour refund window** (2026-10-23): a customer asks within three days of the payment, staff can still open one afterwards, and a partial goodwill refund has no screen yet | Live credentials, callback verification against a real provider, automatic renewal, failed-payment retry, a merchant account | **External:** provider sandbox and merchant credentials (P12). Do not claim any of this works end to end |
| **Payouts** (`teaching.payouts`) | The whole request path: `my_earnings()` and `/teach/earnings`, `request_instructor_payout()` with a tax acknowledgement, the refund-hold setting, one open request per currency (unique index), `my_payouts()`, the finance queue at `/admin/payouts` that shows the amount asked for beside what the ledger owes today, cancellation, failure with a reason the teacher reads, and `complete_instructor_payout()` as the only function that marks an earning paid; `platform_teacher_liability()` reports the balance owed per currency | The provider call itself, and per-teacher destination details | **External:** a payout provider, and a tax treatment per country. `teaching.payouts` is CODE-gated and a trigger refuses to enable it at runtime |
| **Guardian verification** | Tables and flow complete, shipping off. **Not to be deleted** — COPPA makes verifiable parental consent mandatory for US under-13s | Enabling it | **External:** legal review, and it must be on before any US child enrols |
| **Notifications** | The in-app centre: `/notifications`, a `notifications` table with RLS on the reader, `notify_user()` writing payout sent/failed/cancelled, and two derived reminders computed at read time (a class within a day, a plan renewing within three) each gated on its own flag; 7 tests. The outbox has a state machine *(2026-10-24)*: a five-minute claim lease, a 5/15/60/240/720-minute backoff, a dead letter at `delivery.max_attempts`, a do-not-send list a bounce writes to, and a retry that needs a written reason | Email and SMS delivery — nothing sends, and the adapter is the missing piece | **External:** a delivery provider and its credentials (`delivery.notifications`) |
| **Product analytics** (`delivery.analytics`) | 7 event codes, monthly partitions, a table with RLS and no read policy, `record_analytics_event()` returning `{recorded, reason}`; teacher course reports and platform reporting read aggregates, never a person | Event instrumentation beyond the coded set | **Decision:** a retention policy is *not* run — analytics are kept forever by the owner's decision of 2026-10-22 |
| **Visual identity** | White and green theme settled; tokens in `web/src/app/globals.css`; every screen uses the same card/badge/notice vocabulary | Type, logo, illustration; 0 of the 50 inventoried screens designed | **Decision:** the owner's. Not a blocker for any backend work |

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
| Reviewer machinery — the versions | `content_review_requirements`, `technical_review_checks`, `content_change_assessments` | **Now written** by `20261221000100_review_requirements.sql`, on `/teach/[courseId]`, `/admin/reviews` and `/review/[assignmentId]`. `validate_review_assignment()`'s authorisation loop now has something to loop over, so a version can require a reviewer authorised for a subject — and a requirement can be closed, which nothing could do before |
| Payouts | `instructor_payouts`, `instructor_payout_items` | `teaching.payouts`, off; ROADMAP already says "3 tables with no fields and no endpoints" |
| Institutions | `institutions` | `commerce.institutions` and four `institution.*` flags, all off |
| Money plumbing | `currency_exchange_rates`, `order_adjustments`, `payment_method_references` | **`currency_exchange_rates` is now written and read** by `20261223000100_currency_reporting.sql`, on `/admin/exchange-rates` and `/admin/money-report`, and it is what stamps `financial_transactions.fx_rate`/`fx_source`/`fx_observed_at` — columns a constraint required and nothing ever set. Multi-currency reporting is therefore built; the open part is what nets against what in the report. `orders` and `order_items` are now **writer-only**: `20261224000100_course_order_writer.sql` dropped `orders_insert` and `order_items_insert`, so a course order exists only if `create_course_order()` made it (see today's section — the policies had let a payer write the total and the product themselves). The writer also refuses a purchase that would grant nothing new (`20261228000100`, `checkout:already_owned`), which is the last thing on the purchase path that could take money for access the account already has. `order_adjustments` is now **written by `add_order_adjustment()`/`void_order_adjustment()` and read on `/orders`** — its client-side insert policy is dropped and an order's total is held against its items plus its live adjustments by a trigger before it can be paid (`20261225000100`). `/admin/orders` drives both writers and `admin_orders_overview()` reads the queue, so nothing about an order's total is reachable only by hand. A discount is now **shared at the revenue-share rate** by `20261227000100_discount_sharing.sql`, so the teacher's side of a credit is recorded (`instructor_earnings_entries.shared_discount_minor`) instead of being absorbed silently by the platform. Promotions remain refused by the writer until the staged build recorded in `DECISIONS.md` reaches its first stage. `payment_method_references` needs a provider that can store one |
| History and diagnostics | `order_status_history`, `publication_events`, `entitlement_events`, `course_enrolment_version_history`, `subscription_history` | **Now read** by `support_case_history()`, on `/support/<caseNumber>` for staff. Still closed to every other read path, which is the point: one function decides what support may see |
| Diagnostics with no writer | `access_checks` | **Correction to the audit:** nothing has ever inserted a row here — not a trigger, not a function, not a route. Its comment promises a denial log for support agents and the platform does not keep one. Excluded from the console on purpose; an always-empty list would read as "no denial happened" |
| Other | `adult_learning_shares` | **Now written and read**, by `20261222000100_adult_learning_shares.sql` on `/account/sharing`. The console still reads it too, and its empty section is now a true answer about a feature that exists: nobody has been given sight of this adult's progress. The gap the audit named — no writer, and no predicate that made a share mean anything — is closed at both ends |

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


### What a version needs before it can publish, 2026-10-21

Three tables described the version side of peer review and none of them had a writer:
`content_review_requirements`, `technical_review_checks` and
`content_change_assessments`. The first is the one with teeth.
`enforce_publication_gate()` refuses to publish while any requirement is open, and
`validate_review_assignment()` refuses to assign a reviewer who is not authorised for
every subject the version wrote down, at the scope being assigned. With nothing able to
write a row, both were inert: any verified reviewer fitted any course, however little
they knew of the subject, and "this course teaches Tajweed, so a reviewer authorised in
Tajweed must approve it" could not be said at all.

The other direction was inert too, and it was the worse half. Nothing ever set
`satisfied`. The first requirement anybody wrote would have blocked that version
forever: the gate would say "1 review requirement still open" and no screen could answer
it, because closing one took SQL. A capability that can be turned on and never off is
not a half-built feature, it is a trap — which is why most of this migration is about
closing requirements honestly rather than opening them.

**One rule, in one place.** A requirement is satisfied when enough approvals exist, in
its scope, from reviewers authorised for its subject. `refresh_review_requirements()`
computes that, counting distinct assignments so one reviewer approving twice is one
approval, and it runs on three occasions: on every approved decision (a trigger), when a
requirement is written or changed, and when somebody asks. The count exists nowhere as a
column, so the alternative was computing it twice — once in SQL and once in TypeScript —
which is how a rule ends up enforced in one of the two. The panel therefore reads the
recount for status and approvals and the table for everything else, and says which it is
showing.

**The recount only ever closes a requirement. It never reopens one.** Reopening is an act
by a person: raising `required_approval_count` puts the row back to `open`, audited, with
the recount deciding where it lands. The automatic alternative is worse in both
directions. A reviewer whose authorisation expires next year would silently retract a
review they validly gave, and a version would stop being publishable for a reason nobody
chose and nothing on a screen explained. So an approval counts towards closing a
requirement while the authorisation is live, and stays counted afterwards; a revoked
authorisation stops new approvals counting, which is a decision about the future rather
than a correction of the past.

**Who may write what, and the trap that was avoided.** Requirements and change
classifications: the version's author, or governance staff. Technical checks: the author,
a reviewer assigned to that version whose assignment is accepted, in progress or
completed, or governance staff. Waivers: governance staff only, reason required. The
author test reads `course_versions.created_by` against the session and does **not** call
`can_author_version()` — that helper short-circuits on `is_privileged()`, so it answers
"may act as the author", which every member of staff does, a support agent included. The
`crr_write` policy uses it and that is acceptable for a policy on a table whose real
rules live elsewhere; here the function is the rule, and a support agent who could write
what a course needs reviewed could also decide it needed nothing. A test pins the
refusal from that seat.

**What is deliberately not enforced.** A technical check does not touch the publication
gate: the table's own comment says it is never a substitute for scholarly approval, and a
failed check is what a reviewer reads before deciding, not a reason to refuse
publication. A test publishes a version with a failed check on it, so the absence of
authority is pinned rather than assumed. A change assessment does not create requirements
either — it classifies, and the classification is what the next reader sees first. The one
thing the schema does enforce is that a doctrinal or source change cannot be called low
risk and cannot skip re-review, and the form does not offer that combination, because a
dropdown that can produce a value the database throws away is a bug that only appears
when someone uses it.

**Where it renders.** The author's course page (`/teach/[courseId]`), in a section called
"Before this can publish": what is required, with how many approvals it has of how many
it needs, and how many reviewers could close it; a form to require a subject at a scope;
their technical self-checks; and the classification of what changed. `/admin/reviews`
shows the same panel folded under each submitted version, with a badge for how many
requirements are open, plus the one act only governance may perform — waiving, in
writing, with the reason stored beside their name. `/review/[assignmentId]` shows both
panels to the reviewer, who may add a technical check of their own and may not change
what the version requires while they are judging it.

**The line on the panel worth more than the form.** For each open requirement it counts
how many reviewers could close it, and when that number is zero it says so: "no reviewer
is authorised for this". Without it, an open requirement is a door that will not open
with nothing to explain why — and both remedies (grant the subject on `/admin/reviewers`,
or waive it in writing) were invisible.

**One existing test had to change, and the change is the point.** `group3` asserted that a
requirement row was still `open` after an authorised reviewer approved it, which was true
only because nothing could close one. It now asserts the opposite for the subject that
reviewer holds, and keeps the blocking case with a requirement for a subject nobody is
authorised for, written after the assignment — which is also what happens when a reviewer
finds a subject a version teaches that nobody asked about.

31 database tests, 13 web. One migration, five functions and a trigger, no new table, no
new flag, one new route entry.


### An adult can share their learning, and take it back, 2026-10-21

`adult_learning_shares` was designed in the first week with the whole rule already in it:
"Adult learning is private by default, including inside a family. A share must be
explicit, scoped and revocable." Three scopes, an expiry that has to be in the future, a
revocation timestamp the status is tied to by a CHECK, one active share per person per
scope, and a trigger refusing to route a child's learning through this table or an
adult's to their own account. Nothing ever inserted a row.

The support console built two units ago reads the table and reports it, and says so
honestly — empty means nobody has been given sight of this adult's progress, which was a
true statement about a feature that did not exist. What the audit recorded as "the adult
privacy story is the gap" was really two gaps, and the second was the worse one: **no
predicate read the table either**, so a row written by hand would not have granted
anybody anything. A share that grants nothing is not a half-built feature; it is a
privacy control that tells somebody they have given access they have not.

**Six functions.** `share_adult_learning` (the learner themself, one active share per
person per scope, and changing the terms means revoking first so the record of what was
granted is never edited), `revoke_adult_learning_share` (the person who granted it, or
governance staff), `may_read_shared_learning` (the predicate that makes a grant mean
something), `shared_learning_overview` (what the reader may see, with the terms they are
seeing it under), `my_learning_shares` (the owner's list), and `resolve_share_grantee`
(the email address a person types into the account a share is granted to). All audited
under `family.share_*`, all revoked from `public` and `anon`.

**Expiry is corrected when somebody looks.** `expires_at` is the fact and
`status = 'expired'` is a bookkeeping copy of it, and nothing in the schema flips one to
the other. With no scheduler here, a share that ran out would keep reading `active` in
the table while conferring nothing — the worst kind of disagreement, because the row a
person reads says access and the rule that decides access says otherwise. Both readers
therefore correct what they see, audited, before returning anything: a small write
inside a read, chosen over a table that lies until somebody runs a script. The
correction never touches a revocation, because who ended a share is part of the record.

**The predicate refuses what the column would allow.** `may_read_shared_learning()`
requires `status = 'active'` *and* an expiry that has not passed, and answers false for
a kind that is not `progress` or `achievements` rather than treating it as neither — so
a caller cannot typo its way into a share it does not hold. A scope of
`progress_and_achievements` covers both; a narrower one covers one, and the overview
reports which of the two the reader may see so a panel cannot imply more than was
granted.

**Granting is gated by `family.adult_shares`; reading and revoking are not.** The flag
ships off and every writer is refused by the database while it is off, so the panel says
so rather than offering a form that cannot work. But a share granted while the flag was
on has to stay revocable after it goes off — turning a feature off must not strand
somebody's privacy decision with no way to end it. The same rule the support history
follows.

**One disclosure, recorded rather than hidden.** The grant form asks for an email
address, because nobody knows their friend's uuid, and `resolve_share_grantee()` answers
whether an account exists. That is a disclosure. It is not new — `invite_family_member()`
has answered "no such user" since the family tables were built — and the alternative is
worse: a flow that shares with a named person either discloses that or silently does
nothing, and a person who believes they shared something and did not is the outcome this
product cannot accept. Nothing beyond existence is disclosed: no email comes back, no
learner, no progress, and a suspended or closed account is refused rather than resolved.
Removing the disclosure entirely means an invite flow with a token and an expiry, which
is a different feature; it is recorded as open below rather than half-built here.

**Where it renders.** `/account/sharing`, linked from `/account`: who can see my
learning, with what and until when, and an "end it" on each; a grant form that finds the
person and shows the name it found, with a line saying the platform cannot prove which
account is whose, which is why the length of the share is offered beside its scope — a
week is a cheaper mistake than forever. Below it, the other seat: whose learning has
been shared with me, each with the terms, the enrolments and lesson counts or the
certificates the scope covers, and a note that the person who granted it can end it at
any time. A cap is never silent: 25 rows are shown beside the total.

20 database tests, 12 web. One migration, six functions, no new table, no new flag, two
new route entries.


### Money is reported in one currency, and every rate says where it came from, 2026-10-21

The platform charges in whatever currency a family has — UGX in Kampala, NGN in
Lagos, GBP in Birmingham — and the owner reads one figure, in USD. That was
decided in the project record before any code existed, and three pieces of it had
been built in SQL and were unreachable:

- `currency_exchange_rates` existed with an index shaped for exactly one question
  — the newest rate for a pair at a moment — and **nothing could write to it**.
- `financial_transactions.fx_rate`, `fx_source` and `fx_observed_at` were
  *required* by `ft_settlement_needs_fx` whenever a settlement landed in another
  currency, and no function in the repository ever set one. D4's "FX recorded
  with source and timestamp" was a constraint with no writer behind it.
- `settlement_amount_minor` and `settlement_currency` had the same problem:
  reconciliation could match a provider's statement line to a transaction, but
  nothing could say what actually landed.

So every money screen summed mixed currencies, which is not a number. 5 000 UGX
plus 3 USD is meaningless twice over: they are different currencies, and they are
100x apart in minor units before conversion, because UGX has no minor unit at all.

**`20261223000100_currency_reporting.sql`, eight functions, no new table.**

- `record_exchange_rate(base, quote, rate, source, observed_at?, override_reason?)`
  — `finance_admin` or `platform_admin`, the pair that guards every other money
  writer, and deliberately not `is_privileged()`: a support agent may refund an
  order and must not be able to change the number every total is converted with.
  The source is required and is a sentence, not a dropdown, because there is no
  rate feed in this environment and no credential to call one with; a rate is a
  fact a person looked up and this is where they say where. It refuses a
  self-pair, a non-positive rate, one above a billion, a future observation, and
  — the guard that matters — a rate more than `finance.rate_sanity_factor` times
  the previous one for that pair without a written reason. A slipped decimal in a
  rate is a hundredfold error in the only number the owner reads, and it looks
  perfectly reasonable on screen. The reason is kept in the audit row beside the
  rate it overrides. Setting the factor to 0 turns the check off.
- `resolve_exchange_rate(base, quote, as_of?)` — the newest observation at or
  before a moment; or, when only the other direction was ever recorded, its
  inverse, flagged `derived` and sourced as derived, because an inverted rate was
  never published by anybody and a total resting on one should say so on the same
  line. **A pair nobody recorded returns NULL, not 1.** Guessing that an unknown
  currency is worth a dollar is the one mistake here that would be invisible in
  the total.
- `to_reporting_currency(amount_minor, currency, as_of?)` — the conversion, in
  integer minor units per D4, dividing by the source currency's divisor and
  multiplying by the reporting currency's. Both divisors matter and this is the
  easiest error in the file to make: applying a major-unit rate to minor units
  without them is 100x either way and still looks like a number. Rounding is half
  away from zero on the reporting unit. A misconfigured `finance.reporting_currency`
  raises rather than defaulting.
- `record_transaction_settlement(txn, amount, currency, rate_id?)` — what actually
  landed, stamping the rate row it used. Cross-currency settlement is **refused
  when no rate is recorded**, which is the point: FX provenance comes from the
  rate table, so there is one place a rate is ever written down and no way to
  type one in beside a settlement. A named rate row is used exactly, in either
  direction; a same-currency settlement cites no rate and refuses one offered.
  Re-recording is allowed, because a provider restates, and the earlier figure is
  kept in the audit row with `restated: true` rather than overwritten silently.
  A failed or reversed transaction cannot be settled.
- `report_money_in_reporting_currency(from, to)` — the number the owner reads.
  Gross, grouped by type, direction and currency, converting every group at the
  moment the window closes so two rows in one currency cannot use two rates and
  then be added. It reports the rate beside each figure, lists what it could not
  convert as its own rows with the missing pairs named, and flags any rate behind
  it that moved more than the sanity factor even when the writer was satisfied.
  **It produces no single net figure.** Credits and debits are totalled
  separately and the response says why: whether a chargeback offsets a capture,
  and whether a provider fee comes off here or in the payout, are decisions about
  the business rather than about arithmetic, and a report that made them would
  bury the answer in a sum nobody reads the terms of. Recorded as open below.
- Two controls in the register, `finance.reporting_currency` (`USD`) and
  `finance.rate_sanity_factor` (`10`), and `setting_text()` to read the first.

**A defect found while writing the accessor, and fixed.** `setting_int()`
documented itself as "falling back to p_default when unset or blank" and did not:
a SQL function whose query returns no rows returns NULL, so a *missing key*
ignored the default entirely. It never showed up because every key it is called
with is seeded — `teaching.revenue_share_percent`, `governance.min_approvals` —
so the fallback was only ever exercised for a blank value, never an absent one.
Recreated with the fallback it claimed, and pinned by a test that asks for a key
that does not exist rather than one that is empty. `setting_text()` is written
the same way.

**One fact, two copies, both pinned.** Minor-unit exponents live in
`public.currency_minor_divisor()` and, independently, in `web/src/lib/money.ts`,
because a browser has to display an amount and cannot call a function for it.
That is a duplication with no shared runtime rather than a second implementation
of a rule, and it is held from both sides: `currency_reporting.test.mjs` and
`currency.test.ts` assert the same three lists — 17 zero-decimal codes, the 7
three-decimal dinars, and a spread of two-decimal ones. Both lists also grew: the
web copy had 7 zero-decimal currencies and no three-decimal case at all, so a
charge in Kuwaiti dinars would have been 10x wrong on both sides. Change one list
and a test fails on that side.

**Where it renders.** `/admin/exchange-rates`: the shelf, newest first within each
pair with the one in force named, the record form with the override reason behind
a collapsed heading that explains what it is for, and a single-amount converter
that shows the rate and its provenance — which is how a total that looks wrong is
investigated, since the fix is a recorded rate and never an edited number.
`/admin/money-report`: the window (its end date inclusive, because the database
treats the end as exclusive and quietly dropping the last day's money is the
failure the form must not have), money in and money back separately, the
unconverted currencies named in a warning that says the total is smaller than the
truth until a rate exists, outliers beside the figures they produced, what
teachers are owed in the same currency, and the rates used with their sources.
Settlement is recorded where the finance admin already is: on
`/admin/reconciliation`, per resolved statement line, with the rate shelf offered
as a choice and the response reading back what was stamped rather than "saved".

50 database tests, 30 web. One migration, eight functions (seven new, one
recreated), no new table, no new flag, two new controls, four new route entries.


### An order is created by the platform, not by the browser, 2026-10-21

**The hole.** Two insert policies in `20261020000400_rls.sql` decided who could
write the money rows by asking one question:

    orders_insert:      with check (is_billing_member(billing_account_id))
    order_items_insert: with check (exists (select 1 from orders o
                               where o.id = order_items.order_id
                                 and is_billing_member(o.billing_account_id)))

`is_billing_member()` is the right question for reading an invoice and the wrong
one for writing one. A payer satisfies it. So a payer could skip
`web/src/lib/checkout.ts` and POST straight to PostgREST: an `orders` row with
any `total_minor` they liked, then an `order_items` row naming **any product in
the catalogue** with `unit_price_minor = 0`, `discount_minor = 0`,
`line_total_minor = 0` and no `price_id` — the column is nullable, so no price
had to exist at all. Both rows satisfy every CHECK on their table
(`orders_totals_agree`: 50000 = 50000 − 0 + 0; `oi_line_total_agrees`:
0 = 0 × 1 − 0), and `record_payment_success()` fulfils from exactly those rows:

    select distinct pcv.course_id
      from order_items oi
      join product_course_versions pcv on pcv.product_id = oi.product_id
     where oi.order_id = p_order_id

The entitlement is decided by `order_items.product_id`, which the payer wrote.
Paying the order's own real total therefore delivered whichever course had been
named. The second half is worse than the first: the extra zero-priced line could
be added to a **real pending order**, so an honest purchase of one course
delivered two, and nothing about the order total changed to hint at it.

The validation existed. It lived in TypeScript, in `createOrder()`: published
version, active in-window one-time price, product linked to that version, amount
read from `prices`, exactly one line. That was one of two paths to the table, and
a rule that lives in one of two paths is a suggestion to whoever uses that path.
`create_plan_order()` already did this correctly for subscriptions, which is why
the course path looked finished and was not.

**The fix.** `create_course_order(p_course_id uuid, p_price_id uuid) → jsonb`,
`SECURITY DEFINER`, executable by `authenticated` and nobody else. It re-derives
the offer on every call — active undeleted course, highest published version,
the named price active/one-time/inside its window, and the product behind it
linked to *that* version and itself active — resolves the payer from the session
claims, resolves their billing account from their own memberships, and writes the
order, its single line and an audit row. The caller supplies no amount, no
currency, no product, no billing account, no snapshot and no status, so there is
nothing left to forge. It returns
`{orderId, orderItemId, billingAccountId, productId, priceId, courseVersionId,
amountMinor, currencyCode, title}`, with `amountMinor` as a decimal integer
string, because money does not become a JSON number anywhere in this codebase.

Both insert policies are **dropped, not narrowed to staff**. A staff-only insert
would still let a privileged actor write a line that `record_payment_success()`
trusts with no price behind it, and would leave two ways to make an order that
can drift. Reads are untouched: `orders_read`, `order_items_read` and
`order_adjustments_read` still give a payer their own invoice and hide everybody
else's, and both are pinned by a test in the new suite. Dropping an insert policy
does not lock the writers out — no table here has `force row level security`, so
a definer function owned by the migration owner bypasses RLS. That was verified
before the design rested on it, and the happy-path test runs as `authenticated`
through the writer, which is the proof.

**Two things that got better on the way.** The account is chosen by matching
`billing_accounts.billing_currency` to the price's currency and opening one only
when the payer has none in it — the client-side version hardcoded `UGX` on a new
account whatever the price was in, and D4 says the account currency is
authoritative for the original amount. And a membership that cannot
`can_manage_payment_methods` is no longer used to pay, which is what
`create_plan_order()` already required; the two writers now agree about who a
payer is.

**`commerce.checkout` is load-bearing.** It was registered in
`20261024000100_flag_register.sql` and read by nothing in the runtime, so the
platform's "everything ships off, enabled from the dashboard" promise was untrue
for checkout specifically: with Supabase configured, an order could be created
with the flag off. It is checked in the writer, because the writer is the only
place every course order must pass, and `/courses/[slug]/buy` reads it too — a
closed checkout shows "Checkout is not open yet" instead of a form that fails
after the payer has chosen a provider and typed a phone number. The refusal key
is `checkout:disabled`, which the API answers as 503 rather than 400 or 500: the
platform is closed, the payer's request was not wrong and nothing is broken.

**Refusals are keys, not prose.** The writer raises `checkout:not_signed_in`,
`disabled`, `course_not_available`, `price_not_available`, `price_window`,
`not_one_time`, `price_not_for_this_course`. `lib/checkout.ts` maps each to a
`CheckoutErrorCode` and a sentence, matched on the key rather than on English
words, because the prose version of that — the regexes in `createPlanOrder` —
breaks the moment somebody rewords a `RAISE`. An unmapped key degrades to
`error`, which is a 500: a refusal nobody thought about should be loud rather
than wearing a friendly sentence that happens to be wrong. `createOrder()` no
longer takes a `userId`, since the writer takes the actor from the session's own
claims and a user id in the request would be a value the caller chooses.

20 database tests in `supabase/tests/course_order.test.mjs`, every one of them
from the `authenticated` seat the exploit was reachable from, plus one inverted
assertion in `fulfilment.test.mjs` ('the creator **cannot** write an order row on
their own account' — it used to assert the opposite, correctly, when the pin it
was making was that the paid path was reachable at all; that reachability is now
pinned through the writer). 8 web tests replace the 10 that asserted TypeScript
validation which no longer exists in TypeScript. One migration, one function, two
policies dropped, no new table, no new flag.

**Recorded, not fixed here.**

- ~~`create_plan_order()` is **not** gated on `commerce.subscriptions`.~~ Fixed in
  `20261232000100_plan_checkout_gate.sql`; see the newest entry below. Course and
  plan checkout now refuse with the same `checkout:disabled` key.
- `resolveBillingAccount()` still hardcodes `UGX` for a *new* account and is
  still used by the plan path, so a USD-priced plan can hang off a UGX account.
  The course path can no longer do that. Fixing the plan path means knowing the
  price's currency where the account is resolved, which is exactly what moving it
  into SQL would give.
- `prices.market` is enforced nowhere. `resolveOffering()` lists every market's
  price and the writer accepts any of them, so a payer in Kampala can buy at a
  price set for Nairobi. Localised pricing is display-only today; how a market is
  derived (the payer's country, the account's country, a selector on the page) is
  an open decision below.
- `payment_attempts_insert` still lets a billing member write an attempt row with
  any `amount_minor > 0`. Nothing grants access from an attempt and no money moves
  from one, so this is a support-facing record a payer could pollute rather than a
  hole in the money path. A `record_payment_attempt()` that takes the amount from
  the order belongs with the provider work (P12).
- `order_adjustments_insert` is the same shape as the two that were dropped, and
  is still open: a customer can write a discount onto their own order. It is
  harmless only because no total is derived from that table yet, and the next unit
  is the one that makes it derived — so it is replaced by an audited writer and
  dropped there, rather than dropped now and left with no path at all.


### An order's total is held against the parts that make it up, 2026-10-21

`orders_totals_agree` — total = subtotal − discount + tax — is a real constraint,
and it was the only thing standing between an order and a total that contradicted
itself. Nothing held an order to the rows behind it, in three places:

- **`subtotal_minor` was not the sum of the lines.** `order_items.line_total_minor`
  is checked against its own unit price, quantity and discount, and the order's
  subtotal was checked against nothing. An order could be paid for less than the
  things on it added up to, and both constraints would have been satisfied.
- **`order_adjustments` was write-only, and by the wrong people.** Its insert
  policy asked the same question as the two dropped in `20261224000100` —
  `is_billing_member()` — so a customer could put a discount row on their own
  order. It was harmless only because no total was derived from the table, which
  is also why the table was useless: a discount finance recorded changed nothing.
- **There was nowhere to put a fee.** No `fee_minor` column, so a provider or
  handling charge was either folded into the tax column (a lie on an invoice, and
  one that matters if tax is ever remitted) or into the total (which
  `orders_totals_agree` refuses).

**What changed.** `orders.fee_minor` (default 0, non-negative) and the identity
widened to `total = subtotal − discount + tax + fee`. `order_adjustments` gains
`voided_at`, `voided_by`, `voided_reason`, an `oa_void_agrees` CHECK (a voided row
names who voided it and why; a live row names neither) and `oa_amount_non_negative`
(the sign lives in `direction`, so a negative amount with a direction is a double
negative). `order_adjustments_insert` is dropped, with the read left alone so a
payer can still see their own invoice.

Three functions. `recompute_order_totals(order_id)` derives all five columns from
the rows — subtotal from the lines, credits into discount, debits into tax or fee,
total from the identity — and refuses when the result would be negative. It is not
callable by a client, because a recompute nobody asked for is a total that changed
with no row to explain it; it is the arithmetic inside the two writers.
`add_order_adjustment(order_id, type, amount_minor, direction?, reason?, item_id?)`
and `void_order_adjustment(adjustment_id, reason)` are finance_admin or
platform_admin only — an explicit role pair, because `is_privileged()` includes
`support_agent`, who may read an order to answer a question and may not change what
it costs, and a test pins that refusal. Both audit, both return the new totals, and
both take the currency from the order rather than as a parameter, since an
adjustment in another currency could not be added to a total and there is no rate on
the row to convert it with.

**Two rules that are decisions rather than mechanics.**

- **Adjustments are for before payment.** Once an order is paid its total is
  history: `record_payment_success()` has already written a
  `financial_transactions` capture for exactly that amount and accrued a teacher's
  earnings from it. Both writers refuse a paid order and say to use
  `record_financial_adjustment()` or a refund instead — separate rows that leave the
  original amount intact, which is D4.
- **Voiding, not deleting.** A wrong adjustment is withdrawn with a reason and stays
  readable, and `/orders` shows it as withdrawn. An order whose discount simply
  vanished is an order nobody can explain later, and a total that cannot be
  reconstructed from what the payer can see is a total that looks arbitrary.

**Direction comes from the type.** `manual_discount` is a credit; `tax`, `fee` and
`shipping` are debits; a contradiction is refused rather than stored, because a
discount that adds money is not a discount. Credits accumulate into
`discount_minor`, a debit `tax` into `tax_minor`, every other debit into
`fee_minor` — so `fee` and `shipping` share a column and an invoice shows them
apart from the adjustment rows. `rounding` is the one type that can genuinely go
either way (12 347 UGX to 12 300 is a credit, to 12 400 a debit), so it is the one
that asks for a direction and refuses to guess. `promotion` is refused outright:
`oa_promotion_agrees` requires a `promotion_redemption_id` and nothing can write
one, because promotions eligibility and stacking are undecided, so accepting a
hand-typed id would manufacture the row the constraint exists to guarantee.

**The invariant, and where it fires.** `orders_parts_agree` is a BEFORE UPDATE OF
status trigger that refuses to let an order become `paid`, `partially_refunded` or
`refunded` while any of its four columns disagrees with the rows behind it. That is
the moment the numbers stop being editable and start being history — the capture and
the earnings are written in the same call — and the refusal names both figures
("its subtotal is 5000 but its line items add up to 30000") so a support agent can
act on it. It deliberately does not fire on INSERT: an order is always born
`pending_payment` by one of the two definer writers, and on INSERT its line item
does not exist yet, so the sum would be zero and every order would be refused.
Nothing can insert one another way, because both insert policies are gone.

**A finding this exposed, pinned rather than endorsed.**
`accrue_instructor_earnings()` computes a teacher's gross as
`sum(order_items.line_total_minor)` for their courses — the **subtotal**. So an
order-level discount is absorbed by the platform and the teacher's share is still
computed on the pre-discount price, while a fee or a tax is kept by the platform and
is not in the gross either. For a fee and a tax that is plainly right. For a discount
it is an open business decision — who funds a promotion — and at the extreme it pays
the teacher more than the order collected: a 100% discount on a 50 000 UGX course
still accrues a share of 50 000 against an order that took nothing. A test asserts
the behaviour exactly as it is, with a comment saying it is pinned and not endorsed,
so changing it is a decision somebody makes rather than something nobody noticed.
Recorded below. No guard was added, because every candidate guard (cap the earnings,
refuse the discount, apportion it across the lines) is a different answer to that
question.

**Where it renders.** `/orders` shows the breakdown — subtotal, discount, tax, fee —
when any part moved the total, and nothing when the total is the whole story, which
it is for nearly every order. Under it, each adjustment as a line with its reason,
including withdrawn ones. Both are formatted by the same `format()` as the total,
because two renderings of one number read as two numbers.

**Not built.** No screen calls the two writers yet. `/admin/financial-adjustments`
is the post-payment instrument and says so on its face ("append-only accounting
corrections... they do not themselves transfer funds"), and there is no admin order
list to hang a pre-payment adjustment on, so the screen that drives them is
`/admin/orders` and it is the next unit.

24 database tests, 4 web tests. One migration, four functions, one trigger, one
policy dropped, one column added, two constraints added and one widened.


### Finance can see the orders it is allowed to adjust, 2026-10-21

The two writers from earlier today had no screen, and the reason was not the UI.
`orders_read` is `is_billing_member(billing_account_id)`, so a finance admin cannot
read a single order through PostgREST. That is the right policy for a payer's
invoice and it left `add_order_adjustment()` with no way to find the order it
applies to — a writer reachable only by somebody willing to call an RPC by hand,
which is the same defect the audit has been closing for twenty units.

**The reader is a function, not a wider policy.** `admin_orders_overview(p_limit)`
is `SECURITY DEFINER`, gated on `platform_admin` or `finance_admin`, and returns the
unpaid orders with their five totals as decimal integer strings, their lines with the
title from each snapshot, and every adjustment on them including withdrawn ones with
who withdrew it and why. Widening `orders_read` to `staff_only()` was the obvious
alternative and the wrong one: `is_privileged()` includes `support_agent`, whose job
is to answer a question about one order that already has a case open, and a policy
would hand them every order on the platform. A function keeps the answer to "who may
read every order" in one place, next to the writers it feeds, and it can be shaped —
limited, capped, newest first — rather than returning a table.

**Only orders that can still be adjusted.** The queue is `draft`, `pending_payment`
and `awaiting_confirmation`, and excludes deleted ones. A paid order's total is
history, so a paid row here would be a row whose every button refuses; paid orders
belong on `/admin/reconciliation` and `/admin/financial-adjustments`, and the page
links to both rather than leaving somebody to guess where the rest of the money is
handled. The limit is honoured, defaults to 50 and caps at 200, because a reader
that returns every unpaid order on the platform is a query that gets slower every
week.

**The screen.** One card per order, because an adjustment is about *this* order's
total and a form that asks for an order id is a form that can be pointed at the wrong
one. Each card shows whose account it is on, the lines, the total and its breakdown;
a type selector that offers the five types the writer accepts and not `promotion`
(a dropdown offering a button that always fails is worse than no dropdown); a
direction selector that appears only for `rounding`, the one type that genuinely goes
either way; a line selector that appears only when there is more than one line, since
an adjustment naming a line is a note about what it is for; a mandatory written
reason; and a withdraw control on every live adjustment, disabled until a reason is
typed. The response reads the new total back — "the order total is now UGX 41250" —
because "saved" leaves an admin guessing what they just did to a number.

Above the queue, one figure per currency and never one number for all of them:
orders on this platform are in whatever currency a family has, and adding a UGX total
to a USD total produces a figure that looks like money and is not. That is the lesson
from the money report applied to a much smaller sum.

`lib/order-adjustments.ts` holds the browser half: the five types with what each one
means, validation that refuses what the writer would refuse (a promotion, a
contradictory direction, a rounding with no direction, a signed or decimal amount, a
missing or over-long reason, a malformed id), the reader's jsonb parsed defensively
with the count recomputed from the array rather than trusted, and the writer's prose
refusals mapped to statuses. Every one of those rules is also in the database; the
copy here exists so a finance admin gets a sentence instead of a 400 with a Postgres
message in it, and the mapping is tested against the exact strings the writers raise,
so rewording either side fails a test rather than silently degrading to a 400.

11 database tests, 16 web tests. One migration, one function, one page route and one
API route, no new table, no new flag, no policy added or dropped.


### A discount is shared with the teacher who gave it, 2026-10-22

Yesterday's audit-pinned finding, now decided and built. `accrue_instructor_earnings()`
computed a teacher's gross as `sum(order_items.line_total_minor)` — the subtotal. So a
credit recorded by `add_order_adjustment()` came entirely out of the platform's margin
while the teacher still earned a share of the pre-discount price, and an order discounted
to nothing accrued a share of the full sticker price. Both were pinned by a test with a
comment saying the behaviour was pinned and not endorsed; the decision on 2026-10-22 was to
split it at the revenue-share rate, and this is that split.

**The rule.** `gross = the teacher's lines − their share of the order's live credits`, and
`net = round(gross × share / 100)` is unchanged in form, so `iee_split_agrees` still holds
every row to its own constraint. Which means, at a 50% share, a 10 000 UGX discount costs
the teacher 5 000 of net and the platform 5 000:

| | before | after |
|---|---|---|
| capture | 41 250 | 41 250 |
| teacher gross | 50 000 | 40 000 |
| teacher net (50%) | 25 000 | 20 000 |
| platform keeps | 16 250 | 21 250 |

Only **credits** are shared. A fee is the platform's cost and stays the platform's; tax is
remitted and is nobody's revenue; a rounding credit is shared like any other credit,
because it reduces what was collected. A voided credit is not shared at all: the rows are
what the total is derived from, so a withdrawal somebody made cannot cost a teacher money.

**The arithmetic has to be exact.** With several teachers on one order the credits are
apportioned by line total: an integer base share, and the units left over by that division
go to the largest remainders, largest line first, then by id. That makes `sum(shared) = the
order's credits` exactly — a remainder in a split is money that quietly disappears — and
`gross ≥ 0` always, because a credit can only take a line to zero. Two tests drive it with
numbers chosen to divide badly (33 333 / 66 667 with a 1 000 discount, and two equal lines
with a one-unit discount), and both assert the sum rather than only the parts.

Two teachers on one order is not something a writer can produce yet — `create_course_order()`
sells one course — but the accrual is written for a bundle, so the apportionment is built
and tested now rather than when the first bundle is sold.

**The row explains itself.** `instructor_earnings_entries.shared_discount_minor` records
what this teacher bore, so `gross + shared` is their line total and a teacher asking why
their gross is 40 000 on a course that sells for 50 000 can be shown the answer. It defaults
to 0, which is accurate for every row that predates it: nothing could credit an order before
20261225000100. A teacher can read it under `iee_read`; nobody can edit it, because
`iee_write` is an insert policy for staff and there is no update policy at all.

**A gap this exposed.** `financial_transactions.amount_minor` is `> 0`, so a capture for
zero is refused — which means **a 100% discount cannot be paid through
`record_payment_success()` at all**, and a full scholarship is unreachable today. That is
the right refusal (an order that costs nothing needs a fulfilment path, not a payment of
nothing) but the fulfilment path does not exist. Recorded below rather than papered over by
allowing a zero capture, which would put a zero row in the ledger to make a payment that
never happened.

**And a test-hygiene bug worth its own paragraph.** The first full run failed four suites
that passed in isolation, all with a net of zero: `revenue_share.test.mjs` took
`teaching.revenue_share_percent` to 0 to prove the 0% case and **left it there**, so every
suite after it that accrued earnings did so at a share of nothing — and the failures named
files that never touched the setting. `earnings.test.mjs` leaked 70 the same way. Both now
put the chosen value back, both suites that assume 50 set it rather than inherit it, and
`run.mjs` now **fails the suite that leaked** rather than letting the next one discover it:
after every suite it checks the two settings that are global by design — the revenue share
and the checkout flag — against their seeds and records a failure against the suite
responsible. Three of today's changes are that class of bug, which is why it is now a rule
rather than a habit.

14 database tests, one migration, one column, one replaced function. No screen changed: no
page displays a teacher's earnings yet, so the split is visible in the ledger and not on a
screen.


- **An order discounted to nothing cannot be fulfilled.** `financial_transactions.amount_minor`
  is `> 0`, so `record_payment_success()` refuses to write a capture for zero and a 100%
  discount cannot be completed: the payer is left holding a pending order for a course that
  is free. The refusal is right — an order that costs nothing should not produce a payment
  row — but the fulfilment path it implies does not exist. It needs a way to grant
  entitlements and accrue at a zero total without a capture: either a `fulfil_free_order()`
  beside `record_payment_success()` that writes no financial transaction, or an allowance
  for a zero-amount capture that the ledger is then taught to interpret. Decided by whoever
  wants full scholarships, not by the accrual code.

### A purchase that would grant nothing new is refused, 2026-10-22

`create_course_order()` was careful about everything the buyer could lie about — the
course, the price, the product behind it, the currency, the account — and silent about the
one thing it could have asked and didn't: do they already have this? Entitlements are not
consulted anywhere on the purchase path. An account with live access could buy the same
version again, pay in full, and receive nothing, because `record_payment_success()` skips a
grant that already exists. Nobody is defrauded. A family is charged for air and gets a
refund, which is the expensive way to fix a question that costs one `select`.

**The condition, and why it is that narrow.** Refused when a learner profile belonging to
an active member of the account that would pay already holds a live `purchase` entitlement
for this exact course version. Three words in that sentence are doing work:

- **`purchase`** — because that is what the fulfilment skips. A grant that came from a
  subscription expires with the subscription, so buying the course outright adds
  permanence and must still work. Asking "do they have any entitlement" would block the one
  purchase that upgrades them.
- **the account** — because the grant is per account: fulfilment loops over every learner
  profile of every active member, so one purchase covers every child. That is also the
  answer to the case that looks like it should be the exception. Twins are two profiles on
  one account, the first purchase enrols both, and there is no second purchase to refuse. A
  rule written per child would have been the one that could reject a twin; this one cannot.
- **live** — a revoked, suspended or expired grant does not block. A family that lost access
  is buying it again, which is a real purchase.

**The key is `checkout:already_owned`**, mapped in `web/src/lib/checkout.ts` to
`already_entitled` — 409, because it is a conflict with the state of the account and not a
mistake in the request. The sentence matters more than usual here: *"Everyone on this
account already has this course, so buying it again would add nothing."* Not "you already
own this", which reads as a refusal to let a parent buy for a second child, and which is
wrong about who the grant belongs to. A test asserts the reassuring framing rather than
just the code, and asserts the payer is never shown the raw key.

**A full redefinition, not a wrapper.** The new migration repeats the function body from
`20261224000100` with one block added after the account is resolved — the check needs the
account, and the account is created on the fly when the payer has none. Diffing the two
files shows the block and nothing else, which is the only honest way to carry a change into
a 250-line definer function: a wrapper would have meant two places that decide what an order
is.

4 database tests, 1 web test, one migration. The tests cover the refusal, the lapsed grant
that must not block, the subscription grant that must not block, and a second family buying
the same course.


### A teacher may store 50 GB, and the count says why that number, 2026-10-22

`platform.cost_controls` has been registered since the flag table was written, and its own
note said what was missing: *"**Nothing exists.** Unlimited teacher uploads is how $250/month
becomes $3,000"*. A per-file ceiling of 8 GiB existed; nothing limited the total, so one
teacher with a camera and a fast connection could commit the platform to a storage bill
nobody chose. The decision of 2026-10-22 was 50 GB — about a day of 1080p video, invisible to
almost every teacher and a conversation-starter for the one uploading a whole curriculum in
4K — and this is the rule.

**Counted on masters.** The rendition ladder stores roughly 2.1 times the master, and it
stores them because the *platform* chose to transcode. Charging a teacher for copies they
never asked for would make the quota a surprise, so the allowance counts
`media_assets.byte_size` and nothing else. The cost is still the stored figure: 50 GB of
masters is about 107 GB in R2, roughly $1.60 per teacher per month at full utilisation.

**What counts and what gives back.** Quarantined and pending masters count — a file held for
review is still bytes in a bucket, and a quota that could be dodged by uploading something
that gets held would be no quota at all. A withdrawn master does not: D7 withdrawal is what
"I no longer store this" means, and the space has to come back, which a test drives through
`delete_media_asset()` rather than by editing a column.

**Where it is enforced, and why there.** At initiate, on `/api/media`, before anything is
signed. `media_upload_allowance()` answers whether one more upload fits and returns every
figure as a decimal integer string; the route turns a refusal into a 413 whose sentence names
the file size, the space left and the allowance, because "quota exceeded" without a figure
tells somebody they cannot do the thing and not what they can do instead. `request_upload`
asks about the bytes it is about to declare; a multipart upload has already registered its
asset, so those bytes are inside `used` and the check asks for zero new bytes rather than
counting the file twice.

The alternative — checking in TypeScript — would have been a rule that a second caller could
disagree with. The alternative — checking inside `register_media_upload()` — is stronger in
principle and was not done here, for a reason worth writing down: registering an asset stores
no bytes, and signing does, so the route that signs is where storage is actually committed.
A direct RPC call to `register_media_upload()` can spend the caller's own allowance but cannot
put a byte in a bucket, so the bill stays bounded. If a second signing path ever appears, the
check has to move into the writer with it.

**Off by default, and visibly so.** `platform.cost_controls` ships false, so the allowance
reports `enforced: false, allowed: true` with `quotaBytes: null` and `remainingBytes: null` —
null rather than zero, because zero reads as "no space left" and a reader would act on it.
Turning it on is a settings change. A number below 1 GiB raises
`media:quota_misconfigured` instead of silently blocking everything or silently allowing
everything, because a zero in a settings row is far more likely to be a typo than a policy.

**Also fixed in passing:** `FLAGS.md` claimed 93 settings and "ninety-two boolean, three
integer and one text", which does not add up to 93 and had been wrong for a while. Measured
now: **94 rows — 89 boolean, four integer, one text.**

9 database tests, 4 web tests, one migration and one control. **Not built:** no screen shows a
teacher their usage before they trip over it — the refusal names the space left, but a meter
on `/admin/media` (or the upload form) is the obvious next piece, and is recorded below.


- **A teacher cannot see their storage usage until they hit it.** The quota is enforced at
  initiate and the refusal names the space left, but nothing shows a teacher (or an admin) how
  much of the 50 GB is in use, so the first warning is a refused upload. `media_upload_allowance()`
  already returns the figures and `/api/media` already calls it; what is missing is a meter —
  ideally on the upload form before a file is chosen, and on `/admin/media` per teacher.

## Open external decisions (not to be guessed)

- **An email/SMS provider — the first external blocker, chosen 2026-10-22.** Three
  built things are waiting on it and none of them can be finished honestly without
  one: the invite flow above, purchase receipts, and the password-recovery mail
  that Supabase sends through its own default sender. Preparing for it means the
  sending surface, templates and a recorded outbox that a provider can be plugged
  into without touching a caller; it does not mean choosing a vendor in code.
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
- **Whether a market belongs to a country at all.** Built 2026-10-22 as
  `prices.market` = an ISO country code: an exact match, then the price that
  declares no market, then a refusal. The country is the request's on a first
  purchase and the account's afterwards, and staff can correct it in writing.
  What is not settled is whether country is the right *grain*: the alternative
  is that a currency is the only regional signal — one price per course per
  currency — which is simpler to explain to a teacher and cannot be gamed by a
  VPN, but cannot express "cheaper in Uganda than in Kenya" in the same money.
  If that wins, `resolve_course_price()` becomes a currency rule and the web
  path does not change. §`DECISIONS.md`, 2026-10-22.
- **Sharing with an address that has no account.** Answered and **built** on
  2026-10-22: it sends an invitation carrying a token, so the screen neither
  no-ops nor discloses whether the address is registered. The function that used
  to answer that question (`resolve_share_grantee()`) is revoked for every
  signed-in caller. What is left is delivery: invitations are queued in the
  outbox, and nothing reaches an inbox until `delivery.notifications` has a
  provider.
- **What nets against what in the money report.** `/admin/money-report` totals
  credits and debits separately and refuses to produce one figure, because whether a
  chargeback offsets the capture it came from, whether a provider fee is deducted
  from revenue here or from the teacher's payout, and whether a reversed transaction
  belongs in the period it happened in or the one it was reversed in, are decisions
  about the business. Each is a one-line change to `report_money_in_reporting_currency()`
  once made, and guessing would bury the answer in a sum that looks authoritative.
  The report says on its face that it does not net.
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

Settled on 2026-10-22 and no longer open, all six written up in `DECISIONS.md`:

- **Who pays for an order-level discount** — split at the revenue-share rate. At a
  50% share a 10 000 UGX discount costs the teacher 5 000 and the platform 5 000,
  which is the teacher's share of the *discounted* line total, so `net =
  round(gross × share / 100)` keeps its form and `iee_split_agrees` still holds.
  Only credits are shared: a fee is the platform's cost and tax is remitted.
- **What a promotion is** — the full version, not codes alone: codes and
  redemptions first (which is what unblocks the refused `promotion` adjustment
  type), then eligibility rules, then stacking order and a floor. Every refusal
  has to explain itself in a sentence a parent can act on, because an eligibility
  rule is a way to tell a family no at checkout and ease of use is the dominant
  principle.
- **Buying a course a learner already owns** — refuse a purchase that would grant
  nothing new. *Re-scoped on 2026-10-22, superseding the family model recorded
  earlier that day*: **one purchase covers one learner.** So the order names the
  learner it is for, the refusal is per learner and per course version, a sibling
  buying the same course is an ordinary purchase, and fulfilment grants the named
  profile rather than every profile on the account. The message names who already
  has access and until when, so it reads as reassurance rather than rejection.
  Renewals after expiry, new versions and other learners are unaffected.
- **How a price's market is chosen** — the buyer's country, resolved in the
  writer: an exact match, then the default the price declares for its currency,
  then a refusal rather than a guess. The consequence is that
  `create_course_order()` can no longer trust a posted price id, or localised
  pricing stays display-only and the cheapest market becomes everyone's.
- **Whether a scholarly authorisation needs a verified qualification** — yes, in
  that subject, for every scope including technical. Checked when authorising and
  again when assigning, because a qualification can expire after the grant.
- **How much a teacher may upload** — 50 GB per teacher, counted on master bytes
  and not on the renditions derived from them (the ladder stores about 2.1x the
  master and is the platform's choice, not the teacher's). An admin-editable
  setting behind `platform.cost_controls`, enforced at initiate, naming the space
  left, with uploads in flight counting from initiation so a stalled transfer
  cannot be used to slip past it.

**Five of the six are built. One remains.** In build order:

1. ~~A discount shared at the revenue-share rate~~ **Built** — `20261227000100`,
   `discount_sharing.test.mjs`. A teacher now bears half a half-price discount
   rather than none of it.
2. ~~The duplicate-purchase refusal~~ **Built** — `20261228000100`,
   four tests in `course_order.test.mjs`. It was scoped to the account and the
   version here; the grain moved to the learner later the same day (see the
   newest entry above), so the sibling case is now an ordinary purchase rather
   than something the guard avoids.
3. ~~Market resolution by country~~ **Built** — `20261230000100`,
   `market_pricing.test.mjs`, and the web path that reads it. The country comes
   from the request for a first purchase and from the account afterwards; a
   price id is no longer accepted by the writer at all. Whether a market should
   be a country is still asked below, and this is the answer it assumes.
4. ~~The 50 GB quota behind `platform.cost_controls`.~~ **Built** — `20261229000100`.
5. ~~Verified qualification required for every authorisation~~ **Built** —
   `20261231000100`, `reviewer_register.test.mjs` (38 tests), plus the mandatory
   subject at recording. The owner decides a credential; a convened board may.
6. **Promotions**, in the three stages above — the largest of the six by some way.
   Nothing is written for it yet beyond the three tables. Next.
- Automatic subscription renewal worker and provider support.
- Legal review and any locale-specific safeguarding/child-consent requirements.

The dormant scholarly panel and other unbuilt product groups remain in
`ROADMAP.md`, `FLAGS.md` and `NEXT.md`'s implementation history below. Do not
claim external integrations work without credentials or provider callbacks.

---

## Implementation history (counts below are historical snapshots)

### A saved lesson lives in the app, and needs a Plus plan, 2026-10-22

Two answers in one: *"offline downloads work like youtube downloads — they only exist in
the app locally but not in their file manager"* and *"a user requires a subscription to a
plus plan, on top of the basic plan, more like the vip package."*

The entitlement half already existed — `may_download_lesson()` has demanded an
`offline_downloads` grant on a subscription since 2026-10-20. What did not exist was
anything that could make a *save* mean something, and the old button on the lesson page
does the opposite of what was asked: it signs a URL with `attachment` and hands the file to
the browser's downloads folder.

So the save is now a record. `save_offline_lesson()` books a lesson against a **device** —
a random key the app generates and keeps, not a fingerprint — with an **expiry**, and it
honours two settings the owner controls: `learning.offline_max_devices` (3) and
`learning.offline_expiry_days` (30). It refuses before registering a device when the cap is
full, because registering first and refusing after leaves an empty device row the learner
sees and cannot explain. Devices count only while they hold a live save. Removing a device
ends its saves; a lapsed save is shown as lapsed rather than deleted, because "why did this
stop" deserves an answer.

The bytes go into this origin's IndexedDB. The button is now **Save on this device**, the
signed URL is fetched once and never navigated to, and `/downloads` lists what is here,
what it is using, and what has expired. The claim is deliberately narrow and honest: this
does not make copying impossible — nothing can — it makes the *app* the only supported
place a saved lesson exists.

`plans.tier` is now a column (`basic` or `plus`), because "a plan on top of the basic one"
was described in a comment and stored nowhere. It is deliberately **not unique per tier**: a
market may sell two Basic plans at two prices. What makes a plan the VIP one is the tier
*and* the feature grant its live version carries — neither alone should be able to hand out
the feature.

### The quota a teacher can finally see, 2026-10-22

The 50 GB per-teacher allowance has been enforced since it was decided, and invisible the
whole time: the first a teacher would hear of it was an upload that bounced. A limit nobody
can see is felt as an outage, not as a rule.

So there is a meter, and it was built out of the refusal rather than beside it.
`my_media_storage()` returns the caller's own figures by calling `media_upload_allowance()` —
the same function `/api/media` refuses with — and adds a breakdown by file status.
`/teach/media` renders it: masters used, the space left, a bar, and what each status is
costing. When `platform.cost_controls` is off it says there is no cap rather than drawing a
percentage of nothing.

`/admin/media` gains the other half: **storage by teacher**, biggest first, with each person's
share of the allowance and a flag for whoever is over. The owner runs the bill, so that number
belongs to administration.

Two smaller consequences. The upload form now compares the chosen file with the space left
*before* hashing a 2 GB master, because a minute of checksum then a refusal is the worst order
to deliver that news. And the meter counts exactly what the quota counts — masters only,
soft-deleted excluded, pending and held included — because a second definition of "used" is
how a screen ends up promising room that the writer then refuses.

### A teacher may count their course, not their children, 2026-10-22

The analytics decision ended with an open question: the data exists, so what may an author see
about it? The answer splits cleanly, and the split is the design.

**Aggregates for the author.** `teacher_course_analytics()` returns one course's numbers to the
teacher who wrote it, or to staff: total events, distinct learners, distinct people signed in,
counts per event, the ten most-opened lessons, and lesson opens by day. Over 7, 30 or 90 days.

**No learner references, anywhere.** Not "hidden by the screen" — the function does not select
them, and a test asserts that neither the teacher's user id nor the learner's profile id appears
anywhere in the returned JSON. The number of people who opened lesson three is a fact about the
course; a list of *who* opened it is a fact about children. A per-learner view already exists
where it belongs: the cohort progress screen, behind its own flag and its own opt-in. Two
questions, two permissions, and the line between them is drawn in SQL rather than in a template.

**The refusal is a sentence.** With capture off, the teacher is told analytics is not enabled
rather than shown a page of zeros — an empty report and a switched-off report are different
facts, and a dashboard that cannot tell them apart is lying gently.

`/teach/[courseId]/reports` is the screen, linked from the course page. The daily and per-lesson
figures are bars drawn with a `div`, because a chart library is a dependency and this is a count.

### About the platform, 2026-10-24

Screen 2 — `/about` — was the last unblocked marketing screen in the inventory. It is static: no
database read and no flag, so it renders on an empty deployment.

It describes the review pipeline (author → verified reviewer → owner publishes → the version freezes),
the appointment of teachers, why a child is a learner and not an account, and why there is no date of
birth in the system. Nothing on it quotes a number, a testimonial or a price.

**Open:** there is no public teacher index — `/teachers/[slug]` exists but nothing lists the teachers, so
the About page does not link to one.

### The ages are said where the decision is made, 2026-10-24

A course's bands were only used to filter two shelves. Now `/courses/[slug]` prints them under the badges,
and the enrol control prints `bandMismatch()` for the selected learner — a sentence, not a gate.

`bandMismatch(courseBands, learnerBand)` in `audience.ts` returns null when either side is silent, so a
course with no bands and a learner with no band both say nothing. `describeBands()` orders them by their
lower bound, so a course ticked 11–13 before 8–10 still reads "Ages 8–10 and 11–13".

**Open:** nothing blocks or asks for confirmation on a mismatch yet; that is a policy the owner has not
set. **Also open:** the teacher is not told when a learner outside the band joins their cohort.

### Every course, and who it is for, 2026-10-24

U72 gave the author a picker and left the staff override as a function with no page. `course_shelf()` and
`/admin/courses` are that page: every course, its author, the door it stands behind, the ages it claims,
published versions and live learners — with the audience editable inline through the same
`set_course_audience()` the author's picker calls.

The reader gates on `platform_admin` or `governance_admin` (not `is_privileged`), excludes nothing on
account of lifecycle, returns no learner identifier and no money, and reports `total` / `shown` /
`truncated`. `parseShelf()` refuses an unknown column or an unknown lifecycle rather than guessing.

**Open:** retiring or unpublishing a course is still not on this shelf. **Also open:** the shelf lists
courses; it does not show the lessons inside one, so "this course is filed under the wrong subject" still
sends the reader to the author's page.

### A course says who it is for, 2026-10-24

`courses.audience` has been there since the first migration and nothing joined it to a learner.
`courses.age_bands` closes the gap: five bands (5-7, 8-10, 11-13, 14-17, 18+), an empty array
meaning every band the audience allows, and a constraint that refuses an audience and a band that
disagree.

`set_course_audience(course, audience, bands)` is the only writer. Author, platform admin or
governance admin; it normalises the order, drops duplicates, refuses *"18+ is not a band the child
audience may claim"*, audits both sides, and returns `changed: false` without an audit row when
nothing moved. It takes a **course** id, because who a course is for is not part of the published
version D5 freezes.

On the web: `audience.ts` (`AGE_BANDS`, `bandFits`, `audienceFits`, `validateAudience`,
`audienceSummary`), the audience picker on `/teach/[courseId]` beside the subject picker, and the
two doors — `/young` and `/adults` — with the band chips on the young one, both behind
`learning.audience_sections` and `learning.age_bands`, which are in the register, off, and the
owner's to flip in `/admin/settings`.

**Open:** the staff override for a governance admin has no screen of its own — the function admits
them, but the only page that renders the picker is the author's course page. A staff-wide course
shelf is the next thing that wants building if governance is to curate audiences routinely.
**Also open:** the band is never shown on a course card in the catalogue, only used to filter, and
nothing yet warns a teacher who enrols a six-year-old in an eleven-to-thirteen course.

### A lesson remembers where you were, 2026-10-24

`lesson_progress.last_video_position` has been in the schema since the first progress migration and
nothing has ever written it, so every player started at zero. A learner who closes a forty-minute
recitation at minute thirty-one found minute one the next evening.

`record_lesson_position(enrolment, lesson, seconds)` is the writer. It checks whose learning it is
through `can_access_learner()` — the same helper the RLS policy uses, called explicitly because a
definer function does not run under RLS — refuses a lesson from a version the learner is not pinned
to, clamps the number into one day, and **never moves a completed or skipped lesson**: a position is
not a percentage, and a progress bar that drops because somebody rewatched the introduction is a bug
report waiting to happen.

`lesson_positions(enrolment)` returns the whole map in one call, because a lesson list wants to say
"resume at 12:31" beside twenty rows and a call per row would be twenty round trips to paint a
sidebar.

On the page, every player now keeps its place: the uploaded-rendition player for video and audio,
the external video, and the new recitation player. Resume is honoured only past fifteen seconds and
not within twenty of the end — ten seconds is not a place, and resuming at the end starts, finishes
and looks broken. Saves drift by ten seconds and are forced on pause, on end and on `pagehide`,
because `timeupdate` fires four times a second and an hour of recitation would otherwise be 14 000
writes. Resume happens once per mount, so switching quality does not throw the learner backwards.

**Screen 23, the Qur'an player**, is the same idea with a passage in it. A learner repeats after a
reciter and returns to one passage, and dragging a scrubber to find forty seconds inside nine
minutes is not a skill anybody has on a phone. So: speeds from 0.5× to 1.5×, two buttons that mark
the passage and loop it, the saved place — and the native controls, because media keys, the lock
screen and screen readers come free and a custom transport bar would trade them for a nicer play
button.

Tests: 11 new database tests — a position kept, an overwrite rather than a second row, negative and
absurd values clamped, a completed lesson staying completed with its percentage intact, the map in
one call with no zero entries, a stranger unable to write or read either way, a signed-out caller
refused, a lesson from another version refused, an unknown enrolment refused, and a guardian keeping
a place for a child on their family account. 8 new web tests cover the resume threshold, the end of a
lesson, the time format, the speed ladder and the four states of a marked passage.
### Who is here, and who teaches, 2026-10-24

Two of the fifty screens have been `READY` since the inventory was written and have never had a
page: Users (36) and Teachers (37). Everything else in the console is about work waiting for a
person; these answer a question about people, and both are asked in the first week.

`staff_directory(kind, search, limit)` returns either list, so the shape, the search and the
refusals are declared once. Search matches the display name and the email address,
case-insensitively, with the LIKE metacharacters escaped — a search box where `%` returns
everything is a search box that dumps the platform.

**Accounts, not children.** A child is a learner profile inside a family and has no login while
`child_login` is off, so the children of the platform do not appear in the Users list by name.
The number beside an adult is how many learner profiles hang off the account.

**No money anywhere in a directory.** No balance, no lifetime value, no currency. The money
screens are gated and a roster with an amount column is where two currencies get added by eye.
The reader allow-lists the fields a row may carry, so a column added later fails the page until
somebody admits it deliberately.

**Two different questions about who may look.** Finding an account is support's job, so every
staff role may search accounts. Who teaches, what they published and how many learners they hold
is the owner's and governance's — `instructor` is granted by appointment, and governance checks
the qualification behind it.

**The roster counts published, not written.** A course counts as published once one of its
versions is, and once however many versions it has. Learners are distinct people across a
teacher's courses: a number, never a list.

Both screens say when they are cut short — `Showing 50 of 120` — and the parser derives truncation
from the arithmetic as well as the flag, because a list of fifty that says nothing becomes "we
have fifty accounts" in somebody's head.

Tests: 19 new database tests — a learner and a signed-out caller refused; support reading accounts
and refused the roster; the owner and governance allowed it and finance not; an unknown kind
refused by name; roles in the row and no money field; an account with no role reading as an empty
list; a suspended account still listed, an erased one not; case-insensitive and substring name
search; email search; `%` searched literally rather than dumping everyone; the limit and its
truncation flag agreeing with the arithmetic; a teacher with no course on the roster with a zero;
a draft version counting as a course but not a publication; two versions publishing once; only
holders of `instructor` on the roster; and a revoked role removing somebody. 9 new web tests cover
the parse, the field allowlist, truncation honesty and the role labels.
### The switchboard belongs to the owner, 2026-10-24

`/admin` is one address with four kinds of staff behind it. The queues at the top were
already filtered in the database — a count that is not sent cannot be read — so the page
was honest about the work and careless about the doors.

A support agent saw a revenue-share field, ninety feature switches and a wall of money
links. Every one of them would have refused them, and the *toggles would not have*: the
write policy on `platform_settings` was `is_privileged()`, so a support agent could turn
`commerce.checkout` on with one UPDATE. That policy was never decided; it was written
before there was more than one kind of staff member.

**The register now says which kind of row it is.** `setting_kind` is `flag` (90 feature
switches) or `control` (13 dials). A BEFORE trigger, `enforce_setting_authority`, refuses
a non-owner writing a flag, and hands a control to `may_write_setting()` — which asks
`may_change_control()` for the ten in the allowlist and names the three bespoke writers
with the role each actually checks. A control can no longer be changed by writing the
table and skipping its bounds, its reason and its audit. The guard compares every column,
not just the value: demoting a `code` flag to `admin` and then flipping it is two writes
that each look harmless alone.

**Then the screen caught up with the table.** `/admin` groups its links by whose work they
are, using the three booleans `staff_attention()` was already returning and nobody was
reading, and the switchboard is rendered only for the platform admin. Everyone else gets
one sentence naming whose the switches are — not "permission denied", which reads as a
fault to report, but a fact with a person in it.

**And the landing gap closed.** `homeFor()` asked about the owner, the board, the teacher
and the reviewer, then fell through to `/learn` for everybody else — so a finance-only or
support-only login landed on a catalogue of somebody else's courses. Both are staff; both
now land in the console.

Tests: 11 new database tests — the 90/13 split, a support agent reading 103 rows and
refused a flip, finance and governance refused one each, the owner allowed, a `gate_type`
demotion refused at the first write, a sessionless write still allowed (migrations are
one), a control refused through the table but accepted through all four of its writers,
the allowlist's own roles unchanged, and a learner reading an empty register and updating
nothing. One existing flags test was rewritten rather than deleted: it pinned "a
non-platform privileged role can read and write", which was the bug. 9 new web tests cover
the role matrix, the sentence a non-owner reads, and the two staff landings.

### The outbox learns how to give up, 2026-10-24

The platform has had an outbox since 19 October and no idea what to do with a message that did
not go. A row was `queued`, and then something claimed it was `sent` — which is a table where an
agent writes a hopeful word, and the word cannot be checked. `om_sent_has_provider` proves that
somebody typed a provider, not that a provider answered.

`20261270000100_delivery_contract.sql` gives the queue the five things it was missing.

**A claim is a lease.** `claim_outbound_messages(limit)` hands out the next eligible rows for five
minutes with `for update skip locked`, writing `claimed_at`, `claimed_until` and `claimed_by`.
Two dispatchers running at once cannot both take the same row, and a dispatcher that dies holding
one has its lease expire back into the queue rather than stranding a receipt in flight forever.
It refuses outright while `delivery.notifications` is off, because a queue that says "ready" when
the feature is off is the wrong way round.

**A failure is a clock.** `record_delivery_outcome()` is the only door and only settles a claimed
row. An `error` leaves the row `queued` with `next_attempt_at` 5 minutes out, then 15, an hour,
four hours, twelve — `delivery_backoff_minutes()` is the one place that schedule lives. This is
not politeness to the provider: an outage that gets worse because our retry loop hammers it is an
outage we caused.

**A ceiling ends it.** At `delivery.max_attempts` (default 5) the row becomes `failed`, keeps the
moment it died, and is audited as `delivery.dead_lettered` with the error. `om_dead_letter_agrees`
makes the moment part of the state, the same way `om_claim_agrees` makes the three lease columns
move together. A dead letter is the only state that needs a person.

**A bad address is remembered.** A bounce writes to `message_suppressions` in the same statement
that suppresses the message — a bounce that only marked one row would leave the next one to bounce
too. The list is checked inside `queue_message()`, so tomorrow's receipt is written as
`suppressed` with the reason. Deliberately not an exception: `queue_message()` runs inside payment
confirmation, and refusing a payment already taken because the receipt could not be emailed trades
a family's money for our tidiness.

**There is a way back.** `/admin/messages` grows a dead-letter list with a **Try again** that needs
a written reason, resets the attempt count, and audits the error the message died on. It refuses
while the address is suppressed, and says so — lifting a suppression is a separate, deliberate act.
A form beside it stops mail to one address by hand, for the family who writes in because the mail
is reaching somebody else, and reports how many queued messages it stopped with it.

`delivery.max_attempts` is the thirteenth control on `/admin/settings`, bounded 1–10: zero would
mean a message nobody ever tries, and eleven is a wait longer than the day it is trying to cross.

**Nothing sends.** No provider, no credential, no HTTP call — the screen says so in its first
sentence. What is decided here is every rule that has to hold *before* an HTTP call is safe to
make, which is the part a provider's SDK cannot supply. The email/SMS provider is still the first
external blocker; the adapter that arrives with it is `claim` → send → `record_delivery_outcome`.

### The numbers behind the switches, 2026-10-23

A flag decides *whether* something happens. A control decides *how much, how long or how many* — what
a teacher may store, how many devices one learner may save to, how long a saved lesson plays, which
URL carries a live class, how many approvals a course needs before it teaches anything.

Nine of those controls had no writer. They could be changed with an UPDATE against a table nobody
outside this repository can see, which is the shape the role rule rejects.

The tempting fix is one function that writes whatever key it is given, and that would be the same
hole with a friendlier name. So it is an **allowlist of nine named controls**, each carrying its own
type, its own bounds and its own owning role, with the bounds declared once in
`platform_control_rules()` and read by both the writer and the screen.

The refusals are where the design lives. A key not on the list is refused with a sentence saying
where it does belong. A feature switch is refused **by name** and pointed at the flag dashboard. And a
control that already has its own writer — the revenue share, the payout hold, the refund window — is
refused and named, because those writers do more than store a number: the revenue share snapshots
into every future earning, and a plain value write would bypass that.

`/admin/settings` renders only the controls the caller may change, because a control sent to the
browser and then hidden is still sent — and several of these numbers are not values to hand every
role. A finance admin sees the two money controls, a governance admin the two publication ones, a
support agent none, and the page says how many others exist without naming a value.

Two details worth keeping. Each control keeps its **own** bounds rather than a shared guess: the
device cap tops out at ten, the expiry at a year, the quota at ten thousand — one bound for three
would be wrong for two of them. And the live-room host may be **emptied**, because empty is the
honest shipped state: joining refuses rather than handing out a URL that carries no class.

### Three days to change your mind, 2026-10-23

The owner's rule: *a customer can only get a refund between the 72 hours that happen after the
payment.* There was no clock at all before it — a family could ask a year later and the only limits
were the refundable balance and a person's judgement.

`request_refund()` now reads `orders.paid_at` and refuses outside the window. The comparison happens
in the database against the server's clock, because `paid_at` is set by `record_payment_success()`
from a verified confirmation and a browser cannot be trusted with either end of that.

Three distinctions the rule turns on. It **bounds asking, not deciding**: a request made in the last
minute of the seventy-second hour can be approved next week, because expiring requests in flight
would punish the customer for how fast the platform moves. It **lets staff make it right**: support
opens a request from `/admin/refunds` by order number, attributed to them, with a written reason, and
the two-person rule still applies — because a rule with no escape hatch gets worked around in SQL,
where nothing is audited. And a **closed window is said rather than hidden**: `refund_standing()`
decomposes the writer's own predicate and carries the moment the window shut, so `/orders` prints
*"A refund can be asked for within 72 hours of payment, and that window closed on 26 Oct 2026 at
09:14 UTC"* instead of quietly removing a button.

`commerce.refund_window_hours` is a new ADMIN control in `FLAGS.md`, defaulting to 72; `0` closes
self-serve refunds entirely and a negative value is clamped rather than opening a window before the
payment. A test flips it to 96 and watches an 80-hour-old order become refundable, which is the
cheapest proof that the number is a setting and not a constant.

The staff form refunds whatever is still refundable rather than taking a typed amount — a mistyped
figure on a goodwill refund is money to chase. A partial goodwill refund is still a database action
with no screen, and that gap is written down rather than implied.

**And the number itself moved onto a screen.** It arrived by migration, which meant the owner could
change it with an UPDATE against a table they cannot see — the exact shape the role rule rejects.
`set_refund_window()` takes a reason, refuses anything outside 0 to 8760 hours with a sentence naming
the bound it crossed, and writes an audit row with the old value beside the new one; the field sits
on `/admin/refunds`, above the queue it governs. It is deliberately not a general settings writer —
one of those would let any privileged account rewrite the revenue share or the reporting currency
under cover of refunds, and a test asserts it cannot.

### A statement, so a family can see their own money, 2026-10-23

Three things could describe a payment: `/orders` said what an order was, the receipt gave it a
number and a document, and `/admin/money-report` told staff what the business took in. Nothing
answered the question asked two days after a refund request — *what has gone out of my account,
and what has come back?* — and the ledger that could answer it is staff-only for good reasons:
provider references, provider fees and settlement figures are the platform's business.

`my_statement()` is a projection over the three things a payer may already read. Per billing
account, per currency, a charge for every paid order and a refund for every completed one, in date
order, each carrying the running total after it — so the last row equals the net figure and a
reader can add the column up and get the same number.

The distinction the page is built on: **only money that moved is in the balance.** A refund asked
for, approved, or sent to a provider is not money, and each is listed under "not counted yet" with
a sentence saying where it has got to. That is the same line the whole money path draws — a request
is not a refund, an approval is not a transfer, a redirect is not a payment — and a statement is
exactly where a customer would notice if it were crossed.

`/billing` renders it, linked from `/orders` and `/account`. It has no flag: reading what you paid
is not a feature to switch on.

Two things it admits instead of hiding. A **decided dispute** does not move the balance, because
nothing posts the outcome of a dispute to the ledger yet; the case is listed with its state and a
sentence saying this record has no entry for it, which will stop being true the day a writer
exists. And the page says it is the platform's record rather than a bank statement: a completed
refund may take days to appear, and a bank's own fee never appears at all.

**Found while writing it:** `can_view_invoices` sits on every billing membership and no policy or
function reads it. The statement does not honour it — honouring it in one place while `orders_read`
ignores it would give two answers to one question — and it is recorded in `DECISIONS.md` as open
rather than half-implemented.

### What is waiting, said once, 2026-10-23

Thirteen queues; thirteen pages that each say what is in them; nothing that said *there is something
in one of them*. `/admin` is where a platform or governance admin lands on sign-in, and it opened on
ninety-six switches — all off — which is an excellent answer to "what can I turn on" and a poor one
to "is anything waiting for me".

`staff_attention()` returns the queues the caller may work with the count in each and the page that
drains it, and `/admin` now opens with them. The filtering happens in the function, not on the
screen: a count of refund requests is information about the business, so a support agent gets no
refund row at all rather than a row with a number they are trusted not to read. A zero is returned
too — a card that disappeared at zero would be indistinguishable from a queue that does not exist —
and the headline total is the sum of the cards, not a second query that could disagree with them.

Four of the eleven queues sit behind features that ship off. Those are marked **paused**, with the
flag named, because switching a feature off stops new work arriving and does not empty what is
already there: those cases still need a person, and a screen that hid them would be saying the
opposite. Flipping a setting clears the mark and leaves the count, which is the one test that pins
the distinction.

Nothing is sent. The first external blocker is still a delivery provider, so this is a page rather
than a digest; what it can do without one is make the page worth visiting.

### The export carried the young half of a record, 2026-10-22

`export_my_data()` already existed, was tested, and documented its boundaries well. It carried the
account, the family, the learners and their study record, orders with refunds, notes, bookmarks and
shares — and none of the rest: no discussion, no reviews, no submitted work or the marks and
feedback that came back, no quiz answers, no support cases, no messages, no earnings, no payouts,
no devices, no activity.

Those are added, and three promises with them. A list stops at 1,000 rows and `meta.truncated`
names the ones it cut, because a document that silently drops half of a history is worse than one
that admits it stopped. `notIncluded` says in words what is absent and why, because a reader cannot
tell an absence from a bug. And every copy writes an audit event with section counts — which
doubles as the rate limiter, ten an hour.

`/account/export` is new and explains both lists before the button; the account page now links to
it from the download it already had. The export stays **ungated**: `FLAGS.md` settled that before
this migration existed, and it is right.

### Sign in with Google, and the name Google already knows, 2026-10-22

Supabase Auth runs the flow: Google returns a code to Supabase, Supabase returns to
`/auth/callback`, and the deployment exchanges it for a session. No Google secret is in this
repository.

What the platform owed that flow was four things it does not get for free. A **flag**
(`auth.google_sign_in`) so a button is never drawn before the provider is configured — a button
that fails is worse than no button. A **name** that is a person's rather than the local part of
their address, read from `full_name` then `name`, capped at 80 characters so a hostile claim cannot
write a kilobyte into every greeting. An **honest answer to "how do I sign in here"**, so `/account`
does not offer a password reset to somebody who has no password. And a **sanitised return path**:
relative, no `//`, no backslash, because a sign-in callback that forwards anywhere is a phishing
kit's favourite component.

The flag is `admin_setup`, not `code`: the only missing piece is configuration, and
`docs/google-sign-in.md` lists the five steps. Once they are done the owner flips it from
`/admin` — no deploy.

### What renews, and why that is not a forecast, 2026-10-22

A subscription pins the plan version it bought and the price hangs off that version, so the next
charge is a fact to read rather than a shelf price to guess at. `platform_renewal_projection()`
expands each live subscription forward at its own interval until the end of the window and buckets
the charges by month, per currency, with past-due ones counted separately as at risk.

The important line is the one at the top of `/admin/renewals`: **nothing here charges anybody.**
There is no renewal engine and no merchant account, so the table is what has been *committed to*,
not what will arrive. A page that called it forecast revenue would be the same lie as calling
recorded earnings a balance.

A price change is a new plan version, and an existing subscription stays pinned to the old one — a
test raises the price and asserts the projection does not move. Where a version carries several
market prices the default is used, because a subscription does not record its market, and the
screen says so instead of inventing one.

### Telling somebody something without a vendor, 2026-10-22

`delivery.notifications` ships off and no email or SMS provider exists. That had been allowed to
mean the platform says nothing — so a teacher whose payout failed found out by opening the right
screen, and a learner whose class started in an hour found out by remembering.

`/notifications` is the in-app centre, and it is deliberately two things kept apart.

**Stored** is something that happened: a payout sent, a payout that failed with its reason, a
request staff cancelled. Written by the function that did it, read later, marked read, deduped so
a retried event is one message. Money events are the first users because a failed payout is the one
message that must not be missed.

**Derived** is something about to happen: a live class within a day, a plan renewing within three.
Computed at read time from the rows that already say so, so nothing is written, nothing goes stale,
and no scheduler has to exist. Each is gated on its own feature flag — a class reminder cannot
appear while `delivery.live_classes` is off, because the thing being reminded of is unreachable.

Derived reminders are not counted as unread; they are current, not waiting to be dismissed. The
footer link is where they live because the masthead is auth-agnostic on purpose.

### What the platform owes teachers, as a balance rather than a window, 2026-10-22

`platform_teacher_liability()` answers the question the request queue could not: how much of the cash
in the bank is not the platform's. It is a balance, not a flow — the earnings statement is one
teacher's view and the money report is a window of movement, and neither is the number an owner
carries.

Per currency: owed, of which still inside the refund hold, of which an open request has claimed, and
what has already been paid. The request is shown **beside** the balance rather than added to it,
because it is the same money seen from the other side — asking does not change what is owed. A
converted total appears only when every currency has a recorded rate; otherwise the function names
the ones it could not convert and shows no total at all.

The panel sits above the queue in `/admin/payouts`.

### Asking to be paid, and the refund hold that makes the question safe, 2026-10-22

The earnings statement answered "what have I earned" and left "when do I get it" unanswered.
`instructor_payouts` and `instructor_payout_items` had existed since the first money migration and
nothing drove them: no request, no queue, no hold, no place to say "that sale can still be
refunded".

`/teach/payouts` is the request, `/admin/payouts` is the queue, and the rule that shapes both is
that **a request moves no money**. `request_instructor_payout()` writes a row and nothing else.
Only `complete_instructor_payout()`, by finance, with a provider and a reference, inserts the
items — and the item trigger is what marks an earning `paid`. A request that marked anything paid
would make the earnings screen count money as sent that never left.

`teaching.payout_hold_days` (14 by default) keeps a sale from being paid before it can be reversed,
set from the queue screen with a written reason. **One open request per currency** is a partial
unique index rather than a check the code remembers to make, because two requests over the same
shillings pay them twice.

The amount on a request is an estimate. Entries reverse and new ones accrue while it waits, so the
queue shows what was asked for beside what the ledger owes today, and completion pays the current
figure. The teacher must tick that declaring the income is their own responsibility — the platform
has no tax treatment per country, and a checkbox is honest where a footnote is not.

`teaching.payouts` is still CODE-gated: a trigger refuses to enable it from the application at any
privilege level. The request path is dormant until a provider, destination details and a tax
treatment exist.

### A teacher's earnings, and the sentence that keeps it honest, 2026-10-22

`instructor_earnings_entries` has been written since the accrual function was built — one row per
paid sale, the split snapshotted, reversed on refund, corrected by clawback — and **nothing in
`web/src` named the table**. So the platform could take a teacher's share of a sale and not show
them a figure about their own work.

`my_earnings()` returns it per currency: earned-and-not-reversed, the gross sale behind it, any
reversals, any amount already paid, and the entries themselves with the course, the date and the
share recorded on that row. `/teach/earnings` renders it, linked from `/teach`.

**The hard part is the sentence above the numbers.** `teaching.payouts` ships off, there is no
payout provider, no destination and no tax treatment, and no money has ever left this platform.
A page that printed "balance: 250,000 UGX" would be the most damaging lie the product could
tell, so it says the opposite, in a warning: *nothing has been paid out yet, and this page
cannot pay you.* The function returns `payoutsEnabled` rather than letting the screen infer it
from an empty list.

**Currencies are not added together.** Shillings from one market and dollars from another are
two figures, because a combined number would be an exchange rate nobody recorded. That is the
money report's job, with a rate the owner enters.

Two rules the tests pin: an entry keeps the share it was accrued at, and a reversed entry stays
listed as reversed instead of vanishing.

### Say why a lesson cannot be saved, and what a plan actually gives, 2026-10-22

Two silences, one about selling and one about telling.

**The Save button that was not there.** `may_download_lesson()` answers yes or no, and the
lesson page rendered nothing when the answer was no. A learner on Basic saw a lesson, no way to
keep it, and no reason — so the feature Plus exists to sell was invisible to the only person who
could buy it. `lesson_download_standing()` decomposes the same predicate into a reason with a
sentence, and the player shows it under the video. `needs_plus` is the only reason that becomes
a link: pointing somebody who has not bought the course at the Plus shelf would sell them a
benefit they still cannot use.

The decomposition is held against the predicate it explains. A test builds five states — flag
off, not entitled, entitled without Plus, entitled with Plus, no media — and asserts that
`allowed` equals `may_download_lesson()` combined with the flag in **every** one. The standing
never decides anything; it only says why.

**`/subscriptions` said nothing about what you were paying for.** It now leads each card with
the shelf and a sentence list of what the plan carries, from `my_plan_summary()`: a Plus
subscriber sees "Watch lessons inside the app with no connection", a Basic subscriber sees the
catalogue their plan covers and one line saying what Plus adds.

**And a leak, found by the test written to check the opposite.** The first `my_plan_summary()`
was `security definer` and relied on the RLS policy on `subscriptions` to limit it — which does
not apply inside a definer function. It returned every subscription on the platform. The test
"somebody else's plan is not in the summary" failed on the first run; membership is now an
explicit check in the function, with a comment saying why, because the next definer function
that reads a per-person table will make the same mistake.

### Everything is kept, so the store had to be built to keep it, 2026-10-22

The owner's fourth answer that day was a sentence about retention: *"analytics, everything is
kept and is stored forever because you never know what might happen."* That was recorded, and
`delivery.analytics` stayed CODE-gated because there was no pipeline behind it. There is now.

**Seven events, decided before the first row.** A lesson opened, a course page viewed, a
catalogue search, a plan viewed, checkout started, a lesson saved inside the app, a live class
entered. The list lives in `analytics_event_codes` with a description, a subject type and
whether the event names a learner — and `record_analytics_event()` refuses anything not on it.
That is not fussiness: an append-only store makes a wrongly captured event wrong forever, so
the vocabulary is closed *before* the first write rather than grown by accident afterwards.

**The store cannot be rewritten.** `analytics_events` is partitioned by month on `occurred_at`,
which is what makes a month droppable as a unit if a law ever asks. A trigger refuses every
delete and every update except one: nulling the two person references, from inside account
erasure, with the erasure setting switched on. That is the only rewrite the table accepts, and
a test pins all three halves of it.

**Erasure keeps the row and loses the name.** `erase_my_account()` now de-identifies analytics
in the same transaction: "learner X finished lesson 3" is a fact the platform recorded, not
words the person wrote, and deleting it would break every figure that counts completions. The
closed account becomes unreachable as a person and the count still says three.

**No anonymous traffic, on purpose.** A signed-out visitor records nothing — no cookie, no
generated identifier, no session. The honest consequence is written down rather than hidden:
this platform cannot answer "how many strangers visited", and it should not be able to.

**What is recorded where.** The server components record the page-shaped events (course viewed,
lesson opened against the *learner's* profile rather than the signed-in adult's, catalogue
search with its terms and result count); the client records the ones that are actions rather
than renders (checkout started, a lesson saved to the device, a live class entered). Every call
is fire-and-forget: instrumentation must never be able to break the page it is watching, so a
refused or dropped event resolves quietly while a *misspelt code* still raises in the database.

**Reading it.** `/admin/analytics` shows totals per event over a 7/30/90/365-day window, the
busiest event day by day, and the top catalogue search terms — the one report that reads a
payload, which is why the flag's precondition now says privacy review. The reading functions
are staff-only and aggregate; there is no screen anywhere that lists what one learner did.
`analytics_event_totals()`, `analytics_daily()` and `analytics_search_terms()` are the only
doors — the table itself is not readable by anybody, staff included.

**The flag stops being a deploy.** `delivery.analytics` moves from CODE to ADMIN. Capture ships
off: nine months of silence is not recoverable, but neither is a switch nobody asked for.

### The VIP shelf can finally be stocked, 2026-10-22

`plans.tier` arrived with offline downloads a day ago and nothing could set it:
`create_plan()` wrote a plan without a tier, so every plan on the platform — including the
one the owner would have created for the VIP package — shipped as Basic, and the feature
that only a Plus plan may carry could not be granted to anything. A column nobody can set
is a column that does not exist.

Three writers now exist, and one rule binds them:

- `create_plan()` takes a fourth argument, `p_tier`, defaulting to **basic**. The default is
  the point: a plan created without thinking about shelves is never accidentally the VIP
  one. The old three-argument function was dropped rather than kept alongside — a defaulted
  fourth parameter plus an existing three-parameter function makes every three-argument call
  `is not unique`, which is a failure that reads like a bug in the caller.
- `set_plan_tier()` moves a plan between shelves, audited, and returns `changed:false` when
  told to do what is already true. A **downgrade is refused while any version of the plan
  still carries a Plus-only feature**, because a Basic plan handing out a Plus benefit is
  the catalogue lying about itself.
- `add_plan_entitlement()` refuses `offline_downloads` on a Basic plan, with the sentence
  *"offline_downloads is a plus feature; move this plan to the plus shelf first"*. That is
  what makes the tier a gate rather than a label: before, the tier and the feature grant
  were two independent ways to hand out downloads, and a mismatch between them was silent.

`plan_feature_requires_tier()` is the closed list those rules read; a code not on it is
available on any tier, because an unknown code cannot accidentally be restricted to a shelf
nobody is on.

**And a grant had to become revocable.** A rule that blocks a downgrade is only sensible if
the thing blocking it can be removed, and nothing could remove an entitlement: a draft that
was given the wrong one had no route back except abandoning it and inventing a new code.
`remove_plan_entitlement()` fixes that, on draft versions only, audited. Seven new database
tests cover the shelf rules, including that the refusal has a way out.

The screens follow. `/admin/plans` has a shelf selector on create, a badge per plan, and a
"change shelf" form on every plan; each entitlement on a draft has a Remove button.
`/plans` sorts Basic above Plus and labels each card, with one sentence saying what the VIP
package is for: the course itself, plus watching it inside the app with no connection.

### Live classes are built, not bought, 2026-10-22

The owner's call: *"we build them, because I want the system more intact."* That turns four
open questions into four pieces of work, and this unit does all four.

**Scheduling.** `live_sessions` holds a course, a title, a host, a start and an end in UTC,
and — beside them — the zone the teacher typed the time in. "Tuesday at 19:00" belongs to the
person who set it; a learner in London is shown both hours, in that order.
`schedule_live_session()` is limited to the course author, refuses a class that ends before it
starts or runs beyond twelve hours, and validates the zone against `pg_timezone_names`
because a typo there prints every time wrong forever.

**The door.** A room is a capability, so a session row is *not* readable by every learner —
the read policy covers the host, the course author and staff only. A learner gets their
address one at a time from `join_live_session()`, which checks three things in order:
`can_access_learner()`, then an active enrolment in that course, then the clock. The window
opens fifteen minutes before and closes thirty minutes after, both stored per session rather
than fixed in code. A cancelled class is refused with the reason the teacher wrote, because
"why is this not happening" is the question a learner actually has.

**Recording.** Unchanged from the decision of 2026-10-20 and deliberately not reopened here:
**the teacher is recorded, learners never are.** The column for a recording reference exists
and there is no writer that could set it, which is the honest state of a feature whose
provider is not connected.

**Moderation.** Enforced server-side, not by hiding a button: you cannot schedule on a course
you do not teach, you cannot join a learner you are not responsible for, and the roll is
returned by `live_session_roster()` only to the host, the author or staff.

**What is not built, and is not faked:** the room itself. A live room is video, and video is
somebody's product. `delivery.live_room_base` is the setting that says who hosts it; it ships
empty, and while it is empty `join_live_session()` returns `no_room_host` with a sentence
rather than a URL that carries no class. Setting it turns the platform from a schedule into a
school — the door, the clock, the roll and the entitlement are all already here.

`delivery.live_classes` was a CODE-gated flag with three words behind it. It is now an ADMIN
flag whose preconditions are one URL, because a provider is an account and not a deploy.

### Tax and the transfer fee are charged where the buyer is, 2026-10-22

`orders` has had `tax_minor` and `fee_minor` since it was written and
`order_adjustments` has had `tax` and `fee` types the whole time. Nothing ever wrote
either, so every order this platform priced was taxed at zero and had its payment cost
absorbed. Both are now real, and the rule is the owner's: **the buyer pays, and the amount
follows where they are.**

`market_charges` is a register, not a formula in code — a row says "for this country, in
this currency, this kind of charge is this percentage plus this fixed amount, clamped
between these bounds, from this date". A rate is a fact about a jurisdiction and
jurisdictions change without telling the software, so the owner maintains it at
`/admin/tax` through `set_market_charge()` and `retire_market_charge()`, both limited to a
finance or platform admin and both audited.

**No rule means no charge.** That is the safe default rather than an oversight: a platform
registered for a tax nowhere must not invent a line on somebody's receipt, and a missing row
can never overcharge. When a registration exists, a row is added and the next order carries
it.

Precedence is the one prices already use, so there is one mental model rather than two: a
rule naming the buyer's country beats one that does not, a rule naming the currency beats
one that does not, and a later start beats an earlier one.

Tax is computed on the amount actually payable — items less live discounts and promotions —
because charging tax on a price the buyer did not pay is how a discount becomes a lie. The
transfer fee is computed on the amount being moved, goods plus tax, which is what a processor
charges a percentage of. Both are `tax`/`fee` adjustments, so `recompute_order_totals()`
already adds them and `describeOrderBreakdown()` already prints them.

The seam that makes this safe is `rule_id` on an adjustment. A row the system computed
records which rule produced it; such a row is recalculated whenever the payable amount
changes, refuses to be voided or edited by hand, and disappears when its rule stops applying.
A row without one is a human decision and the system never touches it. That distinction is
what lets a discount applied to an existing order re-derive the tax correctly — the trigger
does it once, in one place, rather than four writers each remembering.

A paid order is history: `refresh_order_charges()` refuses it, so the total a ledger row was
written against cannot move when a rate changes later. The checkout shows both lines before
the buyer pays, with the label the market uses — "VAT", "Mobile money fee" — and the quote is
refused if its parts do not add up to its total.

### A person can close their account, and the ledger does not go with it, 2026-10-22

The export answered "what do you hold about me". Nothing answered "take it away". D7 had
already written the shape in a column comment — *financial, governance and certificate
history is never deleted; personal fields are anonymised instead* — and this is that
sentence made runnable.

`erase_my_account(p_confirm)` is one definer function with the confirmation inside it, so a
second client cannot skip the guard. The confirmation is the display name: the one string a
person chose, shown above the field they type into, impossible to send with a mis-click. The
rule is one line — **what the person wrote is deleted; what the platform recorded is kept
and de-identified**:

- Deleted: lesson notes, bookmarks, saved courses, reviews, the words of discussion posts
  (the thread survives, because other people's replies are not theirs to erase), the text of
  assignment work, support messages they wrote, live sharing grants, invitations carrying
  their address, and guardian relationships naming them.
- Kept, with the name replaced by "Deleted learner": enrolments, progress, certificates —
  a certificate keeps its number and its course snapshot, because a third party may still be
  checking it, and it stops naming anybody.
- Kept untouched: orders, payments, refunds and audit events. An order that loses its payer
  cannot be refunded and a ledger with holes is not a ledger.

Two guards had to be widened for exactly this and nothing else. `protect_account_status`
refuses a self-service status change so a suspended person cannot reopen their own account;
it now accepts the one transition into `closed`, and only when `erase_my_account()` sets a
transaction-local flag. `protect_certificate_snapshot` freezes an issued certificate; it now
permits the one change from a name to the tombstone. Neither flag outlives the statement.

Children go with the last adult, not the first. A child belongs to the family, so if another
adult is still an active member the family and its children stay with them; when the account
being closed is the last adult, the children are tombstoned too. A teacher with a course in
review or published is refused, and so is a board member: both are the owner's to end, and
closing the account would strand work other people rely on.

Signing out is part of it — the route ends the session, because a closed account has nothing
left to show. **Not built, and named:** the sign-in identity itself. The address lives with
the auth provider, and deleting it there would cascade through `user_profiles.user_id` into
the ledger; that step is staff work through the provider, and the page says so.

### A streak is a memory, not a record, 2026-10-22

A child learning at home has nothing telling them they came back yesterday. The
encouragement that exists in every learning product — "four days in a row" — was absent,
and the obvious way to add it is the wrong one: a `streaks` table, a nightly job to roll
days over, a row per learner per day that can be lost, miscounted, or quietly disagree with
the progress it claims to summarise.

`learner_engagement()` derives all of it on read, from `lesson_progress.completed_at`. The
streak is consecutive **local** days ending today or yesterday — a day with nothing in it
does not break it until it becomes two, because a learner who finished a lesson at 23:50
and opens the app at 00:10 has not lapsed. The day boundary is the learner's
`user_profiles.timezone`, falling back to the reader's and then to UTC, each checked against
`pg_timezone_names` so a bad string cannot raise. The longest run, the lessons finished, the
courses completed and the certificates issued are counted in the same call, and **nothing is
written**: there is no table, no job, and no migration to run when a child's history changes.
Deleting progress removes the streak with it, which is the correct coupling and the one a
stored counter cannot offer.

Badges are thresholds over the same figures — first lesson, ten lessons, first course,
first certificate — each carrying the day it was **earned**, computed from the tenth
completion's own timestamp rather than from when somebody looked. They are a list decided
by the database, not a table of awards, so a badge cannot be granted to the wrong person or
survive the work it celebrates.

The strip is one component, rendered on `/learn` for the learner and on each child's card
at `/family` for a guardian, with the wording changed from "you" to the child's name —
a strip saying "you" on a child's card would be a lie about who did the work. Behind
`learning.streaks`, which ships off. Turning it off makes the strip disappear and changes
nothing else, because there is nothing stored to strand; and an unreadable reply renders
nothing rather than an empty box, the same rule the export and the receipt follow.

### A person can take their data out, 2026-10-22

`platform.data_export` existed as a flag with nothing behind it. The platform held a
name, a language, a time zone, the learners somebody is responsible for, what those
learners studied and finished, the certificates, the orders and receipts, the notes
written during lessons — and no way to ask for any of it back. That is a statutory right
in the markets this is sold into, and a parent has the same claim on a child's record.

`export_my_data()` returns one JSON document. It is `security definer` and takes **no
argument**, which is the whole design: inside it every `where` clause is the boundary,
so each one is written against the session's own user id and there is nothing a caller
could pass to point it at somebody else. The scopes are the ones the application already
uses rather than new ones — `is_learner_family_member()` for a child, and **not** for a
billing-only member, so paying for a family still does not hand over its learning data.

`/api/account/export` turns it into a download with a dated filename, and `/account`
offers it under "My data" with a sentence naming exactly what is inside. It is **not
behind a flag**: a right behind a switch that ships off is not a right. `platform.data_export`
stays in the register because it is a real promise about a different thing — a
machine-readable export in more than one format, and an import path.

**Not built, and named on purpose:** erasure. The export says what we hold; it does not
let anybody delete it. That needs one policy decision before it needs code — what survives
deletion — and the honest default is that financial records survive (they are the ledger)
while personal fields are stripped.
### A receipt has a number a person can read out loud, 2026-10-22

`/orders` could say "paid" and nothing more. There was no document and no reference, so a
parent asking their bank, their employer or their own memory of a transaction had a status
badge and a UUID — not something anyone reads down a phone.

`orders.order_number` is now assigned by the database: `AS-` and eight digits, unique, in
creation order, backfilled for every existing row. A trigger refuses to rewrite it, because
a receipt number that can change is not a receipt number — two documents could otherwise
claim the same order.

`/orders/[id]/receipt` is the document. Every figure is read from the order rather than
recomputed: subtotal, each discount with the code that caused it, the total, the payment
that cleared it and any refunds since. It is print-ready, so "save as PDF" is the browser's
job rather than ours. An unpaid order opens the same page and says plainly that it is **not
a receipt** — the same honesty the rest of the money path keeps about confirmation.

Two older tests failed on this change for an instructive reason: a direct insert into
`orders` was refused by RLS, and now it is refused earlier by the sequence the number comes
from. Both tests now supply a number explicitly, so what they assert is still the policy
rather than the side effect — the sequence is a second gate, not the only one.

**Not built:** the receipt is not emailed or attached anywhere, because there is no mail
provider; and it is not a tax invoice, which the document says.
### Search finds a subject and a teacher, and ranks what it finds, 2026-10-22

The catalogue has taken a `q` since the first version of the page, and it was thinner than
it looked: it matched `title` and `description` with `ilike`, in alphabetical order, and it
knew nothing about the two things a buyer most often types. A course **filed under Fiqh**
was unfindable unless the word also appeared in its blurb. A **teacher** could not be found
by name at all, even when they had a public profile and an audience.

`search_catalogue()` is now the single definition of a match: title (a title that starts
with the term wins outright), then subject names on the published version, then the
teacher's display name, then the description. Every word must match somewhere — a query is
an AND, so "fiqh marriage" does not return every course that mentions marriage. It uses
`strpos()` rather than `like`, so a `%` typed into the box is a character that matches
nothing rather than a pattern that matches everything.

The function is `security invoker`, so it sees only what the caller may already read. That
is the whole security story and it has one deliberate consequence: **a teacher is findable
by name only when their profile is published and public**, the same condition that gives
them a public page. Lifting that rule would have turned the search box into a way to
enumerate teachers who had not chosen to be listed. Suspended, retired and unpublished
courses are not searchable either, and each of those is a test.

It is **not behind a flag.** `platform.search` remains in the register as the promise it
was, but search is navigation: the catalogue already filtered before any flag existed, and
putting the index of the shelf behind a switch that ships off would hide the shelf. The
client sends a query to the function and an empty box to the ordinary listing, so clearing
the box browses rather than emptying the page.
### A learner profile has one writer, and its identity is not editable, 2026-10-22

The audit of 2026-10-20 recorded that `add_child_to_family()` was called by tests only,
while `web/src/lib/family.ts` inserted into `learner_profiles` directly. It was still
true, and it had a cost: `lp_insert` admitted any active family member, so a child added
through `/family` left **no audit row**, a billing manager could create a profile they
could not then read, and the owner-only rule lived in a function nobody called.

`20261243000100_child_profile_one_writer.sql` closes it the way the rest of this schema
is closed: `lp_insert` now admits staff only. A child is created by
`add_child_to_family()` and an adult by `claim_own_learner_profile()`; both are definer
functions, so neither needs a table-level insert policy. `addChild()` calls the writer,
maps its refusals, and sends no actor and no id.

The same file hardens **updating**. `lp_update` lets a family member edit the row, which
a rename needs — but it also allowed rewriting `learner_type`, `linked_user_id` and
`family_id`, so an owner could turn a child's profile into an adult profile attached to
an account of their choosing and hand that child's progress and certificates to somebody
else. A trigger now refuses those three columns for anybody but staff, and still allows a
display name or an age band to be corrected.

The tests say the new truth rather than the old one: the table takes no child insert from
anybody but staff, the owner still reads back what the writer created, a billing manager is
refused on both doors, and a rename is allowed while becoming a different person is not.
### An adult can become a learner, 2026-10-22

Found while closing the sharing unit: nothing in the application created an **adult
learner profile**. `/family` creates children, the checkout needs a learner to name, and
`/learn`, `/account/sharing`, reviews, progress and certificates all begin from a
profile — so a person who signed up met "there is nobody to buy this for yet" and a link
to a screen that can only add a child. The first step of every learner flow was missing.

`20261242000100_own_learner_profile.sql` adds `claim_own_learner_profile()`, and it is
the only way an adult profile is created. Three properties, each a decision:

- **Idempotent.** A second call returns the same profile with `created: false`, so a page
  may offer the button without first asking whether it is needed, and a double-click
  costs nothing. `learner_profiles_linked_user_key` means a second row could not exist
  anyway — but a unique violation is the wrong sentence for a double-click.
- **It does not undo moderation.** A profile that exists but is archived or soft-deleted
  is refused, not revived: that state was a decision, and a button on an account page is
  not the place to overturn it.
- **The name comes from the account.** `lp_display_name_not_blank` already guarantees a
  profile has a name, so the account's display name is the source rather than a field
  that asks the same question twice.

**Learn on this account** is one component, used on `/account`, on an empty `/learn`, on
the checkout that has nobody to sell to, and on `/family` where a family would be the
wrong answer. Seven database tests and three web tests.

### A code can be taken off an unpaid order, 2026-10-22

The last open item of the promotions chain. A code is redeemed at the moment the order
is made, which left a family who typed the wrong one with no way back: the order carried
the wrong total until it expired, and the code stayed spent on the campaign's per-family
limit — so the code they meant to use could not be used on the order they went on to
place.

`20261241000100_order_promotion_removal.sql` adds `remove_promotion_from_order()`. The
interesting decision is what removing means, because `promotion_redemptions` has been
**append-only since it existed**: it refuses every update and delete, and that refusal is
the reason the row can be trusted as a record of what was applied at checkout.

Nothing here relaxes it. Three columns were added — `voided_at`, `voided_by`,
`voided_reason` — with a CHECK that ties them into one fact, and the trigger was re-stated
to allow exactly one transition: a live row may be voided once, with a person and a
reason, and **every other column is still refused as before**, as is a second void and a
delete. A void is a new fact about the row, not an edit of it.

A voided redemption **does not count against a limit**. The three checks in
`promotion_quote()` and the "already been redeemed N times" check in
`set_promotion_limits()` now count live rows only, so taking a code off returns the slot
to the family rather than spending it.

The order page is where this lives: an unpaid order shows **Take the code off**, or a
code box if it has none, and neither appears once the order is paid. After that the
discount is part of what was charged and what the teacher's share was computed from; the
way to change it is a refund, which is a money decision with its own record, not a silent
re-price.

Six database tests and three web tests. **The promotions chain is now complete**: codes
are created, aimed, limited, listed, previewed and redeemed, and an unpaid order can gain
or lose one.
### A price can be checked before it is paid, 2026-10-22

The last piece of the promotions chain, and the one that was recorded as open when
the code was first redeemed: the buy page could show the list price, but not the price
*after* a code, because the only thing that knew what a code was worth was the order
itself. A family typed a code and learned the total at the payment screen.

`20261240000100_course_order_quote.sql` adds `quote_course_order()` — and, more
importantly, takes the two decisions it needs away from being made twice:

- `resolve_course_checkout()` is now **the only resolution** of learner, course
  version, market, price and payer account. `create_course_order()` was rebuilt on it,
  so the quotation and the order cannot price the same purchase differently.
- `promotion_quote()` is now **the only place a code is valued**. Every eligibility
  rule and the discount arithmetic moved out of `apply_promotion_to_order()` — which
  now calls it and writes the redemption, the adjustment, the totals and the audit
  row. A preview cannot disagree with the charge, because there is only one answer.

The quote **creates nothing**: no order, no billing account, no redemption, no audit
row about an order. That is tested, not asserted in prose — a first-time buyer with no
account asks the price and still has no account afterwards, and previewing a campaign
with one use left does not spend it. A preview takes no row lock either: holding one
for a question would let anybody freeze a campaign by typing its code.

On the buy page, **Check the price** shows the list price, what the code takes off and
what would be charged, and says plainly that nothing is held back by asking. Any edit
to the learner or the code clears the figure, because a total shown against a code that
has since changed is a wrong number that looks right.

Eight database tests and three web tests. What the quote deliberately does not do is
reserve: between the quote and the order a campaign can be switched off, a limit can be
taken, or the learner's access can arrive — and the order is refused then, with the same
sentence the preview would have given.

**Still open, deliberately:** taking a code off a pending order. `apply_promotion_to_order()`
exists for an order that already has one, but there is no screen that uses it and no
writer that removes one, so a family who types the wrong code has to start again.
### Sharing an address is an invitation, and both answers look the same, 2026-10-22

`/account/sharing` shared with an *account*: the form resolved an email address
through `resolve_share_grantee()` and said "no account has that email address" when
there was none. That sentence is a disclosure — anybody signed in could test an
address and learn whether it is registered here — and the alternative it replaced, a
button that appears to share and silently does nothing, is worse.

So sharing is now by **invitation**. `20261239000100_share_invitations.sql` adds
`share_invitations` and two functions. `invite_learning_share(email, scope, days)`
records an invitation whether or not the address has an account and returns
`{invitationId, expiresAt}` either way, so the reply has no branch to compare;
`accept_learning_share(token)` turns the token into an `adult_learning_shares` row.

Three properties make the token safe in an email. Only its **md5 is stored** — 122
random bits from `gen_random_uuid()`, so the hash protects against somebody reading
the table, not against guessing. It is **bound to the invited address**: a forwarded
message is not enough, `accept_learning_share()` compares the signed-in address and
refuses with "that invitation was sent to a different address". And it **expires and
works once**: 1–90 days, chosen on the form as a week, a month or three months, and
the same length carries into the share that accepting creates.

`resolve_share_grantee()` is **revoked for every signed-in caller**, not merely
unused. Closing the screen while leaving the side door open would have been a
disclosure with extra steps.

The message is written straight into `outbound_messages` rather than through
`queue_message()`, which is staff-only: an invitation is sent by the person sharing,
and opening that function to every signed-in caller would let anybody post arbitrary
mail through a named template. `invite_learning_share()` is itself the check — it
knows the sharer, the scope and the address — and it renders the same `invite_email`
template and writes the same row. Nothing is delivered while
`delivery.notifications` is off, and the panel says so rather than claiming an email.

`/share/invite/[token]` is the landing page. Accepting is a **button, not a page
load**, because mail scanners open links before people do; success lands on
`/account/sharing`, where the accepted share is listed with its terms. Ten database
tests cover the identical reply, the hash-only token, the address binding, the second
acceptance, expiry, the flag, and that an accepted invitation actually opens what it
named. The web contract has eleven tests of its own.

**Not built, and next:** the invitation is not delivered, because no mail provider
exists. Everything else about it works.
### A code is redeemed, once, at the moment the order is made, 2026-10-22

Promotions had writers and no way to use one. This is the redemption half — the
last piece of the six decisions from earlier the same day.

`20261238000100_promotion_redemption.sql` adds `apply_promotion_to_order()` and
re-creates `create_course_order()` with an optional code. The code is applied
**inside the order transaction**, so a mistyped or ineligible code creates no
order at all: no stray pending row, no family wondering whether they were
charged. The old three-argument signature is dropped, not left as an overload.

Six refusals, each a different sentence because each tells the family something
different: unknown code, not running (not active, or outside its window), a
country the campaign does not name, a course the campaign does not name, a
buyer who is not a new customer, and the three limits — total, per person, and
per family, the family being the billing account because one guardian buys for
several children.

Two money rules are deliberate. A **percentage rounds once**, in the currency
being charged, because it follows the local price and there is nothing to
convert. A **fixed amount must match the order's currency**, which the campaign
writer has already checked against each named market's price; the redemption
check is the second line of defence. And a code **cannot make an order free** —
the ledger refuses a zero capture, so "everything off" would hand the family an
order that can never settle. It is refused with a sentence that says to contact
us instead.

The discount is a `promotion` adjustment carrying the redemption id, so the
totals identity, the discount-sharing rule and the earnings split read it without
knowing promotions exist. `create_course_order()` now returns `discountMinor` and
`promotionCode` alongside the amount.

The buy form has an optional "Promotion code" field; the route passes it through
untouched and the writer decides its worth. Eleven database tests, two web tests
holding the sentences, and the checkout contract test that no discount is ever
sent from the browser.

**Not built yet, and next:** showing the discounted price *before* the handoff
(a preview needs a quote function that does not create an order), and taking a
code off an order. Neither blocks a purchase today because the code is applied
when the order is created.

### Each role lands in its own area, 2026-10-22

The last piece recorded by the role decision: a signed-in person should start in
the place their work happens, not on the page a visitor sees. `/dashboard` reads
the session once and redirects — the platform owner and governance staff to
`/admin`, a convened scholarly board to the reviewer register, a teacher to
`/teach`, a reviewer to `/review`, and a learner to `/learn`. Sign-in now defaults
to it when there is no `next`, and the footer links it as "Your area".

`homeFor()` in `web/src/lib/auth.ts` is the decision in one pure function, so the
order of the questions is tested rather than buried in a page: the widest
authority is asked first, because the owner is usually a teacher too and a
teacher is often a reviewer. A board member whose board is not convened is
deliberately **not** sent to the register — it would refuse them, `/admin` would
refuse them, and the client would bounce to the marketing page — so they fall
through to whatever else they are.

The masthead stays the same for everybody. A role-aware header means reading the
session in the layout, which makes every page dynamic to hide links that already
explain themselves; a landing page costs one redirect instead.

Five web tests.

### Every control is a screen, and a learner is a learner, 2026-10-22

The owner's rule, recorded in `DECISIONS.md` and written out person by person in
`docs/decisions/role-surfaces.md`: the people using this platform do not write
code, so anything routine has to be a field on a screen, and each role's power
ends where their work does.

**A leak closed.** `courses_insert` allowed any signed-in person to open a course
attributed to themselves, and `/teach` never asked for a role — so a learner's
account could open a shop. Teaching is an appointment (`teaching.applications`
ships off, the cohort is curated), so the policy now requires `instructor` or
`platform_admin`, and the teaching pages explain the area rather than offering a
form that cannot work. Writing an existing course is unchanged: `can_write_course`
still answers "the author or staff", because a teacher who loses the role still
owns what they wrote.

**Promotions got the screens they were missing.** `/admin/promotions` and
`/teach/promotions` create a campaign with form fields — code, name, percentage or
fixed amount, countries as checkboxes read from live prices, courses, the three
limits including per-family, and a window — then switch it on, pause it, archive
it and change its limits without a migration. `web/src/lib/promotions.ts` holds
the validation and turns the database's refusals into sentences; the database
still decides who may do what, so a teacher editing the request to name somebody
else's course is refused by SQL.

**A campaign owner can see their own usage.** The redemption read policy only
admitted the person who redeemed and staff, which made a per-family limit
invisible to the person who set it.

**Deliberately next, not sneaked in: a role landing page.** The masthead is still
the same for everybody, and a signed-in owner lands on `/` like a visitor. Making
the header role-aware means reading the session in the layout and making every
page dynamic to hide links that already explain themselves; a landing page that
sends each role to its own home is the better shape and is the next UI unit.

Measured: database suite **1219 passing**, web suite **803** (9 new), 119
migrations, 121 app routes.

### A promotion can be limited per family, and the limit can be changed, 2026-10-22

A promotion on family accounts may be capped at two per family or three,
depending on the offer. The grain is the billing account, not the person who
typed the code: one guardian buys for several children and one purchase covers
one learner, so a per-person limit would let a household use the same offer once
per child — which is the thing the cap exists to stop.

`20261236000100_promotion_family_limits.sql` adds `per_family_limit` beside the
two limits that already existed, nullable for "no limit", and
`set_promotion_limits()` to change all three afterwards. Edits are owner-only and
audited, and a total below the redemptions that have already happened is refused
with both numbers rather than silently ignored.

`promotion_redemptions.billing_account_id` is added now, before any redemption
writer exists, because the limit cannot be counted without it — counting
`redeemed_by` would answer a different question. It is indexed with the campaign,
which is the shape the redemption check will ask for.

Measured: database suite **1218 passing** (3 new), 118 migrations, 276 functions.

### A promotion knows whose it is and where it may be used, 2026-10-22

The owner's rule: they run promotions and sometimes teachers do; different
promotions run in different regions and countries; and prices already differ by
market because currencies and living costs differ. The last part was built in
`20261230000100` (`prices.market` is a country). This unit builds the first two
and the consequence of the third.

`20261235000100_promotion_ownership_and_markets.sql` adds `owner_type` and
`instructor_id` to `promotion_campaigns`, a `promotion_campaign_markets` table
(any number of countries, none meaning "everywhere the course is sold") and a
`promotion_campaign_courses` table. A "region" is several market rows; it needs
no new concept.

`create_promotion_campaign()` derives the owner from the actor instead of
accepting it: platform owner, or a teacher naming their own courses. An empty
course list is a platform-only privilege, and a teacher naming somebody else's
course is refused by name. A code is normalised to upper case, so `eid24` and
`EID24` are one code.

The third part is the interesting one. A **percentage** applies to the local
price — ten percent off is ten percent in Kampala and in Nairobi, and nothing is
converted. A **fixed amount** carries its own currency and may only name markets
whose live price for the course is in that currency: 5 000 shillings off aimed
at a shilling market is a gift, the same number aimed at a market priced in
dollars is a different one, and the refusal happens at creation rather than at
checkout where it would look to a family like a broken code. A market the course
has no live price in is refused for the same reason.

The direct write policies on `promotion_campaigns` were dropped. A validation
that one path honours and another skips is not a rule, so the writer is the only
way in and a staff member inserting a campaign by hand now meets RLS.

Measured: database suite **1215 passing** (9 new), 107 tables, 117 migrations.
**Redemption is next**: applying a code to a pending order (window, limits,
market and course match), writing the `promotion` adjustment and the redemption
snapshot, and deciding stacking — which is recorded as one code per order, the
one the buyer typed.

### One purchase, one learner, 2026-10-22

The grain changed on the day it was decided: the first answer covered "up to a
set number" of children, the second — with the three shapes and their costs on
the table — was **each learner separately**. Nothing had been built on the first
answer, so this is one change rather than a correction to something in use.

`20261234000100_course_purchase_learner.sql` adds `orders.learner_profile_id`,
re-creates `create_course_order(course_id, learner_profile_id, buyer_country)`
and teaches `record_payment_success()` to grant the named profile. Three things
move together, which is why they are one unit:

- **The order names the learner.** The payer is usually a guardian and the
  learner is usually a child, so inferring one from the other is how the wrong
  profile ends up with access. The writer refuses a learner who is neither the
  caller nor in a family they belong to (`checkout:learner_not_yours`), and
  refuses a request with no learner at all (`checkout:learner_required`).
- **The refusal is per learner and per version.** A sibling buying the same
  course is an ordinary purchase now; the same child buying it twice is still
  refused, and still before any account is written. A revoked grant, a
  subscription grant and another account all still pass, for the same reasons as
  before.
- **Fulfilment follows the order.** The account-wide walk survives only as the
  legacy path for orders written before the column existed — plan orders never
  reach the loop, and every new course order names a learner.

The buy screen now asks "who is this course for?" when the account has more than
one learner, and says "this purchase is for X" when it has one. The entitlement
redirect only fires when there is a single learner: with several, the picked
learner may already own the course while a sibling does not, and sending the
whole family to `/learn` would be the old grain leaking through the UI. The
`/api/checkout` route requires a learner for a course and answers a learner who
is not the payer's with 403 rather than 400, because the request was well formed.

Measured: database suite **1206 passing** (6 new), web suite **794** (2 new),
116 migrations, 273 functions, 118 app routes. `orders.learner_profile_id` is
nullable for the legacy rows, and the column comment says so.

### The platform writes down what it would send, and says so, 2026-10-22

Three things are waiting on an email/SMS provider: the invitation to an address
with no account, purchase receipts, and the correspondence that today is only
read in a dashboard. None of them can be finished by pretending a message left
the building, so this unit builds the half that does not need a vendor — the
record and the rendering.

`20261233000100_outbound_messages.sql` adds `message_templates` (the copy a
person reads about money and invitations, in the database so changing a sentence
is not a deploy) and `outbound_messages` (the record). `queue_message()` renders
a named template with the caller's values and refuses two things that would
otherwise reach a person: an unknown template, and a template with an unfilled
placeholder — a receipt that says `{{amount}}` is worse than no receipt. A
signed-in caller must be staff; the system path (a confirmed payment) calls with
no actor and is attributed to the platform rather than to a person.

Nothing sends. There is no provider, `delivery.notifications` stays off, and
every row is `queued`. The constraints are what keep that honest when a provider
arrives: a row cannot be `sent` without a provider and a time, cannot be `failed`
without a reason, and cannot be edited by a client at all — there is no write
policy, so rows enter through the function and only a dispatcher will change a
status.

`/admin/messages` is the reading surface, staff-only and read-only. It says on
its face that nothing has left the platform. That sentence is the point of the
unit: before it, the platform could not tell the difference between a message it
had queued and one it had sent, because it had neither.

Measured: database suite **1200 passing** (9 new), web suite **792**, 105 tables,
115 migrations, 273 functions, 118 app routes. `delivery.notifications` remains
off; the provider is still the first external blocker.

### A flag that the writer does not honour is decoration, 2026-10-22

`commerce.subscriptions` ships off and the storefront hides the plans, but
`create_plan_order()` never looked at it. So the flag described the UI and not the
platform: anybody who called the writer could open a subscription order for a
feature that was not on sale. This is the same failure the course path had
already fixed for `commerce.checkout`, and the fix is deliberately the same
shape.

`20261232000100_plan_checkout_gate.sql` re-creates the plan writer with the
guard, refusing `checkout:disabled` with the same key the course writer uses.
Re-created rather than patched because a plpgsql body cannot be altered in place;
the body below the guard is the function exactly as it stood. The plans page now
reads the flag before it reads the catalogue, so a visitor is not shown prices
the platform will refuse, and the web layer maps the key to
`checkout_disabled` with its own sentence rather than falling through to a 500.

Two suites had to be taught the default: `subscriptions.test.mjs` toggles the
flag around its `createOrder()` helper and puts it back in a `finally`, and
`offline_download.test.mjs` does the same around its one end-to-end plan
purchase. A new test calls the writer *without* the flag and asserts both the
refusal and that no order was created — the point of the unit is the state the
platform ships in, so that is the state the test meets.

Measured: database suite **1191 passing** (1184 → 1191 across this and the
credential unit), web suite **792**, 114 migrations, 272 functions.

### A credential is decided by the owner, or by the board the owner convenes, 2026-10-22

Verifying a reviewer's qualification was any governance admin's to do, so what
the platform could say was "a governance admin saw a document". The owner's
answer is that they are the final authorisation and decide whether a credential
passes; a scholarly board may decide later, while it is present and active; and
they accept its members and appoint or remove them.

`20261231000100_review_credential_authority.sql` re-creates three functions and
adds a fourth. `verify_reviewer_qualification()` now requires `platform_admin`,
or a `scholarly_panel_member` while `governance.scholar_board_active` is on — the
new control, shipped `false`. `set_reviewer_authorization()` refuses an active
authorisation unless a verified, unexpired qualification exists in that exact
subject, technical scope included. `is_authorised_reviewer()` checks the
qualification again, so a credential that expires or is rejected takes the
authorisation with it rather than leaving a grant standing on nothing.
`record_reviewer_qualification()` refuses a qualification with no subject, and
one naming a subject that does not exist.

The seventh non-flag control is a switch, and the trigger `ura_protect_scholar_board`
is the real lock: appointing or removing a `scholarly_panel_member` requires the
platform owner. Turning the board on therefore cannot create one, and staff cannot
manufacture an authority that decides in the owner's place. Governance staff keep
the rest of the register — checking the person, granting scopes, hearing
conflicts — and the screen says so in place of the buttons they no longer have.

Measured: database suite **1190 passing** (1190 = 1184 + 6 new; the three
reviewer suites were re-run and re-counted), web suite **791**, 113 migrations,
272 functions, 137 triggers, 95 settings, 7 controls. `reviewer_register.test.mjs`
went 31 → 38 tests; `group3.test.mjs` (27) and `review_requirements.test.mjs` (31)
had their `authorise()` helpers taught to record a verified qualification, because
an authorisation without one is now correctly refused.

### The price follows the buyer, not the request, 2026-10-22

`prices.market` had been a label since the table was created. The writer took a
price id from the caller and accepted any live one, and `resolveOffering()`
listed every market's price on the buy page — so a payer in Kampala could buy at
a price set for Nairobi, and the cheapest market was available to anybody who
could read a network response. Localised pricing was decorative.

`20261230000100_market_by_country.sql` makes the country decide, and takes the
price id away. `create_course_order(course_id, buyer_country)` resolves the price
through `resolve_course_price()`: an exact match on the buyer's country, then the
price that declares no market, then a refusal naming why. Within the band the
account's currency breaks a tie; a band naming two currencies with no preferred
one is refused, because picking one would be a coin toss on somebody's money. The
country comes from the billing account once recorded, and from the request's
address — resolved by the hosting layer, read by `web/src/lib/geo.ts` — only to
establish it on an account that has none. A later request from another network
does not re-price a family. Staff move a country through
`set_billing_country()`, with a written reason, audited.

The account now follows the price it just bought in rather than opening a second
account in the price's currency, which the old test pinned and is now flipped:
one person, one account, and a second account would have meant a second country
to get wrong. `course_price_for_me()` is the read path and calls the same
resolver, so the page cannot quote one price and the order charge another.

Two refusals are new and both are about the buyer rather than the course:
`checkout:no_price_for_country` and `checkout:price_ambiguous`, mapped to
`not_sold_here` in `web/src/lib/checkout.ts` and rendered as a sentence with
nothing charged. A sold course with no price here is deliberately **not** shown
as free — `can_enrol_in_version()` is market-agnostic, so "Free" would be a
promise the enrolment gate refuses a moment later.

Measured: database suite **1184 passing**, web suite **791**, 112 migrations,
271 functions, 69 suites, 117 app routes. The new suite is
`market_pricing.test.mjs` (15 tests); `course_order.test.mjs` was rewritten where
it asserted a price-id contract (24 tests).

**Recorded, not fixed here.** `create_plan_order()` still takes a posted price id,
so a plan price's market is still whatever the browser sent. It is no longer
reachable while `commerce.subscriptions` is off — that half was fixed in
`20261232000100`.
`resolveBillingAccount()` still hardcodes `UGX` for a new account on the plan
path. Whether a market should be a country at all is asked in the open decisions
above; if currency wins, the resolver changes and the web path does not.


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
