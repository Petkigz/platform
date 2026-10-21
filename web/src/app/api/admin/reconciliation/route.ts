import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNED = /^-?[1-9][0-9]*$/;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok:false,message:'Supabase is not configured.'},{status:503});
  let raw: unknown;
  try { raw=await request.json(); } catch { return NextResponse.json({ok:false,message:'Malformed request.'},{status:400}); }
  const b=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({ok:false,message:'Sign in first.'},{status:401});
  const [{data:platform},{data:finance}]=await Promise.all([
    supabase.rpc('has_role',{p_user_id:user.id,p_role_code:'platform_admin'}),
    supabase.rpc('has_role',{p_user_id:user.id,p_role_code:'finance_admin'}),
  ]);
  if(platform!==true&&finance!==true)return NextResponse.json({ok:false,message:'Only finance/platform admins may reconcile provider statements.'},{status:403});

  let fn:string; let args:Record<string,unknown>;
  switch(b.action){
    case 'start':
      if(typeof b.provider!=='string'||!b.provider.trim())return NextResponse.json({ok:false,message:'Provider is required.'},{status:400});
      if(typeof b.periodStart!=='string'||typeof b.periodEnd!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.periodStart)||!/^\d{4}-\d{2}-\d{2}$/.test(b.periodEnd))return NextResponse.json({ok:false,message:'Enter a start and end date.'},{status:400});
      fn='start_payment_reconciliation';args={p_provider:b.provider.trim(),p_period_start:b.periodStart,p_period_end:b.periodEnd};break;
    case 'add_line':
      if(typeof b.reconciliationId!=='string'||!UUID.test(b.reconciliationId))return NextResponse.json({ok:false,message:'Choose a reconciliation.'},{status:400});
      if(typeof b.providerReference!=='string'||!b.providerReference.trim())return NextResponse.json({ok:false,message:'Provider reference is required.'},{status:400});
      if(typeof b.amountMinor!=='string'||!SIGNED.test(b.amountMinor))return NextResponse.json({ok:false,message:'Enter a non-zero signed amount in minor units.'},{status:400});
      if(typeof b.currencyCode!=='string'||!/^[A-Z]{3}$/.test(b.currencyCode))return NextResponse.json({ok:false,message:'Use a three-letter uppercase currency code.'},{status:400});
      fn='add_reconciliation_statement_line';args={p_reconciliation_id:b.reconciliationId,p_provider_reference:b.providerReference.trim(),p_provider_amount_minor:b.amountMinor,p_currency_code:b.currencyCode};break;
    case 'resolve':
      if(typeof b.itemId!=='string'||!UUID.test(b.itemId)||typeof b.transactionId!=='string'||!UUID.test(b.transactionId))return NextResponse.json({ok:false,message:'Choose the reconciliation line and internal transaction.'},{status:400});
      if(typeof b.reason!=='string'||b.reason.length>500)return NextResponse.json({ok:false,message:'Reason must be under 500 characters.'},{status:400});
      fn='resolve_reconciliation_item';args={p_item_id:b.itemId,p_financial_transaction_id:b.transactionId,p_reason:b.reason.trim()||null};break;
    case 'settle':
      // What actually landed, and the rate it landed at. Separate from matching a
      // statement line: a line can match and the settled figure can still be net of
      // a fee, in another currency, at a rate that has to come from the shelf
      // rather than from whoever is typing.
      if(typeof b.transactionId!=='string'||!UUID.test(b.transactionId))return NextResponse.json({ok:false,message:'Choose the transaction that settled.'},{status:400});
      if(typeof b.amountMinor!=='string'||!/^(0|[1-9][0-9]*)$/.test(b.amountMinor))return NextResponse.json({ok:false,message:'Enter what landed, in whole minor units. Zero is allowed; a fee can eat it all.'},{status:400});
      if(typeof b.currencyCode!=='string'||!/^[A-Z]{3}$/.test(b.currencyCode))return NextResponse.json({ok:false,message:'Use a three-letter uppercase currency code.'},{status:400});
      if(typeof b.rateId==='string'&&b.rateId.trim()&&!UUID.test(b.rateId.trim()))return NextResponse.json({ok:false,message:'A rate is chosen from the list, not typed in.'},{status:400});
      fn='record_transaction_settlement';args={p_financial_transaction_id:b.transactionId,p_settlement_amount_minor:b.amountMinor,p_settlement_currency:b.currencyCode,p_rate_id:typeof b.rateId==='string'&&b.rateId.trim()?b.rateId.trim():null};break;
    case 'finalize':
      if(typeof b.reconciliationId!=='string'||!UUID.test(b.reconciliationId))return NextResponse.json({ok:false,message:'Choose a reconciliation.'},{status:400});
      fn='finalize_payment_reconciliation';args={p_reconciliation_id:b.reconciliationId};break;
    case 'close':
      if(typeof b.reconciliationId!=='string'||!UUID.test(b.reconciliationId))return NextResponse.json({ok:false,message:'Choose a reconciliation.'},{status:400});
      if(typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>500)return NextResponse.json({ok:false,message:'A written close reason is required.'},{status:400});
      fn='close_payment_reconciliation';args={p_reconciliation_id:b.reconciliationId,p_reason:b.reason.trim()};break;
    default:return NextResponse.json({ok:false,message:'Unsupported reconciliation action.'},{status:400});
  }
  const {data,error}=await supabase.rpc(fn,args as never);
  if(error){const message=error.message;const status=/only a finance admin/i.test(message)?403:/not found/i.test(message)?404:/duplicate key|already exists/i.test(message)?409:400;return NextResponse.json({ok:false,message},{status});}
  return NextResponse.json({ok:true,data},{status:200});
}
