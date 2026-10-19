-- The teacher's share of a paid order, chosen: 50%.
--
-- This value was seeded at 0 with a note saying the number had not been chosen,
-- and it stayed there deliberately — a migration is not entitled to invent a
-- split of somebody's money. On 2026-10-19 the owner chose 50%: the teacher
-- keeps half of a course sale and the platform keeps the rest.
--
-- Why it is recorded in the register rather than left to be set from /admin on
-- deploy day: the register is the seed. Every fresh environment — CI, a staging
-- project, a second developer's machine — would otherwise start at 0 and
-- contradict a decision that has been made, and earnings accrue at whatever this
-- says at the moment an order is confirmed. A 0% share is not a neutral
-- default; it is the platform keeping everything a teacher earned.
--
-- Two things this does NOT do, both already enforced elsewhere and restated
-- here because they are the reason changing a percentage is safe at all:
--
--   * It does not rewrite earnings already booked. `instructor_earnings_entries`
--     stores `revenue_share_percent` per entry and the `iee_split_agrees` check
--     ties `net_amount_minor` to that snapshot, so an entry keeps the split it
--     accrued under. Only orders confirmed after this migration accrue at 50%.
--   * It does not enable payouts. `teaching.payouts` is CODE-gated and refused
--     by trigger, and no provider or payout policy exists. Money can now accrue
--     to a teacher's ledger; it still cannot be paid out.
--
-- What remains undecided is not the percentage but the terms around it, and the
-- register keeps saying so: tax treatment per country, who bears payment
-- processing fees, and whether the share is uniform or per teacher.

update public.platform_settings
   set value_text   = '50',
       description  = 'Percentage of a course sale that accrues to the teacher. Chosen at 50% on 2026-10-19; the platform keeps the rest. Changing it never rewrites earnings already booked, because each entry snapshots the share it accrued under.',
       preconditions = 'The percentage is chosen. Still to decide before the first real payout: tax treatment per country, who bears payment processing fees, and whether the share is uniform or per teacher. teaching.payouts stays CODE-gated until then.',
       updated_at   = now()
 where key = 'teaching.revenue_share_percent';

-- Audited like any other change to this setting, with no actor because none
-- exists: a migration has no session. `source` says so rather than leaving a
-- reader to guess whether the log lost an actor or the change had none.
insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
values (
  null,
  'teaching.revenue_share_changed',
  'platform_setting',
  null,
  jsonb_build_object(
    'key', 'teaching.revenue_share_percent',
    'previous_percent', 0,
    'new_percent', 50,
    'reason', 'Owner decision of 2026-10-19: a teacher keeps half of a course sale',
    'source', 'migration'
  )
);

comment on column public.instructor_earnings_entries.revenue_share_percent is
  'The share this entry accrued under, snapshotted from teaching.revenue_share_percent at confirmation time. Deliberately a copy: changing the setting must not rewrite money already booked. Seeded at 0, chosen at 50 on 2026-10-19.';
