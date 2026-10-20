-- Watching a lesson you have a reason to watch.
--
-- THE GAP
-- -------
-- `may_play_rendition()` asked one question: is this caller a learner entitled to
-- the lesson, right now? That is the right question for a learner and the wrong
-- question for the two other people who need to watch the same file.
--
-- A teacher who uploaded a lesson recording could not watch it. Not through the
-- player — `can_access_lesson_now()` only ever looks at learner profiles — and
-- not through a master download either: `presignMasterDownload()` existed in
-- `web/src/lib/media-r2.ts` and had no caller outside its own tests. The test
-- that pinned this said "authors read their own media by another path". There was
-- no other path. So a teacher could upload 8 GiB, see a row turn `available`, and
-- never once watch what they had made.
--
-- A reviewer could not watch the version they were assigned to judge, while
-- `lesson_resources_read` let them read the row naming that media's object key.
-- They could see where the bytes were and could not be served them.
--
-- WHAT CHANGES
-- ------------
-- Three predicates, one route, and a rule about what each of them is for:
--
--   `may_review_version_media(version)` — an *active* review assignment.
--   `may_watch_master(asset)`           — the archive: uploader, staff, author.
--   `may_play_rendition(rendition)`     — the delivery copy, now three branches.
--
-- A reviewer gets the rendition and not the master, because what is under review
-- is what a learner will see. A master is up to 8 GiB of unedited archive, and
-- handing it to somebody whose job is to judge the finished lesson would be a
-- wider grant than the job needs.

-- ---------------------------------------------------------------------------
-- An active review assignment
-- ---------------------------------------------------------------------------

