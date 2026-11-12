import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { HijriDate } from './view';

export const dynamic='force-dynamic';
export const metadata={title:'Calculated Hijri date'};
export default async function HijriPage() {
  if(!isSupabaseConfigured()) redirect('/');
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/sign-in?next=/companion/hijri');
  const enabled=await isFlagEnabled(supabase,'companion.hijri_date').catch(()=>false);
  return <div className="container section">
    <p className="eyebrow">Companion</p><h1>Calculated Hijri date</h1>
    {enabled ? <HijriDate /> : <p className="notice">The calculated date display is not switched on.</p>}
    <p style={{marginTop:'1rem'}}><Link href="/learn">Back to my learning</Link></p>
  </div>;
}
