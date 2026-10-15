# NEXT

One milestone. One page. When it's done, rewrite this file.

**Test:** can I answer "what am I doing today?" in one sentence?

---

## Done: Group 1

Ten tables migrated — `institutions`, `roles`, `user_profiles`,
`user_role_assignments`, `families`, `family_memberships`, `learner_profiles`,
`guardian_relationships`, `guardian_verification_cases`, `adult_learning_shares`.

Row level security is on all ten. 23 tests pass against a real PostgreSQL
engine: `npm run test:db`.

Decisions applied: **D1** (`institutions` + nullable `institution_id`),
**D2** (child login blocked at the database level), **D7** (`deleted_at`
throughout, soft-delete frees codes).

## Current milestone: Group 2 — courses and learning

### Today's sentence

> Migrate the course structure: courses, versions, sections, lessons, resources.

### Scope

`courses` · `course_versions` (+ `language`, per **D9**) · `course_sections` ·
`lessons` · `lesson_resources` · `media_assets` (per **D8** — records where the
original master lives, not just the delivered file)

Carry `institution_id` onto `courses` (**D1**) and `deleted_at` onto all of
them (**D7**).

### Definition of done

- [ ] Migrations apply cleanly on top of Group 1
- [ ] Published versions are immutable — enforced by a trigger, and tested
- [ ] A submitted candidate is locked against ordinary editing, and tested
- [ ] `media_assets` records master location and checksum
- [ ] Tests extended in the same style as `group1.test.mjs`

### Not now

Progress, assessments and certificates (Group 2 continues) · payments ·
mobile · governance · admin UI.
