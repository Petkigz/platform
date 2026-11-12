import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { Counter } from './counter';

export const dynamic='force-dynamic';
export const metadata={title:'Private counter'};

export default async function CounterPage() {
  if(!isSupabaseConfigured()) redirect('/');
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/sign-in?next=/companion/counter');
  const enabled=await isFlagEnabled(supabase,'companion.dhikr_counter').catch(()=>false);
  return (
    <div className="container section">
      <p className="eyebrow">Companion</p>
      <h1>Private counter</h1>
      {enabled ? <>
        <p className="lede">A simple tool for keeping a count while this page is open.</p>
        <p className="muted">Your count is not saved or sent to AyahSpring. Reloading clears it. Your browser may temporarily restore the page if you navigate back. It does not sync across devices or accounts.</p>
        <Counter />
      </> : <p className="notice">The private counter is not switched on.</p>}
      <p style={{marginTop:'1rem'}}><Link href="/learn">Back to my learning</Link></p>
    </div>
  );
}
