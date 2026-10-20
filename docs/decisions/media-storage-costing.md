# Where the Media Masters Live — Costed

**Status: DECIDED 2026-10-20 — Cloudflare R2, for masters and delivery.** The
recommendation in §5 was accepted by the owner the day after it was written.
This document settles the *provider* question inside decision **D8**
(`DECISIONS.md`), whose principle — originals in object storage you control,
never in the delivery provider — was adopted on 2026-10-15.

Kept in full rather than filed, because §2 is the model to re-run: the two
numbers most likely to be wrong are hours per course and watch time per active
user, and the byte path is not built yet.

**One thing has changed since the recommendation was written.** The owner added
a requirement while accepting it: saved lessons must stay available for students
to review and for other teachers to see. §5 item 3 declined Stream, and that
stands for recorded lessons — R2 serves them permanently and far more cheaply.
But *live* classes that are streamed and then saved are the one workload where
Stream earns its price, because self-hosting a media server is not a weekend.
See §7.

**Method:** every price below was read off the provider's own pricing page on
2026-10-19 and is quoted with its date. The usage model is stated in full so the
arithmetic can be checked and re-run when the assumptions prove wrong. Nothing
here is a quote from a sales conversation.

---

## 1. The four price cards, verified

| Provider | Storage | Egress to the internet | Requests | Free tier |
|---|---|---|---|---|
| **Cloudflare R2** | $0.015 / GB-month (Standard); $0.010 / GB-month (Infrequent Access, + $0.01/GB retrieval, 30-day minimum) | **$0, uncapped** | Class A (write/list) $4.50/M; Class B (read) $0.36/M; deletes free | 10 GB-month, 1M Class A, 10M Class B, monthly |
| **Supabase Storage** | $0.0213 / GB-month above the plan quota | $0.09 / GB above 250 GB; $0.03 / GB cached above 250 GB | Counted as database requests, not separately metered | Pro $25/mo includes 100 GB storage + 250 GB egress |
| **Backblaze B2** | $6.95 / TB-month ($0.00695 / GB), raised from $6.00 on 2026-05-01 | Free up to 3× average monthly storage, then $0.01 / GB; **free and unlimited to Cloudflare, Fastly and bunny.net** | Class A/B/C free since 2026-05-01; Class D first 2,500/day free then $0.004 per 10,000 | 10 GB |
| **Cloudflare Stream** | $5 per 1,000 minutes stored | $1 per 1,000 minutes delivered (encoding and ingest free; no separate egress line) | Not metered | **None.** $5/month minimum |

Sources: `developers.cloudflare.com/r2/pricing` (updated 2026-10-01),
`supabase.com/docs/guides/storage/pricing` and `supabase.com/pricing`
(2026-10-19), `backblaze.com/cloud-storage/pricing` (2026),
`cloudflare.com/developer-platform/products/stream` (2026).

Stream's caps, which are not pricing but decide the design: **H.264 only,
1080p maximum, and the original upload cannot be downloaded back.** That last
one is why D8 says the delivery provider is never the archive.

---

## 2. The usage model

Assumptions, all of them falsifiable and all of them written down so a wrong one
can be found later:

| Assumption | Value | Why |
|---|---|---|
| Courses at each tier | 3 / 15 / 150 | One teacher with an audience, then the marketplace filling in |
| Video hours per course | 3.3 h (20 lessons × 10 min) | Matches the lesson shape already in `lessons` |
| GB stored per video hour | 8.6 GB | 1080p master at ~8 Mbps ≈ 3.6 GB/h, plus adaptive renditions (1080/720/480/360 + audio) ≈ 5.0 GB/h |
| Monthly active ratio | 40% | Deliberately low; a paid course beats a free one |
| Watch time per active user | 2 h/month | Two lessons a week is a good month |
| GB delivered per watched hour | 1.1 GB | Learners average 720p on mobile data |
| Class B requests per watched hour | 600 | HLS at 6-second segments |
| Learner submissions | 0 / 5 / 250 GB new per month | 20% of users submit, 5 files at ~5 MB; 12-month retention per `docs/decisions/retention-schedule.md` |

Derived load:

| | 100 users | 1,000 users | 50,000 users |
|---|---|---|---|
| Stored, video | 85 GB | 426 GB | 4,257 GB |
| Stored, submissions | — | 60 GB | 3,000 GB |
| **Stored, total** | **85 GB** | **486 GB** | **7.09 TB** |
| Hours watched / month | 80 | 800 | 40,000 |
| **Delivered / month** | **88 GB** | **880 GB** | **42.97 TB** |
| Class B requests / month | 48,000 | 480,000 | 24,000,000 |

---

## 3. What each option costs per month

| Option | 100 users | 1,000 users | 50,000 users |
|---|---|---|---|
| **Supabase Storage** (masters + delivery) | $0.00 | $64.92 | **$4,089.94** |
| **Cloudflare R2** (masters + delivery) | $1.13 | $7.14 | **$113.75** |
| **Backblaze B2**, direct egress | $0.52 | $3.31 | $272.66 |
| **Backblaze B2 + Cloudflare CDN** | $0.52 | $3.31 | $50.37 |
| **Cloudflare Stream** for delivery, masters elsewhere | $7.77 | $62.85 | $2,548.50 |

