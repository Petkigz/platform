-- delivery.transcode: the switch for encoding delivery copies of a master.
--
-- WHY A FLAG FOR A BACKGROUND PROGRAM
-- ------------------------------------
-- The worker is not a screen, so it is tempting to leave it ungated: it cannot
-- be reached from the app. That is exactly the reasoning that lets a half-built
-- path run. Encoding writes rows into `media_renditions` and objects into the
-- renditions bucket, and `confirm_media_rendition()` is what makes one of those
-- rows servable to a learner. Turning that on is a release decision, so it is a
-- flag like any other, and it is the same switch an admin would look for.
--
-- The worker reads this row before it does anything else and refuses to run
-- while it is false. It also refuses without Cloudflare R2 credentials and
-- without a privileged identity, so three separate things must exist before a
-- single rendition is encoded. This flag is the one an admin controls.
--
-- gate_type 'code', not 'admin': enabling it here does not start a process. The
-- worker still has to be deployed on a host with ffmpeg, with R2 credentials in
-- its environment and with an account that `/admin/roles` has made staff.

insert into public.platform_settings
  (key, value_type, value_text, description, gate_type, preconditions, flag_group)
values
  ('delivery.transcode', 'boolean', 'false',
   'Encode delivery copies (renditions) of an uploaded master, and mark them servable',
   'code',
   'Worker deployed on a host with ffmpeg; Cloudflare R2 credentials in its environment; '
   'a privileged worker account granted through Roles; playback route that mints rendition URLs',
   'Delivery')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Two comments said the worker did not exist. It does now.
-- ---------------------------------------------------------------------------
-- A comment is a claim about the world, and both of these became false the day
-- web/src/worker/transcode-worker.ts landed. They are corrected here rather than
-- by editing the migration that wrote them, because that one has been applied.

comment on table public.media_renditions is
  'Delivery copies of a media master, one row per profile. A learner is served from here and never from media_assets. Staff-written; the transcode worker (web/src/worker/transcode-worker.ts) is the only writer, and it is gated by delivery.transcode.';

comment on function public.register_media_rendition(uuid,text,text,bigint,integer,integer,integer,integer,text) is
  'Staff-only. Opens a pending rendition of an available master and derives its bucket and object key. Called by the transcode worker, which runs as a privileged account and refuses to run while delivery.transcode is off.';

comment on function public.confirm_media_rendition(uuid) is
  'Staff-only. The only path from pending to available, so a rendition cannot be served before its bytes have been uploaded and somebody has verified the encode.';

