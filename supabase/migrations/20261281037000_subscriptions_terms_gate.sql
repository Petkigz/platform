-- Subscription checkout is already guarded by this switch, but the agreed
-- renewal, grace, retry and plan-change rules are not yet implemented. Runtime
-- enablement must not imply otherwise. Preserve any existing enabled value:
-- turning it off automatically could affect a live service and needs an operator
-- decision. An existing true value therefore remains an explicit launch risk.
set app.bypassing_code_flag = 'on';
update public.platform_settings
   set gate_type = 'code',
       preconditions = 'Plan checkout and paid-period access exist, but the chosen renewal terms are not complete: seven-day grace, three retries then suspension, no proration, upgrade at the next monthly renewal, and honoring the purchased price version. A reliable renewal worker and provider integration are not established. Keep off until these are implemented, tested and deployed. This migration preserves an existing enabled value; an operator must review and switch it off if already enabled.'
 where key = 'commerce.subscriptions';
reset app.bypassing_code_flag;
