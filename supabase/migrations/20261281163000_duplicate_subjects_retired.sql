-- One subject per discipline: the two duplicates the seeds left are retired.
--
-- WHY THIS EXISTS
-- ---------------
-- Two seed migrations each wrote a starter list of subjects, eight days apart,
-- and spelled two of them differently:
--
--   20261016000700_seed.sql                 20261022000100_seed_subject_areas.sql
--   aqidah           'Aqeedah'              aqeedah  'Aqeedah'          (2 children)
--   islamic-history  'Islamic history'      history  'Islamic History'  (2 children)
--
-- Every other code was the same in both, so the second seed's
-- `on conflict do nothing` left one row. These two were not, so every database
-- built from this repository has two subjects called Aqeedah and two called
-- Islamic history. The first public page of the deployed site listed all four
-- (seen on 2026-11-27). A visitor choosing "Aqeedah" in the catalogue had a
-- one-in-two chance of the one no course is filed under.
--
-- WHICH ONE STAYS
-- ---------------
-- The second seed's: `aqeedah` and `history`. Each has two subdivisions under
-- it; the first seed's have none.
--
-- WHAT THIS DOES, AND WHAT IT DOES NOT
-- ------------------------------------
-- It sets `status = 'retired'` on `aqidah` and `islamic-history`, which is
-- what the "Retire" button on /admin/subjects does: readers stop seeing the
-- row, staff still do, and it can be reactivated from that page. The change
-- is written to the governance audit log by the table's own trigger, with no
-- actor, because a migration is nobody.
--
-- It moves nothing. If ANYTHING in the database points at the duplicate (a
-- course version's tag, a plan's entitlement, a reviewer's authorisation, a
-- panel, a requirement, a child subject), the duplicate is LEFT AS IT IS and
-- a notice says so: several of those tables are frozen after publication, and
-- a migration that rewrites what a published course is filed under is not one
-- to run unread. Merge those by hand, then retire from /admin/subjects.
-- The tables are found from the foreign keys themselves, not from a list, so
-- a table added since is counted too.
--
-- It deletes nothing, renames nothing, gives no role anything, and touches no
-- other row.

do $$
declare
  pair   record;
  ref    record;
  v_refs bigint;
  v_all  bigint;
begin
  for pair in
    select o.id as old_id, o.code as old_code, k.code as kept_code
      from (values ('aqidah', 'aqeedah'), ('islamic-history', 'history')) as p (old_code, kept_code)
      join public.subject_areas o
        on o.code = p.old_code and o.deleted_at is null and o.status = 'active'
      join public.subject_areas k
        on k.code = p.kept_code and k.deleted_at is null and k.status = 'active'
  loop
    v_all := 0;
    for ref in
      select c.conrelid::regclass as tbl, a.attname as col
        from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
       where c.contype = 'f'
         and c.confrelid = 'public.subject_areas'::regclass
         and array_length(c.conkey, 1) = 1
    loop
      execute format('select count(*) from %s where %I = $1', ref.tbl, ref.col)
        into v_refs using pair.old_id;
      v_all := v_all + v_refs;
    end loop;

    if v_all > 0 then
      raise notice
        'subject "%" was NOT retired: % row(s) still point at it. Move them to "%" by hand, then retire it from /admin/subjects.',
        pair.old_code, v_all, pair.kept_code;
    else
      update public.subject_areas set status = 'retired' where id = pair.old_id;
    end if;
  end loop;
end $$;
