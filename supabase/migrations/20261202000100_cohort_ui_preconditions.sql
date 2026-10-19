-- The cohort UI and the text-assignment workflow are now wired. Keep the two
-- runtime flags off until the still-external product/safeguarding preconditions
-- are actually met; the admin register should not claim screens are absent.

update public.platform_settings
   set preconditions = 'Cohort data, exact-version pinning, opt-in join/leave, teacher management, learner join/leave screens and private-roster rules are built. The current join window remains open after the scheduled start until the cohort ends; review that late-join rule before enabling. A learner/guardian opts in; the author cannot silently add a learner.'
 where key = 'learning.cohorts';

update public.platform_settings
   set preconditions = 'Self-paced deadlines are relative to enrolment; cohort deadlines are absolute. The author and privileged staff mark. Late work is rejected by default and may be accepted per task. There is one submission per learner/task and no revision loop. Text hand-in and private feedback are built. Before enabling, connect trusted upload, byte verification/scanning, secure delivery and retention for the database allowlist (PDF/JPEG/PNG/WebP and AAC/MPEG/MP4/OGG/Opus/WAV, maximum 25 MiB each and 10 files), and review the cohort late-join rule.'
 where key = 'learning.assignments';
