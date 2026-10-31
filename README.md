# AyahSpring

Global Islamic e-learning platform for children and adults.

## Planning documents

| File | Purpose |
|---|---|
| `NEXT.md` | The one current milestone, and a **half-built ledger** — what exists, what does not, and which decision each piece waits on. Read this first. |
| `DECISIONS.md` | What is settled, and the nine irreversible decisions |
| `ROADMAP.md` | All 53 tasks with completion gates |
| `IRREVERSIBLE.md` | The nine decisions that are expensive to reverse |
| `FLAGS.md` | Every feature, behind a flag, with its precondition |
| `SCREENS.md` | 53 distinct screens; 12 ready to design |
| `IDEAS.md` | Parking lot. Nothing here is scheduled. |
| `docs/deploy/` | **How to put this live**: project, migrations, first owner, env vars, media, encoder, email, Google — written as steps with their outputs, and the two pieces of SQL an operator pastes are executed by the test suite |

## Database

PostgreSQL on Supabase. Migrations live in `supabase/migrations` and are
applied in filename order.

`supabase/tests/harness.sql` stubs the parts Supabase provides (`auth.users`,
the `anon` and `authenticated` roles) so the migrations can run against a bare
PostgreSQL instance in CI. It is never applied to a real database.

**To deploy, follow `docs/deploy/README.md`** — and when it is up, paste
`docs/deploy/verify.sql` into the SQL editor: twelve rows that say whether the
schema landed, whether the sign-up trigger is attached, and whether anybody can
administer it yet. That CI is
`.github/workflows/ci.yml`, and it needs no Supabase project and no secrets.

### Running the tests

```bash
npm install
npm run test:db
```

