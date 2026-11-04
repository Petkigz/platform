-- Media rows locate private objects. The old INSERT policy allowed any caller to
-- create a row for an arbitrary bucket/key and even choose its initial status;
-- the UPDATE policy allowed an uploader or staff member to change coordinates,
-- ownership or purpose directly. Neither path went through the derived-key
-- upload writers. A unique constraint only protects keys already in live rows;
-- it does not make arbitrary storage coordinates safe.
--
-- Keep the narrow descriptive edits already supported by the application. Asset
-- creation, state transitions, retention and account merging remain available
-- through their existing session-checked SECURITY DEFINER writers. Database
-- operators and storage credentials remain outside this application boundary.
revoke insert, update, delete on public.media_assets from public, anon, authenticated;
grant update (display_name, duration_seconds, technical_metadata)
  on public.media_assets to authenticated;

comment on table public.media_assets is
  'Original media references. Authenticated callers create and transition assets through checked writers; direct edits are limited to descriptive columns. Storage access and malware scanning require separate safeguards.';
