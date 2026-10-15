# NEXT

One milestone. One page. When it's done, rewrite this file.

**Test:** can I answer "what am I doing today?" in one sentence?

---

## Done: Group 1 and all of Group 2

**30 tables migrated, RLS on every one, 95 tests passing** — `npm run test:db`
runs the real migration files against a real PostgreSQL engine.

*Group 1 — identity, family, guardians, privacy (10 tables)*
*Group 2 — courses, content, enrolments, progress, assessments, completion,
certificates (20 tables)*

Decisions now enforced in SQL, not in app code:

| | |
|---|---|
| **D1** | `institutions` + nullable `institution_id` |
| **D2** | child login blocked at the database level |
| **D5** | a published version is immutable, and so is its whole subtree; enrolments pin a version and the pin cannot be moved without an audited reason; certificates snapshot |
| **D7** | soft delete throughout; retired versions and revoked certificates are never removed |
| **D8** | media masters recorded with storage location and sha256 |
| **D9** | one published version per course per language |

Also enforced: an author cannot approve their own course · answer keys are
unreadable, even via `SELECT *` · a submitted attempt is immutable · mixed
grading waits for the manual questions · completion is evaluated server-side
from recorded facts.

## Current milestone: Group 3 — content governance

21 tables in the record. **This group contains an open decision, so it cannot
just be built.**

### The fork — needs an answer

Group 3 includes `scholarly_panels`, `scholarly_panel_memberships`,
`scholarly_panel_cases` and `scholarly_panel_votes`. But **P6 in
`DECISIONS.md` proposes light peer review instead of a scholarly panel**, and
it is still PROPOSED, unanswered. The recorded roadmap's Phase 9 assumes a
panel; P6 says that is too heavy for a solo builder with no panel members yet.

These are mutually exclusive. Building both wastes work; building the wrong
one wastes more.

### Unblocked either way

These do not depend on the answer and can be built first:

`reviewer_profiles` · `reviewer_qualifications` · `reviewer_subject_authorizations`
· `content_review_assignments` · `content_review_decisions` ·
`content_review_requirements` · `content_sources` · `content_source_links` ·
`reviewer_conflict_declarations` · `content_reports` · `governance_appeals` ·
`publication_events` · `governance_audit_events`

`content_sources` is the source-provenance table the record already specifies
and one of the Qur'an-moat ideas depends on it having a UI.

### Today's sentence

> Decide P6, then migrate the reviewer and content-review tables.

### Definition of done

- [ ] P6 answered and recorded in `DECISIONS.md`
- [ ] Reviewer qualifications and per-subject authorisation migrated
- [ ] A reviewer cannot review a subject they are not authorised for
- [ ] Conflict declarations block self-assignment, and it is tested
- [ ] Review decisions are append-only and audited
- [ ] `content_sources` records provenance with a link back to the content
- [ ] Tests extended in the same style as `group2b.test.mjs`

### Not now

Commerce and entitlements (Group 4) · payments (Group 5) · mobile · admin UI.
