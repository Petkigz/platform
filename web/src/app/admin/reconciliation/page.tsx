import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ReconciliationManager } from './reconciliation-manager';

export const dynamic='force-dynamic';

export default async function ReconciliationPage(){
  if(!isSupabaseConfigured())redirect('/');
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/sign-in?next=/admin/reconciliation');
  const [{data:platform},{data:finance}]=await Promise.all([
    supabase.rpc('has_role',{p_user_id:user.id,p_role_code:'platform_admin'}),
    supabase.rpc('has_role',{p_user_id:user.id,p_role_code:'finance_admin'}),
  ]);
  if(platform!==true&&finance!==true)redirect('/admin');
  const {data,error}=await supabase.from('payment_reconciliations').select(`
    id,provider,period_start,period_end,status,started_at,closed_at,
    payment_reconciliation_items(id,provider_reference,internal_amount_minor,
      provider_amount_minor,currency_code,match_status,discrepancy_reason,financial_transaction_id)
  `).order('started_at',{ascending:false});
  if(error)throw new Error(error.message);
  return <div className="container section">
    <p className="eyebrow"><Link href="/admin">Administration</Link></p>
    <h1>Payment reconciliation</h1>
    <p className="lede">Compare signed provider statement rows to the internal transaction ledger. Unmatched and discrepant rows remain visible until a finance admin resolves and closes the run.</p>
    <ReconciliationManager runs={(data??[]) as never[]}/>
    <p style={{marginTop:'1.5rem'}}><Link href="/admin">Back to administration</Link></p>
  </div>;
}
