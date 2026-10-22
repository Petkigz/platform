-- A receipt is a document, so it needs a number a person can read out loud.
--
-- `/orders` could say "paid" and nothing more. A parent asking their bank, their
-- employer or their own memory of the transaction had no document and no reference:
-- the only identifier was a UUID, which is not something anyone reads down a phone.
--
-- `order_number` is that identifier. It is assigned by the database on insert, is
-- unique, and is never rewritten — a receipt number that can change is not a receipt
-- number. The format matches the certificate numbering already in use (`AS-` and eight
-- digits) so that a support conversation about either document sounds the same.
--
-- The number is *not* a secret and not a key: every read of it still goes through the
-- order's own row-level policy, so only somebody who may see the order can see its
-- number.

create sequence if not exists public.order_number_seq start 1001;

alter table public.orders
  add column if not exists order_number text;

-- Existing rows get a number in creation order, so a receipt printed for last week's
-- order carries a lower number than this week's. The sequence is advanced by the same
-- statement, so nothing is handed out twice.
update public.orders
   set order_number = 'AS-' || lpad(nextval('public.order_number_seq')::text, 8, '0')
 where order_number is null;

alter table public.orders
  alter column order_number set not null;

alter table public.orders
  alter column order_number
    set default ('AS-' || lpad(nextval('public.order_number_seq')::text, 8, '0'));

create unique index if not exists orders_order_number_key
  on public.orders (order_number);

comment on column public.orders.order_number is
  'The number printed on a receipt. Assigned by the database, unique, and immutable: a receipt number that can change is not a receipt number.';

-- ---------------------------------------------------------------------------
-- A number, once given, stays
-- ---------------------------------------------------------------------------
create or replace function public.keep_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_number is distinct from old.order_number then
    raise exception 'an order number cannot be changed: % is already printed on a receipt',
      old.order_number
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.keep_order_number() is
  'Refuses any change to orders.order_number. The number is what a receipt cites, so rewriting it would make two documents claim the same order.';

drop trigger if exists orders_keep_order_number on public.orders;
create trigger orders_keep_order_number
  before update on public.orders
  for each row execute function public.keep_order_number();
