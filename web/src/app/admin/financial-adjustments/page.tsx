import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { AdjustmentManager } from './adjustment-manager';

export const dynamic = 'force-dynamic';

export default async function FinancialAdjustmentsPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/financial-adjustments');
  const [{ data: platformAdmin }, { data: financeAdmin }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
  ]);
  if (platformAdmin !== true && financeAdmin !== true) redirect('/admin');

  const [{ data: events, error: eventError }, { data: adjustmentRows, error: adjustmentError }] = await Promise.all([
    supabase.from('governance_audit_events').select('target_id,detail,occurred_at')
      .eq('action','earnings.clawback_needed').order('occurred_at',{ascending:false}).limit(100),
    supabase.from('financial_adjustments')
      .select('id,order_id,financial_transaction_id,adjustment_type,amount_minor,currency_code,reason,created_at')
      .order('created_at',{ascending:false}).limit(100),
  ]);
  if (eventError) throw new Error(eventError.message);
  if (adjustmentError) throw new Error(adjustmentError.message);

  const recordedOrders = new Set((adjustmentRows ?? [])
    .filter((row) => row.adjustment_type === 'earnings_clawback' && row.order_id)
    .map((row) => row.order_id as string));
  const clawbacks = [...new Map((events ?? [])
    .filter((e) => e.target_id && !recordedOrders.has(e.target_id))
    .map((e) => [e.target_id as string, {
      orderId: e.target_id as string,
      paidEntries: Number((e.detail as Record<string, unknown>).entries_paid ?? 0),
      at: e.occurred_at,
    }])).values()];

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/admin">Administration</Link></p>
      <h1>Financial adjustments</h1>
      <p className="lede">Append-only accounting corrections. These records document a balance change; they do not themselves transfer funds or modify the original transaction.</p>
      <AdjustmentManager
        clawbacks={clawbacks}
        adjustments={(adjustmentRows ?? []) as never[]}
      />
      <p style={{ marginTop: '1.5rem' }}><Link href="/admin">Back to administration</Link></p>
    </div>
  );
}
