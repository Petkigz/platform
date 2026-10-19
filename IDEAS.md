# IDEAS

Everything goes here. Unsorted, half-formed, no judgement. Nothing is lost.
Nothing here has to be dealt with today. When an idea gets decided, it moves to
DECISIONS.md and leaves a one-line trace here.

Status key:
- `IN PLAN`    — already designed in the project record
- `PARTLY`     — mentioned but not designed
- `MISSING`    — not in the plan at all
- `DISCARDED`  — considered and rejected (reason given)

---

## From the Uganda cost conversation

### Shared cross-platform mobile codebase — `IN PLAN`
One codebase for Android + iOS rather than three separate apps.
Already decided: `Expo/React Native`. Keep as is.

### Mobile money first, not cards — `PARTLY`
MTN MoMo and Airtel Money are listed as payment methods, but
`payment_provider_status: Open` and no provider adapter is designed.
**Improvement:** the record already fits this flow by accident — the payment
attempt state `requires_action` *is* "waiting for the student to enter their
PIN on their phone". So the shape is right; only the provider decision and the
adapter are missing. Build the `PaymentProvider` boundary with no implementation
until a provider is chosen — see `FLAGS.md` (`commerce.checkout`).

### Flow: buy → phone number → MoMo prompt → PIN → unlocked — `PARTLY`
Good flow, correct for the market. Not written down anywhere in the plan.
**Improvement:** make it a recorded acceptance test, not prose. "A duplicate
callback for the same payment attempt does not grant access twice."

### Use an existing open-source LMS as the foundation — `MISSING` → `DISCARDED`
Never decided either way; zero mentions in the plan. It kept resurfacing, so it
needs a recorded answer.
**Recommendation: reject.** Moodle/Open edX are PHP monoliths that are very hard
to make simple, and every differentiator here — child profiles living under a
parent's account, per-lesson questions, Islamic curriculum structure, phone-OTP
sign-in, "as easy as possible" — means fighting the platform. For one person
with AI tooling, Next.js + Supabase is a smaller thing to hold in your head than
a Moodle theme plus a plugin stack. Record it so it stops coming back.

### Stage-gate the build: validate before building the platform — `DISCARDED`
**Rejected 2026-10-15.** The decision is to build the full architecture to
completion with features shipped disabled and enabled later from the admin
dashboard, rather than shipping a small first version.
The one part worth keeping from this idea: **something has to define "done."**
With build-everything there is no natural finish line, so `FLAGS.md` acts as
the boundary — once every feature has a flag, nothing new creeps in without a
decision.

### Ship web before mobile apps — `PARTLY`
Reframed: not a phase, a **release order**. The architecture covers both, but
the mobile build should not be what first meets users. Apps cost $99/year,
store review cycles and rebuild time for every small change, while web can be
fixed in minutes.
**Improvement:** "web first" does not mean desktop. Most first users will be on
a low-end Android phone over a metered connection, so responsive has to mean
genuinely good on a small screen on a slow connection. That is a real design
constraint, not a styling detail.

### Start with a narrow audience, not "a platform for everyone" — `PARTLY`
Right principle, wrong examples. The plan says `Global-first`, and audiences
are just `young_learners` and `adult_learners` — generic.
**Improvement:** narrow by **teacher and subject**, not by country. The examples
given (Ugandan secondary students, UNEB practice, vocational) are not your
subject. Your wedge is the two or three subjects you and your teacher friends
already teach, offered first to the people who already follow you. Worldwide is
the destination; your own circle is the first cohort.

### Basic teacher dashboard first, full version later — `MISSING`
Worse than missing: **0 of 121 endpoints** mention instructor or teacher.
Teachers you know want to teach on this and currently have no way in.
This is the biggest gap in the plan.

### Defer live classes, AI tutor, advanced analytics, offline, marketplace — `IN PLAN`
Already correctly deferred to `future_features` / Phase 14. Matches your own
reason for the platform: on-demand beats waiting for a live lesson. No change.

### Certificates: simple now, verification behind a flag — `PARTLY` (disagree with the source)
Certificates are already in v1 in the plan: one `certificates` table, three
endpoints including public verification.
**Improvement — split it rather than defer it:** a simple completion
certificate is cheap, already designed, and a strong motivator, especially for
children. Public verification tokens and revocation come later. Deferring the
whole thing throws away a cheap win; building all of it now over-builds.

