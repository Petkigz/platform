import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSITIVE_MINOR=/^[1-9][0-9]*$/;

export async function POST(request:Request){
  if(!isSupabaseConfigured())return NextResponse.json({ok:false,message:'Supabase is not configured.'},{status:503});
  let raw:unknown;try{raw=await request.json();}catch{return NextResponse.json({ok:false,message:'Malformed request.'},{status:400});}
  const b=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({ok:false,message:'Sign in first.'},{status:401});
  const [{data:platform},{data:finance}]=await Promise.all([
    supabase.rpc('has_role',{p_user_id:user.id,p_role_code:'platform_admin'}),
    supabase.rpc('has_role',{p_user_id:user.id,p_role_code:'finance_admin'}),
  ]);
  if(platform!==true&&finance!==true)return NextResponse.json({ok:false,message:'Only finance/platform admins may manage payment disputes.'},{status:403});
  let fn:string;let args:Record<string,unknown>;
  if(b.action==='open'){
    if(typeof b.transactionId!=='string'||!UUID.test(b.transactionId))return NextResponse.json({ok:false,message:'A valid financial transaction id is required.'},{status:400});
    const orderId=typeof b.orderId==='string'&&b.orderId?b.orderId:null;
    if(orderId&&!UUID.test(orderId))return NextResponse.json({ok:false,message:'Use a valid order id.'},{status:400});
    if(typeof b.type!=='string'||!['chargeback','fraud','unauthorised','not_received','other'].includes(b.type))return NextResponse.json({ok:false,message:'Choose a supported dispute type.'},{status:400});
    if(typeof b.amountMinor!=='string'||!POSITIVE_MINOR.test(b.amountMinor))return NextResponse.json({ok:false,message:'Enter a positive integer minor-unit amount.'},{status:400});
    if(typeof b.currencyCode!=='string'||!/^[A-Z]{3}$/.test(b.currencyCode))return NextResponse.json({ok:false,message:'Use a three-letter uppercase currency code.'},{status:400});
    if(typeof b.providerReference==='string'&&b.providerReference.length>300)return NextResponse.json({ok:false,message:'Provider reference is too long.'},{status:400});
    fn='open_payment_dispute';args={p_financial_transaction_id:b.transactionId,p_order_id:orderId,p_dispute_type:b.type,p_disputed_amount_minor:b.amountMinor,p_currency_code:b.currencyCode,p_provider_reference:typeof b.providerReference==='string'?b.providerReference.trim()||null:null};
  }else if(b.action==='update'){
    if(typeof b.disputeId!=='string'||!UUID.test(b.disputeId))return NextResponse.json({ok:false,message:'A valid dispute id is required.'},{status:400});
    if(typeof b.status!=='string'||!['under_review','evidence_submitted','won','lost','withdrawn'].includes(b.status))return NextResponse.json({ok:false,message:'Choose a valid next status.'},{status:400});
    if(typeof b.notes!=='string'||!b.notes.trim()||b.notes.length>1000)return NextResponse.json({ok:false,message:'A written note under 1000 characters is required.'},{status:400});
    fn='update_payment_dispute';args={p_dispute_id:b.disputeId,p_status:b.status,p_resolution_notes:b.notes.trim()};
  }else return NextResponse.json({ok:false,message:'Unsupported dispute action.'},{status:400});
  const {data,error}=await supabase.rpc(fn,args as never);
  if(error){const message=error.message;const status=/only a finance admin/i.test(message)?403:/not found/i.test(message)?404:/cannot move|resolved dispute|does not belong/i.test(message)?409:400;return NextResponse.json({ok:false,message},{status});}
  return NextResponse.json({ok:true,data},{status:b.action==='open'?201:200});
}
