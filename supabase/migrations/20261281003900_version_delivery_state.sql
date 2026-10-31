-- The same question, asked of a whole version instead of one lesson.
--
-- WHY THIS REPLACES `lesson_delivery_state()`
-- -------------------------------------------
-- Yesterday's migration answered "does this file play" for one lesson, so the
-- lesson preview could say it. The next screen asks it for every lesson at once —
-- a teacher about to submit a forty-lesson course should not find out one lesson
-- at a time — and the cheap way to serve that is a second function with the same
-- body and a different join.
--
-- That is two security-definer functions guarding the same three people by two
-- separate spellings, and the second spelling is always the one that drifts. A
-- guard that is written twice is a guard that is wrong once. So this is one
-- function, over a version, and the single-lesson screen calls it too and picks
-- the rows it wants: it already holds the version id, and a version's worth of
-- encoding counts is a handful of integers, not a table.
--
-- The guard is the same three branches as `may_watch_master()`, evaluated once
-- per call instead of once per row:
--
--   the author of the version, or staff   — what will a learner get
--   an actively assigned reviewer         — what is under review is what a
--                                           learner sees
--   the person who uploaded a file        — but only that file's rows, because
--                                           uploading into somebody else's course
--                                           does not entitle you to its whole
--                                           inventory
--
-- Nothing here returns a bucket, an object key or a checksum. A function that
-- cannot return an object's coordinates cannot leak them.

drop function if exists public.lesson_delivery_state(uuid);

create or replace function public.version_delivery_state(p_version_id uuid)
returns table (
  lesson_id        uuid,
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
  with reach as (
    select public.can_author_version(p_version_id)
           or public.may_review_version_media(p_version_id) as everything
  )
  select l.id,
         lr.id,
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
    from public.course_sections cs
    join public.lessons l on l.section_id = cs.id
    join public.lesson_resources lr on lr.lesson_id = l.id
    join public.media_assets ma on ma.id = lr.media_asset_id
    left join public.media_renditions mr on mr.asset_id = ma.id
   cross join reach
   where cs.course_version_id = p_version_id
     -- D7: a tombstoned master is gone from every path, including this report.
     and ma.deleted_at is null
     and (
       reach.everything
       -- The uploader sees their own file's fate even where the course is not
       -- theirs: it is the file they are waiting on, and nothing else here.
       or ma.uploaded_by = public.current_user_id()
     )
   group by l.id, l.position, cs.position, lr.id, lr.position, ma.id, ma.status
   order by cs.position, l.position, lr.position;
$$;

revoke all on function public.version_delivery_state(uuid) from public;
revoke all on function public.version_delivery_state(uuid) from anon;
grant execute on function public.version_delivery_state(uuid) to authenticated;

comment on function public.version_delivery_state(uuid) is
  'Delivery copies for every uploaded file in a version, as counts: available, pending and failed, whether a browser could play a video or an audio copy, and the most recent failure reason. No bucket, key or checksum. Visible to the version author (and staff) and to an active reviewer of that version, in full; to a file''s uploader, only that file''s row. Replaces lesson_delivery_state() so the three-person guard is written once.';
