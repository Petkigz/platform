# Resume reliability: work in progress

The intended behavior is to ask the learner when two players have conflicting
positions, including deliberate rewinds. Temporary on-device recovery requires
an explicit opt-in on each device and a clear shared-device privacy warning.

Migration 20261281136000 is an additive database foundation only. Its opaque
revisions rotate on every progress-row write, including legacy writes. The new
compare-and-write RPC checks the observed revision while locking an existing
row; an advisory transaction lock serializes competing initial inserts using
that RPC. A legacy concurrent initial insert can instead cause a unique
violation, which must be treated as an unconfirmed failure. A stale revision is
returned as a conflict rather than overwriting the saved position.

A separate `/api/learn/position-v2` route now exposes the snapshot and
compare-and-write RPCs with authenticated actor scope, strict input and response
validation, conflict responses and private no-store headers. Its route test uses
synthetic Auth/RPC dependencies. A separately tested recovery-storage helper
requires opt-in, scopes records by authenticated actor and lesson, isolates
player sessions and expires records when the storage is next accessed. Neither
is connected to the player yet. Storage cleanup cannot run while the browser is
closed, and localStorage cannot atomically compare and delete across tabs.

**Neither limit is fixed end to end yet.** The existing player and API still use
the old unconditional writer, which can overwrite a newer position. Existing
RLS-authorized progress updates can also write positions unconditionally. No
conflict prompt or opt-in device recovery UI exists. Do not deploy this
migration on its own as a fix. Integrate the player,
remove or protect all legacy write paths in a coordinated rollout, and test the
actual PostgreSQL interleavings, authorized roles and hosted Auth/RLS before
claiming cross-device safety. PGlite tests are sequential, not a concurrency or
hosted PostgREST test. Review concurrent enrolment re-pinning and authorization
changes too.

Even opt-in recovery cannot guarantee a position after storage is disabled,
cleared or fails, before any recovery record can be written, or if the learner
never returns to that browser profile. Do not promise lossless page-exit saves.
