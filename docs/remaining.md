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

Each of these is the last thing between a finished feature and a screen somebody
can use. My recommendation is in bold; say "yes to all" and I build them in this
order.

### D1. Who may look at a file a child hands in, and what a teacher does with a worry

**Blocks** `learning.assignments`, `learning.cohorts`, and any reliance on the
coursework review register. Both machinery halves are built — the retention clock
and the recorded review — and `/admin/coursework` shows what nobody has looked at.
What is missing is a paragraph: who may open a child's file, and what a teacher
does when what they see worries them.

**Recommendation:** the marker and the owner; a concern is recorded on the file
with a sentence and goes to you the same day; the file is never forwarded, never
shown to another learner's family, and never copied out of the platform. Written
into the safeguarding policy as a new version, not an edit.

### D2. Do lessons carry transcripts?

**Blocks** the rest of `platform.search`, plus`learning.quran_sync`,
`learning.recitation` and the "transcripts are not part of it" limit on notes.

A lesson is a title, a description and media. **There is no body text anywhere in
the schema** — the words are inside a video, an audio file or a PDF. "Search
inside lessons" therefore means "search transcripts", which is a content
obligation, not an index.

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

### A2. Eight more stale preconditions — the same defect fixed twice today

Promotions, the storage quota and lesson search were corrected on 2026-11-02.
These still name work that shipped:

| Row | Says | Is |
|---|---|---|
| `platform.admin_settings` | "Must be built **first** — everything else depends on it" | `/admin/settings` exists, with audited controls |
| `learning.certificates.simple` | "Template chosen; certificate numbering scheme" | `certificate_number_seq`, `template_version`, and certificates have shipped for weeks |
| `learning.certificates.verification` | "Verification page deployed; token format fixed" | `/verify` and `/verify/[number]` are live; the token is the certificate number |
| `learning.provenance` | "needs a UI, not a schema" | `/api/teach/provenance` and the curriculum editor both exist |
| `learning.audience_sections` | "Learner switcher designed" | the switcher and the per-learner labels ship |
| `learning.age_bands` | "Bands chosen" | the five bands are a check constraint in the schema |
| `platform.data_export` | "GDPR right; cheaper to design than retrofit" | JSON, CSV and print all ship; what is left is import and PDF |
| `delivery.analytics` | "Decide who reads the report" | decided (staff) and built (`/admin/analytics`) |
| `learning.ai_support` | "Safeguarding policy; provider chosen" | the boundary is built and needs no provider — `FLAGS.md` says so, the register does not |
| `teaching.authoring` | "media upload limits" | 8 GiB per file and 50 GB per account, both enforced |

**Fix:** one migration, same shape as `20261281024000`, with a test that holds each
sentence to the code that proves it.

### A3. `ROADMAP.md` is quoting day-one numbers as current facts

It says **47 flags** (there are 93), **85 tables** (142), **121 endpoints**, and
"38 screens unblocked" — and its progress line still reads *11 done · 9 part · 16
todo · 13 blocked · 4 conflict*.

The four `[X] CONFLICT` rows are worse than stale: each records a conflict that was
**resolved** — open teacher applications, the scholarly panel, commissions, and
"launch in Uganda" versus worldwide. They still say "resolve before doing it",
which invites a future session to reopen decisions that are closed.

**Fix:** recount the numbers, mark the four conflicts as resolved with the decision
date, and re-derive the progress line.

### A4. The screen count disagrees with the tree

`SCREENS.md` quotes **121 page routes** from a production build. There are **128**
`page.tsx` files on disk, and the difference has never been explained — it may be
route groups, it may be three new screens, it may be a stale measurement.

**Fix:** re-measure from the build output and state the number the build emits, or
say which files are not routes and why.

### A5. The register has never been read end to end in one pass

Everything above was found by reading rows against code. Nothing in CI does that —
the existing test proves `FLAGS.md` and `platform_settings` *agree with each other*,
which is why two rows can agree and both be wrong.

**Fix:** a test that fails when a precondition names a path or function that does
not exist. That is the mechanical version of what I did by hand today, and it is
the only thing that stops this drifting again.

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

- **Eight decisions** unblock code that is already written (D1–D8). Every one has a
  recommendation above, and any of them is small once answered.
- **Five decisions** shape the product rather than the code (D9–D13), and D9 —
  first release scope — is the one that makes the other twelve finite.
- **Five adjustments** I can make without asking anything (A1–A5), and two of them
  are the same defect I fixed twice today: a sentence in the register that outlived
  the reason for it.
- **Nine accounts and licences** are the only genuinely external blockers.

Nothing in Parts 3 and 4 needs you. Part 1 needs one word each. Part 2 needs an
afternoon.
