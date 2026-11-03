-- A row-level policy allowing privileged UPDATE also allowed a direct table
-- write to mark a refund approved without calling the decision function. The
-- existing request, decision and settlement functions are SECURITY DEFINER and
-- remain the writers. This does not implement the owner's additional approval
-- rule and does not transfer money.
revoke insert, update, delete on public.refund_requests from anon, authenticated;
comment on table public.refund_requests is
  'Refund requests are written through session-checked functions; a request or approval is not a money transfer.';