### Price in local currency at a local price point — `MISSING`
`ugx: 0` in the plan; reporting currency is USD. The multi-currency machinery
is well designed, but no actual price points exist.
**Improvement:** only matters once `commerce.checkout` can be switched on.
Until then it is a question, not a task.

### UGX agency cost estimates (15M–30M, 2M–5M, 8M–20M) — `DISCARDED`
These are the price of hiring Ugandan developers. You are building it yourself
with AI tooling at near-zero cost, so they don't apply. Keep only the *shape* of
the advice — small first version, grow later — and drop every number.

### Ugandan secondary-school / vocational examples — `DISCARDED`
Wrong subject. You teach the Islamic faith, worldwide.

---

## Not from that conversation, but raised here and not yet filed anywhere

### Per-lesson questions and discussion — `MISSING`
Wanted, confirmed. Belongs on the lesson, not in a separate forum area — the
learner already has context there, and a standalone forum starts as an empty
room. Easier to use and easier to build.

### Phone number + OTP sign-in — `MISSING`
`otp: 0`, `sms: 0`, `phone: 0` in the plan. Authentication is unspecified.
For a worldwide audience, a phone number is more universal than an email
address, and Supabase supports phone OTP natively. Phone → code → in.
No password to create, remember or reset.

### Guardian verification — `IN PLAN, DISPUTED`
The plan says manual review of every guardian: six states, four endpoints, and
a human queue. That is the worst possible moment in a parent's first five
minutes.
But the plan also decided **child login comes later**, so in v1 a child is not
a user — the child profile sits under the parent's own family, and the parent
is already authenticated. There is no separate child account for a stranger to
claim. **Proposal: drop guardian verification from v1 entirely** and reintroduce
it only when child accounts can link to existing learner profiles.

### Ten roles → three — `IN PLAN, DISPUTED`
`learner, guardian, billing_manager, instructor, reviewer, scholarly_panel_member,
support_agent, governance_admin, finance_admin, platform_admin`.
Seven of those are internal and should never appear in the product.
**Proposal:** student, parent, teacher. That's it for v1.

### Scholarly panel required for all courses — `IN PLAN, DISPUTED`
Currently blocks publishing course one, because the quorum policy is open.
With a small cohort of teachers you know and trust, this is far more machinery
than needed: 9 tables of panels, voting, quorum, conflicts and appeals.
**Proposal:** replace with light peer review — one other teacher reads it, you
approve. Keep `reviewer_profiles`, `content_review_assignments`,
`content_review_decisions`; drop the panel machinery.

### Child engagement mechanics — `MISSING`
The stated goal is that children are more engaged. In the plan: `gamif: 0`,
`badge: 0`, `streak: 0`, `reward: 0`. Every child-specific feature listed is
administrative — guardian accounts, verification, privacy, age bands.
The Coursera-style format serves self-motivated adults well and young children
poorly. This is undesigned and it is half your audience.

### Ease of use as an explicit principle — `MISSING`
`easy: 0`, `simple: 0`, `friction: 0`, `usability: 0`, `ux: 0` across the whole
plan. The design optimises hard for correctness and never mentions ease of use.
Every usability decision is still unmade. Worth writing down as a standing rule:
**if a flow grows a form with eight fields, it is wrong.**

### Feature flags and the admin settings layer — `MISSING`
Decided: build everything, ship it off, enable later from the admin dashboard.
The plan has no mechanism for this — `feature flag: 0`, `toggle: 0`,
`platform setting: 0`, no settings or flag table, 0 of 121 endpoints touch
settings. The 15 "configurable" items in the plan are per-course and per-plan
data (completion rules, certificate policy, grace periods), not toggles.
**This is now the critical path** — nothing else can be "enabled later" until
it exists. Register drafted in `FLAGS.md`.

### Facts that block code — `MISSING`
Six features cannot be built to completion because they depend on information
I don't have: payment provider, business jurisdiction, tax/invoicing, video
delivery, retention by jurisdiction, panel policy.
**Improvement:** build the interface, leave the adapter empty, record the
precondition. Guessing here produces rework in money and privacy — the two
most expensive places to redo.

