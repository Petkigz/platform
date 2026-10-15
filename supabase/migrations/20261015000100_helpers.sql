-- Group 1 · helpers
-- Shared trigger and auth-context functions. No tables here.

-- Keeps updated_at honest without the application remembering to.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: stamps updated_at on UPDATE.';

-- Who is making this request, from the JWT.
-- Reads request.jwt.claims (PostgREST >= 9) and falls back to the legacy
-- request.jwt.claim.sub. Returns NULL for anonymous requests.
--
-- Deliberately NOT security definer: it only reads a session setting.
create or replace function public.current_user_id()
returns uuid
language plpgsql
stable
as $$
declare
  v_claims jsonb;
begin
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
    return nullif(v_claims ->> 'sub', '')::uuid;
  exception when others then
    return nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  end;
end;
$$;

comment on function public.current_user_id() is
  'Current request subject from the JWT, or NULL if anonymous.';
