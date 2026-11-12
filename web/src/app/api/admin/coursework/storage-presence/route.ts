import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { readR2Config } from '@/lib/media-r2';
import { checkCourseworkStoragePresence, parseStoragePresenceTarget, sameStoragePresenceTarget } from '@/lib/coursework-storage-presence';
import { createClient } from '@/lib/supabase/server';

export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={'cache-control':'private, no-store'};
const fail=(message:string,status:number)=>NextResponse.json({ok:false,message},{status,headers});

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return fail('Storage inspection is not configured.',503);
  const asset=new URL(request.url).searchParams.get('asset')?.trim() ?? '';
  if (!UUID.test(asset)) return fail('Choose a valid file.',400);
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if (!user) return fail('Sign in to inspect storage.',401);
  const initial=await supabase.rpc('coursework_storage_presence_target',{p_asset_id:asset});
  if (initial.error) return fail('This file cannot be inspected by this account.',403);
  const target=parseStoragePresenceTarget(initial.data,asset);
  if (!target) return fail('This file is not available for inspection.',404);
  const config=readR2Config();
  if (!config) return fail('Storage inspection is not configured.',503);
  const presence=await checkCourseworkStoragePresence(target,config);
  const next=await supabase.rpc('coursework_storage_presence_target',{p_asset_id:asset});
  const current=next.error ? null : parseStoragePresenceTarget(next.data,asset);
  if (!current || !sameStoragePresenceTarget(target,current)) return fail('The file or permission changed during the check. Refresh and try again.',409);
  return NextResponse.json({ok:true,presence,verifiedDeletion:false},{headers});
}
