-- Group 2 · media assets
--
-- D8 (FROZEN-ish): originals live in object storage we control. Cloudflare
-- Stream can deliver a rendition but cannot hand back the original upload, so
-- a video that exists only in Stream is a video we have lost. Every uploaded
-- master is therefore recorded here with its location and checksum before it
-- is ever encoded.
--
-- This table holds references, never bytes — the project record says so
-- explicitly ("Store references, not large media blobs, in PostgreSQL").

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),

  -- Where the master lives. 'r2' is the recommended backend (zero egress).
  storage_backend text not null
    check (storage_backend in ('r2', 'supabase', 's3', 'local')),
  master_bucket text not null check (length(trim(master_bucket)) > 0),
  master_key    text not null check (length(trim(master_key)) > 0),

  -- sha256 of the master file, hex. Proves we still hold the exact original
  -- and lets a takedown or rights request be matched to every copy.
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),

  mime_type text not null check (length(trim(mime_type)) > 0),
  byte_size bigint not null check (byte_size >= 0),

  -- NULL for images and documents.
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),

  -- Codec, width, height, sample rate, original filename, upload attempt id.
  technical_metadata jsonb not null default '{}'::jsonb,

  -- 'pending'    uploaded, not yet verified/encoded
  -- 'available'  verified, renditions safe to serve
  -- 'quarantined' failed review or rights check; never served
  -- 'deleted'    tombstoned; master may still be retained per D7
  status text not null default 'pending'
    check (status in ('pending', 'available', 'quarantined', 'deleted')),

  uploaded_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Two rows must never claim the same physical master.
create unique index media_assets_location_key on public.media_assets
  (storage_backend, master_bucket, master_key)
  where deleted_at is null;

-- Indexed for dedupe lookup and for "find every asset with this checksum",
-- but deliberately NOT unique: two teachers uploading the same public
-- recording are separate rights relationships and must stay separate rows.
create index media_assets_checksum_idx on public.media_assets (checksum);

create index media_assets_uploaded_by_idx on public.media_assets (uploaded_by);
create index media_assets_status_idx      on public.media_assets (status);

create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

comment on table public.media_assets is
  'D8: original media masters in storage we control. References, not bytes.';
