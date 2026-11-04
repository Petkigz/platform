-- Coursework must not be made from a reusable library asset. The legacy attach
-- RPC accepted one, bypassing the private coursework purpose, its declaration,
-- review and retention rules; the same asset could also be a lesson resource.
-- Preserve old rows and bytes: existing mixed-purpose records need an explicit
-- operational review, not silent reclassification or deletion.
create function public.require_declared_coursework_attachment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_purpose text;
begin
  -- Serialize against lesson-resource attachment and other changes to this asset.
  select ma.purpose into v_purpose from public.media_assets ma
   where ma.id = new.media_asset_id for update;
  if not found or v_purpose <> 'coursework' or not exists (
    select 1 from public.coursework_upload_declarations d
     where d.asset_id = new.media_asset_id and d.submission_id = new.submission_id
  ) then
    raise exception 'assignment files must be declared coursework for this submission; upload the file using the coursework form'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.lesson_resources lr where lr.media_asset_id = new.media_asset_id) then
    raise exception 'a lesson resource cannot also be a coursework attachment'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function public.require_declared_coursework_attachment() from public, anon, authenticated;
create trigger assignment_assets_coursework_only
  before insert or update of media_asset_id, submission_id on public.assignment_submission_assets
  for each row execute function public.require_declared_coursework_attachment();

-- Also refuse new lesson references to old attachments that were incorrectly
-- labelled library. Existing references are not rewritten or removed here.
create or replace function public.lesson_resource_library_only()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_purpose text;
begin
  if new.media_asset_id is null then return new; end if;
  select ma.purpose into v_purpose from public.media_assets ma
   where ma.id = new.media_asset_id for update;
  if v_purpose = 'coursework' or exists (
    select 1 from public.assignment_submission_assets asa where asa.media_asset_id = new.media_asset_id
  ) then
    raise exception 'a file handed in as coursework cannot be taught from; upload it to the media library instead'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
comment on function public.require_declared_coursework_attachment() is
  'New assignment attachments must be coursework declared for that submission and not a lesson resource. Existing legacy rows are preserved and need review.';
