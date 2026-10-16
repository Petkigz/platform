# SCREENS

The plan has 85 tables and 121 endpoints, and **zero screens** — `screen: 1`,
`navigation: 0`, `page structure: 0` in the whole project record. This file is
the inventory that was missing.

Rule: **one design per distinct screen.** Web, Android and iOS are the same
codebase (Expo/React Native), so they are not separate screens — they are
responsive states of the same screen. Mocking them separately inflates a count
without adding design work.

Status:
- `READY`   — underlying data and API exist; can be designed now
- `BLOCKED` — the feature behind it does not exist or is blocked on a fact

---

## 1. Public / marketing — 7

| # | Screen | Status |
|---|---|---|
| 1 | Landing page | READY |
| 2 | About the platform | READY |
| 3 | Young Learners entry | READY |
| 4 | Adult Learners entry | READY |
| 5 | Course catalogue | READY — needs `subject_areas` taxonomy populated |
| 6 | Search and filter | READY |
| 7 | Pricing and subscriptions | BLOCKED — no price points exist |

## 2. Access — 3  *(missing from the source list entirely)*

| # | Screen | Status |
|---|---|---|
| 8 | **Sign in / register** | READY — auth method undecided (see `auth.email_password`, `auth.phone_otp`) |
| 9 | **Add a child profile** | READY — name + age band, no date of birth |
| 10 | **Learner switcher** | **BUILT** — the enrol button asks "who is learning?", and `/learn` labels each course with whose it is |

## 3. Young learners — 9

| # | Screen | Status |
|---|---|---|
| 11 | Child home | READY |
| 12 | Age-band selection | READY |
| 13 | Course page | READY |
| 14 | Video lesson | **BUILT** — `/learn/[enrolmentId]/lesson/[lessonId]` |
| 15 | Interactive lesson | READY — shares the lesson route, no interactive player yet |
| 16 | Quiz | READY |
| 17 | Results | READY |
| 18 | Progress and achievements | BLOCKED — engagement mechanics undesigned |
| 19 | Parent dashboard | READY |
| 19a | **Guardian access request** *(added — was missing from the inventory)* | **BUILT** — `/family/guardians`. Behind `family.guardian_verification` |
| 19b | **Guardian verification queue** *(added — was missing from the inventory)* | **BUILT** — `/admin/guardians`. Privileged only |

## 4. Adult learners — 7

| # | Screen | Status |
|---|---|---|
| 20 | Adult home, led by "continue where you stopped" | READY |
| 21 | Course details | READY |
| 22 | Video lesson *(adult chrome)* | **BUILT** — same route as #14, chrome not yet differentiated |
| 23 | Qur'an / audio player | READY |
| 24 | Quiz or exam | READY |
| 25 | Progress | READY |
| 26 | Certificate | READY |

## 5. Learning, shared — 2  *(missing from the source list)*

| # | Screen | Status |
|---|---|---|
| 27 | **Per-lesson discussion** | READY — wanted and confirmed; moderation policy undecided |
| 28 | **Notes and bookmarks** | BLOCKED — tables do not exist |

## 6. Teaching — 6

| # | Screen | Status |
|---|---|---|
| 29 | Teacher dashboard | READY — 0 teacher endpoints exist yet |
| 30 | Create course | READY |
| 31 | Curriculum builder | READY |
| 32 | Learner analytics | READY |
| 33 | Course submission and review | READY |
| 34 | Earnings | BLOCKED — `teaching.payouts` is CODE, no fields, no endpoints |

## 7. Administration — 9

| # | Screen | Status |
|---|---|---|
| 35 | Admin home | READY |
| 36 | Users | READY |
| 37 | Teachers | READY |
| 38 | Course approval | READY |
| 39 | Payments | **BUILT** — `/orders` shows status from the database, not from a redirect |
| 40 | Revenue analytics | BLOCKED — `delivery.analytics` is CODE |
| 41 | Certificates | READY |
| 42 | **Settings and feature flags** | READY — **critical path, missing from the source list.** No settings table exists |
| 43 | Support cases | BLOCKED — 7 endpoints, no `support_cases` table |

## 8. Payments — 4

| # | Screen | Status |
|---|---|---|
| 44 | Checkout | **BUILT** — `/courses/[slug]/buy`. Price selection and order creation work end to end; the provider hand-off needs P12 |
| 45 | Mobile money confirmation *(one screen, MTN and Airtel are parameters, not two designs)* | READY — the buy form takes an E.164 number and handles the `pending` result; needs a provider to prompt |
| 46 | International card payment | BLOCKED |
| 47 | Subscription management | BLOCKED |

## 9. Certificate verification — 1  *(missing from the source list)*

| # | Screen | Status |
|---|---|---|
| 48 | **Public certificate verification page** | READY — `GET /api/v1/certificate-verifications/{token}` already designed |

## 10. Mobile-specific — 2

| # | Screen | Status |
|---|---|---|
| 49 | Notifications and preferences | READY |
| 50 | Offline / downloaded lessons | BLOCKED — entitlement rules, protected media, storage limits all undecided |

---

## Counts

| | |
|---|---|
| Distinct screens | **50** |
| Ready to design now | **38** |
| Blocked | **12** |

**Not separate screens** (the source listed them as four): Android home,
Android learning, iOS home, iOS learning. One codebase, so these are responsive
states of screens #11 and #14. Mobile adds only #49 and #50.

## Missing from the source's list of 48

1. **Sign in / register** — no auth screen in 48 mockups, on a project whose
   top priority is ease of use.
2. **Settings and feature flags** — the critical path for "enable later from
   admin."
3. **Add a child profile** — the parent's first real task.
3a. **Guardian verification** — two screens, absent from the original 50, one of
    them COPPA-mandatory. A consent process with no screen to action it is not a
    consent process. Added as 19a and 19b rather than renumbering.
4. **Learner switcher** — the hard part of the two-audience design.
5. **Per-lesson discussion** — wanted and confirmed.
6. **Public certificate verification page** — the endpoint already exists.
7. **Empty, error and loading states** — where "as easy as possible" is
   actually won or lost.
