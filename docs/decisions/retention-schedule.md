# Retention and Deletion Schedule

**Status:** adopted 2026-10-15 as decision D7. Three periods were settled by the
owner on 2026-10-22 and are executed by code as of 2026-11-01, along with the
deletion of a closed account's sign-in at the authentication provider; the rest of
this table is still a design. Read *what is enforced today* at the end before
quoting any row of it as a promise.

Periods marked **(confirm)** depend on the operating jurisdiction and must be
verified before launch. This is the single fact in D7 that cannot be decided
from the design.

**Rule:** soft delete by default. Hard delete only where law requires it.
Financial, governance, grading, publication and certificate history is **never
deleted** — the personal fields are anonymised instead.

---

## Categories, shortest first

| Data | Retention | Deletion behaviour |
|---|---|---|
| Guardian verification evidence | Delete on decision | Hard delete once verified or rejected, unless disputed. Never keep "just in case". |
| Failed sign-in and OTP logs | 30 days | Hard delete |
| Session and refresh tokens | On revocation or expiry | Hard delete |
| Child learner data | Settled 2026-10-22: **30 days after the guardian's account closes** | Deleted, except a certificate number that has to keep verifying. Enforced. Never sold or shared. |
| A file a learner hands in (coursework) | Settled 2026-11-01: **a year after the later of the class ending and the hand-in**, or thirty days after an erased learning record where that is sooner | Tombstoned at once when its submission goes: unwatchable by everybody, including staff. The object is deleted from storage on that date and the deletion is recorded. Enforced. |
| Discussion and Q&A posts | Life of the lesson | Soft delete; author may delete their own |
| Learner profiles and progress | Until deletion request | Anonymise on request; retain aggregate, non-identifying statistics |
| Course content and versions | Indefinite while published | Unpublishing is soft delete; masters retained per D8 |
| Governance and review decisions | Indefinite | Never deleted. Anonymise reviewer identity only where legally required |
| Certificates | Indefinite | Never deleted. A certificate must remain verifiable forever |
| Financial transactions | Statutory minimum **(confirm)** | Never deleted before the statutory period ends |
| Refunds and disputes | Statutory minimum + dispute window **(confirm)** | Never deleted |
| Audit log | Long, immutable **(confirm)** | Never user-editable through application paths |
| Backups | Rolling window **(confirm)** | Must respect deletion requests — a deletion is incomplete if it lives on in backups indefinitely |
| Support cases | **Three years after the case closes** | Deleted with their messages. Enforced. |
| Safeguarding and screening records | **Seven years** after the later of the check and the subject's eighteenth birthday | Deleted. Enforced — and never earlier, by anybody. |

## Mechanism

- `deleted_at` on user-facing tables; queries exclude soft-deleted rows by default
- Anonymisation replaces personal fields with non-reversible placeholders while
  preserving the record's referential integrity
- Deletion requests are logged with actor, timestamp and scope
- Backup retention must be short enough that a deletion request becomes fully
  effective within a documented window

## Open, and blocking nothing yet

- Statutory financial retention period — depends on jurisdiction
- Child data retention period — depends on jurisdiction and on whether COPPA applies
- Audit log retention — depends on jurisdiction
- Backup rotation window

These are facts to obtain, not choices to make. None of them blocks Group 1.

---

## What is enforced today (2026-11-01)

A retention period that exists only in prose is a promise with no clock, and this
document was the prose. Two rows of the table above are now executed by
`public.run_retention_jobs()` (`20261281004700_retention_clock.sql`):

| Clock | Starts | Goes | Where it is decided |
|---|---|---|---|
| A support case | the moment it is closed | three years later, with its messages | `retention_due_records`, computed from `closed_at` |
| A screening record | the later of the check and the subject's eighteenth birthday | seven years later | `teacher_screenings.retention_until`, set by the writer |
| A child's learning record | the moment the guardian's account closed | thirty days later | `retention_due_records`, from `learner_profiles.deleted_at` |
| A handed-in file | the later of the class ending and the hand-in, or the erasure of the learner's record | a year later, or thirty days after the erasure — whichever is sooner | `coursework_file_retention` |