### Uganda connectivity constraints — `PARTLY`
The original conversation promised to design around expensive mobile data and
slow connections. `bandwidth: 0`, `slow internet: 0`, `connectivity: 0`;
offline survives only as "where feasible". Matters for a video-first product.

---

## From the Young Learners / Adult Learners conversation

**Headline finding:** nearly every structural idea in that reply is already in
the plan, and usually better specified. What the plan does not contain is a
single screen — `screen: 1`, `landing page: 0`, `first screen: 0`,
`navigation: 0`, `page structure: 0`. There are 85 tables and no UI. That is
the real remaining design work, and it is a different kind of work from data
modelling.

### First screen: "What would you like to learn?" — `PARTLY`
Data model is fully there: `learner_profiles.learner_type: child/adult` and
`courses.audience: child/adult/both`. The screen does not exist.
**Improvement — the selector is "who is learning", not "which mode am I in."**
A child does not choose Young Learners; a parent does. And a parent who also
studies needs to move between their own learning and their children's. The data
supports this (`family_memberships` + `learner_profiles`), but nobody has
designed the **learner switcher**. That is the actual task, and it is harder
than a two-button landing page.

### Two areas that feel independent — `IN PLAN` (do not change the data layer)
Right instinct, one trap. Presentation should be two experiences; the **data
layer must stay shared**. The plan already does this correctly: one `courses`
table with an `audience` column. Making them independent at the schema level
would duplicate courses, enrolments, progress and certificates. Keep it as is.

### Age bands inside Young Learners — `IN PLAN`, and better than the source
`learner_profiles.age_band` exists, with the note *"Prefer age band over exact
DOB by default."* That is the better choice: no children's dates of birth
collected, which is a materially easier privacy position. Do not regress to
brackets that require birth dates just to drive navigation.

### Parent account with children underneath — `IN PLAN`
Six tables already: `families`, `family_memberships`
(`owner/guardian/billing_manager`), `learner_profiles`, `guardian_relationships`,
`billing_accounts`, `billing_account_memberships`. Billing is deliberately
separate from guardianship, which the sketch does not do. No change needed.

### Adult dashboard with per-subject progress and "Continue Learning" — `PARTLY`
`lesson_progress` exists and resume is in the feature list. The screen does not.
**Improvement:** make "continue where you stopped" the primary action on the
adult home screen, not a dashboard item. It is the single highest-value thing
on that page for on-demand learning.

### Self-service publishing — no developer needed to add a lesson — `PARTLY`
The API is already designed: **10 content-editing endpoints + 7 publication
endpoints**, `lessons.type: video/text/audio/interactive/live reference`, and a
`lesson_resources` table. What is missing is the admin screen.
This matters more than it looks: it is the difference between a platform you
can grow yourself and one that needs a developer for every lesson.

### Subject taxonomy powers catalogue navigation — `IN PLAN, MISFILED`
`subject_areas` has `id, code unique, name, parent_subject_id, status` — a
hierarchical taxonomy, exactly what `Admin → Young Learners → Qur'an → Lesson 7`
needs. But it sits in **Group 3: Governance**, alongside the panel machinery.
**Correction:** `subject_areas` and `course_version_subjects` are **catalogue
infrastructure, not governance.** They must be kept even when the panel tables
are cut, or catalogue navigation breaks. Reclassify them so a future cleanup
does not delete them by mistake.

### Payments: MTN MoMo + Airtel Money via official APIs — `PARTLY`
Both already listed. The plan's rules are stronger than the sketch: *"Provider
redirect alone is not proof of payment"* and *"Manual payment confirmation
records actor, evidence/reference and audit"* — which is the correct fallback
where API coverage is partial, rather than pretending manual never happens.
**Improvement:** merchant registration and API availability for each provider is
a **fact to go and confirm**, not something to design around. Add it to the
external-facts list. Do not assume Airtel's API terms match MTN's.

### Business model: free / per-course / monthly / annual — `IN PLAN`
All four structures exist in `revenue_model`, plus family plans and promotions.
Only the **numbers** are missing (`ugx: 0`) — and numbers are a decision, not a
design task. Still gated behind `commerce.checkout`, which needs a provider and
a jurisdiction first.