This runs the real migration files against a real PostgreSQL engine
([PGlite](https://pglite.dev) — Postgres compiled to WASM), so constraints,
triggers and row level security are actually executed rather than merely parsed.

The suite is split by group and run by `supabase/tests/run.mjs`, which applies
the migrations once and runs every suite against the same engine. Because the
runner lists its suites by hand, a new `*.test.mjs` that nobody registered would
not fail — it would simply never run. `npm run check:repo` catches that, along
with two migrations sharing a filename prefix and conflict markers left in a
file; `npm test` runs it first, and CI runs it as its own job.

**170 tests** across the five original groups (six files, since group 2 is split
in two):

*Group 1 — identity, family, guardians, privacy.* Schema presence, RLS on
every public table, seed data, `updated_at` triggers, duplicate and
self-escalating role grants, the child login prohibition (D2), the guardian
verification workflow, adult sharing rules, soft-delete code reuse, and four
RLS isolation cases.

*Group 2 — courses, versions, structure, media.* Slug reuse under soft delete
(D7), recursive subject-taxonomy cycle rejection, media master uniqueness and
checksum format (D8), single-source lesson resources, D5 immutability of a
published version **and of its entire subtree**, the review lifecycle
including "an author may not approve their own course", one published version
per course per language (D9), and seven RLS visibility cases.

*Group 2 part 2 — enrolments, progress, assessments, certificates.* The
version pin cannot be forged or moved without an audited reason, and a re-pin
leaves existing progress intact. Progress must be recorded against the pinned
version. Attempt limits, submitted-attempt immutability, automatic and manual
grading, and mixed grading that waits. Answer keys are unreadable by clients —
including via `SELECT *`. Certificate issuance is idempotent, snapshots the
course as it was, refuses incomplete work, and revokes rather than deletes.

## Status

The database stands at **147 tables, RLS on every one, 271 policies, 166
user-defined triggers, 518 functions and 191 migrations.** The database suite
passes **2066 tests**; the web suite passes **1634 tests**. TypeScript typecheck
and the production build pass; Next.js emits **221 app route entries** — 120
pages and seven generated entries (`/_not-found`, four icons and manifest, the
robots file, the sitemap), plus 94 API routes.

**The policies were drafts, and the database said so.** Seven documents — terms,
privacy, children, refunds, teaching, safeguarding, takedown — describe what the
platform actually does and mark every question only the owner can answer with
`[OWNER DECISION: …]`. The owner answered twenty-two on 2026-10-27 — Ugandan law
and courts, the PDPO under the 2019 Act, retention of three and seven years, nothing
sold until a merchant of record is connected, no under-13s until guardian
verification works, a teacher check that says plainly it is not a criminal-record
check, and a 50% teacher share with its fine print — and the twenty-third on
2026-10-28, which was not a decision but a fact: **the operator is AyahSpring,
operated from Uganda, reachable at privacy@ayahspring.com.** The notice says exactly
that and not `Inc.`, because a suffix is a claim about a registration nobody has
made; the children's, safeguarding and takedown documents point at the one line
rather than repeating it. **No marker is left anywhere**, and answering the last one
exposed a second defect worth naming: the privacy notice had described the under-13
rule country by country while the children's policy carried the absolute one, so the
weaker sentence was the one a parent read first. Both now say the same thing.
**All seven were published on 2026-10-28**, in force from that date: the instruction
is recorded on each version because a deployment has no accounts to name when the
migrations run, and a change from here is a new version that retires the one it
replaces and keeps every signature it was given.
`approve_policy_version()` still refuses to put a document in force while a marker
remains — proved on a draft written in the test — so a policy is either unfinished
and legible or finished and binding. `/policies` lists them publicly and marks the unapproved
ones rather than showing a draft; `/admin/policies` is where the owner answers,
publishes with a date and a written reason, and sees who agreed to what — and
where an eighth document (an incident runbook, a screening standard) is added
without SQL and then written and approved like the rest.

**The scholarly panel can finally decide something.** The four panel tables had
existed since 2026-10-18 and nothing could close a case, while the publication gate
looked for an *approved* one — so switching `governance.panel_required` on would
have blocked every publication on the platform for ever. `/admin/panels` convenes a
panel with a quorum the owner sets, seats people who are both appointed and checked,
opens a case against an unpublished version and records the decision; `/panel` is
where a seated member votes. A case cannot close below quorum, cannot be approved
while more voted to reject, and a convened panel cannot be emptied below its quorum.

**A register of what was checked about the adults who teach.** The safeguarding
policy had said the honest thing — screening is not built, and the gap is stated
rather than implied by a badge — and the gap is now a record instead of an absence.
`/admin/screenings` holds one row per check: what kind, when, when it lapses, who
recorded it. The reference to the document is write-only (no client role may read
that column back) and the row is append-only (a trigger refuses every update and
delete), because a record of what somebody was told is worth less than nothing if
it can be edited afterwards. A teacher reads their own record on `/teach`. What it
still does not do is block anything: refusing a child-facing course from an adult
with no current check needs a standard the owner has not set, and `FLAGS.md` says
so in the same paragraph that names what does exist.

**An incident register with clocks it does not invent.** `platform.incident` was the
last flag row that could say "nothing exists" and be right. `/admin/incidents` now
records what happened, when it was found, what kinds of data were involved, and how
many people — counts, never a list of names — then every body that has to be told
with a **deadline typed by a person** and the telling recorded against it, including
its lateness. An incident cannot resolve while an obligation is neither told nor
waived, and cannot close without a recorded change. Choosing not to tell a body is a
decision with a reason, kept on the record rather than deleted. Nothing there detects
a breach and nothing sends a notification: the learner notice is written and held, and
the screen says so beside the field.

**Guardian consent is a method and a date, not a checkbox.** The owner's answer to
the children's question was to build verifiable parental consent and integrate it
fully, and the machinery had a hole: a relationship could be `active` with no
lifetime, no method and no way for a parent to open the case that makes anybody look
at it. `/family/guardians` now submits the relationship and the case in one call — a
required statement in the parent's own words, a method, a write-only evidence
reference — and `/admin/guardians` decides it: verify for a stated number of months,
reject with a reason the parent reads, or ask for more. The expiry lives in one
predicate, `guardian_consent_is_current()`, behind the thirteen policies that call
`can_access_learner()` and behind the child-enrolment trigger, so a lapse pauses
access everywhere at once and deletes nothing; a withdrawal clears the permissions and
keeps the parent's reason. The evidence reference is write-only for everybody —
including the reviewer — because a queue that hands out a pointer to somebody's
identity documents is a queue nobody should trust. The flag stays off and means
enforcement, not permission: an owner can record and review consents first, then turn
enforcement on, and both screens say that turning it on lapses every earlier
verification, since those were approved without a lifetime.

**A takedown that withholds instead of deleting.** `platform.takedown` named its own
gap — the notice process existed and the withholding action did not. It does now, and
it is one clause in `can_read_version()`: a version with a live notice disappears from
the catalogue, from enrolment, from the player and from offline keys in the same
moment, while its author, reviewers and staff keep reading it. The teacher answers on
their own page, the person who took the notice does not get to decide it, and
rejecting the notice restores everything. Nothing is deleted and no money moves —
the material is the evidence the decision rests on, and what a hold should do to money
already taken is recorded as an open decision rather than invented.

Every class a screen asks for is defined. The stylesheet had been missing `.page`, `.page-head` and
`.crumbs` while twenty-five to twenty-eight screens used them — and `.narrow`, which meant a 26rem
column, was being read as "a page, a bit narrower", so the lesson page laid out a video and a
discussion thread in 416 pixels. Three widths now exist (46rem, 68rem for tables, 34rem for a column
of prose) and `npm run check:repo` fails on any `className` token in `web/src` that `globals.css` does
not define. The same audit found the app rendering two `<main>` landmarks on twenty-five pages: the
layout owns the one the skip link targets, and pages now open a `<div>`.

The About page was rewritten the same way: it made a claim about a feature that
ships switched off. It reads no flag and no database — it has to render on an
empty deployment — so it now describes rules rather than switch states, and
`check:repo` fails any internal link (`href`, `redirect()`, `router.push()`) that
does not resolve to a route in the App Router.

The brand mark is one shape in one place. It was a CSS `clip-path` on an
empty `<span>` in the header — a real shape with no file behind it, so there
was no favicon, no app icon and no share card, and the certificate had quietly
grown a different mark. The sixteen points are now in `web/src/lib/brand.ts`
and the header, certificate, receipt, favicon, app icon and 1200x630 share card
all draw them; `brand.test.ts` fails if the favicon and the header disagree.

The masthead used to offer "Sign in" and "Get started" to a learner who had just
signed in, on every page, because the root layout stays auth-agnostic so pages
can be static. It now renders the signed-out pair on the server and asks
`GET /api/session` once after hydration: signed in, the two buttons become
"Your area" and "Sign out" — a POST, because the route refuses GET.

The site works at 360 pixels. The header was one flex row of eight links and
two buttons with no rule below the desktop breakpoint, and `input` would not
shrink inside a flex row, so a search form was 478 pixels of content in a
320-pixel screen. The header is two rows below 54rem with a scrolling nav, the
form controls can shrink, tabs scroll, and a table must sit in a `.scroll-x`
box (`check:repo` #7).

The masthead marks the section you are in with `aria-current="page"` — in the
server's HTML, not applied after hydration — and every form control has an
accessible name (`check:repo` #8): the count is 316 named, 0 unnamed.

Text colour is measured, not eyeballed: `check:repo` #9 reads the design tokens
and computes WCAG contrast over the twenty pairs the stylesheet composes. It
found `--muted` at 3.98:1 on the page background — the whole muted voice of the
site, under the 4.5 AA asks of normal text. It is 5.00:1 now.

**Arabic is set as Arabic.** Not a
translation: content whose author wrote it in Arabic — a course title, a lesson
name, a teacher's name and biography, the name printed on a certificate, a quoted
āyah — is rendered in a Naskh face taken from the device (no 400 KB webfont on a
free tier), with `letter-spacing: 0` because Arabic is cursive and tracking pulls
joined letters apart, and `line-height: 2` because the harakat clip at the site's
1.55. A mixed line is split into runs and each Arabic run is wrapped in
`<bdi lang="ar">`, which is what makes a screen reader switch voice instead of
spelling the letters out; the block's own direction is decided by counting
letters, so a heading that quotes one Arabic word does not move and one that is
Arabic sits against the right edge. Detection reads the text
(`\p{Script_Extensions=Arabic}`, which counts the vowel marks, and catches ﷺ
U+FDFA) only where nothing stored a language — a course with a language code keeps
using it. `globals.css` lists the three rules that can sit *inside* a right-to-left block
and draw a physical side, which is the whole list; everything else is flex or
grid, which follow `direction` themselves and therefore mirror with the shell.
This paragraph is about **content**, which is a different problem from the
interface translation built on 2026-10-29: a course title stays in the language
its author wrote. What this still does **not** do, and
`/account/accessibility` says in those words: no dyslexia font (none is licensed)
and no text-to-speech (no provider).

**A teacher's outline comes in from a spreadsheet.** `platform.data_export` had
an import half it never had, refused on the honest ground that a stranger's file
would have to be mapped into records nobody wrote. A teacher's *own* outline is
not that: `lib/csv-import.ts` reads four named columns — `section`, `lesson`, and
optionally `description` and `preview` — and refuses an unknown column rather than
dropping it. `POST /api/teach` offers `import_preview`, which writes nothing and
returns the sections in order with every problem and its line number, and
`import_apply`, which re-reads the same text and only writes when the whole file is
clean. `import_course_outline()` then appends in one transaction, to a **draft**
only: all or nothing, after whatever is already there, one audit row, and no
media — the card says so before the second button is pressed.

**Memorisation is a calendar, not a score.** `/hifz` (behind `learning.hifz`) keeps
what a learner is learning by heart — a label they write themselves, because the
platform holds no Qur'an text and checks nothing — and the date each passage comes
back. The schedule is seven rungs, `hifz_ladder()`: 1, 3, 7, 16, 35, 75, 160 days.
A review called **solid** moves a passage one step along; **shaky** puts it back to
tomorrow and counts a lapse. It is deliberately not SM-2 or FSRS — those model
retention from data this platform does not have — and the only input is the
learner's own verdict, because the platform cannot hear a recitation. Nothing is
scored: a test reads `information_schema` and fails if either hifz table grows a
column matching `score|grade|rating|mastery|proficiency`. A passage is archived,
never deleted, so its reviews survive; and while the flag is off `my_hifz()`
returns `{enabled:false}` rather than an empty list that would read as "nothing
memorised".

**The interface speaks fifty-one languages, and the device picks first.**
`/language` is public, because the language is decided before anybody signs in:
`lib/i18n/` holds a register of fifty-one languages and the root layout sets
`<html lang dir>` from `chooseLocale()` — the cookie if this browser set one,
otherwise the first language in `Accept-Language` the register actually has,
otherwise English. **Twenty-one of them are African** — Swahili, Amharic, Oromo,
Somali, Tigrinya, Kinyarwanda, Luganda, Malagasy, Lingala, Hausa, Yoruba, Igbo,
Wolof, Fulfulde, Bambara, Zulu, Xhosa, Afrikaans, Shona, Sesotho and Chichewa —
and they are grouped first in the picker, because this platform is operated from
Uganda and an interface that files Luganda under Portuguese has said something
about who it expects to read it. **Twenty-three are Asian** — Urdu, Indonesian,
Malay, Bengali and Hindi, then Uzbek, Kazakh, Azerbaijani, Pashto, Dari, Tamil,
Nepali, Sinhala, Thai, Dhivehi, Kyrgyz, Tajik and Turkmen, then Simplified
Chinese, Traditional Chinese, Vietnamese, Tagalog and Burmese. The last eighteen
arrived on 2026-10-30, when a reader asked why the picker had no Asian language
in it. **Chinese is two rows, not one** — `zh-hans` and `zh-hant`, because 软件
and 軟體 are the same word to a machine and different words to the person
reading — and that is why `matchLocale()` now drops one subtag at a time instead
of jumping from the whole tag to the base: `zh-Hans-CN` used to come back `null`,
which handed the largest group of readers on the platform an English page. Central Asia is now complete: all five ex-Soviet republics, in the
alphabet each of them actually uses — Uzbek and Turkmen in Latin because those
countries moved in 1993, Kazakh and Kyrgyz and Tajik in Cyrillic because they
did not. Tajik is Cyrillic Persian and is a separate row from `fa` and `fa-af`
for the same reason Dari is: one language, three countries, three alphabets,
three sets of everyday words. That question was half right:
the five had been there, hidden at the bottom of one long dropdown, and the
answer to it was to show every language on the page — and then to fill the gap
Asia actually had, because Central Asia alone is a hundred million Muslim
readers the interface could not address at all. Dari is `fa-af`, its own
catalogue rather than an entry in `fa`: one language, two countries, and an
Afghan reader should not be handed Tehran's vocabulary. Sinhala is here as a
second-language case rather than a first — the Sri Lankan Muslim family that
fills in a form in Sinhala will not find its own tongue in any picker yet, and
being able to read the form is worth more than being told the language is not
ours. Dhivehi is written in Thaana and runs right to left — the first South
Asian script here to do so, and it needed no layout change at all: `dir` on its
row was the whole of it. Every string falls back to English, so a
half-translated catalogue renders sentences rather than blanks; each language
prints **how much of it is translated**, counted from its own file, and all
fifty-one are at 100% today. It also prints what the coverage number cannot:
**no first-language speaker has read any of the fifty non-English
catalogues yet**, said in the reader's own language rather than in a footnote.
It is not only the frame. **Sign-in and sign-up are translated too** — headings,
the two mode tabs, every field label, both "or" lines, the phone-format hint, the
confirmations and our own refusals — carried to the browser by one provider that
ships *only* the reader's own catalogue, merged with English behind it. A test
reads both form files and fails on a sentence of three or more English words left
in the markup. The words a **provider** returns are not translated: a wrong
password is Supabase Auth's sentence, and rewriting it would be a guess presented
as a fact.

**The password reset is translated at both ends.** Somebody who asks for a link in
Luganda and lands on an English page concludes the reset failed, so
`/forgot-password` and the new-password form are interfaces like any other — the
heading, the address field, the two buttons, the confirmation and our own
refusals. The confirmation is deliberately the same sentence whether or not the
address is registered: an address that answers "no such account" is a way to find
out who has an account here, and a test pins that. The refusal that is *not* ours
is now quoted as it arrives: the form used to replace Supabase's reason with a
guess about "account security requirements", which was a diagnosis printed as a
fact and hid the one sentence that tells the reader what to change.

**The shelf speaks too.** The catalogue is the first screen a stranger meets, so
it is translated whole: the heading, the lede, both audience doors, the search box
and its label, the audience select, the subject chips, the language row, the count
above the grid, "Showing 1–24 of 137", both pagers, the three different empty
states and the prices on the cards. The count and the timings carry the reader's
own numerals — Persian ۱, Bengali ১ — taken from `Intl.NumberFormat` rather than
typed. In an RTL language the pager's arrows turn with the words, because a
left-pointing arrow beside the Arabic word for "previous" points at the wrong
page. What is *not* translated is the thing on the card that belongs to its
author: **a course's title and description stay exactly as written**, in their own
language and their own direction, on a page that may be running in a third. A
second test file reads the page, the pager and the card and fails on a sentence of
three or more English words or a hard-coded `aria-label`, and it holds the search
box to the query the reader actually typed.

**Both doors speak it too.** `/young` and `/adults` are the same shelf with the
decision already made, drawn from the same cards and the same pager, so they were
translated with it rather than after it: the two headings, both ledes, the notice
that says a child holds no login, the age chips, the cross-links and the three
different empty states. The age a parent picked is a value (`11-13`) and stays one
in every language — a sentence that said "nothing for those ages" without naming
which age would read finished and answer nothing, which is why a test passes the
band through all fifty-one catalogues and checks it comes back.

**The front door speaks it too, and it was the last page still in English.** The
excuse was that it is the page with no session to read a preference from, which
was never true: `chooseLocale()` reads the cookie and `Accept-Language` for
anybody, signed in or not. Forty-two `home.*` keys carry the whole page — the
hero, the panel of three refusals, the subject heading, both doors, the three
steps, the teacher band and the closing call — in all fifty-one languages,
written in four files by region (`home-africa-east`, `home-africa-west`,
`home-africa-south`, `home-world`) so that adding a language is one block.
Two things on it are values rather than words. The subject count goes through
`countLabel()`, because Swahili says `somo` for one and `masomo` for many: a
single template with a number in front would have been wrong in exactly the
languages this page was written for last. The step number is `formatNumber()`-ed,
so a Persian reader sees ۲ in a sentence that is otherwise theirs. The arrows turn
with the writing direction. The two door headings borrow `audience.child` and
`audience.adult` from the catalogue's own filters rather than inventing a second
pair of names. The **destination** of the two buttons is still `frontDoorCta()`
and only the label moved into the catalogue — one function decides where a button
goes, so the header, the front page and the closing band cannot disagree. The
Supabase setup notice stays in English on purpose: whoever reads it is reading
`.env.example`. A twelfth test file reads the page and fails on a sentence of
three or more English words, on a hard-coded `aria-label`, on a lost `{count}` or
`{number}` in any catalogue, and on an arrow that did not turn.

Coverage is a count; a native reader is a claim. The picker's first option is *my device's language*,
which deletes the cookie — a default somebody cannot return to is not a default. And the
languages are **on the page rather than inside a dropdown**: they were a single `<select>`,
which opened on the twenty-one African entries and made the other three continents look
absent — a reader asked why there was not a single Asian language, when there were five in a
block below the fold. Each region is now its own block, every language its own button with its
name in its own script, and the form is still a plain `POST` that works with JavaScript off.
The choice lives on the browser, not the account, and the page says so: a shared
family tablet should speak to each of its readers, and the sign-in page has to be
readable before there is an account to hold a preference. Arabic, Urdu and
Persian turn the whole shell around, because the rules that place things are
written in logical properties (`margin-inline-start`, `border-inline-start`)
rather than left and right; the certificate and the receipt declare `dir="ltr"`
because their words are English and untranslated. **Courses are not translated:**
a title, a description, a lesson and a teacher's page stay in the language their
author wrote them in, in their own direction, and the catalogue says so in its own
words. The feature has no flag —
English is the fallback, so it cannot be half-on.

Crawlers have rules: `robots.txt` disallows the twenty signed-in prefixes,
`sitemap.xml` lists only pages that exist right now — a gated page is listed
only while its switch is on, because `/young` redirects while
`learning.audience_sections` is off. A search result is `noindex, follow`; a
filtered shelf is indexable under a canonical address; and `/verify/<number>`,
which prints a learner's name, is `noindex, nofollow`.

/learn now leads with the same card. It ranks enrolments by the newest progress
row rather than by enrolment date — a course bought last month and never opened
must not outrank the one the learner was inside yesterday — tries at most three
courses, and shows nothing when every one of them is finished.

The course page answers "where was I?" before it shows a percentage: the most
recently touched unfinished lesson, else the first unfinished one in reading
order, else nothing — and it words that as "Start the course", "Carry on where
you stopped" or "Next up" rather than "Continue" for everyone.

A lesson now has a next one: `lib/outline.ts` flattens a course into its reading
order across sections and `LessonNav` offers "← Wudu in practice · Lesson 3 of 4 ·
The conditions of prayer →", read from the enrolment's pinned version and shown
only to a reader entitled to the lessons.

The front door reads the session on the server — it is already dynamic — so a
signed-in reader is offered "Continue learning" rather than "Create a free
account", and a sentence about their own progress rather than an invitation to
join.

Signing up produces a usable account: a trigger on `auth.users` creates the
`user_profiles` row that every foreign key in the schema depends on. `/account`
lets a signed-in learner update their display name, preferred language and IANA
time zone; email/phone and account status are not editable there. Email users
can request a password reset from sign-in and set the new password through the
verified recovery callback. The signup trigger prevents an authenticated account
from being created without its application profile.

A lesson can contain something: `add_lesson_resource()` attaches a video,
reading or worksheet. Before it, every lesson published on the platform was an
empty page, because nothing could write to the table the lesson page reads.

Somebody can now be a reviewer. Publishing a course needs a scholarly approval,
an approval needs an assignment, and an assignment needs a reviewer whose profile
reads `active` — and until `20261220000100_reviewer_register.sql` nothing in the
application could put a profile in that state, so no course could be published
through the product at all. `/admin/reviewers` is where governance staff check an
applicant, grant the subjects they may judge and hear the conflicts they declare;
`/review` is where a person applies, records their qualifications and stands aside
from work they cannot judge impartially. Declaring a conflict bars an assignment
immediately, before anybody reads it, and only a written assessment lifts it.

A course can now be required to be reviewed by somebody who knows the subject.
`content_review_requirements` says what a version needs — this subject, this scope,
this many approvals — and two rules read it: publication is refused while one is
open, and a reviewer who is not authorised for the subject cannot even be assigned.
Neither rule could fire before, because nothing could write a row, and nothing could
close one either: a requirement was a door that locked from the inside. An approval
from a reviewer authorised for the subject now closes it, a governance admin can
waive it in writing, and the panel says when no living reviewer could close it at
all.

An adult can now share their own learning, and take it back. Adult learning is
private by default, including inside a family, and `adult_learning_shares` had
said so since the first week — three scopes, an expiry, a revocation the status
is tied to — while nothing wrote a row and nothing read one either, so a share
would have granted nobody anything. `/account/sharing` is both seats: who can see
my learning, granted to one account for one scope for a length you choose, and
whose learning has been shared with me, with the terms shown to the reader as
well as the owner. It sits behind `family.adult_shares`, which ships off; reading
and revoking are not gated by it, because turning a feature off must not strand
somebody's privacy decision with no way to end it.

Money is now reported in one currency. The platform charges in whatever a family
has — UGX in Kampala, NGN in Lagos, GBP in Birmingham — and `currency_exchange_rates`
had been built with an index shaped for exactly the question it answers while nothing
could write to it, so every money screen summed mixed currencies together, which is
not a number. `/admin/exchange-rates` is the shelf: a rate is recorded with a source,
because a rate nobody can attribute cannot be checked when a total looks wrong, and a
rate more than ten times the previous one for its pair needs a written reason, because
a slipped decimal is a hundredfold error that looks reasonable on screen.
`/admin/money-report` converts a period into `finance.reporting_currency` (USD), names
the rate beside every figure, and lists the money it could not convert as a gap rather
than guessing it — an unrecorded pair resolves to nothing, never to 1. It totals
credits and debits separately and produces no single net figure, because what nets
against what is a business decision recorded as open rather than assumed by a query.
The same migration gives `financial_transactions.fx_rate`, `fx_source` and
`fx_observed_at` their first writer: a settlement in another currency is refused unless
a rate is recorded, so FX provenance has one source and cannot be typed in beside the
figure it justifies.

`/admin/revenue` answers the other money question, and answers it without converting
anything: what sold, by currency, by course, by plan and by teacher, with what was
refunded beside it. Gross, refunded and net are three columns rather than one net
figure, because a report that subtracts silently is how a platform finds out a year
late that it refunds more than it sells. Currencies are never added — that is what the
money report is for, at a rate somebody recorded — and plans are kept apart from
courses. A sale is attributed to a course only when its product maps to exactly one;
a two-course bundle is listed under the product rather than guessed at. Teacher figures
are read from `instructor_earnings_entries` with the share snapshotted on the day of the
sale, never recomputed at today's rate, and a reversed entry is shown as reversed
instead of being quietly subtracted. The page checks the report against itself
(`net = gross − refunded`, no refund above what was taken, no currency twice) and says
so rather than choosing a figure when it disagrees.

An order is now created by the platform rather than by the browser.
`orders_insert` and `order_items_insert` decided who could write the money rows by
asking one question — is this person a member of the billing account? — and a payer
is, so a payer could write those rows directly through PostgREST: an order with any
total, and a line naming any product in the catalogue at a unit price of zero, with
no price behind it. Both CHECKs on the tables are satisfied by that, and
`record_payment_success()` fulfils from `order_items.product_id`, so paying the
order's own total delivered whichever course had been named. The validation existed
and lived in TypeScript, in one of the two paths to the table.
`create_course_order(course_id)` now re-derives the offer from the catalogue,
resolves the payer's own billing account, and writes the order and its single line
itself; both insert policies are dropped, so the definer writers are the only way
an order comes into existence and a payer still reads their own invoice.
`commerce.checkout` is enforced inside it, which makes that flag load-bearing for
the first time — it was registered and read by nothing, so "ships off" was untrue
for checkout specifically.

The price is no longer something the buyer's browser can name. Until
`20261230000100_market_by_country.sql` the writer took a price id and accepted any
live one, and the buy page listed every market's price set for a course, so a
payer could buy at another country's price and the cheapest market was open to
anyone with a network tab. The country now chooses the price: an exact match on
the buyer's country, then the price that declares no market, then a refusal naming
why. The country itself comes from the request's address on a first purchase and
from the billing account afterwards, and only finance staff can move it, in
writing. `resolve_course_price()` is the single resolver, so the sentence on the
buy page and the amount on the order cannot disagree.

An order's total is now held against the parts that make it up. `orders_totals_agree`
kept an order internally consistent and nothing kept it honest about its own rows:
`subtotal_minor` was not held to the sum of the lines, `order_adjustments` had the same
`is_billing_member()` insert policy that let a payer write an order and no reader at all,
and there was no column for a fee, so a provider charge was either folded into the tax
column — a lie on an invoice — or into the total, which the CHECK refuses. `orders.fee_minor`
exists, the identity is `total = subtotal − discount + tax + fee`, `add_order_adjustment()`
and `void_order_adjustment()` are the only way an adjustment happens (finance admin or
platform admin, before payment only, with a written reason, and a voided row stays
readable so the total can be reconstructed), the client-side insert policy is dropped, and
a trigger refuses to let an order become paid while any of its columns disagrees with the
rows behind it — which is the moment a capture is written for the total and a teacher's
earnings are accrued from it. `/orders` shows the breakdown and every adjustment on the
invoice, including withdrawn ones.

Finance can now see the orders it is allowed to adjust. `/admin/orders` lists every
order that has not been paid yet — the only kind whose total can still change — with the
account it belongs to, its lines, and its total broken into subtotal, discount, tax and
fee, and records a discount, tax, fee, shipping or rounding against one with a written
reason, or withdraws one with a reason rather than deleting it. The list comes from
`admin_orders_overview()`, a definer reader gated on the same role pair as the writers,
because `orders_read` is a payer's own invoice: widening that policy to staff would have
handed every order on the platform to every privileged role including `support_agent`,
whose job is one order that already has a case open. Paid orders are absent on purpose —
their total is history — and the page says where their instruments are.

A teacher can now store 50 GB of masters, and no more. `platform.cost_controls` has been
registered since the flag table was written with a note saying what was missing — *"Nothing
exists. Unlimited teacher uploads is how $250/month becomes $3,000"* — so per-file limits
existed and nothing limited the total. The quota counts master bytes, not the renditions
derived from them (the 1080p/720p/480p/360p ladder stores about 2.1× the master and is the
platform's choice, not the teacher's), it counts quarantined and pending files because they
are still bytes in a bucket, and it gives space back when a teacher withdraws a file.
Enforced at initiate on `/api/media`, where a teacher can still be told, with a refusal that
names the space left; off by default behind `platform.cost_controls`, so switching it on is
a decision rather than a deploy.

A purchase that would grant nothing new is refused. `create_course_order()` derived
everything about an order from the catalogue but never asked whether the buyer already had
the course, so an account with live access could pay for it again — nobody defrauded,
because fulfilment skips an entitlement that exists, but a family charged for air and
refunded later. The refusal fires only when the order would grant nothing at all: a live
`purchase` entitlement for that exact course version, on a learner profile belonging to an
active member of the account that would pay — which is precisely what fulfilment skips. A
subscription grant does not block, because it ends with the subscription and buying outright
adds permanence; a lapsed entitlement, another version, another course and another account
all pass. And because the grant is per account, twins are covered by one purchase and are
never the ones refused.

A discount is now shared with the teacher who gave it. A teacher's gross was the sum of
the order's lines — the subtotal — so a discount recorded before payment came entirely out
of the platform's margin while the teacher still earned a share of the pre-discount price,
and an order discounted to nothing still accrued more than it collected. The credits are now
apportioned across the teachers who actually earn from the order, in proportion to their
lines, with the leftover minor units going to the largest remainders so the split is exact;
gross is the line total less the teacher's share and `instructor_earnings_entries` records
what each teacher bore, so a row still explains itself a year later. At the platform's 50%
share a 10 000 discount costs the teacher 5 000 and the platform 5 000. Only credits are
shared: a fee is the platform's cost and tax is remitted.

Free previews now have one consistent gate from the catalogue to content
access. Teachers can mark draft lessons and individual public-sample resources;
those settings are audited and freeze with the published version. The
`learning.previews` admin flag is off by default: while off, anonymous reads and
the free-entitlement bypass are both denied. When on, only preview lessons and
resources explicitly classified as public samples are exposed; the preview
bypass cannot unlock enrolled-only materials. A public sample page is linked
from the course outline, and the teacher editor explains when previews are
prepared but globally disabled.

A learner can keep private study data on the lesson page: one note and one
bookmark per lesson per enrolment. Both tables are new, and both are gated by
`learning.notes_bookmarks` in the database rather than only in the UI, so a
direct PostgREST call is refused while the flag is off. Ownership is taken from
the session, not the request body, and the row must point at an enrolment the
caller may act for whose pinned version actually contains that lesson — a note
cannot be attached to a version the learner never accessed. Transcripts, which
the old flag description bundled in, are not built and are no longer claimed.

A teacher marking a written answer can say something as well as award a number.
Feedback is written in the same statement as the mark, inside the window the
immutability trigger opens, so a comment cannot be quietly rewritten after the
fact; the learner reads it under "Your marked attempts". The audit log records
that a comment was given and not what it says. The results screen deliberately
does not list which automatic questions were right — that information is already
readable by the learner through RLS, but a results page that reports every wrong
answer becomes an answer key for the next attempt, and these assessments are
reusable by design.

A learner can save a course from its page and keep a private note against it, and
`/saved` lists what they kept with whether each course is available, not
published yet, or no longer offered, and whether someone in the family is already
enrolled. The list belongs to an account rather than to a learner profile: every
other learner-scoped thing on the platform asks "who is learning?" at enrolment,
where it matters, and asking it again on a bookmark would turn the one effortless
action into a form. The note carries that intent instead. Owner ids are taken
from the session and never accepted from a caller, removal is not flag-gated so
switching the feature off cannot trap a list, and a hundred saved courses is the
ceiling. `learning.wishlist` ships off.

Marked homework now has its own tables and workflow, separate from quiz
questions: `/teach/[courseId]/assignments` creates work beside a published,
frozen version; `/learn/[enrolmentId]/assignment/[assignmentId]` saves and
submits a private written response. Self-paced deadlines are measured from each
learner's enrolment; a cohort assignment has one absolute date. The course
author and privileged staff can mark; score and feedback are visible only to
that learner/their family and the marker. Cohort data is version-pinned, and a
learner or guardian opts in; learners cannot browse other families' roster
rows. `/teach/[courseId]/cohorts/[cohortId]` shows the teacher who opened a class
each member's progress in the version that class teaches, ordered by who needs a
nudge, and it is the only place a learner's name meets their pace: the predicate
in SQL requires an active membership of a cohort pinning that version, so a
self-paced learner stays invisible, and so does somebody who left. `learning.cohorts` and `learning.assignments` both ship off while cohort
screens and secure file handling are incomplete. The database accepts only
verified PDF/image/audio asset references (25 MiB each, at most 10), but no
bytes are transferred, scanned or securely delivered yet; the UI is text-only.
A learner gets one submission per task; revision/resubmission is not built.

Learners can rate and review a course they are enrolled in, from the course
page, and staff read anything they wrote at `/admin/course-reviews`. The rules
that make the number mean something are in the database: enrolled learners only,
one review per learner per course, an account reviews as itself rather than as a
child in its family, and the course author cannot review their own course. A
rating with no words is counted immediately — there is nothing to moderate — and
words are held until a person publishes them, so leaving a review stays a
two-tap action. Editing text sends it back through moderation, otherwise
updating is a way to publish an unreviewed sentence. A review is a satisfaction
signal and never reaches the publication workflow, which the tests assert
directly rather than by convention. `learning.reviews` ships off; the catalogue
badges that would advertise a score stay behind their own flag.

There is a help desk. `/support` opens a case and lists the ones already open,
`/support/<caseNumber>` holds the thread, and `/admin/support` is the staff
queue. Case numbers are human (`SC-000123`) because a support conversation
happens partly outside the product and a uuid cannot be read aloud. Internal
notes are staff-only in the read policy, not filtered in the application, so a
requester is never one query away from seeing them. A requester who replies to
a resolved case reopens it, which is what stops the queue reporting a
resolution rate it has not earned. `platform.support` ships off, and turning it
off stops new cases while leaving the ones in flight answerable — a kill switch
that strands live conversations is worse than none. On the staff side of a case
there is also its history: one definer function reads the orders, subscriptions,
access grants, enrolments, course publication events and progress shares behind
the question, scoped to the person who asked rather than to the person answering,
and six tables that were written for exactly this and read by nothing else stay
closed to every other path.

Subscription plans are now configurable in `/admin/plans`: staff create a
plan, versioned learner allowances, subject/feature entitlements and recurring
prices. Activation refuses a plan version with no entitlement or no live price.
The customer path is now wired too: `/plans` starts a pending order from the
server-resolved price and selected learner; only payment confirmation activates
the subscription and grants time-bounded access. `/subscriptions` allocates
additional household learners and cancels with a reason; cancellation keeps
already-paid access through the period end. Live provider credentials and
renewal processing remain separate preconditions (P12).

The teacher revenue share is configurable from the admin dashboard by a
finance or platform admin, with a required written reason and audit entry. It
was seeded at 0% because no percentage had been chosen and a migration is not
entitled to invent one; on 2026-10-19 the owner chose **50%**, so that is what
the register ships. Each earnings entry snapshots the share it accrued under, so
changing the setting never rewrites money already booked. Settling the
percentage does not open payouts: the workflow stays closed until the four
payout preconditions are settled, and tax treatment, processing fees and
uniform-or-per-teacher terms are still open.

Finance can record and review dispute cases from `/admin/disputes`. Amounts
must match the internal transaction's currency and not exceed its value; status
changes require notes and follow a fixed review path. This is an internal case
log, not a provider evidence submission.

Teachers can curate ordered learning paths in `/teach/paths`. Publishing
requires at least one active course with a published version; changes to
published paths require a draft, and retirement is reasoned and audited. The
learner page at `/paths` and its home-page link are gated by `learning.paths`,
which stays off until path content has been authored. Paths organize courses;
they do not grant or bundle access, so the existing enrolment and payment rules
remain authoritative.

Teachers can add lesson-level source citations from the draft curriculum editor.
An atomic RPC creates the source and link, records the actor, and enforces D5:
source citations are part of the version subtree and lock when published.
`learning.provenance` gates learner display; when on, citations show the source,
edition, locator, usage anchor and optional HTTPS link. Existing source tables
are now guarded against post-publication edits as well as writes through the UI.

When a published course needs revision, its author can create a draft from the
course editor. The audited copy includes the curriculum, assessments, completion
requirements, citations and existing product/price links. The new draft has new
content IDs; learners already enrolled remain pinned to their original version.
A course with an existing draft or review in progress cannot be copied again.

The draft curriculum editor now has up/down controls for sections, lessons and
lesson resources. Each move swaps with the nearest item in that list in one
audited database transaction; the controls stop at the ends of each list, and
non-draft versions remain locked.

Instructors can prepare a public profile at `/teach/profile` and share it at
`/teachers/<slug>`. It contains only teacher-authored biography, HTTPS social
links and published courses; reviewer qualifications remain confidential and
are not implied by the profile. Public RLS requires both the `teaching.public_profile`
flag and an active instructor role, so turning the flag off or revoking the role
hides the profile at the database boundary as well as at the page.

Finance can reconcile a provider statement from `/admin/reconciliation`.
Signed minor-unit rows are matched to ledger transactions by provider reference,
currency, amount and settlement period. Missing, ambiguous and discrepant lines
stay visible; close requires a finalised run and a written reason. No provider-
specific import format is assumed while P12 credentials and statement formats
remain undecided.

Finance can record a correction from `/admin/financial-adjustments`. Signed,
append-only amounts link to an order or transaction and require finance/platform
admin plus a reason. A full-refund earnings clawback is computed from already
paid instructor entries and recorded as one negative adjustment; paid earnings
are not rewritten and the adjustment itself does not transfer funds.

A course can be assessed: `create_assessment()`, `add_assessment_question()` and
`activate_assessment()`. The database writer existed, but no teacher tools
exposed it; course quizzes and assessment-based completion rules were therefore
unusable from the product. Course authors can now create assessments, add
automatically graded single/multiple-choice or true/false questions, then
activate them from `/teach/<courseId>`. The editor never reads answer keys back.
Learner submission auto-grades objective questions inside the database; written
answers appear in the course-author/staff marking queue, and the final attempt
score is recorded after the last manual response is graded. Marks are audited,
and clients cannot call the lower-level grading RPCs directly. Publishing now
**refuses a version with a draft assessment left behind** — D5 would freeze it
invisible to learners.

Certificate workflows are now reachable end to end: `/admin/certificates` lists
completed eligible enrolments, issues certificates, and permanently revokes them
with a reason. The client-facing issuance/revocation calls are bound to the
session (no caller-supplied actor id); the admin RPC returns only the certificate
number rather than learner-linked records. Holders can view and print/save their
snapshot as a PDF from `/certificates/<number>`, with public verification at
`/verify/<number>`.

Families are set up from `/family`: an adult can now create a family space,
add children with age bands (no birth date or child login), and see each child’s
course progress. `create_family()` writes the family and its owner membership
in one transaction, so there is no ownerless family state. Guardian verification
remains a separate, explicit flow and is not bypassed by adding a child to a
family. When `family.guardian_verification` is enabled, the database also blocks
new child enrolments until the enrolling account has an active, reviewed
relationship with learning permission; the default-off flag must be enabled
before any US child enrols.

A course can be sold: `create_product()`, `link_product_course_version()`,
`set_product_price()` and `activate_product()`. Until then every table on the
revenue path had zero rows and no writer, so nothing could be bought and no
teacher could earn. A teacher owns the product and attaches their own published
course; **only staff can set a price or put it on sale** — that split was
already in the row-level policies and is not reversed here.

Uploads belong to us, not to whoever linked them: `register_media_upload()`
creates the `media_assets` row and derives the storage key, and an upload
becomes available only when staff confirm it. An uploader cannot promote their
own file — that hole was found by running the sequence, not by reading the
policy.

A message inside the product no longer arrives uninvited. `/notifications` holds
what happened — a payout sent, failed or staff-cancelled — and what is about to
happen, computed at read time from the live-class and subscription rows so a
reminder cannot go stale. Both halves now respect a choice:
`notification_preferences` keeps one row per person per kind, and
`my_notifications()` and `notification_badge()` filter on it, so a muted kind is
hidden and uncounted while the message itself is kept and comes back still unread
when it is switched on again. Two kinds cannot be switched off at all — a payout
that failed or was cancelled is how somebody finds out that money did not arrive —
and a hand-written row does not get round it, because the lock lives in the read
path as well as the writer. A reminder whose feature ships off says it is not in
use yet rather than pretending the switch does something.

A shelf now says how many it holds. `catalogue_page()` answers what is on the
catalogue, in what order and how many there are altogether, so `/catalogue`,
`/young` and `/adults` page twenty-four at a time and write `Showing 25–48 of
137` rather than ending quietly. It also closed three defects that came from
having two read paths: a suspended course stayed browsable while search hid it,
sixty was a silent limit, and the subject filter ran after the limit instead of
before it.

(The trigger count is user-defined triggers. `pg_trigger` also holds 1007
internal constraint triggers; counting them gives 1140, which is the number
that produced an earlier, inflated figure in this file.)

All five original logical groups are complete. `discussion_posts` was the
89th table, added for per-lesson discussion after those groups closed. The
teacher profile feature adds the 90th table. Private lesson notes and
bookmarks add the 91st and 92nd, the help desk adds the 93rd and 94th,
learner reviews the 95th and saved courses the 96th. Dated cohorts add the 97th
and 98th, marked assignments add the 99th, 100th and 101st, and the record of a
marked version a learner revises is the 102nd.
Governance channels (content reports and review appeals) use the existing
`content_reports` and `governance_appeals` tables rather than adding new ones.

All five logical schema groups are built. Every frozen decision — D1
multi-tenancy, D2 child identity, D4 money, D5 version pinning, D6 content
licence, D7 deletion, D8 media masters, D9 translations — is enforced in SQL
rather than in application code, which is the only place it survives a second
developer or a second AI-generated query.

## Web app

`web/` is a Next.js 16 + TypeScript app with Supabase Auth wired: email and
password, phone OTP with E.164 normalisation, and a `/learn` screen that reads
enrolments with no client-side filter — row level security decides what comes
back. `supabase/tests/app.test.mjs` pins that contract.

```bash
npm install
cp web/.env.example web/.env.local   # then set your project URL and anon key
npm run dev
```

See `web/README.md`.

### Why 102 tables when the design specified 85

Seventeen tables beyond the original 85 were needed for recorded decisions, the
chosen discussion experience, teacher-authored public profiles, private study
data, the help desk, learner reviews, saved courses, dated cohorts, marked
assignments and the revision loop that makes feedback actionable:

- `institutions` — D1 multi-tenancy had no table to hang `institution_id` on
- `media_assets` — D8 requires originals in storage we control, with a checksum; the provider is **Cloudflare R2**, chosen 2026-10-20 from `docs/decisions/media-storage-costing.md`. A browser hashes the checksum a slice at a time (`web/src/lib/digest.ts`), so the ceiling on one upload is storage's own 5 GiB limit on a single request rather than the memory of a tab
- `media_renditions` — the delivery copies a learner is actually served, one row per profile, staff-written; a master is the archive and is never handed to a learner's browser. Three people may watch a master — whoever uploaded it, platform staff, and the author of a version whose lesson uses it while it is available — through `master_preview_target()`; a reviewer is deliberately not one of them, and gets the delivery copy instead. A copy that failed to encode is not a dead end: staff retry it from `/admin/media` with a written reason, which the worker deliberately cannot do for itself
- `platform_settings` — without it, "build it all, enable it later" had
  nowhere to live; `governance.panel_required` is a row, not a constant
- `discussion_posts` — per-lesson discussion, explicitly wanted for the product
- `instructor_public_profiles` — public teacher biographies and owned social links, separate from internal reviewer qualifications
- `lesson_notes`, `lesson_bookmarks` — the notes/bookmarks flag existed in the
  register with no tables behind it; a note and a bookmark have different
  lifecycles (one is edited, one is toggled), so they are separate tables
- `support_cases`, `support_case_messages` — a case and its thread have
  different readers: staff see internal notes on a message that the person who
  opened the case must never see, which is a row-level distinction rather than
  a column on the case
- `course_reviews` — the register had the flag and no table; a review is not a
  `content_report` (it is an opinion about a course, not a defect in a lesson)
  and not a review decision (which is scholarly and gates publication)
- `course_wishlist` — the register had the flag and no table, and its
  precondition ("only meaningful once checkout is on") was true of paying and
  false of saving: a course can be free, unpublished, or under discussion in a
  family about which child it is for
- `cohorts`, `cohort_members` — a published course version freezes its lessons and quizzes, so dated group work needs a class alongside the immutable version. Membership writes are session-bound; learners see only themselves and their family, not the roster; joining requires an exact-version enrolment. Registration closes at a teacher-set `join_closes_at`, defaulting to the start date and movable while the class runs; shutting the window governs arriving, not staying. `learning.cohorts` ships off pending the safeguarding review of files children send.
- `course_assignments`, `assignment_submissions`, `assignment_submission_assets` — a separate task can be created after publication, carry an enrolment-relative or cohort-absolute deadline, and receive one private learner hand-in with text and verified file references. Marks/feedback are private and audited; no bytes or public object keys are stored. `learning.assignments` ships off until safe upload, scanning, delivery/retention and late-join policy are reviewed.
- `assignment_submission_revisions` — feedback a learner cannot answer is decoration, so marked work can be reopened as a draft and handed in again. The version that was marked is snapshotted here before the live row is cleared: append-only by trigger, readable exactly where its submission is readable, and it holds file *ids* rather than bytes. Reopening past a deadline is refused on a task that does not accept late work, because the alternative is a learner trading a grade for a draft they can never submit.
- `notification_preferences` — the message table is a record of what the platform did, so a person's choice lives beside it rather than in it: one row per person per kind, absent meaning on, and two kinds the writer refuses because they report money that did not arrive. Muting therefore hides a message without deleting it, and a hand-written row cannot silence one.

Learning paths reuse the existing `learning_paths` and `learning_path_items`
tables; this work adds their audited writers and the teacher/learner screens,
not another table.