`retention_plan()` answers *what is due, what is next, and what has no clock*;
`/admin/retention` shows it and presses it; `POST /api/cron/retention` runs it
unattended. Every run is audited with counts and no names, and writes nothing
when it deleted nothing.

**What the child clock deletes, and what it keeps.** Deleted: enrolments, lesson
progress, submissions, assessment attempts and responses, attendance, memorisation
passages, cohort memberships, offline devices, child logins, access checks,
shares, invitations, entitlements, guardian links, plan allocations and
sponsorship applications. De-identified: an order keeps its money facts and loses
the learner it was for; a support case keeps the conversation and loses the child
it was about. Kept: the certificate, with its number and its snapshot, and the
audit trail. What is left of the child is a row holding an id, a type, a status
and dates, because a certificate points at it.

**The fourth clock, and the half of it this database cannot perform.** A file a
learner hands in is kept a year after the later of the class ending and the hand-in;
an erased learning record shortens that to thirty days after the erasure, because a
photograph is part of the record the children's policy already promises to delete.
A file that loses its submission is tombstoned at once by a trigger — the same
moment the database stops being able to say whose file it was — and
`may_watch_master()` refuses a tombstoned asset to everybody, staff included.

What the clock cannot do is delete the object. There are no storage credentials in
any environment, so `purge_coursework_files()` sets `purge_due_at`, the plan counts
what is waiting, `coursework_bytes_awaiting()` names the bucket and key, and
`record_coursework_purge()` records the deletion **and refuses while the file is
still readable**. A tombstone therefore means "unwatchable", never "gone", and the
screen says which of the two it is.

**The sign-in, which this database does not hold.** Closing an account scrubs
every table here and leaves the row in `auth.users`, because that row *is* the
identity: it lives at the authentication provider and `erase_my_account()` cannot
delete it. For three units that was a sentence in a document, which meant a closed
account could still sign in. It is now a ledger and a queue
(`20261281004900_identity_erasure.sql`):

- `erased_identities` holds one row per closed account — a **SHA-256 fingerprint**
  of the normalised sign-in address, when the account closed, and when (and by
  whom) the identity was recorded as deleted. The fingerprint is what lets
  `identity_lookup()` answer *was my account erased?* after the address itself is
  gone. It is a fingerprint and not a deletion: somebody holding a candidate
  address can test it, and the column comment says so rather than letting the word
  "erased" imply more.
- `identity_removal_queue()` is the queue: every closed account whose identity is
  still at the provider, plus the two states that should not exist — an active
  account with no identity, and a closed one the provider still holds while the
  ledger says otherwise. `/admin/retention` shows it.
- `record_identity_removal()` records the staff step and **refuses while the
  identity is still there**. "Recorded" drifting from "done" is how the gap
  survived; the function asks `auth.users` before it writes.
- The deletion itself is **not automated**. It needs the service-role key, which
  bypasses every policy in this schema. The ordered manual step is in
  `docs/deploy/README.md` §9.

**Three things this does not cover, stated here so no row above is read as
enforced when it is not:**

1. **An adult's own learning record.** `/account/delete` tells an adult their
   enrolments and progress are kept, and that sentence has been on the screen
   since it was written. Whether it should change is the owner's decision.
2. **A support case nobody closes.** The clock starts at closure, so an open case
   is kept forever by default. `/admin/retention` reports the count and the age
   of the oldest rather than pretending they are covered. Closing a case is a
   human act and nothing closes one automatically.
3. **Backups, and provider-side OTP and session logs.** The sign-in address is
   now recorded and queued (above), but the database still cannot delete what it
   does not hold: a backup taken before a deletion carries the old row, and the
   provider's own sign-in and session logs are outside every policy here.
4. **A child profile left behind by an account merge.** Its record was moved to
   the surviving profile and the row that remains is a pointer, so there is
   nothing to delete and no policy sets a date for it. `retention_plan()` reports
   the count rather than deleting it.

Soft delete remains the default for everything else, and the ledger categories
(financial, governance, grading, publication, certificate history) are never
deleted at all: the personal fields are anonymised instead.
