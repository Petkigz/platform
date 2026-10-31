-- What a learner is told when the recording is not there.
--
-- THE GAP
-- -------
-- The lesson page printed one sentence for six different situations: *"uploaded,
-- not yet encoded for playback"*. That is a database column talking. The learner
-- is the one person who can do nothing about it, and they were given the least —
-- no idea whether to wait, whether to tell somebody, or whether the lesson is
-- simply broken for ever.
--
-- Everything else in the product now distinguishes those six (`media-encoding.ts`,
-- `version_delivery_state()`): the author sees which file is stalled and why, the
-- reviewer sees whether the course is ready. The person with nothing else to do
-- about it was told the least.
--
-- WHY NOT REUSE `version_delivery_state()`
-- ----------------------------------------
-- That function returns the worker's own failure text and per-profile counts, and
-- its guard is three people — the author, an active reviewer, and the uploader.
-- A learner is none of them, and should not be: `ffmpeg exited 137` is not a
-- learner's business, and a per-profile count of copies is an operations screen.
--
-- So this returns one word per resource and no numbers at all. The vocabulary *is*
-- the boundary: a function that cannot return a failure reason cannot leak one.
--
-- THE THREE WORDS, AND WHY THERE ARE THREE
-- ----------------------------------------
-- The six states decide whose job it is. The learner's job is never any of them,
-- so what is left is the only question they actually have:
--
--   plays        watch it.
--   preparing    not ready yet. Nothing for you to do — it may become playable
--                without anyone acting. **Copy for this must not promise that it
--                will**: there is no transcode worker in this deployment, so a
--                file can sit here indefinitely. "Not ready yet" is true; "it will
--                appear shortly" would not be.
--   unavailable  it will not play without a person. Tell somebody.
--
-- That is why `unavailable` is the failed and the held cases and nothing else, and
-- everything else that does not play is `preparing`.

create or replace function public.lesson_playback_standing(p_lesson_id uuid)
returns table (
  resource_id uuid,
  state       text
)
language sql
stable
security definer
set search_path = public
as $$
  select lr.id,
         case
           -- The master was withdrawn. No copy plays, whatever its own row says.
           when ma.status in ('quarantined', 'deleted') then 'unavailable'
           -- A copy a browser can play is there. Posters and manifests are
           -- delivery copies and neither is a player.
           when exists (
             select 1
               from public.media_renditions mr
              where mr.asset_id = ma.id
                and mr.status = 'available'
                and mr.profile in ('1080p','720p','480p','360p','audio')
           ) then 'plays'
           -- The file itself has not been verified yet, so nothing is encoded
           -- from it. It may become playable without anyone being asked.
           when ma.status = 'pending' then 'preparing'
           -- A copy is being made.
           when exists (
             select 1
               from public.media_renditions mr
              where mr.asset_id = ma.id
                and mr.status = 'pending'
           ) then 'preparing'
           -- Something failed and nothing pending remains: no worker will pick it
           -- up again on its own.
           when exists (
             select 1
               from public.media_renditions mr
              where mr.asset_id = ma.id
                and mr.status = 'failed'
           ) then 'unavailable'
           -- Verified, and nothing has ever been encoded from it. Same sentence
           -- as "still being made" on purpose: from here they are the same fact,
           -- and telling a learner which one it is would be telling them about
           -- our queue.
           else 'preparing'
         end
    from public.lesson_resources lr
    join public.media_assets ma on ma.id = lr.media_asset_id
    join public.lessons l on l.id = lr.lesson_id
    join public.course_sections cs on cs.id = l.section_id
   where lr.lesson_id = p_lesson_id
     -- D7: a tombstoned master is gone from every path. The resource row may
     -- survive; this report says nothing about it either.
     and ma.deleted_at is null
     -- Exactly `lesson_resources_read`, re-stated because a SECURITY DEFINER
     -- function bypasses the policy that would otherwise decide this. If the two
     -- ever disagree, the policy is right: this must not be able to tell somebody
     -- about a resource they cannot see.
     and (public.can_read_version(cs.course_version_id)
          or public.can_review_version(cs.course_version_id))
     and (
       lr.access_classification = 'public_preview'
       or public.can_author_version(cs.course_version_id)
       or public.can_review_version(cs.course_version_id)
       or public.can_access_lesson_now(l.id)
     );
$$;

revoke all on function public.lesson_playback_standing(uuid) from public;
revoke all on function public.lesson_playback_standing(uuid) from anon;
grant execute on function public.lesson_playback_standing(uuid) to authenticated;

comment on function public.lesson_playback_standing(uuid) is
  'One word per uploaded file in a lesson — plays, preparing or unavailable — for the learner''s own page. Deliberately coarser than version_delivery_state(): no counts and no failure reason, because the six states there decide whose job it is and the learner''s job is never any of them. Guarded by exactly lesson_resources_read.';