Supabase figures are *incremental* — the $25 Pro plan is already being paid for
the database. Stream figures are delivery only; masters still cost R2 or B2
storage on top, and Stream keeps its own copies, so you pay to store the same
video twice.

At 100 users every option is a rounding error, which is exactly why the choice
has to be made on the 50,000-user column and on the fine print, not on the
starting price.

---

## 4. Three findings that are not in the price tables

**4.1 — Supabase Storage charges $0.09 per GB of egress, and video is almost
entirely egress.** It is the cheapest option at 100 users (the 100 GB and
250 GB quotas swallow the whole workload) and the most expensive by a factor of
36 at 50,000. It is a good place to keep profile pictures and receipts. It is a
bad place to keep 43 TB of monthly video delivery.

**4.2 — B2's free egress to Cloudflare is real but cannot be used here.**
Cloudflare's Service-Specific Terms still carry the restriction that was
formerly §2.8: on Free, Pro and Business plans, serving video or a
disproportionate amount of large files through the CDN is prohibited *unless the
content is hosted by a Cloudflare service such as Stream, Images or R2*. B2 is
not a Cloudflare service, so the B2-plus-Cloudflare trick that makes the
50,000-user row $50.37 is a terms-of-service violation on exactly the plans a
solo builder uses — and Cloudflare's stated remedy is to redirect the content.
Serve B2 through a grey-clouded (non-proxied) hostname and the CDN is out of the
picture, which brings back B2's own egress at $0.01/GB beyond 3× storage:
$272.66 at 50,000 users, still respectable, but no longer the cheapest.

R2 is the only one of the three where free video egress is *also* permitted
through Cloudflare's CDN, because the content is inside Cloudflare. That is not
a pricing argument, and it is the strongest thing in this document.

**4.3 — Learner submissions rival the course library.** At 50,000 users the
model puts 3.0 TB of submitted files against 4.3 TB of course video. The
material that children send is the material with the shortest defensible
retention period and the highest safeguarding cost, and it is the same order of
magnitude as everything the teachers ever recorded. Retention is a cost lever,
not only a legal one — and it is already flagged as an open decision in
`ROADMAP.md` row 27.

---

## 5. Recommendation

**1. Masters and delivery both in Cloudflare R2, served from a bucket you
control.** $1.13 / $7.14 / $113.75 a month at the three tiers, zero egress, and
the free-egress-through-CDN path is permitted rather than tolerated. At
50,000 users it is 36× cheaper than Supabase Storage and 22× cheaper than
Stream.

**2. Do not use Supabase Storage for video.** Keep it for the small, hot,
already-in-the-database things: avatars, receipts, exported reports. Its 100 GB
quota covers those for free. Mixing the two means the expensive workload never
touches the $0.09 egress line.

**3. Do not buy Cloudflare Stream.** It is the most convenient option — it
transcodes, it hosts the player, it signs the URLs — and at 1,000 users the
convenience costs $62.85 against $7.14. At 50,000 it costs $2,548.50. It also
cannot return your original upload, caps you at 1080p H.264, and stores a second
copy of everything you already paid to store. The one case that would change
this answer is DRM: if the owner decides premium courses need hardware DRM,
Stream (or a comparable video platform) becomes the cheap option, because
building DRM yourself is not a weekend.

**4. Take on transcoding deliberately, because it is the real cost of #1.** R2
stores bytes; it does not make renditions. Self-hosted delivery means an ffmpeg
worker, a thumbnail pass, a segmenting pass and signed-URL expiry logic — a
week or two of work and a compute bill that this document does not price
because it depends on a worker that does not exist yet. That is the honest trade:
**$2,500 a month at scale versus two weeks of engineering now**, and the
engineering is reusable, while the Stream bill is not.

**5. Provision it as three buckets, not one:** `media-masters` (write-once,
never served to learners), `media-renditions` (the only bucket a learner's
player ever touches) and `submissions` (the shortest retention, the strictest
policy, its own lifecycle rules). Splitting masters from renditions is what
makes "you can always re-derive the delivery copies from the master" true rather
than hoped.

**6. Re-run this table before launch, not after.** The two numbers most likely
to be wrong are hours per course (3.3) and watch time per active user (2 h).
Doubling watch time doubles delivered volume, and it changes nothing about the
ranking — R2 has no egress line to cross. That robustness to being wrong is the
reason to choose it.

---

## 6. What is already built, and what is not

More of this exists than the D8 status line suggests, and the research changes
less code than expected.

**Already in the schema.** `media_assets`
(`supabase/migrations/20261016000100_media_assets.sql`) is a complete register:
`storage_backend`, `master_bucket`, `master_key`, a 64-hex `checksum`
constraint, mime, byte size, duration, technical metadata and a
`pending / available / quarantined / deleted` state machine.
`register_media_upload()` (`20261107000100_media_asset_writer.sql:102`) opens
the row and derives both the key and the bucket rather than trusting the caller;
`confirm_media_upload()`, `quarantine_media_upload()` and `delete_media_asset()`
are the only paths that move status, after the writer migration closed an UPDATE
policy that let an uploader mark its own bytes `available`.

