# Recording-specific resume: proposed test rollout

**Planning only. Do not apply or deploy without explicit approval.** The current
provider-hosted preview contains no real data and is not connected to this
change. Initial test-project application ended at migration 1350.

**2026-11-17:** the owner approved applying 1360–1450 to the test project
ahead of the application, because that project has no user and no row and the
grants migration (1440) cannot be applied without them. The one-time job, what
it checks and whether it has run are in `docs/deploy/README.md`, "The ten
after the first 342". That decision is about an empty project. The matching
app has not been deployed, and everything below is still what a project with
people in it needs.

## Before scheduling

- Complete the full CI database and web jobs, the selected PostgreSQL races,
  responsive Chromium and real-media smoke checks. Review failures rather than
  treating a cancelled or timed-out job as success. These checks do not replace
  real hosted PostgREST/Auth/RLS and browser testing.
- Inventory the target project's actual migration history and compare names and
  checksums to the reviewed local files. The old one-time initial apply workflow
  is not a general migration tool and must **not** be rerun. Use a separately
  reviewed, least-privilege migration procedure and dry-run the exact pending
  chain. Confirm ownership, grants, backup/restore options, target identity and
  data classification. Do not put database secrets in chat or logs.
- Review access revocation races, account/child closure and erasure interactions,
  database lock ordering and the operational capacity to quiesce writes. Decide
  how a maintenance window and reliable stale-tab reload will be enforced.
  Permission revocation does not cancel requests or transactions already running.
- Prepare throwaway learner/guardian/stranger accounts and a multi-recording
  course only with approval. Define cleanup and expected Auth, RLS and PostgREST
  checks first; never use real learner data in the temporary preview.

## Coordinated transition (requires an executable maintenance plan)

1. Freeze new resume writes and drain old application instances and in-flight
   database transactions. Verify the freeze independently; hiding a button or
   deploying new JavaScript does not stop a cached page or a direct RPC caller.
2. Apply the reviewed pending migrations in order, verify migration history,
   function ownership and grants, direct-table restrictions, resource CAS and
   retention/export behavior. Do not infer success from history rows alone.
3. Publish the matching resource-aware app while resume writes remain frozen.
   Check the old HTTP endpoints return 410 and ordinary authenticated roles
   cannot call old position writers or directly update position columns.
   Ensure stale pages are told to reload; plan for cached tabs that do not reload.
4. Under controlled test access, exercise separate recordings, two devices,
   deliberate rewind, concurrent completion, pinned versions, repeated conflicts,
   uncertain responses, explicit old-place choices and per-device recovery.
   Check guardian, stranger, closed account and deleted/archived learner paths
   through real Auth/PostgREST, not just a privileged SQL console. Confirm that
   temporary storage is default-off and opt-out removes both record formats.
5. Only after checks and owner approval, end the freeze and monitor safe aggregate
   errors and conflict rates without logging positions or personal identifiers.
   Keep an incident contact and a stop condition for ambiguous writes or access
   failures. Recheck that the preview remains data-free and guarded.

A deployment failure or partial migration needs reconciliation against actual
history and schema; never blindly rerun an initial apply. Do not restore the old
unconditional or lesson-wide writer as a quick rollback: it can overwrite a
reviewed position. If behavior is uncertain, keep saves stopped and inspect the
schema, traffic and data before proposing a separately reviewed recovery plan.
Local recovery cannot guarantee that an interrupted save survives, cannot be
cleared remotely, and may remain until later access or manual browser cleanup.
No test here proves that all browsers, concurrent authorization changes or
privileged service-role writes are safe.
