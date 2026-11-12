import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { readR2Config } from '@/lib/media-r2';
import { parseQuarantineTarget, sameQuarantineTarget } from '@/lib/quarantine-inspection';
import { scanQuarantinedCoursework } from '@/lib/coursework-quarantine-scan';
import { createClient } from '@/lib/supabase/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={'cache-control':'private, no-store'};
const fail=(message:string,status:number)=>NextResponse.json({ok:false,message},{status,headers});
let running=0;
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Scanning is not configured.',503);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) return fail('A JSON request is required.',415);
  const body:unknown=await request.json().catch(()=>null);
  const asset=body && typeof body==='object' && !Array.isArray(body) && typeof (body as Record<string,unknown>).asset==='string' ? ((body as Record<string,string>).asset ?? '').trim() : '';
  if (!UUID.test(asset)) return fail('Choose a valid quarantined file.',400);
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if (!user) return fail('Sign in to scan this file.',401);
  const first=await supabase.rpc('coursework_quarantine_inspection_target',{p_asset_id:asset});
  if(first.error) return fail('This quarantine cannot be inspected by this account.',403);
  const target=parseQuarantineTarget(first.data,asset);
  if(!target) return fail('This quarantined file is not available for inspection.',404);
  const config=readR2Config(); const socketPath=process.env.COURSEWORK_CLAMAV_SOCKET?.trim() ?? '';
  if(!config || !socketPath.startsWith('/')) return fail('The local scanner or storage is not configured.',503);
  // Per-process cap only; deployment-level request limits are still required.
  if(running>=2) return fail('The local scanner is busy. Try again later.',503);
  running++;
  try {
    const outcome=await scanQuarantinedCoursework({target,config,socketPath});
    const checked=await supabase.rpc('coursework_quarantine_inspection_target',{p_asset_id:asset});
    const current=checked.error ? null : parseQuarantineTarget(checked.data,asset);
    if(!current || !sameQuarantineTarget(target,current)) return fail('The file or permission changed during the scan. Refresh and try again.',409);
    if(!outcome.ok) return fail(outcome.message,outcome.status);
    return NextResponse.json({ok:true,outcome:outcome.outcome,bytes:outcome.bytes,quarantineReleased:false},{headers});
  } finally {running--;}
}