create or replace function public.may_review_version_media(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_version_id is not null
     and public.current_user_id() is not null
     and exists (
    select 1
      from public.content_review_assignments cra
      join public.reviewer_profiles rp on rp.id = cra.reviewer_profile_id
     where cra.course_version_id = p_version_id
       and rp.user_id = public.current_user_id()
       -- Accepted or in progress, and nothing else. This is deliberately
       -- narrower than can_review_version(), which answers "was this person ever
       -- assigned" — the right question for reading the text of a version they
       -- reviewed, and the wrong one for being served its media. Somebody who
       -- declined, finished or was taken off the assignment stops getting bytes
       -- at that moment, which is the same shape as a learner who leaves a
       -- cohort: the reason for the access ended, so the access ends.
       and cra.assignment_status in ('accepted', 'in_progress')
  );
$$;

revoke all on function public.may_review_version_media(uuid) from public;
revoke all on function public.may_review_version_media(uuid) from anon;
grant execute on function public.may_review_version_media(uuid) to authenticated;

comment on function public.may_review_version_media(uuid) is
  'Is the current session actively assigned to review this version? accepted or in_progress only, so a declined, completed or cancelled assignment stops granting media immediately. Narrower than can_review_version() on purpose: that one decides what text a reviewer may read, this one decides what bytes they may be served.';

-- ---------------------------------------------------------------------------
-- The archive
-- ---------------------------------------------------------------------------

create or replace function public.may_watch_master(p_asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_asset_id is not null
     and public.current_user_id() is not null
     and exists (
    select 1
      from public.media_assets ma
     where ma.id = p_asset_id
       -- D7: a tombstoned master is gone from every path, including this one.
       and ma.deleted_at is null
       and (
         -- Your own upload, in whatever state it is in. A pending file has to be
         -- watchable by the person who uploaded it, because "look at it before
         -- you confirm it" is the whole point of a pending state; and a
         -- quarantined one has to be watchable by them too, because a takedown
         -- they cannot see the reason for is a takedown they cannot answer.
         ma.uploaded_by = public.current_user_id()
         -- Staff moderate, so staff watch: verifying an upload, judging an
         -- appeal and matching a rights complaint all need the bytes.
         or public.is_privileged(public.current_user_id())
         -- A version author who did not upload the file themselves — staff
         -- uploaded it for them, or a co-teacher did — may watch it while it is
         -- in use. Only while it is available: a pending or quarantined master
         -- belongs to its uploader and to moderation, not to the course.
         or (
           ma.status = 'available'
           and exists (
             select 1
               from public.lesson_resources lr
               join public.lessons l on l.id = lr.lesson_id
               join public.course_sections cs on cs.id = l.section_id
              where lr.media_asset_id = ma.id
                and public.can_author_version(cs.course_version_id)
           )
         )
       )
  );
$$;

revoke all on function public.may_watch_master(uuid) from public;
revoke all on function public.may_watch_master(uuid) from anon;
grant execute on function public.may_watch_master(uuid) to authenticated;

comment on function public.may_watch_master(uuid) is
  'May the current session watch this master? Its uploader in any state, platform staff in any state, or the author of a version whose lesson uses it while it is available. Not a reviewer: what is under review is the delivery copy, not the archive.';

-- ---------------------------------------------------------------------------
-- The object coordinates, for the route that signs them
-- ---------------------------------------------------------------------------
-- `media_assets_read` is uploader-or-staff, which is narrower than
-- may_watch_master(): a version author who did not upload the file may watch it
-- but cannot read its row, so the row's bucket and key would be out of reach.
-- Widening that policy to hand a route two columns would expose every other
-- column of the row to the same caller. A function returns exactly the columns
-- the signing path needs and nothing else, and it is the same shape as
-- cohort_learner_progress(): the limit is structural.

create or replace function public.master_preview_target(p_asset_id uuid)
returns table (
  asset_id      uuid,
  master_bucket text,
  master_key    text,
  mime_type     text,
  byte_size     bigint,
  display_name  text,
  status        text
)
language sql
stable
security definer
set search_path = public
as $$
  select ma.id, ma.master_bucket, ma.master_key, ma.mime_type,
         ma.byte_size, ma.display_name, ma.status
    from public.media_assets ma
   where ma.id = p_asset_id
     and public.may_watch_master(p_asset_id);
$$;

revoke all on function public.master_preview_target(uuid) from public;
revoke all on function public.master_preview_target(uuid) from anon;
grant execute on function public.master_preview_target(uuid) to authenticated;

comment on function public.master_preview_target(uuid) is
  'The bucket, key and description of a master the caller may watch, or no rows at all. SECURITY DEFINER because media_assets_read is narrower than may_watch_master(); it returns seven columns so a caller cannot read the rest of the row through it.';

-- ---------------------------------------------------------------------------
-- The delivery copy, widened from one branch to three
-- ---------------------------------------------------------------------------

create or replace function public.may_play_rendition(p_rendition_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_rendition_id is not null
     and public.current_user_id() is not null
     and exists (
    select 1
      from public.media_renditions mr
      join public.media_assets ma on ma.id = mr.asset_id
     where mr.id = p_rendition_id
       -- The copy itself must have been verified by the worker.
       and mr.status = 'available'
       -- And so must the master it came from. Quarantining a master has to
       -- withdraw everything derived from it, which is the point of
       -- quarantining it — and it now withdraws it from the teacher and the
       -- reviewer too, because these three branches sit inside the same exists.
       and ma.status = 'available'
       and ma.deleted_at is null
       and exists (
             select 1
               from public.lesson_resources lr
               join public.lessons l on l.id = lr.lesson_id
               join public.course_sections cs on cs.id = l.section_id
              where lr.media_asset_id = ma.id
                and (
                  -- A learner entitled to this lesson, right now. Unchanged.
                  public.can_access_lesson_now(l.id)
                  -- The teacher who wrote this version watches what a learner
                  -- will watch, which is the only way to find out that a lesson
                  -- plays with no sound before a learner does.
                  or public.can_author_version(cs.course_version_id)
                  -- And a reviewer judges the delivery copy: what is under
                  -- review is what a learner sees.
                  or public.may_review_version_media(cs.course_version_id)
                )
           )
  );
$$;

revoke all on function public.may_play_rendition(uuid) from public;
revoke all on function public.may_play_rendition(uuid) from anon;
grant execute on function public.may_play_rendition(uuid) to authenticated;

comment on function public.may_play_rendition(uuid) is
  'May the current session be served this rendition? Requires the rendition and its master to be available, and a lesson referencing that master which the caller may reach as an entitled learner, as the author of its version, or as a reviewer actively assigned to it. Watching a preview is free; keeping one is not, so may_download_lesson() stays entitlement-only and neither a teacher nor a reviewer gets a copy.';

-- may_download_lesson() is deliberately not touched. Offline saving is an
-- entitlement a Plus subscriber holds, and a reviewer or an author has no
-- entitlement: letting either keep an unpublished lesson on a device would be
-- the one thing the entitlement exists to control.
