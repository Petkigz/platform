# NEXT

One milestone. One page. When it's done, rewrite this file.

**Test:** can I answer "what am I doing today?" in one sentence?

---

## Done: Group 1, and the content half of Group 2

**18 tables migrated, RLS on every one, 59 tests passing** — `npm run test:db`
runs the real migration files against a real PostgreSQL engine.

*Group 1 — identity, family, guardians, privacy:* `institutions`, `roles`,
`user_profiles`, `user_role_assignments`, `families`, `family_memberships`,
`learner_profiles`, `guardian_relationships`, `guardian_verification_cases`,
`adult_learning_shares`.

*Group 2 so far — courses and content:* `courses`, `course_versions`,
`course_sections`, `lessons`, `lesson_resources`, `media_assets`,
`subject_areas`, `course_version_subjects`.

Decisions now enforced in SQL:
**D1** `institutions` + nullable `institution_id` · **D2** child login blocked
at the database level · **D5** a published version is immutable, and so is its
whole subtree · **D7** soft delete throughout, and a retired version is never
removed · **D8** media masters recorded with location and checksum · **D9** one
published version per course per language.

## Current milestone: Group 2, part 2 — learning and assessment

Twelve tables remain in the recorded Group 2:
`course_enrolments`, `course_enrolment_version_history`, `lesson_progress`,
`assessments`, `assessment_questions`, `assessment_attempts`,
`assessment_responses`, `course_completion_policies`,
`course_completion_requirements`, `learning_paths`, `learning_path_items`,
`certificates`.

### Today's sentence

> Migrate enrolments, lesson progress and certificates, with version pinning enforced.

### Definition of done

- [ ] Migrations apply cleanly on top of the 18 existing tables
- [ ] An enrolment pins one immutable version, and the pin cannot be changed
      after payment — this is what makes D5 worth anything
- [ ] A submitted assessment attempt is immutable, including its responses
- [ ] A certificate snapshots version, issuer and issued-to, and carries a
      verification token hash
- [ ] Certificates are never hard-deleted (D7); revocation is a status
- [ ] Completion is evaluated by a server-side rule, not client input
- [ ] Tests extended in the same style as `group2.test.mjs`

### Not now

Payments and entitlements (Groups 4–5) · governance (Group 3) · mobile ·
admin UI · learning paths beyond their tables.

### Known gap to close here

The record has **16 learner_experience endpoints** but no `support_cases`
table and no table for notes, bookmarks or transcripts. If learner progress is
being built, decide in this milestone whether notes and bookmarks get tables
now or are deferred deliberately.
