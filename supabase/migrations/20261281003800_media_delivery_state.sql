-- Does the file a teacher uploaded actually play?
--
-- THE GAP
-- -------
-- `media_renditions_read` is `may_play_rendition(id) OR is_privileged()`, and
-- `may_play_rendition()` requires the copy to be `available` *and* its master to
-- be `available` *and* a lesson to reference that master which the caller can
-- reach. That is exactly right for serving bytes, and exactly wrong for
-- answering "is my upload ready yet": the person waiting for the answer sees
-- nothing at all.
--
-- So a teacher uploads a lesson recording. The master is verified and `available`
-- — `/teach/media` says **Ready to use**, because that is the master's status, and
-- it is true about the master. They attach it to a lesson. The lesson preview says
-- **our own file**, which is true about the source. Then a learner opens the
-- lesson and reads a sentence where the player should be: *uploaded, not yet
-- encoded for playback*. Everything on the platform was telling the truth and
-- nobody had been told the one thing that mattered.
--
-- The same silence hides the worse case. `failed` is never served, so it is
-- invisible to everyone but staff — which means an encode that died at 03:00 is a
-- lesson that will not play, discovered from a learner, and reported to the person
-- who cannot see the reason it gives.
--
-- WHAT CHANGES
-- ------------
-- Two functions, one per screen, each mirroring the access rule of the read it
-- stands in for. Neither widens `media_renditions_read`: a rendition row names an
-- object key, and the reason that policy is narrow is that a row is not a
-- permission to be served. What a screen needs is *how many copies exist and in
-- what state*, which is a count, not a row.
--
--   `lesson_delivery_state(lesson)` — for the lesson, whose author is asking
--   "what will a learner get". Guarded by the same three branches as
--   `may_watch_master()`: the uploader, the author of the version, a reviewer.
--
--   `my_media_delivery()`          — for the media library, whose uploader is
--   asking "is this file ready". Guarded by `media_assets_read`'s own rule.
--
-- Both return counts and a boolean per medium. Neither returns a bucket, a key
-- or a checksum, which is the structural limit the reviewer-media migration used
-- for `master_preview_target()`: a function that cannot return an object's
-- coordinates cannot leak them.

-- ---------------------------------------------------------------------------
-- One lesson, every uploaded file in it
-- ---------------------------------------------------------------------------

create or replace function public.lesson_delivery_state(p_lesson_id uuid)
returns table (
  resource_id      uuid,
  asset_id         uuid,
  asset_status     text,
  available_copies integer,
  pending_copies   integer,
  failed_copies    integer,
  video_ready      boolean,
  audio_ready      boolean,
  failure_reason   text
)
language sql
stable
security definer
set search_path = public
as $$
  select lr.id,
         ma.id,
         ma.status,
         coalesce(count(mr.id) filter (where mr.status = 'available'), 0)::integer,
         coalesce(count(mr.id) filter (where mr.status = 'pending'), 0)::integer,
         coalesce(count(mr.id) filter (where mr.status = 'failed'), 0)::integer,
         -- A copy a browser can play. Posters and manifests are delivery copies
         -- too and neither of them is a player, so neither counts.
         coalesce(bool_or(mr.status = 'available' and mr.profile in ('1080p','720p','480p','360p')), false),
         coalesce(bool_or(mr.status = 'available' and mr.profile = 'audio'), false),
         -- The most recent failure's reason, because it is the only thing that
         -- tells "the encoder crashed" from "this codec is not supported", and
         -- only one of those is worth a retry.
         (select failed.failure_reason
            from public.media_renditions failed
           where failed.asset_id = ma.id
             and failed.status = 'failed'
           order by failed.updated_at desc
           limit 1)
    from public.lesson_resources lr
    join public.media_assets ma on ma.id = lr.media_asset_id
    left join public.media_renditions mr on mr.asset_id = ma.id
    join public.lessons l on l.id = lr.lesson_id
    join public.course_sections cs on cs.id = l.section_id
   where lr.lesson_id = p_lesson_id
     -- D7: a tombstoned master is gone from every path, including this report.
     and ma.deleted_at is null
     and (
       -- The person who uploaded it, in any state. They are the one waiting.
       ma.uploaded_by = public.current_user_id()
       -- The author of the version, in any state: a file that has not encoded
       -- yet is exactly what they need to know about before they submit.
       or public.can_author_version(cs.course_version_id)
       -- A reviewer judging the version sees the same thing a learner would.
       or public.may_review_version_media(cs.course_version_id)
     )
   group by lr.id, lr.position, ma.id, ma.status
   order by lr.position;
$$;

revoke all on function public.lesson_delivery_state(uuid) from public;
revoke all on function public.lesson_delivery_state(uuid) from anon;
grant execute on function public.lesson_delivery_state(uuid) to authenticated;

comment on function public.lesson_delivery_state(uuid) is
  'Delivery copies for every uploaded file in one lesson, as counts: how many are available, pending or failed, whether a browser could play a video or an audio copy, and the most recent failure reason. No bucket, key or checksum. Visible to the uploader, the version author and an active reviewer — nobody else, because it describes a file that is not published yet.';

-- ---------------------------------------------------------------------------
-- One uploader, every file they uploaded
-- ---------------------------------------------------------------------------

create or replace function public.my_media_delivery()
returns table (
  asset_id         uuid,
  available_copies integer,
  pending_copies   integer,
  failed_copies    integer,
  video_ready      boolean,
  audio_ready      boolean,
  failure_reason   text
)
language sql
stable
security definer
set search_path = public
as $$
  select ma.id,
         coalesce(count(mr.id) filter (where mr.status = 'available'), 0)::integer,
         coalesce(count(mr.id) filter (where mr.status = 'pending'), 0)::integer,
         coalesce(count(mr.id) filter (where mr.status = 'failed'), 0)::integer,
         coalesce(bool_or(mr.status = 'available' and mr.profile in ('1080p','720p','480p','360p')), false),
         coalesce(bool_or(mr.status = 'available' and mr.profile = 'audio'), false),
         (select failed.failure_reason
            from public.media_renditions failed
           where failed.asset_id = ma.id
             and failed.status = 'failed'
           order by failed.updated_at desc
           limit 1)
    from public.media_assets ma
    left join public.media_renditions mr on mr.asset_id = ma.id
   where ma.deleted_at is null
     -- The same rule as `media_assets_read`, deliberately: this returns the
     -- delivery state of exactly the rows the caller may already see there, so
     -- the library cannot show a file on one line and hide its fate on the next.
     and (ma.uploaded_by = public.current_user_id()
          or public.is_privileged(public.current_user_id()))
   group by ma.id
   -- Newest first, matching the library's own order, so the two lists line up
   -- without the screen having to sort one of them differently.
   order by max(ma.created_at) desc;
$$;

revoke all on function public.my_media_delivery() from public;
revoke all on function public.my_media_delivery() from anon;
grant execute on function public.my_media_delivery() to authenticated;

comment on function public.my_media_delivery() is
  'Delivery state for every master the caller may see in `media_assets_read` — their own uploads, or everything for staff. Counts and a playable-per-medium flag, no object coordinates. Replaces reading `media_renditions` directly, which the policy deliberately limits to copies that are already available.';
