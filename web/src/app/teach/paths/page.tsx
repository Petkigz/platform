import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/env';
import {PathManager} from './path-manager';

export const dynamic='force-dynamic';

export default async function TeachPathsPage(){
  if(!isSupabaseConfigured())redirect('/');
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/sign-in?next=/teach/paths');
  const [pathResult,courseResult]=await Promise.all([
    supabase.from('learning_paths').select(`id,title,slug,description,audience,status,
      learning_path_items(id,course_id,position,required,courses(id,title,slug))`).is('deleted_at',null).order('created_at',{ascending:false}),
    supabase.from('courses').select('id,title,slug').eq('status','active').is('deleted_at',null).is('suspended_at',null).order('title'),
  ]);
  if(pathResult.error)throw new Error(pathResult.error.message);
  if(courseResult.error)throw new Error(courseResult.error.message);
  return <div className="container section"><p className="eyebrow"><Link href="/teach">Teaching</Link></p><h1>Learning paths</h1>
    <p className="lede">Curate an ordered journey through active, published courses. A path organizes the catalogue; it does not bundle a purchase or create learner access. The learner-facing path stays behind the <code>learning.paths</code> flag until its prerequisite content is ready.</p>
    <PathManager paths={(pathResult.data??[]) as never[]} courses={(courseResult.data??[]) as never[]}/>
    <p style={{marginTop:'1.5rem'}}><Link href="/teach">Back to teaching</Link></p>
  </div>;
}
