-- A privileged staff member could insert arbitrary capture/refund ledger rows
-- without either payment confirmation or the refund workflow. This does not
-- move money, but it corrupts balances and financial reports. Application
-- sessions must use the existing checked SECURITY DEFINER writers instead.
revoke insert on public.financial_transactions from public, anon, authenticated;
drop policy if exists ft_write on public.financial_transactions;
