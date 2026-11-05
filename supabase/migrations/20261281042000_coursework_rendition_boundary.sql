-- Lesson delivery copies must never provide another route to coursework. This
-- includes pre-existing coursework renditions and old library-labelled assets
-- while they are attached to an assignment. A detached historical library asset
-- with no declaration has no reliable remaining attribution and needs review.
create function public.is_library_delivery_asset(p_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.media_assets ma
     where ma.id = p_asset_id and ma.purpose = 'library'
       and not exists (select 1 from public.coursework_upload_declarations d where d.asset_id = ma.id)
       and not exists (select 1 from public.assignment_submission_assets a where a.media_asset_id = ma.id)
  );
$$;
-- Internal predicate: exposing this directly would reveal coursework attribution.
revoke all on function public.is_library_delivery_asset(uuid) from public, anon, authenticated;

create or replace function public.may_play_rendition(p_rendition_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_rendition_id is not null and public.current_user_id() is not null
    and exists (
      select 1 from public.media_renditions mr
      join public.media_assets ma on ma.id = mr.asset_id
      where mr.id = p_rendition_id and mr.status = 'available'
        and ma.status = 'available' and ma.deleted_at is null
        and public.is_library_delivery_asset(ma.id)
        and exists (
          select 1 from public.lesson_resources lr
          join public.lessons l on l.id = lr.lesson_id
          join public.course_sections cs on cs.id = l.section_id
          where lr.media_asset_id = ma.id
            and (public.can_access_lesson_now(l.id)
                 or public.can_author_version(cs.course_version_id)
                 or public.may_review_version_media(cs.course_version_id))
        )
    );
$$;
comment on function public.may_play_rendition(uuid) is
  'Lesson playback for eligible library assets only, when the copy and master are available and the caller is an entitled learner, version author, or active reviewer. Coursework and currently attached legacy files are excluded.';

-- The result is only the access decision, not a coursework classification oracle.
-- Preserve the existing staff access to library rendition rows for worker repair.
create function public.may_read_media_rendition(p_rendition_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_id() is not null and exists (
    select 1 from public.media_renditions mr
    where mr.id = p_rendition_id and public.is_library_delivery_asset(mr.asset_id)
      and (public.is_privileged(public.current_user_id()) or public.may_play_rendition(mr.id))
  );
$$;
revoke all on function public.may_read_media_rendition(uuid) from public;
grant execute on function public.may_read_media_rendition(uuid) to anon, authenticated;
drop policy media_renditions_read on public.media_renditions;
create policy media_renditions_read on public.media_renditions
  for select to anon, authenticated using (public.may_read_media_rendition(id));

-- The writer is SECURITY DEFINER, so enforce this even there. This also blocks
-- reactivating, confirming or editing old copies; it does not delete their bytes.
create function public.require_library_rendition()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.media_assets where id = new.asset_id for update;
  if not public.is_library_delivery_asset(new.asset_id) then
    raise exception 'coursework cannot be encoded as a lesson rendition' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function public.require_library_rendition() from public, anon, authenticated;
create trigger media_rendition_library_only before insert or update on public.media_renditions
  for each row execute function public.require_library_rendition();

-- The worker checks immediately before fetching a master, including --asset and
-- recovery of an existing pending rendition. Its storage credentials are still
-- powerful; this is an application guard, not an object-store policy.
create function public.may_transcode_library_asset(p_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_id() is not null
    and public.is_privileged(public.current_user_id())
    and public.is_library_delivery_asset(p_asset_id)
    and exists (select 1 from public.media_assets ma where ma.id = p_asset_id
                and ma.status = 'available' and ma.deleted_at is null);
$$;
revoke all on function public.may_transcode_library_asset(uuid) from public, anon;
grant execute on function public.may_transcode_library_asset(uuid) to authenticated;

-- Filter before the scan limit, so a backlog of coursework cannot starve the
-- normal library worker. Only the same privileged worker identities can see the
-- returned storage coordinates. Explicit asset selection uses the same filter.
create function public.transcode_library_candidates(p_asset_id uuid, p_scan integer)
returns table (id uuid, checksum text, mime_type text, master_bucket text, master_key text, status text)
language sql stable security definer set search_path = public as $$
  select ma.id, ma.checksum, ma.mime_type, ma.master_bucket, ma.master_key, ma.status
    from public.media_assets ma
   where public.current_user_id() is not null
     and public.is_privileged(public.current_user_id())
     and ma.deleted_at is null
     and public.is_library_delivery_asset(ma.id)
     and ((p_asset_id is not null and ma.id = p_asset_id)
          or (p_asset_id is null and ma.status = 'available'))
   order by ma.created_at, ma.id
   limit least(greatest(coalesce(p_scan, 50), 1), 1000);
$$;
revoke all on function public.transcode_library_candidates(uuid, integer) from public, anon;
grant execute on function public.transcode_library_candidates(uuid, integer) to authenticated;
