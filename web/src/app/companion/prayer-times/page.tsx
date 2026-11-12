import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { PrayerTimesTool } from './tool';

export const dynamic='force-dynamic';
export const metadata={title:'Calculated prayer times'};
export default async function Page() {
  if(!isSupabaseConfigured()) redirect('/');
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/sign-in?next=/companion/prayer-times');
  const enabled=await isFlagEnabled(supabase,'companion.calculated_prayer_times').catch(()=>false);
  return <div className="container section">
    <p className="eyebrow">Companion</p><h1>Calculated prayer times</h1>
    {enabled ? <PrayerTimesTool /> : <p className="notice">Calculated prayer times are not switched on.</p>}
    <p style={{marginTop:'1rem'}}><Link href="/learn">Back to my learning</Link></p>
  </div>;
}
