-- One decision, one switch: `teaching.screening` was the other name for it.
--
-- `platform.safeguarding` and `teaching.screening` both described the same
-- decision — a recorded check plus a conduct acknowledgement for the people who
-- teach children. `platform.safeguarding` is the one the enforcement, the policy
-- and the reporting route were all built on, and on 2026-10-30 the owner settled
-- what it was waiting for, so it is now an ADMIN switch the owner holds.
--
-- `teaching.screening` was still CODE, and its precondition said what was
-- missing: "a conduct acknowledgement a teacher signs inside the product, and any
-- refusal that turns on it". Both exist since `20261281003100`, so that sentence
-- is false; and no line of code has ever read this key. A register that carries a
-- second name for a decision, with a reason that is no longer true, is worse than
-- no register: it is what the owner reads before switching something on.
--
-- So the row is removed rather than reworded. Nothing reads it, nothing audits
-- against it, and the decision it named is enforced by `platform.safeguarding`,
-- which names the same thing and does the work. If the teacher-side screens ever
-- need their own switch, it will be a new key added deliberately with its own row
-- — not this one revived by accident, which is why the removal is recorded here
-- and in DECISIONS.md.

delete from public.platform_settings where key = 'teaching.screening';

comment on table public.platform_settings is
  'Every feature, behind a switch, with the written precondition it is waiting for. One decision has one row: a duplicate key is a lie the owner reads before flipping anything.';
