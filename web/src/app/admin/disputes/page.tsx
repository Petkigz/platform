import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/env';
import {DisputeManager} from './dispute-manager';

export const dynamic='force-dynamic';

export default async function DisputesPage(){
  if(!isSupabaseConfigured())redirect('/');
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/sign-in?next=/admin/disputes');
  const [{data:platform},{data:finance}]=await Promise.all([
    supabase.rpc('has_role',{p_user_id:user.id,p_role_code:'platform_admin'}),
    supabase.rpc('has_role',{p_user_id:user.id,p_role_code:'finance_admin'}),
  ]);
  if(platform!==true&&finance!==true)redirect('/admin');
  const {data,error}=await supabase.from('payment_disputes')
    .select('id,financial_transaction_id,order_id,dispute_type,provider,provider_reference,disputed_amount_minor,currency_code,status,opened_at,resolution_notes')
    .order('opened_at',{ascending:false});
  if(error)throw new Error(error.message);
  return <div className="container section"><p className="eyebrow"><Link href="/admin">Administration</Link></p>
    <h1>Payment disputes</h1><p className="lede">Track provider disputes and internal review. Recording or resolving a case here does not submit evidence to the provider or move funds.</p>
    <DisputeManager disputes={(data??[]) as never[]}/><p style={{marginTop:'1.5rem'}}><Link href="/admin">Back to administration</Link></p>
  </div>;
}