### "For Uganda initially" — `DISCARDED`
Conflicts with a recorded decision: worldwide ambition, Uganda important but
not exclusive. This is the third time this source has narrowed the project to
Uganda-only. Noted as a conflict, not adopted.

### "The specification you give a Ugandan developer" — `DISCARDED`
You are the developer. Recurring error in the source; ignore every cost and
hand-off framing that comes with it.

### "Keep the first build lean" — `DISCARDED`
Already decided against: full architecture, shipped disabled, enabled from admin.

---

## From the "build it properly" / operating-cost conversation

**This source now agrees with the build-to-completion decision** (§16 explicitly
reverses its earlier MVP advice: *"design the database and backend architecture
for the full platform from day one, even if some features are initially
hidden"*). That matches the recorded decision. Worth noting, since the earlier
replies pushed the other way.

### Operating cost model — `MISSING`, and genuinely valuable
The plan contains no operating budget at all. This is the first time real
numbers have appeared. Figures below are **estimates from the source, not
quotes** — treat as planning ranges.
- 100–1,000 users: roughly **$80–510/month**
- ~50,000 users: roughly **$1,100–6,800/month**
- The dominant variable in both is **video consumption**, not servers.
- One-off: Apple $99/yr, Google Play $25 once, domain $10–40/yr.

### Video delivery — `MISSING`, now researched
Cloudflare Stream pricing **verified**: $5 per 1,000 minutes stored per month,
$1 per 1,000 minutes delivered, encoding and ingest free, no egress fees.
Worked example: 500 hours stored (30,000 min) = $150/mo; 100,000 min delivered
= $100/mo. About **$250/month**.
**Caveats the source did not mention — these matter:**
- **No free tier.** $5/month minimum, storage prepaid in 1,000-minute blocks.
- **H.264 only, capped at 1080p.** No H.265/AV1/VP9.
- **You cannot download your original uploaded file** — only re-encoded MP4.
  For a platform where the course content *is* the asset, that is vendor
  lock-in. **Keep original masters somewhere you control.**
- Live streaming bills at the same rates.
- Storage is prepaid by duration, so you pay for videos nobody watches.

### Apple Developer fee waiver — `MISSING`
Apple waives the $99/year for eligible nonprofits, accredited educational
institutions and government entities. Worth investigating before paying.

### OTP cost — contradicts proposal P3, and both sides are partly right
The source argues email+password should be standard because SMS OTP costs per
message. P3 argued phone+OTP because a phone number is more universal.
**Resolution: the cost fear assumes an SMS per login. There isn't one.** Issue
a session/refresh token at registration and OTP is used at registration and
recovery only — so cost is roughly one SMS per user ever, not per session.
- Support **both**: email+password where an email address exists, phone OTP
  where it doesn't. Default per market, behind a flag.
- Uganda SMS pricing is a **fact to confirm**, not something to guess.
- P3 is amended, not withdrawn.

### Payment engine not tied to one provider — `IN PLAN`
Already correct: `payment_provider_accounts`, `payment_provider_events`,
`currency_exchange_rates`, plus the rules *"original currency authoritative,
settlement tracked separately."* Country → provider mapping is exactly the
recorded strategy (*activate providers market by market*). No change.

### Live classes via an existing provider — `AGREED`
Do not build WebRTC infrastructure. Already reflected in the `delivery.live_classes`
flag precondition.

### Legal and policy documents — `MISSING`, and important
Terms, privacy policy, refund policy, instructor agreement, child/guardian
policy, copyright policy, payment compliance, data protection. The plan has
`retention_and_deletion: Open` and no legal document list. For a worldwide
platform with children's data this is not optional.

### "Design the whole architecture next" — `MOSTLY ALREADY DONE`
The source recommends designing 16 things before writing code. Checked against
the plan: **9 already done, 4 partly, 3 missing.**
Missing: **every screen**, **video architecture**, **development order**.
Do not redesign the database, roles, stack, security model, certificate
verification or marketplace — they exist. That would be the getting-lost trap
wearing a productive costume.

### "Udemy-style marketplace with commissions" — `IN PLAN, DEFERRED`
Already behind `teaching.applications` and `teaching.payouts` (both `CODE`,
both blocked on facts). Not new. Also note the recorded decision is a curated
cohort of teachers I know, not open applications.

---

## Four defects found in the plan while checking

These are inconsistencies in the project record itself, not missing features.

1. **7 support-case endpoints, no `support_cases` table.** `POST /api/v1/support-cases`,
   `GET /api/v1/me/support-cases`, plus admin list/assign/update — all with
   nowhere to store anything.
2. **"Notes, bookmarks, transcripts" is a listed learning feature with no table.**
   `bookmarks`, `notes` both absent from all 85 tables.
3. **Learner course reviews do not exist.** `course_reviews` absent. The 68
   "review" mentions are all *governance* review (scholarly approval), not
   learner ratings. Learner ratings appear in the source's feature list and
   nowhere in the plan.
4. **Learner assignments now have their own tables and text workflow.** They
   are separate from question-level quiz marking: a task lives beside (not
   inside) the frozen course version, with a per-enrolment or cohort deadline,
   a private learner draft, a final hand-in and feedback from the course author
   or privileged staff. The design is confirmed for both self-paced and cohort
   learning; learners submit text or files. Cohort/assignment data, RLS, audit,
   teacher creation/marking UI and learner text hand-in are built behind flags.
   File references accept conservative formats/limits, but bytes are not
   transferred, scanned or delivered; there is no resubmission loop, and the
   teacher/learner cohort screens remain. `learning.assignments` stays off until
   those preconditions are complete.

Also still absent, confirming an earlier finding: `settings` and `feature_flags`.


---

## From the investor-proposal / mockups conversation

### New fact: an investor proposal is in play — `NEW CONTEXT`
Not previously mentioned. The project had been treated as self-funded with
near-zero budget, and several earlier decisions leaned on that. Seeking capital
does not change the architecture, but it does raise the cost of looking
unprepared — which is exactly why the brand point below matters.

### "Use Noor Academy as a placeholder brand" — `DISCARDED, ACTIVELY HARMFUL`
Noor Academy is a **live competitor in the same market**, verified:
- `nooracademy.com` — online Quran, Arabic and Islamic Studies for **kids
  5–18**, own K–12 curriculum, Al-Azhar-trained teachers, live 1:1 classes
- `noor-academy.org`, `nooracademypakistan.com` (since 2011, worldwide),
  `noorislamicacademy.com`

Several of these appear in the cited-URL list of my own earlier competitor
research. Presenting investor mockups under a direct competitor's name would
signal that I don't know my market — the worst possible signal in a pitch.
**AyahSpring is already a recorded decision. There is no need for a placeholder.**

### One consistent visual identity across all mockups — `AGREED`
Same name, logo, typography and navigation everywhere. That part is right: a
coherent set of screens reads as a product, a mixed set reads as a mood board.
Depends on brand identity existing — and **trademark/domain clearance is still
unresolved**. Before showing a name to investors, clear it, not after.

### Screen inventory — `WAS MISSING, NOW FILED`
The plan had **zero screens**. The source's list of 48 is the first enumeration
and fills a real gap. Filed and corrected in `SCREENS.md`: **50 distinct
screens, 38 ready to design now, 12 blocked.**
- Four of the 48 are not separate screens (Android home/learning, iOS
  home/learning) — one codebase means responsive states.
- Seven essentials are missing, including **sign in / register** (no auth
  screen in 48 mockups, on a project whose top priority is ease of use) and
  **settings and feature flags** (the critical path for "enable from admin").
- The screen designs are needed for building the product as well as for the
  pitch, so this work is not wasted either way.

### 5-year financial model — `DISCARDED AS SPECIFIED`
There are no users, no price points (`ugx: 0`, no prices of any kind), no
payment provider, and six features blocked on facts I don't have. A five-year
projection on that basis is not defensible and a competent investor will find
it in two questions.
**Build instead:** the operating cost model (already filed — $80–510/month at
100–1,000 users, video-dominated), a clearly labelled assumption set, and unit
economics per learner. State what is unknown. At this stage investors fund the
founder, the audience and the insight — not a spreadsheet.

### The strongest asset in a pitch is not the mockups — `NOTE`
An existing audience and existing students. That is distribution and proof of
demand, which is rarer than a design. Mockups show what it will look like; the
audience shows that people already want it.

---

## Premium ideas — parking lot

**Framing:** premium is not more features. It is a few things nobody else does
well, plus flawless basics. Everything below is filed here so it stops
competing for attention — none of it belongs in the first release.

Verified gaps: `recitation: 0` `hifz: 0` `memoriz: 0` `ijazah: 0` `isnad: 0`
`spaced repetition: 0` `qibla: 0` `prayer time: 0` `dhikr: 0` `surah: 0` `rtl: 0`.
The plan is a generic LMS with an Islamic curriculum. Nothing in it is
specific to teaching the Qur'an.

### Tier 1 — defensible. This is the moat.

**1. Qur'an recitation feedback.** Learner recites into the microphone; the
system flags letters and tajweed rules. The single hardest and most valuable
feature on this list, and nobody does it well at scale.
*Honest caveat:* Quranic Arabic ASR is imperfect. Start narrow — letter-level
makharij feedback on short surahs, not full tajweed grading. A wrong correction
on religious content is worse than no correction.

**2. Hifz tracker with spaced repetition.** Which ayahs are memorised, which
are decaying, what to revise today. A genuine unmet need — most hafiz plan
revision on paper. Algorithmically simple (a schedule table + a decay curve),
so high value for low build cost. **Best value on this entire list.**

**3. Ijazah pathway.** A digital chain of transmission: a teacher authorises a
student to teach a text, with the chain recorded and verifiable. Extends the
existing `certificates` table, which already has a verification token hash and
a content snapshot. Nobody has this. It is also the most culturally resonant
credential possible.

**4. Source provenance on every lesson.** `content_sources` **already exists**
with `source_type: Qur'an/Hadith/book/article`, `reference_locator`,
`author_or_compiler` and `edition_or_version`. It is designed and invisible.
Surface it: *"this lesson cites Sahih al-Bukhari 1234, reviewed by Sheikh X."*
In Islamic epistemology the chain *is* the credential. Near-zero build cost —
the table exists, it needs a UI.

### Tier 2 — daily use. Premium apps are opened daily.

**5. Companion tools:** prayer times, qibla, dhikr counter, adhkar. Cheap, and
they turn a course app into a daily app. Retention compounds from this more
than from any course feature.

**6. Ayah of the day** with audio and a short tafsir excerpt, linking into the
catalogue. A daily return hook that sells courses.

**7. Weekly parent report over WhatsApp.** In East Africa WhatsApp is the
interface, not email. A parent receiving *"Aisha completed 3 lessons and her
revision is due"* is retention and word-of-mouth in one message. `whatsapp: 0`
in the plan.

### Tier 3 — experience quality

**8. Synchronised Qur'an audio and text** — ayah-by-ayah highlight following a
reciter. Genuinely premium and technically tractable; public timing datasets
exist.
**9. Arabic letter tracing** for young learners, touch-based. The 5–8 bracket
needs this.
**10. Offline-first as a feature, not a compromise.** Downloadable lessons that
work on a matatu. In your markets offline *is* premium.
**11. Real Arabic typography and accessibility** — Uthmani script, a proper
naskh font, dyslexia-friendly Latin, screen-reader support. `rtl: 0` today.
**12. Family dashboard with sibling challenges** — cooperative competition
between children in one family.

### Tier 4 — AI, in the order it is safe to build

**13. AI quiz generation from your own lesson transcripts.** Cheap, useful to
teachers, low risk — it only reads content you already approved.
**14. Safeguarded study assistant.** Answers *only* from approved course
material, cites the source, and **refuses to issue rulings**, referring fiqh
questions to a teacher. The safeguarding is the product: an AI that gives
unqualified Islamic rulings is a liability, not a feature.
**15. Recitation feedback** (see #1) — AI, but the hardest and most valuable.
**16. Recommendations.** Least valuable. Build last.

### What premium is not

Live classes, AI tutors, analytics dashboards, corporate accounts. Those are
enterprise features, not premium learner experiences. The premium feeling comes
from #1–4 and #8–11, and from the basics being flawless: fast, no broken
videos, works offline, sign-in that never fails.

### For the investor pitch specifically

A feature list is not a moat. **Recitation feedback, a hifz algorithm and a
verifiable ijazah chain are.** Those are proprietary, Qur'an-specific and hard
to copy — which is exactly what an investor is looking for and what no generic
LMS gives you.

---

## Enterprise / institutional features — verified almost entirely absent

Counts in the project record: `corporate: 0` `school: 0` `madrasah: 0`
`bulk: 0` `seat: 0` `b2b: 0` `white label: 0` `reseller: 0` `webhook: 0`
`public api: 0` `tenant: 0`. The only coverage anywhere is the single
`commerce.institutions` flag added here. (Note: `sso` appears 27 times in the
record but every hit is inside the word "lesson".)

**The culturally right B2B for this product is not "corporate training."** It is
madrasahs, Islamic schools, mosques and community organisations — institutions
that already teach and want structure, reporting and their own branding.

- **Institution accounts** with a manager, funded seats and bulk enrolment
- **Invoicing and purchase orders** — `invoicing` appears only as an unresolved tax item
- **Co-branded / white-label** for a partner madrasah
- **Per-institution reporting** for the head teacher
- **Public API and webhooks** so an institution can integrate its own systems
- **Real SSO (SAML/OIDC)** for staff accounts
- **Multi-tenant or sub-accounts** if two institutions must be kept apart
- **Institution-funded teacher accounts** — a madrasah pays for its teachers

Enterprise is a *revenue* answer, not a learner-feature answer. It matters for
the investor story far more than for the first release.

---

## Things skipped or taken lightly

### 1. Content ownership and licensing — `MISSING EVERYWHERE`
`instructor agreement: 0` `licence: 0` `content ownership: 0` `copyright: 0`.
If a teacher friend uploads a course, **who owns it?** What licence does the
platform get? What happens if they leave and want it removed? Can they publish
the same course elsewhere? None of this is written down, and it is the kind of
gap that ends friendships and businesses. It also cuts the other way: a teacher
quoting a modern published tafsir translation may need permission.

### 2. Data protection law — `MISSING EVERYWHERE`
`gdpr: 0` `coppa: 0` `data protection: 0` `data residency: 0`.
A worldwide platform holding **children's** data is inside several regimes at
once: GDPR/UK GDPR, **COPPA** for under-13s in the US, the **Uganda Data
Protection and Privacy Act 2019**, Kenya's DPA 2019, Nigeria's NDPR.
`retention_and_deletion` is still `Open`. This is the largest single legal risk
in the project and it is undocumented.

**This partially walks back my own proposal P4.** I argued for dropping
guardian verification from v1 because children aren't users. That holds if the
first release has no US under-13s. The moment it does, **COPPA requires
verifiable parental consent** — which is exactly what the verification workflow
was for. So: keep the tables, ship the flag off, and turn it on before any US
child enrols. Do not delete the machinery.

### 3. Child safeguarding — `MISSING`
All four `safeguard` mentions in the record are about AI outputs and privileged
role assignments. There is nothing about protecting children from people.
Needed: teacher conduct policy, screening/background checks, a reporting route
for concerns, a named responsible person, and rules about teacher–learner
contact (especially in per-lesson discussion).

### 4. Breach and incident response — `MISSING`
`breach: 0` `incident: 1`. GDPR requires notification within 72 hours. There is
no procedure, no owner, no template.

### 5. Hijri calendar and Ramadan — `MISSING`, and surprising
`hijri: 0` `ramadan: 0` `islamic calendar: 0`. **Ramadan is the peak season for
Islamic learning demand** and the platform has no awareness of it. Needed:
Hijri dates alongside Gregorian, Ramadan scheduling and content collections,
Eid handling, and prayer-time calculation methods that differ by region.

### 6. Zakat, sadaqah and sponsorship — `MISSING`, and a missed opportunity
`zakat: 0` `sadaqah: 0` `sponsor: 0` `donation: 0` `waqf: 0`. A culturally
natural funding model: a donor sponsors a child's learning, or funds free seats
as sadaqah. This is both a revenue stream and the **social-impact angle an
investor will respond to** — and it is completely absent.

### 7. Scholarships and funded seats — `MISSING`
`scholarship: 0` `bursary: 0`. Pairs with #6. Also makes free access
deliberate rather than accidental.

### 8. Teacher invite links with attribution — `MISSING`, and it is the growth engine
`invite link: 0` `attribution: 0`. Your teachers already have audiences. The
single most important growth feature is a teacher sharing a link that lands
their followers on their course, with attribution recorded. It is cheap, and
without it you have no way to know which teacher brought whom.

### 9. Moderation policy for discussion — `PARTLY`
Per-lesson discussion is wanted and `moderat` appears twice, but there is no
policy. On a religious platform, comment threads on fiqh topics can become
sectarian and contentious fast. Who reviews, what gets removed, what happens on
repeat — needs writing before the feature ships, not after.

### 10. Accessibility standard — `MISSING`
`wcag: 0` `screen reader: 0`. RTL and Arabic typography are flagged; conformance
to a named standard is not. It matters legally in some markets and it is
required for most institutional sales.

### 11. Copyright takedown process — `MISSING`
`takedown: 0` `dmca: 0`. Needed once third parties can upload.

### 12. Dropout analytics — `MISSING`
`dropout: 0` `drop-off: 0` (the 11 `retention` hits are data retention, not
learner retention). "Which lesson do students abandon?" is the single most
useful number for improving a course, and it is cheap to capture.

---

## "Udemy style" — what transfers and what would hurt

### Three things about Udemy that do NOT transfer to Islamic education

**1. Ratings cannot gate religious accuracy.** On Udemy a bad course collects bad
reviews and dies. In Islamic education a *popular* course can be religiously
wrong. Ratings measure satisfaction, not correctness. Letting the market decide
fiqh is how a platform publishes something it cannot defend. This is exactly why
the design has scholarly review — keep it.

**2. Open onboarding puts your reputation behind strangers.** Udemy can absorb a
bad Python course. You cannot absorb a bad ruling on aqeedah carrying your name.

**3. The $9.99 discount culture destroys premium.** Udemy's volume economics work
because a course is an impulse skill purchase. Islamic learning is a trust
relationship. Racing price to the bottom contradicts the premium positioning
just agreed.

### What DOES transfer — and is currently missing

| Mechanism | State | Why it matters |
|---|---|---|
| **Ratings and reviews** | `course_reviews` **ABSENT** | Learner satisfaction, kept strictly separate from scholarly approval. Two gates, two purposes. |
| **Revenue share** | `revenue share: 0` | The single strongest reason a teacher stays rather than going back to YouTube |
| **Instructor-set pricing** | `prices` exists (8 fields) but is platform-set | Give teachers a floor and ceiling and let them choose inside it |
| **Public instructor profile** | `reviewer_profiles` is *internal*, not public | Your teachers have audiences — give them a page to send people to |
| **Course previews / free lessons** | not designed | The main conversion mechanism on every course platform |
| **Wishlist** | `wishlist` **ABSENT** | Cheap, standard, expected |
| **Catalogue badges** | not designed | Bestseller and rating badges are social proof that converts |
| **Instructor analytics** | `instructor_earnings_entries` — name only, "deferred" | "How are my courses doing" is what keeps a teacher engaged |

### Recommended synthesis: Udemy economics behind a scholarly gate

- **Curated instructors, but with an application queue behind a flag** so the
  gate can open later without a redesign. Keeps the recorded decision, buys the
  option cheaply.
- **Two independent gates.** Scholarly review decides *may this be published*.
  Ratings decide *do learners like it*. Never let one substitute for the other.
- **Instructors set prices within platform-set floor and ceiling.**
- **Revenue share on sales**, with payouts behind `teaching.payouts`.
- **Previews, public instructor pages, wishlist, badges.**

### What it costs to add

New: `course_reviews` (+ moderation policy — reviews on religious content need
one), `wishlist`, `instructor_profiles` (public, distinct from
`reviewer_profiles`). `instructor_earnings_entries` and `instructor_payouts`
need real fields. `prices` needs instructor attribution and a revenue-share
field.

### Facts required before payouts can exist

Payout provider · tax treatment per country · minimum thresholds · instructor
KYC · currency conversion and who bears FX · dispute handling.
**This is a fintech project, not a feature.** It is correctly behind a flag.

### Does any of this block Group 1?

**No.** Group 1 is identity, family and guardians. The marketplace is Group 4/5
territory. Nothing here changes the first migration.
