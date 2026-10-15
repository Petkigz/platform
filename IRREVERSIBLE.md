# IRREVERSIBLE

**"So we don't have to redo anything" is not achievable.** Any plan that
promises it will make you design for a year. What *is* achievable is not
redoing anything **expensive**.

Most changes are cheap: add a table, add a column, add an endpoint, add a
screen, add a flag. Do those whenever you need them.

A small number of decisions are expensive to reverse, because they touch every
row, every query, every user, or a legal obligation. **Only these need to be
right before you build.**

---

## The nine that cost real money to change later

### 1. Multi-tenancy — the most expensive deferral on this list
`tenant: 0` in the project record. Institutions are in the vision (madrasahs,
Islamic schools) but the schema is single-tenant.

Retrofitting tenancy means adding a scoping column to most tables, rewriting
every query, and re-testing every authorization path. Doing it from day one
means adding a **nullable `institution_id`** to the right tables and a
"default" institution.

**Decide now, even if unused for two years.** Cheapest possible insurance in
the whole project.

### 2. Child identity model — already decided, do not reopen
A child is a `learner_profile` under a `family`, **not** a `user` with a login.
`child_login` comes later via a trusted linking workflow. This is correct and
it is irreversible once real children exist. Leave it alone.

### 3. Authentication model
Phone OTP and/or email + password, plus the session and refresh model.
Changing this after real accounts exist means migrating users mid-flight.
Decide before the first registration, not after.

### 4. Money and currency — already well designed, do not touch
`settlement` appears 7 times, `currency_exchange_rates` exists, money is
integer minor units, `idempot` appears 13 times. Original transaction currency
authoritative, settlement tracked separately, FX rate + source + timestamp
recorded. **This is one of the strongest parts of the design. Leave it.**

### 5. Course versioning and enrolment pinning — already right, do not touch
`pin` 7 times, `immutable` 9 times. Published versions immutable, enrolments
pin an exact version. Cannot be retrofitted once real enrolments exist.

### 6. Content ownership and licence
`licence: 0`, `content ownership: 0`. If a teacher uploads without a written
agreement, you cannot cleanly introduce one later — you'd have to renegotiate
with everyone who already contributed, from a weaker position.
**Needed before the first teacher uploads, not after.**

### 7. Deletion semantics and retention
`soft delete: 0`, `deleted_at: 0`. `anonymization` appears only as a
provisional recommendation. Deciding hard-vs-soft delete across 85 tables after
they hold real data is miserable, and retention law may force a specific
answer per category and jurisdiction.

### 8. Where original media masters live
Cloudflare Stream **cannot return your original uploaded file** — only
re-encoded H.264. Your course content is the asset.
**Masters go in object storage you control. Stream is delivery, not the archive.**
Cheap to decide now; unrecoverable if you discover it later.

### 9. How translations are modelled
`translation: 0`, `locale: 0`. Is a translated course a new `course_version`
of the same course, or a separate course? Both are defensible; retrofitting
whichever you didn't choose is not. Decide before the first course is authored
in one language and translated into another.

---

## Cheap to change later — do not design these in advance

Adding tables or columns · any screen · any endpoint · feature flags ·
gamification · companion tools · AI features · search implementation ·
analytics · notifications · the admin UI · mobile specifics.

If a decision can be reversed with a migration and a deploy, it is not on the
list above. Make it when you reach it.

---

## Newly found gaps

| Gap | Evidence | Why it matters |
|---|---|---|
| **Search infrastructure** | `full-text: 0`, `search index: 0` everywhere | Course search is a launch feature. `LIKE` queries will not survive a real catalogue. |
| **EU 14-day withdrawal right** | `withdrawal: 0`, `cooling-off: 0` | EU consumers have a statutory withdrawal right on digital content, with a specific waiver for content started immediately. Affects checkout wording and refund logic. |
| **Terms versioning and consent records** | `terms version: 0`, `consent record: 0` | Users accept v1, you publish v2. Without recorded acceptance you cannot prove what anyone agreed to. |
| **Age assurance** | `age assurance: 0`, `under 13: 0` | How do you know? Gates COPPA and the child model. |
| **Account merging** | `duplicate account: 0` | A parent will create two accounts. Merging after the fact is painful without planning. |
| **Phone number handling** | `e.164: 0`, `country code: 0` | International OTP breaks without normalised E.164 storage and per-country formatting. |
| **Email deliverability** | `spf: 0`, `dkim: 0`, `dmarc: 0` | Password resets and receipts land in spam without these. A day of setup, forgotten until it fails. |
| **Data portability** | `portability: 0`, `data export: 0` | A GDPR right. Cheaper to design than to retrofit across 85 tables. |
| **Teacher storage quotas** | `quota: 0` in the record | Teachers uploading unlimited video is how a $250/month video bill becomes $3,000. |
| **Teacher capacity for Q&A** | `overwhelm: 0` | Per-lesson discussion with an audience behind each teacher needs limits or a queue. |

---

## What to actually do

Settle the nine. Write each one into `DECISIONS.md` with a date. Then build,
and accept that everything else will change — cheaply, and on purpose.