**Two facts in that code shape the recommendation.**

- `register_media_upload(p_storage_backend text default 'r2')` — **R2 is already
  the default**, and the bucket CASE at line 159 already resolves it to
  `ayahspring-masters`. Choosing R2 is not a migration; it is agreeing with the
  code that shipped.
- The permitted backends are `('r2', 'supabase', 's3', 'local')`. **`b2` is not
  one of them.** Choosing Backblaze would mean widening two check constraints,
  extending the bucket CASE, and adding a credential path that does not exist —
  to arrive at the option §4.2 says cannot legally use the free egress that made
  it attractive.

**Not built, in the order it would be done.**

1. Signed direct-to-R2 upload, so bytes never transit the web server, with the
   checksum verified against the object that actually arrived —
   `confirm_media_upload()` already refuses to trust an unverified row.
2. Transcode worker and its queue. This is the real cost of recommendation #1
   and the largest single piece of work in the list.
3. Signed playback with expiry tied to enrolment, so a URL cannot outlive the
   lesson it belongs to.
4. A renditions bucket separate from `ayahspring-masters`, per §5 item 5.
5. Retention and lifecycle rules for the submissions bucket, wired to
   `docs/decisions/retention-schedule.md`.
6. The safeguarding review of files children send — the precondition both
   `learning.assignments` and `learning.cohorts` are still held on.

Nothing in this list is started, and no screen claims otherwise.

---

## 7. Added after the decision: saved lessons

Recorded here because it is a cost and architecture question, and because it
arrived as part of accepting §5 rather than after it.

**The requirement.** Lessons must remain available so students can review them,
and so other teachers can see them.

**For recorded lessons this changes nothing, and costs nothing extra.** A master
in R2 is permanent by design — that is the whole point of D8, and the reason
Stream was rejected as an archive. A signed playback URL is minted per request,
so "still available next year" is a property of the stored object, not of a link
that expires. Storage for the library was already priced in §3: 426 GB at 1,000
users, 4.3 TB at 50,000. Re-watching does not add stored bytes; it adds
delivered ones, and R2 does not charge for delivery. The 2 h/month per active
user in §2 already assumes re-watching.

**What is genuinely new is the access rule — settled 2026-10-20 as the second of
these three readings.** Kept because the other two were live options and the
reason for rejecting them is the useful part:

| Reading | Who sees the lesson | Consequence |
|---|---|---|
| Co-teachers of the same course | People already trusted with that course | Small. Extends an existing authorisation check |
| Reviewers checking quality | A named reviewer, for a named period | Medium. Peer review (P6) already exists and is dormant; this wakes it |
| Any teacher on the platform | Everyone with a teacher account | Large. Makes a paid course's content readable by its competitors |

**Chosen: a reviewer checking quality, for a named period.** That wakes the
dormant peer-review path (P6) instead of opening a shared library, which is why
the third reading never has to be made safe with a per-lesson licence — a paid
course's content is not readable by its competitors at all. What is left is code:
a read path scoped to an assigned review, so access ends with the review rather
than with a memory of who was trusted.

**Live classes are the case that reopens Stream.** If "stream with an option of
saving" means a class taught live and recorded for later review, then:

- Self-hosted means a media server (SFU) plus recording plus transcode — the
  largest single piece of engineering in §6, and the only part with real
  operational risk for one person.
- Cloudflare Stream Live does ingest, recording, transcoding and delivery for
  the same rates as on-demand: $5 per 1,000 minutes stored, $1 per 1,000
  minutes delivered, no free tier, $5/month minimum.
- Costed on the §2 model, if a tenth of cohort classes were taught live and
  saved at 50,000 users — say 4,000 live hours a month, recorded — that is
  240,000 minutes stored once ($1,200, permanent) and whatever the cohort
  watches back. Meaningful, but it is the workload Stream was built for, and
  the masters would still go to R2 so the archive rule holds either way.

**A recording of a class containing children is a safeguarding question before
it is a storage question.** `docs/decisions/retention-schedule.md` gives child
learner data the shortest retention period in the system, and a saved class
video captures children's faces, voices and mistakes together in one file that
is far harder to withdraw than a progress row.

**Decided 2026-10-20: teacher-only capture.** Learners' video and audio are
never recorded, so a child can take part in a live class without appearing in a
file that outlives it. This is the strongest of the three options available —
guardian consent, teacher-only capture, or no recording at all — and it takes the
question off the critical path rather than managing it: nothing captured, nothing
to withdraw, no consent to track and no retention clock to run on a child's face.
It costs the recording some of its teaching value, since a reviewer or an absent
student hears the teacher and not the class; that is an accepted trade.

What is left is code and it is not small: no live-class tables exist, so this is
design plus schema rather than wiring. Live capture is also the one workload here
that would genuinely reopen the Stream decision in §5, because self-hosting a
media server is the largest piece of engineering left in the project.
